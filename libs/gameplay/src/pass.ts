import { z, logistic } from '@basketball-sim/math';
import { Ratings, Explain } from '@basketball-sim/types';
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
