import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

// Only immutable curriculum files; never compact accounts, uploads or snapshots.
export const curriculumFiles=['question-library.json','datatm-bank.json','datatm-screened-pending.json','datatm-supplement-reviewed.json','datatm-manual-reviewed.json','datatm-arithmetic-reviewed.json'];
export async function prepareDeploy(root=fileURLToPath(new URL('../',import.meta.url)),{write=true}={}){
 const prepared=await Promise.all(curriculumFiles.map(async name=>{
  const filename=path.join(root,'data',name),original=await readFile(filename);
  const compact=JSON.stringify(JSON.parse(original.toString('utf8')))+'\n';
  return {filename,compact,before:original.length,after:Buffer.byteLength(compact)};
 }));
 if(write)for(const file of prepared)if(file.after<file.before)await writeFile(file.filename,file.compact);
 return {files:prepared.length,before:prepared.reduce((n,f)=>n+f.before,0),after:prepared.reduce((n,f)=>n+Math.min(f.before,f.after),0)};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(await prepareDeploy(undefined,{write:!process.argv.includes('--check')})));
