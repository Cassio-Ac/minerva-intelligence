"""
Malpedia Celery Tasks
Background tasks for Malpedia Library collection and enrichment

Tasks:
- sync_malpedia_library_rss: Sync via RSS feed (incremental, frequent)
- sync_malpedia_library_bibtex: Sync via BibTeX (full, weekly)
- sync_malpedia_library_full: Sync both sources
- enrich_malpedia_library: LLM enrichment of articles
"""

import logging
import asyncio
import sys
from pathlib import Path
from typing import Optional

# Add backend to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from app.celery_app import celery_app

logger = logging.getLogger(__name__)


# ============================================================
# MALPEDIA LIBRARY COLLECTION TASKS (RSS + BibTeX)
# ============================================================

@celery_app.task(name="app.tasks.malpedia_tasks.sync_malpedia_library_rss", bind=True)
def sync_malpedia_library_rss(self):
    """
    Periodic task: Sync Malpedia Library via RSS feed

    Fetches latest library entries from RSS feed and indexes to Elasticsearch.
    Fast incremental sync - run frequently (2x/day).

    Returns:
        Sync stats
    """
    logger.info("Starting Malpedia Library RSS sync task")

    try:
        from app.services.malpedia_library_service import run_malpedia_library_rss_sync

        result = asyncio.run(run_malpedia_library_rss_sync())

        logger.info(f"Malpedia Library RSS sync completed: {result}")
        return result

    except Exception as e:
        logger.error(f"Malpedia Library RSS sync failed: {e}")
        raise self.retry(exc=e, countdown=60 * (2 ** self.request.retries), max_retries=3)


@celery_app.task(name="app.tasks.malpedia_tasks.sync_malpedia_library_bibtex", bind=True)
def sync_malpedia_library_bibtex(self):
    """
    Periodic task: Sync Malpedia Library via BibTeX download

    Downloads complete BibTeX bibliography and indexes to Elasticsearch.
    Full sync - run less frequently (1x/week).

    Returns:
        Sync stats
    """
    logger.info("Starting Malpedia Library BibTeX sync task")

    try:
        from app.services.malpedia_library_service import run_malpedia_library_bibtex_sync

        result = asyncio.run(run_malpedia_library_bibtex_sync())

        logger.info(f"Malpedia Library BibTeX sync completed: {result}")
        return result

    except Exception as e:
        logger.error(f"Malpedia Library BibTeX sync failed: {e}")
        raise self.retry(exc=e, countdown=120 * (2 ** self.request.retries), max_retries=2)


@celery_app.task(name="app.tasks.malpedia_tasks.sync_malpedia_library_full", bind=True)
def sync_malpedia_library_full(self):
    """
    Full sync task: Sync Malpedia Library from both RSS and BibTeX

    Returns:
        Combined sync stats
    """
    logger.info("Starting FULL Malpedia Library sync task (RSS + BibTeX)")

    try:
        from app.services.malpedia_library_service import run_malpedia_library_full_sync

        result = asyncio.run(run_malpedia_library_full_sync())

        logger.info(f"Full Malpedia Library sync completed: {result}")
        return result

    except Exception as e:
        logger.error(f"Full Malpedia Library sync failed: {e}")
        raise self.retry(exc=e, countdown=180 * (2 ** self.request.retries), max_retries=2)


@celery_app.task(name="app.tasks.malpedia_tasks.get_malpedia_library_stats")
def get_malpedia_library_stats():
    """
    Get Malpedia Library stats from Elasticsearch

    Returns:
        Stats dict
    """
    logger.info("Getting Malpedia Library stats")

    try:
        from app.services.malpedia_library_service import MalpediaLibraryService

        async def _get_stats():
            service = MalpediaLibraryService()
            try:
                return await service.get_stats()
            finally:
                await service.close()

        result = asyncio.run(_get_stats())
        return result

    except Exception as e:
        logger.error(f"Error getting Malpedia Library stats: {e}")
        return {'error': str(e)}


# ============================================================
# MALPEDIA LIBRARY ENRICHMENT TASKS (LLM)
# ============================================================


@celery_app.task(name="app.tasks.malpedia_tasks.enrich_malpedia_library", bind=True)
def enrich_malpedia_library(self):
    """
    Periodic task: Enrich Malpedia Library articles with LLM

    Connects to EXTERNAL Elasticsearch (localhost:9200 from BHACK_2025 project)
    and enriches Malpedia Library BibTeX entries with:
    - LLM-generated summaries (2-3 sentences)
    - Actor mentions (APTs)
    - Malware family mentions

    Runs according to beat schedule (default: 1x per day at 02:00)
    """
    logger.info("🎯 Starting Malpedia Library enrichment task")

    try:
        # Import and run the async enrichment pipeline
        from malpedia_pipeline import enrich_all_articles

        # Run async pipeline in sync context
        result = asyncio.run(enrich_all_articles())

        logger.info(f"✅ Malpedia enrichment completed: {result}")
        return {
            "status": "success",
            "message": "Malpedia enrichment completed successfully",
            "result": result
        }

    except FileNotFoundError as e:
        logger.error(f"❌ Checkpoint or log file not found: {e}")
        # Don't retry for file errors
        return {
            "status": "error",
            "message": f"File error: {str(e)}"
        }

    except ConnectionError as e:
        logger.error(f"❌ Elasticsearch connection error: {e}")
        # Retry with exponential backoff for connection errors
        raise self.retry(exc=e, countdown=300 * (2 ** self.request.retries), max_retries=3)

    except Exception as e:
        logger.error(f"❌ Malpedia enrichment failed: {e}", exc_info=True)
        # Retry with exponential backoff
        raise self.retry(exc=e, countdown=300 * (2 ** self.request.retries), max_retries=2)


@celery_app.task(name="app.tasks.malpedia_tasks.check_malpedia_status", bind=True)
def check_malpedia_status(self):
    """
    Utility task: Check status of Malpedia enrichment

    Returns:
        dict: Current checkpoint status
    """
    logger.info("📊 Checking Malpedia enrichment status")

    try:
        import json
        from pathlib import Path

        checkpoint_file = Path("/app/malpedia_enrichment_checkpoint.json")

        if not checkpoint_file.exists():
            return {
                "status": "not_started",
                "message": "No checkpoint file found. Enrichment hasn't started yet."
            }

        with open(checkpoint_file, 'r') as f:
            checkpoint = json.load(f)

        return {
            "status": "in_progress" if checkpoint.get("total_processed", 0) > 0 else "not_started",
            "checkpoint": checkpoint
        }

    except Exception as e:
        logger.error(f"❌ Failed to check Malpedia status: {e}")
        return {
            "status": "error",
            "message": str(e)
        }
