import { useState, useEffect } from 'react';
import { ToggleLeft, ToggleRight, PenTool, RotateCcw, Box as BoxIcon, Palette, DoorOpen } from 'lucide-react';
import { useRoomStore } from '../../store/roomStore';
import { FloorplanDrawerModal } from './FloorplanDrawerModal';
import type { DoorConfig } from '../../types/room';

const FT_TO_M = 0.3048;
const M_TO_FT = 1 / FT_TO_M;
const IN_TO_M = 0.0254;

function ftIn_to_m(ftStr: string, inStr: string): number {
  return (parseFloat(ftStr) || 0) * FT_TO_M + (parseFloat(inStr) || 0) * IN_TO_M;
}

// ─── Direct Numeric Input with Text Buffer ────────────────────────────────────
// Allows users to freely erase, backspace, and type decimals without premature resets

interface NumericInputProps {
  id?: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  decimals?: number;
  onChange: (val: number) => void;
  className?: string;
}

function NumericInput({
  id,
  value,
  min = 0,
  max = 100,
  decimals = 2,
  onChange,
  className = 'dim-input',
}: NumericInputProps) {
  const [text, setText] = useState<string>(value.toFixed(decimals));
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      setText(value.toFixed(decimals));
    }
  }, [value, decimals, isFocused]);

  const commit = () => {
    setIsFocused(false);
    const parsed = parseFloat(text);
    if (!isNaN(parsed)) {
      const clamped = Math.max(min, Math.min(max, parsed));
      onChange(Number(clamped.toFixed(decimals)));
      setText(clamped.toFixed(decimals));
    } else {
      setText(value.toFixed(decimals));
    }
  };

  return (
    <input
      id={id}
      type="text"
      inputMode="decimal"
      value={text}
      onFocus={() => setIsFocused(true)}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          (e.target as HTMLInputElement).blur();
        }
      }}
      className={className}
    />
  );
}

// ─── Imperial Input with Local Buffering ──────────────────────────────────────

function ImperialInput({
  valueM,
  min = 1,
  max = 30,
  onChange,
}: {
  valueM: number;
  min?: number;
  max?: number;
  onChange: (val: number) => void;
}) {
  const totalFt = valueM * M_TO_FT;
  const initFt = Math.floor(totalFt);
  const initIn = Math.round((totalFt - initFt) * 12);

  const [ftText, setFtText] = useState(String(initFt));
  const [inText, setInText] = useState(String(initIn));
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      const curFt = Math.floor(valueM * M_TO_FT);
      const curIn = Math.round((valueM * M_TO_FT - curFt) * 12);
      setFtText(String(curFt));
      setInText(String(curIn));
    }
  }, [valueM, isFocused]);

  const commit = () => {
    setIsFocused(false);
    const m = ftIn_to_m(ftText, inText);
    const clamped = Math.max(min, Math.min(max, m));
    onChange(Number(clamped.toFixed(2)));
    const cFt = Math.floor(clamped * M_TO_FT);
    const cIn = Math.round((clamped * M_TO_FT - cFt) * 12);
    setFtText(String(cFt));
    setInText(String(cIn));
  };

  return (
    <div className="dim-imperial-wrap">
      <div className="dim-input-wrap">
        <input
          type="text"
          inputMode="numeric"
          value={ftText}
          onFocus={() => setIsFocused(true)}
          onChange={(e) => setFtText(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          }}
          className="dim-input dim-input-imperial"
        />
        <span className="dim-unit">ft</span>
      </div>
      <div className="dim-input-wrap">
        <input
          type="text"
          inputMode="numeric"
          value={inText}
          onFocus={() => setIsFocused(true)}
          onChange={(e) => setInText(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          }}
          className="dim-input dim-input-imperial"
        />
        <span className="dim-unit">in</span>
      </div>
    </div>
  );
}

// ─── DimRow Component ────────────────────────────────────────────────────────

interface DimRowProps {
  label: string;
  axis: string;
  valueM: number;
  unit: 'metric' | 'imperial';
  onChange: (m: number) => void;
  min?: number;
  max?: number;
}

function DimRow({ label, axis, valueM, unit, onChange, min = 1, max = 30 }: DimRowProps) {
  if (unit === 'metric') {
    return (
      <div className="dim-row">
        <span className="dim-label">
          <span className="axis-badge">{axis}</span>
          {label}
        </span>
        <div className="dim-input-wrap">
          <NumericInput
            id={`dim-${label.toLowerCase()}-metric`}
            value={valueM}
            min={min}
            max={max}
            decimals={2}
            onChange={onChange}
          />
          <span className="dim-unit">m</span>
        </div>
      </div>
    );
  }

  return (
    <div className="dim-row">
      <span className="dim-label">
        <span className="axis-badge">{axis}</span>
        {label}
      </span>
      <ImperialInput valueM={valueM} min={min} max={max} onChange={onChange} />
    </div>
  );
}

// ─── Main DimensionPanel ─────────────────────────────────────────────────────

export function DimensionPanel() {
  const {
    dimensions,
    setDimensions,
    setDoor,
    unit,
    setUnit,
    resetToRectangular,
    wallColor: storeWallColor,
    floorColor: storeFloorColor,
    setWallColor,
    setFloorColor,
  } = useRoomStore();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const activeWallColor = storeWallColor || dimensions.wallColor || '#e8e2d9';
  const activeFloorColor = storeFloorColor || dimensions.floorColor || '#c8bfb0';

  const isMetric = unit === 'metric';
  const isCustom = dimensions.shapeType === 'custom_polygon';
  const polyVerts = dimensions.polygonVertices ?? [];

  // Active Door Config with fallback
  const door: DoorConfig = dimensions.door || {
    wall: 'front',
    position: 0,
    widthM: 0.9,
    heightM: 2.1,
    swing: 'inward',
    segmentIndex: 0,
  };

  // Safe offset calculation to prevent door from crossing room corners
  const wallSpan = isCustom
    ? (() => {
        if (polyVerts.length < 2) return dimensions.widthM;
        const segIdx = door.segmentIndex ?? 0;
        const p1 = polyVerts[segIdx % polyVerts.length];
        const p2 = polyVerts[(segIdx + 1) % polyVerts.length];
        return Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
      })()
    : door.wall === 'front' || door.wall === 'back'
    ? dimensions.widthM
    : dimensions.lengthM;

  const maxDoorOffset = Math.max(0, Number(((wallSpan / 2) - (door.widthM / 2) - 0.08).toFixed(2)));

  const handleDoorWallChange = (wall: 'front' | 'back' | 'left' | 'right') => {
    setDoor({ wall, position: 0 });
  };

  const handleDoorPolygonSegmentChange = (idx: number) => {
    setDoor({ segmentIndex: idx, position: 0 });
  };

  const handleDoorOffsetChange = (val: number) => {
    const clamped = Math.max(-maxDoorOffset, Math.min(maxDoorOffset, val));
    setDoor({ position: Number(clamped.toFixed(2)) });
  };

  const handleDoorSwingToggle = (swing: 'inward' | 'outward') => {
    setDoor({ swing });
  };

  return (
    <>
      <div className="panel" id="dimension-panel">
        {/* ── Header ── */}
        <div className="panel-header">
          <h2 className="panel-title">Room Shell</h2>
          <button
            id="unit-toggle"
            onClick={() => setUnit(isMetric ? 'imperial' : 'metric')}
            className="unit-toggle"
            title={`Switch to ${isMetric ? 'imperial' : 'metric'}`}
          >
            {isMetric ? (
              <ToggleLeft size={15} className="panel-icon" />
            ) : (
              <ToggleRight size={15} className="panel-icon" />
            )}
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              {isMetric ? 'Metric' : 'Imperial'}
            </span>
          </button>
        </div>

        {/* ── Segmented Shape Selector ── */}
        <div className="dim-shape-selector">
          <button
            type="button"
            className={`shape-select-btn ${!isCustom ? 'active' : ''}`}
            onClick={resetToRectangular}
          >
            <BoxIcon size={12} />
            <span>Standard Box</span>
          </button>
          <button
            type="button"
            className={`shape-select-btn ${isCustom ? 'active' : ''}`}
            onClick={() => setDrawerOpen(true)}
          >
            <PenTool size={12} />
            <span>Custom Outline</span>
          </button>
        </div>

        {/* ── Parameter Steppers ── */}
        {isCustom ? (
          <div className="custom-outline-info">
            <div className="custom-outline-row">
              <span className="custom-row-label">Polygon Vertices</span>
              <span className="custom-row-value">{polyVerts.length} pts</span>
            </div>
            <div className="custom-outline-row">
              <span className="custom-row-label">Bounding Area</span>
              <span className="custom-row-value">
                {dimensions.widthM.toFixed(1)} × {dimensions.lengthM.toFixed(1)} m
              </span>
            </div>

            <div className="dim-rows" style={{ marginTop: '8px' }}>
              <DimRow
                label="Height"
                axis="Y"
                valueM={dimensions.heightM}
                unit={unit}
                onChange={(m) => setDimensions({ heightM: m })}
                min={1.5}
                max={10}
              />
            </div>

            <div className="custom-outline-actions">
              <button type="button" className="btn-outline-action" onClick={() => setDrawerOpen(true)}>
                <PenTool size={12} /> Edit Polygon
              </button>
              <button type="button" className="btn-outline-action" onClick={resetToRectangular}>
                <RotateCcw size={12} /> Reset to Box
              </button>
            </div>
          </div>
        ) : (
          <div className="dim-rows">
            <DimRow
              label="Width"
              axis="X"
              valueM={dimensions.widthM}
              unit={unit}
              onChange={(m) => setDimensions({ widthM: m })}
            />
            <DimRow
              label="Length"
              axis="Z"
              valueM={dimensions.lengthM}
              unit={unit}
              onChange={(m) => setDimensions({ lengthM: m })}
            />
            <DimRow
              label="Height"
              axis="Y"
              valueM={dimensions.heightM}
              unit={unit}
              onChange={(m) => setDimensions({ heightM: m })}
              min={1.5}
              max={10}
            />
          </div>
        )}

        {/* ── Interactive Door & Entrance Controls ── */}
        <div className="door-control-section">
          <div className="section-subtitle">
            <DoorOpen size={12} className="text-zinc-500" />
            <span>Door & Entrance</span>
          </div>

          {/* Wall Segment Selection */}
          {!isCustom ? (
            <div className="door-wall-selector" role="group" aria-label="Door Wall">
              {(['front', 'back', 'left', 'right'] as const).map((w) => (
                <button
                  key={w}
                  type="button"
                  className={`door-wall-btn ${door.wall === w ? 'active' : ''}`}
                  onClick={() => handleDoorWallChange(w)}
                >
                  {w.charAt(0).toUpperCase() + w.slice(1)}
                </button>
              ))}
            </div>
          ) : (
            <div className="door-wall-selector" role="group" aria-label="Door Wall Segment">
              {polyVerts.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  className={`door-wall-btn ${(door.segmentIndex ?? 0) === i ? 'active' : ''}`}
                  onClick={() => handleDoorPolygonSegmentChange(i)}
                >
                  Wall {i + 1}
                </button>
              ))}
            </div>
          )}

          {/* Position Slider & Corner Snapping */}
          <div className="door-slider-wrap">
            <div className="door-slider-header">
              <span className="text-zinc-400">Position Offset</span>
              <div className="door-quick-actions">
                <button
                  type="button"
                  className="door-quick-btn"
                  onClick={() => handleDoorOffsetChange(-maxDoorOffset)}
                  title="Snap to left corner"
                >
                  Left Corner
                </button>
                <button
                  type="button"
                  className="door-quick-btn"
                  onClick={() => handleDoorOffsetChange(0)}
                  title="Center along wall"
                >
                  Center
                </button>
                <button
                  type="button"
                  className="door-quick-btn"
                  onClick={() => handleDoorOffsetChange(maxDoorOffset)}
                  title="Snap to right corner"
                >
                  Right Corner
                </button>
              </div>
            </div>

            <input
              type="range"
              min={-maxDoorOffset}
              max={maxDoorOffset}
              step={0.05}
              value={door.position}
              onChange={(e) => handleDoorOffsetChange(parseFloat(e.target.value))}
              className="door-range-input"
            />

            <div className="flex items-center justify-between text-[11px] text-zinc-500">
              <span>Left Corner (-{maxDoorOffset}m)</span>
              <div className="flex items-center gap-1">
                <NumericInput
                  value={door.position}
                  min={-maxDoorOffset}
                  max={maxDoorOffset}
                  decimals={2}
                  onChange={handleDoorOffsetChange}
                  className="dim-input !w-16 !text-center !py-0.5"
                />
                <span className="text-zinc-400 font-mono">m</span>
              </div>
              <span>Right Corner (+{maxDoorOffset}m)</span>
            </div>
          </div>

          {/* Swing Direction & Door Width */}
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <span className="text-[11px] text-zinc-400 block mb-1">Swing Direction</span>
              <div className="door-swing-selector">
                <button
                  type="button"
                  className={`door-swing-btn ${door.swing !== 'outward' ? 'active' : ''}`}
                  onClick={() => handleDoorSwingToggle('inward')}
                >
                  Inward
                </button>
                <button
                  type="button"
                  className={`door-swing-btn ${door.swing === 'outward' ? 'active' : ''}`}
                  onClick={() => handleDoorSwingToggle('outward')}
                >
                  Outward
                </button>
              </div>
            </div>

            <div className="w-24">
              <span className="text-[11px] text-zinc-400 block mb-1">Door Width</span>
              <div className="dim-input-wrap">
                <NumericInput
                  value={door.widthM}
                  min={0.6}
                  max={1.5}
                  decimals={2}
                  onChange={(w) => setDoor({ widthM: w })}
                />
                <span className="dim-unit">m</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Surface Colors (Wall & Floor Paint) ── */}
        <div className="paint-swatches-section">
          <div className="section-subtitle">
            <Palette size={12} className="text-zinc-500" />
            <span>Surface Paint</span>
          </div>

          <div className="swatch-row">
            <span className="swatch-label">Wall Paint</span>
            <div className="swatch-picker-group">
              <input
                type="color"
                value={activeWallColor}
                onChange={(e) => setWallColor(e.target.value)}
                title="Pick wall paint color"
                className="color-swatch-input"
              />
              <span className="color-hex-tag">{activeWallColor.toUpperCase()}</span>
            </div>
          </div>

          <div className="swatch-row">
            <span className="swatch-label">Flooring</span>
            <div className="swatch-picker-group">
              <input
                type="color"
                value={activeFloorColor}
                onChange={(e) => setFloorColor(e.target.value)}
                title="Pick floor color"
                className="color-swatch-input"
              />
              <span className="color-hex-tag">{activeFloorColor.toUpperCase()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2D Floorplan Drawer Modal */}
      {drawerOpen && <FloorplanDrawerModal onClose={() => setDrawerOpen(false)} />}
    </>
  );
}
