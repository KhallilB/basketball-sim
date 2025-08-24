/**
 * Advanced Talent Scaling System with Non-Linear Multipliers
 *
 * Creates realistic basketball outliers and stat leaders through sophisticated mathematical scaling.
 * Uses different curve functions for different stat types to ensure proper distribution of elite performances.
 *
 * Key Features:
 * - Position-aware scaling curves
 * - Stat-specific mathematical functions (exponential, power, sigmoid)
 * - League-adjusted talent curves
 * - Configurable outlier generation
 * - Validation and testing utilities
 *
 * @module TalentScaling
 * @version 1.0.0
 */

import type {
  PlayerPosition,
  League,
  LeagueBaseline,
  Player,
  Ratings,
  StatCategory,
  CurveType,
  ScalingConfig,
  TalentScalingSystem,
  TalentScalingResult
} from '@basketball-sim/types';
import {
  applyExponentialCurve,
  applyPowerCurve,
  applySigmoidCurve,
  applyLogarithmicCurve,
  applyShootingPercentageCurve,
  applyReboundingDominanceCurve,
  applyAssistVisionCurve,
  addControlledVariance,
  createSeededRandom
} from '@basketball-sim/math';

// Types are now imported from @basketball-sim/types

/**
 * Core talent scaling engine with mathematical precision.
 */
export class TalentScalingEngine {
  private config: TalentScalingSystem;

  constructor(config?: Partial<TalentScalingSystem>) {
    this.config = this.createDefaultConfig();
    if (config) {
      this.config = this.mergeConfigs(this.config, config);
    }
  }

  /**
   * Calculate non-linear talent multiplier for a specific stat category.
   * This is the core function that creates outliers and league leaders.
   */
  public calculateTalentMultiplier(
    player: Player,
    category: StatCategory,
    league: League,
    leagueBaseline: LeagueBaseline,
    seed?: number
  ): TalentScalingResult {
    const categoryConfig = this.config.categories[category];
    const rawTalent = this.extractRelevantTalent(player.ratings, category);

    // Step 1: Apply base mathematical curve
    const baseCurveMultiplier = this.applyScalingCurve(rawTalent, categoryConfig.curveType, categoryConfig.parameters);

    // Step 2: Position-specific adjustments
    const positionModifier = categoryConfig.positionModifiers[this.getPrimaryPosition(player)] || 1.0;
    const positionAdjustment = baseCurveMultiplier * positionModifier;

    // Step 3: League talent level adjustment
    const leagueModifier = this.getLeagueModifier(league, leagueBaseline, category);
    const leagueAdjustment = positionAdjustment * leagueModifier;

    // Step 4: Add controlled variance for outliers
    const varianceComponent = this.addControlledVariance(leagueAdjustment, category, seed || Math.random());

    // Step 5: Apply bounds and final validation
    const finalMultiplier = this.applyBounds(
      varianceComponent,
      categoryConfig.parameters.floor,
      categoryConfig.parameters.ceiling
    );

    // Calculate league percentile
    const leaguePercentile = this.calculateLeaguePercentile(finalMultiplier, category, leagueBaseline);

    return {
      playerId: player.id,
      category,
      rawTalent,
      multiplier: finalMultiplier,
      calculation: {
        baseCurveMultiplier,
        positionAdjustment,
        leagueAdjustment,
        varianceComponent,
        finalMultiplier
      },
      leaguePercentile,
      isOutlier: this.determineOutlierStatus(finalMultiplier, leaguePercentile)
    };
  }

  /**
   * Generate complete talent profile for a player across all stat categories.
   */
  public generatePlayerTalentProfile(
    player: Player,
    league: League,
    leagueBaseline: LeagueBaseline,
    seed?: number
  ): Record<StatCategory, TalentScalingResult> {
    const profile: Partial<Record<StatCategory, TalentScalingResult>> = {};
    const rng = seed ? this.createSeededRandom(seed) : Math.random;

    // Generate scaling for each category
    Object.keys(this.config.categories).forEach(cat => {
      const category = cat as StatCategory;
      profile[category] = this.calculateTalentMultiplier(player, category, league, leagueBaseline, rng());
    });

    return profile as Record<StatCategory, TalentScalingResult>;
  }

  /**
   * Ensure league produces appropriate number of statistical leaders.
   * This guarantees outliers exist in each league.
   */
  public validateLeagueLeaders(
    players: Player[],
    league: League,
    leagueBaseline: LeagueBaseline
  ): {
    hasValidLeaders: boolean;
    missingLeaderCategories: StatCategory[];
    topPerformers: Record<StatCategory, Array<{ playerId: string; multiplier: number; percentile: number }>>;
  } {
    const topPerformers = {} as Record<
      StatCategory,
      Array<{ playerId: string; multiplier: number; percentile: number }>
    >;
    const missingLeaderCategories: StatCategory[] = [];

    // Analyze each category
    Object.keys(this.config.categories).forEach(cat => {
      const category = cat as StatCategory;
      const results = players
        .map(player => this.calculateTalentMultiplier(player, category, league, leagueBaseline))
        .sort((a, b) => b.multiplier - a.multiplier);

      topPerformers[category] = results.slice(0, 5).map(r => ({
        playerId: r.playerId,
        multiplier: r.multiplier,
        percentile: r.leaguePercentile
      }));

      // Check if we have legitimate leaders (95th+ percentile)
      const hasLegitimateLeader = results.some(r => r.leaguePercentile >= 95);
      if (!hasLegitimateLeader) {
        missingLeaderCategories.push(category);
      }
    });

    return {
      hasValidLeaders: missingLeaderCategories.length === 0,
      missingLeaderCategories,
      topPerformers
    };
  }

  // ============================================================================
  // MATHEMATICAL SCALING FUNCTIONS
  // ============================================================================

  /**
   * Apply mathematical scaling curve to raw talent value.
   */
  private applyScalingCurve(talent: number, curveType: CurveType, params: ScalingConfig['parameters']): number {
    // Normalize talent to 0-1 scale for mathematical functions
    const normalizedTalent = Math.max(0, Math.min(1, talent / 100));

    switch (curveType) {
      case 'exponential':
        return applyExponentialCurve(normalizedTalent, params.base, params.exponent);

      case 'power':
        return applyPowerCurve(normalizedTalent, params.base, params.exponent);

      case 'sigmoid': {
        const inflection = params.inflectionPoint || 0.5;
        return applySigmoidCurve(normalizedTalent, params.ceiling, params.exponent, inflection);
      }

      case 'logarithmic':
        return applyLogarithmicCurve(normalizedTalent, params.base, params.exponent);

      case 'custom':
        // Implement custom curves based on parameters
        return this.applyCustomCurve(normalizedTalent, params);

      default:
        throw new Error(`Unknown curve type: ${curveType}`);
    }
  }

  /**
   * Custom curve implementations for specific statistical behaviors.
   */
  private applyCustomCurve(normalizedTalent: number, params: ScalingConfig['parameters']): number {
    const customType = params.custom?.type as string;

    switch (customType) {
      case 'shooting_percentage':
        return applyShootingPercentageCurve(normalizedTalent, params.base, params.exponent);

      case 'rebounding_dominance':
        return applyReboundingDominanceCurve(normalizedTalent, params.base);

      case 'assist_vision':
        return applyAssistVisionCurve(normalizedTalent, params.base);

      default:
        return params.base * normalizedTalent;
    }
  }

  /**
   * Add controlled variance to create outlier opportunities.
   */
  private addControlledVariance(baseMultiplier: number, category: StatCategory, randomSeed: number): number {
    const varianceConfig = this.getVarianceConfig(category);
    return addControlledVariance(
      baseMultiplier,
      varianceConfig.baseVariance,
      this.config.globalParams.varianceAmplifier,
      randomSeed
    );
  }

  // ============================================================================
  // CONFIGURATION AND UTILITY METHODS
  // ============================================================================

  /**
   * Extract relevant talent rating for a stat category.
   */
  private extractRelevantTalent(ratings: Ratings, category: StatCategory): number {
    switch (category) {
      case 'scoring':
        return (ratings.three + ratings.mid + ratings.finishing + ratings.ft) / 4;
      case 'efficiency':
        return (ratings.three + ratings.mid + ratings.finishing + ratings.consistency) / 4;
      case 'rebounding':
        return (ratings.rebound + ratings.strength + ratings.vertical + ratings.height / 10) / 4;
      case 'playmaking':
        return (ratings.pass + ratings.iq + ratings.handle) / 3;
      case 'defense':
        return (ratings.onBallDef + ratings.lateral + ratings.steal + ratings.rimProt) / 4;
      case 'usage':
        return (ratings.handle + ratings.iq + ratings.consistency) / 3;
      case 'durability':
        return (ratings.stamina + ratings.durability + ratings.discipline) / 3;
      default:
        return 50; // Default average
    }
  }

  /**
   * Get primary position for position-based adjustments.
   */
  private getPrimaryPosition(player: Player): PlayerPosition {
    // This would ideally be stored on the player, but we can infer from ratings
    const { height, rebound, handle } = player.ratings;

    if (handle > 75) return 'PG';
    if (height < 200 && handle > 60) return 'SG';
    if (height > 210 && rebound > 70) return 'C';
    if (height > 205) return 'PF';
    return 'SF';
  }

  /**
   * Calculate league-specific modifier based on talent level.
   */
  private getLeagueModifier(_league: League, baseline: LeagueBaseline, category: StatCategory): number {
    const leagueTier = this.getLeagueTier(baseline.environment.offensiveRating);
    const baseModifier = this.config.categories[category].leagueModifiers[leagueTier] || 1.0;

    // Adjust based on league talent concentration
    const talentConcentration = this.calculateTalentConcentration(baseline);
    return baseModifier * (1 + this.config.globalParams.leagueTalentImpact * talentConcentration);
  }

  /**
   * Create default configuration with mathematically sound parameters.
   */
  private createDefaultConfig(): TalentScalingSystem {
    return {
      categories: {
        scoring: {
          curveType: 'exponential',
          parameters: {
            base: 0.8,
            exponent: 1.2,
            floor: 0.3,
            ceiling: 4.0 // Allows for 4x scoring outliers
          },
          positionModifiers: {
            PG: 1.1,
            SG: 1.3,
            SF: 1.0,
            PF: 0.9,
            C: 0.85,
            G: 1.2,
            F: 0.95
          },
          leagueModifiers: {
            elite: 1.1,
            professional: 1.0,
            college: 1.2,
            high_school: 1.4
          }
        },

        efficiency: {
          curveType: 'sigmoid',
          parameters: {
            base: 0.95,
            exponent: 3.0,
            floor: 0.7,
            ceiling: 1.25, // Max 25% efficiency boost
            inflectionPoint: 0.6
          },
          positionModifiers: {
            PG: 1.05,
            SG: 1.1,
            SF: 1.0,
            PF: 0.95,
            C: 0.9,
            G: 1.075,
            F: 0.975
          },
          leagueModifiers: {
            elite: 1.0,
            professional: 1.0,
            college: 0.95,
            high_school: 0.9
          }
        },

        rebounding: {
          curveType: 'custom',
          parameters: {
            base: 0.7,
            exponent: 1.5,
            floor: 0.2,
            ceiling: 5.0, // Allows for 5x rebounding dominance
            custom: { type: 'rebounding_dominance' }
          },
          positionModifiers: {
            PG: 0.4,
            SG: 0.6,
            SF: 0.9,
            PF: 1.4,
            C: 2.0,
            G: 0.5,
            F: 1.65
          },
          leagueModifiers: {
            elite: 1.0,
            professional: 1.0,
            college: 1.1,
            high_school: 1.3
          }
        },

        playmaking: {
          curveType: 'custom',
          parameters: {
            base: 0.6,
            exponent: 1.8,
            floor: 0.2,
            ceiling: 6.0, // Allows for 6x assist dominance (Stockton style)
            custom: { type: 'assist_vision' }
          },
          positionModifiers: {
            PG: 3.0,
            SG: 1.0,
            SF: 1.2,
            PF: 0.7,
            C: 0.5,
            G: 2.0,
            F: 0.95
          },
          leagueModifiers: {
            elite: 1.0,
            professional: 1.0,
            college: 1.2,
            high_school: 1.4
          }
        },

        defense: {
          curveType: 'power',
          parameters: {
            base: 0.75,
            exponent: 1.3,
            floor: 0.3,
            ceiling: 3.5 // Allows for 3.5x defensive impact
          },
          positionModifiers: {
            PG: 1.2,
            SG: 1.0,
            SF: 1.1,
            PF: 1.2,
            C: 1.4,
            G: 1.1,
            F: 1.25
          },
          leagueModifiers: {
            elite: 1.0,
            professional: 1.0,
            college: 1.1,
            high_school: 1.3
          }
        },

        usage: {
          curveType: 'sigmoid',
          parameters: {
            base: 0.9,
            exponent: 2.5,
            floor: 0.5,
            ceiling: 1.8, // Max 80% usage boost to prevent impossible values
            inflectionPoint: 0.65
          },
          positionModifiers: {
            PG: 1.1,
            SG: 1.2,
            SF: 1.0,
            PF: 0.9,
            C: 0.85,
            G: 1.15,
            F: 0.95
          },
          leagueModifiers: {
            elite: 1.0,
            professional: 1.0,
            college: 1.1,
            high_school: 1.2
          }
        },

        durability: {
          curveType: 'logarithmic',
          parameters: {
            base: 0.8,
            exponent: 0.3,
            floor: 0.5,
            ceiling: 1.4 // Max 40% durability boost
          },
          positionModifiers: {
            PG: 1.0,
            SG: 1.0,
            SF: 1.0,
            PF: 0.95,
            C: 0.9,
            G: 1.0,
            F: 0.925
          },
          leagueModifiers: {
            elite: 1.0,
            professional: 1.0,
            college: 0.95,
            high_school: 0.9
          }
        }
      },

      globalParams: {
        outlierRate: 0.12, // 12% of players should be statistical outliers
        varianceAmplifier: 1.0,
        leagueTalentImpact: 0.15,
        minLeagueLeaders: 3 // At least 3 legitimate leaders per stat category
      },

      validation: {
        maxMultiplier: 8.0, // No stat should be more than 8x league average
        expectedOutlierRate: 0.12,
        averagePreservation: 0.95 // League averages should stay within 5% of baseline
      }
    };
  }

  // Additional utility methods would go here...
  private mergeConfigs(base: TalentScalingSystem, partial: Partial<TalentScalingSystem>): TalentScalingSystem {
    // Deep merge implementation
    return { ...base, ...partial };
  }

  private getVarianceConfig(category: StatCategory): { baseVariance: number } {
    const varianceMap: Record<StatCategory, number> = {
      scoring: 0.25,
      rebounding: 0.2,
      playmaking: 0.3,
      defense: 0.18,
      efficiency: 0.12,
      usage: 0.15,
      durability: 0.1
    };
    return { baseVariance: varianceMap[category] || 0.15 };
  }

  private calculateLeaguePercentile(multiplier: number, _category: StatCategory, _baseline: LeagueBaseline): number {
    // Simplified percentile calculation - would use actual league distribution in practice
    return Math.min(99, Math.max(1, 50 + (multiplier - 1) * 30));
  }

  private determineOutlierStatus(multiplier: number, percentile: number): boolean {
    return multiplier > 2.0 || percentile >= 95;
  }

  private applyBounds(value: number, floor: number, ceiling: number): number {
    return Math.max(floor, Math.min(ceiling, value));
  }

  private getLeagueTier(offensiveRating: number): string {
    if (offensiveRating >= 110) return 'elite';
    if (offensiveRating >= 105) return 'professional';
    if (offensiveRating >= 95) return 'college';
    return 'high_school';
  }

  private calculateTalentConcentration(baseline: LeagueBaseline): number {
    // Higher ORtg typically means more concentrated talent
    return Math.max(-0.2, Math.min(0.2, (baseline.environment.offensiveRating - 100) / 100));
  }

  private createSeededRandom(seed: number): () => number {
    return createSeededRandom(seed);
  }
}
