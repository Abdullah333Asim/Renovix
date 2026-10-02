"""
Vision LLM Room Analyzer with Attribute, Material & Wall Decor Detection.

Sends uploaded room photo(s) to Gemini Vision and asks for:
  1. A list of detected items (floor furniture + wall-mounted decor) with:
     - label (canonical category)
     - placement ("floor" or "wall")
     - material ("wood", "fabric", "leather", "metal", "glass", "greenery")
     - color_hex (sampled 6-digit hex color)
     - wall_attachment ("back", "left", "right", "front" if wall-mounted)
     - height_m (mounting height in meters if wall-mounted)
  2. The dominant wall paint hex color.
  3. The dominant floor surface hex color.
"""
from __future__ import annotations

import base64
import io
import json
import logging
import os
import re
from pathlib import Path
from typing import Any, Optional

import httpx
from PIL import Image
from pydantic import BaseModel, Field

from app.config import get_settings

logger = logging.getLogger(__name__)


# ─── Output Schema ────────────────────────────────────────────────────────────

class SemanticFurnitureItem(BaseModel):
    """A detected furniture or wall item with semantic topological layout properties."""
    id: str = Field(..., description="Unique item identifier, e.g. 'bed_1', 'nightstand_left'")
    label: str = Field(..., description="Canonical item name, e.g. 'bed', 'sofa', 'wall tv'")
    sub_variant: Optional[str] = Field(None, description="Catalog template ID, e.g. 'bed_modern_double'")
    dominant_color_hex: Optional[str] = Field(None, description="Sampled 6-digit hex color, e.g. '#8B5A2B'")
    material: Optional[str] = Field(None, description="wood | fabric | leather | metal | glass | greenery")
    wall_anchor: str = Field("back", description="Anchored wall: back | left | right | front | center")
    relative_position: str = Field("center", description="Topological position: center | left_of:<id> | right_of:<id> | opposite:<id> | standalone")
    placement_type: str = Field("floor", description="'floor' for floor items, 'wall' for wall-mounted items")
    height_m: Optional[float] = Field(None, description="Mounting height in metres for wall items (typically 1.4-1.8)")

    # Backwards-compatibility properties
    @property
    def color_hex(self) -> Optional[str]:
        return self.dominant_color_hex

    @property
    def placement(self) -> str:
        return self.placement_type

    @property
    def wall_attachment(self) -> Optional[str]:
        return self.wall_anchor if self.placement_type == "wall" else None


# Backwards compatibility alias
DetectedItem = SemanticFurnitureItem


class RoomDetectionResult(BaseModel):
    """Full semantic detection and topological layout result from Gemini Vision."""
    room_type: str = Field("bedroom", description="bedroom | living_room | office | dining_room | other")
    wall_color_hex: Optional[str] = Field(
        None,
        description="Dominant wall paint color as 6-digit hex, e.g. '#E8E3DC'."
    )
    floor_color_hex: Optional[str] = Field(
        None,
        description="Dominant floor surface color as 6-digit hex, e.g. '#8B5A2B'."
    )
    floor_material: Optional[str] = Field("hardwood", description="hardwood | tile | carpet | concrete")
    hero_item_id: Optional[str] = Field(None, description="Primary focal item ID, e.g. 'bed_1', 'sofa_1', 'desk_1'")
    furniture: list[SemanticFurnitureItem] = Field(
        default_factory=list,
        description="All detected furniture and wall decor items."
    )

    @property
    def items(self) -> list[SemanticFurnitureItem]:
        """Backwards compatibility alias for furniture items."""
        return self.furniture


# ─── Image Encoding ────────────────────────────────────────────────────────────

def _encode_image_b64(path: Path, max_dim: int = 1024) -> tuple[str, str]:
    """Resize and base64-encode an image for Gemini inline payload."""
    try:
        with Image.open(path) as img:
            img = img.convert("RGB")
            w, h = img.size
            if max(w, h) > max_dim:
                scale = max_dim / float(max(w, h))
                img = img.resize((int(w * scale), int(h * scale)), Image.Resampling.LANCZOS)
            buf = io.BytesIO()
            img.save(buf, format="JPEG", quality=85)
            b64 = base64.b64encode(buf.getvalue()).decode("utf-8")
            return b64, "image/jpeg"
    except Exception as exc:
        logger.warning("Image encode fallback for %s: %s", path, exc)
        with open(path, "rb") as f:
            return base64.b64encode(f.read()).decode("utf-8"), "image/jpeg"


# ─── Prompt Builder ────────────────────────────────────────────────────────────

DETECTION_PROMPT = """You are an expert interior design and spatial planning analyst examining a room photo.

Return a JSON object with EXACTLY this structure — no markdown, no explanation:

{
  "room_type": "bedroom",
  "wall_color_hex": "#E8E3DC",
  "floor_color_hex": "#C8B89A",
  "floor_material": "hardwood",
  "hero_item_id": "bed_1",
  "furniture": [
    {
      "id": "bed_1",
      "label": "bed",
      "sub_variant": "bed_modern_double",
      "dominant_color_hex": "#D8CEBE",
      "material": "fabric",
      "wall_anchor": "back",
      "relative_position": "center",
      "placement_type": "floor",
      "height_m": null
    },
    {
      "id": "nightstand_left",
      "label": "nightstand",
      "sub_variant": "nightstand_modern",
      "dominant_color_hex": "#C49E6C",
      "material": "wood",
      "wall_anchor": "back",
      "relative_position": "left_of:bed_1",
      "placement_type": "floor",
      "height_m": null
    },
    {
      "id": "wall_art_1",
      "label": "wall art",
      "sub_variant": "wall_art_canvas",
      "dominant_color_hex": "#3B2317",
      "material": "fabric",
      "wall_anchor": "back",
      "relative_position": "center",
      "placement_type": "wall",
      "height_m": 1.5
    }
  ]
}

Rules:
1. "room_type": One of "bedroom" | "living_room" | "office" | "dining_room" | "other".
2. "wall_color_hex": Dominant wall paint color as 6-digit hex code "#RRGGBB" (e.g. "#E8E3DC", "#D4C5B9", "#2C3E50").
3. "floor_color_hex": Dominant flooring color as 6-digit hex code "#RRGGBB" (e.g. "#8B5A2B", "#C49E6C", "#C8BFB0", "#7E8287").
4. "floor_material": One of "hardwood" | "tile" | "carpet" | "concrete".
5. "hero_item_id": The primary focal furniture piece in the room (e.g. "bed_1" in bedroom, "sofa_1" in living room, "desk_1" in office). Must match one ID in "furniture".
6. "furniture": List visible furniture and wall-mounted decor (max 14 items).
   - "id": A unique ID for each item, e.g. "bed_1", "nightstand_left", "nightstand_right", "wardrobe_1", "sofa_1", "coffee_table_1", "desk_1", "wall_tv_1", "wall_art_1".
   - "label": Canonical category name:
     Floor: bed, sofa, armchair, chair, office chair, desk, coffee table, dining table, wardrobe, bookshelf, nightstand, tv stand, coat rack, floor lamp, table lamp, plant, rug, pouf, mirror, dresser
     Wall: wall tv, wall art, wall mirror, wall clock
   - "sub_variant": Specific catalog variant:
     Beds: bed_modern_double, bed_upholstered_fabric, bed_platform_wood
     Sofas/Chairs: sofa_three_seater, sofa_leather_dark, sofa_sectional_l, armchair_lounge, chair_dining, chair_office_ergonomic
     Tables/Desks: desk_wood_minimal, desk_minimal_white, table_coffee_wood, table_coffee_glass, table_dining_round
     Storage: wardrobe_two_door, bookshelf_tall, nightstand_modern, stand_tv_console, stand_coat_rack
     Lamps: lamp_floor_arc, lamp_table_modern, lamp_tripod_floor
     Decor: plant_potted_monstera, plant_snake_tall, mirror_arched_floor, rug_area_large, pouf_boucle_round
     Wall: wall_tv_flat, wall_art_canvas, wall_mirror_circular, wall_clock_minimal
   - "dominant_color_hex": Sampled 6-digit hex color for the item.
   - "material": "wood" | "fabric" | "leather" | "metal" | "glass" | "greenery" | null.
   - "wall_anchor": Which room wall this item is anchored or nearest to:
     "back" (the primary wall facing the camera/entrance), "left", "right", "front", or "center" (for floating rugs, coffee tables).
   - "relative_position":
     - "center": centered along its wall anchor or in room center.
     - "left_of:<id>": positioned immediately to the left of target item.
     - "right_of:<id>": positioned immediately to the right of target item.
     - "opposite:<id>": positioned against opposing wall facing target item.
     - "standalone": positioned as a standalone piece along the wall.
   - "placement_type": "floor" for floor resting items, "wall" for items mounted on walls.
   - "height_m": ONLY for placement_type=="wall": mounting height in meters (e.g. 1.5). null for floor items.
7. If no furniture is visible, return furniture: [].
"""


# ─── Gemini Vision Caller ──────────────────────────────────────────────────────

def _call_gemini_vision(image_paths: list[Path], api_key: str) -> Optional[dict]:
    """Call Gemini Vision API with room photo(s) and structured detection prompt."""
    candidate_models = [
        ("v1beta", "gemini-3.1-flash-lite-preview"),
        ("v1beta", "gemini-3-flash-preview"),
        ("v1beta", "gemini-3.1-flash-lite"),
        ("v1beta", "gemini-3.5-flash-lite"),
    ]

    parts: list[dict[str, Any]] = [{"text": DETECTION_PROMPT}]
    for path in image_paths:
        b64_data, mime = _encode_image_b64(path)
        parts.append({"inline_data": {"mime_type": mime, "data": b64_data}})

    payload = {
        "contents": [{"parts": parts}],
        "generationConfig": {
            "temperature": 0.1,
            "maxOutputTokens": 1024,
        },
    }

    logger.info("[SPATIAL_PLANNER] Initiating Gemini Vision API call with %d photo(s)...", len(image_paths))

    with httpx.Client(timeout=30.0) as client:
        for ver, model in candidate_models:
            url = f"https://generativelanguage.googleapis.com/{ver}/models/{model}:generateContent?key={api_key}"
            try:
                logger.info("[SPATIAL_PLANNER] Trying model: %s/%s", ver, model)
                resp = client.post(url, json=payload)
                if resp.status_code == 200:
                    data = resp.json()
                    candidates = data.get("candidates", [])
                    if candidates and "content" in candidates[0]:
                        raw_text = candidates[0]["content"]["parts"][0]["text"].strip()
                        raw_text = re.sub(r"^```(?:json)?\s*", "", raw_text)
                        raw_text = re.sub(r"\s*```$", "", raw_text)
                        parsed = json.loads(raw_text)
                        logger.info("[SPATIAL_PLANNER] Gemini (%s) returned valid payload", model)
                        return parsed
                    else:
                        logger.warning("[SPATIAL_PLANNER] Gemini (%s) 200 OK but no content: %s", model, data)
                else:
                    logger.error("[SPATIAL_PLANNER] Gemini (%s) HTTP %d: %s", model, resp.status_code, resp.text[:300])
            except json.JSONDecodeError as jde:
                logger.error("[SPATIAL_PLANNER] JSON parse error from Gemini (%s): %s", model, jde, exc_info=True)
            except Exception as exc:
                logger.error("[SPATIAL_PLANNER] Exception calling Gemini (%s): %s", model, exc, exc_info=True)

    logger.error("[SPATIAL_PLANNER] All Gemini model endpoints failed.")
    return None


# ─── Public API ───────────────────────────────────────────────────────────────

def detect_room_contents(
    image_paths: list[Path],
) -> RoomDetectionResult:
    """
    Main entry point: send room photo(s) to Gemini Vision and return
    detected items with materials/colors/placement + wall/floor colors.

    Falls back to an empty result if Vision API is unavailable.
    """
    settings = get_settings()
    gemini_key = settings.gemini_api_key or os.environ.get("GEMINI_API_KEY", "").strip()

    if not gemini_key:
        logger.warning("[SPATIAL_PLANNER] No GEMINI_API_KEY found. Returning empty detection result.")
        return RoomDetectionResult()

    raw = _call_gemini_vision(image_paths, gemini_key)

    if not raw:
        logger.error("[SPATIAL_PLANNER] Vision API returned no data. Returning empty detection result.")
        return RoomDetectionResult()

    try:
        hex_re = re.compile(r"^#[0-9A-Fa-f]{6}$")

        def _clean_hex(val: Optional[str]) -> Optional[str]:
            if val and isinstance(val, str) and hex_re.match(val.strip()):
                return val.strip().upper()
            return None

        room_type = str(raw.get("room_type", "bedroom")).lower().strip()
        wall_color = _clean_hex(raw.get("wall_color_hex")) or "#E8E3DC"
        floor_color = _clean_hex(raw.get("floor_color_hex")) or "#C8BFB0"
        floor_material = str(raw.get("floor_material", "hardwood")).lower().strip()
        hero_item_id = str(raw.get("hero_item_id", "")).strip() or None

        raw_furniture = raw.get("furniture") or raw.get("items") or []
        detected: list[SemanticFurnitureItem] = []

        for idx, ri in enumerate(raw_furniture):
            if not isinstance(ri, dict):
                continue
            label = str(ri.get("label", "")).lower().strip()
            if not label:
                continue

            item_id = str(ri.get("id") or f"item_{idx+1}").strip()

            placement = str(ri.get("placement_type") or ri.get("placement", "floor")).lower().strip()
            if placement not in ("floor", "wall"):
                if any(k in label for k in ("wall", "art", "painting", "clock", "mirror")) and "floor" not in label and "table" not in label:
                    placement = "wall"
                else:
                    placement = "floor"

            material_raw = str(ri.get("material", "") or "").lower().strip()
            material = material_raw if material_raw in ("wood", "fabric", "leather", "metal", "glass", "greenery") else None

            color_hex = _clean_hex(ri.get("dominant_color_hex") or ri.get("color_hex"))

            sub_variant = ri.get("sub_variant")
            sub_variant = str(sub_variant).strip() if sub_variant else None

            wall_anchor_raw = str(ri.get("wall_anchor") or ri.get("wall_attachment") or "back").lower().strip()
            if wall_anchor_raw in ("back", "left", "right", "front", "center"):
                wall_anchor = wall_anchor_raw
            else:
                wall_anchor = "back"

            rel_pos_raw = str(ri.get("relative_position", "center")).strip()
            relative_position = rel_pos_raw if rel_pos_raw else "center"

            height_raw = ri.get("height_m")
            try:
                height_m = float(height_raw) if height_raw is not None else (1.5 if placement == "wall" else None)
            except (ValueError, TypeError):
                height_m = 1.5 if placement == "wall" else None

            detected.append(SemanticFurnitureItem(
                id=item_id,
                label=label,
                sub_variant=sub_variant,
                dominant_color_hex=color_hex,
                material=material,
                wall_anchor=wall_anchor,
                relative_position=relative_position,
                placement_type=placement,
                height_m=height_m,
            ))

        # If hero_item_id wasn't set or not in detected items, pick the primary floor item
        if not hero_item_id and detected:
            floor_items = [it for it in detected if it.placement_type == "floor"]
            # Look for bed or sofa or desk
            hero_candidates = [it for it in floor_items if any(k in it.label for k in ("bed", "sofa", "desk"))]
            if hero_candidates:
                hero_item_id = hero_candidates[0].id
            elif floor_items:
                hero_item_id = floor_items[0].id

        result = RoomDetectionResult(
            room_type=room_type,
            wall_color_hex=wall_color,
            floor_color_hex=floor_color,
            floor_material=floor_material,
            hero_item_id=hero_item_id,
            furniture=detected,
        )
        logger.info(
            "[SPATIAL_PLANNER] Detection complete: %s room | hero=%s | %d item(s) | wall=%s floor=%s",
            room_type, hero_item_id, len(detected), wall_color, floor_color
        )
        for it in detected:
            logger.info("  → [%s] ID='%s' label='%s' (sub=%s) | mat=%s color=%s anchor=%s rel=%s h=%s",
                        it.placement_type, it.id, it.label, it.sub_variant, it.material,
                        it.dominant_color_hex, it.wall_anchor, it.relative_position, it.height_m)
        return result

    except Exception as exc:
        logger.error("[SPATIAL_PLANNER] Failed to parse detection result: %s", exc, exc_info=True)
        return RoomDetectionResult()


def plan_spatial_layout(*args, **kwargs) -> RoomDetectionResult:
    """Backwards-compatibility alias for detect_room_contents."""
    image_paths = kwargs.get("image_paths", args[0] if args else [])
    return detect_room_contents(image_paths)
