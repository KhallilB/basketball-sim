export const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
export const z = (r: number) => (r - 50) / 12;
export const logistic = (s: number) => 1 / (1 + Math.exp(-s));
export function softmax(xs: number[], T = 1) {
  const m = Math.max(...xs);
  const ex = xs.map(v => Math.exp((v - m) / T));
  const s = ex.reduce((a, b) => a + b, 0);
  return ex.map(v => v / s);
}

// Court geometry utilities
import type { Position } from '@basketball-sim/types';

// NBA court dimensions (in feet)
export const COURT = {
  LENGTH: 94,
  WIDTH: 50,
  THREE_POINT_LINE: 23.75,  // Distance from center of basket
  FREE_THROW_LINE: 15,      // Distance from backboard
  PAINT_WIDTH: 16,          // Width of paint/lane
  BASKET_HEIGHT: 10,        // Height of rim
  BASKETS: {
    HOME: { x: 5.25, y: 25 },      // Home basket position
    AWAY: { x: 88.75, y: 25 }      // Away basket position  
  }
} as const;

// Predefined court zones
export const ZONES = {
  // Offensive zones (relative to attacking basket)
  PAINT: { minX: 0, maxX: 19, minY: 17, maxY: 33 },
  LEFT_WING: { minX: 20, maxX: 35, minY: 0, maxY: 20 },
  RIGHT_WING: { minX: 20, maxX: 35, minY: 30, maxY: 50 },
  TOP_OF_KEY: { minX: 20, maxX: 35, minY: 20, maxY: 30 },
  LEFT_CORNER: { minX: 0, maxX: 14, minY: 0, maxY: 17 },
  RIGHT_CORNER: { minX: 0, maxX: 14, minY: 33, maxY: 50 },
  BACKCOURT: { minX: 47, maxX: 94, minY: 0, maxY: 50 }
} as const;

/**
 * Calculate distance between two positions
 */
export function distance(p1: Position, p2: Position): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate distance from position to nearest basket
 */
export function distanceToBasket(pos: Position, isOffense: boolean): number {
  const basket = isOffense ? COURT.BASKETS.HOME : COURT.BASKETS.AWAY;
  return distance(pos, basket);
}

/**
 * Check if position is within three-point line
 */
export function isInsideThreePoint(pos: Position, isOffense: boolean): boolean {
  const basket = isOffense ? COURT.BASKETS.HOME : COURT.BASKETS.AWAY;
  const dist = distance(pos, basket);
  
  // Special handling for corners (shorter three-point line)
  if (pos.y <= 14 || pos.y >= 36) {
    return dist <= 22; // Corner three is 22 feet
  }
  
  return dist <= COURT.THREE_POINT_LINE;
}

/**
 * Check if position is in the paint/lane area
 */
export function isInPaint(pos: Position, isOffense: boolean): boolean {
  if (isOffense) {
    return pos.x <= 19 && pos.y >= 17 && pos.y <= 33;
  } else {
    return pos.x >= 75 && pos.y >= 17 && pos.y <= 33;
  }
}

/**
 * Calculate angle between two positions (in radians)
 */
export function angle(from: Position, to: Position): number {
  return Math.atan2(to.y - from.y, to.x - from.x);
}

/**
 * Get shot zone based on position
 */
export function getShotZone(pos: Position, isOffense: boolean): 'rim' | 'mid' | 'three' {
  const distToBasket = distanceToBasket(pos, isOffense);
  
  if (distToBasket <= 5) return 'rim';
  if (isInsideThreePoint(pos, isOffense)) return 'mid';
  return 'three';
}

/**
 * Calculate spacing quality (how well players are spread out)
 * Returns 0-1, where 1 = perfect spacing
 */
export function calculateSpacing(positions: Position[]): number {
  if (positions.length < 2) return 1;
  
  let totalDistance = 0;
  let pairs = 0;
  
  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      totalDistance += distance(positions[i], positions[j]);
      pairs++;
    }
  }
  
  const avgDistance = totalDistance / pairs;
  const idealDistance = 15; // Ideal spacing of 15 feet between players
  
  // Convert to 0-1 scale where closer to ideal = higher score
  return Math.min(1, avgDistance / idealDistance);
}

/**
 * Calculate open driving lanes from a position
 * Returns 0-1, where 1 = completely open lanes
 */
export function calculateOpenLanes(
  ballPosition: Position,
  offensivePositions: Position[],
  defensivePositions: Position[],
  isOffense: boolean
): number {
  const basket = isOffense ? COURT.BASKETS.HOME : COURT.BASKETS.AWAY;
  const directionToBasket = angle(ballPosition, basket);
  
  // Check for defenders in driving lanes (45-degree cone toward basket)
  const laneWidth = Math.PI / 4; // 45 degrees
  let blockedLanes = 0;
  
  for (const defPos of defensivePositions) {
    const defAngle = angle(ballPosition, defPos);
    const angleDiff = Math.abs(defAngle - directionToBasket);
    
    // If defender is within driving lane and close enough to matter
    if (angleDiff <= laneWidth && distance(ballPosition, defPos) <= 10) {
      blockedLanes++;
    }
  }
  
  // Return inverse of blocked lanes ratio
  return Math.max(0, 1 - blockedLanes / Math.max(1, defensivePositions.length));
}

/**
 * Calculate shot quality based on position and contest
 * Returns 0-1, where 1 = wide open shot
 */
export function calculateShotQuality(
  shooterPos: Position,
  defenderPos: Position | null,
  isOffense: boolean
): number {
  const zone = getShotZone(shooterPos, isOffense);
  let baseQuality = 0.5;
  
  // Base quality by zone
  switch (zone) {
    case 'rim': baseQuality = 0.8; break;
    case 'mid': baseQuality = 0.6; break;
    case 'three': baseQuality = 0.4; break;
  }
  
  // Adjust for defensive contest
  if (defenderPos) {
    const contestDistance = distance(shooterPos, defenderPos);
    const contestPenalty = Math.max(0, (6 - contestDistance) / 6); // Full contest at 0 feet, no contest at 6+ feet
    baseQuality *= (1 - contestPenalty * 0.4); // Max 40% penalty for tight contest
  }
  
  return clamp(baseQuality, 0, 1);
}
