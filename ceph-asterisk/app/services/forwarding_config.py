"""CRUD правил переадресации звонков."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy.orm import Session

from app.models.extension_forwarding import ExtensionForwarding
from app.schemas.forwarding import (
    ExtensionForwardingUpdate,
    ForwardingRule,
    ForwardingRuleResponse,
)
from app.services.extension_routing import sync_business_dialplan


def get_forwarding_for_extension(
    db_cdr: Session,
    instance_id: int,
    extension: str,
) -> list[ForwardingRuleResponse]:
    rows = (
        db_cdr.query(ExtensionForwarding)
        .filter(
            ExtensionForwarding.instance_id == instance_id,
            ExtensionForwarding.extension == extension,
        )
        .order_by(ExtensionForwarding.forward_type.asc())
        .all()
    )
    return [ForwardingRuleResponse.model_validate(row) for row in rows]


def replace_forwarding_rules(
    db_cdr: Session,
    instance_id: int,
    instance_name: str,
    extension: str,
    body: ExtensionForwardingUpdate,
) -> list[ForwardingRuleResponse]:
    db_cdr.query(ExtensionForwarding).filter(
        ExtensionForwarding.instance_id == instance_id,
        ExtensionForwarding.extension == extension,
    ).delete(synchronize_session=False)

    now = datetime.utcnow()
    for rule in body.rules:
        db_cdr.add(
            ExtensionForwarding(
                instance_id=instance_id,
                extension=extension,
                forward_type=rule.forward_type.value,
                target_type=rule.target_type.value,
                target_value=rule.target_value.strip(),
                timeout_seconds=rule.timeout_seconds,
                enabled=rule.enabled,
                updated_at=now,
            )
        )
    db_cdr.flush()

    sync_business_dialplan(
        db_cdr,
        instance_id,
        instance_name,
        author=body.change_author or "api",
        description=f"update forwarding for {extension}",
        reload_asterisk=body.reload_asterisk,
    )

    return get_forwarding_for_extension(db_cdr, instance_id, extension)


def upsert_forwarding_rule(
    db_cdr: Session,
    instance_id: int,
    extension: str,
    rule: ForwardingRule,
) -> None:
    existing = (
        db_cdr.query(ExtensionForwarding)
        .filter(
            ExtensionForwarding.instance_id == instance_id,
            ExtensionForwarding.extension == extension,
            ExtensionForwarding.forward_type == rule.forward_type.value,
        )
        .first()
    )
    now = datetime.utcnow()
    if existing is not None:
        existing.target_type = rule.target_type.value
        existing.target_value = rule.target_value.strip()
        existing.timeout_seconds = rule.timeout_seconds
        existing.enabled = rule.enabled
        existing.updated_at = now
        return

    db_cdr.add(
        ExtensionForwarding(
            instance_id=instance_id,
            extension=extension,
            forward_type=rule.forward_type.value,
            target_type=rule.target_type.value,
            target_value=rule.target_value.strip(),
            timeout_seconds=rule.timeout_seconds,
            enabled=rule.enabled,
            updated_at=now,
        )
    )
