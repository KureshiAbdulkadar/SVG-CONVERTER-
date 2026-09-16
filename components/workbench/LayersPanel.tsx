'use client';

import React, { useState } from 'react';
import {
  Layers,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  Edit2,
  Check,
  Download,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Palette,
  Circle,
  Hash,
  X,
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
    selectedPathId,
    hoveredPathId,
    toggleLayerVisibility,
    toggleLayerExpanded,
    togglePathVisibility,
    setLayerColor,
    setPathColor,
    renameLayer,
    renamePath,
    reorderLayers,
    setSelectedLayer,
    setSelectedPath,
    setHoveredPath,
    isLayersOpen,
    toggleLayersPanel,
  } = useWorkbenchStore();

  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
  const [editNameValue, setEditNameValue] = useState('');
  const [editingPathId, setEditingPathId] = useState<string | null>(null);
  const [editPathNameValue, setEditPathNameValue] = useState('');

  if (!isLayersOpen) return null;

  const startRenameLayer = (id: string, currentName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingLayerId(id);
    setEditNameValue(currentName);
  };

  const saveRenameLayer = (id: string) => {
    if (editNameValue.trim()) {
      renameLayer(id, editNameValue.trim());
    }
    setEditingLayerId(null);
  };

  const startRenamePath = (id: string, currentName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingPathId(id);
    setEditPathNameValue(currentName);
  };

  const saveRenamePath = (layerId: string, pathId: string) => {
    if (editPathNameValue.trim()) {
      renamePath(layerId, pathId, editPathNameValue.trim());
    }
    setEditingPathId(null);
  };

  const handleDownloadLayer = (layer: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const svgStr = exportSingleLayerSvg(layer, imageWidth, imageHeight);
    const blob = new Blob([svgStr], { type: 'image/svg+xml' });
    downloadBlob(blob, `${layer.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.svg`);
  };

  return (
    <aside className="w-80 bg-sidebar border-r border-surface-border flex flex-col h-full select-none animate-in slide-in-from-left duration-200">
      {/* Panel Header */}
      <div className="h-12 border-b border-surface-border px-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-brand-accent" />
          <span className="text-xs font-semibold text-neutral-200">
            Layer Groups
          </span>
        </div>
        <div className="flex items-center gap-1.5 font-mono text-[10px] text-neutral-400">
          <span className="px-1.5 py-0.5 rounded bg-brand-accent/15 text-brand-accent border border-brand-accent/25">
            {layers.reduce((s, l) => s + l.paths.length, 0)} Paths
          </span>
          <button
            onClick={toggleLayersPanel}
            title="Close Layers Panel"
            className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-surface-100 transition-all ml-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Layers Tree */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {layers.length === 0 ? (
          <div className="p-8 text-center text-xs text-neutral-500">
            No vector layers generated yet.
          </div>
        ) : (
          layers.map((layer, index) => {
            const isSelected = selectedLayerId === layer.id;
            const isExpanded = layer.expanded !== false;

            return (
              <div
                key={layer.id}
                className={`rounded-xl border transition-all text-xs overflow-hidden ${
                  isSelected
                    ? 'bg-surface-50/90 border-brand-accent/60 shadow-sm'
                    : 'bg-surface-200/50 border-surface-border/70 hover:border-surface-border hover:bg-surface-100/50'
                }`}
              >
                {/* Layer Group Header Row */}
                <div
                  onClick={() => setSelectedLayer(layer.id)}
                  className="px-2.5 py-2 flex items-center gap-2 cursor-pointer group"
                >
                  {/* Expand / Collapse Chevron */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleLayerExpanded(layer.id);
                    }}
                    className="text-neutral-400 hover:text-white p-0.5 rounded transition-colors"
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5 text-neutral-300" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-neutral-500" />
                    )}
                  </button>

                  {/* Visibility Toggle */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleLayerVisibility(layer.id);
                    }}
                    title={layer.visible ? 'Hide Layer Group' : 'Show Layer Group'}
                    className="text-neutral-400 hover:text-white transition-colors"
                  >
                    {layer.visible ? (
                      <Eye className="w-3.5 h-3.5 text-brand-400" />
                    ) : (
                      <EyeOff className="w-3.5 h-3.5 text-neutral-600" />
                    )}
                  </button>

                  {/* Folder Icon */}
                  {isExpanded ? (
                    <FolderOpen className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                  ) : (
                    <Folder className="w-3.5 h-3.5 text-indigo-400/70 flex-shrink-0" />
                  )}

                  {/* Group Name / Inline Rename */}
                  <div className="flex-1 min-w-0">
                    {editingLayerId === layer.id ? (
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          value={editNameValue}
                          onChange={(e) => setEditNameValue(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && saveRenameLayer(layer.id)}
                          autoFocus
                          className="w-full bg-surface-300 text-white px-1.5 py-0.5 rounded text-xs border border-brand-accent focus:outline-none"
                        />
                        <button
                          onClick={() => saveRenameLayer(layer.id)}
                          className="p-1 text-brand-400 hover:text-white"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div
                        onDoubleClick={(e) => startRenameLayer(layer.id, layer.name, e)}
                        className="truncate font-medium text-neutral-200 flex items-center justify-between"
                      >
                        <span className="truncate">{layer.name}</span>
                      </div>
                    )}
                  </div>

                  {/* Swatches in this group */}
                  {layer.colors && layer.colors.length > 0 && (
                    <div className="flex items-center gap-1">
                      {layer.colors.slice(0, 3).map((c, cIdx) => (
                        <div
                          key={cIdx}
                          className="w-2.5 h-2.5 rounded-full border border-white/20"
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
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
                  </div>
                </div>

                {/* Sub-paths list when expanded */}
                {isExpanded && (
                  <div className="pl-6 pr-2 pb-2 pt-1 border-t border-surface-border/40 space-y-1 bg-surface-300/40">
                    {layer.paths.map((path) => {
                      const isPathSelected = selectedPathId === path.id;
                      const isPathHovered = hoveredPathId === path.id;
                      const isPathVisible = path.visible !== false;

                      return (
                        <div
                          key={path.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPath(path.id);
                          }}
                          onMouseEnter={() => setHoveredPath(path.id)}
                          onMouseLeave={() => setHoveredPath(null)}
                          className={`flex items-center gap-2 py-1 px-2 rounded-lg transition-colors group/path ${
                            isPathSelected
                              ? 'bg-brand-accent/20 border border-brand-accent/40 text-white'
                              : isPathHovered
                              ? 'bg-surface-100 border border-surface-border text-neutral-200'
                              : 'text-neutral-400 hover:text-neutral-200 hover:bg-surface-100/60'
                          }`}
                        >
                          {/* Child path visibility */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              togglePathVisibility(layer.id, path.id);
                            }}
                            className="text-neutral-500 hover:text-white"
                          >
                            {isPathVisible && layer.visible ? (
                              <Eye className="w-3 h-3 text-neutral-400" />
                            ) : (
                              <EyeOff className="w-3 h-3 text-neutral-600" />
                            )}
                          </button>

                          {/* Color picker for this path */}
                          <div className="relative flex-shrink-0">
                            <input
                              type="color"
                              value={path.fill}
                              onChange={(e) => setPathColor(layer.id, path.id, e.target.value)}
                              className="opacity-0 absolute inset-0 w-3.5 h-3.5 cursor-pointer"
                              title="Change shape color"
                            />
                            <div
                              className="w-3.5 h-3.5 rounded border border-white/20 shadow-xs"
                              style={{ backgroundColor: path.fill }}
                            />
                          </div>

                          {/* Path name / inline edit */}
                          <div className="flex-1 min-w-0">
                            {editingPathId === path.id ? (
                              <div
                                className="flex items-center gap-1"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <input
                                  type="text"
                                  value={editPathNameValue}
                                  onChange={(e) => setEditPathNameValue(e.target.value)}
                                  onKeyDown={(e) =>
                                    e.key === 'Enter' && saveRenamePath(layer.id, path.id)
                                  }
                                  autoFocus
                                  className="w-full bg-surface-300 text-white px-1 py-0.2 rounded text-[11px] border border-brand-accent focus:outline-none"
                                />
                                <button
                                  onClick={() => saveRenamePath(layer.id, path.id)}
                                  className="p-0.5 text-brand-400"
                                >
                                  <Check className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <span
                                onDoubleClick={(e) =>
                                  startRenamePath(path.id, path.name || path.id, e)
                                }
                                className="truncate text-[11px] font-mono block cursor-pointer"
                              >
                                {path.name || path.id}
                              </span>
                            )}
                          </div>

                          {/* Node count pill */}
                          <span className="text-[10px] font-mono text-neutral-500">
                            {path.nodeCount}n
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Panel Footer */}
      <div className="p-3 border-t border-surface-border bg-surface-200/60">
        <div className="text-[11px] text-neutral-400 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Figma & Illustrator Groups</span>
          </span>
          <span className="font-mono text-brand-400 font-semibold">
            {layers.reduce((s, l) => s + l.nodeCount, 0)} Nodes
          </span>
        </div>
      </div>
    </aside>
  );
}
