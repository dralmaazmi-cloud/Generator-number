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
import {FAMILY_MAP} from '../../src/registry.js';
import {RC23_SIGNOFF_SEED} from './rc2-development-corpus.mjs';
import {measure as measureDistractors} from './rc21-distractors.mjs';
import {gated as gatedDifficulty, allHard as allHardEvidence, capabilityCheck} from './rc22-difficulty.mjs';
import {build as repetitionBuild} from './rc22-repetition.mjs';
import {
  classification as structuralClassification, coverage as bandCoverage,
  freshSample as freshStructuralSample, holdoutDRegression
} from './rc23-structure.mjs';
import {
  RC23_HARD, newHardTemplates, allHardSessions, newTemplateOptions, coverageTable
} from './rc24-hard-coverage.mjs';
import {isHardCapable, structuralBandOf, TEMPLATE_STRUCTURE, ADJUDICATED_TEMPLATE_IDS, HARD_CRITERIA} from '../../src/qa/structure.js';

export const HOLDOUT_SEED = 'AUDIT-2026-09-12-B';
export {RC23_SIGNOFF_SEED} from './rc2-development-corpus.mjs';

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
  const CORPUS = existsSync('rc2/RC22_DEVELOPMENT_CORPUS.json') ? 'rc2/RC22_DEVELOPMENT_CORPUS.json'
    : existsSync('rc2/RC21_DEVELOPMENT_CORPUS.json') ? 'rc2/RC21_DEVELOPMENT_CORPUS.json'
    : 'rc2/DEVELOPMENT_CORPUS.json';

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
    // RC2.3-5. Read from the telemetry, which counts each session discard by
    // reason where it happens. This used to subtract a hand-written list of
    // reason codes from the total, and the list was missing the two codes added
    // since — so three named discards were reported as anonymous and the gate
    // failed for a reason that was not true.
    return {
      pass: r.balanced && r.difference === 0 && r.delivered === delivered && r.anonymous === 0,
      detail: {...r}
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

  add('SIGNOFF_HOLDOUT_UNTOUCHED', 'the CURRENT sign-off holdout seed appears in no development evidence', () => {
    // RC2.2: B and C are spent — reviewed, and their findings are the diagnosis
    // this release answers, so reports naturally name them. What must stay
    // untouched is the holdout that has NOT been reviewed yet.
    //
    // RC2.3: D is spent too. Its independent audit — 250 correct keys, one
    // ambiguous item, 44 of 82 hard items not hard — is the diagnosis THIS
    // release answers, so RC2.2's report naming it is not a leak. The seed that
    // must stay untouched is the next one, which has not been generated: the
    // brief withholds it until the validation report is approved.
    const CURRENT = RC23_SIGNOFF_SEED;
    const offenders = [];
    for (const f of readdirSync('rc2')) {
      if (f.startsWith('HOLDOUT_D') || f.startsWith('holdout-d')) continue;
      const p = `rc2/${f}`;
      if (!statSync(p).isFile()) continue;
      let text;
      try { text = readFileSync(p, 'utf8'); } catch { continue; }
      if (text.includes(CURRENT) && !f.includes('GATE') && !f.includes('FREEZE')) offenders.push(f);
    }
    return {pass: offenders.length === 0, detail: {offenders}};
  });

  // --- RC2.2 conditions ------------------------------------------------------

  // RC2.2's DIFFICULTY_GATE_HOLDS and ALL_HARD_IS_HARD are replaced rather than
  // relaxed, and the replacements are below. The first checked that the released
  // band equalled the computed one, which RC2.2 had made true by construction and
  // which the Holdout D audit showed says nothing about whether the label is
  // right. The second required eight families in an ALL_HARD session; only five
  // hold a template that demands genuine reasoning depth, and the other three
  // were supplying the routine items the audit rejected — so the number is now
  // measured and reported (HARD_COVERAGE_REPORTED) instead of being met.

  add('FAMILY_CAPABILITY_TRUE', 'RC2.2-1 — the registry says what the engine can actually produce', () => {
    const c = capabilityCheck({attempts: 40});
    return {pass: c.allMatch, detail: c.mismatches};
  });

  add('REASONING_REPETITION_CAPPED', 'RC2.2-4 — no reasoning path exceeds its batch allowance', () => {
    const r = repetitionBuild({seeds: ['GATE-RC22-REP']});
    const b = r.batches[0];
    return {
      pass: b.exact.repeats === 0 && b.semantic.repeats === 0 && b.reasoning.max <= r.caps.perBatch,
      detail: {exactRepeats: b.exact.repeats, semanticRepeats: b.semantic.repeats,
        reasoningPaths: b.reasoning.distinct, maxRepetition: b.reasoning.max, cap: r.caps.perBatch}
    };
  });

  add('DISTRACTOR_DIAGNOSTICS_LINKED', 'RC2.2-5 — wrong options point at the step they diverge at', () => {
    const e = new Engine();
    let wrong = 0, linked = 0, outOfRange = 0;
    for (let i = 0; i < 900; i++) {
      let q;
      try { q = e.generateQuestion({family: 'random', difficulty: ['easy', 'medium', 'hard'][i % 3], seed: `GATE-LINK-${i}`}); }
      catch { continue; }
      const n = q.explanation.steps.length;
      for (const m of Object.values(q.metadata.options_meta)) {
        if (m.correct) continue;
        wrong++;
        const at = m.reasoningStepAffected;
        if (Number.isInteger(at)) { linked++; if (at < 0 || at >= n) outOfRange++; }
      }
    }
    return {pass: outOfRange === 0 && linked / wrong > 0.40,
      detail: {wrong, linked, share: Number((linked / wrong).toFixed(3)), outOfRange}};
  });

  // --- RC2.3 conditions ------------------------------------------------------

  add('STRUCTURE_ADJUDICATION_COMPLETE', 'RC2.3-1 — every template is adjudicated and every adjudication is reachable', () => {
    const c = structuralClassification();
    const orphans = c.templatesNotInAnyFamily;
    // RC2.4 added eighteen HARD templates; the count stays pinned so a silent
    // loss is still caught.
    return {pass: c.total === 125 && orphans.length === 0,
      detail: {templates: c.total, byBand: c.byBand, orphans}};
  });

  add('BAND_IS_STRUCTURAL', 'RC2.3-1 — a question is released at its structural band and no other', () => {
    const e = new Engine();
    let n = 0, wrong = 0;
    for (let i = 0; i < 900; i++) {
      let q;
      try { q = e.generateQuestion({family: 'random', difficulty: ['easy', 'medium', 'hard'][i % 3], seed: `GATE-RC23-BAND-${i}`}); }
      catch { continue; }
      n++;
      if (q.difficulty !== structuralBandOf(q.metadata.template_id)
        || q.metadata.band_source !== 'structural_adjudication') wrong++;
    }
    return {pass: n > 700 && wrong === 0, detail: {checked: n, wrong}};
  });

  add('NO_ROUTINE_ITEM_IS_HARD', 'RC2.3-1 — routine structure alone never reaches hard', () => {
    const offenders = ADJUDICATED_TEMPLATE_IDS.filter(id =>
      TEMPLATE_STRUCTURE[id].band === 'hard' && TEMPLATE_STRUCTURE[id].criteria.length === 0);
    return {pass: offenders.length === 0, detail: offenders};
  });

  add('ALL_HARD_IS_STRUCTURALLY_HARD', 'RC2.3-2 — an ALL_HARD session draws only from HARD_CAPABLE structures', () => {
    const e = new Engine();
    let total = 0, filler = 0, failed = 0;
    const families = new Set(), templates = new Set();
    for (let i = 0; i < 6; i++) {
      let s;
      try { s = e.generatePractice({count: 50, difficulty: 'hard', family: 'random', seed: `GATE-RC23-AH-${i}`}); }
      catch { failed++; continue; }
      for (const q of s.questions) {
        total++; families.add(q.family); templates.add(q.metadata.template_id);
        if (!isHardCapable(q.metadata.template_id) || q.difficulty !== 'hard') filler++;
      }
    }
    return {pass: failed === 0 && total === 300 && filler === 0,
      detail: {total, filler, failedSessions: failed, families: families.size, templates: templates.size}};
  });

  add('HARD_COVERAGE_REPORTED', 'RC2.3-2 — the coverage a band can be built from is measured, and a band that cannot fill a session refuses', () => {
    const cov = bandCoverage();
    const e = new Engine();
    let refused = false, named = null;
    try { e.generatePractice({count: 50, difficulty: 'hard', family: 'sequences', seed: 'GATE-RC23-COV'}); }
    catch (err) { refused = err.code === 'INSUFFICIENT_BAND_COVERAGE'; named = err.familiesWithout ?? null; }
    return {
      pass: refused && cov.hard.sessionDeliverable,
      detail: {
        hardTemplates: cov.hard.templates, hardFamilies: cov.hard.families,
        familiesWithoutHard: cov.hard.familiesWithout,
        meanUsesPerStructureInA250Batch: cov.hard.meanUsesPerStructureInABatch,
        refusesWhenShort: refused, refusalNames: named
      }
    };
  });

  add('STRUCTURAL_EVIDENCE_CONSISTENT', 'RC2.3-1 — nothing a question publishes contradicts the criteria its template claims', () => {
    const r = ['easy', 'medium', 'hard'].map(band => freshStructuralSample({band, n: 200, seedTag: 'GATE-RC23-EV'}));
    const bad = r.reduce((a, x) => a + x.structuralContradictions.count, 0);
    return {pass: bad === 0, detail: r.map(x => ({band: x.band, generated: x.generated, contradictions: x.structuralContradictions.count}))};
  });

  add('HOLDOUT_D_REGRESSION', 'RC2.3-1 — the adjudication lands where the independent Holdout D audit did', () => {
    const r = holdoutDRegression();
    if (!r.available) return {pass: false, detail: 'holdout D evidence is missing'};
    return {pass: Math.abs(r.differenceFromAudit) <= 3,
      detail: {releasedAsHard: r.releasedAsHard, auditSays: r.independentAuditSaysGenuinelyHard,
        adjudicationKeeps: r.adjudicationKeepsAsHard, difference: r.differenceFromAudit}};
  });

  add('TEMPLATE_SHARE_CAPPED', 'RC2.3-5 — no template takes more than its share of a session', () => {
    const e = new Engine();
    let worst = 0;
    for (const band of ['easy', 'medium', 'hard']) {
      for (let i = 0; i < 3; i++) {
        const s = e.generatePractice({count: 50, difficulty: band, family: 'random', seed: `GATE-RC23-SHARE-${band}-${i}`});
        const counts = {};
        for (const q of s.questions) counts[q.generator_id] = (counts[q.generator_id] ?? 0) + 1;
        worst = Math.max(worst, ...Object.values(counts));
      }
    }
    return {pass: worst <= new Engine().config.maxTemplateIdRepeatsPerSession, detail: {worstShareOf50: worst}};
  });

  add('COUNT_ANSWERS_ARE_WHOLE', 'RC2.3-4 — a count of indivisible things is not offered as a fraction', () => {
    const e = new Engine();
    let published = 0, fractional = 0;
    for (let i = 0; i < 2500; i++) {
      let q;
      try { q = e.generateQuestion({family: 'random', difficulty: ['easy', 'medium', 'hard'][i % 3], seed: `GATE-RC23-CNT-${i}`}); }
      catch { continue; }
      if (!q.metadata.answer_count_unit) continue;
      for (const o of Object.values(q.metadata.options_meta)) {
        if (o.correct) continue;
        published++;
        if (typeof o.value === 'number' && !Number.isInteger(o.value)) fractional++;
      }
    }
    // Demoted, never dropped, so the bar is a low residual rather than zero.
    return {pass: published > 500 && fractional / published < 0.02,
      detail: {published, fractional, share: Number((fractional / Math.max(published, 1)).toFixed(4))}};
  });

  add('RISE_WORDING_UNAMBIGUOUS', 'RC2.3-6 — a rise of 100% or more says BY how much, never «بنسبة»', () => {
    // Drawn from the families whose rise percentages can reach 100%, because a
    // random sweep finds only a handful in thousands and a check that sees four
    // examples proves very little.
    const e = new Engine();
    let big = 0, ambiguous = 0, seen = 0;
    for (const family of ['work_time', 'unit_rate', 'machines']) {
      for (const band of FAMILY_MAP[family].difficulties) {
        for (let i = 0; i < 700; i++) {
          let q;
          try { q = e.generateQuestion({family, difficulty: band, seed: `GATE-RC23-PCT-${family}-${band}-${i}`}); }
          catch { continue; }
          seen++;
          if (!/\d{3,}%/.test(q.question)) continue;
          big++;
          if (/بنسبة \d{3,}%/.test(q.question)) ambiguous++;
        }
      }
    }
    return {pass: big > 40 && ambiguous === 0, detail: {sampled: seen, stemsWithARiseOf100OrMore: big, ambiguous}};
  });

  // --- RC2.4 conditions ------------------------------------------------------

  add('HARD_COVERAGE_EXPANDED', 'RC2.4-1 — hard coverage is materially broader than RC2.3, and the two families at their ceiling stay there', () => {
    const c = coverageTable();
    return {
      pass: c.hardTemplatesAfter >= 37 && c.hardFamiliesAfter >= 14
        && c.familiesWithoutHard.length === 2
        && c.familiesWithoutHard.includes('fractions') && c.familiesWithoutHard.includes('odd_one_out'),
      detail: {
        hardTemplates: `${c.hardTemplatesBefore} -> ${c.hardTemplatesAfter}`,
        hardFamilies: `${c.hardFamiliesBefore} -> ${c.hardFamiliesAfter}`,
        familiesWithoutHard: c.familiesWithoutHard,
        addedByFamily: c.addedByFamily
      }
    };
  });

  add('NOTHING_RECLASSIFIED', 'RC2.4-1 — coverage was raised by adding structures, never by promoting a routine one', () => {
    const lost = RC23_HARD.filter(id => !isHardCapable(id));
    const promoted = ['PROP_H_COST_PLUS', 'PCT_M_SUCCESSIVE', 'PCT_H_CHAIN_VALUE', 'RATE_H_TWO_PHASE',
      'PL_H_CHAIN', 'RAT_E_SPLIT', 'PCT_E_REVERSE_ONE', 'PL_H_REVERSE', 'AVG_M_COMBINE',
      'WORK_H_TWO_STAGE', 'MACH_H_STAGE_UP', 'COMB_H_STAGED', 'WORK_M_CHANGE', 'MACH_M_NEW_FAST',
      'PCT_H_REVERSE_CHAIN', 'AVG_H_TARGET', 'SEQ_H_RECURRENCE'].filter(isHardCapable);
    const criteria = Object.keys(HARD_CRITERIA).sort().join(',');
    const expected = 'COMPOSED_INVERSION,CROSS_PART_INTEGRATION,PARTIAL_ORDER_BRANCHING,RULE_DISCOVERY,SIMULTANEOUS_CONSTRAINTS,STRATEGY_SELECTION';
    return {pass: lost.length === 0 && promoted.length === 0 && criteria === expected,
      detail: {lostHardBand: lost, promotedRoutine: promoted, criteriaUnchanged: criteria === expected}};
  });

  add('ALL_HARD_BATCH_ACCEPTS', 'RC2.4-2 — five ALL_HARD sessions of fifty carry no filler, no duplicates and no dominance', () => {
    const r = allHardSessions({sessions: 5, count: 50, seedTag: 'GATE-RC24-BATCH', mode: 'BATCH'});
    const cap = new Engine().config.maxTemplateIdRepeatsPerSession;
    const worstShare = Math.max(0, ...r.perSession.map(s => s.templates.max));
    return {
      pass: r.failedSessions === 0 && r.totalQuestions === 250 && r.filler === 0
        && r.wrongKeys === 0 && r.ambiguous === 0 && r.invalidQuestions === 0
        && r.exactDuplicates === 0 && r.semanticDuplicates === 0
        && worstShare <= cap
        && r.acrossAllSessions.families.distinct >= 13
        && r.acrossAllSessions.reasoning.distinct >= 40,
      detail: {
        total: r.totalQuestions, filler: r.filler, wrongKeys: r.wrongKeys, ambiguous: r.ambiguous,
        exactDuplicates: r.exactDuplicates, semanticDuplicates: r.semanticDuplicates,
        worstTemplateShareOf50: worstShare, cap,
        acrossAllSessions: r.acrossAllSessions
      }
    };
  });

  add('NEW_TEMPLATE_OPTIONS_SOUND', 'RC2.4-3 — the added templates carry varied misconception-linked options, not magnitude fillers', () => {
    const r = newTemplateOptions({perTemplate: 25, seedTag: 'GATE-RC24-OPT'});
    const thin = r.perTemplate.filter(t => t.slips < 4).map(t => t.templateId);
    return {
      pass: r.templatesMeasured >= newHardTemplates().length
        && r.repeatedDiagnosis.share < 0.1 && r.outOfScaleAt25x.share < 0.05
        && r.fractionalCountOptions === 0 && thin.length === 0,
      detail: {
        templatesMeasured: r.templatesMeasured, options: r.options,
        repeatedDiagnosis: r.repeatedDiagnosis, outOfScaleAt25x: r.outOfScaleAt25x,
        fractionalCountOptions: r.fractionalCountOptions, thinSlipPools: thin
      }
    };
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
