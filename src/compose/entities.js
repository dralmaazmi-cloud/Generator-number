// RC2.7-3. The entity pools.
//
// Before RC2.7 the generator drew from twenty-four personal names and nothing
// else, and eighteen of the twenty-four actually appeared: every stem that
// named anyone named a person, and a session of fifty met the same handful
// repeatedly. That is a perceptual repetition even when every question behind
// it is mathematically distinct.
//
// Two things widen here. The personal pool roughly doubles and is declared with
// grammatical gender, so a verb or adjective agreeing with a name stays correct
// when the name changes. And personal names stop being the only kind of entity:
// organisations, sites and devices are entities too, and a question set in a
// bakery with no person in it is a genuinely different reading experience from
// one about خالد and سالم.
//
// Gender is declared rather than guessed. Arabic agreement is not recoverable
// from a name's spelling — رشا and سامي end alike and differ in gender — so a
// heuristic here would produce wrong Arabic in exactly the cases that matter.

/** Personal names, each with the gender its verbs and adjectives must agree with. */
export const PERSONS = Object.freeze([
  {w: 'خالد', g: 'm'}, {w: 'سالم', g: 'm'}, {w: 'ماجد', g: 'm'}, {w: 'راشد', g: 'm'},
  {w: 'ناصر', g: 'm'}, {w: 'فهد', g: 'm'}, {w: 'علي', g: 'm'}, {w: 'بدر', g: 'm'},
  {w: 'حمد', g: 'm'}, {w: 'سامي', g: 'm'}, {w: 'أحمد', g: 'm'}, {w: 'محمد', g: 'm'},
  {w: 'عمر', g: 'm'}, {w: 'يوسف', g: 'm'}, {w: 'طارق', g: 'm'}, {w: 'زياد', g: 'm'},
  {w: 'مروان', g: 'm'}, {w: 'وليد', g: 'm'}, {w: 'سيف', g: 'm'}, {w: 'إياد', g: 'm'},
  {w: 'رامي', g: 'm'}, {w: 'أنس', g: 'm'}, {w: 'باسل', g: 'm'}, {w: 'كريم', g: 'm'},
  {w: 'نورة', g: 'f'}, {w: 'سارة', g: 'f'}, {w: 'هند', g: 'f'}, {w: 'ريم', g: 'f'},
  {w: 'ليان', g: 'f'}, {w: 'مريم', g: 'f'}, {w: 'ليلى', g: 'f'}, {w: 'فاطمة', g: 'f'},
  {w: 'عائشة', g: 'f'}, {w: 'زينب', g: 'f'}, {w: 'رشا', g: 'f'}, {w: 'دانة', g: 'f'},
  {w: 'شيماء', g: 'f'}, {w: 'سلمى', g: 'f'}, {w: 'جواهر', g: 'f'}, {w: 'أروى', g: 'f'},
  {w: 'لمياء', g: 'f'}, {w: 'بشرى', g: 'f'}, {w: 'نجلاء', g: 'f'}, {w: 'وفاء', g: 'f'},
  {w: 'عبير', g: 'f'}, {w: 'أمل', g: 'f'}, {w: 'رغد', g: 'f'}, {w: 'خلود', g: 'f'}
]);

/** Just the words, for the stem-skeleton mask and for legacy call sites. */
export const NAME_POOL = Object.freeze(PERSONS.map(p => p.w));

/** Organisations and sites a question can be set in, with no person named. */
export const SITES = Object.freeze([
  'مصنع', 'مطبعة', 'مخبز', 'ورشة', 'مشتل', 'مستودع', 'مكتبة', 'متحف',
  'مدرسة', 'بستان', 'معمل ألبان', 'مصنع تعليب', 'مشغل خياطة', 'مصنع ألواح',
  'متجر', 'بقالة', 'معرض أثاث', 'محل إلكترونيات', 'مركز حجز', 'متجر أدوات',
  'مزرعة', 'شركة', 'نادٍ', 'مطار', 'ميناء', 'مختبر'
]);

/** Devices and vehicles that can act without an owner being named. */
export const APPARATUS = Object.freeze([
  'آلة', 'جهاز', 'مضخة', 'طابعة', 'سيارة', 'حافلة', 'قطار', 'شاحنة',
  'دراجة', 'عبّارة', 'خط إنتاج', 'فرن'
]);

const AR_LETTER = 'ء-ي';
const boundary = w => new RegExp(`(^|[^${AR_LETTER}])${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![${AR_LETTER}])`);

/**
 * The KINDS of entity a rendered stem mentions. Kinds, not instances: a reader
 * perceives "two people" and "a site and a machine" as different shapes of
 * question regardless of which person or which site.
 */
export function entityKindsIn(text) {
  const s = String(text ?? '');
  const kinds = [];
  for (const p of PERSONS) if (boundary(p.w).test(s)) kinds.push('person');
  for (const w of SITES) if (boundary(w).test(s)) kinds.push('site');
  for (const w of APPARATUS) if (boundary(w).test(s)) kinds.push('apparatus');
  return kinds;
}

/** The distinct entity WORDS a stem mentions, for the concentration measure. */
export function entityWordsIn(text) {
  const s = String(text ?? '');
  const out = [];
  for (const p of PERSONS) if (boundary(p.w).test(s)) out.push(p.w);
  for (const w of SITES) if (boundary(w).test(s)) out.push(w);
  for (const w of APPARATUS) if (boundary(w).test(s)) out.push(w);
  return out;
}

/** Draw `k` distinct people, balanced across the declared genders. */
export function people(rng, k) {
  const males = PERSONS.filter(p => p.g === 'm');
  const females = PERSONS.filter(p => p.g === 'f');
  const startFemale = rng.int(0, 1) === 1;
  const out = [];
  const pools = [startFemale ? females : males, startFemale ? males : females];
  const used = new Set();
  for (let i = 0; i < k; i++) {
    const pool = pools[i % 2].filter(p => !used.has(p.w));
    const fallback = PERSONS.filter(p => !used.has(p.w));
    const pick = rng.pick(pool.length ? pool : fallback);
    used.add(pick.w);
    out.push(pick);
  }
  return out;
}
