import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs';
import {createStore} from '../auth-store.mjs';

async function textOf(buffer){
  const task=getDocument({data:new Uint8Array(buffer),useSystemFonts:false}),pdf=await task.promise;
  let text='';for(let i=1;i<=pdf.numPages;i++){const page=await pdf.getPage(i);text+=(await page.getTextContent()).items.map(item=>item.str).join(' ')+'\n';}
  await task.destroy();return text;
}
async function fixture(t){
  const dir=await mkdtemp(path.join(os.tmpdir(),'math-parent-report-'));t.after(()=>rm(dir,{recursive:true,force:true}));
  const filename=path.join(dir,'accounts.json'),store=createStore(filename),password='Report-test-only-123!';
  const add=(username,name,role,studentIds=[])=>store.createUser({username,name,role,studentIds,password});
  const student=add('student','Nguyễn Ánh Minh','student'),other=add('other','PRIVATE OTHER CHILD','student');
  const teacher=add('teacher','Cô Nguyễn Thị Lan','teacher',[student.id]),foreign=add('foreign','OTHER TEACHER','teacher',[other.id]);
  const parent=add('parent','Phụ huynh Minh','parent',[student.id,other.id]),admin=add('admin','Admin','admin');
  store.learning.updateParentEmail(admin,{userId:parent.id,email:'parent@example.com'});
  store.saveStudent(student,{attempts:[],reviews:{},profile:{name:student.name,grade:'7'}});
  const created=Date.now()-20000;
  store.assign(teacher,{studentId:student.id,title:'Kiểm tra dấu',skill:'sign',due:'2026-12-31'});
  const db=JSON.parse(await readFile(filename,'utf8'));db.states[student.id].assignments[0].created=created;
  // Populate a known past learning timeline and recorded activity duration.
  const first={id:'11111111-1111-1111-1111-111111111111',exerciseId:'sign-1',skill:'sign',time:created+100,mode:'practice',answer:'999',initialCorrect:false,working:'Em tính -3 + 7 = 999.',correction:'4',corrected:true,revisedWorking:'Lấy 7 trừ 3 được 4.',explanation:'Hai số khác dấu nên lấy giá trị tuyệt đối lớn trừ nhỏ.',completed:created+200};
  db.states[student.id].attempts=[first,{id:'22222222-2222-2222-2222-222222222222',exerciseId:'sign-2',skill:'sign',time:created+300,mode:'transfer',answer:'12',initialCorrect:true,working:'Âm nhân âm là dương.'},{id:'33333333-3333-3333-3333-333333333333',exerciseId:'sign-3',skill:'sign',time:created+400,mode:'practice',answer:'3',initialCorrect:false,working:'Em bỏ dấu ngoặc.'}];
  db.usage={[student.id]:{startedAt:created,totalMs:90000,days:{'2026-10-08':90000},lastCreditedAt:created+90000}};
  db.diagnoses={[student.id]:{[first.id]:{type:'sign',status:'confirmed',source:'teacher',teacherId:teacher.id,updatedAt:created+250,evidence:'-3 + 7 = 999',reason:'Chưa áp dụng quy tắc cộng hai số khác dấu.',nextStep:'So sánh giá trị tuyệt đối trước khi tính.'},'33333333-3333-3333-3333-333333333333':{type:'equivalence',status:'pending',source:'gemini',updatedAt:created+500,evidence:'Em bỏ dấu ngoặc.',reason:'Có thể quên đổi dấu khi bỏ ngoặc.',nextStep:'Kiểm tra dấu trừ trước ngoặc.'}}};
  const {writeFile}=await import('node:fs/promises');await writeFile(filename,JSON.stringify(db));
  const loaded=createStore(filename),sent=[],mailer={status:()=>({configured:true}),send:async value=>sent.push(value)};
  const service=loaded.learning.enableParentMail(mailer);
  const input={studentId:student.id,subject:'Bảng điểm học tập',message:'Mời gia đình xem báo cáo đính kèm.',includeReport:true,teacherComment:'Con cần kiểm tra dấu và giải thích từng bước trước khi kết luận.'};
  return {filename,loaded,service,sent,mailer,input,student,other,teacher,foreign,parent,admin};
}

test('Vietnamese PDF includes scores, duration, full history, error evidence, unknown AI status and actual teacher approval; delivered bytes are immutable',async t=>{
  const f=await fixture(t),draft=f.service.preview(f.teacher,f.input),recipient=draft.recipients[0];
  const unapproved=await f.service.pdf(f.teacher,draft.id,recipient.id);
  const originalText=await textOf(unapproved.content);
  assert.match(originalText,/Nguyễn Ánh Minh/);assert.match(originalText,/1,5 phút/);
  assert.match(originalText,/Kiểm tra dấu/);assert.match(originalText,/Chỗ sai \/ dẫn chứng/);
  assert.match(originalText,/Chưa áp dụng quy tắc cộng hai số khác dấu/);
  assert.match(originalText,/AI đề xuất/);assert.match(originalText,/BẢN NHÁP/);
  assert.doesNotMatch(originalText,/PRIVATE OTHER CHILD|OTHER TEACHER/);
  assert.throws(()=>f.service.send(f.teacher,draft.id),{status:409});
  await assert.rejects(f.service.approve(f.teacher,draft.id,false),{status:400});
  const approved=await f.service.approve(f.teacher,draft.id,true);
  assert.equal(approved.approval.teacherId,f.teacher.id);assert.equal(f.sent.length,0);
  const signed=await f.service.pdf(f.teacher,draft.id,recipient.id),signedText=await textOf(signed.content);
  assert.match(signedText,/ĐÃ ĐƯỢC GIÁO VIÊN XÁC NHẬN/);assert.match(signedText,/Cô Nguyễn Thị Lan/);
  assert.match(signedText,/AI đề xuất/);assert.doesNotMatch(JSON.stringify(approved),/base64|Em tính -3/);
  // Changes after preview must not alter the approved snapshot.
  f.loaded.note(f.teacher,{studentId:f.student.id,attemptId:'11111111-1111-1111-1111-111111111111',text:'NEW NOTE AFTER SNAPSHOT'});
  assert.deepEqual((await f.service.pdf(f.teacher,draft.id,recipient.id)).content,signed.content);
  f.service.send(f.teacher,draft.id);await f.service.flush();
  assert.equal(f.sent.length,1);assert.deepEqual(f.sent[0].attachments[0].content,signed.content);
  assert.doesNotMatch(JSON.stringify(f.service.history(f.teacher)),/base64|NEW NOTE/);
  const restarted=createStore(f.filename).learning.enableParentMail(f.mailer);
  assert.deepEqual((await restarted.pdf(f.teacher,draft.id,recipient.id)).content,signed.content);
  await restarted.flush();assert.equal(f.sent.length,1);
});

test('PDF privacy is rechecked for downloads, approvals and queued sends',async t=>{
  const f=await fixture(t),draft=f.service.preview(f.teacher,f.input),recipient=draft.recipients[0];
  for(const user of [f.parent,f.student,f.admin,f.foreign])await assert.rejects(f.service.pdf(user,draft.id,recipient.id));
  await assert.rejects(f.service.approve(f.foreign,draft.id,true),{status:404});
  await f.service.approve(f.teacher,draft.id,true);const batch=f.service.send(f.teacher,draft.id);
  f.loaded.link(f.admin,{userId:f.teacher.id,studentIds:[]});
  await assert.rejects(f.service.pdf(f.teacher,draft.id,recipient.id),{status:409});
  await f.service.flush();assert.equal(batch.recipients[0].status,'skipped');assert.equal(f.sent.length,0);
});

test('legacy data has no invented activity minutes; report signature requires a teacher comment',async t=>{
  const f=await fixture(t);
  const d=f.service.preview(f.teacher,{...f.input,teacherComment:''});
  await assert.rejects(f.service.approve(f.teacher,d.id,true),{status:400});
  const source=JSON.parse(await readFile(f.filename,'utf8'));delete source.usage;
  const {writeFile}=await import('node:fs/promises');await writeFile(f.filename,JSON.stringify(source));
  const fresh=createStore(f.filename).learning.enableParentMail(f.mailer),draft=fresh.preview(f.teacher,f.input);
  const pdf=await fresh.pdf(f.teacher,draft.id,draft.recipients[0].id);
  assert.match(await textOf(pdf.content),/Thời gian trên app: chưa có dữ liệu/);
});

test('revocation during PDF generation prevents recording a teacher approval',async t=>{
  const f=await fixture(t),draft=f.service.preview(f.teacher,f.input);
  const pending=f.service.approve(f.teacher,draft.id,true);
  f.loaded.link(f.admin,{userId:f.teacher.id,studentIds:[]});
  await assert.rejects(pending,{status:409});
  const stored=JSON.parse(await readFile(f.filename,'utf8'));
  assert.equal(stored.parentReports[draft.id],undefined);assert.equal(f.sent.length,0);
});

test('framed tables repeat headers and retain all lines when one explanation spans pages',async t=>{
  const f=await fixture(t),source=JSON.parse(await readFile(f.filename,'utf8'));
  source.states[f.student.id].attempts[0].working=Array.from({length:95},(_,i)=>`Bước ${String(i+1).padStart(3,'0')}: kiểm tra dấu.`).join('\n');
  const {writeFile}=await import('node:fs/promises');await writeFile(f.filename,JSON.stringify(source));
  const service=createStore(f.filename).learning.enableParentMail(f.mailer),draft=service.preview(f.teacher,f.input);
  const result=await service.pdf(f.teacher,draft.id,draft.recipients[0].id);
  const content=await textOf(result.content);
  for(let i=1;i<=95;i++)assert.ok(content.includes(`Bước ${String(i).padStart(3,'0')}`));
  assert.ok((content.match(/Bài 1\./g)||[]).length>=2);
  assert.match(content,/Nhận xét gửi gia đình/);
  const task=getDocument({data:new Uint8Array(result.content)}),pdf=await task.promise;
  assert.ok(pdf.numPages>=4&&pdf.numPages<15);
  for(let p=1;p<=pdf.numPages;p++){
    const page=await pdf.getPage(p),items=(await page.getTextContent()).items;
    for(const item of items.filter(i=>i.str?.trim())){
      assert.ok(item.transform[4]>=27&&item.transform[4]+item.width<=page.view[2]-26,`Text outside horizontal frame on page ${p}: ${item.str}`);
      assert.ok(item.transform[5]>=26&&item.transform[5]<=page.view[3]-26,`Text outside vertical frame on page ${p}: ${item.str}`);
    }
  }
  await task.destroy();
});
