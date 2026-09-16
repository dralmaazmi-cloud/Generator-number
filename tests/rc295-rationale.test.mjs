// RC2.9.5 §1.1 and §1.3. The two findings RC2.9.4 left open, held shut.
//
// §1.1 D1 was reported as a zero and was not one. An independent scan of 4,000
// wrong options found reason sentences shown in four or more families, several
// naming an operation, and two that were false where they landed. The rule is
// now stated in code and checked here:
//
//   * a sentence shown family-wide may not name an operation, and only the
//     twelve declared in FAMILY_NEUTRAL may be shown family-wide;
//   * a sentence that says what THE SOLUTION needs is checked against the
//     question's own operation profile, not only against the derivation;
//   * where neither check can be satisfied, the factual line is shown and no
//     reason is invented.
//
// §1.3 «× 1» and «÷ 1» are artifacts of uniform derivations, not operations a
// learner performed. They are stripped before anything reads a derivation.

import test from 'node:test';
import assert from 'node:assert/strict';

import Engine from '../src/index.js';
import {
  FAMILY_NEUTRAL, FAMILY_SUBJECT, SITE_VARIANTS, FACTUAL_FALLBACK,
  namesAnOperation, solutionClaims, claimedOperations, operationsIn,
  stripIdentityOperations, renderRationale, rationaleProblems
} from '../src/qa/rationale.js';

const engine = new Engine();
const FAMILIES = engine.listFamilies().map(f => f.id);

const reasonOf = text => {
  const split = /^(اخترت [^]*?(?:، وهي ناتج [^]*?)?\.)\s+([^]*)$/u.exec(String(text ?? ''));
  return split ? split[2].trim() : String(text ?? '').trim();
};

/** One corpus, reused by every measurement below. */
const CORPUS = (() => {
  const rows = [];
  for (let i = 0; i < 40; i++) {
    for (const band of ['easy', 'medium', 'hard']) {
      for (const family of FAMILIES) {
        let q;
        try { q = engine.generateQuestion({family, difficulty: band, seed: `rc295-rationale|${band}|${family}|${i}`}); }
        catch { continue; }
        for (const [letter, m] of Object.entries(q.metadata.options_meta ?? {})) {
          if (m.correct) continue;
          rows.push({
            family: q.family, templateId: q.metadata.template_id, letter,
            text: q.explanation.distractor_analysis[letter],
            reason: reasonOf(q.explanation.distractor_analysis[letter]),
            derivation: m.derivation, value: m.value, optionText: q.options[letter],
            solutionOperations: q.metadata.operation_kinds ?? []
          });
        }
      }
    }
  }
  return rows;
})();

test('RC2.9.5-1.1: the corpus this is measured on is big enough to mean something', () => {
  assert.ok(CORPUS.length >= 4000, `${CORPUS.length} wrong options`);
});

test('RC2.9.5-1.1: the declared family-neutral set is at most twelve sentences and names no operation', () => {
  assert.ok(FAMILY_NEUTRAL.length <= 12, `${FAMILY_NEUTRAL.length} declared`);
  for (const sentence of FAMILY_NEUTRAL) {
    assert.equal(namesAnOperation(sentence), false, `family-neutral sentence names an operation: ${sentence}`);
  }
  assert.equal(new Set(FAMILY_NEUTRAL).size, FAMILY_NEUTRAL.length, 'the declared set repeats a sentence');
});

test('RC2.9.5-1.1: nothing outside the declared set is shown in four or more families', () => {
  const byFamily = new Map();
  for (const r of CORPUS) {
    if (!byFamily.has(r.reason)) byFamily.set(r.reason, new Set());
    byFamily.get(r.reason).add(r.family);
  }
  const wide = [...byFamily.entries()].filter(([, fams]) => fams.size >= 4).map(([s]) => s);
  const undeclared = wide.filter(s => !FAMILY_NEUTRAL.includes(s) && s !== FACTUAL_FALLBACK);
  assert.deepEqual(undeclared, [], `shown in 4+ families but not declared:\n${undeclared.join('\n')}`);
  const namingAnOperation = wide.filter(namesAnOperation);
  assert.deepEqual(namingAnOperation, [], `family-wide sentences naming an operation:\n${namingAnOperation.join('\n')}`);
});

test('RC2.9.5-1.1: no reason names an operation the SOLUTION does not use', () => {
  const offenders = CORPUS.filter(r =>
    r.solutionOperations.length && [...solutionClaims(r.reason)].some(op => !r.solutionOperations.includes(op)));
  assert.equal(offenders.length, 0,
    offenders.slice(0, 5).map(o => `${o.templateId} ${o.letter}: ${o.reason} | solution ${o.solutionOperations.join(',')}`).join('\n'));
});

test('RC2.9.5-1.1: no reason names an operation its own derivation does not contain', () => {
  const offenders = CORPUS.filter(r => {
    const ops = operationsIn(r.derivation);
    return ops.size && [...claimedOperations(r.reason)].some(op => !ops.has(op));
  });
  assert.equal(offenders.length, 0, offenders.slice(0, 5).map(o => `${o.templateId}: ${o.reason} | ${o.derivation}`).join('\n'));
});

test('RC2.9.5-1.1: every family has its own subject phrase, and every site sentence uses it', () => {
  for (const family of FAMILIES) assert.ok(FAMILY_SUBJECT[family], `no subject phrase for ${family}`);
  for (const [id, byFamily] of Object.entries(SITE_VARIANTS)) {
    const rendered = Object.values(byFamily);
    assert.equal(new Set(rendered).size, rendered.length, `${id} renders the same sentence for two families`);
    for (const [family, sentence] of Object.entries(byFamily)) {
      assert.ok(sentence.includes(FAMILY_SUBJECT[family]), `${id}/${family} lost its subject phrase`);
      assert.ok(!sentence.includes('{subject}'), `${id}/${family} left the slot unfilled`);
    }
  }
});

test('RC2.9.5-1.3: no published rationale prints a multiplication or division by one', () => {
  const offenders = CORPUS.filter(r => /[÷×]\s*1(?![\d.])/u.test(r.text) || /(^|[(=\s])1\s*×/u.test(r.text));
  assert.equal(offenders.length, 0, offenders.slice(0, 5).map(o => `${o.templateId}: ${o.text}`).join('\n'));
});

test('RC2.9.5-1.3: the identity strip leaves every real operation alone', () => {
  assert.equal(stripIdentityOperations('1 × 4'), '4');
  assert.equal(stripIdentityOperations('5 ÷ 1'), '5');
  assert.equal(stripIdentityOperations('8 × 1 ÷ 5'), '8 ÷ 5');
  assert.equal(stripIdentityOperations('21 × 1.5'), '21 × 1.5');
  assert.equal(stripIdentityOperations('180 ÷ (3 × 5)'), '180 ÷ (3 × 5)');
  assert.equal(stripIdentityOperations('(3 + 1) × 2'), '(3 + 1) × 2');
});

test('RC2.9.5-1.1: an unverifiable claim becomes the factual line rather than a softer claim', () => {
  const r = renderRationale({
    optionText: '31', value: 31, misconceptionId: 'SUBTRACTED_INSTEAD_OF_ADDED',
    derivation: '40 − 9', family: 'ratios', templateId: 'RAT_E_KNOWN',
    solutionOperations: ['divide', 'multiply']
  });
  assert.match(r, /ليست التي تقتضيها/);
  assert.equal(rationaleProblems({text: r, derivation: '40 − 9', family: 'ratios', value: 31,
    optionText: '31', solutionOperations: ['divide', 'multiply']}).length, 0);
});

test('RC2.9.5-1.1: the factual line stays rare — a reason is the norm, not the exception', () => {
  const fallback = CORPUS.filter(r => r.reason === FACTUAL_FALLBACK).length;
  const rate = fallback / CORPUS.length;
  assert.ok(rate <= 0.05, `${(100 * rate).toFixed(2)}% of wrong options carry no reason`);
});
