import type { RoomDimensions } from '../types/room';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

export interface GenerateJobResponse {
  jobId: string;
  status: string;
  streamUrl: string;
}

export async function generateRoom(
  dimensions: RoomDimensions,
  photos: File[]
): Promise<GenerateJobResponse> {
  const form = new FormData();
  form.append('width_m', String(dimensions.widthM));
  form.append('length_m', String(dimensions.lengthM));
  form.append('height_m', String(dimensions.heightM));
  photos.forEach((f) => form.append('images', f));

  const res = await fetch(`${API_BASE}/api/v1/rooms/generate`, {
    method: 'POST',
    body: form,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Generate failed (${res.status}): ${err}`);
  }

  const raw = await res.json();
  return {
    jobId: raw.job_id,
    status: raw.status,
    streamUrl: raw.stream_url,
  };
}
