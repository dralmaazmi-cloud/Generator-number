import {Fraction} from '../qa/fraction.js';
import {mk, usable, u, num, unitFormat, buildBase, eq, X, add, mul, factorLine, resample} from './_shared.js';

export function generateMachines({difficulty, rng, seed, engineVersion, telemetry}) {
  const ctx = {difficulty, rng, seed, engineVersion, telemetry, family: 'machines', family_ar: 'الآلات والإنتاج', category: 'الآلات والإنتاج'};
  const list = difficulty === 'easy' ? [machineHours, requiredMachines]
    : difficulty === 'medium' ? [newMachineFaster, oneStops, subsetUpgrade]
    : [twoTypesCombined, stageChange];
  return rng.pick(list)(ctx);
}

function machineHours(ctx) {
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
    mk(correct + rate, 'OFF_BY_ONE_STEP', `${correct} + ${rate}`),
    mk(correct - rate, 'OFF_BY_ONE_STEP', `${correct} − ${rate}`),
    mk(total + correct, 'USED_ORIGINAL_TOTAL', `${total} + ${correct}`),
    mk(rate * (newMachines + newHours), 'MULTIPLIED_COUNTS_INSTEAD_OF_RATE', `${rate} × (${newMachines} + ${newHours})`)
  ]);
  return buildBase(ctx, {
    templateId: 'MACH_E_HOURS',
    subskill: 'معدل آلة واحدة من آلة-ساعة',
    difficulty: 'easy',
    question: `تنتج ${u(machines, 'machine')} متطابقة في الإنتاجية ${u(total, 'piece')} خلال ${u(hours, 'hour', 'oblique')}. كم قطعة تنتج ${u(newMachines, 'machine')} من النوع نفسه خلال ${u(newHours, 'hour', 'oblique')}؟`,
    correct, distractors, format: unitFormat('piece'),
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
  const {rng} = ctx;
  const machines = rng.pick([4, 5, 6]);
  const hours = rng.pick([4, 5, 6]);
  const rate = rng.pick([10, 12, 15, 20]);
  const total = machines * hours * rate;
  const targetHours = rng.pick([2, 3, 4].filter(v => v !== hours));
  const correct = rng.pick([6, 8, 10, 12].filter(v => v !== machines));
  const target = correct * targetHours * rate;
  const params = {machines, hours, totalOutput: total, targetOutput: target, targetHours};
  const distractors = usable(ctx, [
    mk(machines, 'USED_GIVEN_VALUE_AS_ANSWER', `عدد الآلات المعطى ${machines}`),
    mk(target / rate, 'STOPPED_AT_INTERMEDIATE_TOTAL', `${target} ÷ ${rate}`),
    mk(target / (rate * hours), 'RATE_APPLIED_TO_WRONG_COUNT', `${target} ÷ (${rate} × ${hours})`),
    mk(correct + 2, 'OFF_BY_ONE_STEP', `${correct} + 2`),
    mk(correct - 2, 'OFF_BY_ONE_STEP', `${correct} − 2`),
    mk(rate, 'STOPPED_AT_UNIT_RATE', `${total} ÷ (${machines} × ${hours})`),
    mk(correct * targetHours, 'MULTIPLIED_COUNTS_INSTEAD_OF_RATE', `${correct} × ${targetHours}`),
    mk(machines + correct, 'USED_ORIGINAL_TOTAL', `${machines} + ${correct}`),
    mk(correct + 1, 'OFF_BY_ONE_STEP', `${correct} + 1`),
    mk(correct - 1, 'OFF_BY_ONE_STEP', `${correct} − 1`),
    mk(target / (rate * targetHours) * 2, 'APPLIED_STEP_TWICE', `${correct} × 2`),
    mk(machines * targetHours / hours, 'REVERSED_DIRECT_PROPORTION', `${machines} × ${targetHours} ÷ ${hours}`)
  ]);
  return buildBase(ctx, {
    templateId: 'MACH_E_REQUIRED',
    subskill: 'إيجاد عدد الآلات المطلوبة',
    difficulty: 'easy',
    question: `تنتج ${u(machines, 'machine')} متطابقة في الإنتاجية ${u(total, 'piece')} خلال ${u(hours, 'hour', 'oblique')}. كم آلة نحتاج لإنتاج ${u(target, 'piece')} خلال ${u(targetHours, 'hour', 'oblique')}؟`,
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
    mk(correct + oldRate, 'OFF_BY_ONE_STEP', `${correct} + ${oldRate}`),
    mk(correct - oldRate, 'OFF_BY_ONE_STEP', `${correct} − ${oldRate}`),
    mk((oldRate + newRateN) * hours, 'RATE_APPLIED_TO_WRONG_COUNT', `(${oldRate} + ${newRateN}) × ${hours}`),
    mk(oldRate + newRateN, 'STOPPED_AT_UNIT_RATE', `${oldRate} + ${newRateN}`)
  ]);
  return buildBase(ctx, {
    templateId: 'MACH_M_NEW_FAST',
    subskill: 'آلة قديمة وآلة أسرع بنسبة معلومة',
    difficulty: 'medium',
    question: `تنتج ${u(machines, 'machine')} متطابقة في الإنتاجية ${u(total, 'piece')} خلال ${u(hours, 'hour', 'oblique')}. آلة جديدة تنتج في الساعة أكثر من الآلة القديمة بنسبة ${pct}%. كم قطعة تنتج آلة قديمة واحدة وآلة جديدة واحدة معًا خلال ${u(targetH, 'hour', 'oblique')}؟`,
    correct, distractors, format: unitFormat('piece'),
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
    mk(machines * rate * (h1 + h2), 'IGNORED_UPGRADE', `${machines} × ${rate} × (${h1} + ${h2})`),
    mk((machines - stopped) * rate * (h1 + h2), 'FAILED_TO_UPDATE_COUNT', `${machines - stopped} × ${rate} × (${h1} + ${h2})`),
    mk(machines * rate * h1, 'STOPPED_AFTER_FIRST_STAGE', `${machines} × ${rate} × ${h1}`),
    mk((machines - stopped) * rate * h2, 'USED_ONLY_LAST_STAGE', `${machines - stopped} × ${rate} × ${h2}`),
    mk(correct + rate * h2, 'OFF_BY_ONE_STEP', `${correct} + ${rate * h2}`),
    mk(correct - rate * h2, 'OFF_BY_ONE_STEP', `${correct} − ${rate * h2}`),
    mk(machines * rate * h2 + (machines - stopped) * rate * h1, 'RATE_APPLIED_TO_WRONG_COUNT', `${machines} × ${rate} × ${h2} + ${machines - stopped} × ${rate} × ${h1}`)
  ]);
  return buildBase(ctx, {
    templateId: 'MACH_M_STOP',
    subskill: 'توقف آلات أثناء جزء من زمن العمل',
    difficulty: 'medium',
    question: `تنتج كل آلة من ${u(machines, 'machine')} ${rate} قطعة/ساعة. عملت الآلات كلها ${u(h1, 'hour', 'oblique')}، ثم توقفت ${u(stopped, 'machine')} وعملت البقية ${u(h2, 'hour', 'oblique')} إضافية. كم قطعة أُنتجت؟`,
    correct, distractors, format: unitFormat('piece'),
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
      targetSkill: 'STAGED_MACHINE_COUNT', targetMisconception: 'IGNORED_UPGRADE',
      wrongMethodValue: machines * rate * (h1 + h2),
      degenerateWhen: [{when: stopped === 0, note: 'no machine actually stops'}]
    },
    complexityFactors: {reasoningTransformations: 3, conceptCount: 2, stageCount: 2, arithmeticBurden: 3},
    textParams: {derivedFromParams: [], essentialParams: ['machines', 'hourlyRate', 'firstHours', 'secondHours']}
  });
}

function subsetUpgrade(ctx) {
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
    mk(correct + rate * hours, 'OFF_BY_ONE_STEP', `${correct} + ${rate * hours}`),
    mk(correct - rate * hours, 'OFF_BY_ONE_STEP', `${correct} − ${rate * hours}`),
    mk(combined, 'STOPPED_AT_UNIT_RATE', `${upgraded} × ${newRateN} + ${machines - upgraded} × ${rate}`),
    mk(correct * 2, 'APPLIED_STEP_TWICE', `${correct} × 2`),
    mk(combined * (hours + 1), 'OFF_BY_ONE_STEP', `${combined} × (${hours} + 1)`)
  ]);
  return buildBase(ctx, {
    templateId: 'MACH_M_SUBSET_UP',
    subskill: 'زيادة إنتاجية بعض الآلات فقط',
    difficulty: 'medium',
    question: `تعمل ${u(machines, 'machine')} بمعدل ${rate} قطعة/ساعة لكل آلة. طُورت ${u(upgraded, 'machine')} منها فزادت إنتاجيتها بنسبة ${pct}% وبقيت البقية كما هي. كم قطعة تنتج المجموعة خلال ${u(hours, 'hour', 'oblique')}؟`,
    correct, distractors, format: unitFormat('piece'),
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
    mk((nA + nB) * Math.round((rA + rB) / 2) * hours, 'USED_ARITHMETIC_MEAN_OF_AVERAGES', `(${nA} + ${nB}) × ((${rA} + ${rB}) ÷ 2) × ${hours}`),
    mk(correct + rA * hours, 'OFF_BY_ONE_STEP', `${correct} + ${rA * hours}`)
  ]);
  return buildBase(ctx, {
    templateId: 'MACH_H_TWO_TYPES',
    subskill: 'نوعان من الآلات بمعدلين مختلفين',
    difficulty: 'hard',
    question: `تنتج آلة من النوع أ ${rA} قطعة/ساعة، وآلة من النوع ب ${rB} قطعة/ساعة. إذا عملت ${u(nA, 'machine')} من أ و${u(nB, 'machine')} من ب معًا لمدة ${u(hours, 'hour', 'oblique')}، فكم قطعة تنتج؟`,
    correct, distractors, format: unitFormat('piece'),
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
    mk(correct + rate * h2, 'OFF_BY_ONE_STEP', `${correct} + ${rate * h2}`),
    mk(correct - rate * h2, 'OFF_BY_ONE_STEP', `${correct} − ${rate * h2}`),
    mk(stage1 + upgraded * newRateN * h2, 'MISSED_ONE_STAGE', `${stage1} + ${upgraded} × ${newRateN} × ${h2}`)
  ]);
  return buildBase(ctx, {
    templateId: 'MACH_H_STAGE_UP',
    subskill: 'مرحلتان مع تطوير جزء من الآلات',
    difficulty: 'hard',
    question: `عملت ${u(machines, 'machine')} بمعدل ${rate} قطعة/ساعة لمدة ${u(h1, 'hour', 'oblique')}. ثم طُورت ${u(upgraded, 'machine')} فزادت إنتاجيتها ${pct}%، وعملت المجموعة كلها ${u(h2, 'hour', 'oblique')} إضافية. كم بلغ الإنتاج الكلي؟`,
    correct, distractors, format: unitFormat('piece'),
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
