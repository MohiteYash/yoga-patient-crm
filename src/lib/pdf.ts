import {jsPDF} from 'jspdf';
import type {Exercise, Patient} from '../types';
import {dateLabel, dayLabel, isNum, num, sortDateAsc, sortDateDesc} from './format';
import {balanceOf, feeOf, ledgerOf, paidOf, statusOf} from './payment';
// Move the two big base64 constants (FONT_R, FONT_B) out of this file into ./pdfFonts.ts
// and `export` them. They are only needed for the rupee sign in the payment section.
import {FONT_R, FONT_B} from './pdfFonts';

const C={ink:'#142033',muted:'#8490a1',primary:'#1d63be',line:'#e4eaf1',tint:'#eef4fb',zebra:'#f6f9fc',green:'#198754',red:'#d9363e'};
const MX=16,MW=178,PAGE_W=210,BOTTOM=280;
const inr=(n:number)=>'\u20B9'+n.toLocaleString('en-IN');
type Align='left'|'center'|'right';
type Col={l:string;w:number;a:Align};
type Item={l:string;v:string;b?:boolean};

/* ---------- image shrinking (keeps the PDF small; the sample was 63 MB) ---------- */
async function shrink(src?:string,maxPx=1400,q=0.82):Promise<string|undefined>{
  if(!src||!src.startsWith('data:image'))return src;
  return new Promise(res=>{
    const im=new Image();
    im.onload=()=>{
      const s=Math.min(1,maxPx/Math.max(im.width,im.height));
      const c=document.createElement('canvas');
      c.width=Math.max(1,Math.round(im.width*s));c.height=Math.max(1,Math.round(im.height*s));
      const g=c.getContext('2d');
      if(!g){res(src);return}
      g.fillStyle='#ffffff';g.fillRect(0,0,c.width,c.height);
      g.drawImage(im,0,0,c.width,c.height);
      res(c.toDataURL('image/jpeg',q));
    };
    im.onerror=()=>res(src);
    im.src=src;
  });
}
const imgFmt=(s:string)=>s.startsWith('data:image/png')?'PNG':s.startsWith('data:image/webp')?'WEBP':'JPEG';

export function buildReport(p:Patient){
  const doc=new jsPDF({unit:'mm',format:'a4',compress:true});
  doc.addFileToVFS('DMSans-rupee-regular.ttf',FONT_R);
  doc.addFileToVFS('DMSans-rupee-bold.ttf',FONT_B);
  doc.addFont('DMSans-rupee-regular.ttf','DMans','normal');
  doc.addFont('DMSans-rupee-bold.ttf','DMans','bold');

  let y=0,secN=0;
  const setF=(f:'helvetica'|'DMans'='helvetica',s:'normal'|'bold'='normal')=>doc.setFont(f,s);
  const setC=(c:string)=>doc.setTextColor(c);
  const sz=(n:number)=>doc.setFontSize(n);
  const rule=(yy:number,color=C.line,w=0.25)=>{doc.setDrawColor(color);doc.setLineWidth(w);doc.line(MX,yy,PAGE_W-MX,yy)};

  const wrap=(s:string,w:number,fs:number,st:'normal'|'bold'='normal',f:'helvetica'|'DMans'='helvetica'):string[]=>{
    setF(f,st);sz(fs);
    const out:string[]=[];
    String(s||'').split('\n').forEach(seg=>{
      let cur='';
      seg.split(/\s+/).filter(Boolean).forEach(wd=>{
        while(doc.getTextWidth(wd)>w&&wd.length>1){
          let cut=wd.length;
          while(cut>1&&doc.getTextWidth(wd.slice(0,cut))>w)cut--;
          if(cur){out.push(cur);cur=''}
          out.push(wd.slice(0,cut));
          wd=wd.slice(cut);
        }
        const cand=cur?cur+' '+wd:wd;
        if(doc.getTextWidth(cand)<=w)cur=cand;
        else{if(cur)out.push(cur);cur=wd}
      });
      if(cur)out.push(cur);
    });
    return out.length?out:[''];
  };

  /* ---------- page furniture ---------- */
  const slim=()=>{
    setF('helvetica','bold');setC(C.primary);sz(7);
    doc.text('YOGACARE',MX,14,{charSpace:0.8});
    setF('helvetica','normal');setC(C.muted);sz(7);
    doc.text(p.name+'  \u00B7  '+p.id,PAGE_W-MX,14,{align:'right'});
    rule(17.5);
  };
  /** Returns true if it started a new page. */
  const ensure=(h:number):boolean=>{
    if(y+h>BOTTOM){doc.addPage();y=26;slim();return true}
    return false;
  };
  const section=(t:string,keep=30)=>{
    if(y+keep>BOTTOM){doc.addPage();y=26;slim()}
    secN++;
    y+=9;
    setF('helvetica','bold');setC(C.primary);sz(6.5);
    doc.text(String(secN).padStart(2,'0'),MX,y);
    setC(C.ink);sz(8.5);
    doc.text(t.toUpperCase(),MX+8,y,{charSpace:1.1});
    rule(y+2.6);
    y+=8;
  };
  const subHead=(t:string)=>{
    ensure(12);y+=6;
    setF('helvetica','bold');setC(C.ink);sz(8.5);doc.text(t,MX,y);
    y+=4;
  };
  const note=(t:string,color=C.muted,fs=7)=>{
    const ls=wrap(t,MW,fs);
    ls.forEach(l=>{ensure(3.6);setF('helvetica','normal');setC(color);sz(fs);doc.text(l,MX,y+3);y+=3.4});
    y+=1.5;
  };
  const empty=(t:string)=>{
    ensure(8);setF('helvetica','normal');setC(C.muted);sz(8.5);
    doc.text(t,MX,y+3);y+=8;
  };

  /* ---------- 3-column label/value grid ---------- */
  const grid=(items:Item[])=>{
    const cw=MW/3;
    for(let i=0;i<items.length;i+=3){
      const row=items.slice(i,i+3);
      const lines=row.map(it=>wrap(it.v||'Not recorded',cw-6,9.5,it.b?'bold':'normal').slice(0,2));
      const nl=Math.max(...lines.map(l=>l.length));
      const h=8.6+nl*3.8;
      ensure(h);
      row.forEach((it,c)=>{
        const x=MX+c*cw;
        setF('helvetica','bold');setC(C.muted);sz(5.8);
        doc.text(it.l.toUpperCase(),x,y+2.5,{charSpace:0.5});
        setF('helvetica',it.b?'bold':'normal');setC(C.ink);sz(9.5);
        lines[c].forEach((s,li)=>doc.text(s,x,y+7.6+li*4));
      });
      y+=h+0.5;
    }
  };

  /* ---------- tables ---------- */
  const tableHead=(cols:Col[])=>{
    ensure(20);
    doc.setFillColor(C.tint);doc.setDrawColor(C.line);doc.setLineWidth(0.2);
    doc.rect(MX,y,MW,6.6,'FD');
    let x=MX;
    setF('helvetica','bold');setC(C.primary);sz(6.3);
    cols.forEach(c=>{
      const px=c.a==='right'?x+c.w-2.5:c.a==='center'?x+c.w/2:x+2.5;
      doc.text(c.l.toUpperCase(),px,y+4.4,{align:c.a,charSpace:0.4});
      x+=c.w;
    });
    y+=6.6;
  };
  /** cells[last] is ignored; `lines` are the (already wrapped) lines for the last column. */
  const tableRow=(cells:string[],cols:Col[],lines:string[],cap:number,zebra:boolean,moneyIdx=-1,lc=cols.length-1)=>{
    const shown=lines.slice(0,cap);
    const nl=Math.max(shown.length,1);
    const rowH=nl*3.6+4;
    if(ensure(rowH))tableHead(cols);
    if(zebra){doc.setFillColor(C.zebra);doc.rect(MX,y,MW,rowH,'F')}
    let x=MX;
    cells.forEach((c,i)=>{
      const col=cols[i];
      setC(C.ink);
      if(i===lc){
        setF('helvetica','normal');sz(8.3);
        if(!shown.length){setC(C.muted);doc.text('\u2014',x+2.5,y+4.7)}
        else shown.forEach((s,li)=>doc.text(s,x+2.5,y+4.7+li*3.6));
        if(lines.length>cap){setC(C.muted);doc.text('\u2026',x+2.5,y+4.7+cap*3.6)}
      }else{
        if(i===moneyIdx)setF('DMans','normal');else setF('helvetica','normal');
        sz(8.5);
        const empty=!c||c==='-';
        if(empty)setC(C.muted);
        const px=col.a==='right'?x+col.w-2.5:col.a==='center'?x+col.w/2:x+2.5;
        doc.text(empty?'\u2014':c,px,y+4.7,{align:col.a});
      }
      x+=col.w;
    });
    doc.setDrawColor(C.line);doc.setLineWidth(0.15);doc.line(MX,y+rowH,PAGE_W-MX,y+rowH);
    y+=rowH;
  };

  /* =================== HEADER =================== */
  setF('helvetica','bold');setC(C.primary);sz(13);
  doc.text('YOGACARE',MX,21,{charSpace:1.4});
  setF('helvetica','normal');setC(C.muted);sz(7.5);
  doc.text('Yoga & Rehabilitation Clinic',MX,26);
  doc.setDrawColor(C.primary);doc.setLineWidth(0.7);doc.line(MX,31,PAGE_W-MX,31);

  setF('helvetica','bold');setC(C.ink);sz(18);
  doc.text('PATIENT REPORT',MX,45);
  setF('helvetica','normal');setC(C.muted);sz(7.5);
  doc.text('Report date  '+dateLabel(),PAGE_W-MX,43,{align:'right'});
  setF('helvetica','bold');setC(C.primary);sz(9.5);
  doc.text(p.name,MX,52);
  setF('helvetica','normal');setC(C.muted);sz(7.5);
  doc.text(p.id,PAGE_W-MX,52,{align:'right'});
  rule(56);
  y=56;

  /* =================== 01 PATIENT INFORMATION =================== */
  section('Patient information');
  grid([
    {l:'Patient name',v:p.name,b:true},
    {l:'Patient ID',v:p.id,b:true},
    {l:'Age',v:isNum(p.age)||p.age?p.age+' years':'Not recorded'},
    {l:'Gender',v:p.gender||'Not recorded'},
    {l:'Phone',v:p.phone||'Not recorded'},
    {l:'Registered',v:dateLabel(p.visitDate)},
    {l:'Presenting condition',v:p.condition||'Not recorded'},
    {l:'Referring doctor',v:p.doctor||'Not recorded'},
    {l:'Status',v:p.status||'Not recorded'},
  ]);

  /* =================== 02 CLINICAL OVERVIEW =================== */
  section('Clinical overview');
  grid([
    {l:'Primary concern',v:p.condition||'Not recorded'},
    {l:'Diagnosis',v:p.diagnosis||'-'},
    {l:'Treating practitioner',v:p.doctor||'Not recorded'},
    {l:'Treatment plan',v:p.planMonths?p.planMonths+' months':'Not recorded'},
    {l:'Follow-up due',v:dateLabel(p.followUpDate)},
    {l:'Follow-up pain score',v:isNum(p.painAfter)?p.painAfter+'/10':'Not recorded'},
  ]);

  const latestPain=isNum(p.painAfter)?p.painAfter:(isNum(p.painBefore)?p.painBefore:null);
  const kpi=[
    {l:'Pain score',v:latestPain!=null?latestPain+'/10':'Not recorded',
      s:isNum(p.painAfter)?'Initial '+(isNum(p.painBefore)?p.painBefore+'/10':'n/a')+' \u00B7 follow-up '+p.painAfter+'/10':'Initial \u00B7 follow-up not recorded'},
    {l:'Mobility',v:String(p.mobilityAfter||p.mobilityBefore||'Not recorded'),
      s:p.mobilityAfter?'After \u00B7 baseline '+(p.mobilityBefore||'not recorded'):(p.mobilityBefore?'Baseline':'After \u00B7 not recorded')},
    {l:'Visits logged',v:String((p.visits||[]).length),s:dateLabel(p.visitDate)},
  ];
  const kGap=5,kW=(MW-kGap*2)/3,kH=22;
  ensure(kH+4);y+=2;
  kpi.forEach((c,i)=>{
    const x=MX+i*(kW+kGap);
    doc.setFillColor(C.tint);doc.setDrawColor(C.line);doc.setLineWidth(0.2);
    doc.roundedRect(x,y,kW,kH,1.2,1.2,'FD');
    doc.setFillColor(C.primary);doc.rect(x,y,kW,0.9,'F');
    setF('helvetica','bold');setC(C.muted);sz(5.8);doc.text(c.l.toUpperCase(),x+5,y+6.2,{charSpace:0.5});
    setF('helvetica','bold');setC(C.ink);sz(13);doc.text(c.v,x+5,y+13.4);
    setF('helvetica','normal');setC(C.muted);sz(6.3);doc.text(c.s,x+5,y+18.6);
  });
  y+=kH+3;

  /* =================== 03 VISIT HISTORY =================== */
  section('Visit history');
  const tW=MW-98;
  const vCols:Col[]=[{l:'Date',w:26,a:'left'},{l:'Visit type',w:36,a:'left'},{l:'Pain',w:16,a:'center'},{l:'Mobility',w:20,a:'center'},{l:'Treatment and notes',w:tW,a:'left'}];
  const visits=sortDateDesc(p.visits||[],v=>v.date);
  if(!visits.length)empty('No visits recorded yet.');
  else{
    tableHead(vCols);
    visits.forEach((v,ri)=>{
      const tl=v.treatment?wrap('Treatment: '+v.treatment,tW-5,8.3):[];
      const nl=v.notes?wrap(v.notes,tW-5,8.3):[];
      tableRow([dateLabel(v.date),v.visitType||'',isNum(v.painScore)?v.painScore+'/10':'-',v.mobility!=null?num(v.mobility)+'/100':'-',''],vCols,[...tl,...nl],6,ri%2===1);
    });
    y+=2;
  }

  /* =================== 04 PROGRESS =================== */
  section('Progress',72);
  const asc=sortDateAsc(p.visits||[],v=>v.date);
  const pain=[
    ...(isNum(p.painBefore)?[{d:p.visitDate,v:num(p.painBefore)}]:[]),
    ...asc.filter(v=>isNum(v.painScore)).map(v=>({d:v.date,v:v.painScore as number})),
  ];
  const mob=asc.filter(v=>v.mobility!=null).map(v=>({d:v.date,v:num(v.mobility)}));

  const chart=(title:string,pts:{d:string;v:number}[],max:number,step:number,what:string)=>{
    const H=30,plotX=MX+9,plotW=MW-13;
    ensure(H+18);
    y+=3;
    setF('helvetica','bold');setC(C.ink);sz(8.5);doc.text(title,MX,y+3);
    setF('helvetica','normal');setC(C.muted);sz(7);
    if(pts.length>=2){
      doc.text(pts.length+' recorded points',PAGE_W-MX,y+3,{align:'right'});
    }
    if(pts.length<2){
      y+=8;
      note('At least two recorded '+what+' scores are needed to draw a trend.',C.muted,8);
      return;
    }
    const y0=y+9;
    const ticks=Math.round(max/step);
    doc.setLineWidth(0.15);
    for(let i=0;i<=ticks;i++){
      const gy=y0+H-(i/ticks)*H;
      doc.setDrawColor(C.line);doc.line(plotX,gy,plotX+plotW,gy);
      setF('helvetica','normal');setC(C.muted);sz(6);
      doc.text(String(i*step),plotX-2,gy+0.8,{align:'right'});
    }
    const xs=(i:number)=>plotX+4+i*(plotW-8)/(pts.length-1);
    const ys=(v:number)=>y0+H-Math.max(0,Math.min(max,v))/max*H;
    doc.setDrawColor(C.primary);doc.setLineWidth(0.6);
    for(let i=1;i<pts.length;i++)doc.line(xs(i-1),ys(pts[i-1].v),xs(i),ys(pts[i].v));
    doc.setFillColor(C.primary);
    pts.forEach((pt,i)=>{
      doc.circle(xs(i),ys(pt.v),0.9,'F');
      setF('helvetica','bold');setC(C.ink);sz(6.3);
      doc.text(String(pt.v),xs(i),ys(pt.v)-2.2,{align:'center'});
    });
    setF('helvetica','normal');setC(C.muted);sz(6);
    doc.text(dayLabel(pts[0].d),plotX+4,y0+H+4,{align:'left'});
    doc.text(dayLabel(pts[pts.length-1].d),plotX+plotW-4,y0+H+4,{align:'right'});
    y=y0+H+6;
    note('Recorded scores only. This chart does not represent a diagnosis or clinical assessment.');
  };
  chart('Pain score over time',pain,10,2,'pain');
  chart('Mobility score over time',mob,100,25,'mobility');

  /* =================== 05 EXERCISE / HOME PLAN =================== */
  section('Exercise and home plan');
  const nW=MW-122;
  const eCols:Col[]=[{l:'#',w:10,a:'center'},{l:'Exercise',w:50,a:'left'},{l:'Frequency',w:32,a:'left'},{l:'Duration',w:30,a:'left'},{l:'Notes',w:nW,a:'left'}];
  const ex=p.exercises||[];
  if(!ex.length)empty('No exercises have been prescribed for this patient.');
  else{
    tableHead(eCols);
    ex.forEach((e:Exercise,i)=>{
      const nl=e.notes?wrap(e.notes,nW-5,8.3):[];
      tableRow([String(i+1),e.name,e.frequency,e.duration,''],eCols,nl,5,i%2===1);
    });
    y+=2;
  }

  /* =================== 06 X-RAY RECORDS =================== */
  section('X-ray records');
  type Tile={img?:string;label:string;date?:string;meta?:string};
  const paired:Tile[]=[];
  if(p.xray?.before||p.xray?.after){
    paired.push({img:p.xray?.before,label:'Before treatment',date:p.visitDate});
    paired.push({img:p.xray?.after,label:'After 3 months',date:p.followUpDate});
  }
  const dated:Tile[]=(p.xrays||[]).slice().sort((a,b)=>(b.date||'').localeCompare(a.date||''))
    .map(r=>({img:r.image,label:r.title||'X-ray record',date:r.date,meta:[r.bodyArea,r.notes].filter(Boolean).join('  \u00B7  ')||'no notes'}));

  const boxW=84,boxH=50,gapX=MW-boxW*2;
  const drawTile=(t:Tile,x:number,top:number)=>{
    let iw=0,ih=0;
    if(t.img){try{const pr=doc.getImageProperties(t.img);iw=pr.width;ih=pr.height}catch{}}
    if(t.img&&iw&&ih){
      const s=Math.min(boxW/iw,boxH/ih);
      const w2=iw*s,h2=ih*s;
      try{
        doc.addImage(t.img,imgFmt(t.img),x,top,w2,h2,undefined,'FAST');
        doc.setDrawColor(C.line);doc.setLineWidth(0.2);doc.rect(x,top,w2,h2);
      }catch{
        setF('helvetica','normal');setC(C.muted);sz(7);doc.text('Image could not be embedded',x,top+6);
      }
    }else{
      doc.setFillColor(C.tint);doc.setDrawColor(C.line);doc.setLineWidth(0.2);
      doc.rect(x,top,boxW,boxH,'FD');
      setF('helvetica','normal');setC(C.muted);sz(7);
      doc.text(t.img?'Image not readable':'No image',x+boxW/2,top+boxH/2,{align:'center'});
    }
    setF('helvetica','bold');setC(C.ink);sz(8);doc.text(t.label,x,top+boxH+5);
    setF('helvetica','normal');setC(C.muted);sz(7);
    doc.text(dateLabel(t.date)+(t.meta?'  \u00B7  '+t.meta:''),x,top+boxH+9.2,{maxWidth:boxW});
  };
  const drawTiles=(tiles:Tile[])=>{
    const rowH=boxH+13;
    for(let i=0;i<tiles.length;i+=2){
      ensure(rowH);
      drawTile(tiles[i],MX,y+2);
      if(tiles[i+1])drawTile(tiles[i+1],MX+boxW+gapX,y+2);
      y+=rowH;
    }
  };
  if(!paired.length&&!dated.length)empty('No X-ray images attached.');
  else{
    if(paired.length)drawTiles(paired);
    if(dated.length){subHead('Dated X-ray records  ('+dated.length+')');drawTiles(dated)}
    note('Images are reproduced as stored. This report does not interpret them.');
  }

  /* =================== PAYMENT SUMMARY (only when there is billing data) =================== */
  const fee=feeOf(p),paid=paidOf(p),bal=balanceOf(p),status=statusOf(p),pays=sortDateDesc(p.payments||[],x=>x.date);
  if(fee>0||pays.length){
    section('Payment summary');
    const sGap=5,sCol=(MW-sGap*3)/4,sH=19;
    ensure(sH+4);y+=1;
    const sCells:{l:string;v:string;m:boolean;col?:keyof typeof C}[]=[
      {l:'Total fee',v:inr(fee),m:true},{l:'Total paid',v:inr(paid),m:true},
      {l:'Outstanding',v:inr(bal),m:true,col:bal>0?'red':'green'},{l:'Status',v:status,m:false,col:bal>0?'red':'green'}];
    sCells.forEach((c,i)=>{
      const x=MX+i*(sCol+sGap);
      doc.setFillColor(C.tint);doc.setDrawColor(C.line);doc.setLineWidth(0.2);
      doc.roundedRect(x,y,sCol,sH,1.2,1.2,'FD');
      doc.setFillColor(C.primary);doc.rect(x,y,sCol,0.9,'F');
      setF('helvetica','bold');setC(C.muted);sz(5.8);doc.text(c.l.toUpperCase(),x+5,y+6,{charSpace:0.5});
      setC(c.col?C[c.col]:C.ink);
      if(c.m){setF('DMans','bold');sz(12)}else{setF('helvetica','bold');sz(9.5)}
      doc.text(c.v,x+5,y+13);
    });
    y+=sH+4;
    if(pays.length){
      const pn=MW-120;
      const pCols:Col[]=[{l:'Date',w:26,a:'left'},{l:'Method',w:26,a:'left'},{l:'Reference',w:32,a:'left'},{l:'Notes',w:pn,a:'left'},{l:'Amount',w:36,a:'right'}];
      tableHead(pCols);
      pays.forEach((pa,ri)=>{
        const nl=pa.notes?wrap(pa.notes,pn-5,8.3):[];
        tableRow([dateLabel(pa.date),pa.paymentMethod,pa.reference||'-','',inr(num(pa.amount))],pCols,nl,4,ri%2===1,4,3);
      });
      if(Math.abs(paid-ledgerOf(p))>0.01)note('Recorded entries total '+inr(ledgerOf(p))+'  (stored total paid '+inr(paid)+')');
      y+=2;
    }
  }

  /* =================== NOTES =================== */
  section('Notes');
  if(p.notes){
    wrap(p.notes,MW,9.5).forEach(l=>{ensure(4.6);setF('helvetica','normal');setC(C.ink);sz(9.5);doc.text(l,MX,y+3.4);y+=4.6});
  }else{
    ensure(8);setF('helvetica','normal');setC(C.ink);sz(9.5);
    doc.text('No clinical notes have been recorded for this patient.',MX,y+3.4);y+=8;
  }
  y+=4;
  ensure(14);
  rule(y);y+=1.5;
  wrap('This report summarizes recorded clinical information and patient-reported/clinician-entered outcomes. It is not an automated radiological diagnosis.',MW,7)
    .forEach(l=>{setF('helvetica','normal');setC(C.muted);sz(7);doc.text(l,MX,y+3.4);y+=3.4});

  /* =================== FOOTER on every page =================== */
  const total=doc.getNumberOfPages();
  for(let i=1;i<=total;i++){
    doc.setPage(i);
    rule(287);
    setF('helvetica','normal');setC(C.muted);sz(7);
    doc.text('YogaCare CRM  \u00B7  Confidential patient report',MX,291.5);
    doc.text('Page '+i+' of '+total,PAGE_W-MX,291.5,{align:'right'});
  }
  return doc;
}

export async function exportPDF(p:Patient){
  // Downscale/re-encode images first so the PDF stays small (typically < 2 MB).
  const q:Patient={...p,
    xray:p.xray?{...p.xray,before:await shrink(p.xray.before),after:await shrink(p.xray.after)}:p.xray,
    xrays:await Promise.all((p.xrays||[]).map(async r=>({...r,image:await shrink(r.image)}))),
  } as Patient;
  const doc=buildReport(q);
  doc.save([p.id,p.name.replace(/\s+/g,'-'),'report.pdf'].join('-'));
}
