import type {
  InternalPathModel,
  VectorPath,
  DiagnosticIssue,
  IssueCategory,
  IssueSeverity,
  DiagnosticResult,
  Point,
} from '@/types';
import { dist, linesIntersect, pathsOverlap, pathToPolyline } from './geometry';

let issueIdCounter = 0;
const nextIssueId = () => `issue-${(++issueIdCounter).toString(36)}`;

const PENALTY_WEIGHTS: Record<IssueCategory, number> = {
  'open-vector': 25,
  'duplicate-path': 25,
  'self-intersection': 15,
  'node-density': 15,
  'tiny-geometry': 8,
  'text-not-outlined': 12,
  'embedded-raster': 12,
};

const SEVERITY_MAP: Record<IssueCategory, IssueSeverity> = {
  'open-vector': 'high',
  'duplicate-path': 'high',
  'self-intersection': 'medium',
  'node-density': 'medium',
  'tiny-geometry': 'low',
  'text-not-outlined': 'medium',
  'embedded-raster': 'medium',
};

function getEndpoints(path: VectorPath): { start: Point; end: Point } | null {
  if (path.segments.length === 0) return null;
  const first = path.segments[0];
  const last = path.segments[path.segments.length - 1];
  return { start: first.start, end: last.end };
}

function detectOpenVectors(model: InternalPathModel): DiagnosticIssue[] {
  const issues: DiagnosticIssue[] = [];
  for (const path of model.paths) {
    if (!path.closed && path.segments.length > 0) {
      const endpoints = getEndpoints(path);
      if (endpoints) {
        const gap = dist(endpoints.start, endpoints.end);
        issues.push({
          id: nextIssueId(),
          category: 'open-vector',
          severity: SEVERITY_MAP['open-vector'],
          message: `Open vector — gap of ${gap.toFixed(3)}mm between start and end points`,
          pathId: path.id,
          layerId: path.layerId,
          location: endpoints.end,
          details: `Path has ${path.segments.length} segments but is not closed`,
        });
      }
    }
  }
  return issues;
}

function detectDuplicates(model: InternalPathModel): DiagnosticIssue[] {
  const issues: DiagnosticIssue[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < model.paths.length; i++) {
    for (let j = i + 1; j < model.paths.length; j++) {
      const a = model.paths[i];
      const b = model.paths[j];
      if (a.segments.length !== b.segments.length) continue;
      const bboxDist = Math.max(
        Math.abs(a.bbox.minX - b.bbox.minX),
        Math.abs(a.bbox.minY - b.bbox.minY)
      );
      if (bboxDist > 1) continue;
      if (pathsOverlap(a, b)) {
        const key = `${a.id}-${b.id}`;
        if (!seen.has(key)) {
          seen.add(key);
          issues.push({
            id: nextIssueId(),
            category: 'duplicate-path',
            severity: SEVERITY_MAP['duplicate-path'],
            message: `Duplicate/overlapping paths detected — will burn the same area twice`,
            pathId: a.id,
            layerId: a.layerId,
            location: { x: a.bbox.minX, y: a.bbox.minY },
            details: `Overlaps with path ${b.id}`,
          });
        }
      }
    }
  }
  return issues;
}

function detectSelfIntersections(model: InternalPathModel): DiagnosticIssue[] {
  const issues: DiagnosticIssue[] = [];
  for (const path of model.paths) {
    const poly = pathToPolyline(path);
    for (let i = 0; i < poly.length - 1; i++) {
      for (let j = i + 2; j < poly.length - 1; j++) {
        if (i === 0 && j === poly.length - 2 && path.closed) continue;
        if (linesIntersect(poly[i], poly[i + 1], poly[j], poly[j + 1])) {
          issues.push({
            id: nextIssueId(),
            category: 'self-intersection',
            severity: SEVERITY_MAP['self-intersection'],
            message: `Self-intersection detected — cut path will be unpredictable`,
            pathId: path.id,
            layerId: path.layerId,
            location: poly[i + 1],
            details: `Segment ${i} intersects segment ${j}`,
          });
          break;
        }
      }
    }
  }
  return issues;
}

function detectNodeDensity(model: InternalPathModel): DiagnosticIssue[] {
  const issues: DiagnosticIssue[] = [];
  for (const path of model.paths) {
    if (path.segments.length === 0) continue;
    if (path.isPrimitive) continue;
    const perimeter = path.segments.reduce((acc, s) => {
      if (s.type === 'line') return acc + dist(s.start, s.end);
      if (s.type === 'bezier') return acc + dist(s.start, s.cp1) + dist(s.cp1, s.cp2) + dist(s.cp2, s.end);
      return acc;
    }, 0);
    if (perimeter < 0.001) continue;
    const density = path.nodeCount / perimeter;
    const threshold = path.isPrimitive ? 100 : 20;
    if (density > threshold) {
      issues.push({
        id: nextIssueId(),
        category: 'node-density',
        severity: SEVERITY_MAP['node-density'],
        message: `Excessive node density (${density.toFixed(1)} nodes/mm) — stepper may stutter`,
        pathId: path.id,
        layerId: path.layerId,
        location: { x: path.bbox.minX, y: path.bbox.minY },
        details: `${path.nodeCount} nodes over ${perimeter.toFixed(2)}mm perimeter`,
      });
    }
  }
  return issues;
}

function detectTinyGeometry(model: InternalPathModel): DiagnosticIssue[] {
  const issues: DiagnosticIssue[] = [];
  const TINY_THRESHOLD = 0.1;
  for (const path of model.paths) {
    if (path.bbox.width < TINY_THRESHOLD && path.bbox.height < TINY_THRESHOLD) {
      issues.push({
        id: nextIssueId(),
        category: 'tiny-geometry',
        severity: SEVERITY_MAP['tiny-geometry'],
        message: `Tiny geometry detected (${path.bbox.width.toFixed(3)}×${path.bbox.height.toFixed(3)}mm) — may waste time`,
        pathId: path.id,
        layerId: path.layerId,
        location: { x: path.bbox.minX, y: path.bbox.minY },
      });
    }
  }
  return issues;
}

function detectTextAndRaster(model: InternalPathModel): DiagnosticIssue[] {
  const issues: DiagnosticIssue[] = [];
  for (const warning of model.warnings) {
    if (warning.includes('Text element')) {
      issues.push({
        id: nextIssueId(),
        category: 'text-not-outlined',
        severity: SEVERITY_MAP['text-not-outlined'],
        message: warning,
      });
    }
    if (warning.includes('raster')) {
      issues.push({
        id: nextIssueId(),
        category: 'embedded-raster',
        severity: SEVERITY_MAP['embedded-raster'],
        message: warning,
      });
    }
  }
  return issues;
}

export function runDiagnostics(model: InternalPathModel): DiagnosticResult {
  issueIdCounter = 0;

  const allIssues: DiagnosticIssue[] = [
    ...detectOpenVectors(model),
    ...detectDuplicates(model),
    ...detectSelfIntersections(model),
    ...detectNodeDensity(model),
    ...detectTinyGeometry(model),
    ...detectTextAndRaster(model),
  ];

  const categoryCounts = {} as Record<IssueCategory, number>;
  for (const cat of Object.keys(PENALTY_WEIGHTS) as IssueCategory[]) {
    categoryCounts[cat] = 0;
  }
  for (const issue of allIssues) {
    categoryCounts[issue.category]++;
  }

  let totalPenalty = 0;
  for (const issue of allIssues) {
    totalPenalty += PENALTY_WEIGHTS[issue.category];
  }
  const healthScore = Math.max(0, Math.round(100 - totalPenalty));

  const totalNodes = model.paths.reduce((acc, p) => acc + p.nodeCount, 0);

  return {
    issues: allIssues,
    healthScore,
    totalPaths: model.paths.length,
    totalNodes,
    categoryCounts,
  };
}

export { PENALTY_WEIGHTS, SEVERITY_MAP };
