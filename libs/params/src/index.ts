export const PARAMS = {
  shot: {
    beta: { base: -3.8, Q: 0.15, contest: -3.2, fatigue: -1.8, clutch: 0.08, noise: 2.2, rel: 0.02 }
  },
  pass: { base: 1.0, laneRisk: -0.8, pressure: -0.5, iq: 0.3 },
  drive: { base: -0.2, speed: 0.9, handle: 0.6, lane: 0.5, angle: 0.4, defLat: -0.9, defOnBall: -0.6 },
  rebound: { z: 0.9, height: 0.4, strength: 0.4, pos: 0.6, dist: -0.3 },
  foul: { base: -1.2, contact: 0.8, whistle: 0.3, defenseDisc: -0.6, contest: 0.3 },
  policy: { alpha: 0.7, T0: 1.0, iqK: 0.009, discK: 0.008, fatigueK: 0.3 },
  fatigue: { perAction: 0.7, perShot: 1.2, recoverTO: 6.0 },
  targets: { efg: [0.51, 0.58], pace: [98, 106], tov: [0.11, 0.15] }
} as const;

export type Params = typeof PARAMS;
