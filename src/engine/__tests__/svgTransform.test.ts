// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { parseSVG, parseTransform, transformPoint, multiplyMatrix } from '@/engine/svgParser';
import type { Matrix } from '@/engine/svgParser';

const APPROX = 1e-4;

describe('F: SVG transform matrix support', () => {
  describe('parseTransform', () => {
    it('parses translate(tx,ty) correctly', () => {
      const warnings: string[] = [];
      const m = parseTransform('translate(50,30)', warnings);
      expect(m.e).toBeCloseTo(50, 5);
      expect(m.f).toBeCloseTo(30, 5);
      expect(m.a).toBe(1);
      expect(m.d).toBe(1);
      expect(warnings.length).toBe(0);
    });

    it('parses translate with single argument (ty defaults to 0)', () => {
      const m = parseTransform('translate(50)', []);
      expect(m.e).toBe(50);
      expect(m.f).toBe(0);
    });

    it('parses rotate(angle) correctly', () => {
      const m = parseTransform('rotate(90)', []);
      expect(m.a).toBeCloseTo(0, APPROX);
      expect(m.b).toBeCloseTo(1, APPROX);
      expect(m.c).toBeCloseTo(-1, APPROX);
      expect(m.d).toBeCloseTo(0, APPROX);
    });

    it('parses rotate(angle,cx,cy) with center point', () => {
      const m = parseTransform('rotate(90,10,20)', []);
      // rotate(90) around (10,20) = translate(10,20) * rotate(90) * translate(-10,-20)
      const p = transformPoint({ x: 10, y: 20 }, m);
      expect(p.x).toBeCloseTo(10, APPROX);
      expect(p.y).toBeCloseTo(20, APPROX);
    });

    it('parses scale(sx,sy) correctly', () => {
      const m = parseTransform('scale(2,3)', []);
      expect(m.a).toBe(2);
      expect(m.d).toBe(3);
    });

    it('parses scale with single argument (uniform)', () => {
      const m = parseTransform('scale(2)', []);
      expect(m.a).toBe(2);
      expect(m.d).toBe(2);
    });

    it('parses matrix(a,b,c,d,e,f) correctly', () => {
      const m = parseTransform('matrix(1,2,3,4,5,6)', []);
      expect(m).toEqual({ a: 1, b: 2, c: 3, d: 4, e: 5, f: 6 });
    });

    it('combines multiple transforms left-to-right', () => {
      const m = parseTransform('translate(50,50) rotate(45)', []);
      // A point at origin should end up at (50,50)
      const p = transformPoint({ x: 0, y: 0 }, m);
      expect(p.x).toBeCloseTo(50, APPROX);
      expect(p.y).toBeCloseTo(50, APPROX);
    });

    it('emits warning for skewX and skips it', () => {
      const warnings: string[] = [];
      const m = parseTransform('skewX(30)', warnings);
      expect(warnings.length).toBe(1);
      expect(warnings[0]).toContain('skewX');
      // Result should be identity since skewX was skipped
      expect(m).toEqual({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 });
    });

    it('emits warning for unknown transform function', () => {
      const warnings: string[] = [];
      parseTransform('perspective(100)', warnings);
      expect(warnings.length).toBe(1);
      expect(warnings[0]).toContain('Unknown transform');
    });
  });

  describe('multiplyMatrix', () => {
    it('identity matrix is a no-op', () => {
      const id: Matrix = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
      const m: Matrix = { a: 2, b: 0, c: 0, d: 3, e: 10, f: 20 };
      const result = multiplyMatrix(id, m);
      expect(result).toEqual(m);
    });

    it('translate then rotate equals combined matrix', () => {
      const t = parseTransform('translate(10,20)', []);
      const r = parseTransform('rotate(90)', []);
      const combined = multiplyMatrix(t, r);
      // Point (0,0) rotated 90 = (0,0), then translated = (10,20)
      const p = transformPoint({ x: 0, y: 0 }, combined);
      expect(p.x).toBeCloseTo(10, APPROX);
      expect(p.y).toBeCloseTo(20, APPROX);
      // Point (1,0) rotated 90 = (0,1), then translated = (10,21)
      const p2 = transformPoint({ x: 1, y: 0 }, combined);
      expect(p2.x).toBeCloseTo(10, APPROX);
      expect(p2.y).toBeCloseTo(21, APPROX);
    });
  });

  describe('Integration: parseSVG with transforms', () => {
    it('test 1 — translate only: path inside <g transform="translate(50,50)"> has shifted coordinates', () => {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
        <g transform="translate(50,50)">
          <path d="M0 0 L10 0 L10 10 L0 10 Z" stroke="#000" fill="none"/>
        </g>
      </svg>`;

      const model = parseSVG(svg);
      expect(model.paths.length).toBe(1);

      const path = model.paths[0];
      // First segment start should be (50,50) not (0,0)
      const firstStart = path.segments[0].start;
      expect(firstStart.x).toBeCloseTo(50, APPROX);
      expect(firstStart.y).toBeCloseTo(50, APPROX);

      // Second point (10,0) should become (60,50)
      const firstEnd = path.segments[0].end;
      expect(firstEnd.x).toBeCloseTo(60, APPROX);
      expect(firstEnd.y).toBeCloseTo(50, APPROX);

      // BBox should be 50,50 to 60,60
      expect(path.bbox.minX).toBeCloseTo(50, APPROX);
      expect(path.bbox.minY).toBeCloseTo(50, APPROX);
      expect(path.bbox.maxX).toBeCloseTo(60, APPROX);
      expect(path.bbox.maxY).toBeCloseTo(60, APPROX);
    });

    it('test 2 — rotate+translate: <g transform="translate(50,50) rotate(45)"> transforms path correctly', () => {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
        <g transform="translate(50,50) rotate(45)">
          <path d="M0 0 L10 0" stroke="#000" fill="none"/>
        </g>
      </svg>`;

      const model = parseSVG(svg);
      expect(model.paths.length).toBe(1);

      const path = model.paths[0];
      const seg = path.segments[0];

      // Point (0,0) after rotate(45) then translate(50,50) = (50,50)
      expect(seg.start.x).toBeCloseTo(50, APPROX);
      expect(seg.start.y).toBeCloseTo(50, APPROX);

      // Point (10,0) after rotate(45) = (10*cos45, 10*sin45) ≈ (7.071, 7.071)
      // then translate(50,50) = (57.071, 57.071)
      expect(seg.end.x).toBeCloseTo(50 + 10 * Math.cos(Math.PI / 4), APPROX);
      expect(seg.end.y).toBeCloseTo(50 + 10 * Math.sin(Math.PI / 4), APPROX);
    });

    it('test 3 — nested <g> inside <g>: two levels of transforms accumulate correctly', () => {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
        <g transform="translate(30,30)">
          <g transform="translate(20,20)">
            <path d="M0 0 L10 0 L10 10 L0 10 Z" stroke="#000" fill="none"/>
          </g>
        </g>
      </svg>`;

      const model = parseSVG(svg);
      expect(model.paths.length).toBe(1);

      const path = model.paths[0];
      const seg = path.segments[0];

      // (0,0) translated by (20,20) then (30,30) = (50,50)
      expect(seg.start.x).toBeCloseTo(50, APPROX);
      expect(seg.start.y).toBeCloseTo(50, APPROX);

      // (10,0) translated by (20,20) then (30,30) = (60,50)
      expect(seg.end.x).toBeCloseTo(60, APPROX);
      expect(seg.end.y).toBeCloseTo(50, APPROX);

      // BBox should be 50,50 to 60,60
      expect(path.bbox.minX).toBeCloseTo(50, APPROX);
      expect(path.bbox.minY).toBeCloseTo(50, APPROX);
      expect(path.bbox.maxX).toBeCloseTo(60, APPROX);
      expect(path.bbox.maxY).toBeCloseTo(60, APPROX);
    });

    it('test 4 — element-level transform (not on <g>) is also applied', () => {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
        <rect x="0" y="0" width="10" height="10" transform="translate(100,100)" stroke="#000" fill="none"/>
      </svg>`;

      const model = parseSVG(svg);
      expect(model.paths.length).toBe(1);

      const path = model.paths[0];
      expect(path.bbox.minX).toBeCloseTo(100, APPROX);
      expect(path.bbox.minY).toBeCloseTo(100, APPROX);
      expect(path.bbox.maxX).toBeCloseTo(110, APPROX);
      expect(path.bbox.maxY).toBeCloseTo(110, APPROX);
    });

    it('test 5 — nested group with rotate at both levels', () => {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
        <g transform="translate(50,50)">
          <g transform="rotate(90)">
            <path d="M0 0 L10 0" stroke="#000" fill="none"/>
          </g>
        </g>
      </svg>`;

      const model = parseSVG(svg);
      const path = model.paths[0];
      const seg = path.segments[0];

      // (0,0) -> rotate(90) = (0,0) -> translate(50,50) = (50,50)
      expect(seg.start.x).toBeCloseTo(50, APPROX);
      expect(seg.start.y).toBeCloseTo(50, APPROX);

      // (10,0) -> rotate(90) = (0,10) -> translate(50,50) = (50,60)
      expect(seg.end.x).toBeCloseTo(50, APPROX);
      expect(seg.end.y).toBeCloseTo(60, APPROX);
    });

    it('test 6 — no transform: coordinates remain local', () => {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
        <g>
          <path d="M0 0 L10 0 L10 10 L0 10 Z" stroke="#000" fill="none"/>
        </g>
      </svg>`;

      const model = parseSVG(svg);
      const path = model.paths[0];
      expect(path.segments[0].start.x).toBeCloseTo(0, APPROX);
      expect(path.segments[0].start.y).toBeCloseTo(0, APPROX);
      expect(path.bbox.minX).toBeCloseTo(0, APPROX);
      expect(path.bbox.maxX).toBeCloseTo(10, APPROX);
    });
  });
});
