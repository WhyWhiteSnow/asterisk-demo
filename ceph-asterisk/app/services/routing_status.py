"""Человекочитаемый статус маршрутизации номера для UI."""

from __future__ import annotations

from app.models.extension_forwarding import ExtensionForwarding
from app.services.extension_settings import ExtensionSettingsData

FORWARD_TYPE_LABELS = {
    "cfu": "CFU",
    "cfna": "CFNA",
    "cfb": "CFB",
}


def build_routing_status_label(
    settings: ExtensionSettingsData,
    forwarding_rules: list[ExtensionForwarding],
) -> str:
    if not settings.auto_routing_enabled:
        return "Авто: выкл"

    parts: list[str] = ["Маршрут: активен"]

    for rule in forwarding_rules:
        if not rule.enabled:
            continue
        label = FORWARD_TYPE_LABELS.get(rule.forward_type, rule.forward_type.upper())
        target = rule.target_value or rule.target_type
        parts.append(f"{label}→{target}")

    if settings.dnd_enabled:
        parts.append("DND")
    if settings.call_recording_enabled:
        parts.append("Запись")
    if settings.moh_class:
        parts.append(f"MOH:{settings.moh_class}")

    return ", ".join(parts)
