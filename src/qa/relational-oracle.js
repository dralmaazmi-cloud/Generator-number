// Sections 1-A and 17-B. The oracle for relational ordering is an exhaustive
// enumeration of every total order consistent with the stated relations. Nothing
// here mirrors the generator's reasoning: a fact is true exactly when it holds
// in every consistent ordering, and undetermined when the orderings disagree.

/**
 * @param {string[]} nodes
 * @param {Array<[string,string]>} edges  [a,b] means a ranks strictly above b
 * @returns {string[][]} every linear extension (capped for safety)
 */
export function linearExtensions(nodes, edges, cap = 5040) {
  const above = new Map(nodes.map(n => [n, new Set()]));
  for (const [a, b] of edges) {
    if (!above.has(b)) above.set(b, new Set());
    above.get(b).add(a);
  }
  const out = [];
  const placed = [];
  const used = new Set();
  const walk = () => {
    if (out.length >= cap) return;
    if (placed.length === nodes.length) { out.push([...placed]); return; }
    for (const n of nodes) {
      if (used.has(n)) continue;
      const prereqs = above.get(n) || new Set();
      let ready = true;
      for (const p of prereqs) if (!used.has(p)) { ready = false; break; }
      if (!ready) continue;
      used.add(n); placed.push(n);
      walk();
      placed.pop(); used.delete(n);
    }
  };
  walk();
  return out;
}

/** True when the relations contain no cycle, i.e. at least one ordering exists. */
export function isConsistent(nodes, edges) {
  return linearExtensions(nodes, edges, 1).length > 0;
}

export function buildOrderOracle(nodes, edges) {
  const extensions = linearExtensions(nodes, edges);
  if (!extensions.length) throw new Error('Relational constraints are contradictory');

  const rankSets = new Map(nodes.map(n => [n, new Set()]));
  for (const ext of extensions) ext.forEach((n, i) => rankSets.get(n).add(i + 1));

  return {
    extensions,

    /** Who is at 1-based position k, or null when the orderings disagree. */
    whoAtPosition(k) {
      const names = new Set(extensions.map(ext => ext[k - 1]));
      return names.size === 1 ? [...names][0] : null;
    },

    /** True when a ranks above b in every consistent ordering. */
    definitelyAbove(a, b) {
      return extensions.every(ext => ext.indexOf(a) < ext.indexOf(b));
    },

    /** True when neither order is forced — the pair cannot be decided. */
    undetermined(a, b) {
      let seenAB = false, seenBA = false;
      for (const ext of extensions) {
        if (ext.indexOf(a) < ext.indexOf(b)) seenAB = true; else seenBA = true;
        if (seenAB && seenBA) return true;
      }
      return false;
    },

    /** How many people are provably above `target` in every ordering. */
    countDefinitelyAbove(target) {
      return nodes.filter(n => n !== target && extensions.every(ext => ext.indexOf(n) < ext.indexOf(target))).length;
    },

    positionsOf(name) { return [...rankSets.get(name)].sort((a, b) => a - b); },

    allUndeterminedPairs() {
      const pairs = [];
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          if (this.undetermined(nodes[i], nodes[j])) pairs.push([nodes[i], nodes[j]]);
        }
      }
      return pairs;
    }
  };
}
