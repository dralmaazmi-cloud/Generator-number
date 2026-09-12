#!/usr/bin/env node
// RC2.5-6. Repetition, measured five ways instead of one.
//
// The Holdout E blind review flagged 244 of 250 items as repetitive. That number
// comes from a broad cluster definition — items sharing a topic are one cluster —
// and under it a paper covering fourteen topics in 250 questions is repetitive by
// construction. Ordinary recurrence of a broad topic is not a defect, so the
// single number is not a finding; what it hides is.
//
// Five measures, counted apart, because they mean different things:
//
//   EXACT              identical stem text. A defect at any rate above zero.
//   SEMANTIC           identical semantic fingerprint: same template, same named
//                      values. The same question reworded. A defect above zero.
//   PARAMETER_ONLY     same template and same asked unknown, different values.
//                      The normal way an item bank varies. NOT a defect; bounded
//                      per session so it cannot become one.
//   SAME_TEMPLATE      same internal template, any parameters. Bounded by the
//                      session caps (3 per variant, 4 per template id).
//   SAME_REASONING     same reasoning signature — the shape of the solution,
//                      independent of family. Bounded per session and per batch.
//
// The publication-relevant measure is the first two at zero and the last three
// inside their declared caps. That is reported, alongside the broad-cluster
// number, so the two can be compared rather than one replacing the other.

import {readFileSync, existsSync, writeFileSync, mkdirSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';

import Engine from '../../src/index.js';

const CAPS = Object.freeze({
  sameTemplateVariantPerSession: 3,
  sameTemplateIdPerSession: 4,
  sameReasoningPerSession: 3,
  sameReasoningPerBatch: 5
});

const norm = s => (s ?? '').replace(/\s+/g, ' ').trim();

/**
 * What a candidate actually reads. The stem alone is not the item: the odd-one-
 * out and sequence families put their numbers in a separate stimulus block, so
 * thirteen different questions share the stem «أي عدد لا ينتمي إلى المجموعة
 * الآتية؟» and differ entirely in the set below it. Keying "exact duplicate" on
 * the stem reported those as duplicates; they are not.
 */
const renderedItem = r => [
  norm(r.stem),
  norm(r.stimulus),
  Object.values(r.options ?? {}).map(norm).join('|')
].join(' ~ ');

function groups(rows, keyOf) {
  const m = new Map();
  for (const r of rows) {
    const k = keyOf(r);
    if (k == null) continue;
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(r.itemId);
  }
  return m;
}

function summarise(m) {
  const repeated = [...m.entries()].filter(([, ids]) => ids.length > 1);
  const items = repeated.reduce((a, [, ids]) => a + ids.length, 0);
  return {
    distinctKeys: m.size,
    keysUsedMoreThanOnce: repeated.length,
    itemsInSuchAGroup: items,
    largestGroup: Math.max(0, ...[...m.values()].map(v => v.length)),
    examples: repeated.sort((a, b) => b[1].length - a[1].length).slice(0, 5)
      .map(([k, ids]) => ({key: String(k).slice(0, 90), n: ids.length, items: ids.slice(0, 6)}))
  };
}

/**
 * Every measure, over one set of rows. `rows` need `itemId`, `sessionId`,
 * `stem`, `templateId`, `semanticFingerprint`, `structuralReasoningSignature`
 * and `parameters`.
 */
export function measureRepetition(rows) {
  const exact = summarise(groups(rows, renderedItem));
  const stemOnly = summarise(groups(rows, r => norm(r.stem)));
  const semantic = summarise(groups(rows, r => r.semanticFingerprint));
  const template = summarise(groups(rows, r => r.templateId));
  const reasoning = summarise(groups(rows, r => r.structuralReasoningSignature));
  // Parameter-only: same template and same asked unknown, but the values differ.
  // Read off the semantic fingerprint, which already carries both.
  const paramOnly = new Map();
  for (const r of rows) {
    const k = `${r.templateId}|${r.askedUnknown ?? ''}`;
    if (!paramOnly.has(k)) paramOnly.set(k, new Set());
    paramOnly.get(k).add(r.semanticFingerprint);
  }
  const sessions = [...new Set(rows.map(r => r.sessionId))];
  const perSession = sessions.map(s => {
    const rs = rows.filter(r => r.sessionId === s);
    const tpl = groups(rs, r => r.templateId);
    const rsn = groups(rs, r => r.structuralReasoningSignature);
    return {
      sessionId: s, n: rs.length,
      maxSameTemplate: Math.max(0, ...[...tpl.values()].map(v => v.length)),
      maxSameReasoning: Math.max(0, ...[...rsn.values()].map(v => v.length)),
      distinctTemplates: tpl.size,
      distinctReasoning: rsn.size
    };
  });

  return {
    items: rows.length,
    exactDuplicate: exact,
    // Reported apart, because it is NOT a duplication measure: a shared stem
    // over a different stimulus is a shared instruction line, which is what the
    // odd-one-out and sequence families are supposed to have.
    sharedStemLineOnly: {
      note: 'same instruction line, different stimulus. Not duplication; reported so it is not mistaken for it.',
      itemsSharingAStemLine: stemOnly.itemsInSuchAGroup,
      largestGroup: stemOnly.largestGroup,
      examples: stemOnly.examples.map(e => ({stem: e.key, n: e.n}))
    },
    semanticDuplicate: semantic,
    parameterOnlyNearDuplicate: {
      note: 'same template and asked unknown, different values. Normal item variation, not a defect.',
      groups: [...paramOnly.entries()].map(([k, set]) => ({key: k, distinctParameterSets: set.size}))
        .sort((a, b) => b.distinctParameterSets - a.distinctParameterSets).slice(0, 8),
      itemsSharingATemplateAndAsk: [...paramOnly.values()].reduce((a, s) => a + (s.size > 1 ? s.size : 0), 0)
    },
    sameInternalTemplate: template,
    sameReasoningSignature: reasoning,
    perSession,
    caps: CAPS,
    capBreaches: {
      sameTemplateIdPerSession: perSession.filter(s => s.maxSameTemplate > CAPS.sameTemplateIdPerSession)
        .map(s => `${s.sessionId}:${s.maxSameTemplate}`),
      sameReasoningPerSession: perSession.filter(s => s.maxSameReasoning > CAPS.sameReasoningPerSession)
        .map(s => `${s.sessionId}:${s.maxSameReasoning}`),
      sameReasoningPerBatch: reasoning.largestGroup > CAPS.sameReasoningPerBatch
        ? [`batch:${reasoning.largestGroup}`] : []
    },
    // What the broad definition the blind review used would report on the same
    // rows, so the two measures sit side by side.
    broadClusterComparison: (() => {
      const fam = groups(rows, r => r.family);
      const inBroadCluster = [...fam.values()].filter(v => v.length > 1).reduce((a, v) => a + v.length, 0);
      return {
        definition: 'items sharing a family/topic count as one cluster',
        itemsInSomeCluster: inBroadCluster,
        share: Number((inBroadCluster / rows.length).toFixed(4)),
        clusters: fam.size
      };
    })()
  };
}

/** Holdout E, from the preserved hidden dataset. Read-only. */
export function holdoutE(path = 'rc2/holdout-e-full.jsonl.gz') {
  if (!existsSync(path)) return null;
  return gunzipSync(readFileSync(path)).toString('utf8').trim().split('\n').map(l => JSON.parse(l));
}

/**
 * A fresh batch in the Holdout E shape — four mixed sessions and one all-hard —
 * generated as ONE batch, so the batch-level diversity controls apply exactly as
 * they did for the holdout.
 */
export function freshBatch({seed = 'RC25-REP', size = 50} = {}) {
  const batch = new Engine().generateMockBatch({
    seed,
    sessions: [
      {count: size, difficulty: 'mixed', family: 'random'},
      {count: size, difficulty: 'mixed', family: 'random'},
      {count: size, difficulty: 'mixed', family: 'random'},
      {count: size, difficulty: 'mixed', family: 'random'},
      {count: size, difficulty: 'hard', family: 'random'}
    ]
  });
  const rows = [];
  batch.sessions.forEach((s, i) => s.questions.forEach(q => rows.push(toRow(q, `SESSION-${i + 1}`))));
  return rows;
}

function toRow(q, sessionId) {
  return {
    itemId: q.id,
    sessionId,
    family: q.family ?? q.metadata?.family ?? null,
    stem: q.question,
    templateId: q.metadata?.template_id ?? q.generator_id,
    askedUnknown: q.metadata?.asked_unknown ?? null,
    stimulus: q.display_expression ?? q.stimulus ?? null,
    options: q.options ?? null,
    semanticFingerprint: q.metadata?.semantic_fingerprint ?? q.metadata?.fingerprint ?? null,
    structuralReasoningSignature: q.metadata?.structural_reasoning_signature ?? null,
    parameters: q.metadata?.parameters ?? null
  };
}

export function build() {
  const e = holdoutE();
  return {
    schema: 'rc25-repetition-v1',
    generatedAt: new Date().toISOString(),
    holdoutE: e ? measureRepetition(e) : {available: false},
    fresh: measureRepetition(freshBatch())
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const r = build();
  mkdirSync('rc2', {recursive: true});
  writeFileSync('rc2/RC25_REPETITION.json', JSON.stringify(r, null, 2) + '\n');
  const brief = m => ({
    items: m.items,
    exact: m.exactDuplicate.itemsInSuchAGroup,
    semantic: m.semanticDuplicate.itemsInSuchAGroup,
    largestSameTemplateInASession: Math.max(0, ...m.perSession.map(s => s.maxSameTemplate)),
    largestSameReasoningInASession: Math.max(0, ...m.perSession.map(s => s.maxSameReasoning)),
    largestSameReasoningInTheBatch: m.sameReasoningSignature.largestGroup,
    capBreaches: m.capBreaches,
    broadClusterShare: m.broadClusterComparison.share
  });
  console.log(JSON.stringify({holdoutE: brief(r.holdoutE), fresh: brief(r.fresh)}, null, 2));
}
