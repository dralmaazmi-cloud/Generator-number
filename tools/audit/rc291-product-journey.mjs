#!/usr/bin/env node
// RC2.9.1. The user journey as the SHIPPED PRODUCT performs it.
//
// Why this exists, when tools/audit/rc29-journey.mjs already measured journeys.
//
// That harness calls the engine twice and carries `diversity_history` between
// the calls itself. It is a true test of the ENGINE CONTRACT and it passed. It
// is not a test of the product, and describing it as "carrying exactly what the
// product carries" was wrong: the product carried nothing. An independent
// review measured five real two-session journeys and found 26–34 perceptual
// repeats in each second fifty, because index.html/app.js never asked for the
// history and never kept the one it was handed.
//
// So this harness touches no engine function. It starts a real Chromium, loads
// the real page over HTTP, clicks the real buttons, and reads the sessions out
// of the product's own localStorage. The only thing it does to the page is
// wrap `generatePractice` on the engine instance the page already exposes as
// `window.__NUM_GENERATOR_ENGINE__` — to RECORD what the product passed, and to
// substitute a fixed seed so a journey can be replayed. Everything the fix has
// to get right happens outside that wrapper.

import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {extname, join, normalize} from 'node:path';

const ROOT = new URL('../..', import.meta.url).pathname;
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8'
};

export async function serveRepository() {
  const server = createServer(async (req, res) => {
    const rel = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '');
    const path = join(ROOT, rel === '/' ? 'index.html' : rel);
    try {
      const body = await readFile(path);
      res.writeHead(200, {'content-type': TYPES[extname(path)] ?? 'application/octet-stream'});
      res.end(body);
    } catch {
      res.writeHead(404); res.end('not found');
    }
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  return {server, origin: `http://127.0.0.1:${server.address().port}`};
}

/**
 * Is there a browser to drive?
 *
 * A delivery package is unpacked on machines that have no Chromium and no
 * playwright-core, and the suite has to stay green there: the browser journey
 * states this as its precondition and skips, rather than failing for a reason
 * that has nothing to do with the engine or the product.
 */
export async function browserAvailable() {
  try {
    const {chromium} = await import('playwright-core');
    const {existsSync} = await import('node:fs');
    return existsSync(CHROME_PATH) && typeof chromium?.launch === 'function';
  } catch { return false; }
}

const CHROME_PATH = process.env.RC291_CHROME
  ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

export async function launchBrowser() {
  const {chromium} = await import('playwright-core');
  return chromium.launch({executablePath: CHROME_PATH});
}

/** The keys app.js persists under. Named here so a rename is caught by a test. */
export const STORAGE_KEY = 'numerical_generator_saved_session_v2';
export const JOURNEY_KEY = 'numerical_generator_practice_journey_v1';

/**
 * Open the app and wait for it to be ready, then install the call recorder.
 *
 * The recorder is the whole instrument: `calls` says, for every session the
 * product generated, whether the product handed the engine a history and how
 * much of one. A product that does not persist its history shows `had: false`
 * on every call after the first, which is the defect stated as data.
 */
export async function openApp(page, origin) {
  await page.goto(`${origin}/index.html`);
  await page.waitForFunction(() => window.__NUM_GENERATOR_READY__ === true, null, {timeout: 60000});
  await page.evaluate(() => {
    const engine = window.__NUM_GENERATOR_ENGINE__;
    if (engine.__rc291Wrapped) return;
    const real = engine.generatePractice.bind(engine);
    window.__RC291_CALLS__ = [];
    window.__RC291_SEED__ = null;
    engine.generatePractice = opts => {
      const seed = window.__RC291_SEED__ ?? opts.seed;
      const history = opts.diversityHistory ?? null;
      window.__RC291_CALLS__.push({
        seed,
        had: history != null,
        questionsSeenBefore: history?.questionsSeen ?? null,
        schema: history?.schema ?? null
      });
      const out = real({...opts, seed});
      const last = window.__RC291_CALLS__[window.__RC291_CALLS__.length - 1];
      last.returnedHistory = out.diversity_history != null;
      last.questionsSeenAfter = out.diversity_history?.questionsSeen ?? null;
      return out;
    };
    engine.__rc291Wrapped = true;
  });
}

/**
 * One ordinary session, exactly as a user takes one: choose the settings, press
 * generate, then leave the session the way the app lets you leave it.
 *
 * `exit` is 'save' or 'discard' — both are ordinary ways to finish with a
 * sitting, and neither may cost the journey its memory. The questions are read
 * back out of the product's own saved-session storage rather than scraped from
 * the DOM, so what is measured is what the product kept.
 */
export async function playProductSession(page, {seed, count = 50, difficulty = 'mixed', exit = 'save'}) {
  await page.evaluate(s => { window.__RC291_SEED__ = s; }, seed);
  await page.selectOption('#difficulty', difficulty);
  // The count menu offers 5/10/14/20/30 and «مخصص»; fifty is a custom count,
  // which is what a user who wants a fifty-question sitting picks.
  await page.selectOption('#count', 'custom');
  await page.fill('#customCount', String(count));
  await page.dispatchEvent('#customCount', 'change');
  // RC2.9.2. A session the engine refuses surfaces in the UI as an alert and
  // the page stays on the setup view. That is a real product outcome, so it is
  // captured rather than allowed to hang: `refusal` carries what the user was
  // told, and the harness reports a short sitting instead of timing out.
  let refusal = null;
  const onDialog = async d => { refusal = d.message(); await d.dismiss(); };
  page.on('dialog', onDialog);
  await page.click('#generate');
  try {
    await page.waitForSelector('#viewSession:not(.hidden)', {timeout: 120000});
  } catch (err) {
    page.off('dialog', onDialog);
    if (refusal) return {questions: [], exit, refusal};
    throw err;
  }
  page.off('dialog', onDialog);

  // Leave the sitting the way the app offers. Saving is what a user who means
  // to come back does; discarding is what a user who is done does.
  await page.click('#sessionHome');
  await page.waitForSelector('#exitModal:not(.hidden)', {timeout: 10000});
  await page.click(exit === 'discard' ? '#discardExit' : '#saveExit');
  await page.waitForSelector('#viewSetup:not(.hidden)', {timeout: 10000});

  const saved = await page.evaluate(k => localStorage.getItem(k), STORAGE_KEY);
  const questions = saved ? (JSON.parse(saved).questions ?? []) : [];
  return {questions, exit, refusal};
}

/** What the product is holding for this journey, read from its own storage. */
export async function readJourneyState(page) {
  return page.evaluate(k => {
    const raw = localStorage.getItem(k);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return {unparseable: raw.slice(0, 80)}; }
  }, JOURNEY_KEY);
}

export async function callLog(page) {
  return page.evaluate(() => window.__RC291_CALLS__ ?? []);
}

/** Everything a reviewer needs about one journey, without an engine call. */
export async function playProductJourney(browser, origin, {seeds, count = 50, difficulty = 'mixed',
  reloadBetween = false, clearJourneyBetween = false, exits = ['save', 'save']} = {}) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await openApp(page, origin);

  const sessions = [];
  // The call log lives on the page, so a reload would erase it. It is drained
  // after every sitting and kept here — the log has to outlive the reload it is
  // there to measure.
  const calls = [];
  for (const [i, seed] of seeds.entries()) {
    if (i > 0 && clearJourneyBetween) await page.evaluate(k => localStorage.removeItem(k), JOURNEY_KEY);
    if (i > 0 && reloadBetween) await openApp(page, origin);
    sessions.push(await playProductSession(page, {seed, count, difficulty, exit: exits[i] ?? 'save'}));
    calls.push(...await callLog(page));
    await page.evaluate(() => { window.__RC291_CALLS__ = []; });
  }
  const out = {sessions, calls, journey: await readJourneyState(page)};
  await context.close();
  return out;
}
