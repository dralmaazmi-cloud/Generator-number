#!/usr/bin/env node
// RC2.9.5 §9. The delivery package (RC2.9.4-B11's, carried forward).
//
// What goes in: the engine as frozen, the tests that hold it there, the audit
// tools a reviewer needs to re-run the evidence themselves, and the evidence
// this release produced.
//
// What stays out, and why: every holdout ARTIFACT — a blind package, a reveal,
// a verdict file, a full holdout corpus. One of those in a delivery ZIP is a
// holdout nobody can use again, and the sealed material of earlier releases is
// not this release's to publish. The exclusion is by pattern rather than by a
// list, so a holdout file added later is excluded by default rather than by
// being remembered.
//
// The holdout TOOLS do ship, and the distinction is deliberate: they are the
// code that builds and seals a holdout, they hold no sealed content, and the
// suite imports them. A reviewer who cannot run the tools cannot re-verify the
// engine, which is the point of shipping it.

import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync, rmSync, mkdirSync, cpSync, writeFileSync, existsSync, readdirSync, statSync} from 'node:fs';
import {join} from 'node:path';

const OUT = 'RC2_9_5_GENERATOR_READY.zip';
const STAGE = '.rc295-package';

/** The engine itself, plus everything needed to run and re-verify it. */
const INCLUDE = [
  'src', 'tests', 'tools',
  'app.js', 'index.html', 'report.js', 'practice-journey.js', 'performance-model.js', 'styles.css',
  'question.schema.json', 'generator_manifest.json', 'package.json', 'vercel.json',
  'README_DEPLOY.txt', 'ENGINE_README.md'
];

/**
 * Sealed material: anything under the evidence directory whose name says
 * holdout, and any archive. Source files are judged by where they are, not by
 * what they are called — `tools/audit/rc26-holdout-f-key.mjs` is the program
 * that seals a holdout, not a holdout.
 */
const SEALED = p => /(^|\/)rc2\/.*(holdout|HOLDOUT)/.test(p.replace(/\\/g, '/'))
  || /\.zip$/.test(p);

function evidenceFiles() {
  return readdirSync('rc2').filter(f => !SEALED(`rc2/${f}`));
}

function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function walk(dir) {
  return readdirSync(dir).sort().flatMap(f => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

rmSync(STAGE, {recursive: true, force: true});
mkdirSync(STAGE, {recursive: true});

for (const entry of INCLUDE) {
  if (!existsSync(entry)) throw new Error(`the package expects ${entry} and it is not there`);
  cpSync(entry, join(STAGE, entry), {recursive: true});
}
mkdirSync(join(STAGE, 'rc2'), {recursive: true});
for (const f of evidenceFiles()) cpSync(join('rc2', f), join(STAGE, 'rc2', f), {recursive: true});

// RC2.9.5 §9. The earlier releases' production bundles — now rc294 as well as
// rc293 and rc292 — so a reviewer can compare on matched seeds instead of
// taking this release's word for what changed.
// RC2.9.4 clarification, Part 2. The earlier releases' production bundles, so a
// reviewer can compare EXPLANATIONS on matched seeds instead of taking this
// release's word for what changed. Each file is recovered from git and checked
// against that release's own freeze record before it is written.
execFileSync('node', ['tools/audit/rc294-baseline-bundle.mjs', join(STAGE, 'rc2', 'baseline')], {stdio: 'inherit'});

// The package must not carry a holdout, and this says so as a check rather
// than as a claim: the staged tree is searched after it is built.
const leaked = walk(STAGE).filter(p => SEALED(p.slice(STAGE.length + 1)));
if (leaked.length) throw new Error(`the package would have shipped sealed material:\n${leaked.join('\n')}`);

const freeze = JSON.parse(readFileSync('rc2/FREEZE.json', 'utf8'));
writeFileSync(join(STAGE, 'RELEASE.json'), JSON.stringify({
  release: freeze.release,
  engineVersion: freeze.engineVersion,
  commit: freeze.RC2_COMMIT,
  treeHash: freeze.treeHash,
  productionBundleSha256: freeze.productionBundleSha256,
  productionFileCount: freeze.productionFileCount,
  tests: freeze.testCount,
  internalGate: freeze.internalGate,
  developmentCorpus: freeze.developmentCorpus,
  signoffHoldoutSeed: freeze.holdoutSeed,
  holdoutGenerated: freeze.holdoutGenerated,
  contains: 'the engine as frozen, its tests, its audit tools, this release\'s evidence, and the RC2.9.4, RC2.9.3 and RC2.9.2 production bundles under rc2/baseline/',
  baselines: JSON.parse(readFileSync(join(STAGE, 'rc2', 'baseline', 'MANIFEST.json'), 'utf8')).baselines,
  excludes: 'every holdout artifact, sealed or spent, and the delivery packages of earlier releases',
  verify: [
    'npm test                                   # the full suite',
    'node tools/audit/rc292-acceptance.mjs      # THE PRODUCT: three 50→50→50 journeys and a 4×50 stress, in a browser',
    'node tools/audit/rc291-acceptance.mjs      # the two-sitting product journeys',
    'node tools/audit/rc29-acceptance.mjs       # the engine contract, on unused seeds',
    'node tools/audit/rc29-journey.mjs          # the three engine regression journeys',
    'node tools/audit/rc2-internal-gate.mjs     # the 39-condition release gate',
    'node -e "import(\\"./tools/audit/rc2-freeze.mjs\\").then(m=>console.log(m.verifyFreeze()))"'
  ],
  browserJourney: 'tools/audit/rc291-acceptance.mjs and tests/rc291-browser-journey.test.mjs '
    + 'drive index.html in a real Chromium. They need one: `npm install --no-save playwright-core` '
    + 'and RC291_CHROME pointing at a Chromium binary. Without it those tests report "skipped" and '
    + 'say why; everything else in the suite runs with no dependencies at all.'
}, null, 2) + '\n');

execFileSync('zip', ['-q', '-r', '-X', join('..', OUT), '.'], {cwd: STAGE});
rmSync(STAGE, {recursive: true, force: true});

console.log(JSON.stringify({
  zip: OUT,
  bytes: statSync(OUT).size,
  sha256: sha256(OUT),
  release: freeze.release,
  engineVersion: freeze.engineVersion,
  commit: freeze.RC2_COMMIT,
  productionBundleSha256: freeze.productionBundleSha256
}, null, 2));
