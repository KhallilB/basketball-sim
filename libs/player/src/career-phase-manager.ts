/**
 * Career Phase Management System
 *
 * Manages realistic basketball player career progression through distinct phases.
 * Integrates individual factors, user choices, and biological aging for immersive gameplay.
 *
 * @module CareerPhaseManager
 * @version 1.0.0
 */

import type {
  Player,
  CareerPhase,
  CareerProgression,
  LongevityFactors,
  PlayStyle,
  PlayerArchetype,
  CareerPhaseConfig,
  UserDevelopmentChoices,
  CareerMilestone,
  MilestoneType
} from '@basketball-sim/types';
import { clamp } from '@basketball-sim/math';

/**
 * Default configuration for career phase boundaries and transitions.
 * Tuned based on basketball career data and player development research.
 */
export const DEFAULT_CAREER_CONFIG: CareerPhaseConfig = {
  baseBoundaries: {
    highschool: 18, // High school completion
    college: 22, // College completion
    development: 22, // Rookie professional years
    emergence: 25, // Breakout years typically 23-25
    prime: 30, // Peak performance 26-30
    veteran: 34, // Experience phase 31-34
    decline: 37, // Physical decline 35-37
    legacy: 40 // Rare adaptable players 38+
  },
  maxModifier: 4, // Maximum +/- years from longevity factors
  longevityWeights: {
    genetics: 0.4, // Strongest factor (rare genetic advantages)
    workEthic: 0.3, // Second strongest (controllable factor)
    conditioning: 0.2, // Important for maintaining athleticism
    playStyle: {
      explosive: -1.5, // Earlier decline due to athleticism dependence
      finesse: 0.5, // Slight extension from skill emphasis
      fundamental: 2.0, // Significant extension from adaptable skills
      physical: -0.5, // Moderate decline from wear and tear
      versatile: 1.0 // Good extension from adaptability
    }
  },
  legacyProbability: {
    generational: 0.15, // 15% chance for generational talents
    top_100: 0.08, // 8% chance for top prospects
    unranked: 0.03 // 3% chance for overlooked players
  }
};

/**
 * Core career phase management system.
 *
 * Responsibilities:
 * - Determine current career phase based on age, experience, and individual factors
 * - Calculate phase transition timing with dynamic boundaries
 * - Track career milestones and their impacts
 * - Integrate user choices into career progression
 * - Provide career predictions and trajectory analysis
 */
export class CareerPhaseManager {
  private config: CareerPhaseConfig;

  /**
   * Initialize the career phase manager with custom configuration.
   */
  constructor(config: CareerPhaseConfig = DEFAULT_CAREER_CONFIG) {
    this.config = config;
  }

  /**
   * Initialize career progression for a new player.
   * Sets up longevity factors based on archetype and generates initial progression data.
   */
  public initializeCareerProgression(
    player: Player,
    archetype: PlayerArchetype,
    initialChoices?: Partial<UserDevelopmentChoices>
  ): CareerProgression {
    const longevityFactors = this.generateLongevityFactors(player, archetype);
    const initialPhase = this.determinePhase(player.age, 0, longevityFactors);

    const userChoices: UserDevelopmentChoices = {
      trainingFocus: initialChoices?.trainingFocus || [],
      lifestyleChoices: initialChoices?.lifestyleChoices || [],
      roleWillingness: initialChoices?.roleWillingness || {
        benchRole: 50,
        positionFlex: 50,
        mentorship: 50,
        teamFirst: 50
      },
      offseasonPrograms: initialChoices?.offseasonPrograms || [],
      injuryManagement: initialChoices?.injuryManagement || []
    };

    return {
      phase: initialPhase,
      phaseYear: 0,
      totalYears: 0,
      declineStarted: false,
      longevityFactors,
      userChoices,
      milestones: []
    };
  }

  /**
   * Update a player's career phase based on current age and progression factors.
   * Should be called annually during season processing.
   */
  public updateCareerPhase(player: Player, progression: CareerProgression): CareerProgression {
    const previousPhase = progression.phase;
    const newPhase = this.determinePhase(player.age, progression.totalYears, progression.longevityFactors);

    const updatedProgression: CareerProgression = {
      ...progression,
      phase: newPhase,
      phaseYear: newPhase === previousPhase ? progression.phaseYear + 1 : 0,
      totalYears: progression.totalYears + 1
    };

    // Mark decline start (irreversible)
    if ((newPhase === 'decline' || newPhase === 'legacy') && !progression.declineStarted) {
      updatedProgression.declineStarted = true;
    }

    // Track peak age if entering veteran phase
    if (newPhase === 'veteran' && previousPhase === 'prime' && !progression.peakAge) {
      updatedProgression.peakAge = player.age - 1;
    }

    // Add phase transition milestone if phase changed
    if (newPhase !== previousPhase) {
      const milestone = this.createPhaseTransitionMilestone(player, newPhase, previousPhase);
      updatedProgression.milestones.push(milestone);
    }

    return updatedProgression;
  }

  /**
   * Determine the appropriate career phase for a player.
   * Uses dynamic boundaries based on individual longevity factors.
   */
  private determinePhase(age: number, yearsPlayed: number, longevityFactors: LongevityFactors): CareerPhase {
    const boundaries = this.calculateDynamicBoundaries(longevityFactors);

    // Handle education/development phases first
    if (age <= 18) return 'highschool';
    if (age <= boundaries.college && yearsPlayed === 0) return 'college';

    // Professional phases
    if (yearsPlayed < 2 || age <= boundaries.development) return 'development';
    if (age <= boundaries.emergence) return 'emergence';
    if (age <= boundaries.prime) return 'prime';
    if (age <= boundaries.veteran) return 'veteran';
    if (age <= boundaries.decline) return 'decline';

    return 'legacy';
  }

  /**
   * Calculate dynamic phase boundaries based on individual longevity factors.
   */
  private calculateDynamicBoundaries(longevityFactors: LongevityFactors): Record<CareerPhase, number> {
    const { genetics, workEthic, conditioning, playStyle } = longevityFactors;
    const weights = this.config.longevityWeights;

    // Calculate overall longevity modifier
    let modifier = 0;
    modifier += ((genetics - 50) / 50) * weights.genetics;
    modifier += ((workEthic - 50) / 50) * weights.workEthic;
    modifier += ((conditioning - 50) / 50) * weights.conditioning;
    modifier += weights.playStyle[playStyle];

    // Clamp to maximum modifier
    modifier = clamp(modifier, -this.config.maxModifier, this.config.maxModifier);

    // Apply modifier to base boundaries
    const boundaries: Record<CareerPhase, number> = {} as Record<CareerPhase, number>;

    Object.entries(this.config.baseBoundaries).forEach(([phase, baseAge]) => {
      boundaries[phase as CareerPhase] = Math.round(baseAge + modifier);
    });

    // Ensure logical ordering
    boundaries.college = Math.max(boundaries.college, boundaries.highschool + 1);
    boundaries.development = Math.max(boundaries.development, boundaries.college);
    boundaries.emergence = Math.max(boundaries.emergence, boundaries.development + 1);
    boundaries.prime = Math.max(boundaries.prime, boundaries.emergence + 2);
    boundaries.veteran = Math.max(boundaries.veteran, boundaries.prime + 2);
    boundaries.decline = Math.max(boundaries.decline, boundaries.veteran + 1);
    boundaries.legacy = Math.max(boundaries.legacy, boundaries.decline + 1);

    return boundaries;
  }

  /**
   * Generate initial longevity factors for a player based on their archetype.
   */
  private generateLongevityFactors(player: Player, archetype: PlayerArchetype): LongevityFactors {
    const archetypeModifiers = {
      generational: { genetics: 15, workEthic: 10, conditioning: 10 },
      top_100: { genetics: 5, workEthic: 5, conditioning: 5 },
      unranked: { genetics: -5, workEthic: 15, conditioning: 0 }
    };

    const modifier = archetypeModifiers[archetype];

    // Generate base values with variation
    const baseGenetics = clamp(50 + modifier.genetics + this.randomNormal(0, 15), 0, 100);
    const baseWorkEthic = clamp(50 + modifier.workEthic + this.randomNormal(0, 12), 0, 100);
    const baseConditioning = clamp(50 + modifier.conditioning + this.randomNormal(0, 10), 0, 100);

    const playStyle = this.determinePlayStyle(player);

    return {
      genetics: Math.round(baseGenetics),
      workEthic: Math.round(baseWorkEthic),
      injuryHistory: 0,
      playStyle,
      roleAdaptation: clamp(50 + this.randomNormal(0, 15), 0, 100),
      conditioning: Math.round(baseConditioning)
    };
  }

  /**
   * Determine a player's play style based on their ratings profile.
   */
  private determinePlayStyle(player: Player): PlayStyle {
    const { ratings } = player;

    const explosiveScore = (ratings.speed + ratings.accel + ratings.vertical) / 3;
    const skillScore = (ratings.three + ratings.mid + ratings.pass + ratings.handle) / 4;
    const physicalScore = (ratings.strength + ratings.rebound + ratings.rimProt) / 3;
    const iqScore = ratings.iq;

    const scores = {
      explosive: explosiveScore + (skillScore > 70 ? -10 : 0),
      finesse: skillScore + (explosiveScore > 75 ? -5 : 0),
      fundamental: iqScore + (skillScore > 65 ? 10 : 0),
      physical: physicalScore + (ratings.height > 82 ? 5 : 0),
      versatile: (explosiveScore + skillScore + physicalScore + iqScore) / 4
    };

    const maxScore = Math.max(...Object.values(scores));
    const bestStyle = Object.entries(scores).find(([_, score]) => score === maxScore)?.[0] as PlayStyle;

    return bestStyle || 'versatile';
  }

  /**
   * Create a milestone for career phase transitions.
   */
  private createPhaseTransitionMilestone(
    player: Player,
    newPhase: CareerPhase,
    previousPhase: CareerPhase
  ): CareerMilestone {
    const phaseDescriptions = {
      highschool: 'began their high school basketball career',
      college: 'started their college basketball journey',
      development: 'entered professional basketball',
      emergence: 'broke out as an emerging talent',
      prime: 'reached their prime years',
      veteran: 'became a seasoned veteran',
      decline: 'entered the decline phase of their career',
      legacy: 'achieved rare longevity as a legacy player'
    };

    const reputationBonus = {
      highschool: 0,
      college: 2,
      development: 5,
      emergence: 5,
      prime: 10,
      veteran: 8,
      decline: -3,
      legacy: 15
    };

    return {
      id: `phase_transition_${previousPhase}_to_${newPhase}`,
      type: 'developmental' as MilestoneType,
      description: `${player.name} ${phaseDescriptions[newPhase]}`,
      achievedAt: {
        age: player.age,
        season: new Date().getFullYear(),
        phase: newPhase
      },
      impact: {
        reputation: reputationBonus[newPhase],
        narrativeFlags: [`phase_transition`, `entered_${newPhase}`, `left_${previousPhase}`]
      }
    };
  }

  /**
   * Generate normally distributed random number (Box-Muller transform).
   */
  private randomNormal(mean: number, stdDev: number): number {
    const u1 = Math.random();
    const u2 = Math.random();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return mean + stdDev * z0;
  }

  /**
   * Predict career trajectory for UI display and AI planning.
   */
  public predictCareerTrajectory(
    player: Player,
    progression: CareerProgression
  ): Record<CareerPhase, { startAge: number; endAge: number; probability: number }> {
    const boundaries = this.calculateDynamicBoundaries(progression.longevityFactors);
    const trajectory: Record<CareerPhase, { startAge: number; endAge: number; probability: number }> = {} as Record<
      CareerPhase,
      { startAge: number; endAge: number; probability: number }
    >;

    const phases: CareerPhase[] = [
      'highschool',
      'college',
      'development',
      'emergence',
      'prime',
      'veteran',
      'decline',
      'legacy'
    ];

    for (let i = 0; i < phases.length; i++) {
      const phase = phases[i];
      const startAge = i === 0 ? 14 : boundaries[phases[i - 1]] + 1;
      const endAge = boundaries[phase];

      let probability = 1.0;
      if (phase === 'legacy') {
        const archetype = this.inferArchetype(player);
        probability = this.config.legacyProbability[archetype];

        // Modify based on longevity factors
        const { genetics, workEthic, playStyle } = progression.longevityFactors;
        if (genetics > 85) probability *= 1.5;
        if (workEthic > 80) probability *= 1.3;
        if (playStyle === 'fundamental') probability *= 1.4;
      } else if (player.age > endAge) {
        probability = player.age <= endAge + 2 ? 1.0 : 0.0;
      }

      trajectory[phase] = { startAge, endAge, probability };
    }

    return trajectory;
  }

  /**
   * Infer player archetype from their current ratings.
   */
  private inferArchetype(player: Player): PlayerArchetype {
    const overallRating = this.calculateOverallRating(player);

    if (overallRating >= 85) return 'generational';
    if (overallRating >= 75) return 'top_100';
    return 'unranked';
  }

  /**
   * Calculate a simple overall rating for archetype inference.
   */
  private calculateOverallRating(player: Player): number {
    const { ratings } = player;

    const offenseRating = (ratings.three + ratings.mid + ratings.finishing + ratings.pass + ratings.handle) / 5;
    const defenseRating = (ratings.onBallDef + ratings.lateral + ratings.steal + ratings.rimProt) / 4;
    const physicalRating =
      (ratings.speed + ratings.strength + ratings.vertical + ratings.rebound + ratings.stamina) / 5;
    const mentalRating = (ratings.iq + ratings.consistency + ratings.clutch + ratings.discipline) / 4;

    return offenseRating * 0.35 + defenseRating * 0.25 + physicalRating * 0.25 + mentalRating * 0.15;
  }

  /**
   * Update longevity factors based on user choices and events.
   */
  public updateLongevityFactors(progression: CareerProgression, updates: Partial<LongevityFactors>): CareerProgression {
    const updatedFactors: LongevityFactors = {
      ...progression.longevityFactors,
      ...updates
    };

    // Clamp all values to valid ranges
    (Object.keys(updatedFactors) as (keyof LongevityFactors)[]).forEach(key => {
      if (key !== 'playStyle' && typeof updatedFactors[key] === 'number') {
        updatedFactors[key] = clamp(updatedFactors[key] as number, 0, 100);
      }
    });

    return {
      ...progression,
      longevityFactors: updatedFactors
    };
  }
}

/**
 * Utility functions for career phase management
 */
export const CareerPhaseUtils = {
  /**
   * Get human-readable description of a career phase
   */
  getPhaseDescription(phase: CareerPhase): string {
    const descriptions = {
      highschool: 'Building fundamentals and discovering potential in high school',
      college: 'Developing skills and competing at the university level',
      development: 'Learning professional basketball and establishing role',
      emergence: 'Breaking out and establishing their role in professional basketball',
      prime: 'At peak performance with maximum impact',
      veteran: 'Using experience to compensate for declining athleticism',
      decline: 'Managing physical decline while maximizing remaining skills',
      legacy: 'Rare players who have adapted their game for exceptional longevity'
    };
    return descriptions[phase];
  },

  /**
   * Get typical age range for a career phase
   */
  getTypicalAgeRange(phase: CareerPhase): { min: number; max: number } {
    const ranges = {
      highschool: { min: 14, max: 18 },
      college: { min: 18, max: 22 },
      development: { min: 18, max: 22 },
      emergence: { min: 22, max: 25 },
      prime: { min: 26, max: 30 },
      veteran: { min: 31, max: 34 },
      decline: { min: 35, max: 37 },
      legacy: { min: 38, max: 42 }
    };
    return ranges[phase];
  },

  /**
   * Check if a phase change represents career progression or decline
   */
  isProgressivePhaseChange(fromPhase: CareerPhase, toPhase: CareerPhase): boolean {
    const phaseOrder: CareerPhase[] = [
      'highschool',
      'college',
      'development',
      'emergence',
      'prime',
      'veteran',
      'decline',
      'legacy'
    ];
    const fromIndex = phaseOrder.indexOf(fromPhase);
    const toIndex = phaseOrder.indexOf(toPhase);

    // Legacy is considered positive progression from decline
    if (fromPhase === 'decline' && toPhase === 'legacy') return true;

    return toIndex > fromIndex && toPhase !== 'decline';
  }
};
