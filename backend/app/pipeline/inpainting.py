"""
Background Inpainting Pipeline (LaMa).

Erases all detected foreground furniture from the room image to generate
clean, seamless floor and wall textures.
"""
from __future__ import annotations

import logging
from pathlib import Path
from typing import Optional

import numpy as np
from PIL import Image

logger = logging.getLogger(__name__)


class BackgroundInpainter:
    def __init__(self, device: Optional[str] = None):
        import torch

        if device is None:
            self.device = "cuda" if torch.cuda.is_available() else "cpu"
        else:
            self.device = device

        logger.info("Initializing BackgroundInpainter on device: %s", self.device)
        self._model = None

    def _load_model(self):
        if self._model is None:
            try:
                from simple_lama_inpainting import SimpleLama

                logger.info("Loading SimpleLama inpainting model...")
                self._model = SimpleLama(device=self.device)
            except Exception as e:
                logger.warning("SimpleLama not initialized (%s). Inpainting will use fallback.", e)
                self._model = "fallback"

    def inpaint(
        self,
        image_path: Path,
        union_mask: np.ndarray,
        output_path: Path,
        dilation_iterations: int = 4,
    ) -> Path:
        """
        Inpaints the regions covered by `union_mask` in `image_path`.
        
        Args:
            image_path: Path to original RGB room photo.
            union_mask: Binary mask (H, W) where True = furniture to erase.
            output_path: Where to save the resulting clean background PNG.
            dilation_iterations: Number of dilation passes to expand mask slightly.
            
        Returns:
            Path to saved inpainted background image.
        """
        self._load_model()
        output_path.parent.mkdir(parents=True, exist_ok=True)

        img_pil = Image.open(image_path).convert("RGB")

        # If no furniture detected, simply save copy of original
        if not np.any(union_mask):
            logger.info("Union mask is empty. Saving original image as background texture.")
            img_pil.save(output_path, "PNG")
            return output_path

        # Expand mask slightly with dilation so boundaries are fully erased
        mask_uint8 = (union_mask.astype(np.uint8) * 255)
        try:
            import cv2
            kernel = np.ones((5, 5), np.uint8)
            dilated_mask = cv2.dilate(mask_uint8, kernel, iterations=dilation_iterations)
        except ImportError:
            # Fallback dilation if opencv is not present
            dilated_mask = mask_uint8

        mask_pil = Image.fromarray(dilated_mask, mode="L")

        logger.info("Running LaMa inpainting to erase furniture...")
        if self._model is not None and self._model != "fallback":
            try:
                result_pil = self._model(img_pil, mask_pil)
            except Exception as e:
                logger.error("LaMa inpainting failed: %s, falling back to original", e)
                result_pil = img_pil
        else:
            logger.warning("SimpleLama unavailable, saving original image as background")
            result_pil = img_pil

        result_pil.save(output_path, "PNG")
        logger.info("Inpainted background texture saved -> %s", output_path.name)
        return output_path
