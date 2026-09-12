// Section 16. Difficulty stops being a fixed property of the template. A single
// algebraic equation can outweigh four direct operations, so step count alone
// does not decide it.

// RC2-015. Two conceptual corrections, not a threshold nudge.
//
// (1) `conditionCount` was being fed the number of STIMULI in an odd-one-out
//     question — six, always, for every template in the family from easy to
//     hard. It is weighted as a count of CONSTRAINTS, so it added a flat 4.2 to
//     every one of them and carried no information about difficulty at all. That
//     flat term is why ODD_E_SQUARES, an easy template, scored 8.4 and computed
//     as medium, and why the two templates the RC1 audit called misclassified
//     both sat at 8.9.
//
//     What actually varies in that family is how far a solver has to search
//     before the intended rule is isolated, and RC2-007/008/009 already computes
//     it: the intended rule's salience, and how many other approved rules single
//     out a number on the surface. That is `ruleSearchDepth`.
//
// (2) The RC1 audit's other finding was not about the model at all: COMB_H_THREE
//     was DECLARED hard while being one addition and one multiplication. The
//     answer there is to declare it correctly, not to inflate its score.
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
  dependencyDepth: 0.8,
  // How far the solver must search before the intended rule is isolated. One
  // obvious rule and nothing competing is the floor; a low-salience rule with
  // competitors on the surface is the ceiling.
  ruleSearchDepth: 1.4
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

/**
 * RC2-015. The RC1 thresholds were 4.5 and 9.5, and they put the MEDIAN easy
 * question (6.4) in medium and the MEDIAN medium question (9.8) in hard — every
 * band read one step high, which is most of the 47.2% declared/computed
 * disagreement the audit measured.
 *
 * The boundaries are not fitted to maximise agreement; they are placed by a
 * stated rule, so they can be rederived and so drift is visible:
 *
 *   a boundary sits midway between the medians of the two bands it separates.
 *
 * Measured over 4,500 questions after the two conceptual corrections above:
 *
 *   easy   median  6.4      easy/medium boundary = (6.4 + 9.8) / 2 = 8.1
 *   medium median  9.8      medium/hard boundary = (9.8 + 12.8) / 2 = 11.3
 *   hard   median 12.8
 *
 * tools/audit/rc2-015-difficulty.mjs recomputes the medians and reports the
 * boundaries the rule implies, so a later change to the model that moves them
 * shows up instead of being absorbed.
 */
export const BAND_BOUNDARIES = Object.freeze({easyMedium: 8.1, mediumHard: 11.3});

export function bandFor(score) {
  if (score <= BAND_BOUNDARIES.easyMedium) return 'easy';
  if (score <= BAND_BOUNDARIES.mediumHard) return 'medium';
  return 'hard';
}

/**
 * Kept as a hook (Section 16): once percent-correct, median time and a
 * discrimination index exist, they calibrate this without a code change.
 */
export function attachEmpiricalDifficulty(complexity, empirical = null) {
  return {...complexity, empiricalDifficulty: empirical};
}
