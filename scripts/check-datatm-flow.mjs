import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from '@playwright/test';
import {createTestApp} from './browser-fixture.mjs';
import {datatmBank} from '../datatm-service.mjs';
const originalFetch=globalThis.fetch,contexts=[];
globalThis.fetch=async(url,options)=>{
 if(String(url).startsWith('https://generativelanguage.googleapis.com/')){const context=JSON.parse(JSON.parse(options.body).contents[0].parts[0].text);contexts.push(context);return {ok:true,json:async()=>({candidates:[{content:{parts:[{text:JSON.stringify({summary:'Ưu tiên bài cùng kiến thức về kết quả của phép thử.',actions:['Liệt kê từng kết quả rồi đếm.'],exerciseIds:context.candidates.slice(0,1).map(q=>q.id)})}]}}]})};}
 return originalFetch(url,options);
};
const app=await createTestApp({grade:8}),{accounts}=await import('../server.mjs');
const s=accounts.users().find(u=>u.role==='student'),t=accounts.authenticate(accounts.login('teacher','Isolated-test-password-123!','datatm-fixture').token);
const group=accounts.learning.createClass(t,{name:'8A',grade:8,studentIds:[s.id]}),exam=accounts.exams.publish(t,{title:'Xác suất',classId:group.id,durationMinutes:30,questions:[{prompt:'Tung đồng xu một lần có bao nhiêu kết quả có thể?',choices:['1','2','3','4'],correctIndex:1,explanation:'Có hai kết quả: sấp và ngửa.',topic:'Kết quả có thể và kết quả thuận lợi',knowledge:'Không gian mẫu, xác suất',source:'Giáo viên biên soạn'}]});
accounts.exams.start(s,exam.id);accounts.exams.submit(s,exam.id,{answers:[0],version:0});
const browser=await chromium.launch({channel:'msedge',headless:true}),page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
await mkdir('artifacts',{recursive:true});
try{
 await app.login(page);await page.goto(app.base+'/#knowledge');await page.locator('.datatm-practice').waitFor();
 assert.match(await page.locator('.datatm-practice').innerText(),/Sửa đúng bài gốc/);assert.equal(await page.locator('[data-datatm-answer]').count(),0);
 const repair=page.locator('[data-repair]').first();await repair.locator('input[value="1"]').check();await repair.locator('textarea').fill('Em liệt kê mặt sấp và mặt ngửa nên có 2 kết quả.');await repair.locator('button').click();await page.locator('[data-datatm-answer]').first().waitFor();
 assert.equal(await page.locator('[data-datatm-answer]').count(),3);
 await page.locator('[data-datatm-ai]').click();await page.locator('.datatm-practice .feedback').waitFor();assert.equal(contexts.length,1);assert.ok(contexts[0].candidates.every(q=>q.grade===8&&!q.answer));
 const form=page.locator('[data-datatm-answer]').first(),id=await form.getAttribute('data-datatm-answer'),q=datatmBank.find(q=>q.id===id);await form.locator('..').evaluate(el=>el.open=true);await form.locator('input').fill('999');await form.locator('textarea').fill('Em đếm được 999 kết quả.');await form.locator('button').click();await page.locator('.datatm-history').waitFor();assert.match(await page.locator('.datatm-history').innerText(),/Cần sửa tiếp/);
 const retry=page.locator(`[data-datatm-answer="${id}"]`);await retry.locator('..').evaluate(el=>el.open=true);await retry.locator('input').fill(q.answer);await retry.locator('textarea').fill('Em liệt kê và đếm từng kết quả theo lời giải.');await retry.locator('button').click();await page.waitForFunction(()=>document.querySelector('.datatm-history')?.textContent.includes('Đã sửa đúng sau lời giải'));
 assert.equal(await page.locator(`[data-datatm-answer="${id}"]`).count(),0);
 await page.screenshot({path:'artifacts/datatm-knowledge-desktop.png',fullPage:true});
 await page.goto(app.base+'/#notebook');await page.locator('.datatm-practice').waitFor();assert.match(await page.locator('.datatm-practice').innerText(),/Đã sửa đúng sau khi xem lời giải 1 câu/);
 await page.reload();await page.locator('.datatm-practice').waitFor();assert.match(await page.locator('.datatm-history').innerText(),/Lịch sử bài củng cố \(2 lượt\)/);
 await page.setViewportSize({width:390,height:844});await page.locator('.datatm-question').first().evaluate(el=>el.open=true);await page.screenshot({path:'artifacts/datatm-notebook-mobile.png',fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 const parent=accounts.createUser({username:'parent',name:'Phụ huynh',password:'Isolated-test-password-123!',role:'parent',studentIds:[s.id]});await app.login(page,'parent');await page.goto(app.base+'/?role=parent#knowledge');await page.locator('.datatm-practice').waitFor();assert.equal(await page.locator('[data-datatm-answer]').count(),0);assert.match(await page.locator('.datatm-practice').innerText(),/Đã sửa đúng sau khi xem lời giải 1 câu/);
 assert.deepEqual(errors,[]);console.log(JSON.stringify({repair:true,realQuestions:true,aiRetrieval:true,wrongThenCorrect:true,refreshHistory:true,parentReadOnly:true,mobileOverflow:false,consoleErrors:errors}));
}finally{globalThis.fetch=originalFetch;await browser.close();await app.close();}
