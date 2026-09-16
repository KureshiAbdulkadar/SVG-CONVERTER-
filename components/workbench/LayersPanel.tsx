'use client';

import React, { useState } from 'react';
import {
  Layers,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronRight,
  Edit2,
  Check,
  Download,
  ArrowUp,
  ArrowDown,
  Sparkles,
} from 'lucide-react';
import { useWorkbenchStore } from '../../stores/workbench-store';
import { exportSingleLayerSvg } from '../../lib/vector-engine';
import { downloadBlob } from '../../lib/exporters';

export function LayersPanel() {
  const {
    layers,
    imageWidth,
    imageHeight,
    selectedLayerId,
    toggleLayerVisibility,
    setLayerColor,
    renameLayer,
    reorderLayers,
    setSelectedLayer,
  } = useWorkbenchStore();

  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
  const [editNameValue, setEditNameValue] = useState('');
  const [expandedLayerId, setExpandedLayerId] = useState<string | null>(null);

  const startRename = (id: string, currentName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingLayerId(id);
    setEditNameValue(currentName);
  };

  const saveRename = (id: string) => {
    if (editNameValue.trim()) {
      renameLayer(id, editNameValue.trim());
    }
    setEditingLayerId(null);
  };

  const handleDownloadLayer = (layer: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const svgStr = exportSingleLayerSvg(layer, imageWidth, imageHeight);
    const blob = new Blob([svgStr], { type: 'image/svg+xml' });
    downloadBlob(blob, `${layer.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.svg`);
  };

  return (
    <aside className="w-72 bg-sidebar border-r border-surface-border flex flex-col h-full select-none">
      {/* Panel Header */}
      <div className="h-12 border-b border-surface-border px-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-brand-accent" />
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-200">
            Semantic Layers
          </span>
        </div>
        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-surface-50 text-neutral-400 border border-surface-border">
          {layers.length}
        </span>
      </div>

      {/* Layers List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {layers.length === 0 ? (
          <div className="p-8 text-center text-xs text-neutral-500">
            No layers generated yet.
          </div>
        ) : (
          layers.map((layer, index) => {
            const isSelected = selectedLayerId === layer.id;
            const isExpanded = expandedLayerId === layer.id;

            return (
              <div
                key={layer.id}
                onClick={() => setSelectedLayer(layer.id)}
                className={`group rounded-lg border transition-all text-xs ${
                  isSelected
                    ? 'bg-surface-50 border-brand-accent/60 shadow-sm'
                    : 'bg-surface-200/40 border-transparent hover:bg-surface-100 hover:border-surface-border'
                }`}
              >
                {/* Main Layer Row */}
                <div className="px-2.5 py-2 flex items-center gap-2">
                  {/* Visibility Toggle */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleLayerVisibility(layer.id);
                    }}
                    className="text-neutral-400 hover:text-white transition-colors"
                  >
                    {layer.visible ? (
                      <Eye className="w-3.5 h-3.5 text-neutral-300" />
                    ) : (
                      <EyeOff className="w-3.5 h-3.5 text-neutral-600" />
                    )}
                  </button>

                  {/* Color Swatch & Native Color Picker */}
                  <div className="relative">
                    <input
                      type="color"
                      value={layer.color}
                      onChange={(e) => setLayerColor(layer.id, e.target.value)}
                      className="opacity-0 absolute inset-0 w-4 h-4 cursor-pointer"
                      title="Change layer color"
                    />
                    <div
                      className="w-4 h-4 rounded-md border border-white/20 shadow-sm"
                      style={{ backgroundColor: layer.color }}
                    />
                  </div>

                  {/* Layer Name / Inline Edit */}
                  <div className="flex-1 min-w-0">
                    {editingLayerId === layer.id ? (
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          value={editNameValue}
                          onChange={(e) => setEditNameValue(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && saveRename(layer.id)}
                          autoFocus
                          className="w-full bg-surface-300 text-white px-1.5 py-0.5 rounded text-xs border border-brand-accent focus:outline-none"
                        />
                        <button
                          onClick={() => saveRename(layer.id)}
                          className="p-1 text-brand-400 hover:text-white"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div
                        onDoubleClick={(e) => startRename(layer.id, layer.name, e)}
                        className="truncate font-medium text-neutral-200 flex items-center gap-1.5 cursor-pointer"
                      >
                        <span className="truncate">{layer.name}</span>
                        <span className="text-[10px] font-mono text-neutral-500 uppercase">
                          ({layer.semanticRole})
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions / Submenu triggers */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {index > 0 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          reorderLayers(index, index - 1);
                        }}
                        title="Move Up"
                        className="p-1 hover:text-white text-neutral-400 rounded"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                    )}
                    {index < layers.length - 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          reorderLayers(index, index + 1);
                        }}
                        title="Move Down"
                        className="p-1 hover:text-white text-neutral-400 rounded"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                    )}
                    <button
                      onClick={(e) => handleDownloadLayer(layer, e)}
                      title="Export single layer SVG"
                      className="p-1 hover:text-brand-400 text-neutral-400 rounded"
                    >
                      <Download className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => startRename(layer.id, layer.name, e)}
                      title="Rename Layer"
                      className="p-1 hover:text-white text-neutral-400 rounded"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Sub-details (Paths & Nodes count) */}
                <div className="px-2.5 pb-1.5 pt-0 flex items-center justify-between text-[10px] text-neutral-500 font-mono">
                  <span>{layer.paths.length} {layer.paths.length === 1 ? 'path' : 'paths'}</span>
                  <span>{layer.nodeCount} nodes</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Panel Footer */}
      <div className="p-3 border-t border-surface-border bg-surface-200/50">
        <div className="text-[11px] text-neutral-400 flex items-center gap-1.5">
          <Sparkles className="w-3 h-3 text-indigo-400" />
          <span>Figma-ready semantic groups & roles</span>
        </div>
      </div>
    </aside>
  );
}
