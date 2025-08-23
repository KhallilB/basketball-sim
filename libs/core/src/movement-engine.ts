import { Player } from '@basketball-sim/types';

export type MovementType = 'dribble' | 'drive' | 'jab' | 'pivot' | 'stepback' | 'crossover' | 'hesitation';

export interface MovementContext {
  player: Player;
  defenderDistance: number;
  openLanes: number;
  spacing: number;
  fatigue: number;
}

export interface MovementOutcome {
  type: MovementType;
  success: boolean;
  dribbles: number; // How many dribbles this movement used
  timeElapsed: number; // Time in seconds
  positionChange: { x: number; y: number };
  separationGained: number; // Distance gained from defender
  turnover: boolean;
}

/**
 * Movement engine that handles ball handling, dribbling, and player movement
 */
export class MovementEngine {
  /**
   * Execute a movement based on player's ball handling skills and situation
   */
  executeMovement(movementType: MovementType, context: MovementContext, rng: () => number): MovementOutcome {
    const { player } = context;
    const handleRating = player.ratings.handle;

    // Base success rate based on player's ball handling
    let baseSuccessRate = this.calculateBaseSuccessRate(movementType, handleRating);

    // Adjust for context
    baseSuccessRate = this.adjustForContext(baseSuccessRate, context);

    // Determine outcome
    const success = rng() < baseSuccessRate;
    const outcome = this.generateOutcome(movementType, success, context, rng);

    return outcome;
  }

  /**
   * Calculate how many dribbles a player should use for a given action
   */
  calculateDribblesForAction(action: string, playerHandleRating: number, pressure: number): number {
    switch (action) {
      case 'catchShoot':
        return 0; // Catch and shoot, no dribbles
      case 'pullup':
        return Math.min(2, Math.floor(pressure * 2) + 1); // 1-2 dribbles to create space
      case 'drive':
        return Math.min(4, Math.floor((100 - playerHandleRating) / 20) + 2); // 2-4 dribbles based on skill
      case 'pnrAttack':
        return 1; // Quick attack off screen
      case 'post':
        return Math.floor(pressure) + 1; // 1-2 dribbles to establish position
      default:
        return 1;
    }
  }

  /**
   * Determine if a player loses the ball during movement
   */
  checkForTurnover(
    dribbles: number,
    handleRating: number,
    pressure: number,
    fatigue: number,
    rng: () => number
  ): boolean {
    // Base turnover rate increases with more dribbles
    let turnoverRate = Math.max(0.01, dribbles * 0.02);

    // Adjust for player skill (better handlers are less likely to turn it over)
    turnoverRate *= (100 - handleRating) / 100;

    // Increase with pressure
    turnoverRate *= 1 + pressure * 0.5;

    // Increase with fatigue
    turnoverRate *= 1 + fatigue * 0.3;

    return rng() < turnoverRate;
  }

  private calculateBaseSuccessRate(movementType: MovementType, handleRating: number): number {
    const skillFactor = handleRating / 100;

    switch (movementType) {
      case 'dribble':
        return 0.85 + skillFactor * 0.1; // 85-95% success
      case 'drive':
        return 0.65 + skillFactor * 0.25; // 65-90% success
      case 'crossover':
        return 0.7 + skillFactor * 0.2; // 70-90% success
      case 'hesitation':
        return 0.75 + skillFactor * 0.15; // 75-90% success
      case 'stepback':
        return 0.6 + skillFactor * 0.3; // 60-90% success
      case 'jab':
        return 0.8 + skillFactor * 0.15; // 80-95% success
      case 'pivot':
        return 0.9 + skillFactor * 0.05; // 90-95% success
      default:
        return 0.75;
    }
  }

  private adjustForContext(baseRate: number, context: MovementContext): number {
    let adjustedRate = baseRate;

    // Defender distance (closer defender = harder)
    if (context.defenderDistance < 3) {
      adjustedRate *= 0.7; // Much harder when closely guarded
    } else if (context.defenderDistance < 6) {
      adjustedRate *= 0.85; // Moderately harder
    }

    // Open lanes make movement easier
    adjustedRate *= 1 + context.openLanes * 0.1;

    // Spacing helps
    adjustedRate *= 1 + context.spacing * 0.05;

    // Fatigue hurts
    adjustedRate *= 1 - context.fatigue * 0.2;

    return Math.min(0.95, Math.max(0.1, adjustedRate));
  }

  private generateOutcome(
    movementType: MovementType,
    success: boolean,
    context: MovementContext,
    rng: () => number
  ): MovementOutcome {
    const { player } = context;

    // Calculate dribbles used
    const dribbles = this.getDribblesForMovement(movementType, success);

    // Calculate time elapsed (more skilled players move faster)
    const speedFactor = player.ratings.speed / 100;
    const baseTime = this.getBaseTimeForMovement(movementType);
    const timeElapsed = baseTime * (1.5 - speedFactor * 0.5);

    // Calculate position change
    const positionChange = this.calculatePositionChange(movementType, success, speedFactor);

    // Calculate separation gained from defender
    const separationGained = success ? this.calculateSeparation(movementType) : 0;

    // Check for turnover
    const turnover = this.checkForTurnover(
      dribbles,
      player.ratings.handle,
      1 - context.defenderDistance / 10, // Convert distance to pressure
      context.fatigue,
      rng
    );

    return {
      type: movementType,
      success,
      dribbles,
      timeElapsed,
      positionChange,
      separationGained,
      turnover
    };
  }

  private getDribblesForMovement(movementType: MovementType, success: boolean): number {
    const baseDribbles = {
      dribble: 1,
      drive: 3,
      crossover: 2,
      hesitation: 2,
      stepback: 2,
      jab: 0,
      pivot: 0
    };

    let dribbles = baseDribbles[movementType] || 1;

    // Failed movements might use more dribbles
    if (!success) {
      dribbles += Math.floor(Math.random() * 2);
    }

    return dribbles;
  }

  private getBaseTimeForMovement(movementType: MovementType): number {
    // Time in seconds
    const baseTimes = {
      dribble: 0.8,
      drive: 1.5,
      crossover: 1.0,
      hesitation: 1.2,
      stepback: 1.0,
      jab: 0.5,
      pivot: 0.3
    };

    return baseTimes[movementType] || 1.0;
  }

  private calculatePositionChange(
    movementType: MovementType,
    success: boolean,
    speedFactor: number
  ): { x: number; y: number } {
    if (!success) {
      return { x: 0, y: 0 };
    }

    const baseDistance = speedFactor * 3; // 0-3 feet movement

    switch (movementType) {
      case 'drive':
        return { x: -baseDistance * 2, y: 0 }; // Move toward basket
      case 'stepback':
        return { x: baseDistance, y: 0 }; // Move away from basket
      case 'crossover':
        return { x: 0, y: Math.random() > 0.5 ? baseDistance : -baseDistance }; // Side movement
      case 'hesitation':
        return { x: -baseDistance * 0.5, y: 0 }; // Slight forward movement
      default:
        return { x: 0, y: 0 };
    }
  }

  private calculateSeparation(movementType: MovementType): number {
    // Distance in feet gained from defender
    const separationMap = {
      dribble: 0.5,
      drive: 2.0,
      crossover: 1.5,
      hesitation: 1.0,
      stepback: 2.0,
      jab: 0.8,
      pivot: 0.3
    };

    return separationMap[movementType] || 0.5;
  }
}
