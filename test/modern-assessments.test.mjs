import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdtempSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import {createStore} from '../auth-store.mjs';
import {questionLibrary} from '../question-library.mjs';
import {modernAssessments} from '../modern-assessments.mjs';
import {studentReportSnapshot,reportPdf} from '../parent-report.mjs';
function fixture(t){const dir=mkdtempSync(path.join(os.tmpdir(),'math-modern-report-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));const store=createStore(path.join(dir,'accounts.json')),password='Local-test-password-123!';
 const student=store.createUser({username:'student',role:'student',name:'Học sinh',password});store.saveStudent(student,{attempts:[],reviews:{},profile:{name:'Học sinh',grade:'8'}});
 const teacher=store.createUser({username:'teacher',role:'teacher',name:'Giáo viên',password,studentIds:[student.id]}),parent=store.createUser({username:'parent',role:'parent',name:'Phụ huynh',password,studentIds:[student.id]}),other=store.createUser({username:'other',role:'teacher',name:'Khác',password,studentIds:[student.id]});
 const cls=store.learning.createClass(teacher,{name:'8A',grade:8,studentIds:[student.id]}),qs=questionLibrary.filter(q=>q.grade===8),due=new Date(Date.now()+3*86400000).toISOString().slice(0,10);
 return {store,student,teacher,parent,other,cls,qs,due,dir};}
test('DATATM results reach teacher, parent, knowledge, AI context and PDF, while final scores stay teacher-controlled',async t=>{
 const {store,student,teacher,parent,other,cls,qs,due,dir}=fixture(t);
 const set=store.library.publish(teacher,{requestId:randomUUID(),classId:cls.id,title:'Bộ DATATM liên kết',mode:'practice',due,questions:[{id:qs[0].id,type:'mcq',points:5},{id:qs[1].id,type:'essay',points:5}]});
 assert.ok(store.learning.report(parent,student.id).assignments.some(a=>a.id===set.id));assert.ok(store.knowledge.report(parent,student.id).pending.some(p=>p.id===set.id));assert.ok(!store.learning.report(other,student.id).assignments.some(a=>a.id===set.id));
 store.library.start(student,set.id);store.library.answer(student,set.id,{questionId:qs[0].id,choiceIndex:qs[0].correctIndex,version:0});
 const base64=(await sharp({create:{width:30,height:30,channels:3,background:'white'}}).png().toBuffer()).toString('base64');
 const upload=await store.library.upload(student,set.id,{questionId:qs[1].id,requestId:randomUUID(),photos:[{base64}]});store.library.submit(student,set.id);
 await store.library.grade(student,upload.id,async()=>({readable:true,score:8,summary:'Tạm thời',criteria:[]}));
 let a=store.learning.report(parent,student.id).assignments.find(a=>a.id===set.id);assert.equal(a.result.score,null);assert.equal(a.result.provisional,true);assert.equal(a.result.provisionalScore,9);
 assert.equal(store.knowledge.report(parent,student.id).history.find(h=>h.kind==='library').questions.length,2);
 assert.ok(store.library.image(parent,upload.id,0).length);assert.equal(store.learning.insightContext(teacher,{studentId:student.id}).assignments.find(a=>a.title===set.title).result.score,null);
 store.library.review(teacher,set.id,{studentId:student.id,score:7.5,comment:'Đã xem và chốt.'});
 a=store.learning.report(parent,student.id).assignments.find(a=>a.id===set.id);assert.equal(a.result.score,7.5);assert.equal(a.result.provisional,false);assert.equal(store.learning.parentDashboard(parent).average,7.5);
 const snapshot=studentReportSnapshot({db:JSON.parse((await import('node:fs')).readFileSync(path.join(dir,'accounts.json'),'utf8')),learning:store.learning,teacher,studentId:student.id});
 assert.equal(snapshot.knowledge.history.find(h=>h.kind==='library').photoData.length,1);assert.equal(snapshot.assignments.find(a=>a.id===set.id).result.score,7.5);
 for(const format of ['summary','full'])assert.ok((await reportPdf({id:'local',createdAt:Date.now(),teacher,reports:[snapshot],format})).length>1000);
});
test('photo submissions complete assigned practice without double counting and the teacher final score reaches reports',async t=>{
 const {store,student,teacher,parent,due}=fixture(t);
 store.learning.assignSet(teacher,{studentId:student.id,title:'Luyện tập đã giao',due,exerciseIds:['distribute-1']});
 const base64=(await sharp({create:{width:30,height:30,channels:3,background:'white'}}).png().toBuffer()).toString('base64');
 const p=await store.practicePhotos.submit(student,{requestId:randomUUID(),exerciseId:'distribute-1',working:'',photos:[{base64}]});
 let r=store.learning.report(parent,student.id);assert.equal(r.assignments.length,1);assert.equal(r.assignments[0].result.complete,true);assert.equal(r.assignments[0].result.score,null);
 assert.ok(store.knowledge.report(parent,student.id).history.some(h=>h.id===p.id));
 store.practicePhotos.review(teacher,p.id,{score:8,comment:'Đã chốt điểm bài làm.'});
 r=store.learning.report(parent,student.id);assert.equal(r.assignments.length,1);assert.equal(r.assignments[0].result.score,8);assert.equal(store.learning.parentDashboard(parent).average,8);
});
test('modern repairs reach rankings only after teacher approval, stay deduplicated, and preserve original grades',async t=>{
 const {store,student,teacher,parent,other,cls,qs,due}=fixture(t);
 const base64=(await sharp({create:{width:30,height:30,channels:3,background:'white'}}).png().toBuffer()).toString('base64'),photos=[{base64}];
 const set=store.library.publish(teacher,{requestId:randomUUID(),classId:cls.id,title:'Sửa bài DATATM',mode:'practice',due,questions:[{id:qs[0].id,type:'mcq',points:5},{id:qs[1].id,type:'essay',points:5}]});
 store.library.start(student,set.id);store.library.answer(student,set.id,{questionId:qs[0].id,choiceIndex:(qs[0].correctIndex+1)%4,version:0});
 const upload=await store.library.upload(student,set.id,{questionId:qs[1].id,requestId:randomUUID(),photos});store.library.submit(student,set.id);
 await store.library.grade(student,upload.id,async()=>({readable:true,score:5,summary:'Cần sửa',criteria:[]}));
 store.library.review(teacher,set.id,{studentId:student.id,score:2.5,comment:'Điểm ban đầu.'});
 const p=await store.practicePhotos.submit(student,{requestId:randomUUID(),exerciseId:'distribute-1',working:'',photos});store.practicePhotos.review(teacher,p.id,{score:5,comment:'Cần sửa cách làm.'});
 const mistakes=store.knowledge.report(student).mistakes.filter(m=>['library','practice-photo'].includes(m.kind));assert.equal(mistakes.length,3);
 assert.equal(store.knowledge.leaderboard(parent,cls.id).top.length,0);
 for(const m of mistakes){
  const repair=await store.knowledge.repair(student,{key:m.key,photos});
  assert.equal(store.knowledge.leaderboard(parent,cls.id).top.length,mistakes.indexOf(m)?1:0);
  assert.ok(store.knowledge.repairImage(parent,repair.id,0).length);
  assert.throws(()=>store.knowledge.reviewRepair(parent,{studentId:student.id,key:m.key,repairId:repair.id,approved:true,comment:'Không được duyệt.'}),e=>e.status===403);
  if(m.kind==='library')assert.throws(()=>store.knowledge.reviewRepair(other,{studentId:student.id,key:m.key,repairId:repair.id,approved:true,comment:'Giáo viên khác.'}),e=>e.status===404);
  store.knowledge.reviewRepair(teacher,{studentId:student.id,key:m.key,repairId:repair.id,approved:true,comment:'Đã kiểm tra ảnh, cách sửa đúng.'});
 }
 assert.equal(store.knowledge.leaderboard(parent,cls.id).top[0].corrected,3);
 const m=mistakes[0],again=await store.knowledge.repair(student,{key:m.key,photos});
 assert.equal(store.knowledge.leaderboard(parent,cls.id).top[0].corrected,2);
 store.knowledge.reviewRepair(teacher,{studentId:student.id,key:m.key,repairId:again.id,approved:true,comment:'Xác nhận bản sửa mới.'});
 assert.equal(store.knowledge.leaderboard(parent,cls.id).top[0].corrected,3);
 store.knowledge.reviewRepair(teacher,{studentId:student.id,key:m.key,repairId:again.id,approved:false,comment:'Thu hồi xác nhận cách sửa.'});
 assert.equal(store.knowledge.leaderboard(parent,cls.id).top[0].corrected,2);
 assert.equal(store.library.detail(teacher,set.id).students[0].attempt.review.score,2.5);
 assert.equal(store.practicePhotos.list(parent,{exerciseId:'distribute-1'})[0].finalScore,5);
});

test('new exam projections hide choices, solutions, AI and final grades before release for students and parents',()=>{
 const now=Date.parse('2026-10-18T10:00:00+07:00'),db={users:[{id:'t',role:'teacher',studentIds:['s']}],classes:[{id:'c',teacherId:'t',studentIds:['s']}],states:{s:{}},librarySets:[{id:'set',teacherId:'t',classId:'c',createdAt:now-30000,title:'Exam',mode:'exam',due:'2026-10-19',questions:[{id:'q',type:'mcq',topic:'Toán',prompt:'Secret',answer:'secret',choices:['secret','b','c','d'],correctIndex:0,points:10}]}],libraryAttempts:[{id:'a',setId:'set',studentId:'s',startedAt:now-20000,submittedAt:now-10000,answers:{q:0},review:{score:10,time:now-5000}}]};
 const hidden=modernAssessments(db,'s',{now});assert.deepEqual(hidden.records,[]);assert.equal(hidden.assignments[0].result.score,null);assert.equal(hidden.pending[0].status,'Đã nộp · Chờ mở kết quả');
 assert.equal(modernAssessments(db,'s',{now,teacherId:'t'}).records[0].correctAnswer,'secret');
 assert.equal(modernAssessments(db,'s',{now:now+3*86400000}).assignments[0].result.score,10);
});
