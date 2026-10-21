import fs from 'node:fs/promises';
import ExcelJS from 'exceljs';
const root='private/datatm-supplement',book=new ExcelJS.Workbook();
const summary=book.addWorksheet('Tổng hợp');summary.addRow(['Nội dung','Quy trình 1','Quy trình 2']);
const stats=[];
for(const phase of [1,2]){
 const docs=JSON.parse(await fs.readFile(`${root}/phase${phase}-documents.json`,'utf8'));
 const questions=JSON.parse(await fs.readFile(`${root}/phase${phase}-candidates.json`,'utf8'));
 const decisions=new Map(JSON.parse(await fs.readFile(`${root}/phase${phase}-review.json`,'utf8')).decisions.map(d=>[d.id,d]));
 const staged=JSON.parse(await fs.readFile(`${root}/phase${phase}-staged.json`,'utf8'));
 const extractions=JSON.parse(await fs.readFile(`${root}/phase${phase}-extraction.json`,'utf8'));
 stats.push({docs:docs.length,candidates:questions.length,ready:docs.filter(d=>d.status==='document_ready').length,staged:staged.documents.filter(d=>['staged_teacher_only','existing'].includes(d.status)).length,errors:extractions.flatMap(x=>x.nestedErrors||[]).length});
 const sheet=book.addWorksheet(`QT${phase} tài liệu`);
 sheet.addRow(['Khối','Tài liệu','Trạng thái kỹ thuật','Số mục câu/bài','Công thức OMML','Đối tượng OLE','Hình','Dung lượng','Nguồn','SHA256']);
 for(const d of docs)sheet.addRow([d.grade||'Chưa rõ',d.topic,d.status,d.questions,d.equations||0,d.ole||0,d.images||0,d.bytes,d.source,d.sha256]);
 const queue=book.addWorksheet(`QT${phase} câu và kiểm duyệt`);
 queue.addRow(['Mã','Khối','Chủ đề nguồn','Câu dẫn trích văn bản','Lời giải/đáp án nguồn chưa mặc định đúng','Có công thức/hình cần đối chiếu','Nguồn','Số câu','Trạng thái kiểm duyệt','Lý do / lưu ý']);
 for(const q of questions){const decision=decisions.get(q.id);queue.addRow([q.id,q.grade||'Chưa rõ',q.topic,q.prompt.slice(0,32000),q.sourceSolution.slice(0,32000),q.unsafe?'Có':'Không',q.source.file,q.number,decision?.status||'pending_review',decision?.reason||q.reasons.join('; ')]);}
}
for(const [key,label] of [['docs','Tài liệu riêng biệt trong từng đợt'],['ready','Tài liệu đạt kiểm tra cấu trúc'],['candidates','Mục câu/bài trích xuất, chưa mặc định đã duyệt'],['staged','Tài liệu nạp vào app kiểm tra – chỉ giáo viên'],['errors','Lỗi file nén lồng cần xử lý']])summary.addRow([label,...stats.map(x=>x[key])]);
summary.addRow(['Môi trường','Bản sao local tách biệt','Chưa cập nhật web/Supabase thật']);
summary.addRow(['Nội dung','Tài liệu gốc giữ hình/công thức; đáp án nguồn có thể sai','Chỉ câu đã duyệt mới vào kho giao bài']);
summary.addRow(['Câu mới đã duyệt',17,20]);
summary.addRow(['Câu bị loại khi kiểm tra',7,6]);
summary.addRow(['Trùng tài liệu đã có trong app',0,30]);
const reviewed=book.addWorksheet('Câu mới đã duyệt');reviewed.addRow(['Mã','Khối','Chủ đề','Câu hỏi','Đáp án','Lời giải','Nguồn']);
for(const q of JSON.parse(await fs.readFile('data/datatm-supplement-reviewed.json','utf8')).questions)reviewed.addRow([q.id,q.grade,q.topic,q.prompt,q.answer,q.solution,q.source.file]);
const rejected=book.addWorksheet('Câu nguồn cần sửa');rejected.addRow(['Mã','Lý do','Nguồn']);
for(const phase of [1,2])for(const r of JSON.parse(await fs.readFile(`${root}/phase${phase}-review.json`,'utf8')).decisions.filter(d=>d.status==='rejected'))rejected.addRow([r.id,r.reason,r.source.file]);
for(const s of book.worksheets){s.views=[{state:'frozen',ySplit:1}];s.getRow(1).font={bold:true};s.autoFilter={from:'A1',to:{row:s.rowCount,column:s.columnCount}};s.columns.forEach((c,i)=>{c.width=i===0?25:45;});}
await fs.mkdir('baocao',{recursive:true});await book.xlsx.writeFile('baocao/Bao_cao_bo_sung_DATATM.xlsx');
await fs.writeFile(`${root}/summary.json`,JSON.stringify(stats,null,2));
console.log(JSON.stringify({file:'baocao/Bao_cao_bo_sung_DATATM.xlsx',stats}));
