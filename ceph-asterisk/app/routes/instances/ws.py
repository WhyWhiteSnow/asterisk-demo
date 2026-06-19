import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.core.database import SessionLocal
from app.models.asterisk_instance import AsteriskInstance
from app.services.instance_events import (
    instance_event_manager,
    instance_event_payload,
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["instances-ws"])


@router.websocket("/ws/instances")
async def instances_status_ws(websocket: WebSocket) -> None:
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
        logger.exception("WebSocket /ws/instances error")
    finally:
        instance_event_manager.disconnect(websocket)
