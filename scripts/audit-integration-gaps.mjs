import {createTestApp} from './browser-fixture.mjs';
import {chromium} from '@playwright/test';
import {createStore} from '../auth-store.mjs';
import {exercises} from '../public/data.js';
import fs from 'node:fs';
const app=await createTestApp({grade:9}),browser=await chromium.launch({channel:'msedge',headless:true}),findings=[];
try{
 const page=await browser.newPage();await app.login(page);await page.goto(app.base+'/#formulas');await page.locator('[data-grade]').waitFor();
 findings.push({id:'formula-grade',profileGrade:9,selectedGrade:await page.locator('[data-grade]').inputValue(),visibleFormulas:await page.locator('.atlas-list [data-formula]:visible').count(),quadraticVisible:await page.locator('.atlas-list [data-formula="formula-17"]').isVisible()});
 await app.login(page,'teacher');await page.goto(app.base+'/?audit=teacher#teacher-library/documents');await page.locator('a[href="#upload-lesson"]').waitFor();await page.locator('a[href="#upload-lesson"]').click();await page.waitForFunction(()=>location.hash==='#home');findings.push({id:'upload-anchor',afterClickHash:await page.evaluate(()=>location.hash),uploadVisible:await page.locator('#lesson-upload-form').isVisible()});
 await page.goto(app.base+'/#teacher-library/lessons');await page.locator('[data-import-lessons]').waitFor();findings.push({id:'visible-demo',button:await page.locator('[data-import-lessons]').innerText()});
 const teacherWorkspace=await (await page.request.get(app.base+'/api/workspace')).json(),studentId=teacherWorkspace.students[0].id;
 const cls=await (await page.request.post(app.base+'/api/learning/classes',{data:{name:'9A Audit',grade:9,studentIds:[studentId]}})).json();
 await app.login(page);const changed=await page.request.put(app.base+'/api/student/state',{data:{attempts:[],reviews:{},profile:{name:'Student',grade:8}}});await app.login(page,'teacher');const assigned=await page.request.post(app.base+'/api/learning/assign',{data:{classId:cls.id,title:'Bài lớp 9',due:'2026-12-31',exerciseIds:[exercises.find(e=>e.grades.length===1&&e.grades[0]===9).id]}});findings.push({id:'class-profile-drift',classGrade:9,profileChangedStatus:changed.status(),assignmentStatus:assigned.status(),error:(await assigned.json()).error});
 const store=createStore(undefined,{storage:{load:()=>({users:[],states:{}}),save:()=>{throw Error('Simulated storage failure');}}});let failure;try{store.createUser({username:'lost-save',role:'student',name:'Audit',password:'Audit-password-12345'});}catch(e){failure=e.message;}findings.push({id:'persistence-no-rollback',failure,userStillInMemory:store.users().some(u=>u.username==='lost-save')});
 const memory=createStore(undefined,{storage:{load:()=>({users:[],states:{}}),save:()=>{}}}),password='Audit-password-12345';
 const s=memory.createUser({username:'audit-student',name:'Student',role:'student',password});
 const a=memory.createUser({username:'audit-teacher-a',name:'Teacher A',role:'teacher',password,studentIds:[s.id]}),b=memory.createUser({username:'audit-teacher-b',name:'Teacher B',role:'teacher',password,studentIds:[s.id]});
 const context=memory.learning.insightContext(a,{studentId:s.id});memory.learning.saveInsight(a,{studentId:s.id},{summary:'Analysis scoped to teacher A',actions:[],exerciseIds:[]},context.revision);
 findings.push({id:'ai-cache-teacher-scope',receivedByB:memory.learning.report(b,s.id).insight?.summary});
 for(let i=0;i<20;i++)try{memory.login('audit-student','incorrect','127.0.0.1');}catch{}
 let loginStatus;try{memory.login('audit-teacher-a',password,'127.0.0.1');loginStatus=200;}catch(e){loginStatus=e.status;}
 findings.push({id:'proxy-shared-login-limit',correctTeacherLoginAfterOtherAccountFailures:loginStatus});
 fs.writeFileSync('artifacts/audit-integration-gaps.json',JSON.stringify(findings,null,2));console.log(JSON.stringify(findings,null,2));
}finally{await browser.close();await app.close();}
