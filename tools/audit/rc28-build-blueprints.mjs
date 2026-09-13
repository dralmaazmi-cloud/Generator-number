#!/usr/bin/env node
// RC2.8-2. Regenerates src/compose/blueprints.js from the live engine.
//
// The catalogue is committed rather than computed at start-up — a session must
// not pay for 145 sample generations before it can plan — but it must never
// drift from the engine it describes. So it is DERIVED here, by pinning every
// adjudicated template and recording which jobs it actually asks, and
// tests/rc28-blueprints.test.mjs re-derives it on every run and fails on any
// difference.
//
// Usage: node tools/audit/rc28-build-blueprints.mjs [--check]

import {writeFileSync, readFileSync} from 'node:fs';
import Engine from '../../src/index.js';
import {TEMPLATE_STRUCTURE} from '../../src/qa/structure.js';
import {INFO_STRUCTURE_BY_TEMPLATE} from '../../src/qa/perceptual-taxonomy.js';

/** Template ids carry their family in their prefix; this is that mapping. */
export const FAMILY_BY_PREFIX = Object.freeze({
  SEQ: 'sequences', PROP: 'direct_proportion', RAT: 'ratios', MACH: 'machines',
  PCT: 'percentages', AVG: 'averages', AGE: 'ages', SPD: 'speed',
  WORK: 'work_time', CAL: 'calendar', PL: 'profit_loss', FRAC: 'fractions',
  RATE: 'unit_rate', COMB: 'combined_rate', REL: 'relational', ODD: 'odd_one_out'
});

export const SAMPLES_PER_TEMPLATE = 30;

/** What each template can be asked for, observed rather than declared. */
export function deriveBlueprints({samples = SAMPLES_PER_TEMPLATE} = {}) {
  const engine = new Engine();
  const rows = [];
  const unreachable = [];
  for (const [templateId, entry] of Object.entries(TEMPLATE_STRUCTURE)) {
    const family = FAMILY_BY_PREFIX[templateId.split('_')[0]];
    if (!family) throw new Error(`RC28_UNKNOWN_TEMPLATE_PREFIX: ${templateId}`);
    const tasks = new Map();
    for (let i = 0; i < samples; i++) {
      let q;
      try {
        q = engine.generateQuestion({
          family, difficulty: entry.band, templateId,
          seed: `rc28-catalogue|${templateId}|${i}`
        });
      } catch { continue; }
      if (q.generator_id !== templateId) continue;
      const task = q.metadata.task_signature;
      if (!tasks.has(task)) tasks.set(task, new Set());
      tasks.get(task).add(q.metadata.asked_unknown);
    }
    if (!tasks.size) { unreachable.push(templateId); continue; }
    for (const [task, targets] of tasks) {
      rows.push({
        templateId, family, band: entry.band, task,
        info: INFO_STRUCTURE_BY_TEMPLATE[templateId] ?? 'DIRECT_GIVENS',
        targets: [...targets].sort()
      });
    }
  }
  rows.sort((a, b) =>
    a.family.localeCompare(b.family) || a.templateId.localeCompare(b.templateId)
    || a.task.localeCompare(b.task));
  return {rows, unreachable};
}

const HEAD = `// RC2.8-2. The blueprint catalogue: the SEMANTIC space the scheduler chooses
// from, before a single number, name or sentence is drawn.
//
// The defect this exists to fix.
//
// Generation used to run one way round: draw a question, look at what came out,
// and reject it if it repeated something. On a 100-question sitting that took
// 621 candidates to publish 100 — 521 rejections — and the repetition still got
// through, because a rejection-driven loop has no idea what it is LOOKING for.
// It cannot aim at the thing the session is short of; it can only refuse what it
// happens to be handed, and when the retry budget runs out it takes whatever is
// left. That is why the repetition concentrated in the last third of a session.
//
// So the order is inverted. A blueprint — family, band, template, the task it
// asks, the way it lays its information out — is chosen FIRST, against what the
// session already contains, and the renderer is then told which blueprint to
// realise. Numbers, names, scenario and wording are drawn afterwards and cannot
// change the blueprint.
//
// GENERATED FILE. Rebuild with:
//     node tools/audit/rc28-build-blueprints.mjs
// tests/rc28-blueprints.test.mjs re-derives it against the live engine on every
// run, so a template that changes which tasks it asks, or that stops being
// reachable at its band, fails the test rather than silently leaving the
// scheduler planning against a fiction.
//
// \`targets\` lists the unknowns a template was observed to ask for that task. It
// is evidence for the reader of this file, not an input to selection.

/**
 * @typedef {object} Blueprint
 * @property {string} templateId  which template realises it
 * @property {string} family
 * @property {'easy'|'medium'|'hard'} band
 * @property {string} task        the normalised job and answer class
 * @property {string} info        how the information is laid out
 * @property {string[]} targets   the unknowns observed for this task
 */

/** @type {Blueprint[]} */
export const BLUEPRINTS = Object.freeze([
`;

const TAIL = `
].map(Object.freeze));

/** A blueprint's identity for scheduling: the idea, not the instance. */
export const blueprintId = b => \`\${b.family}|\${b.templateId}|\${b.task}\`;

/** Same family, same job, same layout — the unit a reader perceives as "again". */
export const presentationOf = b => \`\${b.family}|\${b.task}|\${b.info}\`;

const byKey = new Map();
for (const b of BLUEPRINTS) byKey.set(\`\${b.templateId}|\${b.task}\`, b);

/**
 * The blueprint a finished question realises. A template that gains a task the
 * catalogue has not recorded yet still gets a blueprint here rather than a null,
 * so the scheduler's accounting stays complete; the catalogue test is what makes
 * that case visible instead of permanent.
 */
export function blueprintFor(templateId, task, family = '?', band = '?', info = 'DIRECT_GIVENS') {
  return byKey.get(\`\${templateId}|\${task}\`)
    ?? {templateId, family, band, task, info, targets: [], uncatalogued: true};
}

const byBand = new Map();
for (const b of BLUEPRINTS) {
  if (!byBand.has(b.band)) byBand.set(b.band, []);
  byBand.get(b.band).push(b);
}

/** Every blueprint that can fill a slot of this band, optionally within a family pool. */
export function blueprintsForBand(band, families = null) {
  const all = byBand.get(band) ?? [];
  if (!families || !families.length) return all;
  const allowed = new Set(families);
  return all.filter(b => allowed.has(b.family));
}

/** How much genuinely distinct material a band holds. Reported, never adjusted. */
export function bandCapacity(band, families = null) {
  const pool = blueprintsForBand(band, families);
  return {
    band,
    blueprints: pool.length,
    families: new Set(pool.map(b => b.family)).size,
    tasks: new Set(pool.map(b => b.task)).size,
    presentations: new Set(pool.map(presentationOf)).size
  };
}
`;

export function render(rows) {
  const body = rows.map(r =>
    `  {templateId: '${r.templateId}', family: '${r.family}', band: '${r.band}', `
    + `task: '${r.task}', info: '${r.info}', `
    + `targets: [${r.targets.map(t => `'${t}'`).join(', ')}]}`).join(',\n');
  return HEAD + body + TAIL;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const {rows, unreachable} = deriveBlueprints();
  const text = render(rows);
  const path = new URL('../../src/compose/blueprints.js', import.meta.url).pathname;
  if (process.argv.includes('--check')) {
    const same = readFileSync(path, 'utf8') === text;
    console.log(same ? 'blueprints.js is current' : 'blueprints.js is STALE — rerun without --check');
    process.exitCode = same ? 0 : 1;
  } else {
    writeFileSync(path, text);
    console.log(`wrote ${rows.length} blueprints`);
  }
  if (unreachable.length) console.log('UNREACHABLE:', unreachable.join(', '));
}
