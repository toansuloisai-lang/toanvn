import fs from 'node:fs/promises';
const root='private/datatm-supplement';
const docs=JSON.parse(await fs.readFile(`${root}/phase2-documents.json`,'utf8'));
const extra=JSON.parse(await fs.readFile(`${root}/phase2-converted-documents.json`,'utf8'));
for(const d of docs){
 if(/(?:^|[\\/])~\$/.test(d.originalPath||d.source)||/_~\$/.test(d.source)){d.status='excluded_office_lock_file';delete d.error;}
 if(extra.some(x=>x.originalSource===d.source)){d.status='converted_source';d.convertedDocuments=extra.filter(x=>x.originalSource===d.source).map(x=>x.source);}
}
const known=new Set(docs.map(d=>d.sha256));for(const d of extra)if(!known.has(d.sha256)){docs.push(d);known.add(d.sha256);}
// Manual book-level identification: the two revision volumes cover KNTT grade 9,
// chapters 1–10 (quadratics, Viete, circle angles, cylinder/cone/sphere).
for(const d of docs)if(/(?:Tra SP On luyen Tap 2|Trả SP sách Ôn luyện Tâp 1)\.rar$/i.test(d.archive)){
 d.grade=9;d.gradeEvidence='Book-level review: Toán 9 KNTT, revision volumes 1 and 2; incidental mentions of Toán 6/7 are prerequisite references.';
}
const groups=new Map();for(const d of docs)if(d.grade){if(!groups.has(d.archive))groups.set(d.archive,new Set());groups.get(d.archive).add(d.grade);}
for(const d of docs)if(!d.grade&&groups.get(d.archive)?.size===1){d.grade=[...groups.get(d.archive)][0];d.gradeEvidence='Same source book as independently classified documents';}
const questions=JSON.parse(await fs.readFile(`${root}/phase2-candidates.json`,'utf8'));
const additional=JSON.parse(await fs.readFile(`${root}/phase2-converted-candidates.json`,'utf8'));
const ids=new Set(questions.map(q=>q.id));for(const q of additional)if(!ids.has(q.id)){questions.push(q);ids.add(q.id);}
const byFile=new Map(docs.map(d=>[d.source,d]));
for(const q of questions){
 q.grade=byFile.get(q.source.file)?.grade||q.grade;
 if(/hình (?:bên|vẽ|sau)|bảng (?:sau|thống kê)|biểu đồ (?:sau|bên)/i.test(q.prompt)){
  q.unsafe=true;if(!q.reasons.includes('references_visual_material'))q.reasons.push('references_visual_material');
 }
}
await fs.writeFile(`${root}/phase2-documents.json`,JSON.stringify(docs,null,2));
await fs.writeFile(`${root}/phase2-candidates.json`,JSON.stringify(questions,null,2));
console.log(JSON.stringify({documents:docs.length,candidates:questions.length,byGrade:Object.fromEntries([6,7,8,9].map(g=>[g,docs.filter(d=>d.grade===g).length])),unknownGrade:docs.filter(d=>!d.grade).length,statuses:docs.reduce((s,d)=>(s[d.status]=(s[d.status]||0)+1,s),{})}));
