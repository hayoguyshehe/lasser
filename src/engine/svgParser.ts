import DOMPurify from 'dompurify';
import type { InternalPathModel, VectorPath, PathSegment, Point, BBox, Layer } from '@/types';

let pathIdCounter = 0;
const nextPathId = () => `path-${(++pathIdCounter).toString(36)}`;

type Matrix = { a: number; b: number; c: number; d: number; e: number; f: number };

const IDENTITY: Matrix = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };

function multiplyMatrix(m1: Matrix, m2: Matrix): Matrix {
  return {
    a: m1.a * m2.a + m1.c * m2.b,
    b: m1.b * m2.a + m1.d * m2.b,
    c: m1.a * m2.c + m1.c * m2.d,
    d: m1.b * m2.c + m1.d * m2.d,
    e: m1.a * m2.e + m1.c * m2.f + m1.e,
    f: m1.b * m2.e + m1.d * m2.f + m1.f,
  };
}

function parseTransform(transform: string, warnings: string[]): Matrix {
  let result: Matrix = { ...IDENTITY };
  const re = /(\w+)\s*\(([^)]*?)\)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(transform)) !== null) {
    const fn = match[1];
    const args = match[2].split(/[\s,]+/).filter(Boolean).map(parseFloat);
    let m: Matrix;
    switch (fn) {
      case 'matrix': {
        if (args.length < 6) { warnings.push(`Invalid matrix() transform: ${match[0]}`); continue; }
        m = { a: args[0], b: args[1], c: args[2], d: args[3], e: args[4], f: args[5] };
        break;
      }
      case 'translate': {
        const tx = args[0] || 0;
        const ty = args[1] || 0;
        m = { a: 1, b: 0, c: 0, d: 1, e: tx, f: ty };
        break;
      }
      case 'scale': {
        const sx = args[0] ?? 1;
        const sy = args.length > 1 ? args[1] : sx;
        m = { a: sx, b: 0, c: 0, d: sy, e: 0, f: 0 };
        break;
      }
      case 'rotate': {
        const angle = ((args[0] || 0) * Math.PI) / 180;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const cx = args[1] || 0;
        const cy = args[2] || 0;
        if (cx !== 0 || cy !== 0) {
          const t1: Matrix = { a: 1, b: 0, c: 0, d: 1, e: cx, f: cy };
          const r: Matrix = { a: cos, b: sin, c: -sin, d: cos, e: 0, f: 0 };
          const t2: Matrix = { a: 1, b: 0, c: 0, d: 1, e: -cx, f: -cy };
          m = multiplyMatrix(t1, multiplyMatrix(r, t2));
        } else {
          m = { a: cos, b: sin, c: -sin, d: cos, e: 0, f: 0 };
        }
        break;
      }
      case 'skewX': {
        warnings.push(`skewX transform not supported, geometry may be incorrect`);
        continue;
      }
      case 'skewY': {
        warnings.push(`skewY transform not supported, geometry may be incorrect`);
        continue;
      }
      default:
        warnings.push(`Unknown transform function: ${fn}`);
        continue;
    }
    result = multiplyMatrix(result, m);
  }
  return result;
}

function transformPoint(p: Point, m: Matrix): Point {
  return {
    x: m.a * p.x + m.c * p.y + m.e,
    y: m.b * p.x + m.d * p.y + m.f,
  };
}

function transformSegments(segments: PathSegment[], m: Matrix): PathSegment[] {
  if (m === IDENTITY) return segments;
  return segments.map((seg) => {
    if (seg.type === 'line') {
      return { type: 'line' as const, start: transformPoint(seg.start, m), end: transformPoint(seg.end, m) };
    }
    if (seg.type === 'bezier') {
      return {
        type: 'bezier' as const,
        start: transformPoint(seg.start, m),
        cp1: transformPoint(seg.cp1, m),
        cp2: transformPoint(seg.cp2, m),
        end: transformPoint(seg.end, m),
      };
    }
    return seg;
  }) as PathSegment[];
}

function parsePointsString(str: string): Point[] {
  return str
    .trim()
    .split(/[\s,]+/)
    .filter(Boolean)
    .reduce<Point[]>((acc, _val, i, arr) => {
      if (i % 2 === 0 && i + 1 < arr.length) {
        acc.push({ x: parseFloat(arr[i]), y: parseFloat(arr[i + 1]) });
      }
      return acc;
    }, []);
}

function pointsToSegments(pts: Point[], closed: boolean): PathSegment[] {
  const segs: PathSegment[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    segs.push({ type: 'line', start: pts[i], end: pts[i + 1] });
  }
  if (closed && pts.length > 1) {
    segs.push({ type: 'line', start: pts[pts.length - 1], end: pts[0] });
  }
  return segs;
}

type PathCommand = {
  cmd: string;
  args: number[];
};

function tokenizePathData(d: string): PathCommand[] {
  const commands: PathCommand[] = [];
  const re = /([a-zA-Z])|([+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)/g;
  let match: RegExpExecArray | null;
  let currentCmd = '';
  const argBuffer: number[] = [];

  while ((match = re.exec(d)) !== null) {
    if (match[1]) {
      if (currentCmd) commands.push({ cmd: currentCmd, args: argBuffer.splice(0) });
      currentCmd = match[1];
    } else if (match[2]) {
      argBuffer.push(parseFloat(match[2]));
    }
  }
  if (currentCmd) commands.push({ cmd: currentCmd, args: argBuffer });
  return commands;
}

function pathDataToSegments(d: string, closed: boolean): PathSegment[] {
  const cmds = tokenizePathData(d);
  const segments: PathSegment[] = [];
  let current: Point = { x: 0, y: 0 };
  let start: Point = { x: 0, y: 0 };

  for (const { cmd, args } of cmds) {
    const isRel = cmd === cmd.toLowerCase();
    const c = cmd.toUpperCase();
    let i = 0;

    const next = (point?: Point): Point => {
      if (point) return point;
      const x = args[i++];
      const y = args[i++];
      return isRel ? { x: current.x + x, y: current.y + y } : { x, y };
    };

    switch (c) {
      case 'M': {
        current = next();
        start = { ...current };
        while (i < args.length) {
          const p = next();
          segments.push({ type: 'line', start: current, end: p });
          current = p;
        }
        break;
      }
      case 'L': {
        while (i < args.length) {
          const p = next();
          segments.push({ type: 'line', start: current, end: p });
          current = p;
        }
        break;
      }
      case 'H': {
        while (i < args.length) {
          const x = isRel ? current.x + args[i++] : args[i++];
          const p = { x, y: current.y };
          segments.push({ type: 'line', start: current, end: p });
          current = p;
        }
        break;
      }
      case 'V': {
        while (i < args.length) {
          const y = isRel ? current.y + args[i++] : args[i++];
          const p = { x: current.x, y };
          segments.push({ type: 'line', start: current, end: p });
          current = p;
        }
        break;
      }
      case 'C': {
        while (i + 5 < args.length) {
          const cp1 = next();
          const cp2 = next();
          const end = next();
          segments.push({ type: 'bezier', start: current, cp1, cp2, end });
          current = end;
        }
        break;
      }
      case 'Q': {
        while (i + 3 < args.length) {
          const cp1 = next();
          const end = next();
          segments.push({ type: 'bezier', start: current, cp1, cp2: cp1, end });
          current = end;
        }
        break;
      }
      case 'Z': {
        if (closed) {
          segments.push({ type: 'line', start: current, end: start });
        }
        current = { ...start };
        break;
      }
    }
  }
  return segments;
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

function getLayerId(el: Element): string {
  let node: Element | null = el;
  while (node) {
    if (node.getAttribute('data-layer')) return node.getAttribute('data-layer')!;
    const parent = node.parentElement;
    if (parent && parent.tagName.toLowerCase() === 'g') {
      const id = parent.getAttribute('id');
      if (id) return id;
    }
    node = node.parentElement;
  }
  return 'default';
}

function extractColor(el: Element): string {
  const stroke = el.getAttribute('stroke');
  if (stroke && stroke !== 'none') return stroke;
  const fill = el.getAttribute('fill');
  if (fill && fill !== 'none') return fill;
  const style = el.getAttribute('style');
  if (style) {
    const m = style.match(/stroke:\s*([^;]+)/);
    if (m) return m[1].trim();
    const fm = style.match(/fill:\s*([^;]+)/);
    if (fm) return fm[1].trim();
  }
  return '#000000';
}

function extractStrokeWidth(el: Element): number {
  const sw = el.getAttribute('stroke-width');
  if (sw) return parseFloat(sw) || 1;
  return 1;
}

function extractFill(el: Element): string | null {
  const fill = el.getAttribute('fill');
  if (fill && fill !== 'none') return fill;
  return null;
}

function processElement(
  el: Element,
  model: InternalPathModel,
  warnings: string[],
  parentMatrix: Matrix = IDENTITY
): void {
  const tag = el.tagName.toLowerCase();

  if (tag === 'text') {
    warnings.push('Text element found — convert to outlines before laser cutting');
    return;
  }
  if (tag === 'image') {
    warnings.push('Embedded raster image found — not a pure vector file');
    return;
  }
  if (tag === 'script' || tag === 'foreignobject') {
    return;
  }

  let segments: PathSegment[] = [];
  let closed = false;
  let isPrimitive = false;

  switch (tag) {
    case 'path': {
      const d = el.getAttribute('d') || '';
      closed = /z/i.test(d);
      segments = pathDataToSegments(d, closed);
      break;
    }
    case 'rect': {
      const x = parseFloat(el.getAttribute('x') || '0');
      const y = parseFloat(el.getAttribute('y') || '0');
      const w = parseFloat(el.getAttribute('width') || '0');
      const h = parseFloat(el.getAttribute('height') || '0');
      const rx = parseFloat(el.getAttribute('rx') || '0');
      if (w > 0 && h > 0) {
        const corners = [
          { x, y },
          { x: x + w, y },
          { x: x + w, y: y + h },
          { x, y: y + h },
        ];
        segments = pointsToSegments(corners, true);
        closed = true;
        void rx;
      }
      break;
    }
    case 'circle': {
      const cx = parseFloat(el.getAttribute('cx') || '0');
      const cy = parseFloat(el.getAttribute('cy') || '0');
      const r = parseFloat(el.getAttribute('r') || '0');
      if (r > 0) {
        const pts: Point[] = [];
        const steps = 48;
        for (let i = 0; i <= steps; i++) {
          const a = (i / steps) * Math.PI * 2;
          pts.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
        }
        segments = pointsToSegments(pts, true);
        closed = true;
        isPrimitive = true;
      }
      break;
    }
    case 'ellipse': {
      const cx = parseFloat(el.getAttribute('cx') || '0');
      const cy = parseFloat(el.getAttribute('cy') || '0');
      const rx = parseFloat(el.getAttribute('rx') || '0');
      const ry = parseFloat(el.getAttribute('ry') || '0');
      if (rx > 0 && ry > 0) {
        const pts: Point[] = [];
        const steps = 48;
        for (let i = 0; i <= steps; i++) {
          const a = (i / steps) * Math.PI * 2;
          pts.push({ x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) });
        }
        segments = pointsToSegments(pts, true);
        closed = true;
        isPrimitive = true;
      }
      break;
    }
    case 'line': {
      const x1 = parseFloat(el.getAttribute('x1') || '0');
      const y1 = parseFloat(el.getAttribute('y1') || '0');
      const x2 = parseFloat(el.getAttribute('x2') || '0');
      const y2 = parseFloat(el.getAttribute('y2') || '0');
      segments = [{ type: 'line', start: { x: x1, y: y1 }, end: { x: x2, y: y2 } }];
      break;
    }
    case 'polyline': {
      const pts = parsePointsString(el.getAttribute('points') || '');
      segments = pointsToSegments(pts, false);
      break;
    }
    case 'polygon': {
      const pts = parsePointsString(el.getAttribute('points') || '');
      segments = pointsToSegments(pts, true);
      closed = true;
      break;
    }
    case 'g': {
      const transformAttr = el.getAttribute('transform') || '';
      const groupMatrix = transformAttr ? multiplyMatrix(parentMatrix, parseTransform(transformAttr, warnings)) : parentMatrix;
      for (const child of Array.from(el.children)) {
        processElement(child, model, warnings, groupMatrix);
      }
      return;
    }
    default:
      return;
  }

  if (segments.length === 0) return;

  const transformAttr = el.getAttribute('transform') || '';
  const elementMatrix = transformAttr ? multiplyMatrix(parentMatrix, parseTransform(transformAttr, warnings)) : parentMatrix;
  if (elementMatrix !== IDENTITY) {
    segments = transformSegments(segments, elementMatrix);
  }

  const layerId = getLayerId(el);
  const path: VectorPath = {
    id: nextPathId(),
    segments,
    closed,
    layerId,
    color: extractColor(el),
    fill: extractFill(el),
    strokeWidth: extractStrokeWidth(el),
    nodeCount: countNodes(segments),
    bbox: computeBBox(segments),
    isPrimitive,
  };
  model.paths.push(path);

  if (!model.layers.find((l) => l.id === layerId)) {
    model.layers.push({ id: layerId, name: layerId, color: path.color, visible: true });
  }
}

export function parseSVG(svgText: string): InternalPathModel {
  pathIdCounter = 0;
  const warnings: string[] = [];

  const sanitized = DOMPurify.sanitize(svgText, {
    USE_PROFILES: { svg: true, svgFilters: true },
    ADD_TAGS: ['path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'g'],
    FORBID_TAGS: ['script', 'foreignObject'],
    FORBID_ATTR: ['onload', 'onclick', 'onmouseover', 'onerror', 'onfocus'],
  });

  const parser = new DOMParser();
  let doc = parser.parseFromString(sanitized, 'image/svg+xml');
  let svgEl = doc.querySelector('svg');

  if (!svgEl) {
    const wrapped = `<svg xmlns="http://www.w3.org/2000/svg">${sanitized}</svg>`;
    doc = parser.parseFromString(wrapped, 'image/svg+xml');
    svgEl = doc.querySelector('svg');
  }

  if (!svgEl) {
    throw new Error('No <svg> element found in file');
  }

  const widthAttr = svgEl.getAttribute('width');
  const heightAttr = svgEl.getAttribute('height');
  const viewBoxAttr = svgEl.getAttribute('viewBox');

  let width = widthAttr ? parseFloat(widthAttr) : 0;
  let height = heightAttr ? parseFloat(heightAttr) : 0;

  if (viewBoxAttr) {
    const parts = viewBoxAttr.split(/[\s,]+/).map(Number);
    if (parts.length === 4) {
      if (!width) width = parts[2];
      if (!height) height = parts[3];
    }
  }
  if (!width) width = 800;
  if (!height) height = 600;

  const model: InternalPathModel = {
    paths: [],
    layers: [],
    width,
    height,
    viewBox: viewBoxAttr,
    sourceFormat: 'svg',
    warnings,
  };

  const rootTransform = svgEl.getAttribute('transform') || '';
  const rootMatrix = rootTransform ? parseTransform(rootTransform, warnings) : IDENTITY;
  for (const child of Array.from(svgEl.children)) {
    processElement(child, model, warnings, rootMatrix);
  }

  return model;
}

export { parseTransform, transformPoint, multiplyMatrix, transformSegments };
export type { Matrix };
