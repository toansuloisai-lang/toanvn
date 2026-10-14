import {realRow} from './assessment-rollup.mjs';
import {randomUUID,createHash} from 'node:crypto';
import essayBank from './database/essay-bank-grade8.json' with {type:'json'};
import sharp from 'sharp';
import {validAssessmentDue} from './assessment-dates.mjs';
import {validateMath} from './math-validation.mjs';
const fail=(status,message)=>{throw Object.assign(Error(message),{status});};
export function createEssayService({db,persist,writeImage,readImage,now=Date.now}){
  db.essayBank??=structuredClone(essayBank);db.essayAssignments??=[];db.essaySubmissions??=[];db.essayStarts??=[];
  const grading=new Map();
  function tx(fn){const copy=structuredClone([db.essayAssignments,db.essaySubmissions,db.essayStarts]);try{const v=fn();persist();return v;}catch(e){[db.essayAssignments,db.essaySubmissions,db.essayStarts]=copy;throw e;}}
  const linked=(user,a,studentId=user.id)=>{const t=db.users.find(u=>u.id===a.teacherId&&u.role==='teacher'),c=db.classes.find(c=>c.id===a.classId&&c.teacherId===a.teacherId);return t?.studentIds.includes(studentId)&&c?.studentIds.includes(studentId)&&(user.role==='student'?user.id===studentId:user.role==='parent'&&user.studentIds.includes(studentId));};
  function assignment(user,id){const a=db.essayAssignments.find(a=>a.id===id);if(!a||!(user.role==='teacher'?a.teacherId===user.id:linked(user,a)))fail(404,'Không tìm thấy bài tự luận của bạn.');return a;}
  function authorizedSubmission(user,id){const s=db.essaySubmissions.find(s=>s.id===id),a=db.essayAssignments.find(a=>a.id===s?.assignmentId);if(!s||!a||!(user.role==='teacher'?a.teacherId===user.id&&user.studentIds.includes(s.studentId):linked(user,a,s.studentId)))fail(404,'Không tìm thấy bài nộp.');return {s,a};}
  const safeSubmission=s=>structuredClone(s);
  function details(user,id){
    const a=assignment(user,id),teacher=user.role==='teacher';
    const students=teacher?db.users.filter(u=>u.role==='student'&&db.classes.find(c=>c.id===a.classId)?.studentIds.includes(u.id)&&user.studentIds.includes(u.id)).map(u=>({id:u.id,name:u.name})):[{id:user.id,name:user.name}];
    const submissions=db.essaySubmissions.filter(s=>realRow(s)&&s.assignmentId===id&&(teacher?user.studentIds.includes(s.studentId):s.studentId===user.id));
    const totals=students.map(st=>{let sum=0,latest=0,graded=0,submitted=0,reviewed=0,latestGraded=0,latestReviewed=0;for(const q of a.questions){const rows=submissions.filter(s=>s.studentId===st.id&&s.questionId===q.id).sort((x,y)=>x.revision-y.revision),first=rows[0],last=rows.at(-1);if(first)submitted++;const score=first?.review?.score??first?.ai?.score;if(score!=null){sum+=score;graded++;}if(first?.review)reviewed++;if(last?.review)latestReviewed++;if((last?.review?.score??last?.ai?.score)!=null)latestGraded++;latest+=last?.review?.score??last?.ai?.score??0;}return {...st,submitted,graded,reviewed,total:a.questions.length,score:graded===a.questions.length?Math.round(sum/a.questions.length*100)/100:null,latestScore:latestGraded===a.questions.length?Math.round(latest/a.questions.length*100)/100:null,complete:graded===a.questions.length,confirmed:reviewed===a.questions.length,latestConfirmed:latestReviewed===a.questions.length};});
    return {...structuredClone(a),questions:a.questions.map(q=>teacher?structuredClone(q):{id:q.id,prompt:q.prompt,topic:q.topic,knowledge:q.knowledge,source:q.source,maxPoints:q.maxPoints}),submissions:submissions.map(safeSubmission),students:teacher?students:[],totals,startedAt:db.essayStarts.find(s=>realRow(s)&&s.assignmentId===id&&s.studentId===user.id)?.time||null};
  }
  function list(user){return db.essayAssignments.filter(a=>user.role==='teacher'?a.teacherId===user.id:user.role==='student'&&linked(user,a)).map(a=>({id:a.id,title:a.title,grade:a.grade,classId:a.classId,className:db.classes.find(c=>c.id===a.classId)?.name||'',due:a.due,withdrawn:!!a.withdrawn,questionCount:a.questions.length,submittedQuestions:new Set(db.essaySubmissions.filter(s=>realRow(s)&&s.assignmentId===a.id&&s.studentId===user.id).map(s=>s.questionId)).size}));}
  function bank(user){if(user.role!=='teacher')fail(403,'Chỉ giáo viên được xem ngân hàng tự luận.');return {questions:structuredClone(db.essayBank),classes:db.classes.filter(c=>c.teacherId===user.id).map(c=>({id:c.id,name:c.name,grade:c.grade}))};}
  function publish(user,input){
    if(user.role!=='teacher')fail(403,'Chỉ giáo viên được giao tự luận.');
    const c=db.classes.find(c=>c.id===input.classId&&c.teacherId===user.id);
    if(!c||typeof input.title!=='string'||!input.title.trim()||input.title.length>120||!/^\d{4}-\d{2}-\d{2}$/.test(input.due)||!Number.isFinite(Date.parse(input.due))||new Date(input.due).toISOString().slice(0,10)!==input.due)fail(400,'Chọn lớp, tên đề và hạn nộp hợp lệ.');
    if(!Array.isArray(input.bankIds||[])||(input.bankIds||[]).length>10||new Set(input.bankIds||[]).size!==(input.bankIds||[]).length)fail(400,'Chọn tối đa 10 câu khác nhau trong ngân hàng.');
    if(db.essayAssignments.some(a=>a.classId===c.id&&a.teacherId===user.id&&a.title===input.title.trim()))fail(409,'Lớp đã có đề mang tên này. Kiểm tra danh sách trước khi tạo lại.');
    const selected=(input.bankIds||[]).map(id=>db.essayBank.find(q=>q.id===id&&q.grade===c.grade));
    if(selected.some(q=>!q)||!Array.isArray(input.customQuestions||[]))fail(400,'Câu hỏi không đúng khối.');
    const questions=[...selected,...(input.customQuestions||[])].map(raw=>{
      const q={id:randomUUID(),prompt:validateMath(raw.prompt,8000),topic:validateMath(raw.topic,150),knowledge:validateMath(raw.knowledge,2000),solution:validateMath(raw.solution,10000),source:validateMath(raw.source||'Giáo viên tự soạn',1000)};
      if(!q.prompt||!q.topic||!q.knowledge||!q.solution||!Array.isArray(raw.rubric)||!raw.rubric.length||raw.rubric.length>10)fail(400,'Cần đề, kiến thức, lời giải và thang điểm.');
      q.rubric=raw.rubric.map((r,i)=>({id:'r'+i,description:validateMath(r.description,2000),points:Number(r.points)}));
      if(q.rubric.some(r=>!r.description||!Number.isFinite(r.points)||r.points<=0||r.points>10))fail(400,'Điểm tiêu chí phải lớn hơn 0 và không vượt 10.');
      q.maxPoints=q.rubric.reduce((s,r)=>s+r.points,0);if(Math.abs(q.maxPoints-10)>0.001)fail(400,'Mỗi câu tự luận dùng thang 10; tổng rubric phải bằng 10.');return q;
    });
    if(!questions.length||questions.length>10)fail(400,'Mỗi đề tự luận gồm 1–10 câu.');
    return tx(()=>{const a={id:randomUUID(),title:input.title.trim(),classId:c.id,teacherId:user.id,grade:c.grade,due:input.due,createdAt:now(),questions};db.essayAssignments.push(a);return {id:a.id};});
  }
  function start(user,id){if(user.role!=='student')fail(403,'Chỉ học sinh được bắt đầu bài.');const current=assignment(user,id);if(current.withdrawn)fail(409,'Giáo viên đã ngừng giao đề này.');if(!db.essayStarts.some(s=>realRow(s)&&s.assignmentId===id&&s.studentId===user.id))tx(()=>db.essayStarts.push({assignmentId:id,studentId:user.id,time:now()}));return details(user,id);}
  async function submit(user,id,input){
    if(user.role!=='student')fail(403,'Chỉ học sinh được nộp bài.');let a=assignment(user,id);if(a.withdrawn)fail(409,'Giáo viên đã ngừng giao đề này.');let q=a.questions.find(q=>q.id===input.questionId);
    if(!q||!db.essayStarts.some(s=>realRow(s)&&s.assignmentId===id&&s.studentId===user.id))fail(400,'Hãy bắt đầu bài trước khi nộp.');
    const working=validateMath(input.working||'',10000),photos=input.photos||[];
    if(!Array.isArray(photos)||photos.length>3||(!working&&!photos.length))fail(400,'Nhập cách làm hoặc tải từ 1 đến 3 ảnh.');
    if(typeof input.requestId!=='string'||!/^[a-f0-9-]{36}$/.test(input.requestId))fail(400,'Mã lần nộp không hợp lệ.');
    const previous=db.essaySubmissions.find(s=>s.studentId===user.id&&s.requestId===input.requestId);if(previous){if(previous.assignmentId!==id||previous.questionId!==q.id)fail(409,'Mã lần nộp đã thuộc câu khác.');return safeSubmission(previous);}
    const normalized=[];
    for(const photo of photos){
      if(typeof photo.base64!=='string'||photo.base64.length>6000000)fail(413,'Mỗi ảnh tối đa 4 MB.');const bytes=Buffer.from(photo.base64,'base64');
      if(bytes.length>4*1024*1024||!bytes.length||bytes.toString('base64')!==photo.base64)fail(400,'Dữ liệu ảnh không hợp lệ.');
      try{const image=sharp(bytes,{limitInputPixels:25000000,animated:false});const meta=await image.metadata();if(!['jpeg','png','webp'].includes(meta.format)||meta.pages>1)throw Error();normalized.push(await image.rotate().resize({width:2000,height:2000,fit:'inside',withoutEnlargement:true}).jpeg({quality:88}).toBuffer());}catch{fail(400,'Ảnh phải là JPG, PNG hoặc WebP hợp lệ, không quá 25 megapixel.');}
    }
    a=assignment(user,id);q=a.questions.find(q=>q.id===input.questionId);
    const duplicate=db.essaySubmissions.find(s=>s.studentId===user.id&&s.requestId===input.requestId);if(duplicate)return safeSubmission(duplicate);
    const prior=db.essaySubmissions.filter(s=>realRow(s)&&s.assignmentId===id&&s.questionId===q.id&&s.studentId===user.id);
    if(prior.length>=20)fail(429,'Đã đạt 20 lần nộp câu này; hãy trao đổi với giáo viên.');
    if(prior.at(-1)&&['pending','grading'].includes(prior.at(-1).status))fail(409,'Bài trước đang chờ chấm. Hãy chấm hoặc chờ giáo viên trước khi sửa.');
    const keys=normalized.map(()=>randomUUID()+'.jpg');normalized.forEach((image,i)=>writeImage(keys[i],image));
    return tx(()=>{const submittedAt=now(),startedAt=prior.at(-1)?.submittedAt||db.essayStarts.find(s=>realRow(s)&&s.assignmentId===id&&s.studentId===user.id).time;
      const s={id:randomUUID(),requestId:input.requestId,assignmentId:id,questionId:q.id,teacherId:a.teacherId,studentId:user.id,revision:prior.length+1,working,images:keys.map((fileKey,i)=>({fileKey,size:normalized[i].length,sha256:createHash('sha256').update(normalized[i]).digest('hex')})),startedAt,submittedAt,elapsedMs:Math.max(0,submittedAt-startedAt),late:submittedAt>Date.parse(a.due+'T23:59:59+07:00'),status:'pending',ai:null,review:null};db.essaySubmissions.push(s);return safeSubmission(s);});
  }
  async function grade(user,id,grader){
    const {s,a}=authorizedSubmission(user,id);if(user.role==='parent')fail(403,'Phụ huynh chỉ xem.');
    if(s.ai||s.review)return safeSubmission(s);if(grading.has(id))return grading.get(id);
    const task=(async()=>{try{
      const result=await grader({question:structuredClone(a.questions.find(q=>q.id===s.questionId)),working:s.working,images:s.images.map(image=>readImage(image.fileKey))});
      const fresh=authorizedSubmission(user,id).s;if(fresh.review)return safeSubmission(fresh);
      return tx(()=>{fresh.ai={...result,gradedAt:now()};fresh.status=result.readable?'pending_review':'unreadable';delete fresh.error;return safeSubmission(fresh);});
    }catch(error){const fresh=authorizedSubmission(user,id).s;if(fresh.review)return safeSubmission(fresh);return tx(()=>{fresh.status='ai_failed';fresh.error=error.status?error.message:'Chưa chấm được; bài đã lưu. Giáo viên có thể chấm thủ công.';return safeSubmission(fresh);});}finally{grading.delete(id);}})();
    grading.set(id,task);return task;
  }
  function review(user,id,input){
    if(user.role!=='teacher')fail(403,'Chỉ giáo viên được xác nhận điểm.');const {s}=authorizedSubmission(user,id);
    if(!Number.isFinite(input.score)||input.score<0||input.score>10||typeof input.comment!=='string'||!input.comment.trim())fail(400,'Nhập điểm từ 0 đến 10 và nhận xét.');
    const comment=validateMath(input.comment,6000),missingKnowledge=validateMath(input.missingKnowledge||'',2000),nextStep=validateMath(input.nextStep||'',3000);
    if(input.score<10&&(!missingKnowledge||!nextStep))fail(400,'Ghi kiến thức cần ôn và cách sửa cho bài chưa đạt điểm tối đa.');
    return tx(()=>{s.reviewHistory??=[];if(s.review)s.reviewHistory.push(s.review);s.review={score:Math.round(input.score*100)/100,comment,missingKnowledge,nextStep,teacherId:user.id,time:now()};s.status='reviewed';return safeSubmission(s);});
  }
  function image(user,id,index){const {s}=authorizedSubmission(user,id),item=s.images[index];if(!item)fail(404,'Không tìm thấy ảnh.');return readImage(item.fileKey);}
  function manage(user,id,input){
    if(user.role!=='teacher')fail(403,'Chỉ giáo viên được quản lý đề.');const a=assignment(user,id);
    if(input.action==='clone')return publish(user,{title:input.title,classId:input.classId||a.classId,due:input.due||a.due,customQuestions:a.questions});
    if(!(input.due??a.due)||!validAssessmentDue(input.due??a.due)||input.withdrawn!==undefined&&typeof input.withdrawn!=='boolean')fail(400,'Thông tin quản lý không hợp lệ.');
    return tx(()=>{a.due=input.due??a.due;if(input.withdrawn!==undefined)a.withdrawn=input.withdrawn;return {id:a.id};});
  }
  return {bank,publish,list,details,start,submit,grade,review,image,manage};
}
