import {createLearningService} from './learning-service.mjs';
import {atomic} from './database/atomic.mjs';
import {createExamService} from './exam-service.mjs';
import {createEssayService} from './essay-service.mjs';
import {createKnowledgeService} from './knowledge-service.mjs';
import {createDatatmService} from './datatm-service.mjs';
import {createTutorService} from './tutor-service.mjs';
import {createParentMailService} from './parent-mail.mjs';
import {studentCatalog,historicalContentIds,validDue} from './learning-access.mjs';
import {createRosterService} from './roster-import.mjs';
import {validateContent,asExercise} from './teacher-content.mjs';
import {readFileSync,writeFileSync,renameSync,mkdirSync,existsSync} from 'node:fs';
import path from 'node:path';
import {randomBytes,randomUUID,scryptSync,timingSafeEqual,createHash} from 'node:crypto';
import {exercises,skills,checkAnswer} from './public/data.js';
import {demoLessons} from './public/demo-lessons.js';

export const emptyState=()=>({attempts:[],reviews:{},assignments:[],notes:{}});
const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
const str=(s,max)=>typeof s==='string'&&s.length<=max;
const publicUser=u=>({id:u.id,username:u.username,name:u.name,role:u.role,studentIds:u.studentIds,...(u.role==='parent'?{email:u.email||''}:{})});
export function createStore(filename=process.env.MATH_DB_PATH||path.resolve('private/accounts.json'),{storage}={}){
  let db=storage?storage.load():existsSync(filename)?JSON.parse(readFileSync(filename,'utf8')):{users:[],states:{}};
  const sessions=new Map(),limits=new Map();
  const attachmentKeys=new Set(),pendingAttachmentKeys=new Set();
  function collectFiles(value){if(!value||typeof value!=='object')return;if(typeof value.fileKey==='string')attachmentKeys.add(value.fileKey);for(const child of Object.values(value))if(child&&typeof child==='object')collectFiles(child);}
  collectFiles(db);
  db.lessonPublications??=[];
  db.uploadedLessons??=[];
  db.teacherContents??=[];
  for(const u of db.users)if(u.role==='student'&&db.states[u.id]?.profile?.name?.trim())u.name=db.states[u.id].profile.name.trim();
  function teacherContents(user){return db.teacherContents.filter(c=>canReadUpload(user,c));}
  function archivedContents(user){if(user.role!=='student')return [];const ids=historicalContentIds(db,user.id);return db.teacherContents.filter(c=>c.kind==='exercise'&&ids.has(c.id)&&!canReadUpload(user,c));}
  function publishContent(user,input){if(user.role!=='teacher')fail(403,'Only teachers can publish.');const content={...validateContent(input),id:randomUUID(),teacherId:user.id,publishedAt:Date.now()};db.teacherContents.push(content);persist();return {content};}
  function contentExercises(user){return [...teacherContents(user),...archivedContents(user)].filter(c=>c.kind==='exercise').map(asExercise);}
  function persist(){try{if(storage)storage.save(db);else{mkdirSync(path.dirname(filename),{recursive:true});writeFileSync(filename+'.tmp',JSON.stringify(db),{mode:0o600});renameSync(filename+'.tmp',filename);}pendingAttachmentKeys.clear();}catch(error){for(const key of pendingAttachmentKeys)attachmentKeys.delete(key);pendingAttachmentKeys.clear();throw error;}}
  function createUser(input){
    const {username,password,name,role,studentIds=[]}=input;
    if(!str(username,60)||!/^[a-z0-9._-]{3,60}$/.test(username)||!str(password,200)||password.length<12||!str(name,80)||!name.trim()||!['student','teacher','parent','admin'].includes(role)||!Array.isArray(studentIds)||studentIds.length>200||studentIds.some(id=>!db.users.some(u=>u.id===id&&u.role==='student'))||(studentIds.length&&!['teacher','parent'].includes(role)))fail(400,'Thông tin tài khoản không hợp lệ; mật khẩu cần ít nhất 12 ký tự.');
    if(db.users.some(u=>u.username===username))fail(409,'Tên đăng nhập đã tồn tại.');
    const salt=randomBytes(16).toString('hex'),hash=scryptSync(password,salt,64).toString('hex');
    const user={id:randomUUID(),username,name:name.trim(),role,studentIds:[...new Set(studentIds)],salt,hash};
    db.users.push(user);if(role==='student')db.states[user.id]=emptyState();persist();return publicUser(user);
  }
  function login(username,password,ip,expectedRole){
    const now=Date.now();for(const [k,v] of limits)if(now-v.start>900000)limits.delete(k);
    const key=String(ip)+'|'+String(username).trim().toLowerCase(),limit=limits.get(key)||{start:now,count:0};limits.set(key,limit);
    if(++limit.count>20)fail(429,'Đã thử đăng nhập quá nhiều lần. Vui lòng chờ 15 phút.');
    if(!str(username,60)||!str(password,200))fail(401,'Tên đăng nhập hoặc mật khẩu không đúng.');
    const user=db.users.find(u=>u.username===username);
    const hash=scryptSync(password,user?.salt||'invalid-account-salt',64);
    if(!user||!timingSafeEqual(hash,Buffer.from(user.hash,'hex'))||(expectedRole&&user.role!==expectedRole))fail(401,'Tên đăng nhập hoặc mật khẩu không đúng.');
    limits.delete(key);const token=randomBytes(32).toString('hex');
    for(const [k,v] of sessions)if(v.expires<=now)sessions.delete(k);
    sessions.set(token,{id:user.id,expires:now+8*60*60*1000});return{token,user:publicUser(user)};
  }
  function authenticate(token){const session=sessions.get(token);if(!session||session.expires<=Date.now()){sessions.delete(token);return null;}return db.users.find(u=>u.id===session.id)||null;}
  function student(user,id){
    const target=id||(user.role==='student'?user.id:user.studentIds[0]);
    if(user.role==='student'?target!==user.id:!['teacher','parent'].includes(user.role)||!user.studentIds.includes(target))fail(403,'Bạn không được truy cập học sinh này.');
    if(!db.states[target])fail(404,'Không tìm thấy học sinh.');return target;
  }
  function workspace(user,id){
    if(user.role==='admin')return{user:publicUser(user),users:db.users.map(publicUser),state:emptyState(),students:[]};
    const students=(user.role==='student'?[user]:db.users.filter(u=>user.studentIds.includes(u.id))).map(publicUser);
    if(!students.length&&!id)return{user:publicUser(user),students,state:emptyState(),studentId:null};
    const target=student(user,id);return{user:publicUser(user),students,studentId:target,state:{...db.states[target],classGrade:db.classes?.find(c=>c.studentIds.includes(target))?.grade||null,diagnoses:db.diagnoses?.[target]||{}},archivedContents:archivedContents(user)};
  }
  function saveStudent(user,input){
    if(user.role!=='student')fail(403,'Chỉ học sinh được lưu bài làm của mình.');
    const {attempts,reviews,profile}=input;
    const exercisesForUser=studentCatalog(db,user.id);
    if(!Array.isArray(attempts)||attempts.length>20000||!reviews||typeof reviews!=='object'||Array.isArray(reviews))fail(400,'Dữ liệu học tập không hợp lệ.');
    const existing=new Map(db.states[user.id].attempts.map(a=>[a.id,a]));
    const clean=attempts.map(a=>{
      if(!a||!str(a.id,36)||!/^[a-f0-9-]{36}$/.test(a.id)||!exercisesForUser.some(e=>e.id===a.exerciseId&&e.skill===a.skill)||!Number.isFinite(a.time)||typeof a.initialCorrect!=='boolean'||!str(a.answer,100)||!['practice','review','transfer'].includes(a.mode)|| (a.explanation!==undefined&&!str(a.explanation,2000)))fail(400,'Bài làm không hợp lệ.');
      if(a.working!==undefined&&!str(a.working,4000))fail(400,'Cách làm tối đa 4.000 ký tự.');
      if(a.correction!==undefined&&!str(a.correction,100))fail(400,'Đáp án sửa chưa hợp lệ.');
      const old=existing.get(a.id),ex=exercisesForUser.find(e=>e.id===a.exerciseId);
      if(old&&(old.exerciseId!==a.exerciseId||old.answer!==a.answer||old.skill!==a.skill))fail(409,'Không thể sửa đáp án đầu đã lưu.');
      if(a.revisedWorking!==undefined&&!str(a.revisedWorking,4000))fail(400,'Các bước sửa tối đa 4.000 ký tự.');
      const modern=!old||a.working!==undefined||old?.working!==undefined;
      const corrected=a.corrected===true&&!!a.correction&&checkAnswer(a.correction,ex.answer);
      const explanation=old?.completed?old.explanation:a.explanation??old?.explanation;
      return{revisedWorking:old?.completed?old.revisedWorking||'':a.revisedWorking??old?.revisedWorking??'',id:a.id,exerciseId:a.exerciseId,skill:a.skill,time:old?.time??Math.min(Date.now(),Math.max(0,a.time)),mode:old?.mode??a.mode,answer:old?.answer??a.answer,initialCorrect:old?.initialCorrect??checkAnswer(a.answer,ex.answer),corrected:old?.corrected||corrected,...(old?.completed?{completed:old.completed}:Number.isFinite(a.completed)&&corrected?{completed:Math.min(Date.now(),Math.max(old?.time??a.time,a.completed))}:{}),...(explanation?{explanation}:{}),...(modern?{working:old?.working??a.working??'',correction:old?.corrected&&old.correction?old.correction:a.correction||old?.correction||''}:{})};
    });
    if(new Set(clean.map(a=>a.id)).size!==clean.length)fail(400,'Bài làm bị trùng.');
    const cleanReviews={};for(const [id,r] of Object.entries(reviews)){if(!exercisesForUser.some(e=>e.id===id)||!r||!Number.isFinite(r.due)||![0,1,2].includes(r.interval))fail(400,'Lịch ôn không hợp lệ.');cleanReviews[id]={due:r.due,interval:r.interval};}
    if(profile&&(!str(profile.name,80)||!profile.name.trim()||!['6','7','8','9'].includes(String(profile.grade))))fail(400,'Hồ sơ không hợp lệ.');
    if(profile&&db.classes?.some(c=>c.studentIds.includes(user.id)&&Number(c.grade)!==Number(profile.grade)))fail(409,'Khối học được quản lý theo lớp. Hãy liên hệ giáo viên để chuyển lớp.');
    const state=db.states[user.id];state.attempts=[...clean,...state.attempts.filter(a=>!clean.some(c=>c.id===a.id))];state.reviews={...state.reviews,...cleanReviews};if(profile){state.profile={name:profile.name.trim(),grade:String(profile.grade)};db.users.find(u=>u.id===user.id).name=state.profile.name;}persist();return{ok:true};
  }
  function assign(user,input){
    if(user.role!=='teacher')fail(403,'Chỉ giáo viên được giao nhiệm vụ.');
    const target=student(user,input.studentId);
    if(!str(input.title,200)||!input.title.trim()||!skills.some(s=>s.id===input.skill)||!validDue(input.due))fail(400,'Nhiệm vụ không hợp lệ.');
    const grade=Number(db.states[target].profile?.grade||7),exerciseIds=exercises.filter(e=>e.skill===input.skill&&e.grades.includes(grade)).map(e=>e.id);
    if(!exerciseIds.length)fail(400,'Chủ đề không có bài phù hợp khối của học sinh.');
    db.states[target].assignments.push({id:randomUUID(),title:input.title.trim(),skill:input.skill,exerciseIds,grade,due:input.due,created:Date.now(),teacherId:user.id});persist();return{ok:true};
  }
  function note(user,input){
    if(user.role!=='teacher')fail(403,'Chỉ giáo viên được nhận xét.');
    const target=student(user,input.studentId);
    if(!db.states[target].attempts.some(a=>a.id===input.attemptId)||!str(input.text,1500)||!input.text.trim())fail(400,'Nhận xét không hợp lệ.');
    db.states[target].notes[input.attemptId]=input.text.trim();persist();return{ok:true};
  }
  function link(user,input){
    if(user.role!=='admin')fail(403,'Chỉ quản trị được phân công học sinh.');
    const target=db.users.find(u=>u.id===input.userId);
    if(!target||!['teacher','parent'].includes(target.role)||!Array.isArray(input.studentIds)||input.studentIds.some(id=>!db.users.some(u=>u.id===id&&u.role==='student')))fail(400,'Liên kết không hợp lệ.');
    target.studentIds=[...new Set(input.studentIds)];persist();return{ok:true};
  }
  function updateParentEmail(user,input){
    if(user.role!=='admin')fail(403,'Chỉ quản trị được cập nhật email phụ huynh.');
    const target=db.users.find(u=>u.id===input.userId&&u.role==='parent'),email=typeof input.email==='string'?input.email.trim().toLowerCase():'';
    if(!target||email.length>254||! /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email))fail(400,'Chọn phụ huynh và nhập email hợp lệ.');
    if(db.users.some(u=>u.id!==target.id&&u.email?.toLowerCase()===email))fail(409,'Email này đã thuộc tài khoản khác. Kiểm tra lại liên kết gia đình.');
    const old=target.email;target.email=email;try{persist();}catch(error){target.email=old;throw error;}return {ok:true};
  }
  function resetPassword(user,input){
    if(user.role!=='admin')fail(403,'Chỉ quản trị được đặt lại mật khẩu.');
    const target=db.users.find(u=>u.id===input.userId);
    if(!target||target.id===user.id||!str(input.password,200)||input.password.length<12)fail(400,'Chọn tài khoản khác và nhập mật khẩu mới từ 12 đến 200 ký tự.');
    const old={salt:target.salt,hash:target.hash};target.salt=randomBytes(16).toString('hex');target.hash=scryptSync(input.password,target.salt,64).toString('hex');
    try{persist();}catch(error){Object.assign(target,old);throw error;}
    for(const [token,s] of sessions)if(s.id===target.id)sessions.delete(token);return {ok:true};
  }
  function importLessons(user){
    if(user.role!=='teacher')fail(403,'Chỉ giáo viên được nạp bộ bài học.');
    const existing=new Set(db.lessonPublications.map(l=>l.id));let added=0;
    for(const lesson of demoLessons)if(!existing.has(lesson.id)){db.lessonPublications.push({id:lesson.id,publishedAt:Date.now(),teacherId:user.id});added++;}
    if(added)persist();return{added,total:db.lessonPublications.length};
  }
  const uploadDir=path.join(path.dirname(filename),'uploads');
  function canReadUpload(user,lesson){return user.role==='teacher'?lesson.teacherId===user.id:user.role==='student'&&db.users.some(u=>u.id===lesson.teacherId&&u.role==='teacher'&&u.studentIds.includes(user.id))&&Number(db.states[user.id]?.profile?.grade||7)===lesson.grade;}
  const publicLesson=({fileKey,sha256,...lesson})=>lesson;
  function uploadedLessons(user){return db.uploadedLessons.filter(l=>canReadUpload(user,l)).map(publicLesson);}
  function uploadLesson(user,input){
    if(user.role!=='teacher')fail(403,'Chỉ giáo viên được tải bài lên.');
    const {title,description='',grade,filename:originalName,base64}=input;
    if(!str(title,120)||!title.trim()||!str(description,8000)||![6,7,8,9].includes(Number(grade))||!str(originalName,160)||/[\\/\x00-\x1f]/.test(originalName)||!str(base64,14000000)||!base64||!/^[A-Za-z0-9+/]*={0,2}$/.test(base64))fail(400,'Thông tin bài học hoặc file không hợp lệ.');
    const content=Buffer.from(base64,'base64'),ext=path.extname(originalName).toLowerCase();
    if(!content.length||content.length>10*1024*1024)fail(413,'File phải nhỏ hơn hoặc bằng 10 MB.');
    if(base64!==content.toString('base64'))fail(400,'Dữ liệu file không hợp lệ.');
    if(ext==='.pdf'){
      if(content.subarray(0,5).toString()!=='%PDF-'||!content.subarray(-2048).includes(Buffer.from('%%EOF')))fail(400,'File không có cấu trúc PDF hợp lệ.');
    }else if(ext==='.docx'){
      if(content.length<4||content.readUInt32LE(0)!==0x04034b50||!content.includes(Buffer.from('[Content_Types].xml'))||!content.includes(Buffer.from('word/document.xml'))||content.includes(Buffer.from('vbaProject.bin')))fail(400,'Chọn file Word .docx hợp lệ, không chứa macro.');
    }else fail(400,'Chỉ nhận PDF hoặc Word .docx.');
    const hash=createHash('sha256').update(content).digest('hex');
    const duplicate=db.uploadedLessons.find(l=>l.teacherId===user.id&&l.sha256===hash&&l.grade===Number(grade)&&l.title===title.trim()&&l.description===description.trim());
    if(duplicate)return{lesson:publicLesson(duplicate),duplicate:true};
    const id=randomUUID(),fileKey=id+ext;
    if(storage)storage.stageFile(fileKey,content);
    else{mkdirSync(uploadDir,{recursive:true});writeFileSync(path.join(uploadDir,fileKey),content,{mode:0o600});}
    const lesson={id,title:title.trim(),description:description.trim(),grade:Number(grade),filename:originalName,size:content.length,format:ext.slice(1),teacherId:user.id,teacherName:user.name,publishedAt:Date.now(),fileKey,sha256:hash};
    db.uploadedLessons.push(lesson);persist();return{lesson:publicLesson(lesson),duplicate:false};
  }
  function uploadedFile(user,id){const lesson=db.uploadedLessons.find(l=>l.id===id);if(!lesson||!canReadUpload(user,lesson))fail(404,'Không tìm thấy tài liệu hoặc bạn không có quyền truy cập.');return{lesson:publicLesson(lesson),content:storage?storage.readFile(lesson.fileKey):readFileSync(path.join(uploadDir,lesson.fileKey))};}
  function writeAttachment(key,bytes){if(attachmentKeys.has(key))return;if(storage)storage.stageFile(key,bytes);else{mkdirSync(uploadDir,{recursive:true});const file=path.join(uploadDir,key);if(!existsSync(file))writeFileSync(file,bytes,{mode:0o600});}attachmentKeys.add(key);pendingAttachmentKeys.add(key);}
  const readAttachment=key=>storage?storage.readFile(key):readFileSync(path.join(uploadDir,key));
  const learning=createLearningService({db,persist,student});
  const exams=createExamService({db,persist});
  const essays=createEssayService({db,persist,writeImage(key,bytes){if(storage)storage.stageFile(key,bytes);else{mkdirSync(uploadDir,{recursive:true});writeFileSync(path.join(uploadDir,key),bytes,{mode:0o600});}},readImage:key=>storage?storage.readFile(key):readFileSync(path.join(uploadDir,key))});
  const knowledge=createKnowledgeService({db,persist,learning});
  const datatm=createDatatmService({db,persist,knowledge});
  const tutor=createTutorService({db,persist,knowledge,learning,writeFile:writeAttachment,readFile:readAttachment});
  learning.knowledge=knowledge;
  learning.essays=essays;
  learning.enableParentMail=mailer=>createParentMailService({db,persist,learning,mailer,writeFile:writeAttachment,readFile:readAttachment});
  learning.updateParentEmail=updateParentEmail;learning.resetPassword=resetPassword;
  learning.roster=createRosterService({db,persist});
  return{checkHealth:()=>storage?.checkHealth(),close:()=>storage?.close(),exams,essays,knowledge,datatm,tutor,learning,teacherContents,publishContent:atomic(db,['teacherContents'],publishContent),contentExercises,createUser:atomic(db,['users','states'],createUser),login,authenticate,workspace,saveStudent:atomic(db,['users','states'],saveStudent),assign:atomic(db,['states'],assign),note:atomic(db,['states'],note),link:atomic(db,['users'],link),importLessons:atomic(db,['lessonPublications'],importLessons),uploadLesson:atomic(db,['uploadedLessons'],uploadLesson),uploadedLessons,uploadedFile,lessonPublications:()=>db.lessonPublications.map(({id,publishedAt})=>({id,publishedAt})),logout:token=>sessions.delete(token),users:()=>db.users.map(publicUser)};
}
