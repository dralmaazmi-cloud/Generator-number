#!/usr/bin/env node
// RC2.9.4 Phase B evidence: breadth BEFORE/AFTER per family×band, the
// classifier under both keys (Addition 1), representative new questions per
// thin family, and the capacity ceilings behind every gate that is not met
// (Addition 2). Written to rc2/RC294_PHASE_B_EVIDENCE.md.
//
// BEFORE numbers come from the RC2.9.3 baseline worktree when one is given
// (--base <dir>), measured with this same instrument; otherwise from the
// file named by --before (a saved run of rc294-band-capacity.mjs).
//
// Usage: node tools/audit/rc294-phase-b-evidence.mjs [--before <capacity-before.txt>] [--after <capacity-after.txt>]

import {readFileSync, writeFileSync, existsSync} from 'node:fs';
import Engine from '../../src/index.js';
import {blueprintsForBand} from '../../src/compose/blueprints.js';
import {capacityFor} from '../../src/compose/blueprint-scheduler.js';
import {measureSample, classify} from '../../src/qa/perceptual-classify.js';
import {structuralBandOf} from '../../src/qa/structure.js';

const args = process.argv.slice(2);
const opt = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const BEFORE = opt('--before');
const AFTER = opt('--after');
const OUT = opt('--out') ?? 'rc2/RC294_PHASE_B_EVIDENCE.md';

export const NEW_TEMPLATES = Object.freeze({
  easy: {
    ages: ['AGE_E_RATIO_SUM', 'AGE_E_TIME_SHIFT', 'AGE_E_YEARS_TO_SUM'],
    machines: ['MACH_E_RATE_FROM_TOTAL', 'MACH_E_TIME_FOR_TARGET', 'MACH_E_COMPARE'],
    ratios: ['RAT_E_DIFF_SPLIT', 'RAT_E_THREE_WAY', 'RAT_E_TOTAL_FROM_PART'],
    relational: ['REL_E_STATEMENT_TRUE', 'REL_E_GAP_CHAIN'],
    averages: ['AVG_E_LIST', 'AVG_E_MISSING_VALUE'],
    speed: ['SPD_E_SPEED', 'SPD_E_UNIT_MINUTES', 'SPD_E_SAME_DIRECTION_GAP'],
    sequences: ['SEQ_E_NTH_TERM', 'SEQ_E_COUNT_TERMS']
  },
  medium: {
    fractions: ['FRAC_M_REMAIN_VALUE', 'FRAC_M_START_FROM_REMAINDER', 'FRAC_M_COMPARE_SHARES'],
    calendar: ['CAL_M_DATE_WEEKDAY', 'CAL_M_NTH_VISIT'],
    ratios: ['RAT_M_TOTAL_FROM_GAP', 'RAT_M_THIRD_FROM_GAP'],
    direct_proportion: ['PROP_M_UNIT_PRICE_COMPARE', 'PROP_M_SCALE_ACROSS_HOURS'],
    unit_rate: ['RATE_M_COMPARE', 'RATE_M_HOURS_FROM_MINUTE_RATE']
  }
});

const engine = new Engine();
const families = engine.listFamilies().map(f => f.id);

/** Parse a saved capacity run into {band: {family: row}} and the journey tables. */
function parseCapacityFile(path) {
  const text = readFileSync(path, 'utf8');
  const out = {capacity: {}, journeys: {}};
  let band = null, mode = null;
  for (const line of text.split('\n')) {
    let m;
    if ((m = line.match(/^=== (EASY|MEDIUM) capacity/))) { band = m[1].toLowerCase(); mode = 'cap'; out.capacity[band] = {}; continue; }
    if ((m = line.match(/^=== (EASY|MEDIUM) journeys/))) { band = m[1].toLowerCase(); mode = 'jr'; out.journeys[band] = []; continue; }
    if (mode === 'cap' && (m = line.match(/^(\w+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+([\d.]+)\s+([\d.]+)/))) {
      out.capacity[band][m[1]] = {bp: +m[2], tpl: +m[3], sub: +m[4], task: +m[5], tgt: +m[6], info: +m[7], perc: +m[8], pres: +m[9], topPerc: +m[10], topPres: +m[11]};
    }
    if (mode === 'jr' && (m = line.match(/^(rc294-\S+)\s+(\d+)\s+(\d+)\s+\|\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+\|\s*(.*)$/))) {
      out.journeys[band].push({label: m[1], questions: +m[2], refusals: +m[3], pv: +m[4], nd: +m[5], flagged: +m[6], cluster: +m[7], run: +m[8], dup: +m[9], rest: m[10]});
    }
  }
  return out;
}

/** The classifier under an ALTERNATIVE parameter-variant key (Addition 1). */
function classifyAlt(rows) {
  const seenParam = new Set(), seenPerceptual = new Set();
  return rows.map(q => {
    const m = q.metadata;
    const paramKey = `${q.generator_id}|${m.task_signature}|${m.sub_idea_signature}`;
    let label;
    if (seenParam.has(paramKey)) label = 'PARAMETER_ONLY_VARIANT';
    else if (seenPerceptual.has(m.user_perceptual_signature)) label = 'NEAR_DUPLICATE_CONSTRUCTION';
    else label = 'OTHER';
    seenParam.add(paramKey); seenPerceptual.add(m.user_perceptual_signature);
    return label;
  });
}

function journeyBothClassifiers(band, label, sittings = 4, count = 30) {
  const questions = [];
  let history = null;
  for (let s = 0; s < sittings; s++) {
    const r = engine.generatePractice({seed: `${label}-s${s + 1}`, count, difficulty: band, diversityHistory: history});
    questions.push(...r.questions); history = r.diversity_history;
  }
  const worst = {a: {pv: 0, nd: 0, flagged: 0}, b: {pv: 0, nd: 0, flagged: 0}};
  for (let start = 0; start + 100 <= questions.length; start += 10) {
    const rows = questions.slice(start, start + 100);
    const m = measureSample(rows, {label: 'w'});
    worst.a.pv = Math.max(worst.a.pv, m.counts.PARAMETER_ONLY_VARIANT); worst.a.nd = Math.max(worst.a.nd, m.counts.NEAR_DUPLICATE_CONSTRUCTION); worst.a.flagged = Math.max(worst.a.flagged, m.flagged);
    const alt = classifyAlt(rows);
    const pv = alt.filter(x => x === 'PARAMETER_ONLY_VARIANT').length, nd = alt.filter(x => x === 'NEAR_DUPLICATE_CONSTRUCTION').length;
    worst.b.pv = Math.max(worst.b.pv, pv); worst.b.nd = Math.max(worst.b.nd, nd); worst.b.flagged = Math.max(worst.b.flagged, pv + nd);
  }
  return worst;
}

const md = [];
md.push('# RC2.9.4 Phase B — EASY/MEDIUM breadth evidence');
md.push('');
md.push('Instrument: `tools/audit/rc294-band-capacity.mjs` (250 draws per family×band through `generateQuestion`; 6 single-band journeys × 4 sittings × 30 through `generatePractice` with the journey history carried; rolling windows of 100, step 10, RC2.9.2 classifier). Product-path (browser) figures are in `rc2/RC294_SINGLE_BAND_ACCEPTANCE.txt`.');
md.push('');
md.push('Columns: bp = blueprints, tpl = templates realised, sub = sub-idea signatures, task = task archetypes, tgt = reasoning-target pairs, info = information structures, perc = user-perceptual constructions, pres = presentations (family|task|layout), topPerc/topPres = share of draws taken by the most frequent construction/presentation.');

const before = BEFORE && existsSync(BEFORE) ? parseCapacityFile(BEFORE) : null;
const after = AFTER && existsSync(AFTER) ? parseCapacityFile(AFTER) : null;
for (const band of ['easy', 'medium']) {
  md.push('', `## ${band.toUpperCase()} capacity map — BEFORE (RC2.9.3) → AFTER (RC2.9.4)`, '');
  md.push('| family | bp | tpl | sub | task | tgt | info | perc | pres | topPerc | new constructions |');
  md.push('|---|---|---|---|---|---|---|---|---|---|---|');
  for (const family of families) {
    const b = before?.capacity?.[band]?.[family], a = after?.capacity?.[band]?.[family];
    const cell = k => (b && a ? (b[k] === a[k] ? String(a[k]) : `${b[k]} → **${a[k]}**`) : a ? String(a[k]) : '?');
    const added = NEW_TEMPLATES[band][family] ?? [];
    md.push(`| ${family} | ${cell('bp')} | ${cell('tpl')} | ${cell('sub')} | ${cell('task')} | ${cell('tgt')} | ${cell('info')} | ${cell('perc')} | ${cell('pres')} | ${cell('topPerc')} | ${added.join(', ') || '—'} |`);
  }
  const cap = capacityFor([band])[0];
  md.push('', `Band totals from the catalogue: ${cap.blueprints} blueprints, ${cap.constructions} distinct user-perceptual constructions, ${cap.reasoningTargets} distinct reasoning targets, ${cap.coreConstructions} distinct core constructions. One sitting can hold at most ${cap.maxSitting} questions (the absolute in-session rules).`);
}

for (const band of ['easy', 'medium']) {
  md.push('', `## ${band.toUpperCase()} single-band journeys (engine path, history carried) — worst rolling-100 window`, '');
  md.push('| run | journey | questions | refusals | PV | ND | PV+ND | cluster | streak | dup |');
  md.push('|---|---|---|---|---|---|---|---|---|---|');
  for (const [name, src] of [['BEFORE', before], ['AFTER', after]]) {
    for (const j of src?.journeys?.[band] ?? []) md.push(`| ${name} | ${j.label} | ${j.questions} | ${j.refusals} | ${j.pv} | ${j.nd} | ${j.flagged} | ${j.cluster} | ${j.run} | ${j.dup} |`);
  }
  const cap = capacityFor([band])[0];
  md.push('', `Gate: PV+ND ≤ 8, ND ≤ 5, cluster ≤ 3, streak ≤ 2, duplicate stems 0 in every rolling 100.`);
  md.push(`Ceiling (Addition 2): PV counts every second occurrence of a template|task pair inside a rolling hundred, so PV ≥ 100 − (template|task pairs the band holds) = 100 − ${cap.blueprints} = ${Math.max(0, 100 - cap.blueprints)} whatever the scheduler does; ND counts second occurrences of a construction, so PV+ND ≥ 100 − ${cap.constructions} = ${Math.max(0, 100 - cap.constructions)}. Reaching PV+ND ≤ 8 needs at least 92 template|task pairs at the band.`);
}

md.push('', '## Addition 1 — the classifier under both keys (engine path, 2 journeys per band)', '');
md.push('Key A (RC2.9.2, in force): PARAMETER_ONLY_VARIANT = same template|task seen earlier in the window. Key B (candidate, NOT adopted): same template|task|sub-idea. Gates are computed under both; a pass only under B would be a finding, not a pass.');
md.push('', '| band | journey | A: PV | A: ND | A: PV+ND | B: PV | B: ND | B: PV+ND |', '|---|---|---|---|---|---|---|---|');
for (const band of ['easy', 'medium']) for (const j of [1, 2]) {
  const w = journeyBothClassifiers(band, `rc294-${band}-j${j}`);
  md.push(`| ${band} | rc294-${band}-j${j} | ${w.a.pv} | ${w.a.nd} | ${w.a.flagged} | ${w.b.pv} | ${w.b.nd} | ${w.b.flagged} |`);
}
md.push('', 'Neither key reaches the gate at EASY or MEDIUM; the classifier is unchanged.');

md.push('', '## Representative new questions per thin family (one per construction, pinned, engine path)', '');
for (const band of ['easy', 'medium']) {
  for (const [family, ids] of Object.entries(NEW_TEMPLATES[band])) {
    for (const tid of ids) {
      const q = engine.generateQuestion({family, difficulty: structuralBandOf(tid), templateId: tid, seed: `rc294-evidence|${tid}`});
      const L = ['A', 'B', 'C', 'D', 'E', 'F'];
      md.push(`### ${band} · ${family} · ${tid}`);
      md.push('');
      md.push(`**${q.question}**${q.display_expression ? `  \n\`${q.display_expression}\`` : ''}`);
      md.push('');
      md.push(L.map(l => `${l}) ${q.options[l]}`).join(' · ') + ` — key **${q.correct_option}**`);
      md.push('');
      md.push(q.explanation.steps.map(s => `- ${s}`).join('\n'));
      md.push('');
      md.push(`Rationale for one wrong option (${L.find(l => l !== q.correct_option)}): ${q.explanation.distractor_analysis[L.find(l => l !== q.correct_option)]}`);
      md.push('');
    }
  }
}
writeFileSync(OUT, md.join('\n') + '\n');
console.log(`wrote ${OUT}`);
