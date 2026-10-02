from pathlib import Path
import logging
import os
import sys
import io
from PIL import Image

# Add backend directory to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.config import get_settings
from app.pipeline.spatial_planner import plan_spatial_layout, _call_gemini_vision
from app.pipeline.segmentation import DetectedFurniture
from app.schemas import RoomDimensions

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

import httpx

def test_gemini_key():
    settings = get_settings()
    key = (settings.gemini_api_key or os.environ.get("GEMINI_API_KEY", "")).strip().strip('"').strip("'")
    print(f"[TEST 1] Clean Gemini API Key present: {bool(key)}, length: {len(key)}")
    
    # Query Gemini API models list
    for ver in ["v1beta", "v1"]:
        try:
            r = httpx.get(f"https://generativelanguage.googleapis.com/{ver}/models?key={key}")
            if r.status_code == 200:
                models = [m["name"].replace("models/", "") for m in r.json().get("models", [])]
                print(f" -> Available {ver} models: {models[:8]}")
            else:
                print(f" -> {ver} ListModels HTTP {r.status_code}: {r.text[:120]}")
        except Exception as e:
            print(f" -> {ver} error: {e}")
            
    return key


def test_bedroom_office_vision_dataflow():
    print("\n[TEST 2] Testing Bedroom/Office Vision Dataflow Handoff...")
    test_dir = Path(__file__).resolve().parent / "tmp_test"
    test_dir.mkdir(parents=True, exist_ok=True)
    img_path = test_dir / "sample_bedroom.jpg"
    
    # Create sample bedroom photo
    img = Image.new("RGB", (800, 600), color=(235, 230, 220))
    img.save(img_path, "JPEG")

    # Simulate 4 detected objects from a bedroom photo: bed, nightstand, desk, chair
    detected = [
        DetectedFurniture(
            item_id="bed-01",
            label="bed",
            confidence=0.92,
            bbox=[0.10, 0.20, 0.50, 0.85],
            rgba_path=img_path,
            mask=None,
            dominant_color="#E0D6C3",
            material_type="fabric",
        ),
        DetectedFurniture(
            item_id="nightstand-01",
            label="nightstand",
            confidence=0.88,
            bbox=[0.52, 0.40, 0.65, 0.75],
            rgba_path=img_path,
            mask=None,
            dominant_color="#3B2317",
            material_type="wood",
        ),
        DetectedFurniture(
            item_id="desk-01",
            label="desk",
            confidence=0.90,
            bbox=[0.68, 0.30, 0.92, 0.70],
            rgba_path=img_path,
            mask=None,
            dominant_color="#C49E6C",
            material_type="wood",
        ),
        DetectedFurniture(
            item_id="chair-01",
            label="office chair",
            confidence=0.86,
            bbox=[0.72, 0.50, 0.88, 0.85],
            rgba_path=img_path,
            mask=None,
            dominant_color="#1E2024",
            material_type="leather",
        ),
    ]

    print(f" -> Input detected labels: {[d.label for d in detected]}")

    plan = plan_spatial_layout(
        image_paths=[img_path],
        room_width_m=4.5,
        room_length_m=5.5,
        room_height_m=2.8,
        detected_items=detected,
    )

    print("\n -> Vision LLM Spatial Layout Result:")
    print(f"    Door placement: {plan.door.wall if plan.door else 'None'} wall (offset: {plan.door.offset_m if plan.door else 0}m)")
    print(f"    Sampled Wall Color: {plan.wall_color_hex}")
    print(f"    Sampled Floor Color: {plan.floor_color_hex}")
    print(f"    Placed furniture items count: {len(plan.furniture)}")

    placed_labels = [f.label for f in plan.furniture]
    placed_ids = [f.id for f in plan.furniture]
    print(f"    Placed labels: {placed_labels}")
    print(f"    Placed item IDs: {placed_ids}")

    for f in plan.furniture:
        print(f"     * {f.label} (id={f.id}): pos={f.position}, rot={f.rotation_y_deg}°, wall={f.wall_alignment}")

    # Verify zero living-room sofa fallbacks were inserted
    assert len(plan.furniture) == len(detected), "Manifest furniture count must equal input detected items"
    assert "sofa" not in placed_labels, "Bedroom photo MUST NOT contain hardcoded sofa"
    assert set(placed_ids) == {"bed-01", "nightstand-01", "desk-01", "chair-01"}, "All detected IDs must match 1:1"
    
    print("\n[PASSED] All Vision Dataflow Assertions PASSED!")

if __name__ == "__main__":
    test_gemini_key()
    test_bedroom_office_vision_dataflow()
