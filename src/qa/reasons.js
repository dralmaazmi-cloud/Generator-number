// Section 5: validators return reason codes, never a bare boolean.

export const REASON = Object.freeze({
  ORACLE_DISAGREEMENT: 'ORACLE_DISAGREEMENT',
  ORACLE_NON_UNIQUE: 'ORACLE_NON_UNIQUE',
  ORACLE_NO_SOLUTION: 'ORACLE_NO_SOLUTION',
  NO_CORRECT_OPTION: 'NO_CORRECT_OPTION',
  MULTIPLE_CORRECT_OPTIONS: 'MULTIPLE_CORRECT_OPTIONS',
  TEXT_PARAM_MISMATCH: 'TEXT_PARAM_MISMATCH',
  AMBIGUOUS_ODD_ONE_OUT: 'AMBIGUOUS_ODD_ONE_OUT',
  UNDISCOVERABLE_INTENDED_RULE: 'UNDISCOVERABLE_INTENDED_RULE',
  DEGENERATE_WRONG_METHOD_EQUALS_KEY: 'DEGENERATE_WRONG_METHOD_EQUALS_KEY',
  DEGENERATE_PARAMETERS: 'DEGENERATE_PARAMETERS',
  REDUCIBLE_RATIO: 'REDUCIBLE_RATIO',
  EQUAL_RATIO_SIDES: 'EQUAL_RATIO_SIDES',
  UNREALISTIC_AGE: 'UNREALISTIC_AGE',
  EXPLANATION_EQUATION_FAILURE: 'EXPLANATION_EQUATION_FAILURE',
  EXPLANATION_UNSOURCED_VALUE: 'EXPLANATION_UNSOURCED_VALUE',
  INTERMEDIATE_ROUNDING: 'INTERMEDIATE_ROUNDING',
  DISTRACTOR_NO_MISCONCEPTION: 'DISTRACTOR_NO_MISCONCEPTION',
  MISCONCEPTION_NOT_APPLICABLE: 'MISCONCEPTION_NOT_APPLICABLE',
  FEEDBACK_DERIVATION_MISMATCH: 'FEEDBACK_DERIVATION_MISMATCH',
  DUPLICATE_DISTRACTOR_DERIVATION: 'DUPLICATE_DISTRACTOR_DERIVATION',
  REPEATED_ANSWER_DERIVED_MISCONCEPTION: 'REPEATED_ANSWER_DERIVED_MISCONCEPTION',
  UNATTRIBUTED_ANSWER_DERIVED_DISTRACTOR: 'UNATTRIBUTED_ANSWER_DERIVED_DISTRACTOR',
  DISTRACTOR_IMPOSSIBLE: 'DISTRACTOR_IMPOSSIBLE',
  DUPLICATE_FINGERPRINT: 'DUPLICATE_FINGERPRINT',
  REPEATED_REASONING_PATTERN: 'REPEATED_REASONING_PATTERN',
  TEMPLATE_OVERUSE: 'TEMPLATE_OVERUSE',
  // RC2.1-1. Session-level dispositions. Before RC2.1 three of the session
  // builder's rejection branches discarded an already-published candidate with
  // a bare `continue`, so 104 of 359 published candidates on holdout B vanished
  // from the accounting. A discard without a name is a discard nobody can cost.
  SESSION_RECENT_MEMORY: 'SESSION_RECENT_MEMORY',
  SESSION_TEMPLATE_CAP: 'SESSION_TEMPLATE_CAP',
  SESSION_WINDOW_CAP: 'SESSION_WINDOW_CAP',
  // RC2.3-5. One template id has already taken its share of the session. The
  // cap above counts (template, asked unknown); this one counts the template, so
  // a template askable three ways can no longer occupy nine slots in fifty
  // without anything being recorded.
  SESSION_TEMPLATE_SHARE_CAP: 'SESSION_TEMPLATE_SHARE_CAP',
  SESSION_BATCH_DUPLICATE: 'SESSION_BATCH_DUPLICATE',
  // RC2.1-3. Not a rejection: the candidate is still available, it has just been
  // moved behind the plausible ones.
  IMPLAUSIBLE_DISTRACTOR_DEMOTED: 'IMPLAUSIBLE_DISTRACTOR_DEMOTED',
  // RC2.2-1. The draw produced a question at a different band from the one
  // asked for. Never released; always resampled.
  DIFFICULTY_BAND_MISMATCH: 'DIFFICULTY_BAND_MISMATCH',
  // RC2.2-1. The family holds no template that computes the requested band.
  // Declared vocabulary: a thrown generator error used to be turned into an
  // ad-hoc `GENERATOR_ERROR:<message>` reason, which invented a new code for
  // every distinct message and made the byReason table unusable.
  NO_TEMPLATE_AT_DIFFICULTY: 'NO_TEMPLATE_AT_DIFFICULTY',
  // RC2.2-4. The reasoning path has already been used its allowance of times
  // across this multi-session batch.
  REPEATED_REASONING_PATTERN_IN_BATCH: 'REPEATED_REASONING_PATTERN_IN_BATCH',
  INVALID_ARABIC_NUMBER_UNIT: 'INVALID_ARABIC_NUMBER_UNIT',
  RETRY_EXHAUSTED: 'RETRY_EXHAUSTED',
  // RC2-003. The default reason a family sampler discards its own draw. It is a
  // work code, never a verdict: it can never appear in a validation verdict.
  SAMPLER_CONSTRAINT: 'SAMPLER_CONSTRAINT',
  // Structural checks inherited from v1.2.0's validateQuestion.
  OPTIONS_MUST_HAVE_A_TO_F: 'OPTIONS_MUST_HAVE_A_TO_F',
  OPTIONS_MUST_BE_UNIQUE: 'OPTIONS_MUST_BE_UNIQUE',
  INVALID_CORRECT_OPTION: 'INVALID_CORRECT_OPTION',
  CORRECT_VALUE_MISMATCH: 'CORRECT_VALUE_MISMATCH',
  MISSING_QUESTION: 'MISSING_QUESTION',
  MISSING_HOW_TO_START: 'MISSING_HOW_TO_START',
  MISSING_STEPS: 'MISSING_STEPS',
  MISSING_REMEMBER: 'MISSING_REMEMBER',
  INVALID_DIFFICULTY: 'INVALID_DIFFICULTY'
});

export const ALL_REASONS = Object.freeze(Object.values(REASON));

/** A validator verdict. `reasons` carries codes; `details` is diagnostic only. */
export function verdict(reasons = [], details = {}) {
  const list = Array.isArray(reasons) ? reasons.filter(Boolean) : [reasons].filter(Boolean);
  return {valid: list.length === 0, reasons: list, details};
}

export function mergeVerdicts(...verdicts) {
  const reasons = [];
  const details = {};
  for (const v of verdicts) {
    if (!v) continue;
    for (const r of v.reasons || []) if (!reasons.includes(r)) reasons.push(r);
    Object.assign(details, v.details || {});
  }
  return {valid: reasons.length === 0, reasons, details};
}
