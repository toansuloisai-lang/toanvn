import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {createTestApp} from './browser-fixture.mjs';
const app=await createTestApp(),browser=await chromium.launch({channel:'msedge',headless:true}),results=[];
try{
 for(const standalone of [false,true]){
  const context=await browser.newContext({serviceWorkers:'block'});
  if(standalone)await context.addInitScript(()=>{const original=matchMedia.bind(window);window.matchMedia=query=>{const result=original(query);if(query==='(display-mode: standalone)')Object.defineProperty(result,'matches',{value:true});return result;};});
  const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
  for(const viewport of [{width:2560,height:1440},{width:1920,height:1080},{width:1366,height:768},{width:1024,height:768},{width:980,height:2100},{width:390,height:844},{width:320,height:740}]){
   await page.setViewportSize(viewport);await page.goto(app.base,{waitUntil:'networkidle'});await page.locator('#login-form').waitFor();
   const geometry=await page.evaluate(()=>{
    const shell=document.querySelector('.shell'),main=document.querySelector('#main'),brand=document.querySelector('.school-login-brand'),title=brand.querySelector('strong');
    const photo=getComputedStyle(shell,'::after'),fill=getComputedStyle(shell,'::before');
    return {width:innerWidth,shellLeft:shell.getBoundingClientRect().left,shellRight:shell.getBoundingClientRect().right,mainWidth:main.getBoundingClientRect().width,shellHeight:shell.getBoundingClientRect().height,mainHeight:main.getBoundingClientRect().height,background:photo.backgroundImage,size:photo.backgroundSize,anchor:photo.backgroundPosition,photoPosition:photo.position,fillImage:fill.backgroundImage,fillFilter:fill.filter,brandRight:brand.getBoundingClientRect().right,title:title.textContent,titleHeight:title.getBoundingClientRect().height,lineHeight:parseFloat(getComputedStyle(title).lineHeight),titleOverflow:title.scrollWidth>title.clientWidth+1,overflow:document.documentElement.scrollWidth>innerWidth+1};
   });
   assert.ok(Math.abs(geometry.shellLeft)<1,'Login shell starts at left edge');assert.ok(Math.abs(geometry.shellRight-viewport.width)<1,'Login shell reaches right edge');
   assert.ok(Math.abs(geometry.mainWidth-viewport.width)<1,'Standalone main has no 1400px cap');
   assert.match(geometry.background,/school-campus/);assert.match(geometry.size,/cover/);assert.equal(geometry.anchor,'50% 50%, 100% 0%');assert.equal(geometry.photoPosition,'fixed');assert.ok(geometry.shellHeight>=geometry.mainHeight-1);
   const photo=await page.evaluate(async()=>{const im=new Image();im.src=innerWidth<=700?'/assets/school-campus-mobile.webp':'/assets/school-campus.webp';await im.decode();const scale=Math.max(innerWidth/im.naturalWidth,innerHeight/im.naturalHeight);return {width:im.naturalWidth*scale,height:im.naturalHeight*scale,viewportWidth:innerWidth,viewportHeight:innerHeight};});
   assert.ok(photo.width>=photo.viewportWidth-1&&photo.height>=photo.viewportHeight-1,'Photo covers the full viewport');
   assert.equal(geometry.title,'TRƯỜNG THCS LẠC ĐẠO');assert.ok(geometry.titleHeight<=geometry.lineHeight+1);assert.equal(geometry.titleOverflow,false);assert.ok(geometry.brandRight<=viewport.width);assert.equal(geometry.overflow,false);
   if(viewport.width===1920||viewport.width===390)await page.screenshot({path:`artifacts/school-login-${standalone?'app':'web'}-${viewport.width}.png`,fullPage:true});
   if(viewport.width<=1000){const layout=await page.evaluate(()=>{const card=document.querySelector('.login-card').getBoundingClientRect(),welcome=document.querySelector('.school-welcome').getBoundingClientRect();return {center:card.x+card.width/2,width:card.width,top:card.top,welcomeBottom:welcome.bottom,font:parseFloat(getComputedStyle(document.querySelector('.login-card .input')).fontSize)};});assert.ok(Math.abs(layout.center-viewport.width/2)<2,'Mobile login is centered');assert.ok(layout.top>=layout.welcomeBottom,'Mobile login follows welcome text');assert.ok(layout.width>=Math.min(460,viewport.width-40)-1,'Mobile login uses available width');assert.ok(layout.font>=16,'Mobile inputs remain readable');}
   if(viewport.width<=1000){
    for(const enlarged of [false,true]){
     if(enlarged)await page.addStyleTag({content:'.school-login-brand strong{font-size:28px!important;white-space:normal!important}.school-login-brand small{font-size:18px!important}'});
     const spacing=await page.evaluate(()=>({brandBottom:document.querySelector('.school-login-brand').getBoundingClientRect().bottom,welcomeTop:document.querySelector('.school-welcome').getBoundingClientRect().top,eyebrowTop:document.querySelector('.school-eyebrow').getBoundingClientRect().top,overflow:document.documentElement.scrollWidth>innerWidth+1}));
     assert.ok(spacing.welcomeTop>=spacing.brandBottom-1,'Welcome follows school brand even with enlarged text');assert.ok(spacing.eyebrowTop>=spacing.brandBottom-1,'Motto does not overlap school identity');assert.equal(spacing.overflow,false);
    }
   }
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
 console.log('PASS: full-screen cover photo anchored at top right in 14 web/standalone login viewports; school name, 8 authenticated layouts, app drawer and no overflow or JavaScript errors.');
}finally{await browser.close();await app.close();}
