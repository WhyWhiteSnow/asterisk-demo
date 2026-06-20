"""Файлы ODBC для bind-mount в контейнер Asterisk (должны быть файлами, не каталогами)."""

from __future__ import annotations

import logging
import os
import shutil

from app.core.config import config
from app.schemas.asterisk import AsteriskInstanceCreate

logger = logging.getLogger(__name__)


def odbc_ini_content() -> str:
    return f"""[{config.DSN}]
Description = MySQL connection to Asterisk
Driver      = MySQL
Database    = {config.MYSQL_DATABASE_CDR}
Server      = {config.MYSQL_CONTAINER_NAME}
User        = {config.MYSQL_ASTERISK_USER}
Password    = {config.MYSQL_ASTERISK_USER_PASSWORD}
Port        = {config.MYSQL_PORT}
"""


def odbcinst_ini_content() -> str:
    return """[MySQL]
Description = ODBC for MySQL
Driver      = /usr/lib/x86_64-linux-gnu/odbc/libmaodbc.so
FileUsage   = 1
"""


def _ensure_regular_file(path: str, content: str) -> None:
    if os.path.isdir(path):
        logger.warning("Removing ODBC path created as directory: %s", path)
        shutil.rmtree(path)
    parent = os.path.dirname(path)
    os.makedirs(parent, exist_ok=True)
    with open(path, "w", encoding="utf-8") as handle:
        handle.write(content)
    os.chmod(path, 0o666)
    try:
        os.chown(path, config.ASTERISK_UID, config.ASTERISK_GID)
    except (OSError, AttributeError, PermissionError):
        pass


def ensure_odbc_driver_files(config_dir: str) -> None:
    """
    Гарантирует наличие drivers/odbc.ini и drivers/odbcinst.ini как обычных файлов.

    Docker при bind-mount несуществующего файла создаёт каталог — из-за этого
    контейнер Asterisk не стартует.
    """
    if not config_dir or config_dir.startswith("ceph://"):
        return
    drivers_dir = os.path.join(config_dir, "drivers")
    os.makedirs(drivers_dir, exist_ok=True)
    _ensure_regular_file(os.path.join(drivers_dir, "odbc.ini"), odbc_ini_content())
    _ensure_regular_file(os.path.join(drivers_dir, "odbcinst.ini"), odbcinst_ini_content())


def ensure_odbc_driver_files_for_instance(
    config_dir: str,
    instance: AsteriskInstanceCreate | None = None,
) -> None:
    """Совместимость: instance не используется, ODBC-шаблон общий."""
    _ = instance
    ensure_odbc_driver_files(config_dir)
