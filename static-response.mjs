import {createHash} from 'node:crypto';
import {gzip as gzipCallback} from 'node:zlib';
import {promisify} from 'node:util';
const gzip=promisify(gzipCallback);
export async function sendStatic(req,res,content,type){
 const compressible=/^(text\/|application\/(javascript|json|manifest\+json)|image\/svg\+xml)/.test(type);
 const acceptsGzip=String(req.headers['accept-encoding']||'').split(',').some(value=>{
  const [encoding,...params]=value.trim().split(';');
  return encoding==='gzip'&&!params.some(param=>/^q\s*=\s*0(?:\.0*)?$/.test(param.trim()));
 });
 const compressed=compressible&&content.length>=1024&&acceptsGzip;
 const etag='"'+createHash('sha256').update(content).digest('hex')+(compressed?'-gzip':'')+'"';
 const headers={'Content-Type':type,'Cache-Control':'no-cache',ETag:etag,Vary:'Accept-Encoding'};
 if(String(req.headers['if-none-match']||'').split(',').some(value=>value.trim().replace(/^W\//,'')===etag||value.trim()==='*')){
  res.writeHead(304,headers);res.end();return;
 }
 const body=compressed?await gzip(content):content;
 if(compressed)headers['Content-Encoding']='gzip';
 headers['Content-Length']=body.length;
 res.writeHead(200,headers);res.end(req.method==='HEAD'?undefined:body);
}
