import {makeId, formatNumber} from '../utils.js';

export function generateAverages({difficulty,rng,seed,engineVersion}){
  const ctx={difficulty,rng,seed,engineVersion,family:'averages',family_ar:'المتوسط الحسابي',category:'المتوسط الحسابي'};
  const list=difficulty==='easy'?[addOne,removeOne]
    :difficulty==='medium'?[replaceOne,combineGroups,addPairKnownAverage]
    :[combineThenAdd,missingValueForTarget];
  return rng.pick(list)(ctx);
}

function addOne(ctx){
  const {rng}=ctx; const n=rng.int(4,8), avg=rng.int(12,28), newVal=avg+rng.pick([-6,-4,-2,2,4,6,8]); const total=n*avg; const correct=(total+newVal)/(n+1);
  if(!Number.isInteger(correct)) return addOne(ctx);
  const d=[avg,newVal,(total+newVal)/n,correct+1,correct-1,Math.max(1,correct-2),correct+2];
  return base(ctx,'AVG_E_ADD','إضافة قيمة جديدة إلى مجموعة','easy',`متوسط ${n} قيم هو ${avg}. أضيفت قيمة جديدة مقدارها ${newVal}. فما متوسط القيم ${n+1}؟`,correct,d,[
    `المجموع الأصلي = ${n} × ${avg} = ${total}.`,
    `بعد إضافة ${newVal} يصبح المجموع = ${total+newVal}.`,
    `المتوسط الجديد = ${total+newVal} ÷ ${n+1} = ${correct}.`
  ],'حوّل المتوسط إلى مجموع أولًا.','متوسط × عدد القيم = المجموع.','احسب المجموع الجديد ثم اقسم على العدد الجديد.',3);
}

function removeOne(ctx){
  const {rng}=ctx; const n=rng.int(5,9), avg=rng.int(15,30); let removed=rng.int(8,35); const total=n*avg; const remain=total-removed; if(remain<=0 || remain%(n-1)!==0) return removeOne(ctx); const correct=remain/(n-1);
  const d=[avg,removed,total/(n-1),remain/n,correct+1,correct-1,correct+2];
  return base(ctx,'AVG_E_REMOVE','حذف قيمة من مجموعة','easy',`متوسط ${n} قيم هو ${avg}. حُذفت قيمة مقدارها ${removed}. فما متوسط القيم ${n-1} الباقية؟`,correct,d,[
    `المجموع الأصلي = ${n} × ${avg} = ${total}.`,
    `المجموع بعد الحذف = ${total} - ${removed} = ${remain}.`,
    `المتوسط الجديد = ${remain} ÷ ${n-1} = ${correct}.`
  ],'حوّل المتوسط القديم إلى مجموع ثم اطرح القيمة المحذوفة.','الحذف يغير المجموع وعدد القيم معًا.','مجموع قديم - القيمة المحذوفة، ثم اقسم على العدد الجديد.',3);
}

function replaceOne(ctx){
  const {rng}=ctx; const n=rng.int(5,10), avg=rng.int(15,30), oldVal=rng.int(8,25); const diff=rng.pick([6,8,10,12,14,16]); const newVal=oldVal+diff; const total=n*avg; const newTotal=total+diff; if(newTotal%n!==0) return replaceOne(ctx); const correct=newTotal/n;
  const d=[avg,avg+diff,avg+diff/n+1,correct+1,correct-1,newVal,oldVal];
  return base(ctx,'AVG_M_REPLACE','استبدال قيمة واحدة','medium',`متوسط ${n} قيم هو ${avg}. استُبدلت قيمة ${oldVal} بقيمة ${newVal}. فما المتوسط الجديد؟`,correct,d,[
    `المجموع القديم = ${n} × ${avg} = ${total}.`,
    `الاستبدال يزيد المجموع بمقدار ${newVal}-${oldVal} = ${diff}.`,
    `المجموع الجديد = ${newTotal}، والمتوسط = ${newTotal} ÷ ${n} = ${correct}.`
  ],'في الاستبدال، عدد القيم لا يتغير؛ عدّل المجموع فقط.','فرق القيمتين يكفي لتعديل المجموع مباشرة.','زد المتوسط بمقدار فرق القيمتين ÷ عدد القيم.',3);
}

function combineGroups(ctx){
  const {rng}=ctx; const n1=rng.pick([3,4,5,6]), n2=rng.pick([4,5,6,8]); const a1=rng.int(12,24), a2=a1+rng.pick([4,5,6,8]); const total=n1*a1+n2*a2; if(total%(n1+n2)!==0) return combineGroups(ctx); const correct=total/(n1+n2);
  const d=[(a1+a2)/2,a1,a2,correct+1,correct-1,(n1*a1+n2*a1)/(n1+n2), (n1*a2+n2*a2)/(n1+n2)];
  return base(ctx,'AVG_M_COMBINE','دمج مجموعتين بمتوسطين مختلفين','medium',`متوسط ${n1} قيم هو ${a1}، ومتوسط ${n2} قيم أخرى هو ${a2}. فما متوسط القيم ${n1+n2} مجتمعة؟`,correct,d,[
    `مجموع المجموعة الأولى = ${n1} × ${a1} = ${n1*a1}.`,
    `مجموع المجموعة الثانية = ${n2} × ${a2} = ${n2*a2}.`,
    `المجموع الكلي = ${total}، وعدد القيم = ${n1+n2}.`,
    `المتوسط = ${total} ÷ ${n1+n2} = ${correct}.`
  ],'لا تأخذ متوسط المتوسطين مباشرة إذا كان عدد القيم مختلفًا.','حوّل كل متوسط إلى مجموع ثم اجمع.','المتوسط المدمج = مجموع المجموعين ÷ مجموع الأعداد.',4);
}

function addPairKnownAverage(ctx){
  const {rng}=ctx; const n=rng.int(5,8), avg=rng.int(15,26), pairAvg=avg+rng.pick([3,6,9]); const total=n*avg+2*pairAvg; if(total%(n+2)!==0) return addPairKnownAverage(ctx); const correct=total/(n+2);
  const d=[avg,pairAvg,(avg+pairAvg)/2,correct+1,correct-1,total/n,total/2];
  return base(ctx,'AVG_M_ADD_PAIR','إضافة قيمتين بمتوسط معلوم','medium',`متوسط ${n} قيم هو ${avg}. أضيفت قيمتان متوسطهما ${pairAvg}. فما متوسط القيم ${n+2}؟`,correct,d,[
    `مجموع القيم الأصلية = ${n} × ${avg} = ${n*avg}.`,
    `مجموع القيمتين الجديدتين = 2 × ${pairAvg} = ${2*pairAvg}.`,
    `المجموع الجديد = ${total}.`,
    `المتوسط = ${total} ÷ ${n+2} = ${correct}.`
  ],'حوّل متوسط كل مجموعة إلى مجموع.','متوسط القيمتين لا يُضاف مباشرة إلى المتوسط القديم.','اجمع مجموع المجموعتين ثم اقسم على العدد الكلي.',4);
}

function combineThenAdd(ctx){
  const {rng}=ctx; const n1=rng.pick([3,4,5]), n2=rng.pick([4,5,6]); const a1=rng.int(12,20), a2=a1+rng.pick([4,5,6]); const extra=rng.pick([30,36,40,45,50]); const total=n1*a1+n2*a2+extra; const n=n1+n2+1; if(total%n!==0) return combineThenAdd(ctx); const correct=total/n;
  const d=[(a1+a2)/2,(n1*a1+n2*a2)/(n1+n2),extra/n,correct+1,correct-1,a2,a1];
  return base(ctx,'AVG_H_COMB_ADD','دمج مجموعتين ثم إضافة قيمة جديدة','hard',`متوسط ${n1} قيم هو ${a1}، ومتوسط ${n2} قيم أخرى هو ${a2}. أضيفت بعد ذلك قيمة جديدة مقدارها ${extra}. فما متوسط القيم ${n}؟`,correct,d,[
    `مجموع المجموعة الأولى = ${n1*a1}.`,
    `مجموع المجموعة الثانية = ${n2*a2}.`,
    `بعد إضافة ${extra} يصبح المجموع = ${total}.`,
    `عدد القيم = ${n}، إذن المتوسط = ${total} ÷ ${n} = ${correct}.`
  ],'حوّل كل جزء إلى مجموع قبل الدمج.','في المسائل المركبة، تابع المجموع وعدد القيم في كل مرحلة.','اجمع كل المجاميع أولًا ثم اقسم مرة واحدة في النهاية.',5);
}

function missingValueForTarget(ctx){
  const {rng}=ctx; const n=rng.int(5,8), oldAvg=rng.int(15,25), target=oldAvg+rng.pick([2,3,4,5]); const current=n*oldAvg; const correct=(n+1)*target-current;
  if(correct<=0) return missingValueForTarget(ctx);
  const d=[target,oldAvg,target-oldAvg,current/(n+1),correct+5,Math.max(1,correct-5),current];
  return base(ctx,'AVG_H_TARGET','إيجاد قيمة مطلوبة للوصول إلى متوسط مستهدف','hard',`متوسط ${n} قيم هو ${oldAvg}. ما القيمة التي يجب إضافتها ليصبح متوسط القيم ${n+1} هو ${target}؟`,correct,d,[
    `المجموع الحالي = ${n} × ${oldAvg} = ${current}.`,
    `المجموع المطلوب للمتوسط ${target} = ${n+1} × ${target} = ${(n+1)*target}.`,
    `القيمة الجديدة = ${(n+1)*target} - ${current} = ${correct}.`
  ],'احسب المجموع الحالي ثم المجموع المطلوب.','القيمة المضافة هي الفرق بين المجموع المستهدف والمجموع الحالي.','مجموع مستهدف - مجموع حالي.',4);
}

function base(ctx,template_id,subskill,difficulty,question,correct,distractors,steps,how,remember,fast,estimated_steps){
 return {id:makeId(template_id,ctx.seed),generator_id:template_id,template_id,seed:ctx.seed,family:ctx.family,family_ar:ctx.family_ar,category:ctx.category,subskill,difficulty,question,display_expression:null,correct,distractors:distractors.map(v=>({value:v,rationale:'خطأ في تحديث المجموع أو عدد القيم، أو استخدام متوسط المتوسطات بصورة مباشرة.'})),format:v=>formatNumber(v),explanation:{how_to_start:how,steps,answer:`الإجابة الصحيحة: ${formatNumber(correct)}.`,fast_method:fast,remember},estimated_steps,concept_tags:['average','sum'],engine_version:ctx.engineVersion};
}
