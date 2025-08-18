# @basketball-sim/policy

Intelligent decision-making system for basketball action selection combining expected value and player tendencies.

## Overview

This library implements sophisticated action selection algorithms that combine model-based expected value calculations with player-specific tendencies and psychological factors. It bridges the gap between pure mathematical optimization and realistic human basketball behavior.

## Core Function

### `chooseAction(player, epv, bias, fatigue): {action, probs, score}`

The main function for selecting basketball actions using a temperature-scaled softmax approach:

```typescript
import { chooseAction } from '@basketball-sim/policy';

const result = chooseAction(
  player,           // Player with ratings and tendencies
  {                 // Expected Point Value for each action
    drive: 0.5,
    pullup: 0.2,
    catchShoot: 0.3,
    pnrAttack: 0.35,
    pnrPass: 0.15,
    post: 0.1,
    reset: 0.05
  },
  {                 // Bias from tendencies/coaching
    drive: 0.1,
    pullup: -0.1,
    catchShoot: 0.2,
    // ...
  },
  25               // Fatigue level (0-100)
);

console.log(`Chosen action: ${result.action}`);
console.log(`Probabilities:`, result.probs);
```

## Algorithm Components

### 1. Expected Value Processing
EPV values are z-score normalized to prevent one dominant action from overwhelming others:
```typescript
const mu = mean(epvValues);
const sd = standardDeviation(epvValues);
const normalizedEPV = epvValues.map(v => (v - mu) / sd);
```

### 2. Rationality Blending
Combines rational (EPV-based) and behavioral (bias-based) components:
```typescript
const score = alpha * normalizedEPV + (1 - alpha) * bias;
// alpha = 0.7 (70% rational, 30% behavioral)
```

### 3. Temperature Scaling
Dynamic temperature affects decision randomness based on player attributes:

```typescript
const baseTemp = 1.0;
const iqAdjustment = 0.009 * (player.iq - 50);      // Higher IQ = lower temp
const disciplineAdj = 0.008 * (player.discipline - 50); // More disciplined = lower temp  
const fatigueAdj = 0.3 * (fatigue / 100);          // Fatigue increases temp

const temperature = clamp(
  baseTemp * (1 + fatigueAdj) / (1 + iqAdjustment + disciplineAdj),
  0.55,  // Minimum (very decisive)
  1.2    // Maximum (very random)
);
```

### 4. Softmax Selection
Converts scores to probabilities and samples an action:
```typescript
const probabilities = softmax(scores, temperature);
const action = sampleFromDistribution(probabilities);
```

## Psychological Modeling

### Player Intelligence Effects
- **High IQ players** (70+): More consistent, optimal decisions
- **Low IQ players** (30-): More erratic, suboptimal choices
- **Average IQ** (50): Balanced decision-making

### Discipline Impact
- **Disciplined players**: Stick to game plan, resist bad shots
- **Undisciplined players**: More likely to take contested shots

### Fatigue Effects
- **Fresh players**: Sharp decision-making, stick to strengths
- **Tired players**: Poor shot selection, increased turnovers
- **Exhausted players**: Simplified, conservative decisions

## Usage Examples

### Situational Action Selection
```typescript
function getActionInSituation(player: Player, situation: GameSituation) {
  // Calculate EPV based on situation
  const epv = calculateEPV(player, situation);
  
  // Apply situational bias
  let bias = player.tendencies.withBall;
  if (situation.shotClock < 5) {
    bias.reset = -2.0;  // Avoid reset with low shot clock
    bias.catchShoot += 0.5;  // Prefer quick shots
  }
  
  return chooseAction(player, epv, bias, situation.fatigue);
}
```

### Coaching Influence
```typescript
function applyCoachingBias(baseBias: Record<Action, number>, style: CoachingStyle) {
  const bias = { ...baseBias };
  
  switch (style) {
    case 'three-heavy':
      bias.catchShoot += 0.3;
      bias.pullup -= 0.2;
      break;
    case 'inside-out':
      bias.drive += 0.2;
      bias.post += 0.1;
      break;
    case 'ball-movement':
      bias.pnrPass += 0.2;
      bias.reset += 0.1;
      break;
  }
  
  return bias;
}
```

### Performance Analysis
```typescript
function analyzeDecisionQuality(decisions: ActionResult[]) {
  const avgEPV = decisions.reduce((sum, d) => sum + d.epv[d.action], 0) / decisions.length;
  const optimalEPV = decisions.reduce((sum, d) => sum + Math.max(...Object.values(d.epv)), 0) / decisions.length;
  
  return {
    efficiency: avgEPV / optimalEPV,  // How close to optimal (0-1)
    consistency: 1 - standardDeviation(decisions.map(d => d.temperature)),
    adaptability: calculateAdaptabilityScore(decisions)
  };
}
```

## Model Validation

The policy system is calibrated to produce realistic basketball decision patterns:

- **Star players**: 75-85% decision efficiency
- **Role players**: 60-75% efficiency  
- **Bench players**: 45-65% efficiency
- **Fatigue impact**: 10-20% efficiency drop when exhausted

## Building

Run `nx build policy` to build the library.
