# 🔌 Configuração de Portas - Minerva Intelligence Platform

**Data**: 2025-11-21
**Última atualização**: 2025-11-21

---

## ⚠️ IMPORTANTE: NÃO MUDE AS PORTAS SEM LER ESTE DOCUMENTO

---

## 📋 Padrão de Portas do Projeto

### MINERVA (intelligence-platform)

```
Backend API:    http://localhost:8001
Frontend:       http://localhost:5180
API Docs:       http://localhost:8001/docs
PostgreSQL:     localhost:5432 (Docker)
Redis:          localhost:6379 (Docker)
```

### DASHBOARD AI (projeto separado)

```
Backend API:    http://localhost:8000
```

---

## 🚫 REGRA DE OURO

```
Porta 8000 = Dashboard AI
Porta 8001 = Minerva
```

**NUNCA** use porta 8000 no Minerva!

---

## 📝 Arquivos de Configuração

### 1. Backend

**Arquivo**: `backend/app/core/config.py`
```python
PORT: int = 8001  # ✅ CORRETO
```

**Arquivo**: `start-dev.sh`
```bash
uvicorn app.main:socket_app --host 0.0.0.0 --port 8001 --reload  # ✅ CORRETO
```

### 2. Frontend

**Arquivo**: `frontend/.env` (não commitado)
```bash
VITE_API_URL=http://localhost:8001  # ✅ CORRETO
```

**Fallback em código** (quando .env não existe):
```typescript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001';
```

### 3. CORS

**Arquivo**: `backend/app/core/config.py`
```python
CORS_ORIGINS: List[str] = [
    "http://localhost:5174",  # Vite dev (alternativa)
    "http://localhost:5180",  # Frontend Minerva
    "http://localhost:3000"   # Desenvolvimento
]
```

---

## ✅ Checklist de Verificação

Antes de iniciar o projeto, verifique:

- [ ] Backend configurado para porta **8001**
- [ ] Frontend `.env` com **VITE_API_URL=http://localhost:8001**
- [ ] `start-dev.sh` usando **--port 8001**
- [ ] `config.py` com **PORT: int = 8001**
- [ ] CORS inclui **http://localhost:5180**
- [ ] Porta 8000 **NÃO** está em uso pelo Minerva

---

## 🔍 Como Verificar se Está Correto

### 1. Verificar Backend
```bash
# Deve retornar "Minerva"
curl -s http://localhost:8001/docs | grep -o "Minerva"

# NÃO deve retornar nada (porta livre ou Dashboard AI)
curl -s http://localhost:8000/docs | grep -o "Minerva"
```

### 2. Verificar Frontend
```bash
# Verificar .env
cat frontend/.env
# Deve mostrar: VITE_API_URL=http://localhost:8001

# Verificar porta frontend
lsof -ti:5180
# Deve retornar PID do Vite
```

### 3. Verificar Processos
```bash
# Ver quem está usando as portas
lsof -i:8000  # Dashboard AI ou livre
lsof -i:8001  # Minerva backend
lsof -i:5180  # Minerva frontend
```

---

## 🐛 Troubleshooting

### Problema: "CORS error" no frontend

**Causa**: Frontend rodando em porta não autorizada no CORS

**Solução**:
1. Verificar porta do frontend: `lsof -ti:5180`
2. Se estiver em outra porta (ex: 5181), adicionar em `CORS_ORIGINS`
3. Reiniciar backend

### Problema: "Connection refused" ao acessar API

**Causa**: Backend não está rodando na porta esperada

**Solução**:
1. Verificar se backend está em 8001: `curl http://localhost:8001/docs`
2. Se não, parar tudo: `./stop-dev.sh`
3. Verificar configurações neste documento
4. Iniciar: `./start-dev.sh`

### Problema: "Address already in use" ao iniciar

**Causa**: Porta 8001 ocupada

**Solução**:
1. Verificar quem está usando: `lsof -ti:8001 | xargs ps -p`
2. Se for Docker Minerva: porta certa, mas processo duplicado
3. Se for outro processo: matar com `kill <PID>`
4. Reiniciar: `./start-dev.sh`

---

## 📚 Referências

- **README.md**: Linhas 23-24 (tabela de portas)
- **README.md**: Linha 291 (nota sobre porta vs Dashboard AI)
- **start-dev.sh**: Linha 131 (comando uvicorn)
- **config.py**: Linha 21 (PORT config)

---

## 🔄 Histórico de Mudanças

| Data | Mudança | Motivo |
|------|---------|--------|
| 2025-11-21 | Criação deste documento | Documentar padrão após confusão com portas |
| 2025-11-21 | Correção: 8000 → 8001 | `start-dev.sh` estava usando porta errada |
| 2025-11-21 | Correção: 8000 → 8001 | `config.py` estava com PORT = 8000 |

---

## ⚡ Quick Reference

```bash
# Iniciar tudo (porta 8001)
./start-dev.sh

# Parar tudo
./stop-dev.sh

# Verificar se está correto
curl http://localhost:8001/docs | grep Minerva  # ✅ Deve funcionar
curl http://localhost:8000/docs | grep Minerva  # ❌ NÃO deve funcionar
```

---

**Mantenha este documento atualizado sempre que houver mudanças nas portas!**
