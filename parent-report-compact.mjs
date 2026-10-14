import {reportLayout} from './report-layout.mjs';
import {reportMetrics} from './school-brand.mjs';
import {mistakeDetails} from './report-mistakes.mjs';
const date=t=>new Date(t).toLocaleString('vi-VN',{timeZone:'Asia/Bangkok'});
export function drawCompactReport(doc,{id,createdAt,teacher,teacherComment,reports,approval}){
 const l=reportLayout(doc),trial=/kiểm tra hệ thống|thử nghiệm hệ thống/i.test(teacherComment||'');
 for(const [i,r] of reports.entries()){
  if(i)l.newPage();const m=reportMetrics(r),k=r.knowledge||{skills:[],mistakes:[],pending:[]};
  l.brand();l.keyValues([['Học sinh',r.student.name],['Lớp',r.classes.join(', ')||String(r.student.grade)],['Ngày chốt',date(createdAt)]]);
  if(trial)l.table([],[[ 'DỮ LIỆU THỬ NGHIỆM HỆ THỐNG — KHÔNG PHẢN ÁNH NĂNG LỰC HỌC SINH' ]],[1],{fill:'#FFF2C9',size:10});
  l.cards([{label:'BÀI ĐÃ LÀM',value:String(m.done),detail:'đã nộp / luyện tập'},{label:'ĐÚNG TỪ ĐẦU',value:String(m.correct),detail:'câu / lượt luyện tập'},{label:'SAI TỪ ĐẦU',value:String(m.wrong),detail:'câu / lượt luyện tập'},{label:'HOẠT ĐỘNG',value:r.usage?String(Math.round(r.usage.totalMs/60000)):'—',detail:r.usage?'phút ghi nhận':'Chưa ghi nhận'}]);
  l.note('Đúng/sai tính theo câu trắc nghiệm và lượt luyện tập. Bài tự luận tính theo từng câu được giao; điểm chi tiết ở trang bảng điểm.');
  l.section(1,'Tổng quan điểm các đề');
  l.columns([...m.exams].sort((a,b)=>a.title.localeCompare(b.title,'vi')).map((e,i)=>({label:e.title.match(/Đề\s*\d+/i)?.[0]||'Bài '+(i+1),value:e.score})));
  for(const a of r.achievements||[])l.note(a.rank?`Thành tích sửa lỗi lớp ${a.className}: Con đứng hạng ${a.rank} · ${a.corrected} câu sửa thành công.${a.honored?' Chúc mừng con được VINH DANH TOP 10!':''}`:'Thành tích sửa lỗi: Chưa được xếp hạng.');
  l.note('Nhận xét giáo viên: '+(teacherComment||'Chưa có nhận xét.'));
  l.newPage();l.section(2,'Tổng kết kiến thức');
  if(trial)l.note('Các mức màu dưới đây chỉ mô tả kết quả kiểm tra hệ thống, không kết luận điểm mạnh hoặc điểm yếu của học sinh.');
  l.note('Xanh: từ 80% và ít nhất 3 câu; vàng: đang hình thành hoặc chưa đủ mẫu; đỏ: dưới 60% với ít nhất 3 câu. Kết quả sửa câu cũ không thay điểm đúng từ đầu.');
  l.bars(k.skills.map(s=>({label:s.name,value:s.total?s.correct/s.total*100:0,detail:`${s.correct}/${s.total} câu`,color:s.total<3?'#D9AA36':s.correct/s.total>=.8?'#268160':s.correct/s.total<.6?'#C44343':'#D9AA36'})));
  l.newPage();l.section(3,'Bảng điểm các đề đã nộp');
  l.table(['Đề','Điểm /10','Đúng / tổng','Thời lượng'],m.exams.map(e=>[e.title,e.score,`${e.questions.filter(q=>q.correct).length}/${e.questions.length}`,`${Math.round(e.elapsedMs/6000)/10} phút`]),[.48,.14,.18,.2]);
  if(m.exams.length)l.note(`Điểm trung bình thi trắc nghiệm: ${(m.exams.reduce((n,e)=>n+e.score,0)/m.exams.length).toFixed(1)}/10. Thời lượng là thời gian trôi qua, không phải thời gian tập trung.`);
  if(m.essays.length)l.table(['Tự luận','Lần nộp','Điểm','Trạng thái'],m.essays.map(e=>[e.title,e.revision,e.score??'Chưa chấm',e.provisional?'Chờ giáo viên duyệt':'Đã duyệt']),[.5,.12,.12,.26]);
  if(r.assignments.length)l.table(['Luyện tập','Đã làm','Điểm'],r.assignments.map(a=>[a.title,`${a.result.answered}/${a.result.total}`,a.result.score??'Chưa chấm']),[.6,.2,.2]);
  l.newPage();l.section(4,'Học sinh sai ở đâu — chi tiết từng câu');
  const groups=new Map();for(const mistake of k.mistakes){const key=mistake.topic||mistake.knowledge||'Kiến thức khác';if(!groups.has(key))groups.set(key,[]);groups.get(key).push(mistake);}
  l.note('Liệt kê đủ từng câu sai ban đầu, kể cả câu đã sửa đúng. Với trắc nghiệm, hệ thống đối chiếu lựa chọn với đáp án; không khẳng định học sinh sai ở bước suy luận nào khi chưa có cách làm.');
  for(const [topic,items] of groups){
   l.note(`${topic} · ${items.length} câu sai ban đầu · ${items.filter(m=>!m.resolved).length} câu cần tiếp tục sửa`);
   l.table(['Đề / câu và trạng thái','Đề bài','Đối chiếu lỗi và cách sửa'],items.map(m=>[`${m.title||'Bài làm'}${Number.isInteger(m.questionIndex)?'\nCâu '+(m.questionIndex+1):''}\n${m.resolved?'Đã sửa đúng':'Cần sửa'}${m.provisional?' · chờ giáo viên duyệt':''}`,m.prompt,mistakeDetails(m,r)]),[.2,.3,.5],{size:8,padding:6});
  }
  if(!groups.size)l.note('Chưa ghi nhận câu sai.');
  l.newPage();l.section(5,'Bài chưa hoàn thành và xác nhận');
  const grouped=new Map();for(const p of k.pending||[]){const key=p.kind+':'+p.id;if(!grouped.has(key))grouped.set(key,{...p,count:0});grouped.get(key).count++;}
  const pending=[...grouped.values()],rows=[];for(let j=0;j<pending.length;j+=2)rows.push(pending.slice(j,j+2).map(p=>`${p.count>1?p.title.split(' — ')[0]:p.title}\n${p.status}${p.count>1?' · '+p.count+' câu chưa hoàn thành':''}${p.due?' · Hạn '+p.due:''}`));
  if(rows.length)l.table(['Bài cần hoàn thành','Bài cần hoàn thành'],rows.map(row=>[row[0],row[1]||'—']),[.5,.5],{size:8});else l.note('Không có bài đang chờ hoàn thành.');
  l.keyValues([['Giáo viên',approval?.name||teacher.name],['Xác nhận',approval?`Đã xác nhận trên ứng dụng lúc ${date(approval.time)}`:'Bản nháp — chưa xác nhận'],['Mã báo cáo',id]]);
  l.note('Bản tổng hợp dành cho phụ huynh. Hồ sơ chi tiết và ảnh bài làm được giữ trên hệ thống. Xác nhận tài khoản không phải chữ ký số có chứng thư; không thay thế việc duyệt điểm AI.');
 }
 l.footer(approval?'Đã xác nhận':'Bản nháp');
}
