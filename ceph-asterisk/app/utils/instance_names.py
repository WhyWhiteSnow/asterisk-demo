"""Валидация имени ВАТС."""

from __future__ import annotations

import re

from app.utils.api_errors import ApiHttpError

INSTANCE_NAME_RE = re.compile(r"^[a-zA-Z0-9][a-zA-Z0-9_-]{2,}$")


def validate_instance_name(value: str) -> str:
    name = value.strip()
    if len(name) < 3:
        raise ApiHttpError(
            status_code=400,
            detail="Имя ВАТС должно содержать минимум 3 символа",
            code="instance_name_invalid",
        )
    if not INSTANCE_NAME_RE.match(name):
        raise ApiHttpError(
            status_code=400,
            detail=(
                "Имя может содержать только латинские буквы, цифры, дефис и подчёркивание"
            ),
            code="instance_name_invalid",
        )
    return name
