#!/usr/bin/env node
// SIGN-OFF ITEM 5 — the snapshot half of the stale-calibration guard.
//
// RANK_DRAW_WEIGHTS in src/qa/rank-calibration.js are fitted against the
// template inventory that existed when the fit was run. Adding, removing or
// re-shaping a template changes the feasible rank ranges the weights are
// clamped to, and silently invalidates the fit. This records the inventory the
// current weights belong to; tests/rank-calibration-guard.test.mjs fails when
// the live inventory no longer matches.
//
// Regenerate together with the weights, never on its own:
//   node tools/calibrate-rank.mjs --refine <corpora...> > src/qa/rank-calibration.js
//   node tools/audit/snapshot-rank-inventory.mjs > qa-artifacts/rank-calibration-inventory.json
//
// NOT production code.

import {buildInventoryDigest} from './rank-inventory.mjs';

const digest = await buildInventoryDigest();
process.stdout.write(JSON.stringify(digest, null, 2) + '\n');
