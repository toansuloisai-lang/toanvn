import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import ExcelJS from 'exceljs';

const root='private/datatm-supplement';
const secondBatch=process.argv.includes('--batch2');
const read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const candidates=(await Promise.all([1,2].map(n=>read(`${root}/phase${n}-candidates.json`)))).flat();
const screening=await read(`${root}/screening.json`);
const statuses=new Map(screening.rows.map(r=>[r.id,r.status]));
const reviewed=await read('data/datatm-supplement-reviewed.json');
const verified=new Map(reviewed.questions.map(q=>[q.id.replace(/^supplement-/,''),q]));
const normalized=q=>q.grade+':'+q.prompt.normalize('NFKC').toLowerCase().replace(/<\s*(nb|th|vd|vdc)\s*>|\[(nb|th|vd|vdc)\]/giu,'').replace(/[\s\p{P}]+/gu,'');
const excluded={},pool=[],keys=new Set();
if(secondBatch){
 const previous=await read(`${root}/selected-1000.json`);
 const base=await read('data/question-library.json');
 for(const q of [...previous.questions,...base.questions,...reviewed.questions])keys.add(normalized(q));
}
function reject(reason){excluded[reason]=(excluded[reason]||0)+1;}
for(const c of candidates){
 const status=statuses.get(c.id);
 if(!(secondBatch?['needs_math_review','needs_solution_review']:['needs_math_review','verified']).includes(status)){reject(status||'unknown');continue;}
 if(c.unsafe){reject('unsafe');continue;}
 if(c.prompt.trim().length<25&&!verified.has(c.id)){reject('short_prompt');continue;}
 if(/quan sát hình|hình (vẽ|bên|dưới|sau)|bảng (sau|dưới)|biểu đồ (sau|dưới)|cho\s*[,;.]|=\s*[,;]|a\)\s*[ĐS]\s*\n/iu.test(c.prompt)){reject('visual_or_broken_prompt');continue;}
 const solution=c.sourceSolution.replace(/lời giải|chi tiết|trả lời|hướng dẫn giải|chọn\s*[ABCD]/giu,'').trim();
 if(solution.length<3&&!verified.has(c.id)&&!(secondBatch&&!c.sourceSolution.trim())){reject('empty_solution_or_answer_key_only');continue;}
 const k=normalized(c);if(keys.has(k)){reject('normalized_duplicate');continue;}keys.add(k);
 const score=(verified.has(c.id)?1000:0)+(solution.length>=3?100:0)+Math.min(solution.length,400)/10+(c.prompt.includes('?')?3:0)-(c.prompt.length>2000?20:0);
 pool.push({...c,selectionScore:score});
}
pool.sort((a,b)=>(secondBatch?(!!b.sourceSolution-!!a.sourceSolution):0)||(a.grade===7?0:1)-(b.grade===7?0:1)||b.selectionScore-a.selectionScore||a.id.localeCompare(b.id));
if(pool.length<1000)throw Error(`Only ${pool.length} eligible; do not loosen filters silently`);
const selected=pool.slice(0,1000),hashes=new Map();
const files=[...new Set(selected.map(c=>c.source.file))];let cursor=0;
await Promise.all(Array.from({length:8},async()=>{while(cursor<files.length){const file=files[cursor++];hashes.set(file,createHash('sha256').update(await fs.readFile(file)).digest('hex'));}}));
for(const c of selected){
 if(hashes.get(c.source.file)!==c.source.sha256)throw Error('Source hash mismatch: '+c.id);
}
const questions=selected.map(c=>{
 const v=verified.get(c.id);
 return {...c,status:v?'verified':'automatically_screened_pending_math_review',answer:v?.answer||null,solution:v?.solution||null,sourceSolution:c.sourceSolution,review:v?.review||{status:'pending',method:'Lọc cấu trúc tự động, chưa kiểm chứng đúng sai toán học.'}};
});
const summary={selected:questions.length,eligible:pool.length,verified:questions.filter(q=>q.status==='verified').length,pendingMathReview:questions.filter(q=>q.status!=='verified').length,missingSourceSolution:questions.filter(q=>!q.sourceSolution.trim()).length,byGrade:Object.fromEntries([6,7,8,9].map(g=>[g,questions.filter(q=>q.grade===g).length])),sourceFilesChecked:hashes.size,excluded,note:'1000 câu ứng viên đã lọc cấu trúc; không đồng nghĩa 1000 câu đã kiểm chứng. Không đưa câu chờ duyệt vào kho giao bài.'};
await fs.writeFile(`${root}/selected-1000${secondBatch?'-batch2':''}.json`,JSON.stringify({summary,questions},null,2));
const book=new ExcelJS.Workbook(),info=book.addWorksheet('Tổng hợp'),sheet=book.addWorksheet('1000 câu đã lọc');
info.addRows([['Nội dung','Kết quả'],['Số câu ứng viên',1000],['Đã kiểm chứng toán học',summary.verified],['Chờ kiểm chứng toán học',summary.pendingMathReview],['Lưu ý',summary.note],...Object.entries(summary.byGrade).map(([g,n])=>['Lớp '+g,n]),['Môi trường','Local; chưa push hoặc cập nhật Supabase']]);
sheet.addRow(['STT','Mã câu','Khối','Chủ đề nguồn','Đề bài','Đáp án đã kiểm chứng','Lời giải đã kiểm chứng','Đáp án/lời giải nguồn – chưa mặc định đúng','Trạng thái','File gốc','Số câu gốc','SHA256']);
questions.forEach((q,i)=>sheet.addRow([i+1,q.id,q.grade,q.topic,q.prompt,q.answer||'',q.solution||'',q.sourceSolution,q.status,q.source.file,q.source.question,q.source.sha256]));
for(const ws of [info,sheet]){ws.views=[{state:'frozen',ySplit:1}];ws.getRow(1).font={bold:true};ws.autoFilter={from:{row:1,column:1},to:{row:ws.rowCount,column:ws.columnCount}};ws.columns.forEach((c,i)=>{c.width=i===4||i===6||i===7?65:24;});}
await fs.mkdir('baocao',{recursive:true});
await book.xlsx.writeFile(`baocao/DATATM_1000_cau_da_loc${secondBatch?'_dot_2':''}.xlsx`);
if(secondBatch){
 const pending=await read('data/datatm-screened-pending.json');
 const existing=new Set(pending.questions.map(normalized));
 for(const q of questions){
  if(existing.has(normalized(q)))continue;
  pending.questions.push({id:q.id,grade:q.grade,topic:q.topic,prompt:q.prompt,sourceSolution:q.sourceSolution||'Chưa có đáp án/lời giải nguồn – cần giáo viên bổ sung.',review:{status:'pending',missingSourceSolution:!q.sourceSolution.trim()},source:{file:q.source.file.split(/[\\/]/).at(-1),question:q.source.question,sha256:q.source.sha256}});
  existing.add(normalized(q));
 }
 await fs.writeFile('data/datatm-screened-pending.json',JSON.stringify(pending,null,2));
}
console.log(JSON.stringify(summary,null,2));
