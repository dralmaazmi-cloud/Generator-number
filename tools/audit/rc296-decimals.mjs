#!/usr/bin/env node
// RC2.9.6 §3.1. Awkward decimals, measured where a learner meets them.
//
// Three separate things are counted, because they have different remedies:
//   answers      a non-integer KEY — the learner has to write it down;
//   awkwardness  a non-integer key outside .5 / .25 / .75;
//   precision    any number anywhere in a stem, option or explanation with
//                three or more decimal places.
//
// Non-integer ANSWERS are allowed only where a half or a quarter is natural —
// speed, unit_rate, combined_rate, averages. A non-integer answer anywhere else
// is a defect whatever its shape.
//
// GIVENS are not answers: «1.5 ساعة» in a speed stem is good Arabic and good
// arithmetic, and is explicitly out of scope.
//
// Usage: node tools/audit/rc296-decimals.mjs [perFamily] [out.json]

import Engine from '../../src/index.js';

const PER_FAMILY = Number(process.argv[2] ?? 120);
const OUT = process.argv[3] ?? null;
const engine = new Engine();
const FAMILIES = engine.listFamilies().map(f => f.id);
const BANDS = ['easy', 'medium', 'hard'];

/** Where a half or a quarter is a natural answer to give. */
export const NON_INTEGER_FAMILIES = new Set(['speed', 'unit_rate', 'combined_rate', 'averages']);
const TIDY = new Set([0, 0.25, 0.5, 0.75]);

const numbersIn = text => [...String(text ?? '').matchAll(/\d+\.\d+/g)].map(m => Number(m[0]));
const allText = q => [q.question, q.display_expression ?? '', ...Object.values(q.options ?? {}),
  q.explanation?.how_to_start ?? '', q.explanation?.fast_method ?? '', q.explanation?.remember ?? '',
  ...(q.explanation?.steps ?? []), ...Object.values(q.explanation?.distractor_analysis ?? {})].join(' ');

export function measure(perFamily = PER_FAMILY) {
  const rows = {};
  const offenders = {nonIntegerAnswer: [], awkwardAnswer: [], deepPrecision: [], wrongFamily: []};
  let sampled = 0;
  for (const family of FAMILIES) {
    const r = rows[family] = {family, sampled: 0, nonIntegerAnswers: 0, awkward: 0, deep: 0};
    for (let i = 0; i < perFamily; i++) {
      const band = BANDS[i % 3];
      let q;
      try { q = engine.generateQuestion({family, difficulty: band, seed: `rc296-dec-${family}-${band}-${i}`}); }
      catch { continue; }
      r.sampled++; sampled++;
      // The KEY as a number, from the options table. `correct_value` is the
      // rendered string — «1.8 ساعة» — and parsing Arabic back into a number is
      // how a measurement starts lying.
      const key = Number(q.metadata?.options_meta?.[q.correct_option]?.value);
      if (Number.isFinite(key) && !Number.isInteger(key)) {
        r.nonIntegerAnswers++;
        const frac = Math.abs(key % 1);
        const tidy = TIDY.has(Number(frac.toFixed(4)));
        if (!tidy) { r.awkward++; offenders.awkwardAnswer.push({family, template: q.generator_id, value: key, question: q.question}); }
        else offenders.nonIntegerAnswer.push({family, template: q.generator_id, value: key});
        if (!NON_INTEGER_FAMILIES.has(family)) {
          offenders.wrongFamily.push({family, template: q.generator_id, value: key, question: q.question});
        }
      }
      for (const n of numbersIn(allText(q))) {
        const decimals = String(n).split('.')[1]?.length ?? 0;
        if (decimals >= 3) { r.deep++; offenders.deepPrecision.push({family, template: q.generator_id, value: n}); break; }
      }
    }
  }
  const all = Object.values(rows);
  const totalNonInteger = all.reduce((a, r) => a + r.nonIntegerAnswers, 0);
  return {
    schema: 'rc296-decimals-v1', sampled,
    nonIntegerAnswers: totalNonInteger,
    nonIntegerRate: Number((totalNonInteger / (sampled || 1)).toFixed(5)),
    awkwardAnswers: all.reduce((a, r) => a + r.awkward, 0),
    deepPrecision: all.reduce((a, r) => a + r.deep, 0),
    nonIntegerOutsideAllowedFamilies: offenders.wrongFamily.length,
    allowedFamilies: [...NON_INTEGER_FAMILIES],
    byFamily: all.sort((a, b) => b.nonIntegerAnswers - a.nonIntegerAnswers),
    offenders: Object.fromEntries(Object.entries(offenders).map(([k, v]) => [k, v.slice(0, 12)])),
    byTemplate: Object.entries(
      [...offenders.awkwardAnswer, ...offenders.wrongFamily].reduce((m, o) => {
        m[o.template] = (m[o.template] ?? 0) + 1; return m;
      }, {})).sort((a, b) => b[1] - a[1])
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const r = measure();
  console.log(`sampled                                 : ${r.sampled}`);
  console.log(`non-integer answers                     : ${r.nonIntegerAnswers} (${(100 * r.nonIntegerRate).toFixed(2)}%)   gate <= 2%`);
  console.log(`  outside .5 / .25 / .75                : ${r.awkwardAnswers}   gate 0`);
  console.log(`  in a family where they are not allowed: ${r.nonIntegerOutsideAllowedFamilies}   gate 0`);
  console.log(`numbers with 3+ decimal places anywhere : ${r.deepPrecision}   gate 0`);
  console.log('\nfamily              sampled  non-int  awkward  deep');
  for (const f of r.byFamily) {
    if (!f.nonIntegerAnswers && !f.deep) continue;
    console.log(`${f.family.padEnd(20)}${String(f.sampled).padStart(7)}${String(f.nonIntegerAnswers).padStart(9)}${String(f.awkward).padStart(9)}${String(f.deep).padStart(6)}`);
  }
  if (r.byTemplate.length) { console.log('\noffending templates:'); for (const [t, n] of r.byTemplate) console.log(`  ${t.padEnd(24)} ${n}`); }
  for (const o of r.offenders.awkwardAnswer.slice(0, 4)) console.log(`\n  awkward: ${o.template} = ${o.value}\n    ${o.question}`);
  for (const o of r.offenders.wrongFamily.slice(0, 4)) console.log(`\n  wrong family: ${o.template} (${o.family}) = ${o.value}\n    ${o.question}`);
  if (OUT) (await import('node:fs')).writeFileSync(OUT, JSON.stringify(r, null, 2) + '\n');
}
