import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {createTestApp} from './browser-fixture.mjs';
import {docxFixture} from './document-fixtures.mjs';
const app=await createTestApp({grade:7}),browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const teacher=await browser.newPage();await app.login(teacher,'teacher');
 const r=await teacher.request.post(app.base+'/api/teacher/lessons/upload',{data:{title:'Nguồn Toán 7 chờ duyệt',description:'Chỉ giáo viên kiểm tra trước khi đăng.',grade:7,filename:'source.docx',visibility:'teacher',base64:docxFixture().toString('base64')}});
 assert.equal(r.status(),201);const {lesson}=await r.json();
 await teacher.goto(app.base+'/#teacher-library/documents');
 await teacher.getByRole('button',{name:'Đã kiểm tra nội dung – đăng cho học sinh'}).waitFor();
 await teacher.screenshot({path:'artifacts/datatm-pending-teacher.png',fullPage:true});
 const studentContext=await browser.newContext(),student=await studentContext.newPage();await app.login(student,'student');
 assert.equal((await student.request.get(app.base+`/api/lessons/${lesson.id}/file`)).status(),404);
 assert.ok(!(await(await student.request.get(app.base+'/api/workspace')).json()).uploadedLessons.some(l=>l.id===lesson.id));
 assert.equal((await student.request.post(app.base+`/api/teacher/lessons/${lesson.id}/publish`,{data:{}})).status(),404);
 await teacher.getByRole('button',{name:'Đã kiểm tra nội dung – đăng cho học sinh'}).click();
 await teacher.getByRole('button',{name:'Đã kiểm tra nội dung – đăng cho học sinh'}).waitFor({state:'detached'});
 assert.equal((await student.request.get(app.base+`/api/lessons/${lesson.id}/file`)).status(),200);
 const catalog=await(await teacher.request.get(app.base+'/api/library/catalog')).json();
 assert.ok(catalog.questions.filter(q=>q.id.startsWith('supplement-')&&q.grade===7).length>=17);
 await teacher.setViewportSize({width:390,height:844});assert.ok(await teacher.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 console.log('PASS: source review button, teacher-only listing and direct download protection, explicit publication, grade 7 supplemental catalog and mobile layout.');
}finally{await browser.close();await app.close();}
