import React, {useEffect} from 'react';
import {ImagePlus, X} from 'lucide-react';
import {isNum} from '../lib/format';

export function Stat({icon,label,value,tone,text}:{icon:React.ReactNode;label:string;value?:number;tone:string;text?:string}){return <div className="stat"><div className={'statIcon '+tone}>{icon}</div><div><span>{label}</span><strong>{text!=null?text:value}</strong></div></div>}

export function Badge({status}:{status:string}){return <span className={'badge '+status.toLowerCase().replace(/[- ]/g,'')}>{status}</span>}

export function Metric({label,before,after,suffix='',text,afterText}:{label:string;before?:number;after?:number;suffix?:string;text?:string;afterText?:string}){return <div className="metric"><span>{label}</span>{isNum(before)?<div><b>{before}{suffix}</b><em>to</em><strong>{isNum(after)?after+suffix:'-'}</strong></div>:<div><b>{text}</b>{afterText&&<><em>to</em><strong>{afterText}</strong></>}</div>}</div>}

export function useEscape(onClose:()=>void){useEffect(()=>{const h=(e:KeyboardEvent)=>{if(e.key==='Escape')onClose()};window.addEventListener('keydown',h);return()=>window.removeEventListener('keydown',h)},[onClose])}

export function Field({label,children,full}:{label:string;children:React.ReactNode;full?:boolean}){return <label className={full?'field fullField':'field'}><span>{label}</span>{children}</label>}

export function XrayBox({title,image,onFile,onOpen}:{title:string;image?:string;onFile:(f?:File)=>void;onOpen?:()=>void}){return <div className="xrayBox"><div className="xrayTitle"><b>{title}</b><label className="upload"><ImagePlus size={15}/> Upload<input type="file" accept="image/*" onChange={e=>onFile(e.target.files?.[0])}/></label></div><div className="xrayImage">{image?<button className="xrayOpen" onClick={onOpen}><img src={image} alt={title}/></button>:<div className="emptyImg"><ImagePlus size={30}/><span>No X-ray uploaded</span><small>PNG, JPG or JPEG</small></div>}</div></div>}

export function PageTitle({eyebrow,title,text,children}:{eyebrow:string;title:string;text:string;children?:React.ReactNode}){return <div className="pageTitle"><div><span className="eyebrow">{eyebrow}</span><h2>{title}</h2><p>{text}</p></div>{children}</div>}

export function Empty({icon,text,hint}:{icon:React.ReactNode;text:string;hint?:string}){return <div className="emptyState">{icon}<b>{text}</b>{hint&&<small>{hint}</small>}</div>}

export function Confirm({title,message,confirmLabel='Delete',onCancel,onRun}:{title:string;message:string;confirmLabel?:string;onCancel:()=>void;onRun:()=>void}){return <div className="modalWrap"><div className="modal confirmModal" role="alertdialog" aria-modal="true" aria-label={title}><div className="modalHead"><div><h3>{title}</h3><p>{message}</p></div><button className="close" aria-label="Close" onClick={onCancel}><X/></button></div><div className="formActions"><button className="secondary" onClick={onCancel}>Cancel</button><button className="danger" onClick={onRun}>{confirmLabel}</button></div></div></div>}
