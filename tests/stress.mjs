import Engine from '../src/index.js';
import {buildPrintReportHtml} from '../report.js';

const engine=new Engine();
let generated=0;
for(const family of engine.listFamilies()){
  for(const difficulty of ['easy','medium','hard']){
    for(let i=0;i<100;i++){
      const q=engine.generateQuestion({family:family.id,difficulty,seed:`stress-${family.id}-${difficulty}-${i}`});
      const result=engine.validateQuestion(q);
      if(!result.valid) throw new Error(`${family.id}/${difficulty}: ${result.errors.join(',')}`);
      generated++;
    }
  }
}
for(let i=0;i<120;i++){
  const set=engine.generatePractice({families:engine.listFamilies().map(f=>f.id),difficulty:'mixed',count:14,seed:`batch-${i}`});
  if(!set.validation.valid) throw new Error(`invalid batch ${i}`);
}
let history=[];
for(let i=0;i<100;i++){
  const q=engine.generateAdaptiveQuestion({family:engine.listFamilies()[i%16].id,history,seed:`adaptive-${i}`});
  if(!engine.validateQuestion(q).valid) throw new Error(`invalid adaptive ${i}`);
  history.push({correct:i%3!==0,timeSeconds:35+i%30,difficulty:q.difficulty});
}
const demo=engine.generatePractice({families:['speed','ratios','averages'],difficulty:'mixed',count:5,seed:'report-smoke'});
const responses=demo.questions.map(q=>({selected:q.correct_option,checked:true,correct:true,timeSeconds:35}));
const byFamily={},byDifficulty={};
demo.questions.forEach(q=>{byFamily[q.family]??={ar:q.family_ar,n:0,c:0,avgTime:35};byFamily[q.family].n++;byFamily[q.family].c++;byDifficulty[q.difficulty]??={n:0,c:0,avgTime:35};byDifficulty[q.difficulty].n++;byDifficulty[q.difficulty].c++});
const html=buildPrintReportHtml({settings:{mode:'exam',difficulty:'mixed',count:5,timeLimitSeconds:600},questions:demo.questions,responses,summary:{correct:5,wrong:0,unanswered:0,percentage:100,avgTimeSeconds:35,byFamily,byDifficulty},elapsedSeconds:175,completedAt:new Date().toISOString()});
if(!html.includes('تقرير امتحان عددي متجدد')||html.includes('Seed:')) throw new Error('report smoke failed');
console.log(`PASS: ${generated} single questions + 120 mixed sessions + 100 adaptive questions + PDF HTML smoke.`);
