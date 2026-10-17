import * as THREE from './vendor/three/three.module.js';
import {CSS3DRenderer,CSS3DObject} from './vendor/three/CSS3DRenderer.js';
import {math,richMath} from './math.js';
import {evaluate} from './data.js';
import {geometrySVG,geometryHTML,mountGeometry} from './formula-geometry.js';
const groups={statistics:['Thống kê & xác suất','#ffbf57'],numbers:['Số học','#b490ff'],algebra:['Đại số','#68a7ff'],geometry:['Hình học','#43dcc5']};
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function tile(f){return `<article class="formula-item formula-tile" style="--tile-color:${groups[f.group][1]}" data-formula="${f.id}"><div class="tile-top"><span>${f.number}</span><span>${groups[f.group][0]}</span></div><h2>${f.title}</h2><p class="tile-topic">Khối ${f.grades.join(", ")} · ${escape(f.topic)}</p><div class="tile-equation">${math(f.tex)}</div>${f.geometry?`<div class="tile-geometry">${geometrySVG(f.geometry)}</div>`:`<div class="tile-symbol" aria-hidden="true">${f.symbol}</div>`}<button type="button" class="tile-open" data-open-formula="${f.id}" aria-label="Xem chi tiết: ${f.title}">Xem chi tiết <span>↗</span></button></article>`;}
export function atlasHTML(library){return `<section class="formula-atlas" aria-label="Không gian công thức toán học"><header class="atlas-header"><div><div class="atlas-kicker"><span></span> PHÒNG THÍ NGHIỆM · KHÔNG GIAN KHÁM PHÁ</div><h1>Bảng công thức <em>3D</em></h1><p>Chạm vào một ý tưởng. Khám phá cả cách dùng.</p></div><div class="atlas-count"><strong>${library.length}</strong><span>công thức<br>để khám phá</span></div></header><div class="atlas-curriculum"><label>Khối lớp<select data-grade><option value="all">Tất cả khối</option>${[...new Set(library.flatMap(f=>f.grades))].sort().map(g=>`<option value="${g}">Khối ${g}</option>`).join('')}</select></label><label>Chủ đề<select data-topic></select></label><label>Tìm công thức<input data-search type="search" placeholder="Tên công thức, chủ đề…"></label></div><div class="atlas-toolbar"><div class="atlas-layouts" role="group" aria-label="Cách sắp xếp công thức">${[['table','▦','Bảng'],['sphere','◉','Mặt cong'],['helix','〰','Xếp tầng'],['list','☷','Danh sách']].map(([id,i,t])=>`<button type="button" data-layout="${id}" aria-pressed="false"><span aria-hidden="true">${i}</span>${t}</button>`).join('')}</div><div class="atlas-tools"><button type="button" data-rotate aria-pressed="false">↻ Tự xoay</button><button type="button" data-zoom="1" aria-label="Phóng to">+</button><button type="button" data-zoom="-1" aria-label="Thu nhỏ">−</button><button type="button" data-reset aria-label="Đưa về góc nhìn ban đầu">⌖</button></div></div><div class="atlas-filters" role="group" aria-label="Lọc công thức"><button type="button" data-group="all" aria-pressed="true">Tất cả <span>${library.length}</span></button>${Object.entries(groups).map(([id,[name,color]])=>`<button type="button" data-group="${id}" aria-pressed="false"><i style="background:${color}"></i>${name}</button>`).join('')}<p>Kéo để xoay · Cuộn để thu/phóng · Chọn “Xem chi tiết”</p></div><div class="atlas-stage" tabindex="0" aria-label="Bảng công thức ba chiều. Dùng phím mũi tên để xoay, cộng trừ để thu phóng."><div class="atlas-stars" aria-hidden="true"></div><div class="atlas-orbit orbit-one" aria-hidden="true"></div><div class="atlas-orbit orbit-two" aria-hidden="true"></div><div class="atlas-scene"></div><div class="atlas-list" hidden>${library.map(tile).join('')}</div><div class="atlas-stage-caption"><span class="atlas-live-dot"></span> <span data-atlas-status>Đang chuẩn bị không gian…</span></div></div><footer class="atlas-footer"><span><b>✧</b> Hiểu điều kiện trước, áp dụng công thức sau.</span><span>Hình tương tác · Ví dụ từng bước · Phản ví dụ · Tự kiểm tra</span></footer><dialog class="formula-dialog" aria-labelledby="formula-dialog-title"><div class="formula-dialog-content"></div></dialog></section>`;}

export function mountAtlas(root,library,{onRecord,practiceBase='#practice/',grade}={}){
  const atlas=root.querySelector('.formula-atlas');if(!atlas)return ()=>{};
  const ctrl=new AbortController(),on=(node,event,fn,extra={})=>node.addEventListener(event,fn,{...extra,signal:ctrl.signal});
  const stage=atlas.querySelector('.atlas-stage'),host=atlas.querySelector('.atlas-scene'),list=atlas.querySelector('.atlas-list'),dialog=atlas.querySelector('dialog');
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(45,1,1,12000),world=new THREE.Group();scene.add(world);
  const sphereGuides=[0,1,2].map(i=>{const el=document.createElement('div');el.className='atlas-sphere-guide';el.setAttribute('aria-hidden','true');const ring=new CSS3DObject(el);if(i===1)ring.rotation.x=Math.PI/2;if(i===2)ring.rotation.y=Math.PI/2;world.add(ring);return ring;});
  const renderer=new CSS3DRenderer();host.append(renderer.domElement);
  renderer.domElement.className='atlas-css-renderer';
  const objects=library.map(f=>{const shell=document.createElement('div');shell.innerHTML=tile(f);const node=shell.firstElementChild;const obj=new CSS3DObject(node);obj.userData.formula=f;world.add(obj);return obj;});
  let mode=library.length>30||matchMedia('(max-width:620px)').matches?'list':'table',filter='all',automatic=false,frame=0,transition=false,alive=true,geometryCleanup=()=>{},opener=null;
  const reduced=matchMedia('(prefers-reduced-motion:reduce)');let previous=0;
  let fitDistance=1500;const pointers=new Map();let lastPinch=0;
  const status=atlas.querySelector('[data-atlas-status]');
  const pager=document.createElement('nav');pager.className='atlas-pages';pager.setAttribute('aria-label','Trang công thức');pager.innerHTML='<button type="button" data-page="-1" aria-label="Trang trước">← Trước</button><span data-page-status role="status"></span><button type="button" data-page="1" aria-label="Trang sau">Sau →</button>';stage.after(pager);
  const empty=document.createElement('p');empty.className='atlas-empty';empty.textContent='Không tìm thấy công thức. Hãy đổi chủ đề hoặc từ khóa.';stage.append(empty);
  let page=0,dragged=false;
  const pageSize=()=>stage.clientWidth<620?2:6;
  const gradeSelect=atlas.querySelector('[data-grade]'),topicSelect=atlas.querySelector('[data-topic]'),searchInput=atlas.querySelector('[data-search]');
  gradeSelect.value=[...gradeSelect.options].some(o=>o.value===String(grade))?String(grade):'all';
  const normalize=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').toLowerCase();
  function inSection(f){return (gradeSelect.value==='all'||f.grades.includes(Number(gradeSelect.value)))&&(filter==='all'||f.group===filter);}
  function matches(f){return inSection(f)&&(topicSelect.value==='all'||f.topic===topicSelect.value)&&normalize([f.title,f.topic,f.condition].join(' ')).includes(normalize(searchInput.value.trim()));}
  function topics(){const previous=topicSelect.value;topicSelect.innerHTML='<option value="all">Tất cả chủ đề</option>'+[...new Set(library.filter(inSection).map(f=>f.topic))].map(t=>'<option value="'+escape(t)+'">'+escape(t)+'</option>').join('');if([...topicSelect.options].some(o=>o.value===previous))topicSelect.value=previous;}
  topics();
  on(gradeSelect,'change',()=>{topics();layout();});on(topicSelect,'change',()=>layout());on(searchInput,'input',()=>layout());
  function matching(){return objects.filter(o=>matches(o.userData.formula));}
  function visible(){const all=matching();return mode==='list'?all:all.slice(page*pageSize(),(page+1)*pageSize());}
  function fit(){
    const count=visible().length,columns=Math.max(1,Math.min(stage.clientWidth<620?1:3,count)),rows=Math.ceil(count/columns);
    const halfHeight=rows*300/2+30;
    const halfWidth=Math.min(stage.clientWidth<620?1:3,count)*350/2+30;
    fitDistance=Math.max(halfHeight,halfWidth/camera.aspect)/Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*1.09;
    if(mode!=='table')fitDistance+=250;
    camera.position.set(0,0,fitDistance);camera.lookAt(0,0,0);
  }
  function schedule(){if(alive&&!frame&&!document.hidden)frame=requestAnimationFrame(tick);}
  function tick(time){
    frame=0;if(!alive)return;
    const dt=Math.min((time-previous)/1000||.016,.05);previous=time;
    let moving=false;
    for(const obj of objects){if(!obj.visible)continue;const target=obj.userData.target;if(!target)continue;
      if(obj.position.distanceToSquared(target.position)>.05||1-Math.abs(obj.quaternion.dot(target.quaternion))>.00001){obj.position.lerp(target.position,Math.min(1,dt*7));obj.quaternion.slerp(target.quaternion,Math.min(1,dt*7));moving=true;}else{obj.position.copy(target.position);obj.quaternion.copy(target.quaternion);}}
    transition=moving;
    if(automatic&&mode!=='list'&&!dialog.open&&pointers.size===0&&!reduced.matches)world.rotation.y+=dt*.10;
    if(mode!=='list')renderer.render(scene,camera);
    if((moving||automatic)&&mode!=='list'&&!dialog.open)schedule();
  }
  function layout(next=mode,keepPage=false){
    if(!keepPage)page=0;
    mode=next;world.rotation.set(0,0,0);pointers.clear();lastPinch=0;
    const selected=visible();
    const total=matching().length,pages=Math.max(1,Math.ceil(total/pageSize()));
    pager.hidden=mode==='list'||total===0;empty.hidden=total>0;
    pager.querySelector('[data-page-status]').textContent=`Trang ${page+1} / ${pages} · ${total} công thức`;
    pager.querySelector('[data-page="-1"]').disabled=page===0;pager.querySelector('[data-page="1"]').disabled=page>=pages-1;
    sphereGuides.forEach(ring=>{ring.visible=mode==='sphere';ring.element.style.display=ring.visible?'':'none';});
    objects.forEach(o=>{o.visible=selected.includes(o);o.element.style.display=o.visible?'':'none';o.element.inert=!o.visible||mode==='list';});
    list.querySelectorAll('[data-formula]').forEach(el=>{const f=library.find(f=>f.id===el.dataset.formula);el.hidden=!matches(f);el.inert=mode!=='list'||el.hidden;});
    host.hidden=mode==='list';host.inert=mode==='list';list.hidden=mode!=='list';list.inert=mode!=='list';stage.classList.toggle('is-list',mode==='list');
    atlas.querySelectorAll('[data-layout]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.layout===mode)));
    atlas.querySelectorAll('[data-zoom],[data-reset],[data-rotate]').forEach(b=>b.disabled=mode==='list'||(b.hasAttribute('data-rotate')&&reduced.matches));
    selected.forEach((obj,i)=>{
      const t=new THREE.Object3D(),n=selected.length;
      const cols=Math.min(stage.clientWidth<620?1:3,n),rows=Math.ceil(n/cols),x=(i%cols-(cols-1)/2)*350,y=((rows-1)/2-Math.floor(i/cols))*300;
      t.position.set(x,y,mode==='sphere'?-(x*x+y*y)/2400:mode==='helix'?(i%cols)*35:0);
      if(mode==='sphere'){t.rotation.y=x/5000;t.rotation.x=-y/5000;}
      obj.userData.target={position:t.position.clone(),quaternion:t.quaternion.clone()};
      if(reduced.matches||mode==='list'){obj.position.copy(t.position);obj.quaternion.copy(t.quaternion);}
    });
    fit();status.textContent=`${selected.length} / ${total} công thức · ${({table:'Bảng',sphere:'Mặt cong',helix:'Xếp tầng',list:'Danh sách dễ đọc'})[mode]}`;schedule();
  }
  let lastPageSize=pageSize();
  function resize(){const width=stage.clientWidth,height=Math.max(420,stage.clientHeight);renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();if(lastPageSize!==pageSize()){lastPageSize=pageSize();layout();}else{fit();schedule();}}
  const observer=new ResizeObserver(resize);observer.observe(stage);
  function zoom(direction){camera.position.z=THREE.MathUtils.clamp(camera.position.z*(direction>0?.85:1.18),400,6000);schedule();}
  on(atlas,'click',e=>{
    const card=e.target.closest('[data-formula]');
    if(card&&!e.target.closest('button')&&!dragged){openDetail(library.find(f=>f.id===card.dataset.formula),card.querySelector('button'));return;}
    const button=e.target.closest('button');if(!button)return;
    if(button.dataset.page){page+=Number(button.dataset.page);layout(mode,true);}
    if(button.dataset.layout)layout(button.dataset.layout);
    if(button.dataset.group){filter=button.dataset.group;topics();atlas.querySelectorAll('[data-group]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));layout();}
    if(button.hasAttribute('data-rotate')){automatic=!automatic;button.setAttribute('aria-pressed',String(automatic));schedule();}
    if(button.dataset.zoom)zoom(Number(button.dataset.zoom));
    if(button.hasAttribute('data-reset')){world.rotation.set(0,0,0);fit();schedule();}
    if(button.dataset.openFormula)openDetail(library.find(f=>f.id===button.dataset.openFormula),button);
    if(button.hasAttribute('data-close-formula'))dialog.close();
  });
  on(stage,'pointerdown',e=>{dragged=false;if(mode==='list'||e.target.closest('button,a,input,[data-formula]'))return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});stage.setPointerCapture(e.pointerId);stage.focus({preventScroll:true});});
  on(stage,'pointermove',e=>{
    if(!pointers.has(e.pointerId))return;
    const before=pointers.get(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(Math.hypot(e.clientX-before.x,e.clientY-before.y)>2)dragged=true;
    if(pointers.size===2){const [a,b]=[...pointers.values()],distance=Math.hypot(a.x-b.x,a.y-b.y);if(lastPinch)camera.position.z=THREE.MathUtils.clamp(camera.position.z*lastPinch/distance,400,6000);lastPinch=distance;}
    else{world.rotation.y+=(e.clientX-before.x)*.004;world.rotation.x=THREE.MathUtils.clamp(world.rotation.x+(e.clientY-before.y)*.003,-1.2,1.2);}
    schedule();
  });
  for(const event of ['pointerup','pointercancel','lostpointercapture'])on(stage,event,e=>{pointers.delete(e.pointerId);lastPinch=0;});
  on(stage,'wheel',e=>{if(mode==='list')return;e.preventDefault();zoom(e.deltaY<0?1:-1);},{passive:false});
  on(stage,'keydown',e=>{if(mode==='list'||e.target.closest('button'))return;if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','-','='].includes(e.key)){e.preventDefault();if(e.key==='ArrowLeft')world.rotation.y-=.12;if(e.key==='ArrowRight')world.rotation.y+=.12;if(e.key==='ArrowUp')world.rotation.x-=.12;if(e.key==='ArrowDown')world.rotation.x+=.12;if(['+','-','='].includes(e.key))zoom(e.key==='-'?-1:1);schedule();}});
  on(document,'visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;}else schedule();});
  on(reduced,'change',()=>{if(reduced.matches){automatic=false;atlas.querySelector('[data-rotate]').setAttribute('aria-pressed','false');}layout();});
  on(dialog,'close',()=>{geometryCleanup();geometryCleanup=()=>{};opener?.focus({preventScroll:true});schedule();});
  on(dialog,'click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
  function openDetail(f,button){
    geometryCleanup();opener=button;
    const content=dialog.querySelector('.formula-dialog-content');content.innerHTML=detailHTML(f);
    const practice=content.querySelector('.detail-practice');if(practice)practice.href=practiceBase+encodeURIComponent(f.skill);
    if(onRecord){content.querySelector('.self-check-note').textContent='Kết quả được lưu để giáo viên xem, theo dõi riêng với điểm nhiệm vụ.';const status=document.createElement('p');status.setAttribute('role','status');status.dataset.formulaSave='';content.querySelector('.formula-check').append(status);}
    const form=content.querySelector('.formula-check');
    form.addEventListener('submit',e=>{e.preventDefault();const answer=evaluate(form.querySelector('input').value),correct=Number.isFinite(answer)&&Math.abs(answer-f.check[1])<1e-8;form.querySelector('.formula-check-feedback').innerHTML=`<div class="${correct?'check-correct':'check-retry'}">${correct?'✓ Đúng rồi. '+richMath(f.check[2]):'Chưa đúng. Hãy kiểm tra điều kiện và làm lại theo các bước ở trên.'}</div>`;},{signal:ctrl.signal});
    if(onRecord){let ticket=0;form.addEventListener('submit',async()=>{const n=++ticket,status=form.querySelector('[data-formula-save]');status.textContent='Đang lưu kết quả…';try{await onRecord({id:crypto.randomUUID(),type:'formula',data:{formulaId:f.id,answer:form.querySelector('input').value}});if(n===ticket)status.textContent='Đã lưu kết quả cho giáo viên.';}catch(error){if(n===ticket)status.textContent='Chưa lưu được: '+error.message;}},{signal:ctrl.signal});}
    if(!dialog.open)dialog.showModal();dialog.scrollTop=0;
    if(f.geometry)geometryCleanup=mountGeometry(content,f.geometry);
  }
  resize();layout();
  return ()=>{alive=false;ctrl.abort();cancelAnimationFrame(frame);observer.disconnect();geometryCleanup();if(dialog.open)dialog.close();for(const obj of objects)world.remove(obj);renderer.domElement.remove();};
}
function detailHTML(f){return `<header class="formula-detail-header"><div><span class="detail-category" style="color:${groups[f.group][1]}">${f.number} / Khối ${f.grades.join(", ")} / ${groups[f.group][0]} · ${escape(f.topic)}</span><h2 id="formula-dialog-title">${f.title}</h2></div><button type="button" class="detail-close" data-close-formula aria-label="Đóng chi tiết công thức" autofocus>×</button></header><div class="formula-detail-grid"><aside class="formula-detail-visual"><div class="detail-main-formula">${math(f.tex,true)}</div><p class="detail-description">${escape(f.description)}</p><ul class="formula-symbols">${f.symbols.map(s=>`<li>${richMath(s)}</li>`).join('')}</ul>${f.geometry?geometryHTML(f.geometry):`<div class="algebra-note"><span>✧</span><h3>Hiểu trước khi nhớ</h3><p>${richMath(f.condition)}</p><div>${math(f.example,true)}</div></div>`}</aside><div class="formula-detail-guide"><section class="detail-condition"><span class="detail-step">01</span><h3>Điều kiện để dùng đúng</h3><p>${richMath(f.condition)}</p></section><div class="formula-use-grid"><section class="can-use"><h3>✓ Giải được những bài nào?</h3><ul>${f.use.map(t=>`<li>${escape(t)}</li>`).join('')}</ul></section><section class="cannot-use"><h3>! Khi nào không áp dụng?</h3><ul>${f.avoid.map(t=>`<li>${escape(t)}</li>`).join('')}</ul></section></div><section class="worked-example"><span class="detail-step">02</span><h3>Thử giải một bài cụ thể</h3><p class="worked-problem">${richMath(f.problem)}</p><ol>${f.steps.map(([text,tex])=>`<li><span>${escape(text)}</span>${math(tex,true)}</li>`).join('')}</ol>${f.solutionNote?`<p class="worked-explanation"><strong>Giải thích:</strong> ${richMath(f.solutionNote)}</p>`:''}</section>${f.counter?`<section class="formula-counter"><span class="detail-step">03</span><h3>Vì sao trường hợp này không dùng được?</h3><p>${escape(f.counter[0])}</p>${math(f.counter[1],true)}<p class="counter-reason">${escape(f.counter[2])}</p></section>`:`<section class="formula-counter"><span class="detail-step">03</span><h3>Lưu ý để tránh nhầm lẫn</h3><p>${richMath(f.avoid.join(' '))}</p></section>`}<section class="formula-self-check"><span class="detail-step">04</span><h3>Đến lượt em kiểm chứng</h3><form class="formula-check"><label for="formula-check-input">${escape(f.check[0])}</label><div><input id="formula-check-input" required maxlength="100" inputmode="text" autocomplete="off" placeholder="Nhập số hoặc phân số"><button type="submit">Kiểm tra →</button></div><div class="formula-check-feedback" role="status"></div></form><p class="self-check-note">Bài thử nhanh để tự kiểm tra, chưa tính vào báo cáo tiến bộ.</p></section>${f.skill?`<a class="detail-practice" href="#practice/${f.skill}">Luyện thêm chủ đề này →</a>`:''}</div></div>`;}
