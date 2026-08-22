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

interface RoomStore {
  unit: MeasurementUnit;
  setUnit: (u: MeasurementUnit) => void;
  dimensions: RoomDimensions;
  setDimensions: (d: Partial<RoomDimensions>) => void;
  setDoor: (door: DoorConfig | undefined) => void;
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
  updateFurnitureItem: (id: string, updates: Partial<FurnitureItem>) => void;
  updateFurnitureTemplate: (id: string, templateId: string) => void;
  updateFurnitureMaterial: (id: string, updates: { colorTint?: string; materialPreset?: string }) => void;
  updateFurnitureDimensions: (id: string, dimensions: [number, number, number]) => void;
  setMeshSource: (id: string, source: 'template' | 'reconstruction') => void;
  reset: () => void;
}

const DEFAULT_DIMENSIONS: RoomDimensions = { 
  widthM: 4, 
  lengthM: 5, 
  heightM: 2.7,
  door: {
    wall: 'front',
    position: 0,
    widthM: 0.9,
    heightM: 2.1,
  },
};

export const useRoomStore = create<RoomStore>()(
  devtools(
    (set) => ({
      unit: 'metric',
      setUnit: (u) => set({ unit: u }),
      dimensions: DEFAULT_DIMENSIONS,
      setDimensions: (d) =>
        set((s) => ({
          dimensions: {
            ...s.dimensions,
            ...d,
            door: d.door !== undefined ? d.door : s.dimensions.door,
          },
        })),
      setDoor: (door) =>
        set((s) => ({
          dimensions: {
            ...s.dimensions,
            door: door || s.dimensions.door,
          },
        })),
      photos: [],
      setPhotos: (files) => set({ photos: files }),
      jobStatus: null,
      setJobStatus: (s) => set({ jobStatus: s }),
      detections: [],
      setDetections: (items) => set({ detections: items }),
      manifest: null,
      setManifest: (m) => set({ manifest: m }),
      selectedId: null,
      setSelectedId: (id) => set({ selectedId: id }),
      isDraggingGizmo: false,
      setIsDraggingGizmo: (val) => set({ isDraggingGizmo: val }),
      updateFurnitureItem: (id, updates) => set((s) => {
        if (!s.manifest) return s;
        return {
          manifest: {
            ...s.manifest,
            furniture: s.manifest.furniture.map((f) => f.id === id ? { ...f, ...updates } : f)
          }
        };
      }),
      updateFurnitureTemplate: (id, templateId) => set((s) => {
        if (!s.manifest) return s;
        return {
          manifest: {
            ...s.manifest,
            furniture: s.manifest.furniture.map((f) => f.id === id ? { ...f, templateId, meshSource: 'template' } : f)
          }
        };
      }),
      updateFurnitureMaterial: (id, updates) => set((s) => {
        if (!s.manifest) return s;
        return {
          manifest: {
            ...s.manifest,
            furniture: s.manifest.furniture.map((f) => f.id === id ? { ...f, ...updates } : f)
          }
        };
      }),
      updateFurnitureDimensions: (id, dimensions) => set((s) => {
        if (!s.manifest) return s;
        return {
          manifest: {
            ...s.manifest,
            furniture: s.manifest.furniture.map((f) => f.id === id ? { ...f, dimensions } : f)
          }
        };
      }),
      setMeshSource: (id, meshSource) => set((s) => {
        if (!s.manifest) return s;
        return {
          manifest: {
            ...s.manifest,
            furniture: s.manifest.furniture.map((f) => f.id === id ? { ...f, meshSource } : f)
          }
        };
      }),
      reset: () =>
        set({
          dimensions: DEFAULT_DIMENSIONS,
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
