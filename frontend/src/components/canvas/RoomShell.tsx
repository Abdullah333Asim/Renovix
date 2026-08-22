import { useMemo } from 'react';
import * as THREE from 'three';
import type { RoomDimensions } from '../../types/room';

interface RoomShellProps {
  dimensions: RoomDimensions;
}

export function RoomShell({ dimensions }: RoomShellProps) {
  const { widthM: W, lengthM: L, heightM: H, door } = dimensions;

  const materialProps = { side: THREE.DoubleSide, roughness: 0.85, metalness: 0.0 };
  const floorColor = '#c8bfb0';
  const wallColor = '#e8e2d9';

  const walls = useMemo(() => [
    { key: 'floor', color: floorColor, args: [W, L] as [number, number], position: [0, 0, 0] as [number, number, number], rotation: [-Math.PI / 2, 0, 0] as [number, number, number], opacity: 1 },
    { key: 'wall-back', color: wallColor, args: [W, H] as [number, number], position: [0, H / 2, L / 2] as [number, number, number], rotation: [0, 0, 0] as [number, number, number], opacity: 0.92 },
    { key: 'wall-front', color: wallColor, args: [W, H] as [number, number], position: [0, H / 2, -L / 2] as [number, number, number], rotation: [0, Math.PI, 0] as [number, number, number], opacity: 0.92 },
    { key: 'wall-left', color: wallColor, args: [L, H] as [number, number], position: [-W / 2, H / 2, 0] as [number, number, number], rotation: [0, Math.PI / 2, 0] as [number, number, number], opacity: 0.92 },
    { key: 'wall-right', color: wallColor, args: [L, H] as [number, number], position: [W / 2, H / 2, 0] as [number, number, number], rotation: [0, -Math.PI / 2, 0] as [number, number, number], opacity: 0.92 },
  ], [W, L, H]);

  const renderDoor = () => {
    if (!door) return null;
    const wall = door.wall || 'front';
    const position = Number.isFinite(door.position) ? door.position : 0;
    const widthM = Number.isFinite(door.widthM) && door.widthM > 0 ? door.widthM : 0.9;
    const heightM = Number.isFinite(door.heightM) && door.heightM > 0 ? door.heightM : 2.1;

    let doorPos: [number, number, number] = [0, 0, 0];
    let doorRot: [number, number, number] = [0, 0, 0];
    
    if (wall === 'front') { doorPos = [position, 0, -L/2]; doorRot = [0, Math.PI, 0]; }
    else if (wall === 'back') { doorPos = [position, 0, L/2]; doorRot = [0, 0, 0]; }
    else if (wall === 'left') { doorPos = [-W/2, 0, position]; doorRot = [0, Math.PI/2, 0]; }
    else if (wall === 'right') { doorPos = [W/2, 0, position]; doorRot = [0, -Math.PI/2, 0]; }

    return (
      <group position={doorPos} rotation={doorRot}>
        {/* Frame */}
        <mesh position={[0, heightM / 2, 0.02]} castShadow receiveShadow>
          <boxGeometry args={[widthM + 0.1, heightM + 0.05, 0.05]} />
          <meshStandardMaterial color="#332a24" roughness={0.9} />
        </mesh>
        
        {/* Panel (slightly open) */}
        <group position={[-widthM / 2, 0, 0.04]} rotation={[0, -Math.PI / 6, 0]}>
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
        <mesh position={[-widthM / 2, 0.01, 0.04]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[widthM - 0.02, widthM, 32, 1, 0, Math.PI / 6]} />
          <meshBasicMaterial color="#a1a1aa" transparent opacity={0.3} side={THREE.DoubleSide} />
        </mesh>
      </group>
    );
  };

  return (
    <group name="room-shell">
      {walls.map(({ key, color, args, position, rotation, opacity }) => (
        <mesh key={key} position={position} rotation={rotation} receiveShadow>
          <planeGeometry args={args} />
          <meshStandardMaterial color={color} {...materialProps} transparent={opacity < 1} opacity={opacity} />
        </mesh>
      ))}
      <mesh position={[0, H, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[W, L]} />
        <meshStandardMaterial color={wallColor} side={THREE.DoubleSide} transparent opacity={0.15} roughness={0.9} />
      </mesh>
      <lineSegments position={[0, H / 2, 0]}>
        <edgesGeometry args={[new THREE.BoxGeometry(W, H, L)]} />
        <lineBasicMaterial color="#6b7280" transparent opacity={0.3} />
      </lineSegments>
      {renderDoor()}
    </group>
  );
}
