import os
from dataclasses import dataclass, field
from pathlib import Path


@dataclass(frozen=True)
class Settings:
    artifacts_dir: Path = field(default_factory=lambda: Path(os.getenv("ARTIFACTS_DIR", Path(__file__).resolve().parents[1] / "ml/artifacts")))
    cors_origins: tuple[str, ...] = field(default_factory=lambda: tuple(x.strip() for x in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:8080").split(",") if x.strip()))
    env: str = field(default_factory=lambda: os.getenv("ENV", "development"))
    log_level: str = field(default_factory=lambda: os.getenv("LOG_LEVEL", "INFO"))
    max_body_bytes: int = field(default_factory=lambda: int(os.getenv("MAX_BODY_BYTES", "65536")))

    def __post_init__(self):
        if "*" in self.cors_origins or self.max_body_bytes < 1:
            raise ValueError("Use explicit CORS origins and a positive body limit")
        if self.env == "production" and (not self.cors_origins or any(not x.startswith("https://") for x in self.cors_origins)):
            raise ValueError("Production requires explicit HTTPS frontend origins")