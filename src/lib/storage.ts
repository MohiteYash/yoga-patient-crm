import {download, today} from './format';

export const K={patients:'yogacare-patients',appointments:'yogacare-appointments',expenses:'yogacare-expenses',theme:'yogacare-theme'};
export const LABEL={patients:'patient records',appointments:'appointments',expenses:'expenses'};
export type Err={key:string;label:string;msg:string};
export type ReadErr=Err|null;
export type Slot={data:any[];err:ReadErr};

export const readList=<T,>(key:string,label:string,fallback:T[]):Slot=>{
  try{const raw=localStorage.getItem(key);if(!raw)return{data:fallback,err:null};const v=JSON.parse(raw);
   if(!Array.isArray(v))return{data:fallback,err:{key,label,msg:'Saved '+label+' are not a list and were left untouched. The app is showing the default view.'}};
   const good=v.filter(x=>x&&typeof x==='object'&&!Array.isArray(x)&&typeof(x as {id?:unknown}).id==='string'&&(x as {id:string}).id!=='') as T[];
   if(good.length!==v.length)return{data:good,err:{key,label,msg:(v.length-good.length)+' of '+v.length+' saved '+label+' are unreadable and were left untouched. The rest were loaded. Export the raw file before making changes.'}};
   return{data:good,err:null};
  }catch{return{data:fallback,err:{key,label,msg:'Saved '+label+' could not be read and were left untouched. Export the raw file before making changes.'}}}
};

export const writeList=(key:string,value:unknown):string=>{
 try{localStorage.setItem(key,JSON.stringify(value));return''}
 catch(e){return(e as {name?:string})?.name==='QuotaExceededError'?'Your changes are NOT saved and will be lost if you close the app. Remove large X-ray images to free space, then retry.':'Your changes are NOT saved and will be lost if you close the app. Retry, or restore a backup from Settings.'}
};

export const exportRaw=(key:string,label:string)=>{const raw=localStorage.getItem(key);if(!raw)return false;download('yogacare-raw-'+label.replace(/ /g,'-')+'-'+today()+'.json',raw);return true};
