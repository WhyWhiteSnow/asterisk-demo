"""Смена типа SIP-транспорта ВАТС (pjsip.conf + endpoints в БД)."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.models.asterisk_instance import AsteriskInstance
from app.models.sip_user import PjsipAor, PjsipEndpoint
from app.services.asterisk_reload import AsteriskReloadError, reload_asterisk_config
from app.services.pjsip_disk_sync import write_pjsip_users_conf
from app.utils.pjsip_nat import apply_transport_type_on_disk


def update_endpoints_transport(
    db_cdr: Session,
    instance_name: str,
    transport_type: str,
) -> int:
    transport_value = f"transport-{transport_type}"
    endpoints = (
        db_cdr.query(PjsipEndpoint)
        .join(PjsipAor, PjsipEndpoint.aors_id == PjsipAor.pk)
        .filter(PjsipAor.reg_server == instance_name)
        .all()
    )

    changed = 0
    for endpoint in endpoints:
        if endpoint.transport != transport_value:
            endpoint.transport = transport_value
            changed += 1

    if changed:
        db_cdr.commit()
    return changed


def apply_instance_transport_change(
    instance: AsteriskInstance,
    transport_type: str,
    db_cdr: Session,
    *,
    reload_asterisk: bool = False,
) -> bool:
    changed_on_disk = apply_transport_type_on_disk(instance, transport_type)
    changed_in_db = update_endpoints_transport(db_cdr, instance.name, transport_type) > 0

    if changed_on_disk or changed_in_db:
        write_pjsip_users_conf(instance, db_cdr)

    if reload_asterisk and instance.status == "running":
        try:
            reload_asterisk_config(instance.name)
        except AsteriskReloadError:
            pass

    return changed_on_disk or changed_in_db
