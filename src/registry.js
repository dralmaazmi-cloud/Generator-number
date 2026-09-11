export const FAMILY_REGISTRY = [
  {id:'sequences', ar:'المتتاليات العددية', category:'المتتاليات العددية', difficulties:['easy','medium','hard'], description:'فروق، ضرب وقسمة، تناوب، سلاسل متداخلة، أنماط متقدمة.'},
  {id:'ratios', ar:'النسب وتقسيم الكميات', category:'النسب وتقسيم الكميات', difficulties:['easy','medium','hard'], description:'توحيد النسب، مجموع وفرق، تغير النسبة، نقل كميات.'},
  {id:'percentages', ar:'النسب المئوية', category:'النسب المئوية', difficulties:['easy','medium','hard'], description:'زيادة ونقصان، تغيرات متتابعة، استرجاع الأصل.'},
  {id:'averages', ar:'المتوسط الحسابي', category:'المتوسط الحسابي', difficulties:['easy','medium','hard'], description:'إضافة، حذف، استبدال، دمج مجموعات.'},
  {id:'ages', ar:'مسائل الأعمار', category:'مسائل الأعمار', difficulties:['easy','medium','hard'], description:'مجموع وفرق، نسب عمرية، ماضٍ ومستقبل.'},
  {id:'speed', ar:'السرعة والمسافة والزمن', category:'السرعة والمسافة والزمن', difficulties:['easy','medium','hard'], description:'مراحل، متوسط سرعة، التقاء، لحاق، فرق زمن.'},
  {id:'work_time', ar:'العمال والزمن', category:'العمال والزمن', difficulties:['easy','medium','hard'], description:'عامل-يوم، تغير عدد العمال، كفاءة وحجم عمل.'},
  {id:'machines', ar:'الآلات والإنتاج', category:'الآلات والإنتاج', difficulties:['easy','medium','hard'], description:'آلة-ساعة، توقف آلة، تغير الإنتاجية، عدد الآلات.'},
  {id:'direct_proportion', ar:'التناسب المباشر', category:'التناسب المباشر البسيط', difficulties:['easy','medium','hard'], description:'تكلفة، وزن، وصفة، مقياس، عدد وحدات.'},
  {id:'fractions', ar:'الكسور المتتابعة', category:'الكسور المتتابعة المباشرة', difficulties:['easy','medium','hard'], description:'كسور مباشرة متتابعة من عدد معلوم دون مسائل الباقي.'},
  {id:'unit_rate', ar:'المعدل الوحدوي', category:'المعدل الوحدوي', difficulties:['easy','medium','hard'], description:'كمية لكل وحدة ثم توسع أو تغير في المعدل.'},
  {id:'combined_rate', ar:'المعدل المشترك', category:'المعدل المشترك', difficulties:['easy','medium','hard'], description:'مضخات أو آلات أو أشخاص يعملون معًا أو على مراحل.'},
  {id:'relational', ar:'المقارنة والترتيب العلاقاتي', category:'المقارنة والترتيب العلاقاتي', difficulties:['easy','medium','hard'], description:'ترتيب كامل، فروع، علاقة غير محسومة، عبارة مؤكدة.'},
  {id:'calendar', ar:'الاستدلال الزمني وأيام الأسبوع', category:'الاستدلال الزمني وأيام الأسبوع', difficulties:['easy','medium','hard'], description:'أمس وغد وبعد غد وتحولات زمنية مركبة.'},
  {id:'odd_one_out', ar:'العدد الذي لا ينتمي', category:'العدد الذي لا ينتمي إلى المجموعة', difficulties:['easy','medium','hard'], description:'مضاعفات، مربعات، مكعبات، أوليات، خصائص عددية.'},
  {id:'profit_loss', ar:'الربح والخسارة والأسعار', category:'الربح والخسارة والأسعار', difficulties:['easy','medium','hard'], description:'تكلفة، ربح، خسارة، خصم، سعر بيع، تكلفة كلية.'}
];

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
