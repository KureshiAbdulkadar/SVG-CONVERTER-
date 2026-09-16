import { create } from 'zustand';
import {
  VectorParameters,
  VectorLayer,
  ColorPaletteItem,
  VectorResult,
  VectorPreset,
  ImageType,
} from '../lib/vector-engine/types';
import {
  vectorizeImage,
  PRESET_CONFIGS,
  classifyImageHeuristic,
  composeSvg,
  minifySvgString,
} from '../lib/vector-engine';

interface HistorySnapshot {
  parameters: VectorParameters;
  layers: VectorLayer[];
  svg: string;
}

interface WorkbenchState {
  // Input file state
  fileName: string;
  imageDataUrl: string | null;
  imageWidth: number;
  imageHeight: number;
  isProcessing: boolean;
  processingProgress: number;

  // Parameters
  parameters: VectorParameters;

  // Vector Engine Results
  outputSvg: string | null;
  minifiedSvg: string | null;
  layers: VectorLayer[];
  palette: ColorPaletteItem[];
  meta: VectorResult['meta'] | null;

  // Canvas Viewport & UI State
  viewMode: 'split' | 'vector' | 'original';
  splitPosition: number; // 0 - 100
  zoom: number; // 0.2 to 5.0
  pan: { x: number; y: number };
  showNodes: boolean;
  selectedLayerId: string | null;
  selectedPathId: string | null;
  hoveredPathId: string | null;
  isFeedbackModalOpen: boolean;
  isExportModalOpen: boolean;

  // Undo / Redo History
  history: HistorySnapshot[];
  historyIndex: number;

  // Actions
  loadImage: (dataUrl: string, name: string) => Promise<void>;
  updateParam: <K extends keyof VectorParameters>(key: K, value: VectorParameters[K]) => void;
  applyPreset: (preset: VectorPreset) => void;
  setImageType: (type: ImageType) => void;
  reprocess: () => Promise<void>;
  undo: () => void;
  redo: () => void;
  toggleLayerVisibility: (layerId: string) => void;
  toggleLayerExpanded: (layerId: string) => void;
  togglePathVisibility: (layerId: string, pathId: string) => void;
  setLayerColor: (layerId: string, hex: string) => void;
  setPathColor: (layerId: string, pathId: string, hex: string) => void;
  renameLayer: (layerId: string, name: string) => void;
  renamePath: (layerId: string, pathId: string, name: string) => void;
  reorderLayers: (startIndex: number, endIndex: number) => void;
  setSelectedLayer: (id: string | null) => void;
  setSelectedPath: (id: string | null) => void;
  setHoveredPath: (id: string | null) => void;
  setViewMode: (mode: 'split' | 'vector' | 'original') => void;
  setSplitPosition: (pos: number) => void;
  setZoom: (zoom: number) => void;
  setPan: (pan: { x: number; y: number }) => void;
  resetView: () => void;
  toggleShowNodes: () => void;
  isLayersOpen: boolean;
  isParamsOpen: boolean;
  toggleLayersPanel: () => void;
  toggleParamsPanel: () => void;
  setFeedbackModalOpen: (open: boolean) => void;
  setExportModalOpen: (open: boolean) => void;
}

const DEFAULT_PARAMS: VectorParameters = {
  preset: 'balanced',
  imageType: 'logo',
  colorCount: 0, // auto
  preserveBrandColors: true,
  smoothness: 0.5,
  cornerSharpness: 0.7,
  detail: 0.65,
  noiseRemoval: 6,
  preserveSymmetry: false,
  gridSnap: false,
  gridSize: 16,
  removeBackground: false,
  mergeSimilarPaths: true,
  fillOverlap: true,
};

export const useWorkbenchStore = create<WorkbenchState>((set, get) => ({
  fileName: 'sample.png',
  imageDataUrl: null,
  imageWidth: 0,
  imageHeight: 0,
  isProcessing: false,
  processingProgress: 0,

  parameters: { ...DEFAULT_PARAMS },

  outputSvg: null,
  minifiedSvg: null,
  layers: [],
  palette: [],
  meta: null,

  viewMode: 'split',
  splitPosition: 50,
  zoom: 1,
  pan: { x: 0, y: 0 },
  showNodes: false,
  selectedLayerId: null,
  selectedPathId: null,
  hoveredPathId: null,
  isFeedbackModalOpen: false,
  isExportModalOpen: false,
  isLayersOpen: false,
  isParamsOpen: true,

  history: [],
  historyIndex: -1,

  loadImage: async (dataUrl: string, name: string) => {
    set({
      imageDataUrl: dataUrl,
      fileName: name,
      isProcessing: true,
      processingProgress: 20,
    });

    try {
      // Create image to inspect dimensions and extract pixel buffer
      const img = new Image();
      img.src = dataUrl;

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      const width = img.naturalWidth || img.width;
      const height = img.naturalHeight || img.height;

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not create canvas 2d context');

      ctx.drawImage(img, 0, 0);
      const imgData = ctx.getImageData(0, 0, width, height);

      // Auto-classify type
      const detectedType = classifyImageHeuristic(imgData.data, width, height);
      const initialPreset = detectedType === 'icon' || detectedType === 'logo' ? 'sharp' : 'balanced';
      const presetConfig = PRESET_CONFIGS[initialPreset];

      const activeParams: VectorParameters = {
        ...DEFAULT_PARAMS,
        ...presetConfig,
        imageType: detectedType,
        preset: initialPreset,
      };

      set({
        imageWidth: width,
        imageHeight: height,
        parameters: activeParams,
        processingProgress: 60,
      });

      // Run vector engine
      const result = await vectorizeImage(imgData.data, width, height, activeParams);

      const newSnapshot: HistorySnapshot = {
        parameters: { ...activeParams },
        layers: result.layers,
        svg: result.svg,
      };

      set({
        outputSvg: result.svg,
        minifiedSvg: result.minifiedSvg,
        layers: result.layers,
        palette: result.palette,
        meta: result.meta,
        isProcessing: false,
        processingProgress: 100,
        history: [newSnapshot],
        historyIndex: 0,
      });
    } catch (err) {
      console.error('Error vectorizing image:', err);
      set({ isProcessing: false });
    }
  },

  updateParam: (key, value) => {
    const { parameters } = get();
    const updated = { ...parameters, [key]: value, preset: 'custom' as VectorPreset };
    set({ parameters: updated });
    
    // Quick debounce for smooth slider scrubbing
    if ((globalThis as any).__reprocessTimer) {
      clearTimeout((globalThis as any).__reprocessTimer);
    }
    (globalThis as any).__reprocessTimer = setTimeout(() => {
      get().reprocess();
    }, 60);
  },

  applyPreset: (preset) => {
    const { parameters } = get();
    const presetConfig = PRESET_CONFIGS[preset];
    const updated: VectorParameters = {
      ...parameters,
      ...presetConfig,
      preset,
    };
    set({ parameters: updated });
    get().reprocess();
  },

  setImageType: (type) => {
    const { parameters } = get();
    const updated: VectorParameters = {
      ...parameters,
      imageType: type,
    };
    set({ parameters: updated });
    get().reprocess();
  },

  reprocess: async () => {
    const { imageDataUrl, imageWidth, imageHeight, parameters } = get();
    if (!imageDataUrl || imageWidth === 0 || imageHeight === 0) return;

    set({ isProcessing: true });

    try {
      const img = new Image();
      img.src = imageDataUrl;
      await new Promise(r => { img.onload = r; });

      const canvas = document.createElement('canvas');
      canvas.width = imageWidth;
      canvas.height = imageHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(img, 0, 0);
      const imgData = ctx.getImageData(0, 0, imageWidth, imageHeight);

      const result = await vectorizeImage(imgData.data, imageWidth, imageHeight, parameters);

      const { history, historyIndex } = get();
      const newSnapshot: HistorySnapshot = {
        parameters: { ...parameters },
        layers: result.layers,
        svg: result.svg,
      };

      const truncatedHistory = history.slice(0, historyIndex + 1);
      truncatedHistory.push(newSnapshot);

      set({
        outputSvg: result.svg,
        minifiedSvg: result.minifiedSvg,
        layers: result.layers,
        palette: result.palette,
        meta: result.meta,
        isProcessing: false,
        history: truncatedHistory,
        historyIndex: truncatedHistory.length - 1,
      });
    } catch (err) {
      console.error('Reprocess failed:', err);
      set({ isProcessing: false });
    }
  },

  undo: () => {
    const { history, historyIndex, imageWidth, imageHeight, meta } = get();
    if (historyIndex > 0) {
      const targetIndex = historyIndex - 1;
      const snap = history[targetIndex];
      const updatedSvg = composeSvg(snap.layers, { width: imageWidth, height: imageHeight });

      set({
        historyIndex: targetIndex,
        parameters: { ...snap.parameters },
        layers: snap.layers,
        outputSvg: updatedSvg,
        minifiedSvg: minifySvgString(updatedSvg),
      });
    }
  },

  redo: () => {
    const { history, historyIndex, imageWidth, imageHeight } = get();
    if (historyIndex < history.length - 1) {
      const targetIndex = historyIndex + 1;
      const snap = history[targetIndex];
      const updatedSvg = composeSvg(snap.layers, { width: imageWidth, height: imageHeight });

      set({
        historyIndex: targetIndex,
        parameters: { ...snap.parameters },
        layers: snap.layers,
        outputSvg: updatedSvg,
        minifiedSvg: minifySvgString(updatedSvg),
      });
    }
  },

  toggleLayerVisibility: (layerId) => {
    const { layers, imageWidth, imageHeight } = get();
    const updated = layers.map(l => (l.id === layerId ? { ...l, visible: !l.visible } : l));
    const newSvg = composeSvg(updated, { width: imageWidth, height: imageHeight });

    set({
      layers: updated,
      outputSvg: newSvg,
      minifiedSvg: minifySvgString(newSvg),
    });
  },

  toggleLayerExpanded: (layerId) => {
    const { layers } = get();
    const updated = layers.map(l => (l.id === layerId ? { ...l, expanded: !l.expanded } : l));
    set({ layers: updated });
  },

  togglePathVisibility: (layerId, pathId) => {
    const { layers, imageWidth, imageHeight } = get();
    const updated = layers.map(l => {
      if (l.id === layerId) {
        return {
          ...l,
          paths: l.paths.map(p => (p.id === pathId ? { ...p, visible: p.visible === false ? true : false } : p)),
        };
      }
      return l;
    });
    const newSvg = composeSvg(updated, { width: imageWidth, height: imageHeight });

    set({
      layers: updated,
      outputSvg: newSvg,
      minifiedSvg: minifySvgString(newSvg),
    });
  },

  setLayerColor: (layerId, hex) => {
    const { layers, imageWidth, imageHeight } = get();
    const updated = layers.map(l => {
      if (l.id === layerId) {
        return {
          ...l,
          color: hex,
          paths: l.paths.map(p => ({ ...p, fill: hex })),
        };
      }
      return l;
    });

    const newSvg = composeSvg(updated, { width: imageWidth, height: imageHeight });
    set({
      layers: updated,
      outputSvg: newSvg,
      minifiedSvg: minifySvgString(newSvg),
    });
  },

  setPathColor: (layerId, pathId, hex) => {
    const { layers, imageWidth, imageHeight } = get();
    const updated = layers.map(l => {
      if (l.id === layerId) {
        return {
          ...l,
          paths: l.paths.map(p => (p.id === pathId ? { ...p, fill: hex } : p)),
        };
      }
      return l;
    });

    const newSvg = composeSvg(updated, { width: imageWidth, height: imageHeight });
    set({
      layers: updated,
      outputSvg: newSvg,
      minifiedSvg: minifySvgString(newSvg),
    });
  },

  renameLayer: (layerId, name) => {
    const { layers, imageWidth, imageHeight } = get();
    const updated = layers.map(l => (l.id === layerId ? { ...l, name } : l));
    const newSvg = composeSvg(updated, { width: imageWidth, height: imageHeight });

    set({
      layers: updated,
      outputSvg: newSvg,
    });
  },

  renamePath: (layerId, pathId, name) => {
    const { layers, imageWidth, imageHeight } = get();
    const updated = layers.map(l => {
      if (l.id === layerId) {
        return {
          ...l,
          paths: l.paths.map(p => (p.id === pathId ? { ...p, name } : p)),
        };
      }
      return l;
    });

    const newSvg = composeSvg(updated, { width: imageWidth, height: imageHeight });
    set({
      layers: updated,
      outputSvg: newSvg,
    });
  },

  reorderLayers: (startIndex, endIndex) => {
    const { layers, imageWidth, imageHeight } = get();
    const result = Array.from(layers);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);

    const newSvg = composeSvg(result, { width: imageWidth, height: imageHeight });
    set({
      layers: result,
      outputSvg: newSvg,
    });
  },

  setSelectedLayer: (id) => set({ selectedLayerId: id }),
  setSelectedPath: (id) => set({ selectedPathId: id }),
  setHoveredPath: (id) => set({ hoveredPathId: id }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setSplitPosition: (pos) => set({ splitPosition: Math.max(0, Math.min(100, pos)) }),
  setZoom: (zoom) => set({ zoom: Math.max(0.1, Math.min(8, zoom)) }),
  setPan: (pan) => set({ pan }),
  resetView: () => set({ zoom: 1, pan: { x: 0, y: 0 }, splitPosition: 50 }),
  toggleShowNodes: () => set(state => ({ showNodes: !state.showNodes })),
  toggleLayersPanel: () => set(state => ({ isLayersOpen: !state.isLayersOpen })),
  toggleParamsPanel: () => set(state => ({ isParamsOpen: !state.isParamsOpen })),
  setFeedbackModalOpen: (open) => set({ isFeedbackModalOpen: open }),
  setExportModalOpen: (open) => set({ isExportModalOpen: open }),
}));
