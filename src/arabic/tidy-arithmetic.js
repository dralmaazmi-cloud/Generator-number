// RC2.9.3-1. The last pass over an explanation before a learner sees it.
//
// Templates compute their solution lines from parameters, and a parameter that
// happens to be 1 (a one-hour delay, a 1-kg unit weight, a coefficient of one)
// leaves a trace a tutor would never write: «60 × 1 = 60», «س = 10 ÷ 1 = 10»,
// «7 + -3 = 4», «1 × (6 − 1)». None of it is wrong — every equation still
// holds — but every one of them costs the reader a moment and makes the
// solution look machine-made. RC2.9.2 published 27 templates with at least one
// such line.
//
// This normaliser removes exactly those traces and nothing else. It is applied
// to the EXPLANATION (steps, how-to-start, fast method, remember) and to the
// distractor derivations, never to the stem or the options: the stem is checked
// against its parameters word by word, and an option is a value, not prose.
//
// Two invariants the pipeline enforces downstream must survive it, and the
// rules are written so that they do:
//   * every printed equality still holds — each rule is an identity
//     (x × 1 = x, x ÷ 1 = x, a + (−b) = a − b, a − (−b) = a + b);
//   * every printed number is still sourced — a rule only ever REMOVES a
//     literal or changes the glyph of a sign, never introduces a value.
//
// The Unicode minus (U+2212) is what the rest of the renderer prints for
// subtraction, and the equation checker already reads it as a sign, so the
// ASCII hyphen a `${negative}` interpolation leaves behind is rewritten to it.

// A «1» that is a whole literal: not part of 10, 1.5, 1/3 or 21.
const NOT_DIGIT_BEFORE = '(?<![\\d.,٫/])';
// A period after the literal may be a sentence's, so only a period FOLLOWED
// by a digit counts as a decimal point.
const NOT_DIGIT_AFTER = '(?![\\d/]|[.,٫]\\d)';

const RULES = [
  // «x × 1 = x» and «x ÷ 1 = x» — the whole identity collapses to its value.
  [new RegExp(`${NOT_DIGIT_BEFORE}(\\d+(?:[.,٫]\\d+)?) [×÷] 1${NOT_DIGIT_AFTER} = \\1${NOT_DIGIT_AFTER}`, 'g'), '$1'],
  // «× 1 ÷», «× 1 ×» in the middle of a product: the factor contributes nothing.
  [new RegExp(` × 1${NOT_DIGIT_AFTER}(?= [×÷])`, 'g'), ''],
  // A trailing «× 1» or «÷ 1» before an equals sign, punctuation, a closing
  // bracket-less end, or Arabic prose. A «× 1)» is left alone: inside brackets
  // it is usually a digit product a sequence rule genuinely multiplies.
  [new RegExp(`([\\d)]) [×÷] 1${NOT_DIGIT_AFTER}(?= [=+−]|[.،؛:]|$| [\\u0621-\\u064A])`, 'g'), '$1'],
  // «1 × (…)», «1 × ك» — a unit coefficient in front of a bracket or a variable.
  [new RegExp(`${NOT_DIGIT_BEFORE}1 × (?=[(كسصعمن])`, 'g'), ''],
  // «1 × n = n» collapses to n; a remaining «1 × n» is n.
  [new RegExp(`${NOT_DIGIT_BEFORE}1 × (\\d+(?:[.,٫]\\d+)?) = \\1${NOT_DIGIT_AFTER}`, 'g'), '$1'],
  [new RegExp(`${NOT_DIGIT_BEFORE}1 × (?=\\d)(?!1${NOT_DIGIT_AFTER})`, 'g'), ''],
  // «a + n × 0 = a» — a formula applied zero times; the whole identity is a.
  [new RegExp(`${NOT_DIGIT_BEFORE}(\\d+) \\+ \\d+ × 0 = \\1${NOT_DIGIT_AFTER}`, 'g'), '$1'],
  // «1ك», «1س» — a unit coefficient glued to a variable letter.
  [new RegExp(`${NOT_DIGIT_BEFORE}1(?=[كسصعمن])`, 'g'), ''],
  // Signed literals interpolated after an operator: a + (−b) → a − b,
  // a − (−b) → a + b.
  [/ \+ [-−](\d)/g, ' − $1'],
  [/ − [-−](\d)/g, ' + $1'],
  // An ASCII hyphen doing a minus sign's job — after «=», a bracket, a comma
  // or at the start — becomes the minus the rest of the renderer prints; so
  // does one standing between two operands («1 - 20 ÷ 100»).
  [/(^|[=(،:\s])-(?=\d)/g, '$1−'],
  [/ - (?=[\d(])/g, ' − ']
];

/**
 * @param {string|null|undefined} text
 * @returns {string|null|undefined} the same text with unit-factor and sign
 *   artifacts removed; non-strings pass through untouched.
 */
export function tidyArithmetic(text) {
  if (typeof text !== 'string') return text;
  // A statement of the form «n = a × b» is a factorisation or a property
  // («8 = 8 × 1», «1 = 1 × 1» in an odd-one-out solution), where the one IS
  // the point. Such lines are left exactly as written.
  if (/^\d+ = /.test(text)) return text;
  let out = text;
  for (const [re, to] of RULES) out = out.replace(re, to);
  return out;
}

/** Applies {@link tidyArithmetic} to every string in an array. */
export function tidyArithmeticAll(lines) {
  return Array.isArray(lines) ? lines.map(tidyArithmetic) : lines;
}
