import { useEffect, useRef } from 'react';
import { useRoomStore } from '../store/roomStore';
import type { DetectionReviewItem, DoorConfig, JobStatus, SceneManifest } from '../types/room';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

/**
 * Maps a raw snake_case SSE payload from FastAPI into the camelCase
 * JobStatus shape expected by the Zustand store.
 */
function parseStatusEvent(raw: Record<string, unknown>): JobStatus {
  return {
    jobId:    (raw.job_id   as string) ?? '',
    stage:    (raw.stage    as JobStatus['stage']),
    progress: (raw.progress as number) ?? 0,
    message:  (raw.message  as string) ?? '',
    error:    (raw.error    as string | undefined),
  };
}

/**
 * Maps a raw snake_case detection review payload into camelCase.
 */
function parseDetectionReview(raw: Record<string, unknown>): DetectionReviewItem[] {
  const detectionsRaw = (raw.detections as Record<string, unknown>[]) ?? [];
  return detectionsRaw.map((d) => ({
    itemId:             d.item_id as string,
    label:              d.label as string,
    confidence:         (d.confidence as number) ?? 0,
    bboxNormalized:     (d.bbox_normalized as [number, number, number, number]) ?? [0, 0, 1, 1],
    previewUrl:         d.preview_url as string,
    dimensionsEstimated:(d.dimensions_estimated as [number, number, number]) ?? [1, 1, 1],
  }));
}

/**
 * Normalizes and extracts DoorConfig from various backend payload shapes
 * (handling offset_m / position, width_m / width / widthM, height_m / height / heightM, wall).
 */
function parseDoor(rawDoor: unknown): DoorConfig | undefined {
  if (!rawDoor || typeof rawDoor !== 'object') return undefined;
  const d = rawDoor as Record<string, unknown>;
  const rawWall = String(d.wall || 'back').toLowerCase().trim();
  const validWalls: DoorConfig['wall'][] = ['front', 'back', 'left', 'right'];
  const wall: DoorConfig['wall'] = (validWalls as string[]).includes(rawWall)
    ? (rawWall as DoorConfig['wall'])
    : 'back';

  // Position / metric offset along the wall
  const position = typeof d.position === 'number'
    ? d.position
    : typeof d.offset_m === 'number'
      ? d.offset_m
      : typeof d.offset === 'number'
        ? d.offset
        : 0.0;

  // Door width
  const widthM = typeof d.widthM === 'number'
    ? d.widthM
    : typeof d.width_m === 'number'
      ? d.width_m
      : typeof d.width === 'number'
        ? d.width
        : 0.9;

  // Door height
  const heightM = typeof d.heightM === 'number'
    ? d.heightM
    : typeof d.height_m === 'number'
      ? d.height_m
      : typeof d.height === 'number'
        ? d.height
        : 2.1;

  return {
    wall,
    position: Number.isFinite(position) ? position : 0.0,
    widthM: Number.isFinite(widthM) && widthM > 0 ? widthM : 0.9,
    heightM: Number.isFinite(heightM) && heightM > 0 ? heightM : 2.1,
  };
}

/**
 * Maps a raw snake_case manifest payload from FastAPI into camelCase.
 */
function parseManifest(raw: Record<string, unknown>): SceneManifest {
  const dim = (raw.room_dimensions || {}) as Record<string, unknown>;
  const rawDoor = dim.door || raw.door;
  const door = parseDoor(rawDoor);
  const furnitureRaw = (raw.furniture as Record<string, unknown>[]) ?? [];

  return {
    jobId: (raw.job_id as string) || '',
    roomDimensions: {
      widthM:  typeof dim.width_m === 'number' ? dim.width_m : (typeof dim.widthM === 'number' ? dim.widthM : 4),
      lengthM: typeof dim.length_m === 'number' ? dim.length_m : (typeof dim.lengthM === 'number' ? dim.lengthM : 5),
      heightM: typeof dim.height_m === 'number' ? dim.height_m : (typeof dim.heightM === 'number' ? dim.heightM : 2.7),
      door:    door,
    },
    textures: (raw.textures as SceneManifest['textures']) ?? {},
    furniture: furnitureRaw.map((f) => ({
      id:             f.id             as string,
      label:          f.label          as string,
      glbUrl:         f.glb_url        as string,
      dimensions:     f.dimensions     as [number, number, number],
      position:       f.position       as [number, number, number],
      rotationY:      (f.rotation_y as number) ?? 0,
      dominantColor:  (f.dominant_color as string) ?? undefined,
      materialType:   (f.material_type as string) ?? undefined,
      templateId:     (f.template_id as string) ?? undefined,
      colorTint:      (f.color_tint as string) ?? (f.dominant_color as string) ?? undefined,
      materialPreset: (f.material_preset as string) ?? undefined,
      meshSource:     ((f.mesh_source as string) === 'reconstruction' ? 'reconstruction' : 'template') as 'template' | 'reconstruction',
    })),
  };
}

export function useSSE(jobId: string | null) {
  const setJobStatus   = useRoomStore((s) => s.setJobStatus);
  const setDetections  = useRoomStore((s) => s.setDetections);
  const setManifest    = useRoomStore((s) => s.setManifest);
  const esRef          = useRef<EventSource | null>(null);

  useEffect(() => {
    // Empty string is falsy — only open a connection for a real UUID
    if (!jobId) return;

    const url = `${API_BASE}/api/v1/rooms/${jobId}/stream`;
    console.log('[SSE] Connecting to', url);

    const es = new EventSource(url);
    esRef.current = es;

    // ── Regular progress events ─────────────────────────────────────────
    es.onmessage = (e: MessageEvent) => {
      try {
        const raw = JSON.parse(e.data) as Record<string, unknown>;

        // Skip the initial connection-acknowledged ping
        if ('connected' in raw) {
          console.log('[SSE] Connected');
          return;
        }

        const status = parseStatusEvent(raw);
        console.log('[SSE] Progress:', status.stage, status.progress + '%');
        setJobStatus(status);

        if (status.stage === 'error') {
          console.error('[SSE] Pipeline error:', status.error);
          es.close();
        }
      } catch (err) {
        console.warn('[SSE] Failed to parse message:', e.data, err);
      }
    };

    // ── Detection review event ──────────────────────────────────────────
    es.addEventListener('detections_reviewed', (e: MessageEvent) => {
      try {
        const raw = JSON.parse(e.data) as Record<string, unknown>;
        const items = parseDetectionReview(raw);
        console.log('[SSE] Detections reviewed event received:', items.length, 'candidates');
        setDetections(items);
      } catch (err) {
        console.error('[SSE] Failed to parse detections_reviewed:', err);
      }
    });

    // ── Final manifest event ────────────────────────────────────────────
    es.addEventListener('manifest', (e: MessageEvent) => {
      try {
        const raw = JSON.parse(e.data) as Record<string, unknown>;
        const manifest = parseManifest(raw);
        console.log('[SSE] Manifest received:', manifest.furniture.length, 'items', 'door:', manifest.roomDimensions.door);
        setManifest(manifest);
        // Auto-populate dimensions (including door) in store
        useRoomStore.getState().setDimensions(manifest.roomDimensions);
        if (manifest.roomDimensions.door) {
          useRoomStore.getState().setDoor(manifest.roomDimensions.door);
        }
        setJobStatus({ jobId, stage: 'ready', progress: 100, message: 'Scene ready!' });
        es.close();
      } catch (err) {
        console.error('[SSE] Failed to parse manifest:', err);
      }
    });

    // ── Error handling ──────────────────────────────────────────────────
    es.onerror = (e) => {
      console.warn('[SSE] Connection error (browser will retry):', e);
      if (es.readyState === EventSource.CLOSED) {
        console.error('[SSE] Connection permanently closed by browser.');
        esRef.current = null;
      }
    };

    return () => {
      console.log('[SSE] Cleaning up EventSource for job', jobId);
      es.close();
      esRef.current = null;
    };
  }, [jobId, setJobStatus, setDetections, setManifest]);
}
