import {Fraction} from '../qa/fraction.js';
import {mk, usable, u, num, unitFormat, buildBase, eq, X, add, sub, mul, factorLine, resample} from './_shared.js';

export function generateWorkTime({difficulty, rng, seed, engineVersion, telemetry}) {
  const ctx = {difficulty, rng, seed, engineVersion, telemetry, family: 'work_time', family_ar: 'العمال والزمن', category: 'العمال والزمن'};
  const list = difficulty === 'easy' ? [inverseDirect, workVolume]
    : difficulty === 'medium' ? [changeWorkers, efficiencyChange, targetDeadline]
    : [twoStageWorkers, workersAndEfficiency];
  return rng.pick(list)(ctx);
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
    mk(correct + 2, 'OFF_BY_ONE_STEP', `${correct} + 2`),
    mk(correct - 2, 'OFF_BY_ONE_STEP', `${correct} − 2`),
    mk(d1 + (w2 - w1), 'ADDED_INSTEAD_OF_SCALING', `${d1} + (${w2} − ${w1})`),
    mk(work, 'STOPPED_AT_INTERMEDIATE_TOTAL', `${w1} × ${d1}`)
  ]);
  return buildBase(ctx, {
    templateId: 'WORK_E_INVERSE',
    subskill: 'تناسب عكسي مباشر بين العمال والزمن',
    difficulty: 'easy',
    question: `يستطيع ${u(w1, 'worker')} إنجاز عمل في ${u(d1, 'day', 'oblique')}. إذا عمل ${u(w2, 'worker')} بالكفاءة نفسها، فكم يومًا يحتاجون؟`,
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
    mk(correct + 2, 'OFF_BY_ONE_STEP', `${correct} + 2`),
    mk(correct - 2, 'OFF_BY_ONE_STEP', `${correct} − 2`),
    mk(workers * newUnits, 'RATE_APPLIED_TO_WRONG_COUNT', `${workers} × ${newUnits}`),
    mk(workers + correct, 'USED_ORIGINAL_TOTAL', `${workers} + ${correct}`)
  ]);
  return buildBase(ctx, {
    templateId: 'WORK_E_VOLUME',
    subskill: 'زيادة حجم العمل مع ثبات الزمن',
    difficulty: 'easy',
    // RC2-016: إنجاز governs its noun, so the count must take the genitive
    // form — إنجاز مهمتين, never إنجاز مهمتان.
    question: `يستطيع ${u(workers, 'worker')} إنجاز ${u(oldUnits, 'task', 'oblique')} خلال ${u(days, 'day', 'oblique')}. كم عاملًا نحتاج لإنجاز ${u(newUnits, 'task', 'oblique')} خلال ${u(days, 'day', 'oblique')} بالكفاءة نفسها؟`,
    correct, distractors, format: unitFormat('worker'),
    steps: [
      `العمل يتضاعف بنسبة ${newUnits} إلى ${oldUnits}، والزمن ثابت.`,
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
    mk(totalDays - initialDays, 'IGNORED_UPGRADE', `${totalDays} − ${initialDays}`),
    mk(totalDays, 'USED_GIVEN_VALUE_AS_ANSWER', `المدة الأصلية ${totalDays}`),
    mk(remain / w1, 'IGNORED_UPGRADE', `${remain} ÷ ${w1}`),
    mk(totalWork / w2, 'USED_TOTAL_INSTEAD_OF_REMAINDER', `${totalWork} ÷ ${w2}`),
    mk(correct + 2, 'OFF_BY_ONE_STEP', `${correct} + 2`),
    mk(correct - 2, 'OFF_BY_ONE_STEP', `${correct} − 2`),
    mk(initialDays + correct, 'STOPPED_AT_INTERMEDIATE_TOTAL', `${initialDays} + ${correct}`),
    mk(remain, 'STOPPED_AT_INTERMEDIATE_TOTAL', `${totalWork} − ${done}`)
  ]);
  return buildBase(ctx, {
    templateId: 'WORK_M_CHANGE',
    subskill: 'تغير عدد العمال بعد إنجاز جزء من العمل',
    difficulty: 'medium',
    question: `يستطيع ${u(w1, 'worker')} إنجاز عمل كامل في ${u(totalDays, 'day', 'oblique')}. عملوا ${u(initialDays, 'day', 'oblique')}، ثم ${change > 0 ? `انضم إليهم ${u(change, 'worker')}` : `غادر ${u(Math.abs(change), 'worker')}`}. كم يومًا إضافيًا يحتاج العدد الجديد لإكمال العمل؟`,
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
      targetSkill: 'REMAINING_WORK', targetMisconception: 'IGNORED_UPGRADE',
      wrongMethodValue: totalDays - initialDays,
      degenerateWhen: [{when: change === 0, note: 'crew unchanged'}]
    },
    complexityFactors: {reasoningTransformations: 3, conceptCount: 2, stageCount: 2, arithmeticBurden: 3},
    textParams: {derivedFromParams: [Math.abs(change)], essentialParams: ['workers', 'totalDays', 'workedDays']}
  });
}

function efficiencyChange(ctx) {
  const {rng} = ctx;
  const days = rng.pick([10, 12, 15, 18, 20]);
  const pct = rng.pick([20, 25, 50]);
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
    mk(correct + 2, 'OFF_BY_ONE_STEP', `${correct} + 2`),
    mk(correct - 2, 'OFF_BY_ONE_STEP', `${correct} − 2`),
    mk(Fraction.from(days).div(factor).div(factor).toNumber(), 'APPLIED_STEP_TWICE', `${days} ÷ ${factor.toDecimalString()} ÷ ${factor.toDecimalString()}`),
    mk(days - correct, 'TOOK_COMPLEMENT_PERCENT', `${days} − ${correct}`),
    mk(correct + 1, 'OFF_BY_ONE_STEP', `${correct} + 1`),
    mk(correct - 1, 'OFF_BY_ONE_STEP', `${correct} − 1`),
    mk(days + pct / 10, 'TREATED_PERCENT_AS_AMOUNT', `${days} + ${pct} ÷ 10`)
  ]);
  return buildBase(ctx, {
    templateId: 'WORK_M_EFF',
    subskill: 'زيادة كفاءة العمال مع ثبات العدد',
    difficulty: 'medium',
    question: `فريق ينجز عملًا في ${u(days, 'day', 'oblique')}. بعد تدريب ارتفعت كفاءة الفريق بنسبة ${pct}% مع بقاء عدد العمال نفسه. كم يومًا يحتاج للعمل نفسه؟`,
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
    mk(total / finishDays, 'USED_TOTAL_INSTEAD_OF_REMAINDER', `${total} ÷ ${finishDays}`),
    mk(remain / (totalDays - initialDays), 'IGNORED_UPGRADE', `${remain} ÷ (${totalDays} − ${initialDays})`),
    mk(correct - w, 'SUBTRACTED_INSTEAD_OF_ADDED', `${correct} − ${w}`),
    mk(correct + w, 'ADDED_INSTEAD_OF_SUBTRACTED', `${correct} + ${w}`),
    mk(correct + 2, 'OFF_BY_ONE_STEP', `${correct} + 2`),
    mk(correct - 2, 'OFF_BY_ONE_STEP', `${correct} − 2`),
    mk(remain, 'STOPPED_AT_INTERMEDIATE_TOTAL', `${total} − ${done}`)
  ]);
  return buildBase(ctx, {
    templateId: 'WORK_M_TARGET',
    subskill: 'حساب العمل المتبقي ثم عدد العمال المطلوب',
    difficulty: 'medium',
    question: `يستطيع ${u(w, 'worker')} إنجاز عمل كامل في ${u(totalDays, 'day', 'oblique')}. عملوا ${u(initialDays, 'day', 'oblique')}، ثم تقرر إنهاء ما تبقى خلال ${u(finishDays, 'day', 'oblique')} فقط. كم عاملًا يجب أن يعمل خلال المدة الأخيرة؟`,
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
    mk(totalDays - firstDays - secondDays, 'IGNORED_UPGRADE', `${totalDays} − ${firstDays} − ${secondDays}`),
    mk((total - done) / w2, 'MISSED_ONE_STAGE', `(${total} − ${done}) ÷ ${w2}`),
    mk(remain / w1, 'IGNORED_UPGRADE', `${remain} ÷ ${w1}`),
    mk(secondDays + correct, 'STOPPED_AT_INTERMEDIATE_TOTAL', `${secondDays} + ${correct}`),
    mk(correct + 2, 'OFF_BY_ONE_STEP', `${correct} + 2`),
    mk(correct - 2, 'OFF_BY_ONE_STEP', `${correct} − 2`),
    mk(total / w2, 'USED_TOTAL_INSTEAD_OF_REMAINDER', `${total} ÷ ${w2}`),
    mk(remain, 'STOPPED_AT_INTERMEDIATE_TOTAL', `${total} − ${done} − ${done2}`)
  ]);
  return buildBase(ctx, {
    templateId: 'WORK_H_TWO_STAGE',
    subskill: 'تغير العمال عبر مرحلتين قبل حساب المتبقي',
    difficulty: 'hard',
    question: `يستطيع ${u(w1, 'worker')} إنجاز عمل في ${u(totalDays, 'day', 'oblique')}. عمل الجميع ${u(firstDays, 'day', 'oblique')}، ثم غادر ${u(left, 'worker')} وعمل الباقون ${u(secondDays, 'day', 'oblique')} إضافية. كم يومًا آخر يحتاج العمال الباقون لإكمال العمل؟`,
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
    mk(remain / newW, 'IGNORED_UPGRADE', `${remain} ÷ ${newW}`),
    mk(totalDays - initial, 'IGNORED_UPGRADE', `${totalDays} − ${initial}`),
    mk(Fraction.from(remain).div(Fraction.from(w).mul(factor)).toNumber(), 'FAILED_TO_UPDATE_COUNT', `${remain} ÷ (${w} × ${factor.toDecimalString()})`),
    mk(Fraction.from(total).div(effective).toNumber(), 'USED_TOTAL_INSTEAD_OF_REMAINDER', `${total} ÷ ${effective.toDecimalString()}`),
    mk(correct + 2, 'OFF_BY_ONE_STEP', `${correct} + 2`),
    mk(correct - 2, 'OFF_BY_ONE_STEP', `${correct} − 2`),
    mk(Fraction.from(totalDays).div(factor).toNumber(), 'MISSED_ONE_STAGE', `${totalDays} ÷ ${factor.toDecimalString()}`),
    mk(initial + correct, 'STOPPED_AT_INTERMEDIATE_TOTAL', `${initial} + ${correct}`),
    mk(Fraction.from(remain).div(newW).div(factor).div(factor).toNumber(), 'APPLIED_STEP_TWICE', `${remain} ÷ ${newW} ÷ ${factor.toDecimalString()} ÷ ${factor.toDecimalString()}`),
    mk(correct + 1, 'OFF_BY_ONE_STEP', `${correct} + 1`),
    mk(correct - 1, 'OFF_BY_ONE_STEP', `${correct} − 1`),
    mk(Fraction.from(remain).mul(factor).div(newW).toNumber(), 'REVERSED_INVERSE_PROPORTION', `${remain} × ${factor.toDecimalString()} ÷ ${newW}`)
  ]);
  return buildBase(ctx, {
    templateId: 'WORK_H_WORKERS_EFF',
    subskill: 'تغير عدد العمال والكفاءة بعد بدء العمل',
    difficulty: 'hard',
    question: `يستطيع ${u(w, 'worker')} إنجاز عمل في ${u(totalDays, 'day', 'oblique')}. بعد ${u(initial, 'day', 'oblique')} غادر ${u(left, 'worker')}، ثم ارتفعت كفاءة كل عامل باقٍ بنسبة ${pct}%. كم يومًا إضافيًا يحتاجون لإكمال العمل؟`,
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
      targetSkill: 'CREW_AND_EFFICIENCY', targetMisconception: 'IGNORED_UPGRADE',
      wrongMethodValue: remain / newW,
      degenerateWhen: [{when: pct === 0 || left === 0, note: 'only one of the two factors changed'}]
    },
    complexityFactors: {reasoningTransformations: 4, conceptCount: 3, stageCount: 3, arithmeticBurden: 4, dependencyDepth: 2},
    textParams: {essentialParams: ['workers', 'totalDays', 'workedDays', 'workersLeft', 'efficiencyPercent']}
  });
}
