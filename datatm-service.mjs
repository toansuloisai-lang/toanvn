import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {skills} from './public/data.js';
export const datatmBank=JSON.parse(readFileSync(new URL('./data/datatm-bank.json',import.meta.url),'utf8')).questions;
const fail=(status,message)=>{throw Object.assign(Error(message),{status});};
const fold=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replaceAll('đ','d').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const aliases={fractions6:'phân số',ratio7:'tỉ lệ thuận',pythagoras8:'Pythagore',equation:'phương trình bậc nhất'};
export function matchQuestions(m,grade,bank=datatmBank){
 const topic=fold([m.topic,m.knowledge,aliases[m.topic],skills.find(s=>s.id===m.topic)?.name].join(' ')),prompt=fold(m.prompt);
 return bank.filter(q=>q.grade===Number(grade)&&q.review?.status==='verified'&&fold(q.prompt)!==prompt).map(q=>{
  const matched=q.tags.filter(t=>topic.includes(fold(t))||prompt.includes(fold(t)));
  return {q,matched,score:matched.reduce((n,t)=>n+fold(t).split(' ').length,0)+(topic.includes(fold(q.topic))?8:0)};
 }).filter(r=>r.score>0).sort((a,b)=>b.score-a.score||a.q.id.localeCompare(b.q.id));
}
function fraction(text){
 let value=String(text).trim().replaceAll('−','-').replaceAll(',','.');
 if(value.length>100)return null;
 const parts=value.split('/');if(parts.length>2)return null;
 const decimal=s=>{if(!/^[+-]?\d+(?:\.\d+)?$/.test(s.trim()))return null;const v=s.trim(),places=v.split('.')[1]?.length||0;return [BigInt(v.replace('.','')),10n**BigInt(places)];};
 const a=decimal(parts[0]),b=parts[1]===undefined?[1n,1n]:decimal(parts[1]);
 return !a||!b||b[0]===0n?null:[a[0]*b[1],a[1]*b[0]];
}
export function gradeDatatm(answer,q){
 let input=String(answer??'').trim();
 if(q.unit&&input.toLowerCase().endsWith(q.unit.toLowerCase()))input=input.slice(0,-q.unit.length).trim();
 const a=fraction(input),b=fraction(q.answer);return !!a&&!!b&&a[0]*b[1]===b[0]*a[1];
}
const unlocked=m=>m.resolved||m.repairs?.at(-1)?.correct;
export const publicQuestion=q=>({id:q.id,grade:q.grade,topic:q.topic,prompt:q.prompt,unit:q.unit,source:{file:q.source.file.split('/').at(-1),question:q.source.question,section:q.source.section,adaptation:q.source.adaptation}});
export function decorateDatatm(mistakes,grade,attempts,studentId,bank=datatmBank){
 for(const m of mistakes){
  const history=attempts.filter(a=>a.studentId===studentId&&(a.mistakeKey===m.key||m.datatmQuestionId===a.questionId));
  const solved=new Set(attempts.filter(a=>a.studentId===studentId&&a.correct).map(a=>a.questionId));
  const candidates=matchQuestions(m,grade,bank),seen=new Set(history.map(a=>a.questionId)),retry=history.at(-1)?.correct?null:history.at(-1)?.questionId;
  const questions=candidates.filter(r=>!solved.has(r.q.id)).sort((a,b)=>Number(b.q.id===retry)-Number(a.q.id===retry)||Number(seen.has(a.q.id))-Number(seen.has(b.q.id))||b.score-a.score).slice(0,3).map(r=>({...publicQuestion(r.q),reason:'Cùng kiến thức: '+r.matched.join(', ')}));
  m.datatm={unlocked:!!unlocked(m),matched:candidates.length,questions:unlocked(m)?questions:[],history:history.map(({snapshot,...a})=>({...a,question:publicQuestion(snapshot),answerKey:snapshot.answer,solution:snapshot.solution})),progress:{attempts:history.length,independentCorrect:new Set(history.filter(a=>a.independentCorrect).map(a=>a.questionId)).size,corrected:new Set(history.filter(a=>a.correct&&!a.independentCorrect).map(a=>a.questionId)).size}};
 }
}
export function createDatatmService({db,persist,knowledge,bank=datatmBank,now=Date.now}){
 db.datatmAttempts??=[];
 function list(user,input={}){const r=knowledge.report(user,input.studentId);return {student:r.student,groups:r.mistakes.map(m=>({key:m.key,title:m.title,topic:m.topic,...m.datatm}))};}
 function context(user,input){
  if(user.role!=='student')fail(403,'Chỉ học sinh được làm bài củng cố của mình.');
  if(!input||typeof input!=='object'||Array.isArray(input)||typeof input.key!=='string')fail(400,'Chọn lỗi sai cần củng cố.');
  const report=knowledge.report(user,user.id),m=report.mistakes.find(m=>m.key===input.key);
  if(!m)fail(404,'Không tìm thấy lỗi sai trong hồ sơ của em.');
  if(!unlocked(m))fail(409,'Em cần sửa đúng bài gốc trước khi làm bài củng cố.');
  return {report,m,candidates:matchQuestions(m,report.student.grade,bank)};
 }
 function submit(user,input){
  let m,candidates;
  if(input?.offerId){
   if(user.role!=='student')fail(403,'Chỉ học sinh được nộp bài của mình.');
   const message=(db.tutorThreads||[]).filter(t=>t.studentId===user.id).flatMap(t=>t.messages).find(m=>m.id===input.offerId&&m.role==='assistant');
   const offer=message?.offers?.find(o=>o.questionId===input.questionId),q=bank.find(q=>q.id===offer?.questionId&&q.grade===Number(db.states[user.id]?.profile?.grade||7)&&q.review?.status==='verified');
   if(!q)fail(403,'Bài này không được gia sư giao cho tài khoản và khối lớp của em.');
   m={key:offer.mistakeKey||'chat:'+message.id};candidates=[{q}];
  }else ({m,candidates}=context(user,input));
  const q=candidates.find(r=>r.q.id===input.questionId)?.q;
  if(!q)fail(400,'Câu hỏi không thuộc kiến thức hoặc khối lớp cần củng cố.');
  if(typeof input.answer!=='string'||!input.answer.trim()||input.answer.length>150||typeof input.working!=='string'||input.working.trim().length<5||input.working.length>5000||typeof input.requestId!=='string'||!/^[a-zA-Z0-9-]{10,80}$/.test(input.requestId))fail(400,'Nhập đáp án và cách làm (ít nhất 5 ký tự).');
  const duplicate=db.datatmAttempts.find(a=>a.studentId===user.id&&a.requestId===input.requestId);
  if(duplicate){if(duplicate.questionId!==q.id||duplicate.mistakeKey!==m.key)fail(409,'Mã nộp bài đã được dùng.');return result(duplicate);}
  if(db.datatmAttempts.some(a=>a.studentId===user.id&&a.questionId===q.id&&a.correct))fail(409,'Em đã hoàn thành câu này. Hãy chọn bài tiếp theo.');
  const prior=db.datatmAttempts.some(a=>a.studentId===user.id&&a.questionId===q.id),correct=gradeDatatm(input.answer,q);
  const a={id:randomUUID(),studentId:user.id,mistakeKey:m.key,questionId:q.id,...(input.offerId?{offerId:input.offerId}:{}),requestId:input.requestId,time:now(),answer:input.answer.trim(),working:input.working.trim(),correct,independentCorrect:correct&&!prior,firstForQuestion:!prior,snapshot:structuredClone(q)};
  db.datatmAttempts.push(a);try{persist();}catch(error){db.datatmAttempts.splice(db.datatmAttempts.indexOf(a),1);throw error;}return result(a);
 }
 const result=a=>({id:a.id,correct:a.correct,independentCorrect:a.independentCorrect,answer:a.snapshot.answer,unit:a.snapshot.unit,solution:a.snapshot.solution});
 function aiContext(user,input){const {m,candidates}=context(user,input),solved=new Set(db.datatmAttempts.filter(a=>a.studentId===user.id&&a.correct).map(a=>a.questionId));return {scope:'student',grade:Number(db.states[user.id].profile?.grade||7),mistake:{prompt:m.prompt,knowledge:m.knowledge,analysis:m.analysis,repairs:m.repairs.map(r=>({correct:r.correct,working:r.working}))},candidates:candidates.filter(r=>!solved.has(r.q.id)).slice(0,12).map(r=>({...publicQuestion(r.q),reason:'Cùng kiến thức: '+r.matched.join(', ')}))};}
 return {list,submit,aiContext};
}
