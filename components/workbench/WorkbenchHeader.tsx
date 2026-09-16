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
  Copy,
  Check,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Layers,
  SlidersHorizontal,
  CheckCircle2,
  Clock,
  Dot,
  FileCode,
  ChevronRight,
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
    zoom,
    layers,
    isLayersOpen,
    isParamsOpen,
    activeStep,
    copiedToast,
    undo,
    redo,
    setViewMode,
    toggleLayersPanel,
    toggleParamsPanel,
    setActiveStep,
    setCopiedToast,
    setZoom,
    setExportModalOpen,
    setFeedbackModalOpen,
  } = useWorkbenchStore();

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const handleCopySvg = async () => {
    if (!outputSvg) return;
    await navigator.clipboard.writeText(outputSvg);
    setCopiedToast(true);
    setTimeout(() => setCopiedToast(false), 2000);
  };

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

  const steps = [
    { num: 1, label: 'Upload', link: '/' },
    { num: 2, label: 'Inspect', action: () => { setViewMode('split'); setActiveStep(2); } },
    { num: 3, label: 'Polish', action: () => { toggleParamsPanel(); setActiveStep(3); } },
    { num: 4, label: 'Export', action: () => { setExportModalOpen(true); setActiveStep(4); } },
  ];

  return (
    <header className="h-14 bg-surface-200/95 backdrop-blur-xl border-b border-surface-border px-4 flex items-center justify-between select-none z-30">
      {/* Left: Exit + Filename */}
      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="px-2.5 py-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-surface-100 transition-colors flex items-center gap-1.5 text-xs font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline font-semibold">New Image</span>
        </Link>

        <div className="h-4 w-px bg-surface-border" />

        <div className="flex items-center gap-2">
          <span className="font-semibold text-xs sm:text-sm text-white tracking-tight flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-brand-500 shadow-[0_0_8px_#22c55e]" />
            <span className="max-w-[130px] sm:max-w-[180px] truncate">{fileName}</span>
          </span>
          {meta && (
            <span className="hidden lg:inline-flex text-[10px] px-2 py-0.5 rounded-full bg-surface-50 text-neutral-400 font-mono border border-surface-border">
              {meta.nodesCount} nodes · {meta.processingTimeMs}ms
            </span>
          )}
        </div>
      </div>

      {/* Center: Guided User Flow Stepper Breadcrumbs */}
      <div className="hidden md:flex items-center gap-1 bg-surface-100/80 p-1 rounded-xl border border-surface-border shadow-inner">
        {steps.map((st, sIdx) => {
          const isActive = activeStep === st.num;

          return (
            <React.Fragment key={st.num}>
              {sIdx > 0 && <ChevronRight className="w-3 h-3 text-neutral-600" />}

              {st.link ? (
                <Link
                  href={st.link}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium text-neutral-400 hover:text-white hover:bg-surface-50 transition-colors flex items-center gap-1.5"
                >
                  <span className="w-4 h-4 rounded-full bg-surface-50 text-[10px] flex items-center justify-center font-bold text-neutral-400">
                    {st.num}
                  </span>
                  <span>{st.label}</span>
                </Link>
              ) : (
                <button
                  onClick={st.action}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-brand-accent text-white shadow-sm shadow-indigo-950/50'
                      : 'text-neutral-400 hover:text-white hover:bg-surface-50'
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-bold ${
                      isActive ? 'bg-white/20 text-white' : 'bg-surface-50 text-neutral-400'
                    }`}
                  >
                    {st.num}
                  </span>
                  <span>{st.label}</span>
                </button>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Right: 1-Click Copy SVG & Instant Export */}
      <div className="flex items-center gap-2">
        {/* Undo/Redo */}
        <div className="flex items-center gap-0.5 mr-1">
          <button
            onClick={undo}
            disabled={!canUndo}
            title="Undo (Cmd+Z)"
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-surface-100 disabled:opacity-25 transition-colors"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            title="Redo (Cmd+Shift+Z)"
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-surface-100 disabled:opacity-25 transition-colors"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 1-Click Copy SVG Code for Figma/Code */}
        <button
          onClick={handleCopySvg}
          disabled={!outputSvg || isProcessing}
          title="Copy SVG code to paste directly into Figma or HTML"
          className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all flex items-center gap-1.5 ${
            copiedToast
              ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400 shadow-sm shadow-emerald-950/50'
              : 'bg-surface-100 hover:bg-surface-50 border-surface-border text-neutral-200 hover:text-white'
          }`}
        >
          {copiedToast ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>Copied SVG!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">Copy for Figma</span>
              <span className="sm:hidden">Copy</span>
            </>
          )}
        </button>

        {/* Download File */}
        <button
          onClick={handleQuickDownload}
          disabled={!outputSvg || isProcessing}
          className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-brand-accent to-indigo-600 hover:from-brand-accentHover hover:to-indigo-500 text-white shadow-lg shadow-indigo-950/40 disabled:opacity-40 transition-all flex items-center gap-1.5"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Save SVG</span>
        </button>
      </div>
    </header>
  );
}
