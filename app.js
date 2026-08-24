import {
  initDB, uid, isoDate, parseDateOnly, addDays,
  getSettings, saveSettings, getDay, saveDay, resetDayFromTemplate, getDaysRange, getAllDays,
  getCheckin, saveCheckin, getMeasurements, saveMeasurement, deleteMeasurement,
  getGoals, saveGoal, deleteGoal, getPhases, savePhase,
  exportDatabase, importDatabase, reseed, updateFutureTemplateSessions
} from './db.js';

const $ = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => [...root.querySelectorAll(sel)];
const todayIso = isoDate(new Date());

const state = {
  page:'today',
  selectedDate:todayIso,
  weekStart:startOfWeek(todayIso),
  settings:null,
  sessionMode:'day',
  templateEdit:null,
  workingTemplate:null,
  installPrompt:null,
  toastTimer:null
};

function startOfWeek(dateValue){
  const d=parseDateOnly(dateValue);
  const dow=d.getDay();
  const offset=dow===0?-6:1-dow;
  d.setDate(d.getDate()+offset);
  return isoDate(d);
}

function formatDate(dateValue, options={weekday:'long',month:'long',day:'numeric'}){
  return new Intl.DateTimeFormat('en-US',options).format(parseDateOnly(dateValue));
}

function formatShortDate(dateValue){
  return new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric'}).format(parseDateOnly(dateValue));
}

function formatRange(start,end){
  const s=parseDateOnly(start), e=parseDateOnly(end);
  const sf=new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric'}).format(s);
  const ef=new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric'}).format(e);
  return `${sf} – ${ef}`;
}

function escapeHtml(value=''){
  return String(value).replace(/[&<>'"]/g,ch=>({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' }[ch]));
}

function lines(value=''){
  return String(value).split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
}

function showToast(message){
  const toast=$('#toast');
  toast.textContent=message;
  toast.classList.add('show');
  clearTimeout(state.toastTimer);
  state.toastTimer=setTimeout(()=>toast.classList.remove('show'),2600);
}

function showDialog(dialog){
  if (!dialog.open) dialog.showModal();
}
function closeDialog(dialog){
  if (dialog.open) dialog.close();
}

function typeLabel(type){
  const labels={group:'Group',run:'Run',bike:'Bike',strength:'Strength',flexibility:'Flexibility',swim:'Swim',skill:'Skill',recovery:'Recovery',other:'Other'};
  return labels[type]||'Workout';
}

function durationLabel(minutes){ return minutes?`${minutes} min`:''; }

function plannedMeta(session){
  const items=[];
  if(session.planned?.durationMin) items.push(durationLabel(session.planned.durationMin));
  if(session.planned?.distance) items.push(`${session.planned.distance} ${state.settings?.distanceUnit||'mi'}`);
  if(session.planned?.hrTarget) items.push(session.planned.hrTarget);
  return items;
}

function actualSummary(session){
  const a=session.actual||{};
  const parts=[];
  if(a.distance) parts.push(`${a.distance} ${state.settings?.distanceUnit||'mi'}`);
  if(a.durationMin) parts.push(`${a.durationMin} min`);
  if(a.avgHr) parts.push(`${a.avgHr} avg HR`);
  if(a.rpe) parts.push(`RPE ${a.rpe}`);
  if(a.results) parts.push(a.results);
  return parts.join(' · ');
}

function setPage(page){
  state.page=page;
  $$('.page').forEach(p=>p.classList.toggle('active',p.id===`page-${page}`));
  $$('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.page===page));
  window.scrollTo({top:0,behavior:'smooth'});
  renderCurrentPage();
}

async function renderCurrentPage(){
  if(state.page==='today') await renderToday();
  if(state.page==='week') await renderWeek();
  if(state.page==='progress') await renderProgress();
  if(state.page==='goals') await renderGoals();
  if(state.page==='data') await renderData();
}

function sessionCardHtml(session){
  const instructionItems=(session.instructions||[]).map((text,i)=>`<li><span class="step-no">${i+1}</span><span>${escapeHtml(text)}</span></li>`).join('');
  const meta=plannedMeta(session).map(v=>`<span class="meta-pill">${escapeHtml(v)}</span>`).join('');
  const actual=actualSummary(session);
  const expanded=state.settings?.autoExpand?' expanded':'';
  const statusClass=session.status==='complete'?' completed':session.status==='skipped'?' skipped':'';
  return `
    <article class="session-card${expanded}${statusClass}" data-session-id="${escapeHtml(session.id)}">
      <div class="session-head">
        <input class="session-check" type="checkbox" aria-label="Mark ${escapeHtml(session.title)} complete" ${session.status==='complete'?'checked':''}>
        <button class="session-main-btn" type="button" aria-expanded="${state.settings?.autoExpand?'true':'false'}">
          <span class="session-title">${escapeHtml(session.title)} <span class="type-pill">${typeLabel(session.type)}</span></span>
          <span class="session-summary">${escapeHtml(session.summary||'Tap for workout details')}</span>
          ${actual?`<span class="session-summary">Logged: ${escapeHtml(actual)}</span>`:''}
        </button>
        <div class="session-actions">
          <button class="mini-icon edit-session-btn" type="button" aria-label="Edit workout">✎</button>
          <button class="mini-icon expand-session-btn chevron" type="button" aria-label="Expand workout">⌄</button>
        </div>
      </div>
      <div class="session-details">
        ${meta?`<div class="session-meta">${meta}</div>`:''}
        ${instructionItems?`<ol class="instruction-list">${instructionItems}</ol>`:'<p class="muted">No detailed instructions yet.</p>'}
        <div class="completion-rule"><strong>Complete when:</strong> ${escapeHtml(session.completionRule||'The planned workout is finished.')}</div>
        <div class="session-detail-actions">
          <button class="secondary log-btn" type="button">Log actual</button>
          <button class="secondary skip-session-btn" type="button">${session.status==='skipped'?'Unskip':'Skip'}</button>
          <button class="secondary edit-session-btn" type="button">Edit plan</button>
        </div>
      </div>
    </article>`;
}

async function renderToday(){
  const day=await getDay(state.selectedDate,true);
  $('#todayDate').textContent=state.selectedDate===todayIso?'Today':formatDate(state.selectedDate,{weekday:'long',month:'short',day:'numeric'});
  $('#todayTitle').textContent=formatDate(state.selectedDate,{weekday:'long',month:'long',day:'numeric'});
  const sessions=[...(day.sessions||[])].sort((a,b)=>(a.order||0)-(b.order||0));
  $('#todaySessions').innerHTML=sessions.length?sessions.map(sessionCardHtml).join(''):'<section class="card"><p class="muted">No workouts planned for this day.</p></section>';
  const complete=sessions.filter(s=>s.status==='complete').length;
  const pct=sessions.length?Math.round(complete/sessions.length*100):0;
  $('#completionPct').textContent=`${pct}%`;
  $('#completionBar').style.width=`${pct}%`;

  const checkin=await getCheckin(state.selectedDate);
  $('#energyInput').value=checkin?.energy??'';
  $('#sorenessInput').value=checkin?.soreness??'';
  $('#sleepInput').value=checkin?.sleep??'';
  $('#rpeInput').value=checkin?.rpe??'';
  $('#checkinNotes').value=checkin?.notes??'';
  $('#checkinSaved').textContent=checkin?'Saved':'Not saved';
  $('#checkinSaved').classList.toggle('saved',!!checkin);
}

function findSession(day,id){ return (day.sessions||[]).find(s=>s.id===id); }

async function toggleSessionComplete(sessionId,checked){
  const day=await getDay(state.selectedDate,true);
  const session=findSession(day,sessionId);
  if(!session)return;
  session.status=checked?'complete':'planned';
  session.updatedAt=new Date().toISOString();
  await saveDay(day);
  await renderToday();
}

async function toggleSessionSkip(sessionId){
  const day=await getDay(state.selectedDate,true);
  const session=findSession(day,sessionId);
  if(!session)return;
  session.status=session.status==='skipped'?'planned':'skipped';
  session.updatedAt=new Date().toISOString();
  await saveDay(day);
  await renderToday();
}

function defaultNewSession(type='other'){
  const defs={
    group:{title:'Group Workout',summary:'Warm-up / daily accountability check-in',duration:10,instructions:['Complete the shared daily group workout.'],completion:'Finish the group workout and check in.'},
    run:{title:'Run',summary:'Easy aerobic run',duration:20,instructions:['Warm up easy.','Complete the planned running work at the prescribed effort.','Cool down under control.'],completion:'Finish the planned run.'},
    bike:{title:'Spin Bike',summary:'Indoor cycling session',duration:30,instructions:['Warm up easy.','Complete the planned work with smooth cadence.','Cool down easy.'],completion:'Finish the planned ride.'},
    strength:{title:'Strength',summary:'Strength session',duration:30,instructions:['Complete each exercise with controlled form.','Stop sets before technique breaks down.'],completion:'Complete all prescribed sets with good form.'},
    flexibility:{title:'Flexibility',summary:'Mobility and flexibility work',duration:15,instructions:['Stretch to strong tension, never sharp pain.','Breathe normally and avoid bouncing.'],completion:'Complete the planned mobility sequence.'},
    swim:{title:'Swim / Dryland Swim',summary:'Swim-specific training',duration:20,instructions:['Use available pool/open water when practical.','Use the listed dryland alternative when swimming is unavailable.'],completion:'Complete the planned swim or dryland alternative.'},
    skill:{title:'Skill Practice',summary:'Low-fatigue quality practice',duration:15,instructions:['Keep attempts high quality.','Rest enough to avoid practicing poor form.'],completion:'Finish the planned quality attempts.'},
    recovery:{title:'Recovery',summary:'Easy restorative movement',duration:25,instructions:['Keep effort very easy.','Finish feeling better than you started.'],completion:'Complete an easy restorative session.'},
    other:{title:'Workout',summary:'Custom training session',duration:20,instructions:[],completion:'Complete the planned workout.'}
  };
  return defs[type]||defs.other;
}

async function openDaySessionEditor(sessionId=null,date=state.selectedDate){
  state.sessionMode='day';
  state.templateEdit=null;
  const day=await getDay(date,true);
  let session=sessionId?findSession(day,sessionId):null;
  if(!session){
    const d=defaultNewSession('other');
    session={id:'',templateId:uid('custom-template'),type:'other',title:d.title,summary:d.summary,planned:{durationMin:d.duration,distance:null,hrTarget:''},instructions:d.instructions,completionRule:d.completion};
  }
  fillSessionForm(session,date);
  $('#sessionScopeInput').closest('label').classList.toggle('hidden',!sessionId);
  $('#sessionMoveDateInput').closest('label').classList.remove('hidden');
  $('#deleteSessionBtn').classList.toggle('hidden',!sessionId);
  $('#sessionDialogTitle').textContent=sessionId?'Edit workout':'Add workout';
  showDialog($('#sessionDialog'));
}

function fillSessionForm(session,date){
  $('#sessionIdInput').value=session.id||'';
  $('#sessionDateInput').value=date;
  $('#sessionTitleInput').value=session.title||'';
  $('#sessionTypeInput').value=session.type||'other';
  $('#sessionDurationInput').value=session.planned?.durationMin??'';
  $('#sessionDistanceInput').value=session.planned?.distance??'';
  $('#sessionSummaryInput').value=session.summary||'';
  $('#sessionInstructionsInput').value=(session.instructions||[]).join('\n');
  $('#sessionMoveDateInput').value=date;
  $('#sessionScopeInput').value='day';
}

function updateSessionFormDefaults(){
  if($('#sessionIdInput').value)return;
  const d=defaultNewSession($('#sessionTypeInput').value);
  $('#sessionTitleInput').value=d.title;
  $('#sessionSummaryInput').value=d.summary;
  $('#sessionDurationInput').value=d.duration;
  $('#sessionInstructionsInput').value=d.instructions.join('\n');
}

async function saveSessionForm(){
  const id=$('#sessionIdInput').value;
  const sourceDate=$('#sessionDateInput').value;
  const type=$('#sessionTypeInput').value;
  const patch={
    type,
    title:$('#sessionTitleInput').value.trim(),
    summary:$('#sessionSummaryInput').value.trim(),
    planned:{
      durationMin:numberOrNull($('#sessionDurationInput').value),
      distance:numberOrNull($('#sessionDistanceInput').value),
      hrTarget:''
    },
    instructions:lines($('#sessionInstructionsInput').value),
    completionRule:''
  };
  if(!patch.title) throw new Error('Workout title is required.');

  if(state.sessionMode==='template'){
    const {dayKey,index}=state.templateEdit;
    const existing=index>=0?state.workingTemplate[dayKey][index]:null;
    const d=defaultNewSession(type);
    const item={
      templateId:existing?.templateId||uid('template'),
      ...patch,
      planned:{...patch.planned,hrTarget:existing?.planned?.hrTarget||''},
      completionRule:existing?.completionRule||d.completion
    };
    if(index>=0) state.workingTemplate[dayKey][index]=item; else state.workingTemplate[dayKey].push(item);
    closeDialog($('#sessionDialog'));
    renderTemplateEditor();
    showDialog($('#templateDialog'));
    return;
  }

  const day=await getDay(sourceDate,true);
  let session=id?findSession(day,id):null;
  if(session){
    session.type=patch.type; session.title=patch.title; session.summary=patch.summary;
    session.planned={...session.planned,...patch.planned};
    session.instructions=patch.instructions;
    session.updatedAt=new Date().toISOString();
  }else{
    const d=defaultNewSession(type);
    session={
      id:uid('session'),templateId:uid('custom-template'),type:patch.type,title:patch.title,summary:patch.summary,
      planned:{...patch.planned,hrTarget:''},instructions:patch.instructions,completionRule:d.completion,actual:{},status:'planned',
      order:(day.sessions||[]).length,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()
    };
    day.sessions.push(session);
  }

  const targetDate=$('#sessionMoveDateInput').value||sourceDate;
  if(targetDate!==sourceDate){
    day.sessions=day.sessions.filter(s=>s.id!==session.id);
    await saveDay(day);
    const target=await getDay(targetDate,true);
    session.order=target.sessions.length;
    target.sessions.push(session);
    await saveDay(target);
  }else{
    await saveDay(day);
  }

  if(id && $('#sessionScopeInput').value==='future'){
    await applyPatchToTemplate(session.templateId,session);
    await updateFutureTemplateSessions(session.templateId,{
      type:session.type,title:session.title,summary:session.summary,planned:session.planned,instructions:session.instructions,completionRule:session.completionRule
    },sourceDate);
  }
  closeDialog($('#sessionDialog'));
  state.selectedDate=targetDate;
  state.weekStart=startOfWeek(targetDate);
  showToast('Workout plan saved.');
  await renderToday();
}

async function applyPatchToTemplate(templateId,session){
  const settings=await getSettings();
  let found=false;
  for(const key of Object.keys(settings.weeklyTemplate||{})){
    const idx=(settings.weeklyTemplate[key]||[]).findIndex(s=>s.templateId===templateId);
    if(idx>=0){
      settings.weeklyTemplate[key][idx]={
        ...settings.weeklyTemplate[key][idx],type:session.type,title:session.title,summary:session.summary,
        planned:structuredClone(session.planned),instructions:structuredClone(session.instructions),completionRule:session.completionRule
      };
      found=true;
    }
  }
  if(found){ await saveSettings(settings); state.settings=settings; }
}

async function deleteCurrentSession(){
  if(state.sessionMode==='template'){
    const {dayKey,index}=state.templateEdit;
    if(index>=0) state.workingTemplate[dayKey].splice(index,1);
    closeDialog($('#sessionDialog'));
    renderTemplateEditor(); showDialog($('#templateDialog'));
    return;
  }
  const id=$('#sessionIdInput').value;
  if(!id)return;
  if(!confirm('Delete this workout from the day?'))return;
  const date=$('#sessionDateInput').value;
  const day=await getDay(date,true);
  day.sessions=day.sessions.filter(s=>s.id!==id).map((s,i)=>({...s,order:i}));
  await saveDay(day);
  closeDialog($('#sessionDialog'));
  showToast('Workout deleted.');
  await renderToday();
}

function numberOrNull(value){
  if(value===''||value==null)return null;
  const n=Number(value); return Number.isFinite(n)?n:null;
}

async function openLogEditor(sessionId,date=state.selectedDate){
  const day=await getDay(date,true);
  const session=findSession(day,sessionId);
  if(!session)return;
  $('#logSessionIdInput').value=session.id;
  $('#logSessionDateInput').value=date;
  $('#logDialogTitle').textContent=`Log ${session.title}`;
  $('#logNotesInput').value=session.actual?.notes||'';
  $('#logDynamicFields').innerHTML=logFieldsHtml(session);
  showDialog($('#logDialog'));
}

function field(label,id,type='number',value='',attrs=''){
  return `<label><span>${escapeHtml(label)}</span><input id="${id}" type="${type}" value="${escapeHtml(value??'')}" ${attrs}></label>`;
}

function logFieldsHtml(session){
  const a=session.actual||{};
  let html='';
  if(session.type!=='group') html+=field('Actual duration (min)','actualDuration','number',a.durationMin,'min="0" max="900" step="1"');
  if(['run','swim'].includes(session.type)) html+=field(`Actual distance (${state.settings.distanceUnit})`,'actualDistance','number',a.distance,'min="0" max="500" step="0.01"');
  if(['run','bike','swim'].includes(session.type)) html+=field('Average heart rate','actualHr','number',a.avgHr,'min="30" max="240" step="1"');
  if(session.type==='flexibility') html+=field('Front split gap (in, optional)','actualSplitGap','number',a.splitGap,'min="0" max="40" step="0.25"');
  if(session.type==='skill') html+=field('Best hold (sec, optional)','actualBestHold','number',a.bestHold,'min="0" max="600" step="0.1"');
  if(session.type==='strength') html+=field('Results (ex: 8/7/6)','actualResults','text',a.results,'maxlength="160"');
  html+=field('Session RPE (1–10)','actualRpe','number',a.rpe,'min="1" max="10" step="1"');
  return html;
}

async function saveLogForm(){
  const date=$('#logSessionDateInput').value;
  const id=$('#logSessionIdInput').value;
  const day=await getDay(date,true);
  const session=findSession(day,id);
  if(!session)throw new Error('Workout not found.');
  session.actual={
    durationMin:numberOrNull($('#actualDuration')?.value),
    distance:numberOrNull($('#actualDistance')?.value),
    avgHr:numberOrNull($('#actualHr')?.value),
    splitGap:numberOrNull($('#actualSplitGap')?.value),
    bestHold:numberOrNull($('#actualBestHold')?.value),
    results:$('#actualResults')?.value?.trim()||'',
    rpe:numberOrNull($('#actualRpe')?.value),
    notes:$('#logNotesInput').value.trim(),
    loggedAt:new Date().toISOString()
  };
  session.status='complete';
  session.updatedAt=new Date().toISOString();
  await saveDay(day);
  closeDialog($('#logDialog'));
  showToast('Workout logged and marked complete.');
  await renderToday();
}

async function renderWeek(){
  const start=state.weekStart, end=addDays(start,6);
  $('#weekRange').textContent=formatRange(start,end);
  const days=await getDaysRange(start,end,true);
  let run=0,bike=0,strength=0,flex=0;
  for(const day of days){
    for(const s of day.sessions||[]){
      if(s.type==='run')run+=Number(s.planned?.distance||0);
      if(s.type==='bike')bike+=Number(s.planned?.durationMin||0);
      if(s.type==='strength')strength++;
      if(s.type==='flexibility')flex++;
    }
  }
  $('#weekRunTotal').textContent=`${round1(run)} ${state.settings.distanceUnit}`;
  $('#weekBikeTotal').textContent=`${Math.round(bike)} min`;
  $('#weekStrengthTotal').textContent=String(strength);
  $('#weekFlexTotal').textContent=String(flex);
  $('#weekGrid').innerHTML=days.map(day=>{
    const complete=day.sessions.filter(s=>s.status==='complete').length;
    const items=day.sessions.map(s=>`<div class="week-session ${s.status==='complete'?'done':''}"><b>${escapeHtml(s.title)}</b><span>${escapeHtml(s.summary||typeLabel(s.type))}</span></div>`).join('');
    return `<article class="day-card ${day.date===todayIso?'today':''}" data-date="${day.date}"><div class="day-card-head"><button class="open-day-btn" type="button"><span class="day-name">${formatDate(day.date,{weekday:'short'})}</span><span class="day-date">${formatShortDate(day.date)}</span></button><span class="day-completion">${complete}/${day.sessions.length}</span></div><div class="day-sessions">${items||'<div class="week-session"><span>Rest day</span></div>'}</div></article>`;
  }).join('');
}

function round1(n){return Math.round(n*10)/10}

async function resetCurrentWeek(){
  if(!confirm('Reset this entire week from the weekly template? Completed logs and day-specific edits in this week will be replaced.'))return;
  let d=state.weekStart;
  for(let i=0;i<7;i++){ await resetDayFromTemplate(d); d=addDays(d,1); }
  showToast('Week reset from template.');
  await renderWeek();
}

async function openTemplateEditor(){
  state.settings=await getSettings();
  state.workingTemplate=structuredClone(state.settings.weeklyTemplate||{});
  renderTemplateEditor();
  showDialog($('#templateDialog'));
}

function renderTemplateEditor(){
  const dayKeys=[1,2,3,4,5,6,0];
  const names={0:'Sunday',1:'Monday',2:'Tuesday',3:'Wednesday',4:'Thursday',5:'Friday',6:'Saturday'};
  $('#templateEditor').innerHTML=dayKeys.map(key=>{
    const rows=(state.workingTemplate[key]||[]).map((s,i)=>`<div class="template-row"><span><strong>${escapeHtml(s.title)}</strong><small>${escapeHtml(s.summary||typeLabel(s.type))}</small></span><button type="button" class="template-edit-btn" data-day="${key}" data-index="${i}" aria-label="Edit ${escapeHtml(s.title)}">✎</button><button type="button" class="template-remove-btn" data-day="${key}" data-index="${i}" aria-label="Remove ${escapeHtml(s.title)}">×</button></div>`).join('');
    return `<section class="template-day"><div class="template-day-head"><h3>${names[key]}</h3><button type="button" class="secondary template-add-btn" data-day="${key}">+ Add</button></div><div class="template-sessions">${rows||'<p class="muted">No planned workouts.</p>'}</div></section>`;
  }).join('');
}

function openTemplateSession(dayKey,index=-1){
  state.sessionMode='template';
  state.templateEdit={dayKey:String(dayKey),index:Number(index)};
  let item=index>=0?state.workingTemplate[dayKey][index]:null;
  if(!item){
    const d=defaultNewSession('other');
    item={id:'',templateId:'',type:'other',title:d.title,summary:d.summary,planned:{durationMin:d.duration,distance:null,hrTarget:''},instructions:d.instructions,completionRule:d.completion};
  }
  closeDialog($('#templateDialog'));
  fillSessionForm(item,'');
  $('#sessionMoveDateInput').closest('label').classList.add('hidden');
  $('#sessionScopeInput').closest('label').classList.add('hidden');
  $('#deleteSessionBtn').classList.toggle('hidden',index<0);
  $('#sessionDialogTitle').textContent=index>=0?'Edit template workout':'Add template workout';
  showDialog($('#sessionDialog'));
}

async function saveTemplate(){
  state.settings.weeklyTemplate=structuredClone(state.workingTemplate);
  await saveSettings(state.settings);
  closeDialog($('#templateDialog'));
  showToast('Weekly template saved for future days.');
  await renderWeek();
}

function completedValue(session,field,fallback=0){
  if(session.status!=='complete')return 0;
  const actual=session.actual?.[field];
  if(actual!==null && actual!==undefined && actual!=='') return Number(actual)||0;
  return Number(session.planned?.[field]||fallback)||0;
}

async function renderProgress(){
  const days=(await getAllDays()).sort((a,b)=>a.date.localeCompare(b.date));
  const measurements=await getMeasurements();
  const start7=addDays(todayIso,-6), start30=addDays(todayIso,-29);
  const days7=days.filter(d=>d.date>=start7&&d.date<=todayIso);
  const days30=days.filter(d=>d.date>=start30&&d.date<=todayIso);
  const sessions7=days7.flatMap(d=>d.sessions||[]);
  const sessions30=days30.flatMap(d=>d.sessions||[]);
  const planned30=sessions30.filter(s=>s.status!=='skipped').length;
  const complete30=sessions30.filter(s=>s.status==='complete').length;
  const compliance=planned30?Math.round(complete30/planned30*100):0;
  const run7=sessions7.filter(s=>s.type==='run').reduce((sum,s)=>sum+completedValue(s,'distance'),0);
  const bike7=sessions7.filter(s=>s.type==='bike').reduce((sum,s)=>sum+completedValue(s,'durationMin'),0);
  const strength7=sessions7.filter(s=>s.type==='strength'&&s.status==='complete').length;
  const flex7=sessions7.filter(s=>s.type==='flexibility'&&s.status==='complete').length;
  const latest=measurements.at(-1)||{};
  const metrics=[
    ['30-day completion',`${compliance}%`,`${complete30} of ${planned30} planned sessions`],
    ['Run · 7 days',`${round1(run7)} ${state.settings.distanceUnit}`,'Completed distance'],
    ['Bike · 7 days',`${Math.round(bike7)} min`,'Completed time'],
    ['Strength · 7 days',String(strength7),'Completed sessions'],
    ['Flexibility · 7 days',String(flex7),'Completed sessions'],
    ['Weight',latest.weight?`${latest.weight} ${state.settings.weightUnit}`:'—',latest.date?`Last entry ${formatShortDate(latest.date)}`:'Add a measurement']
  ];
  $('#progressMetrics').innerHTML=metrics.map(([label,value,sub])=>`<div class="metric-card"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong><small>${escapeHtml(sub)}</small></div>`).join('');
  renderVolumeChart(days);
  renderBodyTrend(measurements);
  renderMeasurementHistory(measurements);
}

function renderVolumeChart(days){
  const currentStart=startOfWeek(todayIso);
  const weeks=[];
  for(let i=7;i>=0;i--){
    const start=addDays(currentStart,-7*i), end=addDays(start,6);
    const sessions=days.filter(d=>d.date>=start&&d.date<=end).flatMap(d=>d.sessions||[]);
    const run=sessions.filter(s=>s.type==='run').reduce((sum,s)=>sum+completedValue(s,'distance'),0);
    const bike=sessions.filter(s=>s.type==='bike').reduce((sum,s)=>sum+completedValue(s,'durationMin'),0);
    weeks.push({start,run,bike});
  }
  const maxRun=Math.max(1,...weeks.map(w=>w.run));
  const maxBike=Math.max(1,...weeks.map(w=>w.bike));
  $('#volumeChart').innerHTML=`<div class="chart-legend" style="grid-column:1/-1"><span><i class="legend-dot"></i>Run distance</span><span><i class="legend-dot bike"></i>Bike minutes</span></div>`+weeks.map(w=>{
    const rh=Math.max(2,Math.round(w.run/maxRun*120));
    const bh=Math.max(2,Math.round(w.bike/maxBike*120));
    return `<div class="bar-week"><div class="bar-stack"><div class="bar-seg" style="height:${rh}px" title="${round1(w.run)} run"></div><div class="bar-seg bike" style="height:${bh}px" title="${Math.round(w.bike)} bike min"></div></div><small>${formatShortDate(w.start)}</small></div>`;
  }).join('');
}

function renderBodyTrend(measurements){
  const rows=measurements.slice(-8).reverse();
  $('#bodyTrend').innerHTML=rows.length?rows.map(m=>`<div class="trend-row"><span>${formatShortDate(m.date)}</span><strong>${m.weight?`${m.weight} ${state.settings.weightUnit}`:'No weight'}</strong><span>${m.waist?`${m.waist} in waist`:''}</span></div>`).join(''):'<p class="muted">No measurements recorded yet.</p>';
}

function renderMeasurementHistory(measurements){
  const rows=measurements.slice().reverse();
  $('#measurementHistory').innerHTML=rows.length?rows.map(m=>{
    const vals=[];
    if(m.weight)vals.push(`${m.weight} ${state.settings.weightUnit}`);
    if(m.waist)vals.push(`${m.waist} in waist`);
    if(m.pullups!=null)vals.push(`${m.pullups} pull-ups`);
    if(m.run3mi)vals.push(`3 mi ${m.run3mi}`);
    if(m.splitGap!=null)vals.push(`${m.splitGap} in split gap`);
    return `<div class="history-row" data-measurement-id="${m.id}"><span>${formatShortDate(m.date)}</span><strong>${escapeHtml(m.notes||'Measurement')}</strong><div class="history-values">${vals.map(v=>`<em>${escapeHtml(v)}</em>`).join('')}<button class="text-btn delete-measurement-btn" type="button">Delete</button></div></div>`;
  }).join(''):'<p class="muted">No measurements recorded yet.</p>';
}

function openMeasurementDialog(){
  $('#measurementForm').reset();
  $('#measurementDateInput').value=todayIso;
  showDialog($('#measurementDialog'));
}

async function saveMeasurementForm(){
  const run3=$('#measurementRunTimeInput').value.trim();
  if(run3 && !/^\d{1,2}:\d{2}$/.test(run3))throw new Error('3-mile time should look like 24:00.');
  await saveMeasurement({
    date:$('#measurementDateInput').value,
    weight:numberOrNull($('#measurementWeightInput').value),
    waist:numberOrNull($('#measurementWaistInput').value),
    pullups:numberOrNull($('#measurementPullupsInput').value),
    run3mi:run3,
    splitGap:numberOrNull($('#measurementSplitGapInput').value),
    notes:$('#measurementNotesInput').value.trim()
  });
  closeDialog($('#measurementDialog'));
  showToast('Measurement saved.');
  await renderProgress();
}

async function renderGoals(){
  const [goals,phases]=await Promise.all([getGoals(),getPhases()]);
  const phase=phases.find(p=>todayIso>=p.startDate&&todayIso<=p.endDate)||phases[0];
  if(phase){
    $('#currentPhaseName').textContent=phase.name;
    $('#currentPhaseDates').textContent=`${formatShortDate(phase.startDate)} – ${formatShortDate(phase.endDate)}`;
    $('#currentPhaseFocus').innerHTML=(phase.focus||[]).map(f=>`<span class="focus-pill">${escapeHtml(f)}</span>`).join('');
    $('#editPhaseBtn').dataset.phaseId=phase.id;
    $('#heroPhaseText').textContent=phase.name;
  }
  $('#goalList').innerHTML=goals.map(g=>`<article class="goal-card" data-goal-id="${g.id}"><div class="goal-top"><div><span class="type-pill">${escapeHtml(g.category)}</span><h3>${escapeHtml(g.title)}</h3></div><button class="text-btn edit-goal-btn" type="button">Edit</button></div><div class="goal-target">${escapeHtml(g.target||'')}</div>${g.notes?`<p>${escapeHtml(g.notes)}</p>`:''}${g.targetDate?`<p>Target: ${formatDate(g.targetDate,{month:'short',day:'numeric',year:'numeric'})}</p>`:''}</article>`).join('');
  $('#phaseTimeline').innerHTML=phases.map(p=>`<div class="timeline-item"><span class="timeline-dot"></span><div class="timeline-copy"><strong>${escapeHtml(p.name)}</strong><span>${formatShortDate(p.startDate)} – ${formatShortDate(p.endDate)} · ${(p.focus||[]).map(escapeHtml).join(' · ')}</span></div></div>`).join('');
}

async function openGoalEditor(id=null){
  const goals=await getGoals();
  const goal=id?goals.find(g=>g.id===id):null;
  $('#goalForm').reset();
  $('#goalIdInput').value=goal?.id||'';
  $('#goalTitleInput').value=goal?.title||'';
  $('#goalCategoryInput').value=goal?.category||'Other';
  $('#goalTargetInput').value=goal?.target||'';
  $('#goalDateInput').value=goal?.targetDate||'';
  $('#goalNotesInput').value=goal?.notes||'';
  $('#goalDialogTitle').textContent=goal?'Edit goal':'Add goal';
  $('#deleteGoalBtn').classList.toggle('hidden',!goal);
  showDialog($('#goalDialog'));
}

async function saveGoalForm(){
  const id=$('#goalIdInput').value;
  await saveGoal({id:id||undefined,title:$('#goalTitleInput').value.trim(),category:$('#goalCategoryInput').value,target:$('#goalTargetInput').value.trim(),targetDate:$('#goalDateInput').value,notes:$('#goalNotesInput').value.trim(),order:id?(await getGoals()).find(g=>g.id===id)?.order:Date.now()});
  closeDialog($('#goalDialog'));
  showToast('Goal saved.');
  await renderGoals();
}

async function deleteCurrentGoal(){
  const id=$('#goalIdInput').value;if(!id)return;
  if(!confirm('Delete this goal?'))return;
  await deleteGoal(id); closeDialog($('#goalDialog')); showToast('Goal deleted.'); await renderGoals();
}

async function openPhaseEditor(id){
  const phases=await getPhases();
  const phase=phases.find(p=>p.id===id); if(!phase)return;
  $('#phaseIdInput').value=phase.id;
  $('#phaseNameInput').value=phase.name;
  $('#phaseStartInput').value=phase.startDate;
  $('#phaseEndInput').value=phase.endDate;
  $('#phaseFocusInput').value=(phase.focus||[]).join(', ');
  $('#phaseNotesInput').value=phase.notes||'';
  showDialog($('#phaseDialog'));
}

async function savePhaseForm(){
  const id=$('#phaseIdInput').value;
  const phases=await getPhases();
  const existing=phases.find(p=>p.id===id);
  await savePhase({id,name:$('#phaseNameInput').value.trim(),startDate:$('#phaseStartInput').value,endDate:$('#phaseEndInput').value,focus:$('#phaseFocusInput').value.split(',').map(s=>s.trim()).filter(Boolean),notes:$('#phaseNotesInput').value.trim(),order:existing?.order||1});
  closeDialog($('#phaseDialog')); showToast('Training phase saved.'); await renderGoals();
}

async function renderData(){
  state.settings=await getSettings();
  $('#weightUnitInput').value=state.settings.weightUnit||'lb';
  $('#distanceUnitInput').value=state.settings.distanceUnit||'mi';
  $('#autoExpandInput').checked=!!state.settings.autoExpand;
}

async function saveAppSettings(){
  state.settings.weightUnit=$('#weightUnitInput').value;
  state.settings.distanceUnit=$('#distanceUnitInput').value;
  state.settings.autoExpand=$('#autoExpandInput').checked;
  await saveSettings(state.settings);
  showToast('Settings saved.');
}

function downloadBlob(filename,content,type='application/json'){
  const blob=new Blob([content],{type});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}

async function exportJson(){
  const data=await exportDatabase();
  downloadBlob(`training-plan-backup-${todayIso}.json`,JSON.stringify(data,null,2));
  $('#backupStatus').textContent='JSON backup exported.';
}

async function exportCsv(){
  const days=(await getAllDays()).sort((a,b)=>a.date.localeCompare(b.date));
  const rows=[['Date','Workout','Type','Status','Planned Duration Min','Planned Distance','Actual Duration Min','Actual Distance','Average HR','RPE','Actual Results','Notes']];
  for(const day of days){
    for(const s of day.sessions||[]){
      rows.push([day.date,s.title,s.type,s.status,s.planned?.durationMin??'',s.planned?.distance??'',s.actual?.durationMin??'',s.actual?.distance??'',s.actual?.avgHr??'',s.actual?.rpe??'',s.actual?.results??'',s.actual?.notes??'']);
    }
  }
  const csv=rows.map(row=>row.map(csvCell).join(',')).join('\n');
  downloadBlob(`training-workouts-${todayIso}.csv`,csv,'text/csv;charset=utf-8');
  $('#backupStatus').textContent='Workout CSV exported.';
}

function csvCell(v){const s=String(v??'');return /[",\n]/.test(s)?`"${s.replace(/"/g,'""')}"`:s}

async function importJsonFile(file){
  const text=await file.text();
  const payload=JSON.parse(text);
  if(!confirm('Importing this backup will replace the current local database. Continue?'))return;
  await importDatabase(payload);
  state.settings=await getSettings();
  $('#backupStatus').textContent='Backup imported successfully.';
  showToast('Backup imported.');
  await renderCurrentPage();
}

async function clearAllData(){
  const phrase=prompt('This deletes all local training data. Type RESET to continue.');
  if(phrase!=='RESET')return;
  await reseed();
  state.settings=await getSettings();
  state.selectedDate=todayIso; state.weekStart=startOfWeek(todayIso);
  showToast('Local data reset to the starter plan.');
  setPage('today');
}

async function saveDailyCheckin(){
  const rpe=numberOrNull($('#rpeInput').value);
  if(rpe!=null&&(rpe<1||rpe>10))throw new Error('RPE must be between 1 and 10.');
  await saveCheckin({date:state.selectedDate,energy:numberOrNull($('#energyInput').value),soreness:numberOrNull($('#sorenessInput').value),sleep:numberOrNull($('#sleepInput').value),rpe,notes:$('#checkinNotes').value.trim()});
  $('#checkinSaved').textContent='Saved'; $('#checkinSaved').classList.add('saved'); showToast('Daily check-in saved.');
}

function bindEvents(){
  $$('.nav-btn').forEach(btn=>btn.addEventListener('click',()=>setPage(btn.dataset.page)));
  $$('[data-nav="today"]').forEach(el=>el.addEventListener('click',e=>{e.preventDefault();setPage('today')}));
  $('#settingsBtn').addEventListener('click',()=>setPage('data'));

  $('#prevDayBtn').addEventListener('click',async()=>{state.selectedDate=addDays(state.selectedDate,-1);state.weekStart=startOfWeek(state.selectedDate);await renderToday()});
  $('#nextDayBtn').addEventListener('click',async()=>{state.selectedDate=addDays(state.selectedDate,1);state.weekStart=startOfWeek(state.selectedDate);await renderToday()});
  $('#todayBtn').addEventListener('click',async()=>{state.selectedDate=todayIso;state.weekStart=startOfWeek(todayIso);await renderToday()});
  $('#addTodaySessionBtn').addEventListener('click',()=>openDaySessionEditor());
  $('#saveCheckinBtn').addEventListener('click',()=>saveDailyCheckin().catch(err=>showToast(err.message)));

  $('#todaySessions').addEventListener('click',async e=>{
    const card=e.target.closest('.session-card'); if(!card)return;
    const id=card.dataset.sessionId;
    if(e.target.closest('.edit-session-btn')){await openDaySessionEditor(id);return;}
    if(e.target.closest('.log-btn')){await openLogEditor(id);return;}
    if(e.target.closest('.skip-session-btn')){await toggleSessionSkip(id);return;}
    if(e.target.closest('.session-main-btn')||e.target.closest('.expand-session-btn')){
      card.classList.toggle('expanded');
      const btn=$('.session-main-btn',card); btn.setAttribute('aria-expanded',String(card.classList.contains('expanded')));
    }
  });
  $('#todaySessions').addEventListener('change',e=>{
    if(e.target.matches('.session-check')){
      const card=e.target.closest('.session-card'); toggleSessionComplete(card.dataset.sessionId,e.target.checked).catch(err=>showToast(err.message));
    }
  });

  $('#prevWeekBtn').addEventListener('click',async()=>{state.weekStart=addDays(state.weekStart,-7);await renderWeek()});
  $('#nextWeekBtn').addEventListener('click',async()=>{state.weekStart=addDays(state.weekStart,7);await renderWeek()});
  $('#thisWeekBtn').addEventListener('click',async()=>{state.weekStart=startOfWeek(todayIso);await renderWeek()});
  $('#weekGrid').addEventListener('click',e=>{
    const card=e.target.closest('.day-card'); if(!card)return;
    state.selectedDate=card.dataset.date; state.weekStart=startOfWeek(state.selectedDate); setPage('today');
  });
  $('#resetWeekBtn').addEventListener('click',()=>resetCurrentWeek().catch(err=>showToast(err.message)));
  $('#editTemplateBtn').addEventListener('click',()=>openTemplateEditor().catch(err=>showToast(err.message)));

  $('#templateEditor').addEventListener('click',e=>{
    const edit=e.target.closest('.template-edit-btn');
    const remove=e.target.closest('.template-remove-btn');
    const add=e.target.closest('.template-add-btn');
    if(edit){openTemplateSession(edit.dataset.day,Number(edit.dataset.index));return;}
    if(add){openTemplateSession(add.dataset.day,-1);return;}
    if(remove){state.workingTemplate[remove.dataset.day].splice(Number(remove.dataset.index),1);renderTemplateEditor();}
  });
  $('#templateForm').addEventListener('submit',e=>{e.preventDefault();saveTemplate().catch(err=>showToast(err.message))});

  $('#sessionTypeInput').addEventListener('change',updateSessionFormDefaults);
  $('#sessionForm').addEventListener('submit',e=>{e.preventDefault();saveSessionForm().catch(err=>showToast(err.message))});
  $('#deleteSessionBtn').addEventListener('click',()=>deleteCurrentSession().catch(err=>showToast(err.message)));
  $('#logForm').addEventListener('submit',e=>{e.preventDefault();saveLogForm().catch(err=>showToast(err.message))});

  $$('.modal-close').forEach(btn=>btn.addEventListener('click',()=>{
    const dialog=btn.closest('dialog');
    const returnToTemplate=dialog?.id==='sessionDialog' && state.sessionMode==='template' && !!state.workingTemplate;
    closeDialog(dialog);
    if(returnToTemplate){ renderTemplateEditor(); showDialog($('#templateDialog')); }
  }));

  $('#addMeasurementBtn').addEventListener('click',openMeasurementDialog);
  $('#measurementForm').addEventListener('submit',e=>{e.preventDefault();saveMeasurementForm().catch(err=>showToast(err.message))});
  $('#measurementHistory').addEventListener('click',async e=>{
    const btn=e.target.closest('.delete-measurement-btn'); if(!btn)return;
    const row=btn.closest('[data-measurement-id]');
    if(confirm('Delete this measurement?')){await deleteMeasurement(row.dataset.measurementId);await renderProgress();showToast('Measurement deleted.');}
  });

  $('#addGoalBtn').addEventListener('click',()=>openGoalEditor());
  $('#goalList').addEventListener('click',e=>{const btn=e.target.closest('.edit-goal-btn');if(btn)openGoalEditor(btn.closest('[data-goal-id]').dataset.goalId)});
  $('#goalForm').addEventListener('submit',e=>{e.preventDefault();saveGoalForm().catch(err=>showToast(err.message))});
  $('#deleteGoalBtn').addEventListener('click',()=>deleteCurrentGoal().catch(err=>showToast(err.message)));
  $('#editPhaseBtn').addEventListener('click',()=>openPhaseEditor($('#editPhaseBtn').dataset.phaseId));
  $('#phaseForm').addEventListener('submit',e=>{e.preventDefault();savePhaseForm().catch(err=>showToast(err.message))});

  $('#saveSettingsBtn').addEventListener('click',()=>saveAppSettings().catch(err=>showToast(err.message)));
  $('#exportJsonBtn').addEventListener('click',()=>exportJson().catch(err=>showToast(err.message)));
  $('#exportCsvBtn').addEventListener('click',()=>exportCsv().catch(err=>showToast(err.message)));
  $('#importJsonInput').addEventListener('change',e=>{const file=e.target.files?.[0];if(file)importJsonFile(file).catch(err=>showToast(err.message));e.target.value='';});
  $('#clearDataBtn').addEventListener('click',()=>clearAllData().catch(err=>showToast(err.message)));

  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();state.installPrompt=e;$('#installBtn').classList.remove('hidden')});
  $('#installBtn').addEventListener('click',async()=>{if(!state.installPrompt)return;state.installPrompt.prompt();await state.installPrompt.userChoice;state.installPrompt=null;$('#installBtn').classList.add('hidden')});
}

async function boot(){
  await initDB();
  state.settings=await getSettings();
  bindEvents();
  if('serviceWorker' in navigator){ navigator.serviceWorker.register('./sw.js').catch(()=>{}); }
  await renderGoals();
  await renderToday();
}

boot().catch(err=>{
  console.error(err);
  document.body.innerHTML=`<main class="app-shell"><section class="card"><h1>Training Plan</h1><p>Unable to start the local database.</p><pre>${escapeHtml(err.message)}</pre></section></main>`;
});
