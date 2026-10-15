import os
from dataclasses import dataclass, field
from pathlib import Path


LOCAL_DEVELOPMENT_ORIGINS = (
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:8080",
)


def _parse_cors_origins() -> tuple[str, ...]:
    return tuple(
        origin.strip()
        for origin in os.getenv(
            "CORS_ORIGINS",
            ",".join(LOCAL_DEVELOPMENT_ORIGINS),
        ).split(",")
        if origin.strip()
    )


@dataclass(frozen=True)
class Settings:
    artifacts_dir: Path = field(default_factory=lambda: Path(os.getenv("ARTIFACTS_DIR", Path(__file__).resolve().parents[1] / "ml/artifacts")))
    cors_origins: tuple[str, ...] = field(default_factory=_parse_cors_origins)
    env: str = field(default_factory=lambda: os.getenv("ENV", "development"))
    log_level: str = field(default_factory=lambda: os.getenv("LOG_LEVEL", "INFO"))
    max_body_bytes: int = field(default_factory=lambda: int(os.getenv("MAX_BODY_BYTES", "65536")))
    gemini_api_key: str = field(default_factory=lambda: os.getenv("GEMINI_API_KEY", ""))
    gemini_model: str = field(default_factory=lambda: os.getenv("GEMINI_MODEL", "gemini-2.5-flash"))
    gemini_timeout_seconds: int = field(default_factory=lambda: int(os.getenv("GEMINI_TIMEOUT_SECONDS", "45")))

    def __post_init__(self):
        if "*" in self.cors_origins or self.max_body_bytes < 1 or self.gemini_timeout_seconds < 1:
            raise ValueError("Use explicit CORS origins and positive request limits")
        if self.env == "production":
            if not any(origin.startswith("https://") for origin in self.cors_origins):
                raise ValueError("Production requires at least one HTTPS frontend origin")
            if any(
                not origin.startswith("https://")
                and origin not in LOCAL_DEVELOPMENT_ORIGINS
                for origin in self.cors_origins
            ):
                raise ValueError("Production requires HTTPS origins except explicit localhost development origins")