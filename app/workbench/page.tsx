'use client';

import React, { useEffect } from 'react';
import { WorkbenchHeader } from '../../components/workbench/WorkbenchHeader';
import { CanvasView } from '../../components/workbench/CanvasView';
import { LayersPanel } from '../../components/workbench/LayersPanel';
import { ParametersPanel } from '../../components/workbench/ParametersPanel';
import { ExportModal } from '../../components/workbench/ExportModal';
import { FeedbackModal } from '../../components/workbench/FeedbackModal';
import { useWorkbenchStore } from '../../stores/workbench-store';
import { SAMPLE_IMAGES } from '../../lib/samples';

export default function WorkbenchPage() {
  const { imageDataUrl, loadImage } = useWorkbenchStore();

  // If no image is currently in store, automatically load the first sample logo
  useEffect(() => {
    if (!imageDataUrl && SAMPLE_IMAGES[0]) {
      const dataUrl = SAMPLE_IMAGES[0].generateDataUrl();
      loadImage(dataUrl, 'apex-logo.png');
    }
  }, [imageDataUrl, loadImage]);

  return (
    <div className="h-screen w-screen flex flex-col bg-background text-foreground overflow-hidden">
      {/* Top Bar Header */}
      <WorkbenchHeader />

      {/* Main Studio Viewport: Layers Panel | Canvas Split View | Parameters Panel */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Figma-Grade Layers Panel */}
        <LayersPanel />

        {/* Center: Interactive Canvas & Comparison Slider */}
        <CanvasView />

        {/* Right: Vector Parameters & Intelligence Panel */}
        <ParametersPanel />
      </div>

      {/* Modals */}
      <ExportModal />
      <FeedbackModal />
    </div>
  );
}
