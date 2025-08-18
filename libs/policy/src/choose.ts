import { softmax, clamp } from '@basketball-sim/math';
import { Action, Player } from '@basketball-sim/types';
import { PARAMS } from '@basketball-sim/params';

export function chooseAction(
  plr: Player,
  epv: Record<Action, number>, // expected value per action (model-based)
  bias: Record<Action, number>, // logit bias from tendencies/coach/context
  fatigue: number
): { action: Action; probs: Record<Action, number>; score: Record<Action, number> } {
  const iqT = PARAMS.policy.iqK * (plr.ratings.iq - 50);
  const discT = PARAMS.policy.discK * (plr.ratings.discipline - 50);
  const T = clamp((PARAMS.policy.T0 * (1 + PARAMS.policy.fatigueK * (fatigue / 100))) / (1 + iqT + discT), 0.55, 1.2);
  const alpha = PARAMS.policy.alpha; // rationality blend
  const keys = Object.keys(epv) as Action[];
  // z-normalize epv bucket:
  const vals = keys.map(k => epv[k]);
  const mu = vals.reduce((a, b) => a + b, 0) / vals.length;
  const sd = Math.sqrt(vals.map(v => (v - mu) ** 2).reduce((a, b) => a + b, 0) / Math.max(1, vals.length - 1));
  const z = (x: number) => (sd > 1e-6 ? (x - mu) / sd : 0);
  const score: Record<Action, number> = {};
  for (const a of keys) {
    score[a] = alpha * z(epv[a]) + (1 - alpha) * (bias[a] || 0);
  }
  const pArr = softmax(
    keys.map(a => score[a]),
    T
  );
  const probs = Object.fromEntries(keys.map((k, i) => [k, pArr[i]])) as Record<Action, number>;
  // sample from probability distribution instead of always picking max
  const r = Math.random();
  let cumulative = 0;
  let action = keys[0];
  for (let i = 0; i < keys.length; i++) {
    cumulative += pArr[i];
    if (r < cumulative) {
      action = keys[i];
      break;
    }
  }
  return { action, probs, score };
}
