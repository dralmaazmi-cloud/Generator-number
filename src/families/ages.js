import {makeId, formatNumber} from '../utils.js';

export function generateAges({difficulty,rng,seed,engineVersion}){
  const ctx={difficulty,rng,seed,engineVersion,family:'ages',family_ar:'مسائل الأعمار',category:'مسائل الأعمار'};
  const list=difficulty==='easy'?[sumDifference,multipleDifference]
    :difficulty==='medium'?[futureSumDifference,futureRatio,currentRatioFutureSum]
    :[pastRatioFutureSum,twoTimeRatio];
  return rng.pick(list)(ctx);
}

function sumDifference(ctx){
  const {rng}=ctx; const younger=rng.int(8,24), diff=rng.pick([4,6,8,10,12]); const older=younger+diff, sum=older+younger; const correct=older;
  return base(ctx,'AGE_E_SUM_DIFF','مجموع وفرق عمرين حاليين','easy',`شخص أكبر من الآخر بـ${diff} سنوات، ومجموع عمريهما ${sum} سنة. كم عمر الأكبر؟`,correct,[younger,sum/2,diff,older-2,older+2,sum-diff],[
    `لو كان العمران متساويين لكان كل منهما ${sum/2}.`,
    `نضيف نصف الفرق (${diff/2}) إلى الأكبر: ${sum/2}+${diff/2} = ${older}.`
  ],'استخدم المجموع والفرق معًا.','عمر الأكبر = (المجموع + الفرق) ÷ 2.',`(${sum}+${diff}) ÷ 2 = ${older}.`,2);
}

function multipleDifference(ctx){
  const {rng}=ctx; const mult=rng.pick([2,3,4]); const younger=rng.int(6,16); const older=mult*younger, diff=older-younger; const correct=younger;
  return base(ctx,'AGE_E_MULT_DIFF','مضاعف عمر مع فرق معلوم','easy',`عمر الأب يساوي ${mult===2?'ضعف':mult===3?'ثلاثة أمثال':'أربعة أمثال'} عمر ابنه، والفرق بين عمريهما ${diff} سنة. كم عمر الابن؟`,correct,[older,diff,younger+4,younger+2,Math.max(1,younger-2),diff/(mult-1)+2],[
    `اعتبر عمر الابن جزءًا واحدًا، وعمر الأب ${mult} أجزاء.`,
    `الفرق = ${mult-1} أجزاء ويساوي ${diff}.`,
    `الجزء الواحد = ${diff} ÷ ${mult-1} = ${younger}.`
  ],'حوّل المضاعف إلى أجزاء.',`الفرق بين ${mult} أجزاء وجزء واحد = ${mult-1} أجزاء.`,`اقسم الفرق على ${mult-1}.`,3);
}

function futureSumDifference(ctx){
  const {rng}=ctx; const younger=rng.int(8,20), diff=rng.pick([4,6,8,10]); const older=younger+diff; const years=rng.int(2,6); const futureSum=older+younger+2*years; const correct=older;
  return base(ctx,'AGE_M_FUT_SUM_DIFF','فرق ثابت مع مجموع مستقبلي','medium',`سارة أكبر من مريم بـ${diff} سنوات. بعد ${years} سنوات سيكون مجموع عمريهما ${futureSum} سنة. كم عمر سارة الآن؟`,correct,[younger,(futureSum)/2,older+years,older-years,older+2,older-2],[
    `بعد ${years} سنوات يزيد مجموع العمرين بمقدار ${2*years}.`,
    `المجموع الآن = ${futureSum} - ${2*years} = ${older+younger}.`,
    `عمر الأكبر = (${older+younger}+${diff}) ÷ 2 = ${older}.`
  ],'ارجع أولًا من المجموع المستقبلي إلى المجموع الحالي.','فرق العمر ثابت، لكن مجموع العمرين يزيد بسنتين كل سنة زمنية.',`اطرح ${2*years} من المجموع ثم استخدم قاعدة المجموع والفرق.`,3);
}

function futureRatio(ctx){
  const {rng}=ctx; const years=rng.int(3,8), ratio=rng.pick([2,3]); const youngFuture=rng.int(10,20); const oldFuture=ratio*youngFuture; const young=youngFuture-years, old=oldFuture-years; if(young<=0) return futureRatio(ctx); const diff=old-young; const correct=young;
  return base(ctx,'AGE_M_FUT_RATIO','علاقة عمرية في المستقبل','medium',`عمر الأم أكبر من عمر ابنتها بـ${diff} سنة. بعد ${years} سنوات سيكون عمر الأم ${ratio===2?'ضعف':'ثلاثة أمثال'} عمر ابنتها. كم عمر الابنة الآن؟`,correct,[old,youngFuture,oldFuture,diff,young+2,Math.max(1,young-2)],[
    `لنفرض عمر الابنة الآن = س، فعمر الأم = س + ${diff}.`,
    `بعد ${years} سنوات: الابنة = س + ${years}، والأم = س + ${diff+years}.`,
    `نطبق علاقة ${ratio}:1 ونحصل على س = ${young}.`
  ],'أضف السنوات إلى العمرين قبل تطبيق علاقة المستقبل.','العلاقة المستقبلية لا تُطبق على الأعمار الحالية مباشرة.',`اكتب معادلة بسيطة بعد ${years} سنوات.`,4);
}

function currentRatioFutureSum(ctx){
  const {rng}=ctx; const ratio=rng.pick([2,3]); const younger=rng.int(7,14); const older=ratio*younger; const years=rng.int(2,6); const futureSum=older+younger+2*years; const correct=older;
  return base(ctx,'AGE_M_RATIO_FUT_SUM','نسبة عمرية حالية مع مجموع مستقبلي','medium',`عمر سالم الآن ${ratio===2?'ضعف':'ثلاثة أمثال'} عمر أخيه. بعد ${years} سنوات سيكون مجموع عمريهما ${futureSum} سنة. كم عمر سالم الآن؟`,correct,[younger,older+years,younger+years,older-2,older+2,futureSum-2*years],[
    `المجموع الحالي = ${futureSum} - ${2*years} = ${older+younger}.`,
    `النسبة الحالية = ${ratio}:1، ومجموع الأجزاء = ${ratio+1}.`,
    `قيمة الجزء = ${older+younger} ÷ ${ratio+1} = ${younger}.`,
    `عمر سالم = ${ratio} × ${younger} = ${older}.`
  ],'ارجع إلى المجموع الحالي ثم استخدم النسبة الحالية.','إذا كانت النسبة الآن، طبّقها بعد إرجاع المجموع إلى الآن.',`المجموع الحالي ثم تقسيمه إلى ${ratio+1} أجزاء.`,4);
}

function pastRatioFutureSum(ctx){
  const {rng}=ctx; const pastYears=rng.int(2,5), futureYears=rng.int(3,6), ratio=rng.pick([2,3]); const youngPast=rng.int(6,12), oldPast=ratio*youngPast; const youngNow=youngPast+pastYears, oldNow=oldPast+pastYears; const futureSum=youngNow+oldNow+2*futureYears; const correct=oldNow;
  return base(ctx,'AGE_H_PAST_FUT','علاقة في الماضي مع مجموع مستقبلي','hard',`قبل ${pastYears} سنوات كان عمر علي ${ratio===2?'ضعف':'ثلاثة أمثال'} عمر راشد. بعد ${futureYears} سنوات من الآن سيكون مجموع عمريهما ${futureSum} سنة. كم عمر علي الآن؟`,correct,[oldPast,youngNow,oldNow+futureYears,oldNow-pastYears,youngPast,futureSum/2],[
    `المجموع الآن = ${futureSum} - ${2*futureYears} = ${youngNow+oldNow}.`,
    `المجموع قبل ${pastYears} سنوات = ${youngNow+oldNow} - ${2*pastYears} = ${youngPast+oldPast}.`,
    `في ذلك الوقت كانت النسبة ${ratio}:1؛ قيمة الجزء = ${youngPast}.`,
    `عمر علي قبل ${pastYears} سنوات = ${oldPast}، والآن = ${oldPast}+${pastYears} = ${oldNow}.`
  ],'حوّل المجموع المستقبلي إلى الآن، ثم إلى وقت العلاقة الماضية.','عند تحريك شخصين زمنيًا، المجموع يتغير بمقدار سنتين لكل سنة زمنية.','ارجع بالمجموع إلى زمن العلاقة، حل النسبة، ثم تقدم للعمر الحالي.',5);
}

function twoTimeRatio(ctx){
  const {rng}=ctx; const nowYoung=rng.int(8,14), nowOld=nowYoung+rng.pick([18,20,24]); const years=rng.int(4,8); const futureYoung=nowYoung+years, futureOld=nowOld+years; if(futureOld%futureYoung!==0) return twoTimeRatio(ctx); const ratio=futureOld/futureYoung; if(ratio<2||ratio>4) return twoTimeRatio(ctx); const correct=nowYoung;
  return base(ctx,'AGE_H_TWO_TIME','فرق حالي وعلاقة نسبية مستقبلية','hard',`عمر الأب أكبر من عمر ابنه بـ${nowOld-nowYoung} سنة. بعد ${years} سنوات سيصبح عمر الأب ${ratio===2?'ضعف':ratio===3?'ثلاثة أمثال':'أربعة أمثال'} عمر الابن. كم عمر الابن الآن؟`,correct,[nowOld,futureYoung,futureOld,nowOld-nowYoung,nowYoung+years,Math.max(1,nowYoung-2)],[
    `لنفرض عمر الابن الآن = س، والأب = س + ${nowOld-nowYoung}.`,
    `بعد ${years} سنوات: الابن = س + ${years}، والأب = س + ${nowOld-nowYoung+years}.`,
    `من علاقة ${ratio}:1 نحصل على س = ${nowYoung}.`
  ],'حوّل الجملة المستقبلية إلى معادلة بعد إضافة السنوات للطرفين.','الفرق يبقى ثابتًا لكن نسبة العمر تتغير بمرور الوقت.','استخدم الفرق الثابت لكتابة عمر الأب بدلالة عمر الابن.',5);
}

function base(ctx,template_id,subskill,difficulty,question,correct,distractors,steps,how,remember,fast,estimated_steps){
 return {id:makeId(template_id,ctx.seed),generator_id:template_id,template_id,seed:ctx.seed,family:ctx.family,family_ar:ctx.family_ar,category:ctx.category,subskill,difficulty,question,display_expression:null,correct,distractors:distractors.filter(v=>Number.isFinite(v)&&v>0).map(v=>({value:v,rationale:'خطأ في تحريك العمر زمنيًا أو في استخدام المجموع/الفرق/النسبة.'})),format:v=>`${formatNumber(v)} سنة`,explanation:{how_to_start:how,steps,answer:`الإجابة الصحيحة: ${correct} سنة.`,fast_method:fast,remember},estimated_steps,concept_tags:['age','time-shift'],engine_version:ctx.engineVersion};
}
