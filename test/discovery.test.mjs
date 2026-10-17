import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {discoveryLabs,discoveryResult} from '../public/discovery-data.js';
import {createActivityService} from '../activity-service.mjs';
import {math} from '../public/math.js';
test('interactive discoveries have correct default results and valid boundary cases',()=>{
 const expected={fractions:.75,integers:-2,discount:160,proportion:6,angles:70,prism:24,pythagoras:5,linear:5,identity:25,parabola:4,trigonometry:10,cylinder:54*Math.PI};
 for(const l of discoveryLabs){const values=Object.fromEntries(l.controls.map(([k,,v])=>[k,v]));const r=discoveryResult(l.id,values);assert.ok(Math.abs(r.value-expected[l.id])<1e-8,l.id);assert.doesNotMatch(math(l.formula),/katex-error|math-fallback/);for(const boundary of [3,4]){const v=Object.fromEntries(l.controls.map(row=>[row[0],row[boundary]]));assert.ok(Number.isFinite(discoveryResult(l.id,v).value));}assert.throws(()=>discoveryResult(l.id,{...values,a:NaN}));}
});
test('server checks discovery predictions, grade, bounded inputs and preserves recorded attempts',()=>{
 const db={states:{s:{profile:{grade:'8'}}}};let persisted=0;const service=createActivityService({db,persist:()=>persisted++,student:()=> 's'}),user={id:'s',role:'student'};
 const payload={id:randomUUID(),type:'discovery',data:{labId:'pythagoras',values:{a:3,b:4},answer:'5',value:999},explanation:'Cạnh huyền bằng căn của tổng hai bình phương.'};
 const correct=service.record(user,payload);assert.equal(correct.correct,true);assert.equal(service.record(user,payload).id,correct.id);assert.equal(persisted,1);
 const wrong=service.record(user,{...payload,id:randomUUID(),data:{...payload.data,answer:'7',correct:true}});assert.equal(wrong.correct,false);
 assert.throws(()=>service.record(user,{...payload,id:randomUUID(),data:{labId:'integers',values:{a:3,b:-5},answer:'-2'}}),/khối/);
 assert.throws(()=>service.record(user,{...payload,id:randomUUID(),data:{...payload.data,values:{a:100,b:4}}}),/phạm vi/);
 assert.throws(()=>service.record({...user,role:'teacher'},{...payload,id:randomUUID()}),/học sinh/);
 assert.equal(service.list(user).length,2);
});
