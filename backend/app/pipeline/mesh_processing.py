"""
Mesh Processing, Geometry Optimization, and Heuristic Floor Placement (trimesh).

Applies:
  1. Bottom-center pivot translation (floor alignment at Y=0)
  2. Real-world metric dimension scaling (meters)
  3. Quadric error decimation (target: ~15k-25k triangular faces)
  4. Heuristic clustering and wall-aligned room layout placement
  5. Web-ready binary GLB export
"""
from __future__ import annotations

import logging
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

import numpy as np

logger = logging.getLogger(__name__)

# Standard real-world bounding box dimensions [Width X, Height Y, Depth Z] in meters
REAL_WORLD_DIMENSIONS: dict[str, list[float]] = {
    "sofa": [2.10, 0.85, 0.95],
    "couch": [2.20, 0.85, 0.95],
    "armchair": [0.85, 0.90, 0.85],
    "chair": [0.55, 0.88, 0.55],
    "table": [1.40, 0.75, 0.80],
    "dining table": [1.60, 0.76, 0.90],
    "coffee table": [1.20, 0.45, 0.65],
    "desk": [1.40, 0.75, 0.70],
    "bed": [1.60, 1.05, 2.10],
    "wardrobe": [1.20, 1.95, 0.60],
    "closet": [1.30, 2.00, 0.65],
    "cabinet": [1.00, 1.20, 0.45],
    "bookshelf": [0.90, 1.80, 0.35],
    "bookcase": [0.90, 1.80, 0.35],
    "nightstand": [0.50, 0.60, 0.45],
    "dresser": [1.10, 0.90, 0.50],
}

DEFAULT_DIMENSIONS: list[float] = [1.00, 0.80, 0.80]

WALL_HUGGING_CLASSES = {
    "wardrobe",
    "closet",
    "bookshelf",
    "bookcase",
    "cabinet",
    "dresser",
    "bed",
    "desk",
    "nightstand",
}


@dataclass
class PlacementCandidate:
    item_id: str
    label: str
    dimensions: list[float]  # [width, height, depth]
    bbox_2d: list[float]     # [x0, y0, x1, y1] normalized (0..1)
    position: list[float]    # [x, y, z] in meters
    rotation_y: float        # in radians


def get_estimated_dimensions(label: str) -> list[float]:
    """Look up target real-world bounding box dimensions based on label."""
    clean = label.lower().strip()
    for key, dims in REAL_WORLD_DIMENSIONS.items():
        if key in clean:
            return list(dims)
    return list(DEFAULT_DIMENSIONS)


def optimize_and_export_mesh(
    mesh,
    label: str,
    output_glb_path: Path,
    target_faces: int = 20000,
    enforce_dimensions: Optional[list[float]] = None,
) -> tuple[Path, list[float]]:
    """
    Optimizes a 3D mesh for web rendering and exports to binary GLB.
    
    Operations:
      1. Centers X/Z at 0 and aligns bottom face flush with Y=0.
      2. Scales mesh to real-world metric dimensions in meters.
      3. Decimates mesh triangles using Quadric Error Metrics (QEM).
      4. Exports binary GLB file.
      
    Returns:
        Tuple of (output_glb_path, final_dimensions_list_xyz)
    """
    import trimesh

    if not isinstance(mesh, trimesh.Trimesh):
        if isinstance(mesh, trimesh.Scene):
            mesh = mesh.dump(concatenate=True)

    # 1. Pivot Translation: Bottom-center at (0, 0, 0)
    bounds = mesh.bounds
    min_bound, max_bound = bounds[0], bounds[1]
    center_x = (min_bound[0] + max_bound[0]) / 2.0
    bottom_y = min_bound[1]
    center_z = (min_bound[2] + max_bound[2]) / 2.0

    translation = [-center_x, -bottom_y, -center_z]
    mesh.apply_translation(translation)
    logger.info("Aligned mesh pivot to bottom-center (Y=0)")

    # 2. Metric Dimension Scaling
    target_dims = enforce_dimensions or get_estimated_dimensions(label)
    current_extents = mesh.extents

    scale_x = target_dims[0] / max(1e-4, current_extents[0])
    scale_y = target_dims[1] / max(1e-4, current_extents[1])
    scale_z = target_dims[2] / max(1e-4, current_extents[2])

    scale_matrix = np.diag([scale_x, scale_y, scale_z, 1.0])
    mesh.apply_transform(scale_matrix)
    logger.info("Scaled mesh to target dimensions: %s", target_dims)

    # 3. Quadric Decimation (target 15k-25k faces for 60fps web performance)
    initial_faces = len(mesh.faces)
    if initial_faces > target_faces:
        try:
            logger.info("Decimating mesh from %d to target %d faces...", initial_faces, target_faces)
            mesh = mesh.simplify_quadric_decimation(target_faces)
            logger.info("Decimation complete: %d faces remaining", len(mesh.faces))
        except Exception as e:
            logger.warning("Quadric decimation skipped (%s), using original geometry", e)

    # 4. Binary GLB Export
    output_glb_path.parent.mkdir(parents=True, exist_ok=True)
    mesh.export(str(output_glb_path), file_type="glb")
    logger.info("Exported optimized GLB -> %s", output_glb_path.resolve())

    final_dims = [float(v) for v in mesh.extents]
    return output_glb_path, final_dims


def compute_scene_layout(
    items_meta: list[dict],
    room_width_m: float,
    room_length_m: float,
    margin_m: float = 0.12,
    spatial_plan: Optional[Any] = None,
) -> list[PlacementCandidate]:
    """
    Computes realistic 3D floor placement and rotations for detected furniture items.
    
    If spatial_plan (from Vision LLM) is provided, uses its predicted metric coordinates
    and rotation angles, then applies boundary clamping and AABB collision relaxation.
    Otherwise, uses 2D camera ray projection and wall-alignment heuristics.
    """
    w_half = room_width_m / 2.0
    l_half = room_length_m / 2.0

    placements: list[PlacementCandidate] = []

    # Build lookup map from spatial_plan if available
    spatial_lookup: dict[str, Any] = {}
    if spatial_plan and hasattr(spatial_plan, "furniture"):
        for f in spatial_plan.furniture:
            if hasattr(f, "id"):
                spatial_lookup[f.id] = f
            if hasattr(f, "label"):
                spatial_lookup[f.label.lower().strip()] = f

    for idx, item in enumerate(items_meta):
        item_id = item["item_id"]
        label = item["label"].lower().strip()
        dims = item["dimensions"]  # [width_x, height_y, depth_z]
        bbox_2d = item.get("bbox", [0.25, 0.25, 0.75, 0.75])

        bx0, by0, bx1, by1 = bbox_2d
        # Normalized center in photo (-0.5 to 0.5)
        norm_cx = ((bx0 + bx1) / 2.0) - 0.5
        norm_cz = ((by0 + by1) / 2.0) - 0.5

        obj_w, obj_h, obj_d = dims[0], dims[1], dims[2]

        # Check if spatial planner predicted coordinates for this item
        matched_spatial = spatial_lookup.get(item_id) or spatial_lookup.get(label)
        if not matched_spatial and spatial_plan and hasattr(spatial_plan, "furniture") and idx < len(spatial_plan.furniture):
            matched_spatial = spatial_plan.furniture[idx]

        if matched_spatial:
            sp_pos = getattr(matched_spatial, "position", [0.0, 0.0])
            pos_x = float(sp_pos[0])
            pos_z = float(sp_pos[1] if len(sp_pos) == 2 else sp_pos[2])
            rot_deg = float(getattr(matched_spatial, "rotation_y_deg", 0.0))
            rotation_y = float(np.radians(rot_deg))
            logger.info("Applied Vision LLM spatial coordinates for %s: pos=[%.2f, %.2f], rot=%.1f deg", label, pos_x, pos_z, rot_deg)
        else:
            is_wall_hugging = any(wh in label for wh in WALL_HUGGING_CLASSES)
            rotation_y = 0.0
            pos_x = 0.0
            pos_z = 0.0

            if is_wall_hugging:
                # Determine which wall is closest based on 2D photo position
                if norm_cx < -0.18:
                    # Left Wall (facing East)
                    pos_x = -w_half + (obj_d / 2.0) + margin_m
                    pos_z = norm_cz * room_length_m * 0.7
                    rotation_y = float(np.pi / 2.0)
                elif norm_cx > 0.18:
                    # Right Wall (facing West)
                    pos_x = w_half - (obj_d / 2.0) - margin_m
                    pos_z = norm_cz * room_length_m * 0.7
                    rotation_y = float(-np.pi / 2.0)
                else:
                    # Back Wall (facing South)
                    pos_x = norm_cx * room_width_m * 0.7
                    pos_z = -l_half + (obj_d / 2.0) + margin_m
                    rotation_y = 0.0
            else:
                # Freestanding interior item
                pos_x = norm_cx * room_width_m * 0.65
                pos_z = norm_cz * room_length_m * 0.65
                # Face slightly toward room center
                rotation_y = 0.0 if pos_z < 0 else float(np.pi)

        # Clamp within room boundaries
        min_x = -w_half + (obj_w / 2.0) + margin_m
        max_x = w_half - (obj_w / 2.0) - margin_m
        min_z = -l_half + (obj_d / 2.0) + margin_m
        max_z = l_half - (obj_d / 2.0) - margin_m

        if min_x > max_x:
            pos_x = 0.0
        else:
            pos_x = float(max(min_x, min(max_x, pos_x)))

        if min_z > max_z:
            pos_z = 0.0
        else:
            pos_z = float(max(min_z, min(max_z, pos_z)))

        candidate = PlacementCandidate(
            item_id=item_id,
            label=label,
            dimensions=dims,
            bbox_2d=bbox_2d,
            position=[pos_x, 0.0, pos_z],
            rotation_y=rotation_y,
        )
        placements.append(candidate)

    # ── Collision Resolution / Nudge Separation ──────────────────────────────
    for _ in range(5):  # Multiple relaxation iterations
        for i in range(len(placements)):
            for j in range(i + 1, len(placements)):
                p1 = placements[i]
                p2 = placements[j]

                dx = p2.position[0] - p1.position[0]
                dz = p2.position[2] - p1.position[2]

                min_dist_x = (p1.dimensions[0] + p2.dimensions[0]) / 2.0 + 0.10
                min_dist_z = (p1.dimensions[2] + p2.dimensions[2]) / 2.0 + 0.10

                overlap_x = min_dist_x - abs(dx)
                overlap_z = min_dist_z - abs(dz)

                if overlap_x > 0 and overlap_z > 0:
                    # Overlap detected — repel along the smaller overlap axis
                    if overlap_x < overlap_z:
                        nudge = (overlap_x / 2.0) * (1.0 if dx >= 0 else -1.0)
                        p2.position[0] += nudge
                        p1.position[0] -= nudge
                    else:
                        nudge = (overlap_z / 2.0) * (1.0 if dz >= 0 else -1.0)
                        p2.position[2] += nudge
                        p1.position[2] -= nudge

                    # Re-clamp both
                    for p in (p1, p2):
                        w_bound = (room_width_m - p.dimensions[0]) / 2.0 - margin_m
                        l_bound = (room_length_m - p.dimensions[2]) / 2.0 - margin_m
                        p.position[0] = float(max(-w_bound, min(w_bound, p.position[0]))) if w_bound > 0 else 0.0
                        p.position[2] = float(max(-l_bound, min(l_bound, p.position[2]))) if l_bound > 0 else 0.0

    return placements
