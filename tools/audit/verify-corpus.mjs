#!/usr/bin/env node
// SIGN-OFF ITEMS 3, 4, 6, 10 — independent re-verification of a published corpus.
//
// NOT production code, and it does not call the engine's accept/reject path.
// For every published question it rebuilds the *pre-shuffle* candidate from the
// recorded seed, runs the independent oracle over the statement, then locates
// the oracle's answer among the six published letters and compares that letter
// to the published key. That is the full
//   solve -> build options -> shuffle -> assign A-F -> locate answer -> compare
// chain required by item 10, checked from outside the generator.

import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {SeededRNG} from '../../src/rng.js';
import {runOracle} from '../../src/qa/pipeline.js';
import {LETTERS, parseLeadingNumber, DAYS_AR} from '../../src/utils.js';
import {Fraction} from '../../src/qa/fraction.js';

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

function read(path) {
  const buf = readFileSync(path);
  const text = path.endsWith('.gz') ? gunzipSync(buf).toString('utf8') : buf.toString('utf8');
  return text.split('\n').filter(Boolean).map(l => JSON.parse(l));
}

/** Which letters carry the oracle's answer, judged from outside the generator. */
function lettersCarryingOracleAnswer(base, q, res) {
  const spec = base.oracle;
  if (spec.kind === 'ruleset') {
    return LETTERS.filter(l => parseLeadingNumber(q.options[l]) === Number(res.answer));
  }
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

export function verify(items, label) {
  const perTemplate = new Map();
  const tally = {
    n: 0, rebuildFailures: [], oracleRan: 0, oracleNotRun: 0, notRunReasons: {},
    oracleDisagreement: 0, oracleNoSolution: 0, oracleNonUnique: 0, ambiguous: 0,
    postShuffleKeyMismatch: 0, zeroCorrectOption: 0, multipleCorrectOptions: 0,
    correctValueMismatch: 0, metaKeyMismatch: 0,
    disagreementExamples: [], mismatchExamples: []
  };
  const askedUnknown = new Map();       // family -> {direction: n}
  const degenerate = {n: 0, covered: 0, uncovered: 0, degenerateWhenFired: 0, examples: [], whenExamples: [], uncoveredTemplates: {}};

  for (const q of items) {
    tally.n++;
    const tid = q.metadata?.template_id || q.generator_id;
    const row = perTemplate.get(tid) || {
      family: q.family, templateId: tid, n: 0, oracleRan: 0, oracleAgreed: 0,
      keyMatched: 0, flags: new Set()
    };
    row.n++;

    // --- rebuild the pre-shuffle candidate from the recorded seed ---
    let base = null;
    try {
      const rng = new SeededRNG(q.seed);
      base = GENERATORS[q.family]({
        difficulty: q.difficulty, rng: rng.fork('content'),
        seed: q.seed, engineVersion: q.metadata.engine_version
      });
    } catch (err) {
      tally.rebuildFailures.push({id: q.id, message: err.message});
      row.flags.add('REBUILD_FAILED');
      perTemplate.set(tid, row);
      continue;
    }
    if (String(base.template_id) !== String(tid)) {
      tally.rebuildFailures.push({id: q.id, message: `template drift ${base.template_id} != ${tid}`});
      row.flags.add('REBUILD_DRIFT');
      perTemplate.set(tid, row);
      continue;
    }

    // --- independent oracle over the statement ---
    const res = runOracle(base, q);
    if (!res.ran) {
      tally.oracleNotRun++;
      const why = typeof res.detail === 'string' ? res.detail : 'unknown';
      tally.notRunReasons[why] = (tally.notRunReasons[why] || 0) + 1;
      row.flags.add('ORACLE_NOT_RUN');
    } else {
      tally.oracleRan++; row.oracleRan++;
      if (res.reasons.includes('ORACLE_NO_SOLUTION')) tally.oracleNoSolution++;
      if (res.reasons.includes('ORACLE_NON_UNIQUE')) tally.oracleNonUnique++;
      if (res.reasons.includes('AMBIGUOUS_ODD_ONE_OUT')) tally.ambiguous++;
      if (res.reasons.includes('ORACLE_DISAGREEMENT')) {
        tally.oracleDisagreement++;
        row.flags.add('ORACLE_DISAGREEMENT');
        if (tally.disagreementExamples.length < 10) {
          tally.disagreementExamples.push({id: q.id, templateId: tid, detail: res.detail});
        }
      } else {
        row.oracleAgreed++;
        // --- post-shuffle key integrity ---
        const carriers = lettersCarryingOracleAnswer(base, q, res);
        if (carriers.length === 0) { tally.zeroCorrectOption++; row.flags.add('ZERO_CORRECT_OPTION'); }
        else if (carriers.length > 1) { tally.multipleCorrectOptions++; row.flags.add('MULTIPLE_CORRECT_OPTIONS'); }
        if (carriers.length !== 1 || carriers[0] !== q.correct_option) {
          tally.postShuffleKeyMismatch++;
          row.flags.add('POST_SHUFFLE_KEY_MISMATCH');
          if (tally.mismatchExamples.length < 10) {
            tally.mismatchExamples.push({id: q.id, templateId: tid, published: q.correct_option, carriers});
          }
        } else {
          row.keyMatched++;
        }
      }
    }

    // --- independent structural re-checks ---
    if (q.options?.[q.correct_option] !== q.correct_value) { tally.correctValueMismatch++; row.flags.add('CORRECT_VALUE_MISMATCH'); }
    const metaCorrect = LETTERS.filter(l => q.metadata?.options_meta?.[l]?.correct === true);
    if (metaCorrect.length !== 1 || metaCorrect[0] !== q.correct_option) { tally.metaKeyMismatch++; row.flags.add('META_KEY_MISMATCH'); }

    // --- askedUnknown distribution ---
    const dir = q.metadata?.asked_unknown || '(none)';
    const fam = askedUnknown.get(q.family) || new Map();
    fam.set(dir, (fam.get(dir) || 0) + 1);
    askedUnknown.set(q.family, fam);

    // --- degenerate published question: a declared wrong method reaching the key ---
    const p = base.pedagogy || {};
    if (p.targetMisconception && Number.isFinite(p.wrongMethodValue)) {
      degenerate.covered++;
      const c = Number(base.correct);
      if (Number.isFinite(c) && Math.abs(p.wrongMethodValue - c) < EPS) {
        degenerate.n++;
        if (degenerate.examples.length < 10) degenerate.examples.push({id: q.id, templateId: tid, wrongMethodValue: p.wrongMethodValue, correct: c});
      }
    } else {
      degenerate.uncovered++;
      degenerate.uncoveredTemplates[tid] = (degenerate.uncoveredTemplates[tid] || 0) + 1;
    }
    for (const rule of p.degenerateWhen || []) {
      if (rule && rule.when) {
        degenerate.degenerateWhenFired++;
        if (degenerate.whenExamples.length < 10) degenerate.whenExamples.push({id: q.id, templateId: tid, note: rule.note});
      }
    }
    perTemplate.set(tid, row);
  }

  const templates = [...perTemplate.values()]
    .map(r => ({...r, flags: [...r.flags]}))
    .sort((a, b) => a.family.localeCompare(b.family) || a.templateId.localeCompare(b.templateId));

  return {
    label, tally, templates, degenerate,
    askedUnknown: Object.fromEntries([...askedUnknown].map(([f, m]) => [f, Object.fromEntries([...m].sort((a,b)=>b[1]-a[1]))]))
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const out = {};
  for (const arg of process.argv.slice(2)) {
    const [label, path] = arg.includes('=') ? arg.split('=') : ['corpus', arg];
    const items = read(path).map(x => (x && typeof x.question === 'object' && x.question !== null ? x.question : x));
    console.error(`verifying ${label}: ${items.length} items from ${path}`);
    out[label] = verify(items, label);
  }
  process.stdout.write(JSON.stringify(out, null, 2));
}
