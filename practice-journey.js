// RC2.9.1. The product's side of the engine's cross-session diversity contract.
//
// The defect this exists to fix.
//
// RC2.9 gave the engine a memory: `generatePractice` accepts a
// `diversityHistory` and returns the `diversity_history` to carry forward, and
// a caller that carries it gets a second fifty that is not a replay of the
// first. The engine's own tests passed. The SHIPPED PRODUCT never carried it.
// app.js called the engine with no history, threw away the history it was
// handed, and called it blind again next time. An independent review measured
// five real two-session journeys through the application and found 26–34
// perceptual repeats in each second fifty; driven through the same page here,
// the combined hundred flagged 32 and the product's stored journey was `null`.
//
// Each fifty, judged alone, was spotless — which is exactly why a standalone
// fifty-question test could not see it.
//
// What this module is, and what it is not.
//
// It is the product's persistence of an engine value, and nothing else. It does
// not decide what makes questions similar, does not measure diversity, and does
// not duplicate a line of the engine's scheduling. Its whole job is: restore,
// pass, keep. If it ever grows a rule about what may repeat, that rule is in
// the wrong file.
//
// It holds no state of its own. The source of truth is the Storage the caller
// hands in — the same `localStorage` the app already keeps its saved session,
// statistics, favourites and last settings in — so the journey survives
// navigation, reload and resume for the same reason those do, and a module-level
// variable can never drift out of step with what was actually persisted.

/** Where the journey lives, beside the app's other long-lived keys. */
export const JOURNEY_KEY = 'numerical_generator_practice_journey_v1';

/** The stored envelope's tag, so a record from another release is refused. */
export const JOURNEY_SCHEMA = 'numerical-generator-practice-journey-v1';

/**
 * Read the journey the product is holding.
 *
 * Anything unusable — absent, unparseable, another schema — reads as no
 * journey rather than as an error. The app must still be able to start a
 * session when stored progress is missing or was written by an older release,
 * and the engine already treats an unusable history as a fresh journey, so the
 * two ends agree about what "nothing" means.
 */
export function readPracticeJourney(storage) {
  let raw = null;
  try { raw = storage?.getItem(JOURNEY_KEY) ?? null; } catch { return null; }
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || parsed.schema !== JOURNEY_SCHEMA) return null;
    return parsed;
  } catch { return null; }
}

/**
 * The history to hand the engine, or null for a journey that has not started.
 *
 * A malformed inner history is NOT repaired here. It is passed to the engine as
 * it was stored, because the engine's contract already says what happens to one
 * — `normalizeHistory` treats it as a fresh journey — and a second opinion in
 * the product is how the two ends start disagreeing.
 */
export function loadDiversityHistory(storage) {
  return readPracticeJourney(storage)?.history ?? null;
}

/**
 * Keep the history the engine just returned.
 *
 * A session that returns no history leaves the stored one alone rather than
 * erasing it: an engine that did not answer is not the same as a user who
 * started over, and only §4's deliberate reset may clear a journey.
 */
export function savePracticeJourney(storage, history) {
  if (!storage || history == null) return false;
  try {
    storage.setItem(JOURNEY_KEY, JSON.stringify({
      schema: JOURNEY_SCHEMA,
      updatedAt: new Date().toISOString(),
      questionsSeen: Number(history.questionsSeen) || 0,
      history
    }));
    return true;
  } catch {
    // A full or unavailable quota must not cost the user their session. The
    // sitting is generated and delivered; only the memory of it is lost.
    return false;
  }
}

/**
 * Start the journey over. The ONLY thing that may clear it.
 *
 * Deliberately not called when a saved session is deleted, when a sitting is
 * discarded on exit, or when the question counter goes back to 1: none of those
 * is a user saying "I want to meet these ideas again". A practice journey is
 * the fifty-to-a-hundred-question horizon the engine's history is bounded to,
 * and it spans as many sittings as that takes.
 */
export function clearPracticeJourney(storage) {
  try { storage?.removeItem(JOURNEY_KEY); return true; } catch { return false; }
}

/**
 * Generate a practice set for a continuing journey.
 *
 * THE product's session-generating function: the UI calls this and nothing
 * else, so the restore–pass–keep round trip cannot be half-done in one code
 * path and complete in another. The engine is called exactly as before with one
 * term added, and the history it returns is persisted before the set is
 * handed back.
 *
 * @param {object}  engine   the generator
 * @param {Storage} storage  where the journey is kept (localStorage in the app)
 * @param {object}  options  whatever the caller already passes to generatePractice
 * @param {boolean} [continueJourney] false starts a fresh journey for this set
 */
/**
 * RC2.9.5 §2.2. The band a caller asks for is IGNORED here, not honoured and
 * not refused: a saved preference written before this release, an old link or a
 * restored session can still carry `difficulty: 'easy'`, and a learner who
 * resumes such a session should get a mixed sitting rather than an error. The
 * engine refuses a single-band session outright; this is the one place that
 * rewrites the request instead, and it rewrites it to mixed every time.
 */
export const PRACTICE_DIFFICULTY = 'mixed';

export function generatePracticeForJourney({engine, storage, options, continueJourney = true}) {
  const diversityHistory = continueJourney ? loadDiversityHistory(storage) : null;
  const set = engine.generatePractice({...options, difficulty: PRACTICE_DIFFICULTY, diversityHistory});
  savePracticeJourney(storage, set.diversity_history);
  return set;
}
