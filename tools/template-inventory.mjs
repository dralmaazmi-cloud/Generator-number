// Template inventory: distinct templates per family per difficulty.
// Usage: node tools/template-inventory.mjs [enginePath] [samplesPerCell]
import path from 'node:path';

const enginePath = process.argv[2] || '../src/index.js';
const samples = Number(process.argv[3] || 400);
const mod = await import(enginePath.startsWith('.') ? path.resolve(process.cwd(), 'tools', enginePath) : enginePath);
const Engine = mod.default;
const engine = new Engine();

const inventory = {};
for (const fam of engine.listFamilies()) {
  inventory[fam.id] = {easy:new Set(), medium:new Set(), hard:new Set()};
  for (const difficulty of ['easy','medium','hard']) {
    for (let i=0;i<samples;i++) {
      try {
        const q = engine.generateQuestion({family:fam.id, difficulty, seed:`inv-${fam.id}-${difficulty}-${i}`});
        inventory[fam.id][difficulty].add(q.generator_id);
      } catch { /* exhausted candidate: not a template */ }
    }
  }
}

const out = {};
let totalDistinct = 0;
const allIds = new Set();
for (const [fam, byDiff] of Object.entries(inventory)) {
  out[fam] = {};
  for (const [d, set] of Object.entries(byDiff)) {
    out[fam][d] = [...set].sort();
    out[fam][d].forEach(id=>allIds.add(id));
  }
  out[fam].total = new Set([...byDiff.easy, ...byDiff.medium, ...byDiff.hard]).size;
  totalDistinct += out[fam].total;
}
out.__totals = {distinct_templates: allIds.size, sum_per_family: totalDistinct};
console.log(JSON.stringify(out, null, 2));
