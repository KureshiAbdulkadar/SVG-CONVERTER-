export type ImageType = 'logo' | 'photo' | 'icon' | 'sketch' | 'illustration';

export type VectorPreset = 'sharp' | 'balanced' | 'smooth' | 'custom';

export interface VectorParameters {
  preset: VectorPreset;
  imageType: ImageType;
  colorCount: number; // 0 = auto, 2-64
  preserveBrandColors: boolean;
  smoothness: number; // 0.0 - 1.0
  cornerSharpness: number; // 0.0 - 1.0 (higher = keeps sharp corners)
  detail: number; // 0.0 - 1.0 (Douglas-Peucker epsilon sensitivity)
  noiseRemoval: number; // 0 - 50 px area threshold
  preserveSymmetry: boolean;
  gridSnap: boolean;
  gridSize: number; // 8, 16, 24, 32
  removeBackground: boolean;
  mergeSimilarPaths: boolean;
  fillOverlap: boolean; // slightly expands paths to eliminate subpixel gaps
}

export interface RGBColor {
  r: number;
  g: number;
  b: number;
  a?: number;
}

export interface LABColor {
  l: number;
  a: number;
  b: number;
}

export interface ColorPaletteItem {
  hex: string;
  rgb: RGBColor;
  lab: LABColor;
  percentage: number;
  isBrand?: boolean;
}

export interface Point {
  x: number;
  y: number;
}

export interface BezierCurve {
  p0: Point;
  c1: Point;
  c2: Point;
  p1: Point;
}

export interface VectorPath {
  id: string;
  d: string;
  fill: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  nodeCount: number;
  area: number;
  points: Point[];
  curves: BezierCurve[];
  isClosed: boolean;
  layerId?: string;
}

export interface VectorLayer {
  id: string;
  name: string;
  semanticRole: 'background' | 'main-shape' | 'detail' | 'accent' | 'outline' | 'shadow';
  color: string;
  visible: boolean;
  locked: boolean;
  paths: VectorPath[];
  depthRank: number; // 0 = back, N = front
  nodeCount: number;
}

export interface VectorResult {
  svg: string;
  minifiedSvg: string;
  layers: VectorLayer[];
  palette: ColorPaletteItem[];
  meta: {
    imageType: ImageType;
    width: number;
    height: number;
    layersCount: number;
    pathsCount: number;
    nodesCount: number;
    sizeBytes: number;
    processingTimeMs: number;
    symmetryDetected?: { axis: 'horizontal' | 'vertical'; error: number };
  };
}

export type ExportFormat = 'svg' | 'svg-min' | 'figma-svg' | 'pdf' | 'eps' | 'dxf' | 'png-2x';
