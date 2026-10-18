import {realRow} from './assessment-rollup.mjs';
import {modernAssessments} from './modern-assessments.mjs';
import {skills as skillCatalog} from './public/data.js';
import {decorateDatatm} from './datatm-service.mjs';
import {randomUUID,createHash} from 'node:crypto';
import {validateMath} from './math-validation.mjs';
import {normalizeTutorImages} from './tutor-images.mjs';
const practiceEvidence=a=>createHash('sha256').update(JSON.stringify([a.id,a.corrected,a.correction,a.revisedWorking,a.explanation])).digest('hex');
const fail=(status,message)=>{throw Object.assign(Error(message),{status});};
export function createKnowledgeService({db,persist,learning,writeFile,readFile,now=Date.now}){
  db.knowledgeRepairs??=[];
  db.datatmAttempts??=[];
  function guard(user,id){const target=id||(user.role==='student'?user.id:user.studentIds?.[0]);if(!target||!(user.role==='student'?target===user.id:['teacher','parent'].includes(user.role)&&user.studentIds.includes(target))||!db.states[target])fail(403,'Bạn không được xem hồ sơ học sinh này.');return target;}
  const teacherAllowed=(user,teacherId,studentId)=>user.role==='teacher'?user.id===teacherId:db.users.some(u=>u.id===teacherId&&u.role==='teacher'&&u.studentIds.includes(studentId));
  function report(user,id){
    const studentId=guard(user,id),state=db.states[studentId],student=db.users.find(u=>u.id===studentId),topics=new Map(),mistakes=[],history=[],pending=[];
    function sample(topic,correct,provisional=false){const name=topic||'Kiến thức chưa phân loại',t=topics.get(name)||{name,total:0,correct:0,provisional:0};t.total++;if(correct)t.correct++;if(provisional)t.provisional++;topics.set(name,t);}
    for(const exam of db.exams||[]){
      if(!teacherAllowed(user,exam.teacherId,studentId)||!db.classes.find(c=>c.id===exam.classId)?.studentIds.includes(studentId))continue;
      const a=(db.examAttempts||[]).find(a=>realRow(a)&&a.examId===exam.id&&a.studentId===studentId);
      if(!a?.submittedAt){if(exam.withdrawn&&!a)continue;pending.push({kind:'exam',id:exam.id,title:exam.title,status:a?'Đang làm':'Chưa làm',due:exam.due||null,overdue:!!a&&now()>a.deadline,href:'#exams/'+exam.id});continue;}
      history.push({kind:'exam',id:a.id,title:exam.title,time:a.submittedAt,startedAt:a.startedAt,elapsedMs:a.submittedAt-a.startedAt,score:a.score,provisional:false,questions:(a.questionSnapshots||exam.questions).map((q,i)=>({prompt:q.prompt,answer:a.answers[i]===null?'Chưa trả lời':q.choices[a.answers[i]],correctAnswer:q.choices[q.correctIndex],correct:a.answers[i]===q.correctIndex,solution:q.explanation,topic:q.topic||q.knowledge||'Toán '+exam.grade}))});
      (a.questionSnapshots||exam.questions).forEach((q,i)=>{
        const correct=a.answers[i]===q.correctIndex,topic=q.topic||q.knowledge||'Toán '+exam.grade;sample(topic,correct);
        if(correct)return;
        const key=a.id+':'+i,repairs=db.knowledgeRepairs.filter(r=>r.studentId===studentId&&r.key===key);
        mistakes.push({key,kind:'exam',examId:exam.id,questionIndex:i,title:exam.title,prompt:q.prompt,choices:q.choices,correctIndex:q.correctIndex,originalAnswer:a.answers[i],topic,knowledge:q.knowledge||topic,analysis:q.choiceFeedback?.[a.answers[i]]||(a.answers[i]===null?'Câu chưa trả lời. Chưa có bằng chứng để kết luận nguyên nhân.':'Lựa chọn chưa đúng. Chỉ từ đáp án trắc nghiệm chưa thể xác định chính xác nguyên nhân; hãy đối chiếu từng bước dưới đây.'),solution:q.explanation,nextStep:'Ôn '+(q.knowledge||topic)+', tự giải lại và ghi cách làm trước khi chọn đáp án.',time:a.submittedAt,repairs:structuredClone(repairs),resolved:!!(repairs.at(-1)?.correct&&repairs.at(-1)?.review?.approved),provisional:!!(repairs.at(-1)?.correct&&!repairs.at(-1)?.review),href:'#exams/'+exam.id});
      });
    }
    for(const assignment of db.essayAssignments||[]){
      if(!teacherAllowed(user,assignment.teacherId,studentId)||!db.classes.find(c=>c.id===assignment.classId)?.studentIds.includes(studentId))continue;
      const submissions=(db.essaySubmissions||[]).filter(s=>realRow(s)&&s.assignmentId===assignment.id&&s.studentId===studentId);
      for(const q of assignment.questions){
        const attempts=submissions.filter(s=>s.questionId===q.id).sort((a,b)=>a.revision-b.revision),first=attempts[0],last=attempts.at(-1);
        if(!first){if(assignment.withdrawn)continue;pending.push({kind:'essay',id:assignment.id,title:assignment.title+' — '+q.topic,status:'Chưa nộp',due:assignment.due,overdue:now()>Date.parse(assignment.due+'T23:59:59+07:00'),href:'#essays/'+assignment.id});continue;}
        const initialScore=first.review?.score??first.ai?.score??null,latestScore=last.review?.score??last.ai?.score??null;
        if(first.review)sample(q.topic,initialScore===q.maxPoints);
        for(const s of attempts)history.push({kind:'essay',id:s.id,title:assignment.title+' — '+q.topic,time:s.submittedAt,startedAt:s.startedAt,elapsedMs:s.elapsedMs,score:s.review?.score??s.ai?.score??null,provisional:!s.review,revision:s.revision,late:s.late,prompt:q.prompt,working:s.working,images:s.images.map((_,i)=>'/api/essays/submissions/'+s.id+'/images/'+i),ai:s.ai,review:s.review,reviewHistory:s.reviewHistory||[],status:s.status});
        if(initialScore===null||latestScore===null){pending.push({kind:'review',id:last.id,title:assignment.title+' — '+q.topic,status:last.status==='unreadable'?'Ảnh chưa đọc rõ':last.status==='ai_failed'?'AI chưa chấm được':'Chờ chấm',due:assignment.due,href:'#essays/'+assignment.id});}
        if(initialScore!==null&&initialScore<q.maxPoints){
          const assessment=last.review||last.ai,criteria=last.ai?.criteria.filter(c=>c.earned<(q.rubric.find(r=>r.id===c.id)?.points||0))||[];
          mistakes.push({key:'essay:'+first.id,kind:'essay',assignmentId:assignment.id,questionId:q.id,title:assignment.title,prompt:q.prompt,topic:q.topic,knowledge:last.review?.missingKnowledge||criteria.map(c=>c.missingKnowledge).filter(Boolean).join('; ')||q.knowledge,analysis:last.review?.comment||last.ai?.summary||'Chờ giáo viên nhận xét.',solution:q.solution,nextStep:last.review?.nextStep||criteria.map(c=>c.nextStep).filter(Boolean).join('; ')||'Trình bày lại từng bước và nộp ảnh rõ nét.',time:first.submittedAt,provisional:!last.review,resolved:!!last.review&&latestScore===q.maxPoints,repairs:attempts.slice(1).map(s=>({time:s.submittedAt,score:s.review?.score??s.ai?.score??null,correct:(s.review?.score??s.ai?.score)===q.maxPoints,provisional:!s.review})),href:'#essays/'+assignment.id});
        }
      }
    }
    const modern=modernAssessments(db,studentId,{teacherId:user.role==='teacher'?user.id:undefined,now:now()});
    pending.push(...modern.pending);
    const libraryHistory=new Map();
    for(const r of modern.records){
      if(typeof r.correct==='boolean')sample(r.topic,r.correct,r.provisional);
      if(r.kind==='library'){
        let h=libraryHistory.get(r.attemptId);
        if(!h){h={kind:r.kind,id:r.attemptId,title:r.title,time:r.time,startedAt:r.startedAt,elapsedMs:r.elapsedMs,score:r.score,provisional:r.provisional,questions:[],images:[],review:r.review};libraryHistory.set(r.attemptId,h);history.push(h);}
        h.questions.push({prompt:r.prompt,answer:r.answer,correct:r.correct,correctAnswer:r.correctAnswer,solution:r.solution,topic:r.topic});h.images.push(...r.images);
      }else history.push({...r,working:r.answer});
      if(r.correct===false||r.correct===null&&r.ai?.readable&&r.ai.score<10){
        const key=r.kind+':'+r.id,repairs=db.knowledgeRepairs.filter(v=>v.studentId===studentId&&v.key===key).map(v=>({...structuredClone(v),photos:undefined,images:(v.photos||[]).map((_,i)=>`/api/knowledge/repairs/${v.id}/images/${i}`)})),last=repairs.at(-1);
        mistakes.push({key,kind:r.kind,setId:r.setId,exerciseId:r.exerciseId,title:r.title,prompt:r.prompt,topic:r.topic,knowledge:r.topic,analysis:r.review?.comment||r.ai?.summary||'Đáp án chưa đúng; cần đối chiếu cách làm. Chưa đủ bằng chứng để kết luận nguyên nhân.',solution:r.solution,nextStep:'Nộp ảnh bài sửa bên dưới để giáo viên xem và xác nhận. Điểm bài ban đầu được giữ nguyên.',time:r.time,resolved:!!last?.review?.approved,provisional:!!last&&!last.review,repairs,href:r.href});
      }
    }
    const old=learning.report(user,studentId);
    for(const a of old.assignments||[])if(!a.kind&&!a.result.complete)pending.push({kind:'practice',id:a.id,title:a.title,status:a.result.answered?'Chưa làm đủ':'Chưa làm',due:a.due,overdue:now()>Date.parse(a.due+'T23:59:59+07:00'),href:'#learning'});
    for(const a of (state.attempts||[]).filter(realRow)){const ex=learning.catalog(studentId).find(e=>e.id===a.exerciseId);if(!ex)continue;const own=db.teacherContents?.find(c=>c.id===ex.id);if(user.role==='teacher'&&own&&own.teacherId!==user.id)continue;const topic=own?.topic||skillCatalog.find(s=>s.id===ex.skill)?.name||ex.skill;sample(topic,!!a.initialCorrect);if(!a.initialCorrect){const verification=db.knowledgeRepairs.find(r=>r.key==='practice:'+a.id&&r.studentId===studentId&&r.evidence===practiceEvidence(a));mistakes.push({key:'practice:'+a.id,kind:'practice',title:'Bài luyện tập',prompt:ex.prompt,topic,knowledge:topic,analysis:db.diagnoses?.[studentId]?.[a.id]?.reason||'Chưa có đủ bằng chứng về nguyên nhân.',solution:ex.rule,nextStep:db.diagnoses?.[studentId]?.[a.id]?.nextStep||'Mở lại bài để tiếp tục sửa.',resolved:!!(a.corrected&&verification?.review?.approved),provisional:!!(a.corrected&&!verification?.review),time:a.time,repairs:a.corrected?[{id:a.id,time:a.completed||a.time,correct:true,working:a.revisedWorking||a.explanation||'',review:verification?.review,reviewHistory:verification?.reviewHistory||[]}]:[],href:'#learn/'+ex.id});}}
    for(const a of db.datatmAttempts.filter(a=>a.studentId===studentId)){
      const q=a.snapshot;history.push({kind:'datatm',id:a.id,title:'Bài củng cố · '+q.topic,topic:q.topic,prompt:q.prompt,working:a.working,time:a.time,elapsedMs:0,score:a.correct?10:0,provisional:false,questions:[{prompt:q.prompt,answer:a.answer,correctAnswer:q.answer,correct:a.correct,solution:q.solution,topic:q.topic}]});
      if(a.firstForQuestion)sample(q.topic,a.correct);
      if(!a.firstForQuestion||a.correct||!a.mistakeKey.startsWith('chat:'))continue;
      const attempts=db.datatmAttempts.filter(v=>v.studentId===studentId&&v.questionId===a.questionId),last=attempts.at(-1),thread=(db.tutorThreads||[]).find(t=>t.studentId===studentId&&t.messages.some(m=>m.id===a.offerId));
      mistakes.push({key:'datatm:'+a.id,kind:'datatm',title:'Bài luyện cùng gia sư',prompt:q.prompt,topic:q.topic,knowledge:q.topic,analysis:'Đáp án đầu chưa đúng. Cách làm đã được lưu để đối chiếu; hệ thống chấm đáp án số, chưa xác nhận lập luận.',solution:q.solution,nextStep:'Đối chiếu từng bước với lời giải rồi thử một bài mới cùng kiến thức.',time:a.time,resolved:!!last.correct,provisional:false,datatmQuestionId:q.id,repairs:attempts.slice(1).map(v=>({id:v.id,time:v.time,correct:v.correct,working:v.working})),href:'#chat'+(thread?'/'+thread.id:'')});
    }
    decorateDatatm(mistakes,state.profile?.grade||7,db.datatmAttempts,studentId);
    const skills=[...topics.values()].map(t=>({...t,status:t.total<3?'Chưa đủ dữ liệu':t.correct/t.total>=0.8?'Điểm mạnh qua các bài đã làm':t.correct/t.total<0.6?'Cần củng cố':'Đang hình thành',accuracy:Math.round(t.correct/t.total*100)}));
    return {student:{id:studentId,name:state.profile?.name||student.name,grade:state.profile?.grade||7},skills,strengths:skills.filter(t=>t.total>=3&&t.correct/t.total>=0.8),gaps:skills.filter(t=>t.correct<t.total),mistakes:mistakes.sort((a,b)=>Number(a.resolved)-Number(b.resolved)||b.time-a.time),history:history.sort((a,b)=>b.time-a.time),pending,usage:structuredClone(db.usage?.[studentId]||null),recommendations:mistakes.filter(m=>!m.resolved).map(m=>({key:m.key,title:m.title,knowledge:m.knowledge,action:m.nextStep,href:m.href})),note:'Sửa đúng câu đã xem lời giải là bằng chứng khắc phục, chưa đủ để kết luận thành thạo. Phân tích AI và điểm chưa được giáo viên duyệt là tạm thời.'};
  }
  function repair(user,input){
    if(user.role!=='student')fail(403,'Chỉ học sinh được sửa bài của mình.');
    if(input?.key?.startsWith('library:')||input?.key?.startsWith('practice-photo:'))return repairPhoto(user,input);
    const reportData=report(user,user.id),item=reportData.mistakes.find(m=>m.key===input.key&&m.kind==='exam');
    if(!item)fail(404,'Không tìm thấy câu sai cần sửa.');
    if(!Number.isInteger(input.choiceIndex)||input.choiceIndex<0||input.choiceIndex>3)fail(400,'Chọn một đáp án.');
    const working=validateMath(input.working||'',5000);if(working.length<5)fail(400,'Hãy ghi cách làm hoặc điều em đã sửa, tối thiểu 5 ký tự.');
    if(item.repairs.length>=50)fail(429,'Đã đạt 50 lượt sửa; hãy hỏi giáo viên.');
    const row={id:randomUUID(),studentId:user.id,key:input.key,time:now(),choiceIndex:input.choiceIndex,working,correct:input.choiceIndex===item.correctIndex};
    db.knowledgeRepairs.push(row);try{persist();}catch(e){db.knowledgeRepairs.pop();throw e;}return structuredClone(row);
  }
  async function repairPhoto(user,input){
    const find=()=>report(user,user.id).mistakes.find(m=>m.key===input.key&&['library','practice-photo'].includes(m.kind));
    const item=find();if(!item)fail(404,'Không tìm thấy câu cần sửa hoặc kết quả chưa được mở.');
    if(item.repairs.length>=50)fail(429,'Đã đạt 50 lượt sửa; hãy hỏi giáo viên.');
    if(!Array.isArray(input.photos)||!input.photos.length)fail(400,'Tải ảnh bài sửa để giáo viên kiểm tra.');
    const photos=await normalizeTutorImages(input.photos);
    const current=find();if(!current||current.repairs.length>=50)fail(409,'Bài đã thay đổi. Hãy tải lại.');
    const row={id:randomUUID(),studentId:user.id,key:item.key,kind:item.kind,time:now(),correct:null,working:'Bài sửa trong ảnh',photos:photos.map(p=>{const bytes=Buffer.from(p.base64,'base64'),fileKey='repair-'+createHash('sha256').update(bytes).digest('hex')+'.jpg';writeFile(fileKey,bytes);return{fileKey};})};
    db.knowledgeRepairs.push(row);try{persist();}catch(e){db.knowledgeRepairs.pop();throw e;}
    return {id:row.id,correct:null};
  }
  function repairImage(user,id,index){
    const row=db.knowledgeRepairs.find(r=>r.id===id);if(!row)fail(404,'Không tìm thấy ảnh bài sửa.');
    guard(user,row.studentId);if(!report(user,row.studentId).mistakes.some(m=>m.key===row.key))fail(404,'Không được xem bài sửa này.');
    if(!row.photos?.[index])fail(404,'Không tìm thấy ảnh bài sửa.');return readFile(row.photos[index].fileKey);
  }
  function reviewRepair(user,input){
    if(user.role!=='teacher')fail(403,'Chỉ giáo viên được duyệt cách sửa.');
    const studentId=guard(user,input.studentId),item=report(user,studentId).mistakes.find(m=>m.key===input.key&&['exam','practice','library','practice-photo'].includes(m.kind));
    const repair=item?.repairs.find(r=>r.id===input.repairId);
    if(!repair)fail(404,'Không tìm thấy bản sửa của học sinh được liên kết.');
    if(typeof input.approved!=='boolean'||input.approved&&!repair.correct&&!['library','practice-photo'].includes(item.kind))fail(400,'Chỉ xác nhận bản sửa có đáp án đúng.');
    const comment=validateMath(input.comment||'',3000);if(comment.length<5)fail(400,'Ghi nhận xét về cách sửa, tối thiểu 5 ký tự.');
    const snapshot=structuredClone(db.knowledgeRepairs);
    try{
      let row;
      if(item.kind!=='practice')row=db.knowledgeRepairs.find(r=>r.id===repair.id&&r.studentId===studentId);
      else{
        const attempt=db.states[studentId].attempts.find(a=>'practice:'+a.id===item.key),evidence=practiceEvidence(attempt);
        row=db.knowledgeRepairs.find(r=>r.key===item.key&&r.studentId===studentId&&r.evidence===evidence);
        if(!row){row={id:randomUUID(),kind:'practice',studentId,key:item.key,evidence};db.knowledgeRepairs.push(row);}
      }
      row.reviewHistory??=[];if(row.review)row.reviewHistory.push(row.review);
      if(['library','practice-photo'].includes(item.kind))row.correct=input.approved;
      row.review={approved:input.approved,comment,teacherId:user.id,time:now()};persist();return structuredClone(row.review);
    }catch(e){db.knowledgeRepairs=snapshot;throw e;}
  }
  function options(user){if(!['teacher','parent','student'].includes(user.role))fail(403,'Không có quyền truy cập.');return {students:db.users.filter(s=>s.role==='student'&&(user.role==='student'?s.id===user.id:user.studentIds.includes(s.id))).map(s=>({id:s.id,name:s.name})),classes:user.role==='teacher'?db.classes.filter(c=>c.teacherId===user.id):[]};}
  function leaderboard(user,classId){
    if(!['student','teacher','parent'].includes(user.role))fail(403,'Không có quyền xem bảng thành tích.');
    const classes=db.classes.filter(c=>user.role==='teacher'?c.teacherId===user.id:user.role==='student'?c.studentIds.includes(user.id):c.studentIds.some(id=>user.studentIds?.includes(id)));
    const group=classId?classes.find(c=>c.id===classId):classes[0];
    if(classId&&!group)fail(403,'Bạn không được xem thành tích lớp này.');
    const rows=(group?.studentIds||[]).flatMap(id=>{
      const student=db.users.find(s=>s.id===id&&s.role==='student');if(!student||!db.states[id])return [];
      const k=report(student,id),keys=new Set();
      for(const m of k.mistakes){
        if(m.kind==='exam'&&m.resolved&&db.exams.find(e=>e.id===m.examId)?.classId===group.id)keys.add('exam:'+m.examId+':'+m.questionIndex);
        if(m.kind==='essay'&&db.essayAssignments.find(a=>a.id===m.assignmentId)?.classId===group.id&&m.resolved&&!m.provisional&&m.repairs.some(r=>r.correct&&!r.provisional))keys.add(m.key);
        if(m.kind==='practice'&&m.resolved)keys.add('practice:'+m.href.replace('#learn/',''));
        if(m.kind==='library'&&m.resolved&&db.librarySets.find(s=>s.id===m.setId)?.classId===group.id)keys.add(m.key);
        if(m.kind==='practice-photo'&&m.resolved)keys.add('practice:'+m.exerciseId);
      }
      return keys.size?[{studentId:id,name:student.name,corrected:keys.size,isYou:id===user.id}]:[];
    }).sort((a,b)=>b.corrected-a.corrected||a.name.localeCompare(b.name,'vi')||a.studentId.localeCompare(b.studentId));
    let rank=0;rows.forEach((r,i)=>{if(!i||r.corrected!==rows[i-1].corrected)rank=i+1;r.rank=rank;});
    return {classes:classes.map(c=>({id:c.id,name:c.name})),classId:group?.id||null,top:rows.slice(0,10),yourResult:rows.find(r=>r.isYou)||null,note:'Mỗi câu sửa đúng được giáo viên xác nhận cách làm chỉ tính một lần. Tự luận chỉ tính sau khi giáo viên duyệt bản sửa đạt điểm tối đa. Cùng số câu được đồng hạng; danh sách tối đa 10 học sinh, sắp tên khi bằng điểm. Thành tích tích lũy toàn thời gian.'};
  }
  return {report,repair,reviewRepair,repairImage,options,leaderboard};
}
