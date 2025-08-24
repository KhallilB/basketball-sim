/**
 * Real-World Basketball League Statistical Baselines
 *
 * Comprehensive data from actual basketball leagues worldwide for accurate simulation
 * and cross-league player comparison. Based on recent season data (2023-24 primarily).
 *
 * Key Features:
 * - Actual PPG, pace, and efficiency ratings from real leagues
 * - Shot style distributions (3PA rate, FTA rate, etc.)
 * - Statistical distributions for player generation
 * - Normalization factors for cross-league comparison
 *
 * Data Sources: NBA.com, NCAA.com, EuroLeague, various international sources
 *
 * @module LeagueBaselines
 * @version 1.0.0
 */

import type { League, LeagueBaseline, PositionFactors, StatRange } from '@basketball-sim/types';

// ============================================================================
// HELPER FUNCTIONS FOR STAT DISTRIBUTION CREATION
// ============================================================================

/**
 * Create a stat distribution from mean and standard deviation.
 * Includes realistic percentiles for player generation.
 */
// function createDistribution(mean: number, stdDev: number): StatDistribution {
//   return {
//     mean,
//     stdDev,
//     percentiles: {
//       p10: mean - 1.28 * stdDev,
//       p25: mean - 0.67 * stdDev,
//       p50: mean,
//       p75: mean + 0.67 * stdDev,
//       p90: mean + 1.28 * stdDev,
//       p95: mean + 1.65 * stdDev,
//       p99: mean + 2.33 * stdDev
//     }
//   };
// }

/**
 * Create a stat range from mean and standard deviation.
 */
function createRange(mean: number, stdDev: number): StatRange {
  return {
    mean,
    stdDev,
    min: Math.max(0, mean - 3 * stdDev), // 3 sigma lower bound
    max: mean + 3 * stdDev // 3 sigma upper bound
  };
}

// ============================================================================
// POSITION FACTORS (UNIVERSAL ACROSS LEAGUES)
// ============================================================================

const UNIVERSAL_POSITION_FACTORS: PositionFactors = {
  PG: {
    scoring: 0.95,
    rebounding: 0.4,
    assists: 2.5,
    steals: 1.3,
    blocks: 0.3,
    usage: 1.1
  },
  SG: {
    scoring: 1.2,
    rebounding: 0.7,
    assists: 0.8,
    steals: 1.1,
    blocks: 0.4,
    usage: 1.15
  },
  SF: {
    scoring: 1.0,
    rebounding: 1.0,
    assists: 1.0,
    steals: 1.0,
    blocks: 0.7,
    usage: 1.0
  },
  PF: {
    scoring: 0.9,
    rebounding: 1.6,
    assists: 0.6,
    steals: 0.8,
    blocks: 1.4,
    usage: 0.9
  },
  C: {
    scoring: 0.8,
    rebounding: 2.0,
    assists: 0.4,
    steals: 0.6,
    blocks: 2.2,
    usage: 0.85
  },
  G: {
    scoring: 1.1,
    rebounding: 0.55,
    assists: 1.65,
    steals: 1.2,
    blocks: 0.35,
    usage: 1.125
  },
  F: {
    scoring: 0.95,
    rebounding: 1.3,
    assists: 0.8,
    steals: 0.9,
    blocks: 1.05,
    usage: 0.95
  }
};

// ============================================================================
// REAL-WORLD LEAGUE BASELINES
// ============================================================================

/**
 * NBA (Premier Main) - 2023-24 Season
 * The gold standard for professional basketball
 */
export const NBA_BASELINE: LeagueBaseline = {
  league: 'premier_main',
  name: 'NBA',
  region: 'US',

  environment: {
    gameLength: 48,
    pace: 99.2, // Possessions per 48 minutes
    offensiveRating: 114.5, // Points per 100 possessions
    pointsPerGame: 114.2, // Average points per team per game
    shotClock: 24,

    style: {
      threePointRate: 0.39, // 3PA/FGA
      freeThrowRate: 0.22, // FTA/FGA
      assistRate: 0.63, // AST/FGM
      stealRate: 8.2, // STL per 100 possessions
      blockRate: 5.1, // BLK per 100 possessions
      foulRate: 19.8 // PF per 100 possessions
    }
  },

  per100Stats: {
    scoring: {
      points: createRange(24.5, 8.5),
      fieldGoals: { made: 10.2, attempted: 22.3, percentage: 0.457 },
      threePointers: { made: 3.2, attempted: 8.7, percentage: 0.367 },
      freeThrows: { made: 4.9, attempted: 6.2, percentage: 0.793 },
      trueShootingPercentage: 0.579,
      effectiveFieldGoalPercentage: 0.529
    },

    rebounding: {
      offensive: createRange(2.8, 1.5),
      defensive: createRange(7.2, 2.4),
      total: createRange(10.0, 3.2),
      offensiveReboundRate: 0.242, // Team ORB%
      defensiveReboundRate: 0.758 // Team DRB%
    },

    playmaking: {
      assists: createRange(6.8, 2.9),
      turnovers: createRange(3.2, 1.1),
      assistToTurnoverRatio: 2.13,
      usage: createRange(20.0, 4.8) // Usage rate
    },

    defense: {
      steals: createRange(1.6, 0.7),
      blocks: createRange(1.0, 0.9),
      personalFouls: createRange(3.9, 1.2),
      deflections: createRange(2.8, 1.1) // Advanced stat
    },

    advanced: {
      plusMinus: createRange(0.0, 12.5),
      playerEfficiencyRating: 15.0, // League average PER
      winShares: createRange(4.2, 3.8),
      boxPlusMinus: createRange(0.0, 3.2)
    }
  },

  positionFactors: UNIVERSAL_POSITION_FACTORS,

  metadata: {
    sources: ['NBA.com', 'Basketball Reference', 'NBA Advanced Stats'],
    season: '2023-24',
    sampleSize: 1230, // Total player-seasons
    dataQuality: 0.98, // Very high quality tracking data
    lastUpdated: '2024-01-01'
  }
};

/**
 * NCAA Division I - 2023-24 Season
 * Top college basketball level in the US
 */
export const NCAA_D1_BASELINE: LeagueBaseline = {
  league: 'university_power',
  name: 'NCAA Division I',
  region: 'US',

  environment: {
    gameLength: 40,
    pace: 67.8, // Slower pace than NBA
    offensiveRating: 104.5, // Lower efficiency than NBA
    pointsPerGame: 75.2, // Mid-70s as specified
    shotClock: 30, // 30-second shot clock

    style: {
      threePointRate: 0.36, // Lower 3PA rate than NBA
      freeThrowRate: 0.31, // Higher FTA rate (more fouls)
      assistRate: 0.58, // Less ball movement
      stealRate: 9.1, // Higher steal rate (more aggressive)
      blockRate: 4.8, // Similar block rate
      foulRate: 23.5 // Higher foul rate
    }
  },

  per100Stats: {
    scoring: {
      points: createRange(18.2, 6.4),
      fieldGoals: { made: 7.8, attempted: 18.1, percentage: 0.431 },
      threePointers: { made: 2.2, attempted: 6.5, percentage: 0.338 },
      freeThrows: { made: 4.2, attempted: 5.6, percentage: 0.75 },
      trueShootingPercentage: 0.545,
      effectiveFieldGoalPercentage: 0.492
    },

    rebounding: {
      offensive: createRange(3.2, 1.8),
      defensive: createRange(8.1, 2.7),
      total: createRange(11.3, 3.8),
      offensiveReboundRate: 0.285,
      defensiveReboundRate: 0.715
    },

    playmaking: {
      assists: createRange(4.2, 2.1),
      turnovers: createRange(3.8, 1.4),
      assistToTurnoverRatio: 1.11,
      usage: createRange(20.0, 5.2)
    },

    defense: {
      steals: createRange(1.8, 0.9),
      blocks: createRange(0.9, 0.8),
      personalFouls: createRange(4.8, 1.5)
    },

    advanced: {
      plusMinus: createRange(0.0, 11.2),
      playerEfficiencyRating: 15.0,
      winShares: createRange(3.1, 2.4)
    }
  },

  positionFactors: UNIVERSAL_POSITION_FACTORS,

  metadata: {
    sources: ['NCAA.com', 'KenPom', 'Sports Reference'],
    season: '2023-24',
    sampleSize: 4200, // ~350 D1 teams × 12 players
    dataQuality: 0.88,
    lastUpdated: '2024-01-01'
  }
};

/**
 * US High School (Boys Varsity) - Estimated 2023-24
 * Based on state reporting and MaxPreps data
 */
export const HIGH_SCHOOL_BASELINE: LeagueBaseline = {
  league: 'prep_traditional',
  name: 'US High School Basketball',
  region: 'US',

  environment: {
    gameLength: 32,
    pace: 61.1, // Estimated from ~58 PPG at ~0.95 PPP
    offensiveRating: 95.0, // Lower efficiency than college
    pointsPerGame: 58.0, // Per specification
    shotClock: 0, // Most states have no shot clock

    style: {
      threePointRate: 0.28, // Lower 3-point emphasis
      freeThrowRate: 0.38, // High foul rate, more free throws
      assistRate: 0.52, // Less structured offense
      stealRate: 11.5, // Very aggressive defense
      blockRate: 3.2, // Lower block rate
      foulRate: 28.7 // Very high foul rate
    }
  },

  per100Stats: {
    scoring: {
      points: createRange(15.8, 7.2),
      fieldGoals: { made: 6.2, attempted: 16.4, percentage: 0.378 },
      threePointers: { made: 1.4, attempted: 4.6, percentage: 0.304 },
      freeThrows: { made: 3.8, attempted: 6.2, percentage: 0.613 },
      trueShootingPercentage: 0.485,
      effectiveFieldGoalPercentage: 0.42
    },

    rebounding: {
      offensive: createRange(4.1, 2.4),
      defensive: createRange(9.8, 3.2),
      total: createRange(13.9, 4.8),
      offensiveReboundRate: 0.325, // More offensive boards due to misses
      defensiveReboundRate: 0.675
    },

    playmaking: {
      assists: createRange(3.1, 1.8),
      turnovers: createRange(4.5, 1.9),
      assistToTurnoverRatio: 0.69,
      usage: createRange(20.0, 6.1)
    },

    defense: {
      steals: createRange(2.2, 1.2),
      blocks: createRange(0.6, 0.5),
      personalFouls: createRange(5.8, 2.1)
    },

    advanced: {
      plusMinus: createRange(0.0, 9.8),
      playerEfficiencyRating: 15.0,
      winShares: createRange(2.1, 1.7)
    }
  },

  positionFactors: UNIVERSAL_POSITION_FACTORS,

  metadata: {
    sources: ['MaxPreps', 'NFHS', 'State Athletic Associations'],
    season: '2023-24',
    sampleSize: 2800, // Estimated active varsity players
    dataQuality: 0.65, // Limited tracking data
    lastUpdated: '2024-01-01'
  }
};

/**
 * EuroLeague - 2023-24 Season
 * Top European basketball competition
 */
export const EUROLEAGUE_BASELINE: LeagueBaseline = {
  league: 'overseas_euro_top',
  name: 'EuroLeague',
  region: 'Europe',

  environment: {
    gameLength: 40,
    pace: 71.5, // FIBA pace per specification
    offensiveRating: 112.8, // High European efficiency
    pointsPerGame: 80.6, // Low-80s per specification
    shotClock: 24, // FIBA 24-second clock

    style: {
      threePointRate: 0.35, // Lower than NBA
      freeThrowRate: 0.25, // Higher FTA rate
      assistRate: 0.68, // More ball movement than NBA
      stealRate: 6.8, // Lower steal rate
      blockRate: 3.9, // Lower block rate
      foulRate: 22.1 // Higher foul rate
    }
  },

  per100Stats: {
    scoring: {
      points: createRange(16.8, 5.9),
      fieldGoals: { made: 7.1, attempted: 15.8, percentage: 0.449 },
      threePointers: { made: 2.1, attempted: 5.5, percentage: 0.382 },
      freeThrows: { made: 3.5, attempted: 4.2, percentage: 0.833 },
      trueShootingPercentage: 0.568,
      effectiveFieldGoalPercentage: 0.516
    },

    rebounding: {
      offensive: createRange(2.9, 1.4),
      defensive: createRange(7.8, 2.1),
      total: createRange(10.7, 2.8),
      offensiveReboundRate: 0.238,
      defensiveReboundRate: 0.762
    },

    playmaking: {
      assists: createRange(4.8, 2.4),
      turnovers: createRange(2.8, 1.0),
      assistToTurnoverRatio: 1.71,
      usage: createRange(20.0, 4.2)
    },

    defense: {
      steals: createRange(1.2, 0.6),
      blocks: createRange(0.7, 0.6),
      personalFouls: createRange(4.1, 1.4)
    },

    advanced: {
      plusMinus: createRange(0.0, 10.8),
      playerEfficiencyRating: 15.0,
      winShares: createRange(3.8, 2.9)
    }
  },

  positionFactors: UNIVERSAL_POSITION_FACTORS,

  metadata: {
    sources: ['EuroLeague.net', 'Basketball Statistics'],
    season: '2023-24',
    sampleSize: 360, // 18 teams × 20 players
    dataQuality: 0.94,
    lastUpdated: '2024-01-01'
  }
};

/**
 * China CBA - 2023-24 Season
 * High-scoring Asian professional league
 */
export const CBA_BASELINE: LeagueBaseline = {
  league: 'overseas_asia_elite',
  name: 'China CBA',
  region: 'Asia',

  environment: {
    gameLength: 40,
    pace: 89.5, // Very fast pace
    offensiveRating: 113.1, // High efficiency
    pointsPerGame: 101.3, // ~101 PPG per team as specified
    shotClock: 24,

    style: {
      threePointRate: 0.37, // High 3PA rate
      freeThrowRate: 0.28, // Higher FTA rate
      assistRate: 0.61, // Good ball movement
      stealRate: 8.9, // High steal rate
      blockRate: 4.5, // Moderate block rate
      foulRate: 25.1 // High foul rate
    }
  },

  per100Stats: {
    scoring: {
      points: createRange(22.1, 7.8),
      fieldGoals: { made: 9.4, attempted: 20.8, percentage: 0.452 },
      threePointers: { made: 3.1, attempted: 7.7, percentage: 0.403 },
      freeThrows: { made: 4.6, attempted: 5.8, percentage: 0.793 },
      trueShootingPercentage: 0.581,
      effectiveFieldGoalPercentage: 0.527
    },

    rebounding: {
      offensive: createRange(3.1, 1.6),
      defensive: createRange(7.4, 2.3),
      total: createRange(10.5, 3.1),
      offensiveReboundRate: 0.256,
      defensiveReboundRate: 0.744
    },

    playmaking: {
      assists: createRange(5.9, 2.7),
      turnovers: createRange(3.5, 1.3),
      assistToTurnoverRatio: 1.69,
      usage: createRange(20.0, 5.1)
    },

    defense: {
      steals: createRange(1.8, 0.8),
      blocks: createRange(0.9, 0.7),
      personalFouls: createRange(5.1, 1.7)
    },

    advanced: {
      plusMinus: createRange(0.0, 14.2),
      playerEfficiencyRating: 15.0,
      winShares: createRange(4.8, 3.5)
    }
  },

  positionFactors: UNIVERSAL_POSITION_FACTORS,

  metadata: {
    sources: ['CBA Official', 'sport12x.com'],
    season: '2023-24',
    sampleSize: 480, // 20 teams × 24 players
    dataQuality: 0.82,
    lastUpdated: '2024-01-01'
  }
};

/**
 * NJCAA Division I (JUCO) - 2023-24 Season
 * High-tempo junior college basketball
 */
export const JUCO_BASELINE: LeagueBaseline = {
  league: 'university_juco',
  name: 'NJCAA Division I',
  region: 'US',

  environment: {
    gameLength: 40,
    pace: 78.4, // High tempo per specification
    offensiveRating: 106.8, // Good efficiency
    pointsPerGame: 83.7, // Low-80s PPG as specified
    shotClock: 35, // 35-second shot clock

    style: {
      threePointRate: 0.34, // Moderate 3PA rate
      freeThrowRate: 0.33, // High FTA rate
      assistRate: 0.56, // Less structured than D1
      stealRate: 10.2, // High steal rate
      blockRate: 4.1, // Moderate blocks
      foulRate: 26.8 // High foul rate
    }
  },

  per100Stats: {
    scoring: {
      points: createRange(19.4, 7.1),
      fieldGoals: { made: 8.1, attempted: 18.9, percentage: 0.429 },
      threePointers: { made: 2.4, attempted: 6.4, percentage: 0.375 },
      freeThrows: { made: 4.7, attempted: 6.2, percentage: 0.758 },
      trueShootingPercentage: 0.556,
      effectiveFieldGoalPercentage: 0.492
    },

    rebounding: {
      offensive: createRange(3.4, 1.9),
      defensive: createRange(8.7, 2.9),
      total: createRange(12.1, 4.1),
      offensiveReboundRate: 0.295,
      defensiveReboundRate: 0.705
    },

    playmaking: {
      assists: createRange(4.8, 2.4),
      turnovers: createRange(4.1, 1.6),
      assistToTurnoverRatio: 1.17,
      usage: createRange(20.0, 5.8)
    },

    defense: {
      steals: createRange(2.0, 1.0),
      blocks: createRange(0.8, 0.7),
      personalFouls: createRange(5.4, 1.9)
    },

    advanced: {
      plusMinus: createRange(0.0, 12.1),
      playerEfficiencyRating: 15.0,
      winShares: createRange(3.4, 2.7)
    }
  },

  positionFactors: UNIVERSAL_POSITION_FACTORS,

  metadata: {
    sources: ['NJCAA.org', 'Junior College Basketball Stats'],
    season: '2023-24',
    sampleSize: 1800, // ~180 teams × 10 players
    dataQuality: 0.72,
    lastUpdated: '2024-01-01'
  }
};

// ============================================================================
// COMPLETE LEAGUE BASELINE REGISTRY
// ============================================================================

/**
 * Master registry of all league baselines for easy access.
 * Maps league identifiers to their statistical baselines.
 */
export const LEAGUE_BASELINES: Record<League, LeagueBaseline> = {
  // Premier Professional
  premier_main: NBA_BASELINE,
  premier_womens: NBA_BASELINE, // TODO: Create separate WNBA baseline

  // College/University
  university_power: NCAA_D1_BASELINE,
  university_mid: NCAA_D1_BASELINE, // TODO: Create separate mid-major baseline
  university_small: NCAA_D1_BASELINE, // TODO: Create separate D2/D3 baselines
  university_juco: JUCO_BASELINE,

  // High School/Prep
  prep_elite: HIGH_SCHOOL_BASELINE,
  prep_traditional: HIGH_SCHOOL_BASELINE,
  prep_military: HIGH_SCHOOL_BASELINE,

  // Amateur/AAU (use HS baseline as starting point)
  amateur_showcase: HIGH_SCHOOL_BASELINE,
  amateur_grassroots: HIGH_SCHOOL_BASELINE,
  amateur_travel: HIGH_SCHOOL_BASELINE,

  // Professional Development (use modified NBA baseline)
  development_main: NBA_BASELINE, // TODO: Create G-League baseline
  development_elite: NBA_BASELINE,
  development_local: NBA_BASELINE,

  // International Professional
  overseas_euro_top: EUROLEAGUE_BASELINE,
  overseas_euro_mid: EUROLEAGUE_BASELINE, // TODO: Create domestic Euro baseline
  overseas_asia_elite: CBA_BASELINE,
  overseas_asia_dev: CBA_BASELINE,
  overseas_americas: CBA_BASELINE, // TODO: Create NBB/Americas baseline
  overseas_africa: CBA_BASELINE,

  // Elite International (use NBA baseline for now)
  international_world: NBA_BASELINE,
  international_continental: NBA_BASELINE,
  international_olympics: NBA_BASELINE
};

/**
 * Get league baseline by identifier.
 */
export function getLeagueBaseline(league: League): LeagueBaseline {
  return LEAGUE_BASELINES[league];
}

/**
 * Get all available league baselines.
 */
export function getAllLeagueBaselines(): LeagueBaseline[] {
  return Object.values(LEAGUE_BASELINES);
}

/**
 * Get leagues by region.
 */
export function getLeaguesByRegion(region: string): LeagueBaseline[] {
  return getAllLeagueBaselines().filter(baseline => baseline.region === region);
}

/**
 * Get leagues by competition tier (based on offensive rating).
 */
export function getLeaguesByTier(): {
  elite: LeagueBaseline[];
  professional: LeagueBaseline[];
  college: LeagueBaseline[];
  highSchool: LeagueBaseline[];
} {
  const baselines = getAllLeagueBaselines();

  return {
    elite: baselines.filter(b => b.environment.offensiveRating >= 114),
    professional: baselines.filter(b => b.environment.offensiveRating >= 110 && b.environment.offensiveRating < 114),
    college: baselines.filter(b => b.environment.offensiveRating >= 100 && b.environment.offensiveRating < 110),
    highSchool: baselines.filter(b => b.environment.offensiveRating < 100)
  };
}
