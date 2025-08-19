import { PositionalPossessionEngine } from '@basketball-sim/core';
import { Team, PossessionState, Player } from '@basketball-sim/types';
import { initializeGameStats, finalizeGameStats, updateMinutesPlayed, RotationManager } from '@basketball-sim/models';

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

function displayFullBoxScore(homeTeam: Team, awayTeam: Team, finalScore: { home: number; away: number }, gameStats: any): void {
  console.log('\n' + '═'.repeat(120));
  console.log('🏆 FINAL RESULTS');
  console.log('═'.repeat(120));
  
  // Game result summary
  const homeWon = finalScore.home > finalScore.away;
  const margin = Math.abs(finalScore.home - finalScore.away);
  
  console.log(`\n📊 GAME SUMMARY:`);
  console.log(`${homeTeam.name} ${finalScore.home} - ${finalScore.away} ${awayTeam.name} ${homeWon ? '(W)' : '(L)'} by ${margin}`);
  console.log(`Game Length: ${gameStats.gameLength.toFixed(1)} minutes`);
  
  // Full box score for home team
  displayTeamBoxScore(homeTeam, gameStats.homeTeam, 'HOME');
  
  // Full box score for away team  
  displayTeamBoxScore(awayTeam, gameStats.awayTeam, 'AWAY');
  
  // Team totals
  console.log(`\n📈 TEAM STATS:`);
  console.log(`┌─────────────────────┬─────────┬─────────┬─────────┬─────────┬─────────┐`);
  console.log(`│ Team                │  Points │   FG%   │  3P%    │   FT%   │   REB   │`);
  console.log(`├─────────────────────┼─────────┼─────────┼─────────┼─────────┼─────────┤`);
  
  const homeFGP = gameStats.homeTeam.teamTotals.fieldGoalsAttempted > 0 ? 
    (gameStats.homeTeam.teamTotals.fieldGoalsMade / gameStats.homeTeam.teamTotals.fieldGoalsAttempted * 100).toFixed(1) : '0.0';
  const home3PP = gameStats.homeTeam.teamTotals.threePointersAttempted > 0 ? 
    (gameStats.homeTeam.teamTotals.threePointersMade / gameStats.homeTeam.teamTotals.threePointersAttempted * 100).toFixed(1) : '0.0';
  const homeFTP = gameStats.homeTeam.teamTotals.freeThrowsAttempted > 0 ? 
    (gameStats.homeTeam.teamTotals.freeThrowsMade / gameStats.homeTeam.teamTotals.freeThrowsAttempted * 100).toFixed(1) : '0.0';
  
  const awayFGP = gameStats.awayTeam.teamTotals.fieldGoalsAttempted > 0 ? 
    (gameStats.awayTeam.teamTotals.fieldGoalsMade / gameStats.awayTeam.teamTotals.fieldGoalsAttempted * 100).toFixed(1) : '0.0';
  const away3PP = gameStats.awayTeam.teamTotals.threePointersAttempted > 0 ? 
    (gameStats.awayTeam.teamTotals.threePointersMade / gameStats.awayTeam.teamTotals.threePointersAttempted * 100).toFixed(1) : '0.0';
  const awayFTP = gameStats.awayTeam.teamTotals.freeThrowsAttempted > 0 ? 
    (gameStats.awayTeam.teamTotals.freeThrowsMade / gameStats.awayTeam.teamTotals.freeThrowsAttempted * 100).toFixed(1) : '0.0';
  
  console.log(`│ ${homeTeam.name.padEnd(19)} │ ${String(gameStats.homeTeam.teamTotals.points).padStart(7)} │ ${homeFGP.padStart(7)}% │ ${home3PP.padStart(6)}% │ ${homeFTP.padStart(6)}% │ ${String(gameStats.homeTeam.teamTotals.totalRebounds).padStart(7)} │`);
  console.log(`│ ${awayTeam.name.padEnd(19)} │ ${String(gameStats.awayTeam.teamTotals.points).padStart(7)} │ ${awayFGP.padStart(7)}% │ ${away3PP.padStart(6)}% │ ${awayFTP.padStart(6)}% │ ${String(gameStats.awayTeam.teamTotals.totalRebounds).padStart(7)} │`);
  console.log(`└─────────────────────┴─────────┴─────────┴─────────┴─────────┴─────────┘`);
}

function displayTeamBoxScore(team: Team, teamStats: any, label: string): void {
  const playersWithStats = Object.values(teamStats.players)
    .filter((p: any) => p.minutes > 0)
    .sort((a: any, b: any) => b.minutes - a.minutes);
  
  console.log(`\n🏀 ${label} - ${team.name.toUpperCase()} BOX SCORE:`);
  console.log(`┌──────────────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┐`);
  console.log(`│ Player       │ MIN │ PTS │ FGM │ FGA │ 3PM │ 3PA │ FTM │ FTA │ REB │ AST │`);
  console.log(`├──────────────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┤`);
  
  playersWithStats.forEach((p: any) => {
    const playerName = team.players.find(player => player.id === p.playerId)?.name || p.playerId;
    const minutes = p.minutes.toFixed(1);
    
    console.log(`│ ${playerName.padEnd(12)} │ ${minutes.padStart(3)} │ ${String(p.points).padStart(3)} │ ${String(p.fieldGoalsMade).padStart(3)} │ ${String(p.fieldGoalsAttempted).padStart(3)} │ ${String(p.threePointersMade).padStart(3)} │ ${String(p.threePointersAttempted).padStart(3)} │ ${String(p.freeThrowsMade).padStart(3)} │ ${String(p.freeThrowsAttempted).padStart(3)} │ ${String(p.totalRebounds).padStart(3)} │ ${String(p.assists).padStart(3)} │`);
  });
  
  console.log(`└──────────────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┘`);
  
  // Show bench players (didn't play)
  const benchPlayers = team.players.filter(player => 
    !teamStats.players[player.id] || teamStats.players[player.id].minutes === 0
  );
  
  if (benchPlayers.length > 0) {
    console.log(`💺 Did not play: ${benchPlayers.map(p => p.name).join(', ')}`);
  }
}

async function runEnhancedSimulation() {
  console.log('=== 🏀 ENHANCED BASKETBALL SIMULATION ===\n');
  
  const engine = new PositionalPossessionEngine();
  const rotationManager = new RotationManager();
  
  // Generate realistic teams with varying skill levels
  const homeTeam = generateRealisticTeam('HOME', 'Lakers', 12345);
  const awayTeam = generateRealisticTeam('AWAY', 'Celtics', 54321);
  
  // Display team information
  displayTeamInfo(homeTeam);
  displayTeamInfo(awayTeam);
  
  console.log(`\n🏀 Starting game: ${homeTeam.name} vs ${awayTeam.name}`);
  console.log('─'.repeat(50));

  // Initialize lineups with starting 5
  let homeLineup = rotationManager.getStartingLineup(homeTeam);
  let awayLineup = rotationManager.getStartingLineup(awayTeam);
  
  let state: PossessionState = {
    gameId: 'GAME-001',
    poss: 1,
    offense: homeTeam.id,
    defense: awayTeam.id,
    ball: homeLineup[0].id, // Start with first starter
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
  let subsCount = 0;
  
  while (state.clock.sec > 0 && possCount < 100) {
    const offTeam = state.offense === homeTeam.id ? homeTeam : awayTeam;
    const defTeam = state.offense === homeTeam.id ? awayTeam : homeTeam;
    const isHomeOnOffense = state.offense === homeTeam.id;
    const currentLineup = isHomeOnOffense ? homeLineup : awayLineup;

    const prevScore = { ...state.score };
    const gameTimeElapsed = (2880 - state.clock.sec) / 60; // Minutes elapsed
    const possessionDuration = 0.5; // Each possession = ~30 seconds = 0.5 minutes
    
    // Check for substitutions every few possessions
    if (possCount % 3 === 0) {
      const lineup = isHomeOnOffense ? homeLineup : awayLineup;
      const team = isHomeOnOffense ? homeTeam : awayTeam;
      const teamStats = isHomeOnOffense ? gameStats.homeTeam : gameStats.awayTeam;
      
      for (let i = 0; i < lineup.length; i++) {
        const player = lineup[i];
        const playerStats = teamStats.players[player.id];
        const fatigue = state.fatigue[player.id] || 0;
        const scoreDiff = isHomeOnOffense ? 
          (state.score.off - state.score.def) : 
          (state.score.def - state.score.off);
        
        if (rotationManager.shouldSubstitute(player, fatigue, playerStats.minutes, gameTimeElapsed, scoreDiff)) {
          const substitute = rotationManager.getSubstitute(team, player, lineup, 
            Object.fromEntries(Object.values(teamStats.players).map(p => [p.playerId, p.minutes])), gameTimeElapsed);
          
          if (substitute) {
            lineup[i] = substitute;
            subsCount++;
            console.log(`🔄 SUB: ${substitute.name} in for ${player.name} (${gameTimeElapsed.toFixed(1)}min)`);
            
            // Reset fatigue for new player
            state.fatigue[substitute.id] = 0;
            
            // Update ball handler if they were subbed out
            if (state.ball === player.id) {
              state.ball = substitute.id;
            }
          }
        }
      }
      
      // Update the main lineup variables
      if (isHomeOnOffense) {
        homeLineup = lineup;
      } else {
        awayLineup = lineup;
      }
    }
    
    // Randomly distribute ball among current lineup for variety
    const randomPlayer = currentLineup[Math.floor(Math.random() * currentLineup.length)];
    state.ball = randomPlayer.id;
    
    // Update minutes for all active players
    updateMinutesPlayed(gameStats, homeLineup, awayLineup, possessionDuration);
    
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
      const playersUsedHome = Object.values(gameStats.homeTeam.players).filter(p => p.minutes > 0).length;
      const playersUsedAway = Object.values(gameStats.awayTeam.players).filter(p => p.minutes > 0).length;
      console.log(`⏱️  ${possCount} poss complete - ${homeTeam.name} ${homeScore}, ${awayTeam.name} ${awayScore} | Players used: ${playersUsedHome}+${playersUsedAway} | Subs: ${subsCount}`);
    }
  }
  
  console.log(`\n📊 Final Rotation Summary:`);
  const playersUsedHome = Object.values(gameStats.homeTeam.players).filter(p => p.minutes > 0).length;
  const playersUsedAway = Object.values(gameStats.awayTeam.players).filter(p => p.minutes > 0).length;
  console.log(`Total substitutions: ${subsCount}`);
  console.log(`Players used: ${homeTeam.name} (${playersUsedHome}), ${awayTeam.name} (${playersUsedAway})`);

  // Finalize game stats
  const gameTimeMinutes = (2880 - state.clock.sec) / 60;
  finalizeGameStats(gameStats, gameTimeMinutes);

  const finalHomeScore = state.offense === homeTeam.id ? state.score.off : state.score.def;
  const finalAwayScore = state.offense === homeTeam.id ? state.score.def : state.score.off;

  // Display beautiful results table
  displayFullBoxScore(homeTeam, awayTeam, { home: finalHomeScore, away: finalAwayScore }, gameStats);
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
  console.log('  • Dynamic player rotations and substitutions');
  console.log('  • Minutes tracking and fatigue management');
  console.log('  • Realistic shooting percentages (45-55%)');
  console.log('  • Full box score with all player stats');
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
