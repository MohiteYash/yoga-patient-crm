import React, {useEffect, useRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {invoke} from '@tauri-apps/api/core';
import {Activity, ArrowLeft, BarChart3, CalendarDays, CheckCircle2, ClipboardList, Download, FileText, FolderOpen, HeartPulse, RefreshCw, LayoutDashboard, Plus, Search, Settings, Users, X, AlertCircle, Moon, Sun, Trash2, CreditCard, Wallet} from 'lucide-react';
import './styles.css';
import './polish.css';
import './responsive.css';
import {Appointment, Exercise, Expense, Page, Patient, Payment, Tab} from './types';
import {addDays, dateLabel, dayLabel, greeting, isNum, money, monthKey, monthLabel, num, patientId, sortDateAsc, sortDateDesc, sumBy, timeLabel, today, uid, weekDay} from './lib/format';
import {GENDERS, normalize} from './lib/fields';
import {Err, K, LABEL, exportRaw, readList, writeList} from './lib/storage';
import {balanceOf, creditOf, feeOf, paidOf, statusOf, withFee, withPaid} from './lib/payment';
import {PdfKind, savePatientPdf} from './lib/pdf';
import {Badge, Confirm, Empty, Field, Metric, Stat, useEscape} from './components/ui';
import {Appointments} from './components/Appointments';
import {Expenses} from './components/Expenses';
import {Visits} from './components/Visits';
import {Timeline} from './components/Timeline';
import {Progress} from './components/Progress';
import {PaymentHistory} from './components/PaymentHistory';
import {Xrays} from './components/Xrays';
import {EditPatient, IntakeAnswer} from './components/EditPatient';
import {BackupSettings} from './components/BackupSettings';
import {PdfOutputSettings} from './components/PdfOutputSettings';
import {INTAKE_LABELS, INTAKE_SECTIONS} from './lib/intake';
import {buildAgeProfile} from './lib/ageAnalytics';

const fullIntakeAnswers:Record<string,string>=Object.fromEntries(INTAKE_SECTIONS.flatMap(section=>section.questions.map(q=>[q.key,q.kind==='multi'?(q.key==='redFlags'?'No red flags reported':q.key==='therapyGoals'?(q.options||[]).slice(0,3).join(' | '):(q.options||[]).slice(0,1).join(' | ')):q.kind==='date'?'1988-04-16':q.options?.[0]||'Fictional test response'])));
const sample:Patient[]=[
 {id:'YC-1001',name:'TEST ONLY — Aarav Sharma',age:42,gender:'Male',phone:'+91 98765 43210',visitDate:'2026-09-21',condition:'Lower back pain',painBefore:8,painAfter:4,mobilityBefore:'Restricted',mobilityAfter:'Improved',notes:'Fictional sample record for testing.',diagnosis:'Lumbar posture-related pain',doctor:'Dr. Pradnesh Naikwade',planMonths:3,followUpDate:'2026-12-21',status:'Active',xray:{},exercises:[{name:'Bhujangasana',frequency:'2x daily',duration:'30 sec x 3',notes:'Gentle range only'},{name:'Setu Bandhasana',frequency:'1x daily',duration:'10 reps',notes:'Controlled movement'},{name:'Marjaryasana-Bitilasana',frequency:'2x daily',duration:'10 reps',notes:'Slow breathing'}]},
 {id:'YC-1002',name:'TEST ONLY — Sneha Patil',age:35,gender:'Female',phone:'+91 91234 56789',visitDate:'2026-08-28',condition:'Cervical discomfort',painBefore:7,painAfter:2,mobilityBefore:'Restricted',mobilityAfter:'Good',notes:'Fictional sample record for testing.',diagnosis:'Cervical strain',doctor:'Dr. Pradnesh Naikwade',planMonths:3,followUpDate:'2026-11-28',status:'Follow-up',xray:{},exercises:[{name:'Neck Isometric',frequency:'2x daily',duration:'5 reps',notes:'No pain during exercise'},{name:'Tadasana',frequency:'1x daily',duration:'60 sec',notes:'Posture focus'}]},
 {id:'YC-1003',name:'TEST ONLY — Rohan Kulkarni',age:51,gender:'Male',phone:'+91 99887 77665',visitDate:'2026-06-10',condition:'Knee pain',painBefore:6,painAfter:1,mobilityBefore:'Moderate',mobilityAfter:'Good',notes:'Fictional sample record for testing.',diagnosis:'Knee mobility limitation',doctor:'Dr. Rao',planMonths:3,followUpDate:'2026-09-10',status:'Completed',xray:{},exercises:[{name:'Chair-supported squat',frequency:'1x daily',duration:'8 reps',notes:'Use support'},{name:'Vrikshasana',frequency:'1x daily',duration:'30 sec/side',notes:'Balance focus'}]},
 {id:'YC-TEST-001',name:'TEST ONLY — Asha Example',age:38,gender:'Female',phone:'9990000000',visitDate:'2026-10-01',condition:'Fictional lower back stiffness',painBefore:4,mobilityBefore:'Mildly restricted',notes:'Completely fictional record for testing the full patient intake form. Do not use as a real patient.',diagnosis:'Fictional test diagnosis',doctor:'Dr. Pradnesh Naikwade',planMonths:3,followUpDate:'2026-12-30',status:'Active',xray:{},exercises:[],history:fullIntakeAnswers}
];
const variedDemoHistory=(n:number):Record<string,string>=>Object.fromEntries(INTAKE_SECTIONS.flatMap(section=>section.questions.map(q=>[q.key,q.kind==='multi'?(q.key==='redFlags'?'No red flags reported':(q.options||[]).slice(n%(q.options?.length||1),n%(q.options?.length||1)+2).join(' | ')||q.options?.[n%(q.options?.length||1)]||'Fictional response'):q.kind==='date'?'1988-04-16':q.options?.[n%(q.options.length||1)]||`Fictional test response ${n}`])));
sample.push(...Array.from({length:46},(_,i)=>{const n=i+5,visitDate=`2026-${String((i%9)+1).padStart(2,'0')}-${String((i%28)+1).padStart(2,'0')}`,conditions=['Lower back stiffness','Neck discomfort','Knee mobility','Shoulder tension','Posture and flexibility'][i%5];return{id:`YC-DEMO-${String(n).padStart(3,'0')}`,name:`TEST ONLY — Patient ${String(n).padStart(2,'0')}`,age:24+(i*7)%50,gender:['Female','Male','Non-binary'][i%3],phone:`99900${String(10000+n)}`,visitDate,condition:`Fictional ${conditions.toLowerCase()}`,painBefore:i%10+1,mobilityBefore:['Good','Mildly restricted','Moderate'][i%3],notes:'Entirely fictional demo record generated for software testing. Not a real patient.',diagnosis:`Fictional ${conditions.toLowerCase()} assessment`,doctor:'Dr. Pradnesh Naikwade',planMonths:3,followUpDate:addDays(visitDate,90),status:['Active','Follow-up','Completed'][i%3] as Patient['status'],xray:{},exercises:[],history:variedDemoHistory(n)}}));
sample.forEach((p,i)=>{const fee=6000+(i%6)*1500,paid=[fee,Math.round(fee*.5),0,Math.round(fee*.75)][i%4],payDate=p.visitDate;p.fee=fee;p.paid=paid;p.paymentStatus=paid===fee?'Done':paid===0?'Pending':'Partially paid';p.payments=paid?[{id:`DEMO-PAY-${p.id}`,patientId:p.id,amount:paid,date:payDate,paymentMethod:(['Cash','UPI','Card','Bank Transfer'] as Payment['paymentMethod'][])[i%4],reference:`TEST-${String(i+1).padStart(3,'0')}`,notes:'Fictional demo payment.',createdAt:`${payDate}T10:00:00.000Z`}]:[];p.visits=[{id:`DEMO-VISIT-${p.id}-1`,patientId:p.id,date:payDate,visitType:'Initial assessment',painScore:p.painBefore,mobility:4+(i%6),treatment:'Fictional assessment and breathing practice.',exercises:'Gentle mobility practice',notes:'Fictional demo visit.',createdAt:`${payDate}T09:00:00.000Z`},{id:`DEMO-VISIT-${p.id}-2`,patientId:p.id,date:addDays(payDate,14),visitType:'Follow-up',painScore:Math.max(0,p.painBefore-2),mobility:6+(i%5),treatment:'Fictional follow-up session.',exercises:'Continue home practice',notes:'Fictional follow-up.',createdAt:`${addDays(payDate,14)}T09:00:00.000Z`}];p.planLog=[{id:`DEMO-PLAN-${p.id}`,date:payDate,months:3}];if(!p.exercises.length)p.exercises=[{name:'TEST ONLY — Gentle mobility sequence',frequency:'1x daily',duration:'10 minutes',notes:'Fictional demo plan.'}]});
const demoAppointmentsFor=(rows:Patient[]):Appointment[]=>rows.map((p,i)=>{const date=addDays(today(),(i%28)+1);return{id:`DEMO-APPT-${p.id}`,patientId:p.id,date,startTime:['09:00','10:30','14:00','16:00'][i%4],endTime:['09:45','11:15','14:45','16:45'][i%4],type:['Initial assessment','Follow-up','Therapy session'][i%3],status:['Scheduled','Completed'][i%2] as Appointment['status'],notes:'Fictional demo appointment.',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()}});
const demoExpensesFor=(rows:Patient[]):Expense[]=>rows.filter((_,i)=>i%5===0).map((p,i)=>({id:`DEMO-EXP-${p.id}`,date:p.visitDate,category:(['Supplies','Equipment','Utilities','Marketing'] as Expense['category'][])[i%4],description:`TEST ONLY — ${['Therapy supplies','Yoga props','Clinic utilities','Patient education'][i%4]}`,amount:500+(i%8)*250,paymentMethod:(['Cash','UPI','Card'] as Expense['paymentMethod'][])[i%3],patientId:p.id,notes:'Fictional demo expense.',createdAt:`${p.visitDate}T12:00:00.000Z`}));

const load=()=>readList<Patient>(K.patients,LABEL.patients,[]);
const loadAppts=()=>readList<Appointment>(K.appointments,LABEL.appointments,[]);
const loadSpend=()=>readList<Expense>(K.expenses,LABEL.expenses,[]);
function App(){
 const [boot]=useState(()=>{const p=load(),a=loadAppts(),e=loadSpend();return{patients:p.data,appts:a.data,expenses:e.data,errs:[p.err,a.err,e.err].filter(Boolean) as Err[]}});
 const [patients,setPatients]=useState<Patient[]>(boot.patients); const [appts,setAppts]=useState<Appointment[]>(boot.appts); const [expenses,setExpenses]=useState<Expense[]>(boot.expenses);
 const [readErr,setReadErr]=useState<Err[]>(boot.errs); const [writeErr,setWriteErr]=useState<Err[]>([]);
 const [page,setPage]=useState<Page>('dashboard'); const [selected,setSelected]=useState<string|null>(null); const [search,setSearch]=useState(''); const [showNew,setShowNew]=useState(false); const [theme,setTheme]=useState(localStorage.getItem(K.theme)||'light');
 const searchRef=useRef<HTMLInputElement>(null);
 const blocked=(k:string)=>readErr.some(e=>e.key===k);
 const save=(k:string,label:string,msg:string)=>setWriteErr(a=>{const i=a.findIndex(e=>e.key===k);if(i<0)return msg?[...a,{key:k,label,msg}]:a;if(!msg)return a.filter(e=>e.key!==k);return a[i].msg===msg?a:[...a.slice(0,i),{key:k,label,msg},...a.slice(i+1)]});
  const persist=(k:string)=>writeList(k,k===K.patients?patients:k===K.appointments?appts:expenses);
 useEffect(()=>{if(!blocked(K.patients))save(K.patients,LABEL.patients,writeList(K.patients,patients))},[patients]);
 useEffect(()=>{if(!blocked(K.appointments))save(K.appointments,LABEL.appointments,writeList(K.appointments,appts))},[appts]);
 useEffect(()=>{if(!blocked(K.expenses))save(K.expenses,LABEL.expenses,writeList(K.expenses,expenses))},[expenses]);
 useEffect(()=>{const h=(e:KeyboardEvent)=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();searchRef.current?.focus()}};window.addEventListener('keydown',h);return()=>window.removeEventListener('keydown',h)},[]);
 const active=patients.find(p=>p.id===selected)||null;
 const openPatient=(id:string)=>{setSelected(id);setPage('patient')};
 const update=(p:Patient)=>setPatients(a=>a.map(x=>x.id===p.id?p:x));
 useEffect(()=>{document.documentElement.dataset.theme=theme;localStorage.setItem(K.theme,theme)},[theme]);
 const errs=readErr.concat(writeErr);
 const [pdfPending, setPdfPending] = useState<PdfKind | null>(null);
 const [pdfNotice, setPdfNotice] = useState<{message: string; path?: string; error?: string} | null>(null);
 async function exportPatientPdf(patient: Patient, kind: PdfKind) {
  if (pdfPending) return;
  const label = kind === 'intake' ? 'Patient intake PDF' : 'Patient report PDF';
  setPdfPending(kind);
  setPdfNotice(null);
  try {
   const path = await savePatientPdf(patient, kind);
   setPdfNotice({message: path ? label + ' saved successfully.' : label + ' download started.', path: path ?? undefined});
  } catch {
   setPdfNotice({message: label + ' could not be saved.', error: 'Check the PDF output folder in Settings and available disk space, then try again.'});
  } finally {
   setPdfPending(null);
  }
 }
 function openExportFolder() {
  if (!pdfNotice?.path) return;
  invoke('plugin:opener|reveal_item_in_dir', {paths: [pdfNotice.path]}).catch(() => {
   setPdfNotice(current => current === pdfNotice ? {...current, error: 'The export folder could not be opened.'} : current);
  });
 }
 return <div className="app"><Sidebar page={page} setPage={p=>{setPage(p);if(p!=='patient')setSelected(null)}} onNew={()=>setShowNew(true)}/><main className="main"><Topbar search={search} setSearch={setSearch} inputRef={searchRef} onNew={()=>setShowNew(true)} theme={theme} toggleTheme={()=>setTheme(theme==='light'?'dark':'light')}/>{errs.length>0&&<div className="alertBanner" role="alert">{errs.map((e,i)=><div className="alertRow" key={e.key+i}><AlertCircle size={17}/><span><b>{e.label}</b> {e.msg}{readErr.some(r=>r.key===e.key)&&' Restore a backup from Settings to re-enable saving.'}</span>{readErr.some(r=>r.key===e.key)?<button className="secondary" onClick={()=>exportRaw(e.key,e.label)}><Download size={15}/> Export raw data</button>:<button className="secondary" onClick={()=>save(e.key,e.label,persist(e.key))}><RefreshCw size={15}/> Retry save</button>}</div>)}</div>}{page==='dashboard'&&<Dashboard patients={patients} appointments={appts} expenses={expenses} onOpen={openPatient} onSetPage={setPage}/>} {page==='patients'&&<Patients patients={patients} search={search} onOpen={openPatient} onNew={()=>setShowNew(true)}/>} {page==='patient'&&active&&<PatientDetail key={active.id} patient={active} update={update} appointments={appts} back={()=>setPage('patients')} onExport={kind => void exportPatientPdf(active, kind)} pdfPending={pdfPending}/>} {page==='appointments'&&<Appointments appointments={appts} setAppointments={setAppts} patients={patients} onOpen={openPatient}/>} {page==='payments'&&<Payments patients={patients} update={update} onOpen={openPatient}/>} {page==='expenses'&&<Expenses expenses={expenses} setExpenses={setExpenses} patients={patients}/>} {page==='outcomes'&&<Outcomes patients={patients}/>} {page==='settings'&&<SettingsPage patients={patients} setPatients={setPatients} appointments={appts} setAppointments={setAppts} expenses={expenses} setExpenses={setExpenses} onRestore={keys=>setReadErr(a=>a.filter(e=>keys.indexOf(e.key)<0))} sample={sample}/>} </main>{showNew&&<NewPatient onClose={()=>setShowNew(false)} onCreate={p=>{const n={...p,id:patientId(patients.map(x=>x.id))};setPatients(a=>[n,...a]);setShowNew(false);openPatient(n.id)}}/>}
 {pdfNotice && <aside className="pdfNotice" aria-label="PDF export">
  <div className="pdfNoticeDetails" role={pdfNotice.error ? 'alert' : 'status'}>
   <strong>{pdfNotice.message}</strong>
   {pdfNotice.path && <span className="pdfNoticePath">{pdfNotice.path}</span>}
   {pdfNotice.error && <span>{pdfNotice.error}</span>}
  </div>
  {pdfNotice.path && <button className="secondary" onClick={openExportFolder}><FolderOpen size={16}/> Open folder</button>}
  <button className="close" aria-label="Dismiss PDF notification" onClick={() => setPdfNotice(null)}><X size={18}/></button>
 </aside>}
 </div>
}
function Sidebar({page,setPage,onNew}:{page:string;setPage:(p:any)=>void;onNew:()=>void}){return <aside className="sidebar"><div className="brand"><div className="brandmark"><HeartPulse size={20}/></div><div><b>YogaCare</b><span>Patient CRM</span></div></div><button className="newBtn" title="New patient" aria-label="New patient" onClick={onNew}><Plus size={17}/><span>New patient</span></button><nav><Nav icon={<LayoutDashboard/>} label="Dashboard" active={page==='dashboard'} onClick={()=>setPage('dashboard')}/><Nav icon={<Users/>} label="Patients" active={page==='patients'||page==='patient'} onClick={()=>setPage('patients')}/><Nav icon={<CalendarDays/>} label="Appointments" active={page==='appointments'} onClick={()=>setPage('appointments')}/><Nav icon={<CreditCard/>} label="Payments" active={page==='payments'} onClick={()=>setPage('payments')}/><Nav icon={<Wallet/>} label="Expenses" active={page==='expenses'} onClick={()=>setPage('expenses')}/><Nav icon={<BarChart3/>} label="Outcomes" active={page==='outcomes'} onClick={()=>setPage('outcomes')}/></nav><div className="sideBottom"><Nav icon={<Settings/>} label="Settings" active={page==='settings'} onClick={()=>setPage('settings')}/><div className="doctor"><div className="avatar">PN</div><div><b>Dr. Pradnesh Naikwade</b><span>Yoga therapist</span></div></div></div></aside>}
function Nav({icon,label,active,onClick}:{icon:React.ReactNode;label:string;active:boolean;onClick:()=>void}){return <button className={'nav '+(active?'active':'')} title={label} aria-label={label} aria-current={active?'page':undefined} onClick={onClick}><span aria-hidden="true">{icon}</span><span>{label}</span></button>}
function Topbar({search, setSearch, inputRef, onNew, theme, toggleTheme}: {search: string; setSearch: (value: string) => void; inputRef: React.RefObject<HTMLInputElement | null>; onNew: () => void; theme: string; toggleTheme: () => void}) {
 const [date, setDate] = useState(() => new Date());
 useEffect(() => {
  let timer: number;
  const refresh = () => {
   window.clearTimeout(timer);
   const now = new Date();
   setDate(now);
   timer = window.setTimeout(refresh, 60000 - (now.getSeconds() * 1000 + now.getMilliseconds()));
  };
  refresh();
  window.addEventListener('focus', refresh);
  document.addEventListener('visibilitychange', refresh);
  return () => {
   window.clearTimeout(timer);
   window.removeEventListener('focus', refresh);
   document.removeEventListener('visibilitychange', refresh);
  };
 }, []);

 return <header className="topbar">
  <div className="topbarHeading">
   <div className="dateStamp">{date.toLocaleDateString('en-IN', {weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'})}</div>
   <h1>{greeting(date)}, Dr. Pradnesh Naikwade</h1>
   <p>Track patient progress from first visit to follow-up.</p>
  </div>
  <div className="topActions">
   <div className="search"><Search size={17} aria-hidden="true"/><input ref={inputRef} aria-label="Search patients by name, phone or ID" placeholder="Search by name, phone or ID" value={search} onChange={e => setSearch(e.target.value)}/></div>
   <button className="iconBtn" title="Toggle theme" aria-label="Toggle theme" onClick={toggleTheme}>{theme === 'light' ? <Moon/> : <Sun/>}</button>
   <button className="iconBtn" title="Add patient" aria-label="Add patient" onClick={onNew}><Plus/></button>
  </div>
 </header>;
}
function Dashboard({patients,appointments,expenses,onOpen,onSetPage}:{patients:Patient[];appointments:Appointment[];expenses:Expense[];onOpen:(id:string)=>void;onSetPage:(p:Page)=>void}){const t=today();const painRecords=patients.map(p=>({p,after:(p.visits||[]).filter(v=>isNum(v.painScore)).sort((a,b)=>(b.date+(b.createdAt||'')).localeCompare(a.date+(a.createdAt||'')))[0]?.painScore??p.painAfter})).filter(x=>isNum(x.after));const avg=painRecords.length?Math.round(painRecords.reduce((sum,x)=>sum+x.p.painBefore-(x.after as number),0)/painRecords.length*10)/10:0;const improved=painRecords.filter(x=>(x.after as number)<x.p.painBefore).length;const todays=appointments.filter(a=>a.date===t).sort((a,b)=>(a.startTime||'').localeCompare(b.startTime||''));const upcoming=appointments.filter(a=>a.status==='Scheduled'&&(a.date>t||(a.date===t&&(a.startTime||'')>=new Date().toTimeString().slice(0,5)))).sort((a,b)=>(a.date+(a.startTime||'')).localeCompare(b.date+(b.startTime||'')));const nextUp=upcoming.slice(0,5);const outstanding=sumBy(patients,p=>balanceOf(p));const collected=sumBy(patients,p=>sumBy((p.payments||[]).filter(x=>x.date===t),x=>num(x.amount)));const monthSpend=sumBy(expenses.filter(x=>monthKey(x.date)===monthKey(t)),x=>num(x.amount));const nameOf=(id:string)=>{const q=patients.find(p=>p.id===id);return q?q.name:'Unknown patient'};const go=(pid:string)=>{if(patients.some(x=>x.id===pid))onOpen(pid)};return <section className="content"><div className="hero"><div><span className="eyebrow">CLINIC OVERVIEW</span><h2>Patient outcomes at a glance</h2><p>Monitor pain, mobility, treatment plans and X-ray follow-ups in one place.</p></div><div className="heroStat"><span>Average pain change</span><strong>{avg>0?'+':''}{avg}</strong><small>points across recorded follow-ups</small></div></div><div className="stats"><Stat icon={<Users/>} label="Total patients" value={patients.length} tone="blue"/><Stat icon={<Activity/>} label="Active plans" value={patients.filter(p=>p.status==='Active').length} tone="green"/><Stat icon={<CalendarDays/>} label="Upcoming visits" value={upcoming.length} tone="red"/><Stat icon={<CheckCircle2/>} label="Improved pain" value={improved} tone="green"/></div><div className="stats"><Stat icon={<CalendarDays/>} label="Appointments today" value={todays.length} tone="blue"/><Stat icon={<CreditCard/>} label="Outstanding" tone="red" text={money(outstanding)}/><Stat icon={<CheckCircle2/>} label="Collected today" tone="green" text={money(collected)}/><Stat icon={<Wallet/>} label={monthLabel(t)+' expenses'} tone="blue" text={money(monthSpend)}/></div><div className="grid2"><div className="card"><div className="cardHead"><div><h3>Recent patients</h3><p>Latest clinical records</p></div><button className="linkBtn" onClick={()=>onSetPage('patients')}>View all</button></div><div className="table"><div className="tr th"><span>Patient</span><span>Condition</span><span>Pain</span><span>Status</span></div>{patients.slice(0,5).map(p=><button className="tr row" key={p.id} onClick={()=>onOpen(p.id)}><span><b>{p.name}</b><small>{p.id}  |  {p.age} yrs</small></span><span>{p.condition}</span><span><b>{p.painBefore}</b><span className="muted"> to {p.painAfter??'-'}</span></span><span><Badge status={p.status}/></span></button>)}</div></div><div className="card">
<div className="cardHead"><div><h3>Upcoming scheduled visits</h3><p>Showing the next {Math.min(5,upcoming.length)} of {upcoming.length} scheduled visits</p></div><CalendarDays size={18}/></div>
{nextUp.length?<div className="followList">{nextUp.map(a=><button key={a.id} onClick={()=>go(a.patientId)} className="follow"><div className="dateBox"><b>{dayLabel(a.date).split(' ')[0]}</b><span>{dayLabel(a.date).split(' ')[1]} · {timeLabel(a.startTime)}</span></div><div><b>{nameOf(a.patientId)}</b><span>{a.type}</span></div><span className="arrow">Open</span></button>)}</div>:<Empty icon={<CalendarDays size={22}/>} text="No upcoming scheduled visits" hint="New scheduled appointments will appear here."/>}
</div><div className="card scheduleCard"><div className="cardHead"><div><h3>Today's schedule</h3><p>{dateLabel(t)}  |  {todays.length} appointment{todays.length===1?'':'s'}</p></div><button className="linkBtn" onClick={()=>onSetPage('appointments')}>Open appointments</button></div>{todays.length?<div className="apptList">{todays.map(a=><button className="apptRow" key={a.id} onClick={()=>go(a.patientId)}><span className="apptTime">{timeLabel(a.startTime)}<small>{timeLabel(a.endTime)}</small></span><span className="apptInfo"><b>{nameOf(a.patientId)}</b><small>{a.type}</small></span><Badge status={a.status}/></button>)}</div>:<div className="scheduleEmptyLayout"><div className="scheduleEmpty"><span className="scheduleEmptyIcon"><CalendarDays size={19}/></span><div><b>No appointments today</b><p>Your schedule is clear for today.</p></div><button className="linkBtn" onClick={()=>onSetPage("appointments")}>Add appointment <span aria-hidden="true">?</span></button></div><ActivitySnapshot patients={patients}/></div>}</div></div></section>}
function Patients({patients,search,onOpen,onNew}:{patients:Patient[];search:string;onOpen:(id:string)=>void;onNew:()=>void}){const list=patients.filter(p=>(p.name+' '+p.id+' '+p.condition+' '+p.phone).toLowerCase().includes(search.toLowerCase()));return <section className="content"><div className="pageTitle"><div><span className="eyebrow">PATIENT CRM</span><h2>Patients</h2><p>{patients.length} patient records</p></div><button className="primary" onClick={onNew}><Plus size={17}/> New patient</button></div><div className="card patientCard"><div className="table wide"><div className="tr th"><span>Patient</span><span>Contact</span><span>Condition</span><span>Initial pain</span><span>Follow-up</span><span>Status</span></div>{list.map(p=><button className="tr row" key={p.id} onClick={()=>onOpen(p.id)}><span><b>{p.name}</b><small>{p.id}  |  {p.age} yrs  |  {p.gender}</small></span><span>{p.phone}</span><span>{p.condition}</span><span><b>{p.painBefore}/10</b>{isNum(p.painAfter)&&p.painAfter<p.painBefore&&<small className="greenText"> {p.painBefore-p.painAfter} pts better</small>}</span><span>{p.followUpDate}</span><span><Badge status={p.status}/></span></button>)}</div></div></section>}
function PatientDetail({patient: p, update, appointments, back, onExport, pdfPending}: {patient: Patient; update: (p: Patient) => void; appointments: Appointment[]; back: () => void; onExport: (kind: PdfKind) => void; pdfPending: PdfKind | null}) {
 const [tab, setTab] = useState<Tab>('overview');
 const [editing, setEditing] = useState(false);
 const lastVisit = (p.visits || []).reduce((latest, visit) => visit.date > latest ? visit.date : latest, p.visitDate || '');
 const tabButton = (id: Tab, label: string) => <button role="tab" aria-selected={tab === id} className={tab === id ? 'sel' : ''} onClick={() => setTab(id)}>{label}</button>;
 return <section className="content">
  <button className="back" onClick={back}><ArrowLeft size={17}/> Patients</button>
  <div className="patientHeader">
   <div className="patientIdentity">
    <div className="bigAvatar">{p.name.split(' ').map(word => word[0]).join('').slice(0, 2)}</div>
    <div>
     <div className="nameLine"><h2>{p.name}</h2><Badge status={p.status}/></div>
     <p>{p.id}  |  {p.age} years  |  {p.gender}  |  {p.phone}</p>
     <span className="mini">Last visit {lastVisit || 'not recorded'}</span>
    </div>
   </div>
   <div className="headerBtns">
    <button className="secondary" onClick={() => setEditing(true)}>Edit patient</button>
    <button className="secondary" disabled={pdfPending !== null} onClick={() => onExport('intake')}><FileText size={17}/> {pdfPending === 'intake' ? 'Saving…' : 'Intake PDF'}</button>
    <button className="primary" disabled={pdfPending !== null} onClick={() => onExport('report')}><Download size={17}/> {pdfPending === 'report' ? 'Saving…' : 'Export PDF'}</button>
   </div>
  </div>
  <div className="tabs" role="tablist" aria-label="Patient record">
   {tabButton('overview', 'Overview')}{tabButton('visits', 'Visits')}{tabButton('timeline', 'Timeline')}{tabButton('plan', 'Exercise plan')}
   {tabButton('imaging', 'X-rays')}{tabButton('progress', 'Progress')}{tabButton('payments', 'Payments')}{tabButton('report', 'Outcome report')}
  </div>
  {tab === 'overview' ? <Overview p={p}/> : tab === 'visits' ? <Visits p={p} update={update}/> : tab === 'timeline' ? <Timeline p={p} appointments={appointments}/>
   : tab === 'plan' ? <Plan p={p} update={update}/> : tab === 'imaging' ? <Xrays p={p} update={update}/> : tab === 'progress' ? <Progress p={p}/>
   : tab === 'payments' ? <PaymentHistory p={p} update={update}/> : <Report p={p} onExport={() => onExport('report')} pdfPending={pdfPending}/>}
  {editing && <EditPatient patient={p} onClose={() => setEditing(false)} onSave={patient => {update(patient); setEditing(false)}}/>}
 </section>;
}
function Overview({p}:{p:Patient}){const delta=isNum(p.painAfter)?p.painBefore-p.painAfter:null;const history=Object.entries(p.history||{}).filter(([,v])=>v);return <div className="detailGrid"><div className="card"><div className="cardHead"><div><h3>Clinical snapshot</h3><p>Initial assessment and current outcome</p></div><ClipboardList size={18}/></div><div className="snapshot"><Metric label="Pain score" before={p.painBefore} after={p.painAfter} suffix="/10"/><Metric label="Mobility" text={p.mobilityBefore} afterText={p.mobilityAfter}/><Metric label="Plan duration" text={p.planMonths+' months'}/><Metric label="Follow-up" text={p.followUpDate}/></div></div><div className="card"><div className="cardHead"><div><h3>Clinical notes</h3><p>Diagnosis and observations</p></div></div><div className="notes"><div><label>Diagnosis</label><b>{p.diagnosis||'Not recorded'}</b></div><div><label>Condition</label><b>{p.condition||'Not recorded'}</b></div><div><label>Doctor</label><b>{p.doctor||'Not recorded'}</b></div><div><label>Notes</label><p>{p.notes||'Not recorded'}</p></div></div></div>{history.length>0&&<div className="card full"><div className="cardHead"><div><h3>Patient history questionnaire</h3><p>{history.length} responses recorded at intake</p></div></div><div className="historyAnswers">{history.map(([key,value])=><div key={key}><span>{INTAKE_LABELS[key]||key.replace(/([A-Z])/g,' $1').replace(/^./,x=>x.toUpperCase())}</span><b>{value}</b></div>)}</div></div>}<div className="card full"><div className="cardHead"><div><h3>3-month outcome</h3><p>Compare baseline with follow-up measurements</p></div>{delta!=null&&<div className={'outcomePill '+(delta<0?'worse':'better')}>{delta<0?<AlertCircle size={16}/>:<CheckCircle2 size={16}/>} {delta?Math.abs(delta)+' point pain '+(delta>0?'reduction':'increase'):'No change in recorded pain'}</div>}</div><div className="outcome"><div><span>Before treatment</span><strong>{p.painBefore}/10</strong><div className="bar"><i style={{width:(p.painBefore*10)+'%'}}/></div></div><div className="outArrow">to</div><div><span>After treatment</span><strong>{isNum(p.painAfter)?p.painAfter+'/10':'Not recorded'}</strong>{isNum(p.painAfter)?<div className={'bar '+(p.painAfter<p.painBefore?'green':p.painAfter>p.painBefore?'red':'')}><i style={{width:(p.painAfter*10)+'%'}}/></div>:<div className="bar empty"><i style={{width:'0%'}}/></div>}</div></div></div></div>}
function Plan({p,update}:{p:Patient;update:(p:Patient)=>void}){const add=()=>update({...p,exercises:[...p.exercises,{name:"New exercise",frequency:"1x daily",duration:"10 reps",notes:""}]});const change=(i:number,k:keyof Exercise,v:string)=>update({...p,exercises:p.exercises.map((e,j)=>j===i?{...e,[k]:v}:e)});return <div className="card"><div className="cardHead"><div><h3>Prescribed exercise plan</h3><p>{p.planMonths}-month plan  |  follow-up {p.followUpDate}</p></div><button className="secondary" onClick={add}><Plus size={16}/> Add exercise</button></div><div className="planDuration"><label>Treatment duration (months)<input type="number" min="1" value={p.planMonths} onChange={e=>update({...p,planMonths:normalize('planMonths',e.target.value) as number})} onBlur={()=>{const m=Math.max(1,num(p.planMonths,1)),log=p.planLog||[];if(m!==p.planMonths)update({...p,planMonths:m,planLog:[{id:uid(),date:today(),months:m},...log]});else if(!log.length)update({...p,planLog:[{id:uid(),date:p.visitDate||today(),months:m}]})}}/></label></div><div className="exerciseList">{p.exercises.map((e,i)=><div className="exercise editableExercise" key={i}><div className="exerciseNum">{i+1}</div><div className="exerciseMain"><input aria-label={`${p.name} exercise ${i+1} name`} value={e.name} onChange={ev=>change(i,"name",ev.target.value)}/><div className="exerciseFields"><input aria-label={`${p.name} exercise ${i+1} frequency`} value={e.frequency} onChange={ev=>change(i,"frequency",ev.target.value)}/><input aria-label={`${p.name} exercise ${i+1} duration`} value={e.duration} onChange={ev=>change(i,"duration",ev.target.value)}/></div><input aria-label={`${p.name} exercise ${i+1} instructions`} value={e.notes} placeholder="Instructions" onChange={ev=>change(i,"notes",ev.target.value)}/></div><button className="iconBtn removeExercise" aria-label={`Remove ${p.name} exercise ${i+1}, ${e.name||"untitled"}`} onClick={()=>update({...p,exercises:p.exercises.filter((_,j)=>j!==i)})}><Trash2 size={16}/></button></div>)}</div></div>}
function Report({p,onExport,pdfPending}:{p:Patient;onExport:()=>void;pdfPending:PdfKind|null}){return <div className="reportPreview"><div className="reportTop"><div><span className="eyebrow">PATIENT OUTCOME REPORT</span><h3>{p.name}</h3><p>{p.id}  |  {p.condition}</p></div><button className="primary" disabled={pdfPending!==null} onClick={onExport}><FileText size={17}/> {pdfPending==='report'?'Saving…':'Generate PDF'}</button></div><div className="reportCards"><Metric label="Pain" before={p.painBefore} after={p.painAfter} suffix="/10"/><Metric label="Mobility" text={p.mobilityBefore} afterText={p.mobilityAfter}/><Metric label="Plan" text={p.planMonths+' months'}/></div><div className="reportX"><div><span>Before</span>{p.xray.before?<img src={p.xray.before} alt={`${p.name} X-ray, before treatment`}/>:<div className="reportEmpty">No image</div>}</div><div><span>After</span>{p.xray.after?<img src={p.xray.after} alt={`${p.name} X-ray, after 3 months`}/>:<div className="reportEmpty">No image</div>}</div></div><p className="reportFoot">This report summarizes recorded clinical information and patient-reported/clinician-entered outcomes. It is not an automated radiological diagnosis.</p></div>}
function NewPatient({onClose,onCreate}:{onClose:()=>void;onCreate:(p:Patient)=>void}){
 const [p,setP]=useState<Patient>({id:'',name:'',age:0,gender:'',phone:'',visitDate:today(),condition:'',painBefore:0,mobilityBefore:'Not recorded',notes:'',diagnosis:'',doctor:'Dr. Pradnesh Naikwade',planMonths:3,followUpDate:addDays(today(),90),status:'Active',xray:{},exercises:[],history:{}});
 const [activeSection,setActiveSection]=useState(0);
 const phoneDigits=p.phone.replace(/\\D/g,''); const invalid=!p.name.trim()||phoneDigits.length<10||phoneDigits.length>15||!Number.isInteger(p.age)||p.age<1||p.age>120||!p.gender||!p.condition.trim();
 const goSection=(index:number)=>{setActiveSection(Math.max(0,Math.min(INTAKE_SECTIONS.length,index)));document.querySelector('.intakeBody')?.scrollTo({top:0,behavior:'smooth'})};
 const answered=(section:number)=>{const questions=INTAKE_SECTIONS[section-1]?.questions||[];return questions.filter(q=>!!p.history?.[q.key]?.trim()).length};
 const set=(key:'name'|'gender'|'phone'|'condition'|'diagnosis'|'visitDate'|'followUpDate'|'notes',value:string)=>setP(old=>({...old,[key]:value}));
 const setHistory=(key:string,value:string)=>setP(old=>({...old,history:{...old.history,[key]:value}}));
 useEscape(onClose);
 return <div className="modalWrap"><div className="modal intakeModal" role="dialog" aria-modal="true" aria-label="New patient">
  <div className="modalHead"><div><h3>Add a patient</h3><p>Start with the essentials. You can fill in the rest together.</p></div><button className="close" aria-label="Close" onClick={onClose}><X/></button></div>
  <div className="intakeBody"><div className="intakeLayout"><nav className="intakeNav" aria-label="Patient intake sections"><div className="intakeNavHead"><b>Patient intake</b><small>{activeSection+1} of {INTAKE_SECTIONS.length+1} sections</small></div><div className="intakeNavItems"><button type="button" className={activeSection===0?'active':''} aria-current={activeSection===0?'step':undefined} onClick={()=>goSection(0)}><span className="intakeNavNumber">01</span><span className="intakeNavText"><b>Patient details</b><small>Basic information</small></span></button>{INTAKE_SECTIONS.map((section,i)=><button type="button" key={section.title} className={activeSection===i+1?'active':''} aria-current={activeSection===i+1?'step':undefined} onClick={()=>goSection(i+1)}><span className="intakeNavNumber">{String(i+2).padStart(2,'0')}</span><span className="intakeNavText"><b>{section.title}</b><small>{answered(i+1)} of {section.questions.length} answered</small></span></button>)}</div></nav><div className="intakePanel">{activeSection===0?<><div className="intakeSectionHead"><span className="eyebrow">SECTION 1 OF {INTAKE_SECTIONS.length+1}</span><h3>Patient details</h3><p>Start with the patient’s contact details and main concern.</p></div><div className="formGrid"><Field label="Patient name *"><input autoFocus value={p.name} placeholder="Full name" onChange={e=>set('name',e.target.value)}/></Field><Field label="Phone *"><input type="tel" value={p.phone} placeholder="Phone number" onChange={e=>set('phone',e.target.value)}/></Field><Field label="Age *"><input type="number" min="0" max="120" value={p.age||''} placeholder="Age" onChange={e=>setP({...p,age:normalize('age',e.target.value)} as Patient)}/></Field><Field label="Gender *"><select value={p.gender} onChange={e=>set('gender',e.target.value)}><option value="">Select</option>{GENDERS.map(gender => <option key={gender}>{gender}</option>)}</select></Field><Field label="Date of joining"><input type="date" value={p.visitDate} onChange={e=>set('visitDate',e.target.value)}/></Field><Field label="Main concern *"><input value={p.condition} placeholder="e.g. lower back pain" onChange={e=>set('condition',e.target.value)}/></Field><Field label="Pain today (0-10)"><select value={p.painBefore} onChange={e=>setP({...p,painBefore:normalize('painBefore',e.target.value)} as Patient)}>{Array.from({length:11},(_,i)=><option key={i} value={i}>{i}{i===0?' - None':i===10?' - Worst imaginable':''}</option>)}</select></Field></div></>:<><div className="intakeSectionHead"><span className="eyebrow">SECTION {activeSection+1} OF {INTAKE_SECTIONS.length+1}</span><h3>{INTAKE_SECTIONS[activeSection-1].title}</h3><p>{INTAKE_SECTIONS[activeSection-1].hint}</p></div><div className="formGrid">{INTAKE_SECTIONS[activeSection-1].questions.map(question => <IntakeAnswer key={question.key} question={question} value={p.history?.[question.key] ?? ''} onChange={value => setHistory(question.key, value)}/>)}</div></>}<div className="intakeStepControls"><button className="secondary" disabled={activeSection===0} onClick={()=>goSection(activeSection-1)}>← Previous</button><span>Section {activeSection+1} of {INTAKE_SECTIONS.length+1}</span><button className="secondary" disabled={activeSection===INTAKE_SECTIONS.length} onClick={()=>goSection(activeSection+1)}>Next →</button></div></div></div></div>
  <div className="intakeFooter"><span>{invalid?'Required: name, valid phone (10–15 digits), age (1–120), gender and main concern.':'You can add more history later'}</span><button className="secondary" onClick={onClose}>Cancel</button><button className="primary" disabled={invalid} onClick={()=>onCreate(p)}><Plus size={17}/> Save patient locally</button></div>
 </div></div>
}
function Payments({patients,update,onOpen}:{patients:Patient[];update:(p:Patient)=>void;onOpen:(id:string)=>void}){const total=sumBy(patients,feeOf),paid=sumBy(patients,paidOf);const setStatus=(p:Patient,status:NonNullable<Patient['paymentStatus']>)=>update(status==='Partially paid'?{...p,paymentStatus:status}:withPaid(p,status==='Done'?feeOf(p):0));return <section className="content"><div className="pageTitle"><div><span className="eyebrow">ACCOUNTS</span><h2>Payment status</h2><p>Record collections and see each patient's outstanding balance.</p></div></div><div className="stats"><Stat icon={<CreditCard/>} label="Billed" value={total} tone="blue"/><Stat icon={<CheckCircle2/>} label="Collected" value={paid} tone="green"/><Stat icon={<AlertCircle/>} label="Pending" value={sumBy(patients,balanceOf)} tone="red"/><Stat icon={<Users/>} label="With balance" value={patients.filter(p=>balanceOf(p)>0).length} tone="blue"/></div><div className="card patientCard"><div className="table paymentTable"><div className="tr th"><span>Patient</span><span>Treatment fee (?)</span><span>Paid (?)</span><span>Balance (?)</span><span>Payment status</span></div>{patients.map(p=>{const balance=balanceOf(p),status=statusOf(p);const credit=creditOf(p);return <div className="tr row paymentRow" key={p.id}><button className="patientLink" onClick={()=>onOpen(p.id)}>{p.name}<small>{p.id}</small></button><input aria-label={`${p.name} treatment fee`} type="number" min="0" value={p.fee||''} placeholder="Enter fee" onChange={e=>update(withFee(p,num(e.target.value)))}/><input aria-label={`${p.name} amount paid`} type="number" min="0" value={p.paid||''} placeholder="Enter paid" onChange={e=>update(withPaid(p,num(e.target.value)))}/>{credit>0?<b className="balanceAmount credit">{money(credit)} credit</b>:<b className="balanceAmount">{money(balance)}</b>}<select aria-label={`${p.name} payment status`} className={`paymentStatus ${status.toLowerCase().replace(' ','-')}`} value={status} onChange={e=>setStatus(p,e.target.value as NonNullable<Patient['paymentStatus']>)}><option disabled={!feeOf(p)}>Done</option><option>Pending</option><option>Partially paid</option></select></div>})}</div></div></section>}
type InsightRange="Day"|"Week"|"Month"|"Quarter"|"Year";
function rangeBuckets(range:InsightRange){
 const now=new Date(), buckets:{label:string;start:Date;end:Date}[]=[];
 if(range==="Day") return [{label:"Today",start:new Date(now.getFullYear(),now.getMonth(),now.getDate()),end:new Date(now.getFullYear(),now.getMonth(),now.getDate()+1)}];
  const count=range==="Week"?7:range==="Month"?4:range==="Quarter"?4:12;
 for(let i=count-1;i>=0;i--){
  let start:Date,end:Date,label:string;
  if(range==="Week"){start=new Date(now.getFullYear(),now.getMonth(),now.getDate()-i);end=new Date(start.getFullYear(),start.getMonth(),start.getDate()+1);label=start.toLocaleDateString("en-IN",{weekday:"short"});}
  else if(range==="Month"){start=new Date(now.getFullYear(),now.getMonth(),now.getDate()-(i+1)*7+1);end=new Date(now.getFullYear(),now.getMonth(),now.getDate()-i*7+1);label="Week "+(count-i);}
  else if(range==="Quarter"){const quarter=Math.floor(now.getMonth()/3)-i;const year=now.getFullYear()+Math.floor(quarter/4);const q=((quarter%4)+4)%4;start=new Date(year,q*3,1);end=new Date(year,q*3+3,1);label="Q"+(q+1)+" "+String(year).slice(-2);}
  else {start=new Date(now.getFullYear(),now.getMonth()-(i+1),1);end=new Date(now.getFullYear(),now.getMonth()-i,1);label=start.toLocaleDateString("en-IN",{month:"short"});}
  buckets.push({label,start,end});
 }
 return buckets;
}
function ActivitySnapshot({patients}:{patients:Patient[]}){
 const buckets=Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()-(6-i));const key=[d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");const total=patients.reduce((sum,p)=>sum+(p.payments||[]).filter(x=>x.date===key).reduce((n,x)=>n+Number(x.amount||0),0),0);return{label:d.toLocaleDateString("en-IN",{weekday:"short"}),total}});
 const total=buckets.reduce((s,x)=>s+x.total,0),max=Math.max(1,...buckets.map(x=>x.total));
 return <div className="activitySnapshot"><div className="activityHead"><div><b>Collections</b><span>Last 7 days</span></div><strong>{money(total)}</strong></div>{total>0?<div className="activityBars" role="img" aria-label="Daily collections for the last seven days">{buckets.map((x,i)=><div className="activityBarItem" key={x.label+i} title={x.label+": "+money(x.total)}><div className="activityBarTrack"><i style={{height:Math.max(6,x.total/max*100)+"%"}}/></div><span>{x.label}</span></div>)}</div>:<div className="activityNoData"><span>No payments recorded this week</span><small>New collections will appear here.</small></div>}</div>
}
function Outcomes({patients}:{patients:Patient[]}){
 const [range,setRange]=useState<InsightRange>("Month");
 const [view,setView]=useState<'overview'|'age'>('overview');
 const buckets=rangeBuckets(range);
 const records=patients.filter(p=>isNum(p.painAfter));
 const improved=records.filter(p=>(p.painAfter as number)<p.painBefore).length;
 const totalCollected=patients.reduce((s,p)=>s+(p.payments||[]).reduce((n,x)=>n+Number(x.amount||0),0),0);
 const revenue=buckets.map(b=>patients.reduce((s,p)=>s+(p.payments||[]).filter(x=>{const d=new Date(x.date+"T00:00:00");return d>=b.start&&d<b.end}).reduce((n,x)=>n+Number(x.amount||0),0),0));
 const newPatients=buckets.map(b=>patients.filter(p=>{const d=new Date(p.visitDate+"T00:00:00");return d>=b.start&&d<b.end}).length);
 const followups=buckets.map(b=>patients.filter(p=>{const d=new Date((p.followUpDate||"")+"T00:00:00");return d>=b.start&&d<b.end&&p.status!=="Completed"}).length);
 const reductions=records.map(p=>p.painBefore-(p.painAfter as number));
 const avgReduction=reductions.length?reductions.reduce((a,b)=>a+b,0)/reductions.length:0;
 const maxRevenue=Math.max(1,...revenue),maxCount=Math.max(1,...newPatients,...followups);
 const {agedPatients,avgAge,ageRows,maxAgeGroup,genders,activeGenders,concerns,mostConcern,displayConcerns,stackConcerns,concernGenderMatrix,concernAgeMatrix,maxConcernCell}=buildAgeProfile(patients);
 return <section className="content"><div className="pageTitle"><div><span className="eyebrow">CLINIC PERFORMANCE</span><h2>Outcomes & activity</h2><p>Track collections, patient growth, follow-up demand, and clinical progress.</p></div>{view==='overview'&&<select className="rangeSelect" aria-label="Analytics time range" value={range} onChange={e=>setRange(e.target.value as InsightRange)}>{["Day","Week","Month","Quarter","Year"].map(x=><option key={x}>{x}</option>)}</select>}</div>
 <div className="tabs outcomeTabs" role="tablist" aria-label="Outcome views"><button role="tab" aria-selected={view==='overview'} className={view==='overview'?'sel':''} onClick={()=>setView('overview')}>Clinic outcomes</button><button role="tab" aria-selected={view==='age'} className={view==='age'?'sel':''} onClick={()=>setView('age')}>Age-wise profile</button></div>
 {view==='overview'?<><div className="stats outcomesKpis"><Stat icon={<CreditCard/>} label="Collected in selected period" text={money(revenue.reduce((a,b)=>a+b,0))} tone="green"/><Stat icon={<Users/>} label="New patients in period" value={newPatients.reduce((a,b)=>a+b,0)} tone="blue"/><Stat icon={<CalendarDays/>} label="Follow-ups in period" value={followups.reduce((a,b)=>a+b,0)} tone="red"/><Stat icon={<Activity/>} label="Avg. pain reduction" text={avgReduction.toFixed(1)+" pts"} tone="green"/></div>
 <div className="detailGrid analyticsGrid"><div className="card analyticsCard"><div className="cardHead"><div><h3>Revenue collected</h3><p>{range} view &middot; total received by payment date</p></div><span className="chartLegend"><i/> Collections</span></div><div className="barChart" role="img" aria-label={range+" revenue collected bar chart"}>{revenue.map((v,i)=><div className="barColumn" key={buckets[i].label+i} title={buckets[i].label+": "+money(v)}><b>{v?money(v):"\u20B90"}</b><div className="barColumnTrack"><i style={{height:(v?Math.max(5,v/maxRevenue*100):0)+"%"}}/></div><span>{buckets[i].label}</span></div>)}</div></div>
 <div className="card analyticsCard"><div className="cardHead"><div><h3>Patients & follow-up demand</h3><p>New registrations and pending follow-ups</p></div><span className="chartLegend"><i className="legendBlue"/> New patients <i className="legendGreen"/> Follow-ups</span></div><div className="groupChart" role="img" aria-label={range+" new patients and follow-ups bar chart"}>{buckets.map((b,i)=><div className="groupColumn" key={b.label+i}><div className="groupBars"><i className="patientBar" title={"New patients: "+newPatients[i]} style={{height:(newPatients[i]?Math.max(5,newPatients[i]/maxCount*100):0)+"%"}}/><i className="followupBar" title={"Follow-ups: "+followups[i]} style={{height:(followups[i]?Math.max(5,followups[i]/maxCount*100):0)+"%"}}/></div><span>{b.label}</span></div>)}</div></div>
 <div className="card analyticsCard wideAnalytics"><div className="cardHead"><div><h3>Pain improvement trend</h3><p>{records.length} recorded follow-ups &middot; average reduction {avgReduction.toFixed(1)} points</p></div></div><div className="progressRows">{[["Pain improved",improved,records.length],["Mobility improved",patients.filter(p=>/improv|good/i.test(p.mobilityAfter||"")).length,patients.length],["Active treatment plans",patients.filter(p=>p.status==="Active").length,patients.length]].map(([label,n,total])=><div className="progressRow" key={String(label)}><span>{label}</span><div><i style={{width:(Number(total)?Number(n)/Number(total)*100:0)+"%"}}/></div><b>{n} / {total}</b></div>)}</div></div></div>
 <p className="analyticsNote">Charts use payment dates, patient visit dates, and scheduled follow-up dates recorded in your clinic records.</p></>:<><div className="stats outcomesKpis"><Stat icon={<Users/>} label="Patients analyzed" value={agedPatients.length} tone="blue"/><Stat icon={<Activity/>} label="Average age" text={avgAge.toFixed(1)+" yrs"} tone="green"/><Stat icon={<Users/>} label="Leading main concern" text={mostConcern} tone="red"/><Stat icon={<Users/>} label="Gender categories" value={activeGenders.length} tone="blue"/></div><div className="ageVizGrid"><div className="card ageVizCard"><div className="ageVizHead"><div><span className="ageVizEyebrow">AGE DISTRIBUTION</span><h3>Patient count by age</h3><p>Five-year age bands · {agedPatients.length} patients with age recorded</p></div><span className="ageVizTotal">{agedPatients.length}<small>patients</small></span></div>{ageRows.length?<div className="ageHistogram" role="img" aria-label="Patient count by five-year age range">{ageRows.map((group,i)=><div className="ageHistogramColumn" key={group.label} title={group.label+': '+group.patients.length+' patients'}><b>{group.patients.length}</b><div className="ageHistogramTrack"><i style={{height:(group.patients.length/maxAgeGroup*100)+'%',animationDelay:(i*35)+'ms'}}/></div><span>{group.label}</span></div>)}</div>:<p className="chartEmpty">Add patient ages to see this chart.</p>}<div className="ageVizFoot">Age range <b>{ageRows[0]?.label||'—'}{ageRows.length>1?' to '+ageRows[ageRows.length-1].label:''}</b></div></div><div className="card ageVizCard"><div className="ageVizHead"><div><span className="ageVizEyebrow">CONCERN × GENDER</span><h3>Which concerns affect whom?</h3><p>Cell color and number show patient counts</p></div></div>{displayConcerns.length&&activeGenders.length?<div className="concernHeatmapWrap"><div className="concernHeatmap" style={{gridTemplateColumns:`minmax(130px,1.6fr) repeat(${activeGenders.length},minmax(56px,1fr))`}}><span className="heatmapCorner">Main concern</span>{activeGenders.map(g=><span className="heatmapGender" key={g.gender}>{g.gender}</span>)}{displayConcerns.map((concern,rowIndex)=><React.Fragment key={concern.name}><span className="heatmapConcern" title={concern.name}>{concern.name}</span>{activeGenders.map((g,colIndex)=>{const count=concernGenderMatrix[rowIndex].counts[colIndex];const strength=count/maxConcernCell;return <span key={g.gender} className="heatmapCell" title={`${concern.name} · ${g.gender}: ${count} patients`} aria-label={`${concern.name}, ${g.gender}: ${count} patients`} style={{backgroundColor:count?`rgba(29,99,190,${0.14+strength*0.86})`:'var(--line)',color:strength>.55?'#fff':'var(--ink)'}}>{count}</span>})}</React.Fragment>)}</div></div>:<p className="chartEmpty">Add patient records to compare concerns and gender.</p>}<div className="heatmapScale"><span>Fewer patients</span><i/><i/><i/><i/><span>More patients</span></div></div><div className="card ageVizCard ageConcernCard"><div className="ageVizHead"><div><span className="ageVizEyebrow">CONCERN × AGE</span><h3>Main concern across age ranges</h3><p>Stack height shows total patients; colors show concern mix</p></div></div><div className="stackLegend">{stackConcerns.map((concern,i)=><span key={concern.name}><i className={'stackColor stackColor'+i}/>{concern.name}</span>)}{concerns.length>stackConcerns.length&&<span><i className="stackColor stackColorOther"/>Other</span>}</div>{ageRows.length?<div className="stackedAgeChart" role="img" aria-label="Main concern distribution across five-year age ranges">{ageRows.map((group,i)=>{const counts=[...concernAgeMatrix[i].counts];const other=group.patients.length-counts.reduce((sum,n)=>sum+n,0);if(concerns.length>stackConcerns.length)counts.push(other);return <div className="stackedAgeColumn" key={group.label} title={`${group.label}: ${group.patients.length} patients`}><b>{group.patients.length}</b><div className="stackedAgeTrack">{counts.map((count,j)=>count>0?<i key={j} className={'stackColor'+(j<stackConcerns.length?j:'Other')} style={{height:(count/group.patients.length*100)+'%',animationDelay:(i*35+j*20)+'ms'}} title={`${j<stackConcerns.length?stackConcerns[j].name:'Other'}: ${count}`}/>:null)}</div><span>{group.label}</span></div>})}</div>:<p className="chartEmpty">Add patient ages and main concerns to see this chart.</p>}</div></div><p className="analyticsNote">All three charts use the age, gender, and main concern recorded in patient profiles. Empty age ranges are hidden for easier comparison.</p></>}</section>
}
function SettingsPage({patients, setPatients, appointments, setAppointments, expenses, setExpenses, onRestore, sample}: {
 patients: Patient[]; setPatients: (patients: Patient[]) => void;
 appointments: Appointment[]; setAppointments: (appointments: Appointment[]) => void;
 expenses: Expense[]; setExpenses: (expenses: Expense[]) => void;
 onRestore: (keys: string[]) => void; sample: Patient[];
}) {
 const [message, setMessage] = useState('');
 const [confirmDemoRemoval, setConfirmDemoRemoval] = useState(false);
 const demoIds = new Set(sample.map(patient => patient.id));
 const demoCount = patients.filter(patient => demoIds.has(patient.id)).length;
 const hasFullTest = patients.some(patient => patient.id === 'YC-TEST-001');
 const availableDemo = sample.filter(example => !patients.some(patient => patient.id === example.id));
 const addDemoRows = (rows: Patient[]) => {
  setPatients([...patients, ...rows]);
  setAppointments([...appointments, ...demoAppointmentsFor(rows).filter(appointment => !appointments.some(existing => existing.id === appointment.id))]);
  setExpenses([...expenses, ...demoExpensesFor(rows).filter(expense => !expenses.some(existing => existing.id === expense.id))]);
  setMessage(`Added ${rows.length} fictional demo patient records with linked data.`);
 };
 const removeDemo = () => {
  setPatients(patients.filter(patient => !demoIds.has(patient.id)));
  setAppointments(appointments.filter(appointment => !demoIds.has(appointment.patientId)));
  setExpenses(expenses.filter(expense => !expense.patientId || !demoIds.has(expense.patientId)));
  setMessage(`Removed ${demoCount} fictional demo patient records and their linked data.`);
  setConfirmDemoRemoval(false);
 };
 return <section className="content">
  <div className="pageTitle"><div><span className="eyebrow">PREFERENCES</span><h2>Settings</h2><p>Manage clinic data and appearance.</p></div></div>
  <div className="settingsGrid">
   <BackupSettings records={{patients, appointments, expenses}} onRestore={(backup, keys) => {
    setPatients(backup.patients);
    if (backup.appointments) setAppointments(backup.appointments);
    if (backup.expenses) setExpenses(backup.expenses);
    onRestore(keys);
   }}/>
   <PdfOutputSettings/>
   <div className="card">
    <div className="cardHead"><div><h3>Demo data</h3><p>{sample.length} fictional sample patients, for exploring the app.</p></div></div>
    <div className="settingsActions">
     {demoCount > 0
      ? <button className="secondary" onClick={() => setConfirmDemoRemoval(true)}>Remove {demoCount} demo patients</button>
      : <button className="secondary" disabled={!!patients.length} onClick={() => addDemoRows(availableDemo)}>Load demo patients</button>}
     <button className="secondary" disabled={hasFullTest} onClick={() => addDemoRows(availableDemo.filter(patient => patient.id === 'YC-TEST-001'))}>
      {hasFullTest ? 'Full test patient added' : 'Add full test patient'}
     </button>
     <button className="secondary" disabled={!availableDemo.length} onClick={() => addDemoRows(availableDemo)}>Add demo patients ({sample.length} total)</button>
    </div>
    {message && <p className="settingsMessage" role="status">{message}</p>}
    <small className="settingsHint">{demoCount > 0
     ? `${demoCount} fictional demo patient records are present. Remove them before using the app for clinic records.`
     : 'Demo data is fictional and intended for testing.'}</small>
   </div>
   <div className="card">
    <div className="cardHead"><div><h3>Appearance</h3><p>Current theme preference.</p></div></div>
    <p className="settingsHint">Doctor name: <b>Dr. Pradnesh Naikwade</b></p>
    <p className="settingsHint">Use the sun/moon button in the top bar to switch theme.</p>
   </div>
  </div>
  {confirmDemoRemoval && <Confirm title="Remove the demo patients?" message={`Remove ${demoCount} fictional demo patient records and their linked data from this device?`}
   confirmLabel="Remove" onCancel={() => setConfirmDemoRemoval(false)} onRun={removeDemo}/>}
 </section>;
}

createRoot(document.getElementById('root')!).render(<App/>);






