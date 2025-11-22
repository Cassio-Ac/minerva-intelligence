"""
MISP Feed Synchronization Tasks
Periodic tasks for syncing IOCs from all configured MISP feeds
"""

from celery import shared_task
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from app.core.config import settings
from app.cti.services.misp_feed_service import MISPFeedService
import asyncio
import logging

logger = logging.getLogger(__name__)


@shared_task(name="app.tasks.misp_tasks.sync_all_misp_feeds")
def sync_all_misp_feeds():
    """
    Celery task para sincronizar todos os feeds MISP ativos

    Agenda: 4x por dia (00:00, 06:00, 12:00, 18:00)
    Razão: Feeds MISP são atualizados frequentemente com novas ameaças
    """
    logger.info("🚀 Starting MISP feed synchronization...")

    try:
        # Run async function in sync context
        asyncio.run(_sync_feeds_async())
        logger.info("✅ MISP feed synchronization completed successfully")
        return {"status": "success", "message": "All MISP feeds synchronized"}

    except Exception as e:
        logger.error(f"❌ MISP feed synchronization failed: {e}")
        raise


async def _sync_feeds_async():
    """
    Sincroniza todos os feeds MISP (versão async)
    """
    # Criar engine async
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        service = MISPFeedService(session)

        # Buscar todos os feeds ativos
        feeds = await service.list_feeds(is_active=True)

        total_feeds = len(feeds)
        successful = 0
        failed = 0
        total_imported = 0

        logger.info(f"📊 Found {total_feeds} active MISP feeds to sync")

        # Sincronizar cada feed
        for feed in feeds:
            try:
                feed_id = feed["id"]
                feed_name = feed["name"]

                logger.info(f"🔄 Syncing feed: {feed_name}")

                result = await service.sync_feed(feed_id)

                if result["status"] == "success":
                    successful += 1
                    total_imported += result["imported"]
                    logger.info(f"✅ {feed_name}: {result['imported']} IOCs imported")
                else:
                    failed += 1
                    logger.warning(f"⚠️ {feed_name}: {result['message']}")

            except Exception as e:
                failed += 1
                logger.error(f"❌ Error syncing feed {feed.get('name', 'unknown')}: {e}")

        # Log resumo
        logger.info(f"""
        📊 MISP Sync Summary:
        - Total feeds: {total_feeds}
        - Successful: {successful}
        - Failed: {failed}
        - Total IOCs imported: {total_imported}
        """)

    # Fechar engine
    await engine.dispose()


@shared_task(name="app.tasks.misp_tasks.sync_single_feed")
def sync_single_feed(feed_id: str):
    """
    Celery task para sincronizar um feed MISP específico

    Args:
        feed_id: UUID do feed MISP a sincronizar
    """
    logger.info(f"🚀 Starting sync for MISP feed: {feed_id}")

    try:
        asyncio.run(_sync_single_feed_async(feed_id))
        logger.info(f"✅ MISP feed {feed_id} synchronized successfully")
        return {"status": "success", "feed_id": feed_id}

    except Exception as e:
        logger.error(f"❌ MISP feed {feed_id} sync failed: {e}")
        raise


async def _sync_single_feed_async(feed_id: str):
    """
    Sincroniza um feed MISP específico (versão async)
    """
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        service = MISPFeedService(session)
        result = await service.sync_feed(feed_id)

        if result["status"] == "success":
            logger.info(f"✅ Feed {feed_id}: {result['imported']} IOCs imported")
        else:
            logger.warning(f"⚠️ Feed {feed_id}: {result['message']}")

    await engine.dispose()
