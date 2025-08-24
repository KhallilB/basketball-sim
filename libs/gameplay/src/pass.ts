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
 * Calculate probability of assist based on basketball rules and context
 */
export function calculateAssistProbability(
  passer: Player,
  shooter: Player,
  dribblesAfterPass: number,
  shotQuality: number
): number {
  // Basketball rules: assist only possible with ≤2 dribbles
  if (dribblesAfterPass > 2) {
    return 0;
  }

  // Base assist probability - primarily based on passer ability and shot quality
  const passingZ = z(passer.ratings.pass);
  const iqZ = z(passer.ratings.iq);
  const shooterIqZ = z(shooter.ratings.iq); // Shooter positioning/awareness

  // Start with high base probability for good passes leading to made shots
  let baseProb = 0.85;

  // Adjust based on passer skill (better passers get more assists)
  const passerAdjustment = (passingZ + iqZ * 0.5) * 0.1;
  baseProb += passerAdjustment;

  // Adjust based on shooter positioning/IQ
  const shooterAdjustment = shooterIqZ * 0.05;
  baseProb += shooterAdjustment;

  // Penalty for dribbles (each dribble reduces assist chance)
  const dribblePenalty = dribblesAfterPass * 0.15;
  baseProb -= dribblePenalty;

  // Bonus for shot quality (good passes to open shots more likely to be assists)
  const qualityBonus = shotQuality * 0.1;
  baseProb += qualityBonus;

  // Cap between reasonable bounds
  return Math.min(0.95, Math.max(0.1, baseProb));
}
