"""
CTI Techniques API - MITRE ATT&CK Techniques endpoints

Endpoints completamente isolados do resto da aplicação.
Prefix: /api/v1/cti/techniques
"""

import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query

from app.core.dependencies import get_current_user
from app.cti.services.attack_service import get_attack_service
from app.cti.schemas.technique import (
    TechniqueListResponse,
    TechniqueDetailResponse,
    TechniqueMatrixResponse,
    TechniqueHighlightRequest,
    TechniqueHighlightResponse
)

logger = logging.getLogger(__name__)

# Router isolado para CTI Techniques
router = APIRouter(prefix="/techniques", tags=["CTI - Techniques"])


@router.get("", response_model=TechniqueListResponse)
async def list_techniques(
    include_subtechniques: bool = Query(False, description="Include sub-techniques"),
    tactic: Optional[str] = Query(None, description="Filter by tactic name"),
    current_user: dict = Depends(get_current_user)
):
    """
    List MITRE ATT&CK techniques

    - **include_subtechniques**: Include sub-techniques (e.g., T1566.001)
    - **tactic**: Filter by tactic name (e.g., "Initial Access")

    Returns list of techniques sorted by ID.
    """
    try:
        service = get_attack_service()
        techniques = service.get_techniques(include_subtechniques=include_subtechniques)

        # Filter by tactic if specified
        if tactic:
            techniques = [
                t for t in techniques
                if tactic in t.get("tactics", [])
            ]
            logger.info(f"📊 Filtered to {len(techniques)} techniques for tactic: {tactic}")

        return TechniqueListResponse(
            total=len(techniques),
            techniques=techniques
        )

    except Exception as e:
        logger.error(f"❌ Error listing techniques: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error listing techniques: {str(e)}"
        )


@router.get("/matrix", response_model=TechniqueMatrixResponse)
async def get_matrix(
    current_user: dict = Depends(get_current_user)
):
    """
    Get ATT&CK matrix structure (tactics × techniques)

    Returns:
    - **tactics**: List of all tactics (14)
    - **techniques**: List of all techniques (~200)
    - **matrix**: Mapping {tactic_id: [technique_ids]}

    This is useful for rendering the ATT&CK matrix visualization.
    """
    try:
        service = get_attack_service()
        matrix_data = service.get_matrix()

        return TechniqueMatrixResponse(
            tactics=matrix_data["tactics"],
            techniques=matrix_data["techniques"],
            matrix=matrix_data["matrix"]
        )

    except Exception as e:
        logger.error(f"❌ Error getting matrix: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting matrix: {str(e)}"
        )


@router.get("/{technique_id}", response_model=TechniqueDetailResponse)
async def get_technique_detail(
    technique_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get detailed information about a specific technique

    - **technique_id**: Technique ID (e.g., "T1566" or "T1566.001")

    Returns technique details with:
    - Basic info (ID, name, description)
    - Tactics this technique belongs to
    - Mitigations (defensive measures)
    - URL to MITRE ATT&CK page
    - Sub-technique information
    """
    try:
        service = get_attack_service()

        # Get technique
        technique = service.get_technique(technique_id)
        if not technique:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Technique not found: {technique_id}"
            )

        # Get mitigations (TODO: filter by technique when implemented)
        mitigations = service.get_mitigations()

        return TechniqueDetailResponse(
            technique_id=technique["technique_id"],
            technique_name=technique["name"],
            description=technique["description"],
            tactics=[{"name": t} for t in technique.get("tactics", [])],
            url=technique.get("url"),
            is_subtechnique=technique.get("is_subtechnique", False),
            parent_id=technique.get("parent_id"),
            mitigations=[
                {
                    "mitigation_id": m["mitigation_id"],
                    "name": m["name"],
                    "description": m["description"]
                }
                for m in mitigations[:5]  # Limit to 5 for now (TODO: filter by technique)
            ]
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error getting technique {technique_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting technique: {str(e)}"
        )


@router.post("/highlight", response_model=TechniqueHighlightResponse)
async def highlight_techniques(
    request: TechniqueHighlightRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Highlight techniques based on selected actors/families

    This endpoint will compute which ATT&CK techniques to highlight
    based on the user's selection of threat actors or malware families.

    - **actors**: List of selected actor names
    - **families**: List of selected family names
    - **mode**: "union" (any match) or "intersection" (all match)

    Returns:
    - **highlighted_techniques**: List of technique IDs to highlight
    - **technique_details**: Details for each highlighted technique

    Note: Currently returns placeholder data. Full implementation requires
    enrichment of Malpedia data with ATT&CK techniques.
    """
    try:
        # TODO: Implement enrichment service to map families/actors to techniques
        # For now, return empty/placeholder response

        logger.warning(
            "⚠️ Highlight endpoint called but enrichment not yet implemented. "
            f"Actors: {request.actors}, Families: {request.families}"
        )

        return TechniqueHighlightResponse(
            highlighted_techniques=[],
            technique_details={},
            message=(
                "Enrichment service not yet implemented. "
                "Need to map Malpedia families/actors to ATT&CK techniques."
            )
        )

    except Exception as e:
        logger.error(f"❌ Error highlighting techniques: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error highlighting techniques: {str(e)}"
        )


@router.get("/stats")
async def get_stats(
    current_user: dict = Depends(get_current_user)
):
    """
    Get statistics about ATT&CK data

    Returns:
    - **total_tactics**: Number of tactics
    - **total_techniques**: Number of techniques
    - **total_subtechniques**: Number of sub-techniques
    - **total_mitigations**: Number of mitigations
    - **matrix_size**: Dimensions of the matrix
    """
    try:
        service = get_attack_service()
        stats = service.get_stats()

        return stats

    except Exception as e:
        logger.error(f"❌ Error getting stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting stats: {str(e)}"
        )
