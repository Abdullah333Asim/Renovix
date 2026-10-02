// ─── 2D Geometry Utilities ────────────────────────────────────────────────────
// All coordinates are [x, z] in metres (Y is the vertical axis in Three.js).

/**
 * Ray-casting even-odd Point-in-Polygon test.
 * Returns true when `point` lies strictly inside `polygon`.
 */
export function isPointInPolygon(
  point: [number, number],
  polygon: [number, number][],
): boolean {
  const [x, z] = point;
  let inside = false;
  const n = polygon.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const [xi, zi] = polygon[i];
    const [xj, zj] = polygon[j];
    const intersect =
      zi > z !== zj > z &&
      x < ((xj - xi) * (z - zi)) / (zj - zi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Returns the closest point on a line-segment [a, b] to `p`.
 */
function closestPointOnSegment(
  p: [number, number],
  a: [number, number],
  b: [number, number],
): [number, number] {
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  const lenSq = dx * dx + dz * dz;
  if (lenSq === 0) return a;
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / lenSq));
  return [a[0] + t * dx, a[1] + t * dz];
}

/**
 * If `point` is already inside `polygon`, return it unchanged.
 * Otherwise return the nearest point on the polygon boundary.
 */
export function clampToPolygon(
  point: [number, number],
  polygon: [number, number][],
): [number, number] {
  if (isPointInPolygon(point, polygon)) return point;

  let bestDist = Infinity;
  let best: [number, number] = polygon[0];
  const n = polygon.length;
  for (let i = 0; i < n; i++) {
    const a = polygon[i];
    const b = polygon[(i + 1) % n];
    const closest = closestPointOnSegment(point, a, b);
    const dx = closest[0] - point[0];
    const dz = closest[1] - point[1];
    const dist = dx * dx + dz * dz;
    if (dist < bestDist) {
      bestDist = dist;
      best = closest;
    }
  }
  return best;
}

/**
 * Signed area of a polygon (positive = counter-clockwise in standard math coords).
 * Used to determine winding order.
 */
export function polygonSignedArea(polygon: [number, number][]): number {
  let area = 0;
  const n = polygon.length;
  for (let i = 0; i < n; i++) {
    const [x0, z0] = polygon[i];
    const [x1, z1] = polygon[(i + 1) % n];
    area += x0 * z1 - x1 * z0;
  }
  return area / 2;
}

/**
 * Unsigned area of a 2D polygon in square metres.
 */
export function polygonArea(polygon: [number, number][]): number {
  return Math.abs(polygonSignedArea(polygon));
}
