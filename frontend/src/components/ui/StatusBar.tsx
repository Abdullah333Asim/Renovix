import { Loader2, CheckCircle2, AlertCircle, Clock, ScanSearch, Paintbrush, Box, Cpu, Zap, Check } from 'lucide-react';
import { useRoomStore } from '../../store/roomStore';
import type { JobStage } from '../../types/room';

const STAGE_COLORS: Record<JobStage, string> = {
  idle:          'var(--text-muted)',
  queued:        'hsl(42, 80%, 60%)',
  segmenting:    'hsl(200, 70%, 60%)',
  inpainting:    'hsl(260, 60%, 68%)',
  generating_3d: 'var(--accent)',
  optimizing:    'hsl(180, 55%, 55%)',
  ready:         'hsl(145, 55%, 55%)',
  error:         'hsl(0, 65%, 62%)',
};

const STAGES: Record<JobStage, { icon: React.ReactNode; label: string }> = {
  idle:          { icon: <Zap size={13} />,          label: 'Awaiting upload' },
  queued:        { icon: <Clock size={13} />,         label: 'Queued' },
  segmenting:    { icon: <ScanSearch size={13} />,    label: 'Detecting furniture…' },
  inpainting:    { icon: <Paintbrush size={13} />,    label: 'Inpainting surfaces…' },
  generating_3d: { icon: <Box size={13} />,           label: 'Generating 3D meshes…' },
  optimizing:    { icon: <Cpu size={13} />,           label: 'Optimising layout…' },
  ready:         { icon: <CheckCircle2 size={13} />,  label: 'Scene ready' },
  error:         { icon: <AlertCircle size={13} />,   label: 'Error' },
};

const STAGE_ORDER: JobStage[] = ['queued', 'segmenting', 'inpainting', 'generating_3d', 'optimizing', 'ready'];

export function StatusBar() {
  const jobStatus = useRoomStore((s) => s.jobStatus);
  const detections = useRoomStore((s) => s.detections);
  if (!jobStatus || jobStatus.stage === 'idle') return null;

  const cfg    = STAGES[jobStatus.stage];
  const color  = STAGE_COLORS[jobStatus.stage];
  const isLoading = !['ready', 'error', 'idle'].includes(jobStatus.stage);
  const isError   = jobStatus.stage === 'error';
  const currentIdx = STAGE_ORDER.indexOf(jobStatus.stage);

  return (
    <div className="status-bar" id="status-bar">
      {/* Stage label + progress % */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 500, color }}>
          {isLoading ? <Loader2 size={13} className="animate-spin" /> : cfg.icon}
          {cfg.label}
        </span>
        <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
          {jobStatus.progress}%
        </span>
      </div>

      {/* Progress bar */}
      <div className="progress-track">
        <div
          className="progress-fill"
          style={{
            width: `${jobStatus.progress}%`,
            background: isError ? 'hsl(0, 65%, 50%)' : 'var(--accent)',
          }}
        />
      </div>

      {/* Stage breadcrumb dots */}
      {!isError && (
        <div className="stage-crumbs">
          {STAGE_ORDER.map((stage, i) => {
            const done   = i < currentIdx;
            const active = i === currentIdx;
            return (
              <div key={stage} className="crumb-item">
                <div
                  className="crumb-dot"
                  style={{
                    background: done || active ? 'var(--accent)' : 'var(--bg-hover)',
                    opacity: active ? 1 : done ? 0.7 : 0.4,
                  }}
                />
                {i < STAGE_ORDER.length - 1 && (
                  <div
                    className="crumb-line"
                    style={{ background: done ? 'var(--accent)' : 'var(--border)' }}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {isError && jobStatus.error && (
        <p style={{ fontSize: '11px', color: 'hsl(0,65%,62%)', marginTop: '6px' }}>{jobStatus.error}</p>
      )}
      {jobStatus.message && !isError && (
        <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{jobStatus.message}</p>
      )}

      {/* Detection badges */}
      {detections && detections.length > 0 && (
        <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-muted)', letterSpacing: '0.03em' }}>
              Detected ({detections.length})
            </span>
            <span style={{ fontSize: '10px', color: 'hsl(145, 55%, 55%)', display: 'flex', alignItems: 'center', gap: '3px' }}>
              <Check size={10} /> NMS cleaned
            </span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', maxHeight: '90px', overflowY: 'auto', paddingRight: '2px' }}>
            {detections.map((item) => (
              <div
                key={item.itemId}
                style={{
                  display: 'flex', alignItems: 'center', gap: '5px',
                  padding: '3px 7px', borderRadius: '4px',
                  background: 'var(--bg-input)', border: '1px solid var(--border)',
                  fontSize: '11px', color: 'var(--text-secondary)',
                }}
              >
                <img
                  src={item.previewUrl}
                  alt={item.label}
                  style={{ width: '14px', height: '14px', objectFit: 'contain', borderRadius: '2px', background: 'rgba(0,0,0,0.4)' }}
                  onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                />
                <span style={{ textTransform: 'capitalize', fontWeight: 500 }}>{item.label}</span>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
                  {Math.round(item.confidence * 100)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
