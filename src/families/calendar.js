import {DAYS_AR, dayShift} from '../utils.js';
import {mk, usable, u, buildBase, eq, X, add, mod, resample} from './_shared.js';
import {grid} from '../qa/oracle-engine.js';

export function generateCalendar({difficulty, rng, seed, engineVersion, telemetry}) {
  const ctx = {difficulty, rng, seed, engineVersion, telemetry, family: 'calendar', family_ar: 'الاستدلال الزمني وأيام الأسبوع', category: 'الاستدلال الزمني وأيام الأسبوع'};
  const list = difficulty === 'easy' ? [tomorrowKnown, afterTomorrow]
    : difficulty === 'medium' ? [compoundForward, forwardThenBack]
    : [nestedOffset, longOffset];
  return rng.pick(list)(ctx);
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
  return buildBase(ctx, {
    templateId: 'CAL_E_TOM',
    subskill: 'معرفة اليوم من الغد',
    difficulty: 'easy',
    question: `إذا كان غدًا هو يوم ${DAYS_AR[target]}، فما اليوم الحالي؟`,
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
  return buildBase(ctx, {
    templateId: 'CAL_E_AFTER',
    subskill: 'معرفة اليوم من بعد غد',
    difficulty: 'easy',
    question: `إذا كان بعد غد هو يوم ${DAYS_AR[target]}، فما اليوم الحالي؟`,
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
  return buildBase(ctx, {
    templateId: 'CAL_M_COMPOUND',
    subskill: 'إزاحة مركبة أمامية من الغد',
    difficulty: 'medium',
    question: `اليوم الذي يأتي بعد ${aheadWord} من غد هو ${DAYS_AR[target]}. فما اليوم الحالي؟`,
    correct, distractors, format: v => String(v),
    steps: [
      `«غد» إزاحة قدرها 1، ثم ${u(ahead, 'day', 'oblique')} إضافية.`,
      `الإزاحة الصافية = 1 + ${ahead} = ${netOffset}.`,
      `نرجع ${u(netOffset, 'day', 'oblique')} من ${DAYS_AR[target]} فنصل إلى ${correct}.`
    ],
    howToStart: 'حوّل العبارة المركبة إلى إزاحة واحدة من اليوم الحالي.',
    remember: 'غد تساوي +1، فاجمعها مع بقية الأيام قبل التحرك.',
    fastMethod: `ارجع ${u(netOffset, 'day', 'oblique')} من اليوم المذكور.`,
    estimatedSteps: 2, conceptTags: ['calendar'], parameters: {aheadDays: ahead, targetDayIndex: target, netOffset},
    oracle: daySearchOracle(netOffset, target),
    askedUnknown: 'todayFromCompoundOffset', stageCount: 2,
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
  return buildBase(ctx, {
    templateId: 'CAL_M_TWO_SHIFT',
    subskill: 'تحديد اليوم الحالي ثم الرجوع عدة أيام',
    difficulty: 'medium',
    question: `إذا كان بعد غد هو ${DAYS_AR[afterTom]}، فما اليوم الذي كان قبل ${u(back, 'day', 'oblique')} من اليوم؟`,
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
  return buildBase(ctx, {
    templateId: 'CAL_H_NESTED',
    subskill: 'إزاحة زمنية مركبة أمامية وخلفية',
    difficulty: 'hard',
    question: `اليوم الذي يسبق بمقدار ${behindWord} اليومَ الواقع بعد ${aheadWord} من الغد هو ${DAYS_AR[target]}. فما اليوم الحالي؟`,
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
  return buildBase(ctx, {
    templateId: 'CAL_H_LONG',
    subskill: 'إزاحة تتجاوز أسبوعًا',
    difficulty: 'hard',
    question: `إذا كان اليوم ${DAYS_AR[today]}، فما اليوم بعد ${u(n, 'day', 'oblique')}؟`,
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
    allowedConstants: [0, 1, 2, 7, 100],
    complexityFactors: {reasoningTransformations: 2, conceptCount: 2, stageCount: 2, arithmeticBurden: 2},
    textParams: false
  });
}
