import {richMath} from './math.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function archivedHistoryHTML(state,catalog){
 const ids=new Set(catalog.map(e=>e.id)),old=(state.attempts||[]).filter(a=>!ids.has(a.exerciseId));
 if(!old.length)return '';
 return `<section class="card archived-history"><h2>Lịch sử nội dung đã lưu trữ</h2><p>Các bài không còn trong phiên bản nội dung hiện tại vẫn được giữ lại. Liên hệ giáo viên để đối chiếu đề gốc.</p>${old.map(a=>`<details><summary>${esc(a.exerciseId)} · ${new Date(a.time).toLocaleDateString('vi-VN')}</summary><p>Đáp án đã lưu: ${esc(a.answer)}</p>${richMath(a.working||'')}${a.explanation?`<div>${richMath(a.explanation)}</div>`:''}${a.revisedWorking?`<div>${richMath(a.revisedWorking)}</div>`:''}</details>`).join('')}</section>`;
}
