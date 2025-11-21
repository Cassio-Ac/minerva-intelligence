"""
MISP Feed Service

Service para consumir feeds públicos do MISP e importar IOCs.
"""
import requests
import logging
from typing import List, Dict, Optional
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.exc import IntegrityError
from elasticsearch import AsyncElasticsearch

from app.cti.models.misp_feed import MISPFeed
from app.cti.models.misp_ioc import MISPIoC

logger = logging.getLogger(__name__)


class MISPFeedService:
    """Service para consumir feeds MISP públicos"""

    # Feeds públicos disponíveis
    FEEDS = {
        "circl_osint": {
            "name": "CIRCL OSINT Feed",
            "url": "https://www.circl.lu/doc/misp/feed-osint/",
            "type": "misp",
            "description": "CIRCL OSINT feed with ~500 IOCs/day",
            "requires_auth": False,
        },
        "urlhaus": {
            "name": "URLhaus",
            "url": "https://urlhaus.abuse.ch/downloads/csv_recent/",
            "type": "csv",
            "description": "Malicious URLs from URLhaus (~1000/day)",
            "requires_auth": False,
        },
        "botvrij": {
            "name": "Botvrij.eu",
            "url": "https://www.botvrij.eu/data/feed-osint/",
            "type": "misp",
            "description": "Dutch botnet feed (~200 IOCs/day)",
            "requires_auth": False,
        },
        "threatfox": {
            "name": "ThreatFox",
            "url": "https://threatfox.abuse.ch/export/csv/recent/",
            "type": "csv",
            "description": "IOCs from ThreatFox",
            "requires_auth": False,
        },
        "otx": {
            "name": "AlienVault OTX",
            "url": "https://otx.alienvault.com/api/v1/pulses/subscribed",
            "type": "otx",
            "description": "AlienVault OTX pulses (~2000 IOCs/day)",
            "requires_auth": True,  # Requires API key
        },
        # Tier 1 Feeds (High Priority)
        "openphish": {
            "name": "OpenPhish",
            "url": "https://raw.githubusercontent.com/openphish/public_feed/refs/heads/main/feed.txt",
            "type": "txt",
            "description": "Phishing URLs feed (daily updates)",
            "requires_auth": False,
        },
        "serpro": {
            "name": "SERPRO Blocklist (BR Gov)",
            "url": "https://s3.i02.estaleiro.serpro.gov.br/blocklist/blocklist.txt",
            "type": "txt",
            "description": "Brazilian government malicious IPs blocklist",
            "requires_auth": False,
        },
        "bambenek_dga": {
            "name": "Bambenek DGA Feed",
            "url": "https://osint.bambenekconsulting.com/feeds/dga-feed-high.csv",
            "type": "csv",
            "description": "Domain Generation Algorithm (DGA) domains for C2 detection",
            "requires_auth": False,
        },
        "emerging_threats": {
            "name": "ProofPoint Emerging Threats",
            "url": "https://rules.emergingthreats.net/blockrules/compromised-ips.txt",
            "type": "txt",
            "description": "Compromised IPs (bots, proxies, C2)",
            "requires_auth": False,
        },
        "alienvault_reputation": {
            "name": "AlienVault IP Reputation",
            "url": "https://reputation.alienvault.com/reputation.generic",
            "type": "reputation",
            "description": "IP reputation feed (malware, phishing, C2)",
            "requires_auth": False,
        },
    }

    def __init__(self, db: Optional[AsyncSession] = None, es: Optional[AsyncElasticsearch] = None):
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
            circl_url = self.FEEDS["circl_osint"]["url"]
            manifest_url = f"{circl_url}/manifest.json"
            logger.debug(f"Downloading manifest from {manifest_url}")

            response = requests.get(manifest_url, timeout=30)
            response.raise_for_status()
            manifest = response.json()

            logger.info(f"✅ Manifest downloaded: {len(manifest)} events available")

            iocs = []

            # 2. Processar eventos (limitado)
            for idx, event_uuid in enumerate(list(manifest.keys())[:limit]):
                try:
                    event_url = f"{circl_url}/{event_uuid}.json"
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

    def fetch_urlhaus_feed(self, limit: int = 100) -> List[Dict]:
        """
        Importa IOCs do URLhaus (CSV format)

        Args:
            limit: Número máximo de IOCs para importar

        Returns:
            Lista de IOCs extraídos
        """
        logger.info(f"📡 Fetching URLhaus feed (limit={limit})...")

        try:
            url = self.FEEDS["urlhaus"]["url"]
            response = requests.get(url, timeout=30)
            response.raise_for_status()

            iocs = []
            lines = response.text.strip().split('\n')

            # Skip header lines (começam com #)
            data_lines = [line for line in lines if not line.startswith('#')][:limit]

            for line in data_lines:
                try:
                    # CSV format: id,dateadded,url,url_status,threat,tags,urlhaus_link,reporter
                    parts = line.split(',')
                    if len(parts) < 7:
                        continue

                    url_value = parts[2].strip('"')
                    threat = parts[4].strip('"') if len(parts) > 4 else ""
                    tags = parts[5].strip('"').split() if len(parts) > 5 else []

                    ioc = {
                        "type": "url",
                        "subtype": "url",
                        "value": url_value,
                        "context": f"URLhaus: {threat}" if threat else "URLhaus malicious URL",
                        "tags": tags,
                        "malware_family": threat if threat else None,
                        "threat_actor": None,
                        "tlp": "white",
                        "first_seen": None,
                        "to_ids": True,
                    }
                    iocs.append(ioc)
                except Exception as e:
                    logger.debug(f"Error parsing URLhaus line: {e}")
                    continue

            logger.info(f"✅ Extracted {len(iocs)} IOCs from URLhaus")
            return iocs

        except Exception as e:
            logger.error(f"❌ Error fetching URLhaus feed: {e}")
            return []

    def fetch_threatfox_feed(self, limit: int = 100) -> List[Dict]:
        """
        Importa IOCs do ThreatFox (CSV format)

        Args:
            limit: Número máximo de IOCs para importar

        Returns:
            Lista de IOCs extraídos
        """
        logger.info(f"📡 Fetching ThreatFox feed (limit={limit})...")

        try:
            url = self.FEEDS["threatfox"]["url"]
            response = requests.get(url, timeout=30)
            response.raise_for_status()

            iocs = []
            lines = response.text.strip().split('\n')

            # Skip header lines
            data_lines = [line for line in lines if not line.startswith('#')][:limit]

            for line in data_lines:
                try:
                    # CSV format: first_seen,ioc_id,ioc_value,ioc_type,threat_type,malware,malware_printable,confidence_level,reporter,reference,tags
                    parts = line.split(',')
                    if len(parts) < 7:
                        continue

                    first_seen_str = parts[0].strip('"')
                    ioc_value = parts[2].strip('"')
                    ioc_type = parts[3].strip('"')
                    threat_type = parts[4].strip('"')
                    malware = parts[6].strip('"') if len(parts) > 6 else ""
                    confidence = parts[7].strip('"') if len(parts) > 7 else "medium"
                    tags = parts[10].strip('"').split() if len(parts) > 10 else []

                    # Normalizar tipo
                    normalized_type = self._normalize_threatfox_type(ioc_type)

                    ioc = {
                        "type": normalized_type,
                        "subtype": ioc_type,
                        "value": ioc_value,
                        "context": f"ThreatFox: {threat_type}",
                        "tags": tags,
                        "malware_family": malware if malware else None,
                        "threat_actor": None,
                        "tlp": "white",
                        "first_seen": self._parse_date(first_seen_str),
                        "confidence": confidence.lower() if confidence else "medium",
                        "to_ids": True,
                    }
                    iocs.append(ioc)
                except Exception as e:
                    logger.debug(f"Error parsing ThreatFox line: {e}")
                    continue

            logger.info(f"✅ Extracted {len(iocs)} IOCs from ThreatFox")
            return iocs

        except Exception as e:
            logger.error(f"❌ Error fetching ThreatFox feed: {e}")
            return []

    def _normalize_threatfox_type(self, threatfox_type: str) -> str:
        """Normalizar tipo ThreatFox para nosso formato"""
        type_mapping = {
            "ip:port": "ip",
            "domain": "domain",
            "url": "url",
            "md5_hash": "hash",
            "sha256_hash": "hash",
        }
        return type_mapping.get(threatfox_type, "other")

    def fetch_otx_feed(self, api_key: str, limit: int = 50, use_pagination: bool = False) -> List[Dict]:
        """
        Importa IOCs do AlienVault OTX com enrichment completo

        Baseado no script alien_to_misp_lab.py, extrai:
        - Adversary (threat actor)
        - Malware families
        - Industries (setores alvos)
        - Attack IDs (MITRE ATT&CK techniques)
        - References (URLs de referência)
        - Targeted countries (países alvos)

        Args:
            api_key: OTX API key
            limit: Número máximo de pulses para processar
            use_pagination: Se True, usa paginação (mais lento mas completo)

        Returns:
            Lista de IOCs extraídos com metadados ricos
        """
        logger.info(f"📡 Fetching AlienVault OTX feed (limit={limit}, pagination={use_pagination})...")

        try:
            from OTXv2 import OTXv2, IndicatorTypes

            otx = OTXv2(api_key)
            iocs = []
            pulses_processed = 0

            if use_pagination:
                # Paginação (como alien_to_misp_lab.py)
                page = 1
                max_pages = (limit // 10) + 1  # OTX retorna ~10 pulses por página

                while pulses_processed < limit and page <= max_pages:
                    try:
                        logger.debug(f"Fetching OTX page {page}...")
                        pulses_data = otx.getall(page=page)

                        if not pulses_data or 'results' not in pulses_data:
                            break

                        pulses = pulses_data.get('results', [])
                        if not pulses:
                            break

                        for pulse in pulses:
                            if pulses_processed >= limit:
                                break

                            iocs.extend(self._process_otx_pulse(pulse))
                            pulses_processed += 1

                        page += 1

                    except Exception as e:
                        logger.warning(f"Error fetching OTX page {page}: {e}")
                        break

            else:
                # Modo simples (sem paginação)
                pulses = otx.getall()

                for pulse in pulses[:limit]:
                    try:
                        iocs.extend(self._process_otx_pulse(pulse))
                        pulses_processed += 1

                    except Exception as e:
                        logger.debug(f"Error processing OTX pulse: {e}")
                        continue

            logger.info(f"✅ Extracted {len(iocs)} IOCs from {pulses_processed} OTX pulses")
            return iocs

        except Exception as e:
            logger.error(f"❌ Error fetching OTX feed: {e}")
            import traceback
            logger.debug(traceback.format_exc())
            return []

    def _process_otx_pulse(self, pulse: Dict) -> List[Dict]:
        """
        Processa um pulse OTX e extrai IOCs com enrichment completo

        Args:
            pulse: Pulse OTX

        Returns:
            Lista de IOCs extraídos do pulse
        """
        iocs = []

        try:
            # Extrair metadados do pulse
            pulse_name = pulse.get("name", "")
            pulse_description = pulse.get("description", "")
            pulse_tags = pulse.get("tags", [])
            pulse_tlp = pulse.get("TLP", "white").lower()
            pulse_created = pulse.get("created", "")

            # NOVO: Extrair campos de enrichment
            adversary = pulse.get("adversary", "")  # Threat actor
            malware_families = pulse.get("malware_families", [])
            industries = pulse.get("industries", [])
            attack_ids = pulse.get("attack_ids", [])  # MITRE ATT&CK!
            references = pulse.get("references", [])
            targeted_countries = pulse.get("targeted_countries", [])

            # Extract indicators from pulse
            for indicator in pulse.get("indicators", []):
                ioc_type = indicator.get("type", "")
                ioc_value = indicator.get("indicator", "")

                if not ioc_value:
                    continue

                # Normalizar tipo OTX
                normalized_type = self._normalize_otx_type(ioc_type)

                # Build tags (incluindo malware families, industries)
                tags = list(pulse_tags)  # Copy original tags

                # Add malware family tags
                for malware in malware_families:
                    tags.append(f"malware_family:{malware}")

                # Add industry tags
                for industry in industries:
                    tags.append(f"industry:{industry}")

                # Add ATT&CK tags
                for attack_id in attack_ids:
                    tags.append(attack_id)  # Ex: "T1566.001"

                # Add country tags
                for country in targeted_countries:
                    tags.append(f"targeted_country:{country}")

                # Add adversary tag
                if adversary:
                    tags.append(f"adversary:{adversary}")

                # Build IOC with enriched metadata
                ioc = {
                    "type": normalized_type,
                    "subtype": ioc_type,
                    "value": ioc_value,
                    "context": f"OTX Pulse: {pulse_name}",
                    "tags": tags,
                    "malware_family": malware_families[0] if malware_families else None,
                    "threat_actor": adversary if adversary else None,
                    "tlp": pulse_tlp,
                    "first_seen": pulse_created if pulse_created else None,
                    "confidence": "medium",
                    "to_ids": True,
                    # Extra enrichment fields
                    "industries": industries,
                    "attack_ids": attack_ids,  # MITRE ATT&CK techniques!
                    "references": references,
                    "targeted_countries": targeted_countries,
                }

                # Extrair metadata adicional de tags (método existente)
                ioc.update(self._extract_metadata_from_tags(pulse_tags))

                iocs.append(ioc)

        except Exception as e:
            logger.debug(f"Error processing OTX pulse: {e}")

        return iocs

    def fetch_openphish_feed(self, limit: int = 1000) -> List[Dict]:
        """
        Importa URLs de phishing do OpenPhish feed

        Args:
            limit: Número máximo de URLs para processar

        Returns:
            Lista de IOCs extraídos
        """
        logger.info(f"📡 Fetching OpenPhish feed (limit={limit})...")

        try:
            url = self.FEEDS["openphish"]["url"]
            response = requests.get(url, timeout=30)
            response.raise_for_status()

            iocs = []
            lines = response.text.strip().split('\n')

            for line in lines[:limit]:
                phishing_url = line.strip()
                if not phishing_url or phishing_url.startswith('#'):
                    continue

                ioc = {
                    "type": "url",
                    "subtype": "url",
                    "value": phishing_url,
                    "context": "OpenPhish: Phishing URL",
                    "tags": ["phishing", "openphish"],
                    "malware_family": None,
                    "threat_actor": None,
                    "tlp": "amber",
                    "first_seen": None,
                    "to_ids": True,
                }
                iocs.append(ioc)

            logger.info(f"✅ Extracted {len(iocs)} phishing URLs from OpenPhish")
            return iocs

        except Exception as e:
            logger.error(f"❌ Error fetching OpenPhish feed: {e}")
            return []

    def fetch_serpro_feed(self, limit: int = 10000) -> List[Dict]:
        """
        Importa IPs maliciosos do SERPRO (Governo BR)

        Args:
            limit: Número máximo de IPs para processar

        Returns:
            Lista de IOCs extraídos
        """
        logger.info(f"📡 Fetching SERPRO blocklist (limit={limit})...")

        try:
            url = self.FEEDS["serpro"]["url"]
            response = requests.get(url, timeout=30)
            response.raise_for_status()

            iocs = []
            lines = response.text.strip().split('\n')

            for line in lines[:limit]:
                ip = line.strip()
                if not ip or ip.startswith('#'):
                    continue

                ioc = {
                    "type": "ip",
                    "subtype": "ip-dst",
                    "value": ip,
                    "context": "SERPRO: Malicious IP (BR Gov)",
                    "tags": ["malicious_ip", "serpro", "brazil"],
                    "malware_family": None,
                    "threat_actor": None,
                    "tlp": "amber",
                    "first_seen": None,
                    "to_ids": True,
                }
                iocs.append(ioc)

            logger.info(f"✅ Extracted {len(iocs)} malicious IPs from SERPRO")
            return iocs

        except Exception as e:
            logger.error(f"❌ Error fetching SERPRO feed: {e}")
            return []

    def fetch_bambenek_dga_feed(self, limit: int = 1000) -> List[Dict]:
        """
        Importa domains DGA do Bambenek feed (C2 detection)

        Args:
            limit: Número máximo de domains para processar

        Returns:
            Lista de IOCs extraídos
        """
        logger.info(f"📡 Fetching Bambenek DGA feed (limit={limit})...")

        try:
            url = self.FEEDS["bambenek_dga"]["url"]
            response = requests.get(url, timeout=30)
            response.raise_for_status()

            iocs = []
            lines = response.text.strip().split('\n')

            # Skip header lines (começam com #)
            data_lines = [line for line in lines if not line.startswith('#')][:limit]

            for line in data_lines:
                try:
                    # CSV format: Domain,Description/Malware Family
                    # Exemplo: "example.com","C2 for Malware XYZ"
                    parts = line.split(',')
                    if len(parts) < 2:
                        continue

                    domain = parts[0].strip('"').strip()
                    description = parts[1].strip('"').strip() if len(parts) > 1 else ""

                    ioc = {
                        "type": "domain",
                        "subtype": "domain",
                        "value": domain,
                        "context": f"Bambenek DGA: {description}" if description else "Bambenek DGA: Algorithm-generated domain",
                        "tags": ["dga", "c2", "bambenek"],
                        "malware_family": description if description else None,
                        "threat_actor": None,
                        "tlp": "white",
                        "first_seen": None,
                        "to_ids": True,
                    }
                    iocs.append(ioc)

                except Exception as e:
                    logger.debug(f"Error parsing Bambenek line: {e}")
                    continue

            logger.info(f"✅ Extracted {len(iocs)} DGA domains from Bambenek")
            return iocs

        except Exception as e:
            logger.error(f"❌ Error fetching Bambenek DGA feed: {e}")
            return []

    def fetch_emerging_threats_feed(self, limit: int = 10000) -> List[Dict]:
        """
        Importa IPs comprometidos do ProofPoint Emerging Threats

        Args:
            limit: Número máximo de IPs para processar

        Returns:
            Lista de IOCs extraídos
        """
        logger.info(f"📡 Fetching Emerging Threats compromised IPs (limit={limit})...")

        try:
            url = self.FEEDS["emerging_threats"]["url"]
            response = requests.get(url, timeout=30)
            response.raise_for_status()

            iocs = []
            lines = response.text.strip().split('\n')

            for line in lines[:limit]:
                ip = line.strip()
                if not ip or ip.startswith('#'):
                    continue

                ioc = {
                    "type": "ip",
                    "subtype": "ip-src",
                    "value": ip,
                    "context": "Emerging Threats: Compromised IP (bot/proxy/C2)",
                    "tags": ["compromised", "emerging_threats", "proofpoint"],
                    "malware_family": None,
                    "threat_actor": None,
                    "tlp": "white",
                    "first_seen": None,
                    "to_ids": True,
                }
                iocs.append(ioc)

            logger.info(f"✅ Extracted {len(iocs)} compromised IPs from Emerging Threats")
            return iocs

        except Exception as e:
            logger.error(f"❌ Error fetching Emerging Threats feed: {e}")
            return []

    def fetch_alienvault_reputation_feed(self, limit: int = 10000) -> List[Dict]:
        """
        Importa IPs de reputação do AlienVault

        O formato é: IP # Description Country,City,Latitude,Longitude
        Exemplo: 49.143.32.6 # Malicious Host KR,,37.5111999512,126.974098206

        Args:
            limit: Número máximo de IPs para processar

        Returns:
            Lista de IOCs extraídos
        """
        logger.info(f"📡 Fetching AlienVault IP Reputation feed (limit={limit})...")

        try:
            url = self.FEEDS["alienvault_reputation"]["url"]
            response = requests.get(url, timeout=30)
            response.raise_for_status()

            iocs = []
            lines = response.text.strip().split('\n')

            for line in lines[:limit]:
                line = line.strip()
                if not line or line.startswith('#'):
                    continue

                try:
                    # Parse format: IP # Description Country,City,Lat,Lon
                    # Exemplo: 49.143.32.6 # Malicious Host KR,,37.5111999512,126.974098206
                    parts = line.split('#', 1)  # Split apenas no primeiro #

                    if len(parts) < 2:
                        continue

                    ip = parts[0].strip()
                    description_part = parts[1].strip()

                    # Extrair descrição e country
                    # Formato: "Malicious Host KR,,37.5111999512,126.974098206"
                    # Ou: "Malicious Host US,Ashburn,39.048,-77.472"
                    # Split no último espaço para separar descrição da localização
                    space_idx = description_part.rfind(' ')
                    if space_idx > 0:
                        description = description_part[:space_idx]
                        location = description_part[space_idx+1:]

                        # Country code é a primeira parte antes da vírgula
                        country = location.split(',')[0] if ',' in location else ""
                    else:
                        description = description_part
                        country = ""

                    # Build tags
                    tags = ["alienvault", "ip_reputation", "malicious_host"]
                    if country:
                        tags.append(f"country:{country.lower()}")

                    ioc = {
                        "type": "ip",
                        "subtype": "ip-src",
                        "value": ip,
                        "context": f"AlienVault Reputation: {description} ({country})",
                        "tags": tags,
                        "malware_family": None,
                        "threat_actor": None,
                        "tlp": "white",
                        "first_seen": None,
                        "confidence": "high",
                        "to_ids": True,
                        # Extra metadata
                        "country": country,
                    }
                    iocs.append(ioc)

                except Exception as e:
                    logger.debug(f"Error parsing AlienVault line: {e}")
                    continue

            logger.info(f"✅ Extracted {len(iocs)} IPs from AlienVault Reputation")
            return iocs

        except Exception as e:
            logger.error(f"❌ Error fetching AlienVault Reputation feed: {e}")
            return []

    def _normalize_otx_type(self, otx_type: str) -> str:
        """Normalizar tipo OTX para nosso formato"""
        type_mapping = {
            "IPv4": "ip",
            "IPv6": "ip",
            "domain": "domain",
            "hostname": "domain",
            "URL": "url",
            "FileHash-MD5": "hash",
            "FileHash-SHA1": "hash",
            "FileHash-SHA256": "hash",
            "email": "email",
        }
        return type_mapping.get(otx_type, "other")

    async def import_iocs(
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
        if not self.db:
            raise ValueError("Database session is required for import_iocs")

        logger.info(f"📥 Importing {len(iocs)} IOCs to database...")

        imported_count = 0
        updated_count = 0
        skipped_count = 0

        for ioc_data in iocs:
            try:
                # Verificar se IOC já existe (deduplicação)
                stmt = select(MISPIoC).where(
                    MISPIoC.feed_id == feed_id,
                    MISPIoC.ioc_value == ioc_data["value"]
                )
                result = await self.db.execute(stmt)
                existing_ioc = result.scalar_one_or_none()

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
            await self.db.commit()
            logger.info(
                f"✅ Import complete: {imported_count} new, {updated_count} updated, {skipped_count} skipped"
            )

            # Atualizar contador do feed
            stmt = select(MISPFeed).where(MISPFeed.id == feed_id)
            result = await self.db.execute(stmt)
            feed = result.scalar_one_or_none()

            if feed:
                count_stmt = select(func.count(MISPIoC.id)).where(MISPIoC.feed_id == feed_id)
                count_result = await self.db.execute(count_stmt)
                feed.total_iocs_imported = count_result.scalar()
                feed.last_sync_at = datetime.now()
                await self.db.commit()

            return imported_count

        except Exception as e:
            logger.error(f"❌ Error committing IOCs: {e}")
            await self.db.rollback()
            return 0

    async def search_ioc(self, value: str) -> Optional[MISPIoC]:
        """
        Buscar IOC por valor

        Args:
            value: Valor do IOC (IP, domain, hash, etc)

        Returns:
            IOC encontrado ou None
        """
        if not self.db:
            raise ValueError("Database session is required for search_ioc")

        stmt = select(MISPIoC).where(MISPIoC.ioc_value == value)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_ioc_stats(self) -> Dict:
        """
        Obter estatísticas de IOCs

        Returns:
            Dicionário com estatísticas
        """
        if not self.db:
            raise ValueError("Database session is required for get_ioc_stats")

        # Total IOCs
        count_stmt = select(func.count(MISPIoC.id))
        result = await self.db.execute(count_stmt)
        total_iocs = result.scalar()

        # Por tipo
        by_type = {}
        type_stmt = select(MISPIoC.ioc_type, func.count(MISPIoC.id)).group_by(MISPIoC.ioc_type)
        result = await self.db.execute(type_stmt)
        for ioc_type, count in result.all():
            by_type[ioc_type] = count

        # Por TLP
        by_tlp = {}
        tlp_stmt = select(MISPIoC.tlp, func.count(MISPIoC.id)).group_by(MISPIoC.tlp)
        result = await self.db.execute(tlp_stmt)
        for tlp, count in result.all():
            by_tlp[tlp] = count

        # Por confidence
        by_confidence = {}
        conf_stmt = select(MISPIoC.confidence, func.count(MISPIoC.id)).group_by(MISPIoC.confidence)
        result = await self.db.execute(conf_stmt)
        for confidence, count in result.all():
            by_confidence[confidence] = count

        # Feeds
        feeds_stmt = select(func.count(MISPFeed.id))
        result = await self.db.execute(feeds_stmt)
        feeds_count = result.scalar()

        # Última sync
        last_feed_stmt = (
            select(MISPFeed)
            .where(MISPFeed.last_sync_at.isnot(None))
            .order_by(MISPFeed.last_sync_at.desc())
            .limit(1)
        )
        result = await self.db.execute(last_feed_stmt)
        last_feed = result.scalar_one_or_none()

        return {
            "total_iocs": total_iocs,
            "by_type": by_type,
            "by_tlp": by_tlp,
            "by_confidence": by_confidence,
            "feeds_count": feeds_count,
            "last_sync": last_feed.last_sync_at if last_feed else None,
        }

    async def list_feeds(self) -> List[MISPFeed]:
        """Listar todos os feeds"""
        if not self.db:
            raise ValueError("Database session is required for list_feeds")

        stmt = select(MISPFeed)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def get_feed(self, feed_id: str) -> Optional[MISPFeed]:
        """Obter feed por ID"""
        if not self.db:
            raise ValueError("Database session is required for get_feed")

        stmt = select(MISPFeed).where(MISPFeed.id == feed_id)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_feed_by_name(self, name: str) -> Optional[MISPFeed]:
        """Obter feed por nome"""
        if not self.db:
            raise ValueError("Database session is required for get_feed_by_name")

        stmt = select(MISPFeed).where(MISPFeed.name == name)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def create_feed(self, feed_data: Dict) -> MISPFeed:
        """Criar novo feed"""
        if not self.db:
            raise ValueError("Database session is required for create_feed")

        feed = MISPFeed(**feed_data)
        self.db.add(feed)
        await self.db.commit()
        await self.db.refresh(feed)
        return feed
