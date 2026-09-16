import { Point, VectorPath } from './types';
import { distance } from './corner-detection';

export interface SymmetryResult {
  hasSymmetry: boolean;
  axis: 'horizontal' | 'vertical' | null;
  axisPosition: number;
  error: number;
}

// Detect symmetry across bounding box center
export function detectPathSymmetry(points: Point[], width: number, height: number): SymmetryResult {
  if (points.length < 6) {
    return { hasSymmetry: false, axis: null, axisPosition: 0, error: Infinity };
  }

  // Find bounding box
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }

  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  // Test Vertical Symmetry (Mirror across X = centerX)
  let vErrorSum = 0;
  for (const p of points) {
    const mirrored: Point = { x: 2 * centerX - p.x, y: p.y };
    // Find closest point in original set
    let minDist = Infinity;
    for (const other of points) {
      const d = distance(mirrored, other);
      if (d < minDist) minDist = d;
    }
    vErrorSum += minDist;
  }
  const avgVError = vErrorSum / points.length;

  // Test Horizontal Symmetry (Mirror across Y = centerY)
  let hErrorSum = 0;
  for (const p of points) {
    const mirrored: Point = { x: p.x, y: 2 * centerY - p.y };
    let minDist = Infinity;
    for (const other of points) {
      const d = distance(mirrored, other);
      if (d < minDist) minDist = d;
    }
    hErrorSum += minDist;
  }
  const avgHError = hErrorSum / points.length;

  const threshold = Math.max(1.5, Math.min(width, height) * 0.035);

  if (avgVError < threshold && avgVError <= avgHError) {
    return { hasSymmetry: true, axis: 'vertical', axisPosition: centerX, error: avgVError };
  }

  if (avgHError < threshold) {
    return { hasSymmetry: true, axis: 'horizontal', axisPosition: centerY, error: avgHError };
  }

  return { hasSymmetry: false, axis: null, axisPosition: 0, error: Math.min(avgVError, avgHError) };
}

// Snap points to mirror symmetry
export function snapPointsToSymmetry(points: Point[], axis: 'horizontal' | 'vertical', axisPos: number): Point[] {
  const result: Point[] = [];

  for (const p of points) {
    if (axis === 'vertical') {
      const distFromAxis = Math.abs(p.x - axisPos);
      if (distFromAxis < 1.0) {
        // Snap directly onto axis
        result.push({ x: axisPos, y: p.y });
      } else {
        result.push(p);
      }
    } else {
      const distFromAxis = Math.abs(p.y - axisPos);
      if (distFromAxis < 1.0) {
        result.push({ x: p.x, y: axisPos });
      } else {
        result.push(p);
      }
    }
  }

  return result;
}
