/**
 * Comprehensive unit tests for core math functions
 * Tests validation, edge cases, and mathematical correctness
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  clamp,
  ratingZ,
  chance,
  softmax,
  dirichletMean,
  betaMean,
  updateDirichlet,
  updateBeta,
  distance,
  distanceToBasket,
  isInsideThreePoint,
  isInPaint,
  getShotZone,
  calculateSpacing,
  calculateShotQuality,
  calculateShotScore,
  calculatePassScore,
  calculateDriveScore,
  initializeTendencyDistributions
} from './index.js';
// Removed CONFIG import to break circular dependency
import type { Position, Tendencies } from '@basketball-sim/types';

describe('Basic Math Functions', () => {
  describe('clamp', () => {
    it('should clamp values within bounds', () => {
      expect(clamp(5, 0, 10)).toBe(5);
      expect(clamp(-5, 0, 10)).toBe(0);
      expect(clamp(15, 0, 10)).toBe(10);
    });

    it('should handle edge cases', () => {
      expect(clamp(0, 0, 10)).toBe(0);
      expect(clamp(10, 0, 10)).toBe(10);
      expect(clamp(5, 5, 5)).toBe(5);
    });
  });

  describe('ratingZ', () => {
    it('should convert ratings to z-scores correctly', () => {
      expect(ratingZ(50)).toBe(0); // Mean rating
      expect(ratingZ(62)).toBe(1); // One std dev above
      expect(ratingZ(38)).toBe(-1); // One std dev below
      expect(ratingZ(99)).toBeCloseTo(4.08, 2); // Max rating
      expect(ratingZ(25)).toBeCloseTo(-2.08, 2); // Min rating
    });

    it('should use default values', () => {
      const result = ratingZ(50 + 12); // mean + stdDev
      expect(result).toBe(1);
    });
  });

  describe('chance', () => {
    it('should convert scores to probabilities', () => {
      expect(chance(0)).toBeCloseTo(0.5, 3); // Neutral score
      expect(chance(1)).toBeGreaterThan(0.5); // Positive score
      expect(chance(-1)).toBeLessThan(0.5); // Negative score
      expect(chance(10)).toBeCloseTo(1, 3); // Very positive
      expect(chance(-10)).toBeCloseTo(0, 3); // Very negative
    });

    it('should always return values between 0 and 1', () => {
      const testScores = [-100, -10, -1, 0, 1, 10, 100];
      testScores.forEach(score => {
        const prob = chance(score);
        expect(prob).toBeGreaterThanOrEqual(0);
        expect(prob).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('softmax', () => {
    it('should normalize arrays to probabilities', () => {
      const input = [1, 2, 3];
      const result = softmax(input);

      expect(result).toHaveLength(3);
      expect(result.reduce((sum, p) => sum + p, 0)).toBeCloseTo(1, 5);
      result.forEach(p => {
        expect(p).toBeGreaterThan(0);
        expect(p).toBeLessThan(1);
      });
    });

    it('should handle temperature parameter', () => {
      const input = [1, 2, 3];
      const highTemp = softmax(input, 10); // More uniform
      const lowTemp = softmax(input, 0.1); // More extreme

      // High temperature should be more uniform
      const highTempVariance = highTemp.reduce((sum, p) => sum + Math.pow(p - 1 / 3, 2), 0);
      const lowTempVariance = lowTemp.reduce((sum, p) => sum + Math.pow(p - 1 / 3, 2), 0);

      expect(highTempVariance).toBeLessThan(lowTempVariance);
    });
  });
});

describe('Statistical Distribution Functions', () => {
  describe('dirichletMean', () => {
    it('should calculate correct means', () => {
      const alphas = [1, 2, 3];
      const mean = dirichletMean(alphas);

      expect(mean).toHaveLength(3);
      expect(mean.reduce((sum, m) => sum + m, 0)).toBeCloseTo(1, 5);
      expect(mean).toEqual([1 / 6, 2 / 6, 3 / 6]);
    });

    it('should handle uniform distribution', () => {
      const alphas = [1, 1, 1, 1];
      const mean = dirichletMean(alphas);

      mean.forEach(m => expect(m).toBeCloseTo(0.25, 5));
    });
  });

  describe('betaMean', () => {
    it('should calculate correct means', () => {
      expect(betaMean(1, 1)).toBe(0.5); // Uniform
      expect(betaMean(2, 1)).toBeCloseTo(2 / 3, 5); // Biased toward 1
      expect(betaMean(1, 2)).toBeCloseTo(1 / 3, 5); // Biased toward 0
    });
  });

  describe('updateDirichlet', () => {
    it('should update counts correctly', () => {
      const alphas = [1, 1, 1];
      const updated = updateDirichlet(alphas, 1, 1); // No decay

      expect(updated[0]).toBe(1);
      expect(updated[1]).toBe(2);
      expect(updated[2]).toBe(1);
    });

    it('should apply decay', () => {
      const alphas = [2, 2, 2];
      const updated = updateDirichlet(alphas, 0, 0.5);

      expect(updated[0]).toBe(2); // 0.5 * 2 + 1
      expect(updated[1]).toBe(1); // 0.5 * 2
      expect(updated[2]).toBe(1); // 0.5 * 2
    });
  });

  describe('updateBeta', () => {
    it('should update for success', () => {
      const result = updateBeta(1, 1, true, 1); // No decay
      expect(result.a).toBe(2);
      expect(result.b).toBe(1);
    });

    it('should update for failure', () => {
      const result = updateBeta(1, 1, false, 1); // No decay
      expect(result.a).toBe(1);
      expect(result.b).toBe(2);
    });
  });
});

describe('Court Geometry Functions', () => {
  const homeBasket: Position = { x: 5.25, y: 25 };
  const awayBasket: Position = { x: 88.75, y: 25 };

  describe('distance', () => {
    it('should calculate correct distances', () => {
      const p1: Position = { x: 0, y: 0 };
      const p2: Position = { x: 3, y: 4 };

      expect(distance(p1, p2)).toBe(5); // 3-4-5 triangle
    });

    it('should handle same point', () => {
      const p: Position = { x: 10, y: 20 };
      expect(distance(p, p)).toBe(0);
    });
  });

  describe('distanceToBasket', () => {
    it('should calculate distance to correct basket', () => {
      const pos: Position = { x: 10, y: 25 };

      const offenseDist = distanceToBasket(pos, true);
      const defenseDist = distanceToBasket(pos, false);

      expect(offenseDist).toBeCloseTo(distance(pos, homeBasket), 3);
      expect(defenseDist).toBeCloseTo(distance(pos, awayBasket), 3);
    });
  });

  describe('isInsideThreePoint', () => {
    it('should identify three-point shots correctly', () => {
      // Close shot
      const closeShot: Position = { x: 10, y: 25 };
      expect(isInsideThreePoint(closeShot, true)).toBe(true);

      // Three-point shot
      const threeShot: Position = { x: 30, y: 25 };
      expect(isInsideThreePoint(threeShot, true)).toBe(false);
    });

    it('should handle corner three correctly', () => {
      // Corner three (shorter distance)
      const cornerThree: Position = { x: 27, y: 5 };
      expect(isInsideThreePoint(cornerThree, true)).toBe(false);
    });
  });

  describe('isInPaint', () => {
    it('should identify paint area correctly', () => {
      const inPaint: Position = { x: 10, y: 25 };
      const outsidePaint: Position = { x: 30, y: 25 };

      expect(isInPaint(inPaint, true)).toBe(true);
      expect(isInPaint(outsidePaint, true)).toBe(false);
    });
  });

  describe('getShotZone', () => {
    it('should classify shot zones correctly', () => {
      const rimShot: Position = { x: 7, y: 25 };
      const closeShot: Position = { x: 12, y: 25 };
      const midShot: Position = { x: 20, y: 25 };
      const threeShot: Position = { x: 30, y: 25 };

      expect(getShotZone(rimShot, true)).toBe('rim');
      expect(getShotZone(closeShot, true)).toBe('close');
      expect(getShotZone(midShot, true)).toBe('mid');
      expect(getShotZone(threeShot, true)).toBe('three');
    });
  });
});

describe('Game Calculation Functions', () => {
  describe('calculateSpacing', () => {
    it('should calculate spacing quality', () => {
      const goodSpacing: Position[] = [
        { x: 10, y: 10 },
        { x: 25, y: 10 },
        { x: 40, y: 10 }
      ];

      const poorSpacing: Position[] = [
        { x: 10, y: 10 },
        { x: 12, y: 12 },
        { x: 14, y: 14 }
      ];

      const goodScore = calculateSpacing(goodSpacing);
      const poorScore = calculateSpacing(poorSpacing);

      expect(goodScore).toBeGreaterThan(poorScore);
      expect(goodScore).toBeLessThanOrEqual(1);
      expect(poorScore).toBeGreaterThanOrEqual(0);
    });

    it('should handle edge cases', () => {
      expect(calculateSpacing([])).toBe(1);
      expect(calculateSpacing([{ x: 10, y: 10 }])).toBe(1);
    });
  });

  describe('calculateShotQuality', () => {
    it('should calculate quality based on zone and contest', () => {
      const rimPos: Position = { x: 7, y: 25 };
      const threePos: Position = { x: 30, y: 25 };

      const openRim = calculateShotQuality(rimPos, null, true);
      const openThree = calculateShotQuality(threePos, null, true);

      expect(openRim).toBeGreaterThan(openThree);
    });

    it('should apply contest penalty', () => {
      const shotPos: Position = { x: 20, y: 25 };
      const closeDefender: Position = { x: 21, y: 25 };
      const farDefender: Position = { x: 30, y: 25 };

      const contested = calculateShotQuality(shotPos, closeDefender, true);
      const lessContested = calculateShotQuality(shotPos, farDefender, true);
      const open = calculateShotQuality(shotPos, null, true);

      expect(open).toBeGreaterThan(lessContested);
      expect(lessContested).toBeGreaterThan(contested);
    });
  });
});

describe('RTTB Scoring Functions', () => {
  describe('calculateShotScore', () => {
    it('should use correct weights', () => {
      const baseScore = calculateShotScore(75, 1, 0, 0, 0);
      const highRating = calculateShotScore(90, 1, 0, 0, 0);
      const lowRating = calculateShotScore(50, 1, 0, 0, 0);

      expect(highRating).toBeGreaterThan(baseScore);
      expect(baseScore).toBeGreaterThan(lowRating);
    });

    it('should apply modifiers correctly', () => {
      const base = calculateShotScore(75, 1, 0, 0, 0);
      const contested = calculateShotScore(75, 1, 0.5, 0, 0);
      const fatigued = calculateShotScore(75, 1, 0, 0.3, 0);
      const clutch = calculateShotScore(75, 1, 0, 0, 0.5);

      expect(base).toBeGreaterThan(contested);
      expect(base).toBeGreaterThan(fatigued);
      expect(clutch).toBeGreaterThan(base);
    });
  });

  describe('calculatePassScore', () => {
    it('should factor in ratings and risk', () => {
      const safePass = calculatePassScore(80, 80, 0.2, 0.1);
      const riskyPass = calculatePassScore(80, 80, 0.8, 0.1);
      const pressuredPass = calculatePassScore(80, 80, 0.2, 0.7);

      expect(safePass).toBeGreaterThan(riskyPass);
      expect(safePass).toBeGreaterThan(pressuredPass);
    });
  });

  describe('calculateDriveScore', () => {
    it('should calculate advantages correctly', () => {
      const fastVsSlow = calculateDriveScore(90, 60, 80, 70, 0.8, 0.5);
      const slowVsFast = calculateDriveScore(60, 90, 80, 70, 0.8, 0.5);

      expect(fastVsSlow).toBeGreaterThan(slowVsFast);
    });
  });
});

describe('Tendency Distribution Initialization', () => {
  let mockTendencies: Tendencies;

  beforeEach(() => {
    mockTendencies = {
      withBall: [20, 15, 25, 10, 15, 10, 5],
      offBall: [30, 20, 25, 15, 10],
      shotZone: [40, 35, 25],
      threeStyle: [70, 30],
      passRisk: 60,
      help: 40,
      gambleSteal: 20,
      crashOreb: 80
    };
  });

  describe('initializeTendencyDistributions', () => {
    it('should create valid distributions', () => {
      const distributions = initializeTendencyDistributions(mockTendencies);

      // Check Dirichlet distributions
      expect(distributions.withBall.alphas).toHaveLength(7);
      expect(distributions.withBall.mean).toHaveLength(7);
      expect(distributions.withBall.mean.reduce((sum, p) => sum + p, 0)).toBeCloseTo(1, 5);

      // Check Beta distributions
      expect(distributions.passRisk.mean).toBeGreaterThan(0);
      expect(distributions.passRisk.mean).toBeLessThan(1);
      expect(distributions.passRisk.a).toBeGreaterThan(0);
      expect(distributions.passRisk.b).toBeGreaterThan(0);
    });

    it('should handle edge case tendencies', () => {
      const edgeTendencies: Tendencies = {
        withBall: [0, 0, 100, 0, 0, 0, 0],
        offBall: [100, 0, 0, 0, 0],
        shotZone: [0, 0, 100],
        threeStyle: [100, 0],
        passRisk: 0,
        help: 100,
        gambleSteal: 50,
        crashOreb: 25
      };

      const distributions = initializeTendencyDistributions(edgeTendencies);

      // Should still create valid distributions (no zeros due to base alpha)
      distributions.withBall.alphas.forEach(alpha => {
        expect(alpha).toBeGreaterThan(0);
      });
    });
  });
});

describe('Performance and Edge Cases', () => {
  it('should handle NaN inputs gracefully', () => {
    expect(() => ratingZ(NaN)).not.toThrow();
    expect(() => chance(NaN)).not.toThrow();
    expect(() => distance({ x: NaN, y: 0 }, { x: 0, y: 0 })).not.toThrow();
  });

  it('should handle extreme values', () => {
    expect(chance(1000)).toBeCloseTo(1, 3);
    expect(chance(-1000)).toBeCloseTo(0, 3);
    expect(clamp(1e10, 0, 100)).toBe(100);
    expect(clamp(-1e10, 0, 100)).toBe(0);
  });

  it('should maintain mathematical properties', () => {
    // Softmax should always sum to 1
    const values = [Math.random() * 100, Math.random() * 100, Math.random() * 100];
    const probs = softmax(values);
    expect(probs.reduce((sum, p) => sum + p, 0)).toBeCloseTo(1, 10);

    // Distance should be symmetric
    const p1: Position = { x: Math.random() * 100, y: Math.random() * 100 };
    const p2: Position = { x: Math.random() * 100, y: Math.random() * 100 };
    expect(distance(p1, p2)).toBeCloseTo(distance(p2, p1), 10);
  });
});
