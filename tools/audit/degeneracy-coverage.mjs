// RC2-005. Every template's degeneracy model, typed and measured.
//
// RC1 reported "79.3% of published questions covered" and left 23 of 107
// templates outside the model with no statement of why. A coverage number
// without a classification is not a measurement: it does not distinguish a
// template that needs no model from one whose model is missing.
//
// This tool samples every template, records whether it declares a degeneracy
// model and how often that model fires, and joins it to the classification
// below. A template present in the engine but absent from the classification
// is an error, and so is the reverse.
//
//   MODELLED                     declares wrongMethodValue and/or degenerateWhen
//   COVERED_BY_OTHER_INVARIANT   a different check rejects the same failure,
//                                and is stated
//   NOT_APPLICABLE               no modelled wrong method can reach the key,
//                                with the argument for why

import {writeFileSync, mkdirSync} from 'node:fs';
import {SeededRNG} from '../../src/rng.js';
import {finalizeQuestion} from '../../src/utils.js';
import {validateCandidate} from '../../src/qa/pipeline.js';
import {REASON} from '../../src/qa/reasons.js';

const FAMILIES = [
  'sequences', 'ratios', 'percentages', 'averages', 'ages', 'speed', 'work_time',
  'machines', 'direct_proportion', 'fractions', 'unit_rate', 'combined_rate',
  'relational', 'calendar', 'odd_one_out', 'profit_loss'
];

/**
 * The classification of every template that carried no degeneracy model in RC1.
 * Templates not listed here declare a numeric wrongMethodValue and were already
 * inside the model; the tool verifies that claim rather than trusting it.
 */
export const CLASSIFICATION = {
  // --- calendar: the answer is a day name, so RC1's numeric-only check could
  // not see these at all. Each has a wrong method with a definable day value.
  CAL_E_TOM: {rc1: 'MISSING_DEGENERACY_MODEL', rc2: 'MODELLED',
    note: 'SHIFTED_WRONG_DIRECTION: advancing from the stated day instead of going back. Never coincides for a net offset of 1, and the check says so rather than the model being absent.'},
  CAL_E_AFTER: {rc1: 'MISSING_DEGENERACY_MODEL', rc2: 'MODELLED',
    note: 'Same wrong method as CAL_E_TOM — advancing from the stated day instead of going back — at a net offset of two. Two days forward and two days back coincide only when the offset is a multiple of seven, which this template cannot draw, so the check is present and provably never fires here.'},
  CAL_M_COMPOUND: {rc1: 'MISSING_DEGENERACY_MODEL', rc2: 'MODELLED',
    note: 'IGNORED_NET_OFFSET: going back only the extra days, forgetting that tomorrow is itself a shift of one.'},
  CAL_M_TWO_SHIFT: {rc1: 'MISSING_DEGENERACY_MODEL', rc2: 'MODELLED',
    note: 'STOPPED_AFTER_FIRST_STAGE: answering with today instead of carrying out the second shift.'},
  CAL_H_NESTED: {rc1: 'MISSING_DEGENERACY_MODEL', rc2: 'MODELLED',
    note: 'carried a degenerateWhen rule but no value for its declared target; both are now present.'},
  CAL_H_LONG: {rc1: 'MISSING_DEGENERACY_MODEL', rc2: 'MODELLED',
    note: 'IGNORED_NET_OFFSET: moving by the number of whole weeks instead of the remainder. For n = 16 and n = 24 those are equal, so a quarter of this template measured nothing and the coincident distractor was silently dropped by the uniqueness check.'},

  // --- odd one out
  // RC2.7-4. The only new sequence template whose options ARE the printed run.
  SEQ_M_WRONG_TERM: {since: 'RC2.7', rc1: 'NOT_APPLICABLE', rc2: 'NOT_APPLICABLE',
    note: 'The key is the one printed term that VIOLATES the rule, and every wrong option is a printed term that obeys it. The modelled wrong method — TERM_OBEYS_THE_RULE — is by construction a term satisfying the rule, and the key by construction is not, so the two sets are disjoint and no modelled wrong method can reach the key. The sampler additionally refuses any run whose perturbed term coincides with a term already printed.'},

  ODD_E_MULT: {rc1: 'COVERED_BY_OTHER_INVARIANT', rc2: 'COVERED_BY_OTHER_INVARIANT',
    note: 'The wrong method here is applying a competing rule. AMBIGUOUS_ODD_ONE_OUT / UNDISCOVERABLE_INTENDED_RULE reject a run in which ANY approved rule other than the intended one singles out a number — strictly stronger than rejecting only when a competing rule happens to land on the key.'},
  ODD_E_SQUARES: {rc1: 'COVERED_BY_OTHER_INVARIANT', rc2: 'COVERED_BY_OTHER_INVARIANT',
    note: 'Same argument as ODD_E_MULT: the ambiguity classifier rejects any run in which an approved rule other than the intended one singles out a number, which subsumes the case where such a rule singles out the key itself.'},
  ODD_M_CUBES: {rc1: 'COVERED_BY_OTHER_INVARIANT', rc2: 'COVERED_BY_OTHER_INVARIANT',
    note: 'Same argument as ODD_E_MULT. This template is also the one whose cube sampler now chooses a square intruder whenever the run holds a lone square, so the competing rule is removed at the source rather than tolerated.'},
  ODD_M_PRIME2: {rc1: 'COVERED_BY_OTHER_INVARIANT', rc2: 'COVERED_BY_OTHER_INVARIANT',
    note: 'Same argument as ODD_E_MULT: a competing approved rule that singles out any number, key or not, is already a rejection under AMBIGUOUS_ODD_ONE_OUT.'},
  ODD_M_PRONIC: {rc1: 'COVERED_BY_OTHER_INVARIANT', rc2: 'COVERED_BY_OTHER_INVARIANT',
    note: 'Same argument as ODD_E_MULT: a competing approved rule that singles out any number, key or not, is already a rejection under AMBIGUOUS_ODD_ONE_OUT.'},
  ODD_H_SQ_MINUS: {rc1: 'COVERED_BY_OTHER_INVARIANT', rc2: 'COVERED_BY_OTHER_INVARIANT',
    note: 'Same argument as ODD_E_MULT, and the template the RC1 audit found ambiguous twice; both of those runs are now regression fixtures under RC2-007.'},
  ODD_H_TRIANGULAR: {rc1: 'COVERED_BY_OTHER_INVARIANT', rc2: 'COVERED_BY_OTHER_INVARIANT',
    note: 'Same argument as ODD_E_MULT. This template replaced ODD_H_PRIME_OFFSET, whose intended rule was undiscoverable; discoverability is enforced by UNDISCOVERABLE_INTENDED_RULE, not by a degeneracy model.'},

  // --- relational
  REL_E_CHAIN: {rc1: 'MISSING_DEGENERACY_MODEL', rc2: 'MODELLED',
    note: 'Counting the position from the wrong end of the chain. In a five-person chain the third place is the same from either end, so a learner who reads the direction backwards still answers correctly.'},
  REL_E_BETWEEN: {rc1: 'MISSING_DEGENERACY_MODEL', rc2: 'MODELLED',
    note: 'Same wrong method as REL_E_CHAIN — reading the position from the wrong end — over a chain of four or five people.'},
  REL_M_COUNT: {rc1: 'MISSING_DEGENERACY_MODEL', rc2: 'MODELLED',
    note: 'Two wrong methods are modelled — counting only the stated sentences, and counting everyone not provably below — and the item is degenerate only when both land on the key. Requiring the first alone rejected 56.7% of draws and removed the answers «لا أحد» and «شخص واحد» from the template entirely, trading a measurement defect for a larger statistical leak.'},
  REL_M_CONFIRM: {rc1: 'MISSING_DEGENERACY_MODEL', rc2: 'MODELLED',
    note: 'A guaranteed statement copied verbatim from the stem is answerable by text matching. The sampler already preferred an indirect statement; the rule declares the same requirement so the pipeline enforces it instead of it living only inside the sampler.'},
  REL_H_GUARANTEE: {rc1: 'MISSING_DEGENERACY_MODEL', rc2: 'MODELLED',
    note: 'as REL_M_CONFIRM, plus: the guaranteed statement must not be about the very pair the question declares open, or the question answers itself.'},
  REL_M_BRANCH_UNRES: {rc1: 'NOT_APPLICABLE', rc2: 'NOT_APPLICABLE',
    note: 'The key is a pair the order enumeration leaves undetermined. Every modelled wrong method resolves a pair, and a resolved pair is by construction a member of the determined set, which is disjoint from the key set. No modelled wrong method can reach the key.'},
  REL_H_POSITION: {rc1: 'COVERED_BY_OTHER_INVARIANT', rc2: 'COVERED_BY_OTHER_INVARIANT',
    note: 'The degeneracy of concern — answering «cannot be determined» without reasoning — is an answer-distribution property, not a per-item coincidence. It is measured and remediated under RC2-010 (the template answered UNDETERMINED in 91 of 91 RC1 instances; it now answers 17 distinct values) and its difficulty consequence is recorded under RC2-015.'},

  // --- fractions, the hidden-fraction direction only
  FRAC_E_2: {rc1: 'NOT_APPLICABLE', rc2: 'NOT_APPLICABLE', direction: 'findFraction',
    note: 'The forward and find-number directions declare a numeric wrongMethodValue. In the find-fraction direction the key is a name drawn from a six-element lexicon by sampling without replacement, so the misconception MISSED_ONE_FRACTION_STAGE necessarily names a different denominator, and the RC2-018 confusion (previous ÷ next) yields an integer denominator, never a fraction name. No modelled wrong method can reach the key.'},
  FRAC_M_3: {rc1: 'NOT_APPLICABLE', rc2: 'NOT_APPLICABLE', direction: 'findFraction',
    note: 'Same argument as FRAC_E_2, over three fractions instead of two: the hidden denominator is drawn without replacement from the same six-element lexicon, so no skipped stage can name it.'},
  FRAC_H_4: {rc1: 'NOT_APPLICABLE', rc2: 'NOT_APPLICABLE', direction: 'findFraction',
    note: 'Same argument as FRAC_E_2, over four fractions: the hidden denominator is drawn without replacement from the same six-element lexicon, so no skipped stage can name it.'}
};

const DEGENERACY_REASONS = [REASON.DEGENERATE_WRONG_METHOD_EQUALS_KEY, REASON.DEGENERATE_PARAMETERS];

export async function measure(drawsPerBand = 400) {
  const rows = new Map();
  // RC1 reported one number: 79.3% of published questions covered. It is kept
  // here, recomputed, so the classification and the percentage can be read
  // against each other instead of the percentage standing alone.
  let published = 0, publishedWithModel = 0;
  for (const family of FAMILIES) {
    const mod = await import(`../../src/families/${family}.js`);
    const gen = Object.values(mod).find(v => typeof v === 'function' && v.name.startsWith('generate'));
    for (const difficulty of ['easy', 'medium', 'hard']) {
      for (let i = 0; i < drawsPerBand; i++) {
        const rng = new SeededRNG(`degen-${family}-${difficulty}-${i}`);
        let base;
        try {
          base = gen({difficulty, rng: rng.fork('c'), seed: `degen-${i}`, engineVersion: 'coverage', telemetry: null});
        } catch { continue; }
        const id = base.template_id;
        const row = rows.get(id) ?? {
          templateId: id, family, difficulties: new Set(), drawn: 0,
          declaresWrongMethodValue: 0, declaresDegenerateWhen: 0,
          degenerateDraws: 0, answerType: null
        };
        row.difficulties.add(base.difficulty);
        row.drawn++;
        row.answerType = typeof base.correct;
        const ped = base.pedagogy || {};
        if (ped.wrongMethodValue !== undefined && ped.wrongMethodValue !== null) row.declaresWrongMethodValue++;
        if ((ped.degenerateWhen || []).length) row.declaresDegenerateWhen++;
        try {
          const q = finalizeQuestion(base, rng.fork('o'));
          const verdict = validateCandidate(base, q);
          if (verdict.reasons.some(r => DEGENERACY_REASONS.includes(r))) row.degenerateDraws++;
          if (verdict.valid) {
            published++;
            const modelled = (ped.wrongMethodValue !== undefined && ped.wrongMethodValue !== null)
              || (ped.degenerateWhen || []).length > 0;
            if (modelled) publishedWithModel++;
          }
        } catch { /* a finalisation failure is not a degeneracy verdict */ }
        rows.set(id, row);
      }
    }
  }

  const templates = [...rows.values()].sort((a, b) => (a.templateId < b.templateId ? -1 : 1)).map(r => {
    const modelled = r.declaresWrongMethodValue > 0 || r.declaresDegenerateWhen > 0;
    const declared = CLASSIFICATION[r.templateId];
    return {
      templateId: r.templateId,
      family: r.family,
      difficulties: [...r.difficulties].sort(),
      answerType: r.answerType,
      drawn: r.drawn,
      declaresModelOnDraws: Math.max(r.declaresWrongMethodValue, r.declaresDegenerateWhen),
      modelCoverageOfDraws: Number((Math.max(r.declaresWrongMethodValue, r.declaresDegenerateWhen) / r.drawn).toFixed(3)),
      degenerateDraws: r.degenerateDraws,
      degenerateRate: Number((r.degenerateDraws / r.drawn).toFixed(3)),
      rc1Classification: declared ? declared.rc1 : 'MODELLED',
      rc2Classification: declared ? declared.rc2 : (modelled ? 'MODELLED' : 'UNCLASSIFIED'),
      justification: declared ? declared.note : null,
      direction: declared?.direction ?? null
    };
  });

  const byClass = {};
  for (const t of templates) byClass[t.rc2Classification] = (byClass[t.rc2Classification] || 0) + 1;

  // The 23 templates the RC1 sign-off left outside the model, each kept with its
  // own verdict. The aggregate 95/8/4 is the whole engine; this table is the
  // answer to "what happened to the gap", and it must survive into the evidence
  // rather than being summarised away.
  const rc1Gap = templates
    // The RC1 gap is a fact about the RC1 sign-off, so templates that did not
    // exist then cannot join it however they are classified now. `since` marks
    // them; without this a later release could silently enlarge a historical
    // figure and the comparison it exists for would stop meaning anything.
    .filter(t => t.rc1Classification !== 'MODELLED' && !CLASSIFICATION[t.templateId]?.since)
    .map(t => ({
      templateId: t.templateId,
      family: t.family,
      direction: t.direction,
      answerType: t.answerType,
      rc1Verdict: t.rc1Classification,
      rc2Verdict: t.rc2Classification,
      // A: now carries a model of its own.
      // B: a different invariant rejects the same failure, and it is named.
      // C: no modelled wrong method can reach the key, and the argument is given.
      band: t.rc2Classification === 'MODELLED' ? 'A_MODELLED'
        : t.rc2Classification === 'COVERED_BY_OTHER_INVARIANT' ? 'B_COVERED_BY_OTHER_INVARIANT'
          : 'C_NOT_APPLICABLE',
      declaresModelOnDraws: t.declaresModelOnDraws,
      modelCoverageOfDraws: t.modelCoverageOfDraws,
      degenerateDraws: t.degenerateDraws,
      degenerateRate: t.degenerateRate,
      justification: t.justification
    }));
  const rc1GapByBand = {};
  for (const r of rc1Gap) rc1GapByBand[r.band] = (rc1GapByBand[r.band] || 0) + 1;

  return {
    schema: 'rc2-degeneracy-coverage-v1',
    scopeItem: 'RC2-005',
    generatedAt: new Date().toISOString(),
    drawsPerFamilyPerBand: drawsPerBand,
    totals: {
      templates: templates.length,
      byRc2Classification: byClass,
      rc1TemplatesWithNoModel: templates.filter(t =>
        t.rc1Classification !== 'MODELLED' && !CLASSIFICATION[t.templateId]?.since).length,
      publishedSampled: published,
      publishedWithDeclaredModel: publishedWithModel,
      publishedModelCoverage: published ? Number((publishedWithModel / published).toFixed(3)) : 0,
      rc1PublishedModelCoverage: 0.793,
      unclassified: templates.filter(t => t.rc2Classification === 'UNCLASSIFIED').map(t => t.templateId),
      declaredButAbsentFromEngine: Object.keys(CLASSIFICATION).filter(id => !templates.some(t => t.templateId === id))
    },
    // RC2-005 evidence: the RC1 gap, template by template, not only in aggregate.
    rc1Gap: {
      count: rc1Gap.length,
      rc1ReportedCount: 23,
      byBand: rc1GapByBand,
      templates: rc1Gap
    },
    templates
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const report = await measure(Number(process.argv[2] ?? 400));
  mkdirSync('rc2', {recursive: true});
  writeFileSync('rc2/DEGENERACY_COVERAGE.json', JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report.totals, null, 2));
  console.log('\nthe RC1 gap, template by template:');
  for (const r of report.rc1Gap.templates) {
    console.log('  ', r.templateId.padEnd(20), r.family.padEnd(14), r.band.padEnd(30),
      r.direction ? `(${r.direction})` : '', 'degenerateRate', r.degenerateRate);
  }
  console.log('  bands:', JSON.stringify(report.rc1Gap.byBand));
}
