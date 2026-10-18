import {readFile,writeFile,readdir} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import JSZip from 'jszip';
import {DOMParser} from '@xmldom/xmldom';
const root='DATATM/giai-nen',files=(await readdir(root,{recursive:true})).filter(f=>/D[AB]\.C.*\.docx$/i.test(path.basename(f))),rows=[],stems=[];
for(const relative of files){
 const file=path.join(root,relative).replaceAll('\\','/'),bytes=await readFile(file),zip=await JSZip.loadAsync(bytes),doc=new DOMParser().parseFromString(await zip.file('word/document.xml').async('string'),'text/xml');
 let chunk=[],ordinal=0,section='';
 const flush=()=>{
  if(!chunk.length)return;ordinal++;
  const cutoff=chunk.findIndex(p=>/^Lời giải/i.test(p.text.trim()));if(cutoff<0)return;
  const problem=chunk.slice(0,cutoff),firstChoice=problem.findIndex(p=>/(?:^|\s)A[.)]\s*/.test(p.text));
  if(firstChoice>0&&!problem.slice(0,firstChoice).some(p=>p.unsafe)){
   const match=problem[0].text.match(/^\s*Câu\s*(\d+)\s*[.:]\s*(?:\[[^\]]*\])?\s*/i);
   if(match)stems.push({index:stems.length,grade:9,prompt:problem.slice(0,firstChoice).map(p=>p.text).join('\n').replace(match[0],'').trim(),source:{file,sha256:createHash('sha256').update(bytes).digest('hex'),question:Number(match[1]),section,ordinal},sourceSolution:chunk.slice(cutoff).map(p=>p.text).join('\n')});
  }
  if(problem.some(p=>p.unsafe))return;
  const raw=problem.map(p=>p.text).join('\n'),start=raw.match(/^\s*Câu\s*(\d+)\s*[.:]\s*(?:\[[^\]]*\])?\s*/i);if(!start)return;
  const parts=raw.slice(start[0].length).split(/(?:^|\s)([ABCD])[.)]\s*/);if(parts.length!==9||parts[1]!=='A'||parts[3]!=='B'||parts[5]!=='C'||parts[7]!=='D')return;
  const choices=[parts[2],parts[4],parts[6],parts[8]].map(s=>s.trim()),key=chunk.slice(cutoff).map(p=>p.text).join('\n').match(/Chọn\s*([ABCD])/i);if(!key||choices.some(c=>!c)||new Set(choices).size!==4)return;
  rows.push({index:rows.length,grade:9,prompt:parts[0].trim(),choices,correctIndex:'ABCD'.indexOf(key[1].toUpperCase()),source:{file,sha256:createHash('sha256').update(bytes).digest('hex'),question:Number(start[1]),section,ordinal},sourceSolution:chunk.slice(cutoff).map(p=>p.text).join('\n'),solutionHasObjects:chunk.slice(cutoff).some(p=>p.unsafe)});
 };
 for(const p of Array.from(doc.getElementsByTagName('w:p'))){
  const text=Array.from(p.getElementsByTagName('w:t')).map(t=>t.textContent).join('').replaceAll('O10-2024-GV137','').trim();
  if(/^(?:BÀI\s+\d|DẠNG\s+\d|PHẦN\s+[IVX])/i.test(text)){flush();chunk=[];section=text.slice(0,160);}
  if(/^Câu\s*\d+\s*[.:]/i.test(text)){flush();chunk=[];}
  if(chunk.length||/^Câu\s*\d+\s*[.:]/i.test(text))chunk.push({text,unsafe:['m:oMath','w:object','w:drawing','w:pict','w:vertAlign'].some(tag=>p.getElementsByTagName(tag).length)});
 }
 flush();
}
await writeFile('private/datatm-bank/grade9-library-candidates.json',JSON.stringify(rows,null,2)+'\n');
await writeFile('private/datatm-bank/grade9-stems.json',JSON.stringify(stems,null,2)+'\n');
console.log(JSON.stringify({files:files.length,intactMCQs:rows.length,intactStems:stems.length}));
