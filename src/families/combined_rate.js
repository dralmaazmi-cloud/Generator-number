import {makeId, formatNumber} from '../utils.js';

export function generateCombinedRate({difficulty,rng,seed,engineVersion}){
  const ctx={difficulty,rng,seed,engineVersion,family:'combined_rate',family_ar:'المعدل المشترك',category:'المعدل المشترك'};
  const list=difficulty==='easy'?[togetherOutput,togetherTime]
    :difficulty==='medium'?[soloThenTogether,togetherThenSolo]
    :[stagedTarget,threeRates];
  return rng.pick(list)(ctx);
}

function togetherOutput(ctx){
  const {rng}=ctx; const a=rng.pick([6,8,10,12,15]), b=rng.pick([8,10,12,15,20]); const h=rng.pick([3,4,5,6]); const correct=(a+b)*h;
  return base(ctx,'COMB_E_OUTPUT','جمع معدلين خلال مدة معلومة','easy',`ينجز العامل أ ${a} وحدة في الساعة، وينجز العامل ب ${b} وحدة في الساعة. إذا عملا معًا ${h} ساعات، فكم وحدة ينجزان؟`,correct,[a*h,b*h,(a+b),Math.abs(a-b)*h,correct+a,Math.max(1,correct-b)],v=>`${formatNumber(v)} وحدة`,[
    `المعدل المشترك = ${a}+${b} = ${a+b} وحدة/ساعة.`,
    `خلال ${h} ساعات: ${a+b} × ${h} = ${correct}.`
  ],'اجمع المعدلين لأنهما يعملان في الوقت نفسه.','تأكد أن المعدلين بنفس الوحدة الزمنية قبل جمعهما.','(معدل أ + معدل ب) × الزمن.',2);
}

function togetherTime(ctx){
  const {rng}=ctx; const a=rng.pick([10,12,15,18]), b=rng.pick([15,18,20,24]); const h=rng.pick([4,5,6,8]); const target=(a+b)*h; const correct=h;
  return base(ctx,'COMB_E_TIME','جمع معدلين ثم إيجاد الزمن','easy',`تنجز آلة أ ${a} قطعة/ساعة، وآلة ب ${b} قطعة/ساعة. إذا عملتا معًا، فكم ساعة تحتاجان لإنتاج ${target} قطعة؟`,correct,[target/a,target/b,target/(a+b)+1,a+b,correct+2,Math.max(1,correct-2)],v=>`${formatNumber(v)} ساعة`,[
    `المعدل المشترك = ${a}+${b} = ${a+b} قطعة/ساعة.`,
    `الزمن = ${target} ÷ ${a+b} = ${correct} ساعات.`
  ],'اجمع المعدلات ثم اقسم الهدف عليها.','بعد جمع المعدلات، يصبح السؤال كمية ÷ معدل.','الهدف ÷ المعدل المشترك.',2);
}

function soloThenTogether(ctx){
  const {rng}=ctx; const a=rng.pick([12,15,18,20]), b=rng.pick([8,10,12,15]); const solo=rng.pick([2,3,4]); const together=rng.pick([3,4,5,6]); const target=a*solo+(a+b)*together; const correct=together;
  return base(ctx,'COMB_M_SOLO_THEN','عمل منفرد أولًا ثم عمل مشترك','medium',`ينجز العامل أ ${a} وحدة/ساعة، والعامل ب ${b} وحدة/ساعة. عمل أ وحده ${solo} ساعات، ثم عملا معًا حتى وصل الإنجاز إلى ${target} وحدة. كم ساعة عملا معًا؟`,correct,[target/(a+b),(target-a*solo)/a,(target-a*solo)/b,solo+together,together+1,Math.max(1,together-1)],v=>`${formatNumber(v)} ساعة`,[
    `إنجاز أ منفردًا = ${a} × ${solo} = ${a*solo}.`,
    `المتبقي = ${target}-${a*solo} = ${target-a*solo}.`,
    `المعدل المشترك = ${a+b}.`,
    `الزمن المشترك = ${target-a*solo} ÷ ${a+b} = ${together} ساعات.`
  ],'احسب ما أُنجز في المرحلة المنفردة أولًا.','لا تستخدم المعدل المشترك على كامل الهدف إذا كان أحدهما بدأ وحده.','المتبقي ÷ المعدل المشترك.',4);
}

function togetherThenSolo(ctx){
  const {rng}=ctx; const a=rng.pick([10,12,15]), b=rng.pick([15,18,20]); const bothH=rng.pick([2,3,4]); const soloH=rng.pick([2,3,4,5]); const target=(a+b)*bothH+a*soloH; const correct=soloH;
  return base(ctx,'COMB_M_TOGETHER_SOLO','عمل مشترك ثم استمرار طرف واحد','medium',`يعمل أ بمعدل ${a} وحدة/ساعة وب بمعدل ${b} وحدة/ساعة. عملا معًا ${bothH} ساعات، ثم توقف ب واستمر أ وحده حتى بلغ الإنجاز ${target} وحدة. كم ساعة عمل أ وحده بعد توقف ب؟`,correct,[target/a,target/(a+b),bothH+soloH,soloH+1,Math.max(1,soloH-1),(target-(a+b)*bothH)/b],v=>`${formatNumber(v)} ساعة`,[
    `الإنجاز المشترك = ${a+b} × ${bothH} = ${(a+b)*bothH}.`,
    `المتبقي = ${target}-${(a+b)*bothH} = ${a*soloH}.`,
    `أ يعمل بمعدل ${a}، إذن الزمن = ${a*soloH} ÷ ${a} = ${soloH} ساعات.`
  ],'قسّم السؤال إلى فترة مشتركة ثم فترة منفردة.','كل مرحلة لها معدلها الخاص.','اطرح الإنجاز المشترك ثم اقسم المتبقي على معدل أ.',4);
}

function stagedTarget(ctx){
  const {rng}=ctx; const a=rng.pick([12,15,18]), b=rng.pick([8,10,12]), soloA=rng.pick([2,3]); const togetherH=rng.pick([2,3,4]); const soloB=rng.pick([2,3,4]); const target=a*soloA+(a+b)*togetherH+b*soloB; const correct=soloB;
  return base(ctx,'COMB_H_STAGED','ثلاث مراحل بمعدلات مختلفة','hard',`ينجز أ ${a} وحدة/ساعة وب ${b} وحدة/ساعة. عمل أ وحده ${soloA} ساعات، ثم عملا معًا ${togetherH} ساعات، ثم استمر ب وحده حتى وصل الإنجاز إلى ${target} وحدة. كم ساعة عمل ب وحده في المرحلة الأخيرة؟`,correct,[target/b,(target-a*soloA)/(a+b),soloA+togetherH+soloB,soloB+1,Math.max(1,soloB-1),(target-(a+b)*togetherH)/b],v=>`${formatNumber(v)} ساعة`,[
    `المرحلة الأولى = ${a}×${soloA} = ${a*soloA}.`,
    `المرحلة الثانية = ${a+b}×${togetherH} = ${(a+b)*togetherH}.`,
    `المتبقي للمرحلة الأخيرة = ${target}-${a*soloA}-${(a+b)*togetherH} = ${b*soloB}.`,
    `زمن ب منفردًا = ${b*soloB} ÷ ${b} = ${soloB} ساعات.`
  ],'احسب إنجاز كل مرحلة بالترتيب.','في ثلاث مراحل، اجعل كل فترة سطرًا مستقلًا ثم اطرح من الهدف.','الهدف - المرحلتين الأولى والثانية، ثم ÷ معدل ب.',5);
}

function threeRates(ctx){
  const {rng}=ctx; const rates=rng.sample([6,8,10,12,15,18,20],3); const h=rng.pick([3,4,5]); const correct=rates.reduce((a,b)=>a+b,0)*h;
  return base(ctx,'COMB_H_THREE','ثلاثة معدلات تعمل معًا','hard',`تعمل ثلاث آلات بمعدلات ${rates[0]} و${rates[1]} و${rates[2]} وحدة/ساعة. إذا عملت معًا ${h} ساعات، فكم وحدة تنتج؟`,correct,[rates[0]*h,rates[1]*h,(rates[0]+rates[1])*h,rates.reduce((a,b)=>a+b,0),correct+rates[2],Math.max(1,correct-rates[2])],v=>`${formatNumber(v)} وحدة`,[
    `المعدل المشترك = ${rates.join(' + ')} = ${rates.reduce((a,b)=>a+b,0)} وحدة/ساعة.`,
    `خلال ${h} ساعات = ${rates.reduce((a,b)=>a+b,0)} × ${h} = ${correct}.`
  ],'اجمع المعدلات الثلاثة قبل ضرب الزمن.','يمكن جمع أي عدد من المعدلات إذا كانت الوحدات الزمنية نفسها ويعمل الجميع في الوقت نفسه.','اجمع المعدلات ثم × الزمن.',3);
}

function base(ctx,template_id,subskill,difficulty,question,correct,distractors,format,steps,how,remember,fast,estimated_steps){
 return {id:makeId(template_id,ctx.seed),generator_id:template_id,template_id,seed:ctx.seed,family:ctx.family,family_ar:ctx.family_ar,category:ctx.category,subskill,difficulty,question,display_expression:null,correct,distractors:distractors.filter(v=>Number.isFinite(v)&&v>0).map(v=>({value:v,rationale:'خطأ في تحديد الفترة التي يعمل فيها كل طرف أو في استخدام المعدل المشترك.'})),format,explanation:{how_to_start:how,steps,answer:`الإجابة الصحيحة: ${format(correct)}.`,fast_method:fast,remember},estimated_steps,concept_tags:['combined-rate','stages'],engine_version:ctx.engineVersion};
}
