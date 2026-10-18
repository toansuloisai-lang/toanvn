import {reportLayout} from './report-layout.mjs';
import {errorTypes} from './public/learning-core.js';
const date=value=>value?new Date(value).toLocaleString('vi-VN',{timeZone:'Asia/Bangkok'}):'Chưa có dữ liệu';
const minutes=ms=>(ms/60000).toLocaleString('vi-VN',{maximumFractionDigits:2});

export function drawParentReport(doc,{id,createdAt,teacher,teacherComment,reports,approval}){
  const layout=reportLayout(doc);
  const status=approval?'ĐÃ ĐƯỢC GIÁO VIÊN XÁC NHẬN':'BẢN NHÁP — CHƯA XÁC NHẬN';
  for(const [index,r] of reports.entries()){
    if(index)layout.newPage();
    layout.title('BẢNG ĐIỂM HỌC TẬP','Kết quả • Quá trình học • Định hướng củng cố',status,!!approval);
    layout.keyValues([
      ['Học sinh',r.student.name],['Khối / lớp',`${r.student.grade} / ${r.classes.join(', ')||'Chưa xếp lớp'}`],
      ['Giáo viên lập báo cáo',teacher.name],['Dữ liệu chốt lúc',date(createdAt)],['Mã báo cáo',id]
    ]);
    if(r.achievements?.length){
      layout.table(['VINH DANH SỬA LỖI','THÀNH TÍCH CỦA CON'],r.achievements.map(a=>[
        `Lớp ${a.className}${a.honored?' — VINH DANH TOP 10':''}`,
        a.rank?`Con đứng hạng ${a.rank} trong lớp ${a.className} (${a.classSize} học sinh).\nĐã sửa thành công ${a.corrected} câu khác nhau.${a.honored?'\nChúc mừng con có tên trong bảng vinh danh Top 10!':''}`:'Chưa được xếp hạng — chưa có câu sửa thành công đủ điều kiện.'
      ]),[.35,.65]);
      layout.note('Xếp hạng thành tích sửa lỗi, không phải xếp hạng điểm thi. Mỗi câu chỉ tính một lần; tự luận cần giáo viên duyệt bản sửa đạt điểm tối đa. Cùng số câu được đồng hạng; bảng vinh danh chọn tối đa 10 em, sắp tên khi bằng điểm. Thứ hạng được chốt tại thời điểm lập báo cáo.');
    }
    layout.cards([
      {label:'BÀI LUYỆN TẬP',value:String(r.summary.exercises),detail:`${r.summary.attempts} lượt luyện tập`},
      {label:'ĐÚNG TỪ ĐẦU',value:String(r.summary.correct),detail:`${r.summary.completed} lượt hoàn thành`},
      {label:'SAI TỪ ĐẦU',value:String(r.summary.wrong),detail:`${r.summary.corrected} lượt đã sửa đúng`},
      {label:'HOẠT ĐỘNG',value:r.usage?minutes(r.usage.totalMs):'—',detail:r.usage?'phút đã ghi nhận':'Chưa có dữ liệu'}
    ]);
    layout.section(1,'Bảng điểm nhiệm vụ');
    layout.table(['STT','Nhiệm vụ / ngày giao','Đã làm','Đúng','Điểm /10','Trạng thái / hạn'],
      r.assignments.map((a,i)=>[i+1,`${a.title}\nGiao: ${date(a.created)}`,`${a.result.answered}/${a.result.total}`,a.result.correct,a.result.score===null?'—':a.result.score,a.result.complete?`Hoàn thành\nHạn: ${a.due}`:`Tạm tính, chưa hoàn thành\nHạn: ${a.due}`]),
      [.07,.33,.10,.09,.12,.29],{size:8.5});
    if(!r.assignments.length)layout.note('Chưa có nhiệm vụ được giao bởi giáo viên này; không có điểm để kết luận.');
    else layout.keyValues([['ĐIỂM TRUNG BÌNH',`${(r.assignments.reduce((sum,a)=>sum+(a.result.score||0),0)/r.assignments.length).toLocaleString('vi-VN',{maximumFractionDigits:2})}/10${r.assignments.some(a=>!a.result.complete)?' — tạm tính, gồm nhiệm vụ chưa hoàn thành':''}`]]);
    layout.note('Phạm vi: toàn bộ lịch sử đến lúc chốt; điểm chỉ gồm nhiệm vụ do giáo viên lập báo cáo giao. Điểm = số câu có đáp án đầu đúng / số câu được giao × 10. Câu chưa làm tính 0 tạm thời. Sửa sau gợi ý không thay điểm đầu.');
    layout.section(2,'Thời gian hoạt động trên app');
    if(r.usage){
      layout.keyValues([['Tổng thời gian',`${minutes(r.usage.totalMs)} phút`],['Bắt đầu đo từ',date(r.usage.startedAt)]]);
      layout.table(['Ngày (UTC+7)','Thời gian hoạt động'],Object.entries(r.usage.days).sort().map(([day,ms])=>[day,`${minutes(ms)} phút`]),[.5,.5]);
    }else layout.note('Thời gian trên app: chưa có dữ liệu. Các lượt học trước khi bật đo thời gian không được quy đổi thành số phút.');
    layout.note('Ước lượng thời gian cửa sổ app đang hoạt động, còn tương tác trong 2 phút gần nhất và có mạng; không phải bằng chứng tập trung. Không cộng trùng nhiều tab. Mất mạng, đóng app hoặc ngừng tương tác có thể làm thiếu thời gian.');
    layout.section(3,'Thống kê lỗi và kiến thức cần củng cố');
    const errors=r.errors.filter(e=>e.count);
    if(errors.length)layout.table(['Loại lỗi','Số lượt','Đã xác nhận','Chờ xem xét'],errors.map(e=>[e.label,e.count,e.confirmed,e.pending]),[.46,.16,.19,.19]);
    else layout.note('Chưa có lỗi luyện tập được phân loại trong mục này. Lỗi thi trắc nghiệm và tự luận xem ở phần phân tích kiến thức bên dưới.');
    if(r.skills.length)layout.table(['Kỹ năng / chủ đề','Đúng / lượt làm','Trạng thái'],r.skills.map(s=>[s.name,`${s.correct}/${s.attempts}`,s.status]),[.44,.22,.34]);
    layout.note('Kỹ năng/chủ đề liên quan không tự chứng minh học sinh hổng kiến thức. Nguyên nhân và hướng khắc phục cần bằng chứng; nhận định AI chưa duyệt vẫn là giả thuyết.');
    layout.section(4,'Lịch sử bài làm và phân tích lỗi');
    if(!r.attempts.length)layout.note('Chưa có lượt làm bài luyện tập. Lịch sử thi trắc nghiệm và tự luận được trình bày riêng trong phần phân tích kiến thức bên dưới.');
    for(const [i,a] of r.attempts.entries()){
      const rows=[['Thời điểm / loại lượt',`${date(a.time)} • ${({practice:'Luyện tập',review:'Ôn lại',transfer:'Kiểm chứng'})[a.mode]||a.mode}`],['Kỹ năng',a.skill],['Đáp án đầu',`${a.answer} — ${a.initialCorrect?'Đúng':'Sai'}`],['Cách làm ban đầu',a.working||'Chưa có dữ liệu']];
      if(!a.initialCorrect){
        const d=a.diagnosis;
        rows.push(['Phân loại lỗi',errorTypes[d?.type]||'Chưa đủ bằng chứng'],
          ['Chỗ sai / dẫn chứng',d?.evidence||'Chưa đủ bằng chứng để xác định bước sai.'],
          ['Vì sao sai',d?.reason||'Chưa được phân tích; không suy đoán từ đáp án cuối.'],
          ['Trạng thái phân tích',d?.status==='confirmed'?`${d.reviewer||'Giáo viên (tài khoản cũ)'} đã xác nhận lúc ${date(d.updatedAt)}`:d?.source==='gemini'?'AI đề xuất — chưa được giáo viên xác nhận':'Chưa có xác nhận của giáo viên'],
          ['Kiến thức cần củng cố',a.rule||a.skill],['Hướng khắc phục',d?.nextStep||'Giáo viên cần xem cách làm và trao đổi thêm với học sinh.'],
          ['Đáp án sau sửa',a.correction?`${a.correction} — ${a.corrected?'Đã đúng sau sửa':'Đang sửa'}`:'Chưa nhập'],['Các bước sau sửa',a.revisedWorking||'Chưa có dữ liệu']);
      }
      rows.push(['Học sinh giải thích',a.explanation||'Chưa có dữ liệu']);if(a.note)rows.push(['Nhận xét đã lưu',a.note]);
      rows.push(['Hoàn thành',a.completed?date(a.completed):'Chưa hoàn thành']);
      layout.table(['Nội dung',`Bài ${i+1}. ${a.prompt}`],rows,[.28,.72],{labelColumn:true});
    }
    layout.section(5,'So sánh tiến bộ và hoạt động bổ sung');
    if(!r.comparisons.length)layout.note('Chưa đủ dữ liệu đối chiếu trước–sau.');
    else layout.table(['Bài đã sửa','Trước sửa','Kiểm chứng sau sửa','Tái mắc'],r.comparisons.map(c=>{
      const before=r.attempts.find(a=>a.id===c.attemptId);
      return [before?.prompt||c.attemptId,'Lần đầu sai',c.after?`Bài khác cùng kỹ năng: ${c.after.correct?'đúng':'sai'} từ đầu\n${date(c.after.time)}`:'Chưa có bài khác cùng kỹ năng để kiểm chứng',c.recurrences];
    }),[.30,.16,.40,.14],{size:8.5});
    layout.note('Các bài chưa được hiệu chuẩn độ khó; so sánh không tự chứng minh học sinh đã thành thạo hoặc nguyên nhân của tiến bộ.');
    for(const a of r.activities){
      const rows=[['Thời điểm',date(a.time)],['Kết quả',a.result||'Chưa có dữ liệu']];if(a.explanation)rows.push(['Giải thích',a.explanation]);
      for(const n of a.notes)rows.push([`Nhận xét ${n.name}`,n.text]);
      layout.table(['Hoạt động',a.title],rows,[.28,.72],{labelColumn:true});
    }
    if(r.knowledge){
      const k=r.knowledge;
      layout.section(6,'Kiến thức, bài thi và tự luận');
      layout.note(k.note);
      layout.table(['Kiến thức','Đúng / số câu','Đánh giá'],k.skills.map(s=>[s.name,`${s.correct}/${s.total}`,s.status+(s.provisional?' · có điểm AI chưa duyệt':'')]),[.4,.2,.4]);
      layout.table(['Bài chưa hoàn thành','Trạng thái','Hạn'],k.pending.map(p=>[p.title,p.status+(p.overdue?' · quá hạn':''),p.due||'Chưa đặt hạn']),[.5,.3,.2]);
      for(const h of k.history){
        layout.keyValues([['Bài làm',h.title],['Lần nộp / thời gian',`${h.revision||1} · ${date(h.time)}`],['Khoảng thời gian làm bài',`${minutes(h.elapsedMs)} phút (từ bắt đầu / lần nộp trước; không phải thời gian tập trung)`],['Điểm',h.score===null?'Chưa chấm':`${h.score}/10${h.provisional?' · AI / chưa giáo viên duyệt':' · đã chốt'}`]]);
        if(['exam','library'].includes(h.kind))for(const q of h.questions)layout.keyValues([['Câu hỏi',q.prompt],['Bài làm / lựa chọn',q.answer],['Kết quả',q.correct===null?'Tự luận: xem bài làm và nhận xét':q.correct?'Đúng':'Sai / bỏ trống'],['Đáp án và cách giải',q.correctAnswer+'\n'+q.solution]]);
        if(['essay','practice-photo'].includes(h.kind)){
          layout.keyValues([['Đề tự luận',h.prompt],['Cách làm nhập trên app',h.working||'Bài làm trong ảnh'],['Ảnh bài làm',`${h.images.length} ảnh lưu trên hệ thống; xem tại bài nộp ${h.id}`],['Bản đọc ảnh của AI',h.ai?.transcription||'Chưa có'],['Nhận xét AI',h.ai?.summary||'Chưa có'],['Giáo viên',h.review?.comment||'Chưa duyệt']]);
          for(const c of h.ai?.criteria||[])layout.keyValues([['Tiêu chí',c.id],['Điểm AI',String(c.earned)],['Bằng chứng',c.evidence||'Chưa thấy bước tương ứng'],['Phân tích',c.reason],['Kiến thức cần ôn',c.missingKnowledge],['Bước sửa',c.nextStep]]);
          for(const [i,photo] of (h.photoData||[]).entries())layout.image(Buffer.from(photo,'base64'),`Ảnh bài làm ${i+1} · Lần nộp ${h.revision}`);
        }
        if(h.kind==='library')for(const [i,photo] of (h.photoData||[]).entries())layout.image(Buffer.from(photo,'base64'),`Ảnh bài làm ${i+1}`);
      }
      for(const m of k.mistakes){
        layout.keyValues([['Câu cần khắc phục',m.prompt],['Trạng thái',m.resolved?'Đã sửa đúng câu cũ':'Cần tiếp tục sửa'],['Kiến thức cần bổ sung',m.knowledge],['Phân tích',m.analysis],['Cách giải',m.solution],['Nên làm tiếp',m.nextStep]]);
        for(const repair of m.repairs)layout.keyValues([['Lần sửa',date(repair.time)],['Kết quả',repair.correct?'Đúng':'Chưa đúng / chờ chấm'],['Cách làm khi sửa',repair.working||'Xem lần nộp tự luận tương ứng']]);
      }
    }
    layout.section(r.knowledge?7:6,'Nhận xét và xác nhận của giáo viên');
    layout.keyValues([['Nhận xét gửi gia đình',teacherComment||'Chưa có nhận xét']]);
    if(approval){
      layout.table(['GIÁO VIÊN XÁC NHẬN','THÔNG TIN XÁC NHẬN'],[[approval.name,`Mã tài khoản: ${approval.teacherId}\nThời điểm: ${date(approval.time)}\nTrạng thái: Đã xác nhận trên ứng dụng`]], [.43,.57],{fill:'#EDF7F1'});
      layout.note('Giáo viên đã xem và xác nhận gửi bản báo cáo này. Xác nhận báo cáo không đổi các phân tích AI chưa duyệt thành kết luận đã xác nhận. Đây là xác nhận bằng tài khoản trên ứng dụng, không phải chữ ký số có chứng thư.');
    }else layout.table(['GIÁO VIÊN LẬP BÁO CÁO','TRẠNG THÁI'],[[teacher.name,'Chưa có xác nhận. Cần kiểm tra và xác nhận trên ứng dụng trước khi gửi phụ huynh.']],[.43,.57]);
  }
  layout.footer(approval?'Đã xác nhận':'Bản nháp');
}
