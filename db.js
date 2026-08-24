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

function groupWorkout(){
  return {
    templateId:'group-daily',type:'group',title:'Group Workout',summary:'Warm-up / daily accountability check-in',
    planned:{durationMin:10,distance:null,hrTarget:''},
    instructions:[
      'Complete the shared daily group workout.',
      'Treat it as a warm-up and accountability habit rather than the main training load.'
    ],
    completionRule:'Finish the group workout and check in with the group.'
  };
}

function flexibility(short=false){
  return {
    templateId:short?'flex-short':'flex-standard',type:'flexibility',title:'Flexibility',
    summary:short?'10 min · hips · hamstrings · shoulders':'12–15 min · hips · hamstrings · adductors · shoulders',
    planned:{durationMin:short?10:15,distance:null,hrTarget:''},
    instructions:[
      'Hip-flexor stretch · 60 sec each side.',
      'Hamstring stretch · 60 sec each side.',
      'Frog / adductor stretch · 60–90 sec.',
      'Calf stretch · 45 sec each side.',
      'Chest / shoulder doorway stretch · 60 sec each side.',
      'Front-split progression · 2 controlled holds of 30–45 sec each side. Support yourself and stop at strong tension, never sharp pain.'
    ],
    completionRule:'Complete the mobility sequence on both sides without forcing range of motion.'
  };
}

export function defaultWeeklyTemplate(){
  const group = groupWorkout;
  const flex = flexibility;
  return {
    1:[
      group(),
      {templateId:'mon-easy-run',type:'run',title:'Easy Run',summary:'1.5 mi · aerobic · conversational effort',planned:{durationMin:18,distance:1.5,hrTarget:'135–150 bpm'},instructions:['Start very easy for the first 3–5 minutes.','Settle into a comfortable conversational pace.','Keep heart rate mostly in the target range. Slow down or walk briefly if needed.','Finish controlled. Do not sprint the final stretch.'],completionRule:'Complete 1.5 miles at an easy aerobic effort.'},
      {templateId:'mon-upper-a',type:'strength',title:'Upper Body Strength A',summary:'Pull-ups · push-ups · shoulders · triceps · core',planned:{durationMin:30,distance:null,hrTarget:''},instructions:['Pull-ups · 3 × 5–8. Stop 2–3 reps before failure. Rest 90–120 sec.','Push-ups · 3 × 15–20 with a straight body line.','Pike push-ups · 3 × 8–12 for shoulders.','Stable chair/bench dips · 3 × 10–15. Stop if shoulders feel pinched.','Plank · 3 × 45 sec. Brace abs and glutes.'],completionRule:'Finish all prescribed sets with clean form. Hitting the top of every rep range is not required.'},
      flex()
    ],
    2:[
      group(),
      {templateId:'tue-spin-z2',type:'bike',title:'Spin Bike · Zone 2',summary:'30 min · steady aerobic ride',planned:{durationMin:30,distance:null,hrTarget:'Easy–moderate aerobic'},instructions:['Ride easy for 5 minutes to warm up.','Ride 20 minutes at a steady effort you could sustain much longer.','Keep cadence smooth and resistance moderate.','Finish with 5 easy minutes.'],completionRule:'Complete 30 minutes without turning the ride into a hard interval session.'},
      {templateId:'tue-lower-core',type:'strength',title:'Lower Body + Core',summary:'Leg strength · balance · trunk stability',planned:{durationMin:25,distance:null,hrTarget:''},instructions:['Air squats · 3 × 15 controlled reps.','Reverse lunges · 3 × 10 each side.','Single-leg hip hinge / RDL pattern · 3 × 8 each side. Use bodyweight and control balance.','Calf raises · 3 × 20.','Dead bug · 3 × 10 each side.'],completionRule:'Complete all sets with controlled range and no rushing.'},
      flex(true)
    ],
    3:[
      group(),
      {templateId:'wed-run-quality',type:'run',title:'Run · Controlled Intervals',summary:'Easy base with short faster efforts',planned:{durationMin:25,distance:2,hrTarget:'Mostly easy; controlled faster reps'},instructions:['Warm up easy for 8 minutes.','Complete 6 × 1 minute at a controlled faster pace. This is not an all-out sprint.','Recover with 90 seconds easy jog or walk after each faster minute.','Cool down easy for at least 5 minutes.'],completionRule:'Finish all six controlled efforts while keeping form and pace consistent.'},
      {templateId:'wed-skills',type:'skill',title:'Handstand + L-Sit Skills',summary:'10–15 min · quality practice, low fatigue',planned:{durationMin:15,distance:null,hrTarget:''},instructions:['Handstand: 5–8 short wall or free-standing attempts. Stop before form deteriorates.','Rest fully between attempts. Focus on stacked shoulders and active hands.','L-sit: 4–5 quality holds. Use tuck or one-leg progression if needed.','Record your best clean hold if you want to track progress.'],completionRule:'Complete quality attempts without training either skill to failure.'},
      flex()
    ],
    4:[
      group(),
      {templateId:'thu-spin-intervals',type:'bike',title:'Spin Bike · Tempo Intervals',summary:'35 min · controlled sustained work',planned:{durationMin:35,distance:null,hrTarget:'Moderate–hard on work reps'},instructions:['Warm up easy for 8 minutes.','Complete 4 × 4 minutes at a strong but sustainable effort.','Ride easy for 3 minutes between work intervals.','Cool down easy for 5 minutes.'],completionRule:'Complete four even work intervals without fading badly on the final interval.'},
      {templateId:'thu-upper-b',type:'strength',title:'Upper Body Strength B',summary:'Back · chest · shoulders · arms · core',planned:{durationMin:30,distance:null,hrTarget:''},instructions:['Pull-ups · 4 submax sets. Leave 2 reps in reserve.','Slow push-ups · 3 × 10–15 using a 3-second lowering phase.','Pike push-ups · 3 × 8–12.','Chair/bench dips · 3 × 10–15.','Side plank · 3 × 30–45 sec each side.'],completionRule:'Complete all sets with good technique and no failed reps.'},
      flex(true)
    ],
    5:[
      group(),
      {templateId:'fri-easy-run',type:'run',title:'Easy Run',summary:'1.5 mi · relaxed aerobic running',planned:{durationMin:18,distance:1.5,hrTarget:'135–150 bpm'},instructions:['Run the first few minutes slower than you think you need to.','Stay conversational and relaxed through the middle.','Walk briefly if heart rate drifts too high.','Finish feeling like you could continue.'],completionRule:'Complete 1.5 relaxed miles.'},
      {templateId:'fri-core-posture',type:'strength',title:'Core + Posture',summary:'Core control · shoulders · upper-back posture',planned:{durationMin:20,distance:null,hrTarget:''},instructions:['Dead bug · 3 × 10 each side.','Side plank · 3 × 30 sec each side.','Hollow-body hold or tuck hold · 4 × 20–30 sec.','Prone Y-T-W raises · 2 rounds of 8 each position.','Scapular push-ups · 2 × 12.'],completionRule:'Finish the circuit with controlled movement and strong positioning.'},
      flex()
    ],
    6:[
      group(),
      {templateId:'sat-long-aerobic',type:'run',title:'Long Aerobic Session',summary:'Build endurance gradually · easy effort',planned:{durationMin:40,distance:3,hrTarget:'Easy aerobic'},instructions:['Start at an intentionally easy pace.','Use run/walk as needed to keep the effort aerobic.','This session should build duration, not prove fitness.','Add time or distance gradually as your base improves.'],completionRule:'Complete the planned aerobic duration/distance without turning it into a race.'},
      {templateId:'sat-dryland-swim',type:'swim',title:'Swim / Dryland Swim',summary:'15–20 min · swim-specific movement',planned:{durationMin:18,distance:null,hrTarget:''},instructions:['If open-water or pool access is practical, replace this with an easy technique-focused swim.','Dryland option: scapular push-ups · 2 × 12.','Prone swimmers · 3 × 8 slow reps.','Straight-arm lat press isometric against a stable surface · 3 × 20 sec.','Shoulder external-rotation mobility and thoracic rotation · 2 rounds.'],completionRule:'Complete a swim when available, otherwise finish the full dryland sequence.'},
      flex()
    ],
    0:[
      group(),
      {templateId:'sun-recovery',type:'recovery',title:'Recovery Aerobic',summary:'20–30 min · walk or very easy spin',planned:{durationMin:25,distance:null,hrTarget:'Very easy'},instructions:['Choose an easy walk or very light spin-bike ride.','Keep the effort low enough that it feels restorative.','If unusually fatigued or sore, skip the aerobic portion and keep only mobility.'],completionRule:'Finish feeling better than when you started.'},
      {templateId:'sun-flex-long',type:'flexibility',title:'Longer Mobility Session',summary:'20 min · full-body flexibility',planned:{durationMin:20,distance:null,hrTarget:''},instructions:['Hip flexors · 60–90 sec each side.','Hamstrings · 60–90 sec each side.','Adductors / frog stretch · 90 sec.','Calves and ankles · 60 sec each side.','Thoracic rotations · 8 controlled reps each side.','Chest / shoulder stretch · 60 sec each side.','Front-split progression · 2–3 controlled holds each side.'],completionRule:'Complete the full mobility sequence at a controlled intensity.'}
    ]
  };
}

const DEFAULT_SETTINGS = {
  id:'app',
  weightUnit:'lb',
  distanceUnit:'mi',
  autoExpand:false,
  weeklyTemplate:defaultWeeklyTemplate(),
  updatedAt:new Date().toISOString()
};

const DEFAULT_GOALS = [
  {id:'goal-703',title:'IRONMAN 70.3 Maine',category:'Endurance',target:'Complete in 2027',targetDate:'',notes:'Primary endurance goal. Build swim, bike and run capacity progressively.',order:1},
  {id:'goal-weight',title:'Lean athletic body composition',category:'Body Composition',target:'About 155 lb while retaining muscle',targetDate:'2026-12-12',notes:'Use waist, strength, energy and appearance alongside scale weight rather than chasing weight alone.',order:2},
  {id:'goal-pullups',title:'Pull-ups',category:'Strength',target:'20 clean reps',targetDate:'',notes:'Build progressively while keeping most training sets submaximal.',order:3},
  {id:'goal-run3',title:'3-mile run',category:'Running',target:'Sub-8:00/mile pace',targetDate:'',notes:'Equivalent to under 24:00 for 3 miles.',order:4},
  {id:'goal-split',title:'Improve flexibility',category:'Mobility',target:'Front split progression',targetDate:'2026-12-31',notes:'Daily mobility with measurable split-gap progress, plus hips, hamstrings, adductors, shoulders and thoracic mobility.',order:5},
  {id:'goal-handstand',title:'Handstand',category:'Skill',target:'Longer controlled free-standing hold',targetDate:'',notes:'Short frequent quality practice.',order:6},
  {id:'goal-lsit',title:'L-sit',category:'Skill',target:'Longer clean hold',targetDate:'',notes:'Progress from current short holds with quality practice.',order:7},
  {id:'goal-ironman',title:'Full Ironman',category:'Endurance',target:'Complete by age 50',targetDate:'2029-09-13',notes:'Long-term progression after the 70.3 goal.',order:8}
];

const DEFAULT_PHASES = [
  {id:'phase-2026-base',name:'Strength + Aerobic Base',startDate:'2026-08-24',endDate:'2026-12-13',focus:['Strength','Body composition','Aerobic base','Flexibility'],notes:'Build an athletic base while preserving long-term triathlon progression.',order:1},
  {id:'phase-2027-base',name:'Endurance Base',startDate:'2026-12-14',endDate:'2027-03-31',focus:['Aerobic volume','Run durability','Bike consistency','Swim technique','Strength maintenance'],notes:'Shift more weekly capacity toward triathlon endurance.',order:2},
  {id:'phase-2027-build',name:'Triathlon Build',startDate:'2027-04-01',endDate:'2027-06-30',focus:['Swim volume','Bike endurance','Run progression','Brick sessions'],notes:'Increase sport-specific work while controlling total fatigue.',order:3},
  {id:'phase-2027-race',name:'70.3 Race Build',startDate:'2027-07-01',endDate:'2027-09-30',focus:['Race-specific endurance','Long bricks','Open-water confidence','Taper'],notes:'Exact dates can be adjusted when the 2027 race date is confirmed.',order:4}
];

export async function initDB(){
  const db=await openRaw(); db.close();
  const seeded=await get('meta','seeded');
  if (!seeded){
    await put('settings',structuredClone(DEFAULT_SETTINGS));
    for (const g of DEFAULT_GOALS) await put('goals',structuredClone(g));
    for (const p of DEFAULT_PHASES) await put('phases',structuredClone(p));
    await put('measurements',{id:'measurement-2026-08-18',date:'2026-08-18',weight:165.3,waist:33,pullups:null,run3mi:'',splitGap:null,notes:'Initial baseline',createdAt:new Date().toISOString()});
    await put('meta',{id:'seeded',value:true,createdAt:new Date().toISOString()});
  }
  return true;
}

export async function getSettings(){
  return (await get('settings','app')) || structuredClone(DEFAULT_SETTINGS);
}
export async function saveSettings(settings){
  settings.id='app'; settings.updatedAt=new Date().toISOString();
  return put('settings',settings);
}

function makeSession(template,order){
  return {
    id:uid('session'),
    templateId:template.templateId || uid('template'),
    type:template.type || 'other',
    title:template.title || 'Workout',
    summary:template.summary || '',
    planned:structuredClone(template.planned || {durationMin:null,distance:null,hrTarget:''}),
    instructions:structuredClone(template.instructions || []),
    completionRule:template.completionRule || 'Complete the planned workout.',
    actual:{},
    status:'planned',
    order,
    createdAt:new Date().toISOString(),
    updatedAt:new Date().toISOString()
  };
}

export async function buildDayFromTemplate(date, force=false){
  if (!force){
    const existing=await get('days',date);
    if (existing) return existing;
  }
  const settings=await getSettings();
  const weekday=parseDateOnly(date).getDay();
  const list=settings.weeklyTemplate?.[weekday] || [];
  const day={date,sessions:list.map((s,i)=>makeSession(s,i)),createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
  await put('days',day);
  return day;
}

export async function getDay(date,ensure=true){
  const day=await get('days',date);
  if (day || !ensure) return day;
  return buildDayFromTemplate(date);
}
export async function saveDay(day){ day.updatedAt=new Date().toISOString(); return put('days',day); }
export async function resetDayFromTemplate(date){ return buildDayFromTemplate(date,true); }

export async function getDaysRange(startDate,endDate,ensure=true){
  const out=[]; let cur=startDate;
  while(cur<=endDate){ out.push(await getDay(cur,ensure)); cur=addDays(cur,1); }
  return out;
}

export async function getAllDays(){ return getAll('days'); }

export async function getCheckin(date){ return get('checkins',date); }
export async function saveCheckin(checkin){ checkin.updatedAt=new Date().toISOString(); return put('checkins',checkin); }

export async function getMeasurements(){
  const values=await getAll('measurements');
  return values.sort((a,b)=>a.date.localeCompare(b.date));
}
export async function saveMeasurement(value){
  if (!value.id) value.id=uid('measurement');
  value.updatedAt=new Date().toISOString();
  if (!value.createdAt) value.createdAt=value.updatedAt;
  return put('measurements',value);
}
export async function deleteMeasurement(id){ return remove('measurements',id); }

export async function getGoals(){ const v=await getAll('goals'); return v.sort((a,b)=>(a.order||99)-(b.order||99)); }
export async function saveGoal(goal){ if(!goal.id)goal.id=uid('goal'); if(goal.order==null)goal.order=Date.now(); return put('goals',goal); }
export async function deleteGoal(id){ return remove('goals',id); }

export async function getPhases(){ const v=await getAll('phases'); return v.sort((a,b)=>a.startDate.localeCompare(b.startDate)); }
export async function savePhase(phase){ if(!phase.id)phase.id=uid('phase'); return put('phases',phase); }

export async function exportDatabase(){
  const payload={schemaVersion:1,exportedAt:new Date().toISOString(),app:'Training Plan',stores:{}};
  for (const store of STORES) payload.stores[store]=await getAll(store);
  return payload;
}

export async function importDatabase(payload){
  if (!payload || payload.schemaVersion!==1 || !payload.stores) throw new Error('Unsupported or invalid backup file.');
  const db=await openRaw();
  const tx=db.transaction(STORES,'readwrite');
  for(const store of STORES){
    const os=tx.objectStore(store); os.clear();
    for(const item of payload.stores[store]||[]) os.put(item);
  }
  await new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error)});
  db.close();
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

export async function updateFutureTemplateSessions(templateId,patch,fromDate){
  const days=await getAllDays();
  for(const day of days){
    if(day.date<fromDate) continue;
    let changed=false;
    day.sessions=day.sessions.map(session=>{
      if(session.templateId!==templateId || session.status==='complete') return session;
      changed=true;
      return {...session,...structuredClone(patch),planned:{...session.planned,...structuredClone(patch.planned||{})},updatedAt:new Date().toISOString()};
    });
    if(changed) await saveDay(day);
  }
}
