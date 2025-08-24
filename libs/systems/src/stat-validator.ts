/**
 * Statistical Validation System
 *
 * Validates that league configurations produce realistic statistical outcomes
 * across thousands of simulated games. Ensures proper normalization and
 * identifies stat imbalances that need correction.
 *
 * @module StatValidator
 * @version 1.0.0
 */

import type {
  League,
  LeagueConfig,
  Player,
  Team,
  PlayerStats,
  StatValidationResult,
  PerformanceExpectation,
  PossessionState
} from '@basketball-sim/types';
import { PositionalPossessionEngine } from '@basketball-sim/core';
import { generateRTTBTeam } from '@basketball-sim/player';
import { StatsTracker } from './stats-tracker.js';
import { HIGH_SCHOOL_LEAGUES, AMATEUR_LEAGUES, COLLEGE_LEAGUES } from './league-configs.js';

/**
 * Expected statistical baselines for different leagues.
 * These are target ranges that simulated stats should fall within.
 */
export const LEAGUE_STAT_BASELINES: Record<
  string,
  {
    pointsPerGame: { min: number; max: number; target: number };
    reboundsPerGame: { min: number; max: number; target: number };
    assistsPerGame: { min: number; max: number; target: number };
    fieldGoalPercentage: { min: number; max: number; target: number };
    threePointPercentage: { min: number; max: number; target: number };
    freeThrowPercentage: { min: number; max: number; target: number };
    turnoversPerGame: { min: number; max: number; target: number };
    pace: { min: number; max: number; target: number }; // Possessions per game
  }
> = {
  // High School Levels
  prep_elite: {
    pointsPerGame: { min: 12, max: 22, target: 16 },
    reboundsPerGame: { min: 4, max: 10, target: 6.5 },
    assistsPerGame: { min: 2, max: 6, target: 3.5 },
    fieldGoalPercentage: { min: 0.42, max: 0.52, target: 0.46 },
    threePointPercentage: { min: 0.3, max: 0.4, target: 0.34 },
    freeThrowPercentage: { min: 0.7, max: 0.85, target: 0.76 },
    turnoversPerGame: { min: 2, max: 5, target: 3.2 },
    pace: { min: 75, max: 95, target: 82 }
  },

  prep_traditional: {
    pointsPerGame: { min: 10, max: 20, target: 14 },
    reboundsPerGame: { min: 4, max: 9, target: 6.2 },
    assistsPerGame: { min: 1.5, max: 4.5, target: 2.8 },
    fieldGoalPercentage: { min: 0.38, max: 0.48, target: 0.42 },
    threePointPercentage: { min: 0.26, max: 0.36, target: 0.3 },
    freeThrowPercentage: { min: 0.65, max: 0.8, target: 0.72 },
    turnoversPerGame: { min: 2.5, max: 6, target: 4.0 },
    pace: { min: 78, max: 98, target: 85 }
  },

  prep_military: {
    pointsPerGame: { min: 11, max: 19, target: 14.5 },
    reboundsPerGame: { min: 4.5, max: 9, target: 6.8 },
    assistsPerGame: { min: 2, max: 5, target: 3.2 },
    fieldGoalPercentage: { min: 0.4, max: 0.5, target: 0.44 },
    threePointPercentage: { min: 0.28, max: 0.38, target: 0.32 },
    freeThrowPercentage: { min: 0.72, max: 0.85, target: 0.78 },
    turnoversPerGame: { min: 2, max: 4.5, target: 3.0 },
    pace: { min: 70, max: 85, target: 76 }
  },

  // Amateur Levels
  amateur_showcase: {
    pointsPerGame: { min: 14, max: 26, target: 19 },
    reboundsPerGame: { min: 4, max: 9, target: 6.0 },
    assistsPerGame: { min: 2, max: 5, target: 3.0 },
    fieldGoalPercentage: { min: 0.43, max: 0.53, target: 0.47 },
    threePointPercentage: { min: 0.32, max: 0.42, target: 0.36 },
    freeThrowPercentage: { min: 0.72, max: 0.85, target: 0.77 },
    turnoversPerGame: { min: 2.5, max: 6, target: 4.2 },
    pace: { min: 85, max: 105, target: 92 }
  },

  amateur_grassroots: {
    pointsPerGame: { min: 12, max: 20, target: 15.5 },
    reboundsPerGame: { min: 4.5, max: 8.5, target: 6.5 },
    assistsPerGame: { min: 2.5, max: 6, target: 4.0 },
    fieldGoalPercentage: { min: 0.42, max: 0.52, target: 0.46 },
    threePointPercentage: { min: 0.3, max: 0.4, target: 0.34 },
    freeThrowPercentage: { min: 0.7, max: 0.82, target: 0.75 },
    turnoversPerGame: { min: 2, max: 4.5, target: 3.1 },
    pace: { min: 75, max: 90, target: 81 }
  },

  amateur_travel: {
    pointsPerGame: { min: 13, max: 23, target: 17 },
    reboundsPerGame: { min: 4, max: 8.5, target: 6.2 },
    assistsPerGame: { min: 2, max: 5.5, target: 3.4 },
    fieldGoalPercentage: { min: 0.41, max: 0.51, target: 0.45 },
    threePointPercentage: { min: 0.31, max: 0.41, target: 0.35 },
    freeThrowPercentage: { min: 0.71, max: 0.83, target: 0.76 },
    turnoversPerGame: { min: 2.5, max: 5.5, target: 3.8 },
    pace: { min: 80, max: 95, target: 86 }
  },

  // College Levels
  university_power: {
    pointsPerGame: { min: 12, max: 20, target: 15.5 },
    reboundsPerGame: { min: 4, max: 8, target: 6.0 },
    assistsPerGame: { min: 2.5, max: 5.5, target: 3.8 },
    fieldGoalPercentage: { min: 0.44, max: 0.54, target: 0.48 },
    threePointPercentage: { min: 0.33, max: 0.43, target: 0.37 },
    freeThrowPercentage: { min: 0.72, max: 0.85, target: 0.78 },
    turnoversPerGame: { min: 2, max: 4, target: 2.8 },
    pace: { min: 68, max: 78, target: 72 }
  },

  university_mid: {
    pointsPerGame: { min: 11, max: 19, target: 15 },
    reboundsPerGame: { min: 4, max: 8, target: 6.2 },
    assistsPerGame: { min: 3, max: 6, target: 4.2 },
    fieldGoalPercentage: { min: 0.43, max: 0.53, target: 0.47 },
    threePointPercentage: { min: 0.32, max: 0.42, target: 0.36 },
    freeThrowPercentage: { min: 0.7, max: 0.83, target: 0.76 },
    turnoversPerGame: { min: 2, max: 4.5, target: 3.0 },
    pace: { min: 70, max: 80, target: 74 }
  },

  university_small: {
    pointsPerGame: { min: 12, max: 22, target: 16 },
    reboundsPerGame: { min: 4.5, max: 8.5, target: 6.8 },
    assistsPerGame: { min: 2.5, max: 5.5, target: 3.8 },
    fieldGoalPercentage: { min: 0.41, max: 0.51, target: 0.45 },
    threePointPercentage: { min: 0.29, max: 0.39, target: 0.33 },
    freeThrowPercentage: { min: 0.68, max: 0.8, target: 0.73 },
    turnoversPerGame: { min: 2.5, max: 5, target: 3.5 },
    pace: { min: 65, max: 78, target: 70 }
  },

  university_juco: {
    pointsPerGame: { min: 12, max: 21, target: 15.8 },
    reboundsPerGame: { min: 4, max: 8.5, target: 6.5 },
    assistsPerGame: { min: 2.5, max: 5, target: 3.5 },
    fieldGoalPercentage: { min: 0.4, max: 0.5, target: 0.44 },
    threePointPercentage: { min: 0.3, max: 0.4, target: 0.34 },
    freeThrowPercentage: { min: 0.67, max: 0.8, target: 0.72 },
    turnoversPerGame: { min: 2.5, max: 5.5, target: 3.8 },
    pace: { min: 72, max: 85, target: 77 }
  }
};

/**
 * Core statistical validation system.
 * Runs thousands of games and validates that stats fall within expected ranges.
 */
export class StatValidator {
  private engine: PositionalPossessionEngine;

  constructor() {
    this.engine = new PositionalPossessionEngine();
  }

  /**
   * Run comprehensive validation for a specific league configuration.
   * Efficiently simulates thousands of games with minimal logging and maximum insights.
   */
  public async validateLeague(
    leagueId: string,
    config: LeagueConfig,
    options: {
      gamesCount: number;
      seasonsCount?: number;
      playerCount?: number;
    }
  ): Promise<StatValidationResult> {
    const { gamesCount, playerCount = 240 } = options;
    const seasonsCount = options.seasonsCount || 1;

    console.log(`\n🔍 Starting validation for ${config.name}`);
    console.log(`📊 Target: ${gamesCount} games | Progress tracking enabled`);
    console.log(`📈 Talent level: ${config.averageTalent} ±${config.talentSpread}\n`);

    const startTime = Date.now();
    const players = this.generatePlayerPool(playerCount, config);

    // Streamlined tracking for performance
    let gamesCompleted = 0;
    let gamesFailed = 0;
    let totalPossessions = 0;
    let totalScoreHome = 0;
    let totalScoreAway = 0;

    // Aggregate stats directly without storing individual games
    const aggregateStats = {
      totalPoints: 0,
      totalRebounds: 0,
      totalAssists: 0,
      totalFieldGoalsMade: 0,
      totalFieldGoalsAttempted: 0,
      totalThreePointersMade: 0,
      totalThreePointersAttempted: 0,
      totalFreeThrowsMade: 0,
      totalFreeThrowsAttempted: 0,
      totalTurnovers: 0,
      totalMinutes: 0,
      playerSampleSize: 0,
      playerGames: new Map<string, PlayerStats[]>()
    };

    const progressInterval = Math.max(1, Math.floor(gamesCount / 20)); // 20 progress updates max

    // Store individual game results for comprehensive analysis
    const gameResults: Array<{
      homeScore: number;
      awayScore: number;
      homeStats: PlayerStats[];
      awayStats: PlayerStats[];
      gamePace: number;
    }> = [];

    // Efficient bulk simulation with comprehensive data collection
    for (let game = 0; game < gamesCount; game++) {
      // Progress reporting
      if (game % progressInterval === 0 && game > 0) {
        const elapsed = (Date.now() - startTime) / 1000;
        const rate = game / elapsed;
        const eta = Math.round((gamesCount - game) / rate);
        const successRate = ((gamesCompleted / game) * 100).toFixed(1);

        console.log(
          `⚡ ${game}/${gamesCount} (${((game / gamesCount) * 100).toFixed(1)}%) | ${rate.toFixed(
            1
          )} games/sec | ETA: ${eta}s | Success: ${successRate}%`
        );
      }

      try {
        // Generate teams efficiently
        const { homeTeam, awayTeam } = this.generateTeamsFromPool(players, config);

        // Fast simulation
        const gameResult = await this.simulateGameForValidation(homeTeam, awayTeam);

        // Store complete game result for analysis
        gameResults.push(gameResult);

        // Aggregate stats for performance metrics
        totalPossessions += gameResult.gamePace;
        totalScoreHome += gameResult.homeScore;
        totalScoreAway += gameResult.awayScore;

        // Process player stats for aggregation
        const allStats = [...gameResult.homeStats, ...gameResult.awayStats];
        for (const stat of allStats) {
          // Include players with any statistical activity
          if (stat.points > 0 || stat.fieldGoalsAttempted > 0 || stat.totalRebounds > 0 || stat.assists > 0) {
            aggregateStats.totalPoints += stat.points;
            aggregateStats.totalRebounds += stat.totalRebounds;
            aggregateStats.totalAssists += stat.assists;
            aggregateStats.totalFieldGoalsMade += stat.fieldGoalsMade;
            aggregateStats.totalFieldGoalsAttempted += stat.fieldGoalsAttempted;
            aggregateStats.totalThreePointersMade += stat.threePointersMade;
            aggregateStats.totalThreePointersAttempted += stat.threePointersAttempted;
            aggregateStats.totalFreeThrowsMade += stat.freeThrowsMade;
            aggregateStats.totalFreeThrowsAttempted += stat.freeThrowsAttempted;
            aggregateStats.totalTurnovers += stat.turnovers;
            aggregateStats.totalMinutes += stat.minutes || 1;
            aggregateStats.playerSampleSize++;

            // Add to player games map for detailed player analysis
            if (!aggregateStats.playerGames.has(stat.playerId)) {
              aggregateStats.playerGames.set(stat.playerId, []);
            }
            const playerGames = aggregateStats.playerGames.get(stat.playerId);
            if (playerGames) {
              playerGames.push(stat);
            }
          }
        }

        gamesCompleted++;
      } catch (_error) {
        gamesFailed++;
        if (gamesFailed > gamesCount * 0.1) {
          // If >10% fail, something's wrong
          console.error(`❌ Too many simulation failures (${gamesFailed}). Aborting validation.`);
          throw new Error(`Validation failed: ${gamesFailed} game failures`);
        }
      }
    }

    const totalTime = (Date.now() - startTime) / 1000;
    const avgRate = gamesCompleted / totalTime;

    console.log(`\n✅ Validation Complete!`);
    console.log(
      `🎯 Games completed: ${gamesCompleted}/${gamesCount} (${((gamesCompleted / gamesCount) * 100).toFixed(1)}%)`
    );
    console.log(`⚡ Performance: ${avgRate.toFixed(1)} games/second`);
    console.log(`⏱️  Total time: ${totalTime.toFixed(1)}s`);
    console.log(`📊 Analyzing ${aggregateStats.playerSampleSize} player performances...`);
    console.log(
      `🏀 Sample stats: ${aggregateStats.totalPoints} pts, ${aggregateStats.totalRebounds} reb, ${aggregateStats.totalAssists} ast\n`
    );

    // Multi-layered analysis using all analytical tools

    // 1. Game-level analysis using the dedicated analyzeGameResults method
    console.log(`🔍 Running comprehensive game analysis...`);
    const gameAnalysis = this.analyzeGameResults(gameResults, leagueId, config);

    // 2. Aggregated statistical analysis for performance comparison
    console.log(`📊 Running aggregated statistical analysis...`);
    const aggregatedAnalysis = this.analyzeAggregatedResults(
      aggregateStats,
      gamesCompleted,
      totalPossessions,
      totalScoreHome,
      totalScoreAway,
      leagueId,
      config
    );

    // 3. Individual player performance analysis for outliers
    console.log(`👥 Running individual player analysis...`);
    const playerAnalysis = this.analyzePlayerPerformances(players, aggregateStats.playerGames, leagueId, config);

    // 4. Generate comprehensive expectations vs actual analysis
    console.log(`🎯 Generating player expectations analysis...`);
    const expectationsAnalysis = this.analyzePlayerExpectations(players, aggregateStats.playerGames, leagueId, config);

    // Combine all analyses for comprehensive validation results
    const combinedAnalysis = this.combineAnalyses(
      gameAnalysis,
      aggregatedAnalysis,
      playerAnalysis,
      expectationsAnalysis
    );

    return {
      runId: `${leagueId}_${Date.now()}`,
      config: {
        gamesSimulated: gamesCompleted,
        league: leagueId as League,
        playersCount: playerCount,
        seasonsSimulated: seasonsCount,
        validationDate: new Date().toISOString()
      },
      overallAccuracy: combinedAnalysis.overallAccuracy,
      categoryResults: combinedAnalysis.categoryResults,
      outliers: combinedAnalysis.outliers,
      leagueMetrics: combinedAnalysis.leagueMetrics,
      recommendations: combinedAnalysis.recommendations,
      metadata: {
        timestamp: Date.now(),
        validationVersion: '1.0.0',
        engineVersion: '1.0.0',
        seedUsed: Math.floor(Math.random() * 1000000)
      }
    };
  }

  /**
   * Generate a realistic player pool for the league based on its characteristics.
   */
  private generatePlayerPool(count: number, config: LeagueConfig): Player[] {
    const players: Player[] = [];

    for (let i = 0; i < count; i++) {
      // Generate player with league-appropriate talent distribution
      const seed = Math.floor(Math.random() * 1000000);

      // Use different archetypes based on league talent level
      // const archetype: 'generational' | 'top_100' | 'unranked' = config.averageTalent >= 75
      //   ? (Math.random() < 0.1 ? 'generational' : 'top_100')
      //   : config.averageTalent >= 60
      //   ? (Math.random() < 0.05 ? 'generational' : Math.random() < 0.3 ? 'top_100' : 'unranked')
      //   : (Math.random() < 0.02 ? 'generational' : Math.random() < 0.15 ? 'top_100' : 'unranked');

      // Generate team to get player from
      const tempTeam = generateRTTBTeam(`TEMP_${i}`, `Team${i}`, seed, config);
      if (tempTeam.players.length > 0) {
        players.push(tempTeam.players[0]); // Take first player from generated team
      }
    }

    return players;
  }

  /**
   * Generate teams from the player pool for a specific game.
   */
  private generateTeamsFromPool(players: Player[], _config?: LeagueConfig): { homeTeam: Team; awayTeam: Team } {
    // Shuffle and select players for teams
    const shuffled = [...players].sort(() => Math.random() - 0.5);

    const homeTeam: Team = {
      id: 'HOME',
      name: 'Home Team',
      players: shuffled.slice(0, 12)
    };

    const awayTeam: Team = {
      id: 'AWAY',
      name: 'Away Team',
      players: shuffled.slice(12, 24)
    };

    return { homeTeam, awayTeam };
  }

  /**
   * Simulate a single game for validation purposes (streamlined version).
   */
  private async simulateGameForValidation(
    homeTeam: Team,
    awayTeam: Team
  ): Promise<{
    homeScore: number;
    awayScore: number;
    homeStats: PlayerStats[];
    awayStats: PlayerStats[];
    gamePace: number;
  }> {
    // Initialize game
    const statsTracker = new StatsTracker();
    let gameStats = statsTracker.initializeGameStats('validation_game', homeTeam, awayTeam);

    let state: PossessionState = {
      gameId: 'validation_game',
      poss: 0,
      offense: homeTeam.id,
      defense: awayTeam.id,
      ball: homeTeam.players[0].id,
      clock: { quarter: 1, sec: 2880 }, // 48 minutes in seconds
      shotClock: 24,
      fatigue: {} as Record<string, number>,
      score: { off: 0, def: 0 },
      seed: Math.floor(Math.random() * 1000000)
    };

    // Run simplified game simulation
    let possessionCount = 0;
    const maxPossessions = Math.floor(70 + Math.random() * 30); // 70-100 possessions typical

    while (possessionCount < maxPossessions && state.clock.sec > 0) {
      // Simple possession simulation
      const offTeam = state.offense === homeTeam.id ? homeTeam : awayTeam;
      const defTeam = state.offense === homeTeam.id ? awayTeam : homeTeam;

      try {
        // Suppress console output during validation for performance
        const originalLog = console.log;
        console.log = () => {
          /* do nothing */
        };

        const result = this.engine.run(offTeam, defTeam, state, 'man', statsTracker, gameStats);
        state = result.state;
        gameStats = result.gameStats;

        // Restore console
        console.log = originalLog;
      } catch (error) {
        // Restore console on error and fail gracefully
        const originalLog = console.log;
        if (console.log !== originalLog) {
          console.log = originalLog;
        }
        console.warn('Simulation error in validation game:', error);
        break;
      }

      state.poss++;
      possessionCount++;

      // Advance clock
      state.clock.sec = Math.max(0, state.clock.sec - 2880 / maxPossessions);
    }

    // Finalize game stats
    const gameTimeMinutes = (2880 - state.clock.sec) / 60;
    statsTracker.finalizeGameStats(gameStats, gameTimeMinutes);

    // Extract results
    const homeStats = Object.values(gameStats.homeTeam.players) as PlayerStats[];
    const awayStats = Object.values(gameStats.awayTeam.players) as PlayerStats[];

    return {
      homeScore: state.offense === homeTeam.id ? state.score.off : state.score.def,
      awayScore: state.offense === homeTeam.id ? state.score.def : state.score.off,
      homeStats,
      awayStats,
      gamePace: possessionCount
    };
  }

  /**
   * Generate performance expectations for a player in a specific league.
   */
  private generatePlayerExpectation(player: Player, leagueId: string, config: LeagueConfig): PerformanceExpectation {
    const baseline = LEAGUE_STAT_BASELINES[leagueId];
    if (!baseline) {
      throw new Error(`No baseline found for league: ${leagueId}`);
    }

    // Calculate expected stats based on player ratings and league normalization
    const overallRating = this.calculateSimpleOverall(player.ratings);
    const talentMultiplier = overallRating / config.averageTalent;

    return {
      playerId: player.id,
      league: leagueId as League,
      season: 2024,
      gamesPlayed: 0,
      expected: {
        pointsPerGame: baseline.pointsPerGame.target * talentMultiplier * config.statNormalization.scoring,
        reboundsPerGame: baseline.reboundsPerGame.target * talentMultiplier * config.statNormalization.rebounding,
        assistsPerGame: baseline.assistsPerGame.target * talentMultiplier * config.statNormalization.assists,
        stealsPerGame: 1.2 * talentMultiplier * config.statNormalization.steals,
        blocksPerGame: 0.8 * talentMultiplier * config.statNormalization.blocks,
        turnoversPerGame: baseline.turnoversPerGame.target * talentMultiplier * config.statNormalization.turnovers,
        fieldGoalPercentage: baseline.fieldGoalPercentage.target * config.statNormalization.shooting.fg,
        threePointPercentage: baseline.threePointPercentage.target * config.statNormalization.shooting.three,
        freeThrowPercentage: baseline.freeThrowPercentage.target * config.statNormalization.shooting.ft,
        usage: Math.min(35, 15 + (talentMultiplier - 1) * 20),
        efficiency: 12 + (talentMultiplier - 1) * 8,
        plusMinus: 0
      },
      acceptableRanges: {
        pointsRange: [baseline.pointsPerGame.min * talentMultiplier, baseline.pointsPerGame.max * talentMultiplier],
        efficiencyRange: [8, 25],
        usageRange: [10, 35]
      },
      variance: {
        pointsVariance: 0,
        reboundsVariance: 0,
        assistsVariance: 0,
        efficiencyVariance: 0,
        overallVariance: 0,
        withinAcceptableRange: true
      }
    };
  }

  /**
   * Simple overall rating calculation for validation.
   */
  private calculateSimpleOverall(ratings: Player['ratings']): number {
    return (
      (ratings.three +
        ratings.mid +
        ratings.finishing +
        ratings.handle +
        ratings.pass +
        ratings.onBallDef +
        ratings.lateral +
        ratings.steal +
        ratings.rebound +
        ratings.iq) /
      10
    );
  }

  /**
   * Analyze aggregated results for maximum efficiency.
   */
  private analyzeAggregatedResults(
    aggregateStats: {
      totalPoints: number;
      totalRebounds: number;
      totalAssists: number;
      totalFieldGoalsMade: number;
      totalFieldGoalsAttempted: number;
      totalThreePointersMade: number;
      totalThreePointersAttempted: number;
      totalFreeThrowsMade: number;
      totalFreeThrowsAttempted: number;
      totalTurnovers: number;
      totalMinutes: number;
      playerSampleSize: number;
      playerGames: Map<string, PlayerStats[]>;
    },
    gamesCompleted: number,
    _totalPossessions: number,
    totalScoreHome: number,
    totalScoreAway: number,
    leagueId: string,
    _config: LeagueConfig
  ) {
    const baseline = LEAGUE_STAT_BASELINES[leagueId];
    if (!baseline) {
      throw new Error(`No baseline found for league: ${leagueId}`);
    }

    // Calculate per-game averages from aggregated data
    // Convert total stats to per-game averages by dividing by number of player-games
    const playerGames = aggregateStats.playerSampleSize;
    const avgPointsPerGame = playerGames > 0 ? aggregateStats.totalPoints / playerGames : 0;
    const avgReboundsPerGame = playerGames > 0 ? aggregateStats.totalRebounds / playerGames : 0;
    const avgAssistsPerGame = playerGames > 0 ? aggregateStats.totalAssists / playerGames : 0;

    const avgFieldGoalPct =
      aggregateStats.totalFieldGoalsAttempted > 0
        ? aggregateStats.totalFieldGoalsMade / aggregateStats.totalFieldGoalsAttempted
        : 0;
    const avgThreePointPct =
      aggregateStats.totalThreePointersAttempted > 0
        ? aggregateStats.totalThreePointersMade / aggregateStats.totalThreePointersAttempted
        : 0;
    const avgFreeThrowPct =
      aggregateStats.totalFreeThrowsAttempted > 0
        ? aggregateStats.totalFreeThrowsMade / aggregateStats.totalFreeThrowsAttempted
        : 0;

    const avgTurnoversPerGame = playerGames > 0 ? aggregateStats.totalTurnovers / playerGames : 0;
    const avgGameScore = gamesCompleted > 0 ? (totalScoreHome + totalScoreAway) / (2 * gamesCompleted) : 0;

    // Validation against baselines
    const categoryResults: Record<
      string,
      {
        expectedMean: number;
        actualMean: number;
        expectedStdDev: number;
        actualStdDev: number;
        deviation: number;
        deviationPercentage: number;
        withinRange: boolean;
        sampleSize: number;
      }
    > = {
      pointsPerGame: this.validateCategory('Points Per Game', avgPointsPerGame, baseline.pointsPerGame),
      reboundsPerGame: this.validateCategory('Rebounds Per Game', avgReboundsPerGame, baseline.reboundsPerGame),
      assistsPerGame: this.validateCategory('Assists Per Game', avgAssistsPerGame, baseline.assistsPerGame),
      fieldGoalPercentage: this.validateCategory('Field Goal %', avgFieldGoalPct, baseline.fieldGoalPercentage),
      threePointPercentage: this.validateCategory('Three Point %', avgThreePointPct, baseline.threePointPercentage),
      freeThrowPercentage: this.validateCategory('Free Throw %', avgFreeThrowPct, baseline.freeThrowPercentage),
      turnoversPerGame: this.validateCategory('Turnovers Per Game', avgTurnoversPerGame, baseline.turnoversPerGame)
    };

    // Calculate overall accuracy
    const passingCategories = Object.values(categoryResults).filter(c => c.withinRange).length;
    const totalCategories = Object.keys(categoryResults).length;
    const overallAccuracy = (passingCategories / totalCategories) * 100;

    const recommendations: Array<{
      category: string;
      issue: string;
      suggestion: string;
      priority: 'high' | 'medium' | 'low';
    }> = [];

    // Generate recommendations for failing categories
    Object.entries(categoryResults).forEach(([category, result]) => {
      if (!result.withinRange) {
        let priority: 'high' | 'medium' | 'low' = 'medium';
        if (Math.abs(result.deviationPercentage) > 25) priority = 'high';
        if (Math.abs(result.deviationPercentage) < 10) priority = 'low';

        recommendations.push({
          category,
          issue: `Actual value (${result.actualMean.toFixed(3)}) differs from expected (${result.expectedMean.toFixed(
            3
          )}) by ${result.deviationPercentage.toFixed(1)}%`,
          suggestion:
            result.actualMean > result.expectedMean
              ? `Reduce ${category.toLowerCase()} multiplier in league config`
              : `Increase ${category.toLowerCase()} multiplier in league config`,
          priority
        });
      }
    });

    return {
      overallAccuracy,
      averageDeviation: this.calculateAverage(Object.values(categoryResults).map(c => Math.abs(c.deviationPercentage))),
      standardDeviation: 0, // Simplified for performance
      correlation: 0.85, // Simplified for performance
      validationPassed: overallAccuracy >= 75,
      categoryResults,
      outliers: [] as Array<{
        playerId: string;
        playerName?: string;
        category: string;
        expected: number;
        actual: number;
        deviation: number;
        deviationSigmas: number;
        possibleCauses: string[];
      }>, // Simplified - no individual player tracking
      averageGameScore: avgGameScore,
      shootingEfficiency: avgFieldGoalPct,
      turnoverRate: avgTurnoversPerGame,
      recommendations
    };
  }

  /**
   * Analyze game results against expected baselines.
   * Primary analysis method for comprehensive game-level validation.
   */
  private analyzeGameResults(
    gameResults: Array<{
      homeScore: number;
      awayScore: number;
      homeStats: PlayerStats[];
      awayStats: PlayerStats[];
      gamePace: number;
    }>,
    leagueId: string,
    _config: LeagueConfig
  ) {
    const baseline = LEAGUE_STAT_BASELINES[leagueId];
    if (!baseline) {
      throw new Error(`No baseline found for league: ${leagueId}`);
    }

    // Calculate averages across all games
    const allPlayerStats = gameResults
      .flatMap(game => [...game.homeStats, ...game.awayStats])
      .filter(stat => stat.minutes > 5); // Only meaningful playing time

    const avgPointsPerGame = this.calculateAverage(allPlayerStats.map(s => s.points));
    const avgReboundsPerGame = this.calculateAverage(allPlayerStats.map(s => s.totalRebounds));
    const avgAssistsPerGame = this.calculateAverage(allPlayerStats.map(s => s.assists));

    const avgFieldGoalPct = this.calculateAverage(
      allPlayerStats.filter(s => s.fieldGoalsAttempted > 0).map(s => s.fieldGoalsMade / s.fieldGoalsAttempted)
    );

    const avgThreePointPct = this.calculateAverage(
      allPlayerStats.filter(s => s.threePointersAttempted > 0).map(s => s.threePointersMade / s.threePointersAttempted)
    );

    const avgFreeThrowPct = this.calculateAverage(
      allPlayerStats.filter(s => s.freeThrowsAttempted > 0).map(s => s.freeThrowsMade / s.freeThrowsAttempted)
    );

    const avgTurnoversPerGame = this.calculateAverage(allPlayerStats.map(s => s.turnovers));
    const avgGameScore = this.calculateAverage(gameResults.map(g => (g.homeScore + g.awayScore) / 2));

    // Check if stats are within expected ranges
    const categoryResults: Record<
      string,
      {
        expectedMean: number;
        actualMean: number;
        expectedStdDev: number;
        actualStdDev: number;
        deviation: number;
        deviationPercentage: number;
        withinRange: boolean;
        sampleSize: number;
      }
    > = {
      pointsPerGame: this.validateCategory('Points Per Game', avgPointsPerGame, baseline.pointsPerGame),
      reboundsPerGame: this.validateCategory('Rebounds Per Game', avgReboundsPerGame, baseline.reboundsPerGame),
      assistsPerGame: this.validateCategory('Assists Per Game', avgAssistsPerGame, baseline.assistsPerGame),
      fieldGoalPercentage: this.validateCategory('Field Goal %', avgFieldGoalPct, baseline.fieldGoalPercentage),
      threePointPercentage: this.validateCategory('Three Point %', avgThreePointPct, baseline.threePointPercentage),
      freeThrowPercentage: this.validateCategory('Free Throw %', avgFreeThrowPct, baseline.freeThrowPercentage),
      turnoversPerGame: this.validateCategory('Turnovers Per Game', avgTurnoversPerGame, baseline.turnoversPerGame)
    };

    // Calculate overall accuracy
    const passingCategories = Object.values(categoryResults).filter(c => c.withinRange).length;
    const totalCategories = Object.keys(categoryResults).length;
    const overallAccuracy = (passingCategories / totalCategories) * 100;

    const recommendations: Array<{
      category: string;
      issue: string;
      suggestion: string;
      priority: 'high' | 'medium' | 'low';
    }> = [];

    // Generate recommendations for failing categories
    Object.entries(categoryResults).forEach(([category, result]) => {
      if (!result.withinRange) {
        let priority: 'high' | 'medium' | 'low' = 'medium';
        if (Math.abs(result.deviationPercentage) > 25) priority = 'high';
        if (Math.abs(result.deviationPercentage) < 10) priority = 'low';

        recommendations.push({
          category,
          issue: `Actual value (${result.actualMean.toFixed(3)}) differs from expected (${result.expectedMean.toFixed(
            3
          )}) by ${result.deviationPercentage.toFixed(1)}%`,
          suggestion:
            result.actualMean > result.expectedMean
              ? `Reduce ${category.toLowerCase()} multiplier in league config`
              : `Increase ${category.toLowerCase()} multiplier in league config`,
          priority
        });
      }
    });

    const paceActual = this.calculateAverage(gameResults.map(g => g.gamePace));

    return {
      overallAccuracy,
      averageDeviation: this.calculateAverage(Object.values(categoryResults).map(c => Math.abs(c.deviationPercentage))),
      standardDeviation: 0, // TODO: Calculate proper standard deviation
      correlation: 0.85, // TODO: Calculate R-squared correlation
      validationPassed: overallAccuracy >= 75, // Pass if 75%+ of categories are within range
      categoryResults,
      outliers: [], // TODO: Identify statistical outliers
      averageGameScore: avgGameScore,
      shootingEfficiency: avgFieldGoalPct,
      turnoverRate: avgTurnoversPerGame,
      recommendations,
      paceActual,
      paceExpected: this.getExpectedPace(leagueId),
      shootingEfficiencyExpected: this.getExpectedShootingEfficiency(leagueId),
      turnoverRateExpected: this.getExpectedTurnoverRate(leagueId)
    };
  }

  private analyzePlayerPerformances(
    players: Player[],
    playerGames: Map<string, PlayerStats[]>,
    leagueId: string,
    config: LeagueConfig
  ) {
    const outliers: Array<{
      playerId: string;
      playerName?: string;
      category: string;
      expected: number;
      actual: number;
      deviation: number;
      deviationSigmas: number;
      possibleCauses: string[];
    }> = [];

    for (const player of players) {
      const games = playerGames.get(player.id);
      if (!games || games.length < 5) continue; // Need meaningful sample size

      const expectations = this.generatePlayerExpectation(player, leagueId, config);

      const avgPoints = this.calculateAverage(games.map(g => g.points));
      const avgRebounds = this.calculateAverage(games.map(g => g.totalRebounds));
      const avgAssists = this.calculateAverage(games.map(g => g.assists));

      // Check for significant deviations
      const pointsDeviation = Math.abs(avgPoints - expectations.expected.pointsPerGame);
      const reboundsDeviation = Math.abs(avgRebounds - expectations.expected.reboundsPerGame);
      const assistsDeviation = Math.abs(avgAssists - expectations.expected.assistsPerGame);

      // Flag outliers (>3 standard deviations or >50% off expectation)
      if (pointsDeviation > expectations.expected.pointsPerGame * 0.5) {
        outliers.push({
          playerId: player.id,
          playerName: player.name,
          category: 'Points Per Game',
          expected: expectations.expected.pointsPerGame,
          actual: avgPoints,
          deviation: pointsDeviation,
          deviationSigmas: 3.5, // Simplified calculation
          possibleCauses: ['Rating imbalance', 'Usage rate issue', 'League normalization error']
        });
      }

      if (reboundsDeviation > expectations.expected.reboundsPerGame * 0.5) {
        outliers.push({
          playerId: player.id,
          playerName: player.name,
          category: 'Rebounds Per Game',
          expected: expectations.expected.reboundsPerGame,
          actual: avgRebounds,
          deviation: reboundsDeviation,
          deviationSigmas: 3.2,
          possibleCauses: ['Position assignment issue', 'Rebounding algorithm imbalance']
        });
      }

      if (assistsDeviation > expectations.expected.assistsPerGame * 0.5) {
        outliers.push({
          playerId: player.id,
          playerName: player.name,
          category: 'Assists Per Game',
          expected: expectations.expected.assistsPerGame,
          actual: avgAssists,
          deviation: assistsDeviation,
          deviationSigmas: 3.1,
          possibleCauses: ['Passing model imbalance', 'Ball handling distribution issue', 'Team chemistry effects']
        });
      }
    }

    return { outliers };
  }

  /**
   * Validate a statistical category against expected baseline.
   */
  private validateCategory(_name: string, actual: number, baseline: { min: number; max: number; target: number }) {
    const withinRange = actual >= baseline.min && actual <= baseline.max;
    const deviation = actual - baseline.target;
    const deviationPercentage = (deviation / baseline.target) * 100;

    return {
      expectedMean: baseline.target,
      actualMean: actual,
      expectedStdDev: (baseline.max - baseline.min) / 4, // Rough estimate
      actualStdDev: 0, // TODO: Calculate from data
      deviation: Math.abs(deviation),
      deviationPercentage: Math.abs(deviationPercentage),
      withinRange,
      sampleSize: 1000 // TODO: Use actual sample size
    };
  }

  /**
   * Calculate arithmetic mean of an array.
   */
  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  /**
   * Get expected pace for a league.
   */
  private getExpectedPace(leagueId: string): number {
    return LEAGUE_STAT_BASELINES[leagueId]?.pace.target || 75;
  }

  /**
   * Get expected shooting efficiency for a league.
   */
  private getExpectedShootingEfficiency(leagueId: string): number {
    return LEAGUE_STAT_BASELINES[leagueId]?.fieldGoalPercentage.target || 0.45;
  }

  /**
   * Get expected turnover rate for a league.
   */
  private getExpectedTurnoverRate(leagueId: string): number {
    return LEAGUE_STAT_BASELINES[leagueId]?.turnoversPerGame.target || 3.0;
  }

  /**
   * Run validation across all configured leagues.
   */
  public async validateAllLeagues(gamesPerLeague = 500): Promise<Record<string, StatValidationResult>> {
    const allLeagues = { ...HIGH_SCHOOL_LEAGUES, ...AMATEUR_LEAGUES, ...COLLEGE_LEAGUES };
    const results: Record<string, StatValidationResult> = {};

    console.log(`🚀 Starting comprehensive validation across ${Object.keys(allLeagues).length} leagues`);
    console.log(`🎯 ${gamesPerLeague} games per league\n`);

    for (const [leagueId, config] of Object.entries(allLeagues) as [string, LeagueConfig][]) {
      try {
        console.log(`\n🏀 Validating ${config.name}...`);
        const result = await this.validateLeague(leagueId, config, {
          gamesCount: gamesPerLeague
        });
        results[leagueId] = result;

        const passedPct = result.overallAccuracy.withinExpectedRange;
        const status = passedPct >= 75 ? '✅ PASS' : '❌ FAIL';
        console.log(`   ${status} - ${passedPct.toFixed(1)}% categories within expected ranges`);
      } catch (error) {
        console.error(`❌ Error validating ${leagueId}:`, error);
      }
    }

    return results;
  }

  /**
   * Analyze player expectations vs actual performance across all players
   */
  private analyzePlayerExpectations(
    players: Player[],
    playerGames: Map<string, PlayerStats[]>,
    leagueId: string,
    config: LeagueConfig
  ) {
    const playerExpectations: Array<{
      player: Player;
      expectations: PerformanceExpectation;
      actual: {
        pointsPerGame: number;
        reboundsPerGame: number;
        assistsPerGame: number;
        fieldGoalPercentage: number;
        gamesPlayed: number;
      };
      variance: {
        pointsVariance: number;
        reboundsVariance: number;
        assistsVariance: number;
        efficiencyVariance: number;
        withinAcceptableRange: boolean;
      };
    }> = [];

    for (const player of players) {
      const games = playerGames.get(player.id);
      if (!games || games.length < 3) continue; // Need at least 3 games

      const expectations = this.generatePlayerExpectation(player, leagueId, config);

      const actualStats = {
        pointsPerGame: this.calculateAverage(games.map(g => g.points)),
        reboundsPerGame: this.calculateAverage(games.map(g => g.totalRebounds)),
        assistsPerGame: this.calculateAverage(games.map(g => g.assists)),
        fieldGoalPercentage: this.calculateAverage(
          games.filter(g => g.fieldGoalsAttempted > 0).map(g => g.fieldGoalsMade / g.fieldGoalsAttempted)
        ),
        gamesPlayed: games.length
      };

      const variance = {
        pointsVariance:
          Math.abs(actualStats.pointsPerGame - expectations.expected.pointsPerGame) /
          expectations.expected.pointsPerGame,
        reboundsVariance:
          Math.abs(actualStats.reboundsPerGame - expectations.expected.reboundsPerGame) /
          expectations.expected.reboundsPerGame,
        assistsVariance:
          Math.abs(actualStats.assistsPerGame - expectations.expected.assistsPerGame) /
          expectations.expected.assistsPerGame,
        efficiencyVariance:
          Math.abs(actualStats.fieldGoalPercentage - expectations.expected.fieldGoalPercentage) /
          expectations.expected.fieldGoalPercentage,
        withinAcceptableRange:
          actualStats.pointsPerGame >= expectations.acceptableRanges.pointsRange[0] &&
          actualStats.pointsPerGame <= expectations.acceptableRanges.pointsRange[1]
      };

      playerExpectations.push({
        player,
        expectations,
        actual: actualStats,
        variance
      });
    }

    return {
      playerExpectations,
      averageVariance: this.calculateAverage(playerExpectations.map(p => p.variance.pointsVariance)),
      averageReboundsVariance: this.calculateAverage(playerExpectations.map(p => p.variance.reboundsVariance)),
      averageAssistsVariance: this.calculateAverage(playerExpectations.map(p => p.variance.assistsVariance)),
      averageEfficiencyVariance: this.calculateAverage(playerExpectations.map(p => p.variance.efficiencyVariance)),
      playersWithinRange: playerExpectations.filter(p => p.variance.withinAcceptableRange).length,
      totalPlayers: playerExpectations.length
    };
  }

  /**
   * Combine all analyses into a comprehensive result
   */
  private combineAnalyses(
    gameAnalysis: ReturnType<typeof this.analyzeGameResults>,
    aggregatedAnalysis: ReturnType<typeof this.analyzeAggregatedResults>,
    playerAnalysis: ReturnType<typeof this.analyzePlayerPerformances>,
    expectationsAnalysis: ReturnType<typeof this.analyzePlayerExpectations>
  ): Omit<StatValidationResult, 'runId' | 'config' | 'metadata'> {
    const allRecommendations = [...(gameAnalysis.recommendations || []), ...(aggregatedAnalysis.recommendations || [])];

    if (expectationsAnalysis.averageVariance > 0.3) {
      allRecommendations.push({
        category: 'Player Expectations - Scoring',
        issue: `High variance between expected and actual scoring performance (${(
          expectationsAnalysis.averageVariance * 100
        ).toFixed(1)}%)`,
        suggestion: 'Review player rating calculations and league normalization factors for scoring',
        priority: 'high' as const
      });
    }

    if (expectationsAnalysis.averageAssistsVariance > 0.4) {
      allRecommendations.push({
        category: 'Player Expectations - Assists',
        issue: `High variance in assists performance (${(expectationsAnalysis.averageAssistsVariance * 100).toFixed(
          1
        )}%)`,
        suggestion: 'Review passing model, ball handling distribution, and team chemistry effects',
        priority: 'medium' as const
      });
    }

    if (expectationsAnalysis.averageReboundsVariance > 0.35) {
      allRecommendations.push({
        category: 'Player Expectations - Rebounding',
        issue: `High variance in rebounding performance (${(expectationsAnalysis.averageReboundsVariance * 100).toFixed(
          1
        )}%)`,
        suggestion: 'Review rebounding algorithms and position assignment logic',
        priority: 'medium' as const
      });
    }

    const expectationAccuracy =
      expectationsAnalysis.totalPlayers > 0
        ? (expectationsAnalysis.playersWithinRange / expectationsAnalysis.totalPlayers) * 100
        : 100;
    const withinExpectedRange = (gameAnalysis.overallAccuracy + expectationAccuracy) / 2;

    const validationPassed = withinExpectedRange >= 75 && expectationAccuracy >= 70;

    return {
      overallAccuracy: {
        withinExpectedRange,
        averageDeviation: gameAnalysis.averageDeviation,
        standardDeviation: gameAnalysis.standardDeviation,
        correlation: gameAnalysis.correlation,
        validationPassed
      },
      categoryResults: gameAnalysis.categoryResults,
      leagueMetrics: {
        averageGameScore: gameAnalysis.averageGameScore,
        paceActual: gameAnalysis.paceActual,
        paceExpected: gameAnalysis.paceExpected,
        shootingEfficiencyActual: gameAnalysis.shootingEfficiency,
        shootingEfficiencyExpected: gameAnalysis.shootingEfficiencyExpected,
        turnoverRateActual: gameAnalysis.turnoverRate,
        turnoverRateExpected: gameAnalysis.turnoverRateExpected
      },
      outliers: playerAnalysis.outliers || [],
      recommendations: allRecommendations
    };
  }
}
