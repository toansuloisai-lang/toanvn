import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {createTestApp} from './browser-fixture.mjs';
const realFetch=globalThis.fetch,contexts=[];
globalThis.fetch=async(url,options)=>{
 if(String(url).startsWith('https://generativelanguage.googleapis.com/')){
  const data=JSON.parse(JSON.parse(options.body).contents[0].parts[0].text);contexts.push(data);
  return {ok:true,json:async()=>({candidates:[{content:{parts:[{text:JSON.stringify({summary:'Kết quả có điểm thi và bằng chứng từng câu để đối chiếu.',actions:['Đối chiếu bước chuyển vế và làm lại câu sai.'],exerciseIds:[]})}]}}]})};
 }return realFetch(url,options);
};
const app=await createTestApp({grade:8}),{accounts}=await import('../server.mjs');
const teacher=accounts.authenticate(accounts.login('teacher','Isolated-test-password-123!','class-report').token),student=accounts.users().find(u=>u.role==='student');
const other=accounts.createUser({username:'student2',password:'Isolated-test-password-123!',name:'Học sinh lớp khác',role:'student'});
accounts.saveStudent(other,{attempts:[],reviews:{},profile:{name:other.name,grade:'8'}});
const admin=accounts.createUser({username:'admin',password:'Isolated-test-password-123!',name:'Quản trị',role:'admin'});
accounts.link(admin,{userId:teacher.id,studentIds:[student.id,other.id]});teacher.studentIds=[student.id,other.id];
const c=accounts.learning.createClass(teacher,{name:'8A',grade:8,studentIds:[student.id]});
const c2=accounts.learning.createClass(teacher,{name:'8B',grade:8,studentIds:[other.id]});
const exam=accounts.exams.publish(teacher,{classId:c.id,title:'Ôn tập phương trình',durationMinutes:30,questions:[{prompt:'Giải 2x=4.',choices:['1','2','3','4'],correctIndex:1,explanation:'Chia hai vế cho 2, được x=2.',source:'Bài tập của giáo viên',topic:'Phương trình bậc nhất'}]});
accounts.exams.start(student,exam.id);
accounts.exams.submit(student,exam.id,{answers:[0],version:0});
const browser=await chromium.launch({channel:'msedge',headless:true}),page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await app.login(page,'teacher');await page.goto(app.base+'/#learning/progress');
 await page.locator('[data-open-class]').first().waitFor();assert.equal(await page.locator('[data-open-class]').count(),2);assert.equal(await page.locator('.sr-roster').count(),0);
 await page.locator(`[data-open-class="${c.id}"]`).click();await page.locator('.sr-roster').waitFor();
 assert.equal(await page.locator('.sr-roster tbody tr').count(),1);assert.ok(!(await page.locator('.sr-roster').innerText()).includes(other.name));
 await page.locator('#class-insight').click();await page.locator('#class-insight-result .feedback').waitFor();assert.equal(contexts[0].students.length,1);assert.equal(contexts[0].students[0].evidence[0].correctAnswer,'2');
 await page.locator('.sr-roster [data-open-student]').first().click();await page.locator('.sr-radar svg').waitFor();assert.equal(await page.locator('.sr-axis-list strong').filter({hasText:'Chưa có bài làm'}).count(),5);
 await page.screenshot({path:'artifacts/class-report-student-desktop.png',fullPage:true});
 await page.locator('#personal-insight').click();await page.locator('#personal-insight-result .feedback').waitFor();assert.equal(contexts.at(-1).assignments[0].title,'Ôn tập phương trình');
 await page.locator('[data-report-tab="scores"]').click();await page.getByRole('heading',{name:'Điểm nhiệm vụ được giao'}).waitFor();
 await page.locator('[data-report-tab="knowledge"]').click();await page.locator('.knowledge-mistake').first().waitFor();
 await page.locator('[data-report-tab="overview"]').click();await page.setViewportSize({width:390,height:844});await page.screenshot({path:'artifacts/class-report-student-mobile.png',fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 await page.locator('#back-class').click();await page.locator('#class-student-search').fill('không có tên');await page.locator('#roster-empty').waitFor();
 await page.locator('[data-browse-classes]').click();await page.locator(`[data-open-class="${c2.id}"]`).click();await page.locator('.sr-roster').waitFor();assert.ok((await page.locator('.sr-roster').innerText()).includes(other.name));
 await page.locator('[data-browse-classes]').click();await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:'artifacts/class-report-classes.png',fullPage:true});
 await page.goto(app.base+'/#knowledge');await page.locator('[data-open-class]').first().waitFor();
 assert.deepEqual(errors,[]);console.log('PASS: classes first, isolated rosters, student radar, AI evidence, report tabs, knowledge navigation and mobile. No live AI calls or email.');
}finally{await browser.close();await app.close();globalThis.fetch=realFetch;}
