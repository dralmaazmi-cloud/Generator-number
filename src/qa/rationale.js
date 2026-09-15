// RC2.9.4-A1. The rationale a learner is shown for a wrong option, rendered
// from ONE structured source of truth per distractor.
//
// The defect. Every wrong option already carried strong numeric provenance:
// the misconception it was built from, the derivation that produced its value,
// and the step it corrupts. The sentence shown beside that provenance was
// independent of it. The catalogue sentence for a misconception id was printed
// whatever the family asked and whatever the derivation had actually done, so
// a ratios item told the learner about «متوسط المتوسطين», a mixture item spoke
// of «خطوة النمط», an ages item said «طرحت» beside a derivation that read
// «30 + 5», and a derivation of «1 × 4» tidied to «4» produced «اخترت 4، وهي
// ناتج 4».
//
// The remedy. The rationale is rendered here from {misconception, derivation,
// value, family, template}, and three things are checked at render time and
// again at publication (a contradiction is a rejection, not a warning):
//
//   1. OPERATION CONSISTENCY. If the sentence says the learner divided,
//      multiplied, added or subtracted (second-person past tense: قسمت،
//      ضربت، جمعت، طرحت، أضفت), the derivation must contain that operation.
//      Where it does not, the sentence is not shown; a concise factual line
//      about the derivation is shown instead. No reason is invented.
//   2. VOCABULARY SCOPE. A sentence that speaks of sequence terms, averages of
//      averages, speeds, ages, cycles or fractions is shown only in a family
//      where those words describe the question. Generic ids carry a neutral
//      sentence in the catalogue and a family-specific variant here.
//   3. NO VACUOUS DERIVATION. «وهي ناتج X» is never printed when X is the
//      option itself. A derivation that the arithmetic tidy would collapse to
//      a bare number is shown raw («7 × 1»), because the operation IS the
//      evidence; a derivation that is a bare number is not shown at all.
//
// Nothing here touches the option, its value, its misconception id or the
// derivation the engine records: those are the provenance the checks are
// made against, and Phase A leaves them byte-identical.

import {MISCONCEPTIONS, isKnownMisconception} from './misconceptions.js';
import {tidyArithmetic} from '../arabic/tidy-arithmetic.js';

/** Operation symbols as the derivations print them. */
const OP_SYMBOL = Object.freeze({multiply: '×', divide: '÷', add: '+', subtract: '−'});

/**
 * Second-person past-tense verbs by which a sentence asserts what the learner
 * DID. Matched as whole words: «قسمته» (its division) and «تضربه» (you should
 * multiply it) are not claims of a performed operation.
 */
const DID_VERBS = [
  [/(?:^|[\s،؛(])(?:و|ف)?(?:قسمت|قسّمت)(?=$|[\s،؛.)])/u, 'divide'],
  [/(?:^|[\s،؛(])(?:و|ف)?ضربت(?=$|[\s،؛.)])/u, 'multiply'],
  [/(?:^|[\s،؛(])(?:و|ف)?(?:جمعت|أضفت)(?=$|[\s،؛.)])/u, 'add'],
  [/(?:^|[\s،؛(])(?:و|ف)?طرحت(?=$|[\s،؛.)])/u, 'subtract']
];

/**
 * Domain vocabulary and the families in which it describes the question. A
 * sentence carrying a word outside its families is contamination.
 */
export const VOCABULARY_SCOPE = Object.freeze([
  {re: /النمط|المتتالية|السلسلة|الحدين|الحد المطلوب|الحد الذي|الحد التالي|الحد السابق|أرقام الحد|من الأزواج|الحد نفسه/u, families: ['sequences']},
  {re: /المتوسطين|أحجام المجموعتين|المتوسط القديم|المتوسط المستهدف|المتوسط الحسابي للسرعتين/u, families: ['averages', 'speed']},
  {re: /السرعتين|السرعة النسبية|نصف المسافة|المسافة الكلية|مسألة لحاق|مسألة التقاء|التيار|أثناء التأخير|مدة التأخير|سرعة طرف واحد|السرعة على المسافة/u, families: ['speed']},
  {re: /العمرين|فرق العمرين|عمر الشخص|عمر الفرد|عمر أحدهم|الأعمار الحالية|العمر الحالي|العمر بعد|العمر في الماضي/u, families: ['ages']},
  {re: /الدورتين|اللقاءين|طولَي الدورتين|أيام الأسبوع|الإزاحتين|محور الزمن|فارق البداية|التاريخين/u, families: ['calendar']},
  {re: /الكسرين|أحد الكسور|الكسر على العدد الأصلي/u, families: ['fractions']},
  {re: /التركيزين|المزيج|المكوّن/u, families: ['percentages']},
  {re: /الخطتين|السعرين/u, families: ['direct_proportion', 'profit_loss', 'unit_rate']},
  {re: /الفرع|الفرعين|المسارات المؤكدة|الاستنتاج الانتقالي|ترتيب واحد ممكن/u, families: ['relational']},
  {re: /الخاصية/u, families: ['odd_one_out', 'sequences']}
]);

/**
 * Family- and template-specific sentences for ids whose catalogue sentence is
 * true in one family and misleading in another. Looked up as
 * VARIANTS[id][templateId], then VARIANTS[id][family], then the catalogue.
 * Every variant describes what the DERIVATION at that site actually does.
 */
export const VARIANTS = Object.freeze({
  // A sequence idea used everywhere: the neutral catalogue sentence serves
  // every family; sequences keep their own words.
  USED_DIFFERENCE_AS_ANSWER: {sequences: 'أعطيت مقدار الفرق بين الحدين بدل الحد المطلوب نفسه.'},
  APPLIED_PREVIOUS_STEP: {sequences: 'طبّقت الفرق السابق بدل الفرق التالي في النمط.'},
  // An averages idea that other families reach for a weighted quantity.
  USED_ARITHMETIC_MEAN_OF_AVERAGES: {
    averages: 'أخذت متوسط المتوسطين مباشرة رغم اختلاف أحجام المجموعتين.',
    ratios: 'أخذت منتصف العددين المعطيين، والنسبة لا تُقسم مناصفة.',
    speed: 'أخذت المتوسط الحسابي للقيمتين مباشرة رغم اختلاف وزنيهما في الزمن.',
    machines: 'أخذت متوسط المعدلين مباشرة رغم اختلاف عدد الآلات في كل نوع.',
    combined_rate: 'أخذت متوسط القيمتين مباشرة، والمطلوب يعتمد على مجموعهما لا على متوسطهما.',
    profit_loss: 'أخذت متوسط النسبتين مباشرة، وهما محسوبتان من أساسين مختلفين.'
  },
  WEIGHTED_BY_WRONG_QUANTITY: {
    speed: 'رجّحت المتوسط بالكمية الخطأ: بالمسافة بدل الزمن أو بالعكس.',
    averages: 'رجّحت المتوسط بالكمية الخطأ بدل عدد القيم في كل مجموعة.'
  },
  HALF_DISTANCE_AS_ANSWER: {speed: 'أعطيت نصف المسافة بدل المسافة الكلية.'},
  USED_AGE_DIFFERENCE_AS_ANSWER: {ages: 'أعدت فرق العمرين بدل العمر المطلوب.'},
  // Operation claims that are false at these sites: say what the derivation did.
  SUBTRACTED_INSTEAD_OF_ADDED: {
    AGE_M_DIFFERENCE_INVARIANT: 'أضفت السنوات إلى الفرق بين العمرين، والفرق بينهما لا يتغير بمرور السنوات.',
    AGE_M_PAST_RATIO: 'أضفت السنوات مرة ثانية إلى العمر الحالي بعد أن عدت به من الماضي إلى الحاضر.'
  },
  ANSWERED_THE_OTHER_COMPONENT: {
    averages: 'أعطيت عدد قيم المجموعة الأخرى بدل المجموعة المطلوبة.'
  },
  ADDED_PERCENTAGES: {
    percentages: 'تعاملت مع النسبتين كأنهما تُجمعان أو تُطرحان مباشرة، والنسب المتتابعة تُطبَّق واحدة بعد الأخرى.',
    profit_loss: 'تعاملت مع النسبتين كأنهما تُجمعان أو تُطرحان مباشرة، والنسب المتتابعة تُطبَّق واحدة بعد الأخرى.'
  },
  SUBTRACTED_PERCENTAGES: {
    percentages: 'تعاملت مع النسبتين كأنهما تُطرحان مباشرة، والنسب المتتابعة تُطبَّق واحدة بعد الأخرى.',
    profit_loss: 'تعاملت مع النسبتين كأنهما تُطرحان مباشرة، والنسب المتتابعة تُطبَّق واحدة بعد الأخرى.'
  },
  SUBTRACTED_PERCENTAGE_DIRECTLY: {
    percentages: 'طبّقت نسبة التغير على القيمة النهائية بدل قسمة القيمة النهائية على معامل التغير.',
    work_time: 'طبّقت النسبة على القيمة النهائية بدل قسمتها على معامل التغير.',
    profit_loss: 'طبّقت نسبة الربح على سعر البيع بدل قسمة سعر البيع على معامل الربح.'
  },
  ADDED_MARKUP_AND_DISCOUNT: {
    profit_loss: 'تعاملت مع نسبتي الزيادة والخصم كأنهما تُجمعان أو تُطرحان مباشرة، بينما معاملاهما يُضربان.'
  },
  // Found in the fifty-item manual inspection (rc2/RC294_RATIONALE_INSPECTION.md).
  APPLIED_STEP_TWICE: {
    sequences: 'طبّقت خطوة النمط مرتين بدل مرة واحدة.',
    AGE_E_SUM_DIFF: 'أدخلت الفرق كاملًا حيث لا يدخل إلا نصفه، فحُسب أثره مرتين.'
  },
  RATE_APPLIED_TO_WRONG_COUNT: {
    AGE_E_MULT_DIFF: 'قسمت الفرق على المضاعف نفسه بدل الفرق بين المضاعف والواحد، فحصلت على جزء أصغر من الحقيقي.',
    ages: 'وزّعت الفرق على عدد أجزاء غير الذي يخصه.',
    WORK_E_INVERSE: 'قسمت العمل الكامل على عدد عمال غير العدد الجديد وحده.'
  },
  MISREAD_THE_STEP: {
    sequences: 'قرأت مقدار الخطوة خطأً بوحدة واحدة، فخرج الحد الذي بعدها خطأً.',
    PROP_H_TWO_ITEM_SYSTEM: 'قسمت فرق الثمن على عدد الصناديق في إحدى العبارتين بدل الفرق بين عدديهما بعد توحيد العبارتين.',
    MACH_H_TWO_CONFIG: 'قسمت فرق الإنتاج على عدد آلات النوع الأول في إحدى العبارتين بدل الفرق بين عدديهما بعد توحيد العبارتين.'
  },
  // Choosing «لا يمكن تحديده» on a complete chain is the OPPOSITE of resolving
  // an unresolved pair; the catalogue sentence describes the other templates.
  RESOLVED_AN_UNRESOLVED_PAIR: {
    REL_E_CHAIN: 'اعتبرت الترتيب غير محسوم، والجمل تربط الجميع في سلسلة واحدة كاملة.',
    REL_M_CHAIN6: 'اعتبرت الترتيب غير محسوم، والجمل تربط الجميع في سلسلة واحدة كاملة.',
    REL_E_BETWEEN: 'اعتبرت الترتيب غير محسوم، والجمل تربط الجميع في سلسلة واحدة كاملة.',
    REL_M_COUNT: 'اعتبرت العدد غير قابل للتحديد، والمسارات المؤكدة واضحة من الجمل.',
    REL_H_COUNT_BRANCHED: 'اعتبرت العدد غير قابل للتحديد، والمسارات المؤكدة واضحة من الجمل.'
  }
});

/** The catalogue sentences that were sequence-flavoured, made neutral. */
export const NEUTRAL = Object.freeze({
  APPLIED_STEP_TWICE: 'طبّقت الخطوة نفسها مرتين بدل مرة واحدة.',
  MISREAD_THE_STEP: 'قرأت مقدار الخطوة خطأً بوحدة واحدة.',
  USED_DIFFERENCE_AS_ANSWER: 'أعطيت مقدار الفرق بين القيمتين بدل القيمة المطلوبة نفسها.',
  APPLIED_PREVIOUS_STEP: 'طبّقت المقدار السابق بدل المقدار التالي.',
  USED_ARITHMETIC_MEAN_OF_AVERAGES: 'أخذت متوسط القيمتين مباشرة رغم اختلاف وزنيهما.',
  WEIGHTED_BY_WRONG_QUANTITY: 'رجّحت المتوسط بالكمية الخطأ.',
  HALF_DISTANCE_AS_ANSWER: 'أعطيت نصف المقدار المطلوب بدل المقدار الكلي.',
  USED_AGE_DIFFERENCE_AS_ANSWER: 'أعدت الفرق بين القيمتين بدل القيمة المطلوبة.',
  RATE_APPLIED_TO_WRONG_COUNT: 'طبّقت المعدل على عدد وحدات غير الذي يخصه.'
});

/** When the sentence cannot be shown truthfully, the derivation is the rationale. */
export const FACTUAL_FALLBACK = 'هذه العملية ليست التي تقتضيها العلاقة بين المعطيات والمطلوب في هذه الخطوة.';

/** Operations present in a derivation, by name. */
export function operationsIn(derivation) {
  const s = String(derivation ?? '');
  const ops = new Set();
  if (/×/.test(s)) ops.add('multiply');
  if (/÷/.test(s)) ops.add('divide');
  if (/\+/.test(s)) ops.add('add');
  // A minus between two operands, not a sign on a literal.
  if (/[\d)]\s*[−-]\s*[\d(]/.test(s)) ops.add('subtract');
  return ops;
}

/** Operations a sentence asserts the learner performed. */
export function claimedOperations(sentence) {
  const out = new Set();
  for (const [re, op] of DID_VERBS) if (re.test(String(sentence ?? ''))) out.add(op);
  return out;
}

/** The sentence for an id at a site: template variant, family variant, neutral, catalogue. */
export function sentenceFor(misconceptionId, {family, templateId} = {}) {
  const v = VARIANTS[misconceptionId];
  if (v) {
    if (templateId && v[templateId]) return v[templateId];
    if (family && v[family]) return v[family];
  }
  return NEUTRAL[misconceptionId] ?? MISCONCEPTIONS[misconceptionId] ?? null;
}

/**
 * The derivation as shown: tidied only when the tidy leaves an operation to
 * read; null when it is nothing but the option's own value.
 */
export function shownDerivation(derivation, value) {
  if (derivation === null || derivation === undefined || String(derivation).trim() === '') return null;
  const raw = String(derivation);
  const tidy = tidyArithmetic(raw);
  const hasOp = s => /[×÷+−]|\d\s-\s\d/.test(s);
  const chosen = hasOp(tidy) ? tidy : raw;
  if (/^\s*[\d.]+\s*$/.test(chosen)) {
    // A bare number: only worth saying if it is not the option itself.
    return Number(chosen) === Number(value) ? null : chosen;
  }
  return chosen;
}

const numberOf = text => {
  const m = /-?\d+(?:\.\d+)?/.exec(String(text ?? '').replace(/[٠-٩]/g, c => String(c.codePointAt(0) - 0x0660)));
  return m ? Number(m[0]) : null;
};

/**
 * Problems in a rendered rationale, each named. Empty means consistent.
 * @param {object} o
 * @param {string} o.text        the rendered rationale
 * @param {string|null} o.derivation the engine's derivation for the option
 * @param {string} o.family
 * @param {number|string} o.value
 * @param {string} [o.optionText]
 */
export function rationaleProblems({text, derivation, family, value, optionText}) {
  const problems = [];
  const t = String(text ?? '');
  if (!t.trim()) return ['EMPTY'];
  // The head («اخترت X، وهي ناتج D.») quotes the option and the template's own
  // derivation, which is in-family by construction; the checks about wording
  // apply to the SENTENCE after it. A derivation never contains «. » (a
  // decimal point is never followed by a space), so the split is exact.
  const split = /^(اخترت [^]*?(?:، وهي ناتج [^]*?)?\.)\s+([^]*)$/u.exec(t);
  const head = split ? split[1] : '';
  const sentence = split ? split[2] : t;
  // 1. vacuous «وهي ناتج X» about X itself
  const m = /وهي ناتج ([^]+?)\.$/u.exec(head);
  if (m && /^\s*[\d.]+\s*$/.test(m[1]) && Number(m[1]) === Number(value)) problems.push('VACUOUS_DERIVATION');
  if (m && optionText && m[1].trim() === String(optionText).trim()) problems.push('VACUOUS_DERIVATION');
  // 2. operation claims against the derivation
  const ops = operationsIn(derivation);
  if (ops.size) {
    for (const op of claimedOperations(sentence)) if (!ops.has(op)) problems.push(`OPERATION_CONTRADICTION:${op}`);
  }
  // 3. vocabulary outside its families
  for (const scope of VOCABULARY_SCOPE) {
    if (scope.re.test(sentence) && family && !scope.families.includes(family)) problems.push(`CROSS_FAMILY_VOCABULARY:${scope.re.source.split('|')[0]}`);
  }
  return problems;
}

/**
 * Render the rationale for one wrong option.
 * @returns {string|null} null only when the misconception id is unknown.
 */
export function renderRationale({optionText, value, misconceptionId, derivation, family, templateId}) {
  if (!isKnownMisconception(misconceptionId)) return null;
  const shown = shownDerivation(derivation, value);
  const head = shown ? `اخترت ${optionText}، وهي ناتج ${shown}.` : `اخترت ${optionText}.`;
  const sentence = sentenceFor(misconceptionId, {family, templateId});
  const candidate = `${head} ${sentence}`;
  const problems = rationaleProblems({text: candidate, derivation, family, value, optionText})
    .filter(p => p !== 'VACUOUS_DERIVATION');
  if (!problems.length) return candidate;
  // The sentence would say something the derivation or the family contradicts:
  // show the derivation and no invented reason.
  return `${head} ${FACTUAL_FALLBACK}`;
}

export {numberOf as _numberOf};
