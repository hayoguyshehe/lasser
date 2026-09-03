import { useAppStore } from '@/store/appStore';
import {
  Crosshair,
  Grid3x3,
  Layers,
  Download,
  Wand2,
  RotateCcw,
  Home,
  FileX,
  Eye,
  EyeOff,
  ZoomIn,
  ZoomOut,
  Undo2,
  CheckCircle2,
  X,
  GitBranch,
  Copy,
  Scissors,
} from 'lucide-react';

export function Toolbar() {
  const model = useAppStore((s) => s.model);
  const fileName = useAppStore((s) => s.fileName);
  const showGrid = useAppStore((s) => s.showGrid);
  const toggleGrid = useAppStore((s) => s.toggleGrid);
  const setView = useAppStore((s) => s.setView);
  const clearFile = useAppStore((s) => s.clearFile);
  const zoom = useAppStore((s) => s.zoom);
  const setZoom = useAppStore((s) => s.setZoom);
  const setPan = useAppStore((s) => s.setPan);
  const layerVisibility = useAppStore((s) => s.layerVisibility);
  const toggleLayer = useAppStore((s) => s.toggleLayer);
  const modelLayers = model?.layers ?? [];

  const runAutoHeal = useAppStore((s) => s.runAutoHeal);
  const undoHeal = useAppStore((s) => s.undoHeal);
  const isHealing = useAppStore((s) => s.isHealing);
  const healResult = useAppStore((s) => s.healResult);
  const dismissHealResult = useAppStore((s) => s.dismissHealResult);
  const undoStack = useAppStore((s) => s.undoStack);
  const canUndo = undoStack.length > 0;

  return (
    <div className="flex flex-col border-b border-[#1a1a1a]/10 bg-[#f5f3ee]">
      {/* Top bar */}
      <div className="h-12 flex items-center justify-between px-3">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setView('landing')}
            className="flex items-center gap-1.5 px-2 py-1.5 hover:bg-[#1a1a1a]/5 transition-colors"
            style={{ borderRadius: 4 }}
          >
            <Home className="w-4 h-4 text-[#1a1a1a]/50" />
          </button>
          <div className="w-px h-5 bg-[#1a1a1a]/10" />
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-[#1a1a1a] flex items-center justify-center" style={{ borderRadius: 3 }}>
              <Crosshair className="w-3.5 h-3.5 text-[#f5f3ee]" />
            </div>
            <span className="text-sm font-semibold text-[#1a1a1a] hidden sm:block">LaserPrep</span>
          </div>
          {fileName && (
            <>
              <div className="w-px h-5 bg-[#1a1a1a]/10 mx-0.5" />
              <div className="flex items-center gap-2 text-sm text-[#1a1a1a]/60">
                <span className="font-mono text-xs px-2 py-0.5 bg-[#1a1a1a]/5" style={{ borderRadius: 3 }}>{fileName}</span>
                {model && (
                  <span className="text-[10px] font-mono uppercase text-[#1a1a1a]/35">{model.sourceFormat}</span>
                )}
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setZoom(Math.max(0.1, zoom - 0.2))}
            className="p-1.5 hover:bg-[#1a1a1a]/5 text-[#1a1a1a]/50 hover:text-[#1a1a1a] transition-colors"
            style={{ borderRadius: 4 }}
            title="Zoom out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs text-[#1a1a1a]/40 font-mono w-10 text-center">{zoom.toFixed(2)}x</span>
          <button
            onClick={() => setZoom(Math.min(10, zoom + 0.2))}
            className="p-1.5 hover:bg-[#1a1a1a]/5 text-[#1a1a1a]/50 hover:text-[#1a1a1a] transition-colors"
            style={{ borderRadius: 4 }}
            title="Zoom in"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
            className="p-1.5 hover:bg-[#1a1a1a]/5 text-[#1a1a1a]/50 hover:text-[#1a1a1a] transition-colors"
            style={{ borderRadius: 4 }}
            title="Reset view"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <div className="w-px h-5 bg-[#1a1a1a]/10 mx-1" />
          <button
            onClick={toggleGrid}
            className={`p-1.5 transition-colors ${showGrid ? 'text-[#ff4d00] bg-[#ff4d00]/8' : 'text-[#1a1a1a]/50 hover:bg-[#1a1a1a]/5'}`}
            style={{ borderRadius: 4 }}
            title="Toggle grid"
          >
            <Grid3x3 className="w-4 h-4" />
          </button>
          <div className="w-px h-5 bg-[#1a1a1a]/10 mx-1" />
          <button
            onClick={runAutoHeal}
            disabled={!model || isHealing}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium bg-[#ff4d00] text-white hover:bg-[#e64500] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            style={{ borderRadius: 4 }}
            title="Auto-heal: close gaps, deduplicate, simplify, reorder"
          >
            <Wand2 className={`w-4 h-4 ${isHealing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{isHealing ? 'Healing...' : 'Auto-Heal'}</span>
          </button>
          {canUndo && (
            <button
              onClick={undoHeal}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium bg-[#1a1a1a]/5 text-[#1a1a1a]/60 hover:bg-[#1a1a1a]/10 transition-colors"
              style={{ borderRadius: 4 }}
              title="Undo last heal"
            >
              <Undo2 className="w-4 h-4" />
              <span className="hidden sm:inline">Undo</span>
            </button>
          )}
          <button
            disabled={!model}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium bg-[#1a1a1a]/5 text-[#1a1a1a]/60 hover:bg-[#1a1a1a]/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            style={{ borderRadius: 4 }}
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export</span>
          </button>
          {model && (
            <button
              onClick={clearFile}
              className="p-1.5 hover:bg-[#1a1a1a]/5 text-[#1a1a1a]/50 hover:text-[#1a1a1a] transition-colors"
              style={{ borderRadius: 4 }}
              title="Clear file"
            >
              <FileX className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Layer bar */}
      {model && modelLayers.length > 0 && (
        <div className="px-3 py-1.5 border-t border-[#1a1a1a]/8 flex items-center gap-1.5 overflow-x-auto bg-[#1a1a1a]/[0.02]">
          <Layers className="w-3.5 h-3.5 text-[#1a1a1a]/30 shrink-0" />
          {modelLayers.map((layer) => {
            const visible = layerVisibility[layer.id] !== false;
            return (
              <button
                key={layer.id}
                onClick={() => toggleLayer(layer.id)}
                className={`flex items-center gap-1.5 px-2 py-0.5 text-xs whitespace-nowrap transition-colors ${visible ? 'bg-[#1a1a1a]/8 text-[#1a1a1a]/70' : 'bg-[#1a1a1a]/[0.02] text-[#1a1a1a]/25'}`}
                style={{ borderRadius: 3 }}
              >
                {visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: layer.color }}
                />
                {layer.name}
              </button>
            );
          })}
        </div>
      )}

      {/* Heal result banner */}
      {healResult && (
        <div className="px-3 py-2 border-t border-[#1a1a1a]/8 bg-[#0a7c3a]/5 flex items-center gap-3">
          <CheckCircle2 className="w-4 h-4 text-[#0a7c3a] shrink-0" />
          <div className="flex-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#1a1a1a]/60">
            <span className="font-medium text-[#0a7c3a]">Auto-Heal complete</span>
            {healResult.closedGaps > 0 && (
              <span className="flex items-center gap-1">
                <GitBranch className="w-3 h-3" />
                {healResult.closedGaps} gap{healResult.closedGaps > 1 ? 's' : ''} closed
              </span>
            )}
            {healResult.removedDuplicates > 0 && (
              <span className="flex items-center gap-1">
                <Copy className="w-3 h-3" />
                {healResult.removedDuplicates} duplicate{healResult.removedDuplicates > 1 ? 's' : ''} removed
              </span>
            )}
            {healResult.simplifiedNodes > 0 && (
              <span className="flex items-center gap-1">
                <Scissors className="w-3 h-3" />
                {healResult.simplifiedNodes} nodes simplified
              </span>
            )}
            {healResult.reorderedPaths && (
              <span className="flex items-center gap-1">
                <Layers className="w-3 h-3" />
                Paths reordered (inner→outer)
              </span>
            )}
            {healResult.totalFixes === 0 && (
              <span>No issues needed fixing — file is already clean</span>
            )}
          </div>
          <button
            onClick={dismissHealResult}
            className="p-1 hover:bg-[#1a1a1a]/5 transition-colors"
            style={{ borderRadius: 3 }}
          >
            <X className="w-3.5 h-3.5 text-[#1a1a1a]/40" />
          </button>
        </div>
      )}
    </div>
  );
}
