import {mk, usable, u, num, unitFormat, buildBase, eq, X, add, sub, mul, resample, bandPool, unitWordKam, composeSentences, sceneFor, rateOf} from './_shared.js';

export function generateCombinedRate({difficulty, rng, seed, engineVersion, telemetry, pinTemplate = null, pinTargets = null}) {
  const ctx = {difficulty, rng, seed, engineVersion, telemetry, pinTargets, family: 'combined_rate', family_ar: 'المعدل المشترك', category: 'المعدل المشترك'};
  // RC2-015. threeRates was declared hard while being one addition and one
  // multiplication — the RC1 audit flagged S5/28 for exactly that. The
  // recalibrated model scores it 5.80, between COMB_E_OUTPUT (5.30) and
  // COMB_E_TIME (7.10), both of which are declared easy and compute easy. So
  // easy is where it belongs; the declaration was wrong, not the template, and
  // the template itself is unaltered.
  // RC2.3-1. The catalogue, not a set of per-band pools: which of these is
  // eligible for the requested band is decided by the structural adjudication in
  // src/qa/structure.js, so a template cannot sit in a band nobody adjudicated.
  return bandPool(rng, 'combined_rate', difficulty, [
    ['COMB_E_OUTPUT', togetherOutput],
    ['COMB_E_THREE', threeRates],
    ['COMB_E_TIME', togetherTime],
    ['COMB_M_TOGETHER_SOLO', togetherThenSolo],
    ['COMB_M_SOLO_THEN', soloThenTogether],
    ['COMB_H_STAGED', stagedTarget],
    ['COMB_H_TWO_PUMPS', twoPumpsFromStages],
    ['COMB_H_TEAM_SIZE', teamSizeFromTotal],
    // RC2.9.5 §4. Three EASY readings of a joint rate the band did not hold:
    // one partner's share of what was produced, the time a target needs, and
    // one partner's own rate recovered from the joint one.
    ['COMB_E_SHARE_OF_OUTPUT', shareOfOutput],
    ['COMB_E_TIME_FOR_TARGET', timeForTarget],
    ['COMB_E_ONE_ALONE', oneRateFromJoint]
  ], pinTemplate)(ctx);
}

function togetherOutput(ctx) {
  const sc = sceneFor(ctx, 'production');
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
  const stem = composeSentences(ctx, `ينجز العامل أ ${rateOf(a, sc)}، وينجز العامل ب ${rateOf(b, sc)}. إذا عملا معًا ${u(h, 'hour', 'oblique')}، فكم ${unitWordKam(sc.out)} ينجزان؟`);
  return buildBase(ctx, {
    templateId: 'COMB_E_OUTPUT',
    scenario: sc.key,
    subskill: 'جمع معدلين خلال مدة معلومة',
    difficulty: 'easy',
    question: stem.text,
    stemStructure: stem.structure, informationOrder: stem.order,
    correct, distractors, format: unitFormat(sc.out),
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
  const sc = sceneFor(ctx, 'production');
  const {rng} = ctx;
  // RC2-011. The hours asked for came from four values.
  const a = rng.pick([8, 10, 12, 14, 15, 16, 18, 20]);
  const b = rng.pick([12, 15, 18, 20, 21, 24, 25, 28].filter(v => v !== a));
  const correct = rng.pick([2, 3, 4, 5, 6, 7, 8, 9, 10, 12]);
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
  const stem = composeSentences(ctx, `تنجز آلة أ ${rateOf(a, sc)}، وآلة ب ${rateOf(b, sc)}. إذا عملتا معًا، فكم ساعة تحتاجان لإنتاج ${u(target, sc.out)}؟`);
  return buildBase(ctx, {
    templateId: 'COMB_E_TIME',
    scenario: sc.key,
    subskill: 'جمع معدلين ثم إيجاد الزمن',
    difficulty: 'easy',
    question: stem.text,
    stemStructure: stem.structure, informationOrder: stem.order,
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
  const sc = sceneFor(ctx, 'production');
  const {rng} = ctx;
  // RC2-011. The solo stretch and the joint stretch are the two spans the
  // question states; both were drawn from three or four values, so the number of
  // hours the item could ask for was three or four however many times it ran.
  // The pools are widened at design time. Nothing here looks at an answer.
  const a = rng.pick([12, 15, 18, 20, 24, 25]);
  const b = rng.pick([6, 8, 9, 10, 12, 15, 16].filter(v => v !== a));
  const solo = rng.pick([2, 3, 4, 5, 6]);
  const correct = rng.pick([2, 3, 4, 5, 6, 7, 8, 9].filter(v => v !== solo));
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
  const stem = composeSentences(ctx, `ينجز العامل أ ${rateOf(a, sc)}، والعامل ب ${rateOf(b, sc)}. عمل أ وحده ${u(solo, 'hour', 'oblique')}، ثم عملا معًا حتى بلغ الإنجاز ${u(target, sc.out)}. كم ساعة عملا معًا؟`);
  return buildBase(ctx, {
    templateId: 'COMB_M_SOLO_THEN',
    scenario: sc.key,
    subskill: 'عمل منفرد أولًا ثم عمل مشترك',
    difficulty: 'hard',
    question: stem.text,
    stemStructure: stem.structure, informationOrder: stem.order,
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
  const sc = sceneFor(ctx, 'production');
  const {rng} = ctx;
  // RC2-011, as above: widen the two stated spans and the two stated rates.
  const a = rng.pick([8, 10, 12, 14, 15, 16, 18]);
  const b = rng.pick([12, 15, 18, 20, 21, 24, 25].filter(v => v !== a));
  const bothH = rng.pick([2, 3, 4, 5, 6]);
  const correct = rng.pick([2, 3, 4, 5, 6, 7, 8, 9].filter(v => v !== bothH));
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
  const stem = composeSentences(ctx, `يعمل أ بمعدل ${rateOf(a, sc)} وب بمعدل ${rateOf(b, sc)}. عملا معًا ${u(bothH, 'hour', 'oblique')}، ثم توقف ب واستمر أ وحده حتى بلغ الإنجاز ${u(target, sc.out)}. كم ساعة عمل أ وحده؟`);
  return buildBase(ctx, {
    templateId: 'COMB_M_TOGETHER_SOLO',
    scenario: sc.key,
    subskill: 'عمل مشترك ثم استمرار طرف واحد',
    difficulty: 'hard',
    question: stem.text,
    stemStructure: stem.structure, informationOrder: stem.order,
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
  const sc = sceneFor(ctx, 'production');
  const {rng} = ctx;
  // RC2-011. This was the narrowest draw in the engine: three candidate spans
  // with two of them excluded by the filter, so the third stretch had at most
  // one or two values to take and the answer space was three across the whole
  // corpus. All four stated quantities are widened.
  const a = rng.pick([12, 15, 16, 18, 20, 24]);
  const b = rng.pick([6, 8, 9, 10, 12, 14].filter(v => v !== a));
  const soloA = rng.pick([2, 3, 4, 5]);
  const togetherH = rng.pick([2, 3, 4, 5, 6]);
  const correct = rng.pick([2, 3, 4, 5, 6, 7, 8, 9].filter(v => v !== soloA && v !== togetherH));
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
  const stem = composeSentences(ctx, `ينجز أ ${rateOf(a, sc)} وب ${rateOf(b, sc)}. عمل أ وحده ${u(soloA, 'hour', 'oblique')}، ثم عملا معًا ${u(togetherH, 'hour', 'oblique')}، ثم استمر ب وحده حتى بلغ الإنجاز ${u(target, sc.out)}. كم ساعة عمل ب وحده في المرحلة الأخيرة؟`);
  return buildBase(ctx, {
    templateId: 'COMB_H_STAGED',
    scenario: sc.key,
    subskill: 'ثلاث مراحل بمعدلات مختلفة',
    difficulty: 'hard',
    question: stem.text,
    stemStructure: stem.structure, informationOrder: stem.order,
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
  const sc = sceneFor(ctx, 'production');
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
    // RC2-014: the mean is rounded before it is used, so the derivation shows the
    // rounded figure. Written as «(38 ÷ 3) × 3» it evaluated to 38 while the
    // option read 39, and a learner following it would not arrive at the option.
    mk(Math.round(sum / 3) * h, 'USED_ARITHMETIC_MEAN_OF_AVERAGES', `${Math.round(sum / 3)} × ${h}`),
    mk(sum * h + rates[0] * h, 'RATE_APPLIED_TO_WRONG_COUNT', `${sum} × ${h} + ${rates[0]} × ${h}`),
    mk(sum * (h + 2), 'OFF_BY_ONE_STEP', `${sum} × (${h} + 2)`)
  ]);
  const stem = composeSentences(ctx, `تعمل ثلاث آلات بمعدلات ${rates[0]} و${rates[1]} و${rateOf(rates[2], sc)}. إذا عملت معًا ${u(h, 'hour', 'oblique')}، فكم ${unitWordKam(sc.out)} تنتج؟`);
  return buildBase(ctx, {
    templateId: 'COMB_E_THREE',
    scenario: sc.key,
    subskill: 'ثلاثة معدلات تعمل معًا',
    difficulty: 'easy',
    question: stem.text,
    stemStructure: stem.structure, informationOrder: stem.order,
    correct, distractors, format: unitFormat(sc.out),
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

// ---------------------------------------------------------------------------
// RC2.4 — genuinely hard structures for this family.
//
// The three RC2.3 combined-rate templates all run the same accounting forward:
// a joint stage, a solo stage, a remainder, a division. Neither of the two below
// can be started that way.
// ---------------------------------------------------------------------------

/**
 * SIMULTANEOUS_CONSTRAINTS + COMPOSED_INVERSION.
 *
 * Two facts about two unknown rates: they sum to the joint rate, and a stated
 * pair of solo spans fills the tank between them. Neither can be evaluated on
 * its own, and the answer is a time, so the equation has to be formed in rates
 * and inverted back.
 */
function twoPumpsFromStages(ctx) {
  const sc = sceneFor(ctx, 'production');
  const {rng} = ctx;
  let found = null;
  for (let t = 0; t < 250; t++) {
    const joint = rng.pick([4, 6, 8, 10, 12]);
    const first = rng.pick([10, 12, 15, 18, 20, 24, 30, 36]);
    if (first <= joint) continue;
    // The second pump's solo time is a consequence of the first two, never a
    // third pick, so the three numbers cannot contradict each other.
    const secondNum = joint * first;
    const secondDen = first - joint;
    if (secondNum % secondDen !== 0) continue;
    const second = secondNum / secondDen;
    if (second === first) continue;
    const a = rng.int(1, first - 1);
    // b is what remains for the second pump once the first has done a hours.
    const bNum = second * (first - a);
    if (bNum % first !== 0) continue;
    const b = bNum / first;
    if (b <= 0 || b === a || b >= joint) continue;
    found = {joint, first, second, a, b};
    break;
  }
  if (!found) return resample(ctx, twoPumpsFromStages);
  const {joint, first, second, a, b} = found;
  // RC2.7-R3. Which pump's solo time is asked for is a different core
  // construction: the second is not a subtraction away from the first — it is a
  // second inversion, through the joint rate — and a reader who found one has
  // not found the other.
  const askSecond = rng.bool(0.45);
  const correct = askSecond ? second : first;
  const other = askSecond ? first : second;
  const params = {jointHours: joint, firstAloneHours: a, secondAloneHours: b};

  const distractors = usable(ctx, [
    mk(other, 'SWAPPED_THE_TWO_UNKNOWNS', `زمن المضخة الأخرى وحدها ${other}`, 3),
    mk(a + b, 'ADDED_TIMES_INSTEAD_OF_RATES', `${a} + ${b}`),
    mk(joint, 'USED_JOINT_TIME_AS_SOLO', `الزمن المشترك ${joint}`),
    mk(a, 'USED_GIVEN_VALUE_AS_ANSWER', `المدة المذكورة للأولى ${a}`),
    mk(2 * joint, 'APPLIED_STEP_TWICE', `${joint} × 2`),
    mk(joint + a, 'ADDED_TIMES_INSTEAD_OF_RATES', `${joint} + ${a}`),
    mk(a + b - joint, 'SUBTRACTED_TIMES_INSTEAD_OF_RATES', `${a} + ${b} − ${joint}`),
    mk(joint * (a - b), 'SOLVED_ONE_CONDITION_ONLY', `${joint} × (${a} − ${b})`),
    mk(a * b / joint, 'MULTIPLIED_COUNTS_INSTEAD_OF_RATE', `${a} × ${b} ÷ ${joint}`)
  ]);

  const stem = composeSentences(ctx, `تملأ مضختان خزانًا معًا في ${u(joint, 'hour', 'oblique')}. ولو عملت الأولى وحدها ${u(a, 'hour', 'oblique')} ثم أكملت الثانية وحدها ${u(b, 'hour', 'oblique')} لامتلأ الخزان أيضًا. كم ${unitWordKam('hour')} تحتاج ${askSecond ? 'الثانية' : 'الأولى'} وحدها لملئه؟`);
  return buildBase(ctx, {
    templateId: 'COMB_H_TWO_PUMPS',
    scenario: sc.key,
    subskill: askSecond ? 'زمن المضخة الثانية وحدها من زمن مشترك ومرحلتين منفردتين'
      : 'زمن مضخة وحدها من زمن مشترك ومرحلتين منفردتين',
    difficulty: 'hard',
    question: stem.text,
    stemStructure: stem.structure, informationOrder: stem.order,
    correct, distractors, format: unitFormat('hour'),
    steps: [
      `لو عملت المضختان معًا ${u(b, 'hour', 'oblique')} لملأتا ${b} ÷ ${joint} من الخزان.`,
      `في الحالة المذكورة عملت الثانية ${u(b, 'hour', 'oblique')} أيضًا، فالفرق بين الحالتين يخص الأولى وحدها: ${a} − ${b} = ${a - b}.`,
      `وهذا الفرق يقابل ما تبقى من الخزان في الحالة الأولى = 1 − ${b} ÷ ${joint}، أي ${joint} − ${b} = ${joint - b} من ${joint}.`,
      `إذن الأولى تملأ ${joint - b} من ${joint} في ${u(a - b, 'hour', 'oblique')}، فزمنها الكامل = ${a - b} × ${joint} ÷ ${joint - b} = ${first}.`,
      ...(askSecond
        ? [`ومعدل الثانية = ما يتبقى من المعدل المشترك بعد الأولى، فزمنها = ${joint} × ${first} ÷ (${first} − ${joint}) = ${correct}.`]
        : [])
    ],
    howToStart: 'قارن الحالتين: الفرق بينهما يخص طرفًا واحدًا فقط.',
    remember: 'عند وجود معدلين مجهولين، كل حالة وحدها لا تكفي؛ الحالتان معًا هما ما يحدد المعدلين.',
    fastMethod: 'اطرح الحالتين ليختفي أحد الطرفين، ثم اقرأ الجزء المتبقي من الخزان.',
    estimatedSteps: askSecond ? 5 : 4, conceptTags: ['combined-rate', 'two-unknowns', 'reciprocal'],
    parameters: {...params, firstPumpSolo: first},
    oracle: {
      kind: 'constraint', answerKind: 'number',
      constraints: [askSecond
        ? eq(mul(X, sub(first, joint)), mul(joint, first))
        : eq(mul(X, sub(joint, b)), mul(joint, sub(a, b)))]
    },
    askedUnknown: askSecond ? 'secondPumpSoloHours' : 'firstPumpSoloHours',
    stageCount: askSecond ? 4 : 3,
    pedagogy: {
      targetSkill: 'TWO_RATES_FROM_TWO_CASES', targetMisconception: 'ADDED_TIMES_INSTEAD_OF_RATES',
      wrongMethodValue: a + b
    },
    complexityFactors: {reasoningTransformations: 4, conceptCount: 3, equationSolving: 1, conditionCount: 2, reverseReasoning: 1, stageCount: 3, arithmeticBurden: 5},
    textParams: {essentialParams: ['jointHours', 'firstAloneHours', 'secondAloneHours']}
  });
}

/**
 * COMPOSED_INVERSION + CROSS_PART_INTEGRATION.
 *
 * The team size is never stated and appears inside two different products that
 * have to be summed before it can be recovered — one over the first span with
 * the original team, one over the second with a team that grew.
 */
function teamSizeFromTotal(ctx) {
  const sc = sceneFor(ctx, 'production');
  const {rng} = ctx;
  let found = null;
  for (let t = 0; t < 150; t++) {
    const rate = rng.pick([8, 10, 12, 14, 15, 18, 20]);
    const firstH = rng.pick([2, 3, 4, 5]);
    const secondH = rng.pick([2, 3, 4, 6]);
    if (firstH === secondH) continue;
    const team = rng.int(3, 9);
    const total = team * rate * firstH + (team + 1) * rate * secondH;
    // The slip is ignoring the newcomer; where that lands on the key the item
    // stops separating the two teams (Section 10).
    if (total === team * rate * (firstH + secondH)) continue;
    // RC2.4: the answer is a count of people, so the wrong options have to be
    // counts of people too. Drawn so that the two single-stage slips come out
    // whole — otherwise the count-unit rule demotes them, the set falls below
    // five plausible candidates and a fractional person fills the gap.
    if (total % (rate * firstH) !== 0) continue;
    const remainingWork = total - rate * secondH;
    if (remainingWork % (rate * secondH) !== 0) continue;
    if (remainingWork % (rate * firstH) !== 0) continue;
    found = {rate, firstH, secondH, team, total};
    break;
  }
  if (!found) return resample(ctx, teamSizeFromTotal);
  const {rate, firstH, secondH, team, total} = found;
  const perWorker = rate * (firstH + secondH);
  const newcomer = rate * secondH;
  const remaining = total - newcomer;
  const correct = team;
  const params = {ratePerWorker: rate, firstHours: firstH, secondHours: secondH, totalOutput: total};

  const distractors = usable(ctx, [
    // RC2.4: the answer is a count of people, so every candidate is one a learner
    // could write down as a team size. Two things follow.
    //
    // The unfinished totals — the remaining work, the newcomer's output, the
    // per-worker output — are real intermediates but they are output quantities
    // in the hundreds beside an answer of six, and an option nobody would mistake
    // for a team removes itself from the page.
    //
    // And «treated the team as unchanged» divides the total by one member's
    // output over both stages, a quotient that is never whole here because the
    // newcomer's share is not a multiple of it. The slip is real; its value is
    // not an answer. What stands in its place is the team as it ENDED, which is
    // whole, is the same confusion about which team the total belongs to, and is
    // what this item is targeted on.
    mk(team + 1, 'USED_NEW_TOTAL', `عدد أفراد الفريق بعد الانضمام ${team + 1}`, 3),
    mk(total / (rate * firstH), 'SOLVED_ONE_CONDITION_ONLY', `${total} ÷ (${rate} × ${firstH})`),
    mk(remaining / (rate * secondH), 'SOLVED_ONE_CONDITION_ONLY', `${remaining} ÷ (${rate} × ${secondH})`),
    mk(remaining / (rate * firstH), 'SOLVED_ONE_CONDITION_ONLY', `${remaining} ÷ (${rate} × ${firstH})`),
    mk(team - 1, 'OFF_BY_ONE_STEP', `${remaining} ÷ ${perWorker} − 1`),
    mk(team + 2, 'OFF_BY_ONE_STEP', `${remaining} ÷ ${perWorker} + 2`),
    mk(team * 2, 'APPLIED_STEP_TWICE', `${remaining} ÷ ${perWorker} × 2`)
  ]);

  const stem = composeSentences(ctx, `فريق أفراده متساوون في المعدل، ينجز كل فرد ${rateOf(rate, sc)}. عمل الفريق ${u(firstH, 'hour', 'oblique')}، ثم انضم إليه فرد واحد فعمل الجميع ${u(secondH, 'hour', 'oblique')} أخرى، فبلغ الإنجاز الكلي ${u(total, sc.out)}. كم فردًا كان في الفريق أولًا؟`);
  return buildBase(ctx, {
    templateId: 'COMB_H_TEAM_SIZE',
    scenario: sc.key,
    subskill: 'عدد أفراد الفريق من إنجاز مرحلتين',
    difficulty: 'hard',
    question: stem.text,
    stemStructure: stem.structure, informationOrder: stem.order,
    correct, distractors, format: unitFormat('person'),
    steps: [
      `إنجاز الفرد الواحد في المرحلتين معًا = ${rate} × (${firstH} + ${secondH}) = ${perWorker}.`,
      `الفرد الذي انضم عمل في المرحلة الثانية وحدها، فأنجز ${rate} × ${secondH} = ${newcomer}.`,
      `المتبقي على الفريق الأصلي = ${total} − ${newcomer} = ${remaining}.`,
      `عدد أفراد الفريق أولًا = ${remaining} ÷ ${perWorker} = ${correct}.`
    ],
    howToStart: 'اعزل إنجاز الفرد الذي انضم متأخرًا أولًا، فما بقي يخص الفريق الأصلي كله.',
    remember: 'عندما يتغير حجم الفريق في أثناء العمل لا يصح قسمة الإنجاز الكلي على معدل فرد واحد.',
    fastMethod: 'اطرح إنجاز المنضم الجديد من الإجمالي ثم اقسم على إنجاز الفرد في المرحلتين.',
    estimatedSteps: 4, conceptTags: ['combined-rate', 'team-change', 'reverse'], parameters: params,
    oracle: {
      kind: 'constraint', answerKind: 'number',
      constraints: [eq(add(mul(X, rate, firstH), mul(add(X, 1), rate, secondH)), total)]
    },
    askedUnknown: 'initialTeamSize', stageCount: 3,
    // Givens-derived: even if every member had worked only the second stage the
    // team could not be larger than this, whatever the answer turns out to be.
    answerBounds: {between: [1, total / (rate * secondH)]},
    pedagogy: {
      targetSkill: 'TEAM_SIZE_FROM_TWO_STAGES', targetMisconception: 'USED_NEW_TOTAL',
      wrongMethodValue: team + 1
    },
    complexityFactors: {reasoningTransformations: 4, conceptCount: 3, reverseReasoning: 1, equationSolving: 1, stageCount: 3, arithmeticBurden: 5},
    textParams: {essentialParams: ['ratePerWorker', 'firstHours', 'secondHours', 'totalOutput']}
  });
}

/** RC2.9.5 §4. EASY: how much of the joint output one partner made. */
function shareOfOutput(ctx) {
  const {rng} = ctx;
  const aRate = rng.pick([4, 5, 6, 8]);
  const bRate = rng.pick([3, 7, 9, 10].filter(v => v !== aRate));
  const hours = rng.pick([3, 4, 5, 6]);
  const correct = aRate * hours;
  const joint = (aRate + bRate) * hours;
  const distractors = usable(ctx, [
    mk(joint, 'STOPPED_AT_INTERMEDIATE_TOTAL', `(${aRate} + ${bRate}) × ${hours}`),
    mk(bRate * hours, 'ANSWERED_THE_OTHER_COMPONENT', `${bRate} × ${hours}`),
    mk(joint / 2, 'ASSUMED_EQUAL_SHARES', `(${aRate} + ${bRate}) × ${hours} ÷ 2`),
    mk(aRate, 'STOPPED_AT_UNIT_RATE', `المعدل المعطى ${aRate}`),
    mk(aRate * (hours - 1), 'OFF_BY_ONE_STEP', `${aRate} × (${hours} − 1)`),
    mk(aRate * (hours + 1), 'OFF_BY_ONE_STEP', `${aRate} × (${hours} + 1)`),
    mk(joint - correct * 2, 'APPLIED_STEP_TWICE', `${joint} − ${correct} × 2`)
  ], {maxDecimals: 2});
  const stem = composeSentences(ctx,
    `تعمل آلتان معًا ${u(hours, 'hour')}. تنتج الأولى ${u(aRate, 'piecePerHour')} وتنتج الثانية ${u(bRate, 'piecePerHour')}. كم قطعة أنتجت الآلة الأولى وحدها؟`);
  return buildBase(ctx, {
    templateId: 'COMB_E_SHARE_OF_OUTPUT',
    subskill: 'نصيب أحد الطرفين من الإنتاج المشترك',
    difficulty: 'easy',
    question: stem.text, stemStructure: stem.structure, informationOrder: stem.order,
    correct, distractors, format: unitFormat('piece'),
    steps: [`إنتاج الآلة الأولى = ${aRate} × ${hours} = ${correct}.`],
    howToStart: 'السؤال عن آلة واحدة، فاضرب معدلها وحدها في الزمن.',
    remember: 'الإنتاج المشترك لا يلزم لحساب نصيب طرف واحد.',
    fastMethod: `${aRate} × ${hours}.`,
    estimatedSteps: 1, conceptTags: ['combined-rate', 'share'],
    parameters: {firstRate: aRate, secondRate: bRate, hours},
    oracle: {kind: 'constraint', answerKind: 'number', constraints: [eq(X, mul(aRate, hours))]},
    askedUnknown: 'shareOfJointOutput', stageCount: 1,
    pedagogy: {targetSkill: 'ONE_PARTNER_OUTPUT', targetMisconception: 'STOPPED_AT_INTERMEDIATE_TOTAL',
      wrongMethodValue: joint},
    complexityFactors: {reasoningTransformations: 1, conceptCount: 1, stageCount: 1, arithmeticBurden: 1},
    textParams: {essentialParams: ['firstRate', 'secondRate', 'hours']}
  });
}

/** RC2.9.5 §4. EASY: the time a joint rate needs to reach a stated target. */
function timeForTarget(ctx) {
  const {rng} = ctx;
  const aRate = rng.pick([3, 4, 6, 7]);
  const bRate = rng.pick([2, 5, 8, 9].filter(v => v !== aRate));
  const together = aRate + bRate;
  const hours = rng.pick([4, 5, 6, 7, 8]);
  const target = together * hours;
  const correct = hours;
  const distractors = usable(ctx, [
    mk(target / aRate, 'USED_ONLY_FIRST_RATE', `${target} ÷ ${aRate}`),
    mk(target / bRate, 'USED_ONLY_SECOND_RATE', `${target} ÷ ${bRate}`),
    mk(together, 'STOPPED_AT_UNIT_RATE', `${aRate} + ${bRate}`),
    mk(target, 'USED_GIVEN_VALUE_AS_ANSWER', `الهدف المعطى ${target}`),
    mk(hours + 1, 'OFF_BY_ONE_STEP', `${target} ÷ ${together} + 1`),
    mk(hours - 1, 'OFF_BY_ONE_STEP', `${target} ÷ ${together} − 1`),
    mk(target / together / 2, 'APPLIED_STEP_TWICE', `${target} ÷ ${together} ÷ 2`)
  ], {maxDecimals: 2});
  const stem = composeSentences(ctx,
    `في مشغل خياطة تنتج العاملة الأولى ${u(aRate, 'shirtPerHour')} وتنتج الثانية ${u(bRate, 'shirtPerHour')}، وتعملان معًا. كم ساعة يلزمهما لإنتاج ${u(target, 'shirt')}؟`);
  return buildBase(ctx, {
    templateId: 'COMB_E_TIME_FOR_TARGET',
    subskill: 'زمن بلوغ هدف بمعدل مشترك',
    difficulty: 'easy',
    question: stem.text, stemStructure: stem.structure, informationOrder: stem.order,
    correct, distractors, format: unitFormat('hour'),
    steps: [
      `المعدل المشترك = ${aRate} + ${bRate} = ${together}.`,
      `الزمن = ${target} ÷ ${together} = ${correct}.`
    ],
    howToStart: 'اجمع المعدلين أولًا، ثم اقسم الهدف على المجموع.',
    remember: 'المعدلات المتوازية تُجمع، والزمن يُحسب بعد الجمع لا قبله.',
    fastMethod: `${target} ÷ (${aRate} + ${bRate}).`,
    estimatedSteps: 2, conceptTags: ['combined-rate', 'time'],
    parameters: {firstRate: aRate, secondRate: bRate, targetOutput: target},
    oracle: {kind: 'constraint', answerKind: 'number',
      constraints: [eq(mul(X, add(aRate, bRate)), target)]},
    askedUnknown: 'timeForJointTarget', stageCount: 2,
    pedagogy: {targetSkill: 'JOINT_RATE_TIME', targetMisconception: 'USED_ONLY_FIRST_RATE',
      wrongMethodValue: target / aRate},
    complexityFactors: {reasoningTransformations: 2, conceptCount: 1, stageCount: 2, arithmeticBurden: 2},
    textParams: {essentialParams: ['firstRate', 'secondRate', 'targetOutput']}
  });
}

/** RC2.9.5 §4. EASY: one rate recovered from the joint rate and the other. */
function oneRateFromJoint(ctx) {
  const {rng} = ctx;
  const known = rng.pick([4, 5, 6, 7, 9]);
  const correct = rng.pick([3, 8, 10, 12].filter(v => v !== known));
  const joint = known + correct;
  const distractors = usable(ctx, [
    mk(joint, 'USED_GIVEN_VALUE_AS_ANSWER', `المعدل المشترك المعطى ${joint}`),
    mk(known, 'ANSWERED_THE_OTHER_COMPONENT', `المعدل المعطى ${known}`),
    mk(joint / 2, 'ASSUMED_EQUAL_SHARES', `${joint} ÷ 2`),
    mk(joint * known, 'MULTIPLIED_INSTEAD_OF_DIVIDED', `${joint} × ${known}`),
    mk(joint / known, 'REVERSED_DIRECT_PROPORTION', `${joint} ÷ ${known}`),
    mk(correct + 1, 'OFF_BY_ONE_STEP', `${joint} − ${known} + 1`),
    mk(correct - 1, 'OFF_BY_ONE_STEP', `${joint} − ${known} − 1`)
  ], {maxDecimals: 2});
  const stem = composeSentences(ctx,
    `المعطيات: آلتا تعبئة تنتجان معًا ${u(joint, 'bottlePerHour')}؛ الأولى وحدها تنتج ${u(known, 'bottlePerHour')}. المطلوب: معدل الآلة الثانية وحدها.`);
  return buildBase(ctx, {
    templateId: 'COMB_E_ONE_ALONE',
    subskill: 'استخراج معدل آلة من المعدل المشترك',
    difficulty: 'easy',
    question: stem.text, stemStructure: stem.structure, informationOrder: stem.order,
    correct, distractors, format: unitFormat('bottlePerHour'),
    steps: [`معدل الثانية = ${joint} − ${known} = ${correct}.`],
    howToStart: 'المعدل المشترك مجموع المعدلين، فاطرح المعروف منه.',
    remember: 'ما يُجمع في الاتجاه الأول يُطرح في الاتجاه العكسي.',
    fastMethod: `${joint} − ${known}.`,
    estimatedSteps: 1, conceptTags: ['combined-rate', 'decompose'],
    parameters: {jointRate: joint, knownRate: known},
    oracle: {kind: 'constraint', answerKind: 'number', constraints: [eq(add(X, known), joint)]},
    askedUnknown: 'otherRateFromJoint', stageCount: 1,
    pedagogy: {targetSkill: 'RATE_FROM_JOINT', targetMisconception: 'ASSUMED_EQUAL_SHARES',
      wrongMethodValue: joint / 2},
    complexityFactors: {reasoningTransformations: 1, conceptCount: 1, reverseReasoning: 1, stageCount: 1, arithmeticBurden: 1},
    textParams: {essentialParams: ['jointRate', 'knownRate']}
  });
}
