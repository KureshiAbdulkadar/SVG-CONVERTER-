import {
  vectorizeExactContours,
  type RasterImage,
  type Rgba,
} from "vecline/core";

export interface ArtworkAnalysis {
  palette?: Rgba[];
  translucent: boolean;
  opaque: boolean;
  preserveFineMarks?: boolean;
}
const unpack = (key: number): Rgba => ({
  r: key >>> 16,
  g: (key >>> 8) & 255,
  b: key & 255,
  a: 255,
});
const keyAt = (d: Uint8ClampedArray, i: number) =>
  (d[i] << 16) | (d[i + 1] << 8) | d[i + 2];
const distance = (a: Rgba, b: Rgba) =>
  Math.max(Math.abs(a.r - b.r), Math.abs(a.g - b.g), Math.abs(a.b - b.b));

/** Find real inks on flat artwork before interpolation introduces blend colours.
 * A colour needs local evidence: a flat patch, or a small mark that is NOT a
 * blend sitting between two locally neighbouring inks. Photographic/gradient
 * input with too many unexplained colours keeps the general-purpose quantizer.
 */
export function analyseArtwork(
  source: RasterImage,
  limit = 24,
): ArtworkAnalysis {
  const { data: d, width: w, height: h } = source;
  const histogram = new Map<
    number,
    { count: number; stable: number; positions: number[] }
  >();
  let translucent = false,
    opaque = true,
    visible = 0,
    maxAlpha = 0,
    histogramCapped = false;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4,
        a = d[i + 3];
      if (a !== 255) opaque = false;
      maxAlpha = Math.max(maxAlpha, a);
      if (a < 32) continue;
      visible++;
      // A 2x2 translucent plateau is genuine transparency, not a one-pixel
      // antialiasing fringe. Isolated translucent marks must survive as well.
      if (a < 248 && a > 7) {
        if (x + 1 < w && y + 1 < h) {
          const alphas = [
            a,
            d[i + 7],
            d[i + w * 4 + 3],
            d[i + (w + 1) * 4 + 3],
          ];
          if (
            Math.min(...alphas) > 7 &&
            Math.max(...alphas) < 248 &&
            Math.max(...alphas) === Math.min(...alphas)
          )
            translucent = true;
        }
        let isolated = true;
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            if (
              (dx === 0 && dy === 0) ||
              x + dx < 0 ||
              x + dx >= w ||
              y + dy < 0 ||
              y + dy >= h
            )
              continue;
            if (d[((y + dy) * w + x + dx) * 4 + 3] > 0) isolated = false;
          }
        if (isolated) translucent = true;
      }
      if (a < 200 || histogramCapped) continue;
      const key = keyAt(d, i);
      let entry = histogram.get(key);
      if (!entry) {
        entry = { count: 0, stable: 0, positions: [] };
        histogram.set(key, entry);
      }
      entry.count++;
      if (entry.positions.length < 8) entry.positions.push(i);
      if (x > 0 && y > 0 && x + 1 < w && y + 1 < h) {
        const rgb = unpack(key);
        let stable = true;
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            const j = ((y + dy) * w + x + dx) * 4;
            if (d[j + 3] < 200 || distance(rgb, unpack(keyAt(d, j))) > 3)
              stable = false;
          }
        if (stable) entry.stable++;
      }
      if (histogram.size > 8192) histogramCapped = true;
    }
  if (maxAlpha > 0 && maxAlpha < 248) translucent = true;
  if (histogramCapped) return { translucent, opaque };
  if (!visible || !histogram.size) return { translucent, opaque };
  const entries = [...histogram.entries()].sort(
    (a, b) => b[1].stable - a[1].stable || b[1].count - a[1].count,
  );
  const palette: Rgba[] = [];
  for (const [key, entry] of entries) {
    if (entry.stable < 2) continue;
    const rgb = unpack(key);
    if (palette.every((c) => distance(c, rgb) > 4)) palette.push(rgb);
    if (palette.length > limit) return { translucent, opaque };
  }
  if (!palette.length) palette.push(unpack(entries[0][0]));
  const neighboursContain = (i: number, a: Rgba, b: Rgba) => {
    const x = (i / 4) % w,
      y = Math.floor(i / 4 / w);
    let hasA = false,
      hasB = false;
    for (let dy = -4; dy <= 4; dy++)
      for (let dx = -4; dx <= 4; dx++) {
        if (x + dx < 0 || x + dx >= w || y + dy < 0 || y + dy >= h) continue;
        const j = ((y + dy) * w + x + dx) * 4;
        if (d[j + 3] < 200) continue;
        const c = unpack(keyAt(d, j));
        if (distance(c, a) <= 5) hasA = true;
        if (distance(c, b) <= 5) hasB = true;
        if (hasA && hasB) return true;
      }
    return hasA && hasB;
  };
  for (const [key, entry] of entries) {
    const rgb = unpack(key);
    if (palette.some((c) => distance(c, rgb) <= 4)) continue;
    // A single-pixel mark inside a uniform field is content, even if its shade
    // happens to lie between two unrelated inks elsewhere in the artwork.
    const isolatedMark = entry.positions.some((i) => {
      const x = (i / 4) % w,
        y = Math.floor(i / 4 / w);
      const ns = [
        x > 0 ? i - 4 : -1,
        x + 1 < w ? i + 4 : -1,
        y > 0 ? i - w * 4 : -1,
        y + 1 < h ? i + w * 4 : -1,
      ].filter((j) => j >= 0);
      return (
        ns.length > 0 &&
        palette.some((ink) =>
          ns.every(
            (j) => d[j + 3] >= 200 && distance(ink, unpack(keyAt(d, j))) <= 5,
          ),
        )
      );
    });
    if (isolatedMark) {
      palette.push(rgb);
      if (palette.length > limit) return { translucent, opaque };
      continue;
    }

    const blendPairs: [Rgba, Rgba][] = [];
    for (let a = 0; a < palette.length; a++)
      for (let b = a + 1; b < palette.length; b++) {
        const p = palette[a],
          q = palette[b],
          v = [q.r - p.r, q.g - p.g, q.b - p.b],
          r = [rgb.r - p.r, rgb.g - p.g, rgb.b - p.b];
        const len = v.reduce((s, n) => s + n * n, 0);
        if (!len) continue;
        const t = r.reduce((s, n, i) => s + n * v[i], 0) / len;
        if (t <= 0 || t >= 1) continue;
        if (Math.max(...r.map((n, i) => Math.abs(n - t * v[i]))) <= 6)
          blendPairs.push([p, q]);
      }
    if (
      entry.positions.every((i) =>
        blendPairs.some((pair) => neighboursContain(i, ...pair)),
      )
    )
      continue;
    // A small accent is retained even when it occupies only one source pixel.
    palette.push(rgb);
    if (palette.length > limit) return { translucent, opaque };
  }
  return {
    palette,
    translucent,
    opaque,
    preserveFineMarks:
      opaque && palette.length <= 8 && hasFineComponents(source, palette[0]),
  };
}

/** Protect collections of small disconnected marks (for example lettering).
 * Enlarging and reducing their antialiased shades can thicken stems or close
 * counters. This is a geometry guard, not OCR or an inferred font identity.
 */
function hasFineComponents(source: RasterImage, background: Rgba): boolean {
  const { data, width: w, height: h } = source;
  const mask = new Uint8Array(w * h);
  for (let i = 0; i < mask.length; i++) {
    const j = i * 4;
    if (
      Math.max(
        Math.abs(data[j] - background.r),
        Math.abs(data[j + 1] - background.g),
        Math.abs(data[j + 2] - background.b),
      ) > 80
    )
      mask[i] = 1;
  }
  const queue = new Int32Array(mask.length);
  let small = 0;
  for (let start = 0; start < mask.length; start++) {
    if (!mask[start]) continue;
    let head = 0,
      tail = 1,
      minX = w,
      maxX = 0,
      minY = h,
      maxY = 0;
    queue[0] = start;
    mask[start] = 0;
    while (head < tail) {
      const i = queue[head++],
        x = i % w,
        y = Math.floor(i / w);
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          if (x + dx < 0 || x + dx >= w || y + dy < 0 || y + dy >= h) continue;
          const j = (y + dy) * w + x + dx;
          if (mask[j]) {
            mask[j] = 0;
            queue[tail++] = j;
          }
        }
    }
    if (
      tail <= w * h * 0.08 &&
      Math.max(maxX - minX + 1, maxY - minY + 1) <= Math.min(w, h) * 0.4
    )
      small++;
    if (small >= 6) return true;
  }
  return false;
}

export interface PreparedImage extends RasterImage {
  scaleX: number;
  scaleY: number;
}
/** Bounded, pixel-centred, premultiplied-alpha interpolation. The convex
 * kernel cannot ring or invent overshoot colours. Hidden RGB in transparent
 * pixels contributes zero, so dark/bright halos cannot bleed into an edge.
 */
export function upscaleForTracing(
  source: RasterImage,
  requestedScale?: number,
): PreparedImage {
  const { data: src, width: w, height: h } = source;
  if (
    !Number.isSafeInteger(w) ||
    !Number.isSafeInteger(h) ||
    w < 1 ||
    h < 1 ||
    src.length !== w * h * 4 ||
    w * h > 4_000_000 ||
    w > 8192 ||
    h > 8192
  )
    throw new Error("Invalid RGBA image dimensions");
  const desired =
    requestedScale ??
    (Math.max(w, h) <= 512 ? 4 : Math.max(w, h) <= 1024 ? 2 : 1);
  if (!Number.isFinite(desired) || desired < 1)
    throw new Error("Invalid upscaling factor");
  const scale = Math.max(
    1,
    Math.min(desired, 4, Math.sqrt(4_000_000 / (w * h)), 4096 / Math.max(w, h)),
  );
  const width = Math.max(w, Math.floor(w * scale)),
    height = Math.max(h, Math.floor(h * scale));
  if (width === w && height === h) return { ...source, scaleX: 1, scaleY: 1 };
  const data = new Uint8ClampedArray(width * height * 4);
  const x0 = new Int32Array(width),
    x1 = new Int32Array(width),
    tx = new Float64Array(width);
  for (let x = 0; x < width; x++) {
    const sx = ((x + 0.5) * w) / width - 0.5,
      ix = Math.floor(sx);
    x0[x] = Math.max(0, ix);
    x1[x] = Math.min(w - 1, ix + 1);
    tx[x] = sx - ix;
  }
  for (let y = 0; y < height; y++) {
    const sy = ((y + 0.5) * h) / height - 0.5,
      iy = Math.floor(sy),
      y0 = Math.max(0, iy),
      y1 = Math.min(h - 1, iy + 1),
      ty = sy - iy;
    for (let x = 0; x < width; x++) {
      const i00 = (y0 * w + x0[x]) * 4,
        i10 = (y0 * w + x1[x]) * 4,
        i01 = (y1 * w + x0[x]) * 4,
        i11 = (y1 * w + x1[x]) * 4;
      const aw00 = src[i00 + 3] * (1 - tx[x]) * (1 - ty),
        aw10 = src[i10 + 3] * tx[x] * (1 - ty),
        aw01 = src[i01 + 3] * (1 - tx[x]) * ty,
        aw11 = src[i11 + 3] * tx[x] * ty;
      const alpha = aw00 + aw10 + aw01 + aw11,
        j = (y * width + x) * 4;
      data[j + 3] = Math.round(alpha);
      if (alpha > 0)
        for (let c = 0; c < 3; c++)
          data[j + c] = Math.round(
            (src[i00 + c] * aw00 +
              src[i10 + c] * aw10 +
              src[i01 + c] * aw01 +
              src[i11 + c] * aw11) /
              alpha,
          );
    }
  }
  return { data, width, height, scaleX: width / w, scaleY: height / h };
}

/** Interior-only coverage: erode the fully opaque source by one pixel. This
 * closes interior colour seams without doubling antialiasing on the outer edge
 * or painting beneath a translucent region. Holes remain outside the mask.
 */
export function opaqueInteriorPath(source: RasterImage): string | undefined {
  const { data, width: w, height: h } = source;
  const mask = new Uint8ClampedArray(data.length);
  let count = 0;
  for (let y = 1; y < h - 1; y++)
    for (let x = 1; x < w - 1; x++) {
      let solid = true;
      for (let dy = -1; dy <= 1 && solid; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          if (data[((y + dy) * w + x + dx) * 4 + 3] !== 255) {
            solid = false;
            break;
          }
        }
      if (solid) {
        mask[(y * w + x) * 4 + 3] = 255;
        count++;
      }
    }
  if (!count) return undefined;
  const svg = vectorizeExactContours(
    { data: mask, width: w, height: h },
    { maxRegions: 100_000 },
  ).svg;
  return [...svg.matchAll(/<path\b[^>]*\bd="([^"]+)"/g)]
    .map((m) => m[1])
    .join("");
}
