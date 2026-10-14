import {existsSync,readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
export const schoolName='TRƯỜNG THCS LẠC ĐẠO – HƯNG YÊN';
export const appName='Hồ sơ học tập · Math Lab';
export function schoolLogo(){for(const name of ['logo-truong.png','logo-truong.jpg','logo-truong.jpeg']){const file=fileURLToPath(new URL('./public/assets/'+name,import.meta.url));if(existsSync(file))return {content:readFileSync(file),filename:name,contentType:name.endsWith('png')?'image/png':'image/jpeg'};}return null;}
export function reportMetrics(r){const history=r.knowledge?.history||[],exams=history.filter(h=>h.kind==='exam'),essays=history.filter(h=>h.kind==='essay');return {exams,essays,done:exams.length+new Set(essays.map(e=>e.title)).size+(r.summary?.exercises||0),correct:exams.reduce((n,e)=>n+e.questions.filter(q=>q.correct).length,0)+(r.summary?.correct||0),wrong:exams.reduce((n,e)=>n+e.questions.filter(q=>!q.correct).length,0)+(r.summary?.wrong||0),activity:r.usage?`${Math.round(r.usage.totalMs/60000)} phút`:'Chưa ghi nhận'};}
