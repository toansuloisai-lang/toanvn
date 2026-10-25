import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {curriculumFiles,prepareDeploy} from '../scripts/prepare-deploy.mjs';
import {libraryPracticeModule} from '../scripts/library-practice-payload.mjs';
import {questionLibrary} from '../question-library.mjs';
import {libraryPracticeExercises} from '../public/library-practice-bank.js';

test('compact browser question rows preserve every format, answer and history ID',()=>{
 const expected=questionLibrary.flatMap(q=>q.formats.filter(type=>['mcq','essay'].includes(type)).map(type=>({
  id:'practice-'+q.id+'-'+type,sourceQuestionId:q.id,type,grade:q.grade,prompt:q.prompt,answer:q.answer,rule:q.solution,
  ...(type==='mcq'?{choices:q.choices,correctIndex:q.correctIndex}:{})
 })));
 const actual=libraryPracticeExercises.map(e=>({id:e.id,sourceQuestionId:e.sourceQuestionId,type:e.type,grade:e.grades[0],prompt:e.prompt,answer:e.answer,rule:e.rule,...(e.type==='mcq'?{choices:e.choices,correctIndex:e.correctIndex}:{})}));
 assert.deepEqual(actual,expected);
});

test('browser payload codec round trips exported objects and listing order',async()=>{
 const skills=[{id:'s',name:'Topic'}],common={sourceQuestionId:'q',libraryPractice:true,skill:'s',grades:[9],prompt:'Text "quotes"\n\\(x\\)',richPrompt:true,answer:'2',rule:'Explain',keywords:[],level:'Basic'};
 const exercises=[{...common,id:'practice-q-essay',type:'essay'},{...common,id:'practice-q-mcq',type:'mcq',choices:['1','2','3','4'],correctIndex:1}];
 const listing={ids:exercises.map(e=>e.id).reverse(),summary:[{grade:9}]};
 const code=libraryPracticeModule(skills,exercises,listing);
 const result=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
 assert.deepEqual(result.libraryPracticeExercises,exercises);
 assert.deepEqual(result.libraryPracticeListedIds,listing.ids);
 assert.deepEqual(result.libraryPracticeSkills,skills);
 assert.deepEqual(result.libraryPracticeSummary,listing.summary);
});

test('deploy compaction is lossless, idempotent and never touches user data',async t=>{
 const root=await mkdtemp(path.join(tmpdir(),'math-deploy-'));
 t.after(()=>rm(root,{recursive:true,force:true}));
 await mkdir(path.join(root,'data'));await mkdir(path.join(root,'private'));
 const value={questions:[{prompt:'Tần số: 1, 2, 3',source:{originalPrompt:'Original\nsource',sha256:'abc'},choices:['0','1','2','3']}],review:{status:'verified'}};
 for(const name of curriculumFiles)await writeFile(path.join(root,'data',name),JSON.stringify(value,null,2));
 const accounts=path.join(root,'private','accounts.json');await writeFile(accounts,' { "users": [] } ');
 const preview=await prepareDeploy(root,{write:false});assert.ok(preview.after<preview.before);
 const before=await readFile(path.join(root,'data',curriculumFiles[0]),'utf8');assert.ok(before.includes('\n  '));
 const result=await prepareDeploy(root);assert.deepEqual(result,preview);
 for(const name of curriculumFiles)assert.deepEqual(JSON.parse(await readFile(path.join(root,'data',name),'utf8')),value);
 assert.equal(await readFile(accounts,'utf8'),' { "users": [] } ');
 const repeated=await prepareDeploy(root);assert.equal(repeated.before,repeated.after);
});
