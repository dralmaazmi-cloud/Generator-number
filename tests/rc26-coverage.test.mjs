// RC2.6 — genuine hard coverage, and construction diversity.
//
// RC2.5 ended with 17 hard structures and an honest report that an 82-slot hard
// batch could not be filled inside the diversity caps. RC2.6 closes that by
// ADDING structures that meet the unchanged criteria, never by relaxing a cap or
// restoring a demoted one — and these tests hold it to that.

import test from 'node:test';
import assert from 'node:assert/strict';

import Engine from '../src/index.js';
import {FAMILY_REGISTRY, FAMILY_MAP} from '../src/registry.js';
import {TEMPLATE_STRUCTURE, templatesAtBand, structuralBandOf, isHardCapable, criteriaOf} from '../src/qa/structure.js';
import {stemSkeleton, constructionSignature, measureConstruction, CONSTRUCTION_CAP_PER_BATCH} from '../src/qa/construction.js';

// RC2.7-R2. All-hard sessions are sized at 30 here, not 50. The core
// construction control added in this release is absolute: a session that
// cannot be filled without repeating a core construction is REFUSED rather
// than completed with parameter reskins, and the hard band's genuine
// breadth currently supports about 35. Thirty is a demanding all-hard
// session the engine can honestly deliver, which is what these fixtures
// need; the shortfall itself is asserted in tests/rc27-diversity.test.mjs.

const ADDED = [
  'SPD_H_CURRENT', 'SPD_H_LEG_SPLIT',
  'WORK_H_THREE_PAIRS', 'WORK_H_SOLO_GAP',
  'PROP_H_REPLACE', 'PROP_H_CAPITAL_TIME',
  'CAL_H_MONTH_LENGTH', 'CAL_H_OFFSET_CYCLES',
  'PL_H_SAME_PRICE_PAIR', 'PL_H_REST_MARGIN'
];

// --- 1. the added structures -------------------------------------------------

test('RC2.6-1: ten structures added, in the five families the calibration emptied', () => {
  for (const id of ADDED) {
    assert.ok(TEMPLATE_STRUCTURE[id], `${id} is not adjudicated`);
    assert.equal(structuralBandOf(id), 'hard', `${id} is not hard`);
    assert.ok(criteriaOf(id).length > 0, `${id} claims no criterion`);
    assert.deepEqual(TEMPLATE_STRUCTURE[id].routine, [], `${id} is hard while carrying a routine marker`);
  }
  for (const f of ['speed', 'work_time', 'direct_proportion', 'calendar', 'profit_loss']) {
    assert.ok(FAMILY_MAP[f].difficulties.includes('hard'), `${f} still has no hard structure`);
  }
});

test('RC2.6-1: nothing demoted by the human calibration came back', () => {
  // The RC2.5 demotions are the calibration. Coverage was raised beside them,
  // never by undoing them.
  const RC25_DEMOTED = [
    'CAL_H_CYCLE_MEET', 'AGE_M_FUT_RATIO', 'AGE_H_TWO_TIME', 'MACH_H_STOPPAGE_TIME',
    'PROP_H_TWO_ITEM_SYSTEM', 'PCT_H_MIXTURE', 'SPD_H_TIME_DIFF', 'SPD_H_MEET_DELAY',
    'SPD_H_CATCH', 'COMB_H_TEAM_SIZE', 'RAT_H_TRANSFER', 'RAT_M_ADD_SIDE',
    'WORK_H_EXTRA_WORKERS', 'WORK_H_JOINT_SOLO', 'PL_H_MARKUP_DISCOUNT',
    'PL_H_TWO_OUTCOMES', 'AVG_H_SPLIT_SIZE', 'AGE_H_THREE_SIBLINGS', 'SPD_M_EQUAL_DIST',
    'REL_M_CONFIRM', 'REL_H_GUARANTEE', 'REL_M_COUNT',
    // RC2.6 added one more, on direct sampling rather than analogy.
    'MACH_H_TWO_CONFIG'
  ];
  for (const id of RC25_DEMOTED) {
    assert.equal(isHardCapable(id), false, `${id} was promoted back into hard`);
  }
});

test('RC2.6-2: the four uncertain templates were resolved, and three stayed put', () => {
  // Resolved by DIRECT sampling of what each template actually draws.
  assert.equal(structuralBandOf('MACH_H_TWO_CONFIG'), 'medium',
    'a 2x2 linear system, the shape the reviewers judged medium 4 of 4 elsewhere');
  assert.equal(structuralBandOf('AGE_H_THREE_SIBLINGS'), 'medium',
    'one linear equation in one unknown after substitution');
  assert.equal(structuralBandOf('SPD_M_EQUAL_DIST'), 'medium',
    'one unknown, one equation');
  assert.equal(structuralBandOf('RATE_H_TWO_PHASE'), 'medium',
    'rate-after-percentage, a fixed pipeline the RC2.3 brief names as disqualified');
});

test('RC2.6-2: the two-config system no longer draws its degenerate form', () => {
  // With equal counts of the first machine type the elimination collapses to one
  // subtraction, and the explanation cross-multiplies for nothing.
  const e = new Engine();
  let seen = 0;
  for (let i = 0; i < 1500 && seen < 40; i++) {
    let q;
    try { q = e.generateQuestion({family: 'machines', difficulty: 'medium', seed: `rc26-cfg-${i}`}); }
    catch { continue; }
    if (q.metadata.template_id !== 'MACH_H_TWO_CONFIG') continue;
    seen++;
    const p = q.metadata.parameters;
    assert.notEqual(p.countFirstA, p.countFirstB, `${q.id}: equal first-type counts`);
    assert.notEqual(p.countSecondA, p.countSecondB, `${q.id}: equal second-type counts`);
  }
  assert.ok(seen > 10, `only ${seen} instances sampled`);
});

// --- 3. construction diversity ----------------------------------------------

test('RC2.6-3: the stem skeleton takes out numerals and names, not nouns', () => {
  const s = stemSkeleton('سار خالد 120 كيلومترًا في 3 ساعات', ['خالد', 'سالم']);
  assert.ok(!/\d/.test(s), 'numerals must be gone');
  assert.ok(!s.includes('خالد'), 'the name must be gone');
  assert.ok(s.includes('كيلومترًا') && s.includes('ساعات'), 'the nouns must stay');
});

test('RC2.6-3: a construction is scenario plus asked unknown plus direction', () => {
  const a = constructionSignature({family: 'speed', scenario: 's', askedUnknown: 'x', direction: 'forward'});
  const b = constructionSignature({family: 'speed', scenario: 's', askedUnknown: 'y', direction: 'forward'});
  const c = constructionSignature({family: 'speed', scenario: 's', askedUnknown: 'x', direction: 'reverse'});
  assert.notEqual(a, b, 'a different asked unknown is a different construction');
  assert.notEqual(a, c, 'a different direction is a different construction');
});

test('RC2.6-3: every published question carries its construction evidence', () => {
  const e = new Engine();
  let checked = 0;
  for (let i = 0; i < 400; i++) {
    let q;
    try { q = e.generateQuestion({family: 'random', difficulty: 'mixed', seed: `rc26-cons-${i}`}); }
    catch { continue; }
    checked++;
    assert.ok(q.metadata.stem_skeleton, `${q.id} has no stem skeleton`);
    assert.ok(q.metadata.scenario_signature, `${q.id} has no scenario signature`);
    assert.ok(q.metadata.construction_signature, `${q.id} has no construction signature`);
    assert.ok(!/\d/.test(q.metadata.stem_skeleton), `${q.id}: the skeleton still carries numerals`);
  }
  assert.ok(checked > 300, `only ${checked} questions reached`);
});

test('RC2.6-3: the added scenarios carry more than one construction each where they can', () => {
  // Four of the ten added structures ask two different unknowns over the same
  // relation. That is what the brief counts as a genuinely different
  // construction; new numbers and new names are not.
  const e = new Engine();
  const byScenario = new Map();
  for (const family of ['speed', 'profit_loss', 'work_time', 'direct_proportion', 'calendar']) {
    for (let i = 0; i < 400; i++) {
      let q;
      try { q = e.generateQuestion({family, difficulty: 'hard', seed: `rc26-var-${family}-${i}`}); }
      catch { continue; }
      const s = q.metadata.scenario_signature;
      if (!byScenario.has(s)) byScenario.set(s, new Set());
      byScenario.get(s).add(q.metadata.construction_signature);
    }
  }
  const multi = [...byScenario.values()].filter(v => v.size > 1).length;
  assert.ok(multi >= 3, `only ${multi} added scenarios offer more than one construction`);
  const total = [...byScenario.values()].reduce((a, v) => a + v.size, 0);
  assert.ok(total >= 12, `only ${total} constructions across the five families`);
});

test('RC2.6-3: no construction exceeds its share of a batch', () => {
  const batch = new Engine().generateMockBatch({
    seed: 'RC26-CAPCHK',
    sessions: [
      {count: 50, difficulty: 'mixed', family: 'random'},
      {count: 50, difficulty: 'mixed', family: 'random'},
      {count: 50, difficulty: 'mixed', family: 'random'},
      {count: 50, difficulty: 'mixed', family: 'random'},
      {count: 30, difficulty: 'hard', family: 'random'}
    ]
  });
  const m = measureConstruction(batch.sessions.flatMap(s => s.questions));
  assert.deepEqual(m.genuinelyDistinctConstructions.overCap, [],
    `a construction ran past ${CONSTRUCTION_CAP_PER_BATCH} in one batch`);
  assert.equal(m.exactDuplicates, 0);
  assert.equal(m.semanticDuplicates, 0);
});

// --- 5. acceptance -----------------------------------------------------------

test('RC2.6-5: 82 hard slots deliver with every required zero', {skip: 'superseded by RC2.7-R2: this measures a fifty-question ALL_HARD session, a shape the engine no longer delivers. The core construction control is absolute — a session that cannot be filled without repeating a core question idea is refused rather than completed with parameter reskins — and the hard band supports about thirty-five. This release does not reopen difficulty, so the measurement is retired rather than rescaled; the deliverable shape is measured in tools/audit/rc27-validation.mjs.'}, async () => {
  const {runOnce} = await import('../tools/audit/rc26-acceptance.mjs');
  for (const seed of ['RC26-T-ACC-1', 'RC26-T-ACC-2']) {
    const r = runOnce({seed});
    assert.equal(r.refused, false, `${seed} was refused: ${JSON.stringify(r.refusal)}`);
    assert.equal(r.totals.hardSlots, 82, `${seed} delivered ${r.totals.hardSlots} hard slots`);
    for (const [k, v] of Object.entries(r.zeros)) {
      assert.equal(v, 0, `${seed}: ${k} was ${v}`);
    }
    assert.equal(r.telemetryBalanced, true, `${seed}: telemetry identities do not balance`);
    assert.ok(r.hard.templates >= 24, `${seed}: only ${r.hard.templates} hard templates used`);
    assert.ok(r.hard.reasoningSignatures >= 28, `${seed}: only ${r.hard.reasoningSignatures} reasoning signatures`);
  }
});

test('RC2.6-5: coverage is what the report says it is', () => {
  // RC2.7 adds four: SEQ_H_DIGIT_PRODUCT (a digit-derived rule adjudicated on
  // the same terms as SEQ_H_DIGIT_SUM) and the three construction forms the
  // RC2.6 inventory found missing — comparison of alternatives, a largest
  // admissible value, and a smallest admissible count. The last returns hard
  // coverage to the machines family, which the RC2.5 calibration had emptied.
  assert.equal(templatesAtBand('hard').length, 30);
  assert.equal(FAMILY_REGISTRY.filter(f => f.difficulties.includes('hard')).length, 14);
  // Spread: no family may hold more than a fifth of the hard band now that the
  // sequence concentration RC2.5 reported has been diluted by real additions.
  for (const f of FAMILY_REGISTRY.filter(f => f.difficulties.includes('hard'))) {
    const n = f.templates.filter(t => TEMPLATE_STRUCTURE[t].band === 'hard').length;
    assert.ok(n / 30 <= 0.20, `${f.id} holds ${n} of 30 hard structures`);
  }
});
