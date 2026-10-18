import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createTestApp} from './browser-fixture.mjs';
import {demoLessons} from '../public/demo-lessons.js';
import {exercises,skills} from '../public/data.js';
import {practiceMCQs} from '../public/practice-mcq-bank.js';
const app=await createTestApp({grade:9}),browser=await chromium.launch({channel:'msedge',headless:true});
const page=await browser.newPage({viewport:{width:1536,height:1024}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await app.login(page,'teacher');await page.context().request.post(app.base+'/api/teacher/lessons/import-demo',{data:{}});await app.login(page);
 const ids=demoLessons.filter(l=>l.grade===9).flatMap(l=>l.exerciseIds.slice(0,2)),now=Date.now();
 const attempts=ids.map((id,i)=>{const e=exercises.find(e=>e.id===id);return{id:randomUUID(),exerciseId:id,skill:e.skill,time:now+i,completed:now+i,corrected:true,correction:e.answer,initialCorrect:i%3!==0,answer:i%3!==0?e.answer:'999',explanation:'Demo kiểm tra thống kê và liên kết.',mode:'practice'};});
 const data={attempts,reviews:Object.fromEntries(ids.map(id=>[id,{due:now+86400000,interval:0}])),profile:{name:'Nguyễn Minh',grade:'9'}};
 assert.equal((await page.context().request.put(app.base+'/api/student/state',{data})).status(),200);
 await page.goto(app.base);await page.locator('.reference-dashboard').waitFor();
 const catalog=[...new Set(demoLessons.filter(l=>l.grade===9).flatMap(l=>l.exerciseIds))].map(id=>exercises.find(e=>e.id===id)).concat(practiceMCQs.filter(e=>e.grades.includes(9)));
 assert.deepEqual(await page.locator('.subject-row small').allTextContents(),skills.filter(s=>s.grades.includes(9)).map(s=>'2/'+catalog.filter(e=>e.skill===s.id).length));
 assert.equal(await page.locator('.error-row').count(),4);assert.equal(await page.locator('.overall-progress strong').textContent(),Math.round(10/catalog.length*100)+'%');
 for(const [route,heading] of [['formulas','Bảng công thức'],['notebook','Sổ tay lỗi sai'],['progress','Tiến bộ của tôi'],['home','Học Toán'],['lessons','Bài học tương tác'],['practice','Phòng luyện tập'],['formulas','Bảng công thức'],['notebook','Sổ tay lỗi sai']]){
  await page.locator(`#navigation a[href="#${route}"]`).click();await page.getByRole('heading',{level:1,name:new RegExp(heading)}).waitFor();assert.equal(await page.locator('#main').getAttribute('data-page'),route);
  if(route!=='formulas')assert.equal(await page.locator('.formula-atlas').count(),0);
 }
 await page.goto(app.base+'/#progress');assert.deepEqual(await page.locator('.metric strong').allTextContents(),['10','4','0','1']);
 // A second client saves new progress while this tab stays open.
 const extra=exercises.find(e=>e.id==='roots9-3');data.attempts.push({id:randomUUID(),exerciseId:extra.id,skill:extra.skill,time:now+20,completed:now+20,corrected:true,correction:extra.answer,initialCorrect:true,answer:extra.answer,explanation:'Thêm bài từ thiết bị thứ hai.',mode:'practice'});
 await page.context().request.put(app.base+'/api/student/state',{data});await page.goto(app.base+'/#home');await page.waitForFunction(()=>document.querySelector('.subject-row small')?.textContent.startsWith('3/'));
 // Reproduce an older catalog receiving an exercise it does not know.
 await page.route('**/api/workspace*',async route=>{const response=await route.fetch(),body=await response.json();body.state.attempts.push({id:randomUUID(),exerciseId:'future-lesson-1',skill:'future',time:now,initialCorrect:false,corrected:true,explanation:'Lịch sử bài thuộc phiên bản khác.'});body.state.reviews['future-lesson-1']={due:now,interval:0};await route.fulfill({json:body});});
 await page.goto(app.base+'/#formulas');await page.goto(app.base+'/#notebook');await page.locator('.archived-history summary').click();await page.getByText('Lịch sử bài thuộc phiên bản khác.',{exact:false}).waitFor();assert.equal(await page.locator('.formula-atlas').count(),0);
 await page.screenshot({path:'artifacts/notebook-routing-fixed.png',fullPage:true});await page.unroute('**/api/workspace*');
 await page.goto(app.base+'/#home');await page.screenshot({path:'artifacts/dashboard-stats-fixed.png',fullPage:true});
 // An update is announced without dropping typed input.
 await page.goto(app.base+'/#profile');await page.locator('#profile-name').fill('Bản nháp chưa lưu');
 await page.route('**/api/version',r=>r.fulfill({json:{version:'test-next-build'}}));await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await page.locator('#app-update-banner').waitFor();assert.equal(await page.locator('#profile-name').inputValue(),'Bản nháp chưa lưu');
 await page.unroute('**/api/version');await page.locator('#logout').click();await page.locator('#login-form').waitFor();await app.login(page,'teacher');await page.reload();await page.goto(app.base+'/#teacher');await page.locator('#assignment-form').waitFor();
 await page.locator('#assignment-title').fill('Nhiệm vụ căn bậc hai');await page.locator('#assignment-skill').selectOption('roots9');await page.locator('#assignment-due').fill('2026-12-01');await page.locator('#assignment-form button').click();
 await page.locator('#main a[href^="#learning/"]').first().click();await page.locator('[data-report-tab="scores"]').click();await page.getByText('Nhiệm vụ căn bậc hai',{exact:false}).waitFor();assert.equal(await page.locator('.formula-atlas').count(),0);
 assert.deepEqual(errors,[]);console.log('PASS: stats agree, completion vs accuracy, all navigation, new progress refresh, unknown historic exercise, safe update notice and teacher assignment target');
}finally{await browser.close();await app.close();}
