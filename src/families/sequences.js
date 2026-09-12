// Numeric sequences.
//
// Section 1-A: the oracle for this family checks the extracted rule against
// *every* known term, not only the last one. A sequence whose printed terms do
// not all obey the stated rule yields no surviving candidate at all, so a
// malformed run is rejected rather than published with a plausible-looking key.

import {mk, usable, num, buildBase, eq, X, add, sub, mul, div} from './_shared.js';

export function generateSequences({difficulty, rng, seed, engineVersion}) {
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
  const distractors = usable([
    mk(correct + step, 'APPLIED_STEP_TWICE', `${correct} + ${step > 0 ? step : `(${step})`}`),
    mk(correct - step, 'APPLIED_PREVIOUS_STEP', `${correct} − ${step > 0 ? step : `(${step})`}`),
    mk(correct + 1, 'OFF_BY_ONE_STEP', `${correct} + 1`),
    mk(correct - 1, 'OFF_BY_ONE_STEP', `${correct} − 1`),
    mk(correct + 2 * step, 'APPLIED_STEP_TWICE', `${correct} + 2 × ${step > 0 ? step : `(${step})`}`),
    mk(correct - 2 * step, 'APPLIED_PREVIOUS_STEP', `${correct} − 2 × ${step > 0 ? step : `(${step})`}`),
    mk(correct * 2, 'USED_WRONG_OPERATION_IN_ALTERNATION', `${correct} × 2`)
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
    fastMethod: `طبّق الفرق الثابت ${step} مرة واحدة.`,
    estimatedSteps: 2, conceptTags: ['sequence', 'arithmetic-progression'],
    parameters: {firstTerm: start, commonDifference: step, shownTerms: seq},
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
      wrongMethodValue: correct + step
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
  if (seq.at(-1) + (divide ? -factor : factor) === correct) return geometric(ctx);
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
  const distractors = usable([
    mk(correct * factor, 'APPLIED_STEP_TWICE', `${correct} × ${factor}`),
    mk(correct / factor, 'APPLIED_PREVIOUS_STEP', `${correct} ÷ ${factor}`),
    mk(correct + factor, 'USED_WRONG_OPERATION_IN_ALTERNATION', `${correct} + ${factor}`),
    mk(correct - factor, 'USED_WRONG_OPERATION_IN_ALTERNATION', `${correct} − ${factor}`),
    mk(seq.at(-1) + (divide ? -factor : factor), 'APPLIED_OPERATION_IN_REVERSE', `${seq.at(-1)} ${divide ? '−' : '+'} ${factor}`),
    mk(correct * 2, 'APPLIED_STEP_TWICE', `${correct} × 2`),
    mk(correct + 1, 'OFF_BY_ONE_STEP', `${correct} + 1`),
    mk(correct - 1, 'OFF_BY_ONE_STEP', `${correct} − 1`),
    mk(seq.at(-1), 'TREATED_PATTERN_AS_CONSTANT', `إعادة الحد الأخير ${seq.at(-1)}`),
    mk(correct * factor * factor, 'APPLIED_STEP_TWICE', `${correct} × ${factor} × ${factor}`),
    mk(seq.at(-1) + seq.at(-2), 'USED_WRONG_OPERATION_IN_ALTERNATION', `${seq.at(-1)} + ${seq.at(-2)}`)
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
    fastMethod: `${divide ? 'اقسم' : 'اضرب'} في ${factor} مرة واحدة.`,
    estimatedSteps: 2, conceptTags: ['sequence', 'geometric-progression'],
    parameters: {firstTerm: seq[0], commonRatio: factor, shownTerms: seq},
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
  const distractors = usable([
    mk(seq.at(-1) + d - diffStep, 'APPLIED_PREVIOUS_STEP', `${seq.at(-1)} + ${d - diffStep}`),
    mk(seq.at(-1) + d + diffStep, 'APPLIED_STEP_TWICE', `${seq.at(-1)} + ${d + diffStep}`),
    mk(correct + diffStep, 'OFF_BY_ONE_STEP', `${correct} + ${diffStep}`),
    mk(correct - diffStep, 'OFF_BY_ONE_STEP', `${correct} − ${diffStep}`),
    mk(correct + 1, 'OFF_BY_ONE_STEP', `${correct} + 1`),
    mk(seq.at(-1) + diffStart, 'TREATED_PATTERN_AS_CONSTANT', `${seq.at(-1)} + ${diffStart}`),
    mk(seq.at(-1) * 2, 'USED_WRONG_OPERATION_IN_ALTERNATION', `${seq.at(-1)} × 2`)
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
      wrongMethodValue: seq.at(-1) + d - diffStep
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
  const distractors = usable([
    mk(current * (multStart + 3), 'USED_WRONG_OPERATION_IN_ALTERNATION', `${current} × ${multStart + 3}`),
    mk(current + nextAdd - 1, 'OFF_BY_ONE_STEP', `${current} + ${nextAdd - 1}`),
    mk(current + nextAdd + 1, 'OFF_BY_ONE_STEP', `${current} + ${nextAdd + 1}`),
    mk(current + addStart + 2, 'APPLIED_PREVIOUS_STEP', `${current} + ${addStart + 2}`),
    mk(current * 2, 'USED_WRONG_OPERATION_IN_ALTERNATION', `${current} × 2`),
    mk(correct + nextAdd, 'APPLIED_STEP_TWICE', `${correct} + ${nextAdd}`),
    mk(current + addStart, 'TREATED_PATTERN_AS_CONSTANT', `${current} + ${addStart}`)
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
  const distractors = usable([
    mk(a0 + 4 * da, 'CONTINUED_WRONG_SUBSEQUENCE', `${oddRun.at(-1)} + ${da}`),
    mk(b0 + 2 * db, 'APPLIED_PREVIOUS_STEP', `${evenRun.at(-2)} ${db < 0 ? '−' : '+'} ${Math.abs(db)}`),
    mk(b0 + 4 * db, 'APPLIED_STEP_TWICE', `${correct} ${db < 0 ? '−' : '+'} ${Math.abs(db)}`),
    mk(correct + 1, 'OFF_BY_ONE_STEP', `${correct} + 1`),
    mk(correct - 1, 'OFF_BY_ONE_STEP', `${correct} − 1`),
    mk(correct + Math.abs(db), 'APPLIED_PREVIOUS_STEP', `${correct} + ${Math.abs(db)}`),
    mk(seq.at(-1) + da, 'CONTINUED_WRONG_SUBSEQUENCE', `${seq.at(-1)} + ${da}`),
    mk(correct + 2 * Math.abs(db), 'APPLIED_PREVIOUS_STEP', `${correct} + ${2 * Math.abs(db)}`),
    mk(correct - Math.abs(db), 'APPLIED_STEP_TWICE', `${correct} − ${Math.abs(db)}`),
    mk(oddRun.at(-1) + da, 'CONTINUED_WRONG_SUBSEQUENCE', `${oddRun.at(-1)} + ${da}`)
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
      wrongMethodValue: a0 + 4 * da
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
  const distractors = usable([
    mk(seq.at(-1) + d / 2, 'APPLIED_PREVIOUS_STEP', `${seq.at(-1)} + ${d / 2}`),
    mk(correct + d / 2, 'OFF_BY_ONE_STEP', `${correct} + ${d / 2}`),
    mk(correct - d / 2, 'OFF_BY_ONE_STEP', `${correct} − ${d / 2}`),
    mk(seq.at(-1) * 2, 'TREATED_PATTERN_AS_CONSTANT', `${seq.at(-1)} × 2`),
    mk(correct + 2, 'OFF_BY_ONE_STEP', `${correct} + 2`),
    mk(correct - 2, 'OFF_BY_ONE_STEP', `${correct} − 2`),
    mk(seq.at(-1) + d0, 'TREATED_PATTERN_AS_CONSTANT', `${seq.at(-1)} + ${d0}`)
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
      wrongMethodValue: seq.at(-1) + d / 2
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
  if (!seq) return alternateDivide(ctx);
  const distractors = usable([
    mk(seq.at(-1) - subtract, 'USED_WRONG_OPERATION_IN_ALTERNATION', `${seq.at(-1)} − ${subtract}`),
    mk(seq.at(-1) / 3, 'APPLIED_PREVIOUS_STEP', `${seq.at(-1)} ÷ 3`),
    mk(seq.at(-1) / 2, 'APPLIED_PREVIOUS_STEP', `${seq.at(-1)} ÷ 2`),
    mk(correct + subtract, 'OFF_BY_ONE_STEP', `${correct} + ${subtract}`),
    mk(correct - subtract, 'OFF_BY_ONE_STEP', `${correct} − ${subtract}`),
    mk(correct * 2, 'APPLIED_STEP_TWICE', `${correct} × 2`),
    mk(seq.at(-1) / 5, 'OFF_BY_ONE_STEP', `${seq.at(-1)} ÷ 5`),
    mk(correct + 1, 'OFF_BY_ONE_STEP', `${correct} + 1`),
    mk(correct - 1, 'OFF_BY_ONE_STEP', `${correct} − 1`),
    mk(seq.at(-1), 'TREATED_PATTERN_AS_CONSTANT', `إعادة الحد الأخير ${seq.at(-1)}`),
    mk(seq.at(-2) / 4, 'APPLIED_PREVIOUS_STEP', `${seq.at(-2)} ÷ 4`)
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
      wrongMethodValue: seq.at(-1) - subtract
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
  const distractors = usable([
    mk(seq.at(-1) + seq.at(-2), 'TREATED_PATTERN_AS_CONSTANT', `${seq.at(-1)} + ${seq.at(-2)}`),
    mk(2 * seq.at(-1), 'MISSED_ONE_STAGE', `2 × ${seq.at(-1)}`),
    mk(2 * seq.at(-2) + seq.at(-1), 'USED_WRONG_OPERATION_IN_ALTERNATION', `2 × ${seq.at(-2)} + ${seq.at(-1)}`),
    mk(correct - seq.at(-2), 'MISSED_ONE_STAGE', `${correct} − ${seq.at(-2)}`),
    mk(correct + seq.at(-2), 'APPLIED_STEP_TWICE', `${correct} + ${seq.at(-2)}`),
    mk(correct + 2, 'OFF_BY_ONE_STEP', `${correct} + 2`),
    mk(3 * seq.at(-1), 'USED_WRONG_OPERATION_IN_ALTERNATION', `3 × ${seq.at(-1)}`)
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
      wrongMethodValue: seq.at(-1) + seq.at(-2)
    },
    complexityFactors: {reasoningTransformations: 4, conceptCount: 2, stageCount: 2, arithmeticBurden: 4, dependencyDepth: 3},
    textParams: false
  });
}

function powersPlusIndex(ctx) {
  const {rng} = ctx;
  const basePow = rng.pick([2, 3]);
  // Vary how far into the powers the run starts and how many terms are shown,
  // so the template is not two questions repeated forever.
  const startIndex = rng.pick(basePow === 2 ? [1, 2, 3] : [1, 2]);
  const shown = rng.pick([4, 5]);
  const n = startIndex + shown - 1;
  const seq = [];
  for (let i = startIndex; i <= n; i++) seq.push(basePow ** i + i);
  const correct = basePow ** (n + 1) + (n + 1);
  const p = basePow ** (n + 1);
  const distractors = usable([
    mk(p, 'MISSED_ONE_STAGE', `${basePow} أُس 6 = ${p} دون إضافة رقم الترتيب`),
    mk(p + n, 'OFF_BY_ONE_STEP', `${p} + ${n}`),
    mk(p + n + 2, 'OFF_BY_ONE_STEP', `${p} + ${n + 2}`),
    mk(basePow ** n + (n + 1), 'APPLIED_PREVIOUS_STEP', `${basePow ** n} + ${n + 1}`),
    mk(correct - basePow, 'OFF_BY_ONE_STEP', `${correct} − ${basePow}`),
    mk(correct + basePow, 'OFF_BY_ONE_STEP', `${correct} + ${basePow}`),
    mk(p * basePow + n + 2, 'APPLIED_STEP_TWICE', `${p} × ${basePow} + ${n + 2}`)
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
