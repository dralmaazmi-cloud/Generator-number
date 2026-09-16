#!/usr/bin/env node
// RC2.9.5 §2.3. The transition, measured rather than assumed.
//
// The decision is to KEEP the practice journey across the release: resetting it
// would cost every learner the cooldown that stops last week's question coming
// back. The cost of keeping it is that the rolling hundreds spanning the change
// mix questions drawn under 25/60/15 with questions drawn under 50/40/10. This
// measures that window: journeys captured before the change are continued after
// it, and every rolling 100 across the boundary is scored.
//
// Usage: node tools/audit/rc295-migration.mjs <captured.json> [out.json]

import Engine from '../../src/index.js';
import {readFileSync, writeFileSync} from 'node:fs';
import {measureSample} from '../../src/qa/perceptual-classify.js';

const [IN, OUT = 'rc2/RC295_MIGRATION.json'] = process.argv.slice(2);
const captured = JSON.parse(readFileSync(IN, 'utf8'));
const engine = new Engine();

const keyRow = q => ({
  metadata: {
    user_perceptual_signature: q.nd ?? q.metadata?.user_perceptual_signature,
    task_signature: (q.pv ?? `${q.metadata?.template_id}|${q.metadata?.task_signature}`).split('|').slice(1).join('|'),
    template_id: (q.pv ?? `${q.metadata?.template_id}|${q.metadata?.task_signature}`).split('|')[0],
    normalized_stem_identity: q.stem ?? q.metadata?.normalized_stem_identity
  },
  family: q.family,
  difficulty: q.difficulty,
  question: q.stem ?? q.metadata?.normalized_stem_identity,
  options: {}
});

const rows = [];
for (const j of captured) {
  const before = j.questions.map(keyRow);
  let history = j.history;
  const after = [];
  for (let s = 3; s <= 4; s++) {
    const set = engine.generatePractice({seed: `rc295-migration-j${j.journey}-s${s}`, count: 30, diversityHistory: history});
    history = set.diversity_history;
    after.push(...set.questions.map(q => keyRow({
      difficulty: q.difficulty, family: q.family,
      pv: `${q.metadata.template_id}|${q.metadata.task_signature}`,
      nd: q.metadata.user_perceptual_signature,
      stem: q.metadata.normalized_stem_identity
    })));
  }
  const all = [...before, ...after];
  const windows = [];
  for (let start = 0; start + 100 <= all.length; start += 10) {
    const w = all.slice(start, start + 100);
    const m = measureSample(w, {label: `Q${start + 1}`});
    const oldShare = w.filter((_, i) => start + i < before.length).length;
    windows.push({at: start + 1, questionsFromBeforeTheChange: oldShare,
      pv: m.counts.PARAMETER_ONLY_VARIANT, nd: m.counts.NEAR_DUPLICATE_CONSTRUCTION,
      flagged: m.flagged, cluster: m.largestPerceptualCluster, run: m.longestSimilarRun,
      duplicates: w.length - new Set(w.map(q => q.metadata.normalized_stem_identity)).size});
  }
  const repeatsAcross = after.filter(q =>
    new Set(before.map(b => b.metadata.normalized_stem_identity)).has(q.metadata.normalized_stem_identity)).length;
  rows.push({journey: j.journey, questions: all.length, windows, repeatedStemsAcrossTheChange: repeatsAcross});
}

const worst = rows.flatMap(r => r.windows).reduce((a, w) => ({
  flagged: Math.max(a.flagged, w.flagged), nd: Math.max(a.nd, w.nd),
  cluster: Math.max(a.cluster, w.cluster), run: Math.max(a.run, w.run),
  duplicates: Math.max(a.duplicates, w.duplicates)
}), {flagged: 0, nd: 0, cluster: 0, run: 0, duplicates: 0});

const report = {
  journeys: rows.length,
  sittingsBeforeTheChange: 2, sittingsAfterTheChange: 2, questionsPerSitting: 30,
  worstWindowSpanningTheChange: worst,
  repeatedStemsAcrossTheChange: rows.reduce((a, r) => a + r.repeatedStemsAcrossTheChange, 0),
  gatesPass: worst.flagged <= 8 && worst.nd <= 5 && worst.cluster <= 3 && worst.run <= 2 && worst.duplicates === 0,
  perJourney: rows
};
writeFileSync(OUT, JSON.stringify(report, null, 2) + '\n');
console.log(`journeys spanning the change            : ${report.journeys}`);
console.log(`worst rolling 100 across the boundary   : PV+ND ${worst.flagged} · ND ${worst.nd} · cluster ${worst.cluster} · streak ${worst.run} · duplicates ${worst.duplicates} → ${report.gatesPass ? 'PASS' : 'FAIL'}`);
console.log(`stems repeated across the change        : ${report.repeatedStemsAcrossTheChange}`);
