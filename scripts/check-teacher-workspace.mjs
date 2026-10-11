import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {createTestApp} from './browser-fixture.mjs';
const app=await createTestApp(),browser=await chromium.launch({channel:'msedge',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await app.login(page,'teacher');
 for(const route of ['', '/create','/documents']){
  await page.goto(app.base+'/#teacher-library'+route);await page.locator('.teacher-workspace').waitFor();
  await page.screenshot({path:`artifacts/teacher-workspace${route.replace('/','-')||'-overview'}.png`,fullPage:true});
  await page.setViewportSize({width:390,height:844});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Mobile overflow: '+route);
  await page.setViewportSize({width:1440,height:1000});
 }
 await page.goto(app.base+'/#teacher-library/assign');await page.locator('#tw-exam-form').waitFor();
 await page.locator('#tw-exam-title').fill('Ôn tập tuần 3');
 const option=await page.locator('#tw-exam-recipient optgroup[label="Từng học sinh"] option').first().getAttribute('value');
 await page.locator('#tw-exam-recipient').selectOption(option);
 const questions=page.locator('#tw-question-bank input');assert.ok(await questions.count()>1);
 await questions.nth(0).check();await questions.nth(1).check();
 assert.equal(await page.locator('#tw-selected-count').textContent(),'2');
 await page.screenshot({path:'artifacts/teacher-workspace-assign.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Exam mobile overflow');
 await page.screenshot({path:'artifacts/teacher-workspace-mobile.png',fullPage:true});
 await page.locator('#tw-exam-form button[type="submit"]').click();await page.locator('#tw-edit-exam').click();
 assert.equal(await page.locator('#tw-selected-count').textContent(),'2');
 await page.locator('#tw-exam-form button[type="submit"]').click();await page.locator('#tw-publish-exam').click();
 await page.locator('#tw-new-exam').waitFor();
 const report=await (await page.request.get(app.base+'/api/learning/report?studentId='+option.slice(8))).json();
 assert.equal(report.assignments.length,1);assert.equal(report.assignments[0].title,'Ôn tập tuần 3');
 await app.login(page);await page.goto(app.base+'/#learning');await page.reload();
 await page.getByText('Ôn tập tuần 3',{exact:false}).first().waitFor();
 assert.deepEqual(errors,[]);
 console.log('PASS: teacher workspace routes, responsive layouts, question selection, review/edit, actual assignment and student access.');
}finally{await browser.close();await app.close();}
