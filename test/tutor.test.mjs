import {test} from 'node:test';
import sharp from 'sharp';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createStore} from '../auth-store.mjs';
import {createTutorService,tutorFocus} from '../tutor-service.mjs';
import {tutorAI,tutorText} from '../tutor-ai.mjs';
import {datatmBank} from '../datatm-service.mjs';
import {richMath} from '../public/math.js';
import {tutorMath} from '../public/tutor-view.js';
import {exercises} from '../public/data.js';
function fixture(t,grade=8){const dir=mkdtempSync(path.join(os.tmpdir(),'tutor-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));const file=path.join(dir,'db.json'),store=createStore(file),password='Isolated-password-2026!';const s=store.createUser({username:'student',name:'Học sinh Một',role:'student',password});store.saveStudent(s,{attempts:[],reviews:{},profile:{name:s.name,grade}});const o=store.createUser({username:'other',name:'Học sinh Khác Riêng Tư',role:'student',password}),teacher=store.createUser({username:'teacher',name:'Giáo viên',role:'teacher',password,studentIds:[s.id]});return {store,s,o,teacher,file};}
const answer=data=>({reply:String.raw`Ta có \(\sqrt{x^2}=\lvert x\rvert\). Hãy nêu từng bước em làm.`,evidenceIds:data.evidence.slice(0,1).map(e=>e.id),exerciseIds:data.candidates.slice(0,1).map(q=>q.id),plan:[{title:'Củng cố',action:'Tự làm một bài mới rồi đối chiếu từng bước.'}]});
const sendInput=(message,threadId)=>({message,threadId,requestId:crypto.randomUUID()});
test('chat images are validated, persisted privately, reused in followups and deduplicated',async t=>{
 const {store,s,o,file}=fixture(t),photo={base64:(await sharp({create:{width:20,height:20,channels:3,background:'white'}}).png().toBuffer()).toString('base64')};
 const input={...sendInput(''),images:[photo]};let calls=0;
 const result=await store.tutor.send(s,input,async args=>{calls++;assert.equal(args.images[0].mimeType,'image/jpeg');return answer(args.data);});
 assert.equal(result.messages[0].images.length,1);
 await store.tutor.send(s,input,()=>{throw Error('duplicate');});assert.equal(calls,1);
 await assert.rejects(store.tutor.send(s,{...input,images:[]}),{status:400});
 await assert.rejects(store.tutor.send(s,{...input,message:'other'}),{status:409});
 const reopened=createStore(file);assert.throws(()=>reopened.tutor.details(o,result.id),{status:404});
 await reopened.tutor.send(s,sendInput('Explain this step',result.id),async args=>{assert.equal(args.history[0].images.length,1);return answer(args.data);});
 for(const images of [[{base64:'invalid'}],[photo,photo,photo,photo]])await assert.rejects(store.tutor.send(s,{...sendInput('photo'),images},()=>{throw Error('must not call');}),{status:400});
 let body;await tutorAI({key:'fake',model:'gemini-2.5-flash',data:{evidence:[],candidates:[]},images:result.messages[0].images,message:'photo',fetcher:async(url,opts)=>{body=JSON.parse(opts.body);return {ok:true,json:async()=>({candidates:[{content:{parts:[{text:JSON.stringify({reply:'Một bài toán.',evidenceIds:[],exerciseIds:[],plan:[]})}]}}]})};}});
 assert.equal(body.contents.at(-1).parts[1].inlineData.mimeType,'image/jpeg');
});
test('tutor reads only own evidence, understands root spelling and offers honest application fallback',async t=>{
 const {store,s,o,file}=fixture(t,9),q=exercises.find(q=>q.skill==='roots9');store.saveStudent(s,{attempts:[{id:crypto.randomUUID(),exerciseId:q.id,skill:q.skill,answer:'999',initialCorrect:false,working:'Em bỏ dấu giá trị tuyệt đối.',mode:'practice',time:Date.now()}],reviews:{}});
 const context=store.tutor.context(s,'Tui hay sai căn bật hai, giúp tui');assert.equal(context.focus,'căn bậc hai');assert.equal(context.data.evidence.length,1);assert.equal(context.data.evidence[0].originalAnswer,'999');assert.equal(context.data.evidence[0].originalWorking,'Em bỏ dấu giá trị tuyệt đối.');assert.equal(context.data.coverage.datatmCandidates,0);assert.ok(context.data.candidates.length);assert.ok(context.data.candidates.every(q=>q.source==='application'&&!q.answer));assert.ok(!JSON.stringify(context).includes(o.name));
 let call;const thread=await store.tutor.send(s,sendInput('Em sai căn bậc hai'),async args=>{call=args;return answer(args.data);});assert.equal(thread.messages.length,2);assert.equal(thread.messages[1].evidence[0].id,'E1');assert.ok(!JSON.stringify(call).includes(s.name));
 await store.tutor.send(s,sendInput('Bước tiếp theo nên làm gì?',thread.id),async args=>{assert.equal(args.data.focus,'căn bậc hai');assert.equal(args.history.length,2);return answer(args.data);});
 assert.throws(()=>store.tutor.details(o,thread.id),{status:404});assert.equal(createStore(file).tutor.list(s).threads.length,1);
});
test('DATATM chat offers enforce ownership, save responses, reach notebook and survive restart',async t=>{
 const {store,s,o,teacher,file}=fixture(t),input=sendInput('Cho em luyện xác suất');const thread=await store.tutor.send(s,input,async({data})=>answer(data));assert.equal((await store.tutor.send(s,input,()=>{throw Error('duplicate should not call AI');})).id,thread.id);await assert.rejects(store.tutor.send(s,{...input,message:'Nội dung khác'},()=>{}),{status:409});
 const m=thread.messages[1],offer=m.offers[0];assert.ok(offer);assert.equal(offer.question.answer,undefined);assert.equal(offer.question.solution,undefined);
 const submit={offerId:m.id,questionId:offer.questionId,answer:'999',working:'Em đếm tất cả các kết quả.',requestId:crypto.randomUUID()};assert.throws(()=>store.datatm.submit(o,submit),{status:403});assert.throws(()=>store.datatm.submit(teacher,submit),{status:403});assert.throws(()=>store.datatm.submit(s,{...submit,questionId:datatmBank.find(q=>q.grade===9).id}),{status:403});
 const first=store.datatm.submit(s,submit);assert.equal(first.correct,false);assert.equal(store.datatm.submit(s,submit).id,first.id);assert.ok(store.knowledge.report(s).mistakes.some(m=>m.kind==='datatm'));
 const next=store.datatm.submit(s,{...submit,requestId:crypto.randomUUID(),answer:first.answer});assert.equal(next.correct,true);assert.equal(next.independentCorrect,false);
 const reopened=createStore(file),recovered=reopened.tutor.details(s,thread.id);assert.equal(recovered.messages[1].offers[0].attempts.length,2);assert.ok(reopened.knowledge.report(s).mistakes.find(m=>m.kind==='datatm').resolved);
 const overview=reopened.learning.report(s);assert.equal(overview.total,1);assert.equal(overview.correct,0);assert.equal(overview.analytics.total,1);assert.ok(overview.evidence[0].corrected);
 assert.equal(reopened.tutor.list(s).threads.length,1);assert.equal(reopened.tutor.list(o).threads.length,0);assert.throws(()=>store.tutor.list(teacher),{status:403});
});
test('failed AI and stale profile never commit chat; one request at a time',async t=>{
 const {store,s}=fixture(t);await assert.rejects(store.tutor.send(s,sendInput('Hỏi xác suất'),async()=>{throw Error('offline');}),/offline/);assert.equal(store.tutor.list(s).threads.length,0);
 let release;const waiting=new Promise(resolve=>release=resolve),pending=store.tutor.send(s,sendInput('Xác suất'),async({data})=>{await waiting;return answer(data);});await assert.rejects(store.tutor.send(s,sendInput('Câu khác'),async({data})=>answer(data)),{status:409});
 store.saveStudent(s,{attempts:[],reviews:{},profile:{name:s.name,grade:9}});release();await assert.rejects(pending,{status:409});assert.equal(store.tutor.list(s).threads.length,0);
});
test('chat persistence failure rolls back and can retry',async()=>{
 const db={users:[{id:'s',role:'student'}],states:{s:{profile:{grade:8},attempts:[]}},datatmAttempts:[]};let broken=true;const tutor=createTutorService({db,persist:()=>{if(broken)throw Error('storage failed');},knowledge:{report:()=>({student:{grade:8},mistakes:[],history:[]})},learning:{catalog:()=>[]}}),user=db.users[0],input=sendInput('Xin chào');await assert.rejects(tutor.send(user,input,async({data})=>answer(data)),/storage failed/);assert.equal(db.tutorThreads.length,0);broken=false;await tutor.send(user,input,async({data})=>answer(data));assert.equal(db.tutorThreads.length,1);
});
test('Gemini replies validate equations and candidate/evidence references, escape HTML',async()=>{
 const data={evidence:[{id:'E1'}],candidates:[{id:'q1'}]},value={reply:String.raw`Điều kiện \(x\ge 0\). \[\sqrt{x^2}=\lvert x\rvert\] <img src=x onerror=alert(1)>`,evidenceIds:['E1'],exerciseIds:['q1'],plan:[{title:'Bước 1',action:String.raw`Tính \(\frac{1}{2}+\frac{1}{3}\).`}]};
 const mock=value=>async()=>({ok:true,json:async()=>({candidates:[{content:{parts:[{text:JSON.stringify(value)}]}}]})});
 const result=await tutorAI({key:'fixture',model:'gemini-2.5-flash',data,message:'Căn',fetcher:mock(value)});assert.match(richMath(result.reply),/class="katex"/);assert.ok(!richMath(result.reply).includes('math-fallback'));assert.ok(!richMath(result.reply).includes('<img'));
 await assert.rejects(tutorAI({key:'fixture',model:'fixture',data,message:'Căn',fetcher:mock({...value,exerciseIds:['invented']})}),{status:502});
 for(const text of [String.raw`Sai \(\sqrt{\)`,String.raw`Sai \(\unknowncommand{x}\)`,String.raw`Thiếu bao \sqrt{x}`])assert.throws(()=>tutorText(text),{status:502});
 assert.equal(tutorFocus('căn bật hai'),'căn bậc hai');assert.equal(tutorFocus('vậy làm sao tiếp','phân số'),'phân số');assert.equal(tutorFocus('Em thường sai những dạng toán nào?','phân số'),'');
 const formatted=tutorMath(String.raw`**Công thức:** \(\sqrt{x^2}=\lvert x\rvert\).`);assert.match(formatted,/<strong>Công thức:<\/strong>/);assert.ok(!formatted.includes('math-fallback'));assert.ok(!tutorMath('**<script>bad()</script>**').includes('<script>'));
});
