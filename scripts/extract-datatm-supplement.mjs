import fs from 'node:fs/promises';
import path from 'node:path';
import JSZip from 'jszip';
import {DOMParser} from '@xmldom/xmldom';
const phase=Number(process.argv[2]||1),root='private/datatm-supplement';
const convertedOnly=process.argv.includes('--converted-only'),suffix=convertedOnly?'-converted':'';
const files=JSON.parse(await fs.readFile(`${root}/phase${phase}-files.json`,'utf8'));
const originalPaths=JSON.parse(await fs.readFile(`${root}/phase${phase}-shortened-paths.json`,'utf8').catch(()=>'{}'));
const fold=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replaceAll('đ','d').toLowerCase();
const documents=[],candidates=[];
await fs.mkdir(`${root}/text`,{recursive:true});
const textOf=p=>Array.from(p.getElementsByTagName('w:t')).map(t=>t.textContent).join('');
for(const file of files){
 if(convertedOnly&&!file.converted)continue;
 if(file.duplicateOf||!['.docx','.pdf','.doc','.rtf','.gsp','.xlsx'].includes(file.extension))continue;
 const originalPath=file.originalSource||originalPaths[file.source]||file.source;
 const record={...file,originalPath,topic:path.basename(originalPath,path.extname(originalPath)),status:'pending',questions:0};
 try{
  if(/(?:ngu van|lich su|dia li|khtn|gdcd|\banh\s*8\b|trien-khai-ngan-hang)/.test(fold(record.topic))){record.status='excluded_other_subject';documents.push(record);continue;}
  if(['.doc','.rtf'].includes(file.extension)){record.status='needs_legacy_conversion';documents.push(record);continue;}
  if(['.gsp','.xlsx'].includes(file.extension)){record.status='support_asset';documents.push(record);continue;}
  if(file.bytes>10*1024*1024){record.status='oversize';documents.push(record);continue;}
  if(file.extension==='.pdf'){
   const bytes=await fs.readFile(file.source);
   record.status=bytes.subarray(0,5).toString()==='%PDF-'&&bytes.subarray(-2048).includes(Buffer.from('%%EOF'))?'document_ready':'invalid_pdf';
   record.extractionNote='PDF nguyên bản; chưa trích/OCR câu hỏi.';documents.push(record);continue;
  }
  const zip=await JSZip.loadAsync(await fs.readFile(file.source),{checkCRC32:true});
  if(!zip.file('[Content_Types].xml')||!zip.file('word/document.xml')||zip.file('word/vbaProject.bin'))throw Error('Invalid Word package or macro');
  const xml=await zip.file('word/document.xml').async('string');
  const doc=new DOMParser({onError:()=>{}}).parseFromString(xml,'text/xml');
  const paragraphs=Array.from(doc.getElementsByTagName('w:p')).map(p=>({text:textOf(p),unsafe:['m:oMath','w:object','w:drawing','w:pict','w:vertAlign','w:sym'].some(t=>p.getElementsByTagName(t).length>0)}));
  record.ole=doc.getElementsByTagName('o:OLEObject').length;
  record.equations=doc.getElementsByTagName('m:oMath').length;
  record.images=doc.getElementsByTagName('w:drawing').length+doc.getElementsByTagName('w:pict').length;
  record.characters=paragraphs.reduce((n,p)=>n+p.text.length,0);
  const text=paragraphs.map(p=>p.text).join('\n');
  if(!record.grade){
   const g=fold(text.slice(0,20000)).match(/(?:toan|lop)\s*([6789])\b/);
   if(g){record.grade=Number(g[1]);record.gradeEvidence='Document text: '+g[0];}
   else if(/(?:on luyen tap|on luyen ta?p)/.test(fold(file.archive))&&/(?:ham so bac hai|phuong trinh bac hai|dinh li viet|hinh tru|hinh cau|can bac|he phuong trinh|luong giac)/.test(fold(record.topic))){record.grade=9;record.gradeEvidence='Grade 9 topic in revision book';}
  }
  await fs.writeFile(`${root}/text/${file.sha256}.txt`,text);
  // Full Word package is retained: plain text is a search/review aid, not a replacement for equations/images.
  record.status=record.characters>50?'document_ready':'needs_visual_review';
  let chunk=[],ordinal=0;
  const flush=()=>{
   if(!chunk.length)return;
   const first=chunk[0].text.match(/^\s*(Câu(?: hỏi)?|Bài)\s*(\d+)\s*[.:)]/i);
   if(!first)return;
   const raw=chunk.map(p=>p.text).join('\n').trim();
   const split=raw.search(/(?:^|\n)\s*(?:Lời giải|Hướng dẫn giải|Giải\s*:|Đáp án|Trả lời)\b/i);
   const prompt=(split>=0?raw.slice(0,split):raw).replace(first[0],'').trim();
   const solution=split>=0?raw.slice(split).trim():'';
   const unsafe=chunk.some(p=>p.unsafe);
   candidates.push({id:`source-${file.sha256.slice(0,18)}-${++ordinal}`,grade:record.grade,topic:record.topic,number:Number(first[2]),prompt,sourceSolution:solution,unsafe,status:'pending_review',reasons:[...(unsafe?['contains_equations_images_or_objects']:[]),...(!solution?['missing_explicit_solution']:[]),'requires_content_review'],source:{file:file.source,sha256:file.sha256,archive:file.archive,question:Number(first[2]),ordinal}});
  };
  for(const p of paragraphs){
   if(/^\s*(?:Câu(?: hỏi)?|Bài)\s*\d+\s*[.:)]/i.test(p.text)){flush();chunk=[p];}
   else if(chunk.length)chunk.push(p);
  }
  flush();record.questions=ordinal;
  documents.push(record);
 }catch(error){record.status='error';record.error=error.message;documents.push(record);}
 if(documents.length%25===0)console.log(JSON.stringify({phase,processed:documents.length,candidates:candidates.length}));
}
await fs.writeFile(`${root}/phase${phase}${suffix}-documents.json`,JSON.stringify(documents,null,2));
await fs.writeFile(`${root}/phase${phase}${suffix}-candidates.json`,JSON.stringify(candidates,null,2));
console.log(JSON.stringify({phase,documents:documents.length,ready:documents.filter(d=>d.status==='document_ready').length,byGrade:Object.fromEntries([6,7,8,9].map(g=>[g,documents.filter(d=>d.grade===g).length])),candidates:candidates.length,plainWithSolution:candidates.filter(c=>!c.unsafe&&c.sourceSolution).length,statuses:documents.reduce((s,d)=>(s[d.status]=(s[d.status]||0)+1,s),{})}));
