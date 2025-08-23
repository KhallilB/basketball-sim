// RTTB Core Math Functions
// Note: Removed CONFIG dependency to break circular dependency
// Math functions now use local constants or accept parameters

export const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));

// Rating to z-score conversion with local constants
export const ratingZ = (r: number, mean = 50, stdDev = 12) => {
  const validated = clamp(r, 25, 99);
  return (validated - mean) / stdDev;
};

// Legacy alias for compatibility
export const z = ratingZ;

// Probability from score (logistic function)
export const chance = (s: number) => 1 / (1 + Math.exp(-s));

// Legacy alias for compatibility
export const logistic = chance;

// Softmax for action selection with temperature
export function softmax(xs: number[], T = 1) {
  const m = Math.max(...xs);
  const ex = xs.map(v => Math.exp((v - m) / T));
  const s = ex.reduce((a, b) => a + b, 0);
  return ex.map(v => v / s);
}

// Dirichlet distribution utilities
export function dirichletMean(alphas: number[]): number[] {
  const sum = alphas.reduce((a, b) => a + b, 0);
  return alphas.map(alpha => alpha / sum);
}

// Convert Dirichlet mean to logit bias
export function meanToLogitBias(mean: number): number {
  const clamped = clamp(mean, 0.02, 0.98);
  return Math.log(clamped / (1 - clamped));
}

// Beta distribution utilities
export function betaMean(a: number, b: number): number {
  return a / (a + b);
}

// Update Dirichlet counts with decay
export function updateDirichlet(alphas: number[], actionIndex: number, decay = 0.95): number[] {
  const updated = alphas.map(alpha => decay * alpha);
  updated[actionIndex] += 1;
  return updated;
}

// Update Beta counts with decay
export function updateBeta(a: number, b: number, success: boolean, decay = 0.95): { a: number; b: number } {
  return {
    a: decay * a + (success ? 1 : 0),
    b: decay * b + (success ? 0 : 1)
  };
}

// Consistency noise scaling
export function consistencyNoise(consistency: number, baseNoise = 0.1): number {
  const validatedConsistency = clamp(consistency, 0, 100);
  const scale = (1 - validatedConsistency / 100) * 2;
  return (Math.random() * 2 - 1) * baseNoise * scale;
}

// Court geometry utilities
import type { Position, TendencyDistributions, Tendencies } from '@basketball-sim/types';

// RTTB Tendency Distribution Utilities
export function initializeTendencyDistributions(tendencies: Tendencies): TendencyDistributions {
  // Convert slider values to Dirichlet alphas (add base to prevent zeros)
  const dirichletBase = 0.1;
  const withBallAlphas = tendencies.withBall.map(t => t + dirichletBase);
  const offBallAlphas = tendencies.offBall.map(t => t + dirichletBase);
  const shotZoneAlphas = tendencies.shotZone.map(t => t + dirichletBase);
  const threeStyleAlphas = tendencies.threeStyle.map(t => t + dirichletBase);
  
  // Convert binary sliders to Beta parameters
  const betaMultiplier = 10;
  const passRiskA = (tendencies.passRisk / 100) * betaMultiplier + 1;
  const passRiskB = (1 - tendencies.passRisk / 100) * betaMultiplier + 1;
  
  const helpA = (tendencies.help / 100) * betaMultiplier + 1;
  const helpB = (1 - tendencies.help / 100) * betaMultiplier + 1;
  
  const gambleStealA = (tendencies.gambleSteal / 100) * betaMultiplier + 1;
  const gambleStealB = (1 - tendencies.gambleSteal / 100) * betaMultiplier + 1;
  
  const crashOrebA = (tendencies.crashOreb / 100) * betaMultiplier + 1;
  const crashOrebB = (1 - tendencies.crashOreb / 100) * betaMultiplier + 1;
  
  return {
    withBall: {
      alphas: withBallAlphas,
      mean: dirichletMean(withBallAlphas)
    },
    offBall: {
      alphas: offBallAlphas,
      mean: dirichletMean(offBallAlphas)
    },
    shotZone: {
      alphas: shotZoneAlphas,
      mean: dirichletMean(shotZoneAlphas)
    },
    threeStyle: {
      alphas: threeStyleAlphas,
      mean: dirichletMean(threeStyleAlphas)
    },
    passRisk: {
      a: passRiskA,
      b: passRiskB,
      mean: betaMean(passRiskA, passRiskB)
    },
    help: {
      a: helpA,
      b: helpB,
      mean: betaMean(helpA, helpB)
    },
    gambleSteal: {
      a: gambleStealA,
      b: gambleStealB,
      mean: betaMean(gambleStealA, gambleStealB)
    },
    crashOreb: {
      a: crashOrebA,
      b: crashOrebB,
      mean: betaMean(crashOrebA, crashOrebB)
    }
  };
}

// NBA court dimensions (local constants)
export const COURT = {
  LENGTH: 94,
  WIDTH: 50,
  BASKETS: {
    HOME: { x: 5.25, y: 25 },
    AWAY: { x: 88.75, y: 25 }
  },
  THREE_POINT_LINE: 23.75,
  CORNER_THREE: 22
};

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
  const validP1 = { x: clamp(p1.x, 0, 94), y: clamp(p1.y, 0, 50) };
  const validP2 = { x: clamp(p2.x, 0, 94), y: clamp(p2.y, 0, 50) };
  const dx = validP2.x - validP1.x;
  const dy = validP2.y - validP1.y;
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
  const validPos = { x: clamp(pos.x, 0, 94), y: clamp(pos.y, 0, 50) };
  const basket = isOffense ? COURT.BASKETS.HOME : COURT.BASKETS.AWAY;
  const dist = distance(validPos, basket);

  // Special handling for corners (shorter three-point line)
  if (validPos.y <= 14 || validPos.y >= 36) {
    return dist <= COURT.CORNER_THREE;
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
export function getShotZone(pos: Position, isOffense: boolean): 'rim' | 'close' | 'mid' | 'three' {
  const validPos = { x: clamp(pos.x, 0, 94), y: clamp(pos.y, 0, 50) };
  const distToBasket = distanceToBasket(validPos, isOffense);

  if (distToBasket <= 4) return 'rim';
  if (distToBasket <= 10) return 'close';
  if (isInsideThreePoint(validPos, isOffense)) return 'mid';
  return 'three';
}

/**
 * Calculate spacing quality
 */
export function calculateSpacing(positions: Position[]): number {
  if (positions.length < 2) return 1;

  const validPositions = positions.map(p => ({ x: clamp(p.x, 0, 94), y: clamp(p.y, 0, 50) }));
  let totalDistance = 0;
  let pairs = 0;

  for (let i = 0; i < validPositions.length; i++) {
    for (let j = i + 1; j < validPositions.length; j++) {
      totalDistance += distance(validPositions[i], validPositions[j]);
      pairs++;
    }
  }

  const avgDistance = totalDistance / pairs;
  const idealDistance = 15; // feet
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
 * Calculate shot quality
 */
export function calculateShotQuality(shooterPos: Position, defenderPos: Position | null, isOffense: boolean): number {
  const validShooterPos = { x: clamp(shooterPos.x, 0, 94), y: clamp(shooterPos.y, 0, 50) };
  const zone = getShotZone(validShooterPos, isOffense);
  
  // Base quality by zone
  const baseQualities = { rim: 0.8, close: 0.65, mid: 0.45, three: 0.35 };
  let baseQuality = baseQualities[zone] || 0.5;

  // Adjust for defensive contest
  if (defenderPos) {
    const validDefenderPos = { x: clamp(defenderPos.x, 0, 94), y: clamp(defenderPos.y, 0, 50) };
    const contestDistance = distance(validShooterPos, validDefenderPos);
    const maxDistance = 6; // feet for no contest
    const contestPenalty = Math.max(0, (maxDistance - contestDistance) / maxDistance);
    const maxPenalty = 0.4;
    baseQuality *= 1 - contestPenalty * maxPenalty;
  }

  return clamp(baseQuality, 0, 1);
}

/**
 * Calculate rebound location based on shot trajectory and location
 */
export function calculateReboundLocation(
  shotLocation: Position,
  trajectory: import('@basketball-sim/types').ReboundTrajectory,
  isOffense: boolean
): Position {
  const basket = isOffense ? COURT.BASKETS.HOME : COURT.BASKETS.AWAY;

  // Base rebound location near the basket
  let reboundX = basket.x;
  let reboundY = basket.y;

  // Adjust based on trajectory
  switch (trajectory) {
    case 'short':
      // Short shots rebound closer to basket
      reboundX += (shotLocation.x - basket.x) * 0.3;
      reboundY += (shotLocation.y - basket.y) * 0.3;
      break;
    case 'long':
      // Long shots rebound farther from basket
      reboundX += (shotLocation.x - basket.x) * 0.7;
      reboundY += (shotLocation.y - basket.y) * 0.7;
      break;
    case 'soft':
      // Soft shots tend to stay near the rim
      reboundX += (Math.random() - 0.5) * 4;
      reboundY += (Math.random() - 0.5) * 4;
      break;
    case 'hard':
      // Hard shots can bounce anywhere
      reboundX += (Math.random() - 0.5) * 12;
      reboundY += (Math.random() - 0.5) * 8;
      break;
  }

  // Keep within court bounds
  return {
    x: clamp(reboundX, 0, COURT.LENGTH),
    y: clamp(reboundY, 0, COURT.WIDTH)
  };
}

/**
 * Calculate rebounding weight based on position, ratings, and boxing out
 * Now uses RTTB math with exponential weighting
 */
export function calculateReboundWeight(
  player: any, // Player ratings
  position: Position,
  reboundLocation: Position,
  boxingOut: boolean,
  beingBoxedOut: boolean,
  badgeMods = 0
): number {
  // RTTB formula: exp(0.9*reboundZ + 0.5*heightFt + 0.4*strengthZ + 0.6*posAdv - 0.3*distFt + badgeMods)
  const reboundZ = ratingZ(player.rebound);
  const strengthZ = ratingZ(player.strength);
  const heightFt = (player.heightIn || 78) / 12;
  const distFt = distance(position, reboundLocation);
  
  // Position advantage from boxing out
  let posAdv = 0;
  if (boxingOut) posAdv = 1.0;
  if (beingBoxedOut) posAdv = -0.8;
  
  const exponent = 0.9 * reboundZ + 0.5 * heightFt + 0.4 * strengthZ + 0.6 * posAdv - 0.3 * distFt + badgeMods;
  
  return Math.exp(exponent);
}

// RTTB Model Scores
export function calculateShotScore(
  threeRating: number,
  Q: number,
  contest: number,
  fatigue: number,
  clutch: number,
  badgeMods = 0,
  noise = 0
): number {
  // Shot scoring weights
  const weights = { rating: 1.2, quality: 0.8, contest: -0.6, fatigue: -0.4, clutch: 0.5 };
  return weights.rating * ratingZ(threeRating) + 
         weights.quality * Q + 
         weights.contest * contest + 
         weights.fatigue * fatigue + 
         weights.clutch * clutch + 
         badgeMods + noise;
}

export function calculatePassScore(
  passRating: number,
  iqRating: number,
  laneRisk: number,
  pressure: number,
  badgeMods = 0
): number {
  // Pass scoring weights
  const weights = { rating: 1.0, laneRisk: -0.8, pressure: -0.5, iq: 0.6 };
  return weights.rating * ratingZ(passRating) + 
         weights.laneRisk * laneRisk + 
         weights.pressure * pressure + 
         weights.iq * ratingZ(iqRating) + 
         badgeMods;
}

export function calculateDriveScore(
  speedRating: number,
  lateralRating: number,
  handleRating: number,
  onBallDefRating: number,
  lane: number,
  angle: number,
  badgeMods = 0
): number {
  // Drive scoring weights
  const weights = { base: 0.2, speedAdvantage: 0.8, handleAdvantage: 0.7, lane: 0.6, angle: 0.3 };
  const speedAdvantage = ratingZ(speedRating) - ratingZ(lateralRating);
  const handleAdvantage = ratingZ(handleRating) - ratingZ(onBallDefRating);
  return weights.base + 
         weights.speedAdvantage * speedAdvantage + 
         weights.handleAdvantage * handleAdvantage + 
         weights.lane * lane + 
         weights.angle * angle + 
         badgeMods;
}
