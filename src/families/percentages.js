import {Fraction} from '../qa/fraction.js';
import {mk, usable, u, num, unitFormat, buildBase, eq, X, add, sub, mul, factorLine, resample, riseByPercentPhrase, bandPool, unitWordKam, composeSentences, dropByPercentPhrase} from './_shared.js';

export function generatePercentages({difficulty, rng, seed, engineVersion, telemetry, pinTemplate = null, pinTargets = null}) {
  const ctx = {difficulty, rng, seed, engineVersion, telemetry, pinTargets, family: 'percentages', family_ar: 'النسب المئوية', category: 'النسب المئوية'};
  // RC2.3-1. The catalogue, not a set of per-band pools: which of these is
  // eligible for the requested band is decided by the structural adjudication in
  // src/qa/structure.js, so a template cannot sit in a band nobody adjudicated.
  return bandPool(rng, 'percentages', difficulty, [
    ['PCT_E_OF', simplePercent],
    ['PCT_E_REVERSE_ONE', reverseOneChange],
    ['PCT_M_UNIT_PRICE', unitPriceChange],
    ['PCT_M_REMAIN', remainingChain],
    ['PCT_H_CHAIN_VALUE', successiveWithTarget],
    ['PCT_M_SUCCESSIVE', successiveChange],
    ['PCT_H_REVERSE_CHAIN', reverseSuccessive],
    ['PCT_H_MIXTURE', mixtureConcentration],
    ['PCT_H_TWO_GROUP_CHANGE', twoGroupOppositeChange]
  ], pinTemplate)(ctx);
}

const plain = v => num(v);

function simplePercent(ctx) {
  const {rng} = ctx;
  const pct = rng.pick([10, 20, 25, 30, 40, 50]);
  const baseVal = rng.pick([80, 100, 120, 160, 200, 240, 300, 400, 500]);
  const correct = baseVal * pct / 100;
  const params = {baseValue: baseVal, percent: pct};
  const distractors = usable(ctx, [
    mk(baseVal * (100 - pct) / 100, 'TOOK_COMPLEMENT_PERCENT', `${baseVal} × (100 − ${pct}) ÷ 100`),
    mk(baseVal + pct, 'TREATED_PERCENT_AS_AMOUNT', `${baseVal} + ${pct}`),
    mk(baseVal - pct, 'TREATED_PERCENT_AS_AMOUNT', `${baseVal} − ${pct}`),
    mk(baseVal / pct, 'REVERSED_DIRECT_PROPORTION', `${baseVal} ÷ ${pct}`),
    mk(pct, 'USED_GIVEN_VALUE_AS_ANSWER', `النسبة المعطاة ${pct}`),
    mk(baseVal, 'USED_GIVEN_VALUE_AS_ANSWER', `القيمة المعطاة ${baseVal}`),
    mk(baseVal * pct / 10, 'MULTIPLIED_INSTEAD_OF_DIVIDED', `${baseVal} × ${pct} ÷ 10`),
    mk(baseVal / 100, 'MISSED_ONE_STAGE', `${baseVal} ÷ 100 — حساب 1% ونسيان الضرب في ${pct}`),
    mk(baseVal * pct / 200, 'APPLIED_STEP_TWICE', `${baseVal} × ${pct} ÷ 100 ÷ 2`),
    mk(baseVal * (100 + pct) / 100, 'USED_ORIGINAL_TOTAL', `${baseVal} × (100 + ${pct}) ÷ 100`)
  ]);
  const stem = composeSentences(ctx, `ما قيمة ${pct}% من ${baseVal}؟`);
  return buildBase(ctx, {
    templateId: 'PCT_E_OF',
    subskill: 'حساب نسبة مئوية من قيمة',
    difficulty: 'easy',
    question: stem.text,
    stemStructure: stem.structure, informationOrder: stem.order,
    correct, distractors, format: plain,
    steps: [
      `النسبة كجزء من مئة = ${pct} ÷ 100 = ${num(pct / 100)}.`,
      `القيمة المطلوبة = ${baseVal} × ${num(pct / 100)} = ${correct}.`
    ],
    howToStart: 'حوّل النسبة إلى جزء من 100 واضرب في القيمة.',
    remember: 'النسبة المئوية من عدد = العدد × النسبة ÷ 100.',
    // RC2-019: a reusable rule first, then this instance.
    fastMethod: pct === 25
      ? `النسبة 25% تعني الربع، فاقسم العدد على 4 — هنا ربع ${baseVal} = ${correct}.`
      : `اضرب العدد في النسبة ثم اقسم على 100 — هنا ${baseVal} × ${pct} ÷ 100 = ${correct}.`,
    estimatedSteps: 2, conceptTags: ['percentage'], parameters: params,
    oracle: {kind: 'constraint', answerKind: 'number', constraints: [eq(mul(X, 100), mul(baseVal, pct))]},
    askedUnknown: 'percentOfValue', stageCount: 1,
    pedagogy: {
      targetSkill: 'PERCENT_OF_VALUE',
      // At 50% the complement *is* the part, so the complement mistake cannot
      // be what this item measures; the target moves rather than the value
      // being banned (Section 10 / 11).
      targetMisconception: pct === 50 ? 'REVERSED_DIRECT_PROPORTION' : 'TOOK_COMPLEMENT_PERCENT',
      wrongMethodValue: pct === 50 ? baseVal / pct : baseVal * (100 - pct) / 100
    },
    complexityFactors: {reasoningTransformations: 1, conceptCount: 1, stageCount: 1, arithmeticBurden: 1},
    textParams: {essentialParams: ['baseValue', 'percent']}
  });
}

function reverseOneChange(ctx) {
  const {rng} = ctx;
  const pct = rng.pick([20, 25, 50]);
  const inc = rng.bool();
  const original = rng.pick([80, 100, 120, 160, 200, 240, 300, 400]);
  const {factor, text: factorText} = factorLine(pct, inc ? 'up' : 'down');
  const finalF = Fraction.from(original).mul(factor);
  if (!finalF.isInteger) return resample(ctx, reverseOneChange);
  const final = finalF.toNumber();
  const correct = original;
  const params = {finalValue: final, percent: pct, direction: inc ? 1 : 0};
  const distractors = usable(ctx, [
    mk(final, 'USED_GIVEN_VALUE_AS_ANSWER', `القيمة النهائية ${final}`),
    mk(Fraction.from(final).mul(factorLine(pct, inc ? 'down' : 'up').factor).toNumber(), 'SUBTRACTED_PERCENTAGE_DIRECTLY', `${final} × ${factorLine(pct, inc ? 'down' : 'up').factor.toDecimalString()}`),
    mk(final + pct, 'TREATED_PERCENT_AS_AMOUNT', `${final} + ${pct}`),
    // RC2-014: the clamp used to turn a negative result into 1 while the
    // derivation still read «40 − 50», so the sentence pointed at a number the
    // arithmetic does not produce. The value is left as the subtraction gives
    // it, and usable() drops it when it is not a usable quantity.
    mk(final - pct, 'TREATED_PERCENT_AS_AMOUNT', `${final} − ${pct}`),
    mk(final * 100 / pct, 'APPLIED_PERCENT_TO_WRONG_TOTAL', `${final} × 100 ÷ ${pct}`),
    mk(final + final * pct / 100, 'TREATED_PERCENT_AS_AMOUNT', `${final} + ${final} × ${pct} ÷ 100`),
    mk(Fraction.from(original).mul(factor).mul(factor).toNumber(), 'APPLIED_STEP_TWICE', `${original} × ${factor.toDecimalString()} × ${factor.toDecimalString()}`)
  ]);
  const stem = composeSentences(ctx, inc
    ? `ارتفعت قيمة سلعة ${riseByPercentPhrase(pct)} فأصبحت ${final}. فما قيمتها الأصلية؟`
    : `انخفضت قيمة سلعة ${dropByPercentPhrase(pct)} فأصبحت ${final}. فما قيمتها الأصلية؟`);
  return buildBase(ctx, {
    templateId: 'PCT_E_REVERSE_ONE',
    subskill: 'استرجاع الأصل بعد تغير واحد',
    difficulty: 'medium',
    question: stem.text,
    stemStructure: stem.structure, informationOrder: stem.order,
    correct, distractors, format: plain,
    steps: [
      factorText,
      `القيمة النهائية = الأصل × ${factor.toDecimalString()}.`,
      `الأصل = ${final} ÷ ${factor.toDecimalString()} = ${correct}.`
    ],
    howToStart: 'حوّل التغير إلى معامل ثم اقسم عليه.',
    remember: 'بعد زيادة أو نقصان، لا تعكس العملية بطرح النسبة نفسها من الرقم النهائي.',
    fastMethod: 'اقسم القيمة النهائية على معامل التغير.',
    estimatedSteps: 3, conceptTags: ['percentage', 'reverse'], parameters: params,
    oracle: {
      kind: 'constraint', answerKind: 'number',
      constraints: [eq(mul(X, inc ? 100 + pct : 100 - pct), mul(final, 100))]
    },
    askedUnknown: 'originalFromFinal', stageCount: 2,
    pedagogy: {
      targetSkill: 'REVERSE_ONE_PERCENT_CHANGE', targetMisconception: 'SUBTRACTED_PERCENTAGE_DIRECTLY',
      wrongMethodValue: Fraction.from(final).mul(factorLine(pct, inc ? 'down' : 'up').factor).toNumber(),
      degenerateWhen: [{when: pct === 0, note: 'no change to reverse'}]
    },
    complexityFactors: {reasoningTransformations: 2, conceptCount: 1, reverseReasoning: 1, stageCount: 2, arithmeticBurden: 2},
    textParams: {essentialParams: ['finalValue', 'percent']}
  });
}

function successiveChange(ctx) {
  const {rng} = ctx;
  const p1 = rng.pick([10, 20, 25]);
  const p2 = rng.pick([10, 20, 25]);
  const upFirst = rng.bool();
  const f1 = upFirst ? 100 + p1 : 100 - p1;
  const f2 = upFirst ? 100 - p2 : 100 + p2;
  const deltaTimes100 = f1 * f2 - 10000;        // exact, integer
  const correct = deltaTimes100 / 100;
  // Section 13: a net factor of 1 makes the item trivial for a template whose
  // point is that successive changes do not cancel.
  if (correct === 0) return resample(ctx, successiveChange);
  const original = rng.pick([100, 200, 400, 500, 800]);
  const after1 = original * f1 / 100;
  const final = after1 * f2 / 100;
  if (!Number.isInteger(after1) || !Number.isInteger(final)) return resample(ctx, successiveChange);
  const params = {originalValue: original, firstPercent: p1, secondPercent: p2, upFirst: upFirst ? 1 : 0};
  const signed = upFirst ? p1 - p2 : p2 - p1;
  const distractors = usable(ctx, [
    mk(signed, 'ADDED_PERCENTAGES', `${upFirst ? p1 : p2} − ${upFirst ? p2 : p1}`),
    mk(-signed, 'SUBTRACTED_PERCENTAGES', `${upFirst ? p2 : p1} − ${upFirst ? p1 : p2}`),
    // RC2-014: when both changes are decreases the sum is negative, and the
    // derivation has to carry the sign. Written «25 + 25» it evaluated to 50
    // while the option read −50.
    mk(upFirst ? p1 + p2 : -(p1 + p2), 'ADDED_PERCENTAGES',
      upFirst ? `${p1} + ${p2}` : `(−${p1}) + (−${p2})`),
    mk(-correct, 'APPLIED_OPERATION_IN_REVERSE', `عكس إشارة ${num(correct)}`),
    mk((f1 * f2 - 10000) / 200, 'APPLIED_STEP_TWICE', `(${f1} × ${f2} − 10000) ÷ 200`),
    mk((f1 * f2 - 10000) / 50, 'MULTIPLIED_INSTEAD_OF_DIVIDED', `(${f1} × ${f2} − 10000) ÷ 50`),
    mk(upFirst ? p1 : -p1, 'STOPPED_AFTER_FIRST_STAGE', `التغير الأول ${p1}% فقط`),
    mk(upFirst ? -p2 : p2, 'USED_ONLY_LAST_STAGE', `التغير الثاني ${p2}% فقط`)
  ], {allowNegative: true, allowZero: true});
  const format = v => v > 0 ? `زيادة ${num(v)}%` : v < 0 ? `انخفاض ${num(Math.abs(v))}%` : 'لا يوجد تغير';
  const stem = composeSentences(ctx, `كانت قيمة ${original}. ${upFirst ? 'زادت' : 'انخفضت'} بنسبة ${p1}%، ثم ${upFirst ? 'انخفضت' : 'زادت'} القيمة الجديدة بنسبة ${p2}%. ما نسبة التغير النهائية مقارنة بالأصل؟`);
  return buildBase(ctx, {
    templateId: 'PCT_M_SUCCESSIVE',
    subskill: 'تغيران مئويان متتاليان',
    difficulty: 'hard',
    question: stem.text,
    stemStructure: stem.structure, informationOrder: stem.order,
    correct, distractors, format,
    steps: [
      `القيمة بعد التغير الأول = ${original} × (100 ${upFirst ? '+' : '−'} ${p1}) ÷ 100 = ${after1}.`,
      `القيمة بعد التغير الثاني = ${after1} × (100 ${upFirst ? '−' : '+'} ${p2}) ÷ 100 = ${final}.`,
      `الفرق عن الأصل = ${final} − ${original} = ${final - original}.`,
      `نسبة التغير = ${final - original} ÷ ${original} × 100 = ${num(correct)}.`
    ],
    howToStart: 'طبّق كل نسبة على القيمة الموجودة في تلك اللحظة.',
    remember: 'النسب المتتابعة لا تُجمع ولا تُطرح مباشرة.',
    fastMethod: `استخدم معاملي التغير: × ${num(f1 / 100)} ثم × ${num(f2 / 100)}.`,
    answerText: `الإجابة الصحيحة: ${format(correct)}.`,
    estimatedSteps: 3, conceptTags: ['percentage', 'successive-change'], parameters: params,
    oracle: {kind: 'constraint', answerKind: 'number', constraints: [eq(mul(X, 100), sub(mul(f1, f2), 10000))]},
    askedUnknown: 'netPercentChange', stageCount: 2,
    pedagogy: {
      targetSkill: 'SUCCESSIVE_PERCENT_CHANGE', targetMisconception: 'ADDED_PERCENTAGES',
      wrongMethodValue: signed,
      degenerateWhen: [{when: f1 * f2 === 10000, note: 'the two changes cancel exactly'}]
    },
    complexityFactors: {reasoningTransformations: 3, conceptCount: 2, stageCount: 2, arithmeticBurden: 3},
    textParams: {essentialParams: ['originalValue', 'firstPercent', 'secondPercent']}
  });
}

function remainingChain(ctx) {
  const {rng} = ctx;
  const total = rng.pick([80, 100, 120, 160, 200, 240]);
  const p1 = rng.pick([20, 25, 40]);
  const p2 = rng.pick([10, 20, 25]);
  const after1 = total * (100 - p1) / 100;
  const final = after1 * (100 - p2) / 100;
  if (!Number.isInteger(after1) || !Number.isInteger(final)) return resample(ctx, remainingChain);
  const correct = final;
  const wrongCombined = total * (100 - p1 - p2) / 100;
  const params = {totalCount: total, firstPercent: p1, secondPercent: p2};
  const distractors = usable(ctx, [
    mk(after1, 'STOPPED_AFTER_FIRST_STAGE', `${total} × (100 − ${p1}) ÷ 100`),
    mk(total * (100 - p2) / 100, 'APPLIED_PERCENT_TO_ORIGINAL', `${total} × (100 − ${p2}) ÷ 100`),
    mk(wrongCombined, 'ADDED_PERCENTAGES', `${total} × (100 − ${p1} − ${p2}) ÷ 100`),
    mk(total - final, 'TOOK_COMPLEMENT_PERCENT', `${total} − ${final}`),
    mk(total * (100 - p1 - p2) / 100, 'SUBTRACTED_PERCENTAGES', `${total} × (100 − ${p1} − ${p2}) ÷ 100`),
    mk(total - p1 - p2, 'TREATED_PERCENT_AS_AMOUNT', `${total} − ${p1} − ${p2}`),
    mk(total, 'USED_ORIGINAL_TOTAL', `العدد الأصلي ${total}`),
    mk(total * (100 - p1) / 100, 'STOPPED_AFTER_FIRST_STAGE', `${total} × (100 − ${p1}) ÷ 100`),
    mk(total * p2 / 100, 'APPLIED_PERCENT_TO_ORIGINAL', `${total} × ${p2} ÷ 100`),
    mk(total - p1 - p2, 'TREATED_PERCENT_AS_AMOUNT', `${total} − ${p1} − ${p2}`)
  ]);
  const stem = composeSentences(ctx, `في مجموعة عددها ${total}، غاب ${p1}% منهم، ثم غادر ${p2}% من الموجودين بعد ذلك. كم بقي؟`);
  return buildBase(ctx, {
    templateId: 'PCT_M_REMAIN',
    subskill: 'نسبتان من الباقي',
    difficulty: 'medium',
    question: stem.text,
    stemStructure: stem.structure, informationOrder: stem.order,
    correct, distractors, format: plain,
    steps: [
      `الباقي بعد الغياب الأول = ${total} × (100 − ${p1}) ÷ 100 = ${after1}.`,
      `من غادر بعد ذلك = ${after1} × ${p2} ÷ 100 = ${after1 - final}.`,
      `المتبقي = ${after1} − ${after1 - final} = ${final}.`
    ],
    howToStart: 'طبّق المرحلة الأولى ثم احسب المرحلة الثانية من العدد الجديد.',
    remember: 'انتبه لعبارات مثل «من الموجودين» أو «من الباقي».',
    fastMethod: 'احسب الباقي بعد كل مرحلة على حدة.',
    estimatedSteps: 3, conceptTags: ['percentage', 'successive-change'], parameters: params,
    oracle: {
      kind: 'constraint', answerKind: 'number',
      constraints: [eq(mul(X, 10000), mul(total, sub(100, p1), sub(100, p2)))]
    },
    askedUnknown: 'remainingAfterTwoStages', stageCount: 2,
    pedagogy: {
      targetSkill: 'PERCENT_OF_REMAINDER', targetMisconception: 'ADDED_PERCENTAGES',
      wrongMethodValue: wrongCombined,
      degenerateWhen: [{when: p2 === 0, note: 'second stage removes nobody'}]
    },
    complexityFactors: {reasoningTransformations: 3, conceptCount: 2, stageCount: 2, arithmeticBurden: 3},
    textParams: {essentialParams: ['totalCount', 'firstPercent', 'secondPercent']}
  });
}

function unitPriceChange(ctx) {
  const {rng} = ctx;
  const qty1 = rng.pick([4, 5, 8]);
  const unitPrice = rng.pick([5, 6, 8, 10, 12]);
  const total1 = qty1 * unitPrice;
  const pct = rng.pick([10, 20, 25, 50]);
  const qty2 = rng.pick([5, 10, 12, 15].filter(v => v !== qty1));
  const {factor, text: factorText} = factorLine(pct, 'up', 'معامل الزيادة');
  const newUnit = Fraction.from(unitPrice).mul(factor);
  const answer = newUnit.mul(qty2);
  if (!newUnit.isExactDecimal || newUnit.decimalPlaces > 2 || !answer.isExactDecimal || answer.decimalPlaces > 2) return resample(ctx, unitPriceChange);
  const correct = answer.toNumber();
  const params = {baseCount: qty1, baseAmount: total1, percent: pct, targetCount: qty2};
  const distractors = usable(ctx, [
    mk(unitPrice * qty2, 'USED_RATE_BEFORE_CHANGE', `${unitPrice} × ${qty2}`),
    mk(Fraction.from(total1).mul(factor).toNumber(), 'APPLIED_PERCENT_TO_WRONG_TOTAL', `${total1} × ${factor.toDecimalString()}`),
    mk(newUnit.toNumber(), 'STOPPED_AT_UNIT_RATE', `${unitPrice} × ${factor.toDecimalString()}`),
    mk(qty2 * (unitPrice + pct), 'TREATED_PERCENT_AS_AMOUNT', `${qty2} × (${unitPrice} + ${pct})`),
    mk(newUnit.mul(qty1).toNumber(), 'RATE_APPLIED_TO_WRONG_COUNT', `${newUnit.toDecimalString()} × ${qty1}`),
    mk(newUnit.mul(factor).mul(qty2).toNumber(), 'APPLIED_STEP_TWICE', `${newUnit.toDecimalString()} × ${factor.toDecimalString()} × ${qty2}`),
    // RC2-012: deepened.
    mk(total1 * qty2 / qty1, 'USED_RATE_BEFORE_CHANGE', `${total1} × ${qty2} ÷ ${qty1}`),
    mk(total1 + pct, 'TREATED_PERCENT_AS_AMOUNT', `${total1} + ${pct}`),
    mk(qty2 * unitPrice + pct, 'TREATED_PERCENT_AS_AMOUNT', `${qty2} × ${unitPrice} + ${pct}`),
    mk(total1 * qty2, 'MULTIPLIED_COUNTS_INSTEAD_OF_RATE', `${total1} × ${qty2}`)
  ]);
  const stem = composeSentences(ctx, `ثمن ${u(qty1, 'unit')} هو ${u(total1, 'dirham')}. إذا ارتفع سعر الوحدة ${riseByPercentPhrase(pct)}، فما ثمن ${u(qty2, 'unit')} بعد الزيادة؟`);
  return buildBase(ctx, {
    templateId: 'PCT_M_UNIT_PRICE',
    subskill: 'معدل وحدوي ثم زيادة مئوية',
    difficulty: 'medium',
    question: stem.text,
    stemStructure: stem.structure, informationOrder: stem.order,
    correct, distractors, format: unitFormat('dirham'),
    steps: [
      `سعر الوحدة الأصلي = ${total1} ÷ ${qty1} = ${unitPrice}.`,
      factorText,
      `السعر الجديد للوحدة = ${unitPrice} × ${factor.toDecimalString()} = ${newUnit.toDecimalString()}.`,
      `ثمن ${u(qty2, 'unit')} = ${newUnit.toDecimalString()} × ${qty2} = ${num(correct)}.`
    ],
    howToStart: 'احسب سعر الوحدة أولًا، ثم عدّله بالنسبة المطلوبة.',
    remember: 'إذا تغير سعر الوحدة، عدّل الوحدة قبل التوسع إلى كمية جديدة.',
    fastMethod: 'سعر الوحدة ← الزيادة ← الكمية المطلوبة.',
    estimatedSteps: 3, conceptTags: ['percentage', 'unit-rate'], parameters: params,
    oracle: {
      kind: 'constraint', answerKind: 'number',
      constraints: [eq(mul(X, qty1, 100), mul(total1, qty2, add(100, pct)))]
    },
    askedUnknown: 'scaledCostAfterIncrease', stageCount: 3,
    pedagogy: {
      targetSkill: 'UNIT_PRICE_THEN_PERCENT', targetMisconception: 'APPLIED_PERCENT_TO_WRONG_TOTAL',
      wrongMethodValue: Fraction.from(total1).mul(factor).toNumber(),
      degenerateWhen: [{when: qty1 === qty2, note: 'same quantity makes the wrong base right'}]
    },
    complexityFactors: {reasoningTransformations: 3, conceptCount: 2, stageCount: 3, arithmeticBurden: 3},
    textParams: {essentialParams: ['baseCount', 'baseAmount', 'percent', 'targetCount']}
  });
}

function reverseSuccessive(ctx) {
  const {rng} = ctx;
  const p1 = rng.pick([20, 25, 50]);
  const p2 = rng.pick([10, 20, 25]);
  const original = rng.pick([100, 200, 300, 400, 500, 600, 800]);
  const f1 = 100 + p1, f2 = 100 - p2;
  if (f1 * f2 === 10000) return resample(ctx, reverseSuccessive);
  const finalF = Fraction.from(original).mul(f1).mul(f2).div(10000);
  if (!finalF.isInteger) return resample(ctx, reverseSuccessive);
  const final = finalF.toNumber();
  const after1 = original * f1 / 100;
  if (!Number.isInteger(after1)) return resample(ctx, reverseSuccessive);
  const correct = original;
  const netFactor = Fraction.from(f1).mul(f2).div(10000);
  const params = {finalValue: final, firstPercent: p1, secondPercent: p2};
  const distractors = usable(ctx, [
    mk(final, 'USED_GIVEN_VALUE_AS_ANSWER', `القيمة النهائية ${final}`),
    mk(Fraction.from(final).mul(100).div(f1).toNumber(), 'REVERSED_ONE_STAGE_ONLY', `${final} × 100 ÷ ${f1}`),
    mk(Fraction.from(final).mul(100).div(f2).toNumber(), 'REVERSED_ONE_STAGE_ONLY', `${final} × 100 ÷ ${f2}`),
    mk(Fraction.from(final).mul(100).div(100 + p1 - p2).toNumber(), 'ADDED_PERCENTAGES', `${final} × 100 ÷ (100 + ${p1} − ${p2})`),
    mk(after1, 'STOPPED_AFTER_FIRST_STAGE', `${original} × ${f1} ÷ 100`),
    mk(Fraction.from(final).mul(netFactor).toNumber(), 'APPLIED_OPERATION_IN_REVERSE', `${final} × ${netFactor.toDecimalString()}`),
    mk(final * 10000 / (f1 * f1), 'APPLIED_STEP_TWICE', `${final} × 10000 ÷ (${f1} × ${f1})`),
    mk(final * 10000 / (f2 * f2), 'APPLIED_STEP_TWICE', `${final} × 10000 ÷ (${f2} × ${f2})`),
    mk(final + p1 - p2, 'TREATED_PERCENT_AS_AMOUNT', `${final} + ${p1} − ${p2}`),
    mk(Fraction.from(final).mul(20000).div(f1 * f2).toNumber(), 'APPLIED_STEP_TWICE', `${final} × 20000 ÷ (${f1} × ${f2})`)
  ]);
  const stem = composeSentences(ctx, `زادت قيمة بنسبة ${p1}%، ثم انخفضت القيمة الجديدة بنسبة ${p2}%. إذا أصبحت القيمة النهائية ${final}، فما القيمة الأصلية؟`);
  return buildBase(ctx, {
    templateId: 'PCT_H_REVERSE_CHAIN',
    subskill: 'استرجاع الأصل بعد تغيرين متتاليين',
    difficulty: 'hard',
    question: stem.text,
    stemStructure: stem.structure, informationOrder: stem.order,
    correct, distractors, format: plain,
    steps: [
      `معامل الزيادة = (100 + ${p1}) ÷ 100 = ${num(f1 / 100)}.`,
      `معامل الانخفاض = (100 − ${p2}) ÷ 100 = ${num(f2 / 100)}.`,
      `المعامل الكلي = ${num(f1 / 100)} × ${num(f2 / 100)} = ${netFactor.toDecimalString()}.`,
      `الأصل = ${final} ÷ ${netFactor.toDecimalString()} = ${correct}.`
    ],
    howToStart: 'حوّل كل تغير إلى معامل، ثم اعكس حاصل ضرب المعاملين.',
    remember: 'عكس تغيرين متتاليين يتطلب عكس كل المراحل لا طرح النسب.',
    fastMethod: 'اقسم النهائي على حاصل ضرب معاملي التغير.',
    estimatedSteps: 4, conceptTags: ['percentage', 'reverse'], parameters: params,
    oracle: {
      kind: 'constraint', answerKind: 'number',
      constraints: [eq(mul(X, add(100, p1), sub(100, p2)), mul(final, 10000))]
    },
    askedUnknown: 'originalFromTwoChanges', stageCount: 2,
    pedagogy: {
      targetSkill: 'REVERSE_SUCCESSIVE_CHANGES', targetMisconception: 'REVERSED_ONE_STAGE_ONLY',
      wrongMethodValue: Fraction.from(final).mul(100).div(f1).toNumber(),
      degenerateWhen: [{when: f1 * f2 === 10000, note: 'net factor of 1 makes the reversal trivial'}]
    },
    complexityFactors: {reasoningTransformations: 4, conceptCount: 2, reverseReasoning: 1, stageCount: 2, arithmeticBurden: 4},
    textParams: {essentialParams: ['finalValue', 'firstPercent', 'secondPercent']}
  });
}

function successiveWithTarget(ctx) {
  const {rng} = ctx;
  const original = rng.pick([200, 300, 400, 500, 600]);
  const p1 = rng.pick([10, 20, 25]);
  const p2 = rng.pick([10, 20]);
  const f1 = 100 - p1, f2 = 100 + p2;
  if (f1 * f2 === 10000) return resample(ctx, successiveWithTarget);
  const afterF = Fraction.from(original).mul(f1).div(100);
  const finalF = afterF.mul(f2).div(100);
  if (!afterF.isInteger || !finalF.isInteger) return resample(ctx, successiveWithTarget);
  const correct = finalF.toNumber();
  const after = afterF.toNumber();
  const params = {originalValue: original, discountPercent: p1, increasePercent: p2};
  const wrongNet = original * (100 + p2 - p1) / 100;
  const distractors = usable(ctx, [
    mk(after, 'STOPPED_AFTER_FIRST_STAGE', `${original} × ${f1} ÷ 100`),
    mk(original * f2 / 100, 'APPLIED_PERCENT_TO_ORIGINAL', `${original} × ${f2} ÷ 100`),
    mk(wrongNet, 'ADDED_PERCENTAGES', `${original} × (100 + ${p2} − ${p1}) ÷ 100`),
    mk(original, 'USED_ORIGINAL_TOTAL', `القيمة الأصلية ${original}`),
    mk(original * f2 / 100, 'STOPPED_AFTER_FIRST_STAGE', `${original} × ${num(f2 / 100)}`),
    mk(after + original, 'USED_ORIGINAL_TOTAL', `${after} + ${original}`),
    mk(Fraction.from(after).mul(f2).mul(f2).div(10000).toNumber(), 'APPLIED_STEP_TWICE', `${after} × ${num(f2 / 100)} × ${num(f2 / 100)}`)
  ]);
  const stem = composeSentences(ctx, `قيمة أصلية مقدارها ${original}. خُفّضت بنسبة ${p1}%، ثم زيدت القيمة الجديدة بنسبة ${p2}%. ما القيمة النهائية؟`);
  return buildBase(ctx, {
    templateId: 'PCT_H_CHAIN_VALUE',
    subskill: 'خصم ثم زيادة على القيمة الجديدة',
    difficulty: 'medium',
    question: stem.text,
    stemStructure: stem.structure, informationOrder: stem.order,
    correct, distractors, format: plain,
    steps: [
      `القيمة بعد الخصم = ${original} × (100 − ${p1}) ÷ 100 = ${after}.`,
      `القيمة بعد الزيادة = ${after} × (100 + ${p2}) ÷ 100 = ${correct}.`
    ],
    howToStart: 'طبّق الخصم ثم الزيادة على الناتج لا على الأصل.',
    remember: 'كل نسبة متتابعة لها أساس حساب جديد.',
    fastMethod: 'استخدم معاملين متتاليين بدل حساب النسب منفصلة.',
    estimatedSteps: 3, conceptTags: ['percentage', 'successive-change'], parameters: params,
    oracle: {
      kind: 'constraint', answerKind: 'number',
      constraints: [eq(mul(X, 10000), mul(original, sub(100, p1), add(100, p2)))]
    },
    askedUnknown: 'finalAfterTwoChanges', stageCount: 2,
    pedagogy: {
      targetSkill: 'SUCCESSIVE_PERCENT_VALUE', targetMisconception: 'ADDED_PERCENTAGES',
      wrongMethodValue: wrongNet,
      degenerateWhen: [{when: f1 * f2 === 10000, note: 'the two changes cancel exactly'}]
    },
    complexityFactors: {reasoningTransformations: 3, conceptCount: 2, stageCount: 2, arithmeticBurden: 3},
    textParams: {essentialParams: ['originalValue', 'discountPercent', 'increasePercent']}
  });
}


// ---------------------------------------------------------------------------
// RC2.4 — genuinely hard structures for this family.
//
// RC2.3 left percentages with no hard template at all, and correctly: every
// structure it held was a percentage applied, chained or inverted once, in the
// direction the sentence states. The two below are not that. Neither can be
// started by evaluating any given on its own.
// ---------------------------------------------------------------------------

/**
 * SIMULTANEOUS_CONSTRAINTS + CROSS_PART_INTEGRATION.
 *
 * Two solutions of different strength make a third of a stated strength. The
 * amount of each is unknown, and the two conditions — the volumes sum to the
 * total, and the dissolved amounts sum to the mixture's — hold at once. Nothing
 * can be computed until they are combined.
 */
function mixtureConcentration(ctx) {
  const {rng} = ctx;
  let found = null;
  for (let t = 0; t < 150; t++) {
    const p1 = rng.pick([10, 15, 20, 25, 30]);
    const p2 = rng.pick([40, 45, 50, 60, 75]);
    const total = rng.pick([20, 24, 30, 40, 50, 60]);
    const x = rng.int(2, total - 2);
    // The mixture strength is a consequence of the draw, never a separate pick,
    // so the three amounts cannot contradict each other.
    const pmNum = x * p1 + (total - x) * p2;
    if (pmNum % total !== 0) continue;
    const pm = pmNum / total;
    if (pm === p1 || pm === p2) continue;
    // Section 10: at exactly half the volume the mixture strength IS the plain
    // average, so «halve the total» — the very slip this item exists to catch —
    // lands on the key and the item measures nothing. Refused at the draw
    // rather than at validation, where it cost a fifth of this template's
    // attempts. The rejection is on the wrong method's value, never the key's.
    if (2 * x === total) continue;
    // Every amount the explanation states has to be writable as an exact
    // quantity, or the steps announce a number no learner would produce.
    if ((total * pm) % 100 !== 0 || (total * p2) % 100 !== 0 || (total * p1) % 100 !== 0) continue;
    found = {p1, p2, total, x, pm};
    break;
  }
  if (!found) return resample(ctx, mixtureConcentration);
  const {p1, p2, total, x, pm} = found;

  const mixAmount = total * pm / 100;
  const allSecond = total * p2 / 100;
  const allFirst = total * p1 / 100;
  const gap = allSecond - mixAmount;
  const perLitre = (p2 - p1) / 100;
  const correct = x;
  const params = {firstPercent: p1, secondPercent: p2, totalVolume: total, mixturePercent: pm};

  const distractors = usable(ctx, [
    mk(total - x, 'ANSWERED_THE_OTHER_COMPONENT', `${total} − ${x}`, 5),
    mk(total / 2, 'AVERAGED_THE_TWO_CONCENTRATIONS', `${total} ÷ 2`),
    mk(mixAmount, 'STOPPED_AT_INTERMEDIATE_TOTAL', `${total} × ${pm} ÷ 100`, 0),
    mk(allFirst, 'APPLIED_PERCENT_TO_WRONG_TOTAL', `${total} × ${p1} ÷ 100`),
    mk(total - mixAmount, 'MISREAD_THE_STEP', `${total} − ${total} × ${pm} ÷ 100`),
    mk(total * (p2 - pm) / p2, 'SOLVED_ONE_CONDITION_ONLY', `${total} × (${p2} − ${pm}) ÷ ${p2}`),
    mk(gap, 'STOPPED_AT_INTERMEDIATE_TOTAL', `${allSecond} − ${mixAmount}`, 2),
    mk(mixAmount / (p1 / 100), 'SOLVED_ONE_CONDITION_ONLY', `${mixAmount} ÷ (${p1} ÷ 100)`),
    mk(total * (pm - p1) / p2, 'SWAPPED_THE_TWO_UNKNOWNS', `${total} × (${pm} − ${p1}) ÷ ${p2}`),
    mk(total - gap, 'MISREAD_THE_STEP', `${total} − ${num(gap)}`, 2),
    mk(allFirst + gap, 'STOPPED_AT_INTERMEDIATE_TOTAL', `${num(allFirst)} + ${num(gap)}`)
  ]);

  const stem = composeSentences(ctx, `خُلط محلول تركيزه ${p1}% مع محلول آخر تركيزه ${p2}%، فنتج ${u(total, 'liter')} من مزيج تركيزه ${pm}%. كم ${unitWordKam('liter')} من المحلول الأول استُخدم؟`);
  return buildBase(ctx, {
    templateId: 'PCT_H_MIXTURE',
    subskill: 'خلط محلولين بتركيزين مختلفين',
    difficulty: 'hard',
    question: stem.text,
    stemStructure: stem.structure, informationOrder: stem.order,
    correct, distractors, format: unitFormat('liter'),
    steps: [
      `كمية المادة الذائبة في المزيج = ${total} × ${pm} ÷ 100 = ${num(mixAmount)}.`,
      `لو كان المحلولان كلاهما بتركيز ${p2}% لبلغت المادة = ${total} × ${p2} ÷ 100 = ${num(allSecond)}.`,
      `الفارق بين الحالتين = ${num(allSecond)} − ${num(mixAmount)} = ${num(gap)}.`,
      `كل لتر من المحلول الأول بدل الثاني يقلل المادة بمقدار (${p2} − ${p1}) ÷ 100 = ${num(perLitre)}.`,
      `كمية المحلول الأول = ${num(gap)} ÷ ${num(perLitre)} = ${correct}.`
    ],
    howToStart: 'ابدأ من افتراض أن الكمية كلها من المحلول الأقوى، ثم استبدل لترًا بلتر حتى يصل التركيز إلى المطلوب.',
    remember: 'تركيز المزيج ليس متوسط التركيزين إلا إذا تساوت الكميتان.',
    fastMethod: 'الفارق في المادة مقسومًا على الفرق بين التركيزين يعطي كمية المحلول الأضعف مباشرة.',
    estimatedSteps: 5, conceptTags: ['percentage', 'mixture', 'weighted-mean'], parameters: params,
    oracle: {
      kind: 'constraint', answerKind: 'number',
      constraints: [eq(add(mul(X, p1), mul(sub(total, X), p2)), mul(total, pm))]
    },
    askedUnknown: 'firstComponentVolume', stageCount: 3,
    // Givens-derived: a part of the mixture cannot exceed the mixture.
    answerBounds: {between: [0, total]},
    pedagogy: {
      targetSkill: 'MIXTURE_WEIGHTED_MEAN', targetMisconception: 'AVERAGED_THE_TWO_CONCENTRATIONS',
      wrongMethodValue: total / 2,
      degenerateWhen: [{when: pm * 2 === p1 + p2, note: 'the mixture strength is the plain average, so halving the volume is correct'}]
    },
    complexityFactors: {reasoningTransformations: 4, conceptCount: 3, equationSolving: 1, conditionCount: 2, stageCount: 3, arithmeticBurden: 5},
    textParams: {essentialParams: ['firstPercent', 'secondPercent', 'totalVolume', 'mixturePercent']}
  });
}

/**
 * SIMULTANEOUS_CONSTRAINTS + CROSS_PART_INTEGRATION.
 *
 * One group rises and the other falls, and only the two totals are given. The
 * split is what is asked for, and neither percentage can be applied until it is
 * known — so the two conditions have to be carried together.
 */
function twoGroupOppositeChange(ctx) {
  const {rng} = ctx;
  let found = null;
  for (let t = 0; t < 150; t++) {
    const rise = rng.pick([10, 15, 20, 25, 40, 50]);
    const fall = rng.pick([5, 10, 20, 25, 30]);
    const total = rng.pick([200, 240, 300, 360, 400, 500]);
    const first = rng.int(2, Math.floor(total / 20) - 1) * 10;
    const second = total - first;
    if (second <= 0) continue;
    if ((first * rise) % 100 !== 0 || (second * fall) % 100 !== 0) continue;
    const newTotal = total + first * rise / 100 - second * fall / 100;
    if (!Number.isInteger(newTotal) || newTotal === total || newTotal <= 0) continue;
    // Section 10: at half the total, "just halve it" lands on the key and the
    // item stops measuring the two-condition reasoning it exists for. Refused at
    // the draw, on the wrong method's value rather than the key's.
    if (2 * first === total) continue;
    if (total - total * fall / 100 === first) continue;
    found = {rise, fall, total, first, second, newTotal};
    break;
  }
  if (!found) return resample(ctx, twoGroupOppositeChange);
  const {rise, fall, total, first, second, newTotal} = found;

  const ifAllFell = total - total * fall / 100;
  const gap = newTotal - ifAllFell;
  const perUnit = (rise + fall) / 100;
  // RC2.7-R3. Which of the two sections is asked for is a different CORE
  // construction, not a rewording: the relation that pins the answer is a
  // different equation, and the last step of the reasoning runs the other way.
  // The independent review's finding was that scenario changes did not do this;
  // changing what is asked for does.
  const askSecond = rng.bool(0.45);
  const correct = askSecond ? second : first;
  const other = askSecond ? first : second;
  const ordinal = askSecond ? 'الثاني' : 'الأول';
  const params = {total, risePercent: rise, fallPercent: fall, newTotal};

  const distractors = usable(ctx, [
    mk(other, 'ANSWERED_THE_OTHER_COMPONENT', `${total} − ${correct}`, 4),
    mk(total / 2, 'SOLVED_ONE_CONDITION_ONLY', `${total} ÷ 2`),
    mk(newTotal - total, 'STOPPED_AT_INTERMEDIATE_TOTAL', `${newTotal} − ${total}`),
    mk(ifAllFell, 'APPLIED_ONE_CHANGE_TO_THE_WHOLE', `${total} − ${total} × ${fall} ÷ 100`, 0),
    mk(total + total * rise / 100, 'APPLIED_ONE_CHANGE_TO_THE_WHOLE', `${total} + ${total} × ${rise} ÷ 100`),
    mk(gap, 'STOPPED_AT_INTERMEDIATE_TOTAL', `${newTotal} − ${num(ifAllFell)}`, 1),
    mk(first + first * rise / 100, 'USED_NEW_TOTAL', `${first} + ${first} × ${rise} ÷ 100`, 4),
    mk(second - second * fall / 100, 'USED_NEW_TOTAL', `${second} − ${second} × ${fall} ÷ 100`, 4),
    mk(total * rise / (rise + fall), 'SOLVED_ONE_CONDITION_ONLY', `${total} × ${rise} ÷ (${rise} + ${fall})`)
  ]);

  const stem = composeSentences(ctx, `في مؤسسة قسمان، مجموع أفرادهما ${u(total, 'person')}. ارتفع عدد أفراد القسم الأول بنسبة ${rise}% وانخفض عدد أفراد القسم الثاني بنسبة ${fall}%، فأصبح المجموع ${u(newTotal, 'person')}. كم كان عدد أفراد القسم ${ordinal}؟`);
  return buildBase(ctx, {
    templateId: 'PCT_H_TWO_GROUP_CHANGE',
    subskill: askSecond ? 'مجموعتان تتغيران في اتجاهين متضادين، مع طلب القسم المنخفض'
      : 'مجموعتان تتغيران في اتجاهين متضادين',
    difficulty: 'hard',
    question: stem.text,
    stemStructure: stem.structure, informationOrder: stem.order,
    correct, distractors, format: unitFormat('person'),
    steps: [
      `لو انخفض العدد كله بنسبة ${fall}% لأصبح المجموع = ${total} − ${total} × ${fall} ÷ 100 = ${num(ifAllFell)}.`,
      `المجموع الفعلي أكبر من ذلك بمقدار ${newTotal} − ${num(ifAllFell)} = ${num(gap)}.`,
      `كل فرد في القسم الأول بدل الثاني يزيد المجموع بمقدار (${rise} + ${fall}) ÷ 100 = ${num(perUnit)}.`,
      `عدد أفراد القسم الأول = ${num(gap)} ÷ ${num(perUnit)} = ${first}.`,
      askSecond
        ? `والمطلوب هو القسم الثاني = ${total} − ${first} = ${correct}.`
        : `وللتأكد: القسم الثاني = ${total} − ${first} = ${second}.`
    ],
    howToStart: 'افترض أن التغير كله كان في اتجاه واحد، ثم احسب الفارق الذي يحدثه نقل فرد من قسم إلى آخر.',
    remember: 'عند تغيرين متضادين لا يكفي أي قسم وحده؛ الشرطان يحددان التقسيم معًا.',
    fastMethod: 'الفارق عن الحالة الافتراضية مقسومًا على مجموع النسبتين يعطي حجم القسم المرتفع.',
    estimatedSteps: 4, conceptTags: ['percentage', 'two-group', 'weighted-mean'], parameters: params,
    oracle: {
      kind: 'constraint', answerKind: 'number',
      // X is whichever section is asked for, so the equation is written from
      // that section's side. Writing it always from the first section's and
      // subtracting afterwards would make the two targets one relation, which is
      // exactly the collapse this release is fixing.
      constraints: [askSecond
        ? eq(add(mul(sub(total, X), 100 + rise), mul(X, 100 - fall)), mul(newTotal, 100))
        : eq(add(mul(X, 100 + rise), mul(sub(total, X), 100 - fall)), mul(newTotal, 100))]
    },
    askedUnknown: askSecond ? 'secondGroupSize' : 'firstGroupSize', stageCount: askSecond ? 4 : 3,
    answerBounds: {between: [0, total]},
    pedagogy: {
      targetSkill: 'TWO_GROUP_OPPOSITE_CHANGE', targetMisconception: 'APPLIED_ONE_CHANGE_TO_THE_WHOLE',
      wrongMethodValue: ifAllFell
    },
    complexityFactors: {reasoningTransformations: 4, conceptCount: 3, equationSolving: 1, conditionCount: 2, stageCount: 3, arithmeticBurden: 5},
    textParams: {essentialParams: ['total', 'risePercent', 'fallPercent', 'newTotal']}
  });
}
