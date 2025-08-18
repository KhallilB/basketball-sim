# @basketball-sim/telemetry

Event tracking and analytics system for basketball simulation monitoring and analysis.

## Overview

This library provides comprehensive event logging and analytics capabilities for the basketball simulation engine. It captures detailed information about all game events with their probability calculations, enabling deep analysis and model validation.

## Core Components

### Telemetry Class

Central event collection and analysis system:

```typescript
import { Telemetry } from '@basketball-sim/telemetry';

const telemetry = new Telemetry();

// Log events during simulation
telemetry.push({
  type: 'shot',
  player: 'lebron_james',
  p: 0.65,
  make: true,
  explain: shotExplanation
});

// Analyze results
const summary = telemetry.summary();
console.log(`Shot accuracy: ${summary.makes}/${summary.shots} (${(summary.pAvg * 100).toFixed(1)}% expected)`);
```

## Event Types

### Shot Events
Captures all shooting attempts with detailed context:

```typescript
type ShotEvent = {
  type: 'shot';
  player: string;        // Player ID who took the shot
  p: number;            // Predicted make probability (0-1)
  make: boolean;        // Actual outcome
  explain: Explain;     // Detailed calculation breakdown
  // Additional context
  zone?: 'rim' | 'mid' | 'three';
  contested?: boolean;
  clutch?: boolean;
};
```

### Pass Events
Tracks passing attempts and success rates:

```typescript
type PassEvent = {
  type: 'pass';
  player: string;       // Passer ID
  p: number;           // Completion probability
  ok: boolean;         // Successful completion
  explain: Explain;    // Risk/pressure breakdown
  // Additional context
  target?: string;     // Intended receiver
  risky?: boolean;     // High-risk pass attempt
};
```

### Rebound Events
Records rebounding competitions:

```typescript
type ReboundEvent = {
  type: 'rebound';
  winner: string;      // Player who secured rebound
  offense: boolean;    // Offensive vs defensive rebound
  wSelf: number;      // Winner's rebound weight
  // Additional context
  competitors?: string[];  // Other players involved
  distance?: number;       // Distance from basket
};
```

### Foul Events
Logs all fouling incidents:

```typescript
type FoulEvent = {
  type: 'foul';
  on: string;          // Player who committed foul
  shooting: boolean;   // Shooting foul vs common foul
  // Additional context
  severity?: 'common' | 'flagrant1' | 'flagrant2' | 'technical';
  quarter?: number;
};
```

## Usage Examples

### Real-time Event Logging
```typescript
import { Telemetry } from '@basketball-sim/telemetry';

class EnhancedPossessionEngine {
  private telemetry = new Telemetry();
  
  resolveShot(player: Player, context: ShotContext): ShotOutcome {
    const prediction = shotMakeP(player.ratings, context);
    const actualMake = Math.random() < prediction.p;
    
    // Log the event
    this.telemetry.push({
      type: 'shot',
      player: player.id,
      p: prediction.p,
      make: actualMake,
      explain: prediction,
      zone: context.zone,
      contested: context.contest > 0.5
    });
    
    return { make: actualMake, explanation: prediction };
  }
  
  getAnalytics() {
    return this.telemetry.summary();
  }
}
```

### Model Validation
```typescript
function validateShootingModel(iterations: number = 10000) {
  const telemetry = new Telemetry();
  
  for (let i = 0; i < iterations; i++) {
    const player = generateRandomPlayer();
    const context = generateRandomContext();
    
    const prediction = shotMakeP(player.ratings, context);
    const actualMake = Math.random() < prediction.p;
    
    telemetry.push({
      type: 'shot',
      player: player.id,
      p: prediction.p,
      make: actualMake,
      explain: prediction
    });
  }
  
  const summary = telemetry.summary();
  const calibration = calculateCalibration(telemetry.events);
  
  return {
    expectedAccuracy: summary.pAvg,
    actualAccuracy: summary.makes / summary.shots,
    calibrationError: calibration.meanSquaredError,
    brier: calibration.brierScore
  };
}
```

### Performance Analysis
```typescript
function analyzePlayerPerformance(playerId: string, telemetry: Telemetry) {
  const playerEvents = telemetry.events.filter(e => 
    (e.type === 'shot' || e.type === 'pass') && e.player === playerId
  );
  
  const shots = playerEvents.filter(e => e.type === 'shot');
  const passes = playerEvents.filter(e => e.type === 'pass');
  
  return {
    shooting: {
      attempts: shots.length,
      makes: shots.filter(s => s.make).length,
      expectedMakes: shots.reduce((sum, s) => sum + s.p, 0),
      efficiency: calculateShootingEfficiency(shots),
      clutchFactor: calculateClutchPerformance(shots)
    },
    passing: {
      attempts: passes.length,
      completions: passes.filter(p => p.ok).length,
      expectedCompletions: passes.reduce((sum, p) => sum + p.p, 0),
      riskiness: calculateRiskiness(passes)
    }
  };
}
```

### Game Flow Analysis
```typescript
function analyzeGameMomentum(telemetry: Telemetry) {
  const events = telemetry.events.sort((a, b) => a.timestamp - b.timestamp);
  const momentum = [];
  
  let currentMomentum = 0;
  for (const event of events) {
    switch (event.type) {
      case 'shot':
        currentMomentum += event.make ? 1 : -0.5;
        break;
      case 'pass':
        currentMomentum += event.ok ? 0.2 : -0.3;
        break;
      case 'foul':
        currentMomentum -= 0.4;
        break;
    }
    
    momentum.push({
      time: event.timestamp,
      value: currentMomentum,
      event: event.type
    });
  }
  
  return momentum;
}
```

## Analytics Functions

### Shot Chart Generation
```typescript
function generateShotChart(telemetry: Telemetry, playerId?: string) {
  const shots = telemetry.events
    .filter(e => e.type === 'shot' && (!playerId || e.player === playerId))
    .map(shot => ({
      x: shot.location?.x || 0,
      y: shot.location?.y || 0,
      made: shot.make,
      probability: shot.p,
      zone: shot.zone
    }));
    
  return {
    attempts: shots.length,
    makes: shots.filter(s => s.made).length,
    zones: groupBy(shots, 'zone'),
    efficiency: calculateSpatialEfficiency(shots)
  };
}
```

### Model Calibration Analysis
```typescript
function analyzeModelCalibration(telemetry: Telemetry) {
  const predictions = telemetry.events
    .filter(e => e.type === 'shot')
    .map(e => ({ predicted: e.p, actual: e.make ? 1 : 0 }));
    
  // Bin predictions by probability ranges
  const bins = createProbabilityBins(predictions, 10);
  
  return bins.map(bin => ({
    range: bin.range,
    count: bin.predictions.length,
    expectedRate: bin.predictions.reduce((sum, p) => sum + p.predicted, 0) / bin.predictions.length,
    actualRate: bin.predictions.reduce((sum, p) => sum + p.actual, 0) / bin.predictions.length,
    calibrationError: Math.abs(bin.expectedRate - bin.actualRate)
  }));
}
```

## Export & Visualization

### CSV Export
```typescript
function exportToCSV(telemetry: Telemetry): string {
  const headers = ['timestamp', 'type', 'player', 'probability', 'outcome', 'details'];
  const rows = telemetry.events.map(event => [
    event.timestamp,
    event.type,
    event.player || '',
    event.p || '',
    getOutcome(event),
    JSON.stringify(event.explain)
  ]);
  
  return [headers, ...rows].map(row => row.join(',')).join('\n');
}
```

### Real-time Dashboard Data
```typescript
function getDashboardData(telemetry: Telemetry) {
  const recent = telemetry.events.slice(-100);  // Last 100 events
  
  return {
    liveStats: telemetry.summary(),
    recentEvents: recent,
    trends: calculateTrends(recent),
    alerts: detectAnomalies(recent),
    calibration: analyzeModelCalibration(telemetry)
  };
}
```

## Integration Example

```typescript
class MonitoredGame {
  private telemetry = new Telemetry();
  private engine = new PossessionEngine();
  
  runPossession(teams: [Team, Team], state: PossessionState): PossessionState {
    // Run possession with event monitoring
    const result = this.engine.run(teams[0], teams[1], state);
    
    // Extract and log events
    this.extractEvents(result).forEach(event => {
      this.telemetry.push(event);
    });
    
    return result;
  }
  
  getGameAnalytics() {
    return {
      summary: this.telemetry.summary(),
      performance: this.analyzeTeamPerformance(),
      calibration: this.validateModels(),
      momentum: this.analyzeMomentum()
    };
  }
}
```

## Building

Run `nx build telemetry` to build the library.
