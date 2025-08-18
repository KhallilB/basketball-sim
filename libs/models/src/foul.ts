import { z, logistic } from '@basketball-sim/math';
import { Ratings, Explain } from '@basketball-sim/types';
import { PARAMS } from '@basketball-sim/params';

export function shootingFoulP(off: Ratings, def: Ratings, contact: number, contest: number): Explain {
  const terms = [
    { label: 'base', value: PARAMS.foul.base },
    { label: 'contact', value: PARAMS.foul.contact * contact },
    { label: 'whistle (off)', value: PARAMS.foul.whistle * z(off.finishing) },
    { label: 'def discipline', value: PARAMS.foul.defenseDisc * z(def.discipline) },
    { label: 'contest', value: PARAMS.foul.contest * contest }
  ];
  const score = terms.reduce((a, t) => a + t.value, 0);
  return { terms, score, p: logistic(score) };
}
