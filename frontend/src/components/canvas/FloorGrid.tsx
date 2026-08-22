import { Grid } from '@react-three/drei';

interface FloorGridProps { widthM: number; lengthM: number; }

export function FloorGrid({ widthM, lengthM }: FloorGridProps) {
  const maxDim = Math.max(widthM, lengthM);
  return (
    <Grid
      position={[0, 0.001, 0]}
      args={[widthM, lengthM]}
      cellSize={0.1} cellThickness={0.4} cellColor="#9ca3af"
      sectionSize={1} sectionThickness={0.8} sectionColor="#6366f1"
      fadeDistance={maxDim * 2} fadeStrength={1.2}
      followCamera={false} infiniteGrid={false}
    />
  );
}
