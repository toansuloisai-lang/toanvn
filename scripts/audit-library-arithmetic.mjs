import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {plainToTex} from '../public/math.js';
import {parseExact,solveExact,canonical,equal,tex} from './library-exact-math.mjs';
const candidates=JSON.parse(await readFile('private/datatm-bank/candidates.json','utf8')),base=JSON.parse(await readFile('data/datatm-bank.json','utf8')).questions,questions=[],rejected=[];
const fold=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/đ/g,'d');
const used=new Set(base.map(q=>q.source.file+':'+q.source.question));
const topics={6:{14:'Cộng và trừ số nguyên',15:'Quy tắc dấu ngoặc',16:'Nhân số nguyên',17:'Chia số nguyên',25:'Cộng trừ phân số',26:'Nhân chia phân số',28:'Số thập phân',29:'Tính toán với số thập phân',4:'Cộng trừ số tự nhiên',5:'Nhân chia số tự nhiên',6:'Lũy thừa',7:'Thứ tự thực hiện phép tính'},7:{1:'Số hữu tỉ',2:'Các phép tính số hữu tỉ',3:'Lũy thừa số hữu tỉ',4:'Quy tắc chuyển vế'},8:{4:'Phép nhân đa thức',6:'Hằng đẳng thức'}};
for(const r of candidates){
 if(r.unsafe||!r.answer||used.has(r.source+':'+r.number))continue;
 const number=Number(r.source.match(/bai_(\d+)_/)?.[1]),topic=topics[r.grade]?.[number];if(!topic)continue;
 let prompt=r.prompt.trim(),expression,solution,value,kind;
 try{
  const start=prompt.match(/^(?:Tính|Thực hiện phép tính|Sử dụng quy tắc dấu ngoặc tính)\s*(?:(?:nhanh|nhẩm|giá trị|của|biểu thức|tổng|tích|các tổng sau|một cách hợp lí)\s*)*/i);
  if(start){expression=prompt.slice(start[0].length).replace(/^[\s:]+|[\s.;?]+$/g,'');if(/[a-zđ]/i.test(expression))continue;if(/\d\.\d/.test(expression))continue;const parsed=parseExact(expression);value=parsed.value;kind='arithmetic';solution='Thực hiện trong ngoặc trước; lũy thừa trước nhân chia, rồi cộng trừ.\n'+parsed.trace.map((step,i)=>`Bước ${i+1}: \\(${step}\\).`).join('\n')+`\nVậy \\(${plainToTex(parsed.expression)}=${tex(value)}\\).`;}
  else{
   const m=prompt.match(/^Tìm\s+(?:số nguyên\s+)?([xy])\s*[,.:]?\s*(?:biết\s*[:]?\s*)?([\s\S]+)$/i);if(!m)continue;expression=m[2].replace(/[.;?]+$/,'').replaceAll(m[1],'x');if(expression.split('=').length!==2)continue;const [left,right]=expression.split('=');const solved=solveExact(left,right);value=solved.value;kind='linear-equation';solution=`Chuyển các số hạng chứa ${m[1]} về một vế, các hằng số về vế còn lại; rút gọn được \\(${tex(solved.coefficient)}${m[1]}=${tex(solved.constant)}\\).\nChia hai vế cho \\(${tex(solved.coefficient)}\\), được \\(${m[1]}=${tex(value)}\\).\nThay giá trị vừa tìm vào phương trình ban đầu, hai vế bằng nhau.`;
  }
  const expected=r.answer.split('=').at(-1).trim().replace(/[.;]+$/,'');const sourceValue=parseExact(expected).value;if(!equal(value,sourceValue)){rejected.push({source:r.source,question:r.number,prompt:r.prompt,originalAnswer:r.answer,recomputed:canonical(value),reason:'Đáp án nguồn không khớp phép tính độc lập'});continue;}
  const id='datatm-'+createHash('sha256').update(r.source+':'+r.number).digest('hex').slice(0,20);used.add(r.source+':'+r.number);
  questions.push({id,grade:r.grade,topic,tags:[topic],level:1,prompt,answer:canonical(value),unit:'',solution,source:{file:r.source,sha256:r.sha256,question:r.number,originalAnswer:r.answer},review:{status:'verified',method:'Tính độc lập bằng số hữu tỉ chính xác; đối chiếu đáp án nguồn',audit:{kind,expression,recomputed:canonical(value)}}});
 }catch{/* Unsupported/ambiguous extraction remains outside the ready bank. */}
}
await writeFile('data/datatm-arithmetic-reviewed.json',JSON.stringify({version:1,questions},null,2)+'\n');await writeFile('private/datatm-bank/arithmetic-review-rejected.json',JSON.stringify(rejected,null,2)+'\n');
console.log(JSON.stringify({verified:questions.length,rejectedMismatch:rejected.length,byGrade:[6,7,8,9].map(grade=>({grade,count:questions.filter(q=>q.grade===grade).length}))}));
