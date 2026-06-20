from pydantic import BaseModel, ConfigDict, field_validator
from app.schemas.asterisk import TransportType
from typing import Optional


def normalize_transport_value(value: str | TransportType | None) -> str | None:
    if value is None:
        return None
    if isinstance(value, TransportType):
        return f"transport-{value.value}"
    text = str(value).strip()
    if not text:
        return None
    if text.startswith("transport-"):
        return text
    return f"transport-{text.lower()}"

class SIPUserCreate(BaseModel):
    username: str
    password: str
    context: str = "from-internal"
    max_contacts: int = 1
    transport: TransportType = TransportType.UDP
    callerid: str
    auto_routing_enabled: bool = True
    forwarding_enabled: bool = False
    dnd_enabled: bool = False
    call_recording_enabled: bool = False
    moh_class: str | None = None

class AuthSchema(BaseModel):
    pk: int
    id: str
    auth_type: str
    username: Optional[str]
    # password обычно не возвращаем на фронт в общем списке из соображений безопасности
    
    model_config = ConfigDict(from_attributes=True)

class AorSchema(BaseModel):
    pk: int
    id: str
    reg_server: Optional[str]
    max_contacts: int
    
    model_config = ConfigDict(from_attributes=True)

class SIPUserItem(BaseModel):
    pk: int
    id: str  # Это ваш номер (например, '101')
    transport: str
    context: str
    allow: str
    disallow: str
    callerid: str
    trust_id_inbound: str
    trust_id_outbound: str
    auto_routing_enabled: bool = True
    forwarding_enabled: bool = False
    dnd_enabled: bool = False
    call_recording_enabled: bool = False
    moh_class: str | None = None
    routing_status: str = "Dial → VM при неответе"
    # Связи (используем имена из relationship в модели)
    aors_fk: AorSchema
    auths_fk: AuthSchema

    model_config = ConfigDict(from_attributes=True)

# Итоговая схема для response_model
class SIPUserResponse(BaseModel):
    # Если вы возвращаете numbers как .all(), то это список
    users: list[SIPUserItem] 



class AuthUpdate(BaseModel):
    username: Optional[str] = None
    password: Optional[str] = None
    auth_type: Optional[str] = 'userpass'

class AorUpdate(BaseModel):
    max_contacts: Optional[int] = 1
    # reg_server обычно не меняем вручную, он привязан к инстансу

class SIPUserUpdate(BaseModel):
    # Поля самого Endpoint
    transport: Optional[str | TransportType] = None
    context: Optional[str] = None
    disallow: Optional[str] = None
    allow: Optional[str] = None
    callerid: Optional[str] = None
    auto_routing_enabled: Optional[bool] = None
    forwarding_enabled: Optional[bool] = None
    dnd_enabled: Optional[bool] = None
    call_recording_enabled: Optional[bool] = None
    moh_class: Optional[str] = None

    # Вложенные данные для обновления
    auth: Optional[AuthUpdate] = None
    aor: Optional[AorUpdate] = None

    @field_validator("transport", mode="before")
    @classmethod
    def normalize_transport(cls, value: object) -> object:
        if value is None or value == "":
            return None
        return normalize_transport_value(value)  # type: ignore[arg-type]