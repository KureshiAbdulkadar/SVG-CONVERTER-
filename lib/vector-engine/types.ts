export type ImageType = 'logo' | 'photo' | 'icon' | 'sketch' | 'illustration';

export type VectorPreset = 'sharp' | 'balanced' | 'smooth' | 'custom';

export type SemanticRole =
  | 'background'
  | 'main-shape'
  | 'shadow'
  | 'outline'
  | 'detail'
  | 'accent';

export interface VectorParameters {
  preset: VectorPreset;
  imageType: ImageType;
  colorCount: number; // 0 = auto, 2-64
  preserveBrandColors: boolean;
  smoothness: number; // 0.0 - 1.0
  cornerSharpness: number; // 0.0 - 1.0
  detail: number; // 0.0 - 1.0
  noiseRemoval: number; // 0 - 50 px area threshold
  preserveSymmetry: boolean;
  gridSnap: boolean;
  gridSize: number;
  removeBackground: boolean;
  mergeSimilarPaths: boolean;
  fillOverlap: boolean;
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
  name?: string;
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
  visible?: boolean;
}

export interface VectorLayer {
  id: string;
  name: string;
  semanticRole: SemanticRole;
  color: string;
  colors?: string[]; // Multiple swatches in this group
  visible: boolean;
  locked: boolean;
  expanded?: boolean;
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
