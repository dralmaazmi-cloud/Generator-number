// Section 12: one central lexicon and one formatter for Arabic number/unit
// agreement. Templates must never concatenate a number and a unit themselves;
// tools/check-manual-units.mjs enforces that as a build gate.

/**
 * Each unit declares the four forms Arabic needs:
 *   singular  — used for 1 (written with واحد/واحدة, no numeral)
 *   dual      — used for 2 (no numeral); `dualOblique` after a preposition
 *   plural    — جمع القلة, used for 3..10 with the numeral
 *   accSing   — المفرد المنصوب (تمييز), used for 11+, 0 and fractional counts
 */
export const UNITS = Object.freeze({
  day:     {singular:'يوم',      one:'يوم واحد',      dual:'يومان',      dualOblique:'يومين',      plural:'أيام',      accSing:'يومًا'},
  hour:    {singular:'ساعة',     one:'ساعة واحدة',    dual:'ساعتان',     dualOblique:'ساعتين',     plural:'ساعات',     accSing:'ساعة'},
  minute:  {singular:'دقيقة',    one:'دقيقة واحدة',   dual:'دقيقتان',    dualOblique:'دقيقتين',    plural:'دقائق',     accSing:'دقيقة'},
  year:    {singular:'سنة',      one:'سنة واحدة',     dual:'سنتان',      dualOblique:'سنتين',      plural:'سنوات',     accSing:'سنة'},
  worker:  {singular:'عامل',     one:'عامل واحد',     dual:'عاملان',     dualOblique:'عاملين',     plural:'عمال',      accSing:'عاملًا'},
  machine: {singular:'آلة',      one:'آلة واحدة',     dual:'آلتان',      dualOblique:'آلتين',      plural:'آلات',      accSing:'آلة'},
  unit:    {singular:'وحدة',     one:'وحدة واحدة',    dual:'وحدتان',     dualOblique:'وحدتين',     plural:'وحدات',     accSing:'وحدة'},
  piece:   {singular:'قطعة',     one:'قطعة واحدة',    dual:'قطعتان',     dualOblique:'قطعتين',     plural:'قطع',       accSing:'قطعة'},
  dirham:  {singular:'درهم',     one:'درهم واحد',     dual:'درهمان',     dualOblique:'درهمين',     plural:'دراهم',     accSing:'درهمًا'},
  cup:     {singular:'كوب',      one:'كوب واحد',      dual:'كوبان',      dualOblique:'كوبين',      plural:'أكواب',     accSing:'كوبًا'},
  box:     {singular:'صندوق',    one:'صندوق واحد',    dual:'صندوقان',    dualOblique:'صندوقين',    plural:'صناديق',    accSing:'صندوقًا'},
  task:    {singular:'مهمة',     one:'مهمة واحدة',    dual:'مهمتان',     dualOblique:'مهمتين',     plural:'مهام',      accSing:'مهمة'},
  part:    {singular:'جزء',      one:'جزء واحد',      dual:'جزءان',      dualOblique:'جزأين',      plural:'أجزاء',     accSing:'جزءًا'},
  km:      {singular:'كيلومتر',  one:'كيلومتر واحد',  dual:'كيلومتران',  dualOblique:'كيلومترين',  plural:'كيلومترات', accSing:'كيلومترًا'},
  liter:   {singular:'لتر',      one:'لتر واحد',      dual:'لتران',      dualOblique:'لترين',      plural:'لترات',     accSing:'لترًا'},
  kg:      {singular:'كيلوجرام', one:'كيلوجرام واحد', dual:'كيلوجرامان', dualOblique:'كيلوجرامين', plural:'كيلوجرامات',accSing:'كيلوجرامًا'},
  word:    {singular:'كلمة',     one:'كلمة واحدة',    dual:'كلمتان',     dualOblique:'كلمتين',     plural:'كلمات',     accSing:'كلمة'},
  person:  {singular:'شخص',      one:'شخص واحد',      dual:'شخصان',      dualOblique:'شخصين',      plural:'أشخاص',     accSing:'شخصًا'},
  item:    {singular:'عنصر',     one:'عنصر واحد',     dual:'عنصران',     dualOblique:'عنصرين',     plural:'عناصر',     accSing:'عنصرًا'},
  cm:      {singular:'سنتيمتر',  one:'سنتيمتر واحد',  dual:'سنتيمتران',  dualOblique:'سنتيمترين',  plural:'سنتيمترات', accSing:'سنتيمترًا'},
  week:    {singular:'أسبوع',    one:'أسبوع واحد',    dual:'أسبوعان',    dualOblique:'أسبوعين',    plural:'أسابيع',    accSing:'أسبوعًا'}
});

/** Units that never inflect: symbols, rates and percentages. */
export const INVARIANT_UNITS = Object.freeze({
  kmPerHour: 'كم/ساعة',
  unitPerHour: 'وحدة/ساعة',
  unitPerMinute: 'وحدة/دقيقة',
  piecePerHour: 'قطعة/ساعة',
  kmPerLiter: 'كم/لتر',
  wordPerMinute: 'كلمة/دقيقة',
  percent: '%',
  none: ''
});

/** Short aliases so templates can say `km` or `كم` interchangeably. */
export const UNIT_ALIASES = Object.freeze({
  days:'day', hours:'hour', minutes:'minute', years:'year', workers:'worker',
  machines:'machine', units:'unit', pieces:'piece', dirhams:'dirham', cups:'cup',
  boxes:'box', tasks:'task', parts:'part', kilometers:'km', liters:'liter',
  kilograms:'kg', words:'word', persons:'person', people:'person', items:'item',
  centimeters:'cm', weeks:'week'
});

export function resolveUnitId(unitId) {
  if (!unitId) return null;
  if (UNITS[unitId]) return unitId;
  if (UNIT_ALIASES[unitId] && UNITS[UNIT_ALIASES[unitId]]) return UNIT_ALIASES[unitId];
  return null;
}

/** Decimal rendering for counts. Display-only rounding, never fed back in. */
export function displayNumber(n, maxDecimals = 6) {
  if (typeof n === 'string') return n;
  if (!Number.isFinite(n)) return String(n);
  if (Number.isInteger(n)) return String(n);
  const rounded = Number(n.toFixed(maxDecimals));
  return String(rounded);
}

/**
 * Section 12-A. The single place where a count and a unit meet.
 *
 * @param {number} n            the count
 * @param {string} unitId       key of UNITS / INVARIANT_UNITS (or an alias)
 * @param {'nominative'|'oblique'} grammaticalContext
 *        'oblique' is the منصوب/مجرور position, e.g. straight after خلال / بعد / من.
 */
export function formatNumberWithUnit(n, unitId, grammaticalContext = 'nominative') {
  if (unitId in INVARIANT_UNITS) {
    const label = INVARIANT_UNITS[unitId];
    return label ? `${displayNumber(n)} ${label}` : displayNumber(n);
  }
  const id = resolveUnitId(unitId);
  if (!id) throw new Error(`Unknown unit id: ${unitId}`);
  const u = UNITS[id];
  const num = Number(n);
  if (!Number.isFinite(num)) return `${displayNumber(n)} ${u.accSing}`;
  if (Number.isInteger(num)) {
    if (num === 1) return u.one;
    if (num === 2) return grammaticalContext === 'oblique' ? u.dualOblique : u.dual;
    if (num >= 3 && num <= 10) return `${num} ${u.plural}`;
    return `${displayNumber(num)} ${u.accSing}`;
  }
  return `${displayNumber(num)} ${u.accSing}`;
}

/** Bare unit word for a count, without the numeral (used in mid-sentence prose). */
export function unitWordFor(n, unitId) {
  const id = resolveUnitId(unitId);
  if (!id) throw new Error(`Unknown unit id: ${unitId}`);
  const u = UNITS[id];
  const num = Number(n);
  if (!Number.isInteger(num)) return u.accSing;
  if (num === 1) return u.singular;
  if (num === 2) return u.dual;
  if (num >= 3 && num <= 10) return u.plural;
  return u.accSing;
}

// ---------------------------------------------------------------------------
// Output-side safety net (Section 12-B). The deterministic gate is the grep in
// tools/check-manual-units.mjs; this scans rendered text as a second net.
// ---------------------------------------------------------------------------

const ALL_FORMS = (() => {
  const map = new Map(); // surface form -> {id, kind}
  for (const [id, u] of Object.entries(UNITS)) {
    map.set(u.singular, {id, kind:'singular'});
    map.set(u.dual, {id, kind:'dual'});
    map.set(u.dualOblique, {id, kind:'dual'});
    map.set(u.plural, {id, kind:'plural'});
    map.set(u.accSing, {id, kind:'accSing'});
  }
  return map;
})();

const NUMBER_UNIT_RE = /(\d+(?:\.\d+)?)\s+([ء-يٰٱً-ْ]+)/g;

/**
 * Finds `<digits> <unit word>` pairs in rendered text and reports the ones whose
 * form does not agree with the count.
 * @returns {{violations: Array<{number:number, word:string, expected:string}>}}
 */
export function checkArabicNumberUnits(text) {
  const violations = [];
  if (!text) return {violations};
  const src = String(text);
  for (const m of src.matchAll(NUMBER_UNIT_RE)) {
    const n = Number(m[1]);
    const word = m[2];
    const form = ALL_FORMS.get(word);
    if (!form) continue; // not a lexicon unit: nothing to judge
    // A compound rate symbol such as `وحدة/ساعة` or `كم/ساعة` is a unit name,
    // not a counted noun, so number agreement does not apply to it.
    const after = src[m.index + m[0].length];
    const beforeWord = src[m.index + m[0].length - word.length - 1];
    if (after === '/' || beforeWord === '/') continue;
    const expectedWord = expectedFormWord(n, form.id);
    // n===1 and n===2 must not carry a numeral at all.
    if (Number.isInteger(n) && (n === 1 || n === 2)) {
      violations.push({number:n, word, expected: formatNumberWithUnit(n, form.id)});
      continue;
    }
    if (word !== expectedWord) {
      violations.push({number:n, word, expected: `${m[1]} ${expectedWord}`});
    }
  }
  return {violations};
}

function expectedFormWord(n, unitId) {
  const u = UNITS[unitId];
  if (!Number.isInteger(n)) return u.accSing;
  if (n === 1) return u.singular;
  if (n === 2) return u.dual;
  if (n >= 3 && n <= 10) return u.plural;
  return u.accSing;
}

export function checkArabicNumberUnitsDeep(strings) {
  const violations = [];
  for (const s of strings) {
    if (typeof s !== 'string') continue;
    violations.push(...checkArabicNumberUnits(s).violations.map(v => ({...v, text: s})));
  }
  return {violations};
}
