import { RGBColor, LABColor, ColorPaletteItem } from './types';

// Convert RGB (0-255) to sRGB standard observer XYZ
export function rgbToXyz(rgb: RGBColor): { x: number; y: number; z: number } {
  let r = rgb.r / 255;
  let g = rgb.g / 255;
  let b = rgb.b / 255;

  r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
  g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
  b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

  r *= 100;
  g *= 100;
  b *= 100;

  // D65 Standard Illuminant
  const x = r * 0.4124 + g * 0.3576 + b * 0.1805;
  const y = r * 0.2126 + g * 0.7152 + b * 0.0722;
  const z = r * 0.0193 + g * 0.1192 + b * 0.9505;

  return { x, y, z };
}

// Convert XYZ to CIELAB
export function xyzToLab(xyz: { x: number; y: number; z: number }): LABColor {
  // D65 reference white
  let x = xyz.x / 95.047;
  let y = xyz.y / 100.0;
  let z = xyz.z / 108.883;

  x = x > 0.008856 ? Math.pow(x, 1 / 3) : 7.787 * x + 16 / 116;
  y = y > 0.008856 ? Math.pow(y, 1 / 3) : 7.787 * y + 16 / 116;
  z = z > 0.008856 ? Math.pow(z, 1 / 3) : 7.787 * z + 16 / 116;

  return {
    l: 116 * y - 16,
    a: 500 * (x - y),
    b: 200 * (y - z),
  };
}

export function rgbToLab(rgb: RGBColor): LABColor {
  return xyzToLab(rgbToXyz(rgb));
}

// CIELAB to XYZ
export function labToXyz(lab: LABColor): { x: number; y: number; z: number } {
  let y = (lab.l + 16) / 116;
  let x = lab.a / 500 + y;
  let z = y - lab.b / 200;

  const y3 = Math.pow(y, 3);
  const x3 = Math.pow(x, 3);
  const z3 = Math.pow(z, 3);

  y = y3 > 0.008856 ? y3 : (y - 16 / 116) / 7.787;
  x = x3 > 0.008856 ? x3 : (x - 16 / 116) / 7.787;
  z = z3 > 0.008856 ? z3 : (z - 16 / 116) / 7.787;

  return {
    x: x * 95.047,
    y: y * 100.0,
    z: z * 108.883,
  };
}

// XYZ to sRGB
export function xyzToRgb(xyz: { x: number; y: number; z: number }): RGBColor {
  const x = xyz.x / 100;
  const y = xyz.y / 100;
  const z = xyz.z / 100;

  let r = x * 3.2406 + y * -1.5372 + z * -0.4986;
  let g = x * -0.9689 + y * 1.8758 + z * 0.0415;
  let b = x * 0.0557 + y * -0.204 + z * 1.057;

  r = r > 0.0031308 ? 1.055 * Math.pow(r, 1 / 2.4) - 0.055 : 12.92 * r;
  g = g > 0.0031308 ? 1.055 * Math.pow(g, 1 / 2.4) - 0.055 : 12.92 * g;
  b = b > 0.0031308 ? 1.055 * Math.pow(b, 1 / 2.4) - 0.055 : 12.92 * b;

  return {
    r: Math.min(255, Math.max(0, Math.round(r * 255))),
    g: Math.min(255, Math.max(0, Math.round(g * 255))),
    b: Math.min(255, Math.max(0, Math.round(b * 255))),
  };
}

export function labToRgb(lab: LABColor): RGBColor {
  return xyzToRgb(labToXyz(lab));
}

export function rgbToHex(rgb: RGBColor): string {
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
}

export function hexToRgb(hex: string): RGBColor {
  const clean = hex.replace('#', '');
  if (clean.length === 3) {
    return {
      r: parseInt(clean[0] + clean[0], 16),
      g: parseInt(clean[1] + clean[1], 16),
      b: parseInt(clean[2] + clean[2], 16),
    };
  }
  return {
    r: parseInt(clean.substring(0, 2), 16) || 0,
    g: parseInt(clean.substring(2, 4), 16) || 0,
    b: parseInt(clean.substring(4, 6), 16) || 0,
  };
}

// Perceptual color distance in LAB space (CIE76 / Euclidean in LAB)
export function deltaE(c1: LABColor, c2: LABColor): number {
  const dL = c1.l - c2.l;
  const da = c1.a - c2.a;
  const db = c1.b - c2.b;
  return Math.sqrt(dL * dL + da * da + db * db);
}

// Brand color detector: checks if saturation and distinctiveness match brand identity
export function isBrandColor(rgb: RGBColor): boolean {
  const max = Math.max(rgb.r, rgb.g, rgb.b);
  const min = Math.min(rgb.r, rgb.g, rgb.b);
  const saturation = max === 0 ? 0 : (max - min) / max;
  // High saturation or distinctive corporate hues
  return saturation > 0.45 && max > 50 && min < 220;
}

// K-Means++ in Perceptual LAB Color Space
export function quantizePixelsLab(
  pixelData: Uint8ClampedArray,
  width: number,
  height: number,
  targetCount: number,
  preserveBrandColors: boolean = true
): {
  palette: ColorPaletteItem[];
  quantizedIndices: Uint8Array;
} {
  const totalPixels = width * height;
  const sampleStep = Math.max(1, Math.floor(totalPixels / 10000)); // Sample ~10,000 pixels for fast convergence
  const sampledLab: LABColor[] = [];
  const sampledRgb: RGBColor[] = [];

  for (let i = 0; i < totalPixels; i += sampleStep) {
    const idx = i * 4;
    const a = pixelData[idx + 3];
    if (a < 32) continue; // Skip transparent pixels

    const rgb: RGBColor = {
      r: pixelData[idx],
      g: pixelData[idx + 1],
      b: pixelData[idx + 2],
    };
    sampledRgb.push(rgb);
    sampledLab.push(rgbToLab(rgb));
  }

  if (sampledLab.length === 0) {
    const defaultRgb = { r: 0, g: 0, b: 0 };
    return {
      palette: [{
        hex: '#000000',
        rgb: defaultRgb,
        lab: rgbToLab(defaultRgb),
        percentage: 100,
      }],
      quantizedIndices: new Uint8Array(totalPixels),
    };
  }

  // Determine actual k
  const k = Math.min(targetCount, sampledLab.length);

  // K-Means++ Initialization
  const centroids: LABColor[] = [];
  centroids.push(sampledLab[Math.floor(Math.random() * sampledLab.length)]);

  while (centroids.length < k) {
    const distances: number[] = [];
    let sumD2 = 0;

    for (let i = 0; i < sampledLab.length; i++) {
      let minD = Infinity;
      for (const c of centroids) {
        const d = deltaE(sampledLab[i], c);
        if (d < minD) minD = d;
      }
      const d2 = minD * minD;
      distances.push(d2);
      sumD2 += d2;
    }

    if (sumD2 === 0) break;

    let r = Math.random() * sumD2;
    let chosenIndex = 0;
    for (let i = 0; i < distances.length; i++) {
      r -= distances[i];
      if (r <= 0) {
        chosenIndex = i;
        break;
      }
    }
    centroids.push(sampledLab[chosenIndex]);
  }

  // Iterative K-Means refinement in LAB space (up to 12 iterations)
  const maxIters = 12;
  const assignments = new Int32Array(sampledLab.length);

  for (let iter = 0; iter < maxIters; iter++) {
    let changed = false;

    // Assign points to nearest centroid
    for (let i = 0; i < sampledLab.length; i++) {
      const p = sampledLab[i];
      let bestCentroid = 0;
      let minD = Infinity;

      for (let j = 0; j < centroids.length; j++) {
        const d = deltaE(p, centroids[j]);
        if (d < minD) {
          minD = d;
          bestCentroid = j;
        }
      }

      if (assignments[i] !== bestCentroid) {
        assignments[i] = bestCentroid;
        changed = true;
      }
    }

    if (!changed && iter > 1) break;

    // Update centroids
    const sumL = new Float64Array(centroids.length);
    const sumA = new Float64Array(centroids.length);
    const sumB = new Float64Array(centroids.length);
    const counts = new Int32Array(centroids.length);

    for (let i = 0; i < sampledLab.length; i++) {
      const cluster = assignments[i];
      sumL[cluster] += sampledLab[i].l;
      sumA[cluster] += sampledLab[i].a;
      sumB[cluster] += sampledLab[i].b;
      counts[cluster]++;
    }

    for (let j = 0; j < centroids.length; j++) {
      if (counts[j] > 0) {
        centroids[j] = {
          l: sumL[j] / counts[j],
          a: sumA[j] / counts[j],
          b: sumB[j] / counts[j],
        };
      }
    }
  }

  // Build final palette and map full image
  const quantizedIndices = new Uint8Array(totalPixels);
  const clusterCounts = new Int32Array(centroids.length);

  for (let i = 0; i < totalPixels; i++) {
    const idx = i * 4;
    const a = pixelData[idx + 3];

    if (a < 32) {
      quantizedIndices[i] = 255; // Transparent flag
      continue;
    }

    const rgb: RGBColor = {
      r: pixelData[idx],
      g: pixelData[idx + 1],
      b: pixelData[idx + 2],
    };
    const lab = rgbToLab(rgb);

    let bestCentroid = 0;
    let minD = Infinity;

    for (let j = 0; j < centroids.length; j++) {
      const d = deltaE(lab, centroids[j]);
      if (d < minD) {
        minD = d;
        bestCentroid = j;
      }
    }

    quantizedIndices[i] = bestCentroid;
    clusterCounts[bestCentroid]++;
  }

  const validPixelCount = totalPixels - (quantizedIndices.filter(v => v === 255).length);
  const palette: ColorPaletteItem[] = [];

  for (let j = 0; j < centroids.length; j++) {
    if (clusterCounts[j] === 0 && centroids.length > 1) continue;

    const rgb = labToRgb(centroids[j]);
    const hex = rgbToHex(rgb);
    const isBrand = preserveBrandColors && isBrandColor(rgb);

    palette.push({
      hex,
      rgb,
      lab: centroids[j],
      percentage: validPixelCount > 0 ? (clusterCounts[j] / validPixelCount) * 100 : 0,
      isBrand,
    });
  }

  // Sort palette by dominance
  palette.sort((a, b) => b.percentage - a.percentage);

  return { palette, quantizedIndices };
}

// Auto-detect optimal color count by histogram peaks and Delta-E merging
export function autoDetectColorCount(
  pixelData: Uint8ClampedArray,
  width: number,
  height: number
): number {
  const totalPixels = width * height;
  const sampleStep = Math.max(1, Math.floor(totalPixels / 5000));
  const colors: Map<string, number> = new Map();

  for (let i = 0; i < totalPixels; i += sampleStep) {
    const idx = i * 4;
    if (pixelData[idx + 3] < 32) continue;

    // 5-bit color binning to reduce noise
    const r = (pixelData[idx] >> 3) << 3;
    const g = (pixelData[idx + 1] >> 3) << 3;
    const b = (pixelData[idx + 2] >> 3) << 3;
    const key = `${r},${g},${b}`;
    colors.set(key, (colors.get(key) || 0) + 1);
  }

  const totalSamples = Array.from(colors.values()).reduce((a, b) => a + b, 0);
  if (totalSamples === 0) return 4;

  // Filter significant color peaks (>0.8% of image)
  const significantColors = Array.from(colors.entries())
    .filter(([_, count]) => count / totalSamples > 0.008)
    .map(([key, count]) => {
      const [r, g, b] = key.split(',').map(Number);
      return { rgb: { r, g, b }, lab: rgbToLab({ r, g, b }), count };
    });

  // Perceptual clustering: merge colors within Delta E < 4
  const merged: typeof significantColors = [];
  for (const c of significantColors) {
    const exists = merged.some(m => deltaE(c.lab, m.lab) < 4.0);
    if (!exists) {
      merged.push(c);
    }
  }

  // Return clamped count between 2 and 32
  return Math.min(32, Math.max(2, merged.length));
}
