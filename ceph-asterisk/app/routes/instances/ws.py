import logging

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect, status

from app.core.config import config
from app.core.database import SessionLocal
from app.core.security import verify_token
from app.models.asterisk_instance import AsteriskInstance
from app.services.instance_events import (
    instance_event_manager,
    instance_event_payload,
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["instances-ws"])


async def _reject_ws(websocket: WebSocket, reason: str) -> None:
    logger.warning("WebSocket rejected: %s", reason)
    await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason=reason)


async def _handle_instances_status_ws(
    websocket: WebSocket,
    token: str | None,
) -> None:
    if not config.DEV_MODE:
        if not token:
            await _reject_ws(websocket, "missing token")
            return
        if verify_token(token, is_refresh=False) is None:
            await _reject_ws(websocket, "invalid token")
            return

    await instance_event_manager.connect(websocket)

    db = SessionLocal()
    try:
        instances = db.query(AsteriskInstance).all()
        await websocket.send_json(
            {
                "type": "snapshot",
                "instances": [instance_event_payload(i) for i in instances],
            }
        )
    finally:
        db.close()

    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        pass
    except Exception:
        logger.exception("WebSocket instances status error")
    finally:
        instance_event_manager.disconnect(websocket)


@router.websocket("/ws/instances")
async def instances_status_ws(
    websocket: WebSocket,
    token: str | None = Query(None),
) -> None:
    await _handle_instances_status_ws(websocket, token)


@router.websocket("/instances/ws")
async def instances_status_ws_legacy(
    websocket: WebSocket,
    token: str | None = Query(None),
) -> None:
    await _handle_instances_status_ws(websocket, token)
