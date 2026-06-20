"""Дополнительные поля ps_endpoints (mohsuggest и т.д.) вне ORM-модели."""

from __future__ import annotations

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.services.pjsip_schema import ensure_pjsip_schema


def apply_endpoint_moh_class(
    db_cdr: Session,
    endpoint_pk: int,
    moh_class: str | None,
) -> None:
    ensure_pjsip_schema(db_cdr)
    value = (moh_class or "").strip() or None
    db_cdr.execute(
        text("UPDATE ps_endpoints SET mohsuggest = :moh WHERE pk = :pk"),
        {"moh": value, "pk": endpoint_pk},
    )
