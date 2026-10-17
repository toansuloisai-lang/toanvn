const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function mountRoster(container,{request,auth,onCreated}){
 const panel=document.createElement('div');container.prepend(panel);
 panel.innerHTML=`<h2>Tạo lớp từ Excel</h2><p>Tự sinh mã học sinh, tài khoản học sinh và phụ huynh. Một email phụ huynh có thể liên kết nhiều con.</p><a class="btn secondary" href="/api/roster/template" download>Tải Excel mẫu</a><form id="roster-form"><label class="field">Tên lớp<input class="input" name="name" required maxlength="80" placeholder="Ví dụ: 9A — 2026"></label><label class="field">Khối<select name="grade">${[6,7,8,9].map(g=>`<option>${g}</option>`).join('')}</select></label><label class="field">Danh sách Excel (.xlsx, tối đa 200 học sinh)<input class="input" name="file" type="file" accept=".xlsx" required></label><p>Ba cột: Tên học sinh, Tên phụ huynh, Gmail phụ huynh. Thay dòng ví dụ bằng dữ liệu thật; chỉ nhập văn bản thuần.</p><button class="btn">Xem trước danh sách</button></form><p class="roster-status" role="status"></p><div class="roster-preview"></div><hr>`;
 const form=panel.querySelector('form'),status=panel.querySelector('.roster-status'),preview=panel.querySelector('.roster-preview');let token=null;
 form.addEventListener('input',()=>{token=null;preview.replaceChildren();});
 form.addEventListener('submit',async e=>{
   e.preventDefault();const button=form.querySelector('button');button.disabled=true;token=null;preview.replaceChildren();status.textContent='Đang kiểm tra Excel…';
   try{
     const data=new FormData(form),file=data.get('file');if(file.size>5*1024*1024)throw Error('File tối đa 5 MB.');
     const base64=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.onerror=reject;reader.readAsDataURL(file);});
     const result=await request('/api/roster/preview','POST',{name:data.get('name'),grade:Number(data.get('grade')),filename:file.name,base64},60000);token=result.id;
     status.textContent=result.valid?`${result.rows.length} học sinh hợp lệ. Kiểm tra danh sách trước khi tạo.`:'Có lỗi trong danh sách. Sửa file Excel rồi tải lại.';
     preview.innerHTML=`<div class="table-wrap"><table><thead><tr><th>Dòng</th><th>Học sinh</th><th>Phụ huynh</th><th>Email</th><th>Kiểm tra</th></tr></thead><tbody>${result.rows.map(r=>`<tr><td>${r.row}</td><td>${esc(r.studentName)}</td><td>${esc(r.parentName)}</td><td>${esc(r.email)}</td><td>${esc(r.errors.join(' ')||(r.existingParent?'Liên kết tài khoản hiện có':'Tạo tài khoản mới'))}</td></tr>`).join('')}</tbody></table></div>${result.valid?'<button class="btn" id="roster-confirm">Xác nhận tạo lớp và tài khoản</button>':''}`;
     preview.querySelector('button')?.addEventListener('click',async ev=>{
       const confirm=ev.currentTarget;confirm.disabled=true;status.textContent='Đang tạo tài khoản…';
       try{
         const created=await request('/api/roster/commit','POST',{id:token},120000);
         form.hidden=true;preview.innerHTML=`<div class="notice"><strong>Lớp ${esc(created.className)} · ${created.count} học sinh</strong><p>File Excel gồm tài khoản và mật khẩu học sinh, phụ huynh trên cùng một dòng để đối chiếu. Phụ huynh đã có tài khoản tiếp tục dùng mật khẩu hiện tại.</p><button class="btn" id="roster-download">Tải lại file tài khoản (.xlsx)</button> <button class="btn secondary" id="roster-open">Mở lớp vừa tạo</button></div>`;
         status.textContent=`Đã tạo lớp thành công. File tài khoản đang được tải xuống; nếu chưa thấy, bấm “Tải lại file tài khoản”. Hãy lưu file trước khi rời trang và gửi từng gia đình đúng dòng tài khoản của họ.`;
         preview.querySelector('#roster-download').onclick=()=>{
           const bytes=Uint8Array.from(atob(created.file.base64),c=>c.charCodeAt(0));
           const url=URL.createObjectURL(new Blob([bytes],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'})),a=document.createElement('a');a.href=url;a.download=created.file.filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
         };
         preview.querySelector('#roster-download').click();
         preview.querySelector('#roster-open').onclick=async()=>{try{const data=await request('/api/workspace');Object.assign(auth,{user:data.user,students:data.students,studentId:data.studentId});await onCreated(created.classId);}catch(error){status.textContent=error.message;}};
       }catch(error){status.textContent=error.message;confirm.disabled=false;}
     });
   }catch(error){status.textContent=error.message;}finally{button.disabled=false;}
 });
}
