import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {createTestApp} from './browser-fixture.mjs';
import {mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
const app=await createTestApp(),browser=await chromium.launch({channel:'msedge',headless:true});
const profile=await mkdtemp(path.join(os.tmpdir(),'math-pwa-profile-'));
const context=await chromium.launchPersistentContext(profile,{channel:'msedge',headless:true}),page=await context.newPage(),errors=[];
page.on('pageerror',error=>errors.push(error.message));
async function prompt(outcome){await page.evaluate(outcome=>{const event=new Event('beforeinstallprompt',{cancelable:true});event.prompt=async()=>{window.promptCalls=(window.promptCalls||0)+1;};event.userChoice=Promise.resolve({outcome});window.dispatchEvent(event);},outcome);}
try{
 await page.goto(app.base);await page.locator('#login-form').waitFor();
 await page.evaluate(()=>navigator.serviceWorker.ready);await page.reload();await page.locator('#login-form').waitFor();
 const manifest=await (await page.request.get(app.base+'/manifest.webmanifest')).json();
 assert.equal(manifest.display,'standalone');assert.equal(manifest.id,'/');assert.equal(manifest.start_url,'/');
 assert.ok(manifest.icons.some(icon=>icon.purpose==='maskable'));
 for(const icon of [...manifest.icons,{src:'/apple-touch-icon.png',sizes:'180x180'}]){
  const size=await page.evaluate(async src=>{const image=new Image();image.src=src;await image.decode();return `${image.naturalWidth}x${image.naturalHeight}`;},icon.src);
  assert.equal(size,icon.sizes);
 }
 const cdp=await context.newCDPSession(page);await cdp.send('Page.enable');
 const installability=await cdp.send('Page.getInstallabilityErrors');assert.deepEqual(installability.installabilityErrors,[]);
 await page.locator('#pwa-install-open').click();await page.locator('#pwa-install-dialog').waitFor();
 await page.locator('[data-pwa-platform="desktop"]').click();await page.getByText(/Microsoft Edge/).waitFor();
 await page.screenshot({path:'artifacts/pwa-install-desktop.png'});
 await page.keyboard.press('Escape');assert.equal(await page.locator('#pwa-install-dialog').isVisible(),false);
 await prompt('dismissed');await page.locator('#pwa-install-open').click();await page.locator('#pwa-install-native').click();
 await page.locator('#pwa-install-status').getByText(/vẫn có thể dùng web/).waitFor();assert.equal(await page.evaluate(()=>window.promptCalls),1);
 assert.equal(await page.locator('#pwa-install-native').isVisible(),false);
 await prompt('accepted');await page.locator('#pwa-install-native').click();await page.locator('#pwa-install-status').getByText(/Đã chấp nhận/).waitFor();
 await page.evaluate(()=>window.dispatchEvent(new Event('appinstalled')));assert.equal(await page.locator('#pwa-install-open').isVisible(),false);
 await page.locator('#pwa-close').click();
 await app.login(page,'teacher');await page.goto(app.base+'/#teacher-library/create');await page.reload();
 await page.locator('#content-title').fill('Giữ nguyên bản nháp khi cập nhật app');
 await page.route('**/api/version',route=>route.fulfill({json:{version:'pwa-update-test'}}));
 await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await page.locator('#app-update-banner button').click();
 await page.locator('#app-update-banner').getByText(/Bạn đang soạn/).waitFor();assert.equal(await page.locator('#content-title').inputValue(),'Giữ nguyên bản nháp khi cập nhật app');
 await page.unroute('**/api/version');
 await context.setOffline(true);await page.locator('#pwa-network').waitFor();
 await page.reload();await page.locator('#login-form').waitFor();assert.equal(await page.locator('#content-editor').count(),0);
 await page.locator('#pwa-install-open').click();await page.locator('#pwa-install-dialog').waitFor();
 const cached=await page.evaluate(async()=>{const keys=await caches.keys();return (await Promise.all(keys.map(async key=>(await(await caches.open(key)).keys()).map(request=>new URL(request.url).pathname)))).flat();});
 assert.ok(cached.includes('/pwa.js'));assert.ok(cached.includes('/icon-maskable-512.png'));assert.ok(!cached.some(path=>path.startsWith('/api/')));
 await context.setOffline(false);await page.locator('#pwa-close').click();await page.waitForFunction(()=>document.querySelector('#pwa-network').hidden);
 const phone=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1'});
 const mobile=await phone.newPage();mobile.on('pageerror',error=>errors.push(error.message));
 await mobile.goto(app.base);await mobile.locator('#pwa-install-open').click();await mobile.getByText(/Chạm nút Chia sẻ/).waitFor();
 assert.equal(await mobile.locator('[data-pwa-platform="ios"]').getAttribute('aria-pressed'),'true');
 assert.ok(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 await mobile.screenshot({path:'artifacts/pwa-install-iphone.png'});await mobile.locator('#pwa-close').click();
 await mobile.addInitScript(()=>{const original=window.matchMedia.bind(window);window.matchMedia=query=>{const result=original(query);if(query==='(display-mode: standalone)')Object.defineProperty(result,'matches',{value:true});return result;};});
 await app.login(mobile,'teacher');await mobile.goto(app.base+'/#settings');await mobile.reload();await mobile.locator('.pwa-settings').waitFor();
 assert.equal(await mobile.locator('#pwa-install-open').isVisible(),false);assert.equal(await mobile.locator('.pwa-installed-label').isVisible(),true);
 assert.ok(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 await phone.close();assert.deepEqual(errors,[]);
 console.log('PASS: Chromium installability, manifest/icons, install accepted/dismissed, iPhone guide, standalone state, offline shell without cached account data, reconnect and draft-safe updates. Native OS installation still needs a real device check.');
}finally{await context.close();await browser.close();await app.close();assert.equal(path.dirname(profile),path.resolve(os.tmpdir()));await rm(profile,{recursive:true,force:true});}
