import {createHash} from 'node:crypto';
import {gzip as gzipCallback} from 'node:zlib';
import {promisify} from 'node:util';
import {readFile,stat} from 'node:fs/promises';
const gzip=promisify(gzipCallback);
const representations=new WeakMap();
function representation(content){
 let value=representations.get(content);
 if(!value){value={hash:createHash('sha256').update(content).digest('hex')};representations.set(content,value);}
 return value;
}

// LRU bounded by uncompressed bytes; gzip is retained only when smaller.
// Each cached file uses at most twice its raw size, plus small metadata.
export function createStaticFileSender({maxBytes=8*1024*1024,maxEntries=64,read=readFile,inspect=stat}={}){
 const cache=new Map(),loading=new Map();let bytes=0;
 function remove(filename){const old=cache.get(filename);if(old){bytes-=old.content.length;cache.delete(filename);}}
 return async function sendFile(req,res,filename,type){
  const info=await inspect(filename);
  const signature=[info.size,info.mtimeMs,info.ctimeMs].join(':');
  let entry=cache.get(filename);
  if(entry?.signature===signature){cache.delete(filename);cache.set(filename,entry);}
  else{
   remove(filename);
   const key=filename+'\0'+signature;
   let pending=loading.get(key);
   if(!pending){pending=read(filename);loading.set(key,pending);}
   let content;try{content=await pending;}finally{if(loading.get(key)===pending)loading.delete(key);}
   entry={signature,content};
   if(content.length<=maxBytes&&maxEntries>0){
    remove(filename);cache.set(filename,entry);bytes+=content.length;
    while(bytes>maxBytes||cache.size>maxEntries)remove(cache.keys().next().value);
   }
  }
  return sendStatic(req,res,entry.content,type);
 };
}
export async function sendStatic(req,res,content,type){
 const compressible=/^(text\/|application\/(javascript|json|manifest\+json)|image\/svg\+xml)/.test(type);
 const acceptsGzip=String(req.headers['accept-encoding']||'').split(',').some(value=>{
  const [encoding,...params]=value.trim().split(';');
  return encoding==='gzip'&&!params.some(param=>/^q\s*=\s*0(?:\.0*)?$/.test(param.trim()));
 });
 const compressed=compressible&&content.length>=1024&&acceptsGzip;
 const stored=representation(content);
 const etag='"'+stored.hash+(compressed?'-gzip':'')+'"';
 const headers={'Content-Type':type,'Cache-Control':'no-cache',ETag:etag,Vary:'Accept-Encoding'};
 if(String(req.headers['if-none-match']||'').split(',').some(value=>value.trim().replace(/^W\//,'')===etag||value.trim()==='*')){
  res.writeHead(304,headers);res.end();return;
 }
 let body=content;
 if(compressed){
  if(!stored.gzip)stored.gzip=gzip(content).then(result=>{if(result.length>=content.length)stored.gzip=undefined;return result;},error=>{stored.gzip=undefined;throw error;});
  body=await stored.gzip;
 }
 if(compressed)headers['Content-Encoding']='gzip';
 headers['Content-Length']=body.length;
 res.writeHead(200,headers);res.end(req.method==='HEAD'?undefined:body);
}
