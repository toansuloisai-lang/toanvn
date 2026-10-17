import assert from 'node:assert/strict';
import sharp from 'sharp';
import {mkdir} from 'node:fs/promises';
import {chromium} from '@playwright/test';
import {createTestApp} from './browser-fixture.mjs';
const originalFetch=globalThis.fetch,contexts=[];let rejectNext=false;
globalThis.fetch=async(url,options)=>{
 if(String(url).startsWith('https://generativelanguage.googleapis.com/')){
  if(rejectNext){rejectNext=false;return {ok:false,status:503};}
  const content=JSON.parse(options.body),payload=JSON.parse(content.contents.at(-1).parts[0].text),data=payload.currentLearningData;contexts.push(data);
  return {ok:true,json:async()=>({candidates:[{content:{parts:[{text:JSON.stringify({reply:String.raw`Với căn bậc hai: \(\sqrt{x^2}=\lvert x\rvert\). Phân số: \[\frac{1}{2}+\frac{1}{3}=\frac{5}{6}\] Hệ phương trình: \(\begin{cases}x+y=3\\x-y=1\end{cases}\). Mình cùng liệt kê từng kết quả của phép thử rồi đếm nhé.`,evidenceIds:data.evidence.slice(0,1).map(e=>e.id),exerciseIds:data.candidates.slice(0,1).map(q=>q.id),plan:[{title:'Liệt kê kết quả',action:'Làm bài mới, ghi cách đếm rồi đối chiếu lời giải.'},{title:'Ôn lại',action:'Ngày mai tự làm lại một bài khác trước khi xem gợi ý.'}]})}]}}]})};
 }return originalFetch(url,options);
};
const app=await createTestApp({grade:8}),{accounts}=await import('../server.mjs');const student=accounts.users().find(u=>u.role==='student');
const browser=await chromium.launch({channel:'msedge',headless:true}),page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await mkdir('artifacts',{recursive:true});
try{
 await app.login(page);await page.goto(app.base+'/#chat');await page.locator('#tutor-message').waitFor();assert.ok(await page.locator('#navigation a[href="#chat"]').count());
 const photo=await sharp({create:{width:120,height:80,channels:3,background:'white'}}).png().toBuffer();await page.locator('.tutor-attachments input').setInputFiles({name:'bai-toan.png',mimeType:'image/png',buffer:photo});await page.locator('.tutor-photo-preview img').waitFor();
 await page.locator('#tutor-message').fill('Em hay sai xác suất. Hãy chọn bài và lập lộ trình.');await page.locator('.tutor-composer button[type=submit]').click();await page.locator('.tutor-assistant').waitFor();assert.equal(contexts.length,1);assert.equal(contexts[0].grade,8);assert.ok(contexts[0].candidates.some(q=>q.source==='datatm'));assert.ok(!JSON.stringify(contexts[0]).includes(student.name));assert.equal(await page.locator('.tutor-assistant .math-fallback').count(),0);assert.ok(await page.locator('.tutor-assistant .katex').count()>=3);assert.equal(await page.locator('.tutor-plan li').count(),2);assert.equal(await page.locator('.tutor-sent-photos img').count(),1);assert.equal(await page.locator('.tutor-photo-preview img').count(),0);
 const card=page.locator('.tutor-exercise').first();await card.locator('summary').first().click();const form=card.locator('[data-tutor-answer]');await form.locator('input').fill('999');await form.locator('textarea').fill('Em đếm theo từng kết quả có thể.');await form.locator('button').click();await page.locator('.tutor-attempt').waitFor();assert.match(await page.locator('.tutor-attempt').innerText(),/Đáp án chưa đúng/);
 await page.screenshot({path:'artifacts/tutor-desktop.png',fullPage:true});
 await page.reload();await page.locator('[data-chat-history] option').nth(1).waitFor({state:'attached'});await page.locator('[data-chat-history]').selectOption({index:1});await page.locator('.tutor-attempt').waitFor({state:'attached'});assert.equal(await page.locator('.tutor-assistant .math-fallback').count(),0);
 await page.locator('#tutor-message').fill('Vậy em cần sửa bước nào tiếp?');await page.locator('.tutor-composer button[type=submit]').click();await page.waitForFunction(()=>document.querySelectorAll('.tutor-assistant').length===2);assert.equal(contexts[1].focus,'xác suất');assert.equal(contexts[1].practice[0].answer,'999');
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'artifacts/tutor-mobile.png',fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 rejectNext=true;await page.locator('#tutor-message').fill('Giúp em ôn tiếp');await page.locator('.tutor-composer button[type=submit]').click();await page.waitForFunction(()=>document.querySelector('[data-chat-status]')?.textContent.includes('Gemini chưa phản hồi'));assert.equal(await page.locator('#tutor-message').inputValue(),'Giúp em ôn tiếp');assert.equal(await page.locator('.tutor-assistant').count(),2);
 await page.goto(app.base+'/#notebook');await page.locator('.knowledge-mistake').waitFor();assert.match(await page.locator('.knowledge-mistake').first().innerText(),/Bài luyện cùng gia sư/);
 await app.login(page,'teacher');await page.goto(app.base+'/?teacher=1#chat');assert.equal(await page.locator('#tutor-message').count(),0);assert.equal((await page.request.get(app.base+'/api/tutor')).status(),403);
 assert.deepEqual(errors,[]);console.log(JSON.stringify({math:true,datatm:true,studentOnly:true,privateContext:true,chatHistory:true,practiceSaved:true,notebookLinked:true,apiFailurePreservesDraft:true,mobileFits:true,consoleErrors:errors}));
}finally{globalThis.fetch=originalFetch;await browser.close();await app.close();}
