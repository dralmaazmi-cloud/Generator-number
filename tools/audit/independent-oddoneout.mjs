#!/usr/bin/env node
// MANUAL BLIND REVIEW — independent competing-rule search for odd_one_out.
//
// Written from scratch for the audit. It deliberately does NOT import
// src/qa/ambiguity.js, so it shares no rule grammar, no complexity scoring and
// no blind spots with the production checker.
//
// It tests each rule in BOTH framings, which matters:
//   "five satisfy P, one does not"  (production framing)
//   "one satisfies P, five do not"  (the inverse framing)
// A set is reported when two rules single out DIFFERENT numbers.

import {readFileSync} from 'node:fs';

const isInt = n => Number.isInteger(n);
const isPrime = n => { if (n < 2) return false; for (let d = 2; d * d <= n; d++) if (n % d === 0) return false; return true; };
const isSquare = n => n >= 0 && isInt(Math.sqrt(n));
const isCube = n => { const r = Math.round(Math.cbrt(n)); return r * r * r === n; };
const isPronic = n => { for (let k = 1; k * (k + 1) <= n; k++) if (k * (k + 1) === n) return true; return false; };
const isTriangular = n => isSquare(8 * n + 1);
const digits = n => String(n).length;

// Each rule is a predicate plus a plainness weight: 1 = a property most
// candidates test first, 3 = a property only a strong candidate would reach.
const RULES = [];
const add = (id, weight, fn) => RULES.push({id, weight, fn});

add('even', 1, n => n % 2 === 0);
add('odd', 1, n => n % 2 === 1);
for (const d of [3, 4, 5, 6, 7, 8, 9, 10, 11, 12]) add(`divisible_by_${d}`, 1, n => n % d === 0);
add('prime', 1, isPrime);
add('perfect_square', 1, isSquare);
add('perfect_cube', 2, isCube);
add('pronic_n(n+1)', 2, isPronic);
add('triangular', 2, isTriangular);
add('single_digit', 1, n => digits(n) === 1);
add('two_digit', 1, n => digits(n) === 2);
add('three_digit', 1, n => digits(n) === 3);
add('square_minus_1', 2, n => isSquare(n + 1));
add('square_plus_1', 2, n => isSquare(n - 1));
add('twice_a_prime', 2, n => n % 2 === 0 && isPrime(n / 2));
add('product_of_two_distinct_primes', 2, n => { let c = 0, m = n; const f = new Set(); for (let d = 2; d * d <= m; d++) while (m % d === 0) { f.add(d); m /= d; c++; } if (m > 1) { f.add(m); c++; } return c === 2 && f.size === 2; });
for (const k of [2, 4, 6, 8, 10, 12]) add(`prime_plus_${k}`, 3, n => isPrime(n - k));
for (const k of [2, 4, 6, 8, 10]) add(`prime_minus_${k}`, 3, n => isPrime(n + k));
add('sum_of_digits_even', 2, n => String(n).split('').reduce((a, b) => a + +b, 0) % 2 === 0);
add('sum_of_digits_divisible_by_3', 2, n => String(n).split('').reduce((a, b) => a + +b, 0) % 3 === 0);
add('multiple_of_own_digit_sum', 3, n => { const s = String(n).split('').reduce((a, b) => a + +b, 0); return s > 0 && n % s === 0; });

/** Rules that single out exactly one member, in either framing. */
function singleOutlierRules(nums) {
  const out = [];
  for (const r of RULES) {
    const pass = nums.filter(r.fn);
    const fail = nums.filter(n => !r.fn(n));
    if (fail.length === 1 && pass.length === nums.length - 1) out.push({rule: r.id, framing: 'all-but-one satisfy', outlier: fail[0], weight: r.weight});
    else if (pass.length === 1 && fail.length === nums.length - 1) out.push({rule: r.id, framing: 'only-one satisfies', outlier: pass[0], weight: r.weight});
  }
  return out;
}

const rows = readFileSync('audit-rc1/blind-audit-250.jsonl', 'utf8').trim().split('\n').map(l => JSON.parse(l))
  .filter(r => r.family === 'odd_one_out');

const report = [];
for (const r of rows) {
  const nums = [...r.stem.matchAll(/\d+/g)].map(m => Number(m[0]));
  const disp = r.displayExpression ? [...r.displayExpression.matchAll(/\d+/g)].map(m => Number(m[0])) : nums;
  const set = disp.length === 6 ? disp : nums;
  const rules = singleOutlierRules(set);
  const outliers = [...new Set(rules.map(x => x.outlier))];
  report.push({
    id: `${r.sessionId}/${String(r.questionNumber).padStart(2, '0')}`,
    templateId: r.templateId, difficulty: r.difficulty, set,
    distinctOutliersFound: outliers,
    rules: rules.sort((a, b) => a.weight - b.weight),
    publishedKeyValue: Number(r.publishedCorrectValue)   // revealed only for the comparison step
  });
}
console.log(JSON.stringify(report, null, 1));
