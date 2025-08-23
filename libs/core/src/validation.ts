/**
 * Comprehensive validation and error handling system
 * Provides type-safe validation for all basketball simulation inputs
 */

import { CONFIG } from './config.js';
import type { Position, Ratings, Tendencies } from '@basketball-sim/types';

// Custom error classes for better error handling
export class ValidationError extends Error {
  constructor(message: string, public field?: string, public value?: unknown) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class RatingError extends ValidationError {
  constructor(rating: number, field: string) {
    super(
      `Invalid rating ${rating} for ${field}. Must be between ${CONFIG.VALIDATION.RATING_RANGE[0]} and ${CONFIG.VALIDATION.RATING_RANGE[1]}`,
      field,
      rating
    );
    this.name = 'RatingError';
  }
}

export class PositionError extends ValidationError {
  constructor(position: Position, reason: string) {
    super(`Invalid position (${position.x}, ${position.y}): ${reason}`, 'position', position);
    this.name = 'PositionError';
  }
}

// Validation functions
export function validateRating(rating: number, fieldName: string): number {
  if (typeof rating !== 'number' || isNaN(rating)) {
    throw new RatingError(rating, fieldName);
  }

  const [min, max] = CONFIG.VALIDATION.RATING_RANGE;
  if (rating < min || rating > max) {
    throw new RatingError(rating, fieldName);
  }

  return rating;
}

export function validateRatings(ratings: Ratings): Ratings {
  const validatedRatings = { ...ratings };

  // Validate all required rating fields
  const requiredFields: (keyof Ratings)[] = [
    'three',
    'mid',
    'finishing',
    'ft',
    'pass',
    'handle',
    'post',
    'roll',
    'screen',
    'onBallDef',
    'lateral',
    'rimProt',
    'steal',
    'speed',
    'accel',
    'strength',
    'vertical',
    'rebound',
    'height',
    'wingspan',
    'iq',
    'discipline',
    'consistency',
    'clutch',
    'stamina',
    'durability'
  ];

  for (const field of requiredFields) {
    if (ratings[field] === undefined) {
      throw new ValidationError(`Missing required rating field: ${field}`, field);
    }

    // Special validation for physical measurements
    if (field === 'height') {
      if (ratings.height < 152 || ratings.height > 229) {
        // 5'0" to 7'6" in cm
        throw new ValidationError(
          `Invalid height ${ratings.height} cm. Must be between 152-229 cm`,
          'height',
          ratings.height
        );
      }
      validatedRatings.height = ratings.height;
    } else if (field === 'wingspan') {
      if (ratings.wingspan < 152 || ratings.wingspan > 254) {
        // 5'0" to 8'4" in cm
        throw new ValidationError(
          `Invalid wingspan ${ratings.wingspan} cm. Must be between 152-254 cm`,
          'wingspan',
          ratings.wingspan
        );
      }
      validatedRatings.wingspan = ratings.wingspan;
    } else {
      // Standard rating validation for other fields
      validatedRatings[field] = validateRating(ratings[field], field);
    }
  }

  return validatedRatings;
}

export function validateTendency(tendency: number, fieldName: string): number {
  if (typeof tendency !== 'number' || isNaN(tendency)) {
    throw new ValidationError(`Invalid tendency ${tendency} for ${fieldName}. Must be a number`, fieldName, tendency);
  }

  const [min, max] = CONFIG.VALIDATION.TENDENCY_RANGE;
  if (tendency < min || tendency > max) {
    throw new ValidationError(
      `Invalid tendency ${tendency} for ${fieldName}. Must be between ${min} and ${max}`,
      fieldName,
      tendency
    );
  }

  return tendency;
}

export function validateTendencies(tendencies: Tendencies): Tendencies {
  const validated = { ...tendencies };

  // Validate array tendencies
  if (!Array.isArray(validated.withBall) || validated.withBall.length !== 7) {
    throw new ValidationError('withBall tendencies must be an array of 7 numbers', 'withBall', validated.withBall);
  }
  validated.withBall = validated.withBall.map((t, i) => validateTendency(t, `withBall[${i}]`));

  if (!Array.isArray(validated.offBall) || validated.offBall.length !== 5) {
    throw new ValidationError('offBall tendencies must be an array of 5 numbers', 'offBall', validated.offBall);
  }
  validated.offBall = validated.offBall.map((t, i) => validateTendency(t, `offBall[${i}]`));

  if (!Array.isArray(validated.shotZone) || validated.shotZone.length !== 3) {
    throw new ValidationError('shotZone tendencies must be an array of 3 numbers', 'shotZone', validated.shotZone);
  }
  validated.shotZone = validated.shotZone.map((t, i) => validateTendency(t, `shotZone[${i}]`));

  if (!Array.isArray(validated.threeStyle) || validated.threeStyle.length !== 2) {
    throw new ValidationError(
      'threeStyle tendencies must be an array of 2 numbers',
      'threeStyle',
      validated.threeStyle
    );
  }
  validated.threeStyle = validated.threeStyle.map((t, i) => validateTendency(t, `threeStyle[${i}]`));

  // Validate binary tendencies
  validated.passRisk = validateTendency(validated.passRisk, 'passRisk');
  validated.help = validateTendency(validated.help, 'help');
  validated.gambleSteal = validateTendency(validated.gambleSteal, 'gambleSteal');
  validated.crashOreb = validateTendency(validated.crashOreb, 'crashOreb');

  return validated;
}

export function validatePosition(position: Position): Position {
  if (typeof position !== 'object' || position === null) {
    throw new PositionError(position as Position, 'Position must be an object');
  }

  if (typeof position.x !== 'number' || isNaN(position.x)) {
    throw new PositionError(position, 'x coordinate must be a number');
  }

  if (typeof position.y !== 'number' || isNaN(position.y)) {
    throw new PositionError(position, 'y coordinate must be a number');
  }

  const [minX, maxX] = CONFIG.VALIDATION.POSITION_X_RANGE;
  const [minY, maxY] = CONFIG.VALIDATION.POSITION_Y_RANGE;

  if (position.x < minX || position.x > maxX) {
    throw new PositionError(position, `x coordinate ${position.x} out of bounds [${minX}, ${maxX}]`);
  }

  if (position.y < minY || position.y > maxY) {
    throw new PositionError(position, `y coordinate ${position.y} out of bounds [${minY}, ${maxY}]`);
  }

  return { x: position.x, y: position.y };
}

export function validateProbability(probability: number, fieldName: string): number {
  if (typeof probability !== 'number' || isNaN(probability)) {
    throw new ValidationError(
      `Invalid probability ${probability} for ${fieldName}. Must be a number`,
      fieldName,
      probability
    );
  }

  const [min, max] = CONFIG.VALIDATION.PROBABILITY_RANGE;
  if (probability < min || probability > max) {
    throw new ValidationError(
      `Invalid probability ${probability} for ${fieldName}. Must be between ${min} and ${max}`,
      fieldName,
      probability
    );
  }

  return probability;
}

export function validateFatigue(fatigue: number, playerId: string): number {
  if (typeof fatigue !== 'number' || isNaN(fatigue)) {
    throw new ValidationError(
      `Invalid fatigue ${fatigue} for player ${playerId}. Must be a number`,
      'fatigue',
      fatigue
    );
  }

  const [min, max] = CONFIG.VALIDATION.FATIGUE_RANGE;
  if (fatigue < min || fatigue > max) {
    throw new ValidationError(
      `Invalid fatigue ${fatigue} for player ${playerId}. Must be between ${min} and ${max}`,
      'fatigue',
      fatigue
    );
  }

  return fatigue;
}

export function validateQuarter(quarter: number): number {
  if (typeof quarter !== 'number' || isNaN(quarter) || !Number.isInteger(quarter)) {
    throw new ValidationError(`Invalid quarter ${quarter}. Must be an integer`, 'quarter', quarter);
  }

  const [min, max] = CONFIG.VALIDATION.QUARTER_RANGE;
  if (quarter < min || quarter > max) {
    throw new ValidationError(`Invalid quarter ${quarter}. Must be between ${min} and ${max}`, 'quarter', quarter);
  }

  return quarter;
}

// Safe wrapper functions that return default values on error
export function safeRating(rating: number, defaultValue: number, fieldName: string): number {
  try {
    return validateRating(rating, fieldName);
  } catch {
    return defaultValue;
  }
}

export function safePosition(position: Position, defaultPosition: Position): Position {
  try {
    return validatePosition(position);
  } catch {
    return defaultPosition;
  }
}

export function safeProbability(probability: number, defaultValue: number, fieldName: string): number {
  try {
    return validateProbability(probability, fieldName);
  } catch {
    return defaultValue;
  }
}

// Validation result type for batch operations
export type ValidationResult<T> = {
  isValid: boolean;
  data?: T;
  errors: ValidationError[];
};

export function validateBatch<T>(items: T[], validator: (item: T) => T): ValidationResult<T[]> {
  const errors: ValidationError[] = [];
  const validItems: T[] = [];

  for (const item of items) {
    try {
      validItems.push(validator(item));
    } catch (error) {
      if (error instanceof ValidationError) {
        errors.push(error);
      } else {
        errors.push(new ValidationError(`Unexpected error: ${error}`));
      }
    }
  }

  return {
    isValid: errors.length === 0,
    data: errors.length === 0 ? validItems : undefined,
    errors
  };
}
