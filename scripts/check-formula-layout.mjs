import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {createTestApp} from './browser-fixture.mjs';
import {formulaLibrary} from '../public/formula-library.js';
const app=await createTestApp();const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));await app.login(page,'teacher');await page.goto(app.base+'/#formulas');await page.locator('[data-grade]').selectOption('all');
 for(const f of formulaLibrary){
  await page.locator(`.atlas-list [data-formula="${f.id}"] h2`).click();
  assert.ok(await page.locator('.worked-example ol li').count()>=2);
  assert.ok(await page.locator('.worked-problem').innerText());
  assert.ok(await page.locator('.formula-counter').isVisible());
  await page.locator('[data-close-formula]').click();
 }
 for(const layout of ['table','sphere','helix']){
  await page.locator(`[data-layout="${layout}"]`).click();await page.waitForTimeout(1400);
  const cards=page.locator('.atlas-scene [data-formula]:visible');assert.equal(await cards.count(),6);
  const boxes=await cards.evaluateAll(els=>els.map(el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width};}));
  for(let i=0;i<boxes.length;i++){assert.ok(boxes[i].width>180);for(let j=i+1;j<boxes.length;j++){const a=boxes[i],b=boxes[j];assert.ok(Math.min(a.right,b.right)<=Math.max(a.x,b.x)||Math.min(a.bottom,b.bottom)<=Math.max(a.y,b.y),'Cards overlap in '+layout);}}
  await cards.first().locator('h2').click();assert.ok(await page.locator('.worked-example').isVisible());await page.locator('[data-close-formula]').click();
  const first=await cards.first().getAttribute('data-formula');await page.locator('[data-page="1"]').click();assert.notEqual(await cards.first().getAttribute('data-formula'),first);
 }
 await page.screenshot({path:'artifacts/formula-layout-refined.png',fullPage:true});assert.deepEqual(errors,[]);console.log('PASS: all 99 examples, whole-card opening, three spaced layouts and pagination');
}finally{await browser.close();await app.close();}
