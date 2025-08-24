import type {
  Badge,
  BadgeProgress,
  Mod,
  Position
  // OutcomeShot,
  // OutcomeDrive,
  // OutcomePass,
  // OutcomeReb,
  // OutcomeFoul
} from '@basketball-sim/types';

// RTTB Badge System Implementation
// Contextual modifiers that activate based on game situation

export type BadgeActivationContext = {
  model: string;
  zone?: string;
  catch?: boolean;
  distFt?: number;
  angle?: string;
  contact?: boolean;
  position?: string;
  laneAngle?: string;
  gameTime?: number;
  scoreDiff?: number;
  [key: string]: string | number | boolean | undefined;
};

// ============================================================================
// BADGE CATALOG - MVP Set from specification
// ============================================================================

export const BADGE_CATALOG: Badge[] = [
  {
    id: 'catch_and_shoot',
    name: 'Catch & Shoot',
    description: 'Improved accuracy on catch-and-shoot three-pointers',
    tier: 1,
    when: {
      model: 'shot',
      zone: 'three',
      catch: true,
      distFtGte: 4
    },
    mods: [
      { model: 'shot', addQ: 0.15 } // Tier 1: +0.15, Tier 2: +0.25, Tier 3: +0.35
    ],
    progress: [
      { stat: 'made_catch3', count: 100, tier: 1 },
      { stat: 'made_catch3', count: 300, tier: 2 },
      { stat: 'made_catch3', count: 700, tier: 3 }
    ],
    runtime: { cooldownSec: 0 } // No cooldown for shooting badges
  },
  {
    id: 'deep_range',
    name: 'Deep Range',
    description: 'Better accuracy on very long three-point shots',
    tier: 1,
    when: {
      model: 'shot',
      zone: 'three',
      distFtGte: 24
    },
    mods: [
      { model: 'shot', addScore: 0.15 } // Tier 1: +0.15, Tier 2: +0.3
    ],
    progress: [
      { stat: 'made_deep3', count: 50, tier: 1 },
      { stat: 'made_deep3', count: 150, tier: 2 }
    ]
  },
  {
    id: 'apex_contest',
    name: 'Apex Contest',
    description: 'Elite shot contesting ability on closeouts',
    tier: 1,
    when: {
      model: 'shot', // Applied to opponent's shot
      angle: 'good'
    },
    mods: [
      { model: 'shot', addContest: 0.1 } // Tier 1: +0.1, Tier 2: +0.2
    ],
    progress: [
      { stat: 'good_contests', count: 200, tier: 1 },
      { stat: 'good_contests', count: 500, tier: 2 }
    ]
  },
  {
    id: 'needle_threader',
    name: 'Needle Threader',
    description: 'Exceptional passing through tight windows',
    tier: 1,
    when: {
      model: 'pass',
      laneAngle: 'narrow'
    },
    mods: [
      { model: 'pass', addScore: 0.2 } // Tier 1: +0.2, Tier 2: +0.35
    ],
    progress: [
      { stat: 'tight_passes', count: 150, tier: 1 },
      { stat: 'tight_passes', count: 400, tier: 2 }
    ]
  },
  {
    id: 'brick_wall',
    name: 'Brick Wall',
    description: 'Sets devastating screens that free up teammates',
    tier: 1,
    when: {
      model: 'drive', // Applied when teammate drives off screen
      position: 'inside'
    },
    mods: [{ model: 'drive', addScore: 0.15 }],
    progress: [{ stat: 'effective_screens', count: 100, tier: 1 }],
    runtime: { cooldownSec: 10 } // Can't stack screens too quickly
  },
  {
    id: 'glass_cleaner',
    name: 'Glass Cleaner',
    description: 'Dominant rebounding in traffic',
    tier: 1,
    when: {
      model: 'rebound',
      position: 'inside'
    },
    mods: [
      { model: 'rebound', addWeight: 0.2 } // Tier 1: +0.2, Tier 2: +0.35, Tier 3: +0.5
    ],
    progress: [
      { stat: 'contested_rebounds', count: 100, tier: 1 },
      { stat: 'contested_rebounds', count: 300, tier: 2 },
      { stat: 'contested_rebounds', count: 600, tier: 3 }
    ]
  },
  {
    id: 'and_one_artist',
    name: 'And-1 Artist',
    description: 'Draws fouls while finishing at the rim',
    tier: 1,
    when: {
      model: 'shot',
      zone: 'rim',
      contact: true
    },
    mods: [
      { model: 'foul', addScore: 0.2 }, // More likely to draw foul
      { model: 'shot', addScore: 0.05 } // Slight boost to make shot too
    ],
    progress: [
      { stat: 'and_ones', count: 25, tier: 1 },
      { stat: 'and_ones', count: 75, tier: 2 }
    ]
  },
  {
    id: 'lockdown_defender',
    name: 'Lockdown Defender',
    description: 'Shuts down opposing players in isolation',
    tier: 1,
    when: {
      model: 'drive' // Applied to opponent's drive attempt
    },
    mods: [
      { model: 'drive', addScore: -0.25 } // Makes drives harder
    ],
    progress: [
      { stat: 'stops', count: 100, tier: 1 },
      { stat: 'stops', count: 250, tier: 2 }
    ]
  },
  {
    id: 'clutch_gene',
    name: 'Clutch Gene',
    description: 'Elevated performance in crucial moments',
    tier: 1,
    when: {
      model: 'shot'
      // This would be activated by game situation (last 2 minutes, close game)
    },
    mods: [
      { model: 'shot', addScore: 0.3 },
      { model: 'policy', addLogit: 0.2 } // More likely to take big shots
    ],
    progress: [
      { stat: 'clutch_shots_made', count: 15, tier: 1 },
      { stat: 'clutch_shots_made', count: 40, tier: 2 }
    ]
  },
  {
    id: 'floor_spacer',
    name: 'Floor Spacer',
    description: 'Creates space with three-point threat',
    tier: 1,
    when: {
      model: 'shot',
      zone: 'three'
    },
    mods: [
      { model: 'shot', addQ: 0.1 } // Slight boost to all threes
    ],
    progress: [
      { stat: 'threes_attempted', count: 200, tier: 1 },
      { stat: 'threes_attempted', count: 500, tier: 2 }
    ]
  }
];

// ============================================================================
// BADGE ACTIVATION AND PROGRESS SYSTEM
// ============================================================================

/**
 * Check if a badge should activate given the current context
 */
export function shouldActivateBadge(badge: Badge, context: BadgeActivationContext, lastActiveTs?: number): boolean {
  // Check cooldown
  if (badge.runtime?.cooldownSec && lastActiveTs) {
    const now = Date.now() / 1000;
    if (now - lastActiveTs < badge.runtime.cooldownSec) {
      return false;
    }
  }

  // Check all predicate conditions
  for (const [key, value] of Object.entries(badge.when)) {
    const contextValue = context[key];

    if (key.endsWith('Gte')) {
      const numKey = key.replace('Gte', '');
      const contextNum = context[numKey];
      if (typeof contextNum !== 'number' || typeof value !== 'number' || contextNum < value) {
        return false;
      }
    } else if (key.endsWith('Lte')) {
      const numKey = key.replace('Lte', '');
      const contextNum = context[numKey];
      if (typeof contextNum !== 'number' || typeof value !== 'number' || contextNum > value) {
        return false;
      }
    } else if (contextValue !== value) {
      return false;
    }
  }

  return true;
}

/**
 * Get active badge modifiers for a given context
 */
export function getActiveBadgeModifiers(
  playerBadges: BadgeProgress[],
  context: BadgeActivationContext
): { mods: Mod[]; activeBadges: string[] } {
  const mods: Mod[] = [];
  const activeBadges: string[] = [];

  for (const badgeProgress of playerBadges) {
    if (badgeProgress.currentTier === 0) continue; // Not unlocked

    const badge = getBadgeById(badgeProgress.badgeId);
    if (!badge) continue;

    if (shouldActivateBadge(badge, context, badgeProgress.lastActiveTs)) {
      // Scale mods by tier
      const tierMultiplier = badgeProgress.currentTier;

      for (const mod of badge.mods) {
        const scaledMod = { ...mod };

        // Scale numeric modifiers by tier
        if ('addQ' in scaledMod && scaledMod.addQ) {
          scaledMod.addQ *= tierMultiplier;
        }
        if ('addScore' in scaledMod && scaledMod.addScore) {
          scaledMod.addScore *= tierMultiplier;
        }
        if ('addContest' in scaledMod && scaledMod.addContest) {
          scaledMod.addContest *= tierMultiplier;
        }
        if ('addWeight' in scaledMod && scaledMod.addWeight) {
          scaledMod.addWeight *= tierMultiplier;
        }
        if ('addLaneRisk' in scaledMod && scaledMod.addLaneRisk) {
          scaledMod.addLaneRisk *= tierMultiplier;
        }
        if ('addLogit' in scaledMod && scaledMod.addLogit) {
          scaledMod.addLogit *= tierMultiplier;
        }

        mods.push(scaledMod);
      }

      activeBadges.push(badge.id);

      // Update last active timestamp
      badgeProgress.lastActiveTs = Date.now() / 1000;
    }
  }

  return { mods, activeBadges };
}

/**
 * Update badge progress after a play
 */
export function updateBadgeProgress(playerBadges: BadgeProgress[], stats: Record<string, number>): BadgeProgress[] {
  const updatedBadges = [...playerBadges];

  for (const badgeProgress of updatedBadges) {
    const badge = getBadgeById(badgeProgress.badgeId);
    if (!badge?.progress) continue;

    // Update stat counts
    for (const [statName, count] of Object.entries(stats)) {
      if (badgeProgress.stats[statName] === undefined) {
        badgeProgress.stats[statName] = 0;
      }
      badgeProgress.stats[statName] += count;
    }

    // Check for tier upgrades
    for (const progressRule of badge.progress) {
      const currentCount = badgeProgress.stats[progressRule.stat] || 0;

      if (currentCount >= progressRule.count && badgeProgress.currentTier < progressRule.tier) {
        badgeProgress.currentTier = progressRule.tier as 0 | 1 | 2 | 3;
      }
    }
  }

  return updatedBadges;
}

/**
 * Initialize badge progress for a new player
 */
export function initializeBadgeProgress(availableBadges: string[] = []): BadgeProgress[] {
  const badgeIds = availableBadges.length > 0 ? availableBadges : BADGE_CATALOG.map(b => b.id);

  return badgeIds.map(badgeId => ({
    badgeId,
    currentTier: 0, // Start locked
    stats: {},
    lastActiveTs: undefined
  }));
}

/**
 * Get badge by ID
 */
export function getBadgeById(id: string): Badge | undefined {
  return BADGE_CATALOG.find(badge => badge.id === id);
}

/**
 * Get all available badges
 */
export function getAllBadges(): Badge[] {
  return BADGE_CATALOG;
}

/**
 * Get unlocked badges for a player
 */
export function getUnlockedBadges(playerBadges: BadgeProgress[]): Badge[] {
  return playerBadges
    .filter(bp => bp.currentTier > 0)
    .map(bp => getBadgeById(bp.badgeId))
    .filter((badge): badge is Badge => badge !== undefined);
}

/**
 * Calculate badge modifier sum for a specific model
 */
export function calculateBadgeModifierSum(
  mods: Mod[],
  model: 'shot' | 'pass' | 'drive' | 'rebound' | 'foul' | 'policy',
  modType: string
): number {
  return mods
    .filter(mod => mod.model === model)
    .reduce((sum, mod) => {
      if (modType in mod) {
        const value = mod[modType as keyof typeof mod];
        if (typeof value === 'number') {
          return sum + value;
        }
      }
      return sum;
    }, 0);
}

/**
 * Generate context for badge activation from game state
 */
export function generateBadgeContext(
  model: string,
  zone?: string,
  playerPos?: Position,
  defenderPos?: Position,
  gameTime?: number,
  scoreDiff?: number,
  isCatchAndShoot?: boolean
): BadgeActivationContext {
  const context: BadgeActivationContext = { model };

  if (zone) context.zone = zone;
  if (isCatchAndShoot !== undefined) context.catch = isCatchAndShoot;

  // Calculate distance to defender
  if (playerPos && defenderPos) {
    const dx = playerPos.x - defenderPos.x;
    const dy = playerPos.y - defenderPos.y;
    const distFt = Math.sqrt(dx * dx + dy * dy);
    context.distFt = distFt;

    // Determine contest angle quality
    context.angle = distFt <= 3 ? 'good' : 'poor';
  }

  // Determine position context
  if (playerPos) {
    // Inside paint vs outside
    context.position = playerPos.x <= 19 || playerPos.x >= 75 ? 'inside' : 'outside';
  }

  // Game situation context
  if (gameTime !== undefined && gameTime <= 120 && Math.abs(scoreDiff || 0) <= 5) {
    context.clutchSituation = true;
  }

  return context;
}

// ============================================================================
// BADGE EXPLANATION UTILITIES
// ============================================================================

/**
 * Explain which badges are active and their effects
 */
export function explainActiveBadges(activeBadges: string[], mods: Mod[]): { badge: string; effect: string }[] {
  const explanations: { badge: string; effect: string }[] = [];

  for (const badgeId of activeBadges) {
    const badge = getBadgeById(badgeId);
    if (!badge) continue;

    const badgeMods = mods.filter(mod => badge.mods.some(bMod => bMod.model === mod.model));

    const effects = badgeMods
      .map(mod => {
        const entries = Object.entries(mod).filter(([key]) => key !== 'model');
        return entries
          .map(([key, value]) => {
            const prefix = typeof value === 'number' && value > 0 ? '+' : '';
            return `${key}: ${prefix}${value}`;
          })
          .join(', ');
      })
      .join('; ');

    explanations.push({
      badge: badge.name,
      effect: effects
    });
  }

  return explanations;
}
