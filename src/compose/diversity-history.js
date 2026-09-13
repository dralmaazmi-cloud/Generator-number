// RC2.9-1. The user journey's diversity memory.
//
// The defect this exists to fix.
//
// A session is fifty questions. A user who wants a hundred sits two of them,
// and the second call started the planner from an empty page: every idea the
// first session had spent was eligible again, so the second fifty replayed the
// first. Measured through the product's own entry point, 34, 36 and 33 of each
// second fifty repeated something already solved, and the first repeat landed
// at Q51 in all three journeys. Each session, judged alone, was spotless.
//
// The fix is not another filter. It is that the planner must know what this
// user has already met, before it allocates anything.
//
// What this is, and what it deliberately is not:
//
//   * It is an explicit VALUE, handed in and handed back. Not a field on the
//     engine, not a module-level Map, not anything that survives without the
//     caller choosing to keep it. An engine with no history behaves exactly as
//     it did before this file existed.
//   * It is JSON. The product persists it wherever it persists progress, and a
//     history that has been through `JSON.parse(JSON.stringify(...))` plans the
//     same session as the one it was copied from.
//   * It is BOUNDED. The product horizon is fifty to a hundred questions, so
//     the history keeps that horizon and forgets what falls behind it. A
//     learner who has solved four hundred questions does not carry four hundred
//     questions' worth of state.
//   * It is a FUNCTION of its inputs. Same seed and same incoming history give
//     the same session and the same outgoing history, every time.

/** The schema tag, so a stored history from another release is refused rather than misread. */
export const HISTORY_SCHEMA = 'rc29-diversity-history-v1';

/**
 * How far back the journey remembers, per dimension.
 *
 * The horizon is the product's, not an arbitrary number: two sessions of fifty
 * is the experience the review measured, and a third session is where a user
 * may fairly meet an idea again. So the strong identities remember 100 — the
 * two sessions before this one — and the concentration counters, which are
 * about how a sitting FEELS rather than about what was solved, remember less.
 */
export const HORIZON = Object.freeze({
  perceptual: 100,
  reasoning: 100,
  blueprint: 100,
  stem: 150,
  skeleton: 100,
  task: 60,
  presentation: 60,
  family: 30,
  entity: 60
});

const EMPTY = Object.freeze({
  schema: HISTORY_SCHEMA,
  questionsSeen: 0,
  perceptual: [], reasoning: [], blueprint: [], stem: [], skeleton: [],
  task: [], presentation: [], family: [], entity: []
});

/** A fresh journey. A user opening the app for the first time gets this. */
export const emptyHistory = () => JSON.parse(JSON.stringify(EMPTY));

/**
 * Read a history a caller handed in.
 *
 * Anything unusable — null, a different schema, a shape that is not this one —
 * is treated as a fresh journey rather than as an error, because the product
 * must still be able to generate a session when its stored progress is missing
 * or was written by an older release. A history that IS this schema is used
 * exactly as given.
 */
export function normalizeHistory(input) {
  if (!input || typeof input !== 'object' || input.schema !== HISTORY_SCHEMA) return emptyHistory();
  const list = k => (Array.isArray(input[k]) ? input[k].filter(v => typeof v === 'string') : []);
  return {
    schema: HISTORY_SCHEMA,
    questionsSeen: Number.isFinite(input.questionsSeen) ? Math.max(0, Math.trunc(input.questionsSeen)) : 0,
    perceptual: list('perceptual'), reasoning: list('reasoning'), blueprint: list('blueprint'),
    stem: list('stem'), skeleton: list('skeleton'), task: list('task'),
    presentation: list('presentation'), family: list('family'), entity: list('entity')
  };
}

/**
 * The live view the scheduler consults: sets for the identities that must not
 * repeat, counts for the ones that may recur but must not concentrate.
 *
 * Built once per session, from the incoming history, and then extended as the
 * session commits questions — so the fiftieth question of session two is
 * planned against the first forty-nine of session two AND everything session
 * one delivered. The session boundary stops being a place where memory ends,
 * which is the whole fix; what each rule reads — an earlier session only, or
 * the whole journey — is stated at the rule, not left implied.
 */
export class JourneyMemory {
  constructor(history) {
    const h = normalizeHistory(history);
    this.questionsSeen = h.questionsSeen;
    // Two views, deliberately. `earlier` is what EARLIER SESSIONS delivered and
    // never grows during this one: the cross-session rules read it, so they are
    // a statement about the journey rather than a second, absolute copy of the
    // in-session controls. `seen` is earlier plus what this session has
    // committed, for the identities that may not repeat anywhere in the journey.
    //
    // Keeping them apart matters: an absolute in-session ban on the PERCEPTUAL
    // identity is stricter than any control this engine ever had, and it cost
    // three slots off the all-easy ceiling when it was applied by accident. The
    // in-session spread of constructions is the scheduler's staged job
    // (`usedSignatures`), and it stays there.
    this.earlier = {
      perceptual: new Set(h.perceptual),
      reasoning: new Set(h.reasoning),
      blueprint: new Set(h.blueprint),
      stem: new Set(h.stem),
      skeleton: new Set(h.skeleton)
    };
    this.seen = {
      perceptual: new Set(h.perceptual),
      reasoning: new Set(h.reasoning),
      blueprint: new Set(h.blueprint),
      stem: new Set(h.stem),
      skeleton: new Set(h.skeleton)
    };
    // Ordered, so the horizon can drop the oldest when the session ends.
    this.trail = {
      perceptual: [...h.perceptual], reasoning: [...h.reasoning], blueprint: [...h.blueprint],
      stem: [...h.stem], skeleton: [...h.skeleton], task: [...h.task],
      presentation: [...h.presentation], family: [...h.family], entity: [...h.entity]
    };
    this.counts = {
      task: tally(h.task), presentation: tally(h.presentation),
      family: tally(h.family), entity: tally(h.entity)
    };
    this.startedEmpty = this.questionsSeen === 0;
  }

  /** Did an EARLIER session already deliver this? The cross-session rule. */
  hasSolved(kind, key) {
    return key != null && this.earlier[kind]?.has(key) === true;
  }

  /**
   * Has this user met it at any point in the journey, this session included?
   * Only the identities that must be unique across the whole journey — the
   * rendered stem — are checked this way.
   */
  hasMet(kind, key) {
    return key != null && this.seen[kind]?.has(key) === true;
  }

  /** How often this user has met this recently — for the things that may recur. */
  timesRecently(kind, key) {
    return key == null ? 0 : (this.counts[kind]?.get(key) ?? 0);
  }

  /**
   * Record a delivered question. Called once per published item, with the
   * identities the question itself carries — nothing is recomputed here, so the
   * memory and the measurement can never disagree about what was delivered.
   */
  record(keys) {
    for (const kind of ['perceptual', 'reasoning', 'blueprint', 'stem', 'skeleton']) {
      const k = keys[kind];
      if (k == null) continue;
      this.seen[kind].add(k);
      this.trail[kind].push(k);
    }
    for (const kind of ['task', 'presentation', 'family', 'entity']) {
      for (const k of [].concat(keys[kind] ?? [])) {
        if (k == null) continue;
        this.trail[kind].push(k);
        this.counts[kind].set(k, (this.counts[kind].get(k) ?? 0) + 1);
      }
    }
    this.questionsSeen++;
  }

  /**
   * The history to hand back to the product, trimmed to the horizon.
   *
   * Trimming happens here rather than during the session so that the session is
   * planned against everything it was given, and only what the NEXT session
   * needs is carried on.
   */
  toHistory() {
    const out = {schema: HISTORY_SCHEMA, questionsSeen: this.questionsSeen};
    for (const [kind, keep] of Object.entries(HORIZON)) {
      const trail = this.trail[kind] ?? [];
      out[kind] = trail.slice(Math.max(0, trail.length - keep));
    }
    return out;
  }
}

function tally(values) {
  const m = new Map();
  for (const v of values) m.set(v, (m.get(v) ?? 0) + 1);
  return m;
}

/**
 * The identities one published question contributes.
 *
 * Read off the metadata the question already publishes, so the journey memory
 * records exactly what the diversity measurement reads. `entity` is a list
 * because a stem can name several.
 */
export function keysOf(q, {entityWords = []} = {}) {
  const m = q.metadata ?? {};
  return {
    perceptual: m.user_perceptual_signature ?? null,
    reasoning: m.sub_idea_signature ?? null,
    blueprint: m.template_id && m.task_signature ? `${q.family}|${m.template_id}|${m.task_signature}` : null,
    stem: m.normalized_stem_identity ?? null,
    skeleton: m.stem_skeleton ?? null,
    task: m.task_signature ?? null,
    presentation: m.template_id && m.task_signature
      ? `${q.family}|${m.task_signature}|${m.information_structure ?? 'DIRECT_GIVENS'}` : null,
    family: q.family ?? null,
    entity: entityWords
  };
}
