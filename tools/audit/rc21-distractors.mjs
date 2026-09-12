#!/usr/bin/env node
// RC2.1-3 — distractor plausibility, measured.
//
// The independent review of holdout B raised 44 option-quality concerns. This
// measures the three shapes it named over a fresh corpus, so the claim is about
// the engine rather than about the 250 items that happened to be sampled.
//
// `scaleRatio` is used HERE and only here. It reads the key, which is fine for a
// measurement and forbidden for a generation decision — see the note in
// src/qa/distractor-plausibility.js.

import {writeFileSync, mkdirSync} from 'node:fs';
import Engine, {ENGINE_VERSION} from '../../src/index.js';
import {scaleRatio} from '../../src/qa/distractor-plausibility.js';

const SCALE_REPORTING_THRESHOLD = 8;

export function measure({questions = 9000, seedTag = 'RC21-DIST'} = {}) {
  const engine = new Engine();
  const bands = ['easy', 'medium', 'hard'];
  const perTemplate = {};
  let items = 0, wrongOptions = 0, outOfScale = 0, outOfBounds = 0;
  const worst = [];

  for (let i = 0; i < questions; i++) {
    let q;
    try { q = engine.generateQuestion({family: 'random', difficulty: bands[i % 3], seed: `${seedTag}-${i}`}); }
    catch { continue; }
    items++;
    const t = perTemplate[q.generator_id] ??= {
      templateId: q.generator_id, family: q.family, items: 0, wrong: 0, outOfScale: 0, outOfBounds: 0
    };
    t.items++;
    const key = Number(String(q.correct_value).match(/-?\d+(?:\.\d+)?/)?.[0]);
    // The displayed set IS the options in this family; spread between them is
    // the question, so it is reported separately rather than counted as a defect.
    const stimulusIsOptions = q.family === 'odd_one_out';
    const bounds = q.metadata.answer_bounds ?? null;

    for (const [letter, meta] of Object.entries(q.metadata.options_meta)) {
      if (meta.correct) continue;
      wrongOptions++; t.wrong++;
      const v = Number(String(q.options[letter]).match(/-?\d+(?:\.\d+)?/)?.[0]);
      if (!Number.isFinite(v) || !Number.isFinite(key)) continue;
      if (!stimulusIsOptions) {
        const r = scaleRatio(v, key);
        if (r !== null && r > SCALE_REPORTING_THRESHOLD) {
          outOfScale++; t.outOfScale++;
          if (worst.length < 30) {
            worst.push({templateId: q.generator_id, key, option: v, ratio: Number(r.toFixed(1)),
              misconceptionId: meta.misconceptionId});
          }
        }
      }
      if (bounds && Array.isArray(bounds.between)) {
        const lo = Math.min(...bounds.between), hi = Math.max(...bounds.between);
        if (v < lo || v > hi) { outOfBounds++; t.outOfBounds++; }
      }
    }
  }

  const templates = Object.values(perTemplate).map(t => ({
    ...t,
    outOfScaleShare: Number((t.outOfScale / (t.wrong || 1)).toFixed(4))
  })).sort((a, b) => b.outOfScaleShare - a.outOfScaleShare);

  return {
    schema: 'rc21-distractors-v1',
    section: 'RC2.1-3',
    generatedAt: new Date().toISOString(),
    engineVersion: ENGINE_VERSION,
    note: 'scaleRatio reads the key and is used for measurement only; no generation path may call it.',
    corpus: {items, wrongOptions, templates: templates.length},
    outOfScale: {
      threshold: SCALE_REPORTING_THRESHOLD,
      count: outOfScale,
      share: Number((outOfScale / (wrongOptions || 1)).toFixed(5)),
      excludesOddOneOut: true
    },
    outOfDeclaredBounds: {
      count: outOfBounds,
      note: 'templates that declare answerBounds must never ship an option outside them'
    },
    worstTemplates: templates.filter(t => t.outOfScale > 0).slice(0, 15),
    examples: worst
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const r = measure();
  mkdirSync('rc2', {recursive: true});
  writeFileSync('rc2/RC21_DISTRACTORS.json', JSON.stringify(r, null, 2) + '\n');
  console.log(`items ${r.corpus.items} | wrong options ${r.corpus.wrongOptions}`);
  console.log(`out of scale (>${r.outOfScale.threshold}x, excl. odd-one-out): ${r.outOfScale.count} (${(r.outOfScale.share * 100).toFixed(2)}%)`);
  console.log(`outside declared bounds: ${r.outOfDeclaredBounds.count}`);
  console.log('\nworst templates:');
  for (const t of r.worstTemplates.slice(0, 10)) {
    console.log(`  ${t.templateId.padEnd(22)} ${String((t.outOfScaleShare * 100).toFixed(1)).padStart(5)}%  (${t.outOfScale}/${t.wrong})`);
  }
}
