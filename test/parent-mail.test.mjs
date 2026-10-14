import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createParentMailService} from '../parent-mail.mjs';
import {createGmailMailer} from '../gmail-mailer.mjs';
function fixture({configured=true,send,persist=()=>{},db,knowledge,total=5}={}){
 const teacher={id:'t1',name:'Cô Lan',role:'teacher',studentIds:['s1','s2','s3']};
 db??={users:[teacher,{id:'t2',role:'teacher',studentIds:['s4']},...['s1','s2','s3','s4'].map(id=>({id,name:'Học sinh '+id,role:'student'})),{id:'p1',role:'parent',name:'Phụ huynh 1',email:'one@example.com',studentIds:['s1','s2','s4']},{id:'p2',role:'parent',name:'Phụ huynh 2',studentIds:['s3']}],classes:[{id:'c1',teacherId:'t1',studentIds:['s1','s2','s3']}]};
 const sent=[],mailer={status:()=>({configured,sender:'sender@example.com'}),send:async mail=>{sent.push(mail);if(send)await send(mail);}},learning={knowledge,classes:user=>db.classes.filter(c=>c.teacherId===user.id),report:(user,id)=>({grade:9,total,correct:total?3:0,assignments:[]})};
 const service=createParentMailService({db,persist,learning,mailer});return {db,teacher:db.users[0],service,sent};
}
const input={classId:'c1',subject:'Kết quả tuần',message:'Nhờ gia đình hỗ trợ ôn tập.',includeReport:false};
test('Email is a short letter directing parents to the PDF instead of embedding grades',()=>{
 const f=fixture({total:0,knowledge:{report:()=>({history:[{kind:'exam',title:'Đề số 1',score:7,questions:[{correct:true},{correct:false}]},{kind:'essay',provisional:true}]})}});
 const draft=f.service.preview(f.teacher,{...input,includeReport:true});
 const text=draft.recipients[0].text;
 assert.match(text,/báo cáo PDF đính kèm/);assert.doesNotMatch(text,/7\/10|KẾT QUẢ HỌC TẬP|Chưa có dữ liệu bài làm|0\/0/);
 assert.doesNotMatch(draft.recipients[0].html,/<table|<img|cid:|linear-gradient/);assert.match(text,/Trân trọng/);
});
test('Private per-parent messages group siblings, exclude other teacher child, report missing emails and deduplicate confirmation',async()=>{
 const f=fixture(),reportInput={...input,includeReport:true,teacherComment:'Gia đình cùng hỗ trợ con ôn tập.'},d=f.service.preview(f.teacher,reportInput);assert.equal(d.recipients.length,1);assert.deepEqual(d.missing,['Học sinh s3']);
 assert.match(d.recipients[0].text,/Học sinh s1/);assert.match(d.recipients[0].text,/Học sinh s2/);assert.doesNotMatch(d.recipients[0].text,/s4/);assert.ok(d.recipients[0].text.includes("PDF"));
 assert.equal(f.sent.length,0);await f.service.approve(f.teacher,d.id,true);const b=f.service.send(f.teacher,d.id);assert.equal(f.service.send(f.teacher,d.id).id,b.id);
 await f.service.flush();assert.equal(f.sent.length,1);assert.equal(b.recipients[0].status,'sent');
 const duplicate=f.service.preview(f.teacher,reportInput);await f.service.approve(f.teacher,duplicate.id,true);assert.equal(f.service.send(f.teacher,duplicate.id).id,b.id);
 assert.deepEqual(f.service.history(f.db.users[1]),[]);
});
test('Only linked students and teacher-owned drafts can send; missing Gmail does not send',()=>{
 const f=fixture(),d=f.service.preview(f.teacher,input);
 for(const role of ['student','parent','admin'])assert.throws(()=>f.service.options({role}),{status:403});
 assert.throws(()=>f.service.preview(f.teacher,{...input,classId:'foreign'}),{status:404});
 assert.throws(()=>f.service.preview(f.teacher,{...input,classId:'',studentId:'s4'}),{status:400});
 assert.throws(()=>f.service.send(f.db.users[1],d.id),{status:404});
 f.db.users.find(u=>u.id==='p1').email='changed@example.com';assert.throws(()=>f.service.send(f.teacher,d.id),{status:409});
 const no=fixture({configured:false}),draft=no.service.preview(no.teacher,input);assert.throws(()=>no.service.send(no.teacher,draft.id),{status:503});assert.equal(no.db.parentMail.length,0);
 assert.equal(createGmailMailer({}).status().configured,false);
});
test('Reject invalid content, header injection, missing recipient; queue persistence must precede delivery',async()=>{
 const f=fixture();assert.throws(()=>f.service.preview(f.teacher,{...input,subject:'Hi\r\nBcc: victim@example.com'}),{status:400});
 assert.throws(()=>f.service.preview(f.teacher,{...input,classId:'',studentId:'s3'}),{status:400});
 const broken=fixture({persist:()=>{throw Error('disk full');}}),d=broken.service.preview(broken.teacher,input);assert.throws(()=>broken.service.send(broken.teacher,d.id),/disk full/);
 await broken.service.flush();assert.equal(broken.sent.length,0);assert.equal(broken.db.parentMail.length,0);
});
test('Rejected and ambiguous sends are never automatically retried, including after restart',async()=>{
 for(const [code,status] of [['EAUTH','failed'],['ETIMEDOUT','unknown']]){
   const f=fixture({send:()=>{throw Object.assign(Error('sensitive upstream text'),{code});}}),d=f.service.preview(f.teacher,input);f.service.send(f.teacher,d.id);await f.service.flush();
   assert.equal(f.service.history(f.teacher)[0].recipients[0].status,status);assert.doesNotMatch(JSON.stringify(f.service.history(f.teacher)),/sensitive upstream/);
   await f.service.flush();assert.equal(f.sent.length,1);
   const restarted=fixture({db:structuredClone(f.db)});await restarted.service.flush();assert.equal(restarted.sent.length,0);
 }
 const f=fixture(),d=f.service.preview(f.teacher,input),b=f.service.send(f.teacher,d.id);b.recipients[0].status='sending';
 const restarted=fixture({db:structuredClone(f.db)});await restarted.service.flush();assert.equal(restarted.sent.length,0);assert.equal(restarted.service.history(restarted.teacher)[0].recipients[0].status,'unknown');
});
test('Pending messages recheck current parent relationships and quota',async()=>{
 const f=fixture(),d=f.service.preview(f.teacher,input),b=f.service.send(f.teacher,d.id);f.teacher.studentIds=[];await f.service.flush();assert.equal(b.recipients[0].status,'skipped');assert.equal(f.sent.length,0);
 const g=fixture();g.db.parentMail.push({id:'old',teacherId:'t1',created:Date.now(),recipients:Array.from({length:300},()=>({status:'sent'}))});
 const next=g.service.preview(g.teacher,input);assert.throws(()=>g.service.send(g.teacher,next.id),{status:429});
});
