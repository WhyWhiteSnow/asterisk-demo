from datetime import datetime
import os
import subprocess
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Path

from app.core.database import get_db, get_cdr_db
from app.models.asterisk_instance import AsteriskInstance
from app.models.sip_user import PjsipEndpoint, PjsipAor, PjsipAuth
from app.models.extension_forwarding import ExtensionForwarding
from app.services.pjsip_disk_sync import _format_callerid, write_pjsip_users_conf
from app.services.voicemail_config import create_voicemail_box, mailbox_exists
from app.services.extension_routing import sync_business_dialplan, list_forwarding_rules
from app.services.routing_status import build_routing_status_label
from app.utils.pjsip_endpoint_extras import apply_endpoint_moh_class
from app.services.instance_media import write_musiconhold_conf
from app.services.extension_settings import (
    delete_extension_settings,
    get_extension_settings,
    upsert_extension_settings,
)
from app.schemas.voicemail import VoicemailCreate
# from app.schemas.asterisk import SIPUserCreate, SIPUserResponse, SIPUserUpdate
from sqlalchemy.orm import Session, joinedload
from app.schemas.sip import (
    SIPUserCreate,
    AuthSchema,
    AorSchema,
    SIPUserItem,
    SIPUserResponse,
    AuthUpdate,
    AorUpdate,
    SIPUserUpdate,
)

router = APIRouter(prefix="/instances/{instance_id}/users")


def _serialize_user_item(
    endpoint: PjsipEndpoint,
    cdr_db: Session,
    instance_id: int,
) -> SIPUserItem:
    settings = get_extension_settings(cdr_db, instance_id, endpoint.id)
    forwarding_rules = (
        list_forwarding_rules(cdr_db, instance_id, endpoint.id)
        if settings.forwarding_enabled
        else []
    )
    return SIPUserItem(
        pk=endpoint.pk,
        id=endpoint.id,
        transport=endpoint.transport or "",
        context=endpoint.context or "from-internal",
        allow=endpoint.allow or "",
        disallow=endpoint.disallow or "",
        callerid=endpoint.callerid or "",
        trust_id_inbound=str(endpoint.trust_id_inbound.value if endpoint.trust_id_inbound else "no"),
        trust_id_outbound=str(endpoint.trust_id_outbound.value if endpoint.trust_id_outbound else "no"),
        auto_routing_enabled=settings.auto_routing_enabled,
        forwarding_enabled=settings.forwarding_enabled,
        dnd_enabled=settings.dnd_enabled,
        call_recording_enabled=settings.call_recording_enabled,
        moh_class=settings.moh_class,
        routing_status=build_routing_status_label(settings, forwarding_rules),
        aors_fk=endpoint.aors_fk,
        auths_fk=endpoint.auths_fk,
    )


@router.post("/")
def create_sip_user(
    user_data: SIPUserCreate,
    instance_id: int = Path(...),
    db: Session = Depends(get_db),
    cdr_db: Session = Depends(get_cdr_db),
):
    # Проверяем, нет ли уже такого пользователя
    instance = (
        db.query(AsteriskInstance).filter(AsteriskInstance.id == instance_id).first()
    )
    if not instance:
        raise HTTPException(status_code=400, detail="instance does not exists")

    # existing = cdr_db.query(PjsipEndpoint)\
    #     .join(PjsipAor, PjsipEndpoint.aors == PjsipAor.id)\
    #     .filter(PjsipEndpoint.id == user_data.username)\
    #     .filter(PjsipAor.reg_server == instance.name)\
    #     .first()
    # existing = cdr_db.query(PjsipEndpoint)\
    #     .join(PjsipAor, PjsipEndpoint.aors_id==PjsipAor.pk)\
    #     .filter(PjsipAor.reg_server == instance.name)\
    #     .filter()\
    #     .first()
    existing = (
        cdr_db.query(PjsipEndpoint)
        .options(joinedload(PjsipEndpoint.aors_fk), joinedload(PjsipEndpoint.auths_fk))
        .join(PjsipAor, PjsipEndpoint.aors_id == PjsipAor.pk)
        .filter(PjsipAor.reg_server == instance.name)
        .filter(PjsipEndpoint.id == user_data.username)
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="User already exists")

    try:
        # 1. Создаем AOR (регистрация)
        new_aor = PjsipAor(
            id=user_data.username,
            max_contacts=user_data.max_contacts,
            reg_server=instance.name,
        )

        # 2. Создаем Auth (пароль)
        new_auth = PjsipAuth(
            id=f"{user_data.username}-auth",
            username=user_data.username,
            password=user_data.password,
        )
        cdr_db.add(new_aor)
        cdr_db.add(new_auth)
        cdr_db.flush()
        # 3. Создаем Endpoint (логика)
        new_endpoint = PjsipEndpoint(
            id=user_data.username,
            aors=user_data.username,
            auth=f"{user_data.username}-auth",
            auths_id=new_auth.pk,
            aors_id=new_aor.pk,
            context=user_data.context,
            transport=f"transport-{user_data.transport.value}",
            callerid=_format_callerid(user_data.callerid, user_data.username),
        )

        cdr_db.add(new_endpoint)
        cdr_db.flush()

        if not mailbox_exists(cdr_db, instance_id, user_data.username):
            create_voicemail_box(
                cdr_db,
                instance_id,
                instance.name,
                VoicemailCreate(
                    mailbox=user_data.username,
                    password="4242",
                    full_name=user_data.callerid or user_data.username,
                    link_endpoint_mwi=True,
                ),
                instance=instance,
                db=db,
            )
        else:
            new_endpoint.mailboxes = f"{user_data.username}@default"
            cdr_db.commit()

        upsert_extension_settings(
            cdr_db,
            instance_id,
            user_data.username,
            auto_routing_enabled=user_data.auto_routing_enabled,
            forwarding_enabled=user_data.forwarding_enabled,
            dnd_enabled=user_data.dnd_enabled,
            call_recording_enabled=user_data.call_recording_enabled,
            moh_class=user_data.moh_class,
        )
        apply_endpoint_moh_class(cdr_db, new_endpoint.pk, user_data.moh_class)
        write_musiconhold_conf(instance, extra_class_stems=[user_data.moh_class] if user_data.moh_class else None)
        cdr_db.commit()

        write_pjsip_users_conf(instance, cdr_db)
        sync_business_dialplan(
            cdr_db,
            instance_id,
            instance.name,
            author="api",
            description=f"create extension {user_data.username}",
            reload_asterisk=instance.status == "running",
        )

        return {
            "status": "success",
            "username": user_data.username,
            "voicemail": f"{user_data.username}@default",
            "voicemail_pin": "4242",
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@router.get("/", response_model=list[SIPUserItem])  # Или SIPUserResponse
async def get_sip_users(
    instance_id: int = Path(...),
    db: Session = Depends(get_db),
    cdr_db: Session = Depends(get_cdr_db),
):

    instance = (
        db.query(AsteriskInstance).filter(AsteriskInstance.id == instance_id).first()
    )
    if not instance:
        raise HTTPException(status_code=400, detail="instance does not exists")

    numbers = (
        cdr_db.query(PjsipEndpoint)
        .options(joinedload(PjsipEndpoint.aors_fk), joinedload(PjsipEndpoint.auths_fk))
        .join(PjsipAor, PjsipEndpoint.aors_id == PjsipAor.pk)
        .filter(PjsipAor.reg_server == instance.name)
        .all()
    )

    return [
        _serialize_user_item(number, cdr_db, instance_id) for number in numbers
    ]


@router.get(
    "/{endpoint_id}", response_model=Optional[SIPUserItem]
)  # под username понимается номер аля 101
async def get_sip_user(
    endpoint_id: str = Path(...),
    instance_id: int = Path(...),
    db: Session = Depends(get_db),
    cdr_db: Session = Depends(get_cdr_db),
):

    instance = (
        db.query(AsteriskInstance).filter(AsteriskInstance.id == instance_id).first()
    )
    if not instance:
        raise HTTPException(status_code=400, detail="instance does not exists")

    number = (
        cdr_db.query(PjsipEndpoint)
        .options(joinedload(PjsipEndpoint.aors_fk), joinedload(PjsipEndpoint.auths_fk))
        .join(PjsipAor, PjsipEndpoint.aors_id == PjsipAor.pk)
        .filter(PjsipAor.reg_server == instance.name)
        .filter(PjsipEndpoint.id == endpoint_id)
        .first()
    )  # в случае чего можно заменить на PjsipAuth.id==username

    if not number:
        return None

    return _serialize_user_item(number, cdr_db, instance_id)


@router.put("/{endpoint_id}", response_model=SIPUserItem)
async def update_sip_user_by_creds(
    update_data: SIPUserUpdate,
    endpoint_id: str = Path(...),  # SIP логин (например '101')
    instance_id: int = Path(...),
    cdr_db: Session = Depends(get_cdr_db),
    db: Session = Depends(get_db),
):
    instance = (
        db.query(AsteriskInstance).filter(AsteriskInstance.id == instance_id).first()
    )
    if not instance:
        raise HTTPException(status_code=400, detail="instance does not exists")

    # 1. Поиск по связанным таблицам
    endpoint = (
        cdr_db.query(PjsipEndpoint)
        .join(PjsipAor, PjsipEndpoint.aors_id == PjsipAor.pk)
        .join(PjsipAuth, PjsipEndpoint.auths_id == PjsipAuth.pk)
        .options(joinedload(PjsipEndpoint.aors_fk), joinedload(PjsipEndpoint.auths_fk))
        .filter(PjsipAor.reg_server == instance.name)
        .filter(PjsipEndpoint.id == endpoint_id)
        .first()
    )

    if not endpoint:
        raise HTTPException(
            status_code=404,
            detail=f"User with id '{endpoint_id}' on server '{instance.name}' not found",
        )

    try:
        # 2. Обновление полей самого Endpoint (transport, context и т.д.)
        endpoint_dict = update_data.model_dump(
            exclude={
                "auth",
                "aor",
                "auto_routing_enabled",
                "forwarding_enabled",
                "dnd_enabled",
                "call_recording_enabled",
                "moh_class",
            },
            exclude_unset=True,
        )
        for key, value in endpoint_dict.items():
            setattr(endpoint, key, value)

        settings = get_extension_settings(cdr_db, instance_id, endpoint_id)
        new_auto_routing = (
            update_data.auto_routing_enabled
            if update_data.auto_routing_enabled is not None
            else settings.auto_routing_enabled
        )
        new_forwarding = (
            update_data.forwarding_enabled
            if update_data.forwarding_enabled is not None
            else settings.forwarding_enabled
        )
        new_dnd = (
            update_data.dnd_enabled
            if update_data.dnd_enabled is not None
            else settings.dnd_enabled
        )
        new_recording = (
            update_data.call_recording_enabled
            if update_data.call_recording_enabled is not None
            else settings.call_recording_enabled
        )
        new_moh = (
            update_data.moh_class
            if update_data.moh_class is not None
            else settings.moh_class
        )
        upsert_extension_settings(
            cdr_db,
            instance_id,
            endpoint_id,
            auto_routing_enabled=new_auto_routing,
            forwarding_enabled=new_forwarding,
            dnd_enabled=new_dnd,
            call_recording_enabled=new_recording,
            moh_class=new_moh,
        )
        apply_endpoint_moh_class(cdr_db, endpoint.pk, new_moh)
        write_musiconhold_conf(instance, extra_class_stems=[new_moh] if new_moh else None)
        if not new_forwarding:
            cdr_db.query(ExtensionForwarding).filter(
                ExtensionForwarding.instance_id == instance_id,
                ExtensionForwarding.extension == endpoint_id,
            ).delete(synchronize_session=False)

        # 3. Обновление связанных данных Auth (если прислали)
        if update_data.auth:
            auth_dict = update_data.auth.model_dump(exclude_unset=True)
            for key, value in auth_dict.items():
                setattr(endpoint.auths_fk, key, value)

        # 4. Обновление связанных данных AOR (если прислали)
        if update_data.aor:
            aor_dict = update_data.aor.model_dump(exclude_unset=True)
            for key, value in aor_dict.items():
                setattr(endpoint.aors_fk, key, value)

        cdr_db.commit()
        cdr_db.refresh(endpoint)
        write_pjsip_users_conf(instance, cdr_db)
        sync_business_dialplan(
            cdr_db,
            instance_id,
            instance.name,
            author="api",
            description=f"update extension {endpoint_id}",
            reload_asterisk=instance.status == "running",
        )
        return _serialize_user_item(endpoint, cdr_db, instance_id)

    except Exception as e:
        cdr_db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@router.delete("/delete/{endpoint_id}", status_code=200)
async def delete_sip_user(
    instance_id: int = Path(...),
    endpoint_id: str = Path(...),
    cdr_db: Session = Depends(get_cdr_db),
    db: Session = Depends(get_db),
):
    instance = (
        db.query(AsteriskInstance).filter(AsteriskInstance.id == instance_id).first()
    )
    if not instance:
        raise HTTPException(status_code=400, detail="instance does not exists")

    # 1. Ищем Endpoint, чтобы получить доступ к связанным ID (auth и aor)
    endpoint = (
        cdr_db.query(PjsipEndpoint)
        .join(PjsipAor, PjsipEndpoint.aors_id == PjsipAor.pk)
        .join(PjsipAuth, PjsipEndpoint.auths_id == PjsipAuth.pk)
        .filter(PjsipAor.reg_server == instance.name)
        .filter(PjsipEndpoint.id == endpoint_id)
        .first()
    )

    if not endpoint:
        raise HTTPException(
            status_code=404,
            detail=f"User {endpoint_id} on server {instance.name} not found",
        )

    try:
        # 2. Сохраняем ссылки на связанные объекты перед удалением основного
        # Это нужно, если в БД не настроен автоматический каскад на уровне таблиц
        auth_obj = endpoint.auths_fk
        aor_obj = endpoint.aors_fk

        # 3. Удаляем Endpoint (главную запись)
        cdr_db.query(ExtensionForwarding).filter(
            ExtensionForwarding.instance_id == instance_id,
            ExtensionForwarding.extension == endpoint_id,
        ).delete(synchronize_session=False)
        delete_extension_settings(cdr_db, instance_id, endpoint_id)
        cdr_db.delete(endpoint)

        # 4. Вручную удаляем связанные записи, если они не удалились каскадом БД
        if auth_obj:
            cdr_db.delete(auth_obj)
        if aor_obj:
            cdr_db.delete(aor_obj)

        cdr_db.commit()
        write_pjsip_users_conf(instance, cdr_db)
        sync_business_dialplan(
            cdr_db,
            instance_id,
            instance.name,
            author="api",
            description=f"delete extension {endpoint_id}",
            reload_asterisk=instance.status == "running",
        )
        return {"message": "success"}  # При 204 коде тело ответа не возвращается

    except Exception as e:
        cdr_db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
