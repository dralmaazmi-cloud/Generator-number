// RC2.3-1. `difficulties` is DERIVED, not written down.
//
// RC2.2 made it a capability rather than an aspiration, which fixed hard
// sessions being scheduled into families that could not build a hard question.
// It was still a second place where a band was asserted, kept in step with the
// family generators by a test.
//
// Now each family lists the templates it can emit and nothing else. The bands it
// can serve follow from the structural adjudication in src/qa/structure.js, so
// the registry cannot claim a capability the adjudication does not support and
// there is nothing left to keep in step. tests/rc23-structure.test.mjs checks the
// other direction — that the ids listed here are exactly the ids the generator
// really produces.
import {capabilityOf} from './qa/structure.js';

export const FAMILY_REGISTRY = [
  {id:'sequences', ar:'المتتاليات العددية', category:'المتتاليات العددية', templates:['SEQ_E_GEO', 'SEQ_E_ARITH', 'SEQ_M_INTERLEAVED', 'SEQ_M_INC_DIFF', 'SEQ_M_ALT_OPS', 'SEQ_M_DOUBLE_DIFF', 'SEQ_H_RECURRENCE', 'SEQ_H_POW_INDEX', 'SEQ_H_ALT_DIV', 'SEQ_H_DIGIT_SUM', 'SEQ_H_INDEX_MULT', 'SEQ_M_LINEAR_RECUR', 'SEQ_M_CYCLE3', 'SEQ_M_PAIR_RULE', 'SEQ_H_DIGIT_PRODUCT', 'SEQ_M_WRONG_TERM', 'SEQ_M_RULE_ID', 'SEQ_M_RULE_APPLY', 'SEQ_M_MISSING_OP', 'SEQ_M_CANDIDATE', 'SEQ_E_NTH_TERM', 'SEQ_E_FIRST_ABOVE', 'SEQ_E_SUM_SHOWN', 'SEQ_E_COUNT_TERMS'], description:'فروق، ضرب وقسمة، تناوب، دورات عمليات، سلاسل متداخلة، حدود مزدوجة، قواعد من الأرقام، وحد مخالف، وتسمية القاعدة أو تطبيقها.'},
  {id:'ratios', ar:'النسب وتقسيم الكميات', category:'النسب وتقسيم الكميات', templates:['RAT_E_KNOWN', 'RAT_E_SPLIT', 'RAT_E_PART_COUNT', 'RAT_E_SHARE_GAP', 'RAT_E_COMMON_FACTOR', 'RAT_M_COMMON_SUM', 'RAT_M_COMMON_DIFF', 'RAT_H_TWO_COMB', 'RAT_M_ADD_SIDE', 'RAT_H_TRANSFER', 'RAT_H_MAX_PART', 'RAT_E_DIFF_SPLIT', 'RAT_E_THREE_WAY', 'RAT_E_TOTAL_FROM_PART', 'RAT_M_TOTAL_FROM_GAP', 'RAT_M_THIRD_FROM_GAP'], description:'توحيد النسب، مجموع وفرق، تغير النسبة، نقل كميات.'},
  {id:'percentages', ar:'النسب المئوية', category:'النسب المئوية', templates:['PCT_E_OF', 'PCT_E_REVERSE_ONE', 'PCT_M_UNIT_PRICE', 'PCT_M_REMAIN', 'PCT_H_CHAIN_VALUE', 'PCT_M_SUCCESSIVE', 'PCT_H_REVERSE_CHAIN', 'PCT_H_MIXTURE', 'PCT_H_TWO_GROUP_CHANGE', 'PCT_E_SHARE_PERCENT', 'PCT_E_WHOLE', 'PCT_E_WHICH_OFFER', 'PCT_E_REMAINING_PERCENT'], description:'زيادة ونقصان، تغيرات متتابعة، استرجاع الأصل.'},
  {id:'averages', ar:'المتوسط الحسابي', category:'المتوسط الحسابي', templates:['AVG_E_ADD', 'AVG_E_REMOVE', 'AVG_M_COMBINE', 'AVG_M_ADD_PAIR', 'AVG_M_REPLACE', 'AVG_H_COMB_ADD', 'AVG_H_TARGET', 'AVG_H_OVERLAP', 'AVG_H_SPLIT_SIZE', 'AVG_E_LIST', 'AVG_E_MISSING_VALUE', 'AVG_E_TOTAL_FROM_MEAN', 'AVG_E_COUNT_FROM_MEAN', 'AVG_E_COMPARE_MEANS', 'AVG_E_RANGE'], description:'إضافة، حذف، استبدال، دمج مجموعات.'},
  {id:'ages', ar:'مسائل الأعمار', category:'مسائل الأعمار', templates:['AGE_E_SUM_DIFF', 'AGE_E_GAP', 'AGE_E_TOTAL_AFTER', 'AGE_E_MULT_DIFF', 'AGE_M_FUT_SUM_DIFF', 'AGE_M_RATIO_FUT_SUM', 'AGE_M_FUT_RATIO', 'AGE_H_TWO_TIME', 'AGE_H_PAST_FUT', 'AGE_M_WHEN_RATIO', 'AGE_H_THREE_SIBLINGS', 'AGE_M_PAST_RATIO', 'AGE_M_DIFFERENCE_INVARIANT', 'AGE_E_RATIO_SUM', 'AGE_E_TIME_SHIFT', 'AGE_E_YEARS_TO_SUM'], description:'مجموع وفرق، نسب عمرية، ماضٍ ومستقبل، ونسبة في الماضي أو فرق ثابت بين زمنين.'},
  {id:'speed', ar:'السرعة والمسافة والزمن', category:'السرعة والمسافة والزمن', templates:['SPD_E_DISTANCE', 'SPD_E_TIME', 'SPD_E_COMPARE', 'SPD_E_REMAINING', 'SPD_E_TOTAL_TRIP', 'SPD_M_AVG', 'SPD_M_TWO_TIME', 'SPD_H_CATCH', 'SPD_H_MEET_DELAY', 'SPD_M_EQUAL_DIST', 'SPD_H_TIME_DIFF', 'SPD_H_CURRENT', 'SPD_H_LEG_SPLIT', 'SPD_E_SPEED', 'SPD_E_UNIT_MINUTES', 'SPD_E_SAME_DIRECTION_GAP'], description:'مراحل، متوسط سرعة، التقاء، لحاق، فرق زمن.'},
  {id:'work_time', ar:'العمال والزمن', category:'العمال والزمن', templates:['WORK_E_VOLUME', 'WORK_E_INVERSE', 'WORK_M_EFF', 'WORK_M_TARGET', 'WORK_M_CHANGE', 'WORK_H_TWO_STAGE', 'WORK_H_WORKERS_EFF', 'WORK_H_JOINT_SOLO', 'WORK_H_EXTRA_WORKERS', 'WORK_H_THREE_PAIRS', 'WORK_H_SOLO_GAP', 'WORK_E_OUTPUT_IN_DAYS', 'WORK_E_REMAINING_DAYS', 'WORK_E_RATE_FROM_TOTAL'], description:'عامل-يوم، تغير عدد العمال، كفاءة وحجم عمل.'},
  {id:'machines', ar:'الآلات والإنتاج', category:'الآلات والإنتاج', templates:['MACH_E_HOURS', 'MACH_E_TOTAL_TWO_TYPES', 'MACH_E_LOST_OUTPUT', 'MACH_E_REQUIRED', 'MACH_M_STOP', 'MACH_M_NEW_FAST', 'MACH_M_SUBSET_UP', 'MACH_H_TWO_TYPES', 'MACH_H_STAGE_UP', 'MACH_H_TWO_CONFIG', 'MACH_H_STOPPAGE_TIME', 'MACH_H_MIN_SECOND_TYPE', 'MACH_E_RATE_FROM_TOTAL', 'MACH_E_TIME_FOR_TARGET', 'MACH_E_COMPARE'], description:'آلة-ساعة، توقف آلة، تغير الإنتاجية، عدد الآلات.'},
  {id:'direct_proportion', ar:'التناسب المباشر', category:'التناسب المباشر البسيط', templates:['PROP_E_ITEMS', 'PROP_E_COST', 'PROP_E_UNIT_VALUE', 'PROP_E_TOTAL_TWO_ITEMS', 'PROP_M_FRAC_UNIT', 'PROP_M_RECIPE', 'PROP_M_MAP', 'PROP_H_COMPOUND', 'PROP_H_COST_PLUS', 'PROP_H_TWO_ITEM_SYSTEM', 'PROP_H_REPLACE', 'PROP_H_CAPITAL_TIME', 'PROP_H_BREAK_EVEN', 'PROP_M_UNIT_PRICE_COMPARE', 'PROP_M_SCALE_ACROSS_HOURS'], description:'تكلفة، وزن، وصفة، مقياس، عدد وحدات.'},
  {id:'fractions', ar:'الكسور المتتابعة', category:'الكسور المتتابعة المباشرة', templates:['FRAC_E_2', 'FRAC_M_3', 'FRAC_H_4', 'FRAC_M_REMAIN', 'FRAC_M_REMAIN_VALUE', 'FRAC_M_START_FROM_REMAINDER', 'FRAC_M_COMPARE_SHARES', 'FRAC_E_PART_OF', 'FRAC_E_REMAINING_FRACTION', 'FRAC_E_COUNT_PARTS'], description:'كسور مباشرة متتابعة من عدد معلوم، والباقي بعد إنفاق كسرين.'},
  {id:'unit_rate', ar:'المعدل الوحدوي', category:'المعدل الوحدوي', templates:['RATE_E_DIRECT', 'RATE_E_TIME', 'RATE_M_SCALE', 'RATE_M_PERCENT', 'RATE_H_TARGET', 'RATE_H_TWO_PHASE', 'RATE_H_RATE_FROM_GAP', 'RATE_M_COMPARE', 'RATE_M_HOURS_FROM_MINUTE_RATE', 'RATE_E_UNIT_PRICE', 'RATE_E_BUDGET_COUNT', 'RATE_E_BETTER_DEAL'], description:'كمية لكل وحدة ثم توسع أو تغير في المعدل.'},
  {id:'combined_rate', ar:'المعدل المشترك', category:'المعدل المشترك', templates:['COMB_E_OUTPUT', 'COMB_E_THREE', 'COMB_E_TIME', 'COMB_M_TOGETHER_SOLO', 'COMB_M_SOLO_THEN', 'COMB_H_STAGED', 'COMB_H_TWO_PUMPS', 'COMB_H_TEAM_SIZE', 'COMB_E_SHARE_OF_OUTPUT', 'COMB_E_TIME_FOR_TARGET', 'COMB_E_ONE_ALONE'], description:'مضخات أو آلات أو أشخاص يعملون معًا أو على مراحل.'},
  {id:'relational', ar:'المقارنة والترتيب العلاقاتي', category:'المقارنة والترتيب العلاقاتي', templates:['REL_E_BETWEEN', 'REL_E_CHAIN', 'REL_M_CHAIN6', 'REL_M_CONFIRM', 'REL_M_BRANCH_UNRES', 'REL_M_COUNT', 'REL_H_COUNT_BRANCHED', 'REL_H_POSITION', 'REL_H_GUARANTEE', 'REL_E_STATEMENT_TRUE', 'REL_E_GAP_CHAIN', 'REL_E_COUNT_BELOW', 'REL_E_FALSE_STATEMENT'], description:'ترتيب كامل، فروع، علاقة غير محسومة، عبارة مؤكدة.'},
  {id:'calendar', ar:'الاستدلال الزمني وأيام الأسبوع', category:'الاستدلال الزمني وأيام الأسبوع', templates:['CAL_E_TOM', 'CAL_E_AFTER', 'CAL_E_DAYS_BETWEEN', 'CAL_E_BEFORE', 'CAL_M_COMPOUND', 'CAL_M_TWO_SHIFT', 'CAL_H_LONG', 'CAL_H_NESTED', 'CAL_H_CYCLE_MEET', 'CAL_H_MONTH_LENGTH', 'CAL_H_OFFSET_CYCLES', 'CAL_M_DATE_WEEKDAY', 'CAL_M_NTH_VISIT'], description:'أمس وغد وبعد غد وتحولات زمنية مركبة.'},
  {id:'odd_one_out', ar:'العدد الذي لا ينتمي', category:'العدد الذي لا ينتمي إلى المجموعة', templates:['ODD_E_MULT', 'ODD_E_SQUARES', 'ODD_M_PRONIC', 'ODD_M_PRIME2', 'ODD_M_CUBES', 'ODD_H_SQ_MINUS', 'ODD_H_TRIANGULAR', 'ODD_M_PROPERTY', 'ODD_M_EXTEND', 'ODD_E_PROPERTY', 'ODD_E_EXTEND', 'ODD_E_COUNT_MATCHING'], description:'مضاعفات، مربعات، مكعبات، أوليات، خصائص عددية، وتسمية الخاصية المشتركة أو ضمّ عدد إليها.'},
  {id:'profit_loss', ar:'الربح والخسارة والأسعار', category:'الربح والخسارة والأسعار', templates:['PL_E_PROFIT', 'PL_E_LOSS', 'PL_E_SELL_PRICE', 'PL_E_COST_FROM_PROFIT', 'PL_E_BETTER_SALE', 'PL_H_REVERSE', 'PL_M_TOTAL_COST', 'PL_M_DISC_MARK', 'PL_H_CHAIN', 'PL_H_TWO_OUTCOMES', 'PL_H_MARKUP_DISCOUNT', 'PL_H_SAME_PRICE_PAIR', 'PL_H_REST_MARGIN'], description:'تكلفة، ربح، خسارة، خصم، سعر بيع، تكلفة كلية.'}
];

for (const f of FAMILY_REGISTRY) f.difficulties = capabilityOf(f.templates);

export const FAMILY_MAP = Object.fromEntries(FAMILY_REGISTRY.map(f => [f.id, f]));

export const FAMILY_ALIASES = {
  random: 'random', all: 'random',
  sequences: 'sequences', sequence: 'sequences', 'المتتاليات العددية':'sequences',
  ratios:'ratios', ratio:'ratios', 'النسب وتقسيم الكميات':'ratios',
  percentages:'percentages', percentage:'percentages', 'النسب المئوية':'percentages',
  averages:'averages', average:'averages', 'المتوسط الحسابي':'averages',
  ages:'ages', age:'ages', 'مسائل الأعمار':'ages',
  speed:'speed', 'السرعة والمسافة والزمن':'speed',
  work_time:'work_time', workers:'work_time', 'العمال والزمن':'work_time',
  machines:'machines', 'الآلات والإنتاج':'machines',
  direct_proportion:'direct_proportion', proportion:'direct_proportion', 'التناسب المباشر البسيط':'direct_proportion',
  fractions:'fractions', 'الكسور المتتابعة المباشرة':'fractions',
  unit_rate:'unit_rate', 'المعدل الوحدوي':'unit_rate',
  combined_rate:'combined_rate', 'المعدل المشترك':'combined_rate',
  relational:'relational', 'المقارنة والترتيب العلاقاتي':'relational',
  calendar:'calendar', 'الاستدلال الزمني وأيام الأسبوع':'calendar',
  odd_one_out:'odd_one_out', 'العدد الذي لا ينتمي إلى المجموعة':'odd_one_out',
  profit_loss:'profit_loss', 'الربح والخسارة والأسعار':'profit_loss'
};
