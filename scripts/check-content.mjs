import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {createTestApp} from './browser-fixture.mjs';
const app=await createTestApp(),browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage();await app.login(page,'teacher');await page.goto(app.base+'/#teacher-library/create');await page.locator('#content-form').waitFor();await page.locator('#content-kind').selectOption('formula');
 await page.locator('#content-title').fill('Xác suất đồng xu');await page.locator('#content-topic').fill('Xác suất');await page.locator('#content-grade').selectOption('7');await page.locator('#content-tex').focus();await page.locator('[data-symbol="0"]').click();assert.equal(await page.locator('#content-tex').inputValue(),'\\frac{a}{b}');
 await page.locator('#content-tex').fill('P(A)=\\frac12');await page.locator('#content-condition').fill('Các kết quả đồng khả năng.');await page.locator('#content-example').fill('P(A)=0.5');await page.locator('#content-form button[type="submit"], #content-form > button').last().click();assert.equal(await page.locator('#content-publish').isDisabled(),true);await page.locator('#content-approved').check();await page.locator('#content-publish').click();await page.locator('#content-title').waitFor();
 await page.locator('#content-kind').selectOption('exercise');await page.locator('#content-grade').selectOption('7');
 const values={title:'Đồng xu',topic:'Xác suất',prompt:'Tung đồng xu cân đối. Xác suất mặt sấp?',answer:'1/2',wrong:'1',rule:'Một trong hai kết quả đồng khả năng nên xác suất là 1/2.'};for(const [f,v] of Object.entries(values))await page.locator('#content-'+f).fill(v);
 await page.locator('#content-form > button').click();await page.locator('#content-approved').check();await page.locator('#content-publish').click();await page.locator('#content-title').waitFor();
 const workspace=await (await page.request.get(app.base+'/api/workspace')).json();assert.equal(workspace.teacherContents.length,2);
 await app.login(page);await page.goto(app.base+'/#formulas');await page.reload();await page.getByText('Xác suất đồng xu',{exact:true}).waitFor();
 const exercise=workspace.teacherContents.find(c=>c.kind==='exercise');await page.goto(app.base+'/#learn/'+exercise.id);await page.locator('#answer').fill('1/2');await page.locator('#answer-form button').click();if(await page.locator('[data-diagnosis="1"]').count()){await page.locator('[data-diagnosis="1"]').click();await page.locator('[data-next]').click();}await page.locator('#correction').fill('1/2');await page.locator('#correction-form button').click();await page.locator('#explanation').fill('One favorable outcome out of two equally likely outcomes.');await page.locator('[data-skip-ai]').click();await page.getByText('Chọn bài luyện khác',{exact:true}).waitFor();
 await page.goto(app.base+'/#progress');await page.waitForTimeout(250);const saved=await (await page.request.get(app.base+'/api/workspace')).json();assert.equal(saved.state.attempts[0].exerciseId,exercise.id);assert.ok(saved.state.attempts[0].completed);
 assert.equal((await page.request.post(app.base+'/api/teacher/content/draft',{data:{}})).status(),403);
 console.log('PASS: toolbar, review, publish, student formula, complete exercise and persisted progress.');
}finally{await browser.close();await app.close();}
