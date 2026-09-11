import {makeId, DAYS_AR, dayShift} from '../utils.js';

export function generateCalendar({difficulty,rng,seed,engineVersion}){
  const ctx={difficulty,rng,seed,engineVersion,family:'calendar',family_ar:'الاستدلال الزمني وأيام الأسبوع',category:'الاستدلال الزمني وأيام الأسبوع'};
  const list=difficulty==='easy'?[tomorrowKnown,afterTomorrow]
    :difficulty==='medium'?[compoundForward,forwardThenBack]
    :[nestedOffset,longOffset];
  return rng.pick(list)(ctx);
}

function dayOptions(correct){return DAYS_AR.filter(d=>d!==correct)}

function tomorrowKnown(ctx){
  const {rng}=ctx; const today=rng.int(0,6), tomorrow=dayShift(today,1), correct=DAYS_AR[today];
  return base(ctx,'CAL_E_TOM','معرفة اليوم من الغد','easy',`إذا كان غدًا هو يوم ${DAYS_AR[tomorrow]}، فما اليوم الحالي؟`,correct,dayOptions(correct),[
    `إذا كان الغد ${DAYS_AR[tomorrow]}، فالرجوع يومًا واحدًا يعطينا ${correct}.`
  ],'ارجع يومًا واحدًا من اليوم المعلوم.','في مسائل الأيام، التحرك خطوة بخطوة يقلل الأخطاء.','ارجع يومًا واحدًا فقط.',1);
}

function afterTomorrow(ctx){
  const {rng}=ctx; const today=rng.int(0,6), after=dayShift(today,2), correct=DAYS_AR[today];
  return base(ctx,'CAL_E_AFTER','معرفة اليوم من بعد غد','easy',`إذا كان بعد غد هو يوم ${DAYS_AR[after]}، فما اليوم الحالي؟`,correct,dayOptions(correct),[
    `بعد غد يبعد يومين عن اليوم الحالي.`,
    `نرجع يومين من ${DAYS_AR[after]} فنصل إلى ${correct}.`
  ],'ارجع يومين من «بعد غد».','ثبت عدد الأيام في العبارة قبل التحرك.','بعد غد = اليوم + 2.',2);
}

function compoundForward(ctx){
  const {rng}=ctx; const today=rng.int(0,6); const target=dayShift(today,4); const correct=DAYS_AR[today];
  return base(ctx,'CAL_M_COMPOUND','بعد ثلاثة أيام من غد','medium',`اليوم الذي يأتي بعد ثلاثة أيام من غد هو ${DAYS_AR[target]}. فما اليوم الحالي؟`,correct,dayOptions(correct),[
    `«بعد ثلاثة أيام من غد» = بعد 4 أيام من اليوم الحالي.`,
    `نرجع أربعة أيام من ${DAYS_AR[target]} فنصل إلى ${correct}.`
  ],'حوّل العبارة المركبة إلى إزاحة واحدة من اليوم.','غد = +1، ثم ثلاثة أيام إضافية = +4 إجمالًا.','ارجع 4 أيام من اليوم المذكور.',2);
}

function forwardThenBack(ctx){
  const {rng}=ctx; const today=rng.int(0,6), afterTomorrow=dayShift(today,2), back=rng.pick([2,3,4]); const asked=dayShift(today,-back); const correct=DAYS_AR[asked];
  return base(ctx,'CAL_M_TWO_SHIFT','تحديد اليوم الحالي ثم الرجوع عدة أيام','medium',`إذا كان بعد غد هو ${DAYS_AR[afterTomorrow]}، فما اليوم الذي كان قبل ${back} أيام من اليوم؟`,correct,dayOptions(correct),[
    `من «بعد غد = ${DAYS_AR[afterTomorrow]}» نحدد اليوم الحالي: ${DAYS_AR[today]}.`,
    `نرجع ${back} أيام من ${DAYS_AR[today]} فنصل إلى ${correct}.`
  ],'ثبت اليوم الحالي أولًا ثم نفذ الإزاحة الثانية.','لا تخلط بين الإزاحتين؛ حل كل واحدة وحدها.','بعد غد → اليوم، ثم ارجع العدد المطلوب.',3);
}

function nestedOffset(ctx){
  const {rng}=ctx; const today=rng.int(0,6), ahead1=rng.pick([2,3,4]), behind=rng.pick([1,2,3]); const target=dayShift(today,ahead1-behind); const correct=DAYS_AR[today];
  return base(ctx,'CAL_H_NESTED','إزاحة زمنية مركبة أمامية وخلفية','hard',`اليوم الذي يسبق اليوم الواقع بعد ${ahead1} أيام من الغد بمقدار ${behind} أيام هو ${DAYS_AR[target]}. فما اليوم الحالي؟`,correct,dayOptions(correct),[
    `بعد ${ahead1} أيام من الغد يعني اليوم + ${ahead1+1}.`,
    `ثم الرجوع ${behind} أيام يجعل الإزاحة الصافية = +${ahead1+1-behind}.`,
    `إذا كان الناتج ${DAYS_AR[target]}، نرجع ${ahead1+1-behind} أيام فنصل إلى ${correct}.`
  ],'حوّل العبارة كلها إلى إزاحة صافية واحدة.','في العبارات المركبة، اجمع الإزاحات الأمامية واطرح الخلفية قبل التعامل مع أسماء الأيام.','الإزاحة الصافية ثم الرجوع منها.',4);
}

function longOffset(ctx){
  const {rng}=ctx; const today=rng.int(0,6), n=rng.pick([10,11,12,16,17,18,24,25]); const target=dayShift(today,n), correct=DAYS_AR[target];
  return base(ctx,'CAL_H_LONG','إزاحة تتجاوز أسبوعًا','hard',`إذا كان اليوم ${DAYS_AR[today]}، فما اليوم بعد ${n} يومًا؟`,correct,dayOptions(correct),[
    `${n} يومًا = ${Math.floor(n/7)} أسبوع كامل + ${n%7} أيام.`,
    `الأسابيع الكاملة لا تغير اسم اليوم، فنحرك فقط ${n%7} أيام من ${DAYS_AR[today]}.`,
    `الناتج = ${correct}.`
  ],'اختصر العدد باستخدام باقي القسمة على 7.','كل 7 أيام تعيدك إلى اسم اليوم نفسه.',`احسب ${n} mod 7 = ${n%7} ثم تحرك بهذا العدد فقط.`,3);
}

function base(ctx,template_id,subskill,difficulty,question,correct,distractors,steps,how,remember,fast,estimated_steps){
 return {id:makeId(template_id,ctx.seed),generator_id:template_id,template_id,seed:ctx.seed,family:ctx.family,family_ar:ctx.family_ar,category:ctx.category,subskill,difficulty,question,display_expression:null,correct,distractors:distractors.map(v=>({value:v,rationale:'خطأ في اتجاه الحركة أو في عدد الأيام المحسوبة داخل العبارة المركبة.'})),format:v=>String(v),explanation:{how_to_start:how,steps,answer:`الإجابة الصحيحة: ${correct}.`,fast_method:fast,remember},estimated_steps,concept_tags:['calendar','time-reasoning'],engine_version:ctx.engineVersion};
}
