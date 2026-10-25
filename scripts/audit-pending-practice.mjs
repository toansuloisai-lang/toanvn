// Initial screening of every pending row; only exact independent calculations
// can be promoted automatically. Unsupported rows retain pending status.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {parseExact,solveExact,canonical,tex} from './library-exact-math.mjs';
const read=async p=>JSON.parse(await readFile(p,'utf8'));
const pending=await read('data/datatm-screened-pending.json');
const supplement=await read('data/datatm-supplement-reviewed.json');
const decisions=[],added=[];
for(const q of pending.questions){
 let reason='needs_independent_math_review',expression,value,solution;
 if(/Chưa có đáp án\/lời giải nguồn/.test(q.sourceSolution))reason='missing_source_solution';
 if(/hình (bên|vẽ|dưới|sau)|biểu đồ|bảng (sau|trên|dưới)/iu.test(q.prompt))reason='needs_source_visual_review';
 try{
  // Restrict to a single, entirely preserved arithmetic expression or equation.
  const arithmetic=q.prompt.match(/^(?:Tính|Thực hiện phép tính)\s*:?\s*([\d\s,.:;+*/^()−–×÷{}\[\]-]+)[.?]?$/iu);
  const equation=q.prompt.match(/^Tìm\s+x\s*[,.:]?\s*(?:biết\s*:?\s*)?([\d\sx,.:;+*/^()=−–×÷{}\[\]-]+)[.?]?$/iu);
  if(arithmetic){
   expression=arithmetic[1].replace(/[.;?]+$/,'');
   if(/\d\.\d|;|\n/.test(expression))throw Error('ambiguous expression');
   const result=parseExact(expression);value=result.value;
   solution=result.trace.map(t=>'\\('+t+'\\)').join('\n')+'\nKết quả: \\('+tex(value)+'\\).';
  }else if(equation){
   expression=equation[1].replace(/[.;?]+$/,'');
   if(/\d\.\d|;|\n/.test(expression))throw Error('ambiguous equation');
   const sides=expression.split('=');if(sides.length!==2)throw Error('ambiguous equation');
   const result=solveExact(...sides);value=result.value;
   solution='Thu gọn phương trình được \\('+tex(result.coefficient)+'x='+tex(result.constant)+'\\). Suy ra \\(x='+tex(value)+'\\).';
  }
  if(value){
   const answer=canonical(value);
   const topic=arithmetic?'Tính giá trị biểu thức':'Phương trình bậc nhất';
   added.push({id:'supplement-'+q.id,grade:q.grade,topic,tags:[topic],level:'Cơ bản',prompt:q.prompt,answer,unit:'',solution,formats:['essay'],rubric:[{id:'method',points:7,description:solution},{id:'answer',points:3,description:'Kết quả: '+answer}],source:{...q.source,originalAnswer:q.sourceSolution},review:{status:'verified',method:'Tính độc lập bằng phân số BigInt từ toàn bộ biểu thức nguyên vẹn',audit:{expression,result:answer}}});
   decisions.push({id:q.id,status:'verified',expression,answer});continue;
  }
 }catch{reason='ambiguous_or_unsupported_expression';}
 decisions.push({id:q.id,status:'pending',reason});
}
const ids=new Set(supplement.questions.map(q=>q.id));
const additions=added.filter(q=>!ids.has(q.id));
if(additions.length){supplement.questions.push(...additions);await writeFile('data/datatm-supplement-reviewed.json',JSON.stringify(supplement,null,2)+'\n');}
const counts=decisions.reduce((o,d)=>{const key=d.status==='verified'?'verified':d.reason;o[key]=(o[key]||0)+1;return o;},{});
await mkdir('baocao',{recursive:true});
await writeFile('baocao/datatm-practice-review.json',JSON.stringify({scope:'Initial screening of all pending questions; pending is not mathematical approval.',total:decisions.length,counts,decisions},null,2)+'\n');
console.log(JSON.stringify({total:decisions.length,added:additions.length,counts}));
