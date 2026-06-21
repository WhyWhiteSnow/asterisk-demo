"""SIP stream-прокси через один Docker nginx (HTTP + stream)."""

from __future__ import annotations

import logging
import os
import re
import subprocess

from app.core.config import config
from app.models.asterisk_instance import AsteriskInstance
from app.utils.instance_paths import host_project_root
from app.utils.sip_proxy_ports import sip_backend_host_port

logger = logging.getLogger(__name__)

NGINX_STREAM_MOUNT = "/deploy/nginx/stream.d"


def nginx_stream_dir() -> str:
    """
    Каталог stream.d на диске хоста (монтируется в front и fastapi-prod).

    Приоритет: volume /deploy/nginx/stream.d в API-контейнере, иначе путь монорепо.
    """
    if os.path.isdir(NGINX_STREAM_MOUNT):
        return NGINX_STREAM_MOUNT
    return os.path.join(
        os.path.dirname(host_project_root()),
        "deploy",
        "nginx",
        "stream.d",
    )


def nginx_stream_config_path(instance_name: str) -> str:
    return os.path.join(nginx_stream_dir(), f"{instance_name}.conf")


def _safe_name(instance_name: str) -> str:
    return re.sub(r"[^a-zA-Z0-9_-]", "-", instance_name)


def write_nginx_stream_config(instance: AsteriskInstance) -> str:
    """
    Пишет stream.d/<name>.conf и перезагружает nginx в контейнере front.

    Asterisk публикуется на 127.0.0.1:<sip_port+10000>; nginx слушает 0.0.0.0:<sip_port>.
    """
    stream_dir = nginx_stream_dir()
    os.makedirs(stream_dir, exist_ok=True)
    path = nginx_stream_config_path(instance.name)
    safe = _safe_name(instance.name)
    port = instance.sip_port
    backend = sip_backend_host_port(port)

    content = f"""# Auto-generated for Asterisk instance "{instance.name}".
# Публичный SIP: {port} (nginx) -> backend 127.0.0.1:{backend} (docker -> asterisk:{port}).

upstream sip_{safe}_backend {{
    server 127.0.0.1:{backend};
}}

server {{
    listen {port} udp;
    proxy_pass sip_{safe}_backend;
    proxy_timeout 60s;
}}

server {{
    listen {port};
    proxy_pass 127.0.0.1:{backend};
    proxy_timeout 60s;
}}
"""
    with open(path, "w", encoding="utf-8") as handle:
        handle.write(content)

    reload_nginx_stream()
    return path


def remove_nginx_stream_config(instance_name: str) -> None:
    path = nginx_stream_config_path(instance_name)
    if os.path.isfile(path):
        os.remove(path)
    reload_nginx_stream()


def reload_nginx_stream() -> bool:
    """nginx -t && reload в контейнере front. Не падает, если nginx не запущен."""
    container = config.NGINX_CONTAINER_NAME
    try:
        test = subprocess.run(
            ["docker", "exec", container, "nginx", "-t"],
            capture_output=True,
            text=True,
            timeout=15,
        )
        if test.returncode != 0:
            logger.warning(
                "nginx -t failed in %s: %s",
                container,
                (test.stderr or test.stdout or "").strip(),
            )
            return False

        reload = subprocess.run(
            ["docker", "exec", container, "nginx", "-s", "reload"],
            capture_output=True,
            text=True,
            timeout=15,
        )
        if reload.returncode != 0:
            logger.warning(
                "nginx reload failed in %s: %s",
                container,
                (reload.stderr or reload.stdout or "").strip(),
            )
            return False

        logger.info("nginx stream reloaded in %s", container)
        return True
    except (subprocess.SubprocessError, OSError) as exc:
        logger.warning("nginx reload skipped (%s): %s", container, exc)
        return False
