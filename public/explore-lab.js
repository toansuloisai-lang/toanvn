// Keep Three.js out of login/home; preserve the latest state during loading.
function createExploreScene(panel,kind){
 let scene=null,latest=null,disposed=false;
 import('./explore-scene.js').then(module=>{
  if(disposed||!panel.isConnected)return;
  scene=module.createExploreScene(panel,kind);
  if(latest)scene.update(latest);
 }).catch(()=>{if(!disposed)panel.classList.add('scene-unavailable');});
 return {update(data){latest=data;scene?.update(data);},pulse(){scene?.pulse();},dispose(){disposed=true;scene?.dispose();}};
}
import {mountDiscovery} from './discovery-lab.js';
import {math} from './math.js';
import {checkAnswer} from './data.js';
import {rectangleMetrics,isCounterexample,gardenMetrics} from './explore-core.js';
export {rounded,rectangleMetrics,isCounterexample,gardenMetrics} from './explore-core.js';
export function mountExplore(root,{onRecord}={}){
  if(root.querySelector('[data-discovery],[data-discovery-grade]'))return mountDiscovery(root,{onRecord});
  const panel=root.querySelector('[data-explore-kind]');if(!panel)return ()=>{};
  const kind=panel.dataset.exploreKind,scene=createExploreScene(panel,kind),ctrl=new AbortController(),signal=ctrl.signal;
  const $=q=>panel.querySelector(q),on=(node,event,fn)=>node.addEventListener(event,fn,{signal});
  const savedStatus=document.createElement('p');savedStatus.setAttribute('role','status');savedStatus.dataset.activitySave='';if(onRecord)panel.append(savedStatus);
  let saveTicket=0;
  async function record(data,explanation=''){if(!onRecord)return;const ticket=++saveTicket;savedStatus.textContent='Đang lưu kết quả cho giáo viên…';try{await onRecord({id:crypto.randomUUID(),type:kind,data,explanation});if(ticket===saveTicket)savedStatus.textContent='Đã lưu. Giáo viên có thể xem và nhận xét trong hồ sơ của em.';}catch(error){if(ticket===saveTicket)savedStatus.textContent='Chưa lưu được: '+error.message;}}
  if(kind==='counter'){
    function read(){const fields=['A-w','A-h','B-w','B-h'];const values=fields.map(id=>{const input=$('#'+id),value=input.valueAsNumber,valid=Number.isFinite(value)&&input.validity.valid;input.setAttribute('aria-invalid',String(!valid));return valid?value:NaN;});return values.every(Number.isFinite)?Object.fromEntries(['aw','ah','bw','bh'].map((k,i)=>[k,values[i]])):null;}
    function preview(){const data=read();$('#counter-result').textContent='';
      panel.classList.toggle('scene-input-invalid',!data);
      $('#counter-input-error').textContent=data?'':'Nhập mỗi kích thước từ 0,1 đến 100 cm, tối đa một chữ số thập phân. Mô hình đang giữ lần nhập hợp lệ gần nhất.';
      if(!data)return;const m=rectangleMetrics(data);scene.update(data);
      $('#counter-preview').innerHTML=`<div class="shape-stat shape-a"><strong><span>A</span> Hình A</strong><div>${math(String.raw`P_A=${m.pa}\,\mathrm{cm}`)}${math(String.raw`S_A=${m.sa}\,\mathrm{cm}^2`)}</div></div><div class="shape-stat shape-b"><strong><span>B</span> Hình B</strong><div>${math(String.raw`P_B=${m.pb}\,\mathrm{cm}`)}${math(String.raw`S_B=${m.sb}\,\mathrm{cm}^2`)}</div></div><div class="shape-comparison">${math(String.raw`P_A ${m.pa>m.pb?'>':m.pa<m.pb?'<':'='} P_B`)}<span>·</span>${math(String.raw`S_A ${m.sa>m.sb?'>':m.sa<m.sb?'<':'='} S_B`)}</div>`;
    }
    panel.querySelectorAll('.shape-dimensions input').forEach(input=>on(input,'input',preview));on($('#counter-explain'),'input',()=>$('#counter-result').textContent='');
    on($('#counter-form'),'submit',e=>{e.preventDefault();const data=read();if(!data||!$('#counter-form').reportValidity())return;const ok=isCounterexample(data);record(data,$('#counter-explain').value);$('#counter-result').innerHTML=`<div class="feedback ${ok?'':'warn'}">${ok?'Em đã tìm được phản ví dụ theo số đo! Chu vi A lớn hơn, nhưng diện tích A không lớn hơn B. Hãy đối chiếu với lời giải thích của em; giáo viên cần kiểm tra phần lập luận.':'Ví dụ này chưa bác bỏ nhận định. Thử một hình dài, hẹp so với một hình gần vuông; quan sát cả hai số đo.'}</div>`;});preview();
  }
  if(kind==='garden'){
    const saved=[];
    function update(){const a=Number($('#garden-a').value),data=gardenMetrics(a);$('#garden-label').textContent=a;scene.update(data);$('#garden-preview').innerHTML=`<div class="garden-result-main"><span>DIỆN TÍCH KHU VƯỜN</span><div id="garden-area">${math(String.raw`S=${data.area}\,\mathrm{m}^2`)}</div></div><div class="garden-result-details"><div><span>Cạnh dọc tường</span>${math(String.raw`b=${data.b}\,\mathrm m`)}</div><div><span>Hàng rào sử dụng</span>${math(String.raw`2a+b=24\,\mathrm m`)}</div></div>`;}
    on($('#garden-a'),'input',update);on($('[data-save-garden]'),'click',()=>{const d=gardenMetrics(Number($('#garden-a').value));if(!saved.some(s=>s.a===d.a))saved.push(d);record({a:d.a});$('#garden-count').textContent=`${saved.length} phương án`;$('#garden-history').innerHTML=saved.map((s,i)=>`<div class="garden-trial"><span>${i+1}</span><div>${math(String.raw`a=${s.a},\quad b=${s.b}`)}${math(String.raw`S=${s.area}\,\mathrm{m}^2`)}</div></div>`).join('');});update();
  }
  if(kind==='blackbox'){
    const history=[];
    scene.update({input:null,output:null});$('#machine-preview').innerHTML='<p class="machine-idle">Nhập một số rồi bấm <strong>Cho vào hộp</strong> để bắt đầu.</p>';
    on($('#box-form'),'submit',e=>{e.preventDefault();if(!$('#box-form').reportValidity())return;const x=$('#box-input').valueAsNumber;if(!Number.isInteger(x)||Math.abs(x)>100)return;const y=2*x+3;history.push([x,y]);scene.update({input:x,output:y});scene.pulse();$('#box-history').innerHTML=`<h3>Lịch sử phép thử <span>${history.length}</span></h3>`+history.map(([a,b])=>`<div>${math(String.raw`${a}\ \longrightarrow\boxed{\,?\,}\longrightarrow\ ${b}`)}</div>`).join('');$('#machine-preview').innerHTML=`<div class="machine-output"><div><span>ĐẦU VÀO</span>${math(String.raw`x=${x}`)}</div><span>→</span><div><span>ĐẦU RA</span>${math(String.raw`y=${y}`)}</div></div>`;});
    on($('#guess-form'),'submit',e=>{e.preventDefault();const enough=new Set(history.map(([x])=>x)).size>=2,correct=checkAnswer($('#guess').value,'2x+3');if(enough)record({inputs:history.map(([x])=>x),answer:$('#guess').value});$('#box-result').innerHTML=`<div class="feedback ${enough&&correct?'':'warn'}">${!enough?'Hãy thử ít nhất hai đầu vào khác nhau trước khi kết luận.':correct?'Giả thuyết phù hợp quy luật của hộp. Hãy thử một đầu vào mới để kiểm chứng thêm.':'Chưa khớp. Khi đầu vào tăng 1, đầu ra thay đổi bao nhiêu? Thử thêm x = 0.'}</div>`;});
  }
  return ()=>{ctrl.abort();scene.dispose();};
}
