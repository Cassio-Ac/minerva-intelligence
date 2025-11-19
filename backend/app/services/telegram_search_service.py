"""
Telegram Search Service
Serviço para busca e análise de mensagens do Telegram indexadas no Elasticsearch
"""

from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
import logging
from app.services.elasticsearch_service import get_es_service
from app.services.es_client_factory import ESClientFactory

logger = logging.getLogger(__name__)


# Padrão de índices para mensagens do Telegram
INDEX_PATTERN = "telegram_messages_*"
INDEX_INFO = "telegram_info"


class TelegramSearchService:
    """Service para busca e análise de mensagens do Telegram"""

    def __init__(self):
        self.es_service = get_es_service()

    async def search_messages(
        self,
        text: str,
        is_exact_search: bool = False,
        max_results: int = 500,
        server_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Busca por texto na mensagem

        Args:
            text: Texto a buscar
            is_exact_search: Se True, busca exata (substring). Se False, busca inteligente
            max_results: Máximo de resultados (padrão: 500)
            server_id: ID do servidor ES (opcional)

        Returns:
            Dicionário com mensagens encontradas
        """
        try:
            texto_lower = text.lower()

            if is_exact_search:
                # Busca exata com wildcard
                query = {
                    "bool": {
                        "should": [
                            {"wildcard": {"message": {"value": f"*{texto_lower}*", "case_insensitive": True, "boost": 2.0}}},
                            {"match_phrase": {"message": {"query": text, "boost": 1.0}}}
                        ],
                        "minimum_should_match": 1
                    }
                }
                sort_order = [{"date": "desc"}]
            else:
                # Busca inteligente combinando match e wildcard
                query = {
                    "bool": {
                        "should": [
                            {"match": {"message": {"query": text, "operator": "and", "boost": 4.0}}},
                            {"match_phrase": {"message": {"query": text, "boost": 3.0}}},
                            {"wildcard": {"message": {"value": f"*{texto_lower}*", "case_insensitive": True, "boost": 2.0}}},
                            {"match": {"message": {"query": text, "fuzziness": "AUTO", "boost": 0.5}}}
                        ],
                        "minimum_should_match": 1
                    }
                }
                sort_order = [{"_score": "desc"}, {"date": "desc"}]

            factory = ESClientFactory()
            es = await factory.get_client(server_id)

            response = await es.search(
                index=INDEX_PATTERN,
                body={
                    "query": query,
                    "size": max_results,
                    "sort": sort_order,
                    "_source": ["id", "date", "message", "sender_info", "group_info"]
                }
            )

            hits = response['hits']['hits']
            total = response['hits']['total']['value']

            return {
                "total": total,
                "hits": hits,
                "search_type": "exact" if is_exact_search else "intelligent"
            }

        except Exception as e:
            logger.error(f"❌ Error searching messages: {e}")
            raise

    async def search_by_user(
        self,
        search_term: str,
        max_results: int = 500,
        server_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Busca mensagens por usuário (user_id, username ou nome completo)

        Args:
            search_term: Termo de busca (user_id, username ou nome)
            max_results: Máximo de resultados (padrão: 500)
            server_id: ID do servidor ES (opcional)

        Returns:
            Dicionário com mensagens encontradas
        """
        try:
            termo_lower = search_term.lower().strip()
            termo_original = search_term.strip()

            # Remove @ se presente
            if termo_lower.startswith('@'):
                termo_lower = termo_lower[1:]
                termo_original = termo_original[1:]

            should_clauses = []

            # Busca por USER_ID (exato)
            if termo_original.isdigit():
                should_clauses.append({
                    "term": {"sender_info.user_id": int(termo_original)}
                })

            # Busca por USERNAME
            should_clauses.extend([
                {
                    "bool": {
                        "must": [
                            {"exists": {"field": "sender_info.username"}},
                            {"wildcard": {"sender_info.username": {"value": f"*{termo_lower}*", "case_insensitive": True}}}
                        ]
                    }
                },
                {
                    "bool": {
                        "must": [
                            {"exists": {"field": "sender_info.username"}},
                            {"match": {"sender_info.username": {"query": termo_lower}}}
                        ]
                    }
                }
            ])

            # Busca por NOME COMPLETO
            should_clauses.extend([
                {
                    "bool": {
                        "must": [
                            {"exists": {"field": "sender_info.full_name"}},
                            {"match_phrase": {"sender_info.full_name": {"query": termo_original, "slop": 1}}}
                        ]
                    }
                },
                {
                    "bool": {
                        "must": [
                            {"exists": {"field": "sender_info.full_name"}},
                            {"match": {"sender_info.full_name": {"query": termo_original, "operator": "and", "fuzziness": "AUTO"}}}
                        ]
                    }
                },
                {
                    "bool": {
                        "must": [
                            {"exists": {"field": "sender_info.full_name.keyword"}},
                            {"wildcard": {"sender_info.full_name.keyword": {"value": f"*{termo_original}*", "case_insensitive": True}}}
                        ]
                    }
                }
            ])

            query = {
                "bool": {
                    "should": should_clauses,
                    "minimum_should_match": 1
                }
            }

            factory = ESClientFactory()
            es = await factory.get_client(server_id)

            response = await es.search(
                index=INDEX_PATTERN,
                body={
                    "query": query,
                    "size": max_results,
                    "sort": [{"date": "desc"}],
                    "_source": ["id", "date", "message", "sender_info", "group_info"]
                }
            )

            hits = response['hits']['hits']
            total = response['hits']['total']['value']

            return {
                "total": total,
                "hits": hits,
                "search_term": search_term
            }

        except Exception as e:
            logger.error(f"❌ Error searching by user: {e}")
            raise

    async def get_message_context(
        self,
        index_name: str,
        msg_id: int,
        before: int = 10,
        after: int = 10,
        server_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Busca N mensagens antes e N depois de uma mensagem específica

        Args:
            index_name: Nome do índice onde a mensagem está
            msg_id: ID da mensagem
            before: Quantidade de mensagens antes (padrão: 10)
            after: Quantidade de mensagens depois (padrão: 10)
            server_id: ID do servidor ES (opcional)

        Returns:
            Dicionário com contexto da mensagem
        """
        try:
            factory = ESClientFactory()
            es = await factory.get_client(server_id)

            # Buscar mensagens próximas por ID
            response = await es.search(
                index=index_name,
                body={
                    "query": {
                        "range": {
                            "id": {
                                "gte": msg_id - before * 2,
                                "lte": msg_id + after * 2
                            }
                        }
                    },
                    "size": 500,
                    "sort": [{"date": "asc"}]
                }
            )

            todas = response['hits']['hits']

            # Encontrar índice da mensagem selecionada
            idx_selecionada = None
            for i, hit in enumerate(todas):
                if hit['_source']['id'] == msg_id:
                    idx_selecionada = i
                    break

            if idx_selecionada is None:
                return {
                    "total": len(todas),
                    "messages": todas,
                    "selected_message_id": msg_id
                }

            # Extrair janela de contexto
            inicio = max(0, idx_selecionada - before)
            fim = min(len(todas), idx_selecionada + after + 1)

            contexto = todas[inicio:fim]

            # Extract group info from first message
            group_title = None
            group_username = None
            if contexto and len(contexto) > 0:
                first_msg = contexto[0]['_source']
                group_info = first_msg.get('group_info', {})
                group_title = group_info.get('group_title')
                group_username = group_info.get('group_username')

                # If not found in message, extract from index name
                if not group_username:
                    group_username = index_name.replace('telegram_messages_', '')

            return {
                "total": len(contexto),
                "messages": contexto,
                "selected_message_id": msg_id,
                "selected_index": idx_selecionada - inicio,
                "group_title": group_title,
                "group_username": group_username
            }

        except Exception as e:
            logger.error(f"❌ Error getting message context: {e}")
            raise

    async def get_statistics(
        self,
        period_days: Optional[int] = None,
        server_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Retorna estatísticas gerais de grupos e usuários

        Args:
            period_days: Período em dias (None = all time)
            server_id: ID do servidor ES (opcional)

        Returns:
            Estatísticas gerais
        """
        try:
            query = {"match_all": {}}

            if period_days:
                data_inicio = datetime.utcnow() - timedelta(days=period_days)
                query = {
                    "range": {
                        "date": {
                            "gte": data_inicio.isoformat() + "Z"
                        }
                    }
                }

            factory = ESClientFactory()
            es = await factory.get_client(server_id)

            # Contar total de mensagens
            count_response = await es.count(
                index=INDEX_PATTERN,
                body={"query": query}
            )
            total_msgs = count_response['count']

            # Agregação de grupos
            response_grupos = await es.search(
                index=INDEX_PATTERN,
                body={
                    "query": query,
                    "size": 0,
                    "aggs": {
                        "total_grupos_unicos": {
                            "cardinality": {
                                "field": "group_info.group_username"
                            }
                        },
                        "top_grupos": {
                            "terms": {
                                "field": "group_info.group_username",
                                "size": 20,
                                "order": {"_count": "desc"}
                            },
                            "aggs": {
                                "titulo": {
                                    "terms": {
                                        "field": "group_info.group_title.keyword",
                                        "size": 1
                                    }
                                }
                            }
                        }
                    }
                }
            )

            # Agregação de usuários (apenas usuários com username - pesquisáveis)
            response_usuarios = await es.search(
                index=INDEX_PATTERN,
                body={
                    "query": query,
                    "size": 0,
                    "aggs": {
                        "total_usuarios_unicos": {
                            "filter": {
                                "exists": {"field": "sender_info.username"}
                            },
                            "aggs": {
                                "unique_users": {
                                    "cardinality": {
                                        "field": "sender_info.user_id"
                                    }
                                }
                            }
                        },
                        "top_usuarios": {
                            "terms": {
                                "field": "sender_info.user_id",
                                "size": 20,
                                "order": {"_count": "desc"},
                                "missing": 0
                            },
                            "aggs": {
                                "username": {
                                    "terms": {
                                        "field": "sender_info.username",
                                        "size": 1,
                                        "missing": "N/A"
                                    }
                                },
                                "full_name": {
                                    "terms": {
                                        "field": "sender_info.full_name.keyword",
                                        "size": 1,
                                        "missing": "Unknown"
                                    }
                                },
                                "top_grupos": {
                                    "terms": {
                                        "field": "group_info.group_username",
                                        "size": 5,
                                        "order": {"_count": "desc"}
                                    },
                                    "aggs": {
                                        "titulo": {
                                            "terms": {
                                                "field": "group_info.group_title.keyword",
                                                "size": 1
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            )

            return {
                "total_mensagens": total_msgs,
                "total_grupos": response_grupos['aggregations']['total_grupos_unicos']['value'],
                "total_usuarios": response_usuarios['aggregations']['total_usuarios_unicos']['unique_users']['value'],
                "grupos": response_grupos['aggregations']['top_grupos']['buckets'],
                "usuarios": response_usuarios['aggregations']['top_usuarios']['buckets'],
                "period_days": period_days
            }

        except Exception as e:
            logger.error(f"❌ Error getting statistics: {e}")
            raise

    async def get_group_statistics(
        self,
        group_username: str,
        period_days: Optional[int] = None,
        server_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Estatísticas de um grupo específico

        Args:
            group_username: Username do grupo
            period_days: Período em dias (None = all time)
            server_id: ID do servidor ES (opcional)

        Returns:
            Estatísticas do grupo
        """
        try:
            query = {
                "bool": {
                    "must": [
                        {"term": {"group_info.group_username": group_username}}
                    ]
                }
            }

            if period_days:
                data_inicio = datetime.utcnow() - timedelta(days=period_days)
                query["bool"]["must"].append({
                    "range": {
                        "date": {
                            "gte": data_inicio.isoformat() + "Z"
                        }
                    }
                })

            factory = ESClientFactory()
            es = await factory.get_client(server_id)

            # Contar total de mensagens
            count_response = await es.count(
                index=INDEX_PATTERN,
                body={"query": query}
            )
            total_msgs = count_response['count']

            # Agregação de usuários do grupo
            response = await es.search(
                index=INDEX_PATTERN,
                body={
                    "query": query,
                    "size": 0,
                    "aggs": {
                        "top_usuarios": {
                            "terms": {
                                "field": "sender_info.user_id",
                                "size": 20,
                                "order": {"_count": "desc"},
                                "missing": 0
                            },
                            "aggs": {
                                "username": {
                                    "terms": {"field": "sender_info.username", "size": 1, "missing": "N/A"}
                                },
                                "full_name": {
                                    "terms": {"field": "sender_info.full_name.keyword", "size": 1, "missing": "Unknown"}
                                }
                            }
                        },
                        "titulo": {
                            "terms": {"field": "group_info.group_title.keyword", "size": 1}
                        }
                    }
                }
            )

            titulo_buckets = response['aggregations'].get('titulo', {}).get('buckets', [])
            titulo = titulo_buckets[0]['key'] if titulo_buckets else group_username

            return {
                "total_mensagens": total_msgs,
                "grupo_nome": titulo,
                "grupo_username": group_username,
                "usuarios": response['aggregations']['top_usuarios']['buckets'],
                "period_days": period_days
            }

        except Exception as e:
            logger.error(f"❌ Error getting group statistics: {e}")
            raise

    async def get_user_statistics(
        self,
        user_id: int,
        period_days: Optional[int] = None,
        server_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Estatísticas de um usuário específico

        Args:
            user_id: ID do usuário
            period_days: Período em dias (None = all time)
            server_id: ID do servidor ES (opcional)

        Returns:
            Estatísticas do usuário
        """
        try:
            query = {
                "bool": {
                    "must": [
                        {"term": {"sender_info.user_id": user_id}}
                    ]
                }
            }

            if period_days:
                data_inicio = datetime.utcnow() - timedelta(days=period_days)
                query["bool"]["must"].append({
                    "range": {
                        "date": {
                            "gte": data_inicio.isoformat() + "Z"
                        }
                    }
                })

            factory = ESClientFactory()
            es = await factory.get_client(server_id)

            # Contar total de mensagens
            count_response = await es.count(
                index=INDEX_PATTERN,
                body={"query": query}
            )
            total_msgs = count_response['count']

            # Agregação de grupos onde o usuário interage
            response = await es.search(
                index=INDEX_PATTERN,
                body={
                    "query": query,
                    "size": 0,
                    "aggs": {
                        "top_grupos": {
                            "terms": {
                                "field": "group_info.group_username",
                                "size": 20,
                                "order": {"_count": "desc"}
                            },
                            "aggs": {
                                "titulo": {
                                    "terms": {"field": "group_info.group_title.keyword", "size": 1}
                                }
                            }
                        },
                        "username": {
                            "terms": {"field": "sender_info.username", "size": 1, "missing": "N/A"}
                        },
                        "full_name": {
                            "terms": {"field": "sender_info.full_name.keyword", "size": 1, "missing": "Unknown"}
                        }
                    }
                }
            )

            username_buckets = response['aggregations'].get('username', {}).get('buckets', [])
            full_name_buckets = response['aggregations'].get('full_name', {}).get('buckets', [])

            username = username_buckets[0]['key'] if username_buckets else 'N/A'

            if full_name_buckets and full_name_buckets[0]['key']:
                nome = full_name_buckets[0]['key']
            elif username != 'N/A':
                nome = f"@{username}"
            else:
                nome = 'Unknown'

            return {
                "total_mensagens": total_msgs,
                "user_id": user_id,
                "username": username,
                "nome": nome,
                "grupos": response['aggregations']['top_grupos']['buckets'],
                "period_days": period_days
            }

        except Exception as e:
            logger.error(f"❌ Error getting user statistics: {e}")
            raise

    async def list_groups(
        self,
        server_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Lista todos os grupos disponíveis

        Args:
            server_id: ID do servidor ES (opcional)

        Returns:
            Lista de grupos
        """
        try:
            factory = ESClientFactory()
            es = await factory.get_client(server_id)

            response = await es.search(
                index=INDEX_INFO,
                body={
                    "size": 10000,
                    "sort": [{"title.keyword": "asc"}],
                    "_source": ["title", "username", "id"]
                }
            )

            return response['hits']['hits']

        except Exception as e:
            logger.error(f"❌ Error listing groups: {e}")
            raise

    async def get_group_messages(
        self,
        group_username: str,
        page: int = 1,
        page_size: int = 20,
        server_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Lê mensagens de um grupo com paginação

        Args:
            group_username: Username do grupo
            page: Número da página (começa em 1)
            page_size: Tamanho da página (padrão: 20)
            server_id: ID do servidor ES (opcional)

        Returns:
            Mensagens paginadas do grupo
        """
        try:
            from_offset = (page - 1) * page_size

            factory = ESClientFactory()
            es = await factory.get_client(server_id)

            response = await es.search(
                index=INDEX_PATTERN,
                body={
                    "query": {"term": {"group_info.group_username": group_username}},
                    "from": from_offset,
                    "size": page_size,
                    "sort": [{"date": "desc"}],
                    "_source": ["id", "date", "message", "sender_info", "group_info"]
                }
            )

            total = response['hits']['total']['value']
            hits = response['hits']['hits']

            titulo = group_username  # Default to username
            if hits:
                group_info = hits[0]['_source'].get('group_info', {})
                titulo = group_info.get('group_title') or group_username

            return {
                "mensagens": hits,
                "total": total,
                "titulo": titulo,
                "username": group_username,
                "page": page,
                "page_size": page_size,
                "total_pages": (total + page_size - 1) // page_size
            }

        except Exception as e:
            logger.error(f"❌ Error getting group messages: {e}")
            raise

    async def get_timeline(
        self,
        days: int = 30,
        server_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Timeline de mensagens por dia

        Args:
            days: Número de dias para timeline (padrão: 30)
            server_id: ID do servidor ES (opcional)

        Returns:
            Timeline com contagem de mensagens por dia
        """
        try:
            factory = ESClientFactory()
            es = await factory.get_client(server_id)

            # Query para filtrar últimos N dias
            query = {
                "range": {
                    "date": {
                        "gte": f"now-{days}d/d",
                        "lte": "now/d"
                    }
                }
            }

            # Agregação por dia
            response = await es.search(
                index=INDEX_PATTERN,
                body={
                    "query": query,
                    "size": 0,
                    "aggs": {
                        "messages_per_day": {
                            "date_histogram": {
                                "field": "date",
                                "calendar_interval": "day",
                                "format": "yyyy-MM-dd",
                                "order": {"_key": "asc"}
                            }
                        }
                    }
                }
            )

            buckets = response['aggregations']['messages_per_day']['buckets']

            return {
                "total_days": len(buckets),
                "days": days,
                "timeline": [
                    {
                        "date": bucket['key_as_string'],
                        "count": bucket['doc_count']
                    }
                    for bucket in buckets
                ]
            }

        except Exception as e:
            logger.error(f"❌ Error getting timeline: {e}")
            raise


# Singleton instance
_telegram_service: Optional[TelegramSearchService] = None


def get_telegram_service() -> TelegramSearchService:
    """Retorna instância do service"""
    global _telegram_service
    if _telegram_service is None:
        _telegram_service = TelegramSearchService()
    return _telegram_service
