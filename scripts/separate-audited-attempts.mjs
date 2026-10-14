// One-off migration using exact audit IDs. Stop the application before --apply.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
export function separateAuditedAttempts(db,audit,{sourceHash,now=Date.now()}={}){
 if(!Array.isArray(audit.runs)||!audit.runs.length)throw Error('Missing audit runs');
 const ids=new Set();
 const rows=audit.runs.map(r=>{
  if(ids.has(r.attemptId))throw Error('Duplicate audit attempt');ids.add(r.attemptId);
  const matches=(db.examAttempts||[]).filter(a=>a.id===r.attemptId);
  const a=matches[0];if(matches.length!==1||a.studentId!==r.studentId||a.examId!==r.examId||a.score!==r.score)throw Error('Audit does not match stored attempt: '+r.attemptId);
  return a;
 });
 for(const a of rows)if(!a.testRun)a.testRun={kind:'authorized-system-check',source:'bao-cao-8a4/run-audit.json',sourceHash,markedAt:now,purpose:audit.purpose};
 return {matched:rows.length,total:(db.examAttempts||[]).length,real:(db.examAttempts||[]).filter(a=>!a.testRun).length};
}
if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(import.meta.filename)){
 const file=path.resolve('private/accounts.json'),auditFile=path.resolve('private/bao-cao-8a4/run-audit.json');
 const original=fs.readFileSync(file),auditBytes=fs.readFileSync(auditFile),db=JSON.parse(original);
 const result=separateAuditedAttempts(db,JSON.parse(auditBytes),{sourceHash:createHash('sha256').update(auditBytes).digest('hex')});
 if(process.argv.includes('--apply')){
  const backup=file+'.before-test-separation-'+Date.now()+'.bak';fs.writeFileSync(backup,original,{flag:'wx'});
  if(!fs.readFileSync(file).equals(original))throw Error('Database changed; stop the application and retry.');
  const temporary=file+'.separation.tmp';fs.writeFileSync(temporary,JSON.stringify(db,null,2),{flag:'wx'});fs.renameSync(temporary,file);
  console.log(JSON.stringify({...result,applied:true,backup}));
 }else console.log(JSON.stringify({...result,applied:false}));
}
