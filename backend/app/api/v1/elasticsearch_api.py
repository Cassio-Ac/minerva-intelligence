"""
Elasticsearch API Endpoints
Direct Elasticsearch operations
"""

from fastapi import APIRouter, HTTPException, Query, Depends, status
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from sqlalchemy.orm import Session
import logging

from app.services.elasticsearch_service import get_es_service
from app.core.dependencies import get_current_user, get_db
from app.models.user import User
from app.services.index_authorization_service import get_index_authorization_service

router = APIRouter()
logger = logging.getLogger(__name__)


class IndexInfo(BaseModel):
    """Informação de um índice"""
    name: str
    docs_count: int
    size: str


class FieldInfo(BaseModel):
    """Informação de um campo"""
    name: str
    type: str
    aggregatable: Optional[bool] = None
    searchable: Optional[bool] = None


@router.get("/indices", response_model=List[IndexInfo])
async def list_indices(
    pattern: str = Query("*", description="Index pattern (e.g., 'log-*')")
):
    """
    Lista índices Elasticsearch

    - **pattern**: Padrão de índices (default: '*')
    """
    logger.info(f"Listing ES indices with pattern: {pattern}")

    # TODO: Implementar listagem de índices
    # indices = await elasticsearch_service.list_indices(pattern)
    # return indices

    raise HTTPException(status_code=501, detail="Not implemented yet")


@router.get("/indices/{index_name}/mapping", response_model=Dict[str, Any])
async def get_mapping(index_name: str):
    """
    Obtém mapeamento de um índice

    - **index_name**: Nome do índice
    """
    logger.info(f"Getting mapping for index: {index_name}")

    # TODO: Implementar obtenção de mapping
    # mapping = await elasticsearch_service.get_mapping(index_name)
    # return mapping

    raise HTTPException(status_code=501, detail="Not implemented yet")


@router.get("/indices/{index_name}/fields", response_model=List[FieldInfo])
async def get_fields(
    index_name: str,
    server_id: Optional[str] = Query(None, description="ES Server ID"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Lista campos de um índice

    Retorna lista simplificada de campos com tipos.

    - **index_name**: Nome do índice
    - **server_id**: ID do servidor ES (opcional)

    **Permissões:**
    - ADMIN e POWER: Acesso irrestrito
    - OPERATOR: Só pode acessar índices com permissão
    """
    # Verificar permissão de acesso ao índice
    auth_service = get_index_authorization_service(db)

    can_access = auth_service.can_access_index(
        user=current_user,
        index_name=index_name,
        es_server_id=server_id or "default",
        action="read"
    )

    if not can_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"User does not have permission to access index '{index_name}'"
        )

    try:
        logger.info(
            f"User {current_user.username} getting fields for index: {index_name} "
            f"(server: {server_id or 'default'})"
        )

        es_service = get_es_service()
        fields = await es_service.get_fields(index_name, server_id)

        return [
            FieldInfo(
                name=field["name"],
                type=field["type"],
                aggregatable=field.get("aggregatable"),
                searchable=field.get("searchable"),
            )
            for field in fields
        ]

    except Exception as e:
        logger.error(f"Error getting fields for index {index_name}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def elasticsearch_health():
    """
    Verifica saúde do cluster Elasticsearch
    """
    logger.info("Checking ES health")

    # TODO: Implementar health check
    # health = await elasticsearch_service.cluster_health()
    # return health

    raise HTTPException(status_code=501, detail="Not implemented yet")
