import {formulaLibrary} from './public/formula-library.js';
import {discoveryResult} from './public/discovery-data.js';
import {evaluate} from './public/data.js';
import {checkAnswer} from './public/data.js';
import {rectangleMetrics,isCounterexample,gardenMetrics} from './public/explore-core.js';
const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
export function createActivityService({db,persist,student}){
 db.activities??={};
 function record(user,input){
  if(user.role!=='student')fail(403,'Chỉ học sinh được nộp kết quả khám phá.');
  if(!input||!/^([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$/.test(input.id||''))fail(400,'Mã kết quả không hợp lệ.');
  const rows=db.activities[user.id]||[],old=rows.find(a=>a.id===input.id);if(old)return old;
  if(rows.length>=5000)fail(400,'Đã đạt giới hạn 5.000 kết quả khám phá.');
  const grade=Number(db.states[user.id]?.profile?.grade||7),data=input.data||{};let title,result,correct=null,detail;
  const answer=()=>{if(typeof data.answer!=='string'||data.answer.length>100||!data.answer.trim())fail(400,'Nhập đáp án tối đa 100 ký tự.');return data.answer.trim();};
  const dimension=v=>typeof v==='number'&&Number.isFinite(v)&&v>=.1&&v<=100&&Math.abs(v*10-Math.round(v*10))<1e-7;
  if(input.type==='formula'){
   const f=formulaLibrary.find(f=>f.id===data.formulaId&&f.grades.includes(grade));if(!f)fail(400,'Công thức không thuộc khối hiện tại.');
   const response=answer();title='Tự kiểm tra: '+f.title;correct=checkAnswer(response,String(f.check[1]));result=`${f.check[0]} Đáp án đã nộp: ${response}.`;detail={formulaId:f.id,answer:response};
  }else if(input.type==='discovery'){
   let r;try{r=discoveryResult(data.labId,data.values);}catch(error){fail(400,error.message);}
   if(r.item.grade!==grade)fail(400,'Hoạt động không thuộc khối hiện tại.');
   const response=answer(),numeric=evaluate(response);if(!Number.isFinite(numeric))fail(400,'Đáp án phải là số hoặc phân số hợp lệ.');
   title='Khám phá: '+r.item.title;correct=Math.abs(numeric-r.value)<=.011;
   result=`${r.label}: ${r.value}. Dự đoán: ${response}.`;detail={labId:r.item.id,values:r.values,answer:response};
  }else if(input.type==='counter'){
   if(!['aw','ah','bw','bh'].every(k=>dimension(data[k])))fail(400,'Kích thước phải từ 0,1 đến 100, tối đa một chữ số thập phân.');
   detail=Object.fromEntries(['aw','ah','bw','bh'].map(k=>[k,data[k]]));const m=rectangleMetrics(detail);title='Khám phá phản ví dụ';correct=isCounterexample(detail);result=`Hình A: chu vi ${m.pa}, diện tích ${m.sa}. Hình B: chu vi ${m.pb}, diện tích ${m.sb}.`;
  }else if(input.type==='garden'){
   if(typeof data.a!=='number'||!Number.isFinite(data.a)||data.a<=0||data.a>=12)fail(400,'Cạnh vườn phải lớn hơn 0 và nhỏ hơn 12 m.');
   const m=gardenMetrics(data.a);title='Phương án khu vườn';detail={a:data.a};result=`Hai cạnh: ${m.a} m và ${m.b} m. Diện tích: ${m.area} m². Hàng rào: ${m.fence} m.`;
  }else if(input.type==='blackbox'){
   if(!Array.isArray(data.inputs)||data.inputs.length>200||new Set(data.inputs).size<2||data.inputs.some(x=>!Number.isInteger(x)||Math.abs(x)>100))fail(400,'Cần thử ít nhất hai đầu vào khác nhau, mỗi số trong khoảng -100 đến 100.');
   const response=answer();title='Khám phá hộp đen';detail={inputs:[...data.inputs],answer:response};correct=checkAnswer(response,'2x+3');result=`Giả thuyết: ${response}. Đã thử các đầu vào: ${data.inputs.join(', ')}.`;
  }else fail(400,'Loại hoạt động không hợp lệ.');
  if(input.explanation!==undefined&&(typeof input.explanation!=='string'||input.explanation.length>2000))fail(400,'Lời giải thích tối đa 2.000 ký tự.');
  const item={id:input.id,type:input.type,title,grade,time:Date.now(),result,correct,data:detail,explanation:input.explanation||'',notes:{}};
  db.activities[user.id]=[...rows,item];try{persist();}catch(error){db.activities[user.id]=rows;throw error;}return item;
 }
 function list(user,id){const target=student(user,id);return (db.activities[target]||[]).slice(-100).reverse();}
 function note(user,input){
  if(user.role!=='teacher')fail(403,'Chỉ giáo viên được nhận xét hoạt động.');const target=student(user,input.studentId),item=db.activities[target]?.find(a=>a.id===input.activityId);
  if(!item||typeof input.text!=='string'||!input.text.trim()||input.text.length>1500)fail(400,'Chọn hoạt động và nhập nhận xét tối đa 1.500 ký tự.');
  const previous=item.notes;item.notes={...previous,[user.id]:{name:user.name,text:input.text.trim(),time:Date.now()}};try{persist();}catch(error){item.notes=previous;throw error;}return {ok:true};
 }
 return {record,list,note};
}
