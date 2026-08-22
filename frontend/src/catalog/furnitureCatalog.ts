// ─── Curated 3D Furniture Template Catalog ────────────────────────────────────

export interface MaterialPreset {
  id: string;
  name: string;
  category: 'wood' | 'fabric' | 'leather' | 'metal';
  color: string;
  roughness: number;
  metalness: number;
}

export interface CatalogTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  defaultDimensions: [number, number, number]; // [W, H, D] in meters
  thumbnail: string;
  compatiblePresets: string[];
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
};

// ─── Curated Catalog Items ───────────────────────────────────────────────────

export const CATALOG_ITEMS: CatalogTemplate[] = [
  // ── Bed Category ──
  {
    id: 'bed_modern_double',
    name: 'Modern Double Bed',
    category: 'bed',
    description: 'Contemporary upholstered bed with dual plush pillows & duvet',
    defaultDimensions: [1.8, 1.1, 2.1],
    thumbnail: '🛏️',
    compatiblePresets: ['Warm Beige', 'Navy Velvet', 'Grey Fabric', 'Dark Walnut'],
  },
  {
    id: 'bed_minimalist',
    name: 'Minimalist Platform Bed',
    category: 'bed',
    description: 'Low-profile wooden platform bed with floating side rails',
    defaultDimensions: [1.6, 0.75, 2.05],
    thumbnail: '🛌',
    compatiblePresets: ['Oak Wood', 'Scandi Ash', 'Dark Walnut', 'Matte Black'],
  },

  // ── Seating: Chair & Armchair ──
  {
    id: 'armchair_lounge',
    name: 'Lounge Accent Armchair',
    category: 'armchair',
    description: 'Deep lounge armchair with curved backrest and tapered wooden legs',
    defaultDimensions: [0.85, 0.90, 0.85],
    thumbnail: '🪑',
    compatiblePresets: ['Navy Velvet', 'Cognac Leather', 'Warm Beige', 'Grey Fabric'],
  },
  {
    id: 'chair_dining',
    name: 'Scandi Dining Chair',
    category: 'chair',
    description: 'Minimalist dining chair with upholstered seat pad & angled legs',
    defaultDimensions: [0.55, 0.85, 0.55],
    thumbnail: '🪑',
    compatiblePresets: ['Oak Wood', 'Grey Fabric', 'Matte Black', 'Scandi Ash'],
  },
  {
    id: 'chair_office',
    name: 'Ergonomic Office Chair',
    category: 'chair',
    description: 'Executive swivel mesh chair with 5-star base & armrests',
    defaultDimensions: [0.65, 1.05, 0.65],
    thumbnail: '💺',
    compatiblePresets: ['Matte Black', 'Chrome Steel', 'Grey Fabric', 'Ivory Leather'],
  },

  // ── Desk & Table ──
  {
    id: 'desk_wooden',
    name: 'Modern Study Desk',
    category: 'desk',
    description: 'Clean workstation with dual storage drawers & cable pass',
    defaultDimensions: [1.4, 0.75, 0.70],
    thumbnail: '💻',
    compatiblePresets: ['Oak Wood', 'Dark Walnut', 'Scandi Ash', 'Matte Black'],
  },
  {
    id: 'table_coffee',
    name: 'Two-Tier Coffee Table',
    category: 'table',
    description: 'Low minimalist living room coffee table with lower magazine shelf',
    defaultDimensions: [1.1, 0.45, 0.60],
    thumbnail: '☕',
    compatiblePresets: ['Oak Wood', 'Dark Walnut', 'Brushed Brass', 'Matte Black'],
  },
  {
    id: 'table_dining_round',
    name: 'Round Dining Table',
    category: 'table',
    description: 'Mid-century modern round dining table with pedestal base',
    defaultDimensions: [1.2, 0.76, 1.2],
    thumbnail: '🍽️',
    compatiblePresets: ['Dark Walnut', 'Oak Wood', 'Scandi Ash', 'Matte Black'],
  },

  // ── Wardrobe, Bookshelf & Nightstand ──
  {
    id: 'wardrobe_two_door',
    name: 'Two-Door Wardrobe',
    category: 'wardrobe',
    description: 'Modern full-height double-door wardrobe with metal handles',
    defaultDimensions: [1.2, 2.0, 0.60],
    thumbnail: '🚪',
    compatiblePresets: ['Dark Walnut', 'Oak Wood', 'Matte Black', 'Scandi Ash'],
  },
  {
    id: 'bookshelf_tall',
    name: '5-Tier Geometric Bookshelf',
    category: 'bookshelf',
    description: 'Tall open-back display shelving unit with staggered dividers',
    defaultDimensions: [0.90, 1.85, 0.35],
    thumbnail: '📚',
    compatiblePresets: ['Oak Wood', 'Dark Walnut', 'Matte Black', 'Brushed Brass'],
  },
  {
    id: 'nightstand_modern',
    name: 'Modern Bedside Nightstand',
    category: 'nightstand',
    description: 'Bedside drawer unit with brass knob & splayed legs',
    defaultDimensions: [0.50, 0.55, 0.45],
    thumbnail: '🪞',
    compatiblePresets: ['Oak Wood', 'Dark Walnut', 'Scandi Ash', 'Matte Black'],
  },

  // ── Sofa ──
  {
    id: 'sofa_three_seater',
    name: 'Contemporary 3-Seater Sofa',
    category: 'sofa',
    description: 'Plush three-seater sofa with structured armrests & lumbar cushions',
    defaultDimensions: [2.1, 0.85, 0.95],
    thumbnail: '🛋️',
    compatiblePresets: ['Grey Fabric', 'Navy Velvet', 'Warm Beige', 'Cognac Leather'],
  },
  {
    id: 'sofa_sectional',
    name: 'L-Shaped Sectional Sofa',
    category: 'sofa',
    description: 'Spacious sectional sofa with reversible chaise lounge',
    defaultDimensions: [2.6, 0.85, 1.6],
    thumbnail: '🛋️',
    compatiblePresets: ['Grey Fabric', 'Warm Beige', 'Navy Velvet', 'Ivory Leather'],
  },
];

export function getTemplatesForCategory(category: string): CatalogTemplate[] {
  const norm = category.toLowerCase().trim();
  
  if (norm.includes('bed')) {
    return CATALOG_ITEMS.filter((i) => i.category === 'bed');
  }
  if (norm.includes('armchair')) {
    return CATALOG_ITEMS.filter((i) => i.category === 'armchair' || i.category === 'chair');
  }
  if (norm.includes('chair')) {
    return CATALOG_ITEMS.filter((i) => i.category === 'chair' || i.category === 'armchair');
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

  // Fallback: match by direct category or return all
  const matched = CATALOG_ITEMS.filter((i) => i.category === norm);
  return matched.length > 0 ? matched : CATALOG_ITEMS.slice(0, 4);
}

export function getTemplateById(id: string): CatalogTemplate | undefined {
  return CATALOG_ITEMS.find((i) => i.id === id);
}
