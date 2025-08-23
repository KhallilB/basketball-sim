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

export type TeamStats = {
  teamId: Id;
  players: Record<Id, PlayerStats>;
  teamTotals: PlayerStats;
  possessions: number;
  pace: number;
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
