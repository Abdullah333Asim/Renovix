"""
Grounding DINO + SAM 2 instance detection and segmentation pipeline.

Extracts isolated furniture items as transparent 512x512 RGBA PNG cutouts.
Includes Non-Maximum Suppression (NMS) and confidence threshold filtering.
"""
from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
import logging
from pathlib import Path
from typing import Optional
import uuid

import cv2
import numpy as np
from PIL import Image

logger = logging.getLogger(__name__)

# Curated, distinct indoor furniture vocabulary
DEFAULT_FURNITURE_CLASSES = [
    "bed",
    "sofa",
    "couch",
    "armchair",
    "chair",
    "dining table",
    "coffee table",
    "desk",
    "nightstand",
    "wardrobe",
    "closet",
    "bookshelf",
    "bookcase",
    "cabinet",
    "dresser",
    "door",
    "doorway",
    "entrance",
]

# Canonical dictionary for label normalization
CANONICAL_CLASSES = DEFAULT_FURNITURE_CLASSES


def canonicalize_label(raw_label: str) -> str:
    """
    Cleans and canonicalizes raw Grounding DINO label predictions.
    Maps composite strings like 'chair armchair desk' -> 'chair' or 'armchair'.
    """
    raw = raw_label.lower().strip().rstrip(".")
    if not raw:
        return "furniture"

    # Exact match first
    for c in CANONICAL_CLASSES:
        if raw == c:
            return c

    # Substring match (longest match first)
    matches = [c for c in CANONICAL_CLASSES if c in raw or raw in c]
    if matches:
        matches.sort(key=len, reverse=True)
        return matches[0]

    # Token fallback
    first_token = raw.split()[0]
    return first_token if len(first_token) > 2 else "furniture"


def compute_iou(box_a: list[float], box_b: list[float]) -> float:
    """
    Calculates Intersection over Union (IoU) between two bounding boxes.
    Boxes are in format [x0, y0, x1, y1].
    """
    x_left = max(box_a[0], box_b[0])
    y_top = max(box_a[1], box_b[1])
    x_right = min(box_a[2], box_b[2])
    y_bottom = min(box_a[3], box_b[3])

    if x_right <= x_left or y_bottom <= y_top:
        return 0.0

    intersection_area = (x_right - x_left) * (y_bottom - y_top)
    area_a = max(0.0, box_a[2] - box_a[0]) * max(0.0, box_a[3] - box_a[1])
    area_b = max(0.0, box_b[2] - box_b[0]) * max(0.0, box_b[3] - box_b[1])
    union_area = area_a + area_b - intersection_area

    if union_area <= 0:
        return 0.0
    return float(intersection_area / union_area)


def apply_nms(
    boxes: list[list[float]],
    scores: list[float],
    labels: list[str],
    iou_threshold: float = 0.5,
) -> list[int]:
    """
    Applies Non-Maximum Suppression (NMS) to eliminate duplicate/conflicting
    bounding boxes on the same object.
    
    Returns:
        List of selected integer indices sorted descending by confidence score.
    """
    if len(boxes) == 0:
        return []

    indices = np.argsort(scores)[::-1]
    keep: list[int] = []

    while len(indices) > 0:
        current = int(indices[0])
        keep.append(current)

        if len(indices) == 1:
            break

        rest = indices[1:]
        ious = np.array([compute_iou(boxes[current], boxes[int(j)]) for j in rest])
        indices = rest[ious < iou_threshold]

    return keep


@dataclass
class DetectedFurniture:
    item_id: str
    label: str
    confidence: float
    bbox: list[float]  # [x_min, y_min, x_max, y_max] in normalized (0..1) coordinates
    rgba_path: Path    # Path to centered 512x512 transparent PNG
    mask: np.ndarray   # Full-size binary mask (H, W), dtype bool or uint8
    dominant_color: str = "#8B5A2B"
    material_type: str = "wood"


def extract_dominant_color_and_material(rgba_img: Image.Image, label: str) -> tuple[str, str]:
    """
    Extracts the dominant hex color and estimated finish (wood, fabric, leather, metal)
    from non-transparent pixels in an RGBA image using OpenCV K-Means clustering.
    """
    img_np = np.array(rgba_img)
    if img_np.ndim != 3 or img_np.shape[2] != 4:
        return "#8B5A2B", "wood"
    
    alpha = img_np[:, :, 3]
    fg_pixels = img_np[alpha > 30][:, :3]  # RGB pixels
    
    if len(fg_pixels) < 20:
        return "#8B5A2B", "wood"
        
    # Sample up to 2000 pixels for fast K-Means
    if len(fg_pixels) > 2000:
        sample_indices = np.random.choice(len(fg_pixels), 2000, replace=False)
        fg_pixels = fg_pixels[sample_indices]
        
    data = np.float32(fg_pixels)
    criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 10, 1.0)
    k = min(3, len(fg_pixels))
    _, labels_km, centers = cv2.kmeans(data, k, None, criteria, 5, cv2.KMEANS_RANDOM_CENTERS)
    
    # Find most frequent cluster
    counts = np.bincount(labels_km.flatten())
    dominant_rgb = centers[np.argmax(counts)]
    r, g, b = int(dominant_rgb[0]), int(dominant_rgb[1]), int(dominant_rgb[2])
    hex_color = f"#{r:02x}{g:02x}{b:02x}".upper()
    
    # Determine material type based on label, HSV, and brightness
    hsv = cv2.cvtColor(np.uint8([[[r, g, b]]]), cv2.COLOR_RGB2HSV)[0][0]
    hue, sat, val = int(hsv[0]), int(hsv[1]), int(hsv[2])
    
    label_lower = label.lower()
    if any(w in label_lower for w in ["desk", "table", "wardrobe", "bookshelf", "nightstand", "cabinet"]):
        material_type = "wood"
    elif any(w in label_lower for w in ["sofa", "couch", "armchair", "bed", "chair", "cushion"]):
        if 5 <= hue <= 30 and sat > 50 and val < 100:
            material_type = "leather"
        else:
            material_type = "fabric"
    else:
        if sat < 20 and (val > 180 or val < 50):
            material_type = "metal"
        else:
            material_type = "fabric"
            
    return hex_color, material_type


ROOM_ANCHOR_CLASSES = {
    "bed", "sofa", "couch", "wardrobe", "closet", "desk", 
    "bookshelf", "bookcase", "dining table"
}


def compare_color_histograms(img_path_a: Path, img_path_b: Path) -> float:
    """
    Computes Bhattacharyya distance between HSV histograms of non-transparent pixels.
    Returns a distance where 0.0 means identical, and higher means more different.
    """
    img_a = cv2.imread(str(img_path_a), cv2.IMREAD_UNCHANGED)
    img_b = cv2.imread(str(img_path_b), cv2.IMREAD_UNCHANGED)
    
    if img_a is None or img_b is None or img_a.shape[2] != 4 or img_b.shape[2] != 4:
        return 1.0
        
    def get_hist(img):
        bgr = img[:, :, :3]
        alpha = img[:, :, 3]
        hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV)
        mask_uint8 = (alpha > 0).astype(np.uint8) * 255
        
        hist = cv2.calcHist([hsv], [0, 1, 2], mask_uint8, [8, 8, 8],
                            [0, 180, 0, 256, 0, 256])
        cv2.normalize(hist, hist)
        return hist
        
    hist_a = get_hist(img_a)
    hist_b = get_hist(img_b)
    
    return cv2.compareHist(hist_a, hist_b, cv2.HISTCMP_BHATTACHARYYA)


def deduplicate_cross_image_detections(detections: list[DetectedFurniture]) -> list[DetectedFurniture]:
    """
    Deduplicate furniture detections collected across multiple images.
    - Anchor classes: keep only the single best instance (highest confidence * area).
    - Repeatable classes: cluster by visual similarity (HSV histogram), keep the best in each cluster.
    """
    if not detections:
        return []
        
    def get_quality(det: DetectedFurniture) -> float:
        w = max(0.0, det.bbox[2] - det.bbox[0])
        h = max(0.0, det.bbox[3] - det.bbox[1])
        return det.confidence * w * h

    grouped = defaultdict(list)
    for det in detections:
        grouped[det.label].append(det)
        
    final_keep = []
    
    for label, items in grouped.items():
        # Sort items by quality descending
        items.sort(key=get_quality, reverse=True)
        
        if label in ROOM_ANCHOR_CLASSES:
            # Only keep the top 1
            logger.info("Deduplicating anchor class '%s': keeping 1 out of %d", label, len(items))
            final_keep.append(items[0])
        else:
            # Repeatable class: cluster by visual similarity
            clusters = []
            for item in items:
                assigned = False
                for cluster in clusters:
                    best_in_cluster = cluster[0]
                    dist = compare_color_histograms(item.rgba_path, best_in_cluster.rgba_path)
                    if dist < 0.25:
                        cluster.append(item)
                        assigned = True
                        break
                if not assigned:
                    clusters.append([item])
            
            logger.info("Deduplicating repeatable class '%s': grouped %d items into %d clusters", label, len(items), len(clusters))
            for cluster in clusters:
                final_keep.append(cluster[0])
                
    return final_keep


class VisionPipeline:
    def __init__(self, device: Optional[str] = None):
        import torch

        if device is None:
            self.device = "cuda" if torch.cuda.is_available() else "cpu"
        else:
            self.device = device

        logger.info("Initializing VisionPipeline on device: %s", self.device)
        self._dino_model = None
        self._dino_processor = None
        self._sam_predictor = None

    def _load_dino(self):
        if self._dino_model is None:
            from transformers import AutoModelForZeroShotObjectDetection, AutoProcessor

            model_id = "IDEA-Research/grounding-dino-tiny"
            logger.info("Loading Grounding DINO model: %s", model_id)
            self._dino_processor = AutoProcessor.from_pretrained(model_id)
            self._dino_model = AutoModelForZeroShotObjectDetection.from_pretrained(
                model_id
            ).to(self.device)
            self._dino_model.eval()

    def _load_sam(self):
        if self._sam_predictor is None:
            try:
                from sam2.sam2_image_predictor import SAM2ImagePredictor

                logger.info("Loading SAM 2 Image Predictor...")
                self._sam_predictor = SAM2ImagePredictor.from_pretrained(
                    "facebook/sam2.1-hiera-tiny"
                )
            except Exception as e:
                logger.warning("Native sam2 not available (%s), attempting transformers SAM fallback", e)
                try:
                    from transformers import SamModel, SamProcessor
                    logger.info("Loading Transformers SAM (facebook/sam-vit-base)...")
                    self._sam_model = SamModel.from_pretrained("facebook/sam-vit-base").to(self.device)
                    self._sam_processor = SamProcessor.from_pretrained("facebook/sam-vit-base")
                    self._sam_predictor = "transformers"
                except Exception as e2:
                    logger.warning("SAM fallback error: %s. Will use bbox contour masking.", e2)
                    self._sam_predictor = "bbox_fallback"

    def detect_and_segment(
        self,
        image_path: Path,
        output_dir: Path,
        classes: Optional[list[str]] = None,
        threshold: float = 0.45,
        text_threshold: float = 0.25,
        nms_iou_threshold: float = 0.50,
    ) -> tuple[list[DetectedFurniture], np.ndarray]:
        """
        Detect furniture instances, apply Non-Maximum Suppression (NMS),
        and generate transparent RGBA cutouts.
        
        Returns:
            Tuple of (list of DetectedFurniture, union_binary_mask_of_all_furniture)
        """
        import torch

        self._load_dino()
        self._load_sam()

        output_dir.mkdir(parents=True, exist_ok=True)
        img_pil = Image.open(image_path).convert("RGB")
        w_orig, h_orig = img_pil.size
        img_area = float(w_orig * h_orig)

        # Format clean, distinct prompt for Grounding DINO
        target_classes = classes or DEFAULT_FURNITURE_CLASSES
        text_prompt = " . ".join(target_classes) + " ."

        logger.info("Running Grounding DINO detection (thresh=%.2f, prompt=%s)", threshold, text_prompt)
        inputs = self._dino_processor(
            images=img_pil,
            text=text_prompt,
            return_tensors="pt",
        ).to(self.device)

        with torch.no_grad():
            outputs = self._dino_model(**inputs)

        # Try target threshold (0.45); if 0 detections, adaptively step down to 0.30
        results = self._dino_processor.post_process_grounded_object_detection(
            outputs,
            inputs.input_ids,
            threshold=threshold,
            text_threshold=text_threshold,
            target_sizes=[(h_orig, w_orig)],
        )[0]

        raw_boxes = results["boxes"].cpu().numpy()
        raw_scores = results["scores"].cpu().numpy()
        raw_labels = results["labels"]

        if len(raw_boxes) == 0 and threshold > 0.30:
            logger.info("0 detections at threshold %.2f, attempting adaptive threshold 0.30...", threshold)
            results = self._dino_processor.post_process_grounded_object_detection(
                outputs,
                inputs.input_ids,
                threshold=0.30,
                text_threshold=text_threshold,
                target_sizes=[(h_orig, w_orig)],
            )[0]
            raw_boxes = results["boxes"].cpu().numpy()
            raw_scores = results["scores"].cpu().numpy()
            raw_labels = results["labels"]

        logger.info("Grounding DINO raw detections before NMS: %d candidates", len(raw_boxes))

        # Filter degenerate/extreme boxes before NMS
        valid_boxes: list[list[float]] = []
        valid_scores: list[float] = []
        valid_labels: list[str] = []

        for box, score, raw_lbl in zip(raw_boxes, raw_scores, raw_labels):
            x0, y0, x1, y1 = [float(v) for v in box]
            w_box, h_box = max(0.0, x1 - x0), max(0.0, y1 - y0)
            box_area = w_box * h_box

            # Reject tiny artifacts (< 0.5% area) or full-frame background blobs (> 92% area)
            if box_area < (img_area * 0.005) or box_area > (img_area * 0.92):
                continue
            if (w_box / w_orig) < 0.04 or (h_box / h_orig) < 0.04:
                continue

            cleaned_lbl = canonicalize_label(raw_lbl)
            valid_boxes.append([x0, y0, x1, y1])
            valid_scores.append(float(score))
            valid_labels.append(cleaned_lbl)

        # Apply Non-Maximum Suppression (IoU threshold 0.5)
        keep_indices = apply_nms(valid_boxes, valid_scores, valid_labels, iou_threshold=nms_iou_threshold)
        logger.info("Retained %d clean furniture instances after NMS filtering", len(keep_indices))

        detected_items: list[DetectedFurniture] = []
        union_mask = np.zeros((h_orig, w_orig), dtype=bool)
        img_np = np.array(img_pil)

        for idx in keep_indices:
            box = valid_boxes[idx]
            score = valid_scores[idx]
            label = valid_labels[idx]

            x0 = max(0, min(w_orig - 1, int(box[0])))
            y0 = max(0, min(h_orig - 1, int(box[1])))
            x1 = max(0, min(w_orig, int(box[2])))
            y1 = max(0, min(h_orig, int(box[3])))

            if x1 <= x0 or y1 <= y0:
                continue

            # Generate segmentation mask
            mask = self._generate_mask(img_np, [x0, y0, x1, y1])
            union_mask = union_mask | mask

            # Create transparent RGBA cutout
            item_id = f"item_{uuid.uuid4().hex[:8]}"
            rgba_path = output_dir / f"{item_id}_{label.replace(' ', '_')}.png"

            cutout_img = self._create_centered_cutout(img_pil, mask, [x0, y0, x1, y1], target_size=512)
            cutout_img.save(rgba_path, "PNG")

            dominant_hex, material_finish = extract_dominant_color_and_material(cutout_img, label)

            norm_bbox = [x0 / w_orig, y0 / h_orig, x1 / w_orig, y1 / h_orig]

            detected_items.append(
                DetectedFurniture(
                    item_id=item_id,
                    label=label,
                    confidence=float(score),
                    bbox=norm_bbox,
                    rgba_path=rgba_path,
                    mask=mask,
                    dominant_color=dominant_hex,
                    material_type=material_finish,
                )
            )
            logger.info("Extracted %s (conf: %.2f, color: %s, mat: %s) -> %s", label, score, dominant_hex, material_finish, rgba_path.name)

        return detected_items, union_mask

    def _generate_mask(self, img_np: np.ndarray, bbox: list[int]) -> np.ndarray:
        """Generate precise binary mask for a single bounding box."""
        h, w = img_np.shape[:2]
        x0, y0, x1, y1 = bbox

        if self._sam_predictor == "transformers" and hasattr(self, "_sam_model"):
            import torch
            try:
                prompt_box = [[[x0, y0, x1, y1]]]
                inputs = self._sam_processor(img_np, input_boxes=prompt_box, return_tensors="pt").to(self.device)
                with torch.no_grad():
                    outputs = self._sam_model(**inputs)
                masks = self._sam_processor.image_processor.post_process_masks(
                    outputs.pred_masks.cpu(),
                    inputs["original_sizes"].cpu(),
                    inputs["reshaped_input_sizes"].cpu(),
                )[0]
                mask_np = masks[0, 0].numpy() > 0
                return mask_np
            except Exception as e:
                logger.warning("SAM inference failed: %s, falling back to box mask", e)

        # Fallback: rectangular bbox mask
        mask = np.zeros((h, w), dtype=bool)
        mask[y0:y1, x0:x1] = True
        return mask

    def _create_centered_cutout(
        self,
        img_pil: Image.Image,
        mask: np.ndarray,
        bbox: list[int],
        target_size: int = 512,
        padding_ratio: float = 0.15,
    ) -> Image.Image:
        """
        Crops object with binary alpha mask and centers it on a square RGBA canvas.
        """
        x0, y0, x1, y1 = bbox
        w, h = x1 - x0, y1 - y0

        pad_x = int(w * padding_ratio)
        pad_y = int(h * padding_ratio)
        cx0 = max(0, x0 - pad_x)
        cy0 = max(0, y0 - pad_y)
        cx1 = min(img_pil.width, x1 + pad_x)
        cy1 = min(img_pil.height, y1 + pad_y)

        crop_rgb = img_pil.crop((cx0, cy0, cx1, cy1))
        crop_mask = mask[cy0:cy1, cx0:cx1]

        crop_rgba = crop_rgb.convert("RGBA")
        alpha_channel = (crop_mask.astype(np.uint8) * 255)
        alpha_img = Image.fromarray(alpha_channel, mode="L")
        crop_rgba.putalpha(alpha_img)

        inner_size = int(target_size * (1.0 - padding_ratio))
        crop_rgba.thumbnail((inner_size, inner_size), Image.Resampling.LANCZOS)

        canvas = Image.new("RGBA", (target_size, target_size), (0, 0, 0, 0))
        paste_x = (target_size - crop_rgba.width) // 2
        paste_y = (target_size - crop_rgba.height) // 2
        canvas.paste(crop_rgba, (paste_x, paste_y), crop_rgba)

        return canvas


# ─── Wall & Floor Color Extraction ───────────────────────────────────────────

def _bgr_to_hex(bgr: np.ndarray) -> str:
    """Convert a BGR numpy array (1D, 3 elements) to a hex color string."""
    b, g, r = int(bgr[0]), int(bgr[1]), int(bgr[2])
    return f"#{r:02X}{g:02X}{b:02X}"


def _dominant_color_kmeans(pixels: np.ndarray, k: int = 3) -> str:
    """
    Run K-Means on a float32 pixel array (N×3, BGR) and return the
    hex color of the largest cluster centroid.
    """
    if len(pixels) < k:
        # Not enough pixels — return a neutral grey
        return "#e8e2d9"

    pixels_f = pixels.astype(np.float32)
    criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 20, 0.5)
    _, labels, centers = cv2.kmeans(
        pixels_f, k, None, criteria, 5, cv2.KMEANS_RANDOM_CENTERS
    )
    # Count pixels per cluster and take the largest
    counts = np.bincount(labels.flatten(), minlength=k)
    dominant_idx = int(np.argmax(counts))
    return _bgr_to_hex(centers[dominant_idx])


def extract_wall_and_floor_colors(
    image_path: Path,
    object_bboxes: list[tuple[int, int, int, int]] | None = None,
) -> tuple[str, str]:
    """
    Sample dominant wall and floor colors from a room photo using OpenCV K-Means.

    Strategy:
      - Wall region  : top 35% of the image (above furniture line)
      - Floor region : bottom 20% of the image (below furniture line)
      - Furniture bounding boxes are masked out in both regions.

    Args:
        image_path: Path to the source room image.
        object_bboxes: Optional list of (x0, y0, x1, y1) pixel bounding boxes
                       from detected furniture to exclude from sampling.

    Returns:
        (wall_hex, floor_hex) — dominant color hex strings for wall and floor.
    """
    WALL_HEX_FALLBACK = "#e8e2d9"
    FLOOR_HEX_FALLBACK = "#c8bfb0"

    try:
        img = cv2.imread(str(image_path))
        if img is None:
            logger.warning("[COLOR_EXTRACT] Could not read image at %s", image_path)
            return WALL_HEX_FALLBACK, FLOOR_HEX_FALLBACK

        h, w = img.shape[:2]

        # ── Build a furniture-exclusion mask ──────────────────────────────
        exclusion = np.zeros((h, w), dtype=np.uint8)
        if object_bboxes:
            for (x0, y0, x1, y1) in object_bboxes:
                x0c, y0c = max(0, x0), max(0, y0)
                x1c, y1c = min(w, x1), min(h, y1)
                exclusion[y0c:y1c, x0c:x1c] = 255

        # ── Wall region: top 35% ──────────────────────────────────────────
        wall_h = int(h * 0.35)
        wall_strip = img[:wall_h, :, :]
        excl_strip_wall = exclusion[:wall_h, :]
        wall_mask = (excl_strip_wall == 0)
        wall_pixels = wall_strip[wall_mask]

        # ── Floor region: bottom 20% ──────────────────────────────────────
        floor_start = int(h * 0.80)
        floor_strip = img[floor_start:, :, :]
        excl_strip_floor = exclusion[floor_start:, :]
        floor_mask = (excl_strip_floor == 0)
        floor_pixels = floor_strip[floor_mask]

        wall_hex = _dominant_color_kmeans(wall_pixels, k=3) if len(wall_pixels) >= 3 else WALL_HEX_FALLBACK
        floor_hex = _dominant_color_kmeans(floor_pixels, k=3) if len(floor_pixels) >= 3 else FLOOR_HEX_FALLBACK

        logger.info(
            "[COLOR_EXTRACT] Extracted room colors -> Wall: %s  Floor: %s  (from %s)",
            wall_hex, floor_hex, image_path.name,
        )
        return wall_hex, floor_hex

    except Exception as exc:
        logger.warning("[COLOR_EXTRACT] Failed to extract colors from %s: %s", image_path, exc)
        return WALL_HEX_FALLBACK, FLOOR_HEX_FALLBACK
