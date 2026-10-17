import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createGeminiPool} from '../gemini-client.mjs';
test('shared keys rotate, honor cooldown and return to service',async()=>{
 let time=0;const calls=[];
 const pool=createGeminiPool(['a','b','a'],{now:()=>time,fetcher:async(url,o)=>{const k=o.headers.get('x-goog-api-key');calls.push(k);return new Response('{}',{status:k==='a'&&time===0?429:200,headers:{'retry-after':'2'}});}});
 assert.equal((await pool('x')).status,200);assert.deepEqual(calls,['a','b']);
 await pool('x');assert.equal(calls.at(-1),'b');time=2001;await pool('x');assert.equal(calls.at(-1),'a');
});
test('busy keys give other concurrent features priority; no retry on bad input',async()=>{
 let release;const calls=[],pending=new Promise(r=>release=r);
 const pool=createGeminiPool(['a','b'],{fetcher:async(url,o)=>{calls.push(o.headers.get('x-goog-api-key'));if(url==='slow')await pending;return new Response('{}',{status:400});}});
 const first=pool('slow');assert.equal((await pool('other')).status,400);release();await first;assert.deepEqual(calls,['a','b']);
});
test('all unavailable keys fail promptly; no key is exposed; cancellation stops retries',async()=>{
 let count=0;const pool=createGeminiPool(['secret-a','secret-b'],{fetcher:async()=>{count++;return new Response('{}',{status:503});}});
 assert.equal((await pool('x')).status,503);await assert.rejects(pool('x'),e=>e.status===503&&!e.message.includes('secret'));assert.equal(count,2);
 const controller=new AbortController();controller.abort();await assert.rejects(pool('x',{signal:controller.signal}));assert.equal(count,2);
});
