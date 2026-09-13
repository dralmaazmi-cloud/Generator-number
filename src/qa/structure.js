// RC2.3-1. Structural adjudication: what KIND of reasoning a template demands.
//
// Why this module exists.
//
// RC2.2 made the published band equal the computed complexity score's band, and
// that removed the declared/computed disagreement completely — 100% agreement,
// by construction. The independent Holdout D audit then showed what that number
// was worth: of 82 items released as HARD, 38 were genuinely hard and 44 were
// not. Every key was correct; the arithmetic was sound; the LABEL was not human
// valid.
//
// The cause is that a numeric score, however carefully weighted, ranks items on
// a single axis. Reasoning burden is not one axis. «قطعت سيارة نصف المسافة
// بسرعة 60 والنصف الآخر بسرعة 50» and «عمل جهاز بمعدل 20 لمدة 3 ساعات ثم ارتفع
// معدله 20%» can land within a point of each other and be nothing alike: the
// first hides the asked quantity inside two expressions that must be combined
// into an equation, the second announces every step in the order the sentence
// states them. No weighting of "how many operations, how deep the chain" tells
// those apart, because both have four operations and a chain of three.
//
// So the band is decided by STRUCTURE, and the score is kept as evidence.
//
// The rule, stated so it can be argued with:
//
//   A template is HARD_CAPABLE only if solving it requires at least one of the
//   structural criteria below. Number of operations, number of steps, size of
//   the numbers and depth of a dependency chain never qualify a template on
//   their own — those are workload.
//
// The criteria are the ones the RC2.3 brief names, restated as tests that can be
// applied to a worked solution by a person who has never seen this code.

/**
 * The structural criteria that can qualify a template as HARD.
 *
 * Each is phrased as a question about the SOLUTION, not about the answer and
 * not about the arithmetic.
 */
export const HARD_CRITERIA = Object.freeze({
  SIMULTANEOUS_CONSTRAINTS:
    'Two or more conditions pin the answer jointly and cannot be discharged one after ' +
    'the other. Typically an equation has to be formed because no single given can be ' +
    'evaluated on its own.',
  COMPOSED_INVERSION:
    'The asked quantity sits behind a composition of two or more different ' +
    'transformations and the solver must invert the composition. Inverting ONE ' +
    'transformation is routine and does not qualify.',
  CROSS_PART_INTEGRATION:
    'Information stated in separate parts of the stem — different entities, different ' +
    'time points, different scales — must be brought onto one footing before any step ' +
    'can be taken. Several givens feeding one formula does not qualify.',
  RULE_DISCOVERY:
    'The rule itself is not stated and has to be found among competing candidates, ' +
    'and the search is not settled by the first thing a solver would try.',
  PARTIAL_ORDER_BRANCHING:
    'The reasoning runs over an incomplete order in which some relations stay ' +
    'undetermined, so cases must be considered rather than a single line followed.',
  STRATEGY_SELECTION:
    'More than one solution route is available and the efficient one is not signalled ' +
    'by the surface form of the question — the solver has to choose the frame.'
});

/**
 * Markers of routine structure. These do not by themselves forbid a HARD band —
 * a template can be a fixed pipeline in its arithmetic and still demand a
 * genuine insight to set that pipeline up — but a template carrying only these
 * and no criterion above cannot be HARD.
 */
export const ROUTINE_MARKERS = Object.freeze({
  SINGLE_FORMULA:
    'One named relationship applied once, in the direction the sentence states it.',
  FIXED_PIPELINE:
    'A sequence of routine steps in which each next step is determined by the surface ' +
    'form — "then", "after that", "finally". Adding more stages adds work, not reasoning.',
  REPEATED_OPERATION:
    'One idea applied several times over. Chain length is workload.'
});

const C = HARD_CRITERIA;
const R = ROUTINE_MARKERS;

/**
 * The adjudication. Every template the engine can emit appears exactly once.
 *
 * `band`     the band this template is released at, and the only one.
 * `criteria` the HARD criteria it meets (empty for easy and medium).
 * `routine`  the routine markers it carries.
 * `why`      one line a reviewer can check against the worked solution.
 *
 * On single-band entries: the brief allows a template in more than one band
 * "only if its parameters can genuinely change the reasoning burden". In this
 * engine a template function fixes the SHAPE of its solution and its parameters
 * vary the numbers inside that shape, so no template earns a second band.
 * tests/rc23-structure.test.mjs samples every template and fails if any one of
 * them ever produces a materially different structure across draws, which is
 * what would make a second band legitimate.
 */
export const TEMPLATE_STRUCTURE = Object.freeze({
  // ---------------------------------------------------------------- sequences
  SEQ_E_GEO: {band: 'easy', criteria: [], routine: ['SINGLE_FORMULA'],
    why: 'Constant ratio between adjacent terms; the first thing a solver checks is the answer.'},
  SEQ_E_ARITH: {band: 'easy', criteria: [], routine: ['SINGLE_FORMULA'],
    why: 'Constant difference; found by the first check.'},
  SEQ_M_INTERLEAVED: {band: 'medium', criteria: [], routine: ['FIXED_PIPELINE'],
    why: 'Two strands must be separated first, but "look at every other term" is the standard second move.'},
  SEQ_M_INC_DIFF: {band: 'medium', criteria: [], routine: ['FIXED_PIPELINE'],
    why: 'Differences of differences — the second move in the standard repertoire.'},
  SEQ_M_ALT_OPS: {band: 'medium', criteria: [], routine: ['FIXED_PIPELINE'],
    why: 'Alternating add/multiply; both operands are visible once the alternation is seen.'},
  SEQ_M_DOUBLE_DIFF: {band: 'medium', criteria: [], routine: ['FIXED_PIPELINE'],
    why: 'Doubling differences; one layer below the surface.'},
  SEQ_H_RECURRENCE: {band: 'hard', criteria: ['RULE_DISCOVERY', 'STRATEGY_SELECTION'],
    why: 'RC2.5 promotion, correcting a factual error. RC2.3 ruled this out of HARD because "a solver who tries a+b finds it immediately" — but the template generates a_n = 2a_(n-1) + a_(n-2), not a+b, so the multiplier has to be discovered as well as the shape. Holdout E: both items were judged UNDERclassified, the only two such items in the whole holdout. Not a relaxation of the criteria: RULE_DISCOVERY was already declared and the rationale simply described the wrong template.'},
  // RC2.7-4. The widened rule space. Bands are argued from the KIND of reasoning
  // each asks for, on the same terms the RC2.5 human calibration set.
  SEQ_M_LINEAR_RECUR: {band: 'medium', criteria: [], routine: ['FIXED_PIPELINE'],
    why: 'Multiply-then-add. Once neither the difference nor the ratio is constant, "try a multiplier with an offset" is the next move in the standard repertoire, and the two unknowns fall out of two consecutive terms.'},
  SEQ_M_CYCLE3: {band: 'medium', criteria: [], routine: ['REPEATED_OPERATION'],
    why: 'A three-operation cycle printed twice over. Seeing the repetition is the whole of it; each step is then a single operation.'},
  SEQ_M_PAIR_RULE: {band: 'medium', criteria: [], routine: ['FIXED_PIPELINE'],
    why: 'Terms read two at a time, then one function inside the pair. Both moves are in the repertoire — this is the interleaving move of SEQ_M_INTERLEAVED with a functional relation in place of a second run.'},
  SEQ_H_DIGIT_PRODUCT: {band: 'hard', criteria: ['RULE_DISCOVERY', 'STRATEGY_SELECTION'],
    why: 'The step is built from the DIGITS of the term, so neither differences nor ratios lead anywhere and the solver must abandon the positional repertoire entirely before the rule is even visible. Adjudicated with SEQ_H_DIGIT_SUM, which it does not duplicate: the steps here do not grow monotonically, so no difference pattern competes.'},
  SEQ_M_MISSING_OP: {band: 'medium', criteria: [], routine: ['REPEATED_OPERATION'],
    why: 'RC2.9-4. The two operations are visible in the transitions that are shown; the work is reading which one belongs at the hidden step. A short search, bounded by the run — medium, and what it adds is a question about an OPERATION rather than about a term.'},
  SEQ_M_CANDIDATE: {band: 'medium', criteria: [], routine: ['SINGLE_FORMULA'],
    why: 'RC2.9-4. Find the step, then test membership by division. Two routine moves; the diversity is that nothing is continued — the solver decides whether a number belongs at all.'},
  SEQ_M_RULE_ID: {band: 'medium', criteria: [], routine: ['REPEATED_OPERATION'],
    why: 'RC2.8-5. The rule is not stated and has to be found, but the search is short — differences, then one multiplier — and the offered rules bound it. What it adds is the ANSWER CLASS: the answer is a rule, not a term, which is a job this family could not ask at any band.'},
  SEQ_M_RULE_APPLY: {band: 'medium', criteria: [], routine: ['REPEATED_OPERATION'],
    why: 'RC2.8-5. The rule is GIVEN in words and no run is shown, which inverts the family\u2019s information layout. Applying it is a repeated operation, so medium; the diversity is in the presentation, not in the burden.'},
  SEQ_M_WRONG_TERM: {band: 'medium', criteria: [], routine: ['REPEATED_OPERATION'],
    why: 'The rule is visible from the terms that obey it; the work is then checking each printed term against it, one operation at a time.'},
  // RC2.7-3. The construction forms the RC2.6 inventory found missing: 93% of
  // published items ran forward from givens to a value, and none compared two
  // stated alternatives or asked for a smallest or largest admissible value.
  PROP_H_BREAK_EVEN: {band: 'hard', criteria: ['COMPOSED_INVERSION', 'STRATEGY_SELECTION'],
    why: 'The givens describe two RULES rather than one situation, and what is asked is where they cross. The crossing has to be inverted out of the two cost structures — neither plan\'s cost is asked for — and then the strict inequality separated from the equality, which is a second decision the arithmetic does not make for you. The equal point is a wrong option, not the key.'},
  RAT_H_MAX_PART: {band: 'hard', criteria: ['COMPOSED_INVERSION', 'STRATEGY_SELECTION'],
    why: 'A largest admissible value under a ceiling and a wholeness constraint at once. The solver has to see that the total must be a multiple of the sum of the ratio terms before any arithmetic is possible, then invert the bound onto that multiple. Dividing the ceiling by the ratio directly — the natural first move — is a wrong option.'},
  MACH_H_MIN_SECOND_TYPE: {band: 'hard', criteria: ['COMPOSED_INVERSION', 'SIMULTANEOUS_CONSTRAINTS'],
    why: 'A shortfall has to be derived from what the available machines cannot cover, then inverted onto the second rate, and then rounded UP because a fraction of a machine cannot be hired. The deadline and the wholeness bind at the same time, and rounding down — which the division invites — misses the target.'},
  SEQ_H_POW_INDEX: {band: 'hard', criteria: ['RULE_DISCOVERY', 'STRATEGY_SELECTION'],
    why: 'Nothing works until the solver subtracts each term’s POSITION, which no difference or ratio check suggests; only then do the powers appear.'},
  SEQ_H_ALT_DIV: {band: 'hard', criteria: ['RULE_DISCOVERY', 'STRATEGY_SELECTION'],
    why: 'Two alternating operations where one operand advances between applications — neither the alternation nor the advancing divisor is visible from differences or ratios alone.'},
  SEQ_H_DIGIT_SUM: {band: 'hard', criteria: ['RULE_DISCOVERY', 'STRATEGY_SELECTION'], routine: [],
    why: 'Differences, ratios and second differences all fail; nothing works until the solver stops looking between terms and looks inside one.'},
  SEQ_H_INDEX_MULT: {band: 'hard', criteria: ['RULE_DISCOVERY', 'STRATEGY_SELECTION'], routine: [],
    why: 'The multiplier itself advances by one each step with a constant added, so neither a fixed ratio nor a fixed difference is ever found and the two parts must be identified together.'},

  // ------------------------------------------------------------------- ratios
  RAT_E_KNOWN: {band: 'easy', criteria: [], routine: ['SINGLE_FORMULA'],
    why: 'One part is given; divide and multiply.'},
  RAT_E_SPLIT: {band: 'easy', criteria: [], routine: ['SINGLE_FORMULA'],
    why: 'Simple ratio split — named by the brief as not hard, and it is not medium either: total ÷ parts × share.'},
  RAT_M_COMMON_SUM: {band: 'hard', criteria: ['CROSS_PART_INTEGRATION', 'STRATEGY_SELECTION'],
    why: 'Two ratios stated about different pairs must be put on one scale through the shared term before a sum of two NON-adjacent terms means anything.'},
  RAT_M_COMMON_DIFF: {band: 'hard', criteria: ['CROSS_PART_INTEGRATION', 'STRATEGY_SELECTION'],
    why: 'As RAT_M_COMMON_SUM, with the joint condition given as a difference.'},
  RAT_H_TWO_COMB: {band: 'hard', criteria: ['CROSS_PART_INTEGRATION', 'STRATEGY_SELECTION'],
    why: 'As RAT_M_COMMON_SUM, asking for the term that was not part of the given combination.'},
  RAT_M_ADD_SIDE: {band: 'medium', criteria: [], routine: ['FIXED_PIPELINE'],
    why: 'RC2.5 demotion on the Holdout E blind verdicts. Ratio changed by an addition to one side. Holdout E: 0 of 1 judged hard (same cluster, 0 of 3).'},
  RAT_H_TRANSFER: {band: 'medium', criteria: [], routine: ['FIXED_PIPELINE'],
    why: 'RC2.5 demotion on the Holdout E blind verdicts. Ratio changed by a transfer. Holdout E: 0 of 2 judged hard (cluster ratio_transfer_or_addition, 0 of 3).'},

  // -------------------------------------------------------------- percentages
  PCT_E_OF: {band: 'easy', criteria: [], routine: ['SINGLE_FORMULA'],
    why: 'One percentage of one value.'},
  PCT_E_REVERSE_ONE: {band: 'medium', criteria: [], routine: ['SINGLE_FORMULA'],
    why: 'Straightforward reverse percentage — named by the brief as not hard. One factor, one division.'},
  PCT_M_UNIT_PRICE: {band: 'easy', criteria: [], routine: ['SINGLE_FORMULA'],
    why: 'RC2.5 demotion on the Holdout E blind verdicts. Holdout E: 0 of 2 judged medium.'},
  PCT_M_REMAIN: {band: 'easy', criteria: [], routine: ['SINGLE_FORMULA'],
    why: 'RC2.5 demotion on the Holdout E blind verdicts. Holdout E: 0 of 4 judged medium.'},
  PCT_H_CHAIN_VALUE: {band: 'medium', criteria: [], routine: ['FIXED_PIPELINE', 'REPEATED_OPERATION'],
    why: 'Direct chained percentages — named by the brief as not hard. Two applications of one idea.'},
  PCT_M_SUCCESSIVE: {band: 'medium', criteria: [], routine: ['FIXED_PIPELINE', 'REPEATED_OPERATION'],
    why: 'Chained percentages then one comparison against the original. Four operations, one idea.'},
  PCT_H_REVERSE_CHAIN: {band: 'medium', criteria: [], routine: ['FIXED_PIPELINE'],
    why: 'Two factors multiplied, then one division. The composition is inverted in a single move that the sentence signposts, so it does not reach COMPOSED_INVERSION.'},
  PCT_H_MIXTURE: {band: 'medium', criteria: [], routine: ['FIXED_PIPELINE'],
    why: 'RC2.5 demotion on the Holdout E blind verdicts. Two-solution mixture. Holdout E: 0 of 3 judged hard.'},
  PCT_H_TWO_GROUP_CHANGE: {band: 'hard', criteria: ['SIMULTANEOUS_CONSTRAINTS', 'CROSS_PART_INTEGRATION'], routine: [],
    why: 'A rise in one group and a fall in the other are known only through two totals; neither percentage can be applied until the split is found, and the split follows only from both conditions at once.'},

  // ----------------------------------------------------------------- averages
  AVG_E_ADD: {band: 'easy', criteria: [], routine: ['SINGLE_FORMULA'],
    why: 'Total from average, adjust, re-average. One relationship used twice.'},
  AVG_E_REMOVE: {band: 'easy', criteria: [], routine: ['SINGLE_FORMULA'],
    why: 'As AVG_E_ADD, downward.'},
  AVG_M_COMBINE: {band: 'medium', criteria: [], routine: ['FIXED_PIPELINE'],
    why: 'Two totals reconstructed and pooled; routine averaging, named by the brief as not hard.'},
  AVG_M_ADD_PAIR: {band: 'medium', criteria: [], routine: ['FIXED_PIPELINE'],
    why: 'As AVG_M_COMBINE with a pair given by its own average.'},
  AVG_M_REPLACE: {band: 'medium', criteria: [], routine: ['FIXED_PIPELINE'],
    why: 'Replacement as a delta on the total.'},
  AVG_H_COMB_ADD: {band: 'medium', criteria: [], routine: ['FIXED_PIPELINE', 'REPEATED_OPERATION'],
    why: 'Three totals pooled. One more addition than AVG_M_COMBINE and nothing else.'},
  AVG_H_TARGET: {band: 'medium', criteria: [], routine: ['FIXED_PIPELINE'],
    why: 'Required total minus current total. Works backwards through ONE relationship, which is not COMPOSED_INVERSION.'},
  AVG_H_OVERLAP: {band: 'hard', criteria: ['CROSS_PART_INTEGRATION', 'STRATEGY_SELECTION'], routine: [],
    why: 'Two subsets cover the whole set and share one member; the route to that member is the double count their totals create, which no clause in the stem points at.'},
  AVG_H_SPLIT_SIZE: {band: 'medium', criteria: [], routine: ['FIXED_PIPELINE'],
    why: 'RC2.5 demotion on the Holdout E blind verdicts. Group size from an overall mean and two subgroup means. Holdout E: 0 of 2 judged hard.'},

  // --------------------------------------------------------------------- ages
  AGE_E_SUM_DIFF: {band: 'easy', criteria: [], routine: ['SINGLE_FORMULA'],
    why: 'RC2.5 demotion on the Holdout E blind verdicts. Holdout E: 0 of 1 judged medium. Single verdict, agreeing with the template’s own SINGLE_FORMULA marker.'},
  AGE_E_MULT_DIFF: {band: 'medium', criteria: [], routine: ['SINGLE_FORMULA'],
    why: 'Ratio and difference at one time point; parts arithmetic, no second time point.'},
  AGE_M_FUT_SUM_DIFF: {band: 'medium', criteria: [], routine: ['FIXED_PIPELINE'],
    why: 'Shift the sum back by 2×years, then sum-and-difference. The shift is mechanical and the sentence orders it.'},
  AGE_M_RATIO_FUT_SUM: {band: 'medium', criteria: [], routine: ['FIXED_PIPELINE'],
    why: 'As AGE_M_FUT_SUM_DIFF with a ratio; the two conditions are still evaluated one after the other.'},
  AGE_M_PAST_RATIO: {band: 'medium', criteria: [], routine: ['FIXED_PIPELINE'],
    why: 'RC2.9-5. One linear relation read backwards: the shift comes off both ages before the ratio applies. The inversion is single, so medium — what it adds is the family\u2019s first construction that reasons from the PAST rather than forward or standing still.'},
  AGE_M_DIFFERENCE_INVARIANT: {band: 'medium', criteria: [], routine: ['FIXED_PIPELINE'],
    why: 'RC2.9-5. Two ratios at two times pin both ages, and the answer is the gap rather than either age. Forming and solving one equation is medium; the diversity is that the invariant every other template leans on quietly is here the thing asked for.'},
  AGE_M_WHEN_RATIO: {band: 'medium', criteria: [], routine: ['FIXED_PIPELINE'],
    why: 'RC2.8-4. One linear equation in the elapsed time, formed from two ages and a relation that does not hold yet. The inversion is single, so this is the medium band the other future-relation templates sit in; what it adds is the ANSWER CLASS the family never had — a duration rather than an age.'},
  AGE_M_FUT_RATIO: {band: 'medium', criteria: [], routine: ['FIXED_PIPELINE'],
    why: 'RC2.5 demotion on the Holdout E blind verdicts. Age difference plus a future multiple. Holdout E: 0 of 4 judged hard (cluster age_difference_future_multiple, 0 of 6).'},
  AGE_H_TWO_TIME: {band: 'medium', criteria: [], routine: ['FIXED_PIPELINE'],
    why: 'RC2.5 demotion on the Holdout E blind verdicts. Same shape at two times. Holdout E: 0 of 2 judged hard (cluster age_difference_future_multiple, 0 of 6).'},
  // The consistency check below caught this entry over-claiming, which is what it
  // is for: the two conditions here ARE discharged one after the other — the
  // future sum is walked back to the past and only then is the ratio applied —
  // so SIMULTANEOUS_CONSTRAINTS does not hold. The other two do, and the template
  // stays hard on them.
  AGE_H_THREE_SIBLINGS: {band: 'medium', criteria: [], routine: ['FIXED_PIPELINE'],
    why: 'RC2.5 demotion on the Holdout E blind verdicts. Three linked ages from differences and a sum. NOT sampled by Holdout E; demoted by analogy with every other simultaneous-constraint word problem the reviewers saw (0 of 20 judged hard). Flagged for direct review in the next holdout.'},
  AGE_H_PAST_FUT: {band: 'hard', criteria: ['COMPOSED_INVERSION', 'CROSS_PART_INTEGRATION'],
    why: 'Three time points: a future sum must be carried back through the present to a past ratio before either condition can be used.'},

  // -------------------------------------------------------------------- speed
  SPD_E_DISTANCE: {band: 'easy', criteria: [], routine: ['SINGLE_FORMULA'],
    why: 'distance = speed × time.'},
  SPD_E_TIME: {band: 'easy', criteria: [], routine: ['SINGLE_FORMULA'],
    why: 'time = distance ÷ speed.'},
  SPD_M_AVG: {band: 'medium', criteria: [], routine: ['FIXED_PIPELINE'],
    why: 'Total distance over total time; the trap is real but the route is announced.'},
  SPD_M_TWO_TIME: {band: 'medium', criteria: [], routine: ['FIXED_PIPELINE', 'REPEATED_OPERATION'],
    why: 'Two leg times added, then a unit conversion. One idea twice.'},
  SPD_H_CATCH: {band: 'medium', criteria: [], routine: ['FIXED_PIPELINE'],
    why: 'RC2.5 demotion on the Holdout E blind verdicts. Delayed same-direction catch-up. Holdout E: 0 of 2 judged hard.'},
  SPD_H_MEET_DELAY: {band: 'medium', criteria: [], routine: ['FIXED_PIPELINE'],
    why: 'RC2.5 demotion on the Holdout E blind verdicts. Delayed opposite-direction meeting. Holdout E: 0 of 2 judged hard.'},
  SPD_M_EQUAL_DIST: {band: 'medium', criteria: [], routine: ['FIXED_PIPELINE'],
    why: 'RC2.5 demotion on the Holdout E blind verdicts. Equal distances and a total time. NOT sampled by Holdout E; demoted by analogy with the three kinematics shapes the reviewers did see (0 of 7 judged hard). Flagged for direct review in the next holdout.'},
  WORK_H_THREE_PAIRS: {band: 'hard', criteria: ['CROSS_PART_INTEGRATION', 'STRATEGY_SELECTION'],
    why: 'Only the three PAIRS are timed. No individual rate is given and none follows from a single pair; the unlocking step — that summing the three pair rates counts every worker twice — is nowhere in the stem.'},
  WORK_H_SOLO_GAP: {band: 'hard', criteria: ['SIMULTANEOUS_CONSTRAINTS', 'COMPOSED_INVERSION'],
    why: 'A joint time and a DIFFERENCE between the two solo times. Neither solo time is recoverable alone; the relation has to be written with one unknown and inverted through the reciprocal sum. The same reasoning shape as RATE_H_RATE_FROM_GAP, which the Holdout E reviewers judged hard 5 of 5.'},
  PROP_H_REPLACE: {band: 'hard', criteria: ['SIMULTANEOUS_CONSTRAINTS', 'COMPOSED_INVERSION'],
    why: 'Part of a mixture is drawn off and replaced by one of its own components. The before and after ratios are two conditions on one unknown, and the unknown sits inside a proportion that has to be inverted; the drawn-off amount is itself a mixture, not a pure component, which the stem never says.'},
  PROP_H_CAPITAL_TIME: {band: 'hard', criteria: ['CROSS_PART_INTEGRATION', 'STRATEGY_SELECTION'],
    why: 'A profit split between partners who put in different amounts for different lengths of time. Neither dimension decides the split alone; the shares follow the PRODUCT, and the stem does not say so. Splitting by money alone and by time alone are both on the paper.'},
  CAL_H_MONTH_LENGTH: {band: 'hard', criteria: ['SIMULTANEOUS_CONSTRAINTS', 'STRATEGY_SELECTION'],
    why: 'Two dated weekdays in consecutive months pin the first month LENGTH only modulo seven; the answer is then the one candidate length that fits. Counting forward from either date alone settles nothing.'},
  CAL_H_OFFSET_CYCLES: {band: 'hard', criteria: ['SIMULTANEOUS_CONSTRAINTS', 'STRATEGY_SELECTION'],
    why: 'Two recurring events whose STARTS differ, so the first shared day is not the LCM of the cycles but the first solution of a congruence. Taking the LCM is the natural move and is on the paper. This is the demoted CAL_H_CYCLE_MEET with the coincident start that made it routine removed.'},
  PL_H_SAME_PRICE_PAIR: {band: 'hard', criteria: ['SIMULTANEOUS_CONSTRAINTS', 'STRATEGY_SELECTION'],
    why: 'Two articles at the SAME selling price, one at a gain of g% and one at a loss of g%. The percentages look symmetric but are taken on two different costs, so they do not cancel. "No gain and no loss" is the answer most solvers write and it is on the paper.'},
  PL_H_REST_MARGIN: {band: 'hard', criteria: ['CROSS_PART_INTEGRATION', 'COMPOSED_INVERSION'],
    why: 'Part of a consignment is already sold at a known margin and the OVERALL target margin is given. The target applies to the whole, so the two parts must be brought onto one footing in money before the remainder rate can be recovered — and the recovery is an inversion, not a subtraction of percentages.'},
  // --- RC2.6 additions -----------------------------------------------------
  SPD_H_CURRENT: {band: 'hard', criteria: ['SIMULTANEOUS_CONSTRAINTS', 'COMPOSED_INVERSION'],
    why: 'Two unknowns — the boat and the current — neither of them stated and neither recoverable from one journey. The solver has to see that adding the two derived speeds cancels the current and subtracting them cancels the boat, which the stem does not give.'},
  SPD_H_LEG_SPLIT: {band: 'hard', criteria: ['SIMULTANEOUS_CONSTRAINTS', 'STRATEGY_SELECTION'],
    why: 'A total distance and a total time over two legs whose LENGTHS are never stated. Neither condition alone fixes the split; the pair does. Dividing the total distance by the total time, and halving the distance, are both on the paper and both wrong.'},
  SPD_H_TIME_DIFF: {band: 'medium', criteria: [], routine: ['FIXED_PIPELINE'],
    why: 'RC2.5 demotion on the Holdout E blind verdicts. Same distance, two speeds, a stated time difference. Holdout E: 0 of 3 judged hard.'},

  // ---------------------------------------------------------------- work_time
  WORK_E_VOLUME: {band: 'easy', criteria: [], routine: ['SINGLE_FORMULA'],
    why: 'Workers scale with the work when time is fixed.'},
  WORK_E_INVERSE: {band: 'easy', criteria: [], routine: ['SINGLE_FORMULA'],
    why: 'worker-days is constant; one multiplication and one division.'},
  WORK_M_EFF: {band: 'easy', criteria: [], routine: ['SINGLE_FORMULA'],
    why: 'One efficiency factor, applied inversely to the time.'},
  WORK_M_TARGET: {band: 'medium', criteria: [], routine: ['FIXED_PIPELINE'],
    why: 'worker-days done, remaining, divided by a fixed span. Each step follows the clause before it.'},
  WORK_M_CHANGE: {band: 'medium', criteria: [], routine: ['FIXED_PIPELINE'],
    why: 'As WORK_M_TARGET with the crew size changing; still one stage after another.'},
  WORK_H_TWO_STAGE: {band: 'medium', criteria: [], routine: ['FIXED_PIPELINE', 'REPEATED_OPERATION'],
    why: 'Three stages of the same worker-day accounting. More arithmetic, no new idea.'},
  WORK_H_WORKERS_EFF: {band: 'medium', criteria: [], routine: ['FIXED_PIPELINE'],
    why: 'Worker-day accounting with one efficiency factor inserted. The factor is stated where it applies.'},
  WORK_H_JOINT_SOLO: {band: 'medium', criteria: [], routine: ['FIXED_PIPELINE'],
    why: 'RC2.5 demotion on the Holdout E blind verdicts. Combined work rate minus one solo rate. Holdout E: 0 of 2 judged hard.'},
  WORK_H_EXTRA_WORKERS: {band: 'medium', criteria: [], routine: ['FIXED_PIPELINE'],
    why: 'RC2.5 demotion on the Holdout E blind verdicts. Finish early by adding workers. Holdout E: 0 of 2 judged hard.'},

  // ----------------------------------------------------------------- machines
  MACH_H_TWO_TYPES: {band: 'medium', criteria: [], routine: ['FIXED_PIPELINE'],
    why: 'Two group rates summed, then multiplied by a time.'},
  MACH_E_REQUIRED: {band: 'medium', criteria: [], routine: ['FIXED_PIPELINE'],
    why: 'machine-hour rate, then the count needed. Routine both ways.'},
  MACH_E_HOURS: {band: 'easy', criteria: [], routine: ['SINGLE_FORMULA'],
    why: 'RC2.5 demotion on the Holdout E blind verdicts. Holdout E: 0 of 3 judged medium.'},
  MACH_M_STOP: {band: 'medium', criteria: [], routine: ['FIXED_PIPELINE', 'REPEATED_OPERATION'],
    why: 'Two stages of the same rate × count × hours product.'},
  MACH_M_NEW_FAST: {band: 'medium', criteria: [], routine: ['FIXED_PIPELINE'],
    why: 'Routine rate-after-percentage — named by the brief as not hard.'},
  MACH_M_SUBSET_UP: {band: 'medium', criteria: [], routine: ['FIXED_PIPELINE'],
    why: 'The group splits into upgraded and not, but the split is stated; the rates then add.'},
  MACH_H_STAGE_UP: {band: 'medium', criteria: [], routine: ['FIXED_PIPELINE', 'REPEATED_OPERATION'],
    why: 'MACH_M_SUBSET_UP with a second stage appended. Six operations, still one idea per clause.'},
  MACH_H_TWO_CONFIG: {band: 'medium', criteria: [], routine: ['FIXED_PIPELINE'],
    why: 'RC2.6 demotion, resolved by DIRECT sampling rather than by analogy. What the template actually draws is a 2x2 linear system in two machine rates — the same structure as PROP_H_TWO_ITEM_SYSTEM, which the Holdout E reviewers judged overclassified 4 of 4. Its own single appropriate verdict is one item against that four, and the drawn instances are often easier still: the sampler allowed the two first-type counts to be equal, which collapses the elimination to one subtraction. That degeneracy is now excluded as well.'},
  MACH_H_STOPPAGE_TIME: {band: 'medium', criteria: [], routine: ['FIXED_PIPELINE'],
    why: 'RC2.5 demotion on the Holdout E blind verdicts. Stoppage inferred from a production shortfall. Holdout E: 0 of 4 judged hard.'},

  // -------------------------------------------------------- direct_proportion
  PROP_E_ITEMS: {band: 'easy', criteria: [], routine: ['SINGLE_FORMULA'],
    why: 'Unit value then scale.'},
  PROP_E_COST: {band: 'easy', criteria: [], routine: ['SINGLE_FORMULA'],
    why: 'Unit price then scale, or the same rate read the other way.'},
  PROP_M_FRAC_UNIT: {band: 'easy', criteria: [], routine: ['SINGLE_FORMULA'],
    why: 'Unit weight then scale; the unit value is fractional, which is arithmetic, not reasoning.'},
  PROP_M_RECIPE: {band: 'easy', criteria: [], routine: ['SINGLE_FORMULA'],
    why: 'RC2.5 demotion on the Holdout E blind verdicts. Holdout E: 0 of 1 judged medium. Single verdict, agreeing with the template’s own routine marker.'},
  PROP_M_MAP: {band: 'easy', criteria: [], routine: ['SINGLE_FORMULA'],
    why: 'RC2.5 demotion on the Holdout E blind verdicts. Holdout E: 0 of 4 judged medium.'},
  PROP_H_COMPOUND: {band: 'medium', criteria: [], routine: ['FIXED_PIPELINE'],
    why: 'Unit value, scale, then one reserve factor. Announced in that order.'},
  PROP_H_COST_PLUS: {band: 'easy', criteria: [], routine: ['SINGLE_FORMULA'],
    why: 'RC2.5 demotion on the Holdout E blind verdicts. Holdout E: 0 of 3 judged medium.'},
  PROP_H_TWO_ITEM_SYSTEM: {band: 'medium', criteria: [], routine: ['FIXED_PIPELINE'],
    why: 'RC2.5 demotion on the Holdout E blind verdicts. Two linear equations in two unknowns, solved by substitution. Holdout E: 0 of 4 judged hard.'},

  // ---------------------------------------------------------------- fractions
  FRAC_M_REMAIN: {band: 'medium', criteria: [], routine: ['FIXED_PIPELINE'],
    why: 'RC2.8-4. Two stages, and each one asks for the COMPLEMENT rather than the part, which is a move the chained-fraction templates never make — they are the reason this family was adjudicated easy. Composing remainders is one concept above applying a fraction repeatedly, and no further; medium, not hard.'},
  FRAC_E_2: {band: 'easy', criteria: [], routine: ['REPEATED_OPERATION'],
    why: 'Two successive fractions of one number.'},
  FRAC_M_3: {band: 'easy', criteria: [], routine: ['REPEATED_OPERATION'],
    why: 'Three successive fractions. Chain length is workload.'},
  FRAC_H_4: {band: 'easy', criteria: [], routine: ['REPEATED_OPERATION'],
    why: 'Four successive fractions — the item the Holdout C review first named as scored hard while being one idea repeated.'},

  // ---------------------------------------------------------------- unit_rate
  RATE_E_DIRECT: {band: 'easy', criteria: [], routine: ['SINGLE_FORMULA'],
    why: 'Rate then scale.'},
  RATE_E_TIME: {band: 'easy', criteria: [], routine: ['SINGLE_FORMULA'],
    why: 'Rate then divide.'},
  RATE_M_SCALE: {band: 'easy', criteria: [], routine: ['SINGLE_FORMULA'],
    why: 'Rate then scale, with a consumption unit.'},
  RATE_M_PERCENT: {band: 'easy', criteria: [], routine: ['SINGLE_FORMULA'],
    why: 'RC2.5 demotion on the Holdout E blind verdicts. Holdout E: 0 of 4 judged medium.'},
  RATE_H_TARGET: {band: 'medium', criteria: [], routine: ['FIXED_PIPELINE'],
    why: 'Rate, percentage, then a division. Same pipeline as RATE_M_PERCENT, asked the other way.'},
  RATE_H_TWO_PHASE: {band: 'medium', criteria: [], routine: ['FIXED_PIPELINE', 'REPEATED_OPERATION'],
    why: 'Rate-after-percentage with a second phase appended and the two outputs added.'},
  RATE_H_RATE_FROM_GAP: {band: 'hard', criteria: ['SIMULTANEOUS_CONSTRAINTS', 'STRATEGY_SELECTION'], routine: [],
    why: 'The unknown rate appears in two different times whose difference is what is given, so nothing divides out; the solver must recognise a product of two numbers a known distance apart and search the factor pairs.'},

  // ------------------------------------------------------------ combined_rate
  COMB_E_OUTPUT: {band: 'easy', criteria: [], routine: ['SINGLE_FORMULA'],
    why: 'Rates add, then multiply by time.'},
  COMB_E_THREE: {band: 'easy', criteria: [], routine: ['SINGLE_FORMULA'],
    why: 'Three rates add. One more addend than COMB_E_OUTPUT.'},
  COMB_E_TIME: {band: 'easy', criteria: [], routine: ['SINGLE_FORMULA'],
    why: 'Rates add, then divide into a target.'},
  COMB_M_TOGETHER_SOLO: {band: 'medium', criteria: [], routine: ['FIXED_PIPELINE'],
    why: 'Joint stage, remainder, solo stage. The clauses give the order.'},
  COMB_M_SOLO_THEN: {band: 'medium', criteria: [], routine: ['FIXED_PIPELINE'],
    why: 'As COMB_M_TOGETHER_SOLO, reversed order of stages.'},
  COMB_H_STAGED: {band: 'medium', criteria: [], routine: ['FIXED_PIPELINE', 'REPEATED_OPERATION'],
    why: 'Three stages of the same accounting. The third stage adds one subtraction.'},
  COMB_H_TWO_PUMPS: {band: 'hard', criteria: ['SIMULTANEOUS_CONSTRAINTS', 'COMPOSED_INVERSION'], routine: [],
    why: 'Two unknown rates are pinned by two facts at once — they sum to the joint rate, and a stated pair of solo spans fills the tank — and the answer is a time, so the equation must be formed in rates and inverted back.'},
  COMB_H_TEAM_SIZE: {band: 'medium', criteria: [], routine: ['FIXED_PIPELINE'],
    why: 'RC2.5 demotion on the Holdout E blind verdicts. Team size from an equation with one later joiner. Holdout E: 0 of 3 judged hard.'},

  // --------------------------------------------------------------- relational
  REL_E_BETWEEN: {band: 'easy', criteria: [], routine: ['SINGLE_FORMULA'],
    why: 'Four statements that chain into one total order; read off the position.'},
  REL_E_CHAIN: {band: 'easy', criteria: [], routine: ['FIXED_PIPELINE'],
    why: 'RC2.5 split by chain length. A five-person chain: Holdout E judged both such items easy.'},
  REL_M_CHAIN6: {band: 'medium', criteria: [], routine: ['FIXED_PIPELINE'],
    why: 'RC2.5 split by chain length. A six-person chain, where assembling the order from statements given out of sequence is the work: Holdout E judged both such items medium. The split is by the structural feature that separated them — chain length — not by their numbers.'},
  // RC2.5-2. The relational family is re-adjudicated against the derived
  // graph-complexity conditions in src/qa/partial-order.js, measured on the
  // graphs the templates actually draw rather than on the question they ask.
  //
  // REL_M_CONFIRM and REL_H_GUARANTEE are DEMOTED. Both ask which pair relation
  // is guaranteed, and a guaranteed relation is by definition one with a stated
  // path between its two people — so a single chain always answers the question
  // immediately (H3). Measured over 529 and 506 drawn instances, neither
  // produced a single HARD graph. That is a structural ceiling on the shape, not
  // a sampling accident: no parameter choice makes "find the provable pair"
  // anything other than a routine transitive conclusion.
  REL_M_CONFIRM: {band: 'medium', criteria: [], routine: ['FIXED_PIPELINE'],
    why: 'Asks which statement is guaranteed. A guaranteed relation has a stated path, so one chain proves it: a routine transitive conclusion (0/529 drawn instances met the HARD graph conditions).'},
  REL_H_GUARANTEE: {band: 'medium', criteria: [], routine: ['FIXED_PIPELINE'],
    why: 'Names an open pair, but the answer is still a pair relation proved along one path, so the open branch never has to be reasoned about (0/506 drawn instances met the HARD graph conditions).'},
  REL_M_BRANCH_UNRES: {band: 'hard', criteria: ['SIMULTANEOUS_CONSTRAINTS', 'PARTIAL_ORDER_BRANCHING'],
    why: 'Asks which pair stays undetermined — a question about the SET of consistent orderings, not about any one of them. The sampler now requires H1-H3, so the order is genuinely partial with more than one open pair.'},
  // The count and position questions were each TWO tasks sharing one id and one
  // HARD label. They are split by the feature that separates them.
  REL_M_COUNT: {band: 'medium', criteria: [], routine: ['REPEATED_OPERATION'],
    why: 'Counts who is certainly above a person where all of them lie on ONE root-to-sink path: the chain is followed and the count read off.'},
  REL_H_COUNT_BRANCHED: {band: 'hard', criteria: ['SIMULTANEOUS_CONSTRAINTS', 'PARTIAL_ORDER_BRANCHING'],
    why: 'The same count where it spans two or more branches: no chain contains the answer, so the branches must be held together to separate who is certainly above from who is merely not below.'},
  REL_H_POSITION: {band: 'hard', criteria: ['SIMULTANEOUS_CONSTRAINTS', 'PARTIAL_ORDER_BRANCHING'],
    why: 'Who holds a position on an order that stays partial with more than one open pair and a proof depth of three or more. The routine case — an order the statements settle — is REL_E_CHAIN, so it is not drawn here.'},

  // ----------------------------------------------------------------- calendar
  CAL_E_TOM: {band: 'easy', criteria: [], routine: ['SINGLE_FORMULA'],
    why: 'One day back.'},
  CAL_E_AFTER: {band: 'easy', criteria: [], routine: ['SINGLE_FORMULA'],
    why: 'Two days back.'},
  CAL_M_COMPOUND: {band: 'easy', criteria: [], routine: ['SINGLE_FORMULA'],
    why: 'Two offsets added into one, then applied once.'},
  CAL_M_TWO_SHIFT: {band: 'easy', criteria: [], routine: ['REPEATED_OPERATION'],
    why: 'The same shift twice.'},
  CAL_H_LONG: {band: 'easy', criteria: [], routine: ['SINGLE_FORMULA'],
    why: 'Remainder modulo 7. One idea, whatever the size of the number.'},
  CAL_H_NESTED: {band: 'easy', criteria: [], routine: ['SINGLE_FORMULA'],
    why: 'RC2.5 demotion on the Holdout E blind verdicts. Holdout E: 0 of 5 judged medium; every one was called easy.'},
  CAL_H_CYCLE_MEET: {band: 'medium', criteria: [], routine: ['REPEATED_OPERATION'],
    why: 'RC2.5 demotion on the Holdout E blind verdicts. LCM of two cycles mapped onto a weekday. Holdout E: 0 of 5 items judged genuinely hard; the reviewers called it a routine LCM-recurrence setup.'},

  // -------------------------------------------------------------- odd_one_out
  ODD_E_MULT: {band: 'easy', criteria: [], routine: ['SINGLE_FORMULA'],
    why: 'Multiples of a small number; visible on inspection.'},
  ODD_E_SQUARES: {band: 'easy', criteria: [], routine: ['SINGLE_FORMULA'],
    why: 'Perfect squares; visible on inspection.'},
  ODD_M_PRONIC: {band: 'easy', criteria: [], routine: ['SINGLE_FORMULA'],
    why: 'n(n+1); one multiplication table away from the surface.'},
  ODD_M_PRIME2: {band: 'easy', criteria: [], routine: ['SINGLE_FORMULA'],
    why: 'Twice a prime; one division away.'},
  ODD_M_CUBES: {band: 'easy', criteria: [], routine: ['SINGLE_FORMULA'],
    why: 'Perfect cubes; one familiar list away.'},
  ODD_M_PROPERTY: {band: 'medium', criteria: [], routine: ['SINGLE_FORMULA'],
    why: 'RC2.8-4. The property is not stated and has to be found, but every shown number confirms it, so the search is short. What it adds is the answer class: a property, not a member.'},
  ODD_M_EXTEND: {band: 'medium', criteria: [], routine: ['SINGLE_FORMULA'],
    why: 'RC2.8-4. Find the property, then test it on the options. Two routine moves; the diversity is in the direction of the job, not in its burden.'},
  ODD_H_SQ_MINUS: {band: 'medium', criteria: [], routine: ['FIXED_PIPELINE'],
    why: 'The property is a transformation of the number (n²−1), not the number — a search layer the easy ones do not have.'},
  ODD_H_TRIANGULAR: {band: 'medium', criteria: [], routine: ['FIXED_PIPELINE'],
    why: 'Triangular numbers; a second search layer, but a single stated property once found.'},

  // -------------------------------------------------------------- profit_loss
  PL_E_PROFIT: {band: 'easy', criteria: [], routine: ['SINGLE_FORMULA'],
    why: 'Difference, then a percentage of the cost.'},
  PL_E_LOSS: {band: 'easy', criteria: [], routine: ['SINGLE_FORMULA'],
    why: 'As PL_E_PROFIT, downward.'},
  PL_H_REVERSE: {band: 'easy', criteria: [], routine: ['SINGLE_FORMULA'],
    why: 'RC2.5 demotion on the Holdout E blind verdicts. Holdout E: 0 of 4 judged medium.'},
  PL_M_TOTAL_COST: {band: 'medium', criteria: [], routine: ['FIXED_PIPELINE'],
    why: 'Costs pooled first, then the routine profit percentage.'},
  PL_M_DISC_MARK: {band: 'medium', criteria: [], routine: ['FIXED_PIPELINE'],
    why: 'One discount then one markup, in the order stated.'},
  PL_H_CHAIN: {band: 'medium', criteria: [], routine: ['FIXED_PIPELINE', 'REPEATED_OPERATION'],
    why: 'Direct chained percentages then a comparison — named by the brief as not hard.'},
  PL_H_TWO_OUTCOMES: {band: 'medium', criteria: [], routine: ['FIXED_PIPELINE'],
    why: 'RC2.5 demotion on the Holdout E blind verdicts. Cost recovered from a profit sale and a loss sale. Holdout E: 0 of 2 judged hard.'},
  PL_H_MARKUP_DISCOUNT: {band: 'medium', criteria: [], routine: ['FIXED_PIPELINE'],
    why: 'RC2.5 demotion on the Holdout E blind verdicts. Markup then discount against a target profit. Holdout E: 0 of 2 judged hard.'},
});

const BANDS = ['easy', 'medium', 'hard'];

// Entries above name only what applies to them — a hard template lists criteria
// and a routine one lists markers. Normalised here so every consumer sees both
// keys as arrays and none has to guard.
for (const entry of Object.values(TEMPLATE_STRUCTURE)) {
  entry.criteria = Object.freeze(entry.criteria ?? []);
  entry.routine = Object.freeze(entry.routine ?? []);
  Object.freeze(entry);
}

/** Every template id the adjudication covers. */
export const ADJUDICATED_TEMPLATE_IDS = Object.freeze(Object.keys(TEMPLATE_STRUCTURE));

/**
 * The band a template is released at. Throws for an unknown template rather
 * than guessing: a template that reaches the engine without being adjudicated is
 * a template nobody has looked at, and that is exactly how 44 items came to be
 * published as hard.
 */
export function structuralBandOf(templateId) {
  const entry = TEMPLATE_STRUCTURE[templateId];
  if (!entry) {
    throw Object.assign(
      new Error(`UNADJUDICATED_TEMPLATE: ${templateId} has no structural classification`),
      {code: 'UNADJUDICATED_TEMPLATE', templateId}
    );
  }
  return entry.band;
}

export function isHardCapable(templateId) {
  return TEMPLATE_STRUCTURE[templateId]?.band === 'hard';
}

export function criteriaOf(templateId) {
  return TEMPLATE_STRUCTURE[templateId]?.criteria ?? [];
}

/** Template ids at a band, in declaration order. */
export function templatesAtBand(band) {
  return ADJUDICATED_TEMPLATE_IDS.filter(id => TEMPLATE_STRUCTURE[id].band === band);
}

/**
 * The capability of a family, derived from the adjudication so that the registry
 * cannot drift away from it. `templateIdsByFamily` is supplied by the caller
 * because this module deliberately knows nothing about the family generators.
 */
export function capabilityOf(templateIds) {
  const bands = new Set(templateIds.map(structuralBandOf));
  return BANDS.filter(b => bands.has(b));
}

/**
 * Consistency of the adjudication with what a published question actually shows.
 *
 * This does not re-decide the band — structure is a judgement about the shape of
 * the reasoning and a number cannot make it. What it can do is catch an entry
 * that contradicts the evidence the question carries, which is how a table like
 * this rots. Each check is one-directional and stated as such.
 *
 * @returns {string[]} human-readable contradictions; empty when consistent
 */
export function contradictions(question) {
  const id = question?.metadata?.template_id ?? question?.template_id ?? question?.generator_id;
  const entry = TEMPLATE_STRUCTURE[id];
  if (!entry) return [`${id}: not adjudicated`];
  // Read from the SCORED factor set, which is what a published question carries;
  // `declared` survives only on an unfinalised base, so it is used when present
  // and never required. An earlier version of this function read `declared` off
  // a published question, found undefined everywhere, and reported 172
  // contradictions in 300 items — a check that fires on everything says nothing.
  const f = question?.metadata?.complexity_factors ?? question?.complexityFactors ?? {};
  const declared = f.declared ?? {};
  const out = [];

  const has = c => entry.criteria.includes(c);

  // A claim of simultaneous constraints has to be visible somewhere: the
  // template solves an equation, or it declares conditions that hold at once.
  // Both land in `independentConstraints`.
  if (has('SIMULTANEOUS_CONSTRAINTS')) {
    const simultaneous = (f.independentConstraints ?? 0) >= 1
      || (declared.equationSolving ?? 0) >= 1
      || (declared.conditionCount ?? 0) >= 2;
    if (!simultaneous) out.push(`${id}: claims SIMULTANEOUS_CONSTRAINTS but solves no equation and holds no joint conditions`);
  }
  // Partial-order reasoning shows up as a relation graph. `graphDepth` is folded
  // into `informationIntegration` alongside `conceptCount`, and the relational
  // templates carry graphs of five or more against a concept count of two or
  // three, so four is comfortably below any of them and above every template
  // that has no graph at all.
  if (has('PARTIAL_ORDER_BRANCHING') && (f.informationIntegration ?? 0) < 4
      && (declared.graphDepth ?? 0) < 2) {
    out.push(`${id}: claims PARTIAL_ORDER_BRANCHING but carries no relation graph`);
  }
  // Rule discovery means the rule is not stated, which in this engine means the
  // question shows a stimulus the solver has to interpret.
  if (has('RULE_DISCOVERY') && !(question?.display_expression ?? question?.displayExpression)) {
    out.push(`${id}: claims RULE_DISCOVERY but presents no stimulus to search`);
  }
  // Composed inversion needs at least two distinct transformations to invert.
  if (has('COMPOSED_INVERSION') && (f.transformationDepth ?? 0) < 3) {
    out.push(`${id}: claims COMPOSED_INVERSION but composes fewer than three transformations`);
  }
  // The one check that runs the other way: a hard template carrying nothing but
  // routine markers is exactly the failure this module exists to prevent.
  if (entry.band === 'hard' && entry.criteria.length === 0) {
    out.push(`${id}: released as hard with no structural criterion`);
  }
  return out;
}
