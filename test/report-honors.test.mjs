import test from 'node:test';
import assert from 'node:assert/strict';
import {studentReportSnapshot,reportPdf} from '../parent-report.mjs';
import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs';
test('PDF snapshots own class rank including outside top ten, without exposing classmates',async()=>{
 const child={id:'s',role:'student',name:'Học sinh An'},teacher={id:'t',name:'Giáo viên'};
 const db={users:[child],states:{s:{profile:{grade:8},attempts:[]}},classes:[{id:'c',name:'8A4',teacherId:'t',studentIds:['s',...Array.from({length:19},(_,i)=>'other'+i)]}]};
 let rank=12;
 const learning={report:()=>({grade:8,assignments:[]}),knowledge:{report:()=>null,leaderboard:()=>({yourResult:rank?{rank,corrected:3}:null,top:rank===1?[{studentId:'s'}]:[{studentId:'other0',name:'PRIVATE CLASSMATE'}]})}};
 const snapshot=studentReportSnapshot({db,learning,teacher,studentId:'s'});
 assert.deepEqual(snapshot.achievements[0],{classId:'c',className:'8A4',classSize:20,rank:12,corrected:3,honored:false});
 rank=1;assert.equal(snapshot.achievements[0].rank,12);
 const honored=studentReportSnapshot({db,learning,teacher,studentId:'s'});assert.equal(honored.achievements[0].honored,true);
 rank=null;const empty=studentReportSnapshot({db,learning,teacher,studentId:'s'});assert.equal(empty.achievements[0].rank,null);
 for(const [report,expected] of [[snapshot,'Con đứng hạng 12'],[honored,'Chúc mừng con'],[empty,'Chưa được xếp hạng']]){
  const bytes=await reportPdf({id:'check',createdAt:Date.now(),teacher,reports:[report]});
  const task=getDocument({data:new Uint8Array(bytes)}),pdf=await task.promise;let text='';
  for(let i=1;i<=pdf.numPages;i++)text+=(await(await pdf.getPage(i)).getTextContent()).items.map(x=>x.str).join(' ');
  assert.ok(text.includes(expected));assert.ok(!text.includes('PRIVATE CLASSMATE'));await task.destroy();
 }
});
