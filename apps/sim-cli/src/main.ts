import { PositionalPossessionEngine } from '@basketball-sim/core';
import { Team, PossessionState, Player } from '@basketball-sim/types';
import { initializeGameStats, finalizeGameStats } from '@basketball-sim/models';

// Player archetypes with different skill distributions
type PlayerArchetype = 'star' | 'starter' | 'roleplayer' | 'bench' | 'deep-bench';

function generatePlayer(id: string, name: string, archetype: PlayerArchetype, position: string, seed: number): Player {
  // Use seed for consistent random generation
  const rng = (s: number) => {
    const x = Math.sin(s) * 10000;
    return x - Math.floor(x);
  };
  
  let baseRating: number;
  let variance: number;
  
  switch (archetype) {
    case 'star':
      baseRating = 85; // 80-90 overall
      variance = 5;
      break;
    case 'starter':
      baseRating = 75; // 70-80 overall
      variance = 5;
      break;
    case 'roleplayer':
      baseRating = 65; // 60-70 overall
      variance = 5;
      break;
    case 'bench':
      baseRating = 55; // 50-60 overall
      variance = 5;
      break;
    case 'deep-bench':
      baseRating = 45; // 40-50 overall
      variance = 5;
      break;
  }
  
  // Generate ratings with some specialization
  const generateRating = (base: number, specialization = 0) => {
    const random = rng(seed * 17 + base * 13 + specialization * 7) * 2 - 1; // -1 to 1
    return Math.max(25, Math.min(99, Math.round(base + variance * random + specialization)));
  };
  
  // Position-based specializations
  const isGuard = position.includes('G');
  const isForward = position.includes('F');
  const isCenter = position.includes('C');
  
  const ratings = {
    three: generateRating(baseRating, isGuard ? 10 : isCenter ? -15 : 0),
    mid: generateRating(baseRating, isGuard ? 5 : 0),
    finishing: generateRating(baseRating, isCenter ? 10 : isGuard ? -5 : 0),
    ft: generateRating(baseRating, isGuard ? 5 : -5),
    pass: generateRating(baseRating, isGuard ? 8 : isCenter ? -8 : 0),
    handle: generateRating(baseRating, isGuard ? 12 : isCenter ? -12 : 0),
    post: generateRating(baseRating, isCenter ? 15 : isGuard ? -15 : 0),
    roll: generateRating(baseRating, isCenter ? 8 : -5),
    screen: generateRating(baseRating, isCenter ? 5 : -5),
    onBallDef: generateRating(baseRating),
    lateral: generateRating(baseRating, isGuard ? 5 : isCenter ? -8 : 0),
    rimProt: generateRating(baseRating, isCenter ? 12 : isGuard ? -12 : 0),
    steal: generateRating(baseRating, isGuard ? 8 : -3),
    speed: generateRating(baseRating, isGuard ? 8 : isCenter ? -10 : 0),
    strength: generateRating(baseRating, isCenter ? 10 : isGuard ? -8 : 0),
    vertical: generateRating(baseRating, isCenter ? 5 : 0),
    rebound: generateRating(baseRating, isCenter ? 12 : isGuard ? -10 : 0),
    iq: generateRating(baseRating),
    discipline: generateRating(baseRating),
    consistency: generateRating(baseRating, archetype === 'star' ? 5 : archetype === 'deep-bench' ? -5 : 0),
    clutch: generateRating(baseRating, archetype === 'star' ? 8 : -2),
    stamina: generateRating(baseRating),
    heightIn: isCenter ? 82 + Math.floor(rng(seed * 3) * 6) : isForward ? 78 + Math.floor(rng(seed * 5) * 6) : 72 + Math.floor(rng(seed * 7) * 6),
    wingspanIn: 0 // Will be set based on height
  };
  
  ratings.wingspanIn = ratings.heightIn + Math.floor(rng(seed * 11) * 4) - 1;
  
  // Generate tendencies based on archetype and position
  const aggressiveness = archetype === 'star' ? 0.7 : archetype === 'starter' ? 0.6 : 0.4;
  const passingness = isGuard ? 0.6 : 0.3;
  
  const withBall: [number, number, number, number, number, number, number] = [
    rng(seed * 23) * 0.4 * aggressiveness, // drive
    rng(seed * 29) * 0.3 * aggressiveness, // pullup
    rng(seed * 31) * 0.4 * aggressiveness, // catchShoot
    rng(seed * 37) * 0.2, // pnrAttack
    rng(seed * 41) * 0.15 * passingness, // pnrPass
    isCenter ? rng(seed * 43) * 0.2 : rng(seed * 43) * 0.05, // post
    0.15 // reset (baseline)
  ];
  
  // Normalize withBall tendencies
  const sum = withBall.reduce((a, b) => a + b, 0);
  for (let i = 0; i < withBall.length; i++) {
    withBall[i] = withBall[i] / sum;
  }
  
  const tendencies = {
    withBall,
    offBall: [0.5, 0.2, 0.2, 0.05, 0.05] as [number, number, number, number, number],
    shotZone: [
      isCenter ? 0.6 : 0.3, // rim
      0.4, // mid
      isGuard ? 0.4 : isCenter ? 0.1 : 0.3 // three
    ] as [number, number, number],
    threeStyle: [0.7, 0.3] as [number, number],
    passRisk: Math.round(30 + rng(seed * 47) * 40),
    help: Math.round(40 + rng(seed * 53) * 20),
    gambleSteal: Math.round(20 + rng(seed * 59) * 40),
    crashOreb: Math.round(isCenter ? 60 : 30 + rng(seed * 61) * 20)
  };
  
  return {
    id,
    name,
    ratings,
    tendencies
  };
}

function generateRealisticTeam(teamId: string, teamName: string, seed: number): Team {
  const players: Player[] = [];
  
  // Generate 15-man roster
  const positions = ['PG', 'SG', 'SF', 'PF', 'C', 'PG', 'SG', 'G', 'F', 'F', 'G', 'F', 'C', 'G', 'F'];
  const archetypes: PlayerArchetype[] = [
    'star', 'starter', 'starter', 'starter', 'starter', // Starting 5 with 1 star
    'roleplayer', 'roleplayer', 'roleplayer', // Key bench
    'bench', 'bench', 'bench', 'bench', // Regular bench
    'deep-bench', 'deep-bench', 'deep-bench' // End of bench
  ];
  
  for (let i = 0; i < 15; i++) {
    const player = generatePlayer(
      `${teamId}_p${i + 1}`,
      `${teamName[0]}${teamName.slice(-1)}${i + 1}`,
      archetypes[i],
      positions[i],
      seed + i * 1000
    );
    players.push(player);
  }
  
  return {
    id: teamId,
    name: teamName,
    players
  };
}

function calculatePlayerOverall(ratings: Player['ratings']): number {
  const weights = {
    three: 0.08,
    mid: 0.08,
    finishing: 0.10,
    ft: 0.03,
    pass: 0.06,
    handle: 0.08,
    post: 0.05,
    roll: 0.04,
    screen: 0.03,
    onBallDef: 0.08,
    lateral: 0.06,
    rimProt: 0.06,
    steal: 0.04,
    speed: 0.06,
    strength: 0.04,
    vertical: 0.04,
    rebound: 0.07,
    iq: 0.08,
    discipline: 0.03,
    consistency: 0.05,
    clutch: 0.03,
    stamina: 0.03,
    heightIn: 0.01,
    wingspanIn: 0.01
  };
  
  let overall = 0;
  for (const [key, weight] of Object.entries(weights)) {
    overall += ratings[key as keyof Player['ratings']] * weight;
  }
  
  return Math.round(overall);
}

function calculateTeamOverall(team: Team): number {
  // Use only the top 8 players for team overall (starting 5 + key bench)
  const topPlayers = team.players
    .map(p => calculatePlayerOverall(p.ratings))
    .sort((a, b) => b - a)
    .slice(0, 8);
    
  return Math.round(topPlayers.reduce((sum, rating) => sum + rating, 0) / topPlayers.length);
}

function findStarPlayer(team: Team): { player: Player; overall: number } {
  let bestPlayer = team.players[0];
  let bestOverall = calculatePlayerOverall(bestPlayer.ratings);
  
  for (const player of team.players) {
    const overall = calculatePlayerOverall(player.ratings);
    if (overall > bestOverall) {
      bestOverall = overall;
      bestPlayer = player;
    }
  }
  
  return { player: bestPlayer, overall: bestOverall };
}

function displayTeamInfo(team: Team): void {
  const overall = calculateTeamOverall(team);
  const star = findStarPlayer(team);
  
  console.log(`\n📋 ${team.name} (${overall} OVR)`);
  console.log(`⭐ Star Player: ${star.player.name} (${star.overall} OVR)`);
  console.log(`👥 Roster: ${team.players.length} players`);
  
  // Show top 8 players
  const sortedPlayers = team.players
    .map(p => ({ ...p, overall: calculatePlayerOverall(p.ratings) }))
    .sort((a, b) => b.overall - a.overall)
    .slice(0, 8);
    
  console.log('🏀 Key Players:');
  sortedPlayers.forEach((p, i) => {
    const role = i === 0 ? '⭐' : i < 5 ? '🟢' : '🟡';
    console.log(`   ${role} ${p.name}: ${p.overall} OVR`);
  });
}

function displayGameResults(homeTeam: Team, awayTeam: Team, finalScore: { home: number; away: number }, gameStats: any): void {
  console.log('\n' + '═'.repeat(80));
  console.log('🏆 FINAL RESULTS');
  console.log('═'.repeat(80));
  
  // Game result table
  const homeWon = finalScore.home > finalScore.away;
  const margin = Math.abs(finalScore.home - finalScore.away);
  
  console.log(`\n┌─────────────────────┬─────────┬─────────┬─────────────┐`);
  console.log(`│ Team                │  Score  │   OVR   │   Result    │`);
  console.log(`├─────────────────────┼─────────┼─────────┼─────────────┤`);
  console.log(`│ ${homeTeam.name.padEnd(19)} │ ${String(finalScore.home).padStart(7)} │ ${String(calculateTeamOverall(homeTeam)).padStart(7)} │ ${(homeWon ? `W +${margin}` : `L -${margin}`).padEnd(11)} │`);
  console.log(`│ ${awayTeam.name.padEnd(19)} │ ${String(finalScore.away).padStart(7)} │ ${String(calculateTeamOverall(awayTeam)).padStart(7)} │ ${(!homeWon ? `W +${margin}` : `L -${margin}`).padEnd(11)} │`);
  console.log(`└─────────────────────┴─────────┴─────────┴─────────────┘`);
  
  // Top scorers from each team
  console.log(`\n🏀 TOP SCORERS:`);
  const homeTopScorers = Object.values(gameStats.homeTeam.players)
    .filter((p: any) => p.points > 0)
    .sort((a: any, b: any) => b.points - a.points)
    .slice(0, 3);
  const awayTopScorers = Object.values(gameStats.awayTeam.players)
    .filter((p: any) => p.points > 0)
    .sort((a: any, b: any) => b.points - a.points)
    .slice(0, 3);
  
  console.log(`\n┌─────────────────────┬─────────┬───────┬───────┐`);
  console.log(`│ ${homeTeam.name.padEnd(19)} │  Points │  FGM  │  FGA  │`);
  console.log(`├─────────────────────┼─────────┼───────┼───────┤`);
  homeTopScorers.forEach((p: any) => {
    const playerName = homeTeam.players.find(player => player.id === p.playerId)?.name || p.playerId;
    console.log(`│ ${playerName.padEnd(19)} │ ${String(p.points).padStart(7)} │ ${String(p.fieldGoalsMade).padStart(5)} │ ${String(p.fieldGoalsAttempted).padStart(5)} │`);
  });
  console.log(`└─────────────────────┴─────────┴───────┴───────┘`);
  
  console.log(`\n┌─────────────────────┬─────────┬───────┬───────┐`);
  console.log(`│ ${awayTeam.name.padEnd(19)} │  Points │  FGM  │  FGA  │`);
  console.log(`├─────────────────────┼─────────┼───────┼───────┤`);
  awayTopScorers.forEach((p: any) => {
    const playerName = awayTeam.players.find(player => player.id === p.playerId)?.name || p.playerId;
    console.log(`│ ${playerName.padEnd(19)} │ ${String(p.points).padStart(7)} │ ${String(p.fieldGoalsMade).padStart(5)} │ ${String(p.fieldGoalsAttempted).padStart(5)} │`);
  });
  console.log(`└─────────────────────┴─────────┴───────┴───────┘`);
}

async function runEnhancedSimulation() {
  console.log('=== 🏀 ENHANCED BASKETBALL SIMULATION ===\n');
  
  const engine = new PositionalPossessionEngine();
  
  // Generate realistic teams with varying skill levels
  const homeTeam = generateRealisticTeam('HOME', 'Lakers', 12345);
  const awayTeam = generateRealisticTeam('AWAY', 'Celtics', 54321);
  
  // Display team information
  displayTeamInfo(homeTeam);
  displayTeamInfo(awayTeam);
  
  console.log(`\n🏀 Starting game: ${homeTeam.name} vs ${awayTeam.name}`);
  console.log('─'.repeat(50));

  let state: PossessionState = {
    gameId: 'GAME-001',
    poss: 1,
    offense: homeTeam.id,
    defense: awayTeam.id,
    ball: homeTeam.players[0].id, // Start with first player
    clock: { quarter: 1, sec: 2880 },
    shotClock: 24,
    fatigue: {},
    score: { off: 0, def: 0 },
    seed: 12345
  };

  // Initialize comprehensive game stats
  let gameStats = initializeGameStats('GAME-001', homeTeam, awayTeam);

  let possCount = 0;
  let scoringPlays = 0;
  
  while (state.clock.sec > 0 && possCount < 100) {
    const offTeam = state.offense === homeTeam.id ? homeTeam : awayTeam;
    const defTeam = state.offense === homeTeam.id ? awayTeam : homeTeam;
    const isHomeOnOffense = state.offense === homeTeam.id;

    const prevScore = { ...state.score };
    
    // Randomly distribute ball among the starting 5 players for variety
    const startingFive = offTeam.players.slice(0, 5);
    const randomPlayer = startingFive[Math.floor(Math.random() * startingFive.length)];
    state.ball = randomPlayer.id;
    
    // Run the enhanced engine with stats tracking
    const result = engine.run(offTeam, defTeam, state, 'man', gameStats);
    
    // Update state and stats
    state = result.state;
    gameStats = result.gameStats;
    
    state.poss++;
    possCount++;

    // Log scoring plays with enhanced details
    if (state.score.off !== prevScore.off || state.score.def !== prevScore.def) {
      scoringPlays++;
      const points = state.score.off - prevScore.off;
      
      if (possCount <= 20 || scoringPlays % 5 === 0) { // Show fewer logs
        console.log(`🏀 Poss ${possCount}: ${isHomeOnOffense ? homeTeam.name : awayTeam.name} +${points} pts (${isHomeOnOffense ? state.score.off : state.score.def}-${isHomeOnOffense ? state.score.def : state.score.off})`);
      }
    }
    
    // Show progress every 25 possessions
    if (possCount % 25 === 0) {
      const homeScore = state.offense === homeTeam.id ? state.score.off : state.score.def;
      const awayScore = state.offense === homeTeam.id ? state.score.def : state.score.off;
      console.log(`⏱️  ${possCount} poss complete - ${homeTeam.name} ${homeScore}, ${awayTeam.name} ${awayScore}`);
    }
  }

  // Finalize game stats
  const gameTimeMinutes = (2880 - state.clock.sec) / 60;
  finalizeGameStats(gameStats, gameTimeMinutes);

  const finalHomeScore = state.offense === homeTeam.id ? state.score.off : state.score.def;
  const finalAwayScore = state.offense === homeTeam.id ? state.score.def : state.score.off;

  // Display beautiful results table
  displayGameResults(homeTeam, awayTeam, { home: finalHomeScore, away: finalAwayScore }, gameStats);
}

async function main() {
  console.log('🏀 Basketball Simulation - Enhanced Engine with Stats Tracking\n');

  await runEnhancedSimulation();

  console.log('\n✅ Enhanced Basketball Simulation Complete!');
  console.log('🚀 Features included:');
  console.log('  • Court coordinates and spatial awareness');
  console.log('  • Defensive assignments and schemes (man-to-man)');
  console.log('  • Dynamic EPV calculation based on position and situation');
  console.log('  • Advanced multi-player rebounding with boxing out');
  console.log('  • Real-time spacing and shot quality metrics');
  console.log('  • Formation management and position updates');
  console.log('  • Comprehensive player and team statistics');
  console.log('  • Play-by-play tracking with detailed outcomes');
  console.log('  • Shooting charts by zone (rim/mid/three)');
  console.log('  • Advanced efficiency metrics (TS%, eFG%)');
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
