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
export function extractMathRuns(text) {
  const runs = [];
  for (const m of normalizeMath(text).matchAll(MATH_RUN_RE)) {
    const run = m[0];
    if (!run.includes('=')) continue;
    if (!/\d/.test(run)) continue;
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
  const sourced = new Set();
  for (const v of [...stemNumbers, ...paramNumbers, ...allowedConstants]) {
    if (Number.isFinite(v)) sourced.add(key(v));
  }
  const unsourced = [];

  for (const step of steps) {
    if (typeof step !== 'string') continue;
    // Derive within the step: any equation chain with one fully-sourced side
    // makes every other side's value available.
    for (let pass = 0; pass < 4; pass++) {
      for (const run of extractMathRuns(step)) {
        const parts = equalityParts(run);
        if (!parts || parts.length < 2) continue;
        let values;
        try { values = parts.map(p => evaluateExpression(p)); } catch { continue; }
        const sideSourced = parts.map(p => numbersIn(p).every(n => sourced.has(key(n))));
        if (!sideSourced.some(Boolean)) continue;
        // One side is fully derived from known values, so the chain's value —
        // and any side that is just that single literal — becomes available.
        for (const v of values) sourced.add(key(v.exact.toDecimalString()));
        for (const p of parts) {
          const ns = numbersIn(p);
          if (ns.length === 1) sourced.add(key(ns[0]));
        }
      }
    }
    for (const n of numbersIn(step)) {
      if (!sourced.has(key(n))) unsourced.push({step, value: n});
    }
    // Anything the step legitimately established stays available downstream.
    for (const n of numbersIn(step)) sourced.add(key(n));
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
