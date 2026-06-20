"""Генерация managed-строк входящих маршрутов (DID) в extensions.conf."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.models.incoming_route import IncomingRoute
from app.services.ast_config_history import save_file_version
from app.services.extension_routing import (
    EXTENSIONS_FILENAME,
    EXTERNAL_CONTEXT,
    MANAGED_TAG_INCOMING,
    _context_cat_metric,
    _delete_managed_rows,
    _insert_exten_rows,
    _next_var_metric,
    _tag_line,
)
from app.services.asterisk_reload import reload_asterisk_config

INCOMING_BLOCK_LABEL = "incoming_routes"


def list_incoming_routes(db_cdr: Session, instance_id: int) -> list[IncomingRoute]:
    return (
        db_cdr.query(IncomingRoute)
        .filter(IncomingRoute.instance_id == instance_id)
        .order_by(IncomingRoute.sort_order.asc(), IncomingRoute.id.asc())
        .all()
    )


def _destination_app(
    destination_type: str,
    destination_value: str,
) -> str:
    match destination_type:
        case "extension":
            return f"Dial(PJSIP/{destination_value},30)"
        case "queue":
            return f"Queue({destination_value},t,,,300)"
        case "voicemail":
            mailbox = destination_value or "default"
            if "@" not in mailbox:
                mailbox = f"{mailbox}@default"
            return f"VoiceMail({mailbox})"
        case "ivr":
            return (
                f"Background({destination_value}),WaitExten(5)"
            )
        case _:
            return f"Goto({destination_value},1,1)"


def _build_incoming_lines(route: IncomingRoute) -> list[str]:
    tag = MANAGED_TAG_INCOMING
    block_label = INCOMING_BLOCK_LABEL
    did = route.did
    desc = route.description or f"DID {did}"
    dest = _destination_app(route.destination_type, route.destination_value)

    lines = [
        _tag_line(f"{did},1,NoOp({desc})", tag, block_label=block_label),
        _tag_line(f"{did},n,Answer()", tag, block_label=block_label),
    ]
    if route.destination_type == "ivr":
        audio = route.destination_value or "welcome"
        lines.append(
            _tag_line(f"{did},n,Background({audio})", tag, block_label=block_label)
        )
        lines.append(_tag_line(f"{did},n,WaitExten(5)", tag, block_label=block_label))
    else:
        lines.append(_tag_line(f"{did},n,{dest}", tag, block_label=block_label))
    lines.append(_tag_line(f"{did},n,Hangup()", tag, block_label=block_label))
    return lines


def sync_incoming_routes_dialplan(
    db_cdr: Session,
    instance_id: int,
    instance_name: str,
    *,
    author: str = "system",
    description: str = "sync incoming routes",
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
    _delete_managed_rows(db_cdr, instance_id, tag=MANAGED_TAG_INCOMING)

    routes = [
        route for route in list_incoming_routes(db_cdr, instance_id) if route.enabled
    ]
    contexts: dict[str, list[str]] = {}
    for route in routes:
        contexts.setdefault(route.context or EXTERNAL_CONTEXT, []).extend(
            _build_incoming_lines(route)
        )

    rows_added = 0
    for context, lines in sorted(contexts.items()):
        cat_metric = _context_cat_metric(db_cdr, instance_id, context)
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

    db_cdr.commit()
    if reload_asterisk:
        reload_asterisk_config(instance_name)

    return {"routes_synced": len(routes), "dialplan_rows_added": rows_added}
