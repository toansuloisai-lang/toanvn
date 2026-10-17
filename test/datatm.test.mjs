import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createStore} from '../auth-store.mjs';
import {datatmBank,gradeDatatm,matchQuestions,createDatatmService} from '../datatm-service.mjs';
import {learningAI} from '../learning-ai.mjs';
import {exercises} from '../public/data.js';
function fixture(t){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'datatm-')),file=path.join(dir,'db.json');t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));const store=createStore(file),password='Isolated-password-2026!';const s=store.createUser({username:'student',password,name:'Học sinh',role:'student'});store.saveStudent(s,{attempts:[],reviews:{},profile:{name:s.name,grade:6}});const teacher=store.createUser({username:'teacher',password,name:'Giáo viên',role:'teacher',studentIds:[s.id]}),parent=store.createUser({username:'parent',password,name:'Phụ huynh',role:'parent',studentIds:[s.id]}),other=store.createUser({username:'other',password,name:'Khác',role:'student'});const c=store.learning.createClass(teacher,{name:'6A',grade:6,studentIds:[s.id]}),exam=store.exams.publish(teacher,{classId:c.id,title:'Phân số',durationMinutes:30,questions:[{prompt:'Tính 1/2 + 1/3.',topic:'Cộng trừ phân số',knowledge:'Quy đồng phân số',choices:['2/5','5/6','1','0'],correctIndex:1,explanation:'Quy đồng mẫu 6: 3/6 + 2/6 = 5/6.',source:'Giáo viên biên soạn'}]});store.exams.start(s,exam.id);store.exams.submit(s,exam.id,{answers:[0],version:0});return {store,file,s,teacher,parent,other};}
test('DATATM bank has provenance and exact numeric grading without evaluating submitted code',()=>{
 assert.equal(datatmBank.length,73);for(const g of [6,7,8,9])assert.ok(datatmBank.some(q=>q.grade===g));
 for(const q of datatmBank){assert.match(q.source.sha256,/^[a-f0-9]{64}$/);assert.ok(q.prompt.length>12&&q.solution.length>10);assert.equal(gradeDatatm(q.answer,q),true);assert.ok(!/demo|test/i.test(q.prompt));}
 const q={answer:'5/8',unit:''};assert.equal(gradeDatatm('10/16',q),true);assert.equal(gradeDatatm('0,625',q),true);for(const value of ['1/0','NaN','5/8+1','process.exit()','5/80'])assert.equal(gradeDatatm(value,q),false);
 assert.equal(gradeDatatm('9,6 CM',{answer:'9.6',unit:'cm'}),true);assert.equal(gradeDatatm('9.6 km',{answer:'9.6',unit:'cm'}),false);
 assert.equal(matchQuestions({topic:'fractions6',prompt:'Tính 1/2+1/3'},6).length,5);assert.equal(matchQuestions({topic:'Căn bậc hai',prompt:'Tính căn bậc hai của 4'},9).length,0);
});
test('repair unlocks actual same-grade questions, grades on server and preserves first response and history after restart',t=>{
 const {store,file,s,teacher,parent,other}=fixture(t);let group=store.datatm.list(s).groups[0];const key=group.key;
 assert.equal(group.unlocked,false);assert.deepEqual(group.questions,[]);assert.throws(()=>store.datatm.submit(s,{key,questionId:datatmBank[0].id}),{status:409});
 store.knowledge.repair(s,{key,choiceIndex:1,working:'Quy đồng mẫu số 6 rồi cộng 3/6 với 2/6.'});group=store.datatm.list(s).groups[0];assert.equal(group.unlocked,true);assert.ok(group.questions.length);
 const q=group.questions[0];assert.equal(q.grade,6);assert.equal(q.answer,undefined);assert.equal(q.source.sha256,undefined);assert.equal(q.solution,undefined);
 assert.throws(()=>store.datatm.list(other,{studentId:s.id}),{status:403});assert.throws(()=>store.datatm.submit(teacher,{key}),{status:403});assert.equal(store.datatm.list(parent,{studentId:s.id}).groups[0].questions.length,3);
 const input={key,questionId:q.id,answer:'999',working:'Em cộng tử và cộng mẫu.',requestId:crypto.randomUUID()};const wrong=store.datatm.submit(s,input);assert.equal(wrong.correct,false);assert.ok(wrong.solution);assert.equal(store.datatm.submit(s,input).id,wrong.id);
 const corrected=store.datatm.submit(s,{...input,requestId:crypto.randomUUID(),answer:wrong.answer,working:'Em quy đồng mẫu rồi cộng tử số.'});assert.equal(corrected.correct,true);assert.equal(corrected.independentCorrect,false);
 assert.throws(()=>store.datatm.submit(s,{...input,requestId:crypto.randomUUID()}),{status:409});
 group=store.datatm.list(s).groups[0];assert.equal(group.progress.corrected,1);assert.equal(group.progress.independentCorrect,0);assert.ok(group.questions.every(x=>x.id!==q.id));
 const next=group.questions[0],answer=datatmBank.find(q=>q.id===next.id).answer;store.datatm.submit(s,{...input,questionId:next.id,requestId:crypto.randomUUID(),answer});
 const reopened=createStore(file),history=reopened.datatm.list(parent,{studentId:s.id}).groups[0];assert.equal(history.history.length,3);assert.equal(history.progress.independentCorrect,1);assert.equal(history.history[0].answer,'999');assert.equal(history.history[0].snapshot,undefined);
 assert.equal(reopened.knowledge.report(s).history.find(h=>h.kind==='exam').score,0);assert.equal(reopened.knowledge.report(s).mistakes[0].resolved,false);
 const foreign=datatmBank.find(q=>q.grade===7);assert.throws(()=>reopened.datatm.submit(s,{...input,questionId:foreign.id}),{status:400});
 const ai=reopened.datatm.aiContext(s,{key});assert.ok(ai.candidates.every(q=>q.grade===6&&!q.answer&&!q.solution));
});
test('DATATM failed persistence rolls back so a retry can be saved',()=>{
 const q=datatmBank.find(q=>q.grade===6&&q.topic==='Cộng trừ phân số'),db={states:{s:{profile:{grade:6}}},datatmAttempts:[]};let fails=true;const knowledge={report:()=>({student:{id:'s',grade:6},mistakes:[{key:'k',topic:q.topic,prompt:'Bài khác',repairs:[{correct:true}]}]})};const service=createDatatmService({db,knowledge,persist:()=>{if(fails)throw Error('disk unavailable');}}),user={id:'s',role:'student'},input={key:'k',questionId:q.id,answer:q.answer,working:'Cộng sau khi quy đồng mẫu số.',requestId:crypto.randomUUID()};
 assert.throws(()=>service.submit(user,input),/disk unavailable/);assert.equal(db.datatmAttempts.length,0);fails=false;assert.equal(service.submit(user,input).independentCorrect,true);
});
test('legacy practice corrections open the same DATATM path through the unified notebook',t=>{
 const {store,s}=fixture(t),ex=exercises.find(e=>e.skill==='fractions6'),attempt={id:crypto.randomUUID(),exerciseId:ex.id,skill:ex.skill,answer:'999',working:'Em cộng tử và mẫu.',time:Date.now(),mode:'practice',initialCorrect:false};
 store.saveStudent(s,{attempts:[attempt],reviews:{}});let m=store.knowledge.report(s).mistakes.find(m=>m.key==='practice:'+attempt.id);assert.equal(m.datatm.unlocked,false);
 store.saveStudent(s,{attempts:[{...attempt,corrected:true,correction:ex.answer,revisedWorking:'Em quy đồng mẫu số rồi cộng tử.',completed:Date.now()}],reviews:{}});
 m=store.knowledge.report(s).mistakes.find(m=>m.key==='practice:'+attempt.id);assert.equal(m.datatm.unlocked,true);assert.ok(m.datatm.questions.length);assert.ok(m.datatm.questions.every(q=>q.grade===6&&q.topic==='Cộng trừ phân số'));
});
test('AI can choose only retrieved DATATM candidate IDs',async()=>{
 const candidates=datatmBank.slice(0,2).map(q=>({id:q.id,prompt:q.prompt,grade:q.grade}));const fetcher=id=>async()=>({ok:true,json:async()=>({candidates:[{content:{parts:[{text:JSON.stringify({summary:'Ôn kiến thức trong bài sai.',actions:['Làm một bài mới.'],exerciseIds:[id]})}]}}]})});
 assert.equal((await learningAI({key:'fixture',model:'fixture',task:'insight',data:{candidates},fetcher:fetcher(candidates[0].id)})).exerciseIds[0],candidates[0].id);
 await assert.rejects(learningAI({key:'fixture',model:'fixture',task:'insight',data:{candidates},fetcher:fetcher('invented')}),{status:502});
});
