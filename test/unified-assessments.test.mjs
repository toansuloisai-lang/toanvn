import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createStore} from '../auth-store.mjs';
test('teacher, parent and knowledge share submitted exam results without duplicate assignments',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'unified-report-')),store=createStore(path.join(dir,'accounts.json'));
 try{const password='Test-password-2026!',s=store.createUser({username:'student',password,name:'Student',role:'student'});store.saveStudent(s,{profile:{name:'Student',grade:8},attempts:[],reviews:{}});
 const t=store.createUser({username:'teacher',password,name:'Teacher',role:'teacher',studentIds:[s.id]}),p=store.createUser({username:'parent',password,name:'Parent',role:'parent',studentIds:[s.id]});const c=store.learning.createClass(t,{name:'8A',grade:8,studentIds:[s.id]});
 const e=store.exams.publish(t,{classId:c.id,title:'Exam',durationMinutes:30,questions:[{prompt:'1+1?',choices:['1','2','3','4'],correctIndex:1,explanation:'Add',source:'Teacher',topic:'Numbers'}]});let v=store.exams.start(s,e.id);store.exams.answer(s,e.id,{questionIndex:0,choiceIndex:0,version:v.attempt.version});store.exams.submit(s,e.id);
 const td=store.learning.dashboard(t,{classId:c.id}),pd=store.learning.parentDashboard(p,{studentId:s.id}),k=store.knowledge.report(t,s.id);
 assert.equal(td.attention,1);assert.equal(td.students[0].attempts,1);assert.equal(td.completion,100);assert.equal(pd.answered,1);assert.equal(pd.wrong,1);assert.equal(pd.average,0);assert.equal(pd.assignments.length,1);assert.equal(k.pending.length,0);assert.equal(k.mistakes.length,1);
 }finally{store.close();fs.rmSync(dir,{recursive:true,force:true});}
});
