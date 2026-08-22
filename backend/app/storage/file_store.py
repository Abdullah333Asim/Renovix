"""
Local filesystem storage helper.

Directory layout under STORAGE_DIR:
  {storage_dir}/
    jobs/
      {job_id}/
        images/       ← uploaded source photos
        masks/        ← RGBA segmentation cutouts  (Phase 3)
        textures/     ← inpainted floor/wall images (Phase 3)
        meshes/       ← raw GLBs from TripoSR       (Phase 4)
        assets/       ← final optimised GLBs         (Phase 4)
"""
from __future__ import annotations

import shutil
from pathlib import Path

import aiofiles


def job_dir(storage_dir: Path, job_id: str) -> Path:
    return storage_dir / "jobs" / job_id


def images_dir(storage_dir: Path, job_id: str) -> Path:
    return job_dir(storage_dir, job_id) / "images"


def masks_dir(storage_dir: Path, job_id: str) -> Path:
    return job_dir(storage_dir, job_id) / "masks"


def textures_dir(storage_dir: Path, job_id: str) -> Path:
    return job_dir(storage_dir, job_id) / "textures"


def meshes_dir(storage_dir: Path, job_id: str) -> Path:
    return job_dir(storage_dir, job_id) / "meshes"


def assets_dir(storage_dir: Path, job_id: str) -> Path:
    return job_dir(storage_dir, job_id) / "assets"


def ensure_job_dirs(storage_dir: Path, job_id: str) -> None:
    """Create all subdirectories for a new job."""
    for fn in (images_dir, masks_dir, textures_dir, meshes_dir, assets_dir):
        fn(storage_dir, job_id).mkdir(parents=True, exist_ok=True)


async def save_upload(storage_dir: Path, job_id: str, filename: str, data: bytes) -> Path:
    """Persist an uploaded image file and return its absolute path."""
    dest = images_dir(storage_dir, job_id) / filename
    async with aiofiles.open(dest, "wb") as f:
        await f.write(data)
    return dest


def delete_job(storage_dir: Path, job_id: str) -> None:
    """Remove all files for a job (e.g. after TTL expiry)."""
    d = job_dir(storage_dir, job_id)
    if d.exists():
        shutil.rmtree(d)
