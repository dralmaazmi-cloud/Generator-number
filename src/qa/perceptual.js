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
  return [
    `task:${t.task}`,
    `qty:${t.qty}`,
    `rel:${normalizedRelation(spec.oracle)}`,
    `path:${normalizedPath(spec.operationKinds)}`,
    `info:${infoStructureOf(spec.templateId)}`,
    `entry:${entry}`
  ].join('|');
}

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
