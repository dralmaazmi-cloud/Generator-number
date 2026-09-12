// RC2-011. Answer-space leakage, measured and remediated in PARAMETER space.
//
// The scope is explicit that answer-space SIZE is not itself a defect and that
// no threshold rule is adopted: REL_M_COUNT had the largest space in the RC1
// table and still leaked +19.2 points. What matters is whether a test-taker who
// ignores the question and picks the commonest answer does materially better
// than chance. So the reported figure is the ADVANTAGE — modal share minus the
// 1/6 a blind guess earns on a six-option paper — read alongside entropy.
//
// OBSERVE_NEVER_TARGET governs the remedy. Nothing in the engine may look at a
// generated answer, so the fix is never a filter, a retry, a reweighting or a
// chooser. It is the DESIGN-TIME width of the pools the question draws its
// stated numbers from. Those numbers are printed in the stem; a learner reads
// them. Widening them widens what the task can ask, and the answer follows.
//
// The distinction that matters, and that this file exists to keep visible:
//
//   allowed    a wider list of speeds, prices, spans or percentages in the
//              source, chosen once by a person and never consulted at runtime
//   forbidden  any runtime mechanism that reads an answer — resampling because
//              a value recurs, weighting a draw by observed frequency, or
//              picking parameters to land on a wanted key
//
// tools/audit/rc2-001-rank-*.mjs already proves no runtime chooser reads the
// answer. This file proves the remediation did not introduce one: the static
// scan below fails if a family file ever branches on `correct`.

import {writeFileSync, mkdirSync, readFileSync, readdirSync} from 'node:fs';
import Engine from '../../src/index.js';

const BANDS = ['easy', 'medium', 'hard'];
const CHANCE = 1 / 6;

/** The RC1 table, kept so the two can be read against each other. */
export const RC1_WORST = Object.freeze([
  {templateId: 'SPD_M_EQUAL_DIST', difficulty: 'medium', n: 81, space: 4, modal: 0.444, entropyBits: 1.81, advantagePoints: 27.8},
  {templateId: 'PL_M_TOTAL_COST', difficulty: 'medium', n: 114, space: 3, modal: 0.439, entropyBits: 1.51, advantagePoints: 27.2},
  {templateId: 'PL_E_LOSS', difficulty: 'easy', n: 104, space: 3, modal: 0.404, entropyBits: 1.55, advantagePoints: 23.7},
  {templateId: 'SPD_H_TIME_DIFF', difficulty: 'hard', n: 73, space: 4, modal: 0.37, entropyBits: 1.92, advantagePoints: 20.3},
  {templateId: 'COMB_H_STAGED', difficulty: 'hard', n: 89, space: 3, modal: 0.36, entropyBits: 1.58, advantagePoints: 19.3}
]);

/**
 * The forbidden mechanism, if it were ever reintroduced, would have to consult a
 * STATISTICAL property of answers: how often a value has come up, where it ranks
 * among the options, whether it looks round. So that vocabulary is what is
 * scanned for, and it must be absent from the generation path entirely.
 *
 * Reading `correct` is not the offence and cannot be — it is formatted, put in
 * the oracle, and compared for degeneracy on every path. Two shapes that do read
 * it are expected, and are listed rather than flagged so a reader can see them
 * and judge:
 *
 *   VALIDITY_GUARD        a redraw because the answer is not a usable quantity
 *                         at all — not an integer, zero, negative, or identical
 *                         to a number the stem already gives. This is about
 *                         wellformedness, not about which answer it is.
 *   BACKWARD_CONSTRUCTION the answer is drawn UNIFORMLY from a declared list and
 *                         the stem computed from it. This is the opposite of
 *                         targeting: it is how a flat answer distribution is
 *                         obtained, and it consults no property of the value.
 */
// Matched as substrings, not on word boundaries: the name that would reintroduce
// the defect is more likely to be `correctNumericRank` or `answerFrequencyMap`
// than a bare `rank`. Comment lines are skipped by the scanner, which is why the
// two places these words appear in prose — both explaining that the engine does
// NOT do this — do not trip it.
const FORBIDDEN_VOCABULARY = [
  /rank/i, /frequenc/i, /histogram/i, /modal/i, /distribution/i,
  /answerCounts?\b/, /seenAnswers?\b/, /observedAnswers?\b/,
  /pickBalanced/, /drawRank/, /hasLoneRound/
];

const VALIDITY_GUARD = [
  /Number\.isInteger/, /isInteger/, /<=\s*0/, /<\s*0/, /===\s*0/, /!correct/,
  /isExactDecimal/, /decimalPlaces/
];

export function scanForAnswerConditionedSampling(dir = 'src/families') {
  const forbidden = [];
  const validityGuards = [];
  const backwardConstruction = [];
  for (const file of readdirSync(dir).filter(f => f.endsWith('.js'))) {
    const src = readFileSync(`${dir}/${file}`, 'utf8');
    src.split('\n').forEach((line, i) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('//') || trimmed.startsWith('*')) return;
      const at = {file, line: i + 1, text: trimmed};

      // The prohibition itself: any statistical vocabulary about answers.
      for (const re of FORBIDDEN_VOCABULARY) {
        if (re.test(line)) { forbidden.push({...at, matched: String(re)}); return; }
      }
      if (!/\bcorrect\b/.test(line)) return;

      if (/\bresample\s*\(/.test(line)) {
        const kind = VALIDITY_GUARD.some(re => re.test(line)) ? 'VALIDITY_GUARD' : 'DEGENERACY_OR_COLLISION_GUARD';
        validityGuards.push({...at, kind});
        return;
      }
      if (/const\s+correct\s*=\s*rng\.(pick|int|sample)\s*\(/.test(line)) {
        backwardConstruction.push({...at,
          uniform: !/weight|bias|prob/i.test(line),
          kind: 'BACKWARD_CONSTRUCTION'});
      }
    });
  }
  return {forbidden, validityGuards, backwardConstruction};
}

export async function measure({questions = 12000, seedPrefix = 'rc2-011', minSample = 40} = {}) {
  const engine = new Engine();
  const per = {};
  let published = 0, exhausted = 0;

  for (let i = 0; i < questions; i++) {
    let q;
    try { q = engine.generateQuestion({family: 'random', difficulty: BANDS[i % 3], seed: `${seedPrefix}-${i}`}); }
    catch { exhausted++; continue; }
    published++;
    const t = per[q.generator_id] ??= {
      templateId: q.generator_id, family: q.family, difficulty: q.difficulty, n: 0, counts: {}
    };
    t.n++;
    const v = String(q.correct_value);
    t.counts[v] = (t.counts[v] || 0) + 1;
  }

  const templates = Object.values(per)
    .filter(t => t.n >= minSample)
    .map(t => {
      const counts = Object.values(t.counts);
      const modal = Math.max(...counts) / t.n;
      const entropy = -counts.reduce((a, c) => a + (c / t.n) * Math.log2(c / t.n), 0);
      return {
        templateId: t.templateId, family: t.family, difficulty: t.difficulty,
        n: t.n,
        space: counts.length,
        modal: Number(modal.toFixed(3)),
        // RC2.1-2. The modal share is an ESTIMATE, and the ceiling test was
        // comparing the point estimate. At n=75 a template whose true advantage
        // is +7.8 measured +20.7, and at n=272 one whose true advantage is +16.0
        // measured +20.5 — both ordinary binomial noise, both would have been
        // reported as breaching a 20-point ceiling. The lower bound is the point
        // estimate less two standard errors, so a template is only convicted
        // when the sample is big enough to support the claim.
        standardError: Number(Math.sqrt(modal * (1 - modal) / t.n).toFixed(4)),
        advantageLowerBoundPoints: Number((
          (modal - 2 * Math.sqrt(modal * (1 - modal) / t.n) - CHANCE) * 100).toFixed(1)),
        entropyBits: Number(entropy.toFixed(2)),
        advantagePoints: Number(((modal - CHANCE) * 100).toFixed(1))
      };
    })
    .sort((a, b) => b.advantagePoints - a.advantagePoints);

  const comparison = RC1_WORST.map(r => {
    const now = templates.find(t => t.templateId === r.templateId);
    return {
      templateId: r.templateId,
      rc1: {space: r.space, modal: r.modal, entropyBits: r.entropyBits, advantagePoints: r.advantagePoints},
      rc2: now ? {space: now.space, modal: now.modal, entropyBits: now.entropyBits, advantagePoints: now.advantagePoints} : null,
      advantageDelta: now ? Number((now.advantagePoints - r.advantagePoints).toFixed(1)) : null
    };
  });

  const offenders = scanForAnswerConditionedSampling();

  return {
    schema: 'rc2-011-answer-space-v1',
    scopeItem: 'RC2-011',
    generatedAt: new Date().toISOString(),
    corpus: {questions: published, exhausted, seedPrefix, minSamplePerTemplate: minSample},
    interpretation: {
      metric: 'advantagePoints = modal share − 1/6, the gain over a blind guess on a six-option paper',
      note: 'Answer-space SIZE is not a defect and no threshold rule is adopted. REL_M_COUNT has the largest space in the RC1 table and still leaks the most, because a count question has six possible answers by construction and the leak lives in their distribution, not their number.'
    },
    constraint: {
      name: 'OBSERVE_NEVER_TARGET',
      remediation: 'design-time width of the pools the stem draws its stated numbers from',
      prohibited: 'any runtime mechanism that reads a generated answer — resampling on a recurring value, weighting a draw by observed frequency, or choosing parameters to land on a wanted key',
      // Must be empty. Anything here is the prohibited mechanism.
      staticScanOffenders: offenders.forbidden,
      // Expected, and listed so a reader can see them rather than take the
      // empty list above on trust.
      expectedAnswerReads: {
        validityGuards: offenders.validityGuards,
        backwardConstruction: offenders.backwardConstruction,
        note: 'A validity guard redraws when the answer is not a usable quantity; backward construction draws the answer uniformly from a declared list and computes the stem from it. Neither consults a statistical property of any answer, and the second is how a flat distribution is obtained in the first place.'
      }
    },
    worst: templates.slice(0, 20),
    rc1Comparison: comparison,
    summary: {
      templatesMeasured: templates.length,
      maxAdvantagePoints: templates.length ? templates[0].advantagePoints : null,
      templatesAbove20Points: templates.filter(t => t.advantagePoints > 20).length,
      templatesAbove15Points: templates.filter(t => t.advantagePoints > 15).length,
      medianAdvantagePoints: templates.length
        ? templates[Math.floor(templates.length / 2)].advantagePoints : null,
      medianEntropyBits: templates.length
        ? [...templates].sort((a, b) => a.entropyBits - b.entropyBits)[Math.floor(templates.length / 2)].entropyBits
        : null
    },
    templates
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const report = await measure({questions: Number(process.argv[2] ?? 12000)});
  mkdirSync('rc2', {recursive: true});
  writeFileSync('rc2/RC2_011_ANSWER_SPACE.json', JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({corpus: report.corpus, summary: report.summary,
    staticScanOffenders: report.constraint.staticScanOffenders,
    expectedAnswerReads: {
      validityGuards: report.constraint.expectedAnswerReads.validityGuards.length,
      backwardConstruction: report.constraint.expectedAnswerReads.backwardConstruction.length
    }}, null, 2));
  console.log('\nthe five worst templates the RC1 audit named:');
  for (const c of report.rc1Comparison) {
    console.log('  ', c.templateId.padEnd(20),
      `RC1 +${c.rc1.advantagePoints} (space ${c.rc1.space}, H ${c.rc1.entropyBits})`.padEnd(34),
      c.rc2 ? `-> +${c.rc2.advantagePoints} (space ${c.rc2.space}, H ${c.rc2.entropyBits})  Δ ${c.advantageDelta}` : '-> not sampled');
  }
  console.log('\nworst remaining:');
  for (const t of report.worst.slice(0, 8)) {
    console.log('  ', t.templateId.padEnd(22), 'space', String(t.space).padEnd(4), 'modal', String(t.modal).padEnd(7), 'H', String(t.entropyBits).padEnd(6), '+' + t.advantagePoints);
  }
}
