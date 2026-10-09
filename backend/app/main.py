import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException
from starlette.middleware.cors import CORSMiddleware
from app.api import health, model_info, predict
from app.core.config import Settings
from app.core.errors import ServiceError, error_response
from app.services.artifact_loader import load_bundle

logger = logging.getLogger("cad")


def create_app(settings=None):
    settings = settings or Settings()
    logging.basicConfig(level=settings.log_level)

    @asynccontextmanager
    async def lifespan(app):
        app.state.registry = {}
        try:
            app.state.registry["cad"] = load_bundle(settings.artifacts_dir)
            logger.info("CAD artifacts loaded and startup self-checks passed")
        except Exception:
            # Keep HTTP alive solely so readiness reports 503. No predictions
            # or metadata are served. Exiting would make /health unreachable.
            logger.exception("CAD startup failed; service is NOT READY")
        yield
        app.state.registry.clear()

    api = FastAPI(title="Aurapulse CAD model service", version="1.0.0", lifespan=lifespan,
                  docs_url=None if settings.env == "production" else "/docs",
                  redoc_url=None, openapi_url=None if settings.env == "production" else "/openapi.json")
    api.state.settings = settings
    api.state.registry = {}

    @api.exception_handler(ServiceError)
    async def handle_service_error(request: Request, error: ServiceError):
        return error_response(error)

    @api.exception_handler(RequestValidationError)
    async def handle_validation(request: Request, error: RequestValidationError):
        return error_response(ServiceError(400, "INVALID_REQUEST", "Invalid request."))

    @api.exception_handler(HTTPException)
    async def handle_http(request: Request, error: HTTPException):
        return error_response(ServiceError(error.status_code, "INVALID_REQUEST", "The requested endpoint or method is unavailable."))

    @api.exception_handler(Exception)
    async def handle_unexpected(request: Request, error: Exception):
        # Never log request bodies, patient values, or preprocessing frames.
        logger.error("Unexpected inference service failure (%s)", type(error).__name__)
        return error_response(ServiceError(500, "INTERNAL_ERROR", "The model service could not complete the request."))

    for router in [health.router, model_info.router, predict.router]:
        api.include_router(router)
    # Outermost wrapper ensures CORS also applies to unexpected 500 responses.
    return CORSMiddleware(api, allow_origins=list(settings.cors_origins), allow_credentials=False,
                          allow_methods=["GET", "POST", "OPTIONS"], allow_headers=["Content-Type"])


app = create_app()