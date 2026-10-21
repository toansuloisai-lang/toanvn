import fs from 'node:fs/promises';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {createHash} from 'node:crypto';
const root='private/datatm-supplement',file=`${root}/phase2-files.json`;
const files=JSON.parse(await fs.readFile(file,'utf8'));
const output=path.resolve(root,'converted');await fs.mkdir(output,{recursive:true});
const program=path.resolve('artifacts/tools/libreoffice/program/soffice.com');
const run=promisify(execFile);
const results=[];
const pending=files.filter(f=>!f.duplicateOf&&['.doc','.rtf'].includes(f.extension));let next=0;
await Promise.all(Array.from({length:3},async(_,worker)=>{
const profile=new URL('file:///'+path.resolve(root,'lo-profile-'+worker).replaceAll('\\','/')+'/').href;
while(next<pending.length){const source=pending[next++];
 if(/ngu van/i.test(source.source)){results.push({source:source.source,status:'excluded_other_subject'});continue;}
 const inputDir=path.resolve(root,'legacy-input',source.sha256.slice(0,16));await fs.mkdir(inputDir,{recursive:true});
 const input=path.join(inputDir,source.sha256+source.extension);await fs.copyFile(source.source,input);
 const converted=path.join(output,source.sha256+'.docx');
 try{
  if(!await fs.stat(converted).catch(()=>null)){
   await run(program,[`-env:UserInstallation=${profile}`,'--headless','--convert-to','docx:Office Open XML Text','--outdir',output,input],{encoding:'utf8',timeout:120000,windowsHide:true});
  }
  const bytes=await fs.readFile(converted),sha256=createHash('sha256').update(bytes).digest('hex');
  const row={...source,source:path.relative(process.cwd(),converted).replaceAll('\\','/'),originalSource:source.source,originalSha256:source.sha256,extension:'.docx',sha256,bytes:bytes.length,converted:true,conversion:'LibreOffice 25.8.4.2 – inspect equations and layout before publishing'};
  if(!files.some(f=>f.source===row.source))files.push(row);
  results.push({source:source.source,converted:row.source,status:'converted_needs_visual_review'});
  console.log(JSON.stringify({converted:results.length,source:source.source}));
 }catch(e){results.push({source:source.source,status:'error',error:e.message});console.log('Conversion error: '+source.source);}
}
}));
await fs.writeFile(file,JSON.stringify(files,null,2));await fs.writeFile(`${root}/legacy-conversion.json`,JSON.stringify(results,null,2));
console.log(JSON.stringify({converted:results.filter(r=>r.status==='converted_needs_visual_review').length,excluded:results.filter(r=>r.status==='excluded_other_subject').length,errors:results.filter(r=>r.status==='error').length}));
