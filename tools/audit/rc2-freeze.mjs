// RC2 §24 — the freeze.
//
// Records exactly what is being frozen, so the holdout can be attributed to a
// specific engine and so any later modification is detectable rather than
// arguable. After this point no production file changes.
//
// The tree hash is git's own hash of the checked-out content, which is not the
// commit hash: two commits with different messages but identical content share
// it. That is the right identity for "what does this engine consist of".

import {writeFileSync, mkdirSync, readFileSync, readdirSync, statSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {join} from 'node:path';

import {ENGINE_VERSION} from '../../src/index.js';
import {DEVELOPMENT_SEEDS, HOLDOUT_SEED} from './rc2-development-corpus.mjs';

const git = args => execFileSync('git', args, {encoding: 'utf8'}).trim();

/** Every production file, with its own hash, so a later edit is visible. */
function productionFiles() {
  const roots = ['src', 'report.js', 'app.js', 'index.html', 'generator_manifest.json', 'package.json'];
  const files = [];
  const walk = p => {
    const st = statSync(p);
    if (st.isDirectory()) for (const f of readdirSync(p).sort()) walk(join(p, f));
    else files.push(p);
  };
  for (const r of roots) walk(r);
  return files.sort().map(path => ({
    path,
    bytes: statSync(path).size,
    sha256: createHash('sha256').update(readFileSync(path)).digest('hex')
  }));
}

/**
 * Freezes taken before the candidate had stopped moving. They live in their own
 * file so that FREEZE.json can legitimately be absent when the §23 gate runs —
 * the gate runs the suite, and the suite cannot require a freeze that does not
 * exist yet — while the history of what was frozen and why it did not hold is
 * still kept rather than erased.
 */
function priorFreezes() {
  try {
    return JSON.parse(readFileSync('rc2/SUPERSEDED_FREEZES.json', 'utf8')).entries ?? [];
  } catch { return []; }
}

export function freeze() {
  const gate = JSON.parse(readFileSync('rc2/INTERNAL_GATE.json', 'utf8'));
  if (gate.verdict !== 'PASS') {
    throw new Error(`§24 refuses to freeze: the §23 gate says ${gate.verdict}`);
  }
  const status = git(['status', '--porcelain']);
  if (status !== '') throw new Error(`§24 refuses to freeze a dirty tree:\n${status}`);

  const files = productionFiles();
  const corpus = JSON.parse(readFileSync('rc2/DEVELOPMENT_CORPUS.json', 'utf8'));
  const matrix = JSON.parse(readFileSync('rc2/COVERAGE_MATRIX.json', 'utf8'));

  let testCount = null;
  try {
    const out = execFileSync('npm', ['test'], {encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 900000});
    const m = /^# tests (\d+)$/m.exec(out);
    testCount = m ? Number(m[1]) : null;
  } catch { /* the gate already ran it */ }

  // RC2.1: rc2/ now holds directories as well as files (the holdout delivery
  // package), so the evidence scan walks rather than assuming a flat listing.
  const walkEvidence = dir => readdirSync(dir).sort().flatMap(f => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walkEvidence(p) : [{
      path: p, bytes: statSync(p).size,
      sha256: createHash('sha256').update(readFileSync(p)).digest('hex')
    }];
  });
  const evidence = walkEvidence('rc2');

  const prior = priorFreezes();
  return {
    schema: 'rc2-freeze-v1',
    supersedes: prior,
    section: '§24',
    frozenAt: new Date().toISOString(),
    RC2_COMMIT: git(['rev-parse', 'HEAD']),
    treeHash: git(['rev-parse', 'HEAD^{tree}']),
    branch: git(['rev-parse', '--abbrev-ref', 'HEAD']),
    engineVersion: ENGINE_VERSION,
    testCount,
    frozenRC1Baseline: matrix.frozenRC1Baseline,
    scopeCommit: matrix.scopeCommit,
    scopeSchema: matrix.scopeSchema,
    developmentSeeds: [...DEVELOPMENT_SEEDS],
    holdoutSeed: HOLDOUT_SEED,
    holdoutGenerated: false,
    developmentCorpus: {
      published: corpus.corpus.published,
      templates: corpus.corpus.templates,
      families: corpus.corpus.families,
      sha256: corpus.corpus.sha256,
      gzipSha256: createHash('sha256').update(readFileSync('rc2/development-corpus.jsonl.gz')).digest('hex')
    },
    // gateHeadCommit is what makes the freeze auditable: it names the commit the
    // §23 gate actually evaluated. A freeze is only honest if production is
    // identical between that commit and RC2_COMMIT, and that is checkable with
    // git rather than on trust. The first freeze failed exactly here.
    internalGate: {
      verdict: gate.verdict, conditions: gate.conditions,
      evaluatedAt: gate.evaluatedAt, headCommit: gate.headCommit
    },
    productionFileCount: files.length,
    productionFiles: files,
    productionBundleSha256: createHash('sha256')
      .update(files.map(f => `${f.path}:${f.sha256}`).join('\n')).digest('hex'),
    evidenceArtifacts: evidence,
    declaration: 'After this point no production file changes. The holdout is generated from this engine and from no other.',
    note: 'RC2_COMMIT identifies the frozen PRODUCTION state. This file is evidence recorded about that state, so the commit that carries this file is necessarily a later one; what must not change is productionBundleSha256, and verifyFreeze() is what checks that.'
  };
}

/**
 * §24 enforcement. The freeze is only meaningful if a later edit is caught, so
 * this recomputes the production bundle hash and reports every file that has
 * moved since. Evidence files are expected to be added after the freeze; a
 * production file is not.
 */
export function verifyFreeze(path = 'rc2/FREEZE.json') {
  const frozen = JSON.parse(readFileSync(path, 'utf8'));
  const now = productionFiles();
  const before = new Map(frozen.productionFiles.map(f => [f.path, f.sha256]));
  const after = new Map(now.map(f => [f.path, f.sha256]));

  const changed = [], added = [], removed = [];
  for (const [p2, h] of after) {
    if (!before.has(p2)) added.push(p2);
    else if (before.get(p2) !== h) changed.push(p2);
  }
  for (const p2 of before.keys()) if (!after.has(p2)) removed.push(p2);

  const bundle = createHash('sha256')
    .update(now.map(f => `${f.path}:${f.sha256}`).join('\n')).digest('hex');

  return {
    frozenCommit: frozen.RC2_COMMIT,
    frozenBundle: frozen.productionBundleSha256,
    currentBundle: bundle,
    intact: bundle === frozen.productionBundleSha256,
    changed, added, removed
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const f = freeze();
  mkdirSync('rc2', {recursive: true});
  writeFileSync('rc2/FREEZE.json', JSON.stringify(f, null, 2) + '\n');
  console.log(JSON.stringify({
    RC2_COMMIT: f.RC2_COMMIT, treeHash: f.treeHash, branch: f.branch,
    engineVersion: f.engineVersion, testCount: f.testCount,
    developmentSeeds: f.developmentSeeds, holdoutSeed: f.holdoutSeed,
    developmentCorpus: f.developmentCorpus,
    productionFileCount: f.productionFileCount,
    productionBundleSha256: f.productionBundleSha256,
    internalGate: f.internalGate
  }, null, 2));
}
