// RC2.7 — generative breadth and true question diversity.
//
// The RC2.6 release could say how many templates it had. It could not say how
// many DIFFERENT QUESTIONS a reader could tell apart, and the answer turned out
// to be much smaller: eleven of the sixteen families produced between one and
// three stem skeletons per template, so a template was a fixed sentence with
// numeric holes. These tests hold the three things RC2.7 changed — realization,
// rule space, and the session-level novelty controls — to doing that honestly.

import test from 'node:test';
import assert from 'node:assert/strict';

import Engine from '../src/index.js';
import {FAMILY_REGISTRY} from '../src/registry.js';
import {REASON} from '../src/qa/reasons.js';
import {realizeStem, STRUCTURES} from '../src/compose/realize.js';
import {POOLS, pickScenario} from '../src/compose/scenarios.js';
import {PERSONS, NAME_POOL, entityKindsIn, entityWordsIn} from '../src/compose/entities.js';
import {NoveltyScheduler, DIMENSIONS, NOVELTY_CAPS_PER_50, ENTITY_CAP_PER_50} from '../src/compose/novelty.js';
import {stemSkeleton, parameterizationSignature} from '../src/qa/construction.js';
import {SeededRNG} from '../src/rng.js';

// --- 1. the realization layer ------------------------------------------------

test('RC2.7-3: one instance, several sentence structures, same facts', () => {
  const facts = ['متوسط 6 قيم هو 20', 'أُضيفت قيمة جديدة مقدارها 27'];
  const shapes = new Set();
  for (let i = 0; i < 80; i++) {
    const r = realizeStem(new SeededRNG(`real-${i}`), {
      facts, ask: 'فما متوسط القيم بعد الإضافة؟', askFirst: 'متوسط القيم بعد الإضافة'
    });
    shapes.add(r.structure);
    // Whatever the shape, every given survives it and nothing is invented.
    for (const f of facts) assert.ok(r.text.includes(f), `${r.structure} dropped a given`);
    assert.ok(!/\bundefined\b/.test(r.text));
  }
  assert.deepEqual([...shapes].sort(), [...STRUCTURES].sort());
});

test('RC2.7-3: a clause that already opens with a connective is not given another', () => {
  // «وولو زاد معدله» — the defect this guards. و and ف are PREFIXES in Arabic,
  // so there is no word boundary after them to match on.
  for (let i = 0; i < 40; i++) {
    const r = realizeStem(new SeededRNG(`conn-${i}`), {
      facts: ['ينجز جهاز 180 علبة بمعدل ثابت', 'ولو زاد معدله بمقدار 6 علبة/ساعة لأنجز العمل في ساعة أقل'],
      ask: 'فما معدله الأصلي؟'
    });
    assert.ok(!/وو|فو\s/.test(r.text), r.text);
  }
});

test('RC2.7-3: a single-sentence stem is returned unchanged, not cut', async () => {
  const {composeSentences} = await import('../src/families/_shared.js');
  const one = 'إذا كان معدل الآلة 12 وحدة/ساعة فكم تنجز في 5 ساعات؟';
  const r = composeSentences({rng: new SeededRNG('single')}, one);
  assert.equal(r.text, one);
  assert.equal(r.structure, 'fixed');
});

// --- 2. scenarios and entities ----------------------------------------------

test('RC2.7-3: every scenario pool has a usable spread and stable keys', () => {
  for (const [frame, pool] of Object.entries(POOLS)) {
    assert.ok(pool.length >= 6, `${frame} offers only ${pool.length} scenarios`);
    const keys = pool.map(s => s.key);
    assert.equal(new Set(keys).size, keys.length, `${frame} has duplicate keys`);
    for (const k of keys) assert.ok(/^[a-z0-9_]+$/.test(k), `${frame}: ${k}`);
  }
});

test('RC2.7-3: the scenario draw reads the seed and never the answer', () => {
  const drawn = new Set();
  for (let i = 0; i < 60; i++) drawn.add(pickScenario(new SeededRNG(`sc-${i}`), 'production').key);
  assert.ok(drawn.size >= 5, `only ${drawn.size} production scenarios reachable`);
  // Same seed, same scenario — twice, in a fresh RNG each time.
  for (const frame of Object.keys(POOLS)) {
    assert.equal(pickScenario(new SeededRNG('fixed'), frame).key,
      pickScenario(new SeededRNG('fixed'), frame).key);
  }
});

test('RC2.7-3: the entity pool doubled and declares gender', () => {
  assert.ok(PERSONS.length >= 45, `${PERSONS.length} names`);
  assert.equal(NAME_POOL.length, PERSONS.length);
  assert.equal(new Set(NAME_POOL).size, NAME_POOL.length, 'a name is listed twice');
  for (const p of PERSONS) assert.ok(p.g === 'm' || p.g === 'f', `${p.w} declares no gender`);
  const males = PERSONS.filter(p => p.g === 'm').length;
  assert.ok(males >= 18 && PERSONS.length - males >= 18, 'the pool leans heavily to one gender');
});

test('RC2.7-3: entity kinds are read at word boundaries, not by substring', () => {
  // الخسارة contains سارة. Before RC2.7 the skeleton masked it and the count of
  // distinct skeletons was inflated for every family whose stems mention a loss.
  assert.deepEqual(entityKindsIn('ما نسبة الخسارة من سعر الشراء؟'), []);
  assert.deepEqual(entityWordsIn('اشترى خالد سلعة'), ['خالد']);
  assert.equal(stemSkeleton('ما نسبة الخسارة؟', NAME_POOL), 'ما نسبة الخسارة؟');
});

// --- 3. the published signatures --------------------------------------------

test('RC2.7-5: every published question carries all nine dimensions', () => {
  const e = new Engine();
  let checked = 0;
  for (let i = 0; i < 500; i++) {
    let q;
    try { q = e.generateQuestion({family: 'random', difficulty: 'mixed', seed: `rc27-dim-${i}`}); }
    catch { continue; }
    checked++;
    for (const k of DIMENSIONS) assert.ok(q.metadata[k], `${q.generator_id} has no ${k}`);
    assert.ok(q.metadata.parameterization_signature);
    assert.ok(!/\d/.test(q.metadata.stem_skeleton), `${q.id}: numerals survived the skeleton`);
  }
  assert.ok(checked > 400, `only ${checked} questions reached`);
});

test('RC2.7-5: the parameterization signature separates shape from value', () => {
  const a = parameterizationSignature('T', {count: 6, average: 20});
  const b = parameterizationSignature('T', {count: 7, average: 24});
  const c = parameterizationSignature('T', {count: 60, average: 20});
  assert.equal(a, b, 'two draws of the same shape must share it');
  assert.notEqual(a, c, 'an order of magnitude apart is a different shape');
});

// --- 4. the novelty scheduler ------------------------------------------------

test('RC2.7-5: the exact combination cannot repeat inside a session', () => {
  const n = new NoveltyScheduler(50);
  const q = {generator_id: 'T', question: 'س', metadata: {
    structural_reasoning_signature: 'r', construction_signature: 'c',
    target_signature: 't', stem_skeleton: 's'
  }};
  assert.equal(n.assess(q).ok, true);
  n.accept(q);
  const again = n.assess(q);
  assert.equal(again.ok, false);
  assert.equal(again.reason, REASON.NOVELTY_REPEATED_COMBINATION);
});

test('RC2.7-5: two consecutive questions may not match on most dimensions', () => {
  const n = new NoveltyScheduler(50);
  const base = {
    skill_signature: 'k', structural_reasoning_signature: 'r', construction_signature: 'c',
    target_signature: 't', scenario_signature: 'sc', stem_skeleton: 's',
    entity_pattern: 'none', stem_structure: 'compact'
  };
  n.accept({generator_id: 'A', question: '', metadata: base});
  const near = {generator_id: 'B', question: '', metadata: {...base, stem_skeleton: 's2', target_signature: 't2'}};
  const v = n.assess(near);
  assert.equal(v.ok, false);
  assert.equal(v.reason, REASON.NOVELTY_CONSECUTIVE_SIMILARITY);
});

test('RC2.7-5: caps scale with the session and are never below two', () => {
  assert.equal(new NoveltyScheduler(50).caps.construction_signature, NOVELTY_CAPS_PER_50.construction_signature);
  assert.equal(new NoveltyScheduler(100).caps.construction_signature, 2 * NOVELTY_CAPS_PER_50.construction_signature);
  for (const v of Object.values(new NoveltyScheduler(5).caps)) assert.ok(v >= 2, 'a cap fell below two');
  assert.equal(new NoveltyScheduler(50).entityCap, ENTITY_CAP_PER_50);
});

test('RC2.7-5: a fifty-question mixed session reads as fifty different questions', () => {
  const e = new Engine();
  for (const seed of ['RC27-T-S1', 'RC27-T-S2', 'RC27-T-S3']) {
    const s = e.generatePractice({count: 50, difficulty: 'mixed', family: 'random', seed});
    const n = s.validation.novelty;
    assert.equal(n.delivered, 50);
    assert.equal(n.longestSimilarRun, 0, `${seed}: a run of similar questions`);
    assert.ok(n.spread.construction_signature.distinct >= 45,
      `${seed}: only ${n.spread.construction_signature.distinct} constructions in fifty`);
    assert.ok(n.spread.stem_skeleton.distinct >= 45,
      `${seed}: only ${n.spread.stem_skeleton.distinct} stem skeletons in fifty`);
    assert.ok(n.entities.distinct >= 15, `${seed}: only ${n.entities.distinct} distinct entities`);
    assert.ok(n.entities.largestGroup <= ENTITY_CAP_PER_50,
      `${seed}: one entity appeared ${n.entities.largestGroup} times`);
    // A relaxation is allowed and recorded; what is not allowed is a session
    // whose variety rests on them. One in fifty is the observed worst of three
    // seeds and is well inside "this session reads as fifty questions".
    assert.ok(n.breaches.length <= 2,
      `${seed}: ${n.breaches.length} novelty controls relaxed — ${JSON.stringify(n.breaches.map(b => b.dimension))}`);
  }
});

test('RC2.7-5: a control relaxed by the fallback is recorded, never silent', () => {
  // The all-hard session is where the pressure is real: thirty hard structures
  // for fifty slots. The scheduler cannot be satisfied there, and what this
  // checks is that every relaxation comes back with its dimension attached.
  const e = new Engine();
  const s = e.generatePractice({count: 50, difficulty: 'hard', family: 'random', seed: 'RC27-T-HARD'});
  const n = s.validation.novelty;
  assert.equal(n.delivered, 50);
  const warned = s.validation.diversity_warnings.filter(w => w.reason === REASON.NOVELTY_FALLBACK);
  assert.equal(warned.length, n.breaches.length,
    'every breach must appear as a session warning and every warning as a breach');
  for (const b of n.breaches) {
    assert.ok(b.dimension, 'a breach with no dimension is not a finding');
    assert.ok(b.index >= 1 && b.index <= 50);
  }
});

test('RC2.7-5: the scheduler is a pure function of the session seed', () => {
  const a = new Engine().generatePractice({count: 40, difficulty: 'mixed', family: 'random', seed: 'RC27-T-REP'});
  const b = new Engine().generatePractice({count: 40, difficulty: 'mixed', family: 'random', seed: 'RC27-T-REP'});
  assert.deepEqual(a.questions.map(q => q.id), b.questions.map(q => q.id));
  assert.deepEqual(a.validation.novelty.spread, b.validation.novelty.spread);
  assert.deepEqual(a.validation.novelty.breaches, b.validation.novelty.breaches);
});

// --- 5. what the families actually produce ----------------------------------

test('RC2.7-3: no family still tells one story per template', () => {
  // The BEFORE figure: eleven families between 1.0 and 3.0 stem skeletons per
  // template. The floor here is deliberately modest — it is a floor, not the
  // measurement, which lives in rc2/RC27_INVENTORY_AFTER.json.
  const e = new Engine();
  const weak = [];
  for (const f of FAMILY_REGISTRY) {
    const skeletons = new Set();
    let n = 0;
    for (const band of f.difficulties) {
      for (let i = 0; i < 60; i++) {
        try {
          const q = e.generateQuestion({family: f.id, difficulty: band, seed: `rc27-sk-${f.id}-${band}-${i}`});
          skeletons.add(q.metadata.stem_skeleton); n++;
        } catch { /* a refused draw is not a telling */ }
      }
    }
    const perTemplate = skeletons.size / f.templates.length;
    if (perTemplate < 1.5) weak.push(`${f.id} ${perTemplate.toFixed(2)}`);
  }
  // Two families have a genuinely low ceiling on this dimension, and RC2.7
  // reports it rather than inventing variety they do not have.
  //
  //   odd_one_out  six numbers and «which does not belong». There is one way to
  //                ask it. Its breadth is in the RULES the set is built on.
  //   sequences    a row of numbers and a one-line question. Rewording that
  //                line would be synonym replacement, which the brief
  //                explicitly does not count — so RC2.7 widened what the family
  //                can ASK (a wrong term, a previous term, a term two ahead)
  //                and what its rules can BE (multiply-add, a three-operation
  //                cycle, paired terms, a digit-product step) instead. The
  //                variety a reader meets there is in the run, not the sentence.
  //
  // Both are stated as safe diversity ceilings in FINAL_REPORT.md. Every other
  // family must clear 1.5 tellings per template.
  assert.deepEqual(weak.sort(), ['odd_one_out 0.14', 'sequences 0.31'].sort(),
    `families still telling one story: ${weak.join(', ')}`);
});
