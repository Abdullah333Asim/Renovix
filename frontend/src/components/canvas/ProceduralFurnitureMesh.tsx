import { useMemo } from 'react';
import * as THREE from 'three';
import { MATERIAL_PRESETS } from '../../catalog/furnitureCatalog';

interface ProceduralFurnitureMeshProps {
  templateId?: string;
  category: string;
  dimensions: [number, number, number]; // [W, H, D]
  colorTint?: string;
  materialPreset?: string;
}

export function ProceduralFurnitureMesh({
  templateId = 'sofa_three_seater',
  category,
  dimensions,
  colorTint,
  materialPreset = 'Oak Wood',
}: ProceduralFurnitureMeshProps) {
  const [W, H, D] = dimensions;

  // Active PBR material values
  const preset = useMemo(() => {
    return MATERIAL_PRESETS[materialPreset] || MATERIAL_PRESETS['Oak Wood'];
  }, [materialPreset]);

  const activeColor = useMemo(() => {
    return colorTint || preset.color;
  }, [colorTint, preset]);

  // Primary Material (e.g. upholstery or wood body)
  const primaryMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(activeColor),
      roughness: preset.roughness,
      metalness: preset.metalness,
      envMapIntensity: 1.0,
    });
  }, [activeColor, preset]);

  // Secondary Accent Material (e.g. wood legs, handles, metal frame)
  const accentMaterial = useMemo(() => {
    const isWoodPrimary = preset.category === 'wood';
    return new THREE.MeshStandardMaterial({
      color: isWoodPrimary ? new THREE.Color('#1E2024') : new THREE.Color('#3B2317'),
      roughness: isWoodPrimary ? 0.4 : 0.65,
      metalness: isWoodPrimary ? 0.7 : 0.05,
    });
  }, [preset]);

  // White / Cushion Linen Accent
  const cushionMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color('#F0ECE1'),
      roughness: 0.95,
      metalness: 0.0,
    });
  }, []);

  // Handle / Metal accent
  const metalMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color('#D4AF37'),
      roughness: 0.35,
      metalness: 0.85,
    });
  }, []);

  // ── Render template-specific compound geometries ──────────────────────────

  const templateKey = templateId || category;

  // ── 1. BED TEMPLATES ──
  if (templateKey.includes('bed')) {
    const isMinimalist = templateKey.includes('minimalist');
    const legH = isMinimalist ? 0.12 : 0.18;
    const frameH = 0.22;
    const mattressH = 0.26;
    const headboardH = isMinimalist ? 0.55 : H - (legH + frameH);

    return (
      <group position={[0, 0, 0]}>
        {/* 4 Corner Legs */}
        {[
          [-W / 2 + 0.06, legH / 2, -D / 2 + 0.06],
          [W / 2 - 0.06, legH / 2, -D / 2 + 0.06],
          [-W / 2 + 0.06, legH / 2, D / 2 - 0.06],
          [W / 2 - 0.06, legH / 2, D / 2 - 0.06],
        ].map((pos, i) => (
          <mesh key={i} position={pos as [number, number, number]} material={accentMaterial} castShadow>
            <cylinderGeometry args={[0.035, 0.025, legH, 16]} />
          </mesh>
        ))}

        {/* Base Frame */}
        <mesh position={[0, legH + frameH / 2, 0]} material={primaryMaterial} castShadow receiveShadow>
          <boxGeometry args={[W * 0.98, frameH, D * 0.98]} />
        </mesh>

        {/* Mattress */}
        <mesh position={[0, legH + frameH + mattressH / 2, 0.04]} material={cushionMaterial} castShadow receiveShadow>
          <boxGeometry args={[W * 0.92, mattressH, D * 0.90]} />
        </mesh>

        {/* Headboard */}
        <mesh
          position={[0, legH + frameH + headboardH / 2 - 0.05, -D / 2 + 0.05]}
          material={primaryMaterial}
          castShadow
        >
          <boxGeometry args={[W, headboardH, 0.1]} />
        </mesh>

        {/* Two Pillows */}
        <mesh
          position={[-W * 0.24, legH + frameH + mattressH + 0.06, -D / 2 + 0.35]}
          rotation={[0.2, 0, 0]}
          material={cushionMaterial}
          castShadow
        >
          <boxGeometry args={[W * 0.40, 0.12, 0.38]} />
        </mesh>
        <mesh
          position={[W * 0.24, legH + frameH + mattressH + 0.06, -D / 2 + 0.35]}
          rotation={[0.2, 0, 0]}
          material={cushionMaterial}
          castShadow
        >
          <boxGeometry args={[W * 0.40, 0.12, 0.38]} />
        </mesh>

        {/* Duvet / Blanket */}
        <mesh
          position={[0, legH + frameH + mattressH + 0.02, 0.2]}
          material={primaryMaterial}
          castShadow
        >
          <boxGeometry args={[W * 0.93, 0.04, D * 0.55]} />
        </mesh>
      </group>
    );
  }

  // ── 2. SEATING: CHAIR / ARMCHAIR ──
  if (templateKey.includes('armchair')) {
    const seatH = 0.42;
    const legH = 0.18;
    return (
      <group position={[0, 0, 0]}>
        {/* 4 Wooden Splayed Legs */}
        {[
          [-W * 0.38, legH / 2, -D * 0.38],
          [W * 0.38, legH / 2, -D * 0.38],
          [-W * 0.38, legH / 2, D * 0.38],
          [W * 0.38, legH / 2, D * 0.38],
        ].map((pos, i) => (
          <mesh key={i} position={pos as [number, number, number]} material={accentMaterial} castShadow>
            <cylinderGeometry args={[0.03, 0.02, legH, 16]} />
          </mesh>
        ))}

        {/* Seat Base & Cushion */}
        <mesh position={[0, legH + (seatH - legH) / 2, 0]} material={primaryMaterial} castShadow receiveShadow>
          <boxGeometry args={[W * 0.85, seatH - legH, D * 0.85]} />
        </mesh>
        <mesh position={[0, seatH + 0.06, 0.04]} material={primaryMaterial} castShadow>
          <boxGeometry args={[W * 0.72, 0.12, D * 0.72]} />
        </mesh>

        {/* Backrest */}
        <mesh position={[0, seatH + (H - seatH) / 2, -D * 0.38]} material={primaryMaterial} castShadow>
          <boxGeometry args={[W * 0.85, H - seatH, 0.14]} />
        </mesh>

        {/* Left & Right Armrests */}
        <mesh position={[-W * 0.42, seatH + 0.14, 0]} material={primaryMaterial} castShadow>
          <boxGeometry args={[0.12, 0.28, D * 0.78]} />
        </mesh>
        <mesh position={[W * 0.42, seatH + 0.14, 0]} material={primaryMaterial} castShadow>
          <boxGeometry args={[0.12, 0.28, D * 0.78]} />
        </mesh>
      </group>
    );
  }

  if (templateKey.includes('office')) {
    return (
      <group position={[0, 0, 0]}>
        {/* 5-Star Wheel Base */}
        <mesh position={[0, 0.05, 0]} material={metalMaterial} castShadow>
          <cylinderGeometry args={[W * 0.42, W * 0.42, 0.04, 5]} />
        </mesh>
        {/* Center Pneumatic Cylinder */}
        <mesh position={[0, 0.22, 0]} material={metalMaterial} castShadow>
          <cylinderGeometry args={[0.035, 0.035, 0.35, 16]} />
        </mesh>
        {/* Seat Pan */}
        <mesh position={[0, 0.45, 0]} material={primaryMaterial} castShadow receiveShadow>
          <boxGeometry args={[W * 0.80, 0.08, D * 0.80]} />
        </mesh>
        {/* Mesh Backrest */}
        <mesh position={[0, 0.45 + (H - 0.45) / 2, -D * 0.35]} rotation={[-0.1, 0, 0]} material={primaryMaterial} castShadow>
          <boxGeometry args={[W * 0.75, H - 0.45, 0.05]} />
        </mesh>
        {/* Left & Right Armrests */}
        <mesh position={[-W * 0.42, 0.62, 0]} material={metalMaterial} castShadow>
          <boxGeometry args={[0.06, 0.24, 0.28]} />
        </mesh>
        <mesh position={[W * 0.42, 0.62, 0]} material={metalMaterial} castShadow>
          <boxGeometry args={[0.06, 0.24, 0.28]} />
        </mesh>
      </group>
    );
  }

  if (templateKey.includes('chair')) {
    const seatH = 0.46;
    return (
      <group position={[0, 0, 0]}>
        {/* 4 Legs */}
        {[
          [-W * 0.38, seatH / 2, -D * 0.38],
          [W * 0.38, seatH / 2, -D * 0.38],
          [-W * 0.38, seatH / 2, D * 0.38],
          [W * 0.38, seatH / 2, D * 0.38],
        ].map((pos, i) => (
          <mesh key={i} position={pos as [number, number, number]} material={accentMaterial} castShadow>
            <cylinderGeometry args={[0.025, 0.018, seatH, 12]} />
          </mesh>
        ))}
        {/* Seat Pad */}
        <mesh position={[0, seatH + 0.02, 0]} material={primaryMaterial} castShadow receiveShadow>
          <boxGeometry args={[W * 0.90, 0.05, D * 0.90]} />
        </mesh>
        {/* Backrest Splat */}
        <mesh position={[0, seatH + (H - seatH) / 2, -D * 0.40]} material={primaryMaterial} castShadow>
          <boxGeometry args={[W * 0.85, H - seatH, 0.04]} />
        </mesh>
      </group>
    );
  }

  // ── 3. DESK & TABLES ──
  if (templateKey.includes('desk')) {
    const topThick = 0.04;
    return (
      <group position={[0, 0, 0]}>
        {/* Desktop Slab */}
        <mesh position={[0, H - topThick / 2, 0]} material={primaryMaterial} castShadow receiveShadow>
          <boxGeometry args={[W, topThick, D]} />
        </mesh>
        {/* 2 Left Legs (or Side Panel) */}
        <mesh position={[-W / 2 + 0.04, (H - topThick) / 2, 0]} material={accentMaterial} castShadow>
          <boxGeometry args={[0.05, H - topThick, D * 0.88]} />
        </mesh>
        {/* Right Drawer Unit */}
        <mesh position={[W / 2 - 0.22, (H - topThick) / 2, 0]} material={primaryMaterial} castShadow receiveShadow>
          <boxGeometry args={[0.38, H - topThick - 0.05, D * 0.90]} />
        </mesh>
        {/* Drawer Handles */}
        <mesh position={[W / 2 - 0.22, (H - topThick) * 0.70, D * 0.46]} material={metalMaterial} castShadow>
          <boxGeometry args={[0.14, 0.02, 0.02]} />
        </mesh>
        <mesh position={[W / 2 - 0.22, (H - topThick) * 0.35, D * 0.46]} material={metalMaterial} castShadow>
          <boxGeometry args={[0.14, 0.02, 0.02]} />
        </mesh>
      </group>
    );
  }

  if (templateKey.includes('round') || templateKey.includes('dining_round')) {
    const topThick = 0.04;
    return (
      <group position={[0, 0, 0]}>
        {/* Round Top */}
        <mesh position={[0, H - topThick / 2, 0]} material={primaryMaterial} castShadow receiveShadow>
          <cylinderGeometry args={[W / 2, W / 2, topThick, 32]} />
        </mesh>
        {/* Center Pedestal Column */}
        <mesh position={[0, (H - topThick) / 2, 0]} material={accentMaterial} castShadow>
          <cylinderGeometry args={[0.08, 0.12, H - topThick, 24]} />
        </mesh>
        {/* Heavy Circular Base */}
        <mesh position={[0, 0.03, 0]} material={accentMaterial} castShadow>
          <cylinderGeometry args={[W * 0.30, W * 0.32, 0.06, 32]} />
        </mesh>
      </group>
    );
  }

  if (templateKey.includes('coffee')) {
    const topThick = 0.035;
    const shelfH = 0.14;
    return (
      <group position={[0, 0, 0]}>
        {/* Top Tabletop */}
        <mesh position={[0, H - topThick / 2, 0]} material={primaryMaterial} castShadow receiveShadow>
          <boxGeometry args={[W, topThick, D]} />
        </mesh>
        {/* Lower Shelf */}
        <mesh position={[0, shelfH, 0]} material={accentMaterial} castShadow receiveShadow>
          <boxGeometry args={[W * 0.90, 0.02, D * 0.88]} />
        </mesh>
        {/* 4 Corner Posts */}
        {[
          [-W / 2 + 0.04, H / 2, -D / 2 + 0.04],
          [W / 2 - 0.04, H / 2, -D / 2 + 0.04],
          [-W / 2 + 0.04, H / 2, D / 2 - 0.04],
          [W / 2 - 0.04, H / 2, D / 2 - 0.04],
        ].map((pos, i) => (
          <mesh key={i} position={pos as [number, number, number]} material={accentMaterial} castShadow>
            <cylinderGeometry args={[0.02, 0.02, H, 16]} />
          </mesh>
        ))}
      </group>
    );
  }

  // ── 4. WARDROBE & STORAGE ──
  if (templateKey.includes('wardrobe')) {
    return (
      <group position={[0, 0, 0]}>
        {/* Main Cabinet Carcass */}
        <mesh position={[0, H / 2, 0]} material={primaryMaterial} castShadow receiveShadow>
          <boxGeometry args={[W, H, D]} />
        </mesh>
        {/* Door Divider Groove */}
        <mesh position={[0, H / 2, D / 2 + 0.005]} material={accentMaterial}>
          <boxGeometry args={[0.008, H * 0.94, 0.005]} />
        </mesh>
        {/* Left & Right Long Metal Handles */}
        <mesh position={[-0.08, H * 0.52, D / 2 + 0.02]} material={metalMaterial} castShadow>
          <boxGeometry args={[0.02, 0.35, 0.02]} />
        </mesh>
        <mesh position={[0.08, H * 0.52, D / 2 + 0.02]} material={metalMaterial} castShadow>
          <boxGeometry args={[0.02, 0.35, 0.02]} />
        </mesh>
      </group>
    );
  }

  if (templateKey.includes('bookshelf')) {
    const numShelves = 5;
    return (
      <group position={[0, 0, 0]}>
        {/* Left & Right Outer Sides */}
        <mesh position={[-W / 2 + 0.02, H / 2, 0]} material={primaryMaterial} castShadow>
          <boxGeometry args={[0.04, H, D]} />
        </mesh>
        <mesh position={[W / 2 - 0.02, H / 2, 0]} material={primaryMaterial} castShadow>
          <boxGeometry args={[0.04, H, D]} />
        </mesh>
        {/* Horizontal Shelves */}
        {Array.from({ length: numShelves }).map((_, idx) => {
          const y = (H / (numShelves - 1)) * idx;
          const clampedY = Math.max(0.04, Math.min(H - 0.04, y));
          return (
            <mesh key={idx} position={[0, clampedY, 0]} material={primaryMaterial} castShadow receiveShadow>
              <boxGeometry args={[W - 0.06, 0.03, D]} />
            </mesh>
          );
        })}
        {/* Thin Back Panel */}
        <mesh position={[0, H / 2, -D / 2 + 0.01]} material={accentMaterial} receiveShadow>
          <boxGeometry args={[W - 0.04, H - 0.04, 0.015]} />
        </mesh>
      </group>
    );
  }

  if (templateKey.includes('nightstand')) {
    const legH = 0.16;
    return (
      <group position={[0, 0, 0]}>
        {/* 4 Tapered Legs */}
        {[
          [-W * 0.38, legH / 2, -D * 0.38],
          [W * 0.38, legH / 2, -D * 0.38],
          [-W * 0.38, legH / 2, D * 0.38],
          [W * 0.38, legH / 2, D * 0.38],
        ].map((pos, i) => (
          <mesh key={i} position={pos as [number, number, number]} material={accentMaterial} castShadow>
            <cylinderGeometry args={[0.025, 0.015, legH, 12]} />
          </mesh>
        ))}
        {/* Drawer Cabinet Body */}
        <mesh position={[0, legH + (H - legH) / 2, 0]} material={primaryMaterial} castShadow receiveShadow>
          <boxGeometry args={[W, H - legH, D]} />
        </mesh>
        {/* Brass Knob */}
        <mesh position={[0, legH + (H - legH) / 2, D / 2 + 0.02]} material={metalMaterial} castShadow>
          <sphereGeometry args={[0.02, 16, 16]} />
        </mesh>
      </group>
    );
  }

  // ── 5. SOFAS (Default Seating) ──
  const isSectional = templateKey.includes('sectional');
  const seatH = 0.44;
  const legH = 0.12;

  return (
    <group position={[0, 0, 0]}>
      {/* 4 Low Splayed Feet */}
      {[
        [-W * 0.44, legH / 2, -D * 0.42],
        [W * 0.44, legH / 2, -D * 0.42],
        [-W * 0.44, legH / 2, D * 0.42],
        [W * 0.44, legH / 2, D * 0.42],
      ].map((pos, i) => (
        <mesh key={i} position={pos as [number, number, number]} material={accentMaterial} castShadow>
          <cylinderGeometry args={[0.03, 0.02, legH, 16]} />
        </mesh>
      ))}

      {/* Main Base Plinth */}
      <mesh position={[0, legH + (seatH - legH) / 2, 0]} material={primaryMaterial} castShadow receiveShadow>
        <boxGeometry args={[W, seatH - legH, D]} />
      </mesh>

      {/* Backrest */}
      <mesh position={[0, seatH + (H - seatH) / 2, -D * 0.38]} material={primaryMaterial} castShadow>
        <boxGeometry args={[W, H - seatH, 0.22]} />
      </mesh>

      {/* Left & Right Armrests */}
      <mesh position={[-W / 2 + 0.12, seatH + 0.16, 0]} material={primaryMaterial} castShadow>
        <boxGeometry args={[0.22, 0.32, D]} />
      </mesh>
      <mesh position={[W / 2 - 0.12, seatH + 0.16, 0]} material={primaryMaterial} castShadow>
        <boxGeometry args={[0.22, 0.32, D]} />
      </mesh>

      {/* 3 Seat Cushions */}
      {!isSectional ? (
        <>
          <mesh position={[-W * 0.28, seatH + 0.07, 0.04]} material={primaryMaterial} castShadow>
            <boxGeometry args={[W * 0.26, 0.14, D * 0.70]} />
          </mesh>
          <mesh position={[0, seatH + 0.07, 0.04]} material={primaryMaterial} castShadow>
            <boxGeometry args={[W * 0.26, 0.14, D * 0.70]} />
          </mesh>
          <mesh position={[W * 0.28, seatH + 0.07, 0.04]} material={primaryMaterial} castShadow>
            <boxGeometry args={[W * 0.26, 0.14, D * 0.70]} />
          </mesh>
        </>
      ) : (
        <>
          {/* Main 2 cushions */}
          <mesh position={[-W * 0.22, seatH + 0.07, -D * 0.15]} material={primaryMaterial} castShadow>
            <boxGeometry args={[W * 0.44, 0.14, D * 0.65]} />
          </mesh>
          {/* Chaise Cushion */}
          <mesh position={[W * 0.28, seatH + 0.07, 0.1]} material={primaryMaterial} castShadow>
            <boxGeometry args={[W * 0.38, 0.14, D * 1.1]} />
          </mesh>
        </>
      )}
    </group>
  );
}
