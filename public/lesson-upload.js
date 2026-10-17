import {richMath} from './math.js';
export function uploadedLessonsHTML(lessons,teacher=false){
 const html=uploadedListHTML(lessons,teacher);if(!teacher)return html;
 return html.replace('</h2>',`</h2><div class="document-toolbar"><label>Lọc theo khối <select id="document-grade"><option value="">Tất cả khối</option>${[6,7,8,9].map(g=>`<option value="${g}">Khối ${g} · ${lessons.filter(l=>l.grade===g).length} tài liệu</option>`).join('')}</select></label><span><b id="document-count">${lessons.length}</b> tài liệu</span><button type="button" class="btn secondary" data-show-upload>+ Tải thêm tài liệu</button></div>`);
}
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const size=n=>n<1048576?`${Math.ceil(n/1024)} KB`:`${(n/1048576).toFixed(1)} MB`;
export function uploadFormHTML(){return `<section class="tw-panel upload-card" id="upload-lesson"><ol class="tw-steps" aria-label="Các bước tải tài liệu"><li aria-current="step"><b>1</b>Chọn tài liệu</li><li><b>2</b>Xem lại thông tin</li><li><b>3</b>Đăng cho học sinh</li></ol><form id="lesson-upload-form"><div class="tw-upload-grid"><div><div class="tw-dropzone" id="upload-dropzone"><span class="tw-action-icon" style="margin:auto" aria-hidden="true">↑</span><strong>Kéo thả tài liệu vào đây</strong><p>Hoặc chọn file từ máy tính</p><label class="field" for="upload-file">Tài liệu PDF / Word</label><input class="input" id="upload-file" type="file" accept=".pdf,.docx" required aria-describedby="upload-file-hint"><p id="upload-file-hint">Một file PDF hoặc Word .docx · Tối đa 10 MB</p><div id="upload-file-summary" class="tw-file-summary" hidden></div></div><p class="hint">Tệp Word .doc cũ cần lưu thành .docx hoặc PDF trước khi tải lên.</p></div><div><label class="field" for="upload-title">Tên bài học / tài liệu *</label><input class="input" id="upload-title" required maxlength="120" placeholder="Ví dụ: Ôn tập căn bậc hai"><label class="field" for="upload-grade">Dành cho khối</label><select id="upload-grade">${[6,7,8,9].map(n=>`<option value="${n}">Khối ${n}</option>`).join('')}</select><label class="field" for="upload-description">Hướng dẫn cho học sinh</label><textarea id="upload-description" maxlength="8000" placeholder="Ví dụ: Đọc phần 1, làm bài 2 và 3 trong tài liệu…"></textarea><p class="hint">Không bắt buộc. Học sinh đúng khối được thầy/cô phụ trách sẽ thấy tài liệu trong mục Học tập.</p></div></div><p class="notice">File được giữ nguyên để tải về. Nếu muốn học sinh làm và được chấm đáp án trên app, hãy dùng <a href="#teacher-library/create">Soạn bài tập</a>.</p><button class="btn" type="submit">Xem lại trước khi đăng →</button></form><section id="upload-review" class="tw-review-panel" tabindex="-1" hidden aria-label="Xem lại bài học"></section><p id="upload-message" class="tw-status" role="status"></p></section>`;}
function uploadedListHTML(lessons,teacher=false){return `<section class="card uploaded-lessons"><h2>${teacher?'Bài bạn đã tải lên':'Tài liệu từ giáo viên'}</h2>${lessons.length?lessons.map(l=>`<article class="uploaded-lesson" data-document-grade="${l.grade}" data-uploaded-lesson="${l.id}"><span class="badge">Lớp ${l.grade} · ${l.format.toUpperCase()}</span><h3>${escape(l.title)}</h3>${l.description?`<div class="uploaded-description">${richMath(l.description)}</div>`:''}<p class="hint">${escape(l.teacherName)} · ${new Date(l.publishedAt).toLocaleDateString('vi-VN')} · ${escape(l.filename)} · ${size(l.size)}</p><a class="btn secondary" href="/api/lessons/${l.id}/file" download>Tải tài liệu ↓</a></article>`).join(''):`<p class="hint">${teacher?'Chưa có bài riêng. Dùng biểu mẫu phía trên để tải bài đầu tiên.':'Chưa có tài liệu riêng của giáo viên cho lớp này.'}</p>`}</section>`;}
export function bindLessonUpload(root,{request,onPublished}){
 root.querySelector('[data-show-upload]')?.addEventListener('click',()=>{const target=root.querySelector('#upload-lesson');target?.scrollIntoView({behavior:'smooth',block:'start'});target?.querySelector('input')?.focus({preventScroll:true});});
 const gradeFilter=root.querySelector('#document-grade');if(gradeFilter)gradeFilter.onchange=()=>{let count=0;root.querySelectorAll('[data-document-grade]').forEach(el=>{el.hidden=!!gradeFilter.value&&el.dataset.documentGrade!==gradeFilter.value;if(!el.hidden)count++;});root.querySelector('#document-count').textContent=String(count);};const form=root.querySelector('#lesson-upload-form');if(!form)return;
 const review=root.querySelector('#upload-review'),message=root.querySelector('#upload-message');let draft=null;
 const input=root.querySelector('#upload-file'),drop=root.querySelector('#upload-dropzone'),summary=root.querySelector('#upload-file-summary');
 const step=n=>root.querySelectorAll('#upload-lesson .tw-steps li').forEach((el,i)=>{if(i===n)el.setAttribute('aria-current','step');else el.removeAttribute('aria-current');});
 function selected(){const file=input.files[0];input.setCustomValidity('');message.textContent='';summary.hidden=!file;if(!file){summary.replaceChildren();return;}const valid=file.size>0&&file.size<=10*1024*1024&&/\.(pdf|docx)$/i.test(file.name);if(!valid){input.setCustomValidity('Chọn PDF hoặc Word .docx từ 1 byte đến 10 MB.');message.textContent=input.validationMessage;}summary.innerHTML=`<span><strong>${escape(file.name)}</strong><br>${size(file.size)}</span><button type="button" aria-label="Bỏ tài liệu đã chọn">Bỏ chọn</button>`;summary.querySelector('button').onclick=()=>{input.value='';selected();};const title=root.querySelector('#upload-title');if(valid&&!title.value.trim())title.value=file.name.replace(/\.(pdf|docx)$/i,'').replace(/[_-]+/g,' ').slice(0,120);}
 input.addEventListener('change',selected);
 for(const name of ['dragenter','dragover'])drop.addEventListener(name,e=>{e.preventDefault();drop.classList.add('is-dragging');});
 for(const name of ['dragleave','drop'])drop.addEventListener(name,e=>{e.preventDefault();drop.classList.remove('is-dragging');});
 drop.addEventListener('drop',e=>{if(e.dataTransfer.files.length!==1){message.textContent='Mỗi lần chọn một tài liệu để kiểm tra và đăng.';return;}input.files=e.dataTransfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));});
 form.addEventListener('input',()=>form.dataset.uploadDirty='true');
 form.addEventListener('change',()=>form.dataset.uploadDirty='true');
 form.addEventListener('submit',e=>{
  e.preventDefault();message.textContent='';if(!form.reportValidity())return;
  const file=root.querySelector('#upload-file').files[0],title=root.querySelector('#upload-title').value.trim();
  if(!title){message.textContent='Vui lòng nhập tên bài học.';return;}
  if(!file||!file.size||file.size>10*1024*1024||!(/\.(pdf|docx)$/i.test(file.name))){message.textContent='Chọn PDF hoặc Word .docx có dung lượng từ 1 byte đến 10 MB.';return;}
  draft={title,grade:Number(root.querySelector('#upload-grade').value),description:root.querySelector('#upload-description').value.trim(),filename:file.name,file};
  form.hidden=true;review.hidden=false;
  step(1);
  review.innerHTML=`<h3>Xem lại thông tin bài học</h3><span class="badge">Lớp ${draft.grade}</span><h2>${escape(draft.title)}</h2><p>${escape(file.name)} · ${size(file.size)}</p><div class="uploaded-description">${richMath(draft.description)}</div><p class="hint">Đăng cho học sinh lớp ${draft.grade} được bạn phụ trách. Nội dung file chưa được tự động đọc hoặc chấm điểm.</p><div class="button-row"><button type="button" class="btn" id="publish-upload">Đăng bài cho học sinh</button><button type="button" class="btn secondary" id="edit-upload">Quay lại chỉnh sửa</button></div>`;
  review.focus();review.scrollIntoView({block:'start',behavior:'smooth'});
  review.querySelector('#edit-upload').onclick=()=>{review.hidden=true;form.hidden=false;step(0);root.querySelector('#upload-title').focus();};
  review.querySelector('#publish-upload').onclick=async()=>{
   const button=review.querySelector('#publish-upload'),edit=review.querySelector('#edit-upload');button.disabled=true;edit.disabled=true;button.textContent='Đang tải và đăng bài…';message.textContent='';
   step(2);
   try{
    const base64=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=()=>reject(Error('Không đọc được file. Vui lòng chọn lại.'));reader.readAsDataURL(draft.file);});
    const {file:ignored,...metadata}=draft,result=await request('/api/teacher/lessons/upload','POST',{...metadata,base64},60000);
    form.reset();delete form.dataset.uploadDirty;await onPublished(result);
   }catch(error){if(message.isConnected)message.textContent=error.message;button.disabled=false;edit.disabled=false;button.textContent='Đăng bài cho học sinh';}
  };
 });
}
