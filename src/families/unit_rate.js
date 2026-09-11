import {makeId, formatNumber} from '../utils.js';

export function generateUnitRate({difficulty,rng,seed,engineVersion}){
  const ctx={difficulty,rng,seed,engineVersion,family:'unit_rate',family_ar:'المعدل الوحدوي',category:'المعدل الوحدوي'};
  const list=difficulty==='easy'?[directRate,rateToTime]
    :difficulty==='medium'?[rateThenPercent,rateThenNewQuantity]
    :[rateChangeTarget,twoPhaseRate];
  return rng.pick(list)(ctx);
}

function directRate(ctx){
  const {rng}=ctx; const minutes=rng.pick([5,6,8,10,12]), rate=rng.pick([20,25,30,40,50]), total=minutes*rate, target=rng.pick([3,4,5,7,9]); const correct=target*rate;
  return base(ctx,'RATE_E_DIRECT','معدل وحدوي ثم كمية جديدة','easy',`تنجز آلة ${total} وحدة خلال ${minutes} دقائق بالمعدل نفسه. كم وحدة تنجز خلال ${target} دقائق؟`,correct,[total,rate,target*minutes,correct+rate,Math.max(rate,correct-rate),total/target],v=>`${formatNumber(v)} وحدة`,[
    `المعدل = ${total} ÷ ${minutes} = ${rate} وحدة/دقيقة.`,
    `خلال ${target} دقائق: ${rate} × ${target} = ${correct}.`
  ],'احسب معدل الدقيقة الواحدة أولًا.','معدل الوحدة يحول السؤال إلى ضرب مباشر.','المعدل × الزمن المطلوب.',2);
}

function rateToTime(ctx){
  const {rng}=ctx; const minutes=rng.pick([20,25,30,40]), rate=rng.pick([20,25,30,40]), total=minutes*rate, targetMinutes=rng.pick([45,50,60,75]); const target=targetMinutes*rate; const correct=targetMinutes;
  return base(ctx,'RATE_E_TIME','معدل وحدوي ثم إيجاد الزمن','easy',`كتب شخص ${total} كلمة خلال ${minutes} دقيقة بالمعدل نفسه. كم دقيقة يحتاج لكتابة ${target} كلمة؟`,correct,[minutes,target/rate+5,target/total*minutes+5,correct+10,Math.max(5,correct-10),rate],v=>`${formatNumber(v)} دقيقة`,[
    `المعدل = ${total} ÷ ${minutes} = ${rate} كلمة/دقيقة.`,
    `الزمن = ${target} ÷ ${rate} = ${correct} دقيقة.`
  ],'احسب معدل الوحدة ثم اقسم الكمية الجديدة عليه.','عند ثبات المعدل: الزمن = الكمية ÷ المعدل.','الهدف ÷ المعدل.',2);
}

function rateThenPercent(ctx){
  const {rng}=ctx; const minutes=rng.pick([6,8,9,10]), rate=rng.pick([40,50,60,70]), total=minutes*rate, pct=rng.pick([20,25,50]); const newRate=rate*(1+pct/100), targetMin=rng.pick([4,5,6]); const correct=newRate*targetMin; if(!Number.isInteger(correct)) return rateThenPercent(ctx);
  return base(ctx,'RATE_M_PERCENT','معدل وحدوي ثم زيادة مئوية','medium',`تنجز آلة ${total} وحدة خلال ${minutes} دقائق. بعد صيانة ارتفع معدلها بنسبة ${pct}%. كم وحدة تنجز خلال ${targetMin} دقائق بالمعدل الجديد؟`,correct,[rate*targetMin,total*(1+pct/100),newRate,correct+rate,Math.max(rate,correct-rate),total/minutes*targetMin+pct],v=>`${formatNumber(v)} وحدة`,[
    `المعدل الأصلي = ${total} ÷ ${minutes} = ${rate}.`,
    `المعدل الجديد = ${rate} × ${1+pct/100} = ${formatNumber(newRate)}.`,
    `الإنتاج في ${targetMin} دقائق = ${formatNumber(newRate)} × ${targetMin} = ${correct}.`
  ],'عدّل معدل الوحدة أولًا ثم طبقه على الزمن الجديد.','لا تطبق نسبة التحسن على إجمالي قديم بزمن مختلف.','معدل الوحدة → الزيادة → الزمن.',3);
}

function rateThenNewQuantity(ctx){
  const {rng}=ctx; const qty=rng.pick([12,15,18,20]), amount=rng.pick([180,240,300,360]); const rate=amount/qty; if(!Number.isInteger(rate)) return rateThenNewQuantity(ctx); const targetQty=rng.pick([25,30,36,40]); const correct=rate*targetQty;
  return base(ctx,'RATE_M_SCALE','استخراج معدل وحدة ثم التوسع','medium',`قطعت سيارة ${amount} كم باستخدام ${qty} لترًا من الوقود. إذا استمر المعدل نفسه، فكم كيلومترًا تقطع باستخدام ${targetQty} لترًا؟`,correct,[amount,rate,targetQty*qty,correct+rate*2,Math.max(rate,correct-rate*2),amount/targetQty],v=>`${formatNumber(v)} كم`,[
    `المعدل = ${amount} ÷ ${qty} = ${rate} كم/لتر.`,
    `باستخدام ${targetQty} لترًا: ${rate} × ${targetQty} = ${correct} كم.`
  ],'احسب القيمة لكل وحدة ثم توسع.','معدل الوحدة ثابت ما لم يذكر السؤال تغيره.','كم/لتر × اللترات الجديدة.',2);
}

function rateChangeTarget(ctx){
  const {rng}=ctx; const oldRate=rng.pick([30,40,50,60]), pct=rng.pick([20,25,50]); const newRate=oldRate*(1+pct/100); const oldMinutes=rng.pick([6,8,10]), initial=oldRate*oldMinutes; const target=rng.pick([600,720,800,900,1000]); const correct=target/newRate; if(!Number.isInteger(correct)) return rateChangeTarget(ctx);
  return base(ctx,'RATE_H_TARGET','معدل محسن ثم زمن لهدف جديد','hard',`تنجز آلة ${initial} وحدة خلال ${oldMinutes} دقائق. ارتفع معدلها بعد تطوير بنسبة ${pct}%. كم دقيقة تحتاج بالمعدل الجديد لإنجاز ${target} وحدة؟`,correct,[target/oldRate,oldMinutes,newRate,correct+2,Math.max(1,correct-2),target/initial*oldMinutes],v=>`${formatNumber(v)} دقيقة`,[
    `المعدل الأصلي = ${initial} ÷ ${oldMinutes} = ${oldRate}.`,
    `المعدل الجديد = ${oldRate} × ${1+pct/100} = ${formatNumber(newRate)}.`,
    `الزمن الجديد = ${target} ÷ ${formatNumber(newRate)} = ${correct} دقيقة.`
  ],'استخرج المعدل، عدّله، ثم استخدم الهدف الجديد.','إذا زاد المعدل، الزمن المطلوب لهدف ثابت ينخفض.','الهدف ÷ المعدل الجديد.',4);
}

function twoPhaseRate(ctx){
  const {rng}=ctx; const r1=rng.pick([20,25,30,40]), h1=rng.pick([2,3,4]), pct=rng.pick([20,25,50]); const r2=r1*(1+pct/100), h2=rng.pick([2,3,4]); const correct=r1*h1+r2*h2;
  return base(ctx,'RATE_H_TWO_PHASE','معدل يتغير بين مرحلتين','hard',`يعمل جهاز بمعدل ${r1} وحدة/ساعة لمدة ${h1} ساعات، ثم ارتفع معدله بنسبة ${pct}% وعمل ${h2} ساعات أخرى. كم وحدة أنجز إجمالًا؟`,correct,[r1*(h1+h2),r2*(h1+h2),r2*h2,r1*h1,correct+r1,Math.max(r1,correct-r1)],v=>`${formatNumber(v)} وحدة`,[
    `المرحلة الأولى = ${r1} × ${h1} = ${r1*h1}.`,
    `المعدل الجديد = ${r1} × ${1+pct/100} = ${formatNumber(r2)}.`,
    `المرحلة الثانية = ${formatNumber(r2)} × ${h2} = ${formatNumber(r2*h2)}.`,
    `الإجمالي = ${formatNumber(correct)}.`
  ],'قسّم العمل إلى مرحلتين قبل وبعد تغير المعدل.','لا تطبق المعدل الجديد على الزمن السابق.','إنتاج المرحلة الأولى + الثانية.',4);
}

function base(ctx,template_id,subskill,difficulty,question,correct,distractors,format,steps,how,remember,fast,estimated_steps){
 return {id:makeId(template_id,ctx.seed),generator_id:template_id,template_id,seed:ctx.seed,family:ctx.family,family_ar:ctx.family_ar,category:ctx.category,subskill,difficulty,question,display_expression:null,correct,distractors:distractors.filter(v=>Number.isFinite(v)&&v>0).map(v=>({value:v,rationale:'خطأ في معدل الوحدة أو في تطبيق المعدل على الزمن/الكمية الجديدة.'})),format,explanation:{how_to_start:how,steps,answer:`الإجابة الصحيحة: ${format(correct)}.`,fast_method:fast,remember},estimated_steps,concept_tags:['unit-rate'],engine_version:ctx.engineVersion};
}
