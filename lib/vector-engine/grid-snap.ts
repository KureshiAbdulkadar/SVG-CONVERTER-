import { Point } from './types';
import { distance } from './corner-detection';

export function snapPointsToGrid(points: Point[], gridSize: number = 8, strength: number = 0.25): Point[] {
  if (gridSize <= 0) return points;

  return points.map(p => {
    const snapX = Math.round(p.x / gridSize) * gridSize;
    const snapY = Math.round(p.y / gridSize) * gridSize;

    const dist = distance(p, { x: snapX, y: snapY });
    const maxSnapDist = gridSize * strength;

    if (dist <= maxSnapDist) {
      return { x: snapX, y: snapY };
    }

    // Also check single axis snapping (useful for crisp straight horizontal/vertical icon strokes)
    const distX = Math.abs(p.x - snapX);
    const distY = Math.abs(p.y - snapY);

    return {
      x: distX <= maxSnapDist * 0.75 ? snapX : p.x,
      y: distY <= maxSnapDist * 0.75 ? snapY : p.y,
    };
  });
}
