import { ChangeEvent } from 'react';
import { Ruler, ToggleLeft, ToggleRight } from 'lucide-react';
import { useRoomStore } from '../../store/roomStore';

const FT_TO_M = 0.3048;
const M_TO_FT = 1 / FT_TO_M;
const IN_TO_M = 0.0254;

function mToFtIn(m: number): string {
  const totalIn = m * M_TO_FT * 12;
  const ft = Math.floor(totalIn / 12);
  const inch = Math.round(totalIn % 12);
  return `${ft}' ${inch}"`;
}

function ftIn_to_m(ftStr: string, inStr: string): number {
  return (parseFloat(ftStr) || 0) * FT_TO_M + (parseFloat(inStr) || 0) * IN_TO_M;
}

interface DimRowProps {
  label: string; axis: string; valueM: number; unit: 'metric' | 'imperial';
  onChange: (m: number) => void; min?: number; max?: number;
}

function DimRow({ label, axis, valueM, unit, onChange, min = 1, max = 30 }: DimRowProps) {
  if (unit === 'metric') {
    return (
      <div className="dim-row">
        <span className="dim-label"><span className="axis-badge">{axis}</span>{label}</span>
        <div className="dim-input-wrap">
          <input id={`dim-${label.toLowerCase()}-metric`} type="number" min={min} max={max} step={0.1}
            value={valueM.toFixed(2)} onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(parseFloat(e.target.value) || min)}
            className="dim-input" />
          <span className="dim-unit">m</span>
        </div>
      </div>
    );
  }
  const ft = Math.floor(valueM * M_TO_FT);
  const inches = Math.round((valueM * M_TO_FT - ft) * 12);
  return (
    <div className="dim-row">
      <span className="dim-label"><span className="axis-badge">{axis}</span>{label}</span>
      <div className="dim-imperial-wrap">
        <div className="dim-input-wrap">
          <input id={`dim-${label.toLowerCase()}-ft`} type="number" min={0} max={99} step={1}
            value={ft} onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(ftIn_to_m(e.target.value, String(inches)))}
            className="dim-input dim-input-imperial" />
          <span className="dim-unit">ft</span>
        </div>
        <div className="dim-input-wrap">
          <input id={`dim-${label.toLowerCase()}-in`} type="number" min={0} max={11} step={1}
            value={inches} onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(ftIn_to_m(String(ft), e.target.value))}
            className="dim-input dim-input-imperial" />
          <span className="dim-unit">in</span>
        </div>
      </div>
    </div>
  );
}

export function DimensionPanel() {
  const { dimensions, setDimensions, unit, setUnit } = useRoomStore();
  const isMetric = unit === 'metric';
  const volume = dimensions.widthM * dimensions.lengthM * dimensions.heightM;
  return (
    <div className="panel">
      <div className="panel-header">
        <Ruler size={15} className="panel-icon" />
        <h2 className="panel-title">Room Dimensions</h2>
        <button id="unit-toggle" onClick={() => setUnit(isMetric ? 'imperial' : 'metric')} className="unit-toggle" title={`Switch to ${isMetric ? 'imperial' : 'metric'}`}>
          {isMetric ? <ToggleLeft size={17} className="panel-icon" /> : <ToggleRight size={17} className="panel-icon" />}
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{isMetric ? 'Metric' : 'Imperial'}</span>
        </button>
      </div>
      <div className="dim-rows">
        <DimRow label="Width" axis="X" valueM={dimensions.widthM} unit={unit} onChange={(m) => setDimensions({ widthM: m })} />
        <DimRow label="Length" axis="Z" valueM={dimensions.lengthM} unit={unit} onChange={(m) => setDimensions({ lengthM: m })} />
        <DimRow label="Height" axis="Y" valueM={dimensions.heightM} unit={unit} onChange={(m) => setDimensions({ heightM: m })} min={1.5} max={10} />
      </div>
      <div className="dim-rows mt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '12px' }}>
        <h3 style={{ fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '0.03em', marginBottom: '8px' }}>Door Config</h3>
        {dimensions.door && (
          <>
            <div className="dim-row" style={{ marginBottom: '8px' }}>
              <span className="dim-label">Wall</span>
              <select 
                value={dimensions.door.wall}
                onChange={(e) => setDimensions({ door: { ...dimensions.door!, wall: e.target.value as any } })}
              style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '12px', padding: '2px 6px', outline: 'none' }}
              >
                <option value="front">Front</option>
                <option value="back">Back</option>
                <option value="left">Left</option>
                <option value="right">Right</option>
              </select>
            </div>
            <DimRow 
              label="Offset" 
              axis="↔" 
              valueM={dimensions.door.position} 
              unit={unit} 
              onChange={(m) => setDimensions({ door: { ...dimensions.door!, position: m } })}
              min={-10} max={10} 
            />
          </>
        )}
      </div>
      <div className="panel-footer">
        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Volume</span>
        <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'JetBrains Mono, monospace' }}>
          {volume.toFixed(2)} m³
          {!isMetric && <span style={{ color: 'var(--text-muted)', marginLeft: '4px' }}>({(volume * 35.3147).toFixed(1)} ft³)</span>}
        </span>
      </div>
      {isMetric && (
        <div className="imperial-preview">
          {mToFtIn(dimensions.widthM)} × {mToFtIn(dimensions.lengthM)} × {mToFtIn(dimensions.heightM)}
        </div>
      )}
    </div>
  );
}
