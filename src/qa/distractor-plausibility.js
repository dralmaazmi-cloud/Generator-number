// RC2.1-3 — distractor plausibility.
//
// The independent review of holdout B raised 44 option-quality concerns in three
// recurring shapes:
//
//   * grossly out-of-scale values — an option orders of magnitude from the key
//   * dimensionally relabelled intermediates — a total distance offered as a
//     speed, wearing the answer's unit
//   * implausible values a candidate can strike out without solving anything
//
// All three are the same failure: a wrong option that is not a possible ANSWER
// to the question asked. A distractor earns its place by being what a specific
// mistake produces; one that can be eliminated by estimation teaches nothing and
// narrows a six-way choice to a four-way guess.
//
// These are PREFERENCES, not rejections. Removing a candidate outright would
// push the template into DISTRACTOR_IMPOSSIBLE and resampling, which is how an
// answer space gets narrowed — the RC2-011 defect. Implausible candidates are
// used only when a template has nothing better to offer, so a template with
// seven candidates for five slots drops its worst two and a template with
// exactly five keeps all of them.

const numericOf = v => (typeof v === 'number' && Number.isFinite(v) ? v : null);

// --- what was deliberately NOT built ---------------------------------------
//
// The obvious guard is a scale test: reject an option more than N times the key.
// It is not implemented, and the reason matters.
//
// Comparing an option to the KEY means selecting which options appear using a
// property of the published answer. OBSERVE_NEVER_TARGET forbids exactly that —
// "including/excluding/replacing/reordering valid distractors" on the basis of
// the answer — and compressing an option set toward the key would also shift the
// key's numeric rank, the statistic RC2-001 exists to leave alone. A guard that
// improves plausibility by reading the answer is not a guard this engine may
// have, however good its intentions.
//
// So plausibility here is derived only from the question's GIVENS. "An average
// of two speeds lies between those two speeds" is a fact about the question; it
// is true before the answer is computed and it does not change if the answer
// changes. `scaleRatio` below is exported for MEASUREMENT only — the audit uses
// it to report what the review found — and no generation path may call it.

/** Measurement only. Never used to choose, order or filter an option. */
export function scaleRatio(value, key) {
  const v = numericOf(value), k = numericOf(key);
  if (v === null || k === null) return null;
  if (v === 0 && k === 0) return 1;
  if (k === 0 || v === 0) return null;
  const r = Math.abs(v / k);
  return r >= 1 ? r : 1 / r;
}

/**
 * An answer that is a weighted mean of given quantities must lie between the
 * smallest and largest of them. An option outside that interval is not a
 * possible answer however it was derived, so it can be struck out on sight —
 * this is the shape the review called a dimensionally relabelled intermediate,
 * a total offered where a rate was asked for.
 *
 * `bounds` is declared by the template because only the template knows which
 * givens the answer is bounded by; nothing is inferred from the answer itself.
 */
export function violatesBounds(distractor, bounds) {
  if (!bounds || !Array.isArray(bounds.between) || bounds.between.length < 2) return false;
  const v = numericOf(distractor?.value);
  if (v === null) return false;
  const lo = Math.min(...bounds.between), hi = Math.max(...bounds.between);
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return false;
  return v < lo || v > hi;
}

/**
 * Splits candidates into those that are possible answers to the question and
 * those that are not, preserving order within each group. Judged only against
 * `bounds`, which the template derives from its givens.
 *
 * `stimulusIsOptions` marks families whose six options ARE the displayed set —
 * in odd-one-out the spread between options is the question, not a defect.
 */
export function partitionByPlausibility(distractors, opts = {}) {
  const plausible = [], implausible = [];
  for (const d of distractors) {
    if (!d) continue;
    const bad = !opts.stimulusIsOptions && violatesBounds(d, opts.bounds);
    (bad ? implausible : plausible).push(d);
  }
  return {plausible, implausible};
}
