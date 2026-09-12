#!/usr/bin/env node
// Section 12-B. The deterministic gate.
//
// "Arabic number/unit correctness >= 99.5%" is a statistical target for a
// deterministic property, and it lets a whole template leak through. The real
// check is that *no place in the code* joins a number to a unit by hand: every
// count must go through the central formatter. This is a grep, and it fails the
// build.

import {readdirSync, readFileSync} from 'node:fs';
import {join} from 'node:path';

import {UNITS} from '../src/arabic/units.js';

const FAMILY_DIR = new URL('../src/families/', import.meta.url).pathname;

// Every surface form the lexicon knows, so a template cannot spell one out.
const FORMS = new Set();
for (const u of Object.values(UNITS)) {
  for (const form of [u.singular, u.dual, u.dualOblique, u.plural, u.accSing]) FORMS.add(form);
}
const FORM_ALT = [...FORMS].sort((a, b) => b.length - a.length).map(escapeRe).join('|');

// `${something} <unit word>` — a number expression glued to a unit by hand.
const MANUAL_INTERPOLATION = new RegExp(String.raw`\$\{[^}]*\}\s+(?:${FORM_ALT})(?![ء-ي])`, 'gu');
// A literal digit followed by a unit word, e.g. "5 أيام" hard-coded in a string.
const MANUAL_LITERAL = new RegExp(String.raw`(?<![\d.])\d+\s+(?:${FORM_ALT})(?![ء-ي])`, 'gu');

// A compound rate symbol is a unit *name*, not a counted noun: "10 وحدة/ساعة".
const RATE_SYMBOL = /\/\s*(?:ساعة|دقيقة|لتر|يوم)/u;

function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function offending(line) {
  const hits = [];
  for (const re of [MANUAL_INTERPOLATION, MANUAL_LITERAL]) {
    re.lastIndex = 0;
    for (const m of line.matchAll(re)) {
      const tail = line.slice(m.index + m[0].length, m.index + m[0].length + 8);
      if (RATE_SYMBOL.test(tail)) continue;      // "وحدة/ساعة" and friends
      hits.push(m[0].trim());
    }
  }
  return hits;
}

const violations = [];
for (const file of readdirSync(FAMILY_DIR).filter(f => f.endsWith('.js'))) {
  const text = readFileSync(join(FAMILY_DIR, file), 'utf8');
  text.split('\n').forEach((line, i) => {
    const t = line.trimStart();
    if (t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')) return;
    for (const hit of offending(line)) violations.push({file, line: i + 1, hit, source: line.trim()});
  });
}

if (violations.length) {
  console.error(`FAIL: ${violations.length} place(s) join a number to a unit without the formatter.\n`);
  for (const v of violations.slice(0, 40)) {
    console.error(`  ${v.file}:${v.line}  «${v.hit}»`);
    console.error(`      ${v.source.slice(0, 140)}`);
  }
  console.error('\nUse u(n, unitId[, context]) from src/families/_shared.js instead.');
  process.exit(1);
}
console.log('PASS: every count in src/families reaches its unit through the central formatter.');
