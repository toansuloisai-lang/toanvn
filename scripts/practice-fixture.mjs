import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import sharp from 'sharp';
import {exercises} from '../public/data.js';
export async function seedPractice(page,base,{exerciseId='sign-1',answer='999',completed=false,explanation='Bài làm đã lưu từ phiên bản trước.',working='Em đã trình bày cách làm.'}={}){
 const ws=await(await page.request.get(base+'/api/workspace')).json(),ex=exercises.find(e=>e.id===exerciseId),time=Date.now();
 const row={id:randomUUID(),exerciseId,skill:ex.skill,answer,working,time,mode:'practice',initialCorrect:answer===ex.answer,...(completed?{corrected:true,correction:ex.answer,completed:time,explanation}: {})};
 const response=await page.request.put(base+'/api/student/state',{data:{attempts:[...ws.state.attempts,row],reviews:ws.state.reviews}});assert.equal(response.status(),200);return row;
}
export function mockPhotoAI({summary='Nhận xét thử nghiệm.',transcription='Bài làm được giả lập cho kiểm thử.'}={}){const original=globalThis.fetch;globalThis.fetch=async(url,options)=>{
 if(!String(url).includes('generativelanguage.googleapis.com'))return original(url,options);
 return {ok:true,json:async()=>({candidates:[{content:{parts:[{text:JSON.stringify({readable:true,confidence:.95,transcription,summary,criteria:[{id:'reasoning',earned:8,evidence:transcription,reason:'Nhận xét kiểm thử.',missingKnowledge:'Ôn lại quy tắc.',nextStep:'Đối chiếu các bước.'}]})}]}}]})};
 };return ()=>globalThis.fetch=original;}
export async function submitPhoto(page,base,exerciseId){
 await page.goto(base+'/#learn/'+exerciseId);const form=page.locator('[data-practice-photo-form]');await form.waitFor();
 assert.equal(await page.locator('#answer-form,#main textarea').count(),0);
 const buffer=await sharp({create:{width:100,height:150,channels:3,background:'white'}}).png().toBuffer();
 await form.locator('input[type=file]').setInputFiles({name:'bai-lam.png',mimeType:'image/png',buffer});await form.locator('.tutor-photo-preview img').waitFor();
 await form.getByRole('button',{name:'Chấm bài',exact:true}).click();await page.locator('.practice-photo-result').first().waitFor();
 await form.locator('[role=status]').getByText('Đã chấm bài.',{exact:false}).waitFor();
 return (await(await page.request.get(base+'/api/practice/photos?exerciseId='+exerciseId)).json()).submissions[0];
}
