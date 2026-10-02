import { useState, useMemo } from 'react';
import type { DragEvent } from 'react';
import { 
  Search, 
  X, 
  ChevronRight, 
  ChevronLeft, 
  Plus, 
  Move
} from 'lucide-react';
import { 
  CATALOG_ITEMS, 
  CATALOG_CATEGORIES, 
  getTemplatesForGroup 
} from '../../catalog/furnitureCatalog';
import type { 
  CatalogCategoryFilter, 
  CatalogTemplate 
} from '../../catalog/furnitureCatalog';
import { useRoomStore } from '../../store/roomStore';
import { FurnitureThumbnail } from '../../catalog/furnitureThumbnails';

export function FurnitureCatalogSidebar() {
  const [isOpen, setIsOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<CatalogCategoryFilter>('All');
  const addFurnitureItem = useRoomStore((s) => s.addFurnitureItem);

  const filteredItems = useMemo(() => {
    let items = getTemplatesForGroup(activeCategory);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      items = items.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          item.id.toLowerCase().includes(q) ||
          (item.tags && item.tags.some((t) => t.toLowerCase().includes(q)))
      );
    }

    return items;
  }, [activeCategory, searchQuery]);

  const handleDragStart = (e: DragEvent<HTMLDivElement>, template: CatalogTemplate) => {
    e.dataTransfer.setData('application/renovix-template', template.id);
    e.dataTransfer.setData('text/plain', template.id);
    e.dataTransfer.effectAllowed = 'copy';

    if (e.currentTarget) {
      e.currentTarget.style.opacity = '0.5';
    }
  };

  const handleDragEnd = (e: DragEvent<HTMLDivElement>) => {
    if (e.currentTarget) {
      e.currentTarget.style.opacity = '1';
    }
  };

  const handleSpawnCenter = (templateId: string) => {
    addFurnitureItem(templateId, [0, 0, 0]);
  };

  return (
    <>
      {/* ── Floating Toggle Tab on Right Edge ──────────────────────── */}
      <button
        type="button"
        className={`catalog-toggle-btn ${isOpen ? 'open' : 'closed'}`}
        onClick={() => setIsOpen(!isOpen)}
        title={isOpen ? 'Collapse Furniture Catalog' : 'Open Furniture Catalog'}
        aria-label={isOpen ? 'Collapse Furniture Catalog' : 'Open Furniture Catalog'}
      >
        {isOpen ? (
          <ChevronRight size={16} />
        ) : (
          <div className="toggle-content-vertical">
            <span className="toggle-label">CATALOG</span>
            <ChevronLeft size={14} />
          </div>
        )}
      </button>

      {/* ── Collapsible Catalog Sidebar ───────────────────────────── */}
      <aside
        className={`furniture-catalog-sidebar ${isOpen ? 'open' : 'collapsed'}`}
        id="furniture-catalog-sidebar"
        aria-label="Furniture Catalog"
      >
        {/* Header */}
        <div className="catalog-header">
          <div className="catalog-title-group">
            <h2 className="catalog-title">Catalog</h2>
            <span className="catalog-badge">{CATALOG_ITEMS.length}</span>
          </div>
          <button
            type="button"
            className="catalog-close-btn"
            onClick={() => setIsOpen(false)}
            title="Collapse Catalog"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Search Input */}
        <div className="catalog-search-wrap">
          <div className="search-box">
            <Search size={14} className="search-icon" />
            <input
              type="text"
              placeholder="Search catalog items, tags…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            {searchQuery && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={() => setSearchQuery('')}
                title="Clear search"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="catalog-category-pills" role="tablist">
          {CATALOG_CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`category-pill ${isActive ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Helper Note for Drag & Drop */}
        <div className="catalog-drag-hint">
          <Move size={11} className="text-zinc-500" />
          <span>Drag onto floor or click <strong>+</strong> to spawn at center</span>
        </div>

        {/* Catalog Items Grid */}
        <div className="catalog-grid-container">
          {filteredItems.length === 0 ? (
            <div className="catalog-empty-state">
              <Search size={22} className="text-zinc-600 mb-2" />
              <p className="text-xs text-zinc-400 font-medium">No matching items found</p>
              <button
                type="button"
                className="clear-filter-btn"
                onClick={() => {
                  setSearchQuery('');
                  setActiveCategory('All');
                }}
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="catalog-grid">
              {filteredItems.map((template) => {
                const [w, , d] = template.defaultDimensions;
                return (
                  <div
                    key={template.id}
                    className="catalog-card"
                    draggable
                    onDragStart={(e) => handleDragStart(e, template)}
                    onDragEnd={handleDragEnd}
                    onClick={() => handleSpawnCenter(template.id)}
                    title={`Click to add "${template.name}" at room center or drag onto floor`}
                  >
                    {/* Top Details & Visual Thumbnail & Quick Add Button */}
                    <div className="card-thumb-wrap">
                      <FurnitureThumbnail templateId={template.id} category={template.category} />
                      <span className="card-category-tag">{template.category}</span>
                      <button
                        type="button"
                        className="card-quick-add"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSpawnCenter(template.id);
                        }}
                        title="Add to room center"
                        aria-label={`Add ${template.name}`}
                      >
                        <Plus size={13} />
                      </button>
                      <span className="drag-handle-indicator">
                        <Move size={10} />
                      </span>
                    </div>

                    {/* Card Body */}
                    <div className="card-body">
                      <h4 className="card-title">{template.name}</h4>
                      <p className="card-desc">{template.description}</p>
                      <div className="card-footer">
                        <span className="card-dim-badge">
                          {w.toFixed(1)}m × {d.toFixed(1)}m
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
