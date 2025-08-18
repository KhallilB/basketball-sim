import { z } from '@basketball-sim/math';
import { Ratings, Explain } from '@basketball-sim/types';
import { PARAMS } from '@basketball-sim/params';

export function reboundWeight(r: Ratings, posAdv: number, distFt: number): { w: number; explain: Explain } {
  const heightFt = r.heightIn / 12;
  const terms = [
    { label: 'rebound', value: PARAMS.rebound.z * z(r.rebound) },
    { label: 'height', value: PARAMS.rebound.height * heightFt },
    { label: 'strength', value: PARAMS.rebound.strength * z(r.strength) },
    { label: 'posAdv', value: PARAMS.rebound.pos * posAdv },
    { label: 'dist', value: PARAMS.rebound.dist * distFt }
  ];
  const score = terms.reduce((a, t) => a + t.value, 0);
  const w = Math.exp(score);
  return { w, explain: { terms, score, p: w / (1 + w) } };
}
