import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import nodemailer from 'nodemailer';
import {createTestApp} from './browser-fixture.mjs';
import {workbook} from '../roster-import.mjs';

// Replace SMTP before loading the server: this check cannot contact Gmail.
const sent=[];
nodemailer.createTransport=()=>({sendMail:async mail=>{sent.push(mail);return {accepted:[mail.to.address]};}});
process.env.GMAIL_USER='sender@example.com';process.env.GMAIL_APP_PASSWORD='abcdefghijklmnop';
const app=await createTestApp(),{accounts}=await import('../server.mjs'),browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const teacher=accounts.authenticate(accounts.login('teacher','Isolated-test-password-123!','mail-fixture').token);
 const preview=await accounts.learning.roster.preview(teacher,{name:'9A Email',grade:9,filename:'class.xlsx',base64:(await workbook([['An','Phụ huynh An','parent@example.com'],['Lan','Phụ huynh An','parent@example.com']])).toString('base64')});
 const created=accounts.learning.roster.commit(teacher,preview.id);
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await app.login(page,'teacher');await page.goto(app.base);await page.locator('#navigation a[href="#teacher-notifications"]').click();
 const form=page.locator('#parent-mail-form');await form.locator('[name=target]').selectOption('class:'+created.classId);
 await form.locator('[name=subject]').fill('Kết quả học tập tuần này');await form.locator('[name=message]').fill('Nhờ gia đình nhắc con ôn tập. <script>alert(1)</script>');await form.locator('[name=includeReport]').check();
 await form.locator('[name=teacherComment]').fill('Gia đình giúp con ôn lại kiến thức và trình bày các bước làm.');
 await form.locator('button').click();await page.locator('#parent-mail-confirm').waitFor();assert.equal(sent.length,0);
 assert.equal(await page.locator('#parent-mail-preview details').count(),1);await page.locator('#parent-mail-preview summary').click();
 assert.match(await page.locator('#parent-mail-preview').innerText(),/An, Lan/);assert.equal(await page.locator('#parent-mail-preview script').count(),0);
 assert.equal(await page.locator('#parent-mail-confirm').isDisabled(),true);
 const pdfURL=await page.locator('#parent-mail-preview a[href*="/pdf?"]').getAttribute('href');
 const draftPdf=await page.request.get(app.base+pdfURL);assert.equal(draftPdf.status(),200);assert.equal((await draftPdf.body()).subarray(0,5).toString(),'%PDF-');
 await page.locator('#parent-report-ack').check();await page.locator('#parent-report-approve').click();await page.locator('#parent-mail-confirm:not([disabled])').waitFor();
 const approvedPdf=await(await page.request.get(app.base+pdfURL)).body();assert.equal(sent.length,0);
 await page.screenshot({path:'artifacts/parent-mail-preview.png',fullPage:true});
 const response=page.waitForResponse(r=>r.url().endsWith('/api/parent-mail/send'));await page.locator('#parent-mail-confirm').click();const batch=await (await response).json();
 await page.locator('#parent-mail-history').getByText(/Gmail đã nhận thư/).waitFor({state:'attached'});assert.equal(sent.length,1);
 await page.locator('#parent-mail-history > details > summary').click();
 assert.equal(sent[0].to.address,'parent@example.com');assert.ok(!sent[0].cc&&!sent[0].bcc);assert.match(sent[0].text,/Chưa có dữ liệu bài làm/);
 assert.equal(sent[0].attachments.length,1);assert.equal(sent[0].attachments[0].contentType,'application/pdf');assert.deepEqual(sent[0].attachments[0].content,approvedPdf);
 assert.equal((await page.request.post(app.base+'/api/parent-mail/send',{data:{id:batch.id}})).status(),202);assert.equal(sent.length,1);
 await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 await page.screenshot({path:'artifacts/parent-mail-mobile.png',fullPage:true});
 await app.login(page);for(const path of ['options','history'])assert.equal((await page.request.get(app.base+'/api/parent-mail/'+path)).status(),403);
 assert.equal((await page.request.post(app.base+'/api/parent-mail/send',{data:{id:batch.id}})).status(),403);assert.deepEqual(errors,[]);
 assert.equal((await page.request.get(app.base+pdfURL)).status(),403);
 console.log('PASS: teacher menu, real Excel contacts, preview, private report, queued send, history, duplicate protection, role guard and mobile (mock SMTP only).');
}finally{await browser.close();await app.close();}
