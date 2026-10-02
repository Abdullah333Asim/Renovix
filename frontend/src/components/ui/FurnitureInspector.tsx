import { useMemo } from 'react';
import { 
  X, 
  RotateCw, 
  Trash2, 
  Check
} from 'lucide-react';
import { useRoomStore } from '../../store/roomStore';
import { 
  getTemplatesForCategory, 
  MATERIAL_PRESETS 
} from '../../catalog/furnitureCatalog';

export function FurnitureInspector() {
  const { 
    selectedId, 
    setSelectedId, 
    manifest, 
    updateFurnitureItem, 
    removeFurnitureItem,
    dimensions: roomDims,
  } = useRoomStore();

  const selectedItem = useMemo(() => {
    if (!selectedId || !manifest) return null;
    return manifest.furniture.find((f) => f.id === selectedId) || null;
  }, [selectedId, manifest]);

  if (!selectedItem) return null;

  const categoryTemplates = getTemplatesForCategory(selectedItem.label);
  const activeTemplateId = selectedItem.templateId || categoryTemplates[0]?.id;
  const activePreset = selectedItem.materialPreset || 'Oak Wood';
  const activeColor = selectedItem.colorTint || selectedItem.dominantColor || '#C49E6C';

  const [w, h, d] = selectedItem.dimensions;

  const handleRotate = (angleDelta: number) => {
    const newRot = (selectedItem.rotationY + angleDelta) % (Math.PI * 2);
    updateFurnitureItem(selectedItem.id, { rotationY: newRot });
  };

  const handleAlignToWall = (wall: 'back' | 'front' | 'left' | 'right') => {
    const margin = 0.05;
    let newX = selectedItem.position[0];
    let newZ = selectedItem.position[2];
    let newRot = selectedItem.rotationY;

    if (wall === 'left') {
      newX = -roomDims.widthM / 2 + w / 2 + margin;
      newRot = Math.PI / 2;
    } else if (wall === 'right') {
      newX = roomDims.widthM / 2 - w / 2 - margin;
      newRot = -Math.PI / 2;
    } else if (wall === 'front') {
      newZ = roomDims.lengthM / 2 - d / 2 - margin;
      newRot = Math.PI;
    } else if (wall === 'back') {
      newZ = -roomDims.lengthM / 2 + d / 2 + margin;
      newRot = 0;
    }

    updateFurnitureItem(selectedItem.id, {
      position: [newX, 0, newZ],
      rotationY: newRot,
    });
  };

  const handleDelete = () => {
    removeFurnitureItem(selectedItem.id);
  };

  return (
    <aside className="furniture-inspector" id="furniture-inspector" aria-label="Furniture Inspector">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="inspector-header">
        <div className="inspector-title-wrap">
          <span className="inspector-badge">{selectedItem.label.toUpperCase()}</span>
          <h3 className="inspector-title">Object Inspector</h3>
        </div>
        <button 
          onClick={() => setSelectedId(null)}
          className="inspector-close-btn"
          title="Close Inspector (Esc)"
        >
          <X size={15} />
        </button>
      </div>

      <div className="inspector-content">
        {/* ── 1. Template & Style ────────────────────────────── */}
        {categoryTemplates.length > 0 && (
          <section className="inspector-section">
            <h4 className="text-[11px] font-medium uppercase tracking-wider text-zinc-400 mb-2">
              Template & Style
            </h4>
            <div className="template-grid">
              {categoryTemplates.map((tpl) => {
                const isSelected = activeTemplateId === tpl.id;
                return (
                  <button
                    key={tpl.id}
                    type="button"
                    className={`template-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => {
                      updateFurnitureItem(selectedItem.id, {
                        templateId: tpl.id,
                        dimensions: tpl.defaultDimensions,
                        meshSource: 'template',
                      });
                    }}
                  >
                    <div className="template-info">
                      <span className="template-name">{tpl.name}</span>
                      <span className="template-desc">{tpl.description}</span>
                    </div>
                    {isSelected && (
                      <span className="template-check">
                        <Check size={12} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* ── 2. Material & Finish ───────────────────────────── */}
        <section className="inspector-section">
          <h4 className="text-[11px] font-medium uppercase tracking-wider text-zinc-400 mb-2">
            Material & Finish
          </h4>

          {/* Sampled Color Badge */}
          {selectedItem.dominantColor && (
            <div className="photo-color-badge">
              <span className="badge-sub">Sampled Color:</span>
              <button
                type="button"
                className="color-pill-btn"
                onClick={() => updateFurnitureItem(selectedItem.id, { colorTint: selectedItem.dominantColor })}
              >
                <span 
                  className="color-swatch-circle" 
                  style={{ backgroundColor: selectedItem.dominantColor }}
                />
                <span className="font-mono text-xs">{selectedItem.dominantColor}</span>
              </button>
            </div>
          )}

          {/* Material Presets Swatches */}
          <div className="presets-label">Material Presets:</div>
          <div className="preset-swatches-grid">
            {Object.entries(MATERIAL_PRESETS).map(([name, p]) => {
              const isSelected = activePreset === name;
              return (
                <button
                  key={name}
                  type="button"
                  className={`preset-swatch-btn ${isSelected ? 'active' : ''}`}
                  title={`${name} (${p.category})`}
                  onClick={() => {
                    updateFurnitureItem(selectedItem.id, {
                      materialPreset: name,
                      colorTint: p.color,
                    });
                  }}
                >
                  <span
                    className="swatch-color"
                    style={{ backgroundColor: p.color }}
                  />
                  <span className="swatch-name">{name}</span>
                </button>
              );
            })}
          </div>

          {/* Custom Hex Color Picker */}
          <div className="custom-color-row">
            <span className="text-xs text-zinc-400">Custom Tint:</span>
            <div className="color-picker-wrap">
              <input
                type="color"
                value={activeColor.startsWith('#') ? activeColor : '#C49E6C'}
                onChange={(e) => updateFurnitureItem(selectedItem.id, { colorTint: e.target.value })}
                className="native-color-picker"
              />
              <input
                type="text"
                value={activeColor}
                onChange={(e) => updateFurnitureItem(selectedItem.id, { colorTint: e.target.value })}
                className="hex-text-input"
                maxLength={7}
              />
            </div>
          </div>
        </section>

        {/* ── 3. Dimensions (m) ──────────────────────────────── */}
        <section className="inspector-section">
          <h4 className="text-[11px] font-medium uppercase tracking-wider text-zinc-400 mb-2">
            Dimensions (m)
          </h4>

          <div className="dim-sliders-wrap">
            {/* Width */}
            <div className="slider-row">
              <div className="slider-meta">
                <span className="dim-axis">Width (X)</span>
                <span className="dim-val">{w.toFixed(2)} m</span>
              </div>
              <input
                type="range"
                min="0.30"
                max="4.00"
                step="0.05"
                value={w}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  updateFurnitureItem(selectedItem.id, { dimensions: [val, h, d] });
                }}
                className="inspector-range"
              />
            </div>

            {/* Height */}
            <div className="slider-row">
              <div className="slider-meta">
                <span className="dim-axis">Height (Y)</span>
                <span className="dim-val">{h.toFixed(2)} m</span>
              </div>
              <input
                type="range"
                min="0.20"
                max="3.00"
                step="0.05"
                value={h}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  updateFurnitureItem(selectedItem.id, { dimensions: [w, val, d] });
                }}
                className="inspector-range"
              />
            </div>

            {/* Depth */}
            <div className="slider-row">
              <div className="slider-meta">
                <span className="dim-axis">Depth (Z)</span>
                <span className="dim-val">{d.toFixed(2)} m</span>
              </div>
              <input
                type="range"
                min="0.30"
                max="4.00"
                step="0.05"
                value={d}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  updateFurnitureItem(selectedItem.id, { dimensions: [w, h, val] });
                }}
                className="inspector-range"
              />
            </div>
          </div>
        </section>

        {/* ── 4. Actions & Alignments ────────────────────────── */}
        <section className="inspector-section">
          <h4 className="text-[11px] font-medium uppercase tracking-wider text-zinc-400 mb-2">
            Actions
          </h4>

          <div className="quick-actions-row">
            <button
              type="button"
              className="action-btn"
              onClick={() => handleRotate(Math.PI / 2)}
              title="Rotate 90° Clockwise"
            >
              <RotateCw size={13} />
              <span>Rotate +90°</span>
            </button>
            <button
              type="button"
              className="action-btn"
              onClick={() => handleRotate(-Math.PI / 2)}
              title="Rotate -90° Counter-Clockwise"
            >
              <RotateCw size={13} className="rotate-180" />
              <span>Rotate -90°</span>
            </button>
          </div>

          <div className="wall-align-grid">
            <button
              type="button"
              className="wall-align-btn"
              onClick={() => handleAlignToWall('back')}
            >
              Back Wall
            </button>
            <button
              type="button"
              className="wall-align-btn"
              onClick={() => handleAlignToWall('left')}
            >
              Left Wall
            </button>
            <button
              type="button"
              className="wall-align-btn"
              onClick={() => handleAlignToWall('right')}
            >
              Right Wall
            </button>
            <button
              type="button"
              className="wall-align-btn"
              onClick={() => handleAlignToWall('front')}
            >
              Front Wall
            </button>
          </div>
        </section>

        {/* ── Delete Action ───────────────────────────────── */}
        <div className="inspector-delete-wrap">
          <button
            type="button"
            className="delete-item-btn"
            onClick={handleDelete}
          >
            <Trash2 size={14} />
            <span>Remove Object</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
