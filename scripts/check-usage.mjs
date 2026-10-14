import {chromium,expect} from '@playwright/test';
import assert from 'node:assert/strict';
import {createTestApp} from './browser-fixture.mjs';
const app=await createTestApp(),browser=await chromium.launch({channel:'msedge',headless:true}),page=await browser.newPage();
const beats=[];
try{
  // Test browser scheduling without inventing server-side elapsed time.
  // Server durations and duplicate tabs are covered by test/usage.test.mjs.
  await page.route('**/api/student/heartbeat',async route=>{beats.push(route.request().postDataJSON());await route.fulfill({json:{ok:true}});});
  await page.clock.install();await app.login(page);await page.goto(app.base);await page.locator('#main').waitFor();
  await page.waitForFunction(()=>!document.body.classList.contains('auth-screen'));
  await page.bringToFront();await page.waitForFunction(()=>document.hasFocus());
  await page.clock.runFor(16000);await expect.poll(()=>beats.some(b=>b.active===true)).toBe(true);
  const count=beats.length;await page.clock.runFor(130000);await expect.poll(()=>beats.length>count&&beats.at(-1).active===false).toBe(true);
  await page.locator('#search-input').click();await page.clock.runFor(16000);await expect.poll(()=>beats.at(-1).active).toBe(true);
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
  await page.clock.runFor(16000);await expect.poll(()=>beats.at(-1).active).toBe(false);
  for(let i=1;i<beats.length;i++)assert.ok(beats[i].sequence>beats[i-1].sequence);
  await page.unroute('**/api/student/heartbeat');
  await app.login(page,'teacher');
  assert.equal((await page.request.post(app.base+'/api/student/heartbeat',{data:{tabId:crypto.randomUUID(),sequence:1,active:true}})).status(),403);
  console.log('PASS: browser heartbeats on active student, idle pause, interaction resume, hidden pause, monotonic sequence and teacher rejection.');
}finally{await browser.close();await app.close();}
