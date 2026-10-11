import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createUsageService} from '../usage-service.mjs';

test('activity time uses server intervals, deduplicates tabs, ignores stale/offline gaps and splits local midnight',()=>{
  let now=Date.parse('2026-10-08T16:59:50Z');const db={};let writes=0;
  const service=createUsageService({db,persist:()=>writes++,now:()=>now}),user={id:'s',role:'student'};
  const a='11111111-1111-1111-1111-111111111111',b='22222222-2222-2222-2222-222222222222';
  const beat=(tabId,sequence,active=true)=>service.heartbeat(user,{tabId,sequence,active,seconds:999999999},'session');
  beat(a,1);beat(b,1);assert.equal(db.usage.s.totalMs,0);
  now+=15000;beat(a,2);beat(b,2);beat(a,2);assert.equal(db.usage.s.totalMs,15000);
  assert.deepEqual(db.usage.s.days,{'2026-10-08':10000,'2026-10-09':5000});
  now+=10000;beat(a,3,false);beat(b,3,false);assert.equal(db.usage.s.totalMs,25000);
  now+=15000;beat(a,4,false);assert.equal(db.usage.s.totalMs,25000);
  beat(a,5,true);now+=120000;beat(a,6);assert.equal(db.usage.s.totalMs,25000);
  now+=15000;beat(a,7);assert.equal(db.usage.s.totalMs,40000);
  assert.throws(()=>service.heartbeat({id:'t',role:'teacher'},{tabId:a,sequence:1,active:true}),{status:403});
  assert.ok(writes<10);
});

test('usage persistence failure rolls back and new server does not count downtime',()=>{
  let now=100000,broken=false;const db={},user={id:'s',role:'student'},input={tabId:'11111111-1111-1111-1111-111111111111',sequence:1,active:true};
  const service=createUsageService({db,persist:()=>{if(broken)throw Error('save failed');},now:()=>now});
  service.heartbeat(user,input);now+=15000;broken=true;
  assert.throws(()=>service.heartbeat(user,{...input,sequence:2}),/save failed/);assert.equal(db.usage.s.totalMs,0);
  broken=false;service.heartbeat(user,{...input,sequence:2});assert.equal(db.usage.s.totalMs,15000);
  const restarted=createUsageService({db,persist:()=>{},now:()=>now});now+=10000000;restarted.heartbeat(user,{...input,sequence:3});assert.equal(db.usage.s.totalMs,15000);
});
