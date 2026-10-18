import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {createTestApp} from './browser-fixture.mjs';
import {exercises} from '../public/data.js';
import {submitPhoto,mockPhotoAI} from './practice-fixture.mjs';
const restoreAI=mockPhotoAI();
const app=await createTestApp(),browser=await chromium.launch({channel:'msedge',headless:true}),page=await browser.newPage();
async function saved(predicate){for(let i=0;i<100;i++){const ws=await(await page.request.get(app.base+'/api/workspace')).json();if(predicate(ws.state))return ws.state;await new Promise(r=>setTimeout(r,50));}throw Error('State not saved');}
try{
 await app.login(page);const original=await submitPhoto(page,app.base,'sign-1');assert.equal(original.finalScore,null);
 await page.goto(app.base+'/#notebook');await page.locator('.knowledge-hub[data-loaded=true]').waitFor();await page.goto(app.base+'/#learn/sign-1');await page.locator('.practice-photo-result').waitFor();
 await page.reload();await page.locator('.practice-photo-result').waitFor();assert.equal(await page.locator('.practice-photo-result').count(),1);assert.equal(await page.locator('#answer,#correction,#main textarea').count(),0);
 const image=original.photos[0];assert.equal((await page.request.get(app.base+image)).status(),200);
 await app.login(page,'teacher');const ws=await(await page.request.get(app.base+'/api/workspace')).json();
 assert.equal((await page.request.post(app.base+'/api/practice/photos/'+original.id+'/review',{data:{score:7,comment:'Giáo viên đã xem và chốt.'}})).status(),200);
 await app.login(page);await page.reload();await page.getByText('Điểm chính thức: 7/10',{exact:false}).first().waitFor();
 const list=(await(await page.request.get(app.base+'/api/practice/photos?exerciseId=sign-1')).json()).submissions;assert.equal(list.length,1);assert.equal(list[0].id,original.id);assert.equal(list[0].photos[0],image);assert.equal(list[0].ai.score,original.ai.score);assert.equal(list[0].finalScore,7);
 console.log('PASS: saved photo work survives navigation and reload; original image and AI result preserved; teacher final score reaches student; no duplicate submission.');
}finally{restoreAI();await browser.close();await app.close();}
