import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import {createStore} from '../auth-store.mjs';
import {gradeEssay} from '../essay-ai.mjs';
import {studentReportSnapshot,reportPdf} from '../parent-report.mjs';
import {readSource} from '../database/migration.mjs';
import {formatMathText} from '../public/math-format.js';
import {validateMath} from '../math-validation.mjs';
const question={prompt:'Giải \\(2x+1=5\\).',topic:'Phương trình',knowledge:'Chuyển vế và chia hệ số.',solution:'\\(2x=4\\), suy ra \\(x=2\\).',source:'DATATM test fixture',rubric:[{description:'Chuyển vế',points:5},{description:'Tìm nghiệm',points:5}]};
function fixture(){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'essay-knowledge-')),file=path.join(dir,'accounts.json'),store=createStore(file),password='Isolated-password-2026!';
 const s=store.createUser({username:'student',name:'Học sinh',role:'student',password});store.saveStudent(s,{attempts:[],reviews:{},profile:{name:s.name,grade:8}});
 const t=store.createUser({username:'teacher',name:'Giáo viên',role:'teacher',password,studentIds:[s.id]}),p=store.createUser({username:'parent',name:'Phụ huynh',role:'parent',password,studentIds:[s.id]}),o=store.createUser({username:'other',name:'Khác',role:'student',password});
 const c=store.learning.createClass(t,{name:'8A4',grade:8,studentIds:[s.id]});
 const a=store.essays.publish(t,{title:'Tự luận',classId:c.id,due:'2026-12-31',customQuestions:[question]});
 const q=store.essays.details(t,a.id).questions[0];return {dir,file,store,s,t,p,o,c,a,q,close:()=>fs.rmSync(dir,{recursive:true,force:true})};}
const mockGrade=({working})=>({readable:true,transcription:working,confidence:0.8,summary:'Sai ở phép chia cuối.',criteria:[{id:'r0',earned:5,evidence:'2x=4',reason:'Chuyển vế đúng.',missingKnowledge:'',nextStep:''},{id:'r1',earned:0,evidence:'x=4',reason:'Chưa chia cho hệ số 2.',missingKnowledge:'Chia hai vế cho hệ số.',nextStep:'Tính \\(4/2\\) rồi kiểm chứng.'}],score:5,source:'gemini',status:'pending_review'});
test('essay image storage, access boundaries, AI failure/retry and teacher review preserve submission history',async()=>{
 const f=fixture();try{const {store,s,t,p,o,a,q}=f;
 assert.equal(store.essays.details(s,a.id).questions[0].solution,undefined);
 assert.throws(()=>store.essays.details(o,a.id),e=>e.status===404);
 store.essays.start(s,a.id);const png=await sharp({create:{width:32,height:32,channels:3,background:'#ffffff'}}).png().toBuffer();
 const payload={questionId:q.id,working:'2x=4; x=4',photos:[{base64:png.toString('base64')}],requestId:crypto.randomUUID()};
 const sub=await store.essays.submit(s,a.id,payload);assert.equal((await store.essays.submit(s,a.id,payload)).id,sub.id);
 assert.equal((await sharp(store.essays.image(p,sub.id,0)).metadata()).format,'jpeg');
 assert.throws(()=>store.essays.image(o,sub.id,0),e=>e.status===404);assert.throws(()=>store.essays.review(p,sub.id,{score:10,comment:'x'}),e=>e.status===403);
 const failed=await store.essays.grade(s,sub.id,async()=>{throw Object.assign(Error('Temporary failure'),{status:502});});assert.equal(failed.status,'ai_failed');assert.equal(failed.images.length,1);
 let calls=0;const grader=async input=>{calls++;await new Promise(r=>setTimeout(r,10));return mockGrade(input);};await Promise.all([store.essays.grade(s,sub.id,grader),store.essays.grade(s,sub.id,grader)]);assert.equal(calls,1);
 assert.equal(store.knowledge.report(p,s.id).mistakes[0].provisional,true);
 store.essays.review(t,sub.id,{score:5,comment:'Chưa chia hai vế cho 2.',missingKnowledge:'Phương trình bậc nhất',nextStep:'Chia hai vế cho 2 và thay nghiệm kiểm tra.'});
 const correction=await store.essays.submit(s,a.id,{questionId:q.id,working:'2x=4 nên x=2; kiểm tra 2*2+1=5.',photos:[],requestId:crypto.randomUUID()});
 await store.essays.grade(s,correction.id,async()=>({...mockGrade({working:'x=2'}),score:10}));
 assert.equal(store.knowledge.report(s).mistakes[0].resolved,false);
 assert.equal(store.knowledge.leaderboard(s,f.c.id).top.length,0);
 store.essays.review(t,correction.id,{score:10,comment:'Đã sửa đúng và kiểm chứng.'});
 assert.equal(store.knowledge.leaderboard(s,f.c.id).top[0].corrected,1);
 const k=store.knowledge.report(t,s.id);assert.equal(k.mistakes[0].resolved,true);assert.equal(k.history.find(h=>h.id===sub.id).score,5);assert.equal(k.history.find(h=>h.id===correction.id).score,10);
 const reopened=createStore(f.file);assert.equal(reopened.knowledge.report(p,s.id).history.length,2);assert.equal(reopened.essays.image(s,sub.id,0).length,store.essays.image(s,sub.id,0).length);
 const snapshot=studentReportSnapshot({db:JSON.parse(fs.readFileSync(f.file,'utf8')),learning:store.learning,teacher:t,studentId:s.id});assert.equal(snapshot.knowledge.history.length,2);const pdf=await reportPdf({id:'report',createdAt:Date.now(),teacher:t,reports:[snapshot]});assert.ok(pdf.length>15000);
 assert.equal((await readSource(f.file)).files.length,1);const imagePath=path.join(f.dir,'uploads',sub.images[0].fileKey);fs.writeFileSync(imagePath,'corrupt');await assert.rejects(readSource(f.file),/essay image is missing or damaged/);
 }finally{f.close();}
});
test('math formatting preserves explicit LaTeX and dates, formats AI arithmetic, and supports Vietnamese labels',()=>{
 assert.equal(formatMathText('Ngày 2026-10-14; \\(x=2\\).'),'Ngày 2026-10-14; \\(x=2\\).');
 assert.match(formatMathText('Từ 2x=4, cần tính x=4/2.'),/\\\(.*\\frac\{4\}\{2\}.*\\\)/);
 assert.doesNotThrow(()=>validateMath('Diện tích \\(S_{\\text{đáy}}=6^2\\).'));
 assert.throws(()=>validateMath('Sai \\(\\unknowncommand\\).'));
});
test('essay management preserves reviewed work, excludes withdrawn missing work and creates an independent round',async()=>{
 const f=fixture();try{const {store,s,t,a,q}=f;
 assert.throws(()=>store.essays.manage(s,a.id,{withdrawn:true}),{status:403});
 assert.throws(()=>store.essays.manage(t,a.id,{due:''}),{status:400});
 store.essays.manage(t,a.id,{withdrawn:true});assert.throws(()=>store.essays.start(s,a.id),{status:409});
 assert.equal(store.knowledge.report(s).pending.length,0);assert.equal(store.learning.report(t,s.id).assignments.length,0);
 store.essays.manage(t,a.id,{withdrawn:false,due:'2026-12-30'});store.essays.start(s,a.id);
 const sub=await store.essays.submit(s,a.id,{questionId:q.id,working:'2x=4; x=2',photos:[],requestId:crypto.randomUUID()});
 assert.equal(store.learning.report(t,s.id).assignments[0].result.score,null);
 store.essays.review(t,sub.id,{score:10,comment:'Đã kiểm tra đầy đủ.'});store.essays.manage(t,a.id,{withdrawn:true});
 assert.equal(store.learning.report(t,s.id).assignments[0].result.score,10);
 const next=store.essays.manage(t,a.id,{action:'clone',title:'Đợt tiếp theo',due:'2027-01-01'});
 assert.equal(store.essays.details(s,next.id).submissions.length,0);assert.equal(store.essays.details(s,a.id).submissions[0].review.score,10);
 }finally{f.close();}
});
test('MCQ incorrect questions are individually saved; repairs never change original grade; homework remains pending',()=>{
 const f=fixture();try{const {store,s,t,p,o,c}=f;const questions=Array.from({length:10},(_,i)=>({prompt:`Tính \\(${i}+1\\).`,choices:['0','1','2','3'],correctIndex:1,explanation:'Áp dụng phép cộng.',source:'Fixture',topic:'Phép cộng',knowledge:'Cộng số tự nhiên.'}));
 const e=store.exams.publish(t,{classId:c.id,title:'10 câu',durationMinutes:30,questions});let v=store.exams.start(s,e.id);
 for(let i=0;i<10;i++)v=store.exams.answer(s,e.id,{questionIndex:i,choiceIndex:i<7?1:0,version:v.attempt.version});
 const result=store.exams.submit(s,e.id);assert.equal(result.attempt.score,7);assert.deepEqual(result.attempt.wrongQuestionIndexes,[7,8,9]);
 let report=store.knowledge.report(s);assert.equal(report.mistakes.length,3);assert.equal(report.pending.length,1);
 assert.throws(()=>store.knowledge.report(o,s.id),e=>e.status===403);assert.throws(()=>store.knowledge.repair(p,{key:report.mistakes[0].key,choiceIndex:1,working:'Sửa đúng'}),e=>e.status===403);
 assert.equal(store.knowledge.leaderboard(s,c.id).top.length,0);
 store.knowledge.repair(s,{key:report.mistakes[0].key,choiceIndex:1,working:'Em cộng lại từng số và kiểm tra.'});
 const fixed=store.knowledge.repair(s,{key:report.mistakes[0].key,choiceIndex:1,working:'Em kiểm chứng lại cùng câu đã sửa.'});
 assert.equal(store.knowledge.leaderboard(s,c.id).top.length,0);
 const approval={studentId:s.id,key:fixed.key,repairId:fixed.id,approved:true,comment:'Cách làm đúng và có kiểm chứng.'};
 assert.throws(()=>store.knowledge.reviewRepair(s,approval),{status:403});
 assert.throws(()=>store.knowledge.reviewRepair({...t,id:'other-teacher'},approval),{status:404});
 store.knowledge.reviewRepair(t,approval);
 assert.equal(store.knowledge.leaderboard(s,c.id).top[0].corrected,1);
 report=store.knowledge.report(p,s.id);assert.equal(report.mistakes.filter(m=>!m.resolved).length,2);assert.equal(store.exams.get(s,e.id).attempt.score,7);assert.equal(createStore(f.file).knowledge.report(s).mistakes.filter(m=>!m.resolved).length,2);
 store.knowledge.reviewRepair(t,{...approval,approved:false,comment:'Cần kiểm chứng thêm cách sửa.'});
 assert.equal(store.knowledge.leaderboard(s,c.id).top.length,0);
 assert.equal(store.knowledge.report(s).mistakes.find(m=>m.key===fixed.key).repairs.at(-1).reviewHistory.length,1);
 }finally{f.close();}
});
test('unreadable AI grades do not invent a score; parser rejects unsupported evidence, scores and malformed math',async()=>{
 const q={...question,rubric:question.rubric.map((r,i)=>({...r,id:'r'+i}))};
 const value={readable:false,transcription:'',confidence:0,summary:'Ảnh mờ.',criteria:q.rubric.map(r=>({id:r.id,earned:0,evidence:'',reason:'Không đọc được.',missingKnowledge:'Chưa đủ dữ liệu.',nextStep:'Chụp rõ hơn.'}))};
 const call=v=>gradeEssay({question:q,working:'',images:[],key:'mock',fetcher:async()=>({ok:true,json:async()=>({candidates:[{content:{parts:[{text:JSON.stringify(v)}]}}]})})});
 assert.equal((await call(value)).score,null);
 await assert.rejects(call({...value,criteria:value.criteria.map(c=>({...c,earned:11}))}),e=>e.status===502);
 await assert.rejects(call({...value,criteria:value.criteria.map(c=>({...c,evidence:'Bằng chứng bịa'}))}),e=>e.status===502);
 await assert.rejects(call({...value,summary:'\\(\\notacommand\\)'}),e=>e.status===502);
});
test('teacher input and image limits are validated before storing; revocation during AI request prevents result publication',async()=>{
 const f=fixture();try{const {store,s,t,a,q}=f;store.essays.start(s,a.id);
 await assert.rejects(store.essays.submit(s,a.id,{questionId:q.id,working:'',photos:[{base64:Buffer.from('<svg/>').toString('base64')}],requestId:crypto.randomUUID()}),e=>e.status===400);
 assert.throws(()=>store.essays.publish(t,{classId:f.c.id,title:'Bad math',due:'2026-12-31',customQuestions:[{...question,prompt:'\\(\\unknowncommand\\)'}]}),e=>e.status===400);
 const sub=await store.essays.submit(s,a.id,{questionId:q.id,working:'2x=4; x=4',photos:[],requestId:crypto.randomUUID()});
 const admin=store.createUser({username:'admin',name:'Admin',role:'admin',password:'Admin-test-12345!'});
 await assert.rejects(store.essays.grade(s,sub.id,async input=>{store.link(admin,{userId:t.id,studentIds:[]});return mockGrade(input);}),e=>e.status===404);
 }finally{f.close();}
});
