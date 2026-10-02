import { useState, useRef, useCallback, useEffect } from 'react';
import { X, Undo2, Trash2, Check, DoorOpen } from 'lucide-react';
import { useRoomStore } from '../../store/roomStore';
import { polygonArea } from '../../utils/geometry';

// ─── Constants ───────────────────────────────────────────────────────────────
const PX_PER_M = 80;            // pixels per metre at default zoom
const GRID_M   = 0.25;          // grid snap resolution (metres)
const CLOSE_THRESHOLD_M = 0.45; // metres to snap-close polygon

// ─── Math helpers ─────────────────────────────────────────────────────────────

function snapToGrid(val: number, grid: number): number {
  return Math.round(val / grid) * grid;
}

function dist2(a: [number, number], b: [number, number]): number {
  return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2);
}

function angleTo(from: [number, number], to: [number, number]): number {
  return Math.atan2(to[1] - from[1], to[0] - from[0]);
}

function snapAngle(from: [number, number], rawTo: [number, number]): [number, number] {
  const angle = angleTo(from, rawTo);
  const snapped = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
  const d = dist2(from, rawTo);
  return [from[0] + Math.cos(snapped) * d, from[1] + Math.sin(snapped) * d];
}

interface FloorplanDrawerModalProps {
  onClose: () => void;
}

export function FloorplanDrawerModal({ onClose }: FloorplanDrawerModalProps) {
  const { dimensions, setCustomPolygon, setDoor } = useRoomStore();

  // Drawing state (metres, pre-normalisation)
  const [vertices, setVertices]     = useState<[number, number][]>([]);
  const [isClosed, setIsClosed]     = useState(false);
  const [cursor, setCursor]         = useState<[number, number]>([0, 0]);
  const [shiftHeld, setShiftHeld]   = useState(false);
  const [wallHeight, setWallHeight] = useState(dimensions.heightM || 2.7);

  // Door configuration state
  const [doorSegment, setDoorSegment]   = useState<number>(dimensions.door?.segmentIndex ?? 0);
  const [doorPosition, setDoorPosition] = useState<number>(dimensions.door?.position ?? 0);
  const [doorSwing, setDoorSwing]       = useState<'inward' | 'outward'>(dimensions.door?.swing ?? 'inward');
  const doorWidth = dimensions.door?.widthM ?? 0.9;

  // Pan state
  const [pan, setPan]       = useState<[number, number]>([380, 290]);
  const panRef              = useRef<[number, number]>(pan);
  const draggingPan         = useRef(false);
  const lastMouse           = useRef<[number, number]>([0, 0]);

  // RAF references for 60fps decoupled mouse movement
  const cursorRaf     = useRef<number | null>(null);
  const panRaf        = useRef<number | null>(null);
  const pendingCursor = useRef<[number, number] | null>(null);
  const pendingPan    = useRef<[number, number] | null>(null);

  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    panRef.current = pan;
  }, [pan]);

  useEffect(() => {
    return () => {
      if (cursorRaf.current) cancelAnimationFrame(cursorRaf.current);
      if (panRaf.current) cancelAnimationFrame(panRaf.current);
    };
  }, []);

  // Load existing polygon vertices if available on mount
  useEffect(() => {
    if (
      dimensions.shapeType === 'custom_polygon' &&
      dimensions.polygonVertices &&
      dimensions.polygonVertices.length >= 3
    ) {
      const minX = Math.min(...dimensions.polygonVertices.map((v) => v[0]));
      const minZ = Math.min(...dimensions.polygonVertices.map((v) => v[1]));
      const shifted = dimensions.polygonVertices.map(
        ([x, z]) => [x - minX + 1, z - minZ + 1] as [number, number]
      );
      setVertices(shifted);
      setIsClosed(true);
      if (dimensions.door?.segmentIndex !== undefined) {
        setDoorSegment(dimensions.door.segmentIndex);
      }
      if (dimensions.door?.position !== undefined) {
        setDoorPosition(dimensions.door.position);
      }
      if (dimensions.door?.swing) {
        setDoorSwing(dimensions.door.swing);
      }
    }
  }, []);

  // Keyboard listeners
  useEffect(() => {
    const dn = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setShiftHeld(true);
      if (e.key === 'Escape') onClose();
      if ((e.key === 'z' || e.key === 'Z') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        undoPoint();
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setShiftHeld(false);
    };
    window.addEventListener('keydown', dn);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', dn);
      window.removeEventListener('keyup', up);
    };
  }, [onClose]);

  // Convert SVG pixel coords → metre coords
  const pxToM = useCallback((px: number, py: number): [number, number] => {
    const [panX, panY] = panRef.current;
    return [(px - panX) / PX_PER_M, (py - panY) / PX_PER_M];
  }, []);

  // Convert metre coords → SVG pixel coords
  const mToPx = (mx: number, my: number): [number, number] => {
    return [mx * PX_PER_M + pan[0], my * PX_PER_M + pan[1]];
  };

  const getSVGCoords = (e: React.MouseEvent<SVGSVGElement>): [number, number] => {
    const rect = svgRef.current!.getBoundingClientRect();
    return [e.clientX - rect.left, e.clientY - rect.top];
  };

  const getSnappedCursor = (rawM: [number, number]): [number, number] => {
    let [mx, my] = rawM;
    mx = snapToGrid(mx, GRID_M);
    my = snapToGrid(my, GRID_M);
    if (shiftHeld && vertices.length > 0 && !isClosed) {
      return snapAngle(vertices[vertices.length - 1], [mx, my]) as [number, number];
    }
    return [mx, my];
  };

  // 60FPS RAF-throttled mouse movement
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (draggingPan.current) {
      const dx = e.clientX - lastMouse.current[0];
      const dy = e.clientY - lastMouse.current[1];
      lastMouse.current = [e.clientX, e.clientY];
      pendingPan.current = [panRef.current[0] + dx, panRef.current[1] + dy];
      panRef.current = pendingPan.current;

      if (!panRaf.current) {
        panRaf.current = requestAnimationFrame(() => {
          if (pendingPan.current) {
            setPan(pendingPan.current);
          }
          panRaf.current = null;
        });
      }
      return;
    }

    if (!isClosed) {
      const [px, py] = getSVGCoords(e);
      const rawM = pxToM(px, py);
      pendingCursor.current = getSnappedCursor(rawM);

      if (!cursorRaf.current) {
        cursorRaf.current = requestAnimationFrame(() => {
          if (pendingCursor.current) {
            setCursor(pendingCursor.current);
          }
          cursorRaf.current = null;
        });
      }
    }
  };

  // Pan controls
  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button === 1 || e.button === 2 || e.altKey) {
      draggingPan.current = true;
      lastMouse.current = [e.clientX, e.clientY];
      e.preventDefault();
    }
  };

  const handleMouseUp = (e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button === 1 || e.button === 2 || e.altKey) {
      draggingPan.current = false;
    }
  };

  // Click to place vertex
  const handleCanvasClick = () => {
    if (isClosed) return;
    const pt = cursor;

    // Snap-close if clicked near start vertex
    if (vertices.length >= 3 && dist2(pt, vertices[0]) < CLOSE_THRESHOLD_M) {
      setIsClosed(true);
      return;
    }
    setVertices((prev) => [...prev, pt]);
  };

  // Undo point
  const undoPoint = () => {
    if (isClosed) {
      setIsClosed(false);
      return;
    }
    setVertices((prev) => prev.slice(0, -1));
  };

  // Clear canvas
  const clearCanvas = () => {
    setVertices([]);
    setIsClosed(false);
  };

  // Wall Segment click to place Door
  const handleSegmentClick = (e: React.MouseEvent, segIdx: number) => {
    e.stopPropagation();
    setDoorSegment(segIdx);
    const [px, py] = getSVGCoords(e as any);
    const clickM = pxToM(px, py);
    const p1 = vertices[segIdx];
    const p2 = vertices[(segIdx + 1) % vertices.length];
    const dx = p2[0] - p1[0];
    const dy = p2[1] - p1[1];
    const segLen = Math.hypot(dx, dy);

    if (segLen > 0.2) {
      const t = ((clickM[0] - p1[0]) * dx + (clickM[1] - p1[1]) * dy) / (segLen * segLen);
      const clampedT = Math.max(0.15, Math.min(0.85, t));
      const offset = (clampedT - 0.5) * segLen;
      setDoorPosition(Number(offset.toFixed(2)));
    }
  };

  // Apply / Generate Room
  const handleGenerateRoom = () => {
    if (vertices.length < 3) return;

    let pts = vertices;
    // Centering & Normalization: calculate centroid [cx, cz]
    const cx = pts.reduce((sum, v) => sum + v[0], 0) / pts.length;
    const cz = pts.reduce((sum, v) => sum + v[1], 0) / pts.length;
    const normalised: [number, number][] = pts.map(([x, z]) => [
      Number((x - cx).toFixed(3)),
      Number((z - cz).toFixed(3)),
    ]);

    setCustomPolygon(normalised);
    useRoomStore.getState().setDimensions({
      heightM: Math.max(1.5, Math.min(10, wallHeight)),
    });

    setDoor({
      wall: 'front',
      segmentIndex: doorSegment % vertices.length,
      position: doorPosition,
      swing: doorSwing,
      widthM: doorWidth,
      heightM: Math.min(2.1, wallHeight * 0.9),
    });

    onClose();
  };

  const area = isClosed && vertices.length >= 3 ? polygonArea(vertices) : 0;
  const pxVerts = vertices.map(([mx, my]) => mToPx(mx, my));
  const cursorPx = mToPx(cursor[0], cursor[1]);

  const polyPoints = pxVerts.map(([x, y]) => `${x},${y}`).join(' ');
  const previewLine =
    vertices.length > 0 && !isClosed
      ? `M${pxVerts[pxVerts.length - 1][0]},${pxVerts[pxVerts.length - 1][1]} L${cursorPx[0]},${cursorPx[1]}`
      : '';

  const closingHint =
    isClosed && vertices.length > 0
      ? `M${pxVerts[pxVerts.length - 1][0]},${pxVerts[pxVerts.length - 1][1]} L${pxVerts[0][0]},${pxVerts[0][1]}`
      : '';

  const gridPx = GRID_M * PX_PER_M;
  const majorGridPx = 1.0 * PX_PER_M;

  // Max safe door offset along active wall segment
  const activeSegLen = isClosed && vertices.length >= 3
    ? (() => {
        const p1 = vertices[doorSegment % vertices.length];
        const p2 = vertices[(doorSegment + 1) % vertices.length];
        return Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
      })()
    : 3;
  const maxSegOffset = Math.max(0, Number(((activeSegLen / 2) - (doorWidth / 2) - 0.08).toFixed(2)));

  // Render Architectural CAD Door Symbol along the selected segment
  const renderCADDoorSymbol = () => {
    if (!isClosed || vertices.length < 3) return null;
    const n = vertices.length;
    const sIdx = doorSegment % n;
    const p1 = vertices[sIdx];
    const p2 = vertices[(sIdx + 1) % n];
    const dx = p2[0] - p1[0];
    const dy = p2[1] - p1[1];
    const segLen = Math.hypot(dx, dy);
    if (segLen < 0.2) return null;

    const ux = dx / segLen;
    const uy = dy / segLen;
    const nx = -uy; // Inward normal
    const ny = ux;

    const clampedOffset = Math.max(-maxSegOffset, Math.min(maxSegOffset, doorPosition));
    const midM: [number, number] = [(p1[0] + p2[0]) / 2 + ux * clampedOffset, (p1[1] + p2[1]) / 2 + uy * clampedOffset];

    const safeW = Math.min(doorWidth, segLen * 0.85);
    const hxM = midM[0] - ux * (safeW / 2);
    const hyM = midM[1] - uy * (safeW / 2);
    const sxM = midM[0] + ux * (safeW / 2);
    const syM = midM[1] + uy * (safeW / 2);

    const swingSign = doorSwing === 'outward' ? -1 : 1;
    const tipM: [number, number] = [hxM + nx * safeW * swingSign, hyM + ny * safeW * swingSign];

    const hxPx = mToPx(hxM, hyM);
    const sxPx = mToPx(sxM, syM);
    const tipPx = mToPx(tipM[0], tipM[1]);
    const radiusPx = safeW * PX_PER_M;

    // Sweep flag: 0 or 1 depending on swing direction
    const sweep = doorSwing === 'outward' ? 0 : 1;

    return (
      <g className="cad-door-group" pointerEvents="none">
        {/* Door Opening Cutout Highlight */}
        <line
          x1={hxPx[0]}
          y1={hxPx[1]}
          x2={sxPx[0]}
          y2={sxPx[1]}
          stroke="#f59e0b"
          strokeWidth="4"
          strokeLinecap="round"
        />

        {/* Door Open Leaf */}
        <line
          x1={hxPx[0]}
          y1={hxPx[1]}
          x2={tipPx[0]}
          y2={tipPx[1]}
          stroke="#f59e0b"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* Dotted Architectural Swing Arc */}
        <path
          d={`M ${sxPx[0]} ${sxPx[1]} A ${radiusPx} ${radiusPx} 0 0 ${sweep} ${tipPx[0]} ${tipPx[1]}`}
          fill="rgba(245, 158, 11, 0.08)"
          stroke="#f59e0b"
          strokeWidth="1.2"
          strokeDasharray="3 3"
        />

        {/* Door Hinge Pin */}
        <circle cx={hxPx[0]} cy={hxPx[1]} r={3.5} fill="#f59e0b" />

        {/* Door Label Tag */}
        <g transform={`translate(${mToPx(midM[0], midM[1])[0]}, ${mToPx(midM[0], midM[1])[1] - 12})`}>
          <rect x="-18" y="-7" width="36" height="14" rx="2" fill="rgba(24, 24, 27, 0.9)" stroke="#f59e0b" strokeWidth="0.8" />
          <text x="0" y="3.5" textAnchor="middle" fontSize="8" fontWeight="600" fill="#f59e0b" fontFamily="JetBrains Mono, monospace">
            DOOR
          </text>
        </g>
      </g>
    );
  };

  return (
    <div
      className="fp-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="fp-modal-container">
        {/* ── Minimalist Header ── */}
        <div className="fp-modal-header-bar">
          <h2 className="fp-modal-heading">2D Floorplan & Door Placement Editor</h2>

          <div className="flex items-center gap-3">
            <div className="fp-height-input-container">
              <span className="fp-height-title">Wall Height</span>
              <div className="fp-height-field-wrap">
                <input
                  type="number"
                  min={1.5}
                  max={10}
                  step={0.1}
                  value={wallHeight}
                  onChange={(e) => setWallHeight(parseFloat(e.target.value) || 2.7)}
                  className="fp-height-field"
                />
                <span className="fp-height-unit-tag">m</span>
              </div>
            </div>
            <button className="fp-close-button" onClick={onClose} title="Close (Esc)">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* ── Minimalist Action Bar (Undo, Clear, Door Controls, Apply) ── */}
        <div className="fp-top-toolbar">
          <button
            className="fp-action-btn"
            onClick={undoPoint}
            title="Undo last point (Ctrl+Z)"
            disabled={vertices.length === 0}
          >
            <Undo2 size={13} />
            <span>Undo</span>
          </button>
          <button
            className="fp-action-btn"
            onClick={clearCanvas}
            title="Clear all points"
            disabled={vertices.length === 0}
          >
            <Trash2 size={13} />
            <span>Clear</span>
          </button>

          {/* Interactive Door placement bar when polygon is closed */}
          {isClosed && vertices.length >= 3 && (
            <div className="flex items-center gap-3 px-3 py-1 bg-zinc-900/80 rounded border border-zinc-800 ml-2">
              <div className="flex items-center gap-1.5 text-xs text-amber-400 font-medium">
                <DoorOpen size={14} />
                <span>Door on Wall {doorSegment + 1}</span>
              </div>

              {/* Offset slider */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-zinc-400">Position:</span>
                <input
                  type="range"
                  min={-maxSegOffset}
                  max={maxSegOffset}
                  step={0.05}
                  value={doorPosition}
                  onChange={(e) => setDoorPosition(parseFloat(e.target.value))}
                  className="w-24 accent-amber-500 h-1 cursor-pointer"
                />
                <span className="text-[10px] font-mono text-zinc-300 w-10">
                  {doorPosition > 0 ? `+${doorPosition}m` : `${doorPosition}m`}
                </span>
              </div>

              {/* Swing Toggle */}
              <div className="flex items-center bg-zinc-800 rounded p-0.5 text-[10px]">
                <button
                  type="button"
                  className={`px-2 py-0.5 rounded transition ${doorSwing === 'inward' ? 'bg-amber-500 text-zinc-950 font-semibold' : 'text-zinc-400'}`}
                  onClick={() => setDoorSwing('inward')}
                >
                  Inward
                </button>
                <button
                  type="button"
                  className={`px-2 py-0.5 rounded transition ${doorSwing === 'outward' ? 'bg-amber-500 text-zinc-950 font-semibold' : 'text-zinc-400'}`}
                  onClick={() => setDoorSwing('outward')}
                >
                  Outward
                </button>
              </div>
            </div>
          )}

          <div className="flex-1" />

          <button
            className={`fp-generate-btn ${isClosed || vertices.length >= 3 ? 'active' : ''}`}
            onClick={handleGenerateRoom}
            disabled={vertices.length < 3}
          >
            <Check size={14} />
            <span>Apply Layout</span>
          </button>
        </div>

        {/* ── 100% Viewport CAD Drawing Canvas ── */}
        <div className="fp-canvas-viewport">
          <svg
            ref={svgRef}
            className="fp-blueprint-svg"
            onMouseMove={handleMouseMove}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onClick={handleCanvasClick}
            onContextMenu={(e) => e.preventDefault()}
            style={{ cursor: isClosed ? 'default' : 'crosshair' }}
          >
            <defs>
              {/* Minor grid lines (0.25m) */}
              <pattern
                id="cad-minor-grid"
                width={gridPx}
                height={gridPx}
                patternUnits="userSpaceOnUse"
                patternTransform={`translate(${pan[0] % gridPx},${pan[1] % gridPx})`}
              >
                <path
                  d={`M ${gridPx} 0 L 0 0 0 ${gridPx}`}
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.04)"
                  strokeWidth="0.5"
                />
              </pattern>

              {/* Major grid lines (1.0m) */}
              <pattern
                id="cad-major-grid"
                width={majorGridPx}
                height={majorGridPx}
                patternUnits="userSpaceOnUse"
                patternTransform={`translate(${pan[0] % majorGridPx},${pan[1] % majorGridPx})`}
              >
                <path
                  d={`M ${majorGridPx} 0 L 0 0 0 ${majorGridPx}`}
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.1)"
                  strokeWidth="0.8"
                />
              </pattern>
            </defs>

            {/* Grid background */}
            <rect width="100%" height="100%" fill="url(#cad-minor-grid)" />
            <rect width="100%" height="100%" fill="url(#cad-major-grid)" />

            {/* Closed Polygon Neutral Tint Fill */}
            {isClosed && pxVerts.length >= 3 && (
              <polygon
                points={polyPoints}
                fill="rgba(255, 255, 255, 0.06)"
                stroke="#e4e4e7"
                strokeWidth="2"
                strokeLinejoin="round"
              />
            )}

            {/* Clickable Wall Segments for Door Placement */}
            {isClosed && pxVerts.map((v, i) => {
              const next = pxVerts[(i + 1) % pxVerts.length];
              const isSelectedDoorWall = (doorSegment % pxVerts.length) === i;
              return (
                <g key={`wall-click-${i}`}>
                  {/* Broad transparent hit area for easy clicking */}
                  <line
                    x1={v[0]}
                    y1={v[1]}
                    x2={next[0]}
                    y2={next[1]}
                    stroke={isSelectedDoorWall ? 'rgba(245, 158, 11, 0.4)' : 'transparent'}
                    strokeWidth="16"
                    strokeLinecap="round"
                    cursor="pointer"
                    onClick={(e) => handleSegmentClick(e, i)}
                  />
                  {/* Wall stroke indicator */}
                  <line
                    x1={v[0]}
                    y1={v[1]}
                    x2={next[0]}
                    y2={next[1]}
                    stroke={isSelectedDoorWall ? '#f59e0b' : '#e4e4e7'}
                    strokeWidth={isSelectedDoorWall ? '3' : '2'}
                    strokeLinecap="round"
                    cursor="pointer"
                    onClick={(e) => handleSegmentClick(e, i)}
                  />
                </g>
              );
            })}

            {/* In-progress Polyline */}
            {!isClosed && pxVerts.length > 1 && (
              <polyline
                points={polyPoints}
                fill="none"
                stroke="#e4e4e7"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Closing segment loop preview */}
            {closingHint && !isClosed && (
              <path d={closingHint} fill="none" stroke="#e4e4e7" strokeWidth="2" />
            )}

            {/* Live Drag Preview Line to Cursor */}
            {previewLine && (
              <path
                d={previewLine}
                fill="none"
                stroke="#a1a1aa"
                strokeWidth="1.5"
                strokeDasharray="4 3"
              />
            )}

            {/* CAD Door Symbol */}
            {renderCADDoorSymbol()}

            {/* Dimension Text Badges along Segments */}
            {pxVerts.map((v, i) => {
              const next = pxVerts[i + 1] ?? (isClosed ? pxVerts[0] : null);
              if (!next) return null;
              const mx = (v[0] + next[0]) / 2;
              const my = (v[1] + next[1]) / 2;
              const vm = vertices[i];
              const nextM = vertices[i + 1] ?? (isClosed ? vertices[0] : null);
              if (!nextM) return null;
              const lenM = dist2(vm, nextM);

              return (
                <g key={`dim-${i}`} className="pointer-events-none select-none">
                  <rect
                    x={mx - 22}
                    y={my - 9}
                    width={44}
                    height={18}
                    rx={3}
                    fill="rgba(24, 24, 27, 0.9)"
                    stroke="rgba(255, 255, 255, 0.15)"
                    strokeWidth="0.8"
                  />
                  <text
                    x={mx}
                    y={my + 3.5}
                    textAnchor="middle"
                    fontSize="10"
                    fontWeight="500"
                    fill="#e4e4e7"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    {lenM.toFixed(2)}m
                  </text>
                </g>
              );
            })}

            {/* Vertex Nodes */}
            {pxVerts.map(([vx, vy], i) => (
              <g key={`vert-${i}`}>
                <circle
                  cx={vx}
                  cy={vy}
                  r={i === 0 ? 5.5 : 4}
                  fill={i === 0 ? '#ffffff' : '#a1a1aa'}
                  stroke="#18181b"
                  strokeWidth="1.5"
                />
                {i === 0 && !isClosed && (
                  <circle
                    cx={vx}
                    cy={vy}
                    r={CLOSE_THRESHOLD_M * PX_PER_M}
                    fill="rgba(255, 255, 255, 0.04)"
                    stroke="rgba(255, 255, 255, 0.2)"
                    strokeDasharray="3 3"
                  />
                )}
              </g>
            ))}

            {/* Cursor Dot */}
            {!isClosed && (
              <circle
                cx={cursorPx[0]}
                cy={cursorPx[1]}
                r={3.5}
                fill="none"
                stroke="#e4e4e7"
                strokeWidth="1.5"
              />
            )}
          </svg>

          {/* Minimal HUD Hint */}
          <div className="fp-hud-hint">
            {isClosed ? (
              <span>Click on any wall segment to place entrance door · Drag slider to adjust position</span>
            ) : (
              <>
                <span>Click to add wall corner</span>
                <span>·</span>
                <span>Shift to snap angle</span>
                <span>·</span>
                <span>Alt/Middle-drag to pan</span>
              </>
            )}
          </div>
        </div>

        {/* ── Clean Status Bar ── */}
        <div className="fp-bottom-status-bar">
          <div className="flex items-center gap-4">
            <div className="fp-status-metric">
              <span className="fp-metric-lbl">Vertices</span>
              <span className="fp-metric-val">{vertices.length}</span>
            </div>
            {isClosed && (
              <div className="fp-status-metric">
                <span className="fp-metric-lbl">Floor Area</span>
                <span className="fp-metric-val">{area.toFixed(2)} m²</span>
              </div>
            )}
          </div>

          <div className="fp-status-message">
            {isClosed ? (
              <span className="text-zinc-300 font-medium">
                Outline closed · Door placed on Wall {doorSegment + 1} ({doorSwing} swing)
              </span>
            ) : vertices.length === 0 ? (
              <span className="text-zinc-500">Click anywhere to start drawing room outline</span>
            ) : (
              <span className="text-zinc-400">
                Click to place point {vertices.length + 1} · Click first point to close
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
