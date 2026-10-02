import { useMemo } from 'react';
import * as THREE from 'three';
import { MATERIAL_PRESETS } from '../../catalog/furnitureCatalog';

interface ProceduralFurnitureMeshProps {
  templateId?: string;
  category: string;
  dimensions: [number, number, number]; // [W, H, D]
  colorTint?: string;
  materialPreset?: string;
  materialType?: string;
}

export function ProceduralFurnitureMesh({
  templateId = 'sofa_three_seater',
  category,
  dimensions,
  colorTint,
  materialPreset = 'Oak Wood',
  materialType,
}: ProceduralFurnitureMeshProps) {
  const [W, H, D] = dimensions;

  // Active PBR material values with materialType fallback
  const preset = useMemo(() => {
    if (materialPreset && MATERIAL_PRESETS[materialPreset]) {
      return MATERIAL_PRESETS[materialPreset];
    }
    if (materialType) {
      const m = materialType.toLowerCase();
      if (m.includes('leather')) return MATERIAL_PRESETS['Cognac Leather'] || MATERIAL_PRESETS['Oak Wood'];
      if (m.includes('metal')) return MATERIAL_PRESETS['Chrome Steel'] || MATERIAL_PRESETS['Oak Wood'];
      if (m.includes('fabric')) return MATERIAL_PRESETS['Grey Fabric'] || MATERIAL_PRESETS['Oak Wood'];
      if (m.includes('wood')) return MATERIAL_PRESETS['Oak Wood'];
    }
    return MATERIAL_PRESETS[materialPreset] || MATERIAL_PRESETS['Oak Wood'];
  }, [materialPreset, materialType]);

  const activeColor = useMemo(() => {
    return colorTint || preset.color;
  }, [colorTint, preset]);

  // Primary Material with dynamic roughness & metalness based on detected material
  const primaryMaterial = useMemo(() => {
    let roughness = preset.roughness;
    let metalness = preset.metalness;

    if (materialType) {
      const m = materialType.toLowerCase();
      if (m.includes('leather')) {
        roughness = 0.40;
        metalness = 0.10;
      } else if (m.includes('wood')) {
        roughness = 0.75;
        metalness = 0.05;
      } else if (m.includes('metal')) {
        roughness = 0.25;
        metalness = 0.85;
      } else if (m.includes('glass')) {
        roughness = 0.08;
        metalness = 0.92;
      } else if (m.includes('fabric')) {
        roughness = 0.95;
        metalness = 0.0;
      }
    }

    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(activeColor),
      roughness,
      metalness,
      envMapIntensity: 1.0,
    });
  }, [activeColor, preset, materialType]);

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

  // Handle / Metal accent (Brushed Brass)
  const metalMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color('#D4AF37'),
      roughness: 0.35,
      metalness: 0.85,
    });
  }, []);

  // Foliage Green Material (Double sided, matte)
  const foliageMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color('#2D5A27'),
      roughness: 0.90,
      metalness: 0.0,
      side: THREE.DoubleSide,
    });
  }, []);

  // Dark Soil Material
  const soilMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color('#1C1612'),
      roughness: 0.95,
      metalness: 0.0,
    });
  }, []);

  // Mirror Glass Reflective Material
  const mirrorMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color('#E2E8F0'),
      roughness: 0.05,
      metalness: 0.95,
    });
  }, []);

  // Warm Lamp Shade Material (Soft emission)
  const shadeMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(activeColor || '#FFF8EB'),
      emissive: new THREE.Color('#FFF6E6'),
      emissiveIntensity: 0.35,
      roughness: 0.85,
      metalness: 0.05,
      side: THREE.DoubleSide,
    });
  }, [activeColor]);

  // TV Screen Black Glass Material
  const tvScreenMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color('#0A0A0C'),
      roughness: 0.15,
      metalness: 0.8,
    });
  }, []);

  // Tempered Glass Material for glass tables
  const glassMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color('#DDEEFF'),
      roughness: 0.05,
      metalness: 0.1,
      transparent: true,
      opacity: 0.65,
    });
  }, []);

  // ── Render template-specific compound geometries ──────────────────────────
  const templateKey = (templateId || category).toLowerCase();

  // ── 0. WALL-MOUNTED FIXTURES & DECOR ──

  // Flat-Screen Wall TV
  if (templateKey.includes('wall_tv')) {
    const frameThickness = 0.025;
    const screenDepth = 0.018;
    return (
      <group position={[0, 0, 0]}>
        {/* Outer thin black bezel frame */}
        <mesh position={[0, 0, 0]} material={accentMaterial} castShadow>
          <boxGeometry args={[W, H, D]} />
        </mesh>
        {/* Screen panel - slightly inset */}
        <mesh position={[0, 0, D * 0.5 + screenDepth / 2]} castShadow>
          <boxGeometry args={[W - frameThickness * 2, H - frameThickness * 2, screenDepth]} />
          <meshStandardMaterial color="#0A0A0C" roughness={0.08} metalness={0.85} />
        </mesh>
        {/* Subtle emissive screen sheen */}
        <mesh position={[0, 0, D * 0.5 + screenDepth + 0.001]}>
          <planeGeometry args={[W - frameThickness * 3, H - frameThickness * 3]} />
          <meshStandardMaterial
            color="#141C2E"
            emissive="#0A1428"
            emissiveIntensity={0.25}
            roughness={0.1}
            metalness={0.5}
            transparent
            opacity={0.88}
          />
        </mesh>
        {/* Mounting bracket */}
        <mesh position={[0, -H * 0.05, -D * 0.3]} material={accentMaterial}>
          <boxGeometry args={[W * 0.25, 0.05, 0.04]} />
        </mesh>
      </group>
    );
  }

  // Framed Canvas Art / Painting
  if (templateKey.includes('wall_art')) {
    const frameW = 0.04;
    return (
      <group position={[0, 0, 0]}>
        {/* Outer Wooden/Black Frame */}
        <mesh position={[0, H / 2 - frameW / 2, 0]} material={accentMaterial} castShadow>
          <boxGeometry args={[W, frameW, D]} />
        </mesh>
        <mesh position={[0, -H / 2 + frameW / 2, 0]} material={accentMaterial} castShadow>
          <boxGeometry args={[W, frameW, D]} />
        </mesh>
        <mesh position={[-W / 2 + frameW / 2, 0, 0]} material={accentMaterial} castShadow>
          <boxGeometry args={[frameW, H, D]} />
        </mesh>
        <mesh position={[W / 2 - frameW / 2, 0, 0]} material={accentMaterial} castShadow>
          <boxGeometry args={[frameW, H, D]} />
        </mesh>
        {/* Canvas backing */}
        <mesh position={[0, 0, -D * 0.1]}>
          <boxGeometry args={[W - frameW * 2, H - frameW * 2, D * 0.6]} />
          <meshStandardMaterial color={activeColor} roughness={0.92} metalness={0.0} />
        </mesh>
        {/* Paint surface */}
        <mesh position={[0, 0, D * 0.3]}>
          <boxGeometry args={[W - frameW * 2.2, H - frameW * 2.2, 0.005]} />
          <meshStandardMaterial
            color={activeColor}
            roughness={0.85}
            metalness={0.02}
            emissive={activeColor}
            emissiveIntensity={0.04}
          />
        </mesh>
      </group>
    );
  }

  // Circular / Arched Wall Mirror
  if (templateKey.includes('wall_mirror')) {
    const r = Math.min(W, H) / 2;
    const frameThickness = 0.04;
    return (
      <group position={[0, 0, 0]}>
        {/* Outer ring frame */}
        <mesh position={[0, 0, 0]} material={metalMaterial} castShadow>
          <torusGeometry args={[r, frameThickness, 16, 48]} />
        </mesh>
        {/* Mirror disc */}
        <mesh position={[0, 0, 0.005]}>
          <circleGeometry args={[r - frameThickness, 48]} />
          <meshStandardMaterial color="#D8E4F0" roughness={0.02} metalness={0.98} />
        </mesh>
      </group>
    );
  }

  // Minimalist Wall Clock
  if (templateKey.includes('wall_clock')) {
    const r = Math.min(W, H) / 2;
    return (
      <group position={[0, 0, 0]}>
        {/* Clock disc */}
        <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[r, r, D, 48]} />
          <meshStandardMaterial color="#F5F5F0" roughness={0.8} metalness={0.05} />
        </mesh>
        {/* Outer ring */}
        <mesh position={[0, 0, D * 0.5 + 0.003]} material={accentMaterial}>
          <ringGeometry args={[r * 0.9, r, 48]} />
        </mesh>
        {/* Hands */}
        <mesh position={[0, r * 0.22, D * 0.5 + 0.008]} rotation={[0, 0, -Math.PI / 6]} material={accentMaterial}>
          <boxGeometry args={[0.012, r * 0.44, 0.006]} />
        </mesh>
        <mesh position={[0, r * 0.30, D * 0.5 + 0.008]} rotation={[0, 0, Math.PI / 4]} material={accentMaterial}>
          <boxGeometry args={[0.008, r * 0.60, 0.006]} />
        </mesh>
        {/* Center pin */}
        <mesh position={[0, 0, D * 0.5 + 0.012]}>
          <sphereGeometry args={[0.015, 16, 16]} />
          <meshStandardMaterial color="#E53E3E" roughness={0.3} metalness={0.6} />
        </mesh>
      </group>
    );
  }

  // ── 1. LIGHTING FIXTURES ──

  // Arc Floor Lamp
  if (templateKey.includes('lamp_floor_arc')) {
    const baseR = 0.20;
    const baseH = 0.04;
    return (
      <group position={[0, 0, 0]}>
        {/* Heavy Marble / Metal Disc Base */}
        <mesh position={[0, baseH / 2, -D * 0.25]} material={accentMaterial} castShadow receiveShadow>
          <cylinderGeometry args={[baseR, baseR * 1.05, baseH, 32]} />
        </mesh>
        {/* Vertical Upright Section */}
        <mesh position={[0, H * 0.45, -D * 0.25]} material={metalMaterial} castShadow>
          <cylinderGeometry args={[0.015, 0.015, H * 0.85, 16]} />
        </mesh>
        {/* Overarching Curved Horizontal Arm */}
        <mesh position={[0, H * 0.92, 0]} rotation={[Math.PI / 2, 0, 0]} material={metalMaterial} castShadow>
          <cylinderGeometry args={[0.014, 0.014, D * 0.70, 16]} />
        </mesh>
        {/* Dome Shade Overhang */}
        <mesh position={[0, H * 0.85, D * 0.32]} material={shadeMaterial} castShadow>
          <cylinderGeometry args={[0.08, 0.16, 0.14, 24, 1, true]} />
        </mesh>
        {/* Glowing Bulb Core */}
        <mesh position={[0, H * 0.84, D * 0.32]}>
          <sphereGeometry args={[0.04, 16, 16]} />
          <meshBasicMaterial color="#FFF4D4" />
        </mesh>
        <pointLight position={[0, H * 0.82, D * 0.32]} intensity={0.6} color="#FFF3DB" distance={3.0} castShadow={false} />
      </group>
    );
  }

  // Modern Ceramic Table Lamp
  if (templateKey.includes('lamp_table') || templateKey === 'lamp_table_modern') {
    const baseR = 0.11;
    const baseH = 0.22;
    const shadeR = 0.16;
    const shadeH = 0.22;
    return (
      <group position={[0, 0, 0]}>
        {/* Ceramic Cylinder Pot Base */}
        <mesh position={[0, baseH / 2, 0]} material={primaryMaterial} castShadow receiveShadow>
          <cylinderGeometry args={[baseR * 0.85, baseR, baseH, 24]} />
        </mesh>
        {/* Brass Neck Fitting */}
        <mesh position={[0, baseH + 0.03, 0]} material={metalMaterial} castShadow>
          <cylinderGeometry args={[0.02, 0.02, 0.06, 16]} />
        </mesh>
        {/* Linen Drum Shade */}
        <mesh position={[0, baseH + 0.04 + shadeH / 2, 0]} material={shadeMaterial} castShadow>
          <cylinderGeometry args={[shadeR, shadeR, shadeH, 32, 1, true]} />
        </mesh>
        {/* Top Finial */}
        <mesh position={[0, baseH + 0.04 + shadeH + 0.02, 0]} material={metalMaterial}>
          <sphereGeometry args={[0.015, 12, 12]} />
        </mesh>
        {/* Inner Light Core */}
        <mesh position={[0, baseH + 0.04 + shadeH / 2, 0]}>
          <sphereGeometry args={[0.035, 16, 16]} />
          <meshBasicMaterial color="#FFF4D4" />
        </mesh>
        <pointLight position={[0, baseH + 0.04 + shadeH / 2, 0]} intensity={0.5} color="#FFF3DB" distance={2.5} castShadow={false} />
      </group>
    );
  }

  // Tripod Timber Floor Lamp
  if (templateKey.includes('tripod') || templateKey === 'lamp_tripod_floor') {
    const legH = H * 0.72;
    const shadeR = 0.22;
    const shadeH = 0.32;
    return (
      <group position={[0, 0, 0]}>
        {/* 3 Angled Timber Legs */}
        {[0, (2 * Math.PI) / 3, (4 * Math.PI) / 3].map((angle, i) => {
          const spread = W * 0.42;
          return (
            <group key={i} rotation={[0, angle, 0]}>
              <mesh position={[spread * 0.28, legH / 2, 0]} rotation={[0, 0, -0.16]} material={accentMaterial} castShadow>
                <cylinderGeometry args={[0.018, 0.014, legH, 12]} />
              </mesh>
            </group>
          );
        })}
        {/* Brass Junction Collar */}
        <mesh position={[0, legH, 0]} material={metalMaterial} castShadow>
          <cylinderGeometry args={[0.06, 0.06, 0.04, 20]} />
        </mesh>
        {/* Linen Drum Shade */}
        <mesh position={[0, legH + shadeH / 2 + 0.02, 0]} material={shadeMaterial} castShadow>
          <cylinderGeometry args={[shadeR, shadeR * 1.05, shadeH, 32, 1, true]} />
        </mesh>
        {/* Glowing Bulb */}
        <mesh position={[0, legH + shadeH / 2 + 0.02, 0]}>
          <sphereGeometry args={[0.045, 16, 16]} />
          <meshBasicMaterial color="#FFF4D4" />
        </mesh>
        <pointLight position={[0, legH + shadeH / 2 + 0.02, 0]} intensity={0.6} color="#FFF3DB" distance={3.0} castShadow={false} />
      </group>
    );
  }

  // Generic / Default Lamp Fallback
  if (templateKey.includes('lamp') || templateKey.includes('light')) {
    const baseH = 0.05;
    const baseR = Math.min(W, D) * 0.35;
    return (
      <group position={[0, 0, 0]}>
        <mesh position={[0, baseH / 2, 0]} material={accentMaterial} castShadow receiveShadow>
          <cylinderGeometry args={[baseR, baseR, baseH, 24]} />
        </mesh>
        <mesh position={[0, H * 0.5, 0]} material={metalMaterial} castShadow>
          <cylinderGeometry args={[0.018, 0.018, H * 0.9, 16]} />
        </mesh>
        <mesh position={[0, H - 0.15, 0]} material={shadeMaterial} castShadow>
          <cylinderGeometry args={[baseR * 0.7, baseR, 0.26, 24, 1, true]} />
        </mesh>
        <pointLight position={[0, H - 0.15, 0]} intensity={0.6} color="#FFE6A3" distance={3} castShadow={false} />
      </group>
    );
  }

  // ── 2. DECOR, GREENERY & PLANTS ──

  // Potted Monstera Deliciosa
  if (templateKey.includes('monstera') || templateKey === 'plant_potted_monstera') {
    const potH = 0.32;
    const potR = 0.20;
    return (
      <group position={[0, 0, 0]}>
        {/* Ceramic Planter Pot */}
        <mesh position={[0, potH / 2, 0]} material={primaryMaterial} castShadow receiveShadow>
          <cylinderGeometry args={[potR, potR * 0.8, potH, 24]} />
        </mesh>
        {/* Dark Soil Disc */}
        <mesh position={[0, potH * 0.95, 0]} material={soilMaterial}>
          <cylinderGeometry args={[potR * 0.94, potR * 0.94, 0.02, 20]} />
        </mesh>
        {/* Multi-stem Stems & Broad Monstera Leaves */}
        {[
          { pos: [-0.08, potH + 0.30, 0.08] as [number, number, number], rot: [0.3, 0.5, -0.4] as [number, number, number], scale: 0.22 },
          { pos: [0.10, potH + 0.38, 0.05] as [number, number, number], rot: [0.2, -0.7, 0.35] as [number, number, number], scale: 0.24 },
          { pos: [-0.02, potH + 0.50, -0.10] as [number, number, number], rot: [-0.4, 0.2, 0.1] as [number, number, number], scale: 0.26 },
          { pos: [0.05, potH + 0.62, 0.02] as [number, number, number], rot: [0.1, 1.2, -0.2] as [number, number, number], scale: 0.25 },
          { pos: [-0.10, potH + 0.44, -0.05] as [number, number, number], rot: [-0.2, -1.1, -0.3] as [number, number, number], scale: 0.20 },
        ].map((leaf, i) => (
          <group key={i} position={[0, potH, 0]}>
            {/* Curved Stem */}
            <mesh position={[leaf.pos[0] * 0.5, (leaf.pos[1] - potH) * 0.5, leaf.pos[2] * 0.5]} material={foliageMaterial}>
              <cylinderGeometry args={[0.008, 0.012, leaf.pos[1] - potH, 8]} />
            </mesh>
            {/* Broad Leaf Blade */}
            <mesh position={leaf.pos} rotation={leaf.rot} material={foliageMaterial} castShadow>
              <sphereGeometry args={[leaf.scale, 8, 8]} />
            </mesh>
          </group>
        ))}
      </group>
    );
  }

  // Tall Sansevieria Snake Plant
  if (templateKey.includes('snake') || templateKey === 'plant_snake_tall') {
    const potH = 0.28;
    const potR = 0.14;
    return (
      <group position={[0, 0, 0]}>
        {/* Fluted Minimalist Cylinder Pot */}
        <mesh position={[0, potH / 2, 0]} material={primaryMaterial} castShadow receiveShadow>
          <cylinderGeometry args={[potR, potR * 0.88, potH, 24]} />
        </mesh>
        {/* Soil Disc */}
        <mesh position={[0, potH * 0.95, 0]} material={soilMaterial}>
          <cylinderGeometry args={[potR * 0.92, potR * 0.92, 0.02, 16]} />
        </mesh>
        {/* Tall Upright Architectural Foliage Blades */}
        {[
          { h: 0.65, rotZ: 0.05, rotX: 0.03, spread: 0.02 },
          { h: 0.58, rotZ: -0.08, rotX: 0.05, spread: -0.04 },
          { h: 0.60, rotZ: 0.06, rotX: -0.07, spread: 0.05 },
          { h: 0.52, rotZ: -0.04, rotX: -0.04, spread: -0.02 },
          { h: 0.45, rotZ: 0.10, rotX: 0.08, spread: 0.06 },
          { h: 0.48, rotZ: -0.12, rotX: 0.02, spread: -0.05 },
        ].map((blade, i) => (
          <mesh
            key={i}
            position={[blade.spread, potH + blade.h / 2, blade.spread * 0.6]}
            rotation={[blade.rotX, (i * Math.PI) / 3, blade.rotZ]}
            material={foliageMaterial}
            castShadow
          >
            <boxGeometry args={[0.07, blade.h, 0.012]} />
          </mesh>
        ))}
      </group>
    );
  }

  // Generic Plant Fallback
  if (templateKey.includes('plant') || templateKey.includes('greenery')) {
    const potH = H * 0.32;
    const potR = Math.min(W, D) * 0.38;
    return (
      <group position={[0, 0, 0]}>
        <mesh position={[0, potH / 2, 0]} material={primaryMaterial} castShadow receiveShadow>
          <cylinderGeometry args={[potR, potR * 0.8, potH, 20]} />
        </mesh>
        <mesh position={[0, potH * 0.95, 0]} material={soilMaterial}>
          <cylinderGeometry args={[potR * 0.92, potR * 0.92, 0.02, 16]} />
        </mesh>
        <mesh position={[0, potH + (H - potH) * 0.45, 0]} material={foliageMaterial} castShadow>
          <sphereGeometry args={[Math.min(W, D) * 0.5, 12, 12]} />
        </mesh>
      </group>
    );
  }

  // Full-Length Arched Floor Mirror
  if (templateKey.includes('mirror') || templateKey === 'mirror_arched_floor') {
    const frameThick = 0.025;
    return (
      <group position={[0, 0, 0]} rotation={[-0.08, 0, 0]}>
        {/* Outer Metal Frame */}
        <mesh position={[0, H / 2, 0]} material={metalMaterial} castShadow>
          <boxGeometry args={[W, H, frameThick]} />
        </mesh>
        {/* Reflective Mirror Glass Inset */}
        <mesh position={[0, H / 2, frameThick * 0.55]} material={mirrorMaterial}>
          <boxGeometry args={[W - 0.06, H - 0.06, 0.005]} />
        </mesh>
        {/* Back Support Leaning Strut */}
        <mesh position={[0, H * 0.42, -0.15]} rotation={[0.25, 0, 0]} material={metalMaterial}>
          <cylinderGeometry args={[0.012, 0.012, H * 0.75, 12]} />
        </mesh>
      </group>
    );
  }

  // Textured Floor Area Rug
  if (templateKey.includes('rug') || templateKey.includes('carpet')) {
    return (
      <group position={[0, 0, 0]}>
        {/* Main Floor Rug Body (Flush at Y=0.006m to avoid z-fighting) */}
        <mesh position={[0, 0.006, 0]} material={primaryMaterial} receiveShadow>
          <boxGeometry args={[W, 0.012, D]} />
        </mesh>
        {/* Inset Accent Border */}
        <mesh position={[0, 0.012, 0]} material={accentMaterial} receiveShadow>
          <boxGeometry args={[W * 0.88, 0.002, D * 0.88]} />
        </mesh>
      </group>
    );
  }

  // Round Bouclé Pouf / Ottoman
  if (templateKey.includes('pouf') || templateKey.includes('ottoman')) {
    const poufR = Math.min(W, D) * 0.48;
    return (
      <group position={[0, 0, 0]}>
        {/* Recessed Low Glider Base */}
        <mesh position={[0, 0.02, 0]} material={accentMaterial}>
          <cylinderGeometry args={[poufR * 0.82, poufR * 0.82, 0.04, 24]} />
        </mesh>
        {/* Main Soft Padded Cylindrical Ottoman Body */}
        <mesh position={[0, H / 2 + 0.01, 0]} material={primaryMaterial} castShadow receiveShadow>
          <cylinderGeometry args={[poufR, poufR * 1.04, H - 0.04, 32]} />
        </mesh>
        {/* Center Tufted Top Button */}
        <mesh position={[0, H + 0.005, 0]} material={accentMaterial}>
          <sphereGeometry args={[0.025, 12, 12]} />
        </mesh>
      </group>
    );
  }

  // Nordic Timber Coat Rack
  if (templateKey.includes('coat_rack') || templateKey === 'stand_coat_rack') {
    const baseR = 0.18;
    const baseH = 0.04;
    return (
      <group position={[0, 0, 0]}>
        {/* Heavy Circular Base */}
        <mesh position={[0, baseH / 2, 0]} material={primaryMaterial} castShadow receiveShadow>
          <cylinderGeometry args={[baseR, baseR * 1.04, baseH, 24]} />
        </mesh>
        {/* Tall Central Timber Pole */}
        <mesh position={[0, H / 2, 0]} material={primaryMaterial} castShadow>
          <cylinderGeometry args={[0.025, 0.03, H, 16]} />
        </mesh>
        {/* 6 Staggered Angled Peg Hooks */}
        {[
          { y: H * 0.65, angle: 0 },
          { y: H * 0.72, angle: (2 * Math.PI) / 3 },
          { y: H * 0.78, angle: (4 * Math.PI) / 3 },
          { y: H * 0.84, angle: Math.PI / 3 },
          { y: H * 0.90, angle: Math.PI },
          { y: H * 0.95, angle: (5 * Math.PI) / 3 },
        ].map((peg, i) => (
          <group key={i} position={[0, peg.y, 0]} rotation={[0, peg.angle, 0]}>
            <mesh position={[0.07, 0.03, 0]} rotation={[0, 0, -0.45]} material={accentMaterial} castShadow>
              <cylinderGeometry args={[0.012, 0.01, 0.14, 12]} />
            </mesh>
          </group>
        ))}
      </group>
    );
  }

  // TV Media Console & Mounted Screen
  if (templateKey.includes('stand_tv_console') || templateKey.includes('console')) {
    const legH = 0.12;
    const cabinetH = 0.40;
    const tvW = W * 0.75;
    const tvH = 0.65;
    return (
      <group position={[0, 0, 0]}>
        {/* 4 Metal Legs */}
        {[
          [-W * 0.44, legH / 2, -D * 0.35],
          [W * 0.44, legH / 2, -D * 0.35],
          [-W * 0.44, legH / 2, D * 0.35],
          [W * 0.44, legH / 2, D * 0.35],
        ].map((pos, i) => (
          <mesh key={i} position={pos as [number, number, number]} material={accentMaterial} castShadow>
            <cylinderGeometry args={[0.018, 0.014, legH, 12]} />
          </mesh>
        ))}
        {/* Wooden Credenza Cabinet */}
        <mesh position={[0, legH + cabinetH / 2, 0]} material={primaryMaterial} castShadow receiveShadow>
          <boxGeometry args={[W, cabinetH, D]} />
        </mesh>
        {/* Door Slats & Handle Accent */}
        <mesh position={[0, legH + cabinetH / 2, D / 2 + 0.005]} material={accentMaterial}>
          <boxGeometry args={[W * 0.94, cabinetH * 0.85, 0.008]} />
        </mesh>
        {/* TV Stand Base on Top of Cabinet */}
        <mesh position={[0, legH + cabinetH + 0.015, 0]} material={metalMaterial} castShadow>
          <boxGeometry args={[tvW * 0.45, 0.02, 0.22]} />
        </mesh>
        {/* TV Stand Neck */}
        <mesh position={[0, legH + cabinetH + 0.12, 0]} material={metalMaterial} castShadow>
          <cylinderGeometry args={[0.025, 0.025, 0.20, 16]} />
        </mesh>
        {/* Flat Screen TV Body */}
        <mesh position={[0, legH + cabinetH + 0.12 + tvH / 2, 0]} material={tvScreenMaterial} castShadow>
          <boxGeometry args={[tvW, tvH, 0.025]} />
        </mesh>
      </group>
    );
  }

  // ── 3. BED TEMPLATES ──
  if (templateKey.includes('bed')) {
    const isPlatform = templateKey.includes('platform') || templateKey.includes('minimalist');
    const isUpholstered = templateKey.includes('upholstered');
    const legH = isPlatform ? 0.08 : 0.18;
    const frameH = isPlatform ? 0.26 : 0.22;
    const mattressH = 0.26;
    const headboardH = isPlatform ? 0.50 : isUpholstered ? Math.max(0.70, H - (legH + frameH) + 0.12) : H - (legH + frameH);

    return (
      <group position={[0, 0, 0]}>
        {/* 4 Corner Legs (hidden or minimal on platform) */}
        {!isPlatform && [
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
        <mesh position={[0, legH + frameH / 2, 0]} material={isPlatform ? accentMaterial : primaryMaterial} castShadow receiveShadow>
          <boxGeometry args={[isPlatform ? W * 1.04 : W * 0.98, frameH, isPlatform ? D * 1.02 : D * 0.98]} />
        </mesh>

        {/* Mattress */}
        <mesh position={[0, legH + frameH + mattressH / 2, 0.04]} material={cushionMaterial} castShadow receiveShadow>
          <boxGeometry args={[W * 0.92, mattressH, D * 0.90]} />
        </mesh>

        {/* Headboard */}
        <mesh
          position={[0, legH + frameH + headboardH / 2 - 0.05, -D / 2 + 0.05]}
          material={isUpholstered ? primaryMaterial : isPlatform ? accentMaterial : primaryMaterial}
          castShadow
        >
          <boxGeometry args={[W, headboardH, isUpholstered ? 0.16 : 0.1]} />
        </mesh>
        {isUpholstered && (
          /* Tufted Headboard Cushion Layer */
          <mesh position={[0, legH + frameH + headboardH / 2 - 0.05, -D / 2 + 0.14]} material={primaryMaterial}>
            <boxGeometry args={[W * 0.92, headboardH * 0.88, 0.04]} />
          </mesh>
        )}

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

  // ── 4. SEATING: CHAIR / ARMCHAIR ──
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

  // ── 5. DESK & TABLES ──
  if (templateKey.includes('desk')) {
    const isMinimalWhite = templateKey.includes('minimal_white');
    if (isMinimalWhite) {
      const topThick = 0.03;
      return (
        <group position={[0, 0, 0]}>
          {/* Sleek White Lacquer Desktop */}
          <mesh position={[0, H - topThick / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[W, topThick, D]} />
            <meshStandardMaterial color="#FFFFFF" roughness={0.18} metalness={0.05} />
          </mesh>
          {/* Slim Steel Legs Frame */}
          {[
            [-W / 2 + 0.03, (H - topThick) / 2, 0],
            [W / 2 - 0.03, (H - topThick) / 2, 0],
          ].map((pos, i) => (
            <mesh key={i} position={pos as [number, number, number]} material={metalMaterial} castShadow>
              <boxGeometry args={[0.03, H - topThick, D * 0.85]} />
            </mesh>
          ))}
          {/* Cross Stiffener Bar */}
          <mesh position={[0, H * 0.35, -D * 0.38]} material={metalMaterial}>
            <boxGeometry args={[W - 0.1, 0.02, 0.02]} />
          </mesh>
        </group>
      );
    }

    const topThick = 0.04;
    return (
      <group position={[0, 0, 0]}>
        {/* Desktop Slab */}
        <mesh position={[0, H - topThick / 2, 0]} material={primaryMaterial} castShadow receiveShadow>
          <boxGeometry args={[W, topThick, D]} />
        </mesh>
        {/* 2 Left Legs */}
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
    const isGlass = templateKey.includes('glass');
    const topThick = isGlass ? 0.015 : 0.035;
    const shelfH = 0.14;
    return (
      <group position={[0, 0, 0]}>
        {/* Top Tabletop */}
        <mesh position={[0, H - topThick / 2, 0]} material={isGlass ? glassMaterial : primaryMaterial} castShadow receiveShadow>
          <boxGeometry args={[W, topThick, D]} />
        </mesh>
        {/* Geometric Metal/Accent Frame Under Top */}
        <mesh position={[0, H - topThick - 0.01, 0]} material={isGlass ? metalMaterial : accentMaterial}>
          <boxGeometry args={[W * 0.96, 0.02, D * 0.96]} />
        </mesh>
        {/* Lower Shelf */}
        {!isGlass && (
          <mesh position={[0, shelfH, 0]} material={accentMaterial} castShadow receiveShadow>
            <boxGeometry args={[W * 0.90, 0.02, D * 0.88]} />
          </mesh>
        )}
        {/* 4 Corner Posts */}
        {[
          [-W / 2 + 0.04, H / 2, -D / 2 + 0.04],
          [W / 2 - 0.04, H / 2, -D / 2 + 0.04],
          [-W / 2 + 0.04, H / 2, D / 2 - 0.04],
          [W / 2 - 0.04, H / 2, D / 2 - 0.04],
        ].map((pos, i) => (
          <mesh key={i} position={pos as [number, number, number]} material={isGlass ? metalMaterial : accentMaterial} castShadow>
            <cylinderGeometry args={[0.02, 0.02, H, 16]} />
          </mesh>
        ))}
      </group>
    );
  }

  // ── 6. WARDROBE & STORAGE ──
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

  // ── 7. SOFAS (Default Seating) ──
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
