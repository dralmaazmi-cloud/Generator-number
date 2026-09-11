// Exact rational arithmetic.
// Section 8-A: no rounding is permitted on intermediate values. Every internal
// computation that can leave the integers goes through this type; rounding is a
// display-time concern only, applied once at the end.

function igcd(a, b) {
  a = a < 0n ? -a : a;
  b = b < 0n ? -b : b;
  while (b) { const t = a % b; a = b; b = t; }
  return a || 1n;
}

export class Fraction {
  constructor(numerator = 0n, denominator = 1n) {
    let n = typeof numerator === 'bigint' ? numerator : BigInt(numerator);
    let d = typeof denominator === 'bigint' ? denominator : BigInt(denominator);
    if (d === 0n) throw new Error('Fraction denominator must not be zero');
    if (d < 0n) { n = -n; d = -d; }
    const g = igcd(n, d);
    this.n = n / g;
    this.d = d / g;
    Object.freeze(this);
  }

  /** Build from an integer, a Fraction, or a finite decimal number (exactly). */
  static from(value) {
    if (value instanceof Fraction) return value;
    if (typeof value === 'bigint') return new Fraction(value, 1n);
    if (typeof value === 'number') {
      if (!Number.isFinite(value)) throw new Error(`Cannot make a Fraction from ${value}`);
      if (Number.isInteger(value)) return new Fraction(BigInt(value), 1n);
      // Exact decimal reading of the literal as printed, which is what the
      // generators mean when they write 1.5 or 0.625.
      const s = String(value);
      if (s.includes('e') || s.includes('E')) {
        // Fall back to the shortest round-trip decimal expansion.
        const fixed = value.toFixed(20).replace(/0+$/, '');
        return Fraction.fromDecimalString(fixed);
      }
      return Fraction.fromDecimalString(s);
    }
    if (typeof value === 'string') return Fraction.fromDecimalString(value);
    throw new Error(`Cannot make a Fraction from ${typeof value}`);
  }

  static fromDecimalString(s) {
    const m = /^\s*(-?)(\d*)(?:\.(\d*))?\s*$/.exec(s);
    if (!m) throw new Error(`Not a decimal literal: ${s}`);
    const sign = m[1] === '-' ? -1n : 1n;
    const whole = m[2] || '0';
    const frac = m[3] || '';
    const n = BigInt(whole + frac) * sign;
    const d = 10n ** BigInt(frac.length);
    return new Fraction(n, d);
  }

  add(o) { const b = Fraction.from(o); return new Fraction(this.n * b.d + b.n * this.d, this.d * b.d); }
  sub(o) { const b = Fraction.from(o); return new Fraction(this.n * b.d - b.n * this.d, this.d * b.d); }
  mul(o) { const b = Fraction.from(o); return new Fraction(this.n * b.n, this.d * b.d); }
  div(o) {
    const b = Fraction.from(o);
    if (b.n === 0n) throw new Error('Division by zero in exact arithmetic');
    return new Fraction(this.n * b.d, this.d * b.n);
  }
  neg() { return new Fraction(-this.n, this.d); }
  abs() { return this.n < 0n ? this.neg() : this}
  cmp(o) { const b = Fraction.from(o); const l = this.n * b.d, r = b.n * this.d; return l < r ? -1 : l > r ? 1 : 0; }
  eq(o) { return this.cmp(o) === 0; }
  lt(o) { return this.cmp(o) < 0; }
  lte(o) { return this.cmp(o) <= 0; }
  gt(o) { return this.cmp(o) > 0; }
  gte(o) { return this.cmp(o) >= 0; }
  get isInteger() { return this.d === 1n; }
  get isZero() { return this.n === 0n; }
  get sign() { return this.n < 0n ? -1 : this.n > 0n ? 1 : 0; }

  /**
   * True when the value has a finite decimal expansion, i.e. it can be
   * displayed exactly. Denominators whose only prime factors are 2 and 5.
   */
  get isExactDecimal() {
    let d = this.d;
    while (d % 2n === 0n) d /= 2n;
    while (d % 5n === 0n) d /= 5n;
    return d === 1n;
  }

  /** Number of decimal places needed to print the value exactly, or null. */
  get decimalPlaces() {
    if (!this.isExactDecimal) return null;
    let d = this.d, places = 0;
    let twos = 0, fives = 0;
    while (d % 2n === 0n) { d /= 2n; twos++; }
    while (d % 5n === 0n) { d /= 5n; fives++; }
    places = Math.max(twos, fives);
    return places;
  }

  /** Exact decimal string when possible; otherwise a rounded string. */
  toDecimalString(maxDecimals = 6) {
    const places = this.decimalPlaces;
    if (places !== null && places <= maxDecimals) {
      if (places === 0) return String(this.n);
      const scale = 10n ** BigInt(places);
      const scaled = this.n * scale / this.d;
      const sign = scaled < 0n ? '-' : '';
      const a = (scaled < 0n ? -scaled : scaled).toString().padStart(places + 1, '0');
      const whole = a.slice(0, a.length - places);
      const frac = a.slice(a.length - places).replace(/0+$/, '');
      return frac ? `${sign}${whole}.${frac}` : `${sign}${whole}`;
    }
    return String(this.toNumber());
  }

  toNumber() { return Number(this.n) / Number(this.d); }
  toString() { return this.d === 1n ? String(this.n) : `${this.n}/${this.d}`; }
  toJSON() { return this.toString(); }
}

export const F = (n, d = 1n) => new Fraction(n, d);
export const frac = v => Fraction.from(v);

/** Sum of an iterable of Fraction-compatible values. */
export function fsum(values) {
  return values.reduce((acc, v) => acc.add(Fraction.from(v)), new Fraction(0n, 1n));
}

/** Product of an iterable of Fraction-compatible values. */
export function fprod(values) {
  return values.reduce((acc, v) => acc.mul(Fraction.from(v)), new Fraction(1n, 1n));
}

/** Percent factor 1 + pct/100 or 1 - pct/100, exactly. */
export function changeFactor(pct, direction = 'up') {
  const p = Fraction.from(pct).div(100);
  return direction === 'up' ? Fraction.from(1).add(p) : Fraction.from(1).sub(p);
}
