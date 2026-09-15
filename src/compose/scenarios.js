// RC2.7-3. The scenario pools.
//
// A scenario is the SITUATION a question is set in, and it is the first of the
// three things the realization layer varies. It is not a synonym list: each
// entry brings its own agents, its own counted things, its own verbs and its
// own unit of measure, so two instances of one template set in two scenarios
// differ in every noun a reader sees and in what is being counted — while the
// mathematics, the oracle and the answer key are untouched.
//
// Every clause a scenario builds goes through the central number/unit formatter
// (`u`, `unitFormat`), never through hand-joined strings, so agreement is
// settled here exactly as it is in a hand-written template. Verbs are written
// per scenario rather than derived: Arabic agreement depends on the agent, and
// a table of agents with a table of verbs is how it stays correct.
//
// `abstract` scenarios preserve the pre-RC2.7 wording. They are kept, and kept
// first in each pool, so no telling the engine could produce before is lost.

import {formatNumberWithUnit, definitePlural, singularOf, displayNumber} from '../arabic/units.js';

const u = (n, unitId, ctx = 'nominative') => formatNumberWithUnit(n, unitId, ctx);
const num = n => displayNumber(n);

// --- aggregate: a collection with a summary statistic ------------------------

/**
 * Slots: `unit` counts the members, `measure` is what is measured on each,
 * `fmtUnit` renders an answer in that measure (null = a bare number).
 */
export const AGGREGATE = Object.freeze([
  {
    key: 'abstract_values', human: false, unit: 'value', measure: null, fmtUnit: null,
    measurePron: 'ها', listPron: 'فيها',
    measureNoun: 'القيمة', measureRel: 'التي', measureAdded: 'قيمة',
    listOf: n => `قائمة من ${u(n, 'value')}`, listDef: 'القائمة',
    middlePhrase: 'القيمة التي تقع في الموضع الأوسط من القائمة',
    countNoun: 'قيمة', groupWord: 'مجموعة',
    memberWord: 'قيمة', membersDef: 'القيم', otherAdj: 'أخرى',
    groupOf: n => u(n, 'value'),
    avgOf: n => `متوسط ${u(n, 'value')}`,
    mval: v => num(v),
    addedIs: v => `أُضيفت قيمة جديدة مقدارها ${num(v)}`,
    removedIs: v => `حُذفت قيمة مقدارها ${num(v)}`,
    replacedIs: (a, b) => `استُبدلت قيمة مقدارها ${num(a)} بقيمة مقدارها ${num(b)}`,
    pairAdded: v => `أُضيفت قيمتان متوسطهما ${num(v)}`
  },
  {
    key: 'exam_scores', human: true, unit: 'student', measure: 'degree', fmtUnit: 'degree',
    measurePron: 'ها', listPron: 'فيه',
    measureNoun: 'الدرجة', measureRel: 'التي', measureAdded: 'درجة',
    listOf: n => `كشف درجات ${u(n, 'student')}`, listDef: 'الكشف',
    middlePhrase: 'درجة الطالب الذي يقع في الموضع الأوسط من الكشف',
    countNoun: 'طالبًا', groupWord: 'شعبة',
    memberWord: 'طالب', membersDef: 'الدرجات', otherAdj: 'آخرين',
    groupOf: n => u(n, 'student'),
    avgOf: n => `متوسط درجات ${u(n, 'student')}`,
    mval: v => u(v, 'degree'),
    // The possessive already names the measure, so the unit word is not
    // repeated after the numeral: «طالب درجته 27», not «27 درجة».
    addedIs: v => `انضم إلى الاختبار طالب درجته ${num(v)}`,
    removedIs: v => `أُلغيت ورقة طالب درجته ${num(v)}`,
    replacedIs: (a, b) => `صُححت ورقة طالب من ${num(a)} إلى ${num(b)}`,
    pairAdded: v => `انضم طالبان متوسط درجتيهما ${num(v)}`
  },
  {
    key: 'warehouse_weights', human: false, unit: 'box', measure: 'kg', fmtUnit: 'kg',
    measurePron: 'ه', listPron: 'فيه',
    measureNoun: 'الوزن', measureRel: 'الذي', measureAdded: 'وزن',
    listOf: n => `سجل أوزان ${u(n, 'box')}`, listDef: 'السجل',
    middlePhrase: 'وزن الصندوق الذي يقع في الموضع الأوسط من السجل',
    countNoun: 'صندوقًا', groupWord: 'رصة',
    memberWord: 'صندوق', membersDef: 'الأوزان', otherAdj: 'أخرى',
    groupOf: n => u(n, 'box'),
    avgOf: n => `متوسط أوزان ${u(n, 'box')}`,
    mval: v => u(v, 'kg'),
    addedIs: v => `أُدخل إلى المستودع صندوق وزنه ${u(v, 'kg')}`,
    removedIs: v => `أُخرج من المستودع صندوق وزنه ${u(v, 'kg')}`,
    replacedIs: (a, b) => `استُبدل صندوق وزنه ${u(a, 'kg')} بصندوق وزنه ${u(b, 'kg')}`,
    pairAdded: v => `أُدخل صندوقان متوسط وزنهما ${u(v, 'kg')}`
  },
  {
    key: 'workshop_lengths', human: false, unit: 'panel', measure: 'meter', fmtUnit: 'meter',
    measurePron: 'ه', listPron: 'فيه',
    measureNoun: 'الطول', measureRel: 'الذي', measureAdded: 'طول',
    listOf: n => `سجل أطوال ${u(n, 'panel')}`, listDef: 'السجل',
    middlePhrase: 'طول اللوح الذي يقع في الموضع الأوسط من السجل',
    countNoun: 'لوحًا', groupWord: 'حزمة',
    memberWord: 'لوح', membersDef: 'الأطوال', otherAdj: 'أخرى',
    groupOf: n => u(n, 'panel'),
    avgOf: n => `متوسط أطوال ${u(n, 'panel')}`,
    mval: v => u(v, 'meter'),
    addedIs: v => `أُضيف لوح طوله ${u(v, 'meter')}`,
    removedIs: v => `سُحب لوح طوله ${u(v, 'meter')}`,
    replacedIs: (a, b) => `استُبدل لوح طوله ${u(a, 'meter')} بلوح طوله ${u(b, 'meter')}`,
    pairAdded: v => `أُضيف لوحان متوسط طولهما ${u(v, 'meter')}`
  },
  {
    key: 'library_pages', human: false, unit: 'book', measure: 'page', fmtUnit: 'page',
    measurePron: 'ه', listPron: 'فيه',
    measureNoun: 'عدد الصفحات', measureRel: 'الذي', measureAdded: 'عدد صفحات',
    listOf: n => `سجل عدد صفحات ${u(n, 'book')}`, listDef: 'السجل',
    middlePhrase: 'عدد صفحات الكتاب الذي يقع في الموضع الأوسط من السجل',
    countNoun: 'كتابًا', groupWord: 'رف',
    memberWord: 'كتاب', membersDef: 'الصفحات', otherAdj: 'أخرى',
    groupOf: n => u(n, 'book'),
    avgOf: n => `متوسط عدد صفحات ${u(n, 'book')}`,
    mval: v => u(v, 'page'),
    addedIs: v => `أُضيف إلى الرف كتاب عدد صفحاته ${num(v)}`,
    removedIs: v => `أُخرج من الرف كتاب عدد صفحاته ${num(v)}`,
    replacedIs: (a, b) => `استُبدل كتاب عدد صفحاته ${num(a)} بكتاب عدد صفحاته ${num(b)}`,
    pairAdded: v => `أُضيف كتابان متوسط عدد صفحاتهما ${num(v)}`
  },
  {
    key: 'nursery_heights', human: false, unit: 'seedling', measure: 'cm', fmtUnit: 'cm',
    measurePron: 'ه', listPron: 'فيه',
    measureNoun: 'الطول', measureRel: 'الذي', measureAdded: 'طول',
    listOf: n => `سجل أطوال ${u(n, 'seedling')}`, listDef: 'السجل',
    middlePhrase: 'طول الشتلة التي تقع في الموضع الأوسط من السجل',
    countNoun: 'شتلة', groupWord: 'حوض',
    memberWord: 'شتلة', membersDef: 'الأطوال', otherAdj: 'أخرى',
    groupOf: n => u(n, 'seedling'),
    avgOf: n => `متوسط أطوال ${u(n, 'seedling')}`,
    mval: v => u(v, 'cm'),
    addedIs: v => `أُضيفت شتلة طولها ${u(v, 'cm')}`,
    removedIs: v => `نُقلت شتلة طولها ${u(v, 'cm')}`,
    replacedIs: (a, b) => `استُبدلت شتلة طولها ${u(a, 'cm')} بشتلة طولها ${u(b, 'cm')}`,
    pairAdded: v => `أُضيفت شتلتان متوسط طولهما ${u(v, 'cm')}`
  },
  {
    key: 'daily_visitors', human: false, unit: 'day', measure: 'visitor', fmtUnit: 'visitor',
    measurePron: 'ه', listPron: 'فيه',
    measureNoun: 'عدد الزوار', measureRel: 'الذي', measureAdded: 'عدد زوار',
    listOf: n => `سجل عدد الزوار في ${u(n, 'day')}`, listDef: 'السجل',
    middlePhrase: 'عدد زوار اليوم الذي يقع في الموضع الأوسط من السجل',
    countNoun: 'يومًا', groupWord: 'فترة',
    memberWord: 'يوم', membersDef: 'أعداد الزوار', otherAdj: 'أخرى',
    groupOf: n => u(n, 'day'),
    avgOf: n => `متوسط عدد الزوار في ${u(n, 'day')}`,
    mval: v => u(v, 'visitor'),
    addedIs: v => `أُضيف يوم عدد زواره ${num(v)}`,
    removedIs: v => `استُبعد يوم عدد زواره ${num(v)}`,
    replacedIs: (a, b) => `صُحح يوم من ${num(a)} إلى ${num(b)}`,
    pairAdded: v => `أُضيف يومان متوسط عدد زوارهما ${num(v)}`
  }
]);

/**
 * Arabic subject agreement for a plural subject.
 *
 * A plural of non-human things agrees as a feminine singular — «الألواح قُسمت»,
 * never «قُسموا» — while a plural of people takes the sound masculine plural.
 * Which one a scene is, the scene says; templates ask rather than write one
 * form and hope every scenario happens to fit it, which is how «قُسموا» came to
 * be said of boards, seedlings and books.
 */
export const pluralVerb = (scene, {nonHuman, human}) => (scene?.human ? human : nonHuman);

/** «متوسط درجات 6 طلاب آخرين» — the second group of a combine. */
export const avgOfOther = (sc, n) => `${sc.avgOf(n)} ${sc.otherAdj}`;

// --- production: an agent turning time into countable output -----------------

export const PRODUCTION = Object.freeze([
  {key: 'abstract_pieces', out: 'piece', rateUnitId: 'piecePerHour', rateWord: 'قطعة/ساعة', rateWordMinute: 'قطعة/دقيقة',
    site: 'مصنع', outDef: 'القطع', verb: 'تنتج'},
  {key: 'press_pages', out: 'page', rateUnitId: 'pagePerHour', rateWord: 'صفحة/ساعة', rateWordMinute: 'صفحة/دقيقة',
    site: 'مطبعة', outDef: 'الصفحات', verb: 'تطبع'},
  {key: 'bakery_loaves', out: 'loaf', rateUnitId: 'loafPerHour', rateWord: 'رغيف/ساعة', rateWordMinute: 'رغيف/دقيقة',
    site: 'مخبز', outDef: 'الأرغفة', verb: 'تخبز'},
  {key: 'dairy_bottles', out: 'bottle', rateUnitId: 'bottlePerHour', rateWord: 'زجاجة/ساعة', rateWordMinute: 'زجاجة/دقيقة',
    site: 'معمل ألبان', outDef: 'الزجاجات', verb: 'تعبئ'},
  {key: 'textile_shirts', out: 'shirt', rateUnitId: 'shirtPerHour', rateWord: 'قميص/ساعة', rateWordMinute: 'قميص/دقيقة',
    site: 'مشغل خياطة', outDef: 'القمصان', verb: 'تخيط'},
  {key: 'cannery_cans', out: 'can', rateUnitId: 'canPerHour', rateWord: 'علبة/ساعة', rateWordMinute: 'علبة/دقيقة',
    site: 'مصنع تعليب', outDef: 'العلب', verb: 'تملأ'},
  {key: 'solar_panels', out: 'panel', rateUnitId: 'panelPerHour', rateWord: 'لوح/ساعة', rateWordMinute: 'لوح/دقيقة',
    site: 'مصنع ألواح', outDef: 'الألواح', verb: 'تجمع'},
  {key: 'abstract_units', out: 'unit', rateUnitId: 'unitPerHour', rateWord: 'وحدة/ساعة', rateWordMinute: 'وحدة/دقيقة',
    site: 'منشأة', outDef: 'الوحدات', verb: 'تنجز'}
]);

// --- trade: a cost and a selling price ---------------------------------------

export const TRADE = Object.freeze([
  // `good` is masculine or feminine per entry, and everything that has to agree
  // with it is stored rather than derived: `pron` is the object suffix (باعه vs
  // باعها) and `passT` the feminine marker on a passive verb (بيع vs بيعت). A
  // table that cannot produce wrong agreement is better than one that can and
  // relies on being used carefully.
  {key: 'general_store', good: 'سلعة', goodDef: 'السلعة', goodPair: 'سلعتين', seller: 'متجر', sellerDef: 'المتجر',
    paid: 'دفع',
    goodNom: 'سلعة', placed: 'وضع متجر',
    pron: 'ها', passT: 'ت',
    bought: 'اشترى متجر', sold: 'باع المتجر', soldPair: 'باع متجر'},
  {key: 'bookshop', good: 'كتابًا', goodDef: 'الكتاب', goodPair: 'كتابين', seller: 'مكتبة', sellerDef: 'المكتبة', sellerFeminine: true,
    paid: 'دفعت',
    goodNom: 'كتاب', placed: 'وضعت مكتبة',
    pron: 'ه', passT: '',
    bought: 'اشترت مكتبة', sold: 'باعت المكتبة', soldPair: 'باعت مكتبة'},
  {key: 'nursery', good: 'شتلة', goodDef: 'الشتلة', goodPair: 'شتلتين', seller: 'مشتل', sellerDef: 'المشتل',
    paid: 'دفع',
    goodNom: 'شتلة', placed: 'وضع مشتل',
    pron: 'ها', passT: 'ت',
    bought: 'اشترى مشتل', sold: 'باع المشتل', soldPair: 'باع مشتل'},
  {key: 'furniture', good: 'مقعدًا', goodDef: 'المقعد', goodPair: 'مقعدين', seller: 'معرض أثاث', sellerDef: 'المعرض',
    paid: 'دفع',
    goodNom: 'مقعد', placed: 'وضع معرض أثاث',
    pron: 'ه', passT: '',
    bought: 'اشترى معرض أثاث', sold: 'باع المعرض', soldPair: 'باع معرض أثاث'},
  {key: 'garment', good: 'قميصًا', goodDef: 'القميص', goodPair: 'قميصين', seller: 'متجر ملابس', sellerDef: 'المتجر',
    paid: 'دفع',
    goodNom: 'قميص', placed: 'وضع متجر ملابس',
    pron: 'ه', passT: '',
    bought: 'اشترى متجر ملابس', sold: 'باع المتجر', soldPair: 'باع متجر ملابس'},
  {key: 'electronics', good: 'جهازًا', goodDef: 'الجهاز', goodPair: 'جهازين', seller: 'محل إلكترونيات', sellerDef: 'المحل',
    paid: 'دفع',
    goodNom: 'جهاز', placed: 'وضع محل إلكترونيات',
    pron: 'ه', passT: '',
    bought: 'اشترى محل إلكترونيات', sold: 'باع المحل', soldPair: 'باع محل إلكترونيات'}
]);

// --- journey: a mover, a distance and a speed --------------------------------

export const JOURNEY = Object.freeze([
  // Every mover here is grammatically FEMININE. The family's verbs — انطلقت،
  // قطعت، تلتقي — already agree that way, and a masculine mover would need each
  // of them rewritten per instance; a table that cannot produce wrong agreement
  // is better than one that can and relies on being used carefully.
  // RC2.9.3-4. `speeds` is the range, in km/h, a reader accepts for the
  // vehicle. A speed template draws its numbers first and then asks for a
  // scene that fits them (see `fitJourneyScene`), so a bicycle no longer does
  // 90 km/h and a ferry no longer does 120. The bicycle became a motorbike:
  // every speed pool in the family starts at 30 km/h and a bicycle fits none.
  {key: 'car', one: 'سيارة', def: 'السيارة', dual: 'السيارتان', distUnit: 'km', speedWord: 'كم/ساعة', speeds: [20, 150]},
  {key: 'bus', one: 'حافلة', def: 'الحافلة', dual: 'الحافلتان', distUnit: 'km', speedWord: 'كم/ساعة', speeds: [20, 110]},
  {key: 'truck', one: 'شاحنة', def: 'الشاحنة', dual: 'الشاحنتان', distUnit: 'km', speedWord: 'كم/ساعة', speeds: [20, 100]},
  {key: 'motorbike', one: 'دراجة نارية', def: 'الدراجة النارية', dual: 'الدراجتان الناريتان', distUnit: 'km', speedWord: 'كم/ساعة', speeds: [20, 150]},
  {key: 'ferry', one: 'عبّارة', def: 'العبّارة', dual: 'العبّارتان', distUnit: 'km', speedWord: 'كم/ساعة', speeds: [20, 60]},
  {key: 'minibus', one: 'مركبة', def: 'المركبة', dual: 'المركبتان', distUnit: 'km', speedWord: 'كم/ساعة', speeds: [20, 110]},
  {key: 'tram', one: 'عربة', def: 'العربة', dual: 'العربتان', distUnit: 'km', speedWord: 'كم/ساعة', speeds: [20, 70]}
]);

// --- population: a quantity that changes by a percentage ---------------------

export const POPULATION = Object.freeze([
  {key: 'abstract_group', subjIndef: 'مجموعة', subjDef: 'المجموعة', countUnit: 'person', g: 'f',
    countWord: 'عدد أفراد المجموعة'},
  {key: 'museum_visitors', subjIndef: 'متحف', subjDef: 'المتحف', countUnit: 'visitor', g: 'm',
    countWord: 'عدد زوار المتحف'},
  {key: 'school_students', subjIndef: 'مدرسة', subjDef: 'المدرسة', countUnit: 'student', g: 'f',
    countWord: 'عدد طلاب المدرسة'},
  {key: 'club_members', subjIndef: 'نادٍ', subjDef: 'النادي', countUnit: 'person', g: 'm',
    countWord: 'عدد أعضاء النادي'},
  {key: 'orchard_trees', subjIndef: 'بستان', subjDef: 'البستان', countUnit: 'tree', g: 'm',
    countWord: 'عدد أشجار البستان'},
  {key: 'depot_orders', subjIndef: 'مستودع', subjDef: 'المستودع', countUnit: 'order', g: 'm',
    countWord: 'عدد طلبات المستودع'}
]);

// --- catalogue: a price or a quantity that scales ----------------------------

export const CATALOGUE = Object.freeze([
  {key: 'abstract_items', itemUnit: 'item', place: 'متجر', priceUnit: 'dirham', itemsDef: 'العناصر'},
  {key: 'stationery', itemUnit: 'book', place: 'مكتبة', priceUnit: 'dirham', itemsDef: 'الكتب'},
  {key: 'grocery', itemUnit: 'can', place: 'بقالة', priceUnit: 'dirham', itemsDef: 'العلب'},
  {key: 'hardware', itemUnit: 'panel', place: 'متجر أدوات', priceUnit: 'dirham', itemsDef: 'الألواح'},
  {key: 'garden_centre', itemUnit: 'seedling', place: 'مشتل', priceUnit: 'dirham', itemsDef: 'الشتلات'},
  {key: 'ticketing', itemUnit: 'card', place: 'مركز حجز', priceUnit: 'dirham', itemsDef: 'البطاقات'}
]);

// --- split: one quantity divided between two parties -------------------------

export const SPLIT = Object.freeze([
  {key: 'abstract_amount', thing: 'unit', partyA: 'الأول', partyB: 'الثاني', holder: 'مجموعة', thingsDef: 'الوحدات'},
  {key: 'two_teams', thing: 'point', partyA: 'الفريق الأول', partyB: 'الفريق الثاني', holder: 'بطولة', thingsDef: 'النقاط'},
  {key: 'two_depots', thing: 'box', partyA: 'المستودع الأول', partyB: 'المستودع الثاني', holder: 'شركة', thingsDef: 'الصناديق'},
  {key: 'two_shelves', thing: 'book', partyA: 'الرف الأول', partyB: 'الرف الثاني', holder: 'مكتبة', thingsDef: 'الكتب'},
  {key: 'two_plots', thing: 'tree', partyA: 'الحقل الأول', partyB: 'الحقل الثاني', holder: 'مزرعة', thingsDef: 'الأشجار'},
  {key: 'two_lines', thing: 'can', partyA: 'الخط الأول', partyB: 'الخط الثاني', holder: 'مصنع', thingsDef: 'العلب'}
]);

/** Every pool, by frame name, so the inventory can enumerate them. */
export const POOLS = Object.freeze({
  aggregate: AGGREGATE, production: PRODUCTION, trade: TRADE,
  journey: JOURNEY, population: POPULATION, catalogue: CATALOGUE, split: SPLIT
});

/**
 * Choose a scenario. The choice is a pure function of the seeded RNG and never
 * of the answer — §2 of the RC2.3 brief, which this layer must not weaken.
 */
export function pickScenario(rng, frame) {
  const pool = POOLS[frame];
  if (!pool) throw Object.assign(new Error(`UNKNOWN_SCENARIO_FRAME:${frame}`), {code: 'UNKNOWN_SCENARIO_FRAME'});
  return rng.pick(pool);
}

export const scenarioKeys = frame => (POOLS[frame] ?? []).map(s => s.key);

/**
 * RC2.9.3-4. The journey scene for a set of speeds. The scene already drawn is
 * kept when every speed lies in its range; otherwise one that fits is drawn
 * from its own fork, so the parameter draw beneath is untouched either way.
 */
export function fitJourneyScene(rng, scene, speeds) {
  const fits = s => !s.speeds || speeds.every(v => v >= s.speeds[0] && v <= s.speeds[1]);
  if (fits(scene)) return scene;
  const candidates = POOLS.journey.filter(fits);
  return candidates.length ? rng.fork('scenario-fit').pick(candidates) : scene;
}
