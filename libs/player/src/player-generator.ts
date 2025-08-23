import type { Player, Ratings, Tendencies, PlayerArchetype, PlayerPosition } from '@basketball-sim/types';
import { generateRandomTraits, applyTraitEffects } from './traits.js';
import { initializeBadgeProgress } from './badges.js';
import { initializeTendencyDistributions } from '@basketball-sim/math';

// RTTB Player Generation System
// Implements the full specification for creating players with Ratings, Tendencies, Traits, and Badges

/**
 * Generate a player using the RTTB system
 */
export function generateRTTBPlayer(
  id: string,
  name: string,
  archetype: PlayerArchetype,
  position: PlayerPosition,
  seed: number,
  age = 18
): Player {
  const rng = (s: number) => {
    const x = Math.sin(s) * 10000;
    return x - Math.floor(x);
  };

  // Step 1: Generate base ratings from archetype
  const baseRatings = generateBaseRatings(archetype, position, seed, rng);

  // Step 2: Generate traits (1 archetype + 2 background + 0-1 quirk)
  const traits = generateRandomTraits(seed);

  // Step 3: Generate base tendencies
  const baseTendencies = generateBaseTendencies(position, seed, rng);

  // Step 4: Create base player
  let player: Player = {
    id,
    name,
    ratings: baseRatings,
    tendencies: baseTendencies,
    traits: [],
    badges: initializeBadgeProgress(),
    tendencyDistributions: initializeTendencyDistributions(baseTendencies),
    age,
    skillPoints: 0,
    experience: 0,
    relationships: {
      coachTrust: 50,
      morale: 50,
      rep: 30 + Math.floor(rng(seed * 43) * 40) // 30-70 base rep
    }
  };

  // Step 5: Apply trait effects
  player = applyTraitEffects(player, traits);

  // Step 6: Update tendency distributions after trait effects
  player.tendencyDistributions = initializeTendencyDistributions(player.tendencies);

  // Step 7: Apply body/physical adjustments
  player = applyPhysicalAdjustments(player, position, seed, rng);

  return player;
}

/**
 * Generate base ratings based on archetype and position
 */
function generateBaseRatings(
  archetype: PlayerArchetype,
  position: PlayerPosition,
  seed: number,
  rng: (s: number) => number
): Ratings {
  // Base rating ranges by archetype
  let baseRating: number;
  let variance: number;

  switch (archetype) {
    case 'generational':
      baseRating = 85; // 80-90 range
      variance = 5;
      break;
    case 'top_100':
      baseRating = 75; // 70-80 range
      variance = 5;
      break;
    case 'unranked':
      baseRating = 55; // 50-60 range
      variance = 5;
      break;
  }

  const generateRating = (base: number, specialization = 0, min = 25, max = 99) => {
    const random = rng(seed * 17 + base * 13 + specialization * 7) * 2 - 1; // -1 to 1
    return Math.max(min, Math.min(max, Math.round(base + variance * random + specialization)));
  };

  // Position-based specializations (following RTTB spec)
  const isGuard = position.includes('G') || position === 'PG' || position === 'SG';
  const isForward = position.includes('F') || position === 'SF' || position === 'PF';
  const isCenter = position === 'C';
  const isBig = isCenter || position === 'PF';

  return {
    // Offense
    three: generateRating(baseRating, isGuard ? 12 : isCenter ? -15 : isForward ? 8 : 5),
    mid: generateRating(baseRating, isGuard ? 8 : isForward ? 6 : 0),
    finishing: generateRating(baseRating, isBig ? 12 : isGuard ? -5 : isForward ? 5 : 3),
    ft: generateRating(baseRating, isGuard ? 8 : isBig ? -8 : isForward ? 3 : 0),
    pass: generateRating(baseRating, isGuard ? 10 : isBig ? -10 : isForward ? 2 : 0),
    handle: generateRating(baseRating, isGuard ? 15 : isBig ? -15 : isForward ? 5 : 0),
    post: generateRating(baseRating, isBig ? 18 : isGuard ? -18 : isForward ? 8 : -5),
    roll: generateRating(baseRating, isBig ? 10 : isForward ? 3 : -8),
    screen: generateRating(baseRating, isBig ? 8 : isForward ? 2 : -8),

    // Defense
    onBallDef: generateRating(baseRating, isGuard ? 5 : isForward ? 3 : 0),
    lateral: generateRating(baseRating, isGuard ? 8 : isBig ? -10 : isForward ? 2 : 0),
    rimProt: generateRating(baseRating, isBig ? 15 : isGuard ? -15 : isForward ? 3 : -5),
    steal: generateRating(baseRating, isGuard ? 10 : isForward ? 2 : -5),

    // Physical
    speed: generateRating(baseRating, isGuard ? 10 : isBig ? -12 : isForward ? -3 : 0),
    strength: generateRating(baseRating, isBig ? 12 : isGuard ? -10 : isForward ? 5 : 0),
    vertical: generateRating(baseRating, isBig ? 8 : isForward ? 5 : 0),
    rebound: generateRating(baseRating, isBig ? 15 : isGuard ? -12 : isForward ? 8 : 0),

    // Mental
    iq: generateRating(baseRating, isGuard ? 5 : isForward ? 3 : 0),
    discipline: generateRating(baseRating),
    consistency: generateRating(baseRating, archetype === 'generational' ? 8 : archetype === 'unranked' ? -5 : 0),
    clutch: generateRating(baseRating, archetype === 'generational' ? 10 : -2),

    // Meta
    stamina: generateRating(baseRating),
    accel: generateRating(baseRating, isGuard ? 8 : isBig ? -10 : isForward ? -2 : 0),
    durability: generateRating(baseRating, isForward ? 3 : 0),

    // Physical measurements (will be set in applyPhysicalAdjustments)
    height: 72,
    wingspan: 72
  };
}

/**
 * Generate base tendencies based on position and style
 */
function generateBaseTendencies(position: PlayerPosition, seed: number, rng: (s: number) => number): Tendencies {
  const isGuard = position.includes('G') || position === 'PG' || position === 'SG';
  const isForward = position.includes('F') || position === 'SF' || position === 'PF';
  const isCenter = position === 'C';
  const isBig = isCenter || position === 'PF';

  // Generate with-ball tendencies based on position
  const withBallBase = [
    rng(seed * 23) * (isGuard ? 0.25 : isBig ? 0.1 : 0.2), // drive
    rng(seed * 29) * (isGuard ? 0.2 : 0.15), // pullup
    rng(seed * 31) * (isGuard ? 0.3 : isForward ? 0.25 : 0.1), // catchShoot
    rng(seed * 37) * (isGuard ? 0.15 : 0.1), // pnrAttack
    rng(seed * 41) * (isGuard ? 0.2 : 0.05), // pnrPass
    rng(seed * 43) * (isBig ? 0.3 : 0.05), // post
    0.1 // reset (baseline)
  ];

  // Normalize to sum to 1
  const withBallSum = withBallBase.reduce((a, b) => a + b, 0);
  const withBall = withBallBase.map(t => t / withBallSum);

  // Off-ball tendencies
  const offBall = [
    0.4 + rng(seed * 47) * 0.3, // spot
    0.15 + rng(seed * 53) * 0.2, // relocate
    0.2 + rng(seed * 59) * 0.2, // cut
    isBig ? 0.15 + rng(seed * 61) * 0.1 : 0.05, // screen
    0.1 + rng(seed * 67) * 0.1 // handoffRecv
  ];

  // Normalize off-ball
  const offBallSum = offBall.reduce((a, b) => a + b, 0);
  const normalizedOffBall = offBall.map(t => t / offBallSum);

  // Shot zone preferences
  const shotZone = [
    isBig ? 0.4 + rng(seed * 71) * 0.2 : 0.15 + rng(seed * 71) * 0.1, // rim
    0.25 + rng(seed * 73) * 0.15, // mid
    isGuard ? 0.35 + rng(seed * 79) * 0.2 : isBig ? 0.05 + rng(seed * 79) * 0.1 : 0.25 // three
  ];

  // Normalize shot zones
  const shotZoneSum = shotZone.reduce((a, b) => a + b, 0);
  const normalizedShotZone = shotZone.map(t => t / shotZoneSum);

  // Three-point style
  const threeStyle = [
    0.7 + rng(seed * 83) * 0.2, // catchShoot
    0.3 + rng(seed * 89) * 0.2 // offDribble
  ];
  const threeStyleSum = threeStyle.reduce((a, b) => a + b, 0);
  const normalizedThreeStyle = threeStyle.map(t => t / threeStyleSum);

  return {
    withBall,
    offBall: normalizedOffBall,
    shotZone: normalizedShotZone,
    threeStyle: normalizedThreeStyle,
    passRisk: Math.round(30 + rng(seed * 97) * 40), // 30-70
    help: Math.round(40 + rng(seed * 101) * 20), // 40-60
    gambleSteal: Math.round(20 + rng(seed * 103) * 40), // 20-60
    crashOreb: Math.round(isBig ? 60 + rng(seed * 107) * 20 : 30 + rng(seed * 107) * 20) // Bigs crash more
  };
}

/**
 * Apply physical adjustments based on position and body type
 */
function applyPhysicalAdjustments(
  player: Player,
  position: PlayerPosition,
  seed: number,
  rng: (s: number) => number
): Player {
  const updatedPlayer = { ...player };
  const ratings = { ...player.ratings };

  // Generate height based on position
  let baseHeight: number;
  let heightVariance: number;

  switch (position) {
    case 'PG':
      baseHeight = 74; // 6'2"
      heightVariance = 3;
      break;
    case 'SG':
    case 'G':
      baseHeight = 77; // 6'5"
      heightVariance = 3;
      break;
    case 'SF':
    case 'F':
      baseHeight = 80; // 6'8"
      heightVariance = 3;
      break;
    case 'PF':
      baseHeight = 82; // 6'10"
      heightVariance = 3;
      break;
    case 'C':
      baseHeight = 85; // 7'1"
      heightVariance = 4;
      break;
    default:
      baseHeight = 78;
      heightVariance = 4;
  }

  const height = Math.round(baseHeight + (rng(seed * 109) * 2 - 1) * heightVariance);
  const wingspan = height + Math.round((rng(seed * 113) * 2 - 1) * 3); // ±3 inches from height

  ratings.height = Math.max(68, Math.min(90, height));
  ratings.wingspan = Math.max(68, Math.min(95, wingspan));

  // Adjust ratings based on physical measurements
  const heightFactor = (height - 78) / 12; // Deviation from average height in feet

  // Height affects certain ratings
  ratings.rebound = Math.max(25, Math.min(99, ratings.rebound + Math.round(heightFactor * 3)));
  ratings.rimProt = Math.max(25, Math.min(99, ratings.rimProt + Math.round(heightFactor * 4)));
  ratings.speed = Math.max(25, Math.min(99, ratings.speed - Math.round(heightFactor * 2))); // Taller = slower
  ratings.lateral = Math.max(25, Math.min(99, ratings.lateral - Math.round(heightFactor * 2)));

  // Wingspan affects defense and rebounding
  const wingspanFactor = (wingspan - height) / 6; // Deviation from height in half-feet
  ratings.steal = Math.max(25, Math.min(99, ratings.steal + Math.round(wingspanFactor * 2)));
  ratings.rimProt = Math.max(25, Math.min(99, ratings.rimProt + Math.round(wingspanFactor * 2)));

  updatedPlayer.ratings = ratings;
  return updatedPlayer;
}

/**
 * Generate a realistic team using RTTB system
 */
export function generateRTTBTeam(
  teamId: string,
  teamName: string,
  seed: number
): { id: string; name: string; players: Player[] } {
  const players: Player[] = [];

  // Roster construction: 15 players with realistic distribution
  const rosterPlan = [
    { position: 'PG' as PlayerPosition, archetype: 'top_100' as PlayerArchetype }, // Starting PG
    { position: 'SG' as PlayerPosition, archetype: 'generational' as PlayerArchetype }, // Star SG
    { position: 'SF' as PlayerPosition, archetype: 'top_100' as PlayerArchetype }, // Starting SF
    { position: 'PF' as PlayerPosition, archetype: 'top_100' as PlayerArchetype }, // Starting PF
    { position: 'C' as PlayerPosition, archetype: 'top_100' as PlayerArchetype }, // Starting C
    { position: 'G' as PlayerPosition, archetype: 'unranked' as PlayerArchetype }, // Backup guard
    { position: 'G' as PlayerPosition, archetype: 'unranked' as PlayerArchetype }, // Backup guard
    { position: 'F' as PlayerPosition, archetype: 'unranked' as PlayerArchetype }, // Backup forward
    { position: 'F' as PlayerPosition, archetype: 'unranked' as PlayerArchetype }, // Backup forward
    { position: 'C' as PlayerPosition, archetype: 'unranked' as PlayerArchetype }, // Backup center
    { position: 'G' as PlayerPosition, archetype: 'unranked' as PlayerArchetype }, // Deep bench
    { position: 'F' as PlayerPosition, archetype: 'unranked' as PlayerArchetype }, // Deep bench
    { position: 'F' as PlayerPosition, archetype: 'unranked' as PlayerArchetype }, // Deep bench
    { position: 'G' as PlayerPosition, archetype: 'unranked' as PlayerArchetype }, // Deep bench
    { position: 'C' as PlayerPosition, archetype: 'unranked' as PlayerArchetype } // Deep bench
  ];

  for (let i = 0; i < rosterPlan.length; i++) {
    const plan = rosterPlan[i];
    const player = generateRTTBPlayer(
      `${teamId}_p${i + 1}`,
      `${teamName[0]}${teamName.slice(-1)}${i + 1}`,
      plan.archetype,
      plan.position,
      seed + i * 1000,
      18 + Math.floor(Math.random() * 4) // Age 18-21
    );
    players.push(player);
  }

  return {
    id: teamId,
    name: teamName,
    players
  };
}

/**
 * Calculate player overall rating using RTTB weights
 */
export function calculateRTTBOverall(ratings: Ratings): number {
  // RTTB-based weights emphasizing key skills
  const weights = {
    // Offense (40%)
    three: 0.08,
    mid: 0.06,
    finishing: 0.1,
    ft: 0.02,
    pass: 0.06,
    handle: 0.08,

    // Defense (25%)
    onBallDef: 0.08,
    lateral: 0.05,
    rimProt: 0.07,
    steal: 0.05,

    // Physical (20%)
    speed: 0.06,
    strength: 0.04,
    vertical: 0.03,
    rebound: 0.07,

    // Mental (15%)
    iq: 0.08,
    discipline: 0.03,
    consistency: 0.04,
    clutch: 0.03,
    stamina: 0.03,

    // Situational skills (smaller weights)
    post: 0.04,
    roll: 0.03,
    screen: 0.02,

    // Physical measurements (minimal impact on overall)
    height: 0.005,
    wingspan: 0.005
  };

  let overall = 0;
  for (const [key, weight] of Object.entries(weights)) {
    const rating = ratings[key as keyof Ratings];
    if (typeof rating === 'number') {
      overall += rating * weight;
    }
  }

  return Math.round(overall);
}

/**
 * Get player archetype from overall rating
 */
export function getArchetypeFromOverall(overall: number): PlayerArchetype {
  if (overall >= 80) return 'generational';
  if (overall >= 70) return 'top_100';
  return 'unranked';
}
