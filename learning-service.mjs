import {atomic} from './database/atomic.mjs';
import {studentAnalytics} from './public/student-analytics.js';
import {assessmentRollup,mergeAssessmentReport,realRow} from './assessment-rollup.mjs';
import {mergePhotoAssignmentScores} from './modern-assessments.mjs';
import {randomUUID} from 'node:crypto';
import {studentCatalog,teacherCatalog,validDue} from './learning-access.mjs';
import {createActivityService} from './activity-service.mjs';
import {parentSummary} from './parent-summary.mjs';
import {skills} from './public/data.js';
import {createUsageService} from './usage-service.mjs';
import {errorTypes,personalReport,recommend,resolvedAssignments} from './public/learning-core.js';
const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
const text=(v,max)=>typeof v==='string'&&v.trim().length>0&&v.length<=max;
export function createLearningService({db,persist,student}){
 db.diagnoses??={};db.classes??=[];db.learningInsights??={};
 const activities=createActivityService({db,persist,student});
 const usage=createUsageService({db,persist});
 function requireTeacher(user){if(user.role!=='teacher')fail(403,'Chỉ giáo viên được dùng chức năng này.');}
 function catalog(id){return studentCatalog(db,id);}
 function diagnoses(id){return db.diagnoses[id]||{};}
 function insightKey(user,id){return user.role+':'+user.id+':'+id;}
 function revision(id,user){const state=db.states[id];return JSON.stringify([3,user?.role,user?.id,assessmentRollup(db,id,{teacherId:user?.role==='teacher'?user.id:undefined}),state.profile?.grade||7,state.attempts.length,state.assignments.map(a=>[a.id,a.created]),catalog(id).map(e=>e.id),state.attempts.reduce((n,a)=>Math.max(n,a.completed||0),0),Object.values(diagnoses(id)).reduce((n,d)=>Math.max(n,d.updatedAt||0),0)]);}
 function reportingState(id,user){const state=db.states[id];return {...state,attempts:[...state.attempts.filter(realRow),...assessmentRollup(db,id,{teacherId:user?.role==='teacher'?user.id:undefined}).samples]};}
 function report(user,id){const target=student(user,id),state={...db.states[target],attempts:db.states[target].attempts.filter(realRow)},list=catalog(target),grade=Number(state.profile?.grade||7),result=personalReport(user.role==='teacher'?{...state,assignments:state.assignments.filter(a=>a.teacherId===user.id)}:state,list,diagnoses(target));mergePhotoAssignmentScores(state,result.assignments);result.bySkill=result.bySkill.map(s=>({...s,name:skills.find(k=>k.id===s.skill)?.name||db.teacherContents.find(c=>'teacher-'+c.id===s.skill)?.topic||'Nội dung đã học'}));const assessment=assessmentRollup(db,target,{teacherId:user.role==='teacher'?user.id:undefined});mergeAssessmentReport(result,assessment);const analytics=studentAnalytics(result,db.usage?.[target],[...state.attempts,...assessment.samples]);const insight=db.learningInsights[insightKey(user,target)];return{studentId:target,grade,...result,analytics,activities:activities.list(user,target),recommendations:recommend(state,user.role==='teacher'?teacherCatalog(db,user):list,diagnoses(target),grade),insight:insight?.revision===revision(target,user)?insight:null};}
 function classes(user){requireTeacher(user);return db.classes.filter(c=>c.teacherId===user.id).map(c=>({...c,studentIds:c.studentIds.filter(id=>user.studentIds.includes(id))}));}
 function createClass(user,input){
   requireTeacher(user);if(!text(input.name,80)||![6,7,8,9].includes(Number(input.grade))||!Array.isArray(input.studentIds)||!input.studentIds.length||input.studentIds.length>200)fail(400,'Nhập tên lớp, khối và chọn học sinh.');
   if(db.classes.some(c=>c.teacherId===user.id&&c.name.toLocaleLowerCase('vi')===input.name.trim().toLocaleLowerCase('vi')))fail(409,'Tên lớp đã tồn tại. Hãy chọn tên khác.');
   const ids=[...new Set(input.studentIds)];for(const id of ids){student(user,id);if(Number(db.states[id].profile?.grade||7)!==Number(input.grade))fail(400,'Học sinh được chọn phải có khối lớp phù hợp trong hồ sơ.');}
   const item={id:randomUUID(),teacherId:user.id,name:input.name.trim(),grade:Number(input.grade),studentIds:ids};db.classes.push(item);persist();return item;
 }
 function members(user,classId){requireTeacher(user);if(!classId)return [...user.studentIds];const item=classes(user).find(c=>c.id===classId);if(!item)fail(404,'Không tìm thấy lớp của giáo viên.');return item.studentIds;}
 function classReport(user,classId){
   const ids=members(user,classId),rows=ids.map(id=>{const u=db.users.find(u=>u.id===id),r=report(user,id);return{id,name:u.name,...r};});
   const errors=Object.entries(errorTypes).map(([type,label])=>({type,label,students:rows.filter(r=>r.errors.some(e=>e.type===type&&e.count)).map(r=>({id:r.id,name:r.name,...r.errors.find(e=>e.type===type)})),topics:[...new Set(rows.flatMap(r=>r.evidence.filter(a=>a.diagnosis.type===type).map(a=>a.skill)))].map(skill=>({name:skills.find(s=>s.id===skill)?.name||'Nội dung giáo viên',students:rows.filter(r=>r.evidence.some(a=>a.skill===skill&&a.diagnosis.type===type)).length}))}));
   return{classes:classes(user),classId:classId||'',students:rows,errors,catalog:teacherCatalog(db,user),total:rows.length};
 }
 function assignSet(user,input){
   requireTeacher(user);if(!text(input.title,200)||!validDue(input.due)||!Array.isArray(input.exerciseIds)||!input.exerciseIds.length||input.exerciseIds.length>30)fail(400,'Chọn 1–30 câu, nhập tên nhiệm vụ và hạn hoàn thành.');
   const ids=input.classId?members(user,input.classId):[student(user,input.studentId)],exerciseIds=[...new Set(input.exerciseIds)];if(!ids.length)fail(400,'Lớp chưa có học sinh.');
   for(const id of ids){const grade=Number(db.states[id].profile?.grade||7),list=teacherCatalog(db,user);if(exerciseIds.some(eid=>!list.some(e=>e.id===eid&&e.grades.includes(grade))))fail(400,'Bộ câu hỏi phải đúng khối và được phép truy cập cho mọi học sinh được giao.');}
   const assignment={id:randomUUID(),title:input.title.trim(),due:input.due,exerciseIds,created:Date.now(),teacherId:user.id,skill:'exercise-set'};
   for(const id of ids)db.states[id].assignments.push({...assignment});persist();return{assignment,students:ids.length};
 }
 function diagnoseContext(user,input){
   const id=student(user,input.studentId),attempt=db.states[id].attempts.find(a=>a.id===input.attemptId);if(!attempt)fail(404,'Không tìm thấy bài làm.');
   if(user.role==='parent')fail(403,'Phụ huynh chỉ xem báo cáo.');
   if(attempt.initialCorrect)fail(400,'Bài này có đáp án đầu đúng, không gán lỗi từ đáp án.');
   const exercise=catalog(id).find(e=>e.id===attempt.exerciseId);if(!exercise)fail(404,'Nội dung bài không còn khả dụng.');
   return {id,attemptId:attempt.id,working:attempt.working||'',answer:attempt.answer,task:exercise.prompt,expected:exercise.answer,rule:exercise.rule};
 }
 function storeDiagnosis(user,context,value){
   const fresh=diagnoseContext(user,{studentId:context.id,attemptId:context.attemptId});if(fresh.working!==context.working||fresh.answer!==context.answer)fail(409,'Bài làm đã thay đổi, hãy phân tích lại.');
   db.diagnoses[context.id]??={};const old=db.diagnoses[context.id][context.attemptId];if(old?.status==='confirmed')return old;
   const result={...value,updatedAt:Date.now()};db.diagnoses[context.id][context.attemptId]=result;persist();return result;
 }
 function reviewDiagnosis(user,input){
   requireTeacher(user);const context=diagnoseContext(user,input);
   if(!Object.hasOwn(errorTypes,input.type)||!text(input.reason,2500)||!text(input.evidence,2500)||!text(input.nextStep,2500))fail(400,'Chọn loại lỗi, ghi bằng chứng, lý do và hướng khắc phục.');
   const item={type:input.type,evidence:input.evidence,reason:input.reason,nextStep:input.nextStep,status:'confirmed',source:'teacher',teacherId:user.id,updatedAt:Date.now()};
   db.diagnoses[context.id]??={};db.diagnoses[context.id][context.attemptId]=item;persist();return item;
 }
 function insightStudent(user,target,label){
   const r=report(user,target),assessment=assessmentRollup(db,target,{teacherId:user.role==='teacher'?user.id:undefined});
   const state=db.states[target],practice=new Map((state.attempts||[]).filter(realRow).map(a=>[a.id,a]));
   const recent=[...r.evidence].sort((a,b)=>b.time-a.time).slice(0,18).map(a=>({kind:a.kind||'practice',topic:a.topic||a.skill,prompt:a.prompt||a.exercise?.prompt,answer:a.answer,correctAnswer:a.correctAnswer||a.exercise?.answer,solution:a.solution||a.exercise?.rule,working:a.working||practice.get(a.id)?.working||'',corrected:!!a.corrected,diagnosis:a.diagnosis}));
   return {student:label,grade:r.grade,total:r.total,correct:r.correct,analytics:r.analytics,errors:r.errors.filter(e=>e.count).map(({attemptIds,...e})=>e),skills:r.bySkill.filter(s=>s.attempts>0),assignments:r.assignments.map(a=>({title:a.title,kind:a.kind||'practice',result:a.result,due:a.due})),pendingByKind:Object.fromEntries(['practice','exam','essay','library','practice-photo'].map(kind=>[kind,r.assignments.filter(a=>(a.kind||'practice')===kind&&!a.result.complete).length])),comparisons:r.comparisons,evidence:recent,assessments:{questions:assessment.samples.length,correct:assessment.samples.filter(a=>a.initialCorrect).length},activity:db.usage?.[target]?{totalMinutes:r.analytics.minutes,days:db.usage[target].days}:null};
 }
 function insightContext(user,input){
   if(input.scope==='class'){
     requireTeacher(user);
     const r=classReport(user,input.classId),group=classes(user).find(c=>c.id===input.classId);
     return {scope:'class',className:group?.name||'Học sinh được phân công',studentCount:r.total,students:r.students.map((s,i)=>{const value=insightStudent(user,s.id,'HS '+(i+1));return {...value,evidence:value.evidence.slice(0,6)};}),candidates:r.catalog.filter(e=>!group||e.grades.includes(group.grade)).map(e=>({id:e.id,skill:e.skill,prompt:e.prompt})).slice(0,100)};
   }
   const target=student(user,input.studentId);if(user.role==='parent')fail(403,'Phụ huynh chỉ xem báo cáo.');
   const r=report(user,target);
   return {scope:'student',studentId:target,revision:revision(target,user),...insightStudent(user,target,'Học sinh đang xem'),candidates:r.recommendations};
 }

 function saveInsight(user,input,result,expectedRevision){const id=student(user,input.studentId);if(expectedRevision!==revision(id,user))fail(409,'Dữ liệu học tập đã thay đổi trong lúc AI phân tích. Hãy tạo lại gợi ý.');db.learningInsights[insightKey(user,id)]={...result,revision:expectedRevision,updatedAt:Date.now()};persist();return db.learningInsights[insightKey(user,id)];}
 function dashboard(user,{classId='',days=7}={}){
   requireTeacher(user);days=[7,30].includes(Number(days))?Number(days):7;
   const r=classReport(user,classId),now=Date.now(),selected=classes(user).find(c=>c.id===classId),sameGrade=selected?user.studentIds.filter(id=>Number(db.states[id].profile?.grade||7)===selected.grade):[];
   const grouped=new Map(),events=[];
   for(const s of r.students){
     for(const a of s.assignments){if(!grouped.has(a.id))grouped.set(a.id,{id:a.id,title:a.title,due:a.due,created:a.created,students:0,answered:0,total:0});const item=grouped.get(a.id);item.students++;item.answered+=a.result.answered;item.total+=a.result.total;}
     for(const a of reportingState(s.id,user).attempts){events.push({id:a.id,studentId:s.id,name:s.name,time:a.completed||a.time,kind:a.completed?'completed':a.initialCorrect?'answered':'mistake',title:a.prompt||catalog(s.id).find(e=>e.id===a.exerciseId)?.prompt||'Bài đã học'});}
   }
   const assignments=[...grouped.values()];for(const a of assignments)events.push({id:a.id,time:a.created,kind:'assigned',name:'Bạn',title:a.title});
   const total=r.students.reduce((n,s)=>n+s.assignments.reduce((t,a)=>t+a.result.total,0),0),answered=r.students.reduce((n,s)=>n+s.assignments.reduce((t,a)=>t+a.result.answered,0),0);
   function completionAt(ids,time){let total=0,answered=0;for(const id of ids){const state={...db.states[id],attempts:db.states[id].attempts.filter(realRow)};const modern=assessmentRollup(db,id,{teacherId:user.id,until:time});total+=modern.assignments.reduce((n,a)=>n+a.result.total,0);answered+=modern.assignments.reduce((n,a)=>n+a.result.answered,0);for(const a of resolvedAssignments(state,catalog(id)).filter(a=>a.teacherId===user.id&&a.created<=time)){total+=a.exerciseIds.length;answered+=a.exerciseIds.filter(eid=>[...state.attempts,...(state.practicePhotos||[])].some(t=>!t.testRun&&t.exerciseId===eid&&t.time>=a.created&&t.time<=time)).length;}}return total?Math.round(answered/total*100):null;}
   // Calendar days are fixed to the app's classroom timezone, independent of Render's UTC host.
   const day=86400000,offset=7*3600000,start=Math.floor((now+offset)/day)*day-offset;
   const trend=Array.from({length:days},(_,i)=>{const time=start-(days-1-i)*day;return{time,label:new Date(time+offset).toISOString().slice(5,10).split('-').reverse().join('/'),selected:completionAt(r.students.map(s=>s.id),Math.min(now,time+day-1)),grade:sameGrade.length?completionAt(sameGrade,Math.min(now,time+day-1)):null};});
   const topics=[{id:'numbers',name:'Số học',color:'#2f7bff'},{id:'algebra',name:'Đại số',color:'#16bfa6'},{id:'geometry',name:'Hình học',color:'#ffbd42'},{id:'statistics',name:'Thống kê, xác suất',color:'#a36bf4'},{id:'other',name:'Chủ đề khác',color:'#ff7467'}].map(t=>({...t,total:0,correct:0}));
   for(const s of r.students)for(const a of reportingState(s.id,user).attempts){const custom=db.teacherContents.find(c=>'teacher-'+c.id===a.skill),name=custom?.topic||'';const id=/area|angles|pythagoras|trig|circle/.test(a.skill)?'geometry':/sign|fractions|percent|ratio/.test(a.skill)?'numbers':/distribute|combine|equation|identity|roots|systems|quadratic/.test(a.skill)?'algebra':a.skill==='statistics'||/xác suất|thống kê/i.test(name)?'statistics':'other';const t=topics.find(t=>t.id===id);t.total++;if(a.initialCorrect)t.correct++;}
   return{classes:r.classes,selectedClass:classId,className:selected?.name||'Tất cả học sinh',days,totalStudents:r.total,assignedRecently:assignments.filter(a=>a.created>=start-(days-1)*day).length,completion:total?Math.round(answered/total*100):null,attention:r.students.filter(s=>s.errors.some(e=>e.count>0)).length,trend,topics,assignments:assignments.filter(a=>a.answered<a.total).sort((a,b)=>a.due.localeCompare(b.due)),events:events.sort((a,b)=>b.time-a.time).slice(0,12),students:r.students.map(s=>({id:s.id,name:s.name,grade:s.grade,attempts:s.total,correct:s.correct,completion:s.assignments.reduce((n,a)=>n+a.result.total,0)?Math.round(s.assignments.reduce((n,a)=>n+a.result.answered,0)/s.assignments.reduce((n,a)=>n+a.result.total,0)*100):null,score:s.assignments.some(a=>a.result.score!==null)?Math.round(s.assignments.filter(a=>a.result.score!==null).reduce((n,a)=>n+a.result.score,0)/s.assignments.filter(a=>a.result.score!==null).length*10)/10:null,error:s.errors.filter(e=>e.count).sort((a,b)=>b.count-a.count)[0]||null})),errors:r.errors.map(e=>({label:e.label,count:e.students.reduce((n,s)=>n+s.count,0),students:e.students.length})),catalog:r.catalog.map(e=>({id:e.id,prompt:e.prompt,grade:e.grades.join(', ')}))};
 }
 function parentDashboard(user,input={}){
   if(user.role!=='parent')fail(403,'Chỉ phụ huynh được xem tổng quan của con.');
   const children=user.studentIds.map(id=>db.users.find(u=>u.id===id)).filter(Boolean).map(u=>({id:u.id,name:db.states[u.id]?.profile?.name||u.name,grade:Number(db.states[u.id]?.profile?.grade||7)}));
   if(!children.length&&!input.studentId)return{children,child:null};
   const target=student(user,input.studentId),child={...children.find(c=>c.id===target),classes:db.classes.filter(c=>c.studentIds.includes(target)&&db.users.some(u=>u.id===c.teacherId&&u.studentIds.includes(target))).map(c=>c.name)};
   const list=catalog(target).map(e=>({...e,topic:db.teacherContents.find(c=>c.id===e.id)?.topic||''}));
   return parentSummary({state:reportingState(target,user),catalog:[...list,...assessmentRollup(db,target).samples.map(a=>({id:a.exerciseId,prompt:a.prompt,topic:a.topic}))],report:report(user,target),child,children,days:input.days});
 }
 return {usage,activities,catalog,report,classes,createClass:atomic(db,['classes'],createClass),classReport,assignSet:atomic(db,['states'],assignSet),diagnoseContext,storeDiagnosis:atomic(db,['diagnoses'],storeDiagnosis),reviewDiagnosis:atomic(db,['diagnoses'],reviewDiagnosis),insightContext,saveInsight:atomic(db,['learningInsights'],saveInsight),dashboard,parentDashboard};
}
