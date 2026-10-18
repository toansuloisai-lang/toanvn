import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {evaluate} from '../public/data.js';
const banks=await Promise.all(['datatm-bank','datatm-arithmetic-reviewed','datatm-manual-reviewed'].map(async name=>JSON.parse(await readFile(`data/${name}.json`,'utf8'))));
const checked=new Map(),ids=new Set(),prompts=new Set(),sources=new Set(),questions=[],duplicates=[];
const promptKey=q=>q.grade+':'+q.prompt.normalize('NFKC').toLocaleLowerCase('vi').replace(/[\s\p{P}]+/gu,'');
for(const q of banks.flatMap(bank=>bank.questions)){
 if(q.review?.status!=='verified')continue;
 if(!checked.has(q.source.file))checked.set(q.source.file,createHash('sha256').update(await readFile(q.source.file)).digest('hex'));
 if(checked.get(q.source.file)!==q.source.sha256)throw Error('Source hash changed; review again: '+q.source.file);
 const sourceKey=q.source.file+':'+(q.source.ordinal??q.source.question),key=promptKey(q);
 if(ids.has(q.id)||sources.has(sourceKey)||prompts.has(key)){duplicates.push(q.id);continue;}
 ids.add(q.id);sources.add(sourceKey);prompts.add(key);
 const value=evaluate(q.answer),formats=q.formats??(Number.isFinite(value)?['mcq','essay']:['essay']);
 let choices=q.choices,correctIndex=q.correctIndex;
 if(formats.includes('mcq')&&!choices){
  if(!Number.isFinite(value))throw Error('MCQ needs explicit choices: '+q.id);
  const probability=/xác suất/i.test(q.prompt)&&!/(phần tử|kết quả|bao nhiêu|mấy)/i.test(q.prompt),distractors=[];
  const pool=probability?['0','1','1/2','1/3','2/3','1/4','3/4','1/6','5/6']:[value+1,value-1,value*2,value/2,value+2,value-2,value+3];
  for(const candidate of pool){const v=evaluate(String(candidate));if(Number.isFinite(v)&&Math.abs(v-value)>1e-9&&(!probability||v>=0&&v<=1)&&!(value>=0&&v<0)&&!distractors.some(c=>Math.abs(evaluate(c)-v)<1e-9))distractors.push(typeof candidate==='string'?candidate:String(Number(v.toFixed(8))));}
  choices=distractors.slice(0,3);if(choices.length!==3)throw Error('Need 3 distractors: '+q.id);
  correctIndex=questions.length%4;choices.splice(correctIndex,0,q.answer);
 }
 if(!q.prompt||!q.answer||!q.solution)throw Error('Incomplete reviewed question: '+q.id);
 questions.push({...q,level:'Cơ bản',formats,...(choices?{choices,correctIndex}:{}),rubric:[{id:'method',points:7,description:'Lập luận và các bước phù hợp với lời giải tham khảo: '+q.solution},{id:'result',points:3,description:'Kết luận đúng: '+q.answer+(q.unit?' '+q.unit:'')+'. Chấp nhận cách giải đúng tương đương.'}],adaptation:q.adaptation??(q.choices?'Giữ bốn lựa chọn DATATM; bổ sung lời giải kiểm chứng độc lập.':formats.includes('mcq')?'Bổ sung các lựa chọn số do ứng dụng biên soạn từ câu DATATM; giáo viên duyệt trước khi giao.':'Dùng câu DATATM ở dạng tự luận; học sinh nộp ảnh bài làm, giáo viên duyệt và chốt điểm.')});
}
await writeFile('data/question-library.json',JSON.stringify({version:2,target:240,uniqueQuestions:questions.length,questions},null,2)+'\n');
console.log(JSON.stringify({uniqueQuestions:questions.length,target:240,remaining:Math.max(0,240-questions.length),duplicatesRemoved:duplicates.length,byGrade:[6,7,8,9].map(grade=>({grade,count:questions.filter(q=>q.grade===grade).length,mcq:questions.filter(q=>q.grade===grade&&q.formats.includes('mcq')).length,essay:questions.filter(q=>q.grade===grade&&q.formats.includes('essay')).length}))}));
