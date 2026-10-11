import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {createTestApp} from './browser-fixture.mjs';
const app=await createTestApp(),browser=await chromium.launch({channel:'msedge',headless:true}),context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
await context.addInitScript(()=>{const original=matchMedia.bind(window);window.matchMedia=query=>{const result=original(query);if(query==='(display-mode: standalone)')Object.defineProperty(result,'matches',{value:true});return result;};});
const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
const fits=async()=>assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Horizontal overflow');
try{
 await app.login(page);await page.goto(app.base);await page.locator('.reference-hero').waitFor();await fits();
 assert.equal(await page.locator('.sidebar').evaluate(el=>el.inert),true);
 assert.ok(await page.locator('.quick-card p').first().evaluate(el=>parseFloat(getComputedStyle(el).fontSize)>=16));
 await page.screenshot({path:'artifacts/app-home-mobile.png',fullPage:true});
 await page.locator('#app-menu-open').click();assert.equal(await page.locator('#app-menu-open').getAttribute('aria-expanded'),'true');
 for(const route of ['home','lessons','practice','notebook','formulas','settings'])await page.locator(`#navigation a[href="#${route}"]`).waitFor({state:"visible"});
 await page.screenshot({path:'artifacts/app-left-menu.png'});await page.keyboard.press('Escape');assert.equal(await page.locator('#app-menu-open').getAttribute('aria-expanded'),'false');
 await page.locator('#app-menu-open').click();await page.locator('#navigation a[href="#practice"]').click();await page.locator('.exercise-card').first().waitFor();
 assert.equal(await page.locator('.sidebar').evaluate(el=>el.inert),true);await fits();
 await page.goto(app.base+'/#learn/sign-1');await page.locator('#answer').fill('999');await page.locator('#answer-form button').click();await page.locator('#correction').waitFor();
 assert.ok(await page.locator('#correction').evaluate(el=>parseFloat(getComputedStyle(el).fontSize)>=17));await fits();await page.evaluate(()=>{document.activeElement?.blur();scrollTo(0,0);});await page.screenshot({path:'artifacts/app-learning-mobile.png',fullPage:true});
 await page.locator('#app-menu-open').click();await page.waitForFunction(()=>document.activeElement?.id==='app-menu-close');await page.keyboard.press('Shift+Tab');assert.equal(await page.locator('#navigation a').last().evaluate(el=>el===document.activeElement),true);await page.keyboard.press('Escape');
 await page.setViewportSize({width:1200,height:900});await fits();assert.equal(await page.locator('.sidebar').isVisible(),true);assert.equal(await page.locator('.sidebar').evaluate(el=>el.inert),false);assert.equal(await page.locator('#app-menu-open').isVisible(),false);
 await page.evaluate(()=>{document.activeElement?.blur();scrollTo(0,0);});await page.screenshot({path:'artifacts/app-learning-tablet.png',fullPage:true});
 await page.setViewportSize({width:360,height:800});await app.login(page,'teacher');await page.goto(app.base+'/#home');await page.reload();await page.locator('#td-class').waitFor();await fits();await page.locator('#app-menu-open').click();await page.locator('#navigation a[href="#teacher-library"]').click();await page.locator('.teacher-workspace').waitFor();await fits();
 await page.goto(app.base+'/#settings');await page.locator('[data-logout]').click();await page.locator('#login-form').waitFor();assert.equal(await page.locator('#app-topbar').isVisible(),false);assert.equal(await page.locator('.shell').evaluate(el=>el.inert),false);
 assert.deepEqual(errors,[]);console.log('PASS: app left drawer, all menu functions, keyboard/focus, readable controls, student correction, teacher navigation, tablet sidebar, logout and no mobile overflow.');
}finally{await browser.close();await app.close();}
