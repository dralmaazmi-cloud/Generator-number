import {mk, usable, buildBase, eq, X, mul} from './_shared.js';
import {grid} from '../qa/oracle-engine.js';

const FRACS = [
  {d: 2, n: 'نصف', def: 'النصف'},
  {d: 3, n: 'ثلث', def: 'الثلث'},
  {d: 4, n: 'ربع', def: 'الربع'},
  {d: 5, n: 'خُمس', def: 'الخُمس'},
  {d: 6, n: 'سُدس', def: 'السُدس'},
  {d: 8, n: 'ثُمن', def: 'الثُمن'}
];

export function generateFractions({difficulty, rng, seed, engineVersion}) {
  const ctx = {difficulty, rng, seed, engineVersion, family: 'fractions', family_ar: 'الكسور المتتابعة', category: 'الكسور المتتابعة المباشرة'};
  const count = difficulty === 'easy' ? 2 : difficulty === 'medium' ? 3 : 4;
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
  const names = fracs.map(f => f.n).join(' ');
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
    const distractors = usable([
      ...fracs.map((f, i) => {
        const prod = fracs.reduce((p, g, j) => p * (j === i ? 1 : g.d), 1);
        return mk(total / prod, 'MISSED_ONE_FRACTION_STAGE', `${total} ÷ ${prod} بإسقاط ${f.def}`);
      }),
      mk(total / fracs[0].d, 'STOPPED_AFTER_FIRST_STAGE', `${total} ÷ ${fracs[0].d}`),
      mk(total / fracs.at(-1).d, 'APPLIED_FRACTION_TO_ORIGINAL', `${total} ÷ ${fracs.at(-1).d} من العدد الأصلي`),
      mk(correct * 2, 'APPLIED_STEP_TWICE', `${correct} × 2`),
      mk(correct + multiplier, 'OFF_BY_ONE_STEP', `${correct} + ${multiplier}`),
      mk(Math.max(1, correct - multiplier), 'OFF_BY_ONE_STEP', `${correct} − ${multiplier}`),
      mk(total / (denomProduct * fracs[0].d), 'APPLIED_STEP_TWICE', `${total} ÷ (${denomProduct} × ${fracs[0].d})`),
      mk(total / (denomProduct * fracs.at(-1).d), 'APPLIED_STEP_TWICE', `${total} ÷ (${denomProduct} × ${fracs.at(-1).d})`),
      mk(total, 'USED_ORIGINAL_TOTAL', `العدد الأصلي ${total}`),
      mk(correct + 2 * multiplier, 'OFF_BY_ONE_STEP', `${correct} + ${2 * multiplier}`),
      mk(Math.max(1, correct - 2 * multiplier), 'OFF_BY_ONE_STEP', `${correct} − ${2 * multiplier}`)
    ]);
    return buildBase(ctx, {
      ...shared,
      subskill: `${count} كسور مباشرة متتابعة من عدد معلوم`,
      difficulty: ctx.difficulty,
      question: `ما قيمة ${names} العدد ${total}؟`,
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
    const distractors = usable([
      mk(result * fracs[0].d, 'STOPPED_AFTER_FIRST_STAGE', `${result} × ${fracs[0].d}`),
      mk(result * (denomProduct / fracs.at(-1).d), 'MISSED_ONE_FRACTION_STAGE', `${result} × ${denomProduct / fracs.at(-1).d}`),
      mk(result * (denomProduct / fracs[0].d), 'MISSED_ONE_FRACTION_STAGE', `${result} × ${denomProduct / fracs[0].d}`),
      mk(result / denomProduct, 'APPLIED_OPERATION_IN_REVERSE', `${result} ÷ ${denomProduct}`),
      mk(result + denomProduct, 'ADDED_INSTEAD_OF_SCALING', `${result} + ${denomProduct}`),
      mk(correct * 2, 'APPLIED_STEP_TWICE', `${correct} × 2`),
      mk(correct + denomProduct, 'OFF_BY_ONE_STEP', `${correct} + ${denomProduct}`),
      mk(Math.max(1, correct - denomProduct), 'OFF_BY_ONE_STEP', `${correct} − ${denomProduct}`)
    ]);
    return buildBase(ctx, {
      ...shared,
      subskill: `${count} كسور متتابعة — إيجاد العدد الأصلي`,
      difficulty: ctx.difficulty,
      question: `${names} عدد يساوي ${result}. فما العدد؟`,
      correct, distractors, format: v => String(v),
      steps: [
        `أخذ ${names} يعني القسمة على ${denomList.join(' ثم على ')}.`,
        `حاصل ضرب المقامات = ${denomList.join(' × ')} = ${denomProduct}.`,
        `إذن العدد ÷ ${denomProduct} = ${result}، ومنه العدد = ${result} × ${denomProduct} = ${correct}.`
      ],
      howToStart: 'اعكس العمليات: ما قُسم عليه يُضرب فيه عند الرجوع.',
      remember: 'الرجوع من الناتج إلى العدد الأصلي يعني الضرب في حاصل ضرب المقامات.',
      fastMethod: `${result} × ${denomProduct} = ${correct}.`,
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
  const knownNames = knownFracs.map(f => f.n).join(' ');
  const correct = hidden.def;
  const distractors = usable(
    FRACS.filter(f => f.d !== hidden.d).map(f =>
      mk(f.def, 'MISSED_ONE_FRACTION_STAGE', `القسمة على ${f.d} بدل ${hidden.d}`))
  );
  return buildBase(ctx, {
    ...shared,
    subskill: `${count} كسور متتابعة — تحديد الكسر المجهول`,
    difficulty: ctx.difficulty,
    question: `${knownNames} العدد ${total} ثم كسرٌ منه يساوي ${result}. فما الكسر المجهول؟`,
    correct, distractors, format: v => String(v),
    steps: [
      `حاصل ضرب مقامات الكسور المعلومة = ${knownFracs.map(f => f.d).join(' × ')} = ${knownProduct}.`,
      `${knownNames} من العدد ${total} هو ${total} ÷ ${knownProduct} = ${total / knownProduct}.`,
      `بقي أن ننتقل من ${total / knownProduct} إلى ${result}.`,
      `${total / knownProduct} ÷ ${result} = ${hidden.d}، إذن الكسر المجهول هو ${hidden.def}.`
    ],
    howToStart: 'طبّق الكسور المعلومة أولًا، ثم قارن الناتج بالقيمة النهائية.',
    remember: 'الكسر المجهول هو نسبة الناتج قبله إلى الناتج بعده.',
    fastMethod: `${total / knownProduct} ÷ ${result} = ${hidden.d}.`,
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
