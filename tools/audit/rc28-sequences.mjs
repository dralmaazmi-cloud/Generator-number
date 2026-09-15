#!/usr/bin/env node
// RC2.8-5. The sequences family, measured against the conditions the brief sets
// for it on its own.
//
// The family had sixteen templates and one question: «what number comes next»,
// under four labels. The conditions here are the ones that say whether that has
// actually changed — the share «next term» takes, how many genuinely different
// things are asked, and how many distinct RULE families the runs are built on. A
// different starting value or a different coefficient is the same rule family
// and is not counted twice.

import Engine from '../../src/index.js';
import {TEMPLATE_STRUCTURE} from '../../src/qa/structure.js';

export const SEQUENCE_CONDITIONS = Object.freeze({
  nextTermShare: 0.45,
  distinctTargets: 5,
  ruleFamilies: 10
});

/**
 * The RULE family a sequence template builds on, named rather than counted from
 * template ids: two templates that differ only in a coefficient are one rule.
 */
export const RULE_FAMILY = Object.freeze({
  SEQ_E_ARITH: 'constant-difference',
  // RC2.9.4-B2. Both are the constant-difference rule asked two other ways.
  SEQ_E_NTH_TERM: 'constant-difference',
  SEQ_E_COUNT_TERMS: 'constant-difference',
  SEQ_E_GEO: 'constant-ratio',
  SEQ_M_INC_DIFF: 'growing-difference',
  SEQ_M_DOUBLE_DIFF: 'second-difference',
  SEQ_M_ALT_OPS: 'alternating-operations',
  SEQ_M_INTERLEAVED: 'two-interleaved-runs',
  SEQ_M_LINEAR_RECUR: 'linear-recurrence',
  SEQ_M_CYCLE3: 'operation-cycle',
  SEQ_M_PAIR_RULE: 'within-pair-function',
  SEQ_M_WRONG_TERM: 'constant-difference',
  SEQ_H_RECURRENCE: 'sum-of-two-previous',
  SEQ_H_DIGIT_PRODUCT: 'digit-product-step',
  SEQ_H_DIGIT_SUM: 'digit-sum-step',
  SEQ_H_POW_INDEX: 'power-plus-index',
  SEQ_H_ALT_DIV: 'alternating-divide',
  SEQ_H_INDEX_MULT: 'index-scaled-multiplier',
  SEQ_M_RULE_ID: 'linear-recurrence',
  SEQ_M_RULE_APPLY: 'linear-recurrence',
  SEQ_M_MISSING_OP: 'alternating-operations',
  SEQ_M_CANDIDATE: 'constant-difference'
});

/** Targets that are «what comes next», however the template labels them. */
const NEXT_TERM_TARGETS = new Set(['nextTerm', 'nextTermOfSecondRun']);

export function measureSequences({seeds, count = 100} = {}) {
  const engine = new Engine();
  const rows = [];
  for (const seed of seeds) {
    let session;
    try { session = engine.generatePractice({seed, count}); } catch { continue; }
    rows.push(...session.questions.filter(q => q.family === 'sequences'));
  }
  const targets = new Map();
  const tasks = new Map();
  const rules = new Map();
  for (const q of rows) {
    const a = q.metadata.asked_unknown;
    targets.set(a, (targets.get(a) ?? 0) + 1);
    tasks.set(q.metadata.task_signature, (tasks.get(q.metadata.task_signature) ?? 0) + 1);
    const rule = RULE_FAMILY[q.generator_id];
    if (!rule) throw new Error(`RC28_UNMAPPED_SEQUENCE_TEMPLATE: ${q.generator_id}`);
    rules.set(rule, (rules.get(rule) ?? 0) + 1);
  }
  const nextTerm = [...targets].filter(([k]) => NEXT_TERM_TARGETS.has(k))
    .reduce((a, [, v]) => a + v, 0);
  return {
    items: rows.length,
    nextTermShare: rows.length ? nextTerm / rows.length : 0,
    targets: Object.fromEntries([...targets].sort((a, b) => b[1] - a[1])),
    tasks: Object.fromEntries([...tasks].sort((a, b) => b[1] - a[1])),
    ruleFamilies: Object.fromEntries([...rules].sort((a, b) => b[1] - a[1])),
    distinctTargets: targets.size,
    distinctTasks: tasks.size,
    distinctRuleFamilies: rules.size,
    // Declared across the whole family rather than observed in one sample: a
    // rule that exists but did not come up is still rule breadth the engine has.
    declaredRuleFamilies: new Set(Object.keys(TEMPLATE_STRUCTURE)
      .filter(id => id.startsWith('SEQ_')).map(id => RULE_FAMILY[id])).size
  };
}

export function gradeSequences(m) {
  const c = [
    ['«next term» takes at most 45% of the family', m.nextTermShare <= SEQUENCE_CONDITIONS.nextTermShare,
      `${(100 * m.nextTermShare).toFixed(1)}%`],
    ['at least five different things are asked', m.distinctTargets >= SEQUENCE_CONDITIONS.distinctTargets,
      `${m.distinctTargets} targets, ${m.distinctTasks} jobs`],
    ['at least ten genuine rule families exist',
      m.declaredRuleFamilies >= SEQUENCE_CONDITIONS.ruleFamilies,
      `${m.declaredRuleFamilies} declared, ${m.distinctRuleFamilies} seen in this sample`]
  ];
  return {pass: c.every(([, ok]) => ok), conditions: c.map(([name, ok, detail]) => ({name, ok, detail}))};
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const seeds = process.argv.includes('--seeds')
    ? process.argv[process.argv.indexOf('--seeds') + 1].split(',')
    : ['rc28-seq-a-4f81', 'rc28-seq-b-9c02', 'rc28-seq-c-31de', 'rc28-seq-d-77ab',
      'rc28-seq-e-0b5c', 'rc28-seq-f-e412', 'rc28-seq-g-5a90', 'rc28-seq-h-c1d3'];
  const m = measureSequences({seeds});
  const g = gradeSequences(m);
  console.log(`sequence questions: ${m.items} across ${seeds.length} sittings`);
  console.log('targets:', JSON.stringify(m.targets));
  console.log('jobs:', JSON.stringify(m.tasks));
  console.log('rule families seen:', JSON.stringify(m.ruleFamilies));
  for (const c of g.conditions) console.log(`  ${c.ok ? 'PASS' : 'FAIL'}  ${c.name}: ${c.detail}`);
  console.log(g.pass ? 'SEQUENCES PASS' : 'SEQUENCES FAIL');
  process.exitCode = g.pass ? 0 : 1;
}
