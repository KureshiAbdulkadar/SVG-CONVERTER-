import { Point, BezierCurve } from './types';
import { distance, detectCornerIndices } from './corner-detection';

// Perpendicular distance from point p to line segment (p1, p2)
function perpendicularDistance(p: Point, p1: Point, p2: Point): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const mag = Math.sqrt(dx * dx + dy * dy);

  if (mag === 0) return distance(p, p1);

  const u = ((p.x - p1.x) * dx + (p.y - p1.y) * dy) / (mag * mag);
  if (u < 0) return distance(p, p1);
  if (u > 1) return distance(p, p2);

  const projX = p1.x + u * dx;
  const projY = p1.y + u * dy;
  return distance(p, { x: projX, y: projY });
}

// Classic Douglas-Peucker simplification algorithm
export function douglasPeucker(points: Point[], epsilon: number): Point[] {
  if (points.length <= 2) return [...points];

  let maxDist = 0;
  let index = 0;
  const end = points.length - 1;

  for (let i = 1; i < end; i++) {
    const d = perpendicularDistance(points[i], points[0], points[end]);
    if (d > maxDist) {
      maxDist = d;
      index = i;
    }
  }

  if (maxDist > epsilon) {
    const left = douglasPeucker(points.slice(0, index + 1), epsilon);
    const right = douglasPeucker(points.slice(index), epsilon);
    return left.slice(0, left.length - 1).concat(right);
  } else {
    return [points[0], points[end]];
  }
}

// Adaptive Simplification respecting Corner Nodes
export function adaptiveSimplify(
  points: Point[],
  detailLevel: number,
  cornerSharpness: number
): Point[] {
  if (points.length <= 3) return points;

  // Detail level 0.0 (high simplification) to 1.0 (strict fidelity)
  // Epsilon ranges from 0.35px (crisp) to 3.5px (simplest)
  const epsilon = 0.35 + (1 - Math.min(1, Math.max(0, detailLevel))) * 3.15;

  // Detect sharp corners first
  const cornerIndices = detectCornerIndices(points, cornerSharpness);

  if (cornerIndices.length === 0) {
    return douglasPeucker(points, epsilon);
  }

  // Split points at corners and simplify each section independently
  const result: Point[] = [];
  const splitPoints = [0, ...cornerIndices.sort((a, b) => a - b), points.length - 1];
  const uniqueSplits = Array.from(new Set(splitPoints));

  for (let s = 0; s < uniqueSplits.length - 1; s++) {
    const startIdx = uniqueSplits[s];
    const endIdx = uniqueSplits[s + 1];
    if (endIdx <= startIdx) continue;

    const segment = points.slice(startIdx, endIdx + 1);
    const simplified = douglasPeucker(segment, epsilon);

    if (result.length === 0) {
      result.push(...simplified);
    } else {
      result.push(...simplified.slice(1));
    }
  }

  return result;
}

// Schneider's Bezier Curve Fitting implementation
function computeLeftTangent(points: Point[], end: number): Point {
  const p1 = points[end];
  const p2 = points[end + 1];
  const v = { x: p2.x - p1.x, y: p2.y - p1.y };
  const len = Math.sqrt(v.x * v.x + v.y * v.y) || 1;
  return { x: v.x / len, y: v.y / len };
}

function computeRightTangent(points: Point[], end: number): Point {
  const p1 = points[end - 1];
  const p2 = points[end];
  const v = { x: p1.x - p2.x, y: p1.y - p2.y };
  const len = Math.sqrt(v.x * v.x + v.y * v.y) || 1;
  return { x: v.x / len, y: v.y / len };
}

function computeCenterTangent(points: Point[], center: number): Point {
  const pPrev = points[center - 1];
  const pNext = points[center + 1];
  const v = { x: pNext.x - pPrev.x, y: pNext.y - pPrev.y };
  const len = Math.sqrt(v.x * v.x + v.y * v.y) || 1;
  return { x: v.x / len, y: v.y / len };
}

// Chord-length parameterization of points
function chordLengthParameterize(points: Point[], first: number, last: number): number[] {
  const u = [0];
  for (let i = first + 1; i <= last; i++) {
    u.push(u[u.length - 1] + distance(points[i], points[i - 1]));
  }
  const totalLength = u[u.length - 1] || 1;
  for (let i = 0; i < u.length; i++) {
    u[i] /= totalLength;
  }
  return u;
}

// Evaluate cubic Bezier at parameter t
function evaluateBezier(curve: BezierCurve, t: number): Point {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const mt3 = mt2 * mt;
  const t2 = t * t;
  const t3 = t2 * t;

  return {
    x: mt3 * curve.p0.x + 3 * mt2 * t * curve.c1.x + 3 * mt * t2 * curve.c2.x + t3 * curve.p1.x,
    y: mt3 * curve.p0.y + 3 * mt2 * t * curve.c1.y + 3 * mt * t2 * curve.c2.y + t3 * curve.p1.y,
  };
}

// Fit single cubic Bezier segment using least squares
function generateBezier(
  points: Point[],
  first: number,
  last: number,
  uPrime: number[],
  tHat1: Point,
  tHat2: Point
): BezierCurve {
  const p0 = points[first];
  const p1 = points[last];
  const nPts = last - first + 1;

  const c = [[0, 0], [0, 0]];
  const x = [0, 0];

  for (let i = 0; i < nPts; i++) {
    const u = uPrime[i];
    const mt = 1 - u;

    const b0 = mt * mt * mt;
    const b1 = 3 * u * mt * mt;
    const b2 = 3 * u * u * mt;
    const b3 = u * u * u;

    const a1 = { x: tHat1.x * b1, y: tHat1.y * b1 };
    const a2 = { x: tHat2.x * b2, y: tHat2.y * b2 };

    c[0][0] += a1.x * a1.x + a1.y * a1.y;
    c[0][1] += a1.x * a2.x + a1.y * a2.y;
    c[1][0] = c[0][1];
    c[1][1] += a2.x * a2.x + a2.y * a2.y;

    const pt = points[first + i];
    const tmp = {
      x: pt.x - (b0 * p0.x + b1 * p0.x + b2 * p1.x + b3 * p1.x),
      y: pt.y - (b0 * p0.y + b1 * p0.y + b2 * p1.y + b3 * p1.y),
    };

    x[0] += a1.x * tmp.x + a1.y * tmp.y;
    x[1] += a2.x * tmp.x + a2.y * tmp.y;
  }

  const det_C0_C1 = c[0][0] * c[1][1] - c[1][0] * c[0][1];
  const det_C0_X = c[0][0] * x[1] - c[1][0] * x[0];
  const det_X_C1 = x[0] * c[1][1] - x[1] * c[0][1];

  let alpha_l = det_C0_C1 === 0 ? 0 : det_X_C1 / det_C0_C1;
  let alpha_r = det_C0_C1 === 0 ? 0 : det_C0_X / det_C0_C1;

  const segLength = distance(p0, p1);
  const epsilon = 1.0e-6 * segLength;

  if (alpha_l < epsilon || alpha_r < epsilon) {
    const dist = segLength / 3.0;
    return {
      p0,
      c1: { x: p0.x + tHat1.x * dist, y: p0.y + tHat1.y * dist },
      c2: { x: p1.x + tHat2.x * dist, y: p1.y + tHat2.y * dist },
      p1,
    };
  }

  return {
    p0,
    c1: { x: p0.x + tHat1.x * alpha_l, y: p0.y + tHat1.y * alpha_l },
    c2: { x: p1.x + tHat2.x * alpha_r, y: p1.y + tHat2.y * alpha_r },
    p1,
  };
}

// Compute maximum fitting error of Bezier curve
function computeMaxError(
  points: Point[],
  first: number,
  last: number,
  curve: BezierCurve,
  u: number[]
): { maxError: number; splitPoint: number } {
  let maxError = 0;
  let splitPoint = Math.floor((last - first + 1) / 2);

  for (let i = first + 1; i < last; i++) {
    const pt = evaluateBezier(curve, u[i - first]);
    const dist = distance(points[i], pt);
    if (dist >= maxError) {
      maxError = dist;
      splitPoint = i;
    }
  }

  return { maxError, splitPoint };
}

// Recursive Schneider curve fitting
function fitCubic(
  points: Point[],
  first: number,
  last: number,
  tHat1: Point,
  tHat2: Point,
  errorTolerance: number,
  curves: BezierCurve[]
): void {
  const nPts = last - first + 1;

  if (nPts === 2) {
    const dist = distance(points[first], points[last]) / 3.0;
    curves.push({
      p0: points[first],
      c1: { x: points[first].x + tHat1.x * dist, y: points[first].y + tHat1.y * dist },
      c2: { x: points[last].x + tHat2.x * dist, y: points[last].y + tHat2.y * dist },
      p1: points[last],
    });
    return;
  }

  const u = chordLengthParameterize(points, first, last);
  const curve = generateBezier(points, first, last, u, tHat1, tHat2);
  const { maxError, splitPoint } = computeMaxError(points, first, last, curve, u);

  if (maxError < errorTolerance) {
    curves.push(curve);
    return;
  }

  // If error is too large, split at maxError point
  const tHatCenter = computeCenterTangent(points, splitPoint);
  const negTHatCenter = { x: -tHatCenter.x, y: -tHatCenter.y };

  fitCubic(points, first, splitPoint, tHat1, tHatCenter, errorTolerance, curves);
  fitCubic(points, splitPoint, last, negTHatCenter, tHat2, errorTolerance, curves);
}

// Fit smooth cubic Bezier curves to a polyline
export function fitCurveToBeziers(
  points: Point[],
  smoothness: number = 0.5,
  cornerSharpness: number = 0.7
): BezierCurve[] {
  if (points.length < 2) return [];

  if (points.length === 2) {
    const dist = distance(points[0], points[1]) / 3;
    return [{
      p0: points[0],
      c1: { x: points[0].x + dist, y: points[0].y },
      c2: { x: points[1].x - dist, y: points[1].y },
      p1: points[1],
    }];
  }

  // Error tolerance: high smoothness = allow more fitting leeway (smoother curves)
  // Low smoothness = tight tolerance (follows exact pixels)
  const errorTolerance = 0.5 + smoothness * 2.5;

  const curves: BezierCurve[] = [];
  const tHat1 = computeLeftTangent(points, 0);
  const tHat2 = computeRightTangent(points, points.length - 1);

  fitCubic(points, 0, points.length - 1, tHat1, tHat2, errorTolerance, curves);
  return curves;
}

// Convert Bezier curves to an optimized SVG path `d` attribute string
export function beziersToSvgPath(curves: BezierCurve[], isClosed: boolean = true): string {
  if (curves.length === 0) return '';

  const round = (n: number) => Math.round(n * 100) / 100;

  let d = `M ${round(curves[0].p0.x)} ${round(curves[0].p0.y)}`;

  for (const c of curves) {
    d += ` C ${round(c.c1.x)} ${round(c.c1.y)}, ${round(c.c2.x)} ${round(c.c2.y)}, ${round(c.p1.x)} ${round(c.p1.y)}`;
  }

  if (isClosed) {
    d += ' Z';
  }

  return d;
}

// Fallback polyline to SVG path string
export function polylineToSvgPath(points: Point[], isClosed: boolean = true): string {
  if (points.length === 0) return '';
  const round = (n: number) => Math.round(n * 10) / 10;
  let d = `M ${round(points[0].x)} ${round(points[0].y)}`;
  for (let i = 1; i < points.length; i++) {
    d += ` L ${round(points[i].x)} ${round(points[i].y)}`;
  }
  if (isClosed) d += ' Z';
  return d;
}
