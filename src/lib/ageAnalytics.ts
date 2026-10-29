import {Patient} from '../types';

export type AgeBand={label:string;min:number;max:number};
export const AGE_BANDS:AgeBand[]=[
 {label:'0',min:0,max:0},
 ...Array.from({length:24},(_,i)=>({min:i*5+1,max:i*5+5,label:`${i*5+1}–${i*5+5}`})),
];

export const GENDER_CATEGORIES=['Female','Male','Non-binary','Prefer not to say','Unspecified'];
export const profileGender=(p:Patient)=>GENDER_CATEGORIES.includes(p.gender)?p.gender:'Unspecified';

export function buildAgeProfile(patients:Patient[]){
 const agedPatients=patients.filter(p=>Number.isFinite(p.age)&&p.age>=0&&p.age<=120);
 const avgAge=agedPatients.length?agedPatients.reduce((sum,p)=>sum+p.age,0)/agedPatients.length:0;
 const ageRows=AGE_BANDS.map(group=>({...group,patients:agedPatients.filter(p=>p.age>=group.min&&p.age<=group.max)})).filter(group=>group.patients.length>0);
 const maxAgeGroup=Math.max(1,...ageRows.map(group=>group.patients.length));
 const genders=GENDER_CATEGORIES.map(gender=>({gender,count:agedPatients.filter(p=>profileGender(p)===gender).length}));
 const activeGenders=genders.filter(gender=>gender.count>0);
 const concerns=Array.from(new Set(agedPatients.map(p=>p.condition.trim()||'Not recorded'))).map(name=>({name,count:agedPatients.filter(p=>(p.condition.trim()||'Not recorded')===name).length})).sort((a,b)=>b.count-a.count).slice(0,8);
 const displayConcerns=concerns.slice(0,6),stackConcerns=concerns.slice(0,5);
 const concernGenderMatrix=displayConcerns.map(concern=>({...concern,counts:activeGenders.map(g=>agedPatients.filter(p=>(p.condition.trim()||'Not recorded')===concern.name&&profileGender(p)===g.gender).length)}));
 const concernAgeMatrix=ageRows.map(group=>({...group,counts:stackConcerns.map(concern=>group.patients.filter(p=>(p.condition.trim()||'Not recorded')===concern.name).length)}));
 const maxConcern=Math.max(1,...concerns.map(concern=>concern.count));
 const maxConcernCell=Math.max(1,...concernGenderMatrix.flatMap(row=>row.counts));
 return{agedPatients,avgAge,ageRows,maxAgeGroup,genders,activeGenders,concerns,displayConcerns,stackConcerns,concernGenderMatrix,concernAgeMatrix,maxConcern,maxConcernCell,mostConcern:concerns[0]?.name||'No data'};
}
