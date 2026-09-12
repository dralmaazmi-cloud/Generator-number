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
 * RC2.1-2. `dependencyDepth` was a real factor filled in by hand, and only 22 of
 * 107 templates filled it in. Templates whose author happened to declare it
 * scored higher than equally chained templates whose author left it at zero, and
 * that unevenness — not the band boundaries — is what produced misclassification
 * in BOTH directions: PL_H_CHAIN and PCT_H_CHAIN_VALUE are chains of dependent
 * steps that declared 0 and computed as medium while declared hard, and the
 * relational templates that did declare it computed hard while declared medium.
 *
 * So it is derived instead of declared, uniformly, from the solution the
 * template itself publishes. A step depends on an earlier one when it consumes
 * that step's result as an operand; the depth is the longest such chain. That is
 * a property of the reasoning, it is the same measurement for every family, and
 * it cannot drift out of step with the steps a learner is actually shown.
 *
 * Steps are rendered Arabic prose containing arithmetic, so the parse is
 * deliberately conservative: a step contributes only when it states a result
 * after a final `=`, and a dependency counts only on an exact numeric match.
 * Where nothing parses, the derivation returns null and the declared value
 * stands, so a template that reasons without arithmetic is not silently zeroed.
 */
const NUM = /-?\d+(?:\.\d+)?/g;

export function deriveDependencyDepth(steps) {
  if (!Array.isArray(steps) || !steps.length) return null;
  const parsed = [];
  for (const raw of steps) {
    const text = String(raw ?? '');
    const at = text.lastIndexOf('=');
    if (at < 0) { parsed.push(null); continue; }
    const result = (text.slice(at + 1).match(NUM) ?? [])[0];
    const operands = text.slice(0, at).match(NUM) ?? [];
    if (result === undefined) { parsed.push(null); continue; }
    parsed.push({result, operands: new Set(operands)});
  }
  if (!parsed.some(Boolean)) return null;

  // Longest chain of "this step consumes an earlier step's result".
  const depth = parsed.map(() => 0);
  let best = 0;
  for (let j = 0; j < parsed.length; j++) {
    const step = parsed[j];
    if (!step) continue;
    for (let i = 0; i < j; i++) {
      const earlier = parsed[i];
      if (!earlier) continue;
      // A step that merely restates a given is not a dependency; it has to
      // consume the earlier RESULT.
      if (step.operands.has(earlier.result)) depth[j] = Math.max(depth[j], depth[i] + 1);
    }
    best = Math.max(best, depth[j]);
  }
  return best;
}

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
/**
 * RC2.1-2. The rule is unchanged; the model it is applied to moved.
 * `dependencyDepth` is now derived from the published solution for every
 * template instead of being declared by 22 of 107, which raised scores wherever
 * a template reasons in a chain. Reapplying the same rule to the new medians:
 *
 * The rule is a fixed point: reclassifying templates moves the band medians,
 * which moves the boundaries, which is why the audit recomputes and reports
 * DRIFTED rather than trusting a constant. After the RC2.1-2 reclassifications
 * settled:
 *
 *   easy   median  7.2      easy/medium boundary = (7.2 + 10.7) / 2 = 8.9
 *   medium median 10.7      medium/hard boundary = (10.7 + 13.3) / 2 = 12.0
 *   hard   median 13.3
 *
 * Keeping 8.1 / 11.3 here would have been fitting the old numbers to a new
 * model. tools/audit/rc21-difficulty.mjs recomputes the medians on every run and
 * says DRIFTED when the constants below stop matching what the rule implies.
 */
export const BAND_BOUNDARIES = Object.freeze({easyMedium: 8.9, mediumHard: 12.0});

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
