const TARGET_DATE_DEFAULT='2027-02-01';

const DEFAULT_SUBJECTS=[
{id:'dm',name:'Discrete Maths / Eng. Maths',lecturesTotal:0,lecturesDone:0,dppTotal:0,dppDone:0},
{id:'c',name:'C Programming',lecturesTotal:0,lecturesDone:0,dppTotal:0,dppDone:0},
{id:'dsa',name:'Data Structures',lecturesTotal:0,lecturesDone:0,dppTotal:0,dppDone:0},
{id:'algo',name:'Algorithms',lecturesTotal:0,lecturesDone:0,dppTotal:0,dppDone:0},
{id:'dbms',name:'DBMS',lecturesTotal:0,lecturesDone:0,dppTotal:0,dppDone:0},
{id:'cn',name:'Computer Networks',lecturesTotal:0,lecturesDone:0,dppTotal:0,dppDone:0},
{id:'dl',name:'Digital Logic',lecturesTotal:0,lecturesDone:0,dppTotal:0,dppDone:0},
{id:'os',name:'Operating Systems',lecturesTotal:0,lecturesDone:0,dppTotal:0,dppDone:0},
{id:'coa',name:'Computer Organization & Arch.',lecturesTotal:0,lecturesDone:0,dppTotal:0,dppDone:0},
{id:'toc',name:'Theory of Computation',lecturesTotal:0,lecturesDone:0,dppTotal:0,dppDone:0},
{id:'cd',name:'Compiler Design',lecturesTotal:0,lecturesDone:0,dppTotal:0,dppDone:0}
];

const DEFAULT_PHASES=[
{start:'2026-08-01',end:'2026-08-20',title:'Phase 1',desc:'Complete CN, revise C, complete DSA'},
{start:'2026-08-21',end:'2026-09-10',title:'Phase 2',desc:'OS (priority block), revise others, complete Algorithms'},
{start:'2026-09-11',end:'2026-09-30',title:'Phase 3',desc:'COA, finish pending OS'},
{start:'2026-10-01',end:'2026-10-20',title:'Phase 4',desc:'TOC, pending COA, complete Digital Logic'},
{start:'2026-10-21',end:'2026-11-10',title:'Phase 5',desc:'Finish pending TOC, revise DBMS'},
{start:'2026-11-11',end:'2027-01-20',title:'Phase 6',desc:'Compiler Design + full rotation revision, PYQs, mocks'},
{start:'2027-01-21',end:'2027-02-01',title:'Phase 7',desc:'Taper — light revision only, no new content'}
];

let subjects=[],phases=[],activityDates=[],goalDate=TARGET_DATE_DEFAULT;
const LOCAL='gateTracker_v4';
const $=id=>document.getElementById(id);
const clone=x=>JSON.parse(JSON.stringify(x));
const todayISO=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};

let db=null,user=null,cloud=false;

function showAuth(msg=''){
  $('authGate').style.display='flex';
  $('authMsg').textContent=msg;
}
function hideAuth(){ $('authGate').style.display='none'; }

async function login(email,password){
  try{ await firebase.auth().signInWithEmailAndPassword(email,password); }
  catch(e){ $('authMsg').textContent=e.message; }
}
async function signup(email,password){
  try{ await firebase.auth().createUserWithEmailAndPassword(email,password); }
  catch(e){ $('authMsg').textContent=e.message; }
}
function configReady(){
  return window.FIREBASE_CONFIG &&
    window.FIREBASE_CONFIG.apiKey &&
    window.FIREBASE_CONFIG.projectId &&
    !String(window.FIREBASE_CONFIG.apiKey).includes('PASTE_');
}

async function initCloud(){
  if(!configReady()){
    setStatus('Local mode — configure Firebase for cloud sync');
    return false;
  }
  try{
    firebase.initializeApp(window.FIREBASE_CONFIG);
    db=firebase.firestore();
    const existing=await new Promise(resolve=>{
      const unsub=firebase.auth().onAuthStateChanged(u=>{unsub();resolve(u)});
    });
    if(!existing){
      showAuth();
      $('loginBtn').onclick=()=>login($('authEmail').value.trim(),$('authPassword').value);
      $('signupBtn').onclick=()=>signup($('authEmail').value.trim(),$('authPassword').value);
      return new Promise(resolve=>{
        const unsub=firebase.auth().onAuthStateChanged(u=>{
          if(u){unsub();user=u;cloud=true;hideAuth();setStatus('Cloud sync connected');resolve(true)}
        });
      });
    }
    user=existing;cloud=true;hideAuth();setStatus('Cloud sync connected');return true;
  }catch(e){
    console.error(e);
    setStatus('Cloud unavailable — local storage active');
    return false;
  }
}

function setStatus(x){ $('syncStatus').textContent=x; }

function normaliseSubjects(list){
  return (Array.isArray(list)?list:clone(DEFAULT_SUBJECTS)).map((s,i)=>{
    const base=DEFAULT_SUBJECTS[i]||{};
    return {
      id:s.id||base.id||('s'+i),
      name:s.name||base.name||('Subject '+(i+1)),
      lecturesTotal:Math.max(0,Number(s.lecturesTotal)||0),
      lecturesDone:Math.max(0,Number(s.lecturesDone)||0),
      dppTotal:Math.max(0,Number(s.dppTotal)||0),
      dppDone:Math.max(0,Number(s.dppDone)||0),
      _open:!!s._open
    };
  });
}

function localLoad(){
  try{
    const x=JSON.parse(localStorage.getItem(LOCAL)||'{}');
    subjects=normaliseSubjects(x.subjects);
    phases=Array.isArray(x.phases)&&x.phases.length?x.phases:clone(DEFAULT_PHASES);
    activityDates=Array.isArray(x.activityDates)
      ? [...new Set(x.activityDates)]
      : (Array.isArray(x.dailyLogs) ? [...new Set(x.dailyLogs.map(l=>l.date).filter(Boolean))] : []);
    goalDate=x.goalDate||TARGET_DATE_DEFAULT;
  }catch(e){
    subjects=clone(DEFAULT_SUBJECTS);phases=clone(DEFAULT_PHASES);activityDates=[];goalDate=TARGET_DATE_DEFAULT;
  }
}

function localSave(){
  localStorage.setItem(LOCAL,JSON.stringify({
    subjects,phases,activityDates,goalDate
  }));
}

async function loadData(){
  localLoad();
  if(cloud){
    try{
      const ref=db.collection('gateTracker').doc(user.uid);
      const snap=await ref.get();
      if(snap.exists){
        const x=snap.data();
        subjects=normaliseSubjects(x.subjects);
        phases=Array.isArray(x.phases)&&x.phases.length?x.phases:phases;
        activityDates=Array.isArray(x.activityDates)
          ? [...new Set(x.activityDates)]
          : (Array.isArray(x.dailyLogs) ? [...new Set(x.dailyLogs.map(l=>l.date).filter(Boolean))] : activityDates);
        goalDate=x.goalDate||goalDate;
        localSave();
      }else{
        await saveCloud();
      }
    }catch(e){console.error(e);}
  }
  renderAll();
}

async function saveCloud(){
  localSave();
  if(!cloud)return;
  try{
    await db.collection('gateTracker').doc(user.uid).set({
      subjects,phases,activityDates,goalDate,
      updatedAt:firebase.firestore.FieldValue.serverTimestamp()
    });
    setStatus('Saved · cloud sync connected');
  }catch(e){
    console.error(e);
    setStatus('Cloud save failed — local backup active');
  }
}
async function saveAll(){localSave();await saveCloud();}

function markToday(){
  const t=todayISO();
  if(!activityDates.includes(t)){
    activityDates.push(t);
    activityDates.sort();
  }
}

function computeStreak(){
  const dates=new Set(activityDates);
  let d=new Date();
  let iso=todayISO();
  let n=0;

  if(!dates.has(iso)){
    d.setDate(d.getDate()-1);
    iso=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  }
  while(dates.has(iso)){
    n++;
    d.setDate(d.getDate()-1);
    iso=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
    if(n>400)break;
  }
  return n;
}

/* Overall progress = every completed lecture + every completed DPP
   across every subject divided by every lecture + every DPP total. */
function subjectScore(s){
  const total=Number(s.lecturesTotal)+Number(s.dppTotal);
  const done=Math.min(Number(s.lecturesDone),Number(s.lecturesTotal))+
             Math.min(Number(s.dppDone),Number(s.dppTotal));
  return total>0?done/total:0;
}
function overallScore(){
  let total=0,done=0;
  subjects.forEach(s=>{
    total+=Number(s.lecturesTotal)+Number(s.dppTotal);
    done+=Math.min(Number(s.lecturesDone),Number(s.lecturesTotal))+
          Math.min(Number(s.dppDone),Number(s.dppTotal));
  });
  return total>0?done/total:0;
}

function renderAll(){
  renderCountdown();renderPhase();renderOverall();renderStats();renderPending();
  renderBars();renderSyllabus();renderPhases();
  $('goalDate').value=goalDate;
}

function renderCountdown(){
  const diff=Math.ceil((new Date(goalDate+'T00:00:00')-new Date())/86400000);
  $('daysLeft').textContent=Math.max(0,diff);
}
function renderPhase(){
  const now=todayISO();
  let p=phases.find(x=>now>=x.start&&now<=x.end);
  if(!p)p=now<phases[0].start?phases[0]:phases[phases.length-1];
  $('phaseTitle').textContent=p.title.toUpperCase()+' — '+p.start+' to '+p.end;
  $('phaseDesc').textContent=p.desc;
  const d=Math.ceil((new Date(p.end+'T00:00:00')-new Date())/86400000);
  $('phaseDaysLeft').textContent=d>0?d+' days left in phase':'phase ending';
}
function renderOverall(){
  const pct=Math.round(overallScore()*100);
  $('overallPct').textContent=pct+'%';
  $('overallBar').style.width=pct+'%';
}
function renderStats(){
  const totalL=subjects.reduce((a,s)=>a+Number(s.lecturesTotal),0);
  const doneL=subjects.reduce((a,s)=>a+Math.min(Number(s.lecturesDone),Number(s.lecturesTotal)),0);
  const totalD=subjects.reduce((a,s)=>a+Number(s.dppTotal),0);
  const doneD=subjects.reduce((a,s)=>a+Math.min(Number(s.dppDone),Number(s.dppTotal)),0);
  $('statLectures').textContent=doneL+' / '+totalL;
  $('statDpps').textContent=doneD+' / '+totalD;
  $('statStreak').textContent=computeStreak();
}
function pendingClass(p){return p>=70?'high':p>=40?'mid':'low'}
function renderPending(){
  $('pendingList').innerHTML=[...subjects]
    .map(s=>({name:s.name,pending:100-Math.round(subjectScore(s)*100)}))
    .sort((a,b)=>b.pending-a.pending)
    .map(x=>`<div class="pending-item"><span class="pn">${esc(x.name)}</span><span class="pending-badge ${pendingClass(x.pending)}">${x.pending}% pending</span></div>`)
    .join('')||'<div class="empty">No subjects.</div>';
}
function renderBars(){
  $('subjBars').innerHTML=subjects.map(s=>{
    const p=Math.round(subjectScore(s)*100);
    const done=Math.min(Number(s.lecturesDone),Number(s.lecturesTotal))+Math.min(Number(s.dppDone),Number(s.dppTotal));
    const total=Number(s.lecturesTotal)+Number(s.dppTotal);
    return `<div class="subject-bar-row">
      <div class="sb-top"><span>${esc(s.name)}</span><span>${p}% · ${done}/${total}</span></div>
      <div class="bar-sm"><div style="width:${p}%"></div></div>
    </div>`;
  }).join('');
}
function renderSyllabus(){
  $('subjectBlocks').innerHTML=subjects.map(s=>{
    const p=Math.round(subjectScore(s)*100);
    return `<div class="subject-block ${s._open?'open':''}">
      <div class="head" onclick="toggleSubject('${s.id}')">
        <div><div class="hn">${esc(s.name)}</div><div class="hs">${p}% overall · lectures + DPPs</div></div>
        <div class="chev">›</div>
      </div>
      <div class="body">
        <div class="ld-grid">
          <div class="ld-box">
            <div class="ld-title">Lectures</div>
            <div class="ld-inputs">
              <input type="number" min="0" step="1" value="${s.lecturesDone}" onchange="setSubject('${s.id}','lecturesDone',this.value)">
              <span>/</span>
              <input type="number" min="0" step="1" value="${s.lecturesTotal}" onchange="setSubject('${s.id}','lecturesTotal',this.value)">
            </div>
            <div class="ld-hint">completed / total</div>
          </div>
          <div class="ld-box">
            <div class="ld-title">DPPs</div>
            <div class="ld-inputs">
              <input type="number" min="0" step="1" value="${s.dppDone}" onchange="setSubject('${s.id}','dppDone',this.value)">
              <span>/</span>
              <input type="number" min="0" step="1" value="${s.dppTotal}" onchange="setSubject('${s.id}','dppTotal',this.value)">
            </div>
            <div class="ld-hint">completed / total</div>
          </div>
        </div>
        <div class="subject-total">
          Combined: ${Math.min(Number(s.lecturesDone),Number(s.lecturesTotal))+Math.min(Number(s.dppDone),Number(s.dppTotal))}
          / ${Number(s.lecturesTotal)+Number(s.dppTotal)}
        </div>
      </div>
    </div>`;
  }).join('');
}

function renderPhases(){
  $('phaseEditor').innerHTML=phases.map(p=>`
    <div class="phase-edit">
      <div class="form-row">
        <label>Phase title<input id="pt_${p.id}" value="${esc(p.title)}"></label>
        <label>Start<input id="ps_${p.id}" type="date" value="${p.start}"></label>
        <label>End<input id="pe_${p.id}" type="date" value="${p.end}"></label>
        <label>Description<input id="pd_${p.id}" value="${esc(p.desc)}"></label>
      </div>
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px">
        <button class="primary" onclick="savePhase('${p.id}')">Save phase</button>
        <button class="del-btn" onclick="deletePhase('${p.id}')">×</button>
      </div>
    </div>`).join('');
}

function toggleSubject(id){
  const s=subjects.find(x=>x.id===id);
  if(!s)return;
  s._open=!s._open;
  renderSyllabus();
}

async function setSubject(id,k,v){
  const s=subjects.find(x=>x.id===id);
  if(!s)return;
  let n=Math.max(0,Number(v)||0);
  if(k.endsWith('Total')){
    s[k]=n;
    const doneKey=k.replace('Total','Done');
    if(s[doneKey]>n)s[doneKey]=n;
  }else{
    const totalKey=k.replace('Done','Total');
    s[k]=Math.min(n,Number(s[totalKey])||0);
  }
  markToday();
  await saveAll();
  renderAll();
}

async function markTodayStudied(){
  markToday();
  await saveAll();
  renderAll();
}

async function savePhase(id){
  const p=phases.find(x=>x.id===id);
  if(!p)return;
  p.title=$('pt_'+id).value.trim()||p.title;
  p.start=$('ps_'+id).value||p.start;
  p.end=$('pe_'+id).value||p.end;
  p.desc=$('pd_'+id).value.trim();
  await saveAll();renderAll();
}
async function deletePhase(id){
  if(phases.length<=1){alert('Keep at least one phase.');return}
  if(confirm('Delete phase?')){
    phases=phases.filter(x=>x.id!==id);
    await saveAll();renderAll();
  }
}
async function addPhase(){
  phases.push({id:'p'+Date.now(),start:todayISO(),end:todayISO(),title:'New Phase',desc:'Edit this phase'});
  await saveAll();renderAll();
}
async function saveGoal(){
  goalDate=$('goalDate').value||TARGET_DATE_DEFAULT;
  await saveAll();renderAll();
}

$('markTodayBtn').addEventListener('click',markTodayStudied);
$('phaseAdd').addEventListener('click',addPhase);
$('saveGoal').addEventListener('click',saveGoal);

$('resetBtn').addEventListener('click',async()=>{
  if(!confirm('This clears all tracker data. Continue?'))return;
  subjects=clone(DEFAULT_SUBJECTS);
  phases=clone(DEFAULT_PHASES);
  activityDates=[];
  goalDate=TARGET_DATE_DEFAULT;
  await saveAll();renderAll();
});

$('logoutBtn').addEventListener('click',async()=>{
  if(cloud)await firebase.auth().signOut();
  location.reload();
});

document.querySelectorAll('.tab-btn').forEach(btn=>btn.addEventListener('click',()=>{
  document.querySelectorAll('.tab-btn').forEach(x=>x.classList.remove('active'));
  document.querySelectorAll('.view').forEach(x=>x.classList.remove('active'));
  btn.classList.add('active');
  $('view-'+btn.dataset.view).classList.add('active');
}));

function esc(x){
  return String(x??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

(async()=>{await initCloud();await loadData()})();
