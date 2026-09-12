// RC2-012 — a stratified audit of every wrong option whose value still sits one
// arithmetic step from the key.
//
// The migration took answer-derived options from 24.9% of published wrong
// options to 1.9%. A percentage is not evidence on its own: the question the
// audit has to answer is whether those survivors are genuine task-derived
// misconception paths, or "key ± n" wearing a better label.
//
// Every survivor is placed in exactly one stratum, and each stratum is decided
// by a mechanical test, not by the name on the option:
//
//   S1_TASK_PATH          the value is one the task itself produces: it appears
//                         in the published solution, or it is the answer to a
//                         different well-formed question about the same stem
//                         (the other person's age, the value after the
//                         transfer). Evidence: the value is reconstructible
//                         from the question's OWN given numbers without
//                         reference to the key.
//   S1B_SOLUTION_QUANTITY the displacement from the key is a value the published
//                         SOLUTION computes rather than one the stem states —
//                         the age difference, the other side of a ratio. Still a
//                         quantity of the task, but reached one step later, so
//                         it is kept separate from S1 rather than folded in.
//   S2_STEP_ATTRIBUTED    not reconstructible from givens, and the displacement
//                         from the key is not a quantity the stem states; the
//                         option only names a step of the published explanation.
//                         This is bookkeeping, not mathematics, and it is
//                         reported separately rather than folded into S1.
//   S3_GIVEN_COINCIDENCE  the derivation starts from a number the learner was
//                         GIVEN, which happens to equal the key for this draw.
//                         Not answer-derived at all; it only looks so to a test
//                         that cannot see the givens.
//   S4_UNJUSTIFIED        none of the above. This is the RC1 defect, and the
//                         count must be zero.
//
// S1 is the strong result and S4 is the failure condition. S2 is weaker than S1
// and is reported separately rather than folded in, because "it names a step" is
// a claim about bookkeeping and "the task produces this value" is a claim about
// the mathematics.

import {writeFileSync, mkdirSync} from 'node:fs';
import Engine from '../../src/index.js';
import {isAnswerDerived} from '../../src/qa/distractor-provenance.js';

const BANDS = ['easy', 'medium', 'hard'];

/** Every number the stem states, plus every declared parameter. */
function givenNumbers(q) {
  const out = new Set();
  const walk = v => {
    if (typeof v === 'number') out.add(v);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object') Object.values(v).forEach(walk);
  };
  walk(q.metadata.parameters || {});
  for (const m of String(q.question).matchAll(/\d+(?:\.\d+)?/g)) out.add(Number(m[0]));
  return [...out];
}

const near = (a, b) => Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) < 1e-9;

/**
 * Can this value be built from the question's own given numbers, without using
 * the key? One or two operations over the givens — which is how a learner who
 * misreads the task would actually reach it.
 */
function reconstructibleFromGivens(value, givens) {
  if (!Number.isFinite(value)) return null;
  for (const g of givens) if (near(value, g)) return `given ${g}`;
  for (const a of givens) {
    for (const b of givens) {
      if (near(value, a + b)) return `${a} + ${b}`;
      if (near(value, a - b)) return `${a} − ${b}`;
      if (near(value, a * b)) return `${a} × ${b}`;
      if (b !== 0 && near(value, a / b)) return `${a} ÷ ${b}`;
    }
  }
  // Two operations, enough to cover "sum then halve", "difference then scale".
  for (const a of givens) {
    for (const b of givens) {
      const inter = [a + b, a - b, a * b, b === 0 ? NaN : a / b];
      for (const m of inter) {
        if (!Number.isFinite(m)) continue;
        for (const c of givens) {
          if (near(value, m + c)) return `(${a} .. ${b}) + ${c}`;
          if (near(value, m - c)) return `(${a} .. ${b}) − ${c}`;
          if (near(value, m * c)) return `(${a} .. ${b}) × ${c}`;
          if (c !== 0 && near(value, m / c)) return `(${a} .. ${b}) ÷ ${c}`;
        }
        if (near(value, m / 2)) return `(${a} .. ${b}) ÷ 2`;
      }
    }
  }
  return null;
}

/**
 * The decisive test for the survivors that sit DOWNSTREAM of the answer.
 *
 * "You answered the future age" is a genuine task path: the value is the age
 * asked for, displaced by exactly the number of years the stem states. It is
 * only reachable through the answer because the question asks for the present
 * age — that is a property of the question, not a defect in the option.
 *
 * "key + 1" is not a task path: 1 is nowhere in the stem.
 *
 * So: the displacement between the option and the key must itself be a quantity
 * the learner was given. Additive (the future age, the value before a transfer),
 * multiplicative (the other person's age under a stated ratio), or the
 * complement (the age difference). A nudge by an arbitrary constant fails all
 * three unless that constant happens to be stated, in which case the learner can
 * in fact reach it from the page.
 */
function displacementIsAStatedQuantity(value, correct, givens) {
  if (!Number.isFinite(value) || !Number.isFinite(correct)) return null;
  for (const g of givens) {
    if (near(value, correct + g)) return `key + ${g}, and ${g} is stated`;
    if (near(value, correct - g)) return `key − ${g}, and ${g} is stated`;
    if (near(value, correct * g)) return `key × ${g}, and ${g} is stated`;
    if (g !== 0 && near(value, correct / g)) return `key ÷ ${g}, and ${g} is stated`;
    if (near(value, g - correct)) return `${g} − key, and ${g} is stated`;
  }
  return null;
}

/** Every number the published solution actually computes. */
function solutionNumbers(q) {
  const text = [...(q.explanation.steps || []), q.explanation.fast_method || ''].join(' ');
  return [...new Set([...text.matchAll(/\d+(?:\.\d+)?/g)].map(m => Number(m[0])))];
}

/** Does the published solution write this value down? */
function appearsInSolution(value, q) {
  const text = [
    ...(q.explanation.steps || []), q.explanation.fast_method || '', q.explanation.how_to_start || ''
  ].join(' ');
  const s = String(value);
  return new RegExp(`(^|[^\\d.])${s.replace('.', '\\.')}([^\\d.]|$)`).test(text);
}

/**
 * The stratifier, as a pure function, so it can be convicted on synthetic input.
 * A classifier that cannot separate the RC1 defect from a real task path would
 * make the audit worthless, so the tests call this directly with "key ± n".
 *
 * @param {object} o
 * @param {number} o.value            the wrong option's value
 * @param {number} o.correct          the key
 * @param {number[]} o.givens         numbers the stem states
 * @param {number[]} [o.solutionValues] numbers the published solution computes
 * @param {string|null} [o.stepText]  the step the option claims to corrupt
 * @param {boolean} [o.keyIsAGiven]   the key itself is one of the stated numbers
 */
export function classifySurvivor({value, correct, givens, solutionValues = [], stepText = null, keyIsAGiven = false}) {
  if (keyIsAGiven) return 'S3_GIVEN_COINCIDENCE';
  if (reconstructibleFromGivens(value, givens)) return 'S1_TASK_PATH';
  if (solutionValues.some(v => near(v, value))) return 'S1_TASK_PATH';
  if (displacementIsAStatedQuantity(value, correct, givens)) return 'S1_TASK_PATH';
  if (displacementIsAStatedQuantity(value, correct, solutionValues)) return 'S1B_SOLUTION_QUANTITY';
  return stepText ? 'S2_STEP_ATTRIBUTED' : 'S4_UNJUSTIFIED';
}

export async function audit({questions = 3000, seedPrefix = 'rc2-012-survivor'} = {}) {
  const engine = new Engine();
  const survivors = [];
  let published = 0, wrongOptions = 0;

  for (let i = 0; i < questions; i++) {
    let q;
    try {
      q = engine.generateQuestion({family: 'random', difficulty: BANDS[i % 3], seed: `${seedPrefix}-${i}`});
    } catch { continue; }
    published++;
    const meta = q.metadata.options_meta;
    const correctValue = Object.values(meta).find(m => m.correct).value;
    const givens = givenNumbers(q);
    const givenStrings = new Set(givens.map(String));

    for (const [letter, m] of Object.entries(meta)) {
      if (m.correct) continue;
      wrongOptions++;
      // The givens-blind test: does the derivation read as "key op n"?
      if (!isAnswerDerived(m.derivation, correctValue)) continue;

      const givenCoincidence = givenStrings.has(String(correctValue));
      const rebuilt = reconstructibleFromGivens(m.value, givens);
      const inSolution = appearsInSolution(m.value, q);
      const displacement = displacementIsAStatedQuantity(m.value, correctValue, givens);
      const solutionDisplacement = displacement
        ? null
        : displacementIsAStatedQuantity(m.value, correctValue, solutionNumbers(q));
      const stepText = m.reasoningStepAffected ? (q.explanation.steps[m.reasoningStepAffected - 1] ?? null) : null;

      const stratum = classifySurvivor({
        value: m.value, correct: correctValue, givens,
        solutionValues: solutionNumbers(q), stepText, keyIsAGiven: givenCoincidence
      });

      survivors.push({
        stratum,
        templateId: q.generator_id,
        family: q.family,
        difficulty: q.difficulty,
        seed: q.seed,
        letter,
        misconceptionId: m.misconceptionId,
        derivation: m.derivation,
        value: m.value,
        correctValue,
        reasoningStepAffected: m.reasoningStepAffected,
        stepText,
        reconstructedFromGivens: rebuilt,
        displacementFromKey: displacement,
        displacementFromKeyBySolutionQuantity: solutionDisplacement,
        appearsInPublishedSolution: inSolution,
        keyIsAlsoAGivenNumber: givenCoincidence
      });
    }
  }

  const byStratum = {};
  for (const s of survivors) byStratum[s.stratum] = (byStratum[s.stratum] || 0) + 1;

  // One worked example per (template, misconception) pair, so the audit can be
  // read without re-running anything.
  const classes = {};
  for (const s of survivors) {
    const k = `${s.templateId} | ${s.misconceptionId}`;
    const c = classes[k] ??= {templateId: s.templateId, misconceptionId: s.misconceptionId, stratum: s.stratum, count: 0, example: s};
    c.count++;
    if (c.stratum !== s.stratum) c.stratum = 'MIXED';
  }

  return {
    schema: 'rc2-012-survivor-audit-v1',
    scopeItem: 'RC2-012',
    generatedAt: new Date().toISOString(),
    corpus: {questions: published, wrongOptions, seedPrefix},
    rc1Baseline: {answerDerivedShareOfWrongOptions: 0.249},
    totals: {
      survivors: survivors.length,
      shareOfWrongOptions: Number((survivors.length / wrongOptions).toFixed(4)),
      byStratum,
      unjustified: byStratum.S4_UNJUSTIFIED ?? 0
    },
    classes: Object.values(classes).sort((a, b) => b.count - a.count),
    survivors
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const report = await audit({questions: Number(process.argv[2] ?? 3000)});
  mkdirSync('rc2', {recursive: true});
  writeFileSync('rc2/RC2_012_SURVIVOR_AUDIT.json', JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({corpus: report.corpus, totals: report.totals}, null, 2));
  console.log('\nby (template, misconception):');
  for (const c of report.classes) {
    console.log(String(c.count).padStart(4), c.stratum.padEnd(22), `${c.templateId} | ${c.misconceptionId}`);
  }
}
