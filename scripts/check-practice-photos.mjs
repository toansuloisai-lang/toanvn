import assert from 'node:assert/strict';
import sharp from 'sharp';
import {chromium} from '@playwright/test';
import {createTestApp} from './browser-fixture.mjs';
const originalFetch=globalThis.fetch;let failNext=false,calls=0;
globalThis.fetch=async(url,options)=>{
 if(String(url).includes('generativelanguage.googleapis.com')){
  calls++;const payload=JSON.parse(options.body);assert.ok(payload.contents[0].parts.some(p=>p.inlineData));
  const question=JSON.parse(payload.contents[0].parts[0].text).question;assert.ok(question.prompt);assert.ok(question.solution);
  if(failNext){failNext=false;return {ok:true,json:async()=>({})};}
  return {ok:true,json:async()=>({candidates:[{content:{parts:[{text:JSON.stringify({readable:true,confidence:.95,transcription:'5(2x-1)=10x-5',summary:'Bài làm đúng.',criteria:[{id:'reasoning',earned:10,evidence:'5(2x-1)=10x-5',reason:'Phân phối đúng.',missingKnowledge:'Tiếp tục ôn quy tắc phân phối.',nextStep:'Thử một bài tương tự.'}]})}]}}]})};
 }return originalFetch(url,options);
};
const app=await createTestApp({grade:8}),{accounts}=await import('../server.mjs'),browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await app.login(page);await page.goto(app.base+'/#practice');await page.locator('a[href^="#learn/"]:not([href^="#learn/mcq-"])').first().click();
 const exerciseId=page.url().split('#learn/')[1],panel=page.locator('.practice-photo-panel');
 const upload={name:'bai-lam.png',mimeType:'image/png',buffer:await sharp({create:{width:500,height:700,channels:3,background:'white'}}).png().toBuffer()};
 const form=page.locator('[data-practice-photo-form]');await form.locator('input[type=file]').setInputFiles(upload);await form.locator('.tutor-photo-preview img').waitFor();
 assert.equal(await page.locator('#main textarea, #answer-form, #correction-form').count(),0);
 const submissionRequest=page.waitForRequest(r=>r.url().endsWith('/api/practice/photos/submit'));await form.getByRole('button',{name:'Chấm bài',exact:true}).click();const payload=(await submissionRequest).postDataJSON();
 await page.locator('.practice-photo-result').waitFor();await form.locator('[role=status]').getByText('Đã chấm bài.',{exact:false}).waitFor();
 const listURL=app.base+'/api/practice/photos?exerciseId='+exerciseId;const {submissions}=await(await page.request.get(listURL)).json();assert.equal(submissions.length,1);assert.equal(submissions[0].ai.score,10);assert.equal(submissions[0].provisionalScore,10);assert.equal(submissions[0].finalScore,null);assert.equal(submissions[0].answer,undefined);assert.equal(submissions[0].photos.length,1);
 assert.equal((await page.request.post(app.base+'/api/practice/photos/'+submissions[0].id+'/review',{data:{score:10,comment:'fake'}})).status(),403);
 const id=submissions[0].id,image=submissions[0].photos[0];assert.equal((await page.request.get(app.base+image)).status(),200);
 const duplicate=await page.request.post(app.base+'/api/practice/photos/submit',{data:payload});assert.equal((await duplicate.json()).id,id);assert.equal((await(await page.request.get(listURL)).json()).submissions.length,1);
 await page.request.post(app.base+'/api/practice/photos/'+id+'/grade',{data:{}});assert.equal(calls,1);
 const workspace=await(await page.request.get(app.base+'/api/workspace')).json();assert.equal(workspace.state.practicePhotos,undefined);
 await page.request.put(app.base+'/api/student/state',{data:{attempts:workspace.state.attempts,reviews:workspace.state.reviews}});assert.equal((await(await page.request.get(listURL)).json()).submissions.length,1);
 // Failed grading must preserve the upload, and a retry must reuse that submission.
 await form.locator('input[type=file]').setInputFiles(upload);await form.locator('.tutor-photo-preview img').waitFor();failNext=true;await form.getByRole('button',{name:'Chấm bài',exact:true}).click();await form.locator('[role=status]').getByText('Chưa chấm được:',{exact:false}).waitFor();
 assert.equal((await(await page.request.get(listURL)).json()).submissions.length,2);assert.equal(await form.locator('.tutor-photo-preview img').count(),1);
 await form.getByRole('button',{name:'Chấm bài',exact:true}).click();await form.locator('[role=status]').getByText('Đã chấm bài.',{exact:false}).waitFor();assert.equal((await(await page.request.get(listURL)).json()).submissions.length,2);
 await page.reload();await page.locator('.practice-photo-result').first().waitFor();assert.equal(await page.locator('.practice-photo-result').count(),2);
 await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 await page.screenshot({path:'artifacts/practice-photos-mobile.png',fullPage:true});
 const other=accounts.createUser({username:'unrelated-photo',password:'Isolated-test-password-123!',name:'Khác',role:'student'});
 const outsider=await browser.newPage();await app.login(outsider,'unrelated-photo');assert.equal((await outsider.request.get(app.base+image)).status(),404);assert.equal((await outsider.request.post(app.base+'/api/practice/photos/'+id+'/grade',{data:{}})).status(),404);assert.equal((await outsider.request.get(listURL+'&studentId='+workspace.user.id)).status(),403);
 await app.login(page,'teacher');assert.equal((await page.request.get(app.base+image)).status(),200);
 await page.goto(app.base+'/?review=1#learning/'+workspace.user.id);await page.locator('[data-report-tab=scores]').click();await page.locator('[data-practice-review]').first().waitFor({state:'attached'});
 const review=page.locator('.practice-photo-result').first();await review.locator(':scope > summary').click();await review.locator('[name=score]').fill('9');await review.locator('[name=comment]').fill('Giáo viên đã kiểm tra bài trên giấy.');await review.getByRole('button',{name:'Chốt điểm'}).click();await page.locator('.practice-photo-result').getByText(/Điểm chính thức: 9\/10/).first().waitFor();
 const finalized=(await(await page.request.get(listURL+'&studentId='+workspace.user.id)).json()).submissions.find(s=>s.review);
 assert.equal(finalized.finalScore,9);assert.equal(finalized.provisionalScore,10);assert.equal(finalized.status,'final');
 const regrade=await page.request.post(app.base+'/api/practice/photos/'+finalized.id+'/grade',{data:{}});assert.equal((await regrade.json()).finalScore,9);
 await app.login(page);await page.goto(app.base+'/?student=1#learn/'+exerciseId);await page.getByText('Điểm chính thức: 9/10',{exact:false}).first().waitFor();
 assert.equal(await page.locator('#main textarea, #answer-form, [data-practice-review]').count(),0);
 assert.deepEqual(errors,[]);console.log('PASS: photo-only practice, real saved images, grading, persisted history, idempotent submit/retry, grading failure recovery, private access, teacher review, mobile and no JavaScript errors.');
}finally{globalThis.fetch=originalFetch;await browser.close();await app.close();}
