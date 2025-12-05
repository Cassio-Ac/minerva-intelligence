"""
API Endpoints para Consulta de Credenciais no Data Lake (Elasticsearch)

Endpoints:
- GET /credentials/datalake/search - Busca credenciais por termo
- GET /credentials/datalake/stats - Estatísticas do Data Lake
- GET /credentials/datalake/timeline - Timeline de ingestão
- GET /credentials/datalake/top-domains - Top domínios vazados
- GET /credentials/datalake/by-domain - Busca por domínio específico
"""

import logging
from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.db.elasticsearch import ElasticsearchClient

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/credentials/datalake", tags=["Credentials - Data Lake"])

# Index name
INDEX_NAME = "leaked_credentials"


# ============================================================
# Schemas
# ============================================================

class CredentialResult(BaseModel):
    """Resultado de uma credencial"""
    usuario: str
    senha: str
    url: Optional[str] = None
    dominio_email: Optional[str] = None
    dominio_url: Optional[str] = None
    complexidade_senha: Optional[str] = None
    forca_senha: Optional[int] = None
    tamanho_senha: Optional[int] = None
    data_breach: Optional[str] = None
    arquivo: Optional[str] = None
    grupo_telegram: Optional[str] = None
    padrao_detectado: Optional[str] = None


class SearchResponse(BaseModel):
    """Response da busca"""
    total: int
    page: int
    page_size: int
    total_pages: int
    results: List[CredentialResult]
    query: str
    search_time_ms: int


class DataLakeStats(BaseModel):
    """Estatísticas do Data Lake"""
    total_credentials: int
    unique_domains: int
    unique_email_domains: int
    by_complexity: dict
    by_pattern: dict
    recent_ingestions: int
    avg_password_strength: float


class TimelineItem(BaseModel):
    """Item da timeline"""
    date: str
    count: int


class TopDomainItem(BaseModel):
    """Item de top domínio"""
    domain: str
    count: int


# ============================================================
# Search Endpoint
# ============================================================

@router.get("/search", response_model=SearchResponse)
async def search_credentials(
    q: str = Query(..., min_length=3, description="Termo de busca (min 3 caracteres)"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=10, le=200),
    domain_filter: Optional[str] = Query(default=None, description="Filtrar por domínio"),
    complexity_filter: Optional[str] = Query(default=None, description="Filtrar por complexidade"),
    search_type: str = Query(default="wildcard", description="Tipo: wildcard (padrão) ou prefix (rápido)"),
    field: str = Query(default="all", description="Campo: all, usuario, dominio_email, dominio_url")
):
    """
    Busca credenciais no Data Lake (230M+ documentos).

    Tipos de busca:
    - wildcard: Busca completa (ex: "riachuelo" encontra "joao@riachuelo.com.br") - 30-60s
    - prefix: Busca rápida por prefixo (ex: "john" encontra "john@email.com") - ~1s

    Campos:
    - all: Busca em todos os campos
    - usuario: Apenas no campo de usuário/email (mais rápido)
    - dominio_email: Apenas no domínio do email
    - dominio_url: Apenas no domínio da URL
    """
    import time
    start_time = time.time()

    try:
        client = ElasticsearchClient.get_client()

        # Calcula offset
        offset = (page - 1) * page_size
        q_lower = q.lower()

        # Define campos baseado no parâmetro field
        if field == "usuario":
            search_fields = ["usuario"]
        elif field == "dominio_email":
            search_fields = ["dominio_email"]
        elif field == "dominio_url":
            search_fields = ["dominio_url"]
        else:  # all
            search_fields = ["usuario", "dominio_email", "dominio_url"]

        # Escolhe estratégia de busca baseada no tipo
        if search_type == "wildcard":
            # Busca wildcard - LENTA mas mais flexível
            should_clauses = [
                {"wildcard": {f: {"value": f"*{q_lower}*", "case_insensitive": True}}}
                for f in search_fields
            ]
        else:
            # Busca prefix - RÁPIDA (padrão)
            should_clauses = []
            for f in search_fields:
                # Term exato (muito rápido)
                should_clauses.append({"term": {f: {"value": q_lower, "boost": 10}}})
                # Prefix (rápido)
                should_clauses.append({"prefix": {f: {"value": q_lower, "boost": 3}}})

        must_clauses = [
            {
                "bool": {
                    "should": should_clauses,
                    "minimum_should_match": 1
                }
            }
        ]

        # Filtros opcionais
        if domain_filter:
            must_clauses.append({
                "bool": {
                    "should": [
                        {"term": {"dominio_email": domain_filter.lower()}},
                        {"term": {"dominio_url": domain_filter.lower()}}
                    ],
                    "minimum_should_match": 1
                }
            })

        if complexity_filter:
            must_clauses.append({"term": {"complexidade_senha": complexity_filter}})

        query = {
            "bool": {
                "must": must_clauses
            }
        }

        # Executa busca com timeout
        response = await client.search(
            index=INDEX_NAME,
            body={
                "query": query,
                "from": offset,
                "size": page_size,
                "sort": [
                    {"ingestao_timestamp": {"order": "desc", "unmapped_type": "date"}},
                    "_score"
                ],
                "_source": [
                    "usuario", "senha", "url", "dominio_email", "dominio_url",
                    "complexidade_senha", "forca_senha", "tamanho_senha",
                    "data_breach", "arquivo", "grupo_telegram", "padrao_detectado"
                ],
                "timeout": "120s",  # 2 minutos para buscas wildcard em 230M docs
                "track_total_hits": 10000  # Limita contagem para performance
            }
        )

        # Processa resultados
        total = response["hits"]["total"]["value"]
        results = []

        for hit in response["hits"]["hits"]:
            source = hit["_source"]
            results.append(CredentialResult(
                usuario=source.get("usuario", ""),
                senha=source.get("senha", ""),
                url=source.get("url"),
                dominio_email=source.get("dominio_email"),
                dominio_url=source.get("dominio_url"),
                complexidade_senha=source.get("complexidade_senha"),
                forca_senha=source.get("forca_senha"),
                tamanho_senha=source.get("tamanho_senha"),
                data_breach=source.get("data_breach"),
                arquivo=source.get("arquivo"),
                grupo_telegram=source.get("grupo_telegram"),
                padrao_detectado=source.get("padrao_detectado")
            ))

        search_time = int((time.time() - start_time) * 1000)
        total_pages = (total + page_size - 1) // page_size

        logger.info(f"🔍 Busca '{q}': {total} resultados em {search_time}ms")

        return SearchResponse(
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
            results=results,
            query=q,
            search_time_ms=search_time
        )

    except Exception as e:
        logger.error(f"❌ Erro na busca: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# Statistics Endpoint
# ============================================================

@router.get("/stats", response_model=DataLakeStats)
async def get_datalake_stats():
    """Retorna estatísticas do Data Lake de credenciais"""
    try:
        client = ElasticsearchClient.get_client()

        # Total de credenciais
        count_response = await client.count(index=INDEX_NAME)
        total = count_response["count"]

        # Agregações
        agg_response = await client.search(
            index=INDEX_NAME,
            body={
                "size": 0,
                "aggs": {
                    "unique_email_domains": {
                        "cardinality": {"field": "dominio_email"}
                    },
                    "unique_url_domains": {
                        "cardinality": {"field": "dominio_url"}
                    },
                    "by_complexity": {
                        "terms": {"field": "complexidade_senha", "size": 10}
                    },
                    "by_pattern": {
                        "terms": {"field": "padrao_detectado", "size": 10}
                    },
                    "avg_strength": {
                        "avg": {"field": "forca_senha"}
                    },
                    "recent_7d": {
                        "filter": {
                            "range": {
                                "ingestao_timestamp": {
                                    "gte": "now-7d/d"
                                }
                            }
                        }
                    }
                }
            }
        )

        aggs = agg_response["aggregations"]

        # Processa complexidade
        by_complexity = {}
        for bucket in aggs["by_complexity"]["buckets"]:
            by_complexity[bucket["key"]] = bucket["doc_count"]

        # Processa padrões
        by_pattern = {}
        for bucket in aggs["by_pattern"]["buckets"]:
            by_pattern[bucket["key"]] = bucket["doc_count"]

        return DataLakeStats(
            total_credentials=total,
            unique_domains=aggs["unique_url_domains"]["value"],
            unique_email_domains=aggs["unique_email_domains"]["value"],
            by_complexity=by_complexity,
            by_pattern=by_pattern,
            recent_ingestions=aggs["recent_7d"]["doc_count"],
            avg_password_strength=round(aggs["avg_strength"]["value"] or 0, 1)
        )

    except Exception as e:
        logger.error(f"❌ Erro ao obter stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# Timeline Endpoint
# ============================================================

@router.get("/timeline")
async def get_breach_timeline(
    months: int = Query(default=12, ge=1, le=24)
):
    """Retorna timeline de vazamentos por mês (usando data_breach)"""
    try:
        client = ElasticsearchClient.get_client()

        response = await client.search(
            index=INDEX_NAME,
            body={
                "size": 0,
                "query": {
                    "range": {
                        "data_breach": {
                            "gte": f"now-{months}M/M"
                        }
                    }
                },
                "aggs": {
                    "timeline": {
                        "date_histogram": {
                            "field": "data_breach",
                            "calendar_interval": "month",
                            "format": "yyyy-MM"
                        }
                    }
                }
            }
        )

        timeline = []
        for bucket in response["aggregations"]["timeline"]["buckets"]:
            timeline.append({
                "date": bucket["key_as_string"],
                "count": bucket["doc_count"]
            })

        return {"timeline": timeline, "months": months}

    except Exception as e:
        logger.error(f"❌ Erro ao obter timeline: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# Top Domains Endpoint
# ============================================================

@router.get("/top-domains")
async def get_top_domains(
    domain_type: str = Query(default="email", description="Tipo: email ou url"),
    limit: int = Query(default=20, ge=5, le=100)
):
    """Retorna os domínios mais frequentes"""
    try:
        client = ElasticsearchClient.get_client()

        field = "dominio_email" if domain_type == "email" else "dominio_url"

        response = await client.search(
            index=INDEX_NAME,
            body={
                "size": 0,
                "aggs": {
                    "top_domains": {
                        "terms": {
                            "field": field,
                            "size": limit
                        }
                    }
                }
            }
        )

        domains = []
        for bucket in response["aggregations"]["top_domains"]["buckets"]:
            domains.append({
                "domain": bucket["key"],
                "count": bucket["doc_count"]
            })

        return {"domains": domains, "type": domain_type}

    except Exception as e:
        logger.error(f"❌ Erro ao obter top domains: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# Search by Domain Endpoint
# ============================================================

@router.get("/by-domain")
async def search_by_domain(
    domain: str = Query(..., min_length=3, description="Domínio para buscar"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=10, le=200)
):
    """Busca credenciais de um domínio específico"""
    import time
    start_time = time.time()

    try:
        client = ElasticsearchClient.get_client()

        offset = (page - 1) * page_size

        # Busca em ambos os campos de domínio
        query = {
            "bool": {
                "should": [
                    {"term": {"dominio_email": domain.lower()}},
                    {"term": {"dominio_url": domain.lower()}},
                    {"wildcard": {"dominio_email": f"*{domain.lower()}*"}},
                    {"wildcard": {"dominio_url": f"*{domain.lower()}*"}}
                ],
                "minimum_should_match": 1
            }
        }

        response = await client.search(
            index=INDEX_NAME,
            body={
                "query": query,
                "from": offset,
                "size": page_size,
                "sort": [
                    {"ingestao_timestamp": {"order": "desc", "unmapped_type": "date"}}
                ],
                "_source": [
                    "usuario", "senha", "url", "dominio_email", "dominio_url",
                    "complexidade_senha", "forca_senha", "data_breach", "arquivo"
                ]
            }
        )

        total = response["hits"]["total"]["value"]
        results = []

        for hit in response["hits"]["hits"]:
            source = hit["_source"]
            results.append({
                "usuario": source.get("usuario", ""),
                "senha": source.get("senha", ""),
                "url": source.get("url"),
                "dominio_email": source.get("dominio_email"),
                "dominio_url": source.get("dominio_url"),
                "complexidade_senha": source.get("complexidade_senha"),
                "forca_senha": source.get("forca_senha"),
                "data_breach": source.get("data_breach"),
                "arquivo": source.get("arquivo")
            })

        search_time = int((time.time() - start_time) * 1000)

        return {
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": (total + page_size - 1) // page_size,
            "results": results,
            "domain": domain,
            "search_time_ms": search_time
        }

    except Exception as e:
        logger.error(f"❌ Erro na busca por domínio: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# Top Sources (Arquivos/Grupos) Endpoint
# ============================================================

@router.get("/top-sources")
async def get_top_sources(
    source_type: str = Query(default="arquivo", description="Tipo: arquivo ou grupo_telegram"),
    limit: int = Query(default=20, ge=5, le=100)
):
    """Retorna as fontes mais frequentes"""
    try:
        client = ElasticsearchClient.get_client()

        field = "arquivo" if source_type == "arquivo" else "grupo_telegram"

        response = await client.search(
            index=INDEX_NAME,
            body={
                "size": 0,
                "aggs": {
                    "top_sources": {
                        "terms": {
                            "field": field,
                            "size": limit
                        }
                    }
                }
            }
        )

        sources = []
        for bucket in response["aggregations"]["top_sources"]["buckets"]:
            sources.append({
                "source": bucket["key"],
                "count": bucket["doc_count"]
            })

        return {"sources": sources, "type": source_type}

    except Exception as e:
        logger.error(f"❌ Erro ao obter top sources: {e}")
        raise HTTPException(status_code=500, detail=str(e))
