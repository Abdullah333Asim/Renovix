import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type {
  RoomDimensions,
  JobStatus,
  SceneManifest,
  MeasurementUnit,
  DetectionReviewItem,
  FurnitureItem,
  DoorConfig,
} from '../types/room';
import { getTemplateById, CATALOG_ITEMS, MATERIAL_PRESETS } from '../catalog/furnitureCatalog';

interface RoomStore {
  unit: MeasurementUnit;
  setUnit: (u: MeasurementUnit) => void;
  dimensions: RoomDimensions;
  setDimensions: (d: Partial<RoomDimensions>) => void;
  setDoor: (door: Partial<DoorConfig> | undefined) => void;
  setCustomPolygon: (vertices: [number, number][]) => void;
  resetToRectangular: () => void;
  wallColor: string;
  floorColor: string;
  setWallColor: (color: string) => void;
  setFloorColor: (color: string) => void;
  cameraMode: '3d' | 'top_down' | 'walkthrough';
  setCameraMode: (mode: '3d' | 'top_down' | 'walkthrough') => void;
  photos: File[];
  setPhotos: (files: File[]) => void;
  jobStatus: JobStatus | null;
  setJobStatus: (s: JobStatus | null) => void;
  detections: DetectionReviewItem[];
  setDetections: (items: DetectionReviewItem[]) => void;
  manifest: SceneManifest | null;
  setManifest: (m: SceneManifest | null) => void;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  isDraggingGizmo: boolean;
  setIsDraggingGizmo: (val: boolean) => void;
  addFurnitureItem: (templateId: string, customPosition?: [number, number, number]) => void;
  removeFurnitureItem: (id: string) => void;
  updateFurnitureItem: (id: string, updates: Partial<FurnitureItem>) => void;
  clearScene: () => void;
  reset: () => void;
}

const DEFAULT_DIMENSIONS: RoomDimensions = {
  widthM: 4,
  lengthM: 5,
  heightM: 2.7,
  shapeType: 'rectangle',
  wallColor: '#e8e2d9',
  floorColor: '#c8bfb0',
  door: {
    wall: 'front',
    position: 0,
    widthM: 0.9,
    heightM: 2.1,
    swing: 'inward',
  },
};


export const useRoomStore = create<RoomStore>()(
  devtools(
    (set) => ({
      unit: 'metric',
      setUnit: (u) => set({ unit: u }),
      dimensions: DEFAULT_DIMENSIONS,
      wallColor: DEFAULT_DIMENSIONS.wallColor || '#e8e2d9',
      floorColor: DEFAULT_DIMENSIONS.floorColor || '#c8bfb0',
      cameraMode: '3d',
      setCameraMode: (mode) => set({ cameraMode: mode }),
      setDimensions: (d) =>
        set((s) => {
          const nextWallColor = d.wallColor ?? s.wallColor;
          const nextFloorColor = d.floorColor ?? s.floorColor;
          return {
            wallColor: nextWallColor,
            floorColor: nextFloorColor,
            dimensions: {
              ...s.dimensions,
              ...d,
              wallColor: nextWallColor,
              floorColor: nextFloorColor,
              door: d.door !== undefined ? d.door : s.dimensions.door,
            },
            manifest: s.manifest
              ? {
                  ...s.manifest,
                  roomDimensions: {
                    ...s.manifest.roomDimensions,
                    ...d,
                    wallColor: nextWallColor,
                    floorColor: nextFloorColor,
                  },
                }
              : s.manifest,
          };
        }),
      setDoor: (door) =>
        set((s) => ({
          dimensions: {
            ...s.dimensions,
            door: door
              ? {
                  ...(s.dimensions.door || {
                    wall: 'front',
                    position: 0,
                    widthM: 0.9,
                    heightM: 2.1,
                    swing: 'inward',
                  }),
                  ...door,
                }
              : undefined,
          },
        })),
      setCustomPolygon: (vertices) =>
        set((s) => {
          if (vertices.length < 3) return s;
          // Compute centroid
          const cx = vertices.reduce((a, v) => a + v[0], 0) / vertices.length;
          const cz = vertices.reduce((a, v) => a + v[1], 0) / vertices.length;
          // Shift so centroid is at [0, 0]
          const normalised: [number, number][] = vertices.map(([x, z]) => [x - cx, z - cz]);
          // Bounding box
          const xs = normalised.map(([x]) => x);
          const zs = normalised.map(([, z]) => z);
          const widthM = Math.max(...xs) - Math.min(...xs);
          const lengthM = Math.max(...zs) - Math.min(...zs);
          return {
            dimensions: {
              ...s.dimensions,
              shapeType: 'custom_polygon',
              polygonVertices: normalised,
              widthM: Math.max(widthM, 0.5),
              lengthM: Math.max(lengthM, 0.5),
            },
          };
        }),
      resetToRectangular: () =>
        set((s) => ({
          dimensions: {
            ...s.dimensions,
            shapeType: 'rectangle',
            polygonVertices: undefined,
          },
        })),
      setWallColor: (color) =>
        set((s) => ({
          wallColor: color,
          dimensions: { ...s.dimensions, wallColor: color },
          manifest: s.manifest
            ? {
                ...s.manifest,
                roomDimensions: { ...s.manifest.roomDimensions, wallColor: color },
              }
            : s.manifest,
        })),
      setFloorColor: (color) =>
        set((s) => ({
          floorColor: color,
          dimensions: { ...s.dimensions, floorColor: color },
          manifest: s.manifest
            ? {
                ...s.manifest,
                roomDimensions: { ...s.manifest.roomDimensions, floorColor: color },
              }
            : s.manifest,
        })),
      photos: [],
      setPhotos: (files) => set({ photos: files }),
      jobStatus: null,
      setJobStatus: (s) => set({ jobStatus: s }),
      detections: [],
      setDetections: (items) => set({ detections: items }),
      manifest: null,
      setManifest: (m) =>
        set((s) => {
          if (!m) return { manifest: null };
          const wc = m.roomDimensions.wallColor || s.wallColor;
          const fc = m.roomDimensions.floorColor || s.floorColor;
          return {
            manifest: m,
            wallColor: wc,
            floorColor: fc,
            dimensions: {
              ...s.dimensions,
              ...m.roomDimensions,
              wallColor: wc,
              floorColor: fc,
            },
          };
        }),
      selectedId: null,
      setSelectedId: (id) => set({ selectedId: id }),
      isDraggingGizmo: false,
      setIsDraggingGizmo: (val) => set({ isDraggingGizmo: val }),
      addFurnitureItem: (templateId, customPosition) => set((s) => {
        const template = getTemplateById(templateId) || CATALOG_ITEMS[0];
        const uniqueId = `item_custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        const defaultPreset = template.compatiblePresets?.[0] || 'Oak Wood';
        const defaultColor = MATERIAL_PRESETS[defaultPreset]?.color || '#C49E6C';

        const newItem: FurnitureItem = {
          id: uniqueId,
          label: template.category,
          glbUrl: '',
          dimensions: [...template.defaultDimensions],
          position: customPosition ? [customPosition[0], customPosition[1], customPosition[2]] : [0.0, 0.0, 0.0],
          rotationY: 0.0,
          templateId: template.id,
          colorTint: defaultColor,
          materialPreset: defaultPreset,
          meshSource: 'template',
        };

        const currentManifest = s.manifest || {
          jobId: 'custom_room',
          roomDimensions: s.dimensions,
          textures: {},
          furniture: [],
        };

        return {
          manifest: {
            ...currentManifest,
            furniture: [...currentManifest.furniture, newItem],
          },
          selectedId: uniqueId,
        };
      }),
      removeFurnitureItem: (id) => set((s) => {
        if (!s.manifest) return s;
        return {
          manifest: {
            ...s.manifest,
            furniture: s.manifest.furniture.filter((f) => f.id !== id),
          },
          selectedId: s.selectedId === id ? null : s.selectedId,
        };
      }),
      updateFurnitureItem: (id, updates) => set((s) => {
        if (!s.manifest) return s;
        return {
          manifest: {
            ...s.manifest,
            furniture: s.manifest.furniture.map((f) => f.id === id ? { ...f, ...updates } : f)
          }
        };
      }),
      clearScene: () =>
        set((s) => ({
          manifest: s.manifest
            ? {
                ...s.manifest,
                furniture: [],
              }
            : null,
          selectedId: null,
        })),
      reset: () =>
        set({
          dimensions: DEFAULT_DIMENSIONS,
          wallColor: DEFAULT_DIMENSIONS.wallColor || '#e8e2d9',
          floorColor: DEFAULT_DIMENSIONS.floorColor || '#c8bfb0',
          cameraMode: '3d',
          photos: [],
          jobStatus: null,
          detections: [],
          manifest: null,
          selectedId: null,
          isDraggingGizmo: false,
        }),
    }),
    { name: 'room-store' }
  )
);
