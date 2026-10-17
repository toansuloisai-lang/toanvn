import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {createTestApp} from './browser-fixture.mjs';
const app=await createTestApp({grade:9}),{accounts}=await import('../server.mjs');
const student=accounts.users().find(u=>u.role==='student'),teacher=accounts.users().find(u=>u.role==='teacher');
accounts.learning.createClass(teacher,{name:'9A',grade:9,studentIds:[student.id]});
const browser=await chromium.launch({channel:'msedge',headless:true}),page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
const originalFetch=globalThis.fetch;let release,started;const waiting=new Promise(r=>started=r),gate=new Promise(r=>release=r);
globalThis.fetch=async(url,...args)=>{if(String(url).includes('generativelanguage.googleapis.com')){started();await gate;return {ok:true,json:async()=>({candidates:[{content:{parts:[{text:JSON.stringify({reply:'Ta cùng kiểm tra từng bước.',evidenceIds:[],exerciseIds:[],plan:[]})}]}}]})};}return originalFetch(url,...args);};
try{
 await app.login(page,'teacher');await page.goto(app.base+'/#teacher-library/documents');await page.locator('[data-show-upload]').click();assert.equal(await page.evaluate(()=>location.hash),'#teacher-library/documents');assert.ok(await page.locator('#lesson-upload-form').isVisible());
 await page.goto(app.base+'/#teacher-library/lessons');assert.doesNotMatch(await page.locator('[data-import-lessons]').innerText(),/demo|test/i);
 await app.login(page);await page.goto(app.base+'/?student=1#profile');await page.locator('#profile-grade').waitFor();assert.ok(await page.locator('#profile-grade').isDisabled());
 assert.equal((await page.request.put(app.base+'/api/student/state',{data:{attempts:[],reviews:{},profile:{name:student.name,grade:8}}})).status(),409);
 await page.goto(app.base+'/#formulas');await page.locator('[data-grade]').waitFor();assert.equal(await page.locator('[data-grade]').inputValue(),'9');assert.ok(await page.locator('.atlas-list [data-open-formula="formula-17"]').isVisible());
 await page.goto(app.base+'/#chat');await page.locator('#tutor-message').fill('Giúp em học toán');await page.locator('.tutor-composer button[type=submit]').click();await Promise.race([waiting,new Promise((_,reject)=>setTimeout(()=>reject(Error('AI request not started')),5000))]);
 await page.locator('#navigation a[href="#home"]').click();await page.locator('.reference-dashboard').waitFor();release();await page.waitForTimeout(300);assert.deepEqual(errors,[]);
 console.log('PASS: upload anchor, clean lesson label, locked class grade, grade 9 formulas, navigation during pending chat.');
}finally{release();globalThis.fetch=originalFetch;await browser.close();await app.close();}
