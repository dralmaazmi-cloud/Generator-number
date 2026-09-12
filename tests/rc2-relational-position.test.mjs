// RC2-010 — the constant-answer template.
//
// RC1's REL_H_POSITION_UNCERTAIN answered "لا يمكن تحديده" in 91 of 91 corpus
// instances: entropy zero, and a candidate who met it once never had to read it
// again. The cause was target-answer sampling in the generator, which searched
// for a position the orderings disagreed about and resampled the whole graph
// whenever none existed.

import test from 'node:test';
import assert from 'node:assert/strict';

import Engine from '../src/index.js';
import {buildOrderOracle} from '../src/qa/relational-oracle.js';

const UNDETERMINED = 'لا يمكن تحديده';

function positionItems(n = 900) {
  const engine = new Engine();
  const out = [];
  for (let i = 0; i < n; i++) {
    let q;
    try { q = engine.generateQuestion({family: 'relational', difficulty: 'hard', seed: `rc2-010-${i}`}); } catch { continue; }
    if (q.generator_id === 'REL_H_POSITION') out.push(q);
  }
  return out;
}

test('RC2-010: the template produces more than one genuine outcome', () => {
  const items = positionItems();
  assert.ok(items.length > 100, `expected the template to be reachable, saw ${items.length}`);
  const determined = items.filter(q => q.metadata.position_determined);
  const undetermined = items.filter(q => !q.metadata.position_determined);
  assert.ok(determined.length > 0, 'a determined position must be reachable');
  assert.ok(undetermined.length > 0, 'an undetermined position must remain reachable');
  const answers = new Set(items.map(q => q.correct_value));
  assert.ok(answers.size >= 5, `expected several distinct answers, saw ${answers.size}`);
});

test('RC2-010: no single answer dominates the way it used to', () => {
  const items = positionItems();
  const counts = {};
  for (const q of items) counts[q.correct_value] = (counts[q.correct_value] || 0) + 1;
  const modal = Math.max(...Object.values(counts)) / items.length;
  assert.ok(modal < 0.6, `the modal answer still carries ${(100 * modal).toFixed(1)}% of instances`);
  const entropy = -Object.values(counts).reduce((a, c) => a + (c / items.length) * Math.log2(c / items.length), 0);
  assert.ok(entropy > 2, `answer entropy is only ${entropy.toFixed(2)} bits`);
});

test('RC2-010: every published key is confirmed by independent enumeration', () => {
  for (const q of positionItems(400)) {
    const spec = q.metadata.parameters;
    assert.ok(spec, 'the graph must be recorded');
    // Re-derive from the published statements rather than trusting the item.
    const body = q.question.split('؟')[0].split('من صاحب')[0];
    const edges = [...body.matchAll(/([ء-ي]+)\s+(?:أسرع|أطول)\s+من\s+([ء-ي]+)/g)].map(m => [m[1], m[2]]);
    const nodes = [...new Set(edges.flat())];
    const oracle = buildOrderOracle(nodes, edges);
    const posWord = {'الثاني': 2, 'الثالث': 3, 'الرابع': 4, 'الخامس': 5, 'السادس': 6};
    const k = Object.entries(posWord).find(([w]) => q.question.includes(w))?.[1];
    assert.ok(k, `could not read the asked position from: ${q.question}`);
    const who = oracle.whoAtPosition(k);
    const expected = who ?? UNDETERMINED;
    assert.equal(q.correct_value, expected, `${q.id}: published key disagrees with enumeration`);
  }
});

test('RC2-010: the generator does not resample on the strength of the answer', async () => {
  // Static check: the sampler must not branch on the computed answer. The only
  // resample left is structural — a graph too small to ask about a middle
  // position — and the note beside it says so.
  const {readFileSync} = await import('node:fs');
  const src = readFileSync('src/families/relational.js', 'utf8');
  const fn = src.slice(src.indexOf('function partialOrderPosition'), src.indexOf('function graphMeta') > src.indexOf('function partialOrderPosition')
    ? src.indexOf('function graphMeta') : src.length);
  const body = fn.slice(0, fn.indexOf('return buildBase'));
  const code = body.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
  assert.ok(!/openPositions/.test(code), 'the answer-driven position search must be gone');
  const resamples = [...code.matchAll(/return partialOrderPosition\(ctx\)/g)];
  assert.equal(resamples.length, 1, 'exactly one structural resample should remain');
  assert.ok(/nodes\.length < 5/.test(code), 'and it must be guarded by graph size, not by the answer');
  assert.ok(!/correct\s*===|who\s*===\s*null\s*\)\s*return partialOrderPosition/.test(code),
    'no resample may depend on what the answer turned out to be');
});

test('RC2-010: when the position is pinned, "cannot be determined" is offered as a real misconception', () => {
  const determined = positionItems().filter(q => q.metadata.position_determined);
  assert.ok(determined.length > 0);
  for (const q of determined.slice(0, 40)) {
    const values = ['A','B','C','D','E','F'].map(l => q.metadata.options_meta[l].value);
    assert.ok(values.includes(UNDETERMINED),
      `${q.id}: a determined position should still offer "cannot be determined" as a distractor`);
  }
});
