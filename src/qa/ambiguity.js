// RC2-007 / RC2-008 / RC2-009. An odd-one-out item is sound only when no
// competing rule a candidate would plausibly try singles out a different
// number, AND the intended rule is itself something a candidate can find.
//
// Three defects in the RC1 implementation are fixed here.
//
// RC2-007  The old check required a *pair* of simple rules with different
//          outliers. When exactly one simple rule survived its filter and it
//          disagreed with the key, no pair formed and the item passed. Worse,
//          `supportsIntended` was computed from the unfiltered list, so a rule
//          the checker itself called too hard to see still certified the item.
//          RC1 published S1/27 (key 75) and S5/08 (key 30) while the only rule
//          it called simple pointed at 35 in both.
//          Now: one competing rule at or below the intended rule's salience is
//          enough to reject.
//
// RC2-008  The old check tested only "exactly one number FAILS P". It never
//          tested "exactly one number SATISFIES P", and carried no notion of
//          magnitude, so "all three-digit except 64" and "only one is a perfect
//          square" were both invisible. Both framings are tested now.
//
// RC2-009  Nothing required the intended rule to be discoverable.
//          ODD_H_PRIME_OFFSET published "prime + 10" over six consecutive odd
//          numbers, where primality — the natural reading — singles out two
//          numbers, neither the key. A rule above the discoverability ceiling
//          can no longer certify a question.

const isInt = n => Number.isInteger(n);
const isSquare = n => n >= 0 && Number.isInteger(Math.sqrt(n));
const isCube = n => { if (n < 0) return false; const r = Math.round(Math.cbrt(n)); return r ** 3 === n; };
const isPrime = n => {
  if (!isInt(n) || n < 2) return false;
  for (let i = 2; i * i <= n; i++) if (n % i === 0) return false;
  return true;
};
const isPronic = n => { for (let k = 1; k * (k + 1) <= n; k++) if (k * (k + 1) === n) return true; return false; };
const isTriangular = n => isSquare(8 * n + 1);
const digitSum = n => String(Math.abs(n)).split('').reduce((a, c) => a + Number(c), 0);
const digitCount = n => String(Math.abs(n)).length;

/**
 * Salience is how readily a candidate reaches for the rule, not how hard the
 * arithmetic is:
 *   1  tried first by almost everyone
 *   2  a standard secondary rule
 *   3  only a strong candidate gets here
 *
 * `uniquePositive` marks the canonical "special number" classes. Only those may
 * compete in the *only one satisfies P* framing. Arbitrary divisibility may not:
 * "the only one divisible by 7" is an artefact of any set, not a reason for the
 * set to exist, whereas "all but one are multiples of 3" genuinely unifies five
 * numbers. `surface` marks magnitude classes, which are reported but never on
 * their own make a question AMBIGUOUS.
 */
export function approvedRules() {
  const rules = [
    {id: 'even', salience: 1, ar: 'عدد زوجي', test: n => isInt(n) && n % 2 === 0, uniquePositive: true},
    {id: 'odd', salience: 1, ar: 'عدد فردي', test: n => isInt(n) && Math.abs(n % 2) === 1, uniquePositive: true},
    {id: 'square', salience: 1, ar: 'مربع كامل', test: isSquare, uniquePositive: true},
    {id: 'prime', salience: 1, ar: 'عدد أولي', test: isPrime, uniquePositive: true},
    {id: 'cube', salience: 2, ar: 'مكعب كامل', test: isCube, uniquePositive: true},
    {id: 'pronic', salience: 2, ar: 'حاصل ضرب عددين متتاليين n(n+1)', test: isPronic, uniquePositive: true},
    {id: 'triangular', salience: 2, ar: 'عدد مثلثي', test: isTriangular, uniquePositive: true},
    {id: 'twiceAPrime', salience: 2, ar: 'ضعف عدد أولي', test: n => isInt(n) && n % 2 === 0 && isPrime(n / 2), uniquePositive: true},
    {id: 'sqMinus1', salience: 2, ar: 'مربع كامل − 1', test: n => isSquare(n + 1), uniquePositive: false},
    {id: 'sqPlus1', salience: 2, ar: 'مربع كامل + 1', test: n => isSquare(n - 1), uniquePositive: false}
  ];
  for (let k = 2; k <= 12; k++) {
    rules.push({
      id: `mult${k}`, salience: k <= 6 ? 1 : 2, ar: `مضاعف للعدد ${k}`,
      test: n => isInt(n) && n % k === 0,
      uniquePositive: false          // RC2-008: unifying framing only
    });
  }
  for (const c of [2, 4, 6, 8, 10, 12]) {
    rules.push({id: `primePlus${c}`, salience: 3, ar: `عدد أولي + ${c}`, test: n => isPrime(n - c), uniquePositive: false});
  }
  for (const k of [3, 6, 9]) {
    rules.push({id: `digitSum${k}`, salience: 3, ar: `مجموع أرقامه يقبل القسمة على ${k}`, test: n => isInt(n) && digitSum(n) % k === 0, uniquePositive: false});
  }
  for (const d of [1, 2, 3, 4]) {
    rules.push({
      id: `digits${d}`, salience: 1, ar: `عدد من ${d} خانة`,
      test: n => digitCount(n) === d,
      uniquePositive: true, surface: true     // RC2-008: magnitude, reported only
    });
  }
  return rules;
}

const RULES = approvedRules();

/**
 * Progressions are properties of the sorted remainder, so they are handled
 * apart. A number is only singled out when the other five form a progression
 * AND the removed number is not itself a term of that same progression.
 */
function progressionOutlier(numbers) {
  const found = [];
  for (let i = 0; i < numbers.length; i++) {
    const removed = numbers[i];
    const rest = numbers.filter((_, j) => j !== i).slice().sort((a, b) => a - b);
    const d = rest[1] - rest[0];
    if (d !== 0 && rest.every((v, k) => k === 0 || v - rest[k - 1] === d)) {
      if (!Number.isInteger((removed - rest[0]) / d)) {
        found.push({ruleId: 'arithmeticProgression', salience: 2, framing: 'allButOneSatisfy', outlier: removed, ar: 'متتالية حسابية', surface: false});
      }
    }
    if (rest[0] !== 0 && rest.every(v => v !== 0)) {
      const r = rest[1] / rest[0];
      if (r !== 1 && rest.every((v, k) => k === 0 || Math.abs(v / rest[k - 1] - r) < 1e-9)) {
        const ratio = removed / rest[0];
        const exp = Math.log(Math.abs(ratio)) / Math.log(Math.abs(r));
        if (!(ratio > 0 && Math.abs(exp - Math.round(exp)) < 1e-9)) {
          found.push({ruleId: 'geometricProgression', salience: 2, framing: 'allButOneSatisfy', outlier: removed, ar: 'متتالية هندسية', surface: false});
        }
      }
    }
  }
  return found;
}

/** Every rule that singles out exactly one member, in either framing. */
export function findSingleOutlierRules(numbers) {
  const out = [];
  for (const rule of RULES) {
    const failing = numbers.filter(n => !rule.test(n));
    const passing = numbers.filter(n => rule.test(n));
    if (failing.length === 1 && passing.length === numbers.length - 1) {
      out.push({ruleId: rule.id, salience: rule.salience, framing: 'allButOneSatisfy', outlier: failing[0], ar: rule.ar, surface: !!rule.surface});
    } else if (rule.uniquePositive && passing.length === 1 && failing.length === numbers.length - 1) {
      out.push({ruleId: rule.id, salience: rule.salience, framing: 'onlyOneSatisfies', outlier: passing[0], ar: rule.ar, surface: !!rule.surface});
    }
  }
  out.push(...progressionOutlier(numbers));
  return out;
}

/** A rule at or above this salience cannot make a question discoverable. */
export const DISCOVERABILITY_CEILING = 2;

export const VERDICT = Object.freeze({
  CLEAN: 'CLEAN',
  BORDERLINE: 'BORDERLINE',
  AMBIGUOUS: 'AMBIGUOUS',
  UNDISCOVERABLE: 'UNDISCOVERABLE',
  UNSUPPORTED: 'UNSUPPORTED'
});

/**
 * The publication decision.
 *
 *   UNSUPPORTED     no rule at all singles out the published key
 *   UNDISCOVERABLE  the key is only reachable by a rule above the ceiling
 *   AMBIGUOUS       a rule at or below the intended salience singles out a
 *                   different number — ONE such rule is enough (RC2-007)
 *   BORDERLINE      only a magnitude/digit-count pattern competes
 *   CLEAN           nothing competes
 */
export function classifyOddOneOut(numbers, intendedOutlier) {
  const rules = findSingleOutlierRules(numbers);
  const same = n => Number(n) === Number(intendedOutlier);

  const supporting = rules.filter(r => same(r.outlier) && !r.surface);
  const supportingSurface = rules.filter(r => same(r.outlier) && r.surface);
  if (!supporting.length && !supportingSurface.length) {
    return {verdict: VERDICT.UNSUPPORTED, rules, supporting: [], competing: [], surfaceCompeting: [], intendedSalience: null};
  }
  if (!supporting.length) {
    return {verdict: VERDICT.UNDISCOVERABLE, rules, supporting: [], competing: [], surfaceCompeting: [],
      intendedSalience: null, note: 'only a magnitude pattern supports the key'};
  }

  const intendedSalience = Math.min(...supporting.map(r => r.salience));
  if (intendedSalience > DISCOVERABILITY_CEILING) {
    return {verdict: VERDICT.UNDISCOVERABLE, rules, supporting, competing: [], surfaceCompeting: [], intendedSalience};
  }

  const competing = rules.filter(r => !same(r.outlier) && !r.surface && r.salience <= intendedSalience);
  if (competing.length) {
    return {verdict: VERDICT.AMBIGUOUS, rules, supporting, competing, surfaceCompeting: [], intendedSalience};
  }

  const surfaceCompeting = rules.filter(r => !same(r.outlier) && r.surface);
  return {
    verdict: surfaceCompeting.length ? VERDICT.BORDERLINE : VERDICT.CLEAN,
    rules, supporting, competing: [], surfaceCompeting, intendedSalience
  };
}

/**
 * Back-compatible shape for the pipeline. `ambiguous` is now true for anything
 * that must not be published, and the verdict carries the detail.
 */
export function checkOddOneOutAmbiguity(numbers, intendedOutlier) {
  const c = classifyOddOneOut(numbers, intendedOutlier);
  return {
    verdict: c.verdict,
    ambiguous: c.verdict === VERDICT.AMBIGUOUS,
    undiscoverable: c.verdict === VERDICT.UNDISCOVERABLE,
    borderline: c.verdict === VERDICT.BORDERLINE,
    competing: c.competing.map(r => [r, r]),
    surfaceCompeting: c.surfaceCompeting,
    rules: c.rules,
    supportsIntended: c.verdict !== VERDICT.UNSUPPORTED && c.supporting.length > 0,
    intendedSalience: c.intendedSalience,
    intendedOutlier
  };
}

/** Exhaustive oracle for the family: which numbers does the rule library single out? */
export function oracleOddOneOut(numbers) {
  const rules = findSingleOutlierRules(numbers);
  const outliers = [...new Set(rules.map(r => r.outlier))];
  const simplest = rules.slice().sort((a, b) => a.salience - b.salience)[0] || null;
  return {outliers, rules, simplest};
}
