import { Team, Formation, Position, Id, Player } from '@basketball-sim/types';

export type OffensiveSet = '3out2in' | '4out1in' | '5out' | 'dribble-drive';

export interface OffensiveContext {
  set: OffensiveSet;
  ballHandler: Id;
  gameTimeElapsed: number;
  scoreDiff: number;
  shotClock: number;
}

export interface MovementRule {
  trigger: string;
  action: 'cut' | 'screen' | 'space' | 'post' | 'back-cut';
  target?: Id;
  priority: number;
}

/**
 * Advanced offensive system manager implementing real basketball principles
 */
export class OffensiveSystemManager {
  /**
   * Create formation based on offensive set and context
   */
  createOffensiveFormation(team: Team, isHomeTeam: boolean, context: OffensiveContext): Formation {
    const players: Record<Id, Position> = {};

    // Ball position based on set
    const ballPosition = this.getBallPosition(isHomeTeam, context.set);

    let positions: Position[];

    switch (context.set) {
      case '3out2in':
        positions = this.get3Out2InFormation(team, isHomeTeam);
        break;
      case '4out1in':
        positions = this.get4Out1InFormation(team, isHomeTeam);
        break;
      case '5out':
        positions = this.get5OutFormation(team, isHomeTeam);
        break;
      case 'dribble-drive':
        positions = this.getDribbleDriveFormation(team, isHomeTeam);
        break;
      default:
        positions = this.get4Out1InFormation(team, isHomeTeam);
    }

    team.players.forEach((player, index) => {
      if (index < positions.length) {
        players[player.id] = positions[index];
      }
    });

    return {
      players,
      ballPosition,
      timestamp: Date.now()
    };
  }

  /**
   * 3-Out, 2-In Motion Offense - balanced inside/outside attack
   */
  private get3Out2InFormation(_: Team, isHomeTeam: boolean): Position[] {
    if (isHomeTeam) {
      // Home team attacks toward x=94 (right side)
      return [
        { x: 30, y: 25 }, // Point guard - top of key
        { x: 35, y: 12 }, // Shooting guard - right wing
        { x: 35, y: 38 }, // Small forward - left wing
        { x: 15, y: 20 }, // Power forward - right low post
        { x: 15, y: 30 } // Center - left low post
      ];
    } else {
      // Away team attacks toward x=0 (left side)
      return [
        { x: 64, y: 25 }, // Point guard - top of key
        { x: 59, y: 12 }, // Shooting guard - right wing
        { x: 59, y: 38 }, // Small forward - left wing
        { x: 79, y: 20 }, // Power forward - right low post
        { x: 79, y: 30 } // Center - left low post
      ];
    }
  }

  /**
   * 4-Out, 1-In Motion Offense - modern perimeter spacing
   */
  private get4Out1InFormation(_: Team, isHomeTeam: boolean): Position[] {
    if (isHomeTeam) {
      return [
        { x: 30, y: 25 }, // Point guard - top of key
        { x: 35, y: 10 }, // Shooting guard - right wing (3pt)
        { x: 35, y: 40 }, // Small forward - left wing (3pt)
        { x: 26, y: 5 }, // Power forward - right corner (3pt)
        { x: 18, y: 25 } // Center - low post
      ];
    } else {
      return [
        { x: 64, y: 25 }, // Point guard - top of key
        { x: 59, y: 10 }, // Shooting guard - right wing (3pt)
        { x: 59, y: 40 }, // Small forward - left wing (3pt)
        { x: 68, y: 5 }, // Power forward - right corner (3pt)
        { x: 76, y: 25 } // Center - low post
      ];
    }
  }

  /**
   * 5-Out Open Post - ultimate spacing for dribble penetration
   */
  private get5OutFormation(_: Team, isHomeTeam: boolean): Position[] {
    if (isHomeTeam) {
      return [
        { x: 32, y: 25 }, // Point guard - top of key (3pt)
        { x: 35, y: 8 }, // Shooting guard - right corner (3pt)
        { x: 35, y: 42 }, // Small forward - left corner (3pt)
        { x: 28, y: 12 }, // Power forward - right wing (3pt)
        { x: 28, y: 38 } // Center - left wing (3pt)
      ];
    } else {
      return [
        { x: 62, y: 25 }, // Point guard - top of key (3pt)
        { x: 59, y: 8 }, // Shooting guard - right corner (3pt)
        { x: 59, y: 42 }, // Small forward - left corner (3pt)
        { x: 66, y: 12 }, // Power forward - right wing (3pt)
        { x: 66, y: 38 } // Center - left wing (3pt)
      ];
    }
  }

  /**
   * Dribble-Drive Motion - spaced for penetration and kick-outs
   */
  private getDribbleDriveFormation(_: Team, isHomeTeam: boolean): Position[] {
    if (isHomeTeam) {
      return [
        { x: 32, y: 25 }, // Point guard - top of key
        { x: 30, y: 6 }, // Shooting guard - deep right corner
        { x: 30, y: 44 }, // Small forward - deep left corner
        { x: 32, y: 15 }, // Power forward - right slot (3pt)
        { x: 12, y: 35 } // Center - weakside low block
      ];
    } else {
      return [
        { x: 62, y: 25 }, // Point guard - top of key
        { x: 64, y: 6 }, // Shooting guard - deep right corner
        { x: 64, y: 44 }, // Small forward - deep left corner
        { x: 62, y: 15 }, // Power forward - right slot (3pt)
        { x: 82, y: 35 } // Center - weakside low block
      ];
    }
  }

  /**
   * Get ball starting position based on offensive set
   */
  private getBallPosition(isHomeTeam: boolean, set: OffensiveSet): Position {
    const baseX = isHomeTeam ? 30 : 64;

    switch (set) {
      case 'dribble-drive':
        return { x: baseX + 2, y: 25 }; // Slightly higher for penetration
      case '5out':
        return { x: baseX + 2, y: 25 }; // Higher for three-point shots
      default:
        return { x: baseX, y: 25 };
    }
  }

  /**
   * Determine best offensive set based on team composition and game state
   */
  selectOffensiveSet(team: Team, gameTimeElapsed: number, scoreDiff: number, shotClock: number): OffensiveSet {
    // Analyze team composition
    const guards = team.players.filter(p => this.isGuard(p)).length;
    const bigs = team.players.filter(p => this.isBig(p)).length;

    // Game situation factors
    const isLatePossession = shotClock < 8;
    const isTrailing = scoreDiff < -5;
    const isLateGame = gameTimeElapsed > 35;

    // Set selection logic
    if (isLatePossession || (isTrailing && isLateGame)) {
      return '5out'; // Maximum spacing for quick shots
    }

    if (guards >= 4) {
      return isTrailing ? 'dribble-drive' : '4out1in';
    }

    if (bigs >= 2) {
      return '3out2in'; // Use size advantage
    }

    return '4out1in'; // Default modern offense
  }

  /**
   * Get movement rules based on offensive set and ball position
   */
  getMovementRules(context: OffensiveContext): MovementRule[] {
    const rules: MovementRule[] = [];

    switch (context.set) {
      case '3out2in':
        rules.push(
          { trigger: 'pass_to_wing', action: 'cut', priority: 1 },
          { trigger: 'post_entry', action: 'space', priority: 2 },
          { trigger: 'help_defense', action: 'screen', priority: 3 }
        );
        break;

      case '4out1in':
        rules.push(
          { trigger: 'pass_and_cut', action: 'cut', priority: 1 },
          { trigger: 'screen_away', action: 'screen', priority: 2 },
          { trigger: 'dribble_at', action: 'back-cut', priority: 3 }
        );
        break;

      case '5out':
        rules.push(
          { trigger: 'overplay', action: 'back-cut', priority: 1 },
          { trigger: 'underplay', action: 'space', priority: 2 },
          { trigger: 'screen_for_shooter', action: 'screen', priority: 3 }
        );
        break;

      case 'dribble-drive':
        rules.push(
          { trigger: 'dribble_penetration', action: 'space', priority: 1 },
          { trigger: 'help_rotation', action: 'cut', priority: 2 },
          { trigger: 'kick_out', action: 'space', priority: 3 }
        );
        break;
    }

    return rules;
  }

  /**
   * Calculate expected shot distribution for offensive set
   */
  getExpectedShotDistribution(set: OffensiveSet): { rim: number; close: number; mid: number; three: number } {
    switch (set) {
      case '3out2in':
        return { rim: 0.25, close: 0.2, mid: 0.25, three: 0.3 };
      case '4out1in':
        return { rim: 0.15, close: 0.15, mid: 0.25, three: 0.45 };
      case '5out':
        return { rim: 0.1, close: 0.15, mid: 0.2, three: 0.55 };
      case 'dribble-drive':
        return { rim: 0.3, close: 0.2, mid: 0.15, three: 0.35 };
      default:
        return { rim: 0.2, close: 0.2, mid: 0.25, three: 0.35 };
    }
  }

  /**
   * Helper methods for player classification
   */
  private isGuard(player: Player): boolean {
    return player.ratings.handle > 70 && player.ratings.speed > 65;
  }

  private isBig(player: Player): boolean {
    return player.ratings.height > 203 && player.ratings.rebound > 65; // 203cm = ~6'8"
  }

  /**
   * Update formation based on ball movement and game flow
   */
  updateFormationForBallMovement(formation: Formation, ballMovedTo: Id, context: OffensiveContext): Formation {
    // Clone current formation
    const newFormation = { ...formation };
    newFormation.players = { ...formation.players };

    // Update ball position to new handler's position
    const newBallPos = formation.players[ballMovedTo];
    if (newBallPos) {
      newFormation.ballPosition = { ...newBallPos };
    }

    // Apply movement rules based on context
    const rules = this.getMovementRules(context);

    // Execute highest priority movement rule
    if (rules.length > 0) {
      // const primaryRule = rules[0];
      // this.executeMovementRule(newFormation, primaryRule, context);
    }

    newFormation.timestamp = Date.now();
    return newFormation;
  }

  /**
   * Execute a specific movement rule
   */
  // private executeMovementRule(formation: Formation, rule: MovementRule, context: OffensiveContext): void {
  // Implementation would adjust player positions based on the rule
  // For now, we'll maintain current positions but this could be expanded
  // to create more dynamic movement
  // }
}
