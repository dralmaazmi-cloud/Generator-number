#!/usr/bin/env node
// SIGN-OFF ITEMS 4 and 6 — metrics recomputed from raw data only.
// NOT production code; it never calls the generator.

import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';

const read = p => {
  const b = readFileSync(p);
  return (p.endsWith('.gz') ? gunzipSync(b).toString('utf8') : b.toString('utf8'))
    .split('\n').filter(Boolean).map(l => JSON.parse(l));
};
const pct = (a, b) => (b ? (100 * a / b) : 0);

const corpus = read('qa-artifacts/corpus.jsonl.gz');
const auditRows = read('audit-rc1/audit-sample.jsonl');
const hard = read('qa-artifacts/hard-sessions.jsonl');
const verify = JSON.parse(readFileSync(process.argv[2], 'utf8'));

// ---- askedUnknown distribution and dominant direction ----------------------
function directions(items) {
  const byFamily = new Map();
  for (const q of items) {
    const f = byFamily.get(q.family) || new Map();
    const d = q.metadata?.asked_unknown || '(single direction)';
    f.set(d, (f.get(d) || 0) + 1);
    byFamily.set(q.family, f);
  }
  return [...byFamily].map(([family, m]) => {
    const rows = [...m].sort((a, b) => b[1] - a[1]);
    const n = rows.reduce((a, r) => a + r[1], 0);
    return {
      family, n, directions: rows.length,
      dominant: rows[0][0], dominantPct: Number(pct(rows[0][1], n).toFixed(1)),
      flagged: rows.length > 1 && pct(rows[0][1], n) > 60,
      breakdown: rows.map(([d, c]) => `${d} ${pct(c, n).toFixed(1)}%`)
    };
  }).sort((a, b) => b.dominantPct - a.dominantPct);
}

// ---- per-session diversity -------------------------------------------------
function sessionStats(items) {
  const t = new Set(items.map(q => q.metadata?.template_id || q.generator_id));
  const d = new Set(items.map(q => `${q.metadata?.template_id || q.generator_id}|${q.metadata?.asked_unknown || '-'}`));
  const f = new Set(items.map(q => q.family));
  return {distinctTemplates: t.size, distinctReasoningVariants: d.size, distinctFamilies: f.size};
}

const auditSessions = {};
for (const r of auditRows) (auditSessions[r.session] ??= {kind: r.session_kind, items: []}).items.push(r.question);

const out = {
  corpus_n: corpus.length,

  item4_template_table: verify.corpus.templates.map(r => ({
    family: r.family, templateId: r.templateId, n: r.n,
    oracleRan: r.oracleRan,
    keyAgreesWithOracle: r.keyMatched,
    accuracyPct: Number(pct(r.keyMatched, r.n).toFixed(2)),
    flags: r.flags,
    lowExposure: r.n < 30
  })),

  item6: {
    ambiguity: {
      published_ambiguous_corpus: verify.corpus.tally.ambiguous,
      published_ambiguous_audit: verify.audit.tally.ambiguous,
      odd_one_out_published_corpus: corpus.filter(q => q.family === 'odd_one_out').length
    },
    degenerate: {
      corpus: verify.corpus.degenerate,
      audit: verify.audit.degenerate
    },
    directions_corpus: directions(corpus),
    directions_audit: directions(auditRows.map(r => r.question)),
    mixed_sessions: Object.entries(auditSessions)
      .filter(([, s]) => s.kind === 'mixed')
      .map(([id, s]) => ({session: id, ...sessionStats(s.items)})),
    hard_session_audit: Object.entries(auditSessions)
      .filter(([, s]) => s.kind === 'hard')
      .map(([id, s]) => ({session: id, ...sessionStats(s.items)})),
    hard_sessions_100: (() => {
      const t = hard.map(s => s.distinct_templates);
      const v = hard.map(s => s.distinct_reasoning_variants);
      const stat = a => ({min: Math.min(...a), max: Math.max(...a), mean: Number((a.reduce((x, y) => x + y, 0) / a.length).toFixed(2))});
      return {sessions: hard.length, distinctTemplates: stat(t), distinctReasoningVariants: stat(v),
              invalid: hard.filter(s => !s.valid).length,
              withDiversityWarnings: hard.filter(s => (s.diversity_warnings || []).length).length};
    })()
  }
};
process.stdout.write(JSON.stringify(out, null, 2));
