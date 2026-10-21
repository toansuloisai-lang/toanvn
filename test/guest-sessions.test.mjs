import test from 'node:test';
import assert from 'node:assert/strict';
import {createGuestSessions} from '../guest-sessions.mjs';
test('anonymous sessions isolate users, expose only same-grade system questions and expire without persistent accounts',()=>{
 let now=Date.now();const guests=createGuestSessions({now:()=>now}),a=guests.start('a',8),b=guests.start('b',7);
 const first=guests.get(a.token),second=guests.get(b.token),u=first.authenticate(a.token),other=second.authenticate(b.token);
 assert.equal(a.user.guest,true);assert.equal(first.workspace(u).state.profile.grade,'8');assert.equal(second.workspace(other).state.profile.grade,'7');
 assert.equal(first.authenticate(b.token),null);
 const bank=first.virtualTeacher.practiceBank(u);assert.equal(bank.grade,8);assert.ok(bank.questions.length>100);assert.ok(bank.questions.every(q=>!q.answer&&!q.solution&&!q.correctIndex));
 const result=first.virtualTeacher.practiceQuestion(u,{questionId:bank.questions[0].id,type:bank.questions[0].formats[0]});
 const detail=first.library.start(u,result.id);assert.equal(detail.questions.length,1);assert.equal(detail.questions[0].solution,undefined);
 assert.throws(()=>second.library.detail(other,result.id),e=>e.status===404);
 for(let i=0;i<30;i++)guests.allowAI(a.token);assert.throws(()=>guests.allowAI(a.token),e=>e.status===429);
 assert.ok(first.virtualTeacher.practiceBank(u).questions.length);guests.allowAI(b.token);
 now+=2*3600000+1;assert.equal(guests.get(a.token),undefined);assert.equal(guests.get(b.token),undefined);
 assert.throws(()=>guests.start('c',10),e=>e.status===400);
});
