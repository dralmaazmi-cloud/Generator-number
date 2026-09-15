// Shared scaffolding for the family generators.
//
// Two rules the helpers exist to enforce:
//   * a distractor is only ever created through `mk`, which demands a
//     misconception id and the derivation that produced the value (Section 14);
//   * a number and an Arabic unit only ever meet inside `u` / `plain`, which
//     delegate to the central lexicon (Section 12).

import {agreeingAdjective, singularOf, accusativeSingularOf, definitePlural, theSingleUnit, formatNumberWithUnit, unitWordFor, displayNumber, isCountUnit, unitIsFeminine, agreeingPastVerb} from '../arabic/units.js';
import {deriveDependencyDepth, deriveOperationProfile, deriveAffectedStep} from '../qa/complexity.js';
import {partitionByPlausibility} from '../qa/distractor-plausibility.js';
import {Fraction} from '../qa/fraction.js';
import {isKnownMisconception} from '../qa/misconceptions.js';
import {REASON} from '../qa/reasons.js';
import {realizeStem} from '../compose/realize.js';
import {pickScenario, fitJourneyScene} from '../compose/scenarios.js';
import {structuralBandOf} from '../qa/structure.js';

/**
 * Distractor with provenance. Anything else is rejected by makeOptionSet.
 *
 * RC2-012. `reasoningStepAffected` is the 1-based index of the step in the
 * published explanation that this mistake corrupts. It is required of any
 * distractor whose derivation starts from the answer — those have to say which
 * step went wrong, because "key + 1" says nothing — and is welcome on the rest.
 */
// RC2.7-3. The composition helpers. A template calls `sceneFor` to choose the
// situation it is set in and `composeStem` to have its finished clauses joined
// into one of several Arabic sentence structures, in one of several information
// orders. Both draw from FORKS of the template's own RNG, so the choice of
// telling can never shift the parameter draw beneath it: the mathematics of a
// seed is what it was, whatever sentence shape comes out.
export function sceneFor(ctx, frame) {
  return pickScenario(ctx.rng.fork('scenario'), frame);
}

/** RC2.9.3-4. A journey scene that can plausibly travel at these speeds. */
export function journeySceneFor(ctx, scene, ...speeds) {
  return fitJourneyScene(ctx.rng, scene, speeds.filter(Number.isFinite));
}

export function composeStem(ctx, spec) {
  return realizeStem(ctx.rng.fork('stem'), spec);
}

/**
 * RC2.7-3. Re-tell an already-correct stem.
 *
 * Most stems in this generator are written as «fact. fact. ask?» — a sequence of
 * self-contained Arabic sentences ending in the question. Those sentences are
 * exactly the clauses the realization layer wants, so a template that is already
 * grammatical can gain the other sentence structures without being rewritten:
 * split on the full stops, hand the pieces over, and the compact, listed and
 * question-first shapes come out of the same words.
 *
 * A stem that is ONE sentence (its givens folded in behind «إذا») has nothing to
 * split and is returned unchanged, marked `fixed`, rather than being cut at a
 * place that would not survive reordering.
 */
export function composeSentences(ctx, text, opts = {}) {
  const raw = String(text ?? '').trim();
  // The lookbehind is on a full stop followed by space: «1.5» has no space after
  // its point and is never split.
  const parts = raw.split(/(?<=\.)\s+/).map(x => x.trim()).filter(Boolean);
  const ask = parts.pop();
  if (!parts.length || !/[؟?]\s*$/.test(ask)) return {text: raw, structure: 'fixed', order: 'given'};
  return composeStem(ctx, {
    facts: parts.map(x => x.replace(/\.$/, '')),
    ask,
    ...opts
  });
}

export function mk(value, misconceptionId, derivation, reasoningStepAffected = null) {
  if (!isKnownMisconception(misconceptionId)) {
    throw new Error(`Unknown misconception id: ${misconceptionId}`);
  }
  return {value, misconceptionId, derivation: derivation ?? null, reasoningStepAffected};
}

/**
 * Keeps only usable distractors. Beyond sign and finiteness this drops values a
 * learner would never actually write down — a mistake that lands on
 * 35.714286 is not a plausible answer, so it is not a plausible distractor.
 * This is a presentation filter; provenance is enforced separately.
 */
/**
 * Drops distractor values a learner could not arrive at or would never write:
 * a negative or zero count, a non-finite value, or a number needing more
 * decimal places than the answer format shows.
 *
 * RC2-003. These drops used to be silent, and DISTRACTOR_IMPOSSIBLE was a reason
 * code with no emission site anywhere in the engine. This is that code's real
 * meaning, and it is now counted.
 */
export function usable(ctx, distractors, opts = {}) {
  const {allowZero = false, allowNegative = false, maxDecimals = 2} = opts;
  const drop = (d, why) => {
    ctx?.telemetry?.record({
      stage: 'distractor_filter', reasonCode: REASON.DISTRACTOR_IMPOSSIBLE,
      family: ctx.family, seed: ctx.seed, detail: why
    });
    return false;
  };
  return distractors.filter(d => {
    if (!d) return false;
    const v = d.value;
    if (typeof v !== 'number') return true;
    if (!Number.isFinite(v)) return drop(d, 'not finite');
    if (!allowNegative && v < 0) return drop(d, 'negative');
    if (!allowZero && v === 0) return drop(d, 'zero');
    const f = Fraction.from(v);
    if (!f.isExactDecimal || f.decimalPlaces > maxDecimals) return drop(d, 'precision beyond the displayed format');
    return true;
  });
}

/**
 * Rounds a distractor to the precision a learner would actually write down.
 * Only ever applied to a *final* distractor value — never to an intermediate
 * that feeds another calculation (Section 8-A).
 */
export function approx(value, decimals = 1) {
  if (!Number.isFinite(value)) return value;
  const p = 10 ** decimals;
  return Math.round(value * p) / p;
}

/** `12 يومًا`, `يومان`, `3 أيام` — the only way a count meets a unit. */
/**
 * RC2.2-1. Picks a template for a requested band, and fails explicitly when the
 * family holds none at that band.
 *
 * After RC2.2 the pools hold the templates that actually COMPUTE each band, so
 * some families legitimately have none at some bands: odd-one-out has nothing
 * that reaches hard, fractions has nothing above easy. The instruction is to
 * fail rather than quietly hand back an easier item, so that is what happens —
 * loudly, with the family and band named.
 */
export function pickTemplate(rng, list, family, difficulty) {
  if (!Array.isArray(list) || list.length === 0) {
    throw Object.assign(
      new Error(`NO_TEMPLATE_AT_DIFFICULTY: ${family} has no template that computes ${difficulty}`),
      {code: 'NO_TEMPLATE_AT_DIFFICULTY', family, difficulty}
    );
  }
  return rng.pick(list);
}

/**
 * RC2.3-1/2. Picks a template for a band from the STRUCTURAL adjudication.
 *
 * Before this, every family kept its own `difficulty === 'hard' ? [...]` list,
 * so the band a template was published at lived in two places: the pool that
 * selected it and the score that ranked it. That is how PROP_H_COST_PLUS — a
 * unit price, a multiplication and a fixed fee — stayed in a hard pool through
 * three releases.
 *
 * Now the pool IS the adjudication. A family lists what it can build, each entry
 * naming the template id; which of them are eligible for a band is read from
 * src/qa/structure.js and nowhere else. Adding a template to the wrong pool is
 * no longer possible, because there are no pools.
 *
 * @param {object} rng
 * @param {string} family
 * @param {'easy'|'medium'|'hard'} difficulty
 * @param {Array<[string, Function]>} entries  [templateId, generator]
 */
export function bandPool(rng, family, difficulty, entries, pin = null) {
  const eligible = entries.filter(([id]) => structuralBandOf(id) === difficulty);
  // RC2.8-2. The scheduler chooses the semantic blueprint BEFORE anything is
  // rendered, and a blueprint names the template that realises it. Honouring
  // the pin here is what turns "draw and hope" into "draw what was decided":
  // the session no longer discovers what it got by inspecting the finished
  // question. An unavailable pin is a loud failure rather than a silent
  // substitution, because a substituted template is a different blueprint and
  // the scheduler's accounting would be a fiction.
  if (pin) {
    const hit = eligible.find(([id]) => id === pin);
    if (!hit) {
      throw Object.assign(
        new Error(`TEMPLATE_PIN_UNAVAILABLE: ${pin} is not a ${difficulty} template of ${family}`),
        {code: 'TEMPLATE_PIN_UNAVAILABLE', family, difficulty, pin}
      );
    }
    return hit[1];
  }
  return pickTemplate(rng, eligible.map(([, fn]) => fn), family, difficulty);
}

/**
 * RC2.8-2. Which unknown this instance asks for, honouring the blueprint.
 *
 * Several templates can ask for more than one thing — a sequence run can be
 * asked forward, backward or from the middle; a fraction chain can be run
 * forwards or inverted — and which one it asks is the difference between two
 * genuinely different questions. Leaving that to an unconstrained draw meant
 * the scheduler planned one job and the renderer delivered another, so the
 * session's accounting of what it contained was a guess.
 *
 * With no pin this is exactly `rng.pick(options)` and nothing changes. With a
 * pin that the template cannot honour it still draws rather than failing: the
 * scheduler records what was ACTUALLY delivered, so a missed pin costs accuracy
 * of aim, never correctness.
 */
export function askOf(ctx, rng, options) {
  const pin = ctx?.pinTargets;
  if (Array.isArray(pin) && pin.length) {
    const allowed = options.filter(o => pin.includes(o));
    if (allowed.length) return rng.pick(allowed);
  }
  return rng.pick(options);
}

export const u = (n, unitId, ctx = 'nominative') => formatNumberWithUnit(n, unitId, ctx);

/**
 * RC2.9.3-3. A rate in a STEM, with its numerator inflected: «8 قطع/ساعة»,
 * never «8 قطعة/ساعة». The options have been inflected this way since RC2.5-4;
 * the stems were still gluing the numeral to the scene's fixed word. One and
 * two keep the numeral (the lexicon would spell them out, and the text-params
 * guard needs the digit on the page).
 */
export const rateOf = (n, sc) => (Number.isInteger(n) && n >= 3 && sc?.rateUnitId
  ? formatNumberWithUnit(n, sc.rateUnitId)
  : `${displayNumber(n)} ${sc.rateWord}`);

export const adj = (n, unitId, stem, ctx = 'oblique') => agreeingAdjective(n, unitId, stem, ctx);
export const unitWord = unitId => singularOf(unitId);
/** RC2.8-6. Verb agreement with a counted noun, from the lexicon's own gender. */
export const pastVerb = (unitId, masculine, feminine) => agreeingPastVerb(unitId, masculine, feminine);
export const isFeminineUnit = unitId => unitIsFeminine(unitId);
export const unitWordKam = unitId => accusativeSingularOf(unitId);
export const theSingle = unitId => theSingleUnit(unitId);
export const defPlural = unitId => definitePlural(unitId);

/**
 * RC2.1-4 / RC2.3-6. How a percentage RISE is said, so it can only be read one
 * way.
 *
 * «ارتفعت الكفاءة بنسبة 125%» has two readings that are both increases — rose BY
 * 125% (to 225% of before) and rose TO 125% of before — and Arabic gives the
 * reader nothing to choose between them. Below 100% the sentence resolves
 * itself, because "rose to 20%" is not a rise; at and above 100% it does not.
 *
 * RC2.1 attached «من القيمة السابقة» at 100% and up, and the independent Holdout
 * D audit found that still ambiguous, correctly: «بنسبة 125% من القيمة السابقة»
 * names the base without saying whether 125% is the increment or the result.
 * The word carrying the ambiguity is «بنسبة» — a ratio, which a result can be as
 * easily as an increment.
 *
 * «بمقدار» cannot. It says "by an AMOUNT of", which is additive and only
 * additive, so «ارتفعت الكفاءة بمقدار 125% من القيمة السابقة» has one reading at
 * any percentage. That makes the threshold unnecessary as well: one form is used
 * throughout rather than two forms with a rule about when each applies, and the
 * definite «القيمة السابقة» avoids a possessive pronoun that would have to agree
 * with a different noun in each of the eight stems that use this.
 *
 * The contrasting sense — "became 125% OF the previous value" — is not a rise
 * and is not rendered here; tests/rc21-language.test.mjs holds the pair up
 * against each other and checks no stem can be read as the one it does not mean.
 */
/**
 * RC2.8-6. And how a percentage FALL is said, for the same reason.
 *
 * The reverse-percentage stem said «تغيرت قيمة بـزيادة نسبته 20%». Two faults in
 * five words: «بـ» is the form that separates the preposition from a NUMERAL and
 * has no business in front of an Arabic word, and «نسبته» agreed with nothing —
 * «زيادة» is feminine. It is said the same way a rise is said, with the additive
 * «بمقدار» that cannot be read as a result.
 */
export function dropByPercentPhrase(pct) {
  return `بمقدار ${pct}% من القيمة السابقة`;
}

export function riseByPercentPhrase(pct) {
  // No numeral beyond `pct` itself: an earlier attempt appended a computed
  // «(أي صارت 250%…)» and the text-params guard correctly rejected every
  // candidate with pct >= 100, silently removing 38% of a template's parameter
  // space. Naming the base says the same thing and adds no number.
  return `بمقدار ${pct}% من القيمة السابقة`;
}

/**
 * RC2.3-6. A chain of unit fractions, said one step at a time.
 *
 * «ثلث نصف ربع سُدس عدد يساوي 2» stacks four fraction words with nothing between
 * them, and the audit flagged it: a reader has to hold four nested scopes with
 * no syntactic help, which is a reading difficulty and not the reasoning the
 * item is meant to measure. The arithmetic is a chain, so the sentence is
 * written as one — in the same left-to-right order the published solution steps
 * take, so stem and explanation cannot drift apart.
 *
 * @param {string[]} names  fraction words in the order they are applied
 * @param {string}   subject  what the first fraction is taken of, as an idafa
 *                            complement — «العدد 360», «عدد»
 */
/**
 * RC2.8-6. The chain, as a SENTENCE.
 *
 * This used to hand back «سُدس العدد 2880، ثم ثُمن الناتج، ثم خُمس الناتج» — a
 * run of noun phrases with no verb in it, which is not Arabic anybody writes.
 * The verb is the whole fix: «أُخذ سُدس العدد 2880، ثم ثُمن الناتج…» says what
 * happened, and the clauses after it hang off it correctly.
 */
export function fractionChainPhrase(names, subject) {
  const [first, ...rest] = names;
  const steps = rest.map(n => `ثم ${n} الناتج`);
  return `أُخذ ${first} ${subject}` + (steps.length ? `، ${steps.join('، ')}` : '');
}
export const word = (n, unitId) => unitWordFor(n, unitId);
export const num = n => displayNumber(n);

/**
 * A choice formatter bound to one unit.
 *
 * RC2.3-4. The formatter carries the unit it is bound to. That one tag is what
 * lets `buildBase` know, without a template saying so, whether the quantity being
 * asked for is a COUNT — and a mistake that lands on 8.67 workers is not an
 * answer a learner would write to "how many workers", so it can be struck out
 * without solving anything. The unit is in the question, not in the key, so
 * reading it breaks no rule about observing the answer.
 */
export const unitFormat = (unitId, ctx = 'nominative') => {
  const fn = v => formatNumberWithUnit(v, unitId, ctx);
  fn.unitId = unitId;
  return fn;
};

/** Exact value as an display string; throws nothing, rounds only for display. */
export function exact(value) {
  return Fraction.from(value).toDecimalString();
}

/**
 * Section 8-C. A percent factor is a derived value, so the explanation must show
 * where it came from rather than announcing 1.25 out of nowhere.
 */
export function factorLine(pct, direction = 'up', label = 'معامل التغير') {
  const f = direction === 'up'
    ? Fraction.from(1).add(Fraction.from(pct).div(100))
    : Fraction.from(1).sub(Fraction.from(pct).div(100));
  const sign = direction === 'up' ? '+' : '-';
  return {factor: f, text: `${label} = 1 ${sign} ${pct} ÷ 100 = ${f.toDecimalString()}.`};
}

/** Builds the oracle constraint `left == right` from expression trees. */
export const eq = (left, right) => ({op: 'eq', left, right});
export const gt = (left, right) => ({op: 'gt', left, right});
export const gte = (left, right) => ({op: 'gte', left, right});
export const isInt = left => ({op: 'int', left});

/** Expression helpers for oracle statements. */
export const X = 'x';
export const add = (...parts) => ({add: parts});
export const sub = (a, b) => ({sub: [a, b]});
export const mul = (...parts) => ({mul: parts});
export const div = (a, b) => ({div: [a, b]});
export const mod = (a, b) => ({mod: [a, b]});
export const abs = a => ({abs: a});

/**
 * The published shape every family returns. Keeping it in one place means the
 * QA fields cannot be forgotten by one template and present in another.
 */
/**
 * RC2-003. A sampler discarding its own draw and trying again.
 *
 * Families used to recurse directly — `return addOne(ctx)` — which made every
 * internal resample invisible to telemetry. The call is routed through here so
 * the event is counted at the stage where it actually happens.
 */
/**
 * RC2.9.3-2. The first line of a two-equation elimination: scale each
 * statement so one unknown has the same coefficient in both. Where a
 * multiplier is one the statement is kept as it is and said to be — «والثانية
 * في 1» is a formula talking, not a tutor. The line keeps the same operators
 * whichever branch it takes, so the operation profile the identity signatures
 * read from it does not depend on the draw.
 *
 * @param {{d:number,b:number,out1:number,out2:number,what:string}} spec
 *   `d` scales the first statement, `b` the second; `out1`/`out2` are their
 *   totals; `what` names what becomes equal («عدد القطع فيهما»).
 */
export function scaleBothLine({d, b, out1, out2, what}) {
  if (b === 1) {
    return `نضرب العبارة الأولى في ${d} ونُبقي الثانية كما هي ليتساوى ${what}: ${out1} × ${d} = ${out1 * d}.`;
  }
  if (d === 1) {
    return `نُبقي العبارة الأولى كما هي ونضرب الثانية في ${b} ليتساوى ${what}: ${out2} × ${b} = ${out2 * b}.`;
  }
  return `نضرب العبارة الأولى في ${d} والثانية في ${b} ليتساوى ${what}: ${out1} × ${d} = ${out1 * d}، و${out2} × ${b} = ${out2 * b}.`;
}

/**
 * RC2.9.4-B2. How many DISTINCT wrong values a distractor list holds. A template
 * that can collapse two slips onto one value on some draws checks this and
 * resamples, rather than letting the option builder fail the candidate.
 */
export function distinctValues(distractors) {
  return new Set((distractors ?? []).map(d => String(d?.value))).size;
}

export function resample(ctx, fn, reason = REASON.SAMPLER_CONSTRAINT) {
  ctx.telemetry?.familyResample({
    family: ctx.family, templateId: fn.name, reasonCode: reason, seed: ctx.seed
  });
  return fn(ctx);
}

export function buildBase(ctx, spec) {
  const {
    templateId, subskill, difficulty, question, displayExpression = null,
    correct, distractors, format, steps, howToStart, remember, fastMethod,
    estimatedSteps, conceptTags = [], parameters = {}, oracle = null,
    askedUnknown = 'default', stageCount = null, reasoningGraph = null,
    pedagogy = null, ratio = null, realism = null, complexityFactors = {},
    textParams = null, allowedConstants, commutative = null, answerText = null,
    orderInsensitive = null, reasoningPattern = null, metadata = null,
    // RC2.1-3. Optional, and declared by the template because only the template
    // knows what its answer is bounded by. `stimulusIsOptions` marks families
    // whose six options ARE the displayed set, where a wide spread between
    // options is the question rather than a defect.
    answerBounds = null, stimulusIsOptions = false,
    // RC2.3-4. Defaults to whatever the answer's unit implies; a template may
    // override it where its unit is a count but its answer legitimately is not.
    answerIsCount = null,
    // RC2.7-3. What the realization layer chose for this instance. Declared so
    // the diversity measures can separate "a different situation" from "a
    // different sentence shape" from "the facts in a different order" — three
    // things a reader perceives separately and a single signature would blur.
    stemStructure = null, informationOrder = null, entityPattern = null
  } = spec;
  const countedAnswer = answerIsCount === null ? isCountUnit(format?.unitId) : answerIsCount;

  // RC2.1-3. Implausible candidates sink to the back of the list; none is
  // dropped. A template with more candidates than slots stops offering the ones
  // a candidate could strike out without solving, and a template with exactly
  // enough is unaffected — so no template is pushed into resampling, which is
  // what narrows an answer space.
  // RC2.2-5. Where a template did not say which step a wrong option diverges at,
  // derive it from what the derivation and the steps already share. Declared
  // always wins.
  const stepCount = Array.isArray(steps) ? steps.length : 0;
  const linked = (distractors ?? []).map(d => {
    if (!d) return d;
    const declared = d.reasoningStepAffected;
    // A declared index that points past the end of the solution is worse than
    // no index at all — it sends a learner to a step that is not there. Such a
    // pointer is replaced by the derivation rather than trusted.
    const declaredIsUsable = Number.isInteger(declared) && declared >= 0 && declared < stepCount;
    if (declaredIsUsable) return d;
    return {...d, reasoningStepAffected: deriveAffectedStep(d.derivation, steps)};
  });

  const ordered = (() => {
    const {plausible, implausible} = partitionByPlausibility(linked, {
      bounds: answerBounds, stimulusIsOptions, answerIsCount: countedAnswer
    });
    if (implausible.length && ctx?.telemetry) {
      for (const d of implausible) {
        ctx.telemetry.record({
          stage: 'distractor_plausibility', reasonCode: REASON.IMPLAUSIBLE_DISTRACTOR_DEMOTED,
          family: ctx.family, templateId, seed: ctx.seed,
          detail: `${d.misconceptionId}=${d.value} ${countedAnswer && !Number.isInteger(d.value)
            ? `is not a whole ${format?.unitId}`
            : `outside ${JSON.stringify(answerBounds?.between)}`}`
        });
      }
    }
    // Marked, not dropped: makeOptionSet prefers the plausible ones and still
    // falls back to these, so no template is pushed into resampling.
    return [...plausible.map(d => ({...d, implausible: false})),
      ...implausible.map(d => ({...d, implausible: true}))];
  })();

  return {
    id: makeStableId(templateId, ctx.seed),
    generator_id: templateId,
    template_id: templateId,
    seed: ctx.seed,
    family: ctx.family,
    family_ar: ctx.family_ar,
    category: ctx.category,
    subskill,
    difficulty: difficulty ?? ctx.difficulty,
    question,
    display_expression: displayExpression,
    correct,
    distractors: ordered,
    format,
    explanation: {
      how_to_start: howToStart,
      steps,
      answer: answerText ?? `الإجابة الصحيحة: ${format(correct)}.`,
      fast_method: fastMethod ?? null,
      remember
    },
    estimated_steps: estimatedSteps,
    concept_tags: conceptTags,
    engine_version: ctx.engineVersion,
    parameters,
    oracle,
    askedUnknown,
    stageCount,
    reasoningGraph,
    pedagogy,
    ratio,
    realism,
    // RC2.2-2. The factors the scorer actually consumes, assembled here so no
    // template has to be edited and none can inflate its own difficulty.
    //
    // Templates keep declaring what they know about themselves; what changed is
    // that the CHAIN is measured once, from the solution, instead of arriving
    // four times over as reasoningTransformations + stageCount + dependencyDepth
    // + arithmeticBurden. Those four rose together on the same steps, which is
    // why Holdout C released 82 items as hard and an independent review found 43
    // of them were not.
    complexityFactors: (() => {
      const declared = complexityFactors ?? {};
      const depth = deriveDependencyDepth(steps);
      const ops = deriveOperationProfile(steps);
      return {
        // Genuine reasoning burden.
        dependencyDepth: depth === null ? (declared.dependencyDepth ?? 0) : depth,
        // Distinct kinds of transformation composed. Working backwards and
        // converting units are transformations in their own right and are not
        // visible as operators, so they are added to what the steps show.
        transformationDepth: (ops ? ops.transformationDepth : (declared.reasoningTransformations ?? 0))
          + (declared.reverseReasoning ?? 0) + (declared.unitConversion ?? 0),
        // Conditions that must hold at once rather than in sequence.
        independentConstraints: (declared.conditionCount ?? 0) + (declared.equationSolving ?? 0),
        // Separate given information held together at once.
        informationIntegration: (declared.conceptCount ?? 0) + (declared.graphDepth ?? 0),
        ruleSearchDepth: declared.ruleSearchDepth ?? 0,
        // Workload: how many routine operations, regardless of how few ideas.
        arithmeticWorkload: ops ? ops.arithmeticWorkload : (declared.arithmeticBurden ?? 0),
        // Kept for evidence and for the audit trail; not scored.
        declared
      };
    })(),
    // RC2.3-4. The unit the answer counts, when it counts indivisible things.
    // Published as evidence so the option-quality claim can be checked from
    // outside the engine without re-deriving which templates those are.
    answerCountUnit: countedAnswer ? (format?.unitId ?? null) : null,
    // RC2.5-4. The unit the ANSWER is rendered in, whatever kind of quantity it
    // is. `answerCountUnit` is null for a rate, which is exactly the case the
    // rate-unit rule has to inspect, so the raw id is published too.
    answerUnitId: format?.unitId ?? null,
    // RC2.6-3. What SITUATION this template tells and which way its reasoning
    // runs. Declared by the template because only the template knows; defaulted
    // so an undeclared template is still measurable rather than invisible.
    // RC2.8-1. A template that tells no particular situation reports that it
    // tells no particular situation.
    //
    // This used to default to the template id, so `scenario_signature` read
    // «ratios/RAT_H_TRANSFER» and the count of distinct SCENARIOS was really a
    // count of distinct TEMPLATES — a measure that rose every time a template
    // was added, whether or not a reader met a new situation. Templates that do
    // draw a scene still declare one; the rest say `unnamed`, which is the truth
    // and which the novelty cap can then bind meaningfully.
    scenario: spec.scenario ?? 'unnamed',
    direction: spec.direction ?? 'forward',
    // RC2.7-3.
    stemStructure: stemStructure ?? 'fixed',
    informationOrder: informationOrder ?? 'given',
    entityPattern: entityPattern ?? null,
    textParams,
    allowedConstants,
    commutative,
    // RC2-022: named parameters whose ORDER is presentation only. They are
    // sorted for the semantic fingerprint, never dropped: the content still
    // distinguishes questions.
    orderInsensitive,
    // RC2-023: the reasoning pattern, where the template has one that is
    // independent of its incidental numeric values.
    reasoningPattern,
    metadata
  };
}

function makeStableId(prefix, seed) {
  const safe = String(seed).replace(/[^a-zA-Z0-9_-]/g, '').slice(-18) || 'seed';
  return `${prefix}-${safe}`;
}
