import { z, logistic, clamp } from '@basketball-sim/math';
import { Ratings, Explain } from '@basketball-sim/types';
import { PARAMS } from '@basketball-sim/params';

type ShotCtx = {
  Q: number;
  contest: number;
  fatigue: number;
  clutch: number;
  relMod: number;
  zone: 'three' | 'mid' | 'rim';
};
export function shotMakeP(r: Ratings, ctx: ShotCtx): Explain {
  const beta = PARAMS.shot.beta;
  const baseZ = ctx.zone === 'three' ? z(r.three) : ctx.zone === 'mid' ? z(r.mid) : z(r.finishing);
  const terms = [
    { label: 'skill', value: 1.0 * baseZ },
    { label: 'Q', value: beta.Q * ctx.Q },
    { label: 'contest', value: beta.contest * ctx.contest },
    { label: 'fatigue', value: beta.fatigue * ctx.fatigue },
    { label: 'clutch', value: beta.clutch * ctx.clutch },
    { label: 'release', value: beta.rel * ctx.relMod }
  ];
  const score = terms.reduce((a, t) => a + t.value, 0);
  // small bounded noise from (1-consistency)
  const noiseAmp = PARAMS.shot.beta.noise * (1 - r.consistency / 100);
  const p = logistic(score + clamp(noiseAmp, 0, 0.4));
  return { terms, score, p };
}
