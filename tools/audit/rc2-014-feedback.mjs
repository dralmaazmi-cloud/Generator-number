// RC2-014. Feedback specificity, measured semantically instead of structurally.
//
// The RC1 figure was "0% -> 100% of wrong options carry specific feedback". It
// counted the mechanical head of the sentence — «اخترت {الخيار}، وهي ناتج
// {الاشتقاق}.» — which contains the option's own value and is therefore unique
// by construction. The metric could not return anything but 100%, so it measured
// string assembly rather than truth.
//
// The metrics below are the scope's own requirements, one per requirement, each
// falsifiable:
//
//   M1 derivation truthfulness   the arithmetic a wrong option shows must
//                                produce the number on the paper
//   M2 misconception applicability  the named misconception must fit this stem
//                                (RC2-013's check, reported here as a metric)
//   M3 discrimination            the five wrong options must not all say the
//                                same thing, or the feedback tells the learner
//                                nothing about which error they made
//   M4 question-specificity      the derivation must refer to this question's
//                                own numbers, not to a generic template
//   M5 vacuity                   no wrong option may fall back to the neutral
//                                sentence or carry no derivation at all
//
// Wording duplication is reported too, because the RC1 sample counted it, but it
// is reported as an OBSERVATION and not as a defect: two questions that produce
// the same error deserve the same sentence, and the scope says so explicitly.

import {writeFileSync, mkdirSync} from 'node:fs';
import Engine from '../../src/index.js';
import {classifyOptionFeedback, FEEDBACK_VERDICT, FEEDBACK_DEFECTS} from '../../src/qa/feedback-metrics.js';
import {validateMisconceptionContext, CONTEXT_BOUND} from '../../src/qa/misconception-context.js';
import {NEUTRAL_FEEDBACK} from '../../src/qa/misconceptions.js';

const BANDS = ['easy', 'medium', 'hard'];

/** The numbers this question states, as strings, for the specificity test. */
function stemNumbers(q) {
  return new Set([...String(q.question).matchAll(/\d+(?:\.\d+)?/g)].map(m => m[0]));
}

export async function measure({questions = 4000, seedPrefix = 'rc2-014'} = {}) {
  const engine = new Engine();
  const verdicts = {};
  const mismatches = [];
  let published = 0, wrongOptions = 0;

  let notApplicable = 0;
  let vacuous = 0, noDerivation = 0;
  let specific = 0, specifiable = 0;
  const distinctPerQuestion = [];
  const distinctDerivationsPerQuestion = [];
  let allFiveDistinct = 0;
  let allFiveDerivationsDistinct = 0;

  const sentenceUses = new Map();
  let optionsWithNonUniqueSentence = 0;
  let questionsWithDuplicateSentence = 0;

  for (let i = 0; i < questions; i++) {
    let q;
    try { q = engine.generateQuestion({family: 'random', difficulty: BANDS[i % 3], seed: `${seedPrefix}-${i}`}); }
    catch { continue; }
    published++;
    const meta = q.metadata.options_meta;
    const stem = stemNumbers(q);
    const ids = new Set();
    const derivationsHere = new Set();
    const sentencesHere = new Map();

    for (const [letter, m] of Object.entries(meta)) {
      if (m.correct) continue;
      wrongOptions++;
      ids.add(m.misconceptionId);
      if (m.derivation) derivationsHere.add(m.derivation);

      // M1
      const r = classifyOptionFeedback({value: m.value, derivation: m.derivation});
      verdicts[r.verdict] = (verdicts[r.verdict] || 0) + 1;
      if (FEEDBACK_DEFECTS.includes(r.verdict)) {
        mismatches.push({templateId: q.generator_id, seed: q.seed, letter,
          misconceptionId: m.misconceptionId, derivation: m.derivation, value: m.value, evaluated: r.evaluated});
      }

      // M4 — a derivation that quotes none of the stem's numbers is generic.
      //     Prose derivations that name a quantity of the stem still count.
      if (m.derivation) {
        specifiable++;
        const cited = [...String(m.derivation).matchAll(/\d+(?:\.\d+)?/g)].map(x => x[0]);
        if (cited.some(c => stem.has(c))) specific++;
      }

      // M5
      const sentence = q.explanation.distractor_analysis?.[letter] ?? '';
      if (!m.derivation) noDerivation++;
      if (sentence === NEUTRAL_FEEDBACK || sentence.trim() === '') vacuous++;

      // Wording duplication, as an observation.
      const tail = sentence.slice(sentence.indexOf('.') + 1).trim();
      sentenceUses.set(tail, (sentenceUses.get(tail) || 0) + 1);
      sentencesHere.set(tail, (sentencesHere.get(tail) || 0) + 1);
    }

    // M2 — applicability, per question.
    const base = {question: q.question, distractors: Object.values(meta)
      .filter(m => !m.correct).map(m => ({value: m.value, misconceptionId: m.misconceptionId}))};
    if (!validateMisconceptionContext(base).valid) notApplicable++;

    // M3
    distinctPerQuestion.push(ids.size);
    distinctDerivationsPerQuestion.push(derivationsHere.size);
    if (ids.size === 5) allFiveDistinct++;
    if (derivationsHere.size === 5) allFiveDerivationsDistinct++;
    if ([...sentencesHere.values()].some(n => n > 1)) questionsWithDuplicateSentence++;
  }

  for (const [, n] of sentenceUses) { /* counted below */ void n; }
  // A sentence used more than once anywhere in the corpus.
  const repeated = new Set([...sentenceUses.entries()].filter(([, n]) => n > 1).map(([s]) => s));
  optionsWithNonUniqueSentence = [...sentenceUses.entries()]
    .filter(([s]) => repeated.has(s)).reduce((a, [, n]) => a + n, 0);

  const numericChecked = (verdicts[FEEDBACK_VERDICT.EXACT] ?? 0)
    + (verdicts[FEEDBACK_VERDICT.ROUNDS_TO_VALUE] ?? 0) + (verdicts[FEEDBACK_VERDICT.MISMATCH] ?? 0);
  const mean = xs => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

  return {
    schema: 'rc2-014-feedback-metrics-v1',
    scopeItem: 'RC2-014',
    generatedAt: new Date().toISOString(),
    corpus: {questions: published, wrongOptions, seedPrefix},
    retiredMetric: {
      name: 'feedback_specificity_share',
      rc1Reported: 1.0,
      whyInvalid: 'It counted the mechanical head «اخترت {الخيار}، وهي ناتج {الاشتقاق}.», which carries the option\'s own value and so is unique by construction. The figure could not be anything but 100%, whatever the sentence after it said.',
      status: 'RETIRED'
    },
    metrics: {
      M1_derivationTruthfulness: {
        description: 'Of the wrong options that make an arithmetic claim, the share whose claim produces the number on the paper.',
        checked: numericChecked,
        exact: verdicts[FEEDBACK_VERDICT.EXACT] ?? 0,
        roundsToDisplayedValue: verdicts[FEEDBACK_VERDICT.ROUNDS_TO_VALUE] ?? 0,
        mismatches: verdicts[FEEDBACK_VERDICT.MISMATCH] ?? 0,
        value: numericChecked ? Number((1 - (verdicts[FEEDBACK_VERDICT.MISMATCH] ?? 0) / numericChecked).toFixed(5)) : null,
        notCheckable: {
          prose: verdicts[FEEDBACK_VERDICT.PROSE] ?? 0,
          nonNumericAnswer: verdicts[FEEDBACK_VERDICT.NON_NUMERIC] ?? 0,
          absent: verdicts[FEEDBACK_VERDICT.ABSENT] ?? 0
        }
      },
      M2_misconceptionApplicability: {
        description: 'Questions where every named misconception fits the situation the stem describes (RC2-013).',
        questionsWithInapplicable: notApplicable,
        value: published ? Number((1 - notApplicable / published).toFixed(5)) : null,
        contextBoundMisconceptions: Object.keys(CONTEXT_BOUND).length
      },
      M3_discrimination: {
        description: 'Whether a question\'s five wrong options say five different things. Measured on the misconception and on the derivation, NOT on the rendered sentence: the rendered sentence carries the option\'s own value in its head and is therefore unique by construction — that is the error the retired metric made, and it is not repeated here.',
        byMisconception: {
          meanDistinctPerQuestion: Number(mean(distinctPerQuestion).toFixed(3)),
          questionsWithAllFiveDistinct: allFiveDistinct,
          shareWithAllFiveDistinct: published ? Number((allFiveDistinct / published).toFixed(4)) : null,
          minDistinct: distinctPerQuestion.length ? Math.min(...distinctPerQuestion) : null,
          note: 'A single misconception across all five is correct where the family admits only one kind of error: every wrong option in an odd-one-out question is wrong because it satisfies the shared rule. Those questions still discriminate through the derivation, which names WHICH property each number satisfies.'
        },
        byDerivation: {
          meanDistinctPerQuestion: Number(mean(distinctDerivationsPerQuestion).toFixed(3)),
          questionsWithAllFiveDistinct: allFiveDerivationsDistinct,
          shareWithAllFiveDistinct: published ? Number((allFiveDerivationsDistinct / published).toFixed(4)) : null,
          minDistinct: distinctDerivationsPerQuestion.length ? Math.min(...distinctDerivationsPerQuestion) : null
        }
      },
      M4_questionSpecificity: {
        description: 'Wrong options whose derivation quotes at least one number from this question\'s own stem.',
        specifiable, specific,
        value: specifiable ? Number((specific / specifiable).toFixed(4)) : null
      },
      M5_vacuity: {
        description: 'Wrong options falling back to the neutral sentence, or carrying no derivation at all.',
        neutralFallbacks: vacuous,
        withoutDerivation: noDerivation,
        value: wrongOptions ? Number(((vacuous + noDerivation) / wrongOptions).toFixed(5)) : null
      }
    },
    wordingDuplication: {
      note: 'Reported because the RC1 sample counted it. It is NOT a defect: two questions that produce the same error deserve the same sentence. Duplication that coincides with a real failure is counted under RC2-012 (vacuous) or RC2-013 (misattributed).',
      classification: 'OBSERVATION',
      questionsWithDuplicateSentence,
      shareOfQuestions: published ? Number((questionsWithDuplicateSentence / published).toFixed(4)) : null,
      optionsWithNonUniqueSentence,
      shareOfWrongOptions: wrongOptions ? Number((optionsWithNonUniqueSentence / wrongOptions).toFixed(4)) : null,
      distinctSentences: sentenceUses.size,
      rc1Reported: {questionsWithDuplicateExplanatorySentence: 6117, ofQuestions: 10000,
        wrongOptionsWithNonUniqueSentence: 11276, ofWrongOptions: 50000}
    },
    mismatches
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const report = await measure({questions: Number(process.argv[2] ?? 4000)});
  mkdirSync('rc2', {recursive: true});
  writeFileSync('rc2/RC2_014_FEEDBACK_METRICS.json', JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({corpus: report.corpus, metrics: report.metrics, wordingDuplication: report.wordingDuplication}, null, 2));
}
