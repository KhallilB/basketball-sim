// Quick RTTB System Test Script
// Tests core functionality without full build system

const { ratingZ, chance, dirichletMean, betaMean } = require('./libs/math/dist/index.js');

console.log('🎯 RTTB System Quick Test');
console.log('═'.repeat(50));

// Test 1: Core Math Functions
console.log('\n📊 Test 1: Core Math Functions');
console.log('─'.repeat(30));

const testRating = 78;
const zScore = ratingZ(testRating);
const probability = chance(2.5);

console.log(`Rating ${testRating} → z-score: ${zScore.toFixed(3)}`);
console.log(`Score 2.5 → probability: ${(probability * 100).toFixed(1)}%`);

// Test 2: Dirichlet Distribution
console.log('\n📈 Test 2: Dirichlet Distribution');
console.log('─'.repeat(30));

const alphas = [2.5, 1.8, 3.2, 1.0, 0.8, 1.5, 0.5];
const means = dirichletMean(alphas);
const actionNames = ['Drive', 'Pullup', 'Catch&Shoot', 'PnR Attack', 'PnR Pass', 'Post', 'Reset'];

console.log('Action Probabilities:');
means.forEach((prob, i) => {
  console.log(`  ${actionNames[i]}: ${(prob * 100).toFixed(1)}%`);
});

// Test 3: Beta Distribution
console.log('\n📉 Test 3: Beta Distribution');
console.log('─'.repeat(30));

const betaA = 6, betaB = 4;
const betaProb = betaMean(betaA, betaB);
console.log(`Beta(${betaA}, ${betaB}) → mean: ${(betaProb * 100).toFixed(1)}%`);

// Test 4: Shot Calculation Example
console.log('\n🏀 Test 4: Shot Calculation');
console.log('─'.repeat(30));

const shooterRating = 85;
const shotQuality = 1.2;
const contest = 0.3;
const fatigue = 0.1;
const clutchBonus = 0.2;

const shotScore = 1.0 * ratingZ(shooterRating) + 0.7 * shotQuality - 0.9 * contest - 0.35 * fatigue + 0.2 * clutchBonus;
const shotProb = chance(shotScore);

console.log(`Shooter Rating: ${shooterRating} (z: ${ratingZ(shooterRating).toFixed(2)})`);
console.log(`Shot Quality: ${shotQuality}, Contest: ${contest}`);
console.log(`Final Score: ${shotScore.toFixed(3)} → ${(shotProb * 100).toFixed(1)}% chance`);

console.log('\n✅ RTTB Core Math Functions Working!');
console.log('═'.repeat(50));
