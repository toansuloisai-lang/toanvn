import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {createTestApp} from './browser-fixture.mjs';
import {exercises} from '../public/data.js';
const app=await createTestApp(),{accounts}=await import('../server.mjs'),browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const student=accounts.users().find(u=>u.role==='student'),teacher=accounts.users().find(u=>u.role==='teacher'),password='Isolated-test-password-123!';
 const parent=accounts.createUser({username:'parent',name:'Parent',role:'parent',password,studentIds:[student.id]});accounts.createUser({username:'admin',name:'Admin',role:'admin',password});
 const attempt={id:crypto.randomUUID(),exerciseId:'sign-1',skill:'sign',answer:exercises.find(e=>e.id==='sign-1').answer,initialCorrect:true,time:Date.now(),mode:'practice',working:'Em tính theo quy tắc dấu.',explanation:'Em đối chiếu dấu và độ lớn trước khi kết luận.'};
 accounts.saveStudent(student,{attempts:[attempt],reviews:{}});
 const page=await browser.newPage({viewport:{width:1400,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await app.login(page);await page.goto(app.base+'/#explore/garden');
 await page.locator('[data-save-garden]').click();await page.locator('[data-activity-save]').getByText(/Đã lưu/).waitFor();
 await page.goto(app.base+'/#formulas');await page.locator('[data-layout="list"]').click();await page.locator('[data-open-formula="formula-1"]:visible').click();
 await page.locator('#formula-check-input').fill('999');await page.locator('.formula-check button').click();await page.locator('[data-formula-save]').getByText(/Đã lưu/).waitFor();
 const report=await (await page.request.get(app.base+'/api/learning/report')).json();assert.equal(report.activities.length,2);assert.equal(report.activities[0].correct,false);
 await app.login(page,'teacher');await page.reload();await page.goto(app.base+'/#learning/'+student.id);
 await page.locator('[data-report-tab="notes"]').click();const note=page.locator(`[data-learning-note="${attempt.id}"]`);await note.locator('textarea').fill('Giải thích rõ bước kiểm chứng thêm nhé.');await note.locator('button').click();await page.locator('#learning-status').getByText('Đã lưu nhận xét cho học sinh.').waitFor();
 const activity=page.locator(`[data-activity-note="${report.activities[0].id}"]`);await activity.locator('..').locator('summary').click();await activity.locator('textarea').fill('Em xem lại cách phân phối.');await activity.locator('button').click();await page.locator('#learning-status').getByText('Đã lưu nhận xét hoạt động.').waitFor();
 await page.screenshot({path:'artifacts/audit-teacher-feedback.png',fullPage:true});
 await app.login(page,'parent');await page.reload();await page.goto(app.base+'/#learning/'+student.id);await page.getByText('Giải thích rõ bước kiểm chứng thêm nhé.',{exact:false}).waitFor();assert.equal(await page.locator('[data-learning-note]').count(),0);
 assert.match(JSON.stringify(await (await page.request.get(app.base+'/api/learning/report?studentId='+student.id)).json()),/Em xem lại cách phân phối/);
 await app.login(page,'admin');await page.reload();await page.goto(app.base+'/#admin');const contact=page.locator('#admin-parent-email');await contact.locator('[name=userId]').selectOption(parent.id);await contact.locator('[name=email]').fill('family@example.com');await contact.locator('button').click();await contact.getByText('Đã lưu email nhận thông báo.').waitFor();
 const reset=page.locator('#admin-reset-password');await reset.locator('[name=userId]').selectOption(student.id);await reset.locator('[name=password]').fill('Changed-audit-password-123!');await reset.locator('button').click();await reset.getByText('Đã đặt mật khẩu mới và kết thúc các phiên cũ.').waitFor();
 await app.login(page,'teacher');const preview=await page.request.post(app.base+'/api/parent-mail/preview',{data:{studentId:student.id,subject:'Thông báo',message:'Nhắc con ôn tập.'}});assert.equal(preview.status(),200);assert.equal((await preview.json()).recipients[0].email,'family@example.com');
 const login=await page.request.post(app.base+'/api/auth/login',{data:{username:'student',password:'Changed-audit-password-123!'}});assert.equal(login.status(),200);
 assert.deepEqual(errors,[]);console.log('PASS: exploration/formula -> teacher review -> parent read-only, correct-first explanation notes, admin email -> Gmail preview, password recovery. No real email sent.');
}finally{await browser.close();await app.close();}
