import {test} from 'node:test';
import assert from 'node:assert/strict';
import {studentAnalytics} from '../public/student-analytics.js';
import {createStore} from '../auth-store.mjs';
import {learningAI} from '../learning-ai.mjs';

test('radar combines observed skills by domain and distinguishes missing evidence from zero',()=>{
 const r={total:10,correct:7,bySkill:[{name:'Phép phân phối',correct:2,attempts:4},{name:'Bình phương một tổng',correct:3,attempts:3},{name:'Xác suất',correct:0,attempts:3},{name:'Số nguyên',correct:0,attempts:0}],assignments:[{result:{score:8,complete:true}},{result:{score:10,complete:false}},{result:{score:9,complete:true,provisional:true}}]};
 const a=studentAnalytics(r,{totalMs:120000},[{time:Date.parse('2026-10-10T18:00:00Z'),initialCorrect:true}]);
 assert.deepEqual(a.radar.find(a=>a.id==='algebra'),{id:'algebra',label:'Biểu thức đại số',correct:5,total:7,percent:71});
 assert.equal(a.radar.find(a=>a.id==='statistics').percent,0);
 assert.equal(a.radar.find(a=>a.id==='geometry').percent,null);
 assert.equal(a.average,8);assert.equal(a.minutes,2);assert.equal(a.trend[0].day,'2026-10-11');
});

test('AI gets graded exam evidence, scores and observed skills for only the selected class',()=>{
 const db={users:[{id:'t',username:'teacher',role:'teacher',studentIds:['s','s2']},{id:'s',name:'An',role:'student'},{id:'s2',name:'Bình',role:'student'}],states:Object.fromEntries(['s','s2'].map(id=>[id,{profile:{name:id,grade:'8'},attempts:[],assignments:[],reviews:{},notes:{}}])),classes:[{id:'c',teacherId:'t',name:'8A',grade:8,studentIds:['s']},{id:'c2',teacherId:'t',name:'8B',grade:8,studentIds:['s2']}],exams:[{id:'e',teacherId:'t',classId:'c',grade:8,title:'Đề đại số',createdAt:1,questions:[{prompt:'2x=4. Tìm x.',choices:['1','2','3','4'],correctIndex:1,explanation:'Chia hai vế cho 2.',topic:'Phương trình bậc nhất'}]}],examAttempts:[{id:'a',examId:'e',studentId:'s',startedAt:10,submittedAt:100,answers:[0],score:0,correct:0}],usage:{s:{startedAt:10,totalMs:120000,days:{'2026-10-01':120000}}}};
 const store=createStore(undefined,{storage:{load:()=>structuredClone(db),save(){},checkHealth(){},close(){}}});
 const t=db.users[0],data=store.learning.insightContext(t,{scope:'class',classId:'c'});
 assert.equal(data.students.length,1);assert.equal(data.className,'8A');
 const s=data.students[0];assert.equal(s.total,1);assert.equal(s.assignments[0].result.score,0);
 assert.equal(s.evidence[0].prompt,'2x=4. Tìm x.');assert.equal(s.evidence[0].correctAnswer,'2');
 assert.ok(s.skills.every(k=>k.attempts>0));assert.equal(s.analytics.minutes,2);
 assert.equal(s.analytics.radar.find(a=>a.id==='equations').percent,0);
 const personal=store.learning.insightContext(t,{scope:'student',studentId:'s'});assert.equal(personal.assessments.questions,1);
 assert.throws(()=>store.learning.insightContext({...t,id:'other',studentIds:[]},{scope:'class',classId:'c'}),e=>e.status===404);
});

test('AI request excludes internal revision snapshots and reserves room for structured output',async()=>{
 let body;
 await learningAI({key:'isolated-key',model:'gemini-2.5-flash',task:'insight',data:{scope:'student',studentId:'private-id',revision:'large-internal-snapshot',total:10,candidates:[]},fetcher:async(url,options)=>{body=JSON.parse(options.body);return {ok:true,json:async()=>({candidates:[{content:{parts:[{text:JSON.stringify({summary:'Phân tích theo điểm và bằng chứng.',actions:[],exerciseIds:[]})}]}}]})};}});
 const data=JSON.parse(body.contents[0].parts[0].text);
 assert.equal(data.revision,undefined);assert.equal(data.studentId,undefined);assert.equal(data.total,10);
 assert.equal(body.generationConfig.thinkingConfig.thinkingBudget,1024);
 assert.ok(body.generationConfig.maxOutputTokens>body.generationConfig.thinkingConfig.thinkingBudget);
});
