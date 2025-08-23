/**
 * Centralized display utilities to eliminate repetitive formatting code
 * Provides consistent formatting across all display functions
 */

import { CONFIG } from './config.js';
import { logger } from './logger.js';
import { formatHeight } from './utils.js';
import type { Team, Player, PlayerStats, TeamStats } from '@basketball-sim/types';

// Formatting utilities
export class Formatter {
  static percentage(value: number, attempted: number, decimals = CONFIG.DISPLAY.DECIMAL_PLACES.PERCENTAGE): string {
    if (attempted === 0) return '0.0';
    return ((value / attempted) * 100).toFixed(decimals);
  }

  static minutes(minutes: number): string {
    return minutes.toFixed(CONFIG.DISPLAY.DECIMAL_PLACES.MINUTES);
  }

  static rating(rating: number): string {
    return rating.toFixed(CONFIG.DISPLAY.DECIMAL_PLACES.RATING);
  }

  static playerName(name: string): string {
    return name.padEnd(CONFIG.DISPLAY.PLAYER_NAME_MAX_LENGTH);
  }

  static height(heightCm: number): string {
    return formatHeight(heightCm);
  }

  static padNumber(num: number, width: number): string {
    return String(num).padStart(width);
  }

  static padString(str: string, width: number): string {
    return str.padEnd(width);
  }
}

// Table builder for consistent table formatting
export class TableBuilder {
  private headers: string[] = [];
  private rows: string[][] = [];
  private columnWidths: number[] = [];

  addHeader(headers: string[]): this {
    this.headers = headers;
    this.columnWidths = headers.map(h => h.length);
    return this;
  }

  addRow(row: string[]): this {
    this.rows.push(row);
    // Update column widths
    row.forEach((cell, i) => {
      if (i < this.columnWidths.length) {
        this.columnWidths[i] = Math.max(this.columnWidths[i], cell.length);
      }
    });
    return this;
  }

  private formatRow(row: string[], separator = '│'): string {
    return `${separator} ${row
      .map((cell, i) => cell.padEnd(this.columnWidths[i]))
      .join(` ${separator} `)} ${separator}`;
  }

  // private createSeparator(char = '─', junction = '┼'): string {
  //   const segments = this.columnWidths.map(width => char.repeat(width + 2));
  //   return `┌${segments.join(junction)}┐`.replace(/┌/g, '├').replace(/┐/g, '┤');
  // }

  build(): string {
    if (this.headers.length === 0) return '';

    const lines: string[] = [];

    // Top border
    lines.push(`┌${this.columnWidths.map(w => '─'.repeat(w + 2)).join('┬')}┐`);

    // Header
    lines.push(this.formatRow(this.headers));

    // Header separator
    lines.push(`├${this.columnWidths.map(w => '─'.repeat(w + 2)).join('┼')}┤`);

    // Data rows
    this.rows.forEach(row => {
      lines.push(this.formatRow(row));
    });

    // Bottom border
    lines.push(`└${this.columnWidths.map(w => '─'.repeat(w + 2)).join('┴')}┘`);

    return lines.join('\n');
  }
}

// Player display utilities
export class PlayerDisplay {
  static getOverall(player: Player): number {
    // Import the actual calculation function when available
    // For now, use a simplified version
    const ratings = player.ratings;
    const keyRatings = [
      ratings.three,
      ratings.mid,
      ratings.finishing,
      ratings.pass,
      ratings.handle,
      ratings.onBallDef,
      ratings.rebound,
      ratings.iq
    ];
    return Math.round(keyRatings.reduce((sum, rating) => sum + rating, 0) / keyRatings.length);
  }

  static getRole(index: number): string {
    if (index === 0) return '⭐';
    if (index < 5) return '🟢';
    return '🟡';
  }

  static formatBasicInfo(player: Player, overall?: number): string {
    const ovr = overall ?? this.getOverall(player);
    const height = Formatter.height(player.ratings.height);
    const traitCount = player.traits?.length || 0;
    const badgeCount = player.badges?.filter(b => b.currentTier > 0).length || 0;

    return `${player.name}: ${ovr} OVR ${height} | ${traitCount} traits, ${badgeCount} badges`;
  }

  static formatTraits(player: Player): string[] {
    if (!player.traits || player.traits.length === 0) {
      return ['  🎭 No traits'];
    }

    const lines = ['  📋 Traits:'];
    for (const trait of player.traits) {
      const tags = trait.tags ? ` [${trait.tags.join(', ')}]` : '';
      lines.push(`    • ${trait.name} (${trait.kind})${tags}`);
      lines.push(`      ${trait.description}`);
    }
    return lines;
  }

  static formatBadges(player: Player): string[] {
    const unlockedBadges = player.badges?.filter(b => b.currentTier > 0) || [];

    if (unlockedBadges.length === 0) {
      return ['  🏆 No badges unlocked yet'];
    }

    const lines = ['  🏆 Active Badges:'];
    for (const badgeProgress of unlockedBadges) {
      const tier = badgeProgress.currentTier;
      lines.push(`    • Badge ${badgeProgress.badgeId} (Tier ${tier})`);
    }
    return lines;
  }

  static formatRelationships(player: Player): string[] {
    if (!player.relationships) {
      return [];
    }

    return [
      '  🤝 Relationships:',
      `    Coach Trust: ${player.relationships.coachTrust}/100`,
      `    Morale: ${player.relationships.morale}/100`,
      `    Reputation: ${player.relationships.rep}/100`
    ];
  }
}

// Team display utilities
export class TeamDisplay {
  static formatTeamHeader(team: Team, overall: number): string {
    return `\n📋 ${team.name} (${overall} OVR) - RTTB Enhanced`;
  }

  static formatStarPlayer(player: Player, overall: number): string {
    return `⭐ Star Player: ${player.name} (${overall} OVR)`;
  }

  static formatRosterInfo(team: Team): string {
    return `👥 Roster: ${team.players.length} players`;
  }

  static formatPlayerList(players: Array<Player & { overall: number }>): string[] {
    const lines = ['🏀 Key Players:'];
    players.forEach((p, i) => {
      const role = PlayerDisplay.getRole(i);
      const info = PlayerDisplay.formatBasicInfo(p, p.overall);
      lines.push(`   ${role} ${info}`);
    });
    return lines;
  }

  static getTeamOverall(team: Team): number {
    if (team.players.length === 0) return 0;

    // Calculate team overall as weighted average of player overalls
    // Top 8 players get full weight, others get reduced weight
    const playersWithOverall = team.players
      .map(p => ({ player: p, overall: PlayerDisplay.getOverall(p) }))
      .sort((a, b) => b.overall - a.overall);

    let totalWeight = 0;
    let weightedSum = 0;

    playersWithOverall.forEach((p, index) => {
      const weight = index < 8 ? 1.0 : 0.3; // Top 8 get full weight, others reduced
      weightedSum += p.overall * weight;
      totalWeight += weight;
    });

    return Math.round(weightedSum / totalWeight);
  }

  static findStarPlayer(team: Team): { player: Player; overall: number } {
    if (team.players.length === 0) {
      throw new Error('Team has no players');
    }

    const playersWithOverall = team.players.map(p => ({
      player: p,
      overall: PlayerDisplay.getOverall(p)
    }));

    // Find the player with the highest overall rating
    const starPlayer = playersWithOverall.reduce((best, current) => (current.overall > best.overall ? current : best));

    return starPlayer;
  }
}

// Box score display utilities
export class BoxScoreDisplay {
  static formatGameSummary(
    homeTeam: Team,
    awayTeam: Team,
    finalScore: { home: number; away: number },
    gameLength: number
  ): string[] {
    const homeWon = finalScore.home > finalScore.away;
    const margin = Math.abs(finalScore.home - finalScore.away);

    return [
      '📊 GAME SUMMARY:',
      `${homeTeam.name} ${finalScore.home} - ${finalScore.away} ${awayTeam.name} ${
        homeWon ? '(W)' : '(L)'
      } by ${margin}`,
      `Game Length: ${Formatter.minutes(gameLength)} minutes`
    ];
  }

  static createPlayerStatsTable(teamStats: TeamStats, team: Team): string {
    const playersWithStats = Object.values(teamStats.players)
      .filter((p: PlayerStats) => p.minutes > 0)
      .sort((a: PlayerStats, b: PlayerStats) => b.minutes - a.minutes);

    const table = new TableBuilder().addHeader([
      'Player',
      'MIN',
      'PTS',
      'FGM',
      'FGA',
      '3PM',
      '3PA',
      'FTM',
      'FTA',
      'REB',
      'AST'
    ]);

    playersWithStats.forEach((p: PlayerStats) => {
      const playerName = team.players.find(player => player.id === p.playerId)?.name || p.playerId;
      table.addRow([
        Formatter.playerName(playerName),
        Formatter.minutes(p.minutes),
        Formatter.padNumber(p.points, 3),
        Formatter.padNumber(p.fieldGoalsMade, 3),
        Formatter.padNumber(p.fieldGoalsAttempted, 3),
        Formatter.padNumber(p.threePointersMade, 3),
        Formatter.padNumber(p.threePointersAttempted, 3),
        Formatter.padNumber(p.freeThrowsMade, 3),
        Formatter.padNumber(p.freeThrowsAttempted, 3),
        Formatter.padNumber(p.totalRebounds, 3),
        Formatter.padNumber(p.assists, 3)
      ]);
    });

    return table.build();
  }

  static createTeamStatsTable(homeTeam: Team, awayTeam: Team, homeStats: TeamStats, awayStats: TeamStats): string {
    const homeFGP = Formatter.percentage(homeStats.teamTotals.fieldGoalsMade, homeStats.teamTotals.fieldGoalsAttempted);
    const home3PP = Formatter.percentage(
      homeStats.teamTotals.threePointersMade,
      homeStats.teamTotals.threePointersAttempted
    );
    const homeFTP = Formatter.percentage(homeStats.teamTotals.freeThrowsMade, homeStats.teamTotals.freeThrowsAttempted);

    const awayFGP = Formatter.percentage(awayStats.teamTotals.fieldGoalsMade, awayStats.teamTotals.fieldGoalsAttempted);
    const away3PP = Formatter.percentage(
      awayStats.teamTotals.threePointersMade,
      awayStats.teamTotals.threePointersAttempted
    );
    const awayFTP = Formatter.percentage(awayStats.teamTotals.freeThrowsMade, awayStats.teamTotals.freeThrowsAttempted);

    const table = new TableBuilder()
      .addHeader(['Team', 'Points', 'FG%', '3P%', 'FT%', 'REB'])
      .addRow([
        Formatter.padString(homeTeam.name, 19),
        Formatter.padNumber(homeStats.teamTotals.points, 7),
        `${homeFGP}%`,
        `${home3PP}%`,
        `${homeFTP}%`,
        Formatter.padNumber(homeStats.teamTotals.totalRebounds, 7)
      ])
      .addRow([
        Formatter.padString(awayTeam.name, 19),
        Formatter.padNumber(awayStats.teamTotals.points, 7),
        `${awayFGP}%`,
        `${away3PP}%`,
        `${awayFTP}%`,
        Formatter.padNumber(awayStats.teamTotals.totalRebounds, 7)
      ]);

    return table.build();
  }

  static formatBenchPlayers(team: Team, teamStats: TeamStats): string {
    const benchPlayers = team.players.filter(
      player => !teamStats.players[player.id] || teamStats.players[player.id].minutes === 0
    );

    if (benchPlayers.length === 0) return '';
    return `💺 Did not play: ${benchPlayers.map(p => p.name).join(', ')}`;
  }
}

// Main display orchestrator
export class GameDisplay {
  static displayTeamInfo(team: Team): void {
    const overall = TeamDisplay.getTeamOverall ? TeamDisplay.getTeamOverall(team) : 75; // Fallback
    const star = TeamDisplay.findStarPlayer
      ? TeamDisplay.findStarPlayer(team)
      : { player: team.players[0], overall: 75 };

    logger.info('DISPLAY', TeamDisplay.formatTeamHeader(team, overall));
    logger.info('DISPLAY', TeamDisplay.formatStarPlayer(star.player, star.overall));
    logger.info('DISPLAY', TeamDisplay.formatRosterInfo(team));

    // Show top 8 players
    const sortedPlayers = team.players
      .map(p => ({ ...p, overall: PlayerDisplay.getOverall(p) }))
      .sort((a, b) => b.overall - a.overall)
      .slice(0, 8);

    const playerLines = TeamDisplay.formatPlayerList(sortedPlayers);
    playerLines.forEach(line => logger.info('DISPLAY', line));

    // Show star player details
    if (star.player.traits || star.player.badges) {
      this.displayPlayerTraits(star.player);
    }
  }

  static displayPlayerTraits(player: Player): void {
    logger.info('DISPLAY', `\n🎯 ${player.name} - Traits & Badges:`);

    const traitLines = PlayerDisplay.formatTraits(player);
    traitLines.forEach(line => logger.info('DISPLAY', line));

    const badgeLines = PlayerDisplay.formatBadges(player);
    badgeLines.forEach(line => logger.info('DISPLAY', line));

    const relationshipLines = PlayerDisplay.formatRelationships(player);
    relationshipLines.forEach(line => logger.info('DISPLAY', line));
  }

  static displayFullBoxScore(
    homeTeam: Team,
    awayTeam: Team,
    finalScore: { home: number; away: number },
    gameStats: { homeTeam: TeamStats; awayTeam: TeamStats; gameLength: number }
  ): void {
    logger.info('DISPLAY', '═'.repeat(120));
    logger.info('DISPLAY', '🏆 FINAL RESULTS');
    logger.info('DISPLAY', '═'.repeat(120));

    // Game summary
    const summaryLines = BoxScoreDisplay.formatGameSummary(homeTeam, awayTeam, finalScore, gameStats.gameLength);
    summaryLines.forEach(line => logger.info('DISPLAY', line));

    // Team box scores
    this.displayTeamBoxScore(homeTeam, gameStats.homeTeam, 'HOME');
    this.displayTeamBoxScore(awayTeam, gameStats.awayTeam, 'AWAY');

    // Team stats comparison
    logger.info('DISPLAY', '\n📈 TEAM STATS:');
    const teamStatsTable = BoxScoreDisplay.createTeamStatsTable(
      homeTeam,
      awayTeam,
      gameStats.homeTeam,
      gameStats.awayTeam
    );
    logger.info('DISPLAY', teamStatsTable);
  }

  static displayTeamBoxScore(team: Team, teamStats: TeamStats, label: string): void {
    logger.info('DISPLAY', `\n🏀 ${label} - ${team.name.toUpperCase()} BOX SCORE:`);

    const boxScoreTable = BoxScoreDisplay.createPlayerStatsTable(teamStats, team);
    logger.info('DISPLAY', boxScoreTable);

    const benchInfo = BoxScoreDisplay.formatBenchPlayers(team, teamStats);
    if (benchInfo) {
      logger.info('DISPLAY', benchInfo);
    }
  }
}

// Export all utilities
export default GameDisplay;
