import {mountClassAssessments,assessmentBreadcrumb,enhanceAssessmentDetail} from './class-assessments.js';
import {mountExamBuilder,mountAssessmentManagement} from './exam-builder.js';
import {richMath} from './math.js';
import {mountKnowledge} from './knowledge-view.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const letter=i=>Number.isInteger(i)?'ABCD'[i]:'Chưa chọn';
export function mountTimedExams(root,{request,role,id,classId}){
  root.innerHTML='<div id="timed-exams"><section class="card">Đang tải đề thi…</section></div>';
  const detailState={};const host=root.querySelector('#timed-exams');let stopped=false,busy=false,data=null,timer=null,poll=null,baseTime=0,baseClock=0,finishing=false;
  const alive=()=>!stopped&&host.isConnected;
  const url=()=>'/api/exams/'+encodeURIComponent(id);
  const setData=value=>{data=value;baseTime=value.serverNow;baseClock=performance.now();};
  const remaining=()=>Math.max(0,Math.ceil((data.attempt.deadline-baseTime-(performance.now()-baseClock))/1000));
  const status=message=>{if(alive()&&host.querySelector('#exam-status'))host.querySelector('#exam-status').textContent=message;};
  function resultHTML(d){const a=d.attempt;return `<section class="card"><h2>Đã nộp bài · ${a.score}/10</h2><p>Đúng ${a.correct}/${d.questionCount} câu · ${a.reason==='timeout'?'Tự nộp khi hết '+d.durationMinutes+' phút':'Học sinh nộp bài'}.</p><p>Bài đã chốt; không thể thay đổi đáp án hoặc làm lại.</p></section>${d.questions.map((q,i)=>`<section class="card"><h3>Câu ${i+1}. ${richMath(q.prompt)}</h3><p>Em chọn: ${letter(a.answers[i])} · Đáp án đúng: ${letter(q.correctIndex)}</p><ul>${q.choices.map((c,j)=>`<li>${letter(j)}. ${richMath(c)}</li>`).join('')}</ul><p><strong>Hướng dẫn:</strong> ${richMath(q.explanation)}</p></section>`).join('')}`;}
  function render(){
    if(!alive())return;
    host.innerHTML=`<a href="#exams">← Danh sách đề thi</a><h1>${esc(data.title)}</h1><p>Lớp ${esc(data.className)} · ${data.questionCount} câu · ${data.durationMinutes} phút</p><p id="exam-status" role="status"></p>`;
    if(data.attempt?.submittedAt){host.insertAdjacentHTML('beforeend',resultHTML(data));void mountKnowledge(host,{request,role,examId:id,compact:true});return;}
    if(!data.attempt){
      if(data.withdrawn){host.insertAdjacentHTML('beforeend','<section class="card">Giáo viên đã ngừng giao đề này.</section>');return;}
      host.insertAdjacentHTML('beforeend','<section class="card"><h2>Sẵn sàng làm bài</h2><p>Mỗi đề được làm một lần. Thời gian bắt đầu khi em bấm nút bên dưới; tải lại hoặc đóng trang không dừng đồng hồ. Mỗi lựa chọn cần được máy chủ xác nhận. Hết giờ, hệ thống chốt các đáp án đã lưu.</p><button class="btn" id="exam-start">Bắt đầu làm bài</button></section>');
      host.querySelector('#exam-start').onclick=async e=>{e.target.disabled=true;try{const d=await request(url()+'/start','POST',{});if(!alive())return;setData(d);render();tick();}catch(error){status(error.message);if(alive())e.target.disabled=false;}};
      return;
    }
    host.insertAdjacentHTML('beforeend',`<div class="exam-clock card"><strong>Thời gian còn lại: <span id="exam-time" role="timer"></span></strong><span id="exam-saved"></span></div><form id="timed-exam-form">${data.questions.map((q,i)=>`<fieldset class="card exam-question"><legend>Câu ${i+1}</legend><p>${richMath(q.prompt)}</p>${q.choices.map((c,j)=>`<label class="exam-choice"><input type="radio" name="question-${i}" value="${j}" data-question="${i}" ${data.attempt.answers[i]===j?'checked':''}><span>${letter(j)}. ${richMath(c)}</span></label>`).join('')}</fieldset>`).join('')}<button type="submit" class="btn" id="exam-submit">Nộp bài</button><p id="exam-confirm" hidden>Xác nhận nộp và chốt điểm? Câu bỏ trống tính 0 điểm. <button type="button" class="btn" id="exam-confirm-submit">Xác nhận nộp bài</button> <button type="button" class="btn secondary" id="exam-cancel-submit">Tiếp tục làm</button></p></form>`);
    host.querySelectorAll('input[type=radio]').forEach(input=>input.onchange=async()=>{
      if(busy||finishing)return;busy=true;controls(true);status('Đang lưu lựa chọn…');
      try{const d=await request(url()+'/answer','PUT',{questionIndex:Number(input.dataset.question),choiceIndex:Number(input.value),version:data.attempt.version});if(!alive())return;setData(d);if(d.attempt.submittedAt)render();else status('Đã lưu lựa chọn vào máy chủ.');}
      catch(error){if(!alive())return;status('Chưa lưu lựa chọn: '+error.message);try{setData(await request(url()));if(alive()){render();status('Đã tải lại đáp án đã lưu. Hãy chọn lại câu vừa trả lời.');}}catch{host.querySelectorAll('input[type=radio]').forEach(el=>el.checked=data.attempt.answers[Number(el.dataset.question)]===Number(el.value));}}
      finally{busy=false;if(alive()){controls(false);tick();}}
    });
    host.querySelector('#timed-exam-form').onsubmit=e=>{e.preventDefault();host.querySelector('#exam-confirm').hidden=false;};
    host.querySelector('#exam-cancel-submit').onclick=()=>host.querySelector('#exam-confirm').hidden=true;
    host.querySelector('#exam-confirm-submit').onclick=()=>finish();tick();
  }
  function controls(disabled){host.querySelectorAll('#timed-exam-form input,#timed-exam-form button').forEach(el=>el.disabled=disabled);}
  async function finish(){
    if(!alive()||busy||finishing||!data?.attempt||data.attempt.submittedAt)return;
    finishing=true;controls(true);status('Đang chốt bài làm…');
    try{const d=await request(url()+'/submit','POST',{});if(alive()){setData(d);render();}}
    catch(error){status('Chưa nhận được kết quả: '+error.message+' Hệ thống sẽ thử lại khi hết giờ hoặc có mạng.');}
    finally{finishing=false;if(alive()&&data?.attempt&&!data.attempt.submittedAt&&remaining()>0)controls(false);}
  }
  let retryAt=0;
  function tick(){
    if(!alive()){dispose();return;}if(!data?.attempt||data.attempt.submittedAt)return;
    const seconds=remaining(),clock=host.querySelector('#exam-time'),saved=host.querySelector('#exam-saved');
    if(clock)clock.textContent=`${Math.floor(seconds/60).toString().padStart(2,'0')}:${(seconds%60).toString().padStart(2,'0')}`;
    if(saved)saved.textContent=`Đã lưu ${data.attempt.answers.filter(v=>v!==null).length}/${data.questionCount} câu`;
    if(seconds===0){controls(true);if(performance.now()>=retryAt){retryAt=performance.now()+5000;void finish();}}
  }
  async function refresh(){if(!alive()||busy||finishing||!data?.attempt||data.attempt.submittedAt||role!=='student')return;try{const d=await request(url());if(!alive()||busy||finishing)return;const changed=d.attempt.version!==data.attempt.version;setData(d);if(changed)render();tick();}catch{status('Mất kết nối. Đồng hồ vẫn chạy; đáp án đã được máy chủ xác nhận vẫn được giữ.');}}
  function unload(e){if(busy){e.preventDefault();e.returnValue='';}}
  function dispose(){if(stopped)return;stopped=true;clearInterval(timer);clearInterval(poll);window.removeEventListener('online',refresh);window.removeEventListener('focus',refresh);window.removeEventListener('beforeunload',unload);}
  async function load(){
    try{
      if(role==='teacher'&&(!id||id==='class'||id==='create'&&!classId)){await mountClassAssessments(host,{request,kind:'exams',classId:id==='class'?classId:undefined,createIntent:id==='create'});return;}
      if(id==='create'&&role==='teacher'){await mountExamBuilder(host,request,{classId});return;}
      if(!id){const response=await request('/api/exams');if(!alive())return;host.innerHTML=`<h1>${role==='teacher'?'Đề thi & kết quả lớp':'Thi trắc nghiệm'}</h1>${role==='teacher'?'<a class="btn" href="#exams/create">Tạo đề trắc nghiệm</a>':''}<p>Mỗi đề có thời gian riêng; điểm thi được theo dõi tại đây.</p>${response.exams.map(e=>`<section class="card"><h2>${esc(e.title)}</h2><p>Lớp ${esc(e.className)} · ${e.questionCount} câu · ${e.durationMinutes} phút</p><a class="btn" href="#exams/${esc(e.id)}">${role==='teacher'?'Xem đề và kết quả':e.attempt?.submittedAt?`Xem kết quả · ${e.attempt.score}/10`:e.attempt?'Tiếp tục làm bài':'Mở đề thi'}</a></section>`).join('')||'<section class="card">Chưa có đề thi được giao.</section>'}`;return;}
      if(role==='teacher'){
        const r=await request(url()+'/results');if(!alive())return;
        host.innerHTML=`<a href="#exams">← Danh sách đề thi</a><h1>${esc(r.exam.title)}</h1><p>Lớp ${esc(r.exam.className)} · ${r.exam.questionCount} câu · ${r.exam.durationMinutes} phút</p><button class="btn secondary" id="exam-refresh-results">Cập nhật kết quả</button><section class="card table-wrap"><table><thead><tr><th>Học sinh</th><th>Trạng thái</th><th>Đúng</th><th>Điểm /10</th></tr></thead><tbody>${r.students.map(s=>`<tr><td><a href="#learning/${esc(s.studentId)}/${esc(r.exam.classId)}">${esc(s.name)}</a></td><td>${s.attempt?.submittedAt?(s.attempt.reason==='timeout'?'Hết giờ, đã tự nộp':'Đã nộp'):s.attempt?'Đang làm':'Chưa bắt đầu'}</td><td>${s.attempt?.submittedAt?s.attempt.correct+'/'+r.exam.questionCount:'—'}</td><td>${s.attempt?.submittedAt?s.attempt.score:'—'}</td></tr>`).join('')}</tbody></table></section><details class="card"><summary>Xem câu hỏi, đáp án và nguồn</summary>${r.exam.questions.map((q,i)=>`<h3>Câu ${i+1}. ${richMath(q.prompt)}</h3><p>${q.choices.map((c,j)=>`${letter(j)}. ${richMath(c)}`).join('<br>')}</p><p><strong>Đáp án ${letter(q.correctIndex)}.</strong> ${richMath(q.explanation)}</p><p class="hint">${esc(q.source)}</p>`).join('')}</details>`;
        if(r.testAttempts?.length)host.insertAdjacentHTML('beforeend',`<details class="card"><summary>Lịch sử kiểm tra hệ thống: ${r.testAttempts.length} lượt — không tính vào kết quả học sinh</summary><p>Những lượt dưới đây do hệ thống chạy thử, không phản ánh năng lực học sinh.</p>${r.testAttempts.map(a=>`<p>${esc(a.name)} · ${esc(a.score)}/10 · ${esc(new Date(a.submittedAt).toLocaleString('vi-VN'))}</p>`).join('')}</details>`);
        host.classList.add('assessment-detail');host.querySelector('a[href="#exams"]')?.remove();assessmentBreadcrumb(host,{kind:'exams',classId:r.exam.classId,className:r.exam.className,title:r.exam.title});mountAssessmentManagement(host,{request,kind:'exams',data:r.exam,reload:load});enhanceAssessmentDetail(host,{kind:'exams',data:r.exam,students:r.students,state:detailState});host.querySelector('#exam-refresh-results').onclick=load;return;
      }
      const d=await request(url());if(!alive())return;setData(d);render();
      timer=setInterval(tick,250);poll=setInterval(refresh,15000);window.addEventListener('online',refresh);window.addEventListener('focus',refresh);window.addEventListener('beforeunload',unload);
    }catch(error){if(alive()){host.innerHTML=`<section class="card" role="alert">${esc(error.message)} <a href="#exams">Về danh sách đề thi</a></section>`;}}
  }
  void load();return dispose;
}
