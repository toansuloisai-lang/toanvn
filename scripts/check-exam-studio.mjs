import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import {createTestApp} from './browser-fixture.mjs';
const app=await createTestApp({grade:8}),{accounts}=await import('../server.mjs');
const teacher=accounts.users().find(u=>u.role==='teacher'),student=accounts.users().find(u=>u.role==='student');
accounts.learning.createClass(teacher,{name:'8A4',grade:8,studentIds:[student.id]});
const originalFetch=globalThis.fetch;let calls=0;
globalThis.fetch=async(url,options)=>{if(String(url).includes('generativelanguage.googleapis.com')){calls++;const input=JSON.parse(JSON.parse(options.body).contents[0].parts[0].text);return {ok:true,json:async()=>({candidates:[{content:{parts:[{text:JSON.stringify({title:'Ôn tập số học',questions:Array.from({length:input.count},(_,i)=>({prompt:`Tính 2 + ${i+2}.`,topic:'Số học',knowledge:'Phép cộng',explanation:'Cộng hai số theo quy tắc.',choices:['1','2','4','6'],correctIndex:2}))})}]}}]})};}return originalFetch(url,options);};
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage();await app.login(page,'teacher');await page.goto(app.base+'/#exams');await page.locator('.assessment-class-card').first().click();await page.getByRole('link',{name:'Tạo đề trắc nghiệm',exact:true}).click();
 await page.getByRole('tab',{name:/Tạo bằng AI/}).click();await page.locator('#author-prompt').fill('Tạo câu hỏi về phép cộng số nguyên');await page.locator('#author-count').fill('2');await page.locator('#author-generate').click();await page.getByText('Đã thêm 2 câu.',{exact:false}).waitFor();assert.equal(await page.locator('.author-question').count(),2);assert.equal(accounts.exams.list(teacher).length,0);
 await page.locator('#author-outline button').first().click();await page.locator('.author-question:visible [data-action=duplicate]').click();assert.equal(await page.locator('.author-question').count(),3);await page.locator('.author-question:visible [data-action=remove]').click();
 await page.getByRole('button',{name:'Xem trước đề',exact:true}).click();await page.locator('#exam-author-review').waitFor({state:'visible'});await page.locator('#exam-edit').click();assert.equal(await page.locator('.author-question').count(),2);
 await page.getByRole('tab',{name:/Nhập từ Word/}).click();const zip=new JSZip();zip.file('[Content_Types].xml','<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/></Types>');zip.file('word/document.xml','<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Tính tổng hai số 2 và 2.</w:t></w:r></w:p></w:body></w:document>');await page.locator('#author-word').setInputFiles({name:'Bai tap.docx',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',buffer:await zip.generateAsync({type:'nodebuffer'})});
 // Simulate elapsed rate-limit interval without delaying the browser suite.
 const now=Date.now;Date.now=()=>now()+16000;
 await page.locator('#author-count').fill('1');await page.locator('#author-generate').click();await page.getByText('Đã thêm 1 câu.',{exact:false}).waitFor();Date.now=now;
 assert.equal(await page.locator('.author-question').count(),3);assert.equal(calls,2);assert.equal(accounts.exams.list(teacher).length,0);
 await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 await page.screenshot({path:'artifacts/exam-studio-mobile.png',fullPage:true});await page.setViewportSize({width:1440,height:1000});await page.getByRole('tab',{name:/Soạn thủ công/}).click();await page.screenshot({path:'artifacts/exam-studio-desktop.png',fullPage:true});
 console.log('AI, Word extraction, editable drafts, duplicate/remove, review and mobile layout passed.');
}finally{globalThis.fetch=originalFetch;await browser.close();await app.close();}
