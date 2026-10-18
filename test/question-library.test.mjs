import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import sharp from 'sharp';
import {questionLibrary,libraryCatalog,selectLibraryQuestions} from '../question-library.mjs';
import {createLibraryService} from '../library-service.mjs';
import {evaluate} from '../public/data.js';
import {validateMath} from '../math-validation.mjs';
const teacher={id:'teacher',role:'teacher',studentIds:['student']},student={id:'student',role:'student'},outsider={id:'other',role:'student'};
const failStatus=(fn,status)=>assert.throws(fn,e=>e.status===status);
function fixture(){let time=Date.parse('2026-10-18T00:00:00Z'),failing=false,saved;
 const db={users:[structuredClone(teacher),student,outsider],states:{student:{profile:{grade:'8'}},other:{profile:{grade:'8'}}},classes:[{id:'class',teacherId:'teacher',grade:8,name:'8A',studentIds:['student']}]},files=new Map();
 const options={db,persist(){if(failing)throw Error('disk unavailable');saved=structuredClone(db);},now:()=>time,writeFile:(key,bytes)=>files.set(key,bytes),readFile:key=>files.get(key)};
 const service=createLibraryService(options),questions=questionLibrary.filter(q=>q.grade===8),payload=(mode='practice')=>({requestId:randomUUID(),classId:'class',title:'DATATM '+mode,mode,due:'2026-10-18',durationMinutes:1,questions:[{id:questions[0].id,type:'mcq',points:5},{id:questions[1].id,type:'essay',points:5}]});
 return {service,db,options,files,questions,payload,advance:ms=>time+=ms,setTime:t=>time=t,fail:value=>failing=value,saved:()=>saved};
}
test('DATATM library exceeds the target with unique verified sources, valid math and format-specific choices',()=>{
 assert.ok(questionLibrary.length>=400);assert.equal(new Set(questionLibrary.map(q=>q.id)).size,questionLibrary.length);
 const prompts=new Set();
 for(const q of questionLibrary){assert.equal(q.review.status,'verified');assert.match(q.source.sha256,/^[a-f0-9]{64}$/);assert.ok(q.solution&&q.prompt&&q.source.file);assert.equal(q.rubric.reduce((s,r)=>s+r.points,0),10);for(const text of [q.prompt,q.answer,q.solution,...q.rubric.map(r=>r.description)])assert.doesNotThrow(()=>validateMath(text,10000),q.id);const key=q.grade+':'+q.prompt.normalize('NFKC').toLocaleLowerCase('vi').replace(/[\s\p{P}]+/gu,'');assert.ok(!prompts.has(key),'Duplicate prompt '+q.id);prompts.add(key);
  if(q.formats.includes('mcq')){assert.equal(q.choices.length,4);assert.equal(q.choices[q.correctIndex],q.answer);assert.equal(new Set(q.choices).size,4);const values=q.choices.map(evaluate);if(values.every(Number.isFinite))assert.equal(new Set(values).size,4);q.choices.forEach(c=>validateMath(c,500));}else assert.equal(q.choices,undefined);
 }
 for(const grade of [6,7,8,9]){assert.ok(questionLibrary.filter(q=>q.grade===grade).length>=50);assert.ok(questionLibrary.filter(q=>q.grade===grade&&q.formats.includes('mcq')).length>=10);}
 failStatus(()=>libraryCatalog(student),403);failStatus(()=>selectLibraryQuestions([null],8),400);
 const original=questionLibrary[0],copy=selectLibraryQuestions([{id:original.id,type:'mcq',points:10,edit:{prompt:'Đề sửa',choices:['1','2','3','4'],correctIndex:3}}],6)[0];assert.equal(copy.answer,'4');assert.equal(copy.edited,true);assert.notEqual(original.prompt,copy.prompt);assert.deepEqual(copy.source,original.source);
});

test('essay-only source questions cannot be published as MCQs and native text choices remain usable',()=>{
 const essay=questionLibrary.find(q=>q.grade===8&&!q.formats.includes('mcq'));
 failStatus(()=>selectLibraryQuestions([{id:essay.id,type:'mcq',points:10}],8),400);
 assert.equal(selectLibraryQuestions([{id:essay.id,type:'essay',points:10}],8)[0].answer,essay.answer);
 const native=questionLibrary.find(q=>q.grade===9&&q.formats.length===1&&q.formats[0]==='mcq');
 assert.equal(selectLibraryQuestions([{id:native.id,type:'mcq',points:10}],9)[0].answer,native.choices[native.correctIndex]);
 failStatus(()=>selectLibraryQuestions([{id:native.id,type:'essay',points:10}],9),400);
});
test('library publishing validates teacher, class, grade, duplicates, total points and request replay atomically',()=>{
 const f=fixture(),p=f.payload(),{service:s}=f;
 failStatus(()=>s.publish(student,p),403);failStatus(()=>s.publish({...teacher,id:'foreign'},p),400);
 failStatus(()=>s.publish(teacher,{...p,questions:[p.questions[0],p.questions[0]]}),400);
 failStatus(()=>s.publish(teacher,{...p,questions:[{...p.questions[0],points:3}]}),400);
 failStatus(()=>s.publish(teacher,{...p,questions:[{id:questionLibrary.find(q=>q.grade===9).id,type:'essay',points:10}]}),400);
 const set=s.publish(teacher,p);assert.equal(s.publish(teacher,p).id,set.id);assert.equal(f.db.librarySets.length,1);
 failStatus(()=>s.publish(teacher,{...p,title:'Changed'}),409);failStatus(()=>s.detail(outsider,set.id),404);
 f.fail(true);assert.throws(()=>s.publish(teacher,{...p,requestId:randomUUID()}),/disk unavailable/);assert.equal(f.db.librarySets.length,1);assert.equal(f.saved().librarySets.length,1);
});
test('mixed practice saves photos and choices, retries failed AI, computes weighted temporary score and reserves final score for teacher',async()=>{
 const f=fixture(),s=f.service,id=s.publish(teacher,f.payload()).id;
 assert.deepEqual(s.detail(student,id).questions,[]);let d=s.start(student,id);assert.equal(d.questions[0].solution,undefined);assert.equal(d.questions[0].correctIndex,undefined);
 const mcq=f.questions[0],essay=f.questions[1];d=s.answer(student,id,{questionId:mcq.id,choiceIndex:mcq.correctIndex,version:0});failStatus(()=>s.answer(student,id,{questionId:mcq.id,choiceIndex:0,version:0}),409);
 const base64=(await sharp({create:{width:20,height:20,channels:3,background:'white'}}).png().toBuffer()).toString('base64'),input={questionId:essay.id,requestId:randomUUID(),photos:[{base64}]};
 const upload=await s.upload(student,id,input);assert.equal((await s.upload(student,id,input)).id,upload.id);assert.equal(f.db.librarySubmissions.length,1);
 const parent={id:'parent',role:'parent',studentIds:[student.id]};assert.ok(s.image(parent,upload.id,0).length);failStatus(()=>s.image({...parent,studentIds:[]},upload.id,0),404);await assert.rejects(s.grade(parent,upload.id,async()=>({readable:true,score:10})),e=>e.status===403);
 await assert.rejects(s.grade(student,upload.id,async()=>({})),e=>e.status===409);
 s.submit(student,id);s.submit(student,id);failStatus(()=>s.answer(student,id,{questionId:mcq.id,choiceIndex:0,version:2}),409);
 await assert.rejects(s.grade(student,upload.id,async()=>{throw Error('AI unavailable');}),/AI unavailable/);assert.equal(s.detail(student,id).submissions.length,1);assert.ok(s.image(student,upload.id,0).length);
 await s.grade(student,upload.id,async input=>{assert.ok(input.question.rubric.length);assert.ok(input.images[0].length);return {readable:true,score:8,summary:'Tạm thời'};});
 d=s.detail(student,id);assert.equal(d.attempt.provisionalScore,9);assert.equal(d.attempt.review,null);assert.ok(d.questions[0].solution);
 failStatus(()=>s.review(student,id,{studentId:student.id,score:10,comment:'fake'}),403);
 s.review(teacher,id,{studentId:student.id,score:7.5,comment:'Đã xem bài.'});assert.equal(s.detail(student,id).attempt.review.score,7.5);
 await s.grade(student,upload.id,()=>{throw Error('must not regrade');});assert.equal(s.detail(student,id).attempt.review.score,7.5);
 const restored=createLibraryService({...f.options,db:structuredClone(f.saved())});assert.equal(restored.detail(student,id).attempt.review.score,7.5);assert.ok(restored.image(student,upload.id,0).length);
 failStatus(()=>s.image(outsider,upload.id,0),404);f.db.users[0].studentIds=[];failStatus(()=>s.detail(student,id),404);failStatus(()=>s.image(teacher,upload.id,0),404);
});
test('exam deadlines are server enforced and solutions remain hidden until due date, including AI feedback',async()=>{
 const f=fixture(),s=f.service,id=s.publish(teacher,f.payload('exam')).id;let d=s.start(student,id);
 assert.equal(d.attempt.deadline-d.attempt.startedAt,60000);s.answer(student,id,{questionId:f.questions[0].id,choiceIndex:f.questions[0].correctIndex,version:0});
 f.advance(61000);d=s.detail(student,id);assert.equal(d.attempt.reason,'timeout');assert.ok(d.attempt.submittedAt);assert.equal(d.released,false);assert.equal(d.attempt.provisionalScore,null);assert.equal(d.questions[0].solution,undefined);assert.equal(d.questions[0].correctIndex,undefined);assert.equal(d.attempt.questionSnapshots,undefined);
 s.review(teacher,id,{studentId:student.id,score:7,comment:'Nhận xét chứa lời giải, chỉ được mở sau hạn.'});assert.equal(s.detail(student,id).attempt.review,null);
 failStatus(()=>s.answer(student,id,{questionId:f.questions[0].id,choiceIndex:0,version:1}),409);
 f.setTime(Date.parse('2026-10-19T00:00:00Z'));d=s.detail(student,id);assert.equal(d.released,true);assert.equal(d.attempt.provisionalScore,5);assert.ok(d.questions[0].solution);
});
test('AI requests deduplicate and a teacher final review arriving during grading remains authoritative',async()=>{
 const f=fixture(),s=f.service,id=s.publish(teacher,f.payload()).id;s.start(student,id);
 const base64=(await sharp({create:{width:10,height:10,channels:3,background:'white'}}).png().toBuffer()).toString('base64');const row=await s.upload(student,id,{questionId:f.questions[1].id,requestId:randomUUID(),photos:[{base64}]});s.submit(student,id);
 let resolve,calls=0;const grader=()=>{calls++;return new Promise(r=>resolve=r);};const first=s.grade(student,row.id,grader),second=s.grade(student,row.id,grader);s.review(teacher,id,{studentId:student.id,score:6,comment:'Giáo viên chốt độc lập.'});resolve({readable:true,score:10});await Promise.all([first,second]);assert.equal(calls,1);assert.equal(s.detail(student,id).attempt.review.score,6);assert.equal(s.detail(student,id).submissions[0].ai,null);
});
test('teachers can select only their own authored questions and published copies survive source changes',()=>{
 const f=fixture(),ownId=randomUUID(),foreignId=randomUUID();
 f.db.teacherContents=[{id:ownId,teacherId:'teacher',kind:'exercise',grade:8,type:'mcq',topic:'Đại số',prompt:'Chọn biểu thức tương đương 2x + 2x.',answer:'4x',choices:['4x','2x','4x²','4'],correctIndex:0,rule:'Cộng hai hệ số: 2x + 2x = 4x.'},{id:foreignId,teacherId:'foreign',kind:'exercise',grade:8,prompt:'Câu riêng của giáo viên khác',answer:'2',rule:'Không được truy cập.'}];
 const catalog=f.service.catalog(teacher);assert.ok(catalog.questions.some(q=>q.id===ownId));assert.ok(!catalog.questions.some(q=>q.id===foreignId));
 const p={...f.payload(),questions:[{id:ownId,type:'mcq',points:10}]};const set=f.service.publish(teacher,p);f.db.teacherContents[0].choices[0]='Sai';assert.equal(f.service.detail(teacher,set.id).questions[0].choices[0],'4x');
 failStatus(()=>f.service.publish(teacher,{...p,requestId:randomUUID(),questions:[{id:foreignId,type:'essay',points:10}]}),400);
});
