// RC2-002 / RC2-016 / RC2-017. Classification of the Arabic numeric and count
// constructions this generator emits.
//
// The RC1 validator matched one shape only — a numeral immediately followed by
// one of 21 lexicon units — and everything else passed unexamined. Three defect
// classes lived in that blind spot: a definite plural followed by a bare
// numeral (متوسط القيم 9), a dual in the nominative where the governor requires
// the genitive (إنجاز مهمتان, كل سنتيمتران تمثل), and a definite adjective on an
// indefinite إضافة (سعر سلعة المعلن).
//
// This is deliberately NOT a general Arabic grammar engine. It covers the
// finite set of constructions the generator actually produces, and anything it
// does not recognise is reported as UNCLASSIFIED_NUMERIC_CONSTRUCTION rather
// than passing silently. An unclassified construction is a gap in this table,
// and the corpus report is where those gaps become visible.

import {UNITS, UNIT_ALIASES, checkArabicNumberUnits} from './units.js';

export const STATUS = Object.freeze({
  VALID: 'CLASSIFIED_VALID',
  INVALID: 'CLASSIFIED_INVALID',
  EXEMPT: 'EXPLICITLY_EXEMPT',
  UNCLASSIFIED: 'UNCLASSIFIED_NUMERIC_CONSTRUCTION'
});

// Arabic letters plus the diacritics the generator emits (tanwin, shadda,
// sukun). Leaving these out silently truncated words such as درهمًا to درهم and
// produced false reports — the first version of this file did exactly that.
const AR = 'ء-يً-ْٰ';
const W = `[${AR}]+`;
const TOKEN = new RegExp(`\\d+(?:\\.\\d+)?|[${AR}]+|[^\\s]`, 'g');

/** Words that govern a following noun into the genitive (إضافة or حرف جر). */
const GENITIVE_GOVERNORS = [
  'إنجاز', 'لإنجاز', 'صنع', 'لصنع', 'إنتاج', 'لإنتاج', 'شراء', 'بيع',
  'كل', 'بعد', 'قبل', 'خلال', 'لمدة', 'مدة'
];

/**
 * Definite plurals the generator counts. The rule "a definite noun may not take
 * a bare numeral" only applies to a counted noun: العدد 540 is apposition and
 * السعر المعلن 200 درهمًا is a predicate, and neither is a count.
 */
const DEFINITE_COUNT_NOUNS = ['القيم', 'الأيام', 'الساعات', 'العمال', 'الآلات', 'المهام', 'الأشخاص', 'القطع', 'الوحدات'];

/**
 * Heads of the إضافة constructions the generator builds. The definiteness rule
 * fires only for these, because deciding in general whether a following word is
 * a second noun or an adjective needs a lexicon this validator does not have.
 * Without that restriction the rule reported متوسط القيم and معدل أ الكلي as
 * errors — the first version of this file did exactly that.
 */
const IDAFA_HEADS = ['سعر', 'قيمة', 'تكلفة', 'ثمن', 'مبلغ', 'وزن', 'طول', 'مساحة', 'حجم'];

/** Adjectives the generator attaches to a noun phrase. */
const KNOWN_ADJECTIVES = ['المعلن', 'الجديد', 'الجديدة', 'الباقية', 'الباقي', 'الفعلية', 'الفعلي', 'الكلية', 'الكلي', 'الأصلي', 'الأصلية', 'المتبقية', 'المتبقي'];

/** Nouns the generator uses in counted positions that are not lexicon units. */
const KNOWN_COUNT_NOUNS = ['قيم', 'قيمة', 'قيمتان', 'قيمتين', 'مهمة', 'مهام', 'سلعة', 'أشخاص', 'شخص', 'قطع', 'قطعة'];

/**
 * A numeral is only a COUNT when a countable noun follows it. In every other
 * position it is a value, and number-noun agreement does not apply.
 *
 * These are the closed classes the generator actually emits, each with the role
 * that makes the numeral a value rather than a count. They are declared, not
 * whitelisted away: a word outside this table keeps its UNCLASSIFIED status so
 * a genuinely new construction still surfaces in the corpus report.
 */
const NON_COUNT_FOLLOWERS = {
  // conjunctions and prepositions: "8 و27 و64", "من 1 حتى n", "القسمة على 5 بدل 3"
  'و': 'PARTICLE', 'ثم': 'PARTICLE', 'في': 'PARTICLE', 'من': 'PARTICLE', 'إلى': 'PARTICLE',
  'حتى': 'PARTICLE', 'دون': 'PARTICLE', 'بدل': 'PARTICLE', 'كل': 'PARTICLE', 'لا': 'PARTICLE',
  'هو': 'PARTICLE', 'بقيمة': 'PARTICLE', 'وزمن': 'PARTICLE', 'والثانية': 'PARTICLE',
  'على': 'PARTICLE', 'عن': 'PARTICLE', 'مع': 'PARTICLE',
  // RC2-012 introduced derivations that name a value and then qualify it
  // adverbially: «إعادة الحد 42 كما هو»، «الفرق 7 وحده». The word after the
  // numeral is an adverbial, not a counted noun.
  'كما': 'PARTICLE', 'وحده': 'PARTICLE', 'وحدها': 'PARTICLE', 'نفسه': 'PARTICLE', 'نفسها': 'PARTICLE',
  // verbs: the numeral is the subject or object of the clause, not a count
  'يحقق': 'VERB', 'وتزيد': 'VERB', 'ليتساوى': 'VERB', 'تعطي': 'VERB', 'واضرب': 'VERB',
  'وتجاهلت': 'VERB', 'وابحث': 'VERB', 'وتحرك': 'VERB', 'واطرح': 'VERB', 'واجمع': 'VERB',
  // the numeral is an exponent, an ordinal or a percentage, not a quantity
  'أُس': 'EXPONENT', 'مرفوعًا': 'EXPONENT', 'بالترتيب': 'ORDINAL', 'بالمئة': 'PERCENT_WORD',
  'إشارة': 'PREDICATE', 'أطول': 'PREDICATE',
  // the algebraic unknown, written joined to its coefficient: 4ك، 5س
  'ك': 'ALGEBRAIC_SYMBOL', 'س': 'ALGEBRAIC_SYMBOL',
  // RC2.9.3-2. The narrated eliminations: «3 : 1 تعني أن …», «في 3 ونُبقي الثانية».
  'تعني': 'VERB', 'ونُبقي': 'VERB'
};

/** Shapes that carry numerals but are not counted-noun constructions at all. */
const EXEMPT_SHAPES = [
  {id: 'PERCENT', re: /\d+(?:\.\d+)?\s*%/},
  {id: 'RATIO_TERM', re: /\d+\s*:\s*\d+/},
  {id: 'ARITHMETIC', re: /\d+(?:\.\d+)?\s*[×÷+−\-=]/}
];

const isDualNominative = w => /ان$/.test(w) && w.length > 3;
// Definite includes the article carried behind a prefixed particle: بالسعر,
// للسعر, كالسعر, فالسعر, والسعر are all definite.
const isDefinite = w => /^(?:[بلكفو])?ال/.test(w);
const isProperNameLetter = w => w.length <= 2;
const isNumber = t => /^\d/.test(t);

/**
 * Every numeric or count construction in one string, each with a verdict.
 *
 * Tokenised rather than matched with pairwise regexes: a global pairwise regex
 * consumes its matches, so "عمال إنجاز مهمتان" tested only the first pair and
 * the defect in the second slipped past. That was a defect in this file, found
 * by running it against the very examples it exists to catch.
 *
 * @returns {Array<{status, id, text, detail}>}
 */
export function classifyConstructions(text) {
  if (typeof text !== 'string' || !text.trim()) return [];
  const tokens = text.match(TOKEN) || [];
  const out = [];
  const seen = new Set();
  const record = (status, id, matchText, detail) => {
    const key = `${id}|${matchText}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({status, id, text: matchText, detail});
  };

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i], next = tokens[i + 1], after = tokens[i + 2];

    // --- a counted definite plural followed by a bare numeral (RC2-002) ------
    if (DEFINITE_COUNT_NOUNS.includes(t) && next && isNumber(next)) {
      record(STATUS.INVALID, 'DEFINITE_COUNT_NOUN_THEN_BARE_NUMERAL', `${t} ${next}`,
        `${t} يحتاج عددًا موافقًا لا رقمًا مجردًا`);
      continue;
    }
    if (/^(العدد|الرقم)$/.test(t) && next && isNumber(next)) {
      record(STATUS.EXEMPT, 'DEFINITE_NOUN_NAMING_A_NUMBER', `${t} ${next}`, t);
      continue;
    }

    // --- a governor followed by a dual in the nominative (RC2-016) -----------
    if (GENITIVE_GOVERNORS.includes(t) && next && isDualNominative(next)) {
      record(STATUS.INVALID, 'GOVERNOR_THEN_NOMINATIVE_DUAL', `${t} ${next}`,
        `${t} يجرّ ما بعده، والصواب صيغة المثنى المجرورة`);
    }

    // --- a definite adjective on an indefinite إضافة (RC2-017) --------------
    if (next && after && KNOWN_ADJECTIVES.includes(after)
        && IDAFA_HEADS.includes(t)
        && !isDefinite(next) && !isProperNameLetter(next)
        && !isNumber(next)) {
      record(STATUS.INVALID, 'INDEFINITE_IDAFA_THEN_DEFINITE_ADJECTIVE', `${t} ${next} ${after}`,
        `${t} ${next} نكرة فلا تُوصف بـ${after}`);
    }

    // --- a numeral followed by a noun ---------------------------------------
    if (isNumber(t) && next && !isNumber(next) && new RegExp(`^[${AR}]`).test(next)) {
      const window = text.slice(Math.max(0, text.indexOf(t)), text.indexOf(t) + t.length + 12);
      const full = `${t} ${next}`;
      const isRate = tokens[i + 2] === '/' || next === '/';
      if (isRate) { record(STATUS.EXEMPT, 'RATE_SYMBOL', full, next); continue; }
      const exempt = EXEMPT_SHAPES.find(sh => sh.re.test(window));
      const inLexicon = Boolean(UNITS[next] || UNIT_ALIASES[next]) || Object.values(UNITS).some(u =>
        [u.singular, u.one, u.dual, u.dualOblique, u.plural, u.accSing].includes(next));
      if (inLexicon) {
        const {violations} = checkArabicNumberUnits(full);
        if (violations.length) record(STATUS.INVALID, 'NUMERAL_THEN_UNIT', full, violations[0].expected);
        else record(STATUS.VALID, 'NUMERAL_THEN_UNIT', full, next);
        continue;
      }
      if (exempt) { record(STATUS.EXEMPT, exempt.id, full, next); continue; }
      if (KNOWN_COUNT_NOUNS.includes(next)) { record(STATUS.VALID, 'NUMERAL_THEN_KNOWN_COUNT_NOUN', full, next); continue; }
      // A word carrying a proclitic preposition (بـ، لـ، كـ) heads a
      // prepositional phrase, so the numeral before it is a value rather than a
      // count: "5 بإسقاط أحد الكسور". A lexicon unit is never written this way,
      // and a test asserts that a prefixed unit would still be checked.
      const prepositional = /^[بلك][\u0621-\u064A]{3,}$/.test(next)
        && !UNITS[next] && !UNIT_ALIASES[next];
      if (prepositional) { record(STATUS.EXEMPT, 'NUMERAL_THEN_PREPOSITIONAL_PHRASE', full, next); continue; }
      const role = NON_COUNT_FOLLOWERS[next];
      if (role) { record(STATUS.EXEMPT, `NUMERAL_THEN_${role}`, full, next); continue; }
      // A counted noun after a numeral must be indefinite: 5 قيم, never 5 القيم.
      if (isDefinite(next)) {
        record(STATUS.INVALID, 'NUMERAL_THEN_DEFINITE_NOUN', full, `${next} يجب أن تكون نكرة بعد العدد`);
        continue;
      }
      record(STATUS.UNCLASSIFIED, 'NUMERAL_THEN_UNKNOWN_NOUN', full, next);
    }
  }

  return out;
}

/** Runs the classifier over every rendered string of a question. */
export function classifyQuestionConstructions(strings) {
  const all = [];
  for (const s of strings) all.push(...classifyConstructions(s).map(c => ({...c, source: s})));
  return {
    constructions: all,
    invalid: all.filter(c => c.status === STATUS.INVALID),
    unclassified: all.filter(c => c.status === STATUS.UNCLASSIFIED)
  };
}
