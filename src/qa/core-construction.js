// RC2.7-R1. The core construction signature — what a HUMAN perceives as
// "the same question".
//
// The independent review of RC2.7 failed it at 4.2/10 for perceived diversity,
// and named the cause exactly: changing the scenario, the nouns, the names, the
// numbers or the information order changed the INTERNAL signatures while
// preserving the same equation, the same requested target and the same solution
// path. My `construction_signature` was complicit in that — it had `scenario` in
// it, so every scenario I added inflated the count of "distinct constructions"
// without a reader seeing a single new question.
//
// This signature is built so that cannot happen. It contains only the things
// that decide whether two questions are the same piece of reasoning:
//
//   RELATION      the topology of the equations that pin the answer, with every
//                 numeric literal erased — «a × b = c + d» whatever a, b, c, d are
//   PATH          the sequence of transformation kinds the published solution
//                 composes
//   TARGET        which unknown is asked for
//   ENTRY         where the reasoning starts: forward from givens, back from a
//                 stated outcome, a comparison of alternatives, a minimum, a
//                 maximum
//   ARRANGEMENT   how many conditions bind, and of what kinds — an equality, an
//                 inequality, an integrality condition are different arrangements
//   DEPENDENCY    how deep the chain of derived values runs, and in how many
//                 stages
//
// And it contains NONE of: family, template id, scenario, personal names, story
// nouns, sentence structure, information order, or any numeric parameter. Shirts,
// loaves and pages under one rate equation asking one target are ONE core
// construction, which is what the review says a reader experiences.
//
// Surface diversity has not stopped mattering; it is measured separately, by the
// signatures RC2.7 already published. What changed is that it can no longer be
// mistaken for this.

const NUM = '#';

/**
 * Canonical topology of one oracle constraint tree: operators and arity kept,
 * the unknown kept, every literal erased.
 */
function topology(node) {
  if (node === null || node === undefined) return NUM;
  if (typeof node === 'number') return NUM;
  if (typeof node === 'string') return node === 'x' ? 'X' : NUM;
  if (Array.isArray(node)) return `[${node.map(topology).join(',')}]`;
  if (typeof node !== 'object') return NUM;
  // {op:'eq', left, right} and the arithmetic forms {add:[…]}, {mul:[…]}, …
  if (typeof node.op === 'string') {
    return `${node.op}(${topology(node.left)},${topology(node.right)})`;
  }
  const key = Object.keys(node).find(k => ['add', 'sub', 'mul', 'div', 'mod', 'abs'].includes(k));
  if (key) {
    const v = node[key];
    return `${key}(${(Array.isArray(v) ? v : [v]).map(topology).join(',')})`;
  }
  return NUM;
}

/** The relation that pins the answer, and the arrangement of conditions. */
export function relationTopology(oracle) {
  if (!oracle) return {relation: 'none', arrangement: 'none'};
  if (oracle.kind === 'ruleset') {
    // A set built on multiples and a set built on triangular numbers are not one
    // idea wearing two labels — the property a solver has to find is the whole
    // question. Collapsing every rule to «ruleset» made the odd-one-out family
    // read as four ideas when it has seven distinct number properties.
    const rule = oracle.intendedRule ?? oracle.ruleId ?? null;
    return {
      relation: rule ? `ruleset:${rule}` : 'ruleset',
      arrangement: `ruleset:${(oracle.numbers ?? []).length}`
    };
  }
  const constraints = Array.isArray(oracle.constraints) ? oracle.constraints : [];
  // Sorted: the ORDER two simultaneous conditions are written in is presentation,
  // not structure, and two templates that state the same pair the other way round
  // are not a different construction.
  const shapes = constraints.map(topology).sort();
  const ops = constraints.map(c => c?.op ?? 'expr').sort();
  const kinds = {};
  for (const o of ops) kinds[o] = (kinds[o] ?? 0) + 1;
  return {
    relation: shapes.join(' & ') || 'none',
    arrangement: Object.entries(kinds).sort().map(([k, v]) => `${k}x${v}`).join('+') || 'none'
  };
}

/**
 * Where the reasoning starts. `direction` is declared by templates that have a
 * non-forward entry; the rest are forward by construction.
 */
const ENTRY = new Set(['forward', 'reverse', 'comparison', 'minimum', 'maximum']);
const entryOf = direction => (ENTRY.has(direction) ? direction : 'forward');

/**
 * @param {object} spec
 * @param {object|null} spec.oracle
 * @param {string} spec.askedUnknown
 * @param {string} [spec.direction]
 * @param {string[]} [spec.operationKinds] in the order the solution composes them
 * @param {string[]} [spec.reasoningPattern] a template's declared pattern, if any
 * @param {number} [spec.dependencyDepth]
 * @param {number} [spec.stageCount]
 */
export function coreConstructionSignature(spec = {}) {
  const {relation, arrangement} = relationTopology(spec.oracle);
  const path = spec.reasoningPattern
    ? `declared:${[...spec.reasoningPattern].join('>')}`
    : (spec.operationKinds ?? []).join('>') || 'none';
  return [
    `rel:${relation}`,
    `path:${path}`,
    `asks:${spec.askedUnknown ?? 'default'}`,
    `entry:${entryOf(spec.direction)}`,
    `arr:${arrangement}`,
    `dep:${spec.dependencyDepth ?? 0}/${spec.stageCount ?? 0}`
  ].join('|');
}

/**
 * The coarser pair the review asks to be reported on its own: two questions
 * sharing it are the same reasoning asked for the same thing, whatever equation
 * dressing sits around them.
 */
export const reasoningTargetPair = spec =>
  `${(spec.operationKinds ?? []).join('>') || 'none'}|${spec.askedUnknown ?? 'default'}|${entryOf(spec.direction)}`;

/**
 * A NEAR-duplicate: the same relation and the same target, differing only in a
 * dependency count or an arrangement detail. Reported separately because a
 * reader does not notice the difference between them either.
 */
export function nearDuplicateKey(signature) {
  const parts = String(signature).split('|');
  return parts.filter(p => p.startsWith('rel:') || p.startsWith('asks:') || p.startsWith('entry:')).join('|');
}
