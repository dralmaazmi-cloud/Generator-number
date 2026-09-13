// RC2-021 — one authoritative version source.
//
// RC1 shipped ENGINE_VERSION 1.3.0 while report.js printed v1.2.0 in the PDF
// footer and index.html showed v1.2.0 in the UI pill. Two hard-coded literals,
// silently stale. This test fails if any declared version disagrees again.

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

import Engine, {ENGINE_VERSION} from '../src/index.js';
import {buildPrintReportHtml} from '../report.js';

test('RC2-021: the engine instance reports the authoritative version', () => {
  assert.equal(new Engine().version, ENGINE_VERSION);
});

test('RC2-021: generated questions carry the authoritative version', () => {
  const q = new Engine().generateQuestion({family: 'speed', difficulty: 'easy', seed: 'rc2-version'});
  assert.equal(q.metadata.engine_version, ENGINE_VERSION);
});

test('RC2-021: the report footer derives from the authoritative version', () => {
  const html = buildPrintReportHtml({settings: {mode: 'training', difficulty: 'mixed', count: 0}, questions: [], responses: [], summary: {}});
  const m = /Engine v(\d+\.\d+\.\d+)/.exec(html);
  assert.ok(m, 'the footer must state a version');
  assert.equal(m[1], ENGINE_VERSION);
});

test('RC2-021: the generator manifest agrees', () => {
  const manifest = JSON.parse(readFileSync('generator_manifest.json', 'utf8'));
  assert.equal(manifest.engine_version, ENGINE_VERSION);
});

test('RC2.9.1: the manifest describes the engine that ships with it', async () => {
  // It claimed 107 templates while the engine held 155, and its per-family
  // lists had not moved since RC2.4. A manifest an integrator reads to find out
  // what the generator can do may not be a record of an older one, so it is
  // derived from the runtime and this test is what keeps it derived.
  const {buildManifest} = await import('../tools/audit/rc291-manifest.mjs');
  const onDisk = JSON.parse(readFileSync('generator_manifest.json', 'utf8'));
  const fromEngine = buildManifest();
  assert.equal(onDisk.template_count, fromEngine.template_count,
    'rerun node tools/audit/rc291-manifest.mjs');
  assert.deepEqual(Object.keys(onDisk.families).sort(), Object.keys(fromEngine.families).sort());
  for (const [id, f] of Object.entries(fromEngine.families)) {
    for (const band of ['easy', 'medium', 'hard']) {
      assert.deepEqual(onDisk.families[id].templates[band].map(t => t.id),
        f.templates[band].map(t => t.id), `${id}/${band} is stale`);
    }
  }
});

test('RC2-021: no shipped file hard-codes a different version', () => {
  const offenders = [];
  for (const file of ['index.html', 'report.js', 'app.js', 'practice-journey.js',
    'generator_manifest.json', 'package.json']) {
    // Comments may name a historical version on purpose — the note in app.js
    // records the very defect this test guards — so only code is scanned.
    const code = readFileSync(file, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/^\s*\/\/.*$/gm, ' ');
    for (const m of code.matchAll(/v?(\d+\.\d+\.\d+)/g)) {
      // package.json carries the npm version, which is the same number.
      if (m[1] !== ENGINE_VERSION) offenders.push(`${file}: ${m[0]}`);
    }
  }
  assert.deepEqual(offenders, [], `stale version literals: ${offenders.join(', ')}`);
});

test('RC2-021 meta: the scan would catch a stale literal', () => {
  const stale = 'Engine v1.2.0';
  const m = /v(\d+\.\d+\.\d+)/.exec(stale);
  assert.notEqual(m[1], ENGINE_VERSION, 'the meta-fixture must differ, or the scan proves nothing');
});
