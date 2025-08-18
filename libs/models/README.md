# @basketball-sim/models

Basketball-specific mathematical models for calculating probabilities and outcomes during gameplay.

## Overview

This library contains the core mathematical models that power the simulation engine. Each model takes player ratings and contextual factors to calculate probabilities for basketball events like shots, drives, passes, rebounds, and fouls.

## Models

### Shot Models

#### `shotMakeP(ratings: Ratings, context: ShotContext): Explain`
Calculates shooting probability based on multiple factors:

```typescript
import { shotMakeP } from '@basketball-sim/models';

const result = shotMakeP(playerRatings, {
  Q: 1.0,           // Shot quality (0-1)
  contest: 0.3,     // Defensive contest level (0-1)
  fatigue: 0.2,     // Player fatigue (0-1)
  clutch: 0.0,      // Clutch situation modifier
  relMod: 0.2,      // Release modifier
  zone: 'three'     // Shot zone: 'rim' | 'mid' | 'three'
});

console.log(`Shooting probability: ${(result.p * 100).toFixed(1)}%`);
```

**Factors:**
- **Skill Component**: Uses appropriate rating (three/mid/finishing)
- **Shot Quality**: Open shots vs contested shots
- **Contest Level**: Defensive pressure impact
- **Fatigue**: Decreased accuracy when tired
- **Clutch Factor**: Performance in critical moments
- **Release Modifier**: Shot difficulty/timing

### Drive Models

#### `driveBlowbyP(offense: Ratings, defense: Ratings, lane: number, angle: number): Explain`
Calculates probability of successfully beating defender on drives:

```typescript
import { driveBlowbyP } from '@basketball-sim/models';

const result = driveBlowbyP(offenseRatings, defenseRatings, 0.4, 0.1);
console.log(`Blowby probability: ${(result.p * 100).toFixed(1)}%`);
```

**Factors:**
- **Speed Differential**: Offensive speed vs defensive lateral quickness
- **Handle Gap**: Ball handling vs on-ball defense
- **Lane Space**: Available driving lanes (0-1)
- **Drive Angle**: Optimal vs difficult angles

### Passing Models

#### `passCompleteP(ratings: Ratings, laneRisk: number, pressure: number): Explain`
Calculates pass completion probability:

```typescript
import { passCompleteP } from '@basketball-sim/models';

const result = passCompleteP(playerRatings, 0.6, 0.4);
console.log(`Pass completion: ${(result.p * 100).toFixed(1)}%`);
```

**Factors:**
- **Passing Skill**: Player's passing ability
- **Basketball IQ**: Decision-making quality
- **Lane Risk**: Traffic in passing lanes
- **Defensive Pressure**: Pressure on passer

### Rebounding Models

#### `reboundWeight(ratings: Ratings, positionAdvantage: number, distance: number): {w: number, explain: Explain}`
Calculates rebounding weight for competition resolution:

```typescript
import { reboundWeight } from '@basketball-sim/models';

const {w, explain} = reboundWeight(playerRatings, 0.6, 8.0);
console.log(`Rebound weight: ${w.toFixed(2)}`);
```

**Factors:**
- **Rebounding Skill**: Player's rebounding rating
- **Height Advantage**: Physical height in feet
- **Strength**: Ability to box out and secure ball
- **Position**: Closer to basket = advantage
- **Distance**: Distance from rebound location

### Fouling Models

#### `shootingFoulP(offense: Ratings, defense: Ratings, contact: number, contest: number): Explain`
Calculates shooting foul probability:

```typescript
import { shootingFoulP } from '@basketball-sim/models';

const result = shootingFoulP(offenseRatings, defenseRatings, 0.7, 0.5);
console.log(`Foul probability: ${(result.p * 100).toFixed(1)}%`);
```

**Factors:**
- **Contact Level**: Amount of physical contact
- **Offensive Finishing**: Ability to draw fouls
- **Defensive Discipline**: Fouling tendency
- **Contest Level**: Aggressive defense increases foul risk

## Model Architecture

### Explainable Calculations
All models return `Explain` objects that break down the calculation:

```typescript
type Explain = {
  terms: ExplainTerm[];  // Each factor's contribution
  score: number;         // Final linear score
  p: number;            // Resulting probability
  notes?: string[];     // Additional context
};
```

### Mathematical Foundation
Models use a consistent approach:
1. **Z-score normalization** of player ratings
2. **Linear combination** of factors with trained coefficients
3. **Logistic transformation** to convert to probabilities
4. **Noise injection** based on consistency ratings

### Parameter Integration
All model coefficients are centralized in `@basketball-sim/params`, allowing easy tuning without code changes.

## Usage Examples

### Complete Shot Evaluation
```typescript
import { shotMakeP, shootingFoulP } from '@basketball-sim/models';

function evaluateShot(shooter: Ratings, defender: Ratings, context: ShotContext) {
  const makeResult = shotMakeP(shooter, context);
  const foulResult = shootingFoulP(shooter, defender, context.contest, 0.4);
  
  return {
    makeProb: makeResult.p,
    foulProb: foulResult.p,
    expectedPoints: makeResult.p * (context.zone === 'three' ? 3 : 2) + 
                   foulResult.p * 1.4, // Assume 70% FT shooter
    explanation: {
      make: makeResult.terms,
      foul: foulResult.terms
    }
  };
}
```

### Rebound Competition
```typescript
import { reboundWeight } from '@basketball-sim/models';

function resolveRebound(players: Player[], positions: number[]) {
  const weights = players.map((player, i) => 
    reboundWeight(player.ratings, positions[i], 5.0)
  );
  
  const totalWeight = weights.reduce((sum, w) => sum + w.w, 0);
  const random = Math.random() * totalWeight;
  
  let cumulative = 0;
  for (let i = 0; i < weights.length; i++) {
    cumulative += weights[i].w;
    if (random < cumulative) {
      return { winner: players[i], explanation: weights[i].explain };
    }
  }
}
```

## Model Validation

Models are calibrated to produce realistic NBA-level statistics:
- **EFG%**: 44-48% range
- **Turnover Rate**: 13-19% range  
- **Pace**: 65-75 possessions per game
- **Free Throw Rate**: Contextually appropriate

## Building

Run `nx build models` to build the library.
