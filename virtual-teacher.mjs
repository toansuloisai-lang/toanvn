import {randomUUID,randomBytes,scryptSync} from 'node:crypto';
import {questionLibrary} from './question-library.mjs';
import {atomic} from './database/atomic.mjs';

const fail=(status,message)=>{throw Object.assign(Error(message),{status});};
const date=t=>new Date(t+7*3600000).toISOString().slice(0,10);
const week=7*86400000;
const collections=['users','states','classes','librarySets','libraryAttempts','librarySubmissions','selfStudyRequests'];
export function createVirtualTeacher({db,persist,library,learning,now=Date.now}){
 db.selfStudyRequests??=[];
 const admin=user=>{if(user?.role!=='admin')fail(403,'Chỉ quản trị được quản lý lớp tự học.');};
 function account(role,name,studentIds=[]){const id=randomUUID(),password=randomBytes(18).toString('base64url'),salt=randomBytes(16).toString('hex'),user={id,username:(role==='student'?'hs.':role==='parent'?'ph.':'system.')+id.slice(0,18),name,role,studentIds,salt,hash:scryptSync(password,salt,64).toString('hex')};db.users.push(user);if(role==='student')db.states[id]={attempts:[],reviews:{},assignments:[],notes:{}};return {user,password};}
 function attach(studentId,grade){
  const student=db.users.find(u=>u.id===studentId&&u.role==='student');if(!student||![6,7,8,9].includes(grade))fail(400,'Chọn học sinh và khối 6–9.');
  if(db.classes.some(c=>c.studentIds.includes(studentId)&&c.grade!==grade))fail(409,'Học sinh đang ở lớp khác khối. Quản trị cần xử lý chuyển lớp trước.');
  const existing=db.classes.find(c=>c.managedBy==='system'&&c.studentIds.includes(studentId));if(existing)return existing;
  let teacher=db.users.find(u=>u.role==='teacher'&&u.virtualTeacher);
  if(!teacher){teacher=account('teacher','Giáo viên ảo của hệ thống').user;teacher.virtualTeacher=true;}
  let group=db.classes.find(c=>c.managedBy==='system'&&c.grade===grade&&c.studentIds.length<200);
  if(!group){group={id:randomUUID(),teacherId:teacher.id,name:'Tự học khối '+grade+' · '+(db.classes.filter(c=>c.managedBy==='system'&&c.grade===grade).length+1),grade,studentIds:[],created:now(),managedBy:'system',enabled:true};db.classes.push(group);}
  group.studentIds.push(studentId);if(!teacher.studentIds.includes(studentId))teacher.studentIds.push(studentId);
  db.states[studentId].profile={...db.states[studentId].profile,name:student.name,grade:String(grade)};return group;
 }
 function enroll(user,input){admin(user);const grade=Number(input?.grade),student=db.users.find(u=>u.id===input?.studentId&&u.role==='student');if(!student)fail(404,'Không tìm thấy học sinh.');const group=attach(student.id,grade);persist();return {classId:group.id};}
 function request(user,input,save=true){
  if(user?.role!=='student')fail(403,'Chỉ học sinh được gửi yêu cầu vào lớp.');
  const {studentName,parentName,parentEmail}=input||{},grade=Number(input?.grade);
  if(![studentName,parentName].every(s=>typeof s==='string'&&s.trim().length>=2&&s.length<=80)||typeof parentEmail!=='string'||parentEmail.length>254||! /^[^\s@]+@gmail\.com$/i.test(parentEmail)||![6,7,8,9].includes(grade))fail(400,'Nhập tên học sinh, tên phụ huynh, Gmail phụ huynh và khối 6–9.');
  const existing=db.selfStudyRequests.find(r=>r.studentId===user.id&&r.status!=='rejected');if(existing)return {id:existing.id,status:existing.status};
  const row={id:randomUUID(),studentId:user.id,studentName:studentName.trim(),parentName:parentName.trim(),parentEmail:parentEmail.trim().toLowerCase(),grade,status:'pending',createdAt:now()};db.selfStudyRequests.push(row);if(save)persist();return {id:row.id,status:row.status};
 }
 function register(user,input){
  admin(user);const r=db.selfStudyRequests.find(r=>r.id===input?.requestId);if(!r||r.status!=='pending')fail(409,'Yêu cầu không còn chờ xử lý.');
  if(input.action==='reject'){r.status='rejected';persist();return {status:r.status};}
  if(input.action!=='approve')fail(400,'Chọn duyệt hoặc từ chối yêu cầu.');
  const sameParent=db.users.find(u=>u.role==='parent'&&u.email?.toLowerCase()===r.parentEmail);
  if(sameParent&&sameParent.name.trim()!==r.parentName)fail(409,'Gmail đã gắn với phụ huynh khác tên. Kiểm tra lại thông tin trước khi cấp tài khoản.');
  if(sameParent&&sameParent.studentIds.some(id=>db.users.find(u=>u.id===id)?.name===r.studentName&&Number(db.states[id]?.profile?.grade)===r.grade))fail(409,'Học sinh và phụ huynh này đã có tài khoản. Dùng mục thêm học sinh đã có tài khoản.');
  let student=db.users.find(u=>u.id===r.studentId&&u.role==='student'),studentPassword;
  if(!student){const created=account('student',r.studentName);student=created.user;studentPassword=created.password;}else student.name=r.studentName;
  const parent=sameParent?{user:sameParent}:account('parent',r.parentName,[student.id]);parent.user.email=r.parentEmail;if(!parent.user.studentIds.includes(student.id))parent.user.studentIds.push(student.id);
  const group=attach(student.id,r.grade);r.status='approved';r.enrolledStudentId=student.id;r.parentId=parent.user.id;r.classId=group.id;r.reviewedAt=now();
  persist();return {status:r.status,className:group.name,credentials:[...(studentPassword?[{role:'student',username:student.username,password:studentPassword}]:[]),{role:'parent',username:parent.user.username,...(parent.password?{password:parent.password}:{existing:true})}]};
 }
 function admit(user,input){admin(user);const r=request({id:randomUUID(),role:'student'},input,false);return register(user,{requestId:r.id,action:'approve'});}
 function schedule(){
  let generated=0;
  for(const group of db.classes.filter(c=>c.managedBy==='system'&&c.enabled!==false)){
   const teacher=db.users.find(u=>u.id===group.teacherId&&u.virtualTeacher);if(!teacher)continue;
   const pupils=group.studentIds.filter(id=>db.users.some(u=>u.id===id&&u.role==='student')&&teacher.studentIds.includes(id));
   for(const id of pupils){
    const sets=db.librarySets.filter(s=>s.virtualTeacher&&!s.selfPractice&&s.classId===group.id&&s.studentIds?.includes(id));
    const latest=sets.at(-1);if(latest&&now()-latest.createdAt<week)continue;
    const pending=sets.filter(s=>!db.libraryAttempts.some(a=>a.setId===s.id&&a.studentId===id&&a.submittedAt)&&Date.parse(s.due+'T23:59:59+07:00')>now());if(pending.length>=2)continue;
    const gaps=new Set(learning.knowledge?.report(teacher,id).gaps.map(g=>g.name)||[]),used=new Set(sets.slice(-3).flatMap(s=>s.questions.map(q=>q.id)));
    const bank=questionLibrary.filter(q=>q.grade===group.grade).sort((a,b)=>Number(gaps.has(b.topic))-Number(gaps.has(a.topic))||Number(used.has(a.id))-Number(used.has(b.id))||a.id.localeCompare(b.id));
    const selected=bank.filter(q=>q.formats.includes('mcq')).slice(0,10).map(q=>({id:q.id,type:'mcq'}));
    selected.push(...bank.filter(q=>q.formats.includes('essay')&&!selected.some(v=>v.id===q.id)).slice(0,2).map(q=>({id:q.id,type:'essay'})));
    if(!selected.length)continue;
    selected.forEach((q,i)=>q.points=i===selected.length-1?10-Math.floor(1000/selected.length)/100*(selected.length-1):Math.floor(1000/selected.length)/100);
    const result=library.publish(teacher,{requestId:randomUUID(),classId:group.id,title:'Tự học khối '+group.grade+' · '+date(now())+(gaps.size?' · Củng cố kiến thức':''),mode:'practice',due:date(now()+week),questions:selected,systemStudentIds:[id]});
    const set=db.librarySets.find(s=>s.id===result.id);set.virtualTeacher=true;generated++;
   }
  }
  if(generated)persist();return {generated};
 }
 function dashboard(user){
  if(user.role==='admin')return {classes:db.classes.filter(c=>c.managedBy==='system').map(c=>({...c,students:c.studentIds.map(id=>({id,name:db.users.find(u=>u.id===id)?.name}))})),requests:db.selfStudyRequests,students:db.users.filter(u=>u.role==='student').map(u=>({id:u.id,name:u.name,grade:db.states[u.id]?.profile?.grade})),sets:db.librarySets.filter(s=>s.virtualTeacher).map(s=>({id:s.id,classId:s.classId,title:s.title,due:s.due,students:s.studentIds,submitted:db.libraryAttempts.filter(a=>a.setId===s.id&&a.submittedAt).length}))};
  if(!['student','parent'].includes(user.role))fail(403,'Không có quyền truy cập.');
  const ids=user.role==='student'?[user.id]:user.studentIds;
  return {classes:db.classes.filter(c=>c.managedBy==='system'&&c.studentIds.some(id=>ids.includes(id))).map(c=>({id:c.id,name:c.name,grade:c.grade,enabled:c.enabled})),requests:db.selfStudyRequests.filter(r=>r.studentId===user.id).map(r=>({id:r.id,status:r.status,createdAt:r.createdAt})),notice:'Hệ thống tự giao bài từ kho và theo dõi tiến độ. Điểm AI là tham khảo, không phải điểm giáo viên xác nhận.'};
 }
 function configure(user,input){admin(user);const group=db.classes.find(c=>c.id===input?.classId&&c.managedBy==='system');if(!group||typeof input.enabled!=='boolean')fail(400,'Chọn lớp và trạng thái hợp lệ.');group.enabled=input.enabled;persist();return {ok:true};}
 function practiceBank(user){
  if(user.role!=='student')fail(403,'Kho tự luyện dành cho học sinh.');const grade=Number(db.states[user.id]?.profile?.grade);
  return {grade,questions:questionLibrary.filter(q=>q.grade===grade).map(q=>({id:q.id,prompt:q.prompt,topic:q.topic,formats:q.formats}))};
 }
 function practiceQuestion(user,input){
  if(user.role!=='student')fail(403,'Chỉ học sinh được mở bài tự luyện.');
  const group=db.classes.find(c=>c.managedBy==='system'&&c.studentIds.includes(user.id));
  if(!group)fail(409,'Tham gia lớp tự học hoặc dùng chế độ học ẩn danh để mở bài trong kho.');
  const q=questionLibrary.find(q=>q.id===input?.questionId&&q.grade===group.grade&&q.formats.includes(input.type));if(!q)fail(404,'Câu hỏi không phù hợp khối hoặc dạng bài.');
  const existing=db.librarySets.find(s=>s.selfPractice&&s.studentIds?.includes(user.id)&&s.questions[0]?.id===q.id&&s.questions[0]?.type===input.type&&Date.parse(s.due+'T23:59:59+07:00')>now());if(existing)return {id:existing.id};
  if(db.librarySets.filter(s=>s.selfPractice&&s.studentIds?.includes(user.id)&&now()-s.createdAt<86400000).length>=30)fail(429,'Em đã mở 30 bài mới hôm nay. Hãy tiếp tục các bài đã mở.');
  const teacher=db.users.find(u=>u.id===group.teacherId),result=library.publish(teacher,{requestId:randomUUID(),classId:group.id,title:'Tự luyện · '+q.topic,mode:'practice',due:date(now()+week),questions:[{id:q.id,type:input.type,points:10}],systemStudentIds:[user.id],selfPractice:true});return {id:result.id};
 }
 async function gradeNext(grader){
  const setIds=new Set(db.librarySets.filter(s=>s.virtualTeacher).map(s=>s.id));
  const row=db.librarySubmissions.find(s=>setIds.has(s.setId)&&!s.ai&&!s.error&&db.libraryAttempts.some(a=>a.id===s.attemptId&&a.submittedAt&&!a.review));
  if(!row)return false;const set=db.librarySets.find(s=>s.id===row.setId),teacher=db.users.find(u=>u.id===set.teacherId);await library.grade(teacher,row.id,grader);return true;
 }
 return {practiceBank,practiceQuestion,admit:atomic(db,collections,admit),enroll:atomic(db,collections,enroll),request:atomic(db,collections,request),register:atomic(db,collections,register),schedule,dashboard,configure:atomic(db,collections,configure),gradeNext};
}
