// Direct proportion — the Section 26 pilot family.
//
// This family is the first to run on the unified contract:
//   solve(params, askedUnknown) -> {answer, exactAnswer, steps, misconceptions, pathComplexity}
// The generator states the problem; `solve` derives the answer and the steps
// from the parameters, and the oracle independently searches for the values that
// satisfy the stated proportion. Nothing is announced without being derived.

import {Fraction} from '../qa/fraction.js';
import {mk, usable, u, num, unitFormat, buildBase, eq, X, add, sub, mul, div, factorLine, resample, unitWord, unitWordKam, theSingle, defPlural} from './_shared.js';

export function generateDirectProportion({difficulty, rng, seed, engineVersion, telemetry}) {
  const ctx = {
    difficulty, rng, seed, engineVersion,
    family: 'direct_proportion', family_ar: 'التناسب المباشر', category: 'التناسب المباشر البسيط'
  };
  const list = difficulty === 'easy' ? [unitItems, unitCost, fractionalUnit]
    : difficulty === 'medium' ? [recipeScale, mapScale]
    : [compoundScale, multiUnitCost];
  return rng.pick(list)(ctx);
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
  const forward = rng.bool(0.65);
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
    return buildBase(ctx, {
      templateId: 'PROP_E_ITEMS',
      subskill: 'معدل ثابت بين عدد وحدات وكمية',
      difficulty: 'easy',
      question: `يحتوي كل ${unitWord('box')} على العدد نفسه من القطع. إذا كانت ${u(boxes, 'box')} تحتوي على ${u(total, 'piece')}، فكم قطعة يحتوي عليها ${u(targetCount, 'box')}؟`,
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
  return buildBase(ctx, {
    templateId: 'PROP_E_ITEMS',
    subskill: 'معدل ثابت بين عدد وحدات وكمية — إيجاد عدد الوحدات',
    difficulty: 'easy',
    question: `يحتوي كل ${unitWord('box')} على العدد نفسه من القطع. إذا كانت ${u(boxes, 'box')} تحتوي على ${u(total, 'piece')}، فكم ${unitWordKam('box')} نحتاج للحصول على ${u(targetAmount, 'piece')}؟`,
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
  if (rng.bool(0.4)) return unitCostReverse(ctx, n, unitPrice, total, targetCount);
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
  return buildBase(ctx, {
    templateId: 'PROP_E_COST',
    subskill: 'تكلفة عدد أكبر من وحدات بالسعر نفسه',
    difficulty: 'easy',
    question: `تباع الوحدات بالسعر نفسه. إذا كانت ${u(n, 'unit')} تكلف ${u(total, 'dirham')}، فكم تكلف ${u(targetCount, 'unit')}؟`,
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
  return buildBase(ctx, {
    templateId: 'PROP_E_COST',
    subskill: 'تكلفة وحدات بالسعر نفسه — إيجاد عدد الوحدات',
    difficulty: 'easy',
    question: `تباع الوحدات بالسعر نفسه. إذا كانت ${u(n, 'unit')} تكلف ${u(total, 'dirham')}، فكم وحدة نشتري بمبلغ ${u(budget, 'dirham')}؟`,
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
  return buildBase(ctx, {
    templateId: 'PROP_M_RECIPE',
    subskill: 'تكبير وصفة بعامل ثابت',
    difficulty: 'medium',
    question: `تحتاج وصفة إلى ${u(cups, 'cup')} من الدقيق لصنع ${u(pieces, 'piece')}. كم كوبًا تحتاج لصنع ${u(targetPieces, 'piece')} بالمعدل نفسه؟`,
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
  return buildBase(ctx, {
    templateId: 'PROP_M_RECIPE',
    subskill: 'وصفة بمعدل ثابت — إيجاد عدد القطع',
    difficulty: 'medium',
    question: `تحتاج وصفة إلى ${u(cups, 'cup')} من الدقيق لصنع ${u(pieces, 'piece')}. كم قطعة نصنع من ${u(availableCups, 'cup')} بالمعدل نفسه؟`,
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
  return buildBase(ctx, {
    templateId: 'PROP_M_MAP',
    subskill: 'مقياس خريطة مع جمع مرحلتين',
    difficulty: 'medium',
    // RC2-016: كل governs its noun (genitive), and the verb agrees with it:
    // كل سنتيمتر يمثل / كل سنتيمترين يمثلان / كل 5 سنتيمترات تمثل.
    question: `على خريطة، كل ${u(cmBase, 'cm', 'oblique')} ${cmBase === 1 ? 'يمثل' : cmBase === 2 ? 'يمثلان' : 'تمثل'} ${u(kmBase, 'km')}. طول مسار على الخريطة ${u(a, 'cm')}، ثم أُضيف إليه طريق جانبي طوله ${u(b, 'cm')} على الخريطة. ما المسافة الحقيقية للمسار كاملًا؟`,
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
  const targetCount = rng.pick([12, 15, 20, 24].filter(v => v !== n));
  const answer = unitW.mul(targetCount);
  // Section 8-A: an intermediate that cannot be printed exactly must not be
  // produced at all, so the sampler is what rejects it — not the display.
  if (!unitW.isExactDecimal || unitW.decimalPlaces > 2) return resample(ctx, fractionalUnit);
  if (!answer.isExactDecimal || answer.decimalPlaces > 2) return resample(ctx, fractionalUnit);
  if (unitW.eq(Fraction.from(n))) return resample(ctx, fractionalUnit);
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
  return buildBase(ctx, {
    templateId: 'PROP_M_FRAC_UNIT',
    subskill: 'قيمة وحدة كسرية ثم التوسع',
    difficulty: 'easy',
    question: `تتساوى العناصر في الوزن. إذا كان وزن ${u(n, 'item')} هو ${u(totalKg, 'kg')}، فما وزن ${u(targetCount, 'item')} من النوع نفسه؟`,
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
  const {factor, text: factorText} = factorLine(reservePct, 'up', 'معامل الاحتياط');
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
  return buildBase(ctx, {
    templateId: 'PROP_H_COMPOUND',
    subskill: 'تناسب مباشر ثم زيادة احتياط',
    difficulty: 'hard',
    question: `تحتاج ${u(units, 'unit')} إلى ${u(amount, 'kg')} من مادة. نريد تجهيز ${u(targetUnits, 'unit')}، مع إضافة احتياط بنسبة ${reservePct}% فوق الكمية المحسوبة. كم كيلوجرامًا نحتاج؟`,
    correct,
    distractors,
    format: unitFormat('kg'),
    steps: [
      `المادة لكل وحدة بالكيلوجرامات = ${amount} ÷ ${units} = ${unitVal.toDecimalString()}.`,
      `الكمية قبل الاحتياط = ${unitVal.toDecimalString()} × ${targetUnits} = ${scaled.toDecimalString()}.`,
      factorText,
      `الكمية النهائية = ${scaled.toDecimalString()} × ${factor.toDecimalString()} = ${correct}.`
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
  return buildBase(ctx, {
    templateId: 'PROP_H_COST_PLUS',
    subskill: 'تكلفة وحدات مع رسم ثابت',
    difficulty: 'hard',
    question: `تكلف ${u(packN, 'unit')} مبلغ ${u(packCost, 'dirham')} بالسعر نفسه. إذا اشترينا ${u(targetCount, 'unit')} وأُضيف رسم ثابت قدره ${u(flatFee, 'dirham')} يُدفع مرة واحدة، فما التكلفة الكلية؟`,
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
