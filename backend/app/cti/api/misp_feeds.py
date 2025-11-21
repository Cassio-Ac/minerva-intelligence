"""
MISP Feeds API

Endpoints para gerenciar feeds MISP e buscar IOCs.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
import logging

from app.db.database import get_db
from app.cti.services.misp_feed_service import MISPFeedService
from app.cti.schemas.misp_ioc import (
    MISPFeed,
    MISPFeedCreate,
    MISPFeedUpdate,
    MISPIoC,
    MISPIoCSearch,
    MISPIoCStats,
)
from app.core.dependencies import get_current_user

router = APIRouter(prefix="/misp", tags=["CTI - MISP Feeds"])
logger = logging.getLogger(__name__)


@router.post("/feeds/test", summary="Test CIRCL feed")
async def test_circl_feed(
    limit: int = Query(default=5, ge=1, le=50, description="Number of events to process"),
    current_user: dict = Depends(get_current_user),
):
    """
    Testar import do feed CIRCL OSINT (primeiros N eventos)

    **Público, sem autenticação necessária**
    """
    logger.info(f"🧪 Testing CIRCL feed (limit={limit})...")

    service = MISPFeedService(db=None)  # Não precisa de DB para teste
    iocs = service.fetch_circl_feed(limit=limit)

    return {
        "status": "success",
        "feed": "CIRCL OSINT",
        "feed_url": service.CIRCL_FEED,
        "events_processed": limit,
        "iocs_found": len(iocs),
        "sample": iocs[:5],  # Mostrar primeiros 5 IOCs
    }


# TODO: Implementar endpoints com AsyncSession
# @router.post("/feeds/sync", summary="Sync CIRCL feed to database")
# @router.get("/feeds", response_model=List[MISPFeed], summary="List all feeds")
# @router.get("/feeds/{feed_id}", response_model=MISPFeed, summary="Get feed by ID")
# @router.post("/feeds", response_model=MISPFeed, summary="Create new feed")
# @router.get("/iocs/search", response_model=MISPIoCSearch, summary="Search IOC by value")
# @router.get("/iocs/stats", response_model=MISPIoCStats, summary="Get IOC statistics")
