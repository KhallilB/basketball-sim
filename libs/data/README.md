# Basketball Simulation Data Library

Real-world basketball league statistical baselines for accurate simulation and cross-league player comparison.

## Features

- **Real-World Data**: Actual statistics from NBA, NCAA, EuroLeague, CBA, and other major basketball leagues
- **Cross-League Normalization**: Accurate conversion factors for comparing players across different competition levels
- **Player Generation**: Statistical distributions for generating realistic players within league expectations
- **Historical Accuracy**: Based on recent season data (primarily 2023-24) with high-quality sources

## Leagues Covered

### Professional

- **NBA** (Premier Main): 114.2 PPG, 99.2 pace, 114.5 ORtg
- **EuroLeague**: 80.6 PPG, 71.5 pace, 112.8 ORtg
- **China CBA**: 101.3 PPG, 89.5 pace, 113.1 ORtg

### College

- **NCAA Division I**: 75.2 PPG, 67.8 pace, 104.5 ORtg
- **NJCAA Division I (JUCO)**: 83.7 PPG, 78.4 pace, 106.8 ORtg

### High School

- **US High School**: 58.0 PPG, 61.1 pace, 95.0 ORtg

## Usage

```typescript
import { getLeagueBaseline, LEAGUE_BASELINES, NBA_BASELINE } from '@basketball-sim/data';

// Get specific league baseline
const nbaStats = getLeagueBaseline('premier_main');

// Access environment data
console.log(nbaStats.environment.pace); // 99.2
console.log(nbaStats.environment.offensiveRating); // 114.5

// Access statistical distributions
const pointsDistribution = nbaStats.per100Stats.scoring.points;
console.log(pointsDistribution.mean); // 24.5 points per 100 possessions
```

## Data Sources

- NBA.com (official NBA statistics)
- NCAA.com (college basketball data)
- EuroLeague.net (European basketball)
- MaxPreps (high school data)
- Various international basketball sources

## Statistical Accuracy

All baselines include:

- **Environment factors**: Pace, game length, shot clock rules
- **Style factors**: 3PA rate, FTA rate, assist rate, foul rates
- **Statistical distributions**: Mean, standard deviation, percentiles
- **Position factors**: Position-specific multipliers
- **Quality metrics**: Data confidence and sample size information
