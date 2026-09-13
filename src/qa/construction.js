// RC2.6-3. Construction diversity — what actually differs between two questions
// beyond their numbers.
//
// The repetition measures RC2.5 added answer "is this the same question again?".
// They cannot answer "is this the same question BUILT the same way?", and that is
// the one a candidate notices: two items with different numbers, different names
// and the same sentence shape, the same given-to-asked direction and the same
// scenario read as one question asked twice.
//
// Four signatures, coarse to fine:
//
//   STEM SKELETON        the stem with every numeral and every personal name
//                        removed. Two items sharing it are the same sentences.
//
//   SCENARIO STRUCTURE   the situation the stem sets up — a journey in two legs,
//                        a vessel being refilled, a partnership — independent of
//                        which quantity is asked for.
//
//   CONSTRUCTION         scenario + which unknown is asked + whether the
//                        reasoning runs forward from the givens or back from a
//                        stated outcome. This is the unit the brief calls a
//                        "genuinely different construction".
//
//   REASONING SKELETON   already published as `structural_reasoning_signature`;
//                        the shape of the solution, independent of the story.
//
// A template that can only ever produce ONE construction is not a defect — some
// mathematics has one natural telling — but it must then be bounded, or a batch
// fills with the same telling. `CONSTRUCTION_CAP_PER_BATCH` is that bound.

/** Templates that admit only one construction are capped at this per batch. */
export const CONSTRUCTION_CAP_PER_BATCH = 6;

const ARABIC_DIGITS = /[٠-٩]/g;

const escapeAr = w => String(w).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * The stem with its numerals and its personal names taken out.
 *
 * Names are the ones the generator draws from, passed in rather than guessed at:
 * stripping "any Arabic word that looks like a name" would also strip nouns.
 */
export function stemSkeleton(text, names = []) {
  if (typeof text !== 'string') return '';
  let out = text.replace(ARABIC_DIGITS, '#').replace(/\d+(?:[.,]\d+)?/g, '#');
  // RC2.7-2. Whole words only. A plain substring replace turned الخسارة into
  // الخ@ because سارة is a name, which both corrupted the skeleton and inflated
  // the distinct-skeleton count for every family whose stems mention a loss.
  for (const n of names) {
    if (!n) continue;
    out = out.replace(new RegExp(`(^|[^\u0621-\u064a])${escapeAr(n)}(?![\u0621-\u064a])`, 'g'), '$1@');
  }
  return out
    .replace(/#(?:\s*[×÷+\-−/]\s*#)+/g, '#')   // arithmetic runs collapse to one slot
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * The construction a question was built as. `scenario` and `direction` are
 * declared by the template, because only the template knows what situation it is
 * telling and which way its reasoning runs; `askedUnknown` it already declares.
 */
export function constructionSignature({family, scenario, askedUnknown, direction, givenOrder} = {}) {
  return [
    `family:${family ?? '?'}`,
    `scenario:${scenario ?? 'unnamed'}`,
    `asks:${askedUnknown ?? '?'}`,
    `direction:${direction ?? 'forward'}`,
    givenOrder ? `order:${givenOrder}` : null
  ].filter(Boolean).join('|');
}

/** Scenario alone, for the coarser of the two measures. */
export function scenarioSignature({family, scenario} = {}) {
  return `${family ?? '?'}/${scenario ?? 'unnamed'}`;
}

const norm = s => (s ?? '').replace(/\s+/g, ' ').trim();

/**
 * RC2.9-4. The rendered STEM, and nothing else.
 *
 * The exact-duplicate measure keyed on stem + options, so the same question
 * with its choices in another order counted as two questions. To a reader it is
 * the same question twice — the options are not what is being asked — and the
 * independent review found a journey that asked one stem twice while the
 * measure reported no duplicate at all.
 *
 * Normalisation removes only what is genuinely irrelevant to identity:
 * whitespace, and the presentation of the digits. Anything else — a different
 * noun, a different number — makes a different stem, which is the point.
 */
export function normalizedStemIdentity(q) {
  const stem = norm(q.question ?? q.stem ?? '');
  const shown = norm(q.display_expression ?? q.stimulus ?? '');
  return shown ? `${stem} ⟨${shown}⟩` : stem;
}

/** The whole rendered item, for the exact-duplicate measure. */
export function renderedItem(q) {
  return [
    norm(q.question ?? q.stem),
    norm(q.display_expression ?? q.stimulus),
    Object.values(q.options ?? {}).map(norm).join('|')
  ].join(' ~ ');
}

function tally(rows, keyOf) {
  const m = new Map();
  for (const r of rows) {
    const k = keyOf(r);
    if (k == null) continue;
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return m;
}

const repeatShare = (m, n) => {
  const inRepeat = [...m.values()].filter(v => v > 1).reduce((a, v) => a + v, 0);
  return {distinct: m.size, itemsInARepeatedGroup: inRepeat, largestGroup: Math.max(0, ...m.values()),
    share: n ? Number((inRepeat / n).toFixed(4)) : 0};
};

/**
 * The seven measures the brief asks to be kept apart. Rows are published
 * questions (or preserved holdout rows with the same field names).
 */
export function measureConstruction(rows) {
  const n = rows.length;
  const get = (r, k) => r.metadata?.[k] ?? r[k] ?? null;
  const exact = tally(rows, renderedItem);
  const semantic = tally(rows, r => get(r, 'semantic_fingerprint') ?? r.semanticFingerprint);
  const paramOnly = tally(rows, r => `${get(r, 'template_id') ?? r.templateId}|${get(r, 'asked_unknown') ?? r.askedUnknown}`);
  const reasoning = tally(rows, r => get(r, 'structural_reasoning_signature') ?? r.structuralReasoningSignature);
  const stem = tally(rows, r => get(r, 'stem_skeleton') ?? r.stemSkeleton);
  const scenario = tally(rows, r => get(r, 'scenario_signature') ?? r.scenarioSignature);
  const construction = tally(rows, r => get(r, 'construction_signature') ?? r.constructionSignature);

  return {
    items: n,
    exactDuplicates: repeatShare(exact, n).itemsInARepeatedGroup,
    semanticDuplicates: repeatShare(semantic, n).itemsInARepeatedGroup,
    parameterOnlyVariants: repeatShare(paramOnly, n),
    sameReasoningSkeleton: repeatShare(reasoning, n),
    sameStemSkeleton: repeatShare(stem, n),
    sameScenarioStructure: repeatShare(scenario, n),
    genuinelyDistinctConstructions: {
      distinct: construction.size,
      perHundredItems: n ? Number((100 * construction.size / n).toFixed(1)) : 0,
      largestGroup: Math.max(0, ...construction.values()),
      overCap: [...construction.entries()]
        .filter(([, v]) => v > CONSTRUCTION_CAP_PER_BATCH)
        .map(([k, v]) => `${k} x${v}`)
    },
    cap: CONSTRUCTION_CAP_PER_BATCH
  };
}

// --- RC2.7-5. The independent signatures ------------------------------------
//
// The brief asks for nine dimensions to be tracked SEPARATELY, because a reader
// notices them separately: two questions can share a skill and differ in every
// other respect, and two can share a sentence shape while testing different
// skills. Collapsing them into one number is what lets a generator report
// diversity it does not have.

/** What is being tested, independent of how it is told. */
export const skillSignature = q =>
  `${q.family ?? q.metadata?.family ?? '?'}/${q.subskill ?? q.metadata?.subskill ?? '?'}`;

/** Which KINDS of entity the stem uses, and how many of each. */
export function entityPattern(kinds = []) {
  if (!kinds.length) return 'none';
  const t = new Map();
  for (const k of kinds) t.set(k, (t.get(k) ?? 0) + 1);
  return [...t.entries()].sort().map(([k, v]) => `${k}x${v}`).join('+');
}

/**
 * The SHAPE of the parameterization: which parameters a template drew and
 * roughly how large each was. Two instances sharing it differ only in the exact
 * numbers — which is precisely the "parameter-only variant" the brief names.
 */
export function parameterizationSignature(templateId, parameters = {}) {
  const bucket = v => {
    if (!Number.isFinite(v)) return 'x';
    const a = Math.abs(v);
    if (a === 0) return '0';
    if (!Number.isInteger(v)) return 'frac';
    return `1e${Math.floor(Math.log10(a))}`;
  };
  const parts = Object.keys(parameters).sort()
    .map(k => `${k}:${bucket(Number(parameters[k]))}`);
  return `${templateId}|${parts.join(',')}`;
}

