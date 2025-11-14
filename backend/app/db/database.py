"""
SQL Database Configuration
Async SQLAlchemy para metadados do sistema (dashboards, conversas, etc.)
"""

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from sqlalchemy import text
from typing import AsyncGenerator
import logging
import os

logger = logging.getLogger(__name__)

# Database URL (PostgreSQL com asyncpg driver)
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://dashboard_user:dashboard_pass_secure_2024@localhost:5432/dashboard_ai"
)

# Create async engine
engine = create_async_engine(
    DATABASE_URL,
    echo=False,  # Set to True para debug SQL
    pool_pre_ping=True,  # Testa conexão antes de usar
    pool_size=10,  # Pool de conexões
    max_overflow=20,  # Conexões extras permitidas
)

# Create async session factory
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

# Base class para models
Base = declarative_base()


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency para obter sessão do banco

    Usage:
        @app.get("/items")
        async def get_items(db: AsyncSession = Depends(get_db)):
            result = await db.execute(select(Item))
            return result.scalars().all()
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db():
    """
    Inicializa banco de dados
    Cria todas as tabelas se não existirem

    IMPORTANTE: Em produção, use Alembic migrations!
    """
    async with engine.begin() as conn:
        # Import models aqui para registrar no Base.metadata
        from app.db import models  # noqa

        # Criar todas as tabelas
        await conn.run_sync(Base.metadata.create_all)
        logger.info("✅ SQL Database tables created")


async def close_db():
    """
    Fecha conexões do banco
    """
    await engine.dispose()
    logger.info("✅ SQL Database connections closed")


async def test_connection():
    """
    Testa conexão com banco
    """
    try:
        async with AsyncSessionLocal() as session:
            await session.execute(text("SELECT 1"))
            logger.info("✅ SQL Database connection OK")
            return True
    except Exception as e:
        logger.error(f"❌ SQL Database connection failed: {e}")
        return False
