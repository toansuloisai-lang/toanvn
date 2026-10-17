import test from 'node:test';
import assert from 'node:assert/strict';
import {gunzipSync} from 'node:zlib';
import {sendStatic} from '../static-response.mjs';
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
