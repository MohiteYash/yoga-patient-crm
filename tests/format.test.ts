import {describe,expect,it,vi} from 'vitest';
import {addDays,dayKey,monthEnd,money,num,patientId,timeLabel} from '../src/lib/format';

describe('date, number, id, and display format edge cases',()=>{
 it('adds days across month/year boundaries and leap day',()=>{
  expect(addDays('2026-01-31',1)).toBe('2026-02-01');
  expect(addDays('2026-12-31',1)).toBe('2027-01-01');
  expect(addDays('2024-02-28',1)).toBe('2024-02-29');
  expect(addDays('2024-02-29',1)).toBe('2024-03-01');
 });
 it('finds month ends including leap and non-leap February',()=>{
  expect(monthEnd('2024-02-10')).toBe('2024-02-29');
  expect(monthEnd('2025-02-10')).toBe('2025-02-28');
  expect(monthEnd('2026-04-01')).toBe('2026-04-30');
 });
 it('formats times at midnight/noon and rejects malformed hours',()=>{
  expect(timeLabel('00:00')).toBe('12:00 AM');
  expect(timeLabel('12:30')).toBe('12:30 PM');
  expect(timeLabel('23:05')).toBe('11:05 PM');
  expect(timeLabel('bad')).toBe('');
  expect(timeLabel('')).toBe('');
 });
 it('uses numeric fallbacks for invalid and infinite input',()=>{
  expect(num('12.5')).toBe(12.5);
  expect(num('oops')).toBe(0);
  expect(num(Infinity,7)).toBe(7);
  expect(num(null)).toBe(0);
  expect(money(NaN)).toBe('₹0');
 });
 it('creates an unused fallback patient id if random IDs collide',()=>{
  const random=vi.spyOn(Math,'random').mockReturnValue(0);
  try{expect(patientId(['YC-1001'])).toBe('YC-1002')}finally{random.mockRestore()}
 });
 it('produces a padded local date key',()=>{
  expect(dayKey(new Date(2026,0,2))).toBe('2026-01-02');
 });
});
