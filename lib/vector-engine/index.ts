import { trace, countPathNodes, type TraceOptions } from "vecline/core";
import {
  VectorParameters,
  VectorResult,
  VectorLayer,
  VectorPath,
  ColorPaletteItem,
  ImageType,
  VectorPreset,
} from "./types";
import { rgbToLab, hexToRgb, isBrandColor } from "./perceptual-color";
import { composeSvg, minifySvgString } from "./svg-generator";
import {
  analyseArtwork,
  upscaleForTracing,
  opaqueInteriorPath,
} from "./preprocess";

export * from "./types";
export * from "./perceptual-color";
export * from "./curve-fitting";
export * from "./corner-detection";
export * from "./symmetry";
export * from "./grid-snap";
export * from "./svg-generator";
export * from "./upscaler";
export * from "./preprocess";

export const PRESET_CONFIGS: Record<VectorPreset, Partial<VectorParameters>> = {
  sharp: {
    preset: "sharp",
    smoothness: 0.15,
    cornerSharpness: 0.95,
    detail: 0.95,
    noiseRemoval: 0,
    preserveSymmetry: false,
    gridSnap: false,
    removeBackground: false,
    mergeSimilarPaths: false,
    fillOverlap: true,
  },
  balanced: {
    preset: "balanced",
    smoothness: 0.45,
    cornerSharpness: 0.8,
    detail: 0.8,
    noiseRemoval: 1,
    preserveSymmetry: false,
    gridSnap: false,
    removeBackground: false,
    mergeSimilarPaths: true,
    fillOverlap: true,
  },
  smooth: {
    preset: "smooth",
    smoothness: 0.75,
    cornerSharpness: 0.5,
    detail: 0.65,
    noiseRemoval: 3,
    preserveSymmetry: false,
    gridSnap: false,
    removeBackground: false,
    mergeSimilarPaths: true,
    fillOverlap: true,
  },
  custom: {
    preset: "custom",
  },
};

// Count SVG path nodes accurately from path string
export function countNodesInPath(d: string): number {
  return d ? countPathNodes(d) : 0;
}

// Extract approximate points from path for node inspector overlay
function extractApproxPoints(d: string): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];
  const regex = /([0-9.-]+)[,\s]+([0-9.-]+)/g;
  let match;
  let count = 0;
  while ((match = regex.exec(d)) !== null && count < 50) {
    const x = parseFloat(match[1]);
    const y = parseFloat(match[2]);
    if (!isNaN(x) && !isNaN(y)) {
      points.push({ x, y });
      count++;
    }
  }
  return points;
}

// Auto classify image type
export function classifyImageHeuristic(
  pixelData: Uint8ClampedArray,
  width: number,
  height: number,
): ImageType {
  const totalPixels = width * height;
  let nonTransparent = 0;
  let grayscaleSum = 0;
  let colorVariance = 0;
  let highContrastEdges = 0;

  const sampleStep = Math.max(1, Math.floor(totalPixels / 4000));

  for (let i = 0; i < totalPixels; i += sampleStep) {
    const idx = i * 4;
    const a = pixelData[idx + 3];
    if (a < 32) continue;

    nonTransparent++;
    const r = pixelData[idx];
    const g = pixelData[idx + 1];
    const b = pixelData[idx + 2];

    const diff = Math.abs(r - g) + Math.abs(g - b) + Math.abs(r - b);
    if (diff < 15) grayscaleSum++;
    colorVariance += diff;

    if ((i + 1) % width !== 0 && (i + 1) * 4 < pixelData.length) {
      const nr = pixelData[(i + 1) * 4];
      const ng = pixelData[(i + 1) * 4 + 1];
      const nb = pixelData[(i + 1) * 4 + 2];
      const edgeDiff = Math.abs(r - nr) + Math.abs(g - ng) + Math.abs(b - nb);
      if (edgeDiff > 120) highContrastEdges++;
    }
  }

  if (nonTransparent === 0) return "logo";

  const grayscaleRatio = grayscaleSum / nonTransparent;
  const avgColorVariance = colorVariance / nonTransparent;
  const edgeRatio = highContrastEdges / nonTransparent;

  if (grayscaleRatio > 0.85 && edgeRatio > 0.15) return "sketch";
  if (width <= 128 && height <= 128) return "icon";
  if (avgColorVariance < 40 && edgeRatio > 0.08) return "logo";
  if (avgColorVariance > 75 && edgeRatio < 0.12) return "photo";

  return "illustration";
}

// Parse SVG paths from raw SVG string preserving exact painter sequence
function parsePathsFromSvg(rawSvg: string): {
  d: string;
  fill: string;
  fillRule?: string;
  opacity?: number;
  sourceSpace?: boolean;
  stroke?: string;
  strokeWidth?: number;
}[] {
  const pathRegex = /<path([^>]+)\/?>/g;
  const paths: {
    d: string;
    fill: string;
    fillRule?: string;
    opacity?: number;
    sourceSpace?: boolean;
    stroke?: string;
    strokeWidth?: number;
  }[] = [];
  let match;

  while ((match = pathRegex.exec(rawSvg)) !== null) {
    const attrs = match[1];
    const dMatch = attrs.match(/\bd="([^"]+)"/);
    const fillMatch = attrs.match(/fill="([^"]+)"/);
    const strokeMatch = attrs.match(/\bstroke="([^"]+)"/);
    const strokeWidthMatch = attrs.match(/stroke-width="([^"]+)"/);
    const opacityMatch = attrs.match(/fill-opacity="([^"]+)"/);
    const ruleMatch = attrs.match(/fill-rule="([^"]+)"/);

    if (dMatch) {
      paths.push({
        d: dMatch[1],
        fill: fillMatch ? fillMatch[1] : "#000000",
        fillRule: ruleMatch ? ruleMatch[1] : undefined,
        opacity: opacityMatch ? Number(opacityMatch[1]) : undefined,
        stroke: strokeMatch?.[1],
        strokeWidth: strokeWidthMatch ? Number(strokeWidthMatch[1]) : undefined,
      });
    }
  }

  return paths;
}

/**
 * Prepare a bounded high-resolution working image for flat artwork, then fit
 * curves on a finer grid and cover opaque interiors to prevent seams. Preserve
 * source dimensions, holes and genuine transparency in the exported SVG.
 */
export async function vectorizeImage(
  pixelData: Uint8ClampedArray,
  width: number,
  height: number,
  params: VectorParameters,
  onProgress?: (stage: string) => void,
): Promise<VectorResult> {
  const startTime = performance.now();

  const imageType =
    params.imageType || classifyImageHeuristic(pixelData, width, height);

  const source = { data: pixelData, width, height };
  upscaleForTracing(source, 1); // Validate before any analysis or allocation.
  onProgress?.("Analysing artwork and transparency…");
  const analysis = analyseArtwork(source);
  const structured = !!analysis.palette;
  const preserveSampling = analysis.translucent || analysis.preserveFineMarks;
  onProgress?.("Preparing high-resolution image…");
  // Broad partial-alpha regions and continuous-tone images retain their native
  // sampling: interpolation creates extra alpha/colour bands, not real detail.
  const prepared = upscaleForTracing(
    source,
    structured && !preserveSampling ? undefined : 1,
  );
  const workWidth = prepared.width;
  const workHeight = prepared.height;
  const finerGrid = prepared.scaleX > 1 || prepared.scaleY > 1;
  const targetColors = params.colorCount > 0 ? params.colorCount : 64;
  const traceOptions: TraceOptions = {
    colors: targetColors,
    fixedPalette: preserveSampling ? undefined : analysis.palette,
    alphaLevels: 32,
    tolerance: finerGrid
      ? params.preset === "sharp"
        ? 0.25
        : 0.6
      : params.preset === "sharp"
        ? 0.12
        : 0.25,
    fitError: finerGrid
      ? params.preset === "sharp"
        ? 0.35
        : 0.65
      : params.preset === "sharp"
        ? 0.18
        : 0.35,
    cornerAngle: 65,
    minArea: 0,
    subpixel: true,
    underpaint: false,
    // A very narrow, same-colour overlap repairs quantized mosaic seams on
    // opaque continuous-tone inputs. Never use this on transparent silhouettes.
    strokeWidth: analysis.opaque && !structured ? 0.25 : 0,
    optimize: true,
    optimizeError: finerGrid && params.preset !== "sharp" ? 0.3 : 0.18,
    precision: 3,
    background: false,
    primitives: false,
    refineIterations: 3,
  };
  onProgress?.("Tracing connected shapes and smooth curves…");
  const traceResult = trace(prepared, traceOptions);
  const rawSvg = traceResult.svg || "";

  // Extract paths in exact painter's document order (z-index)
  const rawPaths = parsePathsFromSvg(rawSvg);
  const base = analysis.palette?.[0];
  const baseHex = base
    ? `#${[base.r, base.g, base.b].map((v) => v.toString(16).padStart(2, "0")).join("")}`
    : `#${[pixelData[0], pixelData[1], pixelData[2]].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
  // Keep opaque input fully covered. For transparent art, coverage is limited
  // to an eroded, fully opaque interior; the genuine silhouette is untouched.
  const coverage = analysis.opaque
    ? `M0 0h${width}v${height}H0z`
    : structured && analysis.palette!.length > 1
      ? opaqueInteriorPath(prepared)
      : undefined;
  if (coverage && !params.removeBackground)
    rawPaths.unshift({
      d: coverage,
      fill: baseHex,
      fillRule: "evenodd",
      sourceSpace: analysis.opaque,
    });
  onProgress?.("Building editable colour layers…");

  const paletteMap = new Map<string, { count: number; hex: string }>();
  let totalNodes = 0;
  let totalPaths = 0;

  // Check if first path is a full canvas rectangle (only removed if explicitly requested)
  const hasFullBackdrop =
    rawPaths.length > 0 &&
    (rawPaths[0].d.startsWith("M0 0h") ||
      rawPaths[0].d.includes(`h${workWidth}v${workHeight}`));

  const validPaths: VectorPath[] = [];

  rawPaths.forEach((rp, idx) => {
    // If user explicitly asks to remove canvas backdrop, remove ONLY the first backdrop path
    if (params.removeBackground && idx === 0 && hasFullBackdrop) {
      return;
    }

    const nodeCount = countNodesInPath(rp.d);
    totalNodes += nodeCount;
    totalPaths++;

    const colorHex = rp.fill.toLowerCase();
    // Track palette swatches
    const existing = paletteMap.get(colorHex) || { count: 0, hex: colorHex };
    existing.count += nodeCount;
    paletteMap.set(colorHex, existing);

    const transform = rp.sourceSpace
      ? undefined
      : prepared.scaleX !== 1 || prepared.scaleY !== 1
        ? `scale(${1 / prepared.scaleX} ${1 / prepared.scaleY})`
        : undefined;
    const pathName = `Vector ${idx + 1} (${colorHex.toUpperCase()})`;

    validPaths.push({
      id: `path_${idx}`,
      name: pathName,
      transform,
      d: rp.d,
      fill: rp.fill,
      fillRule: rp.fillRule,
      opacity: rp.opacity,
      stroke: rp.stroke,
      strokeWidth: rp.strokeWidth,
      nodeCount,
      area: nodeCount * 10,
      points: extractApproxPoints(rp.d),
      curves: [],
      isClosed: true,
      visible: true,
    });
  });

  // Adjacent paths of the same colour share a named layer. Never regroup
  // non-adjacent colours: doing so can change overlap and hole rendering.
  const layers: VectorLayer[] = [];
  for (const path of validPaths) {
    let layer = layers[layers.length - 1];
    if (
      !layer ||
      layer.color !== path.fill ||
      layer.transform !== path.transform
    ) {
      layer = {
        id: `layer_${layers.length + 1}`,
        name: `Colour ${layers.length + 1} · ${path.fill.toUpperCase()}`,
        semanticRole: "main-shape",
        color: path.fill,
        colors: [path.fill],
        visible: true,
        locked: false,
        expanded: true,
        paths: [],
        transform: path.transform,
        depthRank: layers.length,
        nodeCount: 0,
      };
      layers.push(layer);
    }
    path.layerId = layer.id;
    layer.paths.push(path);
    layer.nodeCount += path.nodeCount;
  }

  // Build clean Color Palette items
  const palette: ColorPaletteItem[] = [];
  for (const [hex, item] of paletteMap.entries()) {
    const rgb = hexToRgb(hex);
    palette.push({
      hex,
      rgb,
      lab: rgbToLab(rgb),
      percentage: totalNodes > 0 ? (item.count / totalNodes) * 100 : 0,
      isBrand: isBrandColor(rgb),
    });
  }
  palette.sort((a, b) => b.percentage - a.percentage);

  // Compose final clean SVG that preserves 100% true painter's stacking order
  const finalSvg = composeSvg(
    layers,
    {
      width,
      height,
      includeMetadata: true,
      figmaCompatible: true,
    },
    { imageType, nodeCount: totalNodes, pathCount: totalPaths },
  );

  const minifiedSvg = minifySvgString(finalSvg);
  const sizeBytes = new Blob([finalSvg]).size;
  const processingTimeMs = Math.round(performance.now() - startTime);

  return {
    svg: finalSvg,
    minifiedSvg,
    layers,
    palette,
    meta: {
      imageType,
      width,
      height,
      workingWidth: workWidth,
      workingHeight: workHeight,
      upscaleFactor: Math.min(prepared.scaleX, prepared.scaleY),
      coherentColours: structured,
      layersCount: layers.length,
      pathsCount: totalPaths,
      nodesCount: totalNodes,
      sizeBytes,
      processingTimeMs,
    },
  };
}
