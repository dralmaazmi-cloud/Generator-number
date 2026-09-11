import {buildPrintReportHtml} from './report.js';

const UI_VERSION = '1.2.1';
const STORAGE_KEY = 'numerical_generator_saved_session_v2';
const STATS_KEY = 'numerical_generator_family_stats_v1';
const LAST_SETTINGS_KEY = 'numerical_generator_last_settings_v1';
const FAVORITES_KEY = 'numerical_generator_favorites_v1';
const $ = id => document.getElementById(id);

const state = {
  engine:null,
  EngineModule:null,
  families:[],
  selectedFamilies:new Set(),
  familySelectionMode:'mixed',
  familySelectionSnapshot:null,
  mode:'training',
  session:null,
  view:'setup',
  timerHandle:null,
  questionStartAt:null,
  pendingExitTarget:'setup',
  timedOut:false
};

function escapeHtml(value){
  return String(value ?? '').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
}
function makeSeed(prefix='practice'){return `${prefix}-${Date.now().toString(36)}-${Math.floor(Math.random()*1e9).toString(36)}`}
function nowIso(){return new Date().toISOString()}
function difficultyAr(d){return d==='easy'?'سهل':d==='medium'?'متوسط':d==='hard'?'صعب':d==='adaptive'?'تكيفي':'مختلط'}
function modeAr(m){return m==='exam'?'امتحان':'تدريب'}
function formatClock(seconds){seconds=Math.max(0,Math.floor(seconds||0));return `${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`}
function clamp(n,min,max){return Math.max(min,Math.min(max,n))}
function avg(arr){return arr.length?arr.reduce((a,b)=>a+b,0)/arr.length:0}

async function bootstrap(){
  const boot=$('bootStatus');
  try{
    const mod=await import('./src/index.js');
    state.EngineModule=mod;
    state.engine=new mod.default();
    state.families=state.engine.listFamilies();
    if(!state.families.length) throw new Error('Family registry is empty');
    $('engineVersion').textContent=`UI v${UI_VERSION} · Engine v${mod.ENGINE_VERSION}`;
    renderFamilyGrid();
    populateFamilySelect();
    restoreLastSettings();
    if(!state.selectedFamilies.size) setFamilySelectionMode('mixed');
    bindEvents();
    refreshSavedSessionCard();
    refreshFavoritesCard();
    refreshWeakHint();
    $('generate').disabled=false;
    boot.textContent=`تم تحميل ${state.families.length} عائلة بنجاح`;
    boot.className='boot-status ok';
    setTimeout(()=>boot.classList.add('hidden'),1100);
    window.__NUM_GENERATOR_READY__=true;
    window.__NUM_GENERATOR_ENGINE__=state.engine;
    await runSmokeModeIfRequested();
  }catch(err){
    console.error(err);
    boot.textContent=`فشل تحميل المحرك: ${err.message||err}`;
    boot.className='boot-status bad';
  }
}

function bindEvents(){
  $('modeTraining').onclick=()=>setMode('training');
  $('modeExam').onclick=()=>setMode('exam');
  $('difficulty').onchange=handleDifficultyChange;
  $('count').onchange=()=>$('customCountWrap').classList.toggle('hidden',$('count').value!=='custom');
  $('timeMode').onchange=()=>$('customTimeWrap').classList.toggle('hidden',$('timeMode').value!=='custom');
  $('familySelect').onchange=handleFamilySelectChange;
  $('selectAllFamilies').onclick=()=>{selectAllFamilies(false);state.familySelectionMode='custom';syncFamilySelectionUi()};
  $('clearFamilies').onclick=()=>{clearFamilies(false);state.familySelectionMode='custom';syncFamilySelectionUi()};
  $('selectWeakFamilies').onclick=()=>selectWeakFamilies({fromModal:true});
  $('applyFamilies').onclick=applyFamilyModal;
  $('cancelFamilies').onclick=closeFamilyModal;
  $('familyModal').addEventListener('click',e=>{if(e.target===$('familyModal')) closeFamilyModal()});
  $('generate').onclick=startNewSession;
  $('resumeSession').onclick=resumeSavedSession;
  $('deleteSaved').onclick=()=>{localStorage.removeItem(STORAGE_KEY);refreshSavedSessionCard()};
  $('practiceFavorites').onclick=startFavoritesPractice;
  $('clearFavorites').onclick=()=>{localStorage.removeItem(FAVORITES_KEY);refreshFavoritesCard()};

  $('sessionBack').onclick=handleBack;
  $('sessionHome').onclick=()=>requestExit('setup');
  $('previousQuestion').onclick=goPreviousQuestion;
  $('submit').onclick=checkCurrentAnswer;
  $('next').onclick=goNextQuestion;
  $('favoriteQuestion').onclick=toggleFavoriteCurrentQuestion;

  $('saveExit').onclick=saveAndExit;
  $('discardExit').onclick=discardAndExit;
  $('cancelExit').onclick=closeExitModal;
  $('exitModal').addEventListener('click',e=>{if(e.target===$('exitModal')) closeExitModal()});
  $('confirmFinish').onclick=()=>{closeFinishModal();finishSession(state.timedOut?'timeout':'user')};
  $('cancelFinish').onclick=closeFinishModal;
  $('finishModal').addEventListener('click',e=>{if(e.target===$('finishModal')) closeFinishModal()});

  $('resultHome').onclick=()=>showView('setup');
  $('newSession').onclick=()=>{clearSavedSession();showView('setup')};
  $('sameSettings').onclick=startSameSettingsSession;
  $('practiceMistakes').onclick=startMistakePractice;
  $('harderSession').onclick=()=>startShiftedDifficultySession(1);
  $('easierSession').onclick=()=>startShiftedDifficultySession(-1);
  $('reviewAnswers').onclick=toggleReview;
  $('exportPdf').onclick=exportPdfReport;
  $('exportJson').onclick=exportJson;

  window.addEventListener('beforeunload',e=>{
    if(state.view==='session' && state.session && !state.session.completedAt){e.preventDefault();e.returnValue=''}
  });
}

function renderFamilyGrid(){
  $('familyGrid').innerHTML=state.families.map(f=>`<label class="family-choice" data-family="${f.id}"><input type="checkbox" value="${f.id}"><span><strong>${escapeHtml(f.ar)}</strong><small>${escapeHtml(f.description)}</small></span></label>`).join('');
  [...$('familyGrid').querySelectorAll('input')].forEach(input=>{
    input.onchange=()=>{
      if(input.checked) state.selectedFamilies.add(input.value); else state.selectedFamilies.delete(input.value);
      state.familySelectionMode='custom';
      syncFamilySelectionUi();
    };
  });
}
function populateFamilySelect(){
  const select=$('familySelect');
  select.innerHTML='<option value="mixed">مختلط</option><option value="weak">نقاط ضعفي</option>'+state.families.map(f=>`<option value="family:${f.id}">${escapeHtml(f.ar)}</option>`).join('')+'<option value="custom">تخصيص عدة عائلات…</option>';
  select.value='mixed';
}
function familySelectionSummary(){
  const count=state.selectedFamilies.size;
  if(state.familySelectionMode==='mixed'||count===state.families.length)return 'توزيع متوازن بين جميع عائلات الأسئلة.';
  if(state.familySelectionMode==='weak')return count?`تدريب موجّه إلى ${count} من نقاط ضعفك.`:'لا توجد بيانات كافية بعد؛ سيتم استخدام التوزيع المختلط.';
  if(count===1){const id=[...state.selectedFamilies][0];return state.families.find(f=>f.id===id)?.ar||'عائلة واحدة محددة.'}
  if(count>1)return `${count} عائلات محددة — سيتم التوزيع بينها بصورة متوازنة.`;
  return 'اختر عائلة واحدة على الأقل.';
}
function syncFamilySelectionUi(){
  [...$('familyGrid').querySelectorAll('.family-choice')].forEach(row=>{
    const input=row.querySelector('input');
    input.checked=state.selectedFamilies.has(input.value);
    row.classList.toggle('selected',input.checked);
  });
  const count=state.selectedFamilies.size;
  $('familySelectionNote').textContent=count===state.families.length?'جميع العائلات محددة — سيتم التوزيع بينها بصورة متوازنة.':count===1?'عائلة واحدة محددة.':count>1?`${count} عائلات محددة — سيتم التوزيع بينها بصورة متوازنة.`:'اختر عائلة واحدة على الأقل.';
  $('familyCompactNote').textContent=familySelectionSummary();
  const select=$('familySelect');
  if(state.familySelectionMode==='mixed')select.value='mixed';
  else if(state.familySelectionMode==='weak')select.value='weak';
  else if(state.familySelectionMode.startsWith('family:'))select.value=state.familySelectionMode;
  else select.value='custom';
  $('generate').disabled=!count || !state.engine;
}
function selectAllFamilies(sync=true){state.selectedFamilies=new Set(state.families.map(f=>f.id));if(sync)syncFamilySelectionUi()}
function clearFamilies(sync=true){state.selectedFamilies.clear();if(sync)syncFamilySelectionUi()}
function setFamilySelectionMode(mode){
  if(mode==='mixed'){
    state.familySelectionMode='mixed';selectAllFamilies(false);syncFamilySelectionUi();return;
  }
  if(mode?.startsWith('family:')){
    const id=mode.slice(7);if(state.families.some(f=>f.id===id)){state.familySelectionMode=mode;state.selectedFamilies=new Set([id]);syncFamilySelectionUi();return}
  }
}
function handleFamilySelectChange(){
  const value=$('familySelect').value;
  $('weakHint').classList.add('hidden');
  if(value==='mixed'){setFamilySelectionMode('mixed');return}
  if(value==='weak'){selectWeakFamilies({fromModal:false});return}
  if(value==='custom'){openFamilyModal();return}
  if(value.startsWith('family:'))setFamilySelectionMode(value);
}
function openFamilyModal(){
  state.familySelectionSnapshot={families:[...state.selectedFamilies],mode:state.familySelectionMode};
  if(state.familySelectionMode==='mixed')state.familySelectionMode='custom';
  syncFamilySelectionUi();
  $('familyModal').classList.remove('hidden');
}
function closeFamilyModal(){
  if(state.familySelectionSnapshot){state.selectedFamilies=new Set(state.familySelectionSnapshot.families);state.familySelectionMode=state.familySelectionSnapshot.mode;state.familySelectionSnapshot=null;syncFamilySelectionUi()}
  $('familyModal').classList.add('hidden');
}
function applyFamilyModal(){
  if(!state.selectedFamilies.size){alert('اختر عائلة واحدة على الأقل.');return}
  state.familySelectionMode=state.selectedFamilies.size===state.families.length?'mixed':'custom';
  state.familySelectionSnapshot=null;syncFamilySelectionUi();$('familyModal').classList.add('hidden');
}
function getStoredStats(){
  try{return JSON.parse(localStorage.getItem(STATS_KEY)||'{}')||{}}catch{return {}}
}
function getFavorites(){
  try{return JSON.parse(localStorage.getItem(FAVORITES_KEY)||'[]')||[]}catch{return []}
}
function favoriteSignature(q){return `${q.generator_id}|${q.question}|${q.display_expression||''}`}
function refreshFavoritesCard(){
  const card=$('favoriteCard');if(!card)return;const favs=getFavorites();
  if(!favs.length){card.classList.add('hidden');return}
  $('favoriteMeta').textContent=`${favs.length} سؤال محفوظ — يمكنك إنشاء جلسة تدريب منها.`;card.classList.remove('hidden');
}
function syncFavoriteButton(q){
  const favs=getFavorites();const active=favs.some(x=>x.signature===favoriteSignature(q));
  $('favoriteQuestion').classList.toggle('active',active);$('favoriteQuestion').textContent=active?'★':'☆';$('favoriteQuestion').title=active?'إزالة من المفضلة':'إضافة إلى المفضلة';
}
function toggleFavoriteCurrentQuestion(){
  const s=state.session;if(!s)return;const q=s.questions[s.currentIndex];if(!q)return;
  const sig=favoriteSignature(q);let favs=getFavorites();const idx=favs.findIndex(x=>x.signature===sig);
  if(idx>=0)favs.splice(idx,1);else favs.push({signature:sig,savedAt:nowIso(),question:q});
  favs=favs.slice(-100);localStorage.setItem(FAVORITES_KEY,JSON.stringify(favs));syncFavoriteButton(q);refreshFavoritesCard();
}
function startFavoritesPractice(){
  const favs=getFavorites();if(!favs.length)return;
  const questions=favs.map(x=>x.question).filter(Boolean).slice(-30);
  const settings={mode:'training',families:[...new Set(questions.map(q=>q.family))],difficulty:'mixed',count:questions.length,timeLimitSeconds:null,seed:makeSeed('favorites'),source:'favorites'};
  state.session={schema:'generated-practice-session-v2',id:`SESSION-${settings.seed}`,createdAt:nowIso(),startedAt:nowIso(),completedAt:null,finishReason:null,settings,currentIndex:0,questions,responses:Array(questions.length).fill(null).map(()=>emptyResponse()),elapsedSeconds:0,adaptiveHistory:[],summary:null};
  clearSavedSession();state.timedOut=false;showView('session');startTimer();renderCurrentQuestion();
}

function selectWeakFamilies({fromModal=false}={}){
  const stats=getStoredStats();
  const candidates=state.families.map(f=>{
    const s=stats[f.id]||{};const attempts=Number(s.attempts||0);const accuracy=attempts?Number(s.correct||0)/attempts:1;
    return {id:f.id,attempts,accuracy};
  }).filter(x=>x.attempts>=2).sort((a,b)=>a.accuracy-b.accuracy||b.attempts-a.attempts);
  if(!candidates.length){
    state.familySelectionMode='mixed';selectAllFamilies(false);syncFamilySelectionUi();
    $('weakHint').textContent='لا توجد بيانات كافية عن نقاط الضعف بعد. سيتم استخدام التوزيع المختلط مؤقتًا.';
    $('weakHint').classList.remove('hidden');
    return;
  }
  const picked=candidates.slice(0,Math.min(4,candidates.length));
  state.selectedFamilies=new Set(picked.map(x=>x.id));state.familySelectionMode=fromModal?'custom':'weak';syncFamilySelectionUi();
  $('weakHint').textContent=`تم اختيار أضعف ${picked.length} عائلات لديك بناءً على الجلسات السابقة.`;
  $('weakHint').classList.remove('hidden');
}
function refreshWeakHint(){
  const stats=getStoredStats();
  const attempts=Object.values(stats).reduce((a,s)=>a+Number(s.attempts||0),0);
  if(attempts<5){$('weakHint').classList.add('hidden');return}
  const weakest=state.families.map(f=>{const s=stats[f.id]||{};const n=Number(s.attempts||0);return {ar:f.ar,n,acc:n?Math.round(Number(s.correct||0)/n*100):null}}).filter(x=>x.n>=2&&x.acc!==null).sort((a,b)=>a.acc-b.acc).slice(0,3);
  if(weakest.length){$('weakHint').textContent=`نقاط تحتاج مزيدًا من التدريب: ${weakest.map(x=>`${x.ar} (${x.acc}%)`).join('، ')}.`;$('weakHint').classList.remove('hidden')}
}

function setMode(mode){
  state.mode=mode;
  $('modeTraining').classList.toggle('active',mode==='training');
  $('modeExam').classList.toggle('active',mode==='exam');
  $('examHint').classList.toggle('hidden',mode!=='exam');
  const adaptive=$('difficulty').querySelector('option[value="adaptive"]');
  adaptive.disabled=mode==='exam';
  if(mode==='exam' && $('difficulty').value==='adaptive') $('difficulty').value='mixed';
  handleDifficultyChange();
}
function handleDifficultyChange(){
  const adaptive=$('difficulty').value==='adaptive';
  $('adaptiveHint').classList.toggle('hidden',!adaptive);
  if(adaptive&&state.mode==='exam'){$('difficulty').value='mixed';$('adaptiveHint').classList.add('hidden')}
}

function getCount(){
  if($('count').value==='custom') return clamp(Number($('customCount').value||10),1,50);
  return Number($('count').value||10);
}
function getTimeLimitSeconds(){
  if($('timeMode').value==='none') return null;
  const mins=$('timeMode').value==='custom'?clamp(Number($('customTime').value||10),1,120):Number($('timeMode').value);
  return mins*60;
}
function currentSettings(){
  return {
    mode:state.mode,
    families:[...state.selectedFamilies],
    difficulty:$('difficulty').value||'mixed',
    count:getCount(),
    timeLimitSeconds:getTimeLimitSeconds(),
    seed:makeSeed(state.mode==='exam'?'exam':'train')
  };
}
function storeLastSettings(settings){
  const safe={mode:settings.mode,families:settings.families,difficulty:settings.difficulty,count:settings.count,timeLimitSeconds:settings.timeLimitSeconds};
  localStorage.setItem(LAST_SETTINGS_KEY,JSON.stringify(safe));
}
function restoreLastSettings(){
  try{
    const s=JSON.parse(localStorage.getItem(LAST_SETTINGS_KEY)||'null');if(!s)return;
    if(['training','exam'].includes(s.mode)) setMode(s.mode);
    if(Array.isArray(s.families)&&s.families.length){
      state.selectedFamilies=new Set(s.families.filter(id=>state.families.some(f=>f.id===id)));
      state.familySelectionMode=state.selectedFamilies.size===state.families.length?'mixed':state.selectedFamilies.size===1?`family:${[...state.selectedFamilies][0]}`:'custom';
    }
    if(['easy','medium','hard','mixed','adaptive'].includes(s.difficulty)) $('difficulty').value=(s.mode==='exam'&&s.difficulty==='adaptive')?'mixed':s.difficulty;
    const presets=['5','10','14','20','30'];
    if(presets.includes(String(s.count))) $('count').value=String(s.count); else {$('count').value='custom';$('customCount').value=String(clamp(Number(s.count||10),1,50));$('customCountWrap').classList.remove('hidden')}
    if(!s.timeLimitSeconds){$('timeMode').value='none'}else{const mins=Math.round(s.timeLimitSeconds/60);if(['5','10','15','20'].includes(String(mins)))$('timeMode').value=String(mins);else{$('timeMode').value='custom';$('customTime').value=String(clamp(mins,1,120));$('customTimeWrap').classList.remove('hidden')}}
    syncFamilySelectionUi();handleDifficultyChange();
  }catch{}
}

function startNewSession(){
  try{
    if(!state.selectedFamilies.size){alert('اختر عائلة واحدة على الأقل.');return}
    const settings=currentSettings();
    storeLastSettings(settings);
    state.session=createSession(settings);
    clearSavedSession();
    state.timedOut=false;
    showView('session');
    startTimer();
    renderCurrentQuestion();
  }catch(err){console.error(err);alert(`تعذر توليد الجلسة: ${err.message||err}`)}
}
function createSession(settings){
  const base={
    schema:'generated-practice-session-v2',id:`SESSION-${settings.seed}`,createdAt:nowIso(),startedAt:nowIso(),completedAt:null,finishReason:null,
    settings:{...settings},currentIndex:0,questions:[],responses:[],elapsedSeconds:0,adaptiveHistory:[],summary:null
  };
  if(settings.difficulty==='adaptive'){
    base.familySchedule=buildFamilySchedule(settings.families,settings.count,`${settings.seed}|families`);
    base.letterSchedule=buildLetterSchedule(settings.count,`${settings.seed}|letters`);
    base.questions.push(generateAdaptiveAtIndex(base,0));
  }else{
    const set=state.engine.generatePractice({families:settings.families,difficulty:settings.difficulty,count:settings.count,seed:settings.seed});
    base.questions=set.questions;base.engineValidation=set.validation;
  }
  base.responses=Array(settings.count).fill(null).map(()=>emptyResponse());
  return base;
}
function emptyResponse(){return {selected:null,checked:false,correct:false,timeSeconds:null,checkedAt:null}}
function buildFamilySchedule(families,count,seed){
  const pool=Array.isArray(families)&&families.length?families:state.families.map(f=>f.id);
  if(pool.length===1)return Array(count).fill(pool[0]);
  const rng=new state.EngineModule.SeededRNG(seed);const out=[];
  while(out.length<count){let round=rng.shuffle(pool);if(out.length&&round[0]===out.at(-1))round=[...round.slice(1),round[0]];for(const f of round){if(out.length>=count)break;out.push(f)}}
  return out;
}
function buildLetterSchedule(count,seed){const rng=new state.EngineModule.SeededRNG(seed);const letters=['A','B','C','D','E','F'];return rng.shuffle(Array.from({length:count},(_,i)=>letters[i%6]))}
function generateAdaptiveAtIndex(session,index){
  return state.engine.generateAdaptiveQuestion({family:session.familySchedule[index],history:session.adaptiveHistory,seed:`${session.settings.seed}|AQ${index+1}`,preferredCorrectLetter:session.letterSchedule[index]});
}

function renderCurrentQuestion(){
  const s=state.session;if(!s)return;const i=s.currentIndex;const q=s.questions[i];if(!q)return;
  state.questionStartAt=Date.now();
  const selectedLabel=s.settings.families.length===state.families.length?'جميع العائلات':s.settings.families.length===1?q.family_ar:`${s.settings.families.length} عائلات`;
  $('sessionTitle').textContent=s.settings.mode==='exam'?'الامتحان العددي المتجدد':'التدريب العددي المتجدد';
  $('sessionSubtitle').textContent=`${selectedLabel} · ${difficultyAr(s.settings.difficulty)}`;
  $('progressText').textContent=`${i+1} / ${s.settings.count}`;$('progressBar').style.width=`${((i+1)/s.settings.count)*100}%`;
  $('questionNumber').textContent=`السؤال ${i+1}`;$('familyChip').textContent=q.family_ar;$('difficultyChip').textContent=q.difficulty_ar;$('modeChip').textContent=modeAr(s.settings.mode);
  $('questionText').textContent=q.question;
  syncFavoriteButton(q);
  if(q.display_expression){$('expression').textContent=q.display_expression;$('expression').classList.remove('hidden')}else{$('expression').textContent='';$('expression').classList.add('hidden')}
  const response=s.responses[i]||emptyResponse();
  const showCorrection=s.settings.mode==='training'&&response.checked;
  $('options').innerHTML=Object.entries(q.options).map(([letter,value])=>{
    const classes=['option'];if(response.selected===letter)classes.push('selected');if(showCorrection&&letter===q.correct_option)classes.push('correct');if(showCorrection&&response.selected===letter&&letter!==q.correct_option)classes.push('wrong');if(showCorrection)classes.push('disabled');
    return `<label class="${classes.join(' ')}" data-letter="${letter}"><input type="radio" name="answer" value="${letter}" ${response.selected===letter?'checked':''} ${showCorrection?'disabled':''}><span class="letter">${letter}</span><span>${escapeHtml(value)}</span></label>`;
  }).join('');
  [...$('options').querySelectorAll('input')].forEach(input=>input.onchange=()=>{
    if(showCorrection)return;
    s.responses[i].selected=input.value;renderOptionSelection(input.value);
  });

  if(s.settings.mode==='training') renderTrainingControls(q,response); else renderExamControls(response);
  $('previousQuestion').disabled=i===0;
  $('sessionBottomNote').textContent=s.settings.mode==='exam'?'لن تظهر الإجابات أو الشروح حتى إنهاء الامتحان.':'في وضع التدريب يظهر التصحيح والشرح بعد كل سؤال.';
  window.scrollTo({top:0,behavior:'auto'});
}
function renderOptionSelection(letter){[...$('options').querySelectorAll('.option')].forEach(row=>row.classList.toggle('selected',row.dataset.letter===letter))}
function renderTrainingControls(q,response){
  if(response.checked){
    renderFeedbackAndExplanation(q,response);
    $('submit').classList.add('hidden');$('next').classList.remove('hidden');$('next').textContent=state.session.currentIndex===state.session.settings.count-1?'إنهاء الجلسة':'السؤال التالي';
  }else{
    $('feedback').className='feedback hidden';$('explanation').className='explanation-card hidden';$('explanation').innerHTML='';
    $('submit').textContent='تحقق من الإجابة';$('submit').classList.remove('hidden');$('next').classList.add('hidden');
  }
}
function renderExamControls(){
  $('feedback').className='feedback hidden';$('explanation').className='explanation-card hidden';$('explanation').innerHTML='';
  $('submit').classList.add('hidden');$('next').classList.remove('hidden');$('next').textContent=state.session.currentIndex===state.session.settings.count-1?'إنهاء الامتحان':'السؤال التالي';
}
function recordTimeIfNeeded(response){
  if(response.timeSeconds==null && state.questionStartAt){response.timeSeconds=Math.max(1,Math.round((Date.now()-state.questionStartAt)/1000))}
}
function checkCurrentAnswer(){
  const s=state.session;if(!s||s.settings.mode!=='training')return;const i=s.currentIndex;const q=s.questions[i];const r=s.responses[i];
  const selected=$('options').querySelector('input[name="answer"]:checked');
  if(!selected){$('feedback').textContent='اختر إجابة أولًا.';$('feedback').className='feedback bad';return}
  r.selected=selected.value;r.checked=true;r.correct=r.selected===q.correct_option;r.checkedAt=nowIso();recordTimeIfNeeded(r);
  if(s.settings.difficulty==='adaptive')s.adaptiveHistory.push({correct:r.correct,timeSeconds:r.timeSeconds,difficulty:q.difficulty});
  renderCurrentQuestion();
}
function renderFeedbackAndExplanation(q,r){
  $('feedback').textContent=r.correct?'إجابة صحيحة.':`الإجابة الصحيحة هي ${q.correct_option}: ${q.correct_value}`;$('feedback').className=`feedback ${r.correct?'ok':'bad'}`;
  const chosenReason=q.explanation.distractor_analysis?.[r.selected]||'';
  const sameIdeaButton=!r.correct?`<button id="sameIdeaQuestion" class="secondary same-idea-button" type="button">أعطني سؤالًا آخر على نفس الفكرة</button>`:'';
  $('explanation').innerHTML=`<h3>الشرح</h3><h4>كيف أبدأ؟</h4><p>${escapeHtml(q.explanation.how_to_start)}</p><h4>الخطوات</h4><ol>${q.explanation.steps.map(x=>`<li>${escapeHtml(x)}</li>`).join('')}</ol>${q.explanation.fast_method?`<h4>الطريقة السريعة</h4><div class="fast-box">${escapeHtml(q.explanation.fast_method)}</div>`:''}<h4>الإجابة</h4><p><strong>${escapeHtml(q.explanation.answer)}</strong></p>${chosenReason?`<h4>تحليل اختيارك</h4><p>${escapeHtml(chosenReason)}</p>`:''}<h4>تذكّر</h4><div class="remember-box">${escapeHtml(q.explanation.remember)}</div>${sameIdeaButton}`;
  $('explanation').className='explanation-card';
  if(!r.correct && $('sameIdeaQuestion')) $('sameIdeaQuestion').onclick=insertSameIdeaQuestion;
}
function insertSameIdeaQuestion(){
  const s=state.session;if(!s||s.settings.mode!=='training')return;const i=s.currentIndex;const original=s.questions[i];
  let sibling=null;
  for(let attempt=0;attempt<40;attempt++){
    const q=state.engine.generateQuestion({family:original.family,difficulty:original.difficulty,seed:`${s.settings.seed}|sameidea|${i}|${Date.now()}|${attempt}`});
    if(q.generator_id===original.generator_id && q.id!==original.id){sibling=q;break}
  }
  if(!sibling) sibling=state.engine.generateQuestion({family:original.family,difficulty:original.difficulty,seed:`${s.settings.seed}|samefamily|${Date.now()}`});
  s.questions.splice(i+1,0,sibling);s.responses.splice(i+1,0,emptyResponse());s.settings.count+=1;
  if(Array.isArray(s.familySchedule))s.familySchedule.splice(i+1,0,original.family);
  if(Array.isArray(s.letterSchedule))s.letterSchedule.splice(i+1,0,null);
  s.currentIndex=i+1;renderCurrentQuestion();
}

function goPreviousQuestion(){if(!state.session||state.session.currentIndex===0)return;captureExamSelectionAndTime();state.session.currentIndex--;renderCurrentQuestion()}
function handleBack(){if(!state.session)return;if(state.session.currentIndex>0)goPreviousQuestion();else requestExit('setup')}
function captureExamSelectionAndTime(){
  const s=state.session;if(!s||s.settings.mode!=='exam')return;const r=s.responses[s.currentIndex];const selected=$('options').querySelector('input[name="answer"]:checked');if(selected)r.selected=selected.value;recordTimeIfNeeded(r)
}
function goNextQuestion(){
  const s=state.session;if(!s)return;const i=s.currentIndex;
  if(s.settings.mode==='training'&&!s.responses[i]?.checked)return;
  if(s.settings.mode==='exam')captureExamSelectionAndTime();
  if(i>=s.settings.count-1){requestFinish();return}
  const nextIndex=i+1;if(s.settings.difficulty==='adaptive'&&!s.questions[nextIndex])s.questions[nextIndex]=generateAdaptiveAtIndex(s,nextIndex);
  s.currentIndex=nextIndex;renderCurrentQuestion();
}
function requestFinish(){
  const s=state.session;if(!s)return;
  if(s.settings.mode==='exam')captureExamSelectionAndTime();
  const unanswered=s.responses.filter(r=>!r.selected).length;
  $('finishMessage').textContent=unanswered?`لديك ${unanswered} سؤال غير مجاب. يمكنك العودة أو إنهاء الجلسة الآن.`:'سيتم تصحيح الإجابات وإظهار النتيجة.';
  $('finishModal').classList.remove('hidden');
}
function closeFinishModal(){$('finishModal').classList.add('hidden')}

function startTimer(){
  stopTimer();const s=state.session;if(!s)return;
  const start=Date.now()-((s.elapsedSeconds||0)*1000);
  const tick=()=>{
    s.elapsedSeconds=Math.floor((Date.now()-start)/1000);
    if(s.settings.timeLimitSeconds){
      const remaining=Math.max(0,s.settings.timeLimitSeconds-s.elapsedSeconds);$('sessionTimer').textContent=formatClock(remaining);$('sessionTimer').classList.toggle('urgent',remaining<=60);
      if(remaining<=0){state.timedOut=true;stopTimer();finishSession('timeout')}
    }else{$('sessionTimer').textContent=formatClock(s.elapsedSeconds);$('sessionTimer').classList.remove('urgent')}
  };
  tick();state.timerHandle=setInterval(tick,1000);
}
function stopTimer(){if(state.timerHandle){clearInterval(state.timerHandle);state.timerHandle=null}}

function finishSession(reason='user'){
  const s=state.session;if(!s||s.completedAt)return;stopTimer();closeFinishModal();
  if(s.settings.mode==='exam')captureExamSelectionAndTime();
  s.responses.forEach((r,i)=>{if(r.selected){r.checked=true;r.correct=r.selected===s.questions[i].correct_option;r.checkedAt=r.checkedAt||nowIso()}else{r.checked=true;r.correct=false;r.checkedAt=r.checkedAt||nowIso()}});
  s.completedAt=nowIso();s.finishReason=reason;
  const answered=s.responses.filter(r=>r.selected).length;const correct=s.responses.filter(r=>r.correct).length;const wrong=answered-correct;const unanswered=s.settings.count-answered;const pct=Math.round((correct/s.settings.count)*100);
  const byDifficulty={},byFamily={};const times=[];
  s.questions.forEach((q,i)=>{
    const r=s.responses[i];const ok=!!r?.correct;
    byDifficulty[q.difficulty]??={n:0,c:0,time:[]};byDifficulty[q.difficulty].n++;if(ok)byDifficulty[q.difficulty].c++;if(Number.isFinite(r?.timeSeconds))byDifficulty[q.difficulty].time.push(r.timeSeconds);
    byFamily[q.family]??={ar:q.family_ar,n:0,c:0,time:[]};byFamily[q.family].n++;if(ok)byFamily[q.family].c++;if(Number.isFinite(r?.timeSeconds))byFamily[q.family].time.push(r.timeSeconds);
    if(Number.isFinite(r?.timeSeconds))times.push(r.timeSeconds);
  });
  Object.values(byDifficulty).forEach(x=>x.avgTime=Math.round(avg(x.time)));Object.values(byFamily).forEach(x=>x.avgTime=Math.round(avg(x.time)));
  s.summary={answered,correct,wrong,unanswered,percentage:pct,byDifficulty,byFamily,avgTimeSeconds:Math.round(avg(times))};
  updatePersistentStats(s);clearSavedSession();showResult();
}
function updatePersistentStats(s){
  const stats=getStoredStats();
  s.questions.forEach((q,i)=>{const r=s.responses[i];if(!r?.selected)return;const x=stats[q.family]||{attempts:0,correct:0,totalTime:0};x.attempts++;if(r.correct)x.correct++;if(Number.isFinite(r.timeSeconds))x.totalTime+=r.timeSeconds;stats[q.family]=x});
  localStorage.setItem(STATS_KEY,JSON.stringify(stats));refreshWeakHint();
}

function showResult(){
  showView('result');const s=state.session;const r=s.summary;const degrees=Math.max(0,Math.min(360,r.percentage*3.6));
  $('resultTitle').textContent=s.settings.mode==='exam'?'نتيجة الامتحان':'نتيجة التدريب';$('scorePct').textContent=`${r.percentage}%`;$('scoreRing').style.background=`conic-gradient(var(--navy2) ${degrees}deg,#e7ebf2 ${degrees}deg)`;
  $('scoreLine').textContent=`أجبت عن ${r.correct} إجابة صحيحة من أصل ${s.settings.count}.`;
  $('resultStats').innerHTML=`<span class="result-stat">الصحيح: ${r.correct}</span><span class="result-stat">الخطأ: ${r.wrong}</span><span class="result-stat">غير المجاب: ${r.unanswered}</span><span class="result-stat">الزمن: ${formatClock(s.elapsedSeconds)}</span><span class="result-stat">متوسط السؤال: ${formatClock(r.avgTimeSeconds)}</span><span class="result-stat">${modeAr(s.settings.mode)}</span>`;
  renderAnalytics();$('reviewPanel').classList.add('hidden');$('reviewPanel').innerHTML='';$('reviewAnswers').textContent='مراجعة الإجابات';
  $('practiceMistakes').disabled=r.wrong+r.unanswered===0;
}
function renderAnalytics(){
  const s=state.session;const byFamily=s.summary.byFamily;
  $('familyAnalytics').innerHTML=Object.entries(byFamily).sort((a,b)=>(a[1].c/a[1].n)-(b[1].c/b[1].n)).map(([id,x])=>{
    const pct=Math.round(x.c/x.n*100);return `<div class="analytic-item"><div><strong>${escapeHtml(x.ar)}</strong><span>${x.c}/${x.n} · متوسط ${formatClock(x.avgTime)}</span></div><b>${pct}%</b><div class="mini-bar"><i style="width:${pct}%"></i></div></div>`
  }).join('');
  const order=['easy','medium','hard'];
  $('difficultyAnalytics').innerHTML=order.filter(d=>s.summary.byDifficulty[d]).map(d=>{const x=s.summary.byDifficulty[d];const pct=Math.round(x.c/x.n*100);return `<div class="analytic-item compact-analytic"><div><strong>${difficultyAr(d)}</strong><span>${x.c}/${x.n}</span></div><b>${pct}%</b></div>`}).join('');
}
function toggleReview(){const panel=$('reviewPanel');if(panel.classList.contains('hidden')){renderReview();panel.classList.remove('hidden');$('reviewAnswers').textContent='إخفاء المراجعة'}else{panel.classList.add('hidden');$('reviewAnswers').textContent='مراجعة الإجابات'}}
function renderReview(){
  const s=state.session;$('reviewPanel').innerHTML=s.questions.map((q,i)=>{const r=s.responses[i]||{};const chosenReason=r.selected?(q.explanation.distractor_analysis?.[r.selected]||''):'';return `<details class="review-item"><summary><span class="review-status ${r.correct?'ok':'bad'}">${r.correct?'✓':'×'}</span><span class="review-q">${i+1}. ${escapeHtml(q.question)}${q.display_expression?`<br><small>${escapeHtml(q.display_expression)}</small>`:''}</span><span class="review-meta">${escapeHtml(q.family_ar)} · ${escapeHtml(q.difficulty_ar)}</span></summary><div class="review-body"><div class="answer-line">إجابتك: <strong>${escapeHtml(r.selected||'لم تجب')}</strong>${r.selected?` - ${escapeHtml(q.options[r.selected])}`:''}</div><div class="answer-line correct-answer">الإجابة الصحيحة: <strong>${q.correct_option}</strong> - ${escapeHtml(q.correct_value)}</div><h4>كيف أبدأ؟</h4><p>${escapeHtml(q.explanation.how_to_start)}</p><ol>${q.explanation.steps.map(x=>`<li>${escapeHtml(x)}</li>`).join('')}</ol>${q.explanation.fast_method?`<p><strong>الطريقة السريعة:</strong> ${escapeHtml(q.explanation.fast_method)}</p>`:''}${chosenReason?`<p><strong>تحليل اختيارك:</strong> ${escapeHtml(chosenReason)}</p>`:''}<p><strong>تذكّر:</strong> ${escapeHtml(q.explanation.remember)}</p></div></details>`}).join('')
}

function startSameSettingsSession(){
  const old=state.session;if(!old)return;const settings={...old.settings,seed:makeSeed(old.settings.mode==='exam'?'exam':'train')};state.session=createSession(settings);clearSavedSession();state.timedOut=false;showView('session');startTimer();renderCurrentQuestion();
}
function startMistakePractice(){
  const old=state.session;if(!old)return;const wrongFamilies=[...new Set(old.questions.filter((q,i)=>!old.responses[i]?.correct).map(q=>q.family))];if(!wrongFamilies.length)return;
  const count=clamp(Math.max(5,wrongFamilies.length*3),5,20);const settings={mode:'training',families:wrongFamilies,difficulty:'adaptive',count,timeLimitSeconds:null,seed:makeSeed('mistakes')};
  state.session=createSession(settings);clearSavedSession();state.timedOut=false;showView('session');startTimer();renderCurrentQuestion();
}

function startShiftedDifficultySession(direction){
  const old=state.session;if(!old)return;
  const order=['easy','medium','hard'];let base=old.settings.difficulty;
  if(!order.includes(base)) base='medium';
  const next=order[clamp(order.indexOf(base)+direction,0,order.length-1)];
  const settings={...old.settings,mode:'training',difficulty:next,timeLimitSeconds:null,seed:makeSeed(direction>0?'harder':'easier')};
  state.session=createSession(settings);clearSavedSession();state.timedOut=false;showView('session');startTimer();renderCurrentQuestion();
}

function requestExit(target='setup'){state.pendingExitTarget=target;$('exitModal').classList.remove('hidden')}
function closeExitModal(){$('exitModal').classList.add('hidden')}
function saveAndExit(){if(state.session){if(state.session.settings.mode==='exam')captureExamSelectionAndTime();localStorage.setItem(STORAGE_KEY,JSON.stringify(state.session))}closeExitModal();stopTimer();showView(state.pendingExitTarget||'setup');refreshSavedSessionCard()}
function discardAndExit(){clearSavedSession();closeExitModal();stopTimer();state.session=null;showView(state.pendingExitTarget||'setup');refreshSavedSessionCard()}
function clearSavedSession(){localStorage.removeItem(STORAGE_KEY);refreshSavedSessionCard()}
function refreshSavedSessionCard(){
  const card=$('resumeCard');if(!card)return;try{const raw=localStorage.getItem(STORAGE_KEY);if(!raw){card.classList.add('hidden');return}const s=JSON.parse(raw);if(s.completedAt){localStorage.removeItem(STORAGE_KEY);card.classList.add('hidden');return}const done=s.responses?.filter(x=>x?.selected).length||0;const famCount=s.settings?.families?.length||0;$('resumeMeta').textContent=`${done}/${s.settings.count} سؤال · ${modeAr(s.settings.mode)} · ${famCount===state.families.length?'جميع العائلات':`${famCount} عائلات`} · ${difficultyAr(s.settings.difficulty)}`;card.classList.remove('hidden')}catch{localStorage.removeItem(STORAGE_KEY);card.classList.add('hidden')}
}
function resumeSavedSession(){
  try{const raw=localStorage.getItem(STORAGE_KEY);if(!raw)return;state.session=JSON.parse(raw);if(state.session.completedAt){clearSavedSession();return}state.mode=state.session.settings.mode||'training';state.timedOut=false;showView('session');startTimer();renderCurrentQuestion()}catch(err){console.error(err);alert('تعذر استكمال الجلسة المحفوظة.');clearSavedSession()}
}
function showView(name){
  state.view=name;['Setup','Session','Result'].forEach(v=>$(`view${v}`).classList.toggle('hidden',v.toLowerCase()!==name));
  if(name==='setup'){stopTimer();refreshSavedSessionCard();refreshFavoritesCard();window.scrollTo({top:0,behavior:'auto'})}
  if(name==='result')window.scrollTo({top:0,behavior:'auto'});
}

function exportJson(){
  const s=state.session;if(!s)return;const blob=new Blob([JSON.stringify(s,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`numerical-generated-${s.settings.mode}-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1200)
}
function exportPdfReport(){
  const s=state.session;if(!s?.completedAt)return;const win=window.open('','_blank');if(!win){alert('اسمح بفتح نافذة التقرير لتصدير PDF.');return}win.document.open();win.document.write(buildPrintReportHtml(s));win.document.close();setTimeout(()=>{try{win.focus();win.print()}catch(err){console.error(err)}},450)
}

async function runSmokeModeIfRequested(){
  const qs=new URLSearchParams(location.search);const mode=qs.get('smoke');if(!mode)return;
  state.mode=mode==='exam'?'exam':'training';setMode(state.mode);state.familySelectionMode='mixed';selectAllFamilies(false);syncFamilySelectionUi();$('difficulty').value=mode==='adaptive'?'adaptive':'mixed';if(state.mode==='exam'&&$('difficulty').value==='adaptive')$('difficulty').value='mixed';$('count').value='5';$('timeMode').value='none';
  startNewSession();document.documentElement.dataset.smokeSession=state.session?.questions?.length?'pass':'fail';
  if(mode==='result'){
    for(let i=0;i<state.session.settings.count;i++){const q=state.session.questions[i]||generateAdaptiveAtIndex(state.session,i);state.session.questions[i]=q;state.session.responses[i]={selected:q.correct_option,checked:true,correct:true,timeSeconds:8,checkedAt:nowIso()};if(state.session.settings.difficulty==='adaptive')state.session.adaptiveHistory.push({correct:true,timeSeconds:8,difficulty:q.difficulty})}
    state.session.elapsedSeconds=40;finishSession('smoke');document.documentElement.dataset.smokeResult=state.session.summary?.percentage===100?'pass':'fail';
  }
}

bootstrap();
