// RC2.8 — the Arabic defects the review listed, each held closed by name.
//
// Every test here quotes the string that was published, so a regression is
// recognisable rather than merely red.

import test from 'node:test';
import assert from 'node:assert/strict';

import Engine from '../src/index.js';
import {unitIsFeminine, agreeingPastVerb, formatNumberWithUnit} from '../src/arabic/units.js';
import {riseByPercentPhrase, dropByPercentPhrase, fractionChainPhrase} from '../src/families/_shared.js';
import {POOLS} from '../src/compose/scenarios.js';

const RATE_WORD = /(قطعة|صفحة|رغيف|زجاجة|قميص|علبة|لوح|وحدة|شتلة|طلب|كتاب)\/(ساعة|دقيقة)/g;

/** One broad sweep, shared by the sampling tests below. */
function sweep(sessions = 6, count = 100) {
  const engine = new Engine();
  const rows = [];
  for (let i = 0; i < sessions; i++) {
    rows.push(...engine.generatePractice({seed: `rc28-ar-sweep-${i}`, count}).questions);
  }
  return rows;
}

const CORPUS = sweep();

test('RC2.8-6: «بـ» never glues the preposition to an Arabic word', () => {
  // «تغيرت قيمة بـزيادة نسبته 20%» — the hyphenated form separates the
  // preposition from a NUMERAL and has no business before a word.
  const offenders = CORPUS
    .filter(q => /بـ[ء-ي]/.test(q.question))
    .map(q => q.question);
  assert.deepEqual(offenders.slice(0, 3), [], `${offenders.length} stems glue بـ to a word`);
});

test('RC2.8-6: a percentage change is said with «بمقدار», in both directions', () => {
  assert.match(riseByPercentPhrase(25), /^بمقدار 25% من القيمة السابقة$/);
  assert.match(dropByPercentPhrase(25), /^بمقدار 25% من القيمة السابقة$/);
  assert.ok(!riseByPercentPhrase(25).includes('نسبته'),
    '«نسبته» agreed with nothing: «زيادة» is feminine');
});

test('RC2.8-6: «كم …؟» agrees its verb with the counted noun', () => {
  // «كم قميصًا أُنتجت؟» was published: a feminine verb on a masculine noun.
  const offenders = [];
  for (const q of CORPUS) {
    const m = q.question.match(/كم\s+(\S+?)\s+(أُنتج|أُنتجت)\؟?/);
    if (!m) continue;
    const feminineNoun = /ة\b|ةً|ةٍ/.test(m[1]);
    const feminineVerb = m[2] === 'أُنتجت';
    if (feminineNoun !== feminineVerb) offenders.push(q.question);
  }
  assert.deepEqual(offenders.slice(0, 3), [], `${offenders.length} stems disagree`);
});

test('RC2.8-6: the lexicon knows the gender of every production noun', () => {
  for (const sc of POOLS.production ?? []) {
    if (!sc.out) continue;
    assert.equal(typeof unitIsFeminine(sc.out), 'boolean', sc.out);
    const verb = agreeingPastVerb(sc.out, 'أُنتج', 'أُنتجت');
    assert.ok(verb === 'أُنتج' || verb === 'أُنتجت');
  }
});

test('RC2.8-6: a noun after «ثمن» is in the genitive', () => {
  // «ثمن صندوقان وقطعتان» — the dual after a governing noun takes «ـين».
  const offenders = CORPUS
    .filter(q => /ثمن[^.؟]*?(صندوقان|قطعتان|آلتان|عاملان)/.test(q.question))
    .map(q => q.question);
  assert.deepEqual(offenders.slice(0, 3), [], `${offenders.length} stems use the nominative dual after ثمن`);
  // And the correct forms do occur, so the test is not vacuous.
  assert.equal(formatNumberWithUnit(2, 'box', 'oblique'), 'صندوقين');
  assert.equal(formatNumberWithUnit(2, 'piece', 'oblique'), 'قطعتين');
});

test('RC2.8-6: a rate answer is a rate of the thing the stem counts', () => {
  // «ينجز جهاز 60 قطعة…» with options in «وحدة/ساعة» answers a question the
  // stem did not ask.
  const offenders = [];
  for (const q of CORPUS) {
    const inStem = [...new Set((q.question.match(RATE_WORD) ?? []).map(x => x.split('/')[0]))];
    const inOptions = [...new Set((Object.values(q.options).join(' ').match(RATE_WORD) ?? [])
      .map(x => x.split('/')[0]))];
    if (!inOptions.length || !inStem.length) continue;
    if (!inOptions.every(o => inStem.includes(o))) {
      offenders.push(`${q.generator_id}: stem ${inStem.join('/')} vs options ${inOptions.join('/')}`);
    }
  }
  assert.deepEqual(offenders.slice(0, 3), [], `${offenders.length} items answer in the wrong rate unit`);
});

test('RC2.8-6: the fraction chain is a sentence, not a run of noun phrases', () => {
  const phrase = fractionChainPhrase(['ثلث', 'ربع'], 'العدد 240');
  assert.match(phrase, /^أُخذ /, 'the chain needs a verb');
  const chains = CORPUS.filter(q => q.family === 'fractions');
  assert.ok(chains.length, 'the sweep must contain fractions for this to mean anything');
  for (const q of chains) {
    assert.ok(!/ثم كسرٌ من الناتج/.test(q.question),
      `«ثم كسرٌ من الناتج» names neither the fraction nor which result: ${q.question}`);
  }
});

test('RC2.8-6: no stem leaves a numeral next to a noun the lexicon does not govern', () => {
  // The construction classifier already refuses these at generation; this is the
  // end-to-end statement of it, on a corpus rather than on a fixture.
  const engine = new Engine();
  for (const q of CORPUS.slice(0, 200)) {
    const v = engine.validateQuestion(q);
    assert.equal(v.valid, true, `${q.generator_id}: ${(v.reasons ?? []).join(', ')} — ${q.question}`);
  }
});
