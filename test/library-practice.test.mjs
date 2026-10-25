import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {questionLibrary,pendingQuestionLibrary} from '../question-library.mjs';
import {libraryPracticeExercises as exercises,libraryPracticeSkills as skills} from '../public/library-practice-bank.js';
import {createPracticePhotos} from '../practice-photos.mjs';
import {balancedLibraryListing} from '../scripts/library-practice-selection.mjs';
import {libraryPracticeListedIds} from '../public/library-practice-bank.js';

test('grades 8 and 9 each include at least 500 distinct DATATM questions',()=>{
 for(const grade of [8,9])assert.ok(new Set(exercises.filter(e=>e.grades.includes(grade)).map(e=>e.sourceQuestionId)).size>=500);
});

test('recovered DATATM counts match independent enumeration and retain source evidence',()=>{
 const get=n=>questionLibrary.find(q=>q.id==='supplement-source-7f79e734bffc813a6e-'+n);
 const count=(limit,predicate)=>Array.from({length:limit},(_,i)=>i).filter(predicate).length;
 const expected=new Map([
  [38,count(1000,n=>n>=100&&n%2===0&&/^[0-3]{3}$/.test(String(n))&&new Set(String(n)).size===3)],
  [39,count(1000,n=>n>=100&&/^[0-6]{3}$/.test(String(n))&&new Set(String(n)).size===3&&n%10===2*Math.floor(n/100))],
  [73,3],[84,count(1002,n=>n%2===1&&n%3!==0)],
  [87,Array.from({length:10},(_,i)=>i).flatMap(a=>Array.from({length:10},(_,b)=>[a,b])).filter(([a,b])=>a!==b&&b>=6).length],
 ]);
 for(const [id,answer] of expected){
  const q=get(id);assert.equal(Number(q.answer),answer);
  assert.match(q.source.sha256,/^[a-f0-9]{64}$/);
  assert.ok(q.source.originalPrompt&&q.source.recoveredPrompt);
  assert.match(q.source.recoveryMethod,/WMF ExtTextOut/);
  if(q.choices)assert.equal(q.choices[q.correctIndex],q.answer);
 }
});

test('displayed DATATM formats are balanced and retain every source per grade',()=>{
 const result=balancedLibraryListing(exercises);
 assert.deepEqual(result.ids,libraryPracticeListedIds);
 const selected=new Set(result.ids);
 for(const grade of [6,7,8,9]){
  const all=exercises.filter(e=>e.grades.includes(grade));
  const listed=all.filter(e=>selected.has(e.id));
  assert.equal(listed.filter(e=>e.type==='mcq').length,listed.filter(e=>e.type==='essay').length);
  assert.deepEqual(new Set(listed.map(e=>e.sourceQuestionId)),new Set(all.map(e=>e.sourceQuestionId)));
 }
 assert.ok(result.ids.every(id=>exercises.some(e=>e.id===id)));
 assert.throws(()=>balancedLibraryListing([{id:'essay',sourceQuestionId:'one',grades:[6],type:'essay'}]),/Cannot balance/);
});

test('option punctuation OB does not split a geometric answer',()=>{
 const q=questionLibrary.find(q=>q.id==='supplement-source-397bfd9891c1ce8089-9');
 assert.equal(q.choices.length,4);
 assert.ok(q.choices.includes('OA = OB.'));
});
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
test('edited sources preserve original stems, corrected answers and format restrictions',()=>{
 const equation=questionLibrary.find(q=>q.id==='supplement-source-aa3f15b65872dca10b-8');
 assert.equal(equation.answer,'y = 3x + 1');
 assert.ok(equation.source.originalPrompt.includes('y = 13x'));
 assert.deepEqual(equation.formats,['essay']);
 const statement=questionLibrary.find(q=>q.id==='supplement-source-20182a65df4caa2921-5');
 assert.deepEqual(statement.formats,['essay']);
 assert.match(statement.answer,/C,D sai/);
 const choice=questionLibrary.find(q=>q.id==='supplement-source-aa3f15b65872dca10b-9');
 assert.equal(choice.choices.length,4);assert.equal(choice.correctIndex,1);
 assert.equal(choice.answer,choice.choices[1]);
 assert.ok(!choice.prompt.includes('B.'));
});
test('source choices printed A C B D preserve the correct answer after sorting',()=>{
 const q=questionLibrary.find(q=>q.id==='supplement-source-10afd5b3cd47c04e45-18');
 assert.equal(q.correctIndex,1);
 assert.equal(q.choices[q.correctIndex],'là trung điểm cạnh huyền.');
 const e=exercises.find(e=>e.sourceQuestionId===q.id&&e.type==='mcq');
 assert.equal(e.correctIndex,q.correctIndex);
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
