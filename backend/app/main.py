from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import APIRouter, FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app import models  # noqa: F401
from app.api import (
    events,
    export,
    exports,
    files,
    gedcom,
    imports,
    persons,
    places,
    relationships,
    sources,
    tree,
)
from app.core.config import settings
from app.core.database import engine


@asynccontextmanager
async def lifespan(_app: FastAPI):
    """Manage application startup and shutdown resources."""
    try:
        yield
    finally:
        engine.dispose()


def _error_response(error: str, detail: str, status_code: int) -> JSONResponse:
    return JSONResponse(status_code=status_code, content={"error": error, "detail": detail})


def _error_code_for_status(status_code: int) -> str:
    return {
        status.HTTP_404_NOT_FOUND: "not_found",
        status.HTTP_409_CONFLICT: "conflict",
        status.HTTP_413_CONTENT_TOO_LARGE: "invalid_file",
        status.HTTP_415_UNSUPPORTED_MEDIA_TYPE: "invalid_file",
        status.HTTP_422_UNPROCESSABLE_CONTENT: "validation_error",
    }.get(status_code, "http_error")


def _placeholder_router(tag: str) -> APIRouter:
    return APIRouter(tags=[tag])


def create_app() -> FastAPI:
    app = FastAPI(title=settings.app_name, version=settings.app_version, lifespan=lifespan)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(
        _request: Request,
        exc: StarletteHTTPException,
    ) -> JSONResponse:
        if isinstance(exc.detail, dict):
            error = exc.detail.get("error")
            detail = exc.detail.get("detail")
            if isinstance(error, str) and isinstance(detail, str):
                return _error_response(error, detail, exc.status_code)

        return _error_response(
            _error_code_for_status(exc.status_code),
            str(exc.detail),
            exc.status_code,
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        _request: Request,
        exc: RequestValidationError,
    ) -> JSONResponse:
        detail = "; ".join(
            f"{'/'.join(map(str, err['loc']))}: {err['msg']}" for err in exc.errors()
        )
        return _error_response("validation_error", detail, status.HTTP_422_UNPROCESSABLE_CONTENT)

    @app.get("/health", tags=["health"], response_model=dict[str, str])
    def healthcheck() -> dict[str, str]:
        return {"status": "ok", "version": settings.app_version}

    app.include_router(persons.router)
    app.include_router(events.router)
    app.include_router(places.router)
    app.include_router(relationships.router)
    app.include_router(sources.router)
    app.include_router(tree.router)
    app.include_router(files.router or _placeholder_router("files"), prefix="/files")
    app.include_router(imports.router or _placeholder_router("import"), prefix="/import")
    app.include_router(export.router or _placeholder_router("export"), prefix="/export")
    app.include_router(exports.router or _placeholder_router("export"), prefix="/export")
    app.include_router(gedcom.router)

    return app


app = create_app()
