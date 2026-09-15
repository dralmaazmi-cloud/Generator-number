// Comparison and relational ordering.
//
// Section 17-B: the structure varies, not just the names. Each item builds a
// random ordering graph — branch count, branch depths, number of tops and
// bottoms, where the undecidable pair sits, and the order the sentences are
// stated — and every answer is read off the graph, never off a name's position
// in a fixed sentence.
//
// Section 1-A: the oracle enumerates *every* total order consistent with the
// stated relations. A fact is true when it holds in all of them and
// undecidable when they disagree, so nothing here re-derives the generator's
// reasoning.

import {mk, usable, buildBase, resample, bandPool, u, unitFormat, composeSentences, distinctValues, eq, X, add, sub} from './_shared.js';
import {buildOrderOracle} from '../qa/relational-oracle.js';
import {graphComplexity, partialOrderBand} from '../qa/partial-order.js';
import {canonicalGraph} from '../qa/fingerprint.js';

const NAMES = ['خالد', 'سالم', 'ماجد', 'راشد', 'ناصر', 'فهد', 'علي', 'بدر', 'حمد', 'سامي', 'نورة', 'سارة', 'هند', 'ريم', 'ليان', 'مريم'];
const UNDETERMINED = 'لا يمكن تحديده';
const COUNT_LABELS = ['لا أحد', 'شخص واحد', 'شخصان', 'ثلاثة أشخاص', 'أربعة أشخاص', 'خمسة أشخاص'];
// RC2.5-2. Ordinals to ten. The partial-order position template draws graphs of
// eight to ten people, and a missing ordinal rendered «المركز undefined» in the
// stem — silently, because the key was still a name. `positionWord` throws
// rather than interpolating a gap, so a graph the vocabulary does not cover is a
// loud failure instead of a published defect.
const POSITION_WORDS = {
  1: 'الأول', 2: 'الثاني', 3: 'الثالث', 4: 'الرابع', 5: 'الخامس',
  6: 'السادس', 7: 'السابع', 8: 'الثامن', 9: 'التاسع', 10: 'العاشر'
};

function positionWord(k) {
  const w = POSITION_WORDS[k];
  if (!w) throw new Error(`RELATIONAL_NO_ORDINAL_FOR_POSITION:${k}`);
  return w;
}

export function generateRelational({difficulty, rng, seed, engineVersion, telemetry, pinTemplate = null, pinTargets = null}) {
  const ctx = {difficulty, rng, seed, engineVersion, telemetry, pinTargets, family: 'relational', family_ar: 'المقارنة والترتيب العلاقاتي', category: 'المقارنة والترتيب العلاقاتي'};
  // RC2.3-1. The catalogue, not a set of per-band pools: which of these is
  // eligible for the requested band is decided by the structural adjudication in
  // src/qa/structure.js, so a template cannot sit in a band nobody adjudicated.
  return bandPool(rng, 'relational', difficulty, [
    ['REL_E_BETWEEN', betweenRelation],
    ['REL_E_CHAIN', chainPositionFive],
    ['REL_M_CHAIN6', chainPositionSix],
    ['REL_M_CONFIRM', confirmedStatement],
    ['REL_M_BRANCH_UNRES', branchUnresolved],
    ['REL_M_COUNT', countAboveOnOneChain],
    ['REL_H_COUNT_BRANCHED', countAboveAcrossBranches],
    ['REL_H_POSITION', partialOrderPosition],
    ['REL_H_GUARANTEE', branchGuaranteed],
    // RC2.9.4-B2. Two EASY jobs beyond reading a position.
    ['REL_E_STATEMENT_TRUE', chainStatementTrue],
    ['REL_E_GAP_CHAIN', quantifiedChain]
  ], pinTemplate)(ctx);
}

// --- graph construction ----------------------------------------------------

/** A strict chain: every position is determined. */
function chainGraph(rng, size) {
  const nodes = rng.sample(NAMES, size);
  const edges = [];
  for (let i = 0; i < nodes.length - 1; i++) edges.push([nodes[i], nodes[i + 1]]);
  return {nodes, edges, shape: 'chain'};
}

/**
 * A branching order with a genuinely random shape: one or two tops, two or
 * three branches of differing depth, and an optional shared bottom.
 */
function branchedGraph(rng, size) {
  const nodes = rng.sample(NAMES, size);
  const pool = [...nodes];
  const edges = [];
  const tops = rng.bool(0.25) ? 2 : 1;
  const topNodes = pool.splice(0, tops);
  const branchCount = Math.min(pool.length, rng.int(2, 3));
  const branches = Array.from({length: branchCount}, () => []);
  let bi = 0;
  // Deal the remaining people into branches of uneven depth.
  while (pool.length) {
    const keepBottom = pool.length === 1 && rng.bool(0.5);
    if (keepBottom) break;
    branches[bi % branchCount].push(pool.shift());
    bi += rng.int(1, 2);
  }
  const bottom = pool.length ? pool.shift() : null;

  for (const branch of branches) {
    if (!branch.length) continue;
    for (const top of topNodes) edges.push([top, branch[0]]);
    for (let i = 0; i < branch.length - 1; i++) edges.push([branch[i], branch[i + 1]]);
    if (bottom) edges.push([branch.at(-1), bottom]);
  }
  const used = new Set(edges.flat());
  const live = nodes.filter(n => used.has(n));
  return {nodes: live, edges, shape: `tops${tops}-branches${branches.filter(b => b.length).length}${bottom ? '-sink' : ''}`};
}

/**
 * RC2-010. A wider topology space for the position question.
 *
 * `branchedGraph` alone almost never pins a middle position down, which is why
 * the old template answered "cannot be determined" every time. The shape is
 * drawn at random here — never the answer — so that both determined and
 * undetermined positions arise naturally from the order the candidate is given.
 *
 *   chain            every position determined
 *   chainWithTail    determined until the split, open after it
 *   branched         mostly open in the middle
 */
function positionGraph(rng, size) {
  const shape = rng.pick(['chain', 'chain', 'chainWithTail', 'chainWithTail', 'branched']);
  if (shape === 'chain') return chainGraph(rng, size);
  if (shape === 'branched') return branchedGraph(rng, size);

  // A spine with a short fork hanging off one of its lower links: the positions
  // above the fork are pinned, the ones at and below it are not.
  const nodes = rng.sample(NAMES, size);
  const forkAt = rng.int(2, Math.max(2, size - 3));
  const spine = nodes.slice(0, forkAt + 1);
  const fork = nodes.slice(forkAt + 1);
  const edges = [];
  for (let i = 0; i < spine.length - 1; i++) edges.push([spine[i], spine[i + 1]]);
  for (const f of fork) edges.push([spine.at(-1), f]);
  return {nodes, edges, shape: `chainWithTail@${forkAt}`};
}

/**
 * RC2.5-2. The shape family the HARD position question needs: an order that is
 * genuinely partial — three or more people whose relative order the statements
 * never settle — attached to a spine whose positions ARE settled. That is what
 * makes "who is third?" a question rather than a lookup: the solver has to work
 * out how far down the certainty reaches before answering.
 *
 * Two mirror shapes, so the settled part is not always at the top:
 *
 *   lowFork   a spine, with the open group hanging below its last member
 *   highFork  the open group on top, all of them above a spine
 *
 * The shape, the sizes and the asked position are all drawn here, before any
 * answer exists. Nothing in this function can see whether the position it is
 * about to ask for turns out to be determined — RC2-010 is exactly what happens
 * when a graph is redrawn on the strength of its answer.
 */
function partialOrderPositionGraph(rng) {
  const size = rng.pick([8, 9, 9, 10]);
  // Only the two fork shapes. A `branchedGraph` leaves most middle positions
  // open, which pushes the template back towards answering "cannot be
  // determined" most of the time — the RC2-010 defect. The other three
  // relational templates still draw that shape; this one does not need it, and
  // the variety here comes from size, spine length, open-group size and which
  // end of the order is settled.
  const kind = rng.pick(['lowFork', 'highFork']);
  const nodes = rng.sample(NAMES, size);
  // Three or four people whose order is never settled. Three is the smaller
  // open group that still leaves more than one pair open, which H2 requires.
  const openCount = rng.pick([3, 3, 3, 4]);
  const spineLen = size - openCount;
  if (spineLen < 2) return branchedGraph(rng, size);
  const edges = [];
  if (kind === 'lowFork') {
    const spine = nodes.slice(0, spineLen);
    const open = nodes.slice(spineLen);
    for (let i = 0; i < spine.length - 1; i++) edges.push([spine[i], spine[i + 1]]);
    for (const o of open) edges.push([spine.at(-1), o]);
  } else {
    const open = nodes.slice(0, openCount);
    const spine = nodes.slice(openCount);
    for (const o of open) edges.push([o, spine[0]]);
    for (let i = 0; i < spine.length - 1; i++) edges.push([spine[i], spine[i + 1]]);
  }
  return {nodes, edges, shape: `${kind}${openCount}/${spineLen}`};
}

/** Every root-to-sink path that passes through `node`. */
function rootPathsThrough(nodes, edges, node) {
  const out = new Map(nodes.map(n => [n, []]));
  const inn = new Map(nodes.map(n => [n, []]));
  for (const [a, b] of edges) { out.get(a)?.push(b); inn.get(b)?.push(a); }
  const paths = [];
  const walk = (n, acc) => {
    const next = out.get(n) || [];
    if (!next.length) { paths.push([...acc, n]); return; }
    for (const m of next) walk(m, [...acc, n]);
  };
  for (const r of nodes.filter(n => (inn.get(n) || []).length === 0)) walk(r, []);
  return paths.filter(p => p.includes(node));
}

function graphMeta(nodes, edges) {
  const canonical = canonicalGraph(nodes, edges);
  return {
    reasoningGraph: canonical.key,
    parameters: {
      nodeCount: nodes.length,
      edgeCount: edges.length,
      canonicalEdges: canonical.edges.map(e => e.join('>'))
    }
  };
}

/**
 * RC2.5-2. The graph facts this drawn instance actually carries, and the band
 * they give it. Published on every relational item as evidence, so the claim
 * "this one is hard" can be checked from the item rather than from the template
 * it came from.
 */
function complexityMeta(nodes, edges, task, candidateCount) {
  const metrics = graphComplexity(nodes, edges, task, {candidateCount});
  const verdict = partialOrderBand(metrics);
  return {
    metrics, verdict,
    metadata: {
      graph_complexity: metrics,
      partial_order_band: verdict.band,
      partial_order_conditions_met: verdict.met,
      partial_order_conditions_missed: verdict.missed
    }
  };
}

/** Sentences in a randomised order, so the first statement is not always the top. */
function sentences(rng, edges, verb = 'أسرع من') {
  return rng.shuffle(edges.map(([a, b]) => `${a} ${verb} ${b}`)).join('. ') + '.';
}

function orderOracleSpec(nodes, edges, ask, expected, expectedDisplay, labels) {
  return {kind: 'order', nodes, edges, ask, expected, expectedDisplay, labels};
}

// --- templates -------------------------------------------------------------

/**
 * RC2.5-3. Chain length is the feature that separated these for the reviewers:
 * a five-person chain was judged EASY every time, a six-person chain MEDIUM every
 * time. The template drew either at random under one id and one band, so half its
 * output sat in the wrong band. It is now two templates, one per length.
 */
function chainPositionFive(ctx) { return fullChainPosition(ctx, 5, 'REL_E_CHAIN', 'easy', chainPositionFive); }
function chainPositionSix(ctx) { return fullChainPosition(ctx, 6, 'REL_M_CHAIN6', 'medium', chainPositionSix); }

function fullChainPosition(ctx, size, templateId, band, self) {
  const {rng} = ctx;
  const {nodes, edges} = chainGraph(rng, size);
  const oracle = buildOrderOracle(nodes, edges);
  const targetPos = rng.int(2, size - 1);
  const correct = oracle.whoAtPosition(targetPos);
  if (!correct) return resample(ctx, self);
  const distractors = usable(ctx, [
    ...nodes.filter(n => n !== correct).map(n => {
      const pos = oracle.positionsOf(n)[0];
      return mk(n, 'COUNTED_DIRECT_RELATIONS_ONLY', `قراءة المركز ${positionWord(pos)} بدل ${positionWord(targetPos)}`);
    }),
    mk(UNDETERMINED, 'RESOLVED_AN_UNRESOLVED_PAIR', 'اعتبار الترتيب غير محسوم رغم أن السلسلة كاملة')
  ]);
  const {reasoningGraph, parameters} = graphMeta(nodes, edges);
  return buildBase(ctx, {
    templateId,
    subskill: 'ترتيب كامل وتحديد مركز',
    difficulty: band,
    question: `${sentences(rng, edges)} من صاحب المركز ${positionWord(targetPos)} من الأسرع إلى الأبطأ؟`,
    correct, distractors, format: v => String(v),
    steps: [
      `نربط العلاقات في سلسلة واحدة: ${oracle.extensions[0].join(' > ')}.`,
      `المركز المطلوب هو ${positionWord(targetPos)}، إذن الإجابة ${correct}.`
    ],
    howToStart: 'حوّل الجمل إلى سلسلة واحدة.',
    remember: 'إذا كانت كل العلاقات قابلة للربط، اقرأ المركز المطلوب مباشرة.',
    fastMethod: 'اكتب الترتيب ثم عدّ المراكز.',
    estimatedSteps: 2, conceptTags: ['ordering'], parameters,
    reasoningGraph,
    oracle: orderOracleSpec(nodes, edges, {type: 'position', position: targetPos}, correct, correct),
    askedUnknown: `position${targetPos}`, stageCount: 1,
    // RC2-005. The slip this template teaches against is counting the position
    // from the wrong end of the chain. In a five-person chain the third place is
    // the same from either end, so the item measures nothing — a learner who
    // reads the direction backwards still answers correctly. The chain size and
    // the target position are drawn blind; only the wrong method's value is
    // examined.
    pedagogy: {
      targetSkill: 'READ_POSITION_IN_TOTAL_ORDER', targetMisconception: 'COUNTED_DIRECT_RELATIONS_ONLY',
      wrongMethodValue: oracle.whoAtPosition(size + 1 - targetPos)
    },
    complexityFactors: {reasoningTransformations: 1, conceptCount: 1, graphDepth: size, dependencyDepth: 1},
    textParams: false
  });
}

function betweenRelation(ctx) {
  const {rng} = ctx;
  const size = 5;
  const {nodes, edges} = chainGraph(rng, size);
  const oracle = buildOrderOracle(nodes, edges);
  // Second or fourth: the third seat of five reads the same from either end,
  // which RC2-005 rejects as measuring nothing.
  const targetPos = rng.pick([2, 4]);
  const correct = oracle.whoAtPosition(targetPos);
  if (!correct) return resample(ctx, betweenRelation);
  const distractors = usable(ctx, [
    ...nodes.filter(n => n !== correct).map(n => {
      const pos = oracle.positionsOf(n)[0];
      return mk(n, 'COUNTED_DIRECT_RELATIONS_ONLY', `قراءة المركز ${positionWord(pos)} بدل ${positionWord(targetPos)}`);
    }),
    // RC2.9.3-4. «لا أحد» is not an answer to «who is third?» — a complete
    // chain has someone in every place, and a choice a candidate can strike out
    // without reading the chain is not a choice. The pool is the other four
    // people and «cannot be determined», which needs five people in the chain.
    mk(UNDETERMINED, 'RESOLVED_AN_UNRESOLVED_PAIR', 'اعتبار الترتيب غير محسوم رغم اكتمال السلسلة')
  ]);
  const {reasoningGraph, parameters} = graphMeta(nodes, edges);
  return buildBase(ctx, {
    templateId: 'REL_E_BETWEEN',
    subskill: 'تحديد شخص في مركز من ترتيب كامل',
    difficulty: 'easy',
    question: `${sentences(rng, edges, 'أطول من')} من صاحب المركز ${positionWord(targetPos)} من الأطول إلى الأقصر؟`,
    correct, distractors, format: v => String(v),
    steps: [
      `من الجمل نحصل على الترتيب: ${oracle.extensions[0].join(' > ')}.`,
      `صاحب المركز ${positionWord(targetPos)} هو ${correct}.`
    ],
    howToStart: 'ضع العلاقات في ترتيب واحد.',
    remember: 'الجملة «أطول من» تحدد اتجاه السلسلة.',
    fastMethod: 'اربط العلاقات ثم اقرأ المركز المطلوب.',
    estimatedSteps: 2, conceptTags: ['ordering'], parameters,
    reasoningGraph,
    oracle: orderOracleSpec(nodes, edges, {type: 'position', position: targetPos}, correct, correct),
    askedUnknown: `position${targetPos}`, stageCount: 1,
    // RC2-005, as REL_E_CHAIN: reading the position from the wrong end.
    pedagogy: {
      targetSkill: 'READ_POSITION_IN_TOTAL_ORDER', targetMisconception: 'COUNTED_DIRECT_RELATIONS_ONLY',
      wrongMethodValue: oracle.whoAtPosition(size + 1 - targetPos)
    },
    complexityFactors: {reasoningTransformations: 1, conceptCount: 1, graphDepth: size, dependencyDepth: 1},
    textParams: false
  });
}

function branchUnresolved(ctx) {
  const {rng} = ctx;
  const {nodes, edges, shape} = branchedGraph(rng, rng.pick([5, 6]));
  if (nodes.length < 5) return resample(ctx, branchUnresolved);
  const oracle = buildOrderOracle(nodes, edges);
  const undetermined = oracle.allUndeterminedPairs();
  if (!undetermined.length) return resample(ctx, branchUnresolved);
  const determined = [];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      if (!oracle.undetermined(nodes[i], nodes[j])) determined.push([nodes[i], nodes[j]]);
    }
  }
  if (determined.length < 5) return resample(ctx, branchUnresolved);
  // Section 17-B: the undecidable pair is chosen at random among all of them,
  // not fixed to the first two branch heads.
  const chosen = rng.pick(undetermined);
  const label = pair => `${pair[0]} و${pair[1]}`;
  const correct = label(chosen);
  // RC2.6-4. Every wrong option is a pair the solver mistook for open, and the
  // reason differs by HOW that pair is actually settled. One diagnosis repeated
  // six times told a candidate nothing; these four say which reading failed.
  const stated = new Set(edges.map(([x, y]) => `${x}>${y}`));
  const pathLength = (from, to) => {
    const out = new Map(nodes.map(n => [n, []]));
    for (const [x, y] of edges) out.get(x)?.push(y);
    let frontier = [from], depth = 0, seen = new Set([from]);
    while (frontier.length && depth < nodes.length) {
      depth++;
      const next = [];
      for (const n of frontier) for (const m of out.get(n) || []) {
        if (m === to) return depth;
        if (!seen.has(m)) { seen.add(m); next.push(m); }
      }
      frontier = next;
    }
    return null;
  };
  const diagnose = p => {
    const [a, b] = p;
    const above = oracle.definitelyAbove(a, b) ? a : b;
    const below = above === a ? b : a;
    if (stated.has(`${above}>${below}`)) {
      return [label(p), 'RELATION_CONTRADICTS_STATEMENT',
        `هذه المقارنة منصوصة صراحةً في السؤال: ${above} أعلى من ${below}`];
    }
    const d = pathLength(above, below);
    if (d === 2) {
      return [label(p), 'COUNTED_DIRECT_RELATIONS_ONLY',
        `لا توجد جملة مباشرة تربطهما، لكن خطوة انتقالية واحدة تحسمها: ${above} أعلى من ${below}`];
    }
    if (d && d >= 3) {
      return [label(p), 'MISCOUNTED_THE_CONFIRMED_PATHS',
        `المسار بينهما أطول من خطوتين فسهل إغفاله، لكنه يحسمها: ${above} أعلى من ${below}`];
    }
    return [label(p), 'COUNTED_ONE_BRANCH_ONLY',
      `الاثنان في فرع واحد، والفرع نفسه يرتبهما: ${above} أعلى من ${below}`];
  };
  const distractors = usable(ctx, rng.shuffle(determined).slice(0, 6).map(p => mk(...diagnose(p))));
  const {reasoningGraph, parameters} = graphMeta(nodes, edges);
  // RC2.5-2. Every offered pair needs its paths traced before it can be ruled
  // in or out, so no partial reading narrows the answer space: null, not a
  // number, is the honest value for the candidate measure here.
  const po = complexityMeta(nodes, edges, {type: 'undeterminedPair'}, null);
  // Asking which comparison stays open is a question ABOUT the set of consistent
  // orderings, but only when the order is genuinely partial and more than one
  // pair is open. A graph that leaves exactly one gap is a spot-the-gap item.
  if (po.verdict.band !== 'hard') return resample(ctx, branchUnresolved);
  return buildBase(ctx, {
    templateId: 'REL_M_BRANCH_UNRES',
    subskill: 'فروع وعلاقة غير محسومة',
    difficulty: 'hard',
    question: `${sentences(rng, edges)} أي مقارنة لا يمكن حسمها؟`,
    correct, distractors, format: v => String(v),
    steps: [
      `نرسم العلاقات كفروع بدل محاولة ترتيب الجميع في سلسلة واحدة.`,
      `نفحص كل ترتيب متوافق مع الجمل.`,
      `في بعض الترتيبات يسبق ${chosen[0]} صاحبَه، وفي بعضها يسبقه ${chosen[1]}؛ لذلك المقارنة بينهما غير محسومة، بينما لكل زوج آخر مسار يحسمه.`
    ],
    howToStart: 'ارسم فروعًا بدل محاولة ترتيب الجميع بالقوة.',
    remember: 'العلاقة بين عنصرين في فرعين مختلفين قد تبقى غير محسومة.',
    fastMethod: 'ابحث عن الزوج الوحيد الذي لا يربطه مسار مقارنة مؤكد.',
    estimatedSteps: 3, conceptTags: ['ordering', 'partial-order'], parameters,
    reasoningGraph,
    oracle: orderOracleSpec(nodes, edges, {type: 'undeterminedPair'},
      undetermined.map(p => p.slice().sort().join('|'))),
    askedUnknown: 'undeterminedPair', stageCount: 2,
    metadata: {graph_shape: shape, ...po.metadata},
    complexityFactors: {reasoningTransformations: 2, conceptCount: 2, graphDepth: nodes.length, conditionCount: edges.length, dependencyDepth: 2},
    textParams: false
  });
}

/**
 * RC2.5-2. Counting who is certainly above someone is TWO tasks, and the graph
 * decides which one was drawn:
 *
 *   everyone the count covers lies on ONE root-to-sink path — the answer is read
 *   off a single chain, transitivity and all: a routine transitive conclusion.
 *
 *   the count spans two or more branches — no chain contains the answer, and the
 *   branches have to be held together to know who is certainly above and who is
 *   merely not below.
 *
 * The two used to share a template id and a HARD label. They are separate
 * templates now, each sampled until the graph it drew is the kind it claims.
 */
function countAboveOnOneChain(ctx) {
  return countAboveAt(ctx, 'medium', 'REL_M_COUNT', countAboveOnOneChain);
}

function countAboveAcrossBranches(ctx) {
  return countAboveAt(ctx, 'hard', 'REL_H_COUNT_BRANCHED', countAboveAcrossBranches);
}

function countAboveAt(ctx, requiredBand, templateId, self) {
  const {rng} = ctx;
  // RC2-011. The graph was always built at size six, so the number of people
  // provably above the target clustered on one or two counts. The size varies
  // now; the target is still picked blind and the count is still read off the
  // graph, so nothing here consults the answer.
  const {nodes, edges, shape} = branchedGraph(rng, rng.pick([5, 6, 6, 7, 7, 8]));
  if (nodes.length < 5) return resample(ctx, self);
  const oracle = buildOrderOracle(nodes, edges);
  const target = rng.pick(nodes);
  const above = nodes.filter(n => n !== target && oracle.definitelyAbove(n, target));
  const count = above.length;
  const correct = COUNT_LABELS[count];
  if (!correct) return resample(ctx, self);
  // RC2-005: the two modelled wrong methods, measured on the graph as drawn.
  const directlyAbove = edges.filter(([, below]) => below === target).length;
  const couldBeAbove = nodes.filter(n => n !== target && !oracle.definitelyAbove(target, n)).length;
  // RC2.5-5. Each wrong count is attached to the slip that actually produces it,
  // rather than every label below the key sharing one diagnosis and every label
  // above it sharing another. Two of them are specific to a count that spans
  // branches, which is the case this template exists to ask about:
  //
  //   one branch only     follow the path the target sits on and stop there
  //   from one ordering   collapse the partial order into a single arrangement
  //                       and count whoever precedes the target in it
  const targetPaths = rootPathsThrough(nodes, edges, target);
  const oneBranchCount = targetPaths.length
    ? Math.max(...targetPaths.map(p => p.indexOf(target)))
    : 0;
  const singleOrderingCount = oracle.extensions[0].indexOf(target);
  const modelled = [
    [directlyAbove, 'COUNTED_DIRECT_RELATIONS_ONLY',
      `عدّ من ذُكروا فوق ${target} مباشرة فقط دون إكمال الاستنتاج الانتقالي`],
    [couldBeAbove, 'COUNTED_EVERYONE',
      `عدّ كل من لا يثبت أن ${target} أعلى منهم، لا من يثبت تفوقهم عليه`],
    [oneBranchCount, 'COUNTED_ONE_BRANCH_ONLY',
      `تتبّع الفرع الذي يقع فيه ${target} وحده وتوقّف عنده`],
    [singleOrderingCount, 'COUNTED_FROM_ONE_ORDERING',
      `رتّب الجميع في ترتيب واحد ممكن ثم عدّ من سبق ${target} فيه`],
    [count + 1, 'OFF_BY_ONE_STEP', `أدخل ${target} نفسه في العدّ`],
    [count - 1, 'OFF_BY_ONE_STEP', `أسقط واحدًا من أصحاب المسارات المؤكدة`]
  ];
  //
  // Several of these can land on the same count, and on a small graph they can
  // between them cover only two labels. The remaining labels are still offered —
  // the option set needs five — but they are offered as what they are: a
  // miscount of the confirmed paths, not a specific slip they did not come from.
  const offered = new Set([count]);
  const take = ([v, id, why]) => {
    if (!Number.isInteger(v) || v < 0 || v >= COUNT_LABELS.length || offered.has(v)) return [];
    offered.add(v);
    return [mk(COUNT_LABELS[v], id, why)];
  };
  const fromSlips = modelled.flatMap(take);
  const fill = COUNT_LABELS.map((_, v) => v).flatMap(v => take([
    v, 'MISCOUNTED_THE_CONFIRMED_PATHS',
    `عدّ ${COUNT_LABELS[v]} بدل ${COUNT_LABELS[count]} عند تتبّع المسارات المؤكدة`
  ]));
  const distractors = usable(ctx, [
    ...fromSlips, ...fill,
    mk(UNDETERMINED, 'RESOLVED_AN_UNRESOLVED_PAIR', 'اعتبار العدد غير قابل للتحديد رغم وضوح المسارات')
  ]);
  const {reasoningGraph, parameters} = graphMeta(nodes, edges);
  // RC2.5-2. A partial reading of the graph puts the count somewhere between
  // "only the people named directly above" and "everyone not provably below";
  // the width of that span is how many answers are genuinely in play.
  const po = complexityMeta(nodes, edges, {type: 'countAbove', target},
    couldBeAbove - directlyAbove + 1);
  // The graph decides the band; the band was requested, so a graph of the other
  // kind is discarded. Nothing here looks at the answer.
  if (po.verdict.band !== requiredBand) return resample(ctx, self);
  return buildBase(ctx, {
    templateId,
    subskill: requiredBand === 'hard'
      ? 'عدّ المؤكد تفوقهم عبر فرعين'
      : 'عدّ الأشخاص المؤكد تفوقهم على شخص محدد',
    difficulty: requiredBand,
    question: `${sentences(rng, edges)} كم شخصًا نعرف يقينًا أنهم أسرع من ${target}؟`,
    correct, distractors, format: v => String(v),
    steps: [
      `نبني كل المسارات التي تنتهي عند ${target}.`,
      `نستخدم الاستنتاج الانتقالي: إذا كان أ أسرع من ب وب أسرع من ج، فأ أسرع من ج.`,
      `${count ? `من نعرف يقينًا أنهم أسرع من ${target}: ${above.join('، ')}` : `لا أحد نعرف يقينًا أنه أسرع من ${target}`}؛ إذن الإجابة ${correct}.`
    ],
    howToStart: 'ابنِ كل المسارات التي تنتهي بالشخص المطلوب ثم عدّ من فوقه.',
    remember: 'استخدم الاستنتاج الانتقالي، ولا تعدّ إلا من له مسار مؤكد.',
    fastMethod: 'عدّ كل من يمكن إثبات أنه أعلى من الهدف.',
    estimatedSteps: 4, conceptTags: ['ordering', 'transitivity'], parameters,
    reasoningGraph,
    oracle: orderOracleSpec(nodes, edges, {type: 'countAbove', target}, count, correct,
      Object.fromEntries(COUNT_LABELS.map((labelText, i) => [String(i), labelText]))),
    askedUnknown: 'countAbove', stageCount: 2,
    // RC2-005. Two wrong methods are modelled here, because modelling only one
    // of them is what made the first version of this rule wrong.
    //
    //   COUNTED_DIRECT_RELATIONS_ONLY  counts the stated sentences that name the
    //                                  target, skipping the transitive step.
    //   COUNTED_EVERYONE               counts everyone not provably below the
    //                                  target, skipping the undetermined step.
    //
    // The item is degenerate only when BOTH land on the key, because then no
    // modelled error is distinguishable from correct reasoning. Requiring the
    // first alone rejected 56.7% of draws and, worse, removed the answers
    // «لا أحد» and «شخص واحد» from the template entirely — trading a measurement
    // defect for a much larger statistical leak (RC2-011). Which misconception
    // is the live discriminator is recorded rather than used to steer the draw.
    pedagogy: {
      targetSkill: 'COUNT_PROVABLY_ABOVE',
      targetMisconception: 'COUNTED_DIRECT_RELATIONS_ONLY',
      degenerateWhen: [{
        when: directlyAbove === count && couldBeAbove === count,
        note: 'neither counting only the stated sentences nor counting everyone not provably below differs from the key'
      }]
    },
    metadata: {
      graph_shape: shape,
      transitive_step_required: directlyAbove !== count,
      undetermined_step_required: couldBeAbove !== count,
      ...po.metadata
    },
    complexityFactors: {reasoningTransformations: 3, conceptCount: 2, graphDepth: nodes.length, conditionCount: edges.length, dependencyDepth: 2},
    textParams: false
  });
}

function statementOptions(rng, oracle, nodes) {
  const guaranteed = [];
  const notGuaranteed = [];
  for (const a of nodes) {
    for (const b of nodes) {
      if (a === b) continue;
      const text = `${a} أسرع من ${b}`;
      if (oracle.definitelyAbove(a, b)) guaranteed.push({a, b, text});
      else notGuaranteed.push({a, b, text, undetermined: oracle.undetermined(a, b)});
    }
  }
  return {guaranteed: rng.shuffle(guaranteed), notGuaranteed: rng.shuffle(notGuaranteed)};
}

function confirmedStatement(ctx) {
  const {rng} = ctx;
  const {nodes, edges, shape} = branchedGraph(rng, rng.pick([5, 6]));
  if (nodes.length < 4) return resample(ctx, confirmedStatement);
  const oracle = buildOrderOracle(nodes, edges);
  const {guaranteed, notGuaranteed} = statementOptions(rng, oracle, nodes);
  // Only indirect facts are worth asking about: a sentence copied from the
  // stem would make the item a reading exercise.
  const indirect = guaranteed.filter(g => !edges.some(([x, y]) => x === g.a && y === g.b));
  if (!indirect.length || notGuaranteed.length < 5) return resample(ctx, confirmedStatement);
  const pick = rng.pick(indirect);
  const correct = pick.text;
  const distractors = usable(ctx, notGuaranteed.slice(0, 6).map(s => mk(
    s.text,
    s.undetermined ? 'RELATION_REQUIRES_UNSTATED_ASSUMPTION' : 'RELATION_CONTRADICTS_STATEMENT',
    s.undetermined ? `لا يوجد مسار يحسم العلاقة بين ${s.a} و${s.b}` : `المعطيات تثبت العكس: ${s.b} أسرع من ${s.a}`
  )));
  const {reasoningGraph, parameters} = graphMeta(nodes, edges);
  // RC2.5-2. A statement that contradicts a stated sentence is eliminated by
  // reading that one sentence; an undetermined one is not. The second kind is
  // what keeps the answer space open.
  const po = complexityMeta(nodes, edges, {type: 'pairRelation', a: pick.a, b: pick.b},
    notGuaranteed.slice(0, 6).filter(x => x.undetermined).length + 1);
  return buildBase(ctx, {
    templateId: 'REL_M_CONFIRM',
    subskill: 'اختيار عبارة مؤكدة',
    difficulty: 'hard',
    question: `${sentences(rng, edges)} أي عبارة مؤكدة؟`,
    correct, distractors, format: v => String(v),
    steps: [
      `نتتبع مسارًا من ${pick.a} إلى ${pick.b} عبر العلاقات المعطاة.`,
      `هذا المسار قائم في كل ترتيب متوافق مع الجمل، إذن العبارة مؤكدة.`,
      `بقية العبارات إما تخالف علاقة منصوصة أو تحتاج افتراضًا غير موجود.`
    ],
    howToStart: 'ابحث عن عبارة يمكن إثباتها بسلسلة واضحة.',
    remember: 'لا تفترض علاقة لم يثبتها النص.',
    fastMethod: 'اتبع أقصر سلسلة تثبت العبارة.',
    estimatedSteps: 3, conceptTags: ['ordering', 'transitivity'], parameters,
    reasoningGraph,
    oracle: orderOracleSpec(nodes, edges, {
      type: 'guaranteed',
      statements: [{id: correct, above: pick.a, below: pick.b}]
    }, [correct], correct),
    askedUnknown: 'guaranteedStatement', stageCount: 2,
    // RC2-005. The item is only a reasoning item while the guaranteed statement
    // has to be derived. A statement copied verbatim from the stem is answerable
    // by matching text. The sampler already prefers an indirect statement; this
    // declares the same requirement so the pipeline enforces it too, rather than
    // it living only inside the sampler where nothing could see it.
    pedagogy: {
      targetSkill: 'DERIVE_GUARANTEED_RELATION', targetMisconception: 'RELATION_REQUIRES_UNSTATED_ASSUMPTION',
      degenerateWhen: [{
        when: edges.some(([x, y]) => x === pick.a && y === pick.b),
        note: 'the guaranteed statement is a sentence of the stem: no derivation is needed'
      }]
    },
    metadata: {graph_shape: shape, ...po.metadata},
    complexityFactors: {reasoningTransformations: 2, conceptCount: 2, graphDepth: nodes.length, conditionCount: edges.length, dependencyDepth: 2},
    textParams: false
  });
}

function branchGuaranteed(ctx) {
  const {rng} = ctx;
  const {nodes, edges, shape} = branchedGraph(rng, 6);
  if (nodes.length < 5) return resample(ctx, branchGuaranteed);
  const oracle = buildOrderOracle(nodes, edges);
  const undetermined = oracle.allUndeterminedPairs();
  if (!undetermined.length) return resample(ctx, branchGuaranteed);
  const {guaranteed, notGuaranteed} = statementOptions(rng, oracle, nodes);
  const indirect = guaranteed.filter(g => !edges.some(([x, y]) => x === g.a && y === g.b));
  if (!indirect.length || notGuaranteed.length < 5) return resample(ctx, branchGuaranteed);
  const pick = rng.pick(indirect);
  const openPair = rng.pick(undetermined);
  const correct = pick.text;
  const distractors = usable(ctx, notGuaranteed.slice(0, 6).map(s => mk(
    s.text,
    s.undetermined ? 'RESOLVED_AN_UNRESOLVED_PAIR' : 'RELATION_CONTRADICTS_STATEMENT',
    s.undetermined ? `حسم العلاقة بين ${s.a} و${s.b} رغم أن المعطيات تتركها مفتوحة` : `المعطيات تثبت العكس: ${s.b} أسرع من ${s.a}`
  )));
  const {reasoningGraph, parameters} = graphMeta(nodes, edges);
  // RC2.5-2. The question names an open pair and asks what survives BOTH of its
  // orders, so it is asked over the set of consistent orderings by construction.
  const po = complexityMeta(nodes, edges,
    {type: 'guarantee', a: pick.a, b: pick.b, asksIndeterminate: true},
    notGuaranteed.slice(0, 6).filter(x => x.undetermined).length + 1);
  return buildBase(ctx, {
    templateId: 'REL_H_GUARANTEE',
    subskill: 'استنتاج مضمون رغم وجود فروع غير محسومة',
    difficulty: 'hard',
    question: `${sentences(rng, edges)} أي عبارة يجب أن تكون صحيحة مهما كان ترتيب ${openPair[0]} و${openPair[1]}؟`,
    correct, distractors, format: v => String(v),
    steps: [
      `ترتيب ${openPair[0]} و${openPair[1]} غير محسوم، فلا يصح بناء أي استنتاج عليه.`,
      `لكن يوجد مسار مؤكد من ${pick.a} إلى ${pick.b} لا يمر بهذا الزوج.`,
      `هذا المسار قائم في كل ترتيب متوافق مع الجمل، إذن العبارة مضمونة.`
    ],
    howToStart: 'ميّز بين العلاقات المضمونة والعلاقات غير المحسومة داخل الفروع.',
    remember: 'وجود فرعين لا يمنع وجود استنتاجات يقينية عبر القمة والقاع.',
    fastMethod: 'ابحث عن علاقة لها مسار مؤكد بغض النظر عن ترتيب الفرعين.',
    estimatedSteps: 4, conceptTags: ['ordering', 'partial-order'], parameters,
    reasoningGraph,
    oracle: orderOracleSpec(nodes, edges, {
      type: 'guaranteed',
      statements: [{id: correct, above: pick.a, below: pick.b}]
    }, [correct], correct),
    askedUnknown: 'guaranteedDespiteBranches', stageCount: 3,
    // RC2-005, as REL_M_CONFIRM, and one more: the guaranteed statement must not
    // be about the open pair the question names, or the question answers itself.
    pedagogy: {
      targetSkill: 'DERIVE_GUARANTEED_RELATION', targetMisconception: 'RESOLVED_AN_UNRESOLVED_PAIR',
      degenerateWhen: [
        {
          when: edges.some(([x, y]) => x === pick.a && y === pick.b),
          note: 'the guaranteed statement is a sentence of the stem: no derivation is needed'
        },
        {
          when: [pick.a, pick.b].includes(openPair[0]) && [pick.a, pick.b].includes(openPair[1]),
          note: 'the guaranteed statement is about the open pair the question declares open'
        }
      ]
    },
    metadata: {graph_shape: shape, ...po.metadata},
    complexityFactors: {reasoningTransformations: 3, conceptCount: 3, graphDepth: nodes.length, conditionCount: edges.length, dependencyDepth: 3},
    textParams: false
  });
}

/**
 * RC2-010. This template used to answer "cannot be determined" every single
 * time — 91 of 91 instances in the frozen RC1 corpus, entropy zero. The cause
 * was here in the sampler: it searched the graph for a position the orderings
 * disagreed about and resampled the whole graph whenever none existed. That is
 * target-answer sampling, and it made the question carry no information.
 *
 * Now the position is chosen blind to the answer and the answer is whatever the
 * enumeration gives. Both outcomes arise from the sampled graph itself; nothing
 * is retried, filtered or weighted on the strength of what the answer turned out
 * to be. Sometimes the partial order pins the position down and sometimes it
 * does not, which is the skill the item is supposed to measure.
 */
/**
 * RC2.5-2. Asking who holds a position stays ONE template, because the routine
 * case — an order the statements settle completely — is REL_E_CHAIN's job and
 * splitting it off here would only duplicate that template. What changes is the
 * bar: the graph must be a genuinely partial order, with more than one pair left
 * open and a proof depth that makes the position something to work out rather
 * than read off.
 *
 * The band condition is computed from the GRAPH and the asked position, both
 * drawn blind. It deliberately does not consult whether the position turned out
 * to be determined: that is the answer, and RC2-010 exists because an earlier
 * version resampled on exactly that, leaving the template answering "cannot be
 * determined" every time.
 */
function partialOrderPosition(ctx) {
  const {rng} = ctx;
  const {nodes, edges, shape} = partialOrderPositionGraph(rng);
  // Structural resample only: the graph must be big enough to ask about a
  // middle position at all. This looks at the shape, never at the answer.
  if (nodes.length < 5) return resample(ctx, partialOrderPosition);
  const oracle = buildOrderOracle(nodes, edges);

  const targetPos = rng.int(2, nodes.length - 1);
  const who = oracle.whoAtPosition(targetPos);
  const determined = who !== null && who !== undefined;
  const correct = determined ? who : UNDETERMINED;
  const candidates = [...new Set(oracle.extensions.map(ext => ext[targetPos - 1]))];

  // RC2.6-4. A name that can hold the position NEXT to the one asked is a
  // different mistake from one that can hold no relevant position at all —
  // reading the rank off by one, rather than misreading the order.
  const neighbours = new Set([targetPos - 1, targetPos + 1]
    .filter(k => k >= 1 && k <= nodes.length)
    .flatMap(k => oracle.extensions.map(ext => ext[k - 1])));
  const wrongNames = nodes.filter(n => n !== correct).map(n => {
    if (candidates.includes(n)) {
      return mk(n, 'RESOLVED_AN_UNRESOLVED_PAIR',
        `${n} أحد المرشحين للمركز ${positionWord(targetPos)}، لكنه ليس الوحيد`);
    }
    if (neighbours.has(n)) {
      return mk(n, 'OFF_BY_ONE_STEP',
        `${n} يمكن أن يشغل مركزًا مجاورًا للمركز ${positionWord(targetPos)}، لا المركز نفسه`);
    }
    return mk(n, 'RELATION_CONTRADICTS_STATEMENT',
      `${n} لا يمكن أن يشغل المركز ${positionWord(targetPos)} في أي ترتيب متوافق`);
  });
  // When the position IS pinned down, "cannot be determined" is the misconception
  // the item exists to catch — stopping before the order is fully derived — so it
  // must actually be on the paper. Distractor selection is rank-blind (RC2-001),
  // which means a pool larger than five leaves inclusion to chance; the pool is
  // therefore built at exactly five for this case. This is a pedagogical choice
  // about which errors to show, not a choice made on any property of the answer.
  const distractors = usable(ctx, determined
    ? [
      mk(UNDETERMINED, 'RELATION_REQUIRES_UNSTATED_ASSUMPTION',
        `توقّف قبل استنتاج الترتيب كاملًا رغم أن المركز ${positionWord(targetPos)} محسوم`),
      ...wrongNames.slice(0, 4)
    ]
    : wrongNames);

  const {reasoningGraph, parameters} = graphMeta(nodes, edges);
  // RC2.5-2. The names that can hold the asked position across the consistent
  // orderings, plus the "cannot be determined" reading, which is always in play
  // until the orderings have actually been examined.
  // No candidate-count measure is passed: for a position question the offered
  // answers are names, and how many a solver can eliminate before doing the work
  // is not a graph fact. D1 therefore does not apply here.
  const po = complexityMeta(nodes, edges, {type: 'position', position: targetPos}, null);
  if (po.verdict.band !== 'hard') return resample(ctx, partialOrderPosition);
  return buildBase(ctx, {
    templateId: 'REL_H_POSITION',
    subskill: determined ? 'مركز محسوم في ترتيب جزئي' : 'مركز غير محسوم في ترتيب جزئي',
    difficulty: 'hard',
    question: `${sentences(rng, edges)} من صاحب المركز ${positionWord(targetPos)}؟`,
    correct, distractors, format: v => String(v),
    steps: determined
      ? [
        `نفحص كل ترتيب متوافق مع الجمل.`,
        `المركز ${positionWord(targetPos)} يشغله ${correct} في كل ترتيب متوافق دون استثناء.`,
        `ما دام المرشح واحدًا في جميع الترتيبات، فالمركز محسوم.`
      ]
      : [
        `نفحص كل ترتيب متوافق مع الجمل.`,
        `المركز ${positionWord(targetPos)} يشغله ${candidates.join(' أو ')} باختلاف الترتيب.`,
        `ما دام أكثر من مرشح ممكنًا، فالمركز غير قابل للتحديد.`
      ],
    howToStart: 'حدد ما هو ثابت أولًا، ثم انظر هل المركز المطلوب يقع بين عنصرين غير مرتبين.',
    remember: 'في الترتيب الجزئي قد يكون المركز محسومًا وقد لا يكون؛ افحص كل الترتيبات المتوافقة قبل أن تقرر.',
    fastMethod: 'اعدّ المرشحين الممكنين للمركز المطلوب: مرشح واحد يعني أنه محسوم، وأكثر من مرشح يعني أنه غير محسوم.',
    estimatedSteps: 4, conceptTags: ['ordering', 'partial-order'], parameters,
    reasoningGraph,
    oracle: orderOracleSpec(nodes, edges, {type: 'position', position: targetPos}, correct, UNDETERMINED),
    askedUnknown: determined ? `position${targetPos}` : `undeterminedPosition${targetPos}`,
    stageCount: 3,
    metadata: {graph_shape: shape, position_determined: determined, ...po.metadata},
    complexityFactors: {reasoningTransformations: 3, conceptCount: 3, graphDepth: nodes.length, conditionCount: edges.length, dependencyDepth: 3},
    textParams: false
  });
}

// ---------------------------------------------------------------------------
// RC2.9.4-B2. Two more EASY constructions. Both EASY templates this family held
// read a POSITION off a chain. These ask two different jobs: which statement
// the chain guarantees (a truth judgement over a total order, where every
// wrong option contradicts a stated relation), and a QUANTIFIED chain — each
// statement carries a gap, and the asked gap is composed from them.
// ---------------------------------------------------------------------------

function chainStatementTrue(ctx) {
  const {rng} = ctx;
  const {nodes, edges} = chainGraph(rng, 4);
  const oracle = buildOrderOracle(nodes, edges);
  const verb = 'أكبر سنًّا من';
  const stated = new Set(edges.map(([a, b]) => `${a}>${b}`));
  const guaranteed = [];
  const contradicted = [];
  for (const a of nodes) {
    for (const b of nodes) {
      if (a === b) continue;
      const text = `${a} ${verb} ${b}`;
      if (oracle.definitelyAbove(a, b)) guaranteed.push({a, b, text, direct: stated.has(`${a}>${b}`)});
      else contradicted.push({a, b, text});
    }
  }
  // The key must need transitivity: a sentence copied from the stem is reading.
  const indirect = guaranteed.filter(g => !g.direct);
  if (!indirect.length || contradicted.length < 5) return resample(ctx, chainStatementTrue);
  const pick = rng.pick(indirect);
  const correct = pick.text;
  const distractors = usable(ctx, rng.shuffle(contradicted).slice(0, 6).map(s => mk(
    s.text, 'RELATION_CONTRADICTS_STATEMENT',
    `المعطيات تثبت العكس: ${s.b} ${verb} ${s.a}`
  )));
  const {reasoningGraph, parameters} = graphMeta(nodes, edges);
  return buildBase(ctx, {
    templateId: 'REL_E_STATEMENT_TRUE',
    subskill: 'اختيار العبارة الصحيحة من ترتيب كامل',
    difficulty: 'easy',
    question: `${sentences(rng, edges, verb)} أي العبارات التالية صحيحة؟`,
    correct, distractors, format: v => String(v),
    steps: [
      `نربط الجمل في ترتيب واحد: ${oracle.extensions[0].join(' > ')}.`,
      `في هذا الترتيب يسبق ${pick.a} ${pick.b}، فالعبارة «${correct}» صحيحة.`,
      'كل عبارة أخرى تعكس علاقة يثبتها الترتيب.'
    ],
    howToStart: 'رتّب الأشخاص من الأكبر إلى الأصغر أولًا.',
    remember: 'إذا كان أ أكبر من ب، وب أكبر من ج، فإن أ أكبر من ج.',
    fastMethod: 'اكتب الترتيب الكامل ثم افحص كل عبارة عليه.',
    estimatedSteps: 2, conceptTags: ['ordering', 'transitivity'], parameters,
    reasoningGraph,
    oracle: orderOracleSpec(nodes, edges, {
      type: 'guaranteed',
      statements: [{id: correct, above: pick.a, below: pick.b}]
    }, [correct], correct),
    askedUnknown: 'trueStatementInChain', stageCount: 1,
    pedagogy: {
      targetSkill: 'TRANSITIVE_CONCLUSION_ON_A_CHAIN', targetMisconception: 'RELATION_CONTRADICTS_STATEMENT',
      degenerateWhen: [{when: pick.direct, note: 'the true statement is a sentence of the stem'}]
    },
    complexityFactors: {reasoningTransformations: 1, conceptCount: 1, graphDepth: nodes.length, dependencyDepth: 1},
    textParams: false
  });
}

function quantifiedChain(ctx) {
  const {rng} = ctx;
  const [a, b, c] = rng.sample(NAMES, 3);
  const d1 = rng.pick([3, 4, 5, 6, 7, 8, 9, 10, 12]);
  // Three and up: the lexicon spells «two» as a word, and «بـ» may only
  // precede a numeral (RC2.8-6).
  const d2 = rng.pick([3, 4, 5, 6, 7, 8, 9, 11].filter(v => v !== d1));
  // Two directions: b sits between a and c (gaps add), or b is above both
  // (gaps subtract). Which one is drawn decides the operation, never the names.
  const same = rng.bool();
  const correct = same ? d1 + d2 : Math.abs(d1 - d2);
  const [hi, lo] = d1 > d2 ? [d1, d2] : [d2, d1];
  const params = {firstGap: d1, secondGap: d2};
  const distractors = usable(ctx, [
    mk(same ? Math.abs(d1 - d2) : d1 + d2, same ? 'SUBTRACTED_INSTEAD_OF_ADDED' : 'ADDED_WHERE_A_DIFFERENCE_BELONGS',
      same ? `${hi} − ${lo}` : `${d1} + ${d2}`, 2),
    mk(d1, 'USED_GIVEN_VALUE_AS_ANSWER', `الفرق المعطى ${d1}`),
    mk(d2, 'USED_GIVEN_VALUE_AS_ANSWER', `الفرق المعطى ${d2}`),
    mk(d1 * d2, 'MULTIPLIED_COUNTS_INSTEAD_OF_RATE', `${d1} × ${d2}`, 2),
    mk(2 * d1 + d2, 'APPLIED_STEP_TWICE', `2 × ${d1} + ${d2}`, 2),
    mk(d1 + 2 * d2, 'APPLIED_STEP_TWICE', `${d1} + 2 × ${d2}`, 2)
  ], {allowZero: false});
  if (distinctValues(distractors.filter(d => d.value !== correct)) < 5 || correct === 0) return resample(ctx, quantifiedChain);
  const second = same
    ? `${b} أطول من ${c} بـ${u(d2, 'cm', 'oblique')}`
    : `${c} أقصر من ${a} بـ${u(d2, 'cm', 'oblique')}`;
  const ask = same ? `بكم سنتيمترًا يزيد طول ${a} على طول ${c}؟`
    : `بكم سنتيمترًا يختلف طول ${b} عن طول ${c}؟`;
  const facts = rng.shuffle([`${a} أطول من ${b} بـ${u(d1, 'cm', 'oblique')}`, second]);
  const stem = composeSentences(ctx, `${facts.join('، و')}. ${ask}`);
  return buildBase(ctx, {
    templateId: 'REL_E_GAP_CHAIN',
    subskill: same ? 'تركيب فرقين على سلسلة واحدة' : 'فرق بين طرفين قيس كلٌّ منهما من الشخص نفسه',
    difficulty: 'easy',
    question: stem.text,
    stemStructure: stem.structure, informationOrder: stem.order,
    correct, distractors, format: unitFormat('cm'),
    steps: same ? [
      `${a} يزيد على ${b} بـ${d1}، و${b} يزيد على ${c} بـ${d2}.`,
      `الفرق بين ${a} و${c} = ${d1} + ${d2} = ${correct}.`
    ] : [
      `${b} أقصر من ${a} بـ${d1}، و${c} أقصر من ${a} بـ${d2}، فكلاهما قيس من ${a}.`,
      `الفرق بينهما = ${hi} − ${lo} = ${correct}.`
    ],
    howToStart: 'حدد أولًا مَن الأطول ومَن الأقصر في كل جملة.',
    remember: same ? 'إذا كان الشخص الأوسط بين الطرفين جُمعت المسافتان.' : 'إذا قيس الطرفان من الشخص نفسه طُرحت المسافتان.',
    fastMethod: same ? `الأوسط بين الطرفين: اجمع الفرقين — هنا ${d1} + ${d2}.` : `الطرفان مقيسان من الشخص نفسه: اطرح الفرقين — هنا ${hi} − ${lo}.`,
    estimatedSteps: 2, conceptTags: ['ordering', 'quantified-comparison'], parameters: params,
    oracle: {kind: 'constraint', answerKind: 'number', constraints: [eq(X, same ? add(d1, d2) : sub(hi, lo))]},
    askedUnknown: 'chainedGap', stageCount: 1,
    direction: same ? 'forward' : 'backward',
    pedagogy: {
      targetSkill: 'COMPOSE_STATED_GAPS',
      targetMisconception: same ? 'SUBTRACTED_INSTEAD_OF_ADDED' : 'ADDED_WHERE_A_DIFFERENCE_BELONGS',
      wrongMethodValue: same ? Math.abs(d1 - d2) : d1 + d2,
      degenerateWhen: [{when: d1 === d2, note: 'equal gaps: the difference direction collapses to zero'}]
    },
    complexityFactors: {reasoningTransformations: 1, conceptCount: 1, graphDepth: 3, dependencyDepth: 1},
    textParams: {essentialParams: ['firstGap', 'secondGap']}
  });
}
