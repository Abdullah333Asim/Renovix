"""
In-memory job registry + async pipeline orchestrator.

Each job has:
  - A unique UUID
  - A shared asyncio.Queue for SSE event delivery
  - Background task that advances through pipeline stages
  - Lightweight detection review payload for client verification
"""
from __future__ import annotations

import asyncio
import logging
import uuid
from pathlib import Path
from typing import Any

from app.schemas import (
    DetectionReviewItem,
    DetectionReviewPayload,
    DoorConfig,
    FurnitureItem,
    JobStage,
    JobStatusResponse,
    RoomDimensions,
    SceneManifest,
    SceneTextures,
)

logger = logging.getLogger(__name__)


# ── Job record ────────────────────────────────────────────────────────────────

class Job:
    def __init__(self, job_id: str, dimensions: RoomDimensions, image_paths: list[Path]):
        self.job_id = job_id
        self.dimensions = dimensions
        self.image_paths = image_paths
        # Unbounded queue; SSE endpoint reads from it
        self.queue: asyncio.Queue[dict[str, Any]] = asyncio.Queue()
        self.stage: JobStage = JobStage.QUEUED
        self.manifest: SceneManifest | None = None
        self.detections: list[DetectionReviewItem] = []
        self.review_payload: DetectionReviewPayload | None = None

    def _status(self, stage: JobStage, progress: int, message: str, error: str | None = None) -> dict:
        self.stage = stage
        payload = JobStatusResponse(
            job_id=self.job_id,
            stage=stage,
            progress=progress,
            message=message,
            error=error,
            detections=self.detections,
        ).model_dump()
        return payload

    async def push(self, stage: JobStage, progress: int, message: str, error: str | None = None):
        """Enqueue an SSE status event."""
        payload = self._status(stage, progress, message, error)
        logger.info("[job %s] push stage=%s progress=%d msg=%s", self.job_id[:8], stage.value, progress, message)
        await self.queue.put(payload)

    async def push_detections_review(self, payload: DetectionReviewPayload):
        """Enqueue a lightweight detections review event."""
        self.review_payload = payload
        self.detections = payload.detections
        logger.info(
            "[job %s] push detections review payload with %d items",
            self.job_id[:8],
            payload.detected_count,
        )
        await self.queue.put({"__event__": "detections_reviewed", "data": payload.model_dump()})

    async def push_manifest(self, manifest: SceneManifest):
        """Enqueue the final manifest event."""
        self.manifest = manifest
        logger.info("[job %s] push manifest with %d furniture items", self.job_id[:8], len(manifest.furniture))
        await self.queue.put({"__event__": "manifest", "data": manifest.model_dump()})


# ── Registry ──────────────────────────────────────────────────────────────────

_JOBS: dict[str, Job] = {}


def create_job(dimensions: RoomDimensions, image_paths: list[Path]) -> Job:
    job_id = str(uuid.uuid4())
    job = Job(job_id, dimensions, image_paths)
    _JOBS[job_id] = job
    return job


def get_job(job_id: str) -> Job | None:
    return _JOBS.get(job_id)


# ── Pipeline runner ───────────────────────────────────────────────────────────

async def run_pipeline(job: Job, pipeline_mode: str, storage_dir: Path) -> None:
    """
    Orchestrates the full AI pipeline (or mock version) for a job.
    Sends SSE status updates to the job queue at each stage.
    """
    try:
        if pipeline_mode == "mock":
            await _run_mock_pipeline(job, storage_dir)
        else:
            await _run_real_pipeline(job, storage_dir)
    except Exception as exc:
        logger.exception("Pipeline failed for job %s: %s", job.job_id, exc)
        await job.push(JobStage.ERROR, 0, "Pipeline failed", str(exc))


# ─────────────────────────────────────────────────────────────────────────────
# MOCK PIPELINE (Development & Testing)
# ─────────────────────────────────────────────────────────────────────────────

SAMPLE_GLB_URL = (
    "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models"
    "/main/2.0/BoxTextured/glTF-Binary/BoxTextured.glb"
)

MOCK_STAGES: list[tuple[JobStage, int, str, float]] = [
    (JobStage.QUEUED,        5,  "Job queued. Initializing GPU pipeline...",            1.5),
    (JobStage.SEGMENTING,    20, "Grounding DINO + SAM 2 detecting furniture...",      1.8),
    (JobStage.SEGMENTING,    35, "Extracted 3 candidate furniture masks.",             1.5),
    (JobStage.INPAINTING,    45, "LaMa neural inpainting removing furniture...",       1.8),
    (JobStage.INPAINTING,    60, "Generated clean wall & floor surface textures.",     1.5),
    (JobStage.GENERATING_3D, 75, "TripoSR reconstructing 3D textured meshes...",       2.0),
    (JobStage.OPTIMIZING,    90, "Decimating meshes to 20k faces and floor-aligning...",1.5),
]


async def _run_mock_pipeline(job: Job, storage_dir: Path) -> None:
    for stage, progress, message, sleep_sec in MOCK_STAGES:
        await job.push(stage, progress, message)
        await asyncio.sleep(sleep_sec)

    dim = job.dimensions
    w, l = dim.width_m, dim.length_m

    furniture = [
        FurnitureItem(
            id="sofa-01",
            label="sofa",
            glb_url=SAMPLE_GLB_URL,
            dimensions=[2.0, 0.85, 0.90],
            position=[0.0, 0.0, -l * 0.3],
            rotation_y=0.0,
            dominant_color="#3B4252",
            material_type="fabric",
            template_id="sofa_three_seater",
            color_tint="#3B4252",
            material_preset="Grey Fabric",
            mesh_source="template",
        ),
        FurnitureItem(
            id="coffee-table-01",
            label="coffee table",
            glb_url=SAMPLE_GLB_URL,
            dimensions=[1.1, 0.45, 0.60],
            position=[0.0, 0.0, -l * 0.05],
            rotation_y=0.0,
            dominant_color="#8B5A2B",
            material_type="wood",
            template_id="table_coffee",
            color_tint="#8B5A2B",
            material_preset="Oak Wood",
            mesh_source="template",
        ),
        FurnitureItem(
            id="armchair-01",
            label="armchair",
            glb_url=SAMPLE_GLB_URL,
            dimensions=[0.85, 0.90, 0.85],
            position=[w * 0.3, 0.0, 0.0],
            rotation_y=-0.5,
            dominant_color="#4C566A",
            material_type="leather",
            template_id="armchair_lounge",
            color_tint="#4C566A",
            material_preset="Ivory Leather",
            mesh_source="template",
        ),
    ]

    if not dim.door:
        dim.door = DoorConfig(wall="front", position=0.0, widthM=0.9, heightM=2.1)

    manifest = SceneManifest(
        job_id=job.job_id,
        room_dimensions=dim,
        textures=SceneTextures(),
        furniture=furniture,
        door=dim.door,
    )

    await job.push(JobStage.READY, 100, "Room digital twin ready!")
    await job.push_manifest(manifest)


# ─────────────────────────────────────────────────────────────────────────────
# REAL AI PIPELINE (Phase 3: Vision + Phase 4: 2D-to-3D Reconstruction)
# ─────────────────────────────────────────────────────────────────────────────

async def _run_real_pipeline(job: Job, storage_dir: Path) -> None:
    """
    Executes the full AI pipeline:
    1. Grounding DINO detection + SAM instance masking -> 512x512 RGBA cutouts
    2. Non-Maximum Suppression (NMS) & lightweight Detection Review Payload
    3. Multimodal Vision LLM Spatial Layout & Door Planner
    4. LaMa inpainting -> clean floor & wall background textures
    5. TripoSR 2D-to-3D reconstruction -> textured 3D meshes
    6. Trimesh optimization & intelligent floor layout clustering -> .glb
    7. Scene Manifest packaging and real-time delivery
    """
    from app.pipeline.segmentation import VisionPipeline, deduplicate_cross_image_detections
    from app.pipeline.spatial_planner import plan_spatial_layout
    from app.pipeline.inpainting import BackgroundInpainter
    from app.pipeline.reconstruction import ReconstructionEngine
    from app.pipeline.mesh_processing import (
        compute_scene_layout,
        get_estimated_dimensions,
        optimize_and_export_mesh,
    )
    from app.storage.file_store import masks_dir, textures_dir, assets_dir

    dim = job.dimensions
    job_masks = masks_dir(storage_dir, job.job_id)
    job_textures = textures_dir(storage_dir, job.job_id)
    job_assets = assets_dir(storage_dir, job.job_id)

    await job.push(JobStage.QUEUED, 5, "Job initialized, loading vision models...")

    loop = asyncio.get_running_loop()

    # ── 1. Detection, NMS & Segmentation ─────────────────────────────────────
    await job.push(JobStage.SEGMENTING, 15, "Running Grounding DINO + SAM segmentation with NMS...")

    vision = VisionPipeline()
    all_detected = []
    inpainted_texture_paths = []

    inpainter = BackgroundInpainter()

    for idx, img_path in enumerate(job.image_paths):
        await job.push(
            JobStage.SEGMENTING,
            20 + int(15 * (idx / max(1, len(job.image_paths)))),
            f"Analyzing room photo {idx + 1} of {len(job.image_paths)} (conf >= 0.45, NMS IoU=0.5)...",
        )

        detected_items, union_mask = await loop.run_in_executor(
            None,
            lambda p=img_path: vision.detect_and_segment(
                p,
                job_masks,
                threshold=0.45,
                text_threshold=0.22,
                nms_iou_threshold=0.50,
            ),
        )
        all_detected.extend(detected_items)

        # ── 2. Inpainting ────────────────────────────────────────────────────
        await job.push(
            JobStage.INPAINTING,
            40 + int(15 * (idx / max(1, len(job.image_paths)))),
            f"Inpainting background textures for photo {idx + 1} with LaMa...",
        )
        out_tex = job_textures / f"inpainted_bg_{idx:02d}.png"
        await loop.run_in_executor(
            None,
            lambda p=img_path, m=union_mask, o=out_tex: inpainter.inpaint(p, m, o),
        )
        rel_tex_url = f"/data/jobs/{job.job_id}/textures/inpainted_bg_{idx:02d}.png"
        inpainted_texture_paths.append(rel_tex_url)

    # ── 3. Cross-Image Deduplication & Lightweight Review Payload ──────────────────────
    if len(job.image_paths) > 1:
        await job.push(JobStage.SEGMENTING, 38, f"Deduplicating {len(all_detected)} raw items across {len(job.image_paths)} photos...")
    all_detected = deduplicate_cross_image_detections(all_detected)

    # ── 3.5. Vision LLM Spatial Layout & Door Planner ───────────────────────────
    await job.push(JobStage.SEGMENTING, 39, "Running Vision LLM spatial reasoning & door planner...")
    spatial_plan = await loop.run_in_executor(
        None,
        lambda: plan_spatial_layout(
            image_paths=job.image_paths,
            room_width_m=dim.width_m,
            room_length_m=dim.length_m,
            room_height_m=dim.height_m,
            detected_items=all_detected,
        ),
    )

    # Filter door candidates out of 3D object list
    doors = [item for item in all_detected if item.label in ["door", "doorway", "entrance"]]
    all_detected = [item for item in all_detected if item.label not in ["door", "doorway", "entrance"]]

    # Auto-populate entrance door in RoomDimensions
    if spatial_plan and spatial_plan.door:
        dim.door = DoorConfig(
            wall=spatial_plan.door.wall,
            position=round(spatial_plan.door.offset_m, 2),
            widthM=spatial_plan.door.width_m,
            heightM=spatial_plan.door.height_m,
        )
        await job.push(
            JobStage.SEGMENTING,
            40,
            f"Entrance door mapped to {spatial_plan.door.wall} wall (offset: {spatial_plan.door.offset_m:.2f}m).",
        )
    elif doors:
        best_door = max(doors, key=lambda x: x.confidence)
        cx = (best_door.bbox[0] + best_door.bbox[2]) / 2.0
        offset_ratio = cx - 0.5
        position = offset_ratio * dim.width_m
        dim.door = DoorConfig(
            wall="back",
            position=round(position, 2),
            widthM=0.9,
            heightM=2.1,
        )
        await job.push(JobStage.SEGMENTING, 40, "Entrance door detected and mapped.")
    elif not dim.door:
        dim.door = DoorConfig(wall="front", position=0.0, widthM=0.9, heightM=2.1)

    review_items: list[DetectionReviewItem] = []
    for item in all_detected:
        preview_rel = f"/data/jobs/{job.job_id}/masks/{item.rgba_path.name}"
        estimated_dims = get_estimated_dimensions(item.label)
        review_items.append(
            DetectionReviewItem(
                item_id=item.item_id,
                label=item.label,
                confidence=item.confidence,
                bbox_normalized=item.bbox,
                preview_url=preview_rel,
                dimensions_estimated=estimated_dims,
                dominant_color=getattr(item, "dominant_color", "#8B5A2B"),
                material_type=getattr(item, "material_type", "wood"),
            )
        )

    review_payload = DetectionReviewPayload(
        job_id=job.job_id,
        photo_count=len(job.image_paths),
        detected_count=len(review_items),
        detections=review_items,
    )
    await job.push_detections_review(review_payload)
    await job.push(
        JobStage.INPAINTING,
        55,
        f"Verified {len(all_detected)} clean furniture items after NMS suppression.",
    )

    # ── 4. 2D-to-3D Reconstruction ───────────────────────────────────────────
    await job.push(JobStage.GENERATING_3D, 60, "Initializing 2D-to-3D reconstruction engine...")

    reconstructor = ReconstructionEngine()
    final_dims_map: dict[str, list[float]] = {}
    num_items = max(1, len(all_detected))

    for idx, item in enumerate(all_detected):
        progress_val = 65 + int(20 * ((idx + 1) / num_items))
        await job.push(
            JobStage.GENERATING_3D,
            progress_val,
            f"Generating 3D model for {item.label} ({idx + 1}/{len(all_detected)})...",
        )

        # Reconstruct raw 3D mesh from RGBA cutout
        raw_mesh = await loop.run_in_executor(
            None,
            lambda p=item.rgba_path, lbl=item.label: reconstructor.reconstruct_3d(p, lbl),
        )

        # ── 5. Mesh Optimization & GLB Export ────────────────────────────────
        out_glb = job_assets / f"{item.item_id}.glb"
        glb_path, final_dims = await loop.run_in_executor(
            None,
            lambda m=raw_mesh, lbl=item.label, o=out_glb: optimize_and_export_mesh(
                mesh=m,
                label=lbl,
                output_glb_path=o,
                target_faces=20000,
            ),
        )
        final_dims_map[item.item_id] = final_dims

    # ── 6. Intelligent Floor Layout Clustering & Placement ───────────────────
    await job.push(JobStage.OPTIMIZING, 92, "Clustering floor layout and resolving collisions...")

    furniture_items: list[FurnitureItem] = []
    item_map = {it.item_id: it for it in all_detected}

    # Build a fast lookup: item_id → Gemini-assigned placement
    # This guarantees 1:1 mapping even when compute_scene_layout reorders items.
    spatial_index: dict[str, Any] = {}
    if spatial_plan and spatial_plan.furniture:
        for sp_item in spatial_plan.furniture:
            spatial_index[sp_item.id] = sp_item
        logger.info(
            "[job %s] Spatial plan index built for %d item IDs: %s",
            job.job_id[:8], len(spatial_index), list(spatial_index.keys()),
        )

    if all_detected:
        items_layout_input = [
            {
                "item_id": item.item_id,
                "label": item.label,
                "dimensions": final_dims_map.get(item.item_id, get_estimated_dimensions(item.label)),
                "bbox": item.bbox,
            }
            for item in all_detected
        ]

        placed_candidates = compute_scene_layout(
            items_layout_input,
            room_width_m=dim.width_m,
            room_length_m=dim.length_m,
            margin_m=0.15,
            spatial_plan=spatial_plan,
        )

        for p in placed_candidates:
            rel_glb_url = f"/data/jobs/{job.job_id}/assets/{p.item_id}.glb"
            det = item_map.get(p.item_id)
            dom_col = getattr(det, "dominant_color", "#8B5A2B") if det else "#8B5A2B"
            mat_type = getattr(det, "material_type", "wood") if det else "wood"

            # ── 1:1 ID Match: use Gemini coordinates when available ──────────
            sp = spatial_index.get(p.item_id)
            if sp and sp.position and len(sp.position) >= 2:
                final_pos: list[float] = [
                    float(sp.position[0]),
                    0.0,
                    float(sp.position[2] if len(sp.position) > 2 else sp.position[1]),
                ]
                final_rot = float(sp.rotation_y_deg * 3.14159265 / 180.0)
                logger.info(
                    "[job %s] ✓ LLM-placed '%s' (id=%s) → [%.2f, 0.0, %.2f] rot=%.2f rad",
                    job.job_id[:8], p.label, p.item_id,
                    final_pos[0], final_pos[2], final_rot,
                )
            else:
                # Fall back to geometry-heuristic position from compute_scene_layout
                final_pos = list(p.position)
                final_rot = float(p.rotation_y)
                logger.warning(
                    "[job %s] ⚠ Fallback geometry placement for '%s' (id=%s) — no spatial_plan match",
                    job.job_id[:8], p.label, p.item_id,
                )

            lbl = p.label.lower()
            default_template = f"{lbl}_modern"
            if "bed" in lbl:
                default_template = "bed_modern_double"
            elif "armchair" in lbl:
                default_template = "armchair_lounge"
            elif "chair" in lbl:
                default_template = "chair_dining"
            elif "desk" in lbl:
                default_template = "desk_wooden"
            elif "coffee" in lbl or "table" in lbl:
                default_template = "table_coffee" if "coffee" in lbl else "table_dining_round"
            elif "wardrobe" in lbl or "closet" in lbl:
                default_template = "wardrobe_two_door"
            elif "bookshelf" in lbl or "bookcase" in lbl:
                default_template = "bookshelf_tall"
            elif "nightstand" in lbl:
                default_template = "nightstand_modern"
            elif "sofa" in lbl or "couch" in lbl:
                default_template = "sofa_three_seater"

            preset_name = "Oak Wood" if mat_type == "wood" else ("Grey Fabric" if mat_type == "fabric" else "Dark Walnut")

            furniture_items.append(
                FurnitureItem(
                    id=p.item_id,
                    label=p.label,
                    glb_url=rel_glb_url,
                    dimensions=p.dimensions,
                    position=final_pos,        # ← Gemini 1:1 coords (or heuristic fallback)
                    rotation_y=final_rot,      # ← Gemini rotation (or heuristic fallback)
                    dominant_color=dom_col,
                    material_type=mat_type,
                    template_id=default_template,
                    color_tint=dom_col,
                    material_preset=preset_name,
                    mesh_source="template",
                )
            )

    # Fallback if no furniture detected in photo
    if not furniture_items:
        fallback_glb = job_assets / "default_sofa.glb"
        from PIL import Image as PILImage
        dummy_img = PILImage.new("RGBA", (512, 512), (80, 100, 160, 255))
        raw_sofa = reconstructor._generate_parametric_furniture_mesh(dummy_img, "sofa")
        _, sofa_dims = optimize_and_export_mesh(raw_sofa, "sofa", fallback_glb)
        furniture_items = [
            FurnitureItem(
                id="default-sofa-1",
                label="sofa",
                glb_url=f"/data/jobs/{job.job_id}/assets/default_sofa.glb",
                dimensions=sofa_dims,
                position=[0.0, 0.0, 0.0],
                rotation_y=0.0,
            )
        ]

    # ── 7. Scene Packaging & Delivery ────────────────────────────────────────
    await job.push(JobStage.OPTIMIZING, 98, "Packaging 3D room digital twin...")

    manifest = SceneManifest(
        job_id=job.job_id,
        room_dimensions=dim,
        textures=SceneTextures(
            floor=inpainted_texture_paths[0] if inpainted_texture_paths else None,
            walls=inpainted_texture_paths,
        ),
        furniture=furniture_items,
        door=dim.door,
    )

    await job.push_manifest(manifest)
    await job.push(JobStage.READY, 100, "Room digital twin ready!")
