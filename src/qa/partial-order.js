// RC2.5-2. Graph-complexity conditions for relational / partial-order items.
//
// RC2.4 adjudicated the relational family at TEMPLATE level, which treated
// every ordering question as one difficulty. It is not. The same template draws
// a fresh graph each time, and the graph decides the work:
//
//   * a set of statements that chains into ONE total order answers every
//     question by reading the chain off — routine, whatever the question is;
//   * a genuinely partial order with two open pairs, where the answer needs
//     facts from two branches, is a different task: the solver has to reason
//     about the SET of consistent orderings rather than about one arrangement.
//
// So the band is a property of the drawn instance, and these are the conditions
// that separate the two. They are stated as graph facts, computed from the
// oracle's linear extensions, and nothing here consults the intended answer to
// decide the band.
//
// Required of every HARD partial-order item (all three):
//
//   H1 linearExtensionCount >= 2   the order really is partial; a total order
//                                  turns every question into a lookup.
//   H2 incomparablePairs     >= 2  more than one pair is left open, so "which
//                                  orderings are consistent" is a real question
//                                  rather than a single visible gap.
//   H3 not linearChainSolves       no single root-to-leaf path answers the
//                                  question by itself.
//
// And at least one of (the reason the item is hard):
//
//   H4a asksIndeterminate          the question is about a relation the stated
//                                  order does not settle.
//   H4b branchesCombined     >= 2  the answer needs facts from two or more
//                                  distinct branches, which must be held at
//                                  once rather than followed in turn.
//   H4c transitiveProofDepth >= 3  the answer rests on a chain of at least
//                                  three stated relations.
//
// Overriding disqualifier:
//
//   D1 plausibleCandidates   <= 2  whatever the graph looks like, an item whose
//                                  offered answers collapse to a two-way choice
//                                  is not hard; it is a guess.
//
// A routine transitive conclusion — "أ above ب, ب above ج, so أ above ج" — fails
// H1 and H2 and is MEDIUM, which is the point.

import {buildOrderOracle} from './relational-oracle.js';

export const PARTIAL_ORDER_HARD_CONDITIONS = Object.freeze({
  H1_PARTIAL_ORDER: 'linearExtensionCount >= 2',
  H2_OPEN_PAIRS: 'incomparablePairs >= 2',
  H3_NO_LINEAR_SHORTCUT: 'no single root-to-leaf path answers the question',
  H4a_ASKS_INDETERMINATE: 'the question asks about an unsettled relation',
  H4b_BRANCHES_COMBINED: 'branchesCombined >= 2',
  H4c_PROOF_DEPTH: 'transitiveProofDepth >= 3',
  D1_TWO_WAY_GUESS: 'plausibleCandidates <= 2 disqualifies'
});

const key = (a, b) => `${a}>${b}`;

/** Adjacency, in and out degree, and every root-to-sink path. */
function topology(nodes, edges) {
  const out = new Map(nodes.map(n => [n, []]));
  const inn = new Map(nodes.map(n => [n, []]));
  for (const [a, b] of edges) { out.get(a)?.push(b); inn.get(b)?.push(a); }
  const roots = nodes.filter(n => (inn.get(n) || []).length === 0);
  const paths = [];
  const walk = (n, acc) => {
    const next = out.get(n) || [];
    if (!next.length) { paths.push([...acc, n]); return; }
    for (const m of next) walk(m, [...acc, n]);
  };
  for (const r of roots) walk(r, []);
  return {out, inn, roots, paths};
}

/** Shortest number of stated edges linking a to b, or null when none does. */
function edgeDistance(nodes, edges, a, b) {
  const out = new Map(nodes.map(n => [n, []]));
  for (const [x, y] of edges) out.get(x)?.push(y);
  const seen = new Set([a]);
  let frontier = [a], depth = 0;
  while (frontier.length) {
    depth++;
    const next = [];
    for (const n of frontier) {
      for (const m of out.get(n) || []) {
        if (m === b) return depth;
        if (!seen.has(m)) { seen.add(m); next.push(m); }
      }
    }
    frontier = next;
  }
  return null;
}

/**
 * Graph facts for one drawn instance.
 *
 * `task` describes what the item asks, so the depth and branch measures are
 * about the ANSWER's support rather than about the graph in the abstract:
 *
 *   {type: 'pairRelation',   a, b}     is a above b?
 *   {type: 'undeterminedPair'}         which pair stays open?
 *   {type: 'countAbove',     target}   how many are certainly above?
 *   {type: 'position',       position} who holds a position?
 *   {type: 'guarantee',      a, b}     what does the order guarantee?
 *
 * `candidateCount` is how many of the offered answers survive a partial
 * reading; templates pass what they actually offered.
 */
export function graphComplexity(nodes, edges, task = {}, {candidateCount = null} = {}) {
  const oracle = buildOrderOracle(nodes, edges);
  const {out, inn, paths} = topology(nodes, edges);
  const incomparable = oracle.allUndeterminedPairs();
  const branchPoints = nodes.filter(n => (out.get(n) || []).length >= 2).length;
  const mergePoints = nodes.filter(n => (inn.get(n) || []).length >= 2).length;

  // Which stated relations the answer actually rests on, and how deep.
  let proofDepth = 0;
  let supportEdges = [];
  if (task.type === 'pairRelation' || task.type === 'guarantee') {
    const d = edgeDistance(nodes, edges, task.a, task.b) ?? edgeDistance(nodes, edges, task.b, task.a);
    proofDepth = d ?? 0;
    supportEdges = d ? [key(task.a, task.b)] : [];
  } else if (task.type === 'countAbove') {
    const above = nodes.filter(n => n !== task.target && oracle.definitelyAbove(n, task.target));
    const depths = above.map(n => edgeDistance(nodes, edges, n, task.target)).filter(Boolean);
    proofDepth = depths.length ? Math.max(...depths) : 0;
    supportEdges = above.map(n => key(n, task.target));
  } else if (task.type === 'position') {
    proofDepth = Math.max(0, ...paths.map(p => p.length - 1));
  } else if (task.type === 'undeterminedPair') {
    // Establishing that a pair is open means ruling out every path either way,
    // so the whole branch structure is the support.
    proofDepth = Math.max(0, ...paths.map(p => p.length - 1));
  }

  // How many distinct root-to-sink branches carry the answer's support.
  let branchesCombined;
  if (task.type === 'countAbove') {
    const relevant = new Set();
    const above = nodes.filter(n => n !== task.target && oracle.definitelyAbove(n, task.target));
    paths.forEach((p, i) => { if (above.some(n => p.includes(n)) && p.includes(task.target)) relevant.add(i); });
    branchesCombined = relevant.size || (above.length ? 1 : 0);
  } else if (task.type === 'pairRelation' || task.type === 'guarantee') {
    const relevant = new Set();
    paths.forEach((p, i) => { if (p.includes(task.a) || p.includes(task.b)) relevant.add(i); });
    branchesCombined = relevant.size;
  } else {
    branchesCombined = paths.length;
  }

  // A single root-to-sink path carrying everything the answer rests on settles
  // the question without reference to the rest of the graph. The support set is
  // per task: for a pair it is the two people; for a count it is the target
  // TOGETHER WITH everyone the answer counts, so a target that merely happens to
  // sit on one path does not make a two-branch count look linear.
  let supportNodes = [];
  if (task.type === 'pairRelation' || task.type === 'guarantee') {
    supportNodes = [task.a, task.b].filter(Boolean);
  } else if (task.type === 'countAbove') {
    const above = nodes.filter(n => n !== task.target && oracle.definitelyAbove(n, task.target));
    supportNodes = above.length ? [...above, task.target] : [];
  }
  const linearChainSolves = oracle.extensions.length === 1
    || (supportNodes.length > 0 && paths.some(p => supportNodes.every(n => p.includes(n)))
        && task.type !== 'undeterminedPair');

  return {
    nodeCount: nodes.length,
    edgeCount: edges.length,
    linearExtensionCount: oracle.extensions.length,
    incomparablePairs: incomparable.length,
    branchPoints,
    mergePoints,
    branching: branchPoints > 0 || mergePoints > 0,
    transitiveProofDepth: proofDepth,
    branchesCombined,
    rootToSinkPaths: paths.length,
    asksIndeterminate: task.type === 'undeterminedPair' || task.asksIndeterminate === true,
    linearChainSolves,
    plausibleCandidates: candidateCount,
    supportEdgeCount: new Set(supportEdges).size
  };
}

/**
 * The band the conditions give this instance, with the conditions it met and
 * the ones it missed. `hard` is never asserted from the question type alone.
 */
export function partialOrderBand(m) {
  const met = [], missed = [];
  const req = [
    ['H1_PARTIAL_ORDER', m.linearExtensionCount >= 2],
    ['H2_OPEN_PAIRS', m.incomparablePairs >= 2],
    ['H3_NO_LINEAR_SHORTCUT', !m.linearChainSolves]
  ];
  for (const [name, ok] of req) (ok ? met : missed).push(name);
  const reasons = [
    ['H4a_ASKS_INDETERMINATE', m.asksIndeterminate === true],
    ['H4b_BRANCHES_COMBINED', m.branchesCombined >= 2],
    ['H4c_PROOF_DEPTH', m.transitiveProofDepth >= 3]
  ];
  for (const [name, ok] of reasons) (ok ? met : missed).push(name);
  const disqualified = m.plausibleCandidates != null && m.plausibleCandidates <= 2;
  if (disqualified) missed.push('D1_TWO_WAY_GUESS');
  const hard = req.every(([, ok]) => ok) && reasons.some(([, ok]) => ok) && !disqualified;
  return {band: hard ? 'hard' : 'medium', met, missed, disqualified};
}

/** Convenience: does this drawn instance clear the HARD bar? */
export function isHardPartialOrder(nodes, edges, task, opts) {
  return partialOrderBand(graphComplexity(nodes, edges, task, opts)).band === 'hard';
}
