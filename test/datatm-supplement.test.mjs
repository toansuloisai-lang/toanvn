import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createStore} from '../auth-store.mjs';
import {docxFixture} from '../scripts/document-fixtures.mjs';
import {questionLibrary,pendingQuestionLibrary,libraryCatalog,selectLibraryQuestions} from '../question-library.mjs';

test('screened questions are shared by grade, teacher-only and cannot be assigned before review',()=>{
 const catalog=libraryCatalog({role:'teacher'});
 assert.equal(catalog.pendingQuestions.length,pendingQuestionLibrary.length);
 assert.ok(catalog.pendingQuestions.length<1935);
 assert.equal(new Set(catalog.pendingQuestions.map(q=>q.id)).size,catalog.pendingQuestions.length);
 assert.throws(()=>libraryCatalog({role:'student'}),e=>e.status===403);
 for(const grade of [6,7,8,9])assert.ok(catalog.pendingQuestions.some(q=>q.grade===grade));
 for(const q of pendingQuestionLibrary){
  assert.equal(q.review.status,'pending');
  assert.ok(q.sourceSolution&&q.source.sha256);
  assert.ok(!questionLibrary.some(row=>row.id===q.id));
  assert.throws(()=>selectLibraryQuestions([{id:q.id,type:'essay',points:10}],q.grade),e=>e.status===400);
 }
});
test('pending source documents remain teacher-only across restart and direct downloads',()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'datatm-pending-'));
 try{
  const file=path.join(dir,'accounts.json'),store=createStore(file),password='Datatm-test-password-123';
  const child=store.createUser({username:'student',password,name:'Student',role:'student'});
  const teacher=store.createUser({username:'teacher',password,name:'Teacher',role:'teacher',studentIds:[child.id]});
  store.saveStudent(child,{attempts:[],reviews:{},profile:{name:'Student',grade:'7'}});
  const input={title:'Source awaiting review',grade:7,filename:'source.docx',base64:docxFixture().toString('base64'),visibility:'teacher'};
  const {lesson}=store.uploadLesson(teacher,input);
  assert.equal(store.uploadedLessons(teacher).length,1);
  assert.equal(store.uploadedLessons(child).length,0);
  assert.throws(()=>store.uploadedFile(child,lesson.id),e=>e.status===404);
  assert.equal(store.uploadLesson(teacher,input).duplicate,true);
  const restarted=createStore(file);assert.equal(restarted.uploadedLessons(child).length,0);
  assert.throws(()=>store.reviewUploadedLesson(child,lesson.id),e=>e.status===404);
  const foreign=store.createUser({username:'foreign',password,name:'Foreign',role:'teacher'});
  assert.throws(()=>store.reviewUploadedLesson(foreign,lesson.id),e=>e.status===404);
  store.reviewUploadedLesson(teacher,lesson.id);
  assert.equal(store.uploadedLessons(child).length,1);
  assert.equal(createStore(file).uploadedLessons(child).length,1);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('reviewed supplemental questions support MCQ and photo essay selections',()=>{
 const added=questionLibrary.filter(q=>q.id.startsWith('supplement-'));assert.ok(added.length>=17);
 for(const q of added){
  assert.equal(q.review.status,'verified');if(q.formats.includes('mcq'))assert.equal(q.choices[q.correctIndex],q.answer);
  assert.ok(q.solution&&q.source.sha256&&q.source.originalAnswer);
  for(const type of q.formats)assert.equal(selectLibraryQuestions([{id:q.id,type,points:10}],q.grade)[0].type,type);
  if(!q.formats.includes('mcq'))assert.throws(()=>selectLibraryQuestions([{id:q.id,type:'mcq',points:10}],q.grade),e=>e.status===400);
 }
});
