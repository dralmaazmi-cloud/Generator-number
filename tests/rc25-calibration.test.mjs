// RC2.5 — the human-calibrated remediation, tested.
//
// Two things are guarded here:
//
//   the two wording rules, which reject rather than warn, because each changes
//   what the question asks;
//
//   the partial-order graph conditions, which decide the band of a relational
//   item from the graph it drew rather than from the template it came from.

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

import Engine from '../src/index.js';
import {REASON} from '../src/qa/reasons.js';
import {validateLanguage} from '../src/qa/pipeline.js';
import {checkOrderingWords, checkRateAnswerUnit, asksForARate} from '../src/qa/wording.js';
import {graphComplexity, partialOrderBand, PARTIAL_ORDER_HARD_CONDITIONS} from '../src/qa/partial-order.js';
import {TEMPLATE_STRUCTURE, structuralBandOf} from '../src/qa/structure.js';

// --- 4. the ordering word ---------------------------------------------------

test('RC2.5-4 MUST_REJECT: «مرتبة» where the order meant is positional', () => {
  // The Holdout E stem, verbatim. Read as "sorted", a head average above the
  // tail average is contradictory and the item has no answer.
  const stem = 'متوسط 5 قيم مرتبة هو 17. ومتوسط أول 3 قيم هو 14، ومتوسط آخر 3 قيم هو 25. فما القيمة التي تقع في المنتصف؟';
  assert.equal(checkOrderingWords([stem]).length, 1);
});

test('RC2.5-4 MUST_ACCEPT: positional order said with positional words', () => {
  const stem = 'في قائمة من 5 قيم، متوسط القيم كلها 17. متوسط أول 3 قيم في القائمة هو 14، ومتوسط آخر 3 قيم فيها هو 25. فما القيمة التي تقع في الموضع الأوسط من القائمة؟';
  assert.deepEqual(checkOrderingWords([stem]), []);
});

test('RC2.5-4 MUST_ACCEPT: a stem that genuinely sorts, and says which way', () => {
  // The rule is not a ban on the word. A stem that sorts and names the direction
  // has one reading, which is all the rule asks for.
  assert.deepEqual(
    checkOrderingWords(['رتبنا القيم مرتبة تصاعديًا. ما أول قيمة؟']), []);
});

test('RC2.5-4: the ordering rule is wired into the language stage', () => {
  const v = validateLanguage({
    question: 'متوسط 5 قيم مرتبة هو 17. ومتوسط أول 3 قيم هو 14. فما القيمة التي تقع في المنتصف؟',
    options: {}, explanation: {}, metadata: {}
  });
  assert.ok(v.reasons.includes(REASON.ORDERING_WORD_AMBIGUITY), v.reasons.join(','));
});

test('RC2.5-4: no live template renders the ordering word ambiguously', () => {
  const engine = new Engine();
  let checked = 0;
  for (let i = 0; i < 600; i++) {
    let q;
    try { q = engine.generateQuestion({family: 'random', difficulty: 'mixed', seed: `rc25-ord-${i}`}); }
    catch { continue; }
    checked++;
    assert.deepEqual(checkOrderingWords([q.question]), [], `${q.metadata.template_id}: ${q.question}`);
  }
  assert.ok(checked > 400, `only ${checked} questions reached`);
});

// --- 4. the rate answer -----------------------------------------------------

test('RC2.5-4: a rate ask is told apart from a rate mentioned', () => {
  // Asks for a rate.
  assert.equal(asksForARate('ينجز جهاز 360 وحدة بمعدل ثابت. ولو زاد معدله بمقدار 20 وحدة/ساعة لأنجز العمل نفسه في 3 ساعات أقل. فما معدله الأصلي؟'), true);
  assert.equal(asksForARate('تنتج 3 آلات من النوع الأول وآلتان من النوع الثاني معًا 96 قطعة في الساعة. كم قطعة تنتج آلة واحدة من النوع الأول في الساعة؟'), true);
  // Gives a rate, asks for a quantity: must NOT be caught.
  assert.equal(asksForARate('يعمل جهاز بمعدل 20 وحدة/ساعة لمدة 5 ساعات، ثم ارتفع معدله بمقدار 25% من القيمة السابقة وعمل 4 ساعات أخرى. كم وحدة أنجز إجمالًا؟'), false);
});

test('RC2.5-4 MUST_REJECT: a rate answer rendered as a bare quantity', () => {
  const flagged = checkRateAnswerUnit({
    stem: 'ينجز جهاز 360 وحدة بمعدل ثابت. ولو زاد معدله بمقدار 20 وحدة/ساعة لأنجز العمل نفسه في 3 ساعات أقل. فما معدله الأصلي؟',
    answerUnitId: 'unit',
    optionTexts: ['60 وحدة', '80 وحدة']
  });
  assert.ok(flagged, 'a rate answer in «وحدة» must be flagged');
  assert.equal(checkRateAnswerUnit({
    stem: 'ينجز جهاز 360 وحدة بمعدل ثابت. ولو زاد معدله بمقدار 20 وحدة/ساعة لأنجز العمل نفسه في 3 ساعات أقل. فما معدله الأصلي؟',
    answerUnitId: 'unitPerHour',
    optionTexts: ['60 وحدة/ساعة']
  }), null);
});

test('RC2.5-4: the two rate-answer templates now carry a per-hour unit', () => {
  const engine = new Engine();
  const want = {RATE_H_RATE_FROM_GAP: 'unitPerHour', MACH_H_TWO_CONFIG: 'piecePerHour'};
  const seen = new Set();
  for (let i = 0; i < 1200 && seen.size < 2; i++) {
    let q;
    try { q = engine.generateQuestion({family: 'random', difficulty: 'hard', seed: `rc25-rate-${i}`}); }
    catch { continue; }
    const id = q.metadata.template_id;
    if (!want[id]) continue;
    seen.add(id);
    assert.equal(q.metadata.answer_unit_id, want[id], `${id} answer unit`);
    for (const l of ['A', 'B', 'C', 'D', 'E', 'F']) {
      assert.ok(/\//.test(q.options[l]), `${id} option ${l} is not a rate: ${q.options[l]}`);
    }
  }
  assert.equal(seen.size, 2, `only reached ${[...seen]}`);
});

test('RC2.5-4: no live question asks for a rate and answers with a quantity', () => {
  const engine = new Engine();
  for (let i = 0; i < 800; i++) {
    let q;
    try { q = engine.generateQuestion({family: 'random', difficulty: 'mixed', seed: `rc25-rateunit-${i}`}); }
    catch { continue; }
    const flagged = checkRateAnswerUnit({
      stem: q.question,
      answerUnitId: q.metadata.answer_unit_id,
      optionTexts: ['A', 'B', 'C', 'D', 'E', 'F'].map(l => q.options[l])
    });
    assert.equal(flagged, null, `${q.metadata.template_id}: ${JSON.stringify(flagged)}`);
  }
});

// --- 2. the partial-order conditions ----------------------------------------

test('RC2.5-2: a total order is never hard, whatever is asked of it', () => {
  const nodes = ['a', 'b', 'c', 'd', 'e'];
  const edges = [['a', 'b'], ['b', 'c'], ['c', 'd'], ['d', 'e']];
  for (const task of [{type: 'countAbove', target: 'd'}, {type: 'position', position: 3},
    {type: 'pairRelation', a: 'a', b: 'e'}]) {
    const m = graphComplexity(nodes, edges, task);
    assert.equal(m.linearExtensionCount, 1);
    assert.equal(partialOrderBand(m).band, 'medium', JSON.stringify(task));
  }
});

test('RC2.5-2: a routine transitive conclusion is not hard', () => {
  // The whole support of the answer lies on one root-to-sink path: follow it and
  // the count falls out. This is the shape the brief names as disqualified.
  const nodes = ['a', 'b', 'c', 'd', 'e', 'f'];
  const edges = [['a', 'b'], ['a', 'c'], ['b', 'd'], ['c', 'e'], ['d', 'f'], ['e', 'f']];
  const m = graphComplexity(nodes, edges, {type: 'countAbove', target: 'd'});
  assert.ok(m.incomparablePairs >= 2, 'the order is partial');
  assert.equal(m.linearChainSolves, true, 'but one chain answers the question');
  assert.equal(partialOrderBand(m).band, 'medium');
});

test('RC2.5-2: a count spanning two branches is hard, and says which conditions it met', () => {
  const nodes = ['a', 'b', 'c', 'd', 'e', 'f'];
  const edges = [['a', 'b'], ['a', 'c'], ['b', 'd'], ['c', 'e'], ['d', 'f'], ['e', 'f']];
  const v = partialOrderBand(graphComplexity(nodes, edges, {type: 'countAbove', target: 'f'}));
  assert.equal(v.band, 'hard');
  for (const c of ['H1_PARTIAL_ORDER', 'H2_OPEN_PAIRS', 'H3_NO_LINEAR_SHORTCUT']) {
    assert.ok(v.met.includes(c), `${c} must hold: ${v.missed}`);
  }
  assert.ok(v.met.includes('H4b_BRANCHES_COMBINED'));
});

test('RC2.5-2: a two-way answer space disqualifies whatever the graph looks like', () => {
  const nodes = ['a', 'b', 'c', 'd', 'e', 'f'];
  const edges = [['a', 'b'], ['a', 'c'], ['b', 'd'], ['c', 'e'], ['d', 'f'], ['e', 'f']];
  const task = {type: 'undeterminedPair'};
  assert.equal(partialOrderBand(graphComplexity(nodes, edges, task, {candidateCount: 6})).band, 'hard');
  assert.equal(partialOrderBand(graphComplexity(nodes, edges, task, {candidateCount: 2})).band, 'medium');
});

test('RC2.5-2: the conditions are declared, not implied', () => {
  assert.deepEqual(Object.keys(PARTIAL_ORDER_HARD_CONDITIONS).sort(), [
    'D1_TWO_WAY_GUESS', 'H1_PARTIAL_ORDER', 'H2_OPEN_PAIRS', 'H3_NO_LINEAR_SHORTCUT',
    'H4a_ASKS_INDETERMINATE', 'H4b_BRANCHES_COMBINED', 'H4c_PROOF_DEPTH'
  ]);
});

test('RC2.5-2: every relational item delivered as HARD met the graph conditions', () => {
  const engine = new Engine();
  let hard = 0, medium = 0;
  for (let i = 0; i < 1400; i++) {
    for (const band of ['medium', 'hard']) {
      let q;
      try { q = engine.generateQuestion({family: 'relational', difficulty: band, seed: `rc25-po-${band}-${i}`}); }
      catch { continue; }
      const declared = q.metadata.partial_order_band;
      if (declared == null) continue;   // REL_E_*, no graph question asked
      if (q.difficulty === 'hard') {
        hard++;
        assert.equal(declared, 'hard',
          `${q.metadata.template_id} shipped HARD on a graph that misses ${q.metadata.partial_order_conditions_missed}`);
      } else {
        medium++;
        assert.equal(declared, 'medium',
          `${q.metadata.template_id} shipped ${q.difficulty} on a HARD graph`);
      }
    }
  }
  assert.ok(hard > 200 && medium > 200, `sample too thin: ${hard} hard, ${medium} medium`);
});

test('RC2.5-2: the relational demotions and the split are in the adjudication', () => {
  assert.equal(structuralBandOf('REL_M_CONFIRM'), 'medium');
  assert.equal(structuralBandOf('REL_H_GUARANTEE'), 'medium');
  assert.equal(structuralBandOf('REL_M_COUNT'), 'medium');
  assert.equal(structuralBandOf('REL_H_COUNT_BRANCHED'), 'hard');
  assert.equal(structuralBandOf('REL_M_BRANCH_UNRES'), 'hard');
  assert.equal(structuralBandOf('REL_H_POSITION'), 'hard');
  // A demoted template must carry a routine marker and no criterion, or the
  // demotion is a label rather than a finding.
  for (const id of ['REL_M_CONFIRM', 'REL_H_GUARANTEE', 'REL_M_COUNT']) {
    assert.deepEqual(TEMPLATE_STRUCTURE[id].criteria, [], `${id} still claims a hard criterion`);
    assert.ok(TEMPLATE_STRUCTURE[id].routine.length > 0, `${id} claims nothing routine`);
  }
});

// --- 2. the defect the larger graphs exposed --------------------------------

test('RC2.5-2: every position the relational family asks about has an ordinal', () => {
  // The partial-order position template draws graphs of eight to ten people. The
  // ordinal table stopped at five, and the stem rendered «المركز undefined»
  // silently, because the key was still a name.
  const src = readFileSync('src/families/relational.js', 'utf8');
  assert.ok(/function positionWord\(k\)/.test(src), 'the guard must exist');
  assert.ok(/RELATIONAL_NO_ORDINAL_FOR_POSITION/.test(src), 'and it must throw, not interpolate');
  const engine = new Engine();
  let n = 0;
  for (let i = 0; i < 900; i++) {
    let q;
    try { q = engine.generateQuestion({family: 'relational', difficulty: 'hard', seed: `rc25-ordinal-${i}`}); }
    catch { continue; }
    n++;
    const text = [q.question, ...Object.values(q.options), ...q.explanation.steps].join(' ');
    assert.ok(!text.includes('undefined'), `${q.metadata.template_id}: ${q.question}`);
  }
  assert.ok(n > 300, `only ${n} relational items reached`);
});
