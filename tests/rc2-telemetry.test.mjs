// RC2-003 — one rejection/resampling telemetry architecture.
//
// RC1 measured two boundaries (a finalisation throw, a pipeline verdict) and
// reported a 0.19% rejection rate from them. Everything discarded below those
// boundaries was invisible: the odd-one-out sampler alone threw away 135 of
// 1,256 draws and none of it was counted anywhere. Two reason codes,
// DISTRACTOR_IMPOSSIBLE and RETRY_EXHAUSTED, were declared with no emission
// site at all.
//
// These tests hold the architecture to four things:
//   1. every proposal ends exactly once, and the totals reconcile arithmetically;
//   2. resampling work is reported as work, never folded into the disposition;
//   3. the two formerly dead codes have real, reachable semantics;
//   4. no rejection layer sits outside telemetry.
//
// Meta-tests are included: a reconciliation that cannot fail proves nothing.

import test from 'node:test';
import assert from 'node:assert/strict';
import {readdirSync, readFileSync} from 'node:fs';

import Engine from '../src/index.js';
import {GenerationTelemetry} from '../src/qa/telemetry.js';
import {usable, mk} from '../src/families/_shared.js';
import {REASON, ALL_REASONS} from '../src/qa/reasons.js';

const REQUIRED_EVENT_FIELDS = [
  'stage', 'reasonCode', 'family', 'templateId', 'attempt', 'seed',
  'publishedBoundaryReached'
];

/** A real corpus, not a mock: 600 questions across all three bands. */
function corpus(n = 600) {
  const engine = new Engine();
  const bands = ['easy', 'medium', 'hard'];
  for (let i = 0; i < n; i++) {
    try {
      engine.generateQuestion({family: 'random', difficulty: bands[i % 3], seed: `rc2-tel-${i}`});
    } catch { /* an exhaustion is itself a telemetry event; keep going */ }
  }
  return engine;
}

// --- 1. the totals reconcile ------------------------------------------------

test('RC2-003: every proposal ends exactly once and the totals reconcile', () => {
  const s = corpus().getTelemetry();
  assert.ok(s.proposals > 0, 'the corpus must actually have proposed something');
  assert.equal(
    s.reconciliation.accountedFor,
    s.published + s.samplerFailures + s.finalizationFailures + s.pipelineRejectedCandidates
  );
  assert.equal(s.reconciliation.difference, 0, JSON.stringify(s.reconciliation));
  assert.equal(s.reconciliation.balanced, true);
});

test('RC2-003 meta: the reconciliation can fail', () => {
  // If this passes with an unaccounted proposal, the check is decorative.
  const t = new GenerationTelemetry();
  t.proposal({family: 'speed', seed: 's', attempt: 1});
  t.published({family: 'speed', templateId: 'T', seed: 's', attempt: 1});
  assert.equal(t.snapshot().reconciliation.balanced, true);

  t.proposal({family: 'speed', seed: 's2', attempt: 1}); // ends nowhere
  const broken = t.snapshot().reconciliation;
  assert.equal(broken.balanced, false);
  assert.equal(broken.difference, 1);
});

// --- 2. work is not a disposition -------------------------------------------

test('RC2-003: internal resampling is reported as work, outside the disposition', () => {
  const s = corpus().getTelemetry();
  // The layer RC1 could not see at all.
  assert.ok(s.familyResamples > 0, 'internal resampling must now be visible');
  assert.ok(s.internalResamplesPerProposal > 0);
  // ...and it must not be double-counted as a way a proposal ended.
  assert.equal(
    s.reconciliation.accountedFor + 0 * s.familyResamples,
    s.reconciliation.proposals
  );
  assert.ok(
    !Object.keys(s.reconciliation.breakdown).includes('familyResamples'),
    'familyResamples is work per proposal, not a disposition'
  );
});

test('RC2-003: one rejected candidate may carry several reasons, and the two are counted apart', () => {
  const t = new GenerationTelemetry();
  t.proposal({family: 'ratios', seed: 's', attempt: 1});
  t.pipelineRejectedCandidate();
  t.pipelineRejection({family: 'ratios', templateId: 'T', reasonCode: REASON.REDUCIBLE_RATIO, seed: 's', attempt: 1});
  t.pipelineRejection({family: 'ratios', templateId: 'T', reasonCode: REASON.EQUAL_RATIO_SIDES, seed: 's', attempt: 1});
  const s = t.snapshot();
  assert.equal(s.pipelineRejections, 2, 'reasons');
  assert.equal(s.pipelineRejectedCandidates, 1, 'candidates');
  assert.equal(s.reconciliation.balanced, true, 'the reconciliation counts candidates, not reasons');
});

// --- 3. every event carries the mandated fields ------------------------------

test('RC2-003: every recorded event carries the mandated fields', () => {
  const engine = corpus(200);
  const events = engine.telemetry.events;
  assert.ok(events.length > 0);
  for (const e of events) {
    for (const f of REQUIRED_EVENT_FIELDS) {
      assert.ok(f in e, `event at stage ${e.stage} is missing ${f}`);
    }
    assert.equal(typeof e.stage, 'string');
    assert.equal(typeof e.publishedBoundaryReached, 'boolean');
  }
  // A proposal that never reached the publishable boundary must say so.
  for (const e of events) {
    if (['proposal', 'family_sampler', 'sampler_failure', 'finalization', 'distractor_filter'].includes(e.stage)) {
      assert.equal(e.publishedBoundaryReached, false, `${e.stage} is below the publish boundary`);
    }
    if (['pipeline', 'diversity', 'published'].includes(e.stage)) {
      assert.equal(e.publishedBoundaryReached, true, `${e.stage} is at the publish boundary`);
    }
  }
});

test('RC2-003: every emitted reason code is a declared reason code', () => {
  const engine = corpus(300);
  const undeclared = Object.keys(engine.getTelemetry().byReason).filter(r => !ALL_REASONS.includes(r));
  assert.deepEqual(undeclared, [], 'telemetry must not invent reason vocabulary');
});

// --- 4. the two formerly dead codes have real semantics ----------------------

test('RC2-003: DISTRACTOR_IMPOSSIBLE is emitted where a distractor is actually dropped', () => {
  const t = new GenerationTelemetry();
  const ctx = {telemetry: t, family: 'speed', seed: 'drop-test'};
  const kept = usable(ctx, [
    mk(12, 'OFF_BY_ONE_STEP', 'plausible'),
    mk(-4, 'OFF_BY_ONE_STEP', 'negative count'),
    mk(0, 'OFF_BY_ONE_STEP', 'zero count'),
    mk(35.714286, 'OFF_BY_ONE_STEP', 'beyond the displayed precision')
  ]);
  assert.deepEqual(kept.map(d => d.value), [12]);
  assert.equal(t.byReason[REASON.DISTRACTOR_IMPOSSIBLE], 3);
  const drops = t.events.filter(e => e.stage === 'distractor_filter');
  assert.deepEqual(drops.map(e => e.detail).sort(),
    ['negative', 'precision beyond the displayed format', 'zero']);
});

test('RC2-003: DISTRACTOR_IMPOSSIBLE is reached by ordinary generation, not only by the unit test', () => {
  const s = corpus(300).getTelemetry();
  assert.ok((s.byReason[REASON.DISTRACTOR_IMPOSSIBLE] ?? 0) > 0,
    'the code must be reachable on the real generation path');
});

test('RC2-003 meta: usable() without telemetry still filters, and records nothing', () => {
  const kept = usable({}, [mk(5, 'OFF_BY_ONE_STEP', 'ok'), mk(-1, 'OFF_BY_ONE_STEP', 'bad')]);
  assert.deepEqual(kept.map(d => d.value), [5]);
});

test('RC2-003: RETRY_EXHAUSTED is emitted when the retry budget actually runs out', () => {
  // A one-attempt budget on a seed whose single candidate cannot be finalised:
  // the distractor pool falls below five. The failure is real, not injected.
  //
  // Repinned again for RC2.4: eighteen new hard structures change which
  // templates a hard draw can land on, so they change which seeds reach an
  // unfinalisable candidate. The fixture pins the CONDITION — a budget that
  // genuinely runs out — not the draw, and is re-found each time the corpus
  // moves rather than being preserved by loosening the assertion.
  // Repinned again for RC2.5: the relational count template's option set was
  // rebuilt with per-slip provenance, which moves the corpus once more.
  //
  // Repinned again for RC2.7: eight new structures and a recomposed stem layer
  // move the corpus once more. The replacement was found by searching for a
  // seed that exhausts on the SAME condition the fixture has always pinned — a
  // distractor pool below five — not by taking the first seed that threw.
  //
  // This seed replaced an earlier one that exhausted on REDUCIBLE_RATIO. RC2-003's
  // cost measurement found that rejection was 69% of three ratio templates' draws
  // and moved the constraint into the sampler, so that rejection no longer
  // happens and the old fixture stopped exhausting — which is the fixture doing
  // its job, not failing.
  const engine = new Engine({maxGenerationAttempts: 1});
  assert.throws(
    () => engine.generateQuestion({family: 'random', difficulty: 'hard', seed: 'exh-rc27-132'}),
    err => err.code === 'QUESTION_GENERATION_EXHAUSTED'
  );
  const s = engine.getTelemetry();
  assert.equal(s.exhaustions, 1);
  assert.equal(s.byReason[REASON.RETRY_EXHAUSTED], 1);
  const e = engine.telemetry.events.find(x => x.stage === 'exhaustion');
  assert.equal(e.reasonCode, REASON.RETRY_EXHAUSTED);
  assert.ok(e.family, 'the exhaustion must name the family it gave up on');
  assert.equal(e.attempt, 1, 'and the budget it exhausted');
});

test('RC2-003 meta: a budget that does not run out emits no exhaustion', () => {
  const engine = new Engine();
  engine.generateQuestion({family: 'random', difficulty: 'hard', seed: 'exh-rc27-132'});
  assert.equal(engine.getTelemetry().exhaustions, 0);
});

// --- 5. no rejection layer outside telemetry ---------------------------------

test('RC2-003: no family sampler discards a draw by silent self-recursion', () => {
  // Every internal resample must go through resample(), which counts it. A bare
  // `return sameFunction(ctx)` is the shape that made 474 discards invisible.
  const dir = 'src/families';
  const offenders = [];
  for (const file of readdirSync(dir).filter(f => f.endsWith('.js'))) {
    const src = readFileSync(`${dir}/${file}`, 'utf8');
    let current = null;
    src.split('\n').forEach((line, i) => {
      const decl = /^(?:export\s+)?function\s+([A-Za-z0-9_]+)\s*\(/.exec(line);
      if (decl) current = decl[1];
      if (!current) return;
      const call = new RegExp(`return\\s+${current}\\s*\\(`).exec(line);
      if (call) offenders.push(`${file}:${i + 1} ${current}`);
    });
  }
  assert.deepEqual(offenders, [], 'these resample without telemetry');
});

test('RC2-003: a session reports telemetry for every question it published', () => {
  const engine = new Engine();
  const session = engine.generatePractice({count: 12, difficulty: 'mixed', seed: 'rc2-tel-session'});
  const s = engine.getTelemetry();
  assert.equal(session.questions.length, 12);
  // RC2.7-5: a session now REFUSES candidates on novelty as well as on the
  // template and reasoning caps, so the engine publishes more candidates than
  // the session delivers. What must hold is that every published candidate is
  // accounted for — which is the reconciliation below — not that the two
  // numbers coincide, which they only did while nothing was being refused.
  assert.ok(s.published >= 12, `${s.published} published for 12 delivered`);
  assert.equal(s.sessionReconciliation.delivered, 12);
  assert.equal(s.sessionReconciliation.balanced, true, JSON.stringify(s.sessionReconciliation));
  assert.equal(s.reconciliation.balanced, true, JSON.stringify(s.reconciliation));
  // Per-template accounting must agree with the totals. A proposal is recorded
  // before the sampler has chosen a template, so `proposals` is only populated
  // for stages that know one; what must hold is that the per-template published
  // counts sum to the session's published total.
  const perTemplatePublished = Object.values(s.byTemplate).reduce((a, t) => a + t.published, 0);
  assert.equal(perTemplatePublished, s.published);
  assert.ok(Object.keys(s.byTemplate).length > 1, 'a mixed session must span templates');
});

test('RC2-003: reset clears every counter, stage, reason and event', () => {
  const engine = corpus(30);
  engine.resetTelemetry();
  const s = engine.getTelemetry();
  assert.equal(s.proposals, 0);
  assert.equal(s.published, 0);
  assert.equal(s.familyResamples, 0);
  assert.deepEqual(s.byStage, {});
  assert.deepEqual(s.byReason, {});
  assert.deepEqual(s.byTemplate, {});
  assert.equal(engine.telemetry.events.length, 0);
});

// --- the cost of the newly visible activity (RC2-003 evidence) --------------

test('RC2-003 cost: the rejection activity is cheap, and the cheapness is measured', async () => {
  const {measure} = await import('../tools/audit/rc2-003-cost.mjs');
  const report = await measure({questions: 600, seedPrefix: 'rc2-003-cost-test'});
  assert.ok(report.corpus.published > 590, `the corpus must be real, got ${report.corpus.published}`);

  // The activity really is large — if it were not, this report would be moot.
  assert.ok(report.activity.distractorDrops > 200, 'the drops must actually be happening');
  // RC2.6 lowered from 300 to 250: ten new hard structures changed the template
  // mix, and this fixed-size corpus now records 296 rather than ~340. The bar
  // exists to show the activity is substantial enough for the cost report to
  // mean something, not to pin a particular number.
  assert.ok(report.activity.samplerResamples > 250,
    `only ${report.activity.samplerResamples} sampler resamples`);

  // ...and it really is cheap, because a drop costs no attempt until it pushes a
  // pool below five.
  assert.ok(report.cost.meanAttemptsPerPublished < 1.2, `mean attempts ${report.cost.meanAttemptsPerPublished}`);
  assert.ok(report.cost.p95Attempts <= 2, `p95 attempts ${report.cost.p95Attempts}`);
  assert.equal(report.cost.retryExhaustions, 0);
  assert.ok(report.cost.latencyP95Ms < 50, `p95 latency ${report.cost.latencyP95Ms}ms`);

  // The two prices must be reported apart. Folding them together would report a
  // large number as though it were a large cost.
  assert.ok(report.activity.attemptsBurnedPerPublished < report.activity.distractorDropsPerPublished,
    'drops must not be counted as burned attempts');
});

test('RC2-003 cost: the unabsorbed per-draw rate is reported, not hidden by retries', async () => {
  const {measure} = await import('../tools/audit/rc2-003-cost.mjs');
  const report = await measure({questions: 300, seedPrefix: 'rc2-003-unabsorbed-test'});
  assert.ok(Array.isArray(report.unabsorbed.worstTemplates));
  for (const t of report.unabsorbed.worstTemplates) {
    assert.ok(t.draws > 0 && t.combinedFailureRate > 0.05);
    assert.ok(t.templateId && t.family);
  }
  // The ratios templates were the worst offenders, ~69% of draws refused by the
  // pipeline for an unreduced printed ratio. That constraint now lives in the
  // sampler, so no ratios template may be refused for it any more. (A residual
  // finalisation failure is a pool-depth matter, not this one, and is reported
  // in its own column rather than asserted away here.)
  const wasted = report.unabsorbed.worstTemplates.filter(t => t.family === 'ratios' && t.pipelineRejectionRate > 0);
  assert.deepEqual(wasted, [], `ratios draws still refused by the pipeline: ${JSON.stringify(wasted)}`);
});

test('RC2-003 cost: the published artifact matches the engine', () => {
  const saved = JSON.parse(readFileSync('rc2/RC2_003_REJECTION_COST.json', 'utf8'));
  assert.equal(saved.schema, 'rc2-003-rejection-cost-v1');
  assert.equal(saved.reconciliation.balanced, true);
  assert.ok(saved.cost.meanAttemptsPerPublished > 1, 'a mean below one would mean the field is not attempts');
  assert.ok('retryExhaustions' in saved.cost && 'latencyP95Ms' in saved.cost && 'p95Attempts' in saved.cost);
  assert.ok(saved.unabsorbed.worstTemplates !== undefined);
});
