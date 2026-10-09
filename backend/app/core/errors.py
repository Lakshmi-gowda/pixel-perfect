from fastapi.responses import JSONResponse


class ServiceError(Exception):
    def __init__(self, status, code, message, fields=None):
        super().__init__(message)
        self.status, self.code, self.message, self.fields = status, code, message, fields


def error_response(error):
    details = {"code": error.code, "message": error.message}
    if error.fields is not None:
        details["fields"] = error.fields
    return JSONResponse({"success": False, "error": details}, status_code=error.status)


def unavailable():
    return ServiceError(503, "MODEL_UNAVAILABLE", "The model service is unavailable.")