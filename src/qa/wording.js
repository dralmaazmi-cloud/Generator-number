// RC2.5-4. Two wording defects the Holdout E blind review found, promoted from
// "fixed in the template that showed them" to renderer-level rules that reject
// any question carrying them.
//
// Neither is a style preference. Each changes what the question ASKS:
//
//   ORDERING_WORD_AMBIGUITY   «مرتبة» reads as sorted ascending/descending. A
//                             stem that means positional order in a list — the
//                             first three entries, the last three, the middle
//                             one — is then saying something it does not mean,
//                             and under the numeric reading the stated averages
//                             can be outright contradictory. Positional order is
//                             said with positional words (قائمة، أول، آخر،
//                             الموضع); the sorting lexeme is reserved for stems
//                             that genuinely sort, and those must name the
//                             direction (تصاعديًا / تنازليًا) so the reading is
//                             fixed rather than inferred.
//
//   RATE_ANSWER_NOT_RATE_UNIT A stem asking «فما معدله» or «كم … في الساعة»
//                             has an answer that is a rate. An option reading
//                             «60 وحدة» states a quantity, not a rate, so the
//                             option set silently answers a different question.
//                             The answer must carry a per-unit-time unit.

import {INVARIANT_UNITS} from '../arabic/units.js';

/** Sorting lexeme: مرتب / مرتبة / مرتبين / مرتبات / ترتيب تصاعدي… */
const ORDERING_LEXEME = /(?:^|[\s،.؛:("])(?:مرتب(?:ة|ين|ات|ون|ان)?|بترتيب|مُرتَّب(?:ة|ين|ات)?)(?=$|[\s،.؛:)"؟])/u;

/** Words that fix the sorting reading, and so license the lexeme. */
const SORT_DIRECTION = /(تصاعدي|تنازلي|تصاعديًا|تنازليًا|من الأصغر|من الأكبر)/u;

/**
 * Positional selectors. Their presence is what makes the sorting lexeme a
 * genuine ambiguity rather than an unused word: the stem is simultaneously
 * asking the reader to count positions and telling them the values are sorted.
 */
const POSITIONAL_SELECTOR = /(أول\s|آخر\s|المنتصف|الأوسط|الموضع|المرتبة\s)/u;

/**
 * A stem whose ANSWER is a rate. Deliberately narrow: it matches the ask, not
 * any mention of a rate. «يعمل جهاز بمعدل 20 وحدة/ساعة … كم وحدة أنجز؟» gives a
 * rate and asks for a quantity, and must not be caught.
 */
const ASKS_FOR_RATE = [
  /(?:فما|ما)\s+(?:معدل|المعدل|سرعة|السرعة)\S*\s*\S*؟/u,
  /معدل(?:ه|ها)\s+الأصلي\s*؟/u,
  /كم\s+\S+\s+(?:تنتج|ينتج|تنجز|ينجز|يقطع|تقطع)\s+\S+(?:\s+\S+)*\s+في\s+(?:الساعة|الدقيقة|اليوم)\s*؟/u,
  /كم\s+\S+\s+في\s+(?:الساعة|الدقيقة|اليوم)\s*؟/u
];

const RATE_UNIT_IDS = new Set(
  Object.keys(INVARIANT_UNITS).filter(k => INVARIANT_UNITS[k].includes('/')));

/** The rendered rate symbols themselves, for checking option text directly. */
const RATE_SYMBOLS = Object.values(INVARIANT_UNITS).filter(v => v.includes('/'));

export function asksForARate(stem) {
  return typeof stem === 'string' && ASKS_FOR_RATE.some(re => re.test(stem));
}

export function isRateUnitId(unitId) {
  return unitId != null && RATE_UNIT_IDS.has(unitId);
}

/**
 * Flags each rendered string that uses the sorting lexeme without naming a
 * direction while also selecting by position.
 */
export function checkOrderingWords(texts = []) {
  const offenders = [];
  for (const t of texts) {
    if (typeof t !== 'string') continue;
    if (!ORDERING_LEXEME.test(t)) continue;
    if (SORT_DIRECTION.test(t)) continue;      // the sorting reading is stated
    if (!POSITIONAL_SELECTOR.test(t)) continue; // nothing positional to confuse
    offenders.push(t);
  }
  return offenders;
}

/**
 * Flags a rate answer whose options are rendered in a non-rate unit.
 *
 * `answerUnitId` is what the template's format declares. When it is absent the
 * option text is checked directly, so a template that formats by hand is still
 * covered.
 */
export function checkRateAnswerUnit({stem, answerUnitId = null, optionTexts = []} = {}) {
  if (!asksForARate(stem)) return null;
  if (isRateUnitId(answerUnitId)) return null;
  const rendered = optionTexts.filter(t => typeof t === 'string');
  if (rendered.length && rendered.every(t => RATE_SYMBOLS.some(s => t.includes(s)))) return null;
  return {
    stem,
    answerUnitId,
    sample: rendered.slice(0, 3),
    note: 'the stem asks for a rate; the options are not rendered in a per-unit-time unit'
  };
}
