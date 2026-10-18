import { test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { exercises, evaluate, checkAnswer } from '../public/data.js';
const dir=mkdtempSync(path.join(os.tmpdir(),'math-core-'));
process.env.MATH_DB_PATH=path.join(dir,'accounts.json');
process.env.MATH_STORAGE='json';
process.env.GEMINI_API_KEY='test-key-never-use-for-live-api';
const { server, fallback } = await import('../server.mjs');
let base;
before(async()=>{ await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));base=`http://127.0.0.1:${server.address().port}`; });
after(async()=>{await new Promise(resolve=>server.close(resolve));rmSync(dir,{recursive:true,force:true});});
test('all reference answers are accepted, wrong answers rejected',()=>{
  assert.equal(exercises.length,60);
  for(const e of exercises){assert.equal(checkAnswer(e.answer,e.answer),true,e.id);assert.equal(checkAnswer('999',e.answer),false,e.id);}
});
test('arithmetic grammar handles signs, precedence, fractions and equivalent affine forms',()=>{
  assert.equal(evaluate('-2^2'),-4);assert.equal(evaluate('(-2)^3'),-8);assert.equal(evaluate('1/2+0,5'),1);
  assert.equal(checkAnswer('6+3*x','3x+6'),true);assert.equal(checkAnswer('2(x+3)+x','3x+6'),true);
  assert.equal(checkAnswer('5x²','5x'),false);assert.equal(checkAnswer('x+4','4'),false);
  assert.equal(checkAnswer('3x+2','3x-2'),false);assert.equal(checkAnswer('1/0','7'),false);
  assert.equal(checkAnswer('5x+(x+7)*(x+2)*x*(x-1)*(x-3)*(x-11)','5x'),false);
  assert.equal(checkAnswer('(6x+12)/2','3x+6'),true);assert.equal(checkAnswer('x/x+3x+5','3x+6'),false);
  assert.ok(Number.isNaN(evaluate('globalThis.process.exit()')));assert.ok(Number.isNaN(evaluate('1..2')));
});
test('rule feedback does not claim to grade explanations',()=>{
  const result=fallback(exercises[0],'Khác dấu thì phải trừ giá trị tuyệt đối.');assert.equal(result.needsTeacher,true);assert.match(result.feedback,/chưa đủ/);
});
test('serves PWA, rejects private files and invalid API requests',async()=>{
  for(const p of ['/','/app.js','/data.js','/manifest.webmanifest','/sw.js','/icon-192.png']){const r=await fetch(base+p);assert.equal(r.status,200,p);}
  const module=await fetch(base+'/vendor/katex/katex.mjs');assert.match(module.headers.get('content-type'),/javascript/);
  const font=await fetch(base+'/vendor/katex/fonts/KaTeX_Main-Regular.woff2');assert.equal(font.headers.get('content-type'),'font/woff2');
  assert.equal((await fetch(base+'/.env')).status,404);
  // Backslash is a separator on Windows and a literal filename character on POSIX.
  const traversal=await fetch(base+'/..%5cserver.mjs');
  assert.ok([403,404].includes(traversal.status),'Private source must not be served on either platform.');
  const bad=await fetch(base+'/api/explain',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({exerciseId:'fake',explanation:'test'})});assert.equal(bad.status,401);
  const cross=await fetch(base+'/api/explain',{method:'POST',headers:{Origin:'https://evil.example'},body:'{}'});assert.equal(cross.status,403);
  const status=await (await fetch(base+'/api/status')).json();assert.equal(typeof status.ai,'boolean');assert.equal('key' in status,false);
});
