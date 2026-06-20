from typing import Optional

from pydantic import BaseModel, Field


class TemplateInfo(BaseModel):
    id: str
    name: str
    description: str
    category: str
    preview_items: list[str]


class ApplyTemplateRequest(BaseModel):
    template_id: str = Field(min_length=1)
    change_author: Optional[str] = "api"
    reload_asterisk: bool = True


class ApplyTemplateResult(BaseModel):
    template_id: str
    template_name: str
    extensions_created: list[str]
    voicemail_boxes_created: int
    queues_created: int
    forwarding_rules_created: int
    dialplan_rows_added: int
    message: str


class SyncRoutingRequest(BaseModel):
    change_author: Optional[str] = "api"
    reload_asterisk: bool = True


class SyncRoutingResult(BaseModel):
    extensions_synced: int
    dialplan_rows_added: int
    message: str
