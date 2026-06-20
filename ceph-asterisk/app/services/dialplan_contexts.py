"""Список контекстов диалплана (extensions.conf) для UI и PJSIP."""

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.ast_conf import AsteriskConf
from app.services.instance_default_configs import DEFAULT_EXTENSIONS_CONTEXTS


def list_dialplan_contexts(
    db_cdr: Session,
    instance_id: int,
    filename: str = "extensions.conf",
    *,
    include_commented: bool = False,
) -> list[str]:
    """Уникальные category из ast_config, без системных контекстов Asterisk (__*)."""
    query = db_cdr.query(AsteriskConf.category).filter(
        AsteriskConf.instance_id == instance_id,
        AsteriskConf.filename == filename,
    )
    if not include_commented:
        query = query.filter(AsteriskConf.commented == 0)

    rows = (
        query.group_by(AsteriskConf.category)
        .order_by(func.min(AsteriskConf.cat_metric))
        .all()
    )
    contexts = [
        category
        for (category,) in rows
        if category and not category.startswith("__")
    ]

    if filename != "extensions.conf":
        return contexts

    seen = set(contexts)
    merged = [ctx for ctx in DEFAULT_EXTENSIONS_CONTEXTS if ctx not in seen]
    merged.extend(contexts)
    return merged
