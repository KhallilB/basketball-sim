/**
 * Cross-League Statistical Normalization Engine
 *
 * Implements comprehensive basketball stat normalization across different competition levels.
 * Based on real-world data and per-100 possession calculations for accurate cross-league comparisons.
 *
 * Key Features:
 * - Per-100 possession normalization (removes pace/game length differences)
 * - Environment scaling (ORtg, shot mix, contact rates)
 * - Opportunity-based rebounding scaling
 * - League-specific style adjustments
 * - Target conversion to NBA-48/100 and FIBA-40/100 standards
 *
 * @module StatNormalizer
 * @version 1.0.0
 */

import type {
  League,
  LeagueBaseline,
  NormalizationConfig,
  NormalizedPlayerStats,
  ConversionFactors,
  PlayerStats,
  Player,
  Id,
  PositionFactors,
  Per100Stats
} from '@basketball-sim/types';

/**
 * Core normalization formulas implementing your specification.
 * All calculations follow the mathematical framework provided.
 */
export class StatNormalizer {
  /**
   * Normalize player statistics to per-100 possessions.
   * Removes pace and game-length differences between leagues.
   */
  public static normalizeToPer100(
    playerStats: PlayerStats,
    gamesPlayed: number,
    teamPossessions: number,
    playerMinutes: number,
    leagueBaseline: LeagueBaseline
  ): Record<string, number> {
    // Calculate possessions using the standard formula
    const estimatedPossessions = this.estimateTeamPossessions(playerStats, teamPossessions);

    // Calculate player possessions based on minutes played
    const playerPossessions = estimatedPossessions * (playerMinutes / leagueBaseline.environment.gameLength);

    // Convert all counting stats to per-100 basis
    return {
      points: this.rateToPer100(playerStats.points / gamesPlayed, playerPossessions / gamesPlayed),
      fieldGoalsMade: this.rateToPer100(playerStats.fieldGoalsMade / gamesPlayed, playerPossessions / gamesPlayed),
      fieldGoalsAttempted: this.rateToPer100(
        playerStats.fieldGoalsAttempted / gamesPlayed,
        playerPossessions / gamesPlayed
      ),
      threePointersMade: this.rateToPer100(
        playerStats.threePointersMade / gamesPlayed,
        playerPossessions / gamesPlayed
      ),
      threePointersAttempted: this.rateToPer100(
        playerStats.threePointersAttempted / gamesPlayed,
        playerPossessions / gamesPlayed
      ),
      freeThrowsMade: this.rateToPer100(playerStats.freeThrowsMade / gamesPlayed, playerPossessions / gamesPlayed),
      freeThrowsAttempted: this.rateToPer100(
        playerStats.freeThrowsAttempted / gamesPlayed,
        playerPossessions / gamesPlayed
      ),
      offensiveRebounds: this.rateToPer100(
        playerStats.offensiveRebounds / gamesPlayed,
        playerPossessions / gamesPlayed
      ),
      defensiveRebounds: this.rateToPer100(
        playerStats.defensiveRebounds / gamesPlayed,
        playerPossessions / gamesPlayed
      ),
      totalRebounds: this.rateToPer100(playerStats.totalRebounds / gamesPlayed, playerPossessions / gamesPlayed),
      assists: this.rateToPer100(playerStats.assists / gamesPlayed, playerPossessions / gamesPlayed),
      turnovers: this.rateToPer100(playerStats.turnovers / gamesPlayed, playerPossessions / gamesPlayed),
      steals: this.rateToPer100(playerStats.steals / gamesPlayed, playerPossessions / gamesPlayed),
      blocks: this.rateToPer100(playerStats.blocks / gamesPlayed, playerPossessions / gamesPlayed),
      personalFouls: this.rateToPer100(playerStats.foulsCommitted / gamesPlayed, playerPossessions / gamesPlayed),

      // Percentages remain the same (already normalized)
      fieldGoalPercentage:
        playerStats.fieldGoalsAttempted > 0 ? playerStats.fieldGoalsMade / playerStats.fieldGoalsAttempted : 0,
      threePointPercentage:
        playerStats.threePointersAttempted > 0 ? playerStats.threePointersMade / playerStats.threePointersAttempted : 0,
      freeThrowPercentage:
        playerStats.freeThrowsAttempted > 0 ? playerStats.freeThrowsMade / playerStats.freeThrowsAttempted : 0,

      // Advanced metrics
      trueShootingPercentage: this.calculateTrueShootingPercentage(playerStats),
      effectiveFieldGoalPercentage: this.calculateEffectiveFieldGoalPercentage(playerStats),
      usage: this.calculateUsageRate(playerStats, teamPossessions, playerMinutes),
      playerEfficiencyRating: this.calculatePER(playerStats, leagueBaseline),

      // Meta information
      possessionsPlayed: playerPossessions / gamesPlayed
    };
  }

  /**
   * Convert statistics between leagues using environment scaling.
   * Implements your core normalization formulas.
   */
  public static convertBetweenLeagues(
    per100Stats: Record<string, number>,
    fromBaseline: LeagueBaseline,
    toBaseline: LeagueBaseline,
    conversionConfig?: NormalizationConfig
  ): Record<string, number> {
    // Use provided config or calculate dynamic conversion factors
    const factors = conversionConfig?.conversionFactors || this.calculateConversionFactors(fromBaseline, toBaseline);

    const converted = { ...per100Stats };

    // Apply scoring environment scaling
    converted.points = per100Stats.points * factors.scoring.pointsMultiplier;

    // Apply shot volume adjustments based on league 3PA rate
    const threePointRateAdjustment =
      toBaseline.environment.style.threePointRate / fromBaseline.environment.style.threePointRate;
    converted.threePointersAttempted =
      per100Stats.threePointersAttempted * threePointRateAdjustment * factors.scoring.volumeMultiplier;

    // Calculate two-point attempts (remainder after 3PA adjustment)
    const originalTwoPA = per100Stats.fieldGoalsAttempted - per100Stats.threePointersAttempted;
    const newTwoPA =
      originalTwoPA *
      ((1 - toBaseline.environment.style.threePointRate) / (1 - fromBaseline.environment.style.threePointRate));
    converted.fieldGoalsAttempted = converted.threePointersAttempted + newTwoPA;

    // Free throws based on contact rate
    const freeThrowRateAdjustment =
      toBaseline.environment.style.freeThrowRate / fromBaseline.environment.style.freeThrowRate;
    converted.freeThrowsAttempted = per100Stats.freeThrowsAttempted * freeThrowRateAdjustment;

    // Assist scaling based on team assist rates
    const assistRateAdjustment = toBaseline.environment.style.assistRate / fromBaseline.environment.style.assistRate;
    converted.assists = per100Stats.assists * assistRateAdjustment * factors.playmaking.assistMultiplier;

    // Rebound scaling based on available opportunities
    const reboundOpportunityAdjustment = this.calculateReboundOpportunityAdjustment(fromBaseline, toBaseline);
    converted.offensiveRebounds =
      per100Stats.offensiveRebounds * reboundOpportunityAdjustment * factors.rebounding.opportunityMultiplier;
    converted.defensiveRebounds =
      per100Stats.defensiveRebounds * reboundOpportunityAdjustment * factors.rebounding.opportunityMultiplier;
    converted.totalRebounds = converted.offensiveRebounds + converted.defensiveRebounds;

    // Defensive stats based on event rates
    converted.steals =
      per100Stats.steals *
      (toBaseline.environment.style.stealRate / fromBaseline.environment.style.stealRate) *
      factors.defense.stealMultiplier;
    converted.blocks =
      per100Stats.blocks *
      (toBaseline.environment.style.blockRate / fromBaseline.environment.style.blockRate) *
      factors.defense.blockMultiplier;
    converted.personalFouls =
      per100Stats.personalFouls *
      (toBaseline.environment.style.foulRate / fromBaseline.environment.style.foulRate) *
      factors.defense.foulMultiplier;

    // Turnovers and usage adjustments
    converted.turnovers = per100Stats.turnovers * factors.playmaking.turnoverMultiplier;
    converted.usage = per100Stats.usage * factors.playmaking.usageMultiplier;

    return converted;
  }

  /**
   * Convert to NBA-48/100 standard for comparison.
   */
  public static convertToNBAStandard(
    per100Stats: Record<string, number>,
    sourceBaseline: LeagueBaseline
  ): Record<string, number> {
    // Create NBA baseline parameters
    const nbaBaseline: LeagueBaseline = this.getNBABaseline();
    return this.convertBetweenLeagues(per100Stats, sourceBaseline, nbaBaseline);
  }

  /**
   * Convert to FIBA-40/100 standard for international comparison.
   */
  public static convertToFIBAStandard(
    per100Stats: Record<string, number>,
    sourceBaseline: LeagueBaseline
  ): Record<string, number> {
    // Create FIBA baseline parameters
    const fibaBaseline: LeagueBaseline = this.getFIBABaseline();
    return this.convertBetweenLeagues(per100Stats, sourceBaseline, fibaBaseline);
  }

  /**
   * Generate comprehensive normalized player profile.
   */
  public static generateNormalizedProfile(
    playerId: Id,
    playerStats: PlayerStats,
    gamesPlayed: number,
    sourceLeague: League,
    targetLeague: League,
    sourceBaseline: LeagueBaseline,
    targetBaseline: LeagueBaseline,
    playerMinutes: number,
    teamPossessions: number,
    _player?: Player
  ): NormalizedPlayerStats {
    // Step 1: Normalize to per-100 possessions
    const per100Stats = this.normalizeToPer100(
      playerStats,
      gamesPlayed,
      teamPossessions,
      playerMinutes,
      sourceBaseline
    );

    // Step 2: Convert between leagues
    const convertedStats = this.convertBetweenLeagues(per100Stats, sourceBaseline, targetBaseline);

    // Step 3: Calculate confidence metrics
    const confidence = this.calculateConfidenceMetrics(
      per100Stats,
      convertedStats,
      sourceBaseline,
      targetBaseline,
      gamesPlayed,
      _player
    );

    // Step 4: Calculate percentile rankings
    const percentiles = this.calculatePercentileRankings(convertedStats, targetBaseline);

    return {
      playerId,
      originalLeague: sourceLeague,
      targetLeague: targetLeague,
      normalizationDate: new Date().toISOString(),

      per100Stats: {
        // Scoring
        points: convertedStats.points,
        fieldGoalsMade: convertedStats.fieldGoalsMade,
        fieldGoalsAttempted: convertedStats.fieldGoalsAttempted,
        threePointersMade: convertedStats.threePointersMade,
        threePointersAttempted: convertedStats.threePointersAttempted,
        freeThrowsMade: convertedStats.freeThrowsMade,
        freeThrowsAttempted: convertedStats.freeThrowsAttempted,

        // Percentages
        fieldGoalPercentage: convertedStats.fieldGoalPercentage,
        threePointPercentage: convertedStats.threePointPercentage,
        freeThrowPercentage: convertedStats.freeThrowPercentage,
        trueShootingPercentage: convertedStats.trueShootingPercentage,
        effectiveFieldGoalPercentage: convertedStats.effectiveFieldGoalPercentage,

        // Rebounding
        offensiveRebounds: convertedStats.offensiveRebounds,
        defensiveRebounds: convertedStats.defensiveRebounds,
        totalRebounds: convertedStats.totalRebounds,

        // Playmaking
        assists: convertedStats.assists,
        turnovers: convertedStats.turnovers,

        // Defense
        steals: convertedStats.steals,
        blocks: convertedStats.blocks,
        personalFouls: convertedStats.personalFouls,

        // Advanced
        usage: convertedStats.usage,
        plusMinus: convertedStats.plusMinus || 0,
        playerEfficiencyRating: convertedStats.playerEfficiencyRating
      },

      confidence,
      percentiles
    };
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Estimate team possessions using the standard formula.
   * Poss ≈ FGA − OREB + TOV + 0.44 × FTA
   */
  private static estimateTeamPossessions(playerStats: PlayerStats, teamPossessions?: number): number {
    if (teamPossessions) return teamPossessions;

    // Estimate from player stats (will be less accurate)
    return (
      playerStats.fieldGoalsAttempted -
      playerStats.offensiveRebounds +
      playerStats.turnovers +
      0.44 * playerStats.freeThrowsAttempted
    );
  }

  /**
   * Convert rate to per-100 possessions.
   */
  private static rateToPer100(stat: number, possessions: number): number {
    return possessions > 0 ? (stat / possessions) * 100 : 0;
  }

  /**
   * Calculate True Shooting Percentage.
   * TS% = PTS / (2 × (FGA + 0.44 × FTA))
   */
  private static calculateTrueShootingPercentage(stats: PlayerStats): number {
    const tsa = 2 * (stats.fieldGoalsAttempted + 0.44 * stats.freeThrowsAttempted);
    return tsa > 0 ? stats.points / tsa : 0;
  }

  /**
   * Calculate Effective Field Goal Percentage.
   * eFG% = (FGM + 0.5 × 3PM) / FGA
   */
  private static calculateEffectiveFieldGoalPercentage(stats: PlayerStats): number {
    return stats.fieldGoalsAttempted > 0
      ? (stats.fieldGoalsMade + 0.5 * stats.threePointersMade) / stats.fieldGoalsAttempted
      : 0;
  }

  /**
   * Calculate Usage Rate.
   * USG% = 100 × ( (FGA + 0.44 × FTA + TOV) × (TmMP/5) ) / ( MP × (TmFGA + 0.44 × TmFTA + TmTOV) )
   */
  private static calculateUsageRate(stats: PlayerStats, teamPossessions: number, playerMinutes: number): number {
    const playerPossessionsUsed = stats.fieldGoalsAttempted + 0.44 * stats.freeThrowsAttempted + stats.turnovers;
    const timeFactor = playerMinutes > 0 ? teamPossessions / playerMinutes : 0;
    return timeFactor > 0 ? (playerPossessionsUsed / timeFactor) * 100 : 0;
  }

  /**
   * Calculate simplified Player Efficiency Rating.
   */
  private static calculatePER(stats: PlayerStats, baseline: LeagueBaseline): number {
    // Simplified PER calculation based on box score stats
    const per =
      stats.points +
      stats.totalRebounds +
      stats.assists +
      stats.steals +
      stats.blocks -
      (stats.fieldGoalsAttempted - stats.fieldGoalsMade) -
      (stats.freeThrowsAttempted - stats.freeThrowsMade) -
      stats.turnovers;

    return Math.max(0, per * (baseline.per100Stats.advanced.playerEfficiencyRating / 15)); // Normalize to league
  }

  /**
   * Calculate dynamic conversion factors between two leagues.
   */
  private static calculateConversionFactors(from: LeagueBaseline, to: LeagueBaseline): ConversionFactors {
    return {
      scoring: {
        pointsMultiplier: to.environment.offensiveRating / from.environment.offensiveRating,
        efficiencyMultiplier: 1.0, // Shooting percentages shouldn't change dramatically
        volumeMultiplier: to.environment.pace / from.environment.pace,
        shotSelectionAdjustment: to.environment.style.threePointRate / from.environment.style.threePointRate
      },

      rebounding: {
        opportunityMultiplier: this.calculateReboundOpportunityAdjustment(from, to),
        competitionAdjustment: 1.0 // Placeholder for talent level adjustments
      },

      playmaking: {
        assistMultiplier: to.environment.style.assistRate / from.environment.style.assistRate,
        turnoverMultiplier: 1.0, // Assume similar turnover rates
        usageMultiplier: 1.0 // Usage rates should be relatively consistent
      },

      defense: {
        stealMultiplier: to.environment.style.stealRate / from.environment.style.stealRate,
        blockMultiplier: to.environment.style.blockRate / from.environment.style.blockRate,
        foulMultiplier: to.environment.style.foulRate / from.environment.style.foulRate
      }
    };
  }

  /**
   * Calculate rebound opportunity adjustment between leagues.
   */
  private static calculateReboundOpportunityAdjustment(from: LeagueBaseline, to: LeagueBaseline): number {
    // Available rebounds ≈ missed shots + missed free throws
    const fromMissedShots = from.per100Stats.scoring.fieldGoals.attempted - from.per100Stats.scoring.fieldGoals.made;
    const toMissedShots = to.per100Stats.scoring.fieldGoals.attempted - to.per100Stats.scoring.fieldGoals.made;

    const fromMissedFT = from.per100Stats.scoring.freeThrows.attempted - from.per100Stats.scoring.freeThrows.made;
    const toMissedFT = to.per100Stats.scoring.freeThrows.attempted - to.per100Stats.scoring.freeThrows.made;

    const fromAvailableRebs = fromMissedShots + 0.44 * fromMissedFT;
    const toAvailableRebs = toMissedShots + 0.44 * toMissedFT;

    return fromAvailableRebs > 0 ? toAvailableRebs / fromAvailableRebs : 1.0;
  }

  /**
   * Calculate confidence metrics for normalization accuracy.
   */
  private static calculateConfidenceMetrics(
    _originalStats: Record<string, number>,
    convertedStats: Record<string, number>,
    fromBaseline: LeagueBaseline,
    toBaseline: LeagueBaseline,
    gamesPlayed: number,
    _player?: Player
  ): NormalizedPlayerStats['confidence'] {
    // Sample size factor (more games = higher confidence)
    const sampleSizeFactor = Math.min(1.0, gamesPlayed / 20); // 20+ games = full confidence

    // League data quality factor
    const dataQualityFactor = (fromBaseline.metadata.dataQuality + toBaseline.metadata.dataQuality) / 2;

    // Transition difficulty (how big is the league jump)
    const competitionDelta =
      Math.abs(toBaseline.environment.offensiveRating - fromBaseline.environment.offensiveRating) / 20;
    const transitionDifficulty = 1.0 - Math.min(0.5, competitionDelta);

    // Style compatibility (how similar are the leagues)
    const styleCompatibility = this.calculateStyleCompatibility(fromBaseline, toBaseline);

    // Overall confidence
    const overallConfidence =
      sampleSizeFactor * 0.3 + dataQualityFactor * 0.3 + transitionDifficulty * 0.2 + styleCompatibility * 0.2;

    return {
      pointsRange: [convertedStats.points * 0.8, convertedStats.points * 1.2],
      efficiencyRange: [convertedStats.trueShootingPercentage * 0.95, convertedStats.trueShootingPercentage * 1.05],
      usageRange: [convertedStats.usage * 0.85, convertedStats.usage * 1.15],

      overallConfidence,

      confidenceFactors: {
        sampleSize: gamesPlayed,
        leagueDataQuality: dataQualityFactor,
        transitionDifficulty,
        styleCompatibility
      }
    };
  }

  /**
   * Calculate style compatibility between leagues.
   */
  private static calculateStyleCompatibility(from: LeagueBaseline, to: LeagueBaseline): number {
    // Compare key style metrics
    const threeRateDiff = Math.abs(to.environment.style.threePointRate - from.environment.style.threePointRate);
    const assistRateDiff = Math.abs(to.environment.style.assistRate - from.environment.style.assistRate);
    const paceDiff = Math.abs(to.environment.pace - from.environment.pace) / from.environment.pace;

    // Weighted compatibility score
    const compatibility = 1.0 - (threeRateDiff * 0.4 + assistRateDiff * 0.3 + paceDiff * 0.3);
    return Math.max(0.1, compatibility); // Minimum 0.1 compatibility
  }

  /**
   * Calculate percentile rankings in target league.
   */
  private static calculatePercentileRankings(
    stats: Record<string, number>,
    baseline: LeagueBaseline
  ): NormalizedPlayerStats['percentiles'] {
    // Use normal distribution to estimate percentiles
    const calculatePercentile = (value: number, mean: number, stdDev: number): number => {
      const z = stdDev > 0 ? (value - mean) / stdDev : 0;
      // Convert z-score to percentile (simplified normal distribution)
      return Math.max(1, Math.min(99, 50 + z * 15));
    };

    return {
      scoring: calculatePercentile(
        stats.points,
        baseline.per100Stats.scoring.points.mean,
        baseline.per100Stats.scoring.points.stdDev
      ),
      rebounding: calculatePercentile(
        stats.totalRebounds,
        baseline.per100Stats.rebounding.total.mean,
        baseline.per100Stats.rebounding.total.stdDev
      ),
      playmaking: calculatePercentile(
        stats.assists,
        baseline.per100Stats.playmaking.assists.mean,
        baseline.per100Stats.playmaking.assists.stdDev
      ),
      defense: calculatePercentile(
        stats.steals + stats.blocks,
        baseline.per100Stats.defense.steals.mean + baseline.per100Stats.defense.blocks.mean,
        Math.sqrt(baseline.per100Stats.defense.steals.stdDev ** 2 + baseline.per100Stats.defense.blocks.stdDev ** 2)
      ),
      overall: Math.round(
        calculatePercentile(
          stats.points,
          baseline.per100Stats.scoring.points.mean,
          baseline.per100Stats.scoring.points.stdDev
        ) *
          0.4 +
          calculatePercentile(
            stats.totalRebounds,
            baseline.per100Stats.rebounding.total.mean,
            baseline.per100Stats.rebounding.total.stdDev
          ) *
            0.2 +
          calculatePercentile(
            stats.assists,
            baseline.per100Stats.playmaking.assists.mean,
            baseline.per100Stats.playmaking.assists.stdDev
          ) *
            0.2 +
          calculatePercentile(
            stats.steals + stats.blocks,
            baseline.per100Stats.defense.steals.mean + baseline.per100Stats.defense.blocks.mean,
            Math.sqrt(baseline.per100Stats.defense.steals.stdDev ** 2 + baseline.per100Stats.defense.blocks.stdDev ** 2)
          ) *
            0.2
      )
    };
  }

  /**
   * Get NBA baseline for standardization.
   */
  private static getNBABaseline(): LeagueBaseline {
    // Return simplified NBA baseline - would be loaded from real data
    return {
      league: 'premier_main',
      name: 'NBA',
      region: 'US',
      environment: {
        gameLength: 48,
        pace: 99.2,
        offensiveRating: 114.5,
        pointsPerGame: 114.2,
        shotClock: 24,
        style: {
          threePointRate: 0.39,
          freeThrowRate: 0.22,
          assistRate: 0.63,
          stealRate: 8.2,
          blockRate: 5.1,
          foulRate: 19.8
        }
      },
      per100Stats: {} as Per100Stats, // Would be fully populated
      positionFactors: {} as PositionFactors, // Would be fully populated
      metadata: {
        sources: ['NBA.com'],
        season: '2023-24',
        sampleSize: 1230,
        dataQuality: 0.98,
        lastUpdated: '2024-01-01'
      }
    };
  }

  /**
   * Get FIBA baseline for international standardization.
   */
  private static getFIBABaseline(): LeagueBaseline {
    // Return simplified FIBA baseline - would be loaded from real data
    return {
      league: 'overseas_euro_top',
      name: 'EuroLeague',
      region: 'Europe',
      environment: {
        gameLength: 40,
        pace: 71.5,
        offensiveRating: 112.8,
        pointsPerGame: 80.6,
        shotClock: 24,
        style: {
          threePointRate: 0.35,
          freeThrowRate: 0.25,
          assistRate: 0.68,
          stealRate: 6.8,
          blockRate: 3.9,
          foulRate: 22.1
        }
      },
      per100Stats: {} as Per100Stats, // Would be fully populated
      positionFactors: {} as PositionFactors, // Would be fully populated
      metadata: {
        sources: ['EuroLeague'],
        season: '2023-24',
        sampleSize: 360,
        dataQuality: 0.94,
        lastUpdated: '2024-01-01'
      }
    };
  }
}
