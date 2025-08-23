import type { Player, Team, Id } from '@basketball-sim/types';

export type PlayerTier = 'star' | 'impact' | 'role' | 'prospect';

export type RotationConfig = {
  targetMinutesByTier: Record<PlayerTier, number>; // Guidelines, not hard limits
  fatigueThreshold: number;
  minPlayersUsed: number;
  maxPlayersUsed: number;
};

export type ActiveLineup = {
  players: Player[];
  minutesPlayed: Record<Id, number>;
  lastSubTime: number;
};

export class RotationManager {
  private config: RotationConfig = {
    targetMinutesByTier: {
      star: 40, // 87-99 overall - Stars target ~40 minutes
      impact: 28, // 74-86 overall - Impact players target ~28 minutes
      role: 20, // 65-73 overall - Role players target ~20 minutes
      prospect: 12 // <65 overall - Prospects target ~12 minutes
    },
    fatigueThreshold: 80, // Sub when fatigue hits 80
    minPlayersUsed: 9,
    maxPlayersUsed: 13
  };

  /**
   * Get player tier based on overall rating
   */
  getPlayerTier(player: Player): PlayerTier {
    const overall = this.calculatePlayerOverall(player);
    if (overall >= 87) return 'star';
    if (overall >= 74) return 'impact';
    if (overall >= 65) return 'role';
    return 'prospect';
  }

  /**
   * Determine if a substitution should be made (flexible guidelines)
   */
  shouldSubstitute(
    player: Player,
    fatigue: number,
    minutesPlayed: number,
    gameTimeElapsed: number,
    scoreDiff: number
  ): boolean {
    const timeRemaining = 48 - gameTimeElapsed;
    const tier = this.getPlayerTier(player);
    const targetMinutes = this.config.targetMinutesByTier[tier];

    // In crunch time (final 5 minutes), keep best players in if game is close
    if (timeRemaining <= 5 && Math.abs(scoreDiff) <= 10) {
      if (tier === 'star' || tier === 'impact') {
        return fatigue >= 95; // Only sub if extremely fatigued
      }
    }

    // Sub if fatigue is too high (varies by tier)
    const fatigueThreshold = tier === 'star' ? 85 : tier === 'impact' ? 80 : 75;
    if (fatigue >= fatigueThreshold) {
      return true;
    }

    // Flexible minutes management - exceed target if needed
    const minutesBuffer = tier === 'star' ? 8 : tier === 'impact' ? 5 : 3;
    if (minutesPlayed >= targetMinutes + minutesBuffer) {
      return true; // Hard limit with buffer
    }

    // Rest players periodically based on tier
    if (minutesPlayed >= targetMinutes * 0.6) {
      // After 60% of target minutes
      const restChance = tier === 'star' ? 0.2 : tier === 'impact' ? 0.3 : 0.4;
      if (Math.random() < restChance && timeRemaining > 8) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get best available substitute for a position
   */
  getSubstitute(team: Team, currentLineup: Player[], minutesPlayed: Record<Id, number>): Player | null {
    // Find players who aren't currently playing
    const bench = team.players.filter(p => !currentLineup.some(active => active.id === p.id));

    if (bench.length === 0) return null;

    // Sort by freshness (less minutes played) and overall rating
    const availableSubs = bench
      .map(player => ({
        player,
        minutes: minutesPlayed[player.id] || 0,
        overall: this.calculatePlayerOverall(player),
        freshness: 48 - (minutesPlayed[player.id] || 0)
      }))
      .filter(sub => {
        const subTier = this.getPlayerTier(sub.player);
        const maxMinutes = this.config.targetMinutesByTier[subTier] + 8; // Allow buffer
        return sub.minutes < maxMinutes;
      })
      .sort((a, b) => {
        // Prioritize by freshness, then overall rating
        const freshnessWeight = 0.6;
        const ratingWeight = 0.4;

        const aScore = (a.freshness / 48) * freshnessWeight + (a.overall / 100) * ratingWeight;
        const bScore = (b.freshness / 48) * freshnessWeight + (b.overall / 100) * ratingWeight;

        return bScore - aScore;
      });

    return availableSubs.length > 0 ? availableSubs[0].player : null;
  }

  /**
   * Update minutes played for active players
   */
  updateMinutes(
    activeLineup: Player[],
    minutesPlayed: Record<Id, number>,
    possessionDuration: number
  ): Record<Id, number> {
    const updated = { ...minutesPlayed };

    for (const player of activeLineup) {
      updated[player.id] = (updated[player.id] || 0) + possessionDuration;
    }

    return updated;
  }

  /**
   * Get the optimal starting lineup (best 5 players)
   */
  getStartingLineup(team: Team): Player[] {
    return team.players
      .map(player => ({
        player,
        overall: this.calculatePlayerOverall(player)
      }))
      .sort((a, b) => b.overall - a.overall)
      .slice(0, 5)
      .map(item => item.player);
  }

  /**
   * Check if player is a star or impact player (for special handling)
   */
  isKeyPlayer(player: Player): boolean {
    const tier = this.getPlayerTier(player);
    return tier === 'star' || tier === 'impact';
  }

  /**
   * Calculate player overall rating
   */
  private calculatePlayerOverall(player: Player): number {
    const weights = {
      three: 0.08,
      mid: 0.08,
      finishing: 0.1,
      ft: 0.03,
      pass: 0.06,
      handle: 0.08,
      post: 0.05,
      roll: 0.04,
      screen: 0.03,
      onBallDef: 0.08,
      lateral: 0.06,
      rimProt: 0.06,
      steal: 0.04,
      speed: 0.06,
      accel: 0.02,
      strength: 0.04,
      vertical: 0.04,
      rebound: 0.07,
      height: 0.01,
      wingspan: 0.01,
      iq: 0.08,
      discipline: 0.03,
      consistency: 0.05,
      clutch: 0.03,
      stamina: 0.03,
      durability: 0.02
    };

    let overall = 0;
    for (const [key, weight] of Object.entries(weights)) {
      const rating = player.ratings[key as keyof typeof player.ratings];
      if (rating !== undefined) {
        overall += rating * weight;
      }
    }

    return Math.round(overall);
  }

  /**
   * Generate rotation patterns for different game situations
   */
  getRotationPattern(gameTimeElapsed: number, scoreDiff: number): 'normal' | 'rest_stars' | 'crunch_time' {
    const timeRemaining = 48 - gameTimeElapsed;

    if (timeRemaining <= 6) {
      return 'crunch_time'; // Play best players
    } else if (timeRemaining >= 36 && Math.abs(scoreDiff) <= 15) {
      return 'rest_stars'; // Rest stars if game is competitive
    } else {
      return 'normal';
    }
  }
}
