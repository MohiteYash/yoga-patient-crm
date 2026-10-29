import {describe,expect,it} from 'vitest';
import {balanceOf,creditOf,feeOf,ledgerOf,paidOf,statusOf,withFee,withLedger,withPaid} from '../src/lib/payment';
import {patient} from './helpers';

describe('payment and balance edge cases',()=>{
 it('derives pending, partial, and done states at boundary values',()=>{
  expect(statusOf(patient({fee:0,paid:0}))).toBe('Pending');
  expect(statusOf(patient({fee:100,paid:0}))).toBe('Pending');
  expect(statusOf(patient({fee:100,paid:1}))).toBe('Partially paid');
  expect(statusOf(patient({fee:100,paid:99.99}))).toBe('Partially paid');
  expect(statusOf(patient({fee:100,paid:100}))).toBe('Done');
  expect(statusOf(patient({fee:100,paid:150}))).toBe('Done');
 });
 it('never reports a negative balance or credit',()=>{
  expect(balanceOf(patient({fee:100,paid:150}))).toBe(0);
  expect(creditOf(patient({fee:100,paid:150}))).toBe(50);
  expect(balanceOf(patient({fee:100,paid:25}))).toBe(75);
  expect(creditOf(patient({fee:100,paid:25}))).toBe(0);
 });
 it('normalizes negative, string, and malformed amounts',()=>{
  expect(feeOf(patient({fee:-5}))).toBe(-5);
  expect(paidOf(patient({paid:'42' as never}))).toBe(42);
  expect(withFee(patient(),-10).fee).toBe(0);
  expect(withPaid(patient(),-10).paid).toBe(0);
  expect(withFee(patient(),NaN).fee).toBe(0);
 });
 it('reconciles payment ledger amounts and tolerates missing history',()=>{
  const p=patient({fee:300,payments:[]});
  expect(ledgerOf(p)).toBe(0);
  const reconciled=withLedger(p,[{id:'p1',patientId:p.id,amount:100,date:'2026-01-01',paymentMethod:'Cash',createdAt:'now'},{id:'p2',patientId:p.id,amount:50,date:'2026-01-02',paymentMethod:'UPI',createdAt:'now'}]);
  expect(ledgerOf(reconciled)).toBe(150);
  expect(reconciled.paid).toBe(150);
  expect(balanceOf(reconciled)).toBe(150);
  expect(ledgerOf(patient({payments:undefined}))).toBe(0);
 });
});
