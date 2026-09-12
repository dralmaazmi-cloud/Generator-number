#!/usr/bin/env node
// RC2.4 — the reveal key for Holdout E.
//
// A projection, not a generation: the only input is the file written at the
// first and only generation of AUDIT-2026-09-13-E. Nothing here imports the
// engine, so it cannot replay a question, and it reads no field beyond the
// three the key is made of. The projection is the one used for Holdouts C and
// D, so the three keys are comparable.
//
// Written now and held. It is not part of the blind package and is not to be
// opened until the blind verdicts are sealed.

import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {join} from 'node:path';

const ROOT = process.cwd();
const sha = b => createHash('sha256').update(b).digest('hex');

const manifest = JSON.parse(readFileSync(join(ROOT, 'rc2/HOLDOUT_E.json'), 'utf8'));
const fullText = gunzipSync(readFileSync(join(ROOT, 'rc2/holdout-e-full.jsonl.gz'))).toString('utf8');

const fullSha = sha(Buffer.from(fullText, 'utf8'));
if (fullSha !== manifest.totals.fullSha256) {
  console.error(`REFUSED: preserved full record hashes ${fullSha}, manifest recorded ${manifest.totals.fullSha256}`);
  process.exit(1);
}

const full = fullText.trim().split('\n').map(l => JSON.parse(l));
const answerKey = full.map(f => ({itemId: f.itemId, correctOption: f.correctOption, correctValue: f.correctValue}));

const ids = new Set(answerKey.map(k => k.itemId));
const problems = [];
if (answerKey.length !== manifest.totals.delivered) problems.push(`${answerKey.length} records, ${manifest.totals.delivered} delivered`);
if (ids.size !== answerKey.length) problems.push(`${ids.size} unique ids across ${answerKey.length} records`);
for (const k of answerKey) {
  if (!/^E-S[1-5]-\d{2}$/.test(k.itemId)) problems.push(`item id outside Holdout E: ${k.itemId}`);
  if (!/^[A-F]$/.test(k.correctOption)) problems.push(`${k.itemId}: option label ${k.correctOption}`);
  if (k.correctValue === undefined || k.correctValue === null) problems.push(`${k.itemId}: no correct value`);
}
if (problems.length) {
  console.error('REFUSED:\n  ' + problems.slice(0, 10).join('\n  '));
  process.exit(1);
}

const OUT = join(ROOT, 'rc2/holdout-e-reveal');
mkdirSync(OUT, {recursive: true});
const text = answerKey.map(o => JSON.stringify(o)).join('\n') + '\n';
writeFileSync(join(OUT, 'answer-key.jsonl'), text);

console.log(JSON.stringify({
  source: 'rc2/holdout-e-full.jsonl.gz',
  sourceSha256: fullSha,
  sourceMatchesGeneration: true,
  records: answerKey.length,
  uniqueItemIds: ids.size,
  idRange: [answerKey[0].itemId, answerKey[answerKey.length - 1].itemId],
  perSession: [1, 2, 3, 4, 5].map(s => answerKey.filter(k => k.itemId.startsWith(`E-S${s}-`)).length),
  answerKeySha256: sha(Buffer.from(text, 'utf8')),
  bytes: Buffer.byteLength(text, 'utf8'),
  note: 'Held for reveal after the blind verdicts are sealed. Not part of the blind package.'
}, null, 2));
