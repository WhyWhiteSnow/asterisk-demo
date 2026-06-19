import asyncio
import logging
from typing import Any

from fastapi import WebSocket

from app.models.asterisk_instance import AsteriskInstance

logger = logging.getLogger(__name__)


class InstanceEventManager:
    def __init__(self) -> None:
        self._connections: set[WebSocket] = set()
        self._loop: asyncio.AbstractEventLoop | None = None

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self._connections.add(websocket)
        if self._loop is None:
            self._loop = asyncio.get_running_loop()

    def disconnect(self, websocket: WebSocket) -> None:
        self._connections.discard(websocket)

    async def send_json(self, websocket: WebSocket, payload: dict[str, Any]) -> bool:
        try:
            await websocket.send_json(payload)
            return True
        except Exception:
            return False

    async def broadcast(self, payload: dict[str, Any]) -> None:
        if not self._connections:
            return
        dead: list[WebSocket] = []
        for ws in list(self._connections):
            if not await self.send_json(ws, payload):
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)

    def broadcast_sync(self, payload: dict[str, Any]) -> None:
        if not self._connections:
            return
        loop = self._loop
        if loop is None or not loop.is_running():
            return
        try:
            asyncio.run_coroutine_threadsafe(self.broadcast(payload), loop)
        except Exception:
            logger.exception("Failed to schedule instance event broadcast")


instance_event_manager = InstanceEventManager()


def instance_event_payload(instance: AsteriskInstance) -> dict[str, Any]:
    create_date = instance.create_date
    created = create_date.isoformat() if create_date else None
    return {
        "id": instance.id,
        "name": instance.name,
        "sip_port": instance.sip_port,
        "http_port": instance.http_port,
        "rtp_port_start": instance.rtp_port_start,
        "rtp_port_end": instance.rtp_port_end,
        "ami_port": instance.ami_port,
        "status": instance.status,
        "create_date": created,
        "created_at": created,
    }


def notify_instance_updated(instance: AsteriskInstance) -> None:
    instance_event_manager.broadcast_sync(
        {
            "type": "instance_updated",
            "instance": instance_event_payload(instance),
        }
    )


def notify_instance_deleted(instance_id: int) -> None:
    instance_event_manager.broadcast_sync(
        {
            "type": "instance_deleted",
            "instance_id": instance_id,
        }
    )
