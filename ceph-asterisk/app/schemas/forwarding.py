from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


class ForwardType(str, Enum):
    CFU = "cfu"
    CFNA = "cfna"
    CFB = "cfb"


class ForwardTargetType(str, Enum):
    EXTENSION = "extension"
    VOICEMAIL = "voicemail"
    EXTERNAL = "external"


class ForwardingRule(BaseModel):
    forward_type: ForwardType
    target_type: ForwardTargetType
    target_value: str = Field(min_length=1, max_length=80)
    timeout_seconds: int = Field(default=30, ge=5, le=120)
    enabled: bool = True

    @field_validator("target_type")
    @classmethod
    def reject_external_in_mvp(cls, value: ForwardTargetType) -> ForwardTargetType:
        if value == ForwardTargetType.EXTERNAL:
            raise ValueError(
                "Внешние номера в переадресации будут доступны после настройки SIP-транков"
            )
        return value


class ForwardingRuleResponse(ForwardingRule):
    model_config = ConfigDict(from_attributes=True)

    id: int
    extension: str
    updated_at: datetime


class ExtensionForwardingUpdate(BaseModel):
    rules: list[ForwardingRule]
    change_author: Optional[str] = "api"
    reload_asterisk: bool = True


class ExtensionForwardingListResponse(BaseModel):
    extension: str
    rules: list[ForwardingRuleResponse]
