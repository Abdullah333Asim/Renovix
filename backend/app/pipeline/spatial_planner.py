"""
Multimodal Vision LLM Spatial Layout & Door-First Relative Anchor Engine.

Uses a multi-photo landmark and wall-anchored reasoning flow:
  Step 1: Identify & anchor the entrance door wall and metric position.
  Step 2: Cross-reference architectural landmarks (windows, door, corners).
  Step 3: Calculate metric [X, 0.0, Z] coordinates and rotation angles.
Includes explicit logging and a geometric door-anchored 2D-to-3D projection fallback.
"""
from __future__ import annotations

import base64
import io
import json
import logging
import os
from pathlib import Path
from typing import Any, Literal, Optional

import httpx
from PIL import Image
from pydantic import BaseModel, Field

from app.config import get_settings

logger = logging.getLogger(__name__)


# ─── Pydantic Output Schemas ──────────────────────────────────────────────────

class DoorPrediction(BaseModel):
    wall: Literal["front", "back", "left", "right"] = Field(
        "front",
        description="Wall where door is located: 'front', 'back', 'left', or 'right'",
    )
    offset_m: float = Field(
        0.0,
        description="Metric offset along the wall relative to wall center (meters)",
    )
    width_m: float = Field(0.9, description="Standard door width in meters")
    height_m: float = Field(2.1, description="Standard door height in meters")


class FurniturePrediction(BaseModel):
    id: str = Field(..., description="Unique identifier for the item")
    label: str = Field(..., description="Canonical category (sofa, bed, table, etc.)")
    matched_photo_index: int = Field(0, description="0-indexed photo where item is clearest")
    position: list[float] = Field(
        ...,
        min_length=2,
        max_length=3,
        description="Estimated [X, 0.0, Z] metric coordinates where [0, 0] is room center",
    )
    rotation_y_deg: float = Field(0.0, description="Y-axis rotation angle in degrees")
    wall_alignment: Optional[str] = Field(
        None,
        description="Wall alignment: 'back', 'front', 'left', 'right', or 'center'",
    )


class SpatialLayoutPlan(BaseModel):
    door: Optional[DoorPrediction] = None
    furniture: list[FurniturePrediction] = Field(
        default_factory=list,
        description="List of placed unique furniture items",
    )


# ─── Multi-Photo Landmark & Wall-Anchored System Prompt ───────────────────────

def _build_prompt(
    num_photos: int,
    room_width_m: float,
    room_length_m: float,
    room_height_m: float,
    detected_items: list[Any] | None,
) -> str:
    """
    Builds a rich, grounded system prompt that:
    - Defines the coordinate frame explicitly.
    - Embeds the exact list of detected item IDs + labels so Gemini performs
      strict 1:1 ID assignment without inventing extra furniture.
    - Instructs Gemini to clamp coordinates within room bounds (0.3m margin).
    """
    w_half = room_width_m / 2.0
    l_half = room_length_m / 2.0
    margin = 0.3

    # Build the detected item manifest the LLM must assign coordinates to
    item_lines = []
    furniture_items = [
        it for it in (detected_items or [])
        if getattr(it, "label", "").lower() not in ["door", "doorway", "entrance"]
    ]
    n_items = len(furniture_items)

    for it in furniture_items:
        item_id = getattr(it, "item_id", getattr(it, "id", "unknown"))
        label = getattr(it, "label", "furniture")
        conf = getattr(it, "confidence", 0.5)
        bbox = getattr(it, "bbox", [0.25, 0.25, 0.75, 0.75])
        item_lines.append(
            f'  {{"id": "{item_id}", "label": "{label}", "confidence": {conf:.2f}, '
            f'"bbox_center": [{(bbox[0]+bbox[2])/2:.2f}, {(bbox[1]+bbox[3])/2:.2f}]}}'
        )

    items_json = "[\n" + ",\n".join(item_lines) + "\n]" if item_lines else "[]"

    lines = [
        "You are an expert 3D interior architect performing multi-photo room reconstruction.",
        f"Room dimensions: Width (X) = {room_width_m:.2f}m, Length (Z) = {room_length_m:.2f}m, Height (Y) = {room_height_m:.2f}m.",
        f"Room center is [0, 0, 0]. You have {num_photos} uploaded photo(s) of this room.",
        "",
        "=== COORDINATE SYSTEM ===",
        f"  Back Wall:  Z = -{l_half:.2f}m  (wall opposite the entrance)",
        f"  Front Wall: Z = +{l_half:.2f}m  (entrance/door wall, camera typically faces this direction)",
        f"  Left Wall:  X = -{w_half:.2f}m",
        f"  Right Wall: X = +{w_half:.2f}m",
        f"  Floor:      Y = 0.0",
        f"  VALID X range: [{-w_half+margin:.2f}, {w_half-margin:.2f}] (enforced margin {margin}m from walls)",
        f"  VALID Z range: [{-l_half+margin:.2f}, {l_half-margin:.2f}]",
        "",
        f"=== DETECTED FURNITURE ({n_items} unique items — assign ALL, invent NONE) ===",
        items_json,
        "",
        "=== YOUR TASK ===",
        "1. DOOR: Identify the entrance door in the photos. Report which wall it is on and its metric offset from the wall center.",
        "2. FURNITURE: For each item in the detected list above, analyze the photos and assign:",
        "   - id: MUST exactly match the 'id' from the list above.",
        "   - position: [X, 0.0, Z] in meters, within the valid ranges above.",
        "   - rotation_y_deg: 0 = facing front (+Z), 90 = facing right (+X), 180 = facing back (-Z), -90 = facing left (-X).",
        "   - wall_alignment: 'back' | 'front' | 'left' | 'right' | 'center'.",
        "3. Use the bbox_center field (normalized 0..1 image coords) as spatial hints to anchor positions.",
        "4. Cross-reference architectural landmarks (windows, corners, door) across photos to triangulate locations.",
        "",
        "RULES:",
        "  - Return EXACTLY the same number of furniture entries as the detected list. No additions, no omissions.",
        f"  - All X values MUST be in [{-w_half+margin:.2f}, {w_half-margin:.2f}]. All Z values MUST be in [{-l_half+margin:.2f}, {l_half-margin:.2f}].",
        "  - Y coordinate is ALWAYS 0.0 (floor plane).",
        "",
        "Return ONLY valid JSON matching this schema (no markdown, no explanation):",
        '{{',
        '  "door": {{"wall": "front", "offset_m": 0.0, "width_m": 0.9, "height_m": 2.1}},',
        '  "furniture": [',
        '    {{"id": "<exact_id_from_list>", "label": "<label>", "matched_photo_index": 0, "position": [X, 0.0, Z], "rotation_y_deg": 0, "wall_alignment": "back"}}',
        '  ]',
        '}}',
    ]
    return "\n".join(lines)


# ─── Image Preprocessing & Base64 Encoding ────────────────────────────────────

def _encode_image_b64(path: Path, max_dim: int = 1024) -> tuple[str, str]:
    """
    Resizes uploaded room image to max 1024px to prevent large payload timeouts
    and returns (base64_data_string, 'image/jpeg').
    """
    try:
        with Image.open(path) as img:
            img = img.convert("RGB")
            w, h = img.size
            if max(w, h) > max_dim:
                scale = max_dim / float(max(w, h))
                new_w, new_h = int(w * scale), int(h * scale)
                img = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
                logger.info("Resized %s from (%d, %d) to (%d, %d) for Vision LLM", path.name, w, h, new_w, new_h)
            buf = io.BytesIO()
            img.save(buf, format="JPEG", quality=85)
            b64 = base64.b64encode(buf.getvalue()).decode("utf-8")
            return b64, "image/jpeg"
    except Exception as exc:
        logger.warning("Failed image resize for %s (%s), reading raw bytes", path, exc)
        with open(path, "rb") as f:
            b64 = base64.b64encode(f.read()).decode("utf-8")
        return b64, "image/jpeg"


# ─── Gemini & OpenAI Vision API Handlers ───────────────────────────────────────

def _call_gemini_vision(
    image_paths: list[Path],
    prompt: str,
    api_key: str,
) -> Optional[dict]:
    """
    Calls Google Gemini Generative Language API with inline base64 image parts.
    Tries candidate models: gemini-2.5-flash, gemini-1.5-flash, gemini-flash-latest, gemini-flash-lite-latest.
    Logs full HTTP status and payload to console.
    """
    candidate_models = [
        "gemini-3.6-flash",
        "gemini-flash-lite-latest",
        "gemini-2.5-flash",
        "gemini-1.5-flash",
        "gemini-flash-latest",
    ]

    parts: list[dict[str, Any]] = [{"text": prompt}]

    for path in image_paths:
        b64_data, mime = _encode_image_b64(path)
        parts.append({
            "inline_data": {
                "mime_type": mime,
                "data": b64_data,
            }
        })

    payload = {
        "contents": [{"parts": parts}],
        "generationConfig": {
            "response_mime_type": "application/json",
            "temperature": 0.1,
        },
    }

    logger.info("[SPATIAL_PLANNER] Initiating Gemini Vision API call with %d photo(s)...", len(image_paths))

    with httpx.Client(timeout=35.0) as client:
        for model in candidate_models:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
            try:
                logger.info("[SPATIAL_PLANNER] Requesting model '%s'...", model)
                resp = client.post(url, json=payload)
                if resp.status_code == 200:
                    data = resp.json()
                    candidates = data.get("candidates", [])
                    if candidates and "content" in candidates[0]:
                        raw_text = candidates[0]["content"]["parts"][0]["text"]
                        parsed_json = json.loads(raw_text)
                        logger.info("[SUCCESS] Gemini Vision spatial layout returned clean coordinates (model: %s).", model)
                        logger.info("[SPATIAL_PLANNER] Parsed payload:\n%s", json.dumps(parsed_json, indent=2))
                        return parsed_json
                    else:
                        logger.warning("[ERROR] Gemini Vision returned 200 but no candidate parts: %s", data)
                else:
                    logger.error("[ERROR] Gemini Vision (%s) failed with HTTP %d:\n%s", model, resp.status_code, resp.text)
            except Exception as exc:
                logger.error("[ERROR] Exception connecting to Gemini Vision (%s): %s", model, exc)

    logger.error("[ERROR] All candidate Gemini Vision model endpoints failed.")
    return None


def _call_openai_vision(
    image_paths: list[Path],
    prompt: str,
    api_key: str,
) -> Optional[dict]:
    """Calls OpenAI GPT-4o / GPT-4o-mini REST endpoint with multimodal images."""
    url = "https://api.openai.com/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    content_list: list[dict[str, Any]] = [{"type": "text", "text": prompt}]
    for path in image_paths:
        b64_data, mime = _encode_image_b64(path)
        content_list.append({
            "type": "image_url",
            "image_url": {"url": f"data:{mime};base64,{b64_data}"},
        })

    payload = {
        "model": "gpt-4o-mini",
        "messages": [{"role": "user", "content": content_list}],
        "response_format": {"type": "json_object"},
        "temperature": 0.1,
    }

    logger.info("[SPATIAL_PLANNER] Calling OpenAI Vision API with %d photo(s)...", len(image_paths))

    try:
        with httpx.Client(timeout=35.0) as client:
            resp = client.post(url, headers=headers, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                raw_text = data["choices"][0]["message"]["content"]
                parsed_json = json.loads(raw_text)
                logger.info("[SUCCESS] OpenAI Vision spatial layout returned clean coordinates.")
                logger.info("[SPATIAL_PLANNER] Parsed payload:\n%s", json.dumps(parsed_json, indent=2))
                return parsed_json
            else:
                logger.error("[ERROR] OpenAI Vision API failed with HTTP %d:\n%s", resp.status_code, resp.text)
                return None
    except Exception as exc:
        logger.error("[ERROR] Exception connecting to OpenAI Vision: %s", exc)
        return None


# ─── Fallback Spatial Layout Reasoning (Door-Anchored) ───────────────────────

def _compute_fallback_plan(
    room_width_m: float,
    room_length_m: float,
    room_height_m: float,
    detected_items: list[Any] | None,
) -> SpatialLayoutPlan:
    """
    Intelligent door-anchored fallback:
    1. Sets the entrance door as the primary anchor.
    2. Positions furniture relative to the door's line-of-sight vector.
    3. Guarantees coordinates are strictly bounded on floor plane Y=0.0.
    """
    logger.info("[FALLBACK] Running door-anchored geometric spatial layout fallback...")
    w_half = room_width_m / 2.0
    l_half = room_length_m / 2.0

    door_pred: Optional[DoorPrediction] = None
    furniture_preds: list[FurniturePrediction] = []

    if not detected_items:
        return SpatialLayoutPlan(
            door=DoorPrediction(wall="front", offset_m=0.0, width_m=0.9, height_m=2.1),
            furniture=[],
        )

    door_candidates = [it for it in detected_items if getattr(it, "label", "").lower() in ["door", "doorway", "entrance"]]
    furniture_candidates = [it for it in detected_items if getattr(it, "label", "").lower() not in ["door", "doorway", "entrance"]]

    # Step 1: Anchor Entrance Door
    if door_candidates:
        best_door = max(door_candidates, key=lambda x: getattr(x, "confidence", 0.5))
        bbox = getattr(best_door, "bbox", [0.4, 0.1, 0.6, 0.9])
        cx = (bbox[0] + bbox[2]) / 2.0
        offset_m = round((cx - 0.5) * room_width_m * 0.7, 2)
        door_pred = DoorPrediction(
            wall="back",
            offset_m=max(-w_half + 0.6, min(w_half - 0.6, offset_m)),
            width_m=0.9,
            height_m=2.1,
        )
    else:
        door_pred = DoorPrediction(
            wall="front",
            offset_m=0.0,
            width_m=0.9,
            height_m=2.1,
        )

    # Step 2: Position Furniture Relative to Door Anchor
    for idx, it in enumerate(furniture_candidates):
        item_id = getattr(it, "item_id", f"item_{idx+1}")
        label = getattr(it, "label", "furniture").lower()
        bbox = getattr(it, "bbox", [0.25, 0.25, 0.75, 0.75])

        # Bounding box center (-0.5 to 0.5 normalized)
        norm_cx = ((bbox[0] + bbox[2]) / 2.0) - 0.5
        norm_cz = ((bbox[1] + bbox[3]) / 2.0) - 0.5

        # Metric floor coordinates
        x = round(float(norm_cx * room_width_m * 0.70), 2)
        z = round(float(norm_cz * room_length_m * 0.70), 2)

        # Determine wall alignment & rotation relative to doorway
        wall_alignment = "center"
        rot_deg = 0.0

        if norm_cx < -0.15:
            wall_alignment = "left"
            rot_deg = 90.0
            x = float(max(-w_half + 0.45, min(w_half - 0.45, x)))
        elif norm_cx > 0.15:
            wall_alignment = "right"
            rot_deg = 270.0
            x = float(max(-w_half + 0.45, min(w_half - 0.45, x)))
        elif norm_cz < 0.0:
            wall_alignment = "back"
            rot_deg = 0.0
            z = float(max(-l_half + 0.45, min(l_half - 0.45, z)))
        else:
            wall_alignment = "front"
            rot_deg = 180.0
            z = float(max(-l_half + 0.45, min(l_half - 0.45, z)))

        furniture_preds.append(
            FurniturePrediction(
                id=item_id,
                label=label,
                matched_photo_index=0,
                position=[x, 0.0, z],
                rotation_y_deg=rot_deg,
                wall_alignment=wall_alignment,
            )
        )

    return SpatialLayoutPlan(door=door_pred, furniture=furniture_preds)


# ─── Public API ───────────────────────────────────────────────────────────────

def plan_spatial_layout(
    image_paths: list[Path],
    room_width_m: float,
    room_length_m: float,
    room_height_m: float,
    detected_items: list[Any] | None = None,
) -> SpatialLayoutPlan:
    """
    Main entry point for Door-First Vision LLM Spatial Reasoning.

    1. Builds a grounded prompt that includes the exact detected item IDs / labels
       so Gemini returns strict 1:1 ID-to-coordinate assignments.
    2. Sends multi-photo prompt to Vision LLM (Gemini cascade → OpenAI fallback).
    3. Validates & enforces coordinate clamping within room bounds (0.3m margin).
    4. Falls back to door-anchored geometric floor projection if LLM unavailable.
    """
    settings = get_settings()
    gemini_key = settings.gemini_api_key or os.environ.get("GEMINI_API_KEY", "").strip()
    openai_key = settings.openai_api_key or os.environ.get("OPENAI_API_KEY", "").strip()

    w_half = room_width_m / 2.0
    l_half = room_length_m / 2.0

    # Build item-aware prompt with explicit IDs
    prompt = _build_prompt(
        num_photos=max(1, len(image_paths)),
        room_width_m=room_width_m,
        room_length_m=room_length_m,
        room_height_m=room_height_m,
        detected_items=detected_items,
    )

    if detected_items:
        non_door = [i for i in detected_items if getattr(i, "label", "").lower() not in ["door", "doorway", "entrance"]]
        logger.info(
            "[SPATIAL_PLANNER] Planning layout for %d detected items: %s",
            len(non_door),
            [(getattr(i, 'item_id', '?'), getattr(i, 'label', '?')) for i in non_door],
        )

    raw_json: Optional[dict] = None

    if gemini_key:
        raw_json = _call_gemini_vision(image_paths, prompt, gemini_key)
    elif openai_key:
        raw_json = _call_openai_vision(image_paths, prompt, openai_key)
    else:
        logger.info("[SPATIAL_PLANNER] No Vision LLM API key detected in .env; utilizing door-anchored floor projection.")

    if raw_json:
        try:
            plan = SpatialLayoutPlan.model_validate(raw_json)

            # Strictly enforce coordinate bounds (0.3m margin from each wall)
            margin = 0.3
            if plan.door:
                if plan.door.wall in ["front", "back"]:
                    plan.door.offset_m = float(max(-w_half + 0.5, min(w_half - 0.5, plan.door.offset_m)))
                else:
                    plan.door.offset_m = float(max(-l_half + 0.5, min(l_half - 0.5, plan.door.offset_m)))

            for item in plan.furniture:
                pos_x = float(item.position[0])
                pos_z = float(item.position[2] if len(item.position) > 2 else item.position[1])
                clamped_x = float(max(-w_half + margin, min(w_half - margin, pos_x)))
                clamped_z = float(max(-l_half + margin, min(l_half - margin, pos_z)))
                item.position = [clamped_x, 0.0, clamped_z]
                item.rotation_y_deg = float(item.rotation_y_deg) % 360.0

                # Log each item's resolved placement for debugging
                logger.info(
                    "[SPATIAL_PLANNER] Placed '%s' (id=%s) → [%.2f, 0.0, %.2f] rot=%.1f° wall=%s",
                    item.label, item.id, clamped_x, clamped_z,
                    item.rotation_y_deg, item.wall_alignment or 'center',
                )

            logger.info(
                "[SUCCESS] Vision LLM Door-Anchored Spatial Plan validated: %d furniture items placed, door on %s wall (offset %.2fm)",
                len(plan.furniture),
                plan.door.wall if plan.door else "none",
                plan.door.offset_m if plan.door else 0.0,
            )
            return plan
        except Exception as parse_err:
            logger.error("[ERROR] Failed to validate Vision LLM output against schema: %s", parse_err)

    return _compute_fallback_plan(
        room_width_m=room_width_m,
        room_length_m=room_length_m,
        room_height_m=room_height_m,
        detected_items=detected_items,
    )
