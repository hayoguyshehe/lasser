import { create } from 'zustand';
import type { InternalPathModel, DiagnosticResult, View, IssueCategory } from '@/types';
import { parseSVG } from '@/engine/svgParser';
import { parseDXF } from '@/engine/dxfParser';
import { runDiagnostics } from '@/engine/diagnostics';
import { autoHeal, cloneModel, type HealResult } from '@/engine/autoHeal';

type AppState = {
  view: View;
  model: InternalPathModel | null;
  diagnostics: DiagnosticResult | null;
  isLoading: boolean;
  error: string | null;
  fileName: string | null;
  selectedIssueId: string | null;
  selectedPathId: string | null;
  zoom: number;
  pan: { x: number; y: number };
  showGrid: boolean;
  layerVisibility: Record<string, boolean>;
  issueFilter: IssueCategory | null;

  undoStack: InternalPathModel[];
  healResult: HealResult | null;
  isHealing: boolean;

  setView: (view: View) => void;
  loadFile: (text: string, fileName: string) => void;
  loadSVG: (svgText: string, fileName: string) => void;
  loadDXF: (dxfText: string, fileName: string) => void;
  loadSample: (content: string, name: string, format?: 'svg' | 'dxf') => void;
  clearFile: () => void;
  selectIssue: (id: string | null) => void;
  selectPath: (id: string | null) => void;
  setZoom: (zoom: number) => void;
  setPan: (pan: { x: number; y: number }) => void;
  toggleGrid: () => void;
  toggleLayer: (layerId: string) => void;
  setIssueFilter: (cat: IssueCategory | null) => void;
  runAutoHeal: () => void;
  undoHeal: () => void;
  dismissHealResult: () => void;
};

function computeDiagnosticsAndLayers(model: InternalPathModel) {
  const diagnostics = runDiagnostics(model);
  const layerVis: Record<string, boolean> = {};
  for (const layer of model.layers) {
    layerVis[layer.id] = true;
  }
  return { diagnostics, layerVis };
}

export const useAppStore = create<AppState>((set, get) => ({
  view: 'landing',
  model: null,
  diagnostics: null,
  isLoading: false,
  error: null,
  fileName: null,
  selectedIssueId: null,
  selectedPathId: null,
  zoom: 1,
  pan: { x: 0, y: 0 },
  showGrid: true,
  layerVisibility: {},
  issueFilter: null,
  undoStack: [],
  healResult: null,
  isHealing: false,

  setView: (view) => set({ view }),

  loadFile: (text, fileName) => {
    const isDxf = fileName.toLowerCase().endsWith('.dxf');
    if (isDxf) {
      get().loadDXF(text, fileName);
    } else {
      get().loadSVG(text, fileName);
    }
  },

  loadSVG: (svgText, fileName) => {
    set({ isLoading: true, error: null });
    try {
      const model = parseSVG(svgText);
      const { diagnostics, layerVis } = computeDiagnosticsAndLayers(model);
      set({
        model,
        diagnostics,
        isLoading: false,
        fileName,
        selectedIssueId: null,
        selectedPathId: null,
        layerVisibility: layerVis,
        zoom: 1,
        pan: { x: 0, y: 0 },
        undoStack: [],
        healResult: null,
      });
    } catch (e) {
      set({ isLoading: false, error: (e as Error).message });
    }
  },

  loadDXF: (dxfText, fileName) => {
    set({ isLoading: true, error: null });
    try {
      const model = parseDXF(dxfText);
      const { diagnostics, layerVis } = computeDiagnosticsAndLayers(model);
      set({
        model,
        diagnostics,
        isLoading: false,
        fileName,
        selectedIssueId: null,
        selectedPathId: null,
        layerVisibility: layerVis,
        zoom: 1,
        pan: { x: 0, y: 0 },
        undoStack: [],
        healResult: null,
      });
    } catch (e) {
      set({ isLoading: false, error: (e as Error).message });
    }
  },

  loadSample: (content, name, format = 'svg') => {
    if (format === 'dxf') {
      get().loadDXF(content, name);
    } else {
      get().loadSVG(content, name);
    }
  },

  clearFile: () =>
    set({
      model: null,
      diagnostics: null,
      fileName: null,
      selectedIssueId: null,
      selectedPathId: null,
      error: null,
      undoStack: [],
      healResult: null,
    }),

  selectIssue: (id) => set({ selectedIssueId: id }),
  selectPath: (id) => set({ selectedPathId: id }),
  setZoom: (zoom) => set({ zoom }),
  setPan: (pan) => set({ pan }),
  toggleGrid: () => set((s) => ({ showGrid: !s.showGrid })),
  toggleLayer: (layerId) =>
    set((s) => ({
      layerVisibility: { ...s.layerVisibility, [layerId]: !s.layerVisibility[layerId] },
    })),
  setIssueFilter: (cat) => set({ issueFilter: cat }),

  runAutoHeal: () => {
    const current = get().model;
    if (!current) return;

    set({ isHealing: true });
    try {
      const snapshot = cloneModel(current);
      const result = autoHeal(current);
      const { diagnostics, layerVis } = computeDiagnosticsAndLayers(result.model);
      set({
        model: result.model,
        diagnostics,
        layerVisibility: layerVis,
        undoStack: [...get().undoStack, snapshot],
        healResult: result,
        isHealing: false,
        selectedIssueId: null,
        selectedPathId: null,
      });
    } catch {
      set({ isHealing: false, error: 'Auto-Heal failed unexpectedly' });
    }
  },

  undoHeal: () => {
    const stack = get().undoStack;
    if (stack.length === 0) return;
    const previous = stack[stack.length - 1];
    const { diagnostics, layerVis } = computeDiagnosticsAndLayers(previous);
    set({
      model: previous,
      diagnostics,
      layerVisibility: layerVis,
      undoStack: stack.slice(0, -1),
      healResult: null,
      selectedIssueId: null,
      selectedPathId: null,
    });
  },

  dismissHealResult: () => set({ healResult: null }),
}));
