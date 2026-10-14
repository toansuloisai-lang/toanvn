const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export async function mountRepairLeaderboard(host,request,classId){
  host.innerHTML='<p>Đang tải thành tích sửa lỗi…</p>';
  try{
    const data=await request('/api/knowledge/leaderboard'+(classId?'?classId='+encodeURIComponent(classId):''));
    if(!host.isConnected)return;
    host.innerHTML=`<h2>🏆 Top 10 sửa lỗi thành công</h2><label class="field">Lớp<select aria-label="Lớp xếp hạng">${data.classes.map(c=>`<option value="${esc(c.id)}" ${c.id===data.classId?'selected':''}>${esc(c.name)}</option>`).join('')}</select></label><p class="hint">${esc(data.note)}</p>${data.top.length?`<ol class="repair-ranking">${data.top.map(r=>`<li><span><strong>#${r.rank} · ${esc(r.name)}${r.isYou?' (Bạn)':''}</strong></span><span><strong>${r.corrected}</strong> câu sửa đúng</span></li>`).join('')}</ol>`:'<p>Chưa có học sinh sửa lỗi thành công. Hãy sửa các câu sai bên dưới để ghi tên lên bảng thành tích!</p>'}${data.yourResult?`<p>Thành tích của bạn: <strong>hạng ${data.yourResult.rank} · ${data.yourResult.corrected} câu sửa đúng</strong>.</p>`:''}<button class="btn secondary" type="button">Cập nhật thành tích</button>`;
    host.querySelector('select').onchange=e=>mountRepairLeaderboard(host,request,e.target.value);
    const honor=document.createElement('div');honor.className='repair-honor';
    const ownHonored=data.yourResult&&data.top.some(r=>r.isYou);
    honor.innerHTML=`<span class="eyebrow">VINH DANH TOP 10 · NỖ LỰC SỬA SAI</span><h3>${ownHonored?'Chúc mừng bạn được vinh danh!':'Mỗi lần sửa đúng là một bước tiến'}</h3><p>${ownHonored?`Bạn đứng hạng ${data.yourResult.rank}, đã sửa thành công ${data.yourResult.corrected} câu. Hãy tiếp tục phát huy!`:'Tôn vinh những học sinh kiên trì tìm lỗi, sửa đúng và tiến bộ qua từng bài làm.'}</p>`;
    host.querySelector('h2').after(honor);
    host.querySelector('button').onclick=()=>mountRepairLeaderboard(host,request,data.classId);
  }catch(e){host.textContent=e.message;}
}
