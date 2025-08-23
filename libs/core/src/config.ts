/**
 * Centralized Configuration System for Basketball Simulation
 * Eliminates magic numbers and provides single source of truth for all constants
 */

// Court dimensions and geometry
export const COURT_CONFIG = {
  LENGTH: 94,
  WIDTH: 50,
  THREE_POINT_LINE: 23.75,
  CORNER_THREE: 22,
  FREE_THROW_LINE: 15,
  PAINT_WIDTH: 16,
  BASKET_HEIGHT: 10,
  BASKETS: {
    HOME: { x: 5.25, y: 25 },
    AWAY: { x: 88.75, y: 25 }
  }
} as const;

// Rating system configuration
export const RATING_CONFIG = {
  MIN: 25,
  MAX: 99,
  MEAN: 50,
  STD_DEV: 12,
  Z_SCORE_MULTIPLIER: 12
} as const;

// RTTB Model Scoring Weights
export const SCORING_WEIGHTS = {
  SHOT: {
    RATING: 1.0,
    QUALITY: 0.7,
    CONTEST: -0.9,
    FATIGUE: -0.35,
    CLUTCH: 0.2
  },
  PASS: {
    RATING: 1.0,
    LANE_RISK: -0.8,
    PRESSURE: -0.5,
    IQ: 0.3
  },
  DRIVE: {
    BASE: -0.2,
    SPEED_ADVANTAGE: 0.9,
    HANDLE_ADVANTAGE: 0.6,
    LANE: 0.5,
    ANGLE: 0.4
  },
  REBOUND: {
    RATING: 0.9,
    HEIGHT: 0.5,
    STRENGTH: 0.4,
    POSITION_ADVANTAGE: 0.6,
    DISTANCE_PENALTY: -0.3
  }
} as const;

// Tendency distribution parameters
export const TENDENCY_CONFIG = {
  DIRICHLET_BASE: 0.1, // Minimum alpha to prevent zeros
  BETA_MULTIPLIER: 10, // Scale factor for Beta parameters
  DECAY_RATE: 0.999, // Learning decay rate
  UPDATE_THRESHOLD: 1 // Minimum update value
} as const;

// Game simulation parameters
export const SIMULATION_CONFIG = {
  POSSESSION_DURATION_MINUTES: 0.5,
  SHOT_CLOCK_SECONDS: 24,
  QUARTER_LENGTH_SECONDS: 720,
  GAME_LENGTH_SECONDS: 2880,
  FATIGUE_RATE: 0.1,
  SUBSTITUTION_CHECK_INTERVAL: 3, // Every N possessions
  MAX_PLAYER_MINUTES: 48
} as const;

// Shot quality parameters
export const SHOT_QUALITY_CONFIG = {
  BASE_QUALITIES: {
    RIM: 0.8,
    CLOSE: 0.7,
    MID: 0.6,
    THREE: 0.4
  },
  CONTEST_RANGES: {
    FULL_CONTEST_DISTANCE: 0,
    NO_CONTEST_DISTANCE: 6,
    MAX_CONTEST_PENALTY: 0.4
  },
  DISTANCE_THRESHOLDS: {
    RIM: 3,
    CLOSE: 10
  }
} as const;

// Spacing and positioning
export const SPACING_CONFIG = {
  IDEAL_PLAYER_DISTANCE: 15,
  DRIVING_LANE_WIDTH: Math.PI / 4, // 45 degrees
  HELP_DEFENSE_RANGE: 10,
  BOXING_OUT_ADVANTAGE: 1.0,
  BEING_BOXED_OUT_PENALTY: -0.8
} as const;

// Badge system configuration
export const BADGE_CONFIG = {
  MAX_TIER: 3,
  COOLDOWN_SECONDS: 5,
  MAX_STACKS: 3,
  DEFAULT_DECAY: 0.95
} as const;

// Consistency and noise parameters
export const CONSISTENCY_CONFIG = {
  BASE_NOISE: 0.4,
  NOISE_SCALE_FACTOR: 0.01, // (1 - consistency/100) multiplier
  MIN_CONSISTENCY: 0,
  MAX_CONSISTENCY: 100
} as const;

// Display and formatting
export const DISPLAY_CONFIG = {
  PROGRESS_LOG_INTERVAL: 25, // Every N possessions
  SCORING_PLAY_LOG_INTERVAL: 5, // Every N scoring plays
  MAX_EARLY_LOGS: 20, // Show detailed logs for first N possessions
  PLAYER_NAME_MAX_LENGTH: 12,
  DECIMAL_PLACES: {
    PERCENTAGE: 1,
    MINUTES: 1,
    RATING: 2
  }
} as const;

// Validation ranges
export const VALIDATION_CONFIG = {
  RATING_RANGE: [RATING_CONFIG.MIN, RATING_CONFIG.MAX],
  TENDENCY_RANGE: [0, 100],
  PROBABILITY_RANGE: [0, 1],
  POSITION_X_RANGE: [0, COURT_CONFIG.LENGTH],
  POSITION_Y_RANGE: [0, COURT_CONFIG.WIDTH],
  FATIGUE_RANGE: [0, 1],
  QUARTER_RANGE: [1, 4]
} as const;

// Performance optimization
export const PERFORMANCE_CONFIG = {
  CACHE_TENDENCY_DISTRIBUTIONS: true,
  CACHE_BADGE_LOOKUPS: true,
  BATCH_STAT_UPDATES: true,
  MAX_CACHE_SIZE: 1000
} as const;

// Export combined config for easy access
export const CONFIG = {
  COURT: COURT_CONFIG,
  RATING: RATING_CONFIG,
  SCORING: SCORING_WEIGHTS,
  TENDENCY: TENDENCY_CONFIG,
  SIMULATION: SIMULATION_CONFIG,
  SHOT_QUALITY: SHOT_QUALITY_CONFIG,
  SPACING: SPACING_CONFIG,
  BADGE: BADGE_CONFIG,
  CONSISTENCY: CONSISTENCY_CONFIG,
  DISPLAY: DISPLAY_CONFIG,
  VALIDATION: VALIDATION_CONFIG,
  PERFORMANCE: PERFORMANCE_CONFIG
} as const;

export default CONFIG;
