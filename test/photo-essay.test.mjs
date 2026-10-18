import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import sharp from 'sharp';
import {createEssayService} from '../essay-service.mjs';
test('Photo exams persist, enforce resubmission policy and image access, clone independently and reject AI',async()=>{
 const teacher={id:'t',role:'teacher',studentIds:['s']},student={id:'s',role:'student'},outsider={id:'x',role:'student'};
 const db={users:[teacher,student],classes:[{id:'c',teacherId:'t',grade:8,studentIds:['s']}]},files=new Map();let saved;
 const create=()=>createEssayService({db,persist:()=>saved=JSON.stringify(db),writeImage:(k,v)=>files.set(k,v),readImage:k=>files.get(k)});
 let service=create();const image=await sharp({create:{width:40,height:60,channels:3,background:'white'}}).png().toBuffer();
 const a=await service.publishImages(teacher,{title:'Đề ảnh',classId:'c',due:'2099-01-01',allowResubmit:false,photos:[{base64:image.toString('base64')}]});assert.equal(JSON.parse(saved).essayAssignments[0].mode,'images');service=create();assert.ok(service.examImage(student,a.id,0).length);assert.throws(()=>service.examImage(outsider,a.id,0));
 const q=service.start(student,a.id).questions[0],payload={questionId:q.id,working:'Bài giải',photos:[{base64:image.toString('base64')}],requestId:randomUUID()};const submission=await service.submit(student,a.id,payload);assert.equal((await service.submit(student,a.id,payload)).id,submission.id);
 let called=false;await assert.rejects(service.grade(student,submission.id,()=>{called=true;}),/trực tiếp/);assert.equal(called,false);
 service.review(teacher,submission.id,{score:10,comment:'Bài làm đúng.'});await assert.rejects(service.submit(student,a.id,{...payload,requestId:randomUUID()}),/không cho phép/);
 const clone=service.manage(teacher,a.id,{action:'clone',title:'Đợt 2'});assert.equal(service.details(teacher,clone.id).mode,'images');assert.equal(service.details(teacher,clone.id).submissions.length,0);assert.ok(service.examImage(student,clone.id,0).length);
 await assert.rejects(service.publishImages(teacher,{classId:'c',title:'Sai ngày',due:'2099-02-30',photos:[{base64:image.toString('base64')}]}));
});
