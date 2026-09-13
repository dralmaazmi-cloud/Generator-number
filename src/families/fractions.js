import {mk, usable, buildBase, eq, X, mul, fractionChainPhrase, composeSentences} from './_shared.js';
import {grid} from '../qa/oracle-engine.js';
import {structuralBandOf} from '../qa/structure.js';

const FRACTION_TEMPLATE_IDS = ['FRAC_E_2', 'FRAC_M_3', 'FRAC_H_4'];
const FRACTION_BANDS = new Set(FRACTION_TEMPLATE_IDS.map(structuralBandOf));

const FRACS = [
  {d: 2, n: 'نصف', def: 'النصف'},
  {d: 3, n: 'ثلث', def: 'الثلث'},
  {d: 4, n: 'ربع', def: 'الربع'},
  {d: 5, n: 'خُمس', def: 'الخُمس'},
  {d: 6, n: 'سُدس', def: 'السُدس'},
  {d: 8, n: 'ثُمن', def: 'الثُمن'}
];

export function generateFractions({difficulty, rng, seed, engineVersion, telemetry}) {
  const ctx = {difficulty, rng, seed, engineVersion, telemetry, family: 'fractions', family_ar: 'الكسور المتتابعة', category: 'الكسور المتتابعة المباشرة'};
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
  const count = rng.pick([2, 3, 4]);
  // Section 17-A / 27: the audit found every item in this family pointing the
  // same way. The template is unchanged; what rotates is which quantity is
  // unknown, so the direction of reasoning genuinely varies.
  const direction = rng.pick(['forward', 'findNumber', 'findFraction']);
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
  const stem = composeSentences(ctx, `${fractionChainPhrase(knownNames, `العدد ${total}`)}، ثم كسرٌ من الناتج، فكان الناتج ${result}. فما هذا الكسر؟`);
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
