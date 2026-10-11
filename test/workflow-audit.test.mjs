import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {createStore} from '../auth-store.mjs';
import {validateContent} from '../teacher-content.mjs';
import {solutionHTML} from '../public/math.js';
import {personalReport} from '../public/learning-core.js';
import {exercises} from '../public/data.js';
const password='Audit-test-password-123!';
function setup(t){const dir=mkdtempSync(path.join(os.tmpdir(),'workflow-audit-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));const store=createStore(path.join(dir,'db.json'));
 const student=store.createUser({username:'student',name:'Student',role:'student',password}),teacher=store.createUser({username:'teacher',name:'Teacher',role:'teacher',password,studentIds:[student.id]}),other=store.createUser({username:'otherteacher',name:'Other teacher',role:'teacher',password,studentIds:[student.id]}),parent=store.createUser({username:'parent',name:'Parent',role:'parent',password,studentIds:[student.id]}),admin=store.createUser({username:'admin',name:'Admin',role:'admin',password});return {store,student,teacher,other,parent,admin};}
const draft={kind:'exercise',grade:7,title:'Xác suất',topic:'Xác suất',prompt:'Tung đồng xu, xác suất mặt sấp?',answer:'1/2',wrong:String.raw`Có \(P=1\).`,rule:String.raw`Hai kết quả đồng khả năng: \(P=\frac12\).`};
const attempt=(exerciseId='sign-1',skill='sign',answer='999')=>({id:randomUUID(),exerciseId,skill,answer,time:Date.now(),mode:'practice',initialCorrect:false,working:'Em thử tính và đối chiếu kết quả.'});
test('Topic assignments are scored in teacher and parent reports; another teacher cannot claim them',t=>{
 const {store,student,teacher,other,parent}=setup(t);store.assign(teacher,{studentId:student.id,title:'Signs',skill:'sign',due:'2026-12-01'});
 const a=store.workspace(student).state.assignments[0];assert.ok(a.exerciseIds.length);
 assert.equal(store.learning.report(parent,student.id).assignments.length,1);assert.equal(store.learning.dashboard(teacher).assignedRecently,1);assert.equal(store.learning.dashboard(other).assignedRecently,0);assert.equal(store.learning.dashboard(other).completion,null);
 const legacy={attempts:[],reviews:{},assignments:[{...a,exerciseIds:undefined}],notes:{},profile:{grade:7}};assert.equal(personalReport(legacy,exercises).assignments[0].result.total,a.exerciseIds.length);
 assert.throws(()=>store.assign(teacher,{studentId:student.id,title:'Invalid',skill:'sign',due:'2026-02-31'}),{status:400});
});
test('Reassigning teachers preserves earned exercise history without exposing unpublished foreign content',t=>{
 const {store,student,teacher,other,admin}=setup(t),content=store.publishContent(teacher,draft).content;
 const a=attempt(content.id,'teacher-'+content.id,'0');store.saveStudent(student,{attempts:[a],reviews:{}});
 const foreign=store.publishContent(teacher,{...draft,title:'Not yet assigned'}).content;
 assert.ok(!store.learning.classReport(other).catalog.some(e=>e.id===content.id));
 assert.throws(()=>store.learning.assignSet(other,{studentId:student.id,title:'Foreign',due:'2026-12-01',exerciseIds:[foreign.id]}),{status:400});
 store.link(admin,{userId:teacher.id,studentIds:[]});
 const old=store.workspace(student).state.attempts[0];store.saveStudent(student,{attempts:[old,attempt()],reviews:{},profile:{name:'Tên học sinh đã sửa trong hồ sơ học tập để đồng bộ',grade:9}});
 assert.ok(store.workspace(student).archivedContents.some(c=>c.id===content.id));assert.ok(!store.workspace(student).archivedContents.some(c=>c.id===foreign.id));
 assert.equal(store.learning.report(other,student.id).evidence.find(e=>e.id===old.id).exercise.id,content.id);
 assert.equal(store.learning.classReport(other).students[0].name,'Tên học sinh đã sửa trong hồ sơ học tập để đồng bộ');
});
test('Server rejects fabricated correction flag and clamps future timestamps',t=>{
 const {store,student}=setup(t),a={...attempt(),time:Date.now()+86400000,corrected:true,completed:Date.now()+86400000};delete a.working;
 store.saveStudent(student,{attempts:[a],reviews:{}});const saved=store.workspace(student).state.attempts[0];assert.equal(saved.corrected,false);assert.equal(saved.completed,undefined);assert.ok(saved.time<=Date.now());
});
test('Typing a correct intermediate draft does not submit or freeze the correction',t=>{
 const {store,student}=setup(t),a=attempt(),save=value=>store.saveStudent(student,{attempts:[value],reviews:{}});
 save(a);save({...a,correction:'4',corrected:false});
 assert.equal(store.workspace(student).state.attempts[0].corrected,false);
 save({...a,correction:'40',corrected:false});
 assert.equal(store.workspace(student).state.attempts[0].correction,'40');
 save({...a,correction:'40',corrected:true});
 assert.equal(store.workspace(student).state.attempts[0].corrected,false);
 save({...a,correction:'4',corrected:true});
 assert.equal(store.workspace(student).state.attempts[0].corrected,true);
});
test('A stale tab cannot replace the explanation of an already completed attempt',t=>{
 const {store,student}=setup(t),a=attempt();
 store.saveStudent(student,{attempts:[a],reviews:{}});
 const completed={...a,correction:'4',corrected:true,completed:Date.now(),explanation:'Final explanation checked and submitted.',revisedWorking:'Final corrected steps.'};
 store.saveStudent(student,{attempts:[completed],reviews:{}});
 store.saveStudent(student,{attempts:[{...a,explanation:'Old unfinished draft',revisedWorking:'Old steps'}],reviews:{}});
 const saved=store.workspace(student).state.attempts[0];
 assert.equal(saved.explanation,completed.explanation);assert.equal(saved.revisedWorking,completed.revisedWorking);assert.equal(saved.completed,completed.completed);
});
test('Correct-first explanations and teacher notes reach both student and parent reports',t=>{
 const {store,student,teacher,parent}=setup(t),a={...attempt('sign-1','sign',exercises.find(e=>e.id==='sign-1').answer),explanation:'Em tính theo quy tắc rồi kiểm tra lại kết quả.'};
 store.saveStudent(student,{attempts:[a],reviews:{}});assert.equal(store.learning.report(teacher,student.id).reflections.length,1);
 store.note(teacher,{studentId:student.id,attemptId:a.id,text:'Cần trình bày rõ bước kiểm chứng.'});
 assert.equal(store.learning.report(student).reflections[0].note,'Cần trình bày rõ bước kiểm chứng.');assert.equal(store.learning.report(parent,student.id).reflections[0].note,'Cần trình bày rõ bước kiểm chứng.');
});
test('Teacher-authored solutions render mixed prose and fractions; dollar-delimited bad LaTeX is rejected',()=>{
 const html=solutionHTML(draft.rule);assert.match(html,/class="katex"/);assert.doesNotMatch(html,/math-fallback/);
 assert.throws(()=>validateContent({...draft,rule:String.raw`Sai $\notacommand{1}$`}),{status:400});
});
test('Admin can repair parent email and recover accounts; non-admins cannot and old sessions expire',t=>{
 const {store,student,teacher,parent,admin}=setup(t),token=store.login('student',password,'audit-reset').token;
 assert.throws(()=>store.learning.updateParentEmail(teacher,{userId:parent.id,email:'p@example.com'}),{status:403});
 store.learning.updateParentEmail(admin,{userId:parent.id,email:'Parent@Example.com'});assert.equal(store.users().find(u=>u.id===parent.id).email,'parent@example.com');
 assert.throws(()=>store.learning.resetPassword(parent,{userId:student.id,password:'New-test-password-123!'}),{status:403});
 store.learning.resetPassword(admin,{userId:student.id,password:'New-test-password-123!'});assert.equal(store.authenticate(token),null);
 assert.throws(()=>store.login('student',password,'audit-old'),{status:401});assert.ok(store.login('student','New-test-password-123!','audit-new').token);
});
test('Exploration and formula results are server checked, idempotent and reviewable only by linked teachers',t=>{
 const {store,student,teacher,parent,admin}=setup(t),service=store.learning.activities;
 const record={id:randomUUID(),type:'formula',data:{formulaId:'formula-1',answer:'999'},correct:true};
 const item=service.record(student,record);assert.equal(item.correct,false);assert.equal(service.record(student,record).id,item.id);assert.equal(service.list(parent,student.id).length,1);
 assert.throws(()=>service.record(teacher,record),{status:403});
 assert.throws(()=>service.record(student,{id:randomUUID(),type:'counter',data:{aw:-1,ah:2,bw:4,bh:3}}),{status:400});
 assert.throws(()=>service.record(student,{id:randomUUID(),type:'blackbox',data:{inputs:[1,1],answer:'2x+3'}}),{status:400});
 assert.equal(service.record(student,{id:randomUUID(),type:'blackbox',data:{inputs:[0,1],answer:'2x+3'}}).correct,true);
 assert.equal(service.record(student,{id:randomUUID(),type:'garden',data:{a:6}}).correct,null);
 service.note(teacher,{studentId:student.id,activityId:item.id,text:'Hãy kiểm tra lại quy tắc phân phối.'});
 assert.ok(service.list(student).find(a=>a.id===item.id).notes[teacher.id]);assert.equal(store.learning.report(parent,student.id).activities.length,3);
 store.link(admin,{userId:teacher.id,studentIds:[]});const current=store.authenticate(store.login('teacher',password,'activity-permissions').token);
 assert.throws(()=>service.note(current,{studentId:student.id,activityId:item.id,text:'Not allowed'}),{status:403});
});
