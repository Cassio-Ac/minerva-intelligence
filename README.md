# 🧠 Minerva - Intelligence Platform v1.0

**Plataforma Completa de Análise de Inteligência Multi-Fontes**

[![GitHub](https://img.shields.io/badge/GitHub-Cassio--Ac%2Fminerva--intelligence-blue?logo=github)](https://github.com/Cassio-Ac/minerva-intelligence)
[![Python](https://img.shields.io/badge/Python-3.11+-blue?logo=python)](https://www.python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104+-green?logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18+-blue?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5+-blue?logo=typescript)](https://www.typescriptlang.org)

> Versão 1.0 - Intelligence Platform focada em correlação multi-fonte, análise temporal e extração de insights estratégicos

---

## 📋 Índice

- [Sobre o Projeto](#-sobre-o-projeto)
- [Módulos Disponíveis](#-módulos-disponíveis)
- [Quick Start](#-quick-start)
- [Arquitetura](#-arquitetura)
- [Documentação](#-documentação)
- [Desenvolvimento](#-desenvolvimento)
- [Status do Projeto](#-status-do-projeto)

---

## 🎯 Sobre o Projeto

**Minerva** é uma plataforma completa para análise de inteligência baseada em múltiplas fontes de dados. Diferente de um agregador de KPIs, este projeto foca em:

- 🔗 **Correlação de dados** entre diferentes fontes
- 📊 **Análise temporal** de eventos e tendências
- 🧠 **Extração de insights** estratégicos via LLM
- 🔍 **Busca semântica** em grandes volumes de dados
- 💬 **Chat RAG** para consultas em linguagem natural

### ✨ Principais Features

- **LLM Multi-Provider**: Suporte a Anthropic Claude, OpenAI, Databricks
- **Chat RAG**: Interface conversacional com contexto de documentos
- **Elasticsearch Integration**: Busca e análise de texto completo
- **SSO Integration**: Autenticação via Microsoft Entra ID (Azure AD)
- **MCP System**: Model Context Protocol para extensibilidade
- **Role-based Access**: Controle granular (Admin, Power User, Operator, Reader)
- **Timeline Analysis**: Visualização temporal de eventos
- **Knowledge Base**: Sistema de documentos e chunks para RAG

---

## 📦 Módulos Disponíveis

### ✅ Módulos 100% Funcionais

| Módulo | Status | Descrição | Documentação |
|--------|--------|-----------|--------------|
| 📡 **RSS Intelligence** | ✅ Operacional | 800+ artigos, 38 fontes, chat RAG | [docs/RESUMO_RSS_INTELLIGENCE.md](docs/RESUMO_RSS_INTELLIGENCE.md) |
| 💬 **Telegram Intelligence** | ✅ Operacional | 150+ grupos, busca, contexto, análise | [docs/TELEGRAM_INTELLIGENCE_FIXES.md](docs/TELEGRAM_INTELLIGENCE_FIXES.md) |
| 🔒 **CVE Intelligence** | ✅ Operacional | Tracking de vulnerabilidades CVE | Página: `/cve` |
| 🚨 **Data Breaches** | ✅ Operacional | Análise de vazamentos de dados | Página: `/breaches` |
| 🔌 **MCP System** | ✅ Operacional | Model Context Protocol | [docs/CONFIGURE_MCP.md](docs/CONFIGURE_MCP.md) |
| 📚 **Knowledge Base** | ✅ Operacional | Documentos + chunks para RAG | API: `/api/v1/knowledge` |
| 🔐 **Auth & SSO** | ✅ Operacional | Login local + Microsoft Entra ID | [docs/MIGRATION_GUIDE.md](docs/MIGRATION_GUIDE.md) |

### 🏗️ Módulos Legacy (Dashboard AI v2)

| Módulo | Status | Nota |
|--------|--------|------|
| Elasticsearch Servers | ⚠️ Herdado | Interface de gestão ES |
| LLM Providers | ⚠️ Herdado | Gestão de providers LLM |
| User Management | ⚠️ Herdado | CRUD de usuários |

---

## 🚀 Quick Start

### Pré-requisitos

- Docker & Docker Compose
- Node.js 18+ (para desenvolvimento)
- Python 3.11+ (para desenvolvimento)

### Instalação com Docker (Recomendado)

```bash
# Clone o repositório
git clone https://github.com/Cassio-Ac/minerva-intelligence.git
cd minerva-intelligence

# Inicie todos os serviços
docker-compose up -d

# Aguarde ~30 segundos para inicialização completa
```

**URLs de Acesso:**
- Frontend: http://localhost:5180
- Backend API: http://localhost:8001
- API Docs: http://localhost:8001/docs

**Credenciais Padrão:**
- Username: `admin`
- Password: `admin123`

### Instalação Nativa (macOS)

Para desenvolvimento sem Docker:

```bash
# Execute o script de setup
./setup-native.sh

# Inicie os serviços
./start-dev.sh

# Para parar
./stop-dev.sh
```

📖 **Guia completo**: [docs/NATIVE_MAC_SETUP.md](docs/NATIVE_MAC_SETUP.md)

---

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────────────────┐
│                   Frontend (React)                      │
│  - TypeScript, Vite, Zustand, TailwindCSS             │
│  - Páginas: /telegram, /rss, /cve, /breaches          │
└────────────────────┬────────────────────────────────────┘
                     │ HTTP/WebSocket
┌────────────────────┴────────────────────────────────────┐
│                 Backend (FastAPI)                       │
│  - Python 3.11+, Async/Await, Pydantic                │
│  - APIs: /api/v1/telegram, /rss, /cve, /breaches      │
└──┬─────────┬─────────┬──────────┬──────────────────────┘
   │         │         │          │
   ▼         ▼         ▼          ▼
PostgreSQL  Redis  Elasticsearch  LLM APIs
(Metadata) (Cache)  (Full-text)  (Claude/OpenAI)
```

### Stack Tecnológico

**Frontend:**
- React 18 + TypeScript 5
- Vite (build tool)
- Zustand (state management)
- TailwindCSS (styling)
- Recharts (visualização)

**Backend:**
- FastAPI 0.104+
- SQLAlchemy 2.0 (ORM)
- Alembic (migrations)
- Elasticsearch 8.x
- Redis (cache)
- Celery (tasks)

**Database:**
- PostgreSQL 16 (metadata)
- Elasticsearch 8.x (full-text search)
- Redis 7 (cache, sessions)

**LLM:**
- Anthropic Claude (Sonnet 4.5)
- OpenAI (GPT-4)
- Databricks (custom models)

---

## 📖 Documentação

### 🚀 Começando

- [⚡ Quick Start](docs/QUICK_START.md)
- [🏗️ Architecture](docs/ARCHITECTURE.md)
- [💻 Development Guide](docs/DEVELOPMENT.md)

### 📘 Módulos e Features

- [📡 RSS Intelligence - Resumo Completo](docs/RESUMO_RSS_INTELLIGENCE.md)
- [💬 Telegram Intelligence - Fixes & Features](docs/TELEGRAM_INTELLIGENCE_FIXES.md)
- [🔌 MCP System Overview](docs/MCP_SYSTEM.md)
- [🔌 Configurar MCP](docs/CONFIGURE_MCP.md)
- [🔍 GVULN MCP Integration](docs/GVULN_MCP_INTEGRATION.md)
- [📚 Knowledge Base System](docs/KNOWLEDGE_BASE_SYSTEM.md)
- [🔗 Knowledge Integration Complete](docs/KNOWLEDGE_INTEGRATION_COMPLETE.md)

### 🔧 Guias Técnicos

- [🚀 Native macOS Setup](docs/NATIVE_MAC_SETUP.md)
- [🔄 Migration Guide](docs/MIGRATION_GUIDE.md)
- [🔨 Pipelines & Rotinas](docs/PIPELINES_README.md)
- [📦 MCP RSS Server](docs/MCP_RSS_README.md)
- [🔁 Rotinas de Manutenção](docs/ROTINAS.md)
- [🔧 Technical Details](docs/TECHNICAL_DETAILS.md)

### 📊 Planejamento e Status

- [📊 Project Status](docs/PROJECT_STATUS.md)
- [🗺️ Roadmap](docs/ROADMAP.md)
- [♻️ Refactoring Plan](docs/REFACTORING_PLAN.md)
- [📚 Lessons Learned](docs/LESSONS_LEARNED.md)
- [📝 Changelog](docs/CHANGELOG.md)

### 📤 Git & Deploy

- [📤 Git Push Instructions](docs/GIT_PUSH_INSTRUCTIONS.md)
- [📝 Session Summary 2025-11-18](docs/SESSION_SUMMARY_2025-11-18.md)

---

## 💻 Desenvolvimento

### Estrutura do Projeto

```
intelligence-platform/
├── backend/              # FastAPI backend
│   ├── alembic/         # Database migrations
│   ├── app/
│   │   ├── api/v1/      # API endpoints
│   │   ├── models/      # SQLAlchemy models
│   │   ├── schemas/     # Pydantic schemas
│   │   └── services/    # Business logic
│   ├── mcp/             # MCP servers
│   └── tasks/           # Celery tasks
├── frontend/            # React frontend
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── pages/       # Page components
│   │   ├── services/    # API clients
│   │   └── stores/      # Zustand stores
│   └── public/          # Static assets
├── docs/                # Documentation
└── docker-compose.yml   # Docker orchestration
```

### Comandos Úteis

```bash
# Backend (desenvolvimento)
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001

# Frontend (desenvolvimento)
cd frontend
npm install
npm run dev

# Database migrations
cd backend
alembic upgrade head
alembic revision --autogenerate -m "description"

# Testes
pytest backend/tests/
npm test --prefix frontend
```

### Executando com Dashboard AI v2 Simultaneamente

Se você também tem o **Dashboard AI v2** rodando:

**Portas Intelligence Platform:**
- Backend: `8001` (Dashboard AI usa 8000)
- PostgreSQL: `5433` (Dashboard AI usa 5432)
- Redis: `6380` (Dashboard AI usa 6379)
- Frontend: `5180` (Dashboard AI usa 5173)

Ambos podem rodar simultaneamente sem conflitos.

---

## 📊 Status do Projeto

### ✅ Funcionalidades Completas

- [x] Sistema de autenticação (local + SSO)
- [x] Gestão de usuários e permissões
- [x] RSS Intelligence (800+ artigos)
- [x] Telegram Intelligence (150+ grupos)
- [x] CVE Intelligence
- [x] Data Breaches Analysis
- [x] Chat RAG com LLM
- [x] Knowledge Base System
- [x] MCP Integration
- [x] Elasticsearch multi-index

### 🚧 Em Desenvolvimento

- [ ] Testes unitários completos
- [ ] CI/CD pipeline
- [ ] Monitoring & Observability
- [ ] API rate limiting
- [ ] Backup automático

### 📈 Estatísticas

- **126 arquivos** commitados
- **31,080 linhas** de código adicionadas
- **5 módulos** de inteligência operacionais
- **800+ artigos** RSS indexados
- **150+ grupos** Telegram monitorados

---

## 🔄 História do Fork

Este projeto foi criado a partir do **Dashboard AI v2.0** em Janeiro/2025.

**Commits iniciais:**
```
d225af6 feat: initial commit - fork from Dashboard AI v2
81951b7 config: configure ports for simultaneous execution
d9309d2 fix: resolve Malpedia Library timeline display issues
20725a8 feat: implement comprehensive intelligence platform modules
```

**Diferenças principais:**
- **Dashboard AI v2**: Foco em agregação de KPIs e dashboards operacionais
- **Minerva Intelligence**: Foco em análise de inteligência e correlação de dados multi-fonte

---

## 🤝 Contribuindo

Contribuições são bem-vindas! Por favor:

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

---

## 📝 Licença

Este projeto é privado e proprietário.

---

## 👥 Autores

- **Angelo Cassio** - [@Cassio-Ac](https://github.com/Cassio-Ac)

---

## 🙏 Agradecimentos

- Forked from Dashboard AI v2.0
- Powered by Anthropic Claude
- Built with FastAPI, React, and Elasticsearch

---

**🚀 Minerva Intelligence Platform - Transformando dados em inteligência acionável**
