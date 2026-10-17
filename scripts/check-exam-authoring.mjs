import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {createTestApp} from './browser-fixture.mjs';
const app=await createTestApp({grade:8});
const {accounts}=await import('../server.mjs');
const teacher=accounts.users().find(u=>u.role==='teacher'),student=accounts.users().find(u=>u.role==='student');
accounts.learning.createClass(teacher,{name:'8A4',grade:8,studentIds:[student.id]});
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const context=await browser.newContext(),page=await context.newPage();await app.login(page,'teacher');
 await page.goto(app.base+'/#exams');await page.locator('.assessment-class-card').first().click();await page.getByRole('link',{name:'Tạo đề trắc nghiệm',exact:true}).click();
 await page.locator('[name=title]').fill('Đề do giáo viên soạn');
 for(const [name,value] of Object.entries({prompt:'Tính \\(2+2\\).',topic:'Số học',knowledge:'Phép cộng',explanation:'Hai cộng hai bằng bốn.',choice0:'3',choice1:'4',choice2:'5',choice3:'6'}))await page.locator(`[name=${name}]`).fill(value);
 await page.locator('[name=correct]').selectOption('1');await page.getByRole('button',{name:'Xem trước đề',exact:true}).click();
 assert.ok(await page.locator('#exam-author-review .katex').count());await page.getByRole('button',{name:'Xác nhận tạo và giao đề'}).click();
 await page.locator('.assessment-detail-heading').waitFor();
 const exam=accounts.exams.list(teacher)[0];let v=accounts.exams.start(student,exam.id);accounts.exams.answer(student,exam.id,{questionIndex:0,choiceIndex:1,version:v.attempt.version});accounts.exams.submit(student,exam.id);
 await page.locator('[data-detail-tab=manage]').click();await page.locator('[name=withdrawn]').check();await page.getByRole('button',{name:'Lưu quản lý'}).click();await page.locator('[data-detail-tab=manage]').click();await page.locator('.assessment-state.is-withdrawn').waitFor();
 assert.equal(accounts.learning.report(teacher,student.id).assignments[0].result.score,10);
 await page.locator('[data-clone] [name=title]').fill('Đợt 2');await page.getByRole('button',{name:'Tạo đợt mới từ đề này'}).click();await page.getByRole('heading',{name:'Đợt 2',exact:true}).waitFor();
 const clone=accounts.exams.list(teacher).find(e=>e.title==='Đợt 2');assert.equal(accounts.exams.start(student,clone.id).attempt.submittedAt,null);
 assert.equal(accounts.exams.results(teacher,exam.id).students[0].attempt.score,10);
 console.log('Teacher UI authoring, math preview, publish, withdrawal preserves report, new round passed.');
}finally{await browser.close();await app.close();}
