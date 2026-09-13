#!/usr/bin/env node
// RC2.6 — the blind-review artifacts for AUDIT-2026-09-13-F.
//
// Two structural guarantees, both checkable from the imports and the reads
// rather than taken on trust:
//
//   1. node builtins only. No engine, no family module, no pipeline, no
//      validator — so this cannot regenerate, replay or alter a question.
//   2. it opens rc2/holdout-f-blind.jsonl.gz and NOTHING else. The full file
//      holding keys, explanations, derivations, difficulty evidence and
//      fingerprints is never read, so no hidden field can reach the output by
//      any bug in this file.
//
// The blind dataset does not carry template ids, difficulty evidence,
// fingerprints or reasoning signatures at all, so there is nothing here to
// filter out — the absence is structural rather than a filter that has to be
// trusted.
//
// One thing this build does that the Holdout E build did not: it writes a
// MANIFEST of every hash in the same run that produces the files. Chromium's
// print-to-PDF embeds a creation timestamp, so re-rendering produces
// byte-different PDFs of identical content — which is how the hashes reported
// for Holdout E's package came to be stale. This tool is therefore run exactly
// once, and the manifest it writes is the record; nothing has to be re-rendered
// to find out what was shipped.
//
// No question is inspected or scored here.

import {readFileSync, writeFileSync, mkdirSync, existsSync, statSync, rmSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {join} from 'node:path';

const SOURCE = 'rc2/holdout-f-blind.jsonl.gz';
const OUT = 'rc2/holdout-f-blind-package';
const ZIP = 'rc2/RC2_6_HOLDOUT_F_BLIND.zip';
const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];
const sha = b => createHash('sha256').update(b).digest('hex');
const CHROME = ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  '/opt/pw-browsers/chromium/chrome-linux/chrome'].find(p => existsSync(p)) ?? null;

const raw = readFileSync(SOURCE);
const blind = gunzipSync(raw).toString('utf8').trim().split('\n').map(l => JSON.parse(l));
if (blind.length !== 250) throw new Error(`expected 250 preserved questions, found ${blind.length}`);

// The blind record must carry nothing beyond what a reviewer may see. Checked
// against the file rather than against intent.
const ALLOWED = ['itemId', 'sessionId', 'sessionKind', 'questionNumber', 'declaredDifficulty',
  'stem', 'stimulus', 'options'];
const stray = [...new Set(blind.flatMap(b => Object.keys(b)))].filter(k => !ALLOWED.includes(k));
if (stray.length) throw new Error(`blind dataset carries fields a reviewer may not see: ${stray}`);

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const sessionIds = [...new Set(blind.map(b => b.sessionId))];

function text() {
  const out = [
    'SIGN-OFF HOLDOUT — AUDIT-2026-09-13-F',
    'BLIND QUESTION SET — 250 questions. No answer keys in this file.',
    'Logical-order Unicode: reading order is applied by the reader, not baked into the bytes.',
    '='.repeat(78)
  ];
  let current = null;
  for (const b of blind) {
    if (b.sessionId !== current) {
      current = b.sessionId;
      const n = blind.filter(x => x.sessionId === b.sessionId).length;
      out.push('', '='.repeat(78), `${b.sessionId}  [${b.sessionKind}]  ${n} questions`, '='.repeat(78), '');
    }
    out.push(`### ${b.itemId}   [${b.declaredDifficulty}]`);
    out.push(b.stem);
    if (b.stimulus) out.push(`   ${b.stimulus}`);
    for (const L of LETTERS) out.push(`   ${L}) ${b.options[L]}`);
    out.push('');
  }
  out.push('='.repeat(78), `-- ${blind.length} questions, no keys --`);
  return out.join('\n') + '\n';
}

function html(sessionId) {
  const sel = blind.filter(b => b.sessionId === sessionId);
  const kind = sel[0].sessionKind;
  const body = sel.map(b => `
  <article class="q">
    <div class="hd"><span>${esc(b.itemId)}</span><span>${esc(b.declaredDifficulty)}</span></div>
    <p class="stem">${esc(b.stem)}</p>
    ${b.stimulus ? `<p class="stim">${esc(b.stimulus)}</p>` : ''}
    <ol class="opts">${LETTERS.map(L => `<li><span class="l">${L}</span>${esc(b.options[L])}</li>`).join('')}</ol>
  </article>`).join('\n');

  return `<!doctype html>
<html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>${esc(sessionId)} — blind</title>
<style>
  @page { size: A4; margin: 14mm; }
  body { font-family: "FreeSerif","DejaVu Sans",serif; font-size: 12pt; line-height: 1.85; color: #111; margin: 0; }
  header { border-bottom: 2px solid #111; padding-bottom: 8px; margin-bottom: 14px; }
  h1 { font-size: 15pt; margin: 0 0 4px; }
  .meta { font-size: 9pt; color: #444; direction: ltr; text-align: left; font-family: "DejaVu Sans Mono", monospace; }
  .warn { border: 1px solid #036; color: #036; padding: 6px 10px; margin: 10px 0 16px; font-size: 9.5pt;
          direction: ltr; text-align: left; font-family: "DejaVu Sans", sans-serif; }
  .q { break-inside: avoid; page-break-inside: avoid; margin: 0 0 14px; padding: 8px 10px; border-right: 3px solid #ccc; }
  .hd { display: flex; justify-content: space-between; font-size: 8.5pt; color: #555; direction: ltr;
        font-family: "DejaVu Sans Mono", monospace; margin-bottom: 4px; }
  .stem { margin: 0 0 6px; font-size: 12.5pt; }
  .stim { margin: 0 0 8px; font-size: 13pt; letter-spacing: .04em; background: #f4f4f0;
          border: 1px solid #ddd; padding: 5px 10px; display: inline-block; }
  .opts { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 2px 14px; }
  .opts li { font-size: 11.5pt; }
  .l { display: inline-block; min-width: 1.6em; color: #555; font-family: "DejaVu Sans Mono", monospace; }
  footer { margin-top: 16px; border-top: 1px solid #999; padding-top: 6px; font-size: 8.5pt; color: #555;
           direction: ltr; text-align: left; }
</style></head><body>
<header>
  <h1>الاختبار المحجوز (نسخة بلا إجابات)</h1>
  <div class="meta">${esc(sessionId)} [${esc(kind)}] · ${sel.length} questions</div>
</header>
<div class="warn"><strong>BLIND REVIEW COPY.</strong> No answer keys in this document. Questions are preserved exactly as generated and must not be edited, replaced or regenerated.</div>
${body}
<footer>${esc(sessionId)} — ${sel.length} questions — blind — AUDIT-2026-09-13-F</footer>
<script type="application/json" id="report-logical-text">${JSON.stringify(
  sel.map(b => ({itemId: b.itemId, stem: b.stem, stimulus: b.stimulus, options: b.options})), null, 1)
  .replace(/</g, '\\u003c')}</script>
</body></html>
`;
}

if (existsSync(OUT)) rmSync(OUT, {recursive: true});
mkdirSync(OUT, {recursive: true});
writeFileSync(join(OUT, 'blind-questions.txt'), text());

// HTML is written outside the package so the folder holds exactly the six
// deliverables and no intermediates.
const scratch = process.env.RC26_SCRATCH || '/tmp/rc26-holdout-f-html';
mkdirSync(scratch, {recursive: true});
const pdfs = [];
sessionIds.forEach((id, i) => {
  const name = `session-${i + 1}`;
  const htmlPath = join(scratch, `${name}.html`);
  writeFileSync(htmlPath, html(id));
  const pdfPath = join(process.cwd(), OUT, `${name}.pdf`);
  if (!CHROME) { pdfs.push({name, rendered: false, reason: 'no chromium'}); return; }
  try {
    execFileSync(CHROME, ['--headless', '--no-sandbox', '--disable-gpu', '--no-pdf-header-footer',
      `--print-to-pdf=${pdfPath}`, `file://${htmlPath}`], {stdio: 'ignore', timeout: 120000});
    pdfs.push({name, sessionId: id, rendered: true, bytes: statSync(pdfPath).size});
  } catch (err) {
    pdfs.push({name, sessionId: id, rendered: false, reason: String(err.message || err).slice(0, 160)});
  }
});

// A leak check against what was actually written, not against intent.
const written = readFileSync(join(OUT, 'blind-questions.txt'), 'utf8');
const leaks = ['correctOption', 'correctValue', 'misconception', 'derivation', 'semanticFingerprint',
  'fingerprint', 'complexity', 'telemetry', 'explanation', 'templateId', 'scenario_signature',
  'construction_signature', 'stem_skeleton', 'structuralReasoningSignature', 'RC2.6', 'REMEDIATION']
  .filter(m => written.includes(m));

const EXPECTED = ['blind-questions.txt', ...sessionIds.map((_, i) => `session-${i + 1}.pdf`)];
const missing = EXPECTED.filter(f => !existsSync(join(OUT, f)));
if (missing.length) throw new Error(`blind package incomplete: ${missing}`);

if (existsSync(ZIP)) rmSync(ZIP);
execFileSync('zip', ['-q', '-X', '-j', join(process.cwd(), ZIP), ...EXPECTED.map(f => join(OUT, f))],
  {cwd: process.cwd()});
const listed = execFileSync('zip', ['-sf', join(process.cwd(), ZIP)], {encoding: 'utf8'})
  .split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('Archive') && !l.startsWith('Total'));

const files = EXPECTED.map(f => ({path: f, bytes: statSync(join(OUT, f)).size, sha256: sha(readFileSync(join(OUT, f)))}));

const manifest = {
  schema: 'rc26-holdout-f-blind-package-v1',
  builtAt: new Date().toISOString(),
  holdoutSeed: 'AUDIT-2026-09-13-F',
  builtExactlyOnce: true,
  note: 'Written in the same run that produced the files. PDF bytes are not reproducible — Chromium embeds a creation timestamp — so this manifest, not a later re-render, is the record of what was shipped.',
  out: OUT, zip: ZIP, questions: blind.length,
  sourceOnlyRead: SOURCE,
  sourceSha256Uncompressed: sha(gunzipSync(raw)),
  blindFieldsPresent: [...new Set(blind.flatMap(b => Object.keys(b)))].sort(),
  leakCheck: {passed: leaks.length === 0, findings: leaks},
  pdfs: pdfs.map(p => ({name: p.name, rendered: p.rendered, bytes: p.bytes})),
  zipContents: listed,
  zipSha256: sha(readFileSync(ZIP)),
  zipBytes: statSync(ZIP).size,
  files
};
writeFileSync('rc2/HOLDOUT_F_BLIND_PACKAGE.json', JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify(manifest, null, 2));
