const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const states={pending:'Đang chờ',sending:'Đang gửi',sent:'Gmail đã nhận thư',failed:'Gửi thất bại',unknown:'Chưa rõ kết quả',skipped:'Không gửi: liên kết thay đổi'};
const pdfLink=(id,r,label)=>`<a class="btn secondary" href="/api/parent-mail/pdf?id=${encodeURIComponent(id)}&recipientId=${encodeURIComponent(r.id)}" target="_blank" rel="noopener">${label}</a>`;
export const parentMailHTML=()=>'<div id="parent-mail"><h1>Thông báo phụ huynh</h1><p>Đang tải thông tin…</p></div>';
export async function mountParentMail(root,{request}){
  const host=root.querySelector('#parent-mail');if(!host)return;
  try{
    const data=await request('/api/parent-mail/options');if(!host.isConnected)return;
    host.innerHTML=`<div class="intro"><div><h1>Thông báo phụ huynh</h1><p>Gửi bảng điểm PDF và hồ sơ học tập riêng cho từng gia đình.</p></div></div>
      <section class="card"><p class="notice">${data.configured?`Gmail hệ thống: ${esc(data.sender)}`:'Chưa cấu hình Gmail. Giáo viên vẫn có thể xem, xác nhận và tải PDF; quản trị cần cấu hình Gmail để gửi thư.'}</p>
      <form id="parent-mail-form">
        <label class="field">Gửi đến<select name="target" required><option value="">Chọn lớp hoặc học sinh</option><optgroup label="Theo lớp">${data.classes.map(c=>`<option value="class:${esc(c.id)}">${esc(c.name)}</option>`).join('')}</optgroup><optgroup label="Theo học sinh">${data.students.map(s=>`<option value="student:${esc(s.id)}">${esc(s.name)}</option>`).join('')}</optgroup></select></label>
        <label class="field">Tiêu đề<input class="input" name="subject" required maxlength="160" placeholder="Bảng điểm và quá trình học Toán"></label>
        <label class="field">Lời nhắn trong email<textarea name="message" required maxlength="4000" rows="4" placeholder="Kính gửi phụ huynh…"></textarea></label>
        <label class="field"><input type="checkbox" name="includeReport"> Đính kèm bảng điểm và hồ sơ học tập PDF</label>
        <div id="report-settings" hidden><p>PDF gồm điểm nhiệm vụ, lịch sử bài làm, thời gian hoạt động đã ghi nhận, lỗi sai và dẫn chứng, kiến thức cần củng cố, so sánh trước–sau, nhận xét và xác nhận của giáo viên. Dữ liệu chưa được ghi nhận sẽ ghi rõ là chưa có.</p>
        <label class="field">Nhận xét giáo viên trong PDF<textarea name="teacherComment" minlength="10" maxlength="4000" rows="4" placeholder="Nhận xét và hướng phối hợp với gia đình…"></textarea></label></div>
        <p>Mỗi email và PDF chỉ chứa các con được liên kết với đúng phụ huynh nhận thư.</p>
        <button class="btn">Xem trước nội dung và người nhận</button>
      </form><p id="parent-mail-status" role="status"></p><div id="parent-mail-preview"></div></section>
      <section class="card"><h2>PDF đã xác nhận</h2><p>Tải lại 30 báo cáo gần nhất, kể cả bản đã xác nhận nhưng chưa gửi email.</p><div id="parent-report-history"></div></section>
      <section class="card"><div class="button-row"><h2>Lịch sử gửi</h2><button class="btn secondary" id="parent-mail-refresh">Cập nhật trạng thái</button></div><p>“Gmail đã nhận thư” chỉ xác nhận máy chủ Gmail chấp nhận gửi. Hiển thị 30 đợt gần nhất; PDF đã xác nhận giữ nguyên nội dung tại lúc chốt.</p><div id="parent-mail-history"></div></section>`;
    const $=q=>host.querySelector(q),form=$('#parent-mail-form'),status=$('#parent-mail-status'),preview=$('#parent-mail-preview');
    let revision=0,busy=false,historySnapshot='',reportSnapshot='';
    function history(items){
      const snapshot=JSON.stringify(items);if(snapshot===historySnapshot)return;historySnapshot=snapshot;
      $('#parent-mail-history').innerHTML=items.length?items.map(b=>`<details><summary>${esc(b.subject)} · ${new Date(b.created).toLocaleString('vi-VN')} · ${b.recipients.filter(r=>r.status==='sent').length}/${b.recipients.length} thư được Gmail chấp nhận</summary>${b.approval?`<p>Giáo viên ${esc(b.approval.name)} xác nhận lúc ${new Date(b.approval.time).toLocaleString('vi-VN')}.</p>`:''}${b.recipients.map(r=>`<details><summary>${esc(r.email)} — ${states[r.status]||esc(r.status)}</summary><p>${esc(r.students.map(s=>s.name).join(', '))}</p>${r.error?`<p>${esc(r.error)}</p>`:''}<pre class="mail-body">${esc(r.text)}</pre>${b.reportId?pdfLink(b.reportId,r,'Tải PDF đã gửi / đã xác nhận'):''}</details>`).join('')}</details>`).join(''):'Chưa có thông báo nào được gửi.';
    }
    function reportHistory(items){const snapshot=JSON.stringify(items);if(snapshot===reportSnapshot)return;reportSnapshot=snapshot;$('#parent-report-history').innerHTML=items.length?items.map(d=>`<details><summary>${esc(d.subject)} · ${esc(d.approval.name)} · ${new Date(d.approval.time).toLocaleString('vi-VN')}</summary>${d.recipients.map(r=>`<p>${esc(r.students.map(s=>s.name).join(', '))} · ${esc(r.email)}</p>${pdfLink(d.id,r,'Tải PDF đã xác nhận')}`).join('')}</details>`).join(''):'Chưa có PDF được xác nhận.';}
    async function refresh(){try{const [items,reports]=await Promise.all([request('/api/parent-mail/history'),request('/api/parent-mail/reports')]);if(host.isConnected){history(items);reportHistory(reports);}}catch(error){if(host.isConnected)status.textContent=error.message;}}
    $('#parent-mail-refresh').onclick=refresh;history(data.history);reportHistory(data.reports||[]);
    const include=form.elements.includeReport;
    include.addEventListener('change',()=>{$('#report-settings').hidden=!include.checked;form.elements.teacherComment.required=include.checked;});
    form.addEventListener('input',()=>{revision++;host.dataset.uploadDirty='true';preview.replaceChildren();});
    const disableForm=value=>form.querySelectorAll('input,textarea,select,button').forEach(el=>el.disabled=value);
    function showDraft(draft){
      preview.innerHTML=`<h2>Xem lại trước khi gửi</h2><p><strong>Tiêu đề:</strong> ${esc(draft.subject)}</p>${draft.missing.length?`<p class="notice">Chưa có email phụ huynh hợp lệ: ${esc(draft.missing.join(', '))}.</p>`:''}
        ${draft.recipients.map(r=>`<details><summary>${esc(r.email)} · ${esc(r.students.map(s=>s.name).join(', '))}</summary><pre class="mail-body">${esc(r.text)}</pre>${draft.includeReport?pdfLink(draft.id,r,draft.approval?'Tải PDF đã xác nhận':'Tải PDF nháp để kiểm tra'):''}</details>`).join('')}
        ${draft.includeReport&&!draft.approval?'<p>Hãy tải và kiểm tra PDF của từng gia đình trước khi xác nhận. Xác nhận này không tự duyệt các nhận định AI đang chờ xem xét.</p><label class="field"><input type="checkbox" id="parent-report-ack"> Tôi đã xem các PDF và xác nhận nhận xét, số liệu trong báo cáo.</label><button class="btn secondary" id="parent-report-approve" disabled>Xác nhận báo cáo bằng tài khoản giáo viên</button>':''}
        ${draft.approval?`<p class="notice">Đã xác nhận bởi ${esc(draft.approval.name)} lúc ${new Date(draft.approval.time).toLocaleString('vi-VN')}. Có thể tải bản đã xác nhận ở trên. Xác nhận được ghi bằng tài khoản trên ứng dụng, không phải chữ ký số.</p>`:''}
        <p>Bước gửi email là riêng biệt. Nhấn nút dưới để gửi đến các địa chỉ đã kiểm tra.</p>
        <button class="btn" id="parent-mail-confirm" ${data.configured&&(!draft.includeReport||draft.approval)?'':'disabled'}>Xác nhận gửi ${draft.recipients.length} email${draft.includeReport?' kèm PDF':''}</button>`;
      if($('#parent-report-ack'))$('#parent-report-ack').onchange=()=>{$('#parent-report-approve').disabled=!$('#parent-report-ack').checked;};
      if($('#parent-report-approve'))$('#parent-report-approve').onclick=async()=>{
        if(busy)return;busy=true;disableForm(true);$('#parent-report-approve').disabled=true;
        try{const result=await request('/api/parent-mail/approve','POST',{id:draft.id,confirmed:$('#parent-report-ack').checked},120000);if(!host.isConnected)return;showDraft(result);status.textContent='Đã lưu xác nhận. PDF này sẽ được đính kèm nguyên vẹn khi gửi.';await refresh();}
        catch(error){if(host.isConnected){status.textContent=error.message;$('#parent-report-approve').disabled=false;}}
        finally{busy=false;if(host.isConnected)disableForm(false);}
      };
      $('#parent-mail-confirm').onclick=async()=>{
        if(busy)return;busy=true;const confirm=$('#parent-mail-confirm');confirm.disabled=true;disableForm(true);
        try{
          const batch=await request('/api/parent-mail/send','POST',{id:draft.id});
          if(!host.isConnected)return;preview.replaceChildren();delete host.dataset.uploadDirty;
          status.textContent=`Đã ghi nhận đợt gửi ${batch.recipients.length} email. Theo dõi từng địa chỉ trong lịch sử.`;await refresh();
        }catch(error){if(host.isConnected){status.textContent=error.message;confirm.disabled=false;}}
        finally{busy=false;if(host.isConnected)disableForm(false);}
      };
    }
    form.addEventListener('submit',async e=>{
      e.preventDefault();if(busy)return;busy=true;const ticket=revision,button=form.querySelector('button');button.disabled=true;preview.replaceChildren();status.textContent='Đang chốt dữ liệu cho bản xem trước…';
      try{
        const values=new FormData(form),[kind,id]=values.get('target').split(':');
        const draft=await request('/api/parent-mail/preview','POST',{[kind==='class'?'classId':'studentId']:id,subject:values.get('subject'),message:values.get('message'),includeReport:values.has('includeReport'),teacherComment:values.get('teacherComment')});
        if(!host.isConnected||ticket!==revision)return;status.textContent=`${draft.recipients.length} email riêng. Chưa có thư nào được gửi.`;showDraft(draft);
      }catch(error){if(host.isConnected)status.textContent=error.message;}
      finally{busy=false;if(host.isConnected)button.disabled=false;}
    });
    const timer=setInterval(()=>{if(!host.isConnected){clearInterval(timer);return;}refresh();},5000);
  }catch(error){if(host.isConnected)host.innerHTML=`<h1>Thông báo phụ huynh</h1><p role="alert">${esc(error.message)}</p><button class="btn" id="parent-mail-retry">Thử lại</button>`;host.querySelector('#parent-mail-retry')?.addEventListener('click',()=>mountParentMail(root,{request}));}
}
