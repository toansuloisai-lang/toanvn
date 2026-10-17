import {randomUUID,createHash} from 'node:crypto';
import {studentReportSnapshot,reportPdf} from './parent-report.mjs';
import {parentMailHtml} from './parent-mail-html.mjs';
import {REPORT_INVITATION} from './parent-letter.mjs';
const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
const validEmail=value=>typeof value==='string'&&value.length<=254&&/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value);
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function createParentMailService({db,persist,learning,mailer,writeFile,readFile}){
  db.parentMail??=[];
  db.parentReports??={};
  const approving=new Map();
  const drafts=new Map();let running=false;
  function pdfBytes(pdf){const content=pdf.fileKey?readFile(pdf.fileKey):Buffer.from(pdf.base64,'base64');if(createHash('sha256').update(content).digest('hex')!==pdf.sha256)throw Object.assign(Error('Approved PDF integrity check failed'),{code:'EREPORT'});return content;}
  for(const batch of db.parentMail)for(const r of batch.recipients)if(r.status==='sending'){r.status='unknown';r.error='Máy chủ khởi động lại khi đang gửi. Kiểm tra thư đã gửi trước khi gửi lại.';}
  const guard=user=>{if(user?.role!=='teacher')fail(403,'Chỉ giáo viên được gửi thông báo phụ huynh.');};
  const current=user=>{guard(user);const teacher=db.users.find(u=>u.id===user.id);guard(teacher);return teacher;};
  function selection(user,input){
    const teacher=current(user);let ids;
    if(input.classId){const c=db.classes.find(c=>c.id===input.classId&&c.teacherId===teacher.id);if(!c)fail(404,'Không tìm thấy lớp của bạn.');ids=c.studentIds.filter(id=>teacher.studentIds.includes(id));}
    else if(input.studentId&&teacher.studentIds.includes(input.studentId))ids=[input.studentId];
    else fail(400,'Chọn lớp hoặc học sinh được phân công.');
    const students=ids.map(id=>db.users.find(u=>u.id===id&&u.role==='student')).filter(Boolean),recipients=new Map(),missing=[];
    for(const student of students){
      const parents=db.users.filter(u=>u.role==='parent'&&u.studentIds.includes(student.id));let found=false;
      for(const parent of parents){
        if(!validEmail(parent.email))continue;found=true;
        const email=parent.email.toLowerCase(),r=recipients.get(email)||{email,parentNames:[],links:[],students:[]};
        if(!r.parentNames.includes(parent.name))r.parentNames.push(parent.name);
        r.links.push({parentId:parent.id,studentId:student.id});
        if(!r.students.some(s=>s.id===student.id))r.students.push({id:student.id,name:student.name});
        recipients.set(email,r);
      }
      if(!found)missing.push(student.name);
    }
    return {recipients:[...recipients.values()],missing};
  }
  function allowed(teacher,r){return r.links.every(link=>teacher.studentIds.includes(link.studentId)&&db.users.some(u=>u.id===link.parentId&&u.role==='parent'&&u.email?.toLowerCase()===r.email&&u.studentIds.includes(link.studentId)));}
  function publicDraft(d){
    const {fingerprint,teacherComment,...safe}=d;
    safe.recipients=d.recipients.map(({reports,pdf,...r})=>({...r,...(reports?{reportCount:reports.length}:{}),...(pdf?{pdf:{filename:pdf.filename,sha256:pdf.sha256}}:{})}));
    return safe;
  }
  function history(user){const teacher=current(user);return db.parentMail.filter(b=>b.teacherId===teacher.id).slice(-30).reverse().map(b=>publicDraft(b));}
  function reportHistory(user){const teacher=current(user);return Object.values(db.parentReports).filter(d=>d.teacherId===teacher.id&&d.recipients.every(r=>allowed(teacher,r))).sort((a,b)=>b.approval.time-a.approval.time).slice(0,30).map(d=>publicDraft(d));}
  function options(user){const teacher=current(user);return {...mailer.status(),classes:learning.classes(teacher),students:db.users.filter(u=>u.role==='student'&&teacher.studentIds.includes(u.id)).map(u=>({id:u.id,name:u.name})),history:history(teacher),reports:reportHistory(teacher)};}
  function preview(user,input){
    const teacher=current(user);
    if(typeof input.subject!=='string'||!input.subject.trim()||input.subject.length>160||/[\r\n\x00]/.test(input.subject)||typeof input.message!=='string'||!input.message.trim()||input.message.length>4000)fail(400,'Nhập tiêu đề tối đa 160 ký tự và lời nhắn tối đa 4.000 ký tự.');
    if(input.teacherComment!==undefined&&(typeof input.teacherComment!=='string'||input.teacherComment.length>4000))fail(400,'Nhận xét giáo viên tối đa 4.000 ký tự.');
    const resolved=selection(teacher,input);
    if(!resolved.recipients.length)fail(400,'Chưa có email phụ huynh hợp lệ. Kiểm tra danh sách phụ huynh được nhập từ Excel.');
    if(resolved.recipients.length>200)fail(400,'Mỗi lần gửi tối đa 200 phụ huynh.');
    const recipients=resolved.recipients.map(r=>{
      const reports=input.includeReport===true?r.students.map(s=>studentReportSnapshot({db,learning,teacher,studentId:s.id})):null;
      let text=`Kính gửi phụ huynh ${r.parentNames.join(', ')},\n\nHọc sinh: ${r.students.map(s=>s.name).join(', ')}.\n\n${input.message.trim()}`;
      if(input.includeReport===true)text+='\n\n'+REPORT_INVITATION;
      text+=`\n\nTrân trọng,\n${teacher.name}\nTrường THCS Lạc Đạo – Hưng Yên`;
      return {...r,id:randomUUID(),text,html:parentMailHtml({text,reports,createdAt:Date.now(),message:input.message}),status:'pending',...(reports?{reports}:{})};
    });
    for(const [id,d] of drafts)if(d.expires<Date.now())drafts.delete(id);
    if(drafts.size>=100)fail(429,'Có quá nhiều bản xem trước. Vui lòng thử lại sau.');
    const draft={id:randomUUID(),teacherId:teacher.id,teacherName:teacher.name,teacherComment:(input.teacherComment||'').trim(),includeReport:input.includeReport===true,createdAt:Date.now(),subject:input.subject.trim(),recipients,missing:resolved.missing,expires:Date.now()+15*60*1000};
    draft.reportFormat=input.reportFormat==='full'?'full':'summary';
    draft.fingerprint=digest({teacher:teacher.id,format:draft.reportFormat,subject:draft.subject,teacherComment:draft.teacherComment,recipients:recipients.map(r=>({email:r.email,text:r.text,reports:r.reports}))});
    drafts.set(draft.id,draft);return publicDraft(draft);
  }
  function findDraft(user,id){
    const teacher=current(user),draft=db.parentReports[id]||drafts.get(id);
    if(!draft||draft.teacherId!==teacher.id)fail(404,'Không tìm thấy bản báo cáo.');
    if(draft.recipients.some(r=>!allowed(teacher,r)))fail(409,'Liên kết hoặc email phụ huynh đã thay đổi. Hãy xem trước lại.');
    return {teacher,draft};
  }
  async function approve(user,id,confirmed){
    const {teacher,draft}=findDraft(user,id);
    if(confirmed!==true)fail(400,'Giáo viên cần xác nhận đã xem báo cáo.');
    if(draft.approval)return publicDraft(draft);
    if(!draft.includeReport||draft.expires<Date.now())fail(400,'Bản nháp không có PDF hoặc đã hết hạn.');
    if(draft.teacherComment.length<10)fail(400,'Nhập nhận xét giáo viên ít nhất 10 ký tự rồi tạo lại bản xem trước.');
    if(approving.has(id))return approving.get(id);
    const task=(async()=>{
      const approved=structuredClone(draft);approved.approval={teacherId:teacher.id,name:teacher.name,time:Date.now()};
      let bytes=0;
      for(const r of approved.recipients){
        const content=await reportPdf({format:draft.reportFormat,id,createdAt:draft.createdAt,teacher:{name:draft.teacherName},teacherComment:draft.teacherComment,reports:r.reports,approval:approved.approval});
        bytes+=content.length;if(bytes>40*1024*1024)fail(413,'Đợt báo cáo quá lớn. Hãy chia nhỏ nhóm học sinh.');
        const sha256=createHash('sha256').update(content).digest('hex'),fileKey='report-'+sha256+'.pdf';
        if(writeFile)writeFile(fileKey,content);
        r.pdf={filename:`bang-diem-${r.id}.pdf`,...(writeFile?{fileKey,size:content.length}:{base64:content.toString('base64')}),sha256};
      }
      findDraft(user,id);if(draft.expires<Date.now())fail(409,'Bản nháp đã hết hạn. Hãy xem trước lại.');
      db.parentReports[id]=approved;try{persist();}catch(error){delete db.parentReports[id];throw error;}
      drafts.delete(id);return publicDraft(approved);
    })();
    approving.set(id,task);try{return await task;}finally{approving.delete(id);}
  }
  async function pdf(user,id,recipientId){
    const {draft}=findDraft(user,id),recipient=draft.recipients.find(r=>r.id===recipientId);
    if(!recipient?.reports||(!draft.approval&&draft.expires<Date.now()))fail(404,'Báo cáo không tồn tại hoặc đã hết hạn.');
    const content=recipient.pdf?pdfBytes(recipient.pdf):await reportPdf({format:draft.reportFormat,id,createdAt:draft.createdAt,teacher:{name:draft.teacherName},teacherComment:draft.teacherComment,reports:recipient.reports});
    findDraft(user,id);
    return {content,filename:recipient.pdf?.filename||`ban-nhap-${recipient.id}.pdf`};
  }
  function send(user,id){
    const teacher=current(user),previous=db.parentMail.find(b=>b.id===id&&b.teacherId===teacher.id);if(previous)return previous;
    if(!mailer.status().configured)fail(503,'Chưa cấu hình Gmail gửi thư trên máy chủ.');
    const draft=db.parentReports[id]||drafts.get(id);if(!draft||draft.teacherId!==teacher.id||draft.expires<Date.now())fail(404,'Bản xem trước hết hạn. Hãy xem lại nội dung.');
    if(draft.recipients.some(r=>!allowed(teacher,r)))fail(409,'Liên kết hoặc email phụ huynh đã thay đổi. Hãy xem trước lại.');
    if(draft.includeReport&&!draft.approval)fail(409,'Giáo viên cần xem và xác nhận PDF trước khi gửi.');
    const duplicate=db.parentMail.find(b=>b.teacherId===teacher.id&&b.fingerprint===draft.fingerprint&&b.created>Date.now()-15*60*1000);if(duplicate)return duplicate;
    const recent=db.parentMail.filter(b=>b.created>Date.now()-24*60*60*1000).reduce((n,b)=>n+b.recipients.length,0);
    if(recent+draft.recipients.length>300)fail(429,'Hệ thống giới hạn 300 email trong 24 giờ. Vui lòng gửi phần còn lại sau.');
    const batch={...structuredClone(publicDraft(draft)),fingerprint:draft.fingerprint,created:Date.now(),...(draft.includeReport?{reportId:draft.id}:{})};delete batch.expires;
    db.parentMail.push(batch);try{persist();}catch(error){db.parentMail.pop();throw error;}
    drafts.delete(id);setImmediate(()=>flush());return batch;
  }
  async function flush(){
    if(running||!mailer.status().configured)return;running=true;
    try{
      for(const batch of db.parentMail)for(const r of batch.recipients){
        if(r.status!=='pending')continue;
        const teacher=db.users.find(u=>u.id===batch.teacherId&&u.role==='teacher');
        if(!teacher||!allowed(teacher,r)){r.status='skipped';r.error='Quyền hoặc email phụ huynh đã thay đổi.';persist();continue;}
        r.status='sending';r.updated=Date.now();
        try{persist();}catch(error){r.status='failed';r.error='Không ghi được hàng đợi; chưa gửi thư này.';throw error;}
        try{
          const archive=batch.reportId?db.parentReports[batch.reportId]:null;
          const attachment=archive?.recipients.find(a=>a.id===r.id)?.pdf;
          if(batch.reportId&&(!archive?.approval||!attachment))throw Object.assign(Error('Missing approved report'),{code:'EREPORT'});
          await mailer.send({email:r.email,subject:batch.subject,text:r.text,html:r.html,id:r.id,...(attachment?{attachments:[{filename:attachment.filename,content:pdfBytes(attachment),contentType:'application/pdf'}]}:{})});r.status='sent';r.error='';
        }
        catch(error){
          const definitive=['EAUTH','EENVELOPE','EREPORT'].includes(error.code)||Number(error.responseCode)>=400;
          r.status=definitive?'failed':'unknown';r.error=definitive?'Gmail từ chối gửi. Kiểm tra cấu hình Gmail và địa chỉ nhận.':'Chưa xác định Gmail đã nhận thư hay chưa. Kiểm tra thư đã gửi trước khi tạo thông báo mới.';
        }
        r.updated=Date.now();
        try{persist();}catch(error){r.status='unknown';r.error='Không lưu được kết quả gửi. Kiểm tra thư đã gửi trước khi tạo thông báo mới.';throw error;}
      }
    }catch{console.error('Email queue stopped: could not persist delivery state.');}
    finally{running=false;}
  }
  // Only already-confirmed pending messages resume; interrupted sends are never retried automatically.
  if(db.parentMail.some(b=>b.recipients.some(r=>r.status==='pending')))setImmediate(()=>flush());
  return {options,preview,approve,pdf,send,history,reportHistory,flush};
}
