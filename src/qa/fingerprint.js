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

/**
 * RC2-022. The semantic / content fingerprint.
 *
 * Identical to the exact-instance fingerprint except that named parameters a
 * template has declared order-insensitive are sorted into a canonical order.
 *
 * Sorting, not dropping. Dropping the key would be wrong wherever its *content*
 * still distinguishes two questions: in the fractions `hiddenFraction`
 * direction, `knownDenominators` [3,4] and [2,4] describe different questions
 * (a different fraction is hidden) even though both sit inside the same
 * canonical set {2,3,4}. Sorting removes the display order and keeps the
 * content.
 *
 * The frozen RC1 audit showed why this matters: S2/07 and S2/39 are the same
 * set {6,10,12,14,22,26} under ODD_M_PRIME2, with byte-identical
 * `commutative.numberSet`, yet their full fingerprints differed because
 * `named.numbers` kept display order — so both were published in one session.
 *
 * Order is dropped ONLY where a template says it is meaningless. Nothing is
 * sorted globally: sequence terms, relational edges, staged rates and every
 * other dependency chain keep their order, because there the order is the
 * mathematics.
 */
export function buildSemanticFingerprint(spec) {
  const named = {...(spec.namedParameters ?? {})};
  for (const key of spec.orderInsensitive ?? []) {
    const v = named[key];
    if (Array.isArray(v)) {
      named[key] = v.every(x => typeof x === 'number')
        ? [...v].sort((a, b) => a - b)
        : [...v].map(String).sort();
    }
  }
  return buildFingerprint({...spec, namedParameters: named});
}

/**
 * RC2-023. The structural / reasoning signature.
 *
 * Identifies the reasoning pattern independently of incidental values that do
 * not change the solution method. It does NOT replace the exact-instance
 * fingerprint; the three live side by side and answer different questions.
 *
 * Returns null when a template declares no reasoning pattern. A null signature
 * means "this template has no structural identity beyond its content", and the
 * session check falls back to the semantic fingerprint rather than collapsing
 * unrelated questions together.
 *
 * The frozen RC1 audit showed S2/05 and S2/41 running the identical chain
 * ADD(4) MUL(2) ADD(5) MUL(3) ADD(6) MUL(4) ADD(7), differing only in
 * firstTerm — the same reasoning experience twice in one session.
 */
/**
 * RC2.2-4. The reasoning path an item walks, for every item.
 *
 * This used to return null unless a template declared a `reasoningPattern`, and
 * only the sequences family ever did — 15 of Holdout C's 250 items had a
 * signature at all. The session's reasoning-level diversity check was therefore
 * inert for 94% of what it was supposed to govern, which is how 65 instances of
 * the same reasoning repeated with nothing changed but the numbers.
 *
 * So the signature is DERIVED where it is not declared, from things the item
 * already carries: what is being asked, in which direction, and which kinds of
 * transformation the published solution composes. Two draws of one template that
 * differ only in their numbers land on the same signature — which is the point.
 * A template asked in a genuinely different direction, or composing different
 * operations, does not.
 *
 * A declared `reasoningPattern` is richer than the derivation and still wins
 * where a template offers one.
 */
export function buildStructuralSignature(spec) {
  const base = {
    family: spec.family,
    templateId: spec.templateId,
    askedUnknown: spec.askedUnknown ?? 'default',
    reasoningDirection: spec.reasoningDirection ?? spec.askedUnknown ?? 'default'
  };
  if (spec.reasoningPattern) return stableStringify({...base, pattern: spec.reasoningPattern});
  return stableStringify({...base, derivedFrom: 'operationKinds', operationKinds: spec.operationKinds ?? []});
}

export {stableStringify};
