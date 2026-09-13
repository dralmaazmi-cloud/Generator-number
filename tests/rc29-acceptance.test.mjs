// RC2.9-7 — the acceptance run, held as a test so it cannot quietly stop being
// true between one release and the next.
//
// The harness itself is tools/audit/rc29-acceptance.mjs, which prints the full
// per-journey table a reviewer reads. What is asserted here is what that table
// has to say: three ordinary fifties and five two-session journeys, every one
// inside the gates, on seeds nothing in this release was tuned on.

import test from 'node:test';
import assert from 'node:assert/strict';

import Engine from '../src/index.js';
import {measureSample} from '../src/qa/perceptual-classify.js';
import {playSession, playJourney, measureJourney, gradeJourney, JOURNEY_GATES} from '../tools/audit/rc29-journey.mjs';
import {ACCEPTANCE_SESSIONS, ACCEPTANCE_JOURNEYS, boundaryStep, sequenceBreadth,
  answerIntegrity, arabicDefects, rateUnitMismatches} from '../tools/audit/rc29-acceptance.mjs';

const corpus = [];

for (const seed of ACCEPTANCE_SESSIONS) {
  test(`RC2.9-7: ${seed} — one ordinary session of fifty`, () => {
    const s = playSession(new Engine(), {seed, count: 50});
    corpus.push(...s.questions);
    assert.equal(s.refusal, null, s.refusal?.message);
    assert.equal(s.questions.length, 50);
    const m = measureSample(s.questions, {label: seed});
    assert.ok(m.flagged <= 4, `PV+ND ${m.flagged} of a budget of 4`);
    assert.ok(m.largestPerceptualCluster <= JOURNEY_GATES.largestPerceptualCluster,
      `largest perceptual cluster ${m.largestPerceptualCluster}`);
    assert.ok(m.longestSimilarRun <= JOURNEY_GATES.longestSimilarRun,
      `longest similar run ${m.longestSimilarRun}`);
    assert.deepEqual(m.families.filter(f => f.verdict !== 'OK').map(f => f.family), []);
    const stems = new Set(s.questions.map(q => q.metadata.normalized_stem_identity));
    assert.equal(stems.size, s.questions.length, 'a stem was asked twice in one sitting');
  });
}

for (const spec of ACCEPTANCE_JOURNEYS) {
  test(`RC2.9-7: ${spec.label} — two ordinary sessions read as one hundred`, () => {
    const journey = playJourney(new Engine(), {seeds: spec.seeds});
    corpus.push(...journey.sessions.flatMap(s => s.questions));
    const m = measureJourney(journey, {label: spec.label});
    const g = gradeJourney(m);
    assert.deepEqual(g.conditions.filter(c => !c.ok).map(c => `${c.name} (${c.detail})`), []);
    // A planner that forgot at the boundary produced a step of +30 or more.
    // The step is asserted rather than eyeballed off the table.
    const b = boundaryStep(m);
    assert.ok(b.step <= 4, `Q1–50 ${b.first} → Q51–100 ${b.second}`);
  });
}

test('RC2.9-7: the acceptance corpus is broad, grammatical and correctly keyed', () => {
  assert.ok(corpus.length >= 600, `the journeys above must have run first: ${corpus.length}`);
  const breadth = sequenceBreadth(corpus);
  assert.ok(breadth.rules.length >= 8, `sequence rule families: ${breadth.rules.length}`);
  assert.ok(breadth.tasks.length >= 5, `sequence task archetypes: ${breadth.tasks.length}`);
  const integrity = answerIntegrity(corpus);
  assert.deepEqual(integrity.duplicateOptions.slice(0, 3), []);
  assert.deepEqual(integrity.missingKey.slice(0, 3), []);
  const arabic = arabicDefects(corpus);
  assert.deepEqual(arabic.invalid.slice(0, 3), [], `${arabic.invalid.length} invalid constructions`);
  assert.deepEqual(arabic.unclassified.slice(0, 3), [], `${arabic.unclassified.length} unclassified`);
  assert.deepEqual(rateUnitMismatches(corpus).slice(0, 3), []);
});
