"""
In-memory job registry + async pipeline orchestrator.
Handles fine-grained catalog resolution, material/color binding,
and dual placement (floor grid & wall-flush mounting).
"""
from __future__ import annotations

import asyncio
import logging
import math
import re
import uuid
from pathlib import Path
from typing import Any, Optional

from app.config import get_settings
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

SAMPLE_GLB_URL = (
    "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models"
    "/main/2.0/BoxTextured/glTF-Binary/BoxTextured.glb"
)

# ─── Fine-Grained Catalog: label → {material_variant: (template_id, [W,H,D], mat_type, tint, preset)} ──
LABEL_CATALOG: dict[str, dict] = {
    # Beds & variants
    "bed": {
        "default":   ("bed_modern_double",      [1.80, 1.10, 2.10], "fabric",  "#D8CEBE", "Warm Beige"),
        "fabric":    ("bed_upholstered_fabric", [1.80, 1.15, 2.10], "fabric",  "#D8CEBE", "Warm Beige"),
        "upholstered":("bed_upholstered_fabric",[1.80, 1.15, 2.10], "fabric",  "#7E8287", "Grey Fabric"),
        "wood":      ("bed_platform_wood",      [1.60, 0.80, 2.05], "wood",    "#C49E6C", "Oak Wood"),
        "platform":  ("bed_platform_wood",      [1.60, 0.80, 2.05], "wood",    "#C49E6C", "Oak Wood"),
        "minimalist":("bed_minimalist",         [1.60, 0.75, 2.05], "wood",    "#E8DEC8", "Scandi Ash"),
    },
    "double bed": {
        "default":   ("bed_modern_double",      [1.80, 1.10, 2.10], "fabric",  "#D8CEBE", "Warm Beige"),
        "fabric":    ("bed_upholstered_fabric", [1.80, 1.15, 2.10], "fabric",  "#D8CEBE", "Warm Beige"),
        "wood":      ("bed_platform_wood",      [1.60, 0.80, 2.05], "wood",    "#C49E6C", "Oak Wood"),
    },
    "single bed": {
        "default":   ("bed_minimalist",         [1.00, 0.75, 2.05], "wood",    "#E8DEC8", "Scandi Ash"),
    },
    "platform bed": {
        "default":   ("bed_platform_wood",      [1.60, 0.80, 2.05], "wood",    "#C49E6C", "Oak Wood"),
    },

    # Sofas & variants
    "sofa": {
        "default":   ("sofa_three_seater",      [2.10, 0.85, 0.95], "fabric",  "#7E8287", "Grey Fabric"),
        "leather":   ("sofa_leather_dark",      [2.15, 0.85, 0.95], "leather", "#3B2317", "Cognac Leather"),
        "fabric":    ("sofa_three_seater",      [2.10, 0.85, 0.95], "fabric",  "#D8CEBE", "Warm Beige"),
        "dark":      ("sofa_leather_dark",      [2.15, 0.85, 0.95], "leather", "#2A2118", "Dark Walnut"),
    },
    "couch": {
        "default":   ("sofa_three_seater",      [2.10, 0.85, 0.95], "fabric",  "#7E8287", "Grey Fabric"),
        "leather":   ("sofa_leather_dark",      [2.15, 0.85, 0.95], "leather", "#3B2317", "Cognac Leather"),
    },
    "sectional": {
        "default":   ("sofa_sectional",         [2.60, 0.85, 1.60], "fabric",  "#D8CEBE", "Warm Beige"),
        "leather":   ("sofa_sectional",         [2.60, 0.85, 1.60], "leather", "#7D5B3A", "Ivory Leather"),
    },
    "armchair": {
        "default":   ("armchair_lounge",        [0.85, 0.90, 0.85], "fabric",  "#1E293B", "Navy Velvet"),
        "leather":   ("armchair_lounge",        [0.85, 0.90, 0.85], "leather", "#7D5B3A", "Cognac Leather"),
    },
    "lounge chair": {
        "default":   ("armchair_lounge",        [0.85, 0.90, 0.85], "leather", "#7D5B3A", "Cognac Leather"),
    },

    # Chairs
    "chair": {
        "default":   ("chair_dining",           [0.55, 0.85, 0.55], "wood",    "#C49E6C", "Oak Wood"),
        "metal":     ("chair_dining",           [0.55, 0.85, 0.55], "metal",   "#1C1C1C", "Matte Black"),
        "fabric":    ("chair_dining",           [0.55, 0.85, 0.55], "fabric",  "#7E8287", "Grey Fabric"),
    },
    "dining chair": {
        "default":   ("chair_dining",           [0.55, 0.85, 0.55], "wood",    "#C49E6C", "Oak Wood"),
    },
    "office chair": {
        "default":   ("chair_office",           [0.65, 1.05, 0.65], "fabric",  "#3B4252", "Matte Black"),
        "mesh":      ("chair_office_mesh",      [0.65, 1.15, 0.65], "metal",   "#1C1C1C", "Matte Black"),
        "leather":   ("chair_office",           [0.65, 1.05, 0.65], "leather", "#1C1C1C", "Matte Black"),
    },
    "desk chair": {
        "default":   ("chair_office",           [0.65, 1.05, 0.65], "fabric",  "#3B4252", "Matte Black"),
        "mesh":      ("chair_office_mesh",      [0.65, 1.15, 0.65], "metal",   "#1C1C1C", "Matte Black"),
    },
    "pouf": {
        "default":   ("pouf_ottoman_round",     [0.55, 0.42, 0.55], "fabric",  "#D8CEBE", "Warm Beige"),
    },
    "ottoman": {
        "default":   ("pouf_ottoman_round",     [0.55, 0.42, 0.55], "fabric",  "#C86D51", "Terracotta"),
        "leather":   ("pouf_ottoman_round",     [0.55, 0.42, 0.55], "leather", "#7D5B3A", "Cognac Leather"),
    },
    "stool": {
        "default":   ("pouf_ottoman_round",     [0.55, 0.42, 0.55], "wood",    "#C49E6C", "Oak Wood"),
    },

    # Desks & Workstations
    "desk": {
        "default":   ("desk_wooden",            [1.40, 0.75, 0.70], "wood",    "#C49E6C", "Oak Wood"),
        "white":     ("desk_minimal_white",     [1.30, 0.75, 0.65], "metal",   "#FFFFFF", "Chrome Steel"),
        "metal":     ("desk_minimal_white",     [1.30, 0.75, 0.65], "metal",   "#F0F0F0", "Chrome Steel"),
        "glass":     ("desk_wooden",            [1.40, 0.75, 0.70], "glass",   "#B8CCE0", "Chrome Steel"),
    },
    "workstation": {
        "default":   ("desk_wooden",            [1.40, 0.75, 0.70], "wood",    "#C49E6C", "Oak Wood"),
        "white":     ("desk_minimal_white",     [1.30, 0.75, 0.65], "metal",   "#FFFFFF", "Chrome Steel"),
    },

    # Tables
    "coffee table": {
        "default":   ("table_coffee",           [1.10, 0.45, 0.60], "wood",    "#8B5A2B", "Dark Walnut"),
        "glass":     ("table_coffee_glass",     [1.10, 0.42, 0.60], "glass",   "#DDEEFF", "Chrome Steel"),
        "metal":     ("table_coffee_glass",     [1.10, 0.42, 0.60], "metal",   "#888888", "Matte Black"),
        "wood":      ("table_coffee",           [1.10, 0.45, 0.60], "wood",    "#8B5A2B", "Dark Walnut"),
    },
    "center table": {
        "default":   ("table_coffee",           [1.10, 0.45, 0.60], "wood",    "#8B5A2B", "Dark Walnut"),
        "glass":     ("table_coffee_glass",     [1.10, 0.42, 0.60], "glass",   "#DDEEFF", "Chrome Steel"),
    },
    "dining table": {
        "default":   ("table_dining_round",     [1.20, 0.76, 1.20], "wood",    "#3B2317", "Dark Walnut"),
        "glass":     ("table_dining_round",     [1.20, 0.76, 1.20], "glass",   "#DDEEFF", "Chrome Steel"),
    },
    "table": {
        "default":   ("table_coffee",           [1.10, 0.45, 0.60], "wood",    "#C49E6C", "Oak Wood"),
        "glass":     ("table_coffee_glass",     [1.10, 0.42, 0.60], "glass",   "#DDEEFF", "Chrome Steel"),
    },

    # Storage & Stands
    "wardrobe": {
        "default":   ("wardrobe_two_door",      [1.20, 2.00, 0.60], "wood",    "#3B2317", "Dark Walnut"),
    },
    "closet": {
        "default":   ("wardrobe_two_door",      [1.20, 2.00, 0.60], "wood",    "#3B2317", "Dark Walnut"),
    },
    "cabinet": {
        "default":   ("wardrobe_two_door",      [1.20, 2.00, 0.60], "wood",    "#C49E6C", "Oak Wood"),
    },
    "dresser": {
        "default":   ("wardrobe_two_door",      [1.20, 2.00, 0.60], "wood",    "#C49E6C", "Oak Wood"),
    },
    "bookshelf": {
        "default":   ("bookshelf_tall",         [0.90, 1.85, 0.35], "wood",    "#C49E6C", "Oak Wood"),
        "metal":     ("bookshelf_tall",         [0.90, 1.85, 0.35], "metal",   "#1C1C1C", "Matte Black"),
    },
    "bookcase": {
        "default":   ("bookshelf_tall",         [0.90, 1.85, 0.35], "wood",    "#C49E6C", "Oak Wood"),
    },
    "shelves": {
        "default":   ("bookshelf_tall",         [0.90, 1.85, 0.35], "wood",    "#C49E6C", "Oak Wood"),
    },
    "nightstand": {
        "default":   ("nightstand_modern",      [0.50, 0.55, 0.45], "wood",    "#C49E6C", "Oak Wood"),
    },
    "bedside table": {
        "default":   ("nightstand_modern",      [0.50, 0.55, 0.45], "wood",    "#C49E6C", "Oak Wood"),
    },
    "tv stand": {
        "default":   ("stand_tv_console",       [1.60, 1.05, 0.40], "wood",    "#3B2317", "Dark Walnut"),
    },
    "tv console": {
        "default":   ("stand_tv_console",       [1.60, 1.05, 0.40], "wood",    "#3B2317", "Dark Walnut"),
    },
    "media console": {
        "default":   ("stand_tv_console",       [1.60, 1.05, 0.40], "wood",    "#3B2317", "Dark Walnut"),
    },
    "console": {
        "default":   ("stand_tv_console",       [1.60, 1.05, 0.40], "wood",    "#C49E6C", "Oak Wood"),
    },
    "coat rack": {
        "default":   ("stand_coat_rack",        [0.40, 1.75, 0.40], "wood",    "#C49E6C", "Oak Wood"),
    },

    # Lighting
    "lamp": {
        "default":   ("lamp_floor_arc",         [0.45, 1.80, 0.90], "metal",   "#C9A96E", "Brushed Brass"),
    },
    "floor lamp": {
        "default":   ("lamp_floor_arc",         [0.45, 1.80, 0.90], "metal",   "#C9A96E", "Brushed Brass"),
    },
    "arc lamp": {
        "default":   ("lamp_floor_arc",         [0.45, 1.80, 0.90], "metal",   "#C9A96E", "Brushed Brass"),
    },
    "table lamp": {
        "default":   ("lamp_table_modern",      [0.35, 0.55, 0.35], "fabric",  "#D8CEBE", "Warm Beige"),
    },
    "desk lamp": {
        "default":   ("lamp_table_modern",      [0.35, 0.55, 0.35], "metal",   "#1C1C1C", "Matte Black"),
    },
    "tripod lamp": {
        "default":   ("lamp_tripod_floor",      [0.50, 1.45, 0.50], "wood",    "#C49E6C", "Oak Wood"),
    },

    # Greenery & Decor
    "plant": {
        "default":   ("plant_potted_monstera",  [0.60, 1.10, 0.60], "greenery","#4A7C59", "Warm Beige"),
    },
    "indoor plant": {
        "default":   ("plant_potted_monstera",  [0.60, 1.10, 0.60], "greenery","#4A7C59", "Warm Beige"),
    },
    "monstera": {
        "default":   ("plant_potted_monstera",  [0.60, 1.10, 0.60], "greenery","#4A7C59", "Warm Beige"),
    },
    "snake plant": {
        "default":   ("plant_snake_tall",       [0.35, 0.95, 0.35], "greenery","#3D6B4F", "Warm Beige"),
    },
    "mirror": {
        "default":   ("mirror_arched_floor",    [0.65, 1.70, 0.10], "metal",   "#1C1C1C", "Matte Black"),
        "brass":     ("mirror_arched_floor",    [0.65, 1.70, 0.10], "metal",   "#C9A96E", "Brushed Brass"),
    },
    "floor mirror": {
        "default":   ("mirror_arched_floor",    [0.65, 1.70, 0.10], "metal",   "#C9A96E", "Brushed Brass"),
    },
    "rug": {
        "default":   ("rug_area_large",         [2.00, 0.015, 2.80],"fabric",  "#D8CEBE", "Warm Beige"),
    },
    "carpet": {
        "default":   ("rug_area_large",         [2.00, 0.015, 2.80],"fabric",  "#7E8287", "Grey Fabric"),
    },

    # Wall-Mounted Items
    "wall tv": {
        "default":   ("wall_tv_flat",           [1.40, 0.80, 0.05], "metal",   "#0A0A0C", "Matte Black"),
    },
    "wall-mounted tv": {
        "default":   ("wall_tv_flat",           [1.40, 0.80, 0.05], "metal",   "#0A0A0C", "Matte Black"),
    },
    "tv": {
        "default":   ("wall_tv_flat",           [1.40, 0.80, 0.05], "metal",   "#0A0A0C", "Matte Black"),
    },
    "wall art": {
        "default":   ("wall_art_canvas",        [1.00, 0.75, 0.03], "fabric",  "#8B6B4A", "Dark Walnut"),
    },
    "framed painting": {
        "default":   ("wall_art_canvas",        [1.00, 0.75, 0.03], "fabric",  "#8B6B4A", "Dark Walnut"),
    },
    "painting": {
        "default":   ("wall_art_canvas",        [1.00, 0.75, 0.03], "fabric",  "#8B6B4A", "Dark Walnut"),
    },
    "artwork": {
        "default":   ("wall_art_canvas",        [1.00, 0.75, 0.03], "fabric",  "#8B6B4A", "Dark Walnut"),
    },
    "wall mirror": {
        "default":   ("wall_mirror_circular",   [0.80, 0.80, 0.03], "metal",   "#C9A96E", "Brushed Brass"),
    },
    "wall clock": {
        "default":   ("wall_clock_minimal",     [0.40, 0.40, 0.03], "metal",   "#1C1C1C", "Matte Black"),
    },
    "clock": {
        "default":   ("wall_clock_minimal",     [0.40, 0.40, 0.03], "metal",   "#1C1C1C", "Matte Black"),
    },
}


def _resolve_template(
    label: str,
    material: Optional[str],
    color_hex: Optional[str],
    sub_variant: Optional[str] = None,
) -> tuple[str, list[float], str, str, str]:
    """
    Resolve template_id, dimensions, material_type, color_tint, and material_preset.
    Matches sub_variant or label & material variant. Applies color_hex if valid.
    """
    # 1. Direct match on sub_variant if provided
    if sub_variant:
        sub_norm = sub_variant.lower().strip()
        for key, variants in LABEL_CATALOG.items():
            for v_mat, v_entry in variants.items():
                if v_entry[0].lower() == sub_norm:
                    template_id, dims, mat_type, default_tint, preset = v_entry
                    tint = color_hex.upper() if color_hex and re.match(r"^#[0-9A-Fa-f]{6}$", color_hex) else default_tint
                    return template_id, dims, mat_type, tint, preset

    # 2. Match on label and material
    norm = label.lower().strip()
    variants = LABEL_CATALOG.get(norm)
    if not variants:
        for key, val in LABEL_CATALOG.items():
            if key in norm or norm in key:
                variants = val
                break
    if not variants:
        logger.warning("[CATALOG] No match for '%s', using default dining chair.", label)
        variants = {"default": ("chair_dining", [0.55, 0.85, 0.55], "wood", "#C49E6C", "Oak Wood")}

    mat_key = (material or "").lower().strip()
    entry = variants.get(mat_key) or variants.get("default")
    template_id, dims, mat_type, default_tint, preset = entry

    if color_hex and re.match(r"^#[0-9A-Fa-f]{6}$", color_hex):
        tint = color_hex.upper()
    else:
        tint = default_tint

    logger.info("[CATALOG] Resolved '%s' (mat=%s, sub=%s) → template=%s mat_type=%s tint=%s",
                label, material, sub_variant, template_id, mat_type, tint)
    return template_id, dims, mat_type, tint, preset


def _solve_topological_layout(
    items: list[Any],
    hero_item_id: Optional[str],
    room_width_m: float,
    room_length_m: float,
    room_height_m: float,
) -> list[FurnitureItem]:
    """
    Deterministic topological layout solver based on semantic wall-anchoring,
    hero-anchor priority, and relative positioning (left_of, right_of, opposite, center).
    """
    half_w = room_width_m / 2.0
    half_l = room_length_m / 2.0

    # 1. Resolve all templates and dimensions
    resolved: list[dict[str, Any]] = []
    for it in items:
        sub_var = getattr(it, "sub_variant", None)
        color = getattr(it, "dominant_color_hex", None) or getattr(it, "color_hex", None)
        mat = getattr(it, "material", None)
        template_id, dims, mat_type, tint, preset = _resolve_template(
            it.label, mat, color, sub_var
        )
        resolved.append({
            "item": it,
            "id": it.id,
            "label": it.label,
            "template_id": template_id,
            "dims": dims,
            "mat_type": mat_type,
            "tint": tint,
            "preset": preset,
            "wall_anchor": getattr(it, "wall_anchor", "back") or "back",
            "rel_pos": getattr(it, "relative_position", "center") or "center",
            "placement": getattr(it, "placement_type", getattr(it, "placement", "floor")) or "floor",
            "height_m": getattr(it, "height_m", None),
        })

    floor_entries = [e for e in resolved if e["placement"] == "floor"]
    wall_entries = [e for e in resolved if e["placement"] == "wall"]

    # Tracking placed positions and bounding boxes: {item_id: {"pos": [x, y, z], "rot_y": rot, "dims": dims, "wall": wall}}
    placed: dict[str, dict[str, Any]] = {}

    def get_half_extents(w: float, d: float, rot_y: float) -> tuple[float, float]:
        if abs(rot_y) < 0.2 or abs(abs(rot_y) - math.pi) < 0.2:
            return w / 2.0, d / 2.0
        return d / 2.0, w / 2.0

    def clamp_pos(x: float, z: float, w: float, d: float, rot_y: float) -> tuple[float, float]:
        hw, hd = get_half_extents(w, d, rot_y)
        min_x = -half_w + hw + 0.05
        max_x = half_w - hw - 0.05
        min_z = -half_l + hd + 0.05
        max_z = half_l - hd - 0.05
        cx = min(max_x, max(min_x, x)) if min_x <= max_x else 0.0
        cz = min(max_z, max(min_z, z)) if min_z <= max_z else 0.0
        return round(cx, 2), round(cz, 2)

    def check_collision(x: float, z: float, w: float, d: float, rot_y: float, exclude_id: str) -> bool:
        hw, hd = get_half_extents(w, d, rot_y)
        box = (x - hw, x + hw, z - hd, z + hd)
        for pid, prec in placed.items():
            if pid == exclude_id or "rug" in prec["label"]:
                continue
            phw, phd = get_half_extents(prec["dims"][0], prec["dims"][2], prec["rot_y"])
            pbox = (prec["pos"][0] - phw, prec["pos"][0] + phw, prec["pos"][2] - phd, prec["pos"][2] + phd)
            overlap_x = min(box[1], pbox[1]) - max(box[0], pbox[0])
            overlap_z = min(box[3], pbox[3]) - max(box[2], pbox[2])
            if overlap_x > 0.05 and overlap_z > 0.05:
                return True
        return False

    # 2. Place Hero Item first
    hero_entry = None
    if hero_item_id:
        hero_entry = next((e for e in floor_entries if e["id"] == hero_item_id), None)
    if not hero_entry and floor_entries:
        hero_entry = next((e for e in floor_entries if any(k in e["label"] for k in ("bed", "sofa", "desk"))), floor_entries[0])

    if hero_entry:
        w_i, h_i, d_i = hero_entry["dims"]
        wall = hero_entry["wall_anchor"]
        if wall == "back":
            pos = [0.0, 0.0, -half_l + d_i / 2.0 + 0.05]
            rot = 0.0
        elif wall == "front":
            pos = [0.0, 0.0, half_l - d_i / 2.0 - 0.05]
            rot = math.pi
        elif wall == "left":
            pos = [-half_w + d_i / 2.0 + 0.05, 0.0, 0.0]
            rot = math.pi / 2.0
        elif wall == "right":
            pos = [half_w - d_i / 2.0 - 0.05, 0.0, 0.0]
            rot = -math.pi / 2.0
        else: # center
            pos = [0.0, 0.0, 0.0]
            rot = 0.0
        cx, cz = clamp_pos(pos[0], pos[2], w_i, d_i, rot)
        pos[0], pos[2] = cx, cz
        placed[hero_entry["id"]] = {
            "pos": pos,
            "rot_y": rot,
            "dims": hero_entry["dims"],
            "wall": wall,
            "label": hero_entry["label"],
            "entry": hero_entry,
        }

    # 3. Place relative items (left_of, right_of, opposite)
    for entry in floor_entries:
        if entry["id"] in placed:
            continue
        rel = entry["rel_pos"]
        if ":" in rel:
            rel_type, target_id = rel.split(":", 1)
            rel_type, target_id = rel_type.strip(), target_id.strip()
            if target_id in placed:
                t = placed[target_id]
                t_w, t_h, t_d = t["dims"]
                w_i, h_i, d_i = entry["dims"]
                wall = t["wall"]

                if rel_type == "left_of":
                    gap = (t_w + w_i) / 2.0 + 0.15
                    if wall == "back":
                        cand_x = t["pos"][0] - gap
                        cand_z = -half_l + d_i / 2.0 + 0.05
                        rot = 0.0
                    elif wall == "front":
                        cand_x = t["pos"][0] + gap
                        cand_z = half_l - d_i / 2.0 - 0.05
                        rot = math.pi
                    elif wall == "left":
                        cand_z = t["pos"][2] + gap
                        cand_x = -half_w + d_i / 2.0 + 0.05
                        rot = math.pi / 2.0
                    else:  # right
                        cand_z = t["pos"][2] - gap
                        cand_x = half_w - d_i / 2.0 - 0.05
                        rot = -math.pi / 2.0
                    cx, cz = clamp_pos(cand_x, cand_z, w_i, d_i, rot)
                    placed[entry["id"]] = {
                        "pos": [cx, 0.0, cz],
                        "rot_y": rot,
                        "dims": entry["dims"],
                        "wall": wall,
                        "label": entry["label"],
                        "entry": entry,
                    }
                    continue

                elif rel_type == "right_of":
                    gap = (t_w + w_i) / 2.0 + 0.15
                    if wall == "back":
                        cand_x = t["pos"][0] + gap
                        cand_z = -half_l + d_i / 2.0 + 0.05
                        rot = 0.0
                    elif wall == "front":
                        cand_x = t["pos"][0] - gap
                        cand_z = half_l - d_i / 2.0 - 0.05
                        rot = math.pi
                    elif wall == "left":
                        cand_z = t["pos"][2] - gap
                        cand_x = -half_w + d_i / 2.0 + 0.05
                        rot = math.pi / 2.0
                    else:  # right
                        cand_z = t["pos"][2] + gap
                        cand_x = half_w - d_i / 2.0 - 0.05
                        rot = -math.pi / 2.0
                    cx, cz = clamp_pos(cand_x, cand_z, w_i, d_i, rot)
                    placed[entry["id"]] = {
                        "pos": [cx, 0.0, cz],
                        "rot_y": rot,
                        "dims": entry["dims"],
                        "wall": wall,
                        "label": entry["label"],
                        "entry": entry,
                    }
                    continue

                elif rel_type == "opposite":
                    if wall == "back":
                        cand_x = t["pos"][0]
                        cand_z = half_l - d_i / 2.0 - 0.05
                        rot = math.pi
                        opp_wall = "front"
                    elif wall == "front":
                        cand_x = t["pos"][0]
                        cand_z = -half_l + d_i / 2.0 + 0.05
                        rot = 0.0
                        opp_wall = "back"
                    elif wall == "left":
                        cand_x = half_w - d_i / 2.0 - 0.05
                        cand_z = t["pos"][2]
                        rot = -math.pi / 2.0
                        opp_wall = "right"
                    else:  # right
                        cand_x = -half_w + d_i / 2.0 + 0.05
                        cand_z = t["pos"][2]
                        rot = math.pi / 2.0
                        opp_wall = "left"
                    cx, cz = clamp_pos(cand_x, cand_z, w_i, d_i, rot)
                    placed[entry["id"]] = {
                        "pos": [cx, 0.0, cz],
                        "rot_y": rot,
                        "dims": entry["dims"],
                        "wall": opp_wall,
                        "label": entry["label"],
                        "entry": entry,
                    }
                    continue

    # 4. Place remaining floor items
    for entry in floor_entries:
        if entry["id"] in placed:
            continue
        w_i, h_i, d_i = entry["dims"]
        wall = entry["wall_anchor"]
        lbl = entry["label"]

        if wall == "center" or "rug" in lbl or "coffee table" in lbl:
            if "rug" in lbl:
                pos = [0.0, 0.006, 0.0]
                rot = 0.0
            elif "coffee table" in lbl and hero_entry and "sofa" in hero_entry["label"]:
                hpos = placed[hero_entry["id"]]["pos"]
                hwall = placed[hero_entry["id"]]["wall"]
                if hwall == "back":
                    pos = [hpos[0], 0.0, hpos[2] + hero_entry["dims"][2]/2 + d_i/2 + 0.35]
                    rot = 0.0
                elif hwall == "front":
                    pos = [hpos[0], 0.0, hpos[2] - hero_entry["dims"][2]/2 - d_i/2 - 0.35]
                    rot = math.pi
                elif hwall == "left":
                    pos = [hpos[0] + hero_entry["dims"][2]/2 + d_i/2 + 0.35, 0.0, hpos[2]]
                    rot = math.pi / 2.0
                else:
                    pos = [hpos[0] - hero_entry["dims"][2]/2 - d_i/2 - 0.35, 0.0, hpos[2]]
                    rot = -math.pi / 2.0
            else:
                pos = [0.0, 0.0, 0.0]
                rot = 0.0
            cx, cz = clamp_pos(pos[0], pos[2], w_i, d_i, rot)
            placed[entry["id"]] = {
                "pos": [cx, pos[1], cz],
                "rot_y": rot,
                "dims": entry["dims"],
                "wall": "center",
                "label": lbl,
                "entry": entry,
            }
            continue

        if wall == "back":
            rot = 0.0
            base_z = -half_l + d_i / 2.0 + 0.05
            candidates = [0.0] + [s * sign for s in [0.8, 1.4, 2.0, 2.6] for sign in (1, -1)]
            chosen_x = 0.0
            for cand_x in candidates:
                cx, cz = clamp_pos(cand_x, base_z, w_i, d_i, rot)
                if not check_collision(cx, cz, w_i, d_i, rot, entry["id"]):
                    chosen_x = cx
                    break
            else:
                chosen_x, cz = clamp_pos(candidates[1], base_z, w_i, d_i, rot)
            pos = [chosen_x, 0.0, cz]

        elif wall == "front":
            rot = math.pi
            base_z = half_l - d_i / 2.0 - 0.05
            candidates = [0.0] + [s * sign for s in [0.8, 1.4, 2.0, 2.6] for sign in (1, -1)]
            chosen_x = 0.0
            for cand_x in candidates:
                cx, cz = clamp_pos(cand_x, base_z, w_i, d_i, rot)
                if not check_collision(cx, cz, w_i, d_i, rot, entry["id"]):
                    chosen_x = cx
                    break
            else:
                chosen_x, cz = clamp_pos(candidates[1], base_z, w_i, d_i, rot)
            pos = [chosen_x, 0.0, cz]

        elif wall == "left":
            rot = math.pi / 2.0
            base_x = -half_w + d_i / 2.0 + 0.05
            candidates = [0.0] + [s * sign for s in [0.8, 1.4, 2.0, 2.6] for sign in (1, -1)]
            chosen_z = 0.0
            for cand_z in candidates:
                cx, cz = clamp_pos(base_x, cand_z, w_i, d_i, rot)
                if not check_collision(cx, cz, w_i, d_i, rot, entry["id"]):
                    chosen_z = cz
                    break
            else:
                cx, chosen_z = clamp_pos(base_x, candidates[1], w_i, d_i, rot)
            pos = [cx, 0.0, chosen_z]

        else: # right
            rot = -math.pi / 2.0
            base_x = half_w - d_i / 2.0 - 0.05
            candidates = [0.0] + [s * sign for s in [0.8, 1.4, 2.0, 2.6] for sign in (1, -1)]
            chosen_z = 0.0
            for cand_z in candidates:
                cx, cz = clamp_pos(base_x, cand_z, w_i, d_i, rot)
                if not check_collision(cx, cz, w_i, d_i, rot, entry["id"]):
                    chosen_z = cz
                    break
            else:
                cx, chosen_z = clamp_pos(base_x, candidates[1], w_i, d_i, rot)
            pos = [cx, 0.0, chosen_z]

        placed[entry["id"]] = {
            "pos": pos,
            "rot_y": rot,
            "dims": entry["dims"],
            "wall": wall,
            "label": lbl,
            "entry": entry,
        }

    # 5. Place Wall-Mounted Items
    wall_counts: dict[str, int] = {}
    for we in wall_entries:
        w_anchor = we["wall_anchor"]
        wall_counts[w_anchor] = wall_counts.get(w_anchor, 0) + 1

    wall_indices: dict[str, int] = {}
    for we in wall_entries:
        w_anchor = we["wall_anchor"]
        idx = wall_indices.get(w_anchor, 0)
        wall_indices[w_anchor] = idx + 1
        total = wall_counts[w_anchor]

        mount_h = we["height_m"] if we["height_m"] and 0.5 < we["height_m"] < 3.0 else 1.5
        w_i = we["dims"][0]
        depth_offset = 0.035

        aligned_coord: Optional[float] = None
        if hero_entry and hero_entry["wall_anchor"] == w_anchor:
            aligned_coord = placed[hero_entry["id"]]["pos"][0 if w_anchor in ("back", "front") else 2]

        spacing_frac = (idx + 1) / (total + 1)

        if w_anchor == "back":
            if aligned_coord is not None and total == 1:
                x = aligned_coord
            else:
                x = -half_w + room_width_m * spacing_frac
            x = max(-half_w + w_i / 2 + 0.1, min(half_w - w_i / 2 - 0.1, x))
            pos = [round(x, 2), round(mount_h, 2), round(-half_l + depth_offset, 2)]
            rot = 0.0
        elif w_anchor == "front":
            if aligned_coord is not None and total == 1:
                x = aligned_coord
            else:
                x = -half_w + room_width_m * spacing_frac
            x = max(-half_w + w_i / 2 + 0.1, min(half_w - w_i / 2 - 0.1, x))
            pos = [round(x, 2), round(mount_h, 2), round(half_l - depth_offset, 2)]
            rot = math.pi
        elif w_anchor == "left":
            if aligned_coord is not None and total == 1:
                z = aligned_coord
            else:
                z = -half_l + room_length_m * spacing_frac
            z = max(-half_l + w_i / 2 + 0.1, min(half_l - w_i / 2 - 0.1, z))
            pos = [round(-half_w + depth_offset, 2), round(mount_h, 2), round(z, 2)]
            rot = math.pi / 2.0
        else:  # right
            if aligned_coord is not None and total == 1:
                z = aligned_coord
            else:
                z = -half_l + room_length_m * spacing_frac
            z = max(-half_l + w_i / 2 + 0.1, min(half_l - w_i / 2 - 0.1, z))
            pos = [round(half_w - depth_offset, 2), round(mount_h, 2), round(z, 2)]
            rot = -math.pi / 2.0

        placed[we["id"]] = {
            "pos": pos,
            "rot_y": rot,
            "dims": we["dims"],
            "wall": w_anchor,
            "label": we["label"],
            "entry": we,
        }

    # 6. Convert all placed into FurnitureItem instances
    result: list[FurnitureItem] = []
    for pid, prec in placed.items():
        entry = prec["entry"]
        result.append(FurnitureItem(
            id=pid,
            label=entry["label"],
            glb_url=SAMPLE_GLB_URL,
            dimensions=prec["dims"],
            position=prec["pos"],
            rotation_y=prec["rot_y"],
            dominant_color=entry["tint"],
            material_type=entry["mat_type"],
            template_id=entry["template_id"],
            color_tint=entry["tint"],
            material_preset=entry["preset"],
            mesh_source="template",
            placement=entry["placement"],
        ))

    logger.info("[SOLVER] Placed %d furniture item(s) deterministically.", len(result))
    for fi in result:
        logger.info("  → '%s' (%s) pos=%s rot_y=%.2f placement=%s",
                    fi.id, fi.label, fi.position, fi.rotation_y, fi.placement)
    return result

# ─── Job Record ───────────────────────────────────────────────────────────────

class Job:
    def __init__(self, job_id: str, dimensions: RoomDimensions, image_paths: list[Path]):
        self.job_id = job_id
        self.dimensions = dimensions
        self.image_paths = image_paths
        self.queue: asyncio.Queue[dict[str, Any]] = asyncio.Queue()
        self.stage: JobStage = JobStage.QUEUED
        self.manifest: SceneManifest | None = None
        self.detections: list[DetectionReviewItem] = []
        self.review_payload: DetectionReviewPayload | None = None

    def _status(self, stage: JobStage, progress: int, message: str, error: str | None = None) -> dict:
        self.stage = stage
        return JobStatusResponse(
            job_id=self.job_id,
            stage=stage,
            progress=progress,
            message=message,
            error=error,
            detections=self.detections,
        ).model_dump()

    async def push(self, stage: JobStage, progress: int, message: str, error: str | None = None):
        payload = self._status(stage, progress, message, error)
        logger.info("[job %s] stage=%s progress=%d msg=%s", self.job_id[:8], stage.value, progress, message)
        await self.queue.put(payload)

    async def push_detections_review(self, payload: DetectionReviewPayload):
        self.review_payload = payload
        self.detections = payload.detections
        await self.queue.put({"__event__": "detections_reviewed", "data": payload.model_dump()})

    async def push_manifest(self, manifest: SceneManifest):
        self.manifest = manifest
        logger.info("[job %s] manifest: %d items", self.job_id[:8], len(manifest.furniture))
        await self.queue.put({"__event__": "manifest", "data": manifest.model_dump()})


_JOBS: dict[str, Job] = {}


def create_job(dimensions: RoomDimensions, image_paths: list[Path]) -> Job:
    job_id = str(uuid.uuid4())
    job = Job(job_id, dimensions, image_paths)
    _JOBS[job_id] = job
    return job


def get_job(job_id: str) -> Optional[Job]:
    return _JOBS.get(job_id)


async def run_pipeline(job: Job, pipeline_mode: str, storage_dir: Path) -> None:
    logger.info("[PIPELINE START] Job: %s | Images: %s", job.job_id, [p.name for p in job.image_paths])
    if not job.image_paths:
        await job.push(JobStage.ERROR, 0, "No uploaded room photos found", "At least one photo is required.")
        return
    try:
        await _run_real_pipeline(job, storage_dir)
    except Exception as exc:
        logger.exception("Pipeline failed for job %s", job.job_id)
        await job.push(JobStage.ERROR, 0, "Pipeline failed", str(exc))


async def _run_real_pipeline(job: Job, storage_dir: Path) -> None:
    from app.pipeline.spatial_planner import detect_room_contents
    dim = job.dimensions
    loop = asyncio.get_running_loop()

    # Step 1: Vision Detection
    await job.push(JobStage.SEGMENTING, 20, "Gemini Vision analyzing room items, materials & decor...")
    detection = await loop.run_in_executor(None, lambda: detect_room_contents(job.image_paths))

    wall_color = detection.wall_color_hex or "#E8E3DC"
    floor_color = detection.floor_color_hex or "#C8BFB0"
    all_items = detection.items

    floor_items = [it for it in all_items if it.placement == "floor"]
    wall_items  = [it for it in all_items if it.placement == "wall"]
    logger.info("[PIPELINE] %d floor + %d wall item(s) detected", len(floor_items), len(wall_items))

    item_labels = [it.label for it in all_items]
    await job.push(JobStage.SEGMENTING, 55,
                   f"Detected {len(all_items)} item(s): {', '.join(item_labels) if item_labels else 'empty room'}")

    # Step 2: Catalog Resolution & Deterministic Topological Positioning
    await job.push(JobStage.OPTIMIZING, 75, "Solving hero-anchor & topological wall layout...")

    furniture_items = _solve_topological_layout(
        items=all_items,
        hero_item_id=detection.hero_item_id,
        room_width_m=dim.width_m,
        room_length_m=dim.length_m,
        room_height_m=dim.height_m,
    )

    # Step 3: Assemble and push SceneManifest
    await job.push(JobStage.OPTIMIZING, 90, "Assembling scene manifest...")
    manifest = SceneManifest(
        job_id=job.job_id,
        room_dimensions=RoomDimensions(
            width_m=dim.width_m,
            length_m=dim.length_m,
            height_m=dim.height_m,
            shape_type=dim.shape_type,
            polygon_vertices=dim.polygon_vertices,
            wall_color=wall_color,
            floor_color=floor_color,
            door=dim.door or DoorConfig(wall="front", position=0.0, width_m=0.9, height_m=2.1, swing="inward", segment_index=0),
        ),
        textures=SceneTextures(),
        furniture=furniture_items,
    )

    await job.push(JobStage.READY, 100, f"Room ready! Placed {len(floor_items)} floor + {len(wall_items)} wall item(s).")
    await job.push_manifest(manifest)
    logger.info("[PIPELINE SUCCESS] Job %s: %d items generated.", job.job_id, len(furniture_items))