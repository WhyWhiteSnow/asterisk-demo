from sqlalchemy import Boolean, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import BaseCDR


class ExtensionSettings(BaseCDR):
    __tablename__ = "extension_settings"
    __table_args__ = (
        UniqueConstraint("instance_id", "extension", name="uq_extension_settings"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    instance_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    extension: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    auto_routing_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    forwarding_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
