import {makeId} from '../utils.js';

const NAMES=['خالد','سالم','ماجد','راشد','ناصر','فهد','علي','بدر','حمد','سامي','نورة','سارة','هند','ريم','ليان','مريم'];

export function generateRelational({difficulty,rng,seed,engineVersion}){
  const ctx={difficulty,rng,seed,engineVersion,family:'relational',family_ar:'المقارنة والترتيب العلاقاتي',category:'المقارنة والترتيب العلاقاتي'};
  const list=difficulty==='easy'?[fullChainPosition,betweenRelation]
    :difficulty==='medium'?[twoBranchesUnresolved,countAbove,confirmedStatement]
    :[branchGuaranteed,partialOrderPosition];
  return rng.pick(list)(ctx);
}

function fullChainPosition(ctx){
  const {rng}=ctx; const names=rng.sample(NAMES,5); const targetPos=rng.pick([2,3,4]); const [a,b,c,d,e]=names; const correct=names[targetPos-1];
  const question=`${a} أسرع من ${b}. ${b} أسرع من ${c}. ${c} أسرع من ${d}. ${d} أسرع من ${e}. من صاحب المركز ${targetPos===2?'الثاني':targetPos===3?'الثالث':'الرابع'} من الأسرع إلى الأبطأ؟`;
  return stringBase(ctx,'REL_E_CHAIN','ترتيب كامل وتحديد مركز','easy',question,correct,[...names.filter(n=>n!==correct),'لا يمكن تحديده'],[
    `نربط العلاقات في سلسلة واحدة: ${names.join(' > ')}.`,
    `المركز المطلوب هو ${targetPos}، إذن الإجابة ${correct}.`
  ],'حوّل الجمل إلى سلسلة واحدة.','إذا كانت كل العلاقات قابلة للربط، اقرأ المركز المطلوب مباشرة.','اكتب الترتيب ثم عدّ المراكز.',2);
}

function betweenRelation(ctx){
  const {rng}=ctx; const [a,b,c,d]=rng.sample(NAMES,4); const correct=b;
  const question=`${a} أطول من ${b}. ${b} أطول من ${c}. ${d} أقصر من ${c}. من الثاني ترتيبًا من الأطول إلى الأقصر؟`;
  return stringBase(ctx,'REL_E_BETWEEN','تحديد شخص بين طرفين','easy',question,correct,[a,c,d,'لا يمكن تحديده','متساويان','لا أحد'],[
    `من الجمل نحصل على: ${a} > ${b} > ${c} > ${d}.`,
    `الثاني هو ${b}.`
  ],'ضع العلاقات في ترتيب واحد.','الجملة «أطول من» تحدد اتجاه السلسلة.','اربط العلاقات ثم اختر المركز الثاني.',2);
}

function twoBranchesUnresolved(ctx){
  const {rng}=ctx; const [top,a,b,c,d]=rng.sample(NAMES,5); const correct=`${a} و${b}`;
  const question=`${top} أسرع من ${a} ومن ${b}. ${a} أسرع من ${c}. ${b} أسرع من ${d}. ${c} أسرع من ${d}. أي مقارنة لا يمكن حسمها؟`;
  const pairs=[`${a} و${b}`,`${top} و${a}`,`${a} و${c}`,`${b} و${d}`,`${c} و${d}`,`${top} و${d}`];
  return stringBase(ctx,'REL_M_BRANCH_UNRES','فرعان وعلاقة غير محسومة','medium',question,correct,pairs.filter(x=>x!==correct),[
    `الفرع الأول: ${top} > ${a} > ${c} > ${d}.`,
    `الفرع الثاني: ${top} > ${b} > ${d}.`,
    `لا توجد معلومة تحدد هل ${a} أسرع من ${b} أم العكس.`
  ],'ارسم فرعين بدل محاولة ترتيب الجميع بالقوة.','العلاقة بين عنصرين في فرعين قد تبقى غير محسومة.','ابحث عن الزوج الوحيد بلا مسار مقارنة مؤكد.',3);
}

function countAbove(ctx){
  const {rng}=ctx; const [top,a,b,c,target]=rng.sample(NAMES,5); const correct='أربعة أشخاص';
  const question=`${top} أسرع من ${a} ومن ${b}. ${a} أسرع من ${c}. ${b} أسرع من ${target}. ${c} أسرع من ${target}. كم شخصًا نعرف يقينًا أنهم أسرع من ${target}؟`;
  return stringBase(ctx,'REL_M_COUNT','عدّ الأشخاص المؤكد تفوقهم على شخص محدد','medium',question,correct,['لا أحد','شخص واحد','شخصان','ثلاثة أشخاص','لا يمكن تحديده'],[
    `${b} و${c} أسرع من ${target} مباشرة أو بسلسلة.`,
    `${a} أسرع من ${c}، لذا ${a} أسرع من ${target}.`,
    `${top} أسرع من ${a} ومن ${b}، لذا هو أيضًا أسرع من ${target}.`,
    `المجموع = 4 أشخاص.`
  ],'ابنِ كل المسارات التي تنتهي بالشخص المطلوب ثم عدّ العناصر الأعلى منه.','استخدم الاستنتاج الانتقالي: إذا أ>ب وب>ج، فأ>ج.','عدّ كل من يمكن إثبات أنه أعلى من الهدف.',4);
}

function confirmedStatement(ctx){
  const {rng}=ctx; const [a,b,c,d]=rng.sample(NAMES,4); const correct=`${a} أسرع من ${c}`;
  const question=`${a} أسرع من ${b}. ${b} أسرع من ${c}. ${d} أبطأ من ${a} لكنه أسرع من ${c}. أي عبارة مؤكدة؟`;
  const opts=[correct,`${c} أسرع من ${a}`,`${b} أسرع من ${a}`,`${d} أسرع من ${a}`,`${c} أسرع من ${d}`,'لا يمكن معرفة أي علاقة'];
  return stringBase(ctx,'REL_M_CONFIRM','اختيار عبارة مؤكدة','medium',question,correct,opts.filter(x=>x!==correct),[
    `${a} أسرع من ${b}، و${b} أسرع من ${c}.`,
    `إذن يقينًا ${a} أسرع من ${c}.`,
    `بقية العبارات تخالف معلومة مباشرة أو تحتاج افتراضًا.`
  ],'ابحث عن عبارة يمكن إثباتها بسلسلة واضحة.','لا تفترض علاقة لم يثبتها النص.','استخدم السلسلة الأقصر التي تثبت العبارة.',3);
}

function branchGuaranteed(ctx){
  const {rng}=ctx; const [top,a,b,c,d]=rng.sample(NAMES,5); const correct=`${top} أسرع من ${d}`;
  const question=`${top} أسرع من ${a} ومن ${b}. ${a} أسرع من ${c}. ${b} أسرع من ${d}. ${c} أسرع من ${d}. أي عبارة يجب أن تكون صحيحة مهما كان ترتيب ${a} و${b}؟`;
  const opts=[correct,`${a} أسرع من ${b}`,`${b} أسرع من ${a}`,`${c} أسرع من ${b}`,`${d} أسرع من ${c}`,`${a} أبطأ من ${d}`];
  return stringBase(ctx,'REL_H_GUARANTEE','استنتاج مضمون رغم وجود فرعين','hard',question,correct,opts.filter(x=>x!==correct),[
    `${top} أعلى من الفرعين.`,
    `لدينا مسار ${top} > ${b} > ${d}، وكذلك مسار عبر ${a} و${c}.`,
    `إذن ${top} أسرع من ${d} حتمًا، بينما ترتيب ${a} و${b} نفسه غير محسوم.`
  ],'ميّز بين العلاقات المضمونة والعلاقات غير المحسومة داخل الفروع.','وجود فرعين لا يمنع وجود استنتاجات يقينية عبر القمة والقاع.','ابحث عن علاقة لها مسار مؤكد بغض النظر عن ترتيب الفرعين.',4);
}

function partialOrderPosition(ctx){
  const {rng}=ctx; const [top,a,b,c,last]=rng.sample(NAMES,5); const correct='لا يمكن تحديده';
  const question=`${top} أسرع من ${a} ومن ${b}. ${a} أسرع من ${c}. ${b} أسرع من ${c}. ${c} أسرع من ${last}. من صاحب المركز الثاني؟`;
  const opts=[a,b,c,top,last,correct];
  return stringBase(ctx,'REL_H_POSITION_UNCERTAIN','مركز غير محسوم في ترتيب جزئي','hard',question,correct,opts.filter(x=>x!==correct),[
    `${top} هو الأول، و${c} و${last} أسفل منه بوضوح.`,
    `لكن لا توجد معلومة تحسم ترتيب ${a} و${b}.`,
    `إذن المركز الثاني قد يكون ${a} أو ${b}، فلا يمكن تحديده.`
  ],'حدد ما هو ثابت أولًا، ثم انظر هل المركز المطلوب يقع بين عنصرين غير مرتبين.','في الترتيب الجزئي قد يكون بعض المراكز غير قابل للحسم رغم معرفة الأول والأخير.','إذا بقي مرشحان للمركز نفسه بلا علاقة بينهما فالإجابة غير محسومة.',4);
}

function stringBase(ctx,template_id,subskill,difficulty,question,correct,distractors,steps,how,remember,fast,estimated_steps){
 return {id:makeId(template_id,ctx.seed),generator_id:template_id,template_id,seed:ctx.seed,family:ctx.family,family_ar:ctx.family_ar,category:ctx.category,subskill,difficulty,question,display_expression:null,correct,distractors:distractors.map(v=>({value:v,rationale:'هذا الخيار يتطلب افتراضًا غير موجود أو يخالف علاقة مؤكدة في النص.'})),format:v=>String(v),explanation:{how_to_start:how,steps,answer:`الإجابة الصحيحة: ${correct}.`,fast_method:fast,remember},estimated_steps,concept_tags:['ordering','relational-reasoning'],engine_version:ctx.engineVersion};
}
