import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import JSZip from 'jszip';
import mammoth from 'mammoth';
const root=path.resolve('DATATM/giai-nen'),dirs=(await fs.readdir(root,{withFileTypes:true})).filter(d=>d.isDirectory());
const plain=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d');
const plans={
 6:[[1,'Tập hợp'],[6,'Lũy thừa với số mũ tự nhiên'],[10,'Số nguyên tố'],[11,'Ước chung và ước chung lớn nhất'],[14,'Phép cộng và phép trừ số nguyên'],[23,'Mở rộng phân số và phân số bằng nhau'],[25,'Phép cộng và phép trừ phân số'],[28,'Số thập phân'],[34,'Đoạn thẳng và độ dài đoạn thẳng'],[43,'Xác suất thực nghiệm']],
 7:[[1,'Tập hợp các số hữu tỉ'],[2,'Các phép tính với số hữu tỉ'],[6,'Số vô tỉ và căn bậc hai số học'],[12,'Tổng các góc trong một tam giác'],[16,'Tam giác cân và đường trung trực'],[20,'Tỉ lệ thức'],[22,'Đại lượng tỉ lệ thuận'],[25,'Đa thức một biến'],[30,'Xác suất của biến cố'],[36,'Hình hộp chữ nhật và hình lập phương']],
 8:[[1,'Đơn thức'],[3,'Phép cộng và phép trừ đa thức'],[6,'Hằng đẳng thức bình phương và hiệu hai bình phương'],[9,'Phân tích đa thức thành nhân tử'],[12,'Hình bình hành'],[15,'Định lí Thales trong tam giác'],[21,'Phân thức đại số'],[25,'Phương trình bậc nhất một ẩn'],[28,'Hàm số bậc nhất và đồ thị'],[33,'Hai tam giác đồng dạng']]
};
const manifest=[];
for(const grade of [6,7,8]){
 const dir=dirs.find(d=>plain(d.name).startsWith(grade+' ')&&(grade===8?/Phieu/.test(plain(d.name)):/ngan/.test(plain(d.name))));if(!dir)throw Error('Missing source grade '+grade);
 const base=path.join(root,dir.name),files=(await fs.readdir(base,{recursive:true})).filter(f=>f.endsWith('.docx')&&!path.basename(f).startsWith('~$'));
 for(const [n,topic] of plans[grade]){const file=files.find(f=>new RegExp('bai_'+n+'_').test(path.basename(f)));if(!file)throw Error('Missing topic '+grade+'/'+n);manifest.push({grade,title:`Toán ${grade} · ${topic}`,topic,source:path.join(base,file)});}
}
const dir9=dirs.find(d=>d.name.startsWith('CHUY')),base9=path.join(root,dir9.name),files9=(await fs.readdir(base9,{recursive:true})).filter(f=>f.endsWith('.docx')&&!path.basename(f).startsWith('~$'));
const topics9=[[/^DB\.C1\./,'Phương trình bậc nhất hai ẩn'],[/^DB\.C2\./,'Phương trình và bất phương trình'],[/^DB\.C3\..*1\(/,'Căn thức và biến đổi căn thức · Phần 1'],[/^DB\.C3\..*2 /,'Căn thức và biến đổi căn thức · Phần 2'],[/^DB\.C5\./,'Đường tròn'],[/^DB\.C6\./,'Hàm số y = ax²'],[/^HS TN T9 CHUONG 7 BAI 37 /,'Bảng tần số và biểu đồ tần số'],[/^DB\.C8\./,'Xác suất'],[/^DB\.C9\./,'Tứ giác nội tiếp'],[/^DB\.C10\./,'Hình học không gian']];
for(const [pattern,topic] of topics9){const file=files9.find(f=>pattern.test(path.basename(f)));if(!file)throw Error('Missing grade 9 source '+pattern);manifest.push({grade:9,title:`Toán 9 · ${topic}`,topic,source:path.join(base9,file)});}
for(const item of manifest){
 const bytes=await fs.readFile(item.source);if(bytes.length>10*1024*1024)throw Error('File exceeds upload limit: '+item.title);
 const zip=await JSZip.loadAsync(bytes,{checkCRC32:true});if(!zip.file('word/document.xml')||zip.file('word/vbaProject.bin'))throw Error('Invalid Word source: '+item.title);
 const extracted=await mammoth.extractRawText({buffer:bytes});if(extracted.value.trim().length<100)throw Error('Insufficient readable text: '+item.title);
 item.size=bytes.length;item.sha256=createHash('sha256').update(bytes).digest('hex');item.preview=extracted.value.trim().slice(0,1200);
 item.description=`Chủ đề: ${item.topic}. ${item.grade===9?'Tài liệu ôn tập Toán 9 và ôn thi vào lớp 10.':'Bài tập theo chương trình Toán '+item.grade+' – Kết nối tri thức.'} Đọc yêu cầu, tự giải bài trước khi đối chiếu hướng dẫn trong tài liệu (nếu có).`;
}
if(new Set(manifest.map(m=>m.sha256)).size!==40)throw Error('Duplicate document content.');
await fs.mkdir('private',{recursive:true});await fs.writeFile('private/datatm-document-selection.json',JSON.stringify(manifest,null,2));
const summary=Object.fromEntries([6,7,8,9].map(g=>[g,{count:manifest.filter(m=>m.grade===g).length,bytes:manifest.filter(m=>m.grade===g).reduce((n,m)=>n+m.size,0)}]));
console.log(JSON.stringify({byGrade:summary,totalBytes:manifest.reduce((n,m)=>n+m.size,0),largestBytes:Math.max(...manifest.map(m=>m.size))}));
if(process.argv.includes('--apply')){
 const {accounts}=await import('../server.mjs');
 try{const teachers=accounts.users().filter(u=>u.role==='teacher'),teacherId=process.argv.find(v=>v.startsWith('--teacher-id='))?.split('=')[1];const teacher=teacherId?teachers.find(t=>t.id===teacherId):teachers.length===1?teachers[0]:null;if(!teacher)throw Error('Specify --teacher-id for target teacher.');
 if((process.env.MATH_STORAGE||'json')==='json'){const filename=path.resolve(process.env.MATH_DB_PATH||'private/accounts.json');await fs.copyFile(filename,path.join(path.dirname(filename),'accounts-before-documents-'+Date.now()+'.json'));}
 let added=0,duplicates=0;for(const item of manifest){const bytes=await fs.readFile(item.source);const result=accounts.uploadLesson(teacher,{title:item.title,description:item.description,grade:item.grade,filename:`Toan-${item.grade}-${String(plans[item.grade]?.findIndex(p=>p[1]===item.topic)+1||manifest.filter(m=>m.grade===9).indexOf(item)+1).padStart(2,'0')}.docx`,base64:bytes.toString('base64')});if(result.duplicate)duplicates++;else added++;if(!accounts.uploadedFile(teacher,result.lesson.id).content.equals(bytes))throw Error('Stored file mismatch.');item.id=result.lesson.id;}
 await fs.writeFile('private/datatm-document-import.json',JSON.stringify({teacherId:teacher.id,added,duplicates,documents:manifest},null,2));console.log(JSON.stringify({added,duplicates,visibleDocuments:accounts.uploadedLessons(teacher).length}));
 }finally{accounts.close();}
}
