import {
  PLAN_VERSION, FIXED_PHASES, defaultPhaseTemplates,
  resolvePlanContext, resolvedPhaseTimeline, applyProgression,
  PROGRAM_IRONMAN, PROGRAM_OTHER
} from './plan.js?v=5';

const DB_NAME = 'hart-training-db';
const DB_VERSION = 1;
const STORES = ['meta','settings','days','checkins','measurements','goals','phases'];

export function uid(prefix='id'){
  if (globalThis.crypto?.randomUUID) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function isoDate(date = new Date()){
  const y = date.getFullYear();
  const m = String(date.getMonth()+1).padStart(2,'0');
  const d = String(date.getDate()).padStart(2,'0');
  return `${y}-${m}-${d}`;
}

export function parseDateOnly(value){
  const [y,m,d] = String(value).split('-').map(Number);
  return new Date(y, (m||1)-1, d||1, 12, 0, 0, 0);
}

export function addDays(dateValue, amount){
  const d = typeof dateValue === 'string' ? parseDateOnly(dateValue) : new Date(dateValue);
  d.setDate(d.getDate()+amount);
  return isoDate(d);
}

function openRaw(){
  return new Promise((resolve,reject)=>{
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta',{keyPath:'id'});
      if (!db.objectStoreNames.contains('settings')) db.createObjectStore('settings',{keyPath:'id'});
      if (!db.objectStoreNames.contains('days')) db.createObjectStore('days',{keyPath:'date'});
      if (!db.objectStoreNames.contains('checkins')) db.createObjectStore('checkins',{keyPath:'date'});
      if (!db.objectStoreNames.contains('measurements')) {
        const s = db.createObjectStore('measurements',{keyPath:'id'});
        s.createIndex('date','date',{unique:false});
      }
      if (!db.objectStoreNames.contains('goals')) db.createObjectStore('goals',{keyPath:'id'});
      if (!db.objectStoreNames.contains('phases')) db.createObjectStore('phases',{keyPath:'id'});
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function request(req){
  return new Promise((resolve,reject)=>{
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });
}

async function get(store,key){
  const db=await openRaw();
  const tx=db.transaction(store,'readonly');
  const value=await request(tx.objectStore(store).get(key));
  db.close();
  return value;
}

async function getAll(store){
  const db=await openRaw();
  const tx=db.transaction(store,'readonly');
  const values=await request(tx.objectStore(store).getAll());
  db.close();
  return values;
}

async function put(store,value){
  const db=await openRaw();
  const tx=db.transaction(store,'readwrite');
  await request(tx.objectStore(store).put(value));
  await new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error)});
  db.close();
  return value;
}

async function remove(store,key){
  const db=await openRaw();
  const tx=db.transaction(store,'readwrite');
  await request(tx.objectStore(store).delete(key));
  await new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error)});
  db.close();
}

const DEFAULT_SETTINGS = {
  id:'app',
  planVersion:PLAN_VERSION,
  weightUnit:'lb',
  distanceUnit:'mi',
  autoExpand:false,
  planStartDate:'2026-08-26',
  phaseTemplates:defaultPhaseTemplates(),
  updatedAt:new Date().toISOString()
};

const DEFAULT_GOALS = [
  {id:'goal-703',title:'IRONMAN 70.3 Maine',category:'Endurance',target:'Complete in 2027',targetDate:'',role:'primary',notes:'Primary endurance goal. Formal triathlon training begins in January 2027; race-specific dates are generated from the race date when it is known.',order:1},
  {id:'goal-weight',title:'Lean athletic body composition',category:'Body Composition',target:'About 155 lb while retaining muscle',targetDate:'2026-12-12',role:'immediate',notes:'Build visible definition while preserving strength, energy, and aerobic base.',order:2},
  {id:'goal-pullups',title:'Pull-ups',category:'Strength',target:'20 clean reps',targetDate:'',role:'standard',notes:'Build progressively while keeping most training sets submaximal.',order:3},
  {id:'goal-run3',title:'3-mile run',category:'Running',target:'Sub-8:00/mile pace',targetDate:'',role:'standard',notes:'Equivalent to under 24:00 for 3 miles.',order:4},
  {id:'goal-split',title:'Improve flexibility',category:'Mobility',target:'Front split progression',targetDate:'2026-12-31',role:'standard',notes:'Daily mobility with measurable split-gap progress, plus hips, hamstrings, adductors, shoulders, and thoracic mobility.',order:5},
  {id:'goal-handstand',title:'Handstand',category:'Skill',target:'Longer controlled free-standing hold',targetDate:'',role:'standard',notes:'Short frequent quality practice.',order:6},
  {id:'goal-lsit',title:'L-sit',category:'Skill',target:'Longer clean hold',targetDate:'',role:'standard',notes:'Progress from current short holds with quality practice.',order:7},
  {id:'goal-ironman',title:'Full Ironman',category:'Endurance',target:'Complete by age 50',targetDate:'2029-09-13',role:'standard',notes:'Long-term progression after the 70.3 goal.',order:8}
];

function seededPhases(){
  return FIXED_PHASES.map((p,index)=>({...structuredClone(p),order:index+1}));
}

function hasRecordedWork(day){
  return !!day?.sessions?.some(s=>
    s.status==='complete' ||
    s.status==='skipped' ||
    (s.actual && Object.values(s.actual).some(v=>v!==null && v!==undefined && v!==''))
  );
}

async function ensureDefaultGoals(){
  const existing=await getAll('goals');
  const byId=new Map(existing.map(g=>[g.id,g]));
  for(const def of DEFAULT_GOALS){
    if(!byId.has(def.id)) await put('goals',structuredClone(def));
  }
  const goals=await getAll('goals');
  let primarySeen=false, immediateSeen=false;
  for(const g of goals){
    if(!g.role){
      g.role=g.id==='goal-703'?'primary':g.id==='goal-weight'?'immediate':'standard';
      await put('goals',g);
    }
    if(g.role==='primary') primarySeen=true;
    if(g.role==='immediate') immediateSeen=true;
  }
  if(!primarySeen){const g=await get('goals','goal-703');if(g){g.role='primary';await put('goals',g);}}
  if(!immediateSeen){const g=await get('goals','goal-weight');if(g){g.role='immediate';await put('goals',g);}}
}

async function migratePlanIfNeeded(){
  const saved=(await get('settings','app')) || structuredClone(DEFAULT_SETTINGS);
  const oldVersion=Number(saved.planVersion||0);
  if(oldVersion>=PLAN_VERSION && saved.phaseTemplates) return;

  saved.id='app';
  saved.planVersion=PLAN_VERSION;
  saved.planStartDate=saved.planStartDate || '2026-08-26';
  saved.weightUnit=saved.weightUnit || 'lb';
  saved.distanceUnit=saved.distanceUnit || 'mi';
  saved.autoExpand=!!saved.autoExpand;
  saved.phaseTemplates=defaultPhaseTemplates();
  if(saved.weeklyTemplate && !saved.legacyWeeklyTemplate) saved.legacyWeeklyTemplate=structuredClone(saved.weeklyTemplate);
  saved.updatedAt=new Date().toISOString();
  await put('settings',saved);

  const obsolete=['phase-2026-base','phase-2027-base','phase-2027-build','phase-2027-race'];
  for(const id of obsolete) await remove('phases',id);
  for(const p of seededPhases()) await put('phases',p);
  await ensureDefaultGoals();

  const days=await getAll('days');
  for(const day of days){
    if(day.date>=saved.planStartDate && !hasRecordedWork(day)) await remove('days',day.date);
  }
  await put('meta',{id:'plan-version',value:PLAN_VERSION,migratedAt:new Date().toISOString()});
}

export async function initDB(){
  const db=await openRaw(); db.close();
  const seeded=await get('meta','seeded');
  if(!seeded){
    await put('settings',structuredClone(DEFAULT_SETTINGS));
    for(const g of DEFAULT_GOALS) await put('goals',structuredClone(g));
    for(const p of seededPhases()) await put('phases',structuredClone(p));
    await put('measurements',{id:'measurement-2026-08-18',date:'2026-08-18',weight:165.3,waist:33,pullups:null,run3mi:'',splitGap:null,notes:'Initial baseline',createdAt:new Date().toISOString()});
    await put('meta',{id:'seeded',value:true,createdAt:new Date().toISOString()});
    await put('meta',{id:'plan-version',value:PLAN_VERSION,createdAt:new Date().toISOString()});
  } else {
    await migratePlanIfNeeded();
  }
  await ensureDefaultGoals();
  return true;
}

export async function getSettings(){
  const saved=(await get('settings','app')) || structuredClone(DEFAULT_SETTINGS);
  let changed=false;
  if(!saved.planStartDate){saved.planStartDate='2026-08-26';changed=true;}
  if(!saved.phaseTemplates){saved.phaseTemplates=defaultPhaseTemplates();changed=true;}
  if(!saved.planVersion || saved.planVersion<PLAN_VERSION){saved.planVersion=PLAN_VERSION;changed=true;}
  if(changed) await saveSettings(saved);
  return saved;
}

export async function saveSettings(settings){
  settings.id='app';
  settings.planVersion=PLAN_VERSION;
  settings.updatedAt=new Date().toISOString();
  return put('settings',settings);
}

export async function getGoals(){
  await ensureDefaultGoals();
  const values=await getAll('goals');
  return values.sort((a,b)=>(a.order||99)-(b.order||99));
}

export async function saveGoal(goal){
  if(!goal.id) goal.id=uid('goal');
  if(goal.order==null) goal.order=Date.now();
  goal.role=goal.role||'standard';
  await put('goals',goal);
  return goal;
}

export async function deleteGoal(id){ return remove('goals',id); }

export async function getPhases(){
  const values=await getAll('phases');
  return values.sort((a,b)=>String(a.startDate||'').localeCompare(String(b.startDate||'')));
}

export async function savePhase(phase){
  if(!phase.id) phase.id=uid('phase');
  return put('phases',phase);
}

function raceDateFromGoals(goals){
  const primary=goals.find(g=>g.role==='primary') || goals.find(g=>g.id==='goal-703');
  if(primary?.id==='goal-703' || /70\.3/i.test(primary?.title||'')) return primary?.targetDate||'';
  return goals.find(g=>g.id==='goal-703')?.targetDate||'';
}

export async function getPlanContext(date){
  const [goals,phases]=await Promise.all([getGoals(),getPhases()]);
  return resolvePlanContext(date,raceDateFromGoals(goals),phases);
}

export async function getResolvedPhases(){
  const [goals,phases]=await Promise.all([getGoals(),getPhases()]);
  return resolvedPhaseTimeline(raceDateFromGoals(goals),phases);
}

function makeSession(template,order,context){
  const planned=structuredClone(template.planned || {durationMin:null,distance:null,distanceUnit:'',hrTarget:''});
  if(!planned.distanceUnit){
    if(template.type==='run') planned.distanceUnit='mi';
    else if(template.type==='swim' && planned.distance) planned.distanceUnit='yd';
  }
  return {
    id:uid('session'),
    templateId:template.templateId || uid('template'),
    type:template.type || 'other',
    program:template.program || (context?.program==='ironman' && ['run','bike','swim'].includes(template.type)?PROGRAM_IRONMAN:PROGRAM_OTHER),
    title:template.title || 'Workout',
    summary:template.summary || '',
    planned,
    instructions:structuredClone(template.instructions || []),
    completionRule:template.completionRule || 'Complete the planned workout.',
    countsTowardLoad:template.countsTowardLoad!==false,
    planKey:context?.planKey||template.planKey||'',
    phaseName:context?.name||template.phaseName||'',
    planWeek:context?.weekIndex||template.planWeek||1,
    actual:{},
    status:'planned',
    order,
    createdAt:new Date().toISOString(),
    updatedAt:new Date().toISOString()
  };
}

export async function buildDayFromTemplate(date,force=false){
  const settings=await getSettings();
  const existing=await get('days',date);
  const context=await getPlanContext(date);
  if(!force && existing){
    if(date<settings.planStartDate && !hasRecordedWork(existing)){
      const prePlan={date,sessions:[],prePlan:true,planVersion:PLAN_VERSION,createdAt:existing.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};
      await put('days',prePlan);
      return prePlan;
    }
    if(date>=settings.planStartDate && !hasRecordedWork(existing)){
      const wrongPlan=existing.prePlan || existing.planVersion!==PLAN_VERSION || existing.planKey!==context.planKey || Number(existing.planWeek||0)!==Number(context.weekIndex||0);
      if(wrongPlan) return buildDayFromTemplate(date,true);
    }
    return existing;
  }
  if(date<settings.planStartDate){
    const day={date,sessions:[],prePlan:true,planVersion:PLAN_VERSION,createdAt:existing?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};
    await put('days',day);
    return day;
  }
  const weekday=parseDateOnly(date).getDay();
  const phaseTemplate=settings.phaseTemplates?.[context.planKey] || defaultPhaseTemplates()[context.planKey] || defaultPhaseTemplates()['tri-base'];
  const list=phaseTemplate?.[weekday] || [];
  const adjusted=list.map(item=>applyProgression(item,context));
  const day={
    date,
    sessions:adjusted.map((s,i)=>makeSession(s,i,context)),
    prePlan:false,
    planVersion:PLAN_VERSION,
    planKey:context.planKey,
    phaseName:context.name,
    planWeek:context.weekIndex,
    cycleWeek:context.cycleWeek,
    recoveryWeek:!!context.isRecoveryWeek,
    createdAt:existing?.createdAt||new Date().toISOString(),
    updatedAt:new Date().toISOString()
  };
  await put('days',day);
  return day;
}

export async function getDay(date,ensure=true){
  const day=await get('days',date);
  if(!ensure) return day;
  if(day) return buildDayFromTemplate(date,false);
  return buildDayFromTemplate(date,false);
}

export async function saveDay(day){
  day.updatedAt=new Date().toISOString();
  return put('days',day);
}

export async function resetDayFromTemplate(date){ return buildDayFromTemplate(date,true); }

export async function getDaysRange(startDate,endDate,ensure=true){
  const out=[];
  let cur=startDate;
  while(cur<=endDate){out.push(await getDay(cur,ensure));cur=addDays(cur,1);}
  return out;
}

export async function getAllDays(){ return getAll('days'); }

export async function rebuildFuturePlan(fromDate=isoDate(new Date())){
  const settings=await getSettings();
  const days=await getAll('days');
  const start=fromDate<settings.planStartDate?settings.planStartDate:fromDate;
  for(const day of days){
    if(day.date>=start && !hasRecordedWork(day)) await remove('days',day.date);
  }
  return true;
}

export async function getCheckin(date){ return get('checkins',date); }
export async function saveCheckin(checkin){ checkin.updatedAt=new Date().toISOString(); return put('checkins',checkin); }

export async function getMeasurements(){
  const values=await getAll('measurements');
  return values.sort((a,b)=>a.date.localeCompare(b.date));
}

export async function saveMeasurement(value){
  if(!value.id) value.id=uid('measurement');
  value.updatedAt=new Date().toISOString();
  if(!value.createdAt) value.createdAt=value.updatedAt;
  return put('measurements',value);
}

export async function deleteMeasurement(id){ return remove('measurements',id); }

export async function exportDatabase(){
  const payload={schemaVersion:1,planVersion:PLAN_VERSION,exportedAt:new Date().toISOString(),app:'Training Plan',stores:{}};
  for(const store of STORES) payload.stores[store]=await getAll(store);
  return payload;
}

export async function importDatabase(payload){
  if(!payload || payload.schemaVersion!==1 || !payload.stores) throw new Error('Unsupported or invalid backup file.');
  const db=await openRaw();
  const tx=db.transaction(STORES,'readwrite');
  for(const store of STORES){
    const os=tx.objectStore(store);os.clear();
    for(const item of payload.stores[store]||[]) os.put(item);
  }
  await new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error)});
  db.close();
  await migratePlanIfNeeded();
}

export async function clearDatabase(){
  const db=await openRaw();
  const tx=db.transaction(STORES,'readwrite');
  for(const store of STORES) tx.objectStore(store).clear();
  await new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error)});
  db.close();
}

export async function reseed(){
  await clearDatabase();
  await initDB();
}

export async function updateFutureTemplateSessions(templateId,patch,fromDate,planKey=''){
  const days=await getAllDays();
  for(const day of days){
    if(day.date<fromDate) continue;
    let changed=false;
    day.sessions=(day.sessions||[]).map(current=>{
      if(current.templateId!==templateId || current.status==='complete') return current;
      if(planKey && current.planKey!==planKey) return current;
      changed=true;
      return {
        ...current,
        ...structuredClone(patch),
        planned:{...current.planned,...structuredClone(patch.planned||{})},
        updatedAt:new Date().toISOString()
      };
    });
    if(changed) await saveDay(day);
  }
}

export { PLAN_VERSION };
