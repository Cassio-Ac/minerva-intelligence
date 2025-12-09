# MISP Feed Synchronization Schedule

**Status**: Implementado e ativo
**Ultima atualizacao**: 2025-12-09

---

## Frequencias Configuradas

### MISP Feeds (Principal)
- **Frequencia**: 12x por dia (a cada 2 horas)
- **Horarios**: 00:00, 02:00, 04:00, 06:00, 08:00, 10:00, 12:00, 14:00, 16:00, 18:00, 20:00, 22:00
- **Timezone**: America/Sao_Paulo (UTC-3)
- **Razao**: Feeds MISP sao atualizados frequentemente com novas ameacas e IOCs

### OTX Pulses
- **Frequencia**: 2x por dia
- **Horarios**: 09:00, 21:00 (Brazil time)

### RSS Feeds
- **Frequencia**: 12x por dia (a cada 2 horas)
- **Horarios**: 00:00, 02:00, ... (mesmo schedule do MISP)

### Malpedia Enrichment
- **Frequencia**: 1x por dia
- **Horario**: 02:00 (Brazil time)

### CaveiraTech Crawler
- **Frequencia**: 2x por dia
- **Horarios**: 10:00, 22:00 (Brazil time)

---

## Estatisticas Atuais (2025-12-09)

### Total de IOCs Importados: **49.516**

| Feed | Tipo | IOCs | Status |
|------|------|------|--------|
| CIRCL OSINT Feed | MISP Events | 10,768 | Ativo |
| Botvrij.eu | MISP Events | 6,764 | Ativo |
| SERPRO Blocklist (BR Gov) | IP | 5,033 | Ativo |
| GreenSnow Blocklist | IP | 5,000 | Ativo |
| CINS Score Bad Guys | IP | 5,000 | Ativo |
| URLhaus | URL | 5,000 | Ativo |
| blocklist.de All Lists | IP | 5,000 | Ativo |
| ThreatFox | Mixed | 4,735 | Ativo |
| DiamondFox C2 (Unit42) | URL | 889 | Ativo |
| AlienVault IP Reputation | IP | 609 | Ativo |
| ProofPoint Emerging Threats | IP | 418 | Ativo |
| OpenPhish | URL | 300 | Ativo |
| Bambenek DGA | Domain | 0 | Bloqueado (403) |
| abuse.ch SSL Blacklist | Hash | 0 | Sem dados novos |
| DigitalSide Threat-Intel | MISP | 0 | Sem dados novos |

---

## Arquitetura da Sincronizacao

### Tasks Celery Disponiveis

**Localizacao**: `app/tasks/misp_tasks.py`

| Task | Descricao | Uso |
|------|-----------|-----|
| `sync_all_misp_feeds` | Sync completo (5000 IOCs/feed) | Agendado a cada 2h |
| `quick_sync_all_feeds` | Sync rapido (500-1000 IOCs/feed) | Manual para populacao inicial |
| `sync_single_feed` | Sync de feed especifico | Manual |

### Processo de Sincronizacao

1. Itera sobre TODOS os 16 feeds disponiveis em `MISPFeedService.FEEDS`
2. Pula feeds que requerem autenticacao (OTX - tratado separadamente)
3. Para cada feed:
   - Verifica se existe no banco, cria se necessario
   - Baixa IOCs do feed externo
   - Faz upsert na tabela `misp_iocs` (evita duplicados por valor)
   - Atualiza estatisticas
4. Log de resumo com estatisticas

---

## Configuracao Celery Beat

**Arquivo**: `app/celery_app.py`

```python
beat_schedule={
    # MISP feeds sync - every 2 hours
    "sync-misp-feeds": {
        "task": "app.tasks.misp_tasks.sync_all_misp_feeds",
        "schedule": crontab(minute=0, hour="*/2"),  # Every 2 hours
    },

    # OTX pulse sync - 2x per day
    "sync-otx-pulses": {
        "task": "app.tasks.otx_tasks.sync_otx_pulses",
        "schedule": crontab(minute=0, hour="9,21"),
    },

    # RSS collection - every 2 hours
    "collect-rss-feeds": {
        "task": "app.tasks.rss_tasks.collect_all_rss_feeds",
        "schedule": crontab(minute=0, hour="*/2"),
    },
}
```

---

## Uso Manual

### Via API

```bash
# Sincronizar todos os feeds (quick sync)
curl -X POST "http://localhost:8002/api/v1/cti/misp/feeds/sync-all?quick=true" \
  -H "Authorization: Bearer $TOKEN"

# Sincronizar todos os feeds (full sync)
curl -X POST "http://localhost:8002/api/v1/cti/misp/feeds/sync-all?quick=false" \
  -H "Authorization: Bearer $TOKEN"

# Verificar status do agendamento
curl "http://localhost:8002/api/v1/cti/misp/feeds/sync-status" \
  -H "Authorization: Bearer $TOKEN"

# Estatisticas de IOCs
curl "http://localhost:8002/api/v1/cti/misp/iocs/stats" \
  -H "Authorization: Bearer $TOKEN"
```

### Via Celery CLI

```bash
cd /var/www/minerva/backend
source venv/bin/activate

# Quick sync (mais rapido)
celery -A app.celery_app call app.tasks.misp_tasks.quick_sync_all_feeds

# Full sync (mais IOCs)
celery -A app.celery_app call app.tasks.misp_tasks.sync_all_misp_feeds

# Sync de feed especifico
celery -A app.celery_app call app.tasks.misp_tasks.sync_single_feed \
  --args='["urlhaus", 1000]'
```

---

## Monitoramento

### Logs do Celery

```bash
# Ver logs em tempo real
sudo journalctl -u minerva-celery -f

# Filtrar por MISP
sudo journalctl -u minerva-celery | grep -i misp

# Ver ultimas 100 linhas
sudo journalctl -u minerva-celery -n 100 --no-pager
```

### Database Queries

```sql
-- Contagem total de IOCs
SELECT COUNT(*) as total_iocs FROM misp_iocs;

-- IOCs por feed
SELECT f.name, f.feed_type, COUNT(i.id) as ioc_count
FROM misp_feeds f
LEFT JOIN misp_iocs i ON f.id = i.feed_id
GROUP BY f.id, f.name, f.feed_type
ORDER BY ioc_count DESC;

-- IOCs das ultimas 24h
SELECT COUNT(*) as total,
       DATE_TRUNC('hour', created_at) as hour
FROM misp_iocs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY hour
ORDER BY hour DESC;

-- IOCs por tipo
SELECT ioc_type, COUNT(*) as count
FROM misp_iocs
GROUP BY ioc_type
ORDER BY count DESC;
```

### Verificar Services

```bash
# Status dos servicos
sudo systemctl status minerva-backend
sudo systemctl status minerva-celery
sudo systemctl status minerva-celery-beat

# Redis (broker)
redis-cli ping
```

---

## Feeds Disponiveis

### Tier 1 - Principais (Alta Qualidade)

| ID | Nome | Tipo | URL |
|----|------|------|-----|
| circl_osint | CIRCL OSINT Feed | MISP | https://www.circl.lu/doc/misp/feed-osint |
| urlhaus | URLhaus | URL | https://urlhaus.abuse.ch/downloads/csv/ |
| threatfox | ThreatFox | Mixed | https://threatfox.abuse.ch/export/csv/recent |
| openphish | OpenPhish | URL | https://openphish.com/feed.txt |

### Tier 2 - Complementares

| ID | Nome | Tipo | URL |
|----|------|------|-----|
| serpro | SERPRO Blocklist (BR Gov) | IP | https://blocklist.serpro.gov.br |
| emerging_threats | ProofPoint Emerging Threats | IP | https://rules.emergingthreats.net |
| alienvault_reputation | AlienVault IP Reputation | IP | https://reputation.alienvault.com |
| sslbl | abuse.ch SSL Blacklist | Hash | https://sslbl.abuse.ch |
| botvrij | Botvrij.eu | MISP | https://www.botvrij.eu |
| digitalside | DigitalSide Threat-Intel | MISP | https://osint.digitalside.it |

### Tier 3 - Adicionais

| ID | Nome | Tipo | URL |
|----|------|------|-----|
| blocklist_de | blocklist.de All Lists | IP | https://lists.blocklist.de |
| greensnow | GreenSnow Blocklist | IP | https://blocklist.greensnow.co |
| diamondfox_c2 | DiamondFox C2 (Unit42) | URL | https://github.com/pan-unit42/iocs |
| cins_badguys | CINS Score Bad Guys | IP | https://cinsscore.com |
| bambenek_dga | Bambenek DGA Feed | Domain | https://osint.bambenekconsulting.com |

---

## Troubleshooting

### Sync nao esta rodando

```bash
# Verificar se Celery Beat esta ativo
sudo systemctl status minerva-celery-beat

# Reiniciar se necessario
sudo systemctl restart minerva-celery-beat
```

### Erro de conexao Redis

```bash
# Verificar Redis
redis-cli ping

# Deve retornar: PONG
```

### Feed especifico falhando

Verificar logs:
```bash
sudo journalctl -u minerva-celery | grep "Error syncing"
```

Problemas comuns:
- **403 Forbidden**: Feed bloqueou IP (ex: Bambenek)
- **Timeout**: Rede lenta, aumentar timeout
- **Parse error**: Formato do feed mudou

### Performance lenta

- Ajustar `worker_concurrency` em celery_app.py
- Verificar uso de memoria/CPU
- Considerar processar feeds em paralelo

---

## Arquivos Relacionados

- `backend/app/celery_app.py` - Configuracao do Celery e schedules
- `backend/app/tasks/misp_tasks.py` - Tasks de sincronizacao MISP
- `backend/app/cti/services/misp_feed_service.py` - Servico com FEEDS dict e fetch methods
- `backend/app/cti/api/misp_feeds.py` - Endpoints da API
- `backend/app/cti/models/misp_feed.py` - Modelo MISPFeed
- `backend/app/cti/models/misp_ioc.py` - Modelo MISPIOC

---

**Mantido por**: Minerva Intelligence Platform Team
