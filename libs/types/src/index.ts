export type Id = string;

// Player types
export type PlayerArchetype = 'generational' | 'top_100' | 'unranked';
export type PlayerPosition = 'PG' | 'SG' | 'SF' | 'PF' | 'C' | 'G' | 'F';

// RTTB System - Enhanced type definitions
export type Ratings = {
  // Offense
  three: number; // 25-99, 3-point shooting ability
  mid: number; // Mid-range shooting
  finishing: number; // At-rim finishing
  ft: number; // Free throw shooting
  pass: number; // Passing accuracy and vision
  handle: number; // Ball handling and dribbling
  post: number; // Post moves and positioning
  roll: number; // Pick and roll execution
  screen: number; // Screen setting quality
  // Defense
  onBallDef: number; // On-ball defensive pressure
  lateral: number; // Lateral quickness
  rimProt: number; // Rim protection and shot blocking
  steal: number; // Steal ability and anticipation
  // Physical
  speed: number; // Straight-line speed
  accel: number; // Acceleration
  strength: number; // Physical strength
  vertical: number; // Vertical leap
  rebound: number; // Rebounding positioning and timing
  height: number; // Height in centimeters
  wingspan: number; // Wingspan in centimeters
  // Mental
  iq: number; // Basketball IQ and decision making
  discipline: number; // Foul avoidance and composure
  consistency: number; // Performance variance control
  clutch: number; // Late-game performance boost
  // Meta
  stamina: number; // Endurance and fatigue resistance
  durability: number; // Injury resistance
};

// Enhanced Tendencies with Dirichlet/Beta distributions
export type Tendencies = {
  // Categorical (Dirichlet) — stored as counts, converted to probabilities
  withBall: number[]; // [drive, pullup, catchShoot, pnrAttack, pnrPass, post, reset]
  offBall: number[]; // [spot, relocate, cut, screen, handoffRecv]
  shotZone: number[]; // [rim, mid, three]
  threeStyle: number[]; // [catchShoot, offDribble]
  // Binary (Beta/Bernoulli as 0-100 sliders)
  passRisk: number; // aggressive vs safe passing
  help: number; // help defense vs stay home
  gambleSteal: number; // gamble for steals vs contain
  crashOreb: number; // crash offensive boards vs get back
};

// Internal representation for runtime calculations
export type TendencyDistributions = {
  withBall: { alphas: number[]; mean: number[] };
  offBall: { alphas: number[]; mean: number[] };
  shotZone: { alphas: number[]; mean: number[] };
  threeStyle: { alphas: number[]; mean: number[] };
  passRisk: { a: number; b: number; mean: number };
  help: { a: number; b: number; mean: number };
  gambleSteal: { a: number; b: number; mean: number };
  crashOreb: { a: number; b: number; mean: number };
};

// RTTB Trait System
export type TraitKind = 'archetype' | 'background' | 'quirk';

export type Effect =
  | { type: 'ratings'; path: keyof Ratings; add?: number; mul?: number; capMin?: number; capMax?: number }
  | { type: 'tendency'; group: keyof Tendencies; index?: number; add?: number }
  | { type: 'policy'; key: string; add: number } // small logit bias keys
  | { type: 'growth'; target: keyof Ratings; slope: number; ceiling?: number }
  | { type: 'relationship'; key: 'coachTrust' | 'morale' | 'rep'; add: number };

export type Trait = {
  id: string;
  kind: TraitKind;
  name: string;
  description: string;
  // Declarative effects (additive to ratings/tendencies, or caps/slopes)
  effects: Effect[];
  // Narrative tags that can be queried by story systems
  tags?: string[]; // e.g., ['work-ethic', 'hometown', 'clutch']
};

// RTTB Badge System
export type Predicate = {
  model?: 'shot' | 'pass' | 'drive' | 'rebound' | 'foul';
  zone?: 'rim' | 'mid' | 'three';
  catch?: boolean;
  distFtGte?: number;
  distFtLte?: number;
  angle?: 'good' | 'poor';
  contact?: boolean;
  position?: 'inside' | 'outside';
  laneAngle?: 'narrow' | 'wide';
  [key: string]: string | number | boolean | undefined; // Allow additional predicates
};

export type Mod =
  | { model: 'shot'; addQ?: number; addContest?: number; addScore?: number; multP?: number }
  | { model: 'pass'; addLaneRisk?: number; addScore?: number }
  | { model: 'drive'; addScore?: number }
  | { model: 'rebound'; addWeight?: number }
  | { model: 'foul'; addScore?: number }
  | { model: 'policy'; addLogit?: number };

export type ProgressRule = {
  stat: string; // e.g., 'made_catch3', 'drives_successful'
  count: number;
  tier: 1 | 2 | 3;
};

export type Badge = {
  id: string;
  name: string;
  description: string;
  tier: 1 | 2 | 3;
  hidden?: boolean;
  // Activation predicate against play context
  when: Predicate;
  // Numeric modifiers applied while active
  mods: Mod[];
  // Progress rules for unlocking & tiering
  progress?: ProgressRule[];
  // Runtime behavior
  runtime?: {
    cooldownSec?: number;
    stacks?: number;
    decay?: number;
  };
};

// Badge progress tracking
export type BadgeProgress = {
  badgeId: string;
  currentTier: 0 | 1 | 2 | 3; // 0 = not unlocked
  stats: Record<string, number>; // stat name -> count
  lastActiveTs?: number; // for cooldown tracking
};

// Badge system cache types
export interface BadgeModifiers {
  [key: string]: number;
}

export interface BadgeContext {
  situation: string;
  playerType: string;
  [key: string]: string | number | boolean;
}

// Enhanced Player with full RTTB system
export type Player = {
  id: Id;
  name: string;
  ratings: Ratings;
  tendencies: Tendencies;
  traits: Trait[];
  badges: BadgeProgress[];
  // Runtime distributions (calculated from tendencies)
  tendencyDistributions: TendencyDistributions;
  // Career progression
  skillPoints: number;
  experience: number;
  age: number;
  // Relationships and morale
  relationships: {
    coachTrust: number;
    morale: number;
    rep: number;
  };
};

export type Team = { id: Id; name: string; players: Player[] };

export type Clock = { quarter: 1 | 2 | 3 | 4; sec: number };
export type PossessionState = {
  gameId: Id;
  poss: number;
  offense: Id;
  defense: Id;
  ball: Id;
  clock: Clock;
  shotClock: number;
  fatigue: Record<Id, number>;
  score: { off: number; def: number };
  fouls?: {
    playerFouls: Record<Id, number>;
    teamFouls: { home: number; away: number };
    quarterFouls: { home: number; away: number };
  };
  seed: number; // frame-level seed base
};

export type ExplainTerm = { label: string; value: number };
export type Explain = { terms: ExplainTerm[]; score: number; p: number; notes?: string[] };

export type OutcomeShot = { kind: 'shot'; make: boolean; fouled: boolean; three: boolean; explain: Explain };
export type OutcomePass = { kind: 'pass'; complete: boolean; turnover: boolean; explain: Explain };
export type OutcomeDrive = { kind: 'drive'; blowby: boolean; foul: boolean; explain: Explain };
export type OutcomeReb = { kind: 'rebound'; offenseWon: boolean; winner: Id; explain: Explain };
export type OutcomeFoul = { kind: 'foul'; on: Id; shooting: boolean };

export type PlayOutcome = OutcomeShot | OutcomePass | OutcomeDrive | OutcomeReb | OutcomeFoul;

export const Action = {
  Drive: 'drive',
  Pullup: 'pullup',
  CatchShoot: 'catchShoot',
  PnrAttack: 'pnrAttack',
  PnrPass: 'pnrPass',
  Post: 'post',
  Reset: 'reset'
};
export type Action = (typeof Action)[keyof typeof Action];

// Court positioning system
export type Position = {
  x: number; // 0-94 feet (court length)
  y: number; // 0-50 feet (court width)
};

export type Zone = {
  name: string;
  bounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
};

export type Formation = {
  players: Record<Id, Position>;
  ballPosition: Position;
  timestamp: number; // For tracking movement
};

export type DefensiveScheme =
  | 'man' // Man-to-man defense
  | 'zone2-3' // 2-3 zone defense
  | 'zone3-2' // 3-2 zone defense
  | 'zone1-3-1' // 1-3-1 zone defense
  | 'fullCourt' // Full court press
  | 'switch'; // Switching defense

export type Assignment = {
  defender: Id;
  target: Id | Zone; // Player ID or zone to defend
  type: 'man' | 'zone' | 'help';
  priority: number; // 1-10, higher = more important
};

export type DefensiveAssignments = {
  scheme: DefensiveScheme;
  assignments: Assignment[];
  helpRotations: Record<Id, Id>; // Who rotates to help whom
};

// Enhanced possession state with positioning
export type PositionalPossessionState = PossessionState & {
  formation: Formation;
  defensiveAssignments: DefensiveAssignments;
  spacing: {
    openLanes: number; // 0-1, how open driving lanes are
    ballMovement: number; // 0-1, how much ball has moved
    shotQuality: number; // 0-1, current shot opportunity quality
  };
};

// Game situation context for EPV calculation
export type GameSituation = {
  shotClock: number;
  gameTime: number; // Seconds remaining in game
  scoreDiff: number; // Positive = leading, negative = trailing
  quarter: number;
  fouls: {
    team: number; // Team fouls this quarter
    player: Record<Id, number>; // Individual player fouls
    inBonus: boolean; // Team in bonus/penalty situation
  };
  momentum: number; // -1 to 1, team momentum
};

// Multi-player rebounding system
export type ReboundTrajectory = 'short' | 'long' | 'soft' | 'hard';

export type ReboundParticipant = {
  id: Id;
  position: Position;
  boxOut: Id | null; // Who they're boxing out
  distanceToRebound: number;
  reboundWeight: number;
};

// ============================================================================
// CAREER PHASE SYSTEM
// ============================================================================

/**
 * Career phases representing different stages of a basketball player's development.
 * Each phase has distinct characteristics affecting stat growth and gameplay.
 * Includes full pipeline from high school through professional career.
 *
 * @see CareerPhaseManager for phase transition logic
 * @see calculateAgeEffects for phase-specific stat modifiers
 */
export type CareerPhase =
  | 'highschool' // 14-18: Foundation building, high variability, potential identification
  | 'college' // 18-22: Structured development, competition level increase
  | 'development' // 18-22: Pro rookie years, learning fundamentals, inconsistent
  | 'emergence' // 22-25: Breaking out, establishing role, rapid skill gains
  | 'prime' // 26-30: Peak performance, maximum ratings, consistency
  | 'veteran' // 31-34: Experience compensates for declining athleticism
  | 'decline' // 35-37: Significant physical decline, high basketball IQ
  | 'legacy'; // 38+: Rare players who adapt game for longevity

/**
 * Comprehensive career progression tracking for realistic player development.
 * Integrates user choices with biological and performance factors.
 */
export type CareerProgression = {
  /** Current career phase */
  phase: CareerPhase;

  /** Years spent in current phase (0-based) */
  phaseYear: number;

  /** Total professional years played */
  totalYears: number;

  /** Age when player reached statistical peak (determined dynamically) */
  peakAge?: number;

  /** Whether physical decline has begun (irreversible) */
  declineStarted: boolean;

  /** Factors affecting career longevity and phase transitions */
  longevityFactors: LongevityFactors;

  /** Player/user development choices affecting progression */
  userChoices: UserDevelopmentChoices;

  /** Career milestone tracking for narrative events */
  milestones: CareerMilestone[];
};

/**
 * Factors determining how long a player can maintain effectiveness.
 * Combines genetic, behavioral, and circumstantial elements.
 */
export type LongevityFactors = {
  /** Genetic predisposition for longevity (0-100, rare >90) */
  genetics: number;

  /** Work ethic and dedication to improvement (0-100) */
  workEthic: number;

  /** Accumulated injury damage over career (0-100, higher = more damage) */
  injuryHistory: number;

  /** Playing style affecting aging curve */
  playStyle: PlayStyle;

  /** Ability to adapt role as skills decline (0-100) */
  roleAdaptation: number;

  /** Current physical condition relative to age (0-100) */
  conditioning: number;
};

/**
 * Playing styles that age differently based on physical vs skill emphasis.
 */
export type PlayStyle =
  | 'explosive' // Heavy athleticism reliance, earlier decline
  | 'finesse' // Skill-based with some athleticism, moderate aging
  | 'fundamental' // Pure skill and IQ, ages gracefully
  | 'physical' // Strength-based, steady decline
  | 'versatile'; // Balanced, adapts well to aging

/**
 * Player development choices that affect career trajectory.
 * Provides user agency in Create-a-Player and Coach modes.
 */
export type UserDevelopmentChoices = {
  /** Selected training focuses for skill development */
  trainingFocus: TrainingFocus[];

  /** Lifestyle choices affecting longevity factors */
  lifestyleChoices: LifestyleChoice[];

  /** Willingness to accept reduced role for team success */
  roleWillingness: RoleWillingness;

  /** Offseason development programs participated in */
  offseasonPrograms: OffseasonProgram[];

  /** Injury management and recovery choices */
  injuryManagement: InjuryManagementChoice[];
};

/**
 * Training focus areas with specific skill development effects.
 * Cost-benefit system requires strategic resource allocation.
 */
export type TrainingFocus = {
  /** Unique identifier for training type */
  id: string;

  /** Display name for user interface */
  name: string;

  /** Detailed description of training benefits */
  description: string;

  /** Stat effects applied when training is active */
  effects: Effect[];

  /** Cost in skill points or development resources */
  cost: number;

  /** Minimum duration for effectiveness (seasons) */
  minDuration: number;

  /** Maximum effectiveness duration before diminishing returns */
  maxDuration: number;

  /** Function determining if training is available to player */
  availability: (player: Player) => boolean;

  /** Prerequisites that must be met */
  prerequisites?: TrainingPrerequisite[];
};

/**
 * Prerequisites for advanced training programs.
 */
export type TrainingPrerequisite = {
  type: 'stat' | 'age' | 'phase' | 'trait' | 'achievement';
  requirement: string | number;
  description: string;
};

/**
 * Lifestyle choices affecting long-term career development.
 * Permanent decisions with lasting consequences.
 */
export type LifestyleChoice = {
  /** Unique identifier */
  id: string;

  /** Display name */
  name: string;

  /** Modifications to longevity factors */
  effects: Partial<LongevityFactors>;

  /** User-facing description of choice consequences */
  description: string;

  /** Additional narrative tags for story integration */
  narrativeTags?: string[];

  /** Career phase when choice becomes available */
  availablePhase?: CareerPhase;

  /** Whether choice can be reversed later */
  reversible: boolean;
};

/**
 * Player attitude toward role changes as career evolves.
 */
export type RoleWillingness = {
  /** Acceptance of reduced minutes (0-100) */
  benchRole: number;

  /** Willingness to change positions (0-100) */
  positionFlex: number;

  /** Acceptance of leadership responsibilities (0-100) */
  mentorship: number;

  /** Willingness to take team-friendly contracts (0-100) */
  teamFirst: number;
};

/**
 * Structured offseason development programs.
 */
export type OffseasonProgram = {
  id: string;
  name: string;
  description: string;
  duration: number; // weeks
  effects: Effect[];
  cost: number;
  requirements: (player: Player) => boolean;
};

/**
 * Injury management choices affecting recovery and prevention.
 */
export type InjuryManagementChoice = {
  id: string;
  name: string;
  description: string;
  preventionBonus: number; // Injury resistance bonus
  recoveryBonus: number; // Faster recovery from injuries
  longevityImpact: Partial<LongevityFactors>;
  cost: number;
};

/**
 * Career milestones for tracking player achievements.
 * Used for narrative events and development triggers.
 */
export type CareerMilestone = {
  id: string;
  type: MilestoneType;
  description: string;
  achievedAt: {
    age: number;
    season: number;
    phase: CareerPhase;
  };
  impact: {
    reputation?: number;
    confidence?: number;
    marketValue?: number;
    narrativeFlags?: string[];
  };
};

/**
 * Types of career milestones that can trigger events.
 */
export type MilestoneType =
  | 'statistical' // Stat thresholds (1000 points, etc.)
  | 'achievement' // Awards, records, team success
  | 'developmental' // Phase transitions, skill breakthroughs
  | 'social' // Relationships, reputation changes
  | 'adversity' // Injuries, slumps, challenges
  | 'legacy'; // Hall of fame, retirement, etc.

/**
 * Configuration for career phase boundaries and transitions.
 * Allows tuning of aging curves for different archetypes.
 */
export type CareerPhaseConfig = {
  /** Base age boundaries for each phase */
  baseBoundaries: Record<CareerPhase, number>;

  /** Maximum modifier from longevity factors */
  maxModifier: number;

  /** Weights for different longevity factors */
  longevityWeights: {
    genetics: number;
    workEthic: number;
    playStyle: Record<PlayStyle, number>;
    conditioning: number;
  };

  /** Probability of reaching legacy phase by archetype */
  legacyProbability: Record<PlayerArchetype, number>;
};

// ============================================================================
// LEAGUE SYSTEM & STAT NORMALIZATION
// ============================================================================

/**
 * Basketball competition leagues with different talent levels and styles.
 * Uses fictional league names to avoid licensing while maintaining clear hierarchy.
 * Multiple leagues per tier offer strategic choices for player development.
 */
export type League =
  // HIGH SCHOOL TIER (Ages 14-18)
  | 'prep_elite' // Elite Prep Academy - Top facilities, national exposure
  | 'prep_traditional' // Traditional High School - Local community, balanced academics
  | 'prep_military' // Military Prep Academy - Discipline, structure, character building

  // AMATEUR/AAU TIER (Ages 16-18)
  | 'amateur_showcase' // National Showcase Circuit - Elite exposure, individual focus
  | 'amateur_grassroots' // Grassroots Basketball League - Community-based, fundamentals
  | 'amateur_travel' // Elite Travel Circuit - Extensive travel, competition variety

  // COLLEGE TIER (Ages 18-22)
  | 'university_power' // Power Conference - Top competition, media exposure, pressure
  | 'university_mid' // Mid-Major Conference - Good competition, development focus
  | 'university_small' // Small College - Personal attention, academics priority
  | 'university_juco' // Junior College - Second chances, quick development path

  // PROFESSIONAL DEVELOPMENT TIER (Ages 18-25)
  | 'development_main' // Main Development League - Premier pro pathway
  | 'development_elite' // Elite Development Circuit - International style, skill focus
  | 'development_local' // Regional Development League - Local fan base, stability

  // INTERNATIONAL PROFESSIONAL TIER (Ages 20-35)
  | 'overseas_euro_top' // Top European League - Elite competition, tactical play
  | 'overseas_euro_mid' // Mid European League - Good competition, development
  | 'overseas_asia_elite' // Elite Asian League - Growing markets, mixed styles
  | 'overseas_asia_dev' // Developing Asian League - Emerging markets, opportunity
  | 'overseas_americas' // Americas Professional League - Latin/South America
  | 'overseas_africa' // African Professional League - Growing basketball market

  // PREMIER PROFESSIONAL TIER (Ages 19-40)
  | 'premier_main' // Premier Basketball Association - Top league globally
  | 'premier_womens' // Premier Women's League - Top women's professional league

  // ELITE INTERNATIONAL TIER (Ages 22-38)
  | 'international_world' // World Basketball Championship - National teams
  | 'international_continental' // Continental Championships - Regional elite competition
  | 'international_olympics'; // Olympic Basketball - Highest honor in basketball

/**
 * League characteristics affecting gameplay simulation and stat normalization.
 * Used to ensure players perform realistically across different competition levels.
 */
export type LeagueConfig = {
  /** Unique league identifier */
  id: League;

  /** Display name for UI */
  name: string;

  /** Short description of league level */
  description: string;

  /** Competition tier (1 = highest, 10 = lowest) */
  tier: number;

  /** Average talent level of players (25-99 scale) */
  averageTalent: number;

  /** Talent distribution spread (higher = more variation) */
  talentSpread: number;

  /** Game style modifiers affecting stat production */
  gameStyle: {
    pace: number; // Possessions per game multiplier (0.8-1.3)
    threePointEmphasis: number; // Three-point attempt rate modifier (0.7-1.4)
    physicalPlay: number; // Contact and fouling rate modifier (0.8-1.2)
    ballMovement: number; // Assist rate and ball movement modifier (0.9-1.2)
    defense: number; // Overall defensive intensity modifier (0.8-1.3)
  };

  /** Stat normalization factors for realistic output */
  statNormalization: {
    scoring: number; // Points per game adjustment (0.7-1.2)
    rebounding: number; // Rebounding rate adjustment (0.8-1.1)
    assists: number; // Assist rate adjustment (0.8-1.2)
    steals: number; // Steal rate adjustment (0.9-1.3)
    blocks: number; // Block rate adjustment (0.8-1.2)
    turnovers: number; // Turnover rate adjustment (0.9-1.2)
    shooting: {
      fg: number; // Field goal percentage adjustment (0.95-1.05)
      three: number; // Three-point percentage adjustment (0.9-1.1)
      ft: number; // Free throw percentage adjustment (0.98-1.02)
    };
  };

  /** Development factors for player growth in this league */
  developmentMultipliers: {
    skillGrowth: number; // How much players improve (0.5-1.5)
    experience: number; // Experience points multiplier (0.8-1.3)
    badgeProgress: number; // Badge progression rate (0.7-1.2)
  };

  /** Age demographics typical for this league */
  typicalAgeRange: {
    min: number;
    max: number;
    average: number;
  };
};

/**
 * Player performance context for league-specific adjustments.
 * Tracks how player attributes translate to actual performance.
 */
export type PerformanceContext = {
  /** League player is competing in */
  league: League;

  /** Player's percentile rank in this league (0-100) */
  leaguePercentile: number;

  /** Competition level adjustment (-1 to 1) */
  competitionAdjustment: number;

  /** Role adjustment based on team needs */
  roleAdjustment: number;

  /** Minutes and usage adjustments */
  usageContext: {
    minutesPerGame: number;
    usageRate: number; // Percentage of team possessions used
    shotAttempts: number; // Expected shots per game
    touches: number; // Ball touches per game
  };

  /** League adaptation factors */
  adaptationFactors: {
    gamesFamiliarity: number; // How familiar with league style (0-1)
    styleMatch: number; // How well player style fits league (0-1)
    confidenceLevel: number; // Player confidence in this league (0-1)
  };
};

/**
 * Expected vs actual performance tracking for validation.
 * Used to ensure simulation produces realistic statistical outcomes across 1000+ games.
 */
export type PerformanceExpectation = {
  /** Player and league context */
  playerId: Id;
  league: League;
  season: number;

  /** Expected statistical output based on ratings */
  expected: {
    pointsPerGame: number;
    reboundsPerGame: number;
    assistsPerGame: number;
    stealsPerGame: number;
    blocksPerGame: number;
    turnoversPerGame: number;
    fieldGoalPercentage: number;
    threePointPercentage: number;
    freeThrowPercentage: number;
    usage: number;
    efficiency: number;
    plusMinus: number;
  };

  /** Actual statistical output from simulation */
  actual?: {
    pointsPerGame: number;
    reboundsPerGame: number;
    assistsPerGame: number;
    stealsPerGame: number;
    blocksPerGame: number;
    turnoversPerGame: number;
    fieldGoalPercentage: number;
    threePointPercentage: number;
    freeThrowPercentage: number;
    usage: number;
    efficiency: number;
    plusMinus: number;
  };

  /** Games simulated for this expectation */
  gamesPlayed: number;

  /** Acceptable variance ranges for validation */
  acceptableRanges: {
    pointsRange: [number, number];
    efficiencyRange: [number, number];
    usageRange: [number, number];
  };

  /** Variance metrics for validation */
  variance: {
    pointsVariance: number;
    efficiencyVariance: number;
    overallVariance: number;
    withinAcceptableRange: boolean;
  };
};

/**
 * League transition effects when players change competition levels.
 * Critical for realistic Create-a-Player career progression.
 */
export type LeagueTransition = {
  /** Transition identifier */
  id: string;

  /** Source and destination leagues */
  from: League;
  to: League;

  /** Player making transition */
  playerId: Id;

  /** Transition season/year */
  season: number;

  /** Difficulty change assessment */
  difficultyChange: {
    overall: number; // Overall difficulty change (-2 to 2)
    pace: number; // Pace adjustment difficulty
    talent: number; // Talent level adjustment
    style: number; // Style adaptation difficulty
  };

  /** Adjustment period in games */
  adjustmentPeriod: number;

  /** Performance modifiers during adjustment */
  adjustmentEffects: {
    confidence: number; // Confidence impact (-0.3 to 0.3)
    consistency: number; // Performance consistency impact (-0.2 to 0.2)
    efficiency: number; // Overall efficiency impact (-0.15 to 0.15)
    decayRate: number; // How quickly adjustment effects fade (0.05-0.15)
  };

  /** Success indicators for this transition type */
  transitionMetrics: {
    expectedSuccessRate: number; // Historical success rate for this transition
    keyAdaptationAreas: string[]; // Areas requiring most adaptation
    timeToAdaptation: number; // Expected games to full adaptation
  };
};

/**
 * Comprehensive stat validation for testing simulation accuracy.
 * Ensures realistic outcomes across thousands of simulated games.
 */
export type StatValidationResult = {
  /** Validation run identifier */
  runId: string;

  /** Validation configuration */
  config: {
    gamesSimulated: number;
    league: League;
    playersCount: number;
    seasonsSimulated: number;
    validationDate: string;
  };

  /** Overall accuracy metrics */
  overallAccuracy: {
    /** Percentage of players within expected stat ranges */
    withinExpectedRange: number;

    /** Average absolute deviation from expected stats */
    averageDeviation: number;

    /** Standard deviation of performance distribution */
    standardDeviation: number;

    /** R-squared correlation between expected and actual */
    correlation: number;

    /** Pass/fail status for validation */
    validationPassed: boolean;
  };

  /** Results by statistical category */
  categoryResults: Record<
    string,
    {
      expectedMean: number;
      actualMean: number;
      expectedStdDev: number;
      actualStdDev: number;
      deviation: number;
      deviationPercentage: number;
      withinRange: boolean;
      sampleSize: number;
    }
  >;

  /** Performance outliers requiring investigation */
  outliers: Array<{
    playerId: Id;
    playerName?: string;
    category: string;
    expected: number;
    actual: number;
    deviation: number;
    deviationSigmas: number; // How many standard deviations from expected
    possibleCauses: string[];
  }>;

  /** League-specific validation metrics */
  leagueMetrics: {
    averageGameScore: number;
    paceActual: number;
    paceExpected: number;
    shootingEfficiencyActual: number;
    shootingEfficiencyExpected: number;
    turnoverRateActual: number;
    turnoverRateExpected: number;
  };

  /** Recommendations for improvement */
  recommendations: Array<{
    category: string;
    issue: string;
    suggestion: string;
    priority: 'high' | 'medium' | 'low';
  }>;

  /** Validation timestamp and metadata */
  metadata: {
    timestamp: number;
    validationVersion: string;
    engineVersion: string;
    seedUsed: number;
  };
};

// ============================================================================
// LEAGUE RECRUITMENT & CHOICE SYSTEM
// ============================================================================

/**
 * League recruitment criteria and player fit assessment.
 * Determines which leagues will recruit a player and with what intensity.
 */
export type LeagueRecruitmentCriteria = {
  /** League doing the recruiting */
  league: League;

  /** Required minimum ratings for consideration */
  minimumRequirements: {
    overallRating: number;
    keyStats: Partial<Ratings>; // Specific ratings this league values
    academicRequirement?: number; // For college leagues
    characterRequirement?: number; // For some leagues
  };

  /** What the league prioritizes in recruits */
  priorities: {
    /** Stat categories with importance weights (0-1) */
    statPriorities: Record<keyof Ratings, number>;

    /** Player traits this league values */
    preferredTraits: string[];

    /** Player traits this league avoids */
    avoidedTraits: string[];

    /** Playing style preferences */
    stylePreferences: {
      playStyle: PlayStyle[];
      positionNeeds: string[]; // Positions they're actively recruiting
    };
  };

  /** Recruitment intensity factors */
  recruitmentFactors: {
    /** How aggressively this league recruits (0-1) */
    aggressiveness: number;

    /** How much they care about potential vs current ability */
    potentialWeight: number; // 0 = current ability only, 1 = potential only

    /** Geographic preferences */
    geographicPreference?: {
      preferredRegions: string[];
      localBonus: number; // Bonus for local players
    };

    /** Competition from other leagues at this level */
    competitionLevel: number;
  };
};

/**
 * Player's fit assessment with a specific league.
 * Used to determine recruitment interest and player success probability.
 */
export type PlayerLeagueFit = {
  /** League being evaluated */
  league: League;

  /** Player being evaluated */
  playerId: Id;

  /** Overall fit score (0-100) */
  overallFit: number;

  /** Breakdown of fit factors */
  fitFactors: {
    /** How well player's ratings match league needs (0-100) */
    statFit: number;

    /** How well player's style matches league style (0-100) */
    styleFit: number;

    /** How well player's traits align with league values (0-100) */
    culturalFit: number;

    /** Player's potential for growth in this league (0-100) */
    developmentFit: number;

    /** Geographic/logistical fit (0-100) */
    logisticalFit: number;
  };

  /** Predicted outcomes if player joins this league */
  projectedOutcomes: {
    /** Expected playing time percentage */
    expectedMinutes: number;

    /** Projected statistical performance */
    projectedStats: {
      pointsPerGame: number;
      efficiency: number;
      development: number; // Skill growth projection
    };

    /** Recruitment/selection probability (0-1) */
    selectionProbability: number;

    /** Expected career impact */
    careerImpact: {
      skillDevelopment: number; // How much skills will improve
      exposure: number; // Media/scout exposure level
      networkBuilding: number; // Professional connections
      academicImpact?: number; // For college leagues
    };
  };

  /** Risks and downsides of choosing this league */
  risks: {
    /** Probability of not meeting expectations (0-1) */
    disappointmentRisk: number;

    /** Specific risks for this league choice */
    specificRisks: Array<{
      risk: string;
      probability: number;
      impact: 'low' | 'medium' | 'high';
    }>;

    /** Opportunity cost compared to alternatives */
    opportunityCost: string[];
  };
};

/**
 * League choice decision framework for Create-a-Player mode.
 * Presents meaningful choices with clear trade-offs.
 */
export type LeagueChoice = {
  /** Available league options */
  availableLeagues: Array<{
    league: League;
    recruitmentStatus: 'recruited' | 'tryout_available' | 'walk_on' | 'unavailable';
    offer?: LeagueOffer;
  }>;

  /** Player making the choice */
  playerId: Id;

  /** Current player phase affecting available choices */
  currentPhase: CareerPhase;

  /** Decision deadline information */
  decisionInfo: {
    timeframe: string; // e.g., "End of senior season"
    consequences: string; // What happens if no choice is made
    canDelay: boolean; // Whether decision can be postponed
  };

  /** Narrative context for the choice */
  narrativeContext: {
    situation: string; // Current situation description
    pressures: string[]; // External pressures (family, coaches, etc.)
    considerations: string[]; // Key factors to consider
  };
};

/**
 * Formal offer from a league to a player.
 * Contains specific terms and commitments.
 */
export type LeagueOffer = {
  /** League making the offer */
  league: League;

  /** Player receiving offer */
  playerId: Id;

  /** Offer details */
  terms: {
    /** Guaranteed role/position */
    guaranteedRole?: string;

    /** Expected playing time */
    expectedMinutes: number;

    /** Development commitments */
    developmentCommitments: {
      personalCoaching: boolean;
      skillSpecialization: string[];
      mentorshipProgram: boolean;
    };

    /** Financial aspects (for professional leagues) */
    compensation?: {
      salary?: number;
      bonuses?: Record<string, number>;
      benefits?: string[];
    };

    /** Academic support (for college leagues) */
    academicSupport?: {
      tutoring: boolean;
      degreeProgram: string;
      academicStanding: string;
    };

    /** Lifestyle factors */
    lifestyle: {
      location: string;
      facilities: string[];
      travelCommitment: string;
      timeCommitment: string;
    };
  };

  /** Offer expiration and conditions */
  conditions: {
    expirationDate: string;
    conditions: string[]; // Conditions that must be met
    competingOffers: boolean; // Whether other offers are expected
  };

  /** Long-term implications */
  implications: {
    careerPathways: string[]; // What doors this opens
    restrictions: string[]; // What this might limit
    networkAccess: string[]; // Professional connections gained
  };
};

/**
 * League tier classification for strategic decision-making.
 * Groups leagues by competition level and development focus.
 */
export type LeagueTier = {
  /** Tier identifier */
  id: string;

  /** Display name */
  name: string;

  /** Leagues in this tier */
  leagues: League[];

  /** Tier characteristics */
  characteristics: {
    /** Primary purpose of this tier */
    purpose: 'development' | 'competition' | 'exposure' | 'professional' | 'elite';

    /** Typical age range */
    ageRange: { min: number; max: number };

    /** Competition level (1-10) */
    competitionLevel: number;

    /** Development focus areas */
    developmentFocus: string[];

    /** Career pathways this tier provides */
    careerPathways: string[];
  };

  /** Tier-specific recruitment patterns */
  recruitmentPatterns: {
    /** How many players typically get multiple offers */
    multipleOfferRate: number;

    /** How competitive the recruitment process is */
    competitiveness: 'low' | 'medium' | 'high' | 'extreme';

    /** Key decision factors for this tier */
    keyDecisionFactors: string[];
  };
};

/**
 * Player development path tracking through different leagues.
 * Shows the journey and choices made throughout a career.
 */
export type DevelopmentPath = {
  /** Player this path belongs to */
  playerId: Id;

  /** Chronological league progression */
  progression: Array<{
    /** League played in */
    league: League;

    /** Duration in league */
    duration: {
      startAge: number;
      endAge: number;
      seasons: number;
    };

    /** How player got to this league */
    entryMethod: 'recruited' | 'tryout' | 'walk_on' | 'transfer' | 'draft' | 'signed';

    /** Performance and development outcomes */
    outcomes: {
      /** Statistical performance */
      stats: {
        averageRating: number;
        keyStats: Record<string, number>;
        accolades: string[];
      };

      /** Skill development achieved */
      development: {
        skillGains: Partial<Ratings>;
        traitsAcquired: string[];
        badgesEarned: string[];
      };

      /** Career impact */
      impact: {
        exposure: number; // Media/scout attention gained
        networkBuilding: number; // Connections made
        reputation: number; // Reputation change
      };
    };

    /** Reason for leaving league */
    exitReason?: string;

    /** Next destination decision factors */
    nextChoiceFactors?: string[];
  }>;

  /** Alternative paths not taken */
  alternativePaths: Array<{
    /** League option that was available but not chosen */
    league: League;

    /** Why it wasn't chosen */
    reasonNotChosen: string;

    /** What might have happened (speculative) */
    projectedOutcome?: string;
  }>;

  /** Path analysis for narrative purposes */
  pathAnalysis: {
    /** Overall path strategy */
    strategy: 'traditional' | 'unconventional' | 'risk_taking' | 'safe' | 'opportunistic';

    /** Key turning points */
    turningPoints: Array<{
      decision: string;
      impact: string;
      alternativeConsidered: string;
    }>;

    /** Path effectiveness */
    effectiveness: {
      developmentScore: number; // How well path developed player
      opportunityScore: number; // How well path maximized opportunities
      satisfactionScore: number; // Player satisfaction with choices
    };
  };
};

export type ReboundContext = {
  shotLocation: Position;
  reboundLocation: Position; // Calculated based on trajectory
  trajectory: ReboundTrajectory;
  players: ReboundParticipant[];
  isOffensiveRebound: boolean;
};

export type ReboundResult = {
  winner: Id;
  isOffensive: boolean;
  contested: boolean;
  tipOut: boolean;
  explain: Explain;
};

// Player statistics tracking
export type PlayerStats = {
  playerId: Id;
  minutes: number;

  // Scoring
  points: number;
  fieldGoalsMade: number;
  fieldGoalsAttempted: number;
  threePointersMade: number;
  threePointersAttempted: number;
  freeThrowsMade: number;
  freeThrowsAttempted: number;

  // Rebounding
  offensiveRebounds: number;
  defensiveRebounds: number;
  totalRebounds: number;

  // Playmaking
  assists: number;
  turnovers: number;

  // Defense
  steals: number;
  blocks: number;
  foulsCommitted: number;

  // Advanced stats
  possessionsUsed: number;
  drives: number;
  drivesSuccessful: number;
  passesAttempted: number;
  passesCompleted: number;

  // Shot chart data
  shotsByZone: {
    rim: { made: number; attempted: number };
    close: { made: number; attempted: number };
    mid: { made: number; attempted: number };
    three: { made: number; attempted: number };
  };

  // Efficiency metrics
  trueShootingAttempts: number;
  effectiveFieldGoalPercentage: number;
  plusMinus: number;
};

// ============================================================================
// COMPREHENSIVE BASKETBALL STATISTICS ENHANCEMENT
// ============================================================================

// Shot context and splits
export type ShotContext = {
  zone: 'rim' | 'close' | 'mid' | 'corner3' | 'aboveBreak3';
  clockTime: 'early' | 'middle' | 'late'; // 18-24, 7-18, 0-7 seconds
  touchType: 'catchAndShoot' | 'pullUp' | 'offDribble';
  isAssisted: boolean;
  defenderDistance: 'tight' | 'open' | 'wideOpen'; // <4ft, 4-6ft, 6+ft
  gameContext: 'regular' | 'clutch' | 'garbageTime'; // clutch = last 5:00 within ±5
  homeAway: 'home' | 'away';
  quarter: 1 | 2 | 3 | 4 | 'OT';
};

// Play-type efficiency (Synergy-style)
export type PlayType =
  | 'pnrBallHandler'
  | 'pnrRollMan'
  | 'isolation'
  | 'spotUp'
  | 'handoff'
  | 'offScreen'
  | 'cuts'
  | 'postUps'
  | 'putbacks'
  | 'transition'
  | 'misc';

export type PlayTypeStats = {
  frequency: number; // % of possessions
  pointsPerPossession: number;
  effectiveFieldGoalPercentage: number;
  turnoverRate: number;
  freeThrowRate: number;
  scoreRate: number; // % that result in scoring
};

// Tracking and hustle stats
export type TrackingStats = {
  // Passing & creation
  passesMade: number;
  passesReceived: number;
  potentialAssists: number;
  secondaryAssists: number; // "hockey" assists
  freeThrowAssists: number;
  assistPointsCreated: number;

  // Touch profile
  touches: number;
  frontCourtTouches: number;
  timeOfPossession: number; // seconds
  dribblesPerTouch: number;
  driveFrequency: number;
  driveFGPercentage: number;
  driveFreeThrowRate: number;
  driveTurnoverRate: number;
  paintTouches: number;

  // Rebounding detail
  boxOuts: number;
  reboundChances: number;
  contestedRebounds: number;
  uncontestedRebounds: number;
  teamReboundCredit: number;

  // Defense detail
  deflections: number;
  contested2s: number;
  contested3s: number;
  rimContests: number;
  chargesDrawn: number;
  looseBallsRecovered: number;
  screenNavigationEvents: number;
  stealOpportunities: number;
  rimFieldGoalPercentageAllowed: number;
  rimDeterrence: number; // opponent shot rate at rim while on floor

  // Screening
  screenAssists: number;
  screenAssistPoints: number;
  offBallScreensSet: number;
  offBallScreensReceived: number;
};

// Foul breakdown
export type FoulStats = {
  personalFouls: number;
  foulsDrawn: number;
  offensiveFouls: number;
  shootingFoulsDrawn: number;
  shootingFoulsCommitted: number;
  technicalFouls: number;
  flagrantFouls: number;
};

// Turnover breakdown
export type TurnoverStats = {
  badPass: number;
  lostBall: number;
  travel: number;
  offensiveFoul: number;
  threeSecond: number;
  fiveSecond: number;
  eightSecond: number;
  backcourt: number;
};

// Enhanced comprehensive PlayerStats (extends current PlayerStats)
export type ComprehensivePlayerStats = PlayerStats & {
  // Enhanced availability
  gamesPlayed: number;
  gamesStarted: number;

  // Enhanced scoring
  twoPointersMade: number;
  twoPointersAttempted: number;
  andOnes: number; // And-1 conversions
  threePtFoulMakes: number; // 3PT foul makes
  threePtFoulAttempts: number; // 3PT foul attempts

  // Enhanced rebounding detail
  blocksAgainst: number; // Shots blocked against this player

  // Detailed fouls
  foulStats: FoulStats;

  // Enhanced shooting splits
  shotsByClock: {
    early: { made: number; attempted: number }; // 18-24 seconds
    middle: { made: number; attempted: number }; // 7-18 seconds
    late: { made: number; attempted: number }; // 0-7 seconds
  };

  shotsByTouch: {
    catchAndShoot: { made: number; attempted: number };
    pullUp: { made: number; attempted: number };
    offDribble3PA: number; // Rate of 3PA off dribble
  };

  assistedPercentage: {
    twoPointers: number; // % of 2PM that were assisted
    threePointers: number; // % of 3PM that were assisted
  };

  shotsByDefense: {
    tight: { made: number; attempted: number }; // <4 ft
    open: { made: number; attempted: number }; // 4-6 ft
    wideOpen: { made: number; attempted: number }; // 6+ ft
  };

  contextSplits: {
    home: { made: number; attempted: number; points: number };
    away: { made: number; attempted: number; points: number };
    clutch: { made: number; attempted: number; points: number }; // last 5:00 within ±5
    garbageTime: { made: number; attempted: number; points: number };
    byQuarter: Record<string, { made: number; attempted: number; points: number }>;
  };

  // Possession & rate stats (per-100)
  per100Stats: {
    points: number;
    assists: number;
    rebounds: number;
    steals: number;
    blocks: number;
    turnovers: number;
    fouls: number;
  };

  // Rate percentages
  rates: {
    threePointAttemptRate: number; // 3PA/FGA
    freeThrowRate: number; // FTA/FGA
    pointsPerShotAttempt: number; // PSA
    offensiveReboundRate: number; // ORB%
    defensiveReboundRate: number; // DRB%
    totalReboundRate: number; // TRB%
    assistRate: number; // AST%
    turnoverRate: number; // TOV%
    stealRate: number; // STL%
    blockRate: number; // BLK%
    usageRate: number; // USG%
  };

  // Enhanced efficiency ratings
  offensiveRating: number; // ORtg
  defensiveRating: number; // DRtg
  netRating: number; // NetRtg = ORtg - DRtg
  trueShootingPercentage: number;
  playerEfficiencyRating: number; // PER
  gameScore: number; // Single-game metric

  // Play-type efficiency (Synergy-style)
  playTypes: Record<PlayType, PlayTypeStats>;

  // Tracking & "hustle" stats
  tracking: TrackingStats;

  // Turnover breakdown
  turnoversBy: TurnoverStats;
};

// Team-level stats with comprehensive breakdowns
export type ComprehensiveTeamStats = {
  teamId: Id;
  players: Record<Id, ComprehensivePlayerStats>;

  // Team totals
  teamTotals: Omit<ComprehensivePlayerStats, 'playerId'>;

  // Team-specific breakdowns
  teamBreakdowns: {
    pointsInPaint: number; // PITP
    secondChancePoints: number;
    fastBreakPoints: number;
    pointsOffTurnovers: number;
    benchPoints: number;
    leadChanges: number;
    timesTied: number;
  };

  // Four Factors (team)
  fourFactors: {
    effectiveFieldGoalPercentage: number;
    turnoverRate: number;
    offensiveReboundRate: number;
    freeThrowRate: number;
  };

  // Opponent Four Factors
  opponentFourFactors: {
    effectiveFieldGoalPercentage: number;
    turnoverRate: number;
    offensiveReboundRate: number;
    freeThrowRate: number;
  };

  // Pace and ratings
  possessions: number;
  pace: number; // Possessions per 48 minutes
  offensiveRating: number; // Points per 100 possessions
  defensiveRating: number; // Points allowed per 100 possessions
  netRating: number;

  // Special teams style splits
  defenseBreakdown: {
    manDefenseRating: number;
    zoneDefenseRating: number;
    pressPointsAllowed: number;
    pressForced: number;
  };
};

// Keep existing TeamStats for backward compatibility
export type TeamStats = {
  teamId: Id;
  players: Record<Id, PlayerStats>;
  teamTotals: PlayerStats;
  possessions: number;
  pace: number;
};

// Lineup and context stats
export type LineupStats = {
  players: Id[]; // 5-man lineup
  minutes: number;
  possessions: number;
  offensiveRating: number;
  defensiveRating: number;
  netRating: number;
  pace: number;
  continuity: number; // How often this exact lineup plays together
};

export type OnOffSplits = {
  playerId: Id;
  onCourt: {
    minutes: number;
    offensiveRating: number;
    defensiveRating: number;
    netRating: number;
    pace: number;
  };
  offCourt: {
    minutes: number;
    offensiveRating: number;
    defensiveRating: number;
    netRating: number;
    pace: number;
  };
  rawOnOff: number;
};

export type PlayerPairing = {
  player1: Id;
  player2: Id;
  minutes: number;
  netRating: number;
  offensiveRating: number;
  defensiveRating: number;
};

// Context and schedule stats
export type GameContext = {
  isBackToBack: boolean;
  is3In4Days: boolean;
  travel: 'none' | 'short' | 'medium' | 'long';
  altitude: 'sea' | 'moderate' | 'high'; // <1000ft, 1000-3000ft, >3000ft
  strengthOfOpponent: number; // Opponent's season rating
  restDays: number;
};

export type StatDistribution = {
  mean: number;
  stdDev: number;
  percentiles: {
    p10: number;
    p25: number;
    p50: number;
    p75: number;
    p90: number;
    p95: number;
    p99: number;
  };
};

export type ComprehensiveLeagueBaseline = {
  league: League;
  name: string;
  region: string;
  season: string;

  environment: LeagueEnvironment;

  // Comprehensive statistical distributions
  playerDistributions: {
    scoring: {
      points: StatDistribution;
      fieldGoalPercentage: StatDistribution;
      threePointPercentage: StatDistribution;
      freeThrowPercentage: StatDistribution;
      trueShootingPercentage: StatDistribution;
    };

    rebounding: {
      total: StatDistribution;
      offensive: StatDistribution;
      defensive: StatDistribution;
      reboundRate: StatDistribution;
    };

    playmaking: {
      assists: StatDistribution;
      turnovers: StatDistribution;
      assistRate: StatDistribution;
      turnoverRate: StatDistribution;
    };

    defense: {
      steals: StatDistribution;
      blocks: StatDistribution;
      stealRate: StatDistribution;
      blockRate: StatDistribution;
    };

    usage: {
      usageRate: StatDistribution;
      touches: StatDistribution;
      timeOfPossession: StatDistribution;
    };

    efficiency: {
      offensiveRating: StatDistribution;
      defensiveRating: StatDistribution;
      playerEfficiencyRating: StatDistribution;
      winShares: StatDistribution;
    };
  };

  // Play-type frequency and efficiency distributions
  playTypeDistributions: Record<
    PlayType,
    {
      frequency: StatDistribution;
      efficiency: StatDistribution;
    }
  >;

  metadata: {
    sources: string[];
    sampleSize: number;
    dataQuality: number; // 0-1 confidence in data quality
    lastUpdated: string;
  };
};

export type GameStats = {
  gameId: Id;
  homeTeam: TeamStats;
  awayTeam: TeamStats;
  finalScore: { home: number; away: number };
  gameLength: number; // in minutes
  playByPlay: Array<{
    possession: number;
    player: Id;
    action: Action;
    outcome: PlayOutcome;
    timestamp: number;
  }>;
};

// ============================================================================
// COMPREHENSIVE LEAGUE BASELINES & NORMALIZATION SYSTEM
// ============================================================================

/**
 * Statistical range with distribution parameters.
 */
export type StatRange = {
  mean: number;
  stdDev: number;
  min: number;
  max: number;
};

/**
 * League environment characteristics for normalization.
 */
export type LeagueEnvironment = {
  gameLength: number; // Minutes per game
  pace: number; // Possessions per game
  offensiveRating: number; // Points per 100 possessions
  pointsPerGame: number; // Team points per game average
  shotClock: number; // Shot clock seconds (0 = none)

  style: {
    threePointRate: number; // 3PA/FGA
    freeThrowRate: number; // FTA/FGA
    assistRate: number; // AST/FGM
    stealRate: number; // Steals per 100 possessions
    blockRate: number; // Blocks per 100 possessions
    foulRate: number; // Personal fouls per 100 possessions
  };
};

/**
 * Per-100 possession statistical baselines.
 */
export type Per100Stats = {
  scoring: {
    points: StatRange;
    fieldGoals: { made: number; attempted: number; percentage: number };
    threePointers: { made: number; attempted: number; percentage: number };
    freeThrows: { made: number; attempted: number; percentage: number };
    trueShootingPercentage: number;
    effectiveFieldGoalPercentage: number;
  };

  rebounding: {
    offensive: StatRange;
    defensive: StatRange;
    total: StatRange;
    offensiveReboundRate: number; // Team ORB%
    defensiveReboundRate: number; // Team DRB%
  };

  playmaking: {
    assists: StatRange;
    turnovers: StatRange;
    assistToTurnoverRatio: number;
    usage: StatRange; // Usage rate
  };

  defense: {
    steals: StatRange;
    blocks: StatRange;
    personalFouls: StatRange;
    deflections?: StatRange; // Advanced leagues only
  };

  advanced: {
    plusMinus: StatRange;
    playerEfficiencyRating: number; // League average PER
    winShares: StatRange;
    boxPlusMinus?: StatRange; // Advanced leagues only
  };
};

/**
 * Position multipliers for stat distribution within a league.
 */
export type PositionFactors = Record<
  PlayerPosition,
  {
    scoring: number;
    rebounding: number;
    assists: number;
    steals: number;
    blocks: number;
    usage: number;
  }
>;

/**
 * Real-world league statistical baselines.
 */
export type LeagueBaseline = {
  league: League;
  name: string;
  region: string; // 'US', 'Europe', 'Asia', 'Americas', 'Africa', 'International'

  environment: LeagueEnvironment;
  per100Stats: Per100Stats;
  positionFactors: PositionFactors;

  metadata: {
    sources: string[];
    season: string;
    sampleSize: number;
    dataQuality: number; // 0-1
    lastUpdated: string;
  };
};

/**
 * Statistical conversion factors between leagues.
 */
export type ConversionFactors = {
  scoring: {
    pointsMultiplier: number;
    efficiencyMultiplier: number;
    volumeMultiplier: number;
    shotSelectionAdjustment: number;
  };

  rebounding: {
    opportunityMultiplier: number;
    competitionAdjustment: number;
  };

  playmaking: {
    assistMultiplier: number;
    turnoverMultiplier: number;
    usageMultiplier: number;
  };

  defense: {
    stealMultiplier: number;
    blockMultiplier: number;
    foulMultiplier: number;
  };
};

/**
 * Cross-league normalization configuration.
 */
export type NormalizationConfig = {
  fromLeague: League;
  toLeague: League;

  conversionFactors: ConversionFactors;

  difficultyAdjustment: {
    competitionDelta: number; // -2 to +2
    paceAdjustment: number;
    styleAdjustment: number;
    confidenceAdjustment: number;
  };

  transitionMetrics: {
    successRate: number; // 0-1
    adjustmentPeriod: number; // games
    adjustmentVariance: number;
  };
};

/**
 * Normalized player statistics for cross-league comparison.
 */
export type NormalizedPlayerStats = {
  playerId: Id;
  originalLeague: League;
  targetLeague: League;
  normalizationDate: string;

  per100Stats: {
    // Scoring
    points: number;
    fieldGoalsMade: number;
    fieldGoalsAttempted: number;
    threePointersMade: number;
    threePointersAttempted: number;
    freeThrowsMade: number;
    freeThrowsAttempted: number;

    // Percentages (already normalized)
    fieldGoalPercentage: number;
    threePointPercentage: number;
    freeThrowPercentage: number;
    trueShootingPercentage: number;
    effectiveFieldGoalPercentage: number;

    // Rebounding
    offensiveRebounds: number;
    defensiveRebounds: number;
    totalRebounds: number;

    // Playmaking
    assists: number;
    turnovers: number;

    // Defense
    steals: number;
    blocks: number;
    personalFouls: number;

    // Advanced
    usage: number;
    plusMinus: number;
    playerEfficiencyRating: number;
  };

  confidence: {
    pointsRange: [number, number];
    efficiencyRange: [number, number];
    usageRange: [number, number];

    overallConfidence: number; // 0-1

    confidenceFactors: {
      sampleSize: number;
      leagueDataQuality: number;
      transitionDifficulty: number;
      styleCompatibility: number;
    };
  };

  percentiles: {
    scoring: number;
    rebounding: number;
    playmaking: number;
    defense: number;
    overall: number;
  };
};

/**
 * Category validation result for baseline accuracy.
 */
export type CategoryValidationResult = {
  withinRange: boolean;
  actualMean: number;
  expectedMean: number;
  deviation: number;
  deviationPercentage: number;
  actualStdDev: number;
  expectedStdDev: number;
  shapeScore: number;
  outlierRate: number;
};

/**
 * League baseline validation results.
 */
export type BaselineValidationResult = {
  validationId: string;
  league: League;

  config: {
    gamesSimulated: number;
    playersGenerated: number;
    validationDate: string;
  };

  accuracy: {
    overallAccuracy: number;
    categoryAccuracy: Record<string, CategoryValidationResult>;
  };

  crossLeagueValidation?: {
    comparedLeagues: League[];
    relationshipAccuracy: number;
    transitionAccuracy: Record<string, number>;
  };

  recommendations: Array<{
    category: string;
    issue: string;
    suggestion: string;
    priority: 'critical' | 'high' | 'medium' | 'low';
    implementationNote?: string;
  }>;

  metadata: {
    validationVersion: string;
    executionTime: number;
    memoryUsage?: number;
    performanceMetrics: {
      gamesPerSecond: number;
      normalizationsPerSecond: number;
    };
  };
};

// ============================================================================
// TALENT SCALING SYSTEM TYPES
// ============================================================================

/**
 * Statistical categories for talent scaling.
 */
export type StatCategory = 'scoring' | 'efficiency' | 'rebounding' | 'playmaking' | 'defense' | 'usage' | 'durability';

/**
 * Mathematical curve types for non-linear scaling.
 */
export type CurveType = 'exponential' | 'power' | 'sigmoid' | 'logarithmic' | 'custom';

/**
 * Scaling configuration for a stat category.
 */
export type ScalingConfig = {
  curveType: CurveType;
  parameters: {
    base: number;
    exponent: number;
    floor: number;
    ceiling: number;
    inflectionPoint?: number;
    custom?: Record<string, number | string>;
  };
  positionModifiers: Record<PlayerPosition, number>;
  leagueModifiers: Record<string, number>;
};

/**
 * Complete talent scaling system configuration.
 */
export type TalentScalingSystem = {
  categories: Record<StatCategory, ScalingConfig>;
  globalParams: {
    outlierRate: number;
    varianceAmplifier: number;
    leagueTalentImpact: number;
    minLeagueLeaders: number;
  };
  validation: {
    maxMultiplier: number;
    expectedOutlierRate: number;
    averagePreservation: number;
  };
};

/**
 * Result of talent scaling calculation.
 */
export type TalentScalingResult = {
  playerId: Id;
  category: StatCategory;
  rawTalent: number;
  multiplier: number;
  calculation: {
    baseCurveMultiplier: number;
    positionAdjustment: number;
    leagueAdjustment: number;
    varianceComponent: number;
    finalMultiplier: number;
  };
  leaguePercentile: number;
  isOutlier: boolean;
};
