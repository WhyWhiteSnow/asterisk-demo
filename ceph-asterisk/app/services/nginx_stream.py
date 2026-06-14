"""Генерация nginx stream-конфигов для SIP (UDP/TCP) инстансов Asterisk."""

import os
import re

from app.models.asterisk_instance import AsteriskInstance
from app.utils.instance_paths import host_project_root


def _safe_name(instance_name: str) -> str:
    return re.sub(r"[^a-zA-Z0-9_-]", "-", instance_name)


def nginx_stream_dir() -> str:
    """deploy/nginx/stream.d относительно корня монорепо (родитель ceph-asterisk)."""
    return os.path.join(os.path.dirname(host_project_root()), "deploy", "nginx", "stream.d")


def nginx_stream_config_path(instance_name: str) -> str:
    return os.path.join(nginx_stream_dir(), f"{instance_name}.conf")


def write_nginx_stream_config(instance: AsteriskInstance) -> str:
    """
    SIP слушает nginx на 0.0.0.0:port и проксирует на 127.0.0.1:port (контейнер Asterisk).
    Файл подключается через include в stream {} хостового nginx.
    """
    stream_dir = nginx_stream_dir()
    os.makedirs(stream_dir, exist_ok=True)
    path = nginx_stream_config_path(instance.name)
    safe = _safe_name(instance.name)
    port = instance.sip_port

    content = f"""# Auto-generated for Asterisk instance "{instance.name}".
# После изменения: sudo nginx -t && sudo systemctl reload nginx

upstream sip_{safe}_backend {{
    server 127.0.0.1:{port};
}}

server {{
    listen {port} udp reuseport;
    proxy_pass sip_{safe}_backend;
    proxy_timeout 3s;
    proxy_responses 1;
}}

server {{
    listen {port};
    proxy_pass 127.0.0.1:{port};
}}
"""
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    return path


def remove_nginx_stream_config(instance_name: str) -> None:
    path = nginx_stream_config_path(instance_name)
    if os.path.isfile(path):
        os.remove(path)
