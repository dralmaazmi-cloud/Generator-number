// Section 1-A. The oracle must not be a second copy of the solver written from
// the same understanding, or it reproduces the same bug in both layers. So a
// template does not hand the oracle a formula; it hands it a *statement* of the
// problem as data — constraints relating the givens to an unknown x — and this
// engine searches for the values of x that satisfy the statement.
//
// The engine has no knowledge of how any family is solved. It only enumerates
// and checks. A wrong formula in the generator cannot be mirrored here, because
// nothing here computes an answer.

import {Fraction} from './fraction.js';

const ZERO = Fraction.from(0);

/**
 * Expression tree, evaluated with exact rationals.
 *   number | 'x' | {add:[...]} {sub:[a,b]} {mul:[...]} {div:[a,b]}
 *   {mod:[a,b]} (always non-negative) {abs:a} {neg:a} {min:[...]} {max:[...]}
 */
export function evalExpr(node, x) {
  if (node === 'x') return Fraction.from(x);
  if (typeof node === 'number' || typeof node === 'bigint' || node instanceof Fraction) return Fraction.from(node);
  if (typeof node === 'string') throw new Error(`Unknown symbol in oracle expression: ${node}`);
  if (!node || typeof node !== 'object') throw new Error('Malformed oracle expression');

  if ('add' in node) return node.add.reduce((a, n) => a.add(evalExpr(n, x)), ZERO);
  if ('mul' in node) return node.mul.reduce((a, n) => a.mul(evalExpr(n, x)), Fraction.from(1));
  if ('sub' in node) return evalExpr(node.sub[0], x).sub(evalExpr(node.sub[1], x));
  if ('div' in node) {
    const d = evalExpr(node.div[1], x);
    if (d.isZero) return null;
    return evalExpr(node.div[0], x).div(d);
  }
  if ('mod' in node) {
    const a = evalExpr(node.mod[0], x);
    const m = evalExpr(node.mod[1], x);
    if (m.isZero) return null;
    if (!a.isInteger || !m.isInteger) {
      // general positive modulo for rationals
      const q = a.div(m);
      const floorQ = BigInt(Math.floor(q.toNumber()));
      return a.sub(m.mul(Fraction.from(floorQ)));
    }
    const mm = m.n < 0n ? -m.n : m.n;
    let r = a.n % mm;
    if (r < 0n) r += mm;
    return Fraction.from(r);
  }
  if ('abs' in node) return evalExpr(node.abs, x).abs();
  if ('neg' in node) return evalExpr(node.neg, x).neg();
  if ('min' in node) return node.min.map(n => evalExpr(n, x)).reduce((a, b) => (a.lt(b) ? a : b));
  if ('max' in node) return node.max.map(n => evalExpr(n, x)).reduce((a, b) => (a.gt(b) ? a : b));
  throw new Error(`Unknown oracle expression node: ${Object.keys(node).join(',')}`);
}

const COMPARATORS = {
  eq: (a, b) => a.eq(b),
  ne: (a, b) => !a.eq(b),
  lt: (a, b) => a.lt(b),
  lte: (a, b) => a.lte(b),
  gt: (a, b) => a.gt(b),
  gte: (a, b) => a.gte(b),
  int: a => a.isInteger
};

/** A constraint is {op, left, right} — a restatement of one sentence of the stem. */
export function satisfies(constraint, x) {
  const cmp = COMPARATORS[constraint.op];
  if (!cmp) throw new Error(`Unknown oracle comparator: ${constraint.op}`);
  let left, right;
  try {
    left = evalExpr(constraint.left, x);
    if (constraint.op === 'int') return left !== null && cmp(left);
    right = evalExpr(constraint.right, x);
  } catch {
    return false;
  }
  if (left === null || right === null) return false;
  return cmp(left, right);
}

/**
 * Searches a finite candidate domain for the values that satisfy every
 * constraint.
 * @returns {{survivors:Fraction[], scanned:number}}
 */
export function searchDomain(domain, constraints) {
  const survivors = [];
  for (const candidate of domain) {
    let ok = true;
    for (const c of constraints) {
      if (!satisfies(c, candidate)) { ok = false; break; }
    }
    if (ok) survivors.push(Fraction.from(candidate));
  }
  return {survivors, scanned: domain.length};
}

/** Inclusive numeric grid, used when a family's answer range is genuinely small. */
export function grid(min, max, step = 1) {
  const out = [];
  const s = Fraction.from(step);
  let v = Fraction.from(min);
  const hi = Fraction.from(max);
  let guard = 0;
  while (v.lte(hi)) {
    out.push(v);
    v = v.add(s);
    if (++guard > 20000) break;
  }
  return out;
}
