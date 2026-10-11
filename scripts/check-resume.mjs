import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {createTestApp} from './browser-fixture.mjs';
import {exercises} from '../public/data.js';
const app=await createTestApp(),browser=await chromium.launch({channel:'msedge',headless:true}),page=await browser.newPage();
async function saved(predicate){for(let i=0;i<100;i++){const ws=await(await page.request.get(app.base+'/api/workspace')).json();if(predicate(ws.state))return ws.state;await new Promise(r=>setTimeout(r,50));}throw Error('State not saved');}
try{
 await app.login(page);await page.goto(app.base+'/#learn/sign-1');
 await page.locator('#answer').fill('999');await page.locator('#working').fill('Em cộng các số và được 999.');await page.locator('#answer-form button').click();
 await page.locator('#correction').waitFor();assert.equal(await page.locator('#answer').count(),0);assert.equal(await page.locator('[data-diagnosis]').count(),0);
 await page.locator('#revised-working').fill('Em kiểm tra lại dấu của từng số.');await page.locator('#correction').fill('998');
 const initial=await saved(s=>s.attempts[0]?.correction==='998'&&s.attempts[0]?.revisedWorking==='Em kiểm tra lại dấu của từng số.');
 await page.goto(app.base+'/#notebook');await page.goto(app.base+'/#learn/sign-1');assert.equal(await page.locator('#correction').inputValue(),'998');
 await page.reload();assert.equal(await page.locator('#correction').inputValue(),'998');assert.equal(await page.locator('#revised-working').inputValue(),'Em kiểm tra lại dấu của từng số.');
 // Typing the correct prefix of an unfinished answer is still only a draft.
 await page.locator('#correction').fill('4');await saved(s=>s.attempts[0]?.correction==='4'&&!s.attempts[0]?.corrected);
 await page.locator('#correction').fill('40');await saved(s=>s.attempts[0]?.correction==='40'&&!s.attempts[0]?.corrected);
 await page.reload();assert.equal(await page.locator('#correction').inputValue(),'40');assert.equal(await page.locator('#explanation').count(),0);
 await page.locator('#correction-form button').click();await page.locator('#correction').waitFor();
 await page.locator('#correction').fill(exercises.find(e=>e.id==='sign-1').answer);await page.locator('#correction-form button').click();
 await page.locator('#explanation').fill('Em đã kiểm tra dấu và sửa lại phép tính.');await saved(s=>s.attempts[0]?.explanation==='Em đã kiểm tra dấu và sửa lại phép tính.');
 await page.reload();assert.equal(await page.locator('#explanation').inputValue(),'Em đã kiểm tra dấu và sửa lại phép tính.');
 await page.locator('[data-skip-ai]').click();const result=await saved(s=>s.attempts[0]?.completed);
 assert.equal(result.attempts.length,1);assert.equal(result.attempts[0].id,initial.attempts[0].id);assert.equal(result.attempts[0].answer,'999');assert.equal(result.attempts[0].initialCorrect,false);assert.equal(result.attempts[0].working,'Em cộng các số và được 999.');
 await app.login(page,'teacher');const ws=await(await page.request.get(app.base+'/api/workspace')).json();assert.equal(ws.state.attempts[0].revisedWorking,'Em kiểm tra lại dấu của từng số.');
 console.log('PASS: wrong answer continues directly; drafts survive navigation/reload; original evidence and score preserved; one attempt; teacher receives revised work.');
}finally{await browser.close();await app.close();}
