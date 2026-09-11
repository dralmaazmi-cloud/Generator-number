// Section 9. An odd-one-out item is only sound when no *competing simple rule*
// singles out a different number. The oracle for this family is therefore a
// sweep of the whole approved rule library, not a check of the intended rule.

const isInt = n => Number.isInteger(n);
const isSquare = n => n >= 0 && Number.isInteger(Math.sqrt(n));
const isCube = n => { if (n < 0) return false; const r = Math.round(Math.cbrt(n)); return r ** 3 === n; };
const isPrime = n => {
  if (!isInt(n) || n < 2) return false;
  for (let i = 2; i * i <= n; i++) if (n % i === 0) return false;
  return true;
};
const isPronic = n => { for (let k = 1; k * (k + 1) <= n; k++) if (k * (k + 1) === n) return true; return false; };
const digitSum = n => String(Math.abs(n)).split('').reduce((a, c) => a + Number(c), 0);

/**
 * The approved rule grammar (Section 9). `complexity` is how hard the rule is to
 * *see*, which is what decides whether two rules genuinely compete.
 */
export function approvedRules() {
  const rules = [
    {id: 'even', complexity: 1, ar: 'عدد زوجي', test: n => isInt(n) && n % 2 === 0},
    {id: 'odd', complexity: 1, ar: 'عدد فردي', test: n => isInt(n) && Math.abs(n % 2) === 1},
    {id: 'square', complexity: 2, ar: 'مربع كامل', test: isSquare},
    {id: 'prime', complexity: 2, ar: 'عدد أولي', test: isPrime},
    {id: 'cube', complexity: 3, ar: 'مكعب كامل', test: isCube},
    {id: 'pronic', complexity: 3, ar: 'حاصل ضرب عددين متتاليين n(n+1)', test: isPronic}
  ];
  for (let k = 2; k <= 12; k++) {
    rules.push({id: `mult${k}`, complexity: k <= 6 ? 1 : 2, ar: `مضاعف للعدد ${k}`, test: n => isInt(n) && n % k === 0});
  }
  for (const c of [1, 2, 3, 4, 5, 6, 10]) {
    rules.push({id: `sqPlus${c}`, complexity: 4, ar: `مربع كامل + ${c}`, test: n => isSquare(n - c)});
    rules.push({id: `sqMinus${c}`, complexity: 4, ar: `مربع كامل − ${c}`, test: n => isSquare(n + c)});
    rules.push({id: `primePlus${c}`, complexity: 4, ar: `عدد أولي + ${c}`, test: n => isPrime(n - c)});
  }
  for (const k of [3, 6, 9]) {
    rules.push({id: `digitSum${k}`, complexity: 4, ar: `مجموع أرقامه يقبل القسمة على ${k}`, test: n => isInt(n) && digitSum(n) % k === 0});
  }
  return rules;
}

const RULES = approvedRules();

/**
 * Progressions are properties of the *sorted remainder*, so they are handled
 * apart. A number is only singled out when the other five form a progression
 * AND the removed number is not itself a term of that same progression — if the
 * whole set is already an arithmetic run, dropping an endpoint singles out
 * nobody.
 */
function progressionOutlier(numbers) {
  const found = [];
  for (let i = 0; i < numbers.length; i++) {
    const removed = numbers[i];
    const rest = numbers.filter((_, j) => j !== i).slice().sort((a, b) => a - b);
    const d = rest[1] - rest[0];
    if (d !== 0 && rest.every((v, k) => k === 0 || v - rest[k - 1] === d)) {
      const offset = (removed - rest[0]) / d;
      const fitsSameProgression = Number.isInteger(offset);
      if (!fitsSameProgression) {
        found.push({ruleId: 'arithmeticProgression', complexity: 2, outlier: removed, ar: 'متتالية حسابية'});
      }
    }
    if (rest[0] !== 0 && rest.every(v => v !== 0)) {
      const r = rest[1] / rest[0];
      if (r !== 1 && rest.every((v, k) => k === 0 || Math.abs(v / rest[k - 1] - r) < 1e-9)) {
        const ratio = removed / rest[0];
        const exp = Math.log(Math.abs(ratio)) / Math.log(Math.abs(r));
        const fitsSameProgression = ratio > 0 && Math.abs(exp - Math.round(exp)) < 1e-9;
        if (!fitsSameProgression) {
          found.push({ruleId: 'geometricProgression', complexity: 3, outlier: removed, ar: 'متتالية هندسية'});
        }
      }
    }
  }
  return found;
}

/**
 * Every rule under which exactly one of the numbers fails.
 * @returns {Array<{ruleId, complexity, outlier, ar}>}
 */
export function findSingleOutlierRules(numbers) {
  const out = [];
  for (const rule of RULES) {
    const failing = numbers.filter(n => !rule.test(n));
    if (failing.length === 1) out.push({ruleId: rule.id, complexity: rule.complexity, outlier: failing[0], ar: rule.ar});
  }
  out.push(...progressionOutlier(numbers));
  return out;
}

export const AMBIGUITY_COMPLEXITY_CEILING = 3;
export const AMBIGUITY_COMPLEXITY_DELTA = 2;

/**
 * Section 9. Rejects only when two *low-complexity* rules of comparable
 * difficulty single out different numbers. An artificial, complicated competing
 * rule is not grounds for rejection.
 */
export function checkOddOneOutAmbiguity(numbers, intendedOutlier) {
  const rules = findSingleOutlierRules(numbers);
  const simple = rules.filter(r => r.complexity <= AMBIGUITY_COMPLEXITY_CEILING);
  const competing = [];
  for (let i = 0; i < simple.length; i++) {
    for (let j = i + 1; j < simple.length; j++) {
      const a = simple[i], b = simple[j];
      if (a.outlier === b.outlier) continue;
      if (Math.abs(a.complexity - b.complexity) <= AMBIGUITY_COMPLEXITY_DELTA) competing.push([a, b]);
    }
  }
  const supporting = rules.filter(r => r.outlier === intendedOutlier);
  return {
    ambiguous: competing.length > 0,
    competing,
    rules,
    supportsIntended: supporting.length > 0,
    intendedOutlier
  };
}

/** Exhaustive oracle for the family: which number does the rule library single out? */
export function oracleOddOneOut(numbers) {
  const rules = findSingleOutlierRules(numbers);
  const outliers = [...new Set(rules.map(r => r.outlier))];
  const simplest = rules.slice().sort((a, b) => a.complexity - b.complexity)[0] || null;
  return {outliers, rules, simplest};
}
