"""CRUD входящих маршрутов DID."""

from __future__ import annotations

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.incoming_route import IncomingRoute
from app.schemas.incoming_route import IncomingRouteCreate, IncomingRouteUpdate
from app.services.incoming_routes import list_incoming_routes


def create_incoming_route(
    db_cdr: Session,
    instance_id: int,
    data: IncomingRouteCreate,
) -> IncomingRoute:
    duplicate = (
        db_cdr.query(IncomingRoute)
        .filter(
            IncomingRoute.instance_id == instance_id,
            IncomingRoute.context == data.context,
            IncomingRoute.did == data.did,
        )
        .first()
    )
    if duplicate:
        raise HTTPException(status_code=400, detail="Маршрут с таким DID уже существует")

    row = IncomingRoute(
        instance_id=instance_id,
        did=data.did.strip(),
        context=data.context.strip(),
        destination_type=data.destination_type,
        destination_value=data.destination_value.strip(),
        description=data.description,
        enabled=data.enabled,
        sort_order=data.sort_order,
    )
    db_cdr.add(row)
    db_cdr.flush()
    return row


def update_incoming_route(
    db_cdr: Session,
    instance_id: int,
    route_id: int,
    data: IncomingRouteUpdate,
) -> IncomingRoute:
    row = (
        db_cdr.query(IncomingRoute)
        .filter(
            IncomingRoute.instance_id == instance_id,
            IncomingRoute.id == route_id,
        )
        .first()
    )
    if row is None:
        raise HTTPException(status_code=404, detail="Маршрут не найден")

    payload = data.model_dump(exclude_unset=True)
    new_did = payload.get("did", row.did)
    new_context = payload.get("context", row.context)
    if new_did != row.did or new_context != row.context:
        duplicate = (
            db_cdr.query(IncomingRoute)
            .filter(
                IncomingRoute.instance_id == instance_id,
                IncomingRoute.context == new_context,
                IncomingRoute.did == new_did,
                IncomingRoute.id != route_id,
            )
            .first()
        )
        if duplicate:
            raise HTTPException(status_code=400, detail="Маршрут с таким DID уже существует")

    for key, value in payload.items():
        if isinstance(value, str):
            value = value.strip()
        setattr(row, key, value)
    db_cdr.flush()
    return row


def delete_incoming_route(
    db_cdr: Session,
    instance_id: int,
    route_id: int,
) -> None:
    deleted = (
        db_cdr.query(IncomingRoute)
        .filter(
            IncomingRoute.instance_id == instance_id,
            IncomingRoute.id == route_id,
        )
        .delete(synchronize_session=False)
    )
    if not deleted:
        raise HTTPException(status_code=404, detail="Маршрут не найден")


def get_incoming_route(
    db_cdr: Session,
    instance_id: int,
    route_id: int,
) -> IncomingRoute:
    row = (
        db_cdr.query(IncomingRoute)
        .filter(
            IncomingRoute.instance_id == instance_id,
            IncomingRoute.id == route_id,
        )
        .first()
    )
    if row is None:
        raise HTTPException(status_code=404, detail="Маршрут не найден")
    return row


__all__ = [
    "create_incoming_route",
    "update_incoming_route",
    "delete_incoming_route",
    "get_incoming_route",
    "list_incoming_routes",
]
