// Numeric sequences.
//
// Section 1-A: the oracle for this family checks the extracted rule against
// *every* known term, not only the last one. A sequence whose printed terms do
// not all obey the stated rule yields no surviving candidate at all, so a
// malformed run is rejected rather than published with a plausible-looking key.

import {mk, usable, num, buildBase, eq, X, add, sub, mul, div, resample} from './_shared.js';

export function generateSequences({difficulty, rng, seed, engineVersion, telemetry}) {
  const ctx = {
    difficulty, rng, seed, engineVersion,
    family: 'sequences', family_ar: 'المتتاليات العددية', category: 'المتتاليات العددية'
  };
  const templates = difficulty === 'easy' ? [arithmetic, geometric]
    : difficulty === 'medium' ? [increasingDifferences, alternatingOps, interleaved, doublingDifferences]
    : [alternateDivide, recurrence, powersPlusIndex];
  return rng.pick(templates)(ctx);
}

/** Differences written as the subtractions that produce them (Section 8-C). */
function differenceLine(seq) {
  return seq.slice(1).map((v, i) => `${v} − ${seq[i]} = ${v - seq[i]}`).join('، ');
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
  const direction = rng.pick(['nextTerm', 'missingMiddleTerm', 'previousTerm']);
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
      `نحسب الفروق بين الحدود المعلومة: ${differenceLine(known)}.`,
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
  const direction = rng.pick(directions);
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
    difficulty: 'medium',
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
    difficulty: 'hard',
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
  const correct = basePow ** (n + 1) + (n + 1);
  const p = basePow ** (n + 1);
  // RC2-012. Built from the power and the position index, which are the two
  // quantities the solution actually handles.
  //   step 1  subtracting the position index from each term
  //   step 2  identifying the next power
  //   step 3  adding the next position index back
  const distractors = usable(ctx, [
    mk(p, 'MISSED_ONE_STAGE', `${basePow} مرفوعًا للقوة التالية = ${p} دون إضافة رقم الترتيب`, 3),
    mk(p + n, 'MISREAD_THE_STEP', `${p} + ${n} برقم الموضع السابق`, 3),
    mk(p + n + 2, 'MISREAD_THE_STEP', `${p} + ${n + 2} برقم موضع متقدم`, 3),
    mk(basePow ** n + (n + 1), 'APPLIED_PREVIOUS_STEP', `${basePow ** n} + ${n + 1}`, 2),
    mk(p * basePow + n + 2, 'APPLIED_STEP_TWICE', `${p} × ${basePow} + ${n + 2}`, 2),
    mk(seq.at(-1) * basePow, 'TREATED_AS_GEOMETRIC', `${seq.at(-1)} × ${basePow} بضرب الحد كاملًا`, 1),
    mk(p - (n + 1), 'APPLIED_OPERATION_IN_REVERSE', `${p} − ${n + 1}`, 3),
    mk(seq.at(-1) + basePow ** (n + 1) - basePow ** n, 'APPLIED_PREVIOUS_STEP', `${seq.at(-1)} + (${p} − ${basePow ** n})`, 2)
  ]);
  const powerLine = seq.map((v, i) => `${v} − ${startIndex + i} = ${v - (startIndex + i)}`).join('، ');
  return buildBase(ctx, {
    templateId: 'SEQ_H_POW_INDEX',
    subskill: 'قوة عدد مع رقم ترتيب الحد',
    difficulty: 'hard',
    question: 'ما العدد التالي في المتتالية؟',
    displayExpression: `${seq.join('، ')}، ؟`,
    correct, distractors, format: v => num(v),
    steps: [
      `نطرح من كل حد رقم موضعه في المتتالية: ${powerLine}.`,
      `النواتج هي قوى العدد ${basePow} بالترتيب، فالقوة التالية = ${basePow ** n} × ${basePow} = ${p}.`,
      `الحد التالي = ${p} + ${n + 1} = ${correct}.`
    ],
    howToStart: 'افحص هل كل حد يجمع بين قوة معروفة ورقم موضعه.',
    remember: 'قد يكون رقم ترتيب الحد جزءًا من القاعدة.',
    fastMethod: `احسب ${basePow} مرفوعًا للقوة التالية ثم أضف رقم الموضع.`,
    estimatedSteps: 4, conceptTags: ['sequence', 'powers'],
    parameters: {powerBase: basePow, startIndex, shownTerms: seq},
    // RC2-023: the reasoning pattern, free of incidental start values.
    reasoningPattern: [`POW_BASE(${basePow})`, 'PLUS_TERM_INDEX'],
    oracle: {
      kind: 'constraint', answerKind: 'number',
      constraints: [
        ...seq.map((v, i) => eq(sub(v, startIndex + i), basePow ** (startIndex + i))),
        eq(sub(X, n + 1), p)
      ]
    },
    askedUnknown: 'nextTerm', stageCount: 2,
    allowedConstants: [0, 1, 2, 3, 4, 5, 6, 7, 8, 100],
    pedagogy: {
      targetSkill: 'POWER_PLUS_INDEX', targetMisconception: 'MISSED_ONE_STAGE',
      wrongMethodValue: p
    },
    complexityFactors: {reasoningTransformations: 4, conceptCount: 3, stageCount: 2, arithmeticBurden: 4},
    textParams: false
  });
}
