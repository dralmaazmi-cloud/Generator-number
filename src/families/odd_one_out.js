import {makeId} from '../utils.js';

const PRIMES=[2,3,5,7,11,13,17,19,23,29];

export function generateOddOneOut({difficulty,rng,seed,engineVersion}){
  const ctx={difficulty,rng,seed,engineVersion,family:'odd_one_out',family_ar:'العدد الذي لا ينتمي',category:'العدد الذي لا ينتمي إلى المجموعة'};
  const list=difficulty==='easy'?[multiples,squares]
    :difficulty==='medium'?[cubes,pronic,primeDoubles]
    :[squareMinusOne,primePlusPattern];
  return rng.pick(list)(ctx);
}

function build(ctx,template_id,subskill,valid,outlier,propertyText,proofs,remember){
  const {rng}=ctx; const group=rng.shuffle([...valid,outlier]); const outlierPos=group.indexOf(outlier)+1;
  const distractors=valid.map(v=>({value:v,rationale:`هذا العدد يحقق الخاصية المشتركة: ${propertyText}.`}));
  return {
    id:makeId(template_id,ctx.seed),generator_id:template_id,template_id,seed:ctx.seed,family:ctx.family,family_ar:ctx.family_ar,category:ctx.category,subskill,difficulty:ctx.difficulty,
    question:'أي عدد لا ينتمي إلى المجموعة الآتية؟',display_expression:group.join('، '),correct:outlier,distractors,format:v=>String(v),
    explanation:{how_to_start:'ابحث عن خاصية واحدة تجمع خمسة أعداد وتترك عددًا واحدًا خارجها.',steps:[...proofs,`${outlier} لا يحقق الخاصية؛ لذلك هو العدد المختلف.`],answer:`الإجابة الصحيحة: ${outlier}.`,fast_method:`اختبر الخاصية «${propertyText}» على الأعداد حتى تجد الوحيد الذي يفشل.`,remember},
    estimated_steps:ctx.difficulty==='easy'?2:ctx.difficulty==='medium'?3:4,concept_tags:['odd-one-out','number-properties'],engine_version:ctx.engineVersion,
    metadata:{outlier_display_position:outlierPos,property:propertyText}
  };
}

function multiples(ctx){
  const {rng}=ctx; const m=rng.pick([4,5,6,7,8,9]); const start=rng.int(2,5); const valid=Array.from({length:5},(_,i)=>m*(start+i)); let outlier=valid.at(-1)+rng.pick([1,2,3]); while(outlier%m===0||valid.includes(outlier)) outlier++;
  return build(ctx,'ODD_E_MULT',`مضاعفات العدد ${m}`,valid,outlier,`مضاعف للعدد ${m}`,valid.map(v=>`${v} = ${m} × ${v/m}.`),`في سؤال المختلف، جرّب المضاعفات البسيطة قبل البحث عن قاعدة أعقد.`);
}

function squares(ctx){
  const {rng}=ctx; const start=rng.int(2,6); const valid=Array.from({length:5},(_,i)=>(start+i)**2); let outlier=valid.at(-1)+rng.pick([3,5,7,10]); while(Number.isInteger(Math.sqrt(outlier))||valid.includes(outlier)) outlier++;
  return build(ctx,'ODD_E_SQUARES','مربعات كاملة',valid,outlier,'مربع كامل',valid.map((v,i)=>`${v} = ${(start+i)}².`),'إذا رأيت سلسلة مربعات متتابعة فابحث عن العدد الوحيد غير المربع.');
}

function cubes(ctx){
  const {rng}=ctx; const start=rng.int(2,4); const valid=Array.from({length:5},(_,i)=>(start+i)**3); let outlier=valid.at(-1)-rng.pick([8,12,16,20]); while(isCube(outlier)||outlier<=0||valid.includes(outlier)) outlier++;
  return build(ctx,'ODD_M_CUBES','مكعبات كاملة',valid,outlier,'مكعب كامل',valid.map((v,i)=>`${v} = ${(start+i)}³.`),'الأعداد 8،27،64،125... إشارة قوية إلى المكعبات.');
}

function pronic(ctx){
  const {rng}=ctx; const start=rng.int(2,5); const valid=Array.from({length:5},(_,i)=>{const n=start+i;return n*(n+1)}); let outlier=valid.at(-1)-rng.pick([2,4,6,8]); while(valid.includes(outlier)||isPronic(outlier)||outlier<=0) outlier++;
  return build(ctx,'ODD_M_PRONIC','حاصل ضرب عددين صحيحين متتاليين',valid,outlier,'حاصل ضرب عددين صحيحين متتاليين n(n+1)',valid.map((v,i)=>`${v} = ${start+i} × ${start+i+1}.`),'ابحث عن بنية واحدة واضحة تجمع خمسة أعداد، مثل n(n+1).');
}

function primeDoubles(ctx){
  const {rng}=ctx; const start=rng.int(1,3); const primes=PRIMES.slice(start,start+5); const valid=primes.map(p=>2*p); let outlier=2*(primes[2]+2); while(PRIMES.includes(outlier/2)||valid.includes(outlier)) outlier+=2;
  return build(ctx,'ODD_M_PRIME2','ضعف أعداد أولية متتالية',valid,outlier,'ضعف عدد أولي ضمن سلسلة أوليات متتالية',valid.map(v=>`${v} ÷ 2 = ${v/2} وهو عدد أولي.`),'إذا كانت كل الأعداد زوجية، اقسمها على 2 وابحث عن خاصية في النواتج.');
}

function squareMinusOne(ctx){
  const {rng}=ctx; const start=rng.int(3,6); const valid=Array.from({length:5},(_,i)=>(start+i)**2-1); let outlier=valid.at(-1)+rng.pick([2,4,6]); while(valid.includes(outlier)||isSquare(outlier+1)) outlier++;
  return build(ctx,'ODD_H_SQ_MINUS','أعداد أقل بواحد من مربع كامل',valid,outlier,'مربع كامل ناقص 1',valid.map((v,i)=>`${v} = ${(start+i)}² - 1.`),'قد تكون الخاصية «قريبًا من مربع» وليس مربعًا كاملًا نفسه.');
}

function primePlusPattern(ctx){
  const {rng}=ctx; const primes=PRIMES.slice(1,6); const offset=rng.pick([4,6,10]); const valid=primes.map(p=>p+offset); let outlier=valid[2]+2; while(PRIMES.includes(outlier-offset)||valid.includes(outlier)) outlier++;
  return build(ctx,'ODD_H_PRIME_OFFSET','عدد أولي مع إزاحة ثابتة',valid,outlier,`عدد أولي + ${offset}`,valid.map(v=>`${v} - ${offset} = ${v-offset} وهو أولي.`),`إذا لم تظهر خاصية مباشرة، جرّب إزالة إزاحة ثابتة من الأعداد.`);
}

function isSquare(n){return n>=0&&Number.isInteger(Math.sqrt(n));}
function isCube(n){if(n<0)return false; const r=Math.round(Math.cbrt(n)); return r**3===n;}
function isPronic(n){for(let k=1;k*k<=n;k++) if(k*(k+1)===n)return true; return false;}
