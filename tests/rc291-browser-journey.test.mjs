// RC2.9.1 — the real user journey, in a real browser, through the real page.
//
// tests/rc291-product-journey.test.mjs drives the product's session-generating
// function directly, which is fast and is what catches a regression in the
// round trip. This file is the one that cannot be argued with: it serves the
// repository over HTTP, opens index.html in Chromium, clicks «توليد»,
// leaves the sitting the way the app lets you leave it, clicks «توليد» again,
// and reads the two sittings back out of the browser's own localStorage.
//
// Nothing here calls the engine. The only thing done to the page is to wrap
// `generatePractice` on the instance the page already exposes, so the call
// boundary can be RECORDED and a seed fixed for replay — everything the fix has
// to get right happens outside that wrapper.
//
// It needs a browser, which a reviewer unpacking the delivery ZIP may not have,
// so it states that precondition and skips rather than failing. The rest of the
// suite covers the same contract without one.

import test from 'node:test';
import assert from 'node:assert/strict';

import {measureSample, classify} from '../src/qa/perceptual-classify.js';
import {serveRepository, launchBrowser, playProductJourney, browserAvailable}
  from '../tools/audit/rc291-product-journey.mjs';

const available = await browserAvailable();
// Naming the way in matters: a reviewer who reads "skipped" should be able to
// turn it on rather than take the result on trust.
const skip = available ? false
  : 'needs a browser — `npm install --no-save playwright-core` and a Chromium '
    + '(RC291_CHROME=/path/to/chrome), then rerun';

let shared = null;
async function env() {
  if (!shared) {
    const {server, origin} = await serveRepository();
    shared = {server, origin, browser: await launchBrowser()};
  }
  return shared;
}
test.after(async () => {
  if (shared) { await shared.browser.close(); shared.server.close(); }
});

const repeatsInSecondHalf = rows => {
  const labelled = classify(rows);
  return labelled.slice(50).filter((row, i) =>
    new Set(labelled.slice(0, 50 + i).map(x => x.perceptual)).has(row.perceptual)).length;
};

test('RC2.9.1: the shipped page carries the journey from one sitting to the next', {skip}, async () => {
  const {browser, origin} = await env();
  const r = await playProductJourney(browser, origin, {
    seeds: ['rc291-browser-a-s1', 'rc291-browser-a-s2']
  });

  assert.deepEqual(r.sessions.map(s => s.questions.length), [50, 50]);

  // The call boundary, which is where the defect was.
  assert.equal(r.calls.length, 2);
  assert.equal(r.calls[0].had, false, 'a first sitting has nothing to carry');
  assert.equal(r.calls[0].questionsSeenAfter, 50, 'and the engine hands one back');
  assert.equal(r.calls[1].had, true, 'the second sitting must be handed the first one\'s history');
  assert.equal(r.calls[1].questionsSeenBefore, 50);
  assert.equal(r.calls[1].schema, 'rc292-diversity-history-v2');
  assert.equal(r.calls[1].questionsSeenAfter, 100);

  // And the product kept it, under its own schema, in its own storage.
  assert.equal(r.journey?.schema, 'numerical-generator-practice-journey-v1');
  assert.equal(r.journey.questionsSeen, 100);

  const all = r.sessions.flatMap(s => s.questions);
  const combined = measureSample(all, {label: 'browser-a'});
  assert.ok(combined.flagged <= 8, `combined PV+ND ${combined.flagged}`);
  assert.ok(combined.counts.NEAR_DUPLICATE_CONSTRUCTION <= 5,
    `ND ${combined.counts.NEAR_DUPLICATE_CONSTRUCTION}`);
  assert.ok(repeatsInSecondHalf(all) <= 8);

  const stems = new Set(all.map(q => q.metadata.normalized_stem_identity));
  assert.equal(stems.size, all.length, 'a stem was asked twice inside one journey');
}, {timeout: 600000});

test('RC2.9.1: a reload between sittings does not cost the journey its memory', {skip}, async () => {
  const {browser, origin} = await env();
  const r = await playProductJourney(browser, origin, {
    seeds: ['rc291-browser-b-s1', 'rc291-browser-b-s2'], reloadBetween: true, exits: ['discard', 'save']
  });
  assert.equal(r.calls[1].had, true, 'the page was reloaded and the history must still be there');
  assert.equal(r.calls[1].questionsSeenBefore, 50);
  // Discarding a sitting on the way out is an ordinary way to leave one; it is
  // not a request to meet those ideas again.
  assert.equal(r.journey.questionsSeen, 100);
}, {timeout: 600000});

test('RC2.9.1: clearing the journey is what makes the repetition come back', {skip}, async () => {
  // The adversarial control. Same page, same seeds, same everything — except
  // that the stored journey is removed before the second sitting. If the second
  // fifty stays clean anyway, the fix was never the cause.
  const {browser, origin} = await env();
  const seeds = ['rc291-browser-c-s1', 'rc291-browser-c-s2'];

  const kept = await playProductJourney(browser, origin, {seeds});
  const cleared = await playProductJourney(browser, origin, {seeds, clearJourneyBetween: true});

  assert.equal(kept.calls[1].had, true);
  assert.equal(cleared.calls[1].had, false, 'the control run must reach the engine blind');

  const keptRepeats = repeatsInSecondHalf(kept.sessions.flatMap(s => s.questions));
  const clearedRepeats = repeatsInSecondHalf(cleared.sessions.flatMap(s => s.questions));
  assert.ok(clearedRepeats > keptRepeats + 10,
    `the causal effect must be unmistakable: ${keptRepeats} carried vs ${clearedRepeats} cleared`);
  assert.ok(keptRepeats <= 8, `${keptRepeats} repeats with the journey carried`);
}, {timeout: 900000});
