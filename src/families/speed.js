import {Fraction} from '../qa/fraction.js';
import {mk, usable, u, num, unitFormat, buildBase, eq, X, add, sub, mul, resample, approx, bandPool, composeSentences, sceneFor, askOf} from './_shared.js';

export function generateSpeed({difficulty, rng, seed, engineVersion, telemetry, pinTemplate = null, pinTargets = null}) {
  const ctx = {difficulty, rng, seed, engineVersion, telemetry, pinTargets, family: 'speed', family_ar: 'السرعة والمسافة والزمن', category: 'السرعة والمسافة والزمن'};
  // RC2.3-1. The catalogue, not a set of per-band pools: which of these is
  // eligible for the requested band is decided by the structural adjudication in
  // src/qa/structure.js, so a template cannot sit in a band nobody adjudicated.
  return bandPool(rng, 'speed', difficulty, [
    ['SPD_E_DISTANCE', simpleDistance],
    ['SPD_E_TIME', simpleTime],
    ['SPD_M_AVG', averageSpeedUnequalTime],
    ['SPD_M_TWO_TIME', twoStageTime],
    ['SPD_H_CATCH', catchupDelayed],
    ['SPD_H_MEET_DELAY', meetingDelayed],
    ['SPD_M_EQUAL_DIST', equalDistanceTotalTime],
    ['SPD_H_TIME_DIFF', sameDistanceTimeDifference],
    ['SPD_H_CURRENT', boatAgainstCurrent],
    ['SPD_H_LEG_SPLIT', twoLegSplit]
  ], pinTemplate)(ctx);
}

const kmh = v => `${num(v)} كم/ساعة`;

function simpleTime(ctx) {
  const sc = sceneFor(ctx, 'journey');
  const {rng} = ctx;
  // RC2-011. The answer is the number of hours, and it came from five values.
  const speed = rng.pick([30, 40, 45, 50, 60, 70, 75, 80, 90, 100, 120]);
  const hours = rng.pick([1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 6, 7, 8]);
  const distance = speed * hours;
  const correct = hours;
  const params = {speed, distance};
  const distractors = usable(ctx, [
    mk(distance / speed + 1, 'OFF_BY_ONE_STEP', `${distance} ÷ ${speed} + 1`),
    mk(distance / (speed + 10), 'RATE_APPLIED_TO_WRONG_COUNT', `${distance} ÷ (${speed} + 10)`),
    mk(distance / (speed - 10), 'RATE_APPLIED_TO_WRONG_COUNT', `${distance} ÷ (${speed} − 10)`),
    // RC2-012: two interchangeable nudges replaced by a slip built from the
    // numbers on the page — reading the speed five too high.
    mk(distance / (speed + 5), 'MISREAD_THE_STEP', `${distance} ÷ (${speed} + 5)`, 2),
    mk(speed / distance, 'INVERTED_SPEED_TIME', `${speed} ÷ ${distance}`),
    mk(distance * 2 / speed, 'APPLIED_STEP_TWICE', `${distance} × 2 ÷ ${speed}`, 2),
    mk(distance / speed / 2, 'HALF_DISTANCE_AS_ANSWER', `${distance} ÷ ${speed} ÷ 2`, 2),
    mk(distance / (speed / 2), 'RATE_APPLIED_TO_WRONG_COUNT', `${distance} ÷ (${speed} ÷ 2)`),
    // RC2-012: deepened so six options can be filled from real slips alone.
    mk(distance / (speed - 5), 'MISREAD_THE_STEP', `${distance} ÷ (${speed} − 5)`, 2),
    mk((distance + 10) / speed, 'MISREAD_THE_STEP', `(${distance} + 10) ÷ ${speed}`, 2),
    mk(distance / (speed * 2), 'RATE_APPLIED_TO_WRONG_COUNT', `${distance} ÷ (${speed} × 2)`, 2),
    mk(distance - speed, 'SUBTRACTED_INSTEAD_OF_ADDED', `${distance} − ${speed}`, 2)
  ]);
  const stem = composeSentences(ctx, `قطعت ${sc.one} ${u(distance, 'km')} بسرعة ${speed} كم/ساعة. كم ساعة استغرقت؟`);
  return buildBase(ctx, {
    templateId: 'SPD_E_TIME',
    scenario: sc.key,
    subskill: 'إيجاد الزمن من المسافة والسرعة',
    difficulty: 'easy',
    question: stem.text,
    stemStructure: stem.structure, informationOrder: stem.order,
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
  const sc = sceneFor(ctx, 'journey');
  const {rng} = ctx;
  const speed = rng.pick([40, 50, 60, 70, 80, 90]);
  const hours = rng.pick([1.5, 2, 2.5, 3, 4]);
  const correct = speed * hours;
  const params = {speed, hours};
  const distractors = usable(ctx, [
    mk(speed + hours, 'ADDED_INSTEAD_OF_SCALING', `${speed} + ${num(hours)}`),
    mk(speed * (hours + 1), 'OFF_BY_ONE_STEP', `${speed} × (${num(hours)} + 1)`),
    mk(speed * Math.max(0.5, hours - 0.5), 'OFF_BY_ONE_STEP', `${speed} × (${num(hours)} − 0.5)`),
    mk(speed / hours, 'INVERTED_SPEED_TIME', `${speed} ÷ ${num(hours)}`),
    mk(speed * hours * 2, 'APPLIED_STEP_TWICE', `${speed} × ${num(hours)} × 2`, 2),
    mk(speed * (hours + 1), 'MISREAD_THE_STEP', `${speed} × (${num(hours)} + 1)`, 2),
    mk((speed + 10) * hours, 'MISREAD_THE_STEP', `(${speed} + 10) × ${num(hours)}`, 2),
    mk(hours / speed, 'INVERTED_SPEED_TIME', `${num(hours)} ÷ ${speed}`)
  ]);
  const stem = composeSentences(ctx, `سارت ${sc.one} بسرعة ${speed} كم/ساعة لمدة ${u(hours, 'hour', 'oblique')}. ما المسافة التي قطعتها؟`);
  return buildBase(ctx, {
    templateId: 'SPD_E_DISTANCE',
    scenario: sc.key,
    subskill: 'إيجاد المسافة من السرعة والزمن',
    difficulty: 'easy',
    question: stem.text,
    stemStructure: stem.structure, informationOrder: stem.order,
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
  const sc = sceneFor(ctx, 'journey');
  const {rng} = ctx;
  const s1 = rng.pick([50, 60, 70, 80]);
  const s2 = rng.pick([40, 60, 80, 90].filter(v => v !== s1));
  const t1 = rng.pick([1, 1.5, 2, 2.5]);
  const t2 = rng.pick([1, 1.5, 2, 2.5, 3].filter(v => v !== t1));
  const d1 = s1 * t1, d2 = s2 * t2;
  const correct = (t1 + t2) * 60;
  const params = {speedA: s1, speedB: s2, distanceA: d1, distanceB: d2};
  const distractors = usable(ctx, [
    mk(t1 * 60, 'USED_ONE_STAGE_TIME', `${num(t1)} × 60`),
    mk(t2 * 60, 'USED_ONE_STAGE_TIME', `${num(t2)} × 60`),
    mk((d1 + d2) / s1 * 60, 'USED_ONLY_FIRST_RATE', `(${d1} + ${d2}) ÷ ${s1} × 60`),
    mk((d1 + d2) / s2 * 60, 'USED_ONLY_SECOND_RATE', `(${d1} + ${d2}) ÷ ${s2} × 60`),
    mk(t1 + t2, 'MISSED_ONE_STAGE', `${num(t1)} + ${num(t2)}`),
    mk((d1 + d2) / ((s1 + s2) / 2) * 60, 'USED_ARITHMETIC_MEAN_OF_SPEEDS', `(${d1} + ${d2}) ÷ ((${s1} + ${s2}) ÷ 2) × 60`),
    mk((d1 + d2) / Math.min(s1, s2) * 60, 'USED_ONLY_FIRST_RATE', `(${d1} + ${d2}) ÷ ${Math.min(s1, s2)} × 60`),
    mk((d1 + d2) / Math.max(s1, s2) * 60, 'USED_ONLY_SECOND_RATE', `(${d1} + ${d2}) ÷ ${Math.max(s1, s2)} × 60`),
    mk(d1 / s2 * 60 + d2 / s1 * 60, 'SWAPPED_RATE_AND_COUNT', `${d1} ÷ ${s2} × 60 + ${d2} ÷ ${s1} × 60`),
    mk((d1 / s1 + d2 / s2), 'MISSED_ONE_STAGE', `${d1} ÷ ${s1} + ${d2} ÷ ${s2} بالساعات`),
    mk((d1 + d2) / (s1 + s2) * 60, 'STOPPED_AT_UNIT_RATE', `(${d1} + ${d2}) ÷ (${s1} + ${s2}) × 60`)
  ]);
  const stem = composeSentences(ctx, `قطعت ${sc.one} ${u(d1, 'km')} بسرعة ${s1} كم/ساعة، ثم قطعت ${u(d2, 'km')} بسرعة ${s2} كم/ساعة دون توقف. كم دقيقة استغرقت الرحلة كاملة؟`);
  return buildBase(ctx, {
    templateId: 'SPD_M_TWO_TIME',
    scenario: sc.key,
    subskill: 'زمن مرحلتين ثم التحويل إلى دقائق',
    difficulty: 'medium',
    question: stem.text,
    stemStructure: stem.structure, informationOrder: stem.order,
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
  const sc = sceneFor(ctx, 'journey');
  const {rng} = ctx;
  const s1 = rng.pick([50, 60, 70, 80]);
  const s2 = rng.pick([80, 90, 100, 120]);
  if (s1 === s2) return resample(ctx, averageSpeedUnequalTime);
  const t1 = rng.pick([1, 1.5, 2]);
  const t2 = rng.pick([2, 2.5, 3]);
  // Section 10 / 43: equal times are exactly when the arithmetic mean of the
  // speeds is right, and this template exists to catch that mistake.
  if (t1 === t2) return resample(ctx, averageSpeedUnequalTime);
  const d1 = s1 * t1, d2 = s2 * t2;
  const totalT = t1 + t2;
  const answer = Fraction.from(d1 + d2).div(totalT);
  if (!answer.isInteger) return resample(ctx, averageSpeedUnequalTime);
  const correct = answer.toNumber();
  const simpleAvg = (s1 + s2) / 2;
  const params = {speedA: s1, speedB: s2, hoursA: t1, hoursB: t2};
  const distractors = usable(ctx, [
    mk(simpleAvg, 'USED_ARITHMETIC_MEAN_OF_SPEEDS', `(${s1} + ${s2}) ÷ 2`),
    mk(s1, 'USED_ONLY_FIRST_RATE', `السرعة الأولى ${s1}`),
    mk(s2, 'USED_ONLY_SECOND_RATE', `السرعة الثانية ${s2}`),
    mk((d1 + d2) / t1, 'USED_ONE_STAGE_TIME', `(${d1} + ${d2}) ÷ ${num(t1)}`),
    mk((d1 + d2) / t2, 'USED_ONE_STAGE_TIME', `(${d1} + ${d2}) ÷ ${num(t2)}`),
    // RC2.1-3. Two near-misses that lie inside [s1, s2], where the answer must
    // be. Before these the template's only in-bracket options were the naive
    // mean and the two given speeds, so three of its five wrong options could be
    // struck out on magnitude alone.
    mk(approx((s1 * t2 + s2 * t1) / (t1 + t2), 1), 'SWAPPED_WEIGHTS_IN_WEIGHTED_MEAN',
      `(${s1} × ${num(t2)} + ${s2} × ${num(t1)}) ÷ (${num(t1)} + ${num(t2)})`),
    // Weighting by distance instead of by time. Always inside [s1, s2], and a
    // mistake a learner makes precisely because both quantities are on the page.
    mk(approx((s1 * d1 + s2 * d2) / (d1 + d2), 1), 'WEIGHTED_BY_WRONG_QUANTITY',
      `(${s1} × ${d1} + ${s2} × ${d2}) ÷ (${d1} + ${d2})`),
    mk(d1 + d2, 'STOPPED_AT_INTERMEDIATE_TOTAL', `${d1} + ${d2}`, 3),
    mk((d1 + d2) / (t1 + t2) / 2, 'HALF_DISTANCE_AS_ANSWER', `(${d1} + ${d2}) ÷ (${num(t1)} + ${num(t2)}) ÷ 2`)
  ]);
  const stem = composeSentences(ctx, `سارت ${sc.one} ${u(t1, 'hour', 'oblique')} بسرعة ${s1} كم/ساعة، ثم ${u(t2, 'hour', 'oblique')} بسرعة ${s2} كم/ساعة. ما متوسط سرعتها في الرحلة كلها؟`);
  return buildBase(ctx, {
    templateId: 'SPD_M_AVG',
    scenario: sc.key,
    // RC2.1-3. An average speed over two stages lies between the two stage
    // speeds. The review found a total distance offered here wearing a km/h
    // label; it is outside these bounds and is no longer among the first five.
    answerBounds: {between: [s1, s2]},
    subskill: 'متوسط السرعة مع مدد زمنية مختلفة',
    difficulty: 'medium',
    question: stem.text,
    stemStructure: stem.structure, informationOrder: stem.order,
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
  const sc = sceneFor(ctx, 'journey');
  const {rng} = ctx;
  // RC2-011. The answer is twice the half-distance, so the answer space was the
  // length of the half-distance list: four values. Widened at design time.
  const s1 = rng.pick([50, 60, 70, 75, 80, 90, 100, 120]);
  const s2 = rng.pick([25, 30, 35, 40, 45, 50, 60, 70]);
  if (s1 === s2) return resample(ctx, equalDistanceTotalTime);
  const half = rng.pick([120, 140, 150, 175, 180, 210, 240, 280, 300, 350, 360, 420, 450, 480, 540, 600]);
  if (half % s1 || half % s2) return resample(ctx, equalDistanceTotalTime);
  const t1 = half / s1, t2 = half / s2;
  const total = t1 + t2;
  const correct = 2 * half;
  const params = {speedA: s1, speedB: s2, totalHours: total};
  const distractors = usable(ctx, [
    mk((s1 + s2) / 2 * total, 'USED_ARITHMETIC_MEAN_OF_SPEEDS', `((${s1} + ${s2}) ÷ 2) × ${num(total)}`),
    mk(s1 * total, 'USED_ONLY_FIRST_RATE', `${s1} × ${num(total)}`),
    mk(s2 * total, 'USED_ONLY_SECOND_RATE', `${s2} × ${num(total)}`),
    mk(half, 'HALF_DISTANCE_AS_ANSWER', `نصف المسافة ${half}`),
    // RC2-013: this stem is one car over two halves of a journey. There is no
    // chase in it, so the chase sentence cannot be the explanation.
    mk((s1 + s2) * total, 'SUMMED_SPEEDS_OVER_WHOLE_JOURNEY', `(${s1} + ${s2}) × ${num(total)}`)
  ]);
  const stem = composeSentences(ctx, `قطعت ${sc.one} نصف المسافة بسرعة ${s1} كم/ساعة، والنصف الآخر بسرعة ${s2} كم/ساعة. إذا استغرقت الرحلة كاملة ${u(total, 'hour', 'oblique')}، فما المسافة الكلية؟`);
  return buildBase(ctx, {
    templateId: 'SPD_M_EQUAL_DIST',
    scenario: sc.key,
    subskill: 'نصفا مسافة متساويان بسرعتين مختلفتين',
    difficulty: 'hard',
    question: stem.text,
    stemStructure: stem.structure, informationOrder: stem.order,
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
  const sc = sceneFor(ctx, 'journey');
  const {rng} = ctx;
  const total = rng.pick([300, 360, 420, 480]);
  const sA = rng.pick([50, 60, 70, 80]);
  const delay = rng.pick([1, 1.5, 2]);
  const sB = rng.pick([70, 80, 90, 100]);
  const remaining = total - sA * delay;
  const t = Fraction.from(remaining).div(sA + sB);
  if (t.lte(0) || !t.isExactDecimal || t.decimalPlaces > 1) return resample(ctx, meetingDelayed);
  const correct = t.toNumber();
  const params = {totalDistance: total, speedA: sA, speedB: sB, delayHours: delay};
  const distractors = usable(ctx, [
    mk(total / (sA + sB), 'USED_TOTAL_DISTANCE_WITHOUT_DELAY', `${total} ÷ (${sA} + ${sB})`),
    mk(remaining / sB, 'DIVIDED_BY_ONE_SPEED', `${remaining} ÷ ${sB}`),
    mk(remaining / sA, 'DIVIDED_BY_ONE_SPEED', `${remaining} ÷ ${sA}`),
    // RC2-012: the interchangeable nudges are replaced by slips built from the
    // remaining gap and the two speeds.
    mk(remaining / (sA + sB + 10), 'MISREAD_THE_STEP', `${num(remaining)} ÷ (${sA} + ${sB} + 10)`, 3),
    mk(delay + correct, 'ADDED_DELAY_TO_ANSWER', `${num(delay)} + ${num(correct)}`),
    mk(remaining / Math.abs(sB - sA), 'USED_DIFFERENCE_OF_SPEEDS_IN_MEETING', `${remaining} ÷ |${sB} − ${sA}|`),
    mk(remaining * 2 / (sA + sB), 'APPLIED_STEP_TWICE', `${num(remaining)} × 2 ÷ ${sA + sB}`, 4),
    mk(total / sA - delay, 'DIVIDED_BY_ONE_SPEED', `${total} ÷ ${sA} − ${num(delay)}`),
    mk(remaining / (sA + sB + sA), 'RATE_APPLIED_TO_WRONG_COUNT', `${num(remaining)} ÷ (${sA} + ${sB} + ${sA})`),
    mk(remaining / (sA + sB) / 2, 'HALF_DISTANCE_AS_ANSWER', `${num(remaining)} ÷ ${sA + sB} ÷ 2`, 4),
    mk(total / (sA + sB), 'STOPPED_AT_INTERMEDIATE_TOTAL', `${total} ÷ ${sA + sB}`),
    mk(remaining / sB, 'USED_ONLY_SECOND_RATE', `${num(remaining)} ÷ ${sB}`),
    mk(remaining / sA, 'USED_ONLY_FIRST_RATE', `${num(remaining)} ÷ ${sA}`)
  ]);
  const stem = composeSentences(ctx, `مدينتان بينهما ${u(total, 'km')}. انطلقت ${sc.one} أ من الأولى بسرعة ${sA} كم/ساعة. بعد ${u(delay, 'hour', 'oblique')} انطلقت ${sc.one} ب من الثانية باتجاه أ بسرعة ${sB} كم/ساعة. بعد كم ساعة من انطلاق ب تلتقي ${sc.dual}؟`);
  return buildBase(ctx, {
    templateId: 'SPD_H_MEET_DELAY',
    scenario: sc.key,
    subskill: 'التقاء مركبتين مع انطلاق متأخر',
    difficulty: 'hard',
    question: stem.text,
    stemStructure: stem.structure, informationOrder: stem.order,
    correct, distractors, format: unitFormat('hour'),
    steps: [
      `ما قطعته أ أثناء التأخير = ${sA} × ${num(delay)} = ${num(sA * delay)}.`,
      `المسافة المتبقية بينهما = ${total} − ${num(sA * delay)} = ${num(remaining)}.`,
      `سرعة الاقتراب = ${sA} + ${sB} = ${sA + sB}.`,
      `الزمن بالساعات = ${num(remaining)} ÷ ${sA + sB} = ${num(correct)}.`
    ],
    howToStart: 'احسب أولًا ما قطعته ${sc.def} التي بدأت مبكرًا.',
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
  const sc = sceneFor(ctx, 'journey');
  const {rng} = ctx;
  const sA = rng.pick([50, 60, 72, 80]);
  const sB = rng.pick([80, 90, 96, 100, 120]);
  if (sB <= sA) return resample(ctx, catchupDelayed);
  const delay = rng.pick([1, 1.5, 2]);
  const lead = sA * delay;
  const t = Fraction.from(lead).div(sB - sA);
  if (!t.isExactDecimal || t.decimalPlaces > 1) return resample(ctx, catchupDelayed);
  const correct = t.toNumber();
  const params = {speedA: sA, speedB: sB, delayHours: delay};
  const distractors = usable(ctx, [
    mk(lead / sB, 'DIVIDED_BY_ONE_SPEED', `${num(lead)} ÷ ${sB}`),
    mk(lead / sA, 'DIVIDED_BY_ONE_SPEED', `${num(lead)} ÷ ${sA}`),
    mk(lead / (sA + sB), 'USED_SUM_OF_SPEEDS_IN_CHASE', `${num(lead)} ÷ (${sA} + ${sB})`),
    mk(delay + correct, 'ADDED_DELAY_TO_ANSWER', `${num(delay)} + ${num(correct)}`),
    // RC2-012: built from the head start and the closing speed instead of from
    // the answer.
    mk(lead / (sB - sA + 10), 'MISREAD_THE_STEP', `${num(lead)} ÷ (${sB} − ${sA} + 10)`, 2),
    mk(lead * 2 / (sB - sA), 'APPLIED_STEP_TWICE', `${num(lead)} × 2 ÷ ${sB - sA}`, 2),
    mk(delay, 'USED_GIVEN_VALUE_AS_ANSWER', `مدة التأخير ${num(delay)}`),
    mk(lead / (sB - sA) / 2, 'HALF_DISTANCE_AS_ANSWER', `${num(lead)} ÷ ${sB - sA} ÷ 2`, 2),
    mk(sB * delay / (sB - sA), 'RATE_APPLIED_TO_WRONG_COUNT', `${sB} × ${num(delay)} ÷ ${sB - sA}`),
    mk(lead / sB * 2, 'APPLIED_STEP_TWICE', `${num(lead)} ÷ ${sB} × 2`),
    mk((sB - sA) / sA * delay, 'INVERTED_SPEED_TIME', `(${sB} − ${sA}) ÷ ${sA} × ${num(delay)}`),
    mk(lead, 'STOPPED_AT_INTERMEDIATE_TOTAL', `${sA} × ${num(delay)}`),
    mk(sB * delay / (sB - sA), 'RATE_APPLIED_TO_WRONG_COUNT', `${sB} × ${num(delay)} ÷ (${sB} − ${sA})`),
    mk((sB - sA) * delay, 'MULTIPLIED_INSTEAD_OF_DIVIDED', `(${sB} − ${sA}) × ${num(delay)}`),
    mk((sA + sB) * delay, 'USED_SUM_OF_SPEEDS_IN_CHASE', `(${sA} + ${sB}) × ${num(delay)}`)
  ]);
  const stem = composeSentences(ctx, `انطلقت ${sc.one} أ بسرعة ${sA} كم/ساعة. بعد ${u(delay, 'hour', 'oblique')} انطلقت ${sc.one} ب من المكان نفسه وفي الاتجاه نفسه بسرعة ${sB} كم/ساعة. بعد كم ساعة من انطلاق ب تلحق ب${sc.one} أ؟`);
  return buildBase(ctx, {
    templateId: 'SPD_H_CATCH',
    scenario: sc.key,
    subskill: 'لحاق مع انطلاق متأخر',
    difficulty: 'easy',
    question: stem.text,
    stemStructure: stem.structure, informationOrder: stem.order,
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
  const sc = sceneFor(ctx, 'journey');
  const {rng} = ctx;
  // RC2-011. The answer is the distance, drawn from five values.
  const s1 = rng.pick([30, 40, 45, 50, 60, 70, 75]);
  const s2 = rng.pick([80, 90, 100, 105, 120, 125, 140, 150]);
  const distance = rng.pick([120, 150, 180, 210, 240, 270, 300, 350, 360, 420, 450, 480, 525, 540, 600, 630, 700, 720]);
  if (distance % s1 || distance % s2) return resample(ctx, sameDistanceTimeDifference);
  const diff = distance / s1 - distance / s2;
  if (diff <= 0) return resample(ctx, sameDistanceTimeDifference);
  const correct = distance;
  const params = {speedA: s1, speedB: s2, timeDifference: diff};
  const distractors = usable(ctx, [
    // RC2-013. Every label in this block used to name something absent from the
    // stem: two chase sentences and one meeting sentence on a question with
    // neither, and two "you divided" sentences over derivations that multiply.
    mk(s1 * diff, 'USED_ONE_SPEED_WITH_TIME_GAP', `${s1} × ${num(diff)}`),
    mk(s2 * diff, 'USED_ONE_SPEED_WITH_TIME_GAP', `${s2} × ${num(diff)}`),
    mk((s1 + s2) * diff, 'USED_SUM_WHERE_DIFFERENCE_BELONGS', `(${s1} + ${s2}) × ${num(diff)}`),
    mk((s2 - s1) * diff, 'USED_SPEED_DIFFERENCE_WITH_TIME_GAP', `(${s2} − ${s1}) × ${num(diff)}`),
    mk(s1 * s2 * diff / (s1 + s2), 'USED_SUM_WHERE_DIFFERENCE_BELONGS', `${s1} × ${s2} × ${num(diff)} ÷ (${s1} + ${s2})`),
    // RC2-012: deepened; this template threw away more than half its draws once
    // the key-neighbour padding was removed.
    mk(s1 * s2 / (s2 - s1), 'STOPPED_AT_UNIT_RATE', `${s1} × ${s2} ÷ (${s2} − ${s1})`),
    mk(s1 * s2 * diff / (s2 - s1) / 2, 'HALF_DISTANCE_AS_ANSWER', `${s1} × ${s2} × ${num(diff)} ÷ (${s2} − ${s1}) ÷ 2`),
    mk(s1 * s2 * diff / (s2 - s1) * 2, 'APPLIED_STEP_TWICE', `${s1} × ${s2} × ${num(diff)} ÷ (${s2} − ${s1}) × 2`),
    mk((s1 + s2) * diff / 2, 'USED_ARITHMETIC_MEAN_OF_SPEEDS', `(${s1} + ${s2}) × ${num(diff)} ÷ 2`),
    mk(diff * s1 * s2, 'MULTIPLIED_INSTEAD_OF_DIVIDED', `${num(diff)} × ${s1} × ${s2}`)
  ]);
  const stem = composeSentences(ctx, `المسافة نفسها تُقطع بسرعة ${s1} كم/ساعة أو بسرعة ${s2} كم/ساعة. إذا كان الزمن عند السرعة ${s1} أطول بمقدار ${u(diff, 'hour', 'oblique')}، فما المسافة؟`);
  return buildBase(ctx, {
    templateId: 'SPD_H_TIME_DIFF',
    scenario: sc.key,
    subskill: 'استنتاج المسافة من فرق الزمن',
    difficulty: 'hard',
    question: stem.text,
    stemStructure: stem.structure, informationOrder: stem.order,
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
    // RC2-019: a reusable rule first, then this instance.
    fastMethod: `عند ثبات المسافة، حل المعادلة: المسافة × (1 ÷ السرعة الأبطأ − 1 ÷ السرعة الأسرع) = فرق الزمن — هنا س × (1 ÷ ${s1} − 1 ÷ ${s2}) = ${num(diff)}.`,
    estimatedSteps: 5, conceptTags: ['speed', 'equation'], parameters: params,
    oracle: {
      kind: 'constraint', answerKind: 'number',
      constraints: [eq(mul(X, sub(s2, s1)), mul(diff, s1, s2))]
    },
    askedUnknown: 'distanceFromTimeGap', stageCount: 3,
    pedagogy: {
      targetSkill: 'DISTANCE_FROM_TIME_GAP', targetMisconception: 'USED_ONE_SPEED_WITH_TIME_GAP',
      wrongMethodValue: s1 * diff,
      degenerateWhen: [{when: s1 === s2, note: 'equal speeds leave no time gap'}]
    },
    complexityFactors: {reasoningTransformations: 4, conceptCount: 2, equationSolving: 1, stageCount: 2, arithmeticBurden: 4},
    textParams: {essentialParams: ['speedA', 'speedB']}
  });
}

/**
 * RC2.6-1. SIMULTANEOUS_CONSTRAINTS + COMPOSED_INVERSION.
 *
 * A boat covers the same distance downstream and upstream in different times.
 * Neither the boat's own speed nor the current is stated, and neither can be
 * read off one of the two journeys: the pair of them is what fixes the two
 * unknowns. The solver has to see that adding the two speeds cancels the
 * current and subtracting them isolates it — a strategy the stem does not give.
 */
function boatAgainstCurrent(ctx) {
  const sc = sceneFor(ctx, 'journey');
  const {rng} = ctx;
  let found = null;
  for (let t = 0; t < 300; t++) {
    const boat = rng.pick([12, 15, 16, 18, 20, 24, 25, 30]);
    const current = rng.pick([2, 3, 4, 5, 6]);
    if (current >= boat / 2) continue;
    const down = boat + current, up = boat - current;
    // Both journeys must come out in whole hours from one whole distance.
    const distance = down * up;
    if (distance > 600) continue;
    const tDown = distance / down, tUp = distance / up;
    if (tDown === tUp || tUp - tDown < 1) continue;
    found = {boat, current, down, up, distance, tDown, tUp};
    break;
  }
  if (!found) return resample(ctx, boatAgainstCurrent);
  const {boat, current, down, up, distance, tDown, tUp} = found;
  // Which of the two unknowns is asked is drawn, not chosen for its value.
  const askCurrent = rng.bool(0.5);
  const correct = askCurrent ? current : boat;
  const params = {distance, downstreamHours: tDown, upstreamHours: tUp};

  const distractors = usable(ctx, [
    mk(askCurrent ? boat : current, 'SWAPPED_THE_TWO_UNKNOWNS',
      askCurrent ? `سرعة القارب ${boat}` : `سرعة التيار ${current}`, 3),
    mk(down, 'SOLVED_ONE_CONDITION_ONLY', `${distance} ÷ ${tDown}`),
    mk(up, 'SOLVED_ONE_CONDITION_ONLY', `${distance} ÷ ${tUp}`),
    mk(down - up, 'FORGOT_TO_HALVE_THE_DIFFERENCE', `${down} − ${up}`),
    mk(down + up, 'ADDED_INSTEAD_OF_SUBTRACTED', `${down} + ${up}`),
    mk(distance / (tDown + tUp), 'ADDED_TIMES_INSTEAD_OF_RATES', `${distance} ÷ (${tDown} + ${tUp})`),
    mk(Math.abs(tUp - tDown), 'USED_GIVEN_VALUE_AS_ANSWER', `${tUp} − ${tDown}`)
  ]);

  const stem = composeSentences(ctx, `قطع قارب ${u(distance, 'km')} مع التيار في ${u(tDown, 'hour', 'oblique')}، وقطع المسافة نفسها ضد التيار في ${u(tUp, 'hour', 'oblique')}. `
    + (askCurrent ? 'فما سرعة التيار؟' : 'فما سرعة القارب في الماء الساكن؟'));
  return buildBase(ctx, {
    templateId: 'SPD_H_CURRENT',
    scenario: sc.key,
    scenario: 'boat_with_and_against_current',
    direction: askCurrent ? 'reverse' : 'forward',
    subskill: askCurrent ? 'سرعة التيار من رحلتي ذهاب وعودة' : 'سرعة القارب من رحلتي ذهاب وعودة',
    difficulty: 'hard',
    question: stem.text,
    stemStructure: stem.structure, informationOrder: stem.order,
    correct, distractors, format: v => `${num(v)} كم/ساعة`,
    steps: [
      `السرعة مع التيار = ${distance} ÷ ${tDown} = ${down}.`,
      `السرعة ضد التيار = ${distance} ÷ ${tUp} = ${up}.`,
      `السرعة مع التيار هي سرعة القارب زائد التيار، وضد التيار هي سرعة القارب ناقص التيار.`,
      askCurrent
        ? `بطرح العبارتين تختفي سرعة القارب: ${down} − ${up} = ${down - up}، وهذا ضعف سرعة التيار، إذن سرعة التيار = ${down - up} ÷ 2 = ${current}.`
        : `بجمع العبارتين يختفي التيار: ${down} + ${up} = ${down + up}، وهذا ضعف سرعة القارب، إذن سرعة القارب = ${down + up} ÷ 2 = ${boat}.`
    ],
    howToStart: 'احسب السرعتين أولًا، ثم لاحظ أن إحداهما سرعة القارب زائد التيار والأخرى ناقصه.',
    remember: 'الجمع يلغي التيار، والطرح يلغي سرعة القارب؛ اختر العملية التي تحذف المجهول الذي لا تريده.',
    fastMethod: askCurrent ? 'نصف الفرق بين السرعتين.' : 'نصف مجموع السرعتين.',
    estimatedSteps: 4, conceptTags: ['speed', 'two-unknowns', 'elimination'], parameters: params,
    oracle: {
      kind: 'constraint', answerKind: 'number',
      constraints: [eq(mul(X, 2), askCurrent ? sub(down, up) : add(down, up))]
    },
    askedUnknown: askCurrent ? 'currentSpeed' : 'boatSpeed', stageCount: 3,
    pedagogy: {
      targetSkill: 'ELIMINATE_ONE_UNKNOWN', targetMisconception: 'SOLVED_ONE_CONDITION_ONLY',
      wrongMethodValue: askCurrent ? down - up : down,
      degenerateWhen: [{when: tDown === tUp, note: 'the two journeys take the same time, so there is no current to find'}]
    },
    complexityFactors: {reasoningTransformations: 4, conceptCount: 3, equationSolving: 1, conditionCount: 2, stageCount: 3, arithmeticBurden: 5},
    textParams: {essentialParams: ['distance', 'downstreamHours', 'upstreamHours']}
  });
}

/**
 * RC2.6-1. SIMULTANEOUS_CONSTRAINTS + STRATEGY_SELECTION.
 *
 * A journey in two legs. The total distance and the total time are given and
 * both leg speeds are given, but neither leg's LENGTH is — so the split has to
 * be recovered from the pair of conditions together. A solver who averages the
 * two speeds, or who divides the total distance by the total time, gets a
 * number that is on the paper and is wrong.
 */
function twoLegSplit(ctx) {
  const sc = sceneFor(ctx, 'journey');
  const {rng} = ctx;
  let found = null;
  for (let t = 0; t < 300; t++) {
    const s1 = rng.pick([30, 40, 45, 50, 60]);
    const s2 = rng.pick([60, 70, 75, 80, 90, 100]);
    if (s2 <= s1) continue;
    const t1 = rng.int(1, 4), t2 = rng.int(1, 4);
    if (t1 === t2) continue;
    const d1 = s1 * t1, d2 = s2 * t2;
    const total = d1 + d2, hours = t1 + t2;
    // A trip whose legs are equal in length is answerable without the split.
    if (d1 === d2) continue;
    found = {s1, s2, t1, t2, d1, d2, total, hours};
    break;
  }
  if (!found) return resample(ctx, twoLegSplit);
  const {s1, s2, t1, t2, d1, d2, total, hours} = found;
  // RC2.6-3. Two constructions over the same relation: the LENGTH of the first
  // leg, or the TIME spent on the second. Different unknown, different final
  // step, same two conditions — which is what makes it a different construction
  // rather than the same question with new numbers.
  const askHours = askOf(ctx, rng, ['secondLegHours', 'firstLegDistance']) === 'secondLegHours';
  const correct = askHours ? t2 : d1;
  const params = {totalDistance: total, totalHours: hours, firstSpeed: s1, secondSpeed: s2};

  const distractors = usable(ctx, askHours ? [
    mk(t1, 'SWAPPED_THE_TWO_UNKNOWNS', `ساعات السرعة الأولى ${t1}`, 3),
    mk(hours / 2, 'ASSUMED_EQUAL_SHARES', `${hours} ÷ 2`),
    mk(hours, 'USED_GIVEN_VALUE_AS_ANSWER', `الزمن الكلي ${hours}`),
    mk(total / s2, 'SOLVED_ONE_CONDITION_ONLY', `${total} ÷ ${s2}`),
    mk(total / s1, 'SOLVED_ONE_CONDITION_ONLY', `${total} ÷ ${s1}`),
    mk(hours + t2, 'ADDED_INSTEAD_OF_SUBTRACTED', `${hours} + ${t2}`),
    mk(d2, 'STOPPED_AT_INTERMEDIATE_TOTAL', `طول الجزء الثاني ${d2}`, 2),
    mk(total / hours, 'STOPPED_AT_INTERMEDIATE_TOTAL', `${total} ÷ ${hours}`, 1)
  ] : [
    mk(d2, 'SWAPPED_THE_TWO_UNKNOWNS', `طول المرحلة الثانية ${d2}`, 3),
    mk(total / 2, 'ASSUMED_EQUAL_SHARES', `${total} ÷ 2`),
    mk(s1 * hours, 'SOLVED_ONE_CONDITION_ONLY', `${s1} × ${hours}`),
    mk(s2 * hours, 'SOLVED_ONE_CONDITION_ONLY', `${s2} × ${hours}`),
    mk(total / hours, 'STOPPED_AT_INTERMEDIATE_TOTAL', `${total} ÷ ${hours}`, 1),
    mk(s1 * t2, 'SWAPPED_THE_TWO_UNKNOWNS', `${s1} × ${t2}`),
    mk((s1 + s2) / 2 * hours, 'USED_ARITHMETIC_MEAN_OF_AVERAGES', `(${s1} + ${s2}) ÷ 2 × ${hours}`),
    mk(total - s1 * hours, 'SOLVED_ONE_CONDITION_ONLY', `${total} − ${s1} × ${hours}`)
  ]);

  const stem = composeSentences(ctx, `قطعت ${sc.one} ${u(total, 'km')} في ${u(hours, 'hour', 'oblique')}. سارت جزءًا من الرحلة بسرعة ${s1} كم/ساعة والجزء الباقي بسرعة ${s2} كم/ساعة. `
    + (askHours ? 'فكم ساعة سارت بالسرعة الثانية؟' : 'فما طول الجزء الأول؟'));
  return buildBase(ctx, {
    templateId: 'SPD_H_LEG_SPLIT',
    scenario: sc.key,
    scenario: 'journey_split_between_two_speeds',
    direction: 'reverse',
    subskill: askHours ? 'زمن مرحلة من مسافة كلية وزمن كلي وسرعتين' : 'طول مرحلة من مسافة كلية وزمن كلي وسرعتين',
    difficulty: 'hard',
    question: stem.text,
    stemStructure: stem.structure, informationOrder: stem.order,
    correct, distractors, format: askHours ? unitFormat('hour') : unitFormat('km'),
    steps: [
      `لو كانت الرحلة كلها بالسرعة الأولى لقطعت ${s1} × ${hours} = ${s1 * hours}.`,
      `الفارق عن المسافة الحقيقية = ${total} − ${s1 * hours} = ${total - s1 * hours}.`,
      `كل ساعة تُنقل إلى السرعة الثانية تضيف ${s2} − ${s1} = ${s2 - s1}.`,
      `عدد ساعات الجزء الثاني = ${total - s1 * hours} ÷ ${s2 - s1} = ${t2}، فساعات الجزء الأول = ${hours} − ${t2} = ${t1}.`,
      askHours
        ? `إذن ساعات السرعة الثانية = ${t2}.`
        : `طول الجزء الأول = ${s1} × ${t1} = ${correct}.`
    ],
    howToStart: 'افترض أن الرحلة كلها بالسرعة الأصغر، ثم انظر كم تنقص المسافة عن الحقيقة.',
    remember: 'عند وجود سرعتين ومسافة كلية وزمن كلي، الشرطان معًا هما ما يحدد التقسيم؛ أي شرط وحده لا يكفي.',
    fastMethod: 'الفارق عن الحالة الافتراضية مقسومًا على فرق السرعتين يعطي زمن الجزء الآخر.',
    estimatedSteps: 4, conceptTags: ['speed', 'two-unknowns', 'weighted-split'], parameters: params,
    oracle: {
      kind: 'constraint', answerKind: 'number',
      // d1/s1 + (total - d1)/s2 = hours, cleared of denominators.
      constraints: askHours
        ? [eq(add(mul(X, s2), mul(sub(hours, X), s1)), total)]
        : [eq(add(mul(X, s2), mul(sub(total, X), s1)), mul(hours, s1 * s2))]
    },
    askedUnknown: askHours ? 'secondLegHours' : 'firstLegDistance', stageCount: 3,
    pedagogy: {
      targetSkill: 'SPLIT_FROM_TWO_TOTALS', targetMisconception: 'ASSUMED_EQUAL_SHARES',
      wrongMethodValue: askHours ? hours / 2 : total / 2,
      degenerateWhen: [{when: d1 === d2, note: 'the two legs are equal, so halving the distance is correct'}]
    },
    complexityFactors: {reasoningTransformations: 4, conceptCount: 3, equationSolving: 1, conditionCount: 2, stageCount: 3, arithmeticBurden: 5},
    textParams: {essentialParams: ['totalDistance', 'totalHours', 'firstSpeed', 'secondSpeed']}
  });
}
