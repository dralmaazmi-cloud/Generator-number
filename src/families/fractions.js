import {mk, usable, buildBase, eq, X, mul, sub, resample, fractionChainPhrase, composeSentences, askOf, u, unitFormat, distinctValues} from './_shared.js';
import {grid} from '../qa/oracle-engine.js';
import {PERSONS} from '../compose/entities.js';

const MALE_NAMES = PERSONS.filter(p => p.g === 'm').map(p => p.w);
import {structuralBandOf} from '../qa/structure.js';

const FRACTION_TEMPLATE_IDS = ['FRAC_E_2', 'FRAC_M_3', 'FRAC_H_4', 'FRAC_M_REMAIN', 'FRAC_M_REMAIN_VALUE', 'FRAC_M_START_FROM_REMAINDER', 'FRAC_M_COMPARE_SHARES'];
const FRACTION_BANDS = new Set(FRACTION_TEMPLATE_IDS.map(structuralBandOf));

const FRACS = [
  {d: 2, n: 'نصف', def: 'النصف'},
  {d: 3, n: 'ثلث', def: 'الثلث'},
  {d: 4, n: 'ربع', def: 'الربع'},
  {d: 5, n: 'خُمس', def: 'الخُمس'},
  {d: 6, n: 'سُدس', def: 'السُدس'},
  {d: 8, n: 'ثُمن', def: 'الثُمن'}
];

export function generateFractions({difficulty, rng, seed, engineVersion, telemetry, pinTemplate = null, pinTargets = null}) {
  const ctx = {difficulty, rng, seed, engineVersion, telemetry, pinTargets, family: 'fractions', family_ar: 'الكسور المتتابعة', category: 'الكسور المتتابعة المباشرة'};
  // RC2.2-1/2. This family chains one operation — take a fraction of — and the
  // chain length is what used to set its band. Under the RC2.2 scorer that is
  // workload, not reasoning depth: two, three and four links all compute easy,
  // which is what the Holdout C review said when it called FRAC_H_4 not hard.
  // Rather than release an easy item under a harder label, the family declines
  // the bands it cannot reach.
  //
  // RC2.3-1. The refusal is no longer a hard-coded band test. The three ids this
  // family can emit differ only in CHAIN LENGTH, and the structural adjudication
  // puts all three at easy for that reason, so the bands it declines follow from
  // the adjudication rather than from a second opinion recorded here.
  if (!FRACTION_BANDS.has(difficulty)) {
    throw Object.assign(
      new Error(`NO_TEMPLATE_AT_DIFFICULTY: fractions has no template that computes ${difficulty}`),
      {code: 'NO_TEMPLATE_AT_DIFFICULTY', family: 'fractions', difficulty}
    );
  }
  // RC2.8-4. The one job this family could not do.
  //
  // Three templates, and all three ran the same chain of «a fraction of a
  // fraction of» — forward, or inverted to find the number, or inverted to find
  // the fraction. Every one of them handed back a NUMBER. What a reader meets
  // three times is «another chained-fractions question», because that is what it
  // is. This asks what is LEFT instead: the parts are taken away one after the
  // other and the answer is the fraction of the original that survives, which is
  // a different quantity, a different layout (a whole being partitioned rather
  // than a chain being walked) and a different piece of reasoning — the
  // complement at each stage, not the part.
  // RC2.9.4-B3. The MEDIUM band now holds four constructions; an unpinned
  // medium draw picks among them.
  const MEDIUM = {FRAC_M_REMAIN: remainingFraction, FRAC_M_REMAIN_VALUE: remainingAmount,
    FRAC_M_START_FROM_REMAINDER: startFromRemainder, FRAC_M_COMPARE_SHARES: compareShares};
  if (pinTemplate && MEDIUM[pinTemplate]) return MEDIUM[pinTemplate](ctx);
  if (!pinTemplate && difficulty === 'medium') return rng.pick(Object.values(MEDIUM))(ctx);
  // RC2.8-2. Every other template id in this family IS its chain length, so a
  // pin on the id pins the length; everything else still varies with the seed.
  const PIN_LENGTH = {FRAC_E_2: 2, FRAC_M_3: 3, FRAC_H_4: 4};
  if (pinTemplate && !PIN_LENGTH[pinTemplate]) {
    throw Object.assign(
      new Error(`TEMPLATE_PIN_UNAVAILABLE: ${pinTemplate} is not a template of fractions`),
      {code: 'TEMPLATE_PIN_UNAVAILABLE', family: 'fractions', difficulty, pin: pinTemplate}
    );
  }
  const count = pinTemplate ? PIN_LENGTH[pinTemplate] : rng.pick([2, 3, 4]);
  // Section 17-A / 27: the audit found every item in this family pointing the
  // same way. The template is unchanged; what rotates is which quantity is
  // unknown, so the direction of reasoning genuinely varies.
  // RC2.8-2. The three directions ARE the three unknowns this family can ask
  // for, so the blueprint's target pin selects among them directly. One draw,
  // whether or not a pin is present, so the seed means the same thing either way.
  const TARGET_DIRECTION = {chainResult: 'forward', startNumber: 'findNumber', hiddenFraction: 'findFraction'};
  const direction = TARGET_DIRECTION[askOf(ctx, rng, Object.keys(TARGET_DIRECTION))];
  return buildFractionItem(ctx, count, direction);
}

function templateIdFor(count) {
  return count === 2 ? 'FRAC_E_2' : count === 3 ? 'FRAC_M_3' : 'FRAC_H_4';
}

function buildFractionItem(ctx, count, direction) {
  const {rng} = ctx;
  const fracs = rng.sample(FRACS, count);
  const denomProduct = fracs.reduce((p, f) => p * f.d, 1);
  const multiplier = count === 2 ? rng.pick([12, 15, 18, 20, 24])
    : count === 3 ? rng.pick([6, 8, 10, 12, 15])
    : rng.pick([2, 3, 4, 5, 6]);
  const total = denomProduct * multiplier;
  const result = total / denomProduct;
  const names = fracs.map(f => f.n);
  const templateId = templateIdFor(count);
  const denomList = fracs.map(f => f.d);

  const chainSteps = [];
  let running = total;
  for (const f of fracs) {
    const next = running / f.d;
    chainSteps.push(`${f.def} من العدد ${running} هو ${running} ÷ ${f.d} = ${next}.`);
    running = next;
  }

  const shared = {
    templateId,
    estimatedSteps: count,
    conceptTags: ['fractions', 'sequential-operations'],
    stageCount: count,
    commutative: {denominators: [...denomList].sort((a, b) => a - b)},
    // RC2-022: the chain is a product of unit fractions, so the order they are
    // spoken in is presentation. ثلث ربع نصف and نصف ثلث ربع are one question.
    // Both parameter shapes are covered: the full chain, and the known part of
    // it in the hidden-fraction direction.
    orderInsensitive: ['denominators', 'knownDenominators'],
    complexityFactors: {
      reasoningTransformations: count,
      conceptCount: 1,
      stageCount: count,
      arithmeticBurden: count,
      dependencyDepth: count
    }
  };

  if (direction === 'forward') {
    const correct = result;
    const distractors = usable(ctx, [
      ...fracs.map((f, i) => {
        const prod = fracs.reduce((p, g, j) => p * (j === i ? 1 : g.d), 1);
        return mk(total / prod, 'MISSED_ONE_FRACTION_STAGE', `${total} ÷ ${prod} بإسقاط ${f.def}`);
      }),
      mk(total / fracs[0].d, 'STOPPED_AFTER_FIRST_STAGE', `${total} ÷ ${fracs[0].d}`),
      mk(total / fracs.at(-1).d, 'APPLIED_FRACTION_TO_ORIGINAL', `${total} ÷ ${fracs.at(-1).d} من العدد الأصلي`),
      mk(total / (denomProduct * fracs[0].d), 'APPLIED_STEP_TWICE', `${total} ÷ (${denomProduct} × ${fracs[0].d})`),
      mk(total / (denomProduct * fracs.at(-1).d), 'APPLIED_STEP_TWICE', `${total} ÷ (${denomProduct} × ${fracs.at(-1).d})`),
      mk(total, 'USED_ORIGINAL_TOTAL', `العدد الأصلي ${total}`),
      mk(total / (denomProduct / fracs[0].d), 'MISSED_ONE_FRACTION_STAGE', `${total} ÷ ${denomProduct / fracs[0].d}`),
      // RC2-012: deepened.
      mk(total / denomProduct * 2, 'APPLIED_STEP_TWICE', `${total} ÷ ${denomProduct} × 2`),
      mk(total - denomProduct, 'SUBTRACTED_INSTEAD_OF_ADDED', `${total} − ${denomProduct}`),
      mk(denomProduct, 'USED_GIVEN_VALUE_AS_ANSWER', `حاصل ضرب المقامات ${denomProduct}`)
    ]);
    const stem = composeSentences(ctx, `${fractionChainPhrase(names, `العدد ${total}`)}. ما الناتج؟`);
    return buildBase(ctx, {
      ...shared,
      subskill: `${count} كسور مباشرة متتابعة من عدد معلوم`,
      difficulty: ctx.difficulty,
      question: stem.text,
      stemStructure: stem.structure, informationOrder: stem.order,
      correct, distractors, format: v => String(v),
      steps: [...chainSteps],
      howToStart: 'طبّق الكسور واحدًا بعد الآخر على الناتج السابق، ولا تستخدم مفهوم «الباقي».',
      remember: 'في الكسور المباشرة المتتابعة، كل كسر يؤخذ من الناتج الذي قبله.',
      fastMethod: `اضرب المقامات: ${denomList.join(' × ')} = ${denomProduct}، ثم ${total} ÷ ${denomProduct} = ${correct}.`,
      parameters: {startNumber: total, denominators: denomList},
      oracle: {kind: 'constraint', answerKind: 'number', constraints: [eq(mul(X, denomProduct), total)]},
      askedUnknown: 'chainResult',
      pedagogy: {
        targetSkill: 'SEQUENTIAL_FRACTIONS', targetMisconception: 'MISSED_ONE_FRACTION_STAGE',
        wrongMethodValue: total / (denomProduct / fracs.at(-1).d)
      },
      textParams: {essentialParams: ['startNumber']}
    });
  }

  if (direction === 'findNumber') {
    const correct = total;
    const distractors = usable(ctx, [
      mk(result * fracs[0].d, 'STOPPED_AFTER_FIRST_STAGE', `${result} × ${fracs[0].d}`),
      mk(result * (denomProduct / fracs.at(-1).d), 'MISSED_ONE_FRACTION_STAGE', `${result} × ${denomProduct / fracs.at(-1).d}`),
      mk(result * (denomProduct / fracs[0].d), 'MISSED_ONE_FRACTION_STAGE', `${result} × ${denomProduct / fracs[0].d}`),
      mk(result / denomProduct, 'APPLIED_OPERATION_IN_REVERSE', `${result} ÷ ${denomProduct}`),
      mk(result + denomProduct, 'ADDED_INSTEAD_OF_SCALING', `${result} + ${denomProduct}`),
      mk(result * denomProduct * denomProduct, 'APPLIED_STEP_TWICE', `${result} × ${denomProduct} × ${denomProduct}`)
    ]);
    const stem = composeSentences(ctx, `${fractionChainPhrase(names, 'عدد')}، فكان الناتج ${result}. فما العدد؟`);
    return buildBase(ctx, {
      ...shared,
      subskill: `${count} كسور متتابعة — إيجاد العدد الأصلي`,
      difficulty: ctx.difficulty,
      question: stem.text,
      stemStructure: stem.structure, informationOrder: stem.order,
      correct, distractors, format: v => String(v),
      steps: [
        `${fractionChainPhrase(names, 'عدد')} يعني القسمة على ${denomList.join(' ثم على ')}.`,
        `حاصل ضرب المقامات = ${denomList.join(' × ')} = ${denomProduct}.`,
        `إذن العدد ÷ ${denomProduct} = ${result}، ومنه العدد = ${result} × ${denomProduct} = ${correct}.`
      ],
      howToStart: 'اعكس العمليات: ما قُسم عليه يُضرب فيه عند الرجوع.',
      remember: 'الرجوع من الناتج إلى العدد الأصلي يعني الضرب في حاصل ضرب المقامات.',
      // RC2-019: a reusable rule, with the instance after it.
      fastMethod: `اضرب الناتج النهائي في حاصل ضرب المقامات لتعود إلى العدد الأصلي — هنا ${result} × ${denomProduct} = ${correct}.`,
      parameters: {chainResult: result, denominators: denomList},
      oracle: {kind: 'constraint', answerKind: 'number', constraints: [eq(X, mul(result, denomProduct))]},
      askedUnknown: 'startNumber',
      pedagogy: {
        targetSkill: 'REVERSE_SEQUENTIAL_FRACTIONS', targetMisconception: 'APPLIED_OPERATION_IN_REVERSE',
        wrongMethodValue: result / denomProduct
      },
      textParams: {essentialParams: ['chainResult']}
    });
  }

  // findFraction: the last denominator is the unknown, and the oracle sweeps
  // every fraction in the lexicon to check exactly one of them fits.
  const hidden = fracs.at(-1);
  const knownFracs = fracs.slice(0, -1);
  const knownProduct = knownFracs.reduce((p, f) => p * f.d, 1);
  const knownNames = knownFracs.map(f => f.n);
  const correct = hidden.def;
  const distractors = usable(ctx, 
    FRACS.filter(f => f.d !== hidden.d).map(f =>
      mk(f.def, 'MISSED_ONE_FRACTION_STAGE', `القسمة على ${f.d} بدل ${hidden.d}`))
  );
  const stem = composeSentences(ctx, // RC2.8-6. «ثم كسرٌ من الناتج» named neither what the fraction is nor which
    // result it acts on. «كسرٌ مجهول من الناتج الأخير» says both.
    `${fractionChainPhrase(knownNames, `العدد ${total}`)}، ثم كسرٌ مجهول من الناتج الأخير، فكان الناتج ${result}. فما هذا الكسر؟`);
  return buildBase(ctx, {
    ...shared,
    subskill: `${count} كسور متتابعة — تحديد الكسر المجهول`,
    difficulty: ctx.difficulty,
    question: stem.text,
    stemStructure: stem.structure, informationOrder: stem.order,
    correct, distractors, format: v => String(v),
    steps: [
      `حاصل ضرب مقامات الكسور المعلومة = ${knownFracs.map(f => f.d).join(' × ')} = ${knownProduct}.`,
      `${fractionChainPhrase(knownNames, `العدد ${total}`)} = ${total} ÷ ${knownProduct} = ${total / knownProduct}.`,
      `بقي أن ننتقل من ${total / knownProduct} إلى ${result}.`,
      `الكسر المجهول = الناتج بعده ÷ الناتج قبله = ${result} ÷ ${total / knownProduct}.`,
      `${total / knownProduct} ÷ ${result} = ${hidden.d}، وهذا مقام الكسر، فالكسر المجهول هو ${hidden.def}.`
    ],
    howToStart: 'طبّق الكسور المعلومة أولًا، ثم قارن الناتج بالقيمة النهائية.',
    // RC2-018. The rule taught here was the reverse of the quantity asked for:
    // previous ÷ next gives the DENOMINATOR, while the fraction itself is
    // next ÷ previous. The keys were right; the generalisation was not.
    remember: 'الكسر المجهول = الناتج بعده ÷ الناتج قبله. أما قسمة الناتج قبله على الناتج بعده فتعطي مقام الكسر لا الكسر نفسه.',
    // RC2-019. A reusable rule first; the instance may follow it, never stand
    // in for it.
    fastMethod: `اقسم الناتج السابق على الناتج النهائي فتحصل على مقام الكسر، ثم الكسر هو واحد على ذلك المقام — هنا ${total / knownProduct} ÷ ${result} = ${hidden.d}، فالكسر ${hidden.def}.`,
    parameters: {startNumber: total, knownDenominators: knownFracs.map(f => f.d), chainResult: result},
    oracle: {
      kind: 'search',
      answerKind: 'number',
      domain: grid(2, 8),
      constraints: [eq(mul(X, mul(result, knownProduct)), total)],
      labels: Object.fromEntries(FRACS.map(f => [String(f.d), f.def]))
    },
    askedUnknown: 'hiddenFraction',
    pedagogy: {
      targetSkill: 'IDENTIFY_FRACTION', targetMisconception: 'MISSED_ONE_FRACTION_STAGE'
    },
    textParams: {essentialParams: ['startNumber', 'chainResult']}
  });
}

/** Greatest common divisor, for reducing the surviving fraction. */
function gcd(a, b) { return b === 0 ? Math.abs(a) : gcd(b, a % b); }

/**
 * RC2.8-4. «What is left», as a fraction of the original.
 *
 * A third of a sum is spent, then a fifth of what remains. The answer is not a
 * quantity — no total is ever given — but the fraction of the original amount
 * that survives: (1 − 1/3) × (1 − 1/5) = 8/15. The solver has to work with the
 * complement at each stage, which is the move the forward chain never asks for,
 * and the temptation the wrong options carry is to subtract the two fractions
 * from one instead of composing the remainders.
 */
function remainingFraction(ctx) {
  const {rng} = ctx;
  const [first, second] = rng.sample(FRACS.filter(f => f.d >= 3), 2);
  const num = (first.d - 1) * (second.d - 1);
  const den = first.d * second.d;
  const g = gcd(num, den);
  const correct = `${num / g}/${den / g}`;
  const asFraction = (n, d) => {
    const k = gcd(n, d);
    return `${n / k}/${d / k}`;
  };
  // Each wrong option is a real way of composing the two fractions: subtracting
  // both from the whole, taking the second share of the ORIGINAL rather than of
  // the remainder, keeping the part instead of the remainder, and stopping after
  // the first stage.
  const naive = den - second.d - first.d;
  const offered = [
    [asFraction(naive > 0 ? naive : 1, den), 'SUBTRACTED_BOTH_FROM_THE_WHOLE',
      `1 − 1/${first.d} − 1/${second.d}`],
    [asFraction(1, den), 'APPLIED_FRACTION_TO_ORIGINAL', `1/${first.d} × 1/${second.d}`],
    [asFraction(first.d - 1, first.d), 'STOPPED_AT_INTERMEDIATE_TOTAL', `1 − 1/${first.d}`],
    [asFraction(second.d - 1, second.d), 'STOPPED_AT_INTERMEDIATE_TOTAL', `1 − 1/${second.d}`],
    [asFraction(first.d + second.d - 2, den), 'SUBTRACTED_BOTH_FROM_THE_WHOLE',
      `(${first.d} − 1) + (${second.d} − 1) على ${den}`],
    [asFraction(num, den + first.d), 'APPLIED_FRACTION_TO_ORIGINAL',
      `الباقي على ${den + first.d} بدل ${den}`],
    [asFraction(first.d * second.d - first.d - second.d + 2, den), 'SUBTRACTED_BOTH_FROM_THE_WHOLE',
      `الطرح مرة واحدة زائدة عن اللازم`],
    [asFraction(second.d - 1, first.d), 'APPLIED_FRACTION_TO_ORIGINAL',
      `بسط المرحلة الثانية على مقام المرحلة الأولى`]
  ];
  // Several of these collapse onto the same reduced fraction for some pairs of
  // denominators — a repeated option is not a choice — so the list is deduped
  // and the item is drawn again if fewer than five survive.
  // «1/1» is not a fraction anybody writes, and an option that reduces to the
  // whole is not a mistake a learner makes — it is a rendering accident.
  const seenValues = new Set([correct]);
  const distractors = usable(ctx, offered
    .filter(([v]) => !/^\d+\/1$/.test(v) && v !== '1/1')
    .filter(([v]) => !seenValues.has(v) && seenValues.add(v))
    .map(([v, id, why]) => mk(v, id, why)));
  if (distractors.length < 5) return resample(ctx, remainingFraction);
  const stem = composeSentences(ctx,
    `أُنفق ${first.n} مبلغٍ من المال، ثم أُنفق ${second.n} ما تبقى منه. `
    + 'ما الكسر الذي يمثل ما بقي من المبلغ الأصلي؟');
  return buildBase(ctx, {
    templateId: 'FRAC_M_REMAIN',
    subskill: 'الباقي بعد إنفاق كسرين متتاليين',
    difficulty: 'medium',
    question: stem.text,
    stemStructure: stem.structure, informationOrder: stem.order,
    correct, distractors, format: v => String(v),
    steps: [
      `بعد إنفاق ${first.n} يبقى 1 − 1/${first.d} = ${first.d - 1}/${first.d} من المبلغ.`,
      `ثم يُنفق ${second.n} هذا الباقي، فيبقى منه 1 − 1/${second.d} = ${second.d - 1}/${second.d}.`,
      `الباقي من المبلغ الأصلي = ${first.d - 1}/${first.d} × ${second.d - 1}/${second.d} = ${asFraction(num, den)}.`
    ],
    howToStart: 'احسب ما يبقى بعد كل إنفاق، لا ما يُنفق.',
    remember: 'الكسر الثاني يُؤخذ من الباقي، فالكسران يُضربان ولا يُطرحان.',
    fastMethod: `اضرب المتبقيين مباشرة: ${first.d - 1}/${first.d} × ${second.d - 1}/${second.d}.`,
    estimatedSteps: 3, conceptTags: ['fractions', 'complement', 'partition'],
    parameters: {firstDenominator: first.d, secondDenominator: second.d},
    // The two stages are NOT interchangeable: a third then a fifth of the rest
    // leaves the same fraction as a fifth then a third of the rest, so the pair
    // is order-insensitive and two spoken orders are one question.
    commutative: {denominators: [first.d, second.d].sort((a, b) => a - b)},
    orderInsensitive: ['denominators'],
    // The oracle re-derives the surviving numerator from the two denominators
    // rather than being handed it: over the common denominator d₁ × d₂, what is
    // left after a share of each stage is (d₁ − 1)(d₂ − 1). The label maps that
    // integer onto the reduced fraction the item prints.
    oracle: {
      kind: 'search', answerKind: 'number',
      domain: grid(1, first.d * second.d),
      constraints: [eq(X, mul(sub(first.d, 1), sub(second.d, 1)))],
      labels: {[String(num)]: correct}
    },
    askedUnknown: 'remainingFraction', stageCount: 2, direction: 'forward',
    pedagogy: {
      targetSkill: 'COMPOSE_REMAINDERS', targetMisconception: 'SUBTRACTED_BOTH_FROM_THE_WHOLE',
      // The wrong method is «1 − 1/d₁ − 1/d₂», taking both shares from the
      // original. It can never coincide with the key: the key is
      // (d₁−1)(d₂−1)/d₁d₂ = (d₁d₂ − d₁ − d₂ + 1)/d₁d₂, which is exactly one
      // over d₁d₂ MORE than the wrong method, for every pair of denominators.
      // So the item is never degenerate, and this says so rather than leaving
      // the model absent.
      wrongMethodValue: asFraction(naive > 0 ? naive : 1, den),
      degenerateWhen: [{when: false,
        note: 'taking both shares from the original always falls short of the key by exactly 1/(d₁d₂)'}]
    },
    complexityFactors: {reasoningTransformations: 3, conceptCount: 2, stageCount: 2, arithmeticBurden: 3, dependencyDepth: 2},
    textParams: false
  });
}

// ---------------------------------------------------------------------------
// RC2.9.4-B3. Three more MEDIUM constructions. FRAC_M_REMAIN asks the surviving
// FRACTION with no amount in sight. These put an AMOUNT on the page and run the
// remainder idea three other ways: forward to what is left of a stated sum;
// backward from what is left to the sum that was started with; and a non-unit
// share of a whole compared against its complement.
// ---------------------------------------------------------------------------

/** Non-unit fractions above one half, as Arabic words, with p/q and 2p − q ≠ 1
 *  so that «one part of the whole» can never coincide with the share gap. */
const SHARE_FRACS = [
  {p: 3, q: 4, n: 'ثلاثة أرباع'}, {p: 5, q: 8, n: 'خمسة أثمان'}, {p: 4, q: 5, n: 'أربعة أخماس'},
  {p: 5, q: 6, n: 'خمسة أسداس'}, {p: 7, q: 10, n: 'سبعة أعشار'}, {p: 5, q: 7, n: 'خمسة أسباع'},
  {p: 7, q: 9, n: 'سبعة أتساع'}, {p: 9, q: 10, n: 'تسعة أعشار'}
];

function remainingAmount(ctx) {
  const {rng} = ctx;
  const [first, second] = rng.sample(FRACS.filter(f => f.d >= 3), 2);
  const k = rng.pick([10, 15, 20, 25, 30, 40, 50]);
  const total = first.d * second.d * k;
  const afterFirst = total - total / first.d;
  const correct = afterFirst - afterFirst / second.d;
  const spent1 = total / first.d;
  const spent2 = afterFirst / second.d;
  const params = {startAmount: total, firstDenominator: first.d, secondDenominator: second.d};
  const distractors = usable(ctx, [
    mk(total - spent1 - total / second.d, 'SUBTRACTED_BOTH_FROM_THE_WHOLE', `${total} − ${spent1} − ${total / second.d}`, 2),
    mk(afterFirst, 'STOPPED_AFTER_FIRST_STAGE', `${total} − ${spent1}`, 2),
    mk(spent1 + spent2, 'ANSWERED_THE_OTHER_COMPONENT', `${spent1} + ${spent2}`, 3),
    mk(total / first.d / second.d, 'APPLIED_FRACTION_TO_ORIGINAL', `${total} ÷ ${first.d} ÷ ${second.d}`, 2),
    mk(spent2, 'ANSWERED_THE_OTHER_COMPONENT', `${afterFirst} ÷ ${second.d}`, 3),
    mk(total - spent2, 'MISSED_ONE_FRACTION_STAGE', `${total} − ${spent2}`, 3),
    mk(afterFirst - total / second.d, 'APPLIED_FRACTION_TO_ORIGINAL', `${afterFirst} − ${total / second.d}`, 2)
  ]);
  if (distinctValues(distractors.filter(d => d.value !== correct)) < 5) return resample(ctx, remainingAmount);
  const name = rng.pick(MALE_NAMES);
  const stem = composeSentences(ctx, `كان مع ${name} ${u(total, 'dirham')}، فأنفق ${first.n}ها، ثم أنفق ${second.n} ما تبقى. كم درهمًا بقي معه؟`);
  return buildBase(ctx, {
    templateId: 'FRAC_M_REMAIN_VALUE',
    subskill: 'المبلغ الباقي بعد إنفاق كسر ثم كسر من الباقي',
    difficulty: 'medium',
    question: stem.text,
    stemStructure: stem.structure, informationOrder: stem.order,
    correct, distractors, format: unitFormat('dirham'),
    steps: [
      `الإنفاق الأول = ${total} ÷ ${first.d} = ${spent1}، فيبقى ${total} − ${spent1} = ${afterFirst}.`,
      `الإنفاق الثاني يُؤخذ من الباقي: ${afterFirst} ÷ ${second.d} = ${spent2}.`,
      `الباقي = ${afterFirst} − ${spent2} = ${correct}.`
    ],
    howToStart: 'احسب الباقي بعد الإنفاق الأول قبل تطبيق الكسر الثاني.',
    remember: 'الكسر الثاني يُؤخذ من الباقي، لا من المبلغ الأصلي.',
    fastMethod: `اضرب المبلغ في الباقيين مباشرة — هنا ${total} × ${first.d - 1}/${first.d} × ${second.d - 1}/${second.d}.`,
    estimatedSteps: 3, conceptTags: ['fractions', 'complement', 'remainder'], parameters: params,
    oracle: {kind: 'constraint', answerKind: 'number', constraints: [eq(mul(X, first.d, second.d), mul(total, sub(first.d, 1), sub(second.d, 1)))]},
    askedUnknown: 'remainingAmount', stageCount: 2,
    pedagogy: {
      targetSkill: 'COMPOSE_REMAINDERS', targetMisconception: 'SUBTRACTED_BOTH_FROM_THE_WHOLE',
      wrongMethodValue: total - spent1 - total / second.d,
      degenerateWhen: [{when: false, note: 'taking the second share from the original always differs from the key by total/(d₁d₂)'}]
    },
    complexityFactors: {reasoningTransformations: 3, conceptCount: 2, stageCount: 2, arithmeticBurden: 4},
    textParams: {essentialParams: ['startAmount']}
  });
}

function startFromRemainder(ctx) {
  const {rng} = ctx;
  const [first, second] = rng.sample(FRACS.filter(f => f.d >= 3), 2);
  const k = rng.pick([10, 15, 20, 25, 30, 40]);
  const correct = first.d * second.d * k;
  const afterFirst = correct - correct / first.d;
  const rem = afterFirst - afterFirst / second.d;
  const params = {remainingAmount: rem, firstDenominator: first.d, secondDenominator: second.d};
  const keptNum = (first.d - 1) * (second.d - 1);
  const den = first.d * second.d;
  const distractors = usable(ctx, [
    mk(rem * first.d / (first.d - 1), 'REVERSED_ONE_STAGE_ONLY', `${rem} × ${first.d} ÷ ${first.d - 1}`, 2),
    mk(rem * second.d / (second.d - 1), 'REVERSED_ONE_STAGE_ONLY', `${rem} × ${second.d} ÷ ${second.d - 1}`, 2),
    mk(rem * den / (den - first.d - second.d), 'SUBTRACTED_BOTH_FROM_THE_WHOLE', `${rem} ÷ (1 − 1/${first.d} − 1/${second.d})`, 1),
    mk(rem + rem / first.d + rem / second.d, 'APPLIED_FRACTION_TO_ORIGINAL', `${rem} + ${rem} ÷ ${first.d} + ${rem} ÷ ${second.d}`, 1),
    mk(rem * den, 'MULTIPLIED_INSTEAD_OF_DIVIDED', `${rem} × ${den}`, 2),
    mk(rem * keptNum / den, 'APPLIED_OPERATION_IN_REVERSE', `${rem} × ${keptNum} ÷ ${den}`, 2),
    mk(rem + correct / first.d, 'MISSED_ONE_FRACTION_STAGE', `${rem} + ${correct / first.d}`, 2)
  ], {maxDecimals: 1});
  if (distinctValues(distractors.filter(d => d.value !== correct)) < 5) return resample(ctx, startFromRemainder);
  const name = rng.pick(MALE_NAMES);
  const stem = composeSentences(ctx, `أنفق ${name} ${first.n} ما معه من المال، ثم أنفق ${second.n} ما تبقى، فبقي معه ${u(rem, 'dirham')}. كم درهمًا كان معه في البداية؟`);
  return buildBase(ctx, {
    templateId: 'FRAC_M_START_FROM_REMAINDER',
    subskill: 'المبلغ الأصلي من الباقي بعد كسرين متتاليين',
    difficulty: 'medium',
    question: stem.text,
    stemStructure: stem.structure, informationOrder: stem.order,
    correct, distractors, format: unitFormat('dirham'),
    steps: [
      `بعد الإنفاق الأول يبقى 1 − 1/${first.d} = ${first.d - 1}/${first.d} من المبلغ، وبعد الثاني يبقى 1 − 1/${second.d} = ${second.d - 1}/${second.d} من ذلك الباقي.`,
      `الباقي من المبلغ الأصلي = ${first.d - 1}/${first.d} × ${second.d - 1}/${second.d} = ${keptNum}/${den}.`,
      `المبلغ الأصلي = ${rem} × ${den} ÷ ${keptNum} = ${correct}.`
    ],
    howToStart: 'اكتب الجزء الباقي من المبلغ الأصلي ككسر واحد أولًا.',
    remember: 'الباقي بعد مرحلتين = حاصل ضرب الباقيين، ثم يُقسم المبلغ الباقي على هذا الكسر.',
    fastMethod: `اقسم الباقي على حاصل ضرب الباقيين — هنا ${rem} ÷ (${keptNum}/${den}).`,
    estimatedSteps: 3, conceptTags: ['fractions', 'complement', 'reverse'], parameters: params,
    oracle: {kind: 'constraint', answerKind: 'number', constraints: [eq(mul(X, keptNum), mul(rem, den))]},
    askedUnknown: 'startFromRemainder', stageCount: 2, direction: 'backward',
    pedagogy: {
      targetSkill: 'REVERSE_COMPOSED_REMAINDERS', targetMisconception: 'REVERSED_ONE_STAGE_ONLY',
      wrongMethodValue: rem * first.d / (first.d - 1),
      degenerateWhen: [{when: second.d === 1, note: 'no second stage to reverse'}]
    },
    complexityFactors: {reasoningTransformations: 3, conceptCount: 2, reverseReasoning: 1, stageCount: 2, arithmeticBurden: 4},
    textParams: {essentialParams: ['remainingAmount']}
  });
}

function compareShares(ctx) {
  const {rng} = ctx;
  const f = rng.pick(SHARE_FRACS);
  const k = rng.pick([10, 15, 20, 25, 30, 40, 50]);
  const total = f.q * k;
  const mine = f.p * k;
  const other = total - mine;
  const correct = mine - other;
  const params = {total, numerator: f.p, denominator: f.q};
  const distractors = usable(ctx, [
    mk(mine, 'STOPPED_AT_INTERMEDIATE_TOTAL', `${total} × ${f.p} ÷ ${f.q}`, 1),
    mk(other, 'ANSWERED_THE_OTHER_COMPONENT', `${total} − ${mine}`, 2),
    mk(k, 'USED_PART_VALUE_AS_ANSWER', `${total} ÷ ${f.q}`, 1),
    mk(2 * f.p - f.q, 'USED_DIFFERENCE_AS_ANSWER', `${f.p} − (${f.q} − ${f.p})`, 3),
    mk(mine + k, 'APPLIED_STEP_TWICE', `${mine} + ${k}`, 3),
    mk(total - k, 'MISSED_ONE_STAGE', `${total} − ${k}`, 2),
    mk(mine - k, 'SUBTRACTED_INSTEAD_OF_ADDED', `${mine} − ${k}`, 3)
  ]);
  if (distinctValues(distractors.filter(d => d.value !== correct)) < 5) return resample(ctx, compareShares);
  const [a, b] = rng.sample(MALE_NAMES, 2);
  const stem = composeSentences(ctx, `اقتسم ${a} و${b} مبلغ ${u(total, 'dirham')}، فأخذ ${a} ${f.n} المبلغ وأخذ ${b} الباقي. بكم درهمًا يزيد نصيب ${a} على نصيب ${b}؟`);
  return buildBase(ctx, {
    templateId: 'FRAC_M_COMPARE_SHARES',
    subskill: 'فرق نصيبين من كسر غير وحدوي ومتممه',
    difficulty: 'medium',
    question: stem.text,
    stemStructure: stem.structure, informationOrder: stem.order,
    correct, distractors, format: unitFormat('dirham'),
    steps: [
      `نصيب ${a} = ${total} × ${f.p} ÷ ${f.q} = ${mine}.`,
      `نصيب ${b} = ${total} − ${mine} = ${other}.`,
      `الفرق = ${mine} − ${other} = ${correct}.`
    ],
    howToStart: 'احسب نصيب صاحب الكسر، ثم الباقي هو نصيب الآخر.',
    remember: 'الباقي بعد كسر من الكل هو متمم ذلك الكسر، وفرق النصيبين ليس قيمة الجزء الواحد.',
    fastMethod: `الجزء الواحد ${k}، والفرق بالأجزاء ${2 * f.p - f.q}، فالفرق = ${2 * f.p - f.q} × ${k}.`,
    estimatedSteps: 3, conceptTags: ['fractions', 'complement', 'comparison'], parameters: params,
    oracle: {kind: 'constraint', answerKind: 'number', constraints: [eq(mul(X, f.q), mul(total, sub(mul(2, f.p), f.q)))]},
    askedUnknown: 'shareGap', stageCount: 2,
    pedagogy: {
      targetSkill: 'SHARE_AND_COMPLEMENT', targetMisconception: 'ANSWERED_THE_OTHER_COMPONENT',
      wrongMethodValue: other,
      degenerateWhen: [{when: 2 * f.p === f.q, note: 'equal halves: no gap'}]
    },
    complexityFactors: {reasoningTransformations: 3, conceptCount: 2, stageCount: 2, arithmeticBurden: 3},
    textParams: {essentialParams: ['total']}
  });
}
