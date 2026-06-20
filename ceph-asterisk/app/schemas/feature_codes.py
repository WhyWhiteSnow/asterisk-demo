from pydantic import BaseModel, Field


class FeatureCodesResponse(BaseModel):
    vm_access: str = "*97"
    vm_check: str = "*98"
    cf_activate: str = "*72"
    cf_deactivate: str = "*73"
    dnd_activate: str = "*78"
    dnd_deactivate: str = "*79"
    vm_access_enabled: bool = True
    vm_check_enabled: bool = True
    cf_codes_enabled: bool = False
    dnd_codes_enabled: bool = True


class FeatureCodesUpdate(BaseModel):
    vm_access: str | None = Field(default=None, max_length=20)
    vm_check: str | None = Field(default=None, max_length=20)
    cf_activate: str | None = Field(default=None, max_length=20)
    cf_deactivate: str | None = Field(default=None, max_length=20)
    dnd_activate: str | None = Field(default=None, max_length=20)
    dnd_deactivate: str | None = Field(default=None, max_length=20)
    vm_access_enabled: bool | None = None
    vm_check_enabled: bool | None = None
    cf_codes_enabled: bool | None = None
    dnd_codes_enabled: bool | None = None
