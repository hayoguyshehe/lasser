export type Point = {
  x: number;
  y: number;
};

export type PathSegment =
  | { type: 'line'; start: Point; end: Point }
  | { type: 'bezier'; start: Point; cp1: Point; cp2: Point; end: Point }
  | { type: 'arc'; start: Point; end: Point; rx: number; ry: number; rotation: number; largeArc: boolean; sweep: boolean };

export type VectorPath = {
  id: string;
  segments: PathSegment[];
  closed: boolean;
  layerId: string;
  color: string;
  fill: string | null;
  strokeWidth: number;
  nodeCount: number;
  bbox: BBox;
  isPrimitive?: boolean;
};

export type BBox = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
};

export type Layer = {
  id: string;
  name: string;
  color: string;
  visible: boolean;
};

export type InternalPathModel = {
  paths: VectorPath[];
  layers: Layer[];
  width: number;
  height: number;
  viewBox: string | null;
  sourceFormat: 'svg' | 'dxf';
  warnings: string[];
};

export type IssueCategory =
  | 'open-vector'
  | 'duplicate-path'
  | 'self-intersection'
  | 'node-density'
  | 'tiny-geometry'
  | 'text-not-outlined'
  | 'embedded-raster';

export type IssueSeverity = 'high' | 'medium' | 'low';

export type DiagnosticIssue = {
  id: string;
  category: IssueCategory;
  severity: IssueSeverity;
  message: string;
  pathId?: string;
  layerId?: string;
  location?: Point;
  details?: string;
};

export type DiagnosticResult = {
  issues: DiagnosticIssue[];
  healthScore: number;
  totalPaths: number;
  totalNodes: number;
  categoryCounts: Record<IssueCategory, number>;
};

export type View = 'landing' | 'workspace';
