import * as THREE from './vendor/three/three.module.js';
import {fmt} from './discovery-data.js';

// All lengths in each model share one scale; thin tiles represent areas, not volumes.
export function buildDiscovery(group,result,{box,line,text}){
 const {visual,values:{a,b,c},points}=result;
 const green=0x35baa9,gold=0xf4b858,blue=0x6599ec;
 const tile=(x,z,w,d,color,label)=>{box(group,w,.18,d,color,x,0,z);if(label)text(group,label,x,.5,z,{height:.9});};
 const polygon=(vertices,color)=>{const shape=new THREE.Shape();vertices.forEach(([x,z],i)=>i?shape.lineTo(x,-z):shape.moveTo(x,-z));shape.closePath();const mesh=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:.18,bevelEnabled:false}),new THREE.MeshStandardMaterial({color,roughness:.55}));mesh.rotation.x=-Math.PI/2;group.add(mesh);};
 const cylinder=(radius,height,x=0,z=0)=>{const mesh=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,height,64),new THREE.MeshStandardMaterial({color:blue,roughness:.35,transparent:true,opacity:.8}));mesh.position.set(x,height/2,z);mesh.castShadow=true;group.add(mesh);const edges=new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry,25),new THREE.LineBasicMaterial({color:0x245495}));mesh.add(edges);};
 const label=(value,x,y,z)=>text(group,value,x,y,z,{height:.9});
 if(visual==='squares'){
  const k=14/(a+b),A=a*k,B=b*k;
  // Right triangle O(0,0), A(a,0), B(0,b); squares lie outside its three sides.
  polygon([[0,0],[A,0],[0,B]],0xe4edf9);
  tile(A/2,-A/2,A,A,green,`a² = ${fmt(a*a)}`);
  tile(-B/2,B/2,B,B,gold,`b² = ${fmt(b*b)}`);
  polygon([[A,0],[A+B,A],[B,A+B],[0,B]],blue);
  label(`c² = ${fmt(a*a+b*b)}`,(A+B)/2,.5,(A+B)/2);
  line(group,[[0,.21,.6],[.6,.21,.6],[.6,.21,0]],0x244571);
  label(`a = ${a}`,A/2,.6,0);label(`b = ${b}`,0,.6,B/2);
 }else if(visual==='box'){
  const k=10/Math.max(a,b,c);
  // Unit cubes make layers and the volume count visible from every angle.
  const geometry=new THREE.BoxGeometry(k*.96,k*.96,k*.96),material=new THREE.MeshStandardMaterial({color:green,roughness:.6});
  const cubes=new THREE.InstancedMesh(geometry,material,a*b*c),matrix=new THREE.Matrix4();let n=0;
  for(let x=0;x<a;x++)for(let y=0;y<c;y++)for(let z=0;z<b;z++)cubes.setMatrixAt(n++,matrix.makeTranslation((x-(a-1)/2)*k,(y+.5)*k,(z-(b-1)/2)*k));
  cubes.castShadow=true;group.add(cubes);label(`${a} × ${b} × ${c} = ${a*b*c}`,0,c*k+1,0);
 }else if(visual==='cylinder'){
  const k=10/Math.max(2*a,b);cylinder(a*k,b*k);
  line(group,[[0,b*k+.05,0],[a*k,b*k+.05,0]],0x243f66);
  label(`r = ${a} cm`,a*k/2,b*k+.7,0);label(`h = ${b} cm`,a*k+1,b*k/2,0);
 }else if(visual==='identity'){
  const k=12/(a+b),A=a*k,B=b*k;
  tile(-B/2,-B/2,A,A,green,'a²');tile(A/2,-B/2,B,A,gold,'ab');tile(-B/2,A/2,A,B,gold,'ab');tile(A/2,A/2,B,B,blue,'b²');
 }else if(visual==='fraction'){
  const count=Math.ceil(a/b),width=14/count;
  for(let unit=0;unit<count;unit++)for(let part=0;part<b;part++)tile(-7+unit*width+(part+.5)*width/b,0,width/b*.94,3,unit*b+part<a?green:0xd9e4ef);
  label(`${a}/${b} = ${fmt(a/b)}`,0,1,3);
 }else if(visual==='numberline'){
  line(group,[[-10,0,0],[10,0,0]]);for(let i=-20;i<=20;i++){box(group,.025,.15,.3,0x7186a4,i/2,0,0);if(i%5===0)label(String(i),i/2,.4,1);}
  const end=a+b;line(group,[[a/2,.5,0],[a/2,1.5,-1],[end/2,1.5,-1],[end/2,.5,0]],gold);
  box(group,.3,.8,.3,green,a/2,.4,0);box(group,.4,1,.4,blue,end/2,.5,0);label(`${a} + (${b}) = ${end}`,0,3,0);
 }else if(visual==='bars'){
  const values=[a,a*(1-b/100),a*(1-b/100)**2],k=10/a;
  values.forEach((v,i)=>{box(group,2,Math.max(.03,v*k),2,[green,gold,blue][i],(i-1)*5,v*k/2,0);label(fmt(v),(i-1)*5,v*k+.7,0);});
  label('Giá gốc · Giảm lần 1 · Giảm lần 2',0,0,4);
 }else if(points){
  // The graph stays on the x-y plane in a rotatable 3D coordinate frame.
  for(let i=-8;i<=8;i++){line(group,[[i,-8,0],[i,8,0]],0xd1deec);line(group,[[-8,i,0],[8,i,0]],0xd1deec);}
  line(group,[[-8,0,0],[8,0,0]],0x375d88);line(group,[[0,-8,0],[0,8,0]],0x375d88);
  let segment=[];const flush=()=>{if(segment.length>1)line(group,segment,blue);segment=[];};
  for(let i=0;i<=320;i++){const x=-8+i/20,y=points(x);if(Math.abs(y)<=8)segment.push([x,y,.08]);else flush();}flush();
  const x=visual==='line'&&c!==undefined?c:b,y=points(x);
  if(Math.abs(y)<=8){const point=new THREE.Mesh(new THREE.SphereGeometry(.2,16,12),new THREE.MeshStandardMaterial({color:gold}));point.position.set(x,y,.15);group.add(point);label(`(${fmt(x)}; ${fmt(y)})`,x,y+.8,0);}
  label('x',8,.6,0);label('y',.6,8,0);
 }else if(visual==='triangle'){
  const A=a*Math.PI/180,B=b*Math.PI/180,C=Math.PI-A-B,length=10,side=length*Math.sin(B)/Math.sin(C),x=side*Math.cos(A),z=side*Math.sin(A),k=10/Math.max(10,z);
  polygon([[-5*k,0],[5*k,0],[(x-5)*k,-z*k]],green);
  label(`A = ${a}°`,-5*k,.5,1);label(`B = ${b}°`,5*k,.5,1);label(`C = ${180-a-b}°`,(x-5)*k,.5,-z*k-1);
 }else if(visual==='trig'){
  const height=a*Math.tan(b*Math.PI/180),k=12/Math.max(a,height),d=a*k,h=height*k;
  tile(0,0,d+4,5,0xd9eadf);box(group,.6,h,.6,blue,d/2,h/2,0);
  line(group,[[-d/2,.2,0],[d/2,h,0]],gold);line(group,[[-d/2,.2,0],[d/2,.2,0]],green);
  label(`d = ${a} m`,0,.5,2);label(`h = ${fmt(height)} m`,d/2+1,h/2,0);label(`${b}°`,-d/2,1,0);
 }
 // Frame every model consistently without changing its internal proportions.
 const bounds=new THREE.Box3().setFromObject(group),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
 const scale=19/Math.max(size.x,size.y,size.z,1);group.scale.setScalar(scale);group.position.addScaledVector(center,-scale);
 group.userData.visual=visual;
}
