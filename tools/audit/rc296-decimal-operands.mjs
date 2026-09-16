#!/usr/bin/env node
// RC2.9.6 §3.3. How often an EXPLANATION puts a decimal on one side of × or ÷.
//
// «القيمة المطلوبة = 300 × 0.3 = 90» is correct and the result is whole, so
// nothing here is a defect. It is a narration choice: a timed aptitude test is
// taken in the head, and «10% من 300 = 30، إذن 30% = 90» is the path a person
// actually walks. The measurement is of the narration only — the key, the
// options and every signature are untouched by the remedy, and §4.4 proves it.
//
// Usage: node tools/audit/rc296-decimal-operands.mjs [perFamily] [out.json]

import Engine from '../../src/index.js';

const PER_FAMILY = Number(process.argv[2] ?? 150);
const OUT = process.argv[3] ?? null;
const engine = new Engine();
const FAMILIES = engine.listFamilies().map(f => f.id);
const BANDS = ['easy', 'medium', 'hard'];

/** A decimal standing next to a multiplication or division sign. */
const DECIMAL_OPERAND = /(\d+\.\d+\s*[×÷]|[×÷]\s*\d+\.\d+)/;

const explanationText = q => [
  q.explanation?.how_to_start ?? '', q.explanation?.fast_method ?? '', q.explanation?.remember ?? '',
  ...(q.explanation?.steps ?? [])
].join(' ');

export function measure(perFamily = PER_FAMILY) {
  const byTemplate = {};
  let sampled = 0, hits = 0;
  for (const family of FAMILIES) {
    for (let i = 0; i < perFamily; i++) {
      const band = BANDS[i % 3];
      let q;
      try { q = engine.generateQuestion({family, difficulty: band, seed: `rc296-op-${family}-${band}-${i}`}); }
      catch { continue; }
      sampled++;
      const t = byTemplate[q.generator_id] ??= {templateId: q.generator_id, family, drawn: 0, withDecimalOperand: 0, sample: null};
      t.drawn++;
      if (DECIMAL_OPERAND.test(explanationText(q))) {
        hits++; t.withDecimalOperand++;
        t.sample ??= (q.explanation.steps ?? []).find(x => DECIMAL_OPERAND.test(x)) ?? null;
      }
    }
  }
  const rows = Object.values(byTemplate)
    .map(t => ({...t, rate: Number((t.withDecimalOperand / t.drawn).toFixed(3))}))
    .filter(t => t.withDecimalOperand > 0)
    .sort((a, b) => b.withDecimalOperand - a.withDecimalOperand);
  return {
    schema: 'rc296-decimal-operands-v1', sampled, withDecimalOperand: hits,
    rate: Number((hits / (sampled || 1)).toFixed(4)), target: 0.04, byTemplate: rows
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const r = measure();
  console.log(`sampled                       : ${r.sampled}`);
  console.log(`explanations with a decimal × or ÷ operand : ${r.withDecimalOperand} (${(100 * r.rate).toFixed(1)}%)   target < 4%`);
  console.log('\ntemplate                  family              drawn   hits   rate');
  for (const t of r.byTemplate) {
    console.log(`${t.templateId.padEnd(26)}${t.family.padEnd(20)}${String(t.drawn).padStart(5)}${String(t.withDecimalOperand).padStart(7)}${String(t.rate).padStart(7)}`);
  }
  for (const t of r.byTemplate.slice(0, 6)) if (t.sample) console.log(`\n  ${t.templateId}: ${t.sample}`);
  if (OUT) (await import('node:fs')).writeFileSync(OUT, JSON.stringify(r, null, 2) + '\n');
}
