"""Описание шаблонов типовых сценариев ВАТС."""

from __future__ import annotations

from dataclasses import dataclass, field

from app.schemas.forwarding import ForwardTargetType, ForwardType, ForwardingRule
from app.schemas.queue import QueueCreate
from app.schemas.voicemail import VoicemailCreate


@dataclass(frozen=True)
class TemplateExtensionSeed:
    username: str
    password: str
    callerid: str
    context: str = "from-internal"


@dataclass(frozen=True)
class TemplateForwardingSeed:
    extension: str
    forward_type: ForwardType
    target_type: ForwardTargetType
    target_value: str
    timeout_seconds: int = 15


@dataclass(frozen=True)
class TemplateDialplanFragment:
    context: str
    lines: tuple[str, ...]


@dataclass(frozen=True)
class VatcTemplate:
    id: str
    name: str
    description: str
    category: str
    preview_items: tuple[str, ...]
    create_test_users: bool = True
    extensions: tuple[TemplateExtensionSeed, ...] = ()
    voicemail_boxes: tuple[VoicemailCreate, ...] = ()
    queues: tuple[QueueCreate, ...] = ()
    forwarding_rules: tuple[TemplateForwardingSeed, ...] = ()
    dialplan_fragments: tuple[TemplateDialplanFragment, ...] = ()


def _office_extensions() -> tuple[TemplateExtensionSeed, ...]:
    return (
        TemplateExtensionSeed("101", "strongpassword", "Оператор 101"),
        TemplateExtensionSeed("102", "testpass102", "Оператор 102"),
    )


def _office_voicemail() -> tuple[VoicemailCreate, ...]:
    return (
        VoicemailCreate(
            mailbox="101",
            password="4242",
            full_name="Оператор 101",
            link_endpoint_mwi=True,
        ),
        VoicemailCreate(
            mailbox="102",
            password="4242",
            full_name="Оператор 102",
            link_endpoint_mwi=True,
        ),
    )


VATC_TEMPLATES: dict[str, VatcTemplate] = {
    "office_basic": VatcTemplate(
        id="office_basic",
        name="Офис: базовый",
        description="Малый офис: внутренние номера, звонки между сотрудниками, голосовая почта.",
        category="office",
        preview_items=(
            "2 внутренних номера (101, 102)",
            "Правило набора _XXX",
            "Голосовая почта на каждый номер",
        ),
        extensions=_office_extensions(),
        voicemail_boxes=_office_voicemail(),
    ),
    "office_with_forwarding": VatcTemplate(
        id="office_with_forwarding",
        name="Офис с переадресацией",
        description="Офис с примером замещения: при неответе 101 звонок уходит на 102.",
        category="office",
        preview_items=(
            "2 внутренних номера (101, 102)",
            "CFNA: 101 → 102 (15 сек)",
            "Голосовая почта",
        ),
        extensions=_office_extensions(),
        voicemail_boxes=_office_voicemail(),
        forwarding_rules=(
            TemplateForwardingSeed(
                extension="101",
                forward_type=ForwardType.CFNA,
                target_type=ForwardTargetType.EXTENSION,
                target_value="102",
                timeout_seconds=15,
            ),
        ),
    ),
    "support_queue": VatcTemplate(
        id="support_queue",
        name="Линия поддержки",
        description="Очередь support и короткий номер 8000 для входящих на линию поддержки.",
        category="support",
        preview_items=(
            "Очередь support (101, 102)",
            "Короткий номер 8000 → очередь",
            "2 оператора",
        ),
        extensions=_office_extensions(),
        voicemail_boxes=_office_voicemail(),
        queues=(
            QueueCreate(
                name="support",
                strategy="rrmemory",
                timeout=20,
                retry=5,
                musicclass="default",
                members=["PJSIP/101", "PJSIP/102"],
            ),
        ),
        dialplan_fragments=(
            TemplateDialplanFragment(
                context="from-internal",
                lines=(
                    "8000,1,NoOp(Очередь support)",
                    "8000,n,Answer()",
                    "8000,n,Queue(support,t,,,300)",
                    "8000,n,Hangup()",
                ),
            ),
        ),
    ),
    "after_hours_vm": VatcTemplate(
        id="after_hours_vm",
        name="Вне рабочего времени",
        description="Входящий на 777: попытка дозвона до 101, затем голосовая почта.",
        category="retail",
        preview_items=(
            "Входящий номер 777",
            "Попытка дозвона до 101 (20 сек)",
            "Голосовая почта при неответе",
            "Полное расписание — в следующей версии",
        ),
        extensions=(
            TemplateExtensionSeed("101", "strongpassword", "Дежурный 101"),
        ),
        voicemail_boxes=(
            VoicemailCreate(
                mailbox="101",
                password="4242",
                full_name="Дежурный 101",
                link_endpoint_mwi=True,
            ),
        ),
        dialplan_fragments=(
            TemplateDialplanFragment(
                context="from-external",
                lines=(
                    "777,1,NoOp(Входящий на 777 от ${CALLERID(all)})",
                    "777,n,Answer()",
                    "777,n,Dial(PJSIP/101,20)",
                    '777,n,GotoIf($["${DIALSTATUS}"="ANSWER"]?ext777_done)',
                    "777,n,VoiceMail(101@default)",
                    "777,n,Hangup()",
                    "777,n(ext777_done),Hangup()",
                ),
            ),
            TemplateDialplanFragment(
                context="from-internal",
                lines=(
                    "777,1,NoOp(Сервис 777 от ${CALLERID(num)})",
                    "777,n,Answer()",
                    "777,n,Dial(PJSIP/101,20)",
                    '777,n,GotoIf($["${DIALSTATUS}"="ANSWER"]?int777_done)',
                    "777,n,VoiceMail(101@default)",
                    "777,n,Hangup()",
                    "777,n(int777_done),Hangup()",
                ),
            ),
        ),
    ),
}


def list_templates() -> list[VatcTemplate]:
    return list(VATC_TEMPLATES.values())


def get_template(template_id: str) -> VatcTemplate | None:
    return VATC_TEMPLATES.get(template_id)
