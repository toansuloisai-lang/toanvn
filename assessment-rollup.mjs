import {modernAssessments} from './modern-assessments.mjs';
// Read-only projection shared by dashboards and assignment reports.
export const realRow=row=>!row.testRun;
export function assessmentRollup(db,studentId,{teacherId,until=Infinity}={}){
 const assignments=[],samples=[];
 const allowed=a=>a.createdAt<=until&&(!teacherId||a.teacherId===teacherId)&&db.classes.some(c=>c.id===a.classId&&c.teacherId===a.teacherId&&c.studentIds.includes(studentId))&&db.users.some(u=>u.id===a.teacherId&&u.studentIds?.includes(studentId));
 const skillOf=t=>/hình|góc|giác|Thales|Pythagore/i.test(t)?'angles':/xác suất|thống kê|dữ liệu/i.test(t)?'statistics':/tỉ lệ|phân số|số tự nhiên/i.test(t)?'fractions':'equation';
 for(const e of (db.exams||[]).filter(allowed)){
  const a=(db.examAttempts||[]).find(a=>a.examId===e.id&&a.studentId===studentId&&realRow(a)&&a.submittedAt&&a.submittedAt<=until);
  if(e.withdrawn&&!a)continue;
  const questions=a?.questionSnapshots||e.questions;
  assignments.push({id:e.id,kind:'exam',title:e.title,teacherId:e.teacherId,created:e.createdAt,due:e.due||'',href:'#exams/'+e.id,exerciseIds:[],result:{total:questions.length,answered:a?questions.length:0,correct:a?.correct||0,score:a?.score??null,complete:!!a,provisional:false}});
  if(a)questions.forEach((q,i)=>samples.push({id:a.id+':'+i,kind:'exam',exerciseId:e.id+':'+i,skill:skillOf(q.topic||''),topic:q.topic||'Trắc nghiệm',time:a.submittedAt,completed:a.submittedAt,initialCorrect:a.answers[i]===q.correctIndex,answer:q.choices[a.answers[i]]||'Chưa trả lời',prompt:q.prompt,correctAnswer:q.choices[q.correctIndex],solution:q.explanation,href:'#knowledge/'+studentId,mode:'exam'}));
 }
 for(const a of (db.essayAssignments||[]).filter(allowed)){
  let answered=0,correct=0,sum=0,graded=0;
  for(const q of a.questions){
   const first=(db.essaySubmissions||[]).filter(s=>s.assignmentId===a.id&&s.studentId===studentId&&s.questionId===q.id&&realRow(s)&&s.submittedAt<=until).sort((x,y)=>x.revision-y.revision)[0];
   if(!first)continue;answered++;
   const review=first.review?.time>until?null:first.review;
   if(review){graded++;sum+=review.score;if(review.score===q.maxPoints)correct++;samples.push({id:first.id,kind:'essay',exerciseId:q.id,skill:skillOf(q.topic),topic:q.topic,time:first.submittedAt,completed:first.submittedAt,initialCorrect:review.score===q.maxPoints,answer:first.working||'Bài làm trong ảnh',prompt:q.prompt,href:'#knowledge/'+studentId,mode:'essay'});}
  }
  if(a.withdrawn&&!answered)continue;
  assignments.push({id:a.id,kind:'essay',title:a.title,teacherId:a.teacherId,created:a.createdAt,due:a.due,href:'#essays/'+a.id,exerciseIds:[],result:{total:a.questions.length,answered,correct,score:graded===a.questions.length?Math.round(sum/a.questions.length*10)/10:null,complete:answered===a.questions.length,provisional:graded<answered}});
 }
 const seen=new Set();
 for(const a of (db.datatmAttempts||[]).filter(a=>a.studentId===studentId&&realRow(a)&&a.time<=until).sort((a,b)=>a.time-b.time)){
  if(seen.has(a.questionId))continue;seen.add(a.questionId);
  const q=a.snapshot,last=(db.datatmAttempts||[]).filter(v=>v.studentId===studentId&&v.questionId===a.questionId&&v.time<=until).at(-1);
  samples.push({id:a.id,kind:'datatm',exerciseId:a.questionId,skill:skillOf(q.topic),topic:q.topic,time:a.time,initialCorrect:a.correct,answer:a.answer,working:a.working,prompt:q.prompt,correctAnswer:q.answer,solution:q.solution,corrected:!a.correct&&!!last?.correct,href:'#knowledge/'+studentId,mode:'datatm'});
 }
 const modern=modernAssessments(db,studentId,{teacherId,until});
 assignments.push(...modern.assignments);
 for(const r of modern.records)if(typeof r.correct==='boolean')samples.push({id:r.id,kind:r.kind,exerciseId:r.id,skill:skillOf(r.topic),topic:r.topic,time:r.time,completed:r.time,initialCorrect:r.correct,answer:r.answer,prompt:r.prompt,correctAnswer:r.correctAnswer,solution:r.solution,href:r.href,mode:r.kind,provisional:r.provisional});
 return {assignments,samples};
}
export function mergeAssessmentReport(result,extra){
 result.assignments.push(...extra.assignments);result.total+=extra.samples.length;result.correct+=extra.samples.filter(a=>a.initialCorrect).length;
 for(const a of extra.samples){let skill=result.bySkill.find(s=>s.skill===a.topic);if(!skill){skill={skill:a.topic,name:a.topic,attempts:0,correct:0,recentTotal:0,recentCorrect:0,status:'Theo câu đã chấm'};result.bySkill.push(skill);}skill.attempts++;skill.correct+=Number(a.initialCorrect);skill.recentTotal++;skill.recentCorrect+=Number(a.initialCorrect);
  if(!a.initialCorrect){const error=result.errors.find(e=>e.type==='unknown');error.count++;if(!a.corrected)error.pending++;error.attemptIds.push(a.id);result.evidence.push({...a,exercise:{prompt:a.prompt},diagnosis:{type:'unknown',status:'pending',reason:'Xem phân tích kiến thức và bài nộp để đối chiếu lỗi.'}});}
 }
 return result;
}
