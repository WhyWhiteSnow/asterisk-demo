import asyncio
import fcntl
import logging
import subprocess
from contextlib import suppress

from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.models.asterisk_instance import AsteriskInstance
from app.services.asterisk_reload import container_name_for_instance
from app.services.instance_compose import InstanceComposeError, sync_instance_compose
from app.services.instance_events import notify_instance_updated

logger = logging.getLogger(__name__)

WATCH_INTERVAL_SEC = 30
MAX_RESTART_FAILURES = 3
LOCK_PATH = "/tmp/ceph-asterisk-instance-health.lock"

_failure_counts: dict[int, int] = {}


def inspect_container_state(container_name: str) -> str:
    """healthy|unhealthy|starting|running|stopped|missing."""
    result = subprocess.run(
        [
            "docker",
            "inspect",
            "-f",
            "{{if not .State.Running}}stopped{{else if .State.Health}}"
            "{{.State.Health.Status}}{{else}}running{{end}}",
            container_name,
        ],
        capture_output=True,
        text=True,
        timeout=15,
    )
    if result.returncode != 0:
        return "missing"
    return (result.stdout or "").strip() or "missing"


def _restart_container(container_name: str) -> bool:
    result = subprocess.run(
        ["docker", "restart", container_name],
        capture_output=True,
        text=True,
        timeout=90,
    )
    if result.returncode != 0:
        logger.warning(
            "docker restart %s failed: %s",
            container_name,
            (result.stderr or result.stdout or "").strip(),
        )
        return False
    return True


def _restart_instance_stack(instance: AsteriskInstance, db: Session) -> bool:
    db.refresh(instance)
    if instance.status != "running":
        logger.info(
            "Skip stack restart for %s: status=%s",
            instance.name,
            instance.status,
        )
        return False

    try:
        sync_instance_compose(instance)
    except InstanceComposeError as exc:
        logger.error("Failed to restart stack for %s: %s", instance.name, exc.message)
        return False

    instance.status = "running"
    db.commit()
    notify_instance_updated(instance)
    return True


def reconcile_instance_health(instance: AsteriskInstance, db: Session) -> None:
    db.refresh(instance)
    if instance.status != "running":
        return

    container_name = container_name_for_instance(instance.name)
    state = inspect_container_state(container_name)

    if state in {"healthy", "running", "starting"}:
        _failure_counts.pop(instance.id, None)
        return

    if state == "unhealthy":
        logger.warning("Asterisk %s is unhealthy, restarting container", instance.name)
        restarted = _restart_container(container_name)
        if not restarted:
            restarted = _restart_instance_stack(instance, db)
    else:
        logger.warning(
            "Asterisk %s container is %s, restarting stack",
            instance.name,
            state,
        )
        restarted = _restart_instance_stack(instance, db)

    if restarted:
        _failure_counts.pop(instance.id, None)
        return

    failures = _failure_counts.get(instance.id, 0) + 1
    _failure_counts[instance.id] = failures
    if failures >= MAX_RESTART_FAILURES:
        from app.services.instance_container import stop_asterisk_instance

        stop_asterisk_instance(instance)
        instance.status = "error"
        db.commit()
        notify_instance_updated(instance)
        _failure_counts.pop(instance.id, None)
        logger.error(
            "Instance %s marked error after %d failed recovery attempts",
            instance.name,
            failures,
        )


def reconcile_creating_instance(instance: AsteriskInstance, db: Session) -> None:
    db.refresh(instance)
    if instance.status != "creating":
        return
    container_name = container_name_for_instance(instance.name)
    state = inspect_container_state(container_name)
    if state != "missing":
        return
    instance.status = "error"
    db.commit()
    notify_instance_updated(instance)
    logger.error(
        "Instance %s stuck in creating without container — marked error",
        instance.name,
    )


def run_health_watch_cycle() -> None:
    db = SessionLocal()
    try:
        instances = (
            db.query(AsteriskInstance)
            .filter(AsteriskInstance.status.in_(("running", "creating")))
            .all()
        )
        for instance in instances:
            try:
                if instance.status == "creating":
                    reconcile_creating_instance(instance, db)
                else:
                    reconcile_instance_health(instance, db)
            except Exception:
                logger.exception("Health check failed for instance %s", instance.name)
    finally:
        db.close()


async def _watch_loop(lock_file) -> None:
    try:
        while True:
            await asyncio.sleep(WATCH_INTERVAL_SEC)
            await asyncio.to_thread(run_health_watch_cycle)
    finally:
        with suppress(Exception):
            fcntl.flock(lock_file.fileno(), fcntl.LOCK_UN)
            lock_file.close()


async def start_instance_health_watch() -> asyncio.Task | None:
    lock_file = open(LOCK_PATH, "w")
    try:
        fcntl.flock(lock_file.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError:
        lock_file.close()
        logger.info("Instance health watch already running in another worker")
        return None

    logger.info("Instance health watch started (interval=%ss)", WATCH_INTERVAL_SEC)
    return asyncio.create_task(_watch_loop(lock_file))


async def stop_instance_health_watch(task: asyncio.Task | None) -> None:
    if task is None:
        return
    task.cancel()
    with suppress(asyncio.CancelledError):
        await task
