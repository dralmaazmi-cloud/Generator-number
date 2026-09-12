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

import {mk, usable, buildBase} from './_shared.js';
import {buildOrderOracle} from '../qa/relational-oracle.js';
import {canonicalGraph} from '../qa/fingerprint.js';

const NAMES = ['خالد', 'سالم', 'ماجد', 'راشد', 'ناصر', 'فهد', 'علي', 'بدر', 'حمد', 'سامي', 'نورة', 'سارة', 'هند', 'ريم', 'ليان', 'مريم'];
const UNDETERMINED = 'لا يمكن تحديده';
const COUNT_LABELS = ['لا أحد', 'شخص واحد', 'شخصان', 'ثلاثة أشخاص', 'أربعة أشخاص', 'خمسة أشخاص'];
const POSITION_WORDS = {1: 'الأول', 2: 'الثاني', 3: 'الثالث', 4: 'الرابع', 5: 'الخامس'};

export function generateRelational({difficulty, rng, seed, engineVersion}) {
  const ctx = {difficulty, rng, seed, engineVersion, family: 'relational', family_ar: 'المقارنة والترتيب العلاقاتي', category: 'المقارنة والترتيب العلاقاتي'};
  const list = difficulty === 'easy' ? [fullChainPosition, betweenRelation]
    : difficulty === 'medium' ? [branchUnresolved, countAbove, confirmedStatement]
    : [branchGuaranteed, partialOrderPosition];
  return rng.pick(list)(ctx);
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

/** Sentences in a randomised order, so the first statement is not always the top. */
function sentences(rng, edges, verb = 'أسرع من') {
  return rng.shuffle(edges.map(([a, b]) => `${a} ${verb} ${b}`)).join('. ') + '.';
}

function orderOracleSpec(nodes, edges, ask, expected, expectedDisplay, labels) {
  return {kind: 'order', nodes, edges, ask, expected, expectedDisplay, labels};
}

// --- templates -------------------------------------------------------------

function fullChainPosition(ctx) {
  const {rng} = ctx;
  const size = rng.pick([5, 6]);
  const {nodes, edges} = chainGraph(rng, size);
  const oracle = buildOrderOracle(nodes, edges);
  const targetPos = rng.int(2, size - 1);
  const correct = oracle.whoAtPosition(targetPos);
  if (!correct) return fullChainPosition(ctx);
  const distractors = usable([
    ...nodes.filter(n => n !== correct).map(n => {
      const pos = oracle.positionsOf(n)[0];
      return mk(n, 'COUNTED_DIRECT_RELATIONS_ONLY', `قراءة المركز ${POSITION_WORDS[pos] || pos} بدل ${POSITION_WORDS[targetPos]}`);
    }),
    mk(UNDETERMINED, 'RESOLVED_AN_UNRESOLVED_PAIR', 'اعتبار الترتيب غير محسوم رغم أن السلسلة كاملة')
  ]);
  const {reasoningGraph, parameters} = graphMeta(nodes, edges);
  return buildBase(ctx, {
    templateId: 'REL_E_CHAIN',
    subskill: 'ترتيب كامل وتحديد مركز',
    difficulty: 'easy',
    question: `${sentences(rng, edges)} من صاحب المركز ${POSITION_WORDS[targetPos]} من الأسرع إلى الأبطأ؟`,
    correct, distractors, format: v => String(v),
    steps: [
      `نربط العلاقات في سلسلة واحدة: ${oracle.extensions[0].join(' > ')}.`,
      `المركز المطلوب هو ${POSITION_WORDS[targetPos]}، إذن الإجابة ${correct}.`
    ],
    howToStart: 'حوّل الجمل إلى سلسلة واحدة.',
    remember: 'إذا كانت كل العلاقات قابلة للربط، اقرأ المركز المطلوب مباشرة.',
    fastMethod: 'اكتب الترتيب ثم عدّ المراكز.',
    estimatedSteps: 2, conceptTags: ['ordering'], parameters,
    reasoningGraph,
    oracle: orderOracleSpec(nodes, edges, {type: 'position', position: targetPos}, correct, correct),
    askedUnknown: `position${targetPos}`, stageCount: 1,
    complexityFactors: {reasoningTransformations: 1, conceptCount: 1, graphDepth: size, dependencyDepth: 1},
    textParams: false
  });
}

function betweenRelation(ctx) {
  const {rng} = ctx;
  const size = rng.pick([4, 5]);
  const {nodes, edges} = chainGraph(rng, size);
  const oracle = buildOrderOracle(nodes, edges);
  const targetPos = rng.int(2, size - 1);
  const correct = oracle.whoAtPosition(targetPos);
  if (!correct) return betweenRelation(ctx);
  const distractors = usable([
    ...nodes.filter(n => n !== correct).map(n => {
      const pos = oracle.positionsOf(n)[0];
      return mk(n, 'COUNTED_DIRECT_RELATIONS_ONLY', `قراءة المركز ${POSITION_WORDS[pos] || pos} بدل ${POSITION_WORDS[targetPos]}`);
    }),
    mk(UNDETERMINED, 'RESOLVED_AN_UNRESOLVED_PAIR', 'اعتبار الترتيب غير محسوم رغم اكتمال السلسلة'),
    mk('لا أحد', 'RELATION_CONTRADICTS_STATEMENT', 'نفي وجود شخص في هذا المركز رغم تحديده')
  ]);
  const {reasoningGraph, parameters} = graphMeta(nodes, edges);
  return buildBase(ctx, {
    templateId: 'REL_E_BETWEEN',
    subskill: 'تحديد شخص في مركز من ترتيب كامل',
    difficulty: 'easy',
    question: `${sentences(rng, edges, 'أطول من')} من صاحب المركز ${POSITION_WORDS[targetPos]} من الأطول إلى الأقصر؟`,
    correct, distractors, format: v => String(v),
    steps: [
      `من الجمل نحصل على الترتيب: ${oracle.extensions[0].join(' > ')}.`,
      `صاحب المركز ${POSITION_WORDS[targetPos]} هو ${correct}.`
    ],
    howToStart: 'ضع العلاقات في ترتيب واحد.',
    remember: 'الجملة «أطول من» تحدد اتجاه السلسلة.',
    fastMethod: 'اربط العلاقات ثم اقرأ المركز المطلوب.',
    estimatedSteps: 2, conceptTags: ['ordering'], parameters,
    reasoningGraph,
    oracle: orderOracleSpec(nodes, edges, {type: 'position', position: targetPos}, correct, correct),
    askedUnknown: `position${targetPos}`, stageCount: 1,
    complexityFactors: {reasoningTransformations: 1, conceptCount: 1, graphDepth: size, dependencyDepth: 1},
    textParams: false
  });
}

function branchUnresolved(ctx) {
  const {rng} = ctx;
  const {nodes, edges, shape} = branchedGraph(rng, rng.pick([5, 6]));
  if (nodes.length < 5) return branchUnresolved(ctx);
  const oracle = buildOrderOracle(nodes, edges);
  const undetermined = oracle.allUndeterminedPairs();
  if (!undetermined.length) return branchUnresolved(ctx);
  const determined = [];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      if (!oracle.undetermined(nodes[i], nodes[j])) determined.push([nodes[i], nodes[j]]);
    }
  }
  if (determined.length < 5) return branchUnresolved(ctx);
  // Section 17-B: the undecidable pair is chosen at random among all of them,
  // not fixed to the first two branch heads.
  const chosen = rng.pick(undetermined);
  const label = pair => `${pair[0]} و${pair[1]}`;
  const correct = label(chosen);
  const distractors = usable(rng.shuffle(determined).slice(0, 6).map(p => {
    const [a, b] = p;
    const above = oracle.definitelyAbove(a, b) ? a : b;
    const below = above === a ? b : a;
    return mk(label(p), 'RELATION_REQUIRES_UNSTATED_ASSUMPTION', `هذه المقارنة محسومة: ${above} أعلى من ${below} عبر سلسلة واضحة`);
  }));
  const {reasoningGraph, parameters} = graphMeta(nodes, edges);
  return buildBase(ctx, {
    templateId: 'REL_M_BRANCH_UNRES',
    subskill: 'فروع وعلاقة غير محسومة',
    difficulty: 'medium',
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
    metadata: {graph_shape: shape},
    complexityFactors: {reasoningTransformations: 2, conceptCount: 2, graphDepth: nodes.length, conditionCount: edges.length, dependencyDepth: 2},
    textParams: false
  });
}

function countAbove(ctx) {
  const {rng} = ctx;
  const {nodes, edges, shape} = branchedGraph(rng, 6);
  if (nodes.length < 5) return countAbove(ctx);
  const oracle = buildOrderOracle(nodes, edges);
  const target = rng.pick(nodes);
  const above = nodes.filter(n => n !== target && oracle.definitelyAbove(n, target));
  const count = above.length;
  const correct = COUNT_LABELS[count];
  if (!correct) return countAbove(ctx);
  const distractors = usable(
    COUNT_LABELS.filter((_, i) => i !== count).map((labelText, i) => mk(
      labelText,
      i < count ? 'COUNTED_DIRECT_RELATIONS_ONLY' : 'COUNTED_EVERYONE',
      i < count ? `عدّ ${labelText} فقط دون إكمال الاستنتاج الانتقالي` : `عدّ ${labelText} بإدخال من لا يثبت تفوقهم`
    )).concat([mk(UNDETERMINED, 'RESOLVED_AN_UNRESOLVED_PAIR', 'اعتبار العدد غير قابل للتحديد رغم وضوح المسارات')])
  );
  const {reasoningGraph, parameters} = graphMeta(nodes, edges);
  return buildBase(ctx, {
    templateId: 'REL_M_COUNT',
    subskill: 'عدّ الأشخاص المؤكد تفوقهم على شخص محدد',
    difficulty: 'medium',
    question: `${sentences(rng, edges)} كم شخصًا نعرف يقينًا أنهم أسرع من ${target}؟`,
    correct, distractors, format: v => String(v),
    steps: [
      `نبني كل المسارات التي تنتهي عند ${target}.`,
      `نستخدم الاستنتاج الانتقالي: إذا كان أ أسرع من ب وب أسرع من ج، فأ أسرع من ج.`,
      `${count ? `المؤكد تفوقهم على ${target} هم: ${above.join('، ')}` : `لا أحد يثبت تفوقه على ${target}`}؛ إذن الإجابة ${correct}.`
    ],
    howToStart: 'ابنِ كل المسارات التي تنتهي بالشخص المطلوب ثم عدّ من فوقه.',
    remember: 'استخدم الاستنتاج الانتقالي، ولا تعدّ إلا من له مسار مؤكد.',
    fastMethod: 'عدّ كل من يمكن إثبات أنه أعلى من الهدف.',
    estimatedSteps: 4, conceptTags: ['ordering', 'transitivity'], parameters,
    reasoningGraph,
    oracle: orderOracleSpec(nodes, edges, {type: 'countAbove', target}, count, correct,
      Object.fromEntries(COUNT_LABELS.map((labelText, i) => [String(i), labelText]))),
    askedUnknown: 'countAbove', stageCount: 2,
    metadata: {graph_shape: shape},
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
  if (nodes.length < 4) return confirmedStatement(ctx);
  const oracle = buildOrderOracle(nodes, edges);
  const {guaranteed, notGuaranteed} = statementOptions(rng, oracle, nodes);
  // Only indirect facts are worth asking about: a sentence copied from the
  // stem would make the item a reading exercise.
  const indirect = guaranteed.filter(g => !edges.some(([x, y]) => x === g.a && y === g.b));
  if (!indirect.length || notGuaranteed.length < 5) return confirmedStatement(ctx);
  const pick = rng.pick(indirect);
  const correct = pick.text;
  const distractors = usable(notGuaranteed.slice(0, 6).map(s => mk(
    s.text,
    s.undetermined ? 'RELATION_REQUIRES_UNSTATED_ASSUMPTION' : 'RELATION_CONTRADICTS_STATEMENT',
    s.undetermined ? `لا يوجد مسار يحسم العلاقة بين ${s.a} و${s.b}` : `المعطيات تثبت العكس: ${s.b} أسرع من ${s.a}`
  )));
  const {reasoningGraph, parameters} = graphMeta(nodes, edges);
  return buildBase(ctx, {
    templateId: 'REL_M_CONFIRM',
    subskill: 'اختيار عبارة مؤكدة',
    difficulty: 'medium',
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
    metadata: {graph_shape: shape},
    complexityFactors: {reasoningTransformations: 2, conceptCount: 2, graphDepth: nodes.length, conditionCount: edges.length, dependencyDepth: 2},
    textParams: false
  });
}

function branchGuaranteed(ctx) {
  const {rng} = ctx;
  const {nodes, edges, shape} = branchedGraph(rng, 6);
  if (nodes.length < 5) return branchGuaranteed(ctx);
  const oracle = buildOrderOracle(nodes, edges);
  const undetermined = oracle.allUndeterminedPairs();
  if (!undetermined.length) return branchGuaranteed(ctx);
  const {guaranteed, notGuaranteed} = statementOptions(rng, oracle, nodes);
  const indirect = guaranteed.filter(g => !edges.some(([x, y]) => x === g.a && y === g.b));
  if (!indirect.length || notGuaranteed.length < 5) return branchGuaranteed(ctx);
  const pick = rng.pick(indirect);
  const openPair = rng.pick(undetermined);
  const correct = pick.text;
  const distractors = usable(notGuaranteed.slice(0, 6).map(s => mk(
    s.text,
    s.undetermined ? 'RESOLVED_AN_UNRESOLVED_PAIR' : 'RELATION_CONTRADICTS_STATEMENT',
    s.undetermined ? `حسم العلاقة بين ${s.a} و${s.b} رغم أن المعطيات تتركها مفتوحة` : `المعطيات تثبت العكس: ${s.b} أسرع من ${s.a}`
  )));
  const {reasoningGraph, parameters} = graphMeta(nodes, edges);
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
    metadata: {graph_shape: shape},
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
function partialOrderPosition(ctx) {
  const {rng} = ctx;
  const {nodes, edges, shape} = positionGraph(rng, 6);
  // Structural resample only: the graph must be big enough to ask about a
  // middle position at all. This looks at the shape, never at the answer.
  if (nodes.length < 5) return partialOrderPosition(ctx);
  const oracle = buildOrderOracle(nodes, edges);

  const targetPos = rng.int(2, nodes.length - 1);
  const who = oracle.whoAtPosition(targetPos);
  const determined = who !== null && who !== undefined;
  const correct = determined ? who : UNDETERMINED;
  const candidates = [...new Set(oracle.extensions.map(ext => ext[targetPos - 1]))];

  const wrongNames = nodes.filter(n => n !== correct).map(n => mk(
    n,
    candidates.includes(n) ? 'RESOLVED_AN_UNRESOLVED_PAIR' : 'RELATION_CONTRADICTS_STATEMENT',
    candidates.includes(n)
      ? `${n} أحد المرشحين للمركز ${POSITION_WORDS[targetPos]}، لكنه ليس الوحيد`
      : `${n} لا يمكن أن يشغل المركز ${POSITION_WORDS[targetPos]} في أي ترتيب متوافق`
  ));
  // When the position IS pinned down, "cannot be determined" is the misconception
  // the item exists to catch — stopping before the order is fully derived — so it
  // must actually be on the paper. Distractor selection is rank-blind (RC2-001),
  // which means a pool larger than five leaves inclusion to chance; the pool is
  // therefore built at exactly five for this case. This is a pedagogical choice
  // about which errors to show, not a choice made on any property of the answer.
  const distractors = usable(determined
    ? [
      mk(UNDETERMINED, 'RELATION_REQUIRES_UNSTATED_ASSUMPTION',
        `توقّف قبل استنتاج الترتيب كاملًا رغم أن المركز ${POSITION_WORDS[targetPos]} محسوم`),
      ...wrongNames.slice(0, 4)
    ]
    : wrongNames);

  const {reasoningGraph, parameters} = graphMeta(nodes, edges);
  return buildBase(ctx, {
    templateId: 'REL_H_POSITION',
    subskill: determined ? 'مركز محسوم في ترتيب جزئي' : 'مركز غير محسوم في ترتيب جزئي',
    difficulty: 'hard',
    question: `${sentences(rng, edges)} من صاحب المركز ${POSITION_WORDS[targetPos]}؟`,
    correct, distractors, format: v => String(v),
    steps: determined
      ? [
        `نفحص كل ترتيب متوافق مع الجمل.`,
        `المركز ${POSITION_WORDS[targetPos]} يشغله ${correct} في كل ترتيب متوافق دون استثناء.`,
        `ما دام المرشح واحدًا في جميع الترتيبات، فالمركز محسوم.`
      ]
      : [
        `نفحص كل ترتيب متوافق مع الجمل.`,
        `المركز ${POSITION_WORDS[targetPos]} يشغله ${candidates.join(' أو ')} باختلاف الترتيب.`,
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
    metadata: {graph_shape: shape, position_determined: determined},
    complexityFactors: {reasoningTransformations: 3, conceptCount: 3, graphDepth: nodes.length, conditionCount: edges.length, dependencyDepth: 3},
    textParams: false
  });
}
