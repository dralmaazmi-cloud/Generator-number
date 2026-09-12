import {Fraction} from '../qa/fraction.js';
import {mk, usable, u, num, approx, unitFormat, buildBase, eq, X, add, sub, mul, resample, bandPool} from './_shared.js';

export function generateProfitLoss({difficulty, rng, seed, engineVersion, telemetry}) {
  const ctx = {difficulty, rng, seed, engineVersion, telemetry, family: 'profit_loss', family_ar: 'الربح والخسارة والأسعار', category: 'الربح والخسارة والأسعار'};
  // RC2.3-1. The catalogue, not a set of per-band pools: which of these is
  // eligible for the requested band is decided by the structural adjudication in
  // src/qa/structure.js, so a template cannot sit in a band nobody adjudicated.
  return bandPool(rng, 'profit_loss', difficulty, [
    ['PL_E_PROFIT', simpleProfit],
    ['PL_E_LOSS', simpleLoss],
    ['PL_H_REVERSE', reverseSellingPrice],
    ['PL_M_TOTAL_COST', totalCostProfit],
    ['PL_M_DISC_MARK', discountThenSale],
    ['PL_H_CHAIN', discountMarkupChain]
  ])(ctx);
}

const pct = v => `${num(v)}%`;
const money = unitFormat('dirham');

function simpleProfit(ctx) {
  const {rng} = ctx;
  // RC2-011. The percentage the stem states IS the answer here, so the answer
  // space was the length of this list. Widened at design time; the integrality
  // guard below still decides which draws survive.
  const buy = rng.pick([100, 120, 125, 150, 160, 180, 200, 240, 250, 300, 320, 400, 450, 500]);
  const percent = rng.pick([5, 8, 10, 12, 15, 16, 20, 24, 25, 30, 35, 40, 45, 50]);
  const profit = buy * percent / 100;
  if (!Number.isInteger(profit)) return resample(ctx, simpleProfit);
  const sell = buy + profit;
  const correct = percent;
  const params = {buyPrice: buy, sellPrice: sell};
  const distractors = usable(ctx, [
    mk(profit, 'REPORTED_AMOUNT_INSTEAD_OF_PERCENT', `${sell} − ${buy}`),
    mk(approx(sell / buy * 100), 'USED_ORIGINAL_TOTAL', `${sell} ÷ ${buy} × 100`),
    mk(approx(profit / sell * 100), 'USED_SALE_PRICE_AS_DENOMINATOR', `${profit} ÷ ${sell} × 100`),
    // RC2-012: four key-neighbour pads replaced by slips on the two prices.
    mk(approx(profit * 200 / buy), 'APPLIED_STEP_TWICE', `${profit} × 200 ÷ ${buy}`),
    mk(approx(sell * 100 / buy), 'USED_ORIGINAL_TOTAL', `${sell} × 100 ÷ ${buy}`),
    mk(100 - percent, 'TOOK_COMPLEMENT_PERCENT', `100 − ${percent}`),
    mk(approx(profit * 100 / (buy - profit)), 'USED_PURCHASE_PRICE_AS_DENOMINATOR', `${profit} × 100 ÷ (${buy} − ${profit})`),
    mk(approx(profit * 100 / (buy + sell)), 'USED_SALE_PRICE_AS_DENOMINATOR', `${profit} × 100 ÷ (${buy} + ${sell})`),
    mk(approx(profit * 50 / buy), 'APPLIED_STEP_TWICE', `${profit} × 50 ÷ ${buy}`)
  ]);
  return buildBase(ctx, {
    templateId: 'PL_E_PROFIT',
    subskill: 'نسبة ربح من سعر الشراء',
    difficulty: 'easy',
    question: `اشترى متجر سلعة بـ${u(buy, 'dirham', 'oblique')} وباعها بـ${u(sell, 'dirham', 'oblique')}. ما نسبة الربح من سعر الشراء؟`,
    correct, distractors, format: pct,
    steps: [
      `الربح بالدرهم = ${sell} − ${buy} = ${profit}.`,
      `نسبة الربح = ${profit} ÷ ${buy} × 100 = ${percent}.`
    ],
    howToStart: 'احسب الربح بالدرهم أولًا ثم قارنه بسعر الشراء.',
    remember: 'في نسبة الربح، المقام هو سعر الشراء إذا نص السؤال على ذلك.',
    fastMethod: 'الربح ÷ الشراء × 100.',
    estimatedSteps: 2, conceptTags: ['profit-loss', 'percentage'], parameters: params,
    oracle: {kind: 'constraint', answerKind: 'number', constraints: [eq(mul(X, buy), mul(sub(sell, buy), 100))]},
    askedUnknown: 'profitPercent', stageCount: 2,
    pedagogy: {
      targetSkill: 'PROFIT_PERCENT_BASE', targetMisconception: 'USED_SALE_PRICE_AS_DENOMINATOR',
      wrongMethodValue: profit / sell * 100
    },
    complexityFactors: {reasoningTransformations: 2, conceptCount: 2, stageCount: 2, arithmeticBurden: 2},
    textParams: {essentialParams: ['buyPrice', 'sellPrice']}
  });
}

function simpleLoss(ctx) {
  const {rng} = ctx;
  // RC2-011, as simpleProfit: the stated percentage is the answer.
  const buy = rng.pick([100, 120, 125, 150, 160, 180, 200, 240, 250, 300, 320, 400, 450, 500]);
  const percent = rng.pick([4, 5, 8, 10, 12, 15, 16, 20, 24, 25, 30, 35, 40]);
  const loss = buy * percent / 100;
  if (!Number.isInteger(loss)) return resample(ctx, simpleLoss);
  const sell = buy - loss;
  const correct = percent;
  const params = {buyPrice: buy, sellPrice: sell};
  const distractors = usable(ctx, [
    mk(loss, 'REPORTED_AMOUNT_INSTEAD_OF_PERCENT', `${buy} − ${sell}`),
    mk(approx(loss / sell * 100), 'USED_SALE_PRICE_AS_DENOMINATOR', `${loss} ÷ ${sell} × 100`),
    mk(approx(loss * 200 / buy), 'APPLIED_STEP_TWICE', `${loss} × 200 ÷ ${buy}`),
    mk(approx(buy * 100 / sell), 'USED_ORIGINAL_TOTAL', `${buy} × 100 ÷ ${sell}`),
    mk(approx(sell / buy * 100), 'TOOK_COMPLEMENT_PERCENT', `${sell} ÷ ${buy} × 100`),
    mk(100 - percent, 'TOOK_COMPLEMENT_PERCENT', `100 − ${percent}`),
    mk(approx(loss * 100 / (buy - loss)), 'USED_PURCHASE_PRICE_AS_DENOMINATOR', `${loss} × 100 ÷ (${buy} − ${loss})`),
    mk(approx(loss * 100 / (buy + sell)), 'USED_SALE_PRICE_AS_DENOMINATOR', `${loss} × 100 ÷ (${buy} + ${sell})`),
    mk(approx(loss * 50 / buy), 'APPLIED_STEP_TWICE', `${loss} × 50 ÷ ${buy}`)
  ]);
  return buildBase(ctx, {
    templateId: 'PL_E_LOSS',
    subskill: 'نسبة خسارة من سعر الشراء',
    difficulty: 'easy',
    question: `اشترى متجر سلعة بـ${u(buy, 'dirham', 'oblique')} وباعها بـ${u(sell, 'dirham', 'oblique')}. ما نسبة الخسارة من سعر الشراء؟`,
    correct, distractors, format: pct,
    steps: [
      `الخسارة بالدرهم = ${buy} − ${sell} = ${loss}.`,
      `نسبة الخسارة = ${loss} ÷ ${buy} × 100 = ${percent}.`
    ],
    howToStart: 'احسب مقدار الخسارة أولًا.',
    remember: 'استخدم سعر الشراء كأساس للنسبة عندما يطلب السؤال ذلك.',
    fastMethod: 'الخسارة ÷ الشراء × 100.',
    estimatedSteps: 2, conceptTags: ['profit-loss', 'percentage'], parameters: params,
    oracle: {kind: 'constraint', answerKind: 'number', constraints: [eq(mul(X, buy), mul(sub(buy, sell), 100))]},
    askedUnknown: 'lossPercent', stageCount: 2,
    pedagogy: {
      targetSkill: 'LOSS_PERCENT_BASE', targetMisconception: 'USED_SALE_PRICE_AS_DENOMINATOR',
      wrongMethodValue: loss / sell * 100
    },
    complexityFactors: {reasoningTransformations: 2, conceptCount: 2, stageCount: 2, arithmeticBurden: 2},
    textParams: {essentialParams: ['buyPrice', 'sellPrice']}
  });
}

function totalCostProfit(ctx) {
  const {rng} = ctx;
  // RC2-011. Three stated percentages meant three possible answers, and one of
  // them took 51.6% of the corpus on its own.
  const buy = rng.pick([120, 140, 160, 180, 200, 210, 240, 260, 300, 320, 360, 400]);
  const shipping = rng.pick([10, 15, 20, 24, 25, 30, 40, 50, 60]);
  const total = buy + shipping;
  const percent = rng.pick([5, 8, 10, 12, 15, 16, 20, 24, 25, 30, 35, 40]);
  const profit = total * percent / 100;
  if (!Number.isInteger(profit)) return resample(ctx, totalCostProfit);
  const sell = total + profit;
  const correct = percent;
  const params = {buyPrice: buy, shipping, sellPrice: sell};
  const distractors = usable(ctx, [
    mk(approx((sell - buy) / buy * 100), 'IGNORED_EXTRA_COST', `(${sell} − ${buy}) ÷ ${buy} × 100`),
    mk(approx(profit / buy * 100), 'USED_PURCHASE_PRICE_AS_DENOMINATOR', `${profit} ÷ ${buy} × 100`),
    mk(approx(profit / sell * 100), 'USED_SALE_PRICE_AS_DENOMINATOR', `${profit} ÷ ${sell} × 100`),
    mk(approx((sell - buy - shipping) * 200 / total), 'APPLIED_STEP_TWICE', `${sell - buy - shipping} × 200 ÷ ${total}`),
    mk(approx(sell * 100 / total), 'USED_ORIGINAL_TOTAL', `${sell} × 100 ÷ ${total}`),
    mk(approx(shipping / total * 100), 'TREATED_PERCENT_AS_AMOUNT', `${shipping} ÷ ${total} × 100`),
    mk(profit, 'REPORTED_AMOUNT_INSTEAD_OF_PERCENT', `${sell} − ${total}`)
  ]);
  return buildBase(ctx, {
    templateId: 'PL_M_TOTAL_COST',
    subskill: 'ربح كنسبة من التكلفة الكلية',
    difficulty: 'medium',
    question: `اشترى متجر سلعة بـ${u(buy, 'dirham', 'oblique')} ودفع ${u(shipping, 'dirham')} شحنًا وتجهيزًا، ثم باعها بـ${u(sell, 'dirham', 'oblique')}. ما نسبة الربح من إجمالي التكلفة؟`,
    correct, distractors, format: pct,
    steps: [
      `إجمالي التكلفة = ${buy} + ${shipping} = ${total}.`,
      `الربح = ${sell} − ${total} = ${profit}.`,
      `نسبة الربح = ${profit} ÷ ${total} × 100 = ${percent}.`
    ],
    howToStart: 'احسب التكلفة الكلية قبل حساب الربح.',
    remember: 'الشحن والتجهيز جزء من التكلفة إذا ذكرهما السؤال.',
    fastMethod: '(سعر البيع − التكلفة الكلية) ÷ التكلفة الكلية × 100.',
    estimatedSteps: 3, conceptTags: ['profit-loss', 'percentage'], parameters: params,
    oracle: {
      kind: 'constraint', answerKind: 'number',
      constraints: [eq(mul(X, add(buy, shipping)), mul(sub(sell, add(buy, shipping)), 100))]
    },
    askedUnknown: 'profitPercentOnTotalCost', stageCount: 3,
    pedagogy: {
      targetSkill: 'TOTAL_COST_BASE', targetMisconception: 'IGNORED_EXTRA_COST',
      wrongMethodValue: (sell - buy) / buy * 100,
      degenerateWhen: [{when: shipping === 0, note: 'no extra cost to fold in'}]
    },
    complexityFactors: {reasoningTransformations: 3, conceptCount: 2, stageCount: 3, arithmeticBurden: 3},
    textParams: {essentialParams: ['buyPrice', 'shipping', 'sellPrice']}
  });
}

function discountThenSale(ctx) {
  const {rng} = ctx;
  const tag = rng.pick([200, 240, 300, 400, 500]);
  const discount = rng.pick([10, 20, 25]);
  const cost = Fraction.from(tag).mul(100 - discount).div(100);
  const markup = rng.pick([10, 20, 25]);
  const sell = cost.mul(100 + markup).div(100);
  if (!cost.isInteger || !sell.isInteger) return resample(ctx, discountThenSale);
  const correct = sell.toNumber();
  const costN = cost.toNumber();
  const params = {listPrice: tag, discountPercent: discount, markupPercent: markup};
  const distractors = usable(ctx, [
    mk(approx(tag * (100 + markup) / 100), 'APPLIED_PERCENT_TO_ORIGINAL', `${tag} × (100 + ${markup}) ÷ 100`),
    mk(costN, 'STOPPED_AFTER_FIRST_STAGE', `${tag} × (100 − ${discount}) ÷ 100`),
    mk(approx(tag * (100 + markup - discount) / 100), 'ADDED_PERCENTAGES', `${tag} × (100 + ${markup} − ${discount}) ÷ 100`),
    mk(costN + markup, 'TREATED_PERCENT_AS_AMOUNT', `${costN} + ${markup}`),
    mk(tag, 'USED_ORIGINAL_TOTAL', `السعر المعلن ${tag}`),
    // RC2-012: deepened.
    mk(tag * (100 + markup) / 100, 'APPLIED_PERCENT_TO_ORIGINAL', `${tag} × (100 + ${markup}) ÷ 100`),
    mk(tag * (100 - discount) / 100, 'STOPPED_AFTER_FIRST_STAGE', `${tag} × (100 − ${discount}) ÷ 100`),
    mk(tag * (100 - discount + markup) / 100, 'ADDED_PERCENTAGES', `${tag} × (100 − ${discount} + ${markup}) ÷ 100`),
    mk(tag + markup, 'TREATED_PERCENT_AS_AMOUNT', `${tag} + ${markup}`),
    mk(tag - discount, 'TREATED_PERCENT_AS_AMOUNT', `${tag} − ${discount}`)
  ]);
  return buildBase(ctx, {
    templateId: 'PL_M_DISC_MARK',
    subskill: 'خصم على سعر ثم إضافة ربح',
    difficulty: 'medium',
    // RC2-017: سعر سلعة is an indefinite إضافة and cannot carry the definite
    // adjective المعلن. Definite throughout: سعر السلعة المعلن.
    question: `سعر السلعة المعلن ${u(tag, 'dirham')}. حصل المتجر عليها بخصم ${discount}% من هذا السعر، ثم أراد ربحًا قدره ${markup}% من تكلفة الشراء الفعلية. فما سعر البيع؟`,
    correct, distractors, format: money,
    steps: [
      `تكلفة الشراء بعد الخصم = ${tag} × (100 − ${discount}) ÷ 100 = ${costN}.`,
      `سعر البيع = ${costN} × (100 + ${markup}) ÷ 100 = ${correct}.`
    ],
    howToStart: 'احسب تكلفة الشراء الفعلية أولًا ثم الربح منها.',
    remember: 'الربح هنا محسوب من التكلفة بعد الخصم لا من السعر المعلن.',
    fastMethod: 'طبّق الخصم ثم معامل الربح.',
    estimatedSteps: 3, conceptTags: ['profit-loss', 'percentage'], parameters: params,
    oracle: {
      kind: 'constraint', answerKind: 'number',
      constraints: [eq(mul(X, 10000), mul(tag, sub(100, discount), add(100, markup)))]
    },
    askedUnknown: 'sellPriceAfterDiscountAndMarkup', stageCount: 2,
    pedagogy: {
      targetSkill: 'MARKUP_ON_ACTUAL_COST', targetMisconception: 'APPLIED_PERCENT_TO_ORIGINAL',
      wrongMethodValue: tag * (100 + markup) / 100,
      degenerateWhen: [{when: discount === 0, note: 'no discount: the two bases coincide'}]
    },
    complexityFactors: {reasoningTransformations: 3, conceptCount: 2, stageCount: 2, arithmeticBurden: 3},
    textParams: {essentialParams: ['listPrice', 'discountPercent', 'markupPercent']}
  });
}

function reverseSellingPrice(ctx) {
  const {rng} = ctx;
  const cost = rng.pick([100, 120, 160, 200, 240, 300, 400]);
  const percent = rng.pick([20, 25, 50]);
  const sellF = Fraction.from(cost).mul(100 + percent).div(100);
  if (!sellF.isInteger) return resample(ctx, reverseSellingPrice);
  const sell = sellF.toNumber();
  const correct = cost;
  const params = {sellPrice: sell, profitPercent: percent};
  const distractors = usable(ctx, [
    mk(approx(sell * (100 - percent) / 100), 'SUBTRACTED_PERCENTAGE_DIRECTLY', `${sell} × (100 − ${percent}) ÷ 100`),
    mk(sell - cost, 'REPORTED_AMOUNT_INSTEAD_OF_PERCENT', `${sell} − ${cost}`),
    mk(approx(sell * 100 / percent), 'USED_SALE_PRICE_AS_DENOMINATOR', `${sell} × 100 ÷ ${percent}`),
    mk(sell * 100 / (100 + 2 * percent), 'APPLIED_STEP_TWICE', `${sell} × 100 ÷ (100 + 2 × ${percent})`),
    mk(sell - percent, 'TREATED_PERCENT_AS_AMOUNT', `${sell} − ${percent}`),
    mk(sell * 100 / (100 - percent), 'APPLIED_OPERATION_IN_REVERSE', `${sell} × 100 ÷ (100 − ${percent})`),
    mk(sell, 'USED_GIVEN_VALUE_AS_ANSWER', `سعر البيع ${sell}`),
    mk(approx(sell * (100 + percent) / 100), 'APPLIED_OPERATION_IN_REVERSE', `${sell} × (100 + ${percent}) ÷ 100`)
  ]);
  return buildBase(ctx, {
    templateId: 'PL_H_REVERSE',
    subskill: 'استرجاع التكلفة من سعر بيع وربح معلوم',
    difficulty: 'medium',
    question: `باع متجر سلعة بـ${u(sell, 'dirham', 'oblique')} محققًا ربحًا قدره ${percent}% من تكلفة الشراء. فما تكلفة الشراء؟`,
    correct, distractors, format: money,
    steps: [
      `سعر البيع يمثل 100 + ${percent} = ${100 + percent} بالمئة من التكلفة.`,
      `التكلفة = ${sell} × 100 ÷ ${100 + percent} = ${correct}.`
    ],
    howToStart: 'حوّل سعر البيع إلى نسبة من التكلفة ثم اعكس المعامل.',
    remember: 'لا تطرح نسبة الربح مباشرة من سعر البيع.',
    fastMethod: 'البيع ÷ (1 + نسبة الربح).',
    estimatedSteps: 3, conceptTags: ['profit-loss', 'reverse'], parameters: params,
    oracle: {
      kind: 'constraint', answerKind: 'number',
      constraints: [eq(mul(X, add(100, percent)), mul(sell, 100))]
    },
    askedUnknown: 'costFromSellPrice', stageCount: 2,
    pedagogy: {
      targetSkill: 'REVERSE_MARKUP', targetMisconception: 'SUBTRACTED_PERCENTAGE_DIRECTLY',
      wrongMethodValue: sell * (100 - percent) / 100
    },
    complexityFactors: {reasoningTransformations: 3, conceptCount: 2, reverseReasoning: 1, stageCount: 2, arithmeticBurden: 3},
    textParams: {essentialParams: ['sellPrice', 'profitPercent']}
  });
}

function discountMarkupChain(ctx) {
  const {rng} = ctx;
  const list = rng.pick([200, 240, 300, 400, 500]);
  const disc = rng.pick([10, 20, 25]);
  const markup = rng.pick([20, 25, 50]);
  const f1 = 100 - disc, f2 = 100 + markup;
  // Section 13: a net factor of 1 makes the compound change trivial for a
  // template whose point is that a discount and a mark-up do not cancel.
  if (f1 * f2 === 10000) return resample(ctx, discountMarkupChain);
  const afterF = Fraction.from(list).mul(f1).div(100);
  const finalF = afterF.mul(f2).div(100);
  if (!afterF.isInteger || !finalF.isInteger) return resample(ctx, discountMarkupChain);
  const after = afterF.toNumber();
  const final = finalF.toNumber();
  const changeTimes100 = f1 * f2 - 10000;
  const correct = changeTimes100 / 100;
  const params = {listPrice: list, discountPercent: disc, markupPercent: markup};
  const distractors = usable(ctx, [
    mk(markup - disc, 'ADDED_PERCENTAGES', `${markup} − ${disc}`),
    mk(markup + disc, 'ADDED_PERCENTAGES', `${markup} + ${disc}`),
    mk(disc - markup, 'SUBTRACTED_PERCENTAGES', `${disc} − ${markup}`),
    mk(-correct, 'APPLIED_OPERATION_IN_REVERSE', `عكس إشارة ${num(correct)}`),
    mk(approx((disc + markup) / 2), 'USED_ARITHMETIC_MEAN_OF_AVERAGES', `(${disc} + ${markup}) ÷ 2`),
    mk(markup, 'USED_ONLY_LAST_STAGE', `نسبة الزيادة ${markup} وحدها`),
    mk(-disc, 'STOPPED_AFTER_FIRST_STAGE', `نسبة الخصم ${disc} وحدها`)
  ], {allowNegative: true, allowZero: true});
  const format = v => v > 0 ? `زيادة ${num(v)}%` : v < 0 ? `انخفاض ${num(Math.abs(v))}%` : 'لا يوجد تغير';
  return buildBase(ctx, {
    templateId: 'PL_H_CHAIN',
    subskill: 'خصم ثم زيادة وحساب التغير النهائي',
    difficulty: 'hard',
    question: `كان السعر ${u(list, 'dirham')}. خُفّض بنسبة ${disc}%، ثم زيد السعر الجديد بنسبة ${markup}%. ما نسبة التغير النهائية مقارنة بالسعر الأصلي؟`,
    correct, distractors, format,
    answerText: `الإجابة الصحيحة: ${format(correct)}.`,
    steps: [
      `السعر بعد الخصم = ${list} × (100 − ${disc}) ÷ 100 = ${after}.`,
      `السعر بعد الزيادة = ${after} × (100 + ${markup}) ÷ 100 = ${final}.`,
      `التغير = ${final} − ${list} = ${final - list}.`,
      `نسبة التغير = ${final - list} ÷ ${list} × 100 = ${num(correct)}.`
    ],
    howToStart: 'طبّق الخصم والزيادة بالتتابع ثم قارن النهائي بالأصل.',
    remember: 'الخصم والزيادة المتساويان لا يلغيان بعضهما عادةً.',
    fastMethod: 'استخدم معاملي الخصم والزيادة ثم قارن بالسعر الأصلي.',
    estimatedSteps: 4, conceptTags: ['profit-loss', 'successive-change'], parameters: params,
    oracle: {kind: 'constraint', answerKind: 'number', constraints: [eq(mul(X, 100), sub(mul(f1, f2), 10000))]},
    askedUnknown: 'netPercentChange', stageCount: 2,
    pedagogy: {
      targetSkill: 'SUCCESSIVE_PRICE_CHANGE', targetMisconception: 'ADDED_PERCENTAGES',
      wrongMethodValue: markup - disc,
      degenerateWhen: [{when: f1 * f2 === 10000, note: 'the discount and the mark-up cancel exactly'}]
    },
    complexityFactors: {reasoningTransformations: 4, conceptCount: 2, stageCount: 2, arithmeticBurden: 4},
    textParams: {essentialParams: ['listPrice', 'discountPercent', 'markupPercent']}
  });
}
