#!/usr/bin/env node
// SIGN-OFF DELIVERY — supplemental plain-text rendering of a frozen session report.
//
// The PDF's own text layer stores Arabic as presentation forms in visual order,
// so it cannot be searched or judged linguistically (see the delivery manifest).
// This renders the SAME frozen HTML the PDF was printed from into logical-order
// UTF-8, preserving session identity, question numbering, stems, all six
// options, the published key, explanations, the fast method, the reminder and
// the displayed per-option feedback.
//
// It reads the frozen HTML only. It does not call the generator, does not
// re-render, and changes nothing. NOT production code.

import {readFileSync} from 'node:fs';

const unesc = s => String(s)
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  .replace(/&amp;/g, '&');
const strip = s => unesc(String(s).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim());

const html = readFileSync(process.argv[2], 'utf8');
const label = process.argv[3] || process.argv[2];
const out = [];

// --- cover ---------------------------------------------------------------
const cover = /<header class="cover">([\s\S]*?)<\/header>/.exec(html);
out.push('='.repeat(78));
out.push(`تقرير الجلسة — ${label}`);
out.push('المصدر: ' + process.argv[2] + ' (HTML المجمّد الذي طُبع منه الـPDF)');
out.push('='.repeat(78));
if (cover) {
  for (const line of cover[1].split(/<br>|<\/div>|<\/span>|<\/h1>/)) {
    const t = strip(line);
    if (t) out.push(t);
  }
}

// --- summary tables ------------------------------------------------------
for (const m of html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2><table class="summary-table">([\s\S]*?)<\/table>/g)) {
  out.push('');
  out.push('--- ' + strip(m[1]) + ' ---');
  for (const row of m[2].matchAll(/<tr>([\s\S]*?)<\/tr>/g)) {
    const cells = [...row[1].matchAll(/<t[hd]>([\s\S]*?)<\/t[hd]>/g)].map(c => strip(c[1]));
    if (cells.length) out.push('  ' + cells.join('  |  '));
  }
}

// --- questions -----------------------------------------------------------
let n = 0;
for (const q of html.matchAll(/<section class="question">([\s\S]*?)<\/section>/g)) {
  const body = q[1];
  n++;
  out.push('');
  out.push('-'.repeat(78));
  const head = [...body.matchAll(/<div class="qhead">([\s\S]*?)<\/div>/g)][0];
  const heads = head ? [...head[1].matchAll(/<span>([\s\S]*?)<\/span>/g)].map(x => strip(x[1])) : [];
  out.push(`[${label} · السؤال ${n}]  ${heads.join('  ·  ')}`);
  out.push('');

  const stem = /<h3>([\s\S]*?)<\/h3>/.exec(body);
  if (stem) out.push('النص: ' + strip(stem[1]));
  const expr = /<div class="expr">([\s\S]*?)<\/div>/.exec(body);
  if (expr) out.push('التعبير المعروض: ' + strip(expr[1]));

  out.push('');
  out.push('الخيارات كما تُعرض:');
  for (const opt of body.matchAll(/<div class="opt[^"]*"><b>([A-F])<\/b><span>([\s\S]*?)<\/span><\/div>/g)) {
    out.push(`    ${opt[1]}) ${strip(opt[2])}`);
  }

  const ans = /<div class="answer">([\s\S]*?)<\/div>/.exec(body);
  if (ans) {
    out.push('');
    for (const line of ans[1].split(/<br>/)) {
      const t = strip(line);
      if (t) out.push('  ' + t);
    }
  }

  const ex = /<div class="ex">([\s\S]*?)<\/div>/.exec(body);
  if (ex) {
    out.push('');
    out.push('الشرح:');
    const before = ex[1].split('<ol>')[0];
    for (const p of before.matchAll(/<p>([\s\S]*?)<\/p>/g)) {
      const t = strip(p[1]);
      if (t) out.push('  ' + t);
    }
    const ol = /<ol>([\s\S]*?)<\/ol>/.exec(ex[1]);
    if (ol) {
      let i = 0;
      for (const li of ol[1].matchAll(/<li>([\s\S]*?)<\/li>/g)) out.push(`  ${++i}. ${strip(li[1])}`);
    }
    const after = ex[1].split('</ol>')[1] || '';
    for (const p of after.matchAll(/<p>([\s\S]*?)<\/p>/g)) {
      const t = strip(p[1]);
      if (t) out.push('  ' + t);
    }
  }
}

const footer = /<div class="footer">([\s\S]*?)<\/div>/.exec(html);
out.push('');
out.push('-'.repeat(78));
if (footer) out.push(strip(footer[1]));
out.push(`عدد الأسئلة في هذا التقرير: ${n}`);

process.stdout.write(out.join('\n') + '\n');
