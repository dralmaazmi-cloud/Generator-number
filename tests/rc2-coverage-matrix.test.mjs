// The RC2 coverage matrix: every frozen scope item, with the evidence that
// closes it. The matrix is built from the repository rather than typed by hand,
// so a test name that stops existing shows up as a gap instead of as a stale
// claim, and these tests hold the built matrix to the scope's own rules.

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

import {build} from '../tools/audit/build-coverage-matrix.mjs';

const TERMINAL = ['FIXED', 'MEASUREMENT_CORRECTED', 'RISK_REMEDIATED_AND_MEASURED'];
const FORBIDDEN = ['IGNORED', 'OUT_OF_SCOPE', 'DEFERRED_TO_STAGE_1', 'UNTESTED', 'ASSUMED_FIXED'];

test('coverage matrix: all 23 frozen items are present and none is still PLANNED', () => {
  const m = build();
  assert.equal(m.items.length, 23);
  assert.equal(m.totals.stillPlanned, 0);
  const ids = m.items.map(i => i.id);
  for (let n = 1; n <= 23; n++) {
    assert.ok(ids.includes(`RC2-${String(n).padStart(3, '0')}`), `RC2-${n} missing`);
  }
});

test('coverage matrix: every item ends at a terminal status, none at a forbidden one', () => {
  const m = build();
  for (const i of m.items) {
    assert.ok(TERMINAL.includes(i.status), `${i.id} is at ${i.status}`);
    assert.ok(!FORBIDDEN.includes(i.status), `${i.id} is at the forbidden status ${i.status}`);
  }
  assert.equal(m.totals.atForbiddenStatus, 0);
});

test('coverage matrix: every item carries a root cause, a remediation and a metric', () => {
  const m = build();
  for (const i of m.items) {
    assert.ok(i.rootCause && i.rootCause.length > 40, `${i.id}: root cause`);
    assert.ok(i.plannedRemediation && i.plannedRemediation.length > 40, `${i.id}: remediation`);
    assert.ok(i.developmentCorpusMetric && i.developmentCorpusMetric.length > 15, `${i.id}: metric`);
    assert.ok(Array.isArray(i.affectedProductionPath) && i.affectedProductionPath.length > 0, `${i.id}: path`);
  }
});

test('coverage matrix: every item is proved by tests that actually exist', () => {
  const m = build();
  assert.equal(m.totals.withAutomatedProof, 23);
  for (const i of m.items) {
    assert.ok(i.automatedProofCount > 0, `${i.id} has no automated proof`);
    for (const p of i.automatedProof) {
      const [file] = p.split(' :: ');
      const src = readFileSync(file, 'utf8');
      const title = p.split(' :: ')[1];
      assert.ok(src.includes(title), `${i.id}: ${title} is not in ${file}`);
    }
  }
});

test('coverage matrix: the builder refuses an item it cannot evidence', () => {
  // The matrix is only worth reading if it complains. `problems` must be the
  // empty list because everything is in order, not because nothing is checked.
  const m = build();
  assert.deepEqual(m.problems, []);
  assert.ok(m.totals.totalAutomatedProofs > 100, `${m.totals.totalAutomatedProofs} proofs`);
  assert.ok(m.totals.withRegressionFixture >= 18,
    `${m.totals.withRegressionFixture} items carry a MUST_REJECT / MUST_ACCEPT / meta fixture`);
});

test('coverage matrix: the baseline and scope authority are the frozen ones', () => {
  const m = build();
  assert.equal(m.scopeSchema, 'rc2-scope-frozen-v2');
  assert.equal(m.frozenRC1Baseline, '7b5d4617295c98a8ed0f87d204f4745dd5db05dd');
  assert.equal(m.scopeCommit, 'af61d28d6fd6797288ad767832f354dd91a0d400');
  assert.deepEqual(m.terminalStatuses, TERMINAL);
  assert.deepEqual(m.forbiddenStatuses, FORBIDDEN);
});

test('coverage matrix: the saved file matches what the repository builds', () => {
  const saved = JSON.parse(readFileSync('rc2/COVERAGE_MATRIX.json', 'utf8'));
  const built = build();
  assert.equal(saved.items.length, built.items.length);
  for (const i of built.items) {
    const s = saved.items.find(x => x.id === i.id);
    assert.ok(s, `${i.id} missing from the saved matrix`);
    assert.equal(s.status, i.status, `${i.id} status drifted`);
    assert.equal(s.automatedProofCount, i.automatedProofCount, `${i.id} proof count drifted`);
  }
  assert.deepEqual(saved.problems, []);
});

test('coverage matrix: every evidence artifact it names exists and parses', () => {
  const m = build();
  const named = new Set();
  for (const i of m.items) for (const a of i.evidenceArtifacts) named.add(a);
  assert.ok(named.size >= 6, `${named.size} evidence artifacts named`);
  for (const a of named) {
    const parsed = JSON.parse(readFileSync(a, 'utf8'));
    assert.ok(parsed.schema, `${a} has no schema`);
    assert.ok(parsed.scopeItem, `${a} does not say which item it serves`);
  }
});
