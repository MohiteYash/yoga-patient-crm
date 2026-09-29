import React from 'react';
import {Activity, CalendarDays, ClipboardList, CreditCard, FileText, ImagePlus} from 'lucide-react';
import {Appointment, Patient, TimelineEvent} from '../types';
import {dateLabel, isNum, money, num, sortDateDesc, timeLabel, timeRange} from '../lib/format';
import {Empty} from './ui';

const ICON:{[k:string]:React.ReactNode}={registration:<ClipboardList size={15}/>,visit:<Activity size={15}/>,appointment:<CalendarDays size={15}/>,payment:<CreditCard size={15}/>,xray:<ImagePlus size={15}/>,plan:<FileText size={15}/>};
const LABEL:{[k:string]:string}={registration:'Registration',visit:'Visit',appointment:'Appointment',payment:'Payment',xray:'X-ray',plan:'Plan'};

export function Timeline({p,appointments}:{p:Patient;appointments:Appointment[]}){
 const events:TimelineEvent[]=[
  {id:'reg_'+p.id,kind:'registration',date:p.visitDate,title:'Patient registered',detail:p.condition+(p.diagnosis?'  |  '+p.diagnosis:'')},
  ...(p.visits||[]).map(v=>({id:v.id,kind:'visit' as const,date:v.date,title:v.visitType,detail:(isNum(v.painScore)?'Pain '+v.painScore+'/10':'Pain not recorded')+(v.mobility!=null?'  |  mobility '+num(v.mobility)+'/100':'')})),
  ...(p.payments||[]).map(x=>({id:x.id,kind:'payment' as const,date:x.date,title:'Payment received',detail:x.paymentMethod+(x.reference?'  |  ref '+x.reference:''),amount:num(x.amount)})),
  ...(p.xrays||[]).map(x=>({id:x.id,kind:'xray' as const,date:x.date,title:x.title||x.bodyArea||'X-ray record',detail:[x.bodyArea,x.notes].filter(Boolean).join('  |  ')})),
  ...(p.planLog||[]).map(x=>({id:x.id,kind:'plan' as const,date:x.date,title:'Treatment plan',detail:num(x.months)+'-month plan'})),
  ...appointments.filter(a=>a.patientId===p.id).map(a=>({id:a.id,kind:'appointment' as const,date:a.date,time:a.startTime,title:a.type,detail:(a.notes||'')+'  |  '+timeRange(a.startTime,a.endTime),status:a.status}))
 ];
 const list=sortDateDesc(events,e=>e.date+(e.time||''));
 return <div className="card"><div className="cardHead"><div><h3>Patient timeline</h3><p>Registrations, visits, appointments, payments, X-rays and plan changes in one list</p></div><span className="chip">{list.length} event{list.length===1?'':'s'}</span></div>
 {!list.length&&<Empty icon={<ClipboardList size={22}/>} text="Nothing recorded yet" hint="Timeline events appear as visits, appointments and payments are added."/>}
 {list.length>0&&<div className="timelineList">{list.map(e=><div className="tlItem" key={e.id}><span className={'tlIcon '+e.kind}>{ICON[e.kind]}</span><div className="tlBody"><div className="tlTop"><b>{e.title}</b><span className="tlKind">{LABEL[e.kind]}{e.status?'  |  '+e.status:''}</span></div>{e.detail&&<p>{e.detail}</p>}{e.amount!=null&&<span className="chip green">{money(e.amount)}</span>}</div><div className="tlDate"><b>{dateLabel(e.date)}</b>{e.time&&<span>{timeLabel(e.time)}</span>}</div></div>)}</div>}
 <p className="legendNote">Newest first. Only events recorded in YogaCare are listed.</p></div>
}
