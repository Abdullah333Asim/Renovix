"""
API Router — /api/v1/rooms/

Routes
------
POST /api/v1/rooms/generate
    Accept multipart form: room dimensions + 1–4 images.
    Persist uploads, enqueue job, kick off background pipeline.
    Returns { job_id, status, stream_url }.

GET  /api/v1/rooms/{job_id}/stream
    Server-Sent Events stream.
    Emits `message` events for progress updates.
    Emits `detections_reviewed` event when lightweight review payload is ready.
    Emits a named `manifest` event when the scene is ready.

GET  /api/v1/rooms/{job_id}/detections
    Returns the lightweight DetectionReviewPayload (verified classes, bboxes, previews).

GET  /api/v1/rooms/{job_id}/status
    Synchronous poll endpoint (for clients that can't use SSE).

GET  /api/v1/rooms/{job_id}/manifest
    Returns the finished SceneManifest (only available after stage=ready).
"""
from __future__ import annotations

import asyncio
import json
import logging
import mimetypes
from typing import Annotated

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    UploadFile,
    status,
)
from fastapi.responses import StreamingResponse

from app.config import Settings, get_settings
from app.core.job_manager import create_job, get_job, run_pipeline
from app.schemas import (
    DetectionReviewPayload,
    ErrorResponse,
    GenerateResponse,
    JobStatusResponse,
    RoomDimensions,
    SceneManifest,
)
from app.storage.file_store import ensure_job_dirs, save_upload

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/rooms", tags=["rooms"])

ALLOWED_MIME = {"image/jpeg", "image/png", "image/webp"}
MAX_IMAGES = 4
MAX_IMAGE_BYTES = 20 * 1024 * 1024  # 20 MB


# ─── POST /generate ───────────────────────────────────────────────────────────

@router.post(
    "/generate",
    response_model=GenerateResponse,
    status_code=status.HTTP_202_ACCEPTED,
    responses={400: {"model": ErrorResponse}, 422: {"model": ErrorResponse}},
    summary="Submit room photos for 3D generation",
)
async def generate_room(
    settings: Annotated[Settings, Depends(get_settings)],
    width_m: float = Form(...),
    length_m: float = Form(...),
    height_m: float = Form(...),
    images: list[UploadFile] = File(...),
):
    # ── Validate dimensions ───────────────────────────────────────────────
    try:
        dimensions = RoomDimensions(width_m=width_m, length_m=length_m, height_m=height_m)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid dimensions: {exc}")

    # ── Validate images ───────────────────────────────────────────────────
    if not images or len(images) > MAX_IMAGES:
        raise HTTPException(
            status_code=400,
            detail=f"Provide between 1 and {MAX_IMAGES} images.",
        )

    for img in images:
        mime = img.content_type or mimetypes.guess_type(img.filename or "")[0] or ""
        if mime not in ALLOWED_MIME:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported image type '{mime}'. Use JPEG, PNG, or WebP.",
            )

    # ── Create job & persist uploads ──────────────────────────────────────
    job = create_job(dimensions, [])
    ensure_job_dirs(settings.storage_dir, job.job_id)

    saved_paths = []
    for idx, img in enumerate(images):
        raw = await img.read()
        if len(raw) > MAX_IMAGE_BYTES:
            raise HTTPException(
                status_code=400,
                detail=f"Image {idx + 1} exceeds the 20 MB limit.",
            )
        ext = (img.filename or "photo.jpg").rsplit(".", 1)[-1]
        filename = f"photo_{idx:02d}.{ext}"
        path = await save_upload(settings.storage_dir, job.job_id, filename, raw)
        saved_paths.append(path)

    job.image_paths = saved_paths

    # ── Launch pipeline as a concurrent asyncio task ──────────────────────
    asyncio.create_task(
        run_pipeline(
            job=job,
            pipeline_mode=settings.pipeline_mode,
            storage_dir=settings.storage_dir,
        ),
        name=f"pipeline-{job.job_id[:8]}",
    )
    logger.info("Launched pipeline task for job %s (mode=%s)", job.job_id, settings.pipeline_mode)

    return GenerateResponse(
        job_id=job.job_id,
        status="queued",
        stream_url=f"/api/v1/rooms/{job.job_id}/stream",
    )


# ─── GET /{job_id}/stream  (SSE) ──────────────────────────────────────────────

@router.get(
    "/{job_id}/stream",
    summary="Server-Sent Events stream for job progress",
    response_class=StreamingResponse,
)
async def stream_job(
    job_id: str,
    settings: Annotated[Settings, Depends(get_settings)],
):
    job = get_job(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found.")

    async def event_generator():
        """
        Reads from the job's asyncio.Queue and formats as SSE.

        Standard progress events    → `data: {json}\\n\\n`
        Detection review event      → `event: detections_reviewed\\ndata: {json}\\n\\n`
        Final manifest event        → `event: manifest\\ndata: {json}\\n\\n`
        """
        logger.info("SSE stream opened for job %s", job_id)

        # Immediate connection acknowledgement — client confirms stream is live
        yield "data: {\"connected\": true}\n\n"

        consecutive_timeouts = 0
        MAX_TIMEOUTS = 20  # 20 × 30s = 10 min max session

        while True:
            try:
                payload = await asyncio.wait_for(job.queue.get(), timeout=30.0)
                consecutive_timeouts = 0
            except asyncio.TimeoutError:
                consecutive_timeouts += 1
                if consecutive_timeouts >= MAX_TIMEOUTS:
                    logger.warning("SSE stream for job %s timed out after %d heartbeats", job_id, MAX_TIMEOUTS)
                    break
                # SSE comment — keeps the TCP connection alive without triggering onmessage
                yield ": heartbeat\n\n"
                continue

            if "__event__" in payload:
                event_name = payload["__event__"]
                data_json = json.dumps(payload["data"])
                logger.info("SSE sending named event '%s' for job %s", event_name, job_id)
                yield f"event: {event_name}\ndata: {data_json}\n\n"
                if event_name == "manifest":
                    break
                continue

            data_json = json.dumps(payload)
            logger.debug("SSE progress for job %s: %s", job_id, payload.get("stage"))
            yield f"data: {data_json}\n\n"

            # Terminal error stage — close early on failure
            if payload.get("stage") == "error":
                break

        logger.info("SSE stream closed for job %s", job_id)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "X-Accel-Buffering": "no",      # disable Nginx/proxy buffering
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
        },
    )


# ─── GET /{job_id}/detections ─────────────────────────────────────────────────

@router.get(
    "/{job_id}/detections",
    response_model=DetectionReviewPayload,
    summary="Retrieve lightweight detection review payload",
)
async def get_detections(job_id: str):
    job = get_job(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found.")
    if job.review_payload is not None:
        return job.review_payload
    return DetectionReviewPayload(
        job_id=job.job_id,
        photo_count=len(job.image_paths),
        detected_count=len(job.detections),
        detections=job.detections,
    )


# ─── GET /{job_id}/status  (poll) ─────────────────────────────────────────────

@router.get(
    "/{job_id}/status",
    response_model=JobStatusResponse,
    summary="Poll current job status (synchronous)",
)
async def get_status(job_id: str):
    job = get_job(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found.")
    return JobStatusResponse(
        job_id=job.job_id,
        stage=job.stage,
        progress=0,
        message=f"Stage: {job.stage.value}",
        detections=job.detections,
    )


# ─── GET /{job_id}/manifest ───────────────────────────────────────────────────

@router.get(
    "/{job_id}/manifest",
    response_model=SceneManifest,
    summary="Retrieve the completed scene manifest",
)
async def get_manifest(job_id: str):
    job = get_job(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found.")
    if job.manifest is None:
        raise HTTPException(
            status_code=425,
            detail="Scene not yet ready. Subscribe to the SSE stream.",
        )
    return job.manifest
