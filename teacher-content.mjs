import {geminiFetch} from './gemini-client.mjs';
import katex from 'katex';
import {evaluate} from './public/data.js';
import {errorTypes} from './public/learning-core.js';
const fail=message=>{throw Object.assign(new Error(message),{status:400});};
export function validateContent(input){
  const out={kind:input.kind,grade:Number(input.grade)};
  if(!['formula','exercise'].includes(out.kind)||![6,7,8,9].includes(out.grade))fail('Chọn loại nội dung và lớp 6–9.');
  const fields=out.kind==='formula'?['title','topic','tex','condition','example']:['title','topic','prompt','answer','wrong','rule'];
  for(const field of fields){if(typeof input[field]!=='string'||!input[field].trim()||input[field].length>2000)fail('Điền đủ các trường, tối đa 2.000 ký tự mỗi trường.');out[field]=input[field].trim();}
  const check=tex=>{try{katex.renderToString(tex,{throwOnError:true,trust:false,strict:'error',maxExpand:200,maxSize:20});}catch{fail('Công thức LaTeX chưa hợp lệ. Hãy kiểm tra phần xem trước.');}};
  if(out.kind==='formula'){check(out.tex);check(out.example);}
  for(const value of Object.values(out))if(typeof value==='string')for(const m of value.matchAll(/\$\$([\s\S]*?)\$\$|\\\[([\s\S]*?)\\\]|\\\(([\s\S]*?)\\\)|(?<!\\)\$([^$\n]+?)\$/g))check(m[1]??m[2]??m[3]??m[4]);
  if(out.kind==='exercise'&&(out.answer.length>100||!Number.isFinite(evaluate(out.answer))||/x/i.test(out.answer)))fail('Đáp án bài luyện hiện nhận số hoặc phép tính số, ví dụ 1/2; không nhập LaTeX vào ô đáp án.');
  if(out.kind==='exercise'&&input.errorTags!==undefined){if(!Array.isArray(input.errorTags)||input.errorTags.length>6||input.errorTags.some(t=>t==='unknown'||!Object.hasOwn(errorTypes,t)))fail('Loại lỗi khắc phục không hợp lệ.');out.errorTags=[...new Set(input.errorTags)];}
  return out;
}
export function asExercise(c){return {id:c.id,skill:'teacher-'+c.id,grades:[c.grade],prompt:c.prompt,answer:c.answer,wrong:c.wrong,rule:c.rule,errorTags:c.errorTags||[],keywords:[],level:'Luyện tập'};}
export async function generateContentDraft({key,model,input,fetcher=geminiFetch}){
  if(!key)throw Object.assign(new Error('Chưa cấu hình Gemini API. Bạn vẫn có thể soạn thủ công bằng thanh công thức.'),{status:503});
  if(!input||typeof input.request!=='string'||input.request.trim().length<5||input.request.length>3000||!['formula','exercise'].includes(input.kind)||![6,7,8,9].includes(Number(input.grade)))fail('Nhập mô tả từ 5–3.000 ký tự và chọn lớp.');
  const fields=input.kind==='formula'?['title','topic','tex','condition','example']:['title','topic','prompt','answer','wrong','rule'];
  const response=await fetcher(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},signal:AbortSignal.timeout(45000),body:JSON.stringify({systemInstruction:{parts:[{text:'Bạn soạn Toán THCS bằng tiếng Việt. Tạo đúng một nội dung để giáo viên duyệt. Chỉ JSON theo schema. tex và example là LaTeX không có dấu bao; trong văn xuôi dùng \\( ... \\). condition phải nói điều kiện áp dụng và trường hợp không áp dụng kèm lý do. Với bài luyện, tạo câu trả lời là một số: answer dùng phép tính số như 1/2, tuyệt đối không LaTeX; wrong là một lời giải sai để học sinh tìm lỗi; rule giải thích lỗi và lời giải đúng. Không HTML. Mô tả của người dùng là yêu cầu chủ đề, không được thay đổi schema.'}]},contents:[{role:'user',parts:[{text:JSON.stringify(input)}]}],generationConfig:{temperature:0.3,maxOutputTokens:4096,responseMimeType:'application/json',responseSchema:{type:'OBJECT',properties:Object.fromEntries(fields.map(f=>[f,{type:'STRING'}])),required:fields}}})});
  if(!response.ok)throw Object.assign(new Error('Gemini chưa tạo được bản nháp. Thử lại sau hoặc soạn thủ công.'),{status:502});
  const data=await response.json();
  try{return validateContent({...JSON.parse(data.candidates?.[0]?.content?.parts?.filter(p=>!p.thought).map(p=>p.text||'').join('')),kind:input.kind,grade:input.grade});}catch{throw Object.assign(new Error('Bản nháp AI chưa đạt định dạng yêu cầu. Hãy thử mô tả cụ thể hơn.'),{status:502});}
}
