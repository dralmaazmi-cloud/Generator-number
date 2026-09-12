#!/usr/bin/env node
// BLIND-AUDIT DELIVERY — builds the reviewer-facing JSONL from the frozen RC1
// sample. NOT production code.
//
// Every record carries the frozen question object verbatim under
// `frozen_question`, so "unchanged" can be checked by diffing it against
// audit-rc1/audit-sample.jsonl. Everything the reviewer additionally asked for
// sits beside it under `audit`, and is DERIVED, never edited in:
//
//   params        the parameter object the production solver consumed. Read from
//                 the frozen output, and independently cross-checked against a
//                 rebuild of the candidate from its recorded seed. Any
//                 divergence is reported, not silently reconciled.
//   oracleResult  the independent oracle re-run over the published statement,
//                 plus the post-shuffle locate-and-compare, with a PASS/FAIL.
//   arabicFlag    the known-defect detector run over the frozen stem. It marks;
//                 it never removes, reorders or corrects anything.
//
// Nothing here regenerates a question, and no field of a frozen question is
// written to.

import {readFileSync, writeFileSync} from 'node:fs';
import {SeededRNG} from '../../src/rng.js';
import {runOracle} from '../../src/qa/pipeline.js';
import {LETTERS, parseLeadingNumber, DAYS_AR} from '../../src/utils.js';

import {generateSequences} from '../../src/families/sequences.js';
import {generateRatios} from '../../src/families/ratios.js';
import {generatePercentages} from '../../src/families/percentages.js';
import {generateAverages} from '../../src/families/averages.js';
import {generateAges} from '../../src/families/ages.js';
import {generateSpeed} from '../../src/families/speed.js';
import {generateWorkTime} from '../../src/families/work_time.js';
import {generateMachines} from '../../src/families/machines.js';
import {generateDirectProportion} from '../../src/families/direct_proportion.js';
import {generateFractions} from '../../src/families/fractions.js';
import {generateUnitRate} from '../../src/families/unit_rate.js';
import {generateCombinedRate} from '../../src/families/combined_rate.js';
import {generateRelational} from '../../src/families/relational.js';
import {generateCalendar} from '../../src/families/calendar.js';
import {generateOddOneOut} from '../../src/families/odd_one_out.js';
import {generateProfitLoss} from '../../src/families/profit_loss.js';

const GENERATORS = {
  sequences: generateSequences, ratios: generateRatios, percentages: generatePercentages,
  averages: generateAverages, ages: generateAges, speed: generateSpeed,
  work_time: generateWorkTime, machines: generateMachines,
  direct_proportion: generateDirectProportion, fractions: generateFractions,
  unit_rate: generateUnitRate, combined_rate: generateCombinedRate,
  relational: generateRelational, calendar: generateCalendar,
  odd_one_out: generateOddOneOut, profit_loss: generateProfitLoss
};

const EPS = 1e-9;
const NA = 'NOT_AVAILABLE_IN_RC1';
const present = v => (v === undefined ? NA : v);

// --- the known Arabic defect, as a detector over the frozen text -----------
// A definite plural followed by a bare numeral: "متوسط القيم 9". This is the
// defect reported in SIGNOFF_RC1.md section 8. The detector reads; it does not
// alter the question, its options, its key or its inclusion in the sample.
const ARABIC_DEFECT = {
  id: 'AR_DEFINITE_PLURAL_BARE_NUMERAL',
  description: 'اسم جمع معرّف متبوع برقم مجرّد بدل عدد موافق (مثال: «متوسط القيم 9» بدل «متوسط القيم التسع»)',
  reference: 'SIGNOFF_RC1.md §8',
  pattern: /القيم\s+\d+/g
};

function detectArabic(q) {
  const targets = [
    ['stem', q.question],
    ...(q.explanation?.steps || []).map((s, i) => [`explanation.steps[${i}]`, s]),
    ['explanation.how_to_start', q.explanation?.how_to_start],
    ['explanation.answer', q.explanation?.answer],
    ['explanation.fast_method', q.explanation?.fast_method],
    ['explanation.remember', q.explanation?.remember]
  ];
  const hits = [];
  for (const [where, text] of targets) {
    if (typeof text !== 'string') continue;
    for (const m of text.matchAll(ARABIC_DEFECT.pattern)) hits.push({where, matched: m[0]});
  }
  return hits.length
    ? {flagged: true, defectId: ARABIC_DEFECT.id, description: ARABIC_DEFECT.description,
       reference: ARABIC_DEFECT.reference, occurrences: hits, inStem: hits.some(h => h.where === 'stem')}
    : {flagged: false};
}

// --- post-shuffle locate, judged from outside the generator ----------------
function lettersCarrying(base, q, res) {
  const spec = base.oracle;
  if (spec.kind === 'ruleset') return LETTERS.filter(l => parseLeadingNumber(q.options[l]) === Number(res.answer));
  if (spec.kind === 'order') {
    const allowed = new Set((res.display || []).map(String));
    return LETTERS.filter(l => allowed.has(String(q.options[l])));
  }
  if (spec.labels) {
    const label = spec.labels[res.answer.toDecimalString()];
    return LETTERS.filter(l => q.options[l] === label);
  }
  if (spec.answerKind === 'dayIndex') {
    const day = DAYS_AR[Number(res.answer.toDecimalString())];
    return LETTERS.filter(l => q.options[l] === day);
  }
  const target = res.answer.toNumber();
  return LETTERS.filter(l => {
    const raw = q.metadata?.options_meta?.[l]?.value;
    const v = typeof raw === 'number' ? raw : parseLeadingNumber(q.options[l]);
    return v !== null && Number.isFinite(v) && Math.abs(v - target) < EPS;
  });
}

function oracleAnswerText(base, res) {
  if (!res.ran) return NA;
  const spec = base.oracle;
  if (spec.kind === 'order') return Array.isArray(res.answer) ? res.answer.map(String) : String(res.answer);
  if (spec.kind === 'ruleset') return Number(res.answer);
  if (spec.labels) return spec.labels[res.answer.toDecimalString()] ?? res.answer.toDecimalString();
  if (spec.answerKind === 'dayIndex') return DAYS_AR[Number(res.answer.toDecimalString())];
  return res.answer.toDecimalString();
}

// --- build -----------------------------------------------------------------
const rows = readFileSync('audit-rc1/audit-sample.jsonl', 'utf8')
  .split('\n').filter(Boolean).map(l => JSON.parse(l));

const bySession = new Map();
const summary = {
  total: 0, arabicFlagged: 0, arabicFlaggedInStem: 0,
  oraclePass: 0, oracleFail: 0, paramsMatchedRebuild: 0, paramsDiverged: [], rebuildFailures: []
};

const out = [];
for (const row of rows) {
  const q = row.question;
  summary.total++;

  // rebuild the pre-shuffle candidate from the recorded seed
  let base = null, rebuildError = null;
  try {
    const rng = new SeededRNG(q.seed);
    base = GENERATORS[q.family]({
      difficulty: q.difficulty, rng: rng.fork('content'),
      seed: q.seed, engineVersion: q.metadata.engine_version
    });
  } catch (err) { rebuildError = err.message; summary.rebuildFailures.push({id: q.id, message: err.message}); }

  const frozenParams = q.metadata?.parameters;
  let paramsSource = 'frozen output (metadata.parameters)';
  if (base) {
    const same = JSON.stringify(base.parameters) === JSON.stringify(frozenParams);
    if (same) summary.paramsMatchedRebuild++;
    else {
      paramsSource = 'frozen output (metadata.parameters) — DIVERGES from rebuild, reported not reconciled';
      summary.paramsDiverged.push({id: q.id, frozen: frozenParams, rebuilt: base.parameters});
    }
  }

  let oracleResult;
  if (!base) {
    oracleResult = {verdict: 'FAIL', reason: 'CANDIDATE_REBUILD_FAILED', detail: rebuildError};
    summary.oracleFail++;
  } else {
    const res = runOracle(base, q);
    if (!res.ran) {
      oracleResult = {verdict: 'FAIL', reason: 'ORACLE_DID_NOT_RUN', detail: res.detail};
      summary.oracleFail++;
    } else {
      const carriers = lettersCarrying(base, q, res);
      const exactlyOne = carriers.length === 1;
      const keyMatches = exactlyOne && carriers[0] === q.correct_option;
      const clean = !res.reasons.length && exactlyOne && keyMatches;
      oracleResult = {
        oracleKind: base.oracle.kind || 'constraint',
        oracleAnswer: oracleAnswerText(base, res),
        oracleReasons: res.reasons,
        lettersCarryingOracleAnswer: carriers,
        exactlyOneDisplayedOptionMatches: exactlyOne,
        publishedKey: q.correct_option,
        publishedKeyMatchesThatOption: keyMatches,
        postShuffleKeyMismatch: !keyMatches,
        verdict: clean ? 'PASS' : 'FAIL',
        detail: res.detail
      };
      clean ? summary.oraclePass++ : summary.oracleFail++;
    }
  }

  const arabicFlag = detectArabic(q);
  if (arabicFlag.flagged) {
    summary.arabicFlagged++;
    if (arabicFlag.inStem) summary.arabicFlaggedInStem++;
  }

  const record = {
    sessionId: row.session,
    sessionKind: row.session_kind,
    sessionSeed: row.session_seed,
    questionNumber: row.position,
    auditSeed: row.audit_seed,

    family: q.family,
    familyAr: q.family_ar,
    templateId: present(q.metadata?.template_id),
    difficulty: q.difficulty,
    askedUnknown: present(q.metadata?.asked_unknown),
    reasoningDirection: present(q.metadata?.asked_unknown),
    reasoningGraph: q.metadata?.reasoning_graph ?? null,

    stem: q.question,
    displayExpression: q.display_expression ?? null,
    options: q.options,
    publishedKey: q.correct_option,
    publishedCorrectValue: q.correct_value,

    explanation: {
      howToStart: present(q.explanation?.how_to_start),
      steps: present(q.explanation?.steps),
      answer: present(q.explanation?.answer),
      quickMethod: present(q.explanation?.fast_method),
      reminder: present(q.explanation?.remember)
    },
    optionFeedback: present(q.explanation?.distractor_analysis),
    distractorProvenance: present(q.metadata?.options_meta),

    fingerprint: present(q.metadata?.fingerprint),
    validationMetadata: present(q.metadata?.validation_meta),
    complexity: {
      score: present(q.metadata?.complexity_score),
      band: present(q.metadata?.complexity_band),
      factors: present(q.metadata?.complexity_factors)
    },
    numericRank: present(q.metadata?.correct_numeric_rank),  // null = the key has no numeric rank (label answer)
    feasibleRankRange: present(q.metadata?.feasible_rank_range),  // null = rank balancing did not apply to this instance

    generation: {
      questionId: q.id,
      seed: q.seed,
      generatorId: q.generator_id,
      engineVersion: present(q.metadata?.engine_version),
      reproduce: `new SeededRNG(${JSON.stringify(q.seed)}).fork('content') -> ${q.family} generator @ difficulty ${q.difficulty}`
    },

    audit: {
      params: present(frozenParams),
      paramsSource,
      oracleResult,
      arabicFlag
    },

    frozen_question: q
  };

  out.push(JSON.stringify(record));
  if (!bySession.has(row.session)) bySession.set(row.session, []);
  bySession.get(row.session).push(JSON.stringify(record));
}

writeFileSync('audit-rc1/blind-audit-250.jsonl', out.join('\n') + '\n');
for (const [sid, lines] of bySession) {
  writeFileSync(`audit-rc1/blind-audit-${sid}.jsonl`, lines.join('\n') + '\n');
}
writeFileSync('audit-rc1/blind-audit-summary.json', JSON.stringify(summary, null, 2));

console.log(JSON.stringify({
  total: summary.total,
  sessions: [...bySession.keys()],
  perSession: Object.fromEntries([...bySession].map(([k, v]) => [k, v.length])),
  oraclePass: summary.oraclePass, oracleFail: summary.oracleFail,
  paramsMatchedRebuild: summary.paramsMatchedRebuild,
  paramsDiverged: summary.paramsDiverged.length,
  rebuildFailures: summary.rebuildFailures.length,
  arabicFlagged: summary.arabicFlagged, arabicFlaggedInStem: summary.arabicFlaggedInStem
}, null, 2));
