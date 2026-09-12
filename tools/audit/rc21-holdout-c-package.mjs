#!/usr/bin/env node
// RC2.1 — the independent-review delivery for AUDIT-2026-09-12-C.
//
// This tool imports node builtins and nothing else. No engine, no family module,
// no pipeline, no validator. A tool with no access to a generator cannot
// regenerate, replay or modify a holdout question, and that is checkable from
// the import list rather than taken on trust.
//
// Every byte is derived from two preserved files written at generation:
//   rc2/holdout-c-blind.jsonl.gz   reviewer-visible
//   rc2/holdout-c-full.jsonl.gz    reviewer-hidden
// Neither is written to, and no question is inspected or scored here.
//
// Three packages, kept physically apart so a reviewer cannot open the key by
// accident:
//   blind/        what a candidate sees
//   reveal/       the key, and only the key
//   post-reveal/  the quality evidence, for after the blind pass

import {readFileSync, writeFileSync, mkdirSync, existsSync, statSync, readdirSync, rmSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {join} from 'node:path';

const OUT = 'rc2/holdout-c-package';
const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];
const sha = buf => createHash('sha256').update(buf).digest('hex');
const CHROME = ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  '/opt/pw-browsers/chromium/chrome-linux/chrome'].find(p => existsSync(p)) ?? null;

const SOURCES = {
  blind: 'rc2/holdout-c-blind.jsonl.gz',
  full: 'rc2/holdout-c-full.jsonl.gz',
  report: 'rc2/HOLDOUT_C.json',
  freeze: 'rc2/FREEZE.json'
};
const readJsonl = p => gunzipSync(readFileSync(p)).toString('utf8').trim().split('\n').map(l => JSON.parse(l));

const blind = readJsonl(SOURCES.blind);
const full = readJsonl(SOURCES.full);
const report = JSON.parse(readFileSync(SOURCES.report, 'utf8'));
const freeze = JSON.parse(readFileSync(SOURCES.freeze, 'utf8'));

if (blind.length !== 250 || full.length !== 250) {
  throw new Error(`expected 250 preserved questions, found ${blind.length}/${full.length}`);
}

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const sessionIds = [...new Set(blind.map(b => b.sessionId))];

// ============================================================================
// BLIND
// ============================================================================
function blindText() {
  const out = [
    'SIGN-OFF HOLDOUT — AUDIT-2026-09-12-C',
    'BLIND QUESTION SET — 250 questions. No answer keys in this file.',
    // Provenance only: enough for a reviewer to tie the paper to an engine
    // build, with no release label, no report and no finding.
    `engine ${report.engineVersion}   commit ${freeze.RC2_COMMIT}`,
    'Logical-order Unicode: reading order is applied by the reader, not baked into the bytes.',
    '='.repeat(78)
  ];
  let current = null;
  for (const b of blind) {
    if (b.sessionId !== current) {
      current = b.sessionId;
      const s = report.sessions.find(x => x.id === b.sessionId);
      out.push('', '='.repeat(78), `${b.sessionId}  [${b.sessionKind}]  ${s.delivered} questions`, '='.repeat(78), '');
    }
    out.push(`### ${b.itemId}   ${b.templateId}   [${b.declaredDifficulty}]   ${b.family}`);
    out.push(b.stem);
    if (b.stimulus) out.push(`   ${b.stimulus}`);
    for (const L of LETTERS) out.push(`   ${L}) ${b.options[L]}`);
    out.push('');
  }
  out.push('='.repeat(78), `-- ${blind.length} questions, no keys --`);
  return out.join('\n') + '\n';
}

function blindHtml(sessionId) {
  const sel = blind.filter(b => b.sessionId === sessionId);
  const s = report.sessions.find(x => x.id === sessionId);
  const body = sel.map(b => `
  <article class="q">
    <div class="hd"><span>${esc(b.itemId)}</span><span>${esc(b.templateId)} · ${esc(b.family)} · ${esc(b.declaredDifficulty)}</span></div>
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
  <div class="meta">${esc(sessionId)} [${esc(s.kind)}] · ${s.delivered} questions · engine ${esc(report.engineVersion)} · commit ${esc(freeze.RC2_COMMIT.slice(0, 12))}</div>
</header>
<div class="warn"><strong>BLIND REVIEW COPY.</strong> No answer keys in this document. Questions are preserved exactly as generated and must not be edited, replaced or regenerated.</div>
${body}
<footer>${esc(sessionId)} — ${sel.length} questions — blind — AUDIT-2026-09-12-C</footer>
<script type="application/json" id="report-logical-text">${JSON.stringify(
  sel.map(b => ({itemId: b.itemId, stem: b.stem, stimulus: b.stimulus, options: b.options})), null, 1)
  .replace(/</g, '\\u003c')}</script>
</body></html>
`;
}

// ============================================================================
// REVEAL  /  POST-REVEAL
// ============================================================================
const answerKey = full.map(f => ({itemId: f.itemId, correctOption: f.correctOption, correctValue: f.correctValue}));

const explanations = full.map(f => ({
  itemId: f.itemId, templateId: f.templateId,
  howToStart: f.explanation?.how_to_start ?? null,
  steps: f.explanation?.steps ?? [],
  answer: f.explanation?.answer ?? null,
  fastMethod: f.explanation?.fast_method ?? null,
  remember: f.explanation?.remember ?? null
}));

const derivations = full.map(f => ({
  itemId: f.itemId, templateId: f.templateId,
  correctOption: f.correctOption,
  options: Object.fromEntries(Object.entries(f.optionsMeta).map(([L, m]) => [L, {
    value: m.value, correct: m.correct === true,
    misconceptionId: m.misconceptionId ?? null,
    derivation: m.derivation ?? null,
    reasoningStepAffected: m.reasoningStepAffected ?? null
  }]))
}));

const misconceptions = full.map(f => ({
  itemId: f.itemId, templateId: f.templateId,
  targetMisconception: f.targetMisconception,
  perOption: Object.fromEntries(Object.entries(f.optionsMeta)
    .filter(([, m]) => !m.correct).map(([L, m]) => [L, m.misconceptionId ?? null]))
}));

const difficulty = full.map(f => ({
  itemId: f.itemId, templateId: f.templateId, family: f.family, ...f.difficultyEvidence
}));

const semantic = full.map(f => ({
  itemId: f.itemId, templateId: f.templateId,
  fingerprint: f.fingerprint, semanticFingerprint: f.semanticFingerprint
}));

const reasoning = full.map(f => ({
  itemId: f.itemId, templateId: f.templateId,
  structuralReasoningSignature: f.structuralReasoningSignature,
  ambiguityVerdict: f.ambiguityVerdict
}));

// ============================================================================
// emit
// ============================================================================
if (existsSync(OUT)) rmSync(OUT, {recursive: true});
for (const d of ['blind', 'reveal', 'post-reveal']) mkdirSync(join(OUT, d), {recursive: true});
const jsonl = a => a.map(o => JSON.stringify(o)).join('\n') + '\n';

writeFileSync(join(OUT, 'blind/blind-questions.txt'), blindText());
writeFileSync(join(OUT, 'reveal/answer-key.jsonl'), jsonl(answerKey));
writeFileSync(join(OUT, 'post-reveal/explanations.jsonl'), jsonl(explanations));
writeFileSync(join(OUT, 'post-reveal/distractor-derivations.jsonl'), jsonl(derivations));
writeFileSync(join(OUT, 'post-reveal/misconception-ids.jsonl'), jsonl(misconceptions));
writeFileSync(join(OUT, 'post-reveal/difficulty-evidence.jsonl'), jsonl(difficulty));
writeFileSync(join(OUT, 'post-reveal/semantic-fingerprints.jsonl'), jsonl(semantic));
writeFileSync(join(OUT, 'post-reveal/reasoning-signatures.jsonl'), jsonl(reasoning));

// PDFs are printed from HTML written outside the package, so the blind folder
// holds exactly the six deliverables and nothing else.
const scratch = process.env.RC21_SCRATCH || '/tmp/rc21-holdout-c-html';
mkdirSync(scratch, {recursive: true});
const pdfs = [];
sessionIds.forEach((id, i) => {
  const name = `session-${i + 1}`;
  const htmlPath = join(scratch, `${name}.html`);
  writeFileSync(htmlPath, blindHtml(id));
  const pdfPath = join(process.cwd(), OUT, `blind/${name}.pdf`);
  if (!CHROME) { pdfs.push({name, rendered: false, reason: 'no chromium'}); return; }
  try {
    execFileSync(CHROME, ['--headless', '--no-sandbox', '--disable-gpu', '--no-pdf-header-footer',
      `--print-to-pdf=${pdfPath}`, `file://${htmlPath}`], {stdio: 'ignore', timeout: 120000});
    pdfs.push({name, sessionId: id, rendered: true, bytes: statSync(pdfPath).size});
  } catch (err) {
    pdfs.push({name, sessionId: id, rendered: false, reason: String(err.message || err).slice(0, 160)});
  }
});

// --- leak check, run against what was actually written ----------------------
const blindText_ = readFileSync(join(OUT, 'blind/blind-questions.txt'), 'utf8');
const leaks = [];
for (const f of full) {
  if (new RegExp(`${f.itemId}[^#]*?${f.correctOption}\\)\\s*${f.correctValue}\\s*<<KEY>>`).test(blindText_)) {
    leaks.push(f.itemId);
  }
}
for (const marker of ['correctOption', 'correctValue', 'misconception', 'derivation', 'semanticFingerprint',
  'complexity', 'RC2.1', 'telemetry', 'REMEDIATION']) {
  if (blindText_.includes(marker)) leaks.push(`blind-questions.txt contains "${marker}"`);
}

const walk = dir => readdirSync(dir).sort().flatMap(f => {
  const p = join(dir, f);
  return statSync(p).isDirectory() ? walk(p) : [p];
});
const files = walk(OUT).map(p => ({
  path: p.slice(OUT.length + 1), bytes: statSync(p).size, sha256: sha(readFileSync(p))
}));

const manifest = {
  schema: 'rc21-holdout-c-package-v1',
  builtAt: new Date().toISOString(),
  holdout: {seed: report.holdoutSeed, questions: blind.length, generatedExactlyOnce: true,
    previousHoldout: report.previousHoldout},
  provenance: {
    RC2_1_COMMIT: freeze.RC2_COMMIT, treeHash: freeze.treeHash,
    engineVersion: report.engineVersion,
    productionBundleSha256: freeze.productionBundleSha256,
    internalGate: freeze.internalGate
  },
  integrity: {
    note: 'Derived from the preserved generation output; neither source was written to.',
    sources: Object.fromEntries(Object.entries(SOURCES).map(([k, p]) =>
      [k, {path: p, bytes: statSync(p).size, sha256: sha(readFileSync(p))}])),
    recordedBlindSha256: report.totals.blindSha256,
    recordedFullSha256: report.totals.fullSha256,
    recomputedBlindSha256: sha(gunzipSync(readFileSync(SOURCES.blind))),
    recomputedFullSha256: sha(gunzipSync(readFileSync(SOURCES.full))),
    unchanged: sha(gunzipSync(readFileSync(SOURCES.blind))) === report.totals.blindSha256
      && sha(gunzipSync(readFileSync(SOURCES.full))) === report.totals.fullSha256
  },
  packages: {
    blind: {folder: 'blind', files: files.filter(f => f.path.startsWith('blind/')).map(f => f.path),
      contains: ['stem', 'stimulus as rendered', 'six options in published order', 'itemId, template, family, declared difficulty'],
      excludes: ['answer keys', 'explanations', 'derivations', 'misconception ids', 'difficulty evidence',
        'fingerprints', 'reasoning signatures', 'source code', 'telemetry findings', 'RC2.1 reports',
        'prior holdout results', 'generator internals']},
    reveal: {folder: 'reveal', files: files.filter(f => f.path.startsWith('reveal/')).map(f => f.path)},
    postReveal: {folder: 'post-reveal', files: files.filter(f => f.path.startsWith('post-reveal/')).map(f => f.path)}
  },
  rendering: {chromium: CHROME, pdfs},
  leakCheck: {passed: leaks.length === 0, findings: leaks},
  files
};
writeFileSync(join(OUT, 'MANIFEST.json'), JSON.stringify(manifest, null, 2) + '\n');
manifest.files.push({path: 'MANIFEST.json', bytes: statSync(join(OUT, 'MANIFEST.json')).size,
  sha256: sha(readFileSync(join(OUT, 'MANIFEST.json')))});

console.log(JSON.stringify({
  out: OUT, questions: blind.length,
  sourcesUnchanged: manifest.integrity.unchanged,
  leakCheck: manifest.leakCheck,
  pdfs: pdfs.map(p => ({name: p.name, rendered: p.rendered, bytes: p.bytes})),
  fileCount: files.length
}, null, 2));
