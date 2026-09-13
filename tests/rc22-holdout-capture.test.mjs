// RC2.2-6 — evidence quality.
//
// Holdout B's preserved corpus recorded stems, options and keys and nothing
// else. That left every sequences item unanswerable in the blind package,
// because the stimulus was never written down, and made feedback quality
// unreviewable without regenerating. These tests hold the Holdout C capture to
// recording everything at FIRST generation, and to keeping reviewer-visible and
// reviewer-hidden data in separate files.
//
// They exercise the machinery on a throwaway seed. AUDIT-2026-09-12-D is
// generated exactly once, after the freeze, and never here.

import test from 'node:test';
import assert from 'node:assert/strict';
import {gunzipSync} from 'node:zlib';

import {buildHoldoutC, HOLDOUT_SEED, SESSION_PLAN} from '../tools/audit/rc22-holdout.mjs';

const built = buildHoldoutC({seed: 'RC22-CAPTURE-TEST'});
const blind = gunzipSync(built.blindGz).toString('utf8').trim().split('\n').map(l => JSON.parse(l));
const full = gunzipSync(built.fullGz).toString('utf8').trim().split('\n').map(l => JSON.parse(l));

test('RC2.2-6: the real holdout seed is not touched by the test path', () => {
  assert.equal(HOLDOUT_SEED, 'AUDIT-2026-09-12-D');
  assert.notEqual(built.report.holdoutSeed, HOLDOUT_SEED);
  assert.equal(built.report.previousHoldouts[0].reused, false);
});

test('RC2.2-6: 250 questions, five sessions, four mixed and one all-hard', {skip: 'superseded by RC2.7-R2: this regenerates a holdout plan whose all-hard session is fifty questions, and the core construction control added in RC2.7-R is absolute — a session that cannot be filled without repeating a core construction is refused rather than completed with parameter reskins. The hard band supports about thirty-five, so the historical plan is no longer generable by this engine. The plan itself is NOT changed: Holdouts C, D, E and F were sealed against the engines that produced them and rewriting their shape would falsify a record. The shortfall is asserted directly in tests/rc27-diversity.test.mjs.'}, () => {
  assert.equal(blind.length, 250);
  assert.equal(full.length, 250);
  assert.equal(SESSION_PLAN.filter(p => p.kind === 'MIXED').length, 4);
  assert.equal(SESSION_PLAN.filter(p => p.kind === 'ALL_HARD').length, 1);
  assert.equal(built.report.sessions.length, 5);
});

test('RC2.2-6: the blind file carries no key, and the full file carries every one', () => {
  for (const b of blind) {
    for (const forbidden of ['correctOption', 'correctValue', 'explanation', 'optionsMeta',
      'semanticFingerprint', 'difficultyEvidence', 'targetMisconception']) {
      assert.ok(!(forbidden in b), `${b.itemId} leaks ${forbidden} into the blind file`);
    }
    assert.equal(Object.keys(b.options).length, 6);
  }
  for (const f of full) {
    assert.ok(f.correctOption && f.correctValue !== undefined, `${f.itemId} has no key`);
  }
});

test('RC2.2-6: the stimulus is recorded as rendered, not left to be reconstructed', () => {
  // This is the B defect exactly. Sequences and odd-one-out render a stimulus
  // beside the stem; B recorded neither, and the blind package had to rebuild
  // them from fingerprint parameters.
  const withStimulus = blind.filter(b => b.stimulus);
  assert.ok(withStimulus.length > 0, 'no stimulus captured at all');
  for (const fam of ['sequences', 'odd_one_out']) {
    const items = blind.filter(b => b.family === fam);
    if (!items.length) continue;
    for (const it of items) {
      assert.ok(typeof it.stimulus === 'string' && it.stimulus.length > 0,
        `${it.itemId} (${fam}) has no stimulus: ${it.stem}`);
    }
  }
});

test('RC2.2-6: every field a reviewer needs for feedback quality is preserved', () => {
  for (const f of full) {
    assert.ok(f.explanation?.steps?.length > 0, `${f.itemId} has no solution steps`);
    assert.ok(f.optionsMeta && Object.keys(f.optionsMeta).length === 6, `${f.itemId} options_meta`);
    const wrong = Object.values(f.optionsMeta).filter(m => !m.correct);
    assert.equal(wrong.length, 5, `${f.itemId} should have five wrong options`);
    for (const m of wrong) {
      assert.ok(m.misconceptionId, `${f.itemId} has an option with no misconception id`);
      assert.ok(m.derivation, `${f.itemId} has an option with no derivation`);
    }
    assert.ok(f.difficultyEvidence?.factors, `${f.itemId} has no difficulty evidence`);
    assert.ok(f.semanticFingerprint, `${f.itemId} has no semantic fingerprint`);
    assert.ok('structuralReasoningSignature' in f, `${f.itemId} has no reasoning signature field`);
  }
});

test('RC2.2-6: unmeasured latency is null, never zero', () => {
  const p = built.report.performance;
  assert.equal(p.perQuestionLatencyMeasured, false);
  assert.equal(p.latencyP50Ms, null);
  assert.equal(p.latencyP95Ms, null);
  assert.equal(p.latencyP99Ms, null);
  // What IS measured is reported as a number.
  assert.equal(typeof p.msPerQuestion, 'number');
  assert.ok(p.msPerQuestion > 0);
});

test('RC2.2-6: the holdout is generated as one batch, so no instance repeats across it', {skip: 'superseded by RC2.7-R2: this regenerates a holdout plan whose all-hard session is fifty questions, and the core construction control added in RC2.7-R is absolute — a session that cannot be filled without repeating a core construction is refused rather than completed with parameter reskins. The hard band supports about thirty-five, so the historical plan is no longer generable by this engine. The plan itself is NOT changed: Holdouts C, D, E and F were sealed against the engines that produced them and rewriting their shape would falsify a record. The shortfall is asserted directly in tests/rc27-diversity.test.mjs.'}, () => {
  assert.equal(built.report.generatedAsOneBatch, true);
  const fps = full.map(f => f.semanticFingerprint);
  assert.equal(new Set(fps).size, 250, `${250 - new Set(fps).size} repeated instances`);
});

test('RC2.2-6: the session accounting closes on the holdout itself', {skip: 'superseded by RC2.7-R2: this regenerates a holdout plan whose all-hard session is fifty questions, and the core construction control added in RC2.7-R is absolute — a session that cannot be filled without repeating a core construction is refused rather than completed with parameter reskins. The hard band supports about thirty-five, so the historical plan is no longer generable by this engine. The plan itself is NOT changed: Holdouts C, D, E and F were sealed against the engines that produced them and rewriting their shape would falsify a record. The shortfall is asserted directly in tests/rc27-diversity.test.mjs.'}, () => {
  const t = built.report.sessionTelemetry;
  assert.equal(t.balanced, true);
  assert.equal(t.difference, 0);
  assert.equal(t.delivered, 250);
  assert.equal(built.report.engineTelemetry.balanced, true);
});

test('RC2.2-6: blind and full describe the same 250 items in the same order', () => {
  assert.deepEqual(blind.map(b => b.itemId), full.map(f => f.itemId));
  for (let i = 0; i < blind.length; i++) {
    assert.equal(blind[i].stem, full[i].stem);
    assert.equal(blind[i].stimulus, full[i].stimulus);
    assert.deepEqual(Object.values(blind[i].options), Object.values(full[i].options));
  }
});
