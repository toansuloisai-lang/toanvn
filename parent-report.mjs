import {realRow} from './assessment-rollup.mjs';
import PDFDocument from 'pdfkit';
import {drawParentReport} from './parent-report-render.mjs';
import {drawCompactReport} from './parent-report-compact.mjs';
import {fileURLToPath} from 'node:url';
import {skills} from './public/data.js';

const skillName=(db,id)=>skills.find(s=>s.id===id)?.name||db.teacherContents?.find(c=>'teacher-'+c.id===id)?.topic||id;

export function studentReportSnapshot({db,learning,teacher,studentId}){
  // report() performs the same teacher/student authorization as the dashboard.
  const report=learning.report(teacher,studentId),rawState=db.states?.[studentId]||{attempts:[],notes:{}},state={...rawState,attempts:rawState.attempts.filter(realRow)};
  const child=db.users.find(u=>u.id===studentId&&u.role==='student');
  const catalog=learning.catalog?.(studentId)||[];
  const knowledge=learning.knowledge?.report(teacher,studentId)||null;
  const achievements=learning.knowledge?.leaderboard?(db.classes||[]).filter(c=>c.teacherId===teacher.id&&c.studentIds.includes(studentId)).map(c=>{
    const board=learning.knowledge.leaderboard(child,c.id),own=board.yourResult;
    return {classId:c.id,className:c.name,classSize:c.studentIds.length,rank:own?.rank||null,corrected:own?.corrected||0,honored:board.top.some(s=>s.studentId===studentId)};
  }):[];
  if(knowledge&&learning.essays)for(const h of knowledge.history)if(h.kind==='essay')h.photoData=h.images.map((_,i)=>learning.essays.image(teacher,h.id,i).toString('base64'));
  if(knowledge)for(const h of knowledge.history)if(['library','practice-photo'].includes(h.kind))h.photoData=(h.images||[]).map(src=>{const parts=src.split('/');return (h.kind==='library'?learning.library.image(teacher,parts[4],Number(parts[6])):learning.practicePhotos.image(teacher,parts[4],Number(parts[6]))).toString('base64');});
  return structuredClone({
    student:{id:studentId,name:state.profile?.name||child.name,grade:report.grade},
    classes:(db.classes||[]).filter(c=>c.teacherId===teacher.id&&c.studentIds.includes(studentId)).map(c=>c.name),
    summary:{attempts:state.attempts.length,exercises:new Set(state.attempts.map(a=>a.exerciseId)).size,completed:state.attempts.filter(a=>a.completed).length,correct:state.attempts.filter(a=>a.initialCorrect).length,wrong:state.attempts.filter(a=>!a.initialCorrect).length,corrected:state.attempts.filter(a=>!a.initialCorrect&&a.corrected).length},
    usage:db.usage?.[studentId]?{startedAt:db.usage[studentId].startedAt,totalMs:db.usage[studentId].totalMs,days:db.usage[studentId].days}:null,
    assignments:report.assignments.filter(a=>!a.kind||['library','practice-photo'].includes(a.kind)),
    errors:report.errors||[],comparisons:report.comparisons||[],
    knowledge,achievements,
    skills:(report.bySkill||[]).map(s=>({...s,name:skillName(db,s.skill)})),
    attempts:state.attempts.map(a=>{
      const ex=catalog.find(e=>e.id===a.exerciseId),d=db.diagnoses?.[studentId]?.[a.id];
      const reviewer=d?.teacherId?db.users.find(u=>u.id===d.teacherId):null;
      return {id:a.id,time:a.time,completed:a.completed||null,mode:a.mode,prompt:ex?.prompt||a.exerciseId,skill:skillName(db,a.skill),rule:ex?.rule||'',answer:a.answer,initialCorrect:a.initialCorrect,working:a.working||'',correction:a.correction||'',revisedWorking:a.revisedWorking||'',corrected:!!a.corrected,explanation:a.explanation||'',note:state.notes?.[a.id]||'',diagnosis:d?{type:d.type,status:d.status,source:d.source,evidence:d.evidence||'',reason:d.reason||'',nextStep:d.nextStep||'',reviewer:reviewer?.name||'',updatedAt:d.updatedAt}:null};
    }).sort((a,b)=>a.time-b.time),
    activities:(db.activities?.[studentId]||[]).map(a=>({time:a.time,title:a.title,result:a.result,correct:a.correct,explanation:a.explanation||'',notes:Object.values(a.notes||{}).map(n=>({name:n.name,text:n.text,time:n.time}))}))
  });
}

export function reportPdf({id,createdAt,teacher,teacherComment='',reports,approval=null,format='summary'}){
  return new Promise((resolve,reject)=>{
    const doc=new PDFDocument({size:'A4',margins:{top:52,bottom:55,left:46,right:46},bufferPages:true,info:{Title:'Bảng điểm và hồ sơ học tập - Math Lab',Author:teacher.name,Subject:'Báo cáo học tập gửi phụ huynh'}});
    const chunks=[];let size=0;
    doc.on('data',chunk=>{size+=chunk.length;if(size>8*1024*1024){doc.destroy();reject(Object.assign(Error('Báo cáo vượt quá 8 MB. Hãy gửi riêng từng học sinh.'),{status:413}));}else chunks.push(chunk);});
    doc.on('error',reject);doc.on('end',()=>resolve(Buffer.concat(chunks)));
    try{
      doc.registerFont('regular',fileURLToPath(new URL('./public/assets/fonts/noto-sans-400.ttf',import.meta.url)));
      doc.registerFont('bold',fileURLToPath(new URL('./public/assets/fonts/noto-sans-700.ttf',import.meta.url)));
      (format==='summary'&&reports.some(r=>r.knowledge)?drawCompactReport:drawParentReport)(doc,{id,createdAt,teacher,teacherComment,reports,approval});
      doc.end();
    }catch(error){doc.destroy();reject(error);}
  });
}
