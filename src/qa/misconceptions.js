// Section 14: every distractor is the value a specific, nameable mistake
// produces. No distractor may exist without an entry here, and the
// option-specific feedback is built from the entry plus the question's own
// numbers — never from a generic sentence.

export const MISCONCEPTIONS = Object.freeze({
  // --- stopping early / stage errors ---
  STOPPED_AFTER_FIRST_STAGE: 'توقفت بعد المرحلة الأولى ولم تكمل بقية المراحل المطلوبة.',
  STOPPED_AT_UNIT_RATE: 'توقفت عند معدل الوحدة ولم تضربه في الكمية أو الزمن المطلوب.',
  STOPPED_AT_INTERMEDIATE_TOTAL: 'توقفت عند مجموع وسيط ولم تكمل الخطوة الأخيرة.',
  MISSED_ONE_STAGE: 'أسقطت إحدى المراحل من الحساب.',
  MISSED_ONE_FRACTION_STAGE: 'أسقطت أحد الكسور ولم تطبقه على الناتج.',
  USED_ONLY_LAST_STAGE: 'حسبت المرحلة الأخيرة وحدها وأهملت ما سبقها.',

  // --- wrong base / wrong total ---
  USED_ORIGINAL_TOTAL: 'استخدمت العدد الأصلي بدل العدد بعد التغيير.',
  USED_NEW_TOTAL: 'استخدمت العدد الجديد بدل العدد الأصلي المطلوب.',
  USED_GIVEN_VALUE_AS_ANSWER: 'أعدت قيمة معطاة في السؤال بدل القيمة المطلوبة.',
  USED_WRONG_SIDE_OF_RATIO: 'حسبت الطرف الآخر من النسبة بدل الطرف المطلوب.',
  USED_PART_VALUE_AS_ANSWER: 'توقفت عند قيمة الجزء الواحد ولم تضربها في عدد الأجزاء.',
  USED_SUM_OF_PARTS: 'استخدمت مجموع الأجزاء بدل الطرف المطلوب وحده.',
  USED_POST_TRANSFER_VALUE: 'استخدمت القيمة بعد النقل بدل القيمة قبله.',
  USED_PRE_TRANSFER_VALUE: 'استخدمت القيمة قبل النقل بدل القيمة بعده.',
  FAILED_TO_UPDATE_COUNT: 'نسيت تحديث عدد العناصر بعد الإضافة أو الحذف.',
  USED_TOTAL_INSTEAD_OF_REMAINDER: 'استخدمت العمل الكامل بدل الجزء المتبقي.',

  // --- rates ---
  USED_ONLY_FIRST_RATE: 'استخدمت المعدل الأول وحده على كامل المدة.',
  USED_ONLY_SECOND_RATE: 'استخدمت المعدل الثاني وحده على كامل المدة.',
  USED_COMBINED_RATE_ON_FULL_TARGET: 'طبّقت المعدل المشترك على الهدف كاملًا رغم أن جزءًا منه أُنجز بمعدل آخر.',
  USED_SINGLE_RATE_ON_FULL_TARGET: 'قسمت الهدف كاملًا على معدل طرف واحد.',
  USED_ARITHMETIC_MEAN_OF_SPEEDS: 'أخذت المتوسط الحسابي للسرعتين، وهو لا يصح إلا إذا تساوى الزمنان.',
  USED_ARITHMETIC_MEAN_OF_AVERAGES: 'أخذت متوسط المتوسطين مباشرة رغم اختلاف أحجام المجموعتين.',
  USED_SUM_OF_SPEEDS_IN_CHASE: 'جمعت السرعتين في مسألة لحاق، والصحيح أن تطرحهما.',
  USED_DIFFERENCE_OF_SPEEDS_IN_MEETING: 'طرحت السرعتين في مسألة التقاء، والصحيح أن تجمعهما.',
  RATE_APPLIED_TO_WRONG_COUNT: 'ضربت المعدل في عدد وحدات غير الذي يخصه.',
  SWAPPED_RATE_AND_COUNT: 'بدّلت بين المعدل وعدد الوحدات في الضرب أو القسمة.',
  UPGRADED_ALL_INSTEAD_OF_SOME: 'طبّقت التحسين على كل الوحدات رغم أن بعضها فقط تغيّر.',
  IGNORED_UPGRADE: 'تجاهلت التحسين وأبقيت المعدل القديم للجميع.',

  // --- percentages ---
  ADDED_PERCENTAGES: 'جمعت النسبتين مباشرة، والنسب المتتابعة لا تُجمع.',
  SUBTRACTED_PERCENTAGES: 'طرحت النسبتين مباشرة، والنسب المتتابعة لا تُطرح.',
  SUBTRACTED_PERCENTAGE_DIRECTLY: 'طرحت النسبة من القيمة النهائية بدل قسمتها على معامل التغير.',
  APPLIED_PERCENT_TO_ORIGINAL: 'طبّقت النسبة الثانية على القيمة الأصلية بدل القيمة الجديدة.',
  APPLIED_PERCENT_TO_WRONG_TOTAL: 'طبّقت النسبة على مجموع لا يخص هذه المرحلة.',
  REVERSED_ONE_STAGE_ONLY: 'عكست مرحلة واحدة فقط من مرحلتي التغير.',
  TOOK_COMPLEMENT_PERCENT: 'حسبت الباقي بدل النسبة المطلوبة نفسها.',
  USED_SALE_PRICE_AS_DENOMINATOR: 'قسمت على سعر البيع بدل سعر الشراء أو التكلفة.',
  USED_PURCHASE_PRICE_AS_DENOMINATOR: 'قسمت على سعر الشراء بدل التكلفة الكلية التي طلبها السؤال.',
  IGNORED_EXTRA_COST: 'أهملت تكلفة إضافية ذكرها السؤال ضمن التكلفة الكلية.',
  TREATED_PERCENT_AS_AMOUNT: 'تعاملت مع النسبة كأنها مبلغ مباشر.',
  REPORTED_AMOUNT_INSTEAD_OF_PERCENT: 'أعطيت مقدار الربح أو الخسارة بدل نسبته.',

  // --- proportion ---
  REVERSED_DIRECT_PROPORTION: 'عكست اتجاه التناسب المباشر فقسمت حيث يجب الضرب.',
  REVERSED_INVERSE_PROPORTION: 'تعاملت مع التناسب العكسي كأنه مباشر.',
  APPLIED_FRACTION_TO_ORIGINAL: 'طبّقت الكسر على العدد الأصلي بدل الناتج السابق.',
  MULTIPLIED_COUNTS_INSTEAD_OF_RATE: 'ضربت العددين المعطيين ببعضهما بدل استخدام قيمة الوحدة.',
  ADDED_INSTEAD_OF_SCALING: 'جمعت الفرق بدل الضرب في عامل التكبير.',
  FLAT_FEE_PER_UNIT: 'كررت الرسم الثابت مع كل وحدة رغم أنه يُدفع مرة واحدة.',
  DROPPED_FLAT_FEE: 'أسقطت الرسم الثابت من التكلفة الكلية.',

  // --- averages ---
  USED_OLD_AVERAGE: 'أبقيت المتوسط القديم كما هو رغم تغير المجموعة.',
  DIVIDED_BY_OLD_COUNT: 'قسمت المجموع الجديد على العدد القديم.',
  DIVIDED_BY_NEW_COUNT_OLD_SUM: 'قسمت المجموع القديم على العدد الجديد.',
  ADDED_DIFFERENCE_TO_AVERAGE: 'أضفت فرق القيمتين كاملًا إلى المتوسط بدل توزيعه على عدد القيم.',
  USED_TARGET_AS_ANSWER: 'أعدت المتوسط المستهدف بدل القيمة التي تحققه.',

  // --- ages ---
  ANSWERED_OTHER_PERSON: 'حسبت عمر الشخص الآخر بدل الشخص المطلوب.',
  ANSWERED_FUTURE_AGE: 'أعطيت العمر بعد السنوات المذكورة بدل العمر الحالي.',
  ANSWERED_PAST_AGE: 'أعطيت العمر في الماضي بدل العمر الحالي.',
  FORGOT_BOTH_AGES_GROW: 'حركت عمر شخص واحد فقط عبر الزمن، والمجموع يزيد سنتين كل سنة.',
  APPLIED_FUTURE_RATIO_NOW: 'طبّقت النسبة المستقبلية على الأعمار الحالية.',
  USED_AGE_DIFFERENCE_AS_ANSWER: 'أعدت فرق العمرين بدل العمر المطلوب.',
  HALVED_THE_SUM: 'قسمت المجموع على 2 وتجاهلت الفرق بين العمرين.',

  // --- speed ---
  USED_TOTAL_DISTANCE_WITHOUT_DELAY: 'استخدمت المسافة كاملة وتجاهلت ما قُطع أثناء التأخير.',
  DIVIDED_BY_ONE_SPEED: 'قسمت على سرعة طرف واحد بدل السرعة النسبية.',
  USED_ONE_STAGE_TIME: 'أعطيت زمن مرحلة واحدة بدل الزمن الكلي.',
  ADDED_DELAY_TO_ANSWER: 'أضفت مدة التأخير إلى الزمن المطلوب رغم أن السؤال يبدأ من انطلاق الثانية.',
  INVERTED_SPEED_TIME: 'قلبت العلاقة فقسمت السرعة على المسافة.',
  HALF_DISTANCE_AS_ANSWER: 'أعطيت نصف المسافة بدل المسافة الكلية.',

  // --- sequences ---
  APPLIED_PREVIOUS_STEP: 'طبّقت الفرق السابق بدل الفرق التالي في النمط.',
  APPLIED_STEP_TWICE: 'طبّقت خطوة النمط مرتين بدل مرة واحدة.',
  CONTINUED_WRONG_SUBSEQUENCE: 'تابعت السلسلة الخطأ من السلسلتين المتداخلتين.',
  USED_WRONG_OPERATION_IN_ALTERNATION: 'استخدمت العملية الخطأ في دورها من التناوب.',
  APPLIED_OPERATION_IN_REVERSE: 'طبّقت العملية في الاتجاه المعاكس.',
  TREATED_PATTERN_AS_CONSTANT: 'عاملت النمط كأن مقداره ثابت لا يتغير.',

  // --- relational / odd one out ---
  RELATION_REQUIRES_UNSTATED_ASSUMPTION: 'هذا الخيار يحتاج علاقة لم ينص عليها السؤال.',
  RELATION_CONTRADICTS_STATEMENT: 'هذا الخيار يخالف علاقة منصوصة صراحة في السؤال.',
  COUNTED_DIRECT_RELATIONS_ONLY: 'عددت العلاقات المباشرة فقط ولم تكمل الاستنتاج الانتقالي.',
  COUNTED_EVERYONE: 'عددت كل الأشخاص بدل من يثبت تفوقهم على الهدف.',
  RESOLVED_AN_UNRESOLVED_PAIR: 'حسمت زوجًا لا تحسمه المعطيات.',
  SATISFIES_SHARED_PROPERTY: 'هذا العدد يحقق الخاصية المشتركة، فهو ينتمي إلى المجموعة.',

  // --- generic arithmetic-direction errors (must still be derivable) ---
  DIVIDED_INSTEAD_OF_MULTIPLIED: 'قسمت حيث يقتضي الحل الضرب.',
  MULTIPLIED_INSTEAD_OF_DIVIDED: 'ضربت حيث يقتضي الحل القسمة.',
  ADDED_INSTEAD_OF_SUBTRACTED: 'جمعت حيث يقتضي الحل الطرح.',
  SUBTRACTED_INSTEAD_OF_ADDED: 'طرحت حيث يقتضي الحل الجمع.',
  OFF_BY_ONE_STEP: 'زدت أو نقصت خطوة واحدة عن العدد الصحيح من الخطوات.',
  SHIFTED_WRONG_DIRECTION: 'تحركت في الاتجاه المعاكس على محور الزمن.',
  IGNORED_NET_OFFSET: 'استخدمت إحدى الإزاحتين فقط ولم تجمعهما في إزاحة صافية.'
});

export const MISCONCEPTION_IDS = Object.freeze(Object.keys(MISCONCEPTIONS));

export function isKnownMisconception(id) {
  return typeof id === 'string' && id in MISCONCEPTIONS;
}

/**
 * Section 14-F: option-specific feedback, built from the misconception, the
 * question's own numbers and the option the learner actually picked.
 */
export function buildOptionFeedback({optionText, misconceptionId, derivation}) {
  if (!isKnownMisconception(misconceptionId)) return null;
  const head = derivation
    ? `اخترت ${optionText}، وهي ناتج ${derivation}.`
    : `اخترت ${optionText}.`;
  return `${head} ${MISCONCEPTIONS[misconceptionId]}`;
}

/** Used only when a learner's pick matches no modelled path (should be rare). */
export const NEUTRAL_FEEDBACK = 'هذه القيمة لا تطابق أي خطوة صحيحة في مسار الحل؛ أعد الحساب خطوة بخطوة من المعطيات.';

/** Marks the key itself. */
export const CORRECT_FEEDBACK = 'الإجابة الصحيحة.';
