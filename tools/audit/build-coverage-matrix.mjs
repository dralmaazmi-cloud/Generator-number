// RC2 coverage matrix. Every frozen scope item, with the evidence that closes
// it, built from the repository rather than typed by hand so that a test name
// that stops existing shows up as a gap instead of as a stale claim.
//
// Each item must end at exactly one of the three terminal statuses the scope
// allows. The five forbidden statuses are refused by the builder, not merely
// documented.

import {readFileSync, writeFileSync, readdirSync, existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';

const TERMINAL = ['FIXED', 'MEASUREMENT_CORRECTED', 'RISK_REMEDIATED_AND_MEASURED'];
const FORBIDDEN = ['IGNORED', 'OUT_OF_SCOPE', 'DEFERRED_TO_STAGE_1', 'UNTESTED', 'ASSUMED_FIXED'];

/** Test titles, per scope item, read out of the suite as it actually stands. */
function testsByItem() {
  const byItem = {};
  for (const file of readdirSync('tests').filter(f => f.endsWith('.test.mjs'))) {
    const src = readFileSync(`tests/${file}`, 'utf8');
    for (const m of src.matchAll(/\btest\(\s*(['"`])((?:(?!\1).)*)\1/g)) {
      const title = m[2];
      const id = /\bRC2-(\d{3})\b/.exec(title);
      if (!id) continue;
      (byItem[`RC2-${id[1]}`] ??= []).push({file: `tests/${file}`, title});
    }
  }
  return byItem;
}

/** The per-item evidence: what changed, why, and where the numbers live. */
const EVIDENCE = {
  'RC2-001': {
    affectedProductionPath: ['src/utils.js makeOptionSet', 'src/qa/rank-calibration.js (removed)'],
    rootCause: 'Distractor selection consulted the key\'s numeric rank: pickBalancedDistractors, drawRankPosition and hasLoneRoundNumber chose among pedagogically valid distractors by where the answer would sit among them.',
    remediation: 'The rank machinery is deleted, not disabled — module, tool, guard test, inventory and its artifact. makeOptionSet draws five distractors from the provenance-carrying pool with rng.sample and no reference to any property of the answer. observedFeasibleRankRange replaces it as observation only.',
    developmentCorpusMetric: 'three-angle proof: static call-site analysis, runtime instrumentation, counterfactual rank invariance',
    status: 'FIXED'
  },
  'RC2-002': {
    affectedProductionPath: ['src/families/averages.js', 'src/arabic/constructions.js'],
    rootCause: 'A bare numeral before a definite plural — «3 القيم» — reached publication because no check classified Arabic number-noun constructions at all.',
    remediation: 'A tokenizer-based construction classifier; the pipeline refuses INVALID_ARABIC_NUMBER_UNIT. Six averages stems de-numeralised, with resultingCount declared as a real parameter so explanation sourcing still holds.',
    developmentCorpusMetric: '44,728 valid, 11,448 exempt, 0 invalid, 0 unclassified over 6,240 questions',
    status: 'FIXED'
  },
  'RC2-003': {
    affectedProductionPath: ['src/qa/telemetry.js', 'src/index.js', 'src/families/_shared.js', 'all 16 family files'],
    rootCause: 'Analytics recorded two boundaries — a finalisation throw and a pipeline verdict — so the reported 0.19% rejection rate omitted every rejection below them, including 135 of 1,256 odd-one-out sampler draws.',
    remediation: 'One telemetry architecture over nine stages, with disposition kept apart from work: every proposal ends exactly once, and internal resampling is reported per proposal. DISTRACTOR_IMPOSSIBLE and RETRY_EXHAUSTED given real emission sites. 95 self-recursion sites routed through resample(). Cost reported at both prices.',
    developmentCorpusMetric: 'rc2/RC2_003_REJECTION_COST.json — reconciliation balances exactly; mean 1.030 attempts, p95 1, 0 exhaustions, latency p95 1.27ms; unabsorbed per-draw rates reported per template',
    artifacts: ['rc2/RC2_003_REJECTION_COST.json'],
    status: 'FIXED'
  },
  'RC2-004': {
    affectedProductionPath: ['src/index.js generatePractice'],
    rootCause: 'Cross-session fingerprint memory was on by default, so a session was a function of the seed AND of everything the engine had generated before, while the engine described itself as deterministic.',
    remediation: 'Two named modes. DETERMINISTIC_SINGLE_GENERATION is the default and is pure in its declared inputs; STATEFUL_SESSION_GENERATION is opt-in and declared non-reproducible. An unknown mode throws.',
    developmentCorpusMetric: 'a fresh engine and one worn by six sessions and forty questions replay the same seed identically, mixed and all-hard',
    status: 'FIXED'
  },
  'RC2-005': {
    affectedProductionPath: ['src/qa/pedagogy.js', 'src/families/calendar.js', 'src/families/relational.js'],
    rootCause: 'validatePedagogy required a finite NUMBER, so every template answering with a day, a person, a statement or a fraction name was outside the degeneracy model — 23 of 107, and the two families where the degeneracy is easiest to produce.',
    remediation: 'Answer equality spans the published types. Eleven templates gained a model; two real defects surfaced (CAL_H_LONG at n=16 and n=24, REL_E_CHAIN five-person chains). REL_M_COUNT models two wrong methods so the fix does not cost the template two answer values.',
    developmentCorpusMetric: 'rc2/DEGENERACY_COVERAGE.json — 107 templates typed, 0 unclassified; published coverage 79.3% -> 89.7%; the RC1 gap preserved per template as A/B/C',
    artifacts: ['rc2/DEGENERACY_COVERAGE.json'],
    status: 'FIXED'
  },
  'RC2-006': {
    affectedProductionPath: ['report.js buildReportTextLayer', 'report.js buildPrintReportHtml'],
    rootCause: 'The browser print pipeline shapes and reorders Arabic before it reaches the PDF text layer, so 77.5% of it is stored as presentation forms in visual order and a literal stem search returns nothing.',
    remediation: 'The engine produces the report content as logical-order Unicode and embeds it in the HTML in a machine-readable block, written beside the PDF. The renderer limitation is stated, not worked around: making the PDF layer itself logical would mean writing the PDF with an embedded font.',
    developmentCorpusMetric: 'rc2/RC2_006_PDF_ACCESSIBILITY.json — PDF visible layer 78.3% presentation forms and 0/8 stems findable; /ActualText 0% presentation forms and still 0/8; HTML and logical layer 0% and 8/8',
    artifacts: ['rc2/RC2_006_PDF_ACCESSIBILITY.json'],
    status: 'RISK_REMEDIATED_AND_MEASURED'
  },
  'RC2-007': {
    affectedProductionPath: ['src/qa/ambiguity.js'],
    rootCause: 'A lone simple rule could never compete in the "only one satisfies P" framing, so a run with two defensible outliers was published as though it had one.',
    remediation: 'approvedRules() with declared salience and a uniquePositive flag; findSingleOutlierRules tests both framings; four verdicts replace a boolean.',
    developmentCorpusMetric: '800 generated odd-one-out questions: 611 CLEAN, 189 BORDERLINE, 0 AMBIGUOUS, 0 UNDISCOVERABLE; all five historical cases caught',
    status: 'FIXED'
  },
  'RC2-008': {
    affectedProductionPath: ['src/qa/ambiguity.js'],
    rootCause: 'The inverse framing was not tested and magnitude-based rules were invisible to the sweep.',
    remediation: 'Both framings are tested and rule salience is declared per rule, with the surface-competing set recorded in metadata.',
    developmentCorpusMetric: 'the RC1 MUST_ACCEPT fixture {8,15,24,35,48,50} is genuinely AMBIGUOUS and the fixture was corrected, not the policy',
    status: 'FIXED'
  },
  'RC2-009': {
    affectedProductionPath: ['src/qa/ambiguity.js', 'src/families/odd_one_out.js'],
    rootCause: 'A key reachable only by a rule above any plausible discoverability ceiling was published as a hard question.',
    remediation: 'DISCOVERABILITY_CEILING = 2 and UNDISCOVERABLE_INTENDED_RULE as a pipeline reason; ODD_H_PRIME_OFFSET replaced by ODD_H_TRIANGULAR. The "prime + 10" fixture was converted from MUST_ACCEPT to MUST_REJECT, because that MUST_ACCEPT was the original error.',
    developmentCorpusMetric: '0 UNDISCOVERABLE published across 800 odd-one-out questions; all seven templates still publish',
    status: 'FIXED'
  },
  'RC2-010': {
    affectedProductionPath: ['src/families/relational.js partialOrderPosition'],
    rootCause: 'The sampler searched the graph for a position the orderings disagreed about and resampled whenever none existed — target-answer sampling, which made the template answer "cannot be determined" in 91 of 91 instances.',
    remediation: 'The position is chosen blind and the answer is whatever the enumeration gives. positionGraph draws chain, chain-with-tail and branched topologies.',
    developmentCorpusMetric: '1 -> 17 distinct answers; modal 100% -> 34.4%; entropy 0.00 -> 3.55 bits; determined share 0.649',
    status: 'FIXED'
  },
  'RC2-011': {
    affectedProductionPath: ['src/families/profit_loss.js', 'src/families/combined_rate.js', 'src/families/speed.js', 'src/families/machines.js', 'src/families/unit_rate.js', 'src/families/work_time.js', 'src/families/odd_one_out.js', 'src/families/relational.js', 'src/families/sequences.js'],
    rootCause: 'The pools the stem draws its stated numbers from were short, and in several templates the stated quantity IS the answer, so the answer space was the length of a three- or four-element list.',
    remediation: 'Design-time widening of those pools. No runtime mechanism reads a generated answer; a static scan for the statistical vocabulary such a mechanism would need returns empty, and the two shapes that do read the answer — validity guards and backward construction — are listed rather than hidden behind it.',
    developmentCorpusMetric: 'rc2/RC2_011_ANSWER_SPACE.json — the five RC1 templates fall by 16.7 to 26.7 advantage points; 0 templates above +20 (was 5); median template −3.8',
    artifacts: ['rc2/RC2_011_ANSWER_SPACE.json'],
    status: 'RISK_REMEDIATED_AND_MEASURED'
  },
  'RC2-012': {
    affectedProductionPath: ['src/qa/distractor-provenance.js', 'src/families/_shared.js mk', 'all 16 family files'],
    rootCause: 'A learner has no access to the answer, yet 24.9% of published wrong options had derivations that begin with it. 79 of 107 templates were affected and 15.6% of questions carried three or more.',
    remediation: 'Every answer-derived distractor must name the step of the published explanation it corrupts, and no two may carry the same misconception. Pools deepened with slips built from each question\'s own quantities rather than refilled with nudges.',
    developmentCorpusMetric: 'rc2/RC2_012_SURVIVOR_AUDIT.json — 24.9% -> 1.9%; three-or-more 15.6% -> 0.7%; stratified: 274 S1_TASK_PATH, 48 S3_GIVEN_COINCIDENCE, 2 S1B, 1 S2, 0 S4_UNJUSTIFIED',
    artifacts: ['rc2/RC2_012_SURVIVOR_AUDIT.json'],
    status: 'FIXED'
  },
  'RC2-013': {
    affectedProductionPath: ['src/qa/misconception-context.js', 'src/families/speed.js', 'src/families/machines.js', 'src/families/work_time.js', 'src/families/unit_rate.js', 'src/families/percentages.js', 'src/families/ratios.js'],
    rootCause: 'USED_SUM_OF_SPEEDS_IN_CHASE told the learner they had added the speeds in a CHASE problem, on 154 of its 195 uses under stems with no chase in them.',
    remediation: 'A misconception whose text names a situation is declared with the Arabic that must be present for the sentence to be true, and the pipeline refuses the pairing otherwise. The check found six more instances of the same defect that the audit had not reported.',
    developmentCorpusMetric: '0 offenders over 11,975 candidates across all sixteen families',
    status: 'FIXED'
  },
  'RC2-014': {
    affectedProductionPath: ['src/qa/feedback-metrics.js', 'src/families/combined_rate.js', 'src/families/machines.js', 'src/families/percentages.js', 'src/families/profit_loss.js'],
    rootCause: 'The reported 0% -> 100% specificity counted the mechanical head «اخترت {الخيار}، وهي ناتج {الاشتقاق}.», which carries the option\'s own value and is unique by construction. The metric could not return anything else.',
    remediation: 'The metric is retired with its reason recorded and replaced by five falsifiable ones. M1 reads the derivation as arithmetic and checks it produces the number on the paper; it found four classes of false feedback, all fixed at the source, and both failures are now pipeline stages.',
    developmentCorpusMetric: 'rc2/RC2_014_FEEDBACK_METRICS.json — M1 1.00000 over 13,902 arithmetic claims, M2 1.00000, M3 5.000 distinct derivations per question, M5 0',
    artifacts: ['rc2/RC2_014_FEEDBACK_METRICS.json'],
    status: 'MEASUREMENT_CORRECTED'
  },
  'RC2-015': {
    affectedProductionPath: ['src/qa/complexity.js', 'src/families/odd_one_out.js', 'src/families/combined_rate.js'],
    rootCause: 'conditionCount was fed the number of NUMBERS shown in an odd-one-out question — six, always — so it added a flat 4.2 to easy and hard alike. The boundaries 4.5 and 9.5 then put the median easy question in medium and the median medium question in hard.',
    remediation: 'ruleSearchDepth replaces the stimulus count; COMB_H_THREE is declared where the model puts it (easy, as COMB_E_THREE); boundaries placed midway between adjacent band medians by a stated rule, recomputed by the tool so drift is visible.',
    developmentCorpusMetric: 'rc2/RC2_015_DIFFICULTY_CALIBRATION.json — agreement 52.8% -> 66.0%, deliberately not further; all five RC1 misclassifications met; the REL_H_POSITION caveat answered at determined share 0.649',
    artifacts: ['rc2/RC2_015_DIFFICULTY_CALIBRATION.json'],
    status: 'MEASUREMENT_CORRECTED'
  },
  'RC2-016': {
    affectedProductionPath: ['src/arabic/constructions.js', 'src/families/work_time.js'],
    rootCause: 'The dual took the wrong case after a governor, so «إنجاز مهمتان» reached publication.',
    remediation: 'The classifier reads the governor and the case of the dual; work_time takes the oblique form.',
    developmentCorpusMetric: '0 invalid dual constructions over 6,240 questions',
    status: 'FIXED'
  },
  'RC2-017': {
    affectedProductionPath: ['src/families/profit_loss.js', 'src/families/direct_proportion.js', 'src/arabic/constructions.js'],
    rootCause: 'Definiteness was rendered onto the wrong member of an إضافة, giving «سعر سلعة المعلن».',
    remediation: 'The stems are corrected and the classifier requires the head of an إضافة to be a known head, with prefixed-article detection so the rule does not fire on «معدل أ الكلي».',
    developmentCorpusMetric: 'Arabic pipeline rejections 81 -> 0 after the seven false positives were traced to the classifier',
    status: 'FIXED'
  },
  'RC2-018': {
    affectedProductionPath: ['src/families/fractions.js'],
    rootCause: 'The remember-line taught the reverse of the quantity asked for: previous ÷ next gives the DENOMINATOR, not the fraction.',
    remediation: 'The rule is restated and the distinction made explicit in the same sentence.',
    developmentCorpusMetric: 'the hidden-fraction direction publishes with the corrected rule across all three fraction templates',
    status: 'FIXED'
  },
  'RC2-019': {
    affectedProductionPath: ['src/families/fractions.js', 'src/families/direct_proportion.js', 'src/families/speed.js'],
    rootCause: 'fastMethod stated an instance rather than a reusable rule, so it did not generalise.',
    remediation: 'A reusable rule first, the instance after it. Five templates beyond the reported fractions family were found to have the same shape.',
    developmentCorpusMetric: 'five affected templates identified and corrected, beyond the one the audit named',
    status: 'FIXED'
  },
  'RC2-020': {
    affectedProductionPath: ['src/families/ratios.js'],
    rootCause: 'Only the first printed ratio carried the template invariants, so the second edge escaped and sets such as ب : ج = 6 : 2 reached publication unreduced.',
    remediation: 'Both printed ratios declare the invariant. RC2-003 later found the sampler was drawing pairs the invariant would refuse, at 69% of three templates\' draws, and moved the constraint into the draw; the invariant stays as the guard.',
    developmentCorpusMetric: '0 unreduced or equal-sided pairs over 900 questions; ratios pipeline rejection rate 69% -> 0%',
    status: 'FIXED'
  },
  'RC2-021': {
    affectedProductionPath: ['src/index.js', 'report.js', 'index.html', 'app.js', 'practice-journey.js', 'performance-model.js', 'generator_manifest.json', 'package.json'],
    rootCause: 'ENGINE_VERSION said 1.3.0 while the PDF footer and the UI pill were hard-coded to 1.2.0.',
    remediation: 'One authoritative source; every surface interpolates it, and a test fails if any shipped file hard-codes a different version.',
    developmentCorpusMetric: 'every declared version agrees with ENGINE_VERSION',
    status: 'FIXED'
  },
  'RC2-022': {
    affectedProductionPath: ['src/qa/fingerprint.js', 'src/utils.js', 'src/families/odd_one_out.js', 'src/families/fractions.js'],
    rootCause: 'The commutative canonicalisation escaped for order-insensitive parameters, so permutations of one number set looked like different questions.',
    remediation: 'buildSemanticFingerprint sorts declared order-insensitive arrays rather than dropping them, so content still distinguishes questions while display order does not.',
    developmentCorpusMetric: '43 of 44 odd-one-out semantic groups collapse; one group holds nine display orders under one fingerprint; a property test covers all 720 permutations',
    status: 'FIXED'
  },
  'RC2-023': {
    affectedProductionPath: ['src/qa/fingerprint.js', 'src/families/sequences.js', 'src/index.js'],
    rootCause: 'Two sequences differing only in their first term were two questions by fingerprint and one reasoning experience in fact.',
    remediation: 'A structural reasoning signature independent of incidental values, declared per template and de-duplicated within a session.',
    developmentCorpusMetric: '400 exact instances collapse to 90 structural patterns; SEQ_M_ALT_OPS = 6, matching the corpus',
    status: 'FIXED'
  }
};

export function build() {
  const matrix = JSON.parse(readFileSync('rc2/COVERAGE_MATRIX.json', 'utf8'));
  const tests = testsByItem();
  const problems = [];

  const items = matrix.items.map(item => {
    const e = EVIDENCE[item.id];
    if (!e) { problems.push(`${item.id}: no evidence recorded`); return item; }
    const proof = tests[item.id] ?? [];
    if (!proof.length) problems.push(`${item.id}: no automated proof found in the suite`);
    if (!TERMINAL.includes(e.status)) problems.push(`${item.id}: status ${e.status} is not terminal`);
    if (FORBIDDEN.includes(e.status)) problems.push(`${item.id}: status ${e.status} is forbidden`);
    for (const p of e.affectedProductionPath) {
      const file = p.split(' ')[0];
      if (file.includes('/') && !file.includes('(') && !existsSync(file) && !p.includes('removed') && !p.includes('all 16')) {
        problems.push(`${item.id}: ${file} does not exist`);
      }
    }
    for (const a of e.artifacts ?? []) {
      if (!existsSync(a)) problems.push(`${item.id}: artifact ${a} is missing`);
    }
    return {
      ...item,
      affectedProductionPath: e.affectedProductionPath,
      rootCause: e.rootCause,
      plannedRemediation: e.remediation,
      automatedProof: proof.map(t => `${t.file} :: ${t.title}`),
      automatedProofCount: proof.length,
      regressionFixture: proof.filter(t => /MUST_REJECT|MUST_ACCEPT|fixture|meta:/i.test(t.title))
        .map(t => `${t.file} :: ${t.title}`),
      developmentCorpusMetric: e.developmentCorpusMetric,
      evidenceArtifacts: e.artifacts ?? [],
      status: e.status
    };
  });

  const byStatus = {};
  for (const i of items) byStatus[i.status] = (byStatus[i.status] || 0) + 1;

  let headCommit = null;
  try { headCommit = execFileSync('git', ['rev-parse', 'HEAD'], {encoding: 'utf8'}).trim(); } catch { /* not a repo */ }

  return {
    ...matrix,
    generatedAt: new Date().toISOString(),
    headCommit,
    items,
    totals: {
      items: items.length,
      byStatus,
      withAutomatedProof: items.filter(i => i.automatedProofCount > 0).length,
      withRegressionFixture: items.filter(i => i.regressionFixture.length > 0).length,
      totalAutomatedProofs: items.reduce((a, i) => a + (i.automatedProofCount ?? 0), 0),
      stillPlanned: items.filter(i => i.status === 'PLANNED').length,
      atForbiddenStatus: items.filter(i => FORBIDDEN.includes(i.status)).length
    },
    problems
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const out = build();
  writeFileSync('rc2/COVERAGE_MATRIX.json', JSON.stringify(out, null, 2) + '\n');
  console.log(JSON.stringify(out.totals, null, 2));
  if (out.problems.length) {
    console.log('\nPROBLEMS:');
    for (const p of out.problems) console.log('  ', p);
    process.exitCode = 1;
  } else {
    console.log('\nno problems: every item has evidence, a terminal status and at least one automated proof.');
  }
}
