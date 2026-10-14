import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createExamService} from '../exam-service.mjs';
import {separateAuditedAttempts} from '../scripts/separate-audited-attempts.mjs';
function fixture(){
  let time=100000,failing=false,saved;
  const student={id:'s',role:'student'},other={id:'o',role:'student'},teacher={id:'t',role:'teacher',studentIds:['s']};
  const db={users:[student,other,teacher],states:{s:{profile:{grade:8}},o:{profile:{grade:8}}},classes:[{id:'c',teacherId:'t',name:'8A4',grade:8,studentIds:['s']}]};
  const persist=()=>{if(failing)throw Error('disk failure');saved=structuredClone(db);};
  const service=createExamService({db,persist,now:()=>time});
  const questions=[{prompt:'2 + 2 = ?',choices:['3','4','5','6'],correctIndex:1,explanation:'2 + 2 = 4.',source:'Test fixture'}];
  const exam=service.publish(teacher,{classId:'c',title:'Đề kiểm tra',durationMinutes:30,questions});
  return {db,service,student,other,teacher,exam,questions,advance:ms=>time+=ms,fail:value=>failing=value,restart:()=>createExamService({db:structuredClone(saved),persist:()=>{},now:()=>time})};
}
test('teacher manages due and withdrawal, clones new round without altering results',()=>{
 const f=fixture(),s=f.service,id=f.exam.id;
 assert.throws(()=>s.manage(f.student,id,{withdrawn:true}),{status:403});
 assert.throws(()=>s.manage({...f.teacher,id:'other'},id,{withdrawn:true}),{status:404});
 assert.throws(()=>s.manage(f.teacher,id,{due:'2026-02-30'}),{status:400});
 s.manage(f.teacher,id,{withdrawn:true});assert.throws(()=>s.start(f.student,id),{status:409});
 s.manage(f.teacher,id,{withdrawn:false});const a=s.start(f.student,id).attempt;
 s.manage(f.teacher,id,{withdrawn:true,due:'2026-12-31'});assert.equal(s.start(f.student,id).attempt.deadline,a.deadline);
 s.submit(f.student,id);const original=structuredClone(f.db.examAttempts);
 const clone=s.manage(f.teacher,id,{action:'clone',title:'Round 2'});s.start(f.student,clone.id);
 assert.deepEqual(f.db.examAttempts[0],original[0]);assert.equal(f.db.examAttempts.length,2);
});
test('audited test runs are preserved but do not consume real attempts or expose answers',()=>{
 const f=fixture(),s=f.service,id=f.exam.id;s.start(f.student,id);const old=s.submit(f.student,id).attempt;
 const audit={purpose:'system check',runs:[{attemptId:old.id,examId:id,studentId:f.student.id,score:old.score}]};
 assert.throws(()=>separateAuditedAttempts(f.db,{runs:[{...audit.runs[0],studentId:'other'}]}),/does not match/);
 separateAuditedAttempts(f.db,audit);assert.equal(f.db.examAttempts.length,1);
 assert.equal(s.list(f.student)[0].attempt,null);assert.deepEqual(s.get(f.student,id).questions,[]);
 assert.equal(s.results(f.teacher,id).students[0].attempt,null);assert.equal(s.results(f.teacher,id).testAttempts.length,1);
 const fresh=s.start(f.student,id);assert.notEqual(fresh.attempt.id,old.id);assert.equal(fresh.questions[0].correctIndex,undefined);
 s.answer(f.student,id,{questionIndex:0,choiceIndex:1,version:0});assert.equal(s.submit(f.student,id).attempt.score,10);
 assert.equal(f.db.examAttempts[0].score,old.score);assert.equal(s.results(f.teacher,id).students[0].attempt.score,10);
});
test('timed exam hides questions before start and answers until submission, persists one deadline',()=>{
  const f=fixture(),{service:s,student:u,exam:e}=f;
  assert.deepEqual(s.get(u,e.id).questions,[]);
  const start=s.start(u,e.id);assert.equal(start.attempt.deadline-start.attempt.startedAt,1800000);
  assert.equal(start.questions[0].correctIndex,undefined);assert.equal(start.questions[0].explanation,undefined);
  f.advance(45000);assert.equal(s.start(u,e.id).attempt.deadline,start.attempt.deadline);
  s.answer(u,e.id,{questionIndex:0,choiceIndex:1,version:0});
  const restarted=f.restart();assert.equal(restarted.get(u,e.id).attempt.answers[0],1);
  const result=restarted.submit(u,e.id);assert.equal(result.attempt.score,10);assert.equal(result.questions[0].correctIndex,1);
  assert.deepEqual(restarted.submit(u,e.id).attempt,result.attempt);
  assert.deepEqual(restarted.answer(u,e.id,{questionIndex:0,choiceIndex:0,version:1}).attempt,result.attempt);
});
test('server expires closed/offline tabs, rejects late answers and preserves deadline after restart',()=>{
  const f=fixture(),s=f.service,u=f.student,id=f.exam.id;const start=s.start(u,id);
  f.advance(1800000);
  const result=f.restart().answer(u,id,{questionIndex:0,choiceIndex:1,version:0});
  assert.equal(result.attempt.reason,'timeout');assert.equal(result.attempt.score,0);
  assert.equal(result.attempt.submittedAt,start.attempt.deadline);assert.deepEqual(result.attempt.answers,[null]);
  s.sweep();assert.equal(f.db.examAttempts[0].reason,'timeout');assert.equal(s.results(f.teacher,id).students[0].attempt.score,0);
});
test('exam authorization checks role, class membership, grade and teacher links',()=>{
  const f=fixture(),s=f.service,id=f.exam.id;
  assert.deepEqual(s.list(f.other),[]);assert.throws(()=>s.start(f.other,id),e=>e.status===404);
  assert.throws(()=>s.start(f.teacher,id),e=>e.status===403);
  assert.throws(()=>s.results(f.student,id),e=>e.status===403);
  assert.throws(()=>s.publish(f.student,{}),e=>e.status===403);
  assert.throws(()=>s.results({...f.teacher,id:'other-teacher'},id),e=>e.status===404);
  s.start(f.student,id);f.teacher.studentIds=[];assert.throws(()=>s.get(f.student,id),e=>e.status===404);
  f.teacher.studentIds=['s'];f.db.states.s.profile.grade=7;assert.deepEqual(s.list(f.student),[]);
});
test('stale tabs and invalid answers cannot overwrite, failed persistence rolls back and retries',()=>{
  const f=fixture(),s=f.service,u=f.student,id=f.exam.id;s.start(u,id);
  s.answer(u,id,{questionIndex:0,choiceIndex:1,version:0});
  assert.throws(()=>s.answer(u,id,{questionIndex:0,choiceIndex:2,version:0}),e=>e.status===409);
  assert.throws(()=>s.answer(u,id,{questionIndex:0,choiceIndex:4,version:1}),e=>e.status===400);
  f.fail(true);assert.throws(()=>s.answer(u,id,{questionIndex:0,choiceIndex:2,version:1}),/disk failure/);
  assert.deepEqual(s.get(u,id).attempt.answers,[1]);
  assert.throws(()=>s.submit(u,id),/disk failure/);assert.equal(s.get(u,id).attempt.submittedAt,null);
  f.advance(1800000);assert.throws(()=>s.sweep(),/disk failure/);
  assert.equal(f.db.examAttempts[0].submittedAt,null);
  f.fail(false);s.sweep();assert.equal(s.get(u,id).attempt.score,10);
});
