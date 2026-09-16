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
  // RC2.9.5 §1.1. Two catalogue sentences that are shown family-wide carried an
  // operation in them: «مجموع وسيط» and «ولم تضربه في الكمية». Both are the
  // same slip in any family — stopping before the last step — so the slip is
  // said and the operation is not.
  STOPPED_AT_INTERMEDIATE_TOTAL: 'توقفت عند قيمة وسيطة ولم تكمل الخطوة الأخيرة.',
  STOPPED_AT_UNIT_RATE: 'توقفت عند قيمة الوحدة الواحدة ولم تكمل إلى الكمية المطلوبة.',
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

/**
 * RC2.9.5 §1.1. What a sentence says about the SOLUTION, as opposed to what it
 * says the learner did. «طرحت حيث يقتضي الحل الجمع» claims two things: that the
 * learner subtracted (checked against the derivation since RC2.9.4) and that
 * the solution adds (checked against nothing until now). The second claim is
 * the one the independent scan found false: it was true of the id in the
 * abstract and false at the site.
 */
export const SOLUTION_CLAIMS = Object.freeze([
  [/يقتضي الحل الجمع|تقتضي الجمع|تقتضي جمعهما|بدل الجمع|والصواب الجمع|تُجمعان|يُجمعان|هو مجموعهما|على مجموعهما/u, 'add'],
  [/يقتضي الحل الطرح|تقتضي الطرح|تقتضي الفرق بينهما|هو الفرق بينهما|بدل الطرح|والصواب الطرح|تُطرحان|يُطرحان/u, 'subtract'],
  [/يقتضي الحل الضرب|تقتضي الضرب|ضرب لا جمع|بدل الضرب|والصواب الضرب|يُضربان|تُضربان|يكبر المطلوب بكبر المعطى|تكبير بمعامل/u, 'multiply'],
  [/يقتضي الحل القسمة|تقتضي القسمة لا الضرب|تقتضي القسمة|بدل القسمة|بدل استخدام قيمة الوحدة|يمر الحل بقيمة الوحدة/u, 'divide']
]);

/** The operations a sentence asserts the SOLUTION itself uses. */
export function solutionClaims(sentence) {
  const out = new Set();
  for (const [re, op] of SOLUTION_CLAIMS) if (re.test(String(sentence ?? ''))) out.add(op);
  return out;
}

/**
 * Whether a sentence names an arithmetic operation at all, as a verb the
 * learner is said to have performed or as the name of the operation the
 * solution is said to need. A sentence shown across four or more families must
 * not name one: an operation is a property of the site, not of the id.
 */
const OPERATION_NOUNS = /الجمع|الطرح|الضرب|القسمة|جمعها|طرحها|ضربها|قسمتها|تُجمع|تُطرح|تُضرب|تُقسم|يُجمع|يُطرح|يُضرب|يُقسم|بجمع|بطرح|بضرب|بقسمة|قسمة|إضافتها|أضفت|جمعت|طرحت|ضربت|قسمت|قسّمت/u;
export const namesAnOperation = sentence =>
  claimedOperations(sentence).size > 0 || solutionClaims(sentence).size > 0 || OPERATION_NOUNS.test(String(sentence ?? ''));

/**
 * RC2.9.5 §1.1. The DECLARED family-neutral set: the only sentences allowed to
 * be shown in four or more families. The rule the RC2.9.4 brief stated and did
 * not enforce is enforced here — a sentence this wide may not name an
 * operation, because which operation the site needs is a property of the site.
 * Measured by tools/audit/rc295-rationale-audit.mjs and gated in
 * tests/rc295-rationale.test.mjs.
 */
export const FAMILY_NEUTRAL = Object.freeze([
  'أعدت قيمة معطاة في السؤال بدل القيمة المطلوبة.',
  'توقفت عند قيمة وسيطة ولم تكمل الخطوة الأخيرة.',
  'طبّقت الخطوة نفسها مرتين بدل مرة واحدة.',
  'زدت أو نقصت خطوة واحدة عن العدد الصحيح من الخطوات.',
  'أسقطت إحدى المراحل من الحساب.',
  'أعطيت مقدار الفرق بين القيمتين بدل القيمة المطلوبة نفسها.',
  'طبّقت العملية في الاتجاه المعاكس.',
  'توقفت بعد المرحلة الأولى ولم تكمل بقية المراحل المطلوبة.',
  'قرأت مقدار الخطوة خطأً بوحدة واحدة.',
  'استخدمت إحدى الحالتين وأهملت الأخرى، والحالتان معًا هما ما يحدد القيمة.',
  'توقفت عند قيمة الوحدة الواحدة ولم تكمل إلى الكمية المطلوبة.',
  'طبّقت المعدل على عدد وحدات غير الذي يخصه.'
]);


/**
 * RC2.9.5 §1.1. The SUBJECT each family's questions are about, in one phrase
 * that is true of every item in that family. It is the only family-dependent
 * part of a site sentence: what the learner did is read off the derivation and
 * what the site needs is read off the solution, so the phrase adds the domain
 * and never a claim.
 */
export const FAMILY_SUBJECT = Object.freeze({
  ages: 'الأعمار',
  averages: 'القيم ومتوسطها',
  calendar: 'الأيام والدورات',
  combined_rate: 'المعدلات المجتمعة',
  direct_proportion: 'الكميتين المتناسبتين',
  fractions: 'أجزاء الكل',
  machines: 'الآلات وإنتاجها',
  odd_one_out: 'خصائص العناصر',
  percentages: 'النسبة وأساسها',
  profit_loss: 'سعري الشراء والبيع',
  ratios: 'أجزاء النسبة',
  relational: 'مواقع الترتيب',
  sequences: 'حدود المتتالية',
  speed: 'المسافة والزمن',
  unit_rate: 'قيمة الوحدة والكمية',
  work_time: 'العمل والزمن'
});

/**
 * RC2.9.5 §1.1. Sentences that must not be shown family-wide.
 *
 * The independent scan found thirty sentences shown in four or more families,
 * nine of them naming an operation. A sentence that names an operation is a
 * claim about the SITE — this site adds, that one multiplies — and a claim
 * about the site cannot be carried by a catalogue entry that knows nothing
 * about the site. Twelve sentences are declared family-neutral (FAMILY_NEUTRAL
 * above): each describes a slip in the PROCESS — stopping early, applying a
 * step twice, returning a given — which is the same slip whatever the question
 * is about, and none names an operation.
 *
 * Every id below is the opposite case. Its sentence is rendered per family
 * from the pattern here, so the learner reads which relation is meant, and the
 * operation it names is verified twice before it is shown: against the
 * DERIVATION (what the option's own arithmetic did) and against the SOLUTION's
 * operation profile (what this question actually needs). An unverifiable claim
 * is not softened — it is not shown.
 */
const SITE_PATTERNS = Object.freeze({
  SUBTRACTED_INSTEAD_OF_ADDED: 'طرحت المقدارين، والعلاقة بين {subject} في هذه المسألة تقتضي جمعهما.',
  ADDED_INSTEAD_OF_SUBTRACTED: 'جمعت المقدارين، والعلاقة بين {subject} في هذه المسألة تقتضي الفرق بينهما.',
  MULTIPLIED_INSTEAD_OF_DIVIDED: 'ضربت القيمتين، والعلاقة بين {subject} هنا تقتضي القسمة لا الضرب.',
  MULTIPLIED_COUNTS_INSTEAD_OF_RATE: 'ضربت العددين المعطيين ببعضهما، وفي {subject} يمر الحل بقيمة الوحدة الواحدة أولًا.',
  ADDED_INSTEAD_OF_SCALING: 'جمعت العددين، والعلاقة بين {subject} في هذه المسألة ضرب لا جمع.',
  REVERSED_DIRECT_PROPORTION: 'عكست اتجاه التناسب بين {subject}: قسمت حيث يكبر المطلوب بكبر المعطى.',
  SWAPPED_RATE_AND_COUNT: 'بدّلت بين المعدل وعدد الوحدات في {subject}، فدخل كل منهما مكان الآخر.',
  ADDED_WHERE_A_DIFFERENCE_BELONGS: 'جمعت المقدارين، والمطلوب في {subject} هو الفرق بينهما.',
  USED_ORIGINAL_TOTAL: 'استخدمت القيمة قبل التغير في {subject}، والمطلوب هو القيمة بعده.',
  USED_NEW_TOTAL: 'استخدمت القيمة بعد التغير في {subject}، والمطلوب هو القيمة قبله.',
  TREATED_PERCENT_AS_AMOUNT: 'تعاملت مع النسبة كأنها مقدار جاهز، والنسبة في {subject} تُقاس من أساسها.',
  SWAPPED_THE_TWO_UNKNOWNS: 'أوجدت المجهول الآخر في {subject} بدل المجهول الذي يسأل عنه السؤال.',
  USED_ONLY_LAST_STAGE: 'حسبت المرحلة الأخيرة وحدها وأهملت ما سبقها في {subject}.',
  USED_ONLY_FIRST_RATE: 'استخدمت المعدل الأول وحده على كامل المدة، والمعدل يتغير بين المرحلتين في {subject}.',
  USED_ONLY_SECOND_RATE: 'استخدمت المعدل الثاني وحده على كامل المدة، والمعدل يتغير بين المرحلتين في {subject}.',
  ASSUMED_EQUAL_SHARES: 'افترضت تساوي الجزأين في {subject}، والمعطيات لا تقول ذلك.',
  HALF_DISTANCE_AS_ANSWER: 'أعطيت نصف المقدار المطلوب بدل المقدار الكامل في {subject}.',
  USED_TOTAL_INSTEAD_OF_REMAINDER: 'استخدمت المقدار الكامل من {subject} بدل الجزء المتبقي منه.'
});

/** The per-family sentence for every id above, built once. */
export const SITE_VARIANTS = Object.freeze(Object.fromEntries(
  Object.entries(SITE_PATTERNS).map(([id, pattern]) => [id, Object.freeze(Object.fromEntries(
    Object.entries(FAMILY_SUBJECT).map(([family, subject]) => [family, pattern.replace('{subject}', subject)])
  ))])
));

/**
 * When no diagnostic sentence can be shown truthfully, the derivation is the
 * rationale and this says only that the operation is not the one the step
 * needs.
 *
 * RC2.9.6 §3.2. It used to be one sentence for every family, and at 116 uses
 * across 14 families it was the thirteenth sentence over the declared ceiling
 * of twelve — and the closest thing in the bank to saying nothing. It is now
 * rendered per family from the same subject table the site sentences use, so
 * the learner reads which relation the step is about. That adds a DOMAIN, not a
 * claim: the sentence still asserts nothing about what they did, which is the
 * whole reason it is the fallback. Making it vaguer to merge it away would have
 * been the other direction, and the brief forbids it.
 */
const FACTUAL_FALLBACK_PATTERN = 'هذه العملية ليست التي تقتضيها العلاقة بين {subject} في هذه الخطوة.';

/** The per-family fallback, built from the same table as the site sentences. */
export const FACTUAL_FALLBACK_VARIANTS = Object.freeze(Object.fromEntries(
  Object.entries(FAMILY_SUBJECT).map(([family, subject]) =>
    [family, FACTUAL_FALLBACK_PATTERN.replace('{subject}', subject)])
));

/** The family-free wording, kept for a caller with no family in hand. */
export const FACTUAL_FALLBACK = FACTUAL_FALLBACK_PATTERN.replace('{subject}', 'المعطيات والمطلوب');

/** The fallback a given family shows. */
export const factualFallbackFor = family => FACTUAL_FALLBACK_VARIANTS[family] ?? FACTUAL_FALLBACK;

/**
 * RC2.9.5 §1.3. «× 1» and «÷ 1» are not operations a learner performed; they
 * are an artifact of a derivation written uniformly. RC2.9.3 removed them from
 * the explanation and RC2.9.4 left them in the derivations, where two effects
 * followed: «وهي ناتج 5 ÷ 1» was printed, and a sentence claiming «قسمت» was
 * accepted because the derivation contained a division by one. Both are fixed
 * at the source: the identity is stripped before anything reads the derivation.
 */
export const stripIdentityOperations = derivation => String(derivation ?? '')
  .replace(/(^|[(=\s])1\s*[×*]\s*/gu, '$1')
  .replace(/\s*[×*]\s*1(?![\d.])/gu, '')
  .replace(/\s*[÷/]\s*1(?![\d.])/gu, '')
  .trim();

/** Operations present in a derivation, by name. */
export function operationsIn(derivation) {
  const s = stripIdentityOperations(derivation);
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
/**
 * RC2.9.4-B11 (feedback only). One id is used for two different slips, and the
 * DERIVATION says which: «total + new» added the original amount to the asked
 * one, «المجموع المعطى 56» handed the original back, «sell ÷ buy × 100» took
 * the whole ratio of two prices as the change between them. The sign-off
 * quoted MACH_E_HOURS C — «450 + 375» explained as «used the original number
 * instead of the number after the change» — as a rationale that does not
 * describe its derivation. The sentence is chosen by the shape of the
 * derivation, and only then by template and family.
 */
export const DERIVATION_VARIANTS = Object.freeze({
  USED_ORIGINAL_TOTAL: [
    {when: /^\s*[\d.,]+\s*[÷/]\s*[\d.,]+\s*×\s*100\s*$|^\s*[\d.,]+\s*×\s*100\s*[÷/]\s*[\d.,]+\s*$/u,
      text: 'أخذت نسبة السعرين كاملة بدل الفرق بينهما، فحسبت المئة الأصلية ضمن النسبة.'},
    {when: /\(100\s*\+\s*\d+\)/u,
      text: 'طبّقت النسبة على القيمة كزيادة عليها، بينما المطلوب هو مقدار النسبة وحده.'},
    {when: /\+/u,
      text: 'أضفت الكمية الأصلية في {subject} إلى الناتج المطلوب، والمطلوب هو ناتج الوضع الجديد وحده.'}
  ]
});

export function sentenceFor(misconceptionId, {family, templateId, derivation} = {}) {
  const subject = FAMILY_SUBJECT[family] ?? 'المعطيات';
  const fill = text => (text == null ? null : String(text).replace('{subject}', subject));
  const byDerivation = DERIVATION_VARIANTS[misconceptionId];
  if (byDerivation && derivation != null) {
    const hit = byDerivation.find(x => x.when.test(String(derivation)));
    if (hit) return fill(hit.text);
  }
  const v = VARIANTS[misconceptionId];
  if (v) {
    if (templateId && v[templateId]) return fill(v[templateId]);
    if (family && v[family]) return fill(v[family]);
  }
  // RC2.9.5 §1.1. An id whose sentence makes a claim about the SITE is rendered
  // per family rather than once for every family.
  const site = SITE_VARIANTS[misconceptionId];
  if (site && family && site[family]) return fill(site[family]);
  return fill(NEUTRAL[misconceptionId] ?? MISCONCEPTIONS[misconceptionId] ?? null);
}

/**
 * The derivation as shown: tidied only when the tidy leaves an operation to
 * read; null when it is nothing but the option's own value.
 */
export function shownDerivation(derivation, value) {
  if (derivation === null || derivation === undefined || String(derivation).trim() === '') return null;
  const raw = stripIdentityOperations(derivation);
  if (raw === '') return null;
  const tidy = tidyArithmetic(raw);
  const hasOp = s => /[×÷+−]|\d\s-\s\d/.test(s);
  const chosen = hasOp(tidy) ? tidy : raw;
  if (/^\s*[\d.]+\s*$/.test(chosen)) {
    // A bare number: only worth saying if it is not the option itself.
    return Number(chosen) === Number(value) ? null : chosen;
  }
  if (/^\s*[\d.]+\s*$/.test(raw) && Number(raw) === Number(value)) return null;
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
 * @param {string[]} [o.solutionOperations] the question's own operation profile
 */
export function rationaleProblems({text, derivation, family, value, optionText, solutionOperations}) {
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
  // 2b. RC2.9.5 §1.1. claims about what THE SOLUTION needs, against what the
  // solution actually does. This is the check RC2.9.4 did not make: it verified
  // the operation the sentence attributes to the LEARNER and never the one it
  // attributes to the question.
  if (Array.isArray(solutionOperations) && solutionOperations.length) {
    for (const op of solutionClaims(sentence)) {
      if (!solutionOperations.includes(op)) problems.push(`SOLUTION_OPERATION_CONTRADICTION:${op}`);
    }
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
export function renderRationale({optionText, value, misconceptionId, derivation, family, templateId, solutionOperations}) {
  if (!isKnownMisconception(misconceptionId)) return null;
  const shown = shownDerivation(derivation, value);
  const head = shown ? `اخترت ${optionText}، وهي ناتج ${shown}.` : `اخترت ${optionText}.`;
  const sentence = sentenceFor(misconceptionId, {family, templateId, derivation});
  const candidate = `${head} ${sentence}`;
  const problems = rationaleProblems({text: candidate, derivation, family, value, optionText, solutionOperations})
    .filter(p => p !== 'VACUOUS_DERIVATION');
  if (!problems.length) return candidate;
  // The sentence would say something the derivation or the family contradicts:
  // show the derivation and no invented reason.
  return `${head} ${factualFallbackFor(family)}`;
}

export {numberOf as _numberOf};
