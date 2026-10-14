import {createTestApp} from './browser-fixture.mjs';
const testApp=await createTestApp();
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'msedge',headless:true});
const context=await browser.newContext({viewport:{width:1536,height:1100}}),page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));
const dimension=async(index,value)=>page.locator(`[data-dimension="${index}"]`).evaluate((input,value)=>{input.value=String(value);input.dispatchEvent(new Event('input',{bubbles:true}));},value);
try{
  await testApp.login(page,'teacher');
  await page.goto(testApp.base+'/#formulas');await page.locator('.atlas-list').waitFor({state:'attached'});
  await page.locator('.atlas-scene .formula-tile').first().waitFor();await page.waitForTimeout(1400);
  assert.equal(await page.locator('.atlas-scene .formula-tile').count(),18);
  await page.screenshot({path:'artifacts/formula-atlas-table.png',fullPage:true});
  const before=await page.locator('.atlas-scene .formula-tile').first().getAttribute('style');
  await page.locator('[data-layout="sphere"]').click();await page.waitForTimeout(1400);
  assert.notEqual(await page.locator('.atlas-scene .formula-tile').first().getAttribute('style'),before);
  await page.screenshot({path:'artifacts/formula-atlas-sphere.png',fullPage:true});
  await page.locator('[data-layout="helix"]').click();await page.waitForTimeout(1300);
  await page.screenshot({path:'artifacts/formula-atlas-helix.png',fullPage:true});
  await page.locator('[data-layout="table"]').click();await page.waitForTimeout(1400);
  await page.locator('.atlas-scene [data-open-formula="formula-10"]').click();
  await page.locator('.formula-dialog[open]').waitFor();
  assert.match(await page.locator('.cannot-use').textContent(),/chưa có căn cứ tam giác vuông/);
  await dimension(0,6);await dimension(1,8);
  assert.match(await page.locator('.geometry-result annotation').textContent(),/10/);
  await page.locator('#formula-check-input').fill('10');await page.locator('.formula-check button').click();
  await page.locator('.check-correct').waitFor();
  await page.locator('.formula-dialog').evaluate(d=>d.scrollTop=0);
  await page.screenshot({path:'artifacts/formula-detail-pythagoras.png'});
  await page.keyboard.press('Escape');assert.equal(await page.locator('.formula-dialog[open]').count(),0);
  await page.locator('[data-layout="list"]').click();
  await page.locator('[data-group="geometry"]').click();assert.equal(await page.locator('.atlas-list .formula-tile:not([hidden])').count(),7);
  for(const [id,expected] of [[12,'24'],[13,'12'],[14,'9'],[15,'72'],[16,'70']]){
    await page.locator(`.atlas-list [data-open-formula="formula-${id}"]`).click();
    assert.match(await page.locator('.geometry-result annotation').textContent(),new RegExp(expected));
    assert.equal(await page.locator('.formula-dialog .math-fallback').count(),0);
    if(id===15){await dimension(0,5);await dimension(1,4);await dimension(2,2);assert.match(await page.locator('.geometry-result annotation').textContent(),/40/);await page.locator('[data-box-turn="1"]').click();await page.screenshot({path:'artifacts/formula-detail-box.png'});}
    await page.locator('[data-close-formula]').click();
  }
  await page.locator('[data-group="all"]').click();
  for(let id=1;id<=18;id++){
    await page.locator(`.atlas-list [data-open-formula="formula-${id}"]`).click();assert.equal(await page.locator('.formula-dialog .math-fallback,.katex-error').count(),0);
    assert.equal(await page.locator('.worked-example li').count()>0,true);
    await page.locator('[data-close-formula]').click();
  }
  await page.setViewportSize({width:390,height:844});await page.reload();
  await page.locator('.atlas-list').waitFor({state:'attached'});assert.equal(await page.locator('[data-layout="list"]').getAttribute('aria-pressed'),'true');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.locator('.atlas-list [data-open-formula="formula-13"]').click();
  assert.ok(await page.locator('.formula-dialog').evaluate(d=>d.scrollWidth<=d.clientWidth+1));
  await page.screenshot({path:'artifacts/formula-detail-mobile.png'});await page.keyboard.press('Escape');
  await page.emulateMedia({reducedMotion:'reduce'});await page.locator('[data-layout="sphere"]').click();
  assert.equal(await page.locator('[data-rotate]').isDisabled(),true);
  await page.evaluate(()=>navigator.serviceWorker.ready);await page.reload();await page.locator('.atlas-list').first().waitFor();await context.setOffline(true);
  await page.locator('.atlas-list [data-open-formula="formula-12"]').click();assert.equal(await page.locator('.formula-dialog .math-fallback').count(),0);
  await page.keyboard.press('Escape');
  await page.goto(testApp.base+'/#teacher');await page.getByRole('heading',{name:'Góc giáo viên'}).waitFor();assert.equal(await page.locator('.atlas-css-renderer').count(),0);
  assert.deepEqual(errors,[]);
  console.log('PASS: 3 layouts, detail actions, all 18 guides, 7 geometry diagrams, dimensions and answers, WebGL/fallback box, mobile, reduced motion, offline and teardown.');
}finally{await browser.close();await testApp.close();}
