import {randomUUID,createHash} from 'node:crypto';
import {libraryCatalog,selectLibraryQuestions,questionLibrary} from './question-library.mjs';
import {normalizeTutorImages} from './tutor-images.mjs';
import {validAssessmentDue,dueTime} from './assessment-dates.mjs';
const fail=(status,message)=>{throw Object.assign(Error(message),{status});};
const uuid=v=>typeof v==='string'&&/^[a-f0-9-]{36}$/.test(v);
export function createLibraryService({db,persist,writeFile,readFile,now=Date.now}){
 db.librarySets??=[];db.libraryAttempts??=[];db.librarySubmissions??=[];
 const pending=new Map();
 function bankFor(user){return [...questionLibrary,...(db.teacherContents||[]).filter(c=>c.kind==='exercise'&&c.teacherId===user.id).map(c=>({id:c.id,grade:c.grade,topic:c.topic,tags:c.errorTags||[],level:'Giáo viên soạn',prompt:c.prompt,answer:c.answer,unit:'',solution:c.rule,choices:c.choices,correctIndex:c.correctIndex,formats:c.type==='mcq'?['mcq']:['essay'],rubric:[{id:'method',points:7,description:'Lập luận phù hợp: '+c.rule},{id:'result',points:3,description:'Kết luận đúng: '+c.answer}],source:{file:'Giáo viên tự soạn',question:1},review:{status:'teacher_approved'},adaptation:'Câu hỏi do giáo viên tự soạn và duyệt.'}))];}
 function tx(fn){const before=structuredClone([db.librarySets,db.libraryAttempts,db.librarySubmissions]);try{const result=fn();persist();return result;}catch(error){[db.librarySets,db.libraryAttempts,db.librarySubmissions]=before;throw error;}}
 function linked(user,set){
  if(user.role==='teacher')return set.teacherId===user.id;
  const cls=db.classes.find(c=>c.id===set.classId&&c.teacherId===set.teacherId),teacher=db.users.find(u=>u.id===set.teacherId&&u.role==='teacher');
  return user.role==='student'&&(!set.studentIds||set.studentIds.includes(user.id))&&cls?.studentIds.includes(user.id)&&teacher?.studentIds.includes(user.id)&&Number(db.states[user.id]?.profile?.grade)===set.grade;
 }
 function find(user,id){const set=db.librarySets.find(s=>s.id===id);if(!set||!linked(user,set))fail(404,'Không tìm thấy bộ câu hỏi của bạn.');return set;}
 const summary=s=>({id:s.id,title:s.title,classId:s.classId,className:db.classes.find(c=>c.id===s.classId)?.name||'',grade:s.grade,mode:s.mode,due:s.due,durationMinutes:s.durationMinutes,questionCount:s.questions.length,mcq:s.questions.filter(q=>q.type==='mcq').length,essay:s.questions.filter(q=>q.type==='essay').length,createdAt:s.createdAt,virtualTeacher:!!s.virtualTeacher,withdrawn:!!s.withdrawn});
 const released=(set,attempt)=>set.mode==='practice'?!!attempt?.submittedAt:now()>=dueTime(set.due);
 function finishExpired(){const expired=db.libraryAttempts.filter(a=>!a.submittedAt&&a.deadline<=now());if(expired.length)tx(()=>{for(const a of expired){a.submittedAt=a.deadline;a.reason='timeout';}});}
 function provisional(set,a){
  if(!a?.submittedAt)return null;let total=0;
  for(const q of set.questions){if(q.type==='mcq'){if(a.answers[q.id]===q.correctIndex)total+=q.points;}else{const s=db.librarySubmissions.find(s=>s.attemptId===a.id&&s.questionId===q.id);if(s&&!s.ai?.readable)return null;if(s)total+=q.points*s.ai.score/10;}}
  return Math.round(total*100)/100;
 }
 function safeAttempt(set,a,teacher){if(!a)return null;return {id:a.id,studentId:a.studentId,startedAt:a.startedAt,deadline:a.deadline,submittedAt:a.submittedAt,reason:a.reason,answers:structuredClone(a.answers),version:a.version,provisionalScore:teacher||released(set,a)?provisional(set,a):null,review:teacher||released(set,a)?a.review||null:null};}
 function safeSubmission(s,canReveal){const {photos,digest,...row}=structuredClone(s);if(!canReveal){row.ai=null;delete row.error;}return {...row,photos:photos.map((_,i)=>`/api/library/submissions/${s.id}/images/${i}`)};}
 function detail(user,id){
  const set=find(user,id);finishExpired();const teacher=user.role==='teacher',attempt=db.libraryAttempts.find(a=>a.setId===id&&a.studentId===user.id);
  const reveal=teacher||released(set,attempt);
  const eligible=db.users.filter(s=>s.role==='student'&&linked(s,set));
  const attempts=db.libraryAttempts.filter(a=>a.setId===id&&(teacher?eligible.some(s=>s.id===a.studentId):a.studentId===user.id));
  return {...summary(set),serverNow:now(),released:reveal,questions:teacher?structuredClone(set.questions):!attempt?[]:set.questions.map(q=>({id:q.id,type:q.type,points:q.points,prompt:q.prompt,topic:q.topic,choices:q.type==='mcq'?q.choices:undefined,...(reveal?{solution:q.solution,answer:q.answer,correctIndex:q.correctIndex,rubric:q.rubric,source:q.source}: {})})),attempt:safeAttempt(set,attempt,teacher),students:teacher?eligible.map(s=>({id:s.id,name:s.name,attempt:safeAttempt(set,attempts.find(a=>a.studentId===s.id),true)})):[],submissions:db.librarySubmissions.filter(s=>attempts.some(a=>a.id===s.attemptId)).map(s=>safeSubmission(s,reveal))};
 }
 function catalog(user){return {...libraryCatalog(user),questions:structuredClone(bankFor(user)),classes:db.classes.filter(c=>c.teacherId===user.id).map(c=>({id:c.id,name:c.name,grade:c.grade})),sets:db.librarySets.filter(s=>s.teacherId===user.id).map(summary)};}
 function publish(user,input){
  if(user.role!=='teacher')fail(403,'Chỉ giáo viên được giao bài.');
  const cls=db.classes.find(c=>c.id===input?.classId&&c.teacherId===user.id);
  if(!cls||typeof input.title!=='string'||!input.title.trim()||input.title.length>120||!['practice','exam'].includes(input.mode)||!input.due||!validAssessmentDue(input.due)||dueTime(input.due)<=now()||!uuid(input.requestId))fail(400,'Chọn lớp, tên bài, hình thức và hạn nộp còn hiệu lực.');
  if(input.mode==='exam'&&(!Number.isInteger(input.durationMinutes)||input.durationMinutes<1||input.durationMinutes>180))fail(400,'Thời gian kiểm tra từ 1 đến 180 phút.');
  const questions=selectLibraryQuestions(input.questions,cls.grade,bankFor(user));
  if(Math.abs(questions.reduce((sum,q)=>sum+q.points,0)-10)>1e-6)fail(400,'Tổng điểm toàn bài phải bằng 10.');
  const digest=createHash('sha256').update(JSON.stringify([input.classId,input.title,input.mode,input.due,input.durationMinutes,questions])).digest('hex');
  const old=db.librarySets.find(s=>s.teacherId===user.id&&s.requestId===input.requestId);if(old){if(old.digest!==digest)fail(409,'Nội dung đã đổi; tạo lượt giao mới.');return summary(old);}
  return tx(()=>{const set={id:randomUUID(),requestId:input.requestId,digest,teacherId:user.id,classId:cls.id,grade:cls.grade,title:input.title.trim(),mode:input.mode,due:input.due,durationMinutes:input.mode==='exam'?input.durationMinutes:null,questions,createdAt:now(),...(user.virtualTeacher?{virtualTeacher:true,selfPractice:!!input.selfPractice,studentIds:input.systemStudentIds||[...cls.studentIds]}:{})};db.librarySets.push(set);return summary(set);});
 }
 function list(user){finishExpired();return db.librarySets.filter(s=>linked(user,s)).map(s=>({...summary(s),attempt:safeAttempt(s,db.libraryAttempts.find(a=>a.setId===s.id&&a.studentId===user.id),user.role==='teacher')}));}
 function start(user,id){
  const set=find(user,id);if(user.role!=='student')fail(403,'Chỉ học sinh được bắt đầu bài.');finishExpired();
  if(!db.libraryAttempts.some(a=>a.setId===id&&a.studentId===user.id)){
   if(set.withdrawn||now()>=dueTime(set.due))fail(409,'Bài đã ngừng giao hoặc hết hạn.');
   tx(()=>db.libraryAttempts.push({id:randomUUID(),setId:id,studentId:user.id,startedAt:now(),deadline:set.mode==='exam'?Math.min(now()+set.durationMinutes*60000,dueTime(set.due)):dueTime(set.due),answers:{},version:0,submittedAt:null,review:null}));
  }
  return detail(user,id);
 }
 function active(user,id){const set=find(user,id);if(user.role!=='student')fail(403,'Chỉ học sinh được nộp bài.');finishExpired();const attempt=db.libraryAttempts.find(a=>a.setId===id&&a.studentId===user.id);if(!attempt)fail(409,'Hãy bắt đầu bài trước.');if(attempt.submittedAt||set.withdrawn)fail(409,'Bài đã nộp hoặc ngừng giao.');return {set,attempt};}
 function answer(user,id,input){const {set,attempt}=active(user,id),q=set.questions.find(q=>q.id===input?.questionId&&q.type==='mcq');if(!q||!Number.isInteger(input.choiceIndex)||input.choiceIndex<0||input.choiceIndex>3)fail(400,'Chọn đáp án A–D.');if(input.version!==attempt.version)fail(409,'Bài đã thay đổi ở cửa sổ khác. Tải lại trước khi chọn.');tx(()=>{attempt.answers[q.id]=input.choiceIndex;attempt.version++;});return detail(user,id);}
 async function upload(user,id,input){
  let {set,attempt}=active(user,id);const q=set.questions.find(q=>q.id===input?.questionId&&q.type==='essay');
  if(!q||!uuid(input.requestId)||!Array.isArray(input.photos)||!input.photos.length)fail(400,'Chọn câu tự luận và từ 1 đến 3 ảnh bài làm.');
  const digest=createHash('sha256').update(JSON.stringify([input.questionId,input.photos])).digest('hex');
  const previous=db.librarySubmissions.find(s=>s.attemptId===attempt.id&&s.requestId===input.requestId);
  if(previous){if(previous.digest!==digest)fail(409,'Ảnh đã thay đổi.');return safeSubmission(previous,false);}
  const normalized=await normalizeTutorImages(input.photos);
  ({set,attempt}=active(user,id));
  const concurrent=db.librarySubmissions.find(s=>s.attemptId===attempt.id&&s.requestId===input.requestId);if(concurrent){if(concurrent.digest!==digest)fail(409,'Ảnh đã thay đổi.');return safeSubmission(concurrent,false);}
  const photos=normalized.map(p=>{const bytes=Buffer.from(p.base64,'base64'),fileKey='library-'+createHash('sha256').update(bytes).digest('hex')+'.jpg';writeFile(fileKey,bytes);return {fileKey};});
  const submission={id:randomUUID(),attemptId:attempt.id,setId:id,studentId:user.id,questionId:q.id,requestId:input.requestId,digest,photos,time:now(),ai:null};
  tx(()=>{db.librarySubmissions=db.librarySubmissions.filter(s=>!(s.attemptId===attempt.id&&s.questionId===q.id));db.librarySubmissions.push(submission);attempt.version++;});return safeSubmission(submission,false);
 }
 function submit(user,id){const set=find(user,id);if(user.role!=='student')fail(403,'Chỉ học sinh được nộp bài.');finishExpired();const existing=db.libraryAttempts.find(a=>a.setId===set.id&&a.studentId===user.id);if(existing?.submittedAt)return detail(user,id);const {attempt}=active(user,id);tx(()=>{attempt.submittedAt=now();attempt.reason='submitted';attempt.version++;});return detail(user,id);}
 function submission(user,id){const s=db.librarySubmissions.find(s=>s.id===id);if(!s)fail(404,'Không tìm thấy bài nộp.');
  const set=user.role==='parent'?db.librarySets.find(v=>v.id===s.setId):find(user,s.setId);
  if(user.role==='parent'){const child=db.users.find(u=>u.id===s.studentId);if(!set||!user.studentIds?.includes(s.studentId)||!child||!linked(child,set))fail(404,'Không tìm thấy bài nộp.');}
  else if(user.role!=='teacher'&&s.studentId!==user.id)fail(404,'Không tìm thấy bài nộp.');
  if(user.role==='teacher'){const student=db.users.find(u=>u.id===s.studentId);if(!student||!linked(student,set))fail(404,'Học sinh không còn thuộc lớp.');}return {s,set,attempt:db.libraryAttempts.find(a=>a.id===s.attemptId)};}
 async function grade(user,id,grader){
  if(!['teacher','student'].includes(user.role))fail(403,'Chỉ giáo viên và học sinh được yêu cầu chấm bài.');
  const {s,set,attempt}=submission(user,id);if(!attempt?.submittedAt)fail(409,'Nộp toàn bài trước khi chấm.');
  if(user.role==='student'&&!released(set,attempt))fail(409,'Đợi hết hạn kiểm tra để xem chấm bài.');
  if(s.ai||attempt.review)return safeSubmission(s,true);if(pending.has(id))return pending.get(id);
  const job=(async()=>{try{const q=set.questions.find(q=>q.id===s.questionId),ai=await grader({question:{prompt:q.prompt,solution:q.solution,knowledge:q.topic,rubric:q.rubric},working:'',images:s.photos.map(p=>readFile(p.fileKey))});const current=submission(user,id);if(!current.attempt.review)tx(()=>{current.s.ai=ai;delete current.s.error;});return safeSubmission(current.s,true);}catch(error){const current=submission(user,id);tx(()=>{current.s.error='AI chưa chấm được. Ảnh đã lưu, giáo viên vẫn có thể xem và chốt điểm.';});throw error;}})();
  pending.set(id,job);try{return await job;}finally{pending.delete(id);}
 }
 function review(user,id,input){
  finishExpired();
  const set=find(user,id);if(user.role!=='teacher')fail(403,'Chỉ giáo viên được chốt điểm.');
  const student=db.users.find(u=>u.id===input?.studentId&&u.role==='student'),a=db.libraryAttempts.find(a=>a.setId===id&&a.studentId===input?.studentId);
  if(!student||!linked(student,set)||!a?.submittedAt)fail(400,'Chọn học sinh đã nộp bài trong lớp.');
  if(!Number.isFinite(input.score)||input.score<0||input.score>10||typeof input.comment!=='string'||!input.comment.trim()||input.comment.length>4000)fail(400,'Nhập điểm 0–10 và nhận xét.');
  tx(()=>a.review={score:input.score,comment:input.comment.trim(),teacherId:user.id,time:now()});return detail(user,id);
 }
 function image(user,id,index){const {s}=submission(user,id);if(!s.photos[index])fail(404,'Không tìm thấy ảnh.');return readFile(s.photos[index].fileKey);}
 return {catalog,publish,list,detail,start,answer,upload,submit,grade,review,image};
}
