"""
Application settings loaded from environment / .env file.
"""
from functools import lru_cache
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # ── CORS ──────────────────────────────────────────────────────────────
    # Plain string; split on commas at runtime via the cors_origins property
    cors_origins_str: str = "http://localhost:5173"

    # ── Storage ───────────────────────────────────────────────────────────
    storage_dir: Path = Path("./data")

    # ── Pipeline mode ─────────────────────────────────────────────────────
    pipeline_mode: str = "mock"

    # ── Hugging Face & Vision LLM Keys ───────────────────────────────────
    huggingface_token: str = ""
    gemini_api_key: str = ""
    openai_api_key: str = ""

    # ── Model paths (Phase 3+) ────────────────────────────────────────────
    sam2_checkpoint: Path = Path("./weights/sam2_hiera_large.pt")
    grounding_dino_config: Path = Path("./weights/GroundingDINO_SwinT_OGC.cfg.py")
    grounding_dino_checkpoint: Path = Path("./weights/groundingdino_swint_ogc.pth")
    lama_model_dir: Path = Path("./weights/big-lama")
    triposr_model_id: str = "stabilityai/TripoSR"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",         # ← silently ignore unknown env vars
    )

    def get_cors_origins(self) -> list[str]:
        """Return CORS origins as a list (split on commas)."""
        return [o.strip() for o in self.cors_origins_str.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
