// Use only after deploying the source-review capability. Never replace the production snapshot.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
const root='private/datatm-supplement',base=process.env.DATATM_APP_URL||'https://toanvn.skytruong.com';
const manifests=await Promise.all([1,2].map(n=>fs.readFile(`${root}/phase${n}-staged.json`,'utf8').then(JSON.parse)));
const docs=manifests.flatMap(m=>m.documents).filter(d=>['staged_teacher_only','existing'].includes(d.status));
if(!process.argv.includes('--apply')){console.log(JSON.stringify({mode:'dry-run',base,documents:docs.length,teacherOnly:true,note:'No remote reads/writes. Deploy code before using --apply.'}));process.exit(0);}
const credentials=JSON.parse(await fs.readFile('private/tai-khoan-hien-tai.json','utf8'));
const teacher7=JSON.parse(await fs.readFile('private/7a8-provision.json','utf8')).teacher;
const local=JSON.parse(await fs.readFile(`${root}/app/accounts.json`,'utf8'));
const auth=new Map(),progressFile=`${root}/production-import.json`;
const progress=JSON.parse(await fs.readFile(progressFile,'utf8').catch(()=>'[]'));
const save=async()=>{await fs.writeFile(progressFile+'.tmp',JSON.stringify(progress,null,2),{mode:0o600});await fs.rename(progressFile+'.tmp',progressFile);};
async function request(route,cookie,data){const r=await fetch(base+route,{method:data?'POST':'GET',headers:{cookie,'content-type':'application/json'},...(data?{body:JSON.stringify(data)}:{}),signal:AbortSignal.timeout(120000)});if(!r.ok)throw Error(`Request failed ${r.status}: ${route}`);return r;}
for(const teacherId of new Set(docs.map(d=>d.teacherId))){
 const user=local.users.find(u=>u.id===teacherId);
 const credential=user.username===teacher7.username?teacher7:credentials.find(c=>c.username===user.username&&c.role==='teacher');
 if(!credential)throw Error('Missing authorized teacher credentials');
 const login=await fetch(base+'/api/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username:credential.username,password:credential.password})});
 if(!login.ok)throw Error('Teacher login failed');const cookie=login.headers.get('set-cookie').split(';')[0];
 const workspace=await(await request('/api/workspace',cookie)).json();if(workspace.user.id!==teacherId||workspace.user.role!=='teacher')throw Error('Teacher identity mismatch');
 const status=await(await request('/api/status',cookie)).json();
 if(!status.features?.sourceDocumentReview)throw Error('Live app does not support teacher-only review. No documents uploaded. Deploy first.');
 auth.set(teacherId,cookie);
}
for(const d of docs){
 const key=d.teacherId+':'+d.grade+':'+d.sha256;if(progress.some(r=>r.key===key))continue;
 const metadata=local.uploadedLessons.find(l=>l.id===d.lessonId);if(!metadata||metadata.visibility!=='teacher')throw Error('Expected teacher-only staged document');
 const bytes=await fs.readFile(d.source);if(createHash('sha256').update(bytes).digest('hex')!==d.sha256)throw Error('Source changed');
 const r=await request('/api/teacher/lessons/upload',auth.get(d.teacherId),{title:metadata.title,description:metadata.description,grade:d.grade,filename:path.basename(d.source).slice(-160),base64:bytes.toString('base64'),visibility:'teacher'});
 const result=await r.json();if(result.lesson.visibility!=='teacher')throw Error('Remote review visibility mismatch');
 const downloaded=Buffer.from(await(await request(`/api/lessons/${result.lesson.id}/file`,auth.get(d.teacherId))).arrayBuffer());
 if(createHash('sha256').update(downloaded).digest('hex')!==d.sha256)throw Error('Remote attachment mismatch');
 progress.push({key,lessonId:result.lesson.id,sha256:d.sha256,teacherId:d.teacherId,visibility:'teacher'});await save();
 console.log(JSON.stringify({completed:progress.length,total:docs.length}));
}
