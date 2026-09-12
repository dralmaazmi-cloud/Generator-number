import {Fraction} from '../qa/fraction.js';
import {mk, usable, u, num, unitFormat, buildBase, eq, X, add, sub, mul} from './_shared.js';

export function generateSpeed({difficulty, rng, seed, engineVersion}) {
  const ctx = {difficulty, rng, seed, engineVersion, family: 'speed', family_ar: 'السرعة والمسافة والزمن', category: 'السرعة والمسافة والزمن'};
  const list = difficulty === 'easy' ? [simpleTime, simpleDistance]
    : difficulty === 'medium' ? [twoStageTime, averageSpeedUnequalTime, equalDistanceTotalTime]
    : [meetingDelayed, catchupDelayed, sameDistanceTimeDifference];
  return rng.pick(list)(ctx);
}

const kmh = v => `${num(v)} كم/ساعة`;

function simpleTime(ctx) {
  const {rng} = ctx;
  const speed = rng.pick([40, 50, 60, 70, 80, 90]);
  const hours = rng.pick([1.5, 2, 2.5, 3, 4]);
  const distance = speed * hours;
  const correct = hours;
  const params = {speed, distance};
  const distractors = usable([
    mk(distance / speed + 1, 'OFF_BY_ONE_STEP', `${distance} ÷ ${speed} + 1`),
    mk(distance / (speed + 10), 'RATE_APPLIED_TO_WRONG_COUNT', `${distance} ÷ (${speed} + 10)`),
    mk(distance / (speed - 10), 'RATE_APPLIED_TO_WRONG_COUNT', `${distance} ÷ (${speed} − 10)`),
    mk(hours + 0.5, 'OFF_BY_ONE_STEP', `${num(hours)} + 0.5`),
    mk(Math.max(0.5, hours - 0.5), 'OFF_BY_ONE_STEP', `${num(hours)} − 0.5`),
    mk(speed / distance, 'INVERTED_SPEED_TIME', `${speed} ÷ ${distance}`),
    mk(hours * 2, 'APPLIED_STEP_TWICE', `${num(hours)} × 2`),
    mk(hours / 2, 'HALF_DISTANCE_AS_ANSWER', `${distance} ÷ 2 ÷ ${speed}`),
    mk(hours + 2, 'OFF_BY_ONE_STEP', `${num(hours)} + 2`),
    mk(distance / (speed / 2), 'RATE_APPLIED_TO_WRONG_COUNT', `${distance} ÷ (${speed} ÷ 2)`)
  ]);
  return buildBase(ctx, {
    templateId: 'SPD_E_TIME',
    subskill: 'إيجاد الزمن من المسافة والسرعة',
    difficulty: 'easy',
    question: `قطعت سيارة ${u(distance, 'km')} بسرعة ${speed} كم/ساعة. كم ساعة استغرقت؟`,
    correct, distractors, format: unitFormat('hour'),
    steps: [
      `الزمن = المسافة ÷ السرعة.`,
      `الزمن بالساعات = ${distance} ÷ ${speed} = ${num(hours)}.`
    ],
    howToStart: 'استخدم العلاقة: الزمن = المسافة ÷ السرعة.',
    remember: 'تأكد أن وحدات المسافة والسرعة متوافقة.',
    fastMethod: 'اقسم المسافة على السرعة مباشرة.',
    estimatedSteps: 2, conceptTags: ['speed'], parameters: params,
    // distance = speed x time, restated as a constraint on the unknown time.
    oracle: {kind: 'constraint', answerKind: 'number', constraints: [eq(mul(X, speed), distance)]},
    askedUnknown: 'time', stageCount: 1,
    pedagogy: {
      targetSkill: 'DISTANCE_SPEED_TIME', targetMisconception: 'INVERTED_SPEED_TIME',
      wrongMethodValue: speed / distance
    },
    complexityFactors: {reasoningTransformations: 1, conceptCount: 1, stageCount: 1, arithmeticBurden: 1},
    textParams: {essentialParams: ['speed', 'distance']}
  });
}

function simpleDistance(ctx) {
  const {rng} = ctx;
  const speed = rng.pick([40, 50, 60, 70, 80, 90]);
  const hours = rng.pick([1.5, 2, 2.5, 3, 4]);
  const correct = speed * hours;
  const params = {speed, hours};
  const distractors = usable([
    mk(speed + hours, 'ADDED_INSTEAD_OF_SCALING', `${speed} + ${num(hours)}`),
    mk(speed * (hours + 1), 'OFF_BY_ONE_STEP', `${speed} × (${num(hours)} + 1)`),
    mk(speed * Math.max(0.5, hours - 0.5), 'OFF_BY_ONE_STEP', `${speed} × (${num(hours)} − 0.5)`),
    mk(speed / hours, 'INVERTED_SPEED_TIME', `${speed} ÷ ${num(hours)}`),
    mk(correct + speed / 2, 'OFF_BY_ONE_STEP', `${correct} + ${num(speed / 2)}`),
    mk(correct / 2, 'HALF_DISTANCE_AS_ANSWER', `${correct} ÷ 2`),
    mk(correct * 2, 'APPLIED_STEP_TWICE', `${correct} × 2`)
  ]);
  return buildBase(ctx, {
    templateId: 'SPD_E_DISTANCE',
    subskill: 'إيجاد المسافة من السرعة والزمن',
    difficulty: 'easy',
    question: `سارت سيارة بسرعة ${speed} كم/ساعة لمدة ${u(hours, 'hour', 'oblique')}. ما المسافة التي قطعتها؟`,
    correct, distractors, format: unitFormat('km'),
    steps: [
      `المسافة = السرعة × الزمن.`,
      `المسافة بالكيلومترات = ${speed} × ${num(hours)} = ${correct}.`
    ],
    howToStart: 'استخدم العلاقة: المسافة = السرعة × الزمن.',
    remember: 'المسافة تزداد مباشرة مع السرعة والزمن.',
    fastMethod: 'اضرب السرعة في الزمن.',
    estimatedSteps: 2, conceptTags: ['speed'], parameters: params,
    oracle: {kind: 'constraint', answerKind: 'number', constraints: [eq(X, mul(speed, hours))]},
    askedUnknown: 'distance', stageCount: 1,
    pedagogy: {
      targetSkill: 'DISTANCE_SPEED_TIME', targetMisconception: 'INVERTED_SPEED_TIME',
      wrongMethodValue: speed / hours
    },
    complexityFactors: {reasoningTransformations: 1, conceptCount: 1, stageCount: 1, arithmeticBurden: 1},
    textParams: {essentialParams: ['speed']}
  });
}

function twoStageTime(ctx) {
  const {rng} = ctx;
  const s1 = rng.pick([50, 60, 70, 80]);
  const s2 = rng.pick([40, 60, 80, 90].filter(v => v !== s1));
  const t1 = rng.pick([1, 1.5, 2, 2.5]);
  const t2 = rng.pick([1, 1.5, 2, 2.5, 3].filter(v => v !== t1));
  const d1 = s1 * t1, d2 = s2 * t2;
  const correct = (t1 + t2) * 60;
  const params = {speedA: s1, speedB: s2, distanceA: d1, distanceB: d2};
  const distractors = usable([
    mk(t1 * 60, 'USED_ONE_STAGE_TIME', `${num(t1)} × 60`),
    mk(t2 * 60, 'USED_ONE_STAGE_TIME', `${num(t2)} × 60`),
    mk((d1 + d2) / s1 * 60, 'USED_ONLY_FIRST_RATE', `(${d1} + ${d2}) ÷ ${s1} × 60`),
    mk((d1 + d2) / s2 * 60, 'USED_ONLY_SECOND_RATE', `(${d1} + ${d2}) ÷ ${s2} × 60`),
    mk(correct + 30, 'OFF_BY_ONE_STEP', `${correct} + 30`),
    mk(correct - 30, 'OFF_BY_ONE_STEP', `${correct} − 30`),
    mk(t1 + t2, 'MISSED_ONE_STAGE', `${num(t1)} + ${num(t2)}`),
    mk((d1 + d2) / ((s1 + s2) / 2) * 60, 'USED_ARITHMETIC_MEAN_OF_SPEEDS', `(${d1} + ${d2}) ÷ ((${s1} + ${s2}) ÷ 2) × 60`),
    mk(correct * 2, 'APPLIED_STEP_TWICE', `${correct} × 2`),
    mk(correct + 60, 'OFF_BY_ONE_STEP', `${correct} + 60`)
  ]);
  return buildBase(ctx, {
    templateId: 'SPD_M_TWO_TIME',
    subskill: 'زمن مرحلتين ثم التحويل إلى دقائق',
    difficulty: 'medium',
    question: `قطعت سيارة ${u(d1, 'km')} بسرعة ${s1} كم/ساعة، ثم قطعت ${u(d2, 'km')} بسرعة ${s2} كم/ساعة دون توقف. كم دقيقة استغرقت الرحلة كاملة؟`,
    correct, distractors, format: unitFormat('minute'),
    steps: [
      `زمن المرحلة الأولى بالساعات = ${d1} ÷ ${s1} = ${num(t1)}.`,
      `زمن المرحلة الثانية بالساعات = ${d2} ÷ ${s2} = ${num(t2)}.`,
      `الزمن الكلي بالساعات = ${num(t1)} + ${num(t2)} = ${num(t1 + t2)}.`,
      `الزمن بالدقائق = ${num(t1 + t2)} × 60 = ${correct}.`
    ],
    howToStart: 'احسب زمن كل مرحلة منفصلًا ثم اجمع.',
    remember: 'إذا تغيرت السرعة، لا تجمع المسافات وتقسم على سرعة واحدة.',
    fastMethod: 'زمن المرحلة الأولى + زمن الثانية، ثم × 60.',
    estimatedSteps: 3, conceptTags: ['speed', 'stages', 'unit-conversion'],
    parameters: params,
    oracle: {
      kind: 'constraint', answerKind: 'number',
      constraints: [eq(mul(X, s1, s2), mul(60, add(mul(d1, s2), mul(d2, s1))))]
    },
    askedUnknown: 'totalTimeMinutes', stageCount: 2,
    allowedConstants: [0, 1, 2, 60, 100],
    pedagogy: {
      targetSkill: 'STAGE_TIMES', targetMisconception: 'USED_ONLY_FIRST_RATE',
      wrongMethodValue: (d1 + d2) / s1 * 60,
      degenerateWhen: [{when: s1 === s2, note: 'equal speeds collapse the two stages into one'}]
    },
    complexityFactors: {reasoningTransformations: 3, conceptCount: 2, stageCount: 2, unitConversion: 1, arithmeticBurden: 3},
    textParams: {essentialParams: ['speedA', 'speedB', 'distanceA', 'distanceB']}
  });
}

function averageSpeedUnequalTime(ctx) {
  const {rng} = ctx;
  const s1 = rng.pick([50, 60, 70, 80]);
  const s2 = rng.pick([80, 90, 100, 120]);
  if (s1 === s2) return averageSpeedUnequalTime(ctx);
  const t1 = rng.pick([1, 1.5, 2]);
  const t2 = rng.pick([2, 2.5, 3]);
  // Section 10 / 43: equal times are exactly when the arithmetic mean of the
  // speeds is right, and this template exists to catch that mistake.
  if (t1 === t2) return averageSpeedUnequalTime(ctx);
  const d1 = s1 * t1, d2 = s2 * t2;
  const totalT = t1 + t2;
  const answer = Fraction.from(d1 + d2).div(totalT);
  if (!answer.isInteger) return averageSpeedUnequalTime(ctx);
  const correct = answer.toNumber();
  const simpleAvg = (s1 + s2) / 2;
  const params = {speedA: s1, speedB: s2, hoursA: t1, hoursB: t2};
  const distractors = usable([
    mk(simpleAvg, 'USED_ARITHMETIC_MEAN_OF_SPEEDS', `(${s1} + ${s2}) ÷ 2`),
    mk(s1, 'USED_ONLY_FIRST_RATE', `السرعة الأولى ${s1}`),
    mk(s2, 'USED_ONLY_SECOND_RATE', `السرعة الثانية ${s2}`),
    mk((d1 + d2) / t1, 'USED_ONE_STAGE_TIME', `(${d1} + ${d2}) ÷ ${num(t1)}`),
    mk((d1 + d2) / t2, 'USED_ONE_STAGE_TIME', `(${d1} + ${d2}) ÷ ${num(t2)}`),
    mk(correct + 5, 'OFF_BY_ONE_STEP', `${correct} + 5`),
    mk(correct - 5, 'OFF_BY_ONE_STEP', `${correct} − 5`),
    mk(d1 + d2, 'STOPPED_AT_INTERMEDIATE_TOTAL', `${d1} + ${d2}`),
    mk(correct + 10, 'OFF_BY_ONE_STEP', `${correct} + 10`),
    mk(correct - 10, 'OFF_BY_ONE_STEP', `${correct} − 10`),
    mk((d1 + d2) / (t1 + t2) / 2, 'HALF_DISTANCE_AS_ANSWER', `${correct} ÷ 2`)
  ]);
  return buildBase(ctx, {
    templateId: 'SPD_M_AVG',
    subskill: 'متوسط السرعة مع مدد زمنية مختلفة',
    difficulty: 'medium',
    question: `سارت سيارة ${u(t1, 'hour', 'oblique')} بسرعة ${s1} كم/ساعة، ثم ${u(t2, 'hour', 'oblique')} بسرعة ${s2} كم/ساعة. ما متوسط سرعتها في الرحلة كلها؟`,
    correct, distractors, format: kmh,
    steps: [
      `المسافة الأولى = ${s1} × ${num(t1)} = ${d1}.`,
      `المسافة الثانية = ${s2} × ${num(t2)} = ${d2}.`,
      `المسافة الكلية = ${d1} + ${d2} = ${d1 + d2}.`,
      `الزمن الكلي = ${num(t1)} + ${num(t2)} = ${num(totalT)}.`,
      `متوسط السرعة = ${d1 + d2} ÷ ${num(totalT)} = ${correct}.`
    ],
    howToStart: 'متوسط السرعة = المسافة الكلية ÷ الزمن الكلي.',
    remember: 'لا تأخذ متوسط السرعتين حسابيًا إذا اختلف الزمن.',
    fastMethod: 'اجمع المسافات، اجمع الأزمنة، ثم اقسم.',
    estimatedSteps: 4, conceptTags: ['speed', 'weighted'], parameters: params,
    oracle: {
      kind: 'constraint', answerKind: 'number',
      constraints: [eq(mul(X, add(t1, t2)), add(mul(s1, t1), mul(s2, t2)))]
    },
    askedUnknown: 'averageSpeed', stageCount: 2,
    pedagogy: {
      targetSkill: 'AVERAGE_SPEED_IS_WEIGHTED', targetMisconception: 'USED_ARITHMETIC_MEAN_OF_SPEEDS',
      wrongMethodValue: simpleAvg,
      degenerateWhen: [{when: t1 === t2, note: 'equal times make the arithmetic mean correct'}]
    },
    complexityFactors: {reasoningTransformations: 3, conceptCount: 2, stageCount: 2, arithmeticBurden: 4},
    textParams: {essentialParams: ['speedA', 'speedB']}
  });
}

function equalDistanceTotalTime(ctx) {
  const {rng} = ctx;
  const s1 = rng.pick([60, 80, 90]);
  const s2 = rng.pick([30, 40, 45, 60]);
  if (s1 === s2) return equalDistanceTotalTime(ctx);
  const half = rng.pick([120, 180, 240, 360]);
  if (half % s1 || half % s2) return equalDistanceTotalTime(ctx);
  const t1 = half / s1, t2 = half / s2;
  const total = t1 + t2;
  const correct = 2 * half;
  const params = {speedA: s1, speedB: s2, totalHours: total};
  const distractors = usable([
    mk((s1 + s2) / 2 * total, 'USED_ARITHMETIC_MEAN_OF_SPEEDS', `((${s1} + ${s2}) ÷ 2) × ${num(total)}`),
    mk(s1 * total, 'USED_ONLY_FIRST_RATE', `${s1} × ${num(total)}`),
    mk(s2 * total, 'USED_ONLY_SECOND_RATE', `${s2} × ${num(total)}`),
    mk(half, 'HALF_DISTANCE_AS_ANSWER', `نصف المسافة ${half}`),
    mk(correct + 60, 'OFF_BY_ONE_STEP', `${correct} + 60`),
    mk(correct - 60, 'OFF_BY_ONE_STEP', `${correct} − 60`),
    mk((s1 + s2) * total, 'USED_SUM_OF_SPEEDS_IN_CHASE', `(${s1} + ${s2}) × ${num(total)}`)
  ]);
  return buildBase(ctx, {
    templateId: 'SPD_M_EQUAL_DIST',
    subskill: 'نصفا مسافة متساويان بسرعتين مختلفتين',
    difficulty: 'medium',
    question: `قطعت سيارة نصف المسافة بسرعة ${s1} كم/ساعة، والنصف الآخر بسرعة ${s2} كم/ساعة. إذا استغرقت الرحلة كاملة ${u(total, 'hour', 'oblique')}، فما المسافة الكلية؟`,
    correct, distractors, format: unitFormat('km'),
    steps: [
      `نفرض نصف المسافة = ن، فزمن النصف الأول = ن ÷ ${s1} وزمن النصف الثاني = ن ÷ ${s2}، ومجموعهما ${num(total)}.`,
      `بضرب طرفي المعادلة في ${s1} × ${s2} = ${s1 * s2}: ن × (${s2} + ${s1}) = ${num(total)} × ${s1 * s2}.`,
      `نحسب الطرفين: ${s2} + ${s1} = ${s1 + s2}، و${num(total)} × ${s1 * s2} = ${total * s1 * s2}.`,
      `ن = ${total * s1 * s2} ÷ ${s1 + s2} = ${half}.`,
      `المسافة الكلية = ${half} + ${half} = ${correct}.`
    ],
    howToStart: 'انتبه: النصفان متساويان في المسافة لا في الزمن.',
    remember: 'عند تساوي المسافتين، الجزء الأبطأ يستغرق زمنًا أطول.',
    fastMethod: 'قسّم الزمن بنسبة عكس السرعتين.',
    estimatedSteps: 4, conceptTags: ['speed', 'harmonic'], parameters: params,
    oracle: {
      kind: 'constraint', answerKind: 'number',
      constraints: [eq(mul(X, add(s1, s2)), mul(2, total, s1, s2))]
    },
    askedUnknown: 'totalDistance', stageCount: 3,
    pedagogy: {
      targetSkill: 'HARMONIC_AVERAGE_SPEED', targetMisconception: 'USED_ARITHMETIC_MEAN_OF_SPEEDS',
      wrongMethodValue: (s1 + s2) / 2 * total,
      degenerateWhen: [{when: s1 === s2, note: 'equal speeds make the arithmetic mean correct'}]
    },
    complexityFactors: {reasoningTransformations: 3, conceptCount: 2, equationSolving: 1, stageCount: 2, arithmeticBurden: 4},
    textParams: {essentialParams: ['speedA', 'speedB']}
  });
}

function meetingDelayed(ctx) {
  const {rng} = ctx;
  const total = rng.pick([300, 360, 420, 480]);
  const sA = rng.pick([50, 60, 70, 80]);
  const delay = rng.pick([1, 1.5, 2]);
  const sB = rng.pick([70, 80, 90, 100]);
  const remaining = total - sA * delay;
  const t = Fraction.from(remaining).div(sA + sB);
  if (t.lte(0) || !t.isExactDecimal || t.decimalPlaces > 1) return meetingDelayed(ctx);
  const correct = t.toNumber();
  const params = {totalDistance: total, speedA: sA, speedB: sB, delayHours: delay};
  const distractors = usable([
    mk(total / (sA + sB), 'USED_TOTAL_DISTANCE_WITHOUT_DELAY', `${total} ÷ (${sA} + ${sB})`),
    mk(remaining / sB, 'DIVIDED_BY_ONE_SPEED', `${remaining} ÷ ${sB}`),
    mk(remaining / sA, 'DIVIDED_BY_ONE_SPEED', `${remaining} ÷ ${sA}`),
    mk(correct + 0.5, 'OFF_BY_ONE_STEP', `${num(correct)} + 0.5`),
    mk(Math.max(0.5, correct - 0.5), 'OFF_BY_ONE_STEP', `${num(correct)} − 0.5`),
    mk(delay + correct, 'ADDED_DELAY_TO_ANSWER', `${num(delay)} + ${num(correct)}`),
    mk(remaining / Math.abs(sB - sA), 'USED_DIFFERENCE_OF_SPEEDS_IN_MEETING', `${remaining} ÷ |${sB} − ${sA}|`),
    mk(correct + 1, 'OFF_BY_ONE_STEP', `${num(correct)} + 1`),
    mk(Math.max(0.5, correct - 1), 'OFF_BY_ONE_STEP', `${num(correct)} − 1`),
    mk(correct * 2, 'APPLIED_STEP_TWICE', `${num(correct)} × 2`),
    mk(total / sA - delay, 'DIVIDED_BY_ONE_SPEED', `${total} ÷ ${sA} − ${num(delay)}`),
    mk(remaining / (sA + sB + sA), 'RATE_APPLIED_TO_WRONG_COUNT', `${num(remaining)} ÷ (${sA} + ${sB} + ${sA})`),
    mk(Math.max(0.5, correct - 1.5), 'OFF_BY_ONE_STEP', `${num(correct)} − 1.5`)
  ]);
  return buildBase(ctx, {
    templateId: 'SPD_H_MEET_DELAY',
    subskill: 'التقاء مركبتين مع انطلاق متأخر',
    difficulty: 'hard',
    question: `مدينتان بينهما ${u(total, 'km')}. انطلقت سيارة أ من الأولى بسرعة ${sA} كم/ساعة. بعد ${u(delay, 'hour', 'oblique')} انطلقت سيارة ب من الثانية باتجاه أ بسرعة ${sB} كم/ساعة. بعد كم ساعة من انطلاق ب تلتقي السيارتان؟`,
    correct, distractors, format: unitFormat('hour'),
    steps: [
      `ما قطعته أ أثناء التأخير = ${sA} × ${num(delay)} = ${num(sA * delay)}.`,
      `المسافة المتبقية بينهما = ${total} − ${num(sA * delay)} = ${num(remaining)}.`,
      `سرعة الاقتراب = ${sA} + ${sB} = ${sA + sB}.`,
      `الزمن بالساعات = ${num(remaining)} ÷ ${sA + sB} = ${num(correct)}.`
    ],
    howToStart: 'احسب أولًا ما قطعته السيارة التي بدأت مبكرًا.',
    remember: 'في التقاء مركبتين متقابلتين بعد بدء الاثنتين، استخدم مجموع السرعتين.',
    fastMethod: 'المسافة المتبقية ÷ مجموع السرعتين.',
    estimatedSteps: 4, conceptTags: ['speed', 'relative-motion'], parameters: params,
    oracle: {
      kind: 'constraint', answerKind: 'number',
      constraints: [eq(add(mul(sA, add(delay, X)), mul(sB, X)), total)]
    },
    askedUnknown: 'meetingTime', stageCount: 3,
    pedagogy: {
      targetSkill: 'RELATIVE_APPROACH', targetMisconception: 'USED_TOTAL_DISTANCE_WITHOUT_DELAY',
      wrongMethodValue: total / (sA + sB),
      degenerateWhen: [{when: delay === 0, note: 'no head start to account for'}]
    },
    complexityFactors: {reasoningTransformations: 4, conceptCount: 3, stageCount: 3, arithmeticBurden: 4, dependencyDepth: 2},
    textParams: {essentialParams: ['totalDistance', 'speedA', 'speedB']}
  });
}

function catchupDelayed(ctx) {
  const {rng} = ctx;
  const sA = rng.pick([50, 60, 72, 80]);
  const sB = rng.pick([80, 90, 96, 100, 120]);
  if (sB <= sA) return catchupDelayed(ctx);
  const delay = rng.pick([1, 1.5, 2]);
  const lead = sA * delay;
  const t = Fraction.from(lead).div(sB - sA);
  if (!t.isExactDecimal || t.decimalPlaces > 1) return catchupDelayed(ctx);
  const correct = t.toNumber();
  const params = {speedA: sA, speedB: sB, delayHours: delay};
  const distractors = usable([
    mk(lead / sB, 'DIVIDED_BY_ONE_SPEED', `${num(lead)} ÷ ${sB}`),
    mk(lead / sA, 'DIVIDED_BY_ONE_SPEED', `${num(lead)} ÷ ${sA}`),
    mk(lead / (sA + sB), 'USED_SUM_OF_SPEEDS_IN_CHASE', `${num(lead)} ÷ (${sA} + ${sB})`),
    mk(delay + correct, 'ADDED_DELAY_TO_ANSWER', `${num(delay)} + ${num(correct)}`),
    mk(correct + 0.5, 'OFF_BY_ONE_STEP', `${num(correct)} + 0.5`),
    mk(Math.max(0.5, correct - 0.5), 'OFF_BY_ONE_STEP', `${num(correct)} − 0.5`),
    mk(correct * 2, 'APPLIED_STEP_TWICE', `${num(correct)} × 2`),
    mk(delay, 'USED_GIVEN_VALUE_AS_ANSWER', `مدة التأخير ${num(delay)}`),
    mk(correct + 1, 'OFF_BY_ONE_STEP', `${num(correct)} + 1`),
    mk(Math.max(0.5, correct - 1), 'OFF_BY_ONE_STEP', `${num(correct)} − 1`),
    mk((sB - sA) / sA * delay, 'INVERTED_SPEED_TIME', `(${sB} − ${sA}) ÷ ${sA} × ${num(delay)}`),
    mk(lead, 'STOPPED_AT_INTERMEDIATE_TOTAL', `${sA} × ${num(delay)}`),
    mk(sB * delay / (sB - sA), 'RATE_APPLIED_TO_WRONG_COUNT', `${sB} × ${num(delay)} ÷ (${sB} − ${sA})`),
    mk((sB - sA) * delay, 'MULTIPLIED_INSTEAD_OF_DIVIDED', `(${sB} − ${sA}) × ${num(delay)}`),
    mk((sA + sB) * delay, 'USED_SUM_OF_SPEEDS_IN_CHASE', `(${sA} + ${sB}) × ${num(delay)}`)
  ]);
  return buildBase(ctx, {
    templateId: 'SPD_H_CATCH',
    subskill: 'لحاق مع انطلاق متأخر',
    difficulty: 'hard',
    question: `انطلقت سيارة أ بسرعة ${sA} كم/ساعة. بعد ${u(delay, 'hour', 'oblique')} انطلقت سيارة ب من المكان نفسه وفي الاتجاه نفسه بسرعة ${sB} كم/ساعة. بعد كم ساعة من انطلاق ب تلحق بسيارة أ؟`,
    correct, distractors, format: unitFormat('hour'),
    steps: [
      `تقدم أ أثناء التأخير = ${sA} × ${num(delay)} = ${num(lead)}.`,
      `فرق السرعة = ${sB} − ${sA} = ${sB - sA}.`,
      `زمن اللحاق بالساعات = ${num(lead)} ÷ ${sB - sA} = ${num(correct)}.`
    ],
    howToStart: 'احسب مسافة التقدم ثم اقسمها على فرق السرعتين.',
    remember: 'في اللحاق بالاتجاه نفسه نستخدم فرق السرعتين لا مجموعهما.',
    fastMethod: 'مسافة التقدم ÷ فرق السرعة.',
    estimatedSteps: 4, conceptTags: ['speed', 'relative-motion'], parameters: params,
    oracle: {
      kind: 'constraint', answerKind: 'number',
      constraints: [eq(mul(sA, add(delay, X)), mul(sB, X))]
    },
    askedUnknown: 'catchupTime', stageCount: 2,
    pedagogy: {
      targetSkill: 'RELATIVE_CHASE', targetMisconception: 'USED_SUM_OF_SPEEDS_IN_CHASE',
      wrongMethodValue: lead / (sA + sB),
      degenerateWhen: [{when: delay === 0, note: 'no head start to close'}]
    },
    complexityFactors: {reasoningTransformations: 3, conceptCount: 2, stageCount: 2, arithmeticBurden: 3},
    textParams: {essentialParams: ['speedA', 'speedB']}
  });
}

function sameDistanceTimeDifference(ctx) {
  const {rng} = ctx;
  const s1 = rng.pick([40, 50, 60]);
  const s2 = rng.pick([80, 90, 100]);
  const distance = rng.pick([120, 180, 240, 300, 360]);
  if (distance % s1 || distance % s2) return sameDistanceTimeDifference(ctx);
  const diff = distance / s1 - distance / s2;
  if (diff <= 0) return sameDistanceTimeDifference(ctx);
  const correct = distance;
  const params = {speedA: s1, speedB: s2, timeDifference: diff};
  const distractors = usable([
    mk(s1 * diff, 'DIVIDED_BY_ONE_SPEED', `${s1} × ${num(diff)}`),
    mk(s2 * diff, 'DIVIDED_BY_ONE_SPEED', `${s2} × ${num(diff)}`),
    mk((s1 + s2) * diff, 'USED_SUM_OF_SPEEDS_IN_CHASE', `(${s1} + ${s2}) × ${num(diff)}`),
    mk(correct + 60, 'OFF_BY_ONE_STEP', `${correct} + 60`),
    mk(correct - 60, 'OFF_BY_ONE_STEP', `${correct} − 60`),
    mk(correct / 2, 'HALF_DISTANCE_AS_ANSWER', `${correct} ÷ 2`),
    mk((s2 - s1) * diff, 'USED_DIFFERENCE_OF_SPEEDS_IN_MEETING', `(${s2} − ${s1}) × ${num(diff)}`),
    mk(correct * 2, 'APPLIED_STEP_TWICE', `${correct} × 2`),
    mk(correct + 120, 'OFF_BY_ONE_STEP', `${correct} + 120`),
    mk(Math.max(30, correct - 120), 'OFF_BY_ONE_STEP', `${correct} − 120`),
    mk(s1 * s2 * diff / (s1 + s2), 'USED_SUM_OF_SPEEDS_IN_CHASE', `${s1} × ${s2} × ${num(diff)} ÷ (${s1} + ${s2})`)
  ]);
  return buildBase(ctx, {
    templateId: 'SPD_H_TIME_DIFF',
    subskill: 'استنتاج المسافة من فرق الزمن',
    difficulty: 'hard',
    question: `المسافة نفسها تُقطع بسرعة ${s1} كم/ساعة أو بسرعة ${s2} كم/ساعة. إذا كان الزمن عند السرعة ${s1} أطول بمقدار ${u(diff, 'hour', 'oblique')}، فما المسافة؟`,
    correct, distractors, format: unitFormat('km'),
    steps: [
      `نفرض المسافة = س، فالزمن عند ${s1} هو س ÷ ${s1}، وعند ${s2} هو س ÷ ${s2}.`,
      `الفرق: س ÷ ${s1} − س ÷ ${s2} = ${num(diff)}.`,
      `بضرب الطرفين في ${s1} × ${s2} = ${s1 * s2}: س × (${s2} − ${s1}) = ${num(diff)} × ${s1 * s2}.`,
      `${s2} − ${s1} = ${s2 - s1}، و${num(diff)} × ${s1 * s2} = ${diff * s1 * s2}.`,
      `س = ${diff * s1 * s2} ÷ ${s2 - s1} = ${correct}.`
    ],
    howToStart: 'اكتب الزمنين بدلالة المسافة ثم استخدم فرق الزمن.',
    remember: 'عند ثبات المسافة، السرعة الأعلى تعني زمنًا أقل.',
    fastMethod: `حل س × (1 ÷ ${s1} − 1 ÷ ${s2}) = ${num(diff)}.`,
    estimatedSteps: 5, conceptTags: ['speed', 'equation'], parameters: params,
    oracle: {
      kind: 'constraint', answerKind: 'number',
      constraints: [eq(mul(X, sub(s2, s1)), mul(diff, s1, s2))]
    },
    askedUnknown: 'distanceFromTimeGap', stageCount: 3,
    pedagogy: {
      targetSkill: 'DISTANCE_FROM_TIME_GAP', targetMisconception: 'DIVIDED_BY_ONE_SPEED',
      wrongMethodValue: s1 * diff,
      degenerateWhen: [{when: s1 === s2, note: 'equal speeds leave no time gap'}]
    },
    complexityFactors: {reasoningTransformations: 4, conceptCount: 2, equationSolving: 1, stageCount: 2, arithmeticBurden: 4},
    textParams: {essentialParams: ['speedA', 'speedB']}
  });
}
