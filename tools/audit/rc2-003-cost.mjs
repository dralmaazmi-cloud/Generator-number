// RC2-003 — what the newly visible internal rejection activity actually costs.
//
// Making the hidden layer visible turned up a large number: DISTRACTOR_IMPOSSIBLE
// fires roughly once every two published questions, and SAMPLER_CONSTRAINT more
// often than that. A reconciliation that balances says those events are
// accounted for; it does not say they are cheap. This measures the cost.
//
// The two kinds of activity have different prices, and reporting one total would
// hide that:
//
//   FREE OF RETRIES   a distractor dropped inside pool construction
//                     (DISTRACTOR_IMPOSSIBLE) costs no attempt. It narrows the
//                     pool, and only matters when the pool falls below five.
//   COSTS AN ATTEMPT  a sampler that gives up, a finalisation that cannot reach
//                     five distractors, a pipeline rejection. Each burns one of
//                     the fifty attempts and adds its own latency.
//
// So the causal question is not "how many drops?" but "how often does dropping
// push a pool below five?", and the answer to that is the finalisation failure
// count, reported per template alongside the drop rate that drives it.

import {writeFileSync, mkdirSync} from 'node:fs';
import Engine from '../../src/index.js';
import {SeededRNG} from '../../src/rng.js';
import {finalizeQuestion} from '../../src/utils.js';
import {validateCandidate} from '../../src/qa/pipeline.js';

const FAMILIES = [
  'sequences', 'ratios', 'percentages', 'averages', 'ages', 'speed', 'work_time',
  'machines', 'direct_proportion', 'fractions', 'unit_rate', 'combined_rate',
  'relational', 'calendar', 'odd_one_out', 'profit_loss'
];

/**
 * The retry loop hides per-template cost: a template that fails half its draws
 * still publishes at a mean of a little over one attempt, because the engine
 * simply draws again. This measures the RAW rate — how often a single draw of
 * each template fails to reach a publishable question — so the absorbed cost is
 * on the record rather than only its absorbed form.
 */
async function drawLevelFailureRates(drawsPerBand = 250) {
  const rows = {};
  for (const family of FAMILIES) {
    const mod = await import(`../../src/families/${family}.js`);
    const gen = Object.values(mod).find(v => typeof v === 'function' && v.name.startsWith('generate'));
    for (const difficulty of BANDS) {
      for (let i = 0; i < drawsPerBand; i++) {
        const rng = new SeededRNG(`rc2-003-draw-${family}-${difficulty}-${i}`);
        let base;
        try {
          base = gen({difficulty, rng: rng.fork('c'), seed: `d${i}`, engineVersion: 'cost', telemetry: null});
        } catch { continue; }
        const r = rows[base.template_id] ??= {templateId: base.template_id, family, draws: 0, finalizationFailures: 0, pipelineRejections: 0};
        r.draws++;
        let q;
        try { q = finalizeQuestion(base, rng.fork('o')); } catch { r.finalizationFailures++; continue; }
        if (!validateCandidate(base, q).valid) r.pipelineRejections++;
      }
    }
  }
  return rows;
}

const BANDS = ['easy', 'medium', 'hard'];

const mean = xs => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
function percentile(xs, p) {
  if (!xs.length) return 0;
  const sorted = [...xs].sort((a, b) => a - b);
  const i = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[i];
}

export async function measure({questions = 3000, seedPrefix = 'rc2-003-cost'} = {}) {
  const engine = new Engine();
  const attempts = [];
  const latencies = [];
  const perTemplate = {};
  let published = 0;
  const exhaustions = [];

  for (let i = 0; i < questions; i++) {
    const seed = `${seedPrefix}-${i}`;
    const t0 = performance.now();
    let q;
    try {
      q = engine.generateQuestion({family: 'random', difficulty: BANDS[i % 3], seed});
    } catch (err) {
      exhaustions.push({seed, code: err.code, family: err.family, templateId: err.templateId,
        reasons: err.rejectionReasonsSummary});
      continue;
    }
    const ms = performance.now() - t0;
    published++;
    const a = q.metadata.validation_meta.attempts;
    attempts.push(a);
    latencies.push(ms);
    const t = perTemplate[q.generator_id] ??= {
      templateId: q.generator_id, family: q.family, published: 0, attempts: [], latencies: []
    };
    t.published++;
    t.attempts.push(a);
    t.latencies.push(ms);
  }

  const telemetry = engine.getTelemetry();
  const events = engine.telemetry.events;

  // Attribute the two work codes to the template they happened under. A
  // distractor drop is recorded before the template is known, so it is
  // attributed by family.
  const dropsByFamily = {};
  const resamplesByTemplate = {};
  const finalizationByTemplate = {};
  for (const e of events) {
    if (e.stage === 'distractor_filter') dropsByFamily[e.family] = (dropsByFamily[e.family] || 0) + 1;
    if (e.stage === 'family_sampler' && e.templateId) {
      resamplesByTemplate[e.templateId] = (resamplesByTemplate[e.templateId] || 0) + 1;
    }
    if (e.stage === 'finalization' && e.templateId) {
      finalizationByTemplate[e.templateId] = (finalizationByTemplate[e.templateId] || 0) + 1;
    }
  }

  const publishedByFamily = {};
  for (const t of Object.values(perTemplate)) {
    publishedByFamily[t.family] = (publishedByFamily[t.family] || 0) + t.published;
  }

  const drawRates = await drawLevelFailureRates();

  const templates = Object.values(perTemplate)
    .map(t => ({
      templateId: t.templateId,
      family: t.family,
      published: t.published,
      meanAttempts: Number(mean(t.attempts).toFixed(3)),
      p95Attempts: percentile(t.attempts, 95),
      maxAttempts: Math.max(...t.attempts),
      latencyP50Ms: Number(percentile(t.latencies, 50).toFixed(2)),
      latencyP95Ms: Number(percentile(t.latencies, 95).toFixed(2)),
      finalizationFailures: finalizationByTemplate[t.templateId] ?? 0,
      samplerResamples: resamplesByTemplate[t.templateId] ?? 0,
      // The unabsorbed rate: how often one draw of this template fails.
      drawLevelFinalizationFailureRate: drawRates[t.templateId]
        ? Number((drawRates[t.templateId].finalizationFailures / drawRates[t.templateId].draws).toFixed(3)) : null,
      drawLevelPipelineRejectionRate: drawRates[t.templateId]
        ? Number((drawRates[t.templateId].pipelineRejections / drawRates[t.templateId].draws).toFixed(3)) : null,
      drawsSampled: drawRates[t.templateId]?.draws ?? 0
    }))
    .sort((a, b) => b.meanAttempts - a.meanAttempts);

  const families = Object.keys(publishedByFamily).sort().map(f => ({
    family: f,
    published: publishedByFamily[f],
    distractorDrops: dropsByFamily[f] ?? 0,
    dropsPerPublished: Number(((dropsByFamily[f] ?? 0) / publishedByFamily[f]).toFixed(3))
  })).sort((a, b) => b.dropsPerPublished - a.dropsPerPublished);

  return {
    schema: 'rc2-003-rejection-cost-v1',
    scopeItem: 'RC2-003',
    generatedAt: new Date().toISOString(),
    corpus: {requested: questions, published, seedPrefix},
    cost: {
      meanAttemptsPerPublished: Number(mean(attempts).toFixed(4)),
      p95Attempts: percentile(attempts, 95),
      p99Attempts: percentile(attempts, 99),
      maxAttempts: attempts.length ? Math.max(...attempts) : 0,
      firstAttemptShare: Number((attempts.filter(a => a === 1).length / (attempts.length || 1)).toFixed(4)),
      retryExhaustions: exhaustions.length,
      retryExhaustionRate: Number((exhaustions.length / questions).toFixed(5)),
      retryBudget: engine.config.maxGenerationAttempts,
      latencyP50Ms: Number(percentile(latencies, 50).toFixed(2)),
      latencyP95Ms: Number(percentile(latencies, 95).toFixed(2)),
      latencyP99Ms: Number(percentile(latencies, 99).toFixed(2)),
      latencyMaxMs: Number((latencies.length ? Math.max(...latencies) : 0).toFixed(2))
    },
    activity: {
      // Work that narrows a pool but burns no attempt.
      distractorDrops: telemetry.byReason.DISTRACTOR_IMPOSSIBLE ?? 0,
      distractorDropsPerPublished: Number(((telemetry.byReason.DISTRACTOR_IMPOSSIBLE ?? 0) / (published || 1)).toFixed(3)),
      samplerResamples: telemetry.familyResamples,
      samplerResamplesPerProposal: telemetry.internalResamplesPerProposal,
      // Work that does burn an attempt.
      samplerFailures: telemetry.samplerFailures,
      finalizationFailures: telemetry.finalizationFailures,
      pipelineRejectedCandidates: telemetry.pipelineRejectedCandidates,
      attemptsBurnedByRejection: telemetry.samplerFailures + telemetry.finalizationFailures
        + telemetry.pipelineRejectedCandidates,
      attemptsBurnedPerPublished: Number(((telemetry.samplerFailures + telemetry.finalizationFailures
        + telemetry.pipelineRejectedCandidates) / (published || 1)).toFixed(4))
    },
    // The same cost seen without the retry loop absorbing it.
    unabsorbed: {
      note: 'Per-draw failure rates. The engine retries, so these do not appear in meanAttemptsPerPublished; they are reported because a template that fails half its draws is doing real work that the mean hides.',
      worstTemplates: Object.values(drawRates)
        .map(r => ({
          templateId: r.templateId, family: r.family, draws: r.draws,
          finalizationFailureRate: Number((r.finalizationFailures / r.draws).toFixed(3)),
          pipelineRejectionRate: Number((r.pipelineRejections / r.draws).toFixed(3)),
          combinedFailureRate: Number(((r.finalizationFailures + r.pipelineRejections) / r.draws).toFixed(3))
        }))
        .filter(r => r.combinedFailureRate > 0.05)
        .sort((a, b) => b.combinedFailureRate - a.combinedFailureRate)
    },
    reconciliation: telemetry.reconciliation,
    byReason: telemetry.byReason,
    exhaustions,
    families,
    templates
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const report = await measure({questions: Number(process.argv[2] ?? 3000)});
  mkdirSync('rc2', {recursive: true});
  writeFileSync('rc2/RC2_003_REJECTION_COST.json', JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({corpus: report.corpus, cost: report.cost, activity: report.activity}, null, 2));
  console.log('\nfamilies by distractor drops per published question:');
  for (const f of report.families) console.log('  ', f.family.padEnd(20), f.dropsPerPublished, `(${f.distractorDrops} drops / ${f.published} published)`);
  console.log('\ntemplates whose raw draws fail above 5% (absorbed by retries):');
  for (const t of report.unabsorbed.worstTemplates.slice(0, 15)) {
    console.log('  ', t.templateId.padEnd(22), t.family.padEnd(16), 'finalise', String(t.finalizationFailureRate).padEnd(6), 'pipeline', String(t.pipelineRejectionRate).padEnd(6), 'combined', t.combinedFailureRate);
  }
  console.log('\ntemplates by mean attempts:');
  for (const t of report.templates.slice(0, 12)) {
    console.log('  ', t.templateId.padEnd(22), 'mean', String(t.meanAttempts).padEnd(7), 'p95', String(t.p95Attempts).padEnd(4),
      'max', String(t.maxAttempts).padEnd(4), 'finalFail', String(t.finalizationFailures).padEnd(5), 'p95ms', t.latencyP95Ms);
  }
}
