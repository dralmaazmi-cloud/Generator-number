import {makeId, formatNumber} from '../utils.js';

export function generateMachines({difficulty,rng,seed,engineVersion}){
  const ctx={difficulty,rng,seed,engineVersion,family:'machines',family_ar:'الآلات والإنتاج',category:'الآلات والإنتاج'};
  const list=difficulty==='easy'?[machineHours,requiredMachines]
    :difficulty==='medium'?[newMachineFaster,oneStops,subsetUpgrade]
    :[twoTypesCombined,stageChange];
  return rng.pick(list)(ctx);
}

function machineHours(ctx){
  const {rng}=ctx; const machines=rng.pick([3,4,5,6]), hours=rng.pick([3,4,5,6]), rate=rng.pick([10,12,15,20,25]); const total=machines*hours*rate; const newMachines=rng.pick([2,3,4,5]); const newHours=rng.pick([2,3,4]); const correct=newMachines*newHours*rate;
  return base(ctx,'MACH_E_HOURS','معدل آلة واحدة من آلة-ساعة','easy',`تنتج ${machines} آلات متماثلة ${total} قطعة خلال ${hours} ساعات. كم تنتج ${newMachines} آلات من النوع نفسه خلال ${newHours} ساعات؟`,correct,[rate,total,newMachines*hours*rate,machines*newHours*rate,correct+rate,Math.max(rate,correct-rate)],v=>`${formatNumber(v)} قطعة`,[
    `إجمالي آلة-ساعة = ${machines} × ${hours} = ${machines*hours}.`,
    `معدل آلة واحدة = ${total} ÷ ${machines*hours} = ${rate} قطعة/ساعة.`,
    `الإنتاج المطلوب = ${newMachines} × ${newHours} × ${rate} = ${correct}.`
  ],'استخرج إنتاج آلة واحدة في ساعة واحدة.','آلة-ساعة تجعل مسائل الإنتاج مباشرة.','المعدل للوحدة × عدد الآلات × الزمن.',3);
}

function requiredMachines(ctx){
  const {rng}=ctx; const machines=rng.pick([4,5,6]), hours=rng.pick([4,5,6]), rate=rng.pick([10,12,15,20]); const total=machines*hours*rate; const targetHours=rng.pick([2,3,4]), req=rng.pick([6,8,10,12]); const target=req*targetHours*rate; const correct=req;
  return base(ctx,'MACH_E_REQUIRED','إيجاد عدد الآلات المطلوبة','easy',`تنتج ${machines} آلات متماثلة ${total} قطعة خلال ${hours} ساعات. كم آلة نحتاج لإنتاج ${target} قطعة خلال ${targetHours} ساعات؟`,correct,[machines,targetHours,total/targetHours/rate,req+2,Math.max(1,req-2),target/rate],v=>`${formatNumber(v)} آلة`,[
    `معدل آلة واحدة = ${total} ÷ (${machines}×${hours}) = ${rate} قطعة/ساعة.`,
    `الآلة الواحدة خلال ${targetHours} ساعات تنتج ${rate*targetHours}.`,
    `عدد الآلات = ${target} ÷ ${rate*targetHours} = ${req}.`
  ],'احسب معدل آلة واحدة أولًا.','عدد الآلات = الإنتاج المطلوب ÷ إنتاج آلة واحدة خلال الزمن المتاح.','معدل الوحدة ثم اقسم الهدف على إنتاج الوحدة.',3);
}

function newMachineFaster(ctx){
  const {rng}=ctx; const machines=rng.pick([3,4,5]), hours=rng.pick([4,5,6]), oldRate=rng.pick([12,16,20,24]); const total=machines*hours*oldRate; const pct=rng.pick([25,50]); const newRate=oldRate*(1+pct/100); const targetH=rng.pick([2,3,4]); const correct=(oldRate+newRate)*targetH;
  return base(ctx,'MACH_M_NEW_FAST','آلة قديمة وآلة أسرع بنسبة معلومة','medium',`تنتج ${machines} آلات متماثلة ${total} قطعة خلال ${hours} ساعات. آلة جديدة تنتج في الساعة أكثر من الآلة القديمة بنسبة ${pct}%. كم تنتج آلة قديمة واحدة وآلة جديدة واحدة معًا خلال ${targetH} ساعات؟`,correct,[2*oldRate*targetH,2*newRate*targetH,newRate*targetH,oldRate*targetH,correct+oldRate,Math.max(oldRate,correct-oldRate)],v=>`${formatNumber(v)} قطعة`,[
    `معدل الآلة القديمة = ${total} ÷ (${machines}×${hours}) = ${oldRate}.`,
    `معدل الجديدة = ${oldRate} × ${1+pct/100} = ${formatNumber(newRate)}.`,
    `المعدل معًا = ${formatNumber(oldRate+newRate)}، وخلال ${targetH} ساعات = ${formatNumber(correct)}.`
  ],'استخرج معدل الآلة القديمة ثم عدّل معدل الجديدة.','لا تطبق نسبة الزيادة على الإنتاج الكلي إذا كانت آلة واحدة فقط مختلفة.','اجمع معدلي الآلتين ثم اضرب في الزمن.',4);
}

function oneStops(ctx){
  const {rng}=ctx; const machines=rng.pick([3,4,5]), rate=rng.pick([12,15,20,25]); const h1=rng.pick([1,2,3]), h2=rng.pick([1,2,3]); const stopped=rng.pick([1,2]); if(stopped>=machines) return oneStops(ctx); const correct=machines*rate*h1+(machines-stopped)*rate*h2;
  return base(ctx,'MACH_M_STOP','توقف آلات أثناء جزء من زمن العمل','medium',`تنتج كل آلة من ${machines} آلات متماثلة ${rate} قطعة في الساعة. عملت الآلات كلها ${h1} ساعات، ثم توقفت ${stopped} آلة وعملت البقية ${h2} ساعات إضافية. كم قطعة أُنتجت؟`,correct,[machines*rate*(h1+h2),(machines-stopped)*rate*(h1+h2),machines*rate*h1,correct+rate*h2,Math.max(rate,correct-rate*h2),correct+rate],v=>`${formatNumber(v)} قطعة`,[
    `المرحلة الأولى = ${machines} × ${rate} × ${h1} = ${machines*rate*h1}.`,
    `المرحلة الثانية = ${machines-stopped} × ${rate} × ${h2} = ${(machines-stopped)*rate*h2}.`,
    `الإجمالي = ${correct}.`
  ],'قسّم الزمن إلى مرحلتين قبل وبعد التوقف.','عندما يتغير عدد الآلات، احسب كل فترة منفصلة.','إنتاج المرحلة الأولى + إنتاج المرحلة الثانية.',3);
}

function subsetUpgrade(ctx){
  const {rng}=ctx; const machines=4, hours=rng.pick([4,5,6]), rate=rng.pick([15,20,25]); const upgraded=rng.pick([1,2,3]), pct=rng.pick([20,25,50]); const newRate=rate*(1+pct/100); const correct=(upgraded*newRate+(machines-upgraded)*rate)*hours;
  return base(ctx,'MACH_M_SUBSET_UP','زيادة إنتاجية بعض الآلات فقط','medium',`تعمل ${machines} آلات متماثلة بمعدل ${rate} قطعة/ساعة لكل آلة. طُورت ${upgraded} منها فزادت إنتاجيتها بنسبة ${pct}% وبقيت البقية كما هي. كم تنتج الآلات الأربع خلال ${hours} ساعات؟`,correct,[machines*newRate*hours,machines*rate*hours,upgraded*newRate*hours,(machines-upgraded)*rate*hours,correct+rate*hours,Math.max(rate,correct-rate*hours)],v=>`${formatNumber(v)} قطعة`,[
    `معدل الآلة المطورة = ${rate} × ${1+pct/100} = ${formatNumber(newRate)}.`,
    `معدل الآلات المطورة معًا = ${formatNumber(upgraded*newRate)}، والبقية = ${(machines-upgraded)*rate}.`,
    `المعدل الكلي = ${formatNumber(upgraded*newRate+(machines-upgraded)*rate)} قطعة/ساعة.`,
    `خلال ${hours} ساعات = ${formatNumber(correct)} قطعة.`
  ],'افصل الآلات المطورة عن غير المطورة.','زيادة الإنتاجية لجزء من الآلات لا تطبق على المجموعة كلها.','احسب معدل كل مجموعة ثم اجمع.',4);
}

function twoTypesCombined(ctx){
  const {rng}=ctx; const rA=rng.pick([12,15,18,20]), rB=rng.pick([20,24,25,30]); const nA=rng.pick([2,3]), nB=rng.pick([1,2,3]); const hours=rng.pick([3,4,5]); const correct=(nA*rA+nB*rB)*hours;
  return base(ctx,'MACH_H_TWO_TYPES','نوعان من الآلات بمعدلين مختلفين','hard',`تنتج آلة من النوع أ ${rA} قطعة/ساعة، وآلة من النوع ب ${rB} قطعة/ساعة. إذا عملت ${nA} آلات من أ و${nB} آلات من ب معًا لمدة ${hours} ساعات، فكم قطعة تنتج؟`,correct,[(nA+nB)*rA*hours,(nA+nB)*rB*hours,(rA+rB)*hours,nA*rA*hours+nB*rB,correct+rA*hours,Math.max(rA,correct-rB*hours)],v=>`${formatNumber(v)} قطعة`,[
    `معدل مجموعة أ = ${nA}×${rA} = ${nA*rA}.`,
    `معدل مجموعة ب = ${nB}×${rB} = ${nB*rB}.`,
    `المعدل الكلي = ${nA*rA+nB*rB} قطعة/ساعة.`,
    `الإنتاج = ${nA*rA+nB*rB} × ${hours} = ${correct}.`
  ],'احسب معدل كل نوع على حدة ثم اجمع.','لا تستخدم متوسط المعدلين إذا كان عدد الآلات مختلفًا.','معدل أ الكلي + معدل ب الكلي، ثم × الزمن.',4);
}

function stageChange(ctx){
  const {rng}=ctx; const machines=rng.pick([4,5,6]), rate=rng.pick([10,12,15,20]), h1=rng.pick([2,3]); const h2=rng.pick([2,3]); const upgraded=rng.pick([1,2]); if(upgraded>=machines) return stageChange(ctx); const pct=rng.pick([25,50]); const newRate=rate*(1+pct/100); const correct=machines*rate*h1 + (upgraded*newRate+(machines-upgraded)*rate)*h2;
  return base(ctx,'MACH_H_STAGE_UP','مرحلتان مع تطوير جزء من الآلات','hard',`عملت ${machines} آلات متماثلة بمعدل ${rate} قطعة/ساعة لمدة ${h1} ساعات. ثم طُورت ${upgraded} آلة فزادت إنتاجيتها ${pct}%، وعملت المجموعة كلها ${h2} ساعات إضافية. كم بلغ الإنتاج الكلي؟`,correct,[machines*rate*(h1+h2),machines*newRate*(h1+h2),correct-rate*h2,correct+rate*h2,(upgraded*newRate)*h2,correct-rate*h1],v=>`${formatNumber(v)} قطعة`,[
    `المرحلة الأولى = ${machines}×${rate}×${h1} = ${machines*rate*h1}.`,
    `بعد التطوير: معدل ${upgraded} آلة = ${formatNumber(upgraded*newRate)}، والبقية = ${(machines-upgraded)*rate}.`,
    `إنتاج المرحلة الثانية = ${formatNumber((upgraded*newRate+(machines-upgraded)*rate)*h2)}.`,
    `الإجمالي = ${formatNumber(correct)}.`
  ],'قسّم السؤال إلى ما قبل التطوير وما بعده.','في تغيرات الإنتاج متعددة المراحل، لا تطبق المعدل الجديد على الماضي.','احسب كل مرحلة بمعدلها الخاص ثم اجمع.',5);
}

function base(ctx,template_id,subskill,difficulty,question,correct,distractors,format,steps,how,remember,fast,estimated_steps){
 return {id:makeId(template_id,ctx.seed),generator_id:template_id,template_id,seed:ctx.seed,family:ctx.family,family_ar:ctx.family_ar,category:ctx.category,subskill,difficulty,question,display_expression:null,correct,distractors:distractors.filter(v=>Number.isFinite(v)&&v>0).map(v=>({value:v,rationale:'خطأ في معدل آلة واحدة، عدد الآلات الفعال، أو تقسيم مراحل الإنتاج.'})),format,explanation:{how_to_start:how,steps,answer:`الإجابة الصحيحة: ${format(correct)}.`,fast_method:fast,remember},estimated_steps,concept_tags:['machine-rate','production'],engine_version:ctx.engineVersion};
}
