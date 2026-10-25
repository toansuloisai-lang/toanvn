import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {questionLibrary,pendingQuestionLibrary} from '../question-library.mjs';
import {libraryPracticeExercises as exercises,libraryPracticeSkills as skills} from '../public/library-practice-bank.js';
import {createPracticePhotos} from '../practice-photos.mjs';
test('all verified library formats reach practice, pending questions stay excluded',()=>{
 const rows=exercises.filter(e=>e.libraryPractice);
 assert.equal(new Set(rows.map(e=>e.sourceQuestionId)).size,questionLibrary.length);
 for(const q of questionLibrary)for(const type of q.formats){
  const e=rows.find(e=>e.sourceQuestionId===q.id&&e.type===type);
  assert.ok(e);assert.deepEqual(e.grades,[q.grade]);assert.equal(e.rule,q.solution);
  assert.ok(skills.some(s=>s.id===e.skill));
 }
 assert.ok(!rows.some(e=>pendingQuestionLibrary.some(q=>q.id===e.sourceQuestionId)));
});
test('library practice grades on server, persists history and rejects other grades',()=>{
 const user={id:'student',role:'student'},db={users:[user],teacherContents:[],states:{student:{profile:{grade:7}}}};
 let saves=0;
 const service=createPracticePhotos({db,persist:()=>saves++,student:()=>user.id});
 const ex=exercises.find(e=>e.libraryPractice&&e.type==='mcq'&&e.grades.includes(7));
 const input={requestId:randomUUID(),exerciseId:ex.id,choiceIndex:ex.correctIndex};
 assert.equal(service.submitChoice(user,input).correct,true);
 assert.equal(service.submitChoice(user,input).correct,true);assert.equal(saves,1);
 assert.equal(service.list(user,{}).length,1);
 const other=exercises.find(e=>e.libraryPractice&&e.type==='mcq'&&!e.grades.includes(7));
 assert.throws(()=>service.submitChoice(user,{...input,requestId:randomUUID(),exerciseId:other.id}),e=>e.status===404);
});
