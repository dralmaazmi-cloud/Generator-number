// Direct proportion — the Section 26 pilot family.
//
// This family is the first to run on the unified contract:
//   solve(params, askedUnknown) -> {answer, exactAnswer, steps, misconceptions, pathComplexity}
// The generator states the problem; `solve` derives the answer and the steps
// from the parameters, and the oracle independently searches for the values that
// satisfy the stated proportion. Nothing is announced without being derived.

import {Fraction} from '../qa/fraction.js';
import {PERSONS} from '../compose/entities.js';
import {mk, usable, u, num, unitFormat, buildBase, eq, X, add, sub, mul, div, factorLine, resample, unitWord, unitWordKam, theSingle, defPlural, bandPool, composeSentences, askOf, scaleBothLine, distinctValues} from './_shared.js';

export function generateDirectProportion({difficulty, rng, seed, engineVersion, telemetry, pinTemplate = null, pinTargets = null}) {
  const ctx = {
    difficulty, rng, seed, engineVersion, pinTargets,
    family: 'direct_proportion', family_ar: 'التناسب المباشر', category: 'التناسب المباشر البسيط'
  };
  // RC2.3-1. The catalogue, not a set of per-band pools: which of these is
  // eligible for the requested band is decided by the structural adjudication in
  // src/qa/structure.js, so a template cannot sit in a band nobody adjudicated.
  return bandPool(rng, 'direct_proportion', difficulty, [
    ['PROP_E_ITEMS', unitItems],
    ['PROP_E_COST', unitCost],
    // RC2.9.5 §4. The unit value asked for in its own right, and two different
    // items totalled.
    ['PROP_E_UNIT_VALUE', unitValueOnly],
    ['PROP_E_TOTAL_TWO_ITEMS', totalOfTwoItems],
    ['PROP_M_FRAC_UNIT', fractionalUnit],
    ['PROP_M_RECIPE', recipeScale],
    ['PROP_M_MAP', mapScale],
    ['PROP_H_COMPOUND', compoundScale],
    ['PROP_H_COST_PLUS', multiUnitCost],
    ['PROP_H_TWO_ITEM_SYSTEM', twoItemPrices],
    ['PROP_H_REPLACE', mixtureReplacement],
    ['PROP_H_CAPITAL_TIME', investmentTimeShare],
    // RC2.7-3. Comparison of alternatives.
    ['PROP_H_BREAK_EVEN', breakEvenQuantity],
    // RC2.9.4-B3. Two MEDIUM constructions.
    ['PROP_M_UNIT_PRICE_COMPARE', unitPriceGap],
    ['PROP_M_SCALE_ACROSS_HOURS', scaleAcrossHours]
  ], pinTemplate)(ctx);
}

// ---------------------------------------------------------------------------
// Section 25 / 26: the unified solver contract for this family.
// ---------------------------------------------------------------------------

/**
 * @param {object} params    role-named parameters
 * @param {string} askedUnknown  which quantity the item asks for
 * @returns {{answer:number, exactAnswer:Fraction, steps:object[], misconceptions:object[], pathComplexity:object}}
 */
export function solve(params, askedUnknown = 'scaledOutput') {
  const F = Fraction.from;
  switch (askedUnknown) {
    case 'scaledOutput': {
      const {baseCount, baseAmount, targetCount} = params;
      const unit = F(baseAmount).div(baseCount);
      const answer = unit.mul(targetCount);
      return {
        answer: answer.toNumber(),
        exactAnswer: answer,
        steps: [
          {operation: 'divide', inputs: [baseAmount, baseCount], result: unit.toNumber(), role: 'unitValue'},
          {operation: 'multiply', inputs: [unit.toNumber(), targetCount], result: answer.toNumber(), role: 'scale'}
        ],
        misconceptions: ['STOPPED_AT_UNIT_RATE', 'REVERSED_DIRECT_PROPORTION', 'MULTIPLIED_COUNTS_INSTEAD_OF_RATE'],
        pathComplexity: {reasoningTransformations: 2, conceptCount: 1, stageCount: 2, arithmeticBurden: 2}
      };
    }
    case 'requiredInput': {
      const {baseCount, baseAmount, targetAmount} = params;
      const unit = F(baseAmount).div(baseCount);
      const answer = F(targetAmount).div(unit);
      return {
        answer: answer.toNumber(),
        exactAnswer: answer,
        steps: [
          {operation: 'divide', inputs: [baseAmount, baseCount], result: unit.toNumber(), role: 'unitValue'},
          {operation: 'divide', inputs: [targetAmount, unit.toNumber()], result: answer.toNumber(), role: 'inverseScale'}
        ],
        misconceptions: ['STOPPED_AT_UNIT_RATE', 'REVERSED_DIRECT_PROPORTION'],
        pathComplexity: {reasoningTransformations: 2, conceptCount: 1, reverseReasoning: 1, stageCount: 2, arithmeticBurden: 2}
      };
    }
    case 'scaledOutputPlusReserve': {
      const {baseCount, baseAmount, targetCount, reservePct} = params;
      const unit = F(baseAmount).div(baseCount);
      const scaled = unit.mul(targetCount);
      const factor = F(1).add(F(reservePct).div(100));
      const answer = scaled.mul(factor);
      return {
        answer: answer.toNumber(),
        exactAnswer: answer,
        steps: [
          {operation: 'divide', inputs: [baseAmount, baseCount], result: unit.toNumber(), role: 'unitValue'},
          {operation: 'multiply', inputs: [unit.toNumber(), targetCount], result: scaled.toNumber(), role: 'scale'},
          {operation: 'multiply', inputs: [scaled.toNumber(), factor.toNumber()], result: answer.toNumber(), role: 'reserve'}
        ],
        misconceptions: ['APPLIED_PERCENT_TO_WRONG_TOTAL', 'STOPPED_AFTER_FIRST_STAGE'],
        pathComplexity: {reasoningTransformations: 3, conceptCount: 2, stageCount: 3, arithmeticBurden: 3}
      };
    }
    case 'scaledOutputPlusFee': {
      const {baseCount, baseAmount, targetCount, flatFee} = params;
      const unit = F(baseAmount).div(baseCount);
      const scaled = unit.mul(targetCount);
      const answer = scaled.add(flatFee);
      return {
        answer: answer.toNumber(),
        exactAnswer: answer,
        steps: [
          {operation: 'divide', inputs: [baseAmount, baseCount], result: unit.toNumber(), role: 'unitValue'},
          {operation: 'multiply', inputs: [unit.toNumber(), targetCount], result: scaled.toNumber(), role: 'scale'},
          {operation: 'add', inputs: [scaled.toNumber(), flatFee], result: answer.toNumber(), role: 'flatFee'}
        ],
        misconceptions: ['FLAT_FEE_PER_UNIT', 'DROPPED_FLAT_FEE'],
        pathComplexity: {reasoningTransformations: 3, conceptCount: 2, stageCount: 3, conditionCount: 1, arithmeticBurden: 3}
      };
    }
    default:
      throw new Error(`direct_proportion: unsupported askedUnknown ${askedUnknown}`);
  }
}

/**
 * Section 3: the oracle never calls `solve`. It restates the proportion as a
 * constraint — `x × baseCount = baseAmount × targetCount` — and searches the
 * candidate values for the ones that satisfy it. A division written the wrong
 * way round in `solve` cannot survive a cross-multiplication check.
 */
function proportionOracle({baseCount, baseAmount, targetCount}) {
  return {
    kind: 'constraint',
    answerKind: 'number',
    constraints: [eq(mul(X, baseCount), mul(baseAmount, targetCount))]
  };
}

function inverseProportionOracle({baseCount, baseAmount, targetAmount}) {
  return {
    kind: 'constraint',
    answerKind: 'number',
    constraints: [eq(mul(X, baseAmount), mul(baseCount, targetAmount))]
  };
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

function unitItems(ctx) {
  const {rng} = ctx;
  const boxes = rng.pick([3, 4, 5, 6]);
  const per = rng.pick([6, 8, 10, 12].filter(v => v !== boxes));
  const total = boxes * per;
  const forward = askOf(ctx, rng, ['scaledOutput', 'requiredInput']) === 'scaledOutput';
  const targetCount = rng.pick([5, 7, 8, 9, 10, 12].filter(v => v !== boxes));

  if (forward) {
    const params = {baseCount: boxes, baseAmount: total, targetCount};
    const s = solve(params, 'scaledOutput');
    const correct = s.answer;
    const distractors = usable(ctx, [
      mk(total, 'USED_GIVEN_VALUE_AS_ANSWER', `العدد المعطى ${total}`),
      mk(per, 'STOPPED_AT_UNIT_RATE', `${total} ÷ ${boxes}`),
      mk(targetCount * boxes, 'MULTIPLIED_COUNTS_INSTEAD_OF_RATE', `${targetCount} × ${boxes}`),
      mk(total + (targetCount - boxes), 'ADDED_INSTEAD_OF_SCALING', `${total} + (${targetCount} − ${boxes})`),
      mk(total * boxes / targetCount, 'REVERSED_DIRECT_PROPORTION', `${total} × ${boxes} ÷ ${targetCount}`),
      mk(per * (targetCount - 1), 'OFF_BY_ONE_STEP', `${per} × (${targetCount} − 1)`),
      mk(per * (targetCount + 1), 'OFF_BY_ONE_STEP', `${per} × (${targetCount} + 1)`),
      mk(total + per * targetCount, 'USED_ORIGINAL_TOTAL', `${total} + ${per} × ${targetCount}`),
      mk(per * (boxes + targetCount), 'RATE_APPLIED_TO_WRONG_COUNT', `${per} × (${boxes} + ${targetCount})`)
    ]);
    const stem = composeSentences(ctx, `يحتوي كل ${unitWord('box')} على العدد نفسه من القطع. إذا كانت ${u(boxes, 'box')} تحتوي على ${u(total, 'piece')}، فكم قطعة يحتوي عليها ${u(targetCount, 'box')}؟`);
    return buildBase(ctx, {
      templateId: 'PROP_E_ITEMS',
      subskill: 'معدل ثابت بين عدد وحدات وكمية',
      difficulty: 'easy',
      question: stem.text,
      stemStructure: stem.structure, informationOrder: stem.order,
      correct,
      distractors,
      format: unitFormat('piece'),
      steps: [
        `عدد القطع في ${theSingle('box')} = ${total} ÷ ${boxes} = ${per}.`,
        `عدد القطع في ${u(targetCount, 'box')} = ${targetCount} × ${per} = ${correct}.`
      ],
      howToStart: 'احسب قيمة الوحدة الواحدة أولًا.',
      remember: 'في التناسب المباشر، قيمة الوحدة هي أسرع طريق للحل.',
      // RC2-019: a reusable rule first, then this instance.
      fastMethod: `احسب نصيب الوحدة الواحدة ثم اضربه في العدد المطلوب — هنا ${total} ÷ ${boxes} ثم × ${targetCount}.`,
      estimatedSteps: 2,
      conceptTags: ['direct-proportion', 'unit-value'],
      parameters: params,
      oracle: proportionOracle(params),
      askedUnknown: 'scaledOutput',
      stageCount: 2,
      pedagogy: {
        targetSkill: 'UNIT_VALUE_THEN_SCALE',
        targetMisconception: 'MULTIPLIED_COUNTS_INSTEAD_OF_RATE',
        wrongMethodValue: targetCount * boxes,
        degenerateWhen: [{when: targetCount === boxes, note: 'target equals base count: nothing to scale'}]
      },
      complexityFactors: s.pathComplexity,
      textParams: {derivedFromParams: [], essentialParams: ['baseCount', 'baseAmount', 'targetCount']}
    });
  }

  // Section 17-A: same template, reversed unknown.
  const targetAmount = per * targetCount;
  const params = {baseCount: boxes, baseAmount: total, targetAmount};
  const s = solve(params, 'requiredInput');
  const correct = s.answer;
  const distractors = usable(ctx, [
    mk(boxes, 'USED_GIVEN_VALUE_AS_ANSWER', `العدد المعطى ${boxes}`),
    mk(per, 'STOPPED_AT_UNIT_RATE', `${total} ÷ ${boxes}`),
    mk(targetAmount / boxes, 'REVERSED_DIRECT_PROPORTION', `${targetAmount} ÷ ${boxes}`),
    mk(boxes + (targetAmount - total), 'ADDED_INSTEAD_OF_SCALING', `${boxes} + (${targetAmount} − ${total})`),
    mk(targetAmount * boxes / total * 2, 'MULTIPLIED_INSTEAD_OF_DIVIDED', `(${targetAmount} × ${boxes} ÷ ${total}) × 2`),
    // RC2-012: the key-plus-one is replaced by slips on the given amounts.
    mk(targetAmount / total, 'STOPPED_AFTER_FIRST_STAGE', `${targetAmount} ÷ ${total}`),
    mk(targetAmount / per / 2, 'HALF_DISTANCE_AS_ANSWER', `${targetAmount} ÷ ${per} ÷ 2`),
    mk((targetAmount - total) / per, 'USED_TOTAL_INSTEAD_OF_REMAINDER', `(${targetAmount} − ${total}) ÷ ${per}`)
  ]);
  const stem = composeSentences(ctx, `يحتوي كل ${unitWord('box')} على العدد نفسه من القطع. إذا كانت ${u(boxes, 'box')} تحتوي على ${u(total, 'piece')}، فكم ${unitWordKam('box')} نحتاج للحصول على ${u(targetAmount, 'piece')}؟`);
  return buildBase(ctx, {
    templateId: 'PROP_E_ITEMS',
    subskill: 'معدل ثابت بين عدد وحدات وكمية — إيجاد عدد الوحدات',
    difficulty: 'easy',
    question: stem.text,
    stemStructure: stem.structure, informationOrder: stem.order,
    correct,
    distractors,
    format: unitFormat('box'),
    steps: [
      `عدد القطع في ${theSingle('box')} = ${total} ÷ ${boxes} = ${per}.`,
      `عدد ${defPlural('box')} المطلوبة = ${targetAmount} ÷ ${per} = ${correct}.`
    ],
    howToStart: `احسب محتوى ${theSingle('box')} ثم اقسم الكمية المطلوبة عليه.`,
    remember: 'عند ثبات المعدل: عدد الوحدات = الكمية المطلوبة ÷ قيمة الوحدة.',
    // RC2-019: a reusable rule first, then this instance.
    fastMethod: `اقسم الكمية المطلوبة على نصيب الوحدة الواحدة — هنا ${targetAmount} ÷ (${total} ÷ ${boxes}).`,
    estimatedSteps: 2,
    conceptTags: ['direct-proportion', 'unit-value', 'reverse'],
    parameters: params,
    oracle: inverseProportionOracle(params),
    askedUnknown: 'requiredInput',
    stageCount: 2,
    pedagogy: {
      targetSkill: 'UNIT_VALUE_THEN_SCALE',
      targetMisconception: 'REVERSED_DIRECT_PROPORTION',
      wrongMethodValue: targetAmount / boxes,
      degenerateWhen: [{when: targetAmount === total, note: 'target equals base amount'}]
    },
    complexityFactors: s.pathComplexity,
    textParams: {derivedFromParams: [], essentialParams: ['baseCount', 'baseAmount', 'targetAmount']}
  });
}

function unitCost(ctx) {
  const {rng} = ctx;
  const n = rng.pick([3, 4, 5, 6]);
  const unitPrice = rng.pick([5, 6, 7, 8, 10, 12].filter(v => v !== n));
  const total = n * unitPrice;
  const targetCount = rng.pick([7, 8, 9, 10, 12].filter(v => v !== n));
  // Section 17-A: the same rate, asked the other way round.
  if (askOf(ctx, rng, ['scaledOutput', 'requiredInput']) === 'requiredInput') {
    return unitCostReverse(ctx, n, unitPrice, total, targetCount);
  }
  const params = {baseCount: n, baseAmount: total, targetCount};
  const s = solve(params, 'scaledOutput');
  const correct = s.answer;
  const distractors = usable(ctx, [
    mk(total, 'USED_GIVEN_VALUE_AS_ANSWER', `السعر المعطى ${total}`),
    mk(unitPrice, 'STOPPED_AT_UNIT_RATE', `${total} ÷ ${n}`),
    mk(targetCount * n, 'MULTIPLIED_COUNTS_INSTEAD_OF_RATE', `${targetCount} × ${n}`),
    mk(total + (targetCount - n), 'ADDED_INSTEAD_OF_SCALING', `${total} + (${targetCount} − ${n})`),
    mk(total * n / targetCount, 'REVERSED_DIRECT_PROPORTION', `${total} × ${n} ÷ ${targetCount}`),
    mk(unitPrice * (targetCount - 1), 'OFF_BY_ONE_STEP', `${unitPrice} × (${targetCount} − 1)`),
    mk(unitPrice * (targetCount + 1), 'OFF_BY_ONE_STEP', `${unitPrice} × (${targetCount} + 1)`),
    mk(total + unitPrice, 'OFF_BY_ONE_STEP', `${total} + ${unitPrice}`),
    mk(total + unitPrice * targetCount, 'USED_ORIGINAL_TOTAL', `${total} + ${unitPrice} × ${targetCount}`),
    mk(unitPrice * (n + targetCount), 'RATE_APPLIED_TO_WRONG_COUNT', `${unitPrice} × (${n} + ${targetCount})`),
    mk(unitPrice * targetCount * 2, 'APPLIED_STEP_TWICE', `${unitPrice} × ${targetCount} × 2`),
    mk(total * targetCount / 2, 'RATE_APPLIED_TO_WRONG_COUNT', `${total} × ${targetCount} ÷ 2`)
  ]);
  const stem = composeSentences(ctx, `تباع الوحدات بالسعر نفسه. إذا كانت ${u(n, 'unit')} تكلف ${u(total, 'dirham')}، فكم تكلف ${u(targetCount, 'unit')}؟`);
  return buildBase(ctx, {
    templateId: 'PROP_E_COST',
    subskill: 'تكلفة عدد أكبر من وحدات بالسعر نفسه',
    difficulty: 'easy',
    question: stem.text,
    stemStructure: stem.structure, informationOrder: stem.order,
    correct,
    distractors,
    format: unitFormat('dirham'),
    steps: [
      `سعر الوحدة الواحدة بالدرهم = ${total} ÷ ${n} = ${unitPrice}.`,
      `سعر ${u(targetCount, 'unit')} = ${targetCount} × ${unitPrice} = ${correct}.`
    ],
    howToStart: 'اعرف سعر الوحدة ثم اضرب في العدد المطلوب.',
    remember: 'التناسب المباشر يعني أن السعر يتغير بنفس نسبة العدد.',
    fastMethod: 'السعر لكل وحدة × عدد الوحدات.',
    estimatedSteps: 2,
    conceptTags: ['direct-proportion', 'unit-value'],
    parameters: params,
    oracle: proportionOracle(params),
    askedUnknown: 'scaledOutput',
    stageCount: 2,
    pedagogy: {
      targetSkill: 'UNIT_VALUE_THEN_SCALE',
      targetMisconception: 'MULTIPLIED_COUNTS_INSTEAD_OF_RATE',
      wrongMethodValue: targetCount * n,
      degenerateWhen: [{when: targetCount === n, note: 'target equals base count'}]
    },
    complexityFactors: s.pathComplexity,
    textParams: {essentialParams: ['baseCount', 'baseAmount', 'targetCount']}
  });
}


/** How many units a given budget buys — the reverse of PROP_E_COST. */
function unitCostReverse(ctx, n, unitPrice, total, targetCount) {
  const budget = unitPrice * targetCount;
  const params = {baseCount: n, baseAmount: total, targetAmount: budget};
  const s = solve(params, 'requiredInput');
  const correct = s.answer;
  const distractors = usable(ctx, [
    mk(n, 'USED_GIVEN_VALUE_AS_ANSWER', `العدد المعطى ${n}`),
    mk(unitPrice, 'STOPPED_AT_UNIT_RATE', `${total} ÷ ${n}`),
    mk(budget / n, 'REVERSED_DIRECT_PROPORTION', `${budget} ÷ ${n}`),
    mk(budget / total * n * n, 'MULTIPLIED_INSTEAD_OF_DIVIDED', `${budget} ÷ ${total} × ${n} × ${n}`),
    mk(n + correct, 'USED_ORIGINAL_TOTAL', `${n} + ${correct}`),
    mk((budget - total) / unitPrice, 'USED_TOTAL_INSTEAD_OF_REMAINDER', `(${budget} − ${total}) ÷ ${unitPrice}`),
    mk(budget / unitPrice / 2, 'HALF_DISTANCE_AS_ANSWER', `${budget} ÷ ${unitPrice} ÷ 2`),
    mk(budget / total, 'STOPPED_AFTER_FIRST_STAGE', `${budget} ÷ ${total}`),
    mk(budget / unitPrice * 2, 'APPLIED_STEP_TWICE', `${budget} ÷ ${unitPrice} × 2`)
  ]);
  const stem = composeSentences(ctx, `تباع الوحدات بالسعر نفسه. إذا كانت ${u(n, 'unit')} تكلف ${u(total, 'dirham')}، فكم وحدة نشتري بمبلغ ${u(budget, 'dirham')}؟`);
  return buildBase(ctx, {
    templateId: 'PROP_E_COST',
    subskill: 'تكلفة وحدات بالسعر نفسه — إيجاد عدد الوحدات',
    difficulty: 'easy',
    question: stem.text,
    stemStructure: stem.structure, informationOrder: stem.order,
    correct,
    distractors,
    format: unitFormat('unit'),
    steps: [
      `سعر الوحدة الواحدة بالدرهم = ${total} ÷ ${n} = ${unitPrice}.`,
      `عدد الوحدات = ${budget} ÷ ${unitPrice} = ${correct}.`
    ],
    howToStart: 'احسب سعر الوحدة ثم اقسم المبلغ عليه.',
    remember: 'عند ثبات السعر: عدد الوحدات = المبلغ ÷ سعر الوحدة.',
    // RC2-019: a reusable rule first, then this instance.
    fastMethod: `اقسم المبلغ المتاح على سعر الوحدة الواحدة — هنا ${budget} ÷ (${total} ÷ ${n}).`,
    estimatedSteps: 2,
    conceptTags: ['direct-proportion', 'unit-value', 'reverse'],
    parameters: params,
    oracle: inverseProportionOracle(params),
    askedUnknown: 'requiredInput',
    stageCount: 2,
    pedagogy: {
      targetSkill: 'UNIT_VALUE_THEN_SCALE',
      targetMisconception: 'REVERSED_DIRECT_PROPORTION',
      wrongMethodValue: budget / n,
      degenerateWhen: [{when: budget === total, note: 'budget equals the stated price'}]
    },
    complexityFactors: s.pathComplexity,
    textParams: {essentialParams: ['baseCount', 'baseAmount', 'targetAmount']}
  });
}

function recipeScale(ctx) {
  const {rng} = ctx;
  const pieces = rng.pick([8, 10, 12, 15]);
  const cups = rng.pick([3, 4, 5, 6]);
  const factorChoices = [2, 3, 4].filter(f => Number.isInteger(pieces * f) && cups * f <= 40);
  const factor = rng.pick(factorChoices);
  const targetPieces = pieces * factor;
  if (rng.bool(0.4)) return recipeScaleReverse(ctx, pieces, cups, factor);
  const params = {baseCount: pieces, baseAmount: cups, targetCount: targetPieces};
  const s = solve(params, 'scaledOutput');
  const correct = s.answer;
  const distractors = usable(ctx, [
    mk(cups, 'USED_GIVEN_VALUE_AS_ANSWER', `الكمية الأصلية ${cups}`),
    mk(factor, 'STOPPED_AFTER_FIRST_STAGE', `${targetPieces} ÷ ${pieces}`),
    mk(cups + factor, 'ADDED_INSTEAD_OF_SCALING', `${cups} + ${factor}`),
    mk(cups + (targetPieces - pieces), 'ADDED_INSTEAD_OF_SCALING', `${cups} + (${targetPieces} − ${pieces})`),
    mk(cups * factor * factor, 'APPLIED_STEP_TWICE', `${cups} × ${factor} × ${factor}`),
    mk(targetPieces / cups, 'REVERSED_DIRECT_PROPORTION', `${targetPieces} ÷ ${cups}`),
    mk(cups * (factor - 1), 'OFF_BY_ONE_STEP', `${cups} × (${factor} − 1)`),
    mk(cups + cups * factor, 'USED_ORIGINAL_TOTAL', `${cups} + ${cups} × ${factor}`),
    mk(cups * (factor + 1), 'OFF_BY_ONE_STEP', `${cups} × (${factor} + 1)`)
  ]);
  const stem = composeSentences(ctx, `تحتاج وصفة إلى ${u(cups, 'cup')} من الدقيق لصنع ${u(pieces, 'piece')}. كم كوبًا تحتاج لصنع ${u(targetPieces, 'piece')} بالمعدل نفسه؟`);
  return buildBase(ctx, {
    templateId: 'PROP_M_RECIPE',
    subskill: 'تكبير وصفة بعامل ثابت',
    difficulty: 'easy',
    question: stem.text,
    stemStructure: stem.structure, informationOrder: stem.order,
    correct,
    distractors,
    format: unitFormat('cup'),
    steps: [
      `عامل التكبير = ${targetPieces} ÷ ${pieces} = ${factor}.`,
      `عدد الأكواب المطلوبة = ${cups} × ${factor} = ${correct}.`
    ],
    howToStart: 'احسب كم مرة كبر عدد القطع.',
    remember: 'في التناسب المباشر، الكمية المقابلة تتغير بعامل التكبير نفسه.',
    fastMethod: 'اضرب الكمية الأصلية في عامل التكبير.',
    estimatedSteps: 2,
    conceptTags: ['direct-proportion', 'scaling'],
    parameters: params,
    oracle: proportionOracle(params),
    askedUnknown: 'scaledOutput',
    stageCount: 2,
    pedagogy: {
      targetSkill: 'SCALE_FACTOR',
      targetMisconception: 'ADDED_INSTEAD_OF_SCALING',
      wrongMethodValue: cups + (targetPieces - pieces),
      degenerateWhen: [{when: factor === 1, note: 'scale factor of 1 measures nothing'}]
    },
    complexityFactors: {...s.pathComplexity, conceptCount: 2},
    textParams: {essentialParams: ['baseCount', 'baseAmount', 'targetCount']}
  });
}


/** How many pieces a given amount of flour makes — the reverse of PROP_M_RECIPE. */
function recipeScaleReverse(ctx, pieces, cups, factor) {
  const availableCups = cups * factor;
  const params = {baseCount: cups, baseAmount: pieces, targetCount: availableCups};
  const s = solve(params, 'scaledOutput');
  const correct = s.answer;
  const perCup = pieces / cups;
  const distractors = usable(ctx, [
    mk(pieces, 'USED_GIVEN_VALUE_AS_ANSWER', `العدد المعطى ${pieces}`),
    mk(factor, 'STOPPED_AFTER_FIRST_STAGE', `${availableCups} ÷ ${cups}`),
    mk(pieces + (availableCups - cups), 'ADDED_INSTEAD_OF_SCALING', `${pieces} + (${availableCups} − ${cups})`),
    mk(pieces * cups / availableCups, 'REVERSED_DIRECT_PROPORTION', `${pieces} × ${cups} ÷ ${availableCups}`),
    mk(pieces * factor * factor, 'APPLIED_STEP_TWICE', `${pieces} × ${factor} × ${factor}`),
    mk(pieces + pieces * factor, 'USED_ORIGINAL_TOTAL', `${pieces} + ${pieces} × ${factor}`),
    mk(pieces * (factor - 1), 'OFF_BY_ONE_STEP', `${pieces} × (${factor} − 1)`),
    mk(pieces * (factor + 1), 'OFF_BY_ONE_STEP', `${pieces} × (${factor} + 1)`),
    mk(availableCups * cups, 'MULTIPLIED_COUNTS_INSTEAD_OF_RATE', `${availableCups} × ${cups}`),
    mk(pieces * availableCups, 'RATE_APPLIED_TO_WRONG_COUNT', `${pieces} × ${availableCups}`),
    mk(pieces / factor, 'REVERSED_DIRECT_PROPORTION', `${pieces} ÷ ${factor}`)
  ]);
  const stem = composeSentences(ctx, `تحتاج وصفة إلى ${u(cups, 'cup')} من الدقيق لصنع ${u(pieces, 'piece')}. كم قطعة نصنع من ${u(availableCups, 'cup')} بالمعدل نفسه؟`);
  return buildBase(ctx, {
    templateId: 'PROP_M_RECIPE',
    subskill: 'وصفة بمعدل ثابت — إيجاد عدد القطع',
    difficulty: 'medium',
    question: stem.text,
    stemStructure: stem.structure, informationOrder: stem.order,
    correct,
    distractors,
    format: unitFormat('piece'),
    steps: [
      `عامل التكبير = ${availableCups} ÷ ${cups} = ${factor}.`,
      `عدد القطع = ${pieces} × ${factor} = ${correct}.`
    ],
    howToStart: 'احسب كم مرة كبرت كمية الدقيق.',
    remember: 'في التناسب المباشر، الكمية المقابلة تتغير بعامل التكبير نفسه.',
    // RC2.1-2. This was this instance's arithmetic, not a method. It only
    // surfaced once reclassification brought the template into the sweep that
    // checks RC2-019 — the defect predates RC2.1.
    fastMethod: `اقسم المتاح على ما تتطلبه الوصفة الواحدة ثم اضرب في ناتج الوصفة — هنا ${pieces} × (${availableCups} ÷ ${cups}).`,
    estimatedSteps: 2,
    conceptTags: ['direct-proportion', 'scaling', 'reverse'],
    parameters: params,
    oracle: proportionOracle(params),
    askedUnknown: 'scaledOutputFromResource',
    stageCount: 2,
    pedagogy: {
      targetSkill: 'SCALE_FACTOR',
      targetMisconception: 'ADDED_INSTEAD_OF_SCALING',
      wrongMethodValue: pieces + (availableCups - cups),
      degenerateWhen: [{when: factor === 1, note: 'scale factor of 1 measures nothing'}]
    },
    complexityFactors: {...s.pathComplexity, conceptCount: 2},
    textParams: {essentialParams: ['baseCount', 'baseAmount', 'targetCount']}
  });
}

function mapScale(ctx) {
  const {rng} = ctx;
  const cmBase = rng.pick([2, 4, 5]);
  const kmBase = rng.pick([10, 20, 40, 60]);
  const perCm = Fraction.from(kmBase).div(cmBase);
  if (!perCm.isInteger) return resample(ctx, mapScale);
  const a = rng.pick([4, 5, 6, 7, 8]);
  const b = rng.pick([3, 4, 5, 6]);
  const totalCm = a + b;
  const params = {baseCount: cmBase, baseAmount: kmBase, targetCount: totalCm, legA: a, legB: b};
  const s = solve({baseCount: cmBase, baseAmount: kmBase, targetCount: totalCm}, 'scaledOutput');
  const correct = s.answer;
  const per = perCm.toNumber();
  const distractors = usable(ctx, [
    mk(a * per, 'STOPPED_AFTER_FIRST_STAGE', `${a} × ${per}`),
    mk(b * per, 'USED_ONLY_LAST_STAGE', `${b} × ${per}`),
    mk(totalCm * kmBase, 'RATE_APPLIED_TO_WRONG_COUNT', `${totalCm} × ${kmBase}`),
    mk(totalCm / per, 'REVERSED_DIRECT_PROPORTION', `${totalCm} ÷ ${per}`),
    mk(per, 'STOPPED_AT_UNIT_RATE', `${kmBase} ÷ ${cmBase}`),
    mk(totalCm, 'USED_GIVEN_VALUE_AS_ANSWER', `${a} + ${b}`),
    mk((a + b) * per + per, 'OFF_BY_ONE_STEP', `${totalCm} × ${per} + ${per}`),
    mk((a + b) * per + a * per, 'USED_ORIGINAL_TOTAL', `${totalCm} × ${per} + ${a} × ${per}`),
    mk(a * b * per, 'MULTIPLIED_COUNTS_INSTEAD_OF_RATE', `${a} × ${b} × ${per}`)
  ]);
  const stem = composeSentences(ctx, `على خريطة، كل ${u(cmBase, 'cm', 'oblique')} ${cmBase === 1 ? 'يمثل' : cmBase === 2 ? 'يمثلان' : 'تمثل'} ${u(kmBase, 'km')}. طول مسار على الخريطة ${u(a, 'cm')}، ثم أُضيف إليه طريق جانبي طوله ${u(b, 'cm')} على الخريطة. ما المسافة الحقيقية للمسار كاملًا؟`);
  return buildBase(ctx, {
    templateId: 'PROP_M_MAP',
    subskill: 'مقياس خريطة مع جمع مرحلتين',
    difficulty: 'medium',
    // RC2-016: كل governs its noun (genitive), and the verb agrees with it:
    // كل سنتيمتر يمثل / كل سنتيمترين يمثلان / كل 5 سنتيمترات تمثل.
    question: stem.text,
    stemStructure: stem.structure, informationOrder: stem.order,
    correct,
    distractors,
    format: unitFormat('km'),
    steps: [
      `الطول الكلي على الخريطة بالسنتيمترات = ${a} + ${b} = ${totalCm}.`,
      `ما يمثله السنتيمتر الواحد بالكيلومترات = ${kmBase} ÷ ${cmBase} = ${per}.`,
      `المسافة الحقيقية بالكيلومترات = ${totalCm} × ${per} = ${correct}.`
    ],
    howToStart: 'اجمع أطوال الخريطة أولًا ثم طبّق المقياس.',
    remember: 'وحّد المسار المطلوب قبل التحويل من الخريطة إلى الواقع.',
    fastMethod: 'إجمالي السنتيمترات × كيلومترات لكل سنتيمتر.',
    estimatedSteps: 3,
    conceptTags: ['direct-proportion', 'scale'],
    parameters: params,
    oracle: {
      kind: 'constraint',
      answerKind: 'number',
      constraints: [eq(mul(X, cmBase), mul(kmBase, add(a, b)))]
    },
    askedUnknown: 'scaledOutput',
    stageCount: 3,
    pedagogy: {
      targetSkill: 'COMBINE_THEN_SCALE',
      targetMisconception: 'STOPPED_AFTER_FIRST_STAGE',
      wrongMethodValue: a * per,
      degenerateWhen: [{when: b === 0, note: 'second leg adds nothing'}]
    },
    complexityFactors: {reasoningTransformations: 3, conceptCount: 2, stageCount: 3, unitConversion: 1, arithmeticBurden: 3},
    textParams: {essentialParams: ['legA', 'legB']}
  });
}

function fractionalUnit(ctx) {
  const {rng} = ctx;
  const n = rng.pick([4, 5, 8, 10]);
  const totalKg = rng.pick([4, 5, 6, 8, 10]);
  const unitW = Fraction.from(totalKg).div(n);
  // Section 8-A: an intermediate that cannot be printed exactly must not be
  // produced at all, so the sampler is what rejects it — not the display.
  if (!unitW.isExactDecimal || unitW.decimalPlaces > 2) return resample(ctx, fractionalUnit);
  if (unitW.eq(Fraction.from(n))) return resample(ctx, fractionalUnit);
  // RC2.9.6 §3.1. The unit weight is deliberately fractional — that is the
  // whole point of the construction — but the ANSWER is a weight the learner
  // writes down, and «9.6 كيلوجرامًا» is a number to copy rather than a
  // quantity to read. Rather than draw a target and reject it afterwards, the
  // target is drawn FROM the counts that land on a whole answer, so the
  // construction keeps its full range instead of thinning out.
  const targets = [12, 15, 20, 24].filter(v => v !== n && unitW.mul(v).isInteger);
  if (!targets.length) return resample(ctx, fractionalUnit);
  const targetCount = rng.pick(targets);
  const answer = unitW.mul(targetCount);
  const params = {baseCount: n, baseAmount: totalKg, targetCount};
  const s = solve(params, 'scaledOutput');
  const correct = s.answer;
  const unitNum = unitW.toNumber();
  const distractors = usable(ctx, [
    mk(totalKg, 'USED_GIVEN_VALUE_AS_ANSWER', `الوزن المعطى ${totalKg}`),
    mk(unitNum, 'STOPPED_AT_UNIT_RATE', `${totalKg} ÷ ${n}`),
    mk(targetCount * n, 'MULTIPLIED_COUNTS_INSTEAD_OF_RATE', `${targetCount} × ${n}`),
    mk(totalKg * n / targetCount, 'REVERSED_DIRECT_PROPORTION', `${totalKg} × ${n} ÷ ${targetCount}`),
    mk(totalKg + (targetCount - n), 'ADDED_INSTEAD_OF_SCALING', `${totalKg} + (${targetCount} − ${n})`),
    mk(targetCount * totalKg, 'RATE_APPLIED_TO_WRONG_COUNT', `${targetCount} × ${totalKg}`),
    mk(unitNum * (targetCount - 1), 'OFF_BY_ONE_STEP', `${unitNum} × (${targetCount} − 1)`),
    mk(totalKg + unitNum * targetCount, 'USED_ORIGINAL_TOTAL', `${totalKg} + ${unitNum} × ${targetCount}`),
    mk(unitNum * (n + targetCount), 'RATE_APPLIED_TO_WRONG_COUNT', `${unitNum} × (${n} + ${targetCount})`),
    mk(unitNum * targetCount * 2, 'APPLIED_STEP_TWICE', `${unitNum} × ${targetCount} × 2`),
    mk(totalKg / targetCount, 'REVERSED_DIRECT_PROPORTION', `${totalKg} ÷ ${targetCount}`)
  ]);
  const stem = composeSentences(ctx, `تتساوى العناصر في الوزن. إذا كان وزن ${u(n, 'item')} هو ${u(totalKg, 'kg')}، فما وزن ${u(targetCount, 'item')} من النوع نفسه؟`);
  return buildBase(ctx, {
    templateId: 'PROP_M_FRAC_UNIT',
    subskill: 'قيمة وحدة كسرية ثم التوسع',
    difficulty: 'easy',
    question: stem.text,
    stemStructure: stem.structure, informationOrder: stem.order,
    correct,
    distractors,
    format: unitFormat('kg'),
    steps: [
      `وزن العنصر الواحد بالكيلوجرامات = ${totalKg} ÷ ${n} = ${num(unitNum)}.`,
      `وزن ${u(targetCount, 'item')} بالكيلوجرامات = ${targetCount} × ${num(unitNum)} = ${num(correct)}.`
    ],
    howToStart: 'احسب قيمة الوحدة ولو كانت كسرًا، ثم اضرب.',
    remember: 'قيمة الوحدة قد تكون كسرًا بسيطًا وما زال التناسب مباشرًا.',
    fastMethod: 'الوزن للوحدة × العدد المطلوب.',
    estimatedSteps: 2,
    conceptTags: ['direct-proportion', 'unit-value'],
    parameters: params,
    oracle: proportionOracle(params),
    askedUnknown: 'scaledOutput',
    stageCount: 2,
    pedagogy: {
      targetSkill: 'FRACTIONAL_UNIT_VALUE',
      targetMisconception: 'MULTIPLIED_COUNTS_INSTEAD_OF_RATE',
      wrongMethodValue: targetCount * n,
      degenerateWhen: [{when: targetCount === n, note: 'target equals base count'}]
    },
    complexityFactors: {...s.pathComplexity, arithmeticBurden: 3},
    textParams: {essentialParams: ['baseCount', 'baseAmount', 'targetCount']}
  });
}

function compoundScale(ctx) {
  const {rng} = ctx;
  const units = rng.pick([4, 5, 6]);
  const amount = rng.pick([20, 24, 30, 36, 40]);
  const targetUnits = rng.pick([8, 9, 10, 12].filter(v => v !== units));
  const reservePct = rng.pick([10, 20, 25]);
  const params = {baseCount: units, baseAmount: amount, targetCount: targetUnits, reservePct};
  const unitVal = Fraction.from(amount).div(units);
  if (!unitVal.isExactDecimal || unitVal.decimalPlaces > 2) return resample(ctx, compoundScale);
  const scaled = unitVal.mul(targetUnits);
  if (!scaled.isInteger) return resample(ctx, compoundScale);
  const s = solve(params, 'scaledOutputPlusReserve');
  if (!s.exactAnswer.isInteger) return resample(ctx, compoundScale);
  const correct = s.answer;
  const {factor, per100, text: factorText} = factorLine(reservePct, 'up', 'معامل الاحتياط');
  const distractors = usable(ctx, [
    mk(scaled.toNumber(), 'STOPPED_AFTER_FIRST_STAGE', `${unitVal.toDecimalString()} × ${targetUnits}`),
    mk(Fraction.from(amount).mul(factor).toNumber(), 'APPLIED_PERCENT_TO_WRONG_TOTAL', `${amount} × ${factor.toDecimalString()}`),
    mk(unitVal.toNumber(), 'STOPPED_AT_UNIT_RATE', `${amount} ÷ ${units}`),
    mk(scaled.toNumber() + reservePct, 'TREATED_PERCENT_AS_AMOUNT', `${scaled.toDecimalString()} + ${reservePct}`),
    mk(scaled.mul(factor).mul(factor).toNumber(), 'APPLIED_STEP_TWICE', `${scaled.toDecimalString()} × ${factor.toDecimalString()} × ${factor.toDecimalString()}`),
    mk(Fraction.from(amount).mul(targetUnits).div(units).mul(Fraction.from(1).sub(Fraction.from(reservePct).div(100))).toNumber(), 'APPLIED_OPERATION_IN_REVERSE', `${scaled.toDecimalString()} × (1 − ${reservePct} ÷ 100)`),
    mk(amount, 'USED_GIVEN_VALUE_AS_ANSWER', `الكمية المعطاة ${amount}`),
    mk(scaled.add(amount).mul(factor).toNumber(), 'USED_ORIGINAL_TOTAL', `(${scaled.toDecimalString()} + ${amount}) × ${factor.toDecimalString()}`),
    mk(Fraction.from(amount).div(units).mul(units + targetUnits).mul(factor).toNumber(), 'RATE_APPLIED_TO_WRONG_COUNT', `${unitVal.toDecimalString()} × (${units} + ${targetUnits}) × ${factor.toDecimalString()}`)
  ]);
  const stem = composeSentences(ctx, `تحتاج ${u(units, 'unit')} إلى ${u(amount, 'kg')} من مادة. نريد تجهيز ${u(targetUnits, 'unit')}، مع إضافة احتياط بنسبة ${reservePct}% فوق الكمية المحسوبة. كم كيلوجرامًا نحتاج؟`);
  return buildBase(ctx, {
    templateId: 'PROP_H_COMPOUND',
    subskill: 'تناسب مباشر ثم زيادة احتياط',
    difficulty: 'medium',
    question: stem.text,
    stemStructure: stem.structure, informationOrder: stem.order,
    correct,
    distractors,
    format: unitFormat('kg'),
    steps: [
      `المادة لكل وحدة بالكيلوجرامات = ${amount} ÷ ${units} = ${unitVal.toDecimalString()}.`,
      `الكمية قبل الاحتياط = ${unitVal.toDecimalString()} × ${targetUnits} = ${scaled.toDecimalString()}.`,
      factorText,
      `الكمية النهائية = ${scaled.toDecimalString()} × ${per100} ÷ 100 = ${correct}.`
    ],
    howToStart: 'حل التناسب أولًا ثم طبّق الزيادة الإضافية.',
    remember: 'لا تطبق الاحتياط على الكمية الأصلية إذا كان عدد الوحدات قد تغير.',
    fastMethod: 'قيمة الوحدة ← الكمية الجديدة ← معامل الاحتياط.',
    estimatedSteps: 4,
    conceptTags: ['direct-proportion', 'percentage'],
    parameters: params,
    oracle: {
      kind: 'constraint',
      answerKind: 'number',
      constraints: [eq(mul(X, mul(units, 100)), mul(amount, targetUnits, add(100, reservePct)))]
    },
    askedUnknown: 'scaledOutputPlusReserve',
    stageCount: 3,
    pedagogy: {
      targetSkill: 'SCALE_THEN_RESERVE',
      targetMisconception: 'APPLIED_PERCENT_TO_WRONG_TOTAL',
      wrongMethodValue: Fraction.from(amount).mul(factor).toNumber(),
      degenerateWhen: [{when: targetUnits === units, note: 'no scaling stage'}]
    },
    complexityFactors: s.pathComplexity,
    textParams: {essentialParams: ['baseCount', 'baseAmount', 'targetCount', 'reservePct']}
  });
}

function multiUnitCost(ctx) {
  const {rng} = ctx;
  const packN = rng.pick([3, 4, 5]);
  const packCost = rng.pick([18, 20, 24, 25, 30]);
  const targetCount = rng.pick([9, 10, 12, 15]);
  const flatFee = rng.pick([5, 10, 15]);
  const params = {baseCount: packN, baseAmount: packCost, targetCount, flatFee};
  const unitVal = Fraction.from(packCost).div(packN);
  if (!unitVal.isExactDecimal || unitVal.decimalPlaces > 2) return resample(ctx, multiUnitCost);
  const scaled = unitVal.mul(targetCount);
  if (!scaled.isExactDecimal || scaled.decimalPlaces > 2) return resample(ctx, multiUnitCost);
  const s = solve(params, 'scaledOutputPlusFee');
  if (!s.exactAnswer.isInteger) return resample(ctx, multiUnitCost);
  const correct = s.answer;
  const distractors = usable(ctx, [
    mk(scaled.toNumber(), 'DROPPED_FLAT_FEE', `${unitVal.toDecimalString()} × ${targetCount}`),
    mk(scaled.add(Fraction.from(flatFee).mul(targetCount)).toNumber(), 'FLAT_FEE_PER_UNIT', `${scaled.toDecimalString()} + ${flatFee} × ${targetCount}`),
    mk(packCost + flatFee, 'USED_GIVEN_VALUE_AS_ANSWER', `${packCost} + ${flatFee}`),
    mk(scaled.sub(flatFee).toNumber(), 'SUBTRACTED_INSTEAD_OF_ADDED', `${scaled.toDecimalString()} − ${flatFee}`),
    mk(unitVal.toNumber(), 'STOPPED_AT_UNIT_RATE', `${packCost} ÷ ${packN}`),
    mk(Fraction.from(packCost).mul(packN).div(targetCount).add(flatFee).toNumber(), 'REVERSED_DIRECT_PROPORTION', `${packCost} × ${packN} ÷ ${targetCount} + ${flatFee}`),
    mk(scaled.add(flatFee).add(flatFee).toNumber(), 'APPLIED_STEP_TWICE', `${scaled.toDecimalString()} + ${flatFee} + ${flatFee}`),
    mk(scaled.add(packCost).add(flatFee).toNumber(), 'USED_ORIGINAL_TOTAL', `${scaled.toDecimalString()} + ${packCost} + ${flatFee}`),
    mk(unitVal.mul(packN + targetCount).add(flatFee).toNumber(), 'RATE_APPLIED_TO_WRONG_COUNT', `${unitVal.toDecimalString()} × (${packN} + ${targetCount}) + ${flatFee}`)
  ]);
  const stem = composeSentences(ctx, `تكلف ${u(packN, 'unit')} مبلغ ${u(packCost, 'dirham')} بالسعر نفسه. إذا اشترينا ${u(targetCount, 'unit')} وأُضيف رسم ثابت قدره ${u(flatFee, 'dirham')} يُدفع مرة واحدة، فما التكلفة الكلية؟`);
  return buildBase(ctx, {
    templateId: 'PROP_H_COST_PLUS',
    subskill: 'تكلفة وحدات مع رسم ثابت',
    difficulty: 'hard',
    question: stem.text,
    stemStructure: stem.structure, informationOrder: stem.order,
    correct,
    distractors,
    format: unitFormat('dirham'),
    steps: [
      `سعر الوحدة الواحدة بالدرهم = ${packCost} ÷ ${packN} = ${unitVal.toDecimalString()}.`,
      `سعر ${u(targetCount, 'unit')} = ${unitVal.toDecimalString()} × ${targetCount} = ${scaled.toDecimalString()}.`,
      `نضيف الرسم الثابت مرة واحدة: ${scaled.toDecimalString()} + ${flatFee} = ${correct}.`
    ],
    howToStart: 'افصل التكلفة المتناسبة عن الرسم الثابت.',
    remember: 'الرسم الثابت لا يتكرر مع كل وحدة ما لم يذكر السؤال ذلك.',
    fastMethod: 'سعر الوحدات + الرسم الثابت.',
    estimatedSteps: 3,
    conceptTags: ['direct-proportion', 'fixed-fee'],
    parameters: params,
    oracle: {
      kind: 'constraint',
      answerKind: 'number',
      constraints: [eq(mul(sub(X, flatFee), packN), mul(packCost, targetCount))]
    },
    askedUnknown: 'scaledOutputPlusFee',
    stageCount: 3,
    pedagogy: {
      targetSkill: 'PROPORTIONAL_PLUS_FIXED',
      targetMisconception: 'FLAT_FEE_PER_UNIT',
      wrongMethodValue: scaled.add(Fraction.from(flatFee).mul(targetCount)).toNumber(),
      degenerateWhen: [{when: flatFee === 0, note: 'no fixed fee to separate'}]
    },
    complexityFactors: s.pathComplexity,
    textParams: {essentialParams: ['baseCount', 'baseAmount', 'targetCount', 'flatFee']}
  });
}

// ---------------------------------------------------------------------------
// RC2.4 — a genuinely hard structure for this family.
//
// Every other template here states a rate, or states a total from which one rate
// follows. This one states neither: two totals over two different mixes, and
// both unit prices unknown.
// ---------------------------------------------------------------------------

/**
 * SIMULTANEOUS_CONSTRAINTS + CROSS_PART_INTEGRATION.
 */
function twoItemPrices(ctx) {
  const {rng} = ctx;
  let found = null;
  for (let t = 0; t < 200; t++) {
    const boxPrice = rng.pick([6, 8, 9, 12, 15, 18, 20]);
    const piecePrice = rng.pick([3, 4, 5, 7, 10, 11]);
    if (boxPrice === piecePrice) continue;
    const a = rng.int(2, 5), b = rng.int(1, 4);
    const c = rng.int(1, 5), d = rng.int(2, 5);
    if (b === d) continue;
    const det = a * d - c * b;
    if (det <= 0) continue;
    const t1 = a * boxPrice + b * piecePrice;
    const t2 = c * boxPrice + d * piecePrice;
    if (t1 === t2) continue;
    found = {boxPrice, piecePrice, a, b, c, d, t1, t2, det};
    break;
  }
  if (!found) return resample(ctx, twoItemPrices);
  const {boxPrice, piecePrice, a, b, c, d, t1, t2, det} = found;
  const lhs = t1 * d - t2 * b;
  const correct = boxPrice;
  const params = {boxesA: a, piecesA: b, totalA: t1, boxesB: c, piecesB: d, totalB: t2};

  const distractors = usable(ctx, [
    mk(piecePrice, 'SWAPPED_THE_TWO_UNKNOWNS', `سعر القطعة ${piecePrice}`, 3),
    mk(t1 / (a + b), 'SOLVED_ONE_CONDITION_ONLY', `${t1} ÷ (${a} + ${b})`),
    mk(t2 / (c + d), 'SOLVED_ONE_CONDITION_ONLY', `${t2} ÷ (${c} + ${d})`),
    mk(t1 / a, 'SOLVED_ONE_CONDITION_ONLY', `${t1} ÷ ${a}`),
    mk(t2 / c, 'SOLVED_ONE_CONDITION_ONLY', `${t2} ÷ ${c}`),
    mk(Math.abs(t2 - t1), 'USED_DIFFERENCE_AS_ANSWER', `${Math.max(t1, t2)} − ${Math.min(t1, t2)}`),
    mk(boxPrice + piecePrice, 'ADDED_INSTEAD_OF_SCALING', `${boxPrice} + ${piecePrice}`),
    mk(det, 'STOPPED_AT_INTERMEDIATE_TOTAL', `${a} × ${d} − ${c} × ${b}`, 2),
    mk(lhs / a, 'MISREAD_THE_STEP', `${lhs} ÷ ${a}`),
    mk(t1 / d, 'SOLVED_ONE_CONDITION_ONLY', `${t1} ÷ ${d}`),
    mk(t2 / b, 'SOLVED_ONE_CONDITION_ONLY', `${t2} ÷ ${b}`),
    mk(lhs, 'STOPPED_AT_INTERMEDIATE_TOTAL', `${t1} × ${d} − ${t2} × ${b}`, 1)
  ]);

  const stem = composeSentences(ctx, // RC2.8-6. «ثمن» governs what follows in the genitive, so the counted nouns
  // take their oblique forms: «ثمن صندوقين وقطعتين», never «ثمن صندوقان وقطعتان».
  // The lexicon has had both forms all along; the stem was asking for the wrong one.
  `ثمن ${u(a, 'box', 'oblique')} و${u(b, 'piece', 'oblique')} معًا ${u(t1, 'dirham')}. وثمن ${u(c, 'box', 'oblique')} و${u(d, 'piece', 'oblique')} معًا ${u(t2, 'dirham')}. فما ثمن الصندوق الواحد؟`);
  return buildBase(ctx, {
    templateId: 'PROP_H_TWO_ITEM_SYSTEM',
    subskill: 'سعر الوحدة من خليطين مختلفين',
    difficulty: 'hard',
    question: stem.text,
    stemStructure: stem.structure, informationOrder: stem.order,
    correct, distractors, format: unitFormat('dirham'),
    steps: [
      // RC2.9.3-2. «والثانية في 1» is not an instruction anyone gives.
      scaleBothLine({d, b, out1: t1, out2: t2, what: 'عدد القطع فيهما'}),
      `بالطرح تختفي القطع ويبقى الفرق في الثمن = ${t1 * d} − ${t2 * b} = ${lhs}.`,
      `وعدد الصناديق المقابل = ${a} × ${d} − ${c} × ${b} = ${det}.`,
      `ثمن الصندوق الواحد = ${lhs} ÷ ${det} = ${correct}.`
    ],
    howToStart: 'وحّد عدد القطع في العبارتين ثم اطرحهما ليختفي سعر القطعة.',
    remember: 'مع مجهولين لا تكفي عبارة واحدة مهما بدت بسيطة.',
    fastMethod: 'اضرب كل عبارة في عدد القطع من العبارة الأخرى ثم اطرح.',
    estimatedSteps: 4, conceptTags: ['direct-proportion', 'elimination', 'two-unknowns'], parameters: params,
    oracle: {
      kind: 'constraint', answerKind: 'number',
      constraints: [eq(mul(X, det), sub(mul(t1, d), mul(t2, b)))]
    },
    askedUnknown: 'boxUnitPrice', stageCount: 3,
    pedagogy: {
      targetSkill: 'ELIMINATE_ONE_UNKNOWN', targetMisconception: 'SOLVED_ONE_CONDITION_ONLY',
      wrongMethodValue: t1 / (a + b)
    },
    complexityFactors: {reasoningTransformations: 4, conceptCount: 3, equationSolving: 1, conditionCount: 2, stageCount: 3, arithmeticBurden: 5},
    textParams: {essentialParams: ['boxesA', 'piecesA', 'totalA', 'boxesB', 'piecesB', 'totalB']}
  });
}

/**
 * RC2.6-1. SIMULTANEOUS_CONSTRAINTS + COMPOSED_INVERSION.
 *
 * Part of a mixture is drawn off and replaced by one of its own components. The
 * total never changes, so the before and after ratios are two conditions on one
 * unknown, and the unknown sits inside a proportion that has to be inverted. A
 * solver who applies the removed amount to the new quantity rather than the
 * original — the natural reading — lands on a number that is on the paper.
 */
function mixtureReplacement(ctx) {
  const {rng} = ctx;
  let found = null;
  for (let t = 0; t < 400; t++) {
    const total = rng.pick([40, 45, 48, 50, 54, 60, 63, 70, 72, 80, 90]);
    const p = rng.int(2, 7), q = rng.int(1, 6);
    if (p <= q) continue;
    // A ratio that is not in lowest terms reads as an unreduced fraction.
    const gcd = (x, y) => (y ? gcd(y, x % y) : x);
    if (gcd(p, q) !== 1) continue;
    if ((total * p) % (p + q) !== 0) continue;
    const before = (total * p) / (p + q);
    const p2 = rng.int(1, 6), q2 = rng.int(1, 7);
    if (p2 >= q2) continue;
    if (gcd(p2, q2) !== 1) continue;
    if ((total * p2) % (p2 + q2) !== 0) continue;
    const after = (total * p2) / (p2 + q2);
    if (after >= before) continue;
    // The drawn-off amount removes the first component in its own proportion.
    const removedNum = (before - after) * total;
    if (removedNum % before !== 0) continue;
    const removed = removedNum / before;
    if (removed <= 0 || removed >= total) continue;
    if (removed === before || removed === after) continue;
    found = {total, p, q, p2, q2, before, after, removed};
    break;
  }
  if (!found) return resample(ctx, mixtureReplacement);
  const {total, p, q, p2, q2, before, after, removed} = found;
  const correct = removed;
  const params = {totalLitres: total, beforeFirst: p, beforeSecond: q, afterFirst: p2, afterSecond: q2};

  const distractors = usable(ctx, [
    mk(before - after, 'REPLACED_FROM_THE_WRONG_BASE', `${before} − ${after}`),
    mk(before, 'STOPPED_AT_INTERMEDIATE_TOTAL', `${total} × ${p} ÷ ${p + q}`, 1),
    mk(after, 'STOPPED_AT_INTERMEDIATE_TOTAL', `${total} × ${p2} ÷ ${p2 + q2}`, 2),
    mk(total - removed, 'SWAPPED_THE_TWO_UNKNOWNS', `${total} − ${removed}`, 3),
    mk(total / 2, 'ASSUMED_EQUAL_SHARES', `${total} ÷ 2`),
    mk((before - after) * 2, 'APPLIED_STEP_TWICE', `(${before} − ${after}) × 2`),
    mk(total - before, 'STOPPED_AT_INTERMEDIATE_TOTAL', `${total} − ${before}`, 1),
    mk((before - after) * total / after, 'REPLACED_FROM_THE_WRONG_BASE',
      `(${before} − ${after}) × ${total} ÷ ${after}`),
    mk(total - after, 'STOPPED_AT_INTERMEDIATE_TOTAL', `${total} − ${after}`, 2),
    mk(removed + (before - after), 'APPLIED_STEP_TWICE', `${removed} + (${before} − ${after})`),
    mk(Math.round(total * (before - after) / total), 'REPLACED_FROM_THE_WRONG_BASE',
      `(${before} − ${after}) بدل نسبتها من الخليط`),
    mk(before + after, 'ADDED_INSTEAD_OF_SUBTRACTED', `${before} + ${after}`)
  ]);

  const stem = composeSentences(ctx, `في وعاء ${u(total, 'liter')} من خليط، نسبة المادة الأولى إلى الثانية ${p} : ${q}. سُحب مقدار من الخليط واستُبدل بالمادة الثانية وحدها، فصارت النسبة ${p2} : ${q2}. كم لترًا سُحب؟`);
  return buildBase(ctx, {
    templateId: 'PROP_H_REPLACE',
    scenario: 'mixture_drawn_off_and_replaced',
    direction: 'reverse',
    subskill: 'كمية مستبدلة من نسبة قبل وبعد',
    difficulty: 'hard',
    question: stem.text,
    stemStructure: stem.structure, informationOrder: stem.order,
    correct, distractors, format: unitFormat('liter'),
    steps: [
      `مجموع أجزاء النسبة الأولى = ${p} + ${q} = ${p + q}.`,
      `المادة الأولى قبل السحب = ${total} × ${p} ÷ ${p + q} = ${before}.`,
      `الحجم الكلي لم يتغير لأن المسحوب عُوّض بالكامل. ومجموع أجزاء النسبة الثانية = ${p2} + ${q2} = ${p2 + q2}.`,
      `المادة الأولى بعد السحب = ${total} × ${p2} ÷ ${p2 + q2} = ${after}.`,
      `نقص المادة الأولى = ${before} − ${after} = ${before - after}.`,
      `المسحوب خليط بالنسبة الأولى، ففيه من المادة الأولى ${before} من كل ${total}.`,
      `إذن المسحوب = ${before - after} × ${total} ÷ ${before} = ${correct}.`
    ],
    howToStart: 'احسب كمية المادة الأولى قبل السحب وبعده، ولاحظ أن الحجم الكلي لم يتغير.',
    remember: 'المسحوب خليط لا مادة نقية، فنقص المادة الأولى جزء من المسحوب لا كله.',
    fastMethod: 'نقص المادة الأولى مقسومًا على نسبتها في الخليط الأصلي.',
    estimatedSteps: 6, conceptTags: ['ratio', 'mixture', 'replacement'], parameters: params,
    oracle: {
      kind: 'constraint', answerKind: 'number',
      constraints: [eq(mul(X, before), mul(sub(before, after), total))]
    },
    askedUnknown: 'replacedVolume', stageCount: 3,
    pedagogy: {
      targetSkill: 'REPLACEMENT_FROM_TWO_RATIOS', targetMisconception: 'REPLACED_FROM_THE_WRONG_BASE',
      wrongMethodValue: before - after,
      degenerateWhen: [{when: before === total, note: 'the mixture is pure, so the ratio says nothing'}]
    },
    complexityFactors: {reasoningTransformations: 4, conceptCount: 3, equationSolving: 1, conditionCount: 2, stageCount: 3, arithmeticBurden: 6},
    textParams: {essentialParams: ['totalLitres', 'beforeFirst', 'beforeSecond', 'afterFirst', 'afterSecond']}
  });
}

/**
 * RC2.6-1. CROSS_PART_INTEGRATION + STRATEGY_SELECTION.
 *
 * A profit shared between two partners who put in different amounts for
 * different lengths of time. Neither dimension decides the split on its own —
 * the shares are proportional to the PRODUCT — and the stem never says so. A
 * solver who splits by money alone, or by months alone, has a number on the
 * paper both times.
 */
function investmentTimeShare(ctx) {
  const {rng} = ctx;
  let found = null;
  for (let t = 0; t < 400; t++) {
    const capA = rng.pick([2000, 2400, 3000, 3600, 4000, 4500, 5000, 6000]);
    const capB = rng.pick([2000, 2400, 3000, 3600, 4000, 4500, 5000, 6000]);
    if (capA === capB) continue;
    const monA = rng.int(3, 12), monB = rng.int(3, 12);
    if (monA === monB) continue;
    // Splitting by money alone, or by time alone, must give a different answer
    // or the item stops measuring the product.
    if (capA * monA === capB * monB) continue;
    const wA = capA * monA, wB = capB * monB;
    const g = (x, y) => (y ? g(y, x % y) : x);
    const d = g(wA, wB);
    const rA = wA / d, rB = wB / d;
    if (rA + rB > 40) continue;
    const unit = rng.pick([100, 150, 200, 250, 300]);
    const profit = (rA + rB) * unit;
    if (profit > 40000) continue;
    const shareA = rA * unit;
    if (shareA === profit - shareA) continue;
    found = {capA, capB, monA, monB, rA, rB, profit, shareA};
    break;
  }
  if (!found) return resample(ctx, investmentTimeShare);
  const {capA, capB, monA, monB, rA, rB, profit, shareA} = found;
  // RC2.7-R3. Which partner's share is asked for is a different core
  // construction: the equation that pins the answer is written from the other
  // partner's weight, and the reader who computed the first share has not
  // answered this one.
  const askSecond = rng.bool(0.45);
  const correct = askSecond ? profit - shareA : shareA;
  const params = {capitalA: capA, monthsA: monA, capitalB: capB, monthsB: monB, totalProfit: profit};
  const byMoney = Math.round(profit * capA / (capA + capB));
  const byTime = Math.round(profit * monA / (monA + monB));

  const distractors = usable(ctx, [
    mk(askSecond ? shareA : profit - shareA, 'SWAPPED_THE_TWO_UNKNOWNS',
      `نصيب الشريك الآخر ${askSecond ? shareA : profit - shareA}`, 3),
    ...(askSecond ? [mk(Math.round(profit * capB / (capA + capB)), 'SOLVED_ONE_CONDITION_ONLY',
      `${profit} × ${capB} ÷ (${capA} + ${capB})`)] : []),
    mk(byMoney, 'SOLVED_ONE_CONDITION_ONLY', `${profit} × ${capA} ÷ (${capA} + ${capB})`),
    mk(byTime, 'SOLVED_ONE_CONDITION_ONLY', `${profit} × ${monA} ÷ (${monA} + ${monB})`),
    mk(profit / 2, 'ASSUMED_EQUAL_SHARES', `${profit} ÷ 2`),
    mk(profit, 'USED_GIVEN_VALUE_AS_ANSWER', `الربح الكلي ${profit}`),
    mk(Math.round(profit * capA * monB / (capA * monB + capB * monA)), 'SWAPPED_THE_TWO_UNKNOWNS',
      `خلط رأس مال الأول بمدة الثاني`),
    mk(Math.abs(byMoney - byTime), 'USED_DIFFERENCE_AS_ANSWER', `${Math.max(byMoney, byTime)} − ${Math.min(byMoney, byTime)}`)
  ]);

  const stem = composeSentences(ctx, `شارك أحمد بمبلغ ${u(capA, 'dirham')} لمدة ${u(monA, 'month', 'oblique')}، وشارك سالم بمبلغ ${u(capB, 'dirham')} لمدة ${u(monB, 'month', 'oblique')}. فإذا بلغ الربح ${u(profit, 'dirham')}، فكم نصيب ${askSecond ? 'سالم' : 'أحمد'}؟`);
  return buildBase(ctx, {
    templateId: 'PROP_H_CAPITAL_TIME',
    scenario: 'partnership_capital_times_duration',
    direction: 'forward',
    subskill: askSecond ? 'اقتسام ربح بحسب رأس المال والمدة، بطلب نصيب الشريك الثاني'
      : 'اقتسام ربح بحسب رأس المال والمدة معًا',
    difficulty: 'hard',
    question: stem.text,
    stemStructure: stem.structure, informationOrder: stem.order,
    correct, distractors, format: unitFormat('dirham'),
    steps: [
      `نصيب كل شريك يتناسب مع المبلغ مضروبًا في المدة.`,
      `حصة أحمد = ${capA} × ${monA} = ${capA * monA}، وحصة سالم = ${capB} × ${monB} = ${capB * monB}.`,
      `مجموع الحصتين = ${capA * monA} + ${capB * monB} = ${capA * monA + capB * monB}.`,
      askSecond
        ? `نصيب سالم = ${profit} × ${capB * monB} = ${profit * capB * monB}، ثم ${profit * capB * monB} ÷ ${capA * monA + capB * monB} = ${correct}.`
        : `نصيب أحمد = ${profit} × ${capA * monA} = ${profit * capA * monA}، ثم ${profit * capA * monA} ÷ ${capA * monA + capB * monB} = ${correct}.`
    ],
    howToStart: 'اضرب مبلغ كل شريك في مدته قبل أي مقارنة.',
    remember: 'المال وحده لا يحدد النصيب، والمدة وحدها لا تحدده؛ حاصل ضربهما هو ما يحدده.',
    fastMethod: 'كوّن نسبة حاصلي الضرب ثم اقسم الربح عليها.',
    estimatedSteps: 5, conceptTags: ['ratio', 'partnership', 'two-dimensions'], parameters: params,
    oracle: {
      kind: 'constraint', answerKind: 'number',
      // Written from the asked partner's own weight, so the two targets are two
      // relations rather than one relation and a subtraction.
      constraints: [askSecond
        ? eq(mul(X, add(mul(capA, monA), mul(capB, monB))), mul(profit, mul(capB, monB)))
        : eq(mul(X, add(mul(capA, monA), mul(capB, monB))), mul(profit, mul(capA, monA)))]
    },
    askedUnknown: askSecond ? 'secondPartnerShare' : 'firstPartnerShare', stageCount: 3,
    pedagogy: {
      targetSkill: 'WEIGHT_BY_TWO_DIMENSIONS', targetMisconception: 'SOLVED_ONE_CONDITION_ONLY',
      wrongMethodValue: byMoney,
      degenerateWhen: [{when: capA * monA === capB * monB, note: 'the two contributions are equal, so halving is correct'}]
    },
    complexityFactors: {reasoningTransformations: 4, conceptCount: 3, conditionCount: 2, stageCount: 3, arithmeticBurden: 6},
    textParams: {essentialParams: ['capitalA', 'monthsA', 'capitalB', 'monthsB', 'totalProfit']}
  });
}

// --- RC2.7-3. Comparison of alternatives, and the quantity at which it turns ---
//
// The RC2.6 inventory found 93% of published items running FORWARD from givens
// to a computed value, and not one construction that compares two stated plans.
// A candidate meets that shape constantly outside an exam and never inside one,
// and it is a different reasoning entry point: the givens describe two rules
// rather than one situation, and what is asked is where they cross.
function breakEvenQuantity(ctx) {
  const {rng} = ctx;
  const perA = rng.pick([7, 8, 9, 10, 12, 14, 15]);
  const gap = rng.pick([2, 3, 4, 5, 6]);
  const perB = perA - gap;
  if (perB <= 1) return resample(ctx, breakEvenQuantity);
  const fixedA = rng.pick([0, 20, 25, 30, 40]);
  const cross = rng.pick([4, 5, 6, 7, 8, 9, 10, 12]);
  const fixedB = fixedA + gap * cross;
  // At `cross` units the two plans cost exactly the same, so the smallest whole
  // number of units at which the second is genuinely CHEAPER is one more. That
  // gap between "equal" and "less" is the whole of the question, and the equal
  // point is the wrong option a learner reaches by stopping one step early.
  const correct = cross + 1;
  const costA = n => fixedA + perA * n;
  const costB = n => fixedB + perB * n;
  if (costB(correct) >= costA(correct)) return resample(ctx, breakEvenQuantity);
  if (fixedB > 400) return resample(ctx, breakEvenQuantity);
  const params = {fixedFeeA: fixedA, perUnitA: perA, fixedFeeB: fixedB, perUnitB: perB, equalAt: cross};
  const distractors = usable(ctx, [
    // One expression, not two: the feedback check evaluates the derivation and
    // compares it with the value, and a two-equation string evaluates to the
    // first of them.
    mk(cross, 'STOPPED_AT_THE_EQUAL_POINT', `(${fixedB} − ${fixedA}) ÷ ${gap}`, 2),
    mk(cross - 1, 'OFF_BY_ONE_STEP', `${cross} − 1`, 2),
    // Only where the division comes out whole: a derivation must produce the
    // value it is attached to, and «÷» that does not divide exactly would not.
    ...((fixedB - fixedA) % perA === 0
      ? [mk((fixedB - fixedA) / perA, 'DIVIDED_BY_ONE_RATE_INSTEAD_OF_THE_GAP', `${fixedB - fixedA} ÷ ${perA}`, 1)] : []),
    ...((fixedB - fixedA) % perB === 0
      ? [mk((fixedB - fixedA) / perB, 'DIVIDED_BY_ONE_RATE_INSTEAD_OF_THE_GAP', `${fixedB - fixedA} ÷ ${perB}`, 1)] : []),
    mk(gap, 'USED_DIFFERENCE_AS_ANSWER', `${perA} − ${perB} = ${gap}`, 1),
    mk(fixedB - fixedA, 'USED_DIFFERENCE_AS_ANSWER', `${fixedB} − ${fixedA} = ${fixedB - fixedA}`, 1),
    ...((fixedB + fixedA) % gap === 0
      ? [mk((fixedB + fixedA) / gap, 'ADDED_WHERE_A_DIFFERENCE_BELONGS', `(${fixedB} + ${fixedA}) ÷ ${gap}`, 1)] : []),
    mk(cross * 2, 'APPLIED_STEP_TWICE', `${cross} × 2`, 2),
    mk(cross + gap, 'ADDED_WHERE_A_DIFFERENCE_BELONGS', `${cross} + ${gap}`, 2),
    mk(cross + 2, 'OFF_BY_ONE_STEP', `${cross} + 2`, 2)
  ]);
  const stem = composeSentences(ctx,
    `تعرض شركة خطتين لشراء الوحدة نفسها. الخطة الأولى رسم ثابت ${u(fixedA, 'dirham')} وسعر ${u(perA, 'dirham')} للوحدة الواحدة. `
    + `الخطة الثانية رسم ثابت ${u(fixedB, 'dirham')} وسعر ${u(perB, 'dirham')} للوحدة الواحدة. `
    + `ما أقل عدد صحيح من الوحدات تصبح عنده تكلفة الخطة الثانية أقل من تكلفة الأولى؟`,
    {askFirst: 'أقل عدد صحيح من الوحدات تصبح عنده الخطة الثانية أقل تكلفة', orderFree: true});
  return buildBase(ctx, {
    templateId: 'PROP_H_BREAK_EVEN',
    subskill: 'نقطة تفوق خطة على أخرى',
    difficulty: 'hard',
    scenario: 'two_pricing_plans', direction: 'comparison',
    question: stem.text,
    stemStructure: stem.structure, informationOrder: stem.order,
    correct, distractors, format: v => num(v),
    steps: [
      `فرق الرسم الثابت = ${fixedB} − ${fixedA} = ${fixedB - fixedA}، وهو ما تبدأ به الخطة الثانية متأخرة.`,
      `فرق سعر الوحدة = ${perA} − ${perB} = ${gap}، وهو ما تكسبه الخطة الثانية عن كل وحدة.`,
      `تتساوى التكلفتان عند ${fixedB - fixedA} ÷ ${gap} = ${cross}: ${fixedA} + ${perA} × ${cross} = ${costA(cross)}، و${fixedB} + ${perB} × ${cross} = ${costB(cross)}.`,
      `عند التساوي لا تكون الثانية أقل، فأقل عدد يحقق المطلوب = ${cross} + 1 = ${correct}، وعنده ${fixedB} + ${perB} × ${correct} = ${costB(correct)} مقابل ${fixedA} + ${perA} × ${correct} = ${costA(correct)}.`
    ],
    howToStart: 'قارن ما تخسره الخطة الثانية في الرسم الثابت بما تكسبه في كل وحدة.',
    remember: 'نقطة التساوي ليست الجواب عندما يكون المطلوب «أقل».',
    fastMethod: 'اقسم فرق الرسم الثابت على فرق سعر الوحدة، ثم أضف واحدًا.',
    estimatedSteps: 4, conceptTags: ['comparison', 'break-even', 'linear-cost'],
    parameters: params,
    answerBounds: {between: [1, 60]}, answerIsCount: true,
    oracle: {
      kind: 'constraint', answerKind: 'number',
      constraints: [eq(mul(sub(X, 1), gap), fixedB - fixedA)]
    },
    askedUnknown: 'smallestQuantityWhereSecondPlanWins', stageCount: 3,
    pedagogy: {
      targetSkill: 'COMPARE_TWO_LINEAR_COSTS', targetMisconception: 'STOPPED_AT_THE_EQUAL_POINT',
      wrongMethodValue: cross
    },
    complexityFactors: {
      reasoningTransformations: 3, conceptCount: 3, conditionCount: 2, stageCount: 3,
      arithmeticBurden: 5, reverseReasoning: 1
    },
    textParams: {essentialParams: ['fixedFeeA', 'perUnitA', 'fixedFeeB', 'perUnitB']}
  });
}

// ---------------------------------------------------------------------------
// RC2.9.4-B3. Two more MEDIUM constructions. The MEDIUM templates this family
// held solve a two-item system or add a fixed fee. These compare two stated
// price-for-quantity offers by their unit price (two proportions brought to one
// footing, then a difference), and carry a rate stated per minute across a time
// stated in hours (a conversion before the proportion).
// ---------------------------------------------------------------------------

function unitPriceGap(ctx) {
  const {rng} = ctx;
  const n1 = rng.pick([4, 5, 6, 8]);
  const p1 = rng.pick([3, 4, 5, 6, 7, 8]);
  const n2 = rng.pick([5, 6, 8, 9, 10, 12].filter(v => v !== n1));
  const p2 = rng.pick([2, 3, 4, 5, 6, 7, 9].filter(v => v !== p1));
  const t1 = n1 * p1, t2 = n2 * p2;
  const correct = Math.abs(p1 - p2);
  const cheaper = p1 < p2 ? 'الأول' : 'الثاني';
  const params = {firstCount: n1, firstTotal: t1, secondCount: n2, secondTotal: t2};
  const distractors = usable(ctx, [
    mk(Math.abs(t1 - t2), 'USED_DIFFERENCE_AS_ANSWER', `|${t1} − ${t2}|`, 1),
    mk(p1, 'STOPPED_AT_UNIT_RATE', `${t1} ÷ ${n1}`, 3),
    mk(p2, 'STOPPED_AT_UNIT_RATE', `${t2} ÷ ${n2}`, 3),
    mk(Math.abs(n1 - n2), 'USED_DIFFERENCE_AS_ANSWER', `|${n1} − ${n2}|`, 1),
    mk(p1 + p2, 'ADDED_WHERE_A_DIFFERENCE_BELONGS', `${p1} + ${p2}`, 3),
    mk(Math.abs(t1 / n2 - t2 / n1), 'SWAPPED_RATE_AND_COUNT', `|${t1} ÷ ${n2} − ${t2} ÷ ${n1}|`, 2),
    mk(Math.abs(t1 - t2) / Math.abs(n1 - n2), 'MISREAD_THE_STEP', `|${t1} − ${t2}| ÷ |${n1} − ${n2}|`, 1)
  ], {maxDecimals: 2});
  if (distinctValues(distractors.filter(d => d.value !== correct)) < 5) return resample(ctx, unitPriceGap);
  const stem = composeSentences(ctx, `تبيع مكتبة ${u(n1, 'book')} بـ${u(t1, 'dirham', 'oblique')}، وتبيع مكتبة أخرى ${u(n2, 'book')} من النوع نفسه بـ${u(t2, 'dirham', 'oblique')}. بكم درهمًا يقل سعر الكتاب الواحد في المكتبة ${cheaper === 'الأول' ? 'الأولى' : 'الثانية'} عن الأخرى؟`);
  return buildBase(ctx, {
    templateId: 'PROP_M_UNIT_PRICE_COMPARE',
    subskill: 'مقارنة عرضين بسعر الوحدة',
    difficulty: 'medium',
    question: stem.text,
    stemStructure: stem.structure, informationOrder: stem.order,
    correct, distractors, format: unitFormat('dirham'),
    steps: [
      `سعر الكتاب في المكتبة الأولى = ${t1} ÷ ${n1} = ${p1}.`,
      `سعر الكتاب في المكتبة الثانية = ${t2} ÷ ${n2} = ${p2}.`,
      `الفرق = ${Math.max(p1, p2)} − ${Math.min(p1, p2)} = ${correct}.`
    ],
    howToStart: 'لا تقارن المجموعين؛ حوّل كل عرض إلى سعر الوحدة.',
    remember: 'المقارنة العادلة بين عرضين تكون بسعر الوحدة الواحدة.',
    fastMethod: 'سعر الوحدة لكل عرض، ثم الفرق.',
    estimatedSteps: 3, conceptTags: ['direct-proportion', 'unit-value', 'comparison'], parameters: params,
    oracle: {kind: 'constraint', answerKind: 'number', constraints: [eq(mul(X, n1, n2), p1 < p2 ? sub(mul(t2, n1), mul(t1, n2)) : sub(mul(t1, n2), mul(t2, n1)))]},
    askedUnknown: 'unitPriceGap', stageCount: 2,
    pedagogy: {
      targetSkill: 'COMPARE_BY_UNIT_VALUE', targetMisconception: 'USED_DIFFERENCE_AS_ANSWER',
      wrongMethodValue: Math.abs(t1 - t2),
      degenerateWhen: [{when: p1 === p2, note: 'equal unit prices: nothing to compare'}]
    },
    complexityFactors: {reasoningTransformations: 3, conceptCount: 2, stageCount: 2, arithmeticBurden: 3},
    textParams: {essentialParams: ['firstCount', 'firstTotal', 'secondCount', 'secondTotal']}
  });
}

function scaleAcrossHours(ctx) {
  const {rng} = ctx;
  const minutes = rng.pick([2, 3, 4, 5, 6]);
  const per = rng.pick([12, 15, 18, 20, 24, 25, 30]);
  const amount = minutes * per;
  const hours = rng.pick([1.5, 2, 2.5, 3, 4]);
  const targetMinutes = hours * 60;
  const correct = per * targetMinutes;
  const params = {baseAmount: amount, baseMinutes: minutes, targetHours: hours};
  const distractors = usable(ctx, [
    mk(per * hours, 'RATE_APPLIED_TO_WRONG_COUNT', `${per} × ${num(hours)}`, 1),
    mk(amount * hours, 'MULTIPLIED_COUNTS_INSTEAD_OF_RATE', `${amount} × ${num(hours)}`, 1),
    mk(per * 60, 'STOPPED_AT_INTERMEDIATE_TOTAL', `${per} × 60`, 2),
    mk(per, 'STOPPED_AT_UNIT_RATE', `${amount} ÷ ${minutes}`, 2),
    mk(amount * targetMinutes, 'MULTIPLIED_COUNTS_INSTEAD_OF_RATE', `${amount} × ${targetMinutes}`, 2),
    mk(per * targetMinutes / 2, 'HALF_DISTANCE_AS_ANSWER', `${per} × ${targetMinutes} ÷ 2`, 2),
    mk(per * (targetMinutes + minutes), 'RATE_APPLIED_TO_WRONG_COUNT', `${per} × (${targetMinutes} + ${minutes})`, 2)
  ], {maxDecimals: 1});
  if (distinctValues(distractors.filter(d => d.value !== correct)) < 5) return resample(ctx, scaleAcrossHours);
  const stem = composeSentences(ctx, `تنسخ آلة ${u(amount, 'page')} في ${u(minutes, 'minute', 'oblique')} بمعدل ثابت. كم صفحة تنسخ في ${u(hours, 'hour', 'oblique')}؟`);
  return buildBase(ctx, {
    templateId: 'PROP_M_SCALE_ACROSS_HOURS',
    subskill: 'تناسب مباشر مع تحويل الساعات إلى دقائق',
    difficulty: 'medium',
    question: stem.text,
    stemStructure: stem.structure, informationOrder: stem.order,
    correct, distractors, format: unitFormat('page'),
    steps: [
      `الزمن المطلوب بالدقائق = ${num(hours)} × 60 = ${targetMinutes}.`,
      `معدل الدقيقة الواحدة = ${amount} ÷ ${minutes} = ${per}.`,
      `عدد الصفحات = ${per} × ${targetMinutes} = ${correct}.`
    ],
    howToStart: 'وحّد وحدتي الزمن قبل تطبيق التناسب.',
    remember: 'المعدل بالدقيقة لا يُضرب في ساعات.',
    fastMethod: `حوّل الساعات إلى دقائق، ثم معدل الدقيقة × الدقائق — هنا ${amount} ÷ ${minutes} × ${targetMinutes}.`,
    estimatedSteps: 3, conceptTags: ['direct-proportion', 'unit-conversion'], parameters: params,
    allowedConstants: [0, 1, 2, 100, 60],
    oracle: {kind: 'constraint', answerKind: 'number', constraints: [eq(mul(X, minutes), mul(amount, hours, 60))]},
    askedUnknown: 'scaledOutputAcrossUnits', stageCount: 3,
    pedagogy: {
      targetSkill: 'CONVERT_THEN_SCALE', targetMisconception: 'RATE_APPLIED_TO_WRONG_COUNT',
      wrongMethodValue: per * hours,
      degenerateWhen: [{when: hours === 1 / 60, note: 'a one-minute target: no conversion to get wrong'}]
    },
    complexityFactors: {reasoningTransformations: 3, conceptCount: 2, unitConversion: 1, stageCount: 3, arithmeticBurden: 3},
    textParams: {essentialParams: ['baseAmount', 'baseMinutes', 'targetHours']}
  });
}

/** RC2.9.5 §4. EASY: the value of ONE unit, which the scaling templates pass through. */
function unitValueOnly(ctx) {
  const {rng} = ctx;
  const count = rng.pick([3, 4, 6, 8, 9]);
  const unit = rng.pick([7, 9, 11, 13, 14].filter(v => v !== count));
  const total = count * unit;
  const correct = unit;
  const distractors = usable(ctx, [
    mk(total, 'USED_GIVEN_VALUE_AS_ANSWER', `المبلغ المعطى ${total}`),
    mk(count, 'SWAPPED_THE_TWO_UNKNOWNS', `العدد المعطى ${count}`),
    mk(total * count, 'MULTIPLIED_INSTEAD_OF_DIVIDED', `${total} × ${count}`),
    mk(total - count, 'ADDED_WHERE_A_DIFFERENCE_BELONGS', `${total} − ${count}`),
    mk(unit + 1, 'OFF_BY_ONE_STEP', `${total} ÷ ${count} + 1`),
    mk(unit - 1, 'OFF_BY_ONE_STEP', `${total} ÷ ${count} − 1`),
    mk(total / (count - 1), 'RATE_APPLIED_TO_WRONG_COUNT', `${total} ÷ (${count} − 1)`)
  ], {maxDecimals: 2});
  return buildBase(ctx, {
    templateId: 'PROP_E_UNIT_VALUE',
    subskill: 'قيمة الوحدة الواحدة',
    difficulty: 'easy',
    question: `المعطيات: ${u(count, 'box')} متماثلة بمبلغ ${u(total, 'dirham')}. المطلوب: ثمن الصندوق الواحد.`,
    correct, distractors, format: unitFormat('dirham'),
    steps: [`ثمن الصندوق الواحد = ${total} ÷ ${count} = ${correct}.`],
    howToStart: 'اقسم المبلغ على عدد الصناديق.',
    remember: 'قيمة الوحدة هي أول خطوة في كل تناسب مباشر.',
    fastMethod: `قيمة الوحدة = المبلغ ÷ العدد — هنا ${total} ÷ ${count}.`,
    estimatedSteps: 1, conceptTags: ['direct-proportion', 'unit-value'],
    parameters: {boxCount: count, totalPrice: total},
    oracle: {kind: 'constraint', answerKind: 'number', constraints: [eq(mul(X, count), total)]},
    askedUnknown: 'unitValueOnly', stageCount: 1,
    pedagogy: {targetSkill: 'UNIT_VALUE_ONLY', targetMisconception: 'MULTIPLIED_INSTEAD_OF_DIVIDED',
      wrongMethodValue: total * count},
    complexityFactors: {reasoningTransformations: 1, conceptCount: 1, stageCount: 1, arithmeticBurden: 1},
    textParams: {essentialParams: ['boxCount', 'totalPrice']}
  });
}

/** RC2.9.5 §4. EASY: two different items, each at its own price, totalled. */
function totalOfTwoItems(ctx) {
  const {rng} = ctx;
  const buyer = rng.pick(PERSONS);
  const shop = rng.pick(['متجر', 'بقالة', 'مكتبة', 'متجر أدوات']);
  const aCount = rng.pick([2, 3, 4, 5]);
  const aPrice = rng.pick([6, 8, 9, 12]);
  const bCount = rng.pick([3, 4, 6, 7].filter(v => v !== aCount));
  const bPrice = rng.pick([5, 7, 10, 15].filter(v => v !== aPrice));
  const correct = aCount * aPrice + bCount * bPrice;
  const distractors = usable(ctx, [
    mk(aCount * aPrice, 'USED_ONLY_FIRST_RATE', `${aCount} × ${aPrice}`),
    mk(bCount * bPrice, 'USED_ONLY_SECOND_RATE', `${bCount} × ${bPrice}`),
    mk((aCount + bCount) * (aPrice + bPrice), 'RATE_APPLIED_TO_WRONG_COUNT', `(${aCount} + ${bCount}) × (${aPrice} + ${bPrice})`),
    mk((aCount + bCount) * aPrice, 'RATE_APPLIED_TO_WRONG_COUNT', `(${aCount} + ${bCount}) × ${aPrice}`),
    mk(Math.abs(aCount * aPrice - bCount * bPrice), 'USED_DIFFERENCE_AS_ANSWER', `${Math.max(aCount * aPrice, bCount * bPrice)} − ${Math.min(aCount * aPrice, bCount * bPrice)}`),
    mk(aPrice + bPrice, 'MISSED_ONE_STAGE', `${aPrice} + ${bPrice}`),
    mk(correct + aPrice, 'OFF_BY_ONE_STEP', `${aCount} × ${aPrice} + ${bCount} × ${bPrice} + ${aPrice}`)
  ]);
  const stem = composeSentences(ctx,
    `في ${shop}، اشترى${buyer.g === 'f' ? 'ت' : ''} ${buyer.w} ${u(aCount, 'book', 'oblique')} ثمن الواحد ${u(aPrice, 'dirham')}، و${u(bCount, 'card', 'oblique')} ثمن الواحدة ${u(bPrice, 'dirham')}. كم دفع${buyer.g === 'f' ? 'ت' : ''} في المجموع؟`);
  return buildBase(ctx, {
    templateId: 'PROP_E_TOTAL_TWO_ITEMS',
    subskill: 'مجموع ثمن صنفين مختلفين',
    difficulty: 'easy',
    question: stem.text, stemStructure: stem.structure, informationOrder: stem.order,
    correct, distractors, format: unitFormat('dirham'),
    steps: [
      `ثمن الكتب = ${aCount} × ${aPrice} = ${aCount * aPrice}.`,
      `ثمن البطاقات = ${bCount} × ${bPrice} = ${bCount * bPrice}.`,
      `المجموع = ${aCount * aPrice} + ${bCount * bPrice} = ${correct}.`
    ],
    howToStart: 'احسب ثمن كل صنف وحده ثم اجمع.',
    remember: 'لكل صنف سعره: لا تجمع الأعداد مع الأسعار.',
    fastMethod: `المجموع = ثمن كل صنف مجموعًا — هنا (${aCount} × ${aPrice}) + (${bCount} × ${bPrice}).`,
    estimatedSteps: 3, conceptTags: ['direct-proportion', 'combine'],
    parameters: {firstCount: aCount, firstPrice: aPrice, secondCount: bCount, secondPrice: bPrice},
    oracle: {kind: 'constraint', answerKind: 'number',
      constraints: [eq(X, add(mul(aCount, aPrice), mul(bCount, bPrice)))]},
    askedUnknown: 'totalOfTwoItems', stageCount: 3,
    pedagogy: {targetSkill: 'TOTAL_TWO_ITEMS', targetMisconception: 'RATE_APPLIED_TO_WRONG_COUNT',
      wrongMethodValue: (aCount + bCount) * (aPrice + bPrice)},
    complexityFactors: {reasoningTransformations: 2, conceptCount: 1, stageCount: 3, arithmeticBurden: 3},
    textParams: {essentialParams: ['firstCount', 'firstPrice', 'secondCount', 'secondPrice']}
  });
}
