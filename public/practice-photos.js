import {mountAttachments} from './tutor-attachments.js';
import {richMath} from './math.js';
import {formatMathText} from './math-format.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const practicePhotosHTML=()=>`<section class="practice-photo-panel"><h2>Nộp ảnh bài làm</h2><p>Viết đầy đủ lời giải trên giấy rồi tải từ 1 đến 3 ảnh rõ nét từ thiết bị. Không cần gõ công thức. Điểm AI là tạm thời; giáo viên xem bài và chốt điểm chính thức.</p><form data-practice-photo-form><button class="btn" type="submit">Chấm bài</button><p role="status"></p></form><div data-practice-photo-history></div></section>`;
export function mountPracticePhotos(root,{request,exerciseId}){
 const form=root.querySelector('[data-practice-photo-form]');if(!form)return;
 const status=form.querySelector('[role=status]'),button=form.querySelector('[type=submit]');
 let revision=0,requestId=null,savedId=null,busy=false;
 const changed=()=>{revision++;requestId=null;savedId=null;form.dataset.uploadDirty='true';};
 const photos=mountAttachments(form,{changed,status,requireTextWithoutPhotos:false});
 const history=root.querySelector('[data-practice-photo-history]');
 mountPracticePhotoHistory(history,{request,exerciseId});
 form.onsubmit=async event=>{
  event.preventDefault();if(busy||photos.loading)return;if(!photos.images.length){status.textContent='Hãy chọn ít nhất một ảnh bài làm.';return;}
  busy=true;photos.setBusy(true);button.disabled=true;const ticket=revision;
  try{
   if(!savedId){status.textContent='Đang lưu bài và ảnh…';requestId||=crypto.randomUUID();const saved=await request('/api/practice/photos/submit','POST',{exerciseId,requestId,working:'',photos:photos.images},60000);savedId=saved.id;delete form.dataset.uploadDirty;}
   status.textContent='Bài và ảnh đã lưu. Đang chấm bài…';
   const result=await request('/api/practice/photos/'+savedId+'/grade','POST',{},90000);
   if(!form.isConnected)return;
   await mountPracticePhotoHistory(history,{request,exerciseId,first:result});
   if(ticket===revision){photos.clear();requestId=null;savedId=null;delete form.dataset.uploadDirty;status.textContent='Đã chấm bài. Xem nhận xét bên dưới; điểm AI tạm thời, đang chờ giáo viên chốt.';}
  }catch(error){if(form.isConnected){status.textContent=savedId?'Bài và ảnh đã lưu. Chưa chấm được: '+error.message+' Bấm Chấm bài để thử lại.':error.message;if(savedId)await mountPracticePhotoHistory(history,{request,exerciseId});}}
  finally{busy=false;if(form.isConnected){photos.setBusy(false);button.disabled=false;}}
 };
}
export async function mountPracticePhotoHistory(host,{request,exerciseId,studentId,teacher=false,readOnly=false,first}={}){
 if(!host)return;const query=new URLSearchParams();if(exerciseId)query.set('exerciseId',exerciseId);if(studentId)query.set('studentId',studentId);
 try{
  const {submissions}=await request('/api/practice/photos?'+query);if(!host.isConnected)return;
  const items=first?[first,...submissions.filter(s=>s.id!==first.id)]:submissions;
  if(!teacher)host.hidden=!items.length;else host.classList.toggle('card',!!items.length);host.innerHTML=items.length?`<h3>Bài luyện tập đã nộp</h3><p>Điểm tự động là tạm thời. Giáo viên xem bài, nhận xét và chốt điểm chính thức.</p>${items.map(s=>`<details class="practice-photo-result" ${first?.id===s.id?'open':''}><summary>${new Date(s.time).toLocaleString('vi-VN')} · ${s.review?'Điểm chính thức: '+s.review.score+'/10':s.type==='mcq'?'Trắc nghiệm · '+(s.correct?'Đúng':'Chưa đúng'):s.ai?.readable?'Điểm tạm thời (AI): '+s.ai.score+'/10':s.ai?'Ảnh chưa đủ rõ để chấm':'Đã lưu · Chưa có điểm'}</summary><p><strong>${s.type==='mcq'?'Điểm đối chiếu đáp án (tạm thời)':'Điểm tạm thời (AI)'}: ${s.type==='mcq'?s.choiceScore+'/10':s.ai?.readable?s.ai.score+'/10':'Chưa có điểm'}</strong></p><p><strong>Điểm chính thức: ${s.review?s.review.score+'/10':'Chờ giáo viên chốt'}</strong></p>${exerciseId?'':`<div>${richMath(s.prompt)}</div>`}<div class="tutor-sent-photos">${s.photos.map((src,i)=>`<img src="${esc(src)}" alt="Ảnh bài làm ${i+1}" loading="lazy">`).join('')}</div>${s.working?`<div>${richMath(formatMathText(s.working))}</div>`:''}${s.type==='mcq'?`<p>Đã chọn ${'ABCD'[s.choiceIndex]}: ${richMath(s.choices[s.choiceIndex])}</p><p>Đáp án đúng ${'ABCD'[s.correctIndex]}: ${richMath(s.choices[s.correctIndex])}</p><div>${richMath(s.feedback)}</div>`:s.ai?`<div>${richMath(s.ai.summary)}</div><details><summary>Nội dung đọc từ bài làm</summary>${richMath(s.ai.transcription)}</details>${s.ai.criteria.map(c=>`<div class="notice"><div>${richMath(c.reason)}</div><p>Cần ôn: ${richMath(c.missingKnowledge)}</p><p>Sửa tiếp: ${richMath(c.nextStep)}</p></div>`).join('')}`:`<p>${esc(s.error||'Bài đã lưu và có thể chấm lại.')}</p><button type="button" class="btn secondary" data-practice-grade="${esc(s.id)}" ${readOnly?'hidden disabled':''}>Chấm bài</button>`}${s.review?`<p>Giáo viên: ${richMath(formatMathText(s.review.comment))}</p>`:''}${teacher?`<form data-practice-review="${esc(s.id)}"><label class="field">Điểm chính thức /10<input class="input" name="score" type="number" min="0" max="10" step="0.01" required value="${s.review?.score??s.choiceScore??s.ai?.score??''}"></label><label class="field">Nhận xét<textarea name="comment" maxlength="4000" required>${esc(s.review?.comment||'')}</textarea></label><button class="btn">Chốt điểm</button></form>`:''}<p role="status"></p></details>`).join('')}`:'';
  host.querySelectorAll('[data-practice-grade]').forEach(button=>button.onclick=async()=>{button.disabled=true;const status=button.closest('details').querySelector(':scope > [role=status]');status.textContent='Đang chấm bài…';try{const result=await request('/api/practice/photos/'+button.dataset.practiceGrade+'/grade','POST',{},90000);await mountPracticePhotoHistory(host,{request,exerciseId,studentId,teacher,readOnly,first:result});}catch(error){status.textContent=error.message;button.disabled=false;}});
  host.querySelectorAll('[data-practice-review]').forEach(form=>{form.addEventListener('input',()=>form.dataset.uploadDirty='true');form.onsubmit=async event=>{event.preventDefault();const button=form.querySelector('button'),status=form.closest('details').querySelector(':scope > [role=status]');button.disabled=true;try{const result=await request('/api/practice/photos/'+form.dataset.practiceReview+'/review','POST',{score:Number(form.elements.score.value),comment:form.elements.comment.value});delete form.dataset.uploadDirty;await mountPracticePhotoHistory(host,{request,exerciseId,studentId,teacher,readOnly,first:result});}catch(error){status.textContent=error.message;button.disabled=false;}};});
 }catch(error){if(host.isConnected){host.textContent='Chưa tải được lịch sử bài ảnh: '+error.message;if(first){const p=document.createElement('p');p.textContent='Bài đã chấm và lưu. Mở lại mục này để xem kết quả.';host.append(p);}}}
}
