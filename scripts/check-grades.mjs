import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {createTestApp} from './browser-fixture.mjs';
import {exercises,skills} from '../public/data.js';
import {formulasForGrade} from '../public/formula-library.js';
const app=await createTestApp(),browser=await chromium.launch({channel:'msedge',headless:true});
const page=await browser.newPage({viewport:{width:1536,height:1024}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
async function grade(value){await page.goto(app.base+'/#profile');await page.locator('#profile-grade').selectOption(String(value));const saved=page.waitForResponse(r=>r.url().endsWith('/api/student/state')&&r.request().method()==='PUT');await page.locator('#profile-form button').click();assert.equal((await saved).status(),200);}
try{
  await app.login(page);await page.goto(app.base+'/#learn/distribute-1');await page.locator('#answer').fill('0');await page.locator('#answer-form button').click();
  for(const n of [9,6,8,7,9]){
    await grade(n);await page.goto(app.base+'/#practice');await page.locator('.exercise-card').first().waitFor();
    assert.equal(await page.locator('.exercise-card').count(),exercises.filter(e=>e.grades.includes(n)).length);
    await page.goto(app.base+'/#lessons');assert.equal(await page.locator('.lesson-grid .card').count(),skills.filter(s=>s.grades.includes(n)).length);
    await page.goto(app.base+'/#formulas');assert.equal(await page.locator('.atlas-list .formula-item').count(),formulasForGrade(n).length);
    await page.goto(app.base+'/#home');assert.match(await page.locator('.route-heading').textContent(),new RegExp('Lớp '+n));
    const href=await page.locator('.start-learning').getAttribute('href');assert.ok(exercises.filter(e=>e.grades.includes(n)).some(e=>href.includes(e.id)));
  }
  await page.reload();await page.locator('.reference-hero').waitFor();assert.match(await page.locator('.route-heading').textContent(),/Lớp 9/);
  await page.goto(app.base+'/#practice');assert.match(await page.locator('#main').textContent(),/Căn bậc hai/);assert.doesNotMatch(await page.locator('#main').textContent(),/Số âm & dấu/);
  await page.screenshot({path:'artifacts/grade9-practice.png',fullPage:true});
  await page.goto(app.base+'/#learn/roots9-1');assert.equal(await page.locator('.problem msqrt').count(),1);await page.locator('#answer').fill('-5');await page.locator('#answer-form button').click();if(await page.locator('[data-diagnosis="1"]').count()){await page.locator('[data-diagnosis="1"]').click();await page.locator('[data-next]').click();}await page.locator('#correction').fill('5');await page.locator('#correction-form button').click();await page.locator('#explanation').fill('Căn bậc hai số học không âm, phải lấy giá trị tuyệt đối của âm năm bằng năm.');await page.locator('[data-skip-ai]').click();
  await page.goto(app.base+'/#notebook');await page.locator('.knowledge-hub[data-loaded="true"]').waitFor();assert.match(await page.locator('#main').textContent(),/Căn bậc hai/);assert.match(await page.locator('#main').textContent(),/Phép phân phối/);
  await page.goto(app.base+'/#formulas');await page.locator('[data-layout="list"]').click();await page.locator('.atlas-list [data-open-formula="formula-17"]').click();assert.equal(await page.locator('.math-fallback,.katex-error').count(),0);await page.keyboard.press('Escape');
  await page.setViewportSize({width:390,height:844});await page.goto(app.base+'/#practice');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:'artifacts/grade9-mobile.png',fullPage:true});
  assert.deepEqual(errors,[]);console.log('PASS: grades 6–9 filter lessons, practice, formulas and dashboard; profile persists; grade 9 learning loop; old history retained; mobile and math rendering');
}finally{await browser.close();await app.close();}
