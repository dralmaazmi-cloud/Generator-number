// RC2.9.4 Phase A — the FEEDBACK suite: every rationale a learner is shown
// for a wrong option is consistent with the option's own provenance, on a
// broad corpus and at the sites the manual inspection found.

import test from 'node:test';
import assert from 'node:assert/strict';

import Engine from '../src/index.js';
import {rationaleProblems, renderRationale, VARIANTS, NEUTRAL, shownDerivation, operationsIn, claimedOperations}
  from '../src/qa/rationale.js';
import {MISCONCEPTIONS} from '../src/qa/misconceptions.js';

const engine = new Engine();
const L = ['A', 'B', 'C', 'D', 'E', 'F'];

function sweep(perFamily = 80) {
  const rows = [];
  for (const {id: family} of engine.listFamilies()) for (let i = 0; i < perFamily; i++) for (const band of ['easy', 'medium', 'hard']) {
    try { rows.push(engine.generateQuestion({family, difficulty: band, seed: `rc294-fb|${family}|${i}|${band}`})); } catch { /* band not served */ }
  }
  return rows;
}
const CORPUS = sweep();

test('A1 gate: 0 operation contradictions, 0 cross-family vocabulary, 0 vacuous derivations, 0 duplicate options, 0 accidental keys', () => {
  const problems = {};
  let wrong = 0, dupOptions = 0, accidental = 0, dupRationale = 0;
  for (const q of CORPUS) {
    const values = Object.values(q.options);
    if (new Set(values).size !== values.length) dupOptions++;
    const seen = new Set();
    for (const l of L) {
      const m = q.metadata.options_meta[l];
      if (!m || m.correct) continue;
      wrong++;
      if (m.value === q.metadata.options_meta[q.correct_option].value) accidental++;
      const text = q.explanation.distractor_analysis[l];
      if (seen.has(text)) dupRationale++;
      seen.add(text);
      for (const p of rationaleProblems({text, derivation: m.derivation, family: q.family, value: m.value, optionText: q.options[l]})) {
        problems[`${p} :: ${q.generator_id}/${m.misconceptionId}`] ??= text;
      }
    }
  }
  assert.ok(wrong > 15000, `wrong options checked: ${wrong}`);
  assert.deepEqual(problems, {});
  assert.equal(dupOptions, 0);
  assert.equal(accidental, 0);
  assert.equal(dupRationale, 0, 'two options never carry the same rationale text');
});

test('A1: the sites the manual inspection corrected read truthfully', () => {
  const find = (family, templateId, id) => {
    for (let i = 0; i < 300; i++) for (const band of ['easy', 'medium', 'hard']) {
      let q; try { q = engine.generateQuestion({family, difficulty: band, templateId, seed: `rc294-fb-site|${templateId}|${i}`}); } catch { continue; }
      if (q.generator_id !== templateId) continue;
      for (const l of L) { const m = q.metadata.options_meta[l]; if (m && !m.correct && m.misconceptionId === id) return q.explanation.distractor_analysis[l]; }
    }
    return null;
  };
  const rel = find('relational', 'REL_E_CHAIN', 'RESOLVED_AN_UNRESOLVED_PAIR');
  assert.ok(rel && /اعتبرت الترتيب غير محسوم/.test(rel) && !/حسمت زوجًا/.test(rel), rel);
  const age = find('ages', 'AGE_E_SUM_DIFF', 'APPLIED_STEP_TWICE');
  assert.ok(age && /الفرق كاملًا/.test(age), age);
  const mult = find('ages', 'AGE_E_MULT_DIFF', 'RATE_APPLIED_TO_WRONG_COUNT');
  assert.ok(mult && /قسمت الفرق على المضاعف نفسه/.test(mult) && /÷/.test(mult), mult);
  const ratio = find('ratios', 'RAT_E_SPLIT', 'USED_ARITHMETIC_MEAN_OF_AVERAGES');
  assert.ok(ratio && /النسبة لا تُقسم مناصفة/.test(ratio) && !/المتوسطين/.test(ratio), ratio);
});

test('A1: the renderer never invents — a claimed operation the derivation lacks becomes a factual line', () => {
  const r = renderRationale({optionText: '35 سنة', value: 35, misconceptionId: 'SUBTRACTED_INSTEAD_OF_ADDED', derivation: '30 + 5', family: 'ages', templateId: 'X_UNKNOWN'});
  assert.doesNotMatch(r, /طرحت/);
  assert.match(r, /وهي ناتج 30 \+ 5\./);
  assert.match(r, /ليست التي تقتضيها/);
  // And a truthful site keeps its sentence.
  const ok = renderRationale({optionText: '19', value: 19, misconceptionId: 'SUBTRACTED_INSTEAD_OF_ADDED', derivation: '25 − 6', family: 'averages', templateId: 'AVG_M_REPLACE'});
  assert.match(ok, /طرحت حيث يقتضي الحل الجمع/);
});

test('A1: a derivation that tidies to the option itself is shown raw, a bare number is not shown', () => {
  assert.equal(shownDerivation('1 × 4', 4), '1 × 4');
  assert.equal(shownDerivation('8 × 1 ÷ 5', 1.6), '8 ÷ 5');
  assert.equal(shownDerivation('4', 4), null);
  assert.equal(shownDerivation('الكمية المضافة 6', 6), 'الكمية المضافة 6');
  const r = renderRationale({optionText: '4', value: 4, misconceptionId: 'USED_WRONG_SIDE_OF_RATIO', derivation: '1 × 4', family: 'ratios', templateId: 'RAT_M_ADD_SIDE'});
  assert.match(r, /وهي ناتج 1 × 4\./);
  const bare = renderRationale({optionText: '6', value: 6, misconceptionId: 'USED_GIVEN_VALUE_AS_ANSWER', derivation: '6', family: 'ratios', templateId: 'X'});
  assert.equal(bare, 'اخترت 6. أعدت قيمة معطاة في السؤال بدل القيمة المطلوبة.');
});

test('A1: every variant and neutral sentence is itself consistent with its scope', () => {
  for (const [id, byKey] of Object.entries(VARIANTS)) {
    assert.ok(MISCONCEPTIONS[id], `${id} must be a catalogue id`);
    for (const [key, sentence] of Object.entries(byKey)) {
      const family = engine.listFamilies().some(f => f.id === key) ? key : null;
      if (family) {
        const p = rationaleProblems({text: `اخترت 1، وهي ناتج 2 − 1. ${sentence}`, derivation: '2 − 1 + 3 × 4 ÷ 5', family, value: 1, optionText: '1'});
        assert.deepEqual(p.filter(x => x.startsWith('CROSS_FAMILY')), [], `${id}/${key}: ${sentence}`);
      }
    }
  }
  for (const [id, sentence] of Object.entries(NEUTRAL)) {
    for (const family of ['ratios', 'ages', 'work_time', 'direct_proportion', 'percentages', 'profit_loss', 'machines', 'combined_rate', 'unit_rate']) {
      const p = rationaleProblems({text: `اخترت 1، وهي ناتج 2 − 1. ${sentence}`, derivation: '2 − 1 + 3 × 4 ÷ 5', family, value: 1, optionText: '1'});
      assert.deepEqual(p.filter(x => x.startsWith('CROSS_FAMILY')), [], `${id} in ${family}: ${sentence}`);
    }
  }
  assert.deepEqual([...claimedOperations('جمعت حيث يقتضي الحل الطرح.')], ['add']);
  assert.deepEqual([...claimedOperations('وجدت ضعف المقدار المطلوب ثم نسيت قسمته على 2.')], []);
  assert.deepEqual([...operationsIn('30 + 5')], ['add']);
  assert.deepEqual([...operationsIn('(18 − 6) ÷ 2')].sort(), ['divide', 'subtract']);
});
