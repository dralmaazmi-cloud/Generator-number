// SIGN-OFF ITEM 5 — stale-calibration guard.
//
// RANK_DRAW_WEIGHTS are fitted against a specific template inventory. Adding,
// removing or re-shaping a template changes both the mix the fit was made
// against and the feasible ranges the weights are clamped to, and nothing in
// the engine notices: the old weights keep being applied and the corpus-wide
// key position quietly drifts off flat again.
//
// This test fails when the live inventory no longer matches the one recorded
// beside the weights. The remedy is to regenerate both, together:
//
//   node tools/calibrate-rank.mjs --refine qa-artifacts/*.jsonl > src/qa/rank-calibration.js
//   node tools/audit/snapshot-rank-inventory.mjs > qa-artifacts/rank-calibration-inventory.json
//
// TEST-ONLY. No production behaviour changes.

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';

import {buildInventoryDigest} from '../tools/audit/rank-inventory.mjs';
import {RANK_DRAW_WEIGHTS} from '../src/qa/rank-calibration.js';

const SNAPSHOT_PATH = new URL('../qa-artifacts/rank-calibration-inventory.json', import.meta.url);

function snapshot() {
  return JSON.parse(readFileSync(SNAPSHOT_PATH, 'utf8'));
}

test('rank calibration: the recorded snapshot belongs to the committed weights', () => {
  const snap = snapshot();
  const live = createHash('sha256').update(RANK_DRAW_WEIGHTS.join(',')).digest('hex').slice(0, 16);
  assert.equal(snap.weights_digest, live,
    'src/qa/rank-calibration.js was regenerated without regenerating qa-artifacts/rank-calibration-inventory.json');
  assert.deepEqual(snap.weights, [...RANK_DRAW_WEIGHTS]);
});

test('rank calibration: the template inventory still matches the one the weights were fitted to', async () => {
  const snap = snapshot();
  const live = await buildInventoryDigest(snap.samples_per_cell);

  if (live.inventory_digest === snap.inventory_digest) return;

  // Say precisely what moved, so the failure is actionable rather than a bare
  // digest mismatch.
  const was = new Map(snap.rows.map(r => [r.key, r.feasible ? r.feasible.join('-') : 'none']));
  const now = new Map(live.rows.map(r => [r.key, r.feasible ? r.feasible.join('-') : 'none']));
  const added = [...now.keys()].filter(k => !was.has(k));
  const removed = [...was.keys()].filter(k => !now.has(k));
  const reshaped = [...now.keys()].filter(k => was.has(k) && was.get(k) !== now.get(k))
    .map(k => `${k}: ${was.get(k)} -> ${now.get(k)}`);

  assert.fail(
    'The template inventory changed but the rank calibration was not regenerated.\n' +
    `  templates added:    ${added.length ? added.join(', ') : '(none)'}\n` +
    `  templates removed:  ${removed.length ? removed.join(', ') : '(none)'}\n` +
    `  feasible ranges moved: ${reshaped.length ? reshaped.join('; ') : '(none)'}\n` +
    '  Regenerate both files together:\n' +
    '    node tools/calibrate-rank.mjs --refine qa-artifacts/*.jsonl > src/qa/rank-calibration.js\n' +
    '    node tools/audit/snapshot-rank-inventory.mjs > qa-artifacts/rank-calibration-inventory.json'
  );
});

// --- the guard must itself be able to fail (Section 1-C) --------------------

test('rank calibration guard: a dropped template is detected', async () => {
  const snap = snapshot();
  const live = await buildInventoryDigest(snap.samples_per_cell);
  const shortened = live.rows.slice(0, -1);
  const digest = rows => createHash('sha256')
    .update(rows.map(r => `${r.key}=${r.feasible ? r.feasible.join('-') : 'none'}`).join('\n'))
    .digest('hex');
  assert.notEqual(digest(shortened), snap.inventory_digest,
    'removing a template must change the digest the guard compares');
});

test('rank calibration guard: a shifted feasible range is detected', async () => {
  const snap = snapshot();
  const live = await buildInventoryDigest(snap.samples_per_cell);
  const moved = live.rows.map((r, i) => (i === 0 && r.feasible ? {...r, feasible: [r.feasible[0], r.feasible[1] + 1]} : r));
  const digest = rows => createHash('sha256')
    .update(rows.map(r => `${r.key}=${r.feasible ? r.feasible.join('-') : 'none'}`).join('\n'))
    .digest('hex');
  assert.notEqual(digest(moved), snap.inventory_digest,
    'widening one template\'s feasible rank range must change the digest the guard compares');
});
