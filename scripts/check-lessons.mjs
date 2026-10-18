import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {practiceMCQs} from '../public/practice-mcq-bank.js';
import {createTestApp} from './browser-fixture.mjs';
const app=await createTestApp(),browser=await chromium.launch({channel:'msedge',headless:true});
const page=await browser.newPage({viewport:{width:1536,height:1024}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await app.login(page,'teacher');await page.goto(app.base+'/#teacher-library/lessons');await page.locator('[data-import-lessons]').click();await page.getByText('Đã nạp thêm 20 bài. Tổng 20 bài học, chia đều cho lớp 6–9.').waitFor();
 assert.equal(await page.locator('.lesson-preview').count(),20);assert.ok(await page.locator('[data-import-lessons]').isDisabled());
 await page.locator('.lesson-preview').first().locator('summary').click();await page.screenshot({path:'artifacts/teacher-lesson-library.png',fullPage:true});
 const again=await page.context().request.post(app.base+'/api/teacher/lessons/import-demo',{data:{}});assert.deepEqual(await again.json(),{added:0,total:20});
 await page.reload();await page.locator('[data-import-lessons]:disabled').waitFor();
 await page.locator('#logout').click();await page.locator('#login-form').waitFor();await app.login(page);await page.reload();await page.locator('.reference-hero').waitFor();await page.goto(app.base+'/#lessons');
 for(const grade of [6,7,8,9]){
   await page.goto(app.base+'/#profile');await page.locator('#profile-grade').selectOption(String(grade));await page.locator('#profile-form button').click();await page.getByText('Đã chuyển nội dung học sang lớp '+grade+'.',{exact:true}).waitFor();
   await page.goto(app.base+'/#lessons');assert.equal(await page.locator('[data-lesson-id]').count(),5);assert.equal(await page.locator('.button-row a[href^="#learn/"]').count(),15);assert.equal(await page.locator('.math-fallback,.katex-error').count(),0);
   await page.goto(app.base+'/#practice');assert.equal(await page.locator('.exercise-card').count(),15+practiceMCQs.filter(q=>q.grades.includes(grade)).length);
 }
 await page.goto(app.base+'/#lessons');await page.locator('.button-row a').first().click();await page.locator('[data-practice-photo-form]').waitFor();
 const denied=await page.context().request.post(app.base+'/api/teacher/lessons/import-demo',{data:{}});assert.equal(denied.status(),403);
 await page.setViewportSize({width:390,height:844});await page.goto(app.base+'/#lessons');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:'artifacts/student-demo-lessons.png',fullPage:true});
 assert.deepEqual(errors,[]);console.log('PASS: teacher menu imports 20 lessons, repeat import is safe, reload persists, each grade sees 5 lessons/15 exercises, student access denied, mobile works');
}finally{await browser.close();await app.close();}
