import { useRef } from 'react';
import { SceneCanvas } from './components/canvas/SceneCanvas';
import { DimensionPanel } from './components/ui/DimensionPanel';
import { PhotoDropzone } from './components/ui/PhotoDropzone';
import { StatusBar } from './components/ui/StatusBar';
import { Toolbar } from './components/ui/Toolbar';
import { FurnitureInspector } from './components/ui/FurnitureInspector';
import { FurnitureCatalogSidebar } from './components/ui/FurnitureCatalogSidebar';
import { useRoomStore } from './store/roomStore';
import { useSSE } from './hooks/useSSE';

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const jobStatus = useRoomStore((s) => s.jobStatus);

  // Activate SSE stream when a job is queued
  useSSE(jobStatus?.jobId ?? null);

  return (
    <div className="app-root">
      {/* ── Top Command Bar Header ── */}
      <Toolbar canvasRef={canvasRef} />

      {/* ── Main Workspace Layout ── */}
      <main className="app-main">
        {/* Left Control Sidebar */}
        <aside className="sidebar">
          <DimensionPanel />
          <PhotoDropzone />
          <StatusBar />
        </aside>

        {/* 3D Viewport Canvas */}
        <section className="viewport-wrap" id="viewport">
          <div className="canvas-container">
            <SceneCanvas canvasRef={canvasRef} />
          </div>

          {/* Floating Furniture Inspector Drawer */}
          <FurnitureInspector />

          {/* Viewport Hints */}
          <div className="viewport-hints">
            <span>Orbit: Drag</span>
            <span>·</span>
            <span>Zoom: Scroll</span>
            <span>·</span>
            <span>Pan: Shift + Drag</span>
          </div>
        </section>

        {/* Right-Docked Collapsible Catalog Drawer */}
        <FurnitureCatalogSidebar />
      </main>
    </div>
  );
}

export default App;
