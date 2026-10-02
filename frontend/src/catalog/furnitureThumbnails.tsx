
interface FurnitureThumbnailProps {
  templateId: string;
  category: string;
  className?: string;
}

export function FurnitureThumbnail({ templateId, category, className = 'w-full h-full' }: FurnitureThumbnailProps) {
  const key = templateId.toLowerCase();

  // ── 1. Beds ────────────────────────────────────────────────────────────────
  if (key.includes('bed_modern_double') || key === 'bed_modern_double') {
    return (
      <svg viewBox="0 0 80 56" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <rect width="80" height="56" rx="6" fill="#18181b" />
        {/* Headboard */}
        <path d="M18 16 L62 16 L62 26 L18 26 Z" fill="#3f3f46" stroke="#71717a" strokeWidth="1" />
        {/* Mattress Base */}
        <polygon points="18,24 62,24 68,44 12,44" fill="#27272a" stroke="#52525b" strokeWidth="1" />
        {/* Pillows */}
        <rect x="23" y="22" width="14" height="7" rx="2" fill="#e4e4e7" stroke="#a1a1aa" strokeWidth="0.8" />
        <rect x="43" y="22" width="14" height="7" rx="2" fill="#e4e4e7" stroke="#a1a1aa" strokeWidth="0.8" />
        {/* Duvet / Blanket */}
        <polygon points="16,32 64,32 68,44 12,44" fill="#a1a1aa" opacity="0.3" stroke="#d4d4d8" strokeWidth="0.8" />
      </svg>
    );
  }

  if (key.includes('bed_upholstered') || key.includes('upholstered')) {
    return (
      <svg viewBox="0 0 80 56" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <rect width="80" height="56" rx="6" fill="#18181b" />
        {/* Tufted Headboard */}
        <rect x="16" y="14" width="48" height="13" rx="3" fill="#475569" stroke="#94a3b8" strokeWidth="1" />
        <line x1="32" y1="14" x2="32" y2="27" stroke="#64748b" strokeWidth="0.8" strokeDasharray="2 2" />
        <line x1="48" y1="14" x2="48" y2="27" stroke="#64748b" strokeWidth="0.8" strokeDasharray="2 2" />
        {/* Bed Body */}
        <polygon points="18,26 62,26 68,45 12,45" fill="#334155" stroke="#64748b" strokeWidth="1" />
        {/* Pillows */}
        <rect x="22" y="24" width="15" height="7" rx="2" fill="#f1f5f9" />
        <rect x="43" y="24" width="15" height="7" rx="2" fill="#f1f5f9" />
      </svg>
    );
  }

  if (key.includes('bed_platform') || key.includes('bed_minimalist') || category === 'bed') {
    return (
      <svg viewBox="0 0 80 56" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <rect width="80" height="56" rx="6" fill="#18181b" />
        {/* Wood Headboard Plank */}
        <rect x="14" y="17" width="52" height="9" rx="1.5" fill="#78350f" stroke="#b45309" strokeWidth="1" />
        {/* Wood Platform */}
        <polygon points="14,24 66,24 72,44 8,44" fill="#92400e" stroke="#d97706" strokeWidth="0.8" />
        {/* Mattress Inset */}
        <polygon points="20,25 60,25 64,42 16,42" fill="#f4f4f5" stroke="#a1a1aa" strokeWidth="0.8" />
        <rect x="26" y="24" width="12" height="6" rx="1.5" fill="#e4e4e7" />
        <rect x="42" y="24" width="12" height="6" rx="1.5" fill="#e4e4e7" />
      </svg>
    );
  }

  // ── 2. Sofas & Seating ──────────────────────────────────────────────────────
  if (key.includes('sofa_sectional') || key.includes('sectional')) {
    return (
      <svg viewBox="0 0 80 56" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <rect width="80" height="56" rx="6" fill="#18181b" />
        {/* L-Shape Backrest */}
        <path d="M12 18 L68 18 L68 25 L32 25 L32 44 L22 44 L22 18 Z" fill="#3f3f46" stroke="#71717a" strokeWidth="1" />
        {/* L-Shape Seat Cushion */}
        <polygon points="22,25 68,25 68,36 32,36 32,46 12,46 12,25" fill="#52525b" stroke="#a1a1aa" strokeWidth="0.8" />
        <line x1="45" y1="25" x2="45" y2="36" stroke="#71717a" strokeWidth="0.8" />
      </svg>
    );
  }

  if (key.includes('sofa_leather') || key.includes('leather')) {
    return (
      <svg viewBox="0 0 80 56" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <rect width="80" height="56" rx="6" fill="#18181b" />
        {/* Leather Backrest with Rich Sheen */}
        <rect x="14" y="16" width="52" height="12" rx="3" fill="#451a03" stroke="#78350f" strokeWidth="1" />
        {/* Armrests */}
        <rect x="10" y="22" width="7" height="20" rx="3" fill="#78350f" stroke="#92400e" strokeWidth="0.8" />
        <rect x="63" y="22" width="7" height="20" rx="3" fill="#78350f" stroke="#92400e" strokeWidth="0.8" />
        {/* 3 Leather Cushions */}
        <rect x="17" y="24" width="15" height="17" rx="2" fill="#92400e" stroke="#b45309" strokeWidth="0.8" />
        <rect x="32" y="24" width="16" height="17" rx="2" fill="#92400e" stroke="#b45309" strokeWidth="0.8" />
        <rect x="48" y="24" width="15" height="17" rx="2" fill="#92400e" stroke="#b45309" strokeWidth="0.8" />
      </svg>
    );
  }

  if (category === 'sofa' || key.includes('sofa')) {
    return (
      <svg viewBox="0 0 80 56" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <rect width="80" height="56" rx="6" fill="#18181b" />
        {/* Sofa Backrest */}
        <rect x="15" y="17" width="50" height="11" rx="3" fill="#3f3f46" stroke="#71717a" strokeWidth="1" />
        {/* Left Armrest */}
        <rect x="11" y="22" width="6" height="20" rx="3" fill="#52525b" stroke="#71717a" strokeWidth="0.8" />
        {/* Right Armrest */}
        <rect x="63" y="22" width="6" height="20" rx="3" fill="#52525b" stroke="#71717a" strokeWidth="0.8" />
        {/* 3 Seat Cushions */}
        <rect x="17" y="24" width="15.3" height="17" rx="2" fill="#71717a" stroke="#a1a1aa" strokeWidth="0.8" />
        <rect x="32.3" y="24" width="15.3" height="17" rx="2" fill="#71717a" stroke="#a1a1aa" strokeWidth="0.8" />
        <rect x="47.6" y="24" width="15.3" height="17" rx="2" fill="#71717a" stroke="#a1a1aa" strokeWidth="0.8" />
      </svg>
    );
  }

  if (category === 'armchair' || key.includes('armchair')) {
    return (
      <svg viewBox="0 0 80 56" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <rect width="80" height="56" rx="6" fill="#18181b" />
        {/* Backrest Curve */}
        <path d="M25 15 C25 13 55 13 55 15 L55 28 L25 28 Z" fill="#312e81" stroke="#4f46e5" strokeWidth="1" />
        {/* Arms */}
        <rect x="20" y="23" width="7" height="19" rx="3.5" fill="#4338ca" stroke="#6366f1" strokeWidth="0.8" />
        <rect x="53" y="23" width="7" height="19" rx="3.5" fill="#4338ca" stroke="#6366f1" strokeWidth="0.8" />
        {/* Seat Cushion */}
        <rect x="27" y="25" width="26" height="17" rx="3" fill="#6366f1" stroke="#818cf8" strokeWidth="0.8" />
      </svg>
    );
  }

  if (key.includes('office') || key.includes('mesh')) {
    return (
      <svg viewBox="0 0 80 56" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <rect width="80" height="56" rx="6" fill="#18181b" />
        {/* Headrest */}
        <rect x="33" y="11" width="14" height="5" rx="2.5" fill="#27272a" stroke="#52525b" strokeWidth="0.8" />
        {/* Mesh Backrest */}
        <rect x="29" y="17" width="22" height="16" rx="3" fill="#18181b" stroke="#71717a" strokeWidth="1" strokeDasharray="2 2" />
        {/* Seat Pad */}
        <rect x="26" y="32" width="28" height="8" rx="2.5" fill="#3f3f46" stroke="#71717a" strokeWidth="0.8" />
        {/* Star Base */}
        <line x1="40" y1="40" x2="40" y2="44" stroke="#a1a1aa" strokeWidth="2" />
        <line x1="40" y1="44" x2="28" y2="48" stroke="#a1a1aa" strokeWidth="1.5" />
        <line x1="40" y1="44" x2="52" y2="48" stroke="#a1a1aa" strokeWidth="1.5" />
        <line x1="40" y1="44" x2="40" y2="49" stroke="#a1a1aa" strokeWidth="1.5" />
      </svg>
    );
  }

  if (category === 'chair' || key.includes('chair')) {
    return (
      <svg viewBox="0 0 80 56" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <rect width="80" height="56" rx="6" fill="#18181b" />
        {/* Spindle Backrest */}
        <rect x="27" y="14" width="26" height="4" rx="2" fill="#78350f" />
        <line x1="31" y1="18" x2="31" y2="30" stroke="#b45309" strokeWidth="1.2" />
        <line x1="40" y1="18" x2="40" y2="30" stroke="#b45309" strokeWidth="1.2" />
        <line x1="49" y1="18" x2="49" y2="30" stroke="#b45309" strokeWidth="1.2" />
        {/* Seat */}
        <rect x="25" y="30" width="30" height="6" rx="2" fill="#d97706" stroke="#f59e0b" strokeWidth="0.8" />
        {/* Splayed Legs */}
        <line x1="28" y1="36" x2="25" y2="48" stroke="#78350f" strokeWidth="1.5" />
        <line x1="52" y1="36" x2="55" y2="48" stroke="#78350f" strokeWidth="1.5" />
      </svg>
    );
  }

  if (category === 'pouf' || key.includes('pouf') || key.includes('ottoman')) {
    return (
      <svg viewBox="0 0 80 56" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <rect width="80" height="56" rx="6" fill="#18181b" />
        <ellipse cx="40" cy="34" rx="22" ry="12" fill="#e4e4e7" stroke="#a1a1aa" strokeWidth="1" />
        <ellipse cx="40" cy="27" rx="20" ry="10" fill="#f4f4f5" stroke="#d4d4d8" strokeWidth="0.8" />
        <circle cx="40" cy="27" r="2.5" fill="#71717a" />
      </svg>
    );
  }

  // ── 3. Desks & Tables ───────────────────────────────────────────────────────
  if (key.includes('desk_wooden') || key.includes('desk_minimal') || category === 'desk') {
    return (
      <svg viewBox="0 0 80 56" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <rect width="80" height="56" rx="6" fill="#18181b" />
        {/* Desktop Surface */}
        <polygon points="16,21 64,21 68,30 12,30" fill="#b45309" stroke="#d97706" strokeWidth="1" />
        {/* Drawers block on right */}
        <rect x="49" y="30" width="16" height="15" rx="1.5" fill="#78350f" stroke="#b45309" strokeWidth="0.8" />
        <line x1="51" y1="37" x2="63" y2="37" stroke="#d97706" strokeWidth="0.8" />
        {/* Left Legs */}
        <line x1="14" y1="30" x2="14" y2="47" stroke="#451a03" strokeWidth="2" strokeLinecap="round" />
        <line x1="20" y1="30" x2="20" y2="47" stroke="#451a03" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }

  if (key.includes('coffee_glass') || key.includes('glass')) {
    return (
      <svg viewBox="0 0 80 56" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <rect width="80" height="56" rx="6" fill="#18181b" />
        {/* Glass Reflection Highlight Top */}
        <polygon points="20,24 60,24 66,35 14,35" fill="rgba(56, 189, 248, 0.25)" stroke="#38bdf8" strokeWidth="1" />
        <line x1="24" y1="26" x2="46" y2="26" stroke="#e0f2fe" strokeWidth="1" strokeLinecap="round" />
        {/* Sleek Metal Frame & Legs */}
        <line x1="16" y1="35" x2="16" y2="46" stroke="#94a3b8" strokeWidth="2" />
        <line x1="64" y1="35" x2="64" y2="46" stroke="#94a3b8" strokeWidth="2" />
        <line x1="16" y1="44" x2="64" y2="44" stroke="#64748b" strokeWidth="1" />
      </svg>
    );
  }

  if (key.includes('dining_round') || key.includes('round')) {
    return (
      <svg viewBox="0 0 80 56" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <rect width="80" height="56" rx="6" fill="#18181b" />
        {/* Round Top */}
        <ellipse cx="40" cy="24" rx="24" ry="11" fill="#78350f" stroke="#b45309" strokeWidth="1" />
        <ellipse cx="40" cy="23" rx="22" ry="9.5" fill="#92400e" />
        {/* Pedestal Stem & Base */}
        <line x1="40" y1="30" x2="40" y2="44" stroke="#451a03" strokeWidth="4" />
        <ellipse cx="40" cy="45" rx="14" ry="4" fill="#78350f" stroke="#b45309" strokeWidth="0.8" />
      </svg>
    );
  }

  if (category === 'table' || key.includes('coffee') || key.includes('table')) {
    return (
      <svg viewBox="0 0 80 56" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <rect width="80" height="56" rx="6" fill="#18181b" />
        {/* Table Top */}
        <polygon points="18,22 62,22 68,32 12,32" fill="#78350f" stroke="#b45309" strokeWidth="1" />
        {/* Lower Magazine Shelf */}
        <polygon points="19,37 61,37 65,41 15,41" fill="#451a03" opacity="0.6" stroke="#78350f" strokeWidth="0.8" />
        {/* Legs */}
        <line x1="15" y1="32" x2="15" y2="46" stroke="#b45309" strokeWidth="2" />
        <line x1="65" y1="32" x2="65" y2="46" stroke="#b45309" strokeWidth="2" />
      </svg>
    );
  }

  // ── 4. Storage & Nightstands ────────────────────────────────────────────────
  if (category === 'wardrobe' || key.includes('wardrobe')) {
    return (
      <svg viewBox="0 0 80 56" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <rect width="80" height="56" rx="6" fill="#18181b" />
        {/* Tall Wardrobe Cabinet */}
        <rect x="24" y="10" width="32" height="38" rx="2" fill="#27272a" stroke="#52525b" strokeWidth="1" />
        {/* Door Seam */}
        <line x1="40" y1="10" x2="40" y2="48" stroke="#71717a" strokeWidth="1" />
        {/* Long Handles */}
        <line x1="38" y1="26" x2="38" y2="34" stroke="#d4af37" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="42" y1="26" x2="42" y2="34" stroke="#d4af37" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }

  if (category === 'bookshelf' || key.includes('bookshelf')) {
    return (
      <svg viewBox="0 0 80 56" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <rect width="80" height="56" rx="6" fill="#18181b" />
        {/* Outer Frame */}
        <rect x="25" y="11" width="30" height="37" rx="2" fill="#18181b" stroke="#71717a" strokeWidth="1" />
        {/* 4 Shelves */}
        <line x1="25" y1="20" x2="55" y2="20" stroke="#71717a" strokeWidth="1" />
        <line x1="25" y1="29" x2="55" y2="29" stroke="#71717a" strokeWidth="1" />
        <line x1="25" y1="38" x2="55" y2="38" stroke="#71717a" strokeWidth="1" />
        {/* Books on Shelves */}
        <rect x="28" y="14" width="4" height="6" fill="#e11d48" />
        <rect x="33" y="13" width="3" height="7" fill="#2563eb" />
        <rect x="42" y="23" width="4" height="6" fill="#d97706" />
        <rect x="47" y="22" width="5" height="7" fill="#10b981" />
      </svg>
    );
  }

  if (category === 'nightstand' || key.includes('nightstand')) {
    return (
      <svg viewBox="0 0 80 56" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <rect width="80" height="56" rx="6" fill="#18181b" />
        {/* Nightstand Box */}
        <rect x="26" y="18" width="28" height="20" rx="2" fill="#3f3f46" stroke="#71717a" strokeWidth="1" />
        {/* Drawer Divider */}
        <line x1="26" y1="28" x2="54" y2="28" stroke="#52525b" strokeWidth="1" />
        {/* Brass Knobs */}
        <circle cx="40" cy="23" r="1.5" fill="#d4af37" />
        <circle cx="40" cy="33" r="1.5" fill="#d4af37" />
        {/* Legs */}
        <line x1="29" y1="38" x2="27" y2="47" stroke="#71717a" strokeWidth="1.5" />
        <line x1="51" y1="38" x2="53" y2="47" stroke="#71717a" strokeWidth="1.5" />
      </svg>
    );
  }

  if (key.includes('tv_console') || key.includes('console')) {
    return (
      <svg viewBox="0 0 80 56" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <rect width="80" height="56" rx="6" fill="#18181b" />
        {/* Credenza Low Box */}
        <rect x="15" y="32" width="50" height="13" rx="2" fill="#3f3f46" stroke="#71717a" strokeWidth="1" />
        <line x1="32" y1="32" x2="32" y2="45" stroke="#52525b" strokeWidth="0.8" />
        <line x1="48" y1="32" x2="48" y2="45" stroke="#52525b" strokeWidth="0.8" />
        {/* TV Screen above Console */}
        <rect x="22" y="13" width="36" height="17" rx="1.5" fill="#09090b" stroke="#71717a" strokeWidth="1" />
        <line x1="40" y1="30" x2="40" y2="32" stroke="#71717a" strokeWidth="2" />
      </svg>
    );
  }

  if (key.includes('coat_rack') || key.includes('coat')) {
    return (
      <svg viewBox="0 0 80 56" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <rect width="80" height="56" rx="6" fill="#18181b" />
        {/* Base */}
        <ellipse cx="40" cy="46" rx="10" ry="3.5" fill="#78350f" stroke="#b45309" strokeWidth="0.8" />
        {/* Pole */}
        <line x1="40" y1="12" x2="40" y2="46" stroke="#78350f" strokeWidth="2.5" />
        {/* Peg Hooks */}
        <line x1="40" y1="16" x2="48" y2="13" stroke="#b45309" strokeWidth="1.8" strokeLinecap="round" />
        <line x1="40" y1="20" x2="32" y2="17" stroke="#b45309" strokeWidth="1.8" strokeLinecap="round" />
        <line x1="40" y1="25" x2="47" y2="22" stroke="#b45309" strokeWidth="1.8" strokeLinecap="round" />
        <line x1="40" y1="30" x2="33" y2="28" stroke="#b45309" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  // ── 5. Lighting ─────────────────────────────────────────────────────────────
  if (key.includes('lamp_floor_arc') || key.includes('arc')) {
    return (
      <svg viewBox="0 0 80 56" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <rect width="80" height="56" rx="6" fill="#18181b" />
        {/* Heavy Base */}
        <ellipse cx="58" cy="46" rx="8" ry="3" fill="#3f3f46" stroke="#71717a" strokeWidth="0.8" />
        {/* Sweeping Arc Pole */}
        <path d="M58 45 L58 30 C58 12 28 12 28 24" fill="none" stroke="#d4af37" strokeWidth="1.8" strokeLinecap="round" />
        {/* Dome Shade */}
        <path d="M22 25 C22 20 34 20 34 25 Z" fill="#fef08a" stroke="#ca8a04" strokeWidth="1" />
        {/* Warm Glow */}
        <circle cx="28" cy="27" r="4" fill="#fef08a" opacity="0.4" />
      </svg>
    );
  }

  if (key.includes('lamp_tripod') || key.includes('tripod')) {
    return (
      <svg viewBox="0 0 80 56" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <rect width="80" height="56" rx="6" fill="#18181b" />
        {/* Linen Drum Shade */}
        <rect x="31" y="13" width="18" height="12" rx="1.5" fill="#fef08a" opacity="0.9" stroke="#ca8a04" strokeWidth="1" />
        {/* 3 Tripod Legs */}
        <line x1="40" y1="25" x2="28" y2="47" stroke="#78350f" strokeWidth="1.6" />
        <line x1="40" y1="25" x2="52" y2="47" stroke="#78350f" strokeWidth="1.6" />
        <line x1="40" y1="25" x2="40" y2="48" stroke="#78350f" strokeWidth="1.6" />
      </svg>
    );
  }

  if (category === 'lighting' || key.includes('lamp')) {
    return (
      <svg viewBox="0 0 80 56" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <rect width="80" height="56" rx="6" fill="#18181b" />
        {/* Base */}
        <ellipse cx="40" cy="44" rx="10" ry="3" fill="#52525b" />
        {/* Stem */}
        <line x1="40" y1="24" x2="40" y2="44" stroke="#a1a1aa" strokeWidth="2" />
        {/* Shade */}
        <polygon points="31,24 49,24 46,14 34,14" fill="#fef08a" stroke="#ca8a04" strokeWidth="1" />
      </svg>
    );
  }

  // ── 6. Decor & Plants ───────────────────────────────────────────────────────
  if (key.includes('monstera') || key.includes('plant')) {
    return (
      <svg viewBox="0 0 80 56" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <rect width="80" height="56" rx="6" fill="#18181b" />
        {/* Ceramic Planter */}
        <polygon points="32,34 48,34 46,47 34,47" fill="#f4f4f5" stroke="#d4d4d8" strokeWidth="1" />
        {/* Monstera Leaves */}
        <path d="M40 34 Q34 24 24 22 Q27 30 38 33" fill="#16a34a" stroke="#15803d" strokeWidth="0.8" />
        <path d="M40 34 Q45 20 56 18 Q52 28 42 33" fill="#15803d" stroke="#166534" strokeWidth="0.8" />
        <path d="M40 34 Q40 16 43 12 Q45 24 41 33" fill="#22c55e" stroke="#16a34a" strokeWidth="0.8" />
      </svg>
    );
  }

  if (key.includes('snake')) {
    return (
      <svg viewBox="0 0 80 56" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <rect width="80" height="56" rx="6" fill="#18181b" />
        {/* Planter */}
        <rect x="33" y="36" width="14" height="11" rx="2" fill="#e4e4e7" stroke="#a1a1aa" strokeWidth="1" />
        {/* Upright Blades */}
        <path d="M37 36 L36 12 L39 36 Z" fill="#15803d" stroke="#22c55e" strokeWidth="0.8" />
        <path d="M40 36 L41 9 L43 36 Z" fill="#16a34a" stroke="#4ade80" strokeWidth="0.8" />
        <path d="M43 36 L45 15 L45 36 Z" fill="#15803d" stroke="#22c55e" strokeWidth="0.8" />
      </svg>
    );
  }

  if (key.includes('rug') || key.includes('carpet')) {
    return (
      <svg viewBox="0 0 80 56" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <rect width="80" height="56" rx="6" fill="#18181b" />
        {/* Isometric Diamond Floor Rug */}
        <polygon points="40,16 66,28 40,40 14,28" fill="#d4d4d8" stroke="#a1a1aa" strokeWidth="1" />
        <polygon points="40,20 60,28 40,36 20,28" fill="#f4f4f5" stroke="#71717a" strokeWidth="0.8" strokeDasharray="2 2" />
      </svg>
    );
  }

  if (key.includes('mirror_arched') || key.includes('mirror')) {
    return (
      <svg viewBox="0 0 80 56" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <rect width="80" height="56" rx="6" fill="#18181b" />
        {/* Arched Mirror Frame */}
        <path d="M30 46 L30 22 C30 14 50 14 50 22 L50 46 Z" fill="#e0f2fe" stroke="#d4af37" strokeWidth="1.5" />
        {/* Reflection Shimmer */}
        <line x1="34" y1="26" x2="42" y2="18" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" />
        <line x1="36" y1="36" x2="46" y2="26" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    );
  }

  // ── 7. Wall-Mounted Decor & Tech ────────────────────────────────────────────
  if (key.includes('wall_tv')) {
    return (
      <svg viewBox="0 0 80 56" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <rect width="80" height="56" rx="6" fill="#18181b" />
        {/* Flush Flat Screen TV */}
        <rect x="16" y="16" width="48" height="25" rx="2" fill="#09090b" stroke="#3f3f46" strokeWidth="1.5" />
        {/* Screen Display Sheen */}
        <path d="M19 19 L42 19 L25 38 L19 38 Z" fill="rgba(255, 255, 255, 0.05)" />
        {/* Tiny Power Indicator */}
        <circle cx="40" cy="39" r="0.8" fill="#ef4444" />
      </svg>
    );
  }

  if (key.includes('wall_art') || key.includes('canvas')) {
    return (
      <svg viewBox="0 0 80 56" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <rect width="80" height="56" rx="6" fill="#18181b" />
        {/* Framed Canvas */}
        <rect x="22" y="14" width="36" height="28" rx="2" fill="#f8fafc" stroke="#78350f" strokeWidth="1.5" />
        {/* Abstract Art Strokes */}
        <circle cx="44" cy="22" r="5" fill="#f59e0b" />
        <path d="M26 36 Q34 26 42 32 T54 28" fill="none" stroke="#0284c7" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }

  if (key.includes('wall_mirror')) {
    return (
      <svg viewBox="0 0 80 56" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <rect width="80" height="56" rx="6" fill="#18181b" />
        {/* Circular Wall Mirror */}
        <circle cx="40" cy="28" r="16" fill="#f0f9ff" stroke="#d4af37" strokeWidth="1.8" />
        <line x1="33" y1="21" x2="42" y2="15" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="35" y1="35" x2="47" y2="23" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }

  if (key.includes('wall_clock')) {
    return (
      <svg viewBox="0 0 80 56" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <rect width="80" height="56" rx="6" fill="#18181b" />
        {/* Circular Clock Face */}
        <circle cx="40" cy="28" r="15" fill="#27272a" stroke="#71717a" strokeWidth="1.5" />
        {/* Hands */}
        <line x1="40" y1="28" x2="40" y2="18" stroke="#f4f4f5" strokeWidth="1.2" strokeLinecap="round" />
        <line x1="40" y1="28" x2="46" y2="28" stroke="#f59e0b" strokeWidth="1.2" strokeLinecap="round" />
        <circle cx="40" cy="28" r="1.5" fill="#f59e0b" />
      </svg>
    );
  }

  // ── Generic Fallback ────────────────────────────────────────────────────────
  return (
    <svg viewBox="0 0 80 56" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect width="80" height="56" rx="6" fill="#18181b" />
      <rect x="24" y="16" width="32" height="24" rx="3" fill="#3f3f46" stroke="#71717a" strokeWidth="1" />
      <line x1="24" y1="28" x2="56" y2="28" stroke="#52525b" strokeWidth="0.8" />
    </svg>
  );
}
