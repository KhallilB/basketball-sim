import { PositionalPossessionEngine } from '@basketball-sim/core';
import { Team, Player, GameStats, TeamStats, PlayerStats, PossessionState } from '@basketball-sim/types';
import { initializeGameStats, finalizeGameStats, updateMinutesPlayed, RotationManager } from '@basketball-sim/systems';
import {
  generateRTTBTeam,
  calculateRTTBOverall,
  getTraitsByKind,
  getAllBadges,
  getUnlockedBadges
} from '@basketball-sim/player';

// RTTB Enhanced Player Display Functions

function displayPlayerTraits(player: Player): void {
  console.log(`\n🎯 ${player.name} - Traits & Badges:`);

  // Display traits
  if (player.traits && player.traits.length > 0) {
    console.log('  📋 Traits:');
    for (const trait of player.traits) {
      const tags = trait.tags ? ` [${trait.tags.join(', ')}]` : '';
      console.log(`    • ${trait.name} (${trait.kind})${tags}`);
      console.log(`      ${trait.description}`);
    }
  }

  // Display unlocked badges
  const unlockedBadges = getUnlockedBadges(player.badges || []);
  if (unlockedBadges.length > 0) {
    console.log('  🏆 Active Badges:');
    for (const badge of unlockedBadges) {
      const progress = player.badges?.find(b => b.badgeId === badge.id);
      const tier = progress?.currentTier || 0;
      console.log(`    • ${badge.name} (Tier ${tier}): ${badge.description}`);
    }
  } else {
    console.log('  🏆 No badges unlocked yet');
  }

  // Display relationships
  if (player.relationships) {
    console.log('  🤝 Relationships:');
    console.log(`    Coach Trust: ${player.relationships.coachTrust}/100`);
    console.log(`    Morale: ${player.relationships.morale}/100`);
    console.log(`    Reputation: ${player.relationships.rep}/100`);
  }
}

function calculatePlayerOverall(ratings: Player['ratings']): number {
  return calculateRTTBOverall(ratings);
}

function calculateTeamOverall(team: Team): number {
  // Use only the top 8 players for team overall (starting 5 + key bench)
  const topPlayers = team.players
    .map(p => calculateRTTBOverall(p.ratings))
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

  console.log(`\n📋 ${team.name} (${overall} OVR) - RTTB Enhanced`);
  console.log(`⭐ Star Player: ${star.player.name} (${star.overall} OVR)`);
  console.log(`👥 Roster: ${team.players.length} players`);

  // Show top 8 players with RTTB details
  const sortedPlayers = team.players
    .map(p => ({ ...p, overall: calculateRTTBOverall(p.ratings) }))
    .sort((a, b) => b.overall - a.overall)
    .slice(0, 8);

  console.log('🏀 Key Players:');
  sortedPlayers.forEach((p, i) => {
    const role = i === 0 ? '⭐' : i < 5 ? '🟢' : '🟡';
    const height = p.ratings.height
      ? `${Math.floor((p.ratings.height || 72) / 12)}'${(p.ratings.height || 72) % 12}"`
      : '';
    const traitCount = p.traits?.length || 0;
    const badgeCount = p.badges?.filter(b => b.currentTier > 0).length || 0;
    console.log(`   ${role} ${p.name}: ${p.overall} OVR ${height} | ${traitCount} traits, ${badgeCount} badges`);
  });

  // Show star player details
  if (star.player.traits || star.player.badges) {
    displayPlayerTraits(star.player);
  }
}

function displayFullBoxScore(
  homeTeam: Team,
  awayTeam: Team,
  finalScore: { home: number; away: number },
  gameStats: GameStats
): void {
  console.log('\n' + '═'.repeat(120));
  console.log('🏆 FINAL RESULTS');
  console.log('═'.repeat(120));

  // Game result summary
  const homeWon = finalScore.home > finalScore.away;
  const margin = Math.abs(finalScore.home - finalScore.away);

  console.log(`\n📊 GAME SUMMARY:`);
  console.log(
    `${homeTeam.name} ${finalScore.home} - ${finalScore.away} ${awayTeam.name} ${homeWon ? '(W)' : '(L)'} by ${margin}`
  );
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

  const homeFGP =
    gameStats.homeTeam.teamTotals.fieldGoalsAttempted > 0
      ? (
          (gameStats.homeTeam.teamTotals.fieldGoalsMade / gameStats.homeTeam.teamTotals.fieldGoalsAttempted) *
          100
        ).toFixed(1)
      : '0.0';
  const home3PP =
    gameStats.homeTeam.teamTotals.threePointersAttempted > 0
      ? (
          (gameStats.homeTeam.teamTotals.threePointersMade / gameStats.homeTeam.teamTotals.threePointersAttempted) *
          100
        ).toFixed(1)
      : '0.0';
  const homeFTP =
    gameStats.homeTeam.teamTotals.freeThrowsAttempted > 0
      ? (
          (gameStats.homeTeam.teamTotals.freeThrowsMade / gameStats.homeTeam.teamTotals.freeThrowsAttempted) *
          100
        ).toFixed(1)
      : '0.0';

  const awayFGP =
    gameStats.awayTeam.teamTotals.fieldGoalsAttempted > 0
      ? (
          (gameStats.awayTeam.teamTotals.fieldGoalsMade / gameStats.awayTeam.teamTotals.fieldGoalsAttempted) *
          100
        ).toFixed(1)
      : '0.0';
  const away3PP =
    gameStats.awayTeam.teamTotals.threePointersAttempted > 0
      ? (
          (gameStats.awayTeam.teamTotals.threePointersMade / gameStats.awayTeam.teamTotals.threePointersAttempted) *
          100
        ).toFixed(1)
      : '0.0';
  const awayFTP =
    gameStats.awayTeam.teamTotals.freeThrowsAttempted > 0
      ? (
          (gameStats.awayTeam.teamTotals.freeThrowsMade / gameStats.awayTeam.teamTotals.freeThrowsAttempted) *
          100
        ).toFixed(1)
      : '0.0';

  console.log(
    `│ ${homeTeam.name.padEnd(19)} │ ${String(gameStats.homeTeam.teamTotals.points).padStart(7)} │ ${homeFGP.padStart(
      7
    )}% │ ${home3PP.padStart(6)}% │ ${homeFTP.padStart(6)}% │ ${String(
      gameStats.homeTeam.teamTotals.totalRebounds
    ).padStart(7)} │`
  );
  console.log(
    `│ ${awayTeam.name.padEnd(19)} │ ${String(gameStats.awayTeam.teamTotals.points).padStart(7)} │ ${awayFGP.padStart(
      7
    )}% │ ${away3PP.padStart(6)}% │ ${awayFTP.padStart(6)}% │ ${String(
      gameStats.awayTeam.teamTotals.totalRebounds
    ).padStart(7)} │`
  );
  console.log(`└─────────────────────┴─────────┴─────────┴─────────┴─────────┴─────────┘`);
}

function displayTeamBoxScore(team: Team, teamStats: TeamStats, label: string): void {
  const playersWithStats = Object.values(teamStats.players)
    .filter((p: PlayerStats) => p.minutes > 0)
    .sort((a: PlayerStats, b: PlayerStats) => b.minutes - a.minutes);

  console.log(`\n🏀 ${label} - ${team.name.toUpperCase()} BOX SCORE:`);
  console.log(`┌──────────────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┐`);
  console.log(`│ Player       │ MIN │ PTS │ FGM │ FGA │ 3PM │ 3PA │ FTM │ FTA │ REB │ AST │`);
  console.log(`├──────────────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┤`);

  playersWithStats.forEach((p: PlayerStats) => {
    const playerName = team.players.find(player => player.id === p.playerId)?.name || p.playerId;
    const minutes = p.minutes.toFixed(1);

    console.log(
      `│ ${playerName.padEnd(12)} │ ${minutes.padStart(3)} │ ${String(p.points).padStart(3)} │ ${String(
        p.fieldGoalsMade
      ).padStart(3)} │ ${String(p.fieldGoalsAttempted).padStart(3)} │ ${String(p.threePointersMade).padStart(
        3
      )} │ ${String(p.threePointersAttempted).padStart(3)} │ ${String(p.freeThrowsMade).padStart(3)} │ ${String(
        p.freeThrowsAttempted
      ).padStart(3)} │ ${String(p.totalRebounds).padStart(3)} │ ${String(p.assists).padStart(3)} │`
    );
  });

  console.log(`└──────────────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┘`);

  // Show bench players (didn't play)
  const benchPlayers = team.players.filter(
    player => !teamStats.players[player.id] || teamStats.players[player.id].minutes === 0
  );

  if (benchPlayers.length > 0) {
    console.log(`💺 Did not play: ${benchPlayers.map(p => p.name).join(', ')}`);
  }
}

async function runEnhancedSimulation() {
  console.log('=== 🏀 ENHANCED BASKETBALL SIMULATION ===\n');

  const engine = new PositionalPossessionEngine();
  const rotationManager = new RotationManager();

  // Generate RTTB-enhanced teams with traits and badges
  const homeTeam = generateRTTBTeam('HOME', 'Lakers', 12345);
  const awayTeam = generateRTTBTeam('AWAY', 'Celtics', 54321);

  console.log('\n🎯 RTTB System Active:');
  console.log(`  • ${getTraitsByKind('archetype').length} archetype traits available`);
  console.log(`  • ${getTraitsByKind('background').length} background traits available`);
  console.log(`  • ${getTraitsByKind('quirk').length} quirk traits available`);
  console.log(`  • ${getAllBadges().length} badges in catalog`);
  console.log('  • Dirichlet/Beta tendency distributions enabled');
  console.log('  • Explainable AI telemetry active');

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

  while (state.clock.sec > 0) {
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
        const scoreDiff = isHomeOnOffense ? state.score.off - state.score.def : state.score.def - state.score.off;

        if (rotationManager.shouldSubstitute(player, fatigue, playerStats.minutes, gameTimeElapsed, scoreDiff)) {
          const substitute = rotationManager.getSubstitute(
            team,
            lineup,
            Object.fromEntries(Object.values(teamStats.players).map(p => [p.playerId, p.minutes]))
          );

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

      if (possCount <= 20 || scoringPlays % 5 === 0) {
        // Show fewer logs
        console.log(
          `🏀 Poss ${possCount}: ${isHomeOnOffense ? homeTeam.name : awayTeam.name} +${points} pts (${
            isHomeOnOffense ? state.score.off : state.score.def
          }-${isHomeOnOffense ? state.score.def : state.score.off})`
        );

        // Show detailed context for key scoring plays (first 5 possessions)
        if (possCount <= 5) {
          const scorer = currentLineup.find(p => p.id === state.ball);
          if (scorer) {
            console.log(`🧠 Key Play Analysis: ${scorer.name} scored ${points} pts`);
            console.log(`   Context: ${isHomeOnOffense ? homeTeam.name : awayTeam.name} possession #${possCount}`);
            console.log(
              `   Score: ${isHomeOnOffense ? state.score.off : state.score.def}-${
                isHomeOnOffense ? state.score.def : state.score.off
              }`
            );
          }
        }
      }
    }

    // Show progress every 25 possessions
    if (possCount % 25 === 0) {
      const homeScore = state.offense === homeTeam.id ? state.score.off : state.score.def;
      const awayScore = state.offense === homeTeam.id ? state.score.def : state.score.off;
      const playersUsedHome = Object.values(gameStats.homeTeam.players).filter(p => p.minutes > 0).length;
      const playersUsedAway = Object.values(gameStats.awayTeam.players).filter(p => p.minutes > 0).length;
      console.log(
        `⏱️  ${possCount} poss complete - ${homeTeam.name} ${homeScore}, ${awayTeam.name} ${awayScore} | Players used: ${playersUsedHome}+${playersUsedAway} | Subs: ${subsCount}`
      );
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
