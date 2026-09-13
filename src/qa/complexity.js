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
  // --- genuine reasoning burden ------------------------------------------
  // How deep the chain of dependent results runs. Derived from the published
  // solution, never declared.
  dependencyDepth: 2.0,
  // How many DISTINCT kinds of transformation the solution composes. Derived.
  // This is the factor that separates reasoning from repetition: taking a
  // fraction of a fraction of a fraction is one idea applied three times, while
  // converting a ratio, then reversing a percentage, then solving for a total is
  // three ideas composed.
  transformationDepth: 1.6,
  // Conditions that must hold simultaneously and cannot be solved in sequence.
  independentConstraints: 1.4,
  // How much separate given information has to be held together at once.
  informationIntegration: 1.0,
  // How far the solver must search before the intended rule is isolated.
  ruleSearchDepth: 1.4,

  // --- workload, deliberately cheap ---------------------------------------
  // RC2.2-2. The count of routine operations. Holdout C's independent review
  // found 43 of 82 items released as HARD were not hard, and the cause was
  // here: `reasoningTransformations`, `stageCount`, `dependencyDepth` and
  // `arithmeticBurden` all rose together on the same chain, so one chain of
  // routine arithmetic was counted four times over. FRAC_H_4 — four divisions
  // of one kind — scored exactly as high as REL_M_CONFIRM, five simultaneous
  // relational constraints with no arithmetic at all.
  //
  // Workload is real but it is not difficulty, so it is carried at a weight
  // that cannot by itself lift an item a band.
  arithmeticWorkload: 0.2
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

/**
 * RC2.2-2. The distinct kinds of transformation a solution composes, and the
 * total count of routine operations, both read off the published steps.
 *
 * Repeating one operation is workload; composing different operations is depth.
 * That single distinction is what the Holdout C review was pointing at, and
 * deriving both from the same text means neither can be inflated by a template
 * author's optimism about its own difficulty.
 */
const OPERATORS = [
  ['×', 'multiply'], ['*', 'multiply'],
  ['÷', 'divide'], ['/', 'divide'],
  ['+', 'add'],
  ['−', 'subtract'], ['-', 'subtract'],
  ['%', 'percent'], ['٪', 'percent'],
  [':', 'ratio']
];

export function deriveOperationProfile(steps) {
  if (!Array.isArray(steps) || !steps.length) return null;
  const kinds = new Set();
  let total = 0;
  for (const raw of steps) {
    const text = String(raw ?? '');
    for (const [sym, kind] of OPERATORS) {
      let from = 0;
      for (;;) {
        const at = text.indexOf(sym, from);
        if (at < 0) break;
        // A minus sign directly before a digit at the start of a token is a
        // sign, not an operation.
        const prev = text[at - 1];
        if (kind === 'subtract' && (prev === undefined || prev === '(' || prev === '=')) { from = at + 1; continue; }
        kinds.add(kind);
        total++;
        from = at + sym.length;
      }
    }
  }
  if (!total) return null;
  return {transformationDepth: kinds.size, arithmeticWorkload: total, kinds: [...kinds]};
}

/**
 * RC2.2-5. Which solution step a wrong option diverges at.
 *
 * Every distractor already carries a misconception id — the NAME of the slip —
 * but only 9% carried a pointer to WHERE in the worked solution it happens, and
 * eleven of sixteen families carried none at all. Annotating five hundred
 * declaration sites by hand would be neither practical nor durable, so the link
 * is derived from what the two texts already share.
 *
 * A distractor's derivation states the arithmetic the learner did. The step it
 * diverges at is the last step whose RESULT the derivation still uses: the
 * learner got that far correctly and went wrong after it. Where no step's result
 * appears, the slip happens before any step completes, and null is returned
 * rather than a guess.
 */
export function deriveAffectedStep(derivation, steps) {
  if (typeof derivation !== 'string' || !Array.isArray(steps) || !steps.length) return null;
  const used = new Set(derivation.match(NUM) ?? []);
  if (!used.size) return null;
  let best = null;
  for (let i = 0; i < steps.length; i++) {
    const text = String(steps[i] ?? '');
    const at = text.lastIndexOf('=');
    if (at < 0) continue;
    const result = (text.slice(at + 1).match(NUM) ?? [])[0];
    if (result !== undefined && used.has(result)) best = i;
  }
  return best;
}

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
  // RC2.2-2. Round FIRST, then band. They used to disagree: the reported score
  // was rounded and the band was taken from the raw sum, so a template summing
  // to 13.199999999999999 reported 13.2 — at or above the hard boundary — and
  // was banded medium. That is exactly the declared/computed inconsistency this
  // release exists to remove, one level down.
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
 * DRIFTED rather than trusting a constant.
 *
 * Keeping 8.1 / 11.3 here would have been fitting the old numbers to a new
 * model. tools/audit/rc21-difficulty.mjs recomputes the medians on every run and
 * says DRIFTED when the constants below stop matching what the rule implies.
 */
/**
 * RC2.2-2. The boundary RULE had to change, and the reason matters.
 *
 * RC2-015 placed each boundary midway between the medians of the two bands it
 * separates. That worked while a question's declared band and its computed band
 * could disagree — the medians were then a fact about the population, measurable
 * independently of where the boundaries sat.
 *
 * RC2.2-1 removed that gap: a question is released at its computed band and at
 * no other. The old rule is therefore now circular. The "medium median" is the
 * median of the items the boundaries themselves selected as medium, so any pair
 * of boundaries reproduces itself and declared/computed agreement is 100% by
 * construction. A rule that cannot fail is not a rule.
 *
 * The replacement is evaluable and does not depend on where the boundaries
 * already are:
 *
 *   the boundaries are the tertiles of the reasoning-burden distribution
 *   across the TEMPLATE population, each template weighted once by its own
 *   median score, sampled by calling every family generator directly rather
 *   than through the gated engine.
 *
 * Measured over all 105 reachable templates: tertiles at 9.4 and 13.4, giving a
 * population split of 40 easy, 33 medium, 32 hard. tools/audit/rc22-difficulty.mjs
 * recomputes them and reports DRIFTED when these constants stop matching.
 *
 * This is not a claim that a third of questions SHOULD be hard. It is a claim
 * that the three labels should partition the reasoning the engine can actually
 * produce, rather than being anchored to numbers inherited from a model that no
 * longer exists.
 */
/**
 * RC2.4. The rule is unchanged; the population it is applied to moved.
 *
 * RC2.4 added eighteen HARD structures across eleven families, so the template
 * population the tertiles partition is a different population — 125 templates
 * rather than 107, weighted toward heavier reasoning at the top. Recomputed on
 * it, the tertiles land at 9.8 and 14.8.
 *
 * What this does NOT do is move any published band. Since RC2.3 a question is
 * released at its STRUCTURAL band and the complexity score decides nothing; these
 * boundaries now govern one reported evidence field, `complexity_band`, and the
 * `score_agrees_with_structure` flag derived from it. Leaving the old constants
 * would mean a stated rule that the code knowingly violates, which is the drift
 * tools/audit/rc22-difficulty.mjs exists to surface — so they are updated, and
 * the agreement figure is re-reported afterwards so the effect on the evidence
 * is visible rather than absorbed.
 */
/**
 * RC2.7. The rule is unchanged again; the population moved again.
 *
 * RC2.7 adds eight structures — five widening the sequence rule space and three
 * supplying construction FORMS the generator had none of (comparison of stated
 * alternatives, a largest admissible value, a smallest admissible count). The
 * last three carry an inversion and a wholeness or strictness condition on top
 * of their arithmetic, so the population is heavier at the top than it was and
 * the tertiles move up with it: 145 templates, tertiles at 10.4 and 15.6. Two
 * independent samples of 500 and 700 draws per band agree to the reported
 * decimal.
 *
 * As at RC2.4 this moves no published band — a question is released at its
 * STRUCTURAL band and the score decides nothing — so what changes is one
 * evidence field, `complexity_band`, and the `score_agrees_with_structure` flag
 * derived from it.
 */
export const BAND_BOUNDARIES = Object.freeze({easyMedium: 10.4, mediumHard: 15.6});

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
