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

| Serviço | Porta Externa | Porta Interna (Container) | URL de Acesso | Modo |
|---------|---------------|---------------------------|---------------|------|
| **Backend API** | **8001** | 8000 | `http://localhost:8001` | Docker |
| **Frontend (Docker)** | **5174** | 5173 | `http://localhost:5174` | Docker |
| **Frontend (Dev)** | **5180** | - | `http://localhost:5180` | Native/Dev |
| **PostgreSQL** | **5433** | 5432 | `localhost:5433` | Docker |
| **Redis** | **6380** | 6379 | `localhost:6380` | Docker |
| **Elasticsearch** | **9200** | 9200 | `http://localhost:9200` | Docker |

### 🎯 Dois Modos de Executar o Frontend

#### Modo 1️⃣: Docker (Porta 5174) - Produção-like
- **Quando usar**: Testar versão containerizada, CI/CD, ambiente completo
- **Como iniciar**: `docker-compose up` ou `docker-compose up frontend`
- **Características**:
  - ✅ Ambiente isolado e reproduzível
  - ✅ Versão "produção-like"
  - ❌ Sem hot reload automático (precisa rebuild)
  - ❌ Debugging mais complexo

#### Modo 2️⃣: Dev Nativo (Porta 5180) - Desenvolvimento
- **Quando usar**: Desenvolvimento ativo, debugging, iteração rápida
- **Como iniciar**:
  ```bash
  cd frontend
  npm run dev
  # ou
  npm run dev -- --port 5180 --host 0.0.0.0
  ```
- **Características**:
  - ✅ Hot reload automático (HMR)
  - ✅ Debugging mais fácil
  - ✅ Source maps funcionam melhor
  - ✅ Mais rápido para desenvolver
  - ⚠️ Requer Node.js instalado localmente

**💡 Recomendação**: Use modo Dev (5180) para desenvolvimento e Docker (5174) para testar integração completa.

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

### 2. Verificar processos nativos (dev mode)
```bash
# Ver todas as portas frontend
lsof -i :5174 -i :5180 -i :5173 | grep LISTEN

# Ver apenas processo dev (porta 5180)
lsof -i :5180
```

**Output esperado (se dev mode ativo)**:
```
COMMAND   PID          USER   FD   TYPE  DEVICE  SIZE/OFF NODE NAME
node      51308 angellocassio   13u  IPv4  ...     0t0  TCP *:5180 (LISTEN)
```

### 3. Testar backend
```bash
curl http://localhost:8001/health
```

### 4. Testar frontend Docker
```bash
curl http://localhost:5174/
```

### 5. Testar frontend Dev
```bash
curl http://localhost:5180/
```

---

## 🚀 Comandos Úteis para Gerenciar os Modos

### Iniciar Todo o Stack (Docker)
```bash
# Iniciar todos os serviços
docker-compose up -d

# Iniciar apenas backend e infraestrutura (sem frontend Docker)
docker-compose up -d backend postgres redis
```

### Iniciar Frontend em Modo Dev (Nativo)
```bash
cd frontend
npm install  # primeira vez apenas
npm run dev

# Ou especificar porta manualmente
npm run dev -- --port 5180 --host 0.0.0.0
```

### Parar Processos

**Docker**:
```bash
# Parar todos os containers
docker-compose down

# Parar apenas frontend Docker
docker-compose stop frontend
```

**Dev Nativo**:
```bash
# Encontrar PID do processo dev
lsof -ti :5180

# Matar processo dev
kill $(lsof -ti :5180)

# Ou usar Ctrl+C no terminal onde está rodando
```

### Workflow Recomendado para Desenvolvimento

**Setup Inicial** (uma vez):
```bash
# 1. Subir infraestrutura (backend, DB, Redis)
docker-compose up -d backend postgres redis

# 2. Iniciar frontend em modo dev
cd frontend
npm run dev
```

**Resultado**:
- ✅ Backend rodando em: `http://localhost:8001` (Docker)
- ✅ Frontend rodando em: `http://localhost:5180` (Dev mode com hot reload)
- ✅ PostgreSQL em: `localhost:5433` (Docker)
- ✅ Redis em: `localhost:6380` (Docker)

**Vantagens**:
- 🚀 Hot reload no frontend (mudanças instantâneas)
- 🔒 Backend isolado e estável
- 💾 Dados persistentes no PostgreSQL/Redis
- 🐛 Debugging fácil no frontend

---

## 🚨 Checklist ao Criar Documentação ou Código

Antes de criar qualquer documentação, exemplo ou código que faça requisições HTTP:

- [ ] Verificou se está usando porta **8001** para backend? (não 8000!)
- [ ] Verificou se está usando porta **5174** (Docker) ou **5180** (Dev) para frontend? (não 5173!)
- [ ] Especificou qual modo de frontend está usando? (Docker vs Dev)
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
