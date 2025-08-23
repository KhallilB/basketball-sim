/**
 * General measurement conversion utilities for basketball simulation
 * Supports various measurement types with consistent internal storage
 */

export type LengthUnit = 'cm' | 'ft-in' | 'in' | 'm' | 'ft';
export type WeightUnit = 'kg' | 'lb';
export type SpeedUnit = 'mph' | 'kph' | 'mps';

export interface LengthDisplay {
  feet: number;
  inches: number;
  totalInches: number;
  cm: number;
  meters: number;
}

export interface WeightDisplay {
  kg: number;
  pounds: number;
}

export interface SpeedDisplay {
  mph: number;
  kph: number;
  mps: number;
}

// ===== LENGTH CONVERSIONS =====

/**
 * Convert centimeters to feet and inches
 */
export function cmToFeetInches(cm: number): { feet: number; inches: number } {
  const totalInches = cm / 2.54;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  
  return { feet, inches };
}

/**
 * Convert feet and inches to centimeters
 */
export function feetInchesToCm(feet: number, inches: number): number {
  const totalInches = feet * 12 + inches;
  return Math.round(totalInches * 2.54);
}

/**
 * Convert total inches to centimeters
 */
export function inchesToCm(inches: number): number {
  return Math.round(inches * 2.54);
}

/**
 * Convert centimeters to total inches
 */
export function cmToInches(cm: number): number {
  return Math.round(cm / 2.54);
}

/**
 * Convert centimeters to meters
 */
export function cmToMeters(cm: number): number {
  return cm / 100;
}

/**
 * Convert meters to centimeters
 */
export function metersToCm(meters: number): number {
  return Math.round(meters * 100);
}

/**
 * Convert feet to centimeters
 */
export function feetToCm(feet: number): number {
  return Math.round(feet * 30.48);
}

/**
 * Convert centimeters to feet
 */
export function cmToFeet(cm: number): number {
  return cm / 30.48;
}

// ===== WEIGHT CONVERSIONS =====

/**
 * Convert kilograms to pounds
 */
export function kgToPounds(kg: number): number {
  return Math.round(kg * 2.20462);
}

/**
 * Convert pounds to kilograms
 */
export function poundsToKg(pounds: number): number {
  return Math.round(pounds / 2.20462);
}

// ===== SPEED CONVERSIONS =====

/**
 * Convert miles per hour to kilometers per hour
 */
export function mphToKph(mph: number): number {
  return Math.round(mph * 1.60934 * 100) / 100;
}

/**
 * Convert kilometers per hour to miles per hour
 */
export function kphToMph(kph: number): number {
  return Math.round(kph / 1.60934 * 100) / 100;
}

/**
 * Convert miles per hour to meters per second
 */
export function mphToMps(mph: number): number {
  return Math.round(mph * 0.44704 * 100) / 100;
}

/**
 * Convert meters per second to miles per hour
 */
export function mpsToMph(mps: number): number {
  return Math.round(mps / 0.44704 * 100) / 100;
}

/**
 * Convert kilometers per hour to meters per second
 */
export function kphToMps(kph: number): number {
  return Math.round(kph / 3.6 * 100) / 100;
}

/**
 * Convert meters per second to kilometers per hour
 */
export function mpsToKph(mps: number): number {
  return Math.round(mps * 3.6 * 100) / 100;
}

// ===== FORMATTING FUNCTIONS =====

/**
 * Format length for display based on user preference
 */
export function formatLength(cm: number, unit: LengthUnit = 'ft-in'): string {
  switch (unit) {
    case 'cm':
      return `${cm} cm`;
    case 'in':
      return `${cmToInches(cm)}"`;
    case 'm':
      return `${cmToMeters(cm).toFixed(2)} m`;
    case 'ft':
      return `${cmToFeet(cm).toFixed(1)} ft`;
    case 'ft-in':
    default:
      const { feet, inches } = cmToFeetInches(cm);
      return `${feet}'${inches}"`;
  }
}

/**
 * Format weight for display based on user preference
 */
export function formatWeight(kg: number, unit: WeightUnit = 'lb'): string {
  switch (unit) {
    case 'kg':
      return `${kg} kg`;
    case 'lb':
    default:
      return `${kgToPounds(kg)} lb`;
  }
}

/**
 * Format speed for display based on user preference
 */
export function formatSpeed(mps: number, unit: SpeedUnit = 'mph'): string {
  switch (unit) {
    case 'mph':
      return `${mpsToMph(mps)} mph`;
    case 'kph':
      return `${mpsToKph(mps)} kph`;
    case 'mps':
    default:
      return `${mps} m/s`;
  }
}

// ===== DISPLAY OBJECTS =====

/**
 * Get complete length information for display purposes
 */
export function getLengthDisplay(cm: number): LengthDisplay {
  const { feet, inches } = cmToFeetInches(cm);
  const totalInches = cmToInches(cm);
  const meters = cmToMeters(cm);
  
  return {
    feet,
    inches,
    totalInches,
    cm,
    meters
  };
}

/**
 * Get complete weight information for display purposes
 */
export function getWeightDisplay(kg: number): WeightDisplay {
  return {
    kg,
    pounds: kgToPounds(kg)
  };
}

/**
 * Get complete speed information for display purposes
 */
export function getSpeedDisplay(mps: number): SpeedDisplay {
  return {
    mph: mpsToMph(mps),
    kph: mpsToKph(mps),
    mps
  };
}

// ===== PARSING FUNCTIONS =====

/**
 * Parse length string and convert to centimeters
 * Supports formats: "6'2", "6'2\"", "74", "188cm", "188 cm", "1.88m", "6.2ft"
 */
export function parseLengthToCm(lengthStr: string): number {
  const str = lengthStr.trim().toLowerCase();
  
  // Handle cm format: "188cm" or "188 cm"
  const cmMatch = str.match(/^(\d+(?:\.\d+)?)\s*cm$/);
  if (cmMatch) {
    return Math.round(parseFloat(cmMatch[1]));
  }
  
  // Handle meters format: "1.88m" or "1.88 m"
  const mMatch = str.match(/^(\d+(?:\.\d+)?)\s*m$/);
  if (mMatch) {
    return metersToCm(parseFloat(mMatch[1]));
  }
  
  // Handle feet format: "6.2ft" or "6.2 ft"
  const ftMatch = str.match(/^(\d+(?:\.\d+)?)\s*ft$/);
  if (ftMatch) {
    return feetToCm(parseFloat(ftMatch[1]));
  }
  
  // Handle feet'inches format: "6'2" or "6'2""
  const feetInchesMatch = str.match(/^(\d+)'(\d+)[""]?$/);
  if (feetInchesMatch) {
    const feet = parseInt(feetInchesMatch[1]);
    const inches = parseInt(feetInchesMatch[2]);
    return feetInchesToCm(feet, inches);
  }
  
  // Handle total inches: "74"
  const inchesMatch = str.match(/^(\d+)$/);
  if (inchesMatch) {
    const inches = parseInt(inchesMatch[1]);
    return inchesToCm(inches);
  }
  
  throw new Error(`Invalid length format: ${lengthStr}`);
}

/**
 * Parse weight string and convert to kilograms
 * Supports formats: "180lb", "180 lb", "82kg", "82 kg"
 */
export function parseWeightToKg(weightStr: string): number {
  const str = weightStr.trim().toLowerCase();
  
  // Handle kg format: "82kg" or "82 kg"
  const kgMatch = str.match(/^(\d+(?:\.\d+)?)\s*kg$/);
  if (kgMatch) {
    return Math.round(parseFloat(kgMatch[1]));
  }
  
  // Handle lb format: "180lb" or "180 lb"
  const lbMatch = str.match(/^(\d+(?:\.\d+)?)\s*lb$/);
  if (lbMatch) {
    return poundsToKg(parseFloat(lbMatch[1]));
  }
  
  // Handle plain number (assume pounds)
  const numberMatch = str.match(/^(\d+(?:\.\d+)?)$/);
  if (numberMatch) {
    return poundsToKg(parseFloat(numberMatch[1]));
  }
  
  throw new Error(`Invalid weight format: ${weightStr}`);
}

// ===== CONVENIENCE FUNCTIONS =====

/**
 * Format height for display (backward compatibility)
 */
export function formatHeight(cm: number, unit: LengthUnit = 'ft-in'): string {
  return formatLength(cm, unit);
}

/**
 * Parse height string and convert to centimeters (backward compatibility)
 */
export function parseHeightToCm(heightStr: string): number {
  return parseLengthToCm(heightStr);
}

/**
 * Get complete height information for display purposes (backward compatibility)
 */
export function getHeightDisplay(cm: number): LengthDisplay {
  return getLengthDisplay(cm);
}

/**
 * Common basketball measurement constants
 */
export const BASKETBALL_MEASUREMENTS = {
  // Heights in centimeters (NBA averages by position)
  HEIGHTS: {
    POINT_GUARD: 185,     // ~6'1"
    SHOOTING_GUARD: 193,  // ~6'4"
    SMALL_FORWARD: 201,   // ~6'7"
    POWER_FORWARD: 206,   // ~6'9"
    CENTER: 211,          // ~6'11"
    
    // Common thresholds
    TALL_GUARD: 193,      // 6'4" - tall for a guard
    SHORT_FORWARD: 198,   // 6'6" - short for a forward
    BIG_MAN: 203,         // 6'8" - typically considered a "big"
  },
  
  // Weights in kilograms (NBA averages by position)
  WEIGHTS: {
    POINT_GUARD: 84,      // ~185 lb
    SHOOTING_GUARD: 93,   // ~205 lb
    SMALL_FORWARD: 100,   // ~220 lb
    POWER_FORWARD: 109,   // ~240 lb
    CENTER: 118,          // ~260 lb
  },
  
  // Court dimensions in centimeters
  COURT: {
    LENGTH: 2865,         // 94 feet
    WIDTH: 1524,          // 50 feet
    RIM_HEIGHT: 305,      // 10 feet
    THREE_POINT_LINE: 724, // 23'9" (NBA)
    FREE_THROW_LINE: 457, // 15 feet
  },
  
  // Ball specifications
  BALL: {
    CIRCUMFERENCE: 76,    // 29.5-29.875 inches (average in cm)
    WEIGHT: 0.62,         // 22 oz in kg
  }
} as const;

// Backward compatibility
export const BASKETBALL_HEIGHTS = BASKETBALL_MEASUREMENTS.HEIGHTS;
