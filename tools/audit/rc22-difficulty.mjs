#!/usr/bin/env node
// RC2.2-2 — difficulty, measured where the gate cannot hide it.
//
// Two measurements, and the distinction matters:
//
//   UNGATED  Every template is sampled by calling its family generator
//            directly. This is the only way to see a template that can no
//            longer be published at the band it used to claim, and it is what
//            the boundary rule is computed from.
//
//   GATED    What the engine actually releases. Declared/computed agreement
//            here is 100% by construction — the release gate refuses anything
//            else — so that number is reported as a CHECK, not an achievement.
//            A value below 100% means the gate has a hole.

import {writeFileSync, mkdirSync} from 'node:fs';

import Engine, {ENGINE_VERSION} from '../../src/index.js';
import {SeededRNG} from '../../src/rng.js';
import {finalizeQuestion} from '../../src/utils.js';
import {BAND_BOUNDARIES, bandFor} from '../../src/qa/complexity.js';
import {FAMILY_REGISTRY, FAMILY_MAP} from '../../src/registry.js';

const BANDS = ['easy', 'medium', 'hard'];
const median = xs => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : Number(((s[m - 1] + s[m]) / 2).toFixed(2));
};

async function generators() {
  const out = {};
  for (const f of FAMILY_REGISTRY) {
    const mod = await import(`../../src/families/${f.id}.js`);
    out[f.id] = Object.values(mod).find(v => typeof v === 'function' && /^generate/.test(v.name));
  }
  return out;
}

/** Every template, scored, without the gate in the way. */
export async function ungated({perBand = 700, seedTag = 'RC22-UNGATED'} = {}) {
  const GEN = await generators();
  const per = {};
  for (const fam of Object.keys(GEN)) {
    for (const band of BANDS) {
      for (let i = 0; i < perBand; i++) {
        const seed = `${seedTag}-${fam}-${band}-${i}`;
        const rng = new SeededRNG(seed);
        let base, q;
        try {
          base = GEN[fam]({difficulty: band, rng: rng.fork('c'), seed, engineVersion: 'audit', telemetry: null});
          if (!base) continue;
          q = finalizeQuestion(base, rng.fork('o'));
        } catch { continue; }
        const t = per[base.template_id] ??= {templateId: base.template_id, family: fam, scores: [], factors: {}};
        t.scores.push(q.metadata.complexity_score);
        for (const [k, v] of Object.entries(q.metadata.complexity_factors ?? {})) {
          if (typeof v === 'number') (t.factors[k] ??= []).push(v);
        }
      }
    }
  }
  const templates = Object.values(per).map(t => ({
    templateId: t.templateId, family: t.family, n: t.scores.length,
    medianScore: median(t.scores), band: bandFor(median(t.scores)),
    medianFactors: Object.fromEntries(Object.entries(t.factors).map(([k, v]) => [k, median(v)]))
  })).sort((a, b) => a.medianScore - b.medianScore);

  const sorted = templates.map(t => t.medianScore).sort((a, b) => a - b);
  const tertile = p => sorted[Math.floor(p * sorted.length)];
  const implied = {easyMedium: tertile(1 / 3), mediumHard: tertile(2 / 3)};

  return {
    templates,
    population: BANDS.reduce((a, b) => (a[b] = templates.filter(t => t.band === b).length, a), {}),
    impliedBoundaries: implied,
    boundariesInUse: BAND_BOUNDARIES,
    // Held to a tolerance, not to exact equality: templates near a tertile swap
    // sides between samples. Beyond 0.5 the population has genuinely moved.
    boundaryDrift: {
      easyMedium: Number((implied.easyMedium - BAND_BOUNDARIES.easyMedium).toFixed(2)),
      mediumHard: Number((implied.mediumHard - BAND_BOUNDARIES.mediumHard).toFixed(2))
    },
    boundariesMatchRule: Math.abs(implied.easyMedium - BAND_BOUNDARIES.easyMedium) <= 0.5
      && Math.abs(implied.mediumHard - BAND_BOUNDARIES.mediumHard) <= 0.5
  };
}

/** What the engine releases, and whether the gate ever lets a mismatch out. */
export function gated({perBand = 1500, seedTag = 'RC22-GATED'} = {}) {
  const engine = new Engine();
  const violations = [];
  const released = {easy: 0, medium: 0, hard: 0};
  let exhausted = 0, attempts = [];
  for (const band of BANDS) {
    for (let i = 0; i < perBand; i++) {
      let q;
      try { q = engine.generateQuestion({family: 'random', difficulty: band, seed: `${seedTag}-${band}-${i}`}); }
      catch { exhausted++; continue; }
      released[q.difficulty]++;
      attempts.push(q.metadata.validation_meta.attempts);
      if (q.difficulty !== band || q.metadata.complexity_band !== band) {
        violations.push({seed: `${seedTag}-${band}-${i}`, asked: band,
          released: q.difficulty, computed: q.metadata.complexity_band, templateId: q.generator_id});
      }
    }
  }
  return {
    released, exhausted, violations,
    violationCount: violations.length,
    meanAttempts: Number((attempts.reduce((a, b) => a + b, 0) / (attempts.length || 1)).toFixed(4))
  };
}

/** ALL_HARD, on real sessions, per family. */
export function allHard({sessions = 8, count = 50, seedTag = 'RC22-ALLHARD'} = {}) {
  const engine = new Engine();
  const perFamily = {};
  let total = 0, notHard = 0, failed = 0;
  for (let s = 0; s < sessions; s++) {
    let out;
    try { out = engine.generatePractice({count, difficulty: 'hard', family: 'random', seed: `${seedTag}-${s}`, bandSession: true}); }
    catch { failed++; continue; }
    for (const q of out.questions) {
      total++;
      if (q.difficulty !== 'hard') notHard++;
      const f = perFamily[q.family] ??= {delivered: 0, hard: 0, scores: []};
      f.delivered++; f.scores.push(q.metadata.complexity_score);
      if (q.difficulty === 'hard') f.hard++;
    }
  }
  return {
    sessions, failedSessions: failed, total, notHard,
    notHardShare: Number((notHard / (total || 1)).toFixed(4)),
    perFamily: Object.entries(perFamily).map(([family, f]) => ({
      family, delivered: f.delivered, hard: f.hard, medianScore: median(f.scores)
    })).sort((a, b) => b.delivered - a.delivered)
  };
}

/**
 * The registry's `difficulties` is a promise the scheduler relies on, so it is
 * checked against what the engine can ACTUALLY produce rather than against a
 * resampled median — a template sitting near a boundary flips band between
 * samples, and that is noise, not a capability change.
 */
export function capabilityCheck({attempts = 60} = {}) {
  const engine = new Engine();
  const rows = FAMILY_REGISTRY.map(f => {
    const produced = [];
    for (const band of BANDS) {
      let made = false;
      for (let i = 0; i < attempts && !made; i++) {
        try {
          const q = engine.generateQuestion({family: f.id, difficulty: band, seed: `CAP-${f.id}-${band}-${i}`});
          if (q.difficulty === band) made = true;
        } catch { /* next */ }
      }
      if (made) produced.push(band);
    }
    return {
      family: f.id, declared: [...f.difficulties], produced,
      matches: f.difficulties.length === produced.length && f.difficulties.every(b => produced.includes(b))
    };
  });
  return {rows, allMatch: rows.every(r => r.matches), mismatches: rows.filter(r => !r.matches)};
}

export async function build(opts = {}) {
  const u = await ungated(opts.ungated);
  const g = gated(opts.gated);
  const a = allHard(opts.allHard);
  return {
    schema: 'rc22-difficulty-v1',
    section: 'RC2.2-1/2',
    generatedAt: new Date().toISOString(),
    engineVersion: ENGINE_VERSION,
    rule: 'boundaries are the tertiles of the ungated template-score distribution, each template weighted once by its own median',
    ungated: u,
    gated: g,
    allHard: a,
    familyCapability: capabilityCheck()
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const r = await build();
  mkdirSync('rc2', {recursive: true});
  writeFileSync('rc2/RC22_DIFFICULTY.json', JSON.stringify(r, null, 2) + '\n');
  console.log(`templates ${r.ungated.templates.length} | population ${JSON.stringify(r.ungated.population)}`);
  console.log(`boundaries in use ${JSON.stringify(r.ungated.boundariesInUse)} | rule implies ${JSON.stringify(r.ungated.impliedBoundaries)} ${r.ungated.boundariesMatchRule ? '(match)' : '(DRIFTED)'}`);
  console.log(`gate: ${r.gated.violationCount} violations, ${r.gated.exhausted} exhausted, mean attempts ${r.gated.meanAttempts}`);
  console.log(`ALL_HARD: ${r.allHard.total} questions, ${r.allHard.notHard} not hard (${(r.allHard.notHardShare * 100).toFixed(1)}%), ${r.allHard.failedSessions} failed sessions`);
  console.log(`family capability matches what the engine produces: ${r.familyCapability.allMatch}`);
  for (const m of r.familyCapability.mismatches) {
    console.log(`  ${m.family}: registry says ${JSON.stringify(m.declared)}, engine produces ${JSON.stringify(m.produced)}`);
  }
}
