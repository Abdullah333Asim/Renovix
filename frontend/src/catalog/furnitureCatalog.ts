// ─── Curated 3D Furniture Template Catalog ────────────────────────────────────

export interface MaterialPreset {
  id: string;
  name: string;
  category: 'wood' | 'fabric' | 'leather' | 'metal' | 'greenery';
  color: string;
  roughness: number;
  metalness: number;
}

export interface CatalogTemplate {
  id: string;
  name: string;
  category: 'bed' | 'sofa' | 'armchair' | 'chair' | 'desk' | 'table' | 'wardrobe' | 'bookshelf' | 'nightstand' | 'lighting' | 'decor' | 'storage' | 'pouf';
  description: string;
  defaultDimensions: [number, number, number]; // [W, H, D] in meters
  thumbnail?: string;
  compatiblePresets: string[];
  tags?: string[];
}

// ─── Standard Interior Design Material Presets ───────────────────────────────

export const MATERIAL_PRESETS: Record<string, MaterialPreset> = {
  'Oak Wood': {
    id: 'oak_wood',
    name: 'Natural Oak',
    category: 'wood',
    color: '#C49E6C',
    roughness: 0.72,
    metalness: 0.05,
  },
  'Dark Walnut': {
    id: 'dark_walnut',
    name: 'Dark Walnut',
    category: 'wood',
    color: '#3B2317',
    roughness: 0.65,
    metalness: 0.05,
  },
  'Scandi Ash': {
    id: 'scandi_ash',
    name: 'Bleached Ash',
    category: 'wood',
    color: '#E8DEC8',
    roughness: 0.80,
    metalness: 0.02,
  },
  'Grey Fabric': {
    id: 'grey_fabric',
    name: 'Linen Grey',
    category: 'fabric',
    color: '#7E8287',
    roughness: 0.95,
    metalness: 0.0,
  },
  'Navy Velvet': {
    id: 'navy_velvet',
    name: 'Midnight Velvet',
    category: 'fabric',
    color: '#1E293B',
    roughness: 0.88,
    metalness: 0.0,
  },
  'Warm Beige': {
    id: 'warm_beige',
    name: 'Oatmeal Bouclé',
    category: 'fabric',
    color: '#D8CEBE',
    roughness: 0.96,
    metalness: 0.0,
  },
  'Terracotta': {
    id: 'terracotta',
    name: 'Earthy Terracotta',
    category: 'fabric',
    color: '#C86D51',
    roughness: 0.92,
    metalness: 0.0,
  },
  'Ivory Leather': {
    id: 'ivory_leather',
    name: 'Ivory Leather',
    category: 'leather',
    color: '#EDE8DF',
    roughness: 0.45,
    metalness: 0.08,
  },
  'Cognac Leather': {
    id: 'cognac_leather',
    name: 'Cognac Saddle',
    category: 'leather',
    color: '#8D401D',
    roughness: 0.48,
    metalness: 0.06,
  },
  'Matte Black': {
    id: 'matte_black',
    name: 'Matte Charcoal',
    category: 'metal',
    color: '#1E2024',
    roughness: 0.85,
    metalness: 0.25,
  },
  'Brushed Brass': {
    id: 'brushed_brass',
    name: 'Brushed Brass',
    category: 'metal',
    color: '#D4AF37',
    roughness: 0.35,
    metalness: 0.85,
  },
  'Chrome Steel': {
    id: 'chrome_steel',
    name: 'Chrome Steel',
    category: 'metal',
    color: '#E0E2EC',
    roughness: 0.15,
    metalness: 0.95,
  },
  'Emerald Leaf': {
    id: 'emerald_leaf',
    name: 'Emerald Foliage',
    category: 'greenery',
    color: '#2D5A27',
    roughness: 0.90,
    metalness: 0.0,
  },
};

// ─── Curated Catalog Items ───────────────────────────────────────────────────

export const CATALOG_ITEMS: CatalogTemplate[] = [
  // ── 1. Beds ──
  {
    id: 'bed_modern_double',
    name: 'Modern Double Bed',
    category: 'bed',
    description: 'Contemporary upholstered bed with dual plush pillows & duvet',
    defaultDimensions: [1.8, 1.1, 2.1],
    compatiblePresets: ['Warm Beige', 'Navy Velvet', 'Grey Fabric', 'Dark Walnut'],
    tags: ['bed', 'double', 'bedroom', 'mattress', 'sleeping'],
  },
  {
    id: 'bed_minimalist',
    name: 'Minimalist Platform Bed',
    category: 'bed',
    description: 'Low-profile wooden platform bed with floating side rails',
    defaultDimensions: [1.6, 0.75, 2.05],
    compatiblePresets: ['Oak Wood', 'Scandi Ash', 'Dark Walnut', 'Matte Black'],
    tags: ['bed', 'wood', 'platform', 'scandi', 'minimalist'],
  },
  {
    id: 'bed_upholstered_fabric',
    name: 'Upholstered Fabric Bed',
    category: 'bed',
    description: 'Soft fabric upholstered bed with padded cushioned headboard',
    defaultDimensions: [1.8, 1.15, 2.1],
    compatiblePresets: ['Warm Beige', 'Navy Velvet', 'Grey Fabric'],
    tags: ['bed', 'upholstered', 'fabric', 'bedroom', 'padded'],
  },
  {
    id: 'bed_platform_wood',
    name: 'Natural Wood Platform Bed',
    category: 'bed',
    description: 'Minimalist solid wood platform bed frame with integrated low headboard',
    defaultDimensions: [1.6, 0.8, 2.05],
    compatiblePresets: ['Oak Wood', 'Dark Walnut', 'Scandi Ash'],
    tags: ['bed', 'wood', 'platform', 'scandi', 'timber'],
  },

  // ── 2. Seating: Sofas, Chairs, Armchairs, Poufs ──
  {
    id: 'sofa_three_seater',
    name: 'Contemporary 3-Seater Sofa',
    category: 'sofa',
    description: 'Plush three-seater sofa with structured armrests & lumbar cushions',
    defaultDimensions: [2.1, 0.85, 0.95],
    compatiblePresets: ['Grey Fabric', 'Navy Velvet', 'Warm Beige', 'Cognac Leather'],
    tags: ['sofa', 'couch', 'living room', 'seating'],
  },
  {
    id: 'sofa_leather_dark',
    name: 'Dark Leather 3-Seater Sofa',
    category: 'sofa',
    description: 'Supple dark leather sofa with structured silhouette and polished sheen',
    defaultDimensions: [2.15, 0.85, 0.95],
    compatiblePresets: ['Cognac Leather', 'Dark Walnut', 'Matte Black'],
    tags: ['sofa', 'leather', 'dark leather', 'couch', 'living room'],
  },
  {
    id: 'sofa_sectional',
    name: 'L-Shaped Sectional Sofa',
    category: 'sofa',
    description: 'Spacious sectional sofa with reversible chaise lounge',
    defaultDimensions: [2.6, 0.85, 1.6],
    compatiblePresets: ['Grey Fabric', 'Warm Beige', 'Navy Velvet', 'Ivory Leather'],
    tags: ['sofa', 'sectional', 'l-shaped', 'couch', 'corner'],
  },
  {
    id: 'armchair_lounge',
    name: 'Lounge Accent Armchair',
    category: 'armchair',
    description: 'Deep lounge armchair with curved backrest and tapered wooden legs',
    defaultDimensions: [0.85, 0.90, 0.85],
    compatiblePresets: ['Navy Velvet', 'Cognac Leather', 'Warm Beige', 'Grey Fabric'],
    tags: ['chair', 'armchair', 'lounge', 'accent', 'seating'],
  },
  {
    id: 'chair_dining',
    name: 'Scandi Dining Chair',
    category: 'chair',
    description: 'Minimalist dining chair with upholstered seat pad & angled legs',
    defaultDimensions: [0.55, 0.85, 0.55],
    compatiblePresets: ['Oak Wood', 'Grey Fabric', 'Matte Black', 'Scandi Ash'],
    tags: ['chair', 'dining', 'scandi', 'kitchen', 'table chair'],
  },
  {
    id: 'chair_office',
    name: 'Ergonomic Office Chair',
    category: 'chair',
    description: 'Executive swivel mesh chair with 5-star base & armrests',
    defaultDimensions: [0.65, 1.05, 0.65],
    compatiblePresets: ['Matte Black', 'Chrome Steel', 'Grey Fabric', 'Ivory Leather'],
    tags: ['chair', 'office', 'desk chair', 'swivel', 'study'],
  },
  {
    id: 'chair_office_mesh',
    name: 'High-Back Mesh Office Chair',
    category: 'chair',
    description: 'Ergonomic high-back office chair with breathable black mesh and lumbar support',
    defaultDimensions: [0.65, 1.15, 0.65],
    compatiblePresets: ['Matte Black', 'Chrome Steel'],
    tags: ['chair', 'office', 'mesh', 'desk chair', 'swivel'],
  },
  {
    id: 'pouf_ottoman_round',
    name: 'Round Bouclé Pouf Ottoman',
    category: 'pouf',
    description: 'Soft upholstered circular ottoman / footstool with piped seam detail',
    defaultDimensions: [0.55, 0.42, 0.55],
    compatiblePresets: ['Warm Beige', 'Terracotta', 'Grey Fabric', 'Navy Velvet'],
    tags: ['pouf', 'ottoman', 'footstool', 'stool', 'seating', 'decor'],
  },

  // ── 3. Tables & Desks ──
  {
    id: 'desk_wooden',
    name: 'Modern Study Desk',
    category: 'desk',
    description: 'Clean workstation with dual storage drawers & cable pass',
    defaultDimensions: [1.4, 0.75, 0.70],
    compatiblePresets: ['Oak Wood', 'Dark Walnut', 'Scandi Ash', 'Matte Black'],
    tags: ['desk', 'workstation', 'office', 'table', 'study'],
  },
  {
    id: 'desk_minimal_white',
    name: 'Minimal White Workstation',
    category: 'desk',
    description: 'Sleek white lacquer desktop with slim powder-coated steel legs',
    defaultDimensions: [1.3, 0.75, 0.65],
    compatiblePresets: ['Chrome Steel', 'Matte Black', 'Scandi Ash'],
    tags: ['desk', 'workstation', 'minimal', 'white', 'modern'],
  },
  {
    id: 'table_coffee',
    name: 'Two-Tier Coffee Table',
    category: 'table',
    description: 'Low minimalist living room coffee table with lower magazine shelf',
    defaultDimensions: [1.1, 0.45, 0.60],
    compatiblePresets: ['Oak Wood', 'Dark Walnut', 'Brushed Brass', 'Matte Black'],
    tags: ['table', 'coffee table', 'living room', 'center table'],
  },
  {
    id: 'table_coffee_glass',
    name: 'Tempered Glass Coffee Table',
    category: 'table',
    description: 'Floating tempered glass top coffee table with polished geometric metal frame',
    defaultDimensions: [1.1, 0.42, 0.60],
    compatiblePresets: ['Chrome Steel', 'Brushed Brass', 'Matte Black'],
    tags: ['table', 'coffee table', 'glass', 'modern', 'living room'],
  },
  {
    id: 'table_dining_round',
    name: 'Round Dining Table',
    category: 'table',
    description: 'Mid-century modern round dining table with pedestal base',
    defaultDimensions: [1.2, 0.76, 1.2],
    compatiblePresets: ['Dark Walnut', 'Oak Wood', 'Scandi Ash', 'Matte Black'],
    tags: ['table', 'dining', 'round table', 'kitchen'],
  },

  // ── 4. Storage, Stands & Media ──
  {
    id: 'wardrobe_two_door',
    name: 'Two-Door Wardrobe',
    category: 'wardrobe',
    description: 'Modern full-height double-door wardrobe with metal handles',
    defaultDimensions: [1.2, 2.0, 0.60],
    compatiblePresets: ['Dark Walnut', 'Oak Wood', 'Matte Black', 'Scandi Ash'],
    tags: ['wardrobe', 'closet', 'cupboard', 'storage', 'bedroom'],
  },
  {
    id: 'bookshelf_tall',
    name: '5-Tier Geometric Bookshelf',
    category: 'bookshelf',
    description: 'Tall open-back display shelving unit with staggered dividers',
    defaultDimensions: [0.90, 1.85, 0.35],
    compatiblePresets: ['Oak Wood', 'Dark Walnut', 'Matte Black', 'Brushed Brass'],
    tags: ['bookshelf', 'bookcase', 'shelves', 'storage', 'display'],
  },
  {
    id: 'nightstand_modern',
    name: 'Modern Bedside Nightstand',
    category: 'nightstand',
    description: 'Bedside drawer unit with brass knob & splayed legs',
    defaultDimensions: [0.50, 0.55, 0.45],
    compatiblePresets: ['Oak Wood', 'Dark Walnut', 'Scandi Ash', 'Matte Black'],
    tags: ['nightstand', 'bedside', 'table', 'storage', 'drawer'],
  },
  {
    id: 'stand_tv_console',
    name: 'Media Console & Mounted TV',
    category: 'storage',
    description: 'Low-profile media credenza with slat doors and mounted flat screen',
    defaultDimensions: [1.6, 1.05, 0.40],
    compatiblePresets: ['Dark Walnut', 'Oak Wood', 'Scandi Ash', 'Matte Black'],
    tags: ['tv', 'television', 'media', 'console', 'credenza', 'stand', 'storage'],
  },
  {
    id: 'stand_coat_rack',
    name: 'Nordic Timber Coat Rack',
    category: 'storage',
    description: 'Vertical wooden coat tree with heavy base and staggered angled pegs',
    defaultDimensions: [0.40, 1.75, 0.40],
    compatiblePresets: ['Oak Wood', 'Dark Walnut', 'Scandi Ash', 'Matte Black'],
    tags: ['coat rack', 'stand', 'clothes', 'hallway', 'entryway', 'hang'],
  },

  // ── 5. Lighting Fixtures ──
  {
    id: 'lamp_floor_arc',
    name: 'Curved Arc Floor Lamp',
    category: 'lighting',
    description: 'Modern curved arc floor lamp with heavy stone base, brass rod & dome shade',
    defaultDimensions: [0.45, 1.80, 0.90],
    compatiblePresets: ['Brushed Brass', 'Matte Black', 'Chrome Steel'],
    tags: ['lamp', 'floor lamp', 'light', 'lighting', 'arc lamp', 'brass'],
  },
  {
    id: 'lamp_table_modern',
    name: 'Ceramic Table Lamp',
    category: 'lighting',
    description: 'Cylinder ceramic base with soft fabric drum shade & warm illumination',
    defaultDimensions: [0.35, 0.55, 0.35],
    compatiblePresets: ['Warm Beige', 'Terracotta', 'Matte Black', 'Brushed Brass'],
    tags: ['lamp', 'table lamp', 'desk lamp', 'light', 'lighting', 'bedside'],
  },
  {
    id: 'lamp_tripod_floor',
    name: 'Tripod Timber Floor Lamp',
    category: 'lighting',
    description: 'Nordic 3-leg timber tripod floor lamp with linen drum diffuser',
    defaultDimensions: [0.50, 1.45, 0.50],
    compatiblePresets: ['Oak Wood', 'Dark Walnut', 'Scandi Ash', 'Matte Black'],
    tags: ['lamp', 'tripod', 'floor lamp', 'light', 'nordic', 'timber'],
  },

  // ── 6. Decor & Greenery ──
  {
    id: 'plant_potted_monstera',
    name: 'Potted Monstera Deliciosa',
    category: 'decor',
    description: 'Ceramic floor planter with multi-stem broad green Swiss cheese leaves',
    defaultDimensions: [0.60, 1.10, 0.60],
    compatiblePresets: ['Warm Beige', 'Ivory Leather', 'Matte Black', 'Terracotta'],
    tags: ['plant', 'monstera', 'indoor plant', 'greenery', 'pot', 'decor', 'flower'],
  },
  {
    id: 'plant_snake_tall',
    name: 'Tall Sansevieria Snake Plant',
    category: 'decor',
    description: 'Minimalist fluted cylinder pot with tall upright architectural foliage',
    defaultDimensions: [0.35, 0.95, 0.35],
    compatiblePresets: ['Warm Beige', 'Matte Black', 'Terracotta', 'Ivory Leather'],
    tags: ['plant', 'snake plant', 'sansevieria', 'greenery', 'pot', 'decor'],
  },
  {
    id: 'mirror_arched_floor',
    name: 'Full-Length Arched Mirror',
    category: 'decor',
    description: 'Full-length leaning floor mirror with thin metal frame & crystal reflection',
    defaultDimensions: [0.65, 1.70, 0.10],
    compatiblePresets: ['Brushed Brass', 'Matte Black', 'Chrome Steel'],
    tags: ['mirror', 'floor mirror', 'reflection', 'decor', 'arched', 'glass'],
  },
  {
    id: 'rug_area_large',
    name: 'Textured Wool Area Rug',
    category: 'decor',
    description: 'Low-profile textured floor area rug with subtle Scandinavian woven border',
    defaultDimensions: [2.0, 0.015, 2.8],
    compatiblePresets: ['Warm Beige', 'Grey Fabric', 'Navy Velvet', 'Terracotta'],
    tags: ['rug', 'carpet', 'mat', 'floor rug', 'wool', 'decor'],
  },

  // ── 7. Wall-Mounted Items ──
  {
    id: 'wall_tv_flat',
    name: 'Wall-Mounted Flat Screen TV',
    category: 'storage' as any,
    description: 'Ultra-slim wall-mounted flat screen television with thin black bezel and subtle screen sheen',
    defaultDimensions: [1.4, 0.80, 0.05] as [number, number, number],
    compatiblePresets: ['Matte Black', 'Chrome Steel'],
    tags: ['tv', 'wall tv', 'television', 'wall mounted', 'screen', 'display'],
  },
  {
    id: 'wall_art_canvas',
    name: 'Framed Canvas Art',
    category: 'decor',
    description: 'Abstract or landscape framed canvas print with thin wooden or black outer border',
    defaultDimensions: [1.0, 0.75, 0.03] as [number, number, number],
    compatiblePresets: ['Dark Walnut', 'Oak Wood', 'Matte Black'],
    tags: ['art', 'wall art', 'painting', 'canvas', 'frame', 'picture', 'decor'],
  },
  {
    id: 'wall_mirror_circular',
    name: 'Circular Wall Mirror',
    category: 'decor',
    description: 'Round framed wall mirror with brass or black metal surround',
    defaultDimensions: [0.8, 0.80, 0.03] as [number, number, number],
    compatiblePresets: ['Brushed Brass', 'Matte Black', 'Chrome Steel'],
    tags: ['mirror', 'wall mirror', 'circular', 'round', 'reflection', 'decor'],
  },
  {
    id: 'wall_clock_minimal',
    name: 'Minimalist Wall Clock',
    category: 'decor',
    description: 'Clean circular face with slim metal indicators and minimal design',
    defaultDimensions: [0.4, 0.40, 0.03] as [number, number, number],
    compatiblePresets: ['Matte Black', 'Brushed Brass', 'Chrome Steel'],
    tags: ['clock', 'wall clock', 'time', 'minimal', 'decor'],
  },
];

export type CatalogCategoryFilter =
  | 'All'
  | 'Seating'
  | 'Tables'
  | 'Storage'
  | 'Lighting'
  | 'Decor & Greenery'
  | 'Beds';

export const CATALOG_CATEGORIES: CatalogCategoryFilter[] = [
  'All',
  'Seating',
  'Tables',
  'Storage',
  'Lighting',
  'Decor & Greenery',
  'Beds',
];

export function getTemplatesForGroup(group: CatalogCategoryFilter): CatalogTemplate[] {
  if (group === 'All') return CATALOG_ITEMS;
  if (group === 'Beds') return CATALOG_ITEMS.filter((i) => i.category === 'bed');
  if (group === 'Seating') {
    return CATALOG_ITEMS.filter(
      (i) => i.category === 'sofa' || i.category === 'armchair' || i.category === 'chair' || i.category === 'pouf'
    );
  }
  if (group === 'Tables') {
    return CATALOG_ITEMS.filter((i) => i.category === 'desk' || i.category === 'table');
  }
  if (group === 'Storage') {
    return CATALOG_ITEMS.filter(
      (i) =>
        i.category === 'wardrobe' ||
        i.category === 'bookshelf' ||
        i.category === 'nightstand' ||
        i.category === 'storage'
    );
  }
  if (group === 'Lighting') {
    return CATALOG_ITEMS.filter((i) => i.category === 'lighting');
  }
  if (group === 'Decor & Greenery') {
    return CATALOG_ITEMS.filter((i) => i.category === 'decor');
  }
  return CATALOG_ITEMS;
}

export function getTemplatesForCategory(category: string): CatalogTemplate[] {
  const norm = category.toLowerCase().trim();

  if (norm.includes('bed')) {
    return CATALOG_ITEMS.filter((i) => i.category === 'bed');
  }
  if (norm.includes('armchair')) {
    return CATALOG_ITEMS.filter((i) => i.category === 'armchair' || i.category === 'chair');
  }
  if (norm.includes('chair')) {
    return CATALOG_ITEMS.filter((i) => i.category === 'chair' || i.category === 'armchair' || i.category === 'pouf');
  }
  if (norm.includes('pouf') || norm.includes('ottoman') || norm.includes('stool')) {
    return CATALOG_ITEMS.filter((i) => i.category === 'pouf');
  }
  if (norm.includes('desk')) {
    return CATALOG_ITEMS.filter((i) => i.category === 'desk' || i.category === 'table');
  }
  if (norm.includes('coffee') || norm.includes('dining') || norm.includes('table')) {
    return CATALOG_ITEMS.filter((i) => i.category === 'table' || i.category === 'desk');
  }
  if (norm.includes('wardrobe') || norm.includes('closet') || norm.includes('cabinet') || norm.includes('dresser')) {
    return CATALOG_ITEMS.filter((i) => i.category === 'wardrobe');
  }
  if (norm.includes('book')) {
    return CATALOG_ITEMS.filter((i) => i.category === 'bookshelf');
  }
  if (norm.includes('nightstand')) {
    return CATALOG_ITEMS.filter((i) => i.category === 'nightstand');
  }
  if (norm.includes('sofa') || norm.includes('couch')) {
    return CATALOG_ITEMS.filter((i) => i.category === 'sofa');
  }
  if (norm.includes('lamp') || norm.includes('light')) {
    return CATALOG_ITEMS.filter((i) => i.category === 'lighting');
  }
  if (norm.includes('plant') || norm.includes('tree') || norm.includes('flower') || norm.includes('monstera') || norm.includes('snake')) {
    return CATALOG_ITEMS.filter((i) => i.id.includes('plant'));
  }
  if (norm.includes('mirror')) {
    return CATALOG_ITEMS.filter((i) => i.id.includes('mirror'));
  }
  if (norm.includes('rug') || norm.includes('carpet') || norm.includes('mat')) {
    return CATALOG_ITEMS.filter((i) => i.id.includes('rug'));
  }
  if (norm.includes('tv') || norm.includes('media') || norm.includes('console') || norm.includes('stand') || norm.includes('coat')) {
    return CATALOG_ITEMS.filter((i) => i.category === 'storage');
  }

  // Fallback: match by direct category or return all
  const matched = CATALOG_ITEMS.filter((i) => (i.category as string) === norm);
  return matched.length > 0 ? matched : CATALOG_ITEMS.slice(0, 4);
}

export function getTemplateById(id: string): CatalogTemplate | undefined {
  return CATALOG_ITEMS.find((i) => i.id === id);
}
