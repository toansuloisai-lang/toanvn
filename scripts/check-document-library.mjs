import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import {createTestApp} from './browser-fixture.mjs';
const app=await createTestApp({grade:8}),{accounts}=await import('../server.mjs');
const teacher=accounts.users().find(u=>u.role==='teacher'),student=accounts.users().find(u=>u.role==='student');
const zip=new JSZip();zip.file('[Content_Types].xml','<Types/>');zip.file('word/document.xml','<document>Learning material</document>');const base64=await zip.generateAsync({type:'base64'});
for(const grade of [6,7,8,9])for(let i=1;i<=10;i++)accounts.uploadLesson(teacher,{title:`Toán ${grade} · Tài liệu ${i}`,grade,filename:`Toan-${grade}-${i}.docx`,base64});
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}});await app.login(page,'teacher');await page.goto(app.base+'/#teacher-library/documents');await page.locator('#document-grade').waitFor();assert.equal(await page.locator('[data-document-grade]').count(),40);
 for(const grade of [6,7,8,9]){await page.locator('#document-grade').selectOption(String(grade));assert.equal(await page.locator('[data-document-grade]:visible').count(),10);assert.equal(await page.locator('#document-count').textContent(),'10');}
 await page.locator('#document-grade').selectOption('8');const href=await page.locator('[data-document-grade]:visible a[download]').first().getAttribute('href');const response=await page.request.get(app.base+href);assert.equal(response.status(),200);assert.ok((await response.body()).length>0);await page.screenshot({path:'artifacts/document-library.png',fullPage:true});await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 assert.equal(accounts.uploadedLessons(student).length,10);console.log('40 documents, grade filters, download, student grade access and mobile layout passed.');
}finally{await browser.close();await app.close();}
