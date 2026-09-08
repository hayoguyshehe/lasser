import { useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '@/store/appStore';
import type { InternalPathModel, VectorPath, Point } from '@/types';

const COLORS = {
  grid: 'rgba(15,23,42,0.06)',
  gridMajor: 'rgba(15,23,42,0.12)',
  background: '#f8fafc',
  pathDefault: '#172033',
  pathSelected: '#c2410c',
  issueHigh: '#dc2626',
  issueMedium: '#d97706',
  issueLow: '#2563eb',
};

function getContrastColor(color: string | null): string {
  if (!color) return COLORS.pathDefault;
  const hex = color.trim().replace('#', '');
  if (!/^(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex)) return color;
  const normalized = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex;
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.82 ? COLORS.pathDefault : color;
}

function worldToScreen(p: Point, canvasW: number, canvasH: number, zoom: number, pan: { x: number; y: number }, model: InternalPathModel): Point {
  const scale = Math.min(canvasW / model.width, canvasH / model.height) * 0.85 * zoom;
  const offsetX = (canvasW - model.width * scale) / 2 + pan.x;
  const offsetY = (canvasH - model.height * scale) / 2 + pan.y;
  return {
    x: p.x * scale + offsetX,
    y: p.y * scale + offsetY,
  };
}

function drawPath(ctx: CanvasRenderingContext2D, path: VectorPath, canvasW: number, canvasH: number, zoom: number, pan: { x: number; y: number }, model: InternalPathModel, isSelected: boolean) {
  if (path.segments.length === 0) return;
  ctx.beginPath();
  const first = path.segments[0];
  const start = worldToScreen(first.start, canvasW, canvasH, zoom, pan, model);
  ctx.moveTo(start.x, start.y);

  for (const seg of path.segments) {
    const end = worldToScreen(seg.end, canvasW, canvasH, zoom, pan, model);
    if (seg.type === 'bezier') {
      const cp1 = worldToScreen(seg.cp1, canvasW, canvasH, zoom, pan, model);
      const cp2 = worldToScreen(seg.cp2, canvasW, canvasH, zoom, pan, model);
      ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, end.x, end.y);
    } else {
      ctx.lineTo(end.x, end.y);
    }
  }

  ctx.strokeStyle = isSelected ? COLORS.pathSelected : getContrastColor(path.color);
  ctx.lineWidth = isSelected ? 2.75 : 1.8;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();

  if (isSelected) {
    ctx.strokeStyle = 'rgba(255,107,53,0.3)';
    ctx.lineWidth = 6;
    ctx.stroke();
  }
}

function drawGrid(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const step = 50;
  ctx.strokeStyle = COLORS.grid;
  ctx.lineWidth = 1;
  for (let x = 0; x < w; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y < h; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  ctx.strokeStyle = COLORS.gridMajor;
  for (let x = 0; x < w; x += step * 5) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y < h; y += step * 5) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
}

export function CanvasViewer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const model = useAppStore((s) => s.model);
  const diagnostics = useAppStore((s) => s.diagnostics);
  const zoom = useAppStore((s) => s.zoom);
  const pan = useAppStore((s) => s.pan);
  const showGrid = useAppStore((s) => s.showGrid);
  const layerVisibility = useAppStore((s) => s.layerVisibility);
  const selectedIssueId = useAppStore((s) => s.selectedIssueId);
  const selectedPathId = useAppStore((s) => s.selectedPathId);
  const setZoom = useAppStore((s) => s.setZoom);
  const setPan = useAppStore((s) => s.setPan);
  const selectPath = useAppStore((s) => s.selectPath);

  const isDraggingRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !model) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const cw = rect.width;
    const ch = rect.height;
    canvas.width = cw * dpr;
    canvas.height = ch * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, cw, ch);

    if (showGrid) drawGrid(ctx, cw, ch);

    const visiblePaths = model.paths.filter((p) => layerVisibility[p.layerId] !== false);
    for (const path of visiblePaths) {
      drawPath(ctx, path, cw, ch, zoom, pan, model, path.id === selectedPathId);
    }

    if (diagnostics) {
      for (const issue of diagnostics.issues) {
        if (selectedIssueId && issue.id !== selectedIssueId && selectedIssueId !== 'all') continue;
        if (!issue.location) continue;
        const sp = worldToScreen(issue.location, cw, ch, zoom, pan, model);
        const color =
          issue.severity === 'high' ? COLORS.issueHigh :
          issue.severity === 'medium' ? COLORS.issueMedium :
          COLORS.issueLow;

        const isHighlighted = issue.id === selectedIssueId;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, isHighlighted ? 8 : 5, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = isHighlighted ? 2 : 1;
        ctx.stroke();

        if (isHighlighted) {
          ctx.beginPath();
          ctx.arc(sp.x, sp.y, 14, 0, Math.PI * 2);
          ctx.strokeStyle = color;
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }
    }

    ctx.restore();
  }, [model, diagnostics, zoom, pan, showGrid, layerVisibility, selectedIssueId, selectedPathId]);

  useEffect(() => {
    render();
  }, [render]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = -e.deltaY * 0.001;
    setZoom(Math.max(0.1, Math.min(10, zoom + delta)));
  }, [zoom, setZoom]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDraggingRef.current = true;
    lastPosRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - lastPosRef.current.x;
    const dy = e.clientY - lastPosRef.current.y;
    lastPosRef.current = { x: e.clientX, y: e.clientY };
    setPan({ x: pan.x + dx, y: pan.y + dy });
  }, [pan, setPan]);

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (!model) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const cw = rect.width;
    const ch = rect.height;
    const scale = Math.min(cw / model.width, ch / model.height) * 0.85 * zoom;
    const offsetX = (cw - model.width * scale) / 2 + pan.x;
    const offsetY = (ch - model.height * scale) / 2 + pan.y;

    let closest: string | null = null;
    let closestDist = 15;
    for (const path of model.paths) {
      for (const seg of path.segments) {
        const pts = seg.type === 'bezier' ? [seg.start, seg.cp1, seg.cp2, seg.end] : [seg.start, seg.end];
        for (const p of pts) {
          const sx = p.x * scale + offsetX;
          const sy = p.y * scale + offsetY;
          const d = Math.hypot(sx - mx, sy - my);
          if (d < closestDist) {
            closestDist = d;
            closest = path.id;
          }
        }
      }
    }
    selectPath(closest);
  }, [model, zoom, pan, selectPath]);

  return (
    <div className="flex-1 relative overflow-hidden bg-slate-50">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleClick}
      />
      <div className="absolute bottom-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/50 backdrop-blur border border-white/10 text-xs text-white/50">
        Zoom: {zoom.toFixed(2)}x — scroll to zoom, drag to pan
      </div>
      {model && (
        <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/50 backdrop-blur border border-white/10 text-xs text-white/50">
          <span className="font-mono uppercase">{model.sourceFormat}</span>
          <span>·</span>
          <span>{model.width.toFixed(1)} × {model.height.toFixed(1)}</span>
        </div>
      )}
    </div>
  );
}
