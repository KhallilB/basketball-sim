import type {
  PlayerStats,
  TeamStats,
  GameStats,
  PlayOutcome,
  Action,
  Id,
  Team,
  Player
} from '@basketball-sim/types';
import { getShotZone } from '@basketball-sim/math';

/**
 * Initialize empty player stats
 */
export function initializePlayerStats(playerId: Id): PlayerStats {
  return {
    playerId,
    minutes: 0,
    points: 0,
    fieldGoalsMade: 0,
    fieldGoalsAttempted: 0,
    threePointersMade: 0,
    threePointersAttempted: 0,
    freeThrowsMade: 0,
    freeThrowsAttempted: 0,
    offensiveRebounds: 0,
    defensiveRebounds: 0,
    totalRebounds: 0,
    assists: 0,
    turnovers: 0,
    steals: 0,
    blocks: 0,
    foulsCommitted: 0,
    possessionsUsed: 0,
    drives: 0,
    drivesSuccessful: 0,
    passesAttempted: 0,
    passesCompleted: 0,
    shotsByZone: {
      rim: { made: 0, attempted: 0 },
      mid: { made: 0, attempted: 0 },
      three: { made: 0, attempted: 0 }
    },
    trueShootingAttempts: 0,
    effectiveFieldGoalPercentage: 0,
    plusMinus: 0
  };
}

/**
 * Initialize team stats
 */
export function initializeTeamStats(team: Team): TeamStats {
  const playerStats: Record<Id, PlayerStats> = {};
  
  for (const player of team.players) {
    playerStats[player.id] = initializePlayerStats(player.id);
  }

  const teamTotals = initializePlayerStats('team-total');
  // Set team totals defaults properly for team-wide stats
  teamTotals.playerId = team.id;
  teamTotals.minutes = 0; // Team doesn't have minutes
  teamTotals.plusMinus = 0; // Will be calculated differently

  return {
    teamId: team.id,
    players: playerStats,
    teamTotals,
    possessions: 0,
    pace: 0
  };
}

/**
 * Initialize game stats
 */
export function initializeGameStats(gameId: Id, homeTeam: Team, awayTeam: Team): GameStats {
  return {
    gameId,
    homeTeam: initializeTeamStats(homeTeam),
    awayTeam: initializeTeamStats(awayTeam),
    finalScore: { home: 0, away: 0 },
    gameLength: 0,
    playByPlay: []
  };
}

/**
 * Record a play outcome and update stats
 */
export function recordPlay(
  gameStats: GameStats,
  possession: number,
  playerId: Id,
  action: Action,
  outcome: PlayOutcome,
  playerPosition: any,
  isHomeTeam: boolean,
  timestamp: number
): void {
  const teamStats = isHomeTeam ? gameStats.homeTeam : gameStats.awayTeam;
  const playerStats = teamStats.players[playerId];
  
  if (!playerStats) return;

  // Add to play by play
  gameStats.playByPlay.push({
    possession,
    player: playerId,
    action,
    outcome,
    timestamp
  });

  // Update possession usage
  if (['drive', 'pullup', 'catchShoot', 'post'].includes(action)) {
    playerStats.possessionsUsed++;
    teamStats.teamTotals.possessionsUsed++;
  }

  // Record outcome-specific stats
  switch (outcome.kind) {
    case 'shot':
      recordShotOutcome(playerStats, teamStats.teamTotals, outcome, playerPosition);
      break;
    case 'drive':
      recordDriveOutcome(playerStats, teamStats.teamTotals, outcome);
      break;
    case 'pass':
      recordPassOutcome(playerStats, teamStats.teamTotals, outcome);
      break;
    case 'rebound':
      recordReboundOutcome(playerStats, teamStats.teamTotals, outcome, playerId);
      break;
    case 'foul':
      recordFoulOutcome(gameStats, outcome, isHomeTeam);
      break;
  }
}

/**
 * Record shot outcome
 */
function recordShotOutcome(playerStats: PlayerStats, teamTotals: PlayerStats, outcome: any, playerPosition: any): void {
  playerStats.fieldGoalsAttempted++;
  teamTotals.fieldGoalsAttempted++;
  
  const zone = playerPosition ? getShotZone(playerPosition, true) : 'mid';
  playerStats.shotsByZone[zone].attempted++;
  
  if (outcome.three) {
    playerStats.threePointersAttempted++;
    teamTotals.threePointersAttempted++;
  }

  if (outcome.make) {
    playerStats.fieldGoalsMade++;
    teamTotals.fieldGoalsMade++;
    playerStats.shotsByZone[zone].made++;
    
    const points = outcome.three ? 3 : 2;
    playerStats.points += points;
    teamTotals.points += points;
    
    if (outcome.three) {
      playerStats.threePointersMade++;
      teamTotals.threePointersMade++;
    }
  }

  if (outcome.fouled) {
    // Free throws will be handled separately
    const freeThrows = outcome.three ? 3 : 2;
    playerStats.freeThrowsAttempted += freeThrows;
    teamTotals.freeThrowsAttempted += freeThrows;
    
    // Assume 75% free throw shooting for now
    const made = Math.floor(freeThrows * 0.75);
    playerStats.freeThrowsMade += made;
    teamTotals.freeThrowsMade += made;
    playerStats.points += made;
    teamTotals.points += made;
  }

  // Calculate efficiency metrics
  updateShootingEfficiency(playerStats);
  updateShootingEfficiency(teamTotals);
}

/**
 * Record drive outcome
 */
function recordDriveOutcome(playerStats: PlayerStats, teamTotals: PlayerStats, outcome: any): void {
  playerStats.drives++;
  teamTotals.drives++;
  
  if (outcome.blowby) {
    playerStats.drivesSuccessful++;
    teamTotals.drivesSuccessful++;
  }
}

/**
 * Record pass outcome
 */
function recordPassOutcome(playerStats: PlayerStats, teamTotals: PlayerStats, outcome: any): void {
  playerStats.passesAttempted++;
  teamTotals.passesAttempted++;
  
  if (outcome.complete) {
    playerStats.passesCompleted++;
    teamTotals.passesCompleted++;
    // Note: Assists are recorded when the pass leads to a made shot
  } else if (outcome.turnover) {
    playerStats.turnovers++;
    teamTotals.turnovers++;
  }
}

/**
 * Record rebound outcome
 */
function recordReboundOutcome(playerStats: PlayerStats, teamTotals: PlayerStats, outcome: any, playerId: Id): void {
  if (outcome.winner === playerId) {
    if (outcome.offenseWon) {
      playerStats.offensiveRebounds++;
      teamTotals.offensiveRebounds++;
    } else {
      playerStats.defensiveRebounds++;
      teamTotals.defensiveRebounds++;
    }
    playerStats.totalRebounds++;
    teamTotals.totalRebounds++;
  }
}

/**
 * Record foul outcome
 */
function recordFoulOutcome(gameStats: GameStats, outcome: any, isHomeTeam: boolean): void {
  const teamStats = isHomeTeam ? gameStats.homeTeam : gameStats.awayTeam;
  const playerStats = teamStats.players[outcome.on];
  
  if (playerStats) {
    playerStats.foulsCommitted++;
    teamStats.teamTotals.foulsCommitted++;
  }
}

/**
 * Update shooting efficiency metrics
 */
function updateShootingEfficiency(stats: PlayerStats): void {
  if (stats.fieldGoalsAttempted > 0) {
    const efg = (stats.fieldGoalsMade + 0.5 * stats.threePointersMade) / stats.fieldGoalsAttempted;
    stats.effectiveFieldGoalPercentage = efg;
    
    stats.trueShootingAttempts = stats.fieldGoalsAttempted + 0.44 * stats.freeThrowsAttempted;
  }
}

/**
 * Update team possession count
 */
export function updatePossessions(gameStats: GameStats, isHomeTeam: boolean): void {
  const teamStats = isHomeTeam ? gameStats.homeTeam : gameStats.awayTeam;
  teamStats.possessions++;
}

/**
 * Update minutes played for active players
 */
export function updateMinutesPlayed(
  gameStats: GameStats,
  homeLineup: Player[],
  awayLineup: Player[],
  possessionDuration: number
): void {
  // Update home team minutes
  for (const player of homeLineup) {
    const playerStats = gameStats.homeTeam.players[player.id];
    if (playerStats) {
      playerStats.minutes += possessionDuration;
    }
  }
  
  // Update away team minutes
  for (const player of awayLineup) {
    const playerStats = gameStats.awayTeam.players[player.id];
    if (playerStats) {
      playerStats.minutes += possessionDuration;
    }
  }
}

/**
 * Calculate final game pace and other derived stats
 */
export function finalizeGameStats(gameStats: GameStats, gameTimeMinutes: number): void {
  gameStats.gameLength = gameTimeMinutes;
  
  // const totalPossessions = gameStats.homeTeam.possessions + gameStats.awayTeam.possessions;
  const paceFactor = (48 / gameTimeMinutes); // Normalize to 48 minutes
  
  gameStats.homeTeam.pace = (gameStats.homeTeam.possessions * paceFactor);
  gameStats.awayTeam.pace = (gameStats.awayTeam.possessions * paceFactor);
  
  gameStats.finalScore.home = gameStats.homeTeam.teamTotals.points;
  gameStats.finalScore.away = gameStats.awayTeam.teamTotals.points;
  
  // Calculate plus/minus for all players
  calculatePlusMinus(gameStats);
}

/**
 * Calculate plus/minus for all players based on play-by-play
 */
function calculatePlusMinus(gameStats: GameStats): void {
  // This would require tracking which players were on court for each scoring play
  // For now, we'll use a simplified version based on team performance
  const scoreDiff = gameStats.finalScore.home - gameStats.finalScore.away;
  
  // Distribute plus/minus based on minutes played (simplified)
  for (const playerStats of Object.values(gameStats.homeTeam.players)) {
    playerStats.plusMinus = scoreDiff * (playerStats.minutes / 240); // 240 = 48 minutes * 5 players
  }
  
  for (const playerStats of Object.values(gameStats.awayTeam.players)) {
    playerStats.plusMinus = -scoreDiff * (playerStats.minutes / 240);
  }
}

/**
 * Generate a stats summary for display
 */
export function generateStatsSummary(gameStats: GameStats): string {
  const home = gameStats.homeTeam;
  const away = gameStats.awayTeam;
  
  let summary = `\n=== GAME STATS SUMMARY ===\n`;
  summary += `Final Score: ${gameStats.finalScore.home} - ${gameStats.finalScore.away}\n`;
  summary += `Game Length: ${gameStats.gameLength.toFixed(1)} minutes\n`;
  summary += `Pace: ${home.pace.toFixed(1)} possessions per 48min\n\n`;
  
  // Top performers
  const homeTopScorer = Object.values(home.players).reduce((a, b) => a.points > b.points ? a : b);
  const awayTopScorer = Object.values(away.players).reduce((a, b) => a.points > b.points ? a : b);
  
  summary += `Top Scorers:\n`;
  summary += `  Home: Player ${homeTopScorer.playerId} - ${homeTopScorer.points} pts, ${homeTopScorer.fieldGoalsMade}/${homeTopScorer.fieldGoalsAttempted} FG\n`;
  summary += `  Away: Player ${awayTopScorer.playerId} - ${awayTopScorer.points} pts, ${awayTopScorer.fieldGoalsMade}/${awayTopScorer.fieldGoalsAttempted} FG\n\n`;
  
  // Team totals
  summary += `Team Shooting:\n`;
  summary += `  Home: ${home.teamTotals.fieldGoalsMade}/${home.teamTotals.fieldGoalsAttempted} FG (${(home.teamTotals.fieldGoalsMade/home.teamTotals.fieldGoalsAttempted*100).toFixed(1)}%)\n`;
  summary += `  Away: ${away.teamTotals.fieldGoalsMade}/${away.teamTotals.fieldGoalsAttempted} FG (${(away.teamTotals.fieldGoalsMade/away.teamTotals.fieldGoalsAttempted*100).toFixed(1)}%)\n`;
  
  return summary;
}