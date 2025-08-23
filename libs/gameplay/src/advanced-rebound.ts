import type {
  ReboundContext,
  ReboundResult,
  ReboundParticipant,
  ReboundTrajectory,
  Position,
  Team,
  Id
} from '@basketball-sim/types';
import { calculateReboundWeight, distance, getShotZone } from '@basketball-sim/math';

/**
 * Determine shot trajectory based on shot context
 */
export function determineShotTrajectory(
  shotLocation: Position,
  shotQuality: number,
  isOffense: boolean
): ReboundTrajectory {
  const zone = getShotZone(shotLocation, isOffense);

  // Shot quality affects trajectory
  if (shotQuality > 0.8) {
    return Math.random() < 0.7 ? 'soft' : 'short';
  }

  if (shotQuality < 0.3) {
    return Math.random() < 0.6 ? 'hard' : 'long';
  }

  // Zone-based tendencies
  switch (zone) {
    case 'rim':
      return Math.random() < 0.6 ? 'short' : 'soft';
    case 'mid':
      return Math.random() < 0.5 ? 'soft' : 'long';
    case 'three':
      return Math.random() < 0.4 ? 'long' : 'hard';
    default:
      return 'soft';
  }
}

/**
 * Determine boxing out assignments based on formation
 */
export function determineBoxOuts(
  offensivePlayers: Team['players'],
  defensivePlayers: Team['players'],
  offFormation: { players: Record<Id, Position> },
  defFormation: { players: Record<Id, Position> }
): Record<Id, Id | null> {
  const boxOuts: Record<Id, Id | null> = {};

  // Each defender tries to box out nearest offensive player
  for (const defender of defensivePlayers) {
    const defPos = defFormation.players[defender.id];
    if (!defPos) continue;

    let closestOffender: Id | null = null;
    let closestDistance = Infinity;

    for (const offender of offensivePlayers) {
      const offPos = offFormation.players[offender.id];
      if (!offPos) continue;

      const dist = distance(defPos, offPos);
      if (dist < closestDistance && dist < 8) {
        // Must be within 8 feet to box out
        closestDistance = dist;
        closestOffender = offender.id;
      }
    }

    boxOuts[defender.id] = closestOffender;
  }

  return boxOuts;
}

/**
 * Resolve advanced multi-player rebounding competition
 */
export function resolveReboundCompetition(context: ReboundContext): ReboundResult {
  const { players, reboundLocation, trajectory } = context;

  // Calculate weights for all participants
  const weightedPlayers = players.map(player => ({
    ...player,
    finalWeight: player.reboundWeight
  }));

  // Sort by weight (highest first)
  weightedPlayers.sort((a, b) => b.finalWeight - a.finalWeight);

  // Determine winner using weighted random selection
  const totalWeight = weightedPlayers.reduce((sum, p) => sum + p.finalWeight, 0);
  let random = Math.random() * totalWeight;

  let winner = weightedPlayers[0];
  for (const player of weightedPlayers) {
    random -= player.finalWeight;
    if (random <= 0) {
      winner = player;
      break;
    }
  }

  // Determine if it's contested (multiple players within 5 feet)
  const nearbyPlayers = players.filter(p => distance(p.position, reboundLocation) <= 5);
  const contested = nearbyPlayers.length > 1;

  // Determine if it's a tip-out (very contested, weak rebounding position)
  const tipOut = contested && winner.finalWeight < 0.3 && Math.random() < 0.2;

  // Determine if it's offensive rebound
  const isOffensive = context.isOffensiveRebound;

  return {
    winner: winner.id,
    isOffensive,
    contested,
    tipOut,
    explain: {
      terms: [
        { label: 'Base Weight', value: winner.reboundWeight },
        { label: 'Distance Factor', value: distance(winner.position, reboundLocation) },
        { label: 'Boxing Out', value: winner.boxOut ? 1 : 0 },
        { label: 'Contested', value: contested ? 1 : 0 }
      ],
      score: winner.finalWeight,
      p: winner.finalWeight / totalWeight,
      notes: [
        `Trajectory: ${trajectory}`,
        `Players in area: ${nearbyPlayers.length}`,
        contested ? 'Heavily contested' : 'Clean rebound'
      ]
    }
  };
}

/**
 * Create rebound participants from team formations
 */
export function createReboundParticipants(
  offensivePlayers: Team['players'],
  defensivePlayers: Team['players'],
  offFormation: { players: Record<Id, Position> },
  defFormation: { players: Record<Id, Position> },
  reboundLocation: Position,
  boxOuts: Record<Id, Id | null>
): ReboundParticipant[] {
  const participants: ReboundParticipant[] = [];

  // Add offensive players
  for (const player of offensivePlayers) {
    const position = offFormation.players[player.id];
    if (!position) continue;

    const beingBoxedOut = Object.values(boxOuts).includes(player.id);

    participants.push({
      id: player.id,
      position,
      boxOut: null, // Offensive players don't box out
      distanceToRebound: distance(position, reboundLocation),
      reboundWeight: calculateReboundWeight(player, position, reboundLocation, false, beingBoxedOut)
    });
  }

  // Add defensive players
  for (const player of defensivePlayers) {
    const position = defFormation.players[player.id];
    if (!position) continue;

    const boxingOut = boxOuts[player.id] !== null;

    participants.push({
      id: player.id,
      position,
      boxOut: boxOuts[player.id],
      distanceToRebound: distance(position, reboundLocation),
      reboundWeight: calculateReboundWeight(player, position, reboundLocation, boxingOut, false)
    });
  }

  return participants;
}
