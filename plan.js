export const PLAN_VERSION = 5;

export const PROGRAM_IRONMAN = 'ironman';
export const PROGRAM_OTHER = 'other';

const DAY_MS = 86400000;

function parseDateOnly(value){
  const [y,m,d] = String(value).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0, 0);
}

function isoDate(date){
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addDays(value, amount){
  const d = parseDateOnly(value);
  d.setDate(d.getDate() + amount);
  return isoDate(d);
}

function daysBetween(start, end){
  return Math.floor((parseDateOnly(end) - parseDateOnly(start)) / DAY_MS);
}

function session({id,type,program=PROGRAM_OTHER,title,summary,duration=null,distance=null,distanceUnit='',hrTarget='',instructions=[],completionRule='',countsTowardLoad=true,progressive=true}){
  return {
    templateId:id,
    type,
    program,
    title,
    summary,
    planned:{durationMin:duration,distance,distanceUnit,hrTarget},
    instructions,
    completionRule:completionRule || 'Complete the planned workout with controlled form and effort.',
    countsTowardLoad,
    progressive
  };
}

function group(){
  return session({
    id:'group-daily',type:'group',title:'Group Workout',summary:'Warm-up / daily accountability check-in',duration:10,
    countsTowardLoad:false,progressive:false,
    instructions:['Complete the shared daily group workout.','Treat it as a warm-up and accountability habit rather than the main training load.'],
    completionRule:'Finish the group workout and check in with the group.'
  });
}

function flex(id='flex-standard',minutes=12,long=false){
  const instructions = long ? [
    'Hip flexors - 60 to 90 sec each side.',
    'Hamstrings - 60 to 90 sec each side.',
    'Adductors / frog stretch - 90 sec.',
    'Calves and ankles - 60 sec each side.',
    'Thoracic rotations - 8 controlled reps each side.',
    'Chest / shoulder stretch - 60 sec each side.',
    'Front-split progression - 2 to 3 controlled holds each side.'
  ] : [
    'Hip-flexor stretch - 60 sec each side.',
    'Hamstring stretch - 60 sec each side.',
    'Frog / adductor stretch - 60 to 90 sec.',
    'Calf stretch - 45 sec each side.',
    'Chest / shoulder doorway stretch - 60 sec each side.',
    'Front-split progression - 2 controlled holds each side. Stop at strong tension, never sharp pain.'
  ];
  return session({
    id,type:'flexibility',title:long?'Longer Mobility Session':'Flexibility',summary:long?'Full-body mobility + split progression':'Hips · hamstrings · adductors · shoulders',duration:minutes,
    progressive:false,instructions,completionRule:'Complete the mobility sequence on both sides without forcing range of motion.'
  });
}

function rest(id='rest-day',title='Rest / Recovery Day'){
  return session({
    id,type:'recovery',title,summary:'No formal training load',duration:0,progressive:false,
    instructions:['Keep the day easy.','Walking and normal daily movement are fine.','Prioritize sleep, food, hydration, and mobility if it feels good.'],
    completionRule:'Take the planned recovery day without adding a hard workout.'
  });
}

function run(id,title,summary,duration,distance,program=PROGRAM_OTHER,quality='easy'){
  let instructions;
  let hrTarget='Easy aerobic / conversational';
  if(quality==='strides'){
    instructions=['WU: Run easy for 8 to 10 minutes.','MS: Run easy, then complete 4 to 6 x 20 sec relaxed strides with 40 to 60 sec easy recovery.','Keep strides quick and smooth, not all-out sprints.','CD: Easy running or walking to reach the planned total.'];
    hrTarget='Mostly easy; short relaxed strides';
  } else if(quality==='intervals'){
    instructions=['WU: Run easy for 8 to 10 minutes.','MS: Complete 6 x 1 minute at a controlled faster effort with 90 sec easy jog or walk after each.','Keep every faster rep smooth and repeatable.','CD: Easy running or walking to reach the planned total.'];
    hrTarget='Mostly easy; controlled faster reps';
  } else if(quality==='tempo'){
    instructions=['WU: Run easy for 10 minutes.','MS: Complete 2 x 6 to 10 minutes at a comfortably hard tempo with 3 minutes easy between.','The effort should stay controlled enough that the second rep is as strong as the first.','CD: Easy running to reach the planned total.'];
    hrTarget='Easy with controlled tempo work';
  } else if(quality==='hills'){
    instructions=['WU: Run easy for 10 minutes.','MS: Complete 5 to 8 x 45 to 60 sec uphill at a strong controlled effort. Jog or walk back down for recovery.','Keep posture tall and cadence quick. Do not sprint.','CD: Easy running to reach the planned total.'];
    hrTarget='Easy with controlled hill efforts';
  } else if(quality==='rotb'){
    instructions=['Start the run promptly after the bike.','Keep the first few minutes deliberately easy while cadence settles.','Focus on relaxed posture, quick feet, and controlled breathing.','Finish at the planned duration without turning it into a race.'];
    hrTarget='Easy to moderate off the bike';
  } else if(quality==='racepace'){
    instructions=['WU: Run easy for 10 minutes.','MS: Complete controlled race-effort segments while keeping form and cadence stable.','Practice fueling and cooling strategy if the session is long enough.','CD: Easy running to reach the planned total.'];
    hrTarget='70.3 race-effort segments';
  } else {
    instructions=['WU: Start very easy for 5 to 10 minutes.','MS: Settle into a conversational aerobic effort.','Slow down or use brief walk breaks if effort drifts too high.','CD: Finish controlled and feeling like you could continue.'];
  }
  return session({id,type:'run',program,title,summary,duration,distance,distanceUnit:'mi',hrTarget,instructions,completionRule:'Complete the planned run at the prescribed effort.'});
}

function bike(id,title,summary,duration,program=PROGRAM_OTHER,quality='easy'){
  let instructions;
  let hrTarget='Easy to moderate aerobic';
  if(quality==='tempo'){
    instructions=['WU: Spin easy for 10 minutes.','MS: Complete 3 to 4 sustained tempo blocks at a strong but repeatable effort with easy spinning between.','Keep cadence smooth and avoid mashing a heavy gear.','CD: Spin easy to reach the planned total.'];
    hrTarget='Aerobic with controlled tempo work';
  } else if(quality==='sweetspot'){
    instructions=['WU: Spin easy for 10 minutes with 3 short cadence pickups.','MS: Complete 3 x 8 to 12 minutes at strong steady effort with 4 to 5 minutes easy between.','Keep power or effort even across all work blocks.','CD: Spin easy to reach the planned total.'];
    hrTarget='Strong steady / sweet spot';
  } else if(quality==='power'){
    instructions=['WU: Ride easy for 10 minutes with several cadence changes.','MS: Add short high-cadence or high-resistance efforts with full easy recovery.','Quality matters more than forcing extra reps.','CD: Easy spinning to reach the planned total.'];
    hrTarget='Mostly aerobic with short power efforts';
  } else if(quality==='racepace'){
    instructions=['WU: Ride easy for 10 to 15 minutes.','MS: Hold long steady race-effort segments while keeping cadence and position consistent.','Practice fueling, hydration, and staying aero when practical.','CD: Easy spinning to reach the planned total.'];
    hrTarget='70.3 race effort';
  } else {
    instructions=['WU: Spin easy for 5 to 10 minutes.','MS: Ride at a steady aerobic effort you could sustain much longer.','Keep cadence smooth and resistance moderate.','CD: Spin easy to reach the planned total.'];
  }
  return session({id,type:'bike',program,title,summary,duration,hrTarget,instructions,completionRule:'Complete the planned ride without unnecessary intensity.'});
}

function swim(id,title,summary,duration,yards,program=PROGRAM_OTHER,quality='technique'){
  let instructions;
  let hrTarget='Technique / easy aerobic';
  if(quality==='endurance'){
    instructions=['WU: 200 easy plus 4 x 50 relaxed drill/swim.','MS: Use steady 100 to 300 yard repeats with short rest, focusing on long smooth strokes.','Include pull buoy work if available and technique remains good.','CD: 100 to 200 easy. If pool access is unavailable, complete the dryland swim substitute instead.'];
    hrTarget='Aerobic endurance';
  } else if(quality==='tempo'){
    instructions=['WU: 200 easy plus drill work.','MS: Use progressive 100s or 200s, moving from easy aerobic to controlled tempo while holding technique.','Keep rest short enough to reward pacing, not sprinting.','CD: 100 to 200 easy. If pool access is unavailable, complete the dryland swim substitute instead.'];
    hrTarget='Aerobic with controlled tempo';
  } else if(quality==='racepace'){
    instructions=['WU: 300 easy with sighting and drill work when practical.','MS: Complete race-effort repeats with short rest while maintaining form.','Practice sighting, steady breathing, and continuous rhythm.','CD: 200 easy. Open water is preferred when safe and seasonally practical.'];
    hrTarget='70.3 race effort';
  } else {
    instructions=['WU: 200 easy.','Drills: 4 to 8 x 50 focusing on alignment, balance, and relaxed breathing.','MS: Easy to moderate 100s with clean technique and short rest.','CD: 100 easy. If pool access is unavailable, substitute 20 to 30 minutes of scapular, lat, shoulder, and thoracic dryland work.'];
  }
  return session({id,type:'swim',program,title,summary,duration,distance:yards,distanceUnit:'yd',hrTarget,instructions,completionRule:'Complete the planned swim with technique intact, or use the prescribed dryland substitute when pool access is not practical.'});
}

function strength(id,title,summary,duration,instructions){
  return session({id,type:'strength',title,summary,duration,progressive:false,instructions,completionRule:'Complete the prescribed working sets with clean technique and no failed reps.'});
}

function skill(id='skills-handstand-lsit',minutes=15){
  return session({
    id,type:'skill',title:'Handstand + L-Sit Skills',summary:'Quality practice · low fatigue',duration:minutes,progressive:false,
    instructions:['Handstand - 5 to 8 short wall or free-standing attempts. Stop before form deteriorates.','Rest fully between attempts. Focus on stacked shoulders and active hands.','L-sit - 4 to 5 quality holds. Use tuck or one-leg progression if needed.','Record your best clean hold when you want to track progress.'],
    completionRule:'Complete quality attempts without training either skill to failure.'
  });
}

function drylandSwim(id='dryland-swim',minutes=20){
  return session({
    id,type:'swim',program:PROGRAM_OTHER,title:'Swim / Dryland Base',summary:'Swim-specific movement · optional technique swim',duration:minutes,progressive:false,
    instructions:['If lake or pool access is practical, use the time for an easy technique-focused swim.','Dryland: scapular push-ups - 2 x 12.','Prone swimmers - 3 x 8 slow reps.','Straight-arm lat press isometric against a stable surface - 3 x 20 sec.','Finish with shoulder external rotation mobility and thoracic rotation.'],
    completionRule:'Complete an easy technique swim when available, otherwise finish the full dryland sequence.'
  });
}

function prefixWeek(planKey, week){
  const out={};
  for(const [day,list] of Object.entries(week)){
    out[day]=list.map(item=>({...item,templateId:`${planKey}:${item.templateId}`}));
  }
  return out;
}

function definitionWeek({easyDistance=1.5,qualityDistance=2,longDistance=3,bikeEasy=30,bikeQuality=35,strengthLevel=1,quality='strides',peak=false}){
  const sets = strengthLevel >= 3 ? 4 : 3;
  const upperA = strength('upper-a','Upper Body Strength A','Pull · chest · shoulders · triceps · core',strengthLevel>=3?40:35,[
    `Pull-ups - ${sets} x 5-8. Leave 2 reps in reserve.`,
    `Push-ups - ${sets} x 12-20 with controlled depth.`,
    `Pike push-ups - ${sets} x 8-12.`,
    `Chair / bench dips - 3 x 10-15. Stop if shoulders feel pinched.`,
    `Plank - 3 x 45-60 sec.`
  ]);
  const lower = strength('lower-core','Lower Body + Core','Leg strength · balance · trunk stability',strengthLevel>=2?30:28,[
    `Air squats - ${strengthLevel>=2?4:3} x 12-18 controlled reps.`,
    'Reverse lunges - 3 x 10 each side.',
    'Single-leg hip hinge / RDL pattern - 3 x 8 each side.',
    'Calf raises - 3 x 20.',
    'Dead bug - 3 x 10 each side.'
  ]);
  const upperB = strength('upper-b',peak?'Upper Body Definition':'Upper Body Strength B',peak?'Chest · shoulders · back · arms · posture':'Back · chest · shoulders · arms · core',strengthLevel>=3?40:35,[
    `Pull-ups - ${sets} submax sets. Leave 2 reps in reserve.`,
    `Slow push-ups - ${sets} x 10-15 using a 3-second lowering phase.`,
    `Pike push-ups - ${sets} x 8-12.`,
    'Chair / bench dips - 3 x 10-15.',
    peak?'Prone Y-T-W raises - 3 rounds of 8 each position.':'Side plank - 3 x 30-45 sec each side.'
  ]);
  return {
    1:[group(),run('easy-run-a','Easy Run','Aerobic base · conversational effort',Math.round(easyDistance*11),easyDistance),upperA,flex('flex-mon',12)],
    2:[group(),bike('spin-easy','Spin Bike · Aerobic','Steady base ride · smooth cadence',bikeEasy),lower,flex('flex-tue',10)],
    3:[group(),run('run-quality',quality==='tempo'?'Run · Controlled Tempo':quality==='intervals'?'Run · Controlled Intervals':'Run · Easy + Strides','Base running with a small quality dose',Math.round(qualityDistance*11),qualityDistance,PROGRAM_OTHER,quality),skill(),flex('flex-wed',12)],
    4:[group(),bike('spin-quality',peak?'Spin Bike · Controlled Tempo':'Spin Bike · Aerobic + Tempo','Aerobic cycling with controlled sustained work',bikeQuality,PROGRAM_OTHER,peak?'tempo':'tempo'),flex('flex-thu',12)],
    5:[group(),run('easy-run-b','Easy Run','Relaxed aerobic running',Math.round(easyDistance*11),easyDistance),upperB,flex('flex-fri',12)],
    6:[group(),run('long-run','Long Aerobic Run','Endurance · easy controlled effort',Math.round(longDistance*12),longDistance),drylandSwim('swim-dryland',20),flex('flex-sat',10)],
    0:[group(),rest(),flex('flex-sun',20,true)]
  };
}

function transitionWeek(){
  return {
    1:[group(),rest(),flex('transition-flex-mon',15)],
    2:[group(),bike('transition-spin-a','Easy Spin','Recovery aerobic · no hard intervals',30),strength('transition-strength-a','Light Full-Body Strength','Technique · easy volume',25,['Pull-ups - 2 submax sets.','Push-ups - 2 x 10-15.','Air squats - 2 x 12-15.','Dead bug - 2 x 8 each side.','Stop every set well before failure.']),flex('transition-flex-tue',10)],
    3:[group(),run('transition-run-a','Easy Run','Short relaxed aerobic run',25,2),flex('transition-flex-wed',12)],
    4:[group(),rest('transition-rest','Recovery Day'),flex('transition-flex-thu',15)],
    5:[group(),bike('transition-spin-b','Easy Spin','Recovery aerobic · smooth cadence',30),strength('transition-strength-b','Light Upper Body','Easy maintenance work',25,['Pull-ups - 2 submax sets.','Slow push-ups - 2 x 10-12.','Pike push-ups - 2 x 8.','Side plank - 2 x 30 sec each side.']),flex('transition-flex-fri',10)],
    6:[group(),run('transition-run-b','Easy Aerobic Run','Relaxed base maintenance',35,2.75),drylandSwim('transition-swim',20),flex('transition-flex-sat',10)],
    0:[group(),rest('transition-rest-sun','Rest Day'),flex('transition-flex-sun',20,true)]
  };
}

function triFoundationWeek(){
  return {
    1:[group(),rest('tri-foundation-rest','Rest / Recovery Day'),flex('tri-foundation-flex-mon',15)],
    2:[group(),swim('tri-foundation-swim-a','Swim · Technique','Technique · balance · breathing',35,1200,PROGRAM_IRONMAN,'technique'),run('tri-foundation-run-a','Easy Run','Aerobic capacity · relaxed',30,2.5,PROGRAM_IRONMAN,'easy'),flex('tri-foundation-flex-tue',10)],
    3:[group(),bike('tri-foundation-bike-a','Bike · Aerobic Foundation','Steady aerobic ride · cadence focus',40,PROGRAM_IRONMAN,'easy'),strength('tri-foundation-strength-a','Strength Maintenance A','Pull · push · legs · core',30,['Pull-ups - 3 x 5-8.','Push-ups - 3 x 12-18.','Split squats - 3 x 8 each side.','Single-leg hip hinge - 3 x 8 each side.','Plank - 3 x 45 sec.']),flex('tri-foundation-flex-wed',10)],
    4:[group(),run('tri-foundation-run-quality','Run · Easy + Strides','Aerobic running · economy',30,2.5,PROGRAM_IRONMAN,'strides'),flex('tri-foundation-flex-thu',12)],
    5:[group(),swim('tri-foundation-swim-b','Swim · Endurance Technique','Steady swimming · hold form',40,1400,PROGRAM_IRONMAN,'endurance'),strength('tri-foundation-strength-b','Strength Maintenance B','Back · shoulders · core',25,['Pull-ups - 3 submax sets.','Slow push-ups - 3 x 10-15.','Pike push-ups - 3 x 8-10.','Calf raises - 3 x 15-20.','Dead bug - 3 x 8 each side.']),flex('tri-foundation-flex-fri',10)],
    6:[group(),bike('tri-foundation-bike-long','Bike · Endurance','Longer aerobic ride · steady cadence',50,PROGRAM_IRONMAN,'easy'),run('tri-foundation-rotb','Run Off The Bike','Short easy transition run',10,1,PROGRAM_IRONMAN,'rotb'),flex('tri-foundation-flex-sat',10)],
    0:[group(),run('tri-foundation-run-long','Long Run','Build endurance · easy effort',40,3.5,PROGRAM_IRONMAN,'easy'),flex('tri-foundation-flex-sun',20,true)]
  };
}

function triBaseWeek(){
  return {
    1:[group(),rest('tri-base-rest','Rest / Recovery Day'),flex('tri-base-flex-mon',15)],
    2:[group(),swim('tri-base-swim-a','Swim · Aerobic Base','Steady endurance · efficient stroke',45,1600,PROGRAM_IRONMAN,'endurance'),run('tri-base-run-a','Easy Run','Aerobic capacity · relaxed',35,3,PROGRAM_IRONMAN,'easy'),flex('tri-base-flex-tue',10)],
    3:[group(),bike('tri-base-bike-a','Bike · Endurance','Aerobic capacity · cadence consistency',50,PROGRAM_IRONMAN,'easy'),strength('tri-base-strength-a','Strength Maintenance A','Durability · pull · legs · core',30,['Pull-ups - 3 x 5-8.','Push-ups - 3 x 12-18.','Bulgarian split squats - 3 x 8 each side.','Single-leg hip hinge - 3 x 8 each side.','Plank - 3 x 45-60 sec.']),flex('tri-base-flex-wed',10)],
    4:[group(),run('tri-base-run-quality','Run · Hills / Tempo','Strength · economy · controlled quality',40,3.5,PROGRAM_IRONMAN,'hills'),flex('tri-base-flex-thu',12)],
    5:[group(),swim('tri-base-swim-b','Swim · Technique + Tempo','Form under moderate effort',45,1700,PROGRAM_IRONMAN,'tempo'),strength('tri-base-strength-b','Strength Maintenance B','Upper body · posture · core',25,['Pull-ups - 3 submax sets.','Slow push-ups - 3 x 10-15.','Pike push-ups - 3 x 8-10.','Prone Y-T-W raises - 2 rounds of 8 each position.','Dead bug - 3 x 10 each side.']),flex('tri-base-flex-fri',10)],
    6:[group(),bike('tri-base-bike-long','Bike · Long Endurance','Long aerobic ride · fueling habit',75,PROGRAM_IRONMAN,'easy'),run('tri-base-rotb','Run Off The Bike','Easy transition run · cadence',15,1.25,PROGRAM_IRONMAN,'rotb'),flex('tri-base-flex-sat',10)],
    0:[group(),run('tri-base-run-long','Long Run','Aerobic durability · easy effort',55,5,PROGRAM_IRONMAN,'easy'),flex('tri-base-flex-sun',20,true)]
  };
}

function raceBaseWeek(){
  return {
    1:[group(),rest('race-base-rest','Rest / Recovery Day'),flex('race-base-flex-mon',15)],
    2:[group(),swim('race-base-swim-a','Swim · Base','Aerobic endurance · pacing',50,1800,PROGRAM_IRONMAN,'endurance'),bike('race-base-bike-quality','Bike · Power / Tempo','Short quality inside aerobic work',60,PROGRAM_IRONMAN,'power'),flex('race-base-flex-tue',10)],
    3:[group(),run('race-base-run-a','Run · Foundation','Aerobic durability · relaxed form',45,4,PROGRAM_IRONMAN,'easy'),strength('race-base-strength-a','Strength Maintenance A','Durability · controlled volume',25,['Pull-ups - 3 x 5-8.','Push-ups - 3 x 10-15.','Split squats - 3 x 8 each side.','Single-leg hip hinge - 3 x 8 each side.','Plank - 3 x 45 sec.']),flex('race-base-flex-wed',10)],
    4:[group(),bike('race-base-bike-a','Bike · Aerobic','Steady aerobic ride',60,PROGRAM_IRONMAN,'easy'),run('race-base-rotb','Run Off The Bike','Short easy brick · quick cadence',15,1.25,PROGRAM_IRONMAN,'rotb'),flex('race-base-flex-thu',10)],
    5:[group(),swim('race-base-swim-b','Swim · Fartlek / Tempo','Technique under changing effort',50,1900,PROGRAM_IRONMAN,'tempo'),strength('race-base-strength-b','Strength Maintenance B','Upper body · posture · core',25,['Pull-ups - 3 submax sets.','Slow push-ups - 3 x 10-15.','Pike push-ups - 2 x 8-10.','Calf raises - 3 x 15-20.','Dead bug - 3 x 10 each side.']),flex('race-base-flex-fri',10)],
    6:[group(),bike('race-base-bike-long','Bike · Long Endurance','Long aerobic ride · fueling practice',120,PROGRAM_IRONMAN,'easy'),flex('race-base-flex-sat',10)],
    0:[group(),run('race-base-run-long','Long Run','Aerobic endurance · controlled finish',65,6,PROGRAM_IRONMAN,'easy'),flex('race-base-flex-sun',20,true)]
  };
}

function raceBuildWeek(){
  return {
    1:[group(),rest('race-build-rest','Rest / Recovery Day'),flex('race-build-flex-mon',15)],
    2:[group(),swim('race-build-swim-a','Swim · Endurance','Longer aerobic sets · pacing',55,2200,PROGRAM_IRONMAN,'endurance'),bike('race-build-bike-quality','Bike · Sweet Spot / Threshold','Build sustainable bike power',70,PROGRAM_IRONMAN,'sweetspot'),flex('race-build-flex-tue',10)],
    3:[group(),run('race-build-run-quality','Run · Hills / Tempo','Strength · economy · fatigue resistance',50,4.5,PROGRAM_IRONMAN,'tempo'),strength('race-build-strength-a','Strength Maintenance','Low-volume durability work',25,['Pull-ups - 3 x 5-8.','Push-ups - 3 x 10-15.','Split squats - 2 x 8 each side.','Single-leg hip hinge - 2 x 8 each side.','Plank - 3 x 45 sec.']),flex('race-build-flex-wed',10)],
    4:[group(),bike('race-build-bike-a','Bike · Aerobic + Race Effort','Steady ride with controlled race-effort blocks',65,PROGRAM_IRONMAN,'racepace'),run('race-build-rotb-a','Run Off The Bike','Easy brick · settle cadence quickly',20,1.75,PROGRAM_IRONMAN,'rotb'),flex('race-build-flex-thu',10)],
    5:[group(),swim('race-build-swim-b','Swim · Tempo / Race Skills','Pacing · sighting · form under load',55,2200,PROGRAM_IRONMAN,'tempo'),run('race-build-run-easy','Easy Run','Recovery aerobic · relaxed',30,2.75,PROGRAM_IRONMAN,'easy'),flex('race-build-flex-fri',10)],
    6:[group(),bike('race-build-bike-long','Bike · Long Endurance','Race fueling · steady power · aero durability',150,PROGRAM_IRONMAN,'racepace'),run('race-build-rotb-b','Run Off The Bike','Short race-specific brick',20,1.75,PROGRAM_IRONMAN,'rotb'),flex('race-build-flex-sat',10)],
    0:[group(),run('race-build-run-long','Long Run','Endurance · controlled late-race form',75,7,PROGRAM_IRONMAN,'easy'),flex('race-build-flex-sun',20,true)]
  };
}

function racePeakWeek(){
  return {
    1:[group(),rest('race-peak-rest','Rest / Recovery Day'),flex('race-peak-flex-mon',15)],
    2:[group(),swim('race-peak-swim-a','Swim · Race Endurance','Long steady sets · race rhythm',60,2400,PROGRAM_IRONMAN,'racepace'),bike('race-peak-bike-quality','Bike · Race Pace','Long steady race-effort work',75,PROGRAM_IRONMAN,'racepace'),flex('race-peak-flex-tue',10)],
    3:[group(),run('race-peak-run-quality','Run · Race Pace / Tempo','Race-effort control · economy',55,5,PROGRAM_IRONMAN,'racepace'),strength('race-peak-strength','Light Strength Maintenance','Keep strength without creating soreness',20,['Pull-ups - 2 submax sets.','Push-ups - 2 x 10-12.','Split squats - 2 x 6 each side.','Plank - 2 x 45 sec.']),flex('race-peak-flex-wed',10)],
    4:[group(),bike('race-peak-bike-easy','Bike · Aerobic','Easy endurance · cadence',50,PROGRAM_IRONMAN,'easy'),run('race-peak-rotb-a','Run Off The Bike','Easy transition run',15,1.25,PROGRAM_IRONMAN,'rotb'),flex('race-peak-flex-thu',10)],
    5:[group(),swim('race-peak-swim-b','Swim · Open Water / Race Skills','Sighting · rhythm · confidence',55,2200,PROGRAM_IRONMAN,'racepace'),flex('race-peak-flex-fri',12)],
    6:[group(),bike('race-peak-bike-long','Bike · Race Simulation','Race fueling · pacing · aero position',180,PROGRAM_IRONMAN,'racepace'),run('race-peak-rotb-b','Run Off The Bike','Race-specific brick · controlled effort',30,2.75,PROGRAM_IRONMAN,'racepace'),flex('race-peak-flex-sat',10)],
    0:[group(),run('race-peak-run-long','Long Run','Endurance · controlled race-specific finish',90,8.5,PROGRAM_IRONMAN,'racepace'),flex('race-peak-flex-sun',20,true)]
  };
}

function taperWeek(){
  return {
    1:[group(),rest('taper-rest-mon','Rest / Recovery Day'),flex('taper-flex-mon',12)],
    2:[group(),swim('taper-swim-a','Swim · Sharpen','Reduced volume · keep feel for water',40,1600,PROGRAM_IRONMAN,'racepace'),bike('taper-bike-a','Bike · Sharpen','Reduced volume · short race-effort touches',45,PROGRAM_IRONMAN,'racepace'),flex('taper-flex-tue',8)],
    3:[group(),run('taper-run-a','Run · Sharpen','Easy running · short race-effort touches',35,3,PROGRAM_IRONMAN,'strides'),flex('taper-flex-wed',10)],
    4:[group(),swim('taper-swim-b','Swim · Easy Technique','Relaxed technique · low fatigue',30,1200,PROGRAM_IRONMAN,'technique'),bike('taper-bike-b','Bike · Easy','Short easy spin · stay loose',30,PROGRAM_IRONMAN,'easy'),flex('taper-flex-thu',8)],
    5:[group(),rest('taper-rest-fri','Rest Day'),flex('taper-flex-fri',10)],
    6:[group(),bike('taper-bike-open','Bike · Openers','Very short ride · a few brief efforts',20,PROGRAM_IRONMAN,'power'),run('taper-run-open','Run · Openers','Very short easy run · a few strides',10,0.75,PROGRAM_IRONMAN,'strides'),flex('taper-flex-sat',8)],
    0:[group(),rest('taper-rest-sun','Recovery / Race Eve'),flex('taper-flex-sun',10)]
  };
}

function raceDayWeek(){
  const daySessions=[
    session({id:'race-day',type:'other',program:PROGRAM_IRONMAN,title:'IRONMAN 70.3 Race Day',summary:'1.2 mi swim · 56 mi bike · 13.1 mi run',duration:null,progressive:false,instructions:['Use the race plan you have practiced in training.','Swim controlled and settle into rhythm.','Bike steady, fuel on schedule, and avoid over-biking early.','Start the run controlled and build only if the body is responding well.'],completionRule:'Execute the race plan from start to finish.'})
  ];
  return {0:daySessions,1:daySessions,2:daySessions,3:daySessions,4:daySessions,5:daySessions,6:daySessions};
}

function postRaceWeek(){
  return {
    1:[group(),rest('post-race-rest-mon','Post-Race Recovery'),flex('post-race-flex-mon',10)],
    2:[group(),rest('post-race-rest-tue','Post-Race Recovery')],
    3:[group(),session({id:'post-race-walk',type:'recovery',title:'Easy Walk / Spin',summary:'20 to 30 min only if it feels restorative',duration:25,progressive:false,instructions:['Choose walking or very easy spinning only if soreness is settling.','Stop if movement makes you feel worse.'],completionRule:'Finish feeling better than when you started.'}),flex('post-race-flex-wed',10)],
    4:[group(),rest('post-race-rest-thu','Recovery Day')],
    5:[group(),session({id:'post-race-easy',type:'recovery',title:'Easy Recovery Movement',summary:'Low effort · optional',duration:25,progressive:false,instructions:['Easy walk, spin, or swim only.','No structured intensity.'],completionRule:'Keep the session restorative.'})],
    6:[group(),session({id:'post-race-easy-sat',type:'recovery',title:'Easy Recovery Movement',summary:'Low effort · optional',duration:30,progressive:false,instructions:['Use an easy walk, spin, or swim.','Keep effort low and avoid testing fitness.'],completionRule:'Keep the session restorative.'})],
    0:[group(),rest('post-race-rest-sun','Recovery Day'),flex('post-race-flex-sun',15,true)]
  };
}

export function defaultPhaseTemplates(){
  const raw = {
    'definition-foundation':definitionWeek({easyDistance:1.5,qualityDistance:2,longDistance:3,bikeEasy:30,bikeQuality:35,strengthLevel:1,quality:'strides'}),
    'definition-base-1':definitionWeek({easyDistance:1.75,qualityDistance:2.25,longDistance:3.5,bikeEasy:35,bikeQuality:40,strengthLevel:2,quality:'intervals'}),
    'definition-base-2':definitionWeek({easyDistance:2,qualityDistance:2.5,longDistance:4,bikeEasy:40,bikeQuality:45,strengthLevel:3,quality:'tempo'}),
    'definition-peak':definitionWeek({easyDistance:2,qualityDistance:2.5,longDistance:3.5,bikeEasy:40,bikeQuality:45,strengthLevel:3,quality:'tempo',peak:true}),
    'transition':transitionWeek(),
    'tri-foundation':triFoundationWeek(),
    'tri-base':triBaseWeek(),
    'race-base':raceBaseWeek(),
    'race-build':raceBuildWeek(),
    'race-peak':racePeakWeek(),
    'race-taper':taperWeek(),
    'race-day':raceDayWeek(),
    'post-race':postRaceWeek()
  };
  const out={};
  for(const [key,week] of Object.entries(raw)) out[key]=prefixWeek(key,week);
  return out;
}

export const FIXED_PHASES = [
  {id:'phase-definition-foundation',planKey:'definition-foundation',name:'Foundation + Definition',startDate:'2026-08-26',endDate:'2026-09-20',program:'other',focus:['Consistency','Strength technique','Aerobic base','Flexibility'],notes:'Establish the routine without treating this as formal IRONMAN training.'},
  {id:'phase-definition-base-1',planKey:'definition-base-1',name:'Definition + Base I',startDate:'2026-09-21',endDate:'2026-10-18',program:'other',focus:['Muscle definition','Run base','Bike base','Flexibility'],notes:'Build visible strength and a larger aerobic base while keeping recovery controlled.'},
  {id:'phase-definition-base-2',planKey:'definition-base-2',name:'Definition + Base II',startDate:'2026-10-19',endDate:'2026-11-15',program:'other',focus:['Progressive strength','Aerobic durability','Body composition','Mobility'],notes:'Continue progressive overload and modest endurance growth before the final definition block.'},
  {id:'phase-definition-peak',planKey:'definition-peak',name:'Definition Peak',startDate:'2026-11-16',endDate:'2026-12-12',program:'other',focus:['Upper-body definition','Lean body composition','Maintain aerobic base','Freshness'],notes:'Keep building definition, then reduce fatigue during the final week so you arrive fresh for the December milestone.'},
  {id:'phase-transition',planKey:'transition',name:'Transition + Recovery',startDate:'2026-12-13',endDate:'2027-01-03',program:'other',focus:['Recovery','Easy aerobic work','Mobility','Reset'],notes:'Reduce accumulated fatigue before structured triathlon training begins.'},
  {id:'phase-tri-foundation',planKey:'tri-foundation',name:'Triathlon Foundation',startDate:'2027-01-04',endDate:'2027-02-28',program:'ironman',focus:['Swim technique','Bike consistency','Run durability','Strength maintenance'],notes:'Formal IRONMAN 70.3 training begins here. Build frequency and repeatability before race-specific work.'}
];

function dynamicRacePhases(raceDate){
  if(!raceDate) return [];
  const raceBaseStart=addDays(raceDate,-140);
  const raceBaseEnd=addDays(raceDate,-85);
  const buildStart=addDays(raceDate,-84);
  const buildEnd=addDays(raceDate,-36);
  const peakStart=addDays(raceDate,-35);
  const peakEnd=addDays(raceDate,-15);
  const taperStart=addDays(raceDate,-14);
  const taperEnd=addDays(raceDate,-1);
  return [
    {id:'phase-race-base',planKey:'race-base',name:'70.3 Base',startDate:raceBaseStart,endDate:raceBaseEnd,program:'ironman',focus:['Aerobic endurance','Swim-bike-run consistency','Bricks','Strength maintenance'],notes:'Eight-week race-specific base block.'},
    {id:'phase-race-build',planKey:'race-build',name:'70.3 Build',startDate:buildStart,endDate:buildEnd,program:'ironman',focus:['Race-specific endurance','Tempo / threshold','Long bike','Bricks'],notes:'Seven-week build with increasing specificity and controlled recovery.'},
    {id:'phase-race-peak',planKey:'race-peak',name:'70.3 Peak',startDate:peakStart,endDate:peakEnd,program:'ironman',focus:['Race simulations','Nutrition practice','Open-water confidence','Peak endurance'],notes:'Three-week peak before taper.'},
    {id:'phase-race-taper',planKey:'race-taper',name:'70.3 Taper',startDate:taperStart,endDate:taperEnd,program:'ironman',focus:['Reduce volume','Keep sharpness','Sleep','Race preparation'],notes:'Two-week taper with reduced volume and short race-effort touches.'},
    {id:'phase-race-day',planKey:'race-day',name:'Race Day',startDate:raceDate,endDate:raceDate,program:'ironman',focus:['Execute pacing','Fueling','Transitions','Finish'],notes:'IRONMAN 70.3 race day.'},
    {id:'phase-post-race',planKey:'post-race',name:'Post-Race Recovery',startDate:addDays(raceDate,1),endDate:addDays(raceDate,14),program:'other',focus:['Recovery','Sleep','Easy movement','No intensity'],notes:'Absorb the race before deciding what comes next.'}
  ];
}

export function resolvedPhaseTimeline(raceDate='',fixedPhases=FIXED_PHASES){
  const phases=fixedPhases.map(p=>({...p}));
  const baseStart='2027-03-01';
  if(raceDate){
    const dynamic=dynamicRacePhases(raceDate);
    const raceBase=dynamic.find(p=>p.planKey==='race-base');
    if(raceBase && raceBase.startDate>baseStart){
      phases.push({id:'phase-tri-base',planKey:'tri-base',name:'Triathlon Base Development',startDate:baseStart,endDate:addDays(raceBase.startDate,-1),program:'ironman',focus:['Aerobic volume','Bike durability','Run durability','Swim technique'],notes:'Continue building general triathlon durability until the 20-week race-specific block begins.'});
    }
    phases.push(...dynamic);
  } else {
    phases.push({id:'phase-tri-base',planKey:'tri-base',name:'Triathlon Base Development',startDate:baseStart,endDate:'',program:'ironman',focus:['Aerobic volume','Bike durability','Run durability','Swim technique'],notes:'Race-specific dates will be generated automatically when the primary 70.3 goal receives an exact race date.'});
  }
  return phases;
}

function weekIndexWithin(startDate,date){
  return Math.max(1,Math.floor(daysBetween(startDate,date)/7)+1);
}

function progressionFor(planKey,weekIndex){
  const cycle=[1,1.07,1.13,0.78];
  if(planKey==='definition-foundation') return [1,1.06,1.10,0.78][Math.min(3,weekIndex-1)] || 1;
  if(planKey==='definition-base-1') return cycle[(weekIndex-1)%4] * (1 + Math.floor((weekIndex-1)/4)*0.08);
  if(planKey==='definition-base-2') return cycle[(weekIndex-1)%4] * (1 + Math.floor((weekIndex-1)/4)*0.08);
  if(planKey==='definition-peak') return [1,1.03,0.92,0.65][Math.min(3,weekIndex-1)] || 0.65;
  if(planKey==='transition') return [0.75,0.8,0.85][Math.min(2,weekIndex-1)] || 0.85;
  if(planKey==='tri-foundation') return cycle[(weekIndex-1)%4] * (1 + Math.floor((weekIndex-1)/4)*0.12);
  if(planKey==='tri-base') return cycle[(weekIndex-1)%4] * (1 + Math.floor((weekIndex-1)/4)*0.10);
  if(planKey==='race-base') return cycle[(weekIndex-1)%4] * (1 + Math.floor((weekIndex-1)/4)*0.10);
  if(planKey==='race-build'){
    const values=[1,1.06,1.12,0.78,1.12,1.18,1.22];
    return values[Math.min(values.length-1,weekIndex-1)];
  }
  if(planKey==='race-peak') return [1.03,1.10,0.95][Math.min(2,weekIndex-1)] || 0.95;
  if(planKey==='race-taper') return weekIndex<=1?0.68:0.48;
  return 1;
}

export function resolvePlanContext(date,raceDate='',fixedPhases=FIXED_PHASES){
  const fixed=fixedPhases.find(p=>date>=p.startDate && date<=p.endDate);
  let phase=fixed;
  if(!phase && date>='2027-03-01'){
    const dynamic=dynamicRacePhases(raceDate);
    phase=dynamic.find(p=>date>=p.startDate && date<=p.endDate);
    if(!phase){
      const baseEnd = dynamic.find(p=>p.planKey==='race-base')?.startDate;
      if(!raceDate || !baseEnd || date<baseEnd){
        phase={id:'phase-tri-base',planKey:'tri-base',name:'Triathlon Base Development',startDate:'2027-03-01',endDate:baseEnd?addDays(baseEnd,-1):'',program:'ironman',focus:['Aerobic volume','Bike durability','Run durability','Swim technique'],notes:'Build repeatable triathlon fitness before the race-specific block.'};
      } else if(raceDate && date>addDays(raceDate,14)){
        phase={id:'phase-post-race-open',planKey:'post-race',name:'Post-Race / Next Goal',startDate:addDays(raceDate,1),endDate:'',program:'other',focus:['Recovery','Reassessment'],notes:'Use recovery first, then set the next training block.'};
      }
    }
  }
  if(!phase){
    phase={id:'phase-preplan',planKey:'definition-foundation',name:'Pre-plan',startDate:'',endDate:'',program:'other',focus:[],notes:''};
  }
  const weekIndex = phase.startDate ? weekIndexWithin(phase.startDate,date) : 1;
  const factor=progressionFor(phase.planKey,weekIndex);
  const cycleWeek=((weekIndex-1)%4)+1;
  const isRecoveryWeek=factor<0.9 || phase.planKey==='transition' || phase.planKey==='post-race';
  return {...phase,weekIndex,cycleWeek,progressionFactor:factor,isRecoveryWeek};
}

function roundDistance(value,unit){
  if(value==null) return value;
  if(unit==='yd') return Math.max(50,Math.round(value/50)*50);
  if(unit==='m') return Math.max(50,Math.round(value/50)*50);
  return Math.max(0.1,Math.round(value*10)/10);
}

function reduceStrengthLine(line){
  let out=line.replace(/\b([3-6])\s*[x×]\s*(?=\d)/i,(m,n)=>`${Math.max(2,Number(n)-1)} x `);
  out=out.replace(/\b([3-6])\s+(submax\s+)?sets\b/i,(m,n,sub='')=>`${Math.max(2,Number(n)-1)} ${sub||''}sets`);
  out=out.replace(/\b([3-6])\s+rounds\b/i,(m,n)=>`${Math.max(2,Number(n)-1)} rounds`);
  return out;
}

function progressStrengthLine(line,factor){
  if(factor<=1) return line;
  return line.replace(/\b(\d+)\s*[x×]\s*(\d+)(?:\s*[-–]\s*(\d+))?/i,(match,sets,lo,hi,offset,whole)=>{
    const after=whole.slice(offset+match.length,offset+match.length+20).toLowerCase();
    if(/^\s*(?:sec|second|seconds|min|minute|minutes)\b/.test(after)) return match;
    const repFactor=Math.min(1.10,1+Math.max(0,factor-1)*0.85);
    const low=Math.max(1,Math.round(Number(lo)*repFactor));
    const high=Math.max(low,Math.round(Number(hi||lo)*repFactor));
    return hi?`${sets} x ${low}-${high}`:`${sets} x ${low}`;
  });
}

export function applyProgression(template,context){
  const item=structuredClone(template);
  const factor=context?.progressionFactor || 1;
  if(item.progressive!==false){
    if(item.planned?.durationMin!=null && item.planned.durationMin>0){
      item.planned.durationMin=Math.max(10,Math.round(item.planned.durationMin*factor/5)*5);
    }
    if(item.planned?.distance!=null && item.planned.distance>0){
      item.planned.distance=roundDistance(item.planned.distance*factor,item.planned.distanceUnit);
    }
  }
  if(item.type==='strength' && String(context?.planKey||'').startsWith('definition-') && !context?.isRecoveryWeek && factor>1){
    item.instructions=(item.instructions||[]).map(line=>progressStrengthLine(line,factor));
  }
  if(item.type==='strength' && context?.isRecoveryWeek){
    item.instructions=(item.instructions||[]).map(reduceStrengthLine);
    if(item.planned?.durationMin) item.planned.durationMin=Math.max(15,Math.round(item.planned.durationMin*0.8/5)*5);
    item.summary=`Recovery load · ${item.summary}`;
  }
  if(context?.isRecoveryWeek && ['run','bike','swim'].includes(item.type)){
    item.summary=`Recovery week · ${item.summary}`;
  }
  item.planKey=context?.planKey || '';
  item.phaseName=context?.name || '';
  item.planWeek=context?.weekIndex || 1;
  return item;
}

export function strengthVolumeFromInstructions(instructions=[]){
  let sets=0,minReps=0,maxReps=0,countedLines=0;
  for(const raw of instructions){
    const line=String(raw);
    const lower=line.toLowerCase();
    let m=line.match(/\b(\d+)\s*[x×]\s*(\d+)(?:\s*[-–]\s*(\d+))?/i);
    if(m){
      const s=Number(m[1]);
      sets+=s;
      const after=line.slice(m.index+m[0].length,m.index+m[0].length+20).toLowerCase();
      const timedRep=/^\s*(?:sec|second|seconds|min|minute|minutes)\b/.test(after);
      if(!timedRep){
        let lo=Number(m[2]);
        let hi=Number(m[3]||m[2]);
        if(/each side|per side/.test(lower)){lo*=2;hi*=2;}
        minReps+=s*lo;maxReps+=s*hi;countedLines++;
      }
      continue;
    }
    m=line.match(/\b(\d+)\s+(?:submax\s+)?sets\b/i);
    if(m){sets+=Number(m[1]);continue;}
    m=line.match(/\b(\d+)\s+rounds\s+of\s+(\d+)/i);
    if(m){
      const s=Number(m[1]);sets+=s;
      const after=line.slice(m.index+m[0].length,m.index+m[0].length+20).toLowerCase();
      const timedRep=/^\s*(?:sec|second|seconds|min|minute|minutes)\b/.test(after);
      if(!timedRep){minReps+=s*Number(m[2]);maxReps+=s*Number(m[2]);countedLines++;}
    }
  }
  return {sets,minReps,maxReps,countedLines};
}

export function programLabel(value){
  return value===PROGRAM_IRONMAN?'IRONMAN training':'Other goals';
}
