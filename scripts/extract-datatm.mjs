import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import JSZip from 'jszip';
import {DOMParser} from '@xmldom/xmldom';
// Conservative extraction: a question containing an equation, picture or object
// stays in the review queue. Never silently discard its mathematical content.
const root='DATATM/giai-nen', rows=[];
for(const dir of await fs.readdir(root)){
 if(!/^[678] .*dạng câu trả lời ngắn/.test(dir))continue;
 for(const rel of (await fs.readdir(path.join(root,dir),{recursive:true})).filter(s=>s.endsWith('.docx')&&!/demo|~\$/i.test(s))){
  const filename=path.join(root,dir,rel),bytes=await fs.readFile(filename),zip=await JSZip.loadAsync(bytes);
  const xml=await zip.file('word/document.xml').async('string'),doc=new DOMParser().parseFromString(xml,'text/xml');
  const paragraphs=Array.from(doc.getElementsByTagName('w:p')).map(p=>({text:Array.from(p.getElementsByTagName('w:t')).map(t=>t.textContent).join(''),unsafe:!!p.getElementsByTagName('m:oMath').length||!!p.getElementsByTagName('w:object').length||!!p.getElementsByTagName('w:drawing').length||!!p.getElementsByTagName('w:pict').length||!!p.getElementsByTagName('w:vertAlign').length}));
  let q=null;
  for(const p of paragraphs){
   const start=/^\s*Câu(?: hỏi)?\s*(\d+)\s*[:.]/i.exec(p.text);
   if(start){if(q)rows.push(q);q={grade:Number(dir[0]),source:filename.replaceAll('\\','/'),sha256:createHash('sha256').update(bytes).digest('hex'),number:Number(start[1]),prompt:p.text.slice(start[0].length).trim(),answer:'',unsafe:p.unsafe};}
   else if(q){const answer=/^\s*(?:Trả lời|Đáp án)\s*[:.]/i.exec(p.text);if(answer){q.answer=p.text.slice(answer[0].length).trim();q.unsafe||=p.unsafe;}else if(!q.answer){q.prompt+='\n'+p.text;q.unsafe||=p.unsafe;}}
  }
  if(q)rows.push(q);
 }
}
await fs.mkdir('private/datatm-bank',{recursive:true});
await fs.writeFile('private/datatm-bank/candidates.json',JSON.stringify(rows,null,2));
console.log(JSON.stringify({total:rows.length,plain:rows.filter(r=>!r.unsafe&&r.answer).length}));
