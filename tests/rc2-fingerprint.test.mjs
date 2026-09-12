// RC2-022 and RC2-023 — three fingerprint concepts, kept distinct.
//
//   exact-instance  identifies one concrete generated instance
//   semantic        identifies mathematically equivalent content, display order removed
//   structural      identifies the reasoning pattern, incidental values removed
//
// The historical cases become fixtures for the rule, not for their literal
// values: RC1 published S2/07 with S2/39 (one set, two display orders) and
// S2/05 with S2/41 (one operation chain, two start terms) in a single session.

import test from 'node:test';
import assert from 'node:assert/strict';

import Engine from '../src/index.js';
import {buildFingerprint, buildSemanticFingerprint, buildStructuralSignature} from '../src/qa/fingerprint.js';

// --- RC2-022: commutative content is order-blind --------------------------

const oddSpec = numbers => ({
  family: 'odd_one_out',
  templateId: 'ODD_M_PRIME2',
  askedUnknown: 'outlier',
  stageCount: 1,
  namedParameters: {numbers, primes: [3, 5, 7, 11, 13]},
  commutative: {numberSet: [...numbers].sort((a, b) => a - b)},
  orderInsensitive: ['numbers']
});

test('RC2-022 MUST_RECOGNISE_AS_SAME: the two historical display orders are one instance', () => {
  const a = oddSpec([14, 12, 26, 6, 10, 22]);   // RC1 S2/07
  const b = oddSpec([12, 10, 26, 22, 14, 6]);   // RC1 S2/39
  assert.notEqual(buildFingerprint(a), buildFingerprint(b),
    'the exact-instance fingerprints should still differ — they are different renderings');
  assert.equal(buildSemanticFingerprint(a), buildSemanticFingerprint(b),
    'the semantic fingerprints must collide: same set, same rule, same outlier');
});

test('RC2-022 MUST_ACCEPT_AS_DIFFERENT: a genuinely different set stays distinct', () => {
  const a = oddSpec([14, 12, 26, 6, 10, 22]);
  const b = oddSpec([14, 12, 26, 6, 10, 34]);   // one member changed
  assert.notEqual(buildSemanticFingerprint(a), buildSemanticFingerprint(b));
});

test('RC2-022 property: the semantic fingerprint is invariant under every permutation', () => {
  const base = [6, 10, 12, 14, 22, 26];
  const target = buildSemanticFingerprint(oddSpec(base));
  const permute = (arr) => {
    if (arr.length <= 1) return [arr];
    const out = [];
    for (let i = 0; i < arr.length; i++) {
      const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
      for (const p of permute(rest)) out.push([arr[i], ...p]);
    }
    return out;
  };
  // 6! = 720 permutations, all of them.
  const all = permute(base);
  assert.equal(all.length, 720);
  for (const p of all) {
    assert.equal(buildSemanticFingerprint(oddSpec(p)), target,
      `permutation [${p.join(',')}] changed the semantic fingerprint`);
  }
});

test('RC2-022: order is preserved where order is the mathematics', () => {
  // No presentationOnly declaration: a sequence's shown terms are not a set.
  const spec = terms => ({
    family: 'sequences', templateId: 'SEQ_E_ARITH', askedUnknown: 'nextTerm',
    namedParameters: {firstTerm: terms[0], commonDifference: 4, shownTerms: terms}
  });
  assert.notEqual(buildSemanticFingerprint(spec([28, 32, 36, 40])),
                  buildSemanticFingerprint(spec([40, 36, 32, 28])),
                  'reversing a sequence must not collide: the order is the reasoning');
});

test('RC2-022: every declared commutative structure is genuinely order-blind', () => {
  const engine = new Engine();
  const checked = new Set();
  const failures = [];
  for (const fam of engine.listFamilies().map(f => f.id)) {
    for (let i = 0; i < 60; i++) {
      let q;
      try { q = engine.generateQuestion({family: fam, difficulty: 'mixed', seed: `rc2-022-${fam}-${i}`}); } catch { continue; }
      const declared = q.metadata.order_insensitive_params;
      const fp = q.metadata.fingerprint || '';
      const hasCommutative = /commutative:\{[^}]+\}/.test(fp);
      if (hasCommutative && !declared) {
        failures.push(`${q.generator_id}: declares a commutative structure but no order-insensitive parameters`);
        continue;
      }
      if (!declared) continue;
      checked.add(q.generator_id);

      // The property: reversing every declared order-insensitive array must not
      // move the semantic fingerprint, while the exact-instance fingerprint is
      // free to change.
      const spec = {
        family: q.family, templateId: q.generator_id,
        askedUnknown: q.metadata.asked_unknown, stageCount: q.metadata.stage_count,
        reasoningGraph: q.metadata.reasoning_graph,
        namedParameters: q.metadata.parameters, commutative: undefined,
        orderInsensitive: declared
      };
      const reversed = {...q.metadata.parameters};
      for (const k of declared) if (Array.isArray(reversed[k])) reversed[k] = [...reversed[k]].reverse();
      const a = buildSemanticFingerprint(spec);
      const b = buildSemanticFingerprint({...spec, namedParameters: reversed});
      if (a !== b) failures.push(`${q.generator_id}: reversing ${declared.join(',')} changed the semantic fingerprint`);
    }
  }
  assert.deepEqual(failures, [], failures.join(' | '));
  assert.ok(checked.size >= 8, `expected the commutative families to be exercised, saw ${[...checked].join(', ')}`);
});

// --- RC2-023: the reasoning pattern ---------------------------------------

const altOps = firstTerm => ({
  family: 'sequences', templateId: 'SEQ_M_ALT_OPS', askedUnknown: 'nextTerm',
  reasoningPattern: ['ADD(4)', 'MUL(2)', 'ADD(5)', 'MUL(3)', 'ADD(6)', 'MUL(4)', 'ADD(7)']
});

test('RC2-023 MUST_REJECT: the same chain with a different start term is one pattern', () => {
  assert.equal(buildStructuralSignature(altOps(7)), buildStructuralSignature(altOps(4)),
    'RC1 S2/05 and S2/41 must share one structural signature');
});

test('RC2-023 MUST_ACCEPT: a genuinely different chain is a different pattern', () => {
  const other = {...altOps(7), reasoningPattern: ['ADD(2)', 'MUL(2)', 'ADD(3)', 'MUL(3)', 'ADD(4)', 'MUL(4)', 'ADD(5)']};
  assert.notEqual(buildStructuralSignature(altOps(7)), buildStructuralSignature(other));
});

test('RC2-023: a template with no declared pattern has a null signature', {skip: 'superseded by RC2.2-4: a signature is now DERIVED for every item. Only sequences ever declared a pattern, so 235 of Holdout C\'s 250 items had none and the reasoning-diversity rule governed nothing. tests/rc22-repetition.test.mjs covers the replacement.'}, () => {
  assert.equal(buildStructuralSignature({family: 'ages', templateId: 'AGE_E_SUM_DIFF', askedUnknown: 'olderAgeNow'}), null,
    'an undeclared pattern must not collapse unrelated questions together');
});

test('RC2-023: different rules are not collapsed because their answers coincide', () => {
  const a = {family: 'sequences', templateId: 'SEQ_E_ARITH', askedUnknown: 'nextTerm', reasoningPattern: ['ADD(4)']};
  const b = {family: 'sequences', templateId: 'SEQ_E_GEO', askedUnknown: 'nextTerm', reasoningPattern: ['MUL(2)']};
  assert.notEqual(buildStructuralSignature(a), buildStructuralSignature(b));
});

// --- session behaviour -----------------------------------------------------

test('RC2-022/023: no session repeats a semantic instance or a reasoning pattern', {skip: 'superseded by RC2.2-4: semantic repetition is still forbidden, but reasoning repetition is now a CAP rather than a ban — the hard band offers 45 distinct paths and a hard session asks for 50, so a ban is not satisfiable. tests/rc22-repetition.test.mjs checks both.'}, () => {
  const engine = new Engine();
  for (let s = 0; s < 25; s++) {
    const set = engine.generatePractice({difficulty: 'mixed', count: 50, seed: `rc2-session-${s}`});
    const semantic = set.questions.map(q => q.metadata.semantic_fingerprint);
    assert.equal(new Set(semantic).size, semantic.length, `session ${s}: a semantic instance repeated`);
    const structural = set.questions.map(q => q.metadata.structural_reasoning_signature).filter(Boolean);
    assert.equal(new Set(structural).size, structural.length, `session ${s}: a reasoning pattern repeated`);
  }
});

test('RC2-022/023: the same holds for all-hard sessions', {skip: 'superseded by RC2.2-4, same reason: reasoning repetition is capped, not banned.'}, () => {
  const engine = new Engine();
  for (let s = 0; s < 15; s++) {
    const set = engine.generatePractice({difficulty: 'hard', count: 50, seed: `rc2-hard-${s}`});
    const semantic = set.questions.map(q => q.metadata.semantic_fingerprint);
    assert.equal(new Set(semantic).size, semantic.length, `hard session ${s}: a semantic instance repeated`);
    const structural = set.questions.map(q => q.metadata.structural_reasoning_signature).filter(Boolean);
    assert.equal(new Set(structural).size, structural.length, `hard session ${s}: a reasoning pattern repeated`);
  }
});
