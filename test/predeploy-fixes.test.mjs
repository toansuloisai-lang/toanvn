import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createStore} from '../auth-store.mjs';
import {clientAddress} from '../request-ip.mjs';
import {compactAttachments} from '../database/compact-attachments.mjs';
const password='Regression-password-2026!';
function memory(){let broken=false;const store=createStore(undefined,{storage:{load:()=>({users:[],states:{}}),save:()=>{if(broken)throw Error('storage failure');}}});return {store,breakSave:v=>broken=v};}
test('class grade is protected, failed writes roll back and retry cleanly',()=>{
 const {store,breakSave}=memory(),s=store.createUser({username:'child',name:'Child',password,role:'student'}),t=store.createUser({username:'teacher',name:'Teacher',password,role:'teacher',studentIds:[s.id]});
 store.saveStudent(s,{attempts:[],reviews:{},profile:{name:'Child',grade:9}});store.learning.createClass(t,{name:'9A',grade:9,studentIds:[s.id]});
 assert.throws(()=>store.saveStudent(s,{attempts:[],reviews:{},profile:{name:'Changed',grade:8}}),{status:409});assert.equal(store.workspace(s).state.profile.grade,'9');
 breakSave(true);assert.throws(()=>store.createUser({username:'new-child',name:'New',password,role:'student'}));assert.ok(!store.users().some(u=>u.username==='new-child'));
 assert.throws(()=>store.saveStudent(s,{attempts:[],reviews:{},profile:{name:'Changed',grade:9}}));assert.equal(store.workspace(s).user.name,'Child');
 assert.throws(()=>store.learning.createClass(t,{name:'9B',grade:9,studentIds:[s.id]}));assert.equal(store.learning.classes(t).length,1);
 breakSave(false);assert.ok(store.createUser({username:'new-child',name:'New',password,role:'student'}));
});
test('AI analysis is scoped by viewer and cannot overwrite another teachers cache',()=>{
 const {store}=memory(),s=store.createUser({username:'child',name:'Child',password,role:'student'}),a=store.createUser({username:'teacher-a',name:'A',password,role:'teacher',studentIds:[s.id]}),b=store.createUser({username:'teacher-b',name:'B',password,role:'teacher',studentIds:[s.id]});
 const input={studentId:s.id};const ca=store.learning.insightContext(a,input),cb=store.learning.insightContext(b,input);assert.notEqual(ca.revision,cb.revision);
 store.learning.saveInsight(a,input,{summary:'Only A'},ca.revision);assert.equal(store.learning.report(a,s.id).insight.summary,'Only A');assert.equal(store.learning.report(b,s.id).insight,null);assert.equal(store.learning.report(s).insight,null);
 store.learning.saveInsight(b,input,{summary:'Only B'},cb.revision);assert.equal(store.learning.report(a,s.id).insight.summary,'Only A');assert.equal(store.learning.report(b,s.id).insight.summary,'Only B');
});
test('forwarded client address is accepted only from explicitly trusted hops',()=>{
 const req={socket:{remoteAddress:'127.0.0.1'},headers:{'x-forwarded-for':'198.51.100.1, 203.0.113.5'}};
 assert.equal(clientAddress(req,[]),'127.0.0.1');assert.equal(clientAddress(req,['127.0.0.1']),'203.0.113.5');assert.equal(clientAddress(req,['127.0.0.1','203.0.113.5']),'198.51.100.1');req.headers['x-forwarded-for']='invalid';assert.equal(clientAddress(req,['127.0.0.1']),'127.0.0.1');
});
test('compaction preserves exact approved PDF bytes and is idempotent',()=>{
 const files=new Map(),bytes=Buffer.from('approved PDF bytes'),db={parentReports:{a:{recipients:[{pdf:{filename:'a.pdf',base64:bytes.toString('base64')}}]}}};
 assert.equal(compactAttachments(db,(k,b)=>files.set(k,b)).count,1);const pdf=db.parentReports.a.recipients[0].pdf;assert.equal(pdf.base64,undefined);assert.deepEqual(files.get(pdf.fileKey),bytes);assert.equal(compactAttachments(db,()=>{throw Error();}).count,0);
});
