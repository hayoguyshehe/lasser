import DxfParser from 'dxf-parser';
import type { InternalPathModel, VectorPath, PathSegment, Point, BBox, Layer } from '@/types';

let dxfPathIdCounter = 0;
const nextPathId = () => `dxf-path-${(++dxfPathIdCounter).toString(36)}`;

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

function arcToSegments(centerX: number, centerY: number, radius: number, startAngle: number, endAngle: number): PathSegment[] {
  const segments: PathSegment[] = [];
  let sa = startAngle;
  let ea = endAngle;
  while (ea < sa) ea += Math.PI * 2;
  const totalAngle = ea - sa;
  if (totalAngle < 1e-10) return segments;
  const steps = Math.max(2, Math.ceil((totalAngle / (Math.PI * 2)) * 72));
  let prevPt: Point = { x: centerX + radius * Math.cos(sa), y: centerY + radius * Math.sin(sa) };
  for (let i = 1; i <= steps; i++) {
    const a = sa + (totalAngle * i) / steps;
    const pt: Point = { x: centerX + radius * Math.cos(a), y: centerY + radius * Math.sin(a) };
    segments.push({ type: 'line', start: prevPt, end: pt });
    prevPt = pt;
  }
  return segments;
}

function bulgeToArc(p0: Point, p1: Point, bulge: number): { center: Point; radius: number; startAngle: number; endAngle: number } {
  const dx = p1.x - p0.x;
  const dy = p1.y - p0.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 1e-10 || Math.abs(bulge) < 1e-10) {
    return { center: { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 }, radius: 0, startAngle: 0, endAngle: 0 };
  }
  const h = (bulge * dist) / 2;
  const r = (dist / 4 + (h * h) / dist) / Math.abs(bulge);
  const midX = (p0.x + p1.x) / 2;
  const midY = (p0.y + p1.y) / 2;
  const perpX = -dy / dist;
  const perpY = dx / dist;
  const d = r - h / bulge;
  const cx = midX + perpX * d;
  const cy = midY + perpY * d;
  const startAngle = Math.atan2(p0.y - cy, p0.x - cx);
  const endAngle = Math.atan2(p1.y - cy, p1.x - cx);
  return { center: { x: cx, y: cy }, radius: r, startAngle, endAngle };
}

const ACI_COLORS: Record<number, string> = {
  0: '#000000', 1: '#ff0000', 2: '#ffff00', 3: '#00ff00', 4: '#00ffff',
  5: '#0000ff', 6: '#ff00ff', 7: '#ffffff', 8: '#414141', 9: '#808080',
  10: '#ff0000', 11: '#ffaaaa', 12: '#bd0000', 13: '#bd7e7e', 14: '#bd0000',
  15: '#bd7e7e', 30: '#ff7f00', 40: '#ffff00', 50: '#00ff00', 60: '#00ffff',
  70: '#0000ff', 80: '#ff00ff', 90: '#7f7f7f', 140: '#7f7f7f', 150: '#aaaaaa',
  160: '#545454', 170: '#808080', 180: '#a0a0a0', 190: '#3f3f3f', 200: '#555555',
  210: '#777777', 220: '#999999', 230: '#bbbbbb', 240: '#dddddd', 250: '#414141',
};

function colorFromAci(acis: number): string {
  return ACI_COLORS[acis] || '#333333';
}

interface DxfEntity {
  type: string;
  vertices?: { x: number; y: number; z?: number; bulge?: number }[];
  start?: { x: number; y: number };
  end?: { x: number; y: number };
  center?: { x: number; y: number };
  radius?: number;
  startAngle?: number;
  endAngle?: number;
  bulge?: number;
  vertexes?: { x: number; y: number; z?: number; bulge?: number }[];
  layer?: string;
  color?: number;
  shape?: boolean;
  closed?: boolean;
  text?: string;
  position?: { x: number; y: number };
  startPoint?: { x: number; y: number };
  endPoint?: { x: number; y: number };
  controlPoints?: { x: number; y: number }[];
  degree?: number;
}

interface DxfData {
  entities: DxfEntity[];
  tables?: {
    layer?: Record<string, { color?: number; name?: string }>;
  };
  bounds?: { minX: number; minY: number; maxX: number; maxY: number };
}

export function parseDXF(dxfText: string): InternalPathModel {
  dxfPathIdCounter = 0;
  const warnings: string[] = [];

  const parser = new DxfParser();
  let dxf: DxfData;
  try {
    dxf = parser.parseSync(dxfText) as unknown as DxfData;
  } catch {
    throw new Error('Failed to parse DXF file — file may be corrupted or use an unsupported version');
  }

  if (!dxf || !dxf.entities || dxf.entities.length === 0) {
    throw new Error('No entities found in DXF file');
  }

  const layerColors: Record<string, string> = {};
  if (dxf.tables?.layer) {
    for (const [name, info] of Object.entries(dxf.tables.layer)) {
      layerColors[name] = info.color ? colorFromAci(info.color) : '#333333';
    }
  }

  const model: InternalPathModel = {
    paths: [],
    layers: [],
    width: 0,
    height: 0,
    viewBox: null,
    sourceFormat: 'dxf',
    warnings,
  };

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  for (const entity of dxf.entities) {
    if (entity.type === 'TEXT' || entity.type === 'MTEXT') {
      warnings.push('Text element found — convert to outlines before laser cutting');
      continue;
    }
    if (entity.type === 'IMAGE' || entity.type === 'IMAGEDEF') {
      warnings.push('Embedded raster image found — not a pure vector file');
      continue;
    }

    let segments: PathSegment[] = [];
    let closed = false;
    const layerName = entity.layer || '0';
    const color = layerColors[layerName] || (entity.color ? colorFromAci(entity.color) : '#333333');

    switch (entity.type) {
      case 'LINE': {
        if (entity.start && entity.end) {
          segments = [{ type: 'line', start: entity.start, end: entity.end }];
        }
        break;
      }
      case 'LWPOLYLINE': {
        const verts = entity.vertexes || entity.vertices || [];
        if (verts.length < 2) break;
        closed = entity.shape === true || entity.closed === true;
        for (let i = 0; i < verts.length - 1; i++) {
          const v0: Point = { x: verts[i].x, y: verts[i].y };
          const v1: Point = { x: verts[i + 1].x, y: verts[i + 1].y };
          const bulgeVal = verts[i].bulge;
          if (bulgeVal !== undefined && Math.abs(bulgeVal) > 1e-6) {
            const arc = bulgeToArc(v0, v1, bulgeVal);
            if (arc.radius > 0) {
              const arcSegs = arcToSegments(arc.center.x, arc.center.y, arc.radius, arc.startAngle, arc.endAngle);
              if (bulgeVal < 0) arcSegs.reverse().forEach((s) => {
                const tmp = s.start; s.start = s.end; s.end = tmp;
              });
              segments.push(...arcSegs);
            } else {
              segments.push({ type: 'line', start: v0, end: v1 });
            }
          } else {
            segments.push({ type: 'line', start: v0, end: v1 });
          }
        }
        if (closed && verts.length > 2) {
          const v0: Point = { x: verts[verts.length - 1].x, y: verts[verts.length - 1].y };
          const v1: Point = { x: verts[0].x, y: verts[0].y };
          const lastBulge = verts[verts.length - 1].bulge ?? 0;
          if (lastBulge && Math.abs(lastBulge) > 1e-6) {
            const arc = bulgeToArc(v0, v1, lastBulge);
            if (arc.radius > 0) {
              segments.push(...arcToSegments(arc.center.x, arc.center.y, arc.radius, arc.startAngle, arc.endAngle));
            } else {
              segments.push({ type: 'line', start: v0, end: v1 });
            }
          } else {
            segments.push({ type: 'line', start: v0, end: v1 });
          }
        }
        break;
      }
      case 'POLYLINE': {
        const verts = entity.vertexes || entity.vertices || [];
        if (verts.length < 2) break;
        closed = entity.shape === true || entity.closed === true;
        for (let i = 0; i < verts.length - 1; i++) {
          segments.push({
            type: 'line',
            start: { x: verts[i].x, y: verts[i].y },
            end: { x: verts[i + 1].x, y: verts[i + 1].y },
          });
        }
        if (closed && verts.length > 2) {
          segments.push({
            type: 'line',
            start: { x: verts[verts.length - 1].x, y: verts[verts.length - 1].y },
            end: { x: verts[0].x, y: verts[0].y },
          });
        }
        break;
      }
      case 'CIRCLE': {
        if (entity.center && entity.radius && entity.radius > 0) {
          const steps = 64;
          const pts: Point[] = [];
          for (let i = 0; i <= steps; i++) {
            const a = (i / steps) * Math.PI * 2;
            pts.push({ x: entity.center.x + entity.radius * Math.cos(a), y: entity.center.y + entity.radius * Math.sin(a) });
          }
          for (let i = 0; i < pts.length - 1; i++) {
            segments.push({ type: 'line', start: pts[i], end: pts[i + 1] });
          }
          closed = true;
        }
        break;
      }
      case 'ARC': {
        if (entity.center && entity.radius && entity.radius > 0) {
          segments = arcToSegments(
            entity.center.x, entity.center.y, entity.radius,
            entity.startAngle || 0, entity.endAngle || Math.PI * 2
          );
        }
        break;
      }
      case 'ELLIPSE': {
        break;
      }
      case 'SPLINE': {
        if (entity.controlPoints && entity.controlPoints.length >= 2) {
          const cps = entity.controlPoints;
          for (let i = 0; i < cps.length - 1; i++) {
            segments.push({ type: 'line', start: { x: cps[i].x, y: cps[i].y }, end: { x: cps[i + 1].x, y: cps[i + 1].y } });
          }
        }
        break;
      }
      case 'INSERT': {
        break;
      }
      default:
        break;
    }

    if (segments.length === 0) continue;

    const bbox = computeBBox(segments);
    const path: VectorPath = {
      id: nextPathId(),
      segments,
      closed,
      layerId: layerName,
      color,
      fill: null,
      strokeWidth: 1,
      nodeCount: countNodes(segments),
      bbox,
    };
    model.paths.push(path);

    if (bbox.minX < minX) minX = bbox.minX;
    if (bbox.minY < minY) minY = bbox.minY;
    if (bbox.maxX > maxX) maxX = bbox.maxX;
    if (bbox.maxY > maxY) maxY = bbox.maxY;

    if (!model.layers.find((l) => l.id === layerName)) {
      model.layers.push({ id: layerName, name: layerName, color, visible: true });
    }
  }

  if (minX === Infinity) {
    model.width = 100;
    model.height = 100;
  } else {
    model.width = Math.max(maxX - minX, 1);
    model.height = Math.max(maxY - minY, 1);
  }

  return model;
}
