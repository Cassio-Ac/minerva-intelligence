# 🔌 Ports Reference - Intelligence Platform

**Data**: 2025-11-19

---

## ⚠️ IMPORTANTE: Configuração de Portas

Este projeto **NÃO UTILIZA AS PORTAS PADRÃO** para evitar conflitos com o **Dashboard AI v2** que roda simultaneamente na mesma máquina.

### 🚫 NUNCA use estas portas na documentação ou código:
- ❌ `8000` (Backend padrão - CONFLITO!)
- ❌ `5173` (Frontend padrão - CONFLITO!)
- ❌ `5432` (PostgreSQL padrão - CONFLITO!)
- ❌ `6379` (Redis padrão - CONFLITO!)

---

## ✅ Portas Corretas do Intelligence Platform

### Portas Externas (acesso do host/navegador)

| Serviço | Porta Externa | Porta Interna (Container) | URL de Acesso |
|---------|---------------|---------------------------|---------------|
| **Backend API** | **8001** | 8000 | `http://localhost:8001` |
| **Frontend** | **5174** | 5173 | `http://localhost:5174` |
| **PostgreSQL** | **5433** | 5432 | `localhost:5433` |
| **Redis** | **6380** | 6379 | `localhost:6380` |
| **Elasticsearch** | **9200** | 9200 | `http://localhost:9200` |

---

## 📝 Configuração em Diferentes Arquivos

### 1. Docker Compose (`docker-compose.yml`)

```yaml
services:
  backend:
    ports:
      - "8001:8000"  # PORTA EXTERNA:INTERNA

  frontend:
    ports:
      - "5174:5173"

  postgres:
    ports:
      - "5433:5432"

  redis:
    ports:
      - "6380:6379"
```

### 2. Frontend (`frontend/src/services/api.ts`)

```typescript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001';
//                                                                  ^^^^
//                                                         SEMPRE 8001!
```

### 3. Frontend Environment (`.env` ou `vite.config.ts`)

```bash
VITE_API_URL=http://localhost:8001
```

### 4. Documentação e Exemplos

**Swagger UI**: `http://localhost:8001/docs`

**Exemplos de curl**:
```bash
# Login
curl -X POST 'http://localhost:8001/api/v1/auth/login' \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"admin"}'

# Health check
curl 'http://localhost:8001/health'
```

**Testes Python**:
```python
BASE_URL = "http://localhost:8001"
```

---

## 🔍 Como Verificar as Portas

### 1. Verificar containers rodando
```bash
docker ps --filter "name=intelligence-platform" \
  --format "table {{.Names}}\t{{.Ports}}"
```

**Output esperado**:
```
NAMES                                 PORTS
intelligence-platform-backend         0.0.0.0:8001->8000/tcp
intelligence-platform-frontend        0.0.0.0:5174->5173/tcp
intelligence-platform-postgres        0.0.0.0:5433->5432/tcp
intelligence-platform-redis           0.0.0.0:6380->6379/tcp
```

### 2. Testar backend
```bash
curl http://localhost:8001/health
```

### 3. Testar frontend
```bash
curl http://localhost:5174/
```

---

## 🚨 Checklist ao Criar Documentação ou Código

Antes de criar qualquer documentação, exemplo ou código que faça requisições HTTP:

- [ ] Verificou se está usando porta **8001** para backend? (não 8000!)
- [ ] Verificou se está usando porta **5174** para frontend? (não 5173!)
- [ ] Verificou se está usando porta **5433** para PostgreSQL? (não 5432!)
- [ ] Verificou se está usando porta **6380** para Redis? (não 6379!)
- [ ] Leu este arquivo `PORTS_REFERENCE.md` antes de documentar?

---

## 📚 Arquivos que Devem Referenciar as Portas Corretas

### Backend
- ✅ `docker-compose.yml` - Mapeamento de portas
- ✅ `backend/app/main.py` - Logs informativos (pode mencionar porta interna 8000 no log)
- ✅ Qualquer documentação em `backend/README.md`

### Frontend
- ✅ `frontend/src/services/api.ts` - **CRÍTICO!**
- ✅ `frontend/src/services/*.ts` - Todos os services
- ✅ `frontend/.env.example` ou `.env`
- ✅ `frontend/vite.config.ts`

### Documentação
- ✅ `README.md` - Instruções principais
- ✅ `docs/*.md` - Toda documentação técnica
- ✅ Qualquer arquivo `*_PROGRESS.md`, `*_GUIDE.md`, etc.
- ✅ Exemplos de curl, scripts de teste, etc.

---

## 🛠️ Troubleshooting

### Problema: "Failed to load user: NetworkError"
**Causa**: Frontend tentando acessar porta errada (8000 ao invés de 8001)

**Solução**:
1. Verificar `frontend/src/services/api.ts`
2. Garantir que usa `http://localhost:8001`
3. Verificar se backend está rodando: `curl http://localhost:8001/health`

### Problema: "Connection refused" ou "ECONNREFUSED"
**Causa**: Porta errada ou backend não iniciado

**Solução**:
1. Verificar containers: `docker ps | grep intelligence-platform`
2. Verificar logs: `docker logs intelligence-platform-backend`
3. Verificar porta correta: deve ser **8001** para backend

### Problema: Import Error no backend
**Causa**: Código importando funções/classes que não existem

**Solução**:
1. Seguir padrões existentes (ex: `ESClientFactory` para ES clients)
2. Verificar imports em outros arquivos similares
3. Testar backend: `docker restart intelligence-platform-backend && docker logs -f intelligence-platform-backend`

---

## 📋 Histórico de Problemas Relacionados

### 2025-11-19: CTI Module Import Error
- **Problema**: Backend falhando ao iniciar, login impossível
- **Causa**: `malpedia_service.py` importando `get_elasticsearch_client` (não existe)
- **Solução**: Usar `ESClientFactory.get_client(server_id)` como outros services
- **Commit**: `4fce71d - fix: correct Elasticsearch client import in CTI module`

### 2025-11-19: Documentação com porta errada
- **Problema**: `CTI_MODULE_PROGRESS.md` referenciando porta 8000
- **Causa**: Cópia de exemplos de outro projeto
- **Solução**: Atualizar todas as referências para porta 8001
- **Commit**: `4fce71d - fix: update port references`

---

## 🎯 Regra de Ouro

> **Quando em dúvida sobre qual porta usar, SEMPRE consulte este arquivo `PORTS_REFERENCE.md` primeiro!**

Se você está criando documentação, código ou exemplos e não tem certeza da porta:
1. ❌ **NÃO** assuma que é a porta padrão (8000, 5173, etc)
2. ✅ **SEMPRE** consulte este arquivo
3. ✅ **VERIFIQUE** o `docker-compose.yml` se ainda tiver dúvida

---

**Mantido por**: ADINT Team
**Última atualização**: 2025-11-19
