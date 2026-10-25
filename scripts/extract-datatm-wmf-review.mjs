// Read printable, single-baseline WMF text for manual source review only.
// Fractions, superscripts, drawings and unrecognised glyphs stay marked unknown.
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import JSZip from 'jszip';
const raw=(await Promise.all([1,2].map(n=>fs.readFile(`private/datatm-supplement/phase${n}-candidates.json`,'utf8').then(JSON.parse)))).flat();
const q=raw.find(q=>q.id===process.argv[2]);if(!q)throw Error('Source ID required');
const bytes=await fs.readFile(q.source.file);if(createHash('sha256').update(bytes).digest('hex')!==q.source.sha256)throw Error('Source changed');
const zip=await JSZip.loadAsync(bytes),xml=await zip.file('word/document.xml').async('string');
const rels=await zip.file('word/_rels/document.xml.rels').async('string');
const links=new Map([...rels.matchAll(/<Relationship\s+([^>]+)\/?\s*>/g)].map(m=>[m[1].match(/\bId="([^"]+)"/)?.[1],m[1].match(/\bTarget="([^"]+)"/)?.[1]]));
const decode=s=>s.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&amp;/g,'&');
function wmfText(b){
 let offset=b.readUInt32LE(0)===0x9ac6cdd7?40:18;const texts=[];
 while(offset+6<=b.length){
  const size=b.readUInt32LE(offset)*2,fn=b.readUInt16LE(offset+4);if(size<6||offset+size>b.length)break;
  const data=b.subarray(offset+6,offset+size);
  if(fn===0xa32&&data.length>=8){
   const y=data.readInt16LE(0),x=data.readInt16LE(2),n=data.readUInt16LE(4),flags=data.readUInt16LE(6),start=8+((flags&6)?8:0);
   const t=data.subarray(start,start+n).toString('latin1');texts.push({x,y,t});
  }
  offset+=size;
 }
 if(!texts.length||texts.some(p=>/[^\x20-\x7e]/.test(p.t))||new Set(texts.map(p=>p.y)).size!==1)return '[WMF: cần xem hình]';
 return texts.sort((a,b)=>a.x-b.x).map(p=>p.t).join('');
}
let rendered='',cursor=0;
for(const m of xml.matchAll(/<w:object\b[^>]*>[^]*?<\/w:object>/g)){
 rendered+=xml.slice(cursor,m.index);cursor=m.index+m[0].length;
 const id=m[0].match(/<v:imagedata\b[^>]*\br:id="([^"]+)"/)?.[1],target=links.get(id);
 const asset=target?zip.file('word/'+target.replace(/^\.\//,'')):null;
 const text=asset&&/\.wmf$/i.test(target)?wmfText(await asset.async('nodebuffer')):'[OBJECT: cần xem hình]';
 rendered+='<w:r><w:t>'+text.replace(/&/g,'&amp;').replace(/</g,'&lt;')+'</w:t></w:r>';
}
rendered+=xml.slice(cursor);
const paragraphs=[...rendered.matchAll(/<w:p(?=[\s>])[^>]*>[^]*?<\/w:p>/g)].map(m=>[...m[0].matchAll(/<w:t(?=[\s>])[^>]*>([^]*?)<\/w:t>/g)].map(t=>decode(t[1])).join(''));
await fs.writeFile('baocao/wmf-review-'+q.source.sha256.slice(0,18)+'.txt',paragraphs.join('\n'));
const originalParagraphs=[...xml.matchAll(/<w:p(?=[\s>])[^>]*>[^]*?<\/w:p>/g)].map(m=>[...m[0].matchAll(/<w:t(?=[\s>])[^>]*>([^]*?)<\/w:t>/g)].map(t=>decode(t[1])).join(''));
if(originalParagraphs.length!==paragraphs.length)throw Error('Paragraph structure changed');
const rows=raw.filter(r=>r.source.sha256===q.source.sha256),candidates=[];
const normal=s=>s.replace(/\s+/g,' ').trim();let chunk=[];
const flush=()=>{
 if(!chunk.length)return;
 const first=/^\s*(?:Câu(?: hỏi)?|Bài)\s*\d+\s*[.:)]/i;
 const rawText=chunk.map(i=>originalParagraphs[i]).join('\n').trim();
 const split=rawText.search(/(?:^|\n)\s*(?:Lời giải|Hướng dẫn giải|Giải\s*:|Đáp án|Trả lời)\b/i);
 const prompt=(split>=0?rawText.slice(0,split):rawText).replace(first,'').trim();
 const record=rows.find(r=>normal(r.prompt)===normal(prompt));if(!record)return;
 const decoded=chunk.map(i=>paragraphs[i]).join('\n').trim();
 const cut=decoded.search(/(?:^|\n)\s*(?:Lời giải|Hướng dẫn giải|Giải\s*:|Đáp án|Trả lời)\b/i);
 candidates.push({id:record.id,decodedPrompt:(cut>=0?decoded.slice(0,cut):decoded).replace(first,'').trim(),originalPrompt:record.prompt,source:record.source});
};
for(let i=0;i<originalParagraphs.length;i++){if(/^\s*(?:Câu(?: hỏi)?|Bài)\s*\d+\s*[.:)]/i.test(originalParagraphs[i])){flush();chunk=[i];}else if(chunk.length)chunk.push(i);}flush();
await fs.writeFile('baocao/wmf-review-'+q.source.sha256.slice(0,18)+'.json',JSON.stringify(candidates,null,2));
console.log(JSON.stringify({source:q.source.file,sha256:q.source.sha256,paragraphs:paragraphs.length}));
