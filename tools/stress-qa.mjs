#!/usr/bin/env node
// Section 19 / 44. Generates the stress corpus and writes it out as raw data.
//
// A table in a report cannot be checked. This writes JSONL plus the seeds, so
// tools/metrics.mjs — or anyone else's script — can recompute every figure
// independently.
//
// Usage: node tools/stress-qa.mjs [questionCount] [hardSessions] [seedTag] [outPrefix]

import {writeFileSync, mkdirSync, createWriteStream} from 'node:fs';
import Engine from '../src/index.js';

const QUESTION_COUNT = Number(process.argv[2] || 10000);
const HARD_SESSIONS = Number(process.argv[3] || 100);
const SEED_TAG = process.argv[4] || '2026';
const PREFIX = process.argv[5] || '';
const OUT_DIR = new URL('../qa-artifacts/', import.meta.url).pathname;
const CORPUS_SEED = `QA-CORPUS-${SEED_TAG}`;
const SESSION_SEED = `QA-HARD-${SEED_TAG}`;

mkdirSync(OUT_DIR, {recursive: true});

const engine = new Engine();
const families = engine.listFamilies().map(f => f.id);
const difficulties = ['easy', 'medium', 'hard', 'mixed'];

console.log(`Generating ${QUESTION_COUNT} questions (seed ${CORPUS_SEED})...`);
const corpusPath = `${OUT_DIR}${PREFIX}corpus.jsonl`;
const corpus = createWriteStream(corpusPath);
const failures = [];
const t0 = Date.now();

for (let i = 0; i < QUESTION_COUNT; i++) {
  const family = families[i % families.length];
  const difficulty = difficulties[Math.floor(i / families.length) % difficulties.length];
  try {
    const q = engine.generateQuestion({family, difficulty, seed: `${CORPUS_SEED}|${i}`});
    corpus.write(JSON.stringify(q) + '\n');
  } catch (err) {
    failures.push({
      index: i, family, difficulty,
      code: err.code || 'ERROR',
      template_id: err.templateId || null,
      reasons: err.rejectionReasonsSummary || {message: err.message}
    });
  }
  if ((i + 1) % 2000 === 0) console.log(`  ${i + 1}/${QUESTION_COUNT}`);
}
await new Promise(resolve => corpus.end(resolve));
const corpusMs = Date.now() - t0;

console.log(`Generating ${HARD_SESSIONS} all-hard sessions of 50 (seed ${SESSION_SEED})...`);
const sessionsPath = `${OUT_DIR}${PREFIX}hard-sessions.jsonl`;
const sessions = createWriteStream(sessionsPath);
const sessionFailures = [];
const t1 = Date.now();

for (let s = 0; s < HARD_SESSIONS; s++) {
  try {
    const set = engine.generatePractice({difficulty: 'hard', count: 50, seed: `${SESSION_SEED}|${s}`, bandSession: true});
    sessions.write(JSON.stringify({
      session: s,
      seed: set.seed,
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
      questions: set.questions.map(q => ({
        generator_id: q.generator_id,
        family: q.family,
        fingerprint: q.metadata.fingerprint,
        correct_option: q.correct_option,
        correct_numeric_rank: q.metadata.correct_numeric_rank
      }))
    }) + '\n');
  } catch (err) {
    sessionFailures.push({session: s, code: err.code || 'ERROR', message: err.message});
  }
  if ((s + 1) % 25 === 0) console.log(`  ${s + 1}/${HARD_SESSIONS}`);
}
await new Promise(resolve => sessions.end(resolve));
const sessionsMs = Date.now() - t1;

const analytics = engine.getAnalytics();
const run = {
  generated_at: new Date().toISOString(),
  engine_version: engine.version,
  corpus: {
    seed: CORPUS_SEED,
    requested: QUESTION_COUNT,
    published: QUESTION_COUNT - failures.length,
    failures,
    wall_ms: corpusMs,
    path: `qa-artifacts/${PREFIX}corpus.jsonl`
  },
  hard_sessions: {
    seed: SESSION_SEED,
    requested: HARD_SESSIONS,
    completed: HARD_SESSIONS - sessionFailures.length,
    failures: sessionFailures,
    wall_ms: sessionsMs,
    path: `qa-artifacts/${PREFIX}hard-sessions.jsonl`
  },
  analytics
};
writeFileSync(`${OUT_DIR}${PREFIX}run.json`, JSON.stringify(run, null, 2));

console.log(`\nCorpus:  ${run.corpus.published}/${QUESTION_COUNT} published in ${(corpusMs / 1000).toFixed(1)}s`);
console.log(`Sessions: ${run.hard_sessions.completed}/${HARD_SESSIONS} completed in ${(sessionsMs / 1000).toFixed(1)}s`);
console.log(`Candidate reject rate: ${(100 * analytics.candidate_reject_rate).toFixed(2)}%`);
console.log(`Attempts per published: avg ${analytics.average_attempts_per_published.toFixed(3)}, p95 ${analytics.p95_attempts}`);
console.log(`Retry exhaustion: ${analytics.retry_exhaustion_count}`);
console.log(`Latency p50 ${analytics.generation_latency_p50_ms.toFixed(2)}ms, p95 ${analytics.generation_latency_p95_ms.toFixed(2)}ms`);
console.log(`\nWrote ${corpusPath}, ${sessionsPath}, ${OUT_DIR}${PREFIX}run.json`);
console.log('Now run: node tools/metrics.mjs');
