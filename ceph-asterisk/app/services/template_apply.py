"""Применение шаблонов ВАТС к инстансу."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.models.asterisk_instance import AsteriskInstance
from app.schemas.forwarding import ForwardingRule
from app.schemas.template import ApplyTemplateRequest, ApplyTemplateResult, TemplateInfo
from app.services.extension_routing import (
    build_template_dialplan_lines,
    insert_template_dialplan,
    sync_extension_dialplan,
)
from app.services.extension_settings import upsert_extension_settings
from app.services.forwarding_config import upsert_forwarding_rule
from app.services.instance_pjsip_seed import seed_default_pjsip_users
from app.services.pjsip_disk_sync import write_pjsip_users_conf
from app.services.queue_config import create_queue, get_queue
from app.services.vatc_templates import VatcTemplate, get_template, list_templates
from app.services.voicemail_config import create_voicemail_box, mailbox_exists


def list_template_info() -> list[TemplateInfo]:
    return [
        TemplateInfo(
            id=template.id,
            name=template.name,
            description=template.description,
            category=template.category,
            preview_items=list(template.preview_items),
        )
        for template in list_templates()
    ]


def _seed_extensions(
    cdr_db: Session,
    instance: AsteriskInstance,
    transport_type: str,
    template: VatcTemplate,
) -> list[str]:
    if not template.extensions:
        return []
    users = tuple(
        {
            "username": ext.username,
            "password": ext.password,
            "callerid": ext.callerid,
            "context": ext.context,
        }
        for ext in template.extensions
    )
    return seed_default_pjsip_users(
        cdr_db,
        instance.name,
        transport_type,
        test_users=users,
    )


def _seed_voicemail(
    cdr_db: Session,
    db: Session,
    instance: AsteriskInstance,
    template: VatcTemplate,
) -> int:
    created = 0
    for box in template.voicemail_boxes:
        if mailbox_exists(cdr_db, instance.id, box.mailbox, box.context):
            continue
        create_voicemail_box(
            cdr_db,
            instance.id,
            instance.name,
            box,
            instance=instance,
            db=db,
        )
        created += 1
    return created


def _seed_queues(cdr_db: Session, instance_id: int, template: VatcTemplate) -> int:
    created = 0
    for queue_data in template.queues:
        if get_queue(cdr_db, instance_id, queue_data.name) is not None:
            continue
        create_queue(
            cdr_db,
            instance_id,
            queue_data,
            author="template",
        )
        created += 1
    return created


def _seed_forwarding(cdr_db: Session, instance_id: int, template: VatcTemplate) -> int:
    created = 0
    for seed in template.forwarding_rules:
        upsert_forwarding_rule(
            cdr_db,
            instance_id,
            seed.extension,
            ForwardingRule(
                forward_type=seed.forward_type,
                target_type=seed.target_type,
                target_value=seed.target_value,
                timeout_seconds=seed.timeout_seconds,
                enabled=True,
            ),
        )
        created += 1
    return created


def apply_template(
    db: Session,
    cdr_db: Session,
    instance: AsteriskInstance,
    body: ApplyTemplateRequest,
    *,
    transport_type: str = "udp",
) -> ApplyTemplateResult:
    template = get_template(body.template_id)
    if template is None:
        raise ValueError(f"Unknown template: {body.template_id}")

    extensions_created = _seed_extensions(cdr_db, instance, transport_type, template)
    voicemail_created = _seed_voicemail(cdr_db, db, instance, template)
    queues_created = _seed_queues(cdr_db, instance.id, template)
    forwarding_created = _seed_forwarding(cdr_db, instance.id, template)

    for ext_username in extensions_created:
        has_forwarding = any(
            seed.extension == ext_username for seed in template.forwarding_rules
        )
        upsert_extension_settings(
            cdr_db,
            instance.id,
            ext_username,
            auto_routing_enabled=True,
            forwarding_enabled=has_forwarding,
        )

    dialplan_rows = 0
    if template.dialplan_fragments:
        fragments = [
            build_template_dialplan_lines(fragment.context, list(fragment.lines))
            for fragment in template.dialplan_fragments
        ]
        flat_fragments = [item for sublist in fragments for item in sublist]
        dialplan_rows = insert_template_dialplan(
            cdr_db,
            instance.id,
            flat_fragments,
            author=body.change_author or "template",
            description=f"apply template {template.id}",
        )

    routing_result = sync_extension_dialplan(
        cdr_db,
        instance.id,
        instance.name,
        author=body.change_author or "template",
        description=f"sync routing after template {template.id}",
        reload_asterisk=body.reload_asterisk,
    )

    write_pjsip_users_conf(instance, cdr_db)

    return ApplyTemplateResult(
        template_id=template.id,
        template_name=template.name,
        extensions_created=extensions_created,
        voicemail_boxes_created=voicemail_created,
        queues_created=queues_created,
        forwarding_rules_created=forwarding_created,
        dialplan_rows_added=dialplan_rows + routing_result["dialplan_rows_added"],
        message=f"Шаблон «{template.name}» применён",
    )
