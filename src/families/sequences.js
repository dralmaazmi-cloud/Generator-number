import {makeId, formatNumber} from '../utils.js';

export function generateSequences({difficulty, rng, seed, engineVersion}) {
  const family = 'sequences', family_ar = 'المتتاليات العددية', category = family_ar;
  const templates = difficulty === 'easy'
    ? [arithmetic, geometric]
    : difficulty === 'medium'
      ? [increasingDifferences, alternatingOps, interleaved, doublingDifferences]
      : [alternateDivide, recurrence, powersPlusIndex];
  const fn = rng.pick(templates);
  return fn({difficulty,rng,seed,engineVersion,family,family_ar,category});
}

function arithmetic(ctx) {
  const {rng,seed,family,family_ar,category,difficulty,engineVersion}=ctx;
  const start=rng.int(8,45), step=rng.pick([3,4,5,6,7,8,9])*(rng.bool(.25)?-1:1);
  const seq=[start]; for(let i=1;i<5;i++) seq.push(seq.at(-1)+step);
  const correct=seq.at(-1)+step;
  const distractors=[correct+step,correct-step,correct+1,correct-1,correct+2* Math.sign(step),correct-2*Math.sign(step)];
  return base(ctx,'SEQ_E_ARITH','فرق ثابت','easy',`ما العدد التالي في المتتالية؟`,`${seq.join('، ')}، ؟`,correct,distractors.map((v,i)=>({value:v,rationale:i<2?'تطبيق عدد غير صحيح من الخطوات في الفرق الثابت.':'خطأ قريب من الناتج الصحيح.'})),[
    `احسب الفرق بين كل حد والذي يليه؛ ستجد أن الفرق ثابت ويساوي ${step}.`,
    `إذن نطبق الفرق نفسه مرة أخرى: ${seq.at(-1)} ${step>=0?'+':'-'} ${Math.abs(step)} = ${correct}.`
  ],'ابدأ بالفروق بين الحدود.','إذا كان الفرق ثابتًا، لا تبحث عن قاعدة أعقد.',`لاحظ الفرق الثابت ${step} ثم طبقه مرة واحدة.` ,2);
}

function geometric(ctx) {
  const {rng}=ctx; const factor=rng.pick([2,2,3]); const start=factor===3?rng.pick([2,3,4]):rng.pick([2,3,4,5,6]); const divide=rng.bool(.4);
  const shownTerms = factor===3 ? 4 : 5;
  let seq=[]; let correct;
  if(!divide){ seq=[start]; for(let i=1;i<shownTerms;i++) seq.push(seq.at(-1)*factor); correct=seq.at(-1)*factor; }
  else { const top=start*(factor**shownTerms); seq=[top]; for(let i=1;i<shownTerms;i++) seq.push(seq.at(-1)/factor); correct=seq.at(-1)/factor; }
  const d=[correct*factor, correct/factor, correct+factor, correct-factor, correct+1, correct*2];
  return base(ctx,'SEQ_E_GEO',divide?'قسمة ثابتة':'ضرب ثابت','easy','ما العدد التالي في المتتالية؟',`${seq.join('، ')}، ؟`,correct,d.map(v=>({value:v,rationale:'خلط بين العامل الثابت وبين الجمع/الطرح أو تطبيق العملية في الاتجاه الخاطئ.'})),[
    `كل حد ${divide?`يساوي الحد السابق ÷ ${factor}`:`يساوي الحد السابق × ${factor}`}.`,
    `${seq.at(-1)} ${divide?'÷':'×'} ${factor} = ${correct}.`
  ],'افحص الضرب أو القسمة إذا لم يكن الفرق ثابتًا.','في المتتاليات الهندسية، العملية نفسها تتكرر بين كل حدين.',`${divide?'اقسم':'اضرب'} في ${factor} مرة واحدة.`,2);
}

function increasingDifferences(ctx) {
  const {rng}=ctx; const start=rng.int(3,15); const diffStart=rng.pick([2,3,4]); const diffStep=rng.pick([2,3]);
  const seq=[start]; const diffs=[]; let d=diffStart;
  for(let i=0;i<4;i++){ diffs.push(d); seq.push(seq.at(-1)+d); d+=diffStep; }
  const correct=seq.at(-1)+d;
  const distractors=[seq.at(-1)+d-diffStep,seq.at(-1)+d+diffStep,correct+diffStep,correct-diffStep,correct+1,correct+2];
  return base(ctx,'SEQ_M_INC_DIFF','فروق تتزايد بنمط ثابت','medium','ما العدد التالي في المتتالية؟',`${seq.join('، ')}، ؟`,correct,distractors.map(v=>({value:v,rationale:'عدم متابعة نمط الفروق أو استخدام الفرق السابق بدل الفرق التالي.'})),[
    `الفروق هي: ${diffs.join('، ')}؛ وكل فرق يزيد بمقدار ${diffStep}.`,
    `الفرق التالي = ${d}.`,
    `${seq.at(-1)} + ${d} = ${correct}.`
  ],'احسب الفروق أولًا، ثم ابحث عن نمط داخل الفروق نفسها.','قد يكون النمط في الفروق وليس في الحدود مباشرة.',`الفروق تزيد ${diffStep} كل مرة؛ خذ الفرق التالي فقط.`,3);
}

function alternatingOps(ctx) {
  const {rng}=ctx; const start=rng.int(3,8); const addStart=rng.pick([2,3,4]); const multStart=rng.pick([2,3]);
  let current=start; const seq=[current]; const ops=[];
  for(let k=0;k<3;k++){
    const add=addStart+k; current+=add; seq.push(current); ops.push(`+${add}`);
    const mult=multStart+k; current*=mult; seq.push(current); ops.push(`×${mult}`);
  }
  // seq has 7; ask next after last multiplication -> next add
  const nextAdd=addStart+3; const correct=current+nextAdd;
  const distractors=[current*(multStart+3),current+nextAdd-1,current+nextAdd+1,current+(addStart+2),current*2,correct+nextAdd];
  return base(ctx,'SEQ_M_ALT_OPS','تناوب جمع وضرب بأعداد متدرجة','medium','ما العدد التالي في المتتالية؟',`${seq.join('، ')}، ؟`,correct,distractors.map(v=>({value:v,rationale:'استخدام العملية المتناوبة الخاطئة أو عدم زيادة رقم العملية بالنسق نفسه.'})),[
    `العمليات تتناوب: ${ops.join('، ')}.`,
    `بعد آخر عملية ضرب، نعود إلى الجمع، ورقم الجمع التالي = ${nextAdd}.`,
    `${current} + ${nextAdd} = ${correct}.`
  ],'إذا لم تجد فرقًا ثابتًا، افحص هل عمليتان تتناوبان.','التناوب قد يكون مع أرقام تزداد تدريجيًا في كل مرة.','حدد هل الدور التالي جمع أم ضرب، ثم استخدم الرقم التالي في السلسلة.',4);
}

function interleaved(ctx) {
  const {rng}=ctx; const a0=rng.int(2,9), da=rng.pick([2,3,4,5]); const b0=rng.int(24,50), db=-rng.pick([3,4,5,6]);
  const seq=[]; for(let i=0;i<4;i++){seq.push(a0+i*da); seq.push(b0+i*db);} // 8 terms, ask 9th would a stream
  seq.pop(); // 7 terms -> next is b stream? Let's recalc positions: [a0,b0,a1,b1,a2,b2,a3], next b3.
  const correct=b0+3*db;
  const distractors=[a0+4*da,b0+2*db,b0+4*db,correct+1,correct-1,correct+Math.abs(db)];
  return base(ctx,'SEQ_M_INTERLEAVED','سلسلتان متداخلتان','medium','ما العدد التالي في المتتالية؟',`${seq.join('، ')}، ؟`,correct,distractors.map(v=>({value:v,rationale:'عدم فصل الحدود الفردية والزوجية أو متابعة السلسلة الخطأ.'})),[
    `افصل الحدود الفردية: ${[0,2,4,6].map(i=>seq[i]).join('، ')}؛ وهي تزيد ${da}.`,
    `والحدود الزوجية: ${[1,3,5].map(i=>seq[i]).join('، ')}؛ وهي ${db<0?'تنقص':'تزيد'} ${Math.abs(db)}.`,
    `الحد التالي من السلسلة الزوجية = ${seq[5]} ${db<0?'-':'+'} ${Math.abs(db)} = ${correct}.`
  ],'افصل 1،3،5... عن 2،4،6... إذا بدت المتتالية ملخبطة.','قد تتداخل سلسلتان بسيطتان داخل متتالية واحدة.','اقرأ الحدود الزوجية وحدها؛ ستظهر القاعدة فورًا.',3);
}

function doublingDifferences(ctx) {
  const {rng}=ctx; const start=rng.int(2,10), d0=rng.pick([1,2,3]); const seq=[start]; let d=d0; const diffs=[];
  for(let i=0;i<4;i++){diffs.push(d); seq.push(seq.at(-1)+d); d*=2;}
  const correct=seq.at(-1)+d;
  const distractors=[seq.at(-1)+d/2,correct+d/2,correct-d/2,seq.at(-1)*2,correct+2,correct-2];
  return base(ctx,'SEQ_M_DOUBLE_DIFF','فروق تتضاعف','medium','ما العدد التالي في المتتالية؟',`${seq.join('، ')}، ؟`,correct,distractors.map(v=>({value:v,rationale:'استخدام الفرق السابق أو مضاعفة الحد بدل مضاعفة الفرق.'})),[
    `الفروق: ${diffs.join('، ')}، وكل فرق يساوي ضعف السابق.`,
    `الفرق التالي = ${d}.`,
    `${seq.at(-1)} + ${d} = ${correct}.`
  ],'احسب الفروق ولاحظ هل تتضاعف.','عندما تتضاعف الفروق، أضف الفرق المضاعف للحد الأخير.','ضاعف آخر فرق فقط، لا الحد الأخير.',3);
}

function alternateDivide(ctx) {
  const {rng}=ctx; const subtract=rng.pick([3,4,5]); const divs=[2,3,4]; const finalBase=rng.pick([4,5,6,7]);
  // Build backwards from after /4? Sequence: x, x-s, /2, -s, /3, -s, /4 answer. Construct a value y before /4 divisible by4.
  // choose after div3 z such that z-subtract divisible by4 and prior reconstruct clean.
  let seq,correct;
  for(let tries=0;tries<100;tries++){
    const x=rng.int(120,500);
    let a=x-subtract; if(a%2) continue;
    let b=a/2; let c=b-subtract; if(c%3) continue;
    let d=c/3; let e=d-subtract; if(e%4) continue;
    correct=e/4; if(correct>1){seq=[x,a,b,c,d,e]; break;}
  }
  if(!seq){seq=[228,224,112,108,36,32]; correct=8;}
  const distractors=[seq.at(-1)-subtract,seq.at(-1)/3,seq.at(-1)/2,correct+subtract,correct*2,correct+1];
  return base(ctx,'SEQ_H_ALT_DIV','تناوب طرح ثابت مع قسمة متدرجة','hard','ما العدد التالي في المتتالية؟',`${seq.join('، ')}، ؟`,correct,distractors.map(v=>({value:v,rationale:'اختيار العملية الخاطئة في التناوب أو استخدام قاسم غير القاسم التالي.'})),[
    `النمط يتناوب بين طرح ${subtract} ثم القسمة على 2، ثم طرح ${subtract} ثم القسمة على 3.`,
    `بعد ${seq.at(-2)} → ${seq.at(-1)} بالطرح، العملية التالية هي القسمة على 4.`,
    `${seq.at(-1)} ÷ 4 = ${correct}.`
  ],'افحص العمليات بالتناوب، ثم راقب هل رقم القسمة يتدرج.','قد تتناوب عملية ثابتة مع عملية رقمها يتغير تدريجيًا.','الدور التالي قسمة، والقاسم التالي 4.',5);
}

function recurrence(ctx) {
  const {rng}=ctx; const a=rng.int(1,4), b=rng.int(2,5); const seq=[a,b];
  while(seq.length<5) seq.push(2*seq.at(-1)+seq.at(-2));
  const correct=2*seq.at(-1)+seq.at(-2);
  const distractors=[seq.at(-1)+seq.at(-2),2*seq.at(-1),2*seq.at(-2)+seq.at(-1),correct- seq.at(-2),correct+seq.at(-2),correct+2];
  return base(ctx,'SEQ_H_RECURRENCE','اعتماد كل حد على الحدين السابقين','hard','ما العدد التالي في المتتالية؟',`${seq.join('، ')}، ؟`,correct,distractors.map(v=>({value:v,rationale:'استخدام حد واحد فقط أو تطبيق معامل 2 على الحد الخطأ.'})),[
    `ابتداءً من الحد الثالث: كل حد = ضعف الحد السابق + الحد الذي قبله.`,
    `${seq[2]} = 2×${seq[1]} + ${seq[0]}، و${seq[3]} = 2×${seq[2]} + ${seq[1]}.`,
    `إذن التالي = 2×${seq.at(-1)} + ${seq.at(-2)} = ${correct}.`
  ],'إذا فشلت الفروق والتناوب، افحص علاقة الحد بآخر حدين قبله.','بعض المتتاليات تعتمد على حدين لا على حد واحد.','ضاعف الحد الأخير ثم أضف الذي قبله.',5);
}

function powersPlusIndex(ctx) {
  const {rng}=ctx; const basePow=rng.pick([2,3]); const n=5; const seq=[];
  for(let i=1;i<=n;i++) seq.push(basePow**i+i);
  const correct=basePow**(n+1)+(n+1);
  const p=basePow**(n+1);
  const distractors=[p,p+n,p+n+2,(basePow**n)+(n+1),correct-basePow,correct+basePow];
  return base(ctx,'SEQ_H_POW_INDEX','قوة عدد مع رقم ترتيب الحد','hard','ما العدد التالي في المتتالية؟',`${seq.join('، ')}، ؟`,correct,distractors.map(v=>({value:v,rationale:'نسيان إضافة رقم ترتيب الحد أو استخدام قوة/ترتيب غير صحيح.'})),[
    `الحد رقم 1 = ${basePow}¹ + 1، والحد رقم 2 = ${basePow}² + 2، وهكذا.`,
    `الحد السادس = ${basePow}⁶ + 6 = ${p} + 6 = ${correct}.`
  ],'افحص هل كل حد يجمع بين قوة معروفة ورقم موضعه.','قد يكون رقم ترتيب الحد جزءًا من القاعدة.','احسب القوة السادسة ثم أضف 6.',4);
}

function base(ctx,template_id,subskill,difficulty,question,display_expression,correct,distractors,steps,how,remember,fast,estimated_steps){
  return {
    id: makeId(template_id,ctx.seed), generator_id:template_id, template_id, seed:ctx.seed,
    family:ctx.family, family_ar:ctx.family_ar, category:ctx.category, subskill, difficulty,
    question, display_expression, correct, distractors, format:v=>formatNumber(v),
    explanation:{how_to_start:how,steps,answer:`الإجابة الصحيحة: ${correct}.`,fast_method:fast,remember},
    estimated_steps, concept_tags:['sequence','pattern'], engine_version:ctx.engineVersion
  };
}
