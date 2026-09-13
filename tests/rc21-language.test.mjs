// RC2.1-4 — the editorial defects the independent review of holdout B found,
// fixed at the renderer and checked against a corpus rather than against the
// six instances that happened to be sampled.

import test from 'node:test';
import {bandOfTemplate} from './_support/bands.mjs';
import assert from 'node:assert/strict';

import Engine from '../src/index.js';
import {agreeingAdjective, singularOf, definitePlural} from '../src/arabic/units.js';
import {riseByPercentPhrase, fractionChainPhrase} from '../src/families/_shared.js';

/** A corpus big enough that a defect at 1-in-200 cannot hide in it. */
function corpus(n = 6000, seedTag = 'RC21-LANG') {
  const e = new Engine();
  const out = [];
  const bands = ['easy', 'medium', 'hard'];
  for (let i = 0; i < n; i++) {
    try {
      out.push(e.generateQuestion({family: 'random', difficulty: bands[i % 3], seed: `${seedTag}-${i}`}));
    } catch { /* exhaustion is measured elsewhere */ }
  }
  return out;
}

const CORPUS = corpus();

test('RC2.1-4: the corpus is large enough to be evidence', () => {
  assert.ok(CORPUS.length > 5000, `only ${CORPUS.length} questions generated`);
  assert.ok(new Set(CORPUS.map(q => q.generator_id)).size > 80, 'too few templates exercised');
});

// --- dual agreement ---------------------------------------------------------

test('RC2.1-4: a dual noun never carries a feminine-singular adjective', () => {
  // «يومين إضافية» — the defect verbatim. Checked for every dual form in the
  // unit table, not just for days, and over all rendered text rather than stems
  // alone, because the same renderer feeds the solution steps.
  const DUALS = ['يومين', 'ساعتين', 'دقيقتين', 'وحدتين', 'قطعتين', 'صندوقين', 'آلتين', 'عاملين', 'سنتين', 'أسبوعين'];
  const bad = [];
  for (const q of CORPUS) {
    const text = [q.question, ...(q.explanation?.steps ?? []), ...Object.values(q.options).map(String)].join(' \n ');
    for (const d of DUALS) {
      const re = new RegExp(`${d}\\s+(\\S*(?:ية|ة))\\b`, 'g');
      for (const m of text.matchAll(re)) {
        if (/^(إضافية|أخرى|إضافيّة)$/.test(m[1])) bad.push({id: q.generator_id, found: m[0]});
      }
    }
  }
  assert.deepEqual(bad, [], `dual noun with singular-feminine adjective: ${JSON.stringify(bad.slice(0, 5))}`);
});

test('RC2.1-4: agreement is derived, and derived correctly', () => {
  assert.equal(agreeingAdjective(1, 'day', 'إضافي'), 'إضافي');
  assert.equal(agreeingAdjective(2, 'day', 'إضافي'), 'إضافيين');
  assert.equal(agreeingAdjective(2, 'day', 'إضافي', 'nominative'), 'إضافيان');
  assert.equal(agreeingAdjective(4, 'day', 'إضافي'), 'إضافية');
  assert.equal(agreeingAdjective(12, 'day', 'إضافي'), 'إضافيًا');
  // feminine unit
  assert.equal(agreeingAdjective(1, 'hour', 'إضافي'), 'إضافية');
  assert.equal(agreeingAdjective(2, 'hour', 'إضافي'), 'إضافيتين');
  assert.equal(agreeingAdjective(12, 'hour', 'إضافي'), 'إضافية');
});

// --- one entity, one name ---------------------------------------------------

test('RC2.1-4: prose never invents a second noun for a unit the table names', () => {
  // The defect: the stem said «علبة» while the formatter rendered «صندوق» for
  // the same box. The table is the single source of truth.
  //
  // RC2.7 made «علبة» a table word in its own right — the unit `can`, a
  // different thing to count — so a blanket ban on the word would now forbid
  // the lexicon's own rendering. The rule it enforces is unchanged and is
  // stated directly instead: a question that counts BOXES may not name them
  // with the word the table gives to cans, and vice versa.
  assert.equal(singularOf('box'), 'صندوق');
  assert.equal(singularOf('can'), 'علبة');
  const CAN_WORDS = /علبة|علبتان|علبتين|علب\b|العلب/;
  const BOX_WORDS = /صندوق|صندوقان|صندوقين|صناديق|الصناديق/;
  const offenders = CORPUS.filter(q => {
    const unit = q.metadata?.answer_unit_id ?? null;
    const text = q.question;
    if (unit === 'box' && CAN_WORDS.test(text)) return true;
    if (unit === 'can' && BOX_WORDS.test(text)) return true;
    // Neither word may appear beside the other in one stem, whatever the answer
    // unit is: that is the mixed-naming the defect was.
    return CAN_WORDS.test(text) && BOX_WORDS.test(text);
  });
  assert.deepEqual(offenders.map(q => q.generator_id), [],
    `a stem names one unit with another unit's word: ${offenders.slice(0, 3).map(q => q.question)}`);
});

test('RC2.1-4: the box template names the same thing throughout', () => {
  const items = CORPUS.filter(q => q.generator_id.startsWith('PROP_E_ITEMS'));
  assert.ok(items.length > 0, 'template not sampled');
  for (const q of items) {
    const text = [q.question, ...(q.explanation?.steps ?? [])].join(' ');
    assert.ok(/صندوق|صناديق|الصندوق|الصناديق/.test(text), q.question);
    assert.ok(!/علبة|علب/.test(text), q.question);
  }
  assert.equal(definitePlural('box'), 'الصناديق');
});

// --- the ambiguous rise -----------------------------------------------------

test('RC2.3-6: a rise says BY how much, at every percentage', () => {
  // RC2.1 attached «من القيمة السابقة» at 100% and above and kept «بنسبة p%»
  // below it. The Holdout D audit found 125% still ambiguous, and it was right:
  // «بنسبة 125% من القيمة السابقة» names the base without saying whether the
  // 125% is the increment or the result. «بمقدار» is additive and cannot be
  // read as a result, so it holds at any percentage and the threshold is gone.
  for (const pct of [20, 80, 100, 125, 150]) {
    assert.equal(riseByPercentPhrase(pct), `بمقدار ${pct}% من القيمة السابقة`);
  }
  // The distinction the brief asks for: the rendered phrase must not be
  // readable as "became p% of the previous value".
  for (const pct of [20, 125]) {
    const said = riseByPercentPhrase(pct);
    assert.ok(said.startsWith('بمقدار'), said);
    assert.ok(!/بنسبة|أصبح|صار/.test(said), said);
  }
});

test('RC2.3-6: no published stem states a rise with the ambiguous «بنسبة»', () => {
  // The renderer is only worth having if every stem goes through it. One did
  // not: MACH_H_STAGE_UP interpolated «فزادت إنتاجيتها ${pct}%» directly, so the
  // RC2.1 fix never applied to it at all.
  //
  // The ambiguity is a property of the NUMBER, not of the word: below 100%,
  // «زادت بنسبة 20%» cannot mean "rose to 20%", because that is not a rise, and
  // the idiomatic form is right there. At 100% and above both readings survive.
  // So what must not appear anywhere is a rise stated with «بنسبة» at 100% or
  // more — and every site that can draw such a percentage goes through the
  // renderer, which is what the second half checks.
  const rises = CORPUS.filter(q => /ارتفع|زادت|زاد|أكثر من/.test(q.question) && /%/.test(q.question));
  assert.ok(rises.length > 100, `only ${rises.length} rise stems in the corpus`);
  for (const q of rises) {
    assert.ok(!/بنسبة \d{3,}%/.test(q.question), `ambiguous rise: ${q.question}`);
  }
  const bigRises = rises.filter(q => /\d{3,}%/.test(q.question));
  assert.ok(bigRises.length > 0, 'no stem in the corpus draws a rise of 100% or more, so this proves nothing');
  for (const q of bigRises) {
    assert.ok(/بمقدار \d{3,}% من القيمة السابقة/.test(q.question), `not routed through the renderer: ${q.question}`);
  }
});

test('RC2.3-6: a chain of fractions is said one step at a time', () => {
  // «ثلث نصف ربع سُدس عدد» stacks four scopes with no syntax between them. The
  // chain is written in the order the solution applies it.
  assert.equal(fractionChainPhrase(['ثلث'], 'العدد 12'), 'ثلث العدد 12');
  assert.equal(fractionChainPhrase(['ثلث', 'نصف', 'ربع'], 'عدد'),
    'ثلث عدد، ثم نصف الناتج، ثم ربع الناتج');
  const frac = CORPUS.filter(q => q.family === 'fractions');
  assert.ok(frac.length > 80, `only ${frac.length} fraction questions (RC2.5 moved ten templates into the easy band, so a fixed-size corpus reaches fractions a little less often; this is a sample-size guard, not a quality bar)`);
  for (const q of frac) {
    // Two fraction words side by side is the stacked form.
    assert.ok(!/(نصف|ثلث|ربع|خُمس|سُدس|ثُمن)\s+(نصف|ثلث|ربع|خُمس|سُدس|ثُمن)/.test(q.question),
      `stacked fractions: ${q.question}`);
  }
});

test('RC2.1-4: clarifying the rise did not shrink the parameter space', async () => {
  // The first attempt at this fix appended a computed second percentage, which
  // the text-params guard rejected — silently deleting every pct >= 100 draw,
  // 38% of this template's space. This is the test that would have caught it.
  const e = new Engine();
  // RC2.3-1: the template sits at whichever band the structural adjudication
  // gives it — one efficiency factor applied inversely, so easy.
  const effBand = await bandOfTemplate('work_time', 'WORK_M_EFF');
  const seen = new Set();
  for (let i = 0; i < 20000 && seen.size < 9; i++) {
    let q;
    try { q = e.generateQuestion({family: 'work_time', difficulty: effBand, seed: `RC21-PCT-${i}`}); } catch { continue; }
    if (q.generator_id === 'WORK_M_EFF') seen.add(q.metadata.parameters.efficiencyPercent);
  }
  for (const pct of [20, 25, 50, 60, 75, 80, 100, 125, 150]) {
    assert.ok(seen.has(pct), `efficiency percentage ${pct} is no longer reachable`);
  }
});

// --- calendar wording -------------------------------------------------------

test('RC2.1-4: calendar stems are not nested relative clauses', () => {
  const cal = CORPUS.filter(q => q.family === 'calendar');
  assert.ok(cal.length > 100, `only ${cal.length} calendar questions`);
  for (const q of cal) {
    assert.ok(!/اليوم الذي يأتي بعد .* من غد/.test(q.question), `old compound wording: ${q.question}`);
    assert.ok(!/يسبق بمقدار .* اليومَ الواقع/.test(q.question), `old nested wording: ${q.question}`);
    // «بـ» glued to a letter renders as a stray dash (بـيومين); it is only
    // correct before a digit.
    assert.ok(!/بـ[ء-ي]/.test(q.question), `dash-prefix before a letter: ${q.question}`);
  }
});

test('RC2.1-4: the reworded calendar templates still ask the same question', () => {
  // Wording only. The net offset, the key and the option set must be untouched,
  // so this checks the arithmetic still closes rather than trusting the edit.
  const e = new Engine();
  let checked = 0;
  for (let i = 0; i < 4000 && checked < 60; i++) {
    let q;
    // RC2.5 moved CAL_H_NESTED to easy on the Holdout E verdicts, so the sweep
    // draws from every band rather than from the two it used to sit in.
    const band = ['easy', 'medium', 'hard'][i % 3];
    try { q = e.generateQuestion({family: 'calendar', difficulty: band, seed: `RC21-CAL-${i}`}); } catch { continue; }
    if (!['CAL_M_COMPOUND', 'CAL_H_NESTED'].includes(q.generator_id)) continue;
    checked++;
    const p = q.metadata.parameters;
    const net = q.generator_id === 'CAL_M_COMPOUND' ? 1 + p.aheadDays : 1 + p.aheadDays - p.behindDays;
    assert.equal(p.netOffset, net, q.question);
    assert.equal(q.options[q.correct_option], q.correct_value);
  }
  assert.ok(checked >= 40, `only ${checked} compound/nested calendar items checked`);
});
