// Section 5. One pipeline, run on every candidate before it can be published.
// Each stage returns reason codes; a candidate that collects any code is
// rejected and regenerated. Nothing here repairs a question in place: a
// disagreement is treated as evidence of a bug, not as a key to patch.

import {REASON, verdict, mergeVerdicts} from './reasons.js';
import {Fraction} from './fraction.js';
import {searchDomain} from './oracle-engine.js';
import {checkOddOneOutAmbiguity, oracleOddOneOut} from './ambiguity.js';
import {buildOrderOracle} from './relational-oracle.js';
import {validateTextMatchesParams} from './text-params.js';
import {validatePedagogy} from './pedagogy.js';
import {validateDisplayedEquations, validateExplanationSourcing, numbersIn} from './equations.js';
import {checkArabicNumberUnitsDeep} from '../arabic/units.js';
import {isKnownMisconception} from './misconceptions.js';
import {LETTERS, parseLeadingNumber, validateQuestion, DAYS_AR} from '../utils.js';

const EPS = 1e-9;

/** Collects every rendered string in a question, for the language pass. */
export function allRenderedText(q) {
  return [
    q.question,
    q.display_expression,
    ...LETTERS.map(l => q.options?.[l]),
    q.explanation?.how_to_start,
    ...(q.explanation?.steps || []),
    q.explanation?.answer,
    q.explanation?.fast_method,
    q.explanation?.remember,
    ...LETTERS.map(l => q.explanation?.distractor_analysis?.[l])
  ].filter(x => typeof x === 'string');
}

// --- stage: independent oracle (Section 3) ---------------------------------

/**
 * Runs the template's declared statement through the search engine and reports
 * what the *statement* implies, independently of what the generator computed.
 */
export function runOracle(base, q) {
  const spec = base.oracle;
  if (!spec) return {ran: false, reasons: [], detail: 'no oracle declared'};

  if (spec.kind === 'ruleset') {
    // The claim under test is what the generator published, not a copy of it
    // that the generator also wrote into the oracle spec.
    const claimed = Number(base.correct);
    const sweep = oracleOddOneOut(spec.numbers);
    const amb = checkOddOneOutAmbiguity(spec.numbers, claimed);
    const reasons = [];
    if (!amb.supportsIntended) reasons.push(REASON.ORACLE_DISAGREEMENT);
    if (amb.ambiguous) reasons.push(REASON.AMBIGUOUS_ODD_ONE_OUT);
    return {ran: true, reasons, answer: claimed, detail: {outliers: sweep.outliers, competing: amb.competing.length}};
  }

  if (spec.kind === 'order') {
    const oracle = buildOrderOracle(spec.nodes, spec.edges);
    const ask = spec.ask || {};
    const claimed = String(base.correct);
    let answer;
    let agrees;
    let display = [];
    switch (ask.type) {
      case 'position': {
        // null means the consistent orderings disagree, which the template
        // reports with its own "cannot be determined" label.
        const who = oracle.whoAtPosition(ask.position);
        answer = who ?? spec.expectedDisplay ?? null;
        display = [String(answer)];
        agrees = String(answer) === claimed;
        break;
      }
      case 'countAbove': {
        const count = oracle.countDefinitelyAbove(ask.target);
        answer = count;
        // The choices are written in words, so the comparison happens on the
        // label the count maps to.
        display = [spec.labels ? spec.labels[String(count)] : String(count)];
        agrees = display[0] === claimed;
        break;
      }
      case 'undeterminedPair': {
        const labels = new Set();
        for (const [a, b] of oracle.allUndeterminedPairs()) {
          labels.add(`${a} و${b}`);
          labels.add(`${b} و${a}`);
        }
        answer = [...labels];
        display = [...labels];
        agrees = labels.has(claimed);
        break;
      }
      case 'guaranteed': {
        const holds = (ask.statements || []).filter(st => oracle.definitelyAbove(st.above, st.below));
        answer = holds.map(st => st.id);
        display = answer.map(String);
        agrees = holds.some(st => String(st.id) === claimed);
        break;
      }
      default:
        return {ran: false, reasons: [], detail: `unknown order ask ${ask.type}`};
    }
    return {
      ran: true,
      reasons: agrees ? [] : [REASON.ORACLE_DISAGREEMENT],
      answer,
      display,
      detail: {claimed, extensions: oracle.extensions.length}
    };
  }

  // Numeric statements: search a finite domain for values satisfying the stem.
  const domain = spec.domain && spec.domain.length
    ? spec.domain
    : optionNumbers(q);
  if (!domain.length) return {ran: false, reasons: [], detail: 'empty oracle domain'};
  const {survivors} = searchDomain(domain, spec.constraints || []);
  const unique = dedupeFractions(survivors);
  if (!unique.length) return {ran: true, reasons: [REASON.ORACLE_NO_SOLUTION], answer: null, detail: {scanned: domain.length}};
  if (unique.length > 1) {
    return {ran: true, reasons: [REASON.ORACLE_NON_UNIQUE], answer: null, detail: {survivors: unique.map(f => f.toDecimalString())}};
  }
  const oracleAnswer = unique[0];
  // A template whose answer is a label rather than a number (a weekday, a
  // fraction name) supplies the mapping from the searched value to the label,
  // so the comparison stays between what the statement implies and what the
  // generator claims.
  let agrees;
  let claimed;
  if (spec.labels) {
    claimed = String(base.correct);
    agrees = spec.labels[oracleAnswer.toDecimalString()] === claimed;
  } else {
    claimed = spec.answerKind === 'dayIndex' ? dayIndexOf(base.correct) : Number(base.correct);
    agrees = Number.isFinite(claimed) && oracleAnswer.eq(Fraction.from(claimed));
  }
  return {
    ran: true,
    reasons: agrees ? [] : [REASON.ORACLE_DISAGREEMENT],
    answer: oracleAnswer,
    detail: {claimed, oracle: oracleAnswer.toDecimalString(), scanned: domain.length}
  };
}

function dayIndexOf(name) {
  const i = DAYS_AR.indexOf(String(name));
  return i === -1 ? NaN : i;
}

function dedupeFractions(list) {
  const seen = new Set();
  const out = [];
  for (const f of list) {
    const k = f.toString();
    if (!seen.has(k)) { seen.add(k); out.push(f); }
  }
  return out;
}

/**
 * The raw values behind the six choices. Reading the rendered string is not
 * enough: "كيلومتر واحد" carries no numeral, and "انخفاض 5%" and "زيادة 5%"
 * would both parse as 5 while meaning opposite things.
 */
function optionNumbers(q) {
  const meta = q.metadata?.options_meta;
  const out = [];
  for (const l of LETTERS) {
    const raw = meta?.[l]?.value;
    const v = typeof raw === 'number' ? raw : parseLeadingNumber(q.options?.[l]);
    if (v !== null && Number.isFinite(v)) out.push(v);
  }
  return out;
}

function optionValue(q, letter) {
  const raw = q.metadata?.options_meta?.[letter]?.value;
  return typeof raw === 'number' ? raw : parseLeadingNumber(q.options?.[letter]);
}

// --- stage: exactly one option carries the oracle's answer (Section 3) -------

export function validateUniqueAnswer(base, q, oracleResult) {
  const reasons = [];
  const key = q.options?.[q.correct_option];
  const equalToKey = LETTERS.filter(l => q.options[l] === key).length;
  if (equalToKey === 0) reasons.push(REASON.NO_CORRECT_OPTION);
  if (equalToKey > 1) reasons.push(REASON.MULTIPLE_CORRECT_OPTIONS);

  if (oracleResult?.ran && oracleResult.answer !== null && oracleResult.answer !== undefined
      && !oracleResult.reasons.length) {
    const spec = base.oracle;
    let matches;
    if (spec.kind === 'ruleset') {
      matches = LETTERS.filter(l => parseLeadingNumber(q.options[l]) === Number(base.correct)).length;
    } else if (spec.kind === 'order') {
      const allowed = new Set((oracleResult.display || []).map(String));
      matches = LETTERS.filter(l => allowed.has(String(q.options[l]))).length;
    } else if (spec.labels) {
      const label = spec.labels[oracleResult.answer.toDecimalString()];
      matches = LETTERS.filter(l => q.options[l] === label).length;
    } else if (spec.answerKind === 'dayIndex') {
      const dayName = DAYS_AR[Number(oracleResult.answer.toDecimalString())];
      matches = LETTERS.filter(l => q.options[l] === dayName).length;
    } else {
      const target = oracleResult.answer.toNumber();
      matches = LETTERS.filter(l => {
        const v = optionValue(q, l);
        return v !== null && Number.isFinite(v) && Math.abs(v - target) < EPS;
      }).length;
    }
    if (matches === 0) reasons.push(REASON.NO_CORRECT_OPTION);
    else if (matches > 1) reasons.push(REASON.MULTIPLE_CORRECT_OPTIONS);
  }
  return verdict([...new Set(reasons)]);
}

// --- stage: language (Section 12) ------------------------------------------

export function validateLanguage(q) {
  const {violations} = checkArabicNumberUnitsDeep(allRenderedText(q));
  return verdict(violations.length ? [REASON.INVALID_ARABIC_NUMBER_UNIT] : [], {arabicViolations: violations});
}

// --- stage: explanation (Sections 8-B, 8-C) --------------------------------

export function validateExplanation(base, q) {
  const steps = q.explanation?.steps || [];
  const texts = [...steps, q.explanation?.fast_method, q.explanation?.answer].filter(Boolean);
  const eq = validateDisplayedEquations(texts);
  const stemNumbers = [
    ...numbersIn(q.question || ''),
    ...(q.display_expression ? numbersIn(q.display_expression) : [])
  ];
  const paramNumbers = [];
  const collect = v => {
    if (typeof v === 'number' && Number.isFinite(v)) paramNumbers.push(v);
    else if (Array.isArray(v)) v.forEach(collect);
    else if (v && typeof v === 'object') Object.values(v).forEach(collect);
  };
  collect(base.parameters || {});
  const src = validateExplanationSourcing({
    stemNumbers,
    paramNumbers,
    steps,
    allowedConstants: base.allowedConstants ?? [0, 1, 2, 100],
    answerNumbers: []
  });
  return verdict([...eq.reasons, ...src.reasons], {
    equationFailures: eq.failures,
    equationRounding: eq.rounding,
    equationsChecked: eq.checked,
    unsourced: src.unsourced
  });
}

// --- stage: distractors (Section 14) ---------------------------------------

export function validateDistractors(q) {
  const meta = q.metadata?.options_meta || {};
  const missing = LETTERS.filter(l => !meta[l]?.correct && !isKnownMisconception(meta[l]?.misconceptionId));
  const noFeedback = LETTERS.filter(l => !meta[l]?.correct && !q.explanation?.distractor_analysis?.[l]);
  return verdict(missing.length || noFeedback.length ? [REASON.DISTRACTOR_NO_MISCONCEPTION] : [],
    {missingProvenance: missing, missingFeedback: noFeedback});
}

// --- the pipeline ----------------------------------------------------------

/**
 * @returns {{valid:boolean, reasons:string[], details:object}}
 */
export function validateCandidate(base, q) {
  const structural = validateQuestion(q);
  const structuralVerdict = verdict(structural.errors);

  const textCheck = base.textParams === false ? {reasons: []} : validateTextMatchesParams({
    questionText: q.question,
    displayExpression: q.display_expression,
    parameters: base.parameters || {},
    derivedFromParams: base.textParams?.derivedFromParams || [],
    essentialParams: base.textParams?.essentialParams || []
  });
  const textVerdict = verdict(textCheck.reasons, {
    orphanNumbers: textCheck.orphanNumbers,
    missingParams: textCheck.missingParams
  });

  const oracleResult = runOracle(base, q);
  const mathVerdict = verdict(oracleResult.reasons, {oracle: oracleResult.detail});
  const uniqueVerdict = validateUniqueAnswer(base, q, oracleResult);

  const pedagogyVerdict = validatePedagogy({
    correct: base.correct,
    pedagogy: base.pedagogy,
    ratio: base.ratio,
    realism: base.realism
  });

  const languageVerdict = validateLanguage(q);
  const explanationVerdict = validateExplanation(base, q);
  const distractorVerdict = validateDistractors(q);

  return mergeVerdicts(
    structuralVerdict,
    textVerdict,
    mathVerdict,
    uniqueVerdict,
    pedagogyVerdict,
    languageVerdict,
    explanationVerdict,
    distractorVerdict
  );
}
