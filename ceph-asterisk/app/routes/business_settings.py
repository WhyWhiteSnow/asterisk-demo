from fastapi import APIRouter, Depends, HTTPException, Path
from sqlalchemy.orm import Session

from app.core.database import get_db, get_cdr_db
from app.models.asterisk_instance import AsteriskInstance
from app.schemas.feature_codes import FeatureCodesResponse, FeatureCodesUpdate
from app.schemas.incoming_route import (
    IncomingRouteCreate,
    IncomingRouteResponse,
    IncomingRouteUpdate,
)
from app.services.extension_routing import sync_business_dialplan
from app.services.feature_codes import FeatureCodesData, get_feature_codes, upsert_feature_codes
from app.services.incoming_routes import sync_incoming_routes_dialplan
from app.services.incoming_routes_crud import (
    create_incoming_route,
    delete_incoming_route,
    list_incoming_routes,
    update_incoming_route,
)
from app.services.feature_codes import sync_feature_codes_dialplan

router = APIRouter(prefix="/instances/{instance_id}")


def _get_instance(db: Session, instance_id: int) -> AsteriskInstance:
    instance = db.query(AsteriskInstance).filter(AsteriskInstance.id == instance_id).first()
    if not instance:
        raise HTTPException(status_code=404, detail="Instance not found")
    return instance


@router.get("/incoming-routes", response_model=list[IncomingRouteResponse])
async def get_incoming_routes(
    instance_id: int = Path(...),
    db: Session = Depends(get_db),
    cdr_db: Session = Depends(get_cdr_db),
):
    _get_instance(db, instance_id)
    return list_incoming_routes(cdr_db, instance_id)


@router.post("/incoming-routes", response_model=IncomingRouteResponse)
async def post_incoming_route(
    data: IncomingRouteCreate,
    instance_id: int = Path(...),
    db: Session = Depends(get_db),
    cdr_db: Session = Depends(get_cdr_db),
):
    instance = _get_instance(db, instance_id)
    row = create_incoming_route(cdr_db, instance_id, data)
    cdr_db.commit()
    sync_incoming_routes_dialplan(
        cdr_db,
        instance_id,
        instance.name,
        author="api",
        description=f"create incoming route {row.did}",
        reload_asterisk=instance.status == "running",
    )
    return row


@router.put("/incoming-routes/{route_id}", response_model=IncomingRouteResponse)
async def put_incoming_route(
    data: IncomingRouteUpdate,
    instance_id: int = Path(...),
    route_id: int = Path(...),
    db: Session = Depends(get_db),
    cdr_db: Session = Depends(get_cdr_db),
):
    instance = _get_instance(db, instance_id)
    row = update_incoming_route(cdr_db, instance_id, route_id, data)
    cdr_db.commit()
    sync_incoming_routes_dialplan(
        cdr_db,
        instance_id,
        instance.name,
        author="api",
        description=f"update incoming route {row.did}",
        reload_asterisk=instance.status == "running",
    )
    return row


@router.delete("/incoming-routes/{route_id}")
async def remove_incoming_route(
    instance_id: int = Path(...),
    route_id: int = Path(...),
    db: Session = Depends(get_db),
    cdr_db: Session = Depends(get_cdr_db),
):
    instance = _get_instance(db, instance_id)
    delete_incoming_route(cdr_db, instance_id, route_id)
    cdr_db.commit()
    sync_incoming_routes_dialplan(
        cdr_db,
        instance_id,
        instance.name,
        author="api",
        description=f"delete incoming route {route_id}",
        reload_asterisk=instance.status == "running",
    )
    return {"status": "deleted"}


@router.get("/feature-codes", response_model=FeatureCodesResponse)
async def get_feature_codes_settings(
    instance_id: int = Path(...),
    db: Session = Depends(get_db),
    cdr_db: Session = Depends(get_cdr_db),
):
    _get_instance(db, instance_id)
    return FeatureCodesResponse(**get_feature_codes(cdr_db, instance_id).__dict__)


@router.put("/feature-codes", response_model=FeatureCodesResponse)
async def put_feature_codes_settings(
    data: FeatureCodesUpdate,
    instance_id: int = Path(...),
    db: Session = Depends(get_db),
    cdr_db: Session = Depends(get_cdr_db),
):
    instance = _get_instance(db, instance_id)
    current = get_feature_codes(cdr_db, instance_id)
    payload = data.model_dump(exclude_unset=True)
    merged = FeatureCodesData(**{**current.__dict__, **payload})
    upsert_feature_codes(cdr_db, instance_id, merged)
    cdr_db.commit()
    sync_feature_codes_dialplan(
        cdr_db,
        instance_id,
        instance.name,
        author="api",
        description="update feature codes",
        reload_asterisk=instance.status == "running",
    )
    return FeatureCodesResponse(**get_feature_codes(cdr_db, instance_id).__dict__)


@router.post("/sync-business-dialplan")
async def sync_business_dialplan_endpoint(
    instance_id: int = Path(...),
    db: Session = Depends(get_db),
    cdr_db: Session = Depends(get_cdr_db),
):
    instance = _get_instance(db, instance_id)
    stats = sync_business_dialplan(
        cdr_db,
        instance_id,
        instance.name,
        author="api",
        description="manual business dialplan sync",
        reload_asterisk=instance.status == "running",
    )
    return stats
