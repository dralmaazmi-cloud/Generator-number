#!/usr/bin/env node
// SIGN-OFF ITEM 8 — 50 rendered questions for native Arabic review.
//
// Stem and the six choices exactly as displayed, including units. No
// explanations, no answer key, no metadata: the reviewer is judging the Arabic,
// not the mathematics, and should not be primed by either.
//
// Selection is a seeded Fisher-Yates over the 250 frozen audit questions in the
// order they were generated. The seed is printed so the same 50 can be drawn
// again; nothing was picked by hand.
// NOT production code.

import {readFileSync} from 'node:fs';
import {SeededRNG} from '../../src/rng.js';

const SEED = process.argv[3] || 'AUDIT-2026-09-12-A|arabic-review';
const rows = readFileSync(process.argv[2], 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
const order = new SeededRNG(SEED).shuffle(rows.map((_, i) => i)).slice(0, 50).sort((a, b) => a - b);

const out = [];
out.push('عينة المراجعة اللغوية — النسخة المجمّدة RC1');
out.push(`البذرة: ${SEED}`);
out.push(`المصدر: ${process.argv[2]} (250 سؤالًا)`);
out.push('المطلوب: الحكم على سلامة العربية وحدها — الصياغة، الوحدات، العدد والمعدود، علامات الترقيم.');
out.push('لا تُعرض الشروح ولا مفتاح الإجابة عمدًا.');
out.push('');
out.push('='.repeat(72));

order.forEach((idx, n) => {
  const q = rows[idx].question;
  out.push('');
  out.push(`[${String(n + 1).padStart(2, '0')}]  ${q.family_ar} · ${q.difficulty_ar} · ${rows[idx].session}/${rows[idx].position}`);
  out.push('');
  out.push(q.question);
  if (q.display_expression) out.push(`    ${q.display_expression}`);
  out.push('');
  for (const l of ['A', 'B', 'C', 'D', 'E', 'F']) out.push(`    ${l}) ${q.options[l]}`);
  out.push('');
  out.push('-'.repeat(72));
});

process.stdout.write(out.join('\n') + '\n');
