import {studentOverview} from './student-report.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export async function mountAssessmentSummary(host,{request,compact=false}){
 host.innerHTML='<p role="status">Đang tổng hợp bài làm…</p>';
 try{const report=await request('/api/learning/report');if(!host.isConnected)return;
  const modern=report.assignments.filter(a=>['library','practice-photo'].includes(a.kind));
  if(compact&&!modern.length){host.remove();return;}
  host.innerHTML=`<h2>Kết quả học tập đã đồng bộ</h2><p>Bao gồm bài giáo viên giao và bài luyện tập nộp ảnh. Điểm chính thức do giáo viên chốt.</p>${compact?`<p><strong>${report.analytics.completed}/${report.analytics.assigned}</strong> bài đã nộp · Điểm trung bình chính thức: <strong>${report.analytics.average===null?'Chờ chấm':report.analytics.average+'/10'}</strong></p>`:studentOverview(report)}${modern.slice(-10).reverse().map(a=>`<p><a href="${esc(a.href)}">${esc(a.title)}</a> · ${a.result.complete?'Đã nộp':'Chưa nộp đủ'} · ${a.virtualTeacher?('AI tham kh\u1ea3o: '+(a.result.provisionalScore===null||a.result.provisionalScore===undefined?'Ch\u1edd ch\u1ea5m':a.result.provisionalScore+'/10')):a.result.score===null?'Chờ giáo viên chốt điểm':'Điểm chính thức: '+a.result.score+'/10'}</p>`).join('')}${compact?'<a class="btn secondary" href="#learning">Xem đầy đủ hồ sơ và kết quả →</a>':'<p class="hint">Nhật ký hành trình bên dưới giữ dữ liệu theo luồng học cũ; phần tổng hợp này bao gồm các bài nộp mới.</p>'}`;
  if(report.assignments.length&&report.assignments.every(a=>a.virtualTeacher)){
   host.querySelector('h2+p').textContent='Bài do hệ thống quản lý. Điểm tự động và nhận xét AI chỉ để tham khảo.';
   if(compact)host.querySelector('h2+p+p').innerHTML=`<strong>${report.analytics.completed}/${report.analytics.assigned}</strong> bài đã nộp · Theo dõi điểm tham khảo của từng bài bên dưới.`;
  }
 }catch(error){if(host.isConnected)host.innerHTML=`<p role="alert">${esc(error.message)}</p>`;}
}
