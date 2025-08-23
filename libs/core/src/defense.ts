import {
  Team,
  DefensiveScheme,
  DefensiveAssignments,
  Assignment,
  Formation,
  Position,
  Id
} from '@basketball-sim/types';
import { distance } from '@basketball-sim/math';

/**
 * Manages defensive assignments and schemes
 */
export class DefensiveCoordinator {
  /**
   * Assign defenders to offensive players based on scheme
   */
  assignDefenders(offense: Team, defense: Team, scheme: DefensiveScheme, formation: Formation): DefensiveAssignments {
    const assignments: Assignment[] = [];
    const helpRotations: Record<Id, Id> = {};

    switch (scheme) {
      case 'man':
        assignments.push(...this.createManToManAssignments(offense, defense, formation));
        break;
      case 'zone2-3':
        assignments.push(...this.createZoneAssignments(defense, 'zone2-3'));
        break;
      case 'zone3-2':
        assignments.push(...this.createZoneAssignments(defense, 'zone3-2'));
        break;
      case 'zone1-3-1':
        assignments.push(...this.createZoneAssignments(defense, 'zone1-3-1'));
        break;
      case 'switch':
        assignments.push(...this.createSwitchingAssignments(offense, defense, formation));
        break;
      case 'fullCourt':
        assignments.push(...this.createFullCourtAssignments(offense, defense, formation));
        break;
    }

    return {
      scheme,
      assignments,
      helpRotations
    };
  }

  /**
   * Get the primary defender for an offensive player
   */
  getMatchup(offensivePlayer: Id, assignments: DefensiveAssignments): Id | null {
    const assignment = assignments.assignments.find(a => a.type === 'man' && a.target === offensivePlayer);
    return assignment?.defender || null;
  }

  /**
   * Get nearest defender to a position
   */
  getNearestDefender(
    position: Position,
    defense: Team,
    formation: Formation
  ): { defender: Id; distance: number } | null {
    let nearest: { defender: Id; distance: number } | null = null;

    for (const player of defense.players) {
      const defPos = formation.players[player.id];
      if (defPos) {
        const dist = distance(position, defPos);
        if (!nearest || dist < nearest.distance) {
          nearest = { defender: player.id, distance: dist };
        }
      }
    }

    return nearest;
  }

  private createManToManAssignments(offense: Team, defense: Team, formation: Formation): Assignment[] {
    const assignments: Assignment[] = [];

    // Sort defensive players by their proximity to offensive players
    const matchups = this.calculateOptimalMatchups(offense, defense, formation);

    for (const matchup of matchups) {
      assignments.push({
        defender: matchup.defender,
        target: matchup.offender,
        type: 'man',
        priority: matchup.priority
      });
    }

    return assignments;
  }

  private createZoneAssignments(defense: Team, scheme: DefensiveScheme): Assignment[] {
    const assignments: Assignment[] = [];

    // Define zone responsibilities based on scheme
    const zoneMap = this.getZoneMapping(scheme);

    defense.players.forEach((player, index) => {
      if (index < zoneMap.length) {
        assignments.push({
          defender: player.id,
          target: zoneMap[index],
          type: 'zone',
          priority: 5
        });
      }
    });

    return assignments;
  }

  private createSwitchingAssignments(offense: Team, defense: Team, formation: Formation): Assignment[] {
    // Start with man-to-man, but allow switching on screens
    const baseAssignments = this.createManToManAssignments(offense, defense, formation);

    // Mark all assignments as switchable
    return baseAssignments.map(assignment => ({
      ...assignment,
      priority: assignment.priority - 1 // Lower priority to encourage switching
    }));
  }

  private createFullCourtAssignments(_: Team, defense: Team, formation: Formation): Assignment[] {
    const assignments: Assignment[] = [];

    // Assign pressure defenders to ball handler and nearby players
    const ballHandler = this.findBallHandler(formation);

    if (ballHandler) {
      // Primary pressure on ball
      const primaryPressure = this.findClosestDefender(ballHandler, defense, formation);
      if (primaryPressure) {
        assignments.push({
          defender: primaryPressure,
          target: ballHandler,
          type: 'man',
          priority: 10
        });

        // Trap/double team setup
        const secondaryPressure = this.findSecondClosestDefender(ballHandler, defense, formation, primaryPressure);
        if (secondaryPressure) {
          assignments.push({
            defender: secondaryPressure,
            target: ballHandler,
            type: 'help',
            priority: 8
          });
        }
      }
    }

    // Assign remaining defenders to deny passing lanes
    // TODO: Implement more sophisticated full court press logic

    return assignments;
  }

  private calculateOptimalMatchups(
    offense: Team,
    defense: Team,
    formation: Formation
  ): Array<{ defender: Id; offender: Id; priority: number }> {
    const matchups: Array<{ defender: Id; offender: Id; priority: number }> = [];
    const usedDefenders = new Set<Id>();

    // Create distance matrix
    const distances: Array<{ off: Id; def: Id; distance: number }> = [];

    for (const offPlayer of offense.players) {
      const offPos = formation.players[offPlayer.id];
      if (!offPos) continue;

      for (const defPlayer of defense.players) {
        const defPos = formation.players[defPlayer.id];
        if (!defPos) continue;

        distances.push({
          off: offPlayer.id,
          def: defPlayer.id,
          distance: distance(offPos, defPos)
        });
      }
    }

    // Sort by distance and assign closest available defenders
    distances.sort((a, b) => a.distance - b.distance);

    for (const dist of distances) {
      if (!usedDefenders.has(dist.def) && !matchups.find(m => m.offender === dist.off)) {
        matchups.push({
          defender: dist.def,
          offender: dist.off,
          priority: Math.max(1, 10 - Math.floor(dist.distance / 5)) // Closer = higher priority
        });
        usedDefenders.add(dist.def);
      }
    }

    return matchups;
  }

  private getZoneMapping(scheme: DefensiveScheme) {
    // Define court zones for different defensive schemes
    // These would map to actual court zones defined in math lib
    switch (scheme) {
      case 'zone2-3':
        return [
          { name: 'left_wing', bounds: { minX: 20, maxX: 35, minY: 0, maxY: 20 } },
          { name: 'right_wing', bounds: { minX: 20, maxX: 35, minY: 30, maxY: 50 } },
          { name: 'left_block', bounds: { minX: 0, maxX: 15, minY: 15, maxY: 25 } },
          { name: 'center', bounds: { minX: 0, maxX: 15, minY: 20, maxY: 30 } },
          { name: 'right_block', bounds: { minX: 0, maxX: 15, minY: 25, maxY: 35 } }
        ];
      case 'zone3-2':
        return [
          { name: 'left_guard', bounds: { minX: 20, maxX: 35, minY: 0, maxY: 17 } },
          { name: 'top', bounds: { minX: 20, maxX: 35, minY: 17, maxY: 33 } },
          { name: 'right_guard', bounds: { minX: 20, maxX: 35, minY: 33, maxY: 50 } },
          { name: 'left_big', bounds: { minX: 0, maxX: 20, minY: 0, maxY: 25 } },
          { name: 'right_big', bounds: { minX: 0, maxX: 20, minY: 25, maxY: 50 } }
        ];
      case 'zone1-3-1':
        return [
          { name: 'point', bounds: { minX: 30, maxX: 50, minY: 20, maxY: 30 } },
          { name: 'left_wing', bounds: { minX: 15, maxX: 30, minY: 0, maxY: 20 } },
          { name: 'center', bounds: { minX: 15, maxX: 30, minY: 20, maxY: 30 } },
          { name: 'right_wing', bounds: { minX: 15, maxX: 30, minY: 30, maxY: 50 } },
          { name: 'back', bounds: { minX: 0, maxX: 15, minY: 15, maxY: 35 } }
        ];
      default:
        return [];
    }
  }

  private findBallHandler(formation: Formation): Id | null {
    // Ball handler is at the ball position
    // In a real implementation, this would be tracked in game state
    // For now, assume it's the player closest to ball
    let closest: { id: Id; distance: number } | null = null;

    for (const [playerId, position] of Object.entries(formation.players)) {
      const dist = distance(position, formation.ballPosition);
      if (!closest || dist < closest.distance) {
        closest = { id: playerId, distance: dist };
      }
    }

    return closest?.id || null;
  }

  private findClosestDefender(target: Id, defense: Team, formation: Formation): Id | null {
    const targetPos = formation.players[target];
    if (!targetPos) return null;

    let closest: { id: Id; distance: number } | null = null;

    for (const defender of defense.players) {
      const defPos = formation.players[defender.id];
      if (!defPos) continue;

      const dist = distance(targetPos, defPos);
      if (!closest || dist < closest.distance) {
        closest = { id: defender.id, distance: dist };
      }
    }

    return closest?.id || null;
  }

  private findSecondClosestDefender(target: Id, defense: Team, formation: Formation, excluding: Id): Id | null {
    const targetPos = formation.players[target];
    if (!targetPos) return null;

    let closest: { id: Id; distance: number } | null = null;

    for (const defender of defense.players) {
      if (defender.id === excluding) continue;

      const defPos = formation.players[defender.id];
      if (!defPos) continue;

      const dist = distance(targetPos, defPos);
      if (!closest || dist < closest.distance) {
        closest = { id: defender.id, distance: dist };
      }
    }

    return closest ? closest.id : null;
  }
}
