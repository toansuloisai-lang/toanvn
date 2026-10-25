import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {questionLibrary} from '../question-library.mjs';
import {balancedLibraryListing} from './library-practice-selection.mjs';
import {libraryPracticeModule} from './library-practice-payload.mjs';
const skills=new Map(),exercises=[];
for(const q of questionLibrary){
 if(q.review?.status!=='verified')throw Error('Unverified question '+q.id);
 const skill='library-'+q.grade+'-'+createHash('sha256').update(q.topic).digest('hex').slice(0,12);
 skills.set(skill,{id:skill,name:q.topic,short:q.topic,grades:[q.grade],color:'#338b76',prerequisite:null});
 for(const type of q.formats){
  if(!['mcq','essay'].includes(type))continue;
  exercises.push({id:'practice-'+q.id+'-'+type,sourceQuestionId:q.id,libraryPractice:true,skill,grades:[q.grade],type,prompt:q.prompt,richPrompt:true,answer:q.answer,rule:q.solution,choices:type==='mcq'?q.choices:undefined,correctIndex:type==='mcq'?q.correctIndex:undefined,keywords:[],level:q.level||'Cơ bản'});
 }
}
const listing=balancedLibraryListing(exercises);
const module=libraryPracticeModule([...skills.values()],exercises,listing);
await writeFile('public/library-practice-bank.js',module);
// The reverse proxy can cache a previous missing-file response. A content version
// also prevents old question data being reused after a subsequent review batch.
const version=createHash('sha256').update(module).digest('hex').slice(0,12);
const app=await readFile('public/app.js','utf8');
await writeFile('public/app.js',app.replace(/from '\.\/library-practice-bank\.js(?:\?v=[a-f0-9]+)?'/,"from './library-practice-bank.js?v="+version+"'"));
console.log(JSON.stringify({uniqueQuestions:questionLibrary.length,availableFormats:exercises.length,summary:listing.summary}));
