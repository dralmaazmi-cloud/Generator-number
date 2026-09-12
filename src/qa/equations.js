// Sections 8-B and 8-C.
//   validateDisplayedEquations  — every numeric equality printed in an
//     explanation is re-evaluated; a mismatch is a failure, and a mismatch that
//     only holds if an operand was rounded is reported separately as
//     INTERMEDIATE_ROUNDING.
//   validateExplanationSourcing — every number printed in an explanation must
//     come from the stem, from the parameters, or from a result derived earlier
//     in the explanation itself. "we pick the part value 4" does not pass.

import {Fraction} from './fraction.js';
import {REASON} from './reasons.js';

const ARABIC_DIGITS = /[٠-٩۰-۹]/g;

export function normalizeMath(text) {
  return String(text)
    .replace(ARABIC_DIGITS, ch => {
      const c = ch.codePointAt(0);
      const base = c >= 0x06F0 ? 0x06F0 : 0x0660;
      return String(c - base);
    })
    .replace(/[×✕✖]/g, '*')
    .replace(/[÷]/g, '/')
    .replace(/[−–—]/g, '-')
    .replace(/٫/g, '.')   // Arabic decimal separator
    .replace(/٬/g, '');   // Arabic thousands separator
}

const MATH_RUN_RE = /[0-9.+\-*/()=%\s]+/g;

/** Maximal substrings made only of arithmetic characters that contain '='. */
const ARABIC_LETTER = /[\u0621-\u064A]/;

export function extractMathRuns(text) {
  const src = normalizeMath(text);
  const runs = [];
  for (const m of src.matchAll(MATH_RUN_RE)) {
    const run = m[0];
    if (!run.includes('=')) continue;
    if (!/\d/.test(run)) continue;
    // An algebraic line such as "20ك = 8ك + 48" is chopped by the variable
    // letter into fragments like " = 8" that are not claims at all. A run whose
    // last character is a digit glued straight onto an Arabic letter is one of
    // those fragments; units are always written with a space, so nothing
    // legitimate is skipped here.
    const endsAt = m.index + run.length;
    if (/\d$/.test(run) && ARABIC_LETTER.test(src[endsAt] || '')) continue;
    runs.push(run);
  }
  return runs;
}

// --- expression evaluation -------------------------------------------------

class Parser {
  constructor(src) { this.s = src; this.i = 0; }
  ws() { while (this.i < this.s.length && /\s/.test(this.s[this.i])) this.i++; }
  peek() { this.ws(); return this.s[this.i]; }
  eof() { this.ws(); return this.i >= this.s.length; }

  parse() {
    const v = this.expr();
    if (!this.eof()) throw new Error('trailing input');
    return v;
  }
  expr() {
    let left = this.term();
    for (;;) {
      const c = this.peek();
      if (c === '+') { this.i++; left = combine(left, this.term(), 'add'); }
      else if (c === '-') { this.i++; left = combine(left, this.term(), 'sub'); }
      else return left;
    }
  }
  term() {
    let left = this.unary();
    for (;;) {
      const c = this.peek();
      if (c === '*') { this.i++; left = combine(left, this.unary(), 'mul'); }
      else if (c === '/') { this.i++; left = combine(left, this.unary(), 'div'); }
      else return left;
    }
  }
  unary() {
    if (this.peek() === '-') { this.i++; const v = this.unary(); return {exact: v.exact.neg(), lo: -v.hi, hi: -v.lo}; }
    if (this.peek() === '+') { this.i++; return this.unary(); }
    return this.atom();
  }
  atom() {
    this.ws();
    if (this.s[this.i] === '(') {
      this.i++;
      const v = this.expr();
      this.ws();
      if (this.s[this.i] !== ')') throw new Error('unbalanced paren');
      this.i++;
      return v;
    }
    const m = /^\d+(?:\.\d*)?|^\.\d+/.exec(this.s.slice(this.i));
    if (!m) throw new Error('expected number');
    this.i += m[0].length;
    let literal = m[0];
    if (this.s[this.i] === '%') this.i++; // percent read as a bare label
    return literalValue(literal);
  }
}

/**
 * A printed literal carries two readings: the exact value it states, and the
 * interval of true values that could have produced it had it been rounded to
 * the precision shown. Pure equality uses the first; the rounding diagnosis
 * uses the second.
 */
function literalValue(literal) {
  const exact = Fraction.fromDecimalString(literal.endsWith('.') ? literal.slice(0, -1) : literal);
  const dot = literal.indexOf('.');
  const decimals = dot === -1 ? 0 : literal.length - dot - 1;
  const half = decimals === 0 ? 0 : 0.5 * 10 ** (-decimals);
  const v = exact.toNumber();
  return {exact, lo: v - half, hi: v + half};
}

function combine(a, b, op) {
  const exact = op === 'add' ? a.exact.add(b.exact)
    : op === 'sub' ? a.exact.sub(b.exact)
    : op === 'mul' ? a.exact.mul(b.exact)
    : a.exact.div(b.exact);
  let lo, hi;
  if (op === 'add') { lo = a.lo + b.lo; hi = a.hi + b.hi; }
  else if (op === 'sub') { lo = a.lo - b.hi; hi = a.hi - b.lo; }
  else if (op === 'mul') {
    const c = [a.lo * b.lo, a.lo * b.hi, a.hi * b.lo, a.hi * b.hi];
    lo = Math.min(...c); hi = Math.max(...c);
  } else {
    if (b.lo <= 0 && b.hi >= 0) { lo = -Infinity; hi = Infinity; }
    else {
      const c = [a.lo / b.lo, a.lo / b.hi, a.hi / b.lo, a.hi / b.hi];
      lo = Math.min(...c); hi = Math.max(...c);
    }
  }
  return {exact, lo, hi};
}

export function evaluateExpression(src) {
  return new Parser(src).parse();
}


/**
 * Splits an equality chain into its sides. Arabic prose on the left of the
 * first '=' leaves an empty edge part, which is dropped; an empty part in the
 * middle means the run is not a well-formed chain.
 */
function equalityParts(run) {
  const raw = run.split('=').map(p => p.replace(/[.\s]+$/u, '').trim());
  while (raw.length && raw[0] === '') raw.shift();
  while (raw.length && raw.at(-1) === '') raw.pop();
  if (!raw.length || raw.some(p => p === '')) return null;
  return raw;
}

// --- section 8-B -----------------------------------------------------------

/**
 * @param {string[]} texts explanation lines to check
 * @returns {{reasons:string[], failures:Array, checked:number}}
 */
export function validateDisplayedEquations(texts) {
  const failures = [];
  const rounding = [];
  let checked = 0;
  for (const text of texts) {
    if (typeof text !== 'string') continue;
    for (const run of extractMathRuns(text)) {
      const parts = equalityParts(run);
      if (!parts || parts.length < 2) continue;
      if (!parts.some(p => /[+\-*/]/.test(p))) continue;   // "= 5 = 5" carries no claim
      let values;
      try {
        values = parts.map(p => evaluateExpression(p));
      } catch {
        continue; // not a self-contained arithmetic claim
      }
      checked++;
      const first = values[0];
      const exactAgree = values.every(v => v.exact.eq(first.exact));
      if (exactAgree) continue;
      const intervalsAgree = values.every(v => v.hi >= first.lo && v.lo <= first.hi)
        && values.every((v, i) => values.every((w, j) => i === j || (v.hi >= w.lo && v.lo <= w.hi)));
      const record = {text, run: run.trim(), parts, values: values.map(v => v.exact.toDecimalString())};
      if (intervalsAgree) rounding.push(record);
      else failures.push(record);
    }
  }
  const reasons = [];
  if (failures.length) reasons.push(REASON.EXPLANATION_EQUATION_FAILURE);
  if (rounding.length) reasons.push(REASON.INTERMEDIATE_ROUNDING);
  return {valid: reasons.length === 0, reasons, failures, rounding, checked};
}

// --- section 8-C -----------------------------------------------------------

const NUMBER_TOKEN_RE = /\d+(?:\.\d+)?/g;

function key(v) { return Fraction.from(v).toString(); }

/** Numbers written anywhere in a piece of text. */
export function numbersIn(text) {
  const out = [];
  for (const m of normalizeMath(text || '').matchAll(NUMBER_TOKEN_RE)) out.push(Number(m[0]));
  return out;
}

/**
 * Section 8-C. Walks the steps in order; a value is admissible when it appears
 * in the stem/parameters, is an allowed structural constant, or is the result of
 * an equation whose operands were already admissible.
 */
export function validateExplanationSourcing({
  stemNumbers = [],
  paramNumbers = [],
  steps = [],
  allowedConstants = [0, 1, 2, 100],
  answerNumbers = []
}) {
  // `sourced` is everything a reader may take as given at this point.
  // `substantive` is the subset that carries real information — stem values,
  // parameters and results derived from them. Structural constants (0, 1, 2,
  // 100) are admissible on their own but cannot, by themselves, license a claim:
  // otherwise "1.25 x 0.8 = 1" would launder both factors into the explanation.
  const sourced = new Set();
  const substantive = new Set();
  for (const v of [...stemNumbers, ...paramNumbers]) {
    if (Number.isFinite(v)) { sourced.add(key(v)); substantive.add(key(v)); }
  }
  for (const v of allowedConstants) if (Number.isFinite(v)) sourced.add(key(v));
  const unsourced = [];

  for (const step of steps) {
    if (typeof step !== 'string') continue;
    for (let pass = 0; pass < 4; pass++) {
      for (const run of extractMathRuns(step)) {
        const parts = equalityParts(run);
        if (!parts || parts.length < 2) continue;
        let values;
        try { values = parts.map(p => evaluateExpression(p)); } catch { continue; }
        // A side licenses the chain when every literal on it is already
        // admissible and at least one of them carries information.
        const licenses = parts.some(p => {
          const ns = numbersIn(p);
          return ns.length > 0 && ns.every(n => sourced.has(key(n))) && ns.some(n => substantive.has(key(n)));
        });
        if (!licenses) continue;
        // The identity is separately re-evaluated by validateDisplayedEquations,
        // so a factorisation like "24 = 6 x 4" demonstrates its operands rather
        // than announcing them.
        for (const v of values) { sourced.add(key(v.exact.toDecimalString())); substantive.add(key(v.exact.toDecimalString())); }
        for (const p of parts) for (const n of numbersIn(p)) { sourced.add(key(n)); substantive.add(key(n)); }
      }
    }
    for (const n of numbersIn(step)) {
      if (!sourced.has(key(n))) unsourced.push({step, value: n});
    }
    for (const n of numbersIn(step)) { sourced.add(key(n)); substantive.add(key(n)); }
  }

  for (const a of answerNumbers) {
    if (Number.isFinite(a) && !sourced.has(key(a))) unsourced.push({step: '(answer)', value: a});
  }

  return {
    valid: unsourced.length === 0,
    reasons: unsourced.length ? [REASON.EXPLANATION_UNSOURCED_VALUE] : [],
    unsourced
  };
}
