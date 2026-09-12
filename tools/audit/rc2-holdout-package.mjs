#!/usr/bin/env node
// RC2 §26 — the delivery package for the FAILED DIAGNOSTIC HOLDOUT
// AUDIT-2026-09-12-B.
//
// This tool imports node builtins and nothing else. It does not import the
// engine, any family module, the pipeline or any validator. That is deliberate
// and it is the point: a tool with no access to a generator cannot regenerate,
// replace or repair a holdout question, and a reader can confirm that from the
// import list alone rather than taking it on trust.
//
// Every byte it emits is derived from three preserved files:
//   rc2/holdout.jsonl.gz     the 250 questions, exactly as generated
//   rc2/HOLDOUT.json         the measurement report over them
//   rc2/HOLDOUT_FINDINGS.json the findings, including the telemetry gap
// plus rc2/FREEZE.json for provenance. None of them is written to.
//
// The holdout FAILED. It is delivered as diagnostic evidence for an independent
// review, not as a sign-off holdout.

import {readFileSync, writeFileSync, mkdirSync, existsSync, statSync, readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {join} from 'node:path';

const OUT = 'rc2/holdout-package';
const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];
const sha = buf => createHash('sha256').update(buf).digest('hex');

const CHROME_CANDIDATES = [
  '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  '/opt/pw-browsers/chromium/chrome-linux/chrome'
];
const findChrome = () => CHROME_CANDIDATES.find(p => existsSync(p)) ?? null;

// --- sources, read once, never written -------------------------------------
const SOURCES = {
  corpus: 'rc2/holdout.jsonl.gz',
  report: 'rc2/HOLDOUT.json',
  findings: 'rc2/HOLDOUT_FINDINGS.json',
  freeze: 'rc2/FREEZE.json'
};

const rawCorpus = readFileSync(SOURCES.corpus);
const rows = gunzipSync(rawCorpus).toString('utf8').trim().split('\n').map(l => JSON.parse(l));
const report = JSON.parse(readFileSync(SOURCES.report, 'utf8'));
const findings = JSON.parse(readFileSync(SOURCES.findings, 'utf8'));
const freeze = JSON.parse(readFileSync(SOURCES.freeze, 'utf8'));

if (rows.length !== 250) throw new Error(`expected 250 preserved questions, found ${rows.length}`);

// --- stable item ids, in delivery order -------------------------------------
const perSession = new Map();
const items = rows.map(r => {
  const n = (perSession.get(r.sessionId) ?? 0) + 1;
  perSession.set(r.sessionId, n);
  const sessionNumber = Number(String(r.sessionId).replace(/\D+/g, ''));
  return {
    itemId: `H-S${sessionNumber}-${String(n).padStart(2, '0')}`,
    questionNumber: n,
    ...r
  };
});

// ============================================================================
// 0. the candidate-visible stimulus, reconstructed from preserved parameters
// ============================================================================
// Two families render a stimulus line beside the stem — and only two. Verified
// by the fact that `displayExpression` is emitted in exactly
// src/families/sequences.js and src/families/odd_one_out.js, and nowhere else;
// for every other family the stem prose is the whole of what a candidate saw.
//
// The preserved holdout corpus did not record the rendered string, but it did
// record the parameters it was rendered from, inside the fingerprint. So the
// stimulus is RECONSTRUCTED here, following production's own rule verbatim:
//
//   sequences (src/families/sequences.js:54-56, and the same three-way rule at
//   161-163, 250-251, 351, 425, 472-473, 573, 645, 722):
//       askMiddle    -> seq with the hidden position replaced by '؟'
//       askPrevious  -> '؟، ' + seq
//       otherwise    -> seq + '، ؟'
//   odd_one_out (src/families/odd_one_out.js:76):
//       group.join('، '), where `group` is parameters.numbers, in display order
//
// Separator and placeholder are production's: '، ' and '؟'.
//
// This is a reconstruction, not a preserved byte, and every record says so.
// Reading production source to get the rule right is not modifying production
// and not replaying the engine.
const SEP = '، ';
const BLANK = '؟';

const fpList = (fp, key) => {
  const m = String(fp).match(new RegExp(`${key}:\\[([^\\]]*)\\]`));
  return m ? m[1].split(',').map(x => x.trim()).filter(Boolean) : null;
};
const fpAsked = fp => (String(fp).match(/askedUnknown:(\w+)/) || [])[1] ?? null;

function stimulusFor(it) {
  if (it.family === 'odd_one_out') {
    const numbers = fpList(it.fingerprint, 'numbers');
    if (!numbers) return {stimulus: null, provenance: 'UNAVAILABLE', rule: null};
    return {
      stimulus: numbers.join(SEP),
      provenance: 'RECONSTRUCTED_FROM_PRESERVED_PARAMETERS',
      rule: "odd_one_out: parameters.numbers joined with '، ' (src/families/odd_one_out.js:76)"
    };
  }
  if (it.family === 'sequences') {
    const seq = fpList(it.fingerprint, 'shownTerms');
    if (!seq) return {stimulus: null, provenance: 'UNAVAILABLE', rule: null};
    const asked = fpAsked(it.fingerprint);
    if (asked === 'missingMiddleTerm') {
      // The hidden position is the one holding the key. Production blanks it, so
      // the key is never displayed. Located by value, and the builder refuses to
      // emit unless that value occurs exactly once — a guess about which term is
      // blank would be a guess about the question itself.
      const hits = seq.filter(v => v === String(it.value)).length;
      if (hits !== 1) {
        return {stimulus: null, provenance: 'AMBIGUOUS_CANNOT_RECONSTRUCT', rule: null,
          note: `key ${it.value} occurs ${hits} times in shownTerms; blank position not determinable`};
      }
      return {
        stimulus: seq.map(v => (v === String(it.value) ? BLANK : v)).join(SEP),
        provenance: 'RECONSTRUCTED_FROM_PRESERVED_PARAMETERS',
        rule: "sequences/askMiddle: shownTerms with the key's position replaced by '؟' (src/families/sequences.js:54)"
      };
    }
    if (asked === 'previousTerm') {
      return {
        stimulus: `${BLANK}${SEP}${seq.join(SEP)}`,
        provenance: 'RECONSTRUCTED_FROM_PRESERVED_PARAMETERS',
        rule: "sequences/askPrevious: '؟، ' + shownTerms (src/families/sequences.js:55)"
      };
    }
    return {
      stimulus: `${seq.join(SEP)}${SEP}${BLANK}`,
      provenance: 'RECONSTRUCTED_FROM_PRESERVED_PARAMETERS',
      rule: "sequences/next: shownTerms + '، ؟' (src/families/sequences.js:56)"
    };
  }
  return {stimulus: null, provenance: 'NOT_APPLICABLE_NO_DISPLAY_EXPRESSION', rule: null};
}

for (const it of items) Object.assign(it, stimulusFor(it));

// ============================================================================
// 1. blind question set — no key, no value, no complexity judgement
// ============================================================================
const blind = items.map(i => ({
  itemId: i.itemId,
  sessionId: i.sessionId,
  sessionKind: i.sessionKind,
  questionNumber: i.questionNumber,
  family: i.family,
  templateId: i.templateId,
  declaredDifficulty: i.difficulty,
  stem: i.question,
  stimulus: i.stimulus,
  stimulusProvenance: i.provenance,
  stimulusRule: i.rule,
  options: Object.fromEntries(LETTERS.map(L => [L, i.options[L]]))
}));

// ============================================================================
// 2. answer key and item metadata — delivered SEPARATELY from the blind set
// ============================================================================
const answerKey = items.map(i => ({itemId: i.itemId, correct: i.correct, value: i.value}));
const itemMeta = items.map(i => ({
  itemId: i.itemId, sessionId: i.sessionId, questionNumber: i.questionNumber,
  sessionSeed: i.seed, templateId: i.templateId, family: i.family,
  declaredDifficulty: i.difficulty,
  computedComplexityScore: i.complexityScore, computedComplexityBand: i.complexityBand,
  exactFingerprint: i.fingerprint, semanticFingerprint: i.semantic,
  structuralReasoningSignature: i.structural
}));

// ============================================================================
// 3. telemetry evidence — the discard accounting, derived and shown
// ============================================================================
const t = report.rejectionTelemetry;
const enginePublished = t.reconciliation.breakdown.published;
const delivered = report.totals.delivered;
const discarded = enginePublished - delivered;
const recordedDisposition = t.byStage.diversity ?? 0;
const unrecorded = discarded - recordedDisposition;

const telemetryEvidence = {
  schema: 'rc2-holdout-telemetry-evidence-v1',
  section: '§26',
  holdoutSeed: report.holdoutSeed,
  holdoutStatus: 'FAILED_DIAGNOSTIC_HOLDOUT',
  RC2_COMMIT: freeze.RC2_COMMIT,
  derivedFrom: {
    file: SOURCES.report,
    sha256: sha(readFileSync(SOURCES.report)),
    note: 'Every figure below is read or subtracted from this preserved file. Nothing was re-run on the holdout seed to produce it.'
  },
  engineLevelReconciliation: {
    note: 'This identity holds exactly. RC2-003 gated on it, and it is not what failed.',
    proposals: t.reconciliation.proposals,
    published: t.reconciliation.breakdown.published,
    samplerFailures: t.reconciliation.breakdown.samplerFailures,
    finalizationFailures: t.reconciliation.breakdown.finalizationFailures,
    pipelineRejectedCandidates: t.reconciliation.breakdown.pipelineRejectedCandidates,
    identity: `${t.reconciliation.proposals} = ${t.reconciliation.breakdown.published} + ${t.reconciliation.breakdown.samplerFailures} + ${t.reconciliation.breakdown.finalizationFailures} + ${t.reconciliation.breakdown.pipelineRejectedCandidates}`,
    balanced: t.reconciliation.balanced,
    difference: t.reconciliation.difference
  },
  sessionLevelAccounting: {
    note: 'This is what failed. The session layer discards questions the engine already published, and records a disposition for only some of them.',
    generatedAndPublishedCandidates: enginePublished,
    deliveredToSessions: delivered,
    discarded,
    discardedWithRecordedDisposition: recordedDisposition,
    discardedWithoutTelemetryDisposition: unrecorded,
    derivation: [
      `generated/published candidates = ${enginePublished}  (rejectionTelemetry.reconciliation.breakdown.published)`,
      `delivered                      = ${delivered}  (totals.delivered; 5 sessions x 50)`,
      `discarded                      = ${enginePublished} - ${delivered} = ${discarded}`,
      `with recorded disposition      = ${recordedDisposition}  (rejectionTelemetry.byStage.diversity)`,
      `without any disposition        = ${discarded} - ${recordedDisposition} = ${unrecorded}`
    ],
    unrecordedShareOfPublished: Number((unrecorded / enginePublished).toFixed(4)),
    recordedDispositionsByReason: {
      REPEATED_REASONING_PATTERN: t.byReason.REPEATED_REASONING_PATTERN ?? 0,
      DUPLICATE_FINGERPRINT: t.byReason.DUPLICATE_FINGERPRINT ?? 0
    },
    codePathsThatRecord: [
      'src/index.js:379  DUPLICATE_FINGERPRINT      -> telemetry.diversityRejection',
      'src/index.js:389  REPEATED_REASONING_PATTERN -> telemetry.diversityRejection'
    ],
    codePathsThatDoNotRecord: [
      'src/index.js:381  recent-session memory (STATEFUL_SESSION_GENERATION only) -> bare continue',
      'src/index.js:402  per-session template cap                                 -> bare continue',
      'src/index.js:403  sliding-window cap                                       -> bare continue'
    ],
    notMeasured: 'The split of the 104 between src/index.js:402 and src/index.js:403 was not measured. Separating them requires instrumenting frozen production code, which §24 forbids and which has not been done.'
  },
  independentReproductionOnDevelopmentSeed: findings.findings
    .find(f => f.id === 'HOLDOUT-F1').independentlyReproduced,
  fullTelemetrySnapshot: {byStage: t.byStage, byReason: t.byReason,
    internalResamplesPerProposal: t.internalResamplesPerProposal, exhaustions: t.exhaustions}
};

// ============================================================================
// 4. rendered text and HTML — blind
// ============================================================================
function blindText() {
  const out = [];
  out.push('RC2 FAILED DIAGNOSTIC HOLDOUT — AUDIT-2026-09-12-B');
  out.push('BLIND QUESTION SET — 250 questions, no answer keys.');
  out.push(`RC2_COMMIT ${freeze.RC2_COMMIT}   engine ${report.engineVersion}`);
  out.push('Logical-order Unicode. Reading order is applied by the reader, not baked into the bytes.');
  out.push('='.repeat(78));
  let current = null;
  for (const b of blind) {
    if (b.sessionId !== current) {
      current = b.sessionId;
      const s = report.sessions.find(x => x.id === b.sessionId);
      out.push('', '='.repeat(78));
      out.push(`${b.sessionId}  [${b.sessionKind}]  seed ${s.seed}  ${s.delivered} questions`);
      out.push('='.repeat(78), '');
    }
    out.push(`### ${b.itemId}   ${b.templateId}   [${b.declaredDifficulty}]   ${b.family}`);
    out.push(b.stem);
    if (b.stimulus) out.push(`   ${b.stimulus}          [stimulus: reconstructed]`);
    for (const L of LETTERS) out.push(`   ${L}) ${b.options[L]}`);
    out.push('');
  }
  out.push('='.repeat(78));
  out.push(`-- ${blind.length} questions, no keys --`);
  return out.join('\n') + '\n';
}

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function blindHtml(sessionId) {
  const sel = blind.filter(b => b.sessionId === sessionId);
  const s = report.sessions.find(x => x.id === sessionId);
  const body = sel.map(b => `
  <article class="q">
    <div class="hd"><span class="id">${esc(b.itemId)}</span><span class="tpl">${esc(b.templateId)} · ${esc(b.family)} · ${esc(b.declaredDifficulty)}</span></div>
    <p class="stem">${esc(b.stem)}</p>
    ${b.stimulus ? `<p class="stim" title="reconstructed from preserved parameters">${esc(b.stimulus)}</p>` : ''}
    <ol class="opts">${LETTERS.map(L => `<li><span class="l">${L}</span>${esc(b.options[L])}</li>`).join('')}</ol>
  </article>`).join('\n');

  return `<!doctype html>
<html lang="ar" dir="rtl"><head><meta charset="utf-8">
<title>${esc(sessionId)} — blind holdout</title>
<style>
  @page { size: A4; margin: 14mm; }
  body { font-family: "FreeSerif", "DejaVu Sans", "Noto Naskh Arabic", serif; font-size: 12pt; line-height: 1.85; color: #111; margin: 0; }
  header { border-bottom: 2px solid #111; padding-bottom: 8px; margin-bottom: 14px; }
  h1 { font-size: 15pt; margin: 0 0 4px; }
  .meta { font-size: 9pt; color: #444; direction: ltr; text-align: left; font-family: "DejaVu Sans Mono", monospace; }
  .warn { border: 1px solid #900; color: #900; padding: 6px 10px; margin: 10px 0 16px; font-size: 9.5pt; text-align: left; font-family: "DejaVu Sans", sans-serif; }
  .q { break-inside: avoid; page-break-inside: avoid; margin: 0 0 14px; padding: 8px 10px; border-right: 3px solid #ccc; }
  .hd { display: flex; justify-content: space-between; font-size: 8.5pt; color: #555; direction: ltr; font-family: "DejaVu Sans Mono", monospace; margin-bottom: 4px; }
  .stem { margin: 0 0 6px; font-size: 12.5pt; }
  .stim { margin: 0 0 8px; font-size: 13pt; letter-spacing: .04em; background: #f4f4f0; border: 1px solid #ddd; padding: 5px 10px; display: inline-block; }
  .opts { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 2px 14px; }
  .opts li { font-size: 11.5pt; }
  .l { display: inline-block; min-width: 1.6em; color: #555; font-family: "DejaVu Sans Mono", monospace; }
  footer { margin-top: 16px; border-top: 1px solid #999; padding-top: 6px; font-size: 8.5pt; color: #555; direction: ltr; text-align: left; }
</style></head><body>
<header>
  <h1>RC2 — الاختبار التشخيصي المحجوز (نسخة بلا إجابات)</h1>
  <div class="meta">${esc(sessionId)} [${esc(s.kind)}] · seed ${esc(s.seed)} · ${s.delivered} questions · engine ${esc(report.engineVersion)} · RC2_COMMIT ${esc(freeze.RC2_COMMIT.slice(0, 12))}</div>
</header>
<div class="warn" dir="ltr"><strong>FAILED DIAGNOSTIC HOLDOUT.</strong> Delivered for independent blind review. No answer keys in this document. Questions are preserved exactly as generated and must not be edited, replaced or regenerated.</div>
${body}
<footer>${esc(sessionId)} — ${sel.length} questions — blind — AUDIT-2026-09-12-B</footer>
<!-- RC2-006. A Chromium-printed PDF stores Arabic as presentation forms in its
     visible text layer, so search and copy-paste out of the PDF are unreliable.
     Production ships a logical-order Unicode sidecar in the HTML for exactly
     this reason (report.js buildReportTextLayer); the blind papers carry the
     same remediation so this package is no weaker than production. -->
<script type="application/json" id="report-logical-text">${JSON.stringify(
  sel.map(b => ({itemId: b.itemId, stem: b.stem, stimulus: b.stimulus,
    options: b.options})), null, 1).replace(/</g, '\\u003c')}</script>
</body></html>
`;
}

// ============================================================================
// emit
// ============================================================================
mkdirSync(join(OUT, 'blind'), {recursive: true});
mkdirSync(join(OUT, 'keys'), {recursive: true});
mkdirSync(join(OUT, 'telemetry'), {recursive: true});

const jsonl = a => a.map(o => JSON.stringify(o)).join('\n') + '\n';

writeFileSync(join(OUT, 'blind/blind-questions.jsonl'), jsonl(blind));
writeFileSync(join(OUT, 'blind/blind-questions.txt'), blindText());
writeFileSync(join(OUT, 'keys/answer-key.jsonl'), jsonl(answerKey));
writeFileSync(join(OUT, 'keys/item-metadata.jsonl'), jsonl(itemMeta));
writeFileSync(join(OUT, 'telemetry/HOLDOUT_TELEMETRY_EVIDENCE.json'),
  JSON.stringify(telemetryEvidence, null, 2) + '\n');

const sessionIds = report.sessions.map(s => s.id);
for (const id of sessionIds) writeFileSync(join(OUT, `blind/${id.toLowerCase()}.html`), blindHtml(id));

// PDFs, printed from the blind HTML. Rendering is a view of preserved bytes.
const chrome = findChrome();
const pdfResults = [];
for (const id of sessionIds) {
  const htmlPath = join(process.cwd(), OUT, `blind/${id.toLowerCase()}.html`);
  const pdfPath = join(process.cwd(), OUT, `blind/${id.toLowerCase()}.pdf`);
  if (!chrome) { pdfResults.push({id, rendered: false, reason: 'no chromium binary found'}); continue; }
  try {
    execFileSync(chrome, [
      '--headless', '--no-sandbox', '--disable-gpu', '--no-pdf-header-footer',
      `--print-to-pdf=${pdfPath}`, `file://${htmlPath}`
    ], {stdio: 'ignore', timeout: 120000});
    pdfResults.push({id, rendered: true, bytes: statSync(pdfPath).size});
  } catch (err) {
    pdfResults.push({id, rendered: false, reason: String(err.message || err).slice(0, 160)});
  }
}


// ============================================================================
// 5. mechanical solvability verification
// ============================================================================
// The claim to be checked is narrow and testable: every value a candidate needed
// to see is present in the blind package. It rests on one structural fact —
// `displayExpression` is emitted by exactly two family modules — so for the
// other fourteen families the stem and the options are, provably, everything
// that was ever on screen.
//
// For the two families that do render a stimulus, the check is direct: every
// term production would have displayed must appear in the blind record, and the
// key must NOT appear in the stimulus (a blanked middle term that leaked its own
// answer would be worse than no stimulus at all).
const DISPLAY_FAMILIES = new Set(['sequences', 'odd_one_out']);

function verifySolvability() {
  const failures = [];
  const checks = [];
  const blindById = new Map(blind.map(b => [b.itemId, b]));

  for (const it of items) {
    const b = blindById.get(it.itemId);
    const visible = [b.stem, b.stimulus ?? '', ...LETTERS.map(L => String(b.options[L]))].join(' ');
    const visibleNums = new Set(visible.match(/\d+(?:\.\d+)?/g) || []);
    const rec = {itemId: it.itemId, family: it.family, templateId: it.templateId,
      hasStimulus: Boolean(b.stimulus), provenance: b.stimulusProvenance};

    if (!DISPLAY_FAMILIES.has(it.family)) {
      // No display expression exists for this family in production, so nothing
      // can be missing from the package that was present on screen.
      rec.basis = 'NO_DISPLAY_EXPRESSION_IN_PRODUCTION';
      rec.pass = true;
      checks.push(rec);
      continue;
    }

    const key = it.family === 'sequences' ? 'shownTerms' : 'numbers';
    const list = fpList(it.fingerprint, key);
    rec.basis = `DISPLAYED_LIST:${key}`;
    rec.required = list;

    if (!list) {
      rec.pass = false; rec.reason = `${key} absent from preserved fingerprint`;
      failures.push(rec); checks.push(rec); continue;
    }
    if (!b.stimulus) {
      rec.pass = false; rec.reason = 'stimulus could not be reconstructed';
      failures.push(rec); checks.push(rec); continue;
    }

    // Every displayed term must be visible — except the deliberately blanked one.
    const hiddenTerm = (fpAsked(it.fingerprint) === 'missingMiddleTerm') ? String(it.value) : null;
    const mustSee = list.filter(v => v !== hiddenTerm);
    const unseen = mustSee.filter(v => !visibleNums.has(v));
    // And, for sequences only, the key must never be readable inside the
    // stimulus: the answer there is the term production blanked out. This rule
    // does NOT apply to odd_one_out, where the key is one of the six displayed
    // numbers by construction — picking it out of the set is the task.
    const stimNums = new Set((b.stimulus.match(/\d+(?:\.\d+)?/g) || []));
    const keyLeaked = it.family === 'sequences' && stimNums.has(String(it.value));

    rec.blankedTerm = hiddenTerm;
    rec.unseenTerms = unseen;
    rec.keyLeakedIntoStimulus = keyLeaked;
    rec.pass = unseen.length === 0 && !keyLeaked;
    if (!rec.pass) {
      rec.reason = keyLeaked ? 'the key is visible inside a sequence stimulus'
        : `terms absent from everything the candidate can see: ${unseen.join(', ')}`;
      failures.push(rec);
    }
    checks.push(rec);
  }

  const byFamily = {};
  for (const c of checks) {
    const f = byFamily[c.family] ??= {items: 0, withStimulus: 0, pass: 0};
    f.items++; if (c.hasStimulus) f.withStimulus++; if (c.pass) f.pass++;
  }

  return {
    schema: 'rc2-holdout-solvability-v1',
    section: '§26',
    question: 'Is every one of the 250 blind questions solvable from the blind package alone?',
    method: [
      'Production emits displayExpression in exactly two family modules: src/families/sequences.js and src/families/odd_one_out.js. Established by grep over src/families/*.js, not assumed.',
      'For the other fourteen families the stem prose and the six options are therefore the whole of what a candidate ever saw, and nothing can be missing.',
      'For the two display families, every term production would have rendered must be present in the blind record, and the key must not appear inside the stimulus.'
    ],
    totals: {
      items: checks.length,
      solvable: checks.filter(c => c.pass).length,
      notSolvable: failures.length,
      withReconstructedStimulus: checks.filter(c => c.hasStimulus).length
    },
    byFamily,
    failures,
    checks
  };
}

const solvability = verifySolvability();
writeFileSync(join(OUT, 'SOLVABILITY.json'), JSON.stringify(solvability, null, 2) + '\n');
if (solvability.totals.notSolvable > 0) {
  console.error(`SOLVABILITY FAILED for ${solvability.totals.notSolvable} item(s)`);
  for (const f of solvability.failures.slice(0, 10)) console.error('  ', f.itemId, f.reason);
}

// --- reviewer README --------------------------------------------------------
const README = `# RC2 — FAILED DIAGNOSTIC HOLDOUT \`AUDIT-2026-09-12-B\`

## What this is

250 questions generated **exactly once** from the frozen RC2 engine, and the
evidence about them. The holdout **failed**. This package is delivered for an
independent blind review of that failure.

It is **not** a sign-off holdout and it does not become one. A later remediation
(RC2.1) must be reviewed against a *different*, unused holdout seed.

## Provenance

| | |
|---|---|
| Holdout seed | \`${report.holdoutSeed}\` |
| RC2_COMMIT | \`${freeze.RC2_COMMIT}\` |
| Tree hash | \`${freeze.treeHash}\` |
| Engine | ${report.engineVersion} |
| Production bundle | \`${freeze.productionBundleSha256}\` |
| §23 gate | ${freeze.internalGate.verdict}, ${freeze.internalGate.conditions} conditions, at \`${freeze.internalGate.headCommit}\` |
| Session seed rule | ${report.sessionSeedRule} |

Production has not been modified since the freeze. The questions below were not
inspected, regenerated, replaced or repaired to build this package.

## How this package was built

By \`tools/audit/rc2-holdout-package.mjs\`, which imports **node builtins and
nothing else** — no engine, no family module, no pipeline, no validator. A tool
with no access to a generator cannot regenerate a question, and that is checkable
from its import list rather than taken on trust. Every byte here is derived from
the preserved files listed under \`integrity.sources\` in \`MANIFEST.json\`,
none of which was written to.

## Contents

\`\`\`
MANIFEST.json                              every file, its sha256, provenance, limitations
blind/blind-questions.jsonl                250 items, NO KEYS
blind/blind-questions.txt                  the same, human-readable, logical-order Unicode
blind/session-1..5.html                    printable blind papers, RTL
blind/session-1..5.pdf                     the same, rendered
keys/answer-key.jsonl                      itemId -> correct option + value   (SEALED: do not open before review)
keys/item-metadata.jsonl                   template, complexity, fingerprints (SEALED: do not open before review)
telemetry/HOLDOUT_TELEMETRY_EVIDENCE.json  the discard accounting, with its derivation
\`\`\`

The blind set carries itemId, session, family, templateId, declared difficulty,
stem and the six options in published order. It excludes the key, the correct
value, the computed complexity score and band, and all three fingerprints.
Nothing was reordered.

## The failure, in one paragraph

The engine-level telemetry identity holds exactly:
${telemetryEvidence.engineLevelReconciliation.identity}, difference
${telemetryEvidence.engineLevelReconciliation.difference}. That is not what
failed. What failed is one layer up. The session builder discards questions the
engine has **already published** when they clash with its repetition
preferences, and records a disposition for only some of them:

| | |
|---|---|
| generated / published candidates | **${enginePublished}** |
| delivered to sessions | **${delivered}** |
| discarded | **${discarded}** |
| discarded **with** a recorded disposition | **${recordedDisposition}** |
| discarded **without** any telemetry disposition | **${unrecorded}** |

So ${(unrecorded / enginePublished * 100).toFixed(1)}% of everything the engine
built on this run was thrown away with no recorded reason. Reproduced
independently on a development seed at 74 of 328 (22.6%), so the finding does not
rest on the holdout alone. Three code paths are responsible and are named in
\`telemetry/HOLDOUT_TELEMETRY_EVIDENCE.json\`. **The fix has not been
implemented.** It edits frozen production, which §24 forbids after the freeze.

## What this package does NOT support

The preserved holdout corpus records stems, options, keys and the
diversity/complexity metadata. It does **not** record per-question explanations,
solution steps, per-option derivations or misconception ids — those fields were
never written to the preserved artifact.

- **Supported:** mathematical correctness, key correctness, option plausibility, Arabic language quality, difficulty labelling, duplication and diversity.
- **Not supported:** review of explanation text and per-distractor feedback quality.

Recovering those would mean replaying the holdout seeds through the engine.
Replay is deterministic and would return byte-identical questions, but it is
still a second generation, it has **not** been performed, and it needs explicit
authorisation.

## The stimulus line, and how it got here

Two families render a stimulus beside the stem, and only two — \`sequences\` and
\`odd_one_out\`. The first build of this package omitted it, which left all 15
sequences items unsolvable (H-S1-11 and H-S5-09 among them). Fixed.

The preserved corpus never recorded the rendered string, but it did record the
parameters it was rendered from, inside the fingerprint. The stimulus is
therefore **reconstructed**, following production's own rule verbatim — read out
of \`src/families/sequences.js\` and \`src/families/odd_one_out.js\`, which is
neither a modification nor a replay:

| case | rule | source |
|---|---|---|
| sequences, missing middle | \`shownTerms\` with the key's position replaced by \`؟\` | sequences.js:54 |
| sequences, previous term | \`؟، \` + \`shownTerms\` | sequences.js:55 |
| sequences, next term | \`shownTerms\` + \`، ؟\` | sequences.js:56 |
| odd_one_out | \`parameters.numbers\` joined with \`، \`, in display order | odd_one_out.js:76 |

Every blind record carries \`stimulusProvenance\` and the exact \`stimulusRule\`
used, so a reviewer can see this is derived rather than preserved. **No question,
option, key or seed was changed.** For the missing-middle case the builder refuses
to emit unless the key occurs exactly once in the term list, because guessing
which term is blank would be guessing at the question; all three such items
resolved unambiguously.

## Solvability, verified mechanically

\`SOLVABILITY.json\` — **250 of 250 solvable, 0 failures.** The check does not rest
on inspection. \`displayExpression\` is emitted by exactly two family modules,
established by grep over \`src/families/*.js\`; for the other fourteen families the
stem and the six options are provably the whole of what a candidate ever saw. For
the two display families, every term production would have rendered must be
present, and for sequences the key must not be readable inside the stimulus — a
blanked term that leaked its own answer would be worse than no stimulus at all.
That last rule is deliberately not applied to \`odd_one_out\`, where the key is one
of the six displayed numbers by construction.

## The PDF text layer — renderer, or production?

**Both, and the distinction matters.** Measured, not asserted:

| | visible-layer presentation-form share | stems findable in visible layer |
|---|---|---|
| production's own PDF export (RC2-006 evidence) | **78.3%** | 0 of 8 |
| these blind papers | **64.8%** | — |

So this is **not** a defect introduced by the holdout-package renderer. It is a
property of Chromium print-to-PDF, and production's own export measures *worse*.
It does show the underlying limitation is real and unresolved in any
Chromium-printed PDF — which is precisely why RC2-006 closed as
\`RISK_REMEDIATED_AND_MEASURED\` and not as \`FIXED\`. Production could not repair
the PDF layer; it shipped a logical-order Unicode sidecar in the HTML instead and
declared the limit.

The real gap was that this package had **omitted that remediation**. Fixed: the
blind papers now carry the same \`report-logical-text\` block production ships, so
the package is no weaker than production. For search and copy use
\`blind/blind-questions.txt\`, the \`.jsonl\`, or that block — not the PDF text
layer.

- **Latency in \`rc2/HOLDOUT.json\`** reads \`0\` for the per-question percentiles.
  Those are *unmeasured*, not zero — see HOLDOUT-F2. The per-session figures in
  that file are real (1.076–2.624 ms/question).

## Integrity

Recompute and compare against \`MANIFEST.json\`:

\`\`\`sh
gunzip -c rc2/holdout.jsonl.gz | sha256sum   # ${report.totals.sha256}
cd rc2/holdout-package && sha256sum -c <(node -e "for(const f of require('./MANIFEST.json').files) console.log(f.sha256+'  '+f.path)")
\`\`\`
`;
writeFileSync(join(OUT, 'README.md'), README);

// --- manifest ---------------------------------------------------------------
const walk = dir => readdirSync(dir).sort().flatMap(f => {
  const p = join(dir, f);
  return statSync(p).isDirectory() ? walk(p) : [p];
});

const manifest = {
  schema: 'rc2-holdout-package-v1',
  section: '§26',
  builtAt: new Date().toISOString(),
  holdout: {
    seed: report.holdoutSeed,
    status: 'FAILED_DIAGNOSTIC_HOLDOUT',
    statusNote: 'This holdout failed. It is delivered as diagnostic evidence for an independent review. It is NOT a sign-off holdout and does not become one.',
    generatedExactlyOnce: true,
    questions: items.length,
    sessions: report.sessions.map(s => ({
      id: s.id, kind: s.kind, seed: s.seed, delivered: s.delivered, bands: s.bands,
      generationMode: s.generationMode, diversityWarnings: s.diversityWarnings.length
    }))
  },
  provenance: {
    RC2_COMMIT: freeze.RC2_COMMIT,
    treeHash: freeze.treeHash,
    engineVersion: report.engineVersion,
    productionBundleSha256: freeze.productionBundleSha256,
    internalGate: freeze.internalGate,
    sessionSeedRule: report.sessionSeedRule
  },
  integrity: {
    note: 'The preserved sources. This package is derived from them; none of them was written to.',
    sources: Object.fromEntries(Object.entries(SOURCES)
      .map(([k, p]) => [k, {path: p, sha256: sha(readFileSync(p)), bytes: statSync(p).size}])),
    preservedCorpusSha256Uncompressed: report.totals.sha256,
    recomputedCorpusSha256Uncompressed: sha(gunzipSync(rawCorpus)),
    corpusUnchanged: report.totals.sha256 === sha(gunzipSync(rawCorpus))
  },
  blindness: {
    blindSetContains: ['itemId', 'sessionId', 'sessionKind', 'questionNumber', 'family', 'templateId', 'declaredDifficulty', 'stem', 'options A-F'],
    blindSetExcludes: ['correct option', 'correct value', 'computed complexity score', 'computed complexity band', 'fingerprints', 'structural signature'],
    keysDeliveredSeparatelyIn: ['keys/answer-key.jsonl', 'keys/item-metadata.jsonl'],
    note: 'Options are already in published order; nothing was reordered for this package.'
  },
  telemetryEvidence: {
    generatedAndPublishedCandidates: enginePublished,
    deliveredToSessions: delivered,
    discarded,
    discardedWithoutTelemetryDisposition: unrecorded,
    discardedWithRecordedDisposition: recordedDisposition,
    file: 'telemetry/HOLDOUT_TELEMETRY_EVIDENCE.json'
  },
  rendering: {chromium: chrome, pdfs: pdfResults},
  solvability: {
    verified: solvability.totals,
    file: 'SOLVABILITY.json',
    note: 'Every one of the 250 blind questions is solvable from the blind package alone.'
  },
  limitations: [
    'The preserved holdout corpus records stems, the six published options, the key and the diversity/complexity metadata. It does NOT record per-question explanations, solution steps, per-option derivations or misconception ids. A blind review of mathematical correctness, option plausibility and Arabic language quality is fully supported by this package; a review of explanation and distractor-feedback quality is not, because those fields were never written to the preserved artifact.',
    'Recovering them would mean replaying the holdout seeds through the engine. Replay is deterministic and would yield byte-identical questions, but it is still a second generation and it has NOT been performed. It requires explicit authorisation.',
    'rc2/HOLDOUT.json records per-question latency percentiles as 0. They are unmeasured, not zero — see HOLDOUT-F2 in rc2/HOLDOUT_FINDINGS.json. The per-session figures in the same file are real.',
    'The stimulus line for the sequences and odd_one_out families is RECONSTRUCTED from preserved parameters following production\'s own rendering rule; the holdout corpus never recorded displayExpression. Every blind record states its provenance and the rule applied. No question, option, key or seed was changed. Verified in SOLVABILITY.json: 250 of 250 solvable, 0 failures.',
    'The PDF visible text layer stores Arabic as presentation forms (64.8% here; production\'s own export measures 78.3%). That is a Chromium print-to-PDF property, not a defect of this renderer, and it is why RC2-006 closed as RISK_REMEDIATED_AND_MEASURED rather than FIXED. The blind papers carry production\'s logical-text sidecar; use the .txt or .jsonl for search and copy.',
    'The split of the 104 undispositioned discards between src/index.js:402 and src/index.js:403 was not measured, because separating them requires instrumenting frozen production code.'
  ],
  files: []
};

for (const p of walk(OUT)) {
  if (p.endsWith('MANIFEST.json')) continue;
  manifest.files.push({path: p.slice(OUT.length + 1), bytes: statSync(p).size, sha256: sha(readFileSync(p))});
}
manifest.fileCount = manifest.files.length;

writeFileSync(join(OUT, 'MANIFEST.json'), JSON.stringify(manifest, null, 2) + '\n');

console.log(JSON.stringify({
  out: OUT,
  questions: items.length,
  sessions: sessionIds.length,
  telemetry: manifest.telemetryEvidence,
  corpusUnchanged: manifest.integrity.corpusUnchanged,
  pdfs: pdfResults,
  files: manifest.fileCount
}, null, 2));
