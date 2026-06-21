"""astsoundsdir на диске инстанса (asterisk.conf не в ODBC)."""

import os
import re

from app.models.asterisk_instance import AsteriskInstance
from app.utils.instance_paths import writable_config_dir

ASTSOUNDSDIR_LINE = "astsoundsdir => /opt/asterisk-core-sounds\n"
ASTSOUNDSDIR_VALUE = "/opt/asterisk-core-sounds"
SOUNDS_SEARCH_CUSTOM_LINE = "sounds_search_custom_dir = yes\n"


def _patch_asterisk_conf(content: str) -> tuple[str, bool]:
    changed = False

    if re.search(r"^\s*astsoundsdir\s*=>", content, re.MULTILINE | re.IGNORECASE):
        if ASTSOUNDSDIR_VALUE not in content:
            content = re.sub(
                r"^\s*astsoundsdir\s*=>.*$",
                f"astsoundsdir => {ASTSOUNDSDIR_VALUE}",
                content,
                count=1,
                flags=re.MULTILINE | re.IGNORECASE,
            )
            changed = True
    elif "[directories]" in content:
        content = content.replace(
            "[directories]\n",
            f"[directories]\n{ASTSOUNDSDIR_LINE}",
            1,
        )
        changed = True
    else:
        content = f"[directories]\n{ASTSOUNDSDIR_LINE}\n" + content
        changed = True

    custom_match = re.search(
        r"^\s*sounds_search_custom_dir\s*=\s*(.+)$",
        content,
        re.MULTILINE | re.IGNORECASE,
    )
    if custom_match:
        if custom_match.group(1).strip().lower() not in ("yes", "true", "1"):
            content = re.sub(
                r"^\s*sounds_search_custom_dir\s*=.*$",
                "sounds_search_custom_dir = yes",
                content,
                count=1,
                flags=re.MULTILINE | re.IGNORECASE,
            )
            changed = True
    elif "[options]" in content:
        content = content.replace(
            "[options]\n",
            f"[options]\n{SOUNDS_SEARCH_CUSTOM_LINE}",
            1,
        )
        changed = True
    else:
        content = content.rstrip() + f"\n\n[options]\n{SOUNDS_SEARCH_CUSTOM_LINE}"
        changed = True

    return content, changed


def ensure_astsoundsdir_on_disk(instance: AsteriskInstance) -> bool:
    """Добавляет astsoundsdir и sounds_search_custom_dir в asterisk.conf инстанса."""
    path = os.path.join(writable_config_dir(instance), "asterisk.conf")
    if not os.path.isfile(path):
        return False

    with open(path, encoding="utf-8") as f:
        content = f.read()

    content, changed = _patch_asterisk_conf(content)

    if changed:
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
    return changed
