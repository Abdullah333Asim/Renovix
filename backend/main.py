"""
Renovix FastAPI Application Entry Point
"""
from __future__ import annotations

import logging
import logging.config
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.endpoints import router as rooms_router
from app.config import get_settings

# ── Structured logging ────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create storage directories on startup."""
    settings = get_settings()
    settings.storage_dir.mkdir(parents=True, exist_ok=True)
    (settings.storage_dir / "jobs").mkdir(parents=True, exist_ok=True)
    logger.info("Storage dir: %s", settings.storage_dir.resolve())
    logger.info("Pipeline mode: %s", settings.pipeline_mode)
    yield
    logger.info("Shutdown complete.")


app = FastAPI(
    title="Renovix API",
    description="AI-Powered 3D Room Digital Twin & Spatial Interior Staging Engine",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────────────────────────────
settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(rooms_router)

# ── Static file serving for generated assets (Phase 4) ───────────────────────
_data_dir = settings.storage_dir
_data_dir.mkdir(parents=True, exist_ok=True)
app.mount("/data", StaticFiles(directory=str(_data_dir), html=False), name="data")

# ── Health check ──────────────────────────────────────────────────────────────
@app.get("/health", tags=["system"], summary="Health check")
async def health():
    return {
        "status": "ok",
        "version": "1.0.0",
        "pipeline_mode": settings.pipeline_mode,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
