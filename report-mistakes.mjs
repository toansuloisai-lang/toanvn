// Preserve the original evidence even after a successful correction.
export function mistakeDetails(m,report){
 const rows=[];
 if(m.kind==='exam'){
  const selected=Number.isInteger(m.originalAnswer)?`${'ABCD'[m.originalAnswer]}. ${m.choices?.[m.originalAnswer]||''}`:'Chưa trả lời';
  rows.push(`Học sinh chọn: ${selected}`,`Đáp án đúng: ${'ABCD'[m.correctIndex]}. ${m.choices?.[m.correctIndex]||''}`);
 }else if(m.kind==='essay'){
  const original=report.knowledge?.history?.find(h=>h.id===m.key.slice(6));
  rows.push('Bài làm ban đầu: '+(original?.working||original?.ai?.transcription||'Bài làm trong ảnh; chưa có bản đọc đủ rõ.'));
  for(const c of original?.ai?.criteria||[])if(c.missingKnowledge||c.earned===0)rows.push(`Dẫn chứng AI${original.review?' (cần đối chiếu nhận xét giáo viên)':' — chưa được giáo viên duyệt'}: ${c.evidence||'Chưa có'}\nNhận xét: ${c.reason||'Chưa có'}${c.nextStep?'\nCách sửa: '+c.nextStep:''}`);
  if(original?.review)rows.push('Giáo viên nhận xét bài đầu: '+original.review.comment);
 }else if(m.kind==='practice'){
  const a=report.attempts?.find(a=>'practice:'+a.id===m.key);
  rows.push('Đáp án ban đầu: '+(a?.answer??'Chưa có dữ liệu'));
  if(a?.working)rows.push('Cách làm ban đầu: '+a.working);
  if(a?.diagnosis?.evidence)rows.push('Dẫn chứng: '+a.diagnosis.evidence);
 }
 rows.push('Phân tích'+(m.resolved?' / nhận xét sau sửa':'')+': '+(m.analysis||'Chưa đủ bằng chứng về nguyên nhân.'));
 rows.push('Cách giải đúng: '+m.solution,'Kiến thức cần dùng: '+m.knowledge);
 if(m.nextStep)rows.push('Hướng sửa: '+m.nextStep);
 const last=m.repairs?.at(-1);
 if(last?.working)rows.push('Bản sửa gần nhất: '+last.working);
 if(last?.review)rows.push('Giáo viên duyệt bản sửa: '+(last.review.approved?'Đã xác nhận cách làm đúng. ':'Cần sửa thêm. ')+last.review.comment);
 else if(m.provisional)rows.push('Bản sửa / kết quả AI đang chờ giáo viên duyệt, chưa tính thành tích.');
 return rows.join('\n');
}
