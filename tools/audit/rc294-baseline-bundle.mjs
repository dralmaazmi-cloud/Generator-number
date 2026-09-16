#!/usr/bin/env node
// RC2.9.4 clarification, Part 2. The baseline directory a delivery package
// carries so a reviewer can run a MATCHED-SEED comparison instead of reading
// this release's word for what changed.
//
// Each baseline is recovered from git at the commit its own freeze record
// names, and every file is checked against the per-file hash in that record
// before it is written. The bundle hash is then recomputed the way the freeze
// computes it and compared with the frozen value. A baseline that does not
// verify is not written at all.
//
// Usage: node tools/audit/rc294-baseline-bundle.mjs <target-dir>
//   writes <target-dir>/rc293/…, <target-dir>/rc292/…, MANIFEST.json, README.txt

import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync, mkdirSync, rmSync, existsSync} from 'node:fs';
import {dirname, join} from 'node:path';

const TARGET = process.argv[2];
if (!TARGET) throw new Error('usage: rc294-baseline-bundle.mjs <target-dir>');

const BASELINES = [
  {id: 'rc293', release: 'RC2.9.3', freeze: 'rc2/FREEZE.RC2_9_3.json', deliveryZip: 'RC2_9_3_GENERATOR_READY.zip'},
  {id: 'rc292', release: 'RC2.9.2', freeze: 'rc2/FREEZE.RC2_9_2.json', deliveryZip: 'RC2_9_2_GENERATOR_READY.zip'}
];

const sha = buf => createHash('sha256').update(buf).digest('hex');
const show = (commit, path) => execFileSync('git', ['show', `${commit}:${path}`], {maxBuffer: 64 * 1024 * 1024});

rmSync(TARGET, {recursive: true, force: true});
mkdirSync(TARGET, {recursive: true});

const manifest = [];
for (const b of BASELINES) {
  if (!existsSync(b.freeze)) throw new Error(`no freeze record at ${b.freeze}`);
  const f = JSON.parse(readFileSync(b.freeze, 'utf8'));
  const dir = join(TARGET, b.id);
  const mismatched = [];
  for (const file of f.productionFiles) {
    const buf = show(f.RC2_COMMIT, file.path);
    if (sha(buf) !== file.sha256) { mismatched.push(file.path); continue; }
    const out = join(dir, file.path);
    mkdirSync(dirname(out), {recursive: true});
    writeFileSync(out, buf);
  }
  if (mismatched.length) throw new Error(`${b.release}: git content does not match the freeze for:\n${mismatched.join('\n')}`);
  const bundle = sha(f.productionFiles.map(x => `${x.path}:${x.sha256}`).join('\n'));
  if (bundle !== f.productionBundleSha256) throw new Error(`${b.release}: recomputed bundle ${bundle} ≠ frozen ${f.productionBundleSha256}`);
  writeFileSync(join(dir, 'SHA256SUMS'), f.productionFiles.map(x => `${x.sha256}  ${x.path}`).join('\n') + '\n');
  writeFileSync(join(dir, 'FREEZE.json'), JSON.stringify(f, null, 2) + '\n');
  manifest.push({
    release: b.release, directory: `${b.id}/`, commit: f.RC2_COMMIT, treeHash: f.treeHash,
    engineVersion: f.engineVersion, productionFileCount: f.productionFileCount,
    productionBundleSha256: f.productionBundleSha256, tests: f.testCount,
    deliveryZipInRepository: b.deliveryZip,
    deliveryZipSha256: existsSync(b.deliveryZip) ? sha(readFileSync(b.deliveryZip)) : null,
    verified: 'every file recovered from git and matched against this release\'s own per-file hash'
  });
  console.log(`${b.release}: ${f.productionFileCount} production files verified, bundle ${f.productionBundleSha256}`);
}

writeFileSync(join(TARGET, 'MANIFEST.json'), JSON.stringify({
  purpose: 'matched-seed comparison against earlier releases',
  baselines: manifest
}, null, 2) + '\n');

writeFileSync(join(TARGET, 'README.txt'),
  'rc2/baseline — earlier releases, as production source, for matched-seed comparison.\n'
  + '\n'
  + 'rc293/  RC2.9.3, the release this candidate is measured against\n'
  + 'rc292/  RC2.9.2, the diversity baseline RC2.9.3 itself refined\n'
  + '\n'
  + 'Each directory holds that release\'s PRODUCTION bundle exactly as its freeze\n'
  + 'record attests it: src/, app.js, index.html, report.js, practice-journey.js,\n'
  + 'performance-model.js, generator_manifest.json, package.json — nothing else.\n'
  + 'SHA256SUMS lists every file\'s hash and FREEZE.json is the release\'s own freeze.\n'
  + 'Node needs no dependencies to run the engine, so a baseline is directly usable:\n'
  + '\n'
  + '  # one seed, both engines, explanations side by side\n'
  + '  node -e "import(\'./src/index.js\').then(async m=>{const E=m.default;\\\n'
  + '    const q=new E().generateQuestion({seed:\'cmp-1\',difficulty:\'medium\'});\\\n'
  + '    console.log(q.question);console.log(q.explanation);\\\n'
  + '    console.log(JSON.stringify(q.option_rationales??q.distractor_rationales,null,1));})"\n'
  + '\n'
  + '  # and the same command with  cd rc2/baseline/rc293  in front of it\n'
  + '\n'
  + 'The seeds are the only thing that has to match: both engines draw the same\n'
  + 'question for the same seed (rc2/RC294_ZERO_DIFF.json records that over 10,000\n'
  + 'seeds for the Phase-A checkpoint), so any difference the reviewer sees is a\n'
  + 'difference in the TEXT, which is what the RC2.9.3 review could not check.\n');

console.log(`baseline written to ${TARGET}`);
