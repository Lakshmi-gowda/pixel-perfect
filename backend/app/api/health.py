from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

router = APIRouter()


@router.get("/health")
def health(request: Request):
    loaded = "cad" in request.app.state.registry
    if not loaded:
        # PRD requires an error envelope AND a readable readiness flag.
        return JSONResponse({"success": False, "error": {"code": "MODEL_UNAVAILABLE", "message": "The model service is unavailable."}, "data": {"status": "unavailable", "model_loaded": False}}, status_code=503)
    return {"success": True, "data": {"status": "ok", "model_loaded": True}}