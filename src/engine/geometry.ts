import type { Point, PathSegment, VectorPath } from '@/types';

export function dist(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function linesIntersect(p1: Point, p2: Point, p3: Point, p4: Point): boolean {
  const d1x = p2.x - p1.x;
  const d1y = p2.y - p1.y;
  const d2x = p4.x - p3.x;
  const d2y = p4.y - p3.y;
  const denom = d1x * d2y - d1y * d2x;
  if (Math.abs(denom) < 1e-10) return false;
  const t = ((p3.x - p1.x) * d2y - (p3.y - p1.y) * d2x) / denom;
  const u = ((p3.x - p1.x) * d1y - (p3.y - p1.y) * d1x) / denom;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}

export function flattenBezier(seg: Extract<PathSegment, { type: 'bezier' }>, steps: number): Point[] {
  const pts: Point[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const u = 1 - t;
    const x = u * u * u * seg.start.x + 3 * u * u * t * seg.cp1.x + 3 * u * t * t * seg.cp2.x + t * t * t * seg.end.x;
    const y = u * u * u * seg.start.y + 3 * u * u * t * seg.cp1.y + 3 * u * t * t * seg.cp2.y + t * t * t * seg.end.y;
    pts.push({ x, y });
  }
  return pts;
}

const FLATTEN_STEPS = 12;

export function pathToPolyline(path: VectorPath): Point[] {
  const pts: Point[] = [];
  for (const seg of path.segments) {
    if (seg.type === 'line') {
      if (pts.length === 0) pts.push(seg.start);
      pts.push(seg.end);
    } else if (seg.type === 'bezier') {
      const flat = flattenBezier(seg, FLATTEN_STEPS);
      if (pts.length === 0) pts.push(flat[0]);
      for (let i = 1; i < flat.length; i++) pts.push(flat[i]);
    }
  }
  return pts;
}

export function pathsOverlap(a: VectorPath, b: VectorPath): boolean {
  const polyA = pathToPolyline(a);
  const polyB = pathToPolyline(b);
  for (let i = 0; i < polyA.length - 1; i++) {
    for (let j = 0; j < polyB.length - 1; j++) {
      if (linesIntersect(polyA[i], polyA[i + 1], polyB[j], polyB[j + 1])) return true;
    }
  }
  return false;
}

const POINT_TOLERANCE = 0.01;

export function pathsSameGeometry(a: VectorPath, b: VectorPath): boolean {
  const polyA = pathToPolyline(a);
  const polyB = pathToPolyline(b);
  if (polyA.length !== polyB.length) return false;
  for (let i = 0; i < polyA.length; i++) {
    if (dist(polyA[i], polyB[i]) > POINT_TOLERANCE) return false;
  }
  return true;
}

export function pointInPolygon(pt: Point, polygon: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    const intersect = ((yi > pt.y) !== (yj > pt.y)) &&
      (pt.x < ((xj - xi) * (pt.y - yi) / (yj - yi) + xi));
    if (intersect) inside = !inside;
  }
  return inside;
}
