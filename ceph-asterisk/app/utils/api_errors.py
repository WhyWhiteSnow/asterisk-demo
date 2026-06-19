"""Структурированные HTTP-ошибки API с кодами и русскими сообщениями."""

from __future__ import annotations

import logging

from fastapi import HTTPException

logger = logging.getLogger(__name__)


class ApiHttpError(HTTPException):
    def __init__(self, status_code: int, detail: str, code: str | None = None):
        super().__init__(status_code=status_code, detail=detail)
        self.code = code


def raise_instance_name_exists() -> None:
    raise ApiHttpError(
        status_code=400,
        detail="ВАТС с таким именем уже существует",
        code="instance_name_exists",
    )


def raise_ports_conflict(conflicts: list[str]) -> None:
    detail = "Конфликт портов: " + ", ".join(conflicts)
    raise ApiHttpError(status_code=400, detail=detail, code="ports_conflict")


def raise_rtp_range_invalid(message: str) -> None:
    raise ApiHttpError(status_code=400, detail=message, code="rtp_range_invalid")


def raise_docker_unavailable(message: str = "Docker недоступен") -> None:
    raise ApiHttpError(status_code=503, detail=message, code="docker_unavailable")


def raise_container_start_failed(message: str) -> None:
    raise ApiHttpError(
        status_code=500,
        detail=f"Не удалось запустить контейнер: {message}",
        code="container_start_failed",
    )


def raise_internal_error(
    exc: Exception,
    *,
    user_message: str = "Внутренняя ошибка сервера",
) -> None:
    logger.exception("Internal error: %s", exc)
    raise ApiHttpError(status_code=500, detail=user_message, code="internal_error")
