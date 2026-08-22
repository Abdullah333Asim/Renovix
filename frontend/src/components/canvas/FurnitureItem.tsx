import { useMemo, useRef, useState, useEffect, Suspense } from 'react';
import { useGLTF, Html } from '@react-three/drei';
import * as THREE from 'three';
import type { FurnitureItem as FurnitureItemType } from '../../types/room';
import { useRoomStore } from '../../store/roomStore';
import { ProceduralFurnitureMesh } from './ProceduralFurnitureMesh';

interface FurnitureItemProps {
  item: FurnitureItemType;
}

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

function RawGLTFModel({ item }: { item: FurnitureItemType }) {
  const glbUrl = useMemo(() => {
    if (item.glbUrl.startsWith('/data')) {
      return `${API_BASE}${item.glbUrl}`;
    }
    return item.glbUrl;
  }, [item.glbUrl]);

  const { scene } = useGLTF(glbUrl);

  const clonedScene = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        if (item.colorTint && mesh.material) {
          const mat = (mesh.material as THREE.MeshStandardMaterial).clone();
          mat.color = new THREE.Color(item.colorTint);
          mesh.material = mat;
        }
      }
    });
    return clone;
  }, [scene, item.colorTint]);

  return <primitive object={clonedScene} />;
}

export function FurnitureItem({ item }: FurnitureItemProps) {
  const {
    selectedId, setSelectedId,
    updateFurnitureItem, manifest, setManifest, dimensions, setIsDraggingGizmo
  } = useRoomStore();
  const isSelected = selectedId === item.id;

  const groupRef = useRef<THREE.Group>(null);
  const [isColliding, setIsColliding] = useState(false);

  // Dragging state — tracked via a ref so handlers always see current value
  // without causing re-renders or stale-closure bugs.
  const isDraggingRef = useRef(false);
  const dragOffset = useRef({ x: 0, z: 0 });

  // Sync position/rotation when changed externally (not while dragging)
  useEffect(() => {
    if (groupRef.current && !isDraggingRef.current) {
      groupRef.current.position.set(...item.position);
      groupRef.current.rotation.set(0, item.rotationY, 0);
    }
  }, [item.position, item.rotationY]);

  // Keyboard shortcuts — only active while this item is selected
  useEffect(() => {
    if (!isSelected) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input / select
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'SELECT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) return;

      if (e.key === 'Escape') {
        setSelectedId(null);
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (manifest) {
          setManifest({
            ...manifest,
            furniture: manifest.furniture.filter(f => f.id !== item.id),
          });
        }
        setSelectedId(null);
      }

      // Rotation — 15° per keypress
      if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') {
        updateFurnitureItem(item.id, { rotationY: item.rotationY - Math.PI / 12 });
      }
      if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') {
        updateFurnitureItem(item.id, { rotationY: item.rotationY + Math.PI / 12 });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSelected, item.id, item.rotationY, manifest, setManifest, setSelectedId, updateFurnitureItem]);

  const wireframeColor = isColliding ? '#ef4444' : '#818cf8';

  const checkCollisions = () => {
    if (!groupRef.current || !manifest) return;
    const box = new THREE.Box3().setFromObject(groupRef.current);

    let collision = false;
    const { widthM, lengthM } = dimensions;
    if (
      box.min.x < -widthM / 2 || box.max.x > widthM / 2 ||
      box.min.z < -lengthM / 2 || box.max.z > lengthM / 2
    ) {
      collision = true;
    }

    if (!collision) {
      for (const other of manifest.furniture) {
        if (other.id === item.id) continue;
        const [w, h, d] = other.dimensions;
        const [x, y, z] = other.position;
        const mat = new THREE.Matrix4().compose(
          new THREE.Vector3(x, y + h / 2, z),
          new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), other.rotationY),
          new THREE.Vector3(1, 1, 1)
        );
        const geom = new THREE.BoxGeometry(w, h, d);
        geom.applyMatrix4(mat);
        geom.computeBoundingBox();
        const otherBox = geom.boundingBox!;
        otherBox.expandByScalar(-0.02);
        if (box.intersectsBox(otherBox)) {
          collision = true;
          break;
        }
      }
    }

    setIsColliding(collision);
  };

  // ── Pointer Handlers ──────────────────────────────────────────────────────

  const handlePointerDown = (e: any) => {
    // Always stop propagation so Canvas onPointerMissed never fires on objects
    e.stopPropagation();

    // Select this item immediately on pointer-down
    setSelectedId(item.id);

    // Begin drag
    isDraggingRef.current = true;
    setIsDraggingGizmo(true);

    if (groupRef.current) {
      dragOffset.current = {
        x: groupRef.current.position.x - e.point.x,
        z: groupRef.current.position.z - e.point.z,
      };
    }

    // Capture pointer so mousemove events continue even if cursor leaves mesh
    if (e.target?.setPointerCapture) {
      e.target.setPointerCapture(e.pointerId);
    }
  };

  const handlePointerUp = (e: any) => {
    if (!isDraggingRef.current) return;

    // Commit final position to store
    if (groupRef.current) {
      updateFurnitureItem(item.id, {
        position: [
          groupRef.current.position.x,
          item.position[1],
          groupRef.current.position.z,
        ],
      });
    }

    // Release pointer capture
    if (e.target?.releasePointerCapture) {
      e.target.releasePointerCapture(e.pointerId);
    }

    isDraggingRef.current = false;
    setIsDraggingGizmo(false);

    // ⚠️ DO NOT clear selectedId here — the Inspector must stay open
    // Selection is only cleared by: Escape, clicking empty canvas, or X button
    e.stopPropagation();
  };

  const handlePointerMove = (e: any) => {
    if (!isDraggingRef.current || !groupRef.current) return;
    e.stopPropagation();

    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const intersect = new THREE.Vector3();
    e.ray.intersectPlane(plane, intersect);

    if (intersect) {
      groupRef.current.position.x = intersect.x + dragOffset.current.x;
      groupRef.current.position.z = intersect.z + dragOffset.current.z;
      checkCollisions();
    }
  };

  const handleClick = (e: any) => {
    // Always stop propagation — prevents Canvas onPointerMissed from deselecting
    e.stopPropagation();
    // Selection is already set on pointerDown; nothing extra needed here
  };

  const isTemplateMode = item.meshSource !== 'reconstruction';

  return (
    <group
      ref={groupRef}
      position={item.position}
      rotation={[0, item.rotationY, 0]}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerMove={handlePointerMove}
      onClick={handleClick}
    >
      {/* ── 3D Geometry ──────────────────────────────────── */}
      {isTemplateMode ? (
        <ProceduralFurnitureMesh
          templateId={item.templateId}
          category={item.label}
          dimensions={item.dimensions}
          colorTint={item.colorTint || item.dominantColor}
          materialPreset={item.materialPreset}
        />
      ) : (
        <Suspense
          fallback={
            <ProceduralFurnitureMesh
              templateId={item.templateId}
              category={item.label}
              dimensions={item.dimensions}
              colorTint={item.colorTint || item.dominantColor}
              materialPreset={item.materialPreset}
            />
          }
        >
          <RawGLTFModel item={item} />
        </Suspense>
      )}

      {/* ── Selection Overlay ─────────────────────────────── */}
      {isSelected && (
        <>
          <mesh position={[0, item.dimensions[1] / 2, 0]}>
            <boxGeometry
              args={[
                item.dimensions[0] * 1.05,
                item.dimensions[1] * 1.05,
                item.dimensions[2] * 1.05,
              ]}
            />
            <meshBasicMaterial color={wireframeColor} wireframe transparent opacity={0.6} />
          </mesh>
          <Html position={[0, item.dimensions[1] + 0.2, 0]} center zIndexRange={[100, 0]}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div
                style={{
                  background: isColliding ? 'rgba(127,29,29,0.85)' : 'rgba(30,27,75,0.95)',
                  backdropFilter: 'blur(8px)',
                  border: `1px solid ${wireframeColor}`,
                  borderRadius: 6,
                  padding: '4px 10px',
                  color: isColliding ? '#fca5a5' : '#e0e7ff',
                  fontSize: 12,
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  pointerEvents: 'none',
                  boxShadow: `0 0 10px ${wireframeColor}40`,
                }}
              >
                {item.label.toUpperCase()} {isColliding && '(Collision)'}
              </div>
              <div
                style={{
                  marginTop: '4px',
                  background: 'rgba(0,0,0,0.7)',
                  padding: '3px 8px',
                  borderRadius: '4px',
                  fontSize: '9px',
                  fontWeight: 500,
                  color: '#a5b4fc',
                  whiteSpace: 'nowrap',
                  pointerEvents: 'none',
                  border: '1px solid rgba(165,180,252,0.3)',
                }}
              >
                [Drag to Move | A/D to Rotate]
              </div>
            </div>
          </Html>
        </>
      )}
    </group>
  );
}
