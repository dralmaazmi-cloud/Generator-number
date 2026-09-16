import {Fraction} from '../qa/fraction.js';
import {mk, usable, u, num, unitFormat, buildBase, eq, X, add, sub, mul, factorLine, resample, riseByPercentPhrase, bandPool, composeSentences, sceneFor, unitWordKam, askOf, rateOf, distinctValues} from './_shared.js';

export function generateUnitRate({difficulty, rng, seed, engineVersion, telemetry, pinTemplate = null, pinTargets = null}) {
  const ctx = {difficulty, rng, seed, engineVersion, telemetry, pinTargets, family: 'unit_rate', family_ar: 'المعدل الوحدوي', category: 'المعدل الوحدوي'};
  // RC2.3-1. The catalogue, not a set of per-band pools: which of these is
  // eligible for the requested band is decided by the structural adjudication in
  // src/qa/structure.js, so a template cannot sit in a band nobody adjudicated.
  return bandPool(rng, 'unit_rate', difficulty, [
    ['RATE_E_DIRECT', directRate],
    ['RATE_E_TIME', rateToTime],
    ['RATE_M_SCALE', rateThenNewQuantity],
    ['RATE_M_PERCENT', rateThenPercent],
    ['RATE_H_TARGET', rateChangeTarget],
    ['RATE_H_TWO_PHASE', twoPhaseRate],
    ['RATE_H_RATE_FROM_GAP', rateFromTimeSaved],
    // RC2.9.4-B3. Two MEDIUM constructions.
    ['RATE_M_COMPARE', rateGap],
    ['RATE_M_HOURS_FROM_MINUTE_RATE', hoursFromMinuteRate],
    // RC2.9.5 §4. The unit value itself, a budget turned into a count, and two
    // packs compared by their unit price.
    ['RATE_E_UNIT_PRICE', unitPriceFromTotal],
    ['RATE_E_BUDGET_COUNT', countWithinBudget],
    ['RATE_E_BETTER_DEAL', cheaperPerUnit]
  ], pinTemplate)(ctx);
}

function directRate(ctx) {
  const sc = sceneFor(ctx, 'production');
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
  const stem = composeSentences(ctx, `تنجز آلة ${u(total, sc.out)} خلال ${u(minutes, 'minute', 'oblique')} بمعدل ثابت. كم ${unitWordKam(sc.out)} تنجز خلال ${u(target, 'minute', 'oblique')}؟`);
  return buildBase(ctx, {
    templateId: 'RATE_E_DIRECT',
    scenario: sc.key,
    subskill: 'معدل وحدوي ثم كمية جديدة',
    difficulty: 'easy',
    question: stem.text,
    stemStructure: stem.structure, informationOrder: stem.order,
    correct, distractors, format: unitFormat(sc.out),
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
  const sc = sceneFor(ctx, 'production');
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
  const stem = composeSentences(ctx, `يكتب شخص ${u(total, 'word')} خلال ${u(minutes, 'minute', 'oblique')} بمعدل ثابت. كم دقيقة يحتاج لكتابة ${u(targetWords, 'word')}؟`);
  return buildBase(ctx, {
    templateId: 'RATE_E_TIME',
    scenario: sc.key,
    subskill: 'معدل وحدوي ثم إيجاد الزمن',
    difficulty: 'easy',
    question: stem.text,
    stemStructure: stem.structure, informationOrder: stem.order,
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
  const sc = sceneFor(ctx, 'production');
  const {rng} = ctx;
  const minutes = rng.pick([6, 8, 9, 10]);
  const rate = rng.pick([40, 50, 60, 70]);
  const total = minutes * rate;
  const pct = rng.pick([20, 25, 50]);
  const {factor, per100, text: factorText} = factorLine(pct, 'up', 'معامل الزيادة');
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
  const stem = composeSentences(ctx, `تنجز آلة ${u(total, sc.out)} خلال ${u(minutes, 'minute', 'oblique')}. بعد صيانة ارتفع معدلها في الدقيقة ${riseByPercentPhrase(pct)}. كم ${unitWordKam(sc.out)} تنجز خلال ${u(targetMin, 'minute', 'oblique')} بالمعدل الجديد؟`);
  return buildBase(ctx, {
    templateId: 'RATE_M_PERCENT',
    scenario: sc.key,
    subskill: 'معدل وحدوي ثم زيادة مئوية',
    difficulty: 'medium',
    question: stem.text,
    stemStructure: stem.structure, informationOrder: stem.order,
    correct, distractors, format: unitFormat(sc.out),
    steps: [
      `المعدل الأصلي في الدقيقة = ${total} ÷ ${minutes} = ${rate}.`,
      factorText,
      `المعدل الجديد في الدقيقة = ${rate} × ${per100} ÷ 100 = ${newRate.toDecimalString()}.`,
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
  const sc = sceneFor(ctx, 'production');
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
  const stem = composeSentences(ctx, `قطعت سيارة ${u(amount, 'km')} باستخدام ${u(qty, 'liter', 'oblique')} من الوقود. إذا استمر المعدل نفسه، فكم كيلومترًا تقطع باستخدام ${u(targetQty, 'liter', 'oblique')}؟`);
  return buildBase(ctx, {
    templateId: 'RATE_M_SCALE',
    scenario: sc.key,
    subskill: 'استخراج معدل وحدة ثم التوسع',
    difficulty: 'easy',
    question: stem.text,
    stemStructure: stem.structure, informationOrder: stem.order,
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
  const sc = sceneFor(ctx, 'production');
  const {rng} = ctx;
  const oldRate = rng.pick([30, 40, 50, 60]);
  const pct = rng.pick([20, 25, 50]);
  const {factor, per100, text: factorText} = factorLine(pct, 'up', 'معامل التطوير');
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
  const stem = composeSentences(ctx, `تنجز آلة ${u(initial, sc.out)} خلال ${u(oldMinutes, 'minute', 'oblique')}. ارتفع معدلها في الدقيقة بعد تطوير ${riseByPercentPhrase(pct)}. كم دقيقة تحتاج بالمعدل الجديد لإنجاز ${u(target, sc.out)}؟`);
  return buildBase(ctx, {
    templateId: 'RATE_H_TARGET',
    scenario: sc.key,
    subskill: 'معدل محسن ثم زمن لهدف جديد',
    difficulty: 'medium',
    question: stem.text,
    stemStructure: stem.structure, informationOrder: stem.order,
    correct, distractors, format: unitFormat('minute'),
    steps: [
      `المعدل الأصلي في الدقيقة = ${initial} ÷ ${oldMinutes} = ${oldRate}.`,
      factorText,
      `المعدل الجديد في الدقيقة = ${oldRate} × ${per100} ÷ 100 = ${newRateNum}.`,
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
  const sc = sceneFor(ctx, 'production');
  const {rng} = ctx;
  const r1 = rng.pick([20, 25, 30, 40]);
  const h1 = rng.pick([3, 4, 5]);
  const pct = rng.pick([20, 25, 50]);
  const {factor, per100, text: factorText} = factorLine(pct, 'up', 'معامل الزيادة');
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
  const stem = composeSentences(ctx, `يعمل جهاز بمعدل ${rateOf(r1, sc)} لمدة ${u(h1, 'hour', 'oblique')}، ثم ارتفع معدله ${riseByPercentPhrase(pct)} وعمل ${u(h2, 'hour', 'oblique')} أخرى. كم ${unitWordKam(sc.out)} أنجز إجمالًا؟`);
  return buildBase(ctx, {
    templateId: 'RATE_H_TWO_PHASE',
    scenario: sc.key,
    subskill: 'معدل يتغير بين مرحلتين',
    difficulty: 'hard',
    question: stem.text,
    stemStructure: stem.structure, informationOrder: stem.order,
    correct, distractors, format: unitFormat(sc.out),
    steps: [
      `إنتاج المرحلة الأولى = ${r1} × ${h1} = ${r1 * h1}.`,
      factorText,
      `المعدل الجديد = ${r1} × ${per100} ÷ 100 = ${r2n}.`,
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

// ---------------------------------------------------------------------------
// RC2.4 — a genuinely hard structure for this family.
//
// The other unit_rate templates state a rate or hand one over after a division.
// Here the rate is the unknown and it appears in two different times whose
// DIFFERENCE is what is given, so it cannot be isolated by any single division.
// ---------------------------------------------------------------------------

/**
 * SIMULTANEOUS_CONSTRAINTS + STRATEGY_SELECTION.
 *
 * The relation is r(r + g) = T·g / k. Nothing divides out; the solver has to
 * recognise a product of two numbers a known distance apart and search the
 * factor pairs. That search is the item.
 */
function rateFromTimeSaved(ctx) {
  const sc = sceneFor(ctx, 'production');
  const {rng} = ctx;
  let found = null;
  for (let t = 0; t < 200; t++) {
    const rate = rng.pick([10, 12, 15, 20, 24, 25, 30, 40]);
    const bump = rng.pick([2, 4, 5, 6, 10, 15, 20]);
    const saved = rng.pick([1, 2, 3, 4]);
    const product = rate * (rate + bump);
    const totalNum = product * saved;
    if (totalNum % bump !== 0) continue;
    const total = totalNum / bump;
    if (total % rate !== 0 || total % (rate + bump) !== 0) continue;
    const oldTime = total / rate, newTime = total / (rate + bump);
    if (oldTime - newTime !== saved) continue;
    if (oldTime > 40 || total > 4000) continue;
    found = {rate, bump, saved, total, product, oldTime, newTime};
    break;
  }
  if (!found) return resample(ctx, rateFromTimeSaved);
  const {rate, bump, saved, total, product, oldTime, newTime} = found;
  // RC2.7-R3. The factor search yields BOTH members of the pair, and which one
  // is asked for decides a different final step — take the smaller, or take the
  // larger. It is also a different equation once written from the asked side,
  // so the two are different core constructions rather than one with a
  // subtraction after it. A third target asks for the original TIME, which is
  // the same search followed by an inversion the other reading never performs.
  // `originalTime` was tried here and withdrawn: this stem states a rate and a
  // rate increase, and the RC2.5 wording rule reads it as asking for a rate —
  // correctly. Answering it in hours would be arguing with a guard instead of
  // respecting it, so this template offers the two RATE targets only.
  const ask = askOf(ctx, rng, ['originalRate', 'increasedRate']);
  const correct = ask === 'increasedRate' ? rate + bump : rate;
  const params = {totalUnits: total, rateIncrease: bump, hoursSaved: saved};

  const distractors = usable(ctx, [
    mk(ask === 'increasedRate' ? rate : rate + bump, 'USED_THE_LARGER_FACTOR',
      `العامل الآخر من الزوج ${ask === 'increasedRate' ? rate : rate + bump}`, 3),
    mk(total / saved, 'SOLVED_ONE_CONDITION_ONLY', `${total} ÷ ${saved}`),
    mk(total / oldTime + bump / 2, 'MISREAD_THE_STEP', `${total} ÷ ${oldTime} + ${bump} ÷ 2`),
    mk(2 * rate + bump, 'USED_SUM_OF_FACTOR_PAIR', `${rate} + ${rate + bump}`, 3),
    mk(bump, 'USED_GIVEN_VALUE_AS_ANSWER', `الزيادة المعطاة ${bump}`),
    mk(oldTime, 'MISREAD_THE_STEP', `${total} ÷ ${rate}`),
    mk(product / bump, 'STOPPED_AT_INTERMEDIATE_TOTAL', `${product} ÷ ${bump}`, 2),
    mk(rate - bump, 'APPLIED_OPERATION_IN_REVERSE', `${rate} − ${bump}`),
    mk(rate + 2 * bump, 'APPLIED_STEP_TWICE', `${rate} + ${bump} × 2`)
  ]);

  const stem = composeSentences(ctx, `ينجز جهاز ${u(total, sc.out)} بمعدل ثابت. ولو زاد معدله بمقدار ${rateOf(bump, sc)} لأنجز العمل نفسه في ${u(saved, 'hour', 'oblique')} أقل. ${ask === 'increasedRate' ? 'فما معدله بعد الزيادة؟' : 'فما معدله الأصلي؟'}`);
  return buildBase(ctx, {
    templateId: 'RATE_H_RATE_FROM_GAP',
    scenario: sc.key,
    subskill: ask === 'increasedRate' ? 'المعدل بعد الزيادة من توفير في الزمن'
      : 'المعدل الأصلي من توفير في الزمن',
    difficulty: 'hard',
    question: stem.text,
    stemStructure: stem.structure, informationOrder: stem.order,
    // RC2.5-4. The answer is a RATE. It was rendered «60 وحدة», which states a
    // quantity and answers a different question than the stem asks.
    //
    // RC2.8-6. And it is a rate of the thing the STEM counts. «وحدة/ساعة» was
    // hard-coded here, so a stem that spoke of loaves throughout offered its
    // answer in generic units — twenty-six items in an eight-hundred-question
    // scan. The scenario already carries its own rate unit; the answer uses it.
    correct, distractors, format: unitFormat(sc.rateUnitId ?? 'unitPerHour'),
    steps: [
      `نفرض المعدل الأصلي = س، فالزمن الأول = ${total} ÷ س، والزمن بعد الزيادة = ${total} ÷ (س + ${bump})، والفرق بينهما ${saved}.`,
      `بضرب طرفي المعادلة في س وفي (س + ${bump}) تصبح: س × (س + ${bump}) = ${total} × ${bump} ÷ ${saved}.`,
      `نحسب الطرف الأيمن: ${total} × ${bump} = ${total * bump}، ثم ${total * bump} ÷ ${saved} = ${product}.`,
      `نبحث عن عددين فرقهما ${bump}، وحاصل ضربهما ${product}؛ وهما ${rate} و${rate + bump}، لأن ${rate} × ${rate + bump} = ${product}.`,
      ask === 'increasedRate' ? `إذن المعدل بعد الزيادة = ${correct}.` : `إذن المعدل الأصلي = ${correct}.`
    ],
    howToStart: 'اكتب الزمنين بدلالة المعدل المجهول، ثم وحّد المقامات للتخلص من القسمة.',
    remember: 'عندما يظهر المجهول في مقامين، اضرب طرفي المعادلة فيهما معًا.',
    fastMethod: 'حاصل الضرب معلوم والفرق معلوم، فابحث عن زوج العوامل مباشرة.',
    estimatedSteps: 5, conceptTags: ['unit-rate', 'inverse', 'factor-pair'], parameters: params,
    oracle: {
      kind: 'constraint', answerKind: 'number',
      constraints: [
        ask === 'increasedRate'
          ? eq(mul(X, sub(X, bump), saved), mul(total, bump))
          : eq(mul(X, add(X, bump), saved), mul(total, bump))
      ]
    },
    askedUnknown: ask, stageCount: 3,
    pedagogy: {
      targetSkill: 'RATE_FROM_TIME_DIFFERENCE', targetMisconception: 'USED_THE_LARGER_FACTOR',
      // The named slip is "take the other member of the factor pair", so which
      // value that is depends on which member is the key.
      wrongMethodValue: ask === 'increasedRate' ? rate : rate + bump
    },
    complexityFactors: {reasoningTransformations: 4, conceptCount: 3, equationSolving: 1, conditionCount: 2, reverseReasoning: 1, stageCount: 3, arithmeticBurden: 5},
    textParams: {essentialParams: ['totalUnits', 'rateIncrease', 'hoursSaved']}
  });
}

// ---------------------------------------------------------------------------
// RC2.9.4-B3. Two more MEDIUM constructions. The MEDIUM templates this family
// held adjust one rate by a percentage. These bring TWO stated rates onto one
// footing and compare them (a gap in a rate), and recover a TIME whose unit
// differs from the rate's (a conversion after the division).
// ---------------------------------------------------------------------------

function rateGap(ctx) {
  const sc = sceneFor(ctx, 'production');
  const {rng} = ctx;
  const r1 = rng.pick([20, 24, 25, 30, 32, 36, 40, 45]);
  const r2 = rng.pick([15, 18, 20, 24, 25, 28, 30, 35].filter(v => v !== r1));
  const m1 = rng.pick([6, 8, 10, 12, 15]);
  const m2 = rng.pick([5, 6, 9, 10, 12, 20].filter(v => v !== m1));
  const t1 = r1 * m1, t2 = r2 * m2;
  const correct = Math.abs(r1 - r2);
  if (Math.abs(t1 - t2) === correct || Math.abs(m1 - m2) === correct) return resample(ctx, rateGap);
  const first = r1 > r2;
  const params = {firstAmount: t1, firstMinutes: m1, secondAmount: t2, secondMinutes: m2};
  const distractors = usable(ctx, [
    mk(Math.abs(t1 - t2), 'USED_DIFFERENCE_AS_ANSWER', `|${t1} − ${t2}|`, 1),
    mk(r1, 'STOPPED_AT_UNIT_RATE', `${t1} ÷ ${m1}`, 3),
    mk(r2, 'STOPPED_AT_UNIT_RATE', `${t2} ÷ ${m2}`, 3),
    mk(r1 + r2, 'ADDED_WHERE_A_DIFFERENCE_BELONGS', `${r1} + ${r2}`, 3),
    mk(Math.abs(t1 / m2 - t2 / m1), 'SWAPPED_RATE_AND_COUNT', `|${t1} ÷ ${m2} − ${t2} ÷ ${m1}|`, 2),
    mk(Math.abs(t1 - t2) / Math.abs(m1 - m2), 'MISREAD_THE_STEP', `|${t1} − ${t2}| ÷ |${m1} − ${m2}|`, 1),
    mk(Math.abs(m1 - m2), 'USED_DIFFERENCE_AS_ANSWER', `|${m1} − ${m2}|`, 1)
  ], {maxDecimals: 2});
  if (distinctValues(distractors.filter(d => d.value !== correct)) < 5) return resample(ctx, rateGap);
  const stem = composeSentences(ctx, `تنجز الآلة الأولى ${u(t1, sc.out)} في ${u(m1, 'minute', 'oblique')}، وتنجز الآلة الثانية ${u(t2, sc.out)} في ${u(m2, 'minute', 'oblique')}. بكم ${unitWordKam(sc.out)} في الدقيقة يزيد معدل الآلة ${first ? 'الأولى' : 'الثانية'} على معدل الأخرى؟`);
  return buildBase(ctx, {
    templateId: 'RATE_M_COMPARE',
    scenario: sc.key,
    subskill: 'فرق معدلين وحدويين من كميتين وزمنين مختلفين',
    difficulty: 'medium',
    question: stem.text,
    stemStructure: stem.structure, informationOrder: stem.order,
    // Every production scene has a per-minute rate unit beside its per-hour one.
    correct, distractors, format: unitFormat((sc.rateUnitId ?? 'unitPerHour').replace('PerHour', 'PerMinute')),
    steps: [
      `معدل الآلة الأولى في الدقيقة = ${t1} ÷ ${m1} = ${r1}.`,
      `معدل الآلة الثانية في الدقيقة = ${t2} ÷ ${m2} = ${r2}.`,
      `الفرق = ${Math.max(r1, r2)} − ${Math.min(r1, r2)} = ${correct}.`
    ],
    howToStart: 'الكميتان لزمنين مختلفين، فلا تُقارنان مباشرة؛ احسب معدل الدقيقة لكل آلة.',
    remember: 'قارن المعدلات بعد توحيد وحدة الزمن، لا الكميات الكلية.',
    fastMethod: 'معدل كل آلة، ثم الفرق.',
    estimatedSteps: 3, conceptTags: ['unit-rate', 'comparison'], parameters: params,
    oracle: {kind: 'constraint', answerKind: 'number', constraints: [eq(mul(X, m1, m2), first ? sub(mul(t1, m2), mul(t2, m1)) : sub(mul(t2, m1), mul(t1, m2)))]},
    askedUnknown: 'rateGap', stageCount: 2,
    pedagogy: {
      targetSkill: 'COMPARE_UNIT_RATES', targetMisconception: 'USED_DIFFERENCE_AS_ANSWER',
      wrongMethodValue: Math.abs(t1 - t2),
      degenerateWhen: [{when: r1 === r2, note: 'equal rates: nothing to compare'}]
    },
    complexityFactors: {reasoningTransformations: 3, conceptCount: 2, stageCount: 2, arithmeticBurden: 3},
    textParams: {essentialParams: ['firstAmount', 'firstMinutes', 'secondAmount', 'secondMinutes']}
  });
}

function hoursFromMinuteRate(ctx) {
  const {rng} = ctx;
  const rate = rng.pick([20, 25, 30, 40, 45, 50, 60]);
  const correct = rng.pick([1.5, 2, 2.5, 3, 4, 5]);
  const target = rate * 60 * correct;
  if (!Number.isInteger(target) || target > 20000) return resample(ctx, hoursFromMinuteRate);
  const minutes = target / rate;
  const params = {minuteRate: rate, targetVolume: target};
  const distractors = usable(ctx, [
    mk(minutes, 'STOPPED_AT_INTERMEDIATE_TOTAL', `${target} ÷ ${rate}`, 1),
    mk(minutes * 60, 'MULTIPLIED_INSTEAD_OF_DIVIDED', `${target} ÷ ${rate} × 60`, 2),
    mk(rate * 60, 'STOPPED_AT_UNIT_RATE', `${rate} × 60`, 1),
    mk(target / 60, 'MISSED_ONE_STAGE', `${target} ÷ 60`, 1),
    mk(minutes / 60 / 2, 'HALF_DISTANCE_AS_ANSWER', `${target} ÷ ${rate} ÷ 60 ÷ 2`, 2),
    mk(minutes / 60 * 2, 'APPLIED_STEP_TWICE', `${target} ÷ ${rate} ÷ 60 × 2`, 2),
    mk(minutes / 100, 'MISREAD_THE_STEP', `${target} ÷ ${rate} ÷ 100`, 2)
  ], {maxDecimals: 2});
  if (distinctValues(distractors.filter(d => d.value !== correct)) < 5) return resample(ctx, hoursFromMinuteRate);
  const stem = composeSentences(ctx, `تضخ مضخة الماء بمعدل ${u(rate, 'literPerMinute')}. كم ساعة تحتاج لملء خزان سعته ${u(target, 'liter')}؟`);
  return buildBase(ctx, {
    templateId: 'RATE_M_HOURS_FROM_MINUTE_RATE',
    subskill: 'زمن بالساعات من معدل بالدقيقة',
    difficulty: 'medium',
    question: stem.text,
    stemStructure: stem.structure, informationOrder: stem.order,
    correct, distractors, format: unitFormat('hour'),
    steps: [
      `الزمن بالدقائق = ${target} ÷ ${rate} = ${minutes}.`,
      `الزمن بالساعات = ${minutes} ÷ 60 = ${num(correct)}.`
    ],
    howToStart: 'اقسم السعة على المعدل لتحصل على الدقائق، ثم حوّل إلى ساعات.',
    remember: 'المعدل بالدقيقة يعطي زمنًا بالدقائق؛ الساعات تحتاج قسمة على 60.',
    fastMethod: `السعة ÷ المعدل يعطي دقائق، ثم ÷ 60 للساعات — هنا ${target} ÷ ${rate} ÷ 60.`,
    estimatedSteps: 2, conceptTags: ['unit-rate', 'unit-conversion', 'reverse'], parameters: params,
    allowedConstants: [0, 1, 2, 100, 60],
    oracle: {kind: 'constraint', answerKind: 'number', constraints: [eq(mul(X, rate, 60), target)]},
    askedUnknown: 'requiredHoursFromMinuteRate', stageCount: 2,
    pedagogy: {
      targetSkill: 'TIME_THEN_CONVERT', targetMisconception: 'STOPPED_AT_INTERMEDIATE_TOTAL',
      wrongMethodValue: minutes,
      degenerateWhen: [{when: minutes === correct, note: 'minutes equal hours only at zero'}]
    },
    complexityFactors: {reasoningTransformations: 2, conceptCount: 1, unitConversion: 1, reverseReasoning: 1, stageCount: 2, arithmeticBurden: 2},
    textParams: {essentialParams: ['minuteRate', 'targetVolume']}
  });
}

/** RC2.9.5 §4. EASY: the price of one unit, which the band never asked for on its own. */
function unitPriceFromTotal(ctx) {
  const {rng} = ctx;
  const count = rng.pick([4, 5, 6, 8, 12]);
  const unitPrice = rng.pick([7, 9, 11, 13, 15].filter(v => v !== count));
  const total = count * unitPrice;
  const correct = unitPrice;
  const distractors = usable(ctx, [
    mk(total, 'USED_GIVEN_VALUE_AS_ANSWER', `المبلغ المعطى ${total}`),
    mk(count, 'SWAPPED_THE_TWO_UNKNOWNS', `العدد المعطى ${count}`),
    mk(total * count, 'MULTIPLIED_INSTEAD_OF_DIVIDED', `${total} × ${count}`),
    mk(total - count, 'ADDED_WHERE_A_DIFFERENCE_BELONGS', `${total} − ${count}`),
    mk(unitPrice + 1, 'OFF_BY_ONE_STEP', `${total} ÷ ${count} + 1`),
    mk(unitPrice - 1, 'OFF_BY_ONE_STEP', `${total} ÷ ${count} − 1`),
    mk(total / (count + 1), 'RATE_APPLIED_TO_WRONG_COUNT', `${total} ÷ (${count} + 1)`)
  ], {maxDecimals: 2});
  const stem = composeSentences(ctx,
    `في متجر للقرطاسية، اشترى معلم ${u(count, 'book')} بمبلغ ${u(total, 'dirham')}، وجميعها بالسعر نفسه. كم يبلغ سعر الكتاب الواحد؟`);
  return buildBase(ctx, {
    templateId: 'RATE_E_UNIT_PRICE',
    subskill: 'سعر الوحدة الواحدة من مبلغ كلي',
    difficulty: 'easy',
    question: stem.text, stemStructure: stem.structure, informationOrder: stem.order,
    correct, distractors, format: unitFormat('dirham'),
    steps: [`سعر الكتاب الواحد = ${total} ÷ ${count} = ${correct}.`],
    howToStart: 'اقسم المبلغ الكلي على عدد الوحدات.',
    remember: 'قيمة الوحدة الواحدة هي المبلغ مقسومًا على العدد، لا مضروبًا فيه.',
    fastMethod: `سعر الوحدة = المبلغ ÷ العدد — هنا ${total} ÷ ${count}.`,
    estimatedSteps: 1, conceptTags: ['unit-rate', 'unit-value'],
    parameters: {itemCount: count, totalPrice: total},
    oracle: {kind: 'constraint', answerKind: 'number', constraints: [eq(mul(X, count), total)]},
    askedUnknown: 'unitPriceFromTotal', stageCount: 1,
    pedagogy: {targetSkill: 'UNIT_VALUE', targetMisconception: 'MULTIPLIED_INSTEAD_OF_DIVIDED',
      wrongMethodValue: total * count},
    complexityFactors: {reasoningTransformations: 1, conceptCount: 1, stageCount: 1, arithmeticBurden: 1},
    textParams: {essentialParams: ['itemCount', 'totalPrice']}
  });
}

/** RC2.9.5 §4. EASY: how many units a budget buys — a count, not a price. */
function countWithinBudget(ctx) {
  const {rng} = ctx;
  const unitPrice = rng.pick([6, 8, 9, 12, 15]);
  const count = rng.pick([4, 5, 7, 9].filter(v => v !== unitPrice));
  const budget = unitPrice * count;
  const correct = count;
  const distractors = usable(ctx, [
    mk(budget, 'USED_GIVEN_VALUE_AS_ANSWER', `المبلغ المعطى ${budget}`),
    mk(unitPrice, 'SWAPPED_THE_TWO_UNKNOWNS', `سعر الوحدة المعطى ${unitPrice}`),
    mk(budget * unitPrice, 'MULTIPLIED_INSTEAD_OF_DIVIDED', `${budget} × ${unitPrice}`),
    mk(budget - unitPrice, 'ADDED_WHERE_A_DIFFERENCE_BELONGS', `${budget} − ${unitPrice}`),
    mk(count + 1, 'OFF_BY_ONE_STEP', `${budget} ÷ ${unitPrice} + 1`),
    mk(count - 1, 'OFF_BY_ONE_STEP', `${budget} ÷ ${unitPrice} − 1`),
    mk(budget / unitPrice / 2, 'APPLIED_STEP_TWICE', `${budget} ÷ ${unitPrice} ÷ 2`)
  ], {maxDecimals: 2});
  const stem = composeSentences(ctx,
    `مع طالب ${u(budget, 'dirham')}، وسعر الكتاب الواحد ${u(unitPrice, 'dirham')}. كم كتابًا يستطيع شراءه بهذا المبلغ كاملًا؟`);
  return buildBase(ctx, {
    templateId: 'RATE_E_BUDGET_COUNT',
    subskill: 'عدد الوحدات التي يشتريها مبلغ معلوم',
    difficulty: 'easy',
    question: stem.text, stemStructure: stem.structure, informationOrder: stem.order,
    correct, distractors, format: unitFormat('book'),
    steps: [`عدد الكتب = ${budget} ÷ ${unitPrice} = ${correct}.`],
    howToStart: 'اقسم المبلغ على سعر الوحدة الواحدة.',
    remember: 'السؤال عن عدد لا عن سعر، فالقسمة على السعر لا على العدد.',
    fastMethod: `عدد الوحدات = المبلغ ÷ سعر الوحدة — هنا ${budget} ÷ ${unitPrice}.`,
    estimatedSteps: 1, conceptTags: ['unit-rate', 'count'],
    parameters: {budget, unitPrice},
    oracle: {kind: 'constraint', answerKind: 'number', constraints: [eq(mul(X, unitPrice), budget)]},
    askedUnknown: 'countWithinBudget', stageCount: 1,
    pedagogy: {targetSkill: 'COUNT_FROM_BUDGET', targetMisconception: 'SWAPPED_THE_TWO_UNKNOWNS',
      wrongMethodValue: unitPrice},
    complexityFactors: {reasoningTransformations: 1, conceptCount: 1, reverseReasoning: 1, stageCount: 1, arithmeticBurden: 1},
    textParams: {essentialParams: ['budget', 'unitPrice']}
  });
}

/** RC2.9.5 §4. EASY: which pack is cheaper per unit. */
function cheaperPerUnit(ctx) {
  const {rng} = ctx;
  const aCount = rng.pick([4, 5, 6]);
  const aUnit = rng.pick([6, 8, 10, 12]);
  const bCount = rng.pick([3, 8, 10, 12].filter(v => v !== aCount));
  const bUnit = rng.pick([5, 7, 9, 11, 14].filter(v => v !== aUnit));
  const aTotal = aCount * aUnit, bTotal = bCount * bUnit;
  if (aUnit === bUnit || aTotal === bTotal) return resample(ctx, cheaperPerUnit);
  // Worth asking only when the cheaper PACK is not the cheaper unit.
  if ((aTotal < bTotal) === (aUnit < bUnit)) return resample(ctx, cheaperPerUnit);
  const correct = Math.min(aUnit, bUnit);
  const distractors = usable(ctx, [
    mk(Math.max(aUnit, bUnit), 'SOLVED_ONE_CONDITION_ONLY', `سعر الوحدة في العرض الآخر ${Math.max(aUnit, bUnit)}`),
    mk(Math.min(aTotal, bTotal), 'STOPPED_AT_INTERMEDIATE_TOTAL', `أقل مبلغ كلي ${Math.min(aTotal, bTotal)}`),
    mk((aUnit + bUnit) / 2, 'USED_ARITHMETIC_MEAN_OF_AVERAGES', `(${aUnit} + ${bUnit}) ÷ 2`),
    mk(Math.abs(aUnit - bUnit), 'USED_DIFFERENCE_AS_ANSWER', `${Math.max(aUnit, bUnit)} − ${Math.min(aUnit, bUnit)}`),
    mk(Math.min(aCount, bCount), 'SWAPPED_THE_TWO_UNKNOWNS', `أقل عدد وحدات ${Math.min(aCount, bCount)}`),
    mk((aTotal + bTotal) / (aCount + bCount), 'ANSWERED_THE_OTHER_COMPONENT', `(${aTotal} + ${bTotal}) ÷ (${aCount} + ${bCount})`),
    mk(correct * 2, 'APPLIED_STEP_TWICE', `${correct} × 2`)
  ], {maxDecimals: 2});
  const SHOPS = ['بقالة', 'متجر', 'مخبز', 'متجر أدوات', 'مكتبة'];
  const shopA = rng.pick(SHOPS);
  const shopB = rng.pick(SHOPS.filter(s => s !== shopA));
  const stem = composeSentences(ctx,
    `في ${shopA} تُباع ${u(aCount, 'can', 'oblique')} بمبلغ ${u(aTotal, 'dirham')}، وفي ${shopB} تُباع ${u(bCount, 'can', 'oblique')} بمبلغ ${u(bTotal, 'dirham')}. ما سعر العلبة الواحدة في العرض الأوفر؟`);
  return buildBase(ctx, {
    templateId: 'RATE_E_BETTER_DEAL',
    subskill: 'المقارنة بين عرضين بسعر الوحدة',
    difficulty: 'easy',
    question: stem.text, stemStructure: stem.structure, informationOrder: stem.order,
    correct, distractors, format: unitFormat('dirham'),
    steps: [
      `سعر العلبة في العرض الأول = ${aTotal} ÷ ${aCount} = ${aUnit}.`,
      `سعر العلبة في العرض الثاني = ${bTotal} ÷ ${bCount} = ${bUnit}.`,
      `الأوفر هو الأقل للوحدة: ${correct}.`
    ],
    howToStart: 'انزل بكل عرض إلى سعر الوحدة الواحدة قبل المقارنة.',
    remember: 'المبلغ الأقل لا يعني الأوفر: العدد يختلف بين العرضين.',
    fastMethod: 'اقسم كل مبلغ على عدد وحداته ثم قارن.',
    estimatedSteps: 3, conceptTags: ['unit-rate', 'comparison'],
    parameters: {firstCount: aCount, firstTotal: aTotal, secondCount: bCount, secondTotal: bTotal},
    oracle: {kind: 'constraint', answerKind: 'number',
      constraints: [eq(mul(X, correct === aUnit ? aCount : bCount), correct === aUnit ? aTotal : bTotal)]},
    askedUnknown: 'cheaperUnitPrice', stageCount: 3,
    pedagogy: {targetSkill: 'COMPARE_UNIT_PRICES', targetMisconception: 'STOPPED_AT_INTERMEDIATE_TOTAL',
      wrongMethodValue: Math.min(aTotal, bTotal),
      degenerateWhen: [{when: aUnit === bUnit, note: 'the two unit prices are equal'}]},
    complexityFactors: {reasoningTransformations: 2, conceptCount: 1, stageCount: 3, arithmeticBurden: 3},
    textParams: {essentialParams: ['firstCount', 'firstTotal', 'secondCount', 'secondTotal']}
  });
}
