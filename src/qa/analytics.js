// Section 6 / 45. Watching the rejection rate itself.
//
// A validator rejecting candidates is doing its job, but a *template* whose
// candidates are rejected most of the time does not have a strict validator —
// it has a broken parameter sampler. These figures are what make that
// distinguishable, per family, per template and per difficulty.

function emptyCell() {
  return {candidates: 0, accepted: 0, rejected: 0, reasons: {}, attempts: [], latencies: [], exhaustions: 0};
}

export class GenerationAnalytics {
  constructor() {
    this.cells = new Map();
    this.startedAt = Date.now();
  }

  _cell(family, templateId, difficulty) {
    const key = `${family}|${templateId ?? '?'}|${difficulty ?? '?'}`;
    if (!this.cells.has(key)) this.cells.set(key, {family, templateId, difficulty, ...emptyCell()});
    return this.cells.get(key);
  }

  record(family, templateId, difficulty, {accepted, reasons = []}) {
    const cell = this._cell(family, templateId, difficulty);
    cell.candidates++;
    if (accepted) cell.accepted++;
    else {
      cell.rejected++;
      for (const r of reasons) cell.reasons[r] = (cell.reasons[r] || 0) + 1;
    }
  }

  recordPublished(family, templateId, difficulty, attempts, latencyMs) {
    const cell = this._cell(family, templateId, difficulty);
    cell.attempts.push(attempts);
    cell.latencies.push(latencyMs);
  }

  recordExhaustion(family, templateId) {
    const cell = this._cell(family, templateId, 'any');
    cell.exhaustions++;
  }

  snapshot() {
    const byTemplate = [];
    let candidates = 0, accepted = 0, rejected = 0, exhaustions = 0;
    const allAttempts = [];
    const allLatencies = [];
    const reasonTotals = {};

    for (const cell of this.cells.values()) {
      candidates += cell.candidates;
      accepted += cell.accepted;
      rejected += cell.rejected;
      exhaustions += cell.exhaustions;
      allAttempts.push(...cell.attempts);
      allLatencies.push(...cell.latencies);
      for (const [r, n] of Object.entries(cell.reasons)) reasonTotals[r] = (reasonTotals[r] || 0) + n;
      byTemplate.push({
        family: cell.family,
        template_id: cell.templateId,
        difficulty: cell.difficulty,
        candidates: cell.candidates,
        published: cell.attempts.length,
        reject_rate: cell.candidates ? cell.rejected / cell.candidates : 0,
        average_attempts: mean(cell.attempts),
        p95_attempts: percentile(cell.attempts, 95),
        latency_p50_ms: percentile(cell.latencies, 50),
        latency_p95_ms: percentile(cell.latencies, 95),
        reasons: {...cell.reasons},
        exhaustions: cell.exhaustions
      });
    }

    return {
      candidates,
      accepted,
      rejected,
      candidate_reject_rate: candidates ? rejected / candidates : 0,
      average_attempts_per_published: mean(allAttempts),
      p95_attempts: percentile(allAttempts, 95),
      retry_exhaustion_count: exhaustions,
      retry_exhaustion_rate: allAttempts.length ? exhaustions / (allAttempts.length + exhaustions) : 0,
      generation_latency_p50_ms: percentile(allLatencies, 50),
      generation_latency_p95_ms: percentile(allLatencies, 95),
      reason_totals: reasonTotals,
      by_template: byTemplate.sort((a, b) => b.reject_rate - a.reject_rate),
      // Section 5: templates a sampler fix should be aimed at.
      samplers_needing_attention: byTemplate.filter(t => t.candidates >= 20 && t.reject_rate > 0.5)
        .map(t => ({template_id: t.template_id, difficulty: t.difficulty, reject_rate: t.reject_rate, reasons: t.reasons}))
    };
  }
}

function mean(values) {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx];
}
