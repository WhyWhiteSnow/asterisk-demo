"""NAT/RTP и transport: pjsip.conf на диске (sorcery читает transport отсюда)."""

from __future__ import annotations

import os
import re

from app.core.config import config
from app.models.asterisk_instance import AsteriskInstance
from app.utils.instance_paths import writable_config_dir

TRANSPORT_SECTION_RE = re.compile(r"^\[transport-[^\]]+\]\s*$", re.MULTILINE)
TRANSPORT_PROTOCOL_RE = re.compile(r"^\[transport-(\w+)\]", re.MULTILINE)
LOCAL_NET_RE = re.compile(r"^\s*local_net\s*=", re.MULTILINE)
DEFAULT_TRANSPORT = "udp"
VALID_TRANSPORTS = frozenset({"udp", "tcp", "tls"})


def _local_net_lines() -> list[str]:
    return [
        f"local_net={net.strip()}"
        for net in config.PJSIP_LOCAL_NETS.split(",")
        if net.strip()
    ]


def build_pjsip_conf_content(instance: AsteriskInstance, transport_type: str = DEFAULT_TRANSPORT) -> str:
    async_tcp = "async_operations=1" if transport_type == "tcp" else ""
    local_lines = "\n".join(_local_net_lines())
    async_line = f"{async_tcp}\n" if async_tcp else ""
    return f"""[global]
endpoint_identifier_order=username,ip,anonymous

[transport-{transport_type}]
type=transport
protocol={transport_type}
bind=0.0.0.0:{instance.sip_port}
{async_line}{local_lines}
external_media_address={config.PJSIP_EXTERNAL_ADDRESS}
external_signaling_address={config.PJSIP_EXTERNAL_ADDRESS}
bind_rtp_to_media_address=yes
"""


def _write_pjsip_conf(path: str, content: str) -> None:
    with open(path, "w", encoding="utf-8") as f:
        f.write(content if content.endswith("\n") else content + "\n")
    os.chmod(path, 0o777)
    try:
        os.chown(path, config.ASTERISK_UID, config.ASTERISK_GID)
    except OSError:
        pass


def _upsert_option(lines: list[str], key: str, value: str) -> tuple[list[str], bool]:
    prefix = f"{key}="
    changed = False
    found = False
    out: list[str] = []
    for line in lines:
        stripped = line.strip()
        if stripped.startswith(prefix):
            found = True
            new_line = f"{key}={value}"
            if stripped != new_line:
                out.append(new_line)
                changed = True
            else:
                out.append(line)
        else:
            out.append(line)
    if not found:
        out.append(f"{key}={value}")
        changed = True
    return out, changed


def _patch_transport_section(section: str) -> tuple[str, bool]:
    lines = section.splitlines()
    if not lines:
        return section, False

    header, *body = lines
    changed = False

    body = [line for line in body if not LOCAL_NET_RE.match(line)]
    if len(body) != len(lines) - 1:
        changed = True

    for key, value in (
        ("external_media_address", config.PJSIP_EXTERNAL_ADDRESS),
        ("external_signaling_address", config.PJSIP_EXTERNAL_ADDRESS),
        ("bind_rtp_to_media_address", "yes"),
    ):
        body, opt_changed = _upsert_option(body, key, value)
        changed = changed or opt_changed

    bind_idx = next(
        (idx for idx, line in enumerate(body) if line.strip().startswith("bind=")),
        len(body),
    )
    local_lines = _local_net_lines()
    existing_local = {line.strip() for line in body if line.strip().startswith("local_net=")}
    if set(local_lines) != existing_local:
        body = body[: bind_idx + 1] + local_lines + body[bind_idx + 1 :]
        changed = True

    return "\n".join([header, *body]), changed


def ensure_pjsip_nat_on_disk(instance: AsteriskInstance) -> bool:
    """Создаёт или чинит pjsip.conf: transport-udp + NAT."""
    path = os.path.join(writable_config_dir(instance), "pjsip.conf")
    if not os.path.isfile(path):
        _write_pjsip_conf(path, build_pjsip_conf_content(instance))
        return True

    with open(path, encoding="utf-8") as f:
        content = f.read()

    if not TRANSPORT_SECTION_RE.search(content):
        _write_pjsip_conf(path, build_pjsip_conf_content(instance))
        return True

    changed = False
    parts: list[str] = []
    last = 0
    for match in TRANSPORT_SECTION_RE.finditer(content):
        parts.append(content[last : match.start()])
        section_start = match.start()
        next_match = TRANSPORT_SECTION_RE.search(content, match.end())
        section_end = next_match.start() if next_match else len(content)
        section = content[section_start:section_end].rstrip("\n")
        patched, section_changed = _patch_transport_section(section)
        parts.append(patched)
        changed = changed or section_changed
        last = section_end

    parts.append(content[last:])
    new_content = "".join(parts)
    if not changed:
        return False

    _write_pjsip_conf(path, new_content)
    return True


def read_transport_type_from_disk(instance: AsteriskInstance) -> str:
    """Читает тип транспорта из секции [transport-*] в pjsip.conf."""
    path = os.path.join(writable_config_dir(instance), "pjsip.conf")
    if not os.path.isfile(path):
        return DEFAULT_TRANSPORT

    with open(path, encoding="utf-8") as f:
        content = f.read()

    match = TRANSPORT_PROTOCOL_RE.search(content)
    if not match:
        return DEFAULT_TRANSPORT

    transport_type = match.group(1).lower()
    if transport_type in VALID_TRANSPORTS:
        return transport_type
    return DEFAULT_TRANSPORT


def apply_transport_type_on_disk(instance: AsteriskInstance, transport_type: str) -> bool:
    """Перезаписывает pjsip.conf с новым transport, если тип изменился."""
    normalized = transport_type.lower()
    if normalized not in VALID_TRANSPORTS:
        raise ValueError(f"Unsupported transport type: {transport_type}")

    current = read_transport_type_from_disk(instance)
    if current == normalized:
        return False

    path = os.path.join(writable_config_dir(instance), "pjsip.conf")
    _write_pjsip_conf(path, build_pjsip_conf_content(instance, normalized))
    return True
