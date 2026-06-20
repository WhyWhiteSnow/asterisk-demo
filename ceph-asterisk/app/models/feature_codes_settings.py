from sqlalchemy import Boolean, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import BaseCDR


class FeatureCodesSettings(BaseCDR):
    __tablename__ = "feature_codes_settings"

    instance_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    vm_access: Mapped[str] = mapped_column(String(20), nullable=False, default="*97")
    vm_check: Mapped[str] = mapped_column(String(20), nullable=False, default="*98")
    cf_activate: Mapped[str] = mapped_column(String(20), nullable=False, default="*72")
    cf_deactivate: Mapped[str] = mapped_column(String(20), nullable=False, default="*73")
    dnd_activate: Mapped[str] = mapped_column(String(20), nullable=False, default="*78")
    dnd_deactivate: Mapped[str] = mapped_column(String(20), nullable=False, default="*79")
    vm_access_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    vm_check_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    cf_codes_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    dnd_codes_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
