import { describe, it, expect } from 'vitest';
import { autoHeal } from '@/engine/autoHeal';
import { pathsSameGeometry } from '@/engine/geometry';
import type { InternalPathModel, VectorPath, PathSegment, Point, BBox } from '@/types';

function makePath(id: string, segments: PathSegment[], closed = false, isPrimitive = false): VectorPath {
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
  const bbox: BBox = { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
  const nodeCount = segments.reduce((acc, s) => acc + (s.type === 'bezier' ? 4 : 2), 0);
  return { id, segments, closed, layerId: 'test', color: '#000', fill: null, strokeWidth: 1, nodeCount, bbox, isPrimitive };
}

function makeModel(paths: VectorPath[]): InternalPathModel {
  return {
    paths,
    layers: [{ id: 'test', name: 'test', color: '#000', visible: true }],
    width: 200,
    height: 200,
    viewBox: null,
    sourceFormat: 'svg',
    warnings: [],
  };
}

describe('A1: deduplicatePaths — false-positive prevention', () => {
  it('does NOT delete paths with same bbox + segment count but different geometry', () => {
    // Two paths: same bbox (0,0 to 100,100), same segment count (4 each)
    // Path A: a square (convex)
    const squareSegs: PathSegment[] = [
      { type: 'line', start: { x: 0, y: 0 }, end: { x: 100, y: 0 } },
      { type: 'line', start: { x: 100, y: 0 }, end: { x: 100, y: 100 } },
      { type: 'line', start: { x: 100, y: 100 }, end: { x: 0, y: 100 } },
      { type: 'line', start: { x: 0, y: 100 }, end: { x: 0, y: 0 } },
    ];
    // Path B: a "bowtie" / hourglass shape — same bbox, same segment count, totally different geometry
    const bowtieSegs: PathSegment[] = [
      { type: 'line', start: { x: 0, y: 0 }, end: { x: 100, y: 100 } },
      { type: 'line', start: { x: 100, y: 100 }, end: { x: 100, y: 0 } },
      { type: 'line', start: { x: 100, y: 0 }, end: { x: 0, y: 100 } },
      { type: 'line', start: { x: 0, y: 100 }, end: { x: 0, y: 0 } },
    ];

    const model = makeModel([
      makePath('square', squareSegs, true),
      makePath('bowtie', bowtieSegs, true),
    ]);

    const result = autoHeal(model);

    // Both paths must survive — they are NOT duplicates
    expect(result.model.paths.length).toBe(2);
    expect(result.model.paths.find((p) => p.id === 'square')).toBeDefined();
    expect(result.model.paths.find((p) => p.id === 'bowtie')).toBeDefined();
    expect(result.removedDuplicates).toBe(0);
  });

  it('DOES delete actual duplicate paths (true positive)', () => {
    const segs: PathSegment[] = [
      { type: 'line', start: { x: 0, y: 0 }, end: { x: 50, y: 0 } },
      { type: 'line', start: { x: 50, y: 0 }, end: { x: 50, y: 50 } },
      { type: 'line', start: { x: 50, y: 50 }, end: { x: 0, y: 50 } },
      { type: 'line', start: { x: 0, y: 50 }, end: { x: 0, y: 0 } },
    ];

    const model = makeModel([
      makePath('original', segs, true),
      makePath('copy', segs.map((s) => ({ ...s, start: { ...s.start }, end: { ...s.end } })), true),
    ]);

    const result = autoHeal(model);

    expect(result.model.paths.length).toBe(1);
    expect(result.removedDuplicates).toBe(1);
  });

  it('pathsSameGeometry returns false for different shapes with same bbox', () => {
    const squareSegs: PathSegment[] = [
      { type: 'line', start: { x: 0, y: 0 }, end: { x: 100, y: 0 } },
      { type: 'line', start: { x: 100, y: 0 }, end: { x: 100, y: 100 } },
      { type: 'line', start: { x: 100, y: 100 }, end: { x: 0, y: 100 } },
      { type: 'line', start: { x: 0, y: 100 }, end: { x: 0, y: 0 } },
    ];
    const diamondSegs: PathSegment[] = [
      { type: 'line', start: { x: 50, y: 0 }, end: { x: 100, y: 50 } },
      { type: 'line', start: { x: 100, y: 50 }, end: { x: 50, y: 100 } },
      { type: 'line', start: { x: 50, y: 100 }, end: { x: 0, y: 50 } },
      { type: 'line', start: { x: 0, y: 50 }, end: { x: 50, y: 0 } },
    ];

    const a = makePath('a', squareSegs, true);
    const b = makePath('b', diamondSegs, true);

    expect(pathsSameGeometry(a, b)).toBe(false);
  });
});

describe('A2: simplifyPath — bezier preservation', () => {
  it('preserves a single bezier segment unchanged after auto-heal', () => {
    const bezierSeg: PathSegment = {
      type: 'bezier',
      start: { x: 10, y: 10 },
      cp1: { x: 30, y: 80 },
      cp2: { x: 70, y: 80 },
      end: { x: 90, y: 10 },
    };

    const model = makeModel([makePath('curve', [bezierSeg], false)]);
    const result = autoHeal(model);

    const healedPath = result.model.paths.find((p) => p.id === 'curve');
    expect(healedPath).toBeDefined();
    expect(healedPath!.segments.length).toBe(1);
    expect(healedPath!.segments[0].type).toBe('bezier');
  });

  it('preserves bezier segments mixed with line segments', () => {
    const segs: PathSegment[] = [
      { type: 'line', start: { x: 0, y: 0 }, end: { x: 10, y: 0 } },
      { type: 'line', start: { x: 10, y: 0 }, end: { x: 10, y: 10 } },
      { type: 'bezier', start: { x: 10, y: 10 }, cp1: { x: 30, y: 50 }, cp2: { x: 70, y: 50 }, end: { x: 90, y: 10 } },
      { type: 'line', start: { x: 90, y: 10 }, end: { x: 100, y: 10 } },
      { type: 'line', start: { x: 100, y: 10 }, end: { x: 100, y: 0 } },
    ];

    const model = makeModel([makePath('mixed', segs, false)]);
    const result = autoHeal(model);

    const healedPath = result.model.paths.find((p) => p.id === 'mixed');
    expect(healedPath).toBeDefined();

    // The bezier segment must still be a bezier
    const bezierSeg = healedPath!.segments.find((s) => s.type === 'bezier');
    expect(bezierSeg).toBeDefined();
    expect(bezierSeg!.type).toBe('bezier');
  });

  it('does NOT flatten a path that is purely bezier into line segments', () => {
    const segs: PathSegment[] = [
      { type: 'bezier', start: { x: 0, y: 0 }, cp1: { x: 20, y: 40 }, cp2: { x: 40, y: 40 }, end: { x: 60, y: 0 } },
      { type: 'bezier', start: { x: 60, y: 0 }, cp1: { x: 80, y: 40 }, cp2: { x: 100, y: 40 }, end: { x: 120, y: 0 } },
    ];

    const model = makeModel([makePath('curves', segs, false)]);
    const result = autoHeal(model);

    const healedPath = result.model.paths.find((p) => p.id === 'curves');
    expect(healedPath).toBeDefined();
    // Both segments should still be bezier
    expect(healedPath!.segments.every((s) => s.type === 'bezier')).toBe(true);
    expect(healedPath!.segments.length).toBe(2);
  });
});
