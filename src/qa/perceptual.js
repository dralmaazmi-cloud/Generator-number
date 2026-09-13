// RC2.8-1. USER_PERCEPTUAL_SIGNATURE — the identity a solver actually perceives.
//
// Why a THIRD signature exists, after `construction_signature` and
// `user_construction_signature`.
//
// The independent RC2.8 review sampled 100 questions and found 25 of them were
// PARAMETER_ONLY_VARIANT or NEAR_DUPLICATE_CONSTRUCTION, while the engine was
// reporting 100 distinct constructions out of 100. Both numbers were computed
// honestly; they disagreed because the engine's identity still contained things
// a reader does not perceive as a difference, and separated things a reader does
// not perceive as a difference either:
//
//   * `asks:position2` and `asks:position4` were two identities. To a solver
//     they are one task — read a rank off an ordering — asked about a different
//     seat.
//   * `rel:eq(mul(X,#),mul(#,#))` and `rel:eq(mul(#,X),mul(#,#))` were two
//     identities. Multiplication is commutative; the solver does the same thing.
//   * `path:multiply>multiply>divide` and `path:multiply>divide` were two
//     identities where the only difference was that one template happened to
//     split a product into two steps.
//
// So this signature is built from a NORMALISED view, on axes that are stated
// rather than derived from whatever a template happened to name its unknown:
//
//   TASK    the cognitive job — compute forward, recover an original, compare
//           alternatives, find a threshold, locate in an order, identify a rule…
//   QTY     the CLASS of thing asked for — a rate, a duration, a count, money,
//           a percent, a date, a person, a term. Not the template's own label.
//   REL     the equation topology, commutative operands sorted, literals erased
//   PATH    the transformation kinds, consecutive repeats collapsed
//   INFO    how the information is PRESENTED, which is a real perceptual axis:
//           direct givens read very differently from two configurations
//           compared, or a before/after change, or a constraint set
//   ENTRY   forward, reverse, comparison, minimum, maximum
//
// And it contains NONE of: numbers, names, gender, products, objects, synonyms
// that do not change the sentence structure, option order, a person's rank when
// only the rank differs, the template id, or the family id.
//
// It is deliberately COARSER than `user_construction_signature`. That is the
// point: an identity that splits where a reader does not is an identity that
// reports diversity the reader cannot see.

import {TASK_BY_TARGET, INFO_STRUCTURE_BY_TEMPLATE} from './perceptual-taxonomy.js';

const COMMUTATIVE = new Set(['add', 'mul', 'eq']);

/**
 * Canonical topology of one constraint tree, with commutative operands sorted.
 *
 * `eq` is treated as commutative because «a × b = c» and «c = a × b» are the
 * same equation and no solver distinguishes them.
 */
function topology(node) {
  if (node === null || node === undefined) return '#';
  if (typeof node === 'number') return '#';
  if (typeof node === 'string') return node === 'x' ? 'X' : '#';
  if (Array.isArray(node)) return `[${node.map(topology).join(',')}]`;
  if (typeof node !== 'object') return '#';
  if (typeof node.op === 'string') {
    const parts = [topology(node.left), topology(node.right)];
    if (COMMUTATIVE.has(node.op)) parts.sort();
    return `${node.op}(${parts.join(',')})`;
  }
  const key = Object.keys(node).find(k => ['add', 'sub', 'mul', 'div', 'mod', 'abs'].includes(k));
  if (key) {
    const v = node[key];
    const parts = (Array.isArray(v) ? v : [v]).map(topology);
    if (COMMUTATIVE.has(key)) parts.sort();
    return `${key}(${parts.join(',')})`;
  }
  return '#';
}

/**
 * The shape of an ordering, with every name erased.
 *
 * Relational questions carry no equations, so the constraint-tree view returned
 * «none» for all of them: a six-person chain and a branched partial order with
 * two undetermined pairs were one sub-idea, and the family read as one idea
 * asked four ways. What a solver actually meets is the SHAPE — how many people,
 * how many stated relations, whether the order branches or merges, how long the
 * longest chain of inferences is, and whether anything stays undetermined. That
 * is what this encodes, and nothing about who is in it.
 */
function orderShape(oracle) {
  const nodes = Array.isArray(oracle.nodes) ? oracle.nodes : [];
  const edges = Array.isArray(oracle.edges) ? oracle.edges : [];
  const out = new Map(), inn = new Map();
  for (const [a, b] of edges) {
    out.set(a, (out.get(a) ?? 0) + 1);
    inn.set(b, (inn.get(b) ?? 0) + 1);
  }
  const branches = [...out.values()].filter(v => v >= 2).length;
  const merges = [...inn.values()].filter(v => v >= 2).length;
  // Longest chain of stated relations, which is the depth of inference the
  // question can demand. Computed over the DAG the edges describe.
  const memo = new Map();
  const depthOf = n => {
    if (memo.has(n)) return memo.get(n);
    memo.set(n, 0);
    let best = 0;
    for (const [a, b] of edges) if (a === n) best = Math.max(best, 1 + depthOf(b));
    memo.set(n, best);
    return best;
  };
  const depth = Math.max(0, ...nodes.map(depthOf));
  // A total order has exactly n-1 edges in one line; anything looser leaves
  // pairs a solver cannot decide, which is a different kind of question.
  const total = edges.length === Math.max(0, nodes.length - 1) && !branches && !merges;
  // Bucketed, not counted. A five-person chain and a six-person chain are the
  // same question one name longer, and a signature that split them would be
  // manufacturing diversity out of a parameter — exactly what this release
  // exists to stop. What a solver perceives is the KIND of structure: roughly
  // how big, whether it branches, whether it merges, roughly how far the
  // inference has to run, and whether anything is left undecidable.
  const size = nodes.length <= 5 ? 'small' : nodes.length <= 7 ? 'mid' : 'large';
  const reach = depth <= 2 ? 'shallow' : depth <= 4 ? 'mid' : 'deep';
  return `order:${size}/${branches ? 'branched' : 'linear'}/${merges ? 'merging' : 'simple'}`
    + `/${reach}/${total ? 'total' : 'partial'}`;
}

/** The relation that pins the answer, normalised. */
export function normalizedRelation(oracle) {
  if (!oracle) return 'none';
  if (oracle.kind === 'order') return orderShape(oracle);
  if (oracle.kind === 'ruleset') {
    // The number property IS the question here, so it stays in the identity —
    // multiples and triangular numbers are two ideas, not one idea twice.
    const rule = oracle.intendedRule ?? oracle.ruleId ?? null;
    return rule ? `ruleset:${rule}` : 'ruleset';
  }
  const constraints = Array.isArray(oracle.constraints) ? oracle.constraints : [];
  return constraints.map(topology).sort().join(' & ') || 'none';
}

/**
 * The transformation kinds, with consecutive repeats collapsed.
 *
 * A template that multiplies twice in a row and one that folds the same product
 * into a single step are doing the same thing to a reader.
 */
export function normalizedPath(kinds = []) {
  const out = [];
  for (const k of kinds) if (out.at(-1) !== k) out.push(k);
  return out.join('>') || 'none';
}

/**
 * RC2.9-2. Reasoning archetypes: the constructions a solver recognises as the
 * same piece of work however the story is told.
 *
 * The independent review proved two false distinctions that the relation-plus-
 * path view could not see past, because it reads the equation as written rather
 * than as solved:
 *
 *   FOURTH_PROPORTION   «four boxes cost eighty, what do six cost», «a machine
 *                       makes 450 in six hours, what do five make in two»,
 *                       «this many words in this many minutes». Whether the
 *                       proportion has two factors on a side or three, the
 *                       solver does one thing: a ÷ b × c. The extra factor is
 *                       arithmetic, not a second idea.
 *
 *   TWO_EQUATION_SYSTEM «two boxes and three pieces cost X, four boxes and one
 *                       piece cost Y, find the box» and «machine A and machine
 *                       B in two configurations, find A's rate». Eliminate one
 *                       unknown, substitute back. Different nouns, one method.
 *
 * These are matched STRUCTURALLY, on the shape of the constraint the oracle
 * declares, so a new template built the same way is recognised without being
 * listed anywhere. Anything that matches neither keeps the relation-and-path
 * identity it had, which is why this narrows the signature exactly where the
 * review showed it was too wide and nowhere else.
 */
const isLiteral = n => n === '#' || n === undefined;

/** The shape of one side: how many factors, and whether the unknown is among them. */
function productShape(node) {
  const t = typeof node === 'string' ? node : topology(node);
  const m = /^mul\(([^()]*)\)$/.exec(t);
  if (!m) return null;
  const parts = m[1].split(',');
  return {factors: parts.length, hasUnknown: parts.includes('X')};
}

/** The two operands of a top-level `op(a,b)`, split on the comma that separates them. */
function operandsOf(text, op) {
  const head = `${op}(`;
  if (!text.startsWith(head) || !text.endsWith(')')) return null;
  const body = text.slice(head.length, -1);
  let depth = 0;
  for (let i = 0; i < body.length; i++) {
    if (body[i] === '(') depth++;
    else if (body[i] === ')') depth--;
    else if (body[i] === ',' && depth === 0) return [body.slice(0, i), body.slice(i + 1)];
  }
  return null;
}

/** a × b … = c × x … — one equality, products both sides, the unknown a factor. */
function isFourthProportion(relation) {
  if (relation.includes(' & ')) return false;
  const m = operandsOf(relation, 'eq');
  if (!m) return false;
  const left = productShape(m[0]);
  const right = productShape(m[1]);
  if (!left || !right) return false;
  if (left.hasUnknown === right.hasUnknown) return false;
  // Two or three factors a side is the same proportion with one more quantity
  // carried through it; beyond that the sentence is doing something else.
  return left.factors <= 3 && right.factors <= 3;
}

/** k × x = (a × b) − (c × d) — one unknown left after eliminating the other. */
function isTwoEquationSystem(relation) {
  if (relation.includes(' & ')) return false;
  const m = operandsOf(relation, 'eq');
  if (!m) return false;
  const [left, right] = m;
  const shape = productShape(left);
  if (!shape || !shape.hasUnknown) return false;
  const difference = operandsOf(right, 'sub');
  if (!difference) return false;
  return difference.every(side => productShape(side)?.hasUnknown === false);
}

export function reasoningArchetype(relation, path) {
  if (isFourthProportion(relation)) return 'FOURTH_PROPORTION';
  if (isTwoEquationSystem(relation)) return 'TWO_EQUATION_SYSTEM';
  return `${relation}|${path}`;
}

const ENTRY = new Set(['forward', 'reverse', 'comparison', 'minimum', 'maximum']);

/**
 * The task archetype and the normalised requested target.
 *
 * Read from a declared table rather than derived from the template's own label
 * for the unknown: the labels are written for the template author and they both
 * split one task across several names (`position2`…`position7`) and give one
 * name to different tasks across families.
 */
export function taskOf(askedUnknown) {
  const key = String(askedUnknown ?? 'default');
  const direct = TASK_BY_TARGET[key];
  if (direct) return direct;
  // Rank questions are generated per seat, so the table declares the family of
  // them once rather than one row per seat.
  if (/^(undetermined)?[Pp]osition\d+$/.test(key)) return TASK_BY_TARGET.position;
  return null;
}

/** How the information is laid out for the reader. */
export const infoStructureOf = templateId =>
  INFO_STRUCTURE_BY_TEMPLATE[templateId] ?? 'DIRECT_GIVENS';

/**
 * @param {object} spec
 * @param {object|null} spec.oracle
 * @param {string} spec.askedUnknown
 * @param {string} spec.templateId
 * @param {string} [spec.direction]
 * @param {string[]} [spec.operationKinds]
 */
export function userPerceptualSignature(spec = {}) {
  const t = taskOf(spec.askedUnknown) ?? {task: 'UNCLASSIFIED', qty: 'UNCLASSIFIED'};
  const entry = ENTRY.has(spec.direction) ? spec.direction : 'forward';
  const relation = normalizedRelation(spec.oracle);
  const path = normalizedPath(spec.operationKinds);
  const archetype = reasoningArchetype(relation, path);
  const named = archetype !== `${relation}|${path}`;
  // RC2.9-2. Where the construction is one the review named, the signature
  // carries the NAME and drops the equation dressing and the layout — a fourth
  // proportion is a fourth proportion whether it is stated as two givens or as
  // two configurations, and the review proved that separating them was
  // manufacturing diversity out of a story. Everything else keeps the identity
  // it had, layout included.
  // The answer CLASS is dropped for a named archetype, deliberately. «Find the
  // price of the box» and «find machine A's rate» are the same elimination told
  // about different goods, and the review named keeping them apart as one of
  // the false distinctions. The class is still published on its own axis for
  // analysis; it just no longer makes two questions out of one construction.
  return named
    ? [`task:${t.task}`, `arch:${archetype}`, `entry:${entry}`].join('|')
    : [`task:${t.task}`, `qty:${t.qty}`, `rel:${relation}`, `path:${path}`,
      `info:${infoStructureOf(spec.templateId)}`, `entry:${entry}`].join('|');
}

/**
 * The reasoning archetype on its own: the construction, with the job and the
 * answer class stripped away. Two questions sharing it are the same method.
 */
export const reasoningArchetypeOf = spec =>
  reasoningArchetype(normalizedRelation(spec.oracle), normalizedPath(spec.operationKinds));

/**
 * The coarsest perceptual unit: the job and the thing asked for, with the
 * equation dressing dropped. Two questions sharing this are "the same kind of
 * ask" even when the algebra behind them differs, which is the level at which a
 * family is judged to be showing real task breadth.
 */
export function taskSignature(spec = {}) {
  const t = taskOf(spec.askedUnknown) ?? {task: 'UNCLASSIFIED', qty: 'UNCLASSIFIED'};
  return `${t.task}/${t.qty}`;
}

/** The sub-idea: what mathematics is being exercised, story removed. */
export const subIdeaSignature = spec =>
  `${normalizedRelation(spec.oracle)}|${normalizedPath(spec.operationKinds)}`;
