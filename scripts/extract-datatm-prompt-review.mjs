// Inspect the question separately from its solution: an equation in the source
// solution must not hide an otherwise complete text-only problem.
import fs from 'node:fs/promises';
import JSZip from 'jszip';
import {questionLibrary} from '../question-library.mjs';
import {recoveredDecisions} from './recovered-datatm-decisions.mjs';
const recoveredIds=new Set([...recoveredDecisions.map(d=>d.id),'source-913d667ddcf590452e-25','source-0dccf8301583373c91-58']);
const raw=(await Promise.all([1,2].map(n=>fs.readFile(`private/datatm-supplement/phase${n}-candidates.json`,'utf8').then(JSON.parse)))).flat();
const used=new Set(questionLibrary.map(q=>q.id.replace(/^supplement-/,'')));
const normalize=s=>s.normalize('NFC').toLowerCase().replace(/\s+/g,' ').trim();
const stems=new Set(questionLibrary.map(q=>normalize(q.source?.originalPrompt||q.prompt)));
const files=new Map();
for(const q of raw.filter(q=>(process.argv.includes('--grade9')?q.grade===9:[8,9].includes(q.grade))&&(!used.has(q.id)||recoveredIds.has(q.id)))){
 const rows=files.get(q.source.file)||[];rows.push(q);files.set(q.source.file,rows);
}
const output=[];
for(const [file,rows] of files){
 const zip=await JSZip.loadAsync(await fs.readFile(file));
 const xml=await zip.file('word/document.xml').async('string');
 const decode=s=>s.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&amp;/g,'&');
 const paragraphs=Array.from(xml.matchAll(/<w:p(?=[\s>])[^>]*>[^]*?<\/w:p>/g),m=>({text:Array.from(m[0].matchAll(/<w:t(?=[\s>])[^>]*>([^]*?)<\/w:t>/g),t=>decode(t[1])).join(''),unsafe:/<(?:m:oMath|w:object|w:drawing|w:pict|w:vertAlign|w:sym)(?=[\s>])/.test(m[0])}));
 let chunk=[],ordinal=0;
 const flush=()=>{
  if(!chunk.length)return;ordinal++;
  const rawText=chunk.map(p=>p.text).join('\n').trim();
  const split=rawText.search(/(?:^|\n)\s*(?:Lời giải|Hướng dẫn giải|Giải\s*:|Đáp án|Trả lời)\b/i);
  const textPrompt=(split>=0?rawText.slice(0,split):rawText).replace(/^\s*(Câu(?: hỏi)?|Bài)\s*(\d+)\s*[.:)]/i,'').trim();
  const q=rows.find(q=>normalize(q.prompt)===normalize(textPrompt));if(!q)return;
  const cut=chunk.findIndex(p=>/^\s*(?:Lời giải|Hướng dẫn giải|Giải\s*:|Đáp án|Trả lời)\b/iu.test(p.text));
  const problem=cut<0?chunk:chunk.slice(0,cut);
  const choiceStart=problem.findIndex(p=>/(?:^|\s)A[.)]\s*/.test(p.text));
  const stem=choiceStart>0?problem.slice(0,choiceStart):problem;
  const promptOnlyVerified=!problem.some(p=>p.unsafe),stemOnlyVerified=!stem.some(p=>p.unsafe);
  if(!stemOnlyVerified)return;
  const key=normalize(q.prompt);if(stems.has(key)&&!recoveredIds.has(q.id))return;stems.add(key);
  output.push({...q,unsafe:false,originalUnsafe:q.unsafe,promptOnlyVerified,stemOnlyVerified,reviewStem:stem.map(p=>p.text).join('\n')});
 };
 for(const p of paragraphs){if(/^\s*(?:Câu(?: hỏi)?|Bài)\s*\d+\s*[.:)]/iu.test(p.text)){flush();chunk=[p];}else if(chunk.length)chunk.push(p);}
 flush();
}
await fs.writeFile(process.argv.includes('--grade9')?'baocao/datatm-grade9-prompt-review-queue.json':'baocao/datatm-prompt-review-queue.json',JSON.stringify(output,null,2));
console.log(JSON.stringify({files:files.size,queue:[8,9].map(grade=>({grade,count:output.filter(q=>q.grade===grade).length}))}));
