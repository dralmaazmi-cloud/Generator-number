#!/usr/bin/env node
// RC2.9.6 §1/§4.1. The family-selection matrix, measured through the PRODUCT
// path — `generatePracticeForJourney`, exactly what a learner's click reaches —
// not through `generatePractice` directly.
//
// Each cell is N independent attempts at {families, count}. A cell passes only
// if every attempt delivered the requested count. Beside each cell the capacity
// the UI would have shown for that selection is recorded, so a reviewer can see
// that the product never offers a count it cannot serve: the invariant is
//
//     offered(count) => served(count)
//
// and a cell that fails while the UI offered it is the defect this release closes.
//
// Usage: node tools/audit/rc296-family-matrix.mjs [attempts] [out.json]

import Engine from '../../src/index.js';
import {generatePracticeForJourney} from '../../practice-journey.js';

const ATTEMPTS = Number(process.argv[2] ?? 10);
const OUT = process.argv[3] ?? null;
const COUNTS = [5, 10, 14, 20, 30];

const engine = new Engine();
const FAMILIES = engine.listFamilies().map(f => f.id);

const memoryShim = () => {
  const m = new Map();
  return {getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: k => m.delete(k)};
};

/** One cell: N attempts through the product path, from a fresh journey each time. */
export function cell(families, count, attempts = ATTEMPTS, tag = 'm') {
  let ok = 0;
  const reasons = {};
  for (let i = 0; i < attempts; i++) {
    try {
      const set = generatePracticeForJourney({
        engine, storage: memoryShim(), continueJourney: false,
        options: {families, count, seed: `rc296-${tag}-${families.join('+')}-${count}-${i}`}
      });
      if (set.questions.length === count) ok++;
      else reasons[`SHORT_${set.questions.length}`] = (reasons[`SHORT_${set.questions.length}`] ?? 0) + 1;
    } catch (e) {
      const k = e.code ?? String(e.message).slice(0, 40);
      reasons[k] = (reasons[k] ?? 0) + 1;
    }
  }
  return {ok, attempts, reasons};
}

/**
 * What the UI would offer for this selection — the same call `app.js` makes,
 * with the same ladder, so the matrix checks the number the product SHOWS and
 * not a number the audit computed for itself.
 */
const LADDER = [5, 10, 14, 20, 30];
const uiCap = families => {
  try { return engine.sessionCapacity({families, ladder: LADDER}).maxCount; }
  catch { return null; }
};

function singles() {
  const rows = [];
  for (const family of FAMILIES) {
    const cap = uiCap([family]);
    const cells = COUNTS.map(count => ({count, offered: cap != null && count <= cap, ...cell([family], count)}));
    rows.push({families: [family], capacity: cap, cells});
  }
  return rows.sort((a, b) => b.cells.filter(c => c.ok === c.attempts).length - a.cells.filter(c => c.ok === c.attempts).length);
}

function combos(list, counts = [10, 20, 30], tag = 'c') {
  return list.map(families => {
    const cap = uiCap(families);
    return {families, capacity: cap,
      cells: counts.map(count => ({count, offered: cap != null && count <= cap, ...cell(families, count, ATTEMPTS, tag)}))};
  });
}

/** The pairs and triples of §4.2: thin+thin, thin+wide, and three-family sets. */
export function comboList() {
  const thin = ['fractions', 'odd_one_out', 'calendar', 'relational', 'direct_proportion', 'ages', 'ratios'];
  const wide = ['sequences', 'speed', 'percentages', 'averages', 'machines', 'work_time', 'unit_rate'];
  const out = [];
  for (let i = 0; i < thin.length; i++) out.push([thin[i], thin[(i + 1) % thin.length]]);
  for (let i = 0; i < thin.length; i++) out.push([thin[i], wide[i % wide.length]]);
  for (let i = 0; i < 4; i++) out.push([wide[i], wide[(i + 3) % wide.length]]);
  for (let i = 0; i < 6; i++) out.push([thin[i % thin.length], thin[(i + 2) % thin.length], wide[i % wide.length]]);
  for (let i = 0; i < 4; i++) out.push([wide[i], wide[(i + 1) % wide.length], wide[(i + 2) % wide.length]]);
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const singleRows = singles();
  const comboRows = combos(comboList());
  const pad = (s, n) => String(s).padEnd(n);
  console.log(`=== single families, ${ATTEMPTS} attempts per cell (product path) ===`);
  console.log(`${pad('family', 20)}${pad('UI cap', 8)}${COUNTS.map(c => pad(c, 6)).join('')}`);
  for (const r of singleRows) {
    console.log(`${pad(r.families[0], 20)}${pad(r.capacity ?? '—', 8)}${r.cells.map(c => pad(c.ok, 6)).join('')}`);
  }
  console.log(`\n=== combinations, ${ATTEMPTS} attempts per cell ===`);
  console.log(`${pad('selection', 46)}${pad('UI cap', 8)}${[10, 20, 30].map(c => pad(c, 6)).join('')}`);
  for (const r of comboRows) {
    console.log(`${pad(r.families.join('+'), 46)}${pad(r.capacity ?? '—', 8)}${r.cells.map(c => pad(c.ok, 6)).join('')}`);
  }
  const all = [...singleRows, ...comboRows].flatMap(r => r.cells.map(c => ({...c, families: r.families, capacity: r.capacity})));
  const betrayed = all.filter(c => c.offered && c.ok < c.attempts);
  console.log(`\ncells measured                       : ${all.length}`);
  console.log(`cells the UI offered                 : ${all.filter(c => c.offered).length}`);
  console.log(`cells OFFERED that then FAILED       : ${betrayed.length}   <- must be 0`);
  for (const b of betrayed.slice(0, 10)) {
    console.log(`   ${b.families.join('+')} @ ${b.count} (cap ${b.capacity}): ${b.ok}/${b.attempts} ${JSON.stringify(b.reasons)}`);
  }
  if (OUT) {
    const {writeFileSync} = await import('node:fs');
    writeFileSync(OUT, JSON.stringify({
      schema: 'rc296-family-matrix-v1', attempts: ATTEMPTS, counts: COUNTS,
      singles: singleRows, combinations: comboRows,
      cellsMeasured: all.length, cellsOffered: all.filter(c => c.offered).length,
      offeredThenFailed: betrayed.map(b => ({families: b.families, count: b.count, capacity: b.capacity, ok: b.ok, reasons: b.reasons}))
    }, null, 2) + '\n');
  }
}
