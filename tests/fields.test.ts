import {describe,expect,it} from 'vitest';
import {normalize,safePatient} from '../src/lib/fields';
import {patient} from './helpers';

describe('patient field normalization and backup validation',()=>{
 it('clamps and rounds numeric fields at both ends',()=>{
  expect(normalize('age','-7')).toBe(0);
  expect(normalize('age','121')).toBe(120);
  expect(normalize('age','35.6')).toBe(36);
  expect(normalize('painBefore','-1')).toBe(0);
  expect(normalize('painBefore','11')).toBe(10);
  expect(normalize('planMonths','0')).toBe(1);
  expect(normalize('planMonths','999')).toBe(36);
 });
 it('handles blank optional and required values safely',()=>{
  expect(normalize('fee','   ')).toBeUndefined();
  expect(normalize('paid',null)).toBeUndefined();
  expect(normalize('age','')).toBe(0);
  expect(normalize('name' as never,'  Ada  ')).toBe('Ada');
  expect(normalize('fee','not a number')).toBe(0);
 });
 it('rejects nulls, primitives, arrays, missing ids, and blank names',()=>{
  for(const value of [null,undefined,4,'patient',[],{}, {id:'x',name:'   '}])expect(safePatient(value)).toBeNull();
 });
 it('repairs unknown status and malformed x-ray/exercise fields',()=>{
  const restored=safePatient({...patient(),status:'Unknown',xray:[] as never,exercises:[null,{name:4,frequency:null,duration:'  5 min ',notes:undefined}] as never});
  expect(restored).not.toBeNull();
  expect(restored?.status).toBe('Active');
  expect(restored?.xray).toEqual({});
  expect(restored?.exercises).toEqual([{name:'',frequency:'',duration:'  5 min ',notes:''}]);
 });
 it('preserves the nonblank patient identity and valid status',()=>{
  const restored=safePatient({...patient(),name:'  Patient One  ',status:'Completed'});
  expect(restored?.name).toBe('  Patient One  ');
  expect(restored?.status).toBe('Completed');
 });
});
