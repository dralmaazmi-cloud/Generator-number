// RC2.8-3. Constraint-aware scheduling over the blueprint space.
//
// What replaced what.
//
// The old loop drew a finished question and asked "is this too much like
// something I already have?". It could only ever refuse; it could never aim. On
// a 100-question sitting that cost 621 candidates for 100 published questions,
// and the repetition it was meant to prevent concentrated in the last third —
// exactly where the retry budget ran out and the fallback took whatever was
// left.
//
// This plans the SEMANTIC content of the whole session first, over the 159
// blueprints in src/compose/blueprints.js, and only then asks the renderer for
// each one. The constraints are:
//
//   HARD, never relaxed
//     * the band of every slot is the band the difficulty schedule decided;
//       this release does not touch difficulty
//     * a blueprint may not repeat while an unused one is available
//     * one presentation — family + job + information layout — may not exceed
//       its cluster cap, which is what a reader actually perceives as "this
//       again"
//
//   SOFT, relaxed in a declared order and RECORDED each time
//     1. no family in two adjacent slots
//     2. no job (task archetype) in two adjacent slots
//     3. no family more than twice in any ten consecutive slots
//     4. blueprint repetition, bounded by a budget; past the budget the
//        session is refused rather than filled with reskins
//
// Everything is drawn from a fork of the session seed, so the same seed and the
// same history plan the same session. No clock, no counter outside the session,
// no global state.

import {BLUEPRINTS, blueprintsForBand, blueprintId, presentationOf} from './blueprints.js';

/** Relaxation stages, in the order they are given up. Reported by name. */
/**
 * How many times one CONSTRUCTION may be PLANNED into a session.
 *
 * Two, which is what the acceptance gates leave room for rather than a number
 * chosen for its own sake: the largest perceptual cluster in a rolling hundred
 * may be three, and each occurrence after the first also counts as a near
 * duplicate, of which a hundred may carry five.
 *
 * RC2.9.2 keeps it at two and is explicit about why it is a SEPARATE control
 * from the cooldown. The cooldown says when a construction may come back to a
 * user at all, across sittings; this says how often one may appear inside a
 * single sitting. With both in force a rolling hundred can hold a construction
 * twice — it recurs inside one sitting or not at all, because the next sitting
 * is still inside its cooldown — which is inside the gate.
 */
export const CONSTRUCTION_CLUSTER_CAP = 2;

export const STAGES = Object.freeze([
  'ALL_CONSTRAINTS',
  'FAMILY_TASK_REUSE_ALLOWED',
  'FAMILY_WINDOW_RELAXED',
  'ADJACENT_TASK_RELAXED',
  'ADJACENT_FAMILY_RELAXED',
  'BLUEPRINT_REPEAT_ALLOWED',
  // The last stage, and the only one that touches an idea budget. It is
  // reached when a batch has spent its shared allowance and the alternative is
  // refusing a session the pool could otherwise fill. What it does NOT relax is
  // the thing a reader perceives: the presentation cluster cap still binds
  // here, and the core-construction ban in src/compose/novelty.js is absolute
  // at realization, so a third use of an idea can only be published when the
  // question it produces is a genuinely different construction. Every slot that
  // reaches this stage is recorded by name.
  'BATCH_IDEA_BUDGET_RELAXED'
]);

/**
 * Caps, expressed per 100 slots and scaled to the session, so they mean the
 * same SHARE at 20 questions as at 250 rather than a count that binds at one
 * length and not the other.
 */
export const CAPS_PER_100 = Object.freeze({
  presentationCluster: 3,   // same family + job + layout
  blueprintRepeat: 1,       // one blueprint twice is one repeat
  familyPerTen: 3           // not scaled: a window of ten is a window of ten
});

/**
 * A per-100 cap, scaled to the session.
 *
 * The floor is TWO, not one. Scaling «three per hundred» linearly gives one at
 * thirty slots, which is not a tighter version of the rule — it is a different
 * and much harder rule, and a thirty-question all-hard session became
 * undeliverable against it: the hard band holds twenty-seven presentations, so
 * one each cannot fill thirty slots. A cap of one also says something the brief
 * does not: that meeting a layout twice in a short session is a defect. It is
 * not; meeting it four times is.
 */
const scale = (perHundred, count) => Math.max(2, Math.round(perHundred * count / 100));

export class BlueprintScheduler {
  /**
   * @param {object} opts
   * @param {string[]} opts.bandSchedule one band per slot; not negotiable
   * @param {string[]} [opts.familyPreference] the family the old scheduler wanted per slot
   * @param {string[]} [opts.familyPool] restrict to these families
   * @param {object} opts.rng seeded
   * @param {Set<string>} [opts.recentBlueprints] blueprint ids this learner met recently
   * @param {Map<string,number>} [opts.batchPresentations] shared across a batch
   * @param {Map<string,number>} [opts.batchBlueprints] shared across a batch
   */
  constructor({bandSchedule, familyPreference = [], familyPool = null, rng,
    journey = null, recentBlueprints = null, batchPresentations = null,
    batchBlueprints = null, batchCount = null} = {}) {
    this.bands = [...bandSchedule];
    this.count = this.bands.length;
    this.familyPreference = familyPreference;
    this.familyPool = familyPool;
    this.rng = rng;
    // RC2.9-1. What this user solved in earlier sessions of the same journey.
    // Consulted at selection, so an idea they have already met is not offered
    // again while the band still holds one they have not.
    this.journey = journey;
    this.recentBlueprints = recentBlueprints;
    this.batchPresentations = batchPresentations;
    this.batchBlueprints = batchBlueprints;
    const span = Math.max(this.count, Number(batchCount) || 0);
    // The cap is never tighter than the pool itself forces.
    //
    // Scaling «three per hundred» to a sixty-question batch gives two, and the
    // hard band holds twenty-seven layouts: two each is fifty-four, so a batch
    // of two thirty-question hard sessions became unplannable against a rule
    // that was meant to describe how a session READS. A cap that makes a
    // request impossible is not a diversity control, it is an outage. So the
    // floor is what the arithmetic demands — how many times a layout must
    // recur for the band's slots to be fillable at all — and the cap is the
    // looser of the two.
    this.presentationCap = Math.max(
      scale(CAPS_PER_100.presentationCluster, span),
      this._forcedPresentationRecurrence(span)
    );
    // How often ONE idea may be used across a batch, per band.
    //
    // A flat two was hiding material rather than protecting anything. A single
    // template can realise many different core constructions — an ordering
    // template draws chains and branched partial orders, a relational one draws
    // graphs of different shapes — and the hard band holds sixty-seven distinct
    // core constructions behind thirty-four ideas. A 230-question sitting asks
    // for sixty-two hard slots: well inside the constructions available, and
    // just outside thirty-four ideas at two uses each, so the sitting was
    // refused for a shortage it did not have. The cap is derived from the band's
    // own demand, with one use of slack, and the core-construction ban in
    // src/compose/novelty.js is what actually guarantees no idea is met twice.
    this.batchBlueprintCap = new Map();
    for (const band of new Set(this.bands)) {
      const slotsHere = this.bands.filter(b => b === band).length;
      const slotsInSpan = Math.ceil((slotsHere / this.count) * span);
      const ideas = this._pool(band).length || 1;
      this.batchBlueprintCap.set(band, Math.max(2, Math.ceil(slotsInSpan / ideas) + 1));
    }
    this.repeatBudget = scale(CAPS_PER_100.blueprintRepeat, this.count);
    this.events = [];
  }

  /**
   * How many of THIS request's bands each presentation is available in.
   *
   * A presentation that only exists at one band is material no other band can
   * use, so spending it there costs nothing. One that exists at three is shared,
   * and spending it early forces a repeat later. Preferring the exclusive
   * material first is what closes the gap between the plan and the arithmetic
   * floor on how few presentations a sitting can repeat.
   */
  _presentationReach() {
    const reach = new Map();
    for (const band of new Set(this.bands)) {
      for (const p of new Set(this._pool(band).map(presentationOf))) {
        reach.set(p, (reach.get(p) ?? 0) + 1);
      }
    }
    return reach;
  }

  /** How many distinct jobs each family can offer this request at all. */
  _familyTaskPool() {
    const m = new Map();
    for (const band of new Set(this.bands)) {
      for (const b of this._pool(band)) {
        if (!m.has(b.family)) m.set(b.family, new Set());
        m.get(b.family).add(b.task);
      }
    }
    return new Map([...m].map(([f, s]) => [f, s.size]));
  }

  /**
   * How often a layout must recur for this request to be fillable at all,
   * measured per band and scaled to the whole span the caps are shared over.
   */
  _forcedPresentationRecurrence(span) {
    let forced = 1;
    for (const band of new Set(this.bands)) {
      const slotsHere = this.bands.filter(b => b === band).length;
      const slotsInSpan = Math.ceil((slotsHere / this.count) * span);
      const layouts = new Set(this._pool(band).map(presentationOf)).size;
      if (!layouts) continue;
      forced = Math.max(forced, Math.ceil(slotsInSpan / layouts));
    }
    return forced;
  }

  /** Blueprints that could fill a slot of this band at all. */
  _pool(band) {
    return blueprintsForBand(band, this.familyPool);
  }

  /**
   * Is this blueprint admissible in slot `i`, given what is already placed?
   * Returns null when admissible, or the name of the first constraint it breaks.
   */
  _violation(b, i, state, stage) {
    const id = blueprintId(b);
    const pres = presentationOf(b);
    const usedHere = state.blueprintUse.get(id) ?? 0;
    const presHere = (state.presentationUse.get(pres) ?? 0)
      + (this.batchPresentations?.get(pres) ?? 0);
    // --- hard --------------------------------------------------------------
    // RC2.9-3 / RC2.9.2. An idea this user met RECENTLY is treated exactly as
    // one this session has already used: not eligible while the band holds an
    // idea whose cooldown has elapsed. Given up only at the same last stage the
    // in-session rule is, and recorded there by name.
    //
    // «Recently» is the whole of RC2.9.2. RC2.9 asked «has this user ever met
    // it», which is a lifetime ban, and a lifetime ban runs out of universe: the
    // third sitting of a journey filled fifteen of its fifty slots and refused
    // itself. The question is now how far back, measured from the position this
    // slot will actually be asked at, so a construction expires mid-session
    // exactly when it should.
    const at = this.journey ? this.journey.positionOf(i) : 0;
    if (stage < 5 && this.journey?.carriedIn('blueprint', id, at)) return 'BLUEPRINT_STILL_IN_COOLDOWN';
    // And the CONSTRUCTION, not only the blueprint. A fourth proportion told
    // about boxes and one told about machines are two blueprints and one
    // question; planning the second as fresh meant the realisation guard threw
    // it away, fifty-one times in one session, and the session ran out before it
    // was full. The catalogue records what each blueprint realises, so the
    // planner knows this before it allocates.
    if (stage < 5 && this.journey && (b.signatures ?? []).length
      && (b.signatures ?? []).every(sig => this.journey.carriedIn('perceptual', sig, at))) {
      return 'CONSTRUCTION_STILL_IN_COOLDOWN';
    }
    // Within THIS session the same construction is bounded rather than banned.
    //
    // Banning it outright — no blueprint whose constructions are all already on
    // the page — reads as the obvious companion to the rule above, and it was
    // tried: it pushed the planner into the few families that carry many
    // constructions, whose items then shared five surface dimensions and were
    // thrown away at realisation, taking a hundred-question sitting from 25.9%
    // of candidates rejected to 45.6%. The bound below is what the review
    // actually asks for — no construction may be the third thing a reader
    // recognises — and it is read off what was DELIVERED, not off what a
    // blueprint might have produced.
    if (stage < 4 && (b.signatures ?? []).length
      && (b.signatures ?? []).every(sig => (state.signatureUse?.get(sig) ?? 0) >= CONSTRUCTION_CLUSTER_CAP)) {
      return 'CONSTRUCTION_CLUSTER_CAP';
    }
    if (presHere >= this.presentationCap) return 'PRESENTATION_CLUSTER_CAP';
    if (usedHere > 0 && stage < 4) return 'BLUEPRINT_ALREADY_USED';
    if (stage < 5) {
      if (usedHere > 0 && state.repeats >= this.repeatBudget) return 'BLUEPRINT_REPEAT_BUDGET';
      if (usedHere >= 2) return 'BLUEPRINT_REPEAT_BUDGET';
      if ((this.batchBlueprints?.get(id) ?? 0) >= (this.batchBlueprintCap.get(b.band) ?? 2)) {
        return 'BLUEPRINT_BATCH_CAP';
      }
    }
    if (usedHere >= 3) return 'BLUEPRINT_REPEAT_BUDGET';
    // --- soft, given up in the declared order -------------------------------
    // Both neighbours, not just the one before: slots are planned in order of
    // how scarce their band is rather than left to right, so the slot after
    // this one may already be filled.
    const neighbours = [state.placed[i - 1], state.placed[i + 1]].filter(Boolean);
    if (stage < 4 && neighbours.some(p => p.family === b.family)) return 'ADJACENT_FAMILY';
    if (stage < 3 && neighbours.some(p => p.task === b.task)) return 'ADJACENT_TASK';
    if (stage < 2) {
      const window = state.placed.slice(Math.max(0, i - 9), i + 10).filter(Boolean);
      if (window.filter(p => p.family === b.family).length >= CAPS_PER_100.familyPerTen) {
        return 'FAMILY_WINDOW';
      }
    }
    if (stage < 1) {
      // RC2.8-3. The family acceptance rule made structural. A family met a
      // second time must bring a different JOB with it while it still has one
      // unused — «another fractions question» is what a reader notices, and two
      // fractions questions both asking «what is the result of the chain» are
      // that, whatever the chain lengths are. Given up first of the soft rules,
      // because it is also the one most often unsatisfiable in a thin family.
      const used = state.familyTasks.get(b.family);
      if (used && used.has(b.task) && (state.familyTaskPool.get(b.family) ?? 1) > used.size) {
        return 'FAMILY_TASK_REUSE';
      }
    }
    return null;
  }

  /**
   * Preference order among admissible blueprints. Least-used first on the axes
   * a reader perceives, then the family the old schedule wanted, then a seeded
   * shuffle so two seeds do not produce the same session.
   */
  _rank(candidates, i, state) {
    const want = this.familyPreference[i] ?? null;
    this._reach ??= this._presentationReach();
    const at = this.journey ? this.journey.positionOf(i) : 0;
    const scored = candidates.map(b => {
      const pres = presentationOf(b);
      return {
        b,
        presUse: (state.presentationUse.get(pres) ?? 0) + (this.batchPresentations?.get(pres) ?? 0),
        familyTaskUse: state.familyTasks.get(b.family)?.get(b.task) ?? 0,
        taskUse: state.taskUse.get(b.task) ?? 0,
        familyUse: state.familyUse.get(b.family) ?? 0,
        recent: this.recentBlueprints?.has(blueprintId(b)) ? 1 : 0,
        // RC2.9.2. Ranked before everything else, and LEAST RECENTLY USED
        // first: an idea the user has never met sorts ahead of one met a
        // hundred questions ago, which sorts ahead of one met eighty ago. When
        // several constructions come out of cooldown together, the oldest is
        // the one offered — which is what turns a pool into a rotation rather
        // than a lottery among whatever happens to be free.
        //
        // The scores are NEGATIVE distances so that a plain ascending sort puts
        // the furthest-away first; never-seen is -Infinity and therefore first.
        solvedBefore: -(this.journey?.distanceSince('blueprint', blueprintId(b), at) ?? Infinity),
        constructionSolved: -Math.min(...((b.signatures ?? []).length && this.journey
          ? (b.signatures ?? []).map(sig => this.journey.distanceSince('perceptual', sig, at))
          : [Infinity])),
        // How often this LAYOUT has come round lately. For sequences the layout
        // is the rule class, so this is what keeps one rule from taking half
        // the family's slots — ranked above the task and the family because a
        // reader notices the rule before either.
        journeyLayout: this.journey?.timesRecently('layout', `${b.family}|${b.info}`, at) ?? 0,
        journeyPresentation: this.journey?.timesRecently('presentation', pres, at) ?? 0,
        journeyTask: this.journey?.timesRecently('task', b.task, at) ?? 0,
        journeyFamily: this.journey?.timesRecently('family', b.family, at) ?? 0,
        // How often the BATCH has already used this idea. Without it each
        // session of a sitting plans from an empty page and happily re-picks
        // what the previous session used, up to the batch cap: a 150-question
        // sitting came out with forty-five ideas used twice where fifteen is
        // what the medium pool forces.
        batchUse: this.batchBlueprints?.get(blueprintId(b)) ?? 0,
        reach: this._reach.get(pres) ?? 1,
        wanted: want && b.family === want ? 0 : 1,
        jitter: this.rng.next()
      };
    });
    scored.sort((x, y) =>
      x.solvedBefore - y.solvedBefore
      || x.constructionSolved - y.constructionSolved
      || x.recent - y.recent
      || x.batchUse - y.batchUse
      || x.journeyLayout - y.journeyLayout
      || x.journeyPresentation - y.journeyPresentation
      || x.presUse - y.presUse
      || x.journeyTask - y.journeyTask
      || x.journeyFamily - y.journeyFamily
      || x.reach - y.reach
      || x.familyTaskUse - y.familyTaskUse
      || x.taskUse - y.taskUse
      || x.familyUse - y.familyUse
      || x.wanted - y.wanted
      || x.jitter - y.jitter);
    return scored.map(s => s.b);
  }

  _commit(state, b, i, realized = null) {
    const id = blueprintId(b), pres = presentationOf(b);
    // RC2.8-3. A batch's shared tallies are written here, and ONLY when this is
    // the live realization — the plan is provisional and backtracks, so counting
    // its trial placements into a shared map would charge later sessions for
    // choices that were never delivered.
    if (state === this.live) {
      if (this.batchBlueprints) this.batchBlueprints.set(id, (this.batchBlueprints.get(id) ?? 0) + 1);
      if (this.batchPresentations) this.batchPresentations.set(pres, (this.batchPresentations.get(pres) ?? 0) + 1);
    }
    if ((state.blueprintUse.get(id) ?? 0) > 0) state.repeats++;
    state.blueprintUse.set(id, (state.blueprintUse.get(id) ?? 0) + 1);
    state.presentationUse.set(pres, (state.presentationUse.get(pres) ?? 0) + 1);
    state.taskUse.set(b.task, (state.taskUse.get(b.task) ?? 0) + 1);
    state.familyUse.set(b.family, (state.familyUse.get(b.family) ?? 0) + 1);
    // Which CONSTRUCTION this placement put on the page.
    //
    // During realization the caller knows it exactly, because the question has
    // been rendered. During the PLAN it is not yet drawn, and RC2.9.1 counted
    // nothing for a blueprint that could realise more than one — which let the
    // plan place two blueprints that then came out as the same construction,
    // and the guard threw the second away. So the plan charges EVERY
    // construction the blueprint could produce: a conservative claim, and the
    // right direction to be wrong in, because over-claiming costs one
    // alternative while under-claiming costs a rendered question.
    const sigs = realized ? [realized] : (b.signatures ?? []);
    state.placedSignature[i] = sigs;
    for (const sig of sigs) state.signatureUse.set(sig, (state.signatureUse.get(sig) ?? 0) + 1);
    if (!state.familyTasks.has(b.family)) state.familyTasks.set(b.family, new Map());
    const ft = state.familyTasks.get(b.family);
    ft.set(b.task, (ft.get(b.task) ?? 0) + 1);
    state.placed[i] = b;
  }

  _uncommit(state, i) {
    const b = state.placed[i];
    if (!b) return;
    const id = blueprintId(b), pres = presentationOf(b);
    const n = state.blueprintUse.get(id) ?? 0;
    if (n > 1) state.repeats--;
    if (n <= 1) state.blueprintUse.delete(id); else state.blueprintUse.set(id, n - 1);
    const dec = (m, k) => { const v = (m.get(k) ?? 0) - 1; if (v <= 0) m.delete(k); else m.set(k, v); };
    dec(state.presentationUse, pres);
    dec(state.taskUse, b.task);
    dec(state.familyUse, b.family);
    for (const sig of state.placedSignature[i] ?? []) dec(state.signatureUse, sig);
    state.placedSignature[i] = null;
    const ft = state.familyTasks.get(b.family);
    if (ft) { dec(ft, b.task); if (!ft.size) state.familyTasks.delete(b.family); }
    state.placed[i] = null;
  }

  /**
   * The plan. Depth-first with backtracking: when a slot has no admissible
   * blueprint at the current stage, the stage is given up one step and recorded;
   * when even the last stage is empty, the previous slot is undone and its next
   * choice tried. Bounded so an unsatisfiable request fails loudly instead of
   * running forever.
   */
  plan() {
    const state = {
      placed: new Array(this.count).fill(null),
      blueprintUse: new Map(), presentationUse: new Map(),
      taskUse: new Map(), familyUse: new Map(), repeats: 0,
      familyTasks: new Map(), familyTaskPool: this._familyTaskPool(),
      signatureUse: new Map(), placedSignature: new Array(this.count).fill(null)
    };
    const choices = new Array(this.count).fill(null);
    const cursors = new Array(this.count).fill(0);
    // RC2.8-3. Scarcest band first, not left to right.
    //
    // Presentations are shared between bands — «a work_time question asking a
    // duration, laid out as a multi-stage process» exists at medium and at
    // hard — so whichever band is planned first takes the unique ones and
    // leaves the other to repeat. A 100-question sitting asks for about sixty
    // medium slots against fifty-two medium presentations and twenty-five easy
    // slots against thirty-one: planning in reading order let the easy slots
    // spend material the medium slots had no substitute for, and the sitting
    // came out with nineteen repeated presentations where eight is the
    // arithmetic floor. Filling the tightest band first spends the shared
    // material where it is scarce.
    const pressure = new Map();
    for (const band of new Set(this.bands)) {
      const slots = this.bands.filter(b => b === band).length;
      const available = new Set(this._pool(band).map(presentationOf)).size || 1;
      pressure.set(band, slots / available);
    }
    const order = [...this.bands.keys()]
      .sort((a, b) => (pressure.get(this.bands[b]) - pressure.get(this.bands[a])) || (a - b));
    let cursorInOrder = 0;
    let steps = 0;
    const maxSteps = this.count * 60;
    while (cursorInOrder < this.count) {
      if (++steps > maxSteps) break;
      const i = order[cursorInOrder];
      if (!choices[i]) {
        const pool = this._pool(this.bands[i]);
        let admissible = [], stageUsed = 0;
        for (let stage = 0; stage < STAGES.length; stage++) {
          admissible = pool.filter(b => this._violation(b, i, state, stage) === null);
          if (admissible.length) { stageUsed = stage; break; }
        }
        if (!admissible.length) {
          // Nothing fits even fully relaxed: undo the slot planned before this
          // one and let it choose differently. This is the rebalancing the brief
          // asks for — the conflict is resolved by moving an EARLIER choice, not
          // by publishing a repeat here.
          choices[i] = null; cursors[i] = 0;
          if (cursorInOrder === 0) break;
          cursorInOrder--;
          this._uncommit(state, order[cursorInOrder]);
          cursors[order[cursorInOrder]]++;
          continue;
        }
        if (stageUsed > 0) {
          this.events.push({slot: i + 1, band: this.bands[i], stage: STAGES[stageUsed],
            note: 'no blueprint satisfied every constraint at this slot; the named constraint was given up'});
        }
        choices[i] = this._rank(admissible, i, state);
      }
      if (cursors[i] >= choices[i].length) {
        choices[i] = null; cursors[i] = 0;
        if (cursorInOrder === 0) break;
        cursorInOrder--;
        this._uncommit(state, order[cursorInOrder]);
        cursors[order[cursorInOrder]]++;
        continue;
      }
      this._commit(state, choices[i][cursors[i]], i);
      cursorInOrder++;
    }
    const filled = state.placed.filter(Boolean).length;
    return {
      plan: state.placed,
      filled,
      complete: filled === this.count,
      repeats: state.repeats,
      distinctBlueprints: state.blueprintUse.size,
      distinctPresentations: state.presentationUse.size,
      largestPresentationCluster: Math.max(0, ...state.presentationUse.values()),
      caps: {presentationCluster: this.presentationCap, blueprintRepeat: this.repeatBudget},
      relaxations: this.events
    };
  }

  // --- realization ---------------------------------------------------------
  //
  // The plan proves the session is FEASIBLE and fixes its balance. Realization
  // can still fail on a particular blueprint — a pinned template can exhaust
  // its parameter space for a seed — so the scheduler keeps a live state of what
  // was actually published and can hand back the next best blueprint for a slot.
  // A substitution is recorded; it is a change to the plan, not a hidden retry.

  beginRealization() {
    this.live = {
      placed: new Array(this.count).fill(null),
      blueprintUse: new Map(), presentationUse: new Map(),
      taskUse: new Map(), familyUse: new Map(), repeats: 0,
      familyTasks: new Map(), familyTaskPool: this._familyTaskPool(),
      signatureUse: new Map(), placedSignature: new Array(this.count).fill(null)
    };
    return this.live;
  }

  /**
   * Does this band still hold a construction the user is free to meet at slot
   * `i`, or is every one of them inside its cooldown?
   *
   * RC2.9.2. When the answer is no, no amount of redrawing can produce a
   * question that passes: the realisation guard will refuse every candidate for
   * the same reason, and the slot spends its whole retry budget rendering
   * questions that were never going to be published. Seven such slots in one
   * sitting were two hundred and fifty wasted renders, and two thirds of the
   * candidates a hundred-question sitting was charged for.
   *
   * This weakens nothing: the slot still falls back exactly as it did, to
   * exactly the same candidate. It just stops working for an answer that is not
   * there.
   */
  hasFreeConstructionAt(i) {
    if (!this.journey) return true;
    const at = this.journey.positionOf(i);
    return this._pool(this.bands[i]).some(b =>
      (b.signatures ?? []).some(sig => !this.journey.carriedIn('perceptual', sig, at)));
  }

  /**
   * The blueprints that may fill slot `i` given what has actually been
   * published, best first, excluding ones already tried here.
   */
  admissibleAt(i, exclude = new Set(), {atLeast = 6} = {}) {
    const pool = this._pool(this.bands[i]).filter(b => !exclude.has(blueprintId(b)));
    // Walk the stages in their declared order and KEEP GOING until there is
    // enough to work with.
    //
    // Returning at the first non-empty stage looked strict and was brittle: a
    // slot whose strictest stage admitted exactly one blueprint got a list of
    // one, spent its whole retry budget redrawing that single idea, and failed
    // the session while twenty-five ideas sat one stage further down. The order
    // is unchanged — everything admissible under the tighter rule still ranks
    // ahead of everything that needed a looser one — so this loosens nothing;
    // it stops a thin first stage from hiding the rest.
    const seen = new Set();
    const out = [];
    let firstStage = null;
    for (let stage = 0; stage < STAGES.length && out.length < atLeast; stage++) {
      const ok = pool.filter(b => !seen.has(blueprintId(b))
        && this._violation(b, i, this.live, stage) === null);
      if (!ok.length) continue;
      if (firstStage === null) firstStage = STAGES[stage];
      for (const b of this._rank(ok, i, this.live)) { seen.add(blueprintId(b)); out.push(b); }
    }
    return {stage: firstStage, blueprints: out};
  }

  /**
   * Is the plan's choice for this slot still admissible against what has
   * ACTUALLY been published? The plan is made before anything is rendered, and
   * a slot that fell through to an alternative can have spent the very quota
   * the plan was relying on. Trying the planned idea unconditionally is how a
   * presentation cluster of four got past a cap of three.
   */
  stillAdmissible(i, blueprint) {
    return this._violation(blueprint, i, this.live, 0) === null;
  }

  /**
   * The HARD constraints only, checked against what has been published.
   *
   * Used on the FINISHED question rather than on the candidate blueprint,
   * because the two can differ: a template asked to produce «the term before
   * the run» has to fall back to «the next term» when the run has no whole
   * predecessor, and the item then belongs to a different presentation than
   * the one this slot was cleared for. Checking only at selection let that
   * drift push a presentation cluster to four against a cap of three.
   */
  hardViolation(i, blueprint) {
    return this._violation(blueprint, i, this.live, STAGES.length - 1);
  }

  /** Commit what was actually published to the live state. */
  record(i, blueprint, realizedSignature = null) {
    this._commit(this.live, blueprint, i, realizedSignature);
  }

  /** What the realised session looks like on the axes this scheduler controls. */
  realizedReport() {
    const s = this.live;
    return {
      slots: this.count,
      filled: s.placed.filter(Boolean).length,
      distinctBlueprints: s.blueprintUse.size,
      blueprintRepeats: s.repeats,
      distinctPresentations: s.presentationUse.size,
      largestPresentationCluster: Math.max(0, ...s.presentationUse.values()),
      distinctTasks: s.taskUse.size,
      caps: {presentationCluster: this.presentationCap, blueprintRepeat: this.repeatBudget},
      events: this.events
    };
  }
}

/** Capacity of a request, for a refusal that can name what is missing. */
export function capacityFor(bandSchedule, familyPool = null) {
  const need = {};
  for (const b of bandSchedule) need[b] = (need[b] ?? 0) + 1;
  return Object.entries(need).map(([band, slots]) => ({
    band, slots, blueprints: blueprintsForBand(band, familyPool).length
  }));
}

export {BLUEPRINTS};
