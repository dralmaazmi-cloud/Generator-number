// RC2.8-2. The blueprint catalogue: the SEMANTIC space the scheduler chooses
// from, before a single number, name or sentence is drawn.
//
// The defect this exists to fix.
//
// Generation used to run one way round: draw a question, look at what came out,
// and reject it if it repeated something. On a 100-question sitting that took
// 621 candidates to publish 100 — 521 rejections — and the repetition still got
// through, because a rejection-driven loop has no idea what it is LOOKING for.
// It cannot aim at the thing the session is short of; it can only refuse what it
// happens to be handed, and when the retry budget runs out it takes whatever is
// left. That is why the repetition concentrated in the last third of a session.
//
// So the order is inverted. A blueprint — family, band, template, the task it
// asks, the way it lays its information out — is chosen FIRST, against what the
// session already contains, and the renderer is then told which blueprint to
// realise. Numbers, names, scenario and wording are drawn afterwards and cannot
// change the blueprint.
//
// GENERATED FILE. Rebuild with:
//     node tools/audit/rc28-build-blueprints.mjs
// tests/rc28-blueprints.test.mjs re-derives it against the live engine on every
// run, so a template that changes which tasks it asks, or that stops being
// reachable at its band, fails the test rather than silently leaving the
// scheduler planning against a fiction.
//
// `targets` lists the unknowns a template was observed to ask for that task. It
// is evidence for the reader of this file, not an input to selection.

/**
 * @typedef {object} Blueprint
 * @property {string} templateId  which template realises it
 * @property {string} family
 * @property {'easy'|'medium'|'hard'} band
 * @property {string} task        the normalised job and answer class
 * @property {string} info        how the information is laid out
 * @property {string[]} targets   the unknowns observed for this task
 */

/** @type {Blueprint[]} */
export const BLUEPRINTS = Object.freeze([
  {templateId: 'AGE_E_MULT_DIFF', family: 'ages', band: 'medium', task: 'DECOMPOSE_COMBINED/AGE', info: 'CONSTRAINT_SET', targets: ['youngerAge']},
  {templateId: 'AGE_E_SUM_DIFF', family: 'ages', band: 'easy', task: 'DECOMPOSE_COMBINED/AGE', info: 'CONSTRAINT_SET', targets: ['olderAge']},
  {templateId: 'AGE_H_PAST_FUT', family: 'ages', band: 'hard', task: 'DECOMPOSE_COMBINED/AGE', info: 'TWO_TIME_POINTS', targets: ['olderAgeNow']},
  {templateId: 'AGE_H_THREE_SIBLINGS', family: 'ages', band: 'medium', task: 'FORWARD_COMPUTE/AGE', info: 'CONSTRAINT_SET', targets: ['eldestAfterYears']},
  {templateId: 'AGE_H_TWO_TIME', family: 'ages', band: 'medium', task: 'DECOMPOSE_COMBINED/AGE', info: 'TWO_TIME_POINTS', targets: ['youngerAgeNow']},
  {templateId: 'AGE_M_FUT_RATIO', family: 'ages', band: 'medium', task: 'DECOMPOSE_COMBINED/AGE', info: 'TWO_TIME_POINTS', targets: ['youngerAgeNow']},
  {templateId: 'AGE_M_FUT_SUM_DIFF', family: 'ages', band: 'medium', task: 'DECOMPOSE_COMBINED/AGE', info: 'TWO_TIME_POINTS', targets: ['olderAgeNow']},
  {templateId: 'AGE_M_RATIO_FUT_SUM', family: 'ages', band: 'medium', task: 'DECOMPOSE_COMBINED/AGE', info: 'TWO_TIME_POINTS', targets: ['olderAgeNow']},
  {templateId: 'AGE_M_WHEN_RATIO', family: 'ages', band: 'medium', task: 'REQUIRED_INPUT/DURATION', info: 'TWO_TIME_POINTS', targets: ['yearsUntilRatio']},
  {templateId: 'AVG_E_ADD', family: 'averages', band: 'easy', task: 'FORWARD_COMPUTE/AVERAGE', info: 'BEFORE_AFTER_CHANGE', targets: ['newAverageAfterAdd']},
  {templateId: 'AVG_E_REMOVE', family: 'averages', band: 'easy', task: 'FORWARD_COMPUTE/AVERAGE', info: 'BEFORE_AFTER_CHANGE', targets: ['newAverageAfterRemove']},
  {templateId: 'AVG_H_COMB_ADD', family: 'averages', band: 'medium', task: 'COMBINE_PARTS/AVERAGE', info: 'PARTITION_OF_WHOLE', targets: ['weightedAveragePlusValue']},
  {templateId: 'AVG_H_OVERLAP', family: 'averages', band: 'hard', task: 'DECOMPOSE_COMBINED/MEMBER_VALUE', info: 'OVERLAPPING_GROUPS', targets: ['overlappingValue']},
  {templateId: 'AVG_H_SPLIT_SIZE', family: 'averages', band: 'medium', task: 'DECOMPOSE_COMBINED/COUNT', info: 'PARTITION_OF_WHOLE', targets: ['firstGroupCount']},
  {templateId: 'AVG_H_TARGET', family: 'averages', band: 'medium', task: 'REQUIRED_INPUT/MEMBER_VALUE', info: 'BEFORE_AFTER_CHANGE', targets: ['valueForTargetAverage']},
  {templateId: 'AVG_M_ADD_PAIR', family: 'averages', band: 'medium', task: 'FORWARD_COMPUTE/AVERAGE', info: 'BEFORE_AFTER_CHANGE', targets: ['averageAfterAddingPair']},
  {templateId: 'AVG_M_COMBINE', family: 'averages', band: 'medium', task: 'COMBINE_PARTS/AVERAGE', info: 'PARTITION_OF_WHOLE', targets: ['weightedAverage']},
  {templateId: 'AVG_M_REPLACE', family: 'averages', band: 'medium', task: 'FORWARD_COMPUTE/AVERAGE', info: 'BEFORE_AFTER_CHANGE', targets: ['newAverageAfterReplace']},
  {templateId: 'CAL_E_AFTER', family: 'calendar', band: 'easy', task: 'REVERSE_RECOVER/DATE', info: 'CALENDAR_OFFSET', targets: ['todayFromOffset']},
  {templateId: 'CAL_E_TOM', family: 'calendar', band: 'easy', task: 'REVERSE_RECOVER/DATE', info: 'CALENDAR_OFFSET', targets: ['todayFromOffset']},
  {templateId: 'CAL_H_CYCLE_MEET', family: 'calendar', band: 'medium', task: 'FIND_COINCIDENCE/DATE', info: 'TWO_CYCLES', targets: ['meetingWeekday']},
  {templateId: 'CAL_H_LONG', family: 'calendar', band: 'easy', task: 'FORWARD_COMPUTE/DATE', info: 'CALENDAR_OFFSET', targets: ['dayAfterLongOffset']},
  {templateId: 'CAL_H_MONTH_LENGTH', family: 'calendar', band: 'hard', task: 'MEASURE_INTERVAL/DURATION', info: 'TWO_ENDPOINTS', targets: ['daysBetweenDates']},
  {templateId: 'CAL_H_NESTED', family: 'calendar', band: 'easy', task: 'REVERSE_RECOVER/DATE', info: 'CALENDAR_OFFSET', targets: ['todayFromNestedOffset']},
  {templateId: 'CAL_H_OFFSET_CYCLES', family: 'calendar', band: 'hard', task: 'FIND_COINCIDENCE/DATE', info: 'TWO_CYCLES', targets: ['firstSharedWeekday']},
  {templateId: 'CAL_M_COMPOUND', family: 'calendar', band: 'easy', task: 'REVERSE_RECOVER/DATE', info: 'CALENDAR_OFFSET', targets: ['todayFromCompoundOffset']},
  {templateId: 'CAL_M_TWO_SHIFT', family: 'calendar', band: 'easy', task: 'REVERSE_RECOVER/DATE', info: 'CALENDAR_OFFSET', targets: ['pastDayFromFutureAnchor']},
  {templateId: 'COMB_E_OUTPUT', family: 'combined_rate', band: 'easy', task: 'COMBINE_PARTS/QUANTITY', info: 'DIRECT_GIVENS', targets: ['jointOutput']},
  {templateId: 'COMB_E_THREE', family: 'combined_rate', band: 'easy', task: 'COMBINE_PARTS/QUANTITY', info: 'DIRECT_GIVENS', targets: ['jointOutput']},
  {templateId: 'COMB_E_TIME', family: 'combined_rate', band: 'easy', task: 'COMBINE_PARTS/DURATION', info: 'DIRECT_GIVENS', targets: ['jointTime']},
  {templateId: 'COMB_H_STAGED', family: 'combined_rate', band: 'medium', task: 'DECOMPOSE_COMBINED/DURATION', info: 'MULTI_STAGE_PROCESS', targets: ['finalSoloTime']},
  {templateId: 'COMB_H_TEAM_SIZE', family: 'combined_rate', band: 'medium', task: 'DECOMPOSE_COMBINED/COUNT', info: 'CONSTRAINT_SET', targets: ['initialTeamSize']},
  {templateId: 'COMB_H_TWO_PUMPS', family: 'combined_rate', band: 'hard', task: 'DECOMPOSE_COMBINED/DURATION', info: 'CONSTRAINT_SET', targets: ['firstPumpSoloHours', 'secondPumpSoloHours']},
  {templateId: 'COMB_M_SOLO_THEN', family: 'combined_rate', band: 'medium', task: 'COMBINE_PARTS/DURATION', info: 'MULTI_STAGE_PROCESS', targets: ['jointTimeAfterSolo']},
  {templateId: 'COMB_M_TOGETHER_SOLO', family: 'combined_rate', band: 'medium', task: 'DECOMPOSE_COMBINED/DURATION', info: 'MULTI_STAGE_PROCESS', targets: ['soloTimeAfterJoint']},
  {templateId: 'PROP_E_COST', family: 'direct_proportion', band: 'easy', task: 'REQUIRED_INPUT/QUANTITY', info: 'DIRECT_GIVENS', targets: ['requiredInput']},
  {templateId: 'PROP_E_COST', family: 'direct_proportion', band: 'easy', task: 'SCALE_PROPORTIONALLY/QUANTITY', info: 'DIRECT_GIVENS', targets: ['scaledOutput']},
  {templateId: 'PROP_E_ITEMS', family: 'direct_proportion', band: 'easy', task: 'REQUIRED_INPUT/QUANTITY', info: 'DIRECT_GIVENS', targets: ['requiredInput']},
  {templateId: 'PROP_E_ITEMS', family: 'direct_proportion', band: 'easy', task: 'SCALE_PROPORTIONALLY/QUANTITY', info: 'DIRECT_GIVENS', targets: ['scaledOutput']},
  {templateId: 'PROP_H_BREAK_EVEN', family: 'direct_proportion', band: 'hard', task: 'FIND_THRESHOLD/QUANTITY', info: 'TWO_CONFIGURATIONS', targets: ['smallestQuantityWhereSecondPlanWins']},
  {templateId: 'PROP_H_CAPITAL_TIME', family: 'direct_proportion', band: 'hard', task: 'SHARE_PROPORTIONALLY/MONEY', info: 'PARTITION_OF_WHOLE', targets: ['firstPartnerShare', 'secondPartnerShare']},
  {templateId: 'PROP_H_COMPOUND', family: 'direct_proportion', band: 'medium', task: 'SCALE_PROPORTIONALLY/QUANTITY', info: 'MULTI_STAGE_PROCESS', targets: ['scaledOutputPlusReserve']},
  {templateId: 'PROP_H_COST_PLUS', family: 'direct_proportion', band: 'easy', task: 'SCALE_PROPORTIONALLY/MONEY', info: 'DIRECT_GIVENS', targets: ['scaledOutputPlusFee']},
  {templateId: 'PROP_H_REPLACE', family: 'direct_proportion', band: 'hard', task: 'REVERSE_RECOVER/VOLUME', info: 'BEFORE_AFTER_CHANGE', targets: ['replacedVolume']},
  {templateId: 'PROP_H_TWO_ITEM_SYSTEM', family: 'direct_proportion', band: 'medium', task: 'DECOMPOSE_COMBINED/MONEY', info: 'CONSTRAINT_SET', targets: ['boxUnitPrice']},
  {templateId: 'PROP_M_FRAC_UNIT', family: 'direct_proportion', band: 'easy', task: 'SCALE_PROPORTIONALLY/QUANTITY', info: 'DIRECT_GIVENS', targets: ['scaledOutput']},
  {templateId: 'PROP_M_MAP', family: 'direct_proportion', band: 'easy', task: 'SCALE_PROPORTIONALLY/QUANTITY', info: 'DIRECT_GIVENS', targets: ['scaledOutput']},
  {templateId: 'PROP_M_RECIPE', family: 'direct_proportion', band: 'easy', task: 'SCALE_PROPORTIONALLY/QUANTITY', info: 'DIRECT_GIVENS', targets: ['scaledOutput', 'scaledOutputFromResource']},
  {templateId: 'FRAC_E_2', family: 'fractions', band: 'easy', task: 'FORWARD_COMPUTE/NUMBER', info: 'MULTI_STAGE_PROCESS', targets: ['chainResult']},
  {templateId: 'FRAC_E_2', family: 'fractions', band: 'easy', task: 'REVERSE_RECOVER/NUMBER', info: 'MULTI_STAGE_PROCESS', targets: ['startNumber']},
  {templateId: 'FRAC_H_4', family: 'fractions', band: 'easy', task: 'FORWARD_COMPUTE/NUMBER', info: 'MULTI_STAGE_PROCESS', targets: ['chainResult']},
  {templateId: 'FRAC_H_4', family: 'fractions', band: 'easy', task: 'REVERSE_RECOVER/NUMBER', info: 'MULTI_STAGE_PROCESS', targets: ['hiddenFraction', 'startNumber']},
  {templateId: 'FRAC_M_3', family: 'fractions', band: 'easy', task: 'FORWARD_COMPUTE/NUMBER', info: 'MULTI_STAGE_PROCESS', targets: ['chainResult']},
  {templateId: 'FRAC_M_3', family: 'fractions', band: 'easy', task: 'REVERSE_RECOVER/NUMBER', info: 'MULTI_STAGE_PROCESS', targets: ['hiddenFraction', 'startNumber']},
  {templateId: 'FRAC_M_REMAIN', family: 'fractions', band: 'medium', task: 'FIND_REMAINDER/NUMBER', info: 'PARTITION_OF_WHOLE', targets: ['remainingFraction']},
  {templateId: 'MACH_E_HOURS', family: 'machines', band: 'easy', task: 'SCALE_PROPORTIONALLY/QUANTITY', info: 'TWO_CONFIGURATIONS', targets: ['outputForNewSetup']},
  {templateId: 'MACH_E_REQUIRED', family: 'machines', band: 'medium', task: 'REQUIRED_INPUT/COUNT', info: 'DIRECT_GIVENS', targets: ['machinesForTarget']},
  {templateId: 'MACH_H_MIN_SECOND_TYPE', family: 'machines', band: 'hard', task: 'FIND_THRESHOLD/COUNT', info: 'CONSTRAINT_SET', targets: ['minimumSecondTypeMachines']},
  {templateId: 'MACH_H_STAGE_UP', family: 'machines', band: 'medium', task: 'COMBINE_PARTS/QUANTITY', info: 'MULTI_STAGE_PROCESS', targets: ['totalAcrossStages']},
  {templateId: 'MACH_H_STOPPAGE_TIME', family: 'machines', band: 'medium', task: 'REVERSE_RECOVER/DURATION', info: 'MULTI_STAGE_PROCESS', targets: ['stoppageHour']},
  {templateId: 'MACH_H_TWO_CONFIG', family: 'machines', band: 'medium', task: 'DECOMPOSE_COMBINED/RATE', info: 'TWO_CONFIGURATIONS', targets: ['firstTypeRate']},
  {templateId: 'MACH_H_TWO_TYPES', family: 'machines', band: 'medium', task: 'COMBINE_PARTS/QUANTITY', info: 'TWO_CONFIGURATIONS', targets: ['mixedFleetOutput']},
  {templateId: 'MACH_M_NEW_FAST', family: 'machines', band: 'medium', task: 'COMBINE_PARTS/QUANTITY', info: 'TWO_CONFIGURATIONS', targets: ['mixedPairOutput']},
  {templateId: 'MACH_M_STOP', family: 'machines', band: 'medium', task: 'COMBINE_PARTS/QUANTITY', info: 'MULTI_STAGE_PROCESS', targets: ['totalAcrossStages']},
  {templateId: 'MACH_M_SUBSET_UP', family: 'machines', band: 'medium', task: 'COMBINE_PARTS/QUANTITY', info: 'TWO_CONFIGURATIONS', targets: ['mixedGroupOutput']},
  {templateId: 'ODD_E_MULT', family: 'odd_one_out', band: 'easy', task: 'IDENTIFY_MEMBER/NUMBER', info: 'SET_DISPLAY', targets: ['outlier']},
  {templateId: 'ODD_E_SQUARES', family: 'odd_one_out', band: 'easy', task: 'IDENTIFY_MEMBER/NUMBER', info: 'SET_DISPLAY', targets: ['outlier']},
  {templateId: 'ODD_H_SQ_MINUS', family: 'odd_one_out', band: 'medium', task: 'IDENTIFY_MEMBER/NUMBER', info: 'SET_DISPLAY', targets: ['outlier']},
  {templateId: 'ODD_H_TRIANGULAR', family: 'odd_one_out', band: 'medium', task: 'IDENTIFY_MEMBER/NUMBER', info: 'SET_DISPLAY', targets: ['outlier']},
  {templateId: 'ODD_M_CUBES', family: 'odd_one_out', band: 'easy', task: 'IDENTIFY_MEMBER/NUMBER', info: 'SET_DISPLAY', targets: ['outlier']},
  {templateId: 'ODD_M_EXTEND', family: 'odd_one_out', band: 'medium', task: 'EXTEND_BY_PROPERTY/NUMBER', info: 'SET_EXTENSION', targets: ['setMember']},
  {templateId: 'ODD_M_PRIME2', family: 'odd_one_out', band: 'easy', task: 'IDENTIFY_MEMBER/NUMBER', info: 'SET_DISPLAY', targets: ['outlier']},
  {templateId: 'ODD_M_PRONIC', family: 'odd_one_out', band: 'easy', task: 'IDENTIFY_MEMBER/NUMBER', info: 'SET_DISPLAY', targets: ['outlier']},
  {templateId: 'ODD_M_PROPERTY', family: 'odd_one_out', band: 'medium', task: 'IDENTIFY_RULE/RULE', info: 'RULE_CHOICE', targets: ['sharedProperty']},
  {templateId: 'PCT_E_OF', family: 'percentages', band: 'easy', task: 'FORWARD_COMPUTE/QUANTITY', info: 'DIRECT_GIVENS', targets: ['percentOfValue']},
  {templateId: 'PCT_E_REVERSE_ONE', family: 'percentages', band: 'medium', task: 'REVERSE_RECOVER/MONEY', info: 'BEFORE_AFTER_CHANGE', targets: ['originalFromFinal']},
  {templateId: 'PCT_H_CHAIN_VALUE', family: 'percentages', band: 'medium', task: 'APPLY_SUCCESSIVE_CHANGE/MONEY', info: 'MULTI_STAGE_PROCESS', targets: ['finalAfterTwoChanges']},
  {templateId: 'PCT_H_MIXTURE', family: 'percentages', band: 'medium', task: 'DECOMPOSE_COMBINED/VOLUME', info: 'PARTITION_OF_WHOLE', targets: ['firstComponentVolume']},
  {templateId: 'PCT_H_REVERSE_CHAIN', family: 'percentages', band: 'medium', task: 'REVERSE_RECOVER/MONEY', info: 'MULTI_STAGE_PROCESS', targets: ['originalFromTwoChanges']},
  {templateId: 'PCT_H_TWO_GROUP_CHANGE', family: 'percentages', band: 'hard', task: 'DECOMPOSE_COMBINED/COUNT', info: 'CONSTRAINT_SET', targets: ['firstGroupSize', 'secondGroupSize']},
  {templateId: 'PCT_M_REMAIN', family: 'percentages', band: 'easy', task: 'APPLY_SUCCESSIVE_CHANGE/QUANTITY', info: 'MULTI_STAGE_PROCESS', targets: ['remainingAfterTwoStages']},
  {templateId: 'PCT_M_SUCCESSIVE', family: 'percentages', band: 'medium', task: 'MEASURE_CHANGE/PERCENT', info: 'MULTI_STAGE_PROCESS', targets: ['netPercentChange']},
  {templateId: 'PCT_M_UNIT_PRICE', family: 'percentages', band: 'easy', task: 'SCALE_PROPORTIONALLY/MONEY', info: 'BEFORE_AFTER_CHANGE', targets: ['scaledCostAfterIncrease']},
  {templateId: 'PL_E_LOSS', family: 'profit_loss', band: 'easy', task: 'MEASURE_CHANGE/PERCENT', info: 'DIRECT_GIVENS', targets: ['lossPercent']},
  {templateId: 'PL_E_PROFIT', family: 'profit_loss', band: 'easy', task: 'MEASURE_CHANGE/PERCENT', info: 'DIRECT_GIVENS', targets: ['profitPercent']},
  {templateId: 'PL_H_CHAIN', family: 'profit_loss', band: 'medium', task: 'MEASURE_CHANGE/PERCENT', info: 'MULTI_STAGE_PROCESS', targets: ['netPercentChange']},
  {templateId: 'PL_H_MARKUP_DISCOUNT', family: 'profit_loss', band: 'medium', task: 'REVERSE_RECOVER/MONEY', info: 'MULTI_STAGE_PROCESS', targets: ['costFromNetFactor']},
  {templateId: 'PL_H_REST_MARGIN', family: 'profit_loss', band: 'hard', task: 'REVERSE_RECOVER/PERCENT', info: 'PARTITION_OF_WHOLE', targets: ['remainderMarginPercent']},
  {templateId: 'PL_H_REVERSE', family: 'profit_loss', band: 'easy', task: 'REVERSE_RECOVER/MONEY', info: 'BEFORE_AFTER_CHANGE', targets: ['costFromSellPrice']},
  {templateId: 'PL_H_SAME_PRICE_PAIR', family: 'profit_loss', band: 'hard', task: 'COMBINE_PARTS/MONEY', info: 'TWO_CONFIGURATIONS', targets: ['netLossOnPair', 'totalCostOfPair']},
  {templateId: 'PL_H_TWO_OUTCOMES', family: 'profit_loss', band: 'medium', task: 'DECOMPOSE_COMBINED/MONEY', info: 'TWO_CONFIGURATIONS', targets: ['costFromTwoCases']},
  {templateId: 'PL_M_DISC_MARK', family: 'profit_loss', band: 'medium', task: 'APPLY_SUCCESSIVE_CHANGE/MONEY', info: 'MULTI_STAGE_PROCESS', targets: ['sellPriceAfterDiscountAndMarkup']},
  {templateId: 'PL_M_TOTAL_COST', family: 'profit_loss', band: 'medium', task: 'MEASURE_CHANGE/PERCENT', info: 'PARTITION_OF_WHOLE', targets: ['profitPercentOnTotalCost']},
  {templateId: 'RAT_E_KNOWN', family: 'ratios', band: 'easy', task: 'SHARE_PROPORTIONALLY/QUANTITY', info: 'DIRECT_GIVENS', targets: ['sideA', 'sideB']},
  {templateId: 'RAT_E_SPLIT', family: 'ratios', band: 'easy', task: 'SHARE_PROPORTIONALLY/QUANTITY', info: 'PARTITION_OF_WHOLE', targets: ['sideA', 'sideB']},
  {templateId: 'RAT_H_MAX_PART', family: 'ratios', band: 'hard', task: 'FIND_THRESHOLD/QUANTITY', info: 'CONSTRAINT_SET', targets: ['largestSecondShare']},
  {templateId: 'RAT_H_TRANSFER', family: 'ratios', band: 'medium', task: 'REVERSE_RECOVER/QUANTITY', info: 'BEFORE_AFTER_CHANGE', targets: ['sideABeforeTransfer', 'sideBBeforeTransfer']},
  {templateId: 'RAT_H_TWO_COMB', family: 'ratios', band: 'hard', task: 'DECOMPOSE_COMBINED/NUMBER', info: 'CONSTRAINT_SET', targets: ['thirdTerm']},
  {templateId: 'RAT_M_ADD_SIDE', family: 'ratios', band: 'medium', task: 'REVERSE_RECOVER/QUANTITY', info: 'BEFORE_AFTER_CHANGE', targets: ['sumBeforeChange']},
  {templateId: 'RAT_M_COMMON_DIFF', family: 'ratios', band: 'hard', task: 'COMBINE_PARTS/QUANTITY', info: 'CONSTRAINT_SET', targets: ['sumOfAllThree']},
  {templateId: 'RAT_M_COMMON_SUM', family: 'ratios', band: 'hard', task: 'DECOMPOSE_COMBINED/NUMBER', info: 'CONSTRAINT_SET', targets: ['commonTerm']},
  {templateId: 'REL_E_BETWEEN', family: 'relational', band: 'easy', task: 'LOCATE_IN_ORDER/PERSON', info: 'RELATIONAL_STATEMENTS', targets: ['position2', 'position3', 'position4']},
  {templateId: 'REL_E_CHAIN', family: 'relational', band: 'easy', task: 'LOCATE_IN_ORDER/PERSON', info: 'RELATIONAL_STATEMENTS', targets: ['position2', 'position4']},
  {templateId: 'REL_H_COUNT_BRANCHED', family: 'relational', band: 'hard', task: 'COUNT_SATISFYING/COUNT', info: 'RELATIONAL_STATEMENTS', targets: ['countAbove']},
  {templateId: 'REL_H_GUARANTEE', family: 'relational', band: 'medium', task: 'JUDGE_ENTAILMENT/STATEMENT', info: 'RELATIONAL_STATEMENTS', targets: ['guaranteedDespiteBranches']},
  {templateId: 'REL_H_POSITION', family: 'relational', band: 'hard', task: 'LOCATE_IN_ORDER/PERSON', info: 'RELATIONAL_STATEMENTS', targets: ['position3', 'position4', 'position5', 'position6', 'position7', 'position8', 'undeterminedPosition2', 'undeterminedPosition3', 'undeterminedPosition7', 'undeterminedPosition8', 'undeterminedPosition9']},
  {templateId: 'REL_M_BRANCH_UNRES', family: 'relational', band: 'hard', task: 'JUDGE_INDETERMINACY/STATEMENT', info: 'RELATIONAL_STATEMENTS', targets: ['undeterminedPair']},
  {templateId: 'REL_M_CHAIN6', family: 'relational', band: 'medium', task: 'LOCATE_IN_ORDER/PERSON', info: 'RELATIONAL_STATEMENTS', targets: ['position2', 'position3', 'position4', 'position5']},
  {templateId: 'REL_M_CONFIRM', family: 'relational', band: 'medium', task: 'JUDGE_ENTAILMENT/STATEMENT', info: 'RELATIONAL_STATEMENTS', targets: ['guaranteedStatement']},
  {templateId: 'REL_M_COUNT', family: 'relational', band: 'medium', task: 'COUNT_SATISFYING/COUNT', info: 'RELATIONAL_STATEMENTS', targets: ['countAbove']},
  {templateId: 'SEQ_E_ARITH', family: 'sequences', band: 'easy', task: 'CONTINUE_PATTERN/TERM', info: 'SEQUENCE_DISPLAY', targets: ['nextTerm']},
  {templateId: 'SEQ_E_ARITH', family: 'sequences', band: 'easy', task: 'RECOVER_PATTERN_TERM/TERM', info: 'SEQUENCE_DISPLAY', targets: ['missingMiddleTerm', 'previousTerm']},
  {templateId: 'SEQ_E_GEO', family: 'sequences', band: 'easy', task: 'CONTINUE_PATTERN/TERM', info: 'SEQUENCE_DISPLAY', targets: ['nextTerm']},
  {templateId: 'SEQ_E_GEO', family: 'sequences', band: 'easy', task: 'RECOVER_PATTERN_TERM/TERM', info: 'SEQUENCE_DISPLAY', targets: ['missingMiddleTerm', 'previousTerm']},
  {templateId: 'SEQ_H_ALT_DIV', family: 'sequences', band: 'hard', task: 'CONTINUE_PATTERN/TERM', info: 'SEQUENCE_DISPLAY', targets: ['nextTerm']},
  {templateId: 'SEQ_H_DIGIT_PRODUCT', family: 'sequences', band: 'hard', task: 'CONTINUE_PATTERN/TERM', info: 'SEQUENCE_DISPLAY', targets: ['nextTerm']},
  {templateId: 'SEQ_H_DIGIT_SUM', family: 'sequences', band: 'hard', task: 'CONTINUE_PATTERN/TERM', info: 'SEQUENCE_DISPLAY', targets: ['nextTerm', 'termAfterNext']},
  {templateId: 'SEQ_H_INDEX_MULT', family: 'sequences', band: 'hard', task: 'CONTINUE_PATTERN/TERM', info: 'SEQUENCE_DISPLAY', targets: ['nextTerm', 'termAfterNext']},
  {templateId: 'SEQ_H_POW_INDEX', family: 'sequences', band: 'hard', task: 'CONTINUE_PATTERN/TERM', info: 'SEQUENCE_DISPLAY', targets: ['nextTerm', 'termAfterNext']},
  {templateId: 'SEQ_H_POW_INDEX', family: 'sequences', band: 'hard', task: 'RECOVER_PATTERN_TERM/TERM', info: 'SEQUENCE_DISPLAY', targets: ['previousTerm']},
  {templateId: 'SEQ_H_RECURRENCE', family: 'sequences', band: 'hard', task: 'CONTINUE_PATTERN/TERM', info: 'SEQUENCE_DISPLAY', targets: ['nextTerm']},
  {templateId: 'SEQ_H_RECURRENCE', family: 'sequences', band: 'hard', task: 'RECOVER_PATTERN_TERM/TERM', info: 'SEQUENCE_DISPLAY', targets: ['missingMiddleTerm']},
  {templateId: 'SEQ_M_ALT_OPS', family: 'sequences', band: 'medium', task: 'CONTINUE_PATTERN/TERM', info: 'SEQUENCE_DISPLAY', targets: ['nextTerm']},
  {templateId: 'SEQ_M_CYCLE3', family: 'sequences', band: 'medium', task: 'CONTINUE_PATTERN/TERM', info: 'SEQUENCE_DISPLAY', targets: ['nextTerm']},
  {templateId: 'SEQ_M_DOUBLE_DIFF', family: 'sequences', band: 'medium', task: 'CONTINUE_PATTERN/TERM', info: 'SEQUENCE_DISPLAY', targets: ['nextTerm']},
  {templateId: 'SEQ_M_DOUBLE_DIFF', family: 'sequences', band: 'medium', task: 'RECOVER_PATTERN_TERM/TERM', info: 'SEQUENCE_DISPLAY', targets: ['missingMiddleTerm']},
  {templateId: 'SEQ_M_INC_DIFF', family: 'sequences', band: 'medium', task: 'CONTINUE_PATTERN/TERM', info: 'SEQUENCE_DISPLAY', targets: ['nextTerm']},
  {templateId: 'SEQ_M_INC_DIFF', family: 'sequences', band: 'medium', task: 'RECOVER_PATTERN_TERM/TERM', info: 'SEQUENCE_DISPLAY', targets: ['missingMiddleTerm']},
  {templateId: 'SEQ_M_INTERLEAVED', family: 'sequences', band: 'medium', task: 'CONTINUE_PATTERN/TERM', info: 'SEQUENCE_DISPLAY', targets: ['nextTermOfSecondRun']},
  {templateId: 'SEQ_M_LINEAR_RECUR', family: 'sequences', band: 'medium', task: 'CONTINUE_PATTERN/TERM', info: 'SEQUENCE_DISPLAY', targets: ['nextTerm', 'termAfterNext']},
  {templateId: 'SEQ_M_LINEAR_RECUR', family: 'sequences', band: 'medium', task: 'RECOVER_PATTERN_TERM/TERM', info: 'SEQUENCE_DISPLAY', targets: ['previousTerm']},
  {templateId: 'SEQ_M_PAIR_RULE', family: 'sequences', band: 'medium', task: 'RECOVER_PATTERN_TERM/TERM', info: 'SEQUENCE_DISPLAY', targets: ['secondOfPair']},
  {templateId: 'SEQ_M_RULE_APPLY', family: 'sequences', band: 'medium', task: 'FORWARD_COMPUTE/TERM', info: 'RULE_STATED', targets: ['termFromStatedRule']},
  {templateId: 'SEQ_M_RULE_ID', family: 'sequences', band: 'medium', task: 'IDENTIFY_RULE/RULE', info: 'RULE_CHOICE', targets: ['generatingRule']},
  {templateId: 'SEQ_M_WRONG_TERM', family: 'sequences', band: 'medium', task: 'DETECT_PATTERN_FAULT/TERM', info: 'SEQUENCE_DISPLAY', targets: ['wrongTerm']},
  {templateId: 'SPD_E_DISTANCE', family: 'speed', band: 'easy', task: 'FORWARD_COMPUTE/DISTANCE', info: 'DIRECT_GIVENS', targets: ['distance']},
  {templateId: 'SPD_E_TIME', family: 'speed', band: 'easy', task: 'FORWARD_COMPUTE/DURATION', info: 'DIRECT_GIVENS', targets: ['time']},
  {templateId: 'SPD_H_CATCH', family: 'speed', band: 'medium', task: 'FIND_COINCIDENCE/DURATION', info: 'TWO_MOVING_BODIES', targets: ['catchupTime']},
  {templateId: 'SPD_H_CURRENT', family: 'speed', band: 'hard', task: 'DECOMPOSE_COMBINED/SPEED', info: 'CONSTRAINT_SET', targets: ['boatSpeed', 'currentSpeed']},
  {templateId: 'SPD_H_LEG_SPLIT', family: 'speed', band: 'hard', task: 'DECOMPOSE_COMBINED/DISTANCE', info: 'MULTI_STAGE_PROCESS', targets: ['firstLegDistance']},
  {templateId: 'SPD_H_LEG_SPLIT', family: 'speed', band: 'hard', task: 'DECOMPOSE_COMBINED/DURATION', info: 'MULTI_STAGE_PROCESS', targets: ['secondLegHours']},
  {templateId: 'SPD_H_MEET_DELAY', family: 'speed', band: 'medium', task: 'FIND_COINCIDENCE/DURATION', info: 'TWO_MOVING_BODIES', targets: ['meetingTime']},
  {templateId: 'SPD_H_TIME_DIFF', family: 'speed', band: 'medium', task: 'DECOMPOSE_COMBINED/DISTANCE', info: 'TWO_CONFIGURATIONS', targets: ['distanceFromTimeGap']},
  {templateId: 'SPD_M_AVG', family: 'speed', band: 'medium', task: 'COMBINE_PARTS/SPEED', info: 'MULTI_STAGE_PROCESS', targets: ['averageSpeed']},
  {templateId: 'SPD_M_EQUAL_DIST', family: 'speed', band: 'medium', task: 'COMBINE_PARTS/DISTANCE', info: 'MULTI_STAGE_PROCESS', targets: ['totalDistance']},
  {templateId: 'SPD_M_TWO_TIME', family: 'speed', band: 'medium', task: 'COMBINE_PARTS/DURATION', info: 'MULTI_STAGE_PROCESS', targets: ['totalTimeMinutes']},
  {templateId: 'RATE_E_DIRECT', family: 'unit_rate', band: 'easy', task: 'SCALE_PROPORTIONALLY/QUANTITY', info: 'DIRECT_GIVENS', targets: ['scaledOutput']},
  {templateId: 'RATE_E_TIME', family: 'unit_rate', band: 'easy', task: 'REQUIRED_INPUT/DURATION', info: 'DIRECT_GIVENS', targets: ['requiredTime']},
  {templateId: 'RATE_H_RATE_FROM_GAP', family: 'unit_rate', band: 'hard', task: 'DECOMPOSE_COMBINED/RATE', info: 'TWO_CONFIGURATIONS', targets: ['increasedRate']},
  {templateId: 'RATE_H_RATE_FROM_GAP', family: 'unit_rate', band: 'hard', task: 'REVERSE_RECOVER/RATE', info: 'TWO_CONFIGURATIONS', targets: ['originalRate']},
  {templateId: 'RATE_H_TARGET', family: 'unit_rate', band: 'medium', task: 'REQUIRED_INPUT/DURATION', info: 'BEFORE_AFTER_CHANGE', targets: ['requiredTimeAfterIncrease']},
  {templateId: 'RATE_H_TWO_PHASE', family: 'unit_rate', band: 'medium', task: 'COMBINE_PARTS/QUANTITY', info: 'MULTI_STAGE_PROCESS', targets: ['totalAcrossStages']},
  {templateId: 'RATE_M_PERCENT', family: 'unit_rate', band: 'easy', task: 'SCALE_PROPORTIONALLY/QUANTITY', info: 'BEFORE_AFTER_CHANGE', targets: ['scaledOutputAfterIncrease']},
  {templateId: 'RATE_M_SCALE', family: 'unit_rate', band: 'easy', task: 'SCALE_PROPORTIONALLY/QUANTITY', info: 'DIRECT_GIVENS', targets: ['scaledOutput']},
  {templateId: 'WORK_E_INVERSE', family: 'work_time', band: 'easy', task: 'FORWARD_COMPUTE/DURATION', info: 'DIRECT_GIVENS', targets: ['daysForNewCrew']},
  {templateId: 'WORK_E_VOLUME', family: 'work_time', band: 'easy', task: 'REQUIRED_INPUT/COUNT', info: 'DIRECT_GIVENS', targets: ['workersForMoreWork']},
  {templateId: 'WORK_H_EXTRA_WORKERS', family: 'work_time', band: 'medium', task: 'REQUIRED_INPUT/COUNT', info: 'MULTI_STAGE_PROCESS', targets: ['extraWorkers']},
  {templateId: 'WORK_H_JOINT_SOLO', family: 'work_time', band: 'medium', task: 'DECOMPOSE_COMBINED/DURATION', info: 'MULTI_STAGE_PROCESS', targets: ['secondSoloDays']},
  {templateId: 'WORK_H_SOLO_GAP', family: 'work_time', band: 'hard', task: 'DECOMPOSE_COMBINED/DURATION', info: 'CONSTRAINT_SET', targets: ['fasterSoloDays']},
  {templateId: 'WORK_H_THREE_PAIRS', family: 'work_time', band: 'hard', task: 'COMBINE_PARTS/DURATION', info: 'CONSTRAINT_SET', targets: ['threeTogetherDays']},
  {templateId: 'WORK_H_TWO_STAGE', family: 'work_time', band: 'medium', task: 'COMPARE_ALTERNATIVES/DURATION', info: 'MULTI_STAGE_PROCESS', targets: ['extraDaysAfterTwoStages']},
  {templateId: 'WORK_H_WORKERS_EFF', family: 'work_time', band: 'medium', task: 'COMPARE_ALTERNATIVES/DURATION', info: 'TWO_CONFIGURATIONS', targets: ['extraDaysAfterCrewAndEfficiency']},
  {templateId: 'WORK_M_CHANGE', family: 'work_time', band: 'medium', task: 'COMPARE_ALTERNATIVES/DURATION', info: 'MULTI_STAGE_PROCESS', targets: ['extraDaysAfterCrewChange']},
  {templateId: 'WORK_M_EFF', family: 'work_time', band: 'easy', task: 'FORWARD_COMPUTE/DURATION', info: 'BEFORE_AFTER_CHANGE', targets: ['daysAfterEfficiencyGain']},
  {templateId: 'WORK_M_TARGET', family: 'work_time', band: 'medium', task: 'REQUIRED_INPUT/COUNT', info: 'MULTI_STAGE_PROCESS', targets: ['workersForDeadline']}
].map(Object.freeze));

/** A blueprint's identity for scheduling: the idea, not the instance. */
export const blueprintId = b => `${b.family}|${b.templateId}|${b.task}`;

/** Same family, same job, same layout — the unit a reader perceives as "again". */
export const presentationOf = b => `${b.family}|${b.task}|${b.info}`;

const byKey = new Map();
for (const b of BLUEPRINTS) byKey.set(`${b.templateId}|${b.task}`, b);

/**
 * The blueprint a finished question realises. A template that gains a task the
 * catalogue has not recorded yet still gets a blueprint here rather than a null,
 * so the scheduler's accounting stays complete; the catalogue test is what makes
 * that case visible instead of permanent.
 */
export function blueprintFor(templateId, task, family = '?', band = '?', info = 'DIRECT_GIVENS') {
  return byKey.get(`${templateId}|${task}`)
    ?? {templateId, family, band, task, info, targets: [], uncatalogued: true};
}

const byBand = new Map();
for (const b of BLUEPRINTS) {
  if (!byBand.has(b.band)) byBand.set(b.band, []);
  byBand.get(b.band).push(b);
}

/** Every blueprint that can fill a slot of this band, optionally within a family pool. */
export function blueprintsForBand(band, families = null) {
  const all = byBand.get(band) ?? [];
  if (!families || !families.length) return all;
  const allowed = new Set(families);
  return all.filter(b => allowed.has(b.family));
}

/** How much genuinely distinct material a band holds. Reported, never adjusted. */
export function bandCapacity(band, families = null) {
  const pool = blueprintsForBand(band, families);
  return {
    band,
    blueprints: pool.length,
    families: new Set(pool.map(b => b.family)).size,
    tasks: new Set(pool.map(b => b.task)).size,
    presentations: new Set(pool.map(presentationOf)).size
  };
}
