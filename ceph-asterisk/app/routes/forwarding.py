from fastapi import APIRouter, Depends, HTTPException, Path

from app.core.database import get_cdr_db, get_db
from app.models.asterisk_instance import AsteriskInstance
from app.models.sip_user import PjsipAor, PjsipEndpoint
from app.schemas.forwarding import (
    ExtensionForwardingListResponse,
    ExtensionForwardingUpdate,
    ForwardingRuleResponse,
)
from app.services.forwarding_config import (
    get_forwarding_for_extension,
    replace_forwarding_rules,
)
from sqlalchemy.orm import Session

router = APIRouter(prefix="/instances/{instance_id}/users/{extension}/forwarding")


def _get_instance(db: Session, instance_id: int) -> AsteriskInstance:
    instance = (
        db.query(AsteriskInstance).filter(AsteriskInstance.id == instance_id).first()
    )
    if not instance:
        raise HTTPException(status_code=404, detail="Instance not found")
    return instance


def _ensure_extension_exists(
    cdr_db: Session,
    instance: AsteriskInstance,
    extension: str,
) -> None:
    exists = (
        cdr_db.query(PjsipEndpoint)
        .join(PjsipAor, PjsipEndpoint.aors_id == PjsipAor.pk)
        .filter(PjsipAor.reg_server == instance.name)
        .filter(PjsipEndpoint.id == extension)
        .first()
    )
    if not exists:
        raise HTTPException(status_code=404, detail=f"Extension '{extension}' not found")


@router.get("", response_model=ExtensionForwardingListResponse)
async def get_extension_forwarding(
    instance_id: int = Path(...),
    extension: str = Path(...),
    db: Session = Depends(get_db),
    cdr_db: Session = Depends(get_cdr_db),
):
    instance = _get_instance(db, instance_id)
    _ensure_extension_exists(cdr_db, instance, extension)
    rules = get_forwarding_for_extension(cdr_db, instance_id, extension)
    return ExtensionForwardingListResponse(extension=extension, rules=rules)


@router.put("", response_model=list[ForwardingRuleResponse])
async def update_extension_forwarding(
    body: ExtensionForwardingUpdate,
    instance_id: int = Path(...),
    extension: str = Path(...),
    db: Session = Depends(get_db),
    cdr_db: Session = Depends(get_cdr_db),
):
    instance = _get_instance(db, instance_id)
    _ensure_extension_exists(cdr_db, instance, extension)
    try:
        return replace_forwarding_rules(
            cdr_db,
            instance_id,
            instance.name,
            extension,
            body,
        )
    except Exception as exc:
        cdr_db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to update forwarding: {exc}",
        ) from exc
