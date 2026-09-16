'use client';

import React, { useState } from 'react';
import {
  X,
  Download,
  Copy,
  Check,
  FileCode,
  Layers,
  FileText,
  FileSpreadsheet,
  Image as ImageIcon,
  Sparkles,
} from 'lucide-react';
import { useWorkbenchStore } from '../../stores/workbench-store';
import { ExportFormat } from '../../lib/vector-engine/types';
import { exportVectorFile, downloadBlob } from '../../lib/exporters';

export function ExportModal() {
  const {
    isExportModalOpen,
    setExportModalOpen,
    fileName,
    outputSvg,
    minifiedSvg,
    imageWidth,
    imageHeight,
    layers,
    meta,
  } = useWorkbenchStore();

  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('svg');
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  if (!isExportModalOpen) return null;

  const formats: {
    id: ExportFormat;
    name: string;
    ext: string;
    desc: string;
    icon: any;
    recommended?: boolean;
  }[] = [
    {
      id: 'svg',
      name: 'SVG (Standard)',
      ext: '.svg',
      desc: 'Clean XML with named layers and semantic classes',
      icon: FileCode,
      recommended: true,
    },
    {
      id: 'svg-min',
      name: 'SVG (Minified)',
      ext: '.min.svg',
      desc: 'Optimized for web performance, stripped comments & spaces',
      icon: Sparkles,
    },
    {
      id: 'figma-svg',
      name: 'Figma-Ready SVG',
      ext: '.svg',
      desc: 'Pre-formatted layer names and frame hierarchy for Figma import',
      icon: Layers,
    },
    {
      id: 'pdf',
      name: 'Vector PDF',
      ext: '.pdf',
      desc: 'Print-ready resolution-independent document',
      icon: FileText,
    },
    {
      id: 'eps',
      name: 'PostScript (EPS)',
      ext: '.eps',
      desc: 'Adobe Illustrator and legacy print publishing standard',
      icon: FileSpreadsheet,
    },
    {
      id: 'dxf',
      name: 'AutoCAD DXF',
      ext: '.dxf',
      desc: 'CAD polyline format for laser cutters, plotters, and CNC',
      icon: FileCode,
    },
    {
      id: 'png-2x',
      name: 'PNG @ 2x',
      ext: '.png',
      desc: 'Ultra-crisp high-DPI rasterized preview',
      icon: ImageIcon,
    },
  ];

  const handleCopySvg = async () => {
    if (!outputSvg) return;
    const textToCopy = selectedFormat === 'svg-min' ? (minifiedSvg || outputSvg) : outputSvg;
    await navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = async () => {
    setIsExporting(true);
    try {
      const { blob, filename } = await exportVectorFile({
        format: selectedFormat,
        filename: fileName || 'vectorforge-export',
        width: imageWidth || 500,
        height: imageHeight || 500,
        layers,
      });

      downloadBlob(blob, filename);
      setExportModalOpen(false);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-xl bg-surface-200 border border-surface-border rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-surface-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5 text-brand-accent" />
            <h3 className="font-semibold text-white text-base">Export Vector Assets</h3>
          </div>
          <button
            onClick={() => setExportModalOpen(false)}
            className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-surface-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block">
            Select Output Format
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-1">
            {formats.map((fmt) => {
              const Icon = fmt.icon;
              const isSelected = selectedFormat === fmt.id;

              return (
                <div
                  key={fmt.id}
                  onClick={() => setSelectedFormat(fmt.id)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-surface-50 border-brand-accent shadow-md shadow-indigo-950/30'
                      : 'bg-surface-300/60 border-surface-border hover:bg-surface-100'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className={`w-4 h-4 ${isSelected ? 'text-brand-accent' : 'text-neutral-400'}`} />
                      <span className="text-xs font-semibold text-white">{fmt.name}</span>
                    </div>
                    {fmt.recommended && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-500/20 text-brand-400 font-mono">
                        BEST
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-neutral-400 mt-1.5 leading-relaxed">
                    {fmt.desc}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Asset Info Summary */}
          {meta && (
            <div className="p-3 bg-surface-300 rounded-xl border border-surface-border text-xs flex items-center justify-between text-neutral-400 font-mono">
              <span>{meta.nodesCount} Nodes · {meta.pathsCount} Paths</span>
              <span className="text-brand-400">{(meta.sizeBytes / 1024).toFixed(1)} KB</span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-surface-border bg-surface-300/50 flex items-center justify-between">
          <button
            onClick={handleCopySvg}
            className="px-4 py-2 rounded-xl text-xs font-medium text-neutral-300 hover:text-white hover:bg-surface-100 border border-surface-border transition-colors flex items-center gap-2"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-brand-400" />
                <span className="text-brand-400">Copied to Clipboard!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copy SVG Code</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setExportModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-medium text-neutral-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDownload}
              disabled={isExporting}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-brand-accent to-indigo-600 hover:from-brand-accentHover hover:to-indigo-500 text-white shadow-lg shadow-indigo-950/40 transition-all flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>{isExporting ? 'Generating...' : 'Download File'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
