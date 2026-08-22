// ─── Shared TypeScript Interfaces ──────────────────────────────────────────────

export type MeasurementUnit = 'metric' | 'imperial';

export interface DoorConfig {
  wall: 'front' | 'back' | 'left' | 'right';
  position: number; // Center position / metric offset along the selected wall
  widthM: number;
  heightM: number;
}

export interface RoomDimensions {
  widthM: number;
  lengthM: number;
  heightM: number;
  door?: DoorConfig;
}

export interface FurnitureItem {
  id: string;
  label: string;
  glbUrl: string;
  dimensions: [number, number, number];
  position: [number, number, number];
  rotationY: number;
  dominantColor?: string;
  materialType?: string;
  templateId?: string;
  colorTint?: string;
  materialPreset?: string;
  meshSource?: 'template' | 'reconstruction';
}

export interface DetectionReviewItem {
  itemId: string;
  label: string;
  confidence: number;
  bboxNormalized: [number, number, number, number];
  previewUrl: string;
  dimensionsEstimated: [number, number, number];
  dominantColor?: string;
  materialType?: string;
}

export interface DetectionReviewPayload {
  jobId: string;
  photoCount: number;
  detectedCount: number;
  detections: DetectionReviewItem[];
}

export type JobStage =
  | 'idle'
  | 'queued'
  | 'segmenting'
  | 'inpainting'
  | 'generating_3d'
  | 'optimizing'
  | 'ready'
  | 'error';

export interface JobStatus {
  jobId: string;
  stage: JobStage;
  progress: number;
  message: string;
  error?: string;
  detections?: DetectionReviewItem[];
}

export interface SceneManifest {
  jobId: string;
  roomDimensions: RoomDimensions;
  textures: {
    floor?: string;
    walls?: string[];
  };
  furniture: FurnitureItem[];
}
