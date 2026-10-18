import {dueTime} from './assessment-dates.mjs';
import {exercises,skills} from './public/data.js';
// One read-only projection for the new assignment/photograph flows. Never promotes AI to a final grade.
export function modernAssessments(db,studentId,{teacherId,until=Infinity,now=Date.now()}={}){
 const assignments=[],records=[],pending=[];const horizon=Math.min(until,now);
 const linked=id=>db.users?.some(u=>u.id===id&&u.role==='teacher'&&u.studentIds?.includes(studentId));
 for(const set of db.librarySets||[]){
  if(set.createdAt>horizon||teacherId&&set.teacherId!==teacherId||!linked(set.teacherId)||!db.classes?.some(c=>c.id===set.classId&&c.teacherId===set.teacherId&&c.studentIds.includes(studentId)))continue;
  const a=(db.libraryAttempts||[]).find(a=>a.setId===set.id&&a.studentId===studentId&&!a.testRun&&a.startedAt<=horizon);
  const submittedAt=a&&(a.submittedAt<=horizon?a.submittedAt:null)||(a?.deadline<=horizon?a.deadline:null);
  if(set.withdrawn&&!a)continue;
  const href=teacherId?'#teacher-library/bank/'+set.id:set.mode==='exam'?'#exams/library/'+set.id:'#practice/'+set.id;
  const reveal=!!teacherId||set.mode==='practice'||now>=dueTime(set.due);
  const review=a?.review?.time<=horizon?a.review:null;
  const photos=(db.librarySubmissions||[]).filter(s=>s.attemptId===a?.id&&s.time<=horizon);
  const answered=set.questions.filter(q=>q.type==='mcq'?Number.isInteger(a?.answers?.[q.id]):photos.some(s=>s.questionId===q.id)).length;
  const result={total:set.questions.length,answered:submittedAt?set.questions.length:answered,correct:0,score:reveal?review?.score??null:null,complete:!!submittedAt,provisional:!review};
  assignments.push({id:set.id,kind:'library',title:set.title,teacherId:set.teacherId,created:set.createdAt,due:set.due,href,exerciseIds:[],result});
  if(!submittedAt){pending.push({kind:'library',id:set.id,title:set.title,status:a?'Đang làm':'Chưa làm',due:set.due,overdue:now>=dueTime(set.due),href});continue;}
  if(!reveal){pending.push({kind:'library',id:set.id,title:set.title,status:'Đã nộp · Chờ mở kết quả',due:set.due,href});continue;}
  let provisional=0,allGraded=true;
  for(const q of set.questions){
   const s=photos.find(s=>s.questionId===q.id),mcq=q.type==='mcq',ai=s?.ai;
   const correct=mcq?a.answers[q.id]===q.correctIndex:null;
   if(mcq&&correct){result.correct++;provisional+=q.points;}
   if(!mcq&&s){if(ai?.readable)provisional+=q.points*ai.score/10;else allGraded=false;}
   records.push({id:a.id+':'+q.id,submissionId:s?.id,kind:'library',type:q.type,title:set.title,topic:q.topic,prompt:q.prompt,answer:mcq?q.choices[a.answers[q.id]]||'Chưa trả lời':'Bài làm trong ảnh',correctAnswer:q.answer,solution:q.solution,correct,time:submittedAt,startedAt:a.startedAt,elapsedMs:submittedAt-a.startedAt,score:review?.score??null,questionScore:mcq?(correct?10:0):null,ai:mcq?null:ai,review,provisional:!review,href,images:s?s.photos.map((_,i)=>`/api/library/submissions/${s.id}/images/${i}`):[],setId:set.id,attemptId:a.id});
  }
  if(!review)pending.push({kind:'library-review',id:set.id,title:set.title,status:'Đã nộp · Chờ giáo viên chốt điểm',due:set.due,href});
  result.provisionalScore=allGraded?Math.round(provisional*100)/100:null;
 }
 for(const p of db.states?.[studentId]?.practicePhotos||[]){
  if(p.testRun||p.time>horizon)continue;
  const own=(db.teacherContents||[]).find(c=>c.id===p.exerciseId);
  const exercise=exercises.find(e=>e.id===p.exerciseId);
  if(teacherId&&(own&&own.teacherId!==teacherId||!linked(teacherId)))continue;
  const review=p.review?.time<=horizon?p.review:null,mcq=p.type==='mcq';
  const topic=own?.topic||skills.find(s=>s.id===exercise?.skill)?.name||'Bài luyện tập',href=teacherId?'#learning/'+studentId:'#learn/'+p.exerciseId;
  const provisionalScore=mcq?p.choiceScore:p.ai?.readable?p.ai.score:null;
  const assigned=(db.states[studentId].assignments||[]).some(a=>(!teacherId||a.teacherId===teacherId)&&a.created<=p.time&&(a.exerciseIds?.includes(p.exerciseId)||a.skill&&a.skill===(own?'teacher-'+own.id:undefined)));
  if(!assigned)assignments.push({id:p.id,kind:'practice-photo',title:'Luyện tập · '+topic,teacherId:own?.teacherId||review?.teacherId||teacherId,created:p.time,due:'',href,exerciseIds:[],result:{total:1,answered:1,correct:mcq?Number(p.correct):review?Number(review.score===10):0,score:review?.score??null,provisionalScore,complete:true,provisional:!review}});
  records.push({id:p.id,exerciseId:p.exerciseId,kind:'practice-photo',type:mcq?'mcq':'essay',title:'Bài luyện tập',topic,prompt:p.prompt,answer:mcq?p.choices[p.choiceIndex]||'Chưa trả lời':p.working||'Bài làm trong ảnh',correctAnswer:mcq?p.choices[p.correctIndex]:p.answer,solution:p.feedback||p.rule,correct:mcq?p.correct:review?review.score===10:null,time:p.time,startedAt:p.time,elapsedMs:0,score:review?.score??provisionalScore,questionScore:review?.score??(mcq?p.choiceScore:null),ai:p.ai,review,provisional:!review,href,images:p.photos.map((_,i)=>`/api/practice/photos/${p.id}/images/${i}`)});
  if(!review)pending.push({kind:'practice-review',id:p.id,title:'Bài luyện tập · '+topic,status:'Đã nộp · Chờ giáo viên chốt điểm',href});
 }
 return {assignments,records,pending};
}

export function mergePhotoAssignmentScores(state,assignments){
 for(const a of assignments){if(a.kind)continue;const ids=a.exerciseIds||[];let answered=0,correct=0,totalScore=0,scored=0,provisional=false;
  for(const id of ids){
   const legacy=state.attempts.filter(r=>!r.testRun&&r.exerciseId===id&&r.time>=a.created).sort((x,y)=>x.time-y.time)[0];
   const photo=(state.practicePhotos||[]).filter(r=>!r.testRun&&r.exerciseId===id&&r.time>=a.created).sort((x,y)=>x.time-y.time)[0];
   if(photo&&(!legacy||photo.time<legacy.time)){answered++;if(photo.review){scored++;totalScore+=photo.review.score;if(photo.review.score===10)correct++;}else provisional=true;}
   else if(legacy){answered++;scored++;totalScore+=legacy.initialCorrect?10:0;correct+=Number(legacy.initialCorrect);}
  }
  if(provisional||answered!==a.result.answered)a.result={total:ids.length,answered,correct,score:scored===ids.length?Math.round(totalScore/ids.length*10)/10:null,complete:answered===ids.length,provisional};
  else if((state.practicePhotos||[]).some(p=>ids.includes(p.exerciseId)&&p.time>=a.created))a.result={total:ids.length,answered,correct,score:scored===ids.length?Math.round(totalScore/ids.length*10)/10:null,complete:answered===ids.length,provisional};
 }
}
