# @basketball-sim/types

TypeScript type definitions for the basketball simulation engine.

## Overview

This library provides comprehensive type definitions for all simulation entities including players, teams, game state, and outcomes. All types are designed to be type-safe, extensible, and self-documenting.

## Core Types

### Player & Team Types

#### `Player`

Complete player definition with ratings and tendencies:

```typescript
type Player = {
  id: Id;
  name: string;
  ratings: Ratings;
  tendencies: Tendencies;
  badges?: Record<string, { tier: 1 | 2 | 3 }>;
};
```

#### `Ratings`

21 basketball skill ratings (0-100 scale):

```typescript
type Ratings = {
  // Shooting
  three: number; // 3-point shooting
  mid: number; // Mid-range shooting
  finishing: number; // Finishing at rim
  ft: number; // Free throw shooting

  // Ball Handling
  pass: number; // Passing ability
  handle: number; // Dribbling/ball security

  // Post Game
  post: number; // Post moves/footwork
  roll: number; // Pick and roll effectiveness
  screen: number; // Screen setting

  // Defense
  onBallDef: number; // On-ball defense
  lateral: number; // Lateral quickness
  rimProt: number; // Rim protection/shot blocking
  steal: number; // Steal/anticipation

  // Athleticism
  speed: number; // Speed/acceleration
  strength: number; // Physical strength
  vertical: number; // Vertical leap
  rebound: number; // Rebounding ability

  // Mental
  iq: number; // Basketball IQ
  discipline: number; // Foul discipline
  consistency: number; // Performance consistency
  clutch: number; // Clutch performance

  // Physical
  stamina: number; // Endurance
  heightIn: number; // Height in inches
  wingspanIn: number; // Wingspan in inches
};
```

#### `Tendencies`

Behavioral probabilities for decision-making:

```typescript
type Tendencies = {
  withBall: [number, number, number, number, number, number, number];
  // [drive, pullup, catchShoot, pnrAttack, pnrPass, post, reset]

  offBall: [number, number, number, number, number];
  // [spot, relocate, cut, screen, handoff]

  shotZone: [number, number, number]; // [rim, mid, three]
  threeStyle: [number, number]; // [catch, offDribble]

  passRisk: number; // 0-100, willingness to make risky passes
  help: number; // 0-100, help defense tendency
  gambleSteal: number; // 0-100, steal attempt frequency
  crashOreb: number; // 0-100, offensive rebound crashing
};
```

### Game State Types

#### `PossessionState`

Complete game state for a single possession:

```typescript
type PossessionState = {
  gameId: Id;
  poss: number; // Possession number
  offense: Id; // Offensive team ID
  defense: Id; // Defensive team ID
  ball: Id; // Player ID with ball
  clock: Clock; // Game time
  shotClock: number; // Shot clock seconds
  fatigue: Record<Id, number>; // Player fatigue levels
  score: { off: number; def: number }; // Score from offense perspective
  seed: number; // RNG seed for determinism
};
```

#### `Clock`

Game timing information:

```typescript
type Clock = {
  quarter: 1 | 2 | 3 | 4;
  sec: number; // Seconds remaining in quarter
};
```

### Action & Outcome Types

#### `Action`

Available basketball actions:

```typescript
const Action = {
  Drive: 'drive', // Drive to basket
  Pullup: 'pullup', // Pull-up jump shot
  CatchShoot: 'catchShoot', // Catch and shoot
  PnrAttack: 'pnrAttack', // Pick and roll attack
  PnrPass: 'pnrPass', // Pick and roll pass
  Post: 'post', // Post-up play
  Reset: 'reset' // Reset possession
};
```

#### Outcome Types

Detailed results for each action type:

```typescript
type OutcomeShot = {
  kind: 'shot';
  make: boolean;
  fouled: boolean;
  three: boolean;
  explain: Explain;
};

type OutcomePass = {
  kind: 'pass';
  complete: boolean;
  turnover: boolean;
  explain: Explain;
};

type OutcomeDrive = {
  kind: 'drive';
  blowby: boolean;
  foul: boolean;
  explain: Explain;
};
```

### Explanation System

#### `Explain`

Provides transparency into probability calculations:

```typescript
type Explain = {
  terms: ExplainTerm[]; // Individual calculation components
  score: number; // Final linear score
  p: number; // Resulting probability
  notes?: string[]; // Additional context
};

type ExplainTerm = {
  label: string; // Human-readable description
  value: number; // Numerical contribution
};
```

## Usage Examples

### Creating a Player

```typescript
import { Player, Ratings, Tendencies } from '@basketball-sim/types';

const player: Player = {
  id: 'lebron_james',
  name: 'LeBron James',
  ratings: {
    three: 82,
    mid: 78,
    finishing: 95
    // ... other ratings
  },
  tendencies: {
    withBall: [0.25, 0.15, 0.2, 0.2, 0.15, 0.03, 0.02]
    // ... other tendencies
  }
};
```

### Type Guards

```typescript
function isShootingOutcome(outcome: any): outcome is OutcomeShot {
  return outcome.kind === 'shot';
}

if (isShootingOutcome(result)) {
  console.log(`Shot ${result.make ? 'made' : 'missed'}`);
}
```

## Design Principles

- **Type Safety**: Prevents runtime errors through compile-time checking
- **Extensibility**: Easy to add new ratings, tendencies, or outcome types
- **Self-Documentation**: Types serve as inline documentation
- **Explainability**: All calculations include breakdown information

## Building

Run `nx build types` to build the library.
