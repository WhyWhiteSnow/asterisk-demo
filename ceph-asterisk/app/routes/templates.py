from fastapi import APIRouter, Depends, HTTPException

from app.core.database import get_cdr_db, get_db
from app.models.asterisk_instance import AsteriskInstance
from app.schemas.template import (
    ApplyTemplateRequest,
    ApplyTemplateResult,
    SyncRoutingRequest,
    SyncRoutingResult,
    TemplateInfo,
)
from app.services.extension_routing import sync_extension_dialplan
from app.services.template_apply import apply_template, list_template_info
from sqlalchemy.orm import Session

catalog_router = APIRouter(prefix="/templates")
router = APIRouter(prefix="/instances/{instance_id}")


@catalog_router.get("", response_model=list[TemplateInfo])
async def get_templates_catalog():
    return list_template_info()


def _get_instance(db: Session, instance_id: int) -> AsteriskInstance:
    instance = (
        db.query(AsteriskInstance).filter(AsteriskInstance.id == instance_id).first()
    )
    if not instance:
        raise HTTPException(status_code=404, detail="Instance not found")
    return instance


@router.post("/apply-template", response_model=ApplyTemplateResult)
async def apply_instance_template(
    body: ApplyTemplateRequest,
    instance_id: int,
    db: Session = Depends(get_db),
    cdr_db: Session = Depends(get_cdr_db),
):
    instance = _get_instance(db, instance_id)
    try:
        return apply_template(db, cdr_db, instance, body)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        cdr_db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to apply template: {exc}",
        ) from exc


@router.post("/sync-routing", response_model=SyncRoutingResult)
async def sync_instance_routing(
    body: SyncRoutingRequest,
    instance_id: int,
    db: Session = Depends(get_db),
    cdr_db: Session = Depends(get_cdr_db),
):
    instance = _get_instance(db, instance_id)
    try:
        result = sync_extension_dialplan(
            cdr_db,
            instance_id,
            instance.name,
            author=body.change_author or "api",
            description="manual routing sync",
            reload_asterisk=body.reload_asterisk,
        )
        return SyncRoutingResult(
            extensions_synced=result["extensions_synced"],
            dialplan_rows_added=result["dialplan_rows_added"],
            message="Маршрутизация номеров синхронизирована",
        )
    except Exception as exc:
        cdr_db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to sync routing: {exc}",
        ) from exc

