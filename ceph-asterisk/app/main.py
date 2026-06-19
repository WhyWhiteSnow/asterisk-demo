from contextlib import asynccontextmanager
import logging

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.database import SessionLocal
from app.routes import cdr, users, auth, queues, voicemail, dialplan
from app.services.default_user import ensure_default_user
from app.routes.instances import instances, instancesCRUD
from app.routes.instances.configs import instance_configs
from app.routes import logs
from app.routes import audio_files
from app.routes.auth import require_auth
from app.core.config import config
from app.services.instance_health import (
    start_instance_health_watch,
    stop_instance_health_watch,
)
from app.utils.api_errors import ApiHttpError

logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(_: FastAPI):
    db = SessionLocal()
    try:
        ensure_default_user(
            db,
            login=config.DEFAULT_ADMIN_LOGIN,
            password=config.DEFAULT_ADMIN_PASSWORD,
            name=config.DEFAULT_ADMIN_NAME,
        )
    finally:
        db.close()

    health_watch_task = await start_instance_health_watch()
    try:
        yield
    finally:
        await stop_instance_health_watch(health_watch_task)


app = FastAPI(
    title="Asterisk Manager",
    docs_url="/docs" if config.DEV_MODE else None,
    redoc_url="/redoc" if config.DEV_MODE else None,
    openapi_url="/openapi.json" if config.DEV_MODE else None,
    lifespan=lifespan,
)
_auth_deps = [] if config.DEV_MODE else [Depends(require_auth)]
if config.DEV_MODE:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:5173",
            "http://127.0.0.1:5173",
        ],
        allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=[
            "Content-Disposition",
            "Content-Type",
            "Content-Length",
            "Accept-Ranges",
        ],
    )
else:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[f"http://{config.PJSIP_EXTERNAL_ADDRESS}:5173"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=[
            "Content-Disposition",
            "Content-Type",
            "Content-Length",
            "Accept-Ranges",
        ],
    )

app.include_router(cdr.router, dependencies=_auth_deps)
app.include_router(users.router, dependencies=_auth_deps)
app.include_router(queues.router, dependencies=_auth_deps)
app.include_router(voicemail.router, dependencies=_auth_deps)
app.include_router(instancesCRUD.router, dependencies=_auth_deps)
app.include_router(instances.router, dependencies=_auth_deps)
app.include_router(instance_configs.router, dependencies=_auth_deps)
app.include_router(auth.router)
app.include_router(audio_files.router, dependencies=_auth_deps)
app.include_router(logs.router, dependencies=_auth_deps)
app.include_router(dialplan.router, dependencies=_auth_deps)


@app.exception_handler(ApiHttpError)
async def handle_api_http_error(_: Request, exc: ApiHttpError) -> JSONResponse:
    content: dict[str, str] = {"detail": exc.detail}
    if exc.code:
        content["code"] = exc.code
    return JSONResponse(status_code=exc.status_code, content=content)


@app.exception_handler(Exception)
async def handle_unhandled_exception(_: Request, exc: Exception) -> JSONResponse:
    if isinstance(exc, HTTPException):
        content: dict = {"detail": exc.detail}
        return JSONResponse(status_code=exc.status_code, content=content)
    logger.exception("Unhandled exception")
    detail = "Внутренняя ошибка сервера"
    if config.DEV_MODE:
        detail = f"Внутренняя ошибка сервера: {exc}"
    return JSONResponse(
        status_code=500,
        content={"detail": detail, "code": "internal_error"},
    )


@app.get("/health_check")
def health_check():
    return {"status": "ok"}
