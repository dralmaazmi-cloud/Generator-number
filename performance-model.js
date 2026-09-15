// RC2.9.3-5. The product's reading of a finished sitting.
//
// What this replaces. Until RC2.9.2 the result screen showed one number per
// family — correct over asked — and the "weak families" chooser treated two
// attempts as enough to call a family weak. A learner who missed one question
// in a family they had met twice was told it was a weakness; a learner who was
// slow but right was told nothing; a learner who made the same denominator
// slip five times was told five different things. Nothing distinguished a
// misconception from a slip, or one bad guess from a pattern.
//
// What this is. A deterministic reading of the questions asked and the answers
// given, at five levels — family, task archetype, sub-idea, reasoning skill,
// error pattern — with an explicit evidence threshold at every level and a
// confidence attached to every statement. Below the threshold the model says
// INSUFFICIENT_EVIDENCE and nothing else. No statement is produced by a model,
// a heuristic score or an outside service: every number here can be recomputed
// by hand from the session record, which is the whole reason it can be trusted
// on a screen a learner reads alone.
//
// What it is not. It does not decide difficulty, does not score answers (the
// engine's key does that), and does not touch the engine. It reads the
// metadata the engine already publishes on every question — the family, the
// task archetype, the sub-idea, the target skill, and for each wrong option
// the misconception it was built from — and counts.

/**
 * Evidence thresholds. Each is the smallest count at which the corresponding
 * statement is made at all; below it the level reports INSUFFICIENT_EVIDENCE.
 */
export const EVIDENCE = Object.freeze({
  // Answered questions a unit needs before any claim about it is made.
  minForClaim: 4,
  // Accuracy at or above which a unit is a strength, at or below which a
  // weakness. Between the two the unit is reported as mixed, which is a
  // description and not a diagnosis.
  strength: 0.8,
  weakness: 0.5,
  // An error pattern: the same misconception chosen this many times, and this
  // share of all wrong answers. One slip is a slip; three of the same are a
  // pattern.
  pattern: {minCount: 3, minShare: 0.4},
  // A trend needs enough answered questions to split into two halves that can
  // each carry a claim, and a difference a reader would notice.
  trend: {minAnswered: 12, minPerHalf: 6, minDelta: 0.25},
  // Speed is only ever a low-confidence note. A wrong answer given in less
  // than half the reference time is "rushed"; three of them are worth saying.
  speed: {rushedFactor: 0.5, slowFactor: 1.6, minCount: 3, minAnswered: 6},
  // How many answered questions back each confidence label.
  confidence: {low: 4, medium: 8, high: 15}
});

/** Statuses a unit can carry. */
export const STATUS = Object.freeze({
  STRENGTH: 'STRENGTH', WEAKNESS: 'WEAKNESS', MIXED: 'MIXED', INSUFFICIENT: 'INSUFFICIENT_EVIDENCE'
});

/** Arabic for the confidence labels. */
export const CONFIDENCE_AR = Object.freeze({low: 'منخفضة', medium: 'متوسطة', high: 'عالية', none: 'غير كافية'});

/**
 * Reference seconds per question, from the engine's own estimate of how many
 * steps the solution takes. This is a rough yardstick for a speed NOTE, never
 * a norm: a note built on it is always reported at low confidence and never
 * as a weakness.
 */
export const REFERENCE_SECONDS = Object.freeze({base: 20, perStep: 20});

/** Arabic names for the task archetypes the engine publishes. */
export const TASK_LABELS = Object.freeze({
  FORWARD_COMPUTE: 'الحساب المباشر من المعطيات',
  DECOMPOSE_COMBINED: 'تفكيك علاقة مركبة',
  COMBINE_PARTS: 'جمع أجزاء في كلٍّ واحد',
  SCALE_PROPORTIONALLY: 'التناسب والتدريج',
  SHARE_PROPORTIONALLY: 'التقسيم بنسبة',
  REVERSE_RECOVER: 'العمل بالعكس لاستعادة الأصل',
  REQUIRED_INPUT: 'إيجاد المدخل المطلوب',
  MEASURE_CHANGE: 'قياس التغير',
  APPLY_SUCCESSIVE_CHANGE: 'تطبيق تغيرات متتالية',
  COMPARE_ALTERNATIVES: 'المقارنة بين بديلين',
  FIND_THRESHOLD: 'إيجاد حد أو عتبة',
  FIND_COINCIDENCE: 'إيجاد نقطة التقاء',
  FIND_REMAINDER: 'إيجاد الباقي',
  MEASURE_INTERVAL: 'قياس فترة',
  RECOVER_PATTERN_TERM: 'استعادة حد مفقود في نمط',
  CONTINUE_PATTERN: 'مواصلة نمط',
  IDENTIFY_RULE: 'تحديد القاعدة',
  DETECT_PATTERN_FAULT: 'اكتشاف الخلل في نمط',
  SELECT_BY_RULE: 'الاختيار وفق قاعدة',
  EXTEND_BY_PROPERTY: 'التوسيع وفق خاصية',
  IDENTIFY_MEMBER: 'تحديد العنصر المختلف',
  COUNT_SATISFYING: 'عدّ ما يحقق شرطًا',
  LOCATE_IN_ORDER: 'تحديد موقع في ترتيب',
  JUDGE_ENTAILMENT: 'الحكم على ما يلزم من المعطيات',
  JUDGE_INDETERMINACY: 'الحكم على ما لا يمكن تحديده'
});

// Misconceptions that are a slip of execution — a stage dropped, a step
// applied twice, a given value returned — rather than a wrong method. The
// distinction matters for what the learner is told: a method error is
// re-taught, a slip is re-checked.
const PROCEDURAL_SLIPS = new Set([
  'STOPPED_AFTER_FIRST_STAGE', 'STOPPED_AT_UNIT_RATE', 'STOPPED_AT_INTERMEDIATE_TOTAL',
  'MISSED_ONE_STAGE', 'MISSED_ONE_FRACTION_STAGE', 'USED_ONLY_LAST_STAGE',
  'USED_GIVEN_VALUE_AS_ANSWER', 'MISREAD_THE_STEP', 'APPLIED_STEP_TWICE',
  'APPLIED_PREVIOUS_STEP', 'OFF_BY_ONE_STEP', 'REPORTED_AMOUNT_INSTEAD_OF_PERCENT',
  'HALF_DISTANCE_AS_ANSWER', 'USED_DIFFERENCE_AS_ANSWER', 'USED_TARGET_AS_ANSWER',
  'ANSWERED_OTHER_PERSON', 'ANSWERED_FUTURE_AGE', 'ANSWERED_PAST_AGE',
  'SWAPPED_THE_TWO_UNKNOWNS', 'FAILED_TO_UPDATE_COUNT', 'CHECKED_ONLY_PART_OF_THE_SET',
  'CHECKED_ONLY_THE_FIRST_STEP', 'STOPPED_AT_THE_EQUAL_POINT', 'FORGOT_TO_HALVE_THE_DIFFERENCE'
]);

/** The kinds of wrong answer the model tells apart. */
export const ERROR_TYPE = Object.freeze({
  TARGETED: 'TARGETED_MISCONCEPTION',   // the very error the question was built to test
  METHOD: 'OTHER_METHOD_ERROR',         // a different wrong method
  SLIP: 'PROCEDURAL_SLIP',              // a dropped stage, a misread step
  UNMODELLED: 'UNMODELLED'              // an option the engine did not build from a named error
});

export const ERROR_TYPE_AR = Object.freeze({
  TARGETED_MISCONCEPTION: 'خطأ في الفكرة الأساسية للسؤال',
  OTHER_METHOD_ERROR: 'طريقة حل غير مناسبة',
  PROCEDURAL_SLIP: 'زلّة في التنفيذ (مرحلة ناقصة أو خطوة مكررة)',
  UNMODELLED: 'خطأ غير مصنف'
});

const round = (v, d = 0) => { const p = 10 ** d; return Math.round(v * p) / p; };
const pctOf = (c, n) => (n ? Math.round((c / n) * 100) : 0);

export function confidenceFor(n) {
  const c = EVIDENCE.confidence;
  if (n >= c.high) return 'high';
  if (n >= c.medium) return 'medium';
  if (n >= c.low) return 'low';
  return 'none';
}

function statusFor(correct, n) {
  if (n < EVIDENCE.minForClaim) return STATUS.INSUFFICIENT;
  const acc = correct / n;
  if (acc >= EVIDENCE.strength) return STATUS.STRENGTH;
  if (acc <= EVIDENCE.weakness) return STATUS.WEAKNESS;
  return STATUS.MIXED;
}

function referenceSecondsFor(q) {
  const steps = Number(q?.metadata?.estimated_steps);
  return REFERENCE_SECONDS.base + REFERENCE_SECONDS.perStep * (Number.isFinite(steps) && steps > 0 ? steps : 2);
}

/** One answered question, read into what the model needs. */
function readResponse(q, r, index) {
  const m = q?.metadata ?? {};
  const selected = r?.selected ?? null;
  const answered = Boolean(selected);
  const correct = answered && Boolean(r?.correct);
  const meta = answered ? m.options_meta?.[selected] ?? null : null;
  const misconceptionId = !correct && meta ? meta.misconceptionId ?? null : null;
  let errorType = null;
  if (answered && !correct) {
    if (!misconceptionId) errorType = ERROR_TYPE.UNMODELLED;
    else if (m.target_misconception && misconceptionId === m.target_misconception) errorType = ERROR_TYPE.TARGETED;
    else if (PROCEDURAL_SLIPS.has(misconceptionId)) errorType = ERROR_TYPE.SLIP;
    else errorType = ERROR_TYPE.METHOD;
  }
  const time = Number.isFinite(r?.timeSeconds) ? r.timeSeconds : null;
  const reference = referenceSecondsFor(q);
  const taskId = String(m.task_signature ?? 'UNCLASSIFIED').split('/')[0];
  return {
    index, answered, correct, time, reference,
    family: q.family ?? 'unknown', familyLabel: q.family_ar ?? q.family ?? '',
    task: taskId, taskLabel: TASK_LABELS[taskId] ?? taskId,
    subIdea: m.sub_idea_signature ?? m.template_id ?? 'unknown', subIdeaLabel: q.subskill ?? m.template_id ?? '',
    skill: m.target_skill ?? null, skillLabel: q.subskill ?? '',
    misconceptionId, errorType, difficulty: q.difficulty ?? null
  };
}

/** Accumulates answered responses into units of one level. */
function tally(rows, keyOf, labelOf) {
  const units = new Map();
  for (const row of rows) {
    if (!row.answered) continue;
    const key = keyOf(row);
    if (key === null || key === undefined) continue;
    if (!units.has(key)) units.set(key, {id: key, label: labelOf(row), n: 0, correct: 0, wrong: 0, times: [], labels: new Map()});
    const u = units.get(key);
    u.n++;
    if (row.correct) u.correct++; else u.wrong++;
    if (row.time !== null) u.times.push(row.time);
    const l = labelOf(row);
    u.labels.set(l, (u.labels.get(l) ?? 0) + 1);
  }
  return [...units.values()].map(u => {
    // The label is the one most of the unit's questions carry.
    const label = [...u.labels.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? u.label;
    const status = statusFor(u.correct, u.n);
    return {
      id: u.id, label, n: u.n, correct: u.correct, wrong: u.wrong,
      accuracy: u.n ? round(u.correct / u.n, 3) : null,
      percentage: pctOf(u.correct, u.n),
      avgTimeSeconds: u.times.length ? Math.round(u.times.reduce((a, b) => a + b, 0) / u.times.length) : null,
      status,
      confidence: status === STATUS.INSUFFICIENT ? 'none' : confidenceFor(u.n)
    };
  }).sort((a, b) => (a.accuracy ?? 2) - (b.accuracy ?? 2) || b.n - a.n || String(a.id).localeCompare(String(b.id)));
}

function trendOf(rows) {
  const answered = rows.filter(r => r.answered);
  const t = EVIDENCE.trend;
  if (answered.length < t.minAnswered) {
    return {status: STATUS.INSUFFICIENT, direction: null, firstHalf: null, secondHalf: null, confidence: 'none', answered: answered.length};
  }
  const half = Math.floor(answered.length / 2);
  const first = answered.slice(0, half), second = answered.slice(answered.length - half);
  if (first.length < t.minPerHalf || second.length < t.minPerHalf) {
    return {status: STATUS.INSUFFICIENT, direction: null, firstHalf: null, secondHalf: null, confidence: 'none', answered: answered.length};
  }
  const acc = xs => xs.filter(r => r.correct).length / xs.length;
  const a = acc(first), b = acc(second);
  const delta = round(b - a, 3);
  const direction = delta >= t.minDelta ? 'IMPROVING' : delta <= -t.minDelta ? 'DETERIORATING' : 'STABLE';
  return {
    status: 'MEASURED', direction, delta,
    firstHalf: {n: first.length, correct: first.filter(r => r.correct).length, percentage: pctOf(first.filter(r => r.correct).length, first.length)},
    secondHalf: {n: second.length, correct: second.filter(r => r.correct).length, percentage: pctOf(second.filter(r => r.correct).length, second.length)},
    confidence: confidenceFor(half), answered: answered.length
  };
}

function speedOf(rows) {
  const timed = rows.filter(r => r.answered && r.time !== null);
  const s = EVIDENCE.speed;
  if (timed.length < s.minAnswered) return {status: STATUS.INSUFFICIENT, notes: [], confidence: 'none'};
  const ratio = timed.reduce((a, r) => a + r.time / r.reference, 0) / timed.length;
  const rushedWrong = timed.filter(r => !r.correct && r.time < s.rushedFactor * r.reference).length;
  const accuracy = timed.filter(r => r.correct).length / timed.length;
  const notes = [];
  if (ratio >= s.slowFactor && accuracy >= EVIDENCE.strength) notes.push({kind: 'ACCURATE_BUT_SLOW', ratio: round(ratio, 2)});
  if (rushedWrong >= s.minCount) notes.push({kind: 'RUSHED_ERRORS', count: rushedWrong});
  else if (ratio <= s.rushedFactor + 0.1 && accuracy <= EVIDENCE.weakness) notes.push({kind: 'FAST_BUT_ERROR_PRONE', ratio: round(ratio, 2)});
  // Speed is reported only ever at low confidence: the reference is a rough
  // yardstick, not a norm for this learner.
  return {status: 'MEASURED', ratioToReference: round(ratio, 2), rushedWrong, notes, confidence: 'low'};
}

function patternsOf(rows) {
  const wrong = rows.filter(r => r.answered && !r.correct);
  const byId = new Map();
  for (const r of wrong) {
    if (!r.misconceptionId) continue;
    if (!byId.has(r.misconceptionId)) byId.set(r.misconceptionId, {id: r.misconceptionId, count: 0, families: new Map(), errorType: r.errorType});
    const p = byId.get(r.misconceptionId);
    p.count++;
    p.families.set(r.family, (p.families.get(r.family) ?? 0) + 1);
  }
  const {minCount, minShare} = EVIDENCE.pattern;
  return [...byId.values()]
    .filter(p => p.count >= minCount && p.count / wrong.length >= minShare)
    .map(p => ({
      id: p.id, count: p.count, share: round(p.count / wrong.length, 2), errorType: p.errorType,
      families: [...p.families.entries()].sort((a, b) => b[1] - a[1]).map(([f]) => f),
      confidence: p.count >= 8 ? 'high' : p.count >= 5 ? 'medium' : 'low'
    }))
    .sort((a, b) => b.count - a.count);
}

function errorTypesOf(rows) {
  const wrong = rows.filter(r => r.answered && !r.correct);
  const counts = {};
  for (const t of Object.values(ERROR_TYPE)) counts[t] = 0;
  for (const r of wrong) counts[r.errorType]++;
  let dominant = null;
  if (wrong.length >= EVIDENCE.minForClaim) {
    const [type, n] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    if (n / wrong.length >= 0.6 && type !== ERROR_TYPE.UNMODELLED) dominant = {type, count: n, share: round(n / wrong.length, 2)};
  }
  return {wrong: wrong.length, counts, dominant};
}

/**
 * Practice recommendations, one per family at most. A weakness at the family
 * level, an error pattern, and a weak task inside an otherwise sound family
 * each earn one; where they coincide on a family they are merged rather than
 * listed twice, so the learner is never told the same thing under two names.
 */
function recommend({families, tasks, patterns, misconceptionText}) {
  const byFamily = new Map();
  const add = (family, label, reason, questions) => {
    if (!byFamily.has(family)) byFamily.set(family, {family, label, questions: 0, reasons: []});
    const rec = byFamily.get(family);
    rec.questions = Math.max(rec.questions, questions);
    if (!rec.reasons.includes(reason)) rec.reasons.push(reason);
  };
  for (const f of families) {
    if (f.status === STATUS.WEAKNESS) add(f.id, f.label, `دقة ${f.percentage}% في ${f.n} أسئلة`, 8);
  }
  for (const p of patterns) {
    const family = p.families[0];
    const label = families.find(f => f.id === family)?.label ?? family;
    add(family, label, `خطأ متكرر (${p.count} مرات): ${misconceptionText(p.id)}`, 6);
  }
  for (const t of tasks) {
    if (t.status !== STATUS.WEAKNESS) continue;
    // A weak task is only worth naming when its family is not already named.
    const family = t.topFamily;
    if (!family || byFamily.has(family)) continue;
    const label = families.find(f => f.id === family)?.label ?? family;
    add(family, label, `ضعف في نوع المهمة «${t.label}» (${t.percentage}% في ${t.n} أسئلة)`, 6);
  }
  return [...byFamily.values()].slice(0, 4);
}

/**
 * @param {object} session
 * @param {Array} session.questions   the engine's question objects, in order
 * @param {Array} session.responses   {selected, correct, timeSeconds} per question
 * @param {(id:string)=>string} [misconceptionText] Arabic sentence for a misconception id
 * @returns {object} the report; `text` carries the sections a screen or a
 *   printed page shows, everything else is the evidence behind them.
 */
export function buildPerformanceReport(session, misconceptionText = id => id) {
  const questions = Array.isArray(session?.questions) ? session.questions : [];
  const responses = Array.isArray(session?.responses) ? session.responses : [];
  const rows = questions.map((q, i) => readResponse(q, responses[i], i));
  const answeredRows = rows.filter(r => r.answered);
  const answered = answeredRows.length;
  const correct = answeredRows.filter(r => r.correct).length;
  const times = answeredRows.filter(r => r.time !== null).map(r => r.time);

  const families = tally(rows, r => r.family, r => r.familyLabel);
  // Each task remembers the family most of its questions came from, so a
  // recommendation about a task can be given a family to practise.
  const tasks = tally(rows, r => r.task, r => r.taskLabel).map(t => {
    const fam = new Map();
    for (const r of answeredRows) if (r.task === t.id) fam.set(r.family, (fam.get(r.family) ?? 0) + 1);
    return {...t, topFamily: [...fam.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null};
  });
  const subIdeas = tally(rows, r => r.subIdea, r => r.subIdeaLabel);
  const skills = tally(rows, r => r.skill, r => r.skillLabel);
  const patterns = patternsOf(rows);
  const errorTypes = errorTypesOf(rows);
  const trend = trendOf(rows);
  const speed = speedOf(rows);

  const overall = {
    asked: questions.length, answered, correct, wrong: answered - correct, unanswered: questions.length - answered,
    percentage: pctOf(correct, questions.length || 1),
    accuracyOfAnswered: answered ? round(correct / answered, 3) : null,
    avgTimeSeconds: times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : null,
    status: statusFor(correct, answered),
    confidence: answered >= EVIDENCE.minForClaim ? confidenceFor(answered) : 'none'
  };

  const strengths = families.filter(f => f.status === STATUS.STRENGTH).sort((a, b) => b.accuracy - a.accuracy || b.n - a.n);
  const weaknesses = families.filter(f => f.status === STATUS.WEAKNESS);
  const hiddenWeakTasks = tasks.filter(t => t.status === STATUS.WEAKNESS
    && !weaknesses.some(f => f.id === t.topFamily));
  const insufficient = families.filter(f => f.status === STATUS.INSUFFICIENT);
  const recommendations = recommend({families, tasks, patterns, misconceptionText});

  const report = {
    schema: 'numerical-generator-performance-report-v1',
    evidence: EVIDENCE,
    overall,
    levels: {family: families, task: tasks, subIdea: subIdeas, skill: skills},
    strengths, weaknesses, hiddenWeakTasks, insufficient,
    errorPatterns: patterns, errorTypes, trend, speed, recommendations
  };
  report.text = performanceText(report, misconceptionText);
  return report;
}

const conf = c => `الثقة: ${CONFIDENCE_AR[c] ?? c}`;

/**
 * The five sections a learner reads, as plain lines. The same lines feed the
 * result screen and the printed report, so the two never disagree.
 */
export function performanceText(report, misconceptionText = id => id) {
  const o = report.overall;
  const sections = [];

  const overall = [];
  if (o.answered === 0) overall.push('لم تُسجَّل أي إجابة، فلا يمكن تقييم الأداء.');
  else {
    overall.push(`أجبت عن ${o.answered} من ${o.asked}، منها ${o.correct} صحيحة (${o.percentage}% من الأسئلة${o.unanswered ? `، و${o.unanswered} بلا إجابة` : ''}).`);
    if (o.avgTimeSeconds !== null) overall.push(`متوسط زمن السؤال ${o.avgTimeSeconds} ثانية.`);
    if (o.status === STATUS.INSUFFICIENT) overall.push(`عدد الإجابات أقل من ${EVIDENCE.minForClaim}، فلا يُبنى عليها حكم عام (${conf('none')}).`);
    else overall.push(`${o.status === STATUS.STRENGTH ? 'أداء عام قوي' : o.status === STATUS.WEAKNESS ? 'أداء عام يحتاج إلى تدريب' : 'أداء عام متوسط'} (${conf(o.confidence)}).`);
    if (report.trend.status === 'MEASURED' && report.trend.direction !== 'STABLE') {
      overall.push(`${report.trend.direction === 'IMPROVING' ? 'تحسّن واضح خلال الجلسة' : 'تراجع خلال الجلسة'}: ${report.trend.firstHalf.percentage}% في النصف الأول مقابل ${report.trend.secondHalf.percentage}% في النصف الثاني (${conf(report.trend.confidence)}).`);
    }
    for (const note of report.speed.notes ?? []) {
      if (note.kind === 'ACCURATE_BUT_SLOW') overall.push(`دقتك عالية لكن زمنك أطول من الزمن المرجعي التقريبي؛ هذه ملاحظة عن السرعة لا عن الفهم (${conf('low')}).`);
      if (note.kind === 'RUSHED_ERRORS') overall.push(`${note.count} من أخطائك جاءت في زمن قصير جدًا، مما يرجّح التسرع (${conf('low')}).`);
      if (note.kind === 'FAST_BUT_ERROR_PRONE') overall.push(`زمنك قصير ونسبة الخطأ مرتفعة، مما يرجّح التسرع (${conf('low')}).`);
    }
  }
  sections.push({id: 'overall', heading: 'الأداء العام', lines: overall});

  const strengths = report.strengths.map(f => `${f.label}: ${f.correct}/${f.n} (${f.percentage}%) — ${conf(f.confidence)}.`);
  if (!strengths.length) strengths.push(o.answered < EVIDENCE.minForClaim || report.levels.family.every(f => f.status === STATUS.INSUFFICIENT)
    ? 'لا توجد أدلة كافية بعد لتحديد نقاط قوة.'
    : 'لم تبلغ أي عائلة حد القوة في هذه الجلسة.');
  sections.push({id: 'strengths', heading: 'نقاط القوة', lines: strengths});

  const improve = report.weaknesses.map(f => `${f.label}: ${f.correct}/${f.n} (${f.percentage}%) — ${conf(f.confidence)}.`);
  for (const t of report.hiddenWeakTasks) improve.push(`نوع المهمة «${t.label}»: ${t.correct}/${t.n} (${t.percentage}%) — ${conf(t.confidence)}.`);
  if (!improve.length) improve.push(o.answered < EVIDENCE.minForClaim || report.levels.family.every(f => f.status === STATUS.INSUFFICIENT)
    ? 'لا توجد أدلة كافية بعد لتحديد ما يحتاج إلى تحسين.'
    : 'لا توجد نقطة ضعف مؤكدة بالأدلة المتاحة.');
  if (report.insufficient.length && o.answered >= EVIDENCE.minForClaim) {
    improve.push(`أدلة غير كافية (أقل من ${EVIDENCE.minForClaim} أسئلة): ${report.insufficient.map(f => f.label).join('، ')}.`);
  }
  sections.push({id: 'improve', heading: 'ما يحتاج إلى تحسين', lines: improve});

  const patterns = report.errorPatterns.map(p =>
    `تكرر ${p.count} مرات (${Math.round(p.share * 100)}% من الأخطاء): ${misconceptionText(p.id)} — ${ERROR_TYPE_AR[p.errorType]} (${conf(p.confidence)}).`);
  if (report.errorTypes.dominant) {
    patterns.push(`أغلب أخطائك (${report.errorTypes.dominant.count} من ${report.errorTypes.wrong}) من نوع: ${ERROR_TYPE_AR[report.errorTypes.dominant.type]}.`);
  }
  if (!patterns.length) patterns.push(report.errorTypes.wrong < EVIDENCE.pattern.minCount
    ? 'عدد الأخطاء أقل من أن يُستخلص منه نمط.'
    : 'لا يوجد نمط خطأ متكرر؛ الأخطاء متفرقة.');
  sections.push({id: 'patterns', heading: 'أنماط الأخطاء', lines: patterns});

  const practice = report.recommendations.map(r => `${r.label}: ${r.questions} أسئلة — ${r.reasons.join('؛ ')}.`);
  if (!practice.length) practice.push(o.answered < EVIDENCE.minForClaim
    ? 'أكمل جلسة أطول لتظهر توصيات مبنية على أدلة.'
    : 'لا توصية محددة؛ تابع التدريب المختلط للحفاظ على المستوى.');
  sections.push({id: 'practice', heading: 'تدريب مقترح', lines: practice});

  return sections;
}

/**
 * The families a "practise my weak families" chooser may pick from, by the
 * same evidence rule the report uses: at least `minForClaim` attempts, and
 * an accuracy at or below the weakness line. Accepts the app's persistent
 * per-family statistics ({attempts, correct}).
 */
export function weakFamiliesFrom(stats, familyIds) {
  return familyIds
    .map(id => {
      const s = stats?.[id] ?? {};
      const attempts = Number(s.attempts || 0);
      const accuracy = attempts ? Number(s.correct || 0) / attempts : null;
      return {id, attempts, accuracy};
    })
    .filter(x => x.attempts >= EVIDENCE.minForClaim && x.accuracy !== null && x.accuracy <= EVIDENCE.weakness)
    .sort((a, b) => a.accuracy - b.accuracy || b.attempts - a.attempts);
}
