#!/usr/bin/env node
// RC2.9.4-A. A stand-alone package of the PHASE-A checkpoint (commit aa97104):
// truthful distractor rationales and the evidence-honest performance model, on
// an engine that draws exactly what RC2.9.3 draws — byte-identical questions on
// 10,000 reference seeds (rc2/RC294_ZERO_DIFF.json).
//
// Run INSIDE a checkout whose production tree is the Phase-A checkpoint and
// whose rc2/FREEZE.json was taken on that tree, so verifyFreeze() holds from
// the extracted ZIP. The baseline directory is built from that checkout's own
// git history and verified against each earlier release's freeze record.
//
// Usage (from that checkout):  node tools/audit/rc294a-package.mjs [out.zip]

import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync, rmSync, mkdirSync, cpSync, writeFileSync, existsSync, readdirSync, statSync} from 'node:fs';
import {join} from 'node:path';

const OUT = process.argv[2] ?? 'RC2_9_4A_GENERATOR_READY.zip';
const STAGE = '.rc294a-package';
const PHASE_A_COMMIT = 'aa9710440cc5a77ac433033ff6c6f3d39a6ef757';

const INCLUDE = [
  'src', 'tests', 'tools',
  'app.js', 'index.html', 'report.js', 'practice-journey.js', 'performance-model.js', 'styles.css',
  'question.schema.json', 'generator_manifest.json', 'package.json', 'vercel.json',
  'README_DEPLOY.txt', 'ENGINE_README.md'
];
const SEALED = p => /(^|\/)rc2\/.*(holdout|HOLDOUT)/.test(p.replace(/\\/g, '/')) || /\.zip$/.test(p);
const sha256 = path => createHash('sha256').update(readFileSync(path)).digest('hex');
const walk = dir => readdirSync(dir).sort().flatMap(f => {
  const p = join(dir, f);
  return statSync(p).isDirectory() ? walk(p) : [p];
});
const git = args => execFileSync('git', args, {encoding: 'utf8'}).trim();

// The production tree must BE the Phase-A checkpoint. Later commits in this
// checkout may only have touched evidence records.
const moved = git(['diff', '--name-only', PHASE_A_COMMIT, 'HEAD', '--',
  'src', 'app.js', 'index.html', 'report.js', 'practice-journey.js', 'performance-model.js',
  'generator_manifest.json', 'package.json']);
if (moved) throw new Error(`production has moved away from the Phase-A checkpoint:\n${moved}`);

rmSync(STAGE, {recursive: true, force: true});
mkdirSync(STAGE, {recursive: true});
for (const entry of INCLUDE) {
  if (!existsSync(entry)) throw new Error(`the package expects ${entry} and it is not there`);
  cpSync(entry, join(STAGE, entry), {recursive: true});
}
mkdirSync(join(STAGE, 'rc2'), {recursive: true});
for (const f of readdirSync('rc2').filter(f => !SEALED(`rc2/${f}`))) cpSync(join('rc2', f), join(STAGE, 'rc2', f), {recursive: true});

// The baselines, recovered from git and checked file by file against their own
// freeze records, so a reviewer can compare EXPLANATIONS on matched seeds.
execFileSync('node', ['tools/audit/rc294-baseline-bundle.mjs', join(STAGE, 'rc2', 'baseline')], {stdio: 'inherit'});

const leaked = walk(STAGE).filter(p => SEALED(p.slice(STAGE.length + 1)));
if (leaked.length) throw new Error(`the package would have shipped sealed material:\n${leaked.join('\n')}`);

const freeze = JSON.parse(readFileSync('rc2/FREEZE.json', 'utf8'));
const zeroDiff = existsSync('rc2/RC294_ZERO_DIFF.json') ? JSON.parse(readFileSync('rc2/RC294_ZERO_DIFF.json', 'utf8')) : null;
const baselines = JSON.parse(readFileSync(join(STAGE, 'rc2', 'baseline', 'MANIFEST.json'), 'utf8')).baselines;

writeFileSync(join(STAGE, 'RELEASE.json'), JSON.stringify({
  release: 'RC2.9.4A',
  phase: 'A — truthful distractor rationales and evidence-honest analytics; generation byte-identical to RC2.9.3',
  engineVersion: freeze.engineVersion,
  phaseACheckpoint: PHASE_A_COMMIT,
  commit: freeze.RC2_COMMIT,
  commitNote: 'the freeze was taken on a commit after the checkpoint; the commits between them touch rc2/ evidence records only, and this package refuses to build if any production file differs from the checkpoint',
  treeHash: freeze.treeHash,
  productionBundleSha256: freeze.productionBundleSha256,
  productionFileCount: freeze.productionFileCount,
  tests: freeze.testCount,
  internalGate: freeze.internalGate,
  zeroDiff: zeroDiff ? {
    seeds: zeroDiff.phaseA?.drawn ?? null,
    baselineDigest: zeroDiff.baseline?.digest ?? null,
    phaseADigest: zeroDiff.phaseA?.digest ?? null,
    identical: zeroDiff.compare?.same ?? null,
    manifest: 'rc2/RC294_ZERO_DIFF.json',
    regeneratedBy: 'tools/audit/rc294-zero-diff.mjs'
  } : null,
  baselines,
  contains: 'the Phase-A engine as frozen, its tests, its audit tools, this phase\'s evidence, and the RC2.9.3 and RC2.9.2 production bundles under rc2/baseline/',
  excludes: 'every holdout artifact, sealed or spent, and Phase B — no template, blueprint or scheduler change of the RC2.9.4 candidate is in this package',
  verify: [
    'npm test',
    'node -e "import(\'./tools/audit/rc2-freeze.mjs\').then(m=>console.log(m.verifyFreeze()))"',
    'node tools/audit/rc2-internal-gate.mjs',
    'node tools/audit/rc294-zero-diff.mjs   # redraws the reference seeds and re-derives the digest'
  ]
}, null, 2) + '\n');

execFileSync('zip', ['-q', '-r', '-X', join('..', OUT), '.'], {cwd: STAGE});
rmSync(STAGE, {recursive: true, force: true});

console.log(JSON.stringify({
  zip: OUT, bytes: statSync(OUT).size, sha256: sha256(OUT),
  release: 'RC2.9.4A', phaseACheckpoint: PHASE_A_COMMIT, frozenCommit: freeze.RC2_COMMIT,
  productionBundleSha256: freeze.productionBundleSha256, productionFileCount: freeze.productionFileCount,
  tests: freeze.testCount
}, null, 2));
