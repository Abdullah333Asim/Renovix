"""
Pydantic schemas for all API request / response bodies.
"""
from __future__ import annotations
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field


# ─── Enums ────────────────────────────────────────────────────────────────────

class JobStage(str, Enum):
    QUEUED = "queued"
    SEGMENTING = "segmenting"
    INPAINTING = "inpainting"
    GENERATING_3D = "generating_3d"
    OPTIMIZING = "optimizing"
    READY = "ready"
    ERROR = "error"


# ─── Room & Furniture ─────────────────────────────────────────────────────────

class DoorConfig(BaseModel):
    wall: str = Field("back", description="Wall location: front, back, left, right")
    position: float = Field(0.0, description="Metric offset along wall relative to wall center (meters)")
    widthM: float = Field(0.9, alias="width_m", description="Door width in meters")
    heightM: float = Field(2.1, alias="height_m", description="Door height in meters")

    model_config = {
        "populate_by_name": True,
        "serialize_by_alias": False,
    }


class RoomDimensions(BaseModel):
    width_m: float = Field(..., gt=0, le=50, description="Room width in metres (X-axis)")
    length_m: float = Field(..., gt=0, le=50, description="Room length in metres (Z-axis)")
    height_m: float = Field(..., gt=1, le=20, description="Room height in metres (Y-axis)")
    door: Optional[DoorConfig] = None


class FurnitureItem(BaseModel):
    id: str
    label: str
    glb_url: str
    dimensions: list[float] = Field(
        ..., min_length=3, max_length=3,
        description="Real-world bounding box [w, h, d] in metres"
    )
    position: list[float] = Field(
        ..., min_length=3, max_length=3,
        description="Initial position [x, y, z] in scene units"
    )
    rotation_y: float = Field(0.0, description="Y-axis rotation in radians")
    dominant_color: Optional[str] = Field(None, description="Dominant sampled hex color (e.g. #4A3525)")
    material_type: Optional[str] = Field(None, description="Estimated material type (wood, fabric, leather, metal)")
    template_id: Optional[str] = Field(None, description="Curated 3D template identifier")
    color_tint: Optional[str] = Field(None, description="Active PBR color tint hex")
    material_preset: Optional[str] = Field(None, description="Active material preset name")
    mesh_source: str = Field("template", description="Active mesh source: 'template' | 'reconstruction'")


class SceneTextures(BaseModel):
    floor: Optional[str] = None
    walls: list[str] = []


class SceneManifest(BaseModel):
    job_id: str
    room_dimensions: RoomDimensions
    textures: SceneTextures = SceneTextures()
    furniture: list[FurnitureItem] = []
    door: Optional[DoorConfig] = None


# ─── Detection Review ─────────────────────────────────────────────────────────

class DetectionReviewItem(BaseModel):
    item_id: str
    label: str
    confidence: float
    bbox_normalized: list[float] = Field(
        ..., min_length=4, max_length=4,
        description="[x_min, y_min, x_max, y_max] in normalized (0..1) coordinates"
    )
    preview_url: str = Field(..., description="URL to transparent RGBA cutout PNG")
    dimensions_estimated: list[float] = Field(
        ..., min_length=3, max_length=3,
        description="Estimated real-world [w, h, d] in metres"
    )
    dominant_color: Optional[str] = None
    material_type: Optional[str] = None


class DetectionReviewPayload(BaseModel):
    job_id: str
    photo_count: int
    detected_count: int
    detections: list[DetectionReviewItem] = []


# ─── Job Status ───────────────────────────────────────────────────────────────

class JobStatusResponse(BaseModel):
    job_id: str
    stage: JobStage
    progress: int = Field(..., ge=0, le=100)
    message: str
    error: Optional[str] = None
    detections: list[DetectionReviewItem] = []


# ─── API Responses ────────────────────────────────────────────────────────────

class GenerateResponse(BaseModel):
    job_id: str
    status: str = "queued"
    stream_url: str


class ErrorResponse(BaseModel):
    detail: str
    code: Optional[str] = None
