import asyncio
from types import SimpleNamespace

import httpx
import pytest
from fastapi.testclient import TestClient
from google.genai.errors import APIError

from app.api import chat as chat_api
from app.api.chat import ChatRequest, _gemini_contents, _map_gemini_error
from app.core.config import Settings
from app.main import create_app


def make_client(tmp_path, *, api_key="", max_body_bytes=65536):
    app = create_app(Settings(
        artifacts_dir=tmp_path,
        cors_origins=("http://localhost:5173",),
        gemini_api_key=api_key,
        max_body_bytes=max_body_bytes,
    ))
    return TestClient(app, raise_server_exceptions=False)


def test_chat_requires_configuration_without_fabricating_an_answer(tmp_path):
    with make_client(tmp_path) as client:
        response = client.post("/chat", json={"message": "What is CAD?"})
    assert response.status_code == 503
    assert response.json()["error"]["code"] == "CHAT_NOT_CONFIGURED"
    assert "data" not in response.json()


def test_chat_validates_message_and_limits_body_before_provider_request(tmp_path):
    with make_client(tmp_path, api_key="test-key", max_body_bytes=64) as client:
        empty = client.post("/chat", json={"message": "   "})
        large = client.post("/chat", content=" " * 65, headers={"Content-Type": "application/json"})
    assert empty.status_code == 400
    assert empty.json()["error"]["code"] == "INVALID_CHAT_REQUEST"
    assert large.status_code == 413
    assert large.json()["error"]["code"] == "REQUEST_TOO_LARGE"


def test_chat_contract_caps_history_and_preserves_consented_model_outputs():
    assessment = {
        "cad_prediction": "CAD",
        "probabilities": {"CAD": 0.75, "Normal": 0.25},
        "artery_predictions": {"LAD": {"stenotic_probability": 0.61, "predicted_class": "CAD"}},
    }
    chat = ChatRequest.model_validate({
        "message": "Explain my result.",
        "history": [{"role": "user", "content": "What is CAD?"}, {"role": "assistant", "content": "CAD affects arteries."}],
        "assessment": assessment,
    })
    contents = _gemini_contents(chat)
    assert [item.role for item in contents] == ["user", "model", "user"]
    assert "0.75" in contents[-1].parts[0].text
    assert "stenotic_probability" in contents[-1].parts[0].text
    with pytest.raises(ValueError):
        ChatRequest.model_validate({"message": "hello", "history": [{"role": "user", "content": "x"}] * 13})


def test_chat_returns_the_provider_reply_and_uses_server_configuration(tmp_path, monkeypatch):
    captured = {}

    class FakeModels:
        async def generate_content(self, **kwargs):
            captured.update(kwargs)
            return SimpleNamespace(text="A genuine provider response.")

    class FakeAsyncClient:
        models = FakeModels()

        async def __aenter__(self):
            return self

        async def __aexit__(self, *_):
            return None

    fake_client_args = {}
    monkeypatch.setattr(
        chat_api.genai,
        "Client",
        lambda **kwargs: (fake_client_args.update(kwargs) or SimpleNamespace(aio=FakeAsyncClient())),
    )
    with make_client(tmp_path, api_key="test-only-key") as client:
        response = client.post("/chat", json={"message": "What is CAD?"})

    assert response.status_code == 200
    assert response.json() == {"success": True, "data": {"reply": "A genuine provider response."}}
    assert fake_client_args["api_key"] == "test-only-key"
    assert captured["model"] == "gemini-2.5-flash"
    assert "emergency medical care" in captured["config"].system_instruction


@pytest.mark.parametrize(("failure", "status", "code"), [
    (APIError(403, {"message": "denied"}), 502, "GEMINI_AUTH_ERROR"),
    (APIError(429, {"message": "quota"}), 503, "GEMINI_QUOTA"),
    (asyncio.TimeoutError(), 504, "GEMINI_TIMEOUT"),
    (httpx.ConnectError("unreachable"), 502, "GEMINI_NETWORK_ERROR"),
])
def test_chat_reports_provider_failures_without_fake_answers(tmp_path, monkeypatch, failure, status, code):
    class FakeModels:
        async def generate_content(self, **_kwargs):
            raise failure

    class FakeAsyncClient:
        models = FakeModels()

        async def __aenter__(self):
            return self

        async def __aexit__(self, *_):
            return None

    monkeypatch.setattr(
        chat_api.genai,
        "Client",
        lambda **kwargs: SimpleNamespace(aio=FakeAsyncClient()),
    )
    with make_client(tmp_path, api_key="test-only-key") as client:
        response = client.post("/chat", json={"message": "What is CAD?"})
    assert response.status_code == status
    assert response.json()["error"]["code"] == code
    assert "data" not in response.json()


@pytest.mark.parametrize(("status", "expected_code"), [
    (400, "GEMINI_AUTH_ERROR"),
    (401, "GEMINI_AUTH_ERROR"),
    (403, "GEMINI_AUTH_ERROR"),
    (429, "GEMINI_QUOTA"),
    (500, "GEMINI_UNAVAILABLE"),
])
def test_gemini_provider_statuses_map_to_safe_errors(status, expected_code):
    error = _map_gemini_error(SimpleNamespace(code=status))
    assert error.code == expected_code
    assert "test-key" not in error.message
