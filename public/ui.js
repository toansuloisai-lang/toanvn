import { math } from './math.js';
const shapes = {
  home:'<path d="m3 10 9-8 9 8M5 9v12h5v-7h4v7h5V9"/>',
  book:'<path d="M12 5c-3-3-7-3-10-1v16c3-2 7-2 10 0 3-2 7-2 10 0V4c-3-2-7-2-10 1v15"/>',
  pencil:'<path d="m4 16-1 5 5-1L21 7q2-2-1-4t-4-1zM14 4l6 6"/>',
  bulb:'<path d="M8 16c0-3-4-4-4-8a8 8 0 0 1 16 0c0 4-4 5-4 8zM8 19h8M10 22h4M12 15V9m-3-2 3 3 3-3"/>',
  trophy:'<path d="M7 2h10v8a5 5 0 0 1-10 0zM7 5H3v4q0 5 5 5m9-9h4v4q0 5-5 5M12 15v5m-5 2h10m-8-2h6"/>',
  chart:'<path d="M3 21V13h4v8M10 21V8h4v13M17 21V2h4v19M3 9l5-4 5 1 5-5"/>',
  notebook:'<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 7h8M8 11h8M8 15h4"/>',
  formula:'<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 18h8M8 8q2-3 4 0m-4 2q2 3 4 0M14 5h3l-3 4h3"/>',
  user:'<circle cx="12" cy="6" r="4"/><path d="M4 22v-3a8 8 0 0 1 16 0v3z"/>',
  report:'<rect x="3" y="3" width="18" height="19" rx="2"/><path d="M7 7h10M7 12v5M12 14v3M17 10v7M7 20h10"/>',
  people:'<circle cx="9" cy="7" r="3"/><path d="M2 21v-3a7 7 0 0 1 14 0v3zM17 4a3 3 0 0 1 0 6m2 3q4 1 3 6h-3"/>',
  settings:'<path d="m9 2-1 3-3 1-3 4 2 2-1 3 3 4 3-1 3 4 3-2 3 1 3-4-1-3 2-3-3-4-3 1-2-4z"/><circle cx="12" cy="12" r="3"/>',
  search:'<circle cx="10" cy="10" r="7"/><path d="m15 15 6 6"/>',
  bell:'<path d="M5 17h14l-2-3V9a5 5 0 0 0-10 0v5zM10 21h4M12 2v2"/>',
  clipboard:'<rect x="4" y="4" width="16" height="18" rx="2"/><rect x="8" y="2" width="8" height="4" rx="1"/><path d="m8 13 3 3 5-6M8 19h8"/>',
  map:'<path d="m2 6 6-3 8 3 6-3v17l-6 3-8-3-6 3zM8 3v17m8-14v17"/><path d="M16 6c0 4-4 7-4 7S8 10 8 6a4 4 0 0 1 8 0"/><circle cx="12" cy="6" r="1"/>',
  video:'<rect x="2" y="5" width="20" height="16" rx="2"/><path d="m10 10 6 4-6 4zM2 2h16"/>',
  target:'<path d="M21 10a10 10 0 1 1-7-8M17 11a6 6 0 1 1-6-5M12 12l9-9m-4 0h4v4"/>',
  mail:'<rect x="2" y="3" width="20" height="18" rx="2"/><path d="m2 5 10 8L22 5"/>',
  globe:'<circle cx="12" cy="12" r="10"/><ellipse cx="12" cy="12" rx="4" ry="10"/><path d="M2 12h20M4 6h16M4 18h16"/>',
  check:'<path d="m5 12 4 4L19 6"/>',
  star:'<path d="m12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z"/>',
  arrow:'<path d="M4 12h16m-6-6 6 6-6 6"/>',
  flask:'<rect x="8" y="1" width="8" height="3" rx="1.5"/><path d="M10 6v6L3 22q-1 2 2 2h14q3 0 2-2l-7-10V6M7 17h10"/>',
};
export function icon(name,cls=''){return `<svg class="ui-icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${shapes[name]||shapes.star}</svg>`;}
export const navigation=[['home','Trang chủ','home'],['exams','Thi tr\u1eafc nghi\u1ec7m','clipboard'],['knowledge','Ph\u00e2n t\u00edch ki\u1ebfn th\u1ee9c','chart'],['essays','B\u00e0i t\u1ef1 lu\u1eadn','pencil'],['learning','Hồ sơ lỗi & khắc phục','report'],['lessons','Học tập','book'],['practice','Luyện tập','pencil'],['explore','Khám phá','bulb'],['challenges','Thử thách','trophy'],['progress','Báo cáo','chart'],['notebook','Sổ tay lỗi sai','notebook'],['formulas','Bảng công thức','formula'],['profile','Hồ sơ','user'],['parent','Báo cáo tiến bộ','report'],['teacher','Quản lý lớp','people'],['settings','Cài đặt','settings']];
navigation.splice(1,0,['chat','Gia sư AI','bulb']);
export function referenceHome({state,skills,stat,due,escape,skillName,grade,exercises}){
  const sample=false;
  const latest=state.attempts.at(-1)||{skill:skills[0].id,time:Date.now()};
  const studied=new Set(state.attempts.filter(a=>a.completed).map(a=>a.exerciseId)).size;
  const percent=sample?65:Math.round(studied/exercises.length*100);
  const rows=sample?[['Phương trình bậc nhất',8,10],['Bất đẳng thức',5,10],['Hàm số',3,10],['Hình học',2,10]]:skills.map(s=>{const n=stat(s.id);return [s.name,n.completed,n.total];});
  const errors=sample?[['Phân phối và đổi dấu',12],['Nhầm công thức',8],['Thiếu điều kiện',6],['Tính toán nhầm',5],['Sai đơn vị',3]]:skills.map(s=>[s.name,state.attempts.filter(a=>a.skill===s.id&&!a.initialCorrect).length]).filter(([,n])=>n).sort((a,b)=>b[1]-a[1]);
  const score=sample?'8/10':`${state.attempts.filter(a=>a.skill===latest.skill&&a.initialCorrect).length}/${state.attempts.filter(a=>a.skill===latest.skill).length}`;
  const title=sample?'Phương trình bậc nhất':skillName(latest.skill);
  const ring=(n,label,cls='')=>`<div class="progress-ring ${cls}" style="--progress:${n}" role="img" aria-label="${label}"><svg viewBox="0 0 120 120"><defs><linearGradient id="ring-${cls||'big'}" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#0fac92"/><stop offset="1" stop-color="#45c8b0"/></linearGradient></defs><circle class="ring-base" cx="60" cy="60" r="51"/><circle class="ring-fill" cx="60" cy="60" r="51" stroke="url(#ring-${cls||'big'})" stroke-dasharray="${n*3.2044} 320.44"/></svg><strong>${label}</strong></div>`;
  return `<div class="reference-dashboard"><div class="dashboard-center">
    <section class="reference-hero"><div class="banner-waves"></div><div class="banner-copy"><h1>Học Toán không chỉ là làm đúng<br> mà là hiểu đúng!</h1><p>Khám phá, thử nghiệm, phân tích lỗi sai và tự sửa.<br> Mỗi lỗi sai là một bước tiến bộ!</p><a class="start-learning" href="#learn/${due()[0]?.[0]||exercises[0].id}${due().length?'/review':''}">Bắt đầu học ngay ${icon('arrow')}</a></div><img class="student-art" src="/assets/student.svg" alt="Bạn học sinh đang suy nghĩ và làm toán"><div class="hero-formulas" aria-hidden="true"><span>${math('a^2+b^2=c^2')}</span><span>${math('a^2+b^2=c^2')}</span><span>?</span></div><div class="banner-motto">Sai<br> ↓<br> Sửa<br> ↓<br> Hiểu<br> ↓<br> Giỏi hơn!</div></section>
    <section class="quick-panel">${[
      ['clipboard','Kiểm tra trình độ','Xác định kiến thức hiện tại<br> và đề xuất lộ trình phù hợp.','learn/'+exercises[0].id,'blue'],
      ['map','Lộ trình học tập','Theo lớp, chủ đề, mục tiêu<br> và năng lực cá nhân.','map','mint'],
      ['video','Bài học tương tác','Video, hình ảnh, ví dụ minh họa<br> và câu hỏi kiểm tra hiểu bài.','lessons','violet'],
      ['clipboard','Luyện tập & Chấm bài','Bài tập theo mức độ, giao nộp,<br> chấm tự động và nhận xét.','practice','orange']
    ].map(([i,t,d,href,c])=>`<a class="quick-card ${c}" href="#${href}"><span class="quick-icon">${icon(i)}</span><h2>${t}</h2><p>${d}</p><span class="quick-arrow">${icon('arrow')}</span></a>`).join('')}</section>
    <section class="learning-route"><div class="route-heading"><h2>${icon('target')} Lộ trình học tập của bạn</h2><span>Lớp ${grade} <b>·</b> ${skills.length} chủ đề · ${exercises.length} bài khởi đầu</span><a href="#profile">Thay đổi lớp</a></div><div class="route-steps">${['Hiểu bài','Làm thử','Nhận ra lỗi','Giải thích và sửa','Vận dụng','Ôn tập'].map((t,i)=>`<a href="#${['lessons','practice','notebook','learn/'+exercises[0].id,'explore','notebook'][i]}" class="route-step ${sample?(i<2?'done':i===2?'current':''):(i===0?'current':'')}"><span>${sample&&i<2?icon('check'):i+1}</span><strong>${t}</strong></a>`).join('')}</div>
    <div class="route-details"><section class="course-progress"><h3>Tiến độ học tập</h3><p class="hint">Bài hoàn thành / bài hiện có · Lớp ${grade}</p><div class="course-content"><div class="overall-progress">${ring(percent,percent+'%')}<p>Hoàn thành<br> khóa học hiện tại</p></div><div class="subject-progress">${rows.map(([t,n,total])=>`<div class="subject-row"><div><span>${t}</span><small>${n}/${total}</small></div><div class="subject-track"><span style="width:${total?n/total*100:0}%"></span></div></div>`).join('')}<a href="#progress">Xem chi tiết →</a></div></div></section><section class="common-errors"><div class="small-heading"><h3><span class="error-alert">!</span> Những lỗi sai thường gặp</h3><a href="#notebook">Xem tất cả</a></div>${errors.length?errors.slice(0,5).map(([t,n],i)=>`<a href="#notebook" class="error-row"><span class="error-number number-${i}">${i+1}</span><span>${t}</span><small>${n} lần</small><span class="chevron">›</span></a>`).join(''):'<p class="no-errors">Chưa ghi nhận lỗi sai. Hãy bắt đầu một bài luyện tập.</p>'}</section></div></section>
    <section class="featured-panel"><h2>${icon('people')} Khám phá chức năng nổi bật</h2><div class="featured-grid">${[
      ['search','Bắt lỗi gia sư','Tìm bước sai đầu tiên,<br> đề xuất cách sửa.','learn/'+exercises[0].id,'blue'],
      ['bulb','Thử thách phản ví dụ','Tìm trường hợp bác bỏ<br> một nhận định sai.','explore/counter','mint'],
      ['globe','Toán quanh em','Giải quyết tình huống thực tế<br> với số liệu và lập luận.','explore/garden','orange'],
      ['user','Học sinh dạy lại cho máy','Giải thích lại cho máy<br> để chứng minh mình đã hiểu.','learn/'+exercises[0].id,'pink']
    ].map(([i,t,d,href,c])=>`<a class="featured-card ${c}" href="#${href}"><span class="featured-icon">${icon(i)}</span><div><h3>${t}</h3><p>${d}</p></div>${c==='pink'?'<span class="new-label">Mới</span>':''}</a>`).join('')}</div></section>
    </div><aside class="dashboard-right"><section class="right-report"><div class="right-heading"><h2>${icon('chart')} Báo cáo tiến bộ</h2><a href="#progress">Xem chi tiết</a></div><p class="recent-label">Kết quả học tập gần đây</p><div class="report-inner"><div class="recent-result"><span class="result-icon">${icon('star')}</span><div><h3>${title}</h3><small>${sample?'24/09/2025':(state.attempts.length?new Date(latest.time).toLocaleDateString('vi-VN'):'Chưa có lượt học')}</small></div>${ring(sample?80:stat(latest.skill).percent,score,'small')}</div><div class="report-facts">${[
    ['bulb','Lỗi thường gặp',sample?'Phân phối và đổi dấu':errors[0]?.[0]||'Chưa ghi nhận lỗi sai','mint'],
    ['check','Đã sửa',sample?'2/2 lỗi':`${state.attempts.filter(a=>!a.initialCorrect&&a.corrected).length}/${state.attempts.filter(a=>!a.initialCorrect).length} lỗi`,'mint'],
    ['check','Cần ôn thêm',sample?'Phép phân phối':errors[0]?.[0]||'Kiểm chứng bằng bài mới','orange'],
    ['star','Bài tiếp theo',sample?'5 câu củng cố':`${due().length} bài đến hẹn ôn`,'mint']
    ].map(([i,t,d,c])=>`<div class="report-fact ${c}">${icon(i)}<div><small>${t}</small><p>${d}</p></div></div>`).join('')}</div></div></section>
    <section class="system-messages" id="messages"><div class="right-heading"><h2>${icon('mail')} Tin nhắn từ hệ thống</h2><a href="#notifications">Xem tất cả</a></div>${(sample?[
      ['mail','Báo cáo học tập cá nhân hóa đã sẵn sàng','Gửi từ: Phòng thí nghiệm tư duy Toán','10:24','blue','progress'],
      ['clipboard','Lỗi sai mới được ghi nhận','Bạn vừa mắc lỗi: Nhầm công thức','09:12','orange','notebook'],
      ['notebook','Gợi ý bài học tiếp theo','Chủ đề: Bất đẳng thức','Hôm qua','violet','lessons']
    ]:[['mail','Báo cáo học tập đã cập nhật',`${state.attempts.length} lượt trả lời của bạn`,'Mới','blue','progress'],['clipboard',errors.length?'Lỗi sai đã được ghi nhận':'Tiếp tục khám phá nhé',errors[0]?.[0]||'Thử thêm một bài cùng kỹ năng','Mới','orange','notebook'],['notebook','Lịch ôn tập của bạn',`${due().length} bài đến hẹn ôn lại`,'Hôm nay','violet','notebook']]).map(([i,t,d,time,c,href])=>`<a class="message-row" href="#${href}"><span class="message-icon ${c}">${icon(i)}</span><div><h3>${t}</h3><p>${d}</p></div><time>${time}</time></a>`).join('')}</section>
    <section class="parent-panel"><div class="parent-banner"><div><h2>${icon('chart')} Tiến bộ của chính mình</h2><p>Xem lại điều đã hiểu, những lỗi đã sửa<br> và chọn bước học tiếp theo.</p><a href="#progress">Xem báo cáo của tôi</a></div><img src="/assets/student.svg" alt="Học sinh nhìn lại quá trình học"></div></section></aside></div><div class="reference-footnote"><span>Phòng thí nghiệm tư duy Toán <b>|</b> Học từ lỗi sai - Hiểu đúng bản chất - Tiến bộ mỗi ngày${sample?' · Dữ liệu minh họa':''}</span><span>♡ Cùng bạn chinh phục Toán học!</span></div>`;
}
