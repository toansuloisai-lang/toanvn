import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import sharp from 'sharp';
import {createTestApp} from './browser-fixture.mjs';
const originalFetch=globalThis.fetch;
let aiCalls=0,failAI=true;
globalThis.fetch=async(url,options)=>{if(!String(url).includes('generativelanguage.googleapis.com'))return originalFetch(url,options);aiCalls++;if(failAI){failAI=false;return {ok:true,json:async()=>({})};}const question=JSON.parse(JSON.parse(options.body).contents[0].parts[0].text).question;return {ok:true,json:async()=>({candidates:[{content:{parts:[{text:JSON.stringify({readable:true,confidence:.95,transcription:question.solution,summary:'Bài có đủ lập luận.',criteria:question.rubric.map(r=>({id:r.id,earned:r.points,evidence:question.solution,reason:'Bài làm phù hợp.',missingKnowledge:'Tiếp tục ôn tập.',nextStep:'Làm bài tương tự.'}))})}]}}]})};};
const app=await createTestApp({grade:8}),{accounts}=await import('../server.mjs');
const teacher=accounts.users().find(u=>u.role==='teacher'),student=accounts.users().find(u=>u.role==='student');
const cls=accounts.learning.createClass(teacher,{name:'8A DATATM',grade:8,studentIds:[student.id]});
const admin=accounts.createUser({username:'library-admin',password:'Isolated-test-password-123!',name:'Quản trị thử nghiệm',role:'admin'});
const otherClasses=[6,7,9].map(grade=>{
 const member=accounts.createUser({username:'library-grade-'+grade,password:'Isolated-test-password-123!',name:'Học sinh khối '+grade,role:'student'});
 accounts.saveStudent(member,{attempts:[],reviews:{},profile:{name:member.name,grade:String(grade)}});
 teacher.studentIds.push(member.id);accounts.link(admin,{userId:teacher.id,studentIds:teacher.studentIds});
 return accounts.learning.createClass(teacher,{name:grade+'A DATATM',grade,studentIds:[member.id]});
});
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await app.login(page,'teacher');await page.goto(app.base+'/#teacher-library/bank');await page.locator('[data-library-builder]').waitFor();
 const catalog=await(await page.request.get(app.base+'/api/library/catalog')).json();assert.ok(catalog.uniqueQuestions>=400);
 for(const c of otherClasses){
  await page.locator('[name=classId]').selectOption(c.id);
  assert.equal(await page.locator('[data-library-pick]').count(),catalog.questions.filter(q=>q.grade===c.grade).length);
  await page.locator('[data-library-quick=mcq]').click();assert.equal(await page.locator('[data-selected-id]').count(),10);
  await page.locator('[name=classId]').selectOption('');assert.equal(await page.locator('[data-selected-id]').count(),0);
 }
 const ninth=otherClasses.find(c=>c.grade===9),native=catalog.questions.find(q=>q.grade===9&&q.formats.length===1&&q.formats[0]==='mcq');
 await page.locator('[name=classId]').selectOption(ninth.id);await page.locator('[data-library-search]').fill(native.prompt);
 const nativeRow=page.locator('.library-bank-row').filter({has:page.locator(`[data-library-pick="${native.id}"]`)});assert.equal(await nativeRow.locator('.library-bank-choices>p').count(),4);
 await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 await page.locator('[data-library-search]').fill('');await page.setViewportSize({width:1440,height:1000});
 await page.locator('[name=classId]').selectOption(cls.id);await page.locator('[name=title]').fill('DATATM hỗn hợp');
 const boxes=page.locator('[data-library-pick]');await boxes.nth(0).check();await page.locator('[data-library-type]').selectOption('essay');await boxes.nth(1).check();
 await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:'artifacts/question-library-teacher-mobile.png',fullPage:true});await page.setViewportSize({width:1440,height:1000});
 await page.locator('[data-library-distribute]').click();await page.locator('[name=approved]').check();await page.locator('[data-library-builder] button[type=submit]').click();await page.locator('[data-library-preview]').waitFor();
 await page.locator('[data-library-publish]').click();await page.locator('[data-set-student]').waitFor();
 const id=page.url().split('/bank/')[1];assert.ok(id);const detail=(await(await page.request.get(app.base+'/api/library/sets/'+id)).json());assert.equal(detail.questions.length,2);assert.equal(detail.mcq,1);assert.equal(detail.essay,1);
 await app.login(page);await page.goto(app.base+'/?student=1#practice');await page.locator(`a[href="#practice/${id}"]`).waitFor();await page.locator(`a[href="#practice/${id}"]`).click();await page.locator('[data-set-start]').click();await page.locator('[data-set-upload]').waitFor();
 const initial=await(await page.request.get(app.base+'/api/library/sets/'+id)).json();assert.equal(initial.questions[0].solution,undefined);assert.equal(initial.questions[0].correctIndex,undefined);assert.equal((await page.request.get(app.base+'/api/library/catalog')).status(),403);
 const mcq=detail.questions.find(q=>q.type==='mcq');await page.locator(`[data-set-choice="${mcq.id}"][value="${mcq.correctIndex}"]`).check();await page.getByText('Đã lưu đáp án.',{exact:true}).waitFor();
 const form=page.locator('[data-set-upload]');assert.equal(await form.locator('textarea').count(),0);
 const file={name:'loi-giai.png',mimeType:'image/png',buffer:await sharp({create:{width:500,height:700,channels:3,background:'white'}}).png().toBuffer()};await form.locator('input[type=file]').setInputFiles(file);await form.locator('.tutor-photo-preview img').waitFor();await form.getByRole('button',{name:'Lưu ảnh câu này',exact:true}).click();await form.getByText('Đã lưu ảnh.',{exact:false}).waitFor();
 await page.locator('[data-set-finish]').click();await page.locator('[data-set-confirm-submit]').click();await page.getByRole('heading',{name:'Đã nộp bài',exact:true}).waitFor();
 await page.locator('[data-set-grade]').click();await page.locator('[data-saved-submission] [role=status]').getByText(/chưa|Chưa|đạt|thử|hợp|Gemini/).waitFor();
 let saved=await(await page.request.get(app.base+'/api/library/sets/'+id)).json();assert.equal(saved.submissions.length,1);assert.equal(saved.submissions[0].photos.length,1);assert.equal(saved.attempt.provisionalScore,null);
 await page.locator('[data-set-grade]').click();await page.getByText('Điểm AI tạm thời câu này: 10/10',{exact:true}).waitFor();
 saved=await(await page.request.get(app.base+'/api/library/sets/'+id)).json();assert.equal(saved.attempt.provisionalScore,10);assert.equal(saved.attempt.review,null);assert.equal(aiCalls,2);
 await page.reload();await page.getByText('Điểm AI tạm thời câu này: 10/10',{exact:true}).waitFor();await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:'artifacts/question-library-mobile.png',fullPage:true});
 const image=saved.submissions[0].photos[0];assert.equal((await page.request.get(app.base+image)).status(),200);
 const outsider=accounts.createUser({username:'library-outsider',password:'Isolated-test-password-123!',name:'Khác',role:'student'});const otherPage=await browser.newPage();await app.login(otherPage,'library-outsider');assert.equal((await otherPage.request.get(app.base+image)).status(),404);assert.equal((await otherPage.request.get(app.base+'/api/library/sets/'+id)).status(),404);
 await app.login(page,'teacher');await page.goto(app.base+'/?review=1#teacher-library/bank/'+id);await page.locator('[data-set-review]').waitFor({state:'attached'});await page.locator('[data-set-student]>summary').click();await page.locator('[data-set-review] [name=score]').fill('9');await page.locator('[data-set-review] [name=comment]').fill('Đã xem ảnh bài làm và chốt điểm.');await page.getByRole('button',{name:'Chốt điểm toàn bài'}).click();await page.getByText(/Điểm chính thức: 9\/10/).waitFor();
 await app.login(page);await page.goto(app.base+'/?final=1#practice/'+id);await page.getByText('Điểm chính thức: 9/10',{exact:true}).waitFor();assert.deepEqual(errors,[]);
 await app.login(page,'teacher');const examResponse=await page.request.post(app.base+'/api/library/sets',{data:{requestId:crypto.randomUUID(),title:'Kiểm tra DATATM hỗn hợp',classId:cls.id,mode:'exam',durationMinutes:45,due:detail.due,questions:detail.questions.map(q=>({id:q.id,type:q.type,points:q.points}))}});assert.equal(examResponse.status(),201);const exam=await examResponse.json();
 await app.login(page);await page.goto(app.base+'/?exam=1#exams');await page.locator(`a[href="#exams/library/${exam.id}"]`).waitFor();await page.locator(`a[href="#exams/library/${exam.id}"]`).click();await page.locator('[data-set-start]').click();await page.locator('[data-set-clock]').waitFor();const running=await(await page.request.get(app.base+'/api/library/sets/'+exam.id)).json();assert.equal(running.released,false);assert.equal(running.questions[0].solution,undefined);assert.equal(running.questions[0].correctIndex,undefined);
 await page.locator('[data-set-finish]').click();await page.locator('[data-set-confirm-submit]').click();await page.getByRole('heading',{name:'Đã nộp bài',exact:true}).waitFor();assert.equal(await page.locator('[data-set-question] details').count(),0);assert.deepEqual(errors,[]);
 console.log('PASS: DATATM mixed builder, publishing, assignment visibility, answer hiding, choice save, photo-only essays, failed AI retry, persistence, private images, mobile and teacher final grade.');
}finally{globalThis.fetch=originalFetch;await browser.close();await app.close();}
