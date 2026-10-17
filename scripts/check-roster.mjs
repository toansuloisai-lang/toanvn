import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {createTestApp} from './browser-fixture.mjs';
import {workbook} from '../roster-import.mjs';
const app=await createTestApp(),browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage();await app.login(page,'teacher');await page.goto(app.base+'/#learning/classes');
 const form=page.locator('#roster-form');await form.locator('[name=name]').fill('9A Excel');await form.locator('[name=grade]').selectOption('9');
 await form.locator('[name=file]').setInputFiles({name:'class.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:await workbook([['An','Bình','binh@example.com'],['Lan','Bình','binh@example.com']])});
 await form.locator('button').click();await page.locator('#roster-confirm').waitFor();
 const response=page.waitForResponse(r=>r.url().endsWith('/api/roster/commit'));await page.locator('#roster-confirm').click();const created=await (await response).json();assert.equal(created.count,2);
 const download=page.waitForEvent('download');await page.locator('#roster-download').click();assert.equal((await download).suggestedFilename(),'tai-khoan-lop-9A-Excel.xlsx');
 await page.locator('#roster-open').click();await page.waitForFunction(()=>document.querySelector('#learning-class')?.selectedOptions[0]?.textContent.includes('9A Excel'));
 for(const [username,password,role] of [[created.credentials[0][1],created.credentials[0][2],'student'],[created.credentials[0][5],created.credentials[0][6],'parent']]){
   const login=await page.request.post(app.base+'/api/auth/login',{data:{username,password}});assert.equal((await login.json()).user.role,role);
   const workspace=await (await page.request.get(app.base+'/api/workspace')).json();if(role==='parent')assert.equal(workspace.students.length,2);else {assert.equal(workspace.state.profile.grade,9);await page.goto(app.base+'/?roster-account=student#profile');await page.locator('#profile-grade').waitFor();assert.equal(await page.locator('#profile-grade').inputValue(),'9');}
   assert.equal((await page.request.post(app.base+'/api/roster/commit',{data:{id:'fake'}})).status(),403);
 }
 console.log('Excel UI, account download, role login, grade and parent isolation passed.');
}finally{await browser.close();await app.close();}
