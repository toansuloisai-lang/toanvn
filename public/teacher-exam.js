import {mountClassAssessments,assessmentBreadcrumb} from './class-assessments.js';
import {promptHTML,richMath} from './math.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const normalize=s=>s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d');
export async function mountTeacherExam(root,{request,classId}){
  const host=root.querySelector('#teacher-exam-builder');if(!host)return;
  try{
    if(!classId){await mountClassAssessments(host,{request,kind:'exams',createIntent:true,createPath:'teacher-library/assign'});return;}
    const data=await request('/api/learning/class-report?classId='+encodeURIComponent(classId));data.classes=data.classes.filter(c=>c.id===classId);if(!data.classes.length)throw Error('Không tìm thấy lớp học.');if(!host.isConnected)return;
    if(!data.students.length){host.innerHTML='<section class="tw-panel tw-empty"><h2>Chưa có học sinh để giao bài</h2><p>Thêm lớp hoặc nhờ quản trị liên kết học sinh trước khi tạo bộ câu hỏi.</p><a class="btn" href="#learning/classes">Mở lớp học của tôi →</a></section>';return;}
    const due=new Date(Date.now()+7*86400000+7*3600000).toISOString().slice(0,10);
    host.innerHTML=`<ol class="tw-steps" aria-label="Các bước tạo đề"><li aria-current="step"><b>1</b>Chọn lớp & câu hỏi</li><li><b>2</b>Xem lại bộ đề</li><li><b>3</b>Giao cho học sinh</li></ol><p id="tw-exam-status" class="tw-status" role="status"></p>
      <form id="tw-exam-form"><div class="tw-exam-grid"><div><section class="tw-panel"><h2>Thông tin bộ câu hỏi</h2><label class="field" for="tw-exam-title">Tên đề / nhiệm vụ *</label><input class="input" id="tw-exam-title" required maxlength="200" placeholder="Ví dụ: Ôn tập phân số — tuần 3"><div class="tw-exam-meta"><div><label class="field" for="tw-exam-recipient">Giao cho *</label><select id="tw-exam-recipient" required><option value="">Chọn lớp hoặc học sinh</option><optgroup label="Cả lớp">${data.classes.map(c=>`<option value="class:${c.id}">${esc(c.name)} · Khối ${c.grade}</option>`).join('')}</optgroup><optgroup label="Từng học sinh">${data.students.map(s=>`<option value="student:${s.id}">${esc(s.name)} · Khối ${s.grade}</option>`).join('')}</optgroup></select></div><div><label class="field" for="tw-exam-due">Hạn hoàn thành *</label><input class="input" id="tw-exam-due" type="date" value="${due}" required></div></div></section>
      <section class="tw-panel"><div class="tw-panel-head"><div><h2>Chọn câu hỏi vào đề</h2><p id="tw-bank-count">Chọn đối tượng để xem câu hỏi đúng khối.</p></div><a href="#teacher-library/create" class="btn secondary">+ Soạn câu mới</a></div><div class="tw-filters" style="max-width:none;margin-bottom:18px"><input class="input" type="search" id="tw-question-search" aria-label="Tìm câu hỏi" placeholder="Tìm theo đề bài, chủ đề…"><select id="tw-question-source" aria-label="Nguồn câu hỏi"><option value="all">Tất cả</option><option value="teacher">Tự soạn</option><option value="built-in">Có sẵn</option></select></div><div id="tw-question-bank"></div></section></div>
      <aside class="tw-panel tw-exam-summary"><span class="badge">BỘ CÂU HỎI ĐANG SOẠN</span><p><span class="tw-exam-total" id="tw-selected-count">0</span> / 30 câu</p><p class="hint" id="tw-exam-target">Chưa chọn đối tượng</p><ol class="tw-selected" id="tw-selected-list"></ol><p class="hint">Đáp án đầu được dùng để tính điểm. Học sinh vẫn có thể sửa lỗi và luyện tiếp.</p><button class="btn" type="submit">Xem lại bộ câu hỏi →</button></aside></div></form><section class="tw-panel tw-review-panel" id="tw-exam-review" hidden tabindex="-1"></section>`;
    host.insertAdjacentHTML('afterbegin','<section class="tw-panel"><h2>Chọn hình thức giao bài</h2><p><a class="btn" href="#teacher-library/bank">Chọn câu DATATM · Ghép trắc nghiệm và tự luận</a></p><p>Phần bên dưới giao bộ câu hỏi luyện tập. Với bài thi có đồng hồ hoặc bài làm trên giấy, chọn:</p><a class="btn" href="#exams/create">Soạn đề trắc nghiệm có thời gian</a> <a class="btn secondary" href="#essays">Giao và chấm tự luận</a></section>');
    const $=q=>host.querySelector(q),selected=new Set(),form=$('#tw-exam-form'),review=$('#tw-exam-review'),status=$('#tw-exam-status');
    const recipient=$('#tw-exam-recipient');let grade=null;
    function target(){const [kind,id]=recipient.value.split(':');return kind==='class'?data.classes.find(c=>c.id===id):data.students.find(s=>s.id===id);}
    function summary(){
      $('#tw-selected-count').textContent=selected.size;
      $('#tw-selected-list').innerHTML=[...selected].map((id,i)=>{const e=data.catalog.find(e=>e.id===id);return `<li><b>${i+1}.</b><span>${promptHTML(e)}</span><button type="button" data-remove-question="${esc(id)}" aria-label="Bỏ câu ${i+1}">×</button></li>`;}).join('')||'<li>Chưa chọn câu hỏi nào.</li>';
      host.querySelectorAll('[data-remove-question]').forEach(b=>b.onclick=()=>{selected.delete(b.dataset.removeQuestion);bank();summary();});
    }
    function bank(){
      const list=data.catalog.filter(e=>e.grades.includes(grade)),query=normalize($('#tw-question-search').value),source=$('#tw-question-source').value;
      const filtered=list.filter(e=>normalize(e.prompt+' '+(e.topic||'')+' '+e.rule).includes(query)&&(source==='all'||(source==='teacher')===e.skill.startsWith('teacher-')));
      $('#tw-bank-count').textContent=grade?`${filtered.length} câu phù hợp · Khối ${grade}`:'Chọn đối tượng để xem câu hỏi đúng khối.';
      $('#tw-question-bank').innerHTML=filtered.map(e=>`<label class="tw-question"><input type="checkbox" value="${esc(e.id)}" ${selected.has(e.id)?'checked':''}><span>${promptHTML(e)}<small>${e.skill.startsWith('teacher-')?'Bài tự soạn':'Ngân hàng có sẵn'} · Khối ${e.grades.join(', ')}</small></span></label>`).join('')||`<div class="tw-empty">${grade?'Không tìm thấy câu hỏi. Thử từ khóa khác hoặc soạn câu hỏi mới.':'Chọn lớp hoặc học sinh ở phần thông tin bên trên.'}</div>`;
      $('#tw-question-bank').querySelectorAll('input').forEach(box=>box.onchange=()=>{if(box.checked){if(selected.size>=30){box.checked=false;status.textContent='Mỗi bộ đề chọn tối đa 30 câu.';return;}selected.add(box.value);}else selected.delete(box.value);host.dataset.uploadDirty='true';status.textContent='';summary();});
    }
    recipient.onchange=()=>{const item=target();grade=item?.grade||null;const old=selected.size;for(const id of selected)if(!data.catalog.some(e=>e.id===id&&e.grades.includes(grade)))selected.delete(id);$('#tw-exam-target').textContent=item?`${item.name} · Khối ${grade}`:'Chưa chọn đối tượng';status.textContent=old>selected.size?'Đã bỏ các câu không phù hợp khối vừa chọn.':'';bank();summary();};
    $('#tw-question-search').oninput=bank;$('#tw-question-source').onchange=bank;
    form.addEventListener('input',()=>host.dataset.uploadDirty='true');
    form.addEventListener('submit',e=>{
      e.preventDefault();if(!form.reportValidity())return;if(!selected.size){status.textContent='Chọn ít nhất một câu hỏi để tạo đề.';$('#tw-question-bank').scrollIntoView({block:'center'});return;}
      const [kind,id]=recipient.value.split(':'),payload={title:$('#tw-exam-title').value.trim(),due:$('#tw-exam-due').value,exerciseIds:[...selected],...(kind==='class'?{classId:id}:{studentId:id})};
      if(!payload.title){status.textContent='Nhập tên bộ câu hỏi.';return;}
      review.innerHTML=`<span class="badge">BƯỚC 2 · KIỂM TRA TRƯỚC KHI GIAO</span><h2>${esc(payload.title)}</h2><p>${esc(target().name)} · Khối ${grade} · ${selected.size} câu · Hạn ${esc(payload.due.split('-').reverse().join('/'))}</p>${[...selected].map((id,i)=>{const question=data.catalog.find(e=>e.id===id);return `<article class="tw-panel"><h3>Câu ${i+1}. ${promptHTML(question)}</h3><details><summary>Xem đáp án và hướng dẫn</summary><p><strong>Đáp án:</strong> ${esc(question.answer)}</p>${richMath(question.rule)}</details></article>`;}).join('')}<div class="button-row"><button type="button" class="btn secondary" id="tw-edit-exam">Quay lại chỉnh sửa</button><button type="button" class="btn" id="tw-publish-exam">Xác nhận giao ${selected.size} câu hỏi</button></div>`;
      form.hidden=true;review.hidden=false;review.focus();review.scrollIntoView({block:'start'});status.textContent='';
      const steps=host.querySelectorAll('.tw-steps li');steps[0].removeAttribute('aria-current');steps[1].setAttribute('aria-current','step');
      $('#tw-edit-exam').onclick=()=>{form.hidden=false;review.hidden=true;steps[1].removeAttribute('aria-current');steps[0].setAttribute('aria-current','step');};
      $('#tw-publish-exam').onclick=async e=>{
        e.target.disabled=true;$('#tw-edit-exam').disabled=true;
        try{const result=await request('/api/learning/assign','POST',payload);if(!host.isConnected)return;delete host.dataset.uploadDirty;host.innerHTML=`<section class="tw-panel tw-empty"><span class="badge">ĐÃ GIAO THÀNH CÔNG</span><h2>${esc(payload.title)}</h2><p>${selected.size} câu hỏi đã được giao cho ${result.students} học sinh.<br>Học sinh có thể mở nhiệm vụ trên ứng dụng để làm bài.</p><div class="button-row"><a class="btn" href="#learning/class/${esc(classId)}">Xem bài đã giao</a><button class="btn secondary" id="tw-new-exam">Tạo bộ câu hỏi khác</button></div></section>`;$('#tw-new-exam').onclick=()=>mountTeacherExam(root,{request,classId});}
        catch(error){if(host.isConnected){status.textContent=error.message;e.target.disabled=false;$('#tw-edit-exam').disabled=false;}}
      };
    });
    recipient.value='class:'+classId;recipient.onchange();assessmentBreadcrumb(host,{kind:'exams',classId,className:data.classes[0].name,title:'Giao bài luyện tập'});
  }catch(error){if(host.isConnected){host.innerHTML=`<section class="tw-panel"><p role="alert">${esc(error.message)}</p><button class="btn" id="tw-exam-retry">Tải lại danh sách</button></section>`;host.querySelector('#tw-exam-retry').onclick=()=>mountTeacherExam(root,{request,classId});}}
}
