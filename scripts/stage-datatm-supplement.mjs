import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync,linkSync} from 'node:fs';
import {createStore} from '../auth-store.mjs';
import {questionLibrary} from '../question-library.mjs';
const phase=Number(process.argv[2]||1),root='private/datatm-supplement';
const dbFile=`${root}/app/accounts.json`,uploadDir=`${root}/app/uploads`;
let db=JSON.parse(await fs.readFile(dbFile,'utf8'));
let stagedSource;
mkdirSync(uploadDir,{recursive:true});
const store=createStore(dbFile,{storage:{load:()=>db,save:value=>{db=value;},stageFile:(key,bytes)=>{try{linkSync(stagedSource,path.join(uploadDir,key));}catch{writeFileSync(path.join(uploadDir,key),bytes);}},readFile:key=>readFileSync(path.join(uploadDir,key))}}),users=store.users();
const teacher7=users.find(u=>u.username==='gv.dothitam.7a8');
const otherTeacher=users.find(u=>u.role==='teacher'&&!u.virtualTeacher&&u.id!==teacher7?.id);
if(!teacher7||!otherTeacher)throw Error('Expected teachers missing in isolated snapshot');
const all=[];
for(const n of phase===1?[1]:[1,2])all.push(...JSON.parse(await fs.readFile(`${root}/phase${n}-documents.json`,'utf8')).map(d=>({...d,extractionPhase:n})));
const records=all.filter(d=>(phase===1?d.grade===7:d.extractionPhase===2||d.grade!==7)&&d.status==='document_ready');
const manifest=[],known=new Map();
for(const record of records){
 const teacher=record.grade===7?teacher7:otherTeacher;
 const key=teacher.id+':'+record.grade+':'+record.sha256;
 if(known.has(key)){manifest.push({...record,status:'duplicate',duplicateOf:known.get(key)});continue;}
 if(![6,7,8,9].includes(record.grade)){manifest.push({...record,status:'unknown_grade'});continue;}
 const bytes=await fs.readFile(record.source);
 assert.equal(createHash('sha256').update(bytes).digest('hex'),record.sha256);
 const title=`Toán ${record.grade} · ${record.topic.replaceAll('_',' ')}`.slice(0,120);
 const description=`Nguồn: ${path.basename(record.archive)}. Tài liệu gốc giữ nguyên công thức, hình vẽ và đáp án nguồn (nếu có). CHỜ DUYỆT NỘI DUNG: chưa phát cho học sinh; không mặc định đáp án nguồn là đúng.`;
 stagedSource=record.source;
 const result=store.uploadLesson(teacher,{title,description,grade:record.grade,filename:path.basename(record.source).slice(-160),base64:bytes.toString('base64'),visibility:'teacher'});
 assert.equal(result.lesson.visibility,'teacher');
 assert.deepEqual(store.uploadedFile(teacher,result.lesson.id).content,bytes);
 const student=users.find(u=>u.role==='student'&&teacher.studentIds.includes(u.id));
 if(student){assert.ok(!store.uploadedLessons(student).some(l=>l.id===result.lesson.id));assert.throws(()=>store.uploadedFile(student,result.lesson.id),e=>e.status===404);}
 assert.throws(()=>store.uploadedFile(teacher.id===teacher7.id?otherTeacher:teacher7,result.lesson.id),e=>e.status===404);
 known.set(key,result.lesson.id);manifest.push({...record,lessonId:result.lesson.id,teacherId:teacher.id,status:result.duplicate?'existing':'staged_teacher_only'});
 if(manifest.length%100===0)console.log(JSON.stringify({phase,processed:manifest.length,total:records.length}));
}
const catalog=store.library.catalog(teacher7),added=questionLibrary.filter(q=>q.id.startsWith('supplement-'));
for(const q of added){assert.ok(catalog.questions.some(x=>x.id===q.id));assert.equal(q.choices[q.correctIndex],q.answer);assert.equal(q.review.status,'verified');}
assert.equal(new Set(questionLibrary.map(q=>q.id)).size,questionLibrary.length);
await fs.writeFile(`${root}/phase${phase}-staged.json`,JSON.stringify({environment:'isolated local snapshot, NOT production',documents:manifest,reviewedSharedQuestions:added.length},null,2));
await fs.writeFile(dbFile+'.tmp',JSON.stringify(db),{mode:0o600});await fs.rename(dbFile+'.tmp',dbFile);
console.log(JSON.stringify({phase,documents:manifest.length,staged:manifest.filter(m=>m.status==='staged_teacher_only').length,existing:manifest.filter(m=>m.status==='existing').length,duplicates:manifest.filter(m=>m.status==='duplicate').length,sharedQuestions:questionLibrary.length,newReviewedQuestions:added.length,studentAccessToPendingDocuments:'denied'}));
