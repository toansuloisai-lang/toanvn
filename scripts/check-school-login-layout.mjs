import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {createTestApp} from './browser-fixture.mjs';
const app=await createTestApp(),browser=await chromium.launch({channel:'msedge',headless:true}),results=[];
try{
 for(const standalone of [false,true]){
  const context=await browser.newContext({serviceWorkers:'block'});
  if(standalone)await context.addInitScript(()=>{const original=matchMedia.bind(window);window.matchMedia=query=>{const result=original(query);if(query==='(display-mode: standalone)')Object.defineProperty(result,'matches',{value:true});return result;};});
  const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
  for(const viewport of [{width:2560,height:1440},{width:1920,height:1080},{width:1366,height:768},{width:1024,height:768},{width:390,height:844},{width:320,height:740}]){
   await page.setViewportSize(viewport);await page.goto(app.base,{waitUntil:'networkidle'});await page.locator('#login-form').waitFor();
   const geometry=await page.evaluate(()=>{
    const shell=document.querySelector('.shell'),main=document.querySelector('#main'),brand=document.querySelector('.school-login-brand'),title=brand.querySelector('strong');
    return {width:innerWidth,shellLeft:shell.getBoundingClientRect().left,shellRight:shell.getBoundingClientRect().right,mainWidth:main.getBoundingClientRect().width,shellHeight:shell.getBoundingClientRect().height,mainHeight:main.getBoundingClientRect().height,background:getComputedStyle(shell).backgroundImage,size:getComputedStyle(shell).backgroundSize,brandRight:brand.getBoundingClientRect().right,title:title.textContent,titleHeight:title.getBoundingClientRect().height,lineHeight:parseFloat(getComputedStyle(title).lineHeight),titleOverflow:title.scrollWidth>title.clientWidth+1,overflow:document.documentElement.scrollWidth>innerWidth+1};
   });
   assert.ok(Math.abs(geometry.shellLeft)<1,'Login shell starts at left edge');assert.ok(Math.abs(geometry.shellRight-viewport.width)<1,'Login shell reaches right edge');
   assert.ok(Math.abs(geometry.mainWidth-viewport.width)<1,'Standalone main has no 1400px cap');
   assert.match(geometry.background,/school-campus/);assert.match(geometry.size,/cover/);assert.ok(geometry.shellHeight>=geometry.mainHeight-1);
   assert.equal(geometry.title,'TRƯỜNG THCS LẠC ĐẠO');assert.ok(geometry.titleHeight<=geometry.lineHeight+1);assert.equal(geometry.titleOverflow,false);assert.ok(geometry.brandRight<=viewport.width);assert.equal(geometry.overflow,false);
   if(viewport.width===1920||viewport.width===390)await page.screenshot({path:`artifacts/school-login-${standalone?'app':'web'}-${viewport.width}.png`,fullPage:true});
   results.push({standalone,width:viewport.width,login:'pass'});
  }
  await app.login(page);
  for(const viewport of [{width:1920,height:1080},{width:1024,height:768},{width:390,height:844},{width:320,height:740}]){
   await page.setViewportSize(viewport);await page.goto(app.base,{waitUntil:'networkidle'});await page.locator('.reference-hero').waitFor();
   for(const brand of await page.locator('.school-brand:visible').all()){
    const title=brand.locator('strong');if(!await title.isVisible())continue;
    const fits=await title.evaluate(el=>({height:el.getBoundingClientRect().height,line:parseFloat(getComputedStyle(el).lineHeight),overflow:el.scrollWidth>el.clientWidth+1,right:el.getBoundingClientRect().right}));
    assert.ok(fits.height<=fits.line+1,'School name remains one line after login');assert.equal(fits.overflow,false);assert.ok(fits.right<=viewport.width+1);
   }
   if(standalone&&viewport.width===390){await page.locator('#app-menu-open').click();await page.screenshot({path:'artifacts/school-app-menu-390.png'});await page.keyboard.press('Escape');}
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);
   if(overflow)console.log(JSON.stringify({standalone,viewport,overflowElements:await page.evaluate(()=>[...document.querySelectorAll('body *')].filter(el=>el.getBoundingClientRect().right>innerWidth+1&&getComputedStyle(el).display!=='none').slice(0,12).map(el=>({tag:el.tagName,id:el.id,class:el.className,right:el.getBoundingClientRect().right})))}));
   assert.equal(overflow,false,`Authenticated overflow: ${standalone?'app':'web'} ${viewport.width}px`);
  }
  assert.deepEqual(errors,[]);await context.close();
 }
 console.log('PASS: 12 web/standalone login viewports, edge-to-edge cover photo, single-line school name, 8 authenticated layouts, app drawer, no overflow or JavaScript errors.');
}finally{await browser.close();await app.close();}
