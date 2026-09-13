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
import {nearDuplicateKey} from '../qa/core-construction.js';

/**
 * RC2.7-R2. The two levels, and why the split exists.
 *
 * The independent review of RC2.7 failed it at 4.2/10 for perceived diversity
 * and found that 34 of 35 novelty relaxations had produced a perceptually
 * repetitive item. The scheduler was treating every dimension as equally
 * relaxable, so under pressure it relaxed the ones that matter most and
 * delivered a parameter reskin to complete the session.
 *
 * CORE   the equation, the reasoning path and the requested target. Two
 *        questions sharing these are the same question to a reader however
 *        different the shirts, loaves and pages around them. NEVER relaxed. If
 *        a session cannot be filled without repeating one, the session is
 *        refused and the shortfall reported.
 *
 * SURFACE  scenario, entity, sentence shape, information order, skeleton.
 *          These may relax under pressure, and every relaxation says so.
 */
export const CORE = 'CORE_CONSTRUCTION';
export const SURFACE = 'SURFACE_ONLY';

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

/**
 * And across a whole batch. A per-session cap says nothing about a candidate
 * meeting «آلة» twenty-five times over five sessions of a mock exam, which is
 * the same perception one session further out.
 *
 * Scaled by the BATCH size, not the session's: about thirty entity words are in
 * play and a 250-question batch names roughly 325 of them, so the mean word
 * appears about eleven times. Three per fifty puts the ceiling at fifteen for
 * such a batch — half as much again as the mean, which binds the outliers and
 * leaves the ordinary distribution alone. A cap near the mean would do nothing
 * but generate breaches.
 */
export const ENTITY_BATCH_CAP_PER_50 = 3;

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
  constructor(count, caps = NOVELTY_CAPS_PER_50, batchEntities = null, batchCount = null) {
    this.count = Math.max(1, Number(count) || 1);
    const scale = this.count / 50;
    // Shared across the sessions of one batch when the caller supplies it; a
    // lone session passes nothing and is bounded by its own cap alone.
    this.batchEntities = batchEntities;
    this.batchEntityCap = batchEntities
      ? Math.max(4, Math.ceil(ENTITY_BATCH_CAP_PER_50 * (Math.max(this.count, Number(batchCount) || 0) / 50)))
      : Infinity;
    this.caps = Object.fromEntries(Object.entries(caps)
      .map(([k, v]) => [k, Math.max(2, Math.ceil(v * scale))]));
    this.entityCap = Math.max(2, Math.ceil(ENTITY_CAP_PER_50 * scale));
    this.combinations = new Set();
    // RC2.7-R2. The core sets. Membership is absolute: nothing removes an entry
    // and no branch consults them optionally.
    this.coreConstructions = new Set();
    this.reasoningTargets = new Set();
    this.nearDuplicates = new Map();
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
    // --- CORE, first and unconditionally ------------------------------------
    const core = dim(candidate, 'user_construction_signature');
    if (core && this.coreConstructions.has(core)) {
      return {ok: false, level: CORE, reason: REASON.NOVELTY_CORE_CONSTRUCTION_REPEAT,
        dimension: 'user_construction_signature'};
    }
    const pair = dim(candidate, 'reasoning_target_pair');
    if (pair && this.reasoningTargets.has(pair)) {
      return {ok: false, level: CORE, reason: REASON.NOVELTY_REASONING_TARGET_REPEAT,
        dimension: 'reasoning_target_pair'};
    }

    // --- SURFACE -------------------------------------------------------------
    const key = combinationKey(candidate);
    if (this.combinations.has(key)) {
      return {ok: false, level: SURFACE, reason: REASON.NOVELTY_REPEATED_COMBINATION, dimension: 'combination'};
    }
    const previous = this.accepted.at(-1);
    if (previous && sharedDimensions(previous, candidate) >= CONSECUTIVE_SIMILARITY_LIMIT) {
      return {ok: false, level: SURFACE, reason: REASON.NOVELTY_CONSECUTIVE_SIMILARITY, dimension: 'consecutive'};
    }
    for (const [k, cap] of Object.entries(this.caps)) {
      const v = dim(candidate, k);
      if (v == null) continue;
      if ((this.tallies[k].get(v) ?? 0) >= cap) {
        return {ok: false, level: SURFACE, reason: REASON.NOVELTY_DIMENSION_DOMINANCE, dimension: k};
      }
    }
    for (const w of entityWordsIn(candidate.question)) {
      if ((this.entities.get(w) ?? 0) >= this.entityCap) {
        return {ok: false, level: SURFACE, reason: REASON.NOVELTY_DIMENSION_DOMINANCE, dimension: 'entity_word'};
      }
      if (this.batchEntities && (this.batchEntities.get(w) ?? 0) >= this.batchEntityCap) {
        return {ok: false, level: SURFACE, reason: REASON.NOVELTY_DIMENSION_DOMINANCE, dimension: 'entity_word_batch'};
      }
    }
    for (const earlier of this.accepted) {
      if (sharedDimensions(earlier, candidate) >= SESSION_SIMILARITY_LIMIT) {
        return {ok: false, level: SURFACE, reason: REASON.NOVELTY_MULTI_DIMENSION_SIMILARITY, dimension: 'multi'};
      }
    }
    return {ok: true};
  }

  /**
   * Commit a question to the session. `forced` marks one delivered despite a
   * refusal — the fallback path — and records the breach rather than hiding it.
   */
  accept(candidate, {index = null, forced = null} = {}) {
    if (forced && forced.level === CORE) {
      throw Object.assign(
        new Error('NOVELTY_CORE_RELAXATION_ATTEMPTED: a core construction repeat may not be delivered'),
        {code: 'NOVELTY_CORE_RELAXATION_ATTEMPTED', dimension: forced.dimension}
      );
    }
    const core = dim(candidate, 'user_construction_signature');
    if (core) {
      this.coreConstructions.add(core);
      const near = nearDuplicateKey(core);
      this.nearDuplicates.set(near, (this.nearDuplicates.get(near) ?? 0) + 1);
    }
    const pair = dim(candidate, 'reasoning_target_pair');
    if (pair) this.reasoningTargets.add(pair);
    this.combinations.add(combinationKey(candidate));
    for (const k of Object.keys(this.caps)) {
      const v = dim(candidate, k);
      if (v == null) continue;
      this.tallies[k].set(v, (this.tallies[k].get(v) ?? 0) + 1);
    }
    for (const w of entityWordsIn(candidate.question)) {
      this.entities.set(w, (this.entities.get(w) ?? 0) + 1);
      if (this.batchEntities) this.batchEntities.set(w, (this.batchEntities.get(w) ?? 0) + 1);
    }
    this.accepted.push(candidate);
    if (forced) {
      this.breaches.push({
        index, template_id: candidate.generator_id,
        level: forced.level ?? SURFACE,
        reason: forced.reason, dimension: forced.dimension,
        note: 'surface novelty control relaxed by the fallback: no candidate satisfying it was available'
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
    const nearLargest = Math.max(0, ...this.nearDuplicates.values());
    return {
      delivered: this.accepted.length,
      // RC2.7-R2. The core measures, reported first because they are the ones
      // the independent review found the release had been failing.
      core: {
        distinctConstructions: this.coreConstructions.size,
        distinctReasoningTargets: this.reasoningTargets.size,
        nearDuplicateGroups: this.nearDuplicates.size,
        largestNearDuplicateGroup: nearLargest,
        itemsInANearDuplicateGroup: [...this.nearDuplicates.values()].filter(v => v > 1).reduce((a, v) => a + v, 0),
        relaxations: this.breaches.filter(b => b.level === CORE).length
      },
      caps: {...this.caps, entity_word: this.entityCap, entity_word_batch: this.batchEntityCap},
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
