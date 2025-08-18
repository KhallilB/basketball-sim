import { Team, Formation, Position, Id, DefensiveScheme } from '@basketball-sim/types';
import { COURT } from '@basketball-sim/math';

/**
 * Manages player formations and positioning
 */
export class FormationManager {
  /**
   * Initialize basic offensive formation
   */
  createOffensiveFormation(team: Team, isHomeTeam: boolean): Formation {
    const players: Record<Id, Position> = {};
    const ballPosition = isHomeTeam ? 
      { x: 25, y: 25 } :  // Home team attacks right
      { x: 69, y: 25 };   // Away team attacks left
    
    // Basic 1-4 out formation
    const positions = this.get1Out4Formation(isHomeTeam);
    
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
   * Initialize defensive formation based on scheme
   */
  createDefensiveFormation(
    team: Team,
    scheme: DefensiveScheme,
    offensiveFormation: Formation,
    isHomeTeam: boolean
  ): Formation {
    const players: Record<Id, Position> = {};
    
    let positions: Position[] = [];
    
    switch (scheme) {
      case 'man':
        positions = this.getManDefensePositions(offensiveFormation, isHomeTeam);
        break;
      case 'zone2-3':
        positions = this.getZone23Positions(isHomeTeam);
        break;
      case 'zone3-2':
        positions = this.getZone32Positions(isHomeTeam);
        break;
      case 'zone1-3-1':
        positions = this.getZone131Positions(isHomeTeam);
        break;
      case 'switch':
        positions = this.getManDefensePositions(offensiveFormation, isHomeTeam);
        break;
      case 'fullCourt':
        positions = this.getFullCourtPressPositions(offensiveFormation, isHomeTeam);
        break;
    }
    
    team.players.forEach((player, index) => {
      if (index < positions.length) {
        players[player.id] = positions[index];
      }
    });
    
    return {
      players,
      ballPosition: offensiveFormation.ballPosition,
      timestamp: Date.now()
    };
  }

  /**
   * Update formation after ball movement
   */
  updateFormationAfterBallMovement(
    formation: Formation,
    newBallPosition: Position,
    newBallHandler: Id
  ): Formation {
    // Simple ball movement update - in a real sim, this would involve
    // more sophisticated player movement and spacing adjustments
    return {
      ...formation,
      ballPosition: newBallPosition,
      timestamp: Date.now()
    };
  }

  /**
   * Get optimal spacing for offensive players
   */
  optimizeOffensiveSpacing(formation: Formation, focus: 'drive' | 'shoot' | 'pass'): Formation {
    // TODO: Implement spacing optimization based on action focus
    // For now, return original formation
    return formation;
  }

  private get1Out4Formation(isHomeTeam: boolean): Position[] {
    const baseX = isHomeTeam ? 25 : 69;  // 25 feet from basket
    
    return [
      { x: baseX, y: 25 },      // Point guard (top of key)
      { x: baseX - 5, y: 15 },  // Shooting guard (wing)
      { x: baseX - 10, y: 35 }, // Small forward (opposite wing)
      { x: baseX - 15, y: 10 }, // Power forward (corner)
      { x: baseX - 15, y: 40 }  // Center (opposite corner)
    ];
  }

  private getManDefensePositions(offensiveFormation: Formation, isHomeTeam: boolean): Position[] {
    // Position defenders slightly closer to basket than offensive players
    const positions: Position[] = [];
    const basket = isHomeTeam ? COURT.BASKETS.AWAY : COURT.BASKETS.HOME;
    
    Object.values(offensiveFormation.players).forEach(offPos => {
      // Move defender 2-3 feet closer to basket
      const dx = basket.x - offPos.x;
      const dy = basket.y - offPos.y;
      const magnitude = Math.sqrt(dx * dx + dy * dy);
      
      if (magnitude > 0) {
        const adjustX = (dx / magnitude) * 2.5;
        const adjustY = (dy / magnitude) * 2.5;
        
        positions.push({
          x: Math.max(0, Math.min(COURT.LENGTH, offPos.x + adjustX)),
          y: Math.max(0, Math.min(COURT.WIDTH, offPos.y + adjustY))
        });
      } else {
        positions.push(offPos);
      }
    });
    
    return positions;
  }

  private getZone23Positions(isHomeTeam: boolean): Position[] {
    const baseX = isHomeTeam ? 15 : 79;  // 15 feet from basket
    
    return [
      { x: baseX + 10, y: 15 },  // Left guard
      { x: baseX + 10, y: 35 },  // Right guard  
      { x: baseX, y: 20 },       // Left forward
      { x: baseX, y: 25 },       // Center
      { x: baseX, y: 30 }        // Right forward
    ];
  }

  private getZone32Positions(isHomeTeam: boolean): Position[] {
    const baseX = isHomeTeam ? 15 : 79;
    
    return [
      { x: baseX + 15, y: 12 },  // Left guard
      { x: baseX + 15, y: 25 },  // Point guard
      { x: baseX + 15, y: 38 },  // Right guard
      { x: baseX, y: 20 },       // Left big
      { x: baseX, y: 30 }        // Right big
    ];
  }

  private getZone131Positions(isHomeTeam: boolean): Position[] {
    const baseX = isHomeTeam ? 15 : 79;
    
    return [
      { x: baseX + 20, y: 25 },  // Point defender
      { x: baseX + 10, y: 15 },  // Left wing
      { x: baseX + 10, y: 25 },  // Center
      { x: baseX + 10, y: 35 },  // Right wing
      { x: baseX, y: 25 }        // Back defender
    ];
  }

  private getFullCourtPressPositions(offensiveFormation: Formation, isHomeTeam: boolean): Position[] {
    // Aggressive positioning to pressure ball and deny passes
    const positions: Position[] = [];
    const ballPos = offensiveFormation.ballPosition;
    
    // Primary pressure on ball
    positions.push({
      x: ballPos.x + (isHomeTeam ? 3 : -3),
      y: ballPos.y
    });
    
    // Trap defender
    positions.push({
      x: ballPos.x + (isHomeTeam ? 3 : -3),
      y: ballPos.y + (ballPos.y > 25 ? -5 : 5)
    });
    
    // Deny passing lanes
    Object.values(offensiveFormation.players).slice(2).forEach((offPos, index) => {
      positions.push({
        x: offPos.x + (isHomeTeam ? 2 : -2),
        y: offPos.y + (index % 2 === 0 ? 2 : -2)
      });
    });
    
    return positions;
  }

  /**
   * Calculate formation quality metrics
   */
  analyzeFormation(formation: Formation): {
    spacing: number;
    balance: number;
    courtCoverage: number;
  } {
    const positions = Object.values(formation.players);
    
    // Calculate average distance between players (spacing)
    let totalDistance = 0;
    let pairs = 0;
    
    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const dx = positions[j].x - positions[i].x;
        const dy = positions[j].y - positions[i].y;
        totalDistance += Math.sqrt(dx * dx + dy * dy);
        pairs++;
      }
    }
    
    const spacing = pairs > 0 ? Math.min(1, totalDistance / pairs / 15) : 0; // Ideal spacing is 15 feet
    
    // Calculate balance (how evenly distributed across court width)
    const yPositions = positions.map(p => p.y);
    const minY = Math.min(...yPositions);
    const maxY = Math.max(...yPositions);
    const balance = Math.min(1, (maxY - minY) / COURT.WIDTH);
    
    // Calculate court coverage (percentage of court occupied)
    const courtCoverage = Math.min(1, positions.length / 5); // Assuming 5 players
    
    return { spacing, balance, courtCoverage };
  }
}