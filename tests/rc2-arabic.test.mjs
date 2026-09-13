// RC2-002 / RC2-016 / RC2-017 — Arabic rendering and construction validation.
//
// The historical strings are fixtures for the defect CLASS. Each MUST_REJECT is
// paired with the corrected form as a MUST_ACCEPT, so a classifier that simply
// rejected everything would fail here.

import test from 'node:test';
import assert from 'node:assert/strict';

import Engine from '../src/index.js';
import {classifyConstructions, classifyQuestionConstructions, STATUS} from '../src/arabic/constructions.js';
import {allRenderedText} from '../src/qa/pipeline.js';

const invalid = text => classifyConstructions(text).filter(c => c.status === STATUS.INVALID);
const unclassified = text => classifyConstructions(text).filter(c => c.status === STATUS.UNCLASSIFIED);

// --- RC2-002: a definite count noun may not take a bare numeral -------------

test('RC2-002 MUST_REJECT: فما متوسط القيم 9؟', () => {
  const bad = invalid('متوسط 7 قيم هو 24. أضيفت قيمتان متوسطهما 33. فما متوسط القيم 9؟');
  assert.ok(bad.some(c => c.id === 'DEFINITE_COUNT_NOUN_THEN_BARE_NUMERAL'), JSON.stringify(bad));
});

test('RC2-002 MUST_ACCEPT: the corrected stem', () => {
  assert.deepEqual(invalid('متوسط 7 قيم هو 24. أضيفت قيمتان متوسطهما 33. فما متوسط القيم بعد الإضافة؟'), []);
});

test('RC2-002 MUST_ACCEPT: apposition naming a number is not a count', () => {
  assert.deepEqual(invalid('ما قيمة سُدس ثُمن العدد 960؟'), []);
});

// --- RC2-016: a governor requires the genitive ------------------------------

test('RC2-016 MUST_REJECT: إنجاز مهمتان', () => {
  const bad = invalid('يستطيع 6 عمال إنجاز مهمتان خلال 4 أيام.');
  assert.ok(bad.some(c => c.id === 'GOVERNOR_THEN_NOMINATIVE_DUAL'), JSON.stringify(bad));
});

test('RC2-016 MUST_ACCEPT: إنجاز مهمتين', () => {
  assert.deepEqual(invalid('يستطيع 6 عمال إنجاز مهمتين خلال 4 أيام.'), []);
});

test('RC2-016 MUST_REJECT: كل سنتيمتران تمثل', () => {
  const bad = invalid('على خريطة، كل سنتيمتران تمثل 10 كيلومترات.');
  assert.ok(bad.some(c => c.id === 'GOVERNOR_THEN_NOMINATIVE_DUAL'), JSON.stringify(bad));
});

test('RC2-016 MUST_ACCEPT: كل سنتيمترين يمثلان', () => {
  assert.deepEqual(invalid('على خريطة، كل سنتيمترين يمثلان 10 كيلومترات.'), []);
});

test('RC2-016 MUST_ACCEPT: a nominative dual in subject position is right', () => {
  assert.deepEqual(invalid('عملت الآلات كلها 3 ساعات، ثم توقفت آلتان وعملت البقية 4 ساعات.'), []);
});

// --- RC2-017: a definite adjective needs a definite noun --------------------

test('RC2-017 MUST_REJECT: سعر سلعة المعلن', () => {
  const bad = invalid('سعر سلعة المعلن 200 درهمًا.');
  assert.ok(bad.some(c => c.id === 'INDEFINITE_IDAFA_THEN_DEFINITE_ADJECTIVE'), JSON.stringify(bad));
});

test('RC2-017 MUST_ACCEPT: سعر السلعة المعلن', () => {
  // RC2.9-6. The fixture said «200 درهمًا». After a round hundred the تمييز is
  // a singular in the genitive, so the accepted form is «200 درهم» — what this
  // test is about, the definite adjective on the إضافة, is unchanged.
  assert.deepEqual(invalid('سعر السلعة المعلن 200 درهم.'), []);
});

// --- a numeral may not take a definite noun ---------------------------------

test('RC2-002: MUST_REJECT a definite noun directly after a numeral', () => {
  const bad = invalid('متوسط 5 القيم هو 24.');
  assert.ok(bad.some(c => c.id === 'NUMERAL_THEN_DEFINITE_NOUN'), JSON.stringify(bad));
});

// --- unknown constructions must stay visible --------------------------------

test('RC2-002/016/017: an unrecognised construction is reported, never waved through', () => {
  const out = unclassified('لدينا 7 زقزقات في الحقل.');
  assert.equal(out.length, 1, 'a noun outside the declared table must surface as unclassified');
  assert.equal(out[0].id, 'NUMERAL_THEN_UNKNOWN_NOUN');
});

// --- the whole corpus -------------------------------------------------------

test('RC2-002/016/017: no published question carries an invalid or unclassified construction', () => {
  const engine = new Engine();
  const badItems = [];
  const unknownWords = new Map();
  const signatures = new Set();
  let n = 0;
  for (const fam of engine.listFamilies().map(f => f.id)) {
    for (let i = 0; i < 120; i++) {
      let q;
      try { q = engine.generateQuestion({family: fam, difficulty: 'mixed', seed: `rc2-ar-${fam}-${i}`}); } catch { continue; }
      n++;
      const r = classifyQuestionConstructions(allRenderedText(q));
      for (const c of r.constructions) signatures.add(c.id);
      for (const c of r.invalid) badItems.push(`${q.generator_id}: ${c.id} — ${c.text}`);
      for (const c of r.unclassified) unknownWords.set(c.detail, (unknownWords.get(c.detail) || 0) + 1);
    }
  }
  assert.ok(n > 1500, `expected a wide sample, generated ${n}`);
  assert.deepEqual(badItems.slice(0, 5), [], `${badItems.length} invalid constructions`);
  assert.deepEqual([...unknownWords.keys()].slice(0, 5), [],
    `${unknownWords.size} unclassified constructions: ${[...unknownWords.keys()].slice(0, 8).join(', ')}`);
  assert.ok(signatures.size >= 10, `expected a range of construction signatures, saw ${signatures.size}`);
});

test('RC2-002/016/017: the pipeline rejects a question carrying an invalid construction', async () => {
  const {validateLanguage} = await import('../src/qa/pipeline.js');
  const engine = new Engine();
  const q = engine.generateQuestion({family: 'averages', difficulty: 'easy', seed: 'rc2-ar-gate'});
  assert.equal(validateLanguage(q).valid, true, 'a clean question must pass');
  const broken = {...q, question: 'متوسط 7 قيم هو 24. فما متوسط القيم 9؟'};
  const v = validateLanguage(broken);
  assert.equal(v.valid, false, 'the language stage must reject the historical construction');
  assert.ok(v.details.arabicInvalidConstructions.length > 0);
});

// --- RC2.9-6: the three renderer defects the review named --------------------
//
// Each is asserted on the RENDERED text of a wide sample, because each was
// invisible in the template source: the defect was that one authored string was
// reused across scenarios it did not fit.

/** Every published question of a family, across the bands, for a wide sweep. */
function sweepFamily(engine, family, runs = 150) {
  const out = [];
  for (let i = 0; i < runs; i++) {
    for (const d of ['easy', 'medium', 'hard']) {
      try { out.push(engine.generateQuestion({family, difficulty: d, seed: `rc29-ar|${family}|${i}|${d}`})); }
      catch { /* band gap */ }
    }
  }
  return out;
}

test('RC2.9-6: a rate answer is rendered in the output the stem names', () => {
  // MACH_H_TWO_CONFIG formatted every answer as «قطعة/ساعة» whatever the
  // scenario produced, so a stem counting علب was answered in قطع.
  const engine = new Engine();
  const offenders = [];
  for (const q of sweepFamily(engine, 'machines')) {
    for (const opt of Object.values(q.options ?? {})) {
      const text = String(opt);
      if (!text.includes('/')) continue;
      const noun = text.split('/')[0].replace(/[\d.,\s]/g, '').trim();
      if (noun && !q.question.includes(noun)) offenders.push(`${q.generator_id}: «${text}» against «${q.question}»`);
    }
  }
  assert.deepEqual(offenders.slice(0, 3), [], `${offenders.length} answers in a unit the stem never names`);
});

test('RC2.9-6: a plural subject takes the agreement its noun calls for', () => {
  // «قُسموا» — the sound masculine plural — was said of boards, seedlings and
  // books. A plural of non-human things agrees as a feminine singular.
  const engine = new Engine();
  const offenders = [];
  for (const q of sweepFamily(engine, 'averages')) {
    if (!/قُسموا/.test(q.question)) continue;
    // The only human subject in the aggregate scenes is the exam-scores one.
    if (!/طالب|طلاب|طالبًا/.test(q.question)) offenders.push(`${q.generator_id}: ${q.question}`);
  }
  assert.deepEqual(offenders.slice(0, 3), [], `${offenders.length} non-human subjects with a human verb`);
  assert.ok(sweepFamily(engine, 'averages').some(q => /قُسمت/.test(q.question)),
    'the non-human form must actually be reachable, or this test proves nothing');
});

test('RC2.9-6: the compound calendar offset is said, not transliterated', () => {
  // «اليوم الذي يلي غدًا بمقدار 3 أيام» is the arithmetic written out in Arabic
  // words, not a sentence. The nesting it tests is kept; the wording is not.
  const engine = new Engine();
  const compound = sweepFamily(engine, 'calendar').filter(q => q.generator_id === 'CAL_M_COMPOUND');
  assert.ok(compound.length > 0, 'CAL_M_COMPOUND must be reachable for this to mean anything');
  assert.deepEqual(compound.filter(q => /يلي غدًا بمقدار/.test(q.question)).map(q => q.question).slice(0, 3), []);
  // And «بعد غد» stays out of it: it is itself an idiom for today+2 and would
  // silently change the question.
  assert.deepEqual(compound.filter(q => /بعد غدٍ? بـ/.test(q.question)).map(q => q.question).slice(0, 3), []);
});

test('RC2.9-6: the تمييز agrees with the last element of the number', async () => {
  // Everything from eleven upwards took the accusative singular, so the engine
  // published «400 قميصًا» and «4000 درهمًا». After a round hundred or thousand
  // the تمييز is a singular in the genitive.
  const {unitWordFor, formatNumberWithUnit, agreeingAdjective} = await import('../src/arabic/units.js');
  const cases = [
    [1, 'درهم'], [2, 'درهمان'], [3, 'دراهم'], [10, 'دراهم'],
    [11, 'درهمًا'], [99, 'درهمًا'], [198, 'درهمًا'],
    [100, 'درهم'], [400, 'درهم'], [1000, 'درهم'], [4500, 'درهم'],
    // A compound follows its own last element, not its size.
    [102, 'درهمان'], [103, 'دراهم'], [110, 'دراهم'], [1001, 'درهم']
  ];
  for (const [n, want] of cases) assert.equal(unitWordFor(n, 'dirham'), want, `${n}`);
  assert.equal(formatNumberWithUnit(400, 'dirham'), '400 درهم');
  assert.equal(formatNumberWithUnit(45, 'dirham'), '45 درهمًا');
  // The adjective on a counted noun follows the noun it describes.
  assert.equal(agreeingAdjective(400, 'day', 'إضافي'), 'إضافي');
  assert.equal(agreeingAdjective(45, 'day', 'إضافي'), 'إضافيًا');
});

test('RC2.9-6: no published quantity carries the wrong agreement', () => {
  // The output-side net, on the rendered corpus rather than on the table.
  const engine = new Engine();
  const offenders = [];
  for (const fam of engine.listFamilies().map(f => f.id)) {
    for (let i = 0; i < 40; i++) {
      for (const d of ['easy', 'medium', 'hard']) {
        let q;
        try { q = engine.generateQuestion({family: fam, difficulty: d, seed: `rc29-agree|${fam}|${i}|${d}`}); }
        catch { continue; }
        for (const t of allRenderedText(q)) {
          for (const c of classifyQuestionConstructions([t]).invalid) {
            if (c.id === 'NUMERAL_THEN_UNIT') offenders.push(`${q.generator_id}: ${c.text}`);
          }
        }
      }
    }
  }
  assert.deepEqual(offenders.slice(0, 5), [], `${offenders.length} quantities disagree with their number`);
});
