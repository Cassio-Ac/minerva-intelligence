"""
MISP Galaxy Threat Actor Enrichment Service

Enriquece actors do Malpedia com dados geopolíticos do MISP Galaxy.

Fonte: https://raw.githubusercontent.com/MISP/misp-galaxy/main/clusters/threat-actor.json

Dados adicionais:
- País de origem
- Estado patrocinador
- Países alvejados
- Setores alvejados
- Tipo de incidente
- Unidade militar
- Aliases adicionais
- Relacionamentos entre actors
"""

import logging
import requests
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
import json

logger = logging.getLogger(__name__)

MISP_GALAXY_URL = "https://raw.githubusercontent.com/MISP/misp-galaxy/main/clusters/threat-actor.json"
CACHE_TTL_HOURS = 168  # 7 days (MISP data updates less frequently)


class MISPGalaxyService:
    """
    Service to enrich threat actors with MISP Galaxy data
    """

    def __init__(self):
        self._galaxy_data: Optional[Dict[str, Any]] = None
        self._last_fetch: Optional[datetime] = None
        # Actor name (lowercase) -> MISP entry
        self._actor_map: Dict[str, Dict[str, Any]] = {}

    def _fetch_galaxy_data(self) -> Dict[str, Any]:
        """
        Fetch MISP Galaxy threat-actor.json from GitHub

        Returns:
            Parsed JSON data
        """
        try:
            logger.info("📥 Fetching MISP Galaxy threat-actor data...")
            response = requests.get(MISP_GALAXY_URL, timeout=30)
            response.raise_for_status()

            data = response.json()
            logger.info(f"✅ Fetched MISP Galaxy data: {len(data.get('values', []))} actors")

            return data

        except Exception as e:
            logger.error(f"❌ Error fetching MISP Galaxy data: {e}")
            return {"values": []}

    def _build_actor_map(self, galaxy_data: Dict[str, Any]):
        """
        Build mapping from actor names/aliases to MISP entries

        Creates a lookup table using:
        - Actor name (value field)
        - All synonyms/aliases
        """
        self._actor_map = {}

        for entry in galaxy_data.get("values", []):
            actor_name = entry.get("value", "")

            # Add by main name
            if actor_name:
                self._actor_map[actor_name.lower()] = entry

            # Add by all synonyms
            meta = entry.get("meta", {})
            synonyms = meta.get("synonyms", [])

            for synonym in synonyms:
                if synonym:
                    self._actor_map[synonym.lower()] = entry

        logger.info(f"✅ Built MISP actor map: {len(self._actor_map)} entries")

    def _ensure_loaded(self):
        """
        Ensure MISP Galaxy data is loaded and fresh
        """
        # Check if cache is stale
        if self._last_fetch:
            age = datetime.now() - self._last_fetch
            if age.total_seconds() / 3600 < CACHE_TTL_HOURS:
                return  # Cache still fresh

        # Fetch fresh data
        logger.info("🔄 Loading MISP Galaxy data...")
        self._galaxy_data = self._fetch_galaxy_data()
        self._build_actor_map(self._galaxy_data)
        self._last_fetch = datetime.now()

    def get_misp_data(self, actor_name: str) -> Optional[Dict[str, Any]]:
        """
        Get MISP Galaxy data for a threat actor

        Args:
            actor_name: Actor name (will try all case variations)

        Returns:
            MISP entry or None if not found
        """
        self._ensure_loaded()

        # Try exact match (case-insensitive)
        return self._actor_map.get(actor_name.lower())

    def enrich_actor(self, actor_name: str) -> Dict[str, Any]:
        """
        Enrich actor with MISP Galaxy data

        Args:
            actor_name: Actor name from Malpedia

        Returns:
            Dictionary with enrichment data:
            {
                "found": bool,
                "country": str,
                "state_sponsor": str,
                "military_unit": str,
                "targeted_countries": List[str],
                "targeted_sectors": List[str],
                "incident_type": str,
                "attribution_confidence": str,
                "additional_aliases": List[str],
                "related_actors": List[str],
                "misp_refs": List[str],
                "description": str
            }
        """
        misp_entry = self.get_misp_data(actor_name)

        if not misp_entry:
            logger.warning(f"⚠️ No MISP Galaxy data found for: {actor_name}")
            return {"found": False}

        meta = misp_entry.get("meta", {})

        # Extract geopolitical data
        enrichment = {
            "found": True,
            "country": meta.get("country"),
            "state_sponsor": meta.get("cfr-suspected-state-sponsor"),
            "targeted_countries": meta.get("cfr-suspected-victims", []),
            "targeted_sectors": meta.get("cfr-target-category", []) or meta.get("targeted-sector", []),
            "incident_type": meta.get("cfr-type-of-incident"),
            "attribution_confidence": meta.get("attribution-confidence"),
            "additional_aliases": meta.get("synonyms", []),
            "misp_refs": meta.get("refs", []),
            "description": misp_entry.get("description", ""),
        }

        # Extract military unit if available
        for key in meta.keys():
            if "gru" in key.lower() or "pla" in key.lower() or "unit" in key.lower():
                enrichment["military_unit"] = meta[key]
                break
        else:
            enrichment["military_unit"] = None

        # Extract related actors
        related = misp_entry.get("related", [])
        related_actors = []

        for rel in related:
            if rel.get("type") == "similar":
                # We'd need to resolve UUID to actor name, but for now just track count
                related_actors.append(rel.get("dest-uuid", ""))

        enrichment["related_actors"] = related_actors

        logger.info(f"✅ MISP enrichment for {actor_name}: {enrichment.get('country', 'N/A')}")

        return enrichment

    def get_all_actor_names(self) -> List[str]:
        """
        Get list of all actor names in MISP Galaxy

        Returns:
            List of actor names
        """
        self._ensure_loaded()

        return [
            entry.get("value", "")
            for entry in self._galaxy_data.get("values", [])
            if entry.get("value")
        ]


# Singleton instance
_misp_galaxy_service: Optional[MISPGalaxyService] = None


def get_misp_galaxy_service() -> MISPGalaxyService:
    """Get singleton instance of MISPGalaxyService"""
    global _misp_galaxy_service
    if _misp_galaxy_service is None:
        _misp_galaxy_service = MISPGalaxyService()
    return _misp_galaxy_service
