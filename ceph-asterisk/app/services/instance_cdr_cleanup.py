"""Очистка CDR-данных ВАТС (PJSIP, настройки расширений и т.д.)."""

from __future__ import annotations

import logging

from sqlalchemy.orm import Session

from app.models.extension_forwarding import ExtensionForwarding
from app.models.extension_settings import ExtensionSettings
from app.models.feature_codes_settings import FeatureCodesSettings
from app.models.incoming_route import IncomingRoute
from app.models.sip_user import PjsipAor, PjsipAuth, PjsipEndpoint

logger = logging.getLogger(__name__)


def delete_pjsip_data_for_reg_server(db_cdr: Session, reg_server: str) -> int:
    """Удаляет ps_endpoints/ps_auths/ps_aors, привязанные к имени ВАТС (reg_server)."""
    endpoints = (
        db_cdr.query(PjsipEndpoint)
        .join(PjsipAor, PjsipEndpoint.aors_id == PjsipAor.pk)
        .filter(PjsipAor.reg_server == reg_server)
        .all()
    )
    if not endpoints:
        return 0

    deleted = 0
    seen_aor_pks: set[int] = set()
    seen_auth_pks: set[int] = set()

    for endpoint in endpoints:
        auth_obj = endpoint.auths_fk
        aor_obj = endpoint.aors_fk
        db_cdr.delete(endpoint)
        deleted += 1
        if auth_obj and auth_obj.pk not in seen_auth_pks:
            db_cdr.delete(auth_obj)
            seen_auth_pks.add(auth_obj.pk)
        if aor_obj and aor_obj.pk not in seen_aor_pks:
            db_cdr.delete(aor_obj)
            seen_aor_pks.add(aor_obj.pk)

    db_cdr.commit()
    logger.info("Deleted %s PJSIP endpoint(s) for reg_server=%s", deleted, reg_server)
    return deleted


def purge_instance_cdr_data(db_cdr: Session, instance_id: int, reg_server: str) -> None:
    """Полная очистка данных ВАТС в CDR перед удалением инстанса или пересозданием с тем же именем."""
    db_cdr.query(ExtensionForwarding).filter(
        ExtensionForwarding.instance_id == instance_id
    ).delete(synchronize_session=False)
    db_cdr.query(ExtensionSettings).filter(
        ExtensionSettings.instance_id == instance_id
    ).delete(synchronize_session=False)
    db_cdr.query(IncomingRoute).filter(
        IncomingRoute.instance_id == instance_id
    ).delete(synchronize_session=False)
    db_cdr.query(FeatureCodesSettings).filter(
        FeatureCodesSettings.instance_id == instance_id
    ).delete(synchronize_session=False)
    db_cdr.commit()

    delete_pjsip_data_for_reg_server(db_cdr, reg_server)
