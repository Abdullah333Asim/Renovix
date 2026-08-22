import { useState } from 'react';
import { Wand2, Loader2, RotateCcw, Camera, Save, FolderOpen } from 'lucide-react';
import { useRoomStore } from '../../store/roomStore';
import { generateRoom } from '../../lib/api';

interface ToolbarProps { canvasRef?: React.RefObject<HTMLCanvasElement>; }

export function Toolbar({ canvasRef }: ToolbarProps) {
  const { dimensions, photos, reset, manifest, jobStatus } = useRoomStore();
  const setJobStatus = useRoomStore((s) => s.setJobStatus);
  const [generating, setGenerating] = useState(false);

  const isRunning = jobStatus !== null && !['idle', 'ready', 'error'].includes(jobStatus.stage);

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      setJobStatus({ jobId: '', stage: 'queued', progress: 0, message: 'Submitting job…' });
      const { jobId } = await generateRoom(dimensions, photos);
      // Inject real jobId so useSSE opens the stream
      setJobStatus({ jobId, stage: 'queued', progress: 5, message: 'Job accepted, opening stream…' });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setJobStatus({ jobId: '', stage: 'error', progress: 0, message: 'Failed to submit', error: message });
    } finally {
      setGenerating(false);
    }
  };

  const handleScreenshot = () => {
    if (!canvasRef?.current) return;
    const link = document.createElement('a');
    link.download = `room-layout-${Date.now()}.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  };

  const handleSave = () => {
    if (!manifest) return;
    const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.download = `room-layout-${manifest.jobId}.json`;
    link.href = URL.createObjectURL(blob);
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handleLoad = () => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const loaded = JSON.parse(await file.text());
        useRoomStore.getState().setManifest(loaded);
        useRoomStore.getState().setDimensions(loaded.roomDimensions);
      } catch { alert('Invalid layout file.'); }
    };
    input.click();
  };

  const canGenerate = photos.length >= 1 && !generating;

  return (
    <div className="toolbar" id="toolbar">
      <button id="btn-generate"
        className={`btn-primary ${!canGenerate || isRunning ? 'opacity-50 cursor-not-allowed' : ''}`}
        disabled={!canGenerate || isRunning} onClick={handleGenerate}
        title={photos.length === 0 ? 'Add at least 1 room photo first' : isRunning ? 'Processing…' : 'Generate 3D scene'}>
        {generating || isRunning ? <Loader2 size={15} className="animate-spin" /> : <Wand2 size={15} />}
        {isRunning ? 'Processing…' : 'Generate Scene'}
      </button>
      <div className="toolbar-divider" />
      <button id="btn-screenshot" className="btn-icon" onClick={handleScreenshot} title="Screenshot" disabled={!manifest}><Camera size={15} /></button>
      <button id="btn-save" className="btn-icon" onClick={handleSave} title="Save layout" disabled={!manifest}><Save size={15} /></button>
      <button id="btn-load" className="btn-icon" onClick={handleLoad} title="Load layout"><FolderOpen size={15} /></button>
      <div className="toolbar-divider" />
      <button id="btn-reset" className="btn-icon text-red-400/70 hover:text-red-400" onClick={reset} title="Reset scene"><RotateCcw size={15} /></button>
    </div>
  );
}
