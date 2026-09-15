import {Fraction} from '../qa/fraction.js';
import {mk, usable, u, num, unitFormat, buildBase, eq, X, add, sub, mul, factorLine, resample, adj, riseByPercentPhrase, bandPool, unitWordKam, composeSentences} from './_shared.js';

export function generateWorkTime({difficulty, rng, seed, engineVersion, telemetry, pinTemplate = null, pinTargets = null}) {
  const ctx = {difficulty, rng, seed, engineVersion, telemetry, pinTargets, family: 'work_time', family_ar: 'العمال والزمن', category: 'العمال والزمن'};
  // RC2.3-1. The catalogue, not a set of per-band pools: which of these is
  // eligible for the requested band is decided by the structural adjudication in
  // src/qa/structure.js, so a template cannot sit in a band nobody adjudicated.
  return bandPool(rng, 'work_time', difficulty, [
    ['WORK_E_VOLUME', workVolume],
    ['WORK_E_INVERSE', inverseDirect],
    ['WORK_M_EFF', efficiencyChange],
    ['WORK_M_TARGET', targetDeadline],
    ['WORK_M_CHANGE', changeWorkers],
    ['WORK_H_TWO_STAGE', twoStageWorkers],
    ['WORK_H_WORKERS_EFF', workersAndEfficiency],
    ['WORK_H_JOINT_SOLO', jointThenSoloTime],
    ['WORK_H_EXTRA_WORKERS', extraWorkersSaveDays],
    ['WORK_H_THREE_PAIRS', threePairwiseRates],
    ['WORK_H_SOLO_GAP', pairWithSoloGap]
  ], pinTemplate)(ctx);
}

function inverseDirect(ctx) {
  const {rng} = ctx;
  const w1 = rng.pick([4, 5, 6, 8, 10, 12]);
  const d1 = rng.pick([6, 8, 10, 12, 15, 18]);
  const work = w1 * d1;
  const candidates = [6, 8, 10, 12, 15, 16, 18, 20, 24].filter(w => work % w === 0 && w !== w1);
  if (!candidates.length) return resample(ctx, inverseDirect);
  const w2 = rng.pick(candidates);
  const correct = work / w2;
  if (correct === d1) return resample(ctx, inverseDirect);
  const params = {workers: w1, days: d1, newWorkers: w2};
  const distractors = usable(ctx, [
    mk(d1, 'USED_GIVEN_VALUE_AS_ANSWER', `عدد الأيام المعطى ${d1}`),
    mk(w2, 'USED_GIVEN_VALUE_AS_ANSWER', `عدد العمال الجديد ${w2}`),
    mk(d1 * w2 / w1, 'REVERSED_INVERSE_PROPORTION', `${d1} × ${w2} ÷ ${w1}`),
    mk(work / (w1 + w2), 'RATE_APPLIED_TO_WRONG_COUNT', `${work} ÷ (${w1} + ${w2})`),
    mk(d1 + (w2 - w1), 'ADDED_INSTEAD_OF_SCALING', `${d1} + (${w2} − ${w1})`),
    mk(work, 'STOPPED_AT_INTERMEDIATE_TOTAL', `${w1} × ${d1}`),
    // RC2-012: deepened so the template can fill six options from real slips.
    mk(d1 * w1 / w2 / 2, 'HALF_DISTANCE_AS_ANSWER', `${work} ÷ ${w2} ÷ 2`),
    mk(work / Math.abs(w2 - w1 || 1), 'RATE_APPLIED_TO_WRONG_COUNT', `${work} ÷ |${w2} − ${w1}|`),
    mk(d1 - (w2 - w1), 'SUBTRACTED_INSTEAD_OF_ADDED', `${d1} − (${w2} − ${w1})`)
  ]);
  const stem = composeSentences(ctx, `يستطيع ${u(w1, 'worker')} إنجاز عمل في ${u(d1, 'day', 'oblique')}. إذا عمل ${u(w2, 'worker')} بالكفاءة نفسها، فكم يومًا يحتاجون؟`);
  return buildBase(ctx, {
    templateId: 'WORK_E_INVERSE',
    subskill: 'تناسب عكسي مباشر بين العمال والزمن',
    difficulty: 'easy',
    question: stem.text,
    stemStructure: stem.structure, informationOrder: stem.order,
    correct, distractors, format: unitFormat('day'),
    steps: [
      `العمل الكامل بوحدة عامل-يوم = ${w1} × ${d1} = ${work}.`,
      `الزمن المطلوب بالأيام = ${work} ÷ ${w2} = ${correct}.`
    ],
    howToStart: 'حوّل العمل إلى وحدات عامل-يوم.',
    remember: 'إذا ثبت العمل والكفاءة: عدد العمال × عدد الأيام ثابت.',
    fastMethod: 'اضرب العمال في الأيام ثم اقسم على العدد الجديد.',
    estimatedSteps: 2, conceptTags: ['work', 'inverse-proportion'], parameters: params,
    // Conservation of worker-days across the two arrangements.
    oracle: {kind: 'constraint', answerKind: 'number', constraints: [eq(mul(X, w2), mul(w1, d1))]},
    askedUnknown: 'daysForNewCrew', stageCount: 1,
    pedagogy: {
      targetSkill: 'INVERSE_PROPORTION', targetMisconception: 'REVERSED_INVERSE_PROPORTION',
      wrongMethodValue: d1 * w2 / w1,
      degenerateWhen: [{when: w1 === w2, note: 'unchanged crew size: nothing to invert'}]
    },
    complexityFactors: {reasoningTransformations: 2, conceptCount: 1, stageCount: 1, arithmeticBurden: 2},
    textParams: {essentialParams: ['workers', 'days', 'newWorkers']}
  });
}

function workVolume(ctx) {
  const {rng} = ctx;
  const workers = rng.pick([6, 8, 10, 12]);
  const days = rng.pick([4, 5, 6, 8]);
  const oldUnits = rng.pick([2, 3, 4]);
  const newUnits = oldUnits + rng.pick([1, 2]);
  const correct = workers * newUnits / oldUnits;
  if (!Number.isInteger(correct)) return resample(ctx, workVolume);
  const params = {workers, days, currentTasks: oldUnits, targetTasks: newUnits};
  const distractors = usable(ctx, [
    mk(workers, 'USED_GIVEN_VALUE_AS_ANSWER', `عدد العمال المعطى ${workers}`),
    mk(newUnits * workers, 'MULTIPLIED_COUNTS_INSTEAD_OF_RATE', `${newUnits} × ${workers}`),
    mk(workers + newUnits - oldUnits, 'ADDED_INSTEAD_OF_SCALING', `${workers} + (${newUnits} − ${oldUnits})`),
    mk(workers * oldUnits / newUnits, 'REVERSED_DIRECT_PROPORTION', `${workers} × ${oldUnits} ÷ ${newUnits}`),
    mk(workers * newUnits, 'RATE_APPLIED_TO_WRONG_COUNT', `${workers} × ${newUnits}`),
    mk(workers * newUnits / oldUnits / 2, 'HALF_DISTANCE_AS_ANSWER', `${workers} × ${newUnits} ÷ ${oldUnits} ÷ 2`),
    mk(newUnits / oldUnits, 'STOPPED_AT_UNIT_RATE', `${newUnits} ÷ ${oldUnits}`),
    mk(workers * (newUnits - oldUnits) / oldUnits, 'MISSED_ONE_STAGE', `${workers} × (${newUnits} − ${oldUnits}) ÷ ${oldUnits}`)
  ]);
  const stem = composeSentences(ctx, `يستطيع ${u(workers, 'worker')} إنجاز ${u(oldUnits, 'task', 'oblique')} خلال ${u(days, 'day', 'oblique')}. كم عاملًا نحتاج لإنجاز ${u(newUnits, 'task', 'oblique')} خلال ${u(days, 'day', 'oblique')} بالكفاءة نفسها؟`);
  return buildBase(ctx, {
    templateId: 'WORK_E_VOLUME',
    subskill: 'زيادة حجم العمل مع ثبات الزمن',
    difficulty: 'easy',
    // RC2-016: إنجاز governs its noun, so the count must take the genitive
    // form — إنجاز مهمتين, never إنجاز مهمتان.
    question: stem.text,
    stemStructure: stem.structure, informationOrder: stem.order,
    correct, distractors, format: unitFormat('worker'),
    steps: [
      `العمل يتغير بنسبة ${newUnits} إلى ${oldUnits}، والزمن ثابت.`,
      `عدد العمال المطلوب = ${workers} × ${newUnits} ÷ ${oldUnits} = ${correct}.`
    ],
    howToStart: 'مع ثبات الزمن، عدد العمال يتناسب مباشرة مع حجم العمل.',
    remember: 'إذا زاد العمل وبقي الزمن ثابتًا، زد العمال بالنسبة نفسها.',
    fastMethod: 'اضرب عدد العمال في نسبة العمل الجديد إلى القديم.',
    estimatedSteps: 2, conceptTags: ['work', 'direct-proportion'], parameters: params,
    oracle: {kind: 'constraint', answerKind: 'number', constraints: [eq(mul(X, oldUnits), mul(workers, newUnits))]},
    askedUnknown: 'workersForMoreWork', stageCount: 1,
    pedagogy: {
      targetSkill: 'SCALE_CREW_WITH_WORK', targetMisconception: 'ADDED_INSTEAD_OF_SCALING',
      wrongMethodValue: workers + newUnits - oldUnits,
      degenerateWhen: [{when: newUnits === oldUnits, note: 'work volume unchanged'}]
    },
    complexityFactors: {reasoningTransformations: 2, conceptCount: 1, stageCount: 1, conditionCount: 1, arithmeticBurden: 2},
    textParams: {essentialParams: ['workers', 'days', 'currentTasks', 'targetTasks']}
  });
}

function changeWorkers(ctx) {
  const {rng} = ctx;
  const w1 = rng.pick([6, 8, 10, 12]);
  const totalDays = rng.pick([10, 12, 15, 18]);
  const initialDays = rng.int(3, Math.min(5, totalDays - 3));
  const change = rng.pick([-2, 2, 4]);
  const w2 = w1 + change;
  if (w2 <= 2) return resample(ctx, changeWorkers);
  const totalWork = w1 * totalDays;
  const done = w1 * initialDays;
  const remain = totalWork - done;
  if (remain % w2 !== 0) return resample(ctx, changeWorkers);
  const correct = remain / w2;
  if (correct === totalDays - initialDays) return resample(ctx, changeWorkers);
  const params = {workers: w1, totalDays, workedDays: initialDays, crewChange: change};
  const distractors = usable(ctx, [
    mk(totalDays - initialDays, 'USED_COUNT_BEFORE_CHANGE', `${totalDays} − ${initialDays}`),
    mk(totalDays, 'USED_GIVEN_VALUE_AS_ANSWER', `المدة الأصلية ${totalDays}`),
    mk(remain / w1, 'USED_COUNT_BEFORE_CHANGE', `${remain} ÷ ${w1}`),
    mk(totalWork / w2, 'USED_TOTAL_INSTEAD_OF_REMAINDER', `${totalWork} ÷ ${w2}`, 3),
    mk(remain, 'STOPPED_AT_INTERMEDIATE_TOTAL', `${totalWork} − ${done}`),
    mk(remain / (w1 + Math.abs(change)), 'RATE_APPLIED_TO_WRONG_COUNT', `${remain} ÷ ${w1 + Math.abs(change)}`),
    mk(done / w2, 'USED_TOTAL_INSTEAD_OF_REMAINDER', `${done} ÷ ${w2}`, 3),
    mk(totalWork / w1, 'USED_COUNT_BEFORE_CHANGE', `${totalWork} ÷ ${w1}`),
    // RC2-012: deepened.
    mk(remain / w2 * 2, 'APPLIED_STEP_TWICE', `${remain} ÷ ${w2} × 2`),
    mk(remain / w2 + initialDays, 'STOPPED_AT_INTERMEDIATE_TOTAL', `${remain} ÷ ${w2} + ${initialDays}`),
    mk(totalDays - 2 * initialDays, 'USED_COUNT_BEFORE_CHANGE', `${totalDays} − 2 × ${initialDays}`),
    mk(done / w1, 'STOPPED_AT_INTERMEDIATE_TOTAL', `${done} ÷ ${w1}`, 3)
  ]);
  const stem = composeSentences(ctx, `يستطيع ${u(w1, 'worker')} إنجاز عمل كامل في ${u(totalDays, 'day', 'oblique')}. عملوا ${u(initialDays, 'day', 'oblique')}، ثم ${change > 0 ? `انضم إليهم ${u(change, 'worker')}` : `غادر ${u(Math.abs(change), 'worker')}`}. كم يومًا إضافيًا يحتاج العدد الجديد لإكمال العمل؟`);
  return buildBase(ctx, {
    templateId: 'WORK_M_CHANGE',
    subskill: 'تغير عدد العمال بعد إنجاز جزء من العمل',
    difficulty: 'hard',
    question: stem.text,
    stemStructure: stem.structure, informationOrder: stem.order,
    correct, distractors, format: unitFormat('day'),
    steps: [
      `العمل الكامل بوحدة عامل-يوم = ${w1} × ${totalDays} = ${totalWork}.`,
      `المنجز = ${w1} × ${initialDays} = ${done}.`,
      `المتبقي = ${totalWork} − ${done} = ${remain}.`,
      `عدد العمال الجديد = ${w1} ${change > 0 ? '+' : '−'} ${Math.abs(change)} = ${w2}.`,
      `الأيام الإضافية = ${remain} ÷ ${w2} = ${correct}.`
    ],
    howToStart: 'احسب العمل الكامل ثم المنجز ثم المتبقي.',
    remember: 'عند تغير عدد العمال أثناء العمل، لا تطبق العدد الجديد على العمل الكامل.',
    fastMethod: 'المتبقي ÷ عدد العمال الجديد.',
    estimatedSteps: 4, conceptTags: ['work', 'stages'], parameters: params,
    oracle: {
      kind: 'constraint', answerKind: 'number',
      constraints: [eq(add(mul(w1, initialDays), mul(w1 + change, X)), mul(w1, totalDays))]
    },
    askedUnknown: 'extraDaysAfterCrewChange', stageCount: 2,
    pedagogy: {
      targetSkill: 'REMAINING_WORK', targetMisconception: 'USED_COUNT_BEFORE_CHANGE',
      wrongMethodValue: totalDays - initialDays,
      degenerateWhen: [{when: change === 0, note: 'crew unchanged'}]
    },
    complexityFactors: {reasoningTransformations: 3, conceptCount: 2, stageCount: 2, arithmeticBurden: 3},
    textParams: {derivedFromParams: [Math.abs(change)], essentialParams: ['workers', 'totalDays', 'workedDays']}
  });
}

function efficiencyChange(ctx) {
  const {rng} = ctx;
  // RC2-011. The answer is days ÷ the efficiency factor, and both pools were
  // short, so the quotient took few values.
  const days = rng.pick([8, 10, 12, 14, 15, 16, 18, 20, 24, 25, 27, 30, 32, 36]);
  const pct = rng.pick([20, 25, 50, 60, 75, 80, 100, 125, 150]);
  const {factor, text: factorText} = factorLine(pct, 'up', 'معامل الكفاءة');
  const answer = Fraction.from(days).div(factor);
  if (!answer.isInteger) return resample(ctx, efficiencyChange);
  const correct = answer.toNumber();
  const params = {days, efficiencyPercent: pct};
  const distractors = usable(ctx, [
    mk(days, 'USED_GIVEN_VALUE_AS_ANSWER', `المدة الأصلية ${days}`),
    mk(days * (100 - pct) / 100, 'SUBTRACTED_PERCENTAGE_DIRECTLY', `${days} × (100 − ${pct}) ÷ 100`),
    mk(Fraction.from(days).mul(factor).toNumber(), 'REVERSED_INVERSE_PROPORTION', `${days} × ${factor.toDecimalString()}`),
    mk(days - pct / 10, 'TREATED_PERCENT_AS_AMOUNT', `${days} − ${pct} ÷ 10`),
    mk(Fraction.from(days).div(factor).div(factor).toNumber(), 'APPLIED_STEP_TWICE', `${days} ÷ ${factor.toDecimalString()} ÷ ${factor.toDecimalString()}`),
    mk(days - Fraction.from(days).div(factor).toNumber(), 'TOOK_COMPLEMENT_PERCENT', `${days} − ${days} ÷ ${factor.toDecimalString()}`),
    mk(days + pct / 10, 'TREATED_PERCENT_AS_AMOUNT', `${days} + ${pct} ÷ 10`)
  ]);
  const stem = composeSentences(ctx, `فريق ينجز عملًا في ${u(days, 'day', 'oblique')}. بعد تدريب ارتفعت كفاءة الفريق ${riseByPercentPhrase(pct)} مع بقاء عدد العمال نفسه. كم يومًا يحتاج للعمل نفسه؟`);
  return buildBase(ctx, {
    templateId: 'WORK_M_EFF',
    subskill: 'زيادة كفاءة العمال مع ثبات العدد',
    difficulty: 'easy',
    question: stem.text,
    stemStructure: stem.structure, informationOrder: stem.order,
    correct, distractors, format: unitFormat('day'),
    steps: [
      factorText,
      `الزمن يتغير عكسيًا مع الكفاءة.`,
      `الزمن الجديد بالأيام = ${days} ÷ ${factor.toDecimalString()} = ${correct}.`
    ],
    howToStart: 'الكفاءة والزمن علاقة عكسية للعمل نفسه.',
    remember: 'زيادة الكفاءة لا تعني طرح النسبة نفسها من الزمن.',
    fastMethod: 'اقسم الزمن القديم على معامل زيادة الكفاءة.',
    estimatedSteps: 3, conceptTags: ['work', 'inverse-proportion', 'percentage'], parameters: params,
    oracle: {kind: 'constraint', answerKind: 'number', constraints: [eq(mul(X, add(100, pct)), mul(days, 100))]},
    askedUnknown: 'daysAfterEfficiencyGain', stageCount: 2,
    pedagogy: {
      targetSkill: 'EFFICIENCY_IS_INVERSE', targetMisconception: 'SUBTRACTED_PERCENTAGE_DIRECTLY',
      wrongMethodValue: days * (100 - pct) / 100,
      degenerateWhen: [{when: pct === 0, note: 'no efficiency change'}]
    },
    complexityFactors: {reasoningTransformations: 2, conceptCount: 2, stageCount: 2, arithmeticBurden: 2},
    textParams: {essentialParams: ['days', 'efficiencyPercent']}
  });
}

function targetDeadline(ctx) {
  const {rng} = ctx;
  const w = rng.pick([6, 8, 10, 12]);
  const totalDays = rng.pick([12, 15, 18]);
  const initialDays = rng.pick([3, 4, 5]);
  const total = w * totalDays;
  const done = w * initialDays;
  const remain = total - done;
  const finishDays = rng.pick([3, 4, 5, 6]);
  if (remain % finishDays !== 0) return resample(ctx, targetDeadline);
  const correct = remain / finishDays;
  if (correct === w) return resample(ctx, targetDeadline);
  const params = {workers: w, totalDays, workedDays: initialDays, deadlineDays: finishDays};
  const distractors = usable(ctx, [
    mk(w, 'USED_GIVEN_VALUE_AS_ANSWER', `عدد العمال الأصلي ${w}`),
    mk(total / finishDays, 'USED_TOTAL_INSTEAD_OF_REMAINDER', `${total} ÷ ${finishDays}`, 3),
    mk(remain / (totalDays - initialDays), 'USED_ORIGINAL_SCHEDULE', `${remain} ÷ (${totalDays} − ${initialDays})`),
    mk(remain, 'STOPPED_AT_INTERMEDIATE_TOTAL', `${total} − ${done}`),
    // RC2-012: this template could not fill six options at all. These are the
    // slips available on the work, the crew and the two spans.
    mk(remain / totalDays, 'USED_ORIGINAL_SCHEDULE', `${remain} ÷ ${totalDays}`),
    mk(total / totalDays, 'USED_TOTAL_INSTEAD_OF_REMAINDER', `${total} ÷ ${totalDays}`, 3),
    mk(done / finishDays, 'USED_TOTAL_INSTEAD_OF_REMAINDER', `${done} ÷ ${finishDays}`, 3),
    mk(w * finishDays / totalDays, 'REVERSED_INVERSE_PROPORTION', `${w} × ${finishDays} ÷ ${totalDays}`),
    mk(w + remain / finishDays, 'ADDED_INSTEAD_OF_SCALING', `${w} + ${remain} ÷ ${finishDays}`),
    mk(remain / finishDays * 2, 'APPLIED_STEP_TWICE', `${remain} ÷ ${finishDays} × 2`),
    mk(remain / finishDays + w, 'STOPPED_AT_INTERMEDIATE_TOTAL', `${remain} ÷ ${finishDays} + ${w}`),
    mk(w * totalDays / finishDays, 'REVERSED_INVERSE_PROPORTION', `${w} × ${totalDays} ÷ ${finishDays}`)
  ]);
  const stem = composeSentences(ctx, `يستطيع ${u(w, 'worker')} إنجاز عمل كامل في ${u(totalDays, 'day', 'oblique')}. عملوا ${u(initialDays, 'day', 'oblique')}، ثم تقرر إنهاء ما تبقى خلال ${u(finishDays, 'day', 'oblique')} فقط. كم عاملًا يجب أن يعمل خلال المدة الأخيرة؟`);
  return buildBase(ctx, {
    templateId: 'WORK_M_TARGET',
    subskill: 'حساب العمل المتبقي ثم عدد العمال المطلوب',
    difficulty: 'medium',
    question: stem.text,
    stemStructure: stem.structure, informationOrder: stem.order,
    correct, distractors, format: unitFormat('worker'),
    steps: [
      `العمل الكامل بوحدة عامل-يوم = ${w} × ${totalDays} = ${total}.`,
      `المنجز = ${w} × ${initialDays} = ${done}.`,
      `المتبقي = ${total} − ${done} = ${remain}.`,
      `عدد العمال المطلوب = ${remain} ÷ ${finishDays} = ${correct}.`
    ],
    howToStart: 'احسب العمل المتبقي قبل إعادة توزيع الخطة.',
    remember: 'عندما يتغير الموعد النهائي، أعد توزيع المتبقي فقط.',
    fastMethod: 'عامل-يوم المتبقي ÷ الأيام المتاحة.',
    estimatedSteps: 4, conceptTags: ['work', 'stages', 'reverse'], parameters: params,
    oracle: {
      kind: 'constraint', answerKind: 'number',
      constraints: [eq(add(mul(w, initialDays), mul(X, finishDays)), mul(w, totalDays))]
    },
    askedUnknown: 'workersForDeadline', stageCount: 2,
    pedagogy: {
      targetSkill: 'REMAINING_WORK', targetMisconception: 'USED_TOTAL_INSTEAD_OF_REMAINDER',
      wrongMethodValue: total / finishDays,
      degenerateWhen: [{when: initialDays === 0, note: 'nothing done yet: remainder equals the whole'}]
    },
    complexityFactors: {reasoningTransformations: 3, conceptCount: 2, stageCount: 2, reverseReasoning: 1, arithmeticBurden: 3},
    textParams: {essentialParams: ['workers', 'totalDays', 'workedDays', 'deadlineDays']}
  });
}

function twoStageWorkers(ctx) {
  const {rng} = ctx;
  const w1 = rng.pick([8, 10, 12]);
  const totalDays = rng.pick([15, 18, 20]);
  const firstDays = rng.pick([3, 4, 5]);
  const total = w1 * totalDays;
  const done = w1 * firstDays;
  const left = rng.pick([2, 4]);
  const w2 = w1 - left;
  if (w2 <= 0) return resample(ctx, twoStageWorkers);
  const secondDays = rng.pick([2, 3, 4]);
  const done2 = w2 * secondDays;
  const remain = total - done - done2;
  if (remain <= 0 || remain % w2 !== 0) return resample(ctx, twoStageWorkers);
  const correct = remain / w2;
  const params = {workers: w1, totalDays, firstDays, workersLeft: left, secondDays};
  const distractors = usable(ctx, [
    mk(totalDays - firstDays - secondDays, 'USED_COUNT_BEFORE_CHANGE', `${totalDays} − ${firstDays} − ${secondDays}`),
    mk((total - done) / w2, 'MISSED_ONE_STAGE', `(${total} − ${done}) ÷ ${w2}`),
    mk(remain / w1, 'USED_COUNT_BEFORE_CHANGE', `${remain} ÷ ${w1}`),
    mk(firstDays + secondDays, 'STOPPED_AT_INTERMEDIATE_TOTAL', `${firstDays} + ${secondDays}`),
    mk(remain / (w1 + w2), 'RATE_APPLIED_TO_WRONG_COUNT', `${remain} ÷ (${w1} + ${w2})`),
    mk(total / w2, 'USED_TOTAL_INSTEAD_OF_REMAINDER', `${total} ÷ ${w2}`, 3),
    mk(remain, 'STOPPED_AT_INTERMEDIATE_TOTAL', `${total} − ${done} − ${done2}`)
  ]);
  const stem = composeSentences(ctx, `يستطيع ${u(w1, 'worker')} إنجاز عمل في ${u(totalDays, 'day', 'oblique')}. عمل الجميع ${u(firstDays, 'day', 'oblique')}، ثم غادر ${u(left, 'worker')} وعمل الباقون ${u(secondDays, 'day', 'oblique')} ${adj(secondDays, 'day', 'إضافي')}. كم يومًا آخر يحتاج العمال الباقون لإكمال العمل؟`);
  return buildBase(ctx, {
    templateId: 'WORK_H_TWO_STAGE',
    subskill: 'تغير العمال عبر مرحلتين قبل حساب المتبقي',
    difficulty: 'hard',
    question: stem.text,
    stemStructure: stem.structure, informationOrder: stem.order,
    correct, distractors, format: unitFormat('day'),
    steps: [
      `العمل الكامل بوحدة عامل-يوم = ${w1} × ${totalDays} = ${total}.`,
      `إنجاز المرحلة الأولى = ${w1} × ${firstDays} = ${done}.`,
      `عدد الباقين = ${w1} − ${left} = ${w2}.`,
      `إنجاز المرحلة الثانية = ${w2} × ${secondDays} = ${done2}.`,
      `المتبقي = ${total} − ${done} − ${done2} = ${remain}.`,
      `الأيام الإضافية = ${remain} ÷ ${w2} = ${correct}.`
    ],
    howToStart: 'قسّم العمل إلى مراحل واحسب منجز كل مرحلة.',
    remember: 'في مسائل المراحل، لا تختصر قبل حساب ما تم في كل فترة.',
    fastMethod: 'اجمع المنجز في المرحلتين ثم اطرح من العمل الكامل.',
    estimatedSteps: 5, conceptTags: ['work', 'stages'], parameters: params,
    oracle: {
      kind: 'constraint', answerKind: 'number',
      constraints: [eq(add(mul(w1, firstDays), mul(w1 - left, secondDays), mul(w1 - left, X)), mul(w1, totalDays))]
    },
    askedUnknown: 'extraDaysAfterTwoStages', stageCount: 3,
    pedagogy: {
      targetSkill: 'MULTI_STAGE_REMAINDER', targetMisconception: 'MISSED_ONE_STAGE',
      wrongMethodValue: (total - done) / w2,
      degenerateWhen: [{when: secondDays === 0, note: 'second stage does no work'}]
    },
    complexityFactors: {reasoningTransformations: 4, conceptCount: 2, stageCount: 3, arithmeticBurden: 4, dependencyDepth: 2},
    textParams: {essentialParams: ['workers', 'totalDays', 'firstDays', 'workersLeft', 'secondDays']}
  });
}

function workersAndEfficiency(ctx) {
  const {rng} = ctx;
  const w = rng.pick([8, 10, 12]);
  const totalDays = rng.pick([12, 15, 18]);
  const initial = rng.pick([3, 4]);
  const total = w * totalDays;
  const done = w * initial;
  const remain = total - done;
  const left = rng.pick([2, 4]);
  const newW = w - left;
  const pct = rng.pick([20, 25, 50]);
  const {factor, text: factorText} = factorLine(pct, 'up', 'معامل الكفاءة');
  const effective = Fraction.from(newW).mul(factor);
  const answer = Fraction.from(remain).div(effective);
  if (!answer.isInteger || !effective.isExactDecimal || effective.decimalPlaces > 2) return resample(ctx, workersAndEfficiency);
  const correct = answer.toNumber();
  const params = {workers: w, totalDays, workedDays: initial, workersLeft: left, efficiencyPercent: pct};
  const distractors = usable(ctx, [
    mk(remain / newW, 'USED_RATE_BEFORE_CHANGE', `${remain} ÷ ${newW}`),
    mk(totalDays - initial, 'USED_COUNT_BEFORE_CHANGE', `${totalDays} − ${initial}`),
    mk(Fraction.from(remain).div(Fraction.from(w).mul(factor)).toNumber(), 'FAILED_TO_UPDATE_COUNT', `${remain} ÷ (${w} × ${factor.toDecimalString()})`),
    mk(Fraction.from(total).div(effective).toNumber(), 'USED_TOTAL_INSTEAD_OF_REMAINDER', `${total} ÷ ${effective.toDecimalString()}`),
    mk(Fraction.from(totalDays).div(factor).toNumber(), 'MISSED_ONE_STAGE', `${totalDays} ÷ ${factor.toDecimalString()}`),
    mk(Fraction.from(remain).div(Fraction.from(newW).mul(factor)).mul(2).toNumber(), 'APPLIED_STEP_TWICE', `${remain} ÷ (${newW} × ${factor.toDecimalString()}) × 2`),
    mk(Fraction.from(remain).div(newW).div(factor).div(factor).toNumber(), 'APPLIED_STEP_TWICE', `${remain} ÷ ${newW} ÷ ${factor.toDecimalString()} ÷ ${factor.toDecimalString()}`),
    mk(Fraction.from(remain).mul(factor).div(newW).toNumber(), 'REVERSED_INVERSE_PROPORTION', `${remain} × ${factor.toDecimalString()} ÷ ${newW}`)
  ]);
  const stem = composeSentences(ctx, `يستطيع ${u(w, 'worker')} إنجاز عمل في ${u(totalDays, 'day', 'oblique')}. بعد ${u(initial, 'day', 'oblique')} غادر ${u(left, 'worker')}، ثم ارتفعت كفاءة كل عامل باقٍ ${riseByPercentPhrase(pct)}. كم يومًا إضافيًا يحتاجون لإكمال العمل؟`);
  return buildBase(ctx, {
    templateId: 'WORK_H_WORKERS_EFF',
    subskill: 'تغير عدد العمال والكفاءة بعد بدء العمل',
    difficulty: 'hard',
    question: stem.text,
    stemStructure: stem.structure, informationOrder: stem.order,
    correct, distractors, format: unitFormat('day'),
    steps: [
      `العمل الكامل بوحدة عامل-يوم = ${w} × ${totalDays} = ${total}.`,
      `المنجز = ${w} × ${initial} = ${done}.`,
      `المتبقي = ${total} − ${done} = ${remain}.`,
      `عدد الباقين = ${w} − ${left} = ${newW}.`,
      factorText,
      `المعدل اليومي المكافئ = ${newW} × ${factor.toDecimalString()} = ${effective.toDecimalString()}.`,
      `الأيام الإضافية = ${remain} ÷ ${effective.toDecimalString()} = ${correct}.`
    ],
    howToStart: 'افصل أثر عدد العمال عن أثر الكفاءة، ثم اجمعهما في معدل مكافئ.',
    remember: 'إذا تغير العدد والكفاءة معًا، استخدم معدل عمل مكافئ لا عدد العمال وحده.',
    fastMethod: 'المتبقي ÷ (العمال الباقون × معامل الكفاءة).',
    estimatedSteps: 5, conceptTags: ['work', 'stages', 'percentage'], parameters: params,
    oracle: {
      kind: 'constraint', answerKind: 'number',
      constraints: [eq(add(mul(w, initial, 100), mul(w - left, add(100, pct), X)), mul(w, totalDays, 100))]
    },
    askedUnknown: 'extraDaysAfterCrewAndEfficiency', stageCount: 3,
    pedagogy: {
      targetSkill: 'CREW_AND_EFFICIENCY', targetMisconception: 'USED_RATE_BEFORE_CHANGE',
      wrongMethodValue: remain / newW,
      degenerateWhen: [{when: pct === 0 || left === 0, note: 'only one of the two factors changed'}]
    },
    complexityFactors: {reasoningTransformations: 4, conceptCount: 3, stageCount: 3, arithmeticBurden: 4, dependencyDepth: 2},
    textParams: {essentialParams: ['workers', 'totalDays', 'workedDays', 'workersLeft', 'efficiencyPercent']}
  });
}

// ---------------------------------------------------------------------------
// RC2.4 — genuinely hard structures for this family.
//
// Every RC2.3 work_time template is worker-day accounting run forward: total,
// done, remaining, divide. The two below are not. In the first the asked
// quantity exists only as a reciprocal; in the second it sits inside a product
// that has to be conserved across a changed span.
// ---------------------------------------------------------------------------

/**
 * COMPOSED_INVERSION + SIMULTANEOUS_CONSTRAINTS.
 *
 * Times do not add and do not subtract — rates do. The joint time and one solo
 * time are given, and the other solo time is reachable only by converting both
 * into rates, subtracting there, and inverting back. Nothing in the sentence
 * signals that the arithmetic has to leave the units it is stated in.
 */
function jointThenSoloTime(ctx) {
  const {rng} = ctx;
  let found = null;
  for (let t = 0; t < 150; t++) {
    const solo = rng.pick([10, 12, 15, 18, 20, 24, 30]);
    const other = rng.pick([12, 15, 20, 24, 30, 36, 40, 45, 60]).valueOf();
    if (other === solo) continue;
    // The joint time is a consequence of the two solo rates, never a third pick.
    const jointNum = solo * other;
    const jointDen = solo + other;
    if (jointNum % jointDen !== 0) continue;
    const joint = jointNum / jointDen;
    if (joint >= solo || joint >= other) continue;
    // The slip this item teaches against is subtracting the times. Where that
    // lands on the key the item measures nothing (Section 10).
    if (solo - joint === other) continue;
    found = {solo, other, joint};
    break;
  }
  if (!found) return resample(ctx, jointThenSoloTime);
  const {solo, other, joint} = found;
  const correct = other;
  const params = {jointDays: joint, firstSoloDays: solo};

  const distractors = usable(ctx, [
    mk(solo - joint, 'SUBTRACTED_TIMES_INSTEAD_OF_RATES', `${solo} − ${joint}`, 2),
    mk(solo + joint, 'ADDED_TIMES_INSTEAD_OF_RATES', `${solo} + ${joint}`),
    mk(joint, 'USED_JOINT_TIME_AS_SOLO', `زمن العمل المشترك ${joint}`),
    mk(solo, 'USED_GIVEN_VALUE_AS_ANSWER', `زمن الأول وحده ${solo}`),
    mk(2 * joint, 'APPLIED_STEP_TWICE', `${joint} × 2`),
    mk(solo * joint, 'STOPPED_AT_INTERMEDIATE_TOTAL', `${solo} × ${joint}`, 2),
    mk(solo / 2, 'MISREAD_THE_STEP', `${solo} ÷ 2`),
    mk(solo + other - joint, 'ADDED_TIMES_INSTEAD_OF_RATES', `${solo} + ${other} − ${joint}`),
    mk(joint * 2 + solo, 'APPLIED_STEP_TWICE', `${joint} × 2 + ${solo}`)
  ]);

  const stem = composeSentences(ctx, `ينجز عاملان العمل نفسه معًا في ${u(joint, 'day', 'oblique')}. ولو عمل الأول وحده لأنجزه في ${u(solo, 'day', 'oblique')}. كم ${unitWordKam('day')} يحتاج الثاني وحده لإنجاز العمل نفسه؟`);
  return buildBase(ctx, {
    templateId: 'WORK_H_JOINT_SOLO',
    subskill: 'زمن الطرف الثاني من الزمن المشترك وزمن الأول',
    difficulty: 'hard',
    question: stem.text,
    stemStructure: stem.structure, informationOrder: stem.order,
    correct, distractors, format: unitFormat('day'),
    steps: [
      `نعمل بالمعدلات لا بالأزمنة: ما ينجزه الاثنان معًا في اليوم = 1 ÷ ${joint}.`,
      `ما ينجزه الأول وحده في اليوم = 1 ÷ ${solo}.`,
      `معدل الثاني = 1 ÷ ${joint} − 1 ÷ ${solo}، وبتوحيد المقامات على ${solo} × ${joint} = ${solo * joint}، يصبح البسط ${solo} − ${joint} = ${solo - joint}.`,
      `زمن الثاني وحده = ${solo * joint} ÷ ${solo - joint} = ${correct}.`
    ],
    howToStart: 'حوّل كل زمن إلى معدل يومي، واطرح هناك، ثم اعكس الناتج للعودة إلى الزمن.',
    remember: 'الأزمنة لا تُطرح ولا تُجمع؛ المعدلات هي التي تفعل.',
    fastMethod: `اضرب الزمنين المعلومين واقسم على فرقهما: ${solo} × ${joint} ÷ (${solo} − ${joint}).`,
    estimatedSteps: 4, conceptTags: ['work-rate', 'reciprocal', 'inverse'], parameters: params,
    oracle: {
      kind: 'constraint', answerKind: 'number',
      constraints: [eq(mul(X, sub(solo, joint)), mul(solo, joint))]
    },
    askedUnknown: 'secondSoloDays', stageCount: 3,
    pedagogy: {
      targetSkill: 'RATES_ADD_TIMES_DO_NOT', targetMisconception: 'SUBTRACTED_TIMES_INSTEAD_OF_RATES',
      wrongMethodValue: solo - joint
    },
    complexityFactors: {reasoningTransformations: 4, conceptCount: 3, reverseReasoning: 1, equationSolving: 1, stageCount: 3, arithmeticBurden: 4},
    textParams: {essentialParams: ['jointDays', 'firstSoloDays']}
  });
}

/**
 * COMPOSED_INVERSION + STRATEGY_SELECTION.
 *
 * How many workers were added is never stated and cannot be read off anything;
 * it is recovered by holding the worker-day product constant across a span that
 * changed. The sentence offers no route — the conservation is the insight.
 */
function extraWorkersSaveDays(ctx) {
  const {rng} = ctx;
  let found = null;
  for (let t = 0; t < 150; t++) {
    const workers = rng.pick([8, 10, 12, 15, 16, 18, 20]);
    const days = rng.pick([12, 15, 16, 18, 20, 24, 30]);
    const saved = rng.pick([2, 3, 4, 5, 6]);
    if (saved >= days) continue;
    const totalWork = workers * days;
    const newDays = days - saved;
    if (totalWork % newDays !== 0) continue;
    const extra = totalWork / newDays - workers;
    if (extra <= 0 || extra > workers) continue;
    // The slip is dividing the saved days into the crew; where that coincides
    // with the answer the item stops separating the two (Section 10).
    if (extra === saved) continue;
    // RC2.4: the answer is a count of workers, so the modelled slips have to be
    // counts of workers too, or the count-unit rule demotes them and a fraction
    // of a worker fills the gap.
    if ((workers * saved) % days !== 0) continue;
    if (workers % saved !== 0) continue;
    found = {workers, days, saved, totalWork, newDays, extra};
    break;
  }
  if (!found) return resample(ctx, extraWorkersSaveDays);
  const {workers, days, saved, totalWork, newDays, extra} = found;
  const newCrew = workers + extra;
  const correct = extra;
  const params = {workers, plannedDays: days, daysSaved: saved};

  const distractors = usable(ctx, [
    mk(newCrew, 'USED_NEW_TOTAL', `عدد العمال بعد الزيادة ${newCrew}`, 3),
    mk(saved, 'USED_GIVEN_VALUE_AS_ANSWER', `عدد الأيام الموفَّرة ${saved}`),
    mk(newDays, 'STOPPED_AT_INTERMEDIATE_TOTAL', `${days} − ${saved}`, 1),
    mk(workers, 'USED_ORIGINAL_TOTAL', `عدد العمال قبل الزيادة ${workers}`),
    mk(workers * saved / days, 'REVERSED_INVERSE_PROPORTION', `${workers} × ${saved} ÷ ${days}`),
    mk(workers + saved, 'ADDED_INSTEAD_OF_SCALING', `${workers} + ${saved}`),
    mk(totalWork / days + saved, 'ADDED_INSTEAD_OF_SCALING', `${totalWork} ÷ ${days} + ${saved}`),
    mk(2 * extra, 'APPLIED_STEP_TWICE', `${extra} × 2`),
    mk(workers / saved, 'REVERSED_INVERSE_PROPORTION', `${workers} ÷ ${saved}`),
    mk(newCrew - saved, 'MISREAD_THE_STEP', `${newCrew} − ${saved}`, 2),
    mk(extra + saved, 'ADDED_INSTEAD_OF_SCALING', `${extra} + ${saved}`)
  ]);

  const stem = composeSentences(ctx, `يستطيع ${u(workers, 'worker')} إنجاز عمل في ${u(days, 'day', 'oblique')}. وللانتهاء قبل الموعد بـ${u(saved, 'day', 'oblique')} أُضيف عدد من العمال بالكفاءة نفسها. كم عاملًا أُضيف؟`);
  return buildBase(ctx, {
    templateId: 'WORK_H_EXTRA_WORKERS',
    subskill: 'عدد العمال الإضافيين من توفير في المدة',
    difficulty: 'hard',
    question: stem.text,
    stemStructure: stem.structure, informationOrder: stem.order,
    correct, distractors, format: unitFormat('worker'),
    steps: [
      `العمل الكامل بوحدة عامل-يوم = ${workers} × ${days} = ${totalWork}.`,
      `المدة الجديدة = ${days} − ${saved} = ${newDays}.`,
      `العمل نفسه لم يتغير، فعدد العمال المطلوب = ${totalWork} ÷ ${newDays} = ${newCrew}.`,
      `عدد العمال المضافين = ${newCrew} − ${workers} = ${correct}.`
    ],
    howToStart: 'احسب العمل الكامل بوحدة عامل-يوم، فهو الشيء الوحيد الذي لم يتغير.',
    remember: 'عدد العمال والزمن يتناسبان عكسيًا ما دام العمل نفسه.',
    fastMethod: `اقسم العمل الكامل على المدة الجديدة ثم اطرح العدد الأصلي.`,
    estimatedSteps: 4, conceptTags: ['work-rate', 'inverse', 'conservation'], parameters: params,
    oracle: {
      kind: 'constraint', answerKind: 'number',
      constraints: [eq(mul(add(X, workers), sub(days, saved)), mul(workers, days))]
    },
    askedUnknown: 'extraWorkers', stageCount: 3,
    pedagogy: {
      targetSkill: 'CONSERVED_WORKER_DAYS', targetMisconception: 'USED_NEW_TOTAL',
      wrongMethodValue: newCrew
    },
    complexityFactors: {reasoningTransformations: 4, conceptCount: 3, reverseReasoning: 1, equationSolving: 1, stageCount: 3, arithmeticBurden: 4},
    textParams: {essentialParams: ['workers', 'plannedDays', 'daysSaved']}
  });
}

/**
 * RC2.6-1. CROSS_PART_INTEGRATION + STRATEGY_SELECTION.
 *
 * Three workers, and only the three PAIRS are timed — no individual rate is
 * given and none can be read off a single pair. The step that unlocks it is not
 * in the stem: adding the three pair rates counts every worker exactly twice, so
 * half that sum is the rate of all three together. A solver who averages the
 * three times, or who adds them, has a number on the paper.
 */
function threePairwiseRates(ctx) {
  const {rng} = ctx;
  // The three PAIR times are the given data, so they are what is drawn. The
  // individual solo times never appear in the question and are not required to
  // be whole; what must come out whole is the answer. Searching the pair space
  // directly rather than the solo space is what keeps the parameter set wide —
  // the solo-first search admits only two essentially different triples.
  const POOL = [9, 10, 12, 14, 15, 16, 18, 20, 21, 24, 28, 30, 36, 40, 45];
  let found = null;
  for (let t = 0; t < 400; t++) {
    const ab = rng.pick(POOL), bc = rng.pick(POOL), ac = rng.pick(POOL);
    if (new Set([ab, bc, ac]).size !== 3) continue;
    // 1/ab + 1/bc + 1/ac = 2/all
    const num = 2 * ab * bc * ac;
    const den = bc * ac + ab * ac + ab * bc;
    if (num % den !== 0) continue;
    const all = num / den;
    // Every worker must have a positive rate, or the three times contradict.
    const twice = (x, y, z) => 1 / x + 1 / y - 1 / z;
    if (twice(ab, ac, bc) <= 0 || twice(ab, bc, ac) <= 0 || twice(bc, ac, ab) <= 0) continue;
    // An answer equal to one of the three given times is answerable by copying
    // a number off the page.
    if (all === ab || all === bc || all === ac) continue;
    found = {ab, bc, ac, all};
    break;
  }
  if (!found) return resample(ctx, threePairwiseRates);
  const {ab, bc, ac, all} = found;
  const prod = ab * bc * ac;
  const sum = bc * ac + ab * ac + ab * bc;
  const correct = all;
  const params = {firstPairDays: ab, secondPairDays: bc, thirdPairDays: ac};

  const distractors = usable(ctx, [
    mk((ab + bc + ac) / 3, 'AVERAGED_THE_PAIRED_TIMES', `(${ab} + ${bc} + ${ac}) ÷ 3`),
    mk(ab + bc + ac, 'ADDED_TIMES_INSTEAD_OF_RATES', `${ab} + ${bc} + ${ac}`),
    mk(Math.min(ab, bc, ac), 'USED_ONE_PAIR_AS_THE_WHOLE', `أسرع زوج ${Math.min(ab, bc, ac)}`),
    mk(2 * correct, 'FORGOT_TO_HALVE_THE_DIFFERENCE', `${correct} × 2`),
    mk(Math.round(2 / (1 / ab + 1 / ac - 1 / bc)), 'USED_ONE_PAIR_AS_THE_WHOLE',
      'زمن عامل واحد وحده بدل الثلاثة معًا', 3),
    mk(Math.max(ab, bc, ac) - Math.min(ab, bc, ac), 'USED_DIFFERENCE_AS_ANSWER',
      `${Math.max(ab, bc, ac)} − ${Math.min(ab, bc, ac)}`),
    mk((ab + bc + ac) / 2, 'FORGOT_TO_HALVE_THE_DIFFERENCE', `(${ab} + ${bc} + ${ac}) ÷ 2`)
  ]);

  const stem = composeSentences(ctx, `ينجز العاملان الأول والثاني عملًا معًا في ${u(ab, 'day', 'oblique')}، والثاني والثالث في ${u(bc, 'day', 'oblique')}، والأول والثالث في ${u(ac, 'day', 'oblique')}. كم ${unitWordKam('day')} يحتاج الثلاثة معًا لإنجاز العمل نفسه؟`);
  return buildBase(ctx, {
    templateId: 'WORK_H_THREE_PAIRS',
    scenario: 'three_workers_timed_in_pairs',
    direction: 'forward',
    subskill: 'زمن ثلاثة معًا من أزمنة الأزواج',
    difficulty: 'hard',
    question: stem.text,
    stemStructure: stem.structure, informationOrder: stem.order,
    correct, distractors, format: unitFormat('day'),
    steps: [
      `معدل كل زوج في اليوم: 1 ÷ ${ab}، و1 ÷ ${bc}، و1 ÷ ${ac}.`,
      `المقام الموحد = ${ab} × ${bc} × ${ac} = ${prod}.`,
      `والبسوط: ${bc} × ${ac} = ${bc * ac}، و${ab} × ${ac} = ${ab * ac}، و${ab} × ${bc} = ${ab * bc}.`,
      `مجموع البسوط = ${bc * ac} + ${ab * ac} + ${ab * bc} = ${sum}.`,
      `جمع معدلات الأزواج يُدخل كل عامل مرتين، فهذا المجموع ضعف معدل الثلاثة معًا.`,
      `إذن الزمن = ${prod} × 2 ÷ ${sum} = ${2 * prod} ÷ ${sum} = ${correct}.`
    ],
    howToStart: 'اجمع معدلات الأزواج الثلاثة ولاحظ كم مرة دخل كل عامل في المجموع.',
    remember: 'الأزمنة لا تُجمع ولا تُتوسَّط؛ المعدلات هي ما يُجمع.',
    fastMethod: 'اجمع معدلات الأزواج ثم خذ النصف.',
    estimatedSteps: 6, conceptTags: ['work-rate', 'three-unknowns', 'reciprocal'], parameters: params,
    oracle: {
      kind: 'constraint', answerKind: 'number',
      constraints: [eq(mul(X, add(add(mul(bc, ac), mul(ab, ac)), mul(ab, bc))), mul(2, mul(ab, mul(bc, ac))))]
    },
    askedUnknown: 'threeTogetherDays', stageCount: 3,
    pedagogy: {
      targetSkill: 'SUM_PAIR_RATES_THEN_HALVE', targetMisconception: 'AVERAGED_THE_PAIRED_TIMES',
      wrongMethodValue: (ab + bc + ac) / 3
    },
    complexityFactors: {reasoningTransformations: 4, conceptCount: 3, equationSolving: 1, conditionCount: 3, stageCount: 3, arithmeticBurden: 6},
    textParams: {essentialParams: ['firstPairDays', 'secondPairDays', 'thirdPairDays']}
  });
}

/**
 * RC2.6-1. SIMULTANEOUS_CONSTRAINTS + COMPOSED_INVERSION.
 *
 * The joint time is given and the two solo times are related only by a stated
 * DIFFERENCE. Neither solo time is recoverable on its own; the relation has to
 * be written with one unknown and inverted through the reciprocal sum, which is
 * a quadratic in disguise. Subtracting the joint time from the difference — the
 * shape a solver reaches for — is on the paper and wrong.
 */
function pairWithSoloGap(ctx) {
  const {rng} = ctx;
  // Both solo times are drawn and the joint time is their consequence. Drawing
  // the gap from a short list instead admits only three parameter sets — the
  // joint time has to come out whole, and that is a Pythagorean condition on
  // (gap, 2 x joint), not a free choice.
  let found = null;
  for (let t = 0; t < 400; t++) {
    const fast = rng.int(3, 40);
    const slow = rng.int(fast + 2, 80);
    const num = fast * slow, den = fast + slow;
    if (num % den !== 0) continue;
    const joint = num / den;
    if (joint >= fast) continue;
    const gap = slow - fast;
    // A gap equal to the answer, or to the joint time, lets a number be copied.
    if (gap === fast || gap === joint) continue;
    found = {fast, slow, gap, joint};
    break;
  }
  if (!found) return resample(ctx, pairWithSoloGap);
  const {fast, slow, gap, joint} = found;
  const correct = fast;
  const params = {jointDays: joint, gapDays: gap};

  const distractors = usable(ctx, [
    mk(slow, 'SWAPPED_THE_TWO_UNKNOWNS', `زمن الأبطأ وحده ${slow}`, 3),
    mk(joint + gap, 'ADDED_TIMES_INSTEAD_OF_RATES', `${joint} + ${gap}`),
    mk(2 * joint, 'APPLIED_STEP_TWICE', `${joint} × 2`),
    mk(2 * joint + gap, 'ADDED_TIMES_INSTEAD_OF_RATES', `${joint} × 2 + ${gap}`),
    mk(gap, 'USED_GIVEN_VALUE_AS_ANSWER', `الفرق المعطى ${gap}`),
    mk(slow - joint, 'SUBTRACTED_TIMES_INSTEAD_OF_RATES', `${slow} − ${joint}`),
    mk(joint, 'USED_JOINT_TIME_AS_SOLO', `الزمن المشترك ${joint}`),
    mk(fast + slow, 'ADDED_TIMES_INSTEAD_OF_RATES', `${fast} + ${slow}`)
  ]);

  const stem = composeSentences(ctx, `ينجز عاملان عملًا معًا في ${u(joint, 'day', 'oblique')}. ولو عمل كل منهما وحده لاحتاج الأبطأ ${u(gap, 'day', 'oblique')} أكثر من الأسرع. كم ${unitWordKam('day')} يحتاج الأسرع وحده؟`);
  return buildBase(ctx, {
    templateId: 'WORK_H_SOLO_GAP',
    scenario: 'pair_joint_time_with_solo_gap',
    direction: 'reverse',
    subskill: 'زمن كل عامل وحده من زمن مشترك وفرق بين الزمنين',
    difficulty: 'hard',
    question: stem.text,
    stemStructure: stem.structure, informationOrder: stem.order,
    correct, distractors, format: unitFormat('day'),
    steps: [
      `نفرض زمن الأسرع = س، فزمن الأبطأ = س + ${gap}.`,
      `معدلاهما معًا: 1 ÷ س + 1 ÷ (س + ${gap}) = 1 ÷ ${joint}.`,
      `بتوحيد المقامات: ${joint} × (س + س + ${gap}) = س × (س + ${gap}).`,
      `نبحث عن عددين فرقهما ${gap}، وحاصل ضربهما يساوي ${joint} في مجموعهما؛ وهما ${fast} و${slow}، لأن ${fast} × ${slow} = ${fast * slow} و${joint} × ${fast + slow} = ${joint * (fast + slow)}.`,
      `إذن زمن الأسرع = ${correct}.`
    ],
    howToStart: 'اكتب الزمنين بمجهول واحد، ثم اجمع المعدلين لا الزمنين.',
    remember: 'الفرق بين زمنين منفردين لا يُطرح من الزمن المشترك؛ العلاقة تمر عبر المعدلات.',
    fastMethod: 'ابحث عن عددين فرقهما معلوم وحاصل ضربهما يساوي الزمن المشترك في مجموعهما.',
    estimatedSteps: 5, conceptTags: ['work-rate', 'two-unknowns', 'reciprocal'], parameters: params,
    oracle: {
      kind: 'constraint', answerKind: 'number',
      constraints: [eq(mul(X, add(X, gap)), mul(joint, add(mul(2, X), gap)))]
    },
    askedUnknown: 'fasterSoloDays', stageCount: 3,
    pedagogy: {
      targetSkill: 'RATE_SUM_WITH_ONE_UNKNOWN', targetMisconception: 'ADDED_TIMES_INSTEAD_OF_RATES',
      wrongMethodValue: joint + gap,
      degenerateWhen: [{when: gap === 0, note: 'the two workers are equally fast, so the gap says nothing'}]
    },
    complexityFactors: {reasoningTransformations: 4, conceptCount: 3, equationSolving: 1, conditionCount: 2, reverseReasoning: 1, stageCount: 3, arithmeticBurden: 6},
    textParams: {essentialParams: ['jointDays', 'gapDays']}
  });
}
