import {mk, usable, u, num, unitFormat, buildBase, eq, X, add, sub, mul} from './_shared.js';

export function generateAges({difficulty, rng, seed, engineVersion}) {
  const ctx = {difficulty, rng, seed, engineVersion, family: 'ages', family_ar: 'مسائل الأعمار', category: 'مسائل الأعمار'};
  const list = difficulty === 'easy' ? [sumDifference, multipleDifference]
    : difficulty === 'medium' ? [futureSumDifference, futureRatio, currentRatioFutureSum]
    : [pastRatioFutureSum, twoTimeRatio];
  return rng.pick(list)(ctx);
}

const years = unitFormat('year');

function sumDifference(ctx) {
  const {rng} = ctx;
  const younger = rng.int(8, 24);
  const diff = rng.pick([4, 6, 8, 10, 12]);
  const older = younger + diff;
  const sum = older + younger;
  const correct = older;
  const params = {ageDifference: diff, ageSum: sum};
  const distractors = usable([
    mk(younger, 'ANSWERED_OTHER_PERSON', `${sum} − ${older}`),
    mk(sum / 2, 'HALVED_THE_SUM', `${sum} ÷ 2`),
    mk(diff, 'USED_AGE_DIFFERENCE_AS_ANSWER', `الفرق المعطى ${diff}`),
    mk(older - 2, 'OFF_BY_ONE_STEP', `${older} − 2`),
    mk(older + 2, 'OFF_BY_ONE_STEP', `${older} + 2`),
    mk(sum - diff, 'SUBTRACTED_INSTEAD_OF_ADDED', `${sum} − ${diff}`),
    mk(sum, 'USED_GIVEN_VALUE_AS_ANSWER', `المجموع المعطى ${sum}`),
    mk((sum + diff * 2) / 2, 'APPLIED_STEP_TWICE', `(${sum} + ${diff} × 2) ÷ 2`)
  ]);
  return buildBase(ctx, {
    templateId: 'AGE_E_SUM_DIFF',
    subskill: 'مجموع وفرق عمرين حاليين',
    difficulty: 'easy',
    question: `شخص أكبر من الآخر بـ${u(diff, 'year', 'oblique')}، ومجموع عمريهما ${u(sum, 'year')}. كم عمر الأكبر؟`,
    correct, distractors, format: years,
    steps: [
      `لو تساوى العمران لكان كل منهما ${sum} ÷ 2 = ${sum / 2}.`,
      `نضيف نصف الفرق: ${diff} ÷ 2 = ${diff / 2}.`,
      `عمر الأكبر = ${sum / 2} + ${diff / 2} = ${older}.`
    ],
    howToStart: 'استخدم المجموع والفرق معًا.',
    remember: 'عمر الأكبر = (المجموع + الفرق) ÷ 2.',
    fastMethod: `(${sum} + ${diff}) ÷ 2 = ${older}.`,
    estimatedSteps: 2, conceptTags: ['age', 'sum-difference'], parameters: params,
    oracle: {
      kind: 'constraint', answerKind: 'number',
      constraints: [eq(add(X, sub(X, diff)), sum)]
    },
    askedUnknown: 'olderAge', stageCount: 2,
    realism: {ages: [older, younger], siblingGap: diff},
    pedagogy: {
      targetSkill: 'SUM_AND_DIFFERENCE', targetMisconception: 'HALVED_THE_SUM',
      wrongMethodValue: sum / 2,
      degenerateWhen: [{when: diff === 0, note: 'equal ages remove the difference step'}]
    },
    complexityFactors: {reasoningTransformations: 2, conceptCount: 1, stageCount: 2, arithmeticBurden: 2},
    textParams: {essentialParams: ['ageDifference', 'ageSum']}
  });
}

function multipleDifference(ctx) {
  const {rng} = ctx;
  // With a multiple of 2 the age gap *is* the child's age, so the item asks for
  // a number already printed in the stem and measures nothing (Section 10).
  const mult = rng.pick([3, 4]);
  // Section 11: the parent must have been at least 18 at the child's birth.
  const minYounger = Math.ceil(18 / (mult - 1));
  const maxYounger = Math.floor(45 / (mult - 1));
  const younger = rng.int(minYounger, maxYounger);
  const older = mult * younger;
  const diff = older - younger;
  const correct = younger;
  const params = {multiple: mult, ageDifference: diff};
  const multWord = mult === 3 ? 'ثلاثة أمثال' : 'أربعة أمثال';
  const distractors = usable([
    mk(older, 'ANSWERED_OTHER_PERSON', `${mult} × ${younger}`),
    mk(diff, 'USED_AGE_DIFFERENCE_AS_ANSWER', `الفرق المعطى ${diff}`),
    mk(diff / mult, 'OFF_BY_ONE_STEP', `${diff} ÷ ${mult}`),
    mk(younger + 4, 'OFF_BY_ONE_STEP', `${younger} + 4`),
    mk(younger - 2, 'OFF_BY_ONE_STEP', `${younger} − 2`),
    mk(diff * mult, 'MULTIPLIED_INSTEAD_OF_DIVIDED', `${diff} × ${mult}`),
    mk(diff + mult, 'ADDED_INSTEAD_OF_SCALING', `${diff} + ${mult}`),
    mk(older + younger, 'STOPPED_AT_INTERMEDIATE_TOTAL', `${older} + ${younger}`)
  ]);
  return buildBase(ctx, {
    templateId: 'AGE_E_MULT_DIFF',
    subskill: 'مضاعف عمر مع فرق معلوم',
    difficulty: 'easy',
    question: `عمر الأب يساوي ${multWord} عمر ابنه، والفرق بين عمريهما ${u(diff, 'year')}. كم عمر الابن؟`,
    correct, distractors, format: years,
    steps: [
      `عمر الابن جزء واحد، وعمر الأب ${u(mult, 'part')}.`,
      `الفرق بالأجزاء = ${mult} − 1 = ${mult - 1}.`,
      `الجزء الواحد = ${diff} ÷ ${mult - 1} = ${younger}.`
    ],
    howToStart: 'حوّل المضاعف إلى أجزاء.',
    remember: `الفرق بين عمر الأب وعمر الابن يساوي ${u(mult - 1, 'part')}.`,
    fastMethod: `اقسم الفرق على ${mult - 1}.`,
    estimatedSteps: 3, conceptTags: ['age', 'ratio'], parameters: params,
    oracle: {
      kind: 'constraint', answerKind: 'number',
      constraints: [eq(sub(mul(mult, X), X), diff)]
    },
    askedUnknown: 'youngerAge', stageCount: 2,
    realism: {parentAgeAtBirth: diff, ages: [older, younger]},
    pedagogy: {
      targetSkill: 'MULTIPLE_AS_PARTS', targetMisconception: 'USED_AGE_DIFFERENCE_AS_ANSWER',
      wrongMethodValue: diff,
      degenerateWhen: [{when: mult === 1, note: 'no multiple to reason about'}]
    },
    complexityFactors: {reasoningTransformations: 2, conceptCount: 2, stageCount: 2, arithmeticBurden: 2},
    textParams: {essentialParams: ['ageDifference']}
  });
}

function futureSumDifference(ctx) {
  const {rng} = ctx;
  const younger = rng.int(8, 20);
  const diff = rng.pick([4, 6, 8, 10]);
  const older = younger + diff;
  const yrs = rng.int(2, 6);
  const futureSum = older + younger + 2 * yrs;
  const correct = older;
  const params = {ageDifference: diff, yearsAhead: yrs, futureSum};
  const distractors = usable([
    mk(younger, 'ANSWERED_OTHER_PERSON', `${older + younger} − ${older}`),
    mk(futureSum / 2, 'HALVED_THE_SUM', `${futureSum} ÷ 2`),
    mk(older + yrs, 'ANSWERED_FUTURE_AGE', `${older} + ${yrs}`),
    mk(older - yrs, 'ANSWERED_PAST_AGE', `${older} − ${yrs}`),
    mk((futureSum - yrs + diff) / 2, 'FORGOT_BOTH_AGES_GROW', `(${futureSum} − ${yrs} + ${diff}) ÷ 2`),
    mk(older + 2, 'OFF_BY_ONE_STEP', `${older} + 2`),
    mk(older - 2, 'OFF_BY_ONE_STEP', `${older} − 2`),
    mk(diff, 'USED_AGE_DIFFERENCE_AS_ANSWER', `الفرق المعطى ${diff}`)
  ]);
  return buildBase(ctx, {
    templateId: 'AGE_M_FUT_SUM_DIFF',
    subskill: 'فرق ثابت مع مجموع مستقبلي',
    difficulty: 'medium',
    question: `سارة أكبر من مريم بـ${u(diff, 'year', 'oblique')}. بعد ${u(yrs, 'year', 'oblique')} سيكون مجموع عمريهما ${u(futureSum, 'year')}. كم عمر سارة الآن؟`,
    correct, distractors, format: years,
    steps: [
      `بعد ${u(yrs, 'year', 'oblique')} يزيد مجموع العمرين بمقدار 2 × ${yrs} = ${2 * yrs}.`,
      `المجموع الآن = ${futureSum} − ${2 * yrs} = ${older + younger}.`,
      `عمر الأكبر = (${older + younger} + ${diff}) ÷ 2 = ${older}.`
    ],
    howToStart: 'ارجع أولًا من المجموع المستقبلي إلى المجموع الحالي.',
    remember: 'فرق العمر ثابت، لكن مجموع العمرين يزيد سنتين كل سنة زمنية.',
    fastMethod: `اطرح ${2 * yrs} من المجموع ثم استخدم قاعدة المجموع والفرق.`,
    estimatedSteps: 3, conceptTags: ['age', 'time-shift'], parameters: params,
    oracle: {
      kind: 'constraint', answerKind: 'number',
      constraints: [eq(add(add(X, yrs), add(sub(X, diff), yrs)), futureSum)]
    },
    askedUnknown: 'olderAgeNow', stageCount: 3,
    realism: {ages: [older, younger], siblingGap: diff},
    pedagogy: {
      targetSkill: 'TIME_SHIFT_SUM', targetMisconception: 'FORGOT_BOTH_AGES_GROW',
      wrongMethodValue: (futureSum - yrs + diff) / 2,
      degenerateWhen: [{when: yrs === 0, note: 'no time shift to undo'}]
    },
    complexityFactors: {reasoningTransformations: 3, conceptCount: 2, stageCount: 3, arithmeticBurden: 3},
    textParams: {essentialParams: ['ageDifference', 'yearsAhead', 'futureSum']}
  });
}

function futureRatio(ctx) {
  const {rng} = ctx;
  const yrs = rng.int(3, 8);
  const ratio = rng.pick([2, 3]);
  // Section 11: choose the (constant) age gap first, inside the realistic range
  // for a parent, rather than filtering afterwards.
  const diff = rng.int(20, 40);
  if ((diff % (ratio - 1)) !== 0) return futureRatio(ctx);
  const youngFuture = diff / (ratio - 1);
  const oldFuture = ratio * youngFuture;
  const young = youngFuture - yrs;
  const old = oldFuture - yrs;
  if (young <= 0) return futureRatio(ctx);
  const correct = young;
  const params = {ageDifference: diff, yearsAhead: yrs, ratio};
  const ratioWord = ratio === 2 ? 'ضعف' : 'ثلاثة أمثال';
  const distractors = usable([
    mk(old, 'ANSWERED_OTHER_PERSON', `${young} + ${diff}`),
    mk(youngFuture, 'ANSWERED_FUTURE_AGE', `${young} + ${yrs}`),
    mk(oldFuture, 'ANSWERED_FUTURE_AGE', `${old} + ${yrs}`),
    mk(diff, 'USED_AGE_DIFFERENCE_AS_ANSWER', `الفرق المعطى ${diff}`),
    mk(diff / (ratio - 1), 'APPLIED_FUTURE_RATIO_NOW', `${diff} ÷ (${ratio} − 1)`),
    mk(young + 2, 'OFF_BY_ONE_STEP', `${young} + 2`),
    mk(young - 2, 'OFF_BY_ONE_STEP', `${young} − 2`),
    mk(young * ratio, 'MULTIPLIED_INSTEAD_OF_DIVIDED', `${young} × ${ratio}`)
  ]);
  return buildBase(ctx, {
    templateId: 'AGE_M_FUT_RATIO',
    subskill: 'علاقة عمرية في المستقبل',
    difficulty: 'medium',
    question: `عمر الأم أكبر من عمر ابنتها بـ${u(diff, 'year', 'oblique')}. بعد ${u(yrs, 'year', 'oblique')} سيكون عمر الأم ${ratioWord} عمر ابنتها. كم عمر الابنة الآن؟`,
    correct, distractors, format: years,
    steps: [
      `نفرض عمر الابنة الآن = س، فعمر الأم = س + ${diff}.`,
      `بعد ${u(yrs, 'year', 'oblique')}: الابنة = س + ${yrs}، والأم = س + ${diff} + ${yrs}.`,
      `نجمع الثابتين: ${diff} + ${yrs} = ${diff + yrs}، فيصبح عمر الأم = س + ${diff + yrs}.`,
      `من العلاقة: س + ${diff + yrs} = ${ratio} × (س + ${yrs}).`,
      `بفك الأقواس: ${ratio} × ${yrs} = ${ratio * yrs}، ومنها (${ratio} − 1) س = ${diff + yrs} − ${ratio * yrs} = ${diff + yrs - ratio * yrs}.`,
      `س = ${diff + yrs - ratio * yrs} ÷ ${ratio - 1} = ${young}.`
    ],
    howToStart: 'أضف السنوات إلى العمرين قبل تطبيق علاقة المستقبل.',
    remember: 'العلاقة المستقبلية لا تُطبق على الأعمار الحالية مباشرة.',
    fastMethod: `اكتب معادلة واحدة بعد ${u(yrs, 'year', 'oblique')}.`,
    estimatedSteps: 4, conceptTags: ['age', 'equation'], parameters: params,
    oracle: {
      kind: 'constraint', answerKind: 'number',
      constraints: [eq(add(X, diff, yrs), mul(ratio, add(X, yrs)))]
    },
    askedUnknown: 'youngerAgeNow', stageCount: 3,
    realism: {parentAgeAtBirth: diff, ages: [old, young]},
    pedagogy: {
      targetSkill: 'FUTURE_RATIO_EQUATION', targetMisconception: 'APPLIED_FUTURE_RATIO_NOW',
      wrongMethodValue: diff / (ratio - 1),
      degenerateWhen: [{when: yrs === 0, note: 'future ratio is the present ratio'}]
    },
    complexityFactors: {reasoningTransformations: 3, conceptCount: 2, equationSolving: 1, stageCount: 3, arithmeticBurden: 3},
    textParams: {essentialParams: ['ageDifference', 'yearsAhead']}
  });
}

function currentRatioFutureSum(ctx) {
  const {rng} = ctx;
  const ratio = rng.pick([2, 3]);
  const younger = rng.int(7, 14);
  const older = ratio * younger;
  const yrs = rng.int(2, 6);
  const futureSum = older + younger + 2 * yrs;
  const correct = older;
  const params = {ratio, yearsAhead: yrs, futureSum};
  const ratioWord = ratio === 2 ? 'ضعف' : 'ثلاثة أمثال';
  const distractors = usable([
    mk(younger, 'ANSWERED_OTHER_PERSON', `${older} ÷ ${ratio}`),
    mk(older + yrs, 'ANSWERED_FUTURE_AGE', `${older} + ${yrs}`),
    mk(younger + yrs, 'ANSWERED_FUTURE_AGE', `${younger} + ${yrs}`),
    mk(futureSum - 2 * yrs, 'STOPPED_AT_INTERMEDIATE_TOTAL', `${futureSum} − ${2 * yrs}`),
    mk(futureSum / (ratio + 1), 'FORGOT_BOTH_AGES_GROW', `${futureSum} ÷ (${ratio} + 1)`),
    mk(older + 2, 'OFF_BY_ONE_STEP', `${older} + 2`),
    mk(older - 2, 'OFF_BY_ONE_STEP', `${older} − 2`),
    mk(older - younger, 'USED_AGE_DIFFERENCE_AS_ANSWER', `${older} − ${younger}`)
  ]);
  return buildBase(ctx, {
    templateId: 'AGE_M_RATIO_FUT_SUM',
    subskill: 'نسبة عمرية حالية مع مجموع مستقبلي',
    difficulty: 'medium',
    question: `عمر سالم الآن ${ratioWord} عمر أخيه. بعد ${u(yrs, 'year', 'oblique')} سيكون مجموع عمريهما ${u(futureSum, 'year')}. كم عمر سالم الآن؟`,
    correct, distractors, format: years,
    steps: [
      `المجموع الآن = ${futureSum} − 2 × ${yrs} = ${older + younger}.`,
      `مجموع أجزاء النسبة = ${ratio} + 1 = ${ratio + 1}.`,
      `قيمة الجزء الواحد = ${older + younger} ÷ ${ratio + 1} = ${younger}.`,
      `عمر سالم = ${ratio} × ${younger} = ${older}.`
    ],
    howToStart: 'ارجع إلى المجموع الحالي ثم استخدم النسبة الحالية.',
    remember: 'إذا كانت النسبة الآن، طبّقها بعد إرجاع المجموع إلى الآن.',
    fastMethod: `المجموع الحالي ثم تقسيمه إلى ${ratio + 1} أجزاء.`,
    estimatedSteps: 4, conceptTags: ['age', 'ratio', 'time-shift'], parameters: params,
    oracle: {
      kind: 'constraint', answerKind: 'number',
      constraints: [eq(add(mul(X, ratio), X, mul(2, yrs, ratio)), mul(futureSum, ratio))]
    },
    askedUnknown: 'olderAgeNow', stageCount: 3,
    realism: {ages: [older, younger], siblingGap: older - younger},
    pedagogy: {
      targetSkill: 'RATIO_WITH_TIME_SHIFT', targetMisconception: 'FORGOT_BOTH_AGES_GROW',
      wrongMethodValue: futureSum / (ratio + 1),
      degenerateWhen: [{when: yrs === 0, note: 'no time shift to undo'}]
    },
    complexityFactors: {reasoningTransformations: 3, conceptCount: 2, stageCount: 3, arithmeticBurden: 3},
    textParams: {essentialParams: ['yearsAhead', 'futureSum']}
  });
}

function pastRatioFutureSum(ctx) {
  const {rng} = ctx;
  const pastYears = rng.int(2, 5);
  const futureYears = rng.int(3, 6);
  const ratio = rng.pick([2, 3]);
  const youngPast = rng.int(6, 12);
  const oldPast = ratio * youngPast;
  const youngNow = youngPast + pastYears;
  const oldNow = oldPast + pastYears;
  const futureSum = youngNow + oldNow + 2 * futureYears;
  const correct = oldNow;
  const params = {pastYears, futureYears, ratio, futureSum};
  const ratioWord = ratio === 2 ? 'ضعف' : 'ثلاثة أمثال';
  const distractors = usable([
    mk(oldPast, 'ANSWERED_PAST_AGE', `${oldNow} − ${pastYears}`),
    mk(youngNow, 'ANSWERED_OTHER_PERSON', `${youngPast} + ${pastYears}`),
    mk(oldNow + futureYears, 'ANSWERED_FUTURE_AGE', `${oldNow} + ${futureYears}`),
    mk(youngPast, 'ANSWERED_PAST_AGE', `${youngNow} − ${pastYears}`),
    mk(futureSum / 2, 'HALVED_THE_SUM', `${futureSum} ÷ 2`),
    mk(oldNow + 2, 'OFF_BY_ONE_STEP', `${oldNow} + 2`),
    mk(oldNow - 2, 'OFF_BY_ONE_STEP', `${oldNow} − 2`),
    mk((futureSum - 2 * futureYears) / (ratio + 1) * ratio, 'FORGOT_BOTH_AGES_GROW', `((${futureSum} − ${2 * futureYears}) ÷ ${ratio + 1}) × ${ratio}`)
  ]);
  return buildBase(ctx, {
    templateId: 'AGE_H_PAST_FUT',
    subskill: 'علاقة في الماضي مع مجموع مستقبلي',
    difficulty: 'hard',
    question: `قبل ${u(pastYears, 'year', 'oblique')} كان عمر علي ${ratioWord} عمر راشد. بعد ${u(futureYears, 'year', 'oblique')} من الآن سيكون مجموع عمريهما ${u(futureSum, 'year')}. كم عمر علي الآن؟`,
    correct, distractors, format: years,
    steps: [
      `المجموع الآن = ${futureSum} − 2 × ${futureYears} = ${youngNow + oldNow}.`,
      `المجموع قبل ${u(pastYears, 'year', 'oblique')} = ${youngNow + oldNow} − 2 × ${pastYears} = ${youngPast + oldPast}.`,
      `في ذلك الوقت كانت النسبة ${ratio} إلى 1، ومجموع الأجزاء = ${ratio} + 1 = ${ratio + 1}.`,
      `قيمة الجزء = ${youngPast + oldPast} ÷ ${ratio + 1} = ${youngPast}.`,
      `عمر علي قبل ${u(pastYears, 'year', 'oblique')} = ${ratio} × ${youngPast} = ${oldPast}.`,
      `عمر علي الآن = ${oldPast} + ${pastYears} = ${oldNow}.`
    ],
    howToStart: 'حوّل المجموع المستقبلي إلى الآن، ثم إلى وقت العلاقة الماضية.',
    remember: 'عند تحريك شخصين زمنيًا، المجموع يتغير بمقدار سنتين لكل سنة.',
    fastMethod: 'ارجع بالمجموع إلى زمن العلاقة، حل النسبة، ثم تقدم للعمر الحالي.',
    estimatedSteps: 5, conceptTags: ['age', 'time-shift', 'ratio'], parameters: params,
    oracle: {
      kind: 'constraint', answerKind: 'number',
      // Rashid now = futureSum - 2*futureYears - x, and the past ratio must hold.
      constraints: [eq(sub(X, pastYears), mul(ratio, sub(sub(sub(futureSum, mul(2, futureYears)), X), pastYears)))]
    },
    askedUnknown: 'olderAgeNow', stageCount: 4,
    realism: {ages: [oldNow, youngNow, oldPast, youngPast], siblingGap: oldNow - youngNow},
    pedagogy: {
      targetSkill: 'TWO_TIME_SHIFTS', targetMisconception: 'ANSWERED_PAST_AGE',
      wrongMethodValue: oldPast,
      degenerateWhen: [{when: pastYears === 0, note: 'the past relation is the present one'}]
    },
    complexityFactors: {reasoningTransformations: 4, conceptCount: 3, stageCount: 4, arithmeticBurden: 4, dependencyDepth: 3},
    textParams: {essentialParams: ['pastYears', 'futureYears', 'futureSum']}
  });
}

function twoTimeRatio(ctx) {
  const {rng} = ctx;
  const nowYoung = rng.int(8, 14);
  const gap = rng.pick([18, 20, 24]);
  const nowOld = nowYoung + gap;
  const yrs = rng.int(4, 8);
  const futureYoung = nowYoung + yrs;
  const futureOld = nowOld + yrs;
  if (futureOld % futureYoung !== 0) return twoTimeRatio(ctx);
  const ratio = futureOld / futureYoung;
  if (ratio < 2 || ratio > 4) return twoTimeRatio(ctx);
  const correct = nowYoung;
  const params = {ageDifference: gap, yearsAhead: yrs, ratio};
  const ratioWord = ratio === 2 ? 'ضعف' : ratio === 3 ? 'ثلاثة أمثال' : 'أربعة أمثال';
  const distractors = usable([
    mk(nowOld, 'ANSWERED_OTHER_PERSON', `${nowYoung} + ${gap}`),
    mk(futureYoung, 'ANSWERED_FUTURE_AGE', `${nowYoung} + ${yrs}`),
    mk(futureOld, 'ANSWERED_FUTURE_AGE', `${nowOld} + ${yrs}`),
    mk(gap, 'USED_AGE_DIFFERENCE_AS_ANSWER', `الفرق المعطى ${gap}`),
    mk(gap / (ratio - 1), 'APPLIED_FUTURE_RATIO_NOW', `${gap} ÷ (${ratio} − 1)`),
    mk(nowYoung + 2, 'OFF_BY_ONE_STEP', `${nowYoung} + 2`),
    mk(nowYoung - 2, 'OFF_BY_ONE_STEP', `${nowYoung} − 2`),
    mk(nowYoung * ratio, 'MULTIPLIED_INSTEAD_OF_DIVIDED', `${nowYoung} × ${ratio}`)
  ]);
  return buildBase(ctx, {
    templateId: 'AGE_H_TWO_TIME',
    subskill: 'فرق حالي وعلاقة نسبية مستقبلية',
    difficulty: 'hard',
    question: `عمر الأب أكبر من عمر ابنه بـ${u(gap, 'year', 'oblique')}. بعد ${u(yrs, 'year', 'oblique')} سيصبح عمر الأب ${ratioWord} عمر الابن. كم عمر الابن الآن؟`,
    correct, distractors, format: years,
    steps: [
      `نفرض عمر الابن الآن = س، والأب = س + ${gap}.`,
      `بعد ${u(yrs, 'year', 'oblique')}: الابن = س + ${yrs}، والأب = س + ${gap} + ${yrs}.`,
      `نجمع الثابتين: ${gap} + ${yrs} = ${gap + yrs}، فيصبح عمر الأب = س + ${gap + yrs}.`,
      `من العلاقة: س + ${gap + yrs} = ${ratio} × (س + ${yrs}).`,
      `بفك الأقواس: ${ratio} × ${yrs} = ${ratio * yrs}، ومنها (${ratio} − 1) س = ${gap + yrs} − ${ratio * yrs} = ${gap + yrs - ratio * yrs}.`,
      `س = ${gap + yrs - ratio * yrs} ÷ ${ratio - 1} = ${nowYoung}.`
    ],
    howToStart: 'حوّل الجملة المستقبلية إلى معادلة بعد إضافة السنوات للطرفين.',
    remember: 'الفرق يبقى ثابتًا لكن نسبة العمرين تتغير بمرور الوقت.',
    fastMethod: 'استخدم الفرق الثابت لكتابة عمر الأب بدلالة عمر الابن.',
    estimatedSteps: 5, conceptTags: ['age', 'equation'], parameters: params,
    oracle: {
      kind: 'constraint', answerKind: 'number',
      constraints: [eq(add(X, gap, yrs), mul(ratio, add(X, yrs)))]
    },
    askedUnknown: 'youngerAgeNow', stageCount: 3,
    realism: {parentAgeAtBirth: gap, ages: [nowOld, nowYoung]},
    pedagogy: {
      targetSkill: 'FUTURE_RATIO_EQUATION', targetMisconception: 'APPLIED_FUTURE_RATIO_NOW',
      wrongMethodValue: gap / (ratio - 1),
      degenerateWhen: [{when: yrs === 0, note: 'future ratio is the present ratio'}]
    },
    complexityFactors: {reasoningTransformations: 4, conceptCount: 2, equationSolving: 1, stageCount: 3, arithmeticBurden: 4},
    textParams: {essentialParams: ['ageDifference', 'yearsAhead']}
  });
}
