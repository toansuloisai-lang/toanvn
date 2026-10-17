import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {createTestApp} from './browser-fixture.mjs';
import {exercises} from '../public/data.js';
const app=await createTestApp(),{accounts}=await import('../server.mjs'),browser=await chromium.launch({channel:'msedge',headless:true});
const teacher=accounts.users().find(u=>u.role==='teacher'),original=accounts.users().find(u=>u.role==='student'),password='Dashboard-test-password-123!';
const extra=['Trần Đức Duy','Lê Hà My','Phạm Gia Huy','Hoàng Thu Trang'].map((name,i)=>accounts.createUser({username:'dashboard.'+i,name,password,role:'student'}));
const admin=accounts.createUser({username:'dashboard.admin',name:'Admin',password,role:'admin'});accounts.link(admin,{userId:teacher.id,studentIds:[original.id,...extra.map(s=>s.id)]});
const user=accounts.authenticate(accounts.login('teacher','Isolated-test-password-123!','dashboard').token);
const group=accounts.learning.createClass(user,{name:'7A',grade:7,studentIds:user.studentIds});
for(const [i,title] of ['Quy tắc dấu và số nguyên','Bỏ ngoặc và phân phối','Gộp số hạng đồng dạng','Luyện tập tổng hợp'].entries())accounts.learning.assignSet(user,{classId:group.id,title,due:'2026-12-0'+(i+1),exerciseIds:['sign-1','sign-2','sign-3']});
for(const [i,s] of [original,...extra].entries())accounts.saveStudent(s,{attempts:['sign-1','sign-2','sign-3'].slice(0,3-i%3).map((id,j)=>({id:crypto.randomUUID(),exerciseId:id,skill:'sign',time:Date.now(),mode:'practice',answer:j===0&&i%2?'999':exercises.find(e=>e.id===id).answer,initialCorrect:true,corrected:false,working:'Em kiểm tra dấu trước khi tính.'})),reviews:{}});
const page=await browser.newPage({viewport:{width:1536,height:1024}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await app.login(page,'teacher');await page.goto(app.base);await page.locator('#td-class').waitFor();await page.locator('#td-class').selectOption(group.id);await page.getByRole('heading',{name:'Tiến độ học tập · 7A',exact:true}).waitFor();
 const data=await (await page.request.get(app.base+'/api/learning/dashboard?classId='+group.id)).json();assert.equal(data.totalStudents,5);assert.equal(data.assignedRecently,4);assert.equal(data.trend.length,7);assert.equal(data.completion,73);assert.equal(data.attention,2);assert.equal(data.assignments.length,4);
 assert.ok(await page.locator('.td-event .katex').count()>0);
 assert.ok(await page.locator('.teacher-dashboard table').first().evaluate(el=>parseFloat(getComputedStyle(el).fontSize)>=14));
 await page.screenshot({path:'artifacts/teacher-dashboard-desktop.png',fullPage:true});
 await page.locator('[data-chart-tab="errors"]').click();await page.locator('.td-error-bars').waitFor();await page.locator('[data-chart-tab="topics"]').click();await page.locator('.td-wide-topics').waitFor();await page.locator('#td-days').selectOption('30');await page.waitForFunction(()=>document.querySelector('#td-days')?.value==='30'&&document.querySelectorAll('.td-line-chart line').length===35);
 await page.locator('#td-student-search').fill('Trang');assert.equal(await page.locator('#td-student-table tbody tr').count(),1);await page.locator('#td-student-search').fill('');await page.locator('#td-student-filter').selectOption('attention');assert.equal(await page.locator('#td-student-table tbody tr').count(),2);
 for(const [route,heading] of [['learning/classes','Lớp học và báo cáo'],['learning/assignments','Lớp học và báo cáo'],['learning/progress','Lớp học và báo cáo'],['learning/errors','Lớp học và báo cáo'],['teacher-library/documents','Tài liệu học tập'],['teacher-library/lessons','Thư viện bài giảng'],['teacher-profile','Hồ sơ giáo viên']]){await page.locator(`#navigation a[href="#${route}"]`).click();await page.getByRole('heading',{name:heading,exact:true,level:1}).waitFor();}
 await page.locator('#search-input').fill('Trang');await page.locator('#global-search').evaluate(form=>form.requestSubmit());await page.locator('.td-search-results').waitFor();assert.ok((await page.locator('.td-search-results').textContent()).includes('Hoàng Thu Trang'));
 await page.goto(app.base+'/#home');await page.locator('#td-class').waitFor();await page.setViewportSize({width:390,height:844});await page.screenshot({path:'artifacts/teacher-dashboard-mobile.png',fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 await app.login(page);assert.equal((await page.request.get(app.base+'/api/learning/dashboard')).status(),403);assert.deepEqual(errors,[]);
 console.log('PASS: teacher dashboard real metrics, class selector, chart tabs, date range, student filters, sidebar destinations, global search, mobile, role guard.');
}finally{await browser.close();await app.close();}
