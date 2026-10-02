import { useState } from 'react';
import { 
  Loader2, 
  RotateCcw, 
  Camera, 
  Download, 
  Eye, 
  Layers, 
  Footprints,
  Sparkles,
  Trash2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { GLTFExporter } from 'three-stdlib';
import { useRoomStore } from '../../store/roomStore';
import { generateRoom } from '../../lib/api';
import { Logo } from './Logo';

interface ToolbarProps {
  canvasRef?: React.RefObject<HTMLCanvasElement | null>;
}

export function Toolbar({ canvasRef }: ToolbarProps) {
  const { 
    dimensions, 
    photos, 
    manifest, 
    jobStatus, 
    cameraMode, 
    setCameraMode, 
    clearScene,
    reset 
  } = useRoomStore();
  const setJobStatus = useRoomStore((s) => s.setJobStatus);
  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting] = useState(false);

  const isRunning = jobStatus !== null && !['idle', 'ready', 'error'].includes(jobStatus.stage);
  const canGenerate = photos.length >= 1 && !generating;

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      setJobStatus({ jobId: '', stage: 'queued', progress: 0, message: 'Submitting job…' });
      const { jobId } = await generateRoom(dimensions, photos);
      setJobStatus({ jobId, stage: 'queued', progress: 5, message: 'Job accepted, analyzing geometry…' });
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
    link.download = `renovix-render-${Date.now()}.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  };

  const handleExportGLTF = () => {
    const scene = (window as any).__renovix_three_scene;
    if (!scene) {
      alert('3D scene not ready for export yet.');
      return;
    }
    setExporting(true);
    const exporter = new GLTFExporter();
    exporter.parse(
      scene,
      (gltf) => {
        setExporting(false);
        const output = JSON.stringify(gltf, null, 2);
        const blob = new Blob([output], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `renovix-room-${manifest?.jobId || Date.now()}.gltf`;
        link.click();
        URL.revokeObjectURL(link.href);
      },
      (error) => {
        setExporting(false);
        console.error('[GLTFExporter] Failed:', error);
        alert('Failed to export 3D scene.');
      },
      { binary: false }
    );
  };

  return (
    <header className="top-command-bar" id="top-command-bar">
      {/* ── Left: Brand Badge ── */}
      <div className="brand-group">
        <Logo size={28} />
      </div>

      {/* ── Center: Viewport Mode Segmented Pill ── */}
      <div className="viewport-mode-pill" role="tablist" aria-label="Viewport Camera Modes">
        <button
          type="button"
          role="tab"
          aria-selected={cameraMode === '3d'}
          className={`mode-btn ${cameraMode === '3d' ? 'active' : ''}`}
          onClick={() => setCameraMode('3d')}
          title="3D Orbit Perspective Camera"
        >
          <Eye size={13} />
          <span>3D Orbit</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={cameraMode === 'top_down'}
          className={`mode-btn ${cameraMode === 'top_down' ? 'active' : ''}`}
          onClick={() => setCameraMode('top_down')}
          title="2D Top-Down Floorplan Perspective"
        >
          <Layers size={13} />
          <span>2D Top-Down</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={cameraMode === 'walkthrough'}
          className={`mode-btn ${cameraMode === 'walkthrough' ? 'active' : ''}`}
          onClick={() => setCameraMode('walkthrough')}
          title="First-Person Eye-Level Walkthrough"
        >
          <Footprints size={13} />
          <span>Walkthrough</span>
        </button>
      </div>

      {/* ── Right: Quick Action Controls & Status ── */}
      <div className="actions-group">
        {/* Status Pill */}
        {jobStatus && (
          <div className={`status-pill status-${jobStatus.stage}`}>
            {isRunning && <Loader2 size={12} className="animate-spin text-amber-400" />}
            {jobStatus.stage === 'ready' && <CheckCircle2 size={12} className="text-emerald-400" />}
            {jobStatus.stage === 'error' && <AlertCircle size={12} className="text-red-400" />}
            <span className="status-text">
              {isRunning ? `${jobStatus.progress}%` : jobStatus.stage === 'ready' ? 'Ready' : 'Error'}
            </span>
          </div>
        )}

        {/* Clear Scene */}
        <button
          type="button"
          className="cmd-btn cmd-btn-subtle"
          onClick={clearScene}
          disabled={!manifest || manifest.furniture.length === 0}
          title="Clear all furniture from the room"
        >
          <Trash2 size={14} />
          <span>Clear</span>
        </button>

        {/* Export GLTF */}
        <button
          type="button"
          className="cmd-btn cmd-btn-subtle"
          onClick={handleExportGLTF}
          disabled={exporting}
          title="Export room & furniture as a 3D GLTF model"
        >
          {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
          <span>Export GLTF</span>
        </button>

        {/* Take Snapshot */}
        <button
          type="button"
          className="cmd-btn cmd-btn-subtle"
          onClick={handleScreenshot}
          title="Take high-resolution canvas snapshot"
        >
          <Camera size={14} />
          <span>Snapshot</span>
        </button>

        {/* Reset All */}
        <button
          type="button"
          className="cmd-btn-icon text-red-400/80 hover:text-red-300 hover:bg-red-950/30"
          onClick={reset}
          title="Reset entire project and settings"
        >
          <RotateCcw size={14} />
        </button>

        <div className="cmd-divider" />

        {/* Primary Generate Scene Button */}
        <button
          type="button"
          id="btn-generate"
          className={`cmd-btn-primary ${!canGenerate || isRunning ? 'disabled' : ''}`}
          disabled={!canGenerate || isRunning}
          onClick={handleGenerate}
          title={photos.length === 0 ? 'Upload at least 1 room photo first' : isRunning ? 'Analyzing...' : 'Generate 3D room layout'}
        >
          {generating || isRunning ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Sparkles size={14} />
          )}
          <span>{isRunning ? 'Processing…' : 'Generate Scene'}</span>
        </button>
      </div>
    </header>
  );
}
