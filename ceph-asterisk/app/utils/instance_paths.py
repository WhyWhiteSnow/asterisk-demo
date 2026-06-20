"""Пути к каталогу конфигов АТС: запись из API и volume Docker."""

import os

from app.core.config import config
from app.models.asterisk_instance import AsteriskInstance


def _ceph_guard(path: str | None) -> bool:
    return bool(path and path.startswith("ceph://"))


def host_project_root() -> str:
    """
    Корень проекта на хосте (для docker run -v / compose).

    В API-контейнере задайте HOST_PROJECT_PATH=/home/user/ceph-asterisk в .env.fastapi.
    """
    explicit = (config.HOST_PROJECT_PATH or os.environ.get("HOST_PROJECT_PATH", "")).strip()
    if explicit:
        return explicit.rstrip("/")
    return config.PROJECT_PATH.rstrip("/")


def docker_volume_config_dir(instance: AsteriskInstance) -> str:
    """
    Путь на хосте для `docker run -v` / compose (резолвится демоном Docker на хосте).
    """
    if _ceph_guard(instance.config_path):
        return instance.config_path
    return os.path.normpath(
        os.path.join(host_project_root(), config.CONFIG_FOLDER, instance.name)
    )


def writable_config_dir_for_name(name: str) -> str:
    """Каталог конфигов по имени АТС (до создания записи в БД)."""
    return disk_config_dir_for_name(name)


def disk_config_dir_for_name(name: str) -> str:
    """
    Путь к конфигам на диске, совпадающий с bind-mount в docker compose.

    В prod API пишет в /app/asterisk_configs (volume), compose монтирует
  host_project_root()/asterisk_configs — это один и тот же каталог.
    """
    host_path = os.path.normpath(
        os.path.join(host_project_root(), config.CONFIG_FOLDER, name)
    )
    os.makedirs(host_path, exist_ok=True)
    return host_path


def writable_config_dir(instance: AsteriskInstance) -> str:
    """
    Каталог, доступный процессу API для чтения/записи файлов.

    В контейнере FastAPI существует /app/asterisk_configs/..., на хосте — HOST_PROJECT_PATH/...
    """
    if _ceph_guard(instance.config_path):
        return instance.config_path

    candidates = [
        os.path.join("/app", config.CONFIG_FOLDER, instance.name),
        docker_volume_config_dir(instance),
    ]
    if instance.config_path and not _ceph_guard(instance.config_path):
        candidates.append(instance.config_path)

    for path in candidates:
        if path and os.path.isdir(path):
            return os.path.normpath(path)

    default = os.path.join("/app", config.CONFIG_FOLDER, instance.name)
    os.makedirs(default, exist_ok=True)
    return default


host_config_dir = docker_volume_config_dir
