"""Валидация и подбор портов для экземпляров Asterisk."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.models.asterisk_instance import AsteriskInstance
from app.utils.api_errors import raise_ports_conflict, raise_rtp_range_invalid

RTP_BLOCK_SIZE = 100
DEFAULT_SIP_PORT = 5060
DEFAULT_HTTP_PORT = 8088
DEFAULT_AMI_PORT = 5038
DEFAULT_RTP_START = 10000


def rtp_ranges_overlap(start1: int, end1: int, start2: int, end2: int) -> bool:
    return start1 <= end2 and start2 <= end1


def validate_rtp_range(rtp_start: int, rtp_end: int) -> None:
    if rtp_start >= rtp_end:
        raise_rtp_range_invalid(
            "Начало RTP-диапазона (rtp_port_start) должно быть меньше конца (rtp_port_end)"
        )


def find_port_conflicts(
    sip_port: int,
    http_port: int,
    ami_port: int,
    rtp_start: int,
    rtp_end: int,
    instances: list[AsteriskInstance],
    *,
    exclude_id: int | None = None,
) -> list[str]:
    conflicts: list[str] = []
    for inst in instances:
        if exclude_id is not None and inst.id == exclude_id:
            continue
        if inst.sip_port == sip_port:
            conflicts.append(f"SIP ({sip_port})")
        if inst.http_port == http_port:
            conflicts.append(f"HTTP ({http_port})")
        if inst.ami_port == ami_port:
            conflicts.append(f"AMI ({ami_port})")
        if rtp_ranges_overlap(rtp_start, rtp_end, inst.rtp_port_start, inst.rtp_port_end):
            conflicts.append(
                f"RTP ({rtp_start}–{rtp_end} пересекается с "
                f"{inst.rtp_port_start}–{inst.rtp_port_end}, ВАТС «{inst.name}»)"
            )
    return conflicts


def assert_ports_available(
    db: Session,
    *,
    sip_port: int,
    http_port: int,
    ami_port: int,
    rtp_start: int,
    rtp_end: int,
    exclude_id: int | None = None,
) -> None:
    validate_rtp_range(rtp_start, rtp_end)
    instances = db.query(AsteriskInstance).all()
    conflicts = find_port_conflicts(
        sip_port,
        http_port,
        ami_port,
        rtp_start,
        rtp_end,
        instances,
        exclude_id=exclude_id,
    )
    if conflicts:
        raise_ports_conflict(conflicts)


def collect_used_ports(db: Session) -> dict:
    instances = db.query(AsteriskInstance).all()
    return {
        "sip": sorted({i.sip_port for i in instances}),
        "http": sorted({i.http_port for i in instances}),
        "ami": sorted({i.ami_port for i in instances}),
        "rtp_ranges": [
            {"start": i.rtp_port_start, "end": i.rtp_port_end} for i in instances
        ],
    }


def allocate_ports(db: Session) -> dict[str, int]:
    used = collect_used_ports(db)

    sip_port = max(used["sip"], default=DEFAULT_SIP_PORT - 1) + 1

    http_port = DEFAULT_HTTP_PORT
    while http_port in used["http"]:
        http_port += 1

    ami_port = DEFAULT_AMI_PORT
    while ami_port in used["ami"]:
        ami_port += 1

    rtp_start = DEFAULT_RTP_START
    while True:
        rtp_end = rtp_start + RTP_BLOCK_SIZE - 1
        overlap = any(
            rtp_ranges_overlap(rtp_start, rtp_end, r["start"], r["end"])
            for r in used["rtp_ranges"]
        )
        if not overlap:
            break
        rtp_start += RTP_BLOCK_SIZE

    return {
        "sip_port": sip_port,
        "http_port": http_port,
        "ami_port": ami_port,
        "rtp_port_start": rtp_start,
        "rtp_port_end": rtp_end,
    }
