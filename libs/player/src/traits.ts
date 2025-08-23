import type { Trait, Player, Ratings } from '@basketball-sim/types';

// RTTB Trait System Implementation
// Based on the specification: Archetype (1), Background (2), Quirks (0-1)

// ============================================================================
// ARCHETYPE TRAITS (1 required) - Define overall caps and point pools
// ============================================================================

export const ARCHETYPE_TRAITS: Trait[] = [
  {
    id: 'generational',
    kind: 'archetype',
    name: 'Generational Talent',
    description: 'Once-in-a-generation player with elite potential across the board',
    effects: [
      { type: 'ratings', path: 'three', capMax: 99 },
      { type: 'ratings', path: 'mid', capMax: 99 },
      { type: 'ratings', path: 'finishing', capMax: 99 },
      { type: 'ratings', path: 'pass', capMax: 99 },
      { type: 'ratings', path: 'handle', capMax: 99 },
      { type: 'ratings', path: 'iq', capMax: 99 },
      { type: 'ratings', path: 'clutch', capMax: 99 },
      { type: 'ratings', path: 'consistency', add: 8 },
      { type: 'relationship', key: 'rep', add: 15 }
    ],
    tags: ['elite', 'franchise-player', 'clutch']
  },
  {
    id: 'top_100',
    kind: 'archetype',
    name: 'Top 100 Prospect',
    description: 'Highly rated prospect with strong fundamentals and upside',
    effects: [
      { type: 'ratings', path: 'three', capMax: 92 },
      { type: 'ratings', path: 'mid', capMax: 92 },
      { type: 'ratings', path: 'finishing', capMax: 92 },
      { type: 'ratings', path: 'pass', capMax: 90 },
      { type: 'ratings', path: 'handle', capMax: 90 },
      { type: 'ratings', path: 'iq', capMax: 88 },
      { type: 'ratings', path: 'consistency', add: 3 },
      { type: 'relationship', key: 'rep', add: 8 }
    ],
    tags: ['prospect', 'upside']
  },
  {
    id: 'unranked',
    kind: 'archetype',
    name: 'Unranked/Walk-on',
    description: 'Overlooked player who must prove themselves through hard work',
    effects: [
      { type: 'ratings', path: 'three', capMax: 85 },
      { type: 'ratings', path: 'mid', capMax: 85 },
      { type: 'ratings', path: 'finishing', capMax: 88 },
      { type: 'ratings', path: 'pass', capMax: 82 },
      { type: 'ratings', path: 'handle', capMax: 82 },
      { type: 'ratings', path: 'iq', add: 5 }, // Scrappy players often have high IQ
      { type: 'ratings', path: 'discipline', add: 8 },
      { type: 'growth', target: 'stamina', slope: 0.3 },
      { type: 'relationship', key: 'coachTrust', add: 5 }
    ],
    tags: ['underdog', 'work-ethic', 'scrappy']
  }
];

// ============================================================================
// BACKGROUND TRAITS (2 picks) - Shape personality and growth patterns
// ============================================================================

export const BACKGROUND_TRAITS: Trait[] = [
  {
    id: 'gym_rat',
    kind: 'background',
    name: 'Gym Rat',
    description: 'Lives in the gym, constantly working to improve their game',
    effects: [
      { type: 'ratings', path: 'stamina', capMax: 95, add: 5 },
      { type: 'ratings', path: 'consistency', add: 5 },
      { type: 'growth', target: 'finishing', slope: 0.2 },
      { type: 'growth', target: 'ft', slope: 0.15 },
      { type: 'relationship', key: 'coachTrust', add: 8 }
    ],
    tags: ['work-ethic', 'improvement', 'dedication']
  },
  {
    id: 'late_bloomer',
    kind: 'background',
    name: 'Late Bloomer',
    description: 'Slow starter who peaks later in their career',
    effects: [
      { type: 'ratings', path: 'three', add: -3 }, // Start lower
      { type: 'ratings', path: 'mid', add: -3 },
      { type: 'ratings', path: 'finishing', add: -2 },
      { type: 'growth', target: 'three', slope: 0.4 }, // But grow faster
      { type: 'growth', target: 'mid', slope: 0.3 },
      { type: 'growth', target: 'iq', slope: 0.25 },
      { type: 'ratings', path: 'consistency', add: -5 } // More variance early
    ],
    tags: ['development', 'patience', 'upside']
  },
  {
    id: 'hometown_hero',
    kind: 'background',
    name: 'Hometown Hero',
    description: 'Local legend with strong community ties and pressure',
    effects: [
      { type: 'ratings', path: 'clutch', add: 5 },
      { type: 'ratings', path: 'discipline', add: -2 }, // Pressure can cause fouls
      { type: 'relationship', key: 'rep', add: 12 },
      { type: 'relationship', key: 'morale', add: 8 },
      { type: 'policy', key: 'take_big_shot', add: 0.3 }
    ],
    tags: ['hometown', 'pressure', 'clutch', 'community']
  },
  {
    id: 'defensive_nuisance',
    kind: 'background',
    name: 'Defensive Nuisance',
    description: 'Pesky defender who gets under opponents\' skin',
    effects: [
      { type: 'ratings', path: 'onBallDef', capMax: 95, add: 6 },
      { type: 'ratings', path: 'steal', add: 8 },
      { type: 'ratings', path: 'lateral', add: 5 },
      { type: 'tendency', group: 'gambleSteal', add: 15 },
      { type: 'ratings', path: 'discipline', add: -4 }, // Aggressive defense = more fouls
      { type: 'policy', key: 'help_defense', add: 0.2 }
    ],
    tags: ['defense', 'intensity', 'pest']
  },
  {
    id: 'clutch_moments',
    kind: 'background',
    name: 'Clutch Performer',
    description: 'Thrives in high-pressure situations and big moments',
    effects: [
      { type: 'ratings', path: 'clutch', capMax: 95, add: 10 },
      { type: 'ratings', path: 'consistency', add: 3 },
      { type: 'ratings', path: 'discipline', add: 5 },
      { type: 'policy', key: 'take_last_shot', add: 0.4 },
      { type: 'policy', key: 'late_game_aggression', add: 0.3 }
    ],
    tags: ['clutch', 'pressure', 'big-moments']
  },
  {
    id: 'floor_general',
    kind: 'background',
    name: 'Floor General',
    description: 'Natural leader who makes everyone around them better',
    effects: [
      { type: 'ratings', path: 'iq', capMax: 95, add: 8 },
      { type: 'ratings', path: 'pass', add: 6 },
      { type: 'ratings', path: 'discipline', add: 6 },
      { type: 'tendency', group: 'passRisk', add: -10 }, // More conservative passing
      { type: 'relationship', key: 'coachTrust', add: 10 },
      { type: 'policy', key: 'facilitate_offense', add: 0.25 }
    ],
    tags: ['leadership', 'iq', 'facilitator']
  },
  {
    id: 'athletic_freak',
    kind: 'background',
    name: 'Athletic Freak',
    description: 'Elite athleticism that opens up unique opportunities',
    effects: [
      { type: 'ratings', path: 'speed', capMax: 95, add: 8 },
      { type: 'ratings', path: 'vertical', capMax: 95, add: 10 },
      { type: 'ratings', path: 'finishing', add: 6 },
      { type: 'ratings', path: 'rebound', add: 4 },
      { type: 'ratings', path: 'rimProt', add: 5 },
      { type: 'growth', target: 'finishing', slope: 0.15 }
    ],
    tags: ['athleticism', 'dunking', 'explosive']
  },
  {
    id: 'student_of_game',
    kind: 'background',
    name: 'Student of the Game',
    description: 'High basketball IQ player who studies film religiously',
    effects: [
      { type: 'ratings', path: 'iq', capMax: 98, add: 10 },
      { type: 'ratings', path: 'consistency', add: 6 },
      { type: 'ratings', path: 'discipline', add: 8 },
      { type: 'growth', target: 'iq', slope: 0.2 },
      { type: 'growth', target: 'pass', slope: 0.15 },
      { type: 'relationship', key: 'coachTrust', add: 12 }
    ],
    tags: ['iq', 'study', 'fundamentals']
  }
];

// ============================================================================
// QUIRK TRAITS (0-1 optional) - Small trade-offs and unique characteristics
// ============================================================================

export const QUIRK_TRAITS: Trait[] = [
  {
    id: 'free_throw_hitch',
    kind: 'quirk',
    name: 'Free Throw Hitch',
    description: 'Mechanical issue with free throws, but helps with three-point range',
    effects: [
      { type: 'ratings', path: 'ft', capMax: 75, add: -8 },
      { type: 'growth', target: 'three', slope: 0.2 },
      { type: 'ratings', path: 'three', add: 3 }
    ],
    tags: ['shooting', 'mechanics', 'trade-off']
  },
  {
    id: 'injury_prone',
    kind: 'quirk',
    name: 'Injury Prone',
    description: 'Higher injury risk but plays with extra intensity when healthy',
    effects: [
      { type: 'ratings', path: 'durability', add: -15 },
      { type: 'ratings', path: 'stamina', add: -5 },
      { type: 'ratings', path: 'finishing', add: 4 }, // Plays harder when healthy
      { type: 'ratings', path: 'rebound', add: 3 }
    ],
    tags: ['injury', 'intensity', 'risk']
  },
  {
    id: 'hot_head',
    kind: 'quirk',
    name: 'Hot Head',
    description: 'Emotional player prone to technical fouls but plays with fire',
    effects: [
      { type: 'ratings', path: 'discipline', add: -12 },
      { type: 'ratings', path: 'clutch', add: 5 },
      { type: 'ratings', path: 'onBallDef', add: 4 },
      { type: 'tendency', group: 'gambleSteal', add: 10 },
      { type: 'policy', key: 'emotional_boost', add: 0.2 }
    ],
    tags: ['emotion', 'intensity', 'fouls']
  },
  {
    id: 'perfectionist',
    kind: 'quirk',
    name: 'Perfectionist',
    description: 'Extremely consistent but can be hesitant in new situations',
    effects: [
      { type: 'ratings', path: 'consistency', add: 12 },
      { type: 'ratings', path: 'ft', add: 6 },
      { type: 'ratings', path: 'discipline', add: 8 },
      { type: 'ratings', path: 'clutch', add: -3 }, // Overthinks in pressure
      { type: 'policy', key: 'shot_selection', add: -0.15 } // More selective
    ],
    tags: ['consistency', 'hesitation', 'fundamentals']
  },
  {
    id: 'showboat',
    kind: 'quirk',
    name: 'Showboat',
    description: 'Flashy player who sometimes prioritizes style over substance',
    effects: [
      { type: 'ratings', path: 'handle', add: 5 },
      { type: 'ratings', path: 'pass', add: 3 },
      { type: 'tendency', group: 'passRisk', add: 15 }, // More risky passes
      { type: 'ratings', path: 'discipline', add: -3 },
      { type: 'relationship', key: 'rep', add: 8 }, // Fans love it
      { type: 'policy', key: 'flashy_plays', add: 0.25 }
    ],
    tags: ['flashy', 'style', 'entertainment']
  }
];

// ============================================================================
// TRAIT APPLICATION UTILITIES
// ============================================================================

/**
 * Apply trait effects to a player's ratings and other attributes
 */
export function applyTraitEffects(player: Player, traits: Trait[]): Player {
  const updatedPlayer = { ...player };
  const updatedRatings = { ...player.ratings };
  const relationships = player.relationships || { coachTrust: 50, morale: 50, rep: 50 };

  for (const trait of traits) {
    for (const effect of trait.effects) {
      switch (effect.type) {
        case 'ratings':
          const currentValue = updatedRatings[effect.path];
          
          // Apply additive modifier
          if (effect.add) {
            updatedRatings[effect.path] = Math.max(25, Math.min(99, currentValue + effect.add));
          }
          
          // Apply multiplicative modifier
          if (effect.mul) {
            updatedRatings[effect.path] = Math.max(25, Math.min(99, currentValue * effect.mul));
          }
          
          // Apply caps (these are stored for growth system, not applied immediately)
          // The growth system will reference these when applying skill points
          break;
          
        case 'relationship':
          relationships[effect.key] = Math.max(0, Math.min(100, relationships[effect.key] + effect.add));
          break;
          
        // Tendency and policy effects are applied during action selection
        // Growth effects are applied during progression
      }
    }
  }

  return {
    ...updatedPlayer,
    ratings: updatedRatings,
    relationships,
    traits
  };
}

/**
 * Get all available traits by kind
 */
export function getTraitsByKind(kind: 'archetype' | 'background' | 'quirk'): Trait[] {
  switch (kind) {
    case 'archetype':
      return ARCHETYPE_TRAITS;
    case 'background':
      return BACKGROUND_TRAITS;
    case 'quirk':
      return QUIRK_TRAITS;
    default:
      return [];
  }
}

/**
 * Get trait by ID
 */
export function getTraitById(id: string): Trait | undefined {
  const allTraits = [...ARCHETYPE_TRAITS, ...BACKGROUND_TRAITS, ...QUIRK_TRAITS];
  return allTraits.find(trait => trait.id === id);
}

/**
 * Get rating caps from traits for growth system
 */
export function getRatingCapsFromTraits(traits: Trait[]): Partial<Record<keyof Ratings, number>> {
  const caps: Partial<Record<keyof Ratings, number>> = {};
  
  for (const trait of traits) {
    for (const effect of trait.effects) {
      if (effect.type === 'ratings' && effect.capMax) {
        const currentCap = caps[effect.path];
        caps[effect.path] = currentCap ? Math.max(currentCap, effect.capMax) : effect.capMax;
      }
    }
  }
  
  return caps;
}

/**
 * Get growth slopes from traits for progression system
 */
export function getGrowthSlopesFromTraits(traits: Trait[]): Partial<Record<keyof Ratings, number>> {
  const slopes: Partial<Record<keyof Ratings, number>> = {};
  
  for (const trait of traits) {
    for (const effect of trait.effects) {
      if (effect.type === 'growth') {
        const currentSlope = slopes[effect.target] || 0;
        slopes[effect.target] = currentSlope + effect.slope;
      }
    }
  }
  
  return slopes;
}

/**
 * Generate random trait combination following RTTB rules
 */
export function generateRandomTraits(seed: number): Trait[] {
  const rng = (s: number) => {
    const x = Math.sin(s) * 10000;
    return x - Math.floor(x);
  };

  const traits: Trait[] = [];
  
  // 1 Archetype (required)
  const archetypeIndex = Math.floor(rng(seed * 17) * ARCHETYPE_TRAITS.length);
  traits.push(ARCHETYPE_TRAITS[archetypeIndex]);
  
  // 2 Background traits (required)
  const availableBackgrounds = [...BACKGROUND_TRAITS];
  for (let i = 0; i < 2; i++) {
    const bgIndex = Math.floor(rng(seed * 23 + i * 7) * availableBackgrounds.length);
    traits.push(availableBackgrounds.splice(bgIndex, 1)[0]);
  }
  
  // 0-1 Quirk (optional, 60% chance)
  if (rng(seed * 31) < 0.6) {
    const quirkIndex = Math.floor(rng(seed * 37) * QUIRK_TRAITS.length);
    traits.push(QUIRK_TRAITS[quirkIndex]);
  }
  
  return traits;
}
