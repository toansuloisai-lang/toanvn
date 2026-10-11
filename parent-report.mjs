import PDFDocument from 'pdfkit';
import {drawParentReport} from './parent-report-render.mjs';
import {fileURLToPath} from 'node:url';
import {skills} from './public/data.js';

const skillName=(db,id)=>skills.find(s=>s.id===id)?.name||db.teacherContents?.find(c=>'teacher-'+c.id===id)?.topic||id;

export function studentReportSnapshot({db,learning,teacher,studentId}){
  // report() performs the same teacher/student authorization as the dashboard.
  const report=learning.report(teacher,studentId),state=db.states?.[studentId]||{attempts:[],notes:{}};
  const child=db.users.find(u=>u.id===studentId&&u.role==='student');
  const catalog=learning.catalog?.(studentId)||[];
  return structuredClone({
    student:{id:studentId,name:state.profile?.name||child.name,grade:report.grade},
    classes:(db.classes||[]).filter(c=>c.teacherId===teacher.id&&c.studentIds.includes(studentId)).map(c=>c.name),
    summary:{attempts:state.attempts.length,exercises:new Set(state.attempts.map(a=>a.exerciseId)).size,completed:state.attempts.filter(a=>a.completed).length,correct:state.attempts.filter(a=>a.initialCorrect).length,wrong:state.attempts.filter(a=>!a.initialCorrect).length,corrected:state.attempts.filter(a=>!a.initialCorrect&&a.corrected).length},
    usage:db.usage?.[studentId]?{startedAt:db.usage[studentId].startedAt,totalMs:db.usage[studentId].totalMs,days:db.usage[studentId].days}:null,
    assignments:report.assignments,
    errors:report.errors||[],comparisons:report.comparisons||[],
    skills:(report.bySkill||[]).map(s=>({...s,name:skillName(db,s.skill)})),
    attempts:state.attempts.map(a=>{
      const ex=catalog.find(e=>e.id===a.exerciseId),d=db.diagnoses?.[studentId]?.[a.id];
      const reviewer=d?.teacherId?db.users.find(u=>u.id===d.teacherId):null;
      return {id:a.id,time:a.time,completed:a.completed||null,mode:a.mode,prompt:ex?.prompt||a.exerciseId,skill:skillName(db,a.skill),rule:ex?.rule||'',answer:a.answer,initialCorrect:a.initialCorrect,working:a.working||'',correction:a.correction||'',revisedWorking:a.revisedWorking||'',corrected:!!a.corrected,explanation:a.explanation||'',note:state.notes?.[a.id]||'',diagnosis:d?{type:d.type,status:d.status,source:d.source,evidence:d.evidence||'',reason:d.reason||'',nextStep:d.nextStep||'',reviewer:reviewer?.name||'',updatedAt:d.updatedAt}:null};
    }).sort((a,b)=>a.time-b.time),
    activities:(db.activities?.[studentId]||[]).map(a=>({time:a.time,title:a.title,result:a.result,correct:a.correct,explanation:a.explanation||'',notes:Object.values(a.notes||{}).map(n=>({name:n.name,text:n.text,time:n.time}))}))
  });
}

export function reportPdf({id,createdAt,teacher,teacherComment='',reports,approval=null}){
  return new Promise((resolve,reject)=>{
    const doc=new PDFDocument({size:'A4',margins:{top:52,bottom:55,left:46,right:46},bufferPages:true,info:{Title:'Bảng điểm và hồ sơ học tập - Math Lab',Author:teacher.name,Subject:'Báo cáo học tập gửi phụ huynh'}});
    const chunks=[];let size=0;
    doc.on('data',chunk=>{size+=chunk.length;if(size>8*1024*1024){doc.destroy();reject(Object.assign(Error('Báo cáo vượt quá 8 MB. Hãy gửi riêng từng học sinh.'),{status:413}));}else chunks.push(chunk);});
    doc.on('error',reject);doc.on('end',()=>resolve(Buffer.concat(chunks)));
    try{
      doc.registerFont('regular',fileURLToPath(new URL('./public/assets/fonts/noto-sans-400.ttf',import.meta.url)));
      doc.registerFont('bold',fileURLToPath(new URL('./public/assets/fonts/noto-sans-700.ttf',import.meta.url)));
      drawParentReport(doc,{id,createdAt,teacher,teacherComment,reports,approval});
      doc.end();
    }catch(error){doc.destroy();reject(error);}
  });
}
