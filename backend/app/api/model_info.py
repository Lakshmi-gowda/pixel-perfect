from fastapi import APIRouter, Request
from app.core.errors import unavailable

router = APIRouter()


@router.get("/model-info")
def model_info(request: Request):
    bundle = request.app.state.registry.get("cad")
    if bundle is None:
        raise unavailable()
    return {"success": True, "data": bundle.model_info()}