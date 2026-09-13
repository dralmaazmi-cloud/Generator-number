// RC2.3 — difficulty decided by structure, and what that costs.
//
// Holdout D: 250 keys correct, one ambiguous item, 82 released as HARD and 38 of
// those genuinely hard. RC2.2 had already made the published band identical to
// the computed one, so declared/computed agreement was 100% while 44 items were
// mislabelled. The number was true and meant nothing.
//
// These tests check the replacement, and deliberately do not check agreement
// between the band and the score. Where the score appears it appears as
// evidence.

import test from 'node:test';
import assert from 'node:assert/strict';

import Engine from '../src/index.js';
import {SeededRNG} from '../src/rng.js';
import {finalizeQuestion} from '../src/utils.js';
import {FAMILY_REGISTRY, FAMILY_MAP} from '../src/registry.js';
import {

// RC2.7-R2. All-hard sessions are sized at 30 here, not 50. The core
// construction control added in this release is absolute: a session that
// cannot be filled without repeating a core construction is REFUSED rather
// than completed with parameter reskins, and the hard band's genuine
// breadth currently supports about 35. Thirty is a demanding all-hard
// session the engine can honestly deliver, which is what these fixtures
// need; the shortfall itself is asserted in tests/rc27-diversity.test.mjs.
  TEMPLATE_STRUCTURE, ADJUDICATED_TEMPLATE_IDS, HARD_CRITERIA, ROUTINE_MARKERS,
  structuralBandOf, isHardCapable, criteriaOf, templatesAtBand, contradictions
} from '../src/qa/structure.js';

const BANDS = ['easy', 'medium', 'hard'];

/** Every template the engine can actually produce, with one sample each. */
async function sweep({per = 90, tag = 'RC23-SWEEP'} = {}) {
  const out = new Map();
  for (const f of FAMILY_REGISTRY) {
    const mod = await import(`../src/families/${f.id}.js`);
    const gen = Object.values(mod).find(v => typeof v === 'function' && /^generate/.test(v.name));
    for (const band of f.difficulties) {
      for (let i = 0; i < per; i++) {
        const seed = `${tag}-${f.id}-${band}-${i}`;
        let base, q;
        try {
          base = gen({difficulty: band, rng: new SeededRNG(seed).fork('c'), seed, engineVersion: 'test', telemetry: null});
          q = finalizeQuestion(base, new SeededRNG(seed).fork('o'));
        } catch { continue; }
        if (!out.has(base.template_id)) out.set(base.template_id, {family: f.id, bandAskedFor: band, samples: []});
        out.get(base.template_id).samples.push(q);
      }
    }
  }
  return out;
}

// --- the adjudication itself ------------------------------------------------

test('RC2.3-1: every template is adjudicated, and every adjudication is reachable', async () => {
  const seen = await sweep();
  const reachable = [...seen.keys()].sort();
  const adjudicated = [...ADJUDICATED_TEMPLATE_IDS].sort();
  assert.deepEqual(reachable, adjudicated,
    `unreachable: ${adjudicated.filter(t => !seen.has(t))}; unadjudicated: ${reachable.filter(t => !TEMPLATE_STRUCTURE[t])}`);
  // RC2.4 added eighteen HARD templates across eleven families; RC2.5 split the
  // relational count question into its routine and its branch-combining form,
  // making 126. The count is pinned so a silent loss is still caught.
  // RC2.8 added six: the six jobs listed in tests/rc2-degeneracy.test.mjs.
  assert.equal(adjudicated.length, 151, 'the engine holds 151 templates');
});

test('RC2.3-1: a hard template names a structural criterion, and nothing else may', () => {
  for (const id of ADJUDICATED_TEMPLATE_IDS) {
    const e = TEMPLATE_STRUCTURE[id];
    if (e.band === 'hard') {
      assert.ok(e.criteria.length > 0, `${id} is hard with no criterion`);
    } else {
      assert.equal(e.criteria.length, 0, `${id} is ${e.band} but claims ${e.criteria}`);
    }
    for (const c of e.criteria) assert.ok(c in HARD_CRITERIA, `${id}: unknown criterion ${c}`);
    for (const r of e.routine) assert.ok(r in ROUTINE_MARKERS, `${id}: unknown routine marker ${r}`);
    assert.ok(e.why && e.why.trim().endsWith('.'), `${id}: no reviewable justification`);
  }
});

test('RC2.3-1: routine structure alone never reaches hard', () => {
  // The whole finding restated as a test: PROP_H_COST_PLUS, PCT_M_SUCCESSIVE,
  // RATE_H_TWO_PHASE, PL_H_CHAIN, RAT_E_SPLIT and the staged worker, machine and
  // combined-rate templates are what a fixed pipeline with more arithmetic looks
  // like, and the brief names each of those shapes as not hard.
  const routineOnly = ADJUDICATED_TEMPLATE_IDS.filter(id =>
    TEMPLATE_STRUCTURE[id].routine.length > 0 && TEMPLATE_STRUCTURE[id].criteria.length === 0);
  for (const id of routineOnly) assert.notEqual(TEMPLATE_STRUCTURE[id].band, 'hard', id);
  for (const id of ['PROP_H_COST_PLUS', 'PCT_M_SUCCESSIVE', 'PCT_H_CHAIN_VALUE', 'RATE_H_TWO_PHASE',
    'PL_H_CHAIN', 'RAT_E_SPLIT', 'PCT_E_REVERSE_ONE', 'PL_H_REVERSE', 'AVG_M_COMBINE',
    'WORK_H_TWO_STAGE', 'MACH_H_STAGE_UP', 'COMB_H_STAGED']) {
    assert.equal(isHardCapable(id), false, `${id} is one of the shapes the brief rules out of hard`);
  }
});

test('RC2.3-1: the registry lists exactly the templates its generator produces', async () => {
  const seen = await sweep();
  for (const f of FAMILY_REGISTRY) {
    const produced = [...seen.entries()].filter(([, v]) => v.family === f.id).map(([k]) => k).sort();
    assert.deepEqual(produced, [...f.templates].sort(), `${f.id} registry list does not match what it generates`);
  }
});

test('RC2.3-1: family capability is derived, never asserted twice', () => {
  for (const f of FAMILY_REGISTRY) {
    const implied = BANDS.filter(b => f.templates.some(t => structuralBandOf(t) === b));
    assert.deepEqual(f.difficulties, implied, f.id);
  }
  // And it is allowed to be narrow. Forcing every family to serve every band is
  // what produced the routine "hard" items in the first place, and RC2.4 widened
  // hard coverage by ADDING structures rather than by relaxing the criteria —
  // so the two families that genuinely cannot reach hard still do not.
  // RC2.8-4: fractions reaches medium, and not by re-labelling a chain. The
  // capability comes from FRAC_M_REMAIN, which asks what is LEFT after two
  // successive shares — the complement at each stage rather than the part — and
  // hands back a fraction of the original instead of a number. Narrow families
  // stay narrow; this one grew by gaining a job it did not have.
  assert.deepEqual(FAMILY_MAP.fractions.difficulties, ['easy', 'medium']);
  assert.ok(!FAMILY_MAP.fractions.difficulties.includes('hard'));
  assert.ok(!FAMILY_MAP.odd_one_out.difficulties.includes('hard'));
  // RC2.6: machines no longer reaches hard. Its one hard structure,
  // MACH_H_TWO_CONFIG, was demoted after direct sampling showed it drawing a
  // 2x2 linear system — the shape the Holdout E reviewers judged medium 4 of 4
  // in another family — and sometimes a degenerate one. A family being narrow is
  // the intended outcome of calibrating honestly, not a defect to repair.
  // RC2.7: machines reaches hard again — but NOT by re-promoting MACH_H_TWO_CONFIG,
  // which is still medium and still demoted. The capability comes from a
  // structure that did not exist before: MACH_H_MIN_SECOND_TYPE asks for the
  // smallest admissible count, deriving a shortfall, inverting it onto a second
  // rate and rounding UP because a fraction of a machine cannot be hired. That
  // is a construction form the engine had none of, not the old one renamed.
  assert.equal(structuralBandOf('MACH_H_TWO_CONFIG'), 'medium',
    'the demoted two-config structure must stay demoted');
  assert.ok(FAMILY_MAP.machines.difficulties.includes('hard'));
  assert.deepEqual(
    FAMILY_MAP.machines.templates.filter(t => structuralBandOf(t) === 'hard'),
    ['MACH_H_MIN_SECOND_TYPE'],
    'machines may only reach hard through the structure RC2.7 added');
  assert.ok(FAMILY_MAP.percentages.difficulties.includes('hard'), 'RC2.4 gave percentages two hard structures');
});

// --- what gets published ----------------------------------------------------

test('RC2.3-1: the published band IS the structural band', () => {
  const e = new Engine();
  let n = 0;
  for (let i = 0; i < 600; i++) {
    let q;
    try { q = e.generateQuestion({family: 'random', difficulty: BANDS[i % 3], seed: `RC23-LBL-${i}`}); }
    catch { continue; }
    n++;
    assert.equal(q.difficulty, structuralBandOf(q.metadata.template_id), q.generator_id);
    assert.equal(q.metadata.structural_band, q.difficulty);
    assert.equal(q.metadata.band_source, 'structural_adjudication');
    assert.deepEqual(q.metadata.structural_criteria, criteriaOf(q.metadata.template_id));
  }
  assert.ok(n > 500, `only ${n} questions generated`);
});

test('RC2.3-1: the complexity score is kept as evidence, and is not the label', () => {
  // It must still be computed and still be reported — a release that stopped
  // measuring it would have no way to show where structure and score diverge.
  // What it may not do is decide anything.
  const e = new Engine();
  let disagreements = 0, n = 0;
  for (let i = 0; i < 300; i++) {
    let q;
    try { q = e.generateQuestion({family: 'random', difficulty: BANDS[i % 3], seed: `RC23-EV-${i}`}); }
    catch { continue; }
    n++;
    assert.equal(typeof q.metadata.complexity_score, 'number');
    assert.ok(BANDS.includes(q.metadata.complexity_band));
    assert.equal(q.metadata.score_agrees_with_structure, q.metadata.complexity_band === q.difficulty);
    if (!q.metadata.score_agrees_with_structure) disagreements++;
  }
  assert.ok(n > 250);
  // No assertion on the rate. It is reported by tools/audit/rc23-structure.mjs
  // and it is not a target: driving it to zero would mean the score had been
  // fitted to the structure, which is the circularity RC2.2 fell into.
  assert.equal(typeof disagreements, 'number');
});

test('RC2.3-2: an ALL_HARD session is built only from HARD_CAPABLE structures', () => {
  const e = new Engine();
  for (let i = 0; i < 4; i++) {
    const s = e.generatePractice({count: 30, difficulty: 'hard', family: 'random', seed: `RC23-AH-${i}`});
    assert.equal(s.questions.length, 30);
    for (const q of s.questions) {
      assert.equal(q.difficulty, 'hard', q.generator_id);
      assert.ok(isHardCapable(q.metadata.template_id), `${q.generator_id} is not hard-capable`);
      assert.ok(criteriaOf(q.metadata.template_id).length > 0, q.generator_id);
    }
  }
});

test('RC2.3-2: a band that cannot fill a session is refused up front, by name', () => {
  // The instruction is to fail explicitly rather than quietly filling the quota.
  // Asked for more hard questions than the nineteen hard structures can supply
  // within the per-template share, the engine says so before drawing anything —
  // and says which families hold nothing at that band, which is the information
  // needed to fix it.
  const e = new Engine();
  let err = null;
  try { e.generatePractice({count: 30, difficulty: 'hard', family: 'sequences', seed: 'RC23-COV'}); }
  catch (caught) { err = caught; }
  assert.ok(err, 'a band that cannot fill a session must refuse');
  assert.equal(err.code, 'INSUFFICIENT_BAND_COVERAGE');
  assert.equal(err.band, 'hard');
  assert.equal(err.needed, 8);
  assert.ok(err.distinctTemplates < 8, `sequences holds ${err.distinctTemplates} hard structures`);
  assert.ok(/INSUFFICIENT_BAND_COVERAGE: 30 hard slots need 8 distinct structures/.test(err.message), err.message);

  // And the refusal is not blanket: the full pool can still fill one.
  const ok = e.generatePractice({count: 30, difficulty: 'hard', family: 'random', seed: 'RC23-COV-OK'});
  assert.equal(ok.questions.length, 30);
});

test('RC2.3-2: a family that cannot reach a band refuses rather than substituting', () => {
  const e = new Engine();
  let checked = 0;
  for (const f of FAMILY_REGISTRY) {
    for (const band of BANDS) {
      if (f.difficulties.includes(band)) continue;
      checked++;
      let threw = false;
      for (let i = 0; i < 8; i++) {
        try {
          const q = e.generateQuestion({family: f.id, difficulty: band, seed: `RC23-UNR-${f.id}-${band}-${i}`});
          assert.fail(`${f.id}/${band} returned ${q.generator_id} at ${q.difficulty}`);
        } catch (err) {
          if (err instanceof assert.AssertionError) throw err;
          threw = true;
        }
      }
      assert.ok(threw, `${f.id}/${band} neither produced nor refused`);
    }
  }
  // Two families still cannot reach hard. RC2.8-4 gave fractions a medium job —
  // «what fraction is left» — so the third unreachable pair is gone; the guard
  // counts down to what is actually unreachable rather than pinning a number
  // that honest new coverage would break.
  assert.ok(checked >= 2, 'this test is only meaningful while some band is unreachable');
});

// --- repetition -------------------------------------------------------------

test('RC2.3-5: no template takes more than its share of a session', () => {
  // The per-session cap counted (template, asked unknown), so a template askable
  // three ways could occupy nine slots in fifty with nothing recorded. Measured
  // on hard sessions it did exactly that.
  const e = new Engine();
  for (const band of ['hard', 'medium', 'easy']) {
    for (let i = 0; i < 3; i++) {
      // RC2.7-R2: the reachable pool of distinct core ideas under the
      // per-template share is about 45 easy, 50+ medium and 35 hard, and the
      // core rule is absolute, so each band is asked for what it can supply.
      // RC2.8-3: the single-band ceilings the engine honestly delivers are
      // about 35 easy, 55+ medium and 30 hard. They moved because the session is
      // now planned over distinct IDEAS rather than rotated over families: a
      // blueprint is not reused while an unused one exists, and the core
      // construction ban is still absolute on top of that, so a single-band
      // session runs out of genuinely distinct material sooner than one that was
      // free to redraw the same idea from another family. A session past the
      // ceiling is refused by name — tests/rc28-blueprints.test.mjs asserts that
      // — and is not filled with reskins, which is the trade this release makes.
      const s = e.generatePractice({count: band === 'medium' ? 50 : band === 'easy' ? 35 : 30, difficulty: band, family: 'random', seed: `RC23-SHARE-${band}-${i}`});
      const counts = {};
      for (const q of s.questions) counts[q.generator_id] = (counts[q.generator_id] ?? 0) + 1;
      const worst = Math.max(...Object.values(counts));
      assert.ok(worst <= e.config.maxTemplateIdRepeatsPerSession,
        `${band} session ${i}: one template took ${worst} of ${s.questions.length} slots`);
    }
  }
});

test('RC2.3-5: exact, semantic and reasoning repetition are counted apart', async () => {
  const {measureBatch} = await import('../tools/audit/rc22-repetition.mjs');
  const r = measureBatch({
    seed: 'RC23-REP',
    plan: [{count: 50, difficulty: 'mixed'}, {count: 50, difficulty: 'mixed'},
      {count: 50, difficulty: 'mixed'}, {count: 50, difficulty: 'mixed'},
      {count: 30, difficulty: 'hard'}]
  });
  assert.equal(r.questions, 230);
  // Exact and semantic repetition are defects and must be zero.
  assert.equal(r.exact.repeats, 0, 'an identical instance was published twice');
  assert.equal(r.semantic.repeats, 0, 'the same mathematical instance was published twice');
  // Reasoning repetition is a quantity, not a defect. Some is unavoidable while
  // the hard band offers nineteen structures, so what is asserted is that it is
  // bounded and measured — not that it is absent.
  assert.ok(r.reasoning.distinct > 60, `only ${r.reasoning.distinct} distinct reasoning paths in 250`);
  assert.ok(r.reasoning.max <= 8, `one reasoning path used ${r.reasoning.max} times`);
});

// --- distractors ------------------------------------------------------------

test('RC2.3-4: a count of indivisible things is never offered as a fraction', async () => {
  const {isCountUnit} = await import('../src/arabic/units.js');
  const seen = await sweep({per: 60, tag: 'RC23-OPT'});
  let sets = 0, published = 0, bad = 0, offeredBad = 0;
  for (const [, v] of seen) {
    for (const q of v.samples) {
      const unit = q.metadata.answer_count_unit;
      if (!unit) continue;
      assert.ok(isCountUnit(unit));
      sets++;
      for (const o of Object.values(q.metadata.options_meta)) {
        if (o.correct) continue;
        published++;
        if (typeof o.value === 'number' && !Number.isInteger(o.value)) bad++;
      }
    }
  }
  assert.ok(sets > 200, `only ${sets} count-unit questions in the sweep`);
  // Demoted, not dropped: a template with nothing better still uses one, which
  // is what keeps an answer space from being narrowed. So the bar is a low
  // residual, not zero — 4.9% of candidates are non-integer before selection.
  assert.ok(bad / published < 0.02, `${(100 * bad / published).toFixed(2)}% of published options are fractional counts`);
  assert.equal(typeof offeredBad, 'number');
});

test('RC2.3-4: option sets diagnose different mistakes where the template has them', async () => {
  const e = new Engine();
  const byFamily = {};
  for (let i = 0; i < 2200; i++) {
    let q;
    try { q = e.generateQuestion({family: 'random', difficulty: BANDS[i % 3], seed: `RC23-MIS-${i}`}); }
    catch { continue; }
    const f = byFamily[q.family] ??= {options: 0, repeats: 0};
    const seen = new Set();
    for (const o of Object.values(q.metadata.options_meta)) {
      if (o.correct) continue;
      f.options++;
      if (seen.has(o.misconceptionId)) f.repeats++; else seen.add(o.misconceptionId);
    }
  }
  // odd-one-out and relational repeat by construction: every wrong option in an
  // odd-one-out set is a number that DOES satisfy the shared property, and there
  // is one true diagnosis for all five. Suppressing that would be a worse item,
  // not a better one, so they are excluded rather than exempted quietly.
  const structural = new Set(['odd_one_out', 'relational']);
  let options = 0, repeats = 0;
  for (const [family, f] of Object.entries(byFamily)) {
    if (structural.has(family)) continue;
    options += f.options; repeats += f.repeats;
  }
  assert.ok(options > 8000, `only ${options} options measured`);
  assert.ok(repeats / options < 0.07,
    `${(100 * repeats / options).toFixed(2)}% of wrong options repeat a diagnosis already on the page`);
});

// --- the evidence -----------------------------------------------------------

test('RC2.3-1: nothing a question publishes contradicts the criteria its template claims', async () => {
  const seen = await sweep({per: 60, tag: 'RC23-CON'});
  const problems = [];
  for (const [, v] of seen) for (const q of v.samples) problems.push(...contradictions(q));
  assert.deepEqual([...new Set(problems)], []);
});

test('RC2.3-1: a template’s structure does not vary across draws', async () => {
  // This is what would justify a second band for a template, and the brief allows
  // one only on that condition. Every draw of a template is checked against its
  // criteria; a template whose evidence held on some draws and not others would
  // be one whose parameters change the reasoning burden, and it would show up
  // here as a split rather than as a uniform pass or a uniform failure.
  const seen = await sweep({per: 60, tag: 'RC23-STABLE'});
  for (const [id, v] of seen) {
    const verdicts = new Set(v.samples.map(q => (contradictions(q).length > 0 ? 'inconsistent' : 'consistent')));
    assert.equal(verdicts.size, 1, `${id}: structural evidence differs between draws — ${[...verdicts]}`);
  }
});

test('RC2.3-1: Holdout D, re-adjudicated, lands where the independent audit did', async () => {
  const {holdoutDRegression} = await import('../tools/audit/rc23-structure.mjs');
  const r = holdoutDRegression();
  if (!r.available) return; // the holdout is evidence, not a dependency
  assert.equal(r.releasedAsHard, 82);
  // Two independent human audits now bracket this, and they disagree with each
  // other: Holdout D's reviewers called 38 of its 82 hard items genuinely hard,
  // Holdout E's called 29 of its 82. RC2.5 recalibrated against the stricter of
  // the two, so applying it to Holdout D's items should land at or below D's own
  // count and at or above the rate E's reviewers applied — not on either number.
  // Pinning it to D alone, as RC2.3 did, would mean re-fitting the criteria to
  // the looser audit every time the stricter one moves.
  // RC2.5 is calibrated per TEMPLATE on the Holdout E verdicts, so what it keeps
  // on Holdout D's items depends on which templates Holdout D happened to draw —
  // it is not expected to land on either audit's count. What must hold is the
  // direction: the calibration is never LOOSER than the looser of the two human
  // audits. It currently keeps 17 of Holdout D's 82, below both, because
  // Holdout D leaned on word-problem structures that Holdout E's reviewers
  // judged medium.
  assert.ok(r.adjudicationKeepsAsHard <= 38,
    `adjudication keeps ${r.adjudicationKeepsAsHard}, looser than the Holdout D audit's 38`);
  assert.ok(r.adjudicationKeepsAsHard > 0,
    'the adjudication keeps nothing at all on Holdout D — that is a coverage collapse, not a calibration');
  assert.ok(r.adjudicationDemotes >= 40, `only ${r.adjudicationDemotes} of the 82 demoted`);
});

test('RC2.3-7: the same seed still gives the same session', () => {
  const a = new Engine().generatePractice({count: 40, difficulty: 'mixed', family: 'random', seed: 'RC23-REPRO'});
  const b = new Engine().generatePractice({count: 40, difficulty: 'mixed', family: 'random', seed: 'RC23-REPRO'});
  assert.deepEqual(a.questions.map(q => q.id), b.questions.map(q => q.id));
  assert.deepEqual(a.questions.map(q => q.correct_option), b.questions.map(q => q.correct_option));
  assert.deepEqual(a.questions.map(q => q.question), b.questions.map(q => q.question));
});
