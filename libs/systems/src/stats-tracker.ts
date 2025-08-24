import type {
  PlayerStats,
  TeamStats,
  GameStats,
  PlayOutcome,
  Action,
  Id,
  Team,
  Player,
  StatsTracker as IStatsTracker,
} from '@basketball-sim/types';
import { getShotZone } from '@basketball-sim/math';

export class StatsTracker implements IStatsTracker {
  initializePlayerStats(playerId: Id): PlayerStats {
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
        close: { made: 0, attempted: 0 },
        mid: { made: 0, attempted: 0 },
        three: { made: 0, attempted: 0 },
      },
      trueShootingAttempts: 0,
      effectiveFieldGoalPercentage: 0,
      plusMinus: 0,
    };
  }

  initializeTeamStats(team: Team): TeamStats {
    const playerStats: Record<Id, PlayerStats> = {};

    for (const player of team.players) {
      playerStats[player.id] = this.initializePlayerStats(player.id);
    }

    const teamTotals = this.initializePlayerStats('team-total');
    // Set team totals defaults properly for team-wide stats
    teamTotals.playerId = team.id;
    teamTotals.minutes = 0; // Team doesn't have minutes
    teamTotals.plusMinus = 0; // Will be calculated differently

    return {
      teamId: team.id,
      players: playerStats,
      teamTotals,
      possessions: 0,
      pace: 0,
    };
  }

  initializeGameStats(gameId: Id, homeTeam: Team, awayTeam: Team): GameStats {
    return {
      gameId,
      homeTeam: this.initializeTeamStats(homeTeam),
      awayTeam: this.initializeTeamStats(awayTeam),
      finalScore: { home: 0, away: 0 },
      gameLength: 0,
      playByPlay: [],
    };
  }

  recordPlay(
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
      timestamp,
    });

    // Update possession usage
    if (['drive', 'pullup', 'catchShoot', 'post'].includes(action)) {
      playerStats.possessionsUsed++;
      teamStats.teamTotals.possessionsUsed++;
    }

    // Record outcome-specific stats
    switch (outcome.kind) {
      case 'shot':
        this.recordShotOutcome(playerStats, teamStats.teamTotals, outcome, playerPosition);
        break;
      case 'drive':
        this.recordDriveOutcome(playerStats, teamStats.teamTotals, outcome);
        break;
      case 'pass':
        this.recordPassOutcome(playerStats, teamStats.teamTotals, outcome);
        break;
      case 'rebound':
        this.recordReboundOutcome(playerStats, teamStats.teamTotals, outcome, playerId);
        break;
      case 'foul':
        this.recordFoulOutcome(gameStats, outcome, isHomeTeam);
        break;
    }
  }

  recordShotOutcome(playerStats: PlayerStats, teamTotals: PlayerStats, outcome: any, playerPosition: any): void {
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
    this.updateShootingEfficiency(playerStats);
    this.updateShootingEfficiency(teamTotals);
  }

  recordAssist(gameStats: GameStats, assistPlayerId: Id, isHomeTeam: boolean): void {
    const teamStats = isHomeTeam ? gameStats.homeTeam : gameStats.awayTeam;
    const playerStats = teamStats.players[assistPlayerId];

    if (playerStats) {
      playerStats.assists++;
      teamStats.teamTotals.assists++;
    }
  }

  simulateFreeThrows(player: Player, attempts: number, clutchContext: number, rng: () => number): number {
    // Base probability from ft rating (25-99 scale)
    const ftRating = player.ratings.ft;
    const ftZ = (ftRating - 50) / 12; // Convert to z-score

    // Apply RTTB formula: base score from rating + consistency + clutch
    const baseScore = ftZ * 0.8; // Base coefficient for FT shooting
    const consistencyMod = ((player.ratings.consistency - 50) / 12) * 0.1; // Reduces variance
    const clutchMod = ((player.ratings.clutch - 50) / 12) * clutchContext * 0.15; // Late game boost

    // Noise based on consistency (lower consistency = more variance)
    const noise = (1 - player.ratings.consistency / 100) * 0.2;

    let makes = 0;
    for (let i = 0; i < attempts; i++) {
      const variance = (rng() - 0.5) * noise;
      const finalScore = baseScore + consistencyMod + clutchMod + variance;
      const probability = 1 / (1 + Math.exp(-finalScore)); // Logistic function

      if (rng() < probability) {
        makes++;
      }
    }

    return makes;
  }

  recordFreeThrows(gameStats: GameStats, playerId: Id, attempts: number, makes: number, isHomeTeam: boolean): void {
    const teamStats = isHomeTeam ? gameStats.homeTeam : gameStats.awayTeam;
    const playerStats = teamStats.players[playerId];

    if (playerStats) {
      playerStats.freeThrowsAttempted += attempts;
      playerStats.freeThrowsMade += makes;
      playerStats.points += makes;

      // Update team totals
      teamStats.teamTotals.freeThrowsAttempted += attempts;
      teamStats.teamTotals.freeThrowsMade += makes;
      teamStats.teamTotals.points += makes;
    }
  }

  recordDriveOutcome(playerStats: PlayerStats, teamTotals: PlayerStats, outcome: any): void {
    playerStats.drives++;
    teamTotals.drives++;

    if (outcome.blowby) {
      playerStats.drivesSuccessful++;
      teamTotals.drivesSuccessful++;
    }
  }

  recordPassOutcome(playerStats: PlayerStats, teamTotals: PlayerStats, outcome: any): void {
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

  recordReboundOutcome(playerStats: PlayerStats, teamTotals: PlayerStats, outcome: any, playerId: Id): void {
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

  recordFoulOutcome(gameStats: GameStats, outcome: any, isHomeTeam: boolean): void {
    const teamStats = isHomeTeam ? gameStats.homeTeam : gameStats.awayTeam;
    const playerStats = teamStats.players[outcome.on];

    if (playerStats) {
      playerStats.foulsCommitted++;
      teamStats.teamTotals.foulsCommitted++;
    }
  }

  updateShootingEfficiency(stats: PlayerStats): void {
    if (stats.fieldGoalsAttempted > 0) {
      const efg = (stats.fieldGoalsMade + 0.5 * stats.threePointersMade) / stats.fieldGoalsAttempted;
      stats.effectiveFieldGoalPercentage = efg;

      stats.trueShootingAttempts = stats.fieldGoalsAttempted + 0.44 * stats.freeThrowsAttempted;
    }
  }

  updatePossessions(gameStats: GameStats, isHomeTeam: boolean): void {
    const teamStats = isHomeTeam ? gameStats.homeTeam : gameStats.awayTeam;
    teamStats.possessions++;
  }

  updateMinutesPlayed(
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

  finalizeGameStats(gameStats: GameStats, gameTimeMinutes: number): void {
    gameStats.gameLength = gameTimeMinutes;

    // const totalPossessions = gameStats.homeTeam.possessions + gameStats.awayTeam.possessions;
    const paceFactor = 48 / gameTimeMinutes; // Normalize to 48 minutes

    gameStats.homeTeam.pace = gameStats.homeTeam.possessions * paceFactor;
    gameStats.awayTeam.pace = gameStats.awayTeam.possessions * paceFactor;

    gameStats.finalScore.home = gameStats.homeTeam.teamTotals.points;
    gameStats.finalScore.away = gameStats.awayTeam.teamTotals.points;

    // Calculate plus/minus for all players
    this.calculatePlusMinus(gameStats);
  }

  calculatePlusMinus(gameStats: GameStats): void {
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
}