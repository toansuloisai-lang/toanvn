import {createStore} from './auth-store.mjs';
import {randomBytes} from 'node:crypto';
const fail=(status,message)=>{throw Object.assign(Error(message),{status});};
// Anonymous work is deliberately isolated from the live student database.
// This bounded memory store survives navigation, but not a server restart.
export function createGuestSessions({now=Date.now}={}){
 const sessions=new Map(),ips=new Map();let bytesUsed=0;
 function prune(){for(const [token,s] of sessions)if(s.expires<=now()){bytesUsed-=s.bytes;sessions.delete(token);}for(const [ip,r] of ips)if(r.expires<=now())ips.delete(ip);}
 function start(ip,grade){
  prune();if(![6,7,8,9].includes(grade))fail(400,'Chọn khối 6–9.');
  if(sessions.size>=100)fail(503,'Lượt học thử đang đông. Hãy thử lại sau.');
  const rate=ips.get(ip)||{starts:0,ai:0,expires:now()+86400000};if(rate.starts>=20)fail(429,'Đã tạo nhiều lượt học thử hôm nay. Hãy tiếp tục lượt hiện có.');rate.starts++;ips.set(ip,rate);
  let payload={users:[],states:{}},record;const files=new Map();
  const storage={load:()=>structuredClone(payload),save(value){const serialized=JSON.stringify(value);if(serialized.length>2*1024*1024)fail(413,'Lượt học thử đã đầy. Liên hệ admin để tham gia lớp.');payload=JSON.parse(serialized);},stageFile(key,bytes){if(files.has(key))return;if(bytesUsed+bytes.length>80*1024*1024||(record?.bytes||0)+bytes.length>8*1024*1024)fail(413,'Bộ nhớ ảnh học thử đã đầy. Liên hệ admin để lưu bài lâu dài.');files.set(key,Buffer.from(bytes));bytesUsed+=bytes.length;if(record)record.bytes+=bytes.length;},readFile:key=>{if(!files.has(key))fail(404,'Không tìm thấy ảnh.');return files.get(key);},checkHealth(){},close(){}};
  const store=createStore(undefined,{storage}),password=randomBytes(24).toString('hex');
  const student=store.createUser({username:'guest.'+randomBytes(10).toString('hex'),password,role:'student',name:'Học sinh tự do'});
  store.saveStudent(student,{attempts:[],reviews:{},profile:{name:student.name,grade:String(grade)}});
  store.virtualTeacher.enroll({role:'admin'},{studentId:student.id,grade});store.virtualTeacher.schedule();
  const login=store.login(student.username,password,ip);record={store,expires:now()+2*3600000,bytes:0,ip};sessions.set(login.token,record);
  return {token:login.token,user:{...login.user,guest:true}};
 }
 function get(token){prune();return sessions.get(token)?.store;}
 function remove(token){const s=sessions.get(token);if(s){bytesUsed-=s.bytes;sessions.delete(token);}}
 function allowAI(token){const s=sessions.get(token);if(!s)return;const r=ips.get(s.ip);if(!r||r.ai>=30)fail(429,'Đã hết 30 lượt AI học thử hôm nay. Em vẫn có thể xem bài và tự luyện tập.');r.ai++;}
 return {start,get,remove,allowAI};
}
