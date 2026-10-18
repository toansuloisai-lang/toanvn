import {createTestApp} from './browser-fixture.mjs';
const testApp=await createTestApp();
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'msedge',headless:true});
const page=await browser.newPage({viewport:{width:1536,height:1024}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await mkdir('artifacts',{recursive:true});
try {
  await testApp.login(page);
  await page.goto(testApp.base+'');await page.locator('.reference-hero').waitFor();
  await page.evaluate(()=>document.fonts.ready);
  const bounds=await page.locator('.reference-hero').boundingBox();
  assert.equal(bounds.x,260);assert.equal(bounds.y,82);assert.equal(bounds.height,214);
  const right=await page.locator('.dashboard-right').boundingBox();
  assert.equal(right.width,360);
  await page.screenshot({path:'artifacts/reference-desktop.png',fullPage:true});
  for(const [width,height] of [[1366,900],[1024,768],[768,1024],[390,844],[360,800]]){
    await page.setViewportSize({width,height});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`horizontal overflow at ${width}`);
    if(width===390)await page.screenshot({path:'artifacts/reference-mobile.png',fullPage:true});
  }
  await page.setViewportSize({width:1536,height:1024});
  await page.locator('#search-input').fill('phân phối');await page.locator('#search-input').press('Enter');
  await page.getByRole('heading',{name:'Kết quả tìm kiếm'}).waitFor();
  assert.ok(await page.locator('.exercise-card').count()>0);
  for(const route of ['lessons','challenges','formulas','profile','settings','notifications','map']){
    await page.goto(`${testApp.base}/#${route}`);await page.locator('main h1').first().waitFor();
  }
  await page.goto(testApp.base+'/#profile');
  await page.locator('#profile-name').fill('Minh Anh');await page.locator('#profile-grade').selectOption('8');
  await page.getByRole('button',{name:'Lưu hồ sơ'}).click();
  await page.locator('.header-profile strong').filter({hasText:'Minh Anh'}).waitFor();
  assert.equal(await page.locator('.header-profile strong').textContent(),'Minh Anh');
  await page.goto(testApp.base+'/#home');
  await page.locator('.quick-card').first().click();await page.locator('[data-practice-photo-form]').waitFor();
  assert.deepEqual(errors,[]);
  console.log('PASS: reference layout bounds, 5 responsive widths, search, all added pages, profile persistence and dashboard navigation.');
} finally {await browser.close();await testApp.close();}
