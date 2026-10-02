import { useMemo } from 'react';
import * as THREE from 'three';
import type { RoomDimensions } from '../../types/room';
import { useRoomStore } from '../../store/roomStore';

interface RoomShellProps {
  dimensions: RoomDimensions;
}

export function RoomShell({ dimensions }: RoomShellProps) {
  const { widthM: W, lengthM: L, heightM: H, door, shapeType, polygonVertices } = dimensions;

  // Retrieve wallColor and floorColor from store with dimensions fallbacks
  const storeWallColor = useRoomStore((s) => s.wallColor);
  const storeFloorColor = useRoomStore((s) => s.floorColor);
  const wallColor = storeWallColor || dimensions.wallColor || '#e8e2d9';
  const floorColor = storeFloorColor || dimensions.floorColor || '#c8bfb0';
  const isCustom = shapeType === 'custom_polygon' && polygonVertices && polygonVertices.length >= 3;

  // Custom Floor Shape
  const customFloorShape = useMemo(() => {
    if (!polygonVertices || polygonVertices.length < 3) return null;
    const shape = new THREE.Shape();
    // Map 2D (x, z) to shape coordinates (x, -z) to match Three.js coordinate rotation
    shape.moveTo(polygonVertices[0][0], -polygonVertices[0][1]);
    for (let i = 1; i < polygonVertices.length; i++) {
      shape.lineTo(polygonVertices[i][0], -polygonVertices[i][1]);
    }
    shape.closePath();
    return shape;
  }, [polygonVertices]);

  // Custom Wall Segments (0.03m ultra-thin architectural profile)
  const customWallSegments = useMemo(() => {
    if (!polygonVertices || polygonVertices.length < 3) return [];
    const n = polygonVertices.length;
    const segs = [];
    for (let i = 0; i < n; i++) {
      const [x1, z1] = polygonVertices[i];
      const [x2, z2] = polygonVertices[(i + 1) % n];
      const dx = x2 - x1;
      const dz = z2 - z1;
      const length = Math.hypot(dx, dz);
      const angle = Math.atan2(dz, dx);
      const midX = (x1 + x2) / 2;
      const midZ = (z1 + z2) / 2;

      segs.push({
        key: `custom-wall-${i}`,
        length,
        midX,
        midZ,
        angle,
      });
    }
    return segs;
  }, [polygonVertices]);

  // Rectangular Walls (standard box)
  const rectWalls = useMemo(() => [
    { key: 'wall-back', args: [W, H] as [number, number], position: [0, H / 2, L / 2] as [number, number, number], rotation: [0, 0, 0] as [number, number, number], opacity: 0.92 },
    { key: 'wall-front', args: [W, H] as [number, number], position: [0, H / 2, -L / 2] as [number, number, number], rotation: [0, Math.PI, 0] as [number, number, number], opacity: 0.92 },
    { key: 'wall-left', args: [L, H] as [number, number], position: [-W / 2, H / 2, 0] as [number, number, number], rotation: [0, Math.PI / 2, 0] as [number, number, number], opacity: 0.92 },
    { key: 'wall-right', args: [L, H] as [number, number], position: [W / 2, H / 2, 0] as [number, number, number], rotation: [0, -Math.PI / 2, 0] as [number, number, number], opacity: 0.92 },
  ], [W, H, L]);

  // Standard Rectangular Door
  const renderRectDoor = () => {
    if (!door) return null;
    const wall = door.wall || 'front';
    const widthM = Number.isFinite(door.widthM) && door.widthM > 0 ? door.widthM : 0.9;
    const heightM = Number.isFinite(door.heightM) && door.heightM > 0 ? door.heightM : 2.1;
    const swing = door.swing || 'inward';

    // Calculate wall length & clamp position so door doesn't collide with corner
    const wallLen = wall === 'front' || wall === 'back' ? W : L;
    const maxOffset = Math.max(0, wallLen / 2 - widthM / 2 - 0.06);
    const rawPos = Number.isFinite(door.position) ? door.position : 0;
    const position = Math.max(-maxOffset, Math.min(maxOffset, rawPos));

    let doorPos: [number, number, number] = [0, 0, 0];
    let doorRot: [number, number, number] = [0, 0, 0];

    if (wall === 'front') { doorPos = [position, 0, -L / 2]; doorRot = [0, Math.PI, 0]; }
    else if (wall === 'back') { doorPos = [position, 0, L / 2]; doorRot = [0, 0, 0]; }
    else if (wall === 'left') { doorPos = [-W / 2, 0, position]; doorRot = [0, Math.PI / 2, 0]; }
    else if (wall === 'right') { doorPos = [W / 2, 0, position]; doorRot = [0, -Math.PI / 2, 0]; }

    // Swing angle: inward opens into the room, outward opens outwards
    const swingAngle = swing === 'outward' ? Math.PI / 4 : -Math.PI / 4;
    const arcAngle = Math.abs(swingAngle);

    return (
      <group position={doorPos} rotation={doorRot}>
        {/* Frame */}
        <mesh position={[0, heightM / 2, 0.02]} castShadow receiveShadow>
          <boxGeometry args={[widthM + 0.1, heightM + 0.05, 0.05]} />
          <meshStandardMaterial color="#332a24" roughness={0.9} />
        </mesh>
        {/* Panel (inward or outward open) */}
        <group position={[-widthM / 2, 0, swing === 'outward' ? -0.04 : 0.04]} rotation={[0, swingAngle, 0]}>
          <mesh position={[widthM / 2, heightM / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[widthM, heightM, 0.04]} />
            <meshStandardMaterial color="#5c4033" roughness={0.8} />
          </mesh>
          <mesh position={[widthM - 0.08, heightM / 2, 0.03]}>
            <sphereGeometry args={[0.03, 16, 16]} />
            <meshStandardMaterial color="#d4af37" metalness={0.8} roughness={0.2} />
          </mesh>
          <mesh position={[widthM - 0.08, heightM / 2, -0.03]}>
            <sphereGeometry args={[0.03, 16, 16]} />
            <meshStandardMaterial color="#d4af37" metalness={0.8} roughness={0.2} />
          </mesh>
        </group>
        {/* Swing Arc Indicator */}
        <mesh
          position={[-widthM / 2, 0.01, swing === 'outward' ? -0.04 : 0.04]}
          rotation={[-Math.PI / 2, 0, swing === 'outward' ? 0 : -arcAngle]}
        >
          <ringGeometry args={[widthM - 0.02, widthM, 32, 1, 0, arcAngle]} />
          <meshBasicMaterial color="#a1a1aa" transparent opacity={0.3} side={THREE.DoubleSide} />
        </mesh>
      </group>
    );
  };

  // Polygon Perimeter Door (Segment index selectable & position along segment)
  const renderPolygonDoor = () => {
    if (!door || !polygonVertices || polygonVertices.length < 2) return null;
    const n = polygonVertices.length;
    const segIdx = (door.segmentIndex !== undefined && door.segmentIndex >= 0) ? (door.segmentIndex % n) : 0;
    const [x1, z1] = polygonVertices[segIdx];
    const [x2, z2] = polygonVertices[(segIdx + 1) % n];
    const dx = x2 - x1;
    const dz = z2 - z1;
    const segLen = Math.hypot(dx, dz);
    if (segLen < 1e-4) return null;

    const angle = Math.atan2(dz, dx);
    const unitX = dx / segLen;
    const unitZ = dz / segLen;

    const widthM = Number.isFinite(door.widthM) && door.widthM > 0 ? door.widthM : 0.9;
    const heightM = Number.isFinite(door.heightM) && door.heightM > 0 ? door.heightM : 2.1;
    const safeWidth = Math.min(widthM, segLen * 0.85);

    const maxOffset = Math.max(0, segLen / 2 - safeWidth / 2 - 0.06);
    const rawPos = Number.isFinite(door.position) ? door.position : 0;
    const clampedOffset = Math.max(-maxOffset, Math.min(maxOffset, rawPos));

    const midX = (x1 + x2) / 2 + unitX * clampedOffset;
    const midZ = (z1 + z2) / 2 + unitZ * clampedOffset;
    const swing = door.swing || 'inward';
    const swingAngle = swing === 'outward' ? Math.PI / 4 : -Math.PI / 4;
    const arcAngle = Math.abs(swingAngle);

    return (
      <group position={[midX, 0, midZ]} rotation={[0, -angle, 0]}>
        {/* Frame */}
        <mesh position={[0, heightM / 2, 0.02]} castShadow receiveShadow>
          <boxGeometry args={[safeWidth + 0.1, heightM + 0.05, 0.05]} />
          <meshStandardMaterial color="#332a24" roughness={0.9} />
        </mesh>
        {/* Panel (slightly open) */}
        <group position={[-safeWidth / 2, 0, swing === 'outward' ? -0.04 : 0.04]} rotation={[0, swingAngle, 0]}>
          <mesh position={[safeWidth / 2, heightM / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[safeWidth, heightM, 0.04]} />
            <meshStandardMaterial color="#5c4033" roughness={0.8} />
          </mesh>
          <mesh position={[safeWidth - 0.08, heightM / 2, 0.03]}>
            <sphereGeometry args={[0.03, 16, 16]} />
            <meshStandardMaterial color="#d4af37" metalness={0.8} roughness={0.2} />
          </mesh>
          <mesh position={[safeWidth - 0.08, heightM / 2, -0.03]}>
            <sphereGeometry args={[0.03, 16, 16]} />
            <meshStandardMaterial color="#d4af37" metalness={0.8} roughness={0.2} />
          </mesh>
        </group>
        {/* Swing Arc Indicator */}
        <mesh
          position={[-safeWidth / 2, 0.01, swing === 'outward' ? -0.04 : 0.04]}
          rotation={[-Math.PI / 2, 0, swing === 'outward' ? 0 : -arcAngle]}
        >
          <ringGeometry args={[safeWidth - 0.02, safeWidth, 32, 1, 0, arcAngle]} />
          <meshBasicMaterial color="#a1a1aa" transparent opacity={0.3} side={THREE.DoubleSide} />
        </mesh>
      </group>
    );
  };

  return (
    <group name="room-shell">
      {/* ── Floor Mesh ── */}
      {isCustom && customFloorShape ? (
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0, 0]}
          receiveShadow
        >
          <shapeGeometry args={[customFloorShape]} />
          <meshStandardMaterial
            color={floorColor}
            roughness={0.55}
            metalness={0.15}
            envMapIntensity={0.6}
            side={THREE.DoubleSide}
          />
        </mesh>
      ) : (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
          <planeGeometry args={[W, L]} />
          <meshStandardMaterial
            color={floorColor}
            roughness={0.55}
            metalness={0.15}
            envMapIntensity={0.6}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* ── Ceiling (subtle transparent preview) ── */}
      {isCustom && customFloorShape ? (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, H, 0]}>
          <shapeGeometry args={[customFloorShape]} />
          <meshStandardMaterial
            color={wallColor}
            side={THREE.DoubleSide}
            transparent
            opacity={0.12}
            roughness={0.9}
          />
        </mesh>
      ) : (
        <mesh position={[0, H, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <planeGeometry args={[W, L]} />
          <meshStandardMaterial
            color={wallColor}
            side={THREE.DoubleSide}
            transparent
            opacity={0.12}
            roughness={0.9}
          />
        </mesh>
      )}

      {/* ── Walls (Matte Architectural Finish: roughness=0.88, metalness=0.02) ── */}
      {isCustom ? (
        customWallSegments.map(({ key, length, midX, midZ, angle }) => (
          <mesh
            key={key}
            position={[midX, H / 2, midZ]}
            rotation={[0, -angle, 0]}
            receiveShadow
            castShadow
          >
            <boxGeometry args={[length, H, 0.03]} />
            <meshStandardMaterial
              color={wallColor}
              roughness={0.88}
              metalness={0.02}
              side={THREE.DoubleSide}
              transparent
              opacity={0.92}
            />
          </mesh>
        ))
      ) : (
        rectWalls.map(({ key, args, position, rotation, opacity }) => (
          <mesh key={key} position={position} rotation={rotation} receiveShadow>
            <planeGeometry args={args} />
            <meshStandardMaterial
              color={wallColor}
              roughness={0.88}
              metalness={0.02}
              side={THREE.DoubleSide}
              transparent={opacity < 1}
              opacity={opacity}
            />
          </mesh>
        ))
      )}

      {/* ── Baseboard Skirting Trim (Height 0.1m, Thickness 0.015m) ── */}
      {isCustom ? (
        customWallSegments.map(({ key, length, midX, midZ, angle }) => (
          <mesh
            key={`baseboard-${key}`}
            position={[midX, 0.05, midZ]}
            rotation={[0, -angle, 0]}
            receiveShadow
          >
            <boxGeometry args={[length, 0.1, 0.045]} />
            <meshStandardMaterial color="#FAF9F6" roughness={0.7} metalness={0.05} />
          </mesh>
        ))
      ) : (
        <group name="rect-baseboards">
          {/* Back wall baseboard */}
          <mesh position={[0, 0.05, L / 2 - 0.008]} receiveShadow>
            <boxGeometry args={[W, 0.1, 0.016]} />
            <meshStandardMaterial color="#FAF9F6" roughness={0.7} metalness={0.05} />
          </mesh>
          {/* Front wall baseboard */}
          <mesh position={[0, 0.05, -L / 2 + 0.008]} receiveShadow>
            <boxGeometry args={[W, 0.1, 0.016]} />
            <meshStandardMaterial color="#FAF9F6" roughness={0.7} metalness={0.05} />
          </mesh>
          {/* Left wall baseboard */}
          <mesh position={[-W / 2 + 0.008, 0.05, 0]} receiveShadow>
            <boxGeometry args={[0.016, 0.1, L]} />
            <meshStandardMaterial color="#FAF9F6" roughness={0.7} metalness={0.05} />
          </mesh>
          {/* Right wall baseboard */}
          <mesh position={[W / 2 - 0.008, 0.05, 0]} receiveShadow>
            <boxGeometry args={[0.016, 0.1, L]} />
            <meshStandardMaterial color="#FAF9F6" roughness={0.7} metalness={0.05} />
          </mesh>
        </group>
      )}

      {/* ── Rectangular Wireframe Box Edges ── */}
      {!isCustom && (
        <lineSegments position={[0, H / 2, 0]}>
          <edgesGeometry args={[new THREE.BoxGeometry(W, H, L)]} />
          <lineBasicMaterial color="#6b7280" transparent opacity={0.25} />
        </lineSegments>
      )}

      {/* ── Door ── */}
      {isCustom ? renderPolygonDoor() : renderRectDoor()}
    </group>
  );
}
