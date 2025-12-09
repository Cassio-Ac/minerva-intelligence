# Quick Reference - Minerva Intelligence Platform

## URLs de Producao

```
Frontend:  https://kaermohen.tailf4266d.ts.net
Backend:   https://kaermohen.tailf4266d.ts.net (proxy via nginx)
API:       https://kaermohen.tailf4266d.ts.net/api/v1/
API Docs:  https://kaermohen.tailf4266d.ts.net/docs

Local (debug):
Backend:   http://localhost:8002
```

## Portas do Sistema

| Servico | Porta | Status |
|---------|-------|--------|
| Backend (FastAPI) | 8002 | Ativo |
| PostgreSQL | 5432 | Ativo |
| Elasticsearch | 9200 (SSL) | Ativo |
| Redis | 6379 | Ativo |

## Servicos Systemd

```bash
# Ver status
sudo systemctl status minerva-backend
sudo systemctl status minerva-celery
sudo systemctl status minerva-celery-beat

# Reiniciar
sudo systemctl restart minerva-backend
sudo systemctl restart minerva-celery
sudo systemctl restart minerva-celery-beat

# Logs
sudo journalctl -u minerva-backend -f
sudo journalctl -u minerva-celery -f
```

## Comandos Uteis

### MISP Sync Manual

```bash
cd /var/www/minerva/backend
source venv/bin/activate

# Quick sync (mais rapido, 500-1000 IOCs/feed)
celery -A app.celery_app call app.tasks.misp_tasks.quick_sync_all_feeds

# Full sync (5000 IOCs/feed)
celery -A app.celery_app call app.tasks.misp_tasks.sync_all_misp_feeds
```

### Database Queries

```bash
# Conectar ao PostgreSQL
sudo -u postgres psql -d minerva_db

# Contar IOCs
SELECT COUNT(*) FROM misp_iocs;

# IOCs por feed
SELECT f.name, COUNT(i.id) as count
FROM misp_feeds f
LEFT JOIN misp_iocs i ON f.id = i.feed_id
GROUP BY f.name ORDER BY count DESC;
```

### Redis

```bash
redis-cli ping   # Deve retornar PONG
redis-cli info   # Estatisticas
```

## Schedule Automatico (Celery Beat)

| Task | Frequencia | Horarios |
|------|------------|----------|
| MISP Feeds | A cada 2h | 00:00, 02:00, 04:00... |
| RSS Feeds | A cada 2h | 00:00, 02:00, 04:00... |
| OTX Pulses | 2x/dia | 09:00, 21:00 |
| Malpedia | 1x/dia | 02:00 |
| CaveiraTech | 2x/dia | 10:00, 22:00 |

## Estatisticas Atuais

- **IOCs MISP**: ~50,000
- **Feeds Ativos**: 12 de 16
- **Sync**: A cada 2 horas

## Arquivos Importantes

```
/var/www/minerva/backend/          # Backend producao
/var/www/minerva/frontend/         # Frontend build
/var/www/minerva/backend/.env      # Config (NAO commitar)
/etc/systemd/system/minerva-*.service  # Systemd units
/etc/nginx/sites-enabled/minerva   # Nginx config
```

## Troubleshooting

### Backend nao inicia

```bash
sudo journalctl -u minerva-backend -n 50 --no-pager
```

### Celery nao processa tasks

```bash
# Verificar Redis
redis-cli ping

# Ver logs
sudo journalctl -u minerva-celery -n 50 --no-pager
```

### IOCs nao importando

```bash
# Ver erro especifico
sudo journalctl -u minerva-celery | grep "Error"

# Rodar sync manual
celery -A app.celery_app call app.tasks.misp_tasks.quick_sync_all_feeds
```

---

**Documentacao completa**: Ver `backend/MISP_SYNC_SCHEDULE.md`
