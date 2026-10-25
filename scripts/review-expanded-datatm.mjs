import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {expandedDecisions as previousExpanded,nativeDecisions as previousNative} from './expanded-datatm-decisions.mjs';
import {additionalExpandedDecisions,additionalNativeDecisions} from './grade89-datatm-decisions.mjs';
import {recoveredDecisions} from './recovered-datatm-decisions.mjs';
import {wmfDecisions} from './wmf-datatm-decisions.mjs';
const recoveryEvidence=new Map();
function rotateChoices(id,choices){
 if(!choices)return choices;
 const offset=createHash('sha256').update(id).digest()[0]%4;
 return [...choices.slice(offset),...choices.slice(0,offset)];
}
const expandedDecisions=[...previousExpanded,...additionalExpandedDecisions],nativeDecisions=[...previousNative,...additionalNativeDecisions];
const source=(await Promise.all([1,2].map(n=>readFile(`private/datatm-supplement/phase${n}-candidates.json`,'utf8').then(JSON.parse)))).flat();
const recoveredQueue=JSON.parse(await readFile('baocao/datatm-grade9-prompt-review-queue.json','utf8'));
for(const id of ['source-913d667ddcf590452e-25','source-0dccf8301583373c91-58']){
 const evidence=recoveredQueue.find(q=>q.id===id&&q.promptOnlyVerified),q=source.find(q=>q.id===id);
 if(!evidence||evidence.prompt!==q.prompt)throw Error('Incomplete table '+id);
 q.unsafe=false;
}
for(const d of recoveredDecisions){
 const verified=recoveredQueue.find(q=>q.id===d.id&&q.stemOnlyVerified);
 if(!verified)throw Error('Run extract-datatm-prompt-review.mjs --grade9; missing safe stem '+d.id);
 const q=source.find(q=>q.id===d.id);if(q.prompt!==verified.prompt)throw Error('Source text changed '+d.id);
 q.unsafe=false;
 let stem=verified.reviewStem.replace(/O10-2024-GV137|NH-2024-GV\d+/g,'').replace(/^\s*(?:Câu(?: hỏi)?|Bài)\s*\d+\s*[.:)]\s*/iu,'').replace(/^\s*(?:[<\[](?:NB|TH|VD|VDC)[>\]]|_(?:NB|TH|VD|VDC)_)\s*/iu,'').trim();
 stem=stem.replace(/\n\s*(?:PHẦN\s+[IVX]+|Dạng\s+\d|\*\s*Mức)[^]*$/iu,'');
 if(/^source-ab55d37ad8d4df3664-13[56]$/.test(d.id))stem+='\nXét mặt phẳng cắt qua phần trong của hình cầu.';
 if(d.id==='source-d4848f085dfd303de7-19')stem+='\nXét đa giác lồi, lấy một góc ngoài ở mỗi đỉnh theo cùng chiều quay.';
 if(d.id==='source-7c772c47507f4ac327-118')stem+='\nLấy không hoàn lại.';
 if(d.id==='source-747e400bf199fa9e79-58')stem+='\nCác lượt lăn không chồng lên nhau.';
 if(d.id==='source-86dfd5a3613259dec6-88')stem+='\nGiả sử giới tính các lần sinh độc lập.';
 if(/ngẫu nhiên|tung|gieo|chọn ra|xác suất/iu.test(stem))stem+='\nTrong mô hình này, các lựa chọn cơ bản là đồng khả năng; các lần tung, gieo độc lập và ghi theo thứ tự hoặc phân biệt từng vật.';
 const choices=d.choices||[d.answer,...['0','1','2','3','4','6','12'].filter(s=>s!==d.answer).slice(0,3)];
 expandedDecisions.push([d.id,d.topic,stem,d.answer,d.solution,rotateChoices(d.id,choices)]);
}
const wmfQueue=JSON.parse(await readFile('baocao/wmf-review-7f79e734bffc813a6e.json','utf8'));
for(const d of wmfDecisions){
 const evidence=wmfQueue.find(q=>q.id===d.id),q=source.find(q=>q.id===d.id);
 if(!evidence||!q||evidence.originalPrompt!==q.prompt||evidence.source.sha256!==q.source.sha256)throw Error('WMF source mismatch '+d.id);
 const stem=evidence.decodedPrompt.split(/\n\s*A\./)[0];
 if(/\[(?:WMF|OBJECT):/.test(stem))throw Error('Unresolved WMF stem '+d.id);
 q.unsafe=false;
 recoveryEvidence.set(d.id,{recoveredPrompt:evidence.decodedPrompt,recoveryMethod:'WMF ExtTextOut numeric text; manually transcribed stem; independently solved; source SHA256 verified.'});
 const n=Number(d.answer);
 const choices=Number.isFinite(n)?[d.answer,...[n+1,Math.max(0,n-1),n+2,n+3].map(String).filter((s,i,a)=>s!==d.answer&&a.indexOf(s)===i).slice(0,3)]:undefined;
 expandedDecisions.push([d.id,d.topic,d.prompt,d.answer,d.solution,rotateChoices(d.id,choices)]);
}
const bank=JSON.parse(await readFile('data/datatm-supplement-reviewed.json','utf8'));
const hashes=new Map();let added=0,updated=0;
const specs=[...expandedDecisions];
for(const [id,topic,label,solution] of nativeDecisions){
 const q=source.find(q=>q.id===id);if(!q)throw Error(id);
 let full=q.prompt.replace(/O10-2024-GV137|NH-2024-GV\d+/g,'').replace(/^\s*(?:[<\[](NB|TH|VD|VDC)[>\]]|_(?:NB|TH|VD|VDC)_)\s*/iu,'').replace(/ {2,}/g,' ').trim();
 full=full.replace(/\n\s*(?:CHƯƠNG\s+\d|[ab]\)\s*(?:Nhận biết|Thông hiểu)|\d\.\s*(?:THÔNG HIỂU|VẬN DỤNG))[^]*$/iu,'');
 full=full.replace(/\n\s*(?:B\.\s*ĐÁP ÁN|[IVX]+\s*[–−-]\s*MỨC ĐỘ|C\.\s*CÁC DẠNG)[^]*$/iu,'');
 const first=full.search(/\n\s*A\./);if(first<0)throw Error('Missing option A '+id);
 let tail=full.slice(first);
 for(const label of ['B','C','D'])if(!new RegExp('\\n\\s*'+label+'\\.').test(tail))tail=tail.replace(new RegExp('([^\\n])('+label+')\\.\\s*(?=\\S)'),'$1\n$2. ');
 full=full.slice(0,first)+tail;
 const options=[...full.matchAll(/(?:^|\n)\s*([ABCD])\.\s*([^]*?)(?=\n\s*[ABCD]\.\s*|$)/g)];
 if(options.length!==4||new Set(options.map(m=>m[1])).size!==4)throw Error('Missing choices '+id);
 const choices=options.sort((a,b)=>a[1].localeCompare(b[1])).map(m=>m[2].trim()).map(c=>id==='source-7a4fd210801c058a97-4'?c.replace(/^x\s*=/,'y ='):c);
 const start=full.search(/\n\s*A\./);
 let stem=full.slice(0,start).trim();
 if(id==='source-7bdb8a09628e77f97f-46')stem+='\nBa chữ số không xét thứ tự khi xác định tỉ lệ.';
 if(id==='source-7a4fd210801c058a97-33')stem=stem.replace('như sau','như nhau');
 if(/^source-7a4fd210801c058a97-(21|28)$/.test(id))stem+='\nXét cùng một lượng công việc; các công nhân có cùng năng suất không đổi.';
 if(id==='source-b8d88f25b0874a26f3-3')stem=stem.replace('những chữ số','những chữ');
 if(id==='source-b8d88f25b0874a26f3-13')stem=stem.replace('và chiều dài là 3','và chiều rộng là 3');
 if(id==='source-6621b4d37788b9d9b3-39')stem=stem.replace('Hỏi lúc mấy giờ lại có ba xe cùng rời bến một lần tiếp theo?','Sau bao nhiêu phút kể từ 5 giờ thì lại có ba xe cùng rời bến lần tiếp theo?');
 if(id==='source-0cf80e5f55d1dbca28-43')stem=stem.replace('tỉ lệ với 123','tỉ lệ với 1 : 2 : 3');
 if(/^source-7bdb8a09628e77f97f-(14|15)$/.test(id))stem+='\nCác máy hoạt động cùng thời gian và cùng chế độ.';
 if(/^source-7bdb8a09628e77f97f-(31|33|39)$/.test(id))stem+='\nTiền thưởng được chia tỉ lệ thuận với năng suất lao động.';
 stem+='\nChọn phương án đầy đủ và cụ thể nhất.';
 specs.push([id,topic,stem,choices['ABCD'.indexOf(label)],solution,choices]);
}
if(new Set(specs.map(q=>q[0])).size!==specs.length)throw Error('Duplicate decisions');
for(const [id,topic,prompt,answer,solution,choices] of specs){
 const q=source.find(q=>q.id===id);if(!q||q.unsafe)throw Error('Incomplete source '+id);
 if(!hashes.has(q.source.file))hashes.set(q.source.file,createHash('sha256').update(await readFile(q.source.file)).digest('hex'));
 if(hashes.get(q.source.file)!==q.source.sha256)throw Error('Source changed '+id);
 const fullId='supplement-'+id,existing=bank.questions.findIndex(q=>q.id===fullId);
 if(existing>=0&&bank.questions[existing].review?.method!=='Đọc đủ đề văn bản Word; giải độc lập; kiểm tra lựa chọn; đối chiếu SHA256 file nguồn.')continue;
 if(choices&&(choices.length!==4||new Set(choices).size!==4||!choices.includes(answer)))throw Error('Invalid choices '+id);
 const correctIndex=choices?.indexOf(answer);
 const record={id:fullId,grade:q.grade,topic,tags:[topic],level:'Cơ bản',prompt,answer,unit:'',solution,formats:choices?['mcq','essay']:['essay'],...(choices?{choices,correctIndex}:{}),rubric:[{id:'reason',points:7,description:solution},{id:'result',points:3,description:answer}],source:{...q.source,file:path.basename(q.source.file),originalPrompt:q.prompt,originalAnswer:q.sourceSolution||'Nguồn không có lời giải; đã giải độc lập.',adaptation:'Biên tập câu dẫn và bổ sung điều kiện để loại mơ hồ; giữ đề nguồn để đối chiếu.'},review:{status:'verified',method:'Đọc đủ đề văn bản Word; giải độc lập; kiểm tra lựa chọn; đối chiếu SHA256 file nguồn.'}};
 if(recoveryEvidence.has(id))Object.assign(record.source,recoveryEvidence.get(id));
 if(existing>=0){bank.questions[existing]=record;updated++;}else{bank.questions.push(record);added++;}
}
await writeFile('data/datatm-supplement-reviewed.json',JSON.stringify(bank,null,2)+'\n');
await writeFile('baocao/datatm-expanded-review.json',JSON.stringify({reviewed:specs.length,sourceFilesChecked:hashes.size,decisions:specs.map(([id,topic,prompt,answer,solution])=>({id,status:'verified',topic,prompt,answer,solution}))},null,2)+'\n');
console.log(JSON.stringify({reviewed:specs.length,added,updated,sourceFilesChecked:hashes.size}));
