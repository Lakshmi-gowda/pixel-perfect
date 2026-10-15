import asyncio
import json
import logging
from typing import Literal

import httpx
from fastapi import APIRouter, Request
from google import genai
from google.genai import errors as genai_errors
from google.genai import types
from pydantic import BaseModel, ConfigDict, Field, ValidationError, model_validator

from app.core.errors import ServiceError

router = APIRouter()
logger = logging.getLogger("cad.chat")

SYSTEM_INSTRUCTION = """You are Aurapulse's educational heart-health assistant.
Explain cardiovascular concepts such as coronary artery disease (CAD), stenosis, coronary arteries, risk factors, and general prevention in plain, calm language. You are not a clinician and must never claim to diagnose, replace a doctor, or replace emergency assessment. Never prescribe medication or advise starting, stopping, or changing medication.

For possible heart attack or other emergency symptoms (including chest pressure, severe shortness of breath, cold sweating, fainting, or pain spreading to the arm, jaw, back, or shoulder), tell the person to seek emergency medical care immediately. In India, call 112 or the locally available emergency service. Tell them not to delay emergency care to continue chatting.

Never invent patient information, assessment results, probabilities, diagnoses, or missing artery values. An AI prediction is not a confirmed clinical diagnosis. A model probability is not a measured blockage percentage. If actual assessment results were not supplied in this request, ask the user to complete an assessment or share the result values. If results are supplied, preserve their labels and values exactly when referring to them, and explain them as model outputs rather than a diagnosis or measured blockage. Do not infer unavailable LAD, LCX, or RCA results. Keep the response educational and recommend discussing concerns with a qualified health professional."""


class ChatHistoryItem(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=8000)


class ArteryResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    stenotic_probability: float = Field(ge=0, le=1)
    predicted_class: str | None = Field(default=None, max_length=80)


class ChatAssessment(BaseModel):
    model_config = ConfigDict(extra="forbid")

    cad_prediction: Literal["CAD", "Normal"]
    probabilities: dict[Literal["CAD", "Normal"], float]
    artery_predictions: dict[Literal["LAD", "LCX", "RCA"], ArteryResult] = Field(default_factory=dict)

    @model_validator(mode="after")
    def validate_probabilities(self):
        if set(self.probabilities) != {"CAD", "Normal"}:
            raise ValueError("Both CAD and Normal probabilities are required.")
        if any(not 0 <= probability <= 1 for probability in self.probabilities.values()):
            raise ValueError("Probabilities must be between zero and one.")
        return self


class ChatRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    message: str = Field(min_length=1, max_length=3000)
    history: list[ChatHistoryItem] = Field(default_factory=list, max_length=12)
    assessment: ChatAssessment | None = None

    @model_validator(mode="after")
    def validate_total_content(self):
        total = len(self.message) + sum(len(item.content) for item in self.history)
        if total > 16000:
            raise ValueError("The conversation is too long.")
        return self


def _reject_duplicate_keys(pairs):
    result = {}
    for name, value in pairs:
        if name in result:
            raise ValueError("Duplicate JSON key")
        result[name] = value
    return result


async def _read_chat_request(request: Request) -> ChatRequest:
    if request.headers.get("content-type", "").split(";")[0].strip().lower() != "application/json":
        raise ServiceError(400, "INVALID_CHAT_REQUEST", "Send an application/json request.")
    body = bytearray()
    async for chunk in request.stream():
        body.extend(chunk)
        if len(body) > request.app.state.settings.max_body_bytes:
            raise ServiceError(413, "REQUEST_TOO_LARGE", "The chat request exceeds the allowed size.")
    try:
        payload = json.loads(body, object_pairs_hook=_reject_duplicate_keys)
        return ChatRequest.model_validate(payload)
    except (ValueError, UnicodeDecodeError, RecursionError, ValidationError):
        raise ServiceError(400, "INVALID_CHAT_REQUEST", "Provide a non-empty message and a valid, size-limited conversation.") from None


def _gemini_contents(chat: ChatRequest) -> list[types.Content]:
    contents = [
        types.Content(
            role="user" if item.role == "user" else "model",
            parts=[types.Part.from_text(text=item.content)],
        )
        for item in chat.history
    ]
    prompt = chat.message
    if chat.assessment is not None:
        prompt += (
            "\n\nThe user explicitly consented to share these assessment outputs for this conversation. "
            "Explain only the provided outputs; do not interpret a probability as measured blockage. "
            "Exact assessment output values: "
            + json.dumps(chat.assessment.model_dump(), separators=(",", ":"), ensure_ascii=True)
        )
    contents.append(types.Content(role="user", parts=[types.Part.from_text(text=prompt)]))
    return contents


def _map_gemini_error(error: genai_errors.APIError) -> ServiceError:
    status = getattr(error, "code", None)
    if status in (400, 401, 403):
        return ServiceError(502, "GEMINI_AUTH_ERROR", "The AI provider rejected its server configuration. Please try again later.")
    if status == 429:
        return ServiceError(503, "GEMINI_QUOTA", "The AI assistant is temporarily at capacity. Please try again shortly.")
    if isinstance(status, int) and status >= 500:
        return ServiceError(502, "GEMINI_UNAVAILABLE", "The AI provider is temporarily unavailable. Please try again.")
    return ServiceError(502, "GEMINI_REQUEST_FAILED", "The AI assistant could not complete this request. Please try again.")


@router.post("/chat")
async def chat(request: Request):
    chat_request = await _read_chat_request(request)
    settings = request.app.state.settings
    if not settings.gemini_api_key.strip() or not settings.gemini_model.strip():
        raise ServiceError(503, "CHAT_NOT_CONFIGURED", "The AI assistant is not configured yet.")

    try:
        client = genai.Client(
            api_key=settings.gemini_api_key,
            http_options=types.HttpOptions(timeout=settings.gemini_timeout_seconds * 1000),
        )
        async with client.aio as async_client:
            response = await asyncio.wait_for(
                async_client.models.generate_content(
                    model=settings.gemini_model,
                    contents=_gemini_contents(chat_request),
                    config=types.GenerateContentConfig(
                        system_instruction=SYSTEM_INSTRUCTION,
                        temperature=0.3,
                        max_output_tokens=900,
                    ),
                ),
                timeout=settings.gemini_timeout_seconds,
            )
        answer = response.text
        if not isinstance(answer, str) or not answer.strip():
            raise ServiceError(502, "GEMINI_EMPTY_RESPONSE", "The AI assistant returned no answer. Please try again.")
        return {"success": True, "data": {"reply": answer.strip()}}
    except ServiceError:
        raise
    except genai_errors.APIError as error:
        raise _map_gemini_error(error) from None
    except (asyncio.TimeoutError, TimeoutError, httpx.TimeoutException):
        raise ServiceError(504, "GEMINI_TIMEOUT", "The AI assistant took too long to respond. Please try again.") from None
    except httpx.TransportError:
        raise ServiceError(502, "GEMINI_NETWORK_ERROR", "The AI provider could not be reached. Please try again shortly.") from None
    except Exception as error:
        logger.error("Gemini request failed (%s)", type(error).__name__)
        raise ServiceError(502, "GEMINI_REQUEST_FAILED", "The AI assistant could not complete this request. Please try again.") from None
