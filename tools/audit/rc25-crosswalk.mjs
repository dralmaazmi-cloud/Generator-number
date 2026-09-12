#!/usr/bin/env node
// RC2.5-0/1. Holdout E, crosswalked — and the join that turns the blind
// verdicts into per-template evidence the moment they are available.
//
// Two halves, deliberately separated:
//
//   CROSSWALK   every one of the 250 items mapped to the template, family,
//               structural variant and reasoning signature that produced it.
//               Read from the preserved hidden dataset; needs nothing else.
//
//   JOIN        the crosswalk against the sealed blind verdict file, giving the
//               per-template human verdict rates §1 asks for. This half cannot
//               be run without that file, and it is not approximated: the brief
//               says 53 of 82 HARD items were overclassified, and spreading 53
//               across 34 templates by guesswork would be a fabrication dressed
//               as evidence. With no file present the tool says so and stops.
//
// The verdict file is expected as JSON Lines, one record per item, carrying an
// item id and a verdict. Field names are matched leniently (itemId/item_id/id;
// verdict/difficultyVerdict/appropriate; ambiguous/isAmbiguous; keyCorrect) so a
// reviewer's own export shape is likely to load as-is; anything unrecognised is
// reported rather than silently dropped.

import {readFileSync, existsSync, writeFileSync, mkdirSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';

import {TEMPLATE_STRUCTURE, structuralBandOf} from '../../src/qa/structure.js';

const FULL = 'rc2/holdout-e-full.jsonl.gz';
const KEY = 'rc2/holdout-e-reveal/answer-key.jsonl';

/** Candidate locations for the sealed blind verdict file. */
export const VERDICT_PATHS = [
  'rc2/holdout-e-verdicts.jsonl',
  'rc2/holdout-e-reveal/blind-verdicts.jsonl',
  'rc2/HOLDOUT_E_VERDICTS.jsonl'
];

export function loadHoldoutE(path = FULL) {
  if (!existsSync(path)) throw new Error(`HOLDOUT_E_NOT_FOUND:${path}`);
  return gunzipSync(readFileSync(path)).toString('utf8').trim().split('\n').map(l => JSON.parse(l));
}

export function loadKey(path = KEY) {
  if (!existsSync(path)) return null;
  return Object.fromEntries(readFileSync(path, 'utf8').trim().split('\n')
    .map(l => JSON.parse(l)).map(r => [r.itemId, r]));
}

/**
 * The structural VARIANT of an item: what actually varied inside the template.
 * For most templates that is the criteria set; for the relational family it is
 * the drawn graph's own complexity verdict, which is the variation RC2.5 exists
 * to separate.
 */
export function variantOf(row) {
  const crit = (row.difficultyEvidence?.structuralCriteria ?? []).slice().sort();
  const po = row.partial_order_band ?? row.metadata?.partial_order_band ?? null;
  const parts = [crit.join('+') || 'none'];
  if (po) parts.push(`graph:${po}`);
  if (row.askedUnknown) parts.push(`ask:${row.askedUnknown}`);
  return parts.join('|');
}

export function crosswalk({path = FULL} = {}) {
  const rows = loadHoldoutE(path);
  const key = loadKey();
  const items = rows.map(r => ({
    itemId: r.itemId,
    sessionId: r.sessionId,
    questionNumber: r.questionNumber,
    declaredDifficulty: r.declaredDifficulty,
    family: r.family,
    templateId: r.templateId,
    variant: variantOf(r),
    structuralCriteria: r.difficultyEvidence?.structuralCriteria ?? [],
    reasoningSignature: r.structuralReasoningSignature,
    semanticFingerprint: r.semanticFingerprint,
    askedUnknown: r.askedUnknown ?? null,
    targetMisconception: r.targetMisconception ?? null,
    correctOption: r.correctOption,
    keyAgrees: key ? key[r.itemId]?.correctOption === r.correctOption : null,
    // Where RC2.5 puts this template NOW, so the crosswalk also shows which
    // items were delivered at a band the engine would no longer give them.
    rc25Band: TEMPLATE_STRUCTURE[r.templateId] ? structuralBandOf(r.templateId) : 'REMOVED_OR_SPLIT'
  }));

  const byBand = {};
  for (const band of ['easy', 'medium', 'hard']) {
    const rowsAt = items.filter(i => i.declaredDifficulty === band);
    const perTemplate = {};
    for (const i of rowsAt) {
      const k = `${i.family}/${i.templateId}`;
      perTemplate[k] = perTemplate[k] ?? {
        family: i.family, templateId: i.templateId, n: 0, variants: {},
        rc25Band: i.rc25Band, itemIds: []
      };
      perTemplate[k].n++;
      perTemplate[k].itemIds.push(i.itemId);
      perTemplate[k].variants[i.variant] = (perTemplate[k].variants[i.variant] ?? 0) + 1;
    }
    byBand[band] = {
      items: rowsAt.length,
      distinctTemplates: new Set(rowsAt.map(i => i.templateId)).size,
      distinctFamilies: new Set(rowsAt.map(i => i.family)).size,
      distinctReasoningSignatures: new Set(rowsAt.map(i => i.reasoningSignature)).size,
      templates: Object.values(perTemplate).sort((a, b) => b.n - a.n),
      // What RC2.5 would deliver these items as today.
      rc25BandOfDeliveredItems: rowsAt.reduce((a, i) => (a[i.rc25Band] = (a[i.rc25Band] ?? 0) + 1, a), {})
    };
  }

  return {
    items: items.length,
    keyAgreement: key ? items.filter(i => i.keyAgrees).length : null,
    byBand,
    all: items
  };
}

// --- the join ---------------------------------------------------------------

const pick = (o, names) => { for (const n of names) if (o[n] !== undefined) return o[n]; return undefined; };

export function loadVerdicts(paths = VERDICT_PATHS) {
  const found = paths.find(p => existsSync(p));
  if (!found) return {available: false, searched: paths};
  const rows = readFileSync(found, 'utf8').trim().split('\n').filter(Boolean).map(l => JSON.parse(l));
  const unrecognised = [];
  const byItem = {};
  for (const r of rows) {
    const id = pick(r, ['itemId', 'item_id', 'id']);
    const verdict = pick(r, ['verdict', 'difficultyVerdict', 'difficulty_verdict', 'appropriate', 'judgedDifficulty']);
    if (id === undefined || verdict === undefined) { unrecognised.push(r); continue; }
    byItem[id] = {
      itemId: id,
      verdict: String(verdict).toLowerCase(),
      ambiguous: Boolean(pick(r, ['ambiguous', 'isAmbiguous', 'is_ambiguous']) ?? false),
      keyCorrect: pick(r, ['keyCorrect', 'key_correct']) ?? null,
      raw: r
    };
  }
  return {available: true, path: found, count: Object.keys(byItem).length, unrecognised, byItem};
}

/**
 * Per-template human verdict rates. Verdict strings are normalised to three
 * outcomes; anything else is carried through under its own name rather than
 * being folded into one of them.
 */
export function join({verdicts = loadVerdicts(), cross = crosswalk()} = {}) {
  if (!verdicts.available) {
    return {
      available: false,
      searched: verdicts.searched,
      note: 'The sealed blind verdict file is required for the per-template human calibration and is not present. No substitute is used.'
    };
  }
  const missing = cross.all.filter(i => !verdicts.byItem[i.itemId]).map(i => i.itemId);
  const perTemplate = {};
  for (const i of cross.all) {
    const v = verdicts.byItem[i.itemId];
    if (!v) continue;
    const k = i.templateId;
    perTemplate[k] = perTemplate[k] ?? {
      templateId: k, family: i.family, deliveredAt: {}, verdicts: {},
      byVariant: {}, ambiguous: 0, n: 0, rc25Band: i.rc25Band
    };
    const t = perTemplate[k];
    t.n++;
    t.deliveredAt[i.declaredDifficulty] = (t.deliveredAt[i.declaredDifficulty] ?? 0) + 1;
    t.verdicts[v.verdict] = (t.verdicts[v.verdict] ?? 0) + 1;
    t.byVariant[i.variant] = t.byVariant[i.variant] ?? {};
    t.byVariant[i.variant][v.verdict] = (t.byVariant[i.variant][v.verdict] ?? 0) + 1;
    if (v.ambiguous) t.ambiguous++;
  }
  return {
    available: true, path: verdicts.path,
    itemsJoined: cross.all.length - missing.length,
    itemsWithoutAVerdict: missing,
    unrecognisedVerdictRecords: verdicts.unrecognised.length,
    perTemplate: Object.values(perTemplate).sort((a, b) => b.n - a.n)
  };
}

export function build() {
  const cross = crosswalk();
  return {
    schema: 'rc25-crosswalk-v1',
    generatedAt: new Date().toISOString(),
    crosswalk: cross,
    humanVerdictJoin: join({cross})
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const r = build();
  mkdirSync('rc2', {recursive: true});
  writeFileSync('rc2/RC25_CROSSWALK.json', JSON.stringify(r, null, 2) + '\n');
  const c = r.crosswalk;
  console.log(JSON.stringify({
    items: c.items,
    keyAgreement: c.keyAgreement,
    byBand: Object.fromEntries(Object.entries(c.byBand).map(([b, v]) => [b, {
      items: v.items, templates: v.distinctTemplates, families: v.distinctFamilies,
      reasoningSignatures: v.distinctReasoningSignatures,
      whereRC25PutsThemNow: v.rc25BandOfDeliveredItems
    }])),
    humanVerdictJoin: r.humanVerdictJoin.available
      ? {joined: r.humanVerdictJoin.itemsJoined, templates: r.humanVerdictJoin.perTemplate.length}
      : {available: false, searched: r.humanVerdictJoin.searched}
  }, null, 2));
}
