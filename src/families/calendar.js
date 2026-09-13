import {DAYS_AR, dayShift} from '../utils.js';
import {mk, usable, u, unitFormat, buildBase, eq, X, add, sub, mod, resample, adj, bandPool, composeSentences} from './_shared.js';
import {grid} from '../qa/oracle-engine.js';

export function generateCalendar({difficulty, rng, seed, engineVersion, telemetry}) {
  const ctx = {difficulty, rng, seed, engineVersion, telemetry, family: 'calendar', family_ar: 'الاستدلال الزمني وأيام الأسبوع', category: 'الاستدلال الزمني وأيام الأسبوع'};
  // RC2.3-1. The catalogue, not a set of per-band pools: which of these is
  // eligible for the requested band is decided by the structural adjudication in
  // src/qa/structure.js, so a template cannot sit in a band nobody adjudicated.
  return bandPool(rng, 'calendar', difficulty, [
    ['CAL_E_TOM', tomorrowKnown],
    ['CAL_E_AFTER', afterTomorrow],
    ['CAL_M_COMPOUND', compoundForward],
    ['CAL_M_TWO_SHIFT', forwardThenBack],
    ['CAL_H_LONG', longOffset],
    ['CAL_H_NESTED', nestedOffset],
    ['CAL_H_CYCLE_MEET', twoCyclesMeet],
    ['CAL_H_MONTH_LENGTH', monthLengthFromTwoDates],
    ['CAL_H_OFFSET_CYCLES', offsetCyclesMeet]
  ])(ctx);
}

const dayName = i => DAYS_AR[((i % 7) + 7) % 7];

/**
 * Section 1-A / 7. The oracle for this family is an exhaustive sweep of all
 * seven days, keeping the ones that satisfy the sentence as stated. It computes
 * no offset of its own, so an off-by-one in the generator cannot be mirrored
 * here — it shows up as a disagreement.
 */
function daySearchOracle(netOffset, targetIndex) {
  return {
    kind: 'search',
    answerKind: 'dayIndex',
    domain: grid(0, 6),
    constraints: [eq(mod(add(X, netOffset), 7), targetIndex)]
  };
}

/**
 * Wrong days a learner actually lands on. Each carries the specific slip that
 * produces it, and only distinct days survive.
 */
function shiftLabel(days) {
  if (days === 0) return 'عدم التحرك أصلًا';
  return days > 0 ? `الرجوع ${u(days, 'day', 'oblique')}` : `التقدم ${u(-days, 'day', 'oblique')}`;
}

/**
 * There are only six days a learner can land on other than the answer, so the
 * named slips are laid down first and any remaining places are filled from the
 * miscount ladder — each still labelled with the number of days that slip
 * actually moves, never with a generic sentence.
 *
 * @param {number} correctIndex index of the correct day
 * @param {number} netOffset    how far the answer sits from the stated day
 * @param {Array<{index:number, misconceptionId:string, derivation:string}>} preferred
 */
function dayDistractors(ctx, correctIndex, netOffset, preferred) {
  const chosen = new Map();
  for (const p of preferred) {
    const idx = ((p.index % 7) + 7) % 7;
    if (idx === ((correctIndex % 7) + 7) % 7) continue;
    if (chosen.has(idx)) continue;
    chosen.set(idx, mk(dayName(idx), p.misconceptionId, p.derivation));
  }
  for (const k of [1, -1, 2, -2, 3, -3]) {
    if (chosen.size >= 6) break;
    const idx = ((correctIndex + k) % 7 + 7) % 7;
    if (idx === ((correctIndex % 7) + 7) % 7 || chosen.has(idx)) continue;
    // Landing k days after the answer means moving `netOffset - k` instead of
    // `netOffset` from the stated day.
    chosen.set(idx, mk(dayName(idx), 'OFF_BY_ONE_STEP', `${shiftLabel(netOffset - k)} بدل ${shiftLabel(netOffset)}`));
  }
  return usable(ctx, [...chosen.values()]);
}

function tomorrowKnown(ctx) {
  const {rng} = ctx;
  const today = rng.int(0, 6);
  const target = dayShift(today, 1);
  const correct = DAYS_AR[today];
  const distractors = dayDistractors(ctx, today, 1, [
    {index: target + 1, misconceptionId: 'SHIFTED_WRONG_DIRECTION', derivation: `التقدم يومًا واحدًا من ${DAYS_AR[target]} بدل الرجوع`},
    {index: target, misconceptionId: 'USED_GIVEN_VALUE_AS_ANSWER', derivation: `اليوم المذكور نفسه ${DAYS_AR[target]}`}
  ]);
  const stem = composeSentences(ctx, `إذا كان غدًا هو يوم ${DAYS_AR[target]}، فما اليوم الحالي؟`);
  return buildBase(ctx, {
    templateId: 'CAL_E_TOM',
    subskill: 'معرفة اليوم من الغد',
    difficulty: 'easy',
    question: stem.text,
    stemStructure: stem.structure, informationOrder: stem.order,
    correct, distractors, format: v => String(v),
    steps: [
      `الغد يبعد يومًا واحدًا عن اليوم الحالي.`,
      `نرجع يومًا واحدًا من ${DAYS_AR[target]} فنصل إلى ${correct}.`
    ],
    howToStart: 'ارجع يومًا واحدًا من اليوم المعلوم.',
    remember: 'في مسائل الأيام، حدد الإزاحة ثم تحرك في الاتجاه المعاكس.',
    fastMethod: 'ارجع يومًا واحدًا فقط.',
    estimatedSteps: 1, conceptTags: ['calendar'], parameters: {targetDayIndex: target, netOffset: 1},
    oracle: daySearchOracle(1, target),
    askedUnknown: 'todayFromOffset', stageCount: 1,
    // RC2-005. Moving forward from the stated day instead of back.
    pedagogy: {
      targetSkill: 'DAY_OFFSET_DIRECTION', targetMisconception: 'SHIFTED_WRONG_DIRECTION',
      wrongMethodValue: dayName(target + 1)
    },
    complexityFactors: {reasoningTransformations: 1, conceptCount: 1, stageCount: 1},
    textParams: false
  });
}

function afterTomorrow(ctx) {
  const {rng} = ctx;
  const today = rng.int(0, 6);
  const target = dayShift(today, 2);
  const correct = DAYS_AR[today];
  const distractors = dayDistractors(ctx, today, 2, [
    {index: target + 2, misconceptionId: 'SHIFTED_WRONG_DIRECTION', derivation: `التقدم يومين من ${DAYS_AR[target]} بدل الرجوع`},
    {index: target, misconceptionId: 'USED_GIVEN_VALUE_AS_ANSWER', derivation: `اليوم المذكور نفسه ${DAYS_AR[target]}`}
  ]);
  const stem = composeSentences(ctx, `إذا كان بعد غد هو يوم ${DAYS_AR[target]}، فما اليوم الحالي؟`);
  return buildBase(ctx, {
    templateId: 'CAL_E_AFTER',
    subskill: 'معرفة اليوم من بعد غد',
    difficulty: 'easy',
    question: stem.text,
    stemStructure: stem.structure, informationOrder: stem.order,
    correct, distractors, format: v => String(v),
    steps: [
      `«بعد غد» يبعد يومين عن اليوم الحالي.`,
      `نرجع يومين من ${DAYS_AR[target]} فنصل إلى ${correct}.`
    ],
    howToStart: 'ارجع يومين من «بعد غد».',
    remember: 'ثبّت عدد الأيام في العبارة قبل التحرك.',
    fastMethod: 'بعد غد يساوي اليوم زائد يومين.',
    estimatedSteps: 2, conceptTags: ['calendar'], parameters: {targetDayIndex: target, netOffset: 2},
    oracle: daySearchOracle(2, target),
    askedUnknown: 'todayFromOffset', stageCount: 1,
    pedagogy: {
      targetSkill: 'DAY_OFFSET_DIRECTION', targetMisconception: 'SHIFTED_WRONG_DIRECTION',
      wrongMethodValue: dayName(target + 2)
    },
    complexityFactors: {reasoningTransformations: 1, conceptCount: 1, stageCount: 1, arithmeticBurden: 1},
    textParams: false
  });
}

function compoundForward(ctx) {
  const {rng} = ctx;
  const ahead = rng.pick([2, 3, 4]);
  const netOffset = 1 + ahead;
  const today = rng.int(0, 6);
  const target = dayShift(today, netOffset);
  const correct = DAYS_AR[today];
  const aheadWord = u(ahead, 'day', 'oblique');
  const distractors = dayDistractors(ctx, today, netOffset, [
    {index: target - ahead, misconceptionId: 'IGNORED_NET_OFFSET', derivation: `الرجوع ${u(ahead, 'day', 'oblique')} فقط ونسيان يوم الغد`},
    {index: target + netOffset, misconceptionId: 'SHIFTED_WRONG_DIRECTION', derivation: `التقدم ${u(netOffset, 'day', 'oblique')} بدل الرجوع`},
    {index: target, misconceptionId: 'USED_GIVEN_VALUE_AS_ANSWER', derivation: `اليوم المذكور نفسه ${DAYS_AR[target]}`}
  ]);
  const stem = composeSentences(ctx, `اليوم الذي يلي غدًا بمقدار ${aheadWord} هو ${DAYS_AR[target]}. فما اليوم الحالي؟`);
  return buildBase(ctx, {
    templateId: 'CAL_M_COMPOUND',
    subskill: 'إزاحة مركبة أمامية من الغد',
    difficulty: 'easy',
    // RC2.1-4. Was «اليوم الذي يأتي بعد X من غد هو Y». The nesting is the point of
    // the item and is kept; only the wording is straightened. «بعد غدٍ بـX» is
    // deliberately NOT used: «بعد غد» is itself an idiom for today+2, so that
    // phrasing would read as (today+2)+X and change the question.
    question: stem.text,
    stemStructure: stem.structure, informationOrder: stem.order,
    correct, distractors, format: v => String(v),
    steps: [
      `«غد» إزاحة قدرها 1، ثم ${u(ahead, 'day', 'oblique')} ${adj(ahead, 'day', 'إضافي')}.`,
      `الإزاحة الصافية = 1 + ${ahead} = ${netOffset}.`,
      `نرجع ${u(netOffset, 'day', 'oblique')} من ${DAYS_AR[target]} فنصل إلى ${correct}.`
    ],
    howToStart: 'حوّل العبارة المركبة إلى إزاحة واحدة من اليوم الحالي.',
    remember: 'غد تساوي +1، فاجمعها مع بقية الأيام قبل التحرك.',
    fastMethod: `ارجع ${u(netOffset, 'day', 'oblique')} من اليوم المذكور.`,
    estimatedSteps: 2, conceptTags: ['calendar'], parameters: {aheadDays: ahead, targetDayIndex: target, netOffset},
    oracle: daySearchOracle(netOffset, target),
    askedUnknown: 'todayFromCompoundOffset', stageCount: 2,
    // RC2-005. The headline slip: going back only the extra days and forgetting
    // that "tomorrow" is itself a shift of one.
    pedagogy: {
      targetSkill: 'COMPOUND_NET_OFFSET', targetMisconception: 'IGNORED_NET_OFFSET',
      wrongMethodValue: dayName(target - ahead)
    },
    complexityFactors: {reasoningTransformations: 2, conceptCount: 1, stageCount: 2, arithmeticBurden: 1},
    textParams: false
  });
}

function forwardThenBack(ctx) {
  const {rng} = ctx;
  const today = rng.int(0, 6);
  const afterTom = dayShift(today, 2);
  const back = rng.pick([2, 3, 4]);
  const asked = dayShift(today, -back);
  const correct = DAYS_AR[asked];
  // Two chained shifts: from the stated day, go back 2 to reach today, then
  // back `back` more. Net offset from the answer to the stated day is 2 + back.
  const netOffset = 2 + back;
  const distractors = dayDistractors(ctx, asked, netOffset, [
    {index: today, misconceptionId: 'STOPPED_AFTER_FIRST_STAGE', derivation: 'التوقف عند تحديد اليوم الحالي'},
    {index: afterTom - back, misconceptionId: 'IGNORED_NET_OFFSET', derivation: `الرجوع ${u(back, 'day', 'oblique')} من ${DAYS_AR[afterTom]} مباشرة`},
    {index: asked + back, misconceptionId: 'SHIFTED_WRONG_DIRECTION', derivation: `التقدم ${u(back, 'day', 'oblique')} بدل الرجوع`},
    {index: afterTom, misconceptionId: 'USED_GIVEN_VALUE_AS_ANSWER', derivation: `اليوم المذكور نفسه ${DAYS_AR[afterTom]}`}
  ]);
  const stem = composeSentences(ctx, `إذا كان بعد غد هو ${DAYS_AR[afterTom]}، فما اليوم الذي كان قبل ${u(back, 'day', 'oblique')} من اليوم؟`);
  return buildBase(ctx, {
    templateId: 'CAL_M_TWO_SHIFT',
    subskill: 'تحديد اليوم الحالي ثم الرجوع عدة أيام',
    difficulty: 'easy',
    question: stem.text,
    stemStructure: stem.structure, informationOrder: stem.order,
    correct, distractors, format: v => String(v),
    steps: [
      `من «بعد غد = ${DAYS_AR[afterTom]}» نرجع يومين فنحدد اليوم الحالي: ${DAYS_AR[today]}.`,
      `ثم نرجع ${u(back, 'day', 'oblique')} من ${DAYS_AR[today]} فنصل إلى ${correct}.`,
      `الإزاحة الكلية من اليوم المطلوب إلى اليوم المذكور = 2 + ${back} = ${netOffset}.`
    ],
    howToStart: 'ثبّت اليوم الحالي أولًا ثم نفّذ الإزاحة الثانية.',
    remember: 'لا تخلط بين الإزاحتين؛ نفّذ كل واحدة على حدة.',
    fastMethod: 'بعد غد ← اليوم الحالي، ثم ارجع العدد المطلوب.',
    estimatedSteps: 3, conceptTags: ['calendar', 'stages'],
    parameters: {backDays: back, afterTomorrowIndex: afterTom, netOffset},
    oracle: daySearchOracle(netOffset, afterTom),
    askedUnknown: 'pastDayFromFutureAnchor', stageCount: 2,
    // RC2-005. Stopping at "today" instead of carrying out the second shift.
    pedagogy: {
      targetSkill: 'CHAINED_DAY_SHIFTS', targetMisconception: 'STOPPED_AFTER_FIRST_STAGE',
      wrongMethodValue: dayName(today)
    },
    complexityFactors: {reasoningTransformations: 2, conceptCount: 2, stageCount: 2, arithmeticBurden: 1},
    textParams: false
  });
}

/**
 * Section 7. The fixed template.
 *
 * "The day that precedes, by M days, the day falling N days after tomorrow is
 * T. What is today?"
 *
 * Tomorrow is +1, then N more, then M back: netOffset = 1 + N - M. The engine
 * previously computed this net offset correctly in the explanation but applied
 * N - M when placing the target day, so every generated item of this shape was
 * one day out. Here there is a single offset, computed once and used once.
 */
function nestedOffset(ctx) {
  const {rng} = ctx;
  const ahead = rng.pick([2, 3, 4]);
  const behind = rng.pick([1, 2, 3]);
  const netOffset = 1 + ahead - behind;
  // Section 7: a net offset of zero (mod 7) makes the answer the stated day
  // itself and produces the sentence "go back 0 days". The item is sound
  // arithmetically but degenerate for a template built on compound reasoning.
  if (((netOffset % 7) + 7) % 7 === 0) return resample(ctx, nestedOffset);
  const today = rng.int(0, 6);
  const target = dayShift(today, netOffset);
  const correct = DAYS_AR[today];
  const aheadWord = u(ahead, 'day', 'oblique');
  const behindWord = u(behind, 'day', 'oblique');
  const distractors = dayDistractors(ctx, today, netOffset, [
    // The headline slip this template teaches against: treating the net offset
    // as N - M and forgetting that "tomorrow" is itself a shift of one.
    {index: target - (ahead - behind), misconceptionId: 'IGNORED_NET_OFFSET', derivation: `الرجوع ${u(ahead - behind, 'day', 'oblique')} ونسيان أن «الغد» إزاحة قدرها 1`},
    {index: target + netOffset, misconceptionId: 'SHIFTED_WRONG_DIRECTION', derivation: `التقدم ${u(netOffset, 'day', 'oblique')} بدل الرجوع`},
    {index: target, misconceptionId: 'USED_GIVEN_VALUE_AS_ANSWER', derivation: `اليوم المذكور نفسه ${DAYS_AR[target]}`},
    {index: target - (1 + ahead + behind), misconceptionId: 'SHIFTED_WRONG_DIRECTION', derivation: 'جمع الإزاحة الخلفية بدل طرحها'}
  ]);
  const stem = composeSentences(ctx, `ابدأ من غدٍ، ثم تقدّم بمقدار ${aheadWord}، ثم تراجع بمقدار ${behindWord}، فتصل إلى ${DAYS_AR[target]}. فما اليوم الحالي؟`);
  return buildBase(ctx, {
    templateId: 'CAL_H_NESTED',
    subskill: 'إزاحة زمنية مركبة أمامية وخلفية',
    difficulty: 'medium',
    // RC2.1-4. Was a triple-nested relative clause. Same arithmetic —
    // today +1 +ahead −behind = target — stated as the sequence of moves it
    // actually is, rather than as one sentence the reader must unpick.
    question: stem.text,
    stemStructure: stem.structure, informationOrder: stem.order,
    correct, distractors, format: v => String(v),
    steps: [
      `«بعد ${aheadWord} من الغد» يعني إزاحة قدرها 1 + ${ahead} = ${1 + ahead} من اليوم الحالي.`,
      `ثم «يسبق بمقدار ${behindWord}» يطرح ${behind}: الإزاحة الصافية = ${1 + ahead} − ${behind} = ${netOffset}.`,
      `اليوم المذكور ${DAYS_AR[target]} يقع بعد ${u(netOffset, 'day', 'oblique')} من اليوم الحالي، فنرجع بالمقدار نفسه ونصل إلى ${correct}.`
    ],
    howToStart: 'حوّل العبارة كلها إلى إزاحة صافية واحدة قبل النظر في أسماء الأيام.',
    remember: 'في العبارات المركبة، اجمع الإزاحات الأمامية واطرح الخلفية أولًا، ولا تنسَ أن «الغد» نفسه إزاحة قدرها 1.',
    fastMethod: 'الإزاحة الصافية = 1 + الأمامية − الخلفية، ثم ارجع بها.',
    estimatedSteps: 3, conceptTags: ['calendar', 'compound-offset'],
    parameters: {aheadDays: ahead, behindDays: behind, targetDayIndex: target, netOffset},
    oracle: daySearchOracle(netOffset, target),
    askedUnknown: 'todayFromNestedOffset', stageCount: 3,
    pedagogy: {
      targetSkill: 'COMPOUND_NET_OFFSET', targetMisconception: 'IGNORED_NET_OFFSET',
      // RC2-005. The declared target now carries the value it actually yields,
      // so the check is a measurement and not a name.
      wrongMethodValue: dayName(target - (ahead - behind)),
      degenerateWhen: [{when: ((netOffset % 7) + 7) % 7 === 0, note: 'net offset of zero: the answer is the stated day'}]
    },
    complexityFactors: {reasoningTransformations: 3, conceptCount: 2, stageCount: 3, conditionCount: 2, arithmeticBurden: 2},
    textParams: false
  });
}

/** Repeated subtraction of a full week, so the remainder is derived, not stated. */
function weekSubtractionLine(n) {
  const parts = [];
  let v = n;
  while (v >= 7) {
    parts.push(`${v} − 7 = ${v - 7}`);
    v -= 7;
  }
  return parts.join('، ثم ');
}

function longOffset(ctx) {
  const {rng} = ctx;
  const today = rng.int(0, 6);
  const n = rng.pick([10, 11, 12, 16, 17, 18, 24, 25]);
  const target = dayShift(today, n);
  const correct = DAYS_AR[target];
  const weeks = Math.floor(n / 7);
  const rem = n % 7;
  const distractors = dayDistractors(ctx, target, -rem, [
    {index: today - rem, misconceptionId: 'SHIFTED_WRONG_DIRECTION', derivation: `الرجوع ${u(rem, 'day', 'oblique')} بدل التقدم`},
    {index: today, misconceptionId: 'USED_GIVEN_VALUE_AS_ANSWER', derivation: `اليوم الحالي نفسه ${DAYS_AR[today]}`},
    {index: today + weeks, misconceptionId: 'IGNORED_NET_OFFSET', derivation: 'التحرك بعدد الأسابيع الكاملة بدل الباقي'}
  ]);
  const stem = composeSentences(ctx, `إذا كان اليوم ${DAYS_AR[today]}، فما اليوم بعد ${u(n, 'day', 'oblique')}؟`);
  return buildBase(ctx, {
    templateId: 'CAL_H_LONG',
    subskill: 'إزاحة تتجاوز أسبوعًا',
    difficulty: 'easy',
    question: stem.text,
    stemStructure: stem.structure, informationOrder: stem.order,
    correct, distractors, format: v => String(v),
    steps: [
      `نطرح أسبوعًا كاملًا في كل مرة، لأن ${u(7, 'day')} تعيدنا إلى اسم اليوم نفسه: ${weekSubtractionLine(n)}.`,
      `الباقي هو ${u(rem, 'day')}، فنتحرك بها من ${DAYS_AR[today]}.`,
      `الناتج = ${correct}.`
    ],
    howToStart: 'اختصر العدد باستخدام باقي القسمة على 7.',
    remember: `كل ${u(7, 'day')} تعيدك إلى اسم اليوم نفسه.`,
    fastMethod: `احسب باقي قسمة ${n} على 7 وتحرك بهذا الباقي فقط.`,
    estimatedSteps: 3, conceptTags: ['calendar', 'modulo'],
    parameters: {offsetDays: n, todayIndex: today},
    // Asked forwards, so the search is over the resulting day.
    oracle: {
      kind: 'search', answerKind: 'dayIndex', domain: grid(0, 6),
      constraints: [eq(mod(add(today, n), 7), X)]
    },
    askedUnknown: 'dayAfterLongOffset', stageCount: 2,
    // RC2-005. The slip this template teaches against is moving by the number of
    // whole WEEKS instead of by the remainder. For n = 16 those are both 2, so
    // the wrong method lands exactly on the key and the item measures nothing —
    // and the coincident distractor was silently dropped by the uniqueness
    // check, so the misconception was not even shown. The draw of n is blind;
    // the rejection is on the wrong method's value, never on the answer's.
    pedagogy: {
      targetSkill: 'MODULAR_DAY_OFFSET', targetMisconception: 'IGNORED_NET_OFFSET',
      wrongMethodValue: dayName(today + weeks)
    },
    allowedConstants: [0, 1, 2, 7, 100],
    complexityFactors: {reasoningTransformations: 2, conceptCount: 2, stageCount: 2, arithmeticBurden: 2},
    textParams: false
  });
}

// ---------------------------------------------------------------------------
// RC2.4 — a genuinely hard structure for this family.
//
// Every other calendar template is one offset, applied or reversed. This one is
// two independent cycles that have to be brought onto one footing before the
// weekday question can even be asked — and neither the common multiple nor the
// modulo is signalled by the sentence.
// ---------------------------------------------------------------------------

const gcdOf = (a, b) => (b === 0 ? a : gcdOf(b, a % b));

/** CROSS_PART_INTEGRATION + STRATEGY_SELECTION. */
function twoCyclesMeet(ctx) {
  const {rng} = ctx;
  let found = null;
  for (let t = 0; t < 150; t++) {
    const first = rng.pick([4, 6, 8, 9, 10, 12]);
    const second = rng.pick([6, 8, 9, 10, 14, 15, 16]);
    if (first === second) continue;
    const lcm = first * second / gcdOf(first, second);
    if (lcm > 120 || lcm === first || lcm === second) continue;
    const rem = lcm % 7;
    // A meeting that falls on the same weekday makes "answer the stated day"
    // correct, and the item stops measuring the modulo (Section 10).
    if (rem === 0) continue;
    // Each modelled slip must land somewhere other than the key, or the option
    // is silently dropped and the misconception is never shown (Section 10).
    if ((first + second) % 7 === rem) continue;
    if (first % 7 === rem || second % 7 === rem) continue;
    const today = rng.int(0, 6);
    found = {first, second, lcm, rem, today};
    break;
  }
  if (!found) return resample(ctx, twoCyclesMeet);
  const {first, second, lcm, rem, today} = found;
  const weeks = (lcm - rem) / 7;
  const target = dayShift(today, lcm);
  const correct = DAYS_AR[target];

  const distractors = dayDistractors(ctx, target, lcm, [
    {index: today, misconceptionId: 'USED_LCM_AS_THE_ANSWER', derivation: `البقاء على اليوم المذكور ${DAYS_AR[today]}`},
    {index: today + (first + second) % 7, misconceptionId: 'USED_SUM_OF_CYCLES', derivation: `التحرك بمقدار ${first} + ${second} بدل المضاعف المشترك`},
    {index: today + first % 7, misconceptionId: 'USED_ONE_CYCLE_ONLY', derivation: `التحرك بمقدار ${first} وحدها`},
    {index: today + second % 7, misconceptionId: 'USED_ONE_CYCLE_ONLY', derivation: `التحرك بمقدار ${second} وحدها`},
    {index: today + weeks, misconceptionId: 'IGNORED_NET_OFFSET', derivation: 'التحرك بعدد الأسابيع الكاملة بدل الباقي'}
  ]);

  const stem = composeSentences(ctx, `يزور أحدهما المكتبة كل ${u(first, 'day', 'oblique')} ويزورها الآخر كل ${u(second, 'day', 'oblique')}. التقيا فيها اليوم، وكان يوم ${DAYS_AR[today]}. في أي يوم من أيام الأسبوع يلتقيان فيها مرة أخرى؟`);
  return buildBase(ctx, {
    templateId: 'CAL_H_CYCLE_MEET',
    subskill: 'لقاء دورتين مختلفتين ويوم الأسبوع',
    difficulty: 'hard',
    question: stem.text,
    stemStructure: stem.structure, informationOrder: stem.order,
    correct, distractors, format: v => String(v),
    steps: [
      `لا يلتقيان إلا حين تكتمل الدورتان معًا، أي بعد عدد من الأيام يقبل القسمة على كلٍّ من الدورتين.`,
      `أصغر عدد كذلك = ${first} × ${lcm / first} = ${lcm}، وهو نفسه ${second} × ${lcm / second} = ${lcm}.`,
      `كل ${u(7, 'day')} تعيد اسم اليوم نفسه، فنطرح الأسابيع الكاملة: ${weeks} × 7 = ${weeks * 7}، ثم ${lcm} − ${weeks * 7} = ${rem}.`,
      `نتحرك ${u(rem, 'day', 'oblique')} من ${DAYS_AR[today]} فنصل إلى ${correct}.`
    ],
    howToStart: 'ابحث أولًا عن عدد الأيام حتى اللقاء التالي، ثم حوّله إلى يوم من أيام الأسبوع.',
    remember: 'اللقاء يتطلب اكتمال الدورتين معًا، لا إحداهما.',
    fastMethod: 'احسب المضاعف المشترك الأصغر ثم خذ باقي قسمته على 7.',
    estimatedSteps: 4, conceptTags: ['calendar', 'lcm', 'modulo'],
    // The two multiples and the whole-week count are quantities of the task, so
    // they are declared rather than announced: the sourcing check licenses a
    // step only from what the stem and the parameters already give.
    parameters: {
      firstCycle: first, secondCycle: second, todayIndex: today,
      firstMultiple: lcm / first, secondMultiple: lcm / second, wholeWeeks: weeks
    },
    oracle: {
      kind: 'search', answerKind: 'dayIndex', domain: grid(0, 6),
      constraints: [eq(mod(add(today, lcm), 7), X)]
    },
    askedUnknown: 'meetingWeekday', stageCount: 3,
    allowedConstants: [0, 1, 2, 7, 100],
    pedagogy: {
      targetSkill: 'CYCLE_MEETING_WEEKDAY', targetMisconception: 'USED_SUM_OF_CYCLES',
      wrongMethodValue: dayName(today + (first + second) % 7)
    },
    complexityFactors: {reasoningTransformations: 4, conceptCount: 3, conditionCount: 2, stageCount: 3, arithmeticBurden: 4},
    textParams: false
  });
}

/**
 * RC2.6-1. SIMULTANEOUS_CONSTRAINTS + STRATEGY_SELECTION.
 *
 * Two dated weekdays, one in each of two consecutive months, and the LENGTH of
 * the first month is what is asked. Neither date fixes it: the gap between them
 * is (length − first date + second date), so the two together pin the length
 * only modulo seven, and the answer is then the one candidate month length that
 * fits. Counting forward from one date is the natural move and settles nothing.
 */
function monthLengthFromTwoDates(ctx) {
  const {rng} = ctx;
  const LENGTHS = [28, 29, 30, 31];
  let found = null;
  for (let t = 0; t < 300; t++) {
    const length = rng.pick(LENGTHS);
    const d1 = rng.int(2, 20), d2 = rng.int(2, 20);
    const w1 = rng.int(0, 6);
    const gap = length - d1 + d2;
    const w2 = ((w1 + gap) % 7 + 7) % 7;
    // Exactly one candidate length must fit, or the question has no answer.
    const fits = LENGTHS.filter(L => ((w1 + (L - d1 + d2)) % 7 + 7) % 7 === w2);
    if (fits.length !== 1) continue;
    found = {length, d1, d2, w1, w2, gap};
    break;
  }
  if (!found) return resample(ctx, monthLengthFromTwoDates);
  const {length, d1, d2, w1, w2, gap} = found;
  // The ask is the NUMBER OF DAYS between the two dates, not the month length.
  // The reasoning is the same — the length has to be pinned by the congruence
  // first — but the answer space is not the four possible month lengths, which
  // would make six options impossible to fill honestly.
  const correct = gap;
  const params = {firstDate: d1, secondDate: d2, firstWeekdayIndex: w1, secondWeekdayIndex: w2,
    weekdayGap: ((w2 - w1) % 7 + 7) % 7, monthLength: length};

  const distractors = usable(ctx, [
    ...LENGTHS.filter(L => L !== length).map(L => mk(L - d1 + d2, 'USED_ONE_ANCHOR_ONLY',
      `افتراض أن الشهر ${u(L, 'day')}، وهو لا يوافق يوم ${DAYS_AR[w2]}`)),
    mk(d2 - d1, 'IGNORED_NET_OFFSET', `${d2} − ${d1}`),
    mk(d1 + d2, 'ADDED_INSTEAD_OF_SUBTRACTED', `${d1} + ${d2}`),
    mk(length, 'STOPPED_AT_INTERMEDIATE_TOTAL', `طول الشهر ${length} وحده`, 1),
    mk(28 - d1 + d2 + 7, 'USED_ONE_ANCHOR_ONLY', 'افتراض أربعة أسابيع ثم إضافة أسبوع')
  ]);

  const stem = composeSentences(ctx, `كان اليوم ${d1} من شهرٍ ما يوم ${DAYS_AR[w1]}، وكان اليوم ${d2} من الشهر الذي يليه يوم ${DAYS_AR[w2]}. كم يومًا بين التاريخين؟`);
  return buildBase(ctx, {
    templateId: 'CAL_H_MONTH_LENGTH',
    scenario: 'two_dated_weekdays_across_a_month_boundary',
    direction: 'reverse',
    subskill: 'طول شهر من يومين معلومين في شهرين متتاليين',
    difficulty: 'hard',
    question: stem.text,
    stemStructure: stem.structure, informationOrder: stem.order,
    correct, distractors, format: unitFormat('day'),
    steps: [
      `عدد الأيام بين التاريخين = طول الشهر الأول − ${d1} + ${d2}، وطول الشهر غير معطى.`,
      `فرق أيام الأسبوع بين ${DAYS_AR[w1]} و${DAYS_AR[w2]} هو ${((w2 - w1) % 7 + 7) % 7}، فعدد الأيام بينهما يترك هذا الباقي عند القسمة على 7.`,
      `الأطوال الممكنة للشهر هي 28 و29 و30 و31، ونجرّبها واحدًا واحدًا.`,
      `الطول الوحيد الذي يعطي هذا الباقي هو ${length}.`,
      `إذن عدد الأيام = ${length} − ${d1} + ${d2} = ${correct}.`
    ],
    howToStart: 'اكتب عدد الأيام بين التاريخين بدلالة طول الشهر الأول، ثم انظر إلى باقي القسمة على 7.',
    remember: 'أيام الأسبوع لا تحدد العدد بل باقيه على 7؛ والأطوال الممكنة للشهر هي ما يحسم الاختيار.',
    fastMethod: 'جرّب الأطوال الأربعة الممكنة واختر ما يوافق اليوم الثاني.',
    estimatedSteps: 5, conceptTags: ['calendar', 'modular', 'candidate-selection'], parameters: params,
    // The answer lies in the four-wide window the possible month lengths allow,
    // and inside that window the congruence picks exactly one value. Without the
    // window the congruence has a solution every seven days.
    oracle: {
      kind: 'search', answerKind: 'number',
      domain: grid(28 - d1 + d2, 31 - d1 + d2),
      constraints: [eq(mod(add(w1, X), 7), w2)]
    },
    askedUnknown: 'daysBetweenDates', stageCount: 3,
    pedagogy: {
      targetSkill: 'SOLVE_WEEKDAY_CONGRUENCE', targetMisconception: 'USED_ONE_ANCHOR_ONLY',
      wrongMethodValue: d2 - d1
    },
    metadata: {candidate_lengths: LENGTHS.length},
    allowedConstants: [0, 1, 2, 7, 28, 29, 30, 31, 100],
    complexityFactors: {reasoningTransformations: 4, conceptCount: 3, conditionCount: 2, stageCount: 3, arithmeticBurden: 4},
    textParams: false
  });
}

/**
 * RC2.6-1. SIMULTANEOUS_CONSTRAINTS + STRATEGY_SELECTION.
 *
 * Two recurring events that do NOT start on the same day. Because the starts
 * differ, the first shared day is not the LCM of the two cycles — it is the
 * first solution of a congruence, and there may be none at all. A solver who
 * takes the LCM, the natural move, has a number on the paper and it is wrong.
 */
function offsetCyclesMeet(ctx) {
  const {rng} = ctx;
  let found = null;
  for (let t = 0; t < 400; t++) {
    const p = rng.pick([3, 4, 5, 6, 8, 9, 10, 12]);
    const q = rng.pick([3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 15]);
    if (p >= q) continue;
    const offset = rng.int(1, q - 1);
    const start = rng.int(0, 6);
    // First day k (counted from the first event's start) with k % p === 0 and
    // (k - offset) % q === 0.
    let meet = null;
    for (let k = offset; k <= 400; k++) {
      if (k % p === 0 && (k - offset) % q === 0) { meet = k; break; }
    }
    if (meet === null || meet === 0) continue;
    const lcm = (() => { const g = (x, y) => (y ? g(y, x % y) : x); return p * q / g(p, q); })();
    // The LCM answer must differ, or the item stops measuring the offset.
    if (meet === lcm) continue;
    if (meet > 200) continue;
    // The LCM slip must land on a DIFFERENT weekday, or the wrong method scores.
    if ((start + meet) % 7 === (start + lcm) % 7) continue;
    found = {p, q, offset, start, meet, lcm};
    break;
  }
  if (!found) return resample(ctx, offsetCyclesMeet);
  const {p, q, offset, start, meet, lcm} = found;
  const correct = DAYS_AR[(start + meet) % 7];
  const params = {firstCycle: p, secondCycle: q, offsetDays: offset, startWeekdayIndex: start,
    firstSharedDay: meet, wholeWeeks: Math.floor(meet / 7), lcmOfCycles: lcm};

  // Each wrong weekday is attached to the slip that actually lands on it, so
  // the option set carries five different diagnoses rather than one repeated.
  const named = [
    [(start + lcm) % 7, 'IGNORED_THE_OFFSET_BETWEEN_STARTS',
      `اعتماد المضاعف المشترك ${lcm}، مع تجاهل فارق البداية ${offset}`],
    [(start + offset) % 7, 'USED_ONE_CYCLE_ONLY', `التوقف عند بداية الحدث الثاني بعد ${offset}`],
    [(start + p) % 7, 'USED_ONE_CYCLE_ONLY', `التحرك بدورة الحدث الأول ${p} وحدها`],
    [(start + q) % 7, 'USED_ONE_CYCLE_ONLY', `التحرك بدورة الحدث الثاني ${q} وحدها`],
    [(start + p + q) % 7, 'USED_SUM_OF_CYCLES', `التحرك بمجموع الدورتين ${p} + ${q}`],
    [start, 'IGNORED_NET_OFFSET', 'البقاء على يوم البداية دون تحرك']
  ];
  const claimed = new Set([(start + meet) % 7]);
  const distractors = usable(ctx, [
    ...named.flatMap(([idx, id, why]) => {
      if (claimed.has(idx)) return [];
      claimed.add(idx);
      return [mk(DAYS_AR[idx], id, why)];
    }),
    // Any weekday still unused is offered as what it is: a day no reading of the
    // two cycles reaches.
    ...DAYS_AR.map((d, i) => [d, i]).flatMap(([d, i]) => {
      if (claimed.has(i)) return [];
      claimed.add(i);
      return [mk(d, 'RESOLVED_AN_UNRESOLVED_PAIR', `${d} لا يصل إليه أي قراءة للدورتين`)];
    })
  ]);

  const stem = composeSentences(ctx, `يتكرر الحدث الأول كل ${u(p, 'day', 'oblique')} ابتداءً من يوم ${DAYS_AR[start]}، ويتكرر الحدث الثاني كل ${u(q, 'day', 'oblique')} ابتداءً بعد ${u(offset, 'day', 'oblique')} من بداية الأول. ما اليوم الذي يجتمع فيه الحدثان لأول مرة؟`);
  return buildBase(ctx, {
    templateId: 'CAL_H_OFFSET_CYCLES',
    scenario: 'two_cycles_with_offset_starts',
    direction: 'forward',
    subskill: 'أول يوم يجتمع فيه حدثان دوريان مختلفا البداية',
    difficulty: 'hard',
    question: stem.text,
    stemStructure: stem.structure, informationOrder: stem.order,
    correct, distractors, format: v => String(v),
    steps: [
      `الحدث الأول يقع في الأيام التي تقبل القسمة على ${p} من يوم البداية.`,
      `والحدث الثاني يقع بعد ${offset} ثم كل ${q}، أي في الأيام التي يترك عددها الباقي ${offset % q}، أي عند القسمة على ${q}.`,
      `المضاعف المشترك للدورتين وحده لا يكفي لأن البدايتين مختلفتان.`,
      `أول عدد يحقق الشرطين معًا هو ${meet}.`,
      `نطرح الأسابيع الكاملة: ${Math.floor(meet / 7)} × 7 = ${Math.floor(meet / 7) * 7}، ثم ${meet} − ${Math.floor(meet / 7) * 7} = ${meet % 7}.`,
      `بالتقدم ${u(meet % 7, 'day', 'oblique')} من يوم ${DAYS_AR[start]} نصل إلى يوم ${correct}.`
    ],
    howToStart: 'اكتب شرطي الحدثين على عدد الأيام من البداية، ثم ابحث عن أول عدد يحقق الشرطين معًا.',
    remember: 'عند اختلاف البدايتين لا يكفي المضاعف المشترك؛ فارق البداية جزء من الشرط.',
    fastMethod: 'تقدّم بمضاعفات الدورة الأولى وافحص أيها يوافق شرط الثانية.',
    estimatedSteps: 5, conceptTags: ['calendar', 'modular', 'congruence'], parameters: params,
    oracle: {
      kind: 'search', answerKind: 'dayIndex', domain: grid(0, 6),
      constraints: [eq(mod(add(start, meet), 7), X)]
    },
    askedUnknown: 'firstSharedWeekday', stageCount: 3,
    pedagogy: {
      targetSkill: 'SOLVE_TWO_CONGRUENCES', targetMisconception: 'IGNORED_THE_OFFSET_BETWEEN_STARTS',
      wrongMethodValue: DAYS_AR[(start + lcm) % 7],
      degenerateWhen: [{when: meet === lcm, note: 'the offset happens to vanish, so the LCM answer is correct'}]
    },
    metadata: {first_shared_day: meet, lcm_of_cycles: lcm},
    allowedConstants: [0, 1, 2, 7, 100],
    complexityFactors: {reasoningTransformations: 4, conceptCount: 3, conditionCount: 2, stageCount: 3, arithmeticBurden: 5},
    textParams: false
  });
}
