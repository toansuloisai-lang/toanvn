import test from 'node:test';
import assert from 'node:assert/strict';
import {parentMailHtml} from '../parent-mail-html.mjs';
import {reportMetrics} from '../school-brand.mjs';
import {reportPdf} from '../parent-report.mjs';
import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs';
test('school HTML and compact PDF use exam totals, highlight trial data, group mistakes and keep grades',async()=>{
 const report={student:{name:'Học sinh <script>',grade:8},classes:['8A4'],summary:{exercises:0,correct:0,wrong:0},usage:null,assignments:[],knowledge:{history:Array.from({length:5},(_,i)=>({kind:'exam',title:'Đề 0'+(i+1),score:7,elapsedMs:60000,questions:Array.from({length:10},(_,j)=>({correct:j<7}))})),skills:[{name:'Đơn thức',correct:0,total:5}],mistakes:Array.from({length:5},(_,i)=>({topic:'Bậc đơn thức',examId:'e'+i,prompt:'Tính \\(2+2\\).',solution:'\\(2+2=4\\).',knowledge:'Phép cộng',nextStep:'Tính lại',resolved:false})),pending:[]}};
 assert.equal(reportMetrics(report).done,5);assert.equal(reportMetrics(report).correct,35);
 report.knowledge.mistakes.forEach((m,i)=>Object.assign(m,{kind:'exam',title:'Quiz '+i,questionIndex:i,choices:['Wrong '+i,'Right '+i],originalAnswer:0,correctIndex:1,analysis:'Check '+i,resolved:i===0}));
 const html=parentMailHtml({text:'Kính gửi phụ huynh,\n<script>alert(1)</script>',message:'kiểm tra hệ thống <script>alert(1)</script>',reports:[report],createdAt:Date.now()});
 assert.match(html,/Kính gửi phụ huynh/);assert.doesNotMatch(html,/<table|<img|cid:|<script>/);assert.match(html,/&lt;script&gt;/);
 const bytes=await reportPdf({id:'test',createdAt:Date.now(),teacher:{name:'Giáo viên'},teacherComment:'Kiểm tra hệ thống',reports:[report]});
 const task=getDocument({data:new Uint8Array(bytes)}),pdf=await task.promise;assert.ok(pdf.numPages>=4&&pdf.numPages<=8);
 let text='';for(let i=1;i<=pdf.numPages;i++)text+=(await(await pdf.getPage(i)).getTextContent()).items.map(x=>x.str).join(' ');
 assert.match(text,/KHÔNG PHẢN ÁNH NĂNG LỰC/);assert.match(text,/5 câu sai ban đầu/);assert.match(text,/Đã sửa đúng/);assert.match(text,/7.0\/10/);
 for(let i=0;i<5;i++){assert.ok(text.includes('Wrong '+i));assert.ok(text.includes('Right '+i));assert.ok(text.includes('Check '+i));}await task.destroy();
});
