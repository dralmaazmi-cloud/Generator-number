import {makeId, formatNumber} from '../utils.js';

export function generatePercentages({difficulty,rng,seed,engineVersion}){
  const ctx={difficulty,rng,seed,engineVersion,family:'percentages',family_ar:'النسب المئوية',category:'النسب المئوية'};
  const list=difficulty==='easy'?[simplePercent,reverseOneChange]
    :difficulty==='medium'?[successiveChange,remainingChain,unitPriceChange]
    :[reverseSuccessive,successiveWithTarget];
  return rng.pick(list)(ctx);
}

function simplePercent(ctx){
  const {rng}=ctx; const pct=rng.pick([10,20,25,30,40,50]); const baseVal=rng.pick([80,100,120,160,200,240,300,400,500]); const correct=baseVal*pct/100;
  const d=[baseVal*(100-pct)/100,baseVal+pct,baseVal-pct,correct+10,Math.max(1,correct-10),baseVal/pct, pct].filter(v=>v>0);
  return base(ctx,'PCT_E_OF','حساب نسبة مئوية من قيمة','easy',`ما قيمة ${pct}% من ${baseVal}؟`,correct,d.map(v=>({value:v,rationale:'خلط بين قيمة النسبة والباقي أو التعامل مع النسبة كعدد عادي.'})),[
    `${pct}% = ${pct}/100.`,
    `${baseVal} × ${pct}/100 = ${correct}.`
  ],'حوّل النسبة إلى جزء من 100 واضرب في القيمة.','النسبة المئوية من عدد = العدد × النسبة ÷ 100.',pct===25?`ربع ${baseVal} = ${correct}.`:`احسب ${pct}% مباشرة من ${baseVal}.`,2);
}

function reverseOneChange(ctx){
  const {rng}=ctx; const pct=rng.pick([20,25,50]); const inc=rng.bool(); const original=rng.pick([80,100,120,160,200,240,300,400]); const final=original*(inc?(1+pct/100):(1-pct/100)); const correct=original;
  const d=[final, final*(inc?(1-pct/100):(1+pct/100)), original+pct, Math.max(1,original-pct), final/(pct/100), original*1.1].filter(v=>v>0);
  return base(ctx,'PCT_E_REVERSE_ONE','استرجاع الأصل بعد تغير واحد','easy',`بعد ${inc?'زيادة':'انخفاض'} قيمة بنسبة ${pct}% أصبحت ${formatNumber(final)}. فما القيمة الأصلية؟`,correct,d.map(v=>({value:v,rationale:'طرح أو إضافة النسبة إلى القيمة النهائية مباشرة بدل الرجوع إلى نسبة الأصل.'})),[
    `القيمة النهائية تمثل ${inc?100+pct:100-pct}% من الأصل.`,
    `الأصل = ${formatNumber(final)} ÷ ${(inc?100+pct:100-pct)/100} = ${correct}.`
  ],'حوّل القيمة النهائية إلى نسبة من الأصل.','بعد زيادة أو نقصان، لا تعكس العملية بطرح النسبة نفسها من الرقم النهائي.','اقسم القيمة النهائية على معامل التغير.',2);
}

function successiveChange(ctx){
  const {rng}=ctx; const p1=rng.pick([10,20,25]); let p2=rng.pick([10,20,25]); if(p2===p1&&rng.bool()) p2=10; const upFirst=rng.bool(); const original=rng.pick([100,200,400,500,800]); const after1=original*(upFirst?1+p1/100:1-p1/100); const final=after1*(upFirst?1-p2/100:1+p2/100); const deltaPct=Math.round(((final-original)/original)*10000)/100; const correct=deltaPct;
  const d=[p1-p2,p1+p2,-(p1-p2),0,Math.abs(deltaPct),-Math.abs(deltaPct),deltaPct+(deltaPct>=0?1:-1)].filter((v,i,a)=>a.indexOf(v)===i);
  const format=v=>`${v>0?'زيادة ':v<0?'انخفاض ':''}${formatNumber(Math.abs(v))}%${v===0?'لا يوجد تغير':''}`.replace(/^0%لا يوجد تغير$/,'لا يوجد تغير');
  const direction=deltaPct>0?'زيادة':deltaPct<0?'انخفاض':'لا يوجد تغير';
  return baseCustom(ctx,'PCT_M_SUCCESSIVE','تغيران مئويان متتاليان','medium',`كانت قيمة ${original}. ${upFirst?'زادت':'انخفضت'} بنسبة ${p1}%، ثم ${upFirst?'انخفضت':'زادت'} القيمة الجديدة بنسبة ${p2}%. ما نسبة التغير النهائية مقارنة بالأصل؟`,correct,d.map(v=>({value:v,rationale:'جمع أو طرح النسب مباشرة أو تجاهل أن النسبة الثانية تُحسب من قيمة جديدة.'})),format,[
    `بعد التغير الأول تصبح القيمة ${formatNumber(after1)}.`,
    `بعد التغير الثاني تصبح ${formatNumber(final)}.`,
    `الفرق عن الأصل = ${formatNumber(final-original)}، أي ${formatNumber(Math.abs(deltaPct))}% ${deltaPct>=0?'زيادة':'انخفاض'}.`
  ],'طبّق كل نسبة على القيمة الموجودة في تلك اللحظة.','النسب المتتابعة لا تُجمع ولا تُطرح مباشرة عادةً.',`استخدم معاملات التغير: ×${upFirst?1+p1/100:1-p1/100} ثم ×${upFirst?1-p2/100:1+p2/100}.`,3,`${direction} ${formatNumber(Math.abs(deltaPct))}%`);
}

function remainingChain(ctx){
  const {rng}=ctx; const total=rng.pick([80,100,120,160,200,240]); const p1=rng.pick([20,25,40]); const p2=rng.pick([10,20,25]); const after1=total*(1-p1/100); const final=after1*(1-p2/100); const correct=final;
  const d=[after1,total*(1-p2/100),total*(1-(p1+p2)/100),total-final,final+p2,Math.max(1,final-p2)];
  return base(ctx,'PCT_M_REMAIN','نسبتان من الباقي','medium',`في مجموعة عددها ${total}، غاب ${p1}% منهم، ثم غادر ${p2}% من الموجودين بعد ذلك. كم بقي؟`,correct,d.map(v=>({value:v,rationale:'حساب النسبة الثانية من العدد الأصلي أو جمع النسبتين مباشرة.'})),[
    `${p1}% من ${total} = ${formatNumber(total-after1)}، فيبقى ${formatNumber(after1)}.`,
    `${p2}% من ${formatNumber(after1)} = ${formatNumber(after1-final)}.`,
    `المتبقي = ${formatNumber(after1)} - ${formatNumber(after1-final)} = ${formatNumber(final)}.`
  ],'طبّق المرحلة الأولى ثم احسب المرحلة الثانية من العدد الجديد.','انتبه لعبارات مثل «من الموجودين» أو «من الباقي».','احسب الباقي بعد كل مرحلة على حدة.',3);
}

function unitPriceChange(ctx){
  const {rng}=ctx; const qty1=rng.pick([2,4,5,8]); const unit=rng.pick([5,6,7,8,10,12]); const total1=qty1*unit; const pct=rng.pick([10,20,25,50]); const qty2=rng.pick([5,10,12,15]); const newUnit=unit*(1+pct/100); const correct=newUnit*qty2;
  const d=[unit*qty2,total1*(1+pct/100),correct-pct,correct+pct,qty2*(unit+pct),total1+percentVal(total1,pct)].filter(v=>v>0);
  return base(ctx,'PCT_M_UNIT_PRICE','معدل وحدوي ثم زيادة مئوية','medium',`ثمن ${qty1} وحدات هو ${total1} درهمًا. إذا ارتفع سعر الوحدة بنسبة ${pct}%، فما ثمن ${qty2} وحدات بعد الزيادة؟`,correct,d.map(v=>({value:v,rationale:'تطبيق النسبة على المجموع الخطأ أو نسيان تعديل سعر الوحدة قبل حساب الكمية الجديدة.'})),[
    `سعر الوحدة الأصلي = ${total1} ÷ ${qty1} = ${unit}.`,
    `السعر الجديد = ${unit} × ${1+pct/100} = ${formatNumber(newUnit)}.`,
    `ثمن ${qty2} وحدات = ${formatNumber(newUnit)} × ${qty2} = ${formatNumber(correct)}.`
  ],'احسب سعر الوحدة أولًا، ثم عدّل السعر بالنسبة المطلوبة.','إذا تغير سعر الوحدة، عدّل الوحدة قبل التوسع إلى كمية جديدة.','سعر الوحدة → تطبيق الزيادة → ضرب في الكمية المطلوبة.',3);
}

function reverseSuccessive(ctx){
  const {rng}=ctx; const p1=rng.pick([20,25,50]); const p2=rng.pick([10,20,25]); const original=rng.pick([100,200,300,400,500,600,800]); const final=original*(1+p1/100)*(1-p2/100); const correct=original;
  const d=[final,final/(1+p1/100),final/(1-p2/100),original*(1+p1/100),original*(1-p2/100),original+50,Math.max(1,original-50)];
  return base(ctx,'PCT_H_REVERSE_CHAIN','استرجاع الأصل بعد تغيرين متتاليين','hard',`زادت قيمة بنسبة ${p1}%، ثم انخفضت القيمة الجديدة بنسبة ${p2}%. إذا أصبحت القيمة النهائية ${formatNumber(final)}، فما القيمة الأصلية؟`,correct,d.map(v=>({value:v,rationale:'عكس مرحلة واحدة فقط أو جمع النسبتين بدل عكس المعاملين بالتتابع.'})),[
    `المعامل الكلي = ${1+p1/100} × ${1-p2/100} = ${formatNumber((1+p1/100)*(1-p2/100),3)}.`,
    `القيمة النهائية = الأصل × المعامل الكلي.`,
    `الأصل = ${formatNumber(final)} ÷ ${formatNumber((1+p1/100)*(1-p2/100),3)} = ${correct}.`
  ],'حوّل كل تغير إلى معامل، ثم اعكس حاصل ضرب المعاملين.','عكس تغيرين متتاليين يتطلب عكس كل المراحل لا طرح النسب.',`اقسم النهائي على حاصل ضرب معاملي التغير.`,4);
}

function successiveWithTarget(ctx){
  const {rng}=ctx; const original=rng.pick([200,300,400,500,600]); const p1=rng.pick([10,20,25]); const p2=rng.pick([10,20]); const final=original*(1-p1/100)*(1+p2/100); const correct=final;
  const d=[original*(1-p1/100),original*(1+p2/100),original*(1+(p2-p1)/100),original,final+20,Math.max(1,final-20)];
  return base(ctx,'PCT_H_CHAIN_VALUE','خصم ثم زيادة على القيمة الجديدة','hard',`قيمة أصلية مقدارها ${original}. خُفّضت بنسبة ${p1}%، ثم زيدت القيمة الجديدة بنسبة ${p2}%. ما القيمة النهائية؟`,correct,d.map(v=>({value:v,rationale:'تطبيق الزيادة على الأصل أو استخدام صافي النسب بدل القيم المتتابعة.'})),[
    `بعد الخصم: ${original} × ${1-p1/100} = ${formatNumber(original*(1-p1/100))}.`,
    `ثم نطبق الزيادة ${p2}% على الناتج الجديد.`,
    `${formatNumber(original*(1-p1/100))} × ${1+p2/100} = ${formatNumber(correct)}.`
  ],'طبّق الخصم ثم الزيادة على الناتج لا على الأصل.','كل نسبة متتابعة لها أساس حساب جديد.','استخدم معاملين متتاليين بدل حساب النسب منفصلة.',4);
}

function percentVal(v,p){return v*p/100;}

function base(ctx,template_id,subskill,difficulty,question,correct,distractors,steps,how,remember,fast,estimated_steps){return baseCustom(ctx,template_id,subskill,difficulty,question,correct,distractors,v=>formatNumber(v),steps,how,remember,fast,estimated_steps,formatNumber(correct));}
function baseCustom(ctx,template_id,subskill,difficulty,question,correct,distractors,format,steps,how,remember,fast,estimated_steps,answerDisplay){
 return {id:makeId(template_id,ctx.seed),generator_id:template_id,template_id,seed:ctx.seed,family:ctx.family,family_ar:ctx.family_ar,category:ctx.category,subskill,difficulty,question,display_expression:null,correct,distractors,format,explanation:{how_to_start:how,steps,answer:`الإجابة الصحيحة: ${answerDisplay}.`,fast_method:fast,remember},estimated_steps,concept_tags:['percentage','successive-change'],engine_version:ctx.engineVersion};
}
