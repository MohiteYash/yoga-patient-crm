import {Exercise, Patient} from '../types';
import {isBlank, num} from './format';

type Key=keyof Patient;

const RANGE:Partial<Record<Key,[number,number]>>={age:[0,120],planMonths:[1,36],painBefore:[0,10],painAfter:[0,10],fee:[0,10000000],paid:[0,10000000]};
const OPTIONAL:Key[]=['painAfter','mobilityAfter','fee','paid','paymentStatus','doctor'];
const NUMERIC:Key[]=['age','planMonths','painBefore'];

export const normalize=(k:Key,v:unknown):Patient[Key]=>{
  if(isBlank(v))return OPTIONAL.indexOf(k)>=0?undefined:(NUMERIC.indexOf(k)>=0?0:'');
  const r=RANGE[k];
  if(r){const n=Math.round(num(v));return Math.min(r[1],Math.max(r[0],n))}
  return typeof v==='string'?v.trim():String(v);
};

const STATUS:Patient['status'][]=['Active','Completed','Follow-up'];
const s=(v:unknown)=>typeof v==='string'?v:'';

export const safePatient=(v:unknown):Patient|null=>{
  if(!v||typeof v!=='object')return null;
  const p=v as Patient;
  if(typeof p.id!=='string'||!p.id||typeof p.name!=='string'||!p.name.trim())return null;
  return{...p,id:p.id,name:p.name,gender:s(p.gender),phone:s(p.phone),condition:s(p.condition),diagnosis:s(p.diagnosis),notes:s(p.notes),doctor:s(p.doctor),mobilityBefore:s(p.mobilityBefore),mobilityAfter:p.mobilityAfter==null?undefined:s(p.mobilityAfter),status:STATUS.indexOf(p.status)>=0?p.status:'Active',xray:p.xray&&typeof p.xray==='object'&&!Array.isArray(p.xray)?p.xray:{},exercises:Array.isArray(p.exercises)?p.exercises.filter(e=>e&&typeof e==='object').map(e=>({name:s((e as Exercise).name),frequency:s((e as Exercise).frequency),duration:s((e as Exercise).duration),notes:s((e as Exercise).notes)})):[]};
};
