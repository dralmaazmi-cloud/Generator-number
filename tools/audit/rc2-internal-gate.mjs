// RC2 §23 — the internal gate.
//
// The holdout is not generated until every condition below holds. The gate is a
// program rather than a checklist so that "it passed" is a thing that can be
// false: each condition reads the repository or re-runs the measurement, and any
// one of them failing fails the gate.
//
// The scope's instruction is explicit — do not inspect or generate the holdout
// while the candidate is still moving — so the gate also refuses to report PASS
// if the working tree is dirty or if the holdout seed appears anywhere in the
// development evidence.

import {readFileSync, existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';

import {ENGINE_VERSION} from '../../src/index.js';

export const HOLDOUT_SEED = 'AUDIT-2026-09-12-B';

const read = p => JSON.parse(readFileSync(p, 'utf8'));
const git = args => {
  try { return execFileSync('git', args, {encoding: 'utf8'}).trim(); } catch { return null; }
};

/** Each condition returns {pass, detail}. None of them may be skipped. */
function conditions() {
  const out = [];
  const add = (id, requirement, fn) => {
    let result;
    try { result = fn(); } catch (err) { result = {pass: false, detail: `threw: ${String(err.message || err)}`}; }
    out.push({id, requirement, ...result});
  };

  add('SCOPE_COMPLETE', 'All 23 frozen scope items at a terminal status, none forbidden, none PLANNED', () => {
    const m = read('rc2/COVERAGE_MATRIX.json');
    const terminal = new Set(m.terminalStatuses);
    const forbidden = new Set(m.forbiddenStatuses);
    const bad = m.items.filter(i => !terminal.has(i.status) || forbidden.has(i.status));
    return {
      pass: m.items.length === 23 && bad.length === 0 && m.problems.length === 0,
      detail: {items: m.items.length, byStatus: m.totals.byStatus, notTerminal: bad.map(i => i.id), problems: m.problems}
    };
  });

  add('EVERY_ITEM_PROVED', 'Every scope item is proved by tests that exist in the suite', () => {
    const m = read('rc2/COVERAGE_MATRIX.json');
    const without = m.items.filter(i => !i.automatedProofCount);
    return {
      pass: without.length === 0,
      detail: {totalProofs: m.totals.totalAutomatedProofs, withoutProof: without.map(i => i.id)}
    };
  });

  add('SUITE_GREEN', 'The whole test suite passes', () => {
    let output;
    try { output = execFileSync('npm', ['test'], {encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 900000}); }
    catch (err) { output = `${err.stdout ?? ''}${err.stderr ?? ''}`; }
    const pass = /^# pass (\d+)$/m.exec(output);
    const fail = /^# fail (\d+)$/m.exec(output);
    return {
      pass: !!pass && !!fail && Number(fail[1]) === 0,
      detail: {passed: pass ? Number(pass[1]) : null, failed: fail ? Number(fail[1]) : null}
    };
  });

  add('STRESS_GREEN', 'The stress suite passes', () => {
    let output;
    try { output = execFileSync('npm', ['run', 'test:stress'], {encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 900000}); }
    catch (err) { output = `${err.stdout ?? ''}${err.stderr ?? ''}`; }
    return {pass: /\bPASS:/.test(output), detail: (output.match(/PASS:.*/) ?? ['no PASS line'])[0]};
  });

  add('RC1_GAINS_PRESERVED', '§20 — every RC1 gain still reads zero on the development corpus', () => {
    const c = read('rc2/DEVELOPMENT_CORPUS.json');
    const m = c.mathematics;
    const keys = ['ORACLE_DISAGREEMENT', 'postShuffleKeyMismatch', 'zeroCorrectOption',
      'multipleCorrectOptions', 'correctValueMismatch', 'metaKeyMismatch'];
    const nonZero = keys.filter(k => m[k] !== 0);
    return {pass: nonZero.length === 0, detail: Object.fromEntries(keys.map(k => [k, m[k]]))};
  });

  add('CORPUS_SIZE', '§22 — at least 10,000 questions on development seeds', () => {
    const c = read('rc2/DEVELOPMENT_CORPUS.json');
    return {
      pass: c.corpus.published >= 10000 && c.corpus.exhausted === 0,
      detail: {published: c.corpus.published, exhausted: c.corpus.exhausted, templates: c.corpus.templates}
    };
  });

  add('HOLDOUT_UNTOUCHED', '§22 — the holdout seed appears nowhere in development evidence', () => {
    const c = read('rc2/DEVELOPMENT_CORPUS.json');
    const offenders = [];
    if (c.holdoutSeedUsed) offenders.push('DEVELOPMENT_CORPUS.json declares the holdout used');
    for (const s of c.seeds) if (String(s).includes(HOLDOUT_SEED)) offenders.push(`seed ${s}`);
    // Any evidence artifact naming the holdout as a seed it generated from.
    const grep = git(['grep', '-l', HOLDOUT_SEED, '--', 'rc2/']);
    const files = grep ? grep.split('\n').filter(Boolean) : [];
    for (const f of files) {
      const body = readFileSync(f, 'utf8');
      // Naming it as the seed NOT to use is the point; generating from it is not.
      if (/"seeds"\s*:\s*\[[^\]]*AUDIT-2026-09-12-B/.test(body)) offenders.push(`${f} generated from it`);
    }
    return {pass: offenders.length === 0, detail: {offenders, filesMentioningIt: files}};
  });

  add('NO_ANSWER_TARGETING', 'OBSERVE_NEVER_TARGET — no generation path consults a statistical property of answers', () => {
    const a = read('rc2/RC2_011_ANSWER_SPACE.json');
    return {pass: a.constraint.staticScanOffenders.length === 0, detail: a.constraint.staticScanOffenders};
  });

  add('NO_UNJUSTIFIED_DISTRACTORS', 'RC2-012 — no surviving answer-relative option is unjustified', () => {
    const a = read('rc2/RC2_012_SURVIVOR_AUDIT.json');
    const c = read('rc2/DEVELOPMENT_CORPUS.json');
    return {
      pass: a.totals.unjustified === 0 && c.distractors.unattributedAnswerDerived === 0,
      detail: {auditStrata: a.totals.byStratum, corpusUnattributed: c.distractors.unattributedAnswerDerived}
    };
  });

  add('FEEDBACK_TRUTHFUL', 'RC2-014 — no wrong option makes a false arithmetic claim', () => {
    const f = read('rc2/RC2_014_FEEDBACK_METRICS.json');
    const c = read('rc2/DEVELOPMENT_CORPUS.json');
    return {
      pass: f.metrics.M1_derivationTruthfulness.mismatches === 0 && c.feedback.derivationMismatches === 0,
      detail: {M1: f.metrics.M1_derivationTruthfulness.value, corpusMismatches: c.feedback.derivationMismatches}
    };
  });

  add('LANGUAGE_CLEAN', 'RC2-002/016/017 — no invalid or unclassified Arabic construction is published', () => {
    const c = read('rc2/DEVELOPMENT_CORPUS.json');
    return {
      pass: c.language.invalid === 0 && c.language.unclassified === 0,
      detail: c.language
    };
  });

  add('AMBIGUITY_CLEAN', 'RC2-007/008/009 — nothing ambiguous or undiscoverable is published', () => {
    const c = read('rc2/DEVELOPMENT_CORPUS.json');
    return {
      pass: c.ambiguity.publishedAmbiguous === 0 && c.ambiguity.publishedUndiscoverable === 0,
      detail: c.ambiguity
    };
  });

  add('TELEMETRY_RECONCILES', 'RC2-003 — every proposal is accounted for exactly once', () => {
    const c = read('rc2/DEVELOPMENT_CORPUS.json');
    return {pass: c.rejectionTelemetry.reconciliation.balanced === true, detail: c.rejectionTelemetry.reconciliation};
  });

  add('EVIDENCE_PRESENT', 'Every evidence artifact the matrix names exists and parses', () => {
    const m = read('rc2/COVERAGE_MATRIX.json');
    const named = [...new Set(m.items.flatMap(i => i.evidenceArtifacts ?? []))];
    const missing = named.filter(a => !existsSync(a));
    for (const a of named.filter(a => existsSync(a))) read(a);
    return {pass: missing.length === 0 && named.length >= 6, detail: {named, missing}};
  });

  add('TREE_CLEAN', '§23 — the candidate is not still moving', () => {
    const status = git(['status', '--porcelain']);
    return {pass: status === '', detail: status === '' ? 'clean' : status.split('\n').slice(0, 10)};
  });

  return out;
}

export function run() {
  const checks = conditions();
  const failed = checks.filter(c => !c.pass);
  return {
    schema: 'rc2-internal-gate-v1',
    section: '§23',
    evaluatedAt: new Date().toISOString(),
    engineVersion: ENGINE_VERSION,
    headCommit: git(['rev-parse', 'HEAD']),
    branch: git(['rev-parse', '--abbrev-ref', 'HEAD']),
    holdoutSeed: HOLDOUT_SEED,
    verdict: failed.length === 0 ? 'PASS' : 'FAIL',
    conditions: checks.length,
    failedConditions: failed.map(c => c.id),
    checks
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const {writeFileSync, mkdirSync} = await import('node:fs');
  const result = run();
  mkdirSync('rc2', {recursive: true});
  writeFileSync('rc2/INTERNAL_GATE.json', JSON.stringify(result, null, 2) + '\n');
  for (const c of result.checks) {
    console.log(`${c.pass ? 'PASS' : 'FAIL'}  ${c.id.padEnd(26)} ${c.requirement}`);
    if (!c.pass) console.log('       ', JSON.stringify(c.detail).slice(0, 300));
  }
  console.log(`\n§23 internal gate: ${result.verdict} (${result.conditions} conditions, ${result.failedConditions.length} failed)`);
  if (result.verdict !== 'PASS') process.exitCode = 1;
}
