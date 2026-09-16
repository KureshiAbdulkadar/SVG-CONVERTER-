import { Point, ColorPaletteItem, VectorLayer, VectorPath, ImageType } from './types';
import { adaptiveSimplify, fitCurveToBeziers, beziersToSvgPath } from './curve-fitting';
import { detectPathSymmetry, snapPointsToSymmetry } from './symmetry';
import { snapPointsToGrid } from './grid-snap';
import { hexToRgb } from './perceptual-color';

interface Region {
  colorIndex: number;
  pixels: Point[];
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  area: number;
  touchesBorder: boolean;
}

// 8-connected Moore-Neighbor boundary contour tracing
function traceContour(
  mask: Uint8Array,
  width: number,
  height: number,
  startX: number,
  startY: number
): Point[] {
  const points: Point[] = [];
  const dx = [1, 1, 0, -1, -1, -1, 0, 1];
  const dy = [0, 1, 1, 1, 0, -1, -1, -1];

  let currX = startX;
  let currY = startY;
  let backDir = 4; // Direction from which we entered

  const maxSteps = width * height;
  let step = 0;

  points.push({ x: currX, y: currY });

  while (step < maxSteps) {
    let found = false;
    // Search around 8 neighbours in clockwise order
    for (let i = 0; i < 8; i++) {
      const dir = (backDir + 1 + i) % 8;
      const nextX = currX + dx[dir];
      const nextY = currY + dy[dir];

      if (nextX >= 0 && nextX < width && nextY >= 0 && nextY < height) {
        if (mask[nextY * width + nextX] === 1) {
          currX = nextX;
          currY = nextY;
          backDir = (dir + 4) % 8;
          found = true;
          break;
        }
      }
    }

    if (!found || (currX === startX && currY === startY)) {
      break;
    }

    points.push({ x: currX, y: currY });
    step++;
  }

  return points;
}

// Extract contours for a specific quantized color index
export function extractColorContours(
  quantizedIndices: Uint8Array,
  colorIndex: number,
  width: number,
  height: number,
  noiseThreshold: number
): Point[][] {
  const mask = new Uint8Array(width * height);
  let pixelCount = 0;

  for (let i = 0; i < width * height; i++) {
    if (quantizedIndices[i] === colorIndex) {
      mask[i] = 1;
      pixelCount++;
    }
  }

  if (pixelCount < noiseThreshold) {
    return [];
  }

  const contours: Point[][] = [];
  const visited = new Uint8Array(width * height);

  // Scan grid for boundary starting pixels
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (mask[idx] === 1 && visited[idx] === 0) {
        // Check if it's on an edge
        const isEdge =
          x === 0 || y === 0 || x === width - 1 || y === height - 1 ||
          mask[idx - 1] === 0 || mask[idx + 1] === 0 ||
          mask[idx - width] === 0 || mask[idx + width] === 0;

        if (isEdge) {
          const contour = traceContour(mask, width, height, x, y);
          if (contour.length >= 4) {
            // Mark contour pixels visited
            for (const p of contour) {
              visited[p.y * width + p.x] = 1;
            }
            contours.push(contour);
          }
        }
      }
    }
  }

  return contours;
}

// Assign semantic roles based on layer area, position, luminance and border coverage
export function determineSemanticRole(
  color: ColorPaletteItem,
  areaPercent: number,
  touchesBorder: boolean,
  depthIndex: number,
  totalLayers: number
): VectorLayer['semanticRole'] {
  const rgb = color.rgb;
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;

  if (touchesBorder && areaPercent > 35) {
    return 'background';
  }

  if (areaPercent > 18) {
    return 'main-shape';
  }

  if (luminance < 0.15 && areaPercent < 15) {
    return 'outline';
  }

  if (luminance > 0.85 && areaPercent < 10) {
    return 'accent';
  }

  if (areaPercent < 5) {
    return 'detail';
  }

  return depthIndex > totalLayers / 2 ? 'accent' : 'main-shape';
}

// Format human-friendly name for layers
export function formatLayerName(role: VectorLayer['semanticRole'], index: number, hex: string): string {
  const roleNames: Record<VectorLayer['semanticRole'], string> = {
    'background': 'Background Layer',
    'main-shape': `Shape Element ${index + 1}`,
    'outline': `Outline & Stroke ${index + 1}`,
    'detail': `Detail Item ${index + 1}`,
    'accent': `Accent Highlight ${index + 1}`,
    'shadow': `Shadow Fill ${index + 1}`,
  };
  return `${roleNames[role]} (${hex.toUpperCase()})`;
}

// Segment and construct vector layers from quantized image data
export function segmentAndBuildLayers(
  quantizedIndices: Uint8Array,
  palette: ColorPaletteItem[],
  width: number,
  height: number,
  options: {
    smoothness: number;
    cornerSharpness: number;
    detail: number;
    noiseRemoval: number;
    preserveSymmetry: boolean;
    gridSnap: boolean;
    gridSize: number;
    removeBackground: boolean;
    imageType: ImageType;
  }
): { layers: VectorLayer[]; totalNodes: number; totalPaths: number } {
  const totalPixels = width * height;
  const layers: VectorLayer[] = [];
  let totalNodes = 0;
  let totalPaths = 0;

  // Detect which color is likely background
  let backgroundIndex = -1;
  let maxBorderCount = 0;

  for (let c = 0; c < palette.length; c++) {
    let borderPixels = 0;
    // Check perimeter pixels
    for (let x = 0; x < width; x++) {
      if (quantizedIndices[x] === c) borderPixels++;
      if (quantizedIndices[(height - 1) * width + x] === c) borderPixels++;
    }
    for (let y = 0; y < height; y++) {
      if (quantizedIndices[y * width] === c) borderPixels++;
      if (quantizedIndices[y * width + (width - 1)] === c) borderPixels++;
    }

    if (borderPixels > maxBorderCount && borderPixels > (width + height)) {
      maxBorderCount = borderPixels;
      backgroundIndex = c;
    }
  }

  // Iterate over each palette color to extract vector paths
  for (let colorIdx = 0; colorIdx < palette.length; colorIdx++) {
    // If removeBackground is active and this color is the detected background, skip it
    if (options.removeBackground && colorIdx === backgroundIndex) {
      continue;
    }

    const colorItem = palette[colorIdx];
    const contours = extractColorContours(
      quantizedIndices,
      colorIdx,
      width,
      height,
      options.noiseRemoval || 4
    );

    if (contours.length === 0) continue;

    const layerPaths: VectorPath[] = [];
    let layerNodesCount = 0;

    for (let pIdx = 0; pIdx < contours.length; pIdx++) {
      let rawPoints = contours[pIdx];

      // 1. Adaptive Douglas-Peucker & Corner-Preserving Simplification
      let simplified = adaptiveSimplify(rawPoints, options.detail, options.cornerSharpness);

      // 2. Symmetry snap if enabled
      if (options.preserveSymmetry) {
        const sym = detectPathSymmetry(simplified, width, height);
        if (sym.hasSymmetry && sym.axis) {
          simplified = snapPointsToSymmetry(simplified, sym.axis, sym.axisPosition);
        }
      }

      // 3. Grid snap for icons if enabled
      if (options.gridSnap && options.imageType === 'icon') {
        simplified = snapPointsToGrid(simplified, options.gridSize || 16, 0.35);
      }

      // 4. Fit cubic Bezier curves
      const curves = fitCurveToBeziers(simplified, options.smoothness, options.cornerSharpness);
      const svgPathD = beziersToSvgPath(curves, true);

      if (!svgPathD) continue;

      const pathNodeCount = Math.max(3, curves.length * 3);
      layerNodesCount += pathNodeCount;
      totalNodes += pathNodeCount;
      totalPaths++;

      layerPaths.push({
        id: `path_${colorIdx}_${pIdx}`,
        d: svgPathD,
        fill: colorItem.hex,
        nodeCount: pathNodeCount,
        area: rawPoints.length,
        points: simplified,
        curves,
        isClosed: true,
      });
    }

    if (layerPaths.length === 0) continue;

    const isBg = colorIdx === backgroundIndex;
    const semanticRole = determineSemanticRole(
      colorItem,
      colorItem.percentage,
      isBg,
      colorIdx,
      palette.length
    );

    const layerId = `layer_${colorIdx}_${colorItem.hex.replace('#', '')}`;

    layers.push({
      id: layerId,
      name: formatLayerName(semanticRole, layers.length, colorItem.hex),
      semanticRole,
      color: colorItem.hex,
      visible: true,
      locked: false,
      paths: layerPaths,
      depthRank: isBg ? 0 : layers.length + 1,
      nodeCount: layerNodesCount,
    });
  }

  // Sort layers: Background first (z-index 0), then by area descending so smaller details render on top
  layers.sort((a, b) => {
    if (a.semanticRole === 'background') return -1;
    if (b.semanticRole === 'background') return 1;
    return b.paths.reduce((s, p) => s + p.area, 0) - a.paths.reduce((s, p) => s + p.area, 0);
  });

  return { layers, totalNodes, totalPaths };
}
