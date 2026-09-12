#!/usr/bin/env node
// SIGN-OFF ITEM 1 — audit sample generator.
//
// NOT production code. This file reads the frozen RC1 engine and the frozen
// v1.2.0 report renderer and writes out the 250-question audit sample. It
// changes nothing: no tuning, no filtering, no regeneration beyond what the
// normal pipeline does on its own.
//
// Session-object construction below is copied from app.js finishSession() so
// the emitted HTML is byte-for-byte the same report format the app produces.

import {mkdirSync, writeFileSync} from 'node:fs';
import Engine from '../../src/index.js';
import {buildPrintReportHtml} from '../../report.js';

const SEED = process.argv[2] || 'AUDIT-2026-09-12-A';
const OUT = new URL('../../audit-rc1/', import.meta.url).pathname;
mkdirSync(OUT, {recursive: true});

const PLAN = [
  {id: 'S1', difficulty: 'mixed', label: 'Mixed 1'},
  {id: 'S2', difficulty: 'mixed', label: 'Mixed 2'},
  {id: 'S3', difficulty: 'mixed', label: 'Mixed 3'},
  {id: 'S4', difficulty: 'mixed', label: 'Mixed 4'},
  {id: 'S5', difficulty: 'hard',  label: 'All-Hard'}
];

const engine = new Engine();
const allFamilies = engine.listFamilies().map(f => f.id);
const avg = a => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);

const jsonl = [];
const index = [];

for (const plan of PLAN) {
  const seed = `${SEED}|${plan.id}`;
  const set = engine.generatePractice({families: allFamilies, difficulty: plan.difficulty, count: 50, seed});
  const questions = set.questions;

  // ---- session object, exactly as app.js builds it (no answers given) ----
  const settings = {
    mode: 'training', families: allFamilies, difficulty: plan.difficulty,
    count: 50, timeLimitSeconds: null, seed
  };
  const responses = questions.map(() => ({selected: null, checked: true, correct: false, timeSeconds: 0, checkedAt: null}));
  const byDifficulty = {}, byFamily = {}, times = [];
  questions.forEach((q, i) => {
    const ok = !!responses[i].correct;
    byDifficulty[q.difficulty] ??= {n: 0, c: 0, time: []};
    byDifficulty[q.difficulty].n++; if (ok) byDifficulty[q.difficulty].c++;
    byFamily[q.family] ??= {ar: q.family_ar, n: 0, c: 0, time: []};
    byFamily[q.family].n++; if (ok) byFamily[q.family].c++;
  });
  Object.values(byDifficulty).forEach(x => x.avgTime = Math.round(avg(x.time)));
  Object.values(byFamily).forEach(x => x.avgTime = Math.round(avg(x.time)));
  const session = {
    schema: 'generated-practice-session-v2',
    id: `SESSION-${seed}`,
    createdAt: null, startedAt: null, completedAt: null,
    finishReason: 'audit-sample',
    settings, currentIndex: 0, questions, responses,
    elapsedSeconds: 0, adaptiveHistory: [],
    summary: {
      answered: 0, correct: 0, wrong: 0, unanswered: 50, percentage: 0,
      byDifficulty, byFamily, avgTimeSeconds: 0
    }
  };

  writeFileSync(`${OUT}session-${plan.id}-${plan.difficulty}.html`, buildPrintReportHtml(session));

  questions.forEach((q, i) => {
    jsonl.push(JSON.stringify({
      audit_seed: SEED,
      session: plan.id,
      session_kind: plan.difficulty,
      session_seed: seed,
      position: i + 1,
      question: q
    }));
  });

  index.push({
    session: plan.id, label: plan.label, difficulty: plan.difficulty, seed,
    count: questions.length,
    valid: set.validation.valid,
    errors: set.validation.errors,
    warnings: set.validation.warnings,
    diversity_warnings: set.validation.diversity_warnings,
    distinct_templates: set.validation.distinct_templates,
    distinct_reasoning_variants: set.validation.distinct_reasoning_variants,
    template_counts: set.validation.template_counts,
    variant_counts: set.validation.variant_counts,
    key_counts: set.validation.key_counts,
    numeric_rank_counts: set.validation.numeric_rank_counts,
    report: `audit-rc1/session-${plan.id}-${plan.difficulty}.html`
  });
  console.log(`${plan.id} (${plan.difficulty}): ${questions.length} questions, valid=${set.validation.valid}, templates=${set.validation.distinct_templates}`);
}

writeFileSync(`${OUT}audit-sample.jsonl`, jsonl.join('\n') + '\n');
writeFileSync(`${OUT}audit-index.json`, JSON.stringify({
  seed: SEED,
  engine_version: engine.version,
  generated_by: 'tools/audit/generate-audit-sample.mjs',
  sessions: index,
  analytics: engine.getAnalytics()
}, null, 2));
console.log(`\nWrote ${jsonl.length} questions to ${OUT}audit-sample.jsonl`);
