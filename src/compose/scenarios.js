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
    key: 'abstract_values', unit: 'value', measure: null, fmtUnit: null,
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
    key: 'exam_scores', unit: 'student', measure: 'degree', fmtUnit: 'degree',
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
    key: 'warehouse_weights', unit: 'box', measure: 'kg', fmtUnit: 'kg',
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
    key: 'workshop_lengths', unit: 'panel', measure: 'meter', fmtUnit: 'meter',
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
    key: 'library_pages', unit: 'book', measure: 'page', fmtUnit: 'page',
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
    key: 'nursery_heights', unit: 'seedling', measure: 'cm', fmtUnit: 'cm',
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
    key: 'daily_visitors', unit: 'day', measure: 'visitor', fmtUnit: 'visitor',
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

/** «متوسط درجات 6 طلاب آخرين» — the second group of a combine. */
export const avgOfOther = (sc, n) => `${sc.avgOf(n)} ${sc.otherAdj}`;

// --- production: an agent turning time into countable output -----------------

export const PRODUCTION = Object.freeze([
  {
    key: 'abstract_machines', producer: 'machine', out: 'piece', time: 'hour',
    rateUnit: 'piecePerHour', site: 'مصنع',
    produce: (m, q, t) => `تنتج ${u(m, 'machine')} متطابقة في الإنتاجية ${u(q, 'piece')} خلال ${u(t, 'hour')}`,
    producersDef: 'الآلات', outDef: 'القطع', verbPresent: 'تنتج'
  },
  {
    key: 'press_pages', producer: 'machine', out: 'page', time: 'hour',
    rateUnit: 'pagePerHour', site: 'مطبعة',
    produce: (m, q, t) => `تطبع ${u(m, 'machine')} متطابقة في مطبعة ${u(q, 'page')} خلال ${u(t, 'hour')}`,
    producersDef: 'الآلات', outDef: 'الصفحات', verbPresent: 'تطبع'
  },
  {
    key: 'bakery_loaves', producer: 'device', out: 'loaf', time: 'hour',
    rateUnit: 'loafPerHour', site: 'مخبز',
    produce: (m, q, t) => `ينتج ${u(m, 'device')} متطابقة في مخبز ${u(q, 'loaf')} خلال ${u(t, 'hour')}`,
    producersDef: 'الأجهزة', outDef: 'الأرغفة', verbPresent: 'ينتج'
  },
  {
    key: 'dairy_bottles', producer: 'machine', out: 'bottle', time: 'hour',
    rateUnit: 'bottlePerHour', site: 'معمل ألبان',
    produce: (m, q, t) => `تعبئ ${u(m, 'machine')} متطابقة في معمل ألبان ${u(q, 'bottle')} خلال ${u(t, 'hour')}`,
    producersDef: 'الآلات', outDef: 'الزجاجات', verbPresent: 'تعبئ'
  },
  {
    key: 'textile_shirts', producer: 'machine', out: 'shirt', time: 'hour',
    rateUnit: 'shirtPerHour', site: 'مشغل خياطة',
    produce: (m, q, t) => `تخيط ${u(m, 'machine')} متطابقة في مشغل ${u(q, 'shirt')} خلال ${u(t, 'hour')}`,
    producersDef: 'الآلات', outDef: 'القمصان', verbPresent: 'تخيط'
  },
  {
    key: 'cannery_cans', producer: 'device', out: 'can', time: 'hour',
    rateUnit: 'canPerHour', site: 'مصنع تعليب',
    produce: (m, q, t) => `يملأ ${u(m, 'device')} متطابقة في مصنع تعليب ${u(q, 'can')} خلال ${u(t, 'hour')}`,
    producersDef: 'الأجهزة', outDef: 'العلب', verbPresent: 'يملأ'
  },
  {
    key: 'solar_panels', producer: 'machine', out: 'panel', time: 'hour',
    rateUnit: 'panelPerHour', site: 'مصنع ألواح',
    produce: (m, q, t) => `تجمع ${u(m, 'machine')} متطابقة في مصنع ${u(q, 'panel')} خلال ${u(t, 'hour')}`,
    producersDef: 'الآلات', outDef: 'الألواح', verbPresent: 'تجمع'
  }
]);

// --- trade: a cost and a selling price ---------------------------------------

export const TRADE = Object.freeze([
  {
    key: 'abstract_goods', goodIndef: 'سلعة', goodDef: 'السلعة', g: 'f',
    buyer: 'متجر', bought: 'اشترى متجر', sold: 'باع المتجر',
    unitId: 'dirham'
  },
  {
    key: 'bookshop', goodIndef: 'كتاب', goodDef: 'الكتاب', g: 'm',
    buyer: 'مكتبة', bought: 'اشترت مكتبة', sold: 'باعت المكتبة',
    unitId: 'dirham'
  },
  {
    key: 'nursery', goodIndef: 'شتلة', goodDef: 'الشتلة', g: 'f',
    buyer: 'مشتل', bought: 'اشترى مشتل', sold: 'باع المشتل',
    unitId: 'dirham'
  },
  {
    key: 'furniture', goodIndef: 'مقعد', goodDef: 'المقعد', g: 'm',
    buyer: 'معرض أثاث', bought: 'اشترى معرض أثاث', sold: 'باع المعرض',
    unitId: 'dirham'
  },
  {
    key: 'garment', goodIndef: 'قميص', goodDef: 'القميص', g: 'm',
    buyer: 'متجر ملابس', bought: 'اشترى متجر ملابس', sold: 'باع المتجر',
    unitId: 'dirham'
  },
  {
    key: 'electronics', goodIndef: 'جهاز', goodDef: 'الجهاز', g: 'm',
    buyer: 'محل إلكترونيات', bought: 'اشترى محل إلكترونيات', sold: 'باع المحل',
    unitId: 'dirham'
  }
]);

// --- journey: a mover, a distance and a speed --------------------------------

export const JOURNEY = Object.freeze([
  {
    key: 'abstract_car', moverIndef: 'سيارة', moverDef: 'السيارة', g: 'f',
    set: 'انطلقت سيارة', went: 'قطعت السيارة', distUnit: 'km', speedUnit: 'kmPerHour'
  },
  {
    key: 'bus_route', moverIndef: 'حافلة', moverDef: 'الحافلة', g: 'f',
    set: 'انطلقت حافلة', went: 'قطعت الحافلة', distUnit: 'km', speedUnit: 'kmPerHour'
  },
  {
    key: 'freight_train', moverIndef: 'قطار', moverDef: 'القطار', g: 'm',
    set: 'انطلق قطار', went: 'قطع القطار', distUnit: 'km', speedUnit: 'kmPerHour'
  },
  {
    key: 'delivery_truck', moverIndef: 'شاحنة', moverDef: 'الشاحنة', g: 'f',
    set: 'انطلقت شاحنة', went: 'قطعت الشاحنة', distUnit: 'km', speedUnit: 'kmPerHour'
  },
  {
    key: 'cyclist', moverIndef: 'دراجة', moverDef: 'الدراجة', g: 'f',
    set: 'انطلقت دراجة', went: 'قطعت الدراجة', distUnit: 'km', speedUnit: 'kmPerHour'
  },
  {
    key: 'ferry', moverIndef: 'عبّارة', moverDef: 'العبّارة', g: 'f',
    set: 'انطلقت عبّارة', went: 'قطعت العبّارة', distUnit: 'km', speedUnit: 'kmPerHour'
  }
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
