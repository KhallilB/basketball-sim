import { PossessionEngine, PositionalPossessionEngine } from '@basketball-sim/core';
import { Team, PossessionState } from '@basketball-sim/types';

function dummyTeam(id: string): Team {
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

async function runBasicEngine() {
  console.log('=== BASIC ENGINE (Original) ===');
  const engine = new PossessionEngine();
  const A = dummyTeam('A');
  const B = dummyTeam('B');
  let state: PossessionState = {
    gameId: 'G1',
    poss: 1,
    offense: A.id,
    defense: B.id,
    ball: A.players[0].id,
    clock: { quarter: 1, sec: 2880 },
    shotClock: 24,
    fatigue: {},
    score: { off: 0, def: 0 },
    seed: 12345
  };

  let possCount = 0;
  while (state.clock.sec > 0 && possCount < 100) {
    const offTeam = state.offense === A.id ? A : B;
    const defTeam = state.offense === A.id ? B : A;

    const prevScore = { ...state.score };
    state = engine.run(offTeam, defTeam, state);
    state.poss++;
    possCount++;

    if (state.score.off !== prevScore.off || state.score.def !== prevScore.def) {
      console.log(
        `Possession ${possCount}: Score ${prevScore.off}-${prevScore.def} → ${state.score.off}-${state.score.def}`
      );
    }
  }
  console.log(`Final: ${possCount} possessions, Score: ${state.score.off}-${state.score.def}\n`);
}

async function runPositionalEngine() {
  console.log('=== POSITIONAL ENGINE (New with Court Positioning) ===');
  const engine = new PositionalPossessionEngine();
  const A = dummyTeam('A');
  const B = dummyTeam('B');
  let state: PossessionState = {
    gameId: 'G2',
    poss: 1,
    offense: A.id,
    defense: B.id,
    ball: A.players[0].id,
    clock: { quarter: 1, sec: 2880 },
    shotClock: 24,
    fatigue: {},
    score: { off: 0, def: 0 },
    seed: 12345
  };

  let possCount = 0;
  while (state.clock.sec > 0 && possCount < 100) {
    const offTeam = state.offense === A.id ? A : B;
    const defTeam = state.offense === A.id ? B : A;

    const prevScore = { ...state.score };
    // Use man-to-man defense as default
    const positionalState = engine.run(offTeam, defTeam, state, 'man');

    // Extract basic state for next iteration
    state = {
      gameId: positionalState.gameId,
      poss: positionalState.poss,
      offense: positionalState.offense,
      defense: positionalState.defense,
      ball: positionalState.ball,
      clock: positionalState.clock,
      shotClock: positionalState.shotClock,
      fatigue: positionalState.fatigue,
      score: positionalState.score,
      seed: positionalState.seed
    };

    state.poss++;
    possCount++;

    if (state.score.off !== prevScore.off || state.score.def !== prevScore.def) {
      console.log(
        `Possession ${possCount}: Score ${prevScore.off}-${prevScore.def} → ${state.score.off}-${state.score.def}`
      );
      console.log(
        `  Spacing: lanes=${positionalState.spacing.openLanes.toFixed(
          2
        )}, quality=${positionalState.spacing.shotQuality.toFixed(2)}`
      );
    }
  }
  console.log(`Final: ${possCount} possessions, Score: ${state.score.off}-${state.score.def}\n`);
}

async function main() {
  console.log('🏀 Basketball Simulation - Phase 1.1 Demo: Court Positioning System\n');

  // Run both engines to compare
  await runBasicEngine();
  await runPositionalEngine();

  console.log('✅ Phase 1.1 Complete: Court positioning system implemented!');
  console.log('📍 Features added:');
  console.log('  • Court coordinates and spatial awareness');
  console.log('  • Defensive assignments and schemes');
  console.log('  • Dynamic EPV calculation based on position');
  console.log('  • Spacing and shot quality metrics');
  console.log('  • Formation management');
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
