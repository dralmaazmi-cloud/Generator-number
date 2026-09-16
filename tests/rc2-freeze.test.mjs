// RC2 §24 — the freeze.
//
// The freeze is only meaningful if a later production edit is caught. These
// tests hold the record to being complete, and the enforcement to being able to
// detect a change rather than merely asserting there was none.

import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync, writeFileSync, mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

import {verifyFreeze} from '../tools/audit/rc2-freeze.mjs';
import {ENGINE_VERSION} from '../src/index.js';

// The §23 gate runs this suite, and at that moment no freeze has been taken —
// §24 follows §23. So the freeze tests stand down when there is no freeze, and
// are strict the moment one exists.
const frozen = (() => {
  try { return JSON.parse(readFileSync('rc2/FREEZE.json', 'utf8')); } catch { return null; }
})();
const whenFrozen = (name, fn) => test(name, {skip: frozen ? false : 'no freeze taken yet (§24 follows §23)'}, fn);

whenFrozen('§24: the freeze records everything the scope asks it to', () => {
  const f = JSON.parse(readFileSync('rc2/FREEZE.json', 'utf8'));
  assert.equal(f.schema, 'rc2-freeze-v1');
  for (const key of [
    'RC2_COMMIT', 'treeHash', 'engineVersion', 'testCount',
    'developmentSeeds', 'holdoutSeed', 'scopeSchema', 'developmentCorpus'
  ]) {
    assert.ok(f[key] !== undefined && f[key] !== null, `§24 requires ${key}`);
  }
  assert.equal(f.engineVersion, ENGINE_VERSION);
  assert.equal(f.scopeSchema, 'rc2-scope-frozen-v2');
  assert.match(f.RC2_COMMIT, /^[0-9a-f]{40}$/);
  assert.match(f.treeHash, /^[0-9a-f]{40}$/);
  assert.ok(f.testCount > 250, `${f.testCount} tests`);
  assert.equal(f.developmentSeeds.length, 5);
  // RC2.1 froze against its own unused sign-off holdout. Holdout B is carried
  // forward as a failed diagnostic holdout and must NOT be the frozen one — a
  // holdout an engine has been remediated against is no longer a holdout.
  // Each release freezes against its OWN unused sign-off holdout; every earlier
  // one is recorded as spent and explicitly not reused. A holdout an engine has
  // already been remediated against cannot test it.
  // RC2.7 names a seed nothing has been drawn on: Holdout E was reviewed under
  // RC2.5 and Holdout F sealed under RC2.6, so both are spent.
  // RC2.8 names the next unused one, and does not generate it: its brief
  // forbids starting a new blind holdout, and G is spent as the seed RC2.7 was
  // frozen against.
  // RC2.9 names the next unused one on the same terms: its brief forbids
  // creating a blind holdout or claiming one exists, and H is spent as the seed
  // RC2.8 was frozen against.
  const EXPECTED = {'RC2.9.5': 'AUDIT-2026-09-13-N', 'RC2.9.4': 'AUDIT-2026-09-13-M', 'RC2.9.3': 'AUDIT-2026-09-13-L', 'RC2.9.2': 'AUDIT-2026-09-13-K', 'RC2.9.1': 'AUDIT-2026-09-13-J', 'RC2.9': 'AUDIT-2026-09-13-I', 'RC2.8': 'AUDIT-2026-09-13-H', 'RC2.7': 'AUDIT-2026-09-13-G', 'RC2.4': 'AUDIT-2026-09-12-E', 'RC2.3': 'AUDIT-2026-09-12-E', 'RC2.2': 'AUDIT-2026-09-12-D', 'RC2.1': 'AUDIT-2026-09-12-C'};
  assert.equal(f.holdoutSeed, EXPECTED[f.release] ?? 'AUDIT-2026-09-12-B');
  const CHAIN = ['RC2.7', 'RC2.8', 'RC2.9', 'RC2.9.1', 'RC2.9.2', 'RC2.9.3', 'RC2.9.4', 'RC2.9.5'];
  if (CHAIN.includes(f.release)) {
    const since = CHAIN.indexOf(f.release);
    assert.deepEqual(f.previousHoldouts.map(h => h.seed), [
      'AUDIT-2026-09-12-B', 'AUDIT-2026-09-12-C', 'AUDIT-2026-09-12-D',
      'AUDIT-2026-09-12-E', 'AUDIT-2026-09-13-F',
      // Each release's named seed is spent by the freeze that named it: G under
      // RC2.7, H under RC2.8, I under RC2.9, J under RC2.9.1, K under RC2.9.2,
      // L under RC2.9.3, M under RC2.9.4.
      ...['AUDIT-2026-09-13-G', 'AUDIT-2026-09-13-H', 'AUDIT-2026-09-13-I',
        'AUDIT-2026-09-13-J', 'AUDIT-2026-09-13-K', 'AUDIT-2026-09-13-L',
        'AUDIT-2026-09-13-M'].slice(0, since)
    ]);
    for (const h of f.previousHoldouts) assert.equal(h.reused, false);
    assert.equal(f.holdoutGenerated, false, `the ${f.release} brief withholds the next holdout`);
  }
  if (f.release === 'RC2.1') {
    assert.equal(f.previousHoldouts.length, 1);
    assert.equal(f.previousHoldouts[0].seed, 'AUDIT-2026-09-12-B');
  }
  if (f.release === 'RC2.2') {
    assert.deepEqual(f.previousHoldouts.map(h => h.seed), ['AUDIT-2026-09-12-B', 'AUDIT-2026-09-12-C']);
    for (const h of f.previousHoldouts) assert.equal(h.reused, false);
  }
  if (f.release === 'RC2.3' || f.release === 'RC2.4') {
    assert.deepEqual(f.previousHoldouts.map(h => h.seed),
      ['AUDIT-2026-09-12-B', 'AUDIT-2026-09-12-C', 'AUDIT-2026-09-12-D']);
    for (const h of f.previousHoldouts) assert.equal(h.reused, false);
  }
  assert.equal(f.holdoutGenerated, false, 'the freeze precedes the holdout');
});

whenFrozen('§24: the freeze was only taken on a passing gate', () => {
  const f = JSON.parse(readFileSync('rc2/FREEZE.json', 'utf8'));
  assert.equal(f.internalGate.verdict, 'PASS');
  assert.ok(f.internalGate.conditions >= 15);
});

whenFrozen('§24: every production file is hashed individually, not just in bulk', () => {
  const f = JSON.parse(readFileSync('rc2/FREEZE.json', 'utf8'));
  assert.ok(f.productionFileCount >= 40, `${f.productionFileCount} production files`);
  assert.equal(f.productionFiles.length, f.productionFileCount);
  for (const file of f.productionFiles) {
    assert.match(file.sha256, /^[0-9a-f]{64}$/, file.path);
    assert.ok(file.bytes > 0, file.path);
  }
  // The families, the QA pipeline and the shipped surfaces must all be in it.
  const paths = f.productionFiles.map(x => x.path);
  assert.ok(paths.some(p => p.startsWith('src/families/')));
  assert.ok(paths.some(p => p.startsWith('src/qa/')));
  assert.ok(paths.includes('report.js'));
  assert.ok(paths.includes('index.html'));
});

whenFrozen('§24: production has not moved since the freeze', () => {
  const v = verifyFreeze();
  assert.deepEqual({changed: v.changed, added: v.added, removed: v.removed},
    {changed: [], added: [], removed: []});
  assert.equal(v.intact, true, `${v.frozenBundle} -> ${v.currentBundle}`);
});

whenFrozen('§24 meta: the check can detect a change', () => {
  // A verifier that cannot fail proves nothing. The frozen record is compared
  // against a deliberately altered copy of itself.
  const f = JSON.parse(readFileSync('rc2/FREEZE.json', 'utf8'));
  const tampered = {
    ...f,
    productionFiles: f.productionFiles.map((x, i) =>
      (i === 0 ? {...x, sha256: '0'.repeat(64)} : x)),
    productionBundleSha256: '0'.repeat(64)
  };
  const dir = mkdtempSync(join(tmpdir(), 'rc2-freeze-'));
  const path = join(dir, 'FREEZE.json');
  try {
    writeFileSync(path, JSON.stringify(tampered));
    const v = verifyFreeze(path);
    assert.equal(v.intact, false);
    assert.deepEqual(v.changed, [f.productionFiles[0].path]);
  } finally {
    rmSync(dir, {recursive: true, force: true});
  }
});

// RC2.9-7. A delivery package carries the engine and its evidence but not the
// repository, so this one check has an input the ZIP cannot contain. It says so
// and skips, rather than failing in a reviewer's hands for a reason that is
// nothing to do with the engine: the same fact is already settled inside the
// repository, and `verifyFreeze` — which the ZIP CAN run — is what proves the
// shipped production files are the frozen ones.
const inARepository = (() => {
  try { execFileSync('git', ['rev-parse', '--git-dir'], {stdio: 'ignore'}); return true; }
  catch { return false; }
})();

test('§24: production is identical at the gated commit and the frozen commit', {
  skip: !frozen ? 'no freeze taken yet (§24 follows §23)'
    : !inARepository ? 'not a git checkout — this runs in the repository, not from the delivery package'
    : false
}, () => {
  // The freeze claims a gate verdict. That claim is only worth anything if the
  // engine the gate saw is the engine that was frozen. git can settle it, so
  // it is settled rather than asserted: no production file may differ between
  // the commit the gate evaluated and RC2_COMMIT.
  const f = JSON.parse(readFileSync('rc2/FREEZE.json', 'utf8'));
  const gateHead = f.internalGate.headCommit;
  assert.ok(gateHead, 'the freeze names the commit the gate evaluated');

  const diff = execFileSync('git', [
    'diff', '--name-only', gateHead, f.RC2_COMMIT, '--',
    'src', 'report.js', 'app.js', 'practice-journey.js', 'performance-model.js', 'index.html',
    'generator_manifest.json', 'package.json'
  ], {encoding: 'utf8'}).trim();
  assert.equal(diff, '', `production moved between the gated commit and the freeze:\n${diff}`);
});

whenFrozen('§24: an earlier freeze that was superseded says so', () => {
  // The first freeze was taken before this file existed, so registering these
  // tests changed package.json — which is in the production bundle. The freeze
  // was premature and the record says so rather than being quietly overwritten.
  const f = JSON.parse(readFileSync('rc2/FREEZE.json', 'utf8'));
  if (!f.supersedes) return;
  assert.ok(Array.isArray(f.supersedes));
  for (const s of f.supersedes) {
    assert.ok(s.RC2_COMMIT && s.reason, 'a superseded freeze must say which and why');
  }
});
