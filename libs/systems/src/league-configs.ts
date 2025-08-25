/**
 * Multi-League Configuration System
 *
 * Comprehensive league system with multiple options at each tier,
 * each offering unique development paths, recruitment criteria, and trade-offs.
 * Designed for immersive Create-a-Player career decisions.
 *
 * @module LeagueConfigs
 * @version 1.0.0
 */

import type { League, LeagueConfig, LeagueRecruitmentCriteria, LeagueTier } from '@basketball-sim/types';

/**
 * LEAGUE CONFIGURATIONS
 * Multiple leagues per tier with distinct characteristics, pros/cons, and recruitment criteria.
 * Each league offers different paths to player development and career advancement.
 */

// ============================================================================
// HIGH SCHOOL TIER - Foundation Building (Ages 14-18)
// ============================================================================

export const HIGH_SCHOOL_LEAGUES: Record<string, LeagueConfig> = {
  prep_elite: {
    id: 'prep_elite',
    name: 'Elite Prep Academy',
    description: 'Premier basketball prep school with elite facilities and national exposure',
    tier: 7,
    averageTalent: 65,
    talentSpread: 15,

    gameStyle: {
      pace: 1.1,
      threePointEmphasis: 1.2,
      physicalPlay: 1.05,
      ballMovement: 1.15,
      defense: 1.1
    },

    statNormalization: {
      scoring: 1.05,
      rebounding: 1.0,
      assists: 1.1,
      steals: 1.05,
      blocks: 1.05,
      turnovers: 0.95,
      shooting: {
        fg: 0.98,
        three: 1.0,
        ft: 1.02
      }
    },

    developmentMultipliers: {
      skillGrowth: 1.5, // Elite coaching and training
      experience: 1.4, // High-level competition exposure
      badgeProgress: 1.3 // Advanced skill development
    },

    typicalAgeRange: {
      min: 15,
      max: 18,
      average: 17
    }
  },

  prep_traditional: {
    id: 'prep_traditional',
    name: 'Traditional High School',
    description: 'Community-focused high school with balanced academics and athletics',
    tier: 8,
    averageTalent: 45,
    talentSpread: 25,

    gameStyle: {
      pace: 1.15,
      threePointEmphasis: 0.9,
      physicalPlay: 0.95,
      ballMovement: 0.9,
      defense: 0.95
    },

    statNormalization: {
      scoring: 1.15,
      rebounding: 1.05,
      assists: 0.9,
      steals: 1.15,
      blocks: 0.95,
      turnovers: 1.25,
      shooting: {
        fg: 0.94,
        three: 0.88,
        ft: 0.96
      }
    },

    developmentMultipliers: {
      skillGrowth: 1.2, // Good fundamentals focus
      experience: 1.0, // Standard learning environment
      badgeProgress: 1.0 // Steady progression
    },

    typicalAgeRange: {
      min: 14,
      max: 18,
      average: 16
    }
  },

  prep_military: {
    id: 'prep_military',
    name: 'Military Prep Academy',
    description: 'Military-style prep school emphasizing discipline, structure, and character',
    tier: 7,
    averageTalent: 55,
    talentSpread: 18,

    gameStyle: {
      pace: 1.0,
      threePointEmphasis: 0.95,
      physicalPlay: 1.15,
      ballMovement: 1.05,
      defense: 1.2
    },

    statNormalization: {
      scoring: 0.98,
      rebounding: 1.05,
      assists: 1.05,
      steals: 1.1,
      blocks: 1.0,
      turnovers: 0.9,
      shooting: {
        fg: 0.97,
        three: 0.95,
        ft: 1.05
      }
    },

    developmentMultipliers: {
      skillGrowth: 1.3, // Disciplined training approach
      experience: 1.2, // Character building focus
      badgeProgress: 1.1 // Fundamentals emphasis
    },

    typicalAgeRange: {
      min: 15,
      max: 18,
      average: 17
    }
  }
};

// ============================================================================
// AMATEUR/AAU TIER - Elite Amateur Competition (Ages 16-18)
// ============================================================================

export const AMATEUR_LEAGUES: Record<string, LeagueConfig> = {
  amateur_showcase: {
    id: 'amateur_showcase',
    name: 'National Showcase Circuit',
    description: 'Elite national circuit focused on individual showcasing and recruitment exposure',
    tier: 6,
    averageTalent: 70,
    talentSpread: 15,

    gameStyle: {
      pace: 1.25,
      threePointEmphasis: 1.3,
      physicalPlay: 1.0,
      ballMovement: 0.9,
      defense: 0.95
    },

    statNormalization: {
      scoring: 1.2,
      rebounding: 1.0,
      assists: 0.85,
      steals: 1.15,
      blocks: 1.1,
      turnovers: 1.15,
      shooting: {
        fg: 0.96,
        three: 0.98,
        ft: 0.98
      }
    },

    developmentMultipliers: {
      skillGrowth: 1.4, // Elite competition drives improvement
      experience: 1.3, // High exposure to college scouts
      badgeProgress: 1.25 // Individual skill focus
    },

    typicalAgeRange: {
      min: 16,
      max: 18,
      average: 17
    }
  },

  amateur_grassroots: {
    id: 'amateur_grassroots',
    name: 'Grassroots Basketball League',
    description: 'Community-based league emphasizing fundamentals and team basketball',
    tier: 7,
    averageTalent: 55,
    talentSpread: 20,

    gameStyle: {
      pace: 1.1,
      threePointEmphasis: 1.0,
      physicalPlay: 1.0,
      ballMovement: 1.2,
      defense: 1.05
    },

    statNormalization: {
      scoring: 1.05,
      rebounding: 1.0,
      assists: 1.15,
      steals: 1.0,
      blocks: 1.0,
      turnovers: 0.95,
      shooting: {
        fg: 0.99,
        three: 0.97,
        ft: 1.0
      }
    },

    developmentMultipliers: {
      skillGrowth: 1.25, // Strong fundamentals coaching
      experience: 1.1, // Good team basketball learning
      badgeProgress: 1.15 // Well-rounded development
    },

    typicalAgeRange: {
      min: 16,
      max: 18,
      average: 17
    }
  },

  amateur_travel: {
    id: 'amateur_travel',
    name: 'Elite Travel Circuit',
    description: 'High-level travel circuit with diverse competition and extensive tournaments',
    tier: 6,
    averageTalent: 65,
    talentSpread: 18,

    gameStyle: {
      pace: 1.15,
      threePointEmphasis: 1.15,
      physicalPlay: 1.05,
      ballMovement: 1.0,
      defense: 1.0
    },

    statNormalization: {
      scoring: 1.1,
      rebounding: 1.0,
      assists: 0.95,
      steals: 1.1,
      blocks: 1.05,
      turnovers: 1.1,
      shooting: {
        fg: 0.97,
        three: 0.96,
        ft: 0.99
      }
    },

    developmentMultipliers: {
      skillGrowth: 1.35, // Diverse competition styles
      experience: 1.25, // Extensive tournament experience
      badgeProgress: 1.2 // Rapid skill development
    },

    typicalAgeRange: {
      min: 16,
      max: 18,
      average: 17
    }
  }
};

// ============================================================================
// COLLEGE TIER - University Basketball (Ages 18-22)
// ============================================================================

export const COLLEGE_LEAGUES: Record<string, LeagueConfig> = {
  university_power: {
    id: 'university_power',
    name: 'Power Conference',
    description: 'Elite college conference with top talent, media exposure, and intense pressure',
    tier: 3,
    averageTalent: 75,
    talentSpread: 12,

    gameStyle: {
      pace: 1.05,
      threePointEmphasis: 1.2,
      physicalPlay: 1.15,
      ballMovement: 1.15,
      defense: 1.2
    },

    statNormalization: {
      scoring: 0.92,
      rebounding: 1.0,
      assists: 1.1,
      steals: 1.0,
      blocks: 1.0,
      turnovers: 1.0,
      shooting: {
        fg: 1.0,
        three: 1.0,
        ft: 1.02
      }
    },

    developmentMultipliers: {
      skillGrowth: 1.3, // Elite coaching and facilities
      experience: 1.5, // High-pressure, high-exposure environment
      badgeProgress: 1.2 // Advanced system learning
    },

    typicalAgeRange: {
      min: 18,
      max: 22,
      average: 20
    }
  },

  university_mid: {
    id: 'university_mid',
    name: 'Mid-Major Conference',
    description: 'Competitive conference focused on player development and team success',
    tier: 5,
    averageTalent: 62,
    talentSpread: 18,

    gameStyle: {
      pace: 1.02,
      threePointEmphasis: 1.1,
      physicalPlay: 1.1,
      ballMovement: 1.15,
      defense: 1.15
    },

    statNormalization: {
      scoring: 1.0,
      rebounding: 1.0,
      assists: 1.15,
      steals: 1.05,
      blocks: 1.0,
      turnovers: 0.98,
      shooting: {
        fg: 1.0,
        three: 0.98,
        ft: 1.0
      }
    },

    developmentMultipliers: {
      skillGrowth: 1.35, // Strong development focus
      experience: 1.25, // Good competition without extreme pressure
      badgeProgress: 1.25 // Emphasis on individual improvement
    },

    typicalAgeRange: {
      min: 18,
      max: 22,
      average: 20
    }
  },

  university_small: {
    id: 'university_small',
    name: 'Small College',
    description: 'Intimate college environment with personal attention and academic focus',
    tier: 6,
    averageTalent: 52,
    talentSpread: 22,

    gameStyle: {
      pace: 0.98,
      threePointEmphasis: 1.0,
      physicalPlay: 1.05,
      ballMovement: 1.1,
      defense: 1.1
    },

    statNormalization: {
      scoring: 1.08,
      rebounding: 1.0,
      assists: 1.1,
      steals: 1.05,
      blocks: 0.95,
      turnovers: 1.05,
      shooting: {
        fg: 0.97,
        three: 0.94,
        ft: 0.98
      }
    },

    developmentMultipliers: {
      skillGrowth: 1.2, // Personal attention from coaches
      experience: 1.15, // Leadership development opportunities
      badgeProgress: 1.1 // Well-rounded growth focus
    },

    typicalAgeRange: {
      min: 18,
      max: 22,
      average: 20
    }
  },

  university_juco: {
    id: 'university_juco',
    name: 'Junior College',
    description: 'Two-year development program offering second chances and rapid improvement',
    tier: 6,
    averageTalent: 58,
    talentSpread: 25,

    gameStyle: {
      pace: 1.05,
      threePointEmphasis: 1.05,
      physicalPlay: 1.0,
      ballMovement: 1.0,
      defense: 1.05
    },

    statNormalization: {
      scoring: 1.05,
      rebounding: 1.0,
      assists: 1.0,
      steals: 1.05,
      blocks: 1.0,
      turnovers: 1.1,
      shooting: {
        fg: 0.96,
        three: 0.95,
        ft: 0.97
      }
    },

    developmentMultipliers: {
      skillGrowth: 1.4, // Intensive development focus
      experience: 1.2, // Quick maturation environment
      badgeProgress: 1.3 // Rapid skill acquisition
    },

    typicalAgeRange: {
      min: 18,
      max: 20,
      average: 19
    }
  }
};

// ============================================================================
// LEAGUE RECRUITMENT CRITERIA
// Defines what each league looks for in players and how they recruit
// ============================================================================

export const LEAGUE_RECRUITMENT_CRITERIA: Record<League, LeagueRecruitmentCriteria> = {
  // HIGH SCHOOL TIER
  prep_elite: {
    league: 'prep_elite',
    minimumRequirements: {
      overallRating: 65,
      keyStats: {
        iq: 70,
        three: 60,
        handle: 65
      }
    },
    priorities: {
      statPriorities: {
        three: 0.9,
        mid: 0.8,
        finishing: 0.9,
        handle: 0.95,
        pass: 0.85,
        iq: 0.9,
        consistency: 0.8,
        clutch: 0.7,
        speed: 0.8,
        accel: 0.8,
        onBallDef: 0.7,
        lateral: 0.75,
        steal: 0.6,
        rimProt: 0.5,
        rebound: 0.6,
        post: 0.4,
        roll: 0.6,
        screen: 0.4,
        strength: 0.6,
        vertical: 0.7,
        stamina: 0.7,
        discipline: 0.8,
        ft: 0.8,
        durability: 0.6,
        height: 0.3,
        wingspan: 0.3
      },
      preferredTraits: ['gym_rat', 'clutch_performer', 'high_motor'],
      avoidedTraits: ['injury_prone', 'attitude_problem'],
      stylePreferences: {
        playStyle: ['finesse', 'versatile'],
        positionNeeds: ['PG', 'SG', 'SF']
      }
    },
    recruitmentFactors: {
      aggressiveness: 0.9,
      potentialWeight: 0.8,
      competitionLevel: 0.9
    }
  },

  prep_traditional: {
    league: 'prep_traditional',
    minimumRequirements: {
      overallRating: 40,
      keyStats: {},
      academicRequirement: 70,
      characterRequirement: 75
    },
    priorities: {
      statPriorities: {
        three: 0.6,
        mid: 0.7,
        finishing: 0.8,
        handle: 0.7,
        pass: 0.8,
        iq: 0.85,
        consistency: 0.9,
        clutch: 0.6,
        speed: 0.6,
        accel: 0.6,
        onBallDef: 0.8,
        lateral: 0.7,
        steal: 0.7,
        rimProt: 0.7,
        rebound: 0.8,
        post: 0.6,
        roll: 0.6,
        screen: 0.7,
        strength: 0.7,
        vertical: 0.6,
        stamina: 0.8,
        discipline: 0.95,
        ft: 0.8,
        durability: 0.7,
        height: 0.5,
        wingspan: 0.5
      },
      preferredTraits: ['team_first', 'coachable', 'hardworker'],
      avoidedTraits: ['selfish', 'attitude_problem', 'distracted'],
      stylePreferences: {
        playStyle: ['fundamental', 'versatile'],
        positionNeeds: ['PG', 'SG', 'SF', 'PF', 'C']
      }
    },
    recruitmentFactors: {
      aggressiveness: 0.3,
      potentialWeight: 0.6,
      competitionLevel: 0.2,
      geographicPreference: {
        preferredRegions: ['local'],
        localBonus: 0.3
      }
    }
  },

  prep_military: {
    league: 'prep_military',
    minimumRequirements: {
      overallRating: 50,
      keyStats: {
        discipline: 80,
        iq: 65
      },
      characterRequirement: 85
    },
    priorities: {
      statPriorities: {
        three: 0.6,
        mid: 0.7,
        finishing: 0.8,
        handle: 0.7,
        pass: 0.8,
        iq: 0.9,
        consistency: 0.95,
        clutch: 0.8,
        speed: 0.7,
        accel: 0.7,
        onBallDef: 0.9,
        lateral: 0.8,
        steal: 0.8,
        rimProt: 0.8,
        rebound: 0.85,
        post: 0.7,
        roll: 0.7,
        screen: 0.8,
        strength: 0.8,
        vertical: 0.7,
        stamina: 0.9,
        discipline: 1.0,
        ft: 0.85,
        durability: 0.8,
        height: 0.6,
        wingspan: 0.6
      },
      preferredTraits: ['disciplined', 'leader', 'hardworker', 'defensive_minded'],
      avoidedTraits: ['undisciplined', 'attitude_problem', 'soft'],
      stylePreferences: {
        playStyle: ['fundamental', 'physical'],
        positionNeeds: ['PG', 'SG', 'SF', 'PF', 'C']
      }
    },
    recruitmentFactors: {
      aggressiveness: 0.6,
      potentialWeight: 0.5,
      competitionLevel: 0.6
    }
  },

  // AMATEUR TIER
  amateur_showcase: {
    league: 'amateur_showcase',
    minimumRequirements: {
      overallRating: 70,
      keyStats: {
        three: 70,
        handle: 75,
        speed: 70
      }
    },
    priorities: {
      statPriorities: {
        three: 1.0,
        mid: 0.9,
        finishing: 0.95,
        handle: 1.0,
        pass: 0.7,
        iq: 0.7,
        consistency: 0.6,
        clutch: 0.9,
        speed: 0.95,
        accel: 0.95,
        onBallDef: 0.6,
        lateral: 0.8,
        steal: 0.7,
        rimProt: 0.6,
        rebound: 0.6,
        post: 0.5,
        roll: 0.7,
        screen: 0.4,
        strength: 0.6,
        vertical: 0.9,
        stamina: 0.8,
        discipline: 0.5,
        ft: 0.8,
        durability: 0.6,
        height: 0.4,
        wingspan: 0.4
      },
      preferredTraits: ['showtime', 'clutch_performer', 'athletic'],
      avoidedTraits: ['team_first', 'pass_first'],
      stylePreferences: {
        playStyle: ['explosive', 'finesse'],
        positionNeeds: ['PG', 'SG', 'SF']
      }
    },
    recruitmentFactors: {
      aggressiveness: 1.0,
      potentialWeight: 0.9,
      competitionLevel: 1.0
    }
  },

  amateur_grassroots: {
    league: 'amateur_grassroots',
    minimumRequirements: {
      overallRating: 55,
      keyStats: {
        iq: 65,
        pass: 60
      },
      characterRequirement: 80
    },
    priorities: {
      statPriorities: {
        three: 0.7,
        mid: 0.8,
        finishing: 0.8,
        handle: 0.8,
        pass: 0.95,
        iq: 0.95,
        consistency: 0.9,
        clutch: 0.7,
        speed: 0.7,
        accel: 0.7,
        onBallDef: 0.85,
        lateral: 0.8,
        steal: 0.8,
        rimProt: 0.8,
        rebound: 0.85,
        post: 0.7,
        roll: 0.8,
        screen: 0.8,
        strength: 0.8,
        vertical: 0.7,
        stamina: 0.8,
        discipline: 0.9,
        ft: 0.8,
        durability: 0.8,
        height: 0.6,
        wingspan: 0.6
      },
      preferredTraits: ['team_first', 'fundamentally_sound', 'coachable'],
      avoidedTraits: ['selfish', 'undisciplined'],
      stylePreferences: {
        playStyle: ['fundamental', 'versatile'],
        positionNeeds: ['PG', 'SG', 'SF', 'PF', 'C']
      }
    },
    recruitmentFactors: {
      aggressiveness: 0.6,
      potentialWeight: 0.7,
      competitionLevel: 0.5,
      geographicPreference: {
        preferredRegions: ['regional'],
        localBonus: 0.2
      }
    }
  },

  amateur_travel: {
    league: 'amateur_travel',
    minimumRequirements: {
      overallRating: 65,
      keyStats: {
        handle: 70,
        speed: 65,
        iq: 70
      }
    },
    priorities: {
      statPriorities: {
        three: 0.85,
        mid: 0.85,
        finishing: 0.9,
        handle: 0.95,
        pass: 0.8,
        iq: 0.85,
        consistency: 0.8,
        clutch: 0.8,
        speed: 0.9,
        accel: 0.9,
        onBallDef: 0.75,
        lateral: 0.8,
        steal: 0.75,
        rimProt: 0.7,
        rebound: 0.7,
        post: 0.6,
        roll: 0.7,
        screen: 0.6,
        strength: 0.7,
        vertical: 0.8,
        stamina: 0.85,
        discipline: 0.75,
        ft: 0.8,
        durability: 0.8,
        height: 0.5,
        wingspan: 0.5
      },
      preferredTraits: ['versatile_scorer', 'competitive', 'adaptable'],
      avoidedTraits: ['one_dimensional', 'injury_prone'],
      stylePreferences: {
        playStyle: ['versatile', 'finesse'],
        positionNeeds: ['PG', 'SG', 'SF', 'PF']
      }
    },
    recruitmentFactors: {
      aggressiveness: 0.8,
      potentialWeight: 0.75,
      competitionLevel: 0.8
    }
  },

  // COLLEGE TIER
  university_power: {
    league: 'university_power',
    minimumRequirements: {
      overallRating: 75,
      keyStats: { iq: 75, three: 70, handle: 70 },
      academicRequirement: 65
    },
    priorities: {
      statPriorities: { three: 0.9, mid: 0.85, finishing: 0.9, handle: 0.9, pass: 0.8, iq: 0.85, consistency: 0.8, clutch: 0.85, speed: 0.85, accel: 0.85, onBallDef: 0.8, lateral: 0.8, steal: 0.75, rimProt: 0.75, rebound: 0.8, post: 0.7, roll: 0.75, screen: 0.7, strength: 0.75, vertical: 0.8, stamina: 0.85, discipline: 0.8, ft: 0.85, durability: 0.75, height: 0.6, wingspan: 0.6 },
      preferredTraits: ['clutch_performer', 'competitive', 'high_motor'],
      avoidedTraits: ['attitude_problem', 'injury_prone'],
      stylePreferences: { playStyle: ['versatile', 'explosive'], positionNeeds: ['PG', 'SG', 'SF', 'PF', 'C'] }
    },
    recruitmentFactors: { aggressiveness: 0.95, potentialWeight: 0.8, competitionLevel: 0.95 }
  },

  university_mid: {
    league: 'university_mid',
    minimumRequirements: {
      overallRating: 65,
      keyStats: { iq: 70, consistency: 65 },
      academicRequirement: 70
    },
    priorities: {
      statPriorities: { three: 0.8, mid: 0.8, finishing: 0.85, handle: 0.8, pass: 0.85, iq: 0.9, consistency: 0.9, clutch: 0.75, speed: 0.75, accel: 0.75, onBallDef: 0.8, lateral: 0.75, steal: 0.75, rimProt: 0.8, rebound: 0.85, post: 0.75, roll: 0.8, screen: 0.8, strength: 0.8, vertical: 0.75, stamina: 0.8, discipline: 0.85, ft: 0.8, durability: 0.8, height: 0.7, wingspan: 0.7 },
      preferredTraits: ['fundamentally_sound', 'coachable', 'team_first'],
      avoidedTraits: ['selfish', 'undisciplined'],
      stylePreferences: { playStyle: ['fundamental', 'versatile'], positionNeeds: ['PG', 'SG', 'SF', 'PF', 'C'] }
    },
    recruitmentFactors: { aggressiveness: 0.7, potentialWeight: 0.75, competitionLevel: 0.7 }
  },

  university_small: {
    league: 'university_small',
    minimumRequirements: {
      overallRating: 55,
      keyStats: { iq: 65 },
      academicRequirement: 75
    },
    priorities: {
      statPriorities: { three: 0.75, mid: 0.8, finishing: 0.8, handle: 0.75, pass: 0.85, iq: 0.95, consistency: 0.9, clutch: 0.7, speed: 0.7, accel: 0.7, onBallDef: 0.8, lateral: 0.75, steal: 0.75, rimProt: 0.8, rebound: 0.85, post: 0.8, roll: 0.8, screen: 0.85, strength: 0.8, vertical: 0.7, stamina: 0.8, discipline: 0.9, ft: 0.8, durability: 0.8, height: 0.8, wingspan: 0.8 },
      preferredTraits: ['fundamentally_sound', 'hardworker', 'coachable'],
      avoidedTraits: ['attitude_problem', 'undisciplined'],
      stylePreferences: { playStyle: ['fundamental'], positionNeeds: ['PG', 'SG', 'SF', 'PF', 'C'] }
    },
    recruitmentFactors: { aggressiveness: 0.5, potentialWeight: 0.7, competitionLevel: 0.5 }
  },

  university_juco: {
    league: 'university_juco',
    minimumRequirements: {
      overallRating: 50,
      keyStats: {},
      academicRequirement: 60
    },
    priorities: {
      statPriorities: { three: 0.7, mid: 0.75, finishing: 0.8, handle: 0.75, pass: 0.8, iq: 0.85, consistency: 0.85, clutch: 0.7, speed: 0.7, accel: 0.7, onBallDef: 0.75, lateral: 0.7, steal: 0.7, rimProt: 0.75, rebound: 0.8, post: 0.75, roll: 0.75, screen: 0.8, strength: 0.75, vertical: 0.7, stamina: 0.75, discipline: 0.85, ft: 0.75, durability: 0.75, height: 0.8, wingspan: 0.8 },
      preferredTraits: ['hardworker', 'coachable', 'second_chance'],
      avoidedTraits: ['attitude_problem'],
      stylePreferences: { playStyle: ['fundamental', 'physical'], positionNeeds: ['PG', 'SG', 'SF', 'PF', 'C'] }
    },
    recruitmentFactors: { aggressiveness: 0.8, potentialWeight: 0.8, competitionLevel: 0.4 }
  },

  // PROFESSIONAL DEVELOPMENT TIER
  development_main: {
    league: 'development_main',
    minimumRequirements: { overallRating: 70, keyStats: { iq: 75, consistency: 70 } },
    priorities: {
      statPriorities: { three: 0.85, mid: 0.8, finishing: 0.9, handle: 0.85, pass: 0.8, iq: 0.9, consistency: 0.85, clutch: 0.8, speed: 0.8, accel: 0.8, onBallDef: 0.8, lateral: 0.8, steal: 0.75, rimProt: 0.8, rebound: 0.8, post: 0.75, roll: 0.8, screen: 0.75, strength: 0.8, vertical: 0.8, stamina: 0.85, discipline: 0.85, ft: 0.8, durability: 0.8, height: 0.6, wingspan: 0.6 },
      preferredTraits: ['professional_ready', 'competitive', 'adaptable'],
      avoidedTraits: ['attitude_problem', 'injury_prone'],
      stylePreferences: { playStyle: ['versatile', 'finesse'], positionNeeds: ['PG', 'SG', 'SF', 'PF', 'C'] }
    },
    recruitmentFactors: { aggressiveness: 0.8, potentialWeight: 0.85, competitionLevel: 0.8 }
  },

  development_elite: {
    league: 'development_elite',
    minimumRequirements: { overallRating: 75, keyStats: { iq: 80, three: 75 } },
    priorities: {
      statPriorities: { three: 0.9, mid: 0.85, finishing: 0.85, handle: 0.9, pass: 0.85, iq: 0.95, consistency: 0.8, clutch: 0.75, speed: 0.8, accel: 0.8, onBallDef: 0.75, lateral: 0.8, steal: 0.7, rimProt: 0.7, rebound: 0.75, post: 0.7, roll: 0.75, screen: 0.7, strength: 0.75, vertical: 0.75, stamina: 0.8, discipline: 0.9, ft: 0.85, durability: 0.75, height: 0.5, wingspan: 0.5 },
      preferredTraits: ['high_iq', 'skilled', 'tactical'],
      avoidedTraits: ['one_dimensional', 'low_iq'],
      stylePreferences: { playStyle: ['finesse', 'fundamental'], positionNeeds: ['PG', 'SG', 'SF'] }
    },
    recruitmentFactors: { aggressiveness: 0.9, potentialWeight: 0.75, competitionLevel: 0.9 }
  },

  development_local: {
    league: 'development_local',
    minimumRequirements: { overallRating: 60, keyStats: {} },
    priorities: {
      statPriorities: { three: 0.75, mid: 0.75, finishing: 0.8, handle: 0.75, pass: 0.8, iq: 0.8, consistency: 0.85, clutch: 0.7, speed: 0.75, accel: 0.75, onBallDef: 0.8, lateral: 0.75, steal: 0.75, rimProt: 0.8, rebound: 0.85, post: 0.8, roll: 0.8, screen: 0.85, strength: 0.8, vertical: 0.75, stamina: 0.8, discipline: 0.8, ft: 0.75, durability: 0.8, height: 0.7, wingspan: 0.7 },
      preferredTraits: ['hardworker', 'team_first', 'local_favorite'],
      avoidedTraits: ['attitude_problem'],
      stylePreferences: { playStyle: ['fundamental', 'physical'], positionNeeds: ['PG', 'SG', 'SF', 'PF', 'C'] }
    },
    recruitmentFactors: { aggressiveness: 0.6, potentialWeight: 0.7, competitionLevel: 0.6, geographicPreference: { preferredRegions: ['local'], localBonus: 0.4 } }
  },

  // INTERNATIONAL PROFESSIONAL TIER
  overseas_euro_top: {
    league: 'overseas_euro_top',
    minimumRequirements: { overallRating: 80, keyStats: { iq: 85, three: 80 } },
    priorities: {
      statPriorities: { three: 0.95, mid: 0.9, finishing: 0.85, handle: 0.9, pass: 0.9, iq: 1.0, consistency: 0.9, clutch: 0.8, speed: 0.75, accel: 0.75, onBallDef: 0.85, lateral: 0.8, steal: 0.75, rimProt: 0.8, rebound: 0.8, post: 0.8, roll: 0.85, screen: 0.85, strength: 0.8, vertical: 0.7, stamina: 0.85, discipline: 0.95, ft: 0.9, durability: 0.8, height: 0.6, wingspan: 0.6 },
      preferredTraits: ['tactical', 'high_iq', 'skilled'],
      avoidedTraits: ['undisciplined', 'low_iq'],
      stylePreferences: { playStyle: ['finesse', 'fundamental'], positionNeeds: ['PG', 'SG', 'SF', 'PF', 'C'] }
    },
    recruitmentFactors: { aggressiveness: 0.85, potentialWeight: 0.6, competitionLevel: 0.9 }
  },

  overseas_euro_mid: {
    league: 'overseas_euro_mid',
    minimumRequirements: { overallRating: 70, keyStats: { iq: 75 } },
    priorities: {
      statPriorities: { three: 0.85, mid: 0.85, finishing: 0.8, handle: 0.8, pass: 0.85, iq: 0.9, consistency: 0.85, clutch: 0.75, speed: 0.75, accel: 0.75, onBallDef: 0.8, lateral: 0.8, steal: 0.75, rimProt: 0.8, rebound: 0.8, post: 0.8, roll: 0.8, screen: 0.8, strength: 0.8, vertical: 0.75, stamina: 0.8, discipline: 0.9, ft: 0.85, durability: 0.8, height: 0.7, wingspan: 0.7 },
      preferredTraits: ['skilled', 'adaptable', 'professional'],
      avoidedTraits: ['undisciplined'],
      stylePreferences: { playStyle: ['finesse', 'versatile'], positionNeeds: ['PG', 'SG', 'SF', 'PF', 'C'] }
    },
    recruitmentFactors: { aggressiveness: 0.7, potentialWeight: 0.7, competitionLevel: 0.75 }
  },

  overseas_asia_elite: {
    league: 'overseas_asia_elite',
    minimumRequirements: { overallRating: 75, keyStats: { speed: 75, three: 75 } },
    priorities: {
      statPriorities: { three: 0.9, mid: 0.8, finishing: 0.85, handle: 0.85, pass: 0.8, iq: 0.85, consistency: 0.8, clutch: 0.8, speed: 0.9, accel: 0.9, onBallDef: 0.8, lateral: 0.85, steal: 0.8, rimProt: 0.75, rebound: 0.75, post: 0.7, roll: 0.75, screen: 0.7, strength: 0.75, vertical: 0.85, stamina: 0.85, discipline: 0.8, ft: 0.8, durability: 0.8, height: 0.5, wingspan: 0.5 },
      preferredTraits: ['athletic', 'fast_paced', 'skilled'],
      avoidedTraits: ['slow', 'injury_prone'],
      stylePreferences: { playStyle: ['explosive', 'finesse'], positionNeeds: ['PG', 'SG', 'SF'] }
    },
    recruitmentFactors: { aggressiveness: 0.8, potentialWeight: 0.75, competitionLevel: 0.8 }
  },

  overseas_asia_dev: {
    league: 'overseas_asia_dev',
    minimumRequirements: { overallRating: 65, keyStats: {} },
    priorities: {
      statPriorities: { three: 0.8, mid: 0.75, finishing: 0.8, handle: 0.8, pass: 0.75, iq: 0.8, consistency: 0.8, clutch: 0.75, speed: 0.85, accel: 0.85, onBallDef: 0.75, lateral: 0.8, steal: 0.75, rimProt: 0.75, rebound: 0.75, post: 0.7, roll: 0.75, screen: 0.7, strength: 0.75, vertical: 0.8, stamina: 0.8, discipline: 0.75, ft: 0.75, durability: 0.75, height: 0.6, wingspan: 0.6 },
      preferredTraits: ['adaptable', 'athletic', 'hardworker'],
      avoidedTraits: ['attitude_problem'],
      stylePreferences: { playStyle: ['explosive', 'versatile'], positionNeeds: ['PG', 'SG', 'SF', 'PF', 'C'] }
    },
    recruitmentFactors: { aggressiveness: 0.7, potentialWeight: 0.8, competitionLevel: 0.65 }
  },

  overseas_americas: {
    league: 'overseas_americas',
    minimumRequirements: { overallRating: 70, keyStats: { finishing: 70, strength: 65 } },
    priorities: {
      statPriorities: { three: 0.8, mid: 0.8, finishing: 0.9, handle: 0.8, pass: 0.8, iq: 0.8, consistency: 0.8, clutch: 0.85, speed: 0.8, accel: 0.8, onBallDef: 0.8, lateral: 0.8, steal: 0.8, rimProt: 0.85, rebound: 0.85, post: 0.85, roll: 0.8, screen: 0.8, strength: 0.85, vertical: 0.8, stamina: 0.8, discipline: 0.8, ft: 0.8, durability: 0.8, height: 0.7, wingspan: 0.7 },
      preferredTraits: ['physical', 'passionate', 'clutch_performer'],
      avoidedTraits: ['soft', 'low_motor'],
      stylePreferences: { playStyle: ['physical', 'explosive'], positionNeeds: ['SG', 'SF', 'PF', 'C'] }
    },
    recruitmentFactors: { aggressiveness: 0.75, potentialWeight: 0.7, competitionLevel: 0.7 }
  },

  overseas_africa: {
    league: 'overseas_africa',
    minimumRequirements: { overallRating: 65, keyStats: {} },
    priorities: {
      statPriorities: { three: 0.75, mid: 0.75, finishing: 0.85, handle: 0.75, pass: 0.75, iq: 0.75, consistency: 0.75, clutch: 0.8, speed: 0.8, accel: 0.8, onBallDef: 0.8, lateral: 0.8, steal: 0.8, rimProt: 0.85, rebound: 0.85, post: 0.8, roll: 0.8, screen: 0.8, strength: 0.85, vertical: 0.85, stamina: 0.85, discipline: 0.75, ft: 0.75, durability: 0.8, height: 0.8, wingspan: 0.8 },
      preferredTraits: ['athletic', 'raw_talent', 'high_motor'],
      avoidedTraits: ['injury_prone'],
      stylePreferences: { playStyle: ['explosive', 'physical'], positionNeeds: ['SF', 'PF', 'C'] }
    },
    recruitmentFactors: { aggressiveness: 0.8, potentialWeight: 0.85, competitionLevel: 0.6 }
  },

  // PREMIER PROFESSIONAL TIER
  premier_main: {
    league: 'premier_main',
    minimumRequirements: { overallRating: 85, keyStats: { iq: 85, consistency: 80 } },
    priorities: {
      statPriorities: { three: 0.9, mid: 0.85, finishing: 0.9, handle: 0.9, pass: 0.85, iq: 0.95, consistency: 0.9, clutch: 0.9, speed: 0.85, accel: 0.85, onBallDef: 0.85, lateral: 0.85, steal: 0.8, rimProt: 0.85, rebound: 0.85, post: 0.8, roll: 0.85, screen: 0.8, strength: 0.85, vertical: 0.85, stamina: 0.9, discipline: 0.9, ft: 0.9, durability: 0.85, height: 0.7, wingspan: 0.7 },
      preferredTraits: ['elite', 'clutch_performer', 'leader'],
      avoidedTraits: ['attitude_problem', 'injury_prone'],
      stylePreferences: { playStyle: ['versatile', 'explosive', 'finesse'], positionNeeds: ['PG', 'SG', 'SF', 'PF', 'C'] }
    },
    recruitmentFactors: { aggressiveness: 1.0, potentialWeight: 0.5, competitionLevel: 1.0 }
  },

  premier_womens: {
    league: 'premier_womens',
    minimumRequirements: { overallRating: 80, keyStats: { iq: 80, three: 75 } },
    priorities: {
      statPriorities: { three: 0.9, mid: 0.85, finishing: 0.85, handle: 0.9, pass: 0.9, iq: 0.95, consistency: 0.9, clutch: 0.85, speed: 0.8, accel: 0.8, onBallDef: 0.85, lateral: 0.85, steal: 0.85, rimProt: 0.8, rebound: 0.85, post: 0.8, roll: 0.8, screen: 0.8, strength: 0.75, vertical: 0.8, stamina: 0.85, discipline: 0.9, ft: 0.9, durability: 0.85, height: 0.6, wingspan: 0.6 },
      preferredTraits: ['skilled', 'leader', 'fundamentally_sound'],
      avoidedTraits: ['attitude_problem'],
      stylePreferences: { playStyle: ['finesse', 'fundamental'], positionNeeds: ['PG', 'SG', 'SF', 'PF', 'C'] }
    },
    recruitmentFactors: { aggressiveness: 0.9, potentialWeight: 0.6, competitionLevel: 0.9 }
  },

  // ELITE INTERNATIONAL TIER
  international_world: {
    league: 'international_world',
    minimumRequirements: { overallRating: 90, keyStats: { iq: 90, consistency: 85 } },
    priorities: {
      statPriorities: { three: 0.95, mid: 0.9, finishing: 0.9, handle: 0.9, pass: 0.9, iq: 1.0, consistency: 0.95, clutch: 0.95, speed: 0.85, accel: 0.85, onBallDef: 0.9, lateral: 0.9, steal: 0.85, rimProt: 0.9, rebound: 0.9, post: 0.85, roll: 0.85, screen: 0.85, strength: 0.85, vertical: 0.85, stamina: 0.9, discipline: 0.95, ft: 0.95, durability: 0.9, height: 0.8, wingspan: 0.8 },
      preferredTraits: ['elite', 'patriotic', 'clutch_performer'],
      avoidedTraits: ['attitude_problem', 'injury_prone'],
      stylePreferences: { playStyle: ['versatile', 'finesse'], positionNeeds: ['PG', 'SG', 'SF', 'PF', 'C'] }
    },
    recruitmentFactors: { aggressiveness: 1.0, potentialWeight: 0.3, competitionLevel: 1.0 }
  },

  international_continental: {
    league: 'international_continental',
    minimumRequirements: { overallRating: 85, keyStats: { iq: 85 } },
    priorities: {
      statPriorities: { three: 0.9, mid: 0.85, finishing: 0.85, handle: 0.85, pass: 0.85, iq: 0.95, consistency: 0.9, clutch: 0.9, speed: 0.8, accel: 0.8, onBallDef: 0.85, lateral: 0.85, steal: 0.8, rimProt: 0.85, rebound: 0.85, post: 0.8, roll: 0.8, screen: 0.8, strength: 0.8, vertical: 0.8, stamina: 0.85, discipline: 0.9, ft: 0.9, durability: 0.85, height: 0.7, wingspan: 0.7 },
      preferredTraits: ['elite', 'patriotic', 'team_first'],
      avoidedTraits: ['attitude_problem'],
      stylePreferences: { playStyle: ['versatile', 'fundamental'], positionNeeds: ['PG', 'SG', 'SF', 'PF', 'C'] }
    },
    recruitmentFactors: { aggressiveness: 0.9, potentialWeight: 0.4, competitionLevel: 0.95 }
  },

  international_olympics: {
    league: 'international_olympics',
    minimumRequirements: { overallRating: 95, keyStats: { iq: 95, consistency: 90 } },
    priorities: {
      statPriorities: { three: 1.0, mid: 0.95, finishing: 0.95, handle: 0.95, pass: 0.95, iq: 1.0, consistency: 1.0, clutch: 1.0, speed: 0.9, accel: 0.9, onBallDef: 0.95, lateral: 0.95, steal: 0.9, rimProt: 0.95, rebound: 0.95, post: 0.9, roll: 0.9, screen: 0.9, strength: 0.9, vertical: 0.9, stamina: 0.95, discipline: 1.0, ft: 1.0, durability: 0.95, height: 0.8, wingspan: 0.8 },
      preferredTraits: ['elite', 'patriotic', 'clutch_performer', 'leader'],
      avoidedTraits: ['attitude_problem', 'injury_prone'],
      stylePreferences: { playStyle: ['versatile'], positionNeeds: ['PG', 'SG', 'SF', 'PF', 'C'] }
    },
    recruitmentFactors: { aggressiveness: 1.0, potentialWeight: 0.2, competitionLevel: 1.0 }
  }
};

/**
 * LEAGUE TIER DEFINITIONS
 * Groups leagues by development focus and strategic purpose
 */
export const LEAGUE_TIERS: Record<string, LeagueTier> = {
  high_school: {
    id: 'high_school',
    name: 'High School Basketball',
    leagues: ['prep_elite', 'prep_traditional', 'prep_military'],
    characteristics: {
      purpose: 'development',
      ageRange: { min: 14, max: 18 },
      competitionLevel: 4,
      developmentFocus: ['fundamentals', 'character_building', 'academic_balance'],
      careerPathways: ['college_recruitment', 'skill_development', 'leadership']
    },
    recruitmentPatterns: {
      multipleOfferRate: 0.3,
      competitiveness: 'medium',
      keyDecisionFactors: ['academics', 'playing_time', 'development', 'location']
    }
  },

  amateur: {
    id: 'amateur',
    name: 'Elite Amateur Circuit',
    leagues: ['amateur_showcase', 'amateur_grassroots', 'amateur_travel'],
    characteristics: {
      purpose: 'exposure',
      ageRange: { min: 16, max: 18 },
      competitionLevel: 6,
      developmentFocus: ['recruitment_exposure', 'skill_specialization', 'competition_experience'],
      careerPathways: ['college_recruitment', 'professional_preparation', 'skill_showcase']
    },
    recruitmentPatterns: {
      multipleOfferRate: 0.7,
      competitiveness: 'high',
      keyDecisionFactors: ['exposure', 'competition_level', 'individual_development', 'style_fit']
    }
  },

  college: {
    id: 'college',
    name: 'College Basketball',
    leagues: ['university_power', 'university_mid', 'university_small', 'university_juco'],
    characteristics: {
      purpose: 'competition',
      ageRange: { min: 18, max: 22 },
      competitionLevel: 7,
      developmentFocus: ['professional_preparation', 'academic_achievement', 'system_learning'],
      careerPathways: ['professional_basketball', 'coaching', 'front_office', 'education']
    },
    recruitmentPatterns: {
      multipleOfferRate: 0.5,
      competitiveness: 'extreme',
      keyDecisionFactors: ['playing_time', 'system_fit', 'coaching_staff', 'academics', 'location']
    }
  }
};

/**
 * League Configuration Utilities
 */
export const LeagueConfigUtils = {
  /**
   * Get all leagues in a specific tier
   */
  getLeaguesByTier(tierId: string): LeagueConfig[] {
    const tier = LEAGUE_TIERS[tierId];
    if (!tier) return [];

    const allLeagues = { ...HIGH_SCHOOL_LEAGUES, ...AMATEUR_LEAGUES, ...COLLEGE_LEAGUES };
    return tier.leagues.map(leagueId => allLeagues[leagueId]).filter(Boolean);
  },

  /**
   * Get recruitment criteria for a league
   */
  getRecruitmentCriteria(league: League): LeagueRecruitmentCriteria | null {
    return LEAGUE_RECRUITMENT_CRITERIA[league] || null;
  },

  /**
   * Calculate player fit score for a specific league
   */
  calculatePlayerFit(playerId: string, league: League, playerRatings: any): number {
    // TODO: Use playerId for geographic bonuses, player-specific adjustments, or caching
    void playerId;
    const criteria = LEAGUE_RECRUITMENT_CRITERIA[league];
    if (!criteria) return 0;

    let fitScore = 0;
    let totalWeight = 0;

    // Calculate stat fit
    Object.entries(criteria.priorities.statPriorities).forEach(([stat, weight]) => {
      const playerRating = playerRatings[stat] || 50;
      const normalizedRating = playerRating / 100; // Convert to 0-1 scale
      fitScore += normalizedRating * weight;
      totalWeight += weight;
    });

    return totalWeight > 0 ? (fitScore / totalWeight) * 100 : 0;
  },

  /**
   * Get league comparison for decision making
   */
  compareLeagues(leagues: League[]): Array<{
    league: League;
    pros: string[];
    cons: string[];
    bestFor: string[];
  }> {
    const allLeagues = { ...HIGH_SCHOOL_LEAGUES, ...AMATEUR_LEAGUES, ...COLLEGE_LEAGUES };

    return leagues
      .map(leagueId => {
        const config = allLeagues[leagueId];
        if (!config) return null;

        // Generate pros/cons based on league characteristics
        const pros: string[] = [];
        const cons: string[] = [];
        const bestFor: string[] = [];

        // Analyze development multipliers
        if (config.developmentMultipliers.skillGrowth > 1.3) {
          pros.push('Excellent skill development');
          bestFor.push('Players seeking rapid improvement');
        }
        if (config.developmentMultipliers.experience > 1.3) {
          pros.push('High-value competitive experience');
          bestFor.push('Players preparing for next level');
        }

        // Analyze competition level
        if (config.averageTalent > 70) {
          pros.push('Elite competition level');
          cons.push('Limited playing time for some players');
          bestFor.push('Elite players seeking top competition');
        } else if (config.averageTalent < 55) {
          pros.push('More opportunities for playing time');
          cons.push('Lower competition level');
          bestFor.push('Developing players seeking experience');
        }

        // Analyze talent spread
        if (config.talentSpread > 20) {
          pros.push('Diverse talent levels accommodate various players');
          cons.push('Inconsistent competition quality');
        } else {
          pros.push('Consistent competition level');
          cons.push('May not suit all talent levels');
        }

        return {
          league: leagueId,
          pros,
          cons,
          bestFor
        };
      })
      .filter((item): item is { league: League; pros: string[]; cons: string[]; bestFor: string[]; } => item !== null);
  },

  /**
   * Validate league configuration
   */
  validateLeagueConfig(config: LeagueConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (config.tier < 1 || config.tier > 10) {
      errors.push(`Invalid tier: ${config.tier}`);
    }
    if (config.averageTalent < 25 || config.averageTalent > 99) {
      errors.push(`Invalid averageTalent: ${config.averageTalent}`);
    }
    if (config.developmentMultipliers.skillGrowth < 0.5 || config.developmentMultipliers.skillGrowth > 2.0) {
      errors.push(`Invalid skillGrowth multiplier: ${config.developmentMultipliers.skillGrowth}`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
};
