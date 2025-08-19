export const PARAMS = {
  shot: {
    beta: { base: -0.8, Q: 0.5, contest: -1.2, fatigue: -0.5, clutch: 0.15, noise: 0.6, rel: 0.1 }
  },
  pass: { base: 1.0, laneRisk: -0.8, pressure: -0.5, iq: 0.3 },
  drive: { base: -0.2, speed: 0.9, handle: 0.6, lane: 0.5, angle: 0.4, defLat: -0.9, defOnBall: -0.6 },
  rebound: { z: 0.9, height: 0.4, strength: 0.4, pos: 0.6, dist: -0.3 },
  foul: { base: -1.2, contact: 0.8, whistle: 0.3, defenseDisc: -0.6, contest: 0.3 },
  policy: { alpha: 0.7, T0: 1.0, iqK: 0.009, discK: 0.008, fatigueK: 0.3 },
  fatigue: { perAction: 0.7, perShot: 1.2, recoverTO: 6.0 },
  targets: { efg: [0.44, 0.48], pace: [65, 75], tov: [0.13, 0.19] }
} as const;

export type Params = typeof PARAMS;
