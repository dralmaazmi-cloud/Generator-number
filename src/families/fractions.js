import {makeId} from '../utils.js';

const FRACS=[
  {d:2,n:'نصف'}, {d:3,n:'ثلث'}, {d:4,n:'ربع'}, {d:5,n:'خُمس'}, {d:6,n:'سُدس'}, {d:8,n:'ثُمن'}
];

export function generateFractions({difficulty,rng,seed,engineVersion}){
  const ctx={difficulty,rng,seed,engineVersion,family:'fractions',family_ar:'الكسور المتتابعة',category:'الكسور المتتابعة المباشرة'};
  return difficulty==='easy'?twoFractions(ctx):difficulty==='medium'?threeFractions(ctx):fourFractions(ctx);
}

function build(ctx,count,contextual){
  const {rng}=ctx; const fracs=rng.sample(FRACS,count); const denomProduct=fracs.reduce((p,f)=>p*f.d,1); const multiplier=count===2?rng.pick([12,15,18,20,24]):count===3?rng.pick([6,8,10,12,15]):rng.pick([2,3,4,5,6]); const total=denomProduct*multiplier; let current=total; const stepVals=[];
  const applyOrder = contextual ? fracs : [...fracs].reverse();
  for(const f of applyOrder){ current/=f.d; stepVals.push({f,val:current}); }
  const correct=current;
  const names=fracs.map(f=>f.n).join(' ');
  const question=contextual
    ? `في مخزن ${total} وحدة. خُصص ${fracs[0].n}ها لمرحلة أولى، ثم أُخذ ${fracs[1].n} الناتج${count>2?`، ثم ${fracs[2].n} الناتج`:''}${count>3?`، ثم ${fracs[3].n} الناتج`:''}. كم وحدة وصلت إلى المرحلة الأخيرة؟`
    : `ما قيمة ${names} العدد ${total}؟`;
  const distractors=[];
  // omit one fraction at a time
  for(let i=0;i<fracs.length;i++){
    const prod=fracs.reduce((p,f,j)=>p*(j===i?1:f.d),1); distractors.push(total/prod);
  }
  distractors.push(total/fracs[0].d, total/fracs.at(-1).d, correct*2, correct+multiplier, Math.max(1,correct-multiplier));
  const steps=[]; let val=total;
  for(const f of applyOrder){ const next=val/f.d; steps.push(`${f.n} ${val} = ${next}.`); val=next; }
  const tid=count===2?'FRAC_E_2':count===3?'FRAC_M_3':'FRAC_H_4';
  return {
    id:makeId(tid,ctx.seed),generator_id:tid,template_id:tid,seed:ctx.seed,family:ctx.family,family_ar:ctx.family_ar,category:ctx.category,
    subskill:`${count} كسور مباشرة متتابعة من عدد معلوم`,difficulty:ctx.difficulty,question,display_expression:null,correct,
    distractors:distractors.filter(v=>Number.isFinite(v)&&v>0).map(v=>({value:v,rationale:'نسيان تطبيق أحد الكسور أو تطبيق كسر على العدد الأصلي بدل الناتج السابق.'})),format:v=>String(v),
    explanation:{how_to_start:'طبّق الكسور واحدًا بعد الآخر على الناتج السابق، ولا تستخدم مفهوم «الباقي».',steps,answer:`الإجابة الصحيحة: ${correct}.`,fast_method:`يمكن ضرب المقامات معًا: ${fracs.map(f=>f.d).join(' × ')} = ${denomProduct}، ثم ${total} ÷ ${denomProduct} = ${correct}.`,remember:'في الكسور المباشرة المتتابعة، كل كسر يؤخذ من الناتج الذي قبله.'},
    estimated_steps:count,concept_tags:['fractions','sequential-operations'],engine_version:ctx.engineVersion
  };
}
function twoFractions(ctx){return build(ctx,2,false)}
function threeFractions(ctx){return build(ctx,3,ctx.rng.bool(.5))}
function fourFractions(ctx){return build(ctx,4,true)}
