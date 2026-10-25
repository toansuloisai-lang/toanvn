import test from 'node:test';
import assert from 'node:assert/strict';
import {gunzipSync} from 'node:zlib';
import {sendStatic,createStaticFileSender} from '../static-response.mjs';
const content=Buffer.from('const message = "hello";\n'.repeat(100));
async function response(headers={},method='GET'){
 const result={};
 await sendStatic({headers,method},{writeHead(status,headers){Object.assign(result,{status,headers});},end(body){result.body=body;}},content,'application/javascript');
 return result;
}
test('static compression preserves bytes, varies ETag and supports conditional GET and HEAD',async()=>{
 const plain=await response(),packed=await response({'accept-encoding':'gzip'});
 assert.deepEqual(gunzipSync(packed.body),content);
 assert.ok(packed.body.length<content.length);
 assert.notEqual(plain.headers.ETag,packed.headers.ETag);
 assert.equal(packed.headers.Vary,'Accept-Encoding');
 const cached=await response({'accept-encoding':'gzip','if-none-match':`W/${packed.headers.ETag}`});
 assert.equal(cached.status,304);assert.equal(cached.body,undefined);
 const head=await response({'accept-encoding':'gzip'},'HEAD');
 assert.equal(head.body,undefined);assert.equal(head.headers['Content-Length'],packed.body.length);
 assert.equal((await response({'accept-encoding':'gzip;q=0'})).headers['Content-Encoding'],undefined);
});

test('static file cache reuses reads and gzip, invalidates updates, and evicts within its budget',async()=>{
 let reads=0;
 const files=new Map(['a','b'].map(name=>[name,{body:Buffer.from((name+' text;').repeat(300)),version:1}]));
 const send=createStaticFileSender({maxBytes:files.get('a').body.length+10,maxEntries:2,
  inspect:async name=>{const f=files.get(name);return {size:f.body.length,mtimeMs:f.version,ctimeMs:f.version};},
  read:async name=>{reads++;return Buffer.from(files.get(name).body);}});
 async function request(name,headers={'accept-encoding':'gzip'},method='GET'){
  const result={};await send({headers,method},{writeHead(status,headers){Object.assign(result,{status,headers});},end(body){result.body=body;}},name,'text/javascript');return result;
 }
 const [first,concurrent]=await Promise.all([request('a'),request('a')]);
 assert.equal(reads,1);assert.equal(first.body,concurrent.body);
 assert.deepEqual(gunzipSync(first.body),files.get('a').body);
 const again=await request('a');assert.equal(again.body,first.body);assert.equal(reads,1);
 const conditional=await request('a',{'accept-encoding':'gzip','if-none-match':first.headers.ETag});
 assert.equal(conditional.status,304);assert.equal(conditional.body,undefined);assert.equal(reads,1);
 files.get('a').body=Buffer.from('updated;'.repeat(250));files.get('a').version++;
 const updated=await request('a');assert.equal(reads,2);assert.notEqual(updated.headers.ETag,first.headers.ETag);
 assert.deepEqual(gunzipSync(updated.body),files.get('a').body);
 await request('b');await request('a');assert.equal(reads,4);
 const head=await request('a',{'accept-encoding':'gzip'},'HEAD');assert.equal(head.body,undefined);
 assert.equal(head.headers['Content-Length'],updated.body.length);assert.equal(reads,4);
});

test('uncacheable large files are not retained and failed reads can retry',async()=>{
 let reads=0,fail=true;
 const send=createStaticFileSender({maxBytes:10,inspect:async()=>({size:content.length,mtimeMs:1,ctimeMs:1}),read:async()=>{reads++;if(fail)throw Error('read failed');return Buffer.from(content);}});
 const req={headers:{}},res={writeHead(){},end(){}};
 await assert.rejects(send(req,res,'large','text/javascript'),/read failed/);fail=false;
 await send(req,res,'large','text/javascript');await send(req,res,'large','text/javascript');
 assert.equal(reads,3);
});
