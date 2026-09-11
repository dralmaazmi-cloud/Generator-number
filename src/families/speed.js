import {makeId, formatNumber} from '../utils.js';

export function generateSpeed({difficulty,rng,seed,engineVersion}){
  const ctx={difficulty,rng,seed,engineVersion,family:'speed',family_ar:'السرعة والمسافة والزمن',category:'السرعة والمسافة والزمن'};
  const list=difficulty==='easy'?[simpleTime,simpleDistance]
    :difficulty==='medium'?[twoStageTime,averageSpeedUnequalTime,equalDistanceTotalTime]
    :[meetingDelayed,catchupDelayed,sameDistanceTimeDifference];
  return rng.pick(list)(ctx);
}

function simpleTime(ctx){
  const {rng}=ctx; const speed=rng.pick([40,50,60,70,80,90]); const hours=rng.pick([1.5,2,2.5,3,4]); const distance=speed*hours; const correct=hours;
  return base(ctx,'SPD_E_TIME','إيجاد الزمن من المسافة والسرعة','easy',`قطعت سيارة ${formatNumber(distance)} كم بسرعة ${speed} كم/ساعة. كم ساعة استغرقت؟`,correct,[distance/speed+1, distance/(speed+10), distance/(speed-10), hours+.5, Math.max(.5,hours-.5), speed/distance],v=>`${formatNumber(v)} ساعة`,[
    `الزمن = المسافة ÷ السرعة.`,
    `${formatNumber(distance)} ÷ ${speed} = ${formatNumber(hours)} ساعة.`
  ],'استخدم العلاقة: الزمن = المسافة ÷ السرعة.','تأكد أن وحدات المسافة والسرعة متوافقة.','اقسم المسافة على السرعة مباشرة.',2);
}

function simpleDistance(ctx){
  const {rng}=ctx; const speed=rng.pick([40,50,60,70,80,90]); const hours=rng.pick([1,1.5,2,2.5,3,4]); const correct=speed*hours;
  return base(ctx,'SPD_E_DISTANCE','إيجاد المسافة من السرعة والزمن','easy',`سارت سيارة بسرعة ${speed} كم/ساعة لمدة ${formatNumber(hours)} ساعة. ما المسافة التي قطعتها؟`,correct,[speed+hours,speed*(hours+1),speed*Math.max(.5,hours-.5),correct+speed/2,Math.max(1,correct-speed/2),speed/hours],v=>`${formatNumber(v)} كم`,[
    `المسافة = السرعة × الزمن.`,
    `${speed} × ${formatNumber(hours)} = ${formatNumber(correct)} كم.`
  ],'استخدم العلاقة: المسافة = السرعة × الزمن.','المسافة تزداد مباشرة مع السرعة والزمن.','اضرب السرعة في الزمن.',2);
}

function twoStageTime(ctx){
  const {rng}=ctx; const s1=rng.pick([50,60,70,80]), s2=rng.pick([40,60,80,90]); const t1=rng.pick([1,1.5,2,2.5]), t2=rng.pick([1,1.5,2,2.5,3]); const d1=s1*t1,d2=s2*t2; const totalH=t1+t2; const correct=totalH*60;
  return base(ctx,'SPD_M_TWO_TIME','زمن مرحلتين ثم التحويل إلى دقائق','medium',`قطعت سيارة ${formatNumber(d1)} كم بسرعة ${s1} كم/ساعة، ثم قطعت ${formatNumber(d2)} كم بسرعة ${s2} كم/ساعة دون توقف. كم دقيقة استغرقت الرحلة كاملة؟`,correct,[t1*60,t2*60,(d1+d2)/s1*60,(d1+d2)/s2*60,correct+30,Math.max(30,correct-30)],v=>`${formatNumber(v)} دقيقة`,[
    `زمن المرحلة الأولى = ${formatNumber(d1)} ÷ ${s1} = ${formatNumber(t1)} ساعة.`,
    `زمن المرحلة الثانية = ${formatNumber(d2)} ÷ ${s2} = ${formatNumber(t2)} ساعة.`,
    `الزمن الكلي = ${formatNumber(totalH)} ساعة = ${formatNumber(correct)} دقيقة.`
  ],'احسب زمن كل مرحلة منفصلًا ثم اجمع.','إذا تغيرت السرعة، لا تجمع المسافات وتقسم على سرعة واحدة.','زمن1 + زمن2، ثم ×60.',3);
}

function averageSpeedUnequalTime(ctx){
  const {rng}=ctx; const s1=rng.pick([50,60,70,80]), s2=rng.pick([80,90,100,120]); if(s1===s2) return averageSpeedUnequalTime(ctx); const t1=rng.pick([1,1.5,2]), t2=rng.pick([2,2.5,3]); const d1=s1*t1,d2=s2*t2; const totalT=t1+t2; const correct=(d1+d2)/totalT; if(!Number.isInteger(correct)) return averageSpeedUnequalTime(ctx); const simpleAvg=(s1+s2)/2;
  return base(ctx,'SPD_M_AVG','متوسط السرعة مع مدد زمنية مختلفة','medium',`سارت سيارة ${formatNumber(t1)} ساعة بسرعة ${s1} كم/ساعة، ثم ${formatNumber(t2)} ساعة بسرعة ${s2} كم/ساعة. ما متوسط سرعتها في الرحلة كلها؟`,correct,[simpleAvg,s1,s2,(d1+d2)/(t1),correct+5,Math.max(5,correct-5)],v=>`${formatNumber(v)} كم/ساعة`,[
    `المسافة الأولى = ${s1} × ${formatNumber(t1)} = ${formatNumber(d1)} كم.`,
    `المسافة الثانية = ${s2} × ${formatNumber(t2)} = ${formatNumber(d2)} كم.`,
    `متوسط السرعة = (${formatNumber(d1)}+${formatNumber(d2)}) ÷ (${formatNumber(t1)}+${formatNumber(t2)}) = ${correct} كم/ساعة.`
  ],'متوسط السرعة = المسافة الكلية ÷ الزمن الكلي.','لا تأخذ متوسط السرعتين حسابيًا إذا اختلف الزمن.','اجمع المسافات، اجمع الأزمنة، ثم اقسم.',4);
}

function equalDistanceTotalTime(ctx){
  const {rng}=ctx; const s1=rng.pick([60,80,90]), s2=rng.pick([30,40,45,60]); if(s1===s2) return equalDistanceTotalTime(ctx); // choose half distance common multiple, derive times and total clean
  const half=rng.pick([120,180,240,360]); if(half%s1||half%s2) return equalDistanceTotalTime(ctx); const t1=half/s1,t2=half/s2, total=t1+t2, correct=2*half;
  return base(ctx,'SPD_M_EQUAL_DIST','نصفا مسافة متساويان بسرعتين مختلفتين','medium',`قطعت سيارة نصف المسافة بسرعة ${s1} كم/ساعة، والنصف الآخر بسرعة ${s2} كم/ساعة. إذا استغرقت الرحلة كاملة ${formatNumber(total)} ساعات، فما المسافة الكلية؟`,correct,[((s1+s2)/2)*total,s1*total,s2*total,half,correct+60,Math.max(60,correct-60)],v=>`${formatNumber(v)} كم`,[
    `النصفان متساويان في المسافة، لذلك زمن كل نصف = المسافة ÷ السرعة.`,
    `النصف الواحد = ${half} كم يعطي زمنين ${formatNumber(t1)} و${formatNumber(t2)} ساعة، ومجموعهما ${formatNumber(total)}.`,
    `المسافة الكلية = ${half}+${half} = ${correct} كم.`
  ],'انتبه: النصفان متساويان في المسافة لا في الزمن.','عند تساوي المسافتين، الجزء الأبطأ يستغرق زمنًا أطول.','جرّب تقسيم الزمن بنسبة عكس السرعتين.',4);
}

function meetingDelayed(ctx){
  const {rng}=ctx; const total=rng.pick([300,360,420,480]); const sA=rng.pick([50,60,70,80]); const delay=rng.pick([1,1.5,2]); const sB=rng.pick([70,80,90,100]); const remaining=total-sA*delay; const t=remaining/(sA+sB); if(t<=0||!Number.isFinite(t)||Math.abs(t*2-Math.round(t*2))>1e-9) return meetingDelayed(ctx); const correct=t;
  return base(ctx,'SPD_H_MEET_DELAY','التقاء مركبتين مع انطلاق متأخر','hard',`مدينتان بينهما ${total} كم. انطلقت سيارة أ من الأولى بسرعة ${sA} كم/ساعة. بعد ${formatNumber(delay)} ساعة انطلقت سيارة ب من الثانية باتجاه أ بسرعة ${sB} كم/ساعة. بعد كم ساعة من انطلاق ب تلتقي السيارتان؟`,correct,[total/(sA+sB),remaining/sB,remaining/sA,correct+.5,Math.max(.5,correct-.5),delay+correct],v=>`${formatNumber(v)} ساعة`,[
    `خلال التأخير قطعت أ = ${sA} × ${formatNumber(delay)} = ${formatNumber(sA*delay)} كم.`,
    `المسافة المتبقية بينهما = ${total} - ${formatNumber(sA*delay)} = ${formatNumber(remaining)} كم.`,
    `سرعة الاقتراب = ${sA}+${sB} = ${sA+sB} كم/ساعة.`,
    `الزمن = ${formatNumber(remaining)} ÷ ${sA+sB} = ${formatNumber(correct)} ساعة.`
  ],'احسب أولًا ما قطعته السيارة التي بدأت مبكرًا.','في التقاء مركبتين متقابلتين بعد بدء الاثنتين، استخدم مجموع السرعتين.','المسافة المتبقية ÷ مجموع السرعتين.',5);
}

function catchupDelayed(ctx){
  const {rng}=ctx; const sA=rng.pick([50,60,72,80]); const sB=rng.pick([80,90,96,100,120]); if(sB<=sA) return catchupDelayed(ctx); const delay=rng.pick([1,1.5,2]); const lead=sA*delay; const t=lead/(sB-sA); if(Math.abs(t*2-Math.round(t*2))>1e-9) return catchupDelayed(ctx); const correct=t;
  return base(ctx,'SPD_H_CATCH','لحاق مع انطلاق متأخر','hard',`انطلقت سيارة أ بسرعة ${sA} كم/ساعة. بعد ${formatNumber(delay)} ساعة انطلقت سيارة ب من المكان نفسه وفي الاتجاه نفسه بسرعة ${sB} كم/ساعة. بعد كم ساعة من انطلاق ب تلحق بسيارة أ؟`,correct,[lead/sB,lead/sA,delay+correct,correct+.5,Math.max(.5,correct-.5),(sB-sA)/lead],v=>`${formatNumber(v)} ساعة`,[
    `تقدم أ أثناء التأخير = ${sA} × ${formatNumber(delay)} = ${formatNumber(lead)} كم.`,
    `فرق السرعة = ${sB}-${sA} = ${sB-sA} كم/ساعة.`,
    `زمن اللحاق = ${formatNumber(lead)} ÷ ${sB-sA} = ${formatNumber(correct)} ساعة.`
  ],'احسب مسافة التقدم ثم اقسمها على فرق السرعتين.','في اللحاق بالاتجاه نفسه نستخدم فرق السرعتين لا مجموعهما.','مسافة التقدم ÷ فرق السرعة.',4);
}

function sameDistanceTimeDifference(ctx){
  const {rng}=ctx; const s1=rng.pick([40,50,60]), s2=rng.pick([80,90,100]); const distance=rng.pick([120,180,240,300,360]); if(distance%s1||distance%s2) return sameDistanceTimeDifference(ctx); const diff=distance/s1-distance/s2; if(diff<=0) return sameDistanceTimeDifference(ctx); const correct=distance;
  return base(ctx,'SPD_H_TIME_DIFF','استنتاج المسافة من فرق الزمن','hard',`المسافة نفسها تُقطع بسرعة ${s1} كم/ساعة أو بسرعة ${s2} كم/ساعة. إذا كان الزمن عند السرعة ${s1} أطول بمقدار ${formatNumber(diff)} ساعة، فما المسافة؟`,correct,[s1*diff,s2*diff,(s1+s2)*diff,correct+60,Math.max(60,correct-60),correct/2],v=>`${formatNumber(v)} كم`,[
    `لنفرض المسافة = س. الزمن عند ${s1} = س/${s1}، وعند ${s2} = س/${s2}.`,
    `الفرق: س/${s1} - س/${s2} = ${formatNumber(diff)}.`,
    `بحل المعادلة نحصل على س = ${correct} كم.`
  ],'اكتب الزمنين بدلالة المسافة ثم استخدم فرق الزمن.','عند ثبات المسافة، السرعة الأعلى تعني زمنًا أقل.',`حل س×(1/${s1}−1/${s2}) = ${formatNumber(diff)}.`,5);
}

function base(ctx,template_id,subskill,difficulty,question,correct,distractors,format,steps,how,remember,fast,estimated_steps){
 return {id:makeId(template_id,ctx.seed),generator_id:template_id,template_id,seed:ctx.seed,family:ctx.family,family_ar:ctx.family_ar,category:ctx.category,subskill,difficulty,question,display_expression:null,correct,distractors:distractors.filter(v=>Number.isFinite(v)&&v>0).map(v=>({value:v,rationale:'خطأ شائع في اختيار العلاقة بين السرعة والمسافة والزمن أو في جمع/طرح السرعات.'})),format,explanation:{how_to_start:how,steps,answer:`الإجابة الصحيحة: ${format(correct)}.`,fast_method:fast,remember},estimated_steps,concept_tags:['speed','distance','time'],engine_version:ctx.engineVersion};
}
