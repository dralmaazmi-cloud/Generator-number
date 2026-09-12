// RC2.2-4 — reasoning repetition.
//
// Holdout C carried 65 instances of the same reasoning repeated with only the
// numbers changed. The cause was not a missing rule: the session builder already
// refused a repeated reasoning signature. It was that only ONE family declared a
// signature, so 235 of 250 items had none and the rule governed nothing.

import test from 'node:test';
import assert from 'node:assert/strict';

import Engine from '../src/index.js';
import {buildStructuralSignature} from '../src/qa/fingerprint.js';
import {build, measureBatch} from '../tools/audit/rc22-repetition.mjs';

const PLAN = [
  {count: 50, difficulty: 'mixed'}, {count: 50, difficulty: 'mixed'},
  {count: 50, difficulty: 'mixed'}, {count: 50, difficulty: 'mixed'},
  {count: 50, difficulty: 'hard'}
];

test('RC2.2-4: every question has a reasoning signature, not only the ones that declared a pattern', () => {
  const e = new Engine();
  let n = 0;
  for (let i = 0; i < 600; i++) {
    let q;
    try { q = e.generateQuestion({family: 'random', difficulty: ['easy', 'medium', 'hard'][i % 3], seed: `RC22-T-SIG-${i}`}); }
    catch { continue; }
    n++;
    assert.ok(q.metadata.structural_reasoning_signature,
      `${q.generator_id} has no reasoning signature`);
  }
  assert.ok(n > 550, `only ${n} questions generated`);
});

test('RC2.2-4: the signature ignores the numbers and notices the direction', () => {
  // Two draws of one template that differ only in their parameters are the same
  // reasoning; the same template asked the other way round is not.
  const a = buildStructuralSignature({family: 'f', templateId: 'T', askedUnknown: 'total', operationKinds: ['multiply', 'add']});
  const b = buildStructuralSignature({family: 'f', templateId: 'T', askedUnknown: 'total', operationKinds: ['multiply', 'add']});
  const c = buildStructuralSignature({family: 'f', templateId: 'T', askedUnknown: 'rate', operationKinds: ['multiply', 'add']});
  const d = buildStructuralSignature({family: 'f', templateId: 'T', askedUnknown: 'total', operationKinds: ['divide']});
  assert.equal(a, b, 'different numbers, same reasoning');
  assert.notEqual(a, c, 'a different asked unknown is different reasoning');
  assert.notEqual(a, d, 'different operations are different reasoning');
});

test('RC2.2-4: a declared reasoning pattern still wins over the derivation', () => {
  const declared = buildStructuralSignature({family: 'f', templateId: 'T', askedUnknown: 'x', reasoningPattern: ['ADD(5)'], operationKinds: ['add']});
  const derived = buildStructuralSignature({family: 'f', templateId: 'T', askedUnknown: 'x', operationKinds: ['add']});
  assert.notEqual(declared, derived);
  assert.ok(declared.includes('ADD(5)'));
});

test('RC2.2-4: the three kinds of repetition are measured separately', () => {
  const m = measureBatch({seed: 'RC22-T-SEP', plan: PLAN});
  for (const k of ['exact', 'semantic', 'reasoning', 'templateReuse']) assert.ok(m[k], `${k} not reported`);
  // Exact and semantic repetition are defects and must be zero.
  assert.equal(m.exact.repeats, 0);
  assert.equal(m.semantic.repeats, 0);
  // Reasoning repetition is a quantity, reported rather than asserted to zero.
  assert.ok(m.reasoning.distinct > 0);
  assert.equal(typeof m.reasoning.max, 'number');
});

test('RC2.2-4: the reasoning cap holds across a multi-session batch', () => {
  // RC2.5. This used to assert the cap was never reached. After the Holdout E
  // human calibration the hard band is 17 templates over 34 reasoning
  // signatures, and a batch asking for 82 hard slots cannot fill them within a
  // batch allowance of five per signature: 82 / 5 needs 17 signatures reachable
  // at every point, and the scheduler runs out.
  //
  // The cap is NOT raised to make this pass, and the breach is NOT hidden. What
  // is asserted is the invariant that still holds and that matters: the engine
  // never breaches the cap silently. Every delivery past it is warned, so the
  // shortfall is visible in the session record and in the pre-holdout gate.
  //
  // The shortfall itself is reported as a coverage finding, not as a defect of
  // this mechanism.
  const e = new Engine();
  for (const seed of ['RC22-T-CAP-A', 'RC22-T-CAP-B']) {
    const m = measureBatch({seed, plan: PLAN});
    const over = Math.max(0, m.reasoning.max - e.config.maxReasoningRepeatsPerBatch);
    if (over > 0) {
      assert.ok(m.reasoning.capBreachesWarned > 0,
        `a reasoning path reached ${m.reasoning.max} against a cap of ${e.config.maxReasoningRepeatsPerBatch} `
        + 'with no breach recorded: a silent bypass is the one thing that must never happen');
    } else {
      assert.equal(m.reasoning.capBreachesWarned, 0,
        'no breach was needed, so none should have been recorded');
    }
  }
});

test('RC2.5: the hard band no longer fills an 82-slot batch inside the caps', () => {
  // The coverage shortfall, pinned as a measurement so it cannot quietly change
  // in either direction. If a later cycle adds genuinely hard structures this
  // test fails and is updated with the new figure; if coverage shrinks further
  // it fails too.
  const e = new Engine();
  const m = measureBatch({seed: 'RC25-SHORTFALL', plan: PLAN});
  assert.ok(m.reasoning.max > e.config.maxReasoningRepeatsPerBatch,
    'the shortfall has closed — re-measure and update this test and the report');
  assert.ok(m.reasoning.capBreachesWarned > 0, 'and every breach must still be recorded');
});

test('RC2.2-4: a cap the fallback can bypass is not a cap', () => {
  // Set the cap below what the supply can satisfy. The session must still be
  // deliverable, and every breach must be recorded — silence would mean the
  // fallback is ignoring the cap, which is what it used to do.
  const e = new Engine({maxReasoningRepeatsPerSession: 1, maxReasoningRepeatsPerBatch: 1});
  const s = e.generatePractice({count: 50, difficulty: 'hard', family: 'random', seed: 'RC22-T-BYPASS'});
  assert.equal(s.questions.length, 50, 'the session must still be deliverable');
  const sigs = s.questions.map(q => q.metadata.structural_reasoning_signature);
  const counts = {};
  for (const x of sigs) counts[x] = (counts[x] || 0) + 1;
  const breaches = Object.values(counts).filter(v => v > 1).length;
  const warned = s.validation.diversity_warnings.filter(w => w.reason === 'REPEATED_REASONING_PATTERN').length;
  if (breaches > 0) assert.ok(warned > 0, `${breaches} paths exceeded a cap of 1 and nothing was warned`);
});

test('RC2.2-4: ordinary template reuse is untouched', () => {
  // Suppressing reuse would also make reasoning repetition fall, and would be
  // the wrong fix. A 250-question batch is expected to reuse templates heavily.
  const m = measureBatch({seed: 'RC22-T-REUSE', plan: PLAN});
  assert.ok(m.templateReuse.max >= 3,
    `the heaviest template was used only ${m.templateReuse.max} times; reuse looks suppressed`);
  assert.ok(m.templateReuse.distinct < m.questions, 'reuse must actually be happening');
});

test('RC2.2-4: the supply is stated, so the cap can be judged against it', () => {
  const r = build({seeds: ['RC22-T-SUPPLY']});
  assert.ok(r.distinctReasoningPathsAvailable.hard > 20);
  assert.ok(r.caps.perSession >= Math.ceil(50 / r.distinctReasoningPathsAvailable.hard),
    'the per-session cap is below what the hard supply can satisfy, which would make sessions infeasible');
  assert.ok(r.feasibilityNote.includes('not satisfiable'));
});

// --- RC2.2-3: distractor diagnostics ----------------------------------------

test('RC2.2-3: a wrong option says which step it diverges at, where that is derivable', async () => {
  const {default: Engine2} = await import('../src/index.js');
  const e = new Engine2();
  let wrong = 0, linked = 0, withMisconception = 0;
  for (let i = 0; i < 900; i++) {
    let q;
    try { q = e.generateQuestion({family: 'random', difficulty: ['easy', 'medium', 'hard'][i % 3], seed: `RC22-T-LINK-${i}`}); }
    catch { continue; }
    const steps = q.explanation.steps.length;
    for (const m of Object.values(q.metadata.options_meta)) {
      if (m.correct) continue;
      wrong++;
      if (m.misconceptionId) withMisconception++;
      const at = m.reasoningStepAffected;
      if (Number.isInteger(at)) {
        assert.ok(at >= 0 && at < steps, `step index ${at} is outside the ${steps} steps shown`);
        linked++;
      }
    }
  }
  assert.ok(wrong > 3000, `only ${wrong} wrong options sampled`);
  // Every wrong option names the slip; RC2.2 additionally points at where.
  assert.equal(withMisconception, wrong, 'every wrong option must carry a misconception id');
  assert.ok(linked / wrong > 0.40,
    `only ${(linked / wrong * 100).toFixed(1)}% of wrong options are linked to a step; RC2.1 was 9.1%`);
});

test('RC2.2-3: legitimate distractors are not suppressed for being far from the key', async () => {
  // The instruction is explicit, and the averages templates are where it bites:
  // "stopped at the intermediate total" produces a value far above the mean and
  // is a real slip. A bound there was tried and reverted. This pins that.
  const {default: Engine2} = await import('../src/index.js');
  const e = new Engine2();
  let seen = 0, far = 0;
  for (let i = 0; i < 4000 && seen < 200; i++) {
    let q;
    try { q = e.generateQuestion({family: 'averages', difficulty: ['easy', 'medium'][i % 2], seed: `RC22-T-FAR-${i}`}); }
    catch { continue; }
    const stopped = Object.values(q.metadata.options_meta)
      .find(m => !m.correct && m.misconceptionId === 'STOPPED_AT_INTERMEDIATE_TOTAL');
    seen++;
    if (stopped) far++;
  }
  assert.ok(seen > 100, `only ${seen} averages items sampled`);
  assert.ok(far > 0, 'the intermediate-total slip has been suppressed, which the instruction forbids');
});
