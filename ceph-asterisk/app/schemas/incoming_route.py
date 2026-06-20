from pydantic import BaseModel, Field


class IncomingRouteCreate(BaseModel):
    did: str = Field(..., min_length=1, max_length=40)
    context: str = Field(default="from-external", max_length=40)
    destination_type: str = Field(..., pattern="^(extension|queue|voicemail|ivr)$")
    destination_value: str = Field(..., min_length=1, max_length=80)
    description: str | None = Field(default=None, max_length=120)
    enabled: bool = True
    sort_order: int = 0


class IncomingRouteUpdate(BaseModel):
    did: str | None = Field(default=None, min_length=1, max_length=40)
    context: str | None = Field(default=None, max_length=40)
    destination_type: str | None = Field(
        default=None, pattern="^(extension|queue|voicemail|ivr)$"
    )
    destination_value: str | None = Field(default=None, min_length=1, max_length=80)
    description: str | None = Field(default=None, max_length=120)
    enabled: bool | None = None
    sort_order: int | None = None


class IncomingRouteResponse(BaseModel):
    id: int
    instance_id: int
    did: str
    context: str
    destination_type: str
    destination_value: str
    description: str | None
    enabled: bool
    sort_order: int

    model_config = {"from_attributes": True}
