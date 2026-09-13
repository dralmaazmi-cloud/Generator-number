import {mk, usable, num, buildBase, eq, X, add, sub, mul, resample, bandPool,
  sceneFor, composeStem, unitFormat} from './_shared.js';
import {avgOfOther} from '../compose/scenarios.js';

// RC2.7-3. Every template here draws a SITUATION and has its finished clauses
// joined by the realization layer. The arithmetic, the oracle, the distractors
// and the explanation are untouched: what changes is that the same instance can
// be told as an exam mark sheet, a warehouse weight log or a nursery height
// record, in four sentence structures, instead of as one fixed sentence about
// «قيم».
const fmtFor = sc => (sc.fmtUnit ? unitFormat(sc.fmtUnit) : plain);

export function generateAverages({difficulty, rng, seed, engineVersion, telemetry, pinTemplate = null, pinTargets = null}) {
  const ctx = {difficulty, rng, seed, engineVersion, telemetry, pinTargets, family: 'averages', family_ar: 'المتوسط الحسابي', category: 'المتوسط الحسابي'};
  // RC2.3-1. The catalogue, not a set of per-band pools: which of these is
  // eligible for the requested band is decided by the structural adjudication in
  // src/qa/structure.js, so a template cannot sit in a band nobody adjudicated.
  return bandPool(rng, 'averages', difficulty, [
    ['AVG_E_ADD', addOne],
    ['AVG_E_REMOVE', removeOne],
    ['AVG_M_COMBINE', combineGroups],
    ['AVG_M_ADD_PAIR', addPairKnownAverage],
    ['AVG_M_REPLACE', replaceOne],
    ['AVG_H_COMB_ADD', combineThenAdd],
    ['AVG_H_TARGET', missingValueForTarget],
    ['AVG_H_OVERLAP', overlappingSubsets],
    ['AVG_H_SPLIT_SIZE', splitGroupSize]
  ], pinTemplate)(ctx);
}

const plain = v => num(v);

function addOne(ctx) {
  const {rng} = ctx;
  const n = rng.int(4, 8);
  const avg = rng.int(12, 28);
  const newVal = avg + rng.pick([-6, -4, -2, 2, 4, 6, 8]);
  const total = n * avg;
  const correct = (total + newVal) / (n + 1);
  if (!Number.isInteger(correct) || correct === avg) return resample(ctx, addOne);
  // RC2-002: the resulting count is a genuine parameter of the question. It
  // used to be sourced from the stem's bare numeral; now that the stem states
  // the count in words, the explanation sources it from here.
  const params = {count: n, average: avg, addedValue: newVal, resultingCount: n + 1};
  const distractors = usable(ctx, [
    mk(avg, 'USED_OLD_AVERAGE', `المتوسط القديم ${avg}`),
    mk(newVal, 'USED_GIVEN_VALUE_AS_ANSWER', `القيمة المضافة ${newVal}`),
    mk((total + newVal) / n, 'FAILED_TO_UPDATE_COUNT', `(${total} + ${newVal}) ÷ ${n}`),
    mk((avg + newVal) / 2, 'USED_ARITHMETIC_MEAN_OF_AVERAGES', `(${avg} + ${newVal}) ÷ 2`),
    mk(total / (n + 1), 'MISSED_ONE_STAGE', `${total} ÷ ${n + 1}`),
    mk(total + newVal, 'STOPPED_AT_INTERMEDIATE_TOTAL', `${total} + ${newVal}`),
    // RC2-012: the key-minus-two nudge replaced by two slips a learner makes on
    // the totals themselves.
    mk((total + newVal) / (n + 2), 'FAILED_TO_UPDATE_COUNT', `(${total} + ${newVal}) ÷ ${n + 2}`),
    mk((total - newVal) / (n + 1), 'SUBTRACTED_INSTEAD_OF_ADDED', `(${total} − ${newVal}) ÷ ${n + 1}`),
    mk(newVal / (n + 1), 'MISSED_ONE_STAGE', `${newVal} ÷ ${n + 1}`)
  ]);
  const sc = sceneFor(ctx, 'aggregate');
  const stem = composeStem(ctx, {
    facts: [`${sc.avgOf(n)} هو ${sc.mval(avg)}`, sc.addedIs(newVal)],
    ask: `فما متوسط ${sc.membersDef} بعد الإضافة؟`,
    askFirst: `متوسط ${sc.membersDef} بعد الإضافة`
  });
  return buildBase(ctx, {
    templateId: 'AVG_E_ADD',
    scenario: sc.key, stemStructure: stem.structure, informationOrder: stem.order,
    subskill: 'إضافة قيمة جديدة إلى مجموعة',
    difficulty: 'medium',
    // RC2-002: a definite plural takes an agreeing numeral adjective, not a
    // bare numeral. The count is restated in words the sentence can carry.
    question: stem.text,
    correct, distractors, format: fmtFor(sc),
    steps: [
      `المجموع الأصلي = ${n} × ${avg} = ${total}.`,
      `المجموع بعد الإضافة = ${total} + ${newVal} = ${total + newVal}.`,
      `المتوسط الجديد = ${total + newVal} ÷ ${n + 1} = ${correct}.`
    ],
    howToStart: 'حوّل المتوسط إلى مجموع أولًا.',
    remember: 'متوسط × عدد القيم = المجموع.',
    fastMethod: 'احسب المجموع الجديد ثم اقسم على العدد الجديد.',
    estimatedSteps: 3, conceptTags: ['average', 'sum'], parameters: params,
    // Conservation: the new mean times the new count must return the new total.
    oracle: {kind: 'constraint', answerKind: 'number', constraints: [eq(mul(X, n + 1), add(mul(n, avg), newVal))]},
    askedUnknown: 'newAverageAfterAdd', stageCount: 2,
    pedagogy: {
      targetSkill: 'MEAN_TO_SUM', targetMisconception: 'FAILED_TO_UPDATE_COUNT',
      wrongMethodValue: (total + newVal) / n,
      degenerateWhen: [{when: newVal === avg, note: 'adding the mean leaves the mean unchanged'}]
    },
    complexityFactors: {reasoningTransformations: 2, conceptCount: 1, stageCount: 2, arithmeticBurden: 2},
    textParams: {derivedFromParams: [n + 1], essentialParams: ['count', 'average', 'addedValue']}
  });
}

function removeOne(ctx) {
  const {rng} = ctx;
  const n = rng.int(5, 9);
  const avg = rng.int(15, 30);
  const removed = rng.int(8, 35);
  const total = n * avg;
  const remain = total - removed;
  if (remain <= 0 || remain % (n - 1) !== 0) return resample(ctx, removeOne);
  const correct = remain / (n - 1);
  if (correct === avg) return resample(ctx, removeOne);
  // RC2-002: the resulting count is a genuine parameter of the question. It
  // used to be sourced from the stem's bare numeral; now that the stem states
  // the count in words, the explanation sources it from here.
  const params = {count: n, average: avg, removedValue: removed, resultingCount: n - 1};
  const distractors = usable(ctx, [
    mk(avg, 'USED_OLD_AVERAGE', `المتوسط القديم ${avg}`),
    mk(removed, 'USED_GIVEN_VALUE_AS_ANSWER', `القيمة المحذوفة ${removed}`),
    mk(total / (n - 1), 'MISSED_ONE_STAGE', `${total} ÷ ${n - 1}`),
    mk(remain / n, 'FAILED_TO_UPDATE_COUNT', `${remain} ÷ ${n}`),
    mk((total + removed) / (n - 1), 'ADDED_INSTEAD_OF_SUBTRACTED', `(${total} + ${removed}) ÷ ${n - 1}`),
    mk(remain, 'STOPPED_AT_INTERMEDIATE_TOTAL', `${total} − ${removed}`),
    mk(remain / (n + 1), 'FAILED_TO_UPDATE_COUNT', `${remain} ÷ ${n + 1}`),
    mk(removed / (n - 1), 'MISSED_ONE_STAGE', `${removed} ÷ ${n - 1}`),
    mk((total - removed) / (n - 2), 'FAILED_TO_UPDATE_COUNT', `${remain} ÷ ${n - 2}`),
    mk(remain / (n - 1) * 2, 'APPLIED_STEP_TWICE', `${remain} ÷ ${n - 1} × 2`),
    mk(total - removed - avg, 'SUBTRACTED_INSTEAD_OF_ADDED', `${remain} − ${avg}`)
  ]);
  const sc = sceneFor(ctx, 'aggregate');
  const stem = composeStem(ctx, {
    facts: [`${sc.avgOf(n)} هو ${sc.mval(avg)}`, sc.removedIs(removed)],
    ask: `فما متوسط ${sc.membersDef} الباقية؟`,
    askFirst: `متوسط ${sc.membersDef} الباقية`
  });
  return buildBase(ctx, {
    templateId: 'AVG_E_REMOVE',
    scenario: sc.key, stemStructure: stem.structure, informationOrder: stem.order,
    subskill: 'حذف قيمة من مجموعة',
    difficulty: 'medium',
    // RC2-002: a definite plural takes an agreeing numeral adjective, not a
    // bare numeral. The count is restated in words the sentence can carry.
    question: stem.text,
    correct, distractors, format: fmtFor(sc),
    steps: [
      `المجموع الأصلي = ${n} × ${avg} = ${total}.`,
      `المجموع بعد الحذف = ${total} − ${removed} = ${remain}.`,
      `المتوسط الجديد = ${remain} ÷ ${n - 1} = ${correct}.`
    ],
    howToStart: 'حوّل المتوسط القديم إلى مجموع ثم اطرح القيمة المحذوفة.',
    remember: 'الحذف يغير المجموع وعدد القيم معًا.',
    fastMethod: 'مجموع قديم ناقص القيمة المحذوفة، ثم اقسم على العدد الجديد.',
    estimatedSteps: 3, conceptTags: ['average', 'sum'], parameters: params,
    oracle: {kind: 'constraint', answerKind: 'number', constraints: [eq(mul(X, n - 1), sub(mul(n, avg), removed))]},
    askedUnknown: 'newAverageAfterRemove', stageCount: 2,
    pedagogy: {
      targetSkill: 'MEAN_TO_SUM', targetMisconception: 'FAILED_TO_UPDATE_COUNT',
      wrongMethodValue: remain / n,
      degenerateWhen: [{when: removed === avg, note: 'removing the mean leaves the mean unchanged'}]
    },
    complexityFactors: {reasoningTransformations: 2, conceptCount: 1, stageCount: 2, arithmeticBurden: 2},
    textParams: {derivedFromParams: [n - 1], essentialParams: ['count', 'average', 'removedValue']}
  });
}

function replaceOne(ctx) {
  const {rng} = ctx;
  const n = rng.int(5, 10);
  const avg = rng.int(15, 30);
  const oldVal = rng.int(8, 25);
  const diff = rng.pick([6, 8, 10, 12, 14, 16]);
  const newVal = oldVal + diff;
  const total = n * avg;
  const newTotal = total + diff;
  if (newTotal % n !== 0) return resample(ctx, replaceOne);
  const correct = newTotal / n;
  const params = {count: n, average: avg, oldValue: oldVal, newValue: newVal};
  const distractors = usable(ctx, [
    mk(avg, 'USED_OLD_AVERAGE', `المتوسط القديم ${avg}`),
    mk(avg + diff, 'ADDED_DIFFERENCE_TO_AVERAGE', `${avg} + (${newVal} − ${oldVal})`),
    mk(newVal, 'USED_GIVEN_VALUE_AS_ANSWER', `القيمة الجديدة ${newVal}`),
    mk(oldVal, 'USED_GIVEN_VALUE_AS_ANSWER', `القيمة القديمة ${oldVal}`),
    mk(newTotal / (n + 1), 'FAILED_TO_UPDATE_COUNT', `${newTotal} ÷ ${n + 1}`),
    mk((total - diff) / n, 'SUBTRACTED_INSTEAD_OF_ADDED', `(${total} − ${diff}) ÷ ${n}`),
    mk(newTotal / (n - 1), 'FAILED_TO_UPDATE_COUNT', `${newTotal} ÷ ${n - 1}`),
    mk((total + newVal) / n, 'ADDED_INSTEAD_OF_SUBTRACTED', `(${total} + ${newVal}) ÷ ${n}`),
    mk(avg - diff, 'SUBTRACTED_INSTEAD_OF_ADDED', `${avg} − (${newVal} − ${oldVal})`)
  ]);
  const sc = sceneFor(ctx, 'aggregate');
  const stem = composeStem(ctx, {
    facts: [`${sc.avgOf(n)} هو ${sc.mval(avg)}`, sc.replacedIs(oldVal, newVal)],
    ask: `فما المتوسط الجديد؟`,
    askFirst: `متوسط ${sc.membersDef} بعد الاستبدال`
  });
  return buildBase(ctx, {
    templateId: 'AVG_M_REPLACE',
    scenario: sc.key, stemStructure: stem.structure, informationOrder: stem.order,
    subskill: 'استبدال قيمة واحدة',
    difficulty: 'medium',
    question: stem.text,
    correct, distractors, format: fmtFor(sc),
    steps: [
      `المجموع القديم = ${n} × ${avg} = ${total}.`,
      `الاستبدال يزيد المجموع بمقدار ${newVal} − ${oldVal} = ${diff}.`,
      `المجموع الجديد = ${total} + ${diff} = ${newTotal}.`,
      `المتوسط الجديد = ${newTotal} ÷ ${n} = ${correct}.`
    ],
    howToStart: 'في الاستبدال، عدد القيم لا يتغير؛ عدّل المجموع فقط.',
    remember: 'فرق القيمتين يكفي لتعديل المجموع مباشرة.',
    fastMethod: 'زد المتوسط بمقدار فرق القيمتين مقسومًا على عدد القيم.',
    estimatedSteps: 3, conceptTags: ['average', 'sum'], parameters: params,
    oracle: {
      kind: 'constraint', answerKind: 'number',
      constraints: [eq(mul(X, n), add(sub(mul(n, avg), oldVal), newVal))]
    },
    askedUnknown: 'newAverageAfterReplace', stageCount: 2,
    pedagogy: {
      targetSkill: 'REPLACE_KEEPS_COUNT', targetMisconception: 'ADDED_DIFFERENCE_TO_AVERAGE',
      wrongMethodValue: avg + diff,
      degenerateWhen: [{when: n === 1, note: 'a single value makes the shortcut correct'}]
    },
    complexityFactors: {reasoningTransformations: 3, conceptCount: 2, stageCount: 2, arithmeticBurden: 2},
    textParams: {essentialParams: ['count', 'average', 'oldValue', 'newValue']}
  });
}

function combineGroups(ctx) {
  const {rng} = ctx;
  const n1 = rng.pick([3, 4, 5, 6]);
  const n2 = rng.pick([4, 5, 6, 8]);
  // Section 10 / 43: equal group sizes make "average the two averages" correct,
  // which is exactly the mistake this template exists to detect.
  if (n1 === n2) return resample(ctx, combineGroups);
  const a1 = rng.int(12, 24);
  const a2 = a1 + rng.pick([4, 5, 6, 8]);
  const total = n1 * a1 + n2 * a2;
  if (total % (n1 + n2) !== 0) return resample(ctx, combineGroups);
  const correct = total / (n1 + n2);
  // RC2-002: the resulting count is a genuine parameter of the question. It
  // used to be sourced from the stem's bare numeral; now that the stem states
  // the count in words, the explanation sources it from here.
  const params = {countA: n1, averageA: a1, countB: n2, averageB: a2, resultingCount: n1 + n2};
  const distractors = usable(ctx, [
    mk((a1 + a2) / 2, 'USED_ARITHMETIC_MEAN_OF_AVERAGES', `(${a1} + ${a2}) ÷ 2`),
    mk(a1, 'USED_GIVEN_VALUE_AS_ANSWER', `متوسط المجموعة الأولى ${a1}`),
    mk(a2, 'USED_GIVEN_VALUE_AS_ANSWER', `متوسط المجموعة الثانية ${a2}`),
    mk(total / n1, 'FAILED_TO_UPDATE_COUNT', `${total} ÷ ${n1}`),
    mk(total / n2, 'FAILED_TO_UPDATE_COUNT', `${total} ÷ ${n2}`),
    mk((n1 * a1 + n2 * a2) / (n1 * n2), 'MULTIPLIED_COUNTS_INSTEAD_OF_RATE', `${n1 * a1 + n2 * a2} ÷ (${n1} × ${n2})`),
    mk((n2 * a1 + n1 * a2) / (n1 + n2), 'SWAPPED_RATE_AND_COUNT', `(${n2} × ${a1} + ${n1} × ${a2}) ÷ ${n1 + n2}`),
    mk(a1 + a2, 'STOPPED_AT_INTERMEDIATE_TOTAL', `${a1} + ${a2}`)
  ]);
  const sc = sceneFor(ctx, 'aggregate');
  // Two symmetric groups: neither presupposes the other, so their order is a
  // free choice and the realization layer may state either first.
  const stem = composeStem(ctx, {
    facts: [`${sc.avgOf(n1)} هو ${sc.mval(a1)}`, `${avgOfOther(sc, n2)} هو ${sc.mval(a2)}`],
    ask: `فما متوسط ${sc.membersDef} مجتمعة؟`,
    askFirst: `متوسط ${sc.membersDef} مجتمعة`,
    orderFree: true
  });
  return buildBase(ctx, {
    templateId: 'AVG_M_COMBINE',
    scenario: sc.key, stemStructure: stem.structure, informationOrder: stem.order,
    // RC2.1-3. A weighted mean of two group averages lies between them.
    answerBounds: {between: [a1, a2]},
    subskill: 'دمج مجموعتين بمتوسطين مختلفين',
    difficulty: 'medium',
    // RC2-002: a definite plural takes an agreeing numeral adjective, not a
    // bare numeral. The count is restated in words the sentence can carry.
    question: stem.text,
    correct, distractors, format: fmtFor(sc),
    steps: [
      `مجموع المجموعة الأولى = ${n1} × ${a1} = ${n1 * a1}.`,
      `مجموع المجموعة الثانية = ${n2} × ${a2} = ${n2 * a2}.`,
      `المجموع الكلي = ${n1 * a1} + ${n2 * a2} = ${total}.`,
      `المتوسط المدمج = ${total} ÷ ${n1 + n2} = ${correct}.`
    ],
    howToStart: 'لا تأخذ متوسط المتوسطين مباشرة إذا كان عدد القيم مختلفًا.',
    remember: 'حوّل كل متوسط إلى مجموع ثم اجمع.',
    fastMethod: 'المتوسط المدمج = مجموع المجموعتين ÷ مجموع الأعداد.',
    estimatedSteps: 4, conceptTags: ['average', 'weighted'], parameters: params,
    oracle: {
      kind: 'constraint', answerKind: 'number',
      constraints: [eq(mul(X, n1 + n2), add(mul(n1, a1), mul(n2, a2)))]
    },
    askedUnknown: 'weightedAverage', stageCount: 2,
    pedagogy: {
      targetSkill: 'WEIGHTED_AVERAGE', targetMisconception: 'USED_ARITHMETIC_MEAN_OF_AVERAGES',
      wrongMethodValue: (a1 + a2) / 2,
      degenerateWhen: [{when: n1 === n2, note: 'equal group sizes make the mean-of-means correct'}]
    },
    complexityFactors: {reasoningTransformations: 3, conceptCount: 2, stageCount: 2, arithmeticBurden: 3},
    textParams: {derivedFromParams: [n1 + n2], essentialParams: ['countA', 'averageA', 'countB', 'averageB']}
  });
}

function addPairKnownAverage(ctx) {
  const {rng} = ctx;
  const n = rng.int(5, 8);
  const avg = rng.int(15, 26);
  const pairAvg = avg + rng.pick([3, 6, 9]);
  const total = n * avg + 2 * pairAvg;
  if (total % (n + 2) !== 0) return resample(ctx, addPairKnownAverage);
  const correct = total / (n + 2);
  // RC2-002: the resulting count is a genuine parameter of the question. It
  // used to be sourced from the stem's bare numeral; now that the stem states
  // the count in words, the explanation sources it from here.
  const params = {count: n, average: avg, pairAverage: pairAvg, resultingCount: n + 2};
  const distractors = usable(ctx, [
    mk(avg, 'USED_OLD_AVERAGE', `المتوسط القديم ${avg}`),
    mk(pairAvg, 'USED_GIVEN_VALUE_AS_ANSWER', `متوسط القيمتين ${pairAvg}`),
    mk((avg + pairAvg) / 2, 'USED_ARITHMETIC_MEAN_OF_AVERAGES', `(${avg} + ${pairAvg}) ÷ 2`),
    mk(total / n, 'FAILED_TO_UPDATE_COUNT', `${total} ÷ ${n}`),
    mk((n * avg + pairAvg) / (n + 1), 'MISSED_ONE_STAGE', `(${n * avg} + ${pairAvg}) ÷ ${n + 1}`),
    // RC2-012: this template could not fill six options without padding. These
    // four are the slips available on its own quantities.
    mk((n * avg + 2 * pairAvg) / n, 'FAILED_TO_UPDATE_COUNT', `(${n * avg} + ${2 * pairAvg}) ÷ ${n}`),
    mk((n * avg + 2 * pairAvg) / (n + 1), 'FAILED_TO_UPDATE_COUNT', `(${n * avg} + ${2 * pairAvg}) ÷ ${n + 1}`),
    mk((n * avg + 2 * pairAvg) / (n + 3), 'FAILED_TO_UPDATE_COUNT', `(${n * avg} + ${2 * pairAvg}) ÷ ${n + 3}`),
    mk(n * avg + 2 * pairAvg, 'STOPPED_AT_INTERMEDIATE_TOTAL', `${n * avg} + ${2 * pairAvg}`),
    mk(2 * pairAvg, 'STOPPED_AT_INTERMEDIATE_TOTAL', `مجموع القيمتين ${2 * pairAvg}`)
  ]);
  const sc = sceneFor(ctx, 'aggregate');
  const stem = composeStem(ctx, {
    facts: [`${sc.avgOf(n)} هو ${sc.mval(avg)}`, sc.pairAdded(pairAvg)],
    ask: `فما متوسط ${sc.membersDef} بعد الإضافة؟`,
    askFirst: `متوسط ${sc.membersDef} بعد الإضافة`
  });
  return buildBase(ctx, {
    templateId: 'AVG_M_ADD_PAIR',
    scenario: sc.key, stemStructure: stem.structure, informationOrder: stem.order,
    subskill: 'إضافة قيمتين بمتوسط معلوم',
    difficulty: 'medium',
    // RC2-002: a definite plural takes an agreeing numeral adjective, not a
    // bare numeral. The count is restated in words the sentence can carry.
    question: stem.text,
    correct, distractors, format: fmtFor(sc),
    steps: [
      `مجموع القيم الأصلية = ${n} × ${avg} = ${n * avg}.`,
      `مجموع القيمتين الجديدتين = 2 × ${pairAvg} = ${2 * pairAvg}.`,
      `المجموع الجديد = ${n * avg} + ${2 * pairAvg} = ${total}.`,
      `المتوسط الجديد = ${total} ÷ ${n + 2} = ${correct}.`
    ],
    howToStart: 'حوّل متوسط كل مجموعة إلى مجموع.',
    remember: 'متوسط القيمتين لا يُضاف مباشرة إلى المتوسط القديم.',
    fastMethod: 'اجمع مجموع المجموعتين ثم اقسم على العدد الكلي.',
    estimatedSteps: 4, conceptTags: ['average', 'weighted'], parameters: params,
    oracle: {
      kind: 'constraint', answerKind: 'number',
      constraints: [eq(mul(X, n + 2), add(mul(n, avg), mul(2, pairAvg)))]
    },
    askedUnknown: 'averageAfterAddingPair', stageCount: 2,
    pedagogy: {
      targetSkill: 'WEIGHTED_AVERAGE', targetMisconception: 'USED_ARITHMETIC_MEAN_OF_AVERAGES',
      wrongMethodValue: (avg + pairAvg) / 2,
      degenerateWhen: [{when: n === 2, note: 'equal group sizes make the mean-of-means correct'}]
    },
    complexityFactors: {reasoningTransformations: 3, conceptCount: 2, stageCount: 2, arithmeticBurden: 3},
    textParams: {derivedFromParams: [n + 2], essentialParams: ['count', 'average', 'pairAverage']}
  });
}

function combineThenAdd(ctx) {
  const {rng} = ctx;
  const n1 = rng.pick([3, 4, 5]);
  const n2 = rng.pick([4, 5, 6].filter(v => v !== n1));
  const a1 = rng.int(12, 20);
  const a2 = a1 + rng.pick([4, 5, 6]);
  const extra = rng.pick([30, 36, 40, 45, 50]);
  const total = n1 * a1 + n2 * a2 + extra;
  const n = n1 + n2 + 1;
  if (total % n !== 0) return resample(ctx, combineThenAdd);
  const correct = total / n;
  // RC2-002: the resulting count is a genuine parameter of the question. It
  // used to be sourced from the stem's bare numeral; now that the stem states
  // the count in words, the explanation sources it from here.
  const params = {countA: n1, averageA: a1, countB: n2, averageB: a2, extraValue: extra, resultingCount: n1 + n2 + 1};
  const distractors = usable(ctx, [
    mk((a1 + a2) / 2, 'USED_ARITHMETIC_MEAN_OF_AVERAGES', `(${a1} + ${a2}) ÷ 2`),
    mk((n1 * a1 + n2 * a2) / (n1 + n2), 'STOPPED_AFTER_FIRST_STAGE', `${n1 * a1 + n2 * a2} ÷ ${n1 + n2}`),
    mk(extra, 'USED_GIVEN_VALUE_AS_ANSWER', `القيمة المضافة ${extra}`),
    mk(total / (n1 + n2), 'FAILED_TO_UPDATE_COUNT', `${total} ÷ ${n1 + n2}`),
    mk(a2, 'USED_GIVEN_VALUE_AS_ANSWER', `متوسط المجموعة الثانية ${a2}`),
    mk(a1, 'USED_GIVEN_VALUE_AS_ANSWER', `متوسط المجموعة الأولى ${a1}`),
    mk(total / n1, 'FAILED_TO_UPDATE_COUNT', `${total} ÷ ${n1}`),
    mk((n1 * a1 + n2 * a2 + extra) / (n1 + n2 + 2), 'FAILED_TO_UPDATE_COUNT', `${total} ÷ ${n1 + n2 + 2}`),
    mk(total / n2, 'FAILED_TO_UPDATE_COUNT', `${total} ÷ ${n2}`),
    mk(total, 'STOPPED_AT_INTERMEDIATE_TOTAL', `المجموع الكلي ${total}`),
    mk((n1 * a1 + n2 * a2) / (n1 + n2 + 1), 'MISSED_ONE_STAGE', `${n1 * a1 + n2 * a2} ÷ ${n1 + n2 + 1}`)
  ]);
  const sc = sceneFor(ctx, 'aggregate');
  // The third clause says «بعد ذلك» and depends on the first two having been
  // stated, so this one keeps its order: only the sentence structure varies.
  const stem = composeStem(ctx, {
    facts: [
      `${sc.avgOf(n1)} هو ${sc.mval(a1)}`,
      `${avgOfOther(sc, n2)} هو ${sc.mval(a2)}`,
      // The adverb leads the clause: trailing it after the numeral put «بعد»
      // immediately behind a number, which is an unclassified construction.
      `بعد ذلك ${sc.addedIs(extra)}`
    ],
    ask: `فما متوسط ${sc.membersDef} جميعها؟`,
    askFirst: `متوسط ${sc.membersDef} جميعها`
  });
  return buildBase(ctx, {
    templateId: 'AVG_H_COMB_ADD',
    scenario: sc.key, stemStructure: stem.structure, informationOrder: stem.order,
    // RC2.1-3. The mean of everything lies between the smallest and largest
    // quantity being averaged, so the running total is not a possible answer.
    answerBounds: {between: [Math.min(a1, a2, extra), Math.max(a1, a2, extra)]},
    subskill: 'دمج مجموعتين ثم إضافة قيمة جديدة',
    difficulty: 'medium',
    // RC2-002: a definite plural takes an agreeing numeral adjective, not a
    // bare numeral. The count is restated in words the sentence can carry.
    question: stem.text,
    correct, distractors, format: fmtFor(sc),
    steps: [
      `مجموع المجموعة الأولى = ${n1} × ${a1} = ${n1 * a1}.`,
      `مجموع المجموعة الثانية = ${n2} × ${a2} = ${n2 * a2}.`,
      `المجموع بعد إضافة القيمة الجديدة = ${n1 * a1} + ${n2 * a2} + ${extra} = ${total}.`,
      `المتوسط = ${total} ÷ ${n} = ${correct}.`
    ],
    howToStart: 'حوّل كل جزء إلى مجموع قبل الدمج.',
    remember: 'في المسائل المركبة، تابع المجموع وعدد القيم في كل مرحلة.',
    fastMethod: 'اجمع كل المجاميع أولًا ثم اقسم مرة واحدة في النهاية.',
    estimatedSteps: 5, conceptTags: ['average', 'weighted', 'stages'], parameters: params,
    oracle: {
      kind: 'constraint', answerKind: 'number',
      constraints: [eq(mul(X, n), add(mul(n1, a1), mul(n2, a2), extra))]
    },
    askedUnknown: 'weightedAveragePlusValue', stageCount: 3,
    pedagogy: {
      targetSkill: 'WEIGHTED_AVERAGE_STAGES', targetMisconception: 'STOPPED_AFTER_FIRST_STAGE',
      wrongMethodValue: (n1 * a1 + n2 * a2) / (n1 + n2),
      degenerateWhen: [{when: n1 === n2, note: 'equal group sizes make the mean-of-means correct'}]
    },
    complexityFactors: {reasoningTransformations: 4, conceptCount: 2, stageCount: 3, arithmeticBurden: 4, dependencyDepth: 2},
    textParams: {derivedFromParams: [n], essentialParams: ['countA', 'averageA', 'countB', 'averageB', 'extraValue']}
  });
}

function missingValueForTarget(ctx) {
  const {rng} = ctx;
  const n = rng.int(5, 8);
  const oldAvg = rng.int(15, 25);
  const target = oldAvg + rng.pick([2, 3, 4, 5]);
  const current = n * oldAvg;
  const correct = (n + 1) * target - current;
  if (correct <= 0) return resample(ctx, missingValueForTarget);
  // RC2-002: the resulting count is a genuine parameter of the question. It
  // used to be sourced from the stem's bare numeral; now that the stem states
  // the count in words, the explanation sources it from here.
  const params = {count: n, currentAverage: oldAvg, targetAverage: target, resultingCount: n + 1};
  const distractors = usable(ctx, [
    mk(target, 'USED_TARGET_AS_ANSWER', `المتوسط المستهدف ${target}`),
    mk(oldAvg, 'USED_OLD_AVERAGE', `المتوسط القديم ${oldAvg}`),
    mk(target - oldAvg, 'USED_AGE_DIFFERENCE_AS_ANSWER', `${target} − ${oldAvg}`),
    mk(n * target - current, 'FAILED_TO_UPDATE_COUNT', `${n} × ${target} − ${current}`),
    mk((n + 1) * target, 'STOPPED_AT_INTERMEDIATE_TOTAL', `${n + 1} × ${target}`),
    mk(current, 'STOPPED_AT_INTERMEDIATE_TOTAL', `مجموع القيم الحالية ${current}`),
    mk((n + 2) * target - current, 'FAILED_TO_UPDATE_COUNT', `${n + 2} × ${target} − ${current}`),
    mk(n * (target - oldAvg), 'MULTIPLIED_INSTEAD_OF_DIVIDED', `${n} × (${target} − ${oldAvg})`)
  ]);
  const sc = sceneFor(ctx, 'aggregate');
  // The target is stated as its own given rather than folded into the question,
  // which is what lets this one be told outcome-first: the wanted average
  // before the present one.
  const stem = composeStem(ctx, {
    facts: [
      `${sc.avgOf(n)} هو ${sc.mval(oldAvg)}`,
      `يُراد أن يصبح متوسط ${sc.membersDef} جميعها ${sc.mval(target)}`
    ],
    ask: `فما ${sc.measureNoun} ${sc.measureRel} يجب إضافت${sc.measurePron}؟`,
    askFirst: `${sc.measureNoun} ${sc.measureRel} يجب إضافت${sc.measurePron}`,
    orderFree: true, outcomeIndex: 1
  });
  return buildBase(ctx, {
    templateId: 'AVG_H_TARGET',
    scenario: sc.key, stemStructure: stem.structure, informationOrder: stem.order,
    subskill: 'إيجاد قيمة مطلوبة للوصول إلى متوسط مستهدف',
    difficulty: 'easy',
    // RC2-002: a definite plural takes an agreeing numeral adjective, not a
    // bare numeral. The count is restated in words the sentence can carry.
    question: stem.text,
    correct, distractors, format: fmtFor(sc),
    steps: [
      `المجموع الحالي = ${n} × ${oldAvg} = ${current}.`,
      `المجموع المطلوب = ${n + 1} × ${target} = ${(n + 1) * target}.`,
      `القيمة الجديدة = ${(n + 1) * target} − ${current} = ${correct}.`
    ],
    howToStart: 'احسب المجموع الحالي ثم المجموع المطلوب.',
    remember: 'القيمة المضافة هي الفرق بين المجموع المستهدف والمجموع الحالي.',
    fastMethod: 'مجموع مستهدف ناقص مجموع حالي.',
    estimatedSteps: 3, conceptTags: ['average', 'reverse'], parameters: params,
    oracle: {
      kind: 'constraint', answerKind: 'number',
      constraints: [eq(add(mul(n, oldAvg), X), mul(n + 1, target))]
    },
    askedUnknown: 'valueForTargetAverage', stageCount: 2,
    pedagogy: {
      targetSkill: 'REVERSE_MEAN', targetMisconception: 'FAILED_TO_UPDATE_COUNT',
      wrongMethodValue: n * target - current,
      degenerateWhen: [{when: target === oldAvg, note: 'target equal to the current mean is trivial'}]
    },
    complexityFactors: {reasoningTransformations: 3, conceptCount: 2, reverseReasoning: 1, stageCount: 2, arithmeticBurden: 3},
    textParams: {derivedFromParams: [n + 1], essentialParams: ['count', 'currentAverage', 'targetAverage']}
  });
}

// ---------------------------------------------------------------------------
// RC2.4 — genuinely hard structures for this family.
//
// Routine averaging is what the brief rules out of hard, and all seven RC2.3
// templates are that: reconstruct a total, adjust it, divide again. Neither of
// the two below can be solved that way — in the first the subsets overlap, in
// the second the group sizes are the unknowns.
// ---------------------------------------------------------------------------

/**
 * CROSS_PART_INTEGRATION + STRATEGY_SELECTION.
 *
 * Two subsets that between them cover the whole set and share exactly one
 * member. Adding their totals counts that member twice, and that double count IS
 * the route to it — a move the sentence does not suggest.
 */
function overlappingSubsets(ctx) {
  const {rng} = ctx;
  let found = null;
  for (let t = 0; t < 150; t++) {
    // An odd count so the two halves of (count+1)/2 overlap in exactly one value.
    const count = rng.pick([5, 7, 9, 11]);
    const head = (count + 1) / 2;
    const whole = rng.int(12, 30);
    const headAvg = rng.int(8, 28);
    const tailAvg = rng.int(8, 28);
    const middle = head * headAvg + head * tailAvg - count * whole;
    if (middle <= 0 || middle > 60) continue;
    if (headAvg === tailAvg) continue;
    // The shared value being the overall average makes "just answer the average"
    // correct and the item stops measuring the overlap (Section 10).
    if (middle === whole) continue;
    found = {count, head, whole, headAvg, tailAvg, middle};
    break;
  }
  if (!found) return resample(ctx, overlappingSubsets);
  const {count, head, whole, headAvg, tailAvg, middle} = found;
  const headSum = head * headAvg, tailSum = head * tailAvg, wholeSum = count * whole;
  const correct = middle;
  const params = {count, average: whole, subsetCount: head, headAverage: headAvg, tailAverage: tailAvg};

  const distractors = usable(ctx, [
    mk(whole, 'IGNORED_THE_OVERLAP', `المتوسط العام ${whole}`),
    mk(headSum + tailSum - wholeSum + whole, 'COUNTED_THE_OVERLAP_TWICE', `${headSum} + ${tailSum} − ${wholeSum} + ${whole}`, 2),
    mk((headAvg + tailAvg) / 2, 'USED_ARITHMETIC_MEAN_OF_AVERAGES', `(${headAvg} + ${tailAvg}) ÷ 2`),
    mk(Math.abs(headAvg - tailAvg), 'USED_DIFFERENCE_AS_ANSWER', `${Math.max(headAvg, tailAvg)} − ${Math.min(headAvg, tailAvg)}`),
    mk(headSum + tailSum - wholeSum - whole, 'OFF_BY_ONE_STEP', `${headSum} + ${tailSum} − ${wholeSum} − ${whole}`, 2),
    mk(headAvg, 'USED_GIVEN_VALUE_AS_ANSWER', `متوسط المجموعة الأولى ${headAvg}`),
    mk(tailAvg, 'USED_GIVEN_VALUE_AS_ANSWER', `متوسط المجموعة الثانية ${tailAvg}`),
    mk(wholeSum - headSum, 'IGNORED_THE_OVERLAP', `${wholeSum} − ${headSum}`, 0),
    mk(wholeSum - tailSum, 'IGNORED_THE_OVERLAP', `${wholeSum} − ${tailSum}`, 0)
  ]);

  const sc = sceneFor(ctx, 'aggregate');
  // RC2.5-4. «قيم مرتبة» read as SORTED, and under that reading a head average
  // above the tail average is contradictory, which is what the blind review
  // flagged. The order here is positional — where a value sits in the record —
  // so the clauses say that with positional words only.
  const stem = composeStem(ctx, {
    facts: [
      `متوسط ${sc.membersDef} كلها في ${sc.listOf(count)} هو ${sc.mval(whole)}`,
      `متوسط أول ${sc.groupOf(head)} في ${sc.listDef} هو ${sc.mval(headAvg)}`,
      `متوسط آخر ${sc.groupOf(head)} ${sc.listPron} هو ${sc.mval(tailAvg)}`
    ],
    ask: `فما ${sc.middlePhrase}؟`,
    askFirst: sc.middlePhrase
  });
  return buildBase(ctx, {
    templateId: 'AVG_H_OVERLAP',
    scenario: sc.key, stemStructure: stem.structure, informationOrder: stem.order,
    subskill: 'قيمة مشتركة بين مجموعتين متداخلتين',
    difficulty: 'hard',
    // RC2.5-4. «قيم مرتبة» read as SORTED, and under that reading a head
    // average above the tail average is contradictory, which is what the blind
    // review flagged. The order here is positional — where a value sits in the
    // list — so the stem now says that with positional words only.
    question: stem.text,
    correct, distractors, format: fmtFor(sc),
    steps: [
      `مجموع القيم كلها = ${count} × ${whole} = ${wholeSum}.`,
      `مجموع المجموعة الأولى = ${head} × ${headAvg} = ${headSum}، ومجموع الثانية = ${head} × ${tailAvg} = ${tailSum}.`,
      `المجموعتان تغطيان القيم كلها، لكن القيمة في الموضع الأوسط تقع في كلتيهما فتُحسب مرتين: ${headSum} + ${tailSum} = ${headSum + tailSum}.`,
      `إذن القيمة في الموضع الأوسط = ${headSum + tailSum} − ${wholeSum} = ${correct}.`
    ],
    howToStart: 'اجمع مجموعي المجموعتين ولاحظ أي قيمة دخلت في الجمع مرتين.',
    remember: 'عند تداخل مجموعتين، الفرق بين مجموعهما ومجموع الكل هو القيمة المشتركة.',
    fastMethod: 'مجموع المجموعتين ناقص مجموع الكل يعطي القيمة المكررة مباشرة.',
    estimatedSteps: 4, conceptTags: ['average', 'overlap', 'inclusion'], parameters: params,
    oracle: {
      kind: 'constraint', answerKind: 'number',
      constraints: [eq(add(mul(count, whole), X), add(mul(head, headAvg), mul(head, tailAvg)))]
    },
    askedUnknown: 'overlappingValue', stageCount: 3,
    pedagogy: {
      targetSkill: 'OVERLAPPING_SUBSET_TOTALS', targetMisconception: 'IGNORED_THE_OVERLAP',
      wrongMethodValue: whole
    },
    complexityFactors: {reasoningTransformations: 4, conceptCount: 3, conditionCount: 2, equationSolving: 1, stageCount: 3, arithmeticBurden: 5},
    textParams: {essentialParams: ['count', 'average', 'subsetCount', 'headAverage', 'tailAverage']}
  });
}

/**
 * SIMULTANEOUS_CONSTRAINTS + STRATEGY_SELECTION.
 *
 * Three averages and one count. The two group SIZES are the unknowns, and they
 * are linked — knowing either gives the other — so neither average can be used
 * until the pair is solved together.
 */
function splitGroupSize(ctx) {
  const {rng} = ctx;
  let found = null;
  for (let t = 0; t < 150; t++) {
    const count = rng.pick([10, 12, 15, 18, 20, 24]);
    const lowAvg = rng.int(8, 18);
    const highAvg = lowAvg + rng.pick([4, 5, 6, 8, 10]);
    const first = rng.int(2, count - 2);
    const totalNum = first * highAvg + (count - first) * lowAvg;
    if (totalNum % count !== 0) continue;
    const whole = totalNum / count;
    if (whole === highAvg || whole === lowAvg) continue;
    // At half the group the plain average of the two averages is correct, and
    // the item stops measuring the weighting (Section 10).
    if (2 * first === count) continue;
    found = {count, lowAvg, highAvg, first, whole};
    break;
  }
  if (!found) return resample(ctx, splitGroupSize);
  const {count, lowAvg, highAvg, first, whole} = found;
  const second = count - first;
  const allLow = count * lowAvg;
  const wholeSum = count * whole;
  const gap = wholeSum - allLow;
  const perMember = highAvg - lowAvg;
  const correct = first;
  const params = {count, average: whole, firstAverage: highAvg, secondAverage: lowAvg};

  const distractors = usable(ctx, [
    mk(second, 'ANSWERED_THE_OTHER_COMPONENT', `${count} − ${first}`, 3),
    mk(count / 2, 'USED_ARITHMETIC_MEAN_OF_AVERAGES', `${count} ÷ 2`),
    mk(perMember, 'USED_DIFFERENCE_AS_ANSWER', `${highAvg} − ${lowAvg}`, 2),
    mk(whole - lowAvg, 'STOPPED_AT_INTERMEDIATE_TOTAL', `${whole} − ${lowAvg}`),
    mk(count * (whole - lowAvg) / highAvg, 'WEIGHTED_BY_WRONG_QUANTITY', `${count} × (${whole} − ${lowAvg}) ÷ ${highAvg}`),
    mk(count * (highAvg - whole) / perMember, 'SWAPPED_THE_TWO_UNKNOWNS', `${count} × (${highAvg} − ${whole}) ÷ ${perMember}`),
    mk(first + 1, 'OFF_BY_ONE_STEP', `${gap} ÷ ${perMember} + 1`),
    mk(first - 1, 'OFF_BY_ONE_STEP', `${gap} ÷ ${perMember} − 1`),
    mk(gap / whole, 'WEIGHTED_BY_WRONG_QUANTITY', `${gap} ÷ ${whole}`),
    mk(count * (whole - lowAvg) / whole, 'WEIGHTED_BY_WRONG_QUANTITY', `${count} × (${whole} − ${lowAvg}) ÷ ${whole}`)
  ]);

  const sc = sceneFor(ctx, 'aggregate');
  const stem = composeStem(ctx, {
    facts: [
      `${sc.avgOf(count)} هو ${sc.mval(whole)}`,
      `قُسموا إلى مجموعتين: متوسط الأولى ${sc.mval(highAvg)}، ومتوسط الثانية ${sc.mval(lowAvg)}`
    ],
    ask: `كم ${sc.countNoun} في المجموعة الأولى؟`,
    askFirst: 'حجم المجموعة الأولى'
  });
  return buildBase(ctx, {
    templateId: 'AVG_H_SPLIT_SIZE',
    scenario: sc.key, stemStructure: stem.structure, informationOrder: stem.order,
    subskill: 'حجم إحدى المجموعتين من ثلاثة متوسطات',
    difficulty: 'hard',
    question: stem.text,
    correct, distractors, format: v => num(v),
    steps: [
      `مجموع القيم كلها = ${count} × ${whole} = ${wholeSum}.`,
      `لو كانت القيم كلها في المجموعة الثانية لكان المجموع = ${count} × ${lowAvg} = ${allLow}.`,
      `الفارق = ${wholeSum} − ${allLow} = ${gap}، وكل قيمة تنتقل إلى المجموعة الأولى تزيد المجموع بمقدار ${highAvg} − ${lowAvg} = ${perMember}.`,
      `عدد قيم المجموعة الأولى = ${gap} ÷ ${perMember} = ${correct}.`
    ],
    howToStart: 'افترض أن القيم كلها في المجموعة ذات المتوسط الأقل ثم انقلها واحدة واحدة.',
    remember: 'المتوسط العام يقع بين المتوسطين، وموضعه بينهما يحدد حجم كل مجموعة.',
    fastMethod: 'الفارق عن الحالة الافتراضية مقسومًا على الفرق بين المتوسطين يعطي حجم المجموعة الأعلى.',
    estimatedSteps: 4, conceptTags: ['average', 'weighted-mean', 'two-unknowns'], parameters: params,
    oracle: {
      kind: 'constraint', answerKind: 'number',
      constraints: [eq(add(mul(X, highAvg), mul(sub(count, X), lowAvg)), mul(count, whole))]
    },
    askedUnknown: 'firstGroupCount', stageCount: 3,
    answerBounds: {between: [0, count]},
    pedagogy: {
      targetSkill: 'WEIGHTED_MEAN_INVERTED', targetMisconception: 'USED_ARITHMETIC_MEAN_OF_AVERAGES',
      wrongMethodValue: count / 2
    },
    complexityFactors: {reasoningTransformations: 4, conceptCount: 3, conditionCount: 2, equationSolving: 1, stageCount: 3, arithmeticBurden: 5},
    textParams: {essentialParams: ['count', 'average', 'firstAverage', 'secondAverage']}
  });
}
