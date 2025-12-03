"""
OTX Pulses API Endpoints

API para gerenciar sincronização, export MISP e enriquecimento bulk
"""
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db
from app.cti.services.otx_pulse_sync_service import OTXPulseSyncService
from app.cti.services.otx_misp_exporter import OTXMISPExporter
from app.cti.services.otx_bulk_enrichment_service import OTXBulkEnrichmentService
from app.models.user import User
from app.core.dependencies import get_current_user, require_role
from pydantic import BaseModel
from typing import List, Optional
from uuid import UUID

router = APIRouter()


# Schemas
class PulseSyncRequest(BaseModel):
    limit: int = 50


class PulseSearchRequest(BaseModel):
    query: str
    limit: int = 20


class ExportPulseRequest(BaseModel):
    pulse_id: UUID


class BulkEnrichmentRequest(BaseModel):
    limit: int = 100
    ioc_types: Optional[List[str]] = None
    priority_only: bool = True


# ====== PULSE SYNC ENDPOINTS ======

@router.post("/pulses/sync")
async def sync_otx_pulses(
    request: PulseSyncRequest,
    background_tasks: BackgroundTasks,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "power"]))
):
    """
    Sincroniza pulses subscritos do OTX

    Requer: role admin ou power
    """
    service = OTXPulseSyncService(session)

    # Executar sync em background
    background_tasks.add_task(service.sync_subscribed_pulses, request.limit)

    return {
        "status": "started",
        "message": f"Pulse sync started (limit={request.limit})",
        "info": "Sync running in background. Check /pulses/sync-history for progress"
    }


@router.post("/pulses/sync/search")
async def search_and_sync_pulses(
    request: PulseSearchRequest,
    background_tasks: BackgroundTasks,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "power"]))
):
    """
    Busca e sincroniza pulses por query (tags, adversary, etc)

    Requer: role admin ou power
    """
    service = OTXPulseSyncService(session)

    # Executar em background
    background_tasks.add_task(service.sync_pulses_by_search, request.query, request.limit)

    return {
        "status": "started",
        "message": f"Pulse search sync started: '{request.query}' (limit={request.limit})",
        "info": "Sync running in background"
    }


@router.get("/pulses/sync-history")
async def get_sync_history(
    limit: int = 10,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "power"]))
):
    """
    Histórico de sincronizações

    Requer: role admin ou power
    """
    service = OTXPulseSyncService(session)
    history = await service.get_sync_history(limit)

    return {
        "count": len(history),
        "history": history
    }


@router.get("/pulses/stats")
async def get_pulse_stats(
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "power"]))
):
    """
    Estatísticas de pulses sincronizados

    Requer: role admin ou power
    """
    service = OTXPulseSyncService(session)
    stats = await service.get_pulse_stats()

    return stats


# ====== MISP EXPORT ENDPOINTS ======

@router.post("/pulses/export/misp")
async def export_pulse_to_misp(
    request: ExportPulseRequest,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["admin"]))
):
    """
    Exporta um pulse específico para MISP

    Requer: role admin
    """
    exporter = OTXMISPExporter(session)
    result = await exporter.export_pulse_to_misp(str(request.pulse_id))

    if not result['success']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result['message']
        )

    return result


@router.post("/pulses/export/misp/batch")
async def export_pending_pulses_to_misp(
    background_tasks: BackgroundTasks,
    limit: int = 10,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["admin"]))
):
    """
    Exporta pulses pendentes para MISP em batch

    Requer: role admin
    """
    exporter = OTXMISPExporter(session)

    # Executar em background
    background_tasks.add_task(exporter.export_pending_pulses, limit)

    return {
        "status": "started",
        "message": f"Batch export to MISP started (limit={limit})",
        "info": "Export running in background"
    }


@router.get("/pulses/export/stats")
async def get_export_stats(
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "power"]))
):
    """
    Estatísticas de export para MISP

    Requer: role admin ou power
    """
    exporter = OTXMISPExporter(session)
    stats = await exporter.get_export_stats()

    return stats


# ====== BULK ENRICHMENT ENDPOINTS ======

@router.post("/iocs/enrich/bulk")
async def bulk_enrich_iocs(
    request: BulkEnrichmentRequest,
    background_tasks: BackgroundTasks,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "power"]))
):
    """
    Enriquece IOCs do MISP em massa com dados OTX

    Requer: role admin ou power
    """
    service = OTXBulkEnrichmentService(session)

    # Executar em background
    background_tasks.add_task(
        service.enrich_misp_iocs,
        request.limit,
        request.ioc_types,
        request.priority_only
    )

    return {
        "status": "started",
        "message": f"Bulk enrichment started (limit={request.limit}, priority_only={request.priority_only})",
        "info": "Enrichment running in background. Check /iocs/enrich/stats for progress"
    }


@router.post("/pulses/{pulse_id}/enrich-indicators")
async def enrich_pulse_indicators(
    pulse_id: UUID,
    background_tasks: BackgroundTasks,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "power"]))
):
    """
    Enriquece todos os indicators de um pulse específico

    Requer: role admin ou power
    """
    service = OTXBulkEnrichmentService(session)

    # Executar em background
    background_tasks.add_task(service.enrich_pulse_indicators, str(pulse_id))

    return {
        "status": "started",
        "message": f"Pulse indicators enrichment started for pulse {pulse_id}",
        "info": "Enrichment running in background"
    }


@router.get("/iocs/enrich/stats")
async def get_enrichment_stats(
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "power"]))
):
    """
    Estatísticas de enriquecimento de IOCs

    Requer: role admin ou power
    """
    service = OTXBulkEnrichmentService(session)
    stats = await service.get_enrichment_stats()

    return stats


# ====== COMBINED STATS ENDPOINT ======

@router.get("/otx/overview")
async def get_otx_overview(
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "power"]))
):
    """
    Overview completo do sistema OTX

    Retorna estatísticas de:
    - Pulses sincronizados
    - Export para MISP
    - Enriquecimento de IOCs
    - Chaves OTX

    Requer: role admin ou power
    """
    pulse_service = OTXPulseSyncService(session)
    exporter = OTXMISPExporter(session)
    enrichment_service = OTXBulkEnrichmentService(session)

    from app.cti.services.otx_key_manager import OTXKeyManager
    key_manager = OTXKeyManager(session)

    pulse_stats = await pulse_service.get_pulse_stats()
    export_stats = await exporter.get_export_stats()
    enrichment_stats = await enrichment_service.get_enrichment_stats()
    key_stats = await key_manager.get_key_stats()

    return {
        "pulses": pulse_stats,
        "misp_export": export_stats,
        "enrichment": enrichment_stats,
        "api_keys": key_stats
    }
