// RC2.8-1. The declared taxonomy behind USER_PERCEPTUAL_SIGNATURE.
//
// Two tables, both declared rather than derived, because the thing they have to
// capture is what a READER perceives and no property of the code knows that.
//
// 1. TASK_BY_TARGET — every unknown a template can ask for, mapped onto two
//    orthogonal axes:
//
//      task  the cognitive job. «Recover the original price from the selling
//            price» and «recover the original number from the result of two
//            fractions» are the same job on different material.
//      qty   the CLASS of thing handed back. A rate, a duration, a count, money,
//            a percent, a date, a person, a term of a sequence.
//
//    The template's own label for its unknown is not usable for this. It both
//    splits one task across many names — `position2` … `position7` are one job,
//    read a rank off an ordering — and gives one name to different jobs in
//    different families. A declared table is auditable; a string heuristic over
//    those labels is not.
//
// 2. INFO_STRUCTURE_BY_TEMPLATE — how the information is LAID OUT. This is a
//    real perceptual axis and an independent one: the same equation reads very
//    differently as a list of direct givens, as two configurations to be
//    compared, as a before/after change, or as a set of constraints that only
//    pin the answer jointly. Two questions that agree on everything else and
//    differ here do feel different; two that agree here as well do not.
//
// Adding a template means adding its rows here. `tools/audit/rc28-perceptual.mjs`
// fails on any unknown or any template that reaches it unmapped, so the tables
// cannot silently fall behind the generator.

/** The cognitive jobs. Each is phrased as what the solver has to DO. */
export const TASKS = Object.freeze({
  FORWARD_COMPUTE: 'Evaluate the asked quantity directly from the givens.',
  SCALE_PROPORTIONALLY: 'Carry a known rate or ratio onto a different size of the same situation.',
  COMBINE_PARTS: 'Aggregate several contributors into one total, rate or average.',
  DECOMPOSE_COMBINED: 'Recover an individual contributor from combined observations.',
  REVERSE_RECOVER: 'Recover an original or an input from a stated outcome.',
  REQUIRED_INPUT: 'Find the input needed to reach a stated target.',
  APPLY_SUCCESSIVE_CHANGE: 'Apply two or more changes in order and report where the value lands.',
  MEASURE_CHANGE: 'Express a change between two states as a percentage.',
  SHARE_PROPORTIONALLY: 'Divide a whole between parties in a stated proportion.',
  COMPARE_ALTERNATIVES: 'Compare two plans or arrangements and report the difference.',
  FIND_THRESHOLD: 'Find the smallest or largest value at which a condition turns.',
  FIND_REMAINDER: 'Find what survives after parts are taken away one after another.',
  FIND_COINCIDENCE: 'Find when two processes running at different rates coincide.',
  MEASURE_INTERVAL: 'Measure the distance between two points on a timeline.',
  LOCATE_IN_ORDER: 'Read a rank off an ordering built from relational statements.',
  COUNT_SATISFYING: 'Count how many members satisfy a relation.',
  JUDGE_ENTAILMENT: 'Decide which statement the given relations guarantee.',
  JUDGE_INDETERMINACY: 'Decide which relation the givens leave undetermined.',
  IDENTIFY_MEMBER: 'Find the member of a set that fails the property the others share.',
  CONTINUE_PATTERN: 'Extend a pattern forward.',
  RECOVER_PATTERN_TERM: 'Recover a term that sits inside or before the shown run.',
  DETECT_PATTERN_FAULT: 'Find the term that breaks the pattern.',
  IDENTIFY_RULE: 'Name the rule or the missing operation that generates the run.',
  EXTEND_BY_PROPERTY: 'Find the value that shares the property a shown set has.',
  SELECT_BY_RULE: 'Decide which of several candidates the rule admits at all.'
});

/** The classes of thing an answer can be. */
export const QUANTITIES = Object.freeze([
  'RATE', 'DURATION', 'COUNT', 'MONEY', 'PERCENT', 'QUANTITY', 'AVERAGE',
  'MEMBER_VALUE', 'DATE', 'DISTANCE', 'SPEED', 'AGE', 'PERSON', 'STATEMENT',
  'TERM', 'NUMBER', 'VOLUME', 'RULE'
]);

const t = (task, qty) => Object.freeze({task, qty});

export const TASK_BY_TARGET = Object.freeze({
  // --- averages -------------------------------------------------------------
  averageAfterAddingPair: t('FORWARD_COMPUTE', 'AVERAGE'),
  newAverageAfterAdd: t('FORWARD_COMPUTE', 'AVERAGE'),
  newAverageAfterRemove: t('FORWARD_COMPUTE', 'AVERAGE'),
  newAverageAfterReplace: t('FORWARD_COMPUTE', 'AVERAGE'),
  weightedAverage: t('COMBINE_PARTS', 'AVERAGE'),
  weightedAveragePlusValue: t('COMBINE_PARTS', 'AVERAGE'),
  overlappingValue: t('DECOMPOSE_COMBINED', 'MEMBER_VALUE'),
  firstGroupCount: t('DECOMPOSE_COMBINED', 'COUNT'),
  valueForTargetAverage: t('REQUIRED_INPUT', 'MEMBER_VALUE'),

  // --- speed ----------------------------------------------------------------
  distance: t('FORWARD_COMPUTE', 'DISTANCE'),
  time: t('FORWARD_COMPUTE', 'DURATION'),
  averageSpeed: t('COMBINE_PARTS', 'SPEED'),
  totalDistance: t('COMBINE_PARTS', 'DISTANCE'),
  totalTimeMinutes: t('COMBINE_PARTS', 'DURATION'),
  boatSpeed: t('DECOMPOSE_COMBINED', 'SPEED'),
  currentSpeed: t('DECOMPOSE_COMBINED', 'SPEED'),
  firstLegDistance: t('DECOMPOSE_COMBINED', 'DISTANCE'),
  secondLegHours: t('DECOMPOSE_COMBINED', 'DURATION'),
  distanceFromTimeGap: t('DECOMPOSE_COMBINED', 'DISTANCE'),
  catchupTime: t('FIND_COINCIDENCE', 'DURATION'),
  meetingTime: t('FIND_COINCIDENCE', 'DURATION'),

  // --- unit rate / direct proportion / machines -----------------------------
  scaledOutput: t('SCALE_PROPORTIONALLY', 'QUANTITY'),
  scaledOutputAfterIncrease: t('SCALE_PROPORTIONALLY', 'QUANTITY'),
  scaledOutputFromResource: t('SCALE_PROPORTIONALLY', 'QUANTITY'),
  scaledOutputPlusReserve: t('SCALE_PROPORTIONALLY', 'QUANTITY'),
  scaledOutputPlusFee: t('SCALE_PROPORTIONALLY', 'MONEY'),
  scaledCostAfterIncrease: t('SCALE_PROPORTIONALLY', 'MONEY'),
  outputForNewSetup: t('SCALE_PROPORTIONALLY', 'QUANTITY'),
  requiredInput: t('REQUIRED_INPUT', 'QUANTITY'),
  requiredTime: t('REQUIRED_INPUT', 'DURATION'),
  requiredTimeAfterIncrease: t('REQUIRED_INPUT', 'DURATION'),
  machinesForTarget: t('REQUIRED_INPUT', 'COUNT'),
  originalRate: t('REVERSE_RECOVER', 'RATE'),
  increasedRate: t('DECOMPOSE_COMBINED', 'RATE'),
  firstTypeRate: t('DECOMPOSE_COMBINED', 'RATE'),
  totalAcrossStages: t('COMBINE_PARTS', 'QUANTITY'),
  mixedFleetOutput: t('COMBINE_PARTS', 'QUANTITY'),
  mixedGroupOutput: t('COMBINE_PARTS', 'QUANTITY'),
  mixedPairOutput: t('COMBINE_PARTS', 'QUANTITY'),
  minimumSecondTypeMachines: t('FIND_THRESHOLD', 'COUNT'),
  stoppageHour: t('REVERSE_RECOVER', 'DURATION'),
  boxUnitPrice: t('DECOMPOSE_COMBINED', 'MONEY'),
  replacedVolume: t('REVERSE_RECOVER', 'VOLUME'),
  smallestQuantityWhereSecondPlanWins: t('FIND_THRESHOLD', 'QUANTITY'),
  firstPartnerShare: t('SHARE_PROPORTIONALLY', 'MONEY'),
  secondPartnerShare: t('SHARE_PROPORTIONALLY', 'MONEY'),

  // --- work and combined rate ----------------------------------------------
  jointOutput: t('COMBINE_PARTS', 'QUANTITY'),
  jointTime: t('COMBINE_PARTS', 'DURATION'),
  jointTimeAfterSolo: t('COMBINE_PARTS', 'DURATION'),
  threeTogetherDays: t('COMBINE_PARTS', 'DURATION'),
  soloTimeAfterJoint: t('DECOMPOSE_COMBINED', 'DURATION'),
  secondSoloDays: t('DECOMPOSE_COMBINED', 'DURATION'),
  fasterSoloDays: t('DECOMPOSE_COMBINED', 'DURATION'),
  finalSoloTime: t('DECOMPOSE_COMBINED', 'DURATION'),
  firstPumpSoloHours: t('DECOMPOSE_COMBINED', 'DURATION'),
  secondPumpSoloHours: t('DECOMPOSE_COMBINED', 'DURATION'),
  initialTeamSize: t('DECOMPOSE_COMBINED', 'COUNT'),
  daysForNewCrew: t('FORWARD_COMPUTE', 'DURATION'),
  daysAfterEfficiencyGain: t('FORWARD_COMPUTE', 'DURATION'),
  workersForDeadline: t('REQUIRED_INPUT', 'COUNT'),
  workersForMoreWork: t('REQUIRED_INPUT', 'COUNT'),
  extraWorkers: t('REQUIRED_INPUT', 'COUNT'),
  extraDaysAfterCrewChange: t('COMPARE_ALTERNATIVES', 'DURATION'),
  extraDaysAfterCrewAndEfficiency: t('COMPARE_ALTERNATIVES', 'DURATION'),
  extraDaysAfterTwoStages: t('COMPARE_ALTERNATIVES', 'DURATION'),

  // --- percentages and profit/loss -----------------------------------------
  percentOfValue: t('FORWARD_COMPUTE', 'QUANTITY'),
  originalFromFinal: t('REVERSE_RECOVER', 'MONEY'),
  originalFromTwoChanges: t('REVERSE_RECOVER', 'MONEY'),
  costFromSellPrice: t('REVERSE_RECOVER', 'MONEY'),
  costFromNetFactor: t('REVERSE_RECOVER', 'MONEY'),
  costFromTwoCases: t('DECOMPOSE_COMBINED', 'MONEY'),
  finalAfterTwoChanges: t('APPLY_SUCCESSIVE_CHANGE', 'MONEY'),
  remainingAfterTwoStages: t('APPLY_SUCCESSIVE_CHANGE', 'QUANTITY'),
  sellPriceAfterDiscountAndMarkup: t('APPLY_SUCCESSIVE_CHANGE', 'MONEY'),
  netPercentChange: t('MEASURE_CHANGE', 'PERCENT'),
  profitPercent: t('MEASURE_CHANGE', 'PERCENT'),
  profitPercentOnTotalCost: t('MEASURE_CHANGE', 'PERCENT'),
  lossPercent: t('MEASURE_CHANGE', 'PERCENT'),
  remainderMarginPercent: t('REVERSE_RECOVER', 'PERCENT'),
  netLossOnPair: t('COMBINE_PARTS', 'MONEY'),
  totalCostOfPair: t('COMBINE_PARTS', 'MONEY'),
  firstGroupSize: t('DECOMPOSE_COMBINED', 'COUNT'),
  secondGroupSize: t('DECOMPOSE_COMBINED', 'COUNT'),
  firstComponentVolume: t('DECOMPOSE_COMBINED', 'VOLUME'),

  // --- ratios ---------------------------------------------------------------
  sideA: t('SHARE_PROPORTIONALLY', 'QUANTITY'),
  sideB: t('SHARE_PROPORTIONALLY', 'QUANTITY'),
  sumOfAllThree: t('COMBINE_PARTS', 'QUANTITY'),
  commonTerm: t('DECOMPOSE_COMBINED', 'NUMBER'),
  thirdTerm: t('DECOMPOSE_COMBINED', 'NUMBER'),
  largestSecondShare: t('FIND_THRESHOLD', 'QUANTITY'),
  sumBeforeChange: t('REVERSE_RECOVER', 'QUANTITY'),
  sideABeforeTransfer: t('REVERSE_RECOVER', 'QUANTITY'),
  sideBBeforeTransfer: t('REVERSE_RECOVER', 'QUANTITY'),

  // --- ages -----------------------------------------------------------------
  olderAge: t('DECOMPOSE_COMBINED', 'AGE'),
  youngerAge: t('DECOMPOSE_COMBINED', 'AGE'),
  olderAgeNow: t('DECOMPOSE_COMBINED', 'AGE'),
  youngerAgeNow: t('DECOMPOSE_COMBINED', 'AGE'),
  eldestAfterYears: t('FORWARD_COMPUTE', 'AGE'),
  yearsUntilRatio: t('REQUIRED_INPUT', 'DURATION'),
  ageDifference: t('DECOMPOSE_COMBINED', 'AGE'),

  // --- calendar -------------------------------------------------------------
  todayFromOffset: t('REVERSE_RECOVER', 'DATE'),
  todayFromCompoundOffset: t('REVERSE_RECOVER', 'DATE'),
  todayFromNestedOffset: t('REVERSE_RECOVER', 'DATE'),
  pastDayFromFutureAnchor: t('REVERSE_RECOVER', 'DATE'),
  dayAfterLongOffset: t('FORWARD_COMPUTE', 'DATE'),
  daysBetweenDates: t('MEASURE_INTERVAL', 'DURATION'),
  meetingWeekday: t('FIND_COINCIDENCE', 'DATE'),
  firstSharedWeekday: t('FIND_COINCIDENCE', 'DATE'),

  // --- relational -----------------------------------------------------------
  // Every seat of every ordering is ONE task. `taskOf` routes position2…7 and
  // undeterminedPosition2…8 here rather than the table listing a row per seat.
  position: t('LOCATE_IN_ORDER', 'PERSON'),
  countAbove: t('COUNT_SATISFYING', 'COUNT'),
  guaranteedStatement: t('JUDGE_ENTAILMENT', 'STATEMENT'),
  guaranteedDespiteBranches: t('JUDGE_ENTAILMENT', 'STATEMENT'),
  undeterminedPair: t('JUDGE_INDETERMINACY', 'STATEMENT'),

  // --- odd one out ----------------------------------------------------------
  outlier: t('IDENTIFY_MEMBER', 'NUMBER'),
  sharedProperty: t('IDENTIFY_RULE', 'RULE'),
  setMember: t('EXTEND_BY_PROPERTY', 'NUMBER'),

  // --- sequences ------------------------------------------------------------
  nextTerm: t('CONTINUE_PATTERN', 'TERM'),
  nextTermOfSecondRun: t('CONTINUE_PATTERN', 'TERM'),
  termAfterNext: t('CONTINUE_PATTERN', 'TERM'),
  missingMiddleTerm: t('RECOVER_PATTERN_TERM', 'TERM'),
  previousTerm: t('RECOVER_PATTERN_TERM', 'TERM'),
  secondOfPair: t('RECOVER_PATTERN_TERM', 'TERM'),
  wrongTerm: t('DETECT_PATTERN_FAULT', 'TERM'),
  generatingRule: t('IDENTIFY_RULE', 'RULE'),
  missingOperation: t('IDENTIFY_RULE', 'RULE'),
  sequenceMember: t('SELECT_BY_RULE', 'TERM'),
  termFromStatedRule: t('FORWARD_COMPUTE', 'TERM'),

  // --- fractions ------------------------------------------------------------
  chainResult: t('FORWARD_COMPUTE', 'NUMBER'),
  startNumber: t('REVERSE_RECOVER', 'NUMBER'),
  hiddenFraction: t('REVERSE_RECOVER', 'NUMBER'),
  remainingFraction: t('FIND_REMAINDER', 'NUMBER')
});

/**
 * How the stem lays its information out. Declared per template because only the
 * template knows the shape of the situation it is telling.
 */
export const INFO_STRUCTURE_BY_TEMPLATE = Object.freeze({
  // RC2.9-4. Sequences were all one layout — «a run of terms» — and the layout
  // axis is what the scheduler spreads on, so eighteen sequence ideas sat behind
  // three layout slots and a fifty-question session reached about three of them.
  // Measured across four hundred questions, the family produced eighteen items
  // from three templates and two rule families.
  //
  // «A run of terms» is not one presentation. What a solver READS is the RULE
  // the run obeys: 3، 7، 15، 31 and 2، 6، 12، 20 are a multiply-then-add run and
  // a growing-difference run, and nobody meeting them in one sitting would call
  // them the same information twice. So the layout carries the rule class — the
  // class, not the parameters: ×3+2 and ×3+5 are the same affine recurrence and
  // share a slot, which is what the review asked for.
  SEQ_E_ARITH: 'RUN_CONSTANT_DIFFERENCE',
  SEQ_M_WRONG_TERM: 'RUN_CONSTANT_DIFFERENCE',
  SEQ_E_GEO: 'RUN_CONSTANT_RATIO',
  SEQ_H_ALT_DIV: 'RUN_ALTERNATING_OPERATIONS',
  SEQ_M_ALT_OPS: 'RUN_ALTERNATING_OPERATIONS',
  SEQ_M_INC_DIFF: 'RUN_GROWING_DIFFERENCE',
  SEQ_M_DOUBLE_DIFF: 'RUN_SECOND_DIFFERENCE',
  SEQ_M_INTERLEAVED: 'RUN_TWO_INTERLEAVED',
  SEQ_M_CYCLE3: 'RUN_OPERATION_CYCLE',
  SEQ_M_PAIR_RULE: 'RUN_WITHIN_PAIR',
  SEQ_H_RECURRENCE: 'RUN_SUM_OF_PREVIOUS',
  SEQ_M_LINEAR_RECUR: 'RUN_AFFINE_RECURRENCE',
  SEQ_H_DIGIT_PRODUCT: 'RUN_DIGIT_FUNCTION',
  SEQ_H_DIGIT_SUM: 'RUN_DIGIT_FUNCTION',
  SEQ_H_POW_INDEX: 'RUN_POSITION_DEPENDENT',
  SEQ_H_INDEX_MULT: 'RUN_POSITION_DEPENDENT',

  // RC2.8-5 / RC2.9-4. These four do not print «a run to be continued», so they
  // do not share a layout with the runs above: what the solver reads is a run
  // whose OPTIONS are rules, a rule with no run at all, a run with one of its
  // operations blanked, or a run plus a number to be tested for membership.
  SEQ_M_RULE_ID: 'RUN_WITH_RULE_OPTIONS',
  SEQ_M_RULE_APPLY: 'RULE_STATED_IN_WORDS',
  SEQ_M_MISSING_OP: 'RUN_WITH_HIDDEN_OPERATION',
  SEQ_M_CANDIDATE: 'RUN_WITH_MEMBERSHIP_CHOICE',

  ODD_E_MULT: 'SET_DISPLAY', ODD_E_SQUARES: 'SET_DISPLAY', ODD_M_PRONIC: 'SET_DISPLAY',
  ODD_M_PRIME2: 'SET_DISPLAY', ODD_M_CUBES: 'SET_DISPLAY', ODD_H_SQ_MINUS: 'SET_DISPLAY',
  ODD_H_TRIANGULAR: 'SET_DISPLAY',
  ODD_M_PROPERTY: 'RULE_CHOICE', ODD_M_EXTEND: 'SET_EXTENSION',

  REL_E_BETWEEN: 'RELATIONAL_STATEMENTS', REL_E_CHAIN: 'RELATIONAL_STATEMENTS',
  REL_M_CHAIN6: 'RELATIONAL_STATEMENTS', REL_M_CONFIRM: 'RELATIONAL_STATEMENTS',
  REL_H_GUARANTEE: 'RELATIONAL_STATEMENTS', REL_M_BRANCH_UNRES: 'RELATIONAL_STATEMENTS',
  REL_M_COUNT: 'RELATIONAL_STATEMENTS', REL_H_COUNT_BRANCHED: 'RELATIONAL_STATEMENTS',
  REL_H_POSITION: 'RELATIONAL_STATEMENTS',

  CAL_E_TOM: 'CALENDAR_OFFSET', CAL_E_AFTER: 'CALENDAR_OFFSET',
  CAL_M_COMPOUND: 'CALENDAR_OFFSET', CAL_M_TWO_SHIFT: 'CALENDAR_OFFSET',
  CAL_H_LONG: 'CALENDAR_OFFSET', CAL_H_NESTED: 'CALENDAR_OFFSET',
  CAL_H_MONTH_LENGTH: 'TWO_ENDPOINTS', CAL_H_OFFSET_CYCLES: 'TWO_CYCLES',
  CAL_H_CYCLE_MEET: 'TWO_CYCLES',

  // Two configurations of one situation, side by side.
  MACH_H_TWO_CONFIG: 'TWO_CONFIGURATIONS', MACH_H_TWO_TYPES: 'TWO_CONFIGURATIONS',
  MACH_E_HOURS: 'TWO_CONFIGURATIONS', MACH_M_SUBSET_UP: 'TWO_CONFIGURATIONS',
  MACH_M_NEW_FAST: 'TWO_CONFIGURATIONS', MACH_H_MIN_SECOND_TYPE: 'CONSTRAINT_SET',
  MACH_E_REQUIRED: 'DIRECT_GIVENS', MACH_M_STOP: 'MULTI_STAGE_PROCESS',
  MACH_H_STAGE_UP: 'MULTI_STAGE_PROCESS', MACH_H_STOPPAGE_TIME: 'MULTI_STAGE_PROCESS',

  PROP_E_ITEMS: 'DIRECT_GIVENS', PROP_E_COST: 'DIRECT_GIVENS',
  PROP_M_FRAC_UNIT: 'DIRECT_GIVENS', PROP_M_RECIPE: 'DIRECT_GIVENS',
  PROP_M_MAP: 'DIRECT_GIVENS', PROP_H_COST_PLUS: 'DIRECT_GIVENS',
  PROP_H_COMPOUND: 'MULTI_STAGE_PROCESS', PROP_H_REPLACE: 'BEFORE_AFTER_CHANGE',
  PROP_H_BREAK_EVEN: 'TWO_CONFIGURATIONS', PROP_H_TWO_ITEM_SYSTEM: 'CONSTRAINT_SET',
  PROP_H_CAPITAL_TIME: 'PARTITION_OF_WHOLE',

  RATE_E_DIRECT: 'DIRECT_GIVENS', RATE_E_TIME: 'DIRECT_GIVENS',
  RATE_M_SCALE: 'DIRECT_GIVENS', RATE_M_PERCENT: 'BEFORE_AFTER_CHANGE',
  RATE_H_TARGET: 'BEFORE_AFTER_CHANGE', RATE_H_TWO_PHASE: 'MULTI_STAGE_PROCESS',
  RATE_H_RATE_FROM_GAP: 'TWO_CONFIGURATIONS',

  WORK_E_VOLUME: 'DIRECT_GIVENS', WORK_E_INVERSE: 'DIRECT_GIVENS',
  WORK_M_EFF: 'BEFORE_AFTER_CHANGE', WORK_M_TARGET: 'MULTI_STAGE_PROCESS',
  WORK_M_CHANGE: 'MULTI_STAGE_PROCESS', WORK_H_TWO_STAGE: 'MULTI_STAGE_PROCESS',
  WORK_H_WORKERS_EFF: 'TWO_CONFIGURATIONS', WORK_H_JOINT_SOLO: 'MULTI_STAGE_PROCESS',
  WORK_H_EXTRA_WORKERS: 'MULTI_STAGE_PROCESS', WORK_H_THREE_PAIRS: 'CONSTRAINT_SET',
  WORK_H_SOLO_GAP: 'CONSTRAINT_SET',

  COMB_E_OUTPUT: 'DIRECT_GIVENS', COMB_E_THREE: 'DIRECT_GIVENS',
  COMB_E_TIME: 'DIRECT_GIVENS', COMB_M_TOGETHER_SOLO: 'MULTI_STAGE_PROCESS',
  COMB_M_SOLO_THEN: 'MULTI_STAGE_PROCESS', COMB_H_STAGED: 'MULTI_STAGE_PROCESS',
  COMB_H_TWO_PUMPS: 'CONSTRAINT_SET', COMB_H_TEAM_SIZE: 'CONSTRAINT_SET',

  PCT_E_OF: 'DIRECT_GIVENS', PCT_E_REVERSE_ONE: 'BEFORE_AFTER_CHANGE',
  PCT_M_UNIT_PRICE: 'BEFORE_AFTER_CHANGE', PCT_M_REMAIN: 'MULTI_STAGE_PROCESS',
  PCT_H_CHAIN_VALUE: 'MULTI_STAGE_PROCESS', PCT_M_SUCCESSIVE: 'MULTI_STAGE_PROCESS',
  PCT_H_REVERSE_CHAIN: 'MULTI_STAGE_PROCESS', PCT_H_MIXTURE: 'PARTITION_OF_WHOLE',
  PCT_H_TWO_GROUP_CHANGE: 'CONSTRAINT_SET',

  PL_E_PROFIT: 'DIRECT_GIVENS', PL_E_LOSS: 'DIRECT_GIVENS',
  PL_H_REVERSE: 'BEFORE_AFTER_CHANGE', PL_M_TOTAL_COST: 'PARTITION_OF_WHOLE',
  PL_M_DISC_MARK: 'MULTI_STAGE_PROCESS', PL_H_CHAIN: 'MULTI_STAGE_PROCESS',
  PL_H_TWO_OUTCOMES: 'TWO_CONFIGURATIONS', PL_H_MARKUP_DISCOUNT: 'MULTI_STAGE_PROCESS',
  PL_H_SAME_PRICE_PAIR: 'TWO_CONFIGURATIONS', PL_H_REST_MARGIN: 'PARTITION_OF_WHOLE',

  AVG_E_ADD: 'BEFORE_AFTER_CHANGE', AVG_E_REMOVE: 'BEFORE_AFTER_CHANGE',
  AVG_M_COMBINE: 'PARTITION_OF_WHOLE', AVG_M_ADD_PAIR: 'BEFORE_AFTER_CHANGE',
  AVG_M_REPLACE: 'BEFORE_AFTER_CHANGE', AVG_H_COMB_ADD: 'PARTITION_OF_WHOLE',
  AVG_H_TARGET: 'BEFORE_AFTER_CHANGE', AVG_H_OVERLAP: 'OVERLAPPING_GROUPS',
  AVG_H_SPLIT_SIZE: 'PARTITION_OF_WHOLE',

  // RC2.9-5. Ages had two layouts behind eight templates, and the same throttle
  // applied: thirteen items across four hundred questions, from three templates.
  // The layouts below are the genuinely different INFORMATION STRUCTURES the
  // family builds — what is stated, and at which points in time — not different
  // names or ratio values, which are not layouts and are not counted as any.
  AGE_E_SUM_DIFF: 'PRESENT_SUM_AND_DIFFERENCE',
  AGE_E_MULT_DIFF: 'PRESENT_RATIO_AND_DIFFERENCE',
  AGE_M_FUT_SUM_DIFF: 'PRESENT_DIFFERENCE_FUTURE_SUM',
  AGE_M_RATIO_FUT_SUM: 'PRESENT_RATIO_FUTURE_SUM',
  AGE_M_FUT_RATIO: 'PRESENT_DIFFERENCE_FUTURE_RATIO',
  AGE_H_TWO_TIME: 'RELATION_AT_TWO_TIMES',
  AGE_H_THREE_SIBLINGS: 'THREE_PERSON_SYSTEM',
  AGE_H_PAST_FUT: 'PAST_AND_FUTURE_CONDITIONS',
  AGE_M_WHEN_RATIO: 'PRESENT_AGES_ASK_ELAPSED',
  AGE_M_PAST_RATIO: 'PAST_RELATION_ASK_PRESENT',
  AGE_M_DIFFERENCE_INVARIANT: 'TWO_RATIOS_ASK_INVARIANT',

  SPD_E_DISTANCE: 'DIRECT_GIVENS', SPD_E_TIME: 'DIRECT_GIVENS',
  SPD_M_AVG: 'MULTI_STAGE_PROCESS', SPD_M_TWO_TIME: 'MULTI_STAGE_PROCESS',
  SPD_H_CATCH: 'TWO_MOVING_BODIES', SPD_H_MEET_DELAY: 'TWO_MOVING_BODIES',
  SPD_M_EQUAL_DIST: 'MULTI_STAGE_PROCESS', SPD_H_CURRENT: 'CONSTRAINT_SET',
  SPD_H_LEG_SPLIT: 'MULTI_STAGE_PROCESS', SPD_H_TIME_DIFF: 'TWO_CONFIGURATIONS',

  RAT_E_KNOWN: 'DIRECT_GIVENS', RAT_E_SPLIT: 'PARTITION_OF_WHOLE',
  RAT_M_COMMON_SUM: 'CONSTRAINT_SET', RAT_M_COMMON_DIFF: 'CONSTRAINT_SET',
  RAT_H_TWO_COMB: 'CONSTRAINT_SET', RAT_M_ADD_SIDE: 'BEFORE_AFTER_CHANGE',
  RAT_H_TRANSFER: 'BEFORE_AFTER_CHANGE', RAT_H_MAX_PART: 'CONSTRAINT_SET',

  FRAC_E_2: 'MULTI_STAGE_PROCESS', FRAC_M_3: 'MULTI_STAGE_PROCESS',
  FRAC_H_4: 'MULTI_STAGE_PROCESS', FRAC_M_REMAIN: 'PARTITION_OF_WHOLE'
});
