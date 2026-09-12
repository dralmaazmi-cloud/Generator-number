// RC2-013. A misconception must be applicable to the stem it is attached to.
//
// The audit found USED_SUM_OF_SPEEDS_IN_CHASE — "you added the two speeds in a
// CHASE problem; you should have subtracted them" — on 154 of its 195 uses
// sitting under stems with no chase in them: a car covering two halves of one
// journey, and the same distance driven at two speeds. The wrong option was the
// right value for that slip, but the sentence explaining it described a
// situation the learner had never read. 79% of that misconception's uses were
// telling learners about a problem they were not solving.
//
// Some misconceptions are general (an off-by-one step is an off-by-one step
// anywhere). Others name a SITUATION, and naming a situation that is not in the
// stem is a defect however arithmetically apt the value is. Those are declared
// here, with the Arabic that has to be present for the sentence to make sense.
//
// This is a check on the FEEDBACK, not on the distractor: the value stays, and
// what changes is the sentence attached to it.

import {REASON} from './reasons.js';

/**
 * Misconceptions whose text asserts something about the situation in the stem.
 * `markers` are the phrasings under which the assertion is true; a stem must
 * match at least one for the misconception to be usable on it.
 */
export const CONTEXT_BOUND = Object.freeze({
  USED_SUM_OF_SPEEDS_IN_CHASE: {
    situation: 'chase',
    description: 'two bodies moving in the same direction, one closing on the other',
    markers: [/الاتجاه\s+نفسه/, /نفس\s+الاتجاه/, /تلحق/, /يلحق/, /اللحاق/, /لحاق/, /يطارد/, /تطارد/]
  },
  USED_DIFFERENCE_OF_SPEEDS_IN_MEETING: {
    situation: 'meeting',
    description: 'two bodies approaching each other',
    markers: [/تلتقي/, /يلتقي/, /التقاء/, /تلتقيان/, /باتجاه\s/, /متقابل/, /نحو\s+بعضهما/]
  },
  USED_POST_TRANSFER_VALUE: {
    situation: 'transfer',
    description: 'a quantity moved from one side to the other',
    markers: [/نُقل/, /نقل/, /النقل/, /حُوّل/, /تحويل/]
  },
  USED_PRE_TRANSFER_VALUE: {
    situation: 'transfer',
    description: 'a quantity moved from one side to the other',
    markers: [/نُقل/, /نقل/, /النقل/, /حُوّل/, /تحويل/]
  },
  USED_POST_ADDITION_VALUE: {
    situation: 'addition',
    description: 'a quantity added to one side, with nothing taken from the other',
    markers: [/أُضيف/, /اضيف/, /إضافة/, /الإضافة/]
  },
  UPGRADED_ALL_INSTEAD_OF_SOME: {
    situation: 'upgrade',
    description: 'some units improved while the rest stayed as they were',
    markers: [/طُور/, /طور/, /تطوير/, /جديدة/, /الجديدة/, /أكثر\s+من\s+الآلة\s+القديمة/, /زادت\s+إنتاجيت/]
  },
  IGNORED_UPGRADE: {
    situation: 'upgrade',
    description: 'some units improved while the rest stayed as they were',
    markers: [/طُور/, /طور/, /تطوير/, /جديدة/, /الجديدة/, /أكثر\s+من\s+الآلة\s+القديمة/, /زادت\s+إنتاجيت/]
  },
  IGNORED_STOPPAGE: {
    situation: 'stoppage',
    description: 'some units stopped part-way through',
    markers: [/توقف/, /تعطل/, /خرجت\s+عن\s+الخدمة/]
  },
  IGNORED_EXTRA_COST: {
    situation: 'extra cost',
    description: 'a cost beyond the purchase price',
    markers: [/شحن/, /تجهيز/, /نقل/, /إصلاح/, /صيانة/, /تكلفة\s+إضافية/, /إجمالي\s+التكلفة/]
  },
  USED_SALE_PRICE_AS_DENOMINATOR: {
    situation: 'a stated sale price',
    description: 'the item was sold at a stated price',
    markers: [/باع/, /بيع/, /البيع/]
  },
  USED_RATE_BEFORE_CHANGE: {
    situation: 'a stated change of rate, price or efficiency',
    description: 'the stem states that a rate, price or efficiency changed',
    markers: [/ارتفع/, /انخفض/, /زاد/, /زادت/, /نقص/, /تغيّر/, /تغير/, /بنسبة/, /كفاءة/, /تطوير/, /صيانة/, /تدريب/]
  },
  USED_COUNT_BEFORE_CHANGE: {
    situation: 'a stated change in how many are working',
    description: 'the stem states that workers or machines joined, left or stopped',
    markers: [/انضم/, /غادر/, /توقف/, /الباقون/, /الباقين/, /البقية/, /تعطل/]
  },
  USED_ORIGINAL_SCHEDULE: {
    situation: 'a shortened deadline for the remainder',
    description: 'the stem asks for the remainder to be finished in a shorter time',
    markers: [/ما\s+تبقى/, /المتبقي/, /فقط/, /المدة\s+الأخيرة/]
  },
  USED_PURCHASE_PRICE_AS_DENOMINATOR: {
    situation: 'a stated purchase price',
    description: 'the item was bought at a stated price',
    markers: [/اشترى/, /شراء/, /الشراء/, /تكلفة/]
  }
});

/**
 * @param {object} base the family descriptor, before finalisation
 * @returns {{valid: boolean, reasons: string[], details: object}}
 */
export function validateMisconceptionContext(base) {
  const stem = String(base.question ?? '');
  const offenders = [];
  for (const d of base.distractors || []) {
    const rule = CONTEXT_BOUND[d.misconceptionId];
    if (!rule) continue;
    if (!rule.markers.some(m => m.test(stem))) {
      offenders.push({misconceptionId: d.misconceptionId, situation: rule.situation, value: d.value});
    }
  }
  const targeted = base.pedagogy?.targetMisconception;
  const targetRule = targeted ? CONTEXT_BOUND[targeted] : null;
  if (targetRule && !targetRule.markers.some(m => m.test(stem))) {
    offenders.push({misconceptionId: targeted, situation: targetRule.situation, value: 'targetMisconception'});
  }
  return {
    valid: offenders.length === 0,
    reasons: offenders.length ? [REASON.MISCONCEPTION_NOT_APPLICABLE] : [],
    details: offenders.length ? {misconceptionContext: offenders} : {}
  };
}
