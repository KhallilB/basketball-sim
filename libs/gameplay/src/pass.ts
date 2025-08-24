import { z, logistic } from '@basketball-sim/math';
import { Ratings, Explain, Player } from '@basketball-sim/types';
import { PARAMS } from '@basketball-sim/params';

export function passCompleteP(r: Ratings, laneRisk: number, pressure: number): Explain {
  const terms = [
    { label: 'pass skill', value: PARAMS.pass.base * z(r.pass) },
    { label: 'iq', value: PARAMS.pass.iq * z(r.iq) },
    { label: 'risk', value: PARAMS.pass.laneRisk * laneRisk },
    { label: 'pressure', value: PARAMS.pass.pressure * pressure }
  ];
  const score = terms.reduce((a, t) => a + t.value, 0);
  return { terms, score, p: logistic(score) };
}

/**
 * Calculate probability of assist based on passer skills and shot context
 */
export function calculateAssistProbability(
  passer: Player,
  shooter: Player,
  dribblesAfterPass: number,
  shotQuality: number,
  ballMovement: number
): number {
  // Base assist probability from passer's ratings
  const passingZ = z(passer.ratings.pass);
  const iqZ = z(passer.ratings.iq);
  
  // Base score from passer ability
  const baseScore = 0.8 * passingZ + 0.4 * iqZ;
  
  // Penalties for dribbles after pass (more dribbles = less likely assist)
  const dribblePenalty = Math.min(dribblesAfterPass * 0.2, 1.0);
  
  // Bonus for good ball movement and shot quality
  const qualityBonus = shotQuality * 0.3;
  const movementBonus = ballMovement * 0.2;
  
  // Final score with penalties and bonuses
  const finalScore = baseScore - dribblePenalty + qualityBonus + movementBonus;
  
  // Convert to probability using sigmoid function
  const probability = logistic(finalScore);
  
  // Cap at reasonable maximum (85%)
  return Math.min(0.85, Math.max(0.05, probability));
}
