import {ENGINE_VERSION} from './src/index.js';

function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function fmtClock(sec){sec=Math.max(0,Math.floor(sec||0));return `${String(Math.floor(sec/60)).padStart(2,'0')}:${String(sec%60).padStart(2,'0')}`}
function diffAr(d){return d==='easy'?'سهل':d==='medium'?'متوسط':d==='hard'?'صعب':d==='adaptive'?'تكيفي':'مختلط'}
function modeAr(m){return m==='exam'?'امتحان':'تدريب'}

/**
 * RC2-006. The report's full content as logical-order Unicode.
 *
 * The PDF the browser prints stores Arabic as PRESENTATION FORMS in VISUAL
 * order — 78.1% of the Arabic characters in a freshly printed report, against
 * the 77.5% the RC1 audit measured in the frozen ones. That is the renderer's
 * doing, not the markup's: the letters have already been shaped and reordered
 * before they reach the text layer, so the layer cannot be searched against the
 * source strings and cannot be read by anything that expects logical order.
 *
 * Chromium's tagged export (--export-tagged-pdf) improves it but does not fix
 * it: it attaches /ActualText to each GLYPH, so a screen reader gets base
 * letters instead of presentation forms, but they arrive one at a time and
 * still in visual order, and a literal search for «متوسط القيم» still returns
 * nothing.
 *
 * So the logical text is produced here, by the code that knows what the report
 * says, and travels with it. It is embedded in the HTML in a machine-readable
 * block and written beside the PDF by the export tool, so every artifact set
 * carries a layer that is searchable, copyable and readable in logical order.
 */
export function buildReportTextLayer(s){
  const r=s.summary||{};
  const date=new Date(s.completedAt||Date.now()).toLocaleString('ar-AE');
  const familyLabels=[...new Set((s.questions||[]).map(q=>q.family_ar))];
  const familyLabel=familyLabels.length>5?'عائلات متعددة':familyLabels.join('، ');
  const L=[];
  L.push(`تقرير ${modeAr(s.settings?.mode)} عددي متجدد`);
  L.push(`التاريخ: ${date}`);
  L.push(`الوضع: ${modeAr(s.settings?.mode)} · الصعوبة: ${diffAr(s.settings?.difficulty)} · عدد الأسئلة: ${Number(s.settings?.count||s.questions?.length||0)}`);
  L.push(`العائلات: ${familyLabel}`);
  if(s.settings?.timeLimitSeconds) L.push(`الوقت المحدد: ${fmtClock(s.settings.timeLimitSeconds)}`);
  L.push(`النتيجة: ${r.percentage||0}% · الصحيح: ${r.correct||0} · الخطأ: ${r.wrong||0} · غير المجاب: ${r.unanswered||0} · الزمن: ${fmtClock(s.elapsedSeconds)} · متوسط السؤال: ${fmtClock(r.avgTimeSeconds||0)}`);
  L.push('');
  L.push('الأداء حسب العائلة');
  for(const x of Object.values(r.byFamily||{})){
    L.push(`${x.ar}: ${x.c}/${x.n} · ${Math.round((x.c||0)/(x.n||1)*100)}% · ${fmtClock(x.avgTime||0)}`);
  }
  L.push('');
  L.push('الأداء حسب الصعوبة');
  for(const d of ['easy','medium','hard']){
    const x=r.byDifficulty?.[d]; if(!x) continue;
    L.push(`${diffAr(d)}: ${x.c}/${x.n} · ${Math.round((x.c||0)/(x.n||1)*100)}% · ${fmtClock(x.avgTime||0)}`);
  }
  (s.questions||[]).forEach((q,i)=>{
    const resp=s.responses?.[i]||{};
    L.push('');
    L.push(`السؤال ${i+1} · ${q.family_ar} · ${q.difficulty_ar} · ${resp.correct?'صحيح':'غير صحيح'} · ${fmtClock(resp.timeSeconds||0)}`);
    L.push(q.question||'');
    if(q.display_expression) L.push(q.display_expression);
    for(const [letter,value] of Object.entries(q.options||{})) L.push(`${letter}. ${value}`);
    L.push(`إجابتك: ${resp.selected||'لم تجب'}${resp.selected?` — ${q.options?.[resp.selected]??''}`:''}`);
    L.push(`الإجابة الصحيحة: ${q.correct_option} — ${q.correct_value}`);
    L.push(`كيف أبدأ؟ ${q.explanation?.how_to_start||''}`);
    (q.explanation?.steps||[]).forEach((x,n)=>L.push(`${n+1}. ${x}`));
    if(q.explanation?.fast_method) L.push(`الطريقة السريعة: ${q.explanation.fast_method}`);
    const chosenReason=resp.selected?(q.explanation?.distractor_analysis?.[resp.selected]||''):'';
    if(chosenReason) L.push(`تحليل اختيارك: ${chosenReason}`);
    L.push(`تذكّر: ${q.explanation?.remember||''}`);
  });
  L.push('');
  L.push(`تم إنشاء هذا التقرير محليًا بواسطة Numerical Question Generator Engine v${ENGINE_VERSION}.`);
  return L.join('\n');
}

export function buildPrintReportHtml(s){
  const r=s.summary||{};
  const date=new Date(s.completedAt||Date.now()).toLocaleString('ar-AE');
  const familyLabels=[...new Set((s.questions||[]).map(q=>q.family_ar))];
  const familyLabel=familyLabels.length>5?'عائلات متعددة':familyLabels.join('، ');
  const familyRows=Object.values(r.byFamily||{}).map(x=>{
    const pct=Math.round((x.c||0)/(x.n||1)*100);
    return `<tr><td>${esc(x.ar)}</td><td>${x.c}/${x.n}</td><td>${pct}%</td><td>${fmtClock(x.avgTime||0)}</td></tr>`;
  }).join('');
  const difficultyRows=['easy','medium','hard'].filter(d=>r.byDifficulty?.[d]).map(d=>{
    const x=r.byDifficulty[d];const pct=Math.round((x.c||0)/(x.n||1)*100);
    return `<tr><td>${diffAr(d)}</td><td>${x.c}/${x.n}</td><td>${pct}%</td><td>${fmtClock(x.avgTime||0)}</td></tr>`;
  }).join('');
  const questions=(s.questions||[]).map((q,i)=>{
    const resp=s.responses?.[i]||{};
    const opts=Object.entries(q.options||{}).map(([letter,value])=>{
      const cl=letter===q.correct_option?'correct':(letter===resp.selected&&!resp.correct?'wrong':'');
      return `<div class="opt ${cl}"><b>${letter}</b><span>${esc(value)}</span></div>`;
    }).join('');
    const chosenReason=resp.selected?(q.explanation?.distractor_analysis?.[resp.selected]||''):'';
    return `<section class="question"><div class="qhead"><span>السؤال ${i+1} · ${esc(q.family_ar)} · ${esc(q.difficulty_ar)}</span><span>${resp.correct?'صحيح':'غير صحيح'} · ${fmtClock(resp.timeSeconds||0)}</span></div><h3>${esc(q.question)}</h3>${q.display_expression?`<div class="expr">${esc(q.display_expression)}</div>`:''}<div class="opts">${opts}</div><div class="answer">إجابتك: <b>${esc(resp.selected||'لم تجب')}</b>${resp.selected?` — ${esc(q.options[resp.selected])}`:''}<br>الإجابة الصحيحة: <b>${q.correct_option}</b> — ${esc(q.correct_value)}</div><div class="ex"><p><b>كيف أبدأ؟</b> ${esc(q.explanation?.how_to_start||'')}</p><ol>${(q.explanation?.steps||[]).map(x=>`<li>${esc(x)}</li>`).join('')}</ol>${q.explanation?.fast_method?`<p><b>الطريقة السريعة:</b> ${esc(q.explanation.fast_method)}</p>`:''}${chosenReason?`<p><b>تحليل اختيارك:</b> ${esc(chosenReason)}</p>`:''}<p><b>تذكّر:</b> ${esc(q.explanation?.remember||'')}</p></div></section>`;
  }).join('');

  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>تقرير التدريب العددي المتجدد</title><style>
  @page{size:A4;margin:13mm}*{box-sizing:border-box}body{font-family:Arial,Tahoma,sans-serif;color:#172033;margin:0;background:#fff}.cover{border-bottom:2px solid #263c67;padding-bottom:14px;margin-bottom:14px}.kicker{font-size:9px;letter-spacing:.14em;color:#52688e;font-weight:bold}.cover h1{font-size:23px;margin:5px 0}.meta{font-size:11px;line-height:1.7;color:#667085}.score{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}.score span{border:1px solid #dce3ee;border-radius:8px;padding:6px 9px;font-size:10px}.summary-table{width:100%;border-collapse:collapse;margin:12px 0 16px;font-size:10px}.summary-table th,.summary-table td{border:1px solid #e0e5ed;padding:6px;text-align:right}.summary-table th{background:#f4f6f9}.question{page-break-inside:avoid;border:1px solid #dfe5ee;border-radius:12px;padding:12px;margin:0 0 12px}.qhead{display:flex;justify-content:space-between;gap:12px;font-size:9px;color:#667085}.question h3{font-size:13px;line-height:1.75;margin:9px 0}.expr{direction:ltr;text-align:center;background:#f5f7fa;border:1px solid #e1e6ee;border-radius:8px;padding:7px;font-weight:700;margin-bottom:8px}.opts{display:grid;grid-template-columns:1fr 1fr;gap:5px}.opt{display:flex;gap:6px;border:1px solid #e1e6ee;border-radius:7px;padding:6px;font-size:9px}.opt b{direction:ltr}.opt.correct{background:#edf9f3;border-color:#a9dbc1}.opt.wrong{background:#fff2f0;border-color:#efbdb7}.answer{font-size:9px;background:#f6f8fb;padding:7px;border-radius:7px;margin-top:8px;line-height:1.6}.ex{font-size:9px;line-height:1.65;border-top:1px solid #e6e9ef;margin-top:9px;padding-top:8px}.ex p{margin:4px 0}.ex ol{margin:5px 0;padding-right:18px}.footer{font-size:8px;color:#8a94a5;text-align:center;margin-top:14px}@media print{.question{break-inside:avoid}}</style></head><body>
  <header class="cover"><div class="kicker">NUMERICAL GENERATED PRACTICE</div><h1>تقرير ${modeAr(s.settings?.mode)} عددي متجدد</h1><div class="meta">التاريخ: ${esc(date)}<br>الوضع: ${modeAr(s.settings?.mode)} · الصعوبة: ${diffAr(s.settings?.difficulty)} · عدد الأسئلة: ${Number(s.settings?.count||s.questions?.length||0)}<br>العائلات: ${esc(familyLabel)}${s.settings?.timeLimitSeconds?`<br>الوقت المحدد: ${fmtClock(s.settings.timeLimitSeconds)}`:''}</div><div class="score"><span>النتيجة: <b>${r.percentage||0}%</b></span><span>الصحيح: <b>${r.correct||0}</b></span><span>الخطأ: <b>${r.wrong||0}</b></span><span>غير المجاب: <b>${r.unanswered||0}</b></span><span>الزمن: <b>${fmtClock(s.elapsedSeconds)}</b></span><span>متوسط السؤال: <b>${fmtClock(r.avgTimeSeconds||0)}</b></span></div></header>
  <h2 style="font-size:14px">الأداء حسب العائلة</h2><table class="summary-table"><thead><tr><th>العائلة</th><th>الصحيح</th><th>النسبة</th><th>متوسط الزمن</th></tr></thead><tbody>${familyRows}</tbody></table>
  <h2 style="font-size:14px">الأداء حسب الصعوبة</h2><table class="summary-table"><thead><tr><th>الصعوبة</th><th>الصحيح</th><th>النسبة</th><th>متوسط الزمن</th></tr></thead><tbody>${difficultyRows}</tbody></table>
  ${questions}<div class="footer">تم إنشاء هذا التقرير محليًا بواسطة Numerical Question Generator Engine v${esc(ENGINE_VERSION)}.</div>
  <script type="application/json" id="report-logical-text">${JSON.stringify({
    schema: 'rc2-006-logical-text-layer-v1',
    engineVersion: ENGINE_VERSION,
    note: 'Logical-order Unicode. The printed PDF stores Arabic as presentation forms in visual order; this block is the same content in the order it is written and read.',
    text: buildReportTextLayer(s)
  }).replace(/</g,'\\u003c')}</script></body></html>`;
}
