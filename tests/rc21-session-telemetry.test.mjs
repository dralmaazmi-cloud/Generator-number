// RC2.1-1 — session-level telemetry, and RC2.1-5 — cross-session duplication.
//
// Holdout B delivered 250 questions from 359 published candidates. 109 were
// discarded and 104 of those carried no telemetry disposition at all, because
// three branches of the session builder dropped an already-published candidate
// with a bare `continue`. These tests hold the accounting to closing exactly.

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';

import Engine from '../src/index.js';
import {REASON} from '../src/qa/reasons.js';

const sessionPlan = [
  {count: 50, difficulty: 'mixed'}, {count: 50, difficulty: 'mixed'},
  {count: 50, difficulty: 'mixed'}, {count: 50, difficulty: 'mixed'},
  {count: 50, difficulty: 'hard'}
];

test('RC2.1-1: every published candidate a session sees is delivered or dispositioned', () => {
  const e = new Engine();
  e.resetTelemetry();
  let delivered = 0;
  for (let i = 1; i <= 5; i++) {
    delivered += e.generatePractice({
      count: 50, difficulty: i === 5 ? 'hard' : 'mixed', family: 'random',
      seed: `RC21-TELEM-${i}`
    }).questions.length;
  }
  const r = e.getTelemetry().sessionReconciliation;
  assert.equal(r.delivered, delivered);
  assert.equal(r.publishedToSessions, r.delivered + r.sessionDiscards,
    `${r.publishedToSessions} published != ${r.delivered} delivered + ${r.sessionDiscards} discarded`);
  assert.equal(r.difference, 0);
  assert.equal(r.balanced, true);
  assert.ok(r.sessionDiscards > 0, 'this plan is known to discard; a zero here means the counter is not wired');
});

test('RC2.1-1: no session discard is anonymous', () => {
  const e = new Engine();
  e.resetTelemetry();
  for (let i = 1; i <= 4; i++) {
    e.generatePractice({count: 50, difficulty: 'mixed', family: 'random', seed: `RC21-NAMED-${i}`});
  }
  const t = e.getTelemetry();
  const named = [
    REASON.DUPLICATE_FINGERPRINT, REASON.REPEATED_REASONING_PATTERN,
    REASON.SESSION_RECENT_MEMORY, REASON.SESSION_TEMPLATE_CAP,
    REASON.SESSION_WINDOW_CAP, REASON.SESSION_BATCH_DUPLICATE,
    // RC2.7-5. The novelty scheduler's refusals are session discards too, and
    // each names the dimension it refused on.
    REASON.NOVELTY_REPEATED_COMBINATION, REASON.NOVELTY_CONSECUTIVE_SIMILARITY,
    REASON.NOVELTY_DIMENSION_DOMINANCE, REASON.NOVELTY_MULTI_DIMENSION_SIMILARITY,
    REASON.REPEATED_REASONING_PATTERN_IN_BATCH
  ];
  const attributed = named.reduce((a, r) => a + (t.byReason[r] ?? 0), 0);
  assert.equal(attributed, t.sessionDiscards,
    `${t.sessionDiscards} discards but only ${attributed} carry a session reason code`);
  // The cap branches are the ones that used to be silent. If they ever stop
  // reporting, this test is the thing that notices.
  assert.ok((t.byReason[REASON.SESSION_TEMPLATE_CAP] ?? 0) + (t.byReason[REASON.SESSION_WINDOW_CAP] ?? 0) > 0,
    'the previously-silent cap branches reported nothing');
});

test('RC2.1-1: the identity survives the relaxed fallback', () => {
  // A candidate rejected by a cap can still be delivered later as the relaxed
  // fallback. Counted naively it is both discarded and delivered. A narrow
  // family pool forces that path repeatedly.
  const e = new Engine();
  e.resetTelemetry();
  // RC2.2-1: calendar holds no hard template, so a narrow pool that CAN reach
  // hard is used to force the fallback instead.
  // RC2.3-1: combined_rate no longer reaches hard either — its three staged
  // templates are fixed pipelines. RC2.3-2 then added an up-front coverage
  // refusal, so "forty hard questions from one narrow family" is no longer a
  // setup the engine will attempt at all; it says INSUFFICIENT_BAND_COVERAGE
  // before drawing anything. The fallback is exercised the way it now happens in
  // practice — a session small enough to be deliverable, from a family with just
  // enough structures that the caps still bind partway through.
  // RC2.5: the Holdout E human calibration left ratios with three hard
  // structures, so twenty hard slots are now refused up front (five structures
  // needed). Twelve is what three structures can be asked for, and the caps
  // still bind partway through, which is what this test is about.
  // RC2.7: ratios gained a fourth hard structure — RAT_H_MAX_PART, a largest
  // admissible value — so twelve slots are now comfortably covered and stopped
  // exercising the fallback at all. Fifteen is where four structures start to
  // bind, which is the same condition one structure further along.
  const s = e.generatePractice({count: 15, difficulty: 'hard', family: 'ratios', seed: 'RLX-0'});
  const r = e.getTelemetry().sessionReconciliation;
  assert.ok(s.validation.diversity_warnings.length > 0, 'this setup is meant to exercise the fallback');
  assert.equal(r.publishedToSessions, r.delivered + r.sessionDiscards);
  assert.equal(r.difference, 0);
});

test('RC2.1-1: engine-level and session-level cost are reported separately', () => {
  const e = new Engine();
  e.resetTelemetry();
  e.generatePractice({count: 50, difficulty: 'mixed', family: 'random', seed: 'RC21-SPLIT'});
  const t = e.getTelemetry();
  assert.equal(t.reconciliation.balanced, true, 'engine identity');
  assert.equal(t.sessionReconciliation.balanced, true, 'session identity');
  // The two must not be the same number wearing different names.
  assert.notEqual(t.reconciliation.proposals, t.sessionReconciliation.sessionDiscards);
  // RC2.5: this seed now delivers with no session-level discard at all, so the
  // stage key is simply absent. An assertion that `undefined >= 0` was never
  // testing anything; a session that DOES discard is, so the stage is checked
  // where it actually occurs.
  const d = new Engine();
  d.resetTelemetry();
  d.generatePractice({count: 12, difficulty: 'hard', family: 'ratios', seed: 'RC21-SPLIT-DISCARD'});
  assert.ok((d.getTelemetry().byStage.session_discard ?? 0) > 0,
    'a session that hits its caps must record session-level discards under their own stage');
});

test('RC2.1-1: each session reports its own cost', () => {
  const e = new Engine();
  const s = e.generatePractice({count: 30, difficulty: 'mixed', family: 'random', seed: 'RC21-PERSESSION'});
  const c = s.validation.session_cost;
  assert.equal(c.delivered, s.questions.length);
  assert.equal(c.published_candidates, c.delivered + c.discarded);
  assert.ok(c.published_candidates >= c.delivered);
});

// --- RC2.1-5 -----------------------------------------------------------------

// The three pairs the independent review found in holdout B, with the semantic
// fingerprints they were actually published under. Evidence, not production
// data: the point is that each pair shares one fingerprint, so a batch-level
// comparison on that fingerprint is sufficient to have caught them.
const HOLDOUT_B_DUPLICATE_PAIRS = [
  {pair: ['H-S1-18', 'H-S4-47'], templateId: 'AVG_M_COMBINE',
    semantic: '{askedUnknown:weightedAverage,commutative:{},family:averages,named:{averageA:14,averageB:19,countA:4,countB:6,resultingCount:10},reasoningGraph:null,stageCount:2,templateId:AVG_M_COMBINE}'},
  {pair: ['H-S1-35', 'H-S2-43'], templateId: 'SPD_M_AVG',
    semantic: '{askedUnknown:averageSpeed,commutative:{},family:speed,named:{hoursA:1.5,hoursB:3,speedA:70,speedB:100},reasoningGraph:null,stageCount:2,templateId:SPD_M_AVG}'},
  {pair: ['H-S1-10', 'H-S4-32'], templateId: 'ODD_M_PRIME2',
    semantic: '{askedUnknown:outlier,commutative:{numberSet:[2,10,14,22,26,34]},family:odd_one_out,named:{numbers:[2,10,14,22,26,34],primes:[5,7,11,13,17]},reasoningGraph:null,stageCount:1,templateId:ODD_M_PRIME2}'}
];

test('RC2.1-5: the holdout B pairs were duplicates on the semantic fingerprint', () => {
  // Read out of the preserved holdout rather than asserted, so this checks the
  // evidence rather than restating the fixture. The point is that the
  // fingerprint the batch set compares on is the one that actually identifies
  // these defects — if it were not, deduplicating on it would be theatre.
  const rows = gunzipSync(readFileSync('rc2/holdout.jsonl.gz')).toString('utf8')
    .trim().split('\n').map(l => JSON.parse(l));
  const per = new Map();
  const byId = new Map();
  for (const r of rows) {
    const n = (per.get(r.sessionId) ?? 0) + 1;
    per.set(r.sessionId, n);
    byId.set(`H-S${String(r.sessionId).replace(/\D+/g, '')}-${String(n).padStart(2, '0')}`, r);
  }
  for (const {pair, semantic, templateId} of HOLDOUT_B_DUPLICATE_PAIRS) {
    const [a, b] = pair.map(id => byId.get(id));
    assert.ok(a && b, `${pair.join('/')} not found in the preserved holdout`);
    assert.equal(a.templateId, templateId);
    assert.equal(b.templateId, templateId);
    assert.equal(a.semantic, b.semantic, `${pair.join('/')} do not share a semantic fingerprint`);
    assert.equal(a.semantic, semantic, `${pair.join('/')} fingerprint differs from the recorded fixture`);
    // They really were different display orders of one question.
    assert.notDeepEqual(a.options, b.options, `${pair.join('/')} were not even shuffled`);
    assert.equal(String(a.value), String(b.value));
  }
});

test('RC2.1-5: a multi-session batch delivers no repeated mathematical instance', () => {
  const e = new Engine();
  for (const seed of ['RC21-BATCH-A', 'RC21-BATCH-B', 'RC21-BATCH-C']) {
    const b = e.generateMockBatch({seed, sessions: sessionPlan});
    const fps = b.sessions.flatMap(s => s.questions.map(
      q => q.metadata.semantic_fingerprint ?? q.metadata.fingerprint));
    assert.equal(fps.length, 250, `${seed}: expected 250 delivered`);
    assert.equal(new Set(fps).size, 250,
      `${seed}: ${fps.length - new Set(fps).size} repeated instance(s) across sessions`);
    assert.equal(b.batch_summary.distinct_semantic_fingerprints, 250);
  }
});

test('RC2.1-5: ordinary template reuse is still allowed', () => {
  // Banning repetition outright would also pass the test above, and would be
  // the wrong fix. A batch is expected to reuse templates heavily; what it must
  // not do is repeat an instance.
  const e = new Engine();
  const b = e.generateMockBatch({seed: 'RC21-REUSE', sessions: sessionPlan});
  const templates = b.sessions.flatMap(s => s.questions.map(q => q.generator_id));
  const distinct = new Set(templates).size;
  assert.ok(distinct < templates.length,
    'no template was reused at all across 250 questions, which means reuse was suppressed rather than duplication');
  const counts = {};
  for (const t of templates) counts[t] = (counts[t] || 0) + 1;
  assert.ok(Math.max(...Object.values(counts)) >= 2, 'expected at least one template used more than once');
});

test('RC2.1-5: batch duplicates are dispositioned, not silently dropped', () => {
  const e = new Engine();
  e.resetTelemetry();
  e.generateMockBatch({seed: 'RC21-BATCH-TELEM', sessions: sessionPlan});
  const t = e.getTelemetry();
  assert.equal(t.sessionReconciliation.balanced, true);
  assert.equal(t.sessionReconciliation.difference, 0);
});

test('RC2.1-5: a batch is reproducible from its seed', () => {
  const a = new Engine().generateMockBatch({seed: 'RC21-BATCH-REPRO', sessions: sessionPlan});
  const b = new Engine().generateMockBatch({seed: 'RC21-BATCH-REPRO', sessions: sessionPlan});
  const flat = x => x.sessions.flatMap(s => s.questions.map(q => `${q.generator_id}|${q.question}|${q.correct_value}`));
  assert.deepEqual(flat(a), flat(b));
});

test('RC2.1-5: a lone session is unchanged by the batch feature', () => {
  // The batch set is opt-in. A caller that does not pass one must get exactly
  // the deterministic single-session behaviour RC2-004 established.
  const a = new Engine().generatePractice({count: 20, difficulty: 'mixed', family: 'random', seed: 'RC21-LONE'});
  const b = new Engine().generatePractice({count: 20, difficulty: 'mixed', family: 'random', seed: 'RC21-LONE'});
  assert.deepEqual(a.questions.map(q => q.question), b.questions.map(q => q.question));
});
