// Numeric sequences.
//
// Section 1-A: the oracle for this family checks the extracted rule against
// *every* known term, not only the last one. A sequence whose printed terms do
// not all obey the stated rule yields no surviving candidate at all, so a
// malformed run is rejected rather than published with a plausible-looking key.

import {mk, usable, num, buildBase, eq, gt, gte, X, add, sub, mul, div, resample, bandPool, askOf, distinctValues} from './_shared.js';
import {grid} from '../qa/oracle-engine.js';

export function generateSequences({difficulty, rng, seed, engineVersion, telemetry, pinTemplate = null, pinTargets = null}) {
  const ctx = {
    difficulty, rng, seed, engineVersion, pinTargets,
    family: 'sequences', family_ar: 'المتتاليات العددية', category: 'المتتاليات العددية'
  };
  // RC2.3-1. The catalogue, not a set of per-band pools: which of these is
  // eligible for the requested band is decided by the structural adjudication in
  // src/qa/structure.js, so a template cannot sit in a band nobody adjudicated.
  return bandPool(rng, 'sequences', difficulty, [
    ['SEQ_E_GEO', geometric],
    ['SEQ_E_ARITH', arithmetic],
    ['SEQ_M_INTERLEAVED', interleaved],
    ['SEQ_M_INC_DIFF', increasingDifferences],
    ['SEQ_M_ALT_OPS', alternatingOps],
    ['SEQ_M_DOUBLE_DIFF', doublingDifferences],
    ['SEQ_H_RECURRENCE', recurrence],
    ['SEQ_H_POW_INDEX', powersPlusIndex],
    ['SEQ_H_ALT_DIV', alternateDivide],
    ['SEQ_H_DIGIT_SUM', digitSumStep],
    ['SEQ_H_INDEX_MULT', growingMultiplier],
    // RC2.7-4. The widened rule space and the targets that are not «what comes next».
    ['SEQ_M_LINEAR_RECUR', linearRecurrence],
    ['SEQ_M_CYCLE3', operationCycle],
    ['SEQ_M_PAIR_RULE', pairedRule],
    ['SEQ_H_DIGIT_PRODUCT', digitProductStep],
    ['SEQ_M_WRONG_TERM', wrongTerm],
    // RC2.8-5. Two jobs that are not «compute a term».
    ['SEQ_M_RULE_ID', ruleIdentification],
    ['SEQ_M_RULE_APPLY', ruleApplication],
    // RC2.9-4. The two jobs the review named as still missing.
    ['SEQ_M_MISSING_OP', missingOperation],
    ['SEQ_M_CANDIDATE', candidateSelection],
    // RC2.9.4-B2. A far term from a stated rule, and a count of terms.
    ['SEQ_E_NTH_TERM', nthTermFromRule],
    // RC2.9.5 §4. Two EASY jobs on an arithmetic run that are neither «what
    // comes next» nor «what is the nth term»: the first term to pass a stated
    // bound, and the sum of the terms shown.
    ['SEQ_E_FIRST_ABOVE', firstTermAbove],
    ['SEQ_E_SUM_SHOWN', sumOfShownTerms],
    ['SEQ_E_COUNT_TERMS', countTerms]
  ], pinTemplate)(ctx);
}

/** Differences written as the subtractions that produce them (Section 8-C). */
function differenceLine(seq) {
  return seq.slice(1).map((v, i) => `${v} − ${seq[i]} = ${v - seq[i]}`).join('، ');
}

/**
 * RC2.2-5. The same line, for a sequence with a term hidden in the middle.
 *
 * The Holdout C review flagged one explanation as self-contradicting, and it
 * was: for «24، ؟، 42، 51، 60» the steps read "the differences between the known
 * terms: 42 − 24 = 18, 51 − 42 = 9, 60 − 51 = 9" and then "the difference is
 * constant and equals 9". 18 is not a difference between adjacent terms — it
 * spans the gap. The cause was dropping the hidden term from the array, which
 * made the terms either side of it adjacent and let the subtraction run straight
 * across the hole.
 *
 * Pairs that span the hidden position are not differences between neighbours,
 * so they are not shown as if they were.
 */
function differenceLineAround(seq, hiddenIndex) {
  const parts = [];
  for (let i = 1; i < seq.length; i++) {
    if (i === hiddenIndex || i - 1 === hiddenIndex) continue;
    parts.push(`${seq[i]} − ${seq[i - 1]} = ${seq[i] - seq[i - 1]}`);
  }
  return parts.join('، ');
}

/**
 * Constraints that re-check every printed term against the rule, plus the one
 * constraint that pins the unknown.
 */
function allTermsConstraints(seq, relation, unknownConstraint) {
  const checks = [];
  for (let i = 0; i < seq.length - 1; i++) checks.push(relation(seq[i], seq[i + 1]));
  checks.push(unknownConstraint);
  return checks;
}

function arithmetic(ctx) {
  const {rng} = ctx;
  const start = rng.int(8, 45);
  const step = rng.pick([3, 4, 5, 6, 7, 8, 9]) * (rng.bool(0.25) ? -1 : 1);
  const seq = [start];
  for (let i = 1; i < 5; i++) seq.push(seq.at(-1) + step);
  // Section 17-A / 27: the gap moves — the term after the run, a term inside it,
  // or the term before it. Changing the numbers is not diversity; changing which
  // term is unknown is.
  const direction = askOf(ctx, rng, ['nextTerm', 'missingMiddleTerm', 'previousTerm']);
  const askMiddle = direction === 'missingMiddleTerm';
  const askPrevious = direction === 'previousTerm';
  const hiddenIndex = askMiddle ? rng.int(1, 3) : 5;
  const correct = askMiddle ? seq[hiddenIndex]
    : askPrevious ? seq[0] - step
    : seq.at(-1) + step;
  const shown = askMiddle
    ? seq.map((v, i) => (i === hiddenIndex ? '؟' : v)).join('، ')
    : askPrevious ? `؟، ${seq.join('، ')}`
    : `${seq.join('، ')}، ؟`;
  const known = askMiddle ? seq.filter((_, i) => i !== hiddenIndex) : seq;
  // RC2-012. Every wrong option here used to be written as the answer plus or
  // minus something, which is not a derivation: a learner has no access to the
  // answer. The values below are what the named slip produces when applied to
  // the term the learner actually steps from, and each says which step of the
  // published explanation it corrupts.
  //   step 1  reading the differences
  //   step 2  concluding the constant difference
  //   step 3  applying it once from the anchor term
  const anchor = askMiddle ? seq[hiddenIndex - 1] : askPrevious ? seq[0] : seq.at(-1);
  const dir = askPrevious ? -1 : 1;
  const applied = dir * step;
  const sign = v => (v < 0 ? `(${v})` : `${v}`);
  const misreadStep = step + (step > 0 ? 1 : -1);
  const distractors = usable(ctx, [
    mk(anchor + 2 * applied, 'APPLIED_STEP_TWICE', `${anchor} + 2 × ${sign(applied)}`, 3),
    mk(anchor - applied, 'APPLIED_OPERATION_IN_REVERSE', `${anchor} − ${sign(applied)}`, 3),
    mk(anchor, 'USED_GIVEN_VALUE_AS_ANSWER', `إعادة الحد ${anchor} كما هو`, 3),
    mk(step, 'USED_DIFFERENCE_AS_ANSWER', `الفرق الثابت ${sign(step)}`, 2),
    mk(anchor + dir * misreadStep, 'MISREAD_THE_STEP', `${anchor} + ${sign(dir * misreadStep)}`, 1),
    mk(anchor * 2, 'TREATED_AS_GEOMETRIC', `${anchor} × 2`, 2),
    mk(seq.at(-1) + seq.at(-2), 'USED_WRONG_OPERATION_IN_ALTERNATION', `${seq.at(-1)} + ${seq.at(-2)}`, 2),
    mk(anchor + 3 * applied, 'APPLIED_STEP_TWICE', `${anchor} + 3 × ${sign(applied)}`, 3)
  ], {allowNegative: true});
  return buildBase(ctx, {
    templateId: 'SEQ_E_ARITH',
    subskill: askMiddle ? 'فرق ثابت مع حد مفقود في الوسط'
      : askPrevious ? 'فرق ثابت مع الحد السابق' : 'فرق ثابت',
    difficulty: 'easy',
    question: askMiddle ? 'ما العدد المفقود في المتتالية؟'
      : askPrevious ? 'ما العدد السابق في المتتالية؟' : 'ما العدد التالي في المتتالية؟',
    displayExpression: shown,
    correct, distractors, format: v => num(v),
    steps: [
      `نحسب الفروق بين الحدود المتجاورة المعلومة: ${askMiddle ? differenceLineAround(seq, hiddenIndex) : differenceLine(known)}.`,
      `الفرق ثابت ويساوي ${step}.`,
      askMiddle
        ? `الحد المفقود = ${seq[hiddenIndex - 1]} + ${step} = ${correct}.`
        : askPrevious
          ? `الحد السابق = ${seq[0]} − ${step} = ${correct}.`
          : `الحد التالي = ${seq.at(-1)} + ${step} = ${correct}.`
    ],
    howToStart: 'ابدأ بالفروق بين الحدود.',
    remember: 'إذا كان الفرق ثابتًا، لا تبحث عن قاعدة أعقد.',
    // RC2-002: the value and the adverbial were adjacent, so the numeral read
    // as though it were counting مرة. Stated as a value, then the adverbial.
    fastMethod: `الفرق الثابت هو ${step}، فطبّقه مرة واحدة.`,
    estimatedSteps: 2, conceptTags: ['sequence', 'arithmetic-progression'],
    parameters: {firstTerm: start, commonDifference: step, shownTerms: seq},
    // RC2-023: the reasoning pattern, free of incidental start values.
    reasoningPattern: [`ADD(${step})`],
    oracle: {
      kind: 'constraint', answerKind: 'number',
      constraints: askMiddle
        ? [eq(sub(X, seq[hiddenIndex - 1]), step), eq(sub(seq[hiddenIndex + 1], X), step)]
        : askPrevious
          ? allTermsConstraints(seq, (a, b) => eq(sub(b, a), step), eq(sub(seq[0], X), step))
          : allTermsConstraints(seq, (a, b) => eq(sub(b, a), step), eq(sub(X, seq.at(-1)), step))
    },
    askedUnknown: direction, stageCount: 1,
    pedagogy: {
      targetSkill: 'CONSTANT_DIFFERENCE', targetMisconception: 'APPLIED_STEP_TWICE',
      wrongMethodValue: anchor + 2 * applied
    },
    complexityFactors: {reasoningTransformations: 2, conceptCount: 1, stageCount: 1, arithmeticBurden: 2},
    textParams: false
  });
}

function geometric(ctx) {
  const {rng} = ctx;
  const factor = rng.pick([2, 2, 3]);
  const start = factor === 3 ? rng.pick([2, 3, 4]) : rng.pick([2, 3, 4, 5, 6]);
  const divide = rng.bool(0.4);
  const shownTerms = factor === 3 ? 4 : 5;
  let seq = [];
  let correct;
  if (!divide) {
    seq = [start];
    for (let i = 1; i < shownTerms; i++) seq.push(seq.at(-1) * factor);
    correct = seq.at(-1) * factor;
  } else {
    const top = start * (factor ** shownTerms);
    seq = [top];
    for (let i = 1; i < shownTerms; i++) seq.push(seq.at(-1) / factor);
    correct = seq.at(-1) / factor;
  }
  // Section 10: when subtracting the ratio happens to land on the key, the
  // item stops separating "multiply/divide" from "add/subtract".
  if (seq.at(-1) + (divide ? -factor : factor) === correct) return resample(ctx, geometric);
  // Section 17-A / 27: rotate which term is unknown.
  // "The term before" only makes sense when it is a whole number: a run that
  // starts at 3 and multiplies by 2 has no integer predecessor.
  const previousIsWhole = divide ? true : seq[0] % factor === 0;
  const directions = seq.length >= 4
    ? (previousIsWhole ? ['nextTerm', 'missingMiddleTerm', 'previousTerm'] : ['nextTerm', 'missingMiddleTerm'])
    : ['nextTerm'];
  const direction = askOf(ctx, rng, directions);
  const askMiddle = direction === 'missingMiddleTerm';
  const askPrevious = direction === 'previousTerm';
  const hiddenIndex = askMiddle ? rng.int(1, seq.length - 2) : -1;
  if (askMiddle) correct = seq[hiddenIndex];
  else if (askPrevious) correct = divide ? seq[0] * factor : seq[0] / factor;
  const shown = askMiddle
    ? seq.map((v, i) => (i === hiddenIndex ? '؟' : v)).join('، ')
    : askPrevious ? `؟، ${seq.join('، ')}`
    : `${seq.join('، ')}، ؟`;
  // RC2-012, as SEQ_E_ARITH: expressed from the term the learner steps from.
  //   step 1  reading the ratios
  //   step 2  concluding the constant factor
  //   step 3  applying it once from the anchor term
  const anchor = askMiddle ? seq[hiddenIndex - 1] : askPrevious ? seq[0] : seq.at(-1);
  // Forward through the run the operation is ÷ when the run divides, and the
  // "previous term" direction reverses it again.
  const forwardDivides = askPrevious ? !divide : divide;
  const stepOnce = v => (forwardDivides ? v / factor : v * factor);
  const stepBack = v => (forwardDivides ? v * factor : v / factor);
  const distractors = usable(ctx, [
    mk(stepOnce(stepOnce(anchor)), 'APPLIED_STEP_TWICE', `${anchor} ${forwardDivides ? '÷' : '×'} ${factor} ${forwardDivides ? '÷' : '×'} ${factor}`, 3),
    mk(stepBack(anchor), 'APPLIED_OPERATION_IN_REVERSE', `${anchor} ${forwardDivides ? '×' : '÷'} ${factor}`, 3),
    mk(anchor + (forwardDivides ? -factor : factor), 'TREATED_AS_ARITHMETIC', `${anchor} ${forwardDivides ? '−' : '+'} ${factor}`, 2),
    mk(anchor, 'TREATED_PATTERN_AS_CONSTANT', `إعادة الحد ${anchor} كما هو`, 3),
    // Reading the constant factor as 2 only says anything when it is not 2.
    ...(factor === 2 ? [] : [mk(anchor * 2, 'MISREAD_THE_STEP', `${anchor} × 2 بقراءة المعامل 2 بدل ${factor}`, 1)]),
    mk(factor, 'USED_DIFFERENCE_AS_ANSWER', `المعامل الثابت ${factor} وحده`, 2),
    mk(seq.at(-1) + seq.at(-2), 'USED_WRONG_OPERATION_IN_ALTERNATION', `${seq.at(-1)} + ${seq.at(-2)}`, 2),
    mk(stepBack(stepBack(anchor)), 'APPLIED_OPERATION_IN_REVERSE', `${anchor} ${forwardDivides ? '×' : '÷'} ${factor} ${forwardDivides ? '×' : '÷'} ${factor}`, 3)
  ]);
  return buildBase(ctx, {
    templateId: 'SEQ_E_GEO',
    subskill: `${divide ? 'قسمة ثابتة' : 'ضرب ثابت'}${askMiddle ? ' مع حد مفقود' : askPrevious ? ' مع الحد السابق' : ''}`,
    difficulty: 'easy',
    question: askMiddle ? 'ما العدد المفقود في المتتالية؟'
      : askPrevious ? 'ما العدد السابق في المتتالية؟' : 'ما العدد التالي في المتتالية؟',
    displayExpression: shown,
    correct, distractors, format: v => num(v),
    steps: askMiddle
      ? [
        `نفحص النسبة بين الحدود المعلومة المتجاورة، فنجد عاملًا ثابتًا يساوي ${factor}.`,
        `الحد المفقود = ${seq[hiddenIndex - 1]} ${divide ? '÷' : '×'} ${factor} = ${correct}.`,
        `وللتأكد: ${correct} ${divide ? '÷' : '×'} ${factor} = ${seq[hiddenIndex + 1]}.`
      ]
      : [
        `نفحص النسبة بين كل حدين: ${seq.slice(1).map((v, i) => divide ? `${seq[i]} ÷ ${v} = ${seq[i] / v}` : `${v} ÷ ${seq[i]} = ${v / seq[i]}`).join('، ')}.`,
        `العامل ثابت ويساوي ${factor}.`,
        askPrevious
          ? `الحد السابق = ${seq[0]} ${divide ? '×' : '÷'} ${factor} = ${correct}.`
          : `الحد التالي = ${seq.at(-1)} ${divide ? '÷' : '×'} ${factor} = ${correct}.`
      ],
    howToStart: 'افحص الضرب أو القسمة إذا لم يكن الفرق ثابتًا.',
    remember: 'في المتتاليات الهندسية، العملية نفسها تتكرر بين كل حدين.',
    fastMethod: `المعامل الثابت هو ${factor}، ف${divide ? 'اقسم' : 'اضرب'} فيه مرة واحدة.`,
    estimatedSteps: 2, conceptTags: ['sequence', 'geometric-progression'],
    parameters: {firstTerm: seq[0], commonRatio: factor, shownTerms: seq},
    // RC2-023: the reasoning pattern, free of incidental start values.
    reasoningPattern: [divide ? `DIV(${factor})` : `MUL(${factor})`],
    oracle: {
      kind: 'constraint', answerKind: 'number',
      constraints: askMiddle
        ? (divide
          ? [eq(seq[hiddenIndex - 1], mul(X, factor)), eq(X, mul(seq[hiddenIndex + 1], factor))]
          : [eq(X, mul(seq[hiddenIndex - 1], factor)), eq(seq[hiddenIndex + 1], mul(X, factor))])
        : allTermsConstraints(
          seq,
          (a, b) => divide ? eq(a, mul(b, factor)) : eq(b, mul(a, factor)),
          askPrevious
            ? (divide ? eq(X, mul(seq[0], factor)) : eq(seq[0], mul(X, factor)))
            : (divide ? eq(seq.at(-1), mul(X, factor)) : eq(X, mul(seq.at(-1), factor)))
        )
    },
    askedUnknown: direction, stageCount: 1,
    pedagogy: {
      targetSkill: 'CONSTANT_RATIO', targetMisconception: 'APPLIED_OPERATION_IN_REVERSE',
      wrongMethodValue: seq.at(-1) + (divide ? -factor : factor)
    },
    complexityFactors: {reasoningTransformations: 2, conceptCount: 1, stageCount: 1, arithmeticBurden: 2},
    textParams: false
  });
}

function increasingDifferences(ctx) {
  const {rng} = ctx;
  const start = rng.int(3, 15);
  const diffStart = rng.pick([2, 3, 4]);
  const diffStep = rng.pick([2, 3]);
  const seq = [start];
  const diffs = [];
  let d = diffStart;
  for (let i = 0; i < 4; i++) { diffs.push(d); seq.push(seq.at(-1) + d); d += diffStep; }
  const askMiddle = rng.bool(0.5);
  const hiddenIndex = askMiddle ? rng.int(1, seq.length - 2) : -1;
  const correct = askMiddle ? seq[hiddenIndex] : seq.at(-1) + d;
  const shown = askMiddle
    ? seq.map((v, i) => (i === hiddenIndex ? '؟' : v)).join('، ')
    : `${seq.join('، ')}، ؟`;
  // RC2-012. The anchor is the term the learner steps from, which differs
  // between the two directions; the old pool stepped from the last term even
  // when the gap was in the middle, and padded the rest off the answer.
  //   step 1  reading the differences
  //   step 2  finding the difference that belongs before the unknown
  //   step 3  adding it to the anchor
  const anchor = askMiddle ? seq[hiddenIndex - 1] : seq.at(-1);
  const gap = askMiddle ? diffStart + diffStep * (hiddenIndex - 1) : d;
  const distractors = usable(ctx, [
    mk(anchor + gap - diffStep, 'APPLIED_PREVIOUS_STEP', `${anchor} + ${gap - diffStep}`, 2),
    mk(anchor + gap + diffStep, 'APPLIED_STEP_TWICE', `${anchor} + ${gap + diffStep}`, 2),
    mk(anchor + diffStart, 'TREATED_PATTERN_AS_CONSTANT', `${anchor} + ${diffStart}`, 1),
    mk(anchor + gap + 1, 'MISREAD_THE_STEP', `${anchor} + ${gap + 1}`, 1),
    mk(gap, 'USED_DIFFERENCE_AS_ANSWER', `الفرق ${gap} وحده`, 2),
    mk(anchor, 'USED_GIVEN_VALUE_AS_ANSWER', `إعادة الحد ${anchor} كما هو`, 3),
    mk(anchor * 2, 'TREATED_AS_GEOMETRIC', `${anchor} × 2`, 1),
    mk(anchor + 2 * gap, 'APPLIED_STEP_TWICE', `${anchor} + 2 × ${gap}`, 3)
  ]);
  return buildBase(ctx, {
    templateId: 'SEQ_M_INC_DIFF',
    subskill: askMiddle ? 'فروق تتزايد مع حد مفقود' : 'فروق تتزايد بنمط ثابت',
    difficulty: 'medium',
    question: askMiddle ? 'ما العدد المفقود في المتتالية؟' : 'ما العدد التالي في المتتالية؟',
    displayExpression: shown,
    correct, distractors, format: v => num(v),
    steps: askMiddle
      ? [
        `الفروق تبدأ من ${diffStart} وتزيد ${diffStep} في كل خطوة.`,
        `الفرق الذي يسبق الحد المفقود = ${diffStart} + ${diffStep} × ${hiddenIndex - 1} = ${diffStart + diffStep * (hiddenIndex - 1)}.`,
        `الحد المفقود = ${seq[hiddenIndex - 1]} + ${diffStart + diffStep * (hiddenIndex - 1)} = ${correct}.`
      ]
      : [
        `نحسب الفروق: ${differenceLine(seq)}.`,
        `كل فرق يزيد عن سابقه بمقدار ${diffStep}، فالفرق التالي = ${diffs.at(-1)} + ${diffStep} = ${d}.`,
        `الحد التالي = ${seq.at(-1)} + ${d} = ${correct}.`
      ],
    howToStart: 'احسب الفروق أولًا، ثم ابحث عن نمط داخل الفروق نفسها.',
    remember: 'قد يكون النمط في الفروق وليس في الحدود مباشرة.',
    fastMethod: `الفروق تزيد ${diffStep} كل مرة؛ خذ الفرق التالي فقط.`,
    estimatedSteps: 3, conceptTags: ['sequence', 'second-difference'],
    parameters: {firstTerm: start, firstDifference: diffStart, differenceStep: diffStep, shownTerms: seq},
    // RC2-023: the reasoning pattern, free of incidental start values.
    reasoningPattern: [`DIFF_START(${diffStart})`, `DIFF_STEP(${diffStep})`],
    oracle: {
      kind: 'constraint', answerKind: 'number',
      constraints: askMiddle
        ? [
          eq(sub(X, seq[hiddenIndex - 1]), diffStart + (hiddenIndex - 1) * diffStep),
          eq(sub(seq[hiddenIndex + 1], X), diffStart + hiddenIndex * diffStep)
        ]
        : [
          ...seq.slice(1).map((v, i) => eq(sub(v, seq[i]), diffStart + i * diffStep)),
          eq(sub(X, seq.at(-1)), d)
        ]
    },
    askedUnknown: askMiddle ? 'missingMiddleTerm' : 'nextTerm', stageCount: 2,
    pedagogy: {
      targetSkill: 'SECOND_DIFFERENCE', targetMisconception: 'APPLIED_PREVIOUS_STEP',
      wrongMethodValue: anchor + gap - diffStep
    },
    complexityFactors: {reasoningTransformations: 3, conceptCount: 2, stageCount: 2, arithmeticBurden: 3},
    textParams: false
  });
}

function alternatingOps(ctx) {
  const {rng} = ctx;
  const start = rng.int(3, 8);
  const addStart = rng.pick([2, 3, 4]);
  const multStart = rng.pick([2, 3]);
  let current = start;
  const seq = [current];
  const ops = [];
  for (let k = 0; k < 3; k++) {
    const add = addStart + k; current += add; seq.push(current); ops.push(`+${add}`);
    const mult = multStart + k; current *= mult; seq.push(current); ops.push(`×${mult}`);
  }
  const nextAdd = addStart + 3;
  const correct = current + nextAdd;
  // RC2-012. All of these start from the last shown term, which is where a
  // learner starts.
  //   step 1  reading the alternation
  //   step 2  deciding which operation and which number come next
  //   step 3  applying it to the last term
  const distractors = usable(ctx, [
    mk(current * (multStart + 3), 'USED_WRONG_OPERATION_IN_ALTERNATION', `${current} × ${multStart + 3}`, 2),
    mk(current + addStart + 2, 'APPLIED_PREVIOUS_STEP', `${current} + ${addStart + 2}`, 2),
    mk(current * 2, 'USED_WRONG_OPERATION_IN_ALTERNATION', `${current} × 2`, 2),
    mk(current + addStart, 'TREATED_PATTERN_AS_CONSTANT', `${current} + ${addStart}`, 1),
    mk(current + 2 * nextAdd, 'APPLIED_STEP_TWICE', `${current} + 2 × ${nextAdd}`, 3),
    mk(current, 'USED_GIVEN_VALUE_AS_ANSWER', `إعادة الحد الأخير ${current} كما هو`, 3),
    mk(current - nextAdd, 'APPLIED_OPERATION_IN_REVERSE', `${current} − ${nextAdd}`, 3),
    mk(nextAdd, 'USED_DIFFERENCE_AS_ANSWER', `رقم الجمع التالي ${nextAdd} وحده`, 2)
  ]);
  return buildBase(ctx, {
    templateId: 'SEQ_M_ALT_OPS',
    subskill: 'تناوب جمع وضرب بأعداد متدرجة',
    difficulty: 'medium',
    question: 'ما العدد التالي في المتتالية؟',
    displayExpression: `${seq.join('، ')}، ؟`,
    correct, distractors, format: v => num(v),
    steps: [
      `العمليات تتناوب بين الجمع والضرب: ${ops.join('، ')}.`,
      `بعد آخر عملية ضرب نعود إلى الجمع، ورقم الجمع التالي = ${addStart + 2} + 1 = ${nextAdd}.`,
      `الحد التالي = ${current} + ${nextAdd} = ${correct}.`
    ],
    howToStart: 'إذا لم تجد فرقًا ثابتًا، افحص هل عمليتان تتناوبان.',
    remember: 'التناوب قد يكون مع أرقام تزداد تدريجيًا في كل مرة.',
    fastMethod: 'حدد هل الدور التالي جمع أم ضرب، ثم استخدم الرقم التالي في السلسلة.',
    estimatedSteps: 4, conceptTags: ['sequence', 'alternating'],
    parameters: {
      firstTerm: start, firstAddend: addStart, firstMultiplier: multStart,
      addends: [addStart, addStart + 1, addStart + 2, nextAdd],
      multipliers: [multStart, multStart + 1, multStart + 2],
      shownTerms: seq
    },
    // RC2-023: the reasoning pattern, free of incidental start values.
    // The frozen RC1 audit published S2/05 and S2/41 in one session: the same
    // chain ADD(4) MUL(2) ADD(5) MUL(3) ADD(6) MUL(4) ADD(7), differing only in
    // firstTerm. That is one reasoning experience, not two.
    reasoningPattern: [
      ...ops.map(o => (o.startsWith('+') ? `ADD(${o.slice(1)})` : `MUL(${o.slice(1)})`)),
      `ADD(${nextAdd})`
    ],
    oracle: {kind: 'constraint', answerKind: 'number', constraints: [eq(sub(X, seq.at(-1)), nextAdd)]},
    askedUnknown: 'nextTerm', stageCount: 2,
    pedagogy: {
      targetSkill: 'ALTERNATING_OPERATIONS', targetMisconception: 'USED_WRONG_OPERATION_IN_ALTERNATION',
      wrongMethodValue: current * (multStart + 3)
    },
    complexityFactors: {reasoningTransformations: 3, conceptCount: 2, stageCount: 3, arithmeticBurden: 3, dependencyDepth: 2},
    textParams: false
  });
}

function interleaved(ctx) {
  const {rng} = ctx;
  const a0 = rng.int(2, 9);
  const da = rng.pick([2, 3, 4, 5]);
  const b0 = rng.int(24, 50);
  // Section 10: equal step magnitudes make "continue the other run" land on the
  // same value, and the item stops testing whether the runs were separated.
  const db = -rng.pick([3, 4, 5, 6].filter(v => v !== da));
  const seq = [];
  for (let i = 0; i < 4; i++) { seq.push(a0 + i * da); seq.push(b0 + i * db); }
  seq.pop(); // 7 terms: odd positions are the rising run, even the falling one
  const correct = b0 + 3 * db;
  const oddRun = [0, 2, 4, 6].map(i => seq[i]);
  const evenRun = [1, 3, 5].map(i => seq[i]);
  // RC2-012. The learner steps from the last term of the run they are following,
  // so every wrong option is expressed from one of the two run ends.
  //   step 1  separating the odd-position run
  //   step 2  separating the even-position run
  //   step 3  taking the next turn of the even run
  const oddEnd = oddRun.at(-1);
  const evenEnd = evenRun.at(-1);
  const dbAbs = Math.abs(db);
  const dbSign = db < 0 ? '−' : '+';
  const distractors = usable(ctx, [
    mk(oddEnd + da, 'CONTINUED_WRONG_SUBSEQUENCE', `${oddEnd} + ${da}`, 3),
    mk(evenRun.at(-2) + db, 'APPLIED_PREVIOUS_STEP', `${evenRun.at(-2)} ${dbSign} ${dbAbs}`, 3),
    mk(evenEnd + 2 * db, 'APPLIED_STEP_TWICE', `${evenEnd} ${dbSign} 2 × ${dbAbs}`, 3),
    mk(evenEnd - db, 'APPLIED_OPERATION_IN_REVERSE', `${evenEnd} ${db < 0 ? '+' : '−'} ${dbAbs}`, 3),
    mk(evenEnd + da, 'CONTINUED_WRONG_SUBSEQUENCE', `${evenEnd} + ${da} بفرق السلسلة الأخرى`, 2),
    mk(evenEnd, 'TREATED_PATTERN_AS_CONSTANT', `إعادة آخر حد زوجي ${evenEnd} كما هو`, 3),
    mk(oddEnd + 2 * da, 'APPLIED_STEP_TWICE', `${oddEnd} + 2 × ${da}`, 1),
    mk(evenEnd + db + 1, 'MISREAD_THE_STEP', `${evenEnd} ${dbSign} ${dbAbs - 1}`, 2)
  ], {allowNegative: true});
  return buildBase(ctx, {
    templateId: 'SEQ_M_INTERLEAVED',
    subskill: 'سلسلتان متداخلتان',
    difficulty: 'easy',
    question: 'ما العدد التالي في المتتالية؟',
    displayExpression: `${seq.join('، ')}، ؟`,
    correct, distractors, format: v => num(v),
    steps: [
      `نفصل حدود المواضع الفردية: ${oddRun.join('، ')}، وفروقها ${differenceLine(oddRun)}.`,
      `ثم حدود المواضع الزوجية: ${evenRun.join('، ')}، وفروقها ${differenceLine(evenRun)}.`,
      `الدور التالي للسلسلة الزوجية: ${evenRun.at(-1)} ${db < 0 ? '−' : '+'} ${Math.abs(db)} = ${correct}.`
    ],
    howToStart: 'افصل حدود المواضع الفردية عن الزوجية إذا بدت المتتالية غير منتظمة.',
    remember: 'قد تتداخل سلسلتان بسيطتان داخل متتالية واحدة.',
    fastMethod: 'اقرأ حدود المواضع الزوجية وحدها؛ ستظهر القاعدة فورًا.',
    estimatedSteps: 3, conceptTags: ['sequence', 'interleaved'],
    parameters: {oddStart: a0, oddStep: da, evenStart: b0, evenStep: db, shownTerms: seq},
    // RC2-023: the reasoning pattern, free of incidental start values.
    reasoningPattern: [`RUN_A_STEP(${da})`, `RUN_B_STEP(${db})`],
    oracle: {
      kind: 'constraint', answerKind: 'number',
      constraints: [
        ...evenRun.slice(1).map((v, i) => eq(sub(v, evenRun[i]), db)),
        eq(sub(X, evenRun.at(-1)), db)
      ]
    },
    askedUnknown: 'nextTermOfSecondRun', stageCount: 2,
    pedagogy: {
      targetSkill: 'SEPARATE_INTERLEAVED_RUNS', targetMisconception: 'CONTINUED_WRONG_SUBSEQUENCE',
      wrongMethodValue: a0 + 4 * da,
      // RC2-012. When the rising run's last term happens to equal the answer,
      // "repeat a shown term" and "continue the right run" give the same value
      // and the item stops separating the two runs.
      degenerateWhen: [{when: oddEnd === correct, note: 'the odd run ends on the answer'}]
    },
    complexityFactors: {reasoningTransformations: 3, conceptCount: 2, stageCount: 2, arithmeticBurden: 3},
    textParams: false
  });
}

function doublingDifferences(ctx) {
  const {rng} = ctx;
  const start = rng.int(2, 10);
  const d0 = rng.pick([1, 2, 3]);
  const seq = [start];
  let d = d0;
  const diffs = [];
  for (let i = 0; i < 4; i++) { diffs.push(d); seq.push(seq.at(-1) + d); d *= 2; }
  const askMiddle = rng.bool(0.5);
  const hiddenIndex = askMiddle ? rng.int(1, seq.length - 2) : -1;
  const correct = askMiddle ? seq[hiddenIndex] : seq.at(-1) + d;
  const shown = askMiddle
    ? seq.map((v, i) => (i === hiddenIndex ? '؟' : v)).join('، ')
    : `${seq.join('، ')}، ؟`;
  // RC2-012, expressed from the term the learner steps from.
  //   step 1  noticing that the differences double
  //   step 2  finding the difference that belongs before the unknown
  //   step 3  adding it to the anchor
  const anchor = askMiddle ? seq[hiddenIndex - 1] : seq.at(-1);
  const gap = askMiddle ? d0 * 2 ** (hiddenIndex - 1) : d;
  const distractors = usable(ctx, [
    mk(anchor + gap / 2, 'APPLIED_PREVIOUS_STEP', `${anchor} + ${gap / 2}`, 2),
    mk(anchor + gap * 2, 'APPLIED_STEP_TWICE', `${anchor} + ${gap * 2}`, 2),
    mk(anchor * 2, 'TREATED_AS_GEOMETRIC', `${anchor} × 2 بمضاعفة الحد بدل الفرق`, 1),
    mk(anchor + d0, 'TREATED_PATTERN_AS_CONSTANT', `${anchor} + ${d0}`, 1),
    mk(gap, 'USED_DIFFERENCE_AS_ANSWER', `الفرق ${gap} وحده`, 2),
    mk(anchor, 'USED_GIVEN_VALUE_AS_ANSWER', `إعادة الحد ${anchor} كما هو`, 3),
    mk(anchor - gap, 'APPLIED_OPERATION_IN_REVERSE', `${anchor} − ${gap}`, 3),
    mk(anchor + gap + d0, 'MISREAD_THE_STEP', `${anchor} + ${gap + d0}`, 2)
  ]);
  return buildBase(ctx, {
    templateId: 'SEQ_M_DOUBLE_DIFF',
    subskill: askMiddle ? 'فروق تتضاعف مع حد مفقود' : 'فروق تتضاعف',
    difficulty: 'medium',
    question: askMiddle ? 'ما العدد المفقود في المتتالية؟' : 'ما العدد التالي في المتتالية؟',
    displayExpression: shown,
    correct, distractors, format: v => num(v),
    steps: askMiddle
      ? [
        `الفروق بين الحدود تتضاعف، وأول فرق = ${d0}.`,
        `الفرق الذي يسبق الحد المفقود = ${[d0, ...Array(hiddenIndex - 1).fill(2)].join(' × ')} = ${d0 * 2 ** (hiddenIndex - 1)}.`,
        `الحد المفقود = ${seq[hiddenIndex - 1]} + ${d0 * 2 ** (hiddenIndex - 1)} = ${correct}.`
      ]
      : [
        `نحسب الفروق: ${differenceLine(seq)}.`,
        `كل فرق ضعف السابق، فالفرق التالي = ${diffs.at(-1)} × 2 = ${d}.`,
        `الحد التالي = ${seq.at(-1)} + ${d} = ${correct}.`
      ],
    howToStart: 'احسب الفروق ولاحظ هل تتضاعف.',
    remember: 'عندما تتضاعف الفروق، أضف الفرق المضاعف إلى الحد الأخير.',
    fastMethod: 'ضاعف آخر فرق فقط، لا الحد الأخير.',
    estimatedSteps: 3, conceptTags: ['sequence', 'doubling'],
    parameters: {firstTerm: start, firstDifference: d0, shownTerms: seq},
    // RC2-023: the reasoning pattern, free of incidental start values.
    reasoningPattern: [`DIFF_START(${d0})`, 'DIFF_DOUBLES'],
    oracle: {
      kind: 'constraint', answerKind: 'number',
      constraints: askMiddle
        ? [
          eq(sub(X, seq[hiddenIndex - 1]), d0 * (2 ** (hiddenIndex - 1))),
          eq(sub(seq[hiddenIndex + 1], X), d0 * (2 ** hiddenIndex))
        ]
        : [
          ...seq.slice(1).map((v, i) => eq(sub(v, seq[i]), d0 * (2 ** i))),
          eq(sub(X, seq.at(-1)), d)
        ]
    },
    askedUnknown: askMiddle ? 'missingMiddleTerm' : 'nextTerm', stageCount: 2,
    pedagogy: {
      targetSkill: 'DOUBLING_DIFFERENCE', targetMisconception: 'APPLIED_PREVIOUS_STEP',
      wrongMethodValue: anchor + gap / 2
    },
    complexityFactors: {reasoningTransformations: 3, conceptCount: 2, stageCount: 2, arithmeticBurden: 3},
    textParams: false
  });
}

function alternateDivide(ctx) {
  const {rng} = ctx;
  const subtract = rng.pick([3, 4, 5]);
  let seq = null;
  let correct = null;
  for (let tries = 0; tries < 200; tries++) {
    const x = rng.int(120, 500);
    const a = x - subtract; if (a % 2) continue;
    const b = a / 2;
    const c = b - subtract; if (c % 3) continue;
    const d = c / 3;
    const e = d - subtract; if (e % 4) continue;
    const f = e / 4;
    if (f > 1) { seq = [x, a, b, c, d, e]; correct = f; break; }
  }
  if (!seq) return resample(ctx, alternateDivide);
  // RC2-012. Every option divides or subtracts from a term that is on the page.
  //   step 1  reading the alternation
  //   step 2  seeing that the divisor climbs 2, 3, 4
  //   step 3  dividing the last term by 4
  const last = seq.at(-1);
  const distractors = usable(ctx, [
    mk(last - subtract, 'USED_WRONG_OPERATION_IN_ALTERNATION', `${last} − ${subtract}`, 1),
    mk(last / 3, 'APPLIED_PREVIOUS_STEP', `${last} ÷ 3`, 2),
    mk(last / 2, 'APPLIED_PREVIOUS_STEP', `${last} ÷ 2`, 2),
    mk(last / 5, 'MISREAD_THE_STEP', `${last} ÷ 5 بقراءة القاسم التالي 5`, 2),
    mk(last, 'TREATED_PATTERN_AS_CONSTANT', `إعادة الحد الأخير ${last}`, 3),
    mk(seq.at(-2) / 4, 'APPLIED_PREVIOUS_STEP', `${seq.at(-2)} ÷ 4`, 3),
    mk((last - subtract) / 4, 'APPLIED_STEP_TWICE', `(${last} − ${subtract}) ÷ 4`, 1),
    mk(last / 4 - subtract, 'APPLIED_STEP_TWICE', `${last} ÷ 4 − ${subtract}`, 1)
  ]);
  return buildBase(ctx, {
    templateId: 'SEQ_H_ALT_DIV',
    subskill: 'تناوب طرح ثابت مع قسمة متدرجة',
    difficulty: 'hard',
    question: 'ما العدد التالي في المتتالية؟',
    displayExpression: `${seq.join('، ')}، ؟`,
    correct, distractors, format: v => num(v),
    steps: [
      `نفحص العمليات بالتناوب: ${seq[0]} − ${subtract} = ${seq[1]}، ثم ${seq[1]} ÷ 2 = ${seq[2]}.`,
      `ثم ${seq[2]} − ${subtract} = ${seq[3]}، ثم ${seq[3]} ÷ 3 = ${seq[4]}.`,
      `ثم ${seq[4]} − ${subtract} = ${seq[5]}، فالعملية التالية قسمة والقاسم التالي 4.`,
      `${seq[5]} ÷ 4 = ${correct}.`
    ],
    howToStart: 'افحص العمليات بالتناوب، ثم راقب هل رقم القسمة يتدرج.',
    remember: 'قد تتناوب عملية ثابتة مع عملية رقمها يتغير تدريجيًا.',
    fastMethod: 'الدور التالي قسمة، والقاسم التالي 4.',
    estimatedSteps: 5, conceptTags: ['sequence', 'alternating'],
    parameters: {subtractBy: subtract, divisorSequence: [2, 3, 4], shownTerms: seq},
    // RC2-023: the reasoning pattern, free of incidental start values.
    reasoningPattern: [`SUB(${subtract})`, 'DIV_LADDER(2,3,4)'],
    oracle: {
      kind: 'constraint', answerKind: 'number',
      constraints: [
        eq(sub(seq[0], seq[1]), subtract),
        eq(seq[1], mul(seq[2], 2)),
        eq(sub(seq[2], seq[3]), subtract),
        eq(seq[3], mul(seq[4], 3)),
        eq(sub(seq[4], seq[5]), subtract),
        eq(seq[5], mul(X, 4))
      ]
    },
    askedUnknown: 'nextTerm', stageCount: 3,
    pedagogy: {
      targetSkill: 'ALTERNATING_WITH_PROGRESSING_DIVISOR', targetMisconception: 'USED_WRONG_OPERATION_IN_ALTERNATION',
      wrongMethodValue: last - subtract
    },
    complexityFactors: {reasoningTransformations: 4, conceptCount: 3, stageCount: 3, arithmeticBurden: 4, dependencyDepth: 3},
    textParams: false
  });
}

function recurrence(ctx) {
  const {rng} = ctx;
  const a = rng.int(1, 4);
  const b = rng.int(2, 5);
  const seq = [a, b];
  while (seq.length < 5) seq.push(2 * seq.at(-1) + seq.at(-2));
  const askMiddle = rng.bool(0.5);
  const hiddenIndex = askMiddle ? rng.pick([2, 3]) : -1;
  const correct = askMiddle ? seq[hiddenIndex] : 2 * seq.at(-1) + seq.at(-2);
  const shown = askMiddle
    ? seq.map((v, i) => (i === hiddenIndex ? '؟' : v)).join('، ')
    : `${seq.join('، ')}، ؟`;
  // RC2-012. The two terms the rule reads are prev and prev2, whichever
  // direction the gap sits in, so every option is built from those.
  //   step 1  stating the rule
  //   step 2  verifying it on the shown terms
  //   step 3  applying it to the two terms before the unknown
  const prev = askMiddle ? seq[hiddenIndex - 1] : seq.at(-1);
  const prev2 = askMiddle ? seq[hiddenIndex - 2] : seq.at(-2);
  const distractors = usable(ctx, [
    mk(prev + prev2, 'TREATED_PATTERN_AS_CONSTANT', `${prev} + ${prev2}`, 1),
    mk(2 * prev, 'MISSED_ONE_STAGE', `2 × ${prev}`, 3),
    mk(2 * prev2 + prev, 'USED_WRONG_OPERATION_IN_ALTERNATION', `2 × ${prev2} + ${prev}`, 3),
    mk(3 * prev, 'USED_WRONG_OPERATION_IN_ALTERNATION', `3 × ${prev}`, 1),
    mk(2 * prev + 2 * prev2, 'APPLIED_STEP_TWICE', `2 × ${prev} + 2 × ${prev2}`, 3),
    mk(2 * (prev + prev2), 'APPLIED_STEP_TWICE', `2 × (${prev} + ${prev2})`, 3),
    mk(prev * prev2, 'USED_WRONG_OPERATION_IN_ALTERNATION', `${prev} × ${prev2}`, 1),
    mk(2 * prev - prev2, 'APPLIED_OPERATION_IN_REVERSE', `2 × ${prev} − ${prev2}`, 3),
    mk(prev + 2 * prev2, 'USED_WRONG_OPERATION_IN_ALTERNATION', `${prev} + 2 × ${prev2}`, 3),
    mk(4 * prev, 'TREATED_AS_GEOMETRIC', `4 × ${prev}`, 1)
  ]);
  return buildBase(ctx, {
    templateId: 'SEQ_H_RECURRENCE',
    subskill: askMiddle ? 'اعتماد كل حد على الحدين السابقين مع حد مفقود' : 'اعتماد كل حد على الحدين السابقين',
    difficulty: 'medium',
    question: askMiddle ? 'ما العدد المفقود في المتتالية؟' : 'ما العدد التالي في المتتالية؟',
    displayExpression: shown,
    correct, distractors, format: v => num(v),
    steps: askMiddle
      ? [
        `ابتداءً من الحد الثالث، كل حد = ضعف الحد السابق + الحد الذي قبله.`,
        `الحد المفقود = 2 × ${seq[hiddenIndex - 1]} + ${seq[hiddenIndex - 2]} = ${correct}.`,
        `وللتأكد: 2 × ${correct} + ${seq[hiddenIndex - 1]} = ${seq[hiddenIndex + 1]}.`
      ]
      : [
        `ابتداءً من الحد الثالث، كل حد = ضعف الحد السابق + الحد الذي قبله.`,
        `نتحقق: 2 × ${seq[1]} + ${seq[0]} = ${seq[2]}، و2 × ${seq[2]} + ${seq[1]} = ${seq[3]}، و2 × ${seq[3]} + ${seq[2]} = ${seq[4]}.`,
        `الحد التالي = 2 × ${seq[4]} + ${seq[3]} = ${correct}.`
      ],
    howToStart: 'إذا فشلت الفروق والتناوب، افحص علاقة الحد بآخر حدين قبله.',
    remember: 'بعض المتتاليات تعتمد على حدين لا على حد واحد.',
    fastMethod: 'ضاعف الحد الأخير ثم أضف الذي قبله.',
    estimatedSteps: 5, conceptTags: ['sequence', 'recurrence'],
    parameters: {firstTerm: a, secondTerm: b, shownTerms: seq},
    // RC2-023: the reasoning pattern, free of incidental start values.
    reasoningPattern: ['RECUR(2*prev + prev2)'],
    oracle: {
      kind: 'constraint', answerKind: 'number',
      constraints: askMiddle
        ? [
          eq(X, add(mul(2, seq[hiddenIndex - 1]), seq[hiddenIndex - 2])),
          eq(seq[hiddenIndex + 1], add(mul(2, X), seq[hiddenIndex - 1]))
        ]
        : [
          ...[2, 3, 4].map(i => eq(seq[i], add(mul(2, seq[i - 1]), seq[i - 2]))),
          eq(X, add(mul(2, seq[4]), seq[3]))
        ]
    },
    askedUnknown: askMiddle ? 'missingMiddleTerm' : 'nextTerm', stageCount: 2,
    pedagogy: {
      targetSkill: 'TWO_TERM_RECURRENCE', targetMisconception: 'TREATED_PATTERN_AS_CONSTANT',
      wrongMethodValue: prev + prev2
    },
    complexityFactors: {reasoningTransformations: 4, conceptCount: 2, stageCount: 2, arithmeticBurden: 4, dependencyDepth: 3},
    textParams: false
  });
}

function powersPlusIndex(ctx) {
  const {rng} = ctx;
  // RC2-011. Two bases and three starting indices meant the next term could
  // take only a handful of values.
  const basePow = rng.pick([2, 3, 5]);
  // Vary how far into the powers the run starts and how many terms are shown,
  // so the template is not two questions repeated forever.
  const startIndex = rng.pick(basePow === 2 ? [1, 2, 3, 4, 5] : basePow === 3 ? [1, 2, 3] : [1, 2]);
  const shown = rng.pick([4, 5]);
  const n = startIndex + shown - 1;
  const seq = [];
  for (let i = startIndex; i <= n; i++) seq.push(basePow ** i + i);
  // RC2.7-R3 / §8. A positional rule is defined at every index, so the term
  // BEFORE the run and the term two places past it are both well posed. Each is
  // a different core construction: the relation pins a different position and
  // the reasoning enters from a different end.
  const ask = askOf(ctx, rng, startIndex > 1
    ? ['nextTerm', 'previousTerm', 'termAfterNext']
    : ['nextTerm', 'termAfterNext']);
  const askedIndex = ask === 'previousTerm' ? startIndex - 1 : ask === 'termAfterNext' ? n + 2 : n + 1;
  const correct = basePow ** askedIndex + askedIndex;
  const p = basePow ** askedIndex;
  const runShown = ask === 'previousTerm' ? seq
    : ask === 'termAfterNext' ? [...seq, basePow ** (n + 1) + (n + 1)]
      : seq;
  const shownExpression = ask === 'previousTerm' ? `؟، ${seq.join('، ')}` : `${runShown.join('، ')}، ؟`;
  // RC2-012. Built from the power and the position index, which are the two
  // quantities the solution actually handles.
  //   step 1  subtracting the position index from each term
  //   step 2  identifying the next power
  //   step 3  adding the next position index back
  const distractors = usable(ctx, [
    mk(p, 'MISSED_ONE_STAGE', `${basePow} مرفوعًا للقوة التالية = ${p} دون إضافة رقم الترتيب`, 3),
    mk(p + askedIndex - 1, 'MISREAD_THE_STEP', `${p} + ${askedIndex - 1} برقم موضع مجاور`, 3),
    mk(p + askedIndex + 1, 'MISREAD_THE_STEP', `${p} + ${askedIndex + 1} برقم موضع مجاور`, 3),
    mk(basePow ** (askedIndex - 1) + askedIndex, 'APPLIED_PREVIOUS_STEP', `${basePow ** (askedIndex - 1)} + ${askedIndex}`, 2),
    mk(p * basePow + askedIndex + 1, 'APPLIED_STEP_TWICE', `${p} × ${basePow} + ${askedIndex + 1}`, 2),
    mk(runShown.at(-1) * basePow, 'TREATED_AS_GEOMETRIC', `${runShown.at(-1)} × ${basePow} بضرب الحد كاملًا`, 1),
    mk(p - askedIndex, 'APPLIED_OPERATION_IN_REVERSE', `${p} − ${askedIndex}`, 3),
    mk(runShown.at(-1) + p - basePow ** (askedIndex - 1), 'APPLIED_PREVIOUS_STEP', `${runShown.at(-1)} + (${p} − ${basePow ** (askedIndex - 1)})`, 2)
  ]);
  const powerLine = runShown.map((v, i) => `${v} − ${startIndex + i} = ${v - (startIndex + i)}`).join('، ');
  return buildBase(ctx, {
    templateId: 'SEQ_H_POW_INDEX',
    subskill: ask === 'previousTerm' ? 'قوة عدد مع رقم الترتيب، بالرجوع إلى الحد السابق'
      : ask === 'termAfterNext' ? 'قوة عدد مع رقم الترتيب، لحد أبعد'
        : 'قوة عدد مع رقم ترتيب الحد',
    difficulty: 'hard',
    question: ask === 'previousTerm' ? 'ما العدد السابق في المتتالية؟' : 'ما العدد التالي في المتتالية؟',
    displayExpression: shownExpression,
    correct, distractors, format: v => num(v),
    steps: [
      `نطرح من كل حد رقم موضعه في المتتالية: ${powerLine}.`,
      ask === 'previousTerm'
        ? `النواتج هي قوى العدد ${basePow} بالترتيب، فالقوة التي تسبقها = ${basePow ** startIndex} ÷ ${basePow} = ${p}.`
        : `النواتج هي قوى العدد ${basePow} بالترتيب، فالقوة المطلوبة = ${basePow ** (askedIndex - 1)} × ${basePow} = ${p}.`,
      `الحد المطلوب = ${p} + ${askedIndex} = ${correct}.`
    ],
    howToStart: 'افحص هل كل حد يجمع بين قوة معروفة ورقم موضعه.',
    remember: 'قد يكون رقم ترتيب الحد جزءًا من القاعدة.',
    fastMethod: `احسب ${basePow} مرفوعًا للقوة التالية ثم أضف رقم الموضع.`,
    estimatedSteps: 4, conceptTags: ['sequence', 'powers'],
    // RC2-011 widened startIndex, which pushed the next position index past the
    // allowed-constant list and made the final step unsourced. The index is a
    // real quantity of the task — the position of the term being asked for — so
    // it is declared rather than permitted as a bare constant.
    // The power at the asked position and the one before it are parameters of
    // the rule the explanation applies, so neither appears from nowhere.
    parameters: {powerBase: basePow, startIndex, askedIndex, shownTerms: runShown,
      powerAtAskedIndex: p, powerBefore: basePow ** (askedIndex - 1)},
    // RC2-023: the reasoning pattern, free of incidental start values.
    reasoningPattern: [`POW_BASE(${basePow})`, 'PLUS_TERM_INDEX'],
    oracle: {
      kind: 'constraint', answerKind: 'number',
      constraints: [
        // Every printed term is re-checked against the positional rule, and the
        // last constraint pins the term at the position ACTUALLY asked for —
        // which moves with the target rather than always being n+1.
        ...runShown.map((v, i) => eq(sub(v, startIndex + i), basePow ** (startIndex + i))),
        eq(sub(X, askedIndex), p)
      ]
    },
    askedUnknown: ask, stageCount: ask === 'nextTerm' ? 2 : 3,
    allowedConstants: [0, 1, 2, 3, 4, 5, 6, 7, 8, 100],
    pedagogy: {
      targetSkill: 'POWER_PLUS_INDEX', targetMisconception: 'MISSED_ONE_STAGE',
      wrongMethodValue: p
    },
    complexityFactors: {reasoningTransformations: 4, conceptCount: 3, stageCount: 2, arithmeticBurden: 4},
    textParams: false
  });
}

// ---------------------------------------------------------------------------
// RC2.4 — two further hard structures for this family.
//
// RC2.3 left sequences with only two hard templates, and an ALL_HARD session
// leans on them. Both of these are rule discovery of a kind neither existing one
// covers: in the first the step depends on the term's own digits, in the second
// the multiplier itself advances.
// ---------------------------------------------------------------------------

const digitSum = n => String(n).split('').reduce((a, c) => a + Number(c), 0);

/**
 * RULE_DISCOVERY + STRATEGY_SELECTION.
 *
 * The differences are 5, 10, 11, 13, 8 — no constant, no ratio, no second
 * difference. Nothing works until the solver looks INSIDE each term.
 */
function digitSumStep(ctx) {
  const {rng} = ctx;
  let found = null;
  for (let t = 0; t < 200; t++) {
    const start = rng.int(14, 68);
    const seq = [start];
    for (let i = 0; i < 4; i++) seq.push(seq.at(-1) + digitSum(seq.at(-1)));
    const next = seq.at(-1) + digitSum(seq.at(-1));
    const diffs = seq.slice(1).map((v, i) => v - seq[i]);
    // A run whose differences are constant or evenly stepped is a run the
    // standard checks already solve, so it is not this template's question.
    if (new Set(diffs).size <= 2) continue;
    const second = diffs.slice(1).map((v, i) => v - diffs[i]);
    if (new Set(second).size === 1) continue;
    found = {seq, next};
    break;
  }
  if (!found) return resample(ctx, digitSumStep);
  const {seq, next} = found;
  // RC2.7-R3 / §8. The target, not only the rule. Asking for the term AFTER the
  // next one is a different core construction: the relation that pins the answer
  // hangs off a term the reader must derive first, and the entry point moves.
  const askAfter = rng.bool(0.4);
  const anchor = askAfter ? next : seq.at(-1);
  const last = anchor;
  const correct = anchor + digitSum(anchor);
  const ds = digitSum(anchor);
  const shownRun = askAfter ? [...seq, next] : seq;

  const distractors = usable(ctx, [
    mk(last + (last - shownRun.at(-2)), 'TREATED_PATTERN_AS_CONSTANT', `${last} + (${last} − ${shownRun.at(-2)})`, 1),
    mk(last + digitSum(shownRun.at(-2)), 'APPLIED_PREVIOUS_STEP', `${last} + ${digitSum(shownRun.at(-2))} بمجموع أرقام الحد السابق`, 2),
    mk(last + Number(String(last)[0]), 'USED_DIGITS_AS_THE_STEP', `${last} + ${Number(String(last)[0])} برقم واحد من الحد`, 2),
    mk(last + ds + 1, 'OFF_BY_ONE_STEP', `${last} + ${ds} + 1`, 2),
    mk(last + ds - 1, 'OFF_BY_ONE_STEP', `${last} + ${ds} − 1`, 2),
    mk(last * 2 - shownRun.at(-2), 'TREATED_AS_ARITHMETIC', `${last} × 2 − ${shownRun.at(-2)}`, 1),
    mk(last + 2 * ds, 'APPLIED_STEP_TWICE', `${last} + ${ds} × 2`, 2),
    mk(ds, 'USED_DIFFERENCE_AS_ANSWER', `مجموع أرقام الحد الأخير ${ds}`, 2)
  ]);

  const line = shownRun.slice(0, -1).map((v, i) => `${v} + ${digitSum(v)} = ${shownRun[i + 1]}`).join('، ');
  return buildBase(ctx, {
    templateId: 'SEQ_H_DIGIT_SUM',
    subskill: askAfter ? 'خطوة من أرقام الحد مع حد أبعد' : 'خطوة تعتمد على أرقام الحد نفسه',
    difficulty: 'hard',
    question: 'ما العدد التالي في المتتالية؟',
    displayExpression: `${shownRun.join('، ')}، ؟`,
    correct, distractors, format: v => num(v),
    steps: [
      `الفروق بين الحدود غير ثابتة ولا تتبع نمطًا في ذاتها، فننظر داخل كل حد.`,
      `كل حد يزيد عن سابقه بمجموع أرقام ذلك الحد: ${line}.`,
      `مجموع أرقام الحد الأخير = ${String(last).split('').join(' + ')} = ${ds}، فالحد التالي = ${last} + ${ds} = ${correct}.`
    ],
    howToStart: 'إذا لم تنفع الفروق ولا النسب، جرّب قاعدة تعتمد على أرقام الحد نفسه.',
    remember: 'قد تكون القاعدة داخل الحد لا بين الحدود.',
    fastMethod: 'اجمع أرقام الحد الأخير وأضفها إليه.',
    estimatedSteps: 3, conceptTags: ['sequence', 'digits'],
    parameters: {shownTerms: shownRun, lastDigitSum: ds},
    reasoningPattern: askAfter ? ['DIGIT_SUM_STEP', 'DIGIT_SUM_STEP'] : ['DIGIT_SUM_STEP'],
    oracle: {
      kind: 'constraint', answerKind: 'number',
      constraints: [
        ...shownRun.slice(0, -1).map((v, i) => eq(sub(shownRun[i + 1], v), digitSum(v))),
        eq(sub(X, anchor), ds)
      ]
    },
    askedUnknown: askAfter ? 'termAfterNext' : 'nextTerm', stageCount: askAfter ? 3 : 2,
    allowedConstants: [0, 1, 2, 100],
    pedagogy: {
      targetSkill: 'DIGIT_SUM_RULE', targetMisconception: 'TREATED_PATTERN_AS_CONSTANT',
      wrongMethodValue: last + (last - shownRun.at(-2))
    },
    complexityFactors: {reasoningTransformations: 3, conceptCount: 3, ruleSearchDepth: 4, stageCount: askAfter ? 3 : 2, arithmeticBurden: 4},
    textParams: false
  });
}

/**
 * RULE_DISCOVERY + STRATEGY_SELECTION.
 *
 * Ratios drift upward and differences explode, so neither standard check
 * settles it. The rule is a multiplier that advances by one each step with a
 * constant added, and the two parts have to be found together.
 */
function growingMultiplier(ctx) {
  const {rng} = ctx;
  let found = null;
  for (let t = 0; t < 150; t++) {
    const start = rng.int(2, 6);
    const add = rng.pick([1, 2, 3]);
    const firstMul = rng.pick([2, 3]);
    const seq = [start];
    for (let i = 0; i < 4; i++) seq.push(seq.at(-1) * (firstMul + i) + add);
    const next = seq.at(-1) * (firstMul + 4) + add;
    if (next > 20000) continue;
    if (new Set(seq).size !== seq.length) continue;
    found = {seq, next, start, add, firstMul};
    break;
  }
  if (!found) return resample(ctx, growingMultiplier);
  const {seq, next, add, firstMul} = found;
  // RC2.7-R3 / §8. The multiplier grows with the position, so the term two
  // places on is well posed and is a different core construction: the answer is
  // pinned through a term the reader derives first.
  const afterNext = next * (firstMul + 5) + add;
  const askAfter = afterNext <= 200000 && rng.bool(0.4);
  const runShown = askAfter ? [...seq, next] : seq;
  const last = runShown.at(-1);
  const lastMul = firstMul + (askAfter ? 5 : 4);
  const correct = askAfter ? afterNext : next;

  const distractors = usable(ctx, [
    mk(last * (lastMul - 1) + add, 'APPLIED_PREVIOUS_STEP', `${last} × ${lastMul - 1} + ${add}`, 1),
    mk(last * lastMul, 'MISSED_ONE_STAGE', `${last} × ${lastMul} دون إضافة ${add}`, 2),
    mk(last * lastMul + add + 1, 'OFF_BY_ONE_STEP', `${last} × ${lastMul} + ${add} + 1`, 2),
    mk(last * (lastMul + 1) + add, 'MISREAD_THE_STEP', `${last} × ${lastMul + 1} + ${add}`, 2),
    mk(last + (last - runShown.at(-2)), 'TREATED_AS_ARITHMETIC', `${last} + (${last} − ${runShown.at(-2)})`, 0),
    mk(last * lastMul - add, 'APPLIED_OPERATION_IN_REVERSE', `${last} × ${lastMul} − ${add}`, 2),
    mk(last * 2 + add, 'TREATED_PATTERN_AS_CONSTANT', `${last} × 2 + ${add}`, 1)
  ]);

  const line = runShown.slice(0, -1).map((v, i) => `${v} × ${firstMul + i} + ${add} = ${runShown[i + 1]}`).join('، ');
  return buildBase(ctx, {
    templateId: 'SEQ_H_INDEX_MULT',
    subskill: askAfter ? 'مضروب متزايد مع ثابت مضاف، لحد أبعد' : 'مضروب متزايد مع ثابت مضاف',
    difficulty: 'hard',
    question: 'ما العدد التالي في المتتالية؟',
    displayExpression: `${runShown.join('، ')}، ؟`,
    correct, distractors, format: v => num(v),
    steps: [
      `الفروق تتضخم بسرعة والنسب بين الحدود تتزايد، فلا الفروق ولا النسب ثابتة.`,
      `المضروب نفسه يتزايد بمقدار 1 في كل خطوة ويُضاف ${add}: ${line}.`,
      `المضروب التالي = ${lastMul - 1} + 1 = ${lastMul}، فالحد التالي = ${last} × ${lastMul} + ${add} = ${correct}.`
    ],
    howToStart: 'إذا تزايدت النسب بانتظام، فجرّب مضروبًا يكبر خطوة بخطوة.',
    remember: 'قد يكون المعامل نفسه متغيرًا وليس ثابتًا.',
    fastMethod: 'اضرب الحد الأخير في المضروب التالي ثم أضف الثابت.',
    estimatedSteps: 3, conceptTags: ['sequence', 'growing-factor'],
    parameters: {shownTerms: runShown, addedConstant: add, firstMultiplier: firstMul, nextMultiplier: lastMul},
    reasoningPattern: ['GROWING_MULTIPLIER', `PLUS_CONST(${add})`],
    oracle: {
      kind: 'constraint', answerKind: 'number',
      constraints: [
        ...runShown.slice(0, -1).map((v, i) => eq(runShown[i + 1], v * (firstMul + i) + add)),
        eq(X, last * lastMul + add)
      ]
    },
    askedUnknown: askAfter ? 'termAfterNext' : 'nextTerm', stageCount: askAfter ? 3 : 2,
    allowedConstants: [0, 1, 2, 3, 4, 5, 6, 7, 100],
    pedagogy: {
      targetSkill: 'GROWING_MULTIPLIER_RULE', targetMisconception: 'APPLIED_PREVIOUS_STEP',
      wrongMethodValue: last * (lastMul - 1) + add
    },
    complexityFactors: {reasoningTransformations: 3, conceptCount: 3, ruleSearchDepth: 4, stageCount: 2, arithmeticBurden: 4},
    textParams: false
  });
}

// --- RC2.7-4. The rule space -------------------------------------------------
//
// The RC2.6 inventory found eleven sequence templates sharing THREE stem
// skeletons and four asked unknowns: to a reader every sequence item was the
// same question — a row of numbers and «ما العدد التالي؟» — however different
// the rule behind it. Two things are wrong with that and they are separate
// problems. The rule SPACE was narrower than the template count suggested, and
// the TARGET was almost always the next term.
//
// What follows widens both, under the brief's constraint that every sequence
// must have enough supporting terms, a discoverable intended rule, and no
// equally natural competing rule leading to a different option. Where a second
// reading exists it is one that AGREES: a_{n+1} = k·a_n + c is also "the
// differences multiply by k", and both give the same next term.

/** The digits of a positive integer, most significant first. */
const digitsOf = n => String(Math.abs(n)).split('').map(Number);

/**
 * a_(n+1) = k · a_n + c — the multiply-add rule the brief names.
 *
 * The competing reading is the difference rule d_(n+1) = k · d_n, which is a
 * consequence of this one and produces the same continuation, so the two
 * readings never disagree.
 */
function linearRecurrence(ctx) {
  const {rng} = ctx;
  const k = rng.pick([2, 3]);
  const c = rng.pick([2, 3, 4, 5]) * (rng.bool(0.35) ? -1 : 1);
  const start = rng.int(3, 12);
  const seq = [start];
  for (let i = 1; i < 5; i++) seq.push(seq.at(-1) * k + c);
  if (seq.some(v => v <= 0) || seq.at(-1) > 4000) return resample(ctx, linearRecurrence);
  // The previous term only exists as a whole number when the arithmetic runs
  // backwards cleanly; asking for it otherwise would have no printable answer.
  const priorExists = (start - c) % k === 0 && (start - c) / k > 0;
  const direction = askOf(ctx, rng, priorExists
    ? ['nextTerm', 'previousTerm', 'termAfterNext']
    : ['nextTerm', 'termAfterNext']);
  const next = seq.at(-1) * k + c;
  const correct = direction === 'previousTerm' ? (start - c) / k
    : direction === 'termAfterNext' ? next * k + c
      : next;
  const shown = direction === 'previousTerm' ? `؟، ${seq.join('، ')}`
    : direction === 'termAfterNext' ? `${seq.join('، ')}، ${next}، ؟`
      : `${seq.join('، ')}، ؟`;
  const anchor = direction === 'previousTerm' ? start
    : direction === 'termAfterNext' ? next : seq.at(-1);
  const sign = v => (v < 0 ? `(${v})` : `${v}`);
  const distractors = usable(ctx, [
    mk(anchor * k, 'IGNORED_THE_OFFSET', `${anchor} × ${k}`, 2),
    mk(anchor + c, 'IGNORED_THE_MULTIPLIER', `${anchor} + ${sign(c)}`, 2),
    mk((anchor + c) * k, 'APPLIED_THE_STEPS_IN_THE_WRONG_ORDER', `(${anchor} + ${sign(c)}) × ${k}`, 2),
    mk(anchor * k - c, 'APPLIED_OPERATION_IN_REVERSE', `${anchor} × ${k} − ${sign(c)}`, 2),
    mk(anchor * (k + 1) + c, 'MISREAD_THE_STEP', `${anchor} × ${k + 1} + ${sign(c)}`, 1),
    mk(anchor + (anchor - seq.at(-2)), 'TREATED_AS_ARITHMETIC', `${anchor} + (${anchor} − ${seq.at(-2)})`, 1),
    mk(anchor * k * k + c, 'APPLIED_STEP_TWICE', `${anchor} × ${k} × ${k} + ${sign(c)}`, 2)
  ], {allowNegative: true});
  const stem = direction === 'previousTerm' ? 'ما العدد السابق في المتتالية؟'
    : direction === 'termAfterNext' ? 'ما العدد الذي يشغل موضع علامة الاستفهام؟'
      : 'ما العدد التالي في المتتالية؟';
  return buildBase(ctx, {
    templateId: 'SEQ_M_LINEAR_RECUR',
    subskill: direction === 'previousTerm' ? 'قاعدة ضرب وجمع مع الحد السابق'
      : direction === 'termAfterNext' ? 'قاعدة ضرب وجمع مع حد أبعد'
        : 'قاعدة ضرب وجمع',
    difficulty: 'medium',
    scenario: 'multiply_then_add', direction: direction === 'previousTerm' ? 'reverse' : 'forward',
    question: stem,
    displayExpression: shown,
    correct, distractors, format: v => num(v),
    steps: [
      `نجرب قاعدة على صورة «الحد السابق × عدد ثابت + عدد ثابت»: ${seq[0]} × ${k} ${c < 0 ? '−' : '+'} ${Math.abs(c)} = ${seq[1]}.`,
      `القاعدة نفسها تصح على بقية الحدود: ${seq[1]} × ${k} ${c < 0 ? '−' : '+'} ${Math.abs(c)} = ${seq[2]}، و${seq[2]} × ${k} ${c < 0 ? '−' : '+'} ${Math.abs(c)} = ${seq[3]}، و${seq[3]} × ${k} ${c < 0 ? '−' : '+'} ${Math.abs(c)} = ${seq[4]}.`,
      direction === 'previousTerm'
        ? `نعكس القاعدة للحصول على الحد السابق: (${start} ${c < 0 ? '+' : '−'} ${Math.abs(c)}) ÷ ${k} = ${correct}.`
        : direction === 'termAfterNext'
          ? `الحد التالي = ${seq.at(-1)} × ${k} ${c < 0 ? '−' : '+'} ${Math.abs(c)} = ${next}، والذي يليه = ${next} × ${k} ${c < 0 ? '−' : '+'} ${Math.abs(c)} = ${correct}.`
          : `الحد التالي = ${seq.at(-1)} × ${k} ${c < 0 ? '−' : '+'} ${Math.abs(c)} = ${correct}.`
    ],
    howToStart: 'إذا لم يكن الفرق ثابتًا ولا النسبة ثابتة، جرب ضربًا يتبعه جمع.',
    remember: 'ضرب ثم جمع يجعل الفروق نفسها تتضاعف بالمقدار نفسه.',
    fastMethod: `اضرب في ${k} ثم ${c < 0 ? 'اطرح' : 'اجمع'} ${Math.abs(c)}.`,
    estimatedSteps: 3, conceptTags: ['sequence', 'linear-recurrence'],
    parameters: {multiplier: k, offset: c, shownTerms: seq, laterTerm: next},
    reasoningPattern: [`MUL(${k})`, `ADD(${c})`],
    oracle: {
      kind: 'constraint', answerKind: 'number',
      constraints: direction === 'previousTerm'
        ? allTermsConstraints(seq, (a, b) => eq(b, add(mul(a, k), c)), eq(start, add(mul(X, k), c)))
        : direction === 'termAfterNext'
          ? allTermsConstraints(seq, (a, b) => eq(b, add(mul(a, k), c)), eq(X, add(mul(next, k), c)))
          : allTermsConstraints(seq, (a, b) => eq(b, add(mul(a, k), c)), eq(X, add(mul(seq.at(-1), k), c)))
    },
    askedUnknown: direction, stageCount: 2,
    pedagogy: {
      targetSkill: 'MULTIPLY_THEN_ADD', targetMisconception: 'IGNORED_THE_OFFSET',
      wrongMethodValue: anchor * k
    },
    complexityFactors: {reasoningTransformations: 3, conceptCount: 2, stageCount: 2, arithmeticBurden: 3, ruleSearchDepth: 2},
    textParams: false
  });
}

/**
 * A three-operation cycle, repeated. Two complete cycles are printed, which is
 * what makes the repetition visible rather than guessed at.
 */
function operationCycle(ctx) {
  const {rng} = ctx;
  const a = rng.pick([3, 4, 5, 6, 7]);
  const b = rng.pick([2, 3]);
  const c = rng.pick([2, 3, 4, 5, 6]);
  const start = rng.int(4, 14);
  const apply = (v, i) => (i % 3 === 0 ? v + a : i % 3 === 1 ? v * b : v - c);
  const seq = [start];
  for (let i = 0; i < 6; i++) seq.push(apply(seq.at(-1), i));
  if (seq.some(v => v <= 0) || seq.at(-1) > 900) return resample(ctx, operationCycle);
  if (new Set(seq).size !== seq.length) return resample(ctx, operationCycle);
  const correct = apply(seq.at(-1), 6);
  const anchor = seq.at(-1);
  const distractors = usable(ctx, [
    mk(anchor * b, 'APPLIED_THE_WRONG_STEP_OF_THE_CYCLE', `${anchor} × ${b}`, 2),
    mk(anchor - c, 'APPLIED_THE_WRONG_STEP_OF_THE_CYCLE', `${anchor} − ${c}`, 2),
    mk(anchor - a, 'APPLIED_OPERATION_IN_REVERSE', `${anchor} − ${a}`, 2),
    mk(anchor + a + a, 'APPLIED_STEP_TWICE', `${anchor} + ${a} + ${a}`, 2),
    mk(anchor + a + b, 'MISREAD_THE_STEP', `${anchor} + ${a} + ${b}`, 1),
    mk(anchor + c, 'APPLIED_THE_WRONG_STEP_OF_THE_CYCLE', `${anchor} + ${c}`, 2),
    mk(anchor + (anchor - seq.at(-2)), 'TREATED_AS_ARITHMETIC', `${anchor} + (${anchor} − ${seq.at(-2)})`, 1)
  ], {allowNegative: true});
  return buildBase(ctx, {
    templateId: 'SEQ_M_CYCLE3',
    subskill: 'دورة من ثلاث عمليات تتكرر',
    difficulty: 'medium',
    scenario: 'three_operation_cycle',
    question: 'ما العدد التالي في المتتالية؟',
    displayExpression: `${seq.join('، ')}، ؟`,
    correct, distractors, format: v => num(v),
    steps: [
      `الخطوات الثلاث الأولى: ${seq[0]} + ${a} = ${seq[1]}، و${seq[1]} × ${b} = ${seq[2]}، و${seq[2]} − ${c} = ${seq[3]}.`,
      `الخطوات الثلاث التالية تكرر الدورة نفسها: ${seq[3]} + ${a} = ${seq[4]}، و${seq[4]} × ${b} = ${seq[5]}، و${seq[5]} − ${c} = ${seq[6]}.`,
      `الدورة تبدأ من جديد، فالخطوة التالية جمع: ${seq[6]} + ${a} = ${correct}.`
    ],
    howToStart: 'اقسم الخطوات إلى مجموعات متساوية وابحث عن تكرارها.',
    remember: 'إذا لم تتكرر عملية واحدة، ابحث عن دورة من عمليات.',
    fastMethod: 'حدد موضع الخطوة المطلوبة داخل الدورة ثم طبّق عمليتها وحدها.',
    estimatedSteps: 3, conceptTags: ['sequence', 'operation-cycle'],
    parameters: {addend: a, multiplier: b, subtrahend: c, shownTerms: seq},
    reasoningPattern: [`ADD(${a})`, `MUL(${b})`, `SUB(${c})`],
    oracle: {
      kind: 'constraint', answerKind: 'number',
      constraints: [
        eq(seq[1], add(seq[0], a)), eq(seq[2], mul(seq[1], b)), eq(seq[3], sub(seq[2], c)),
        eq(seq[4], add(seq[3], a)), eq(seq[5], mul(seq[4], b)), eq(seq[6], sub(seq[5], c)),
        eq(X, add(seq[6], a))
      ]
    },
    askedUnknown: 'nextTerm', stageCount: 3,
    pedagogy: {
      targetSkill: 'OPERATION_CYCLE', targetMisconception: 'APPLIED_THE_WRONG_STEP_OF_THE_CYCLE',
      wrongMethodValue: anchor * b
    },
    complexityFactors: {reasoningTransformations: 3, conceptCount: 2, stageCount: 3, arithmeticBurden: 4, ruleSearchDepth: 2},
    textParams: false
  });
}

/**
 * Terms in pairs: the first of each pair advances by a constant step, the second
 * is a function of the first. Two discoveries rather than one, but both are in
 * the standard repertoire once the pairing is seen — hence medium.
 */
function pairedRule(ctx) {
  const {rng} = ctx;
  const step = rng.pick([1, 2, 3]);
  const first = rng.int(2, 7);
  const kind = rng.pick(['square', 'triple', 'successor']);
  const f = v => (kind === 'square' ? v * v : kind === 'triple' ? v * 3 : v * (v + 1));
  const firsts = [first, first + step, first + 2 * step, first + 3 * step];
  const flat = [];
  for (let i = 0; i < 3; i++) flat.push(firsts[i], f(firsts[i]));
  flat.push(firsts[3]);
  const correct = f(firsts[3]);
  if (correct > 900) return resample(ctx, pairedRule);
  if (new Set([...flat, correct]).size !== flat.length + 1) return resample(ctx, pairedRule);
  const anchor = firsts[3];
  const ruleText = kind === 'square' ? 'مربع العدد الذي قبله'
    : kind === 'triple' ? 'ثلاثة أمثال العدد الذي قبله'
      : 'حاصل ضرب العدد الذي قبله في العدد الذي يليه';
  const distractors = usable(ctx, [
    mk(anchor + step, 'CONTINUED_THE_FIRST_RUN_INSTEAD', `${anchor} + ${step}`, 1),
    mk(f(firsts[2]) + step, 'CONTINUED_THE_SECOND_RUN_INSTEAD', `${f(firsts[2])} + ${step}`, 1),
    mk(anchor * 2, 'TREATED_AS_GEOMETRIC', `${anchor} × 2`, 2),
    mk(f(anchor - step), 'APPLIED_THE_RULE_TO_THE_WRONG_TERM', `القاعدة مطبقة على ${anchor - step} بدل ${anchor}`, 2),
    mk(f(anchor + step), 'APPLIED_THE_RULE_TO_THE_WRONG_TERM', `القاعدة مطبقة على ${anchor + step} بدل ${anchor}`, 2),
    mk(anchor + f(firsts[2]), 'USED_WRONG_OPERATION_IN_ALTERNATION', `${anchor} + ${f(firsts[2])}`, 2),
    mk(f(anchor) - anchor, 'STOPPED_AT_INTERMEDIATE_TOTAL', `${f(anchor)} − ${anchor}`, 2)
  ]);
  return buildBase(ctx, {
    templateId: 'SEQ_M_PAIR_RULE',
    subskill: 'حدود مزدوجة: الثاني دالة في الأول',
    difficulty: 'medium',
    scenario: 'paired_terms',
    question: 'ما العدد التالي في المتتالية؟',
    displayExpression: `${flat.join('، ')}، ؟`,
    correct, distractors, format: v => num(v),
    steps: [
      `الحدود تأتي في أزواج: (${firsts[0]}، ${f(firsts[0])})، و(${firsts[1]}، ${f(firsts[1])})، و(${firsts[2]}، ${f(firsts[2])}).`,
      `أول كل زوج يزيد بمقدار ثابت: ${firsts[1]} − ${firsts[0]} = ${step}، و${firsts[2]} − ${firsts[1]} = ${step}، و${firsts[3]} − ${firsts[2]} = ${step}.`,
      `وثاني كل زوج هو ${ruleText}: ${kind === 'square' ? `${firsts[0]} × ${firsts[0]}` : kind === 'triple' ? `${firsts[0]} × 3` : `${firsts[0]} × ${firsts[0] + 1}`} = ${f(firsts[0])}.`,
      `إذن الحد المطلوب هو ثاني الزوج الرابع = ${kind === 'square' ? `${anchor} × ${anchor}` : kind === 'triple' ? `${anchor} × 3` : `${anchor} × ${anchor + 1}`} = ${correct}.`
    ],
    howToStart: 'جرب قراءة الحدود اثنين اثنين قبل أن تبحث عن فرق ثابت.',
    remember: 'قد تكون العلاقة بين حدين متجاورين لا بين كل حد والذي يليه.',
    fastMethod: 'اقرأ الأزواج، ثم طبّق قاعدة الزوج على أول الزوج الأخير.',
    estimatedSteps: 4, conceptTags: ['sequence', 'grouped-terms'],
    parameters: {pairStep: step, firstOfFirstPair: first, shownTerms: flat, lastFirst: anchor,
      lastFirstSuccessor: anchor + 1, askedTerm: correct},
    reasoningPattern: ['GROUP(2)', kind.toUpperCase()],
    oracle: {
      kind: 'constraint', answerKind: 'number',
      constraints: [
        eq(flat[1], kind === 'square' ? mul(flat[0], flat[0]) : kind === 'triple' ? mul(flat[0], 3) : mul(flat[0], flat[0] + 1)),
        eq(flat[3], kind === 'square' ? mul(flat[2], flat[2]) : kind === 'triple' ? mul(flat[2], 3) : mul(flat[2], flat[2] + 1)),
        eq(flat[5], kind === 'square' ? mul(flat[4], flat[4]) : kind === 'triple' ? mul(flat[4], 3) : mul(flat[4], flat[4] + 1)),
        eq(sub(flat[2], flat[0]), step), eq(sub(flat[4], flat[2]), step), eq(sub(flat[6], flat[4]), step),
        eq(X, kind === 'square' ? mul(anchor, anchor) : kind === 'triple' ? mul(anchor, 3) : mul(anchor, anchor + 1))
      ]
    },
    askedUnknown: 'secondOfPair', stageCount: 3,
    pedagogy: {
      targetSkill: 'GROUPED_TERMS', targetMisconception: 'CONTINUED_THE_FIRST_RUN_INSTEAD',
      wrongMethodValue: anchor + step
    },
    complexityFactors: {reasoningTransformations: 3, conceptCount: 2, stageCount: 3, arithmeticBurden: 3, ruleSearchDepth: 2},
    textParams: false
  });
}

/**
 * The step is the PRODUCT of the digits of the term it is applied to — a
 * digit-derived rule distinct from the digit-sum one, and one whose steps do not
 * grow monotonically, so no difference pattern competes with it.
 */
function digitProductStep(ctx) {
  const {rng} = ctx;
  let seq = null;
  // A zero anywhere in a term makes the product zero and the sequence stalls, so
  // the search skips those starts rather than discovering the stall four terms
  // in. Attempts are generous because the constraint bites: about one start in
  // five survives to a full run.
  for (let t = 0; t < 400; t++) {
    const start = rng.int(12, 89);
    if (String(start).includes('0')) continue;
    const run = [start];
    let ok = true;
    for (let i = 0; i < 4; i++) {
      const d = digitsOf(run.at(-1));
      if (d.includes(0)) { ok = false; break; }
      run.push(run.at(-1) + d.reduce((a, b) => a * b, 1));
    }
    if (!ok) continue;
    if (digitsOf(run.at(-1)).includes(0)) continue;
    if (run.at(-1) > 400) continue;
    if (new Set(run).size !== run.length) continue;
    seq = run;
    break;
  }
  if (!seq) return resample(ctx, digitProductStep);
  const prod = v => digitsOf(v).reduce((a, b) => a * b, 1);
  const anchor = seq.at(-1);
  const correct = anchor + prod(anchor);
  const distractors = usable(ctx, [
    mk(anchor + digitsOf(anchor).reduce((a, b) => a + b, 0), 'USED_DIGIT_SUM_INSTEAD_OF_PRODUCT',
      `${anchor} + (${digitsOf(anchor).join(' + ')})`, 1),
    mk(anchor + prod(seq.at(-2)), 'APPLIED_THE_RULE_TO_THE_WRONG_TERM',
      `${anchor} + ${prod(seq.at(-2))}`, 2),
    mk(anchor * prod(anchor), 'USED_WRONG_OPERATION_IN_ALTERNATION', `${anchor} × ${prod(anchor)}`, 2),
    mk(anchor + (anchor - seq.at(-2)), 'TREATED_AS_ARITHMETIC', `${anchor} + (${anchor} − ${seq.at(-2)})`, 1),
    mk(prod(anchor), 'USED_DIFFERENCE_AS_ANSWER', `حاصل ضرب أرقام ${anchor}`, 1),
    mk(anchor + 2 * prod(anchor), 'APPLIED_STEP_TWICE', `${anchor} + 2 × ${prod(anchor)}`, 2),
    mk(anchor - prod(anchor), 'APPLIED_OPERATION_IN_REVERSE', `${anchor} − ${prod(anchor)}`, 2)
  ]);
  const line = v => `${v} + (${digitsOf(v).join(' × ')}) = ${v + prod(v)}`;
  return buildBase(ctx, {
    templateId: 'SEQ_H_DIGIT_PRODUCT',
    subskill: 'الزيادة تساوي حاصل ضرب أرقام الحد',
    difficulty: 'hard',
    scenario: 'digit_product_step',
    question: 'ما العدد التالي في المتتالية؟',
    displayExpression: `${seq.join('، ')}، ؟`,
    correct, distractors, format: v => num(v),
    steps: [
      `الفروق ليست ثابتة ولا متضاعفة: ${differenceLine(seq)}.`,
      `لكن كل فرق يساوي حاصل ضرب أرقام الحد الذي سبقه: ${line(seq[0])}، و${line(seq[1])}، و${line(seq[2])}، و${line(seq[3])}.`,
      `إذن الحد التالي = ${line(anchor)}.`
    ],
    howToStart: 'إذا لم تنجح الفروق ولا النسب، انظر إلى أرقام الحد نفسه.',
    remember: 'بعض المتتاليات تبني خطوتها من أرقام الحد لا من موضعه.',
    fastMethod: 'اضرب أرقام الحد الأخير ثم أضف الناتج إليه.',
    estimatedSteps: 3, conceptTags: ['sequence', 'digit-rule'],
    // The digits of the last term are parameters of the rule the explanation
    // applies, so they are declared rather than appearing from nowhere.
    parameters: {shownTerms: seq, lastTerm: anchor, lastStep: prod(anchor),
      lastTermDigits: digitsOf(anchor), nextTerm: correct},
    reasoningPattern: ['DIGIT_PRODUCT', 'ADD'],
    oracle: {
      kind: 'constraint', answerKind: 'number',
      constraints: [
        ...seq.slice(1).map((v, i) => eq(v, add(seq[i], prod(seq[i])))),
        eq(X, add(anchor, prod(anchor)))
      ]
    },
    askedUnknown: 'nextTerm', stageCount: 2,
    pedagogy: {
      targetSkill: 'DIGIT_DERIVED_STEP', targetMisconception: 'USED_DIGIT_SUM_INSTEAD_OF_PRODUCT',
      wrongMethodValue: anchor + digitsOf(anchor).reduce((a, b) => a + b, 0)
    },
    complexityFactors: {reasoningTransformations: 3, conceptCount: 2, stageCount: 2, arithmeticBurden: 4, ruleSearchDepth: 3},
    textParams: false
  });
}

/**
 * One printed term breaks an otherwise constant rule. The target is not the
 * continuation at all — it is which term does not belong — so the options ARE
 * the printed run, exactly as in the odd-one-out family.
 */
function wrongTerm(ctx) {
  const {rng} = ctx;
  const kind = rng.pick(['arithmetic', 'geometric']);
  const start = kind === 'arithmetic' ? rng.int(6, 40) : rng.pick([2, 3, 4, 5, 6]);
  const step = kind === 'arithmetic' ? rng.pick([3, 4, 5, 6, 7, 8, 9]) : rng.pick([2, 3]);
  const clean = [start];
  for (let i = 1; i < 6; i++) clean.push(kind === 'arithmetic' ? clean.at(-1) + step : clean.at(-1) * step);
  if (clean.at(-1) > 1500) return resample(ctx, wrongTerm);
  const badIndex = rng.int(1, 4);
  const offset = rng.pick([1, 2, 3]) * (rng.bool(0.5) ? -1 : 1);
  const wrong = clean[badIndex] + offset;
  if (wrong <= 0 || clean.includes(wrong)) return resample(ctx, wrongTerm);
  const shownSeq = clean.map((v, i) => (i === badIndex ? wrong : v));
  if (new Set(shownSeq).size !== shownSeq.length) return resample(ctx, wrongTerm);
  const ruleText = kind === 'arithmetic'
    ? `كل حد يزيد عن الذي قبله بمقدار ${step}`
    : `كل حد يساوي الذي قبله مضروبًا في ${step}`;
  const distractors = usable(ctx, shownSeq.filter((_, i) => i !== badIndex)
    // «يحقق» rather than «يتفق»: the construction table declares the verbs that
    // may follow a numeral, and this is the one the odd-one-out family already
    // uses in exactly this position.
    .map(v => mk(v, 'TERM_OBEYS_THE_RULE', `${v} يحقق القاعدة: ${ruleText}`)));
  return buildBase(ctx, {
    templateId: 'SEQ_M_WRONG_TERM',
    subskill: 'تحديد الحد الذي يخالف القاعدة',
    difficulty: 'medium',
    scenario: 'rule_violation', direction: 'comparison',
    question: 'أي الحدود الآتية لا يتفق مع قاعدة المتتالية؟',
    // The six printed terms are the six options, so the spread between them is
    // the question rather than an out-of-scale distractor.
    stimulusIsOptions: true,
    displayExpression: shownSeq.join('، '),
    correct: wrong, distractors, format: v => num(v),
    steps: [
      `نفحص القاعدة على الحدود الأولى: ${ruleText}.`,
      kind === 'arithmetic'
        ? `الحد الصحيح في هذا الموضع = ${clean[badIndex - 1]} + ${step} = ${clean[badIndex]}.`
        : `الحد الصحيح في هذا الموضع = ${clean[badIndex - 1]} × ${step} = ${clean[badIndex]}.`,
      `المطبوع في ذلك الموضع هو ${wrong}، وهو يخالف القاعدة؛ أما بقية الحدود فتتفق معها.`
    ],
    howToStart: 'استخرج القاعدة من الحدود التي تتفق، ثم اختبر كل حد عليها.',
    remember: 'حد واحد مخالف لا يغير القاعدة، بل يكشف نفسه.',
    fastMethod: 'احسب ما ينبغي أن يكون كل حد وقارنه بالمطبوع.',
    estimatedSteps: 3, conceptTags: ['sequence', 'rule-check'],
    parameters: {rule: kind === 'arithmetic' ? step : step, shownTerms: shownSeq, correctTermAtPosition: clean[badIndex]},
    commutative: null,
    oracle: {
      kind: 'constraint', answerKind: 'number',
      constraints: [eq(X, wrong), eq(clean[badIndex], kind === 'arithmetic'
        ? add(clean[badIndex - 1], step) : mul(clean[badIndex - 1], step))]
    },
    askedUnknown: 'wrongTerm', stageCount: 2,
    pedagogy: {targetSkill: 'RULE_CHECK', targetMisconception: 'TERM_OBEYS_THE_RULE'},
    complexityFactors: {reasoningTransformations: 2, conceptCount: 2, stageCount: 2, arithmeticBurden: 3, ruleSearchDepth: 1},
    textParams: false
  });
}

// --- RC2.8-5. Two jobs this family could not ask -----------------------------
//
// Sixteen sequence templates, and every one of them asked the same thing in the
// end: hand back a NUMBER that belongs in the run. Next term, missing term,
// previous term, the wrong term — four labels for "read the rule, then compute
// a term with it". Measured over a hundred questions, «ما العدد التالي» alone
// took more than half the family's slots.
//
// The two below ask about the RULE rather than about a term, from opposite
// directions:
//
//   SEQ_M_RULE_ID     the run is shown, the rule is not, and the answer IS the
//                     rule. Nothing is computed; a rule is found and then tested
//                     against every printed term.
//   SEQ_M_RULE_APPLY  the rule is stated in words and NO run is shown. The
//                     information layout is inverted — the thing that is
//                     normally inferred is given, and the thing that is normally
//                     given has to be built.

/** Rules as «next = a × current + b», which is what the oracle re-derives. */
function ruleLabel(a, b) {
  if (a === 1) return b > 0 ? `أضف ${b}` : `اطرح ${Math.abs(b)}`;
  if (b === 0) return `اضرب في ${a}`;
  return b > 0 ? `اضرب في ${a} ثم أضف ${b}` : `اضرب في ${a} ثم اطرح ${Math.abs(b)}`;
}

function ruleIdentification(ctx) {
  const {rng} = ctx;
  const a = rng.pick([2, 3, 4]);
  const b = rng.pick([1, 2, 3, 4, 5, -1, -2, -3]);
  const start = rng.int(2, 9);
  const terms = [start];
  for (let i = 1; i < 5; i++) terms.push(terms.at(-1) * a + b);
  if (terms.some(v => v <= 0 || v > 20000)) return resample(ctx, ruleIdentification);
  const correct = ruleLabel(a, b);
  // The offered rules a solver could plausibly settle on: the right multiplier
  // with the offset read off the first step only, the multiplier alone, the
  // addition alone, and the two halves swapped. Each is a real way of reading
  // this run, and the oracle rejects the item if any of them also explains it.
  const firstStepOffset = terms[1] - terms[0];
  const candidates = [
    {id: 'intended', a, b, label: correct},
    {id: 'mulOnly', a, b: 0, label: ruleLabel(a, 0)},
    {id: 'addOnly', a: 1, b: firstStepOffset, label: ruleLabel(1, firstStepOffset)},
    {id: 'swapped', a: b === 0 ? a : Math.abs(b), b: a, label: ruleLabel(b === 0 ? a : Math.abs(b), a)},
    {id: 'offByOne', a: a + 1, b, label: ruleLabel(a + 1, b)}
  ];
  const wrong = [
    mk(candidates[1].label, 'IGNORED_THE_OFFSET', 'قراءة الضرب وحده من أول انتقال', 2),
    mk(candidates[2].label, 'CHECKED_ONLY_THE_FIRST_STEP', 'تعميم فرق الانتقال الأول على المتتالية كلها', 1),
    mk(candidates[3].label, 'SWAPPED_THE_TWO_PARTS_OF_THE_RULE', 'تبديل موضعي الضرب والجمع', 2),
    mk(candidates[4].label, 'READ_THE_OFFSET_FROM_THE_WRONG_STEP', 'قراءة مقدار الضرب من انتقال لا يخصه', 2),
    mk(ruleLabel(1, terms[2] - terms[1]), 'CHECKED_ONLY_THE_FIRST_STEP', 'تعميم فرق الانتقال الثاني على المتتالية كلها', 1)
  ];
  // Two of the offered readings can collapse onto the same wording — «multiply
  // by 2» is both the multiplier alone and the swap when the offset is 2 — and
  // an option list with a repeated choice is not a question. Drawn again rather
  // than padded.
  const seenLabels = new Set([correct]);
  const distractors = wrong.filter(d => !seenLabels.has(d.value) && seenLabels.add(d.value));
  if (distractors.length < 4) return resample(ctx, ruleIdentification);
  return buildBase(ctx, {
    templateId: 'SEQ_M_RULE_ID',
    subskill: 'استنتاج قاعدة المتتالية',
    difficulty: 'medium',
    question: 'أيُّ القواعد الآتية تولّد كل حد من الحد الذي قبله في هذه المتتالية؟',
    displayExpression: terms.join('، '),
    correct, distractors, format: v => String(v),
    steps: [
      `الفرق الأول = ${terms[1]} − ${terms[0]} = ${terms[1] - terms[0]}.`,
      `الفرق الثاني = ${terms[2]} − ${terms[1]} = ${terms[2] - terms[1]}، وهو يخالف الأول، فالقاعدة ليست جمع مقدار ثابت.`,
      `نجرب الضرب في ${a}: ${terms[0]} × ${a} = ${terms[0] * a}، ثم ${terms[0] * a} ${b >= 0 ? '+' : '−'} ${Math.abs(b)} = ${terms[1]}.`,
      `نتحقق من القاعدة نفسها على الحد التالي: ${terms[1]} × ${a} = ${terms[1] * a}، ثم ${terms[1] * a} ${b >= 0 ? '+' : '−'} ${Math.abs(b)} = ${terms[2]}.`,
      `وعلى الحد الذي يليه: ${terms[2]} × ${a} = ${terms[2] * a}، ثم ${terms[2] * a} ${b >= 0 ? '+' : '−'} ${Math.abs(b)} = ${terms[3]}.`
    ],
    howToStart: 'قارن الفروق أولًا: إن اختلفت فالقاعدة ليست جمعًا ثابتًا.',
    remember: 'القاعدة الصحيحة هي التي تصحّ على كل الحدود، لا على أول انتقال فقط.',
    fastMethod: 'اقسم كل حد على الذي قبله لتقدير مقدار الضرب، ثم اقرأ الباقي الثابت.',
    estimatedSteps: 3, conceptTags: ['sequence', 'rule-discovery'],
    // Every printed term is a declared parameter, so the worked explanation can
    // name them without inventing a value the item never showed.
    parameters: {multiplier: a, offset: b, firstTerm: start, shownTerms: terms},
    oracle: {kind: 'ruleChoice', terms, candidates, intendedId: 'intended'},
    askedUnknown: 'generatingRule', stageCount: 2,
    pedagogy: {
      targetSkill: 'FIND_THE_RULE', targetMisconception: 'CHECKED_ONLY_THE_FIRST_STEP',
      wrongMethodValue: candidates[2].label,
      degenerateWhen: [{when: b === 0, note: 'a pure multiplier needs no offset to be found'}]
    },
    complexityFactors: {reasoningTransformations: 2, conceptCount: 2, stageCount: 2, arithmeticBurden: 3},
    textParams: false
  });
}

function ruleApplication(ctx) {
  const {rng} = ctx;
  const a = rng.pick([2, 3]);
  const b = rng.pick([2, 3, 4, 5, 6, 7]);
  const start = rng.int(3, 12);
  const steps = rng.int(3, 4);
  const run = [start];
  for (let i = 0; i < steps; i++) run.push(run.at(-1) * a + b);
  const correct = run.at(-1);
  if (correct > 20000) return resample(ctx, ruleApplication);
  const ordinal = {3: 'الرابع', 4: 'الخامس'}[steps];
  // The slips are the ones the STATED rule invites: doing the addition before
  // the multiplication, dropping one half of it, or stopping one term short.
  // Built as an expression as well as a value: a derivation that does not
  // evaluate to the option beside it is a false claim, and the pipeline refuses
  // the item rather than printing one.
  let wrongOrder = start;
  let wrongOrderExpr = String(start);
  for (let i = 0; i < steps; i++) {
    wrongOrder = (wrongOrder + b) * a;
    wrongOrderExpr = `(${wrongOrderExpr} + ${b}) × ${a}`;
  }
  let mulOnly = start;
  for (let i = 0; i < steps; i++) mulOnly *= a;
  const distractors = usable(ctx, [
    mk(wrongOrder, 'APPLIED_THE_STEPS_IN_THE_WRONG_ORDER', wrongOrderExpr, 1),
    mk(mulOnly, 'IGNORED_THE_OFFSET', [start, ...Array(steps).fill(a)].join(' × '), 1),
    mk(start + steps * b, 'IGNORED_THE_MULTIPLIER', `${start} + ${steps} × ${b}`, 1),
    mk(run[steps - 1], 'APPLIED_THE_RULE_TO_THE_WRONG_TERM', `${run[steps - 2]} × ${a} + ${b}`, 2),
    mk(run.at(-1) * a + b, 'APPLIED_STEP_TWICE', `${run.at(-1)} × ${a} + ${b}`, 2)
  ]);
  return buildBase(ctx, {
    templateId: 'SEQ_M_RULE_APPLY',
    subskill: 'تطبيق قاعدة معطاة لبناء متتالية',
    difficulty: 'medium',
    question: `متتالية حدها الأول ${start}، وكل حد بعده يُحسب بضرب الحد السابق في ${a} ثم إضافة ${b}. ما الحد ${ordinal}؟`,
    correct, distractors, format: v => num(v),
    steps: run.slice(1).map((v, i) =>
      `الحد ${['الثاني', 'الثالث', 'الرابع', 'الخامس'][i]} = ${run[i]} × ${a} + ${b} = ${v}.`),
    howToStart: 'ابدأ من الحد الأول وطبّق القاعدة خطوة بخطوة.',
    remember: 'رتّب العمليتين كما نصّت القاعدة: الضرب أولًا ثم الإضافة.',
    fastMethod: 'اكتب الحدود واحدًا تلو الآخر؛ القاعدة قصيرة والخطأ يأتي من عكس ترتيبها.',
    estimatedSteps: steps, conceptTags: ['sequence', 'rule-application'],
    parameters: {firstTerm: start, multiplier: a, offset: b, termIndex: steps + 1},
    oracle: {
      kind: 'constraint', answerKind: 'number',
      constraints: [eq(X, run.at(-1))]
    },
    askedUnknown: 'termFromStatedRule', stageCount: 2,
    pedagogy: {
      targetSkill: 'APPLY_A_STATED_RULE', targetMisconception: 'APPLIED_THE_STEPS_IN_THE_WRONG_ORDER',
      wrongMethodValue: wrongOrder,
      degenerateWhen: [{when: b === 0, note: 'with no offset the order of the two steps cannot be got wrong'}]
    },
    complexityFactors: {reasoningTransformations: 2, conceptCount: 1, stageCount: 2, arithmeticBurden: steps},
    textParams: {essentialParams: ['firstTerm', 'multiplier', 'offset']}
  });
}

// --- RC2.9-4. Two more jobs, and two more ways to read a run ----------------
//
// The independent review counted about three genuine rule families reaching a
// reader, and told us not to answer it by renaming «next term» to «fourth
// term». These do not rename anything: one hides an OPERATION rather than a
// term, and one asks which of several numbers could belong to the run at all.
// Both are questions about the rule, neither is a term computation, and neither
// can be produced by reparameterising something that already existed.

function missingOperation(ctx) {
  const {rng} = ctx;
  // A run built from two operations applied in turn, with one of them hidden.
  const factor = rng.pick([2, 3, 4]);
  const increment = rng.pick([2, 3, 4, 5, 6, 7]);
  const start = rng.int(2, 9);
  const seq = [start];
  for (let i = 0; i < 4; i++) seq.push(i % 2 === 0 ? seq.at(-1) * factor : seq.at(-1) + increment);
  if (seq.some(v => v > 9000)) return resample(ctx, missingOperation);
  // The hidden step is always a multiplication, so the answer is one operation
  // and the run around it settles which.
  const hiddenAt = 1;
  const shown = seq.map((v, i) => String(v));
  const correct = `× ${factor}`;
  const offered = [
    [`× ${factor + 1}`, 'READ_THE_OFFSET_FROM_THE_WRONG_STEP', 'مقدار ضرب مأخوذ من انتقال لا يخصه'],
    [`+ ${increment}`, 'USED_WRONG_OPERATION_IN_ALTERNATION', 'عملية الخطوة الأخرى في غير موضعها'],
    [`+ ${seq[1] - seq[0]}`, 'CHECKED_ONLY_THE_FIRST_STEP', 'قراءة الانتقال كأنه جمع لفرق ثابت'],
    [`× ${factor - 1 > 1 ? factor - 1 : factor + 2}`, 'IGNORED_THE_MULTIPLIER', 'مقدار ضرب لا يفسّر الانتقال'],
    [`− ${increment}`, 'APPLIED_OPERATION_IN_REVERSE', 'العملية في الاتجاه المعاكس']
  ];
  const seen = new Set([correct]);
  const distractors = usable(ctx, offered
    .filter(([v]) => !seen.has(v) && seen.add(v))
    .map(([v, id, why]) => mk(v, id, why)));
  if (distractors.length < 5) return resample(ctx, missingOperation);
  return buildBase(ctx, {
    templateId: 'SEQ_M_MISSING_OP',
    subskill: 'العملية المفقودة بين حدين',
    difficulty: 'medium',
    question: 'في المتتالية الآتية تتناوب عمليتان. ما العملية التي تنقل الحد الأول إلى الحد الثاني؟',
    displayExpression: shown.join('، '),
    correct, distractors, format: v => String(v),
    steps: [
      `الفرق في الانتقال من ${seq[1]} إلى ${seq[2]} هو ${seq[2]} − ${seq[1]} = ${increment}.`,
      `والانتقال من ${seq[2]} إلى ${seq[3]} هو ضرب: ${seq[2]} × ${factor} = ${seq[3]}.`,
      `والعمليتان تتناوبان، فالانتقال الأول يكون ضربًا: ${seq[0]} × ${factor} = ${seq[1]}.`
    ],
    howToStart: 'اقرأ الانتقالات التي تراها كاملة أولًا، فهي تكشف العمليتين وترتيبهما.',
    remember: 'في التناوب، موضع العملية يحدده ترتيب الانتقال لا حجم القفزة.',
    fastMethod: 'اقسم الحد الثاني على الحد الأول لترى مقدار الضرب مباشرة.',
    estimatedSteps: 3, conceptTags: ['sequence', 'rule-discovery', 'alternation'],
    parameters: {multiplier: factor, offset: increment, firstTerm: start, shownTerms: seq},
    // The oracle solves for the MULTIPLIER the hidden step must carry, from the
    // two terms as printed, and the label maps that number onto the operation
    // the item offers as an answer.
    oracle: {
      kind: 'search', answerKind: 'number', domain: grid(2, 12),
      constraints: [eq(mul(X, seq[0]), seq[1])],
      labels: Object.fromEntries(Array.from({length: 11}, (_, k) => [String(k + 2), `× ${k + 2}`]))
    },
    askedUnknown: 'missingOperation', stageCount: 2,
    pedagogy: {
      targetSkill: 'FIND_THE_MISSING_OPERATION', targetMisconception: 'USED_WRONG_OPERATION_IN_ALTERNATION',
      wrongMethodValue: `+ ${increment}`,
      degenerateWhen: [{when: factor === 1, note: 'a multiplier of one is not an operation to find'}]
    },
    complexityFactors: {reasoningTransformations: 2, conceptCount: 2, stageCount: 2, arithmeticBurden: 3},
    textParams: false
  });
}

function candidateSelection(ctx) {
  const {rng} = ctx;
  // A rule the run states clearly, and five numbers that do not obey it.
  const step = rng.pick([4, 6, 7, 8, 9, 11, 12]);
  const start = rng.int(3, 20);
  const seq = Array.from({length: 4}, (_, i) => start + i * step);
  // The answer is a term further along the same run — not the next one, so the
  // question cannot be answered by adding the step once without thinking.
  const ahead = rng.int(3, 6);
  const correct = seq.at(-1) + ahead * step;
  const offered = [
    [correct + 1, 'NEAR_MISS_ON_THE_PROPERTY', 'عدد أكبر من أحد الحدود بواحد'],
    [correct - 1, 'NEAR_MISS_ON_THE_PROPERTY', 'عدد أصغر من أحد الحدود بواحد'],
    [seq.at(-1) + step * ahead - Math.trunc(step / 2), 'CHECKED_ONLY_THE_FIRST_STEP', 'قفزة مقدارها نصف الفرق الثابت'],
    [start + ahead * step, 'APPLIED_THE_RULE_TO_THE_WRONG_TERM', 'العدّ من الحد الأول بدل الحد الأخير'],
    [correct + step - 1, 'NEAR_MISS_ON_THE_PROPERTY', 'عدد يقع بين حدين متتاليين'],
    [correct + 2, 'NEAR_MISS_ON_THE_PROPERTY', 'عدد أكبر من أحد الحدود باثنين']
  ];
  const seen = new Set([correct]);
  const distractors = usable(ctx, offered
    .filter(([v]) => v > 0 && (v - start) % step !== 0 && !seen.has(v) && seen.add(v))
    .map(([v, id, why]) => mk(v, id, why)));
  if (distractors.length < 5) return resample(ctx, candidateSelection);
  return buildBase(ctx, {
    templateId: 'SEQ_M_CANDIDATE',
    subskill: 'اختيار عدد ينتمي إلى المتتالية',
    difficulty: 'medium',
    question: 'إذا استمرت المتتالية الآتية على قاعدتها، فأيُّ الأعداد الآتية يمكن أن يكون أحد حدودها؟',
    displayExpression: `${seq.join('، ')}، …`,
    correct, distractors, format: v => num(v),
    steps: [
      `الفرق الثابت = ${seq[1]} − ${seq[0]} = ${step}.`,
      `كل حد يساوي الحد الأول مضافًا إليه مضاعفات الفرق الثابت.`,
      `نطرح الحد الأول من كل خيار ونختبر القسمة على الفرق: ${correct} − ${start} = ${correct - start}، ثم ${correct - start} ÷ ${step} = ${(correct - start) / step}.`
    ],
    howToStart: 'اطرح الحد الأول من كل خيار واختبر إن كان الباقي من مضاعفات الفرق.',
    remember: 'الانتماء إلى متتالية لا يعني أن يكون العدد هو الحد التالي مباشرة.',
    fastMethod: 'العدد ينتمي إذا كان ناتج (العدد − الحد الأول) ÷ الفرق عددًا صحيحًا موجبًا.',
    estimatedSteps: 3, conceptTags: ['sequence', 'membership'],
    parameters: {firstTerm: start, step, shownTerms: seq},
    oracle: {
      kind: 'constraint', answerKind: 'number',
      constraints: [eq(X, add(start, mul(step, (correct - start) / step)))]
    },
    askedUnknown: 'sequenceMember', stageCount: 2,
    pedagogy: {
      targetSkill: 'TEST_MEMBERSHIP_OF_A_RUN', targetMisconception: 'NEAR_MISS_ON_THE_PROPERTY',
      wrongMethodValue: start + ahead * step,
      degenerateWhen: [{when: step === 1, note: 'every integer belongs when the step is one'}]
    },
    complexityFactors: {reasoningTransformations: 2, conceptCount: 1, stageCount: 2, arithmeticBurden: 3},
    textParams: false
  });
}

// ---------------------------------------------------------------------------
// RC2.9.4-B2. Two more EASY constructions. Both EASY templates show a run and
// ask the term next to it. These ask two other jobs: a FAR term of a rule
// stated in words (the closed form, not one step), and how many terms a run
// with a shown last term holds (an interval counted in steps).
// ---------------------------------------------------------------------------

const ORDINAL_TERM = {8: 'الثامن', 10: 'العاشر', 12: 'الثاني عشر', 15: 'الخامس عشر', 20: 'العشرون', 25: 'الخامس والعشرون'};

function nthTermFromRule(ctx) {
  const {rng} = ctx;
  const first = rng.int(2, 15);
  const step = rng.pick([3, 4, 5, 6, 7, 8, 9]);
  const n = rng.pick([8, 10, 12, 15, 20, 25]);
  const correct = first + (n - 1) * step;
  const params = {firstTerm: first, commonDifference: step, termIndex: n};
  const distractors = usable(ctx, [
    mk(first + n * step, 'OFF_BY_ONE_STEP', `${first} + ${n} × ${step}`, 1),
    mk(first + (n - 2) * step, 'OFF_BY_ONE_STEP', `${first} + (${n} − 2) × ${step}`, 1),
    mk(n * step, 'MISSED_ONE_STAGE', `${n} × ${step}`, 2),
    mk(first * n, 'MULTIPLIED_COUNTS_INSTEAD_OF_RATE', `${first} × ${n}`, 1),
    mk((first + step) * (n - 1), 'APPLIED_THE_STEPS_IN_THE_WRONG_ORDER', `(${first} + ${step}) × (${n} − 1)`, 2),
    mk(first + step, 'STOPPED_AFTER_FIRST_STAGE', `${first} + ${step}`, 2),
    mk(first * step + n, 'MISREAD_THE_STEP', `${first} × ${step} + ${n}`, 1)
  ]);
  if (distinctValues(distractors.filter(d => d.value !== correct)) < 5) return resample(ctx, nthTermFromRule);
  return buildBase(ctx, {
    templateId: 'SEQ_E_NTH_TERM',
    subskill: 'حد بعيد في متتالية حسابية من قاعدتها',
    difficulty: 'easy',
    question: `متتالية حسابية، حدها الأول يساوي ${first}، والفرق الثابت بين حدودها يساوي ${step}. ما الحد ${ORDINAL_TERM[n]}؟`,
    correct, distractors, format: v => num(v),
    steps: [
      `عدد مرات إضافة الفرق من الحد الأول إلى الحد ${ORDINAL_TERM[n]} = ${n} − 1 = ${n - 1}.`,
      `الحد ${ORDINAL_TERM[n]} = ${first} + ${n - 1} × ${step} = ${correct}.`
    ],
    howToStart: 'عدّ كم مرة يُضاف الفرق: عدد الحد ناقص واحد.',
    remember: 'الحد النوني = الحد الأول + (ن − 1) × الفرق.',
    fastMethod: `الحد الأول + (رقم الحد − 1) × الفرق — هنا ${first} + ${n - 1} × ${step}.`,
    estimatedSteps: 2, conceptTags: ['sequence', 'arithmetic-progression', 'closed-form'], parameters: params,
    reasoningPattern: [`ADD(${step})`],
    oracle: {kind: 'constraint', answerKind: 'number', constraints: [eq(X, add(first, mul(n - 1, step)))]},
    askedUnknown: 'termFromStatedRule', stageCount: 1,
    pedagogy: {
      targetSkill: 'NTH_TERM_FORMULA', targetMisconception: 'OFF_BY_ONE_STEP',
      wrongMethodValue: first + n * step
    },
    complexityFactors: {reasoningTransformations: 2, conceptCount: 1, stageCount: 1, arithmeticBurden: 2},
    textParams: {essentialParams: ['firstTerm', 'commonDifference']}
  });
}

function countTerms(ctx) {
  const {rng} = ctx;
  const first = rng.int(2, 20);
  const step = rng.pick([3, 4, 5, 6, 7, 8]);
  const correct = rng.pick([9, 10, 11, 12, 13, 14, 15, 16, 18, 20]);
  const last = first + (correct - 1) * step;
  if (correct === step || correct === first) return resample(ctx, countTerms);
  const shown = [first, first + step, first + 2 * step, first + 3 * step];
  const params = {firstTerm: first, commonDifference: step, lastTerm: last, shownTerms: shown};
  const distractors = usable(ctx, [
    mk((last - first) / step, 'OFF_BY_ONE_STEP', `(${last} − ${first}) ÷ ${step}`, 2),
    mk((last - first) / step + 2, 'APPLIED_STEP_TWICE', `(${last} − ${first}) ÷ ${step} + 2`, 2),
    mk(last - first, 'STOPPED_AT_INTERMEDIATE_TOTAL', `${last} − ${first}`, 1),
    mk(last / step, 'MISSED_ONE_STAGE', `${last} ÷ ${step}`, 1),
    mk(step, 'USED_DIFFERENCE_AS_ANSWER', `الفرق الثابت ${step}`, 1),
    mk(last - first + 1, 'MISREAD_THE_STEP', `${last} − ${first} + 1`, 2)
  ], {maxDecimals: 1});
  if (distinctValues(distractors.filter(d => d.value !== correct)) < 5) return resample(ctx, countTerms);
  return buildBase(ctx, {
    templateId: 'SEQ_E_COUNT_TERMS',
    subskill: 'عدد حدود متتالية حسابية من أولها وآخرها',
    difficulty: 'easy',
    question: 'كم حدًّا في هذه المتتالية؟',
    displayExpression: `${shown.join('، ')}، …، ${last}`,
    correct, distractors, format: v => num(v),
    steps: [
      `الفرق الثابت = ${shown[1]} − ${shown[0]} = ${step}.`,
      `عدد الخطوات من الحد الأول إلى الأخير = (${last} − ${first}) ÷ ${step} = ${correct - 1}.`,
      `عدد الحدود = ${correct - 1} + 1 = ${correct}.`
    ],
    howToStart: 'احسب كم خطوة من الحد الأول إلى الأخير، ثم أضف الحد الأول نفسه.',
    remember: 'عدد الحدود = (الأخير − الأول) ÷ الفرق + 1.',
    fastMethod: `اقسم المسافة بين الحدين الأول والأخير على الفرق ثم أضف واحدًا — هنا (${last} − ${first}) ÷ ${step} + 1.`,
    estimatedSteps: 3, conceptTags: ['sequence', 'arithmetic-progression', 'counting'], parameters: params,
    reasoningPattern: [`ADD(${step})`],
    oracle: {kind: 'constraint', answerKind: 'number', constraints: [eq(add(first, mul(sub(X, 1), step)), last)]},
    askedUnknown: 'termCount', stageCount: 2,
    pedagogy: {
      targetSkill: 'COUNT_TERMS_BY_STEPS', targetMisconception: 'OFF_BY_ONE_STEP',
      wrongMethodValue: (last - first) / step
    },
    complexityFactors: {reasoningTransformations: 2, conceptCount: 1, stageCount: 2, arithmeticBurden: 3},
    textParams: false
  });
}

/**
 * RC2.9.5 §4. EASY: the first term of an arithmetic run that passes a bound.
 *
 * FIND_THRESHOLD, which the EASY band did not hold: the solver walks the run
 * forward until a condition turns, rather than reading a term off a position.
 */
function firstTermAbove(ctx) {
  const {rng} = ctx;
  const first = rng.int(3, 12);
  const step = rng.pick([4, 5, 6, 7, 8]);
  const shown = [first, first + step, first + 2 * step, first + 3 * step];
  const jumps = rng.int(5, 9);
  const bound = first + jumps * step - rng.int(1, step - 1);
  const k = Math.ceil((bound - shown[0] + 1) / step);
  const correct = shown[0] + k * step;
  if (correct <= shown.at(-1) || correct > 400) return resample(ctx, firstTermAbove);
  // Every derivation is written from the GIVENS — the first term, the step and
  // the bound — so no wrong option is explained by the answer's own value.
  const distractors = usable(ctx, [
    mk(first + (k - 1) * step, 'OFF_BY_ONE_STEP', `${first} + ${step} × ${k - 1}`),
    mk(first + (k + 1) * step, 'OFF_BY_ONE_STEP', `${first} + ${step} × ${k + 1}`),
    mk(bound, 'USED_GIVEN_VALUE_AS_ANSWER', `الحد المعطى في الشرط ${bound}`),
    mk(bound + step, 'APPLIED_STEP_TWICE', `${bound} + ${step}`),
    mk(shown.at(-1) + step, 'STOPPED_AFTER_FIRST_STAGE', `${shown.at(-1)} + ${step}`),
    mk(first + (k + 2) * step, 'APPLIED_STEP_TWICE', `${first} + ${step} × ${k + 2}`),
    mk(first + (k - 2) * step, 'MISREAD_THE_STEP', `${first} + ${step} × ${k - 2}`)
  ]);
  if (distinctValues(distractors.filter(d => d.value !== correct)) < 5) return resample(ctx, firstTermAbove);
  return buildBase(ctx, {
    templateId: 'SEQ_E_FIRST_ABOVE',
    subskill: 'أول حد يتجاوز قيمة معلومة',
    difficulty: 'easy',
    question: `متتالية حسابية تبدأ بالحد ${first} وفرقها الثابت ${step}. ما أول حد فيها يتجاوز ${bound}؟`,
    displayExpression: `${shown.join('، ')}، …`,
    correct, distractors, format: v => num(v),
    steps: [
      `نتقدم بالفرق ${step} من ${first} حتى نتجاوز ${bound}.`,
      `أول حد يتجاوزه هو ${correct}.`
    ],
    howToStart: 'تقدّم بالفرق حدًّا حدًّا حتى تتجاوز القيمة المذكورة، ثم توقف.',
    remember: '«يتجاوز» تعني أكبر منها تمامًا، لا مساوية لها.',
    fastMethod: `أضف الفرق الثابت تكرارًا حتى تتجاوز القيمة — هنا ابدأ من ${first} وأضف ${step} حتى تتخطى ${bound}.`,
    estimatedSteps: 2, conceptTags: ['sequence', 'threshold'],
    parameters: {firstTerm: first, commonDifference: step, bound, jumpCount: k, answerTerm: correct, shownTerms: shown},
    reasoningPattern: [`ADD(${step})`],
    oracle: {kind: 'search', answerKind: 'number', domain: grid(first, first + 60 * step, step),
      constraints: [gt(X, bound), gte(add(bound, 1), sub(X, step - 1))]},
    askedUnknown: 'firstTermAboveBound', stageCount: 1,
    pedagogy: {targetSkill: 'WALK_TO_THRESHOLD', targetMisconception: 'OFF_BY_ONE_STEP',
      wrongMethodValue: correct - step},
    complexityFactors: {reasoningTransformations: 2, conceptCount: 1, stageCount: 1, arithmeticBurden: 2},
    textParams: {derivedFromParams: ['jumpCount', 'answerTerm', 'shownTerms'],
      essentialParams: ['firstTerm', 'commonDifference', 'bound']}
  });
}

/** RC2.9.5 §4. EASY: the sum of the terms shown — a total, not a term. */
function sumOfShownTerms(ctx) {
  const {rng} = ctx;
  const first = rng.int(2, 14);
  const step = rng.pick([3, 4, 5, 6, 7]);
  const count = rng.pick([4, 5]);
  const terms = Array.from({length: count}, (_, i) => first + i * step);
  const correct = terms.reduce((a, b) => a + b, 0);
  const distractors = usable(ctx, [
    mk(terms.at(-1), 'STOPPED_AFTER_FIRST_STAGE', `آخر حد معروض ${terms.at(-1)}`),
    mk(correct - terms.at(-1), 'MISSED_ONE_STAGE', `${terms.slice(0, -1).join(' + ')}`),
    mk(terms.reduce((a, b) => a + b, terms.at(-1) + step), 'OFF_BY_ONE_STEP', `${terms.join(' + ')} + ${terms.at(-1) + step}`),
    mk(terms[0] * count, 'RATE_APPLIED_TO_WRONG_COUNT', `${terms[0]} × ${count}`),
    mk(terms.at(-1) * count, 'RATE_APPLIED_TO_WRONG_COUNT', `${terms.at(-1)} × ${count}`),
    mk(terms.reduce((a, b) => a + b, 0) * 2, 'APPLIED_STEP_TWICE', `(${terms.join(' + ')}) × 2`),
    mk(terms.slice(1).reduce((a, b) => a + b, 0), 'MISSED_ONE_STAGE', `${terms.slice(1).join(' + ')}`)
  ]);
  if (distinctValues(distractors.filter(d => d.value !== correct)) < 5) return resample(ctx, sumOfShownTerms);
  return buildBase(ctx, {
    templateId: 'SEQ_E_SUM_SHOWN',
    subskill: 'مجموع حدود متتالية معروضة',
    difficulty: 'easy',
    question: 'ما مجموع الحدود المعروضة في المتتالية الآتية؟',
    displayExpression: terms.join('، '),
    correct, distractors, format: v => num(v),
    steps: [`المجموع = ${terms.join(' + ')} = ${correct}.`],
    howToStart: 'اجمع الحدود المعروضة كما هي؛ لا يلزم إيجاد حد جديد.',
    remember: 'السؤال عن مجموع ما هو معروض، لا عن الحد التالي.',
    fastMethod: `مجموع حدود معروضة = جمعها كما هي — هنا ${terms.join(' + ')}.`,
    estimatedSteps: 1, conceptTags: ['sequence', 'sum'],
    parameters: {terms},
    orderInsensitive: ['terms'],
    oracle: {kind: 'constraint', answerKind: 'number', constraints: [eq(X, correct)]},
    askedUnknown: 'sumOfShownTerms', stageCount: 1,
    pedagogy: {targetSkill: 'SUM_SHOWN_TERMS', targetMisconception: 'STOPPED_AFTER_FIRST_STAGE',
      wrongMethodValue: terms.at(-1)},
    complexityFactors: {reasoningTransformations: 1, conceptCount: 1, stageCount: 1, arithmeticBurden: 2},
    textParams: {essentialParams: ['terms']}
  });
}
