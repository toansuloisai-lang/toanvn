// Runs isolated local fixtures; does not use the live site, email delivery or live AI.
import {readdir,readFile,mkdir,writeFile} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const exec=promisify(execFile),results=[];
await mkdir('artifacts/full-workflow',{recursive:true});
const queue=(await readdir('scripts')).filter(name=>/^check-.*\.mjs$/.test(name)&&name!=='check-full-workflow.mjs');
for(const name of queue){
 const source=await readFile('scripts/'+name,'utf8');
 if(!/createTestApp\(|MATH_DB_PATH|disposable local PostgreSQL/.test(source))throw Error('Review fixture isolation before adding '+name);
}
async function worker(){while(queue.length){const name=queue.shift(),started=Date.now();let status='passed',output='';
 try{const r=await exec(process.execPath,['scripts/'+name],{timeout:180000,maxBuffer:4*1024*1024,windowsHide:true});output=r.stdout+r.stderr;}
 catch(e){status='failed';output=(e.stdout||'')+(e.stderr||'')+'\n'+e.message;}
 const row={name,status,seconds:Math.round((Date.now()-started)/100)/10};results.push(row);
 await writeFile('artifacts/full-workflow/'+name+'.log',output);console.log(JSON.stringify(row));
 await writeFile('artifacts/full-workflow/results.json',JSON.stringify(results,null,2)+'\n');
}}
await Promise.all([worker(),worker()]);
console.log(JSON.stringify({passed:results.filter(r=>r.status==='passed').length,failed:results.filter(r=>r.status==='failed').map(r=>r.name)}));
if(results.some(r=>r.status!=='passed'))process.exitCode=1;
