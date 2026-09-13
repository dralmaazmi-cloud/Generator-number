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
  // RC2-013: an addition is not a transfer, and a stoppage is not an upgrade.
  USED_POST_ADDITION_VALUE: 'استخدمت القيمة بعد الإضافة بدل القيمة قبلها.',
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
  // RC2-013. The three below replace uses of the two situation-named entries
  // above on stems that contain neither a chase nor a meeting. The values are
  // unchanged; what changes is that the sentence now describes the slip the
  // learner actually made in the problem in front of them.
  SUMMED_SPEEDS_OVER_WHOLE_JOURNEY: 'جمعت السرعتين وضربت المجموع في الزمن الكلي، وكل سرعة تخص جزءها من الرحلة وحده.',
  USED_SUM_WHERE_DIFFERENCE_BELONGS: 'استعملت مجموع السرعتين في موضع فرقهما؛ عند ثبات المسافة يرتبط فرق الزمن بفرق السرعتين.',
  USED_ONE_SPEED_WITH_TIME_GAP: 'ضربت إحدى السرعتين في فرق الزمن، وفرق الزمن لا يخص سرعة واحدة بل العلاقة بين السرعتين.',
  USED_SPEED_DIFFERENCE_WITH_TIME_GAP: 'ضربت فرق السرعتين في فرق الزمن، والصحيح قسمة حاصل ضرب السرعتين في فرق الزمن على فرق السرعتين.',
  USED_DIFFERENCE_OF_SPEEDS_IN_MEETING: 'طرحت السرعتين في مسألة التقاء، والصحيح أن تجمعهما.',
  RATE_APPLIED_TO_WRONG_COUNT: 'ضربت المعدل في عدد وحدات غير الذي يخصه.',
  SWAPPED_RATE_AND_COUNT: 'بدّلت بين المعدل وعدد الوحدات في الضرب أو القسمة.',
  // RC2.1-3. Credible near-misses for weighted means. The review found that
  // several averaging templates offered mostly values outside the interval the
  // answer must lie in — a candidate could strike them out without solving. A
  // weight swap lands inside that interval and is a mistake learners actually
  // make, so it competes with the key instead of decorating it.
  SWAPPED_WEIGHTS_IN_WEIGHTED_MEAN: 'بدّلت بين الوزنين، فنسبت كل قيمة إلى وزن الأخرى.',
  WEIGHTED_BY_WRONG_QUANTITY: 'رجّحت المتوسط بالكمية الخطأ: بالمسافة بدل الزمن أو بالعكس.',
  UPGRADED_ALL_INSTEAD_OF_SOME: 'طبّقت التحسين على كل الوحدات رغم أن بعضها فقط تغيّر.',
  IGNORED_UPGRADE: 'تجاهلت التحسين وأبقيت المعدل القديم للجميع.',
  IGNORED_STOPPAGE: 'تجاهلت توقف بعض الآلات وحسبت كأن الجميع عمل طوال الوقت.',
  USED_RATE_BEFORE_CHANGE: 'حسبت بالمعدل قبل تغيّره رغم أن السؤال ينص على تغيّره.',
  USED_COUNT_BEFORE_CHANGE: 'حسبت بعدد العمال أو الآلات قبل تغيّره رغم أن السؤال ينص على تغيّره.',
  USED_ORIGINAL_SCHEDULE: 'حسبت وفق المدة الأصلية رغم أن السؤال يطلب إنهاء ما تبقى في مدة أقصر.',
  // RC2-012. Named slips that replace the key-neighbour padding. Each one is
  // something a learner does to a STEP of the solution, so its value can be
  // derived from the question's own quantities instead of from the answer.
  USED_DIFFERENCE_AS_ANSWER: 'أعطيت مقدار الفرق بين الحدين بدل الحد المطلوب نفسه.',
  MISREAD_THE_STEP: 'قرأت مقدار الخطوة خطأً بوحدة واحدة، فخرج الحد الذي بعدها خطأً.',
  TREATED_AS_GEOMETRIC: 'عاملت المتتالية كأن بين حدودها ضربًا ثابتًا بينما الفرق بينها هو الثابت.',
  TREATED_AS_ARITHMETIC: 'عاملت المتتالية كأن بين حدودها فرقًا ثابتًا بينما النسبة بينها هي الثابتة.',

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

  // RC2.7-4. The slips the widened rule space actually produces. Each names what
  // the learner did, on the quantities in front of them, not a distance from the
  // key: a wrong option here is what one of these mistakes computes.
  IGNORED_THE_OFFSET: 'ضربت في العدد الثابت ونسيت أن تضيف المقدار الثابت بعده.',
  IGNORED_THE_MULTIPLIER: 'أضفت المقدار الثابت ونسيت الضرب الذي يسبقه.',
  APPLIED_THE_STEPS_IN_THE_WRONG_ORDER: 'جمعت قبل أن تضرب، والقاعدة تضرب أولًا ثم تجمع.',
  APPLIED_THE_WRONG_STEP_OF_THE_CYCLE: 'طبّقت خطوة من الدورة في غير موضعها؛ الخطوة المطلوبة هي التي تلي آخر خطوة مطبّقة.',
  CONTINUED_THE_FIRST_RUN_INSTEAD: 'تابعت أوائل الأزواج بدل أن تطبّق قاعدة الزوج على آخرها.',
  CONTINUED_THE_SECOND_RUN_INSTEAD: 'تابعت ثواني الأزواج كأنها سلسلة مستقلة، وهي مرتبطة بأوائلها.',
  APPLIED_THE_RULE_TO_THE_WRONG_TERM: 'طبّقت القاعدة على حد غير الحد المطلوب.',
  USED_DIGIT_SUM_INSTEAD_OF_PRODUCT: 'جمعت أرقام الحد بدل أن تضربها.',
  TERM_OBEYS_THE_RULE: 'اخترت حدًا يتفق مع القاعدة؛ المطلوب هو الحد الوحيد الذي يخالفها.',

  // --- relational / odd one out ---
  RELATION_REQUIRES_UNSTATED_ASSUMPTION: 'هذا الخيار يحتاج علاقة لم ينص عليها السؤال.',
  RELATION_CONTRADICTS_STATEMENT: 'هذا الخيار يخالف علاقة منصوصة صراحة في السؤال.',
  COUNTED_DIRECT_RELATIONS_ONLY: 'عددت العلاقات المباشرة فقط ولم تكمل الاستنتاج الانتقالي.',
  COUNTED_EVERYONE: 'عددت كل الأشخاص بدل من يثبت تفوقهم على الهدف.',
  RESOLVED_AN_UNRESOLVED_PAIR: 'حسمت زوجًا لا تحسمه المعطيات.',
  // RC2.5-5. The two slips a branch-spanning count actually produces: following
  // the one branch the target sits on and stopping there, and collapsing the
  // partial order into a single arrangement and reading the count off it.
  COUNTED_ONE_BRANCH_ONLY: 'تتبعت الفرع الذي يقع فيه الهدف وحده ولم تضم إليه الفرع الآخر.',
  COUNTED_FROM_ONE_ORDERING: 'رتبت الجميع في ترتيب واحد ممكن ثم عددت من سبق الهدف فيه، والمعطيات تسمح بأكثر من ترتيب.',
  MISCOUNTED_THE_CONFIRMED_PATHS: 'أخطأت في عدّ أصحاب المسارات المؤكدة، فزاد العدد أو نقص عن عددهم.',

  // --- RC2.6: the slips the new hard structures actually produce ---
  FORGOT_TO_HALVE_THE_DIFFERENCE: 'وجدت ضعف المقدار المطلوب ثم نسيت قسمته على 2.',
  ASSUMED_EQUAL_SHARES: 'افترضت أن الجزأين متساويان، والمعطيات لا تقول ذلك.',
  USED_ONE_PAIR_AS_THE_WHOLE: 'استخدمت معدل زوج واحد كأنه معدل المجموعة كلها.',
  AVERAGED_THE_PAIRED_TIMES: 'حسبت متوسط الأزمنة المعطاة بدل جمع المعدلات.',
  IGNORED_THE_PARTIAL_LAST_DAY: 'أكملت اليوم الأخير كاملًا رغم أن العمل ينتهي في جزء منه.',
  COUNTED_THE_TURNS_AS_DAYS: 'عددت الأدوار بدل الأيام، والدور الواحد يغطي يومين.',
  REPLACED_FROM_THE_WRONG_BASE: 'حسبت الكمية المستبدلة من الكمية الجديدة بدل الكمية الأصلية.',
  APPLIED_ONE_SCALE_TO_BOTH: 'طبّقت مقياسًا واحدًا على الخريطتين رغم اختلاف مقياسيهما.',
  MARGIN_TAKEN_ON_THE_WRONG_BASE: 'حسبت النسبة من سعر البيع بينما تُحسب من التكلفة، أو العكس.',
  ASSUMED_THE_TWO_CANCEL_OUT: 'افترضت أن ربحًا ونسبة خسارة متساويتين يلغي أحدهما الآخر، وهما محسوبان من أساسين مختلفين.',
  USED_ONE_ANCHOR_ONLY: 'استخدمت أحد التاريخين المعطيين وأهملت الآخر، والشرطان معًا هما ما يحدد الطول.',
  IGNORED_THE_OFFSET_BETWEEN_STARTS: 'اعتمدت المضاعف المشترك للدورتين وأهملت فارق البداية بينهما.',
  SATISFIES_SHARED_PROPERTY: 'هذا العدد يحقق الخاصية المشتركة، فهو ينتمي إلى المجموعة.',

  // --- generic arithmetic-direction errors (must still be derivable) ---
  DIVIDED_INSTEAD_OF_MULTIPLIED: 'قسمت حيث يقتضي الحل الضرب.',
  MULTIPLIED_INSTEAD_OF_DIVIDED: 'ضربت حيث يقتضي الحل القسمة.',
  ADDED_INSTEAD_OF_SUBTRACTED: 'جمعت حيث يقتضي الحل الطرح.',
  SUBTRACTED_INSTEAD_OF_ADDED: 'طرحت حيث يقتضي الحل الجمع.',
  OFF_BY_ONE_STEP: 'زدت أو نقصت خطوة واحدة عن العدد الصحيح من الخطوات.',
  SHIFTED_WRONG_DIRECTION: 'تحركت في الاتجاه المعاكس على محور الزمن.',
  IGNORED_NET_OFFSET: 'استخدمت إحدى الإزاحتين فقط ولم تجمعهما في إزاحة صافية.',

  // --- RC2.4: slips on the reasoning paths the new HARD templates open ---
  //
  // Each of these is a mistake a learner actually makes on a structure that did
  // not exist before this release, so none of them could have been reused from
  // above. They are named for what the learner did, not for the value produced.
  AVERAGED_THE_TWO_CONCENTRATIONS: 'أخذت متوسط التركيزين مباشرة، وهو لا يصح إلا إذا تساوت الكميتان.',
  ANSWERED_THE_OTHER_COMPONENT: 'حسبت كمية المكوّن الآخر بدل المكوّن المطلوب.',
  APPLIED_ONE_CHANGE_TO_THE_WHOLE: 'طبّقت تغير إحدى المجموعتين على المجموع كله.',
  SUBTRACTED_TIMES_INSTEAD_OF_RATES: 'طرحت الزمنين مباشرة، والصحيح أن تطرح المعدلين ثم تعكس الناتج.',
  ADDED_TIMES_INSTEAD_OF_RATES: 'جمعت الزمنين مباشرة، والصحيح أن تجمع المعدلين ثم تعكس الناتج.',
  USED_JOINT_TIME_AS_SOLO: 'استخدمت زمن العمل المشترك على أنه زمن أحد الطرفين وحده.',
  SOLVED_ONE_CONDITION_ONLY: 'استخدمت إحدى الحالتين وأهملت الأخرى، والحالتان معًا هما ما يحدد القيمة.',
  SWAPPED_THE_TWO_UNKNOWNS: 'أوجدت قيمة المجهول الآخر بدل المجهول المطلوب.',
  COUNTED_THE_OVERLAP_TWICE: 'جمعت المجموعتين دون طرح القيمة المشتركة بينهما، فحُسبت مرتين.',
  IGNORED_THE_OVERLAP: 'تعاملت مع المجموعتين كأنهما منفصلتان رغم وجود قيمة مشتركة.',
  USED_THE_GAP_AS_COST: 'استخدمت الفرق بين السعرين على أنه التكلفة نفسها.',
  ADDED_MARKUP_AND_DISCOUNT: 'جمعت نسبة الزيادة ونسبة الخصم بدل ضرب معامليهما.',
  USED_LCM_AS_THE_ANSWER: 'توقفت عند عدد الأيام بين اللقاءين ولم تحوّله إلى يوم من أيام الأسبوع.',
  USED_SUM_OF_CYCLES: 'جمعت طولَي الدورتين بدل إيجاد المضاعف المشترك الأصغر.',
  USED_ONE_CYCLE_ONLY: 'استخدمت إحدى الدورتين وحدها، واللقاء يحتاج أن تكتمل الدورتان معًا.',
  IGNORED_THE_TEAM_CHANGE: 'حسبت المدة كلها بعدد الأفراد الأول وأهملت انضمام فرد جديد.',
  USED_PLANNED_OUTPUT: 'استخدمت الإنتاج المخطط بدل الإنتاج الفعلي.',
  USED_THE_SHORTFALL_AS_TIME: 'استخدمت مقدار النقص في الإنتاج على أنه زمن.',
  USED_SUM_OF_FACTOR_PAIR: 'جمعت عاملَي الحاصل بدل اختيار العامل الذي يمثل المعدل المطلوب.',
  USED_THE_LARGER_FACTOR: 'أخذت المعدل بعد الزيادة بدل المعدل الأصلي.',
  USED_DIGITS_AS_THE_STEP: 'استخدمت أرقام الحد نفسه بدل مجموعها.',
  USED_POSITION_AS_THE_STEP: 'أضفت رقم الموضع بدل الضرب فيه.',
  DIVIDED_TOTAL_BY_PERSON_COUNT: 'قسمت المجموع على عدد الأشخاص وتعاملت مع الناتج كأنه عمر أحدهم.',
  USED_THE_MIDDLE_MEMBER: 'أجبت بعمر الفرد الأوسط بدل الفرد المطلوب.'
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
