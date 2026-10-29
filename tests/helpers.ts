import {Patient} from '../src/types';

export const patient=(overrides:Partial<Patient>={}):Patient=>({
 id:'TEST-1',name:'Test Patient',age:35,gender:'Female',phone:'9990000000',visitDate:'2026-01-01',condition:'Back pain',painBefore:5,mobilityBefore:'Moderate',notes:'',diagnosis:'',doctor:'',planMonths:3,followUpDate:'2026-04-01',status:'Active',xray:{},exercises:[],...overrides,
});
