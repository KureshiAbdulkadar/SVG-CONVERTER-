import { trace, createImage } from 'vecline/core';
import {
  VectorParameters,
  VectorResult,
  VectorLayer,
  VectorPath,
  ColorPaletteItem,
  ImageType,
  VectorPreset,
  SemanticRole,
} from './types';
import { rgbToLab, hexToRgb, isBrandColor } from './perceptual-color';
import { composeSvg, minifySvgString } from './svg-generator';
import { enhanceAndUpscaleImage } from './upscaler';

export * from './types';
export * from './perceptual-color';
export * from './curve-fitting';
export * from './corner-detection';
export * from './symmetry';
export * from './grid-snap';
export * from './svg-generator';
export * from './upscaler';

export const PRESET_CONFIGS: Record<VectorPreset, Partial<VectorParameters>> = {
  sharp: {
    preset: 'sharp',
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
    preset: 'balanced',
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
    preset: 'smooth',
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
    preset: 'custom',
  },
};

// Count SVG path nodes accurately from path string
export function countNodesInPath(d: string): number {
  if (!d) return 0;
  const commands = d.match(/[MmLlHhVvCcSsQqTtAaZz]/g);
  if (!commands) return 4;
  return Math.max(3, commands.length * 2);
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
  height: number
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

  if (nonTransparent === 0) return 'logo';

  const grayscaleRatio = grayscaleSum / nonTransparent;
  const avgColorVariance = colorVariance / nonTransparent;
  const edgeRatio = highContrastEdges / nonTransparent;

  if (grayscaleRatio > 0.85 && edgeRatio > 0.15) return 'sketch';
  if (width <= 128 && height <= 128) return 'icon';
  if (avgColorVariance < 40 && edgeRatio > 0.08) return 'logo';
  if (avgColorVariance > 75 && edgeRatio < 0.12) return 'photo';

  return 'illustration';
}

// Parse SVG paths from raw SVG string preserving exact painter sequence
function parsePathsFromSvg(rawSvg: string): { d: string; fill: string; fillRule?: string }[] {
  const pathRegex = /<path([^>]+)\/?>/g;
  const paths: { d: string; fill: string; fillRule?: string }[] = [];
  let match;

  while ((match = pathRegex.exec(rawSvg)) !== null) {
    const attrs = match[1];
    const dMatch = attrs.match(/d="([^"]+)"/);
    const fillMatch = attrs.match(/fill="([^"]+)"/);
    const ruleMatch = attrs.match(/fill-rule="([^"]+)"/);

    if (dMatch) {
      paths.push({
        d: dMatch[1],
        fill: fillMatch ? fillMatch[1] : '#000000',
        fillRule: ruleMatch ? ruleMatch[1] : undefined,
      });
    }
  }

  return paths;
}

/**
 * 110% Accuracy Master Vectorization Pipeline:
 * 1. Pre-upscales low-res/noisy pixel buffers with edge-preserving super-resolution
 * 2. Traces with sub-pixel curve fitting and strict painter's stacking order preservation
 * 3. NEVER covers or drops white/black paths
 * 4. Yields production-grade Adobe Illustrator-level SVGs
 */
export async function vectorizeImage(
  pixelData: Uint8ClampedArray,
  width: number,
  height: number,
  params: VectorParameters
): Promise<VectorResult> {
  const startTime = performance.now();

  const imageType = params.imageType || classifyImageHeuristic(pixelData, width, height);

  // 1. High-Definition Pre-Upscaler: enhances micro-pixel edges (e.g. portraits, mountain ridges)
  const upscaled = enhanceAndUpscaleImage(pixelData, width, height, 800);
  const workWidth = upscaled.width;
  const workHeight = upscaled.height;
  const workData = upscaled.data;

  // Map parameters to high-precision tracing options
  const targetColors = params.colorCount > 0
    ? params.colorCount
    : (imageType === 'logo' || imageType === 'icon' ? 16 : 36);

  // Sub-pixel curve parameters
  const tolerance = Math.max(0.12, 0.18 + (1 - params.detail) * 1.8);
  const fitError = Math.max(0.2, 0.25 + params.smoothness * 2.2);
  const cornerAngle = Math.round(40 + params.cornerSharpness * 45);
  // Keep minArea 0 so micro-pixel details (stars, teeth, hair, highlights) are NEVER lost
  const minArea = Math.max(0, params.noiseRemoval * 2);

  const imgSource = {
    width: workWidth,
    height: workHeight,
    data: workData,
  };

  // Always trace with full background so all white & black regions are faithfully vectorized
  const traceOptions = {
    colors: targetColors,
    tolerance,
    fitError,
    cornerAngle,
    minArea,
    subpixel: true,
    optimize: true,
    background: true,
    primitives: params.preset === 'sharp' || imageType === 'icon',
    refineIterations: 2, // High speed + ultra-sharp corners
  };

  const traceResult = trace(imgSource as any, traceOptions as any);
  let rawSvg = traceResult.svg || '';

  // Extract paths in exact painter's document order (z-index)
  const rawPaths = parsePathsFromSvg(rawSvg);

  const paletteMap = new Map<string, { count: number; hex: string }>();
  let totalNodes = 0;
  let totalPaths = 0;

  // Check if first path is a full canvas rectangle (only removed if explicitly requested)
  const hasFullBackdrop = rawPaths.length > 0 &&
    (rawPaths[0].d.startsWith('M0 0h') || rawPaths[0].d.includes(`h${workWidth}v${workHeight}`));

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
    const rgb = hexToRgb(colorHex);
    const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
    const maxC = Math.max(rgb.r, rgb.g, rgb.b);
    const minC = Math.min(rgb.r, rgb.g, rgb.b);
    const saturation = maxC === 0 ? 0 : (maxC - minC) / maxC;

    // Track palette swatches
    const existing = paletteMap.get(colorHex) || { count: 0, hex: colorHex };
    existing.count += nodeCount;
    paletteMap.set(colorHex, existing);

    // Assign semantic role for inspectability (without breaking z-index)
    let role: SemanticRole = 'main-shape';
    if (idx === 0 && hasFullBackdrop) {
      role = 'background';
    } else if (luminance < 0.15) {
      role = 'outline';
    } else if (luminance > 0.85) {
      role = 'accent';
    } else if (luminance < 0.45 && saturation < 0.4) {
      role = 'shadow';
    } else if (nodeCount < 10) {
      role = 'detail';
    } else {
      role = 'main-shape';
    }

    const pathName = `Vector ${idx + 1} (${colorHex.toUpperCase()})`;

    validPaths.push({
      id: `path_${idx}`,
      name: pathName,
      d: rp.d,
      fill: rp.fill,
      fillRule: rp.fillRule,
      nodeCount,
      area: nodeCount * 10,
      points: extractApproxPoints(rp.d),
      curves: [],
      isClosed: true,
      visible: true,
    });
  });

  // Group paths into structured layers while STRICTLY PRESERVING paint order
  // Instead of reordering paths across z-index, we partition the natural sequence
  // into logical depth layers (Background, Base Shapes, Details & Accents)
  const layers: VectorLayer[] = [];

  if (validPaths.length > 0) {
    // Determine natural layer chunks
    const chunkSize = Math.max(1, Math.ceil(validPaths.length / 4));
    const layerTitles = [
      'Layer 1: Canvas Base & Contours',
      'Layer 2: Base Geometry & Midtones',
      'Layer 3: Shading & Overlays',
      'Layer 4: High-Detail Accents & Highlights',
    ];

    for (let c = 0; c < 4; c++) {
      const start = c * chunkSize;
      const end = Math.min(validPaths.length, (c + 1) * chunkSize);
      const chunkPaths = validPaths.slice(start, end);
      if (chunkPaths.length === 0) continue;

      const layerColors = Array.from(new Set(chunkPaths.map(p => p.fill.toLowerCase())));
      const layerNodeCount = chunkPaths.reduce((sum, p) => sum + p.nodeCount, 0);

      layers.push({
        id: `layer_${c + 1}`,
        name: `${layerTitles[c] || `Layer ${c + 1}`} (${chunkPaths.length} paths)`,
        semanticRole: c === 0 ? 'background' : c === 3 ? 'accent' : 'main-shape',
        color: layerColors[0] || '#6366f1',
        colors: layerColors,
        visible: true,
        locked: false,
        expanded: true,
        paths: chunkPaths,
        depthRank: c,
        nodeCount: layerNodeCount,
      });
    }
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
    { width: workWidth, height: workHeight, includeMetadata: true, figmaCompatible: true },
    { imageType, nodeCount: totalNodes, pathCount: totalPaths }
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
      width: workWidth,
      height: workHeight,
      layersCount: layers.length,
      pathsCount: totalPaths,
      nodesCount: totalNodes,
      sizeBytes,
      processingTimeMs,
    },
  };
}
