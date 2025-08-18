# @basketball-sim/params

Centralized parameter configuration system for tuning basketball simulation models without code changes.

## Overview

This library provides a single source of truth for all mathematical model coefficients, target statistics, and behavioral parameters used throughout the simulation engine. The design enables easy tuning and experimentation while maintaining consistency across all models.

## Parameter Structure

### Model Coefficients

#### Shot Model Parameters
```typescript
shot: {
  beta: {
    base: 1.0,        // Baseline shooting ability
    Q: 0.7,           // Shot quality multiplier
    contest: -0.9,    // Defensive contest penalty
    fatigue: -0.35,   // Fatigue penalty
    clutch: 0.2,      // Clutch performance bonus
    noise: 0.4,       // Random variance amplitude
    rel: 0.12         // Release timing modifier
  }
}
```

#### Drive Model Parameters
```typescript
drive: {
  base: -0.2,        // Baseline drive difficulty
  speed: 0.9,        // Speed advantage weight
  handle: 0.6,       // Ball handling weight
  lane: 0.5,         // Open lane bonus
  angle: 0.4,        // Drive angle bonus
  defLat: -0.9,      // Defender lateral quickness penalty
  defOnBall: -0.6    // Defender on-ball defense penalty
}
```

#### Pass Model Parameters
```typescript
pass: {
  base: 1.0,         // Baseline pass completion
  laneRisk: -0.8,    // Penalty for risky passes
  pressure: -0.5,    // Defensive pressure penalty
  iq: 0.3            // Basketball IQ bonus
}
```

### Behavioral Parameters

#### Policy System
```typescript
policy: {
  alpha: 0.7,        // Rationality vs tendency blend (0-1)
  T0: 1.0,          // Base temperature for decision-making
  iqK: 0.009,       // IQ influence on temperature
  discK: 0.008,     // Discipline influence on temperature
  fatigueK: 0.3     // Fatigue influence on temperature
}
```

#### Fatigue System
```typescript
fatigue: {
  perAction: 0.7,    // Fatigue gain per action
  perShot: 1.2,      // Additional fatigue for shots
  recoverTO: 6.0     // Recovery during timeouts
}
```

### Target Statistics

#### NBA Baseline Targets
```typescript
targets: {
  efg: [0.44, 0.48],    // Effective field goal % range
  pace: [65, 75],       // Possessions per game range
  tov: [0.13, 0.19]     // Turnover rate range
}
```

## Usage Examples

### Reading Parameters
```typescript
import { PARAMS } from '@basketball-sim/params';

// Access specific model parameters
const shotQualityWeight = PARAMS.shot.beta.Q;
const driveSpeedWeight = PARAMS.drive.speed;

// Use in model calculations
function calculateShootingProbability(rating: number, quality: number) {
  const skillComponent = z(rating);
  const qualityComponent = PARAMS.shot.beta.Q * quality;
  const totalScore = skillComponent + qualityComponent;
  return logistic(totalScore);
}
```

### Parameter Validation
```typescript
import { PARAMS, type Params } from '@basketball-sim/params';

function validateParameters(params: Params): boolean {
  // Check that probabilities are within valid ranges
  if (params.policy.alpha < 0 || params.policy.alpha > 1) {
    throw new Error('Policy alpha must be between 0 and 1');
  }
  
  // Validate target ranges
  if (params.targets.efg[0] >= params.targets.efg[1]) {
    throw new Error('EFG target range invalid');
  }
  
  return true;
}
```

### Runtime Parameter Tuning
```typescript
// Create modified parameter set for experimentation
const experimentalParams = {
  ...PARAMS,
  shot: {
    ...PARAMS.shot,
    beta: {
      ...PARAMS.shot.beta,
      contest: -1.2  // Increase contest penalty
    }
  }
};

// Use in simulation
const shootingProb = shotMakeP(playerRatings, context, experimentalParams);
```

## Parameter Tuning Guide

### Shooting Accuracy Adjustments
```typescript
// Increase overall shooting accuracy
shot.beta.base += 0.1;

// Make contested shots harder
shot.beta.contest -= 0.2;

// Reduce fatigue impact
shot.beta.fatigue += 0.1;
```

### Pace Adjustments
```typescript
// Faster-paced games
fatigue.perAction -= 0.1;  // Less fatigue accumulation
policy.T0 -= 0.1;          // More decisive play

// Slower-paced games  
fatigue.perAction += 0.1;  // More fatigue accumulation
policy.T0 += 0.1;          // More deliberate play
```

### Defensive Impact
```typescript
// Stronger defense
drive.defLat -= 0.1;       // Better lateral defense
drive.defOnBall -= 0.1;    // Better on-ball defense
shot.beta.contest -= 0.1;  // More contest impact

// Weaker defense
drive.defLat += 0.1;
drive.defOnBall += 0.1;
shot.beta.contest += 0.1;
```

## Calibration Process

### Step 1: Set Target Statistics
```typescript
const targets = {
  efg: [0.46, 0.50],     // Desired EFG% range
  pace: [70, 80],        // Desired pace range
  tov: [0.12, 0.16]      // Desired turnover rate
};
```

### Step 2: Run Simulation Battery
```typescript
function calibrateParameters(initialParams: Params, targets: Targets) {
  let currentParams = { ...initialParams };
  
  for (let iteration = 0; iteration < 100; iteration++) {
    const results = runSimulationBatch(currentParams, 1000);
    const adjustments = calculateAdjustments(results, targets);
    currentParams = applyAdjustments(currentParams, adjustments);
    
    if (withinTargetRange(results, targets)) {
      break;
    }
  }
  
  return currentParams;
}
```

### Step 3: Validate Consistency
```typescript
function validateCalibration(params: Params, iterations: number = 10000) {
  const results = runSimulationBatch(params, iterations);
  
  return {
    avgEFG: results.map(r => r.efg).reduce((a, b) => a + b) / results.length,
    avgPace: results.map(r => r.pace).reduce((a, b) => a + b) / results.length,
    avgTOV: results.map(r => r.tov).reduce((a, b) => a + b) / results.length,
    consistency: calculateConsistency(results)
  };
}
```

## Parameter Categories

### Performance Parameters
Control the effectiveness of different basketball skills and actions.

### Behavioral Parameters  
Influence decision-making patterns and player psychology.

### Physical Parameters
Affect fatigue, recovery, and physical interactions.

### Statistical Parameters
Target ranges for validating simulation realism.

## Building

Run `nx build params` to build the library.
