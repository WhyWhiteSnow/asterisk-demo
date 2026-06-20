"""Автогенерация диалплана для внутренних номеров и переадресации."""

from __future__ import annotations

from sqlalchemy.orm import Session, joinedload

from app.models.ast_conf import AsteriskConf
from app.models.extension_forwarding import ExtensionForwarding
from app.services.extension_settings import get_extension_settings
from app.models.sip_user import PjsipAor, PjsipEndpoint
from app.services.ast_config_history import save_file_version
from app.services.asterisk_reload import reload_asterisk_config

EXTENSIONS_FILENAME = "extensions.conf"
INTERNAL_CONTEXT = "from-internal"
EXTERNAL_CONTEXT = "from-external"
PATTERN_EXTEN = "_XXX"
DEFAULT_DIAL_TIMEOUT = 30

MANAGED_TAG_EXTENSION_ROUTING = "@managed:extension_routing"
MANAGED_TAG_TEMPLATE = "@managed:template"
MANAGED_TAGS = (MANAGED_TAG_EXTENSION_ROUTING, MANAGED_TAG_TEMPLATE)

DialplanLine = tuple[str, str]


def is_managed_var_val(var_val: str) -> bool:
    return any(tag in var_val for tag in MANAGED_TAGS)


def managed_tag_for_var_val(var_val: str) -> str | None:
    for tag in MANAGED_TAGS:
        if tag in var_val:
            return tag
    return None


def _tag_line(line: str, tag: str) -> str:
    if tag in line:
        return line
    return f"{line};{tag}"


def _context_cat_metric(db_cdr: Session, instance_id: int, category: str) -> int:
    row = (
        db_cdr.query(AsteriskConf.cat_metric)
        .filter(
            AsteriskConf.instance_id == instance_id,
            AsteriskConf.filename == EXTENSIONS_FILENAME,
            AsteriskConf.category == category,
        )
        .order_by(AsteriskConf.cat_metric.asc())
        .first()
    )
    if row is not None:
        return row[0]
    max_metric = (
        db_cdr.query(AsteriskConf.cat_metric)
        .filter(
            AsteriskConf.instance_id == instance_id,
            AsteriskConf.filename == EXTENSIONS_FILENAME,
        )
        .order_by(AsteriskConf.cat_metric.desc())
        .limit(1)
        .scalar()
    )
    return (max_metric or 0) + 1


def _delete_managed_rows(
    db_cdr: Session,
    instance_id: int,
    *,
    tag: str | None = None,
) -> None:
    query = db_cdr.query(AsteriskConf).filter(
        AsteriskConf.instance_id == instance_id,
        AsteriskConf.filename == EXTENSIONS_FILENAME,
    )
    if tag is not None:
        query = query.filter(AsteriskConf.var_val.contains(tag))
    else:
        from sqlalchemy import or_

        query = query.filter(
            or_(*[AsteriskConf.var_val.contains(managed_tag) for managed_tag in MANAGED_TAGS])
        )
    query.delete(synchronize_session=False)


def _next_var_metric(db_cdr: Session, instance_id: int, category: str) -> int:
    max_metric = (
        db_cdr.query(AsteriskConf.var_metric)
        .filter(
            AsteriskConf.instance_id == instance_id,
            AsteriskConf.filename == EXTENSIONS_FILENAME,
            AsteriskConf.category == category,
        )
        .order_by(AsteriskConf.var_metric.desc())
        .limit(1)
        .scalar()
    )
    return max_metric or 0


def _insert_exten_rows(
    db_cdr: Session,
    instance_id: int,
    category: str,
    cat_metric: int,
    lines: list[str],
    *,
    start_var_metric: int | None = None,
) -> None:
    var_metric = start_var_metric if start_var_metric is not None else _next_var_metric(
        db_cdr, instance_id, category
    )
    for line in lines:
        var_metric += 1
        db_cdr.add(
            AsteriskConf(
                instance_id=instance_id,
                filename=EXTENSIONS_FILENAME,
                category=category,
                var_name="exten",
                var_val=line,
                cat_metric=cat_metric,
                var_metric=var_metric,
            )
        )


def list_instance_extensions(
    db_cdr: Session,
    instance_name: str,
) -> list[PjsipEndpoint]:
    return (
        db_cdr.query(PjsipEndpoint)
        .options(joinedload(PjsipEndpoint.aors_fk))
        .join(PjsipAor, PjsipEndpoint.aors_id == PjsipAor.pk)
        .filter(PjsipAor.reg_server == instance_name)
        .order_by(PjsipEndpoint.id.asc())
        .all()
    )


def list_forwarding_rules(
    db_cdr: Session,
    instance_id: int,
    extension: str,
) -> list[ExtensionForwarding]:
    return (
        db_cdr.query(ExtensionForwarding)
        .filter(
            ExtensionForwarding.instance_id == instance_id,
            ExtensionForwarding.extension == extension,
            ExtensionForwarding.enabled.is_(True),
        )
        .all()
    )


def _dial_target(target_type: str, target_value: str, extension: str) -> str:
    if target_type == "voicemail":
        mailbox = target_value or extension
        return f"VoiceMail({mailbox}@default)"
    return f"Dial(PJSIP/{target_value},{DEFAULT_DIAL_TIMEOUT})"


def _build_extension_lines(
    extension: str,
    *,
    forwarding_rules: list[ExtensionForwarding],
    has_voicemail: bool = True,
) -> list[str]:
    tag = MANAGED_TAG_EXTENSION_ROUTING
    done_label = f"{extension}_done"
    cfu = next((r for r in forwarding_rules if r.forward_type == "cfu"), None)
    cfna = next((r for r in forwarding_rules if r.forward_type == "cfna"), None)
    cfb = next((r for r in forwarding_rules if r.forward_type == "cfb"), None)

    lines: list[str] = [
        _tag_line(
            f"{extension},1,NoOp(Вызов на {extension} от ${{CALLERID(num)}})",
            tag,
        ),
    ]

    if cfu is not None:
        lines.append(
            _tag_line(
                f"{extension},n,{_dial_target(cfu.target_type, cfu.target_value, extension)}",
                tag,
            )
        )
        lines.append(_tag_line(f"{extension},n,Hangup()", tag))
        return lines

    dial_timeout = cfna.timeout_seconds if cfna is not None else DEFAULT_DIAL_TIMEOUT
    lines.append(
        _tag_line(f"{extension},n,Dial(PJSIP/{extension},{dial_timeout})", tag)
    )
    lines.append(
        _tag_line(
            f'{extension},n,GotoIf($["${{DIALSTATUS}}"="ANSWER"]?{done_label})',
            tag,
        )
    )

    if cfb is not None:
        lines.append(
            _tag_line(
                f'{extension},n,GotoIf($["${{DIALSTATUS}}"="BUSY"]?{extension}_cfb)',
                tag,
            )
        )

    if cfna is not None:
        lines.append(
            _tag_line(
                f"{extension},n,{_dial_target(cfna.target_type, cfna.target_value, extension)}",
                tag,
            )
        )
    elif has_voicemail:
        lines.append(_tag_line(f"{extension},n,VoiceMail({extension}@default)", tag))
    else:
        lines.append(_tag_line(f"{extension},n,Hangup()", tag))

    if cfb is not None:
        lines.append(
            _tag_line(
                f"{extension},n({extension}_cfb),"
                f"{_dial_target(cfb.target_type, cfb.target_value, extension)}",
                tag,
            )
        )
        if has_voicemail:
            lines.append(_tag_line(f"{extension},n,VoiceMail({extension}@default)", tag))

    lines.append(_tag_line(f"{extension},n,Hangup()", tag))
    lines.append(_tag_line(f"{extension},n({done_label}),Hangup()", tag))
    return lines


def _build_pattern_lines() -> list[str]:
    tag = MANAGED_TAG_EXTENSION_ROUTING
    return [
        _tag_line(
            f"{PATTERN_EXTEN},1,NoOp(Внутренний звонок ${{CALLERID(num)}} -> ${{EXTEN}})",
            tag,
        ),
        _tag_line(f"{PATTERN_EXTEN},n,Dial(PJSIP/${{EXTEN}},{DEFAULT_DIAL_TIMEOUT})", tag),
        _tag_line(
            f'{PATTERN_EXTEN},n,GotoIf($["${{DIALSTATUS}}"="ANSWER"]?pattern_done)',
            tag,
        ),
        _tag_line(f"{PATTERN_EXTEN},n,VoiceMail(${{EXTEN}}@default)", tag),
        _tag_line(f"{PATTERN_EXTEN},n,Hangup()", tag),
        _tag_line(f"{PATTERN_EXTEN},n(pattern_done),Hangup()", tag),
    ]


def build_template_dialplan_lines(
    context: str,
    lines: list[str],
) -> list[tuple[str, list[str]]]:
    tagged = [_tag_line(line, MANAGED_TAG_TEMPLATE) for line in lines]
    return [(context, tagged)]


def sync_extension_dialplan(
    db_cdr: Session,
    instance_id: int,
    instance_name: str,
    *,
    author: str = "system",
    description: str = "sync extension routing",
    reload_asterisk: bool = False,
    preserve_template_rows: bool = True,
) -> dict[str, int]:
    """Пересобирает managed-строки маршрутизации в extensions.conf."""
    save_file_version(
        db_cdr,
        instance_id,
        EXTENSIONS_FILENAME,
        description,
        author,
        commit=False,
    )

    _delete_managed_rows(db_cdr, instance_id, tag=MANAGED_TAG_EXTENSION_ROUTING)

    extensions = list_instance_extensions(db_cdr, instance_name)
    contexts: dict[str, list[str]] = {}

    for endpoint in extensions:
        settings = get_extension_settings(db_cdr, instance_id, endpoint.id)
        if not settings.auto_routing_enabled:
            continue
        context = endpoint.context or INTERNAL_CONTEXT
        rules = (
            list_forwarding_rules(db_cdr, instance_id, endpoint.id)
            if settings.forwarding_enabled
            else []
        )
        lines = _build_extension_lines(
            endpoint.id,
            forwarding_rules=rules,
            has_voicemail=bool(endpoint.mailboxes),
        )
        contexts.setdefault(context, []).extend(lines)

    internal_cat = _context_cat_metric(db_cdr, instance_id, INTERNAL_CONTEXT)
    contexts.setdefault(INTERNAL_CONTEXT, []).extend(_build_pattern_lines())

    rows_added = 0
    for context, lines in sorted(contexts.items()):
        cat_metric = (
            internal_cat
            if context == INTERNAL_CONTEXT
            else _context_cat_metric(db_cdr, instance_id, context)
        )
        start_var = _next_var_metric(db_cdr, instance_id, context)
        _insert_exten_rows(
            db_cdr,
            instance_id,
            context,
            cat_metric,
            lines,
            start_var_metric=start_var,
        )
        rows_added += len(lines)

    if not preserve_template_rows:
        _delete_managed_rows(db_cdr, instance_id, tag=MANAGED_TAG_TEMPLATE)

    db_cdr.commit()

    if reload_asterisk:
        reload_asterisk_config(instance_name)

    return {
        "extensions_synced": len(extensions),
        "dialplan_rows_added": rows_added,
    }


def insert_template_dialplan(
    db_cdr: Session,
    instance_id: int,
    fragments: list[tuple[str, list[str]]],
    *,
    author: str = "template",
    description: str = "apply template dialplan",
) -> int:
    save_file_version(
        db_cdr,
        instance_id,
        EXTENSIONS_FILENAME,
        description,
        author,
        commit=False,
    )
    rows_added = 0
    for context, lines in fragments:
        cat_metric = _context_cat_metric(db_cdr, instance_id, context)
        _insert_exten_rows(db_cdr, instance_id, context, cat_metric, lines)
        rows_added += len(lines)
    db_cdr.commit()
    return rows_added


def count_managed_rows(db_cdr: Session, instance_id: int) -> dict[str, int]:
    counts: dict[str, int] = {}
    for tag in MANAGED_TAGS:
        counts[tag] = (
            db_cdr.query(AsteriskConf)
            .filter(
                AsteriskConf.instance_id == instance_id,
                AsteriskConf.filename == EXTENSIONS_FILENAME,
                AsteriskConf.var_val.contains(tag),
            )
            .count()
        )
    return counts
