#!/usr/bin/env node
// RC2.7-7. Containment pass over the rendered examples.
//
// rc2/RC27_EXAMPLES.md exists so a reviewer can see what the diversity figures
// mean, and to do that it prints each example WITH ITS ANSWER. The examples are
// drawn from the same space a sealed holdout was drawn from, so an item here can
// coincide with one there — redrawing on three different seed prefixes still
// produced one or two coincidences each time, because the short abstract stems
// of sequences and odd-one-out have a small surface.
//
// A coincidence is only a leak because of the printed answer, so that is what
// is removed: the whole block goes, and a note in its place says why. The count
// is reported so the redaction is visible rather than silent.
//
// This reads the sealed blind datasets and therefore only runs in a checkout
// that has them. It is not part of generating the examples.

import {readFileSync, writeFileSync, existsSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';

const SEALED = ['rc2/holdout-f-blind.jsonl.gz', 'rc2/holdout-e-blind.jsonl.gz',
  'rc2/holdout-d-blind.jsonl.gz', 'rc2/holdout-c-blind.jsonl.gz'];

const norm = s => String(s ?? '').replace(/\s+/g, ' ').trim();

const stems = new Set();
for (const p of SEALED) {
  if (!existsSync(p)) continue;
  for (const line of gunzipSync(readFileSync(p)).toString('utf8').trim().split('\n')) {
    try { stems.add(norm(JSON.parse(line).stem)); } catch { /* not a row */ }
  }
}

const path = process.argv[2] ?? 'rc2/RC27_EXAMPLES.md';
const lines = readFileSync(path, 'utf8').split('\n');
const out = [];
let redacted = 0;

for (let i = 0; i < lines.length; i++) {
  // A block is a run of quoted lines beginning with the stem and ending at the
  // attribution line that carries the answer.
  if (!lines[i].startsWith('> ') || lines[i].startsWith('> —') || lines[i].startsWith('> _')) {
    out.push(lines[i]);
    continue;
  }
  let j = i;
  while (j < lines.length && lines[j].startsWith('>')) j++;
  const block = lines.slice(i, j);
  const stem = norm(block[0].replace(/^>\s*/, ''));
  const carriesAnswer = block.some(l => l.includes('answer '));
  if (carriesAnswer && stem.length > 40 && stems.has(stem)) {
    out.push('> _(one rendered example withheld: this instance coincides with an item in a'
      + ' sealed holdout, and every example here is printed with its answer.)_');
    redacted++;
  } else {
    out.push(...block);
  }
  i = j - 1;
}

writeFileSync(path, out.join('\n'));
console.log(JSON.stringify({path, sealedStemsKnown: stems.size, blocksRedacted: redacted}));
