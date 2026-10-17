import {richMath} from './math.js';
export const notebookHeader=()=>'<h1>Sổ tay lỗi sai</h1><p>Sửa bài gốc, luyện bài cùng kiến thức và theo dõi kết quả qua từng lần làm.</p><div id="notebook-knowledge"></div>';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const source=q=>`<small class="muted">Nguồn: ${esc(q.source.file)} · ${esc(q.source.section||'')} · Câu ${q.source.question}</small>`;
export function mountDatatmBlock(root,{data,key,studentId,role,request}){
 let ai=null,extra=[],busy=false;
 function render(){
  if(!root.isConnected)return;
  const questions=[...new Map([...extra,...data.questions].map(q=>[q.id,q])).values()];
  root.innerHTML=`<section class="datatm-practice"><h3>Bài củng cố từ DATATM</h3>${!data.unlocked?'<p>Sửa đúng bài gốc để mở bài cùng kiến thức.</p>':`<p>Đã làm đúng ngay lần đầu <strong>${data.progress.independentCorrect}</strong> câu mới · Đã sửa đúng sau khi xem lời giải <strong>${data.progress.corrected}</strong> câu.</p>${questions.length?`<button class="btn secondary" data-datatm-ai>AI chọn bài theo lỗi này</button><p data-datatm-status role="status"></p>${ai?`<div class="feedback">${richMath(ai.summary)}${ai.actions.map(a=>`<p>${richMath(a)}</p>`).join('')}</div>`:''}${questions.map((q,index)=>`<details ${index===0?'open':''} class="card datatm-question" data-question="${esc(q.id)}"><summary>${esc(q.topic)}${ai?.exerciseIds.includes(q.id)?' · AI đề xuất':''}</summary><div>${richMath(q.prompt)}</div><p>${esc(q.reason||'Cùng kiến thức cần củng cố.')}</p>${source(q)}${role==='student'?`<form data-datatm-answer="${esc(q.id)}"><label class="field">Đáp án${q.unit?' ('+esc(q.unit)+')':''}<input name="answer" required maxlength="150" autocomplete="off" placeholder="Số, số thập phân hoặc phân số a/b"></label><label class="field">Trình bày cách làm<textarea name="working" required minlength="5" maxlength="5000"></textarea></label><button class="btn">Nộp bài củng cố</button><p role="status"></p></form>`:''}</details>`).join('')}`:`<p>${data.matched?'Em đã làm đúng các câu phù hợp trong kho hiện tại.':'Kho hiện tại chưa có câu đã kiểm tra phù hợp với kiến thức này.'}</p>`}`}${data.history.length?`<details class="datatm-history"><summary>Lịch sử bài củng cố (${data.history.length} lượt)</summary>${data.history.slice().reverse().map(a=>`<article class="card"><strong>${a.correct?(a.independentCorrect?'Đúng ngay lần đầu':'Đã sửa đúng sau lời giải'):'Cần sửa tiếp'}</strong><p>${new Date(a.time).toLocaleString('vi-VN')}</p>${richMath(a.question.prompt)}<p>Đã trả lời: ${esc(a.answer)}</p><div>${richMath(a.working)}</div><details><summary>Đáp án và cách giải</summary><p>${esc(a.answerKey)} ${esc(a.question.unit)}</p>${richMath(a.solution)}</details>${source(a.question)}</article>`).join('')}</details>`:''}</section>`;
  root.querySelectorAll('[data-datatm-answer]').forEach(form=>{form.onsubmit=async e=>{
   e.preventDefault();if(busy)return;busy=true;const button=form.querySelector('button');button.disabled=true;
   form.dataset.requestId||=crypto.randomUUID();
   try{await request('/api/datatm/submit','POST',{key,questionId:form.dataset.datatmAnswer,answer:form.elements.answer.value,working:form.elements.working.value,requestId:form.dataset.requestId});const result=await request('/api/datatm'+(studentId?'?studentId='+encodeURIComponent(studentId):''));const group=result.groups.find(g=>g.key===key);if(group){data=group;extra=[];ai=null;render();const h=root.querySelector('.datatm-history');if(h)h.open=true;}}
   catch(error){form.querySelector('[role=status]').textContent=error.message;button.disabled=false;}finally{busy=false;}
  };form.addEventListener('input',()=>delete form.dataset.requestId);});
  const button=root.querySelector('[data-datatm-ai]');if(button){if(role!=='student')button.remove();else button.onclick=async()=>{
   button.disabled=true;const status=root.querySelector('[data-datatm-status]');status.textContent='AI đang đối chiếu lỗi với các câu có trong kho…';
   try{ai=await request('/api/datatm/ai','POST',{key},45000);extra=ai.candidates;render();}catch(error){status.textContent=error.message;button.disabled=false;}
  };}
 }
 render();
}
