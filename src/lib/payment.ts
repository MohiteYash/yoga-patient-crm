import {num, sumBy} from './format';
import {Payment, Patient} from '../types';

const derive=(fee:number,paid:number):NonNullable<Patient['paymentStatus']>=>fee<=0||paid<=0?'Pending':paid>=fee?'Done':'Partially paid';

export const feeOf=(p:Patient)=>num(p.fee);
export const paidOf=(p:Patient)=>num(p.paid);
export const ledgerOf=(p:Patient)=>sumBy(p.payments||[],x=>num(x.amount));
export const balanceOf=(p:Patient)=>Math.max(0,feeOf(p)-paidOf(p));
export const creditOf=(p:Patient)=>Math.max(0,paidOf(p)-feeOf(p));
export const statusOf=(p:Patient)=>derive(feeOf(p),paidOf(p));
export const withPaid=(p:Patient,paid:number):Patient=>({...p,paid:Math.max(0,num(paid))});
export const withFee=(p:Patient,fee:number):Patient=>({...p,fee:Math.max(0,num(fee))});
export const withLedger=(p:Patient,payments:Payment[]):Patient=>({...p,paid:Math.max(0,sumBy(payments,x=>num(x.amount))),payments});
