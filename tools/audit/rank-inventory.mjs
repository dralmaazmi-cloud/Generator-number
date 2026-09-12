// SIGN-OFF ITEM 5 — shared inventory digest used by the snapshot tool and by
// the guard test. NOT production code: it only reads the engine.

import {createHash} from 'node:crypto';
import Engine from '../../src/index.js';
import {RANK_DRAW_WEIGHTS} from '../../src/qa/rank-calibration.js';

export const SAMPLES_PER_CELL = 400;

/**
 * Every (family, difficulty, templateId) the engine can reach, plus the span of
 * key positions each template's own error paths allow. Both matter: a new
 * template changes the mix the weights are fitted against, and a template whose
 * feasible range shifts changes what the weights are clamped to even when the
 * template list is unchanged.
 */
export async function buildInventoryDigest(samples = SAMPLES_PER_CELL) {
  const engine = new Engine();
  const templates = new Map();
  for (const fam of engine.listFamilies()) {
    for (const difficulty of ['easy', 'medium', 'hard']) {
      for (let i = 0; i < samples; i++) {
        let q;
        try {
          q = engine.generateQuestion({family: fam.id, difficulty, seed: `rankinv-${fam.id}-${difficulty}-${i}`});
        } catch { continue; }
        const key = `${fam.id}|${difficulty}|${q.generator_id}`;
        const row = templates.get(key) || {key, n: 0, minRank: Infinity, maxRank: -Infinity};
        row.n++;
        const range = q.metadata?.feasible_rank_range;
        if (Array.isArray(range)) {
          row.minRank = Math.min(row.minRank, range[0]);
          row.maxRank = Math.max(row.maxRank, range[1]);
        }
        templates.set(key, row);
      }
    }
  }
  const rows = [...templates.values()]
    .map(r => ({
      key: r.key,
      feasible: Number.isFinite(r.minRank) ? [r.minRank, r.maxRank] : null
    }))
    .sort((a, b) => a.key.localeCompare(b.key));

  const canonical = rows.map(r => `${r.key}=${r.feasible ? r.feasible.join('-') : 'none'}`).join('\n');
  return {
    generated_at: new Date().toISOString(),
    samples_per_cell: samples,
    distinct_template_cells: rows.length,
    distinct_template_ids: new Set(rows.map(r => r.key.split('|')[2])).size,
    weights: [...RANK_DRAW_WEIGHTS],
    weights_digest: createHash('sha256').update(RANK_DRAW_WEIGHTS.join(',')).digest('hex').slice(0, 16),
    inventory_digest: createHash('sha256').update(canonical).digest('hex'),
    rows
  };
}
