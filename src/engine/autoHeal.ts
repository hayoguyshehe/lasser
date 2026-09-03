import type {
  InternalPathModel,
  VectorPath,
  PathSegment,
  Point,
  BBox,
} from '@/types';

const WELD_TOLERANCE = 0.1;

function dist(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function computeBBox(segments: PathSegment[]): BBox {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const seg of segments) {
    const pts = seg.type === 'bezier' ? [seg.start, seg.cp1, seg.cp2, seg.end] : [seg.start, seg.end];
    for (const p of pts) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
  }
  if (minX === Infinity) minX = minY = maxX = maxY = 0;
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

function countNodes(segments: PathSegment[]): number {
  return segments.reduce((acc, s) => acc + (s.type === 'bezier' ? 4 : 2), 0);
}

function clonePath(path: VectorPath): VectorPath {
  return {
    ...path,
    segments: path.segments.map((s) => ({ ...s })) as PathSegment[],
    bbox: { ...path.bbox },
  };
}

function cloneModel(model: InternalPathModel): InternalPathModel {
  return {
    ...model,
    paths: model.paths.map(clonePath),
    layers: model.layers.map((l) => ({ ...l })),
    warnings: [...model.warnings],
  };
}

function weldOpenPaths(model: InternalPathModel): { model: InternalPathModel; fixed: number } {
  let fixed = 0;
  const newPaths = model.paths.map((path) => {
    if (path.closed || path.segments.length === 0) return path;
    const first = path.segments[0];
    const last = path.segments[path.segments.length - 1];
    const gap = dist(first.start, last.end);
    if (gap <= WELD_TOLERANCE && gap > 1e-9) {
      const newSegs = [...path.segments, { type: 'line' as const, start: last.end, end: first.start }];
      fixed++;
      return {
        ...path,
        segments: newSegs,
        closed: true,
        nodeCount: countNodes(newSegs),
        bbox: computeBBox(newSegs),
      };
    }
    return path;
  });
  return { model: { ...model, paths: newPaths }, fixed };
}

function pathsSameGeometry(a: VectorPath, b: VectorPath): boolean {
  if (a.segments.length !== b.segments.length) return false;
  if (Math.abs(a.bbox.minX - b.bbox.minX) > 0.01) return false;
  if (Math.abs(a.bbox.minY - b.bbox.minY) > 0.01) return false;
  if (Math.abs(a.bbox.width - b.bbox.width) > 0.01) return false;
  if (Math.abs(a.bbox.height - b.bbox.height) > 0.01) return false;
  return true;
}

function deduplicatePaths(model: InternalPathModel): { model: InternalPathModel; fixed: number } {
  let fixed = 0;
  const keep: VectorPath[] = [];
  const removed = new Set<string>();

  for (let i = 0; i < model.paths.length; i++) {
    if (removed.has(model.paths[i].id)) continue;
    keep.push(model.paths[i]);
    for (let j = i + 1; j < model.paths.length; j++) {
      if (removed.has(model.paths[j].id)) continue;
      if (pathsSameGeometry(model.paths[i], model.paths[j])) {
        removed.add(model.paths[j].id);
        fixed++;
      }
    }
  }

  return { model: { ...model, paths: keep }, fixed };
}

function simplifyPath(path: VectorPath, tolerance: number): VectorPath {
  if (path.segments.length <= 2) return path;

  const points: Point[] = [path.segments[0].start];
  for (const seg of path.segments) {
    points.push(seg.end);
  }

  const keep = douglasPeucker(points, tolerance);
  if (keep.length < 3) return path;

  const newSegs: PathSegment[] = [];
  for (let i = 0; i < keep.length - 1; i++) {
    newSegs.push({ type: 'line', start: keep[i], end: keep[i + 1] });
  }
  if (path.closed && newSegs.length > 0) {
    newSegs.push({ type: 'line', start: newSegs[newSegs.length - 1].end, end: newSegs[0].start });
  }

  return {
    ...path,
    segments: newSegs,
    nodeCount: countNodes(newSegs),
    bbox: computeBBox(newSegs),
  };
}

function douglasPeucker(points: Point[], tolerance: number): Point[] {
  if (points.length <= 2) return points;

  let maxDist = 0;
  let maxIdx = 0;
  const first = points[0];
  const last = points[points.length - 1];

  for (let i = 1; i < points.length - 1; i++) {
    const d = perpendicularDistance(points[i], first, last);
    if (d > maxDist) {
      maxDist = d;
      maxIdx = i;
    }
  }

  if (maxDist > tolerance) {
    const left = douglasPeucker(points.slice(0, maxIdx + 1), tolerance);
    const right = douglasPeucker(points.slice(maxIdx), tolerance);
    return [...left.slice(0, -1), ...right];
  }

  return [first, last];
}

function perpendicularDistance(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-10) return dist(p, a);
  return Math.abs(dy * p.x - dx * p.y + b.x * a.y - b.y * a.x) / len;
}

function simplifyPaths(model: InternalPathModel, tolerance: number): { model: InternalPathModel; fixed: number } {
  let fixed = 0;
  const newPaths = model.paths.map((path) => {
    const before = path.nodeCount;
    const simplified = simplifyPath(path, tolerance);
    if (simplified.nodeCount < before) fixed += before - simplified.nodeCount;
    return simplified;
  });
  return { model: { ...model, paths: newPaths }, fixed };
}

function reorderInnerToOuter(model: InternalPathModel): { model: InternalPathModel; fixed: number } {
  const sorted = [...model.paths].sort((a, b) => {
    const areaA = a.bbox.width * a.bbox.height;
    const areaB = b.bbox.width * b.bbox.height;
    return areaA - areaB;
  });
  const reordered = sorted.some((p, i) => p.id !== model.paths[i].id);
  return { model: { ...model, paths: sorted }, fixed: reordered ? 1 : 0 };
}

export type HealResult = {
  model: InternalPathModel;
  closedGaps: number;
  removedDuplicates: number;
  simplifiedNodes: number;
  reorderedPaths: boolean;
  totalFixes: number;
};

export function autoHeal(original: InternalPathModel): HealResult {
  let model = cloneModel(original);

  const r1 = weldOpenPaths(model);
  model = r1.model;

  const r2 = deduplicatePaths(model);
  model = r2.model;

  const r3 = simplifyPaths(model, 0.01);
  model = r3.model;

  const r4 = reorderInnerToOuter(model);
  model = r4.model;

  const totalFixes = r1.fixed + r2.fixed + (r3.fixed > 0 ? 1 : 0) + (r4.fixed > 0 ? 1 : 0);

  return {
    model,
    closedGaps: r1.fixed,
    removedDuplicates: r2.fixed,
    simplifiedNodes: r3.fixed,
    reorderedPaths: r4.fixed > 0,
    totalFixes,
  };
}

export { cloneModel };
