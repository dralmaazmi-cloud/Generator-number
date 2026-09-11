import {lcm, makeId} from '../utils.js';

export function generateRatios({difficulty,rng,seed,engineVersion}) {
  const ctx={difficulty,rng,seed,engineVersion,family:'ratios',family_ar:'النسب وتقسيم الكميات',category:'النسب وتقسيم الكميات'};
  const list = difficulty==='easy' ? [splitTotal, scaleKnown]
    : difficulty==='medium' ? [commonTermSum, commonTermDifference, addToOneSide]
    : [transferBetweenSides, twoRatiosExternalSum];
  return rng.pick(list)(ctx);
}

function splitTotal(ctx){
  const {rng}=ctx; const a=rng.int(1,5), b=rng.int(a+1,8), k=rng.int(3,12); const total=(a+b)*k; const askA=rng.bool(); const correct=(askA?a:b)*k;
  const d=[a*k,b*k,total-correct,k,total/(a+b),correct+k,correct-k].filter(x=>x>0);
  return base(ctx,'RAT_E_SPLIT','تقسيم مجموع وفق نسبة','easy',`النسبة بين أ : ب = ${a} : ${b}. إذا كان مجموعهما ${total}، فما قيمة ${askA?'أ':'ب'}؟`,correct,d.map(v=>({value:v,rationale:'خطأ في حساب قيمة الجزء أو اختيار الطرف الآخر من النسبة.'})),[
    `مجموع الأجزاء = ${a}+${b} = ${a+b}.`,
    `قيمة الجزء الواحد = ${total} ÷ ${a+b} = ${k}.`,
    `${askA?'أ':'ب'} = ${askA?a:b} × ${k} = ${correct}.`
  ],'احسب مجموع أجزاء النسبة ثم قيمة الجزء الواحد.','في تقسيم المجموع، قيمة الجزء = المجموع ÷ مجموع أجزاء النسبة.','المجموع ÷ مجموع الأجزاء، ثم اضرب في أجزاء الطرف المطلوب.',3);
}

function scaleKnown(ctx){
  const {rng}=ctx; const a=rng.int(2,5), b=rng.int(a+1,9), k=rng.int(2,10); const aval=a*k, bval=b*k; const askB=rng.bool(.7); const given=askB?aval:bval; const correct=askB?bval:aval;
  const d=[given, k, (a+b)*k, correct+k, correct-k, askB?b*k+k:a*k+k, Math.abs(b-a)*k].filter(x=>x>0);
  return base(ctx,'RAT_E_KNOWN','استخدام قيمة طرف معلوم في نسبة','easy',`النسبة أ : ب = ${a} : ${b}. إذا كانت ${askB?'أ':'ب'} = ${given}، فما قيمة ${askB?'ب':'أ'}؟`,correct,d.map(v=>({value:v,rationale:'استخدام الجزء الواحد أو المجموع بدل قيمة الطرف المطلوب.'})),[
    `${askB?'أ':'ب'} تمثل ${askB?a:b} أجزاء وقيمتها ${given}.`,
    `إذن قيمة الجزء الواحد = ${given} ÷ ${askB?a:b} = ${k}.`,
    `${askB?'ب':'أ'} = ${askB?b:a} × ${k} = ${correct}.`
  ],'استخرج قيمة الجزء الواحد من الطرف المعلوم.','إذا عرفت قيمة أحد طرفي النسبة، قسمها على عدد أجزائه أولًا.','استخرج قيمة الجزء ثم اضرب في أجزاء الطرف المطلوب.',2);
}

function commonTermSum(ctx){
  const {rng}=ctx; const a=rng.int(1,4), b=rng.int(2,5), c=rng.int(2,6), d=rng.int(2,6);
  // ratios A:B = a:b and B:C = c:d; normalize B lcm
  const L=lcm(b,c); const A=a*(L/b), B=L, C=d*(L/c); const k=rng.int(1,5); const given=(A+C)*k; const correct=B*k;
  const distractors=[A*k,C*k,(A+B+C)*k,B, given, correct+k, Math.max(1,correct-k)];
  return base(ctx,'RAT_M_COMMON_SUM','نسبتان بحد مشترك مع مجموع الطرفين الخارجيين','medium',`النسبة أ : ب = ${a} : ${b}، والنسبة ب : ج = ${c} : ${d}. إذا كان أ + ج = ${given}، فما قيمة ب؟`,correct,distractors.map(v=>({value:v,rationale:'عدم توحيد الحد المشترك أو استخدام مجموع أجزاء غير المطلوب.'})),[
    `نوحّد ب عند ${L} أجزاء: أ : ب : ج = ${A} : ${B} : ${C}.`,
    `أ + ج = ${A+C} أجزاء وتساوي ${given}؛ إذن قيمة الجزء = ${given} ÷ ${A+C} = ${k}.`,
    `ب = ${B} × ${k} = ${correct}.`
  ],'وحّد قيمة الحد المشترك ب أولًا.','في نسبتين لهما حد مشترك، لا تجمعهما قبل توحيد الحد المشترك.','وحّد ب، ثم حوّل المجموع المعطى إلى قيمة جزء.',4);
}

function commonTermDifference(ctx){
  const {rng}=ctx; let a,b,c,d,A,B,C,diffParts;
  for(let t=0;t<50;t++){
    a=rng.int(1,4); b=rng.int(2,5); c=rng.int(2,6); d=rng.int(2,7);
    const L=lcm(b,c); A=a*(L/b); B=L; C=d*(L/c); diffParts=Math.abs(C-A);
    if(diffParts>=1 && diffParts<=10) break;
  }
  const k=rng.int(1,5), given=diffParts*k, correct=(A+B+C)*k;
  const ds=[B*k,(A+C)*k,(A+B)*k,(B+C)*k,correct-k,correct+k,correct+given];
  return base(ctx,'RAT_M_COMMON_DIFF','نسبتان بحد مشترك مع فرق الطرفين','medium',`النسبة أ : ب = ${a} : ${b}، والنسبة ب : ج = ${c} : ${d}. إذا كان الفرق بين أ وج يساوي ${given}، فما مجموع أ + ب + ج؟`,correct,ds.map(v=>({value:v,rationale:'استخدام الفرق أو مجموع طرفين بدل مجموع الأطراف الثلاثة بعد توحيد النسب.'})),[
    `بعد توحيد ب: أ : ب : ج = ${A} : ${B} : ${C}.`,
    `الفرق بين أ وج = ${diffParts} أجزاء ويقابله ${given}؛ قيمة الجزء = ${k}.`,
    `مجموع الأجزاء = ${A+B+C}، إذن المجموع = ${A+B+C} × ${k} = ${correct}.`
  ],'وحّد النسب ثم استخدم الفرق لمعرفة قيمة الجزء.','الفرق الحقيقي يساوي فرق الأجزاء × قيمة الجزء.','بعد التوحيد: قيمة الجزء = الفرق الحقيقي ÷ فرق الأجزاء.',4);
}

function addToOneSide(ctx){
  const {rng}=ctx;
  // initial ratio A:B p:q, add x to B to make p:r while A same. choose scale k and r so x integer small
  const p=rng.pick([2,3,4]), q=rng.pick([1,2,3]); const r=q+rng.pick([1,2,3]); const k=rng.int(2,5);
  const A=p*k, B=q*k, newB=r*k, add=newB-B, correct=A+B;
  const ds=[A,newB,A+newB,correct+add,correct-add,B,add].filter(x=>x>0);
  return base(ctx,'RAT_M_ADD_SIDE','تغير النسبة بعد إضافة كمية إلى أحد الطرفين','medium',`النسبة بين أ : ب = ${p} : ${q}. أضيفت ${add} وحدات إلى ب فأصبحت النسبة أ : ب = ${p} : ${r}. فما مجموع أ + ب قبل الإضافة؟`,correct,ds.map(v=>({value:v,rationale:'استخدام قيمة ب بعد الإضافة أو جمع القيم بعد التغيير بدل القيم الأصلية.'})),[
    `لأن أ لم تتغير وبقيت تمثل ${p} أجزاء، نختار قيمة الجزء ${k}.`,
    `قبل الإضافة: أ = ${A} وب = ${B}. وبعد إضافة ${add} تصبح ب = ${newB}، فتكون النسبة ${A}:${newB} = ${p}:${r}.`,
    `المجموع قبل الإضافة = ${A}+${B} = ${correct}.`
  ],'ثبت الطرف الذي لم يتغير، ثم قارن النسبة قبل وبعد الإضافة.','في تغير النسبة، ميّز بوضوح بين القيم الأصلية والقيم بعد التغيير.','أ لا تتغير؛ استخدمها كمرساة لمعرفة مقياس النسبة.',4);
}

function transferBetweenSides(ctx){
  const {rng}=ctx;
  // Construct original A:B=p:q scale k. transfer x from A to B, derive reduced ratio
  let p,q,k,x,A,B,newA,newB,g;
  for(let t=0;t<100;t++){
    p=rng.int(3,6); q=rng.int(1,p-1); k=rng.int(4,10); x=rng.int(1,Math.min(6,p*k-1)); A=p*k;B=q*k;newA=A-x;newB=B+x; g=gcdLocal(newA,newB);
    if(g>1 && newA/g<=9 && newB/g<=9) break;
  }
  const nrA=newA/g, nrB=newB/g; const askA=rng.bool(); const correct=askA?A:B;
  const ds=[askA?B:A,newA,newB,correct+x,correct-x,(A+B),k].filter(v=>v>0);
  return base(ctx,'RAT_H_TRANSFER','نقل كمية بين طرفين وتغير النسبة','hard',`النسبة بين أ : ب = ${p} : ${q}. نُقلت ${x} وحدات من أ إلى ب فأصبحت النسبة أ : ب = ${nrA} : ${nrB}. فما قيمة ${askA?'أ':'ب'} قبل النقل؟`,correct,ds.map(v=>({value:v,rationale:'استخدام القيمة بعد النقل أو نسيان أن الكمية نفسها تُطرح من أ وتُضاف إلى ب.'})),[
    `قبل النقل: أ = ${p}س وب = ${q}س.`,
    `بعد النقل: أ = ${p}س - ${x}، وب = ${q}س + ${x}.`,
    `النسبة الجديدة ${nrA}:${nrB}، وبحل العلاقة نحصل على س = ${k}.`,
    `${askA?'أ':'ب'} قبل النقل = ${askA?p:q} × ${k} = ${correct}.`
  ],'اكتب الطرفين على صورة أجزاء ثم طبّق النقل على الطرفين معًا.','في النقل، المجموع ثابت لكن كل طرف يتغير بعكس الآخر.','استخدم بقاء المجموع وثبات مقدار النقل لتحديد مقياس النسبة.',5);
}

function twoRatiosExternalSum(ctx){
  const {rng}=ctx; const a=rng.int(1,4), b=rng.int(2,5), c=rng.int(2,6), d=rng.int(1,5); const L=lcm(b,c); const A=a*(L/b), B=L, C=d*(L/c); const k=rng.int(2,6);
  const given=(A+B)*k; const correct=C*k;
  const ds=[A*k,B*k,(A+C)*k,(B+C)*k,(A+B+C)*k,correct+k,Math.max(1,correct-k)];
  return base(ctx,'RAT_H_TWO_COMB','توحيد نسبتين ثم استخدام مجموع مركب','hard',`النسبة أ : ب = ${a} : ${b}، والنسبة ب : ج = ${c} : ${d}. إذا كان أ + ب = ${given}، فما قيمة ج؟`,correct,ds.map(v=>({value:v,rationale:'استخدام مجموعة أجزاء خاطئة أو عدم توحيد الحد المشترك.'})),[
    `نوحّد ب: أ : ب : ج = ${A} : ${B} : ${C}.`,
    `أ + ب = ${A+B} أجزاء = ${given}، إذن قيمة الجزء = ${k}.`,
    `ج = ${C} × ${k} = ${correct}.`
  ],'وحّد الحد المشترك ثم اربط المعلومة المركبة بالأجزاء.','بعد التوحيد، كل معلومة عن مجموع أو فرق تصبح عددًا من الأجزاء.','حوّل أ+ب إلى أجزاء، استخرج قيمة الجزء، ثم احسب ج.',5);
}

function gcdLocal(a,b){while(b){[a,b]=[b,a%b]} return Math.abs(a)||1;}

function base(ctx,template_id,subskill,difficulty,question,correct,distractors,steps,how,remember,fast,estimated_steps){
 return {id:makeId(template_id,ctx.seed),generator_id:template_id,template_id,seed:ctx.seed,family:ctx.family,family_ar:ctx.family_ar,category:ctx.category,subskill,difficulty,question,display_expression:null,correct,distractors,format:v=>String(v),explanation:{how_to_start:how,steps,answer:`الإجابة الصحيحة: ${correct}.`,fast_method:fast,remember},estimated_steps,concept_tags:['ratio','proportion'],engine_version:ctx.engineVersion};
}
