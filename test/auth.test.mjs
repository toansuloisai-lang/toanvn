import {test,after,before} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
const dir=await mkdtemp(path.join(os.tmpdir(),'math-auth-'));
process.env.MATH_DB_PATH=path.join(dir,'accounts.json');
process.env.MATH_STORAGE='json';
const {server,accounts}=await import('../server.mjs');
let base;
const password='Test-only-password-123!';
const s1=accounts.createUser({username:'student.one',password,name:'Student One',role:'student'});
const s2=accounts.createUser({username:'student.two',password,name:'Student Two',role:'student'});
const teacher=accounts.createUser({username:'teacher.one',password,name:'Teacher',role:'teacher',studentIds:[s1.id]});
accounts.createUser({username:'parent.one',password,name:'Parent',role:'parent',studentIds:[s1.id]});
accounts.createUser({username:'admin.one',password,name:'Admin',role:'admin'});
before(async()=>{await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));base=`http://127.0.0.1:${server.address().port}`;});
after(async()=>{await new Promise(resolve=>server.close(resolve));await rm(dir,{recursive:true,force:true});});
const request=(url,cookie='',method='GET',data,headers={})=>fetch(base+url,{method,headers:{'Content-Type':'application/json',Cookie:cookie,...headers},...(data?{body:JSON.stringify(data)}:{})});
async function login(username){const r=await request('/api/auth/login','','POST',{username,password});assert.equal(r.status,200);assert.match(r.headers.get('set-cookie'),/HttpOnly; SameSite=Strict/);return r.headers.get('set-cookie').split(';')[0];}
test('sessions, role enforcement and student relationships protect server data',async()=>{
  assert.equal((await request('/api/workspace')).status,401);
  assert.equal((await request('/api/auth/login','','POST',{username:'student.one',password:'bad'})).status,401);
  const studentCookie=await login('student.one'),otherCookie=await login('student.two'),teacherCookie=await login('teacher.one'),parentCookie=await login('parent.one'),adminCookie=await login('admin.one');
  for(const cookie of [studentCookie,parentCookie]){
    assert.equal((await request('/api/teacher/assignments',cookie,'POST',{studentId:s1.id,title:'Hack',skill:'sign',due:'2026-10-01'})).status,403);
    assert.equal((await request('/api/teacher/notes',cookie,'POST',{})).status,403);
  }
  for(const cookie of [studentCookie,teacherCookie,parentCookie]){
    assert.equal((await request('/api/admin/users',cookie)).status,403);
    assert.equal((await request('/api/admin/users',cookie,'POST',{username:'hacked',password,name:'Hack',role:'admin'})).status,403);
    assert.equal((await request('/api/admin/links',cookie,'PUT',{userId:teacher.id,studentIds:[s2.id]})).status,403);
    assert.equal((await request('/api/workspace?studentId='+s2.id,cookie)).status,403);
  }
  const input={attempts:[{id:'12345678-1234-1234-1234-123456789012',exerciseId:'sign-1',skill:'sign',time:Date.now(),mode:'practice',answer:'-4',initialCorrect:false,corrected:true,explanation:'Explanation from student one.'}],reviews:{},role:'admin',notes:{fake:'Fake teacher'},assignments:[{title:'Fake assignment'}]};
  assert.equal((await request('/api/student/state',studentCookie,'PUT',input)).status,200);
  assert.equal((await request('/api/student/state',teacherCookie,'PUT',input)).status,403);
  assert.equal((await request('/api/student/state',parentCookie,'PUT',input)).status,403);
  const own=await (await request('/api/workspace',studentCookie)).json();assert.equal(own.user.role,'student');assert.deepEqual(own.state.notes,{});assert.deepEqual(own.state.assignments,[]);
  const other=await (await request('/api/workspace',otherCookie)).json();assert.equal(other.state.attempts.length,0);
  assert.equal((await request('/api/teacher/assignments',teacherCookie,'POST',{studentId:s1.id,title:'Assigned by teacher',skill:'sign',due:'2026-10-01'})).status,200);
  assert.equal((await request('/api/teacher/notes',teacherCookie,'POST',{studentId:s1.id,attemptId:input.attempts[0].id,text:'Teacher feedback'})).status,200);
  const parent=await (await request('/api/workspace',parentCookie)).json();assert.equal(parent.state.assignments.length,1);assert.equal(parent.state.notes[input.attempts[0].id],'Teacher feedback');
  const list=await (await request('/api/admin/users',adminCookie)).json();assert.equal(list.users.length,5);assert.ok(list.users.every(u=>!u.hash&&!u.salt&&!u.password));
  assert.equal((await request('/api/admin/links',adminCookie,'PUT',{userId:teacher.id,studentIds:[]})).status,200);
  assert.equal((await request('/api/workspace?studentId='+s1.id,teacherCookie)).status,403);
  assert.equal((await request('/api/student/state',studentCookie,'PUT',input,{'X-Account-Id':s2.id})).status,409);
  assert.equal((await request('/api/auth/logout',studentCookie,'POST',{}, {Origin:'https://evil.example'})).status,403);
  assert.equal((await request('/api/auth/logout',studentCookie,'POST',{})).status,200);
  assert.equal((await request('/api/workspace',studentCookie)).status,401);
  assert.equal((await request('/private/accounts.json',adminCookie)).status,404);
});
test('repeated invalid login attempts are rate limited',async()=>{
  for(let i=0;i<20;i++)assert.equal((await request('/api/auth/login','','POST',{username:'missing',password:'wrong'})).status,401);
  assert.equal((await request('/api/auth/login','','POST',{username:'student.one',password})).status,429);
});
