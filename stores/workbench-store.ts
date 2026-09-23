import { create } from 'zustand';
import {
  VectorParameters,
  VectorResult,
} from '../lib/vector-engine/types';
import { vectorizeImage } from '../lib/vector-engine';

export type AppState = 'idle' | 'converting' | 'done' | 'error';

/**
 * HARD RULE: Exactly the "Balanced" preset parameters from PRESET_CONFIGS.
 * Output is byte-for-byte identical to what Balanced produces.
 */
export const BALANCED_PARAMETERS: VectorParameters = {
  preset: 'balanced',
  imageType: 'logo',
  colorCount: 0,
  preserveBrandColors: true,
  smoothness: 0.45,
  cornerSharpness: 0.8,
  detail: 0.8,
  noiseRemoval: 1,
  preserveSymmetry: false,
  gridSnap: false,
  gridSize: 16,
  removeBackground: false,
  mergeSimilarPaths: true,
  fillOverlap: true,
};

export function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

interface ConverterStore {
  // State machine
  appState: AppState;
  errorMessage: string | null;

  // File & image data
  fileName: string;
  imageDataUrl: string | null;
  imageWidth: number;
  imageHeight: number;

  // Conversion result
  outputSvg: string | null;
  svgBlobUrl: string | null;
  svgSizeBytes: number;

  // Progress
  processingProgress: number;

  // Comparison slider
  splitPosition: number;

  // Feedback toast
  copiedToast: boolean;

  // Actions
  convertFile: (file: File) => Promise<void>;
  convertDataUrl: (dataUrl: string, name: string) => Promise<void>;
  reset: () => void;
  setSplitPosition: (pos: number) => void;
  copySvg: () => Promise<void>;
  downloadSvg: () => void;
}

export const useWorkbenchStore = create<ConverterStore>((set, get) => ({
  appState: 'idle',
  errorMessage: null,

  fileName: '',
  imageDataUrl: null,
  imageWidth: 0,
  imageHeight: 0,

  outputSvg: null,
  svgBlobUrl: null,
  svgSizeBytes: 0,

  processingProgress: 0,
  splitPosition: 50,
  copiedToast: false,

  reset: () => {
    const { svgBlobUrl } = get();
    if (svgBlobUrl) {
      try {
        URL.revokeObjectURL(svgBlobUrl);
      } catch (e) {
        // Ignore revoke errors
      }
    }

    set({
      appState: 'idle',
      errorMessage: null,
      fileName: '',
      imageDataUrl: null,
      imageWidth: 0,
      imageHeight: 0,
      outputSvg: null,
      svgBlobUrl: null,
      svgSizeBytes: 0,
      processingProgress: 0,
      splitPosition: 50,
      copiedToast: false,
    });
  },

  setSplitPosition: (pos: number) => {
    set({ splitPosition: Math.max(0, Math.min(100, pos)) });
  },

  convertFile: async (file: File) => {
    if (!file) return;

    // Validate type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/bmp'];
    if (!validTypes.includes(file.type.toLowerCase()) && !/\.(png|jpe?g|webp|bmp)$/i.test(file.name)) {
      set({
        appState: 'error',
        errorMessage: "We couldn't read this format. Please upload a PNG, JPG, or WebP image under 25 MB.",
      });
      return;
    }

    // Validate size (max 25 MB)
    if (file.size > 25 * 1024 * 1024) {
      set({
        appState: 'error',
        errorMessage: 'This image is too large. Please choose an image under 25 MB.',
      });
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => {
      set({
        appState: 'error',
        errorMessage: "We couldn't read this file from your device. Please try another image.",
      });
    };

    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      if (dataUrl) {
        await get().convertDataUrl(dataUrl, file.name);
      }
    };

    reader.readAsDataURL(file);
  },

  convertDataUrl: async (dataUrl: string, name: string) => {
    const { svgBlobUrl: oldBlobUrl } = get();
    if (oldBlobUrl) {
      try {
        URL.revokeObjectURL(oldBlobUrl);
      } catch (e) {
        // ignore
      }
    }

    set({
      appState: 'converting',
      errorMessage: null,
      fileName: name,
      imageDataUrl: dataUrl,
      outputSvg: null,
      svgBlobUrl: null,
      svgSizeBytes: 0,
      processingProgress: 15,
      splitPosition: 50,
      copiedToast: false,
    });

    try {
      // 1. Load image to extract dimensions and pixel buffer
      const img = new Image();
      img.src = dataUrl;

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = () => reject(new Error('Invalid image data'));
      });

      const width = img.naturalWidth || img.width;
      const height = img.naturalHeight || img.height;

      if (!width || !height) {
        throw new Error('Image dimensions could not be read');
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not initialize canvas context');

      ctx.drawImage(img, 0, 0);
      const imgData = ctx.getImageData(0, 0, width, height);

      set({
        imageWidth: width,
        imageHeight: height,
        processingProgress: 50,
      });

      // 2. Call conversion engine with exact BALANCED_PARAMETERS
      const result = await vectorizeImage(
        imgData.data,
        width,
        height,
        BALANCED_PARAMETERS
      );

      if (!result || !result.svg) {
        throw new Error('Vectorization did not produce SVG output');
      }

      // 3. Create blob URL for fast, non-blocking preview render
      const svgBlob = new Blob([result.svg], { type: 'image/svg+xml;charset=utf-8' });
      const newBlobUrl = URL.createObjectURL(svgBlob);
      const sizeBytes = svgBlob.size;

      set({
        appState: 'done',
        outputSvg: result.svg,
        svgBlobUrl: newBlobUrl,
        svgSizeBytes: sizeBytes,
        processingProgress: 100,
      });
    } catch (err: any) {
      console.error('Vectorization error:', err);
      set({
        appState: 'error',
        errorMessage: "We couldn't convert this image. Please try a PNG or JPG under 25 MB.",
      });
    }
  },

  copySvg: async () => {
    const { outputSvg } = get();
    if (!outputSvg) return;

    try {
      await navigator.clipboard.writeText(outputSvg);
      set({ copiedToast: true });
      setTimeout(() => {
        set({ copiedToast: false });
      }, 2000);
    } catch (err) {
      console.error('Failed to copy SVG to clipboard:', err);
    }
  },

  downloadSvg: () => {
    const { outputSvg, fileName } = get();
    if (!outputSvg) return;

    try {
      const blob = new Blob([outputSvg], { type: 'image/svg+xml;charset=utf-8' });
      const baseName = fileName ? fileName.replace(/\.[^/.]+$/, '') : 'vector';
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${baseName}.svg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download SVG:', err);
    }
  },
}));
