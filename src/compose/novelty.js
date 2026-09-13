// RC2.7-5. The session-level novelty scheduler.
//
// The caps that existed before RC2.7 bound one dimension each: how often a
// TEMPLATE may recur, how often a REASONING SIGNATURE may. Neither says anything
// about how a session READS. Two questions can respect every cap and still
// arrive one after the other as the same situation, asked the same way, in the
// same sentence shape — different template, same experience.
//
// This scheduler works on the dimensions the RC2.7 signatures publish, and it
// binds four things the caps could not:
//
//   1. the exact combination — reasoning + construction + target + stem — may
//      not repeat inside a session at all
//   2. two consecutive questions may not match on most of their dimensions
//   3. no single construction, target, scenario or entity pattern may dominate
//   4. a candidate matching an EARLIER question across most dimensions is
//      deprioritised rather than taken first
//
// Nothing here is silent. A candidate refused is refused with the dimension it
// repeated on; a candidate delivered anyway — because the session must be
// deliverable — carries a recorded breach, exactly as the older caps do.
//
// Deterministic: the scheduler reads only the candidates it is shown and the
// ones it has accepted, never a clock, a counter outside the session, or the
// answer.

import {REASON} from '../qa/reasons.js';
import {entityWordsIn} from './entities.js';

/** The dimensions compared. Each is published on every question. */
export const DIMENSIONS = Object.freeze([
  'skill_signature',
  'structural_reasoning_signature',
  'construction_signature',
  'target_signature',
  'scenario_signature',
  'stem_skeleton',
  'entity_pattern',
  'stem_structure'
]);

/**
 * Caps per fifty questions. A shorter session scales them down and a longer one
 * up, so the rule is about SHARE rather than about a count that means something
 * different at 10 questions than at 100.
 */
export const NOVELTY_CAPS_PER_50 = Object.freeze({
  construction_signature: 6,
  target_signature: 8,
  scenario_signature: 10,
  // The entity PATTERN — which kinds of entity a stem names, and how many of
  // each — has a value space of about ten, so a cap tighter than a fifth of the
  // session is arithmetically unsatisfiable and would do nothing but generate
  // breaches. What it can usefully forbid is one pattern OWNING the session,
  // and two fifths is where that starts. Concentration of individual entities
  // is bounded separately, below, where the value space is large enough for a
  // tight cap to mean something.
  entity_pattern: 20,
  stem_skeleton: 4
});

/**
 * How often one NAMED entity — a person, a site, a device — may appear in a
 * session. This is the measure the brief asks for by name: a reader meets
 * «خالد» eight times in fifty and notices, whatever the mathematics behind the
 * eight questions.
 */
export const ENTITY_CAP_PER_50 = 6;

/** How many dimensions two questions may share before they read as one. */
export const CONSECUTIVE_SIMILARITY_LIMIT = 3;
export const SESSION_SIMILARITY_LIMIT = 5;

const dim = (q, k) => q.metadata?.[k] ?? null;

const combinationKey = q => [
  dim(q, 'structural_reasoning_signature'),
  dim(q, 'construction_signature'),
  dim(q, 'target_signature'),
  dim(q, 'stem_skeleton')
].join('¦');

function sharedDimensions(a, b) {
  let n = 0;
  for (const k of DIMENSIONS) {
    const x = dim(a, k);
    if (x != null && x === dim(b, k)) n++;
  }
  return n;
}

export class NoveltyScheduler {
  /**
   * @param {number} count how many questions the session will deliver
   * @param {object} [caps] override the per-50 caps (tests, not production)
   */
  constructor(count, caps = NOVELTY_CAPS_PER_50) {
    this.count = Math.max(1, Number(count) || 1);
    const scale = this.count / 50;
    this.caps = Object.fromEntries(Object.entries(caps)
      .map(([k, v]) => [k, Math.max(2, Math.ceil(v * scale))]));
    this.entityCap = Math.max(2, Math.ceil(ENTITY_CAP_PER_50 * scale));
    this.combinations = new Set();
    this.tallies = Object.fromEntries(Object.keys(this.caps).map(k => [k, new Map()]));
    this.entities = new Map();
    this.accepted = [];
    this.breaches = [];
  }

  /**
   * Would this candidate read as new? Returns the reason it would not, with the
   * dimension, so a refusal can be reported rather than merely counted.
   */
  assess(candidate) {
    const key = combinationKey(candidate);
    if (this.combinations.has(key)) {
      return {ok: false, reason: REASON.NOVELTY_REPEATED_COMBINATION, dimension: 'combination'};
    }
    const previous = this.accepted.at(-1);
    if (previous && sharedDimensions(previous, candidate) >= CONSECUTIVE_SIMILARITY_LIMIT) {
      return {ok: false, reason: REASON.NOVELTY_CONSECUTIVE_SIMILARITY, dimension: 'consecutive'};
    }
    for (const [k, cap] of Object.entries(this.caps)) {
      const v = dim(candidate, k);
      if (v == null) continue;
      if ((this.tallies[k].get(v) ?? 0) >= cap) {
        return {ok: false, reason: REASON.NOVELTY_DIMENSION_DOMINANCE, dimension: k};
      }
    }
    for (const w of entityWordsIn(candidate.question)) {
      if ((this.entities.get(w) ?? 0) >= this.entityCap) {
        return {ok: false, reason: REASON.NOVELTY_DIMENSION_DOMINANCE, dimension: 'entity_word'};
      }
    }
    for (const earlier of this.accepted) {
      if (sharedDimensions(earlier, candidate) >= SESSION_SIMILARITY_LIMIT) {
        return {ok: false, reason: REASON.NOVELTY_MULTI_DIMENSION_SIMILARITY, dimension: 'multi'};
      }
    }
    return {ok: true};
  }

  /**
   * Commit a question to the session. `forced` marks one delivered despite a
   * refusal — the fallback path — and records the breach rather than hiding it.
   */
  accept(candidate, {index = null, forced = null} = {}) {
    this.combinations.add(combinationKey(candidate));
    for (const k of Object.keys(this.caps)) {
      const v = dim(candidate, k);
      if (v == null) continue;
      this.tallies[k].set(v, (this.tallies[k].get(v) ?? 0) + 1);
    }
    for (const w of entityWordsIn(candidate.question)) {
      this.entities.set(w, (this.entities.get(w) ?? 0) + 1);
    }
    this.accepted.push(candidate);
    if (forced) {
      this.breaches.push({
        index, template_id: candidate.generator_id,
        reason: forced.reason, dimension: forced.dimension,
        note: 'novelty control relaxed by the fallback: no candidate satisfying it was available'
      });
    }
  }

  /** What the session ended up looking like, on every dimension it controls. */
  report() {
    const spread = {};
    for (const k of DIMENSIONS) {
      const t = new Map();
      for (const q of this.accepted) {
        const v = dim(q, k);
        if (v == null) continue;
        t.set(v, (t.get(v) ?? 0) + 1);
      }
      spread[k] = {distinct: t.size, largestGroup: Math.max(0, ...t.values())};
    }
    let longestRun = 0, run = 0;
    for (let i = 1; i < this.accepted.length; i++) {
      if (sharedDimensions(this.accepted[i - 1], this.accepted[i]) >= CONSECUTIVE_SIMILARITY_LIMIT) {
        run += 1; longestRun = Math.max(longestRun, run + 1);
      } else run = 0;
    }
    return {
      delivered: this.accepted.length,
      caps: {...this.caps, entity_word: this.entityCap},
      spread,
      entities: {
        distinct: this.entities.size,
        largestGroup: Math.max(0, ...this.entities.values()),
        mostUsed: [...this.entities.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
          .map(([w, n]) => `${w}×${n}`)
      },
      longestSimilarRun: longestRun,
      breaches: this.breaches
    };
  }
}
