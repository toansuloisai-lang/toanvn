import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {createTestApp} from './browser-fixture.mjs';
import {pdfFixture} from './document-fixtures.mjs';
const app=await createTestApp({grade:9}),browser=await chromium.launch({channel:'msedge',headless:true}),page=await browser.newPage({viewport:{width:1536,height:1024}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
const pdf=pdfFixture();
try{
 await app.login(page,'teacher');await page.goto(app.base+'/#teacher-library/documents');await page.locator('#lesson-upload-form').waitFor();
 await page.locator('#upload-title').fill('Ôn tập căn bậc hai');await page.locator('#upload-grade').selectOption('9');await page.locator('#upload-description').fill('Tính \\(\\sqrt{25}\\). <img src=x onerror=alert(1)>');await page.locator('#upload-file').setInputFiles({name:'Bài tập lớp 9.pdf',mimeType:'application/pdf',buffer:pdf});await page.locator('#lesson-upload-form button[type=submit]').click();
 assert.equal(await page.locator('#upload-review img').count(),0);assert.equal(await page.locator('#upload-review msqrt').count(),1);await page.locator('#edit-upload').click();assert.equal(await page.locator('#upload-title').inputValue(),'Ôn tập căn bậc hai');await page.locator('#lesson-upload-form button[type=submit]').click();
 await page.locator('#publish-upload').click();await page.locator('[data-uploaded-lesson]').waitFor();await page.reload();await page.locator('[data-uploaded-lesson]').waitFor();await page.screenshot({path:'artifacts/teacher-upload.png',fullPage:true});
 const link=await page.locator('[data-uploaded-lesson] a').getAttribute('href');const response=await page.context().request.get(app.base+link);assert.equal(response.status(),200);assert.equal(response.headers()['cache-control'],'no-store');assert.match(response.headers()['content-disposition'],/attachment/);assert.deepEqual(await response.body(),pdf);
 const downloadEvent=page.waitForEvent('download');await page.locator('[data-uploaded-lesson] a').click();const download=await downloadEvent;assert.equal(download.suggestedFilename(),'Bài tập lớp 9.pdf');
 await page.locator('#logout').click();await page.locator('#login-form').waitFor();assert.equal((await page.context().request.get(app.base+link)).status(),401);
 await app.login(page);await page.reload();await page.locator('.reference-dashboard').waitFor();await page.goto(app.base+'/#lessons');await page.locator('[data-uploaded-lesson]').waitFor();
 assert.equal((await page.context().request.get(app.base+link)).status(),200);assert.equal((await page.context().request.post(app.base+'/api/teacher/lessons/upload',{data:{}})).status(),403);
 await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:'artifacts/student-upload-mobile.png',fullPage:true});
 await page.goto(app.base+'/#profile');await page.locator('#profile-grade').selectOption('8');await page.locator('#profile-form button').click();await page.getByText('Đã chuyển nội dung học sang lớp 8.',{exact:true}).waitFor();await page.goto(app.base+'/#lessons');assert.equal(await page.locator('[data-uploaded-lesson]').count(),0);assert.equal((await page.context().request.get(app.base+link)).status(),404);
 assert.deepEqual(errors,[]);console.log('PASS upload: review/edit/publish, persistence, escaped text and math, download filename, student grade and role checks, mobile');
}finally{await browser.close();await app.close();}
