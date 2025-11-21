"""
MISP Feed Service

Service para consumir feeds públicos do MISP e importar IOCs.
"""
import requests
import logging
from typing import List, Dict, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import func
from elasticsearch import AsyncElasticsearch

from app.cti.models.misp_feed import MISPFeed
from app.cti.models.misp_ioc import MISPIoC

logger = logging.getLogger(__name__)


class MISPFeedService:
    """Service para consumir feeds MISP públicos"""

    # Feed público do CIRCL (sem autenticação necessária)
    CIRCL_FEED = "https://www.circl.lu/doc/misp/feed-osint/"

    def __init__(self, db: Session, es: Optional[AsyncElasticsearch] = None):
        self.db = db
        self.es = es

    def fetch_circl_feed(self, limit: int = 10) -> List[Dict]:
        """
        Importa IOCs do feed CIRCL OSINT (público, sem auth)

        Args:
            limit: Número máximo de eventos para processar

        Returns:
            Lista de IOCs extraídos
        """
        logger.info(f"📡 Fetching CIRCL OSINT feed (limit={limit})...")

        try:
            # 1. Baixar manifest
            manifest_url = f"{self.CIRCL_FEED}/manifest.json"
            logger.debug(f"Downloading manifest from {manifest_url}")

            response = requests.get(manifest_url, timeout=30)
            response.raise_for_status()
            manifest = response.json()

            logger.info(f"✅ Manifest downloaded: {len(manifest)} events available")

            iocs = []

            # 2. Processar eventos (limitado)
            for idx, event_uuid in enumerate(list(manifest.keys())[:limit]):
                try:
                    event_url = f"{self.CIRCL_FEED}/{event_uuid}.json"
                    logger.debug(f"[{idx+1}/{limit}] Downloading event {event_uuid}")

                    event_resp = requests.get(event_url, timeout=30)
                    event_resp.raise_for_status()
                    event_data = event_resp.json()

                    event = event_data.get("Event", {})

                    # 3. Extrair IOCs dos attributes
                    for attr in event.get("Attribute", []):
                        attr_type = attr.get("type")

                        # Filtrar apenas tipos de IOC que nos interessam
                        if attr_type in [
                            "ip-dst",
                            "ip-src",
                            "domain",
                            "hostname",
                            "md5",
                            "sha1",
                            "sha256",
                            "url",
                            "email",
                            "email-src",
                            "email-dst",
                        ]:
                            ioc = {
                                "type": self._normalize_ioc_type(attr_type),
                                "subtype": attr_type,
                                "value": attr.get("value", "").strip(),
                                "context": event.get("info", ""),
                                "tags": [
                                    t.get("name") for t in event.get("Tag", [])
                                ],
                                "first_seen": self._parse_date(event.get("date")),
                                "to_ids": attr.get("to_ids", False),
                            }

                            # Extrair malware family/threat actor das tags
                            ioc.update(self._extract_metadata_from_tags(ioc["tags"]))

                            iocs.append(ioc)

                except Exception as e:
                    logger.error(f"❌ Error processing event {event_uuid}: {e}")
                    continue

            logger.info(f"✅ Extracted {len(iocs)} IOCs from {limit} events")
            return iocs

        except Exception as e:
            logger.error(f"❌ Error fetching CIRCL feed: {e}")
            return []

    def _normalize_ioc_type(self, misp_type: str) -> str:
        """Normalizar tipo MISP para tipo simplificado"""
        type_mapping = {
            "ip-dst": "ip",
            "ip-src": "ip",
            "domain": "domain",
            "hostname": "domain",
            "md5": "hash",
            "sha1": "hash",
            "sha256": "hash",
            "url": "url",
            "email": "email",
            "email-src": "email",
            "email-dst": "email",
        }
        return type_mapping.get(misp_type, "other")

    def _parse_date(self, date_str: Optional[str]) -> Optional[datetime]:
        """Parse date string do MISP"""
        if not date_str:
            return None
        try:
            return datetime.strptime(date_str, "%Y-%m-%d")
        except:
            return None

    def _extract_metadata_from_tags(self, tags: List[str]) -> Dict:
        """Extrair malware family e threat actor das tags"""
        metadata = {"malware_family": None, "threat_actor": None, "tlp": "white"}

        if not tags:
            return metadata

        for tag in tags:
            tag_lower = tag.lower()

            # TLP
            if "tlp:" in tag_lower:
                tlp_value = tag_lower.split("tlp:")[-1].strip()
                if tlp_value in ["white", "green", "amber", "red"]:
                    metadata["tlp"] = tlp_value

            # Malware family
            if "malware:" in tag_lower or "family:" in tag_lower:
                metadata["malware_family"] = tag.split(":")[-1].strip()

            # Threat actor
            if "actor:" in tag_lower or "apt" in tag_lower:
                metadata["threat_actor"] = tag.split(":")[-1].strip()

        return metadata

    def import_iocs(
        self, iocs: List[Dict], feed_id: str, index_to_es: bool = False
    ) -> int:
        """
        Importar IOCs para PostgreSQL (e opcionalmente Elasticsearch)

        Args:
            iocs: Lista de IOCs
            feed_id: UUID do feed
            index_to_es: Se True, indexa no Elasticsearch

        Returns:
            Número de IOCs importados
        """
        logger.info(f"📥 Importing {len(iocs)} IOCs to database...")

        imported_count = 0
        updated_count = 0
        skipped_count = 0

        for ioc_data in iocs:
            try:
                # Verificar se IOC já existe (deduplicação)
                existing_ioc = (
                    self.db.query(MISPIoC)
                    .filter(
                        MISPIoC.feed_id == feed_id,
                        MISPIoC.ioc_value == ioc_data["value"],
                    )
                    .first()
                )

                if existing_ioc:
                    # Atualizar last_seen
                    existing_ioc.last_seen = datetime.now()
                    existing_ioc.updated_at = datetime.now()
                    updated_count += 1
                else:
                    # Criar novo IOC
                    new_ioc = MISPIoC(
                        feed_id=feed_id,
                        ioc_type=ioc_data["type"],
                        ioc_subtype=ioc_data.get("subtype"),
                        ioc_value=ioc_data["value"],
                        context=ioc_data.get("context"),
                        malware_family=ioc_data.get("malware_family"),
                        threat_actor=ioc_data.get("threat_actor"),
                        tags=ioc_data.get("tags", []),
                        first_seen=ioc_data.get("first_seen"),
                        last_seen=datetime.now(),
                        tlp=ioc_data.get("tlp", "white"),
                        confidence="medium",  # Default
                        to_ids=ioc_data.get("to_ids", False),
                    )
                    self.db.add(new_ioc)
                    imported_count += 1

            except Exception as e:
                logger.error(f"❌ Error importing IOC {ioc_data.get('value')}: {e}")
                skipped_count += 1
                continue

        # Commit
        try:
            self.db.commit()
            logger.info(
                f"✅ Import complete: {imported_count} new, {updated_count} updated, {skipped_count} skipped"
            )

            # Atualizar contador do feed
            feed = self.db.query(MISPFeed).filter(MISPFeed.id == feed_id).first()
            if feed:
                feed.total_iocs_imported = (
                    self.db.query(func.count(MISPIoC.id))
                    .filter(MISPIoC.feed_id == feed_id)
                    .scalar()
                )
                feed.last_sync_at = datetime.now()
                self.db.commit()

            return imported_count

        except Exception as e:
            logger.error(f"❌ Error committing IOCs: {e}")
            self.db.rollback()
            return 0

    def search_ioc(self, value: str) -> Optional[MISPIoC]:
        """
        Buscar IOC por valor

        Args:
            value: Valor do IOC (IP, domain, hash, etc)

        Returns:
            IOC encontrado ou None
        """
        return (
            self.db.query(MISPIoC)
            .filter(MISPIoC.ioc_value == value)
            .first()
        )

    def get_ioc_stats(self) -> Dict:
        """
        Obter estatísticas de IOCs

        Returns:
            Dicionário com estatísticas
        """
        total_iocs = self.db.query(func.count(MISPIoC.id)).scalar()

        # Por tipo
        by_type = {}
        type_counts = (
            self.db.query(MISPIoC.ioc_type, func.count(MISPIoC.id))
            .group_by(MISPIoC.ioc_type)
            .all()
        )
        for ioc_type, count in type_counts:
            by_type[ioc_type] = count

        # Por TLP
        by_tlp = {}
        tlp_counts = (
            self.db.query(MISPIoC.tlp, func.count(MISPIoC.id))
            .group_by(MISPIoC.tlp)
            .all()
        )
        for tlp, count in tlp_counts:
            by_tlp[tlp] = count

        # Por confidence
        by_confidence = {}
        conf_counts = (
            self.db.query(MISPIoC.confidence, func.count(MISPIoC.id))
            .group_by(MISPIoC.confidence)
            .all()
        )
        for confidence, count in conf_counts:
            by_confidence[confidence] = count

        # Feeds
        feeds_count = self.db.query(func.count(MISPFeed.id)).scalar()

        # Última sync
        last_feed = (
            self.db.query(MISPFeed)
            .filter(MISPFeed.last_sync_at.isnot(None))
            .order_by(MISPFeed.last_sync_at.desc())
            .first()
        )

        return {
            "total_iocs": total_iocs,
            "by_type": by_type,
            "by_tlp": by_tlp,
            "by_confidence": by_confidence,
            "feeds_count": feeds_count,
            "last_sync": last_feed.last_sync_at if last_feed else None,
        }

    def list_feeds(self) -> List[MISPFeed]:
        """Listar todos os feeds"""
        return self.db.query(MISPFeed).all()

    def get_feed(self, feed_id: str) -> Optional[MISPFeed]:
        """Obter feed por ID"""
        return self.db.query(MISPFeed).filter(MISPFeed.id == feed_id).first()

    def create_feed(self, feed_data: Dict) -> MISPFeed:
        """Criar novo feed"""
        feed = MISPFeed(**feed_data)
        self.db.add(feed)
        self.db.commit()
        self.db.refresh(feed)
        return feed
