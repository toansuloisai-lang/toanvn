import {normalizeTutorImages} from './tutor-images.mjs';
import {randomUUID,createHash} from 'node:crypto';
import {datatmBank,matchQuestions,publicQuestion} from './datatm-service.mjs';
import {skills} from './public/data.js';
const fail=(status,message)=>{throw Object.assign(Error(message),{status});};
const fold=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[đĐ]/g,'d').toLowerCase();
const concepts=[['căn bậc hai',/can\s*b(?:a|at)c?\s*hai|can bat hai|can thuc|sqrt|roots9/],['phân số',/phan so|quy dong|fractions6/],['tỉ lệ thuận',/ti le thuan|ty le thuan|ratio7/],['tỉ lệ nghịch',/ti le nghich|ty le nghich/],['hằng đẳng thức',/hang dang thuc|identity8/],['Pythagore',/pytha|pitago/],['phương trình bậc hai',/phuong trinh bac hai|quadratic9/],['hệ phương trình',/he phuong trinh|systems9/],['phương trình bậc nhất',/phuong trinh bac nhat|lap phuong trinh|equation/],['xác suất',/xac suat|khong gian mau|bien co|ket qua co the|ket qua thuan loi|phep thu/],['hàm số',/ham so|do thi|he so goc/],['hình thoi',/hinh thoi/],['hình thang cân',/hinh thang/],['hình bình hành',/hinh binh hanh/],['số nguyên tố',/so nguyen to|hop so/],['ước chung',/uoc chung|ucln/],['bội chung',/boi chung|bcnn/],['đường tròn',/duong tron|circle9/],['lượng giác',/luong giac|trig9/],['số âm',/so am|so nguyen|sign/],['thu gọn biểu thức',/thu gon|combine|phan phoi|distribute/]];
export function tutorFocus(text,previous=''){if(/toan bo ho so|tat ca.*loi|dang toan nao|nhung dang.*sai|phan em dang yeu/.test(fold(text)))return '';return concepts.filter(([,pattern])=>pattern.test(fold(text))).map(([name])=>name).join('; ')||previous;}
export function createTutorService({db,persist,knowledge,learning,now=Date.now,writeFile,readFile}){
 db.tutorThreads??=[];const running=new Set();
 const hydrateImages=images=>(images||[]).map(i=>i.fileKey?{mimeType:i.mimeType,base64:readFile(i.fileKey).toString('base64')}:{...i});
 function storeImages(images){return images.map(i=>{if(!writeFile)return i;const bytes=Buffer.from(i.base64,'base64'),sha256=createHash('sha256').update(bytes).digest('hex'),fileKey='chat-'+sha256+'.jpg';writeFile(fileKey,bytes);return {mimeType:i.mimeType,fileKey,size:bytes.length,sha256};});}
 function guard(user){if(user.role!=='student'||!db.states[user.id]||!db.users.some(u=>u.id===user.id&&u.role==='student'))fail(403,'Gia sư này dành cho tài khoản học sinh.');}
 function thread(user,id){guard(user);const t=db.tutorThreads.find(t=>t.id===id&&t.studentId===user.id);if(!t)fail(404,'Không tìm thấy cuộc trò chuyện của em.');return t;}
 function publicMessage(m,user){return {...m,...(m.images?{images:hydrateImages(m.images)}:{}),offers:m.offers?.map(o=>{const q=datatmBank.find(q=>q.id===o.questionId);return {...o,question:q?publicQuestion(q):null,attempts:db.datatmAttempts.filter(a=>a.studentId===user.id&&a.offerId===m.id&&a.questionId===o.questionId).map(a=>({id:a.id,answer:a.answer,working:a.working,correct:a.correct,independentCorrect:a.independentCorrect,time:a.time,solution:a.snapshot.solution,expected:a.snapshot.answer}))};})};}
 function list(user){guard(user);return {threads:db.tutorThreads.filter(t=>t.studentId===user.id).slice().sort((a,b)=>b.updatedAt-a.updatedAt).map(({id,title,updatedAt})=>({id,title,updatedAt})),grade:Number(db.states[user.id].profile?.grade||7)};}
 function details(user,id){const t=thread(user,id);return {...t,messages:t.messages.map(m=>publicMessage(m,user))};}
 function context(user,message,previous=''){
  guard(user);const r=knowledge.report(user,user.id),focus=tutorFocus(message,previous),terms=focus.split('; ').filter(Boolean);
  const relevant=text=>!terms.length||terms.some(t=>tutorFocus(text).split('; ').includes(t));
  const mistakes=r.mistakes.filter(m=>relevant([m.topic,m.knowledge,m.prompt].join(' '))).slice(0,8);
  const evidence=mistakes.map((m,i)=>({id:'E'+(i+1),key:m.key,title:m.title,topic:m.topic,prompt:m.prompt,analysis:m.analysis,knowledge:m.knowledge,resolved:m.resolved,provisional:m.provisional,repairs:m.repairs.slice(-2).map(a=>({correct:a.correct,working:a.working,review:a.review})),href:m.href}));
  // Include original answers and work, not only an AI diagnosis of the error.
  for(const e of evidence){const m=mistakes.find(m=>m.key===e.key);if(m.kind==='practice'){const a=db.states[user.id].attempts.find(a=>'practice:'+a.id===m.key);if(a)Object.assign(e,{originalAnswer:a.answer,originalWorking:a.working,correction:a.correction});}else if(m.kind==='exam'){e.originalAnswer=m.originalAnswer===null?'Chưa trả lời':m.choices?.[m.originalAnswer];}else{const first=(db.essaySubmissions||[]).find(s=>'essay:'+s.id===m.key);if(first)e.originalWorking=first.working;}}
  const observed=r.history.filter(h=>relevant([h.topic,h.title,h.prompt,...(h.questions||[]).map(q=>q.topic+' '+q.prompt)].join(' '))).slice(0,12).map(h=>({kind:h.kind,title:h.title,score:h.score,provisional:h.provisional,time:h.time,questions:h.questions?.filter(q=>relevant(q.topic+' '+q.prompt)).map(q=>({prompt:q.prompt,answer:q.answer,correct:q.correct,topic:q.topic}))}));
  const solved=new Set(db.datatmAttempts.filter(a=>a.studentId===user.id&&a.correct).map(a=>a.questionId));
  const queries=focus?[{topic:focus,prompt:message}]:mistakes.map(m=>({topic:m.topic,knowledge:m.knowledge,prompt:m.prompt}));
  const retrieved=new Map();for(const query of queries)for(const match of matchQuestions(query,r.student.grade)){if(!solved.has(match.q.id)&&!retrieved.has(match.q.id)){const origin=mistakes.find(m=>matchQuestions(m,r.student.grade).some(v=>v.q.id===match.q.id));retrieved.set(match.q.id,{...publicQuestion(match.q),source:'datatm',sourceDetail:publicQuestion(match.q).source,mistakeKey:origin?.key||null});}}
  const candidates=[...retrieved.values()].slice(0,10);
  const catalog=learning.catalog(user.id).filter(q=>q.grades.includes(Number(r.student.grade))&&relevant([q.skill,skills.find(s=>s.id===q.skill)?.name,q.prompt].join(' ')));
  if(focus)for(const q of catalog.slice(0,4))candidates.push({id:q.id,prompt:q.prompt,topic:skills.find(s=>s.id===q.skill)?.name||q.skill,source:'application',href:'#learn/'+encodeURIComponent(q.id)});
  const practice=db.datatmAttempts.filter(a=>a.studentId===user.id&&relevant([a.snapshot.topic,...a.snapshot.tags].join(' '))).slice(-10).map(a=>({prompt:a.snapshot.prompt,topic:a.snapshot.topic,answer:a.answer,working:a.working,correct:a.correct,firstForQuestion:a.firstForQuestion,independentCorrect:a.independentCorrect,time:a.time}));
  const fullCatalog=learning.catalog(user.id),attempts=db.states[user.id].attempts.flatMap(a=>{const q=fullCatalog.find(q=>q.id===a.exerciseId);return q&&relevant(q.skill+' '+q.prompt)?[{prompt:q.prompt,topic:skills.find(s=>s.id===q.skill)?.name||q.skill,initialCorrect:a.initialCorrect,answer:a.answer,working:a.working,corrected:a.corrected,correction:a.correction,revisedWorking:a.revisedWorking,time:a.time}]:[];}).sort((a,b)=>b.time-a.time).slice(0,30);
  const data={grade:Number(r.student.grade),focus:focus||null,evidence,observed,attempts,practice,candidates,coverage:{datatmCandidates:candidates.filter(q=>q.source==='datatm').length,scope:'Chỉ kho câu hỏi đã kiểm tra, không phải toàn bộ tài liệu DATATM.'}};
  return {data,focus,revision:createHash('sha256').update(JSON.stringify(data)).digest('hex')};
 }
 async function send(user,input,generate){
  guard(user);if(input&&Array.isArray(input.images)&&input.images.length&&!String(input.message||'').trim())input={...input,message:'Giải thích giúp em bài toán trong ảnh.'};
  if(input?.images&&(!Array.isArray(input.images)||input.images.length>3))fail(400,'Chọn tối đa 3 ảnh.');
  const imageDigest=createHash('sha256').update(JSON.stringify(input?.images||[])).digest('hex');
  if(!input||typeof input.message!=='string'||!input.message.trim()||input.message.length>4000||typeof input.requestId!=='string'||!/^[a-zA-Z0-9-]{10,80}$/.test(input.requestId))fail(400,'Nhập câu hỏi tối đa 4.000 ký tự.');
  const old=input.threadId?thread(user,input.threadId):null;
  const duplicate=db.tutorThreads.find(t=>t.studentId===user.id&&t.messages.some(m=>m.requestId===input.requestId));
  if(duplicate){const original=duplicate.messages.find(m=>m.requestId===input.requestId);if((original.imageDigest||createHash('sha256').update('[]').digest('hex'))!==imageDigest||original.text!==input.message.trim()||(input.threadId&&duplicate.id!==input.threadId))fail(409,'Mã gửi câu hỏi đã được dùng cho nội dung khác.');return details(user,duplicate.id);}
  if(old?.messages.length>=80)fail(409,'Cuộc trò chuyện đã dài. Em mở cuộc trò chuyện mới để tiếp tục nhé.');
  if(!old&&db.tutorThreads.filter(t=>t.studentId===user.id).length>=50)fail(409,'Em đã có 50 cuộc trò chuyện. Hãy tiếp tục một cuộc trò chuyện hiện có.');
  if(running.has(user.id))fail(409,'Gia sư đang trả lời câu trước. Em chờ một chút nhé.');
  running.add(user.id);
  try{
   const images=await normalizeTutorImages(input.images);
   const current=context(user,input.message,old?.focus),result=await generate({data:current.data,history:(old?.messages||[]).map(m=>({role:m.role,text:m.text,images:hydrateImages(m.images)})),images,message:input.message.trim()});
   if(context(user,input.message,old?.focus).revision!==current.revision)fail(409,'Bài làm vừa thay đổi. Em gửi lại để gia sư xem hồ sơ mới nhé.');
   const selected=current.data.candidates.filter(q=>result.exerciseIds.includes(q.id)),selectedEvidence=current.data.evidence.filter(e=>result.evidenceIds.includes(e.id));
   const t=old||{id:randomUUID(),studentId:user.id,title:input.message.trim().slice(0,70),messages:[],createdAt:now()},before={messages:[...t.messages],updatedAt:t.updatedAt,focus:t.focus};
   const m={id:randomUUID(),role:'assistant',text:result.reply,time:now(),plan:result.plan,evidence:selectedEvidence,focus:current.focus,offers:selected.filter(q=>q.source==='datatm').map(q=>({questionId:q.id,mistakeKey:q.mistakeKey})),links:selected.filter(q=>q.source==='application')};
   t.messages.push({id:randomUUID(),role:'user',text:input.message.trim(),time:now(),requestId:input.requestId,imageDigest,...(images.length?{images:storeImages(images)}:{})},m);t.focus=current.focus;t.updatedAt=now();if(!old)db.tutorThreads.push(t);
   try{persist();}catch(error){if(old)Object.assign(t,before);else db.tutorThreads.splice(db.tutorThreads.indexOf(t),1);throw error;}
   return details(user,t.id);
  }finally{running.delete(user.id);}
 }
 return {list,details,send,context};
}
