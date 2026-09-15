// RC2.9.1 → RC2.9.2. The user journey's diversity memory.
//
// The defect this exists to fix, and the one it created.
//
// A session is fifty questions. A user who wants a hundred sits two of them,
// and the second call started the planner from an empty page: every idea the
// first session had spent was eligible again, so the second fifty replayed the
// first. RC2.9 fixed that by carrying an explicit history and refusing anything
// in it.
//
// Refusing anything in it was too blunt. «Have I ever met this?» is a LIFETIME
// BAN, and a lifetime ban meets the end of a finite question universe: after a
// hundred questions the third sitting could fill fifteen of its fifty slots and
// then refused itself with INSUFFICIENT_CONSTRUCTION_BREADTH. An independent
// review reproduced that through the shipped application.
//
// So the memory is a COOLDOWN, not a ban. It remembers WHEN each identity was
// last seen, in absolute question positions across the whole journey, and an
// identity is protected only while it is still inside its own recency window.
// A construction met at Q1 is blocked for the whole of Q2–Q100 and becomes
// eligible at Q101; one met at Q70 is still blocked at Q101. The user rotates
// through the question universe instead of walking off the end of it.
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
//   * It is BOUNDED, and bounded by the cooldowns themselves: an entry whose
//     window has closed can never matter again, so it is dropped. The ceiling
//     is one entry per question per dimension over the longest cooldown, which
//     is a fixed size no matter how long the learner practises.
//   * It is a FUNCTION of its inputs. Same seed and same incoming history give
//     the same session and the same outgoing history, every time.

/**
 * The schema tag, so a stored history from another release is refused rather
 * than misread. v2 records positions; v1 recorded bare identities and is
 * migrated rather than discarded — see `normalizeHistory`.
 */
export const HISTORY_SCHEMA = 'rc292-diversity-history-v2';

/** The v1 tag, kept so a journey already under way is not thrown away. */
export const HISTORY_SCHEMA_V1 = 'rc29-diversity-history-v1';

/**
 * How long each identity stays protected, in QUESTIONS — not in sessions.
 *
 * Sessions are the wrong unit: a user who sits two twenty-fives and a user who
 * sits one fifty have had the same experience, and a rule counted in sessions
 * tells them apart for no reason. Every number here is a distance between two
 * positions in the one sequence of questions the user actually meets.
 *
 * Why each is what it is:
 *
 *   perceptual   100 — the CORE. What the review measures is a rolling hundred
 *                      questions, so a construction may not come back inside
 *                      the hundred before it. This is the number the acceptance
 *                      invariant is stated in, and it is the strictest thing
 *                      here because it is what a solver actually recognises.
 *   stem         150 — stricter still, and it can afford to be: the same
 *                      construction produces many different sentences, so stems
 *                      are far more plentiful than constructions and a longer
 *                      window costs nothing. Meeting the exact same sentence is
 *                      the most visible repeat there is.
 *   reasoning     60 — the sub-idea inside a construction. Narrower than the
 *                      construction, so it recurs sooner without being noticed.
 *   blueprint     60 — template plus job. DELIBERATELY SHORTER than the
 *                      construction it realises: several blueprints share one
 *                      construction, and the hard band holds 34 blueprints
 *                      against roughly 33 hard slots in a rolling hundred, so a
 *                      blueprint cooldown as long as the construction one would
 *                      be the binding constraint rather than the core.
 *   skeleton      60 — the stem's shape with its numbers and names removed.
 *
 * The four below are CONCENTRATION counters, not identities: they may recur
 * freely and are bounded by how OFTEN they appear in a trailing window rather
 * than by how recently. Their windows are shorter because they are about how a
 * sitting feels, not about what was solved.
 */
export const COOLDOWN = Object.freeze({
  perceptual: 100,
  stem: 150,
  reasoning: 60,
  blueprint: 60,
  skeleton: 60
});

/**
 * Trailing windows for the concentration counters.
 *
 * `layout` is RC2.9.2's addition and it is the sequence fix. A sequence's
 * information layout IS its rule class — a constant-difference run and an
 * affine recurrence are two layouts, and ×3+2 and ×3+5 are one — so counting
 * how often a layout has appeared in the last hundred questions is counting how
 * often the reader has met that rule. An independent rendered sample saw six
 * rule families where the engine holds nine, because two of them took half the
 * sequence slots between them; this is the axis that stops that.
 *
 * It is a COUNT and not a cooldown on purpose: a rule class may legitimately
 * come round again inside a hundred questions, it just may not dominate.
 */
export const WINDOW = Object.freeze({
  // RC2.9.4-B9. How many times a CONSTRUCTION appeared in the last hundred —
  // the rolling cluster the acceptance measures, which spans sittings. The
  // cooldown above says whether it may come back at all; this says how many
  // of it the window already holds. A history from before this key reads as
  // an empty count, which `normalizeHistory` already guarantees.
  perceptual: 100,
  task: 60,
  presentation: 60,
  layout: 100,
  family: 30,
  entity: 60
});

/** The identities that carry a cooldown, in the order they are recorded. */
export const RECENCY_KINDS = Object.freeze(Object.keys(COOLDOWN));
/** The identities that carry a trailing count. */
export const COUNT_KINDS = Object.freeze(Object.keys(WINDOW));

const EMPTY = Object.freeze({
  schema: HISTORY_SCHEMA,
  questionsSeen: 0,
  seen: {perceptual: [], stem: [], reasoning: [], blueprint: [], skeleton: []},
  recent: {perceptual: [], task: [], presentation: [], layout: [], family: [], entity: []}
});

/** A fresh journey. A user opening the app for the first time gets this. */
export const emptyHistory = () => JSON.parse(JSON.stringify(EMPTY));

const isPair = v => Array.isArray(v) && typeof v[0] === 'string' && Number.isFinite(v[1]);

/**
 * Read a history a caller handed in.
 *
 * Anything unusable — null, a shape that is not this one — is treated as a
 * fresh journey rather than as an error, because the product must still be able
 * to generate a session when its stored progress is missing.
 *
 * A v1 history is MIGRATED rather than refused. v1 stored each dimension as a
 * chronological list of identities with no positions, and it was written one
 * entry per question, so the position of entry i in a list of length L ending at
 * question N is N − L + 1 + i. A learner half-way through a journey keeps it.
 */
export function normalizeHistory(input) {
  if (!input || typeof input !== 'object') return emptyHistory();
  if (input.schema === HISTORY_SCHEMA_V1) return migrateFromV1(input);
  if (input.schema !== HISTORY_SCHEMA) return emptyHistory();

  const seen = {}, recent = {};
  for (const kind of RECENCY_KINDS) {
    const raw = Array.isArray(input.seen?.[kind]) ? input.seen[kind] : [];
    seen[kind] = raw.filter(isPair).map(([k, at]) => [k, Math.trunc(at)]);
  }
  for (const kind of COUNT_KINDS) {
    const raw = Array.isArray(input.recent?.[kind]) ? input.recent[kind] : [];
    recent[kind] = raw.filter(isPair).map(([k, at]) => [k, Math.trunc(at)]);
  }
  return {
    schema: HISTORY_SCHEMA,
    questionsSeen: Number.isFinite(input.questionsSeen) ? Math.max(0, Math.trunc(input.questionsSeen)) : 0,
    seen, recent
  };
}

function migrateFromV1(v1) {
  const n = Number.isFinite(v1.questionsSeen) ? Math.max(0, Math.trunc(v1.questionsSeen)) : 0;
  const positioned = list => {
    const items = Array.isArray(list) ? list.filter(v => typeof v === 'string') : [];
    return items.map((k, i) => [k, n - items.length + 1 + i]);
  };
  const seen = {}, recent = {};
  for (const kind of RECENCY_KINDS) seen[kind] = positioned(v1[kind]);
  for (const kind of COUNT_KINDS) recent[kind] = positioned(v1[kind]);
  return {schema: HISTORY_SCHEMA, questionsSeen: n, seen, recent};
}

/**
 * The live view the scheduler consults.
 *
 * Built once per session from the incoming history and then extended as the
 * session commits questions, so the fiftieth question of a sitting is planned
 * against the forty-nine before it AND everything the earlier sittings
 * delivered. The session boundary is not a place where memory ends; neither is
 * it a place where memory is reset.
 *
 * Every question is asked AT A POSITION, and every rule here is a question
 * about distance from that position. There is no «have I ever» left.
 */
export class JourneyMemory {
  constructor(history) {
    const h = normalizeHistory(history);
    this.questionsSeen = h.questionsSeen;
    /** identity → the absolute position it was last delivered at. */
    this.lastSeenAt = {};
    for (const kind of RECENCY_KINDS) this.lastSeenAt[kind] = new Map(h.seen[kind]);
    /** identity → every position inside its window, for the count rules. */
    this.occurrences = {};
    for (const kind of COUNT_KINDS) {
      const m = new Map();
      for (const [k, at] of h.recent[kind]) m.set(k, [...(m.get(k) ?? []), at]);
      this.occurrences[kind] = m;
    }
    this.startedEmpty = this.questionsSeen === 0;
    /**
     * Where this sitting begins. Everything at or before it was delivered in an
     * EARLIER sitting; everything after it is this one.
     */
    this.sessionStart = this.questionsSeen;
    /**
     * What each identity's last position was WHEN THIS SITTING STARTED, frozen.
     *
     * It has to be frozen rather than read off the live map. A construction
     * delivered once inside this sitting moves its own live `lastSeen` forward
     * into the current session, and a cross-sitting rule reading that would
     * conclude the identity is not carried in at all — which is how a
     * construction shown twice in one sitting and twice in the next put four of
     * itself inside one rolling hundred, against a limit of three.
     */
    this.carriedLastSeen = {};
    for (const kind of RECENCY_KINDS) this.carriedLastSeen[kind] = new Map(this.lastSeenAt[kind]);
    /** Positions this session actually used a journey-protected idea at. */
    this.protectedReuses = [];
  }

  /** The position the next question will be asked at, 1-based over the journey. */
  positionOf(slotIndex) {
    return this.questionsSeen + slotIndex + 1;
  }

  /** When this identity was last delivered, or null if never (or long expired). */
  lastSeen(kind, key) {
    if (key == null) return null;
    return this.lastSeenAt[kind]?.get(key) ?? null;
  }

  /**
   * Is this identity still inside its cooldown at `position`?
   *
   * The boundary is stated once, here, and nowhere else: an identity last seen
   * at L is protected while `position − L < COOLDOWN[kind]`, and eligible at
   * exactly `position − L === COOLDOWN[kind]`. Seen at Q1 with a cooldown of a
   * hundred, it is blocked through Q100 and free at Q101.
   */
  isProtected(kind, key, position) {
    const last = this.lastSeen(kind, key);
    if (last == null) return false;
    return position - last < COOLDOWN[kind];
  }

  /**
   * Is this identity protected by something an EARLIER sitting delivered?
   *
   * The distinction matters and is the shape of the whole control. The cooldown
   * answers «may the user meet this again yet», across sittings, where the
   * defect was. CONCENTRATION inside one sitting is a different question with a
   * different answer — the scheduler's cluster cap — and answering it with the
   * cooldown as well made the planner and the guard disagree about the same
   * slot: a hundred-question sitting rendered two hundred and fifty questions
   * that were never going to be published, for a session whose delivered
   * content was the same either way.
   */
  carriedIn(kind, key, position) {
    if (key == null) return false;
    const last = this.carriedLastSeen[kind]?.get(key);
    if (last == null) return false;
    return position - last < COOLDOWN[kind];
  }

  /** How long ago, in questions, or Infinity for never. */
  distanceSince(kind, key, position) {
    const last = this.lastSeen(kind, key);
    return last == null ? Infinity : position - last;
  }

  /** How often this identity falls inside its trailing window at `position`. */
  timesRecently(kind, key, position) {
    if (key == null) return 0;
    const hits = this.occurrences[kind]?.get(key);
    if (!hits) return 0;
    const window = WINDOW[kind];
    return hits.filter(at => position - at < window).length;
  }

  /**
   * Record a delivered question at its absolute position.
   *
   * Nothing is recomputed here — the identities come from the question itself —
   * so the memory and the measurement can never disagree about what was shown.
   */
  record(keys, position) {
    for (const kind of RECENCY_KINDS) {
      const k = keys[kind];
      if (k != null) this.lastSeenAt[kind].set(k, position);
    }
    for (const kind of COUNT_KINDS) {
      for (const k of [].concat(keys[kind] ?? [])) {
        if (k == null) continue;
        const hits = this.occurrences[kind].get(k) ?? [];
        hits.push(position);
        this.occurrences[kind].set(k, hits);
      }
    }
    this.questionsSeen = Math.max(this.questionsSeen, position);
  }

  /** Note that a slot had to fall back onto an idea still inside its cooldown. */
  noteProtectedReuse(entry) {
    this.protectedReuses.push(entry);
  }

  /**
   * RC2.9.4-B9. What was delivered at an absolute position, on the axes the
   * streak measure reads: family, task and construction. Read back from the
   * count and recency maps, so nothing new is stored.
   */
  keysAtPosition(position) {
    const find = kind => { for (const [k, hits] of this.occurrences[kind] ?? []) if (hits.includes(position)) return k; return null; };
    let perceptual = null;
    for (const [k, at] of this.lastSeenAt.perceptual ?? []) if (at === position) { perceptual = k; break; }
    return {family: find('family'), task: find('task'), perceptual};
  }

  /** Is a blueprint similar (family+task, or construction) to what was at `position`? */
  similarTo(blueprint, position) {
    if (position < 1) return false;
    const k = this.keysAtPosition(position);
    if (!k.family && !k.perceptual) return false;
    return (k.family === blueprint.family && k.task === blueprint.task)
      || (k.perceptual != null && (blueprint.signatures ?? []).includes(k.perceptual));
  }

  /** Would this blueprint, asked first in the sitting, make a run of three with the previous sitting's last two? */
  similarRunInto(blueprint) {
    const last = this.sessionStart;
    if (last < 2) return false;
    if (!this.similarTo(blueprint, last)) return false;
    const a = this.keysAtPosition(last), b = this.keysAtPosition(last - 1);
    return (a.family && a.family === b.family && a.task === b.task) || (a.perceptual != null && a.perceptual === b.perceptual);
  }

  /** Was the previous sitting's last question similar to this blueprint? */
  lastWasSimilar(blueprint) {
    return this.sessionStart >= 1 && this.similarTo(blueprint, this.sessionStart);
  }

  /**
   * The history to hand back to the product, with closed windows dropped.
   *
   * Dropping is not forgetting for convenience: an identity whose cooldown has
   * elapsed can never be protected again, because positions only grow. Keeping
   * it would grow the stored value without changing a single decision.
   */
  toHistory() {
    const seen = {}, recent = {};
    for (const kind of RECENCY_KINDS) {
      seen[kind] = [...this.lastSeenAt[kind].entries()]
        .filter(([, at]) => this.questionsSeen - at < COOLDOWN[kind])
        .sort((a, b) => a[1] - b[1]);
    }
    for (const kind of COUNT_KINDS) {
      const rows = [];
      for (const [k, hits] of this.occurrences[kind]) {
        for (const at of hits) if (this.questionsSeen - at < WINDOW[kind]) rows.push([k, at]);
      }
      recent[kind] = rows.sort((a, b) => a[1] - b[1]);
    }
    return {schema: HISTORY_SCHEMA, questionsSeen: this.questionsSeen, seen, recent};
  }
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
    // The layout on its own, without the job asked of it: for sequences this is
    // the rule class, and one rule class asked three different ways is still
    // one rule the reader has met three times.
    layout: q.family ? `${q.family}|${m.information_structure ?? 'DIRECT_GIVENS'}` : null,
    family: q.family ?? null,
    entity: entityWords
  };
}
