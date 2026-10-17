import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import JSZip from 'jszip';
const root=path.resolve('DATATM/giai-nen'),entries=[];
for(const dir of await fs.readdir(root,{withFileTypes:true})){
 if(!dir.isDirectory())continue;
 const grade=/^([678])\s/.exec(dir.name)?.[1]||(/ÔN VÀO 10/.test(dir.name)?9:/Toán ([68])/.exec(dir.name)?.[1]);if(!grade)continue;
 for(const relative of (await fs.readdir(path.join(root,dir.name),{recursive:true})).filter(f=>/\.docx$/i.test(f)&&!path.basename(f).startsWith('~$'))){
  const filename=path.join(root,dir.name,relative);
  process.stdout.write(JSON.stringify({reading:filename})+'\n');
  let timer;
  try{const {buffer,xml}=await Promise.race([(async()=>{const buffer=await fs.readFile(filename),zip=await JSZip.loadAsync(buffer),xml=await zip.file('word/document.xml')?.async('string');return {buffer,xml};})(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Không đọc xong trong 5 giây; cần kiểm tra file riêng.')),5000);})]);if(!xml)throw Error('Thiếu document.xml');
   entries.push({grade:Number(grade),source:path.relative(process.cwd(),filename).replaceAll('\\','/'),sha256:createHash('sha256').update(buffer).digest('hex'),size:buffer.length,omml:(xml.match(/<m:oMath[ >]/g)||[]).length,ole:(xml.match(/<o:OLEObject/g)||[]).length,images:(xml.match(/<w:drawing|<w:pict/g)||[]).length,questions:(xml.match(/Câu(?: hỏi)?\s*\d+/g)||[]).length});
  }catch(error){entries.push({grade:Number(grade),source:filename,error:error.message});}finally{clearTimeout(timer);}
 }
}
await fs.mkdir('private/datatm-bank',{recursive:true});await fs.writeFile('private/datatm-bank/inventory.json',JSON.stringify(entries,null,2));
console.log(JSON.stringify({total:entries.length,grades:[6,7,8,9].map(grade=>{const rows=entries.filter(e=>e.grade===grade);return {grade,files:rows.length,withoutOLE:rows.filter(e=>!e.error&&!e.ole).length,withOMML:rows.filter(e=>e.omml>0).length};}),errors:entries.filter(e=>e.error).length}));
