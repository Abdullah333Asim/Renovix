import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import {
  OrbitControls,
  Environment,
  ContactShadows,
  BakeShadows,
  Preload,
  Html,
  useProgress,
} from '@react-three/drei';
import { RoomShell } from './RoomShell';
import { FloorGrid } from './FloorGrid';
import { FurnitureItem } from './FurnitureItem';
import { useRoomStore } from '../../store/roomStore';
import type { RoomDimensions } from '../../types/room';

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
  return (
    <OrbitControls
      makeDefault
      enablePan
      enableZoom
      enableRotate
      minDistance={1}
      maxDistance={Math.max(widthM, lengthM, heightM) * 3}
      maxPolarAngle={Math.PI / 2 - 0.05}
      minPolarAngle={0.1}
      target={[0, heightM / 3, 0]}
      dampingFactor={0.08}
      enableDamping
      enabled={!useRoomStore((s) => s.isDraggingGizmo)}
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
        shadow-mapSize={[1024, 1024]}
        shadow-radius={8}
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
        blur={2.5}
        far={heightM}
        color="#1e1b4b"
      />
    </>
  );
}

function DimensionLabel({
  text,
  position,
}: {
  text: string;
  position: [number, number, number];
}) {
  return (
    <Html position={position} center>
      <div
        style={{
          background: 'rgba(30,27,75,0.75)',
          backdropFilter: 'blur(6px)',
          border: '1px solid rgba(99,102,241,0.4)',
          borderRadius: 6,
          padding: '2px 8px',
          color: '#a5b4fc',
          fontSize: 11,
          fontFamily: 'Inter,sans-serif',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
        }}
      >
        {text}
      </div>
    </Html>
  );
}

function DimensionAnnotations({ dimensions }: { dimensions: RoomDimensions }) {
  const { widthM: W, lengthM: L, heightM: H } = dimensions;
  return (
    <>
      <DimensionLabel text={`W: ${W.toFixed(2)} m`} position={[0, 0.1, L / 2 + 0.25]} />
      <DimensionLabel text={`L: ${L.toFixed(2)} m`} position={[W / 2 + 0.25, 0.1, 0]} />
      <DimensionLabel
        text={`H: ${H.toFixed(2)} m`}
        position={[W / 2 + 0.25, H / 2, L / 2 + 0.25]}
      />
    </>
  );
}

export function SceneCanvas({ canvasRef }: { canvasRef?: React.RefObject<HTMLCanvasElement> }) {
  const dimensions = useRoomStore((s) => s.dimensions);
  const manifest = useRoomStore((s) => s.manifest);

  return (
    <Canvas
      ref={canvasRef}
      shadows
      gl={{ antialias: true, toneMapping: 2, preserveDrawingBuffer: true }}
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
        <DimensionAnnotations dimensions={dimensions} />

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
