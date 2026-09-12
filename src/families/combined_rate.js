import {mk, usable, u, unitFormat, buildBase, eq, X, add, mul, resample} from './_shared.js';

export function generateCombinedRate({difficulty, rng, seed, engineVersion, telemetry}) {
  const ctx = {difficulty, rng, seed, engineVersion, telemetry, family: 'combined_rate', family_ar: 'المعدل المشترك', category: 'المعدل المشترك'};
  const list = difficulty === 'easy' ? [togetherOutput, togetherTime]
    : difficulty === 'medium' ? [soloThenTogether, togetherThenSolo]
    : [stagedTarget, threeRates];
  return rng.pick(list)(ctx);
}

function togetherOutput(ctx) {
  const {rng} = ctx;
  const a = rng.pick([6, 8, 10, 12, 15]);
  const b = rng.pick([8, 10, 12, 15, 20].filter(v => v !== a));
  const h = rng.pick([3, 4, 5, 6]);
  const correct = (a + b) * h;
  const params = {rateA: a, rateB: b, hours: h};
  const distractors = usable(ctx, [
    mk(a * h, 'USED_ONLY_FIRST_RATE', `${a} × ${h}`),
    mk(b * h, 'USED_ONLY_SECOND_RATE', `${b} × ${h}`),
    mk(a + b, 'STOPPED_AT_UNIT_RATE', `${a} + ${b}`),
    mk(Math.abs(a - b) * h, 'SUBTRACTED_INSTEAD_OF_ADDED', `|${a} − ${b}| × ${h}`),
    mk((a + b) * (h + 1), 'OFF_BY_ONE_STEP', `(${a} + ${b}) × (${h} + 1)`),
    mk((a + b) * (h - 1), 'OFF_BY_ONE_STEP', `(${a} + ${b}) × (${h} − 1)`),
    mk(a * b, 'MULTIPLIED_COUNTS_INSTEAD_OF_RATE', `${a} × ${b}`),
    mk((a + b) * h + a + b, 'APPLIED_STEP_TWICE', `(${a} + ${b}) × ${h} + (${a} + ${b})`),
    mk((a + b) * h * 2, 'APPLIED_STEP_TWICE', `(${a} + ${b}) × ${h} × 2`),
    mk((a + b + Math.min(a, b)) * h, 'RATE_APPLIED_TO_WRONG_COUNT', `(${a} + ${b} + ${Math.min(a, b)}) × ${h}`)
  ]);
  return buildBase(ctx, {
    templateId: 'COMB_E_OUTPUT',
    subskill: 'جمع معدلين خلال مدة معلومة',
    difficulty: 'easy',
    question: `ينجز العامل أ ${a} وحدة/ساعة، وينجز العامل ب ${b} وحدة/ساعة. إذا عملا معًا ${u(h, 'hour', 'oblique')}، فكم وحدة ينجزان؟`,
    correct, distractors, format: unitFormat('unit'),
    steps: [
      `المعدل المشترك في الساعة = ${a} + ${b} = ${a + b}.`,
      `الإنجاز الكلي = ${a + b} × ${h} = ${correct}.`
    ],
    howToStart: 'اجمع المعدلين لأنهما يعملان في الوقت نفسه.',
    remember: 'تأكد أن المعدلين بنفس الوحدة الزمنية قبل جمعهما.',
    fastMethod: '(معدل أ + معدل ب) × الزمن.',
    estimatedSteps: 2, conceptTags: ['combined-rate'], parameters: params,
    // Conservation of quantity: the work each side contributes must add up.
    oracle: {kind: 'constraint', answerKind: 'number', constraints: [eq(X, add(mul(a, h), mul(b, h)))]},
    askedUnknown: 'jointOutput', stageCount: 1,
    pedagogy: {
      targetSkill: 'ADD_RATES', targetMisconception: 'USED_ONLY_FIRST_RATE',
      wrongMethodValue: a * h,
      degenerateWhen: [{when: b === 0, note: 'second worker contributes nothing'}]
    },
    complexityFactors: {reasoningTransformations: 2, conceptCount: 1, stageCount: 1, arithmeticBurden: 2},
    textParams: {essentialParams: ['rateA', 'rateB', 'hours']}
  });
}

function togetherTime(ctx) {
  const {rng} = ctx;
  const a = rng.pick([10, 12, 15, 18]);
  const b = rng.pick([15, 18, 20, 24].filter(v => v !== a));
  const correct = rng.pick([4, 5, 6, 8]);
  const target = (a + b) * correct;
  const params = {rateA: a, rateB: b, targetAmount: target};
  const distractors = usable(ctx, [
    mk(target / a, 'USED_SINGLE_RATE_ON_FULL_TARGET', `${target} ÷ ${a}`),
    mk(target / b, 'USED_SINGLE_RATE_ON_FULL_TARGET', `${target} ÷ ${b}`),
    mk(a + b, 'STOPPED_AT_UNIT_RATE', `${a} + ${b}`),
    mk(target / Math.abs(b - a), 'SUBTRACTED_INSTEAD_OF_ADDED', `${target} ÷ |${b} − ${a}|`),
    mk(target / (a + b + Math.min(a, b)), 'RATE_APPLIED_TO_WRONG_COUNT', `${target} ÷ (${a} + ${b} + ${Math.min(a, b)})`),
    mk(target / (2 * (a + b)), 'APPLIED_STEP_TWICE', `${target} ÷ (2 × ${a + b})`),
    // RC2-012: deepened; half this template's draws were being thrown away once
    // the key-neighbour padding was removed. These land on whole hours far more
    // often than the ratio-shaped slips above.
    mk(target / (a + b) * 2, 'APPLIED_STEP_TWICE', `${target} ÷ ${a + b} × 2`),
    mk(target / (a + b) + a, 'ADDED_INSTEAD_OF_SCALING', `${target} ÷ ${a + b} + ${a}`),
    mk((a + b) * target, 'MULTIPLIED_INSTEAD_OF_DIVIDED', `(${a} + ${b}) × ${target}`),
    mk(target - (a + b), 'SUBTRACTED_INSTEAD_OF_ADDED', `${target} − (${a} + ${b})`),
    mk(a * b, 'MULTIPLIED_COUNTS_INSTEAD_OF_RATE', `${a} × ${b}`)
  ]);
  return buildBase(ctx, {
    templateId: 'COMB_E_TIME',
    subskill: 'جمع معدلين ثم إيجاد الزمن',
    difficulty: 'easy',
    question: `تنجز آلة أ ${a} قطعة/ساعة، وآلة ب ${b} قطعة/ساعة. إذا عملتا معًا، فكم ساعة تحتاجان لإنتاج ${u(target, 'piece')}؟`,
    correct, distractors, format: unitFormat('hour'),
    steps: [
      `المعدل المشترك في الساعة = ${a} + ${b} = ${a + b}.`,
      `الزمن المطلوب بالساعات = ${target} ÷ ${a + b} = ${correct}.`
    ],
    howToStart: 'اجمع المعدلات ثم اقسم الهدف عليها.',
    remember: 'بعد جمع المعدلات يصبح السؤال: كمية ÷ معدل.',
    fastMethod: 'الهدف ÷ المعدل المشترك.',
    estimatedSteps: 2, conceptTags: ['combined-rate', 'reverse'], parameters: params,
    oracle: {kind: 'constraint', answerKind: 'number', constraints: [eq(add(mul(a, X), mul(b, X)), target)]},
    askedUnknown: 'jointTime', stageCount: 1,
    pedagogy: {
      targetSkill: 'ADD_RATES_THEN_TIME', targetMisconception: 'USED_SINGLE_RATE_ON_FULL_TARGET',
      wrongMethodValue: target / a,
      degenerateWhen: [{when: b === 0, note: 'no second rate to add'}]
    },
    complexityFactors: {reasoningTransformations: 2, conceptCount: 1, reverseReasoning: 1, stageCount: 1, arithmeticBurden: 2},
    textParams: {essentialParams: ['rateA', 'rateB', 'targetAmount']}
  });
}

function soloThenTogether(ctx) {
  const {rng} = ctx;
  const a = rng.pick([12, 15, 18, 20]);
  const b = rng.pick([8, 10, 12, 15].filter(v => v !== a));
  const solo = rng.pick([3, 4, 5]);
  const correct = rng.pick([3, 4, 5, 6].filter(v => v !== solo));
  const target = a * solo + (a + b) * correct;
  const params = {rateA: a, rateB: b, soloHours: solo, targetAmount: target};
  const distractors = usable(ctx, [
    mk(target / (a + b), 'USED_COMBINED_RATE_ON_FULL_TARGET', `${target} ÷ ${a + b}`),
    mk((target - a * solo) / a, 'USED_ONLY_FIRST_RATE', `(${target} − ${a * solo}) ÷ ${a}`),
    mk((target - a * solo) / b, 'USED_ONLY_SECOND_RATE', `(${target} − ${a * solo}) ÷ ${b}`),
    // RC2-012: the intermediate total and the two nudges are replaced by slips
    // built from the stated solo span and the two rates.
    mk(solo, 'STOPPED_AT_INTERMEDIATE_TOTAL', `مدة العمل المنفرد ${solo}`),
    mk(target / a, 'USED_SINGLE_RATE_ON_FULL_TARGET', `${target} ÷ ${a}`),
    mk(target / b, 'USED_SINGLE_RATE_ON_FULL_TARGET', `${target} ÷ ${b}`),
    mk(a * solo, 'STOPPED_AT_INTERMEDIATE_TOTAL', `${a} × ${solo}`),
    mk((target - a * solo) / (a + b + Math.min(a, b)), 'RATE_APPLIED_TO_WRONG_COUNT', `${target - a * solo} ÷ (${a} + ${b} + ${Math.min(a, b)})`),
    mk((target - a * solo) / (2 * (a + b)), 'APPLIED_STEP_TWICE', `${target - a * solo} ÷ (2 × ${a + b})`),
    mk(target / (a * b), 'MULTIPLIED_COUNTS_INSTEAD_OF_RATE', `${target} ÷ (${a} × ${b})`)
  ]);
  return buildBase(ctx, {
    templateId: 'COMB_M_SOLO_THEN',
    subskill: 'عمل منفرد أولًا ثم عمل مشترك',
    difficulty: 'medium',
    question: `ينجز العامل أ ${a} وحدة/ساعة، والعامل ب ${b} وحدة/ساعة. عمل أ وحده ${u(solo, 'hour', 'oblique')}، ثم عملا معًا حتى بلغ الإنجاز ${u(target, 'unit')}. كم ساعة عملا معًا؟`,
    correct, distractors, format: unitFormat('hour'),
    steps: [
      `إنجاز أ منفردًا = ${a} × ${solo} = ${a * solo}.`,
      `المتبقي = ${target} − ${a * solo} = ${target - a * solo}.`,
      `المعدل المشترك في الساعة = ${a} + ${b} = ${a + b}.`,
      `الزمن المشترك بالساعات = ${target - a * solo} ÷ ${a + b} = ${correct}.`
    ],
    howToStart: 'احسب ما أُنجز في المرحلة المنفردة أولًا.',
    remember: 'لا تستخدم المعدل المشترك على كامل الهدف إذا كان أحدهما بدأ وحده.',
    fastMethod: 'المتبقي ÷ المعدل المشترك.',
    estimatedSteps: 4, conceptTags: ['combined-rate', 'stages'], parameters: params,
    oracle: {kind: 'constraint', answerKind: 'number', constraints: [eq(add(mul(a, solo), mul(add(a, b), X)), target)]},
    askedUnknown: 'jointTimeAfterSolo', stageCount: 2,
    pedagogy: {
      targetSkill: 'STAGED_COMBINED_RATE', targetMisconception: 'USED_COMBINED_RATE_ON_FULL_TARGET',
      wrongMethodValue: target / (a + b),
      degenerateWhen: [{when: solo === 0, note: 'no solo stage to account for'}]
    },
    complexityFactors: {reasoningTransformations: 3, conceptCount: 2, stageCount: 2, reverseReasoning: 1, arithmeticBurden: 3},
    textParams: {essentialParams: ['rateA', 'rateB', 'soloHours', 'targetAmount']}
  });
}

function togetherThenSolo(ctx) {
  const {rng} = ctx;
  const a = rng.pick([10, 12, 15]);
  const b = rng.pick([15, 18, 20].filter(v => v !== a));
  const bothH = rng.pick([3, 4, 5]);
  const correct = rng.pick([3, 4, 5, 6].filter(v => v !== bothH));
  // Section 10: with these numbers, dividing the whole target by the combined
  // rate would also land on the key, so the item would stop measuring the
  // staging skill it exists for.
  if (bothH * (a + b) === correct * b) return resample(ctx, togetherThenSolo);
  const target = (a + b) * bothH + a * correct;
  const params = {rateA: a, rateB: b, jointHours: bothH, targetAmount: target};
  const distractors = usable(ctx, [
    mk(target / a, 'USED_SINGLE_RATE_ON_FULL_TARGET', `${target} ÷ ${a}`),
    mk(target / (a + b), 'USED_COMBINED_RATE_ON_FULL_TARGET', `${target} ÷ ${a + b}`),
    mk(bothH, 'STOPPED_AT_INTERMEDIATE_TOTAL', `مدة العمل المشترك ${bothH}`),
    mk((target - (a + b) * bothH) / b, 'USED_ONLY_SECOND_RATE', `(${target} − ${(a + b) * bothH}) ÷ ${b}`),
    mk((target - (a + b) * bothH) / (a + b), 'USED_COMBINED_RATE_ON_FULL_TARGET', `${a * correct} ÷ ${a + b}`),
    mk((a + b) * bothH, 'STOPPED_AT_INTERMEDIATE_TOTAL', `${a + b} × ${bothH}`),
    mk(target / b, 'USED_SINGLE_RATE_ON_FULL_TARGET', `${target} ÷ ${b}`),
    mk((target - (a + b) * bothH) / (a + b + Math.min(a, b)), 'RATE_APPLIED_TO_WRONG_COUNT', `${a * correct} ÷ (${a} + ${b} + ${Math.min(a, b)})`),
    mk((target - (a + b) * bothH) / (2 * b), 'APPLIED_STEP_TWICE', `${target - (a + b) * bothH} ÷ (2 × ${b})`),
    mk((target - (a + b) * bothH) / b * 2, 'APPLIED_STEP_TWICE', `${target - (a + b) * bothH} ÷ ${b} × 2`),
    mk((target - (a + b) * bothH) / b + bothH, 'STOPPED_AT_INTERMEDIATE_TOTAL', `${target - (a + b) * bothH} ÷ ${b} + ${bothH}`),
    mk(target / (a * b), 'MULTIPLIED_COUNTS_INSTEAD_OF_RATE', `${target} ÷ (${a} × ${b})`)
  ]);
  return buildBase(ctx, {
    templateId: 'COMB_M_TOGETHER_SOLO',
    subskill: 'عمل مشترك ثم استمرار طرف واحد',
    difficulty: 'medium',
    question: `يعمل أ بمعدل ${a} وحدة/ساعة وب بمعدل ${b} وحدة/ساعة. عملا معًا ${u(bothH, 'hour', 'oblique')}، ثم توقف ب واستمر أ وحده حتى بلغ الإنجاز ${u(target, 'unit')}. كم ساعة عمل أ وحده؟`,
    correct, distractors, format: unitFormat('hour'),
    steps: [
      `الإنجاز المشترك = (${a} + ${b}) × ${bothH} = ${(a + b) * bothH}.`,
      `المتبقي = ${target} − ${(a + b) * bothH} = ${a * correct}.`,
      `زمن أ منفردًا بالساعات = ${a * correct} ÷ ${a} = ${correct}.`
    ],
    howToStart: 'قسّم السؤال إلى فترة مشتركة ثم فترة منفردة.',
    remember: 'كل مرحلة لها معدلها الخاص.',
    fastMethod: 'اطرح الإنجاز المشترك ثم اقسم المتبقي على معدل أ.',
    estimatedSteps: 3, conceptTags: ['combined-rate', 'stages'], parameters: params,
    oracle: {kind: 'constraint', answerKind: 'number', constraints: [eq(add(mul(add(a, b), bothH), mul(a, X)), target)]},
    askedUnknown: 'soloTimeAfterJoint', stageCount: 2,
    pedagogy: {
      targetSkill: 'STAGED_COMBINED_RATE', targetMisconception: 'USED_COMBINED_RATE_ON_FULL_TARGET',
      wrongMethodValue: target / (a + b),
      degenerateWhen: [{when: bothH === 0, note: 'no joint stage'}]
    },
    complexityFactors: {reasoningTransformations: 3, conceptCount: 2, stageCount: 2, reverseReasoning: 1, arithmeticBurden: 3},
    textParams: {essentialParams: ['rateA', 'rateB', 'jointHours', 'targetAmount']}
  });
}

function stagedTarget(ctx) {
  const {rng} = ctx;
  const a = rng.pick([12, 15, 18]);
  const b = rng.pick([8, 10, 12].filter(v => v !== a));
  const soloA = rng.pick([3, 4]);
  const togetherH = rng.pick([3, 4, 5]);
  const correct = rng.pick([3, 4, 5].filter(v => v !== soloA && v !== togetherH));
  // Same guard as above: keep the combined-rate shortcut genuinely wrong.
  if ((a + b) * togetherH === correct * a) return resample(ctx, stagedTarget);
  const target = a * soloA + (a + b) * togetherH + b * correct;
  const params = {rateA: a, rateB: b, soloAHours: soloA, jointHours: togetherH, targetAmount: target};
  const distractors = usable(ctx, [
    mk(target / b, 'USED_SINGLE_RATE_ON_FULL_TARGET', `${target} ÷ ${b}`),
    mk((target - a * soloA) / (a + b), 'USED_COMBINED_RATE_ON_FULL_TARGET', `(${target} − ${a * soloA}) ÷ ${a + b}`),
    mk(soloA + togetherH, 'STOPPED_AT_INTERMEDIATE_TOTAL', `${soloA} + ${togetherH}`),
    mk((target - (a + b) * togetherH) / b, 'MISSED_ONE_STAGE', `(${target} − ${(a + b) * togetherH}) ÷ ${b}`),
    mk((target - a * soloA - (a + b) * togetherH) / a, 'USED_ONLY_FIRST_RATE', `${b * correct} ÷ ${a}`),
    mk((target - a * soloA - (a + b) * togetherH) / (a + b), 'USED_COMBINED_RATE_ON_FULL_TARGET', `${b * correct} ÷ ${a + b}`),
    mk((target - a * soloA - (a + b) * togetherH) / (2 * b), 'APPLIED_STEP_TWICE', `${target - a * soloA - (a + b) * togetherH} ÷ (2 × ${b})`),
    mk(target / a, 'USED_SINGLE_RATE_ON_FULL_TARGET', `${target} ÷ ${a}`),
    mk((target - a * soloA) / b, 'MISSED_ONE_STAGE', `(${target} − ${a * soloA}) ÷ ${b}`),
    mk((target - a * soloA - (a + b) * togetherH) / b * 2, 'APPLIED_STEP_TWICE', `${target - a * soloA - (a + b) * togetherH} ÷ ${b} × 2`),
    mk(target / (a + b), 'USED_COMBINED_RATE_ON_FULL_TARGET', `${target} ÷ ${a + b}`)
  ]);
  return buildBase(ctx, {
    templateId: 'COMB_H_STAGED',
    subskill: 'ثلاث مراحل بمعدلات مختلفة',
    difficulty: 'hard',
    question: `ينجز أ ${a} وحدة/ساعة وب ${b} وحدة/ساعة. عمل أ وحده ${u(soloA, 'hour', 'oblique')}، ثم عملا معًا ${u(togetherH, 'hour', 'oblique')}، ثم استمر ب وحده حتى بلغ الإنجاز ${u(target, 'unit')}. كم ساعة عمل ب وحده في المرحلة الأخيرة؟`,
    correct, distractors, format: unitFormat('hour'),
    steps: [
      `إنجاز المرحلة الأولى = ${a} × ${soloA} = ${a * soloA}.`,
      `إنجاز المرحلة الثانية = (${a} + ${b}) × ${togetherH} = ${(a + b) * togetherH}.`,
      `المتبقي للمرحلة الأخيرة = ${target} − ${a * soloA} − ${(a + b) * togetherH} = ${b * correct}.`,
      `زمن ب منفردًا بالساعات = ${b * correct} ÷ ${b} = ${correct}.`
    ],
    howToStart: 'احسب إنجاز كل مرحلة بالترتيب.',
    remember: 'في ثلاث مراحل، اجعل كل فترة سطرًا مستقلًا ثم اطرح من الهدف.',
    fastMethod: 'الهدف ناقص المرحلتين الأوليين، ثم ÷ معدل ب.',
    estimatedSteps: 5, conceptTags: ['combined-rate', 'stages'], parameters: params,
    oracle: {
      kind: 'constraint', answerKind: 'number',
      constraints: [eq(add(mul(a, soloA), mul(add(a, b), togetherH), mul(b, X)), target)]
    },
    askedUnknown: 'finalSoloTime', stageCount: 3,
    pedagogy: {
      targetSkill: 'THREE_STAGE_RATES', targetMisconception: 'USED_COMBINED_RATE_ON_FULL_TARGET',
      wrongMethodValue: (target - a * soloA) / (a + b),
      degenerateWhen: [{when: a === b, note: 'equal rates collapse the staging distinction'}]
    },
    complexityFactors: {reasoningTransformations: 4, conceptCount: 2, stageCount: 3, reverseReasoning: 1, arithmeticBurden: 4, dependencyDepth: 2},
    textParams: {essentialParams: ['rateA', 'rateB', 'soloAHours', 'jointHours', 'targetAmount']}
  });
}

function threeRates(ctx) {
  const {rng} = ctx;
  const rates = rng.sample([6, 8, 10, 12, 15, 18, 20], 3);
  const h = rng.pick([3, 4, 5]);
  const sum = rates.reduce((x, y) => x + y, 0);
  const correct = sum * h;
  const params = {rateA: rates[0], rateB: rates[1], rateC: rates[2], hours: h};
  const distractors = usable(ctx, [
    mk(rates[0] * h, 'USED_ONLY_FIRST_RATE', `${rates[0]} × ${h}`),
    mk(rates[2] * h, 'USED_ONLY_SECOND_RATE', `${rates[2]} × ${h}`),
    mk((rates[0] + rates[1]) * h, 'MISSED_ONE_STAGE', `(${rates[0]} + ${rates[1]}) × ${h}`),
    mk(sum, 'STOPPED_AT_UNIT_RATE', `${rates.join(' + ')}`),
    mk(sum * (h + 1), 'OFF_BY_ONE_STEP', `${sum} × (${h} + 1)`),
    mk(sum * (h - 1), 'OFF_BY_ONE_STEP', `${sum} × (${h} − 1)`),
    mk(sum * h + sum, 'APPLIED_STEP_TWICE', `${sum} × ${h} + ${sum}`),
    mk(Math.round(sum / 3) * h, 'USED_ARITHMETIC_MEAN_OF_AVERAGES', `(${sum} ÷ 3) × ${h}`),
    mk(sum * h + rates[0] * h, 'RATE_APPLIED_TO_WRONG_COUNT', `${sum} × ${h} + ${rates[0]} × ${h}`),
    mk(sum * (h + 2), 'OFF_BY_ONE_STEP', `${sum} × (${h} + 2)`)
  ]);
  return buildBase(ctx, {
    templateId: 'COMB_H_THREE',
    subskill: 'ثلاثة معدلات تعمل معًا',
    difficulty: 'hard',
    question: `تعمل ثلاث آلات بمعدلات ${rates[0]} و${rates[1]} و${rates[2]} وحدة/ساعة. إذا عملت معًا ${u(h, 'hour', 'oblique')}، فكم وحدة تنتج؟`,
    correct, distractors, format: unitFormat('unit'),
    steps: [
      `المعدل المشترك في الساعة = ${rates.join(' + ')} = ${sum}.`,
      `الإنتاج الكلي = ${sum} × ${h} = ${correct}.`
    ],
    howToStart: 'اجمع المعدلات الثلاثة قبل ضرب الزمن.',
    remember: 'يمكن جمع أي عدد من المعدلات إذا كانت الوحدة الزمنية نفسها ويعمل الجميع معًا.',
    fastMethod: 'اجمع المعدلات ثم اضرب في الزمن.',
    estimatedSteps: 3, conceptTags: ['combined-rate'], parameters: params,
    oracle: {
      kind: 'constraint', answerKind: 'number',
      constraints: [eq(X, add(mul(rates[0], h), mul(rates[1], h), mul(rates[2], h)))]
    },
    askedUnknown: 'jointOutput', stageCount: 1,
    pedagogy: {
      targetSkill: 'ADD_THREE_RATES', targetMisconception: 'MISSED_ONE_STAGE',
      wrongMethodValue: (rates[0] + rates[1]) * h,
      degenerateWhen: [{when: rates[2] === 0, note: 'third machine contributes nothing'}]
    },
    complexityFactors: {reasoningTransformations: 2, conceptCount: 1, stageCount: 1, arithmeticBurden: 3},
    textParams: {essentialParams: ['rateA', 'rateB', 'rateC', 'hours']}
  });
}
