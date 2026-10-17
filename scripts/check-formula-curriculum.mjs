import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {createTestApp} from './browser-fixture.mjs';
import {formulaLibrary,formulasForGrade} from '../public/formula-library.js';
assert.equal(new Set(formulaLibrary.map(f=>f.id)).size,formulaLibrary.length);
const app=await createTestApp({grade:6});
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await app.login(page,'teacher');await page.goto(app.base+'/#formulas');await page.locator('[data-grade]').waitFor();
 for(const grade of [6,7,8,9]){
  await page.locator('[data-grade]').selectOption(String(grade));
  assert.equal(await page.locator('.atlas-list [data-formula]:visible').count(),formulasForGrade(grade).length);
  await page.locator('[data-group="statistics"]').click();
  assert.ok(await page.locator('.atlas-list [data-formula]:visible').count()>0);
  await page.locator('.atlas-list [data-formula]:visible [data-open-formula]').first().click();
  assert.ok(await page.locator('.formula-check').isVisible());await page.locator('[data-close-formula]').click();
  await page.locator('[data-group="all"]').click();
 }
 await page.locator('[data-topic]').selectOption({index:1});assert.ok(await page.locator('.atlas-list [data-formula]:visible').count()>0);
 await page.locator('[data-search]').fill('zzzzzzzz');assert.equal(await page.locator('.atlas-list [data-formula]:visible').count(),0);
 await page.locator('[data-layout="table"]').click();await page.locator('[data-search]').fill('');
 await page.setViewportSize({width:390,height:844});await page.locator('[data-layout="list"]').click();
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({total:formulaLibrary.length,grades:[6,7,8,9].map(g=>({grade:g,count:formulasForGrade(g).length})),browser:'passed'}));
}finally{await browser.close();await app.close();}
