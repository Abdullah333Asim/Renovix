import { Suspense, useEffect, useState, useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import {
  OrbitControls,
  Environment,
  ContactShadows,
  BakeShadows,
  Preload,
  Html,
  useProgress,
} from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { RoomShell } from './RoomShell';
import { FloorGrid } from './FloorGrid';
import { FurnitureItem } from './FurnitureItem';
import { useRoomStore } from '../../store/roomStore';
import type { RoomDimensions } from '../../types/room';
import { clampToPolygon } from '../../utils/geometry';


function Loader() {
  const { progress } = useProgress();
  return (
    <Html center>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
          color: 'white',
        }}
      >
        <div
          style={{
            width: 160,
            height: 3,
            background: 'rgba(255,255,255,0.15)',
            borderRadius: 100,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${progress}%`,
              height: '100%',
              background: '#818cf8',
              transition: 'width 0.3s',
            }}
          />
        </div>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
          {Math.round(progress)}%
        </span>
      </div>
    </Html>
  );
}

function CameraRig({ dimensions }: { dimensions: RoomDimensions }) {
  const { widthM, lengthM, heightM } = dimensions;
  const cameraMode = useRoomStore((s) => s.cameraMode);
  const isDraggingGizmo = useRoomStore((s) => s.isDraggingGizmo);
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const { camera } = useThree();

  useEffect(() => {
    if (!controlsRef.current) return;
    if (cameraMode === 'top_down') {
      const topY = Math.max(widthM, lengthM) * 1.6;
      camera.position.set(0, topY, 0.001);
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
    } else if (cameraMode === 'walkthrough') {
      camera.position.set(0, 1.6, lengthM / 2 - 0.4);
      controlsRef.current.target.set(0, 1.4, 0);
      controlsRef.current.update();
    } else {
      camera.position.set(widthM * 0.8, heightM * 0.9, lengthM * 1.2);
      controlsRef.current.target.set(0, heightM / 3, 0);
      controlsRef.current.update();
    }
  }, [cameraMode, widthM, lengthM, heightM, camera]);

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enablePan
      enableZoom
      enableRotate={cameraMode !== 'top_down'}
      minDistance={0.5}
      maxDistance={Math.max(widthM, lengthM, heightM) * 4}
      maxPolarAngle={cameraMode === 'top_down' ? 0.02 : Math.PI / 2 - 0.05}
      minPolarAngle={cameraMode === 'top_down' ? 0 : 0.05}
      target={[0, heightM / 3, 0]}
      dampingFactor={0.08}
      enableDamping
      enabled={!isDraggingGizmo}
    />
  );
}

function SceneLighting({ dimensions }: { dimensions: RoomDimensions }) {
  const { widthM, lengthM, heightM } = dimensions;
  return (
    <>
      <ambientLight intensity={0.4} color="#c7d2fe" />
      <pointLight
        position={[0, heightM * 0.9, 0]}
        intensity={30}
        color="#fff5e0"
        castShadow
        shadow-mapSize={[512, 512]}
        shadow-bias={-0.001}
        shadow-radius={6}
        decay={2}
        distance={heightM * 3}
      />
      <pointLight
        position={[-widthM * 0.4, heightM * 0.7, -lengthM * 0.4]}
        intensity={8}
        color="#a5b4fc"
        decay={2}
        distance={heightM * 4}
      />
      <directionalLight
        position={[widthM * 0.5, heightM, lengthM * 0.5]}
        intensity={0.6}
        color="#fde68a"
      />
      <ContactShadows
        position={[0, 0.002, 0]}
        opacity={0.35}
        scale={Math.max(widthM, lengthM) * 1.5}
        blur={2.0}
        far={heightM}
        color="#1e1b4b"
        resolution={512}
        frames={1}
      />
    </>
  );
}

function CanvasDropHandler() {
  const { camera, gl } = useThree();
  const dimensions = useRoomStore((s) => s.dimensions);
  const addFurnitureItem = useRoomStore((s) => s.addFurnitureItem);
  const [dragCursor, setDragCursor] = useState<[number, number, number] | null>(null);

  useEffect(() => {
    const canvasEl = gl.domElement;

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'copy';
      }

      const rect = canvasEl.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, camera);
      const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      const intersection = new THREE.Vector3();
      if (raycaster.ray.intersectPlane(groundPlane, intersection)) {
        const { widthM, lengthM, shapeType, polygonVertices } = dimensions;
        let cx = intersection.x;
        let cz = intersection.z;
        if (shapeType === 'custom_polygon' && polygonVertices && polygonVertices.length >= 3) {
          [cx, cz] = clampToPolygon([cx, cz], polygonVertices);
        } else {
          cx = Math.max(-widthM / 2 + 0.1, Math.min(widthM / 2 - 0.1, cx));
          cz = Math.max(-lengthM / 2 + 0.1, Math.min(lengthM / 2 - 0.1, cz));
        }
        setDragCursor([cx, 0.02, cz]);
      }
    };

    const handleDragLeave = () => {
      setDragCursor(null);
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      setDragCursor(null);

      const templateId =
        e.dataTransfer?.getData('application/renovix-template') ||
        e.dataTransfer?.getData('text/plain');

      if (!templateId) return;

      const rect = canvasEl.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, camera);

      const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      const intersection = new THREE.Vector3();
      const hit = raycaster.ray.intersectPlane(groundPlane, intersection);

      if (hit) {
        const { widthM, lengthM, shapeType, polygonVertices } = dimensions;
        let cx = intersection.x;
        let cz = intersection.z;
        if (shapeType === 'custom_polygon' && polygonVertices && polygonVertices.length >= 3) {
          [cx, cz] = clampToPolygon([cx, cz], polygonVertices);
        } else {
          cx = Math.max(-widthM / 2 + 0.15, Math.min(widthM / 2 - 0.15, cx));
          cz = Math.max(-lengthM / 2 + 0.15, Math.min(lengthM / 2 - 0.15, cz));
        }
        addFurnitureItem(templateId, [cx, 0, cz]);
      } else {
        addFurnitureItem(templateId, [0, 0, 0]);
      }
    };


    canvasEl.addEventListener('dragover', handleDragOver);
    canvasEl.addEventListener('dragleave', handleDragLeave);
    canvasEl.addEventListener('drop', handleDrop);

    return () => {
      canvasEl.removeEventListener('dragover', handleDragOver);
      canvasEl.removeEventListener('dragleave', handleDragLeave);
      canvasEl.removeEventListener('drop', handleDrop);
    };
  }, [camera, gl, dimensions, addFurnitureItem]);

  if (!dragCursor) return null;

  return (
    <group position={dragCursor}>
      {/* Drop Target Indicator Ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.25, 0.35, 32]} />
        <meshBasicMaterial color="#f59e0b" transparent opacity={0.8} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.24, 32]} />
        <meshBasicMaterial color="#f59e0b" transparent opacity={0.2} />
      </mesh>
    </group>
  );
}

function SceneExporterBridge() {
  const { scene } = useThree();
  useEffect(() => {
    (window as any).__renovix_three_scene = scene;
  }, [scene]);
  return null;
}

export function SceneCanvas({ canvasRef }: { canvasRef?: React.RefObject<HTMLCanvasElement | null> }) {
  const dimensions = useRoomStore((s) => s.dimensions);
  const manifest = useRoomStore((s) => s.manifest);

  return (
    <Canvas
      ref={canvasRef}
      shadows
      dpr={[1, 1.5]}
      gl={{
        powerPreference: 'high-performance',
        antialias: false,
        toneMapping: THREE.ACESFilmicToneMapping,
        preserveDrawingBuffer: true,
        stencil: false,
        depth: true,
      }}
      onPointerMissed={() => {
        // Only deselect when the user genuinely clicks empty canvas space,
        // not when they release the mouse after dragging a furniture item.
        const state = useRoomStore.getState();
        if (!state.isDraggingGizmo) {
          state.setSelectedId(null);
        }
      }}
      camera={{
        fov: 55,
        near: 0.1,
        far: 200,
        position: [
          dimensions.widthM * 0.8,
          dimensions.heightM * 0.9,
          dimensions.lengthM * 1.2,
        ],
      }}
      style={{ background: 'transparent' }}
    >
      <Environment preset="apartment" background={false} />
      <Suspense fallback={<Loader />}>
        <SceneLighting dimensions={dimensions} />
        <RoomShell dimensions={dimensions} />
        <FloorGrid widthM={dimensions.widthM} lengthM={dimensions.lengthM} />
        <CanvasDropHandler />
        <SceneExporterBridge />

        {/* Render reconstructed furniture items from manifest */}
        {manifest?.furniture.map((item) => (
          <FurnitureItem key={item.id} item={item} />
        ))}

        <BakeShadows />
        <Preload all />
      </Suspense>
      <CameraRig dimensions={dimensions} />
    </Canvas>
  );
}
