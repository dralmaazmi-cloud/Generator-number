import {makeId, formatNumber} from '../utils.js';

export function generateProfitLoss({difficulty,rng,seed,engineVersion}){
  const ctx={difficulty,rng,seed,engineVersion,family:'profit_loss',family_ar:'الربح والخسارة والأسعار',category:'الربح والخسارة والأسعار'};
  const list=difficulty==='easy'?[simpleProfit,simpleLoss]
    :difficulty==='medium'?[totalCostProfit,discountThenSale]
    :[reverseSellingPrice,discountMarkupChain];
  return rng.pick(list)(ctx);
}

function simpleProfit(ctx){
  const {rng}=ctx; const buy=rng.pick([100,120,160,200,240,300,400]); const pct=rng.pick([10,15,20,25,30]); const profit=buy*pct/100; if(!Number.isInteger(profit)) return simpleProfit(ctx); const sell=buy+profit; const correct=pct;
  return basePct(ctx,'PL_E_PROFIT','نسبة ربح من سعر الشراء','easy',`اشترى متجر سلعة بـ${buy} درهمًا وباعها بـ${sell} درهمًا. ما نسبة الربح من سعر الشراء؟`,correct,[profit,sell/buy*100,profit/sell*100,pct+5,Math.max(1,pct-5),sell-buy],[
    `الربح = ${sell}-${buy} = ${profit} درهمًا.`,
    `نسبة الربح = ${profit} ÷ ${buy} × 100 = ${pct}%.`
  ],'احسب الربح بالدرهم أولًا ثم قارنه بسعر الشراء.','في نسبة الربح، المقام عادةً سعر الشراء إذا نص السؤال على ذلك.','الربح ÷ الشراء ×100.',2);
}

function simpleLoss(ctx){
  const {rng}=ctx; const buy=rng.pick([100,120,160,200,240,300,400]); const pct=rng.pick([10,20,25]); const loss=buy*pct/100; const sell=buy-loss; const correct=pct;
  return basePct(ctx,'PL_E_LOSS','نسبة خسارة من سعر الشراء','easy',`اشترى متجر سلعة بـ${buy} درهمًا وباعها بـ${sell} درهمًا. ما نسبة الخسارة من سعر الشراء؟`,correct,[loss,loss/sell*100,pct+5,Math.max(1,pct-5),sell/buy*100,100-pct],[
    `الخسارة = ${buy}-${sell} = ${loss} درهمًا.`,
    `نسبة الخسارة = ${loss} ÷ ${buy} ×100 = ${pct}%.`
  ],'احسب مقدار الخسارة أولًا.','استخدم سعر الشراء كأساس للنسبة عندما يطلب السؤال ذلك.','الخسارة ÷ الشراء ×100.',2);
}

function totalCostProfit(ctx){
  const {rng}=ctx; const buy=rng.pick([160,180,200,240,300]); const shipping=rng.pick([10,20,30,40]); const total=buy+shipping; const pct=rng.pick([10,20,25]); const profit=total*pct/100; if(!Number.isInteger(profit)) return totalCostProfit(ctx); const sell=total+profit; const correct=pct;
  return basePct(ctx,'PL_M_TOTAL_COST','ربح كنسبة من التكلفة الكلية','medium',`اشترى متجر سلعة بـ${buy} درهمًا ودفع ${shipping} درهمًا شحنًا وتجهيزًا، ثم باعها بـ${sell} درهمًا. ما نسبة الربح من إجمالي التكلفة؟`,correct,[(sell-buy)/buy*100,profit/buy*100,profit/sell*100,pct+5,Math.max(1,pct-5),shipping/total*100],[
    `إجمالي التكلفة = ${buy}+${shipping} = ${total}.`,
    `الربح = ${sell}-${total} = ${profit}.`,
    `نسبة الربح = ${profit} ÷ ${total} ×100 = ${pct}%.`
  ],'احسب التكلفة الكلية قبل حساب الربح.','الشحن والتجهيز جزء من التكلفة إذا ذكرهما السؤال.','(سعر البيع - التكلفة الكلية) ÷ التكلفة الكلية.',3);
}

function discountThenSale(ctx){
  const {rng}=ctx; const tag=rng.pick([200,240,300,400,500]); const discount=rng.pick([10,20,25]); const cost=tag*(1-discount/100); const markup=rng.pick([10,20,25]); const sell=cost*(1+markup/100); if(!Number.isInteger(sell)) return discountThenSale(ctx); const correct=sell;
  return baseMoney(ctx,'PL_M_DISC_MARK','خصم على سعر ثم إضافة ربح','medium',`سعر سلعة المعلن ${tag} درهمًا. حصل المتجر عليها بخصم ${discount}% من هذا السعر، ثم أراد ربحًا قدره ${markup}% من تكلفة الشراء الفعلية. فما سعر البيع؟`,correct,[tag*(1+markup/100),tag*(1-discount/100),tag*(1+(markup-discount)/100),sell+20,Math.max(1,sell-20),cost+markup],[
    `تكلفة الشراء بعد الخصم = ${tag} × ${1-discount/100} = ${formatNumber(cost)}.`,
    `سعر البيع المطلوب = ${formatNumber(cost)} × ${1+markup/100} = ${formatNumber(sell)}.`
  ],'احسب تكلفة الشراء الفعلية أولًا ثم الربح منها.','الربح هنا محسوب من التكلفة بعد الخصم لا من السعر المعلن.','طبّق الخصم ثم معامل الربح.',3);
}

function reverseSellingPrice(ctx){
  const {rng}=ctx; const cost=rng.pick([100,120,160,200,240,300,400]); const pct=rng.pick([20,25,50]); const sell=cost*(1+pct/100); const correct=cost;
  return baseMoney(ctx,'PL_H_REVERSE','استرجاع التكلفة من سعر بيع وربح معلوم','hard',`باع متجر سلعة بـ${formatNumber(sell)} درهمًا محققًا ربحًا قدره ${pct}% من تكلفة الشراء. فما تكلفة الشراء؟`,correct,[sell*(1-pct/100),sell-cost,pct,sell/(pct/100),cost+20,Math.max(1,cost-20)],[
    `سعر البيع يمثل ${100+pct}% من التكلفة.`,
    `التكلفة = ${formatNumber(sell)} ÷ ${1+pct/100} = ${cost} درهمًا.`
  ],'حوّل سعر البيع إلى نسبة من التكلفة ثم اعكس المعامل.','لا تطرح نسبة الربح مباشرة من سعر البيع.','البيع ÷ (1 + نسبة الربح).',3);
}

function discountMarkupChain(ctx){
  const {rng}=ctx; const list=rng.pick([200,240,300,400,500]); const disc=rng.pick([10,20,25]); const after=list*(1-disc/100); const markup=rng.pick([20,25,50]); const final=after*(1+markup/100); const correct=(final-list)/list*100; if(Math.abs(correct-Math.round(correct))>1e-9) return discountMarkupChain(ctx); const d=[markup-disc,markup+disc,0,correct+5,correct-5,disc-markup];
  return basePercentChange(ctx,'PL_H_CHAIN','خصم ثم زيادة وحساب التغير النهائي','hard',`كان السعر ${list} درهمًا. خُفّض بنسبة ${disc}%، ثم زيد السعر الجديد بنسبة ${markup}%. ما نسبة التغير النهائية مقارنة بالسعر الأصلي؟`,correct,d,[
    `بعد الخصم = ${list} × ${1-disc/100} = ${formatNumber(after)}.`,
    `بعد الزيادة = ${formatNumber(after)} × ${1+markup/100} = ${formatNumber(final)}.`,
    `التغير = ${formatNumber(final-list)} من أصل ${list} = ${formatNumber(Math.abs(correct))}% ${correct>=0?'زيادة':'انخفاض'}.`
  ],'طبّق الخصم والزيادة بالتتابع ثم قارن النهائي بالأصل.','الخصم والزيادة المتساويان لا يلغيان بعضهما عادةً.','استخدم معاملي الخصم والزيادة ثم قارن.',4);
}

function basePct(ctx,template_id,subskill,difficulty,question,correct,distractors,steps,how,remember,fast,estimated_steps){return base(ctx,template_id,subskill,difficulty,question,correct,distractors,v=>`${formatNumber(v)}%`,steps,how,remember,fast,estimated_steps)}
function baseMoney(ctx,template_id,subskill,difficulty,question,correct,distractors,steps,how,remember,fast,estimated_steps){return base(ctx,template_id,subskill,difficulty,question,correct,distractors,v=>`${formatNumber(v)} درهمًا`,steps,how,remember,fast,estimated_steps)}
function basePercentChange(ctx,template_id,subskill,difficulty,question,correct,distractors,steps,how,remember,fast,estimated_steps){return base(ctx,template_id,subskill,difficulty,question,correct,distractors,v=>v>0?`زيادة ${formatNumber(v)}%`:v<0?`انخفاض ${formatNumber(Math.abs(v))}%`:'لا يوجد تغير',steps,how,remember,fast,estimated_steps)}
function base(ctx,template_id,subskill,difficulty,question,correct,distractors,format,steps,how,remember,fast,estimated_steps){
 return {id:makeId(template_id,ctx.seed),generator_id:template_id,template_id,seed:ctx.seed,family:ctx.family,family_ar:ctx.family_ar,category:ctx.category,subskill,difficulty,question,display_expression:null,correct,distractors:distractors.filter(v=>Number.isFinite(v)).map(v=>({value:v,rationale:'خطأ في تحديد أساس نسبة الربح/الخسارة أو في ترتيب الخصم والزيادة.'})),format,explanation:{how_to_start:how,steps,answer:`الإجابة الصحيحة: ${format(correct)}.`,fast_method:fast,remember},estimated_steps,concept_tags:['profit-loss','percentage'],engine_version:ctx.engineVersion};
}
