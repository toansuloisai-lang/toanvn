import {chromium} from '@playwright/test';
import {writeFile,mkdir} from 'node:fs/promises';
import {createTestApp} from './browser-fixture.mjs';
const app=await createTestApp(),browser=await chromium.launch({channel:'msedge',headless:true});
const results=[];
try{
 for(const role of ['anonymous','student','teacher']){
  const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
  const page=await context.newPage(),cdp=await context.newCDPSession(page),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:40,downloadThroughput:1000000,uploadThroughput:250000});
  await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
  if(role!=='anonymous')await app.login(page,role);
  for(const visit of ['cold','warm']){
   await page.goto(app.base,{waitUntil:'domcontentloaded'});
   await page.locator(role==='anonymous'?'#login-form':role==='student'?'.reference-hero':'#teacher-dashboard .td-panel').first().waitFor();
   const readyMs=await page.evaluate(()=>Math.round(performance.now()));
   await page.waitForLoadState('networkidle');
   results.push({role,visit,readyMs,...await page.evaluate(()=>{
    const nav=performance.getEntriesByType('navigation')[0],resources=performance.getEntriesByType('resource');
    return {domMs:Math.round(nav.domContentLoadedEventEnd),loadMs:Math.round(nav.loadEventEnd),requests:resources.length,transferBytes:resources.reduce((a,r)=>a+r.transferSize,nav.transferSize),largest:resources.sort((a,b)=>b.transferSize-a.transferSize).slice(0,6).map(r=>({path:new URL(r.name).pathname,bytes:r.transferSize})),api:resources.filter(r=>r.name.includes('/api/')).map(r=>({path:new URL(r.name).pathname,ms:Math.round(r.duration),bytes:r.transferSize}))};
   }),errors:[...errors]});
  }
  await context.close();
 }
 await mkdir('artifacts',{recursive:true});
 const file=`artifacts/performance-${process.argv[2]||'latest'}.json`;
 await writeFile(file,JSON.stringify({conditions:'Edge mobile viewport, 8 Mbps download, 40 ms latency, CPU 4x, service worker blocked, isolated fixture database',results},null,2));
 console.log(JSON.stringify(results.map(({role,visit,domMs,loadMs,requests,transferBytes,errors})=>({role,visit,domMs,loadMs,requests,transferBytes,errors})),null,2));
}finally{await browser.close();await app.close();}
