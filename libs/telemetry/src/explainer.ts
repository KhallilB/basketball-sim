import type { Explain, ExplainTerm } from '@basketball-sim/types';

// RTTB Telemetry System - Explainable AI for basketball decisions
// Every model exposes explain(inputs) → { terms, score, p, activeBadges, traitNudges }

export interface ExplainableResult {
  terms: ExplainTerm[];
  score: number;
  p: number;
  activeBadges?: string[];
  traitNudges?: string[];
  notes?: string[];
}

/**
 * Create an explainable result with detailed breakdown
 */
export function createExplain(
  terms: ExplainTerm[],
  score: number,
  activeBadges: string[] = [],
  traitNudges: string[] = [],
  notes: string[] = []
): ExplainableResult {
  const p = 1 / (1 + Math.exp(-score)); // Convert score to probability
  
  return {
    terms,
    score,
    p,
    activeBadges,
    traitNudges,
    notes
  };
}

/**
 * Add a term to the explanation
 */
export function addTerm(label: string, value: number): ExplainTerm {
  return { label, value };
}

/**
 * Create explanation for shot model
 */
export function explainShot(
  ratingZ: number,
  Q: number,
  contest: number,
  fatigue: number,
  clutch: number,
  badgeMods: number,
  noise: number,
  activeBadges: string[] = [],
  traitNudges: string[] = []
): ExplainableResult {
  const terms: ExplainTerm[] = [
    addTerm('Rating (z-score)', ratingZ),
    addTerm('Shot Quality (Q)', 0.7 * Q),
    addTerm('Contest', -0.9 * contest),
    addTerm('Fatigue', -0.35 * fatigue),
    addTerm('Clutch', 0.2 * clutch),
    addTerm('Badge Mods', badgeMods),
    addTerm('Consistency Noise', noise)
  ];

  const score = ratingZ + 0.7 * Q - 0.9 * contest - 0.35 * fatigue + 0.2 * clutch + badgeMods + noise;
  
  const notes: string[] = [];
  if (Q > 1.5) notes.push('Wide open shot');
  if (contest > 0.8) notes.push('Heavily contested');
  if (clutch > 0.5) notes.push('Clutch situation boost');
  if (activeBadges.length > 0) notes.push(`Active badges: ${activeBadges.join(', ')}`);

  return createExplain(terms, score, activeBadges, traitNudges, notes);
}

/**
 * Create explanation for pass model
 */
export function explainPass(
  passZ: number,
  iqZ: number,
  laneRisk: number,
  pressure: number,
  badgeMods: number,
  activeBadges: string[] = [],
  traitNudges: string[] = []
): ExplainableResult {
  const terms: ExplainTerm[] = [
    addTerm('Pass Rating (z-score)', passZ),
    addTerm('Lane Risk', -0.8 * laneRisk),
    addTerm('Pressure', -0.5 * pressure),
    addTerm('IQ Bonus', 0.3 * iqZ),
    addTerm('Badge Mods', badgeMods)
  ];

  const score = passZ - 0.8 * laneRisk - 0.5 * pressure + 0.3 * iqZ + badgeMods;
  
  const notes: string[] = [];
  if (laneRisk > 1.0) notes.push('Risky pass through traffic');
  if (pressure > 0.8) notes.push('Under heavy pressure');
  if (iqZ > 1.0) notes.push('High IQ player sees the play');
  if (activeBadges.length > 0) notes.push(`Active badges: ${activeBadges.join(', ')}`);

  return createExplain(terms, score, activeBadges, traitNudges, notes);
}

/**
 * Create explanation for drive model
 */
export function explainDrive(
  speedAdvantage: number,
  handleAdvantage: number,
  lane: number,
  angle: number,
  badgeMods: number,
  activeBadges: string[] = [],
  traitNudges: string[] = []
): ExplainableResult {
  const terms: ExplainTerm[] = [
    addTerm('Base Drive', -0.2),
    addTerm('Speed vs Lateral', 0.9 * speedAdvantage),
    addTerm('Handle vs Defense', 0.6 * handleAdvantage),
    addTerm('Lane Quality', 0.5 * lane),
    addTerm('Drive Angle', 0.4 * angle),
    addTerm('Badge Mods', badgeMods)
  ];

  const score = -0.2 + 0.9 * speedAdvantage + 0.6 * handleAdvantage + 0.5 * lane + 0.4 * angle + badgeMods;
  
  const notes: string[] = [];
  if (speedAdvantage > 1.0) notes.push('Significant speed advantage');
  if (handleAdvantage < -0.5) notes.push('Defender has handle advantage');
  if (lane > 0.8) notes.push('Open driving lane');
  if (angle > 0.8) notes.push('Good drive angle to basket');
  if (activeBadges.length > 0) notes.push(`Active badges: ${activeBadges.join(', ')}`);

  return createExplain(terms, score, activeBadges, traitNudges, notes);
}

/**
 * Create explanation for rebound model
 */
export function explainRebound(
  reboundZ: number,
  heightFt: number,
  strengthZ: number,
  posAdv: number,
  distFt: number,
  badgeMods: number,
  activeBadges: string[] = [],
  traitNudges: string[] = []
): ExplainableResult {
  const terms: ExplainTerm[] = [
    addTerm('Rebound Rating', 0.9 * reboundZ),
    addTerm('Height Advantage', 0.5 * heightFt),
    addTerm('Strength', 0.4 * strengthZ),
    addTerm('Position Advantage', 0.6 * posAdv),
    addTerm('Distance Penalty', -0.3 * distFt),
    addTerm('Badge Mods', badgeMods)
  ];

  const exponent = 0.9 * reboundZ + 0.5 * heightFt + 0.4 * strengthZ + 0.6 * posAdv - 0.3 * distFt + badgeMods;
  const weight = Math.exp(exponent);
  
  const notes: string[] = [];
  if (posAdv > 0.5) notes.push('Good boxing out position');
  if (posAdv < -0.5) notes.push('Being boxed out');
  if (distFt > 8) notes.push('Far from rebound location');
  if (heightFt > 6.5) notes.push('Height advantage');
  if (activeBadges.length > 0) notes.push(`Active badges: ${activeBadges.join(', ')}`);

  return {
    terms,
    score: exponent,
    p: weight, // For rebounding, we use the raw weight as the "probability"
    activeBadges,
    traitNudges,
    notes
  };
}

/**
 * Create explanation for action selection (policy)
 */
export function explainActionSelection(
  epvScores: number[],
  tendencyBiases: number[],
  coachBiases: number[],
  badgeBiases: number[],
  traitBiases: number[],
  actionNames: string[],
  temperature: number,
  activeBadges: string[] = [],
  traitNudges: string[] = []
): ExplainableResult {
  const totalScores = epvScores.map((epv, i) => 
    epv + tendencyBiases[i] + coachBiases[i] + badgeBiases[i] + traitBiases[i]
  );
  
  const terms: ExplainTerm[] = [];
  
  for (let i = 0; i < actionNames.length; i++) {
    terms.push(addTerm(`${actionNames[i]} EPV`, epvScores[i]));
    terms.push(addTerm(`${actionNames[i]} Tendency`, tendencyBiases[i]));
    terms.push(addTerm(`${actionNames[i]} Coach`, coachBiases[i]));
    if (badgeBiases[i] !== 0) terms.push(addTerm(`${actionNames[i]} Badge`, badgeBiases[i]));
    if (traitBiases[i] !== 0) terms.push(addTerm(`${actionNames[i]} Trait`, traitBiases[i]));
  }
  
  // Apply softmax with temperature
  const maxScore = Math.max(...totalScores);
  const expScores = totalScores.map(s => Math.exp((s - maxScore) / temperature));
  const sumExp = expScores.reduce((a, b) => a + b, 0);
  const probabilities = expScores.map(e => e / sumExp);
  
  const selectedIndex = probabilities.indexOf(Math.max(...probabilities));
  
  const notes: string[] = [];
  notes.push(`Selected: ${actionNames[selectedIndex]} (${(probabilities[selectedIndex] * 100).toFixed(1)}%)`);
  if (temperature > 1.5) notes.push('High temperature - more random selection');
  if (temperature < 0.8) notes.push('Low temperature - more deterministic selection');
  if (activeBadges.length > 0) notes.push(`Active badges: ${activeBadges.join(', ')}`);
  
  return createExplain(terms, totalScores[selectedIndex], activeBadges, traitNudges, notes);
}

/**
 * Format explanation for display
 */
export function formatExplanation(explain: ExplainableResult): string {
  let output = `Score: ${explain.score.toFixed(3)} → Probability: ${(explain.p * 100).toFixed(1)}%\n`;
  
  output += '\nBreakdown:\n';
  for (const term of explain.terms) {
    const sign = term.value >= 0 ? '+' : '';
    output += `  ${term.label}: ${sign}${term.value.toFixed(3)}\n`;
  }
  
  if (explain.activeBadges && explain.activeBadges.length > 0) {
    output += `\nActive Badges: ${explain.activeBadges.join(', ')}\n`;
  }
  
  if (explain.traitNudges && explain.traitNudges.length > 0) {
    output += `\nTrait Effects: ${explain.traitNudges.join(', ')}\n`;
  }
  
  if (explain.notes && explain.notes.length > 0) {
    output += `\nNotes:\n`;
    for (const note of explain.notes) {
      output += `  • ${note}\n`;
    }
  }
  
  return output;
}

/**
 * Log explanation to console (for debugging)
 */
export function logExplanation(context: string, explain: ExplainableResult): void {
  console.log(`\n=== ${context} ===`);
  console.log(formatExplanation(explain));
}

/**
 * Create a simple explanation with just score and probability
 */
export function simpleExplain(score: number, notes: string[] = []): ExplainableResult {
  return createExplain(
    [addTerm('Total Score', score)],
    score,
    [],
    [],
    notes
  );
}
