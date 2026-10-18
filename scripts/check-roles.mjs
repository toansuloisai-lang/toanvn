import {seedPractice} from './practice-fixture.mjs';
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
const dir=await mkdtemp(path.join(os.tmpdir(),'math-role-browser-'));
process.env.MATH_DB_PATH=path.join(dir,'accounts.json');
process.env.MATH_STORAGE='json';
// Use deterministic rule feedback rather than an external paid API in this test.
process.env.GEMINI_API_KEY='';
const {server,accounts}=await import('../server.mjs');
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base=`http://127.0.0.1:${server.address().port}`,password='Browser-test-password-123!';
const add=(username,role,studentIds=[])=>accounts.createUser({username,role,name:username,password,studentIds});
const student=add('student','student');add('student2','student');add('teacher','teacher',[student.id]);add('parent','parent',[student.id]);add('admin','admin');
const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'msedge',headless:true});
const context=await browser.newContext({viewport:{width:1536,height:1024}}),page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));
const login=async username=>{await page.locator('#login-username').fill(username);await page.locator('#login-password').fill(password);await page.locator('#login-form button[type=submit]').click();await page.waitForFunction(()=>!document.body.classList.contains('auth-screen'));};
const logout=async()=>{await page.locator('#logout').click();await page.locator('#login-form').waitFor();};
try{
  await mkdir('artifacts',{recursive:true});
  await page.goto(base+'/#teacher');await page.locator('#login-form').waitFor();
  await page.screenshot({path:'artifacts/login-desktop.png',fullPage:true});
  await login('student');
  assert.equal(await page.locator('#role,[data-role]').count(),1); // Only body data-role, no selector.
  assert.equal(await page.locator('#navigation a[href="#teacher"],#navigation a[href="#parent"]').count(),0);
  await page.evaluate(()=>localStorage.setItem('math-lab-state-v1',JSON.stringify({role:'admin',attempts:[],reviews:{},notes:{},assignments:[]})));
  for(const route of ['teacher','parent','admin']){await page.goto(base+'/#'+route);await page.waitForURL('**/#home');assert.equal(await page.locator('#assignment-form,#create-user-form').count(),0);}
  await page.reload();await page.locator('.reference-hero').waitFor();assert.equal(await page.locator('body').getAttribute('data-role'),'student');
  await seedPractice(page,base,{exerciseId:'distribute-1',answer:'3x+2',completed:true,explanation:'Nhân 3 với từng số hạng trong ngoặc, rồi thế x bằng 1 để kiểm chứng.'});
  await logout();await login('teacher');await page.goto(base+'/#teacher');await page.locator('#assignment-form').waitFor();
  await page.locator('#assignment-title').fill('Ôn lại phép phân phối');await page.locator('#assignment-skill').selectOption('distribute');await page.locator('#assignment-due').fill('2026-12-01');await page.locator('#assignment-form button').click();
  await page.getByRole('heading',{name:'Ôn lại phép phân phối',exact:true}).waitFor();
  await page.locator('.note-form textarea').fill('Đúng quy tắc, có bước kiểm chứng.');await page.locator('.note-form button').click();
  await page.getByText('Đã lưu nhận xét cho học sinh.',{exact:true}).waitFor();
  await page.screenshot({path:'artifacts/teacher-dashboard.png',fullPage:true});
  await logout();await login('student');await page.getByRole('heading',{name:'Nhiệm vụ từ giáo viên'}).waitFor();
  await page.goto(base+'/#learning');await page.getByText('Đúng quy tắc, có bước kiểm chứng.',{exact:false}).waitFor();
  await page.reload();await page.getByText('Đúng quy tắc, có bước kiểm chứng.',{exact:false}).waitFor();
  await page.goto(base+'/#explore/garden');await page.locator('[data-renderer="webgl"] canvas').waitFor();
  await logout();await login('student2');assert.equal(await page.locator('#main').getByText('Ôn lại phép phân phối',{exact:true}).count(),0);
  await logout();await login('parent');await page.locator('#parent-dashboard .pd-hero').waitFor();assert.equal(await page.locator('.note-form,#assignment-form').count(),0);
  await page.goto(base+'/#teacher');await page.waitForURL('**/#home');await page.screenshot({path:'artifacts/parent-dashboard.png',fullPage:true});
  await logout();await login('admin');await page.locator('#create-user-form').waitFor();
  await page.locator('#new-name').fill('Học sinh mới');await page.locator('#new-username').fill('new.student');await page.locator('#new-password').fill(password);await page.locator('#create-user-form button').click();await page.getByText('new.student',{exact:true}).waitFor();
  await page.screenshot({path:'artifacts/admin-dashboard.png',fullPage:true});
  await logout();await page.setViewportSize({width:390,height:844});await page.screenshot({path:'artifacts/login-mobile.png',fullPage:true});await login('student');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:'artifacts/student-role-mobile.png',fullPage:true});
  // Session revocation must lock the UI on the next privileged request.
  await context.request.post(base+'/api/auth/logout',{data:{}});await page.goto(base+'/#settings');await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await page.locator('#login-form').waitFor();
  await login('parent');await page.evaluate(()=>navigator.serviceWorker.ready);await page.reload();await page.locator('#parent-dashboard .pd-hero').waitFor();await context.setOffline(true);await page.reload();await page.locator('#login-form').waitFor();assert.equal(await page.locator('#parent-dashboard .pd-hero').count(),0);await context.setOffline(false);
  assert.deepEqual(errors,[]);console.log('PASS: login, direct-route guards, storage tampering, isolated student state, teacher workflow, parent read-only view, admin creation, mobile, logout and offline lock');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));await rm(dir,{recursive:true,force:true});}
