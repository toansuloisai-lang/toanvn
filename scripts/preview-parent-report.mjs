// Fictitious data only. This script writes a preview PDF and PNGs, never email.
import {mkdir,writeFile} from 'node:fs/promises';
import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs';
import {createCanvas} from '@napi-rs/canvas';
import {reportPdf} from '../parent-report.mjs';
const time=Date.parse('2026-10-08T09:00:00+07:00');
const report={
  student:{id:'MINH-HOA',name:'Học sinh minh họa (dữ liệu giả)',grade:7},classes:['7A — lớp minh họa'],
  summary:{exercises:2,attempts:2,completed:1,correct:1,wrong:1,corrected:1},
  usage:{startedAt:time-86400000,totalMs:1530000,days:{'2026-10-07':900000,'2026-10-08':630000}},
  assignments:[{title:'Luyện tập số âm và quy tắc dấu',created:time-86400000,due:'2026-10-10',result:{score:5,total:2,answered:2,correct:1,complete:true}}],
  errors:[{label:'Quy tắc dấu',count:1,confirmed:1,pending:0}],skills:[{name:'Số âm và dấu',attempts:2,correct:1,status:'Chưa đủ dữ liệu'}],
  attempts:[{id:'a1',time:time-600000,completed:time-300000,mode:'practice',prompt:'Tính −3 + 7.',skill:'Số âm và dấu',answer:'−10',initialCorrect:false,working:'Em cộng 3 + 7 = 10 rồi giữ dấu âm nên được −10.',correction:'4',revisedWorking:'Hai số khác dấu: lấy 7 − 3 = 4. Giữ dấu của số có giá trị tuyệt đối lớn hơn nên kết quả là 4.',corrected:true,explanation:'Em đã nhầm quy tắc cộng cùng dấu với cộng khác dấu.',rule:'Khác dấu: lấy giá trị tuyệt đối lớn trừ nhỏ, giữ dấu của số có giá trị tuyệt đối lớn.',note:'Con đã tự sửa và giải thích được quy tắc. Cần luyện thêm để kiểm chứng.',diagnosis:{type:'sign',status:'confirmed',source:'teacher',reviewer:'Giáo viên minh họa',updatedAt:time-200000,evidence:'Em cộng 3 + 7 = 10 rồi giữ dấu âm',reason:'Áp dụng nhầm quy tắc cộng hai số cùng dấu cho hai số khác dấu.',nextStep:'Xác định dấu của từng số, so sánh giá trị tuyệt đối rồi mới tính.'}},{id:'a2',time:time-100000,completed:null,mode:'transfer',prompt:'Tính −4 × (−3).',skill:'Số âm và dấu',answer:'12',initialCorrect:true,working:'Tích hai số âm là số dương: 4 × 3 = 12.',correction:'',revisedWorking:'',corrected:false,explanation:'',note:''}],
  comparisons:[{attemptId:'a1',after:{correct:true,time:time-100000},recurrences:0}],
  activities:[{time:time-800000,title:'Tự kiểm tra công thức',result:'Trả lời đúng câu hỏi về diện tích hình chữ nhật.',explanation:'Diện tích bằng chiều dài nhân chiều rộng.',notes:[]}]
};
await mkdir('artifacts',{recursive:true});
const content=await reportPdf({id:'BAO-CAO-MINH-HOA',createdAt:time,teacher:{name:'Giáo viên minh họa'},teacherComment:'Con cần phân biệt quy tắc cộng với quy tắc nhân số âm. Gia đình hỗ trợ con luyện 2 bài mỗi ngày và yêu cầu giải thích từng bước.',reports:[report],approval:{teacherId:'TAI-KHOAN-MINH-HOA',name:'Giáo viên minh họa',time}});
await writeFile('artifacts/bao-cao-phu-huynh-minh-hoa.pdf',content);
const task=getDocument({data:new Uint8Array(content)}),pdf=await task.promise;
for(let i=1;i<=pdf.numPages;i++){
  const page=await pdf.getPage(i),viewport=page.getViewport({scale:1.4}),canvas=createCanvas(Math.ceil(viewport.width),Math.ceil(viewport.height));
  await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;
  await writeFile(`artifacts/bao-cao-minh-hoa-trang-${i}.png`,canvas.toBuffer('image/png'));
}
await task.destroy();console.log(`Created fictitious preview PDF (${pdf.numPages} pages) and PNG previews in artifacts/. No email sent.`);
