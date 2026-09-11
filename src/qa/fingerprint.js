// Section 13-A / 30. A fingerprint identifies the *reasoning* a question asks
// for. Parameter roles are not interchangeable, so parameters are named, never
// sorted — except inside structures that really are commutative (a number set,
// a multiset of denominators, a relational graph up to renaming).

const CANONICAL_PLACEHOLDERS = ['n1', 'n2', 'n3', 'n4', 'n5', 'n6', 'n7', 'n8'];

function stableStringify(value) {
  if (value === null || value === undefined) return 'null';
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (typeof value === 'object') {
    return `{${Object.keys(value).sort().map(k => `${k}:${stableStringify(value[k])}`).join(',')}}`;
  }
  if (typeof value === 'number') return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(9)));
  return String(value);
}

/**
 * Relabels a relational graph so that two graphs differing only in the people's
 * names collapse to the same key (Section 13-A, 40).
 */
export function canonicalGraph(nodes, edges) {
  const outDeg = new Map(nodes.map(n => [n, 0]));
  const inDeg = new Map(nodes.map(n => [n, 0]));
  for (const [a, b] of edges) {
    outDeg.set(a, (outDeg.get(a) || 0) + 1);
    inDeg.set(b, (inDeg.get(b) || 0) + 1);
  }
  // Refine by degree signature, then by the sorted signatures of neighbours, so
  // the labelling depends on structure only.
  let signature = new Map(nodes.map(n => [n, `${inDeg.get(n) || 0}/${outDeg.get(n) || 0}`]));
  for (let round = 0; round < nodes.length; round++) {
    const next = new Map();
    for (const n of nodes) {
      const outs = edges.filter(([a]) => a === n).map(([, b]) => signature.get(b)).sort();
      const ins = edges.filter(([, b]) => b === n).map(([a]) => signature.get(a)).sort();
      next.set(n, `${signature.get(n)}|>${outs.join('~')}|<${ins.join('~')}`);
    }
    signature = next;
  }
  const ordered = [...nodes].sort((a, b) => (signature.get(a) < signature.get(b) ? -1 : signature.get(a) > signature.get(b) ? 1 : a < b ? -1 : 1));
  const label = new Map(ordered.map((n, i) => [n, CANONICAL_PLACEHOLDERS[i] || `n${i + 1}`]));
  const canonEdges = edges.map(([a, b]) => [label.get(a), label.get(b)]).sort((x, y) => stableStringify(x) < stableStringify(y) ? -1 : 1);
  return {nodes: ordered.map(n => label.get(n)), edges: canonEdges, key: stableStringify(canonEdges)};
}

/** Commutative structures may be sorted; nothing else may. */
export function canonicalNumberSet(numbers) {
  return [...numbers].sort((a, b) => a - b);
}

export function canonicalMultiset(values) {
  return [...values].map(String).sort();
}

/**
 * @param {object} spec
 * @param {string} spec.family
 * @param {string} spec.templateId
 * @param {string} [spec.askedUnknown]
 * @param {number} [spec.stageCount]
 * @param {object} [spec.namedParameters] role-keyed parameters (NOT sorted)
 * @param {object} [spec.commutative]     structures where order is meaningless
 * @param {string} [spec.reasoningGraph]  canonical graph key, when applicable
 */
export function buildFingerprint(spec) {
  const payload = {
    family: spec.family,
    templateId: spec.templateId,
    askedUnknown: spec.askedUnknown ?? 'default',
    stageCount: spec.stageCount ?? null,
    reasoningGraph: spec.reasoningGraph ?? null,
    named: spec.namedParameters ?? {},
    commutative: spec.commutative ?? {}
  };
  return stableStringify(payload);
}

/**
 * Section 13-B: the same question with its choices shuffled must collide with
 * the original, so the option letters play no part in the fingerprint.
 */
export function questionFingerprint(q) {
  const meta = q.metadata || {};
  if (meta.fingerprint) return meta.fingerprint;
  return buildFingerprint({
    family: q.family,
    templateId: q.generator_id,
    askedUnknown: meta.asked_unknown,
    stageCount: meta.stage_count,
    reasoningGraph: meta.reasoning_graph,
    namedParameters: meta.parameters || {}
  });
}

export {stableStringify};
