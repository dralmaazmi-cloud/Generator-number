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

import {existsSync, readFileSync, readdirSync, statSync} from 'node:fs';
import {execFileSync} from 'node:child_process';

import Engine, {ENGINE_VERSION} from '../../src/index.js';
import {measure as measureDistractors} from './rc21-distractors.mjs';

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

  // RC2.1 re-measures on seeds the RC2 corpus never used, so the gate reads the
  // RC2.1 corpus where one exists and falls back to the RC2 one otherwise.
  const CORPUS = existsSync('rc2/RC21_DEVELOPMENT_CORPUS.json')
    ? 'rc2/RC21_DEVELOPMENT_CORPUS.json' : 'rc2/DEVELOPMENT_CORPUS.json';

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
    const c = read(CORPUS);
    const m = c.mathematics;
    const keys = ['ORACLE_DISAGREEMENT', 'postShuffleKeyMismatch', 'zeroCorrectOption',
      'multipleCorrectOptions', 'correctValueMismatch', 'metaKeyMismatch'];
    const nonZero = keys.filter(k => m[k] !== 0);
    return {pass: nonZero.length === 0, detail: Object.fromEntries(keys.map(k => [k, m[k]]))};
  });

  add('CORPUS_SIZE', '§22 — at least 10,000 questions on development seeds', () => {
    const c = read(CORPUS);
    return {
      pass: c.corpus.published >= 10000 && c.corpus.exhausted === 0,
      detail: {published: c.corpus.published, exhausted: c.corpus.exhausted, templates: c.corpus.templates}
    };
  });

  add('HOLDOUT_UNTOUCHED', '§22 — the holdout seed appears nowhere in development evidence', () => {
    const c = read(CORPUS);
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
    const c = read(CORPUS);
    return {
      pass: a.totals.unjustified === 0 && c.distractors.unattributedAnswerDerived === 0,
      detail: {auditStrata: a.totals.byStratum, corpusUnattributed: c.distractors.unattributedAnswerDerived}
    };
  });

  add('FEEDBACK_TRUTHFUL', 'RC2-014 — no wrong option makes a false arithmetic claim', () => {
    const f = read('rc2/RC2_014_FEEDBACK_METRICS.json');
    const c = read(CORPUS);
    return {
      pass: f.metrics.M1_derivationTruthfulness.mismatches === 0 && c.feedback.derivationMismatches === 0,
      detail: {M1: f.metrics.M1_derivationTruthfulness.value, corpusMismatches: c.feedback.derivationMismatches}
    };
  });

  add('LANGUAGE_CLEAN', 'RC2-002/016/017 — no invalid or unclassified Arabic construction is published', () => {
    const c = read(CORPUS);
    return {
      pass: c.language.invalid === 0 && c.language.unclassified === 0,
      detail: c.language
    };
  });

  add('AMBIGUITY_CLEAN', 'RC2-007/008/009 — nothing ambiguous or undiscoverable is published', () => {
    const c = read(CORPUS);
    return {
      pass: c.ambiguity.publishedAmbiguous === 0 && c.ambiguity.publishedUndiscoverable === 0,
      detail: c.ambiguity
    };
  });

  add('TELEMETRY_RECONCILES', 'RC2-003 — every proposal is accounted for exactly once', () => {
    const c = read(CORPUS);
    return {pass: c.rejectionTelemetry.reconciliation.balanced === true, detail: c.rejectionTelemetry.reconciliation};
  });

  add('EVIDENCE_PRESENT', 'Every evidence artifact the matrix names exists and parses', () => {
    const m = read('rc2/COVERAGE_MATRIX.json');
    const named = [...new Set(m.items.flatMap(i => i.evidenceArtifacts ?? []))];
    const missing = named.filter(a => !existsSync(a));
    for (const a of named.filter(a => existsSync(a))) read(a);
    return {pass: missing.length === 0 && named.length >= 6, detail: {named, missing}};
  });

  // --- RC2.1 conditions ------------------------------------------------------

  add('SESSION_TELEMETRY_RECONCILES', 'RC2.1-1 — every published candidate a session sees is delivered or dispositioned', () => {
    const e = new Engine();
    e.resetTelemetry();
    let delivered = 0;
    for (let i = 1; i <= 5; i++) {
      delivered += e.generatePractice({
        count: 50, difficulty: i === 5 ? 'hard' : 'mixed', family: 'random', seed: `GATE-SESS-${i}`
      }).questions.length;
    }
    const t = e.getTelemetry();
    const r = t.sessionReconciliation;
    const anonymous = r.sessionDiscards - ['DUPLICATE_FINGERPRINT', 'REPEATED_REASONING_PATTERN',
      'SESSION_RECENT_MEMORY', 'SESSION_TEMPLATE_CAP', 'SESSION_WINDOW_CAP', 'SESSION_BATCH_DUPLICATE']
      .reduce((a, k) => a + (t.byReason[k] ?? 0), 0);
    return {
      pass: r.balanced && r.difference === 0 && r.delivered === delivered && anonymous === 0,
      detail: {...r, anonymousDiscards: anonymous}
    };
  });

  add('SESSION_PATH_EXERCISED', 'RC2.1 — generatePractice is exercised, not only generateQuestion', () => {
    const e = new Engine();
    let questions = 0, exhausted = 0;
    for (let i = 0; i < 12; i++) {
      try {
        questions += e.generatePractice({count: 50, difficulty: i % 4 === 3 ? 'hard' : 'mixed',
          family: 'random', seed: `GATE-PATH-${i}`}).questions.length;
      } catch { exhausted++; }
    }
    return {pass: questions === 600 && exhausted === 0, detail: {questions, exhausted}};
  });

  add('NO_CROSS_SESSION_DUPLICATES', 'RC2.1-5 — one multi-session batch repeats no mathematical instance', () => {
    const e = new Engine();
    const plan = [{count: 50, difficulty: 'mixed'}, {count: 50, difficulty: 'mixed'},
      {count: 50, difficulty: 'mixed'}, {count: 50, difficulty: 'mixed'}, {count: 50, difficulty: 'hard'}];
    const offenders = [];
    for (const seed of ['GATE-BATCH-A', 'GATE-BATCH-B']) {
      const b = e.generateMockBatch({seed, sessions: plan});
      const fps = b.sessions.flatMap(s => s.questions.map(q => q.metadata.semantic_fingerprint));
      if (new Set(fps).size !== fps.length) offenders.push({seed, repeats: fps.length - new Set(fps).size});
    }
    return {pass: offenders.length === 0, detail: offenders};
  });

  add('DIFFICULTY_CALIBRATED', 'RC2.1-2 — declared/computed agreement improved on the RC2 baseline', () => {
    const c = read(CORPUS);
    const agreement = c.difficulty.agreement;
    return {pass: agreement > 0.70, detail: {agreement, rc2Baseline: 0.6495}};
  });

  add('DECLARED_BOUNDS_RESPECTED', 'RC2.1-3 — a template that declares answer bounds never ships an option outside them', () => {
    const r = measureDistractors({questions: 3000, seedTag: 'GATE-BOUNDS'});
    return {pass: r.outOfDeclaredBounds.count === 0, detail: r.outOfDeclaredBounds};
  });

  add('REPRODUCIBLE', 'RC2.1 — the same seed replays identically through both APIs', () => {
    const q1 = new Engine().generateQuestion({family: 'random', difficulty: 'medium', seed: 'GATE-REPRO'});
    const q2 = new Engine().generateQuestion({family: 'random', difficulty: 'medium', seed: 'GATE-REPRO'});
    const flat = b => b.sessions.flatMap(s => s.questions.map(q => `${q.generator_id}|${q.correct_value}`));
    const plan = [{count: 25, difficulty: 'mixed'}, {count: 25, difficulty: 'hard'}];
    const b1 = flat(new Engine().generateMockBatch({seed: 'GATE-REPRO-B', sessions: plan}));
    const b2 = flat(new Engine().generateMockBatch({seed: 'GATE-REPRO-B', sessions: plan}));
    const same = q1.question === q2.question && q1.correct_value === q2.correct_value
      && JSON.stringify(b1) === JSON.stringify(b2);
    return {pass: same, detail: {singleQuestion: q1.question === q2.question, batch: JSON.stringify(b1) === JSON.stringify(b2)}};
  });

  add('HOLDOUT_C_UNTOUCHED', 'RC2.1 — the sign-off holdout seed appears in no development evidence', () => {
    const offenders = [];
    for (const f of readdirSync('rc2')) {
      if (f.startsWith('HOLDOUT_C') || f.startsWith('holdout-c')) continue;
      const p = `rc2/${f}`;
      if (!statSync(p).isFile()) continue;
      let text;
      try { text = readFileSync(p, 'utf8'); } catch { continue; }
      if (text.includes('AUDIT-2026-09-12-C') && !f.includes('GATE') && !f.includes('FREEZE')) {
        offenders.push(f);
      }
    }
    return {pass: offenders.length === 0, detail: {offenders}};
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
