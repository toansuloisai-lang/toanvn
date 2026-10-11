import {workerData,parentPort} from 'node:worker_threads';
import {connectDatabase,loadSnapshot,saveSnapshot,readAttachment} from './postgres.mjs';

const {port,signal,options}=workerData;
const flag=new Int32Array(signal);
let client,revision,failed=false;
function reply(value){port.postMessage(value);Atomics.store(flag,0,1);Atomics.notify(flag,0);}
function unavailable(){failed=true;parentPort.postMessage({unavailable:true});}
port.on('message',async({action,payload,files,key})=>{
  try{
    if(failed)throw Error('Database connection is unavailable.');
    if(action==='load'){
      client=await connectDatabase(options);
      client.on('error',unavailable);
      const snapshot=await loadSnapshot(client);revision=snapshot.revision;
      reply({result:snapshot.payload});
    }else if(action==='save'){
      revision=await saveSnapshot(client,revision,payload,files);reply({result:true});
    }else if(action==='file')reply({result:await readAttachment(client,key)});
    else if(action==='close'){await client?.end();reply({result:true});port.close();parentPort.close();}
    else throw Error('Unknown database operation.');
  }catch{
    // Do not pass driver errors/connection strings to logs or HTTP responses.
    unavailable();reply({error:'Supabase unavailable or database revision changed. Check configuration and restart the single server.'});
  }
});
