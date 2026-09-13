import {Fraction} from '../qa/fraction.js';
import {mk, usable, u, num, unitFormat, buildBase, eq, gt, gte, isInt, X, add, sub, mul, factorLine, resample, adj, riseByPercentPhrase, bandPool, composeSentences, sceneFor, unitWordKam, pastVerb} from './_shared.js';

export function generateMachines({difficulty, rng, seed, engineVersion, telemetry, pinTemplate = null, pinTargets = null}) {
  const ctx = {difficulty, rng, seed, engineVersion, telemetry, pinTargets, family: 'machines', family_ar: 'الآلات والإنتاج', category: 'الآلات والإنتاج'};
  // RC2.3-1. The catalogue, not a set of per-band pools: which of these is
  // eligible for the requested band is decided by the structural adjudication in
  // src/qa/structure.js, so a template cannot sit in a band nobody adjudicated.
  return bandPool(rng, 'machines', difficulty, [
    ['MACH_E_HOURS', machineHours],
    ['MACH_E_REQUIRED', requiredMachines],
    ['MACH_M_STOP', oneStops],
    ['MACH_M_NEW_FAST', newMachineFaster],
    ['MACH_M_SUBSET_UP', subsetUpgrade],
    ['MACH_H_TWO_TYPES', twoTypesCombined],
    ['MACH_H_STAGE_UP', stageChange],
    ['MACH_H_TWO_CONFIG', twoConfigurations],
    ['MACH_H_STOPPAGE_TIME', stoppageTime],
    // RC2.7-3. A smallest admissible count.
    ['MACH_H_MIN_SECOND_TYPE', minimumSecondType]
  ], pinTemplate)(ctx);
}

function machineHours(ctx) {
  const sc = sceneFor(ctx, 'production');
  const {rng} = ctx;
  const machines = rng.pick([3, 4, 5, 6]);
  const hours = rng.pick([3, 4, 5, 6]);
  const rate = rng.pick([10, 12, 15, 20, 25]);
  const total = machines * hours * rate;
  const newMachines = rng.pick([3, 4, 5, 6].filter(v => v !== machines));
  const newHours = rng.pick([2, 3, 4].filter(v => v !== hours));
  const correct = newMachines * newHours * rate;
  const params = {machines, hours, totalOutput: total, newMachines, newHours};
  const distractors = usable(ctx, [
    mk(rate, 'STOPPED_AT_UNIT_RATE', `${total} ÷ (${machines} × ${hours})`),
    mk(total, 'USED_GIVEN_VALUE_AS_ANSWER', `الإنتاج المعطى ${total}`),
    mk(newMachines * hours * rate, 'RATE_APPLIED_TO_WRONG_COUNT', `${newMachines} × ${hours} × ${rate}`),
    mk(machines * newHours * rate, 'RATE_APPLIED_TO_WRONG_COUNT', `${machines} × ${newHours} × ${rate}`),
    mk(total + correct, 'USED_ORIGINAL_TOTAL', `${total} + ${correct}`),
    mk(rate * (newMachines + newHours), 'MULTIPLIED_COUNTS_INSTEAD_OF_RATE', `${rate} × (${newMachines} + ${newHours})`),
    // RC2-012: deepened so six options can be filled without padding.
    mk(total * newMachines / machines, 'MISSED_ONE_STAGE', `${total} × ${newMachines} ÷ ${machines}`),
    mk(total * newHours / hours, 'MISSED_ONE_STAGE', `${total} × ${newHours} ÷ ${hours}`),
    mk(total * machines * hours / (newMachines * newHours), 'REVERSED_DIRECT_PROPORTION', `${total} × ${machines} × ${hours} ÷ (${newMachines} × ${newHours})`)
  ]);
  const stem = composeSentences(ctx, `تنتج ${u(machines, 'machine')} متطابقة في الإنتاجية ${u(total, sc.out)} خلال ${u(hours, 'hour', 'oblique')}. كم ${unitWordKam(sc.out)} تنتج ${u(newMachines, 'machine')} من النوع نفسه خلال ${u(newHours, 'hour', 'oblique')}؟`);
  return buildBase(ctx, {
    templateId: 'MACH_E_HOURS',
    scenario: sc.key,
    subskill: 'معدل آلة واحدة من آلة-ساعة',
    difficulty: 'medium',
    question: stem.text,
    stemStructure: stem.structure, informationOrder: stem.order,
    correct, distractors, format: unitFormat(sc.out),
    steps: [
      `إجمالي وحدات آلة-ساعة = ${machines} × ${hours} = ${machines * hours}.`,
      `إنتاج الآلة الواحدة في الساعة = ${total} ÷ ${machines * hours} = ${rate}.`,
      `الإنتاج المطلوب = ${newMachines} × ${newHours} × ${rate} = ${correct}.`
    ],
    howToStart: 'استخرج إنتاج آلة واحدة في ساعة واحدة.',
    remember: 'وحدة آلة-ساعة تجعل مسائل الإنتاج مباشرة.',
    fastMethod: 'المعدل للوحدة × عدد الآلات × الزمن.',
    estimatedSteps: 3, conceptTags: ['machine-rate'], parameters: params,
    oracle: {
      kind: 'constraint', answerKind: 'number',
      constraints: [eq(mul(X, machines, hours), mul(total, newMachines, newHours))]
    },
    askedUnknown: 'outputForNewSetup', stageCount: 2,
    pedagogy: {
      targetSkill: 'MACHINE_HOUR_UNIT', targetMisconception: 'RATE_APPLIED_TO_WRONG_COUNT',
      wrongMethodValue: newMachines * hours * rate,
      degenerateWhen: [{when: newHours === hours, note: 'unchanged hours hide the machine-hour idea'}]
    },
    complexityFactors: {reasoningTransformations: 3, conceptCount: 2, stageCount: 2, arithmeticBurden: 3},
    textParams: {essentialParams: ['machines', 'hours', 'totalOutput', 'newMachines', 'newHours']}
  });
}

function requiredMachines(ctx) {
  const sc = sceneFor(ctx, 'production');
  const {rng} = ctx;
  // RC2-011. The number of machines asked for was drawn from four values, one
  // of which the filter often removed.
  const machines = rng.pick([3, 4, 5, 6, 8, 9, 10]);
  const hours = rng.pick([3, 4, 5, 6, 8]);
  const rate = rng.pick([8, 10, 12, 15, 16, 20, 24, 25]);
  const total = machines * hours * rate;
  const targetHours = rng.pick([2, 3, 4, 5, 6].filter(v => v !== hours));
  const correct = rng.pick([3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 15, 16].filter(v => v !== machines));
  const target = correct * targetHours * rate;
  const params = {machines, hours, totalOutput: total, targetOutput: target, targetHours};
  const distractors = usable(ctx, [
    mk(machines, 'USED_GIVEN_VALUE_AS_ANSWER', `عدد الآلات المعطى ${machines}`),
    mk(target / rate, 'STOPPED_AT_INTERMEDIATE_TOTAL', `${target} ÷ ${rate}`),
    mk(target / (rate * hours), 'RATE_APPLIED_TO_WRONG_COUNT', `${target} ÷ (${rate} × ${hours})`),
    mk(rate, 'STOPPED_AT_UNIT_RATE', `${total} ÷ (${machines} × ${hours})`),
    mk(machines + correct, 'USED_ORIGINAL_TOTAL', `${machines} + ${correct}`),
    mk(machines * targetHours / hours, 'REVERSED_DIRECT_PROPORTION', `${machines} × ${targetHours} ÷ ${hours}`),
    mk(target / total * machines * hours, 'RATE_APPLIED_TO_WRONG_COUNT', `${target} ÷ ${total} × ${machines} × ${hours}`),
    mk(target / (total / machines), 'MISSED_ONE_STAGE', `${target} ÷ (${total} ÷ ${machines})`),
    mk(machines * target / total, 'MISSED_ONE_STAGE', `${machines} × ${target} ÷ ${total}`),
    mk(target / (rate * targetHours) * 2, 'APPLIED_STEP_TWICE', `${target} ÷ (${rate} × ${targetHours}) × 2`),
    mk(target / rate / targetHours + machines, 'ADDED_INSTEAD_OF_SCALING', `${target} ÷ ${rate} ÷ ${targetHours} + ${machines}`)
  ]);
  const stem = composeSentences(ctx, `تنتج ${u(machines, 'machine')} متطابقة في الإنتاجية ${u(total, sc.out)} خلال ${u(hours, 'hour', 'oblique')}. كم آلة نحتاج لإنتاج ${u(target, sc.out)} خلال ${u(targetHours, 'hour', 'oblique')}؟`);
  return buildBase(ctx, {
    templateId: 'MACH_E_REQUIRED',
    scenario: sc.key,
    subskill: 'إيجاد عدد الآلات المطلوبة',
    difficulty: 'medium',
    question: stem.text,
    stemStructure: stem.structure, informationOrder: stem.order,
    correct, distractors, format: unitFormat('machine'),
    steps: [
      `إنتاج الآلة الواحدة في الساعة = ${total} ÷ (${machines} × ${hours}) = ${rate}.`,
      `إنتاج الآلة الواحدة في المدة المطلوبة = ${rate} × ${targetHours} = ${rate * targetHours}.`,
      `عدد الآلات = ${target} ÷ ${rate * targetHours} = ${correct}.`
    ],
    howToStart: 'احسب معدل آلة واحدة أولًا.',
    remember: 'عدد الآلات = الإنتاج المطلوب ÷ إنتاج آلة واحدة خلال الزمن المتاح.',
    fastMethod: 'معدل الوحدة ثم اقسم الهدف على إنتاج الوحدة.',
    estimatedSteps: 3, conceptTags: ['machine-rate', 'reverse'], parameters: params,
    oracle: {
      kind: 'constraint', answerKind: 'number',
      constraints: [eq(mul(X, total, targetHours), mul(target, machines, hours))]
    },
    askedUnknown: 'machinesForTarget', stageCount: 2,
    pedagogy: {
      targetSkill: 'MACHINE_HOUR_UNIT', targetMisconception: 'RATE_APPLIED_TO_WRONG_COUNT',
      wrongMethodValue: target / (rate * hours),
      degenerateWhen: [{when: targetHours === hours, note: 'unchanged window hides the machine-hour idea'}]
    },
    complexityFactors: {reasoningTransformations: 3, conceptCount: 2, reverseReasoning: 1, stageCount: 2, arithmeticBurden: 3},
    textParams: {essentialParams: ['machines', 'hours', 'totalOutput', 'targetOutput', 'targetHours']}
  });
}

function newMachineFaster(ctx) {
  const sc = sceneFor(ctx, 'production');
  const {rng} = ctx;
  const machines = rng.pick([3, 4, 5]);
  const hours = rng.pick([4, 5, 6]);
  const oldRate = rng.pick([12, 16, 20, 24]);
  const total = machines * hours * oldRate;
  const pct = rng.pick([25, 50]);
  const {factor, text: factorText} = factorLine(pct, 'up', 'معامل السرعة');
  const newRate = Fraction.from(oldRate).mul(factor);
  if (!newRate.isInteger) return resample(ctx, newMachineFaster);
  const targetH = rng.pick([2, 3, 4]);
  const newRateN = newRate.toNumber();
  const correct = (oldRate + newRateN) * targetH;
  const params = {machines, hours, totalOutput: total, fasterPercent: pct, targetHours: targetH};
  const distractors = usable(ctx, [
    mk(2 * oldRate * targetH, 'IGNORED_UPGRADE', `2 × ${oldRate} × ${targetH}`),
    mk(2 * newRateN * targetH, 'UPGRADED_ALL_INSTEAD_OF_SOME', `2 × ${newRateN} × ${targetH}`),
    mk(newRateN * targetH, 'USED_ONLY_SECOND_RATE', `${newRateN} × ${targetH}`),
    mk(oldRate * targetH, 'USED_ONLY_FIRST_RATE', `${oldRate} × ${targetH}`),
    mk((oldRate + newRateN) * hours, 'RATE_APPLIED_TO_WRONG_COUNT', `(${oldRate} + ${newRateN}) × ${hours}`),
    mk(oldRate + newRateN, 'STOPPED_AT_UNIT_RATE', `${oldRate} + ${newRateN}`)
  ]);
  const stem = composeSentences(ctx, `تنتج ${u(machines, 'machine')} متطابقة في الإنتاجية ${u(total, sc.out)} خلال ${u(hours, 'hour', 'oblique')}. آلة جديدة تنتج في الساعة أكثر من الآلة القديمة ${riseByPercentPhrase(pct)}. كم ${unitWordKam(sc.out)} تنتج آلة قديمة واحدة وآلة جديدة واحدة معًا خلال ${u(targetH, 'hour', 'oblique')}؟`);
  return buildBase(ctx, {
    templateId: 'MACH_M_NEW_FAST',
    scenario: sc.key,
    subskill: 'آلة قديمة وآلة أسرع بنسبة معلومة',
    difficulty: 'hard',
    question: stem.text,
    stemStructure: stem.structure, informationOrder: stem.order,
    correct, distractors, format: unitFormat(sc.out),
    steps: [
      `معدل الآلة القديمة في الساعة = ${total} ÷ (${machines} × ${hours}) = ${oldRate}.`,
      factorText,
      `معدل الآلة الجديدة = ${oldRate} × ${factor.toDecimalString()} = ${newRateN}.`,
      `المعدل معًا في الساعة = ${oldRate} + ${newRateN} = ${oldRate + newRateN}.`,
      `الإنتاج = ${oldRate + newRateN} × ${targetH} = ${correct}.`
    ],
    howToStart: 'استخرج معدل الآلة القديمة ثم عدّل معدل الجديدة.',
    remember: 'لا تطبق نسبة الزيادة على الإنتاج الكلي إذا كانت آلة واحدة فقط مختلفة.',
    fastMethod: 'اجمع معدلي الآلتين ثم اضرب في الزمن.',
    estimatedSteps: 4, conceptTags: ['machine-rate', 'percentage'], parameters: params,
    oracle: {
      kind: 'constraint', answerKind: 'number',
      constraints: [eq(mul(X, machines, hours, 100), mul(total, targetH, add(200, pct)))]
    },
    askedUnknown: 'mixedPairOutput', stageCount: 3,
    pedagogy: {
      targetSkill: 'MIXED_RATES', targetMisconception: 'IGNORED_UPGRADE',
      wrongMethodValue: 2 * oldRate * targetH,
      degenerateWhen: [{when: pct === 0, note: 'the new machine is not actually faster'}]
    },
    complexityFactors: {reasoningTransformations: 4, conceptCount: 2, stageCount: 3, arithmeticBurden: 4},
    textParams: {essentialParams: ['machines', 'hours', 'totalOutput', 'fasterPercent', 'targetHours']}
  });
}

function oneStops(ctx) {
  const sc = sceneFor(ctx, 'production');
  const {rng} = ctx;
  const machines = rng.pick([4, 5, 6]);
  const rate = rng.pick([12, 15, 20, 25]);
  const h1 = rng.pick([3, 4, 5]);
  const h2 = rng.pick([3, 4, 5].filter(v => v !== h1));
  const stopped = rng.pick([1, 2]);
  if (stopped >= machines) return resample(ctx, oneStops);
  const correct = machines * rate * h1 + (machines - stopped) * rate * h2;
  const params = {machines, hourlyRate: rate, firstHours: h1, secondHours: h2, stoppedMachines: stopped};
  const distractors = usable(ctx, [
    mk(machines * rate * (h1 + h2), 'IGNORED_STOPPAGE', `${machines} × ${rate} × (${h1} + ${h2})`),
    mk((machines - stopped) * rate * (h1 + h2), 'FAILED_TO_UPDATE_COUNT', `${machines - stopped} × ${rate} × (${h1} + ${h2})`),
    mk(machines * rate * h1, 'STOPPED_AFTER_FIRST_STAGE', `${machines} × ${rate} × ${h1}`),
    mk((machines - stopped) * rate * h2, 'USED_ONLY_LAST_STAGE', `${machines - stopped} × ${rate} × ${h2}`),
    mk(machines * rate * h2 + (machines - stopped) * rate * h1, 'RATE_APPLIED_TO_WRONG_COUNT', `${machines} × ${rate} × ${h2} + ${machines - stopped} × ${rate} × ${h1}`),
    mk(stopped * rate * (h1 + h2), 'USED_ONLY_LAST_STAGE', `${stopped} × ${rate} × (${h1} + ${h2})`),
    mk((machines - stopped) * rate * h1, 'FAILED_TO_UPDATE_COUNT', `${machines - stopped} × ${rate} × ${h1}`),
    mk(machines * rate * h1 + machines * rate * h2, 'IGNORED_STOPPAGE', `${machines} × ${rate} × ${h1} + ${machines} × ${rate} × ${h2}`),
    mk(rate * (h1 + h2), 'STOPPED_AT_UNIT_RATE', `${rate} × (${h1} + ${h2})`)
  ]);
  const stem = composeSentences(ctx, `تنتج كل آلة من ${u(machines, 'machine')} ${rate} ${sc.rateWord}. عملت الآلات كلها ${u(h1, 'hour', 'oblique')}، ثم توقفت ${u(stopped, 'machine')} وعملت البقية ${u(h2, 'hour', 'oblique')} ${adj(h2, 'hour', 'إضافي')}. كم ${unitWordKam(sc.out)} ${pastVerb(sc.out, 'أُنتج', 'أُنتجت')}؟`);
  return buildBase(ctx, {
    templateId: 'MACH_M_STOP',
    scenario: sc.key,
    subskill: 'توقف آلات أثناء جزء من زمن العمل',
    difficulty: 'medium',
    question: stem.text,
    stemStructure: stem.structure, informationOrder: stem.order,
    correct, distractors, format: unitFormat(sc.out),
    steps: [
      `إنتاج المرحلة الأولى = ${machines} × ${rate} × ${h1} = ${machines * rate * h1}.`,
      `عدد الآلات العاملة بعد التوقف = ${machines} − ${stopped} = ${machines - stopped}.`,
      `إنتاج المرحلة الثانية = ${machines - stopped} × ${rate} × ${h2} = ${(machines - stopped) * rate * h2}.`,
      `الإجمالي = ${machines * rate * h1} + ${(machines - stopped) * rate * h2} = ${correct}.`
    ],
    howToStart: 'قسّم الزمن إلى مرحلتين قبل وبعد التوقف.',
    remember: 'عندما يتغير عدد الآلات، احسب كل فترة منفصلة.',
    fastMethod: 'إنتاج المرحلة الأولى + إنتاج المرحلة الثانية.',
    estimatedSteps: 3, conceptTags: ['machine-rate', 'stages'], parameters: params,
    oracle: {
      kind: 'constraint', answerKind: 'number',
      constraints: [eq(X, add(mul(machines, rate, h1), mul(machines - stopped, rate, h2)))]
    },
    askedUnknown: 'totalAcrossStages', stageCount: 2,
    pedagogy: {
      targetSkill: 'STAGED_MACHINE_COUNT', targetMisconception: 'IGNORED_STOPPAGE',
      wrongMethodValue: machines * rate * (h1 + h2),
      degenerateWhen: [{when: stopped === 0, note: 'no machine actually stops'}]
    },
    complexityFactors: {reasoningTransformations: 3, conceptCount: 2, stageCount: 2, arithmeticBurden: 3},
    textParams: {derivedFromParams: [], essentialParams: ['machines', 'hourlyRate', 'firstHours', 'secondHours']}
  });
}

function subsetUpgrade(ctx) {
  const sc = sceneFor(ctx, 'production');
  const {rng} = ctx;
  const machines = rng.pick([4, 5, 6]);
  const hours = rng.pick([4, 5, 6]);
  const rate = rng.pick([15, 20, 25]);
  const upgraded = rng.pick([1, 2, 3].filter(v => v < machines));
  const pct = rng.pick([20, 25, 50]);
  const {factor, text: factorText} = factorLine(pct, 'up', 'معامل التطوير');
  const newRate = Fraction.from(rate).mul(factor);
  if (!newRate.isInteger) return resample(ctx, subsetUpgrade);
  const newRateN = newRate.toNumber();
  const combined = upgraded * newRateN + (machines - upgraded) * rate;
  const correct = combined * hours;
  const params = {machines, hourlyRate: rate, upgradedMachines: upgraded, upgradePercent: pct, hours};
  const distractors = usable(ctx, [
    mk(machines * newRateN * hours, 'UPGRADED_ALL_INSTEAD_OF_SOME', `${machines} × ${newRateN} × ${hours}`),
    mk(machines * rate * hours, 'IGNORED_UPGRADE', `${machines} × ${rate} × ${hours}`),
    mk(upgraded * newRateN * hours, 'USED_ONLY_SECOND_RATE', `${upgraded} × ${newRateN} × ${hours}`),
    mk((machines - upgraded) * rate * hours, 'USED_ONLY_FIRST_RATE', `${machines - upgraded} × ${rate} × ${hours}`),
    mk(combined, 'STOPPED_AT_UNIT_RATE', `${upgraded} × ${newRateN} + ${machines - upgraded} × ${rate}`),
    mk(combined * (hours + 1), 'OFF_BY_ONE_STEP', `${combined} × (${hours} + 1)`)
  ]);
  const stem = composeSentences(ctx, `تعمل ${u(machines, 'machine')} بمعدل ${rate} ${sc.rateWord} لكل آلة. طُورت ${u(upgraded, 'machine')} منها فزادت إنتاجيتها ${riseByPercentPhrase(pct)} وبقيت البقية كما هي. كم ${unitWordKam(sc.out)} تنتج المجموعة خلال ${u(hours, 'hour', 'oblique')}؟`);
  return buildBase(ctx, {
    templateId: 'MACH_M_SUBSET_UP',
    scenario: sc.key,
    subskill: 'زيادة إنتاجية بعض الآلات فقط',
    difficulty: 'hard',
    question: stem.text,
    stemStructure: stem.structure, informationOrder: stem.order,
    correct, distractors, format: unitFormat(sc.out),
    steps: [
      factorText,
      `معدل الآلة المطورة = ${rate} × ${factor.toDecimalString()} = ${newRateN}.`,
      `المعدل الكلي في الساعة = ${upgraded} × ${newRateN} + (${machines} − ${upgraded}) × ${rate} = ${combined}.`,
      `الإنتاج الكلي = ${combined} × ${hours} = ${correct}.`
    ],
    howToStart: 'افصل الآلات المطورة عن غير المطورة.',
    remember: 'زيادة الإنتاجية لجزء من الآلات لا تطبق على المجموعة كلها.',
    fastMethod: 'احسب معدل كل مجموعة ثم اجمع.',
    estimatedSteps: 4, conceptTags: ['machine-rate', 'percentage'], parameters: params,
    oracle: {
      kind: 'constraint', answerKind: 'number',
      constraints: [eq(mul(X, 100), mul(hours, add(mul(upgraded, rate, add(100, pct)), mul(machines - upgraded, rate, 100))))]
    },
    askedUnknown: 'mixedGroupOutput', stageCount: 2,
    pedagogy: {
      targetSkill: 'PARTIAL_UPGRADE', targetMisconception: 'UPGRADED_ALL_INSTEAD_OF_SOME',
      wrongMethodValue: machines * newRateN * hours,
      degenerateWhen: [{when: upgraded === machines, note: 'every machine upgraded: no subset to separate'}]
    },
    complexityFactors: {reasoningTransformations: 3, conceptCount: 2, stageCount: 2, conditionCount: 1, arithmeticBurden: 4},
    textParams: {essentialParams: ['machines', 'hourlyRate', 'upgradePercent', 'hours']}
  });
}

function twoTypesCombined(ctx) {
  const sc = sceneFor(ctx, 'production');
  const {rng} = ctx;
  const rA = rng.pick([12, 15, 18, 20]);
  const rB = rng.pick([20, 24, 25, 30].filter(v => v !== rA));
  const nA = rng.pick([3, 4]);
  const nB = rng.pick([3, 4, 5].filter(v => v !== nA));
  const hours = rng.pick([3, 4, 5]);
  const combined = nA * rA + nB * rB;
  const correct = combined * hours;
  const params = {rateA: rA, rateB: rB, countA: nA, countB: nB, hours};
  const distractors = usable(ctx, [
    mk((nA + nB) * rA * hours, 'USED_ONLY_FIRST_RATE', `(${nA} + ${nB}) × ${rA} × ${hours}`),
    mk((nA + nB) * rB * hours, 'USED_ONLY_SECOND_RATE', `(${nA} + ${nB}) × ${rB} × ${hours}`),
    mk((rA + rB) * hours, 'FAILED_TO_UPDATE_COUNT', `(${rA} + ${rB}) × ${hours}`),
    mk(nA * rA * hours, 'STOPPED_AFTER_FIRST_STAGE', `${nA} × ${rA} × ${hours}`),
    mk(nB * rB * hours, 'USED_ONLY_LAST_STAGE', `${nB} × ${rB} × ${hours}`),
    mk(combined, 'STOPPED_AT_UNIT_RATE', `${nA} × ${rA} + ${nB} × ${rB}`),
    // RC2-014: as COMB_E_THREE — the averaged rate is rounded before use.
    mk((nA + nB) * Math.round((rA + rB) / 2) * hours, 'USED_ARITHMETIC_MEAN_OF_AVERAGES', `(${nA} + ${nB}) × ${Math.round((rA + rB) / 2)} × ${hours}`),
    mk((nA + nB) * (rA + rB) * hours, 'RATE_APPLIED_TO_WRONG_COUNT', `(${nA} + ${nB}) × (${rA} + ${rB}) × ${hours}`)
  ]);
  const stem = composeSentences(ctx, `تنتج آلة من النوع أ ${rA} ${sc.rateWord}، وآلة من النوع ب ${rB} ${sc.rateWord}. إذا عملت ${u(nA, 'machine')} من أ و${u(nB, 'machine')} من ب معًا لمدة ${u(hours, 'hour', 'oblique')}، فكم ${unitWordKam(sc.out)} تنتج؟`);
  return buildBase(ctx, {
    templateId: 'MACH_H_TWO_TYPES',
    scenario: sc.key,
    subskill: 'نوعان من الآلات بمعدلين مختلفين',
    difficulty: 'medium',
    question: stem.text,
    stemStructure: stem.structure, informationOrder: stem.order,
    correct, distractors, format: unitFormat(sc.out),
    steps: [
      `معدل مجموعة أ في الساعة = ${nA} × ${rA} = ${nA * rA}.`,
      `معدل مجموعة ب في الساعة = ${nB} × ${rB} = ${nB * rB}.`,
      `المعدل الكلي = ${nA * rA} + ${nB * rB} = ${combined}.`,
      `الإنتاج = ${combined} × ${hours} = ${correct}.`
    ],
    howToStart: 'احسب معدل كل نوع على حدة ثم اجمع.',
    remember: 'لا تستخدم متوسط المعدلين إذا كان عدد الآلات مختلفًا.',
    fastMethod: 'معدل أ الكلي + معدل ب الكلي، ثم × الزمن.',
    estimatedSteps: 4, conceptTags: ['machine-rate', 'weighted'], parameters: params,
    oracle: {
      kind: 'constraint', answerKind: 'number',
      constraints: [eq(X, add(mul(nA, rA, hours), mul(nB, rB, hours)))]
    },
    askedUnknown: 'mixedFleetOutput', stageCount: 2,
    pedagogy: {
      targetSkill: 'WEIGHTED_MACHINE_RATES', targetMisconception: 'USED_ARITHMETIC_MEAN_OF_AVERAGES',
      wrongMethodValue: (nA + nB) * (rA + rB) / 2 * hours,
      degenerateWhen: [{when: nA === nB, note: 'equal counts make the mean of rates correct'}]
    },
    complexityFactors: {reasoningTransformations: 3, conceptCount: 2, stageCount: 2, arithmeticBurden: 4},
    textParams: {essentialParams: ['rateA', 'rateB', 'countA', 'countB', 'hours']}
  });
}

function stageChange(ctx) {
  const sc = sceneFor(ctx, 'production');
  const {rng} = ctx;
  const machines = rng.pick([4, 5, 6]);
  const rate = rng.pick([10, 12, 15, 20]);
  const h1 = rng.pick([3, 4]);
  const h2 = rng.pick([3, 4, 5].filter(v => v !== h1));
  const upgraded = rng.pick([1, 2].filter(v => v < machines));
  const pct = rng.pick([25, 50]);
  const {factor, text: factorText} = factorLine(pct, 'up', 'معامل التطوير');
  const newRate = Fraction.from(rate).mul(factor);
  if (!newRate.isInteger) return resample(ctx, stageChange);
  const newRateN = newRate.toNumber();
  const stage1 = machines * rate * h1;
  const combined = upgraded * newRateN + (machines - upgraded) * rate;
  const stage2 = combined * h2;
  const correct = stage1 + stage2;
  const params = {machines, hourlyRate: rate, firstHours: h1, upgradedMachines: upgraded, upgradePercent: pct, secondHours: h2};
  const distractors = usable(ctx, [
    mk(machines * rate * (h1 + h2), 'IGNORED_UPGRADE', `${machines} × ${rate} × (${h1} + ${h2})`),
    mk(machines * newRateN * (h1 + h2), 'UPGRADED_ALL_INSTEAD_OF_SOME', `${machines} × ${newRateN} × (${h1} + ${h2})`),
    mk(stage1, 'STOPPED_AFTER_FIRST_STAGE', `${machines} × ${rate} × ${h1}`),
    mk(stage2, 'USED_ONLY_LAST_STAGE', `${combined} × ${h2}`),
    mk(stage1 + upgraded * newRateN * h2, 'MISSED_ONE_STAGE', `${stage1} + ${upgraded} × ${newRateN} × ${h2}`),
    mk(combined * (h1 + h2), 'STOPPED_AT_UNIT_RATE', `${combined} × (${h1} + ${h2})`),
    mk(stage1 + (machines - upgraded) * rate * h2, 'USED_ONLY_FIRST_RATE', `${stage1} + ${machines - upgraded} × ${rate} × ${h2}`),
    mk(machines * newRateN * h1 + combined * h2, 'UPGRADED_ALL_INSTEAD_OF_SOME', `${machines} × ${newRateN} × ${h1} + ${combined} × ${h2}`)
  ]);
  const stem = composeSentences(ctx, `عملت ${u(machines, 'machine')} بمعدل ${rate} ${sc.rateWord} لمدة ${u(h1, 'hour', 'oblique')}. ثم طُورت ${u(upgraded, 'machine')} فزادت إنتاجيتها ${riseByPercentPhrase(pct)}، وعملت المجموعة كلها ${u(h2, 'hour', 'oblique')} ${adj(h2, 'hour', 'إضافي')}. كم بلغ الإنتاج الكلي؟`);
  return buildBase(ctx, {
    templateId: 'MACH_H_STAGE_UP',
    scenario: sc.key,
    subskill: 'مرحلتان مع تطوير جزء من الآلات',
    difficulty: 'hard',
    question: stem.text,
    stemStructure: stem.structure, informationOrder: stem.order,
    correct, distractors, format: unitFormat(sc.out),
    steps: [
      `إنتاج المرحلة الأولى = ${machines} × ${rate} × ${h1} = ${stage1}.`,
      factorText,
      `معدل الآلة المطورة = ${rate} × ${factor.toDecimalString()} = ${newRateN}.`,
      `المعدل الكلي بعد التطوير = ${upgraded} × ${newRateN} + (${machines} − ${upgraded}) × ${rate} = ${combined}.`,
      `إنتاج المرحلة الثانية = ${combined} × ${h2} = ${stage2}.`,
      `الإجمالي = ${stage1} + ${stage2} = ${correct}.`
    ],
    howToStart: 'قسّم السؤال إلى ما قبل التطوير وما بعده.',
    remember: 'في تغيرات الإنتاج متعددة المراحل، لا تطبق المعدل الجديد على الماضي.',
    fastMethod: 'احسب كل مرحلة بمعدلها الخاص ثم اجمع.',
    estimatedSteps: 5, conceptTags: ['machine-rate', 'stages', 'percentage'], parameters: params,
    oracle: {
      kind: 'constraint', answerKind: 'number',
      constraints: [eq(mul(X, 100), add(mul(machines, rate, h1, 100), mul(h2, add(mul(upgraded, rate, add(100, pct)), mul(machines - upgraded, rate, 100)))))]
    },
    askedUnknown: 'totalAcrossStages', stageCount: 3,
    pedagogy: {
      targetSkill: 'STAGED_PARTIAL_UPGRADE', targetMisconception: 'UPGRADED_ALL_INSTEAD_OF_SOME',
      wrongMethodValue: machines * newRateN * (h1 + h2),
      degenerateWhen: [{when: upgraded === machines, note: 'whole fleet upgraded'}]
    },
    complexityFactors: {reasoningTransformations: 4, conceptCount: 3, stageCount: 3, arithmeticBurden: 5, dependencyDepth: 2},
    textParams: {essentialParams: ['machines', 'hourlyRate', 'firstHours', 'upgradePercent', 'secondHours']}
  });
}

// ---------------------------------------------------------------------------
// RC2.4 — genuinely hard structures for this family.
//
// RC2.3 left machines with nothing above medium, correctly: machine-hour
// accounting forward is what all seven of its templates did. Neither of the two
// below can be started by evaluating a given.
// ---------------------------------------------------------------------------

/**
 * SIMULTANEOUS_CONSTRAINTS + CROSS_PART_INTEGRATION.
 *
 * Two mixed groups, two totals, and neither machine's rate stated. No single
 * sentence yields a rate; the two have to be brought onto one footing and one
 * unknown eliminated before anything is computable.
 */
function twoConfigurations(ctx) {
  const sc = sceneFor(ctx, 'production');
  const {rng} = ctx;
  let found = null;
  for (let t = 0; t < 200; t++) {
    const rateA = rng.pick([12, 15, 18, 20, 24, 25, 30]);
    const rateB = rng.pick([10, 14, 16, 20, 22, 28, 35]);
    if (rateA === rateB) continue;
    const a = rng.int(2, 5), b = rng.int(1, 4);
    const c = rng.int(1, 5), d = rng.int(2, 5);
    // RC2.6. With a === c (or b === d) the two statements differ in one machine
    // and the system collapses to a single subtraction, so the cross-multiplying
    // the explanation performs is unnecessary and the item is easier than it
    // reads. Direct sampling found the template drawing exactly that.
    if (a === c || b === d) continue;
    // The determinant is kept positive so the elimination step and the option
    // derived from it both read as plain subtractions. A negative one is
    // arithmetically fine and presentationally poor, and it made the
    // determinant option state «2 × 2 − 5 × 3» beside the value 11.
    const det = a * d - c * b;
    if (det <= 0) continue;
    // A configuration that is a multiple of the other states one fact twice.
    if (a * d === c * b) continue;
    if (a === c && b === d) continue;
    // Equal second-type counts make the elimination multiply both sides by the
    // same number, which is a step that does no work.
    if (b === d) continue;
    const out1 = a * rateA + b * rateB;
    const out2 = c * rateA + d * rateB;
    if (out1 === out2) continue;
    if ((out1 * d - out2 * b) % det !== 0) continue;
    found = {rateA, rateB, a, b, c, d, out1, out2, det};
    break;
  }
  if (!found) return resample(ctx, twoConfigurations);
  const {rateA, rateB, a, b, c, d, out1, out2, det} = found;
  const correct = rateA;
  const params = {countFirstA: a, countSecondA: b, outputA: out1, countFirstB: c, countSecondB: d, outputB: out2};

  const lhs = out1 * d - out2 * b;
  const distractors = usable(ctx, [
    // Every derivation states the arithmetic that produces the value exactly.
    // Rounding one to make it land on a tidy number would make the feedback say
    // «you got 18, which is 88 ÷ 5» — a false sentence about the learner's own
    // work. `usable` drops any value that needs more precision than the answer
    // format shows.
    mk(rateB, 'SWAPPED_THE_TWO_UNKNOWNS', `معدل النوع الثاني ${rateB}`, 3),
    mk(out1 / (a + b), 'SOLVED_ONE_CONDITION_ONLY', `${out1} ÷ (${a} + ${b})`),
    mk(out2 / (c + d), 'SOLVED_ONE_CONDITION_ONLY', `${out2} ÷ (${c} + ${d})`),
    mk(out1 / a, 'SOLVED_ONE_CONDITION_ONLY', `${out1} ÷ ${a}`),
    mk(out2 / d, 'SOLVED_ONE_CONDITION_ONLY', `${out2} ÷ ${d}`),
    mk(Math.abs(out2 - out1), 'USED_DIFFERENCE_AS_ANSWER', `${Math.max(out1, out2)} − ${Math.min(out1, out2)}`),
    mk(out1 / d, 'SOLVED_ONE_CONDITION_ONLY', `${out1} ÷ ${d}`),
    mk(rateA + rateB, 'ADDED_INSTEAD_OF_SCALING', `${rateA} + ${rateB}`),
    mk((out1 + out2) / (a + b + c + d), 'SOLVED_ONE_CONDITION_ONLY', `(${out1} + ${out2}) ÷ (${a} + ${b} + ${c} + ${d})`),
    mk(lhs, 'STOPPED_AT_INTERMEDIATE_TOTAL', `${out1} × ${d} − ${out2} × ${b}`, 1),
    mk(lhs / a, 'MISREAD_THE_STEP', `${lhs} ÷ ${a}`),
    mk(det, 'STOPPED_AT_INTERMEDIATE_TOTAL', `${a} × ${d} − ${c} × ${b}`, 2)
  ]);

  const stem = composeSentences(ctx, `تنتج ${u(a, 'machine')} من النوع الأول و${u(b, 'machine')} من النوع الثاني معًا ${u(out1, sc.out)} في الساعة. وتنتج ${u(c, 'machine')} من النوع الأول و${u(d, 'machine')} من النوع الثاني معًا ${u(out2, sc.out)} في الساعة. كم ${unitWordKam(sc.out)} تنتج آلة واحدة من النوع الأول في الساعة؟`);
  return buildBase(ctx, {
    templateId: 'MACH_H_TWO_CONFIG',
    scenario: sc.key,
    subskill: 'معدل آلة من مجموعتين مختلطتين',
    difficulty: 'hard',
    question: stem.text,
    stemStructure: stem.structure, informationOrder: stem.order,
    // RC2.5-4. Pieces PER HOUR, as the stem asks; `piece` alone read as a count.
    correct, distractors, format: unitFormat('piecePerHour'),
    steps: [
      `نضرب العبارة الأولى في ${d} والثانية في ${b} ليتساوى عدد آلات النوع الثاني: ${out1} × ${d} = ${out1 * d}، و${out2} × ${b} = ${out2 * b}.`,
      `بالطرح يختفي النوع الثاني ويبقى الفرق في الإنتاج = ${out1 * d} − ${out2 * b} = ${lhs}.`,
      `وعدد آلات النوع الأول المقابل = ${a} × ${d} − ${c} × ${b} = ${det}.`,
      `معدل آلة من النوع الأول = ${lhs} ÷ ${det} = ${correct}.`
    ],
    howToStart: 'وحّد عدد آلات أحد النوعين في العبارتين ثم اطرحهما ليختفي ذلك النوع.',
    remember: 'عند وجود مجهولين لا تكفي عبارة واحدة؛ العبارتان معًا هما ما يحدد القيمة.',
    fastMethod: 'اضرب كل عبارة في عدد آلات النوع الآخر من العبارة المقابلة ثم اطرح.',
    estimatedSteps: 4, conceptTags: ['machine-rate', 'elimination', 'two-unknowns'], parameters: params,
    oracle: {
      kind: 'constraint', answerKind: 'number',
      constraints: [eq(mul(X, det), sub(mul(out1, d), mul(out2, b)))]
    },
    askedUnknown: 'firstTypeRate', stageCount: 3,
    // RC2.3-4 demotes a fractional option where the answer counts indivisible
    // things. This answer is a RATE whose numerator happens to be a count —
    // 22.5 pieces an hour is a perfectly real rate — so the rule does not apply
    // and the template says so rather than being quietly exempted.
    answerIsCount: false,
    pedagogy: {
      targetSkill: 'ELIMINATE_ONE_UNKNOWN', targetMisconception: 'SOLVED_ONE_CONDITION_ONLY',
      wrongMethodValue: out1 / (a + b)
    },
    complexityFactors: {reasoningTransformations: 4, conceptCount: 3, equationSolving: 1, conditionCount: 2, stageCount: 3, arithmeticBurden: 5},
    textParams: {essentialParams: ['countFirstA', 'countSecondA', 'outputA', 'countFirstB', 'countSecondB', 'outputB']}
  });
}

/**
 * COMPOSED_INVERSION + STRATEGY_SELECTION.
 *
 * The stoppage time is not a quantity anything in the stem reports. It is
 * reached by comparing the planned output with the actual one, reading the
 * shortfall as the missing machine's output over the hours it did not work, and
 * inverting back to a clock time. Each of those three moves is a choice.
 */
function stoppageTime(ctx) {
  const sc = sceneFor(ctx, 'production');
  const {rng} = ctx;
  let found = null;
  for (let t = 0; t < 150; t++) {
    const machines = rng.pick([4, 5, 6, 8, 10]);
    const rate = rng.pick([12, 15, 18, 20, 24, 25]);
    const hours = rng.pick([6, 8, 9, 10, 12]);
    const stopAt = rng.int(1, hours - 1);
    const planned = machines * rate * hours;
    const lost = rate * (hours - stopAt);
    const actual = planned - lost;
    if (actual <= 0) continue;
    // Where the stoppage hour coincides with the lost hours the two readings of
    // the shortfall cannot be told apart (Section 10).
    if (stopAt === hours - stopAt) continue;
    found = {machines, rate, hours, stopAt, planned, lost, actual};
    break;
  }
  if (!found) return resample(ctx, stoppageTime);
  const {machines, rate, hours, stopAt, planned, lost, actual} = found;
  const idleHours = hours - stopAt;
  const correct = stopAt;
  const params = {machines, ratePerMachine: rate, hours, actualOutput: actual};

  const distractors = usable(ctx, [
    mk(idleHours, 'MISREAD_THE_STEP', `${lost} ÷ ${rate}`, 2),
    mk(hours, 'IGNORED_STOPPAGE', `المدة كاملة ${hours}`),
    mk(actual / (machines * rate), 'USED_PLANNED_OUTPUT', `${actual} ÷ (${machines} × ${rate})`),
    mk(lost / machines, 'USED_THE_SHORTFALL_AS_TIME', `${lost} ÷ ${machines}`),
    mk(hours / 2, 'MISREAD_THE_STEP', `${hours} ÷ 2`),
    mk(planned / (machines * rate), 'USED_PLANNED_OUTPUT', `${planned} ÷ (${machines} × ${rate})`),
    mk(hours - lost / (rate * machines), 'USED_THE_SHORTFALL_AS_TIME', `${hours} − ${lost} ÷ (${rate} × ${machines})`),
    mk(idleHours - 1, 'OFF_BY_ONE_STEP', `${lost} ÷ ${rate} − 1`),
    mk(stopAt + 1, 'OFF_BY_ONE_STEP', `${hours} − ${idleHours} + 1`)
  ]);

  const stem = composeSentences(ctx, `تعمل ${u(machines, 'machine')} بمعدل ${rate} ${sc.rateWord} لكل آلة لمدة ${u(hours, 'hour', 'oblique')}. توقفت آلة واحدة في أثناء العمل ولم تعد، فبلغ الإنتاج الفعلي ${u(actual, sc.out)}. بعد كم ساعة من بدء العمل توقفت تلك الآلة؟`);
  return buildBase(ctx, {
    templateId: 'MACH_H_STOPPAGE_TIME',
    scenario: sc.key,
    subskill: 'زمن توقف آلة من نقص الإنتاج',
    difficulty: 'hard',
    question: stem.text,
    stemStructure: stem.structure, informationOrder: stem.order,
    correct, distractors, format: unitFormat('hour'),
    steps: [
      `الإنتاج المخطط لو عملت الآلات كلها المدة كاملة = ${machines} × ${rate} × ${hours} = ${planned}.`,
      `النقص عن المخطط = ${planned} − ${actual} = ${lost}.`,
      `هذا النقص هو ما كانت تنتجه الآلة المتوقفة وحدها، فعدد الساعات التي لم تعمل فيها = ${lost} ÷ ${rate} = ${idleHours}.`,
      `زمن التوقف من البداية = ${hours} − ${idleHours} = ${correct}.`
    ],
    howToStart: 'قارن الإنتاج المخطط بالفعلي؛ الفرق كله يخص الآلة المتوقفة وحدها.',
    remember: 'النقص في الإنتاج يقاس بمعدل الآلة الواحدة، لا بمعدل المجموعة.',
    fastMethod: 'اقسم النقص على معدل الآلة الواحدة لتحصل على ساعات التوقف، ثم اطرحها من المدة.',
    estimatedSteps: 4, conceptTags: ['machine-rate', 'shortfall', 'reverse'], parameters: params,
    oracle: {
      kind: 'constraint', answerKind: 'number',
      constraints: [eq(sub(mul(machines, rate, hours), mul(rate, sub(hours, X))), actual)]
    },
    askedUnknown: 'stoppageHour', stageCount: 3,
    answerBounds: {between: [0, hours]},
    pedagogy: {
      targetSkill: 'SHORTFALL_TO_TIME', targetMisconception: 'MISREAD_THE_STEP',
      wrongMethodValue: idleHours
    },
    complexityFactors: {reasoningTransformations: 4, conceptCount: 3, reverseReasoning: 1, stageCount: 3, arithmeticBurden: 5},
    textParams: {essentialParams: ['machines', 'ratePerMachine', 'hours', 'actualOutput']}
  });
}

// --- RC2.7-3. A smallest admissible count ------------------------------------
//
// The shortfall has to be derived, inverted onto the second rate, and then
// rounded UP: a fraction of a machine cannot be hired, and the division invites
// rounding the other way. Both the deadline and the wholeness bind at once.
function minimumSecondType(ctx) {
  const sc = sceneFor(ctx, 'production');
  const {rng} = ctx;
  const hours = rng.pick([4, 5, 6, 8]);
  const rateA = rng.pick([12, 15, 18, 20, 24]);
  const rateB = rng.pick([9, 10, 14, 16, 21].filter(v => v !== rateA));
  const haveA = rng.pick([2, 3, 4, 5]);
  const fromA = haveA * rateA * hours;
  const needB = rng.int(2, 6);
  // A deliberate remainder, so the quotient is not whole and rounding up is the
  // step the question exists to test. Without it the ceiling is invisible.
  const slack = rng.int(1, rateB * hours - 1);
  const target = fromA + (needB - 1) * rateB * hours + slack;
  const shortfall = target - fromA;
  const correct = Math.ceil(shortfall / (rateB * hours));
  if (correct !== needB) return resample(ctx, minimumSecondType);
  if (target > 6000 || shortfall <= 0) return resample(ctx, minimumSecondType);
  // `minimumCount` and the count one below it are parameters of the check the
  // explanation performs, not values conjured in it: an explanation may only
  // show a numeral that is a parameter or the result of an equality it has
  // already displayed, and the verification states both counts before it
  // multiplies them out.
  const params = {
    hours, rateFirstType: rateA, rateSecondType: rateB, machinesFirstType: haveA,
    targetOutput: target, shortfall, outputPerSecondMachine: rateB * hours,
    minimumCount: 0, oneBelowMinimum: 0
  };
  const exact = shortfall / (rateB * hours);
  const distractors = usable(ctx, [
    mk(correct - 1, 'ROUNDED_DOWN_INSTEAD_OF_UP', `الجزء الصحيح من ${shortfall} ÷ ${rateB * hours}`, 2),
    mk(Math.ceil(target / (rateB * hours)), 'USED_TOTAL_INSTEAD_OF_REMAINDER', `تقريب ${target} ÷ ${rateB * hours} إلى أعلى`, 1),
    mk(Math.ceil(shortfall / (rateA * hours)), 'RATE_APPLIED_TO_WRONG_COUNT', `تقريب ${shortfall} ÷ ${rateA * hours} إلى أعلى`, 1),
    mk(Math.ceil(shortfall / rateB), 'MISSED_ONE_STAGE', `تقريب ${shortfall} ÷ ${rateB} إلى أعلى`, 1),
    mk(correct + 1, 'OFF_BY_ONE_STEP', `${correct} + 1`, 2),
    mk(haveA + correct, 'STOPPED_AT_INTERMEDIATE_TOTAL', `${haveA} + ${correct}`, 2),
    ...(Number.isInteger(exact) ? [] : [mk(Number(exact.toFixed(2)), 'IGNORED_THE_WHOLENESS_CONSTRAINT', `${shortfall} ÷ ${rateB * hours}`, 2)])
  ]);
  const stem = composeSentences(ctx,
    `مطلوب إنتاج ${u(target, sc.out)} خلال ${u(hours, 'hour', 'oblique')}. `
    + `تتوفر ${u(haveA, 'machine')} من النوع الأول، وتنتج كل واحدة منها ${rateA} ${sc.rateWord}. `
    + `آلات النوع الثاني تنتج كل واحدة منها ${rateB} ${sc.rateWord}. `
    + `فما أقل عدد من آلات النوع الثاني يكفي لبلوغ المطلوب؟`,
    {askFirst: 'أقل عدد من آلات النوع الثاني يكفي لبلوغ المطلوب'});
  return buildBase(ctx, {
    templateId: 'MACH_H_MIN_SECOND_TYPE',
    subskill: 'أقل عدد آلات من نوع ثانٍ لبلوغ هدف',
    difficulty: 'hard',
    scenario: `${sc.key}/mixed_fleet_shortfall`, direction: 'minimum',
    question: stem.text,
    stemStructure: stem.structure, informationOrder: stem.order,
    correct, distractors, format: v => num(v),
    answerIsCount: true,
    steps: [
      `إنتاج النوع الأول = ${haveA} × ${rateA} × ${hours} = ${fromA}.`,
      `العجز الذي يجب أن يغطيه النوع الثاني = ${target} − ${fromA} = ${shortfall}.`,
      `الآلة الواحدة من النوع الثاني تنتج ${rateB} × ${hours} = ${rateB * hours} في المدة نفسها.`,
      // Every intermediate is shown as the equality that produces it, including
      // the count one below the answer: an explanation may not display a value a
      // learner cannot see derived.
      `${shortfall} ÷ ${rateB * hours} لا يقسم قسمة تامة، وعدد الآلات عدد صحيح، فنأخذ أصغر عدد صحيح يبلغ العجز أو يتجاوزه.`,
      `تحقق من ${correct}: الإنتاج ${correct} × ${rateB * hours} = ${correct * rateB * hours}، ومع النوع الأول ${fromA} + ${correct * rateB * hours} = ${fromA + correct * rateB * hours}، وهو لا يقل عن ${target}.`,
      `والعدد الأقل بواحد، أي ${correct} − 1 = ${correct - 1}، يعطي ${correct - 1} × ${rateB * hours} = ${(correct - 1) * rateB * hours}، ومع النوع الأول ${fromA} + ${(correct - 1) * rateB * hours} = ${fromA + (correct - 1) * rateB * hours}، وهو أقل من ${target}؛ فأقل عدد كافٍ هو ${correct}.`
    ],
    howToStart: 'احسب أولًا ما ينتجه ما هو متوفر، ثم ما تبقى.',
    remember: 'عدد الآلات عدد صحيح، فالقسمة غير التامة تُقرب إلى أعلى دائمًا.',
    fastMethod: 'العجز مقسومًا على إنتاج الآلة الواحدة في المدة، مقربًا لأعلى.',
    estimatedSteps: 6, conceptTags: ['machine-rate', 'minimum', 'integer-constraint'],
    parameters: {...params, minimumCount: correct, oneBelowMinimum: correct - 1},
    oracle: {
      kind: 'constraint', answerKind: 'number',
      constraints: [
        isInt(X),
        gte(add(fromA, mul(X, rateB * hours)), target),
        gt(target, add(fromA, mul(sub(X, 1), rateB * hours)))
      ]
    },
    askedUnknown: 'minimumSecondTypeMachines', stageCount: 3,
    pedagogy: {
      targetSkill: 'SHORTFALL_THEN_CEILING', targetMisconception: 'ROUNDED_DOWN_INSTEAD_OF_UP',
      wrongMethodValue: correct - 1
    },
    complexityFactors: {
      reasoningTransformations: 3, conceptCount: 3, conditionCount: 2, stageCount: 3,
      arithmeticBurden: 5, reverseReasoning: 1
    },
    textParams: {essentialParams: ['hours', 'rateFirstType', 'rateSecondType', 'machinesFirstType', 'targetOutput']}
  });
}
