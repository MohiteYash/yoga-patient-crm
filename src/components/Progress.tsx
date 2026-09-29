import {Activity, TrendingUp} from 'lucide-react';
import {Patient} from '../types';
import {dateLabel, isNum, num} from '../lib/format';
import {Empty, Metric} from './ui';

type Pt={d:string;v:number};

function Trend({title,sub,pts,max,unit,aria}:{title:string;sub:string;pts:Pt[];max:number;unit:string;aria:string}){
 const coords=pts.map((p,i)=>`${24+i*552/Math.max(1,pts.length-1)},${190-p.v/max*155}`).join(' ');
 return <div className="card chartCard"><div className="cardHead"><div><h3>{title}</h3><p>{sub}</p></div></div><svg className="trendChart" viewBox="0 0 600 230" role="img" aria-label={aria}>{[0,1,2,3,4].map(i=><g key={i}><line x1="24" x2="576" y1={35+i*39} y2={35+i*39} className="gridLine"/><text x="4" y={39+i*39} className="axisLabel">{Math.round(max*(4-i)/4)}</text></g>)}<polyline points={coords} className="chartLine"/>{coords.split(' ').map((pt,i)=>{const[cx,cy]=pt.split(',');return <circle key={i} cx={cx} cy={cy} r="4" className="chartDot"><title>{dateLabel(pts[i].d)}: {pts[i].v}{unit}</title></circle>})}</svg></div>
}

export function Progress({p}:{p:Patient}){
 const visits=(p.visits||[]).slice().sort((a,b)=>a.date.localeCompare(b.date));
 const pain:Pt[]=[{d:p.visitDate,v:num(p.painBefore)},...visits.filter(v=>isNum(v.painScore)).map(v=>({d:v.date,v:v.painScore as number}))];
 const mob:Pt[]=visits.filter(v=>v.mobility!=null).map(v=>({d:v.date,v:num(v.mobility)}));
 const scored=visits.filter(v=>isNum(v.painScore));
  const lastPain=scored.length?scored[scored.length-1].painScore as number:isNum(p.painAfter)?p.painAfter:null;
 const delta=lastPain!=null?num(p.painBefore)-lastPain:null;
 return <div className="detailGrid one"><div className="card full"><div className="cardHead"><div><h3>Recorded progress</h3><p>Scores entered by the clinic, compared over time</p></div><TrendingUp size={18}/></div>
 <div className="snapshot"><Metric label="Pain score" before={num(p.painBefore)} after={lastPain??undefined} suffix="/10"/><Metric label="Mobility score" text={mob.length?String(mob[0].v):'Not recorded'} afterText={mob.length>1?String(mob[mob.length-1].v):undefined}/><Metric label="Visits logged" text={String(visits.length)}/><Metric label="First to latest" text={visits.length>1?dateLabel(visits[0].date)+' to '+dateLabel(visits[visits.length-1].date):dateLabel(p.visitDate)}/></div>
 {delta!=null&&<p className="legendNote">{delta>0?delta+' points lower than the initial score.':delta<0?Math.abs(delta)+' points higher than the initial score.':'No change from the initial score.'} This is a description of recorded scores only.</p>}
 <p className="legendNote">Charts show values recorded in the Visits tab. They are not a diagnosis or a clinical assessment.</p></div>
 {visits.length===0&&<div className="card full"><Empty icon={<Activity size={22}/>} text="No visit data yet" hint="Log a visit in the Visits tab to see pain and mobility trends here."/></div>}
 {visits.length>0&&<><Trend title="Pain score over time" sub={`Recorded at each visit  |  0-10 scale  |  ${pain.length} point${pain.length===1?'':'s'}`} pts={pain} max={10} unit="/10" aria={`Pain score trend for ${p.name}`}/><Trend title="Mobility score over time" sub={`Recorded at each visit  |  0-100 scale  |  ${mob.length} point${mob.length===1?'':'s'}`} pts={mob.length?mob:[{d:visits[0].date,v:0}]} max={100} unit="/100" aria={`Mobility score trend for ${p.name}`}/></>}</div>
}
