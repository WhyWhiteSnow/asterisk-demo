"""NAT/RTP: external_media_address и local_net в pjsip.conf на диске."""

from __future__ import annotations

import os
import re

from app.core.config import config
from app.models.asterisk_instance import AsteriskInstance
from app.utils.instance_paths import writable_config_dir

TRANSPORT_SECTION_RE = re.compile(r"^\[transport-[^\]]+\]\s*$", re.MULTILINE)
LOCAL_NET_RE = re.compile(r"^\s*local_net\s*=", re.MULTILINE)


def _local_net_lines() -> list[str]:
    return [
        f"local_net={net.strip()}"
        for net in config.PJSIP_LOCAL_NETS.split(",")
        if net.strip()
    ]


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
    """Обновляет external_* / local_net / bind_rtp_to_media_address в transport-секциях."""
    path = os.path.join(writable_config_dir(instance), "pjsip.conf")
    if not os.path.isfile(path):
        return False

    with open(path, encoding="utf-8") as f:
        content = f.read()

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

    with open(path, "w", encoding="utf-8") as f:
        f.write(new_content if new_content.endswith("\n") else new_content + "\n")
    return True
