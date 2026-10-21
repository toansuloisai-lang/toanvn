import fs from 'node:fs/promises';
const root='private/datatm-supplement',file=`${root}/app/accounts.json`;
const db=JSON.parse(await fs.readFile(file,'utf8'));
const key=l=>l.teacherId+':'+l.grade+':'+l.sha256;
const published=new Map(db.uploadedLessons.filter(l=>l.visibility!=='teacher').map(l=>[key(l),l]));
const removed=new Set();let count=0;
for(const phase of [1,2]){
 const manifestFile=`${root}/phase${phase}-staged.json`,manifest=JSON.parse(await fs.readFile(manifestFile,'utf8'));
 for(const row of manifest.documents){
  if(!['staged_teacher_only','existing'].includes(row.status))continue;
  const old=published.get(key(row));if(!old||old.id===row.lessonId)continue;
  removed.add(row.lessonId);row.status='previously_available';row.previousLessonId=old.id;row.note='Same content, grade and teacher already present; no duplicate source imported.';count++;
 }
 await fs.writeFile(manifestFile,JSON.stringify(manifest,null,2));
}
db.uploadedLessons=db.uploadedLessons.filter(l=>!removed.has(l.id));
await fs.writeFile(file+'.tmp',JSON.stringify(db),{mode:0o600});await fs.rename(file+'.tmp',file);
console.log(JSON.stringify({duplicatesAlreadyInApp:count,sourceDocumentsKept:db.uploadedLessons.length,productionChanged:false}));
