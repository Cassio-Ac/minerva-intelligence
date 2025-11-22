"""
Celery Application
Background task processing and scheduling for RSS collection
"""

from celery import Celery
from celery.schedules import crontab
import os

# Redis connection for Celery broker and backend
REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")

# Create Celery app
celery_app = Celery(
    "minerva",
    broker=REDIS_URL,
    backend=REDIS_URL,
    include=["app.tasks.rss_tasks", "app.tasks.malpedia_tasks", "app.tasks.misp_tasks"]
)

# Celery configuration
celery_app.conf.update(
    # Task settings
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="America/Sao_Paulo",  # UTC-3
    enable_utc=False,

    # Result backend settings
    result_expires=3600,  # Results expire after 1 hour
    result_backend_transport_options={
        "master_name": "mymaster"
    },

    # Worker settings
    worker_prefetch_multiplier=1,
    worker_max_tasks_per_child=1000,

    # Beat schedule (periodic tasks)
    beat_schedule={
        # RSS collection - 2x per day (08:00 and 20:00 Brazil time)
        "collect-rss-feeds": {
            "task": "app.tasks.rss_tasks.collect_all_rss_feeds",
            "schedule": crontab(minute=0, hour="8,20"),  # 08:00 and 20:00
        },

        # Malpedia enrichment - 1x per day (02:00 Brazil time)
        "enrich-malpedia-library": {
            "task": "app.tasks.malpedia_tasks.enrich_malpedia_library",
            "schedule": crontab(minute=0, hour=2),  # 02:00 AM
        },

        # MISP feeds sync - 4x per day (00:00, 06:00, 12:00, 18:00 Brazil time)
        "sync-misp-feeds": {
            "task": "app.tasks.misp_tasks.sync_all_misp_feeds",
            "schedule": crontab(minute=0, hour="0,6,12,18"),  # Every 6 hours
        },
    },
)

# Optional: Task annotations for rate limiting
celery_app.conf.task_annotations = {
    "app.tasks.rss_tasks.collect_all_rss_feeds": {"rate_limit": "1/m"},  # Max 1/min
}


if __name__ == "__main__":
    celery_app.start()
