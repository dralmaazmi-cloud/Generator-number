// RC2.7-3. The realization layer: one mathematical instance, many tellings.
//
// The RC2.6 inventory measured 137 templates against 178 constructions and,
// across eleven of the sixteen families, between one and three STEM SKELETONS
// per template. That ratio is the whole finding: a template was a fixed
// sentence with numeric holes, so every instance of it read as the same
// question with the numbers changed, and no count of templates could hide that
// from a reader working through fifty items.
//
// What varies here is not vocabulary. Three independent things vary:
//
//   SCENARIO          which situation the question is set in — a press printing
//                     pages, a nursery raising seedlings, a bakery — supplied by
//                     src/compose/scenarios.js and chosen per instance.
//
//   INFORMATION ORDER in which order the facts arrive, including whether the
//                     OUTCOME is stated before its causes or after them. Only
//                     permitted where the template declares its clauses
//                     self-contained; a clause that begins «ثم» or refers back
//                     to «الباقي» is not, and such a template keeps its order.
//
//   STEM STRUCTURE    how the clauses are joined into Modern Standard Arabic:
//                     one compact sentence, a sequence of short sentences, an
//                     explicit list of givens, or the question asked first with
//                     the data attached. These are different sentence shapes,
//                     not different words for the same shape.
//
// A template hands over finished CLAUSES, never a finished sentence, so the
// mathematics, the units and the number/unit agreement are all settled before
// this file sees them. Nothing here computes, rounds, or introduces a numeral.

/** The stem shapes. Each is a genuinely different Arabic sentence structure. */
export const STRUCTURES = Object.freeze(['compact', 'sequential', 'listed', 'question_first']);

/** Information orders. `outcome_first` needs a clause marked as the outcome. */
export const ORDERS = Object.freeze(['given', 'outcome_first', 'rotated']);

const strip = s => String(s ?? '').trim().replace(/[.،؛]+$/u, '');

function joinCompact(clauses) {
  if (clauses.length === 1) return `${clauses[0]}.`;
  const [head, ...rest] = clauses;
  return `${head}، ${rest.map(c => `و${c}`).join('، ')}.`;
}

const joinSequential = clauses => clauses.map(c => `${c}.`).join(' ');

const joinListed = clauses => `المعطيات: ${clauses.join('؛ ')}.`;

/**
 * Compose a stem.
 *
 * @param {object} spec
 * @param {string[]} spec.facts     self-contained clauses, no terminal stop
 * @param {string} spec.ask         the question, ending in ؟
 * @param {string} [spec.askFirst]  a NOUN PHRASE naming the requested quantity,
 *                                  for the question-first layout; when absent
 *                                  `question_first` is not offered
 * @param {boolean} [spec.orderFree] may the clauses be reordered
 * @param {number} [spec.outcomeIndex] which clause states the outcome
 * @param {string[]} [spec.allow]   restrict the structures offered
 * @param {object} rng              the seeded RNG; nothing here reads the answer
 */
export function realizeStem(rng, spec) {
  const facts = (spec.facts ?? []).map(strip).filter(Boolean);
  if (!facts.length) throw Object.assign(new Error('REALIZE_NO_FACTS'), {code: 'REALIZE_NO_FACTS'});
  const ask = String(spec.ask ?? '').trim();
  if (!ask) throw Object.assign(new Error('REALIZE_NO_ASK'), {code: 'REALIZE_NO_ASK'});

  const offered = (spec.allow ?? STRUCTURES).filter(s =>
    STRUCTURES.includes(s) && (s !== 'question_first' || Boolean(spec.askFirst)));
  // `listed` reads as a form only when there is more than one given.
  const usable = offered.filter(s => s !== 'listed' || facts.length > 1);
  const structure = usable.length ? rng.pick(usable) : 'sequential';

  const orderable = spec.orderFree === true && facts.length > 1;
  const outcomeIndex = Number.isInteger(spec.outcomeIndex) ? spec.outcomeIndex : -1;
  const orders = ['given'];
  if (orderable) {
    orders.push('rotated');
    if (outcomeIndex >= 0 && outcomeIndex < facts.length) orders.push('outcome_first');
  }
  const order = rng.pick(orders);
  let arranged = facts;
  if (order === 'rotated') {
    const k = 1 + rng.int(0, facts.length - 2);
    arranged = [...facts.slice(k), ...facts.slice(0, k)];
  } else if (order === 'outcome_first') {
    arranged = [facts[outcomeIndex], ...facts.filter((_, i) => i !== outcomeIndex)];
  }

  let text;
  if (structure === 'question_first') {
    // The exam layout: what is wanted, then what is given. `askFirst` is a NOUN
    // PHRASE naming the requested quantity rather than a question — an
    // interrogative here would need a second question mark and read as two
    // sentences pretending to be one.
    text = `المطلوب: ${strip(spec.askFirst)}. المعطيات: ${arranged.map(strip).join('؛ ')}.`;
  } else if (structure === 'compact') {
    text = `${joinCompact(arranged)} ${ask}`;
  } else if (structure === 'listed') {
    text = `${joinListed(arranged)} ${ask}`;
  } else {
    text = `${joinSequential(arranged)} ${ask}`;
  }
  return {text: text.replace(/\s+/g, ' ').trim(), structure, order};
}
