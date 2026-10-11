import {Worker,MessageChannel,receiveMessageOnPort} from 'node:worker_threads';
import {connectionOptions} from './postgres.mjs';

// Existing domain services commit synchronously (including the mail queue).
// A dedicated worker performs PostgreSQL I/O; success means COMMIT completed,
// never a deferred/background write. Keep one app instance at this scale.
export function createPostgresStorage(options=connectionOptions()){
  const signal=new SharedArrayBuffer(4),flag=new Int32Array(signal);
  const {port1,port2}=new MessageChannel();
  const worker=new Worker(new URL('./worker.mjs',import.meta.url),{workerData:{port:port2,signal,options},transferList:[port2]});
  let failed=false,closed=false;
  const pending=new Map();
  worker.on('message',()=>{failed=true;});
  worker.on('error',()=>{failed=true;});
  worker.on('exit',()=>{if(!closed)failed=true;});
  worker.unref();port1.unref();
  function checkHealth(){if(failed||closed)throw Object.assign(Error('Không kết nối được cơ sở dữ liệu. Vui lòng khởi động lại máy chủ.'),{status:503});}
  function request(message){
    checkHealth();Atomics.store(flag,0,0);port1.postMessage(message);
    if(Atomics.wait(flag,0,0,30000)==='timed-out'){
      failed=true;void worker.terminate();checkHealth();
    }
    const result=receiveMessageOnPort(port1)?.message;
    if(!result||result.error){failed=true;checkHealth();}
    return result.result;
  }
  return {
    load:()=>request({action:'load'}),
    save(payload){request({action:'save',payload,files:[...pending]});pending.clear();},
    stageFile(key,content){checkHealth();pending.set(key,content);},
    readFile:key=>Buffer.from(request({action:'file',key})),
    checkHealth,
    close(){if(closed)return;try{if(!failed)request({action:'close'});}finally{closed=true;port1.close();void worker.terminate();}}
  };
}
