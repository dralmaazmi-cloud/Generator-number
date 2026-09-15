// RC2-005 — the degeneracy model, typed and complete.
//
// The RC1 sign-off reported "79.3% of published questions covered" and left 23
// of 107 templates outside the model with no statement of why. A coverage
// percentage without a classification is not a measurement: it cannot tell a
// template that needs no model from one whose model is missing. The cause was
// narrow: validatePedagogy required a finite NUMBER, so every template whose
// answer is a day, a person, a statement or a fraction name was invisible to it.
//
// Two real defects were hiding in that blind spot:
//   CAL_H_LONG   for n = 16 and n = 24 the whole-weeks slip lands exactly on the
//                key, so a quarter of the template measured nothing — and the
//                coincident distractor was silently dropped by the uniqueness
//                check, so the misconception was not even on the paper.
//   REL_E_CHAIN  in a five-person chain the third place is the same counted from
//                either end, so reading the direction backwards still scores.

import test from 'node:test';
import {bandOfTemplate} from './_support/bands.mjs';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

import Engine from '../src/index.js';
import {SeededRNG} from '../src/rng.js';
import {finalizeQuestion} from '../src/utils.js';
import {validateCandidate} from '../src/qa/pipeline.js';
import {validatePedagogy} from '../src/qa/pedagogy.js';
import {REASON} from '../src/qa/reasons.js';
import {CLASSIFICATION, measure} from '../tools/audit/degeneracy-coverage.mjs';
import {generateCalendar} from '../src/families/calendar.js';
import {generateRelational} from '../src/families/relational.js';
import {generateFractions} from '../src/families/fractions.js';

const DEGENERACY = [REASON.DEGENERATE_WRONG_METHOD_EQUALS_KEY, REASON.DEGENERATE_PARAMETERS];

function draw(gen, difficulty, seed) {
  const rng = new SeededRNG(seed);
  const base = gen({difficulty, rng: rng.fork('c'), seed, engineVersion: 'test', telemetry: null});
  const q = finalizeQuestion(base, rng.fork('o'));
  return {base, q, verdict: validateCandidate(base, q)};
}

// --- the check itself works on the answer types this engine publishes --------

test('RC2-005: a non-numeric wrong method that lands on the key is caught', async () => {
  // MUST_REJECT — a day name.
  const day = validatePedagogy({
    correct: 'السبت',
    pedagogy: {targetMisconception: 'IGNORED_NET_OFFSET', wrongMethodValue: 'السبت'}
  });
  assert.equal(day.valid, false);
  assert.deepEqual(day.reasons, [REASON.DEGENERATE_WRONG_METHOD_EQUALS_KEY]);

  // MUST_ACCEPT — a different day.
  const other = validatePedagogy({
    correct: 'السبت',
    pedagogy: {targetMisconception: 'IGNORED_NET_OFFSET', wrongMethodValue: 'الأحد'}
  });
  assert.equal(other.valid, true);
});

test('RC2-005: numeric answers keep their epsilon comparison', async () => {
  const near = validatePedagogy({
    correct: 12, pedagogy: {targetMisconception: 'OFF_BY_ONE_STEP', wrongMethodValue: 12 + 1e-12}
  });
  assert.equal(near.valid, false, 'a floating-point equal answer is still equal');
  const apart = validatePedagogy({
    correct: 12, pedagogy: {targetMisconception: 'OFF_BY_ONE_STEP', wrongMethodValue: 12.01}
  });
  assert.equal(apart.valid, true);
});

test('RC2-005: a numeric string and its number are the same answer', async () => {
  const v = validatePedagogy({
    correct: '48', pedagogy: {targetMisconception: 'OFF_BY_ONE_STEP', wrongMethodValue: 48}
  });
  assert.equal(v.valid, false);
});

test('RC2-005 meta: a template with no declared target is not accused of anything', async () => {
  assert.equal(validatePedagogy({correct: 'السبت'}).valid, true);
  assert.equal(validatePedagogy({correct: 'السبت', pedagogy: {targetSkill: 'X'}}).valid, true);
});

// --- the two defects the blind spot was hiding ------------------------------

test('RC2-005 MUST_REJECT: CAL_H_LONG where whole weeks and the remainder agree', async () => {
  // n = 24: three whole weeks, remainder three. "Move by the number of weeks"
  // and "move by the remainder" are the same move, so the item measures nothing.
  const {base, verdict} = draw(generateCalendar, await bandOfTemplate('calendar','CAL_H_LONG'), 'fx-cal-11');
  assert.equal(base.template_id, 'CAL_H_LONG');
  assert.equal(base.parameters.offsetDays, 24);
  assert.equal(base.pedagogy.wrongMethodValue, base.correct);
  assert.ok(verdict.reasons.includes(REASON.DEGENERATE_WRONG_METHOD_EQUALS_KEY), verdict.reasons.join(','));
});

test('RC2-005: every CAL_H_LONG offset where weeks equal the remainder is refused', async () => {
  const offsets = new Set();
  for (let i = 0; i < 900; i++) {
    let d;
    try { d = draw(generateCalendar, await bandOfTemplate('calendar','CAL_H_LONG'), `cal-sweep-${i}`); } catch { continue; }
    if (d.base.template_id !== 'CAL_H_LONG') continue;
    const n = d.base.parameters.offsetDays;
    const degenerate = Math.floor(n / 7) === n % 7;
    assert.equal(
      d.verdict.reasons.includes(REASON.DEGENERATE_WRONG_METHOD_EQUALS_KEY), degenerate,
      `n=${n} should ${degenerate ? '' : 'not '}be degenerate`
    );
    offsets.add(n);
  }
  // The sweep must actually have met both kinds, or it proves nothing.
  assert.ok([...offsets].some(n => Math.floor(n / 7) === n % 7), 'the sweep saw a degenerate offset');
  assert.ok([...offsets].some(n => Math.floor(n / 7) !== n % 7), 'and a sound one');
});

test('RC2-005 MUST_REJECT: a chain position that reads the same from either end', async () => {
  // RC2.2-1 moved templates into the pool whose band they actually compute, so
  // both the seed and the band a fixture is found at can move. The fixture pins
  // the CONDITION — a position that reads the same from either end — not the draw.
  // RC2.5-2 split REL_M_COUNT and re-banded two relational templates, which
  // moves the pool a seed lands in again. Re-found, same condition.
  // RC2.9.3-4. REL_E_BETWEEN now draws five people and asks only for the
  // second or fourth seat, so the condition cannot arise there by construction;
  // that is asserted below rather than fixtured. REL_E_CHAIN still can, and
  // the guard is still what catches it.
  for (const [seed, template] of [['fx-rel-8', 'REL_E_CHAIN']]) {
    const {base, verdict} = draw(generateRelational, await bandOfTemplate('relational', template), seed);
    assert.equal(base.template_id, template);
    assert.equal(base.parameters.nodeCount, 5);
    assert.equal(base.pedagogy.wrongMethodValue, base.correct);
    assert.ok(verdict.reasons.includes(REASON.DEGENERATE_WRONG_METHOD_EQUALS_KEY), `${template}: ${verdict.reasons}`);
  }
  let between = 0;
  for (let i = 0; i < 300 && between < 40; i++) {
    let d;
    try { d = draw(generateRelational, await bandOfTemplate('relational', 'REL_E_BETWEEN'), `rel-between-${i}`); } catch { continue; }
    if (d.base.template_id !== 'REL_E_BETWEEN') continue;
    between++;
    assert.equal(d.base.parameters.nodeCount, 5);
    assert.notEqual(d.base.pedagogy.wrongMethodValue, d.base.correct, 'the middle seat must never be asked');
  }
  assert.ok(between >= 20, `REL_E_BETWEEN must still be reachable, saw ${between}`);
});

test('RC2-005 MUST_ACCEPT: an off-centre position in the same template passes', async () => {
  let accepted = 0;
  for (let i = 0; i < 400 && accepted < 5; i++) {
    let d;
    try { d = draw(generateRelational, await bandOfTemplate('relational','REL_E_CHAIN'), `rel-ok-${i}`); } catch { continue; }
    if (d.base.template_id !== 'REL_E_CHAIN') continue;
    if (d.base.pedagogy.wrongMethodValue === d.base.correct) continue;
    assert.ok(!d.verdict.reasons.some(r => DEGENERACY.includes(r)), d.verdict.reasons.join(','));
    accepted++;
  }
  assert.equal(accepted, 5, 'the template must still publish');
});

test('RC2-005 MUST_REJECT: a count question where neither modelled error differs from the key', async () => {
  // The seed moves whenever the pool a band draws from changes — RC2.1-2
  // reclassified REL_M_CONFIRM, RC2.3-1 replaced the pools with the structural
  // adjudication. The fixture pins the CONDITION (neither modelled error differs
  // from the key), not the draw, and is re-found rather than being preserved.
  const {base, verdict} = draw(generateRelational, await bandOfTemplate('relational','REL_M_COUNT'), 'fx-relm-23');
  assert.equal(base.template_id, 'REL_M_COUNT');
  assert.equal(base.metadata.transitive_step_required, false);
  assert.equal(base.metadata.undetermined_step_required, false);
  assert.ok(verdict.reasons.includes(REASON.DEGENERATE_PARAMETERS), verdict.reasons.join(','));
});

test('RC2-005: the count model does not cost the template its answer space', async () => {
  // The first version of this rule required transitive inference alone. It
  // rejected 56.7% of draws and removed «لا أحد» and «شخص واحد» from the
  // template entirely — a larger statistical leak (RC2-011) than the
  // measurement defect it fixed. Both answers must survive.
  const published = new Set();
  let drawn = 0, rejected = 0;
  for (let i = 0; i < 1200; i++) {
    let d;
    try { d = draw(generateRelational, await bandOfTemplate('relational','REL_M_COUNT'), `rel-count-${i}`); } catch { continue; }
    if (d.base.template_id !== 'REL_M_COUNT') continue;
    drawn++;
    if (d.verdict.valid) published.add(d.base.correct); else rejected++;
  }
  assert.ok(drawn > 100, 'the sweep must reach the template');
  assert.equal(published.size, 6, `all six count labels must remain reachable, saw ${[...published].join('، ')}`);
  assert.ok(published.has('لا أحد'));
  assert.ok(published.has('شخص واحد'));
  assert.ok(rejected / drawn < 0.30, `rejection rate ${(rejected / drawn).toFixed(3)} must stay proportionate`);
});

// --- rules that guard a sampler constraint must still be able to fire -------

test('RC2-005 meta: the "statement copied from the stem" rule is not decorative', async () => {
  // The sampler already refuses a guaranteed statement that appears verbatim in
  // the stem, so this rule should never fire in generation. A rule that cannot
  // fire at all, though, guards nothing — so it is fed the degenerate input.
  const fired = validatePedagogy({
    correct: 'أ أسرع من ب',
    pedagogy: {
      targetMisconception: 'RELATION_REQUIRES_UNSTATED_ASSUMPTION',
      degenerateWhen: [{when: true, note: 'the guaranteed statement is a sentence of the stem'}]
    }
  });
  assert.deepEqual(fired.reasons, [REASON.DEGENERATE_PARAMETERS]);
  assert.deepEqual(fired.details.degenerate, ['the guaranteed statement is a sentence of the stem']);

  // ...and in ordinary generation it stays silent, because the sampler holds.
  // RC2.1-2 reclassified REL_M_CONFIRM to hard (median 14.7 against a medium
  // ceiling of 12.2), so the sweep looks for it there now.
  let seen = 0;
  for (let i = 0; i < 500 && seen < 40; i++) {
    let d;
    try { d = draw(generateRelational, await bandOfTemplate('relational','REL_M_CONFIRM'), `rel-conf-${i}`); } catch { continue; }
    if (d.base.template_id !== 'REL_M_CONFIRM') continue;
    seen++;
    assert.ok(!d.verdict.reasons.includes(REASON.DEGENERATE_PARAMETERS), 'the sampler already prevents it');
  }
  assert.ok(seen >= 20, 'the sweep must reach REL_M_CONFIRM');
});

// --- the NOT_APPLICABLE claims are proven, not asserted ---------------------

test('RC2-005: the hidden-fraction direction cannot reach its key by any modelled error', async () => {
  // The claim: the key is a name from a six-element lexicon sampled without
  // replacement, so a skipped stage necessarily names a different denominator.
  // RC2.2-1: this family computes easy at every chain length, so easy is where
  // all of its directions now live.
  let seen = 0;
  for (let i = 0; i < 900; i++) {
    let d;
    try { d = draw(generateFractions, 'easy', `frac-${i}`); } catch { continue; }
    if (d.base.askedUnknown !== 'hiddenFraction') continue;
    seen++;
    const known = d.base.parameters.knownDenominators;
    assert.equal(new Set(known).size, known.length, 'denominators are sampled without replacement');
    // Every modelled wrong method names one of the KNOWN denominators; the key
    // names the hidden one, which is not among them.
    for (const dist of d.base.distractors) {
      assert.notEqual(dist.value, d.base.correct, 'no modelled error names the key');
    }
  }
  assert.ok(seen > 100, `the sweep must reach the direction, saw ${seen}`);
});

test('RC2-005: an undetermined-pair key cannot be produced by resolving a pair', async () => {
  let seen = 0;
  for (let i = 0; i < 900 && seen < 60; i++) {
    let d;
    try { d = draw(generateRelational, await bandOfTemplate('relational','REL_M_BRANCH_UNRES'), `rel-unres-${i}`); } catch { continue; }
    if (d.base.template_id !== 'REL_M_BRANCH_UNRES') continue;
    seen++;
    for (const dist of d.base.distractors) assert.notEqual(dist.value, d.base.correct);
  }
  assert.ok(seen >= 30, 'the sweep must reach REL_M_BRANCH_UNRES');
});

// --- coverage is complete, and the published corpus carries no degeneracy ----

test('RC2-005: every template in the engine is classified, and every classification exists', async () => {
  const report = await measure(120);
  // RC2.3-1: back to the full 107. RC2.2 narrowed each family's pools to the
  // templates that COMPUTED a band, and two templates — PROP_E_COST and
  // PROP_M_RECIPE — fell out of every pool and stopped being generated at all.
  // Nothing reported that, because the count was pinned at what was left. The
  // structural adjudication gives every template exactly one band, so a template
  // can no longer be orphaned by a pool it fails to qualify for.
  // RC2.5-2: 126. The relational count question was split into its routine and
  // its branch-combining form, which is one template more than RC2.4 had.
  // RC2.7: 145. Five new sequence structures — the widened rule space and the
  // targets that are not «what comes next» — and three construction forms the
  // inventory found missing: comparison, a largest admissible value, and a
  // smallest admissible count.
  // RC2.6: 137. Ten new HARD structures in the five families the RC2.5
  // calibration left with none.
  // RC2.8: 151. Six templates that ask jobs no family in the engine could ask —
  // «after how many years», «name the rule», «apply a stated rule», «name the
  // shared property», «which number would join the set», «what fraction is
  // left». The count is pinned so a silent LOSS is still caught.
  // RC2.9: 155. Canonicalising the perceptual signature collapsed constructions
  // that were only parameter variants, so the breadth the journeys need had to
  // come from four real structures: a hidden operation and a membership test in
  // sequences, a past ratio and an invariant difference in ages.
  assert.equal(report.totals.templates, 155, 'every declared template is reachable');
  assert.deepEqual(report.totals.unclassified, []);
  assert.deepEqual(report.totals.declaredButAbsentFromEngine, []);
  assert.equal(report.totals.rc1TemplatesWithNoModel, 23, 'the RC1 gap was 23 templates');
  for (const t of report.templates) {
    assert.ok(
      ['MODELLED', 'COVERED_BY_OTHER_INVARIANT', 'NOT_APPLICABLE'].includes(t.rc2Classification),
      `${t.templateId}: ${t.rc2Classification}`
    );
    if (t.rc2Classification !== 'MODELLED') {
      assert.ok(t.justification && t.justification.length > 40,
        `${t.templateId} must state why it needs no model of its own`);
    }
  }
});

test('RC2-005: the RC1 gap is preserved template by template, not only in aggregate', async () => {
  const report = await measure(120);
  assert.equal(report.rc1Gap.count, 23, 'the RC1 sign-off reported 23 uncovered templates');
  assert.equal(report.rc1Gap.rc1ReportedCount, 23);
  const bands = report.rc1Gap.byBand;
  assert.equal(
    (bands.A_MODELLED ?? 0) + (bands.B_COVERED_BY_OTHER_INVARIANT ?? 0) + (bands.C_NOT_APPLICABLE ?? 0),
    23,
    'every one of the 23 must land in exactly one band'
  );
  for (const r of report.rc1Gap.templates) {
    assert.ok(['A_MODELLED', 'B_COVERED_BY_OTHER_INVARIANT', 'C_NOT_APPLICABLE'].includes(r.band), r.templateId);
    assert.ok(r.justification && r.justification.length > 40, `${r.templateId} must carry its own argument`);
    if (r.band === 'A_MODELLED') {
      assert.ok(r.modelCoverageOfDraws > 0, `${r.templateId} claims a model but declares none`);
    }
  }
  // The saved artifact must carry the same table, so the evidence survives
  // without re-running anything.
  const saved = JSON.parse(readFileSync('rc2/DEGENERACY_COVERAGE.json', 'utf8'));
  assert.equal(saved.rc1Gap.count, 23);
  assert.deepEqual(
    saved.rc1Gap.templates.map(t => t.templateId).sort(),
    report.rc1Gap.templates.map(t => t.templateId).sort()
  );
  for (const t of saved.rc1Gap.templates) {
    assert.ok(t.band && t.rc1Verdict && t.rc2Verdict && t.justification, t.templateId);
  }
});

test('RC2-005: the published artifact matches the engine', async () => {
  const saved = JSON.parse(readFileSync('rc2/DEGENERACY_COVERAGE.json', 'utf8'));
  assert.equal(saved.schema, 'rc2-degeneracy-coverage-v1');
  assert.equal(saved.totals.templates, 107);
  assert.deepEqual(saved.totals.unclassified, []);
  assert.ok(saved.totals.publishedModelCoverage > saved.totals.rc1PublishedModelCoverage,
    'the published coverage must exceed the RC1 figure it replaces');
  assert.equal(saved.totals.rc1PublishedModelCoverage, 0.793, 'the RC1 figure is kept for comparison');
  assert.deepEqual(
    saved.templates.map(t => t.templateId).sort(),
    saved.templates.map(t => t.templateId).sort()
  );
  // The artifact is the RC2 record of 107 templates. Entries declared in a later
  // release carry `since` and are not in it — asserting they were would require
  // rewriting a published artifact to match code that postdates it.
  for (const [id, decl] of Object.entries(CLASSIFICATION)) {
    if (decl.since) continue;
    assert.ok(saved.templates.some(t => t.templateId === id), `${id} missing from the artifact`);
  }
});

test('RC2-005: no published question is degenerate', async () => {
  const engine = new Engine();
  const bands = ['easy', 'medium', 'hard'];
  let n = 0;
  // RC2.2-1: the release gate turns away a band mismatch before the pipeline
  // sees it, and capability-aware family selection stops many doomed draws
  // being made at all, so a degenerate candidate reaches the pipeline less
  // often per draw. The sweep is enlarged rather than the claim weakened —
  // measured, 400 draws now yield none and 1,200 yield four.
  for (let i = 0; i < 2000; i++) {
    let q;
    try { q = engine.generateQuestion({family: 'random', difficulty: bands[i % 3], seed: `degen-pub-${i}`}); } catch { continue; }
    n++;
    assert.equal(q.metadata.quality_gate, 'passed');
  }
  assert.ok(n > 1900, `the engine must still publish, published ${n}`);
  const byReason = engine.getTelemetry().byReason;
  // The degeneracies are caught before publication, not absent from the draw.
  assert.ok(
    (byReason[REASON.DEGENERATE_WRONG_METHOD_EQUALS_KEY] ?? 0) + (byReason[REASON.DEGENERATE_PARAMETERS] ?? 0) > 0,
    'if nothing was ever rejected the model is not doing any work'
  );
});
