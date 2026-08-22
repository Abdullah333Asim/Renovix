import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { useRoomStore } from '../../store/roomStore';

const MAX_FILES = 4;
const ACCEPTED = { 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] };

export function PhotoDropzone() {
  const { photos, setPhotos } = useRoomStore();
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((accepted: File[]) => {
    setError(null);
    setPhotos([...photos, ...accepted].slice(0, MAX_FILES));
  }, [photos, setPhotos]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: ACCEPTED,
    maxFiles: MAX_FILES - photos.length,
    maxSize: 20 * 1024 * 1024,
    disabled: photos.length >= MAX_FILES,
    onDropRejected: (r) => setError(r[0]?.errors[0]?.message ?? 'Invalid file'),
  });

  return (
    <div className="panel">
      <div className="panel-header">
        <ImageIcon size={15} className="panel-icon" />
        <h2 className="panel-title">Room Photos</h2>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>{photos.length} / {MAX_FILES}</span>
      </div>
      {photos.length < MAX_FILES && (
        <div {...getRootProps()} id="photo-dropzone" className={`dropzone ${isDragActive ? 'dropzone-active' : ''}`}>
          <input {...getInputProps()} id="photo-input" />
          <Upload size={20} style={{ marginBottom: '6px', color: isDragActive ? 'var(--accent)' : 'var(--text-muted)', transition: 'color 0.15s' }} />
          {isDragActive ? (
            <p style={{ fontSize: '13px', color: 'var(--accent)' }}>Drop photos here…</p>
          ) : (
            <>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Drag & drop or <span style={{ color: 'var(--accent)', cursor: 'pointer' }}>browse</span></p>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px' }}>JPG, PNG, WebP · up to {MAX_FILES} photos · 20 MB each</p>
            </>
          )}
        </div>
      )}
      {error && <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'hsl(0,70%,68%)', fontSize: '11px', marginTop: '6px' }}><AlertCircle size={11} /><span>{error}</span></div>}
      {photos.length > 0 && (
        <div className="photo-grid">
          {photos.map((file, idx) => {
            const url = URL.createObjectURL(file);
            return (
              <div key={idx} className="photo-thumb-wrap">
                <img src={url} alt={`Room photo ${idx + 1}`} className="photo-thumb" onLoad={() => URL.revokeObjectURL(url)} />
                <button id={`remove-photo-${idx}`} className="photo-remove" onClick={() => setPhotos(photos.filter((_, i) => i !== idx))} title="Remove"><X size={10} /></button>
                <div className="photo-badge">{idx + 1}</div>
              </div>
            );
          })}
        </div>
      )}
      {photos.length === MAX_FILES && <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px', textAlign: 'center' }}>Maximum photos reached.</p>}
    </div>
  );
}
