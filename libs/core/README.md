# @basketball-sim/core

The core simulation engine that orchestrates basketball possession-by-possession gameplay.

## Overview

This library contains the `PossessionEngine` class which drives the main game simulation loop. It handles:

- **Possession Flow**: Managing the sequence of actions within a single possession
- **Action Resolution**: Determining outcomes for drives, shots, passes, and rebounds
- **Game State Management**: Tracking score, time, fatigue, and possession changes
- **Decision Making**: Integrating with the policy system to choose realistic actions

## Key Components

### PossessionEngine

The main engine class that simulates individual possessions:

```typescript
const engine = new PossessionEngine();
const result = engine.run(offensiveTeam, defensiveTeam, gameState);
```

**Core Loop:**

1. Choose action based on player tendencies and game situation
2. Resolve action using mathematical models
3. Update fatigue and game state
4. Advance clocks and determine possession continuation

### Action Types

- `drive`: Attempt to blow by defender for easier shot
- `pullup`: Mid-range jump shot off the dribble
- `catchShoot`: Spot-up three-pointer
- `pnrPass`: Pick and roll pass to teammate
- `pnrAttack`: Pick and roll drive to basket
- `post`: Post-up play (fallback to pass currently)
- `reset`: Move ball around perimeter

## Current Limitations

- **No defensive assignments**: Uses first defender for all matchups
- **Simplified positioning**: No court coordinates or spacing
- **Basic rebounding**: Only 2-player contests
- **Missing scenarios**: No fast breaks, out-of-bounds, timeouts

## Usage Example

```typescript
import { PossessionEngine } from '@basketball-sim/core';
import { Team, PossessionState } from '@basketball-sim/types';

const engine = new PossessionEngine();
let state: PossessionState = {
  gameId: 'G1',
  poss: 1,
  offense: teamA.id,
  defense: teamB.id,
  ball: teamA.players[0].id,
  clock: { quarter: 1, sec: 2880 },
  shotClock: 24,
  fatigue: {},
  score: { off: 0, def: 0 },
  seed: 12345
};

state = engine.run(teamA, teamB, state);
```

## Building

Run `nx build core` to build the library.
