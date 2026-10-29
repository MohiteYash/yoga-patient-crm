import {describe,expect,it} from 'vitest';
import {INTAKE_SECTIONS} from '../src/lib/intake';

describe('patient intake question data',()=>{
 const questions=INTAKE_SECTIONS.flatMap(section=>section.questions);
 it('has sections and unique stable question keys',()=>{
  expect(INTAKE_SECTIONS.length).toBeGreaterThan(0);
  expect(questions.length).toBeGreaterThan(100);
  expect(new Set(questions.map(q=>q.key)).size).toBe(questions.length);
 });
 it('keeps every question label and every dropdown option non-empty',()=>{
  for(const question of questions){
   expect(question.label.trim(),question.key).not.toBe('');
   for(const option of question.options||[])expect(option.trim(),question.key).not.toBe('');
  }
 });
 it('provides quarter-hour dropdowns for both sleep times',()=>{
  const wake=questions.find(q=>q.key==='wakeUpTime'),bed=questions.find(q=>q.key==='bedtime');
  expect(wake?.options?.[0]).toBe('05:00');
  expect(wake?.options?.at(-1)).toBe('10:00');
  expect(bed?.options?.[0]).toBe('19:00');
  expect(bed?.options?.at(-1)).toBe('01:00');
  for(const option of [...(wake?.options||[]),...(bed?.options||[])])expect(option).toMatch(/^([01]\d|2[0-3]):(00|15|30|45)$/);
 });
 it('contains only non-empty age/pain scale options in range',()=>{
  for(const key of ['worstPain','leastPain','stressScore']){
   const q=questions.find(x=>x.key===key);
   expect(q?.options).toEqual(Array.from({length:11},(_,i)=>String(i)));
  }
 });
});
