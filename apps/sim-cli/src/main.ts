import { PossessionEngine } from '@basketball-sim/core';
import { Team, PossessionState } from '@basketball-sim/types';

function dummyTeam(id: string, seed = 1): Team {
  const mk = (i: number) => ({
    id: `p${id}${i}`,
    name: `P${id}${i}`,
    ratings: {
      three: 70,
      mid: 65,
      finishing: 68,
      ft: 68,
      pass: 66,
      handle: 66,
      post: 55,
      roll: 60,
      screen: 58,
      onBallDef: 62,
      lateral: 64,
      rimProt: 50,
      steal: 60,
      speed: 70,
      strength: 60,
      vertical: 66,
      rebound: 60,
      iq: 66,
      discipline: 63,
      consistency: 60,
      clutch: 57,
      stamina: 72,
      heightIn: 78,
      wingspanIn: 82
    },
    tendencies: {
      withBall: [0.3, 0.2, 0.2, 0.1, 0.05, 0.05, 0.1] as [number, number, number, number, number, number, number],
      offBall: [0.5, 0.2, 0.2, 0.05, 0.05] as [number, number, number, number, number],
      shotZone: [0.3, 0.2, 0.5] as [number, number, number],
      threeStyle: [0.7, 0.3] as [number, number],
      passRisk: 50,
      help: 50,
      gambleSteal: 40,
      crashOreb: 30
    }
  });
  return { id, name: `Team ${id}`, players: [mk(1), mk(2), mk(3), mk(4), mk(5)] };
}

async function main() {
  const engine = new PossessionEngine();
  const A = dummyTeam('A');
  const B = dummyTeam('B');
  let state: PossessionState = {
    gameId: 'G1',
    poss: 1,
    offense: A.id,
    defense: B.id,
    ball: A.players[0].id,
    clock: { quarter: 1, sec: 2880 }, // 48 minutes = 2880 seconds
    shotClock: 24,
    fatigue: {},
    score: { off: 0, def: 0 },
    seed: 12345
  };
  let possCount = 0;
  while (state.clock.sec > 0 && possCount < 100) {
    // Determine which team has possession
    const offTeam = state.offense === A.id ? A : B;
    const defTeam = state.offense === A.id ? B : A;

    const prevScore = { ...state.score };
    state = engine.run(offTeam, defTeam, state);
    state.poss++;
    possCount++;

    // Debug: log when score changes
    if (state.score.off !== prevScore.off || state.score.def !== prevScore.def) {
      console.log(
        `Possession ${possCount}: Score changed from ${prevScore.off}-${prevScore.def} to ${state.score.off}-${state.score.def}`
      );
    }
  }
  console.log(`Possessions: ${possCount}, Score (view-of-offense): ${state.score.off}-${state.score.def}`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
