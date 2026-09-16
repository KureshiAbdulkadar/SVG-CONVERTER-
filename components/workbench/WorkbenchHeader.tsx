'use client';

import React from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Undo2,
  Redo2,
  Columns2,
  Eye,
  Sparkles,
  Download,
  Share2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Layers,
  SlidersHorizontal,
  CheckCircle2,
  Clock,
  Dot,
  FileCode,
} from 'lucide-react';
import { useWorkbenchStore } from '../../stores/workbench-store';
import { downloadBlob, exportVectorFile } from '../../lib/exporters';

export function WorkbenchHeader() {
  const {
    fileName,
    outputSvg,
    isProcessing,
    meta,
    historyIndex,
    history,
    viewMode,
    showNodes,
    zoom,
    layers,
    isLayersOpen,
    isParamsOpen,
    undo,
    redo,
    setViewMode,
    toggleShowNodes,
    toggleLayersPanel,
    toggleParamsPanel,
    setZoom,
    resetView,
    setExportModalOpen,
    setFeedbackModalOpen,
  } = useWorkbenchStore();

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const handleQuickDownload = async () => {
    if (!outputSvg) return;
    try {
      const { blob, filename } = await exportVectorFile({
        format: 'svg',
        filename: fileName || 'vectorforge-export',
        width: meta?.width || 500,
        height: meta?.height || 500,
        layers,
      });
      downloadBlob(blob, filename);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <header className="h-14 bg-surface-200/90 backdrop-blur-md border-b border-surface-border px-4 flex items-center justify-between select-none z-30">
      {/* Left: Back, Filename & Simple Status */}
      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="px-2.5 py-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-surface-100 transition-colors flex items-center gap-1.5 text-xs font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Home</span>
        </Link>

        <div className="h-4 w-px bg-surface-border" />

        <div className="flex items-center gap-2">
          <span className="font-semibold text-xs sm:text-sm text-white tracking-tight flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-brand-500 shadow-[0_0_8px_#22c55e]" />
            <span className="max-w-[140px] sm:max-w-[200px] truncate">{fileName}</span>
          </span>

          {meta && (
            <span className="hidden md:inline-flex text-[11px] px-2 py-0.5 rounded-full bg-surface-50 text-neutral-400 font-mono border border-surface-border">
              {meta.width}×{meta.height}
            </span>
          )}
        </div>
      </div>

      {/* Center: View Switcher (Compare / Vector / Original) */}
      <div className="flex items-center gap-1 bg-surface-100 p-1 rounded-xl border border-surface-border">
        {/* Undo/Redo */}
        <button
          onClick={undo}
          disabled={!canUndo}
          title="Undo (Cmd+Z)"
          className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-surface-50 disabled:opacity-25 transition-colors"
        >
          <Undo2 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={redo}
          disabled={!canRedo}
          title="Redo (Cmd+Shift+Z)"
          className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-surface-50 disabled:opacity-25 transition-colors"
        >
          <Redo2 className="w-3.5 h-3.5" />
        </button>

        <div className="h-4 w-px bg-surface-border mx-1" />

        {/* View Mode Pills */}
        <button
          onClick={() => setViewMode('split')}
          className={`px-3 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
            viewMode === 'split'
              ? 'bg-brand-accent text-white shadow-sm shadow-indigo-950/40'
              : 'text-neutral-400 hover:text-white hover:bg-surface-50'
          }`}
        >
          <Columns2 className="w-3.5 h-3.5" />
          <span>Compare</span>
        </button>

        <button
          onClick={() => setViewMode('vector')}
          className={`px-3 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
            viewMode === 'vector'
              ? 'bg-brand-accent text-white shadow-sm shadow-indigo-950/40'
              : 'text-neutral-400 hover:text-white hover:bg-surface-50'
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Vector</span>
        </button>

        <button
          onClick={() => setViewMode('original')}
          className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
            viewMode === 'original'
              ? 'bg-brand-accent text-white shadow-sm'
              : 'text-neutral-400 hover:text-white hover:bg-surface-50'
          }`}
        >
          <span>Original</span>
        </button>

        <div className="hidden sm:block h-4 w-px bg-surface-border mx-1" />

        {/* Zoom */}
        <div className="hidden sm:flex items-center gap-0.5 text-xs text-neutral-400 font-mono">
          <button
            onClick={() => setZoom(zoom - 0.2)}
            className="p-1 hover:text-white hover:bg-surface-50 rounded"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="w-10 text-center text-[11px]">{Math.round(zoom * 100)}%</span>
          <button
            onClick={() => setZoom(zoom + 0.2)}
            className="p-1 hover:text-white hover:bg-surface-50 rounded"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Right: Panel Toggles & Export */}
      <div className="flex items-center gap-2">
        {/* Toggle Layers Drawer */}
        <button
          onClick={toggleLayersPanel}
          title="Toggle Layers Panel"
          className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 border ${
            isLayersOpen
              ? 'bg-surface-50 border-brand-accent text-white shadow-sm'
              : 'bg-surface-100 border-surface-border text-neutral-400 hover:text-white hover:bg-surface-50'
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-indigo-400" />
          <span className="hidden md:inline">Layers</span>
          <span className="text-[10px] px-1 py-0.2 rounded bg-surface-200 text-neutral-400 font-mono">
            {layers.length}
          </span>
        </button>

        {/* Toggle Settings/Params Drawer */}
        <button
          onClick={toggleParamsPanel}
          title="Toggle Tuning Controls"
          className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 border ${
            isParamsOpen
              ? 'bg-surface-50 border-brand-accent text-white shadow-sm'
              : 'bg-surface-100 border-surface-border text-neutral-400 hover:text-white hover:bg-surface-50'
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-brand-400" />
          <span className="hidden md:inline">Tuning</span>
        </button>

        {/* Quick Download SVG button */}
        <button
          onClick={handleQuickDownload}
          disabled={!outputSvg || isProcessing}
          title="Quick Download SVG"
          className="hidden sm:flex px-3 py-1.5 rounded-xl text-xs font-medium bg-surface-100 hover:bg-surface-50 border border-surface-border text-neutral-200 hover:text-white transition-all items-center gap-1.5 disabled:opacity-40"
        >
          <FileCode className="w-3.5 h-3.5 text-emerald-400" />
          <span>Save SVG</span>
        </button>

        {/* Export All Modal */}
        <button
          onClick={() => setExportModalOpen(true)}
          disabled={!outputSvg || isProcessing}
          className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-brand-accent to-indigo-600 hover:from-brand-accentHover hover:to-indigo-500 text-white shadow-lg shadow-indigo-950/40 disabled:opacity-40 transition-all flex items-center gap-1.5"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export</span>
        </button>
      </div>
    </header>
  );
}
