import * as THREE from './vendor/three/three.module.js';
import {buildDiscovery} from './discovery-scene.js';
const clamp=THREE.MathUtils.clamp;
export function createExploreScene(root,kind){
  const frame=root.querySelector('.explore-scene'),host=root.querySelector('.scene-canvas-host');
  const ctrl=new AbortController(),signal=ctrl.signal;
  let renderer=null;
  try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});}catch{}
  const reduced=matchMedia('(prefers-reduced-motion:reduce)');
  let alive=true,lost=false,raf=0,animation=null,latest=null;
  function fallbackUI(){root.querySelector('.scene-fallback-note').hidden=false;root.dataset.renderer='fallback';root.querySelector('.scene-live').textContent='Sơ đồ';root.querySelector('.scene-help').hidden=true;root.querySelectorAll('.scene-toolbar button').forEach(b=>b.disabled=true);frame.removeAttribute('tabindex');frame.setAttribute('aria-label','Sơ đồ minh họa');}
  if(!renderer){fallbackUI();return{update(data){host.innerHTML=fallback(kind,data);},pulse(){},dispose(){ctrl.abort();}};}
  root.dataset.renderer='webgl';renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.setClearColor(0xf1f7fd,1);
  renderer.domElement.setAttribute('role','img');renderer.domElement.setAttribute('aria-label',{counter:'Hai hình chữ nhật A và B cùng tỉ lệ trong không gian ba chiều',garden:'Mô hình khu vườn và hàng rào ba cạnh',blackbox:'Máy hộp đen nhận số và trả kết quả'}[kind]||'Interactive 3D mathematics model');host.append(renderer.domElement);
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(38,1,.1,200),content=new THREE.Group();scene.add(content);
  scene.add(new THREE.HemisphereLight(0xffffff,0x7894a8,1.8));
  const sun=new THREE.DirectionalLight(0xfff7e9,2.0);sun.position.set(-10,18,10);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-25,right:25,top:25,bottom:-25,near:.5,far:70});sun.shadow.normalBias=.03;scene.add(sun);
  const fill=new THREE.DirectionalLight(0x99d5ff,1.1);fill.position.set(12,8,-12);scene.add(fill);
  let azimuth=.15,polar=.82,distance=33,zoomFactor=1,meshToken=null,pulseRing=null;
  const target=new THREE.Vector3(0,.6,0),pointers=new Map();let pinch=0;
  const on=(node,event,fn,options={})=>node.addEventListener(event,fn,{...options,signal});
  function view(){camera.position.setFromSphericalCoords(distance*zoomFactor,polar,azimuth).add(target);camera.lookAt(target);}
  function draw(){if(alive&&!lost&&!document.hidden){view();renderer.render(scene,camera);}}
  function schedule(){if(!raf&&alive&&!lost&&!document.hidden)raf=requestAnimationFrame(tick);}
  function tick(time){raf=0;if(!alive||lost)return;
    if(animation&&meshToken){const t=clamp((time-animation.start)/1500,0,1);meshToken.position.set(-8+16*t,1.05+.6*Math.sin(t*Math.PI),0);meshToken.visible=t<1;meshToken.rotation.y=t*Math.PI*3;if(pulseRing){pulseRing.scale.setScalar(1+.14*Math.sin(t*Math.PI*4));pulseRing.material.opacity=.3+.4*Math.sin(t*Math.PI);}if(t===1){animation=null;if(pulseRing){pulseRing.scale.setScalar(1);pulseRing.material.opacity=.32;}}}
    draw();if(animation)schedule();
  }
  const observer=new ResizeObserver(()=>{const w=Math.max(1,host.clientWidth),h=Math.max(1,host.clientHeight);renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();distance=camera.aspect<1?44:33;draw();});observer.observe(host);
  on(frame,'pointerdown',e=>{if(e.target.closest('button'))return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});frame.setPointerCapture(e.pointerId);frame.focus({preventScroll:true});});
  on(frame,'pointermove',e=>{const old=pointers.get(e.pointerId);if(!old)return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===2){const [a,b]=[...pointers.values()],d=Math.hypot(a.x-b.x,a.y-b.y);if(pinch)zoomFactor=clamp(zoomFactor*pinch/Math.max(d,1),.5,2);pinch=d;}else{azimuth-=(e.clientX-old.x)*.007;polar=clamp(polar-(e.clientY-old.y)*.005,.06,1.4);}setPreset(null);draw();});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])on(frame,event,e=>{pointers.delete(e.pointerId);pinch=0;});
  on(frame,'wheel',e=>{e.preventDefault();zoomFactor=clamp(zoomFactor*(e.deltaY>0?1.1:.9),.5,2);draw();},{passive:false});
  on(frame,'keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-'].includes(e.key))return;e.preventDefault();if(e.key==='ArrowLeft')azimuth-=.12;if(e.key==='ArrowRight')azimuth+=.12;if(e.key==='ArrowUp')polar=clamp(polar-.1,.06,1.4);if(e.key==='ArrowDown')polar=clamp(polar+.1,.06,1.4);if(e.key==='+'||e.key==='=')zoomFactor=clamp(zoomFactor*.9,.5,2);if(e.key==='-')zoomFactor=clamp(zoomFactor*1.1,.5,2);setPreset(null);draw();});
  function setPreset(preset){root.querySelectorAll('[data-scene-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.sceneView===preset)));}
  on(root,'click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.sceneView){azimuth=b.dataset.sceneView==='top'?0:.15;polar=b.dataset.sceneView==='top'?.06:.82;setPreset(b.dataset.sceneView);}if(b.dataset.sceneZoom)zoomFactor=clamp(zoomFactor*(Number(b.dataset.sceneZoom)>0?.85:1.18),.5,2);if(b.hasAttribute('data-scene-reset')){azimuth=.15;polar=.82;zoomFactor=1;setPreset('iso');}draw();});
  on(document,'visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(raf);raf=0;animation=null;if(meshToken)meshToken.visible=false;}else draw();});
  on(reduced,'change',()=>{if(reduced.matches){animation=null;if(meshToken)meshToken.visible=false;draw();}});
  on(renderer.domElement,'webglcontextlost',e=>{e.preventDefault();lost=true;animation=null;cancelAnimationFrame(raf);raf=0;fallbackUI();renderer.domElement.hidden=true;const fallbackHost=document.createElement('div');fallbackHost.className='context-fallback';fallbackHost.innerHTML=fallback(kind,latest);host.append(fallbackHost);});
  function update(data){latest=data;if(lost){host.querySelector('.context-fallback').innerHTML=fallback(kind,data);return;}animation=null;disposeGroup(content);meshToken=null;pulseRing=null;
    if(kind==='discovery'){buildDiscovery(content,data,{box,line,text});root.dataset.modelVisual=data.visual;root.dataset.modelRevision=String(Number(root.dataset.modelRevision||0)+1);}
    if(kind==='counter')buildCounter(content,data);
    if(kind==='garden')buildGarden(content,data);
    if(kind==='blackbox'){const machine=buildMachine(content,data);meshToken=machine.token;pulseRing=machine.ring;}
    draw();
  }
  return {update,pulse(){if(!meshToken||reduced.matches||lost)return;animation={start:performance.now()};meshToken.visible=true;schedule();},dispose(){alive=false;ctrl.abort();observer.disconnect();cancelAnimationFrame(raf);disposeGroup(content);sun.shadow.map?.dispose();renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();}};
}
function disposeGroup(group){const geometries=new Set(),materials=new Set(),textures=new Set();group.traverse(o=>{if(o.isInstancedMesh)o.dispose();if(o.geometry)geometries.add(o.geometry);for(const material of (Array.isArray(o.material)?o.material:[o.material]))if(material){materials.add(material);if(material.map)textures.add(material.map);}});group.clear();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());}
function box(group,w,h,d,color,x=0,y=0,z=0,options={}){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color,roughness:.65,...options}));mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);return mesh;}
function line(group,points,color=0x6b91b0){const mesh=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points.map(p=>new THREE.Vector3(...p))),new THREE.LineBasicMaterial({color}));group.add(mesh);return mesh;}
function text(group,value,x,y,z,{color='#285270',background='#ffffff',height=.65}={}){const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');ctx.font='600 32px Segoe UI, Arial';const width=Math.ceil(ctx.measureText(value).width+34);canvas.width=width;canvas.height=56;ctx.fillStyle=background;ctx.beginPath();ctx.roundRect(1,1,width-2,54,13);ctx.fill();ctx.strokeStyle='#ffffff';ctx.lineWidth=2;ctx.stroke();ctx.font='600 32px Segoe UI, Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=color;ctx.fillText(value,width/2,29);const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,depthTest:false,transparent:true}));sprite.position.set(x,y,z);sprite.scale.set(height*1.5*width/56,height*1.5,1);sprite.renderOrder=3;group.add(sprite);return sprite;}
function platform(group,w,d){box(group,w,.25,d,0xe8f0f8,0,-.48,0);const floor=box(group,w+6,.12,d+6,0xf3f7fc,0,-.7,0);floor.castShadow=false;}
function buildCounter(group,{aw,ah,bw,bh}){
  const scale=10/Math.max(aw,ah,bw,bh),wa=aw*scale,ha=ah*scale,wb=bw*scale,hb=bh*scale,gap=3.2,total=wa+wb+gap,depth=Math.max(ha,hb),left=-total/2+wa/2,right=total/2-wb/2;
  platform(group,total+5,depth+5);
  function tile(w,d,x,color,name,realW,realD){
    const body=box(group,w,.32,d,color,x,-.12,0,{roughness:.35,metalness:.05});
    const edges=new THREE.LineSegments(new THREE.EdgesGeometry(body.geometry),new THREE.LineBasicMaterial({color:0xffffff,transparent:true,opacity:.7}));body.add(edges);
    const step=Math.max(1,Math.ceil(Math.max(aw,ah,bw,bh)/12));
    for(let i=step;i<realW;i+=step)line(group,[[x-w/2+i*scale,.052,-d/2],[x-w/2+i*scale,.052,d/2]],color===0x35baa9?0x7ce0d1:0xffd99a);
    for(let i=step;i<realD;i+=step)line(group,[[x-w/2,.053,-d/2+i*scale],[x+w/2,.053,-d/2+i*scale]],color===0x35baa9?0x7ce0d1:0xffd99a);
    text(group,name,x,.75,0,{background:color===0x35baa9?'#dcfff7':'#fff2da',color:color===0x35baa9?'#0a7f70':'#b67516',height:.86});
    const z=d/2+.5;line(group,[[x-w/2,.13,z],[x+w/2,.13,z]]);for(const end of [-1,1])line(group,[[x+end*w/2,.13,z-.15],[x+end*w/2,.13,z+.15]]);
    text(group,`${realW} cm`,x,.35,z+.6,{height:.62});const outside=x+(name==='A'?-1:1)*(w/2+.65);text(group,`${realD} cm`,outside,.5,0,{height:.62});
  }
  tile(wa,ha,left,0x35baa9,'A',aw,ah);tile(wb,hb,right,0xf4b858,'B',bw,bh);
}
function buildGarden(group,{a,b}){
  const k=.64,w=b*k,d=a*k;platform(group,19,12);
  box(group,w,.38,d,0x947651,0,-.18,0);box(group,w,.1,d,0x77be82,0,.06,0);
  const wall=box(group,17,.95,.3,0xc3d1df,0,.28,-d/2-.22);wall.castShadow=true;
  for(let x=-8;x<=8;x+=1.3)line(group,[[x,-.15,-d/2-.057],[x,.75,-d/2-.057]],0xa0b4c5);
  line(group,[[-8.5,.3,-d/2-.054],[8.5,.3,-d/2-.054]],0xa0b4c5);
  function fence(x1,z1,x2,z2){const length=Math.hypot(x2-x1,z2-z1),n=Math.max(1,Math.ceil(length/.72));for(let i=0;i<=n;i++)box(group,.09,.85,.09,0xf4e7c7,x1+(x2-x1)*i/n,.48,z1+(z2-z1)*i/n);for(const y of [.31,.69]){const rail=box(group,length,.055,.055,0xdfcfa6,(x1+x2)/2,y,(z1+z2)/2);rail.rotation.y=-Math.atan2(z2-z1,x2-x1);}}
  fence(-w/2,-d/2,-w/2,d/2);fence(w/2,-d/2,w/2,d/2);fence(-w/2,d/2,w/2,d/2);
  const rows=Math.max(1,Math.floor(d/.7)),cols=Math.max(1,Math.floor(w/.8));
  for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){if(row%2||col%2)continue;const x=-w/2+(col+.5)*w/cols,z=-d/2+(row+.5)*d/rows;const plant=new THREE.Mesh(new THREE.IcosahedronGeometry(Math.min(.16,w/5,d/5),0),new THREE.MeshStandardMaterial({color:(row+col)%4?0x43a774:0x4aaf80,roughness:.95}));plant.position.set(x,.24,z);plant.castShadow=true;group.add(plant);}
  text(group,'TƯỜNG · KHÔNG CẦN RÀO',0,1.5,-d/2-.25,{height:.66,background:'#edf4fc'});
  text(group,`b = ${b} m`,0,.45,d/2+1.25,{height:.7});text(group,`a = ${a} m`,-w/2-1,.65,0,{height:.67});text(group,`a = ${a} m`,w/2+1,.65,0,{height:.67});
}
function buildMachine(group,{input=null,output=null}){
  platform(group,21,8);box(group,4.4,3.8,3.8,0x203c73,0,1.48,0,{roughness:.35,metalness:.3});box(group,4.55,.16,3.95,0x5b81bc,0,3.44,0,{metalness:.4,roughness:.3});
  for(const x of [-2.25,2.25])box(group,.1,2.3,2.55,0x5ac5da,x,1.3,0,{emissive:0x12657a,emissiveIntensity:.7});
  for(const x of [-6,6]){box(group,7,.22,2.1,0x8fa9c5,x,-.1,0,{metalness:.25,roughness:.5});for(let z=-.7;z<=.7;z+=.7)line(group,[[x-3,.025,z],[x+3,.025,z]],0xcde1ee);for(let i=-2;i<=2;i++){const roller=new THREE.Mesh(new THREE.CylinderGeometry(.12,.12,2.15,12),new THREE.MeshStandardMaterial({color:0x436689,metalness:.6,roughness:.3}));roller.rotation.x=Math.PI/2;roller.position.set(x+i,.08,0);group.add(roller);}}
  text(group,'?',0,2.2,2.04,{height:1.4,background:'#274b85',color:'#bcf5ff'});
  text(group,input===null?'ĐẦU VÀO':`x = ${input}`,-6,1.4,0,{height:.9,background:'#ddf3ff',color:'#256591'});
  text(group,output===null?'ĐẦU RA':`y = ${output}`,6,1.4,0,{height:.9,background:'#e0fff2',color:'#167b66'});
  const ring=new THREE.Mesh(new THREE.TorusGeometry(2.7,.04,8,80),new THREE.MeshBasicMaterial({color:0x5ac8f1,transparent:true,opacity:.32}));ring.rotation.x=Math.PI/2;ring.position.y=.08;group.add(ring);
  for(let i=0;i<3;i++){const light=new THREE.Mesh(new THREE.SphereGeometry(.1,10,10),new THREE.MeshStandardMaterial({color:0x73e2c8,emissive:0x32ba9b,emissiveIntensity:1}));light.position.set(-.45+i*.45,3,1.93);group.add(light);}
  const token=box(group,.75,.75,.75,0x77dcff,-8,1,0,{emissive:0x257798,emissiveIntensity:.4,metalness:.2,roughness:.3});token.visible=false;return{token,ring};
}
function fallback(kind,data){
  if(!data)return '';
  if(kind==='discovery')return data.fallbackSVG||'';
  const opening='<svg viewBox="0 0 600 330" role="img" aria-label="Sơ đồ thay thế cho mô hình 3D">',close='</svg>';
  if(kind==='counter'){const {aw,ah,bw,bh}=data,k=220/Math.max(aw,ah,bw,bh);return opening+`<rect x="25" y="45" width="${aw*k}" height="${ah*k}" fill="#45bfaf"/><rect x="330" y="45" width="${bw*k}" height="${bh*k}" fill="#edbb65"/><text x="30" y="300">A: ${aw} × ${ah} cm</text><text x="330" y="300">B: ${bw} × ${bh} cm</text>`+close;}
  if(kind==='garden'){const {a,b}=data,k=Math.min(480/b,190/a);return opening+`<path d="M35 55H565" stroke="#8498b2" stroke-width="18"/><rect x="${300-b*k/2}" y="65" width="${b*k}" height="${a*k}" fill="#84c493" stroke="#bf9e69" stroke-width="4"/><text x="160" y="295">a = ${a} m · b = ${b} m</text>`+close;}
  return opening+`<rect x="215" y="60" width="170" height="170" rx="18" fill="#294f86"/><text x="285" y="167" fill="white" font-size="55">?</text><text x="35" y="280">${data.input===null?'Đầu vào':`x = ${data.input}`}</text><text x="450" y="280">${data.output===null?'Đầu ra':`y = ${data.output}`}</text><path d="M65 145h140m190 0h140" stroke="#6aacd3" stroke-width="5"/>`+close;
}
