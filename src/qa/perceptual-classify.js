// RC2.8-1. The four-way perceptual classification the review asks for, and the
// session-shape measures that go with it.
//
// The labels are the reviewer's, and they are assigned by comparing each item
// against the items BEFORE it in the sample, because that is the order a solver
// meets them in. The first member of a group is never flagged — meeting an idea
// once is not repetition — so the counts here are "how many times did the reader
// see something they had already seen".
//
//   PARAMETER_ONLY_VARIANT       the same template asked for the same task. Only
//                                numbers, names and objects differ. Note the
//                                NORMALISED task: one ordering template asked
//                                for the 2nd seat and then the 4th seat is this,
//                                not two questions.
//   NEAR_DUPLICATE_CONSTRUCTION  a different template, but the same perceptual
//                                signature — the same job, on the same class of
//                                answer, over the same equation topology, the
//                                same path and the same information layout.
//   HEALTHY_SKILL_RECURRENCE     the same skill met again with a genuinely
//                                different idea. This is wanted, not a defect.
//   GENUINELY_DISTINCT           a skill not yet met in this sample.

import {userPerceptualSignature, taskSignature, subIdeaSignature, taskOf} from './perceptual.js';

export const LABELS = Object.freeze([
  'GENUINELY_DISTINCT', 'HEALTHY_SKILL_RECURRENCE',
  'PARAMETER_ONLY_VARIANT', 'NEAR_DUPLICATE_CONSTRUCTION'
]);

const meta = (q, k) => q.metadata?.[k] ?? q[k] ?? null;

/** The spec the signatures need, read off a published question. */
export function specOf(q) {
  return {
    oracle: meta(q, 'oracle_spec') ?? q.oracleSpec ?? null,
    askedUnknown: meta(q, 'asked_unknown'),
    templateId: meta(q, 'template_id') ?? q.generator_id,
    direction: meta(q, 'entry_direction'),
    operationKinds: meta(q, 'operation_kinds') ?? []
  };
}

const norm = s => String(s ?? '').replace(/\s+/g, ' ').trim();

/** The rendered item, for the literal-duplicate measure. */
/**
 * RC2.8-1. The harsher, human-aligned proxy, reported beside the primary labels.
 *
 * USER_PERCEPTUAL_SIGNATURE deliberately excludes the family, because including
 * it would let one construction told in two families count as two ideas — the
 * inflation this work exists to stop. But a reader does not meet constructions
 * in the abstract: they meet «another ordering-of-people question, laid out as
 * statements, asking who is where». Same family, same job, same information
 * layout reads as the same question even when the equation behind it differs.
 *
 * On the sample the independent review scored, this key counts 29 repeats where
 * the primary label counts 11 — and the review counted 25. So it is reported as
 * the conservative figure and controlled in the scheduler, rather than the
 * engine claiming the friendlier number.
 */
export const presentationKey = r =>
  `${r.family}|${r.task}|${(String(r.perceptual).match(/info:([A-Z_]+)/) ?? [, '?'])[1]}`;

export const renderedKey = q =>
  `${norm(q.question ?? q.stem)} ~ ${Object.values(q.options ?? {}).map(norm).join('|')}`;

/**
 * Label every row against the rows before it.
 * @param {object[]} rows published questions, in the order they are presented
 */
export function classify(rows) {
  const seenParam = new Set();
  const seenPerceptual = new Set();
  const seenFamily = new Set();
  return rows.map((q, i) => {
    const perceptual = meta(q, 'user_perceptual_signature') ?? userPerceptualSignature(specOf(q));
    const task = meta(q, 'task_signature') ?? taskSignature(specOf(q));
    const templateId = meta(q, 'template_id') ?? q.generator_id;
    const family = q.family ?? meta(q, 'family');
    const paramKey = `${templateId}|${task}`;
    let label;
    if (seenParam.has(paramKey)) label = 'PARAMETER_ONLY_VARIANT';
    else if (seenPerceptual.has(perceptual)) label = 'NEAR_DUPLICATE_CONSTRUCTION';
    else if (seenFamily.has(family)) label = 'HEALTHY_SKILL_RECURRENCE';
    else label = 'GENUINELY_DISTINCT';
    seenParam.add(paramKey);
    seenPerceptual.add(perceptual);
    seenFamily.add(family);
    return {index: i + 1, label, perceptual, task, templateId, family,
      subIdea: meta(q, 'sub_idea_signature') ?? subIdeaSignature(specOf(q)),
      question: q.question, answer: q.correct_option};
  });
}

/**
 * Two items read as similar when they are the same job in the same family, or
 * share the perceptual signature outright. Used for the adjacency rule, which
 * is about what sits NEXT to what rather than about totals.
 */
const similar = (a, b) =>
  a.perceptual === b.perceptual || (a.family === b.family && a.task === b.task);

function longestSimilarRun(labelled) {
  let best = 0, run = 1;
  for (let i = 1; i < labelled.length; i++) {
    run = similar(labelled[i - 1], labelled[i]) ? run + 1 : 1;
    best = Math.max(best, run);
  }
  return labelled.length ? Math.max(best, 1) : 0;
}

/**
 * Where repetition would start to be NOTICED: the worst 20-question window, by
 * how many of its items repeat something already seen inside that same window.
 * A total over a whole sitting hides a cluster; a window does not.
 */
function worstWindow(labelled, width = 20) {
  let worst = {start: 0, repeats: 0};
  for (let s = 0; s + width <= labelled.length; s++) {
    const seen = new Set();
    let repeats = 0;
    for (const r of labelled.slice(s, s + width)) {
      if (seen.has(r.perceptual)) repeats++;
      else seen.add(r.perceptual);
    }
    if (repeats > worst.repeats) worst = {start: s + 1, repeats};
  }
  return worst;
}

const tally = (rows, keyOf) => {
  const m = new Map();
  for (const r of rows) {
    const k = keyOf(r);
    if (k == null) continue;
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return m;
};

/**
 * The family acceptance rule, exactly as the brief words it: a family seen 8+
 * times in 100 must show at least 3 sub-ideas AND 3 task types; seen 4–7 times,
 * at least 2 and 2. Numbers and wording never count as either.
 */
export function familyVerdicts(labelled, sampleSize) {
  const byFamily = new Map();
  for (const r of labelled) {
    if (!byFamily.has(r.family)) byFamily.set(r.family, []);
    byFamily.get(r.family).push(r);
  }
  const out = [];
  for (const [family, rows] of byFamily) {
    // Scaled to the sample so a 50-question session is judged by the same
    // SHARE the brief states for 100, not by a count that means twice as much.
    const per100 = (rows.length * 100) / Math.max(1, sampleSize);
    const need = per100 >= 8 ? {ideas: 3, tasks: 3} : per100 >= 4 ? {ideas: 2, tasks: 2} : {ideas: 1, tasks: 1};
    const ideas = new Set(rows.map(r => r.subIdea)).size;
    const tasks = new Set(rows.map(r => r.task)).size;
    const ok = ideas >= need.ideas && tasks >= need.tasks;
    out.push({family, appearances: rows.length, per100: Number(per100.toFixed(1)),
      subIdeas: ideas, taskTypes: tasks, required: need, verdict: ok ? 'OK' : 'REPETITIVE'});
  }
  return out.sort((a, b) => b.appearances - a.appearances);
}

export function measureSample(rows, {label = 'sample'} = {}) {
  const labelled = classify(rows);
  const counts = Object.fromEntries(LABELS.map(l => [l, 0]));
  for (const r of labelled) counts[r.label]++;
  const perceptual = tally(labelled, r => r.perceptual);
  const rendered = tally(rows, renderedKey);
  const exact = [...rendered.values()].filter(v => v > 1).reduce((a, v) => a + v - 1, 0);
  const clusters = [...perceptual.entries()].filter(([, v]) => v > 1)
    .sort((a, b) => b[1] - a[1]);
  const presentation = tally(labelled, presentationKey);
  const presentationRepeats = [...presentation.values()].reduce((a, v) => a + v - 1, 0);
  return {
    label,
    items: rows.length,
    counts,
    flagged: counts.PARAMETER_ONLY_VARIANT + counts.NEAR_DUPLICATE_CONSTRUCTION,
    distinctPerceptualSignatures: perceptual.size,
    largestPerceptualCluster: Math.max(0, ...perceptual.values()),
    clusters: clusters.slice(0, 8).map(([k, v]) => ({signature: k, size: v})),
    exactDuplicates: exact,
    longestSimilarRun: longestSimilarRun(labelled),
    worstWindowOf20: worstWindow(labelled),
    presentationRepeats,
    distinctPresentations: presentation.size,
    largestPresentationCluster: Math.max(0, ...presentation.values()),
    presentationClusters: [...presentation.entries()].filter(([, v]) => v > 2)
      .sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => ({key: k, size: v})),
    distinctTasks: new Set(labelled.map(r => r.task)).size,
    distinctSubIdeas: new Set(labelled.map(r => r.subIdea)).size,
    unclassifiedTargets: [...new Set(rows.filter(q => !taskOf(meta(q, 'asked_unknown')))
      .map(q => meta(q, 'asked_unknown')))],
    families: familyVerdicts(labelled, rows.length),
    labelled
  };
}
