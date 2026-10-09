import json
from fastapi import APIRouter, Request
from starlette.concurrency import run_in_threadpool
from app.core.errors import ServiceError, unavailable
from app.schemas.predict import parse_request
from app.services.preprocessing import preprocess
from app.services.model_service import infer

router = APIRouter()


def reject_duplicate_keys(pairs):
    result = {}
    for name, value in pairs:
        if name in result:
            raise ValueError("Duplicate JSON key")
        result[name] = value
    return result


@router.post("/predict")
async def predict(request: Request):
    bundle = request.app.state.registry.get("cad")
    if bundle is None:
        raise unavailable()
    if request.headers.get("content-type", "").split(";")[0].strip().lower() != "application/json":
        raise ServiceError(400, "INVALID_REQUEST", "Send an application/json request.")
    body = bytearray()
    async for chunk in request.stream():
        body.extend(chunk)
        if len(body) > request.app.state.settings.max_body_bytes:
            raise ServiceError(413, "REQUEST_TOO_LARGE", "The request exceeds the allowed size.")
    try:
        parsed = json.loads(body, object_pairs_hook=reject_duplicate_keys)
    except (ValueError, UnicodeDecodeError, RecursionError):
        raise ServiceError(400, "INVALID_REQUEST", "The request body is not valid JSON.") from None
    features = parse_request(parsed)
    # Native model execution stays off the async event loop.
    def execute():
        return infer(preprocess(features, bundle), bundle)
    return {"success": True, "data": await run_in_threadpool(execute)}