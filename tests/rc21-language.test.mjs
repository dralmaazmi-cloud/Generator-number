// RC2.1-4 — the editorial defects the independent review of holdout B found,
// fixed at the renderer and checked against a corpus rather than against the
// six instances that happened to be sampled.

import test from 'node:test';
import {bandOfTemplate} from './_support/bands.mjs';
import assert from 'node:assert/strict';

import Engine from '../src/index.js';
import {agreeingAdjective, singularOf, definitePlural} from '../src/arabic/units.js';
import {risePercentPhrase} from '../src/families/_shared.js';

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
  // The stem said «علبة» while the formatter rendered «صندوق» for the same box.
  // The table is the single source of truth, so the synonym must not appear.
  assert.equal(singularOf('box'), 'صندوق');
  const offenders = CORPUS.filter(q => /علبة|علب\b|العلب/.test(q.question));
  assert.deepEqual(offenders.map(q => q.generator_id), [],
    `stems still using a non-table synonym for box: ${offenders.slice(0, 3).map(q => q.question)}`);
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

test('RC2.1-4: a rise of 100% or more says what it is a percentage of', () => {
  assert.equal(risePercentPhrase(20), 'بنسبة 20%');
  assert.equal(risePercentPhrase(80), 'بنسبة 80%');
  assert.equal(risePercentPhrase(100), 'بنسبة 100% من القيمة السابقة');
  assert.equal(risePercentPhrase(150), 'بنسبة 150% من القيمة السابقة');
});

test('RC2.1-4: clarifying the rise did not shrink the parameter space', async () => {
  // The first attempt at this fix appended a computed second percentage, which
  // the text-params guard rejected — silently deleting every pct >= 100 draw,
  // 38% of this template's space. This is the test that would have caught it.
  const e = new Engine();
  // RC2.2-1: the template sits in whichever pool its computed band puts it in.
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
    try { q = e.generateQuestion({family: 'calendar', difficulty: i % 2 ? 'medium' : 'hard', seed: `RC21-CAL-${i}`}); } catch { continue; }
    if (!['CAL_M_COMPOUND', 'CAL_H_NESTED'].includes(q.generator_id)) continue;
    checked++;
    const p = q.metadata.parameters;
    const net = q.generator_id === 'CAL_M_COMPOUND' ? 1 + p.aheadDays : 1 + p.aheadDays - p.behindDays;
    assert.equal(p.netOffset, net, q.question);
    assert.equal(q.options[q.correct_option], q.correct_value);
  }
  assert.ok(checked >= 40, `only ${checked} compound/nested calendar items checked`);
});
