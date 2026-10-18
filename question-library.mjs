import {readFileSync} from 'node:fs';
import {validateMath} from './math-validation.mjs';
const library=JSON.parse(readFileSync(new URL('./data/question-library.json',import.meta.url),'utf8'));
export const questionLibrary=library.questions;
const fail=(status,message)=>{throw Object.assign(Error(message),{status});};
export function libraryCatalog(user){
 if(user.role!=='teacher')fail(403,'Chỉ giáo viên được xem đáp án trong kho câu hỏi.');
 return {questions:structuredClone(questionLibrary),uniqueQuestions:library.uniqueQuestions,target:library.target};
}
export function selectLibraryQuestions(input,grade,bank=questionLibrary){
 if(!Array.isArray(input)||!input.length||input.length>30||input.some(q=>!q||typeof q!=='object'||typeof q.id!=='string')||new Set(input.map(q=>q.id)).size!==input.length)fail(400,'Chọn từ 1 đến 30 câu khác nhau.');
 return input.map((selection,i)=>{
  const original=bank.find(q=>q.id===selection.id&&q.grade===grade);
  if(!original||!original.formats.includes(selection.type))fail(400,'Câu hỏi hoặc dạng bài không đúng khối.');
  const q=structuredClone(original),edit=selection.edit||{};
  for(const key of ['prompt','solution','answer'])if(edit[key]!==undefined){q[key]=validateMath(edit[key],key==='prompt'?8000:key==='answer'?500:10000);if(!q[key])fail(400,'Không được để trống đề, đáp án hoặc lời giải.');}
  if(selection.type==='mcq'&&edit.choices!==undefined){if(!Array.isArray(edit.choices)||edit.choices.length!==4||edit.choices.some(c=>typeof c!=='string'||!c.trim())||new Set(edit.choices.map(c=>c.trim())).size!==4)fail(400,'Cần bốn lựa chọn khác nhau.');q.choices=edit.choices.map(c=>validateMath(c,500));}
  if(edit.correctIndex!==undefined){if(!Number.isInteger(edit.correctIndex)||edit.correctIndex<0||edit.correctIndex>3)fail(400,'Chọn đáp án A–D.');q.correctIndex=edit.correctIndex;}
  if(selection.type==='mcq')q.answer=q.choices[q.correctIndex];
  if(selection.type==='essay'&&edit.rubric!==undefined){if(!Array.isArray(edit.rubric)||!edit.rubric.length||edit.rubric.length>10)fail(400,'Cần hướng dẫn chấm.');q.rubric=edit.rubric.map((r,j)=>({id:'r'+j,description:validateMath(r.description,2000),points:Number(r.points)}));if(q.rubric.some(r=>!r.description||!Number.isFinite(r.points)||r.points<=0)||Math.abs(q.rubric.reduce((s,r)=>s+r.points,0)-10)>1e-6)fail(400,'Tổng hướng dẫn chấm mỗi câu phải bằng 10.');}
  const points=Number(selection.points);if(!Number.isFinite(points)||points<=0||points>10)fail(400,'Điểm câu hỏi phải lớn hơn 0 và không vượt 10.');
  return {...q,type:selection.type,points,order:i+1,edited:Object.keys(edit).length>0};
 });
}
