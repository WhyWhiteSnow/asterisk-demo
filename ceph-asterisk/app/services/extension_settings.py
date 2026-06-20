"""Настройки бизнес-логики для внутренних номеров."""

from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy.orm import Session

from app.models.extension_settings import ExtensionSettings


@dataclass
class ExtensionSettingsData:
    auto_routing_enabled: bool = True
    forwarding_enabled: bool = False


def get_extension_settings(
    db_cdr: Session,
    instance_id: int,
    extension: str,
) -> ExtensionSettingsData:
    row = (
        db_cdr.query(ExtensionSettings)
        .filter(
            ExtensionSettings.instance_id == instance_id,
            ExtensionSettings.extension == extension,
        )
        .first()
    )
    if row is None:
        return ExtensionSettingsData()
    return ExtensionSettingsData(
        auto_routing_enabled=row.auto_routing_enabled,
        forwarding_enabled=row.forwarding_enabled,
    )


def is_auto_routing_enabled(
    db_cdr: Session,
    instance_id: int,
    extension: str,
) -> bool:
    return get_extension_settings(db_cdr, instance_id, extension).auto_routing_enabled


def is_forwarding_enabled(
    db_cdr: Session,
    instance_id: int,
    extension: str,
) -> bool:
    return get_extension_settings(db_cdr, instance_id, extension).forwarding_enabled


def upsert_extension_settings(
    db_cdr: Session,
    instance_id: int,
    extension: str,
    *,
    auto_routing_enabled: bool,
    forwarding_enabled: bool,
) -> ExtensionSettingsData:
    row = (
        db_cdr.query(ExtensionSettings)
        .filter(
            ExtensionSettings.instance_id == instance_id,
            ExtensionSettings.extension == extension,
        )
        .first()
    )
    if row is None:
        row = ExtensionSettings(
            instance_id=instance_id,
            extension=extension,
            auto_routing_enabled=auto_routing_enabled,
            forwarding_enabled=forwarding_enabled,
        )
        db_cdr.add(row)
    else:
        row.auto_routing_enabled = auto_routing_enabled
        row.forwarding_enabled = forwarding_enabled
    db_cdr.flush()
    return ExtensionSettingsData(
        auto_routing_enabled=row.auto_routing_enabled,
        forwarding_enabled=row.forwarding_enabled,
    )


def delete_extension_settings(
    db_cdr: Session,
    instance_id: int,
    extension: str,
) -> None:
    db_cdr.query(ExtensionSettings).filter(
        ExtensionSettings.instance_id == instance_id,
        ExtensionSettings.extension == extension,
    ).delete(synchronize_session=False)
