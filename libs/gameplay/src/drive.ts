import { z, logistic } from '@basketball-sim/math';
import { Ratings, Explain } from '@basketball-sim/types';
import { PARAMS } from '@basketball-sim/params';

export function driveBlowbyP(off: Ratings, def: Ratings, lane: number, angle: number): Explain {
  const terms = [
    { label: 'speed gap', value: PARAMS.drive.speed * (z(off.speed) - z(def.lateral)) },
    { label: 'handle gap', value: PARAMS.drive.handle * (z(off.handle) - z(def.onBallDef)) },
    { label: 'lane', value: PARAMS.drive.lane * lane },
    { label: 'angle', value: PARAMS.drive.angle * angle },
    { label: 'base', value: PARAMS.drive.base }
  ];
  const score = terms.reduce((a, t) => a + t.value, 0);
  return { terms, score, p: logistic(score) };
}
