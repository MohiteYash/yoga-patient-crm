import {describe,expect,it} from 'vitest';
import {AGE_BANDS,buildAgeProfile} from '../src/lib/ageAnalytics';
import {patient} from './helpers';

describe('five-year age profile',()=>{
 it('builds contiguous five-year bands from 1 through 120',()=>{
  expect(AGE_BANDS[1]).toEqual({min:1,max:5,label:'1–5'});
  expect(AGE_BANDS.find(b=>b.min===21)).toEqual({min:21,max:25,label:'21–25'});
  expect(AGE_BANDS.find(b=>b.min===26)).toEqual({min:26,max:30,label:'26–30'});
  expect(AGE_BANDS.find(b=>b.min===36)).toEqual({min:36,max:40,label:'36–40'});
  expect(AGE_BANDS.at(-1)).toEqual({min:116,max:120,label:'116–120'});
  expect(AGE_BANDS.slice(1).every((band,i,all)=>i===0||all[i-1].max+1===band.min)).toBe(true);
 });

 it('counts age boundaries in exactly one group and excludes invalid ages',()=>{
  const rows=[patient({id:'zero',age:0}),patient({id:'one',age:1}),patient({id:'five',age:5}),patient({id:'six',age:6}),patient({id:'twentyone',age:21}),patient({id:'twentyfive',age:25}),patient({id:'twentysix',age:26}),patient({id:'max',age:120}),patient({id:'negative',age:-1}),patient({id:'too-old',age:121}),patient({id:'infinite',age:Infinity})];
  const profile=buildAgeProfile(rows);
  expect(profile.agedPatients).toHaveLength(8);
  expect(profile.ageRows.map(row=>[row.label,row.patients.length])).toEqual([['0',1],['1–5',2],['6–10',1],['21–25',2],['26–30',1],['116–120',1]]);
  expect(profile.ageRows.reduce((sum,row)=>sum+row.patients.length,0)).toBe(profile.agedPatients.length);
 });

 it('builds main-concern by gender and age matrices with exact totals',()=>{
  const rows=[patient({id:'a',age:21,gender:'Female',condition:'Back pain'}),patient({id:'b',age:25,gender:'Female',condition:'Back pain'}),patient({id:'c',age:26,gender:'Male',condition:'Neck pain'}),patient({id:'d',age:30,gender:'Other',condition:''})];
  const profile=buildAgeProfile(rows);
  expect(profile.concernGenderMatrix[0]).toMatchObject({name:'Back pain',count:2,counts:[2,0,0]});
  expect(profile.concernAgeMatrix.find(row=>row.label==='21–25')?.counts[0]).toBe(2);
  expect(profile.concernAgeMatrix.find(row=>row.label==='26–30')?.counts[1]).toBe(1);
  expect(profile.concerns.find(row=>row.name==='Not recorded')?.count).toBe(1);
  expect(profile.agedPatients).toHaveLength(4);
 });

 it('returns safe empty-chart defaults for an empty patient list',()=>{
  const profile=buildAgeProfile([]);
  expect(profile.agedPatients).toEqual([]);
  expect(profile.ageRows).toEqual([]);
  expect(profile.avgAge).toBe(0);
  expect(profile.maxAgeGroup).toBe(1);
  expect(profile.maxConcernCell).toBe(1);
  expect(profile.mostConcern).toBe('No data');
 });

 it('limits heatmap and stacked chart categories while retaining remaining concerns',()=>{
  const rows=Array.from({length:10},(_,i)=>patient({id:String(i),age:20+i,condition:`Concern ${i}`,gender:i%2?'Male':'Female'}));
  const profile=buildAgeProfile(rows);
  expect(profile.concerns).toHaveLength(8);
  expect(profile.displayConcerns).toHaveLength(6);
  expect(profile.stackConcerns).toHaveLength(5);
  const shown=profile.concernAgeMatrix.flatMap(r=>r.counts).reduce((sum,n)=>sum+n,0);
  expect(rows.length-shown).toBe(5);
 });
});
