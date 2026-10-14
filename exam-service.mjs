import {realRow} from './assessment-rollup.mjs';
import {randomUUID} from 'node:crypto';
import {validateMath} from './math-validation.mjs';
import {validAssessmentDue,dueTime} from './assessment-dates.mjs';
const fail=(status,message)=>{throw Object.assign(Error(message),{status});};
const text=(v,n)=>typeof v==='string'&&v.trim()&&v.length<=n;
export function createExamService({db,persist,now=Date.now}){
  db.exams??=[];db.examAttempts??=[];
  function transaction(fn){const snapshot=structuredClone([db.exams,db.examAttempts]);try{const result=fn();persist();return result;}catch(e){[db.exams,db.examAttempts]=snapshot;throw e;}}
  function canRead(user,exam){
    if(user.role==='teacher')return user.id===exam.teacherId;
    const group=db.classes.find(c=>c.id===exam.classId&&c.teacherId===exam.teacherId),teacher=db.users.find(u=>u.id===exam.teacherId&&u.role==='teacher');
    return user.role==='student'&&group?.studentIds.includes(user.id)&&teacher?.studentIds.includes(user.id)&&Number(db.states[user.id]?.profile?.grade)===exam.grade;
  }
  function find(user,id){const exam=db.exams.find(e=>e.id===id);if(!exam||!canRead(user,exam))fail(404,'Không tìm thấy đề thi của bạn.');return exam;}
  function finish(attempt,exam,expired=false){
    attempt.questionSnapshots=structuredClone(exam.questions);
    attempt.wrongQuestionIndexes=exam.questions.flatMap((q,i)=>attempt.answers[i]===q.correctIndex?[]:[i]);
    attempt.submittedAt=expired?attempt.deadline:now();attempt.reason=expired?'timeout':'submitted';
    attempt.correct=exam.questions.filter((q,i)=>attempt.answers[i]===q.correctIndex).length;
    attempt.score=Math.round(attempt.correct/exam.questions.length*100)/10;attempt.version++;
  }
  function sweep(){const expired=db.examAttempts.filter(a=>realRow(a)&&!a.submittedAt&&now()>=a.deadline);if(expired.length)transaction(()=>{for(const a of expired){const exam=db.exams.find(e=>e.id===a.examId);if(exam)finish(a,exam,true);}});}
  const summary=e=>({id:e.id,title:e.title,classId:e.classId,className:db.classes.find(c=>c.id===e.classId)?.name||'',grade:e.grade,durationMinutes:e.durationMinutes,questionCount:e.questions.length,due:e.due||'',withdrawn:!!e.withdrawn});
  function view(user,exam){
    const attempt=db.examAttempts.find(a=>realRow(a)&&a.examId===exam.id&&a.studentId===user.id);
    const reveal=user.role==='teacher'||Boolean(attempt?.submittedAt);
    return {...summary(exam),serverNow:now(),attempt:attempt?structuredClone(attempt):null,
      questions:user.role==='student'&&!attempt?[]:exam.questions.map(q=>({prompt:q.prompt,choices:[...q.choices],topic:q.topic||'',knowledge:q.knowledge||'',...(reveal?{correctIndex:q.correctIndex,explanation:q.explanation,source:q.source}:{})}))};
  }
  function list(user){sweep();return db.exams.filter(e=>canRead(user,e)).map(e=>({...summary(e),attempt:user.role==='student'?structuredClone(db.examAttempts.find(a=>realRow(a)&&a.examId===e.id&&a.studentId===user.id)||null):null}));}
  function get(user,id){const exam=find(user,id);sweep();return view(user,exam);}
  function publish(user,input){
    if(!validAssessmentDue(input.due||''))fail(400,'Hạn nộp không hợp lệ.');
    if(user.role!=='teacher')fail(403,'Chỉ giáo viên được tạo đề thi.');
    const group=db.classes.find(c=>c.id===input.classId&&c.teacherId===user.id);
    if(!group||!text(input.title,120)||!Number.isInteger(input.durationMinutes)||input.durationMinutes<1||input.durationMinutes>180||!Array.isArray(input.questions)||input.questions.length<1||input.questions.length>50)fail(400,'Thông tin đề thi không hợp lệ.');
    const questions=input.questions.map(q=>{
      if(!text(q.prompt,2000)||!Array.isArray(q.choices)||q.choices.length!==4||q.choices.some(c=>!text(c,500))||new Set(q.choices.map(c=>c.trim())).size!==4||!Number.isInteger(q.correctIndex)||q.correctIndex<0||q.correctIndex>3||!text(q.explanation,2000)||!text(q.source,1000))fail(400,'Mỗi câu cần bốn lựa chọn khác nhau, đáp án, lời giải và nguồn.');
      if(q.choiceFeedback!==undefined&&(!Array.isArray(q.choiceFeedback)||q.choiceFeedback.length!==4))fail(400,'Nhận xét lựa chọn cần đủ bốn phương án.');
      return {prompt:validateMath(q.prompt),choices:q.choices.map(c=>validateMath(c)),correctIndex:q.correctIndex,explanation:validateMath(q.explanation),source:q.source.trim(),topic:validateMath(q.topic||'Toán '+group.grade,150),knowledge:validateMath(q.knowledge||q.topic||'Toán '+group.grade,2000),...(q.choiceFeedback?{choiceFeedback:q.choiceFeedback.map(s=>validateMath(s,3000))}:{})};
    });
    if(db.exams.some(e=>e.classId===group.id&&e.title===input.title.trim()))fail(409,'Tên đề thi đã tồn tại trong lớp.');
    return transaction(()=>{const exam={id:randomUUID(),title:input.title.trim(),teacherId:user.id,classId:group.id,grade:group.grade,durationMinutes:input.durationMinutes,due:input.due||'',questions,createdAt:now()};db.exams.push(exam);return summary(exam);});
  }
  function start(user,id){
    if(user.role!=='student')fail(403,'Chỉ học sinh được làm bài.');const exam=find(user,id);sweep();
    if(!db.examAttempts.some(a=>realRow(a)&&a.examId===id&&a.studentId===user.id)&&(exam.withdrawn||now()>dueTime(exam.due)))fail(409,'Đề đã ngừng giao hoặc hết hạn bắt đầu.');
    if(!db.examAttempts.some(a=>realRow(a)&&a.examId===id&&a.studentId===user.id))transaction(()=>{const startedAt=now();db.examAttempts.push({id:randomUUID(),examId:id,studentId:user.id,startedAt,deadline:startedAt+exam.durationMinutes*60000,answers:exam.questions.map(()=>null),version:0,submittedAt:null});});
    return view(user,exam);
  }
  function attemptFor(user,id){
    if(user.role!=='student')fail(403,'Chỉ học sinh được nộp bài.');const exam=find(user,id);sweep();
    const attempt=db.examAttempts.find(a=>realRow(a)&&a.examId===id&&a.studentId===user.id);if(!attempt)fail(409,'Hãy bắt đầu bài thi trước.');return {exam,attempt};
  }
  function answer(user,id,input){
    const {exam,attempt}=attemptFor(user,id);if(attempt.submittedAt)return view(user,exam);
    if(!Number.isInteger(input.questionIndex)||input.questionIndex<0||input.questionIndex>=exam.questions.length||!Number.isInteger(input.choiceIndex)||input.choiceIndex<0||input.choiceIndex>3)fail(400,'Lựa chọn không hợp lệ.');
    if(input.version!==attempt.version)fail(409,'Bài làm đã thay đổi ở tab khác. Đã tải lại; hãy chọn lại đáp án.');
    transaction(()=>{attempt.answers[input.questionIndex]=input.choiceIndex;attempt.version++;});return view(user,exam);
  }
  function submit(user,id){const {exam,attempt}=attemptFor(user,id);if(!attempt.submittedAt)transaction(()=>finish(attempt,exam));return view(user,exam);}
  function results(user,id){
    if(user.role!=='teacher')fail(403,'Chỉ giáo viên được xem kết quả lớp.');const exam=find(user,id);sweep();
    const group=db.classes.find(c=>c.id===exam.classId);
    const rows=(group?.studentIds||[]).filter(id=>user.studentIds.includes(id)).map(id=>{const s=db.users.find(u=>u.id===id),a=db.examAttempts.find(a=>realRow(a)&&a.examId===exam.id&&a.studentId===id);return {studentId:id,name:s?.name||'',username:s?.username||'',attempt:a?structuredClone(a):null};});
    return {exam:view(user,exam),students:rows,testAttempts:db.examAttempts.filter(a=>a.testRun&&a.examId===id&&user.studentIds.includes(a.studentId)).map(a=>({id:a.id,studentId:a.studentId,name:db.users.find(u=>u.id===a.studentId)?.name||'',score:a.score,submittedAt:a.submittedAt,testRun:a.testRun}))};
  }
  function manage(user,id,input){
    if(user.role!=='teacher')fail(403,'Chỉ giáo viên được quản lý đề.');const exam=find(user,id);
    if(input.action==='clone')return publish(user,{...exam,title:input.title,classId:input.classId||exam.classId,due:input.due??exam.due});
    if(!validAssessmentDue(input.due??exam.due??'')||input.withdrawn!==undefined&&typeof input.withdrawn!=='boolean')fail(400,'Thông tin quản lý không hợp lệ.');
    return transaction(()=>{exam.due=input.due??exam.due??'';if(input.withdrawn!==undefined)exam.withdrawn=input.withdrawn;return summary(exam);});
  }
  return {list,get,publish,start,answer,submit,results,sweep,manage};
}
