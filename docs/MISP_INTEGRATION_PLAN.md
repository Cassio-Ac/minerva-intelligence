# 🔗 MISP Integration - Implementation Plan

**Data**: 2025-11-20
**Status**: 📋 Planejamento
**Prioridade**: ⭐⭐⭐ Alta

---

## 📋 Executive Summary

**O que é MISP?**
MISP (Malware Information Sharing Platform) é uma plataforma open-source para compartilhamento de threat intelligence, permitindo colaboração entre organizações e comunidades de segurança.

**Por que integrar?**
- ✅ Compartilhar nossos **864 actors + 3,591 families** com a comunidade global
- ✅ Importar IOCs de instâncias MISP públicas e parceiros
- ✅ Enriquecer actors com inteligência da comunidade em tempo real
- ✅ Feeds automatizados de threat intelligence
- ✅ Compatibilidade STIX 2.1 (já temos `stix2` library)
- ✅ Construir reputação na comunidade CTI

---

## 🎯 Objetivos da Integração

### 1. Export (Compartilhamento)
Exportar nossos dados CTI para MISP:
- 864 threat actors do Malpedia
- 3,591 malware families
- 864 actors com enrichment MITRE ATT&CK (171 direct + 693 LLM)
- Referências, aliases, TTPs

### 2. Import (Enriquecimento)
Importar inteligência da comunidade MISP:
- IOCs (IPs, domains, hashes, URLs)
- Eventos de threat intelligence
- Campanhas e atividades recentes
- Contexto geopolítico adicional

### 3. Bidirectional Sync
Sincronização automática:
- Push: Enviar novos/atualizados actors para MISP
- Pull: Buscar novos IOCs/eventos do MISP
- Resolução de conflitos
- Feeds automatizados

---

## 🏗️ Arquitetura Proposta

### Estrutura de Código

```
backend/app/cti/
├── api/
│   ├── actors.py           ✅ Existente
│   ├── families.py         ✅ Existente
│   ├── techniques.py       ✅ Existente
│   ├── enrichment.py       ✅ Existente
│   └── misp.py            🆕 NOVO - Endpoints MISP
│
├── services/
│   ├── malpedia_service.py         ✅ Existente
│   ├── attack_service.py           ✅ Existente
│   ├── misp_galaxy_service.py      ✅ Existente (só geo)
│   ├── misp_service.py            🆕 NOVO - Core MISP
│   ├── misp_sync_service.py       🆕 NOVO - Sync bidirecional
│   ├── misp_feed_service.py       🆕 NOVO - Feeds
│   ├── misp_mapping_service.py    🆕 NOVO - Data mapping
│   └── stix_misp_service.py       🆕 NOVO - STIX conversion
│
├── schemas/
│   ├── actor.py            ✅ Existente
│   ├── family.py           ✅ Existente
│   ├── technique.py        ✅ Existente
│   └── misp.py            🆕 NOVO - Schemas MISP
│
└── models/
    └── misp_config.py      🆕 NOVO - Configuração MISP
```

### Frontend Components

```
frontend/src/components/cti/misp/
├── MISPDashboard.tsx          🆕 Overview MISP
├── MISPConnectionStatus.tsx   🆕 Status de conexão
├── MISPExportDialog.tsx       🆕 Diálogo de export
├── MISPImportDialog.tsx       🆕 Diálogo de import
├── MISPEventList.tsx          🆕 Lista de eventos
├── MISPEventDetail.tsx        🆕 Detalhes de evento
├── MISPSyncStatus.tsx         🆕 Status de sync
├── MISPFeedManager.tsx        🆕 Gerenciador de feeds
└── ActorMISPActivity.tsx      🆕 Atividade MISP do actor
```

### Novos Índices Elasticsearch

```yaml
# misp_iocs - IOCs importados do MISP
misp_iocs:
  mappings:
    ioc_type: keyword         # ip, domain, hash, url, etc
    ioc_value: keyword        # Valor do IOC
    ioc_subtype: keyword      # source, destination, md5, sha256, etc
    category: keyword         # network, file, email
    source: keyword           # "MISP"
    misp_event_id: keyword    # ID do evento MISP
    misp_attribute_id: keyword
    to_ids: boolean           # Detection flag
    first_seen: date
    last_updated: date
    tags: keyword[]
    comment: text
    confidence: keyword       # high, medium, low

# misp_events - Eventos MISP importados
misp_events:
  mappings:
    event_id: keyword
    event_uuid: keyword
    info: text                # Descrição do evento
    date: date
    threat_level: integer
    analysis: integer
    distribution: integer
    published: boolean
    tags: keyword[]
    galaxies: object[]
    imported_at: date

# misp_feed_events - Eventos de feeds MISP
misp_feed_events:
  mappings:
    event_uuid: keyword
    feed_name: keyword
    info: text
    date: date
    threat_level: integer
    tags: keyword[]
    imported_at: date
```

---

## 📅 Roadmap de Implementação

### 🚀 Phase 1: Foundation (Semana 1) - PRIORIDADE ALTA

**Objetivo**: Conectividade básica com MISP

**Tasks:**

1. **Instalar PyMISP**
   ```bash
   pip install pymisp
   echo "pymisp==2.4.180" >> requirements.txt
   ```

2. **Configuração**
   ```python
   # backend/app/core/config.py
   class Settings:
       # MISP Configuration
       MISP_URL: Optional[str] = None
       MISP_API_KEY: Optional[str] = None
       MISP_VERIFY_SSL: bool = True
       MISP_DEBUG: bool = False
   ```

3. **Core Service**
   - Criar `backend/app/cti/services/misp_service.py`
   - Implementar `__init__`, `test_connection()`, `get_status()`
   - Endpoint GET `/api/v1/cti/misp/status`

4. **Configuration UI**
   - Settings page com campos MISP URL e API Key
   - Botão "Test Connection"
   - Indicador de status (conectado/desconectado)

**Deliverables:**
- ✅ PyMISP instalado
- ✅ Configuração salva em settings
- ✅ Endpoint de status funcionando
- ✅ UI de configuração

**Estimativa**: 1-2 dias

---

### 📤 Phase 2: Export (Semana 2) - PRIORIDADE ALTA

**Objetivo**: Exportar actors e families para MISP

**Tasks:**

1. **Mapping Service**
   - Criar `backend/app/cti/services/misp_mapping_service.py`
   - Mapear schema de Actor → MISP Event
   - Mapear schema de Family → MISP Event
   - Mapear Techniques → MISP Attack Pattern

2. **Export Endpoints**
   ```python
   POST /api/v1/cti/misp/export/actor/{name}
   POST /api/v1/cti/misp/export/family/{name}
   POST /api/v1/cti/misp/export/batch
   ```

3. **Export UI**
   - Botão "Export to MISP" na página de detalhes do actor
   - Botão "Export to MISP" na página de detalhes da family
   - Dialog de batch export com filtros (país, OS, tags)

4. **Testing**
   - Exportar 10 actors de teste
   - Exportar 10 families de teste
   - Verificar no MISP web interface

**Deliverables:**
- ✅ Mapping service implementado
- ✅ Export funcionando
- ✅ UI integrada
- ✅ 20 eventos criados no MISP

**Estimativa**: 2-3 dias

---

### 📥 Phase 3: Import (Semana 3) - PRIORIDADE ALTA

**Objetivo**: Importar IOCs e eventos do MISP

**Tasks:**

1. **Elasticsearch Indices**
   ```bash
   # Criar índices
   curl -X PUT "localhost:9200/misp_iocs"
   curl -X PUT "localhost:9200/misp_events"
   ```

2. **Import Service**
   - Implementar `import_iocs()` no `misp_service.py`
   - Implementar `import_event(event_id)`
   - Implementar `search_events(query, tags, date)`

3. **Import Endpoints**
   ```python
   POST /api/v1/cti/misp/import/iocs
   POST /api/v1/cti/misp/import/event/{id}
   GET  /api/v1/cti/misp/search/events
   ```

4. **Import UI**
   - Dialog "Import IOCs from MISP"
   - Dialog "Import Event by ID"
   - Página "MISP IOC Browser"

5. **Testing**
   - Importar 100 IOCs do MISP
   - Importar 5 eventos específicos
   - Buscar e visualizar IOCs importados

**Deliverables:**
- ✅ Índices criados
- ✅ Import funcionando
- ✅ UI para browsing de IOCs
- ✅ 100+ IOCs importados

**Estimativa**: 2-3 dias

---

### 🔍 Phase 4: Enrichment (Semana 4) - PRIORIDADE MÉDIA

**Objetivo**: Enriquecer dados existentes com MISP

**Tasks:**

1. **Actor Enrichment**
   - Nova aba "MISP Activity" na página de actor
   - Endpoint GET `/api/v1/cti/actors/{name}/misp-activity`
   - Mostrar eventos MISP relacionados
   - Mostrar IOCs distribuídos por tipo
   - Timeline de atividades

2. **Components**
   - `ActorMISPActivity.tsx`
   - `MISPEventList.tsx`
   - `MISPEventDetail.tsx` (modal)
   - `IOCDistributionChart.tsx`

3. **Testing**
   - Verificar enrichment de 10 actors
   - Testar timeline
   - Testar gráficos de IOC

**Deliverables:**
- ✅ Aba MISP Activity funcionando
- ✅ Components implementados
- ✅ Enrichment visível no UI

**Estimativa**: 2-3 dias

---

### 🔄 Phase 5: Sync & Automation (Semana 5-6) - PRIORIDADE MÉDIA

**Objetivo**: Sync bidirecional e feeds automatizados

**Tasks:**

1. **Sync Service**
   - Criar `backend/app/cti/services/misp_sync_service.py`
   - Implementar `push_sync()` (local → MISP)
   - Implementar `pull_sync()` (MISP → local)
   - Implementar `resolve_conflict()`

2. **Feed Service**
   - Criar `backend/app/cti/services/misp_feed_service.py`
   - Configurar feeds públicos (CIRCL, botvrij.eu)
   - Implementar `sync_feed(feed_name)`

3. **Celery Tasks**
   ```python
   @shared_task
   def sync_misp_iocs_daily():
       """Importar IOCs diariamente"""

   @shared_task
   def sync_misp_feeds():
       """Sincronizar feeds a cada 6h"""

   @shared_task
   def push_new_actors():
       """Publicar novos actors"""
   ```

4. **Sync UI**
   - Dashboard de sync status
   - Feed manager page
   - Histórico de sync

**Deliverables:**
- ✅ Sync bidirecional funcionando
- ✅ 2+ feeds configurados
- ✅ Tasks Celery rodando
- ✅ Dashboard de sync

**Estimativa**: 3-5 dias

---

### 🎨 Phase 6: Polish & Advanced Features (Futuro) - PRIORIDADE BAIXA

**Tasks:**
- STIX 2.1 import/export completo
- Sharing groups management
- Galaxy clusters attachment
- Taxonomies e tags avançados
- Correlation engine integration
- Webhooks para notificações
- Export batch em background
- Rate limiting inteligente

**Estimativa**: 2-3 semanas

---

## 🔧 Configuração Técnica

### Dependências Python

```txt
# requirements.txt
pymisp==2.4.180
misp-stix==2.4.180
stix2==3.0.1  # Já instalado
```

### Variáveis de Ambiente

```bash
# .env
MISP_URL=https://misp.example.com
MISP_API_KEY=your_api_key_here
MISP_VERIFY_SSL=true
MISP_DEBUG=false
```

### Elasticsearch Mappings

```json
// misp_iocs mapping
{
  "mappings": {
    "properties": {
      "ioc_type": {"type": "keyword"},
      "ioc_value": {"type": "keyword"},
      "ioc_subtype": {"type": "keyword"},
      "category": {"type": "keyword"},
      "source": {"type": "keyword"},
      "misp_event_id": {"type": "keyword"},
      "misp_attribute_id": {"type": "keyword"},
      "to_ids": {"type": "boolean"},
      "first_seen": {"type": "date"},
      "last_updated": {"type": "date"},
      "tags": {"type": "keyword"},
      "comment": {"type": "text"},
      "confidence": {"type": "keyword"}
    }
  }
}
```

---

## 📊 Casos de Uso

### Caso 1: Compartilhar Intelligence com Comunidade

**Cenário**: Compartilhar 864 actors enriquecidos com MITRE ATT&CK

**Fluxo:**
1. Usuário acessa Settings → MISP Integration
2. Clica em "Export All Enriched Actors"
3. Sistema cria 864 eventos MISP
4. Publica para a comunidade (TLP:WHITE)
5. Dashboard mostra "864 actors shared"

**Valor**: Contribuir para inteligência global, ganhar reputação

---

### Caso 2: Importar IOCs de Parceiros

**Cenário**: Importar IOCs diários de instância MISP de parceiro

**Fluxo:**
1. Celery task roda diariamente às 2AM
2. Busca IOCs das últimas 24h (to_ids=True)
3. Filtra por tags (tlp:white, tlp:green)
4. Importa ~100 IOCs/dia
5. Disponibiliza no IOC Browser

**Valor**: Expandir cobertura de IOCs além do Malpedia

---

### Caso 3: Enriquecer Actor com Atividade Recente

**Cenário**: Analista quer ver atividade recente de APT28

**Fluxo:**
1. Acessa página de APT28
2. Clica na aba "MISP Activity"
3. Vê 15 eventos recentes (últimos 90 dias)
4. Visualiza 234 IOCs distribuídos por tipo
5. Analisa timeline de atividades

**Valor**: Contexto em tempo real da comunidade

---

### Caso 4: Auto-Export de IOCs de RSS

**Cenário**: Extrair IOCs de artigos RSS e compartilhar

**Fluxo:**
1. Sistema detecta novo artigo RSS sobre malware
2. Extrai IOCs (IPs, domains, hashes) via regex
3. Cria evento MISP automaticamente
4. Publica para comunidade
5. Dashboard mostra "12 IOCs shared from RSS"

**Valor**: Compartilhamento automatizado de inteligência

---

## ⚠️ Riscos e Mitigações

### Risco 1: Sobrecarga de Dados

**Problema**: Importar milhares de IOCs pode sobrecarregar ES

**Mitigação**:
- Filtrar por tags (apenas TLP:WHITE, TLP:GREEN)
- Filtrar por data (últimos 30-90 dias)
- Limitar a 1000 IOCs/dia
- Implementar deduplicação

### Risco 2: Qualidade de Dados

**Problema**: IOCs de baixa qualidade (falsos positivos)

**Mitigação**:
- Filtrar por threat_level (apenas high/medium)
- Verificar tags de confiança
- Implementar score de reputação
- Permitir blacklist de feeds

### Risco 3: Rate Limiting

**Problema**: MISP pode bloquear por excesso de requests

**Mitigação**:
- Implementar delays (0.5s entre requests)
- Batch operations (criar eventos em lote)
- Respeitar X-Rate-Limit headers
- Implementar retry com backoff

### Risco 4: Sincronização Conflitante

**Problema**: Mudanças simultâneas local e MISP

**Mitigação**:
- Estratégia last-write-wins
- Merge de listas (aliases, referências)
- Logging de conflitos
- Manual review queue

---

## 📈 Métricas de Sucesso

### KPIs Phase 1-2 (Export)

- ✅ **Connection**: MISP conectado e testado
- ✅ **Exports**: 100+ actors exportados
- ✅ **Exports**: 50+ families exportadas
- ✅ **Community**: Eventos publicados (TLP:WHITE)

### KPIs Phase 3-4 (Import & Enrichment)

- ✅ **IOCs**: 500+ IOCs importados
- ✅ **Events**: 50+ eventos importados
- ✅ **Enrichment**: 100% actors com aba MISP Activity
- ✅ **Usage**: 10+ visualizações/dia de enrichment

### KPIs Phase 5 (Sync & Automation)

- ✅ **Sync**: 2+ syncs/dia executados com sucesso
- ✅ **Feeds**: 2+ feeds configurados e ativos
- ✅ **Automation**: 95%+ uptime de tasks Celery
- ✅ **Growth**: +100 IOCs/semana importados

---

## 🎯 Quick Start (1 Dia)

Se quiser começar **hoje**, implementação mínima:

### Step 1: Instalar PyMISP (5 min)

```bash
pip install pymisp
echo "pymisp==2.4.180" >> backend/requirements.txt
```

### Step 2: Core Service (30 min)

```python
# backend/app/cti/services/misp_service.py
from pymisp import PyMISP
from app.core.config import settings

class MISPService:
    def __init__(self):
        if settings.MISP_URL and settings.MISP_API_KEY:
            self.misp = PyMISP(settings.MISP_URL, settings.MISP_API_KEY)
        else:
            self.misp = None

    def test_connection(self):
        if not self.misp:
            return {"status": "not_configured"}
        try:
            version = self.misp.get_version()
            return {"status": "ok", "version": version['version']}
        except Exception as e:
            return {"status": "error", "error": str(e)}

def get_misp_service():
    return MISPService()
```

### Step 3: API Endpoint (15 min)

```python
# backend/app/cti/api/misp.py
from fastapi import APIRouter
from app.cti.services.misp_service import get_misp_service

router = APIRouter(prefix="/misp", tags=["CTI - MISP"])

@router.get("/status")
def get_misp_status():
    """Test MISP connection"""
    service = get_misp_service()
    return service.test_connection()

# Register in main.py
from app.cti.api import misp
app.include_router(misp.router, prefix="/api/v1/cti")
```

### Step 4: Testar (5 min)

```bash
# Restart backend
docker restart intelligence-platform-backend

# Test endpoint
curl http://localhost:8001/api/v1/cti/misp/status
```

**Total**: ~1 hora para ter conexão básica funcionando!

---

## 📚 Referências

### Documentação Oficial

- **MISP Project**: https://www.misp-project.org/
- **MISP API Docs**: https://www.misp-project.org/openapi/
- **PyMISP**: https://github.com/MISP/PyMISP
- **MISP Training**: https://www.circl.lu/services/misp-training-materials/

### Recursos Adicionais

- **MISP Galaxy**: https://github.com/MISP/misp-galaxy
- **MISP Taxonomies**: https://github.com/MISP/misp-taxonomies
- **STIX 2.1 Spec**: https://docs.oasis-open.org/cti/stix/v2.1/
- **Public MISP Feeds**: https://www.misp-project.org/feeds/

### Community

- **MISP Gitter**: https://gitter.im/MISP/MISP
- **MISP Mailing List**: https://lists.misp-project.org/
- **MISP GitHub**: https://github.com/MISP/MISP

---

## ✅ Próximos Passos

### Imediato (Esta Semana)

1. ✅ **Decidir**: Aprovar este plano de implementação
2. ⏳ **Preparar**: Obter credenciais de instância MISP de teste
   - Opção 1: MISP Cloud (https://www.misp-project.org/misp-cloud/)
   - Opção 2: Docker local (https://github.com/MISP/misp-docker)
   - Opção 3: Instância de parceiro
3. ⏳ **Implementar**: Phase 1 (Foundation) - 1-2 dias
4. ⏳ **Testar**: Conexão e status endpoint

### Próxima Semana

1. ⏳ **Implementar**: Phase 2 (Export) - 2-3 dias
2. ⏳ **Testar**: Exportar 10 actors de teste
3. ⏳ **Validar**: Verificar eventos no MISP web interface

### Mês 1

1. ⏳ Completar Phases 1-4
2. ⏳ 100+ actors exportados
3. ⏳ 500+ IOCs importados
4. ⏳ Enrichment funcionando

---

**Documentado com ❤️ para ADINT**

**Autor**: Angello Cassio + Claude Code
**Data**: 2025-11-20
**Versão**: 1.0
