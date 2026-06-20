from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import BaseCDR


class ExtensionForwarding(BaseCDR):
    __tablename__ = "extension_forwarding"
    __table_args__ = (
        UniqueConstraint(
            "instance_id",
            "extension",
            "forward_type",
            name="uq_extension_forwarding_rule",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    instance_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    extension: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    forward_type: Mapped[str] = mapped_column(String(8), nullable=False)
    target_type: Mapped[str] = mapped_column(String(16), nullable=False)
    target_value: Mapped[str] = mapped_column(String(80), nullable=False)
    timeout_seconds: Mapped[int] = mapped_column(Integer, default=30, nullable=False)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )
