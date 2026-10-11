import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {createTestApp} from './browser-fixture.mjs';
import {exercises} from '../public/data.js';
const realFetch=globalThis.fetch;
globalThis.fetch=async(url,options)=>{
 if(String(url).startsWith('https://generativelanguage.googleapis.com/')){
  const body=JSON.parse(options.body),data=JSON.parse(body.contents[0].parts[0].text);
  const value=data.working?{type:'sign',evidence:'giữ dấu âm',reason:'Cần xét giá trị tuyệt đối trước khi quyết định dấu.',nextStep:'So sánh giá trị tuyệt đối rồi tính lại.',confidence:0.8}:{summary:'Có lỗi quy tắc dấu cần củng cố.',actions:['Luyện một bài cùng kỹ năng và kiểm chứng bằng bài mới.'],exerciseIds:(data.candidates||[]).slice(0,1).map(e=>e.id)};
  return {ok:true,json:async()=>({candidates:[{content:{parts:[{text:JSON.stringify(value)}]}}]})};
 }
 return realFetch(url,options);
};
const app=await createTestApp(),browser=await chromium.launch({channel:'msedge',headless:true}),page=await browser.newPage({viewport:{width:1400,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await app.login(page,'teacher');await page.goto(app.base+'/#learning');await page.locator('#learning-class-form').waitFor();
 await page.locator('#learning-class-form [name="name"]').fill('7A');await page.locator('#learning-class-form [name="grade"]').selectOption('7');await page.locator('#learning-class-form [name="studentIds"]').check();await page.locator('#learning-class-form button').click();await page.getByText('Đã tạo lớp.',{exact:true}).waitFor();
 await page.locator('#learning-assignment [name="title"]').fill('Kiểm tra quy tắc dấu');await page.locator('#learning-assignment [name="due"]').fill('2026-12-01');await page.locator('#learning-assignment [name="recipient"]').selectOption('class');
 for(const id of ['sign-1','sign-2'])await page.locator(`#learning-assignment input[value="${id}"]`).check();
 await page.locator('#learning-assignment button').click();await page.getByText('Đã giao bộ câu hỏi. Điểm sẽ cập nhật theo bài làm đầu của học sinh.',{exact:true}).waitFor();
 await app.login(page);await page.goto(app.base);await page.reload();await page.goto(app.base+'/#learn/sign-1');await page.locator('#answer').fill('999');await page.locator('#working').fill('Em cộng hai số rồi giữ dấu âm.');await page.locator('#answer-form button').click();await page.locator('#diagnose-attempt').click();await page.locator('#attempt-diagnosis').getByText('Quy tắc dấu · Chờ giáo viên xác nhận',{exact:true}).waitFor();
 if(await page.locator('[data-diagnosis="1"]').count()){await page.locator('[data-diagnosis="1"]').click();await page.locator('[data-next]').click();}await page.locator('#correction').fill(exercises.find(e=>e.id==='sign-1').answer);await page.locator('#correction-form button').click();await page.locator('#explanation').fill('Em cần xét dấu và so sánh giá trị tuyệt đối trước khi tính.');await page.locator('[data-skip-ai]').click();await page.getByText('Đã lưu hành trình của em.',{exact:false}).waitFor();
 await page.goto(app.base+'/#learn/sign-2');await page.locator('#answer').fill(exercises.find(e=>e.id==='sign-2').answer);await page.locator('#working').fill('Em đã kiểm tra dấu trước khi tính.');await page.locator('#answer-form button').click();
 await page.goto(app.base+'/#learning');await page.getByRole('heading',{name:'Trước – sau khi khắc phục'}).waitFor();await page.getByText('Kiểm tra quy tắc dấu · 5/10 · 2/2 câu · Đã làm đủ',{exact:true}).waitFor();await page.locator('#personal-insight').click();await page.locator('#personal-insight-result .feedback').waitFor();
 await page.screenshot({path:'artifacts/learning-personal.png',fullPage:true});
 const ws=await (await page.request.get(app.base+'/api/workspace')).json();const sid=ws.user.id;
 assert.equal((await page.request.get(app.base+'/api/learning/class-report')).status(),403);
 await app.login(page,'teacher');await page.goto(app.base+'/#learning');await page.reload();await page.locator('table [data-open-student]').first().click();await page.locator('details[data-attempt] summary').first().click();const form=page.locator('[data-review]').first();await form.locator('[name="type"]').selectOption('sign');await form.locator('button').click();await page.getByText('Đã lưu xác nhận của giáo viên.',{exact:true}).waitFor();
 await page.locator('[data-assign-remedy]').first().click();await page.getByText('Đã giao bài khắc phục, hạn 7 ngày.',{exact:true}).waitFor();await page.locator('#back-class').click();await page.locator('#class-insight').click();await page.locator('#class-insight-result .feedback').waitFor();
 const report=await (await page.request.get(app.base+'/api/learning/report?studentId='+sid)).json();assert.equal(report.errors.find(e=>e.type==='sign').confirmed,1);assert.equal(report.comparisons[0].after.correct,true);assert.equal(report.assignments.length,2);
 await page.screenshot({path:'artifacts/learning-class.png',fullPage:true});await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.deepEqual(errors,[]);
 console.log('PASS: class creation, exact assignment, student working, AI diagnosis, teacher confirmation, remediation, before/after, AI class analysis, scores, permissions and mobile.');
}finally{await browser.close();await app.close();globalThis.fetch=realFetch;}
