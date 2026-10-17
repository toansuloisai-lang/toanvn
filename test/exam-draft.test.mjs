import test from 'node:test';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import {extractExamWord,generateExamDraft,validateExamDraft} from '../exam-draft.mjs';
const draft={title:'Phương trình bậc nhất',questions:[{prompt:'Tính 2 + 2.',topic:'Số học',knowledge:'Phép cộng',explanation:'Hai cộng hai bằng bốn.',choices:['3','4','5','6'],correctIndex:1}]};
async function word(xml){const zip=new JSZip();zip.file('[Content_Types].xml','<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/></Types>');zip.file('word/document.xml',xml);return {name:'Bai tap.docx',base64:await zip.generateAsync({type:'base64'})};}
test('Word extracts text and rejects invalid files or unsupported image/math content',async()=>{
 const file=await word('<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Tính tổng hai số 2 và 2.</w:t></w:r></w:p></w:body></w:document>');assert.match(await extractExamWord(file),/Tính tổng/);
 await assert.rejects(extractExamWord({name:'x.doc',base64:'AAAA'}),/docx/);
 await assert.rejects(extractExamWord({name:'x.docx',base64:'AAAA'}),/bị lỗi/);
 await assert.rejects(extractExamWord(await word('<w:document><m:oMath/></w:document>')),/công thức/);
});
test('AI returns an editable validated draft and rejects incomplete or ambiguous answers',async()=>{
 let payload;const result=await generateExamDraft({key:'isolated',model:'gemini-2.5-flash',grade:8,input:{count:1,request:'Tạo câu hỏi phép cộng'},fetcher:async(url,opts)=>{payload=JSON.parse(opts.body);return {ok:true,json:async()=>({candidates:[{content:{parts:[{text:JSON.stringify(draft)}]}}]})};}});
 assert.equal(result.questions[0].correctIndex,1);assert.equal(result.id,undefined);assert.equal(JSON.parse(payload.contents[0].parts[0].text).grade,8);
 assert.throws(()=>validateExamDraft({...draft,questions:[{...draft.questions[0],choices:['4','4','5','6']}]},1));assert.throws(()=>validateExamDraft(draft,2));
 await assert.rejects(generateExamDraft({key:'isolated',input:{count:21,request:'Tạo đề'}}),/1–20/);
});
