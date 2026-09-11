import {makeId, formatNumber} from '../utils.js';

export function generateWorkTime({difficulty,rng,seed,engineVersion}){
  const ctx={difficulty,rng,seed,engineVersion,family:'work_time',family_ar:'العمال والزمن',category:'العمال والزمن'};
  const list=difficulty==='easy'?[inverseDirect,workVolume]
    :difficulty==='medium'?[changeWorkers,efficiencyChange,targetDeadline]
    :[twoStageWorkers,workersAndEfficiency];
  return rng.pick(list)(ctx);
}

function inverseDirect(ctx){
  const {rng}=ctx; const w1=rng.pick([4,5,6,8,10,12]), d1=rng.pick([6,8,10,12,15,18]); const work=w1*d1; const divisors=[x=>x]; const candidates=[6,8,10,12,15,16,18,20,24].filter(w=>work%w===0&&w!==w1); if(!candidates.length) return inverseDirect(ctx); const w2=rng.pick(candidates), correct=work/w2;
  return base(ctx,'WORK_E_INVERSE','تناسب عكسي مباشر بين العمال والزمن','easy',`يستطيع ${w1} عمال إنجاز عمل في ${d1} أيام. إذا عمل ${w2} عاملًا بالكفاءة نفسها، فكم يومًا يحتاجون؟`,correct,[d1,w2,work/w1+1,correct+2,Math.max(1,correct-2),work/(w1+w2)],v=>`${formatNumber(v)} يوم`,[
    `العمل الكامل = ${w1} × ${d1} = ${work} عامل-يوم.`,
    `الزمن مع ${w2} عاملًا = ${work} ÷ ${w2} = ${correct} أيام.`
  ],'حوّل العمل إلى عامل-يوم.','إذا ثبت العمل والكفاءة: العمال × الأيام ثابت.','اضرب العمال في الأيام ثم اقسم على العدد الجديد.',2);
}

function workVolume(ctx){
  const {rng}=ctx; const workers=rng.pick([6,8,10,12]); const days=rng.pick([4,5,6,8]); const oldUnits=rng.pick([2,3,4]); const newUnits=oldUnits+rng.pick([1,2]); const correct=workers*newUnits/oldUnits; if(!Number.isInteger(correct)) return workVolume(ctx);
  return base(ctx,'WORK_E_VOLUME','زيادة حجم العمل مع ثبات الزمن','easy',`يستطيع ${workers} عمال إنجاز ${oldUnits} مهام متماثلة خلال ${days} أيام. كم عاملًا نحتاج لإنجاز ${newUnits} مهام مماثلة خلال ${days} أيام بالكفاءة نفسها؟`,correct,[workers,newUnits*workers,workers+newUnits-oldUnits,correct+2,Math.max(1,correct-2),workers*oldUnits/newUnits],v=>`${formatNumber(v)} عاملًا`,[
    `الزمن ثابت، لذا عدد العمال يتغير بنسبة حجم العمل.`,
    `عامل التكبير = ${newUnits}/${oldUnits}.`,
    `${workers} × ${newUnits}/${oldUnits} = ${correct} عاملًا.`
  ],'مع ثبات الزمن، العمال يتناسبون مباشرة مع حجم العمل.','إذا زاد العمل وبقي الزمن ثابتًا، زد العمال بالنسبة نفسها.','اضرب عدد العمال في نسبة العمل الجديد إلى القديم.',2);
}

function changeWorkers(ctx){
  const {rng}=ctx; const w1=rng.pick([6,8,10,12]), totalDays=rng.pick([10,12,15,18]); const initialDays=rng.int(2,Math.min(5,totalDays-3)); const change=rng.pick([-2,2,4]); const w2=w1+change; if(w2<=2) return changeWorkers(ctx); const totalWork=w1*totalDays, done=w1*initialDays, remain=totalWork-done; if(remain%w2!==0) return changeWorkers(ctx); const correct=remain/w2;
  return base(ctx,'WORK_M_CHANGE','تغير عدد العمال بعد إنجاز جزء من العمل','medium',`يستطيع ${w1} عمال إنجاز عمل كامل في ${totalDays} يومًا. عملوا ${initialDays} أيام، ثم ${change>0?`انضم إليهم ${change} عمال`:`غادر ${Math.abs(change)} من العمال`}. كم يومًا إضافيًا يحتاج العدد الجديد لإكمال العمل؟`,correct,[totalDays-initialDays,totalDays,remain/w1,correct+2,Math.max(1,correct-2),initialDays+correct],v=>`${formatNumber(v)} يوم`,[
    `العمل الكامل = ${w1} × ${totalDays} = ${totalWork} عامل-يوم.`,
    `المنجز = ${w1} × ${initialDays} = ${done} عامل-يوم.`,
    `المتبقي = ${remain} عامل-يوم.`,
    `العدد الجديد = ${w2}، والزمن = ${remain} ÷ ${w2} = ${correct} أيام.`
  ],'احسب العمل الكامل ثم المنجز ثم المتبقي.','عند تغير عدد العمال أثناء العمل، لا تطبق العدد الجديد على العمل الكامل.','المتبقي ÷ عدد العمال الجديد.',4);
}

function efficiencyChange(ctx){
  const {rng}=ctx; const days=rng.pick([10,12,15,18,20]); const pct=rng.pick([20,25,50]); const correct=days/(1+pct/100); if(!Number.isInteger(correct)) return efficiencyChange(ctx);
  return base(ctx,'WORK_M_EFF','زيادة كفاءة العمال مع ثبات العدد','medium',`فريق ينجز عملًا في ${days} يومًا. بعد تدريب ارتفعت كفاءة الفريق بنسبة ${pct}% مع بقاء عدد العمال نفسه. كم يومًا يحتاج للعمل نفسه؟`,correct,[days,days*(1-pct/100),days-pct/10,correct+2,Math.max(1,correct-2),days*(1+pct/100)],v=>`${formatNumber(v)} يوم`,[
    `الكفاءة الجديدة = ${100+pct}% من القديمة = ×${1+pct/100}.`,
    `الزمن يتغير عكسيًا مع الكفاءة.`,
    `${days} ÷ ${1+pct/100} = ${correct} أيام.`
  ],'الكفاءة والزمن علاقة عكسية للعمل نفسه.','زيادة الكفاءة لا تعني طرح النسبة نفسها من الزمن.','اقسم الزمن القديم على معامل زيادة الكفاءة.',3);
}

function targetDeadline(ctx){
  const {rng}=ctx; const w=rng.pick([6,8,10,12]), totalDays=rng.pick([12,15,18]); const initialDays=rng.pick([3,4,5]); const total=w*totalDays, done=w*initialDays, remain=total-done; const finishDays=rng.pick([3,4,5,6]); if(remain%finishDays!==0) return targetDeadline(ctx); const correct=remain/finishDays;
  return base(ctx,'WORK_M_TARGET','حساب العمل المتبقي ثم عدد العمال المطلوب','medium',`يستطيع ${w} عمال إنجاز عمل كامل في ${totalDays} يومًا. عملوا ${initialDays} أيام، ثم تقرر إنهاء ما تبقى خلال ${finishDays} أيام فقط. كم عاملًا يجب أن يعمل خلال المدة الأخيرة؟`,correct,[w,correct-w,correct+w,remain/(totalDays-initialDays),correct+2,Math.max(1,correct-2)],v=>`${formatNumber(v)} عاملًا`,[
    `العمل الكامل = ${total} عامل-يوم.`,
    `المنجز = ${done}، والمتبقي = ${remain} عامل-يوم.`,
    `لإنهاء المتبقي خلال ${finishDays} أيام: ${remain} ÷ ${finishDays} = ${correct} عاملًا.`
  ],'احسب العمل المتبقي قبل إعادة توزيع الخطة.','عندما يتغير الموعد النهائي، أعد توزيع المتبقي فقط.','عامل-يوم المتبقي ÷ الأيام المتاحة.',4);
}

function twoStageWorkers(ctx){
  const {rng}=ctx; const w1=rng.pick([8,10,12]), totalDays=rng.pick([15,18,20]), firstDays=rng.pick([3,4,5]); const total=w1*totalDays, done=w1*firstDays; const w2=w1-rng.pick([2,4]); if(w2<=0) return twoStageWorkers(ctx); const secondDays=rng.pick([2,3,4]); const done2=w2*secondDays; const remain=total-done-done2; if(remain<=0 || remain%w2!==0) return twoStageWorkers(ctx); const correct=remain/w2;
  return base(ctx,'WORK_H_TWO_STAGE','تغير العمال عبر مرحلتين قبل حساب المتبقي','hard',`يستطيع ${w1} عمال إنجاز عمل في ${totalDays} يومًا. عمل الجميع ${firstDays} أيام، ثم غادر ${w1-w2} عمال وعمل الباقون ${secondDays} أيام إضافية. كم يومًا آخر يحتاج العمال الباقون لإكمال العمل؟`,correct,[totalDays-firstDays-secondDays,(total-done)/w2,remain/w1,correct+2,Math.max(1,correct-2),secondDays+correct],v=>`${formatNumber(v)} يوم`,[
    `العمل الكامل = ${total} عامل-يوم.`,
    `المرحلة الأولى أنجزت ${done}.`,
    `المرحلة الثانية أنجزت ${done2}.`,
    `المتبقي = ${remain}، ومع ${w2} عمال يحتاجون ${remain} ÷ ${w2} = ${correct} أيام.`
  ],'قسّم العمل إلى مراحل واحسب منجز كل مرحلة.','في مسائل المراحل، لا تختصر قبل حساب ما تم في كل فترة.','اجمع المنجز في المرحلتين ثم اطرح من العمل الكامل.',5);
}

function workersAndEfficiency(ctx){
  const {rng}=ctx; const w=rng.pick([8,10,12]), totalDays=rng.pick([12,15,18]); const initial=rng.pick([3,4]); const total=w*totalDays, done=w*initial, remain=total-done; const newW=w-rng.pick([2,4]); const pct=rng.pick([20,25,50]); const effectiveRate=newW*(1+pct/100); const correct=remain/effectiveRate; if(!Number.isInteger(correct)) return workersAndEfficiency(ctx);
  return base(ctx,'WORK_H_WORKERS_EFF','تغير عدد العمال والكفاءة بعد بدء العمل','hard',`يستطيع ${w} عمال إنجاز عمل في ${totalDays} يومًا. بعد ${initial} أيام غادر ${w-newW} عمال، ثم ارتفعت كفاءة كل عامل باقٍ بنسبة ${pct}%. كم يومًا إضافيًا يحتاجون لإكمال العمل؟`,correct,[remain/newW,totalDays-initial,remain/(w*(1+pct/100)),correct+2,Math.max(1,correct-2),totalDays/(1+pct/100)],v=>`${formatNumber(v)} يوم`,[
    `العمل الكامل = ${total} وحدة عامل-يوم بالكفاءة الأصلية.`,
    `المنجز أولًا = ${done}، والمتبقي = ${remain}.`,
    `المعدل اليومي الجديد المكافئ = ${newW} × ${1+pct/100} = ${formatNumber(effectiveRate)} عامل مكافئ.`,
    `الزمن = ${remain} ÷ ${formatNumber(effectiveRate)} = ${correct} أيام.`
  ],'افصل أثر عدد العمال عن أثر الكفاءة، ثم اجمعهما في معدل مكافئ.','إذا تغير العدد والكفاءة معًا، استخدم معدل عمل مكافئ لا عدد العمال وحده.','المتبقي ÷ (العمال الباقون × معامل الكفاءة).',5);
}

function base(ctx,template_id,subskill,difficulty,question,correct,distractors,format,steps,how,remember,fast,estimated_steps){
 return {id:makeId(template_id,ctx.seed),generator_id:template_id,template_id,seed:ctx.seed,family:ctx.family,family_ar:ctx.family_ar,category:ctx.category,subskill,difficulty,question,display_expression:null,correct,distractors:distractors.filter(v=>Number.isFinite(v)&&v>0).map(v=>({value:v,rationale:'خطأ في حساب عامل-يوم، الجزء المتبقي، أو العلاقة العكسية بين العمال والزمن.'})),format,explanation:{how_to_start:how,steps,answer:`الإجابة الصحيحة: ${format(correct)}.`,fast_method:fast,remember},estimated_steps,concept_tags:['work','inverse-proportion'],engine_version:ctx.engineVersion};
}
