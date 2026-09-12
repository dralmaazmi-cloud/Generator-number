import {Fraction} from '../qa/fraction.js';
import {mk, usable, u, num, unitFormat, buildBase, eq, X, add, mul, factorLine, resample, risePercentPhrase, pickTemplate} from './_shared.js';

export function generateUnitRate({difficulty, rng, seed, engineVersion, telemetry}) {
  const ctx = {difficulty, rng, seed, engineVersion, telemetry, family: 'unit_rate', family_ar: 'المعدل الوحدوي', category: 'المعدل الوحدوي'};
  const list = difficulty === 'easy' ? [directRate, rateToTime, rateThenNewQuantity]
    : difficulty === 'medium' ? [rateThenPercent, rateChangeTarget]
    : [twoPhaseRate];
  return pickTemplate(rng, list, 'unit_rate', difficulty)(ctx);
}

function directRate(ctx) {
  const {rng} = ctx;
  const minutes = rng.pick([5, 6, 8, 10, 12]);
  const rate = rng.pick([20, 25, 30, 40, 50].filter(v => v !== minutes));
  const total = minutes * rate;
  const target = rng.pick([3, 4, 5, 7, 9].filter(v => v !== minutes));
  const correct = target * rate;
  const params = {baseAmount: total, baseMinutes: minutes, targetMinutes: target};
  const distractors = usable(ctx, [
    mk(total, 'USED_GIVEN_VALUE_AS_ANSWER', `الكمية المعطاة ${total}`),
    mk(rate, 'STOPPED_AT_UNIT_RATE', `${total} ÷ ${minutes}`),
    mk(target * minutes, 'MULTIPLIED_COUNTS_INSTEAD_OF_RATE', `${target} × ${minutes}`),
    mk(total * minutes / target, 'REVERSED_DIRECT_PROPORTION', `${total} × ${minutes} ÷ ${target}`),
    mk(rate * (target - 1), 'OFF_BY_ONE_STEP', `${rate} × (${target} − 1)`),
    mk(rate * (target + 1), 'OFF_BY_ONE_STEP', `${rate} × (${target} + 1)`),
    mk(total + rate * target, 'USED_ORIGINAL_TOTAL', `${total} + ${rate} × ${target}`),
    mk(rate * (minutes + target), 'RATE_APPLIED_TO_WRONG_COUNT', `${rate} × (${minutes} + ${target})`)
  ]);
  return buildBase(ctx, {
    templateId: 'RATE_E_DIRECT',
    subskill: 'معدل وحدوي ثم كمية جديدة',
    difficulty: 'easy',
    question: `تنجز آلة ${u(total, 'unit')} خلال ${u(minutes, 'minute', 'oblique')} بمعدل ثابت. كم وحدة تنجز خلال ${u(target, 'minute', 'oblique')}؟`,
    correct, distractors, format: unitFormat('unit'),
    steps: [
      `الإنتاج في الدقيقة الواحدة = ${total} ÷ ${minutes} = ${rate}.`,
      `الإنتاج خلال ${u(target, 'minute', 'oblique')} = ${rate} × ${target} = ${correct}.`
    ],
    howToStart: 'احسب معدل الدقيقة الواحدة أولًا.',
    remember: 'معدل الوحدة يحول السؤال إلى ضرب مباشر.',
    fastMethod: 'المعدل × الزمن المطلوب.',
    estimatedSteps: 2, conceptTags: ['unit-rate'], parameters: params,
    oracle: {kind: 'constraint', answerKind: 'number', constraints: [eq(mul(X, minutes), mul(total, target))]},
    askedUnknown: 'scaledOutput', stageCount: 2,
    pedagogy: {
      targetSkill: 'UNIT_RATE_THEN_SCALE', targetMisconception: 'MULTIPLIED_COUNTS_INSTEAD_OF_RATE',
      wrongMethodValue: target * minutes,
      degenerateWhen: [{when: target === minutes, note: 'target window equals the given window'}]
    },
    complexityFactors: {reasoningTransformations: 2, conceptCount: 1, stageCount: 2, arithmeticBurden: 2},
    textParams: {essentialParams: ['baseAmount', 'baseMinutes', 'targetMinutes']}
  });
}

function rateToTime(ctx) {
  const {rng} = ctx;
  // RC2-011. The minutes asked for came from four values.
  const minutes = rng.pick([15, 20, 24, 25, 30, 36, 40, 45]);
  const rate = rng.pick([12, 15, 20, 24, 25, 30, 40, 45].filter(v => v !== minutes));
  const total = minutes * rate;
  const correct = rng.pick([35, 40, 45, 50, 55, 60, 70, 75, 80, 90, 100, 120].filter(v => v !== minutes));
  const targetWords = correct * rate;
  const params = {baseAmount: total, baseMinutes: minutes, targetAmount: targetWords};
  const distractors = usable(ctx, [
    mk(minutes, 'USED_GIVEN_VALUE_AS_ANSWER', `الزمن المعطى ${minutes}`),
    mk(rate, 'STOPPED_AT_UNIT_RATE', `${total} ÷ ${minutes}`),
    mk(total * minutes / targetWords, 'REVERSED_DIRECT_PROPORTION', `${total} × ${minutes} ÷ ${targetWords}`),
    mk(minutes + correct, 'USED_ORIGINAL_TOTAL', `${minutes} + ${correct}`),
    mk(targetWords / minutes, 'SWAPPED_RATE_AND_COUNT', `${targetWords} ÷ ${minutes}`),
    mk((targetWords - total) / rate, 'USED_TOTAL_INSTEAD_OF_REMAINDER', `(${targetWords} − ${total}) ÷ ${rate}`),
    // RC2-012: deepened so six options can be filled without padding.
    mk(targetWords * minutes / total / 2, 'HALF_DISTANCE_AS_ANSWER', `${targetWords} × ${minutes} ÷ ${total} ÷ 2`),
    mk(targetWords / (rate * minutes), 'RATE_APPLIED_TO_WRONG_COUNT', `${targetWords} ÷ (${rate} × ${minutes})`),
    mk(targetWords * minutes / total * 2, 'APPLIED_STEP_TWICE', `${targetWords} × ${minutes} ÷ ${total} × 2`)
  ]);
  return buildBase(ctx, {
    templateId: 'RATE_E_TIME',
    subskill: 'معدل وحدوي ثم إيجاد الزمن',
    difficulty: 'easy',
    question: `يكتب شخص ${u(total, 'word')} خلال ${u(minutes, 'minute', 'oblique')} بمعدل ثابت. كم دقيقة يحتاج لكتابة ${u(targetWords, 'word')}؟`,
    correct, distractors, format: unitFormat('minute'),
    steps: [
      `عدد الكلمات في الدقيقة الواحدة = ${total} ÷ ${minutes} = ${rate}.`,
      `الزمن المطلوب بالدقائق = ${targetWords} ÷ ${rate} = ${correct}.`
    ],
    howToStart: 'احسب معدل الوحدة ثم اقسم الكمية الجديدة عليه.',
    remember: 'عند ثبات المعدل: الزمن = الكمية ÷ المعدل.',
    fastMethod: 'الهدف ÷ المعدل.',
    estimatedSteps: 2, conceptTags: ['unit-rate', 'reverse'], parameters: params,
    oracle: {kind: 'constraint', answerKind: 'number', constraints: [eq(mul(X, total), mul(minutes, targetWords))]},
    askedUnknown: 'requiredTime', stageCount: 2,
    pedagogy: {
      targetSkill: 'UNIT_RATE_THEN_TIME', targetMisconception: 'SWAPPED_RATE_AND_COUNT',
      wrongMethodValue: targetWords / minutes,
      degenerateWhen: [{when: targetWords === total, note: 'target equals the given amount'}]
    },
    complexityFactors: {reasoningTransformations: 2, conceptCount: 1, reverseReasoning: 1, stageCount: 2, arithmeticBurden: 2},
    textParams: {essentialParams: ['baseAmount', 'baseMinutes', 'targetAmount']}
  });
}

function rateThenPercent(ctx) {
  const {rng} = ctx;
  const minutes = rng.pick([6, 8, 9, 10]);
  const rate = rng.pick([40, 50, 60, 70]);
  const total = minutes * rate;
  const pct = rng.pick([20, 25, 50]);
  const {factor, text: factorText} = factorLine(pct, 'up', 'معامل الزيادة');
  const newRate = Fraction.from(rate).mul(factor);
  // An equal window would make "apply the percent to the old total" correct,
  // which is exactly the mistake this template exists to catch (Section 10).
  const targetMin = rng.pick([4, 5, 6].filter(v => v !== minutes));
  const answer = newRate.mul(targetMin);
  if (!answer.isInteger || !newRate.isExactDecimal || newRate.decimalPlaces > 2) return resample(ctx, rateThenPercent);
  const correct = answer.toNumber();
  const params = {baseAmount: total, baseMinutes: minutes, increasePct: pct, targetMinutes: targetMin};
  const distractors = usable(ctx, [
    mk(rate * targetMin, 'USED_RATE_BEFORE_CHANGE', `${rate} × ${targetMin}`),
    mk(Fraction.from(total).mul(factor).toNumber(), 'APPLIED_PERCENT_TO_WRONG_TOTAL', `${total} × ${factor.toDecimalString()}`),
    mk(newRate.toNumber(), 'STOPPED_AT_UNIT_RATE', `${rate} × ${factor.toDecimalString()}`),
    mk(rate, 'STOPPED_AT_UNIT_RATE', `${total} ÷ ${minutes}`),
    mk(rate * targetMin + pct, 'TREATED_PERCENT_AS_AMOUNT', `${rate} × ${targetMin} + ${pct}`),
    mk(newRate.mul(factor).mul(targetMin).toNumber(), 'APPLIED_STEP_TWICE', `${newRate.toDecimalString()} × ${factor.toDecimalString()} × ${targetMin}`),
    mk(newRate.mul(minutes).toNumber(), 'RATE_APPLIED_TO_WRONG_COUNT', `${newRate.toDecimalString()} × ${minutes}`),
    mk(total + correct, 'USED_ORIGINAL_TOTAL', `${total} + ${correct}`)
  ]);
  return buildBase(ctx, {
    templateId: 'RATE_M_PERCENT',
    subskill: 'معدل وحدوي ثم زيادة مئوية',
    difficulty: 'medium',
    question: `تنجز آلة ${u(total, 'unit')} خلال ${u(minutes, 'minute', 'oblique')}. بعد صيانة ارتفع معدلها في الدقيقة ${risePercentPhrase(pct)}. كم وحدة تنجز خلال ${u(targetMin, 'minute', 'oblique')} بالمعدل الجديد؟`,
    correct, distractors, format: unitFormat('unit'),
    steps: [
      `المعدل الأصلي في الدقيقة = ${total} ÷ ${minutes} = ${rate}.`,
      factorText,
      `المعدل الجديد في الدقيقة = ${rate} × ${factor.toDecimalString()} = ${newRate.toDecimalString()}.`,
      `الإنتاج خلال ${u(targetMin, 'minute', 'oblique')} = ${newRate.toDecimalString()} × ${targetMin} = ${correct}.`
    ],
    howToStart: 'عدّل معدل الوحدة أولًا ثم طبقه على الزمن الجديد.',
    remember: 'لا تطبق نسبة التحسن على إجمالي قديم بزمن مختلف.',
    fastMethod: 'معدل الوحدة ← الزيادة ← الزمن.',
    estimatedSteps: 3, conceptTags: ['unit-rate', 'percentage'], parameters: params,
    oracle: {kind: 'constraint', answerKind: 'number', constraints: [eq(mul(X, minutes, 100), mul(total, targetMin, add(100, pct)))]},
    askedUnknown: 'scaledOutputAfterIncrease', stageCount: 3,
    pedagogy: {
      targetSkill: 'ADJUST_RATE_THEN_SCALE', targetMisconception: 'APPLIED_PERCENT_TO_WRONG_TOTAL',
      wrongMethodValue: Fraction.from(total).mul(factor).toNumber(),
      degenerateWhen: [{when: targetMin === minutes, note: 'same window: percent on the total would also be right'}]
    },
    complexityFactors: {reasoningTransformations: 3, conceptCount: 2, stageCount: 3, arithmeticBurden: 3},
    textParams: {essentialParams: ['baseAmount', 'baseMinutes', 'increasePct', 'targetMinutes']}
  });
}

function rateThenNewQuantity(ctx) {
  const {rng} = ctx;
  const qty = rng.pick([12, 15, 18, 20]);
  const amount = rng.pick([180, 240, 300, 360]);
  const rate = Fraction.from(amount).div(qty);
  if (!rate.isInteger) return resample(ctx, rateThenNewQuantity);
  const targetQty = rng.pick([25, 30, 36, 40].filter(v => v !== qty));
  const rateNum = rate.toNumber();
  if (rateNum === qty) return resample(ctx, rateThenNewQuantity);
  const correct = rateNum * targetQty;
  const params = {baseAmount: amount, baseCount: qty, targetCount: targetQty};
  const distractors = usable(ctx, [
    mk(amount, 'USED_GIVEN_VALUE_AS_ANSWER', `المسافة المعطاة ${amount}`),
    mk(rateNum, 'STOPPED_AT_UNIT_RATE', `${amount} ÷ ${qty}`),
    mk(targetQty * qty, 'MULTIPLIED_COUNTS_INSTEAD_OF_RATE', `${targetQty} × ${qty}`),
    mk(amount * qty / targetQty, 'REVERSED_DIRECT_PROPORTION', `${amount} × ${qty} ÷ ${targetQty}`),
    mk(amount + rateNum * targetQty, 'USED_ORIGINAL_TOTAL', `${amount} + ${rateNum} × ${targetQty}`),
    mk(rateNum * (qty + targetQty), 'RATE_APPLIED_TO_WRONG_COUNT', `${rateNum} × (${qty} + ${targetQty})`),
    mk(rateNum * (targetQty - 1), 'OFF_BY_ONE_STEP', `${rateNum} × (${targetQty} − 1)`),
    mk(rateNum * (targetQty + 1), 'OFF_BY_ONE_STEP', `${rateNum} × (${targetQty} + 1)`),
    mk(rateNum * targetQty * 2, 'APPLIED_STEP_TWICE', `${rateNum} × ${targetQty} × 2`),
    mk(amount + rateNum * (qty + targetQty), 'USED_ORIGINAL_TOTAL', `${amount} + ${rateNum} × (${qty} + ${targetQty})`)
  ]);
  return buildBase(ctx, {
    templateId: 'RATE_M_SCALE',
    subskill: 'استخراج معدل وحدة ثم التوسع',
    difficulty: 'easy',
    question: `قطعت سيارة ${u(amount, 'km')} باستخدام ${u(qty, 'liter', 'oblique')} من الوقود. إذا استمر المعدل نفسه، فكم كيلومترًا تقطع باستخدام ${u(targetQty, 'liter', 'oblique')}؟`,
    correct, distractors, format: unitFormat('km'),
    steps: [
      `المسافة لكل لتر = ${amount} ÷ ${qty} = ${rateNum}.`,
      `المسافة بالكيلومترات = ${rateNum} × ${targetQty} = ${correct}.`
    ],
    howToStart: 'احسب القيمة لكل وحدة ثم توسع.',
    remember: 'معدل الوحدة ثابت ما لم يذكر السؤال تغيره.',
    fastMethod: 'كم لكل لتر × عدد اللترات الجديد.',
    estimatedSteps: 2, conceptTags: ['unit-rate'], parameters: params,
    oracle: {kind: 'constraint', answerKind: 'number', constraints: [eq(mul(X, qty), mul(amount, targetQty))]},
    askedUnknown: 'scaledOutput', stageCount: 2,
    pedagogy: {
      targetSkill: 'UNIT_RATE_THEN_SCALE', targetMisconception: 'MULTIPLIED_COUNTS_INSTEAD_OF_RATE',
      wrongMethodValue: targetQty * qty,
      degenerateWhen: [{when: targetQty === qty, note: 'no scaling'}]
    },
    complexityFactors: {reasoningTransformations: 2, conceptCount: 1, stageCount: 2, arithmeticBurden: 2},
    textParams: {essentialParams: ['baseAmount', 'baseCount', 'targetCount']}
  });
}

function rateChangeTarget(ctx) {
  const {rng} = ctx;
  const oldRate = rng.pick([30, 40, 50, 60]);
  const pct = rng.pick([20, 25, 50]);
  const {factor, text: factorText} = factorLine(pct, 'up', 'معامل التطوير');
  const newRate = Fraction.from(oldRate).mul(factor);
  if (!newRate.isInteger) return resample(ctx, rateChangeTarget);
  const oldMinutes = rng.pick([6, 8, 10]);
  const initial = oldRate * oldMinutes;
  const target = rng.pick([600, 720, 800, 900, 1000]);
  const answer = Fraction.from(target).div(newRate);
  if (!answer.isInteger) return resample(ctx, rateChangeTarget);
  const correct = answer.toNumber();
  const params = {baseAmount: initial, baseMinutes: oldMinutes, increasePct: pct, targetAmount: target};
  const newRateNum = newRate.toNumber();
  const distractors = usable(ctx, [
    mk(target / oldRate, 'USED_RATE_BEFORE_CHANGE', `${target} ÷ ${oldRate}`),
    mk(oldMinutes, 'USED_GIVEN_VALUE_AS_ANSWER', `الزمن المعطى ${oldMinutes}`),
    mk(newRateNum, 'STOPPED_AT_UNIT_RATE', `${oldRate} × ${factor.toDecimalString()}`),
    mk(target / initial * oldMinutes, 'RATE_APPLIED_TO_WRONG_COUNT', `${target} ÷ ${initial} × ${oldMinutes}`),
    mk(Fraction.from(target).mul(factor).div(oldRate).toNumber(), 'APPLIED_OPERATION_IN_REVERSE', `${target} × ${factor.toDecimalString()} ÷ ${oldRate}`),
    mk(Fraction.from(target).div(newRate).div(2).toNumber(), 'APPLIED_STEP_TWICE', `${target} ÷ ${newRateNum} ÷ 2`),
    mk(Fraction.from(target).div(newRate.mul(factor)).toNumber(), 'APPLIED_STEP_TWICE', `${target} ÷ (${newRateNum} × ${factor.toDecimalString()})`),
    mk(Fraction.from(target).div(newRate).mul(2).toNumber(), 'APPLIED_STEP_TWICE', `${target} ÷ ${newRateNum} × 2`),
    mk(target / initial * oldMinutes * 2, 'RATE_APPLIED_TO_WRONG_COUNT', `${target} ÷ ${initial} × ${oldMinutes} × 2`),
    mk(Fraction.from(target).div(oldRate).div(2).toNumber(), 'USED_RATE_BEFORE_CHANGE', `${target} ÷ ${oldRate} ÷ 2`)
  ]);
  return buildBase(ctx, {
    templateId: 'RATE_H_TARGET',
    subskill: 'معدل محسن ثم زمن لهدف جديد',
    difficulty: 'medium',
    question: `تنجز آلة ${u(initial, 'unit')} خلال ${u(oldMinutes, 'minute', 'oblique')}. ارتفع معدلها في الدقيقة بعد تطوير ${risePercentPhrase(pct)}. كم دقيقة تحتاج بالمعدل الجديد لإنجاز ${u(target, 'unit')}؟`,
    correct, distractors, format: unitFormat('minute'),
    steps: [
      `المعدل الأصلي في الدقيقة = ${initial} ÷ ${oldMinutes} = ${oldRate}.`,
      factorText,
      `المعدل الجديد في الدقيقة = ${oldRate} × ${factor.toDecimalString()} = ${newRateNum}.`,
      `الزمن المطلوب بالدقائق = ${target} ÷ ${newRateNum} = ${correct}.`
    ],
    howToStart: 'استخرج المعدل، عدّله، ثم استخدم الهدف الجديد.',
    remember: 'إذا زاد المعدل، الزمن المطلوب لهدف ثابت ينخفض.',
    fastMethod: 'الهدف ÷ المعدل الجديد.',
    estimatedSteps: 4, conceptTags: ['unit-rate', 'percentage', 'reverse'], parameters: params,
    oracle: {kind: 'constraint', answerKind: 'number', constraints: [eq(mul(X, initial, add(100, pct)), mul(target, oldMinutes, 100))]},
    askedUnknown: 'requiredTimeAfterIncrease', stageCount: 3,
    pedagogy: {
      targetSkill: 'ADJUST_RATE_THEN_TIME', targetMisconception: 'USED_RATE_BEFORE_CHANGE',
      wrongMethodValue: target / oldRate,
      degenerateWhen: [{when: pct === 0, note: 'no rate change to reason about'}]
    },
    complexityFactors: {reasoningTransformations: 3, conceptCount: 2, reverseReasoning: 1, stageCount: 3, arithmeticBurden: 3},
    textParams: {essentialParams: ['baseAmount', 'baseMinutes', 'increasePct', 'targetAmount']}
  });
}

function twoPhaseRate(ctx) {
  const {rng} = ctx;
  const r1 = rng.pick([20, 25, 30, 40]);
  const h1 = rng.pick([3, 4, 5]);
  const pct = rng.pick([20, 25, 50]);
  const {factor, text: factorText} = factorLine(pct, 'up', 'معامل الزيادة');
  const r2 = Fraction.from(r1).mul(factor);
  if (!r2.isInteger) return resample(ctx, twoPhaseRate);
  const h2 = rng.pick([3, 4, 5].filter(v => v !== h1));
  const r2n = r2.toNumber();
  const correct = r1 * h1 + r2n * h2;
  const params = {firstRate: r1, firstHours: h1, increasePct: pct, secondHours: h2};
  const distractors = usable(ctx, [
    mk(r1 * (h1 + h2), 'USED_ONLY_FIRST_RATE', `${r1} × (${h1} + ${h2})`),
    mk(r2n * (h1 + h2), 'USED_ONLY_SECOND_RATE', `${r2n} × (${h1} + ${h2})`),
    mk(r2n * h2, 'USED_ONLY_LAST_STAGE', `${r2n} × ${h2}`),
    mk(r1 * h1, 'STOPPED_AFTER_FIRST_STAGE', `${r1} × ${h1}`),
    mk(r1 * h1 + r1 * h2 + pct, 'TREATED_PERCENT_AS_AMOUNT', `${r1} × ${h1} + ${r1} × ${h2} + ${pct}`),
    mk(r1 * h2 + r2n * h1, 'RATE_APPLIED_TO_WRONG_COUNT', `${r1} × ${h2} + ${r2n} × ${h1}`),
    mk(r2.mul(factor).mul(h2).add(r1 * h1).toNumber(), 'APPLIED_STEP_TWICE', `${r1} × ${h1} + ${r2n} × ${factor.toDecimalString()} × ${h2}`),
    mk((r1 + r2n) * (h1 + h2), 'STOPPED_AT_UNIT_RATE', `(${r1} + ${r2n}) × (${h1} + ${h2})`),
    mk(r1 * h1 + r1 * h2, 'USED_RATE_BEFORE_CHANGE', `${r1} × ${h1} + ${r1} × ${h2}`),
    mk(r2n * h1 + r2n * h2, 'USED_ONLY_SECOND_RATE', `${r2n} × ${h1} + ${r2n} × ${h2}`)
  ]);
  return buildBase(ctx, {
    templateId: 'RATE_H_TWO_PHASE',
    subskill: 'معدل يتغير بين مرحلتين',
    difficulty: 'hard',
    question: `يعمل جهاز بمعدل ${r1} وحدة/ساعة لمدة ${u(h1, 'hour', 'oblique')}، ثم ارتفع معدله ${risePercentPhrase(pct)} وعمل ${u(h2, 'hour', 'oblique')} أخرى. كم وحدة أنجز إجمالًا؟`,
    correct, distractors, format: unitFormat('unit'),
    steps: [
      `إنتاج المرحلة الأولى = ${r1} × ${h1} = ${r1 * h1}.`,
      factorText,
      `المعدل الجديد = ${r1} × ${factor.toDecimalString()} = ${r2n}.`,
      `إنتاج المرحلة الثانية = ${r2n} × ${h2} = ${r2n * h2}.`,
      `الإجمالي = ${r1 * h1} + ${r2n * h2} = ${correct}.`
    ],
    howToStart: 'قسّم العمل إلى مرحلتين قبل وبعد تغير المعدل.',
    remember: 'لا تطبق المعدل الجديد على الزمن السابق.',
    fastMethod: 'إنتاج المرحلة الأولى + إنتاج المرحلة الثانية.',
    estimatedSteps: 4, conceptTags: ['unit-rate', 'stages'], parameters: params,
    oracle: {
      kind: 'constraint', answerKind: 'number',
      constraints: [eq(mul(X, 100), add(mul(r1, h1, 100), mul(r1, h2, add(100, pct))))]
    },
    askedUnknown: 'totalAcrossStages', stageCount: 2,
    pedagogy: {
      targetSkill: 'STAGED_RATES', targetMisconception: 'USED_ONLY_FIRST_RATE',
      wrongMethodValue: r1 * (h1 + h2),
      degenerateWhen: [{when: h1 === h2 && pct === 0, note: 'no rate change across stages'}]
    },
    complexityFactors: {reasoningTransformations: 3, conceptCount: 2, stageCount: 2, arithmeticBurden: 4},
    textParams: {essentialParams: ['firstRate', 'firstHours', 'increasePct', 'secondHours']}
  });
}
