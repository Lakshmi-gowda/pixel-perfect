from app.core.errors import ServiceError


def parse_request(body):
    if type(body) is not dict or set(body) != {"features"} or type(body["features"]) is not dict:
        raise ServiceError(400, "INVALID_REQUEST", "Send a JSON object containing only a features object.")
    return body["features"]