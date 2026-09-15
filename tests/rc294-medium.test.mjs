// RC2.9.4 — MEDIUM suite. B3/B4: every new MEDIUM construction publishes
// through the engine, pinned by id, over many seeds, with the full contract.

import test from 'node:test';
import assert from 'node:assert/strict';
import Engine from '../src/index.js';
import {structuralBandOf} from '../src/qa/structure.js';
import {checkPublished} from './rc294-easy.test.mjs';

const engine = new Engine();

export const NEW_MEDIUM = Object.freeze({
  fractions: ['FRAC_M_REMAIN_VALUE', 'FRAC_M_START_FROM_REMAINDER', 'FRAC_M_COMPARE_SHARES'],
  calendar: ['CAL_M_DATE_WEEKDAY', 'CAL_M_NTH_VISIT'],
  ratios: ['RAT_M_TOTAL_FROM_GAP', 'RAT_M_THIRD_FROM_GAP'],
  direct_proportion: ['PROP_M_UNIT_PRICE_COMPARE', 'PROP_M_SCALE_ACROSS_HOURS'],
  unit_rate: ['RATE_M_COMPARE', 'RATE_M_HOURS_FROM_MINUTE_RATE']
});

for (const [family, ids] of Object.entries(NEW_MEDIUM)) {
  for (const templateId of ids) {
    test(`MEDIUM ${family}/${templateId} publishes 40/40 pinned draws at the medium band`, () => {
      assert.equal(structuralBandOf(templateId), 'medium');
      let ok = 0;
      for (let i = 0; i < 40; i++) {
        const q = engine.generateQuestion({family, difficulty: 'medium', templateId, seed: `rc294-medium|${templateId}|${i}`});
        checkPublished(q, templateId);
        ok++;
      }
      assert.equal(ok, 40);
    });
  }
}
