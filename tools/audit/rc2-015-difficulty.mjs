// RC2-015. The difficulty model, recalibrated conceptually rather than fitted.
//
// The RC1 audit found 118 of 250 questions (47.2%) where the declared band and
// the computed band disagreed, and read all 118 by hand: 110 JUSTIFIED, 3
// UNCERTAIN, 5 MISCLASSIFIED. So disagreement is not by itself a defect — a
// template covers a range, and instances inside it genuinely vary. Driving the
// agreement rate to 100% would contradict the audit's own reading and would be
// curve-fitting.
//
// What the five misclassifications had in common was a model measuring the wrong
// thing:
//
//   ODD_H_SQ_MINUS x2, ODD_H_PRIME_OFFSET x2   all four scored 8.9, because
//     `conditionCount` was fed the six NUMBERS on the page. Every odd-one-out
//     template from easy to hard declared the same 6, a flat 4.2 that carried no
//     information. Their real hardness was ambiguity and undiscoverability,
//     which is RC2-007/008/009's subject, not reasoning load.
//   COMB_H_THREE                                declared hard while being one
//     addition and one multiplication. The model said 5.8 and the model was
//     right; the declaration was wrong.
//
// Both are fixed at the concept, and the band boundaries are then placed by a
// stated rule (midway between adjacent band medians) rather than chosen to make
// the number look good. This tool recomputes the medians so that the boundaries
// the rule implies can be compared against the boundaries in force.

import {writeFileSync, mkdirSync} from 'node:fs';
import Engine from '../../src/index.js';
import {BAND_BOUNDARIES, COMPLEXITY_WEIGHTS} from '../../src/qa/complexity.js';
import {checkOddOneOutAmbiguity} from '../../src/qa/ambiguity.js';

const BANDS = ['easy', 'medium', 'hard'];

/**
 * The five questions the RC1 manual pass called MISCLASSIFIED_DIFFICULTY, as
 * they actually appear in the frozen sample. They are kept as the parameters
 * that produced them, not as regenerated items: the frozen sample is immutable
 * evidence and two of the templates no longer exist.
 */
export const RC1_MISCLASSIFIED = Object.freeze([
  {id: 'S1/27', templateId: 'ODD_H_SQ_MINUS', declared: 'hard', rc1Score: 8.9, rc1Band: 'medium',
    numbers: [24, 35, 75, 48, 63, 15], key: 75,
    rc1Reason: 'hardness is the ambiguity of RC2-007, not reasoning load',
    expectation: 'REFUSED_BY_AMBIGUITY'},
  {id: 'S5/08', templateId: 'ODD_H_SQ_MINUS', declared: 'hard', rc1Score: 8.9, rc1Band: 'medium',
    numbers: [24, 63, 15, 30, 48, 35], key: 30,
    rc1Reason: 'same',
    expectation: 'REFUSED_BY_AMBIGUITY'},
  {id: 'S5/22', templateId: 'ODD_H_PRIME_OFFSET', declared: 'hard', rc1Score: 8.9, rc1Band: 'medium',
    numbers: [12, 11, 19, 13, 9, 17], key: 12,
    rc1Reason: "solvable by 'which one is even'",
    expectation: 'REFUSED_BY_AMBIGUITY'},
  {id: 'S5/46', templateId: 'ODD_H_PRIME_OFFSET', declared: 'hard', rc1Score: 8.9, rc1Band: 'medium',
    numbers: [21, 23, 15, 13, 19, 17], key: 19,
    rc1Reason: 'hardness is undiscoverability (RC2-009)',
    expectation: 'REFUSED_BY_UNDISCOVERABILITY'},
  {id: 'S5/28', templateId: 'COMB_H_THREE', declared: 'hard', rc1Score: 5.8, rc1Band: 'medium',
    rates: [20, 18, 12], hours: 5, key: 250,
    rc1Reason: '(20 + 18 + 12) x 5 — one addition and one multiplication',
    expectation: 'DECLARATION_CORRECTED'}
]);

const median = xs => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};

export async function measure({questions = 4500, seedPrefix = 'rc2-015'} = {}) {
  const engine = new Engine();
  const scoresByDeclared = {easy: [], medium: [], hard: []};
  const grid = {};
  const perTemplate = {};
  let published = 0, agree = 0;

  for (let i = 0; i < questions; i++) {
    let q;
    try { q = engine.generateQuestion({family: 'random', difficulty: BANDS[i % 3], seed: `${seedPrefix}-${i}`}); }
    catch { continue; }
    published++;
    const declared = q.difficulty;
    const computed = q.metadata.complexity_band;
    scoresByDeclared[declared].push(q.metadata.complexity_score);
    grid[`${declared}->${computed}`] = (grid[`${declared}->${computed}`] || 0) + 1;
    if (declared === computed) agree++;
    const t = perTemplate[q.generator_id] ??= {
      templateId: q.generator_id, family: q.family, declared, n: 0, agree: 0, scores: [], computed: {}
    };
    t.n++;
    if (declared === computed) t.agree++;
    t.scores.push(q.metadata.complexity_score);
    t.computed[computed] = (t.computed[computed] || 0) + 1;
  }

  // RC2-010's own measure, restated here because the RC1 caveat turns on it.
  const relPositionDetermined = {determined: 0, total: 0};
  for (let i = 0; i < 600; i++) {
    let q;
    try { q = engine.generateQuestion({family: 'relational', difficulty: 'hard', seed: `${seedPrefix}-rel-${i}`}); }
    catch { continue; }
    if (q.generator_id !== 'REL_H_POSITION') continue;
    relPositionDetermined.total++;
    if (q.metadata.position_determined) relPositionDetermined.determined++;
  }

  const medians = {
    easy: median(scoresByDeclared.easy),
    medium: median(scoresByDeclared.medium),
    hard: median(scoresByDeclared.hard)
  };
  const impliedBoundaries = {
    easyMedium: medians.easy !== null && medians.medium !== null
      ? Number(((medians.easy + medians.medium) / 2).toFixed(2)) : null,
    mediumHard: medians.medium !== null && medians.hard !== null
      ? Number(((medians.medium + medians.hard) / 2).toFixed(2)) : null
  };

  const templates = Object.values(perTemplate).map(t => ({
    ...t,
    medianScore: median(t.scores),
    agreementRate: Number((t.agree / t.n).toFixed(3)),
    scores: undefined
  })).sort((a, b) => a.agreementRate - b.agreementRate);

  // A template that NEVER agrees is a systematic dispute between the model and
  // the declaration, and is worth a reader's eye whichever side is right. It is
  // reported, not silently reconciled.
  const systematic = templates.filter(t => t.agree === 0).map(t => ({
    templateId: t.templateId, family: t.family, declared: t.declared,
    computedAlways: Object.keys(t.computed).length === 1 ? Object.keys(t.computed)[0] : null,
    computed: t.computed, medianScore: t.medianScore, n: t.n,
    direction: t.medianScore > 0 ? null : null
  }));

  // The five RC1 misclassifications, re-run against the current model.
  const fixtures = RC1_MISCLASSIFIED.map(f => {
    if (f.numbers) {
      const a = checkOddOneOutAmbiguity(f.numbers, f.key);
      return {
        ...f,
        nowVerdict: a.verdict,
        nowPublishable: !(a.ambiguous || a.undiscoverable),
        intendedSalience: a.intendedSalience,
        surfaceCompeting: (a.surfaceCompeting || []).map(r => `${r.ruleId}->${r.outlier}`),
        met: f.expectation === 'REFUSED_BY_UNDISCOVERABILITY' ? a.undiscoverable : a.ambiguous || a.undiscoverable
      };
    }
    const t = templates.find(x => x.templateId === 'COMB_E_THREE');
    return {
      ...f,
      nowTemplateId: 'COMB_E_THREE',
      nowDeclared: t ? t.declared : null,
      nowMedianScore: t ? t.medianScore : null,
      met: !!t && t.declared === 'easy'
    };
  });

  return {
    schema: 'rc2-015-difficulty-calibration-v1',
    scopeItem: 'RC2-015',
    generatedAt: new Date().toISOString(),
    corpus: {questions: published, seedPrefix},
    conceptualCorrections: [
      {
        id: 'STIMULUS_COUNT_READ_AS_CONSTRAINT_COUNT',
        was: 'every odd-one-out template declared conditionCount: 6, the number of numbers shown',
        effect: 'a flat 4.2 added to easy and hard alike, carrying no information; the source of all four odd-one-out misclassifications',
        now: 'ruleSearchDepth = the intended rule\'s salience plus the number of approved rules competing on the surface (RC2-008)'
      },
      {
        id: 'DECLARATION_WRONG_NOT_MODEL',
        was: 'COMB_H_THREE declared hard',
        effect: 'one addition and one multiplication carried a hard label; the model scored it 5.8 and was right',
        now: 'declared easy as COMB_E_THREE, between COMB_E_OUTPUT (5.30) and COMB_E_TIME (7.10), both easy'
      },
      {
        id: 'BANDS_READ_ONE_STEP_HIGH',
        was: 'boundaries 4.5 and 9.5',
        effect: 'the median easy question computed as medium and the median medium question as hard',
        now: 'boundaries placed midway between adjacent band medians, and recomputed here so drift is visible'
      }
    ],
    boundaries: {
      inForce: BAND_BOUNDARIES,
      rc1: {easyMedium: 4.5, mediumHard: 9.5},
      rule: 'a boundary sits midway between the medians of the two bands it separates',
      medians,
      impliedByRule: impliedBoundaries,
      driftFromRule: {
        easyMedium: impliedBoundaries.easyMedium === null ? null
          : Number((BAND_BOUNDARIES.easyMedium - impliedBoundaries.easyMedium).toFixed(2)),
        mediumHard: impliedBoundaries.mediumHard === null ? null
          : Number((BAND_BOUNDARIES.mediumHard - impliedBoundaries.mediumHard).toFixed(2))
      }
    },
    weights: COMPLEXITY_WEIGHTS,
    agreement: {
      declaredVsComputed: Number((agree / (published || 1)).toFixed(4)),
      rc1Agreement: 0.528,
      grid
    },
    disagreementIsNotAutomaticallyADefect: {
      note: 'The RC1 manual pass read all 118 disagreements: 110 JUSTIFIED, 3 UNCERTAIN, 5 MISCLASSIFIED. A template covers a range and its instances vary, so agreement is not the target. Systematic disagreement — a template that never agrees — is reported below for a reader rather than reconciled by moving a threshold.',
      rc1: {JUSTIFIED_MISMATCH: 110, UNCERTAIN: 3, MISCLASSIFIED_DIFFICULTY: 5, ofMismatches: 118, ofQuestions: 250}
    },
    // The RC1 audit's own caveat: matrix agreement does not mean the label is
    // right. REL_H_POSITION was declared Hard and computed Hard, so it appeared
    // nowhere in the 118 — and yet the Hard label was substantively wrong,
    // because the template answered "cannot be determined" in 91 of 91
    // instances. Agreement was hiding it. RC2-010 is what fixed it, not this
    // item, and the check is kept here so the caveat does not go unanswered.
    rc1Caveat: {
      templateId: 'REL_H_POSITION',
      rc1: {declared: 'hard', computed: 'hard', appearedInThe118: false,
        whyStillWrong: 'the answer was UNDETERMINED in 91 of 91 instances, so the Hard label described a question that carried no information'},
      now: (() => {
        const t = perTemplate.REL_H_POSITION;
        return t ? {
          declared: t.declared, n: t.n, agreementRate: Number((t.agree / t.n).toFixed(3)),
          computed: t.computed, medianScore: median(t.scores),
          determinedShare: relPositionDetermined.total
            ? Number((relPositionDetermined.determined / relPositionDetermined.total).toFixed(3)) : null,
          note: 'The Hard label is earned once the position is sometimes pinned down and sometimes not; a determined share strictly between 0 and 1 is what makes the question carry information.'
        } : null;
      })()
    },
    rc1MisclassifiedFixtures: fixtures,
    systematicDisagreement: systematic,
    templates
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const report = await measure({questions: Number(process.argv[2] ?? 4500)});
  mkdirSync('rc2', {recursive: true});
  writeFileSync('rc2/RC2_015_DIFFICULTY_CALIBRATION.json', JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({
    corpus: report.corpus, boundaries: report.boundaries, agreement: report.agreement
  }, null, 2));
  console.log('\nthe five RC1 misclassifications, re-run:');
  for (const f of report.rc1MisclassifiedFixtures) {
    console.log('  ', f.id.padEnd(7), f.templateId.padEnd(20), f.expectation.padEnd(30),
      'met:', f.met, f.nowVerdict ? `(${f.nowVerdict})` : `(now ${f.nowTemplateId} ${f.nowDeclared})`);
  }
  console.log('\ntemplates that never agree:', report.systematicDisagreement.length);
  for (const t of report.systematicDisagreement.slice(0, 12)) {
    console.log('  ', t.templateId.padEnd(22), 'declared', t.declared.padEnd(7), '-> computed',
      JSON.stringify(t.computed), 'median', t.medianScore);
  }
}
