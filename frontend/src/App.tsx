import { useRef } from 'react';
import { SceneCanvas } from './components/canvas/SceneCanvas';
import { DimensionPanel } from './components/ui/DimensionPanel';
import { PhotoDropzone } from './components/ui/PhotoDropzone';
import { StatusBar } from './components/ui/StatusBar';
import { Toolbar } from './components/ui/Toolbar';
import { FurnitureInspector } from './components/ui/FurnitureInspector';
import { useRoomStore } from './store/roomStore';
import { useSSE } from './hooks/useSSE';
import { Box } from 'lucide-react';

// Inline GitHub SVG — lucide-react does not ship brand icons
function GithubIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 0C5.37 0 0 5.373 0 12c0 5.303 3.438 9.8 8.205 11.387.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222 0 1.606-.015 2.898-.015 3.293 0 .322.216.694.825.576C20.565 21.795 24 17.298 24 12c0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const jobStatus = useRoomStore((s) => s.jobStatus);

  // Activate SSE stream when a job is queued
  useSSE(jobStatus?.jobId ?? null);

  return (
    <div className="app-root">
      {/* ── Header ─────────────────────────────────────── */}
      <header className="app-header">
        <div className="header-brand">
          <Box size={18} className="header-icon" />
          <span className="header-title font-bold">RENOVIX</span>
          <span className="header-beta">Beta</span>
        </div>
        <nav className="header-nav">
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className="nav-link"
            title="GitHub"
          >
            <GithubIcon size={16} />
          </a>
        </nav>
      </header>

      {/* ── Main Layout ────────────────────────────────── */}
      <main className="app-main">
        {/* Left sidebar */}
        <aside className="sidebar">
          <DimensionPanel />
          <PhotoDropzone />
          <StatusBar />
        </aside>

        {/* 3D viewport */}
        <section className="viewport-wrap" id="viewport">
          <Toolbar canvasRef={canvasRef} />
          <div className="canvas-container">
            <SceneCanvas canvasRef={canvasRef} />
          </div>

          {/* Floating Furniture Inspector Drawer */}
          <FurnitureInspector />

          {/* Viewport hints */}
          <div className="viewport-hints">
            <span>🖱 Drag to orbit</span>
            <span>⚙ Scroll to zoom</span>
            <span>⇧ + drag to pan</span>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
