from sqlalchemy import Boolean, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import BaseCDR


class IncomingRoute(BaseCDR):
    __tablename__ = "incoming_routes"
    __table_args__ = (
        UniqueConstraint("instance_id", "context", "did", name="uq_incoming_route_did"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    instance_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    did: Mapped[str] = mapped_column(String(40), nullable=False)
    context: Mapped[str] = mapped_column(String(40), nullable=False, default="from-external")
    destination_type: Mapped[str] = mapped_column(String(20), nullable=False)
    destination_value: Mapped[str] = mapped_column(String(80), nullable=False)
    description: Mapped[str | None] = mapped_column(String(120), nullable=True)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
