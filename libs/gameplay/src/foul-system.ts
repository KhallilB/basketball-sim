import type { Player, Id } from '@basketball-sim/types';

export type FoulType = 'shooting' | 'non-shooting' | 'flagrant' | 'technical' | 'offensive';

export interface FoulContext {
  defender: Player;
  offender?: Player;
  gameTime: number;
  quarter: number;
  scoreDiff: number;
  fatigue: number;
  teamFouls: number;
  playerFouls: number;
  situation: 'drive' | 'shot' | 'loose-ball' | 'off-ball' | 'reach-in';
}

export interface FoulOutcome {
  foulType: FoulType;
  foulerId: Id;
  freeThrows: number;
  retainPossession: boolean;
  ejection?: boolean;
  description: string;
}

/**
 * Extensible foul tendency system based on RTTB principles
 */
export class FoulSystem {
  /**
   * Calculate base foul probability using RTTB ratings
   */
  private calculateBaseFoulRate(player: Player, context: FoulContext): number {
    // Base z-scores from ratings (25-99 scale)
    const disciplineZ = (player.ratings.discipline - 50) / 12;
    const onBallDefZ = (player.ratings.onBallDef - 50) / 12;
    const stealZ = (player.ratings.steal - 50) / 12;
    const lateralZ = (player.ratings.lateral - 50) / 12;

    // Tendency modifiers
    const gambleSteal = player.tendencies.gambleSteal / 100; // 0-1 scale

    // RTTB formula: linear combination -> logistic
    let foulScore = -2.0; // Base (low foul rate)
    foulScore += disciplineZ * -0.4; // Better discipline = fewer fouls
    foulScore += onBallDefZ * -0.2; // Better defense = fewer fouls
    foulScore += stealZ * 0.1; // Steal attempts can lead to fouls
    foulScore += lateralZ * -0.15; // Better footwork = fewer fouls
    foulScore += gambleSteal * 0.6; // Gambling tendency increases fouls

    // Situational modifiers
    foulScore += context.fatigue * 0.8; // More fouls when tired
    foulScore += Math.max(0, -context.scoreDiff / 10) * 0.3; // More fouls when trailing

    // Late game pressure (last 2 minutes)
    if (context.gameTime < 120) {
      foulScore += 0.2;
    }

    // Convert to probability
    return 1 / (1 + Math.exp(-foulScore));
  }

  /**
   * Determine foul type based on context and situation
   */
  private determineFoulType(context: FoulContext, rng: () => number): FoulType {
    switch (context.situation) {
      case 'shot':
        return 'shooting';
      case 'drive':
        // 70% shooting fouls, 30% non-shooting on drives
        return rng() < 0.7 ? 'shooting' : 'non-shooting';
      case 'loose-ball':
      case 'off-ball':
      case 'reach-in':
        return 'non-shooting';
      default:
        return 'non-shooting';
    }
  }

  /**
   * Calculate free throw situation based on foul type and team fouls
   */
  private calculateFreeThrows(foulType: FoulType, teamFouls: number, isThreePoint = false): number {
    if (foulType === 'shooting') {
      return isThreePoint ? 3 : 2;
    }

    if (foulType === 'flagrant') {
      return 2;
    }

    if (foulType === 'technical') {
      return 1;
    }

    // Non-shooting fouls: free throws if in bonus
    if (teamFouls >= 7) {
      // Double bonus
      return 2;
    } else if (teamFouls >= 4) {
      // Bonus (1-and-1)
      return 1; // Note: 1-and-1 logic would need special handling
    }

    return 0; // Side out
  }

  /**
   * Main foul evaluation function
   */
  evaluateFoul(context: FoulContext, isThreePoint: boolean, rng: () => number): FoulOutcome | null {
    const baseFoulRate = this.calculateBaseFoulRate(context.defender, context);

    // Additional situation-specific modifiers
    let adjustedRate = baseFoulRate;

    switch (context.situation) {
      case 'drive':
        adjustedRate *= 1.8; // Drives create more contact
        break;
      case 'shot':
        adjustedRate *= 1.2; // Shot contests can lead to fouls
        break;
      case 'reach-in':
        adjustedRate *= 2.0; // Reach-ins are high foul risk
        break;
      case 'loose-ball':
        adjustedRate *= 1.5; // Loose balls create contact
        break;
    }

    // Cap at reasonable maximum
    adjustedRate = Math.min(adjustedRate, 0.35);

    if (rng() >= adjustedRate) {
      return null; // No foul
    }

    // Determine foul type
    const foulType = this.determineFoulType(context, rng);

    // Calculate free throws
    const freeThrows = this.calculateFreeThrows(foulType, context.teamFouls, isThreePoint);

    // Determine possession retention
    const retainPossession =
      foulType === 'shooting' || foulType === 'flagrant' || foulType === 'technical' || freeThrows > 0;

    // Check for ejection (flagrant 2 or 2 technicals)
    const ejection = foulType === 'flagrant' && rng() < 0.1; // 10% chance of flagrant 2

    return {
      foulType,
      foulerId: context.defender.id,
      freeThrows,
      retainPossession,
      ejection,
      description: this.generateFoulDescription(foulType, context.situation)
    };
  }

  /**
   * Generate descriptive text for foul types
   */
  private generateFoulDescription(foulType: FoulType, situation: string): string {
    const descriptions = {
      shooting: `Shooting foul on the ${situation}`,
      'non-shooting': `${situation === 'reach-in' ? 'Reach-in' : 'Personal'} foul`,
      flagrant: 'Flagrant foul - excessive contact',
      technical: 'Technical foul',
      offensive: 'Offensive foul'
    };

    return descriptions[foulType] || 'Personal foul';
  }

  /**
   * Check if player should foul out (6 fouls in NBA)
   */
  shouldFoulOut(playerFouls: number): boolean {
    return playerFouls >= 6;
  }

  /**
   * Determine if team is in bonus situation
   */
  isInBonus(teamFouls: number): 'none' | 'bonus' | 'double-bonus' {
    if (teamFouls >= 7) return 'double-bonus';
    if (teamFouls >= 4) return 'bonus';
    return 'none';
  }

  /**
   * Calculate intentional foul probability (late game strategy)
   */
  calculateIntentionalFoulRate(context: FoulContext): number {
    // Only in late game when trailing
    if (context.gameTime > 120 || context.scoreDiff >= 0) {
      return 0;
    }

    // Increase probability as time runs out and deficit grows
    const timeUrgency = Math.max(0, (120 - context.gameTime) / 120);
    const scoreUrgency = Math.min(1, Math.abs(context.scoreDiff) / 15);

    return timeUrgency * scoreUrgency * 0.4; // Max 40% chance
  }
}

/**
 * Track fouls for game state management
 */
export interface FoulTracker {
  playerFouls: Record<Id, number>;
  teamFouls: {
    home: number;
    away: number;
  };
  quarterFouls: {
    home: number;
    away: number;
  };
  foulHistory: Array<{
    playerId: Id;
    foulType: FoulType;
    quarter: number;
    timeRemaining: number;
  }>;
}

export function initializeFoulTracker(): FoulTracker {
  return {
    playerFouls: {},
    teamFouls: { home: 0, away: 0 },
    quarterFouls: { home: 0, away: 0 },
    foulHistory: []
  };
}

export function recordFoul(
  tracker: FoulTracker,
  playerId: Id,
  foulType: FoulType,
  isHomeTeam: boolean,
  quarter: number,
  timeRemaining: number
): void {
  // Update player fouls
  tracker.playerFouls[playerId] = (tracker.playerFouls[playerId] || 0) + 1;

  // Update team fouls
  const teamKey = isHomeTeam ? 'home' : 'away';
  tracker.teamFouls[teamKey]++;
  tracker.quarterFouls[teamKey]++;

  // Record in history
  tracker.foulHistory.push({
    playerId,
    foulType,
    quarter,
    timeRemaining
  });
}

export function resetQuarterFouls(tracker: FoulTracker): void {
  tracker.quarterFouls = { home: 0, away: 0 };
}
