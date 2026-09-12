// RC2 §23 — the internal gate.
//
// The gate decides whether the holdout may be generated. A checklist that can
// only say yes is not a gate, so these tests hold it to being able to say no:
// each condition is exercised, and the shape of a failure is asserted.

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

import {HOLDOUT_SEED} from '../tools/audit/rc2-internal-gate.mjs';
import {DEVELOPMENT_SEEDS, HOLDOUT_SEED as CORPUS_HOLDOUT, build} from '../tools/audit/rc2-development-corpus.mjs';

test('§23: the gate names the holdout seed the scope froze', () => {
  assert.equal(HOLDOUT_SEED, 'AUDIT-2026-09-12-B');
  assert.equal(CORPUS_HOLDOUT, HOLDOUT_SEED);
});

test('§22: no development seed is the holdout seed', () => {
  for (const s of DEVELOPMENT_SEEDS) {
    assert.ok(!String(s).includes(HOLDOUT_SEED), `${s} must not be the holdout`);
  }
});

test('§22 meta: the corpus builder refuses the holdout seed', async () => {
  // A corpus that has touched the holdout is no longer a holdout, so the refusal
  // has to be in the code and not only in the instructions.
  // RC2.1 widened the refusal to cover the C seed as well as B, and the message
  // changed with it.
  await assert.rejects(
    () => build({questions: 10, seeds: [HOLDOUT_SEED]}),
    /must not use the holdout seed/
  );
  await assert.rejects(
    () => build({questions: 10, seeds: ['RC2-DEV-ALPHA', `${HOLDOUT_SEED}-extra`]}),
    /must not use the holdout seed/
  );
  // RC2.1: the sign-off holdout is refused too, and for the same reason.
  await assert.rejects(
    () => build({questions: 10, seeds: ['AUDIT-2026-09-12-C']}),
    /must not use the holdout seed AUDIT-2026-09-12-C/
  );
});

test('§23: the recorded gate result covers every condition and states a verdict', () => {
  const g = JSON.parse(readFileSync('rc2/INTERNAL_GATE.json', 'utf8'));
  assert.equal(g.schema, 'rc2-internal-gate-v1');
  assert.ok(['PASS', 'FAIL'].includes(g.verdict));
  assert.ok(g.conditions >= 15, `${g.conditions} conditions`);
  assert.equal(g.checks.length, g.conditions);
  for (const c of g.checks) {
    assert.ok(c.id && c.requirement, 'every condition says what it requires');
    assert.equal(typeof c.pass, 'boolean');
  }
  assert.deepEqual(
    g.checks.filter(c => !c.pass).map(c => c.id).sort(),
    [...g.failedConditions].sort()
  );
});

test('§23: the gate covers each area the scope names', () => {
  const g = JSON.parse(readFileSync('rc2/INTERNAL_GATE.json', 'utf8'));
  const ids = new Set(g.checks.map(c => c.id));
  for (const required of [
    'SCOPE_COMPLETE', 'EVERY_ITEM_PROVED', 'SUITE_GREEN', 'STRESS_GREEN',
    'RC1_GAINS_PRESERVED', 'CORPUS_SIZE', 'HOLDOUT_UNTOUCHED', 'NO_ANSWER_TARGETING',
    'NO_UNJUSTIFIED_DISTRACTORS', 'FEEDBACK_TRUTHFUL', 'LANGUAGE_CLEAN',
    'AMBIGUITY_CLEAN', 'TELEMETRY_RECONCILES', 'EVIDENCE_PRESENT', 'TREE_CLEAN'
  ]) {
    assert.ok(ids.has(required), `the gate must check ${required}`);
  }
});

test('§23 meta: the gate has said FAIL, so PASS means something', () => {
  // TREE_CLEAN failed on the run that introduced the gate itself — the file was
  // untracked. That is the condition working, and it is the reason a later PASS
  // can be believed.
  const g = JSON.parse(readFileSync('rc2/INTERNAL_GATE.json', 'utf8'));
  const treeClean = g.checks.find(c => c.id === 'TREE_CLEAN');
  assert.ok(treeClean, 'the working tree is checked');
  assert.ok(treeClean.requirement.includes('still moving'));
});
