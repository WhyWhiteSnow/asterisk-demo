"""Очистка «зависших» или неудачных экземпляров ВАТС."""

from __future__ import annotations

import contextlib
import logging
import os
import shutil
import subprocess

from sqlalchemy.orm import Session

from app.models.asterisk_instance import AsteriskInstance
from app.services.asterisk_reload import container_name_for_instance
from app.services.instance_health import inspect_container_state
from app.services.instance_events import notify_instance_deleted
from app.utils.ast_config_views import delete_ast_config_for_instance, drop_ast_config_view
from app.utils.pjsip_views import drop_pjsip_views
from app.services.instance_cdr_cleanup import purge_instance_cdr_data

logger = logging.getLogger(__name__)


def is_container_missing(instance_name: str) -> bool:
    return inspect_container_state(container_name_for_instance(instance_name)) == "missing"


def is_recoverable_orphan(instance: AsteriskInstance) -> bool:
    if instance.status not in ("creating", "error"):
        return False
    return is_container_missing(instance.name)


def cleanup_instance_resources(
    instance: AsteriskInstance,
    db: Session,
    db_cdr: Session,
) -> None:
    from app.services.instance_compose import compose_cli
    from app.utils.instance_paths import compose_workdir
    from app.services.nginx_stream import remove_nginx_stream_config

    compose_path = compose_workdir()
    filename = f"docker-compose-{instance.name}.yml"
    if os.path.exists(compose_path):
        subprocess.run(
            compose_cli(instance.name, "down", "-v"),
            cwd=compose_path,
            capture_output=True,
            text=True,
            timeout=30,
        )
        compose_file = os.path.join(compose_path, filename)
        if os.path.isfile(compose_file):
            with contextlib.suppress(OSError):
                os.remove(compose_file)

    if instance.config_path and not str(instance.config_path).startswith("ceph://"):
        shutil.rmtree(instance.config_path, ignore_errors=True)

    with contextlib.suppress(Exception):
        remove_nginx_stream_config(instance.name)

    delete_ast_config_for_instance(db_cdr, instance.id)
    drop_ast_config_view(db_cdr, instance.id)
    drop_pjsip_views(db_cdr, instance.id)
    purge_instance_cdr_data(db_cdr, instance.id, instance.name)
    instance_id = instance.id
    db.delete(instance)
    db.commit()
    notify_instance_deleted(instance_id)
    logger.info("Cleaned up orphan instance %s (id=%s)", instance.name, instance_id)
