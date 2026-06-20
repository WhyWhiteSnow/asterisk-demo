"""Генерация managed-строк коротких кодов в extensions.conf."""

from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy.orm import Session

from app.models.feature_codes_settings import FeatureCodesSettings
from app.services.ast_config_history import save_file_version
from app.services.extension_routing import (
    EXTENSIONS_FILENAME,
    INTERNAL_CONTEXT,
    MANAGED_TAG_FEATURE_CODES,
    _context_cat_metric,
    _delete_managed_rows,
    _insert_exten_rows,
    _next_var_metric,
    _tag_line,
)
from app.services.asterisk_reload import reload_asterisk_config

FEATURE_CODES_BLOCK_LABEL = "Короткие коды"


@dataclass
class FeatureCodesData:
    vm_access: str = "*97"
    vm_check: str = "*98"
    cf_activate: str = "*72"
    cf_deactivate: str = "*73"
    dnd_activate: str = "*78"
    dnd_deactivate: str = "*79"
    vm_access_enabled: bool = True
    vm_check_enabled: bool = True
    cf_codes_enabled: bool = False
    dnd_codes_enabled: bool = True


def get_feature_codes(
    db_cdr: Session,
    instance_id: int,
) -> FeatureCodesData:
    row = (
        db_cdr.query(FeatureCodesSettings)
        .filter(FeatureCodesSettings.instance_id == instance_id)
        .first()
    )
    if row is None:
        return FeatureCodesData()
    return FeatureCodesData(
        vm_access=row.vm_access,
        vm_check=row.vm_check,
        cf_activate=row.cf_activate,
        cf_deactivate=row.cf_deactivate,
        dnd_activate=row.dnd_activate,
        dnd_deactivate=row.dnd_deactivate,
        vm_access_enabled=row.vm_access_enabled,
        vm_check_enabled=row.vm_check_enabled,
        cf_codes_enabled=row.cf_codes_enabled,
        dnd_codes_enabled=row.dnd_codes_enabled,
    )


def upsert_feature_codes(
    db_cdr: Session,
    instance_id: int,
    data: FeatureCodesData,
) -> FeatureCodesData:
    row = (
        db_cdr.query(FeatureCodesSettings)
        .filter(FeatureCodesSettings.instance_id == instance_id)
        .first()
    )
    if row is None:
        row = FeatureCodesSettings(instance_id=instance_id)
        db_cdr.add(row)
    row.vm_access = data.vm_access
    row.vm_check = data.vm_check
    row.cf_activate = data.cf_activate
    row.cf_deactivate = data.cf_deactivate
    row.dnd_activate = data.dnd_activate
    row.dnd_deactivate = data.dnd_deactivate
    row.vm_access_enabled = data.vm_access_enabled
    row.vm_check_enabled = data.vm_check_enabled
    row.cf_codes_enabled = data.cf_codes_enabled
    row.dnd_codes_enabled = data.dnd_codes_enabled
    db_cdr.flush()
    return get_feature_codes(db_cdr, instance_id)


def _vm_access_lines(code: str) -> list[str]:
    tag = MANAGED_TAG_FEATURE_CODES
    label = FEATURE_CODES_BLOCK_LABEL
    return [
        _tag_line(
            f"{code},1,NoOp(Голосовая почта ${{CALLERID(num)}})",
            tag,
            block_label=label,
        ),
        _tag_line(f"{code},n,Answer()", tag, block_label=label),
        _tag_line(f"{code},n,Wait(1)", tag, block_label=label),
        _tag_line(
            f"{code},n,VoiceMailMain(${{CALLERID(num)}}@default)",
            tag,
            block_label=label,
        ),
        _tag_line(f"{code},n,Hangup()", tag, block_label=label),
    ]


def _dnd_on_lines(code: str) -> list[str]:
    tag = MANAGED_TAG_FEATURE_CODES
    label = FEATURE_CODES_BLOCK_LABEL
    return [
        _tag_line(f"{code},1,NoOp(DND включен)", tag, block_label=label),
        _tag_line(f"{code},n,Set(DB(dnd/${{CALLERID(num)}})=1)", tag, block_label=label),
        _tag_line(f"{code},n,Playback(do-not-disturb)", tag, block_label=label),
        _tag_line(f"{code},n,Hangup()", tag, block_label=label),
    ]


def _dnd_off_lines(code: str) -> list[str]:
    tag = MANAGED_TAG_FEATURE_CODES
    label = FEATURE_CODES_BLOCK_LABEL
    return [
        _tag_line(f"{code},1,NoOp(DND выключен)", tag, block_label=label),
        _tag_line(
            f"{code},n,Set(DB(dnd/${{CALLERID(num)}})=)",
            tag,
            block_label=label,
        ),
        _tag_line(f"{code},n,Playback(deactivated)", tag, block_label=label),
        _tag_line(f"{code},n,Hangup()", tag, block_label=label),
    ]


def _cf_activate_lines(code: str) -> list[str]:
    tag = MANAGED_TAG_FEATURE_CODES
    label = FEATURE_CODES_BLOCK_LABEL
    return [
        _tag_line(f"{code},1,NoOp(Переадресация)", tag, block_label=label),
        _tag_line(f"{code},n,Answer()", tag, block_label=label),
        _tag_line(
            f"{code},n,Playback(feature-not-available)",
            tag,
            block_label=label,
        ),
        _tag_line(f"{code},n,Hangup()", tag, block_label=label),
    ]


def _build_feature_code_lines(settings: FeatureCodesData) -> list[str]:
    lines: list[str] = []
    if settings.vm_access_enabled and settings.vm_access.strip():
        lines.extend(_vm_access_lines(settings.vm_access.strip()))
    if settings.vm_check_enabled and settings.vm_check.strip():
        if settings.vm_check.strip() != settings.vm_access.strip():
            lines.extend(_vm_access_lines(settings.vm_check.strip()))
    if settings.dnd_codes_enabled:
        if settings.dnd_activate.strip():
            lines.extend(_dnd_on_lines(settings.dnd_activate.strip()))
        if settings.dnd_deactivate.strip():
            lines.extend(_dnd_off_lines(settings.dnd_deactivate.strip()))
    if settings.cf_codes_enabled:
        if settings.cf_activate.strip():
            lines.extend(_cf_activate_lines(settings.cf_activate.strip()))
        if settings.cf_deactivate.strip():
            lines.extend(_cf_activate_lines(settings.cf_deactivate.strip()))
    return lines


def sync_feature_codes_dialplan(
    db_cdr: Session,
    instance_id: int,
    instance_name: str,
    *,
    author: str = "system",
    description: str = "sync feature codes",
    reload_asterisk: bool = False,
) -> dict[str, int]:
    save_file_version(
        db_cdr,
        instance_id,
        EXTENSIONS_FILENAME,
        description,
        author,
        commit=False,
    )
    _delete_managed_rows(db_cdr, instance_id, tag=MANAGED_TAG_FEATURE_CODES)

    settings = get_feature_codes(db_cdr, instance_id)
    lines = _build_feature_code_lines(settings)
    if lines:
        cat_metric = _context_cat_metric(db_cdr, instance_id, INTERNAL_CONTEXT)
        start_var = _next_var_metric(db_cdr, instance_id, INTERNAL_CONTEXT)
        _insert_exten_rows(
            db_cdr,
            instance_id,
            INTERNAL_CONTEXT,
            cat_metric,
            lines,
            start_var_metric=start_var,
        )

    db_cdr.commit()
    if reload_asterisk:
        reload_asterisk_config(instance_name)

    return {"feature_code_rows_added": len(lines)}
