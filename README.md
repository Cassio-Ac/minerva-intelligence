# 🧠 Minerva - Intelligence Platform v1.0

**Plataforma de Análise de Inteligência baseada em Múltiplas Fontes de Dados**

> Versão 1.0 - Forked from Dashboard AI v2.0

---

## 🎯 Sobre

**Minerva** é uma plataforma completa para análise de inteligência baseada em múltiplas fontes de dados. Diferente de um agregador de KPIs, este projeto foca em correlação de dados, análise temporal e extração de insights estratégicos.

### ✨ Principais Features

- **Análise de Inteligência**: Correlação entre múltiplas fontes de dados
- **LLM Integration**: Análise assistida por IA (Claude, OpenAI, Databricks)
- **Chat Interface**: Consultas em linguagem natural
- **Multi-Source Connectors**: Conectores para diversas fontes de dados
- **SSO Integration**: Autenticação via Microsoft Entra ID (Azure AD)
- **Timeline View**: Visualização temporal de eventos
- **Alert System**: Sistema de alertas configurável
- **Role-based Access**: Controle granular de permissões

---

## 🚀 Instalação

### Pré-requisitos

- Node.js 18+
- Python 3.11+
- Docker & Docker Compose
- PostgreSQL 16+ (ou via Docker)
- Redis 7+ (ou via Docker)

### Quick Start

```bash
# Clone o repositório
git clone <repo-url>
cd intelligence-platform

# Iniciar com Docker Compose
docker-compose up

# Backend: http://localhost:8000
# API Docs: http://localhost:8000/docs
```

---

## 🔄 História do Fork

Este projeto foi criado a partir do **Dashboard AI v2.0** em Janeiro/2025.

**Diferenças principais:**
- Dashboard AI v2: Foco em agregação de KPIs e dashboards operacionais
- Intelligence Platform: Foco em análise de inteligência e correlação de dados

Veja detalhes completos em [docs/FORK_HISTORY.md](docs/FORK_HISTORY.md).

---

## 📖 Documentação

- [Fork History](docs/FORK_HISTORY.md)
- [SSO Integration Guide](docs/ENTRA_ID_OAUTH_IMPLEMENTATION_GUIDE.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Development Guide](docs/DEVELOPMENT.md)

---

**Forked from**: [Dashboard AI v2.0](https://github.com/seu-usuario/dashboard-ai-v2)  
**Fork Date**: 2025-01-14

---

## ⚠️ Executando com Dashboard AI v2 Simultaneamente

Se você também tem o **Dashboard AI v2** rodando e quer executar ambos os projetos ao mesmo tempo, veja o guia completo:

📖 **[Guia: Rodando Intelligence Platform e Dashboard AI v2 juntos](docs/RUNNING_WITH_DASHBOARD_AI.md)**

### Resumo rápido:

**Portas usadas pelo Intelligence Platform:**
- Backend: `8001` (Dashboard AI usa 8000)
- PostgreSQL: `5433` (Dashboard AI usa 5432)
- Redis: `6380` (Dashboard AI usa 6379)
- Frontend: `5174` (Dashboard AI usa 5173)

**Iniciar ambos:**
```bash
# Terminal 1 - Dashboard AI
cd /Users/angellocassio/Downloads/dashboard-ai-v2
docker-compose up

# Terminal 2 - Intelligence Platform
cd ~/Documents/intelligence-platform
docker-compose up
```

**URLs:**
- Dashboard AI: http://localhost:8000
- Intelligence Platform: http://localhost:8001

