import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {createTestApp} from './browser-fixture.mjs';
import {libraryPracticeExercises,libraryPracticeListedIds} from '../public/library-practice-bank.js';
const grade=Number(process.argv[2]||8);
assert.ok([8,9].includes(grade));
const app=await createTestApp({grade}),browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await app.login(page);await page.goto(app.base+'/#practice');
 const expected=libraryPracticeExercises.filter(e=>e.grades.includes(grade)&&libraryPracticeListedIds.includes(e.id));
 await page.locator('a[href="#learn/'+expected[0].id+'"]').waitFor();
 assert.equal(await page.locator('a[href^="#learn/practice-"]').count(),expected.length);
 const mcq=expected.find(e=>e.type==='mcq'),essay=expected.find(e=>e.type==='essay');
 await page.locator('a[href="#learn/'+mcq.id+'"]').click();
 await page.locator('input[name=choice][value="'+mcq.correctIndex+'"]').check();
 await page.locator('[data-practice-choice-form] button').click();
 await page.locator('.practice-photo-result').waitFor();
 await page.reload();await page.locator('.practice-photo-result').waitFor();
 const saved=await (await page.request.get(app.base+'/api/practice/photos?exerciseId='+mcq.id)).json();
 assert.equal(saved.submissions[0].correct,true);
 await page.goto(app.base+'/#learn/'+essay.id);await page.locator('[data-practice-photo-form]').waitFor();
 assert.equal(await page.locator('[data-practice-choice-form]').count(),0);
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({grade,sameGradeFormats:expected.length,submit:true,historyAfterReload:true,essayUpload:true,mobile:true,errors}));
}finally{await browser.close();await app.close();}
