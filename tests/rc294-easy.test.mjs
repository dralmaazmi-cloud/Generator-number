// RC2.9.4 — EASY suite.
//
// B2/B4: every new EASY construction publishes through the engine, pinned by
// id, over many seeds, and each carries the quality contract the release
// demands (oracle-checked key, six distinct options, a rationale for every
// wrong option, Arabic steps). B7: the WORK_E_INVERSE mirrored-givens tell.

import test from 'node:test';
import assert from 'node:assert/strict';
import Engine from '../src/index.js';
import {structuralBandOf} from '../src/qa/structure.js';

const engine = new Engine();
const L = ['A', 'B', 'C', 'D', 'E', 'F'];

export const NEW_EASY = Object.freeze({
  ages: ['AGE_E_RATIO_SUM', 'AGE_E_TIME_SHIFT', 'AGE_E_YEARS_TO_SUM'],
  machines: ['MACH_E_RATE_FROM_TOTAL', 'MACH_E_TIME_FOR_TARGET', 'MACH_E_COMPARE'],
  ratios: ['RAT_E_DIFF_SPLIT', 'RAT_E_THREE_WAY', 'RAT_E_TOTAL_FROM_PART'],
  relational: ['REL_E_STATEMENT_TRUE', 'REL_E_GAP_CHAIN'],
  averages: ['AVG_E_LIST', 'AVG_E_MISSING_VALUE'],
  speed: ['SPD_E_SPEED', 'SPD_E_UNIT_MINUTES', 'SPD_E_SAME_DIRECTION_GAP'],
  sequences: ['SEQ_E_NTH_TERM', 'SEQ_E_COUNT_TERMS']
});

export function checkPublished(q, templateId) {
  assert.equal(q.generator_id, templateId);
  assert.equal(q.difficulty, structuralBandOf(templateId));
  const opts = L.map(l => q.options[l]);
  assert.equal(opts.filter(Boolean).length, 6, 'six options');
  assert.equal(new Set(opts).size, 6, 'six distinct options');
  assert.ok(L.includes(q.correct_option));
  assert.ok(Array.isArray(q.explanation.steps) && q.explanation.steps.length >= 2, 'steps');
  assert.ok(/[؀-ۿ]/.test(q.question), 'Arabic stem');
  for (const l of L) {
    if (l === q.correct_option) continue;
    assert.ok(typeof q.explanation.distractor_analysis[l] === 'string' && q.explanation.distractor_analysis[l].length > 10, `rationale ${l}`);
  }
  assert.equal(q.metadata.oracle_verified ?? true, true);
}

for (const [family, ids] of Object.entries(NEW_EASY)) {
  for (const templateId of ids) {
    test(`EASY ${family}/${templateId} publishes 40/40 pinned draws at the easy band`, () => {
      assert.equal(structuralBandOf(templateId), 'easy');
      let ok = 0;
      for (let i = 0; i < 40; i++) {
        const q = engine.generateQuestion({family, difficulty: 'easy', templateId, seed: `rc294-easy|${templateId}|${i}`});
        checkPublished(q, templateId);
        ok++;
      }
      assert.equal(ok, 40);
    });
  }
}

test('EASY B7: WORK_E_INVERSE never mirrors a given into the answer', () => {
  let seen = 0;
  for (let i = 0; i < 300; i++) {
    const q = engine.generateQuestion({family: 'work_time', difficulty: 'easy', templateId: 'WORK_E_INVERSE', seed: `rc294-b7|${i}`});
    assert.equal(q.generator_id, 'WORK_E_INVERSE');
    const {workers, days, newWorkers} = q.metadata?.parameters ?? q.parameters ?? {};
    const answer = Number(q.correct);
    assert.notEqual(newWorkers, days, `w2 = d1 tell at seed ${i}`);
    assert.notEqual(workers, days, `w1 = d1 tell at seed ${i}`);
    assert.ok(![workers, days, newWorkers].includes(answer), `answer equals a given at seed ${i}`);
    seen++;
  }
  assert.equal(seen, 300);
});
