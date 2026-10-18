import {randomUUID,createHash} from 'node:crypto';
import {normalizeTutorImages} from './tutor-images.mjs';
import {studentCatalog} from './learning-access.mjs';
const fail=(status,message)=>{throw Object.assign(Error(message),{status});};
export function createPracticePhotos({db,persist,student,writeFile,readFile}){
 const pending=new Map();
 const rows=id=>db.states[id]?.practicePhotos||[];
 function find(user,id){
  const owners=user.role==='student'?[user.id]:['teacher','parent'].includes(user.role)?user.studentIds:[];
  for(const owner of owners){const item=rows(owner).find(r=>r.id===id);if(item)return {owner,item};}
  fail(404,'Không tìm thấy bài làm của bạn.');
 }
 const publicRow=({photos,digest,answer,rule,...row})=>({...structuredClone(row),provisionalScore:row.type==='mcq'?row.choiceScore:row.ai?.readable?row.ai.score:null,finalScore:row.review?.score??null,status:row.review?'final':'pending_teacher',photos:photos.map((_,i)=>`/api/practice/photos/${row.id}/images/${i}`)});
 function change(owner,fn){const before=structuredClone(rows(owner));try{const value=fn();persist();return value;}catch(error){db.states[owner].practicePhotos=before;throw error;}}
 function list(user,{studentId,exerciseId}={}){const owner=student(user,studentId);return rows(owner).filter(r=>!exerciseId||r.exerciseId===exerciseId).slice(-100).reverse().map(publicRow);}
 function submitChoice(user,input){
  if(user.role!=='student')fail(403,'Chỉ học sinh được nộp bài.');
  if(!input||typeof input.requestId!=='string'||!/^[a-f0-9-]{36}$/.test(input.requestId)||!Number.isInteger(input.choiceIndex))fail(400,'Chọn một đáp án.');
  const ex=studentCatalog(db,user.id).find(e=>e.id===input.exerciseId&&e.type==='mcq'&&e.grades.includes(Number(db.states[user.id]?.profile?.grade||7)));
  if(!ex)fail(404,'Không tìm thấy câu trắc nghiệm dành cho em.');
  if(input.choiceIndex<0||input.choiceIndex>=ex.choices.length)fail(400,'Đáp án không hợp lệ.');
  const digest=createHash('sha256').update(JSON.stringify([ex.id,input.choiceIndex])).digest('hex');
  const previous=rows(user.id).find(r=>r.requestId===input.requestId);
  if(previous){if(previous.digest!==digest)fail(409,'Bài đã thay đổi. Hãy nộp lượt mới.');return publicRow(previous);}
  if(rows(user.id).length>=1000)fail(400,'Đã đạt giới hạn bài nộp.');
  const correct=input.choiceIndex===ex.correctIndex;
  const item={id:randomUUID(),requestId:input.requestId,digest,exerciseId:ex.id,type:'mcq',prompt:ex.prompt,choices:ex.choices,choiceIndex:input.choiceIndex,correctIndex:ex.correctIndex,correct,feedback:ex.rule,choiceScore:correct?10:0,time:Date.now(),photos:[],ai:null,review:null};
  change(user.id,()=>{db.states[user.id].practicePhotos??=[];db.states[user.id].practicePhotos.push(item);});return publicRow(item);
 }
 async function submit(user,input){
  if(user.role!=='student')fail(403,'Chỉ học sinh được nộp bài luyện tập.');
  if(!input||typeof input.requestId!=='string'||!/^[a-f0-9-]{36}$/.test(input.requestId)||typeof input.working!=='string'||input.working.length>4000||!Array.isArray(input.photos)||!input.photos.length||input.photos.length>3)fail(400,'Chọn từ 1 đến 3 ảnh; cách làm tối đa 4.000 ký tự.');
  const ex=studentCatalog(db,user.id).find(e=>e.id===input.exerciseId);if(!ex)fail(404,'Không tìm thấy bài luyện tập dành cho em.');
  const digest=createHash('sha256').update(JSON.stringify([input.exerciseId,input.working,input.photos])).digest('hex');
  const previous=rows(user.id).find(r=>r.requestId===input.requestId);
  if(previous){if(previous.digest!==digest)fail(409,'Bài đã thay đổi. Hãy nộp thành lượt mới.');return publicRow(previous);}
  const normalized=await normalizeTutorImages(input.photos);
  // A repeated request may have finished while the images were being decoded.
  const concurrent=rows(user.id).find(r=>r.requestId===input.requestId);
  if(concurrent){if(concurrent.digest!==digest)fail(409,'Bài đã thay đổi.');return publicRow(concurrent);}
  if(rows(user.id).length>=1000)fail(400,'Đã đạt giới hạn bài ảnh; liên hệ giáo viên để được hỗ trợ.');
  const photos=normalized.map(image=>{const bytes=Buffer.from(image.base64,'base64'),sha=createHash('sha256').update(bytes).digest('hex'),fileKey='practice-'+sha+'.jpg';writeFile(fileKey,bytes);return {fileKey,size:bytes.length};});
  const item={id:randomUUID(),requestId:input.requestId,digest,exerciseId:ex.id,prompt:ex.prompt,rule:ex.rule,answer:ex.answer,working:input.working,time:Date.now(),photos,ai:null,review:null};
  change(user.id,()=>{db.states[user.id].practicePhotos??=[];db.states[user.id].practicePhotos.push(item);});return publicRow(item);
 }
 async function grade(user,id,grader){
  const {owner,item}=find(user,id);if(user.role==='parent')fail(403,'Phụ huynh chỉ được xem bài làm.');
  if(item.type==='mcq')return publicRow(item);
  if(item.ai||item.review)return publicRow(item);
  if(pending.has(id))return pending.get(id);
  const job=(async()=>{
   try{
    const ai=await grader({question:{prompt:item.prompt,solution:item.answer,knowledge:item.rule,rubric:[{id:'reasoning',points:10,description:'Kết quả và lập luận toán học đúng; đánh giá các bước thực sự có trong bài. '+item.rule}]},working:item.working,images:item.photos.map(p=>readFile(p.fileKey))});
    const current=find(user,id);if(current.item.review)return publicRow(current.item);
    change(owner,()=>{current.item.ai=ai;delete current.item.error;});return publicRow(current.item);
   }catch(error){const current=find(user,id);change(owner,()=>{current.item.error='Chưa chấm được. Bài và ảnh đã lưu; có thể chấm lại hoặc nhờ giáo viên xem.';});throw error;}
  })();pending.set(id,job);try{return await job;}finally{pending.delete(id);}
 }
 function review(user,id,input){if(user.role!=='teacher')fail(403,'Chỉ giáo viên được xác nhận điểm.');const {owner,item}=find(user,id);if(!Number.isFinite(input?.score)||input.score<0||input.score>10||typeof input.comment!=='string'||!input.comment.trim()||input.comment.length>4000)fail(400,'Nhập điểm từ 0 đến 10 và nhận xét.');change(owner,()=>{item.review={score:input.score,comment:input.comment,teacherId:user.id,time:Date.now()};});return publicRow(item);}
 function image(user,id,index){const {item}=find(user,id),photo=item.photos[index];if(!photo)fail(404,'Không tìm thấy ảnh.');return readFile(photo.fileKey);}
 return {list,submit,submitChoice,grade,review,image};
}
