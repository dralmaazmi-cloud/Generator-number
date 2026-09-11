// Section 16. Difficulty stops being a fixed property of the template. A single
// algebraic equation can outweigh four direct operations, so step count alone
// does not decide it.

export const COMPLEXITY_WEIGHTS = Object.freeze({
  reasoningTransformations: 1.0,
  conceptCount: 1.2,
  reverseReasoning: 1.8,
  equationSolving: 2.2,
  graphDepth: 0.9,
  stageCount: 1.1,
  arithmeticBurden: 0.5,
  conditionCount: 0.7,
  unitConversion: 1.0,
  dependencyDepth: 0.8
});

const FACTORS = Object.keys(COMPLEXITY_WEIGHTS);

/**
 * @param {object} f factor counts; missing factors count as zero
 * @returns {{score:number, band:'easy'|'medium'|'hard', factors:object}}
 */
export function computeComplexity(f = {}) {
  let score = 0;
  const factors = {};
  for (const key of FACTORS) {
    const v = Number(f[key] || 0);
    factors[key] = v;
    score += v * COMPLEXITY_WEIGHTS[key];
  }
  score = Math.round(score * 100) / 100;
  return {score, band: bandFor(score), factors};
}

export function bandFor(score) {
  if (score <= 4.5) return 'easy';
  if (score <= 9.5) return 'medium';
  return 'hard';
}

/**
 * Kept as a hook (Section 16): once percent-correct, median time and a
 * discrimination index exist, they calibrate this without a code change.
 */
export function attachEmpiricalDifficulty(complexity, empirical = null) {
  return {...complexity, empiricalDifficulty: empirical};
}
