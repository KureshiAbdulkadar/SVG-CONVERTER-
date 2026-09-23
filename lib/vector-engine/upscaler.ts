/**
 * High-Definition Image Pre-Processor & Edge-Preserving Super-Resolution Upscaler
 * 
 * Upscales low-resolution or micro-pixelated images (e.g. portraits, mountain landscapes,
 * fine line art) before vectorization. Uses multi-stage bicubic supersampling and an
 * unsharp-mask edge contrast kernel to reveal sub-pixel contours so the vector engine
 * fits ultra-smooth Bézier curves instead of stair-stepped pixel blocks.
 */

export interface UpscaleResult {
  data: Uint8ClampedArray;
  width: number;
  height: number;
  scaleFactor: number;
}

/**
 * Upscale image buffer if it's below optimal vectorization resolution,
 * applying edge-preserving unsharp contrast enhancement.
 */
export function enhanceAndUpscaleImage(
  pixelData: Uint8ClampedArray,
  width: number,
  height: number,
  targetMinDimension: number = 800
): UpscaleResult {
  // If already high-res, apply subtle edge enhancement without resizing
  const currentMax = Math.max(width, height);
  if (currentMax >= 1600) {
    const enhanced = applyUnsharpMask(pixelData, width, height, 0.35);
    return { data: enhanced, width, height, scaleFactor: 1 };
  }

  // Calculate integer or fractional scale factor (2x or 3x)
  let scale = 1;
  if (currentMax < 350) {
    scale = 3;
  } else if (currentMax < targetMinDimension) {
    scale = 2;
  } else if (currentMax < 1000) {
    scale = 1.5;
  } else {
    // Already good resolution, just enhance edges
    const enhanced = applyUnsharpMask(pixelData, width, height, 0.4);
    return { data: enhanced, width, height, scaleFactor: 1 };
  }

  const newWidth = Math.round(width * scale);
  const newHeight = Math.round(height * scale);

  // High-precision bicubic interpolation
  const upscaled = bicubicInterpolate(pixelData, width, height, newWidth, newHeight);

  // Apply edge contrast enhancement so vectorizer detects razor-sharp contours
  const finalEnhanced = applyUnsharpMask(upscaled, newWidth, newHeight, 0.55);

  return {
    data: finalEnhanced,
    width: newWidth,
    height: newHeight,
    scaleFactor: scale,
  };
}

/**
 * High-quality Bicubic Resampling Algorithm
 */
function bicubicInterpolate(
  src: Uint8ClampedArray,
  srcW: number,
  srcH: number,
  dstW: number,
  dstH: number
): Uint8ClampedArray {
  const dst = new Uint8ClampedArray(dstW * dstH * 4);
  const xRatio = srcW / dstW;
  const yRatio = srcH / dstH;

  const cubicWeight = (x: number): number => {
    const a = -0.5; // Catmull-Rom spline parameter for sharp edges
    const absX = Math.abs(x);
    if (absX <= 1) {
      return (a + 2) * Math.pow(absX, 3) - (a + 3) * Math.pow(absX, 2) + 1;
    } else if (absX < 2) {
      return a * Math.pow(absX, 3) - 5 * a * Math.pow(absX, 2) + 8 * a * absX - 4 * a;
    }
    return 0;
  };

  const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

  for (let dy = 0; dy < dstH; dy++) {
    const sy = dy * yRatio;
    const iy = Math.floor(sy);
    const dyFrac = sy - iy;

    for (let dx = 0; dx < dstW; dx++) {
      const sx = dx * xRatio;
      const ix = Math.floor(sx);
      const dxFrac = sx - ix;

      let rSum = 0;
      let gSum = 0;
      let bSum = 0;
      let aSum = 0;
      let wSum = 0;

      for (let m = -1; m <= 2; m++) {
        const py = clamp(iy + m, 0, srcH - 1);
        const yWeight = cubicWeight(m - dyFrac);

        for (let n = -1; n <= 2; n++) {
          const px = clamp(ix + n, 0, srcW - 1);
          const xWeight = cubicWeight(n - dxFrac);
          const weight = yWeight * xWeight;

          const srcIdx = (py * srcW + px) * 4;
          rSum += src[srcIdx] * weight;
          gSum += src[srcIdx + 1] * weight;
          bSum += src[srcIdx + 2] * weight;
          aSum += src[srcIdx + 3] * weight;
          wSum += weight;
        }
      }

      const dstIdx = (dy * dstW + dx) * 4;
      const norm = wSum !== 0 ? 1 / wSum : 1;
      dst[dstIdx] = clamp(Math.round(rSum * norm), 0, 255);
      dst[dstIdx + 1] = clamp(Math.round(gSum * norm), 0, 255);
      dst[dstIdx + 2] = clamp(Math.round(bSum * norm), 0, 255);
      dst[dstIdx + 3] = clamp(Math.round(aSum * norm), 0, 255);
    }
  }

  return dst;
}

/**
 * Edge-Preserving Unsharp Mask Kernel
 * Sharpens micro-details like hair, eyes, mountain crests, and text edges
 * without introducing chromatic ringing.
 */
function applyUnsharpMask(
  src: Uint8ClampedArray,
  width: number,
  height: number,
  amount: number = 0.5
): Uint8ClampedArray {
  const dst = new Uint8ClampedArray(src.length);
  const totalPixels = width * height;

  // 3x3 Gaussian blur approximation for luminance difference mask
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const alpha = src[idx + 3];

      // Skip fully transparent pixels
      if (alpha === 0) {
        dst[idx] = 0;
        dst[idx + 1] = 0;
        dst[idx + 2] = 0;
        dst[idx + 3] = 0;
        continue;
      }

      let rBlur = 0;
      let gBlur = 0;
      let bBlur = 0;
      let count = 0;

      for (let dy = -1; dy <= 1; dy++) {
        const ny = y + dy;
        if (ny < 0 || ny >= height) continue;

        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          if (nx < 0 || nx >= width) continue;

          const nIdx = (ny * width + nx) * 4;
          const w = (dx === 0 && dy === 0) ? 4 : (dx === 0 || dy === 0) ? 2 : 1;
          rBlur += src[nIdx] * w;
          gBlur += src[nIdx + 1] * w;
          bBlur += src[nIdx + 2] * w;
          count += w;
        }
      }

      rBlur /= count;
      gBlur /= count;
      bBlur /= count;

      // Unsharp calculation: original + amount * (original - blur)
      const rOrig = src[idx];
      const gOrig = src[idx + 1];
      const bOrig = src[idx + 2];

      const rDiff = rOrig - rBlur;
      const gDiff = gOrig - gBlur;
      const bDiff = bOrig - bBlur;

      // Thresholding to preserve flat areas while sharpening high-frequency edges
      const edgeMag = Math.abs(rDiff) + Math.abs(gDiff) + Math.abs(bDiff);
      const effectiveAmount = edgeMag > 8 ? amount : amount * 0.3;

      dst[idx] = Math.max(0, Math.min(255, Math.round(rOrig + rDiff * effectiveAmount)));
      dst[idx + 1] = Math.max(0, Math.min(255, Math.round(gOrig + gDiff * effectiveAmount)));
      dst[idx + 2] = Math.max(0, Math.min(255, Math.round(bOrig + bDiff * effectiveAmount)));
      dst[idx + 3] = alpha;
    }
  }

  return dst;
}
