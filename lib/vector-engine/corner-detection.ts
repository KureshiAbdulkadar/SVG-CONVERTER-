import { Point } from './types';

// Calculate Euclidean distance between two points
export function distance(p1: Point, p2: Point): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

// Calculate angle between vectors in degrees (0 to 180)
export function angleBetweenVectors(v1: Point, v2: Point): number {
  const dot = v1.x * v2.x + v1.y * v2.y;
  const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
  const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);

  if (mag1 === 0 || mag2 === 0) return 0;
  const cos = Math.min(1, Math.max(-1, dot / (mag1 * mag2)));
  return (Math.acos(cos) * 180) / Math.PI;
}

// Detect indices in the polyline where corner angle exceeds threshold
// sharpness: 0.0 (detect only very acute angles) to 1.0 (detect subtle corners)
export function detectCornerIndices(points: Point[], sharpness: number = 0.7): number[] {
  if (points.length < 3) return [];

  // Map sharpness to angular deviation threshold (e.g. 15 deg to 75 deg)
  const angleThreshold = 75 - sharpness * 50;
  const cornerIndices: number[] = [];
  const n = points.length;

  // Window stride to smooth pixel quantization noise on diagonal edges
  const stride = Math.max(1, Math.min(3, Math.floor(n / 20)));

  for (let i = 0; i < n; i++) {
    const prevIdx = (i - stride + n) % n;
    const nextIdx = (i + stride) % n;

    const pPrev = points[prevIdx];
    const pCurr = points[i];
    const pNext = points[nextIdx];

    const v1: Point = { x: pCurr.x - pPrev.x, y: pCurr.y - pPrev.y };
    const v2: Point = { x: pNext.x - pCurr.x, y: pNext.y - pCurr.y };

    const angle = angleBetweenVectors(v1, v2);

    if (angle >= angleThreshold) {
      // Check if this point is a local peak in curvature
      const prevPrevIdx = (i - stride * 2 + n) % n;
      const nextNextIdx = (i + stride * 2) % n;

      const vPrev: Point = { x: pPrev.x - points[prevPrevIdx].x, y: pPrev.y - points[prevPrevIdx].y };
      const vNext: Point = { x: points[nextNextIdx].x - pNext.x, y: points[nextNextIdx].y - pNext.y };

      const angleBefore = angleBetweenVectors(vPrev, v1);
      const angleAfter = angleBetweenVectors(v2, vNext);

      if (angle >= angleBefore && angle >= angleAfter) {
        cornerIndices.push(i);
      }
    }
  }

  // Deduplicate adjacent corner detections
  const filtered: number[] = [];
  for (let i = 0; i < cornerIndices.length; i++) {
    const current = cornerIndices[i];
    const prev = filtered[filtered.length - 1];

    if (prev === undefined || Math.abs(current - prev) > stride) {
      filtered.push(current);
    }
  }

  return filtered;
}
