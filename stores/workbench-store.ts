import { create } from "zustand";
import type {
  VectorParameters,
  VectorResult,
} from "../lib/vector-engine/types";

export type AppState = "idle" | "converting" | "done" | "error";
export const BALANCED_PARAMETERS: VectorParameters = {
  preset: "balanced",
  imageType: "logo",
  colorCount: 64,
  preserveBrandColors: true,
  smoothness: 0.45,
  cornerSharpness: 0.8,
  detail: 0.8,
  noiseRemoval: 0,
  preserveSymmetry: false,
  gridSnap: false,
  gridSize: 16,
  removeBackground: false,
  mergeSimilarPaths: true,
  fillOverlap: true,
};
export function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 B";
  const i = Math.min(3, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${parseFloat((bytes / 1024 ** i).toFixed(1))} ${["B", "KB", "MB", "GB"][i]}`;
}
let activeWorker: Worker | null = null;
let runId = 0;
let copyTimer: ReturnType<typeof setTimeout> | undefined;
function stopWork() {
  runId++;
  activeWorker?.terminate();
  activeWorker = null;
}
function releaseUrl(url: string | null) {
  if (url) URL.revokeObjectURL(url);
}

interface ConverterStore {
  appState: AppState;
  errorMessage: string | null;
  actionError: string | null;
  fileName: string;
  imageDataUrl: string | null;
  imageWidth: number;
  imageHeight: number;
  outputSvg: string | null;
  svgBlobUrl: string | null;
  svgSizeBytes: number;
  result: VectorResult | null;
  processingStage: string;
  processingProgress: number;
  splitPosition: number;
  copiedToast: boolean;
  detailed: boolean;
  convertFile: (file: File) => Promise<void>;
  convertDataUrl: (
    dataUrl: string,
    name: string,
    detailed?: boolean,
  ) => Promise<void>;
  retryDetailed: () => void;
  reset: () => void;
  setSplitPosition: (pos: number) => void;
  copySvg: () => Promise<void>;
  downloadSvg: () => void;
}
export const useWorkbenchStore = create<ConverterStore>((set, get) => ({
  appState: "idle",
  errorMessage: null,
  actionError: null,
  fileName: "",
  imageDataUrl: null,
  imageWidth: 0,
  imageHeight: 0,
  outputSvg: null,
  svgBlobUrl: null,
  svgSizeBytes: 0,
  result: null,
  processingStage: "",
  processingProgress: 0,
  splitPosition: 50,
  copiedToast: false,
  detailed: false,
  reset: () => {
    stopWork();
    clearTimeout(copyTimer);
    releaseUrl(get().svgBlobUrl);
    set({
      appState: "idle",
      errorMessage: null,
      actionError: null,
      fileName: "",
      imageDataUrl: null,
      imageWidth: 0,
      imageHeight: 0,
      outputSvg: null,
      svgBlobUrl: null,
      svgSizeBytes: 0,
      result: null,
      processingStage: "",
      processingProgress: 0,
      splitPosition: 50,
      copiedToast: false,
      detailed: false,
    });
  },
  setSplitPosition: (pos) =>
    set({ splitPosition: Math.max(0, Math.min(100, pos)) }),
  convertFile: async (file) => {
    if (get().appState === "converting") return;
    if (
      !/^image\/(png|jpeg|jpg|webp|bmp)$/i.test(file.type) &&
      !/\.(png|jpe?g|webp|bmp)$/i.test(file.name)
    ) {
      set({
        appState: "error",
        errorMessage: "Choose a PNG, JPG, WebP or BMP image.",
      });
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      set({
        appState: "error",
        errorMessage:
          "This file exceeds 25 MB. Export a smaller image and try again.",
      });
      return;
    }
    stopWork();
    const id = runId;
    set({
      appState: "converting",
      fileName: file.name,
      processingStage: "Reading your image…",
      errorMessage: null,
    });
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () =>
          reject(
            new Error("This file could not be read. Please select it again."),
          );
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      if (id === runId) await get().convertDataUrl(dataUrl, file.name);
    } catch (error) {
      if (id === runId) set({ appState: "error", errorMessage: String(error) });
    }
  },
  convertDataUrl: async (dataUrl, name, detailed = false) => {
    stopWork();
    const id = runId;
    clearTimeout(copyTimer);
    releaseUrl(get().svgBlobUrl);
    set({
      appState: "converting",
      errorMessage: null,
      actionError: null,
      fileName: name,
      imageDataUrl: dataUrl,
      outputSvg: null,
      svgBlobUrl: null,
      result: null,
      svgSizeBytes: 0,
      processingProgress: 15,
      splitPosition: 50,
      copiedToast: false,
      detailed,
      processingStage: "Reading your image…",
    });
    try {
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () =>
          reject(
            new Error(
              "This image could not be decoded. Try exporting it as PNG.",
            ),
          );
        img.src = dataUrl;
      });
      if (id !== runId) return;
      const width = img.naturalWidth,
        height = img.naturalHeight;
      if (!width || !height)
        throw new Error(
          "This image has no readable dimensions. Try another file.",
        );
      if (width * height > 4_000_000 || width > 8192 || height > 8192)
        throw new Error(
          "This image is too large to trace safely. Resize it to 4 megapixels or less, with neither side above 8,192 pixels.",
        );
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx)
        throw new Error(
          "Your browser could not create an image canvas. Please try again.",
        );
      ctx.drawImage(img, 0, 0);
      const image = ctx.getImageData(0, 0, width, height);
      set({
        imageWidth: width,
        imageHeight: height,
        processingProgress: 35,
        processingStage: "Preparing your vector…",
      });
      const worker = new Worker(
        new URL("../lib/vector-engine/vectorize.worker.ts", import.meta.url),
        { type: "module" },
      );
      activeWorker = worker;
      worker.onmessage = (event) => {
        if (id !== runId) return;
        if (event.data.stage) {
          set({ processingStage: event.data.stage, processingProgress: 50 });
          return;
        }
        worker.terminate();
        activeWorker = null;
        if (event.data.error) {
          set({
            appState: "error",
            errorMessage:
              "The image could not be traced. Try a smaller PNG or a simpler image.",
          });
          return;
        }
        const result: VectorResult = event.data.result;
        if (!result.layers.length) {
          set({
            appState: "error",
            errorMessage:
              "No visible shapes were found. Choose an image with visible artwork.",
          });
          return;
        }
        const blob = new Blob([result.svg], {
          type: "image/svg+xml;charset=utf-8",
        });
        set({
          appState: "done",
          result,
          outputSvg: result.svg,
          svgBlobUrl: URL.createObjectURL(blob),
          svgSizeBytes: blob.size,
          processingProgress: 100,
        });
      };
      worker.onerror = () => {
        if (id !== runId) return;
        worker.terminate();
        activeWorker = null;
        set({
          appState: "error",
          errorMessage:
            "The conversion stopped unexpectedly. Please try a smaller image.",
        });
      };
      worker.postMessage(
        {
          pixels: image.data.buffer,
          width,
          height,
          params: {
            ...BALANCED_PARAMETERS,
            preset: detailed ? "sharp" : "balanced",
            colorCount: detailed ? 128 : 64,
          },
        },
        [image.data.buffer],
      );
    } catch (error) {
      if (id === runId)
        set({
          appState: "error",
          errorMessage:
            error instanceof Error
              ? error.message
              : "Please try another image.",
        });
    }
  },
  retryDetailed: () => {
    const { imageDataUrl, fileName } = get();
    if (imageDataUrl) void get().convertDataUrl(imageDataUrl, fileName, true);
  },
  copySvg: async () => {
    const { outputSvg } = get();
    if (!outputSvg) return;
    try {
      await navigator.clipboard.writeText(outputSvg);
      clearTimeout(copyTimer);
      set({ copiedToast: true, actionError: null });
      copyTimer = setTimeout(() => set({ copiedToast: false }), 2000);
    } catch {
      set({
        actionError:
          "Clipboard access is unavailable. Use Download SVG to save your file.",
      });
    }
  },
  downloadSvg: () => {
    const { outputSvg, fileName } = get();
    if (!outputSvg) return;
    try {
      const url = URL.createObjectURL(
        new Blob([outputSvg], { type: "image/svg+xml" }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = `${fileName.replace(/\.[^/.]+$/, "") || "vector"}.svg`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      set({ actionError: null });
    } catch {
      set({
        actionError: "The download could not start. Try Copy SVG instead.",
      });
    }
  },
}));
