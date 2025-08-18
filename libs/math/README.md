# @basketball-sim/math

Core mathematical utilities and statistical functions for basketball simulation calculations.

## Overview

This library provides fundamental mathematical operations used throughout the simulation engine, including statistical transformations, probability calculations, and utility functions.

## Functions

### Statistical Transformations

#### `z(rating: number): number`

Converts basketball ratings (0-100 scale) to z-scores for statistical modeling:

```typescript
const zScore = z(75); // Converts rating of 75 to z-score: (75-50)/12 ≈ 2.08
```

#### `logistic(score: number): number`

Converts linear scores to probabilities using the logistic function:

```typescript
const probability = logistic(1.5); // ≈ 0.82 probability
```

#### `softmax(values: number[], temperature?: number): number[]`

Converts array of values to probability distribution:

```typescript
const probs = softmax([2, 1, 3]); // [0.24, 0.09, 0.67]
const smoothed = softmax([2, 1, 3], 2); // Higher temp = more uniform
```

### Utility Functions

#### `clamp(value: number, min: number, max: number): number`

Constrains a value within specified bounds:

```typescript
const bounded = clamp(150, 0, 100); // Returns 100
```

## Usage Examples

### Converting Player Ratings to Probabilities

```typescript
import { z, logistic } from '@basketball-sim/math';

function calculateShootingProbability(threePointRating: number, contest: number) {
  const skillComponent = z(threePointRating); // Convert 0-100 to z-score
  const contestPenalty = -0.5 * contest; // Contest reduces probability
  const totalScore = skillComponent + contestPenalty;
  return logistic(totalScore); // Convert to 0-1 probability
}

const prob = calculateShootingProbability(85, 0.3);
console.log(`Shooting probability: ${(prob * 100).toFixed(1)}%`);
```

### Action Selection with Softmax

```typescript
import { softmax } from '@basketball-sim/math';

function chooseAction(actionValues: number[], temperature: number = 1.0) {
  const probabilities = softmax(actionValues, temperature);
  // Lower temperature = more deterministic
  // Higher temperature = more random
  return probabilities;
}

const actionScores = [2.1, 1.8, 2.5, 1.2]; // Drive, Pass, Shoot, Reset
const probs = chooseAction(actionScores, 0.8);
```

## Mathematical Background

### Z-Score Normalization

The `z()` function assumes basketball ratings follow a normal distribution centered at 50 with standard deviation of 12. This transforms ratings into standardized units for consistent mathematical modeling.

### Logistic Function

The logistic function maps any real number to a probability between 0 and 1. It's commonly used in sports analytics for converting linear predictors to win probabilities.

### Softmax Temperature

Temperature controls the "sharpness" of probability distributions:

- **Low temperature (< 1)**: More deterministic, emphasizes highest values
- **High temperature (> 1)**: More uniform, flattens differences

## Building

Run `nx build math` to build the library.
