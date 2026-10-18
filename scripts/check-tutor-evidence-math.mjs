import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {createTestApp} from './browser-fixture.mjs';
const app=await createTestApp(),browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto(app.base);await page.locator('#login-form').waitFor();
 await page.evaluate(async()=>{
  const {mountTutor}=await import('/tutor-view.js'),root=document.createElement('main');document.body.replaceChildren(root);
  const answers=[String.raw`\(x^{2} - 12x + 36\)`,String.raw`\(92\)`,String.raw`\(25\,\mathrm{cm}\)`,String.raw`\((x+4)(x-6)\)`,String.raw`\(42{,}5\%\)`,'<img src=x onerror="window.mathInjected=true">'];
  const thread={id:'fixture',messages:[{id:'message',role:'assistant',text:'Đối chiếu bài làm',evidence:answers.map((answer,i)=>({title:'Bài '+i,topic:'Công thức',prompt:String.raw`Tính \((x+6)^2\).`,originalAnswer:answer,href:'#practice'})),offers:[{questionId:'q',question:{topic:'Bình phương',prompt:String.raw`Khai triển \((x+6)^2\).`,source:{file:'fixture',question:1},unit:''},attempts:[{correct:false,answer:String.raw`\(x^2-12x+36\)`,working:'x^2-12*x+36',expected:String.raw`\(x^2+12x+36\)`,solution:String.raw`\((x+6)^2=x^2+12x+36\)`}]}]}]};
  await mountTutor(root,{id:'fixture',request:async url=>url.includes('threadId=')?thread:{threads:[{id:'fixture',title:'Đối chiếu'}]}});
 });
 const evidence=page.locator('.tutor-evidence');await evidence.locator('summary').first().click();
 const answers=evidence.locator(':scope > div > p').filter({hasText:'Đáp án đầu:'});assert.equal(await answers.count(),6);
 for(let i=0;i<5;i++)assert.equal(await answers.nth(i).locator('.katex').count(),1);
 assert.equal(await evidence.locator('.math-fallback').count(),0);assert.equal(await evidence.locator('img').count(),0);assert.equal(await page.evaluate(()=>window.mathInjected),undefined);
 assert.match(await answers.nth(5).textContent(),/<img/);
 await page.locator('.tutor-exercise > summary').click();await page.locator('.tutor-attempt > details > summary').click();
 assert.equal(await page.locator('.tutor-attempt > p .katex').count(),1);assert.equal(await page.locator('.tutor-attempt > details > p .katex').count(),1);
 assert.equal(await page.locator('.math-fallback').count(),0);assert.deepEqual(errors,[]);
 console.log('PASS: evidence answers, units, percentages, practice answers and expected answers render as math; HTML remains escaped.');
}finally{await browser.close();await app.close();}
